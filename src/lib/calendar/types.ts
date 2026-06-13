// Calendar provider abstraction (PRD §12 — bi-directional Google Calendar sync).

export interface CalendarEventInput {
  /** Stable external id when updating an existing event. */
  externalId?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}

export interface CalendarEvent {
  externalId: string;
  summary: string;
  start: Date;
  end: Date;
}

export interface CalendarProvider {
  readonly name: string;
  createEvent(input: CalendarEventInput): Promise<{ externalId: string }>;
  updateEvent(input: CalendarEventInput & { externalId: string }): Promise<void>;
  deleteEvent(externalId: string): Promise<void>;
  /** Incremental list for pulling external changes (bi-directional sync). */
  listEvents(opts: {
    syncToken?: string | null;
    timeMin?: Date;
  }): Promise<{ events: CalendarEvent[]; nextSyncToken: string | null }>;
}
