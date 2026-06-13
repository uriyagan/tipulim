import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge middleware: gate the authenticated area. Full session logic lives in
// src/lib/auth.ts; here we only verify the signed cookie is present & valid.

const SESSION_COOKIE = "tipulim_session";

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
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      authed = true;
    } catch {
      authed = false;
    }
  }

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

  return NextResponse.next();
}

export const config = {
  // Protect pages. API routes self-authorize (session check or webhook secret),
  // so exclude them here along with Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
