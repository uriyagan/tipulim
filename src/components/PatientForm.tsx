"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import ReauthDialog from "./ReauthDialog";
import type { FormState } from "@/app/(app)/patients/actions";

// Shared create/edit patient form. When the bound action returns
// "REAUTH_REQUIRED" (edit path, PRD §6/§15.3), a re-auth dialog is shown and
// the form is resubmitted automatically after elevation.
export default function PatientForm({
  action,
  initial,
  submitLabel,
  requiresReauth = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: { fullName: string; phone?: string; email?: string };
  submitLabel: string;
  requiresReauth?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const [showReauth, setShowReauth] = useState(false);

  const needsReauth = state.error === "REAUTH_REQUIRED";

  return (
    <form
      action={formAction}
      className="card space-y-4"
      onSubmitCapture={() => {
        if (requiresReauth) setShowReauth((v) => v); // no-op, dialog driven by state
      }}
    >
      <div>
        <label className="label" htmlFor="fullName">
          שם מלא
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={initial?.fullName ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          טלפון
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial?.phone ?? ""}
          className="input"
          dir="ltr"
        />
        <p className="mt-1 text-xs text-slate-400">מוצפן במנוחה (AES-256)</p>
      </div>

      <div>
        <label className="label" htmlFor="email">
          אימייל
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          className="input"
          dir="ltr"
        />
        <p className="mt-1 text-xs text-slate-400">מוצפן במנוחה (AES-256)</p>
      </div>

      {state.error && !needsReauth && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {needsReauth && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          עריכת פרטי מטופל דורשת אימות מחדש.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => setShowReauth(true)}
          >
            אמת/י עכשיו
          </button>
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "שומר…" : submitLabel}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          ביטול
        </button>
      </div>

      <ReauthDialog
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onSuccess={() => {
          setShowReauth(false);
          // Resubmit the form now that the session is elevated.
          const formEl = document.querySelector<HTMLFormElement>(
            "form.card",
          );
          formEl?.requestSubmit();
        }}
        description="עריכת פרטים אישיים של מטופל דורשת אימות מחדש."
      />
    </form>
  );
}
