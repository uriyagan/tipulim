"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getInvoiceProvider } from "@/lib/invoice";

export type InvoiceActionState = { error?: string; ok?: boolean };

// Issues an invoice for a session via the external provider (PRD §13).
// No internal billing — we only store the external reference and status.
export async function issueInvoiceAction(
  sessionId: string,
): Promise<InvoiceActionState> {
  const session = await requireSession();

  const s = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { id: true, sessionNumber: true, invoiceStatus: true },
  });
  if (!s) return { error: "מפגש לא נמצא" };
  if (s.invoiceStatus !== "NOT_ISSUED") {
    return { error: "כבר הופקה חשבונית למפגש זה" };
  }

  try {
    const provider = getInvoiceProvider();
    const result = await provider.createInvoice({
      sessionId: s.id,
      description: `מפגש טיפולי #${s.sessionNumber}`,
    });

    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        invoiceStatus: result.status,
        invoiceExternalId: result.externalId,
      },
    });

    await audit({
      action: "invoice.issue",
      userId: session.sub,
      entityType: "TherapySession",
      entityId: sessionId,
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { ok: true };
  } catch {
    return { error: "הפקת החשבונית נכשלה" };
  }
}
