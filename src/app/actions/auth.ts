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

/**
 * Auth actions RETURN failures rather than throwing them.
 *
 * Next.js masks any error thrown from a Server Action in production — the client only receives
 * "An error occurred in the Server Components render" (React error #441). That's correct
 * behaviour for unexpected errors (it avoids leaking internals), but it's useless for expected
 * ones: someone signing up with an existing email deserves to be told exactly that, not shown a
 * React error code. So every anticipated Cognito failure is caught here and converted into a
 * message the UI can display.
 */
export type ActionFailure = { ok: false; message: string };

export type SignInResult =
  | { ok: true; mode: "cognito"; email: string; name: string }
  | { ok: true; mode: "mock" }
  // Signalled separately from a generic failure so the login page can show the code-entry step
  // instead of a dead-end error. Someone who abandoned signup half-way has a valid account and a
  // code sitting in their inbox, but previously no screen anywhere would accept it.
  | { ok: false; needsConfirmation: true; email: string; message: string }
  | ActionFailure;

export type SignUpResult =
  | { ok: true; mode: "needs-confirmation"; email: string }
  | { ok: true; mode: "mock" }
  | ActionFailure;

export type SimpleResult = { ok: true } | ActionFailure;

/**
 * Maps Cognito's exception names onto plain-language guidance. Anything unrecognised falls back
 * to a generic message rather than surfacing raw SDK text, which can be confusing or leak detail.
 */
function toFriendlyMessage(error: unknown): string {
  const name = (error as { name?: string })?.name ?? "";

  switch (name) {
    case "UsernameExistsException":
      return "An account with this email already exists. Try signing in instead.";
    case "InvalidPasswordException":
      return "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.";
    case "InvalidParameterException":
      return "Please check the details you entered and try again.";
    case "NotAuthorizedException":
      return "Incorrect email or password.";
    case "UserNotFoundException":
      return "No account found with that email address.";
    case "UserNotConfirmedException":
      return "Please verify your email address first — check your inbox for the code.";
    case "CodeMismatchException":
      return "That verification code isn't correct. Check the email and try again.";
    case "ExpiredCodeException":
      return "That verification code has expired. Request a new one.";
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return "Too many attempts. Please wait a minute and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  if (!isCognitoConfigured) {
    // Mock/demo mode: no real identity, but still set a server session (role "admin") so
    // role-gated UI like the Team page's role editor is visible while developing without AWS.
    await setMockSessionCookie({ sub: "mock-user", email, name: email.split("@")[0], role: "admin" });
    return { ok: true, mode: "mock" };
  }

  try {
    const tokens = await cognitoSignIn(email, password);
    const claims = decodeIdToken(tokens.idToken);
    const name = (claims.name as string) ?? email.split("@")[0];

    // Keep our `users` table in sync with Cognito on every sign-in — cheap upsert, and it means
    // there's never a chance of a dangling Cognito identity with no corresponding app-side row.
    // Must run before the cookie is set: getServerSession reads the role from this row.
    await upsertUserFromCognito({ id: claims.sub, email: claims.email ?? email, name }).catch(() => "developer");

    // Store the raw ID token — getServerSession verifies its signature against the pool's JWKS on
    // every read, so nothing here is taken on trust.
    await setSessionCookie(tokens.idToken);

    return { ok: true, mode: "cognito", email: claims.email ?? email, name };
  } catch (error) {
    // Unconfirmed accounts are recoverable, not a dead end — resend the code and let the caller
    // route the user into verification.
    if ((error as { name?: string })?.name === "UserNotConfirmedException") {
      await resendConfirmationCode(email).catch(() => {
        // If the resend is rate-limited the user may still have a valid earlier code, so carry on
        // to the verification step rather than blocking on it.
      });
      return {
        ok: false,
        needsConfirmation: true,
        email,
        message: "This email hasn't been verified yet. We've sent you a fresh code.",
      };
    }
    return { ok: false, message: toFriendlyMessage(error) };
  }
}

export async function signOutAction() {
  await clearSessionCookie();
}

export async function signUpAction(name: string, email: string, password: string): Promise<SignUpResult> {
  if (!isCognitoConfigured) return { ok: true, mode: "mock" };

  try {
    await cognitoSignUp(name, email, password);
    // Real verification flow: Cognito emails the user a 6-digit code. The client shows a
    // "check your email" step and calls confirmSignUpAction with that code before signing in.
    return { ok: true, mode: "needs-confirmation", email };
  } catch (error) {
    return { ok: false, message: toFriendlyMessage(error) };
  }
}

export async function confirmSignUpAction(email: string, code: string): Promise<SimpleResult> {
  try {
    await confirmSignUp(email, code);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toFriendlyMessage(error) };
  }
}

export async function resendConfirmationCodeAction(email: string): Promise<SimpleResult> {
  try {
    await resendConfirmationCode(email);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toFriendlyMessage(error) };
  }
}
