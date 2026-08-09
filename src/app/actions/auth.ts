"use server";

// Server Actions — the AWS SDK (Cognito) must run server-side, so the client-side
// src/lib/auth.ts calls into these instead of talking to Cognito directly.

import { cognitoSignIn, cognitoSignUp, adminConfirmSignUp, isCognitoConfigured, decodeIdToken } from "@/lib/aws/cognito";

export type AuthActionResult =
  | { mode: "cognito"; email: string; name: string; idToken: string; accessToken: string; refreshToken?: string }
  | { mode: "mock" };

export async function signInAction(email: string, password: string): Promise<AuthActionResult> {
  if (!isCognitoConfigured) return { mode: "mock" };

  const tokens = await cognitoSignIn(email, password);
  const claims = decodeIdToken(tokens.idToken);
  return {
    mode: "cognito",
    email: claims.email ?? email,
    name: (claims.name as string) ?? email.split("@")[0],
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
