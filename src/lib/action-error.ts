/**
 * Turns an error thrown by a Server Action into something worth showing a user.
 *
 * Next.js deliberately masks Server Action errors in production: whatever was thrown on the
 * server arrives at the client as "An error occurred in the Server Components render" (React
 * error #441). Surfacing that verbatim tells the user nothing and looks broken.
 *
 * The most common real cause is an expired session — the Cognito ID token in the session cookie
 * lasts a week, after which the authorization guards on every write action start rejecting
 * calls. Refreshing sends them through the layout's auth check and on to the login screen, so
 * that's the advice given.
 *
 * Errors we raise ourselves with a deliberate message (AuthError, validation failures) pass
 * through unchanged.
 */
export function describeActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const isMaskedServerError =
    error.message.includes("Server Components render") ||
    error.message.includes("Minified React error") ||
    error.message.includes("digest");

  if (isMaskedServerError) {
    return "Couldn't save that. Your session may have expired — refresh the page and sign in again.";
  }

  return error.message || fallback;
}
