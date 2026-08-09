import "server-only";
import { cookies } from "next/headers";

// Real server-side session, replacing the old localStorage-only approach. The cookie is
// httpOnly (JS on the page can't read it) and holds the minimum needed to gate server-rendered
// pages and server actions: who's signed in and what role they have. This is NOT a signed JWT —
// it's a pragmatic Phase 2c step up from localStorage, not a final security posture. Before
// handling real client data, swap the cookie payload for Cognito's verified ID token (verify
// signature server-side with aws-jwt-verify or similar) instead of trusting this JSON as-is.

const COOKIE_NAME = "ownova_session";

export interface ServerSession {
  sub: string;
  email: string;
  name: string;
  role: string;
  mode: "cognito" | "mock";
}

export async function setSessionCookie(session: ServerSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getServerSession(): Promise<ServerSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServerSession;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
