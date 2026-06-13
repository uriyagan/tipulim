import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarProvider,
} from "./types";

// Google Calendar provider via REST. Access tokens are refreshed on demand
// using the stored refresh token; refreshed tokens are persisted via the
// `onTokens` callback so the connection stays valid across requests.

const CAL_BASE = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google";

  constructor(
    private tokens: GoogleTokens,
    private calendarId: string,
    private onTokens: (t: GoogleTokens) => Promise<void>,
  ) {}

  private async accessToken(): Promise<string> {
    const valid =
      this.tokens.accessToken &&
      (!this.tokens.expiresAt || this.tokens.expiresAt.getTime() > Date.now() + 60_000);
    if (valid) return this.tokens.accessToken;

    if (!this.tokens.refreshToken) {
      throw new Error("Calendar connection expired and has no refresh token");
    }

    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: this.tokens.refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };

    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
    await this.onTokens(this.tokens);
    return this.tokens.accessToken;
  }

  private async api(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.accessToken();
    const res = await fetch(`${CAL_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok && res.status !== 410) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Calendar ${res.status}: ${detail.slice(0, 200)}`);
    }
    return res;
  }

  private toEventBody(input: CalendarEventInput) {
    return {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
    };
  }

  async createEvent(input: CalendarEventInput): Promise<{ externalId: string }> {
    const cal = encodeURIComponent(this.calendarId);
    const res = await this.api(`/calendars/${cal}/events`, {
      method: "POST",
      body: JSON.stringify(this.toEventBody(input)),
    });
    const data = (await res.json()) as { id: string };
    return { externalId: data.id };
  }

  async updateEvent(input: CalendarEventInput & { externalId: string }): Promise<void> {
    const cal = encodeURIComponent(this.calendarId);
    await this.api(`/calendars/${cal}/events/${encodeURIComponent(input.externalId)}`, {
      method: "PUT",
      body: JSON.stringify(this.toEventBody(input)),
    });
  }

  async deleteEvent(externalId: string): Promise<void> {
    const cal = encodeURIComponent(this.calendarId);
    await this.api(`/calendars/${cal}/events/${encodeURIComponent(externalId)}`, {
      method: "DELETE",
    });
  }

  async listEvents(opts: {
    syncToken?: string | null;
    timeMin?: Date;
  }): Promise<{ events: CalendarEvent[]; nextSyncToken: string | null }> {
    const cal = encodeURIComponent(this.calendarId);
    const params = new URLSearchParams({ singleEvents: "true" });
    if (opts.syncToken) params.set("syncToken", opts.syncToken);
    else if (opts.timeMin) params.set("timeMin", opts.timeMin.toISOString());

    const res = await this.api(`/calendars/${cal}/events?${params.toString()}`);
    const data = (await res.json()) as {
      items?: {
        id: string;
        summary?: string;
        status?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }[];
      nextSyncToken?: string;
    };

    const events: CalendarEvent[] = (data.items ?? [])
      .filter((e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime)
      .map((e) => ({
        externalId: e.id,
        summary: e.summary ?? "",
        start: new Date(e.start!.dateTime!),
        end: new Date(e.end!.dateTime!),
      }));

    return { events, nextSyncToken: data.nextSyncToken ?? null };
  }
}
