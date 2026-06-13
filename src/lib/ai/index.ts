import type { AiProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { StubProvider } from "./stub";

export type { AiProvider } from "./types";

let cached: AiProvider | null = null;

/**
 * Returns the configured AI provider: Gemini when GEMINI_API_KEY is set,
 * otherwise a deterministic offline stub (PRD §8, §20 — isolated AI layer).
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  cached = key ? new GeminiProvider(key) : new StubProvider();
  return cached;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
