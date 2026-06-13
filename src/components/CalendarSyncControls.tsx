"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  disconnectCalendarAction,
  pullCalendarAction,
} from "@/app/(app)/settings/calendar/actions";

export default function CalendarSyncControls() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await pullCalendarAction();
              setMsg(res.error ?? `סונכרנו ${res.applied} מפגשים מהיומן`);
              router.refresh();
            })
          }
        >
          {pending ? "מסנכרן…" : "⟳ משוך שינויים מהיומן"}
        </button>
        <button
          className="btn-danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await disconnectCalendarAction();
              router.refresh();
            })
          }
        >
          ניתוק חיבור
        </button>
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
