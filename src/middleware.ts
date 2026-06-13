import { NextResponse, type NextRequest } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Edge middleware: gate the authenticated area and slide the idle window.
// Full session logic lives in src/lib/auth.ts; here we verify the signed
// cookie and re-issue it (cookies can be mutated in middleware, not in
// server components).

const SESSION_COOKIE = "tipulim_session";
const ALG = "HS256";
const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES ?? 10);

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

const PUBLIC_PATHS = ["/login", "/forgot", "/reset"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let payload: JWTPayload | null = null;
  if (token) {
    try {
      payload = (await jwtVerify(token, secret())).payload;
    } catch {
      payload = null;
    }
  }
  const authed = !!payload;

  // Authenticated user hitting /login → send to dashboard.
  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated user hitting a protected page → send to login.
  if (!authed && !isPublic) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();

  // Slide the idle window forward on activity (PRD §15.2), preserving claims.
  if (authed && !isPublic && payload) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const refreshed = await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        ...(typeof payload.reauthUntil === "number"
          ? { reauthUntil: payload.reauthUntil }
          : {}),
      })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt(now)
        .setExpirationTime(now + IDLE_MINUTES * 60)
        .sign(secret());
      res.cookies.set(SESSION_COOKIE, refreshed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: IDLE_MINUTES * 60,
      });
    } catch {
      // Leave the existing cookie intact if re-signing fails.
    }
  }

  return res;
}

export const config = {
  // Protect pages. API routes self-authorize (session check or webhook secret),
  // so exclude them here along with Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};