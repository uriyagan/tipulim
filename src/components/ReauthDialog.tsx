"use client";

import { useActionState, useEffect } from "react";
import { reauthAction, type ReauthState } from "@/app/(app)/reauth-actions";

// Modal that re-verifies the therapist's password to elevate the session for
// sensitive actions (PRD §15.3). Calls `onSuccess` once elevation succeeds.
export default function ReauthDialog({
  open,
  onClose,
  onSuccess,
  title = "אימות מחדש",
  description = "פעולה זו דורשת הזנת סיסמה מחדש לצורך אבטחה.",
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}) {
  const [state, formAction, pending] = useActionState<ReauthState, FormData>(
    reauthAction,
    {},
  );

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>

        <form action={formAction} className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="reauth-password">
              סיסמה
            </label>
            <input
              id="reauth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="input"
              dir="ltr"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={pending}>
              {pending ? "מאמת…" : "אישור"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={pending}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
