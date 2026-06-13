import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { GoogleCalendarProvider, type GoogleTokens } from "./google";
import type { CalendarProvider } from "./types";

// Orchestrates pushing local sessions to, and pulling changes from, the
// connected external calendar (PRD §12). All functions are best-effort and
// no-op gracefully when the user has no connection.

/** True when Google OAuth credentials are configured at the deployment level. */
export function isCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function providerForUser(userId: string): Promise<CalendarProvider | null> {
  if (!isCalendarConfigured()) return null;
  const conn = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  const tokens: GoogleTokens = {
    accessToken: decrypt(conn.accessTokenEnc) ?? "",
    refreshToken: decrypt(conn.refreshTokenEnc),
    expiresAt: conn.expiresAt,
  };

  return new GoogleCalendarProvider(tokens, conn.calendarId, async (t) => {
    await prisma.calendarConnection.update({
      where: { userId },
      data: {
        accessTokenEnc: encrypt(t.accessToken)!,
        refreshTokenEnc: t.refreshToken ? encrypt(t.refreshToken) : conn.refreshTokenEnc,
        expiresAt: t.expiresAt,
      },
    });
  });
}

/** Pushes a single session to the external calendar (create or update). */
export async function syncSessionToCalendar(sessionId: string): Promise<void> {
  const s = await prisma.therapySession.findUnique({
    where: { id: sessionId },
    include: { patient: { select: { fullName: true } } },
  });
  if (!s) return;

  const provider = await providerForUser(s.therapistId);
  if (!provider) return;

  const input = {
    // Patient first name only in the calendar title — minimize exposure.
    summary: `מפגש: ${s.patient.fullName.split(" ")[0]} #${s.sessionNumber}`,
    description: `מפגש טיפולי (${s.durationMin} דק׳)`,
    start: s.sessionDate,
    end: new Date(s.sessionDate.getTime() + s.durationMin * 60_000),
  };

  if (s.externalCalendarId) {
    await provider.updateEvent({ ...input, externalId: s.externalCalendarId });
  } else {
    const { externalId } = await provider.createEvent(input);
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { externalCalendarId: externalId },
    });
  }
}

/**
 * Pulls external changes and applies them to local sessions (the inbound half
 * of bi-directional sync, PRD §12). Matches events by `externalCalendarId` and
 * updates the local session time when it differs. Returns the count applied.
 */
export async function pullCalendarChanges(userId: string): Promise<number> {
  const conn = await prisma.calendarConnection.findUnique({ where: { userId } });
  const provider = await providerForUser(userId);
  if (!conn || !provider) return 0;

  const { events, nextSyncToken } = await provider.listEvents({
    syncToken: conn.syncToken,
    timeMin: new Date(),
  });

  let applied = 0;
  for (const ev of events) {
    const session = await prisma.therapySession.findFirst({
      where: { therapistId: userId, externalCalendarId: ev.externalId },
      select: { id: true, sessionDate: true },
    });
    if (session && session.sessionDate.getTime() !== ev.start.getTime()) {
      await prisma.therapySession.update({
        where: { id: session.id },
        data: { sessionDate: ev.start },
      });
      applied++;
    }
  }

  if (nextSyncToken) {
    await prisma.calendarConnection.update({
      where: { userId },
      data: { syncToken: nextSyncToken },
    });
  }
  return applied;
}

/** Removes a session's external calendar event, if any. */
export async function removeSessionFromCalendar(
  userId: string,
  externalCalendarId: string | null,
): Promise<void> {
  if (!externalCalendarId) return;
  const provider = await providerForUser(userId);
  if (!provider) return;
  await provider.deleteEvent(externalCalendarId);
}
