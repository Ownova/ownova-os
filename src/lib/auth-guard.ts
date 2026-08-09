import "server-only";
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
