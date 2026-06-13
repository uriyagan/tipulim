"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetAction, type ResetState } from "./actions";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="card w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">הסיסמה עודכנה</h1>
        <p className="text-sm text-slate-500">ניתן להתחבר עם הסיסמה החדשה.</p>
        <Link href="/login" className="btn-primary w-full">
          להתחברות
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">בחירת סיסמה חדשה</h1>
      </div>

      <input type="hidden" name="token" value={token} />

      <div>
        <label className="label" htmlFor="password">
          סיסמה חדשה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          dir="ltr"
        />
        <p className="mt-1 text-xs text-slate-400">לפחות 8 תווים</p>
      </div>

      {!token && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          חסר טוקן איפוס בקישור.
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending || !token}>
        {pending ? "מעדכן…" : "עדכון סיסמה"}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-brand-600">
          חזרה להתחברות
        </Link>
      </div>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
