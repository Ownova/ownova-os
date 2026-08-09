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

function pick(body: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const direct = body[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }
  // Fall back to a loose match on the question text, so "What's your company name?" still finds
  // the company field.
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = pick(body, "email", "emailaddress");
  const name = pick(body, "name", "fullname") ?? email;
  if (!name) {
    return NextResponse.json({ error: "A name or email is required" }, { status: 422 });
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
      notes: buildNotes(body),
      payload: body,
    });

    if (!result) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      clientId: result.clientId,
      created: result.created,
      duplicate: !result.created,
    });
  } catch (error) {
    // A 500 makes Apps Script retry, which is what we want for a transient Aurora resume. The
    // replay check in ingestLead is what makes that retry safe.
    console.error("[intake/lead] failed:", error);
    return NextResponse.json({ error: "Intake failed" }, { status: 500 });
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
  const skip = new Set(["source", "responseid", "externalid", "id", "secret"]);
  const lines = Object.entries(body)
    .filter(([k, v]) => typeof v === "string" && v.trim() && !skip.has(k.toLowerCase()))
    .map(([k, v]) => `${k}: ${String(v).trim()}`);

  return lines.length ? `Intake questionnaire\n\n${lines.join("\n")}` : "";
}
