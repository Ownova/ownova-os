"use client";

import {
  signInAction,
  signUpAction,
  confirmSignUpAction,
  resendConfirmationCodeAction,
} from "@/app/actions/auth";

const SESSION_KEY = "ownova_session";

export interface Session {
  email: string;
  name: string;
  mode: "cognito" | "mock";
}

/**
 * Thin client-side auth layer. The actual Cognito calls happen in the server action
 * (src/app/actions/auth.ts) since the AWS SDK needs to run server-side. When APP_AWS_REGION /
 * COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID aren't set, the server action returns
 * { mode: "mock" } and this file falls back to a localStorage session so the app is fully
 * clickable without any AWS setup.
 *
 * Security note: the real session — including role and anything used for authorization — lives
 * server-side in an httpOnly cookie holding Cognito's ID token (see src/lib/session.ts), which is
 * signature-verified on every read. This localStorage copy is display-only (name/email, for the
 * Topbar greeting before a server round-trip) and deliberately carries no tokens.
 *
 * These functions throw an Error carrying the server's friendly message when an action fails, so
 * callers can keep using try/catch and surface `e.message` directly to the user.
 */

/** Raised for expected, user-fixable failures — the message is safe to display verbatim. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const result = await signInAction(email, password);
  if (!result.ok) throw new AuthError(result.message);
  return persist(result, email);
}

/** Returns a Session once signed in, or { mode: "needs-confirmation", email } if Cognito needs
 *  the emailed code first — the signup page shows a code-entry step in that case. */
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<Session | { mode: "needs-confirmation"; email: string }> {
  const result = await signUpAction(name, email, password);
  if (!result.ok) throw new AuthError(result.message);
  if (result.mode === "needs-confirmation") return { mode: "needs-confirmation", email: result.email };
  return persist(result, email, name);
}

/** Confirms the emailed code, then signs in with the same credentials. */
export async function confirmSignUp(email: string, code: string, password: string): Promise<Session> {
  const confirmed = await confirmSignUpAction(email, code);
  if (!confirmed.ok) throw new AuthError(confirmed.message);

  const result = await signInAction(email, password);
  if (!result.ok) throw new AuthError(result.message);
  return persist(result, email);
}

export async function resendConfirmationCode(email: string): Promise<void> {
  const result = await resendConfirmationCodeAction(email);
  if (!result.ok) throw new AuthError(result.message);
}

function persist(
  result: { ok: true; mode: "cognito"; email: string; name: string } | { ok: true; mode: "mock" },
  fallbackEmail: string,
  fallbackName?: string
): Session {
  const session: Session =
    result.mode === "cognito"
      ? { email: result.email, name: result.name, mode: "cognito" }
      : { email: fallbackEmail, name: fallbackName ?? fallbackEmail.split("@")[0] ?? "Ownova User", mode: "mock" };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    // A malformed value (hand-edited, or written by an older build) would otherwise throw on
    // every render and blank the page — clear it and treat the user as signed out.
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
