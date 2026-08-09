"use server";

// Server Actions — the AWS SDK (Cognito) must run server-side, so the client-side
// src/lib/auth.ts calls into these instead of talking to Cognito directly.

import {
  cognitoSignIn,
  cognitoSignUp,
  confirmSignUp,
  resendConfirmationCode,
  isCognitoConfigured,
  decodeIdToken,
} from "@/lib/aws/cognito";
import { upsertUserFromCognito } from "@/lib/data/users";
import { setSessionCookie, setMockSessionCookie, clearSessionCookie } from "@/lib/session";

export type AuthActionResult =
  | { mode: "cognito"; email: string; name: string; idToken: string; accessToken: string; refreshToken?: string }
  | { mode: "mock" };

export type SignUpActionResult = AuthActionResult | { mode: "needs-confirmation"; email: string };

export async function signInAction(email: string, password: string): Promise<AuthActionResult> {
  if (!isCognitoConfigured) {
    // Mock/demo mode: no real identity, but still set a server session (role "admin") so
    // role-gated UI like the Team page's role editor is visible while developing without AWS.
    await setMockSessionCookie({ sub: "mock-user", email, name: email.split("@")[0], role: "admin" });
    return { mode: "mock" };
  }

  const tokens = await cognitoSignIn(email, password);
  const claims = decodeIdToken(tokens.idToken);
  const name = (claims.name as string) ?? email.split("@")[0];

  // Keep our `users` table in sync with Cognito on every sign-in — cheap upsert, and it means
  // there's never a chance of a dangling Cognito identity with no corresponding app-side row.
  // This must run before the cookie is set: getServerSession reads the role from this row.
  await upsertUserFromCognito({ id: claims.sub, email: claims.email ?? email, name }).catch(() => "developer");

  // Store the raw ID token — getServerSession verifies its signature against the pool's JWKS on
  // every read, so nothing here is taken on trust.
  await setSessionCookie(tokens.idToken);

  return {
    mode: "cognito",
    email: claims.email ?? email,
    name,
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function signOutAction() {
  await clearSessionCookie();
}

export async function signUpAction(name: string, email: string, password: string): Promise<SignUpActionResult> {
  if (!isCognitoConfigured) return { mode: "mock" };

  await cognitoSignUp(name, email, password);
  // Real verification flow: Cognito emails the user a 6-digit code. The client shows a
  // "check your email" step and calls confirmSignUpAction with that code before signing in.
  return { mode: "needs-confirmation", email };
}

export async function confirmSignUpAction(email: string, code: string): Promise<void> {
  await confirmSignUp(email, code);
}

export async function resendConfirmationCodeAction(email: string): Promise<void> {
  await resendConfirmationCode(email);
}
