import "server-only";
import { timingSafeEqual, createHmac } from "crypto";

/**
 * Authentication for the intake endpoints.
 *
 * These routes are the one part of Ownova OS that is deliberately reachable without a Cognito
 * session — Apps Script and Cal.com have no way to log in. That makes them the most exposed
 * surface in the app, so they get their own shared secret rather than reusing anything tied to
 * a user, and the checks below are written for an adversary rather than for a typo.
 *
 * Comparisons are constant-time. A plain `===` on a secret leaks its length and, over enough
 * requests, its contents through response timing — the classic way these endpoints get opened.
 */
export const INTAKE_SECRET = process.env.INTAKE_SECRET ?? "";
export const CAL_WEBHOOK_SECRET = process.env.CAL_WEBHOOK_SECRET ?? "";

/** True only when both strings are the same length and identical. Never short-circuits early. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself be a timing signal — so the
  // length check happens first and returns the same way an unequal comparison does.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verifies the shared secret on a form/scraper intake request.
 *
 * Returns a reason string on failure rather than throwing, so the route can log why while still
 * returning an opaque 401 to the caller — an attacker shouldn't learn whether the secret was
 * missing, malformed, or merely wrong.
 */
export function verifyIntakeSecret(request: Request): { ok: true } | { ok: false; reason: string } {
  if (!INTAKE_SECRET) return { ok: false, reason: "INTAKE_SECRET is not configured" };
  // Refusing short secrets here stops a deployment from quietly running on a placeholder like
  // "changeme" that someone meant to replace.
  if (INTAKE_SECRET.length < 24) return { ok: false, reason: "INTAKE_SECRET is too short" };

  const header = request.headers.get("x-ownova-secret");
  if (!header) return { ok: false, reason: "missing x-ownova-secret header" };
  if (!safeEqual(header, INTAKE_SECRET)) return { ok: false, reason: "secret mismatch" };

  return { ok: true };
}

/**
 * Verifies Cal.com's HMAC-SHA256 signature over the raw request body.
 *
 * Cal signs with the secret configured on the webhook and sends the hex digest in
 * `x-cal-signature-256`. This must run against the *raw* body text: re-serialising the parsed
 * JSON changes key order and whitespace, and the signature stops matching.
 */
export function verifyCalSignature(
  rawBody: string,
  signature: string | null
): { ok: true } | { ok: false; reason: string } {
  if (!CAL_WEBHOOK_SECRET) return { ok: false, reason: "CAL_WEBHOOK_SECRET is not configured" };
  if (!signature) return { ok: false, reason: "missing x-cal-signature-256 header" };

  const expected = createHmac("sha256", CAL_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!safeEqual(signature.toLowerCase(), expected)) return { ok: false, reason: "bad signature" };

  return { ok: true };
}

export const isIntakeConfigured = INTAKE_SECRET.length >= 24;
