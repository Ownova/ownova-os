"use server";

// Server Actions — the AWS SDK (Cognito) must run server-side, so the client-side
// src/lib/auth.ts calls into these instead of talking to Cognito directly.

import { cognitoSignIn, cognitoSignUp, adminConfirmSignUp, isCognitoConfigured, decodeIdToken } from "@/lib/aws/cognito";
import { upsertUserFromCognito } from "@/lib/data/users";

export type AuthActionResult =
  | { mode: "cognito"; email: string; name: string; idToken: string; accessToken: string; refreshToken?: string }
  | { mode: "mock" };

export async function signInAction(email: string, password: string): Promise<AuthActionResult> {
  if (!isCognitoConfigured) return { mode: "mock" };

  const tokens = await cognitoSignIn(email, password);
  const claims = decodeIdToken(tokens.idToken);
  const name = (claims.name as string) ?? email.split("@")[0];

  // Keep our `users` table in sync with Cognito on every sign-in — cheap upsert, and it means
  // there's never a chance of a dangling Cognito identity with no corresponding app-side row.
  await upsertUserFromCognito({ id: claims.sub, email: claims.email ?? email, name }).catch(() => {
    // Non-fatal: sign-in should still succeed even if the DB write fails (e.g. Aurora cold
    // start taking longer than expected). Worst case, foreign keys referencing this user fail
    // until the next successful sign-in retries the upsert.
  });

  return {
    mode: "cognito",
    email: claims.email ?? email,
    name,
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function signUpAction(name: string, email: string, password: string): Promise<AuthActionResult> {
  if (!isCognitoConfigured) return { mode: "mock" };

  await cognitoSignUp(name, email, password);
  // Phase 1 shortcut: auto-confirm instead of an email verification code screen.
  // Remove this call and build a real "enter your code" step before shipping to real users.
  await adminConfirmSignUp(email).catch(() => {
    // If the IAM role can't auto-confirm, the user will need to confirm via the emailed code
    // before their first sign-in — that's fine, just means signInAction will throw until then.
  });
  return signInAction(email, password);
}
