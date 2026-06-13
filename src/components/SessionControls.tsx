"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSessionAction,
  deleteSessionAction,
  type FormState,
} from "@/app/(app)/sessions/actions";

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "מתוכנן" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "MISSING_NOTE", label: "חסר סיכום" },
  { value: "PROCESSING_AI", label: "בעיבוד AI" },
];

const INVOICE_OPTIONS = [
  { value: "NOT_ISSUED", label: "לא הופקה" },
  { value: "ISSUED", label: "הופקה" },
  { value: "VIEWED", label: "נצפתה" },
];

export default function SessionControls({
  sessionId,
  sessionDate,
  durationMin,
  status,
  invoiceStatus,
  tags,
}: {
  sessionId: string;
  sessionDate: string; // datetime-local value
  durationMin: number;
  status: string;
  invoiceStatus: string;
  tags: string[];
}) {
  const router = useRouter();
  const bound = updateSessionAction.bind(null, sessionId) as (
    p: FormState,
    fd: FormData,
  ) => Promise<FormState>;
  const [state, action, pending] = useActionState<FormState, FormData>(bound, {});
  const [pendingDelete, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-4">
      <form
        action={(fd) => {
          action(fd);
          router.refresh();
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sessionDate">
              תאריך ושעה
            </label>
            <input
              id="sessionDate"
              name="sessionDate"
              type="datetime-local"
              defaultValue={sessionDate}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="durationMin">
              משך (דקות)
            </label>
            <input
              id="durationMin"
              name="durationMin"
              type="number"
              min={5}
              max={600}
              defaultValue={durationMin}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="status">
              סטטוס
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="input"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="invoiceStatus">
              חשבונית
            </label>
            <select
              id="invoiceStatus"
              name="invoiceStatus"
              defaultValue={invoiceStatus}
              className="input"
            >
              {INVOICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">
            תגיות (מופרדות בפסיק)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={tags.join(", ")}
            className="input"
          />
        </div>

        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-700">נשמר ✓</p>}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "שומר…" : "שמירת שינויים"}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-3">
        {!confirmDelete ? (
          <button
            className="btn-danger w-full"
            onClick={() => setConfirmDelete(true)}
          >
            מחיקת מפגש
          </button>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm text-red-800">למחוק את המפגש לצמיתות?</p>
            <div className="flex gap-2">
              <button
                className="btn-danger"
                disabled={pendingDelete}
                onClick={() =>
                  startDelete(async () => {
                    await deleteSessionAction(sessionId);
                  })
                }
              >
                כן, מחק
              </button>
              <button
                className="btn-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
