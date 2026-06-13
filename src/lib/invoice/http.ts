import type {
  CreateInvoiceInput,
  ExternalInvoiceStatus,
  InvoiceProvider,
} from "./types";

// Generic HTTP invoice provider. POSTs to a configured endpoint that adapts to
// the concrete external billing service. Keeps the app provider-agnostic (§13).
//
// Expected response JSON: { id: string, status?: "ISSUED"|"VIEWED", url?: string }
export class HttpInvoiceProvider implements InvoiceProvider {
  readonly name = "http";

  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}

  async createInvoice(input: CreateInvoiceInput) {
    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        external_ref: input.sessionId,
        description: input.description,
        amount: input.amount,
        currency: input.currency ?? "ILS",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Invoice provider ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      id: string;
      status?: ExternalInvoiceStatus;
      url?: string;
    };
    return {
      externalId: data.id,
      status: data.status ?? ("ISSUED" as const),
      url: data.url,
    };
  }
}
