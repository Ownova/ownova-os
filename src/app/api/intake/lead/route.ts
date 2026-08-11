import { NextResponse } from "next/server";
import { verifyIntakeSecret } from "@/lib/intake/auth";
import { ingestLead } from "@/lib/intake/leads";

export const dynamic = "force-dynamic";

/**
 * Inbound leads from the Google Form (via Apps Script) and, later, the lead scraper.
 *
 * This is the one door every outside system uses to put a lead into Ownova OS. It authenticates
 * with a shared secret rather than a Cognito session, because Apps Script has no way to log in.
 *
 * Field names are accepted in several shapes deliberately. Google Forms sends the *question
 * text* as the key, and that text gets reworded whenever the form is edited — hard-coding one
 * spelling means the pipeline silently starts dropping phone numbers the first time someone
 * tweaks a question. Apps Script normalises what it can; this is the second net.
 */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * CORS, because the Google Maps extractor runs in the browser console on google.com and posts
 * here cross-origin. Without an OPTIONS handler the preflight fails and every request dies as an
 * opaque "Failed to fetch" — which is exactly what happened the first time it was run for real.
 *
 * This does not weaken the endpoint. CORS is a browser-enforced policy; curl and every server-side
 * client have always ignored it entirely. The actual gate is the shared secret, and that is
 * unchanged. Allowing the browser to do what a shell one-liner could already do costs nothing.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-ownova-secret",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function pick(body: Record<string, unknown>, ...keys: string[]): string | null {
  // An explicitly-provided key wins outright — even when its value is null.
  //
  // This guard exists because the loose fallback below caused a real corruption. The Maps
  // scraper sends `website: null` for a business that genuinely has no website, alongside a
  // human-readable field `"Has website": "NO - strong signal"`. The fallback matched that second
  // key (normalised "haswebsite" *contains* "website") and wrote the words "NO - strong signal"
  // into the website column — making a lead with no site look like it had one, and destroying
  // the single most valuable signal the scraper produces.
  //
  // `website: null` from a caller that knows the answer is a finding, not a gap to be guessed at.
  for (const key of keys) {
    if (key in body) {
      const direct = body[key];
      return typeof direct === "string" && direct.trim() ? direct.trim() : null;
    }
  }

  // Only now fall back to loose matching on question text, so Google Forms' "What's your company
  // name?" still finds the company field. This runs solely when the caller supplied no explicit
  // key at all, which is the Forms case and never the scraper case.
  const entries = Object.entries(body).filter(([, v]) => typeof v === "string" && v.trim());
  for (const key of keys) {
    const hit = entries.find(([k]) => k.toLowerCase().replace(/[^a-z]/g, "").includes(key.toLowerCase()));
    if (hit) return String(hit[1]).trim();
  }
  return null;
}

export async function POST(request: Request) {
  const auth = verifyIntakeSecret(request);
  if (!auth.ok) {
    // Logged for us, opaque to the caller: an attacker shouldn't learn whether the secret was
    // missing, malformed, or simply wrong.
    console.warn("[intake/lead] rejected:", auth.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const email = pick(body, "email", "emailaddress");
  const name = pick(body, "name", "fullname") ?? email;
  if (!name) {
    return NextResponse.json({ error: "A name or email is required" }, { status: 422, headers: CORS_HEADERS });
  }

  // Without an external id there is no way to tell a retry from a genuine second submission, so
  // fall back to something stable rather than accepting a payload we can't deduplicate.
  const externalId =
    pick(body, "responseId", "externalId", "id") ?? `${email ?? name}:${pick(body, "timestamp") ?? ""}`;

  try {
    const result = await ingestLead({
      source: typeof body.source === "string" ? body.source : "google_form",
      externalId,
      name,
      email,
      phone: pick(body, "phone", "whatsapp", "phonewhatsapp"),
      company: pick(body, "company", "companyname", "brand", "companybrandname"),
      website: pick(body, "website", "websiteinstagramlinkedin", "socials", "linkedin"),
      country: pick(body, "country"),
      address: pick(body, "address"),
      industry: pick(body, "industry", "category"),
      notes: buildNotes(body),
      payload: body,
    });

    if (!result) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503, headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { ok: true, clientId: result.clientId, created: result.created, duplicate: !result.created },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    // A 500 makes Apps Script retry, which is what we want for a transient Aurora resume. The
    // replay check in ingestLead is what makes that retry safe.
    console.error("[intake/lead] failed:", error);
    return NextResponse.json({ error: "Intake failed" }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * Everything the questionnaire asked, kept as a readable note.
 *
 * The whole point of a five-minute questionnaire is that whoever takes the call has already read
 * the answers. Storing only the fields that map to columns would throw away exactly the part
 * that makes the call worth having.
 */
function buildNotes(body: Record<string, unknown>): string {
  const skip = new Set(["source", "responseid", "externalid", "id", "secret", "country", "address", "industry"]);
  const lines = Object.entries(body)
    .filter(([k, v]) => typeof v === "string" && v.trim() && !skip.has(k.toLowerCase()))
    .map(([k, v]) => `${k}: ${String(v).trim()}`);

  return lines.length ? `Intake questionnaire\n\n${lines.join("\n")}` : "";
}
