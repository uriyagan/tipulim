"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startEnroll2FA,
  confirmEnroll2FA,
  disable2FA,
} from "@/app/(app)/settings/security/actions";

export default function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [enroll, setEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="badge bg-green-100 text-green-800">פעיל</span>
          <span className="text-slate-500">אימות דו‑שלבי מופעל בחשבון.</span>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm text-slate-600">
            לכיבוי, הזן/י קוד נוכחי מאפליקציית האימות:
          </p>
          <div className="flex gap-2">
            <input
              className="input max-w-[140px] text-center tracking-widest"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
            />
            <button
              className="btn-danger"
              disabled={pending || code.length !== 6}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await disable2FA(code);
                  if (res.error) setError(res.error);
                  else router.refresh();
                })
              }
            >
              כיבוי 2FA
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    );
  }

  if (!enroll) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">אימות דו‑שלבי אינו מופעל.</p>
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await startEnroll2FA();
              if ("error" in res) setError(res.error);
              else setEnroll(res);
            })
          }
        >
          {pending ? "טוען…" : "הפעלת אימות דו‑שלבי"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-2 pe-5 text-sm text-slate-700">
        <li>הוסף/י את החשבון לאפליקציית אימות (Google Authenticator וכד׳).</li>
        <li>
          סרוק/י את הקישור, או הזן/י ידנית את המפתח:
          <div className="mt-1 break-all rounded bg-slate-100 p-2 font-mono text-xs" dir="ltr">
            {enroll.secret}
          </div>
          <a className="text-xs text-brand-600 underline" href={enroll.uri} dir="ltr">
            otpauth:// link
          </a>
        </li>
        <li>הזן/י את הקוד שמתקבל לאישור:</li>
      </ol>
      <div className="flex gap-2">
        <input
          className="input max-w-[140px] text-center tracking-widest"
          dir="ltr"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
        />
        <button
          className="btn-primary"
          disabled={pending || code.length !== 6}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await confirmEnroll2FA(code);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          אישור והפעלה
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
