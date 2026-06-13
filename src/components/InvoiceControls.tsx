"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/app/(app)/sessions/invoice-actions";
import { INVOICE_STATUS_LABELS } from "@/lib/format";

const STYLES: Record<string, string> = {
  NOT_ISSUED: "bg-slate-100 text-slate-600",
  ISSUED: "bg-blue-100 text-blue-800",
  VIEWED: "bg-green-100 text-green-800",
};

// Per-session invoice status + issue action (PRD §13). External provider only.
export default function InvoiceControls({
  sessionId,
  invoiceStatus,
  configured,
}: {
  sessionId: string;
  invoiceStatus: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">חשבונית:</span>
        <span className={`badge ${STYLES[invoiceStatus]}`}>
          {INVOICE_STATUS_LABELS[invoiceStatus]}
        </span>
      </div>

      {invoiceStatus === "NOT_ISSUED" && (
        <>
          {!configured && (
            <p className="text-xs text-amber-700">
              מצב הדגמה: לא הוגדר ספק חשבוניות חיצוני.
            </p>
          )}
          <button
            className="btn-secondary w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await issueInvoiceAction(sessionId);
                if (res.error) setError(res.error);
                else router.refresh();
              })
            }
          >
            {pending ? "מפיק…" : "הפקת חשבונית"}
          </button>
        </>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
