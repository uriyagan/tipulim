import type { EmailMessage, EmailProvider } from "./types";

// Resend transactional email provider (https://resend.com/docs/api-reference).
export class ResendProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}
