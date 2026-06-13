"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInterimSummaryAction } from "@/app/(app)/sessions/ai-actions";

type Summary = {
  keyTopics: string[];
  emotionalState: string | null;
  progressIndicators: string | null;
  observations: string | null;
} | null;

// PRD §10 — interim, session-level AI summary with a (re)generate control.
export default function AiSummaryPanel({
  sessionId,
  summary,
  hasNotes,
}: {
  sessionId: string;
  summary: Summary;
  hasNotes: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateInterimSummaryAction(sessionId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {summary ? (
        <dl className="space-y-2 text-sm">
          {summary.keyTopics.length > 0 && (
            <Row label="נושאים מרכזיים" value={summary.keyTopics.join(", ")} />
          )}
          <Row label="מצב רגשי" value={summary.emotionalState} />
          <Row label="אינדיקציות להתקדמות" value={summary.progressIndicators} />
          <Row label="תצפיות" value={summary.observations} />
        </dl>
      ) : (
        <p className="text-sm text-slate-500">טרם הופק סיכום AI למפגש זה.</p>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        className="btn-secondary w-full"
        onClick={generate}
        disabled={pending || !hasNotes}
        title={!hasNotes ? "נדרש לפחות סיכום אחד" : undefined}
      >
        {pending ? "מפיק…" : summary ? "✨ רענן סיכום AI" : "✨ הפק סיכום AI"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap text-slate-800">{value}</dd>
    </div>
  );
}
