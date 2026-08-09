import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { isCognitoConfigured } from "@/lib/aws/cognito";
import { getUserRole } from "@/lib/data/users";

/**
 * Server-side session backed by Cognito's real ID token.
 *
 * The cookie holds the raw JWT, and every read verifies its signature against the user pool's
 * published JWKS before trusting a single claim. Previously this cookie stored plain JSON that
 * the server took at face value -- anyone able to set that cookie could have claimed
 * `role: "admin"`. Signature verification closes that: the token has to have been issued by our
 * user pool, be unexpired, and carry the right audience/issuer.
 *
 * The role deliberately is NOT read from the token. Cognito doesn't own it -- Postgres does --
 * and baking it into a 7-day token would mean role changes wouldn't take effect until re-login.
 * It's looked up per request instead, memoised via React `cache` so concurrent components on one
 * page share a single query.
 */

const COOKIE_NAME = "ownova_session";
const MOCK_COOKIE_NAME = "ownova_mock_session";

export interface ServerSession {
  sub: string;
  email: string;
  name: string;
  role: string;
  mode: "cognito" | "mock";
}

const region = process.env.APP_AWS_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

// createRemoteJWKSet caches the fetched keys internally and refreshes on rotation, so this is
// created once per server instance rather than per request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return jwks;
}

/** Stores the verified Cognito ID token. Called only after a successful sign-in. */
export async function setSessionCookie(idToken: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Demo/mock sessions exist only when Cognito isn't configured (local development without AWS).
 * They're kept in a separate cookie so a mock session can never be mistaken for a verified one:
 * `getServerSession` only consults it when `isCognitoConfigured` is false.
 */
export async function setMockSessionCookie(session: Omit<ServerSession, "mode">) {
  const store = await cookies();
  store.set(MOCK_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function readSession(): Promise<ServerSession | null> {
  const store = await cookies();

  if (!isCognitoConfigured) {
    const raw = store.get(MOCK_COOKIE_NAME)?.value;
    if (!raw) return null;
    try {
      return { ...(JSON.parse(raw) as Omit<ServerSession, "mode">), mode: "mock" };
    } catch {
      return null;
    }
  }

  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(), { issuer, audience: clientId });

    // Cognito issues both access and ID tokens from the same pool; only the ID token carries
    // user identity claims, so reject anything else that happens to verify.
    if (payload.token_use !== "id") return null;

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;

    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : email;

    // Role is authoritative in Postgres, not in the token. Unknown users fall back to the least
    // privileged internal role rather than inheriting anything from the claim set.
    const role = await getUserRole(sub).catch(() => "developer");

    return { sub, email, name, role, mode: "cognito" };
  } catch {
    // Expired, tampered with, wrong issuer/audience, or signed by another pool -- all treated
    // identically as "not signed in".
    return null;
  }
}

/** Memoised per request so multiple components asking for the session share one verification. */
export const getServerSession = cache(readSession);

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(MOCK_COOKIE_NAME);
}
