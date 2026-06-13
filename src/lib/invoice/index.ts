import type { InvoiceProvider } from "./types";
import { HttpInvoiceProvider } from "./http";
import { StubInvoiceProvider } from "./stub";

export type { InvoiceProvider } from "./types";

let cached: InvoiceProvider | null = null;

/**
 * Returns the configured external invoice provider, or a deterministic stub
 * when none is configured (PRD §13 — external integration only, pluggable).
 */
export function getInvoiceProvider(): InvoiceProvider {
  if (cached) return cached;
  const url = process.env.INVOICE_API_URL;
  const key = process.env.INVOICE_API_KEY;
  cached = url && key ? new HttpInvoiceProvider(url, key) : new StubInvoiceProvider();
  return cached;
}

export function isInvoiceConfigured(): boolean {
  return Boolean(process.env.INVOICE_API_URL && process.env.INVOICE_API_KEY);
}
