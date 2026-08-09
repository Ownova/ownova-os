import "server-only";
import { redirect } from "next/navigation";
import { getServerSession, type ServerSession } from "@/lib/session";

// Server-side authorization guards for server actions (writes). RLS in Postgres is defense in
// depth (see db/migrations/0001_init.sql), not the primary gate — the primary gate is here,
// checked before a write action touches the database at all.

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Throws unless the caller is signed in and has one of the given roles. */
export async function requireRole(allowed: string[]): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session || !allowed.includes(session.role)) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Throws unless the caller is signed in and is internal staff (any role except "client"). */
export async function requireInternalTeam(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session || session.role === "client") {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Page-level equivalent of requireInternalTeam, for server components.
 *
 * The (app) layout only establishes that *someone* is signed in. Without this, an account with
 * the "client" role — which exists precisely so external clients can log in and see their own
 * portal — could navigate straight to /crm, /invoices, /expenses or /team and read the agency's
 * entire book of business. Authentication is not authorization, and every internal page needs
 * this check even though the write actions behind them are already guarded.
 *
 * Redirects rather than throwing, since a wrong-role page visit is a navigation mistake, not an
 * error worth showing a crash screen for.
 */
export async function requireInternalPage(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  // Deliberately NOT redirected to /client-portal: that page is an internal preview which shows
  // an arbitrary client's invoices and projects, so sending a real client there would expose
  // another client's data. Until a per-client scoped portal exists, "client" accounts have no
  // page they can safely see.
  if (session.role === "client") redirect("/no-access");
  return session;
}
