"use client";

import { signInAction, signUpAction } from "@/app/actions/auth";

const SESSION_KEY = "ownova_session";

export interface Session {
  email: string;
  name: string;
  mode: "cognito" | "mock";
  idToken?: string;
  accessToken?: string;
}

/**
 * Thin client-side auth layer. The actual Cognito calls happen in the server action
 * (src/app/actions/auth.ts) since the AWS SDK needs to run server-side. When AWS_REGION /
 * COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID aren't set, the server action returns
 * { mode: "mock" } and this file falls back to a localStorage session so the app is fully
 * clickable without any AWS setup.
 *
 * Known Phase-1 simplification: Cognito tokens are cached in localStorage rather than an
 * httpOnly cookie. Fine for a demo; move to a cookie-based session (set via a Route Handler)
 * before handling real user data.
 */
export async function signIn(email: string, password: string): Promise<Session> {
  const result = await signInAction(email, password);
  return persist(result, email);
}

export async function signUp(name: string, email: string, password: string): Promise<Session> {
  const result = await signUpAction(name, email, password);
  return persist(result, email, name);
}

function persist(
  result: Awaited<ReturnType<typeof signInAction>>,
  fallbackEmail: string,
  fallbackName?: string
): Session {
  const session: Session =
    result.mode === "cognito"
      ? { email: result.email, name: result.name, mode: "cognito", idToken: result.idToken, accessToken: result.accessToken }
      : { email: fallbackEmail, name: fallbackName ?? fallbackEmail.split("@")[0] ?? "Ownova User", mode: "mock" };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
