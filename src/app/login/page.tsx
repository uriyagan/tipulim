"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction, verifyTwoFactorAction, type LoginState } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  if (state.twoFactorRequired) {
    return <TwoFactorForm next={next} />;
  }

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          מערכת ניהול טיפולים
        </h1>
        <p className="mt-1 text-sm text-slate-500">התחברות מטפל/ת</p>
      </div>

      <input type="hidden" name="next" value={next} />

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

      <div>
        <label className="label" htmlFor="password">
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "מתחבר…" : "התחברות"}
      </button>
    </form>
  );
}

function TwoFactorForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    verifyTwoFactorAction,
    { twoFactorRequired: true },
  );

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">אימות דו‑שלבי</h1>
        <p className="mt-1 text-sm text-slate-500">
          הזן/י את הקוד מאפליקציית האימות
        </p>
      </div>

      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label" htmlFor="code">
          קוד אימות
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          className="input text-center tracking-[0.5em]"
          dir="ltr"
          placeholder="000000"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "מאמת…" : "אימות"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
