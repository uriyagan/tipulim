"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction, type FormState } from "@/app/(app)/sessions/actions";

export default function SessionForm({
  patients,
  defaultPatientId,
  defaultDate,
}: {
  patients: { id: string; fullName: string }[];
  defaultPatientId?: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createSessionAction,
    {},
  );

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="patientId">
          מטופל
        </label>
        {patients.length === 0 ? (
          <p className="text-sm text-amber-700">
            אין מטופלים פעילים. יש ליצור מטופל תחילה.
          </p>
        ) : (
          <select
            id="patientId"
            name="patientId"
            required
            defaultValue={defaultPatientId ?? ""}
            className="input"
          >
            <option value="" disabled>
              בחר/י מטופל…
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sessionDate">
            תאריך ושעה
          </label>
          <input
            id="sessionDate"
            name="sessionDate"
            type="datetime-local"
            required
            defaultValue={defaultDate}
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
            defaultValue={50}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="tags">
          תגיות (מופרדות בפסיק)
        </label>
        <input id="tags" name="tags" className="input" placeholder="לדוגמה: התחלה, מעקב" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || patients.length === 0}
        >
          {pending ? "יוצר…" : "יצירת מפגש"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          ביטול
        </button>
      </div>
    </form>
  );
}
