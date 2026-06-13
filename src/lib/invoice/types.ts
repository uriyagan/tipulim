// External invoice provider abstraction (PRD §13).
// The system has NO internal billing engine — it only links to an external
// provider and tracks per-session invoice status.

export type ExternalInvoiceStatus = "ISSUED" | "VIEWED";

export interface CreateInvoiceInput {
  /** Local session id, passed back by the provider via webhook for matching. */
  sessionId: string;
  description: string;
  amount?: number;
  currency?: string;
}

export interface InvoiceProvider {
  readonly name: string;
  /** Issues an invoice with the external provider; returns its reference. */
  createInvoice(input: CreateInvoiceInput): Promise<{
    externalId: string;
    status: ExternalInvoiceStatus;
    /** Optional hosted URL for the issued invoice. */
    url?: string;
  }>;
}
