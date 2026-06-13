import { randomBytes } from "node:crypto";
import type { CreateInvoiceInput, InvoiceProvider } from "./types";

// Offline stub used when no external invoice provider is configured, so the
// flow is demoable. Generates a deterministic-looking external reference.
export class StubInvoiceProvider implements InvoiceProvider {
  readonly name = "stub";

  async createInvoice(input: CreateInvoiceInput) {
    const externalId = `demo_${randomBytes(6).toString("hex")}`;
    return {
      externalId,
      status: "ISSUED" as const,
      url: `#invoice-${input.sessionId}`,
    };
  }
}
