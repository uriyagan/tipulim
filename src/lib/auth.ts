import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

// Session-based authentication (PRD §15.1) using a signed JWT in an
// httpOnly cookie. The token also carries the re-auth elevation window
// for sensitive actions (PRD §15.3) and supports idle auto-logout (§15.2).

const SESSION_COOKIE = "tipulim_session";
const PENDING_2FA_COOKIE = "tipulim_2fa";
const ALG = "HS256";

const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES ?? 10);
const REAUTH_MINUTES = Number(process.env.REAUTH_WINDOW_MINUTES ?? 5);

export interface SessionClaims {
  sub: string; // user id
  email: string;
  role: Role;
  // Epoch ms until which sensitive actions are elevated (re-auth window).
  reauthUntil?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set or too short (min 16 chars).");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function signSession(claims: SessionClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    // Absolute expiry acts as the idle ceiling; refreshed on activity.
    .setExpirationTime(now + IDLE_MINUTES * 60)
    .sign(getSecret());
}

/** Issues a fresh session cookie for a user. */
export async function createSession(claims: SessionClaims): Promise<void> {
  const token = await signSession(claims);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: IDLE_MINUTES * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads and verifies the current session, or null if absent/expired. */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: payload.role as Role,
      reauthUntil:
        typeof payload.reauthUntil === "number"
          ? payload.reauthUntil
          : undefined,
    };
  } catch {
    return null;
  }
}

/** Throws/returns helper for server code that requires an authenticated user. */
export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/** Slides the idle window forward on activity, preserving claims. */
export async function refreshSession(): Promise<void> {
  const session = await getSession();
  if (session) await createSession(session);
}

/** Marks the session as re-authenticated for the elevation window (§15.3). */
export async function elevateSession(): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  await createSession({
    ...session,
    reauthUntil: Date.now() + REAUTH_MINUTES * 60 * 1000,
  });
}

/** True when the session is currently within the re-auth elevation window. */
export function isElevated(session: SessionClaims | null): boolean {
  return !!session?.reauthUntil && session.reauthUntil > Date.now();
}

/** Guard for sensitive actions: requires a current re-auth elevation. */
export async function requireElevated(): Promise<SessionClaims> {
  const session = await requireSession();
  if (!isElevated(session)) {
    throw new Error("REAUTH_REQUIRED");
  }
  return session;
}

// --- Two-factor pending state (between password and TOTP steps) ---

/** Stores a short-lived cookie marking that a user passed the password step. */
export async function createPending2FA(userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ sub: userId, p2fa: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60) // 5 minutes to complete 2FA
    .sign(getSecret());
  const store = await cookies();
  store.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
}

export async function getPending2FA(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.p2fa ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function clearPending2FA(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_2FA_COOKIE);
}

export const authConfig = { IDLE_MINUTES, REAUTH_MINUTES };
