// AI layer types (PRD §8, §10, §7B).

/** Structured therapy session note produced from a transcript. */
export interface StructuredNote {
  /** Final, human-readable structured note text (Hebrew, markdown-ish). */
  content: string;
}

/** Interim, session-level structured summary (PRD §10). */
export interface InterimSummary {
  keyTopics: string[];
  emotionalState: string;
  progressIndicators: string;
  observations: string;
}

/**
 * Intent extracted from a voice utterance for AI-assisted session creation
 * (PRD §7B). Only weak signals — never an authoritative assignment.
 */
export interface SessionIntent {
  patientName: string | null;
  /** ISO date (yyyy-mm-dd) if a date was mentioned, else null. */
  date: string | null;
}

export interface AiProvider {
  /** Provider id, surfaced in UI/logs. */
  readonly name: string;

  /**
   * Transcribes audio to text. The result is TRANSIENT — callers must not
   * persist it (PRD §8, §16).
   */
  transcribeAudio(audio: Buffer, mimeType: string): Promise<string>;

  /** Turns a transcript into a structured therapy note. */
  summarizeToNote(transcript: string): Promise<StructuredNote>;

  /** Produces an interim, session-level summary from note text. */
  interimSummary(noteText: string): Promise<InterimSummary>;

  /** Extracts patient-name / date intent from a short utterance (PRD §7B). */
  extractSessionIntent(transcript: string): Promise<SessionIntent>;
}
