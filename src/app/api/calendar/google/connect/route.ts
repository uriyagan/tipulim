import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isCalendarConfigured } from "@/lib/calendar/sync";

// Starts the Google OAuth flow for Calendar access (PRD §12).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (!isCalendarConfigured()) {
    return NextResponse.redirect(
      new URL("/settings/calendar?error=not_configured", req.url),
    );
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    new URL("/api/calendar/google/callback", req.url).toString();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url);
}
