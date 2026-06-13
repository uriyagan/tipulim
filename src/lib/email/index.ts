import type { EmailProvider } from "./types";
import { ResendProvider } from "./resend";
import { StubEmailProvider } from "./stub";

export type { EmailProvider, EmailMessage } from "./types";

let cached: EmailProvider | null = null;

/** Resend when configured, otherwise a console stub. */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@haclinica.io";
  cached = key ? new ResendProvider(key, from) : new StubEmailProvider();
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
