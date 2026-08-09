/**
 * Turns an error thrown by a Server Action into something worth showing a user.
 *
 * Next.js deliberately masks Server Action errors in production: whatever was thrown on the
 * server arrives at the client as "An error occurred in the Server Components render" (React
 * error #441). Surfacing that verbatim tells the user nothing and looks broken.
 */

/**
 * Version skew: the page in the browser was built by an older deployment than the one now
 * serving requests.
 *
 * Next.js derives a content hash for every Server Action at build time. After a deploy those
 * hashes change, so a tab opened before the deploy posts an action ID the new server has never
 * heard of and Next replies "Failed to find Server Action ... was not found on the server".
 *
 * This is not a bug in the action — it's an unavoidable consequence of shipping new code while
 * someone has the app open, and it will happen to real users on every deployment. The only
 * correct remedy is to reload so the browser fetches the current build.
 */
export function isVersionSkewError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes("Failed to find Server Action") ||
    message.includes("was not found on the server") ||
    // Next also surfaces this shape when the deployment changed mid-request.
    message.includes("Failed to fetch") ||
    message.includes("NEXT_REDIRECT_SKEW")
  );
}

export function describeActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  if (isVersionSkewError(error)) {
    return "Ownova OS was just updated. Reload the page and your changes will save normally.";
  }

  const isMaskedServerError =
    error.message.includes("Server Components render") ||
    error.message.includes("Minified React error") ||
    error.message.includes("digest");

  if (isMaskedServerError) {
    return "Couldn't save that. Your session may have expired — refresh the page and sign in again.";
  }

  return error.message || fallback;
}
