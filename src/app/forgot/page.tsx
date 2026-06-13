"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type ForgotState } from "./actions";

export default function ForgotPage() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    forgotAction,
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">איפוס סיסמה</h1>
          <p className="mt-1 text-sm text-slate-500">
            נשלח קישור לאיפוס לכתובת האימייל
          </p>
        </div>

        {state.sent ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="input"
                dir="ltr"
              />
            </div>
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "שולח…" : "שליחת קישור איפוס"}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-brand-600">
            חזרה להתחברות
          </Link>
        </div>
      </div>
    </main>
  );
}
