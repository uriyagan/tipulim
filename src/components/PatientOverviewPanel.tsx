"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generatePatientOverviewAction } from "@/app/(app)/patients/overview-actions";
import { formatDateTime } from "@/lib/format";

type Overview = {
  patterns: string | null;
  recurringThemes: string[];
  progressTrends: string | null;
  unresolvedIssues: string[];
  recommendations: string[];
  sessionsCount: number;
  updatedAt: string;
} | null;

// PRD §11 — longitudinal therapeutic overview with a (re)generate control.
export default function PatientOverviewPanel({
  patientId,
  overview,
  documentedSessions,
}: {
  patientId: string;
  overview: Overview;
  documentedSessions: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canGenerate = documentedSessions >= 2;

  return (
    <div className="space-y-3">
      {overview ? (
        <div className="space-y-3 text-sm">
          <Block label="דפוסים מרכזיים" text={overview.patterns} />
          <ListBlock label="נושאים חוזרים" items={overview.recurringThemes} />
          <Block label="מגמות התקדמות" text={overview.progressTrends} />
          <ListBlock label="סוגיות לא פתורות" items={overview.unresolvedIssues} />
          <ListBlock label="המלצות להמשך" items={overview.recommendations} />
          <p className="text-xs text-slate-400">
            הופק מ‑{overview.sessionsCount} מפגשים · {formatDateTime(overview.updatedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          טרם הופקה סקירה טיפולית לאורך זמן.
        </p>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        className="btn-secondary w-full"
        disabled={pending || !canGenerate}
        title={!canGenerate ? "נדרשים לפחות שני מפגשים מתועדים" : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await generatePatientOverviewAction(patientId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "מפיק…" : overview ? "✨ רענן סקירה" : "✨ הפק סקירה טיפולית"}
      </button>
    </div>
  );
}

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <p className="whitespace-pre-wrap text-slate-800">{text}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <ul className="list-disc space-y-0.5 pe-5 text-slate-800">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
