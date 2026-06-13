import type { EmailMessage, EmailProvider } from "./types";

// Offline provider used when RESEND_API_KEY is unset: logs instead of sending,
// so flows (e.g. password reset) are testable in development.
export class StubEmailProvider implements EmailProvider {
  readonly name = "stub";

  async send(msg: EmailMessage): Promise<void> {
    console.log(`[email:stub] to=${msg.to} subject="${msg.subject}"`);
    console.log(`[email:stub] html:\n${msg.html}`);
  }
}
