import type {
  AiProvider,
  InterimSummary,
  SessionIntent,
  StructuredNote,
} from "./types";
import {
  NOTE_SYSTEM,
  SUMMARY_SYSTEM,
  buildIntentPrompt,
  buildNotePrompt,
  buildSummaryPrompt,
} from "./prompts";

// Google Gemini provider via the REST API (no SDK dependency).
// Docs: https://ai.google.dev/api/generate-content

const BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private apiKey: string,
    private model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  ) {}

  private async generate(
    parts: GeminiPart[],
    opts: { system?: string; json?: boolean } = {},
  ): Promise<string> {
    const url = `${BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    };
    if (opts.system) {
      body.systemInstruction = { parts: [{ text: opts.system }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  }

  async transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
    return this.generate(
      [
        { text: "תמלל את ההקלטה הבאה לעברית, טקסט רציף בלבד ללא הערות." },
        { inline_data: { mime_type: mimeType, data: audio.toString("base64") } },
      ],
      { system: "אתה מתמלל מדויק. החזר את התמליל בלבד." },
    );
  }

  async summarizeToNote(transcript: string): Promise<StructuredNote> {
    const content = await this.generate([{ text: buildNotePrompt(transcript) }], {
      system: NOTE_SYSTEM,
    });
    return { content };
  }

  async interimSummary(noteText: string): Promise<InterimSummary> {
    const raw = await this.generate([{ text: buildSummaryPrompt(noteText) }], {
      system: SUMMARY_SYSTEM,
      json: true,
    });
    return normalizeSummary(parseJson(raw));
  }

  async extractSessionIntent(transcript: string): Promise<SessionIntent> {
    const raw = await this.generate([{ text: buildIntentPrompt(transcript) }], {
      json: true,
    });
    const obj = parseJson(raw) as Partial<SessionIntent>;
    return {
      patientName:
        typeof obj.patientName === "string" && obj.patientName.trim()
          ? obj.patientName.trim()
          : null,
      date: typeof obj.date === "string" && obj.date.trim() ? obj.date : null,
    };
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Models sometimes wrap JSON in code fences; strip and retry.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error("Could not parse JSON from model output");
  }
}

function normalizeSummary(obj: unknown): InterimSummary {
  const o = (obj ?? {}) as Record<string, unknown>;
  const asStr = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    keyTopics: Array.isArray(o.keyTopics)
      ? o.keyTopics.filter((t): t is string => typeof t === "string")
      : [],
    emotionalState: asStr(o.emotionalState),
    progressIndicators: asStr(o.progressIndicators),
    observations: asStr(o.observations),
  };
}
