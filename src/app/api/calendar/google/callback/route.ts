import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { isCalendarConfigured } from "@/lib/calendar/sync";

// Google OAuth callback: exchanges the auth code for tokens and stores an
// (encrypted) calendar connection for the current user (PRD §12, §15.4).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const settings = new URL("/settings/calendar", req.url);

  if (!isCalendarConfigured()) {
    settings.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settings);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    settings.searchParams.set("error", "no_code");
    return NextResponse.redirect(settings);
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    new URL("/api/calendar/google/callback", req.url).toString();

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`token exchange ${res.status}`);

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await prisma.calendarConnection.upsert({
      where: { userId: session.sub },
      create: {
        userId: session.sub,
        provider: "google",
        accessTokenEnc: encrypt(data.access_token)!,
        refreshTokenEnc: data.refresh_token ? encrypt(data.refresh_token) : null,
        expiresAt,
      },
      update: {
        accessTokenEnc: encrypt(data.access_token)!,
        ...(data.refresh_token
          ? { refreshTokenEnc: encrypt(data.refresh_token) }
          : {}),
        expiresAt,
      },
    });

    settings.searchParams.set("connected", "1");
    return NextResponse.redirect(settings);
  } catch {
    settings.searchParams.set("error", "exchange_failed");
    return NextResponse.redirect(settings);
  }
}
