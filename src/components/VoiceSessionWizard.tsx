"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import AudioRecorder from "./AudioRecorder";
import HebrewDateTime from "./HebrewDateTime";
import {
  prepareVoiceSummaryAction,
  saveVoiceSummaryAction,
  type VoiceSummaryResult,
} from "@/app/(app)/sessions/ai-actions";

// PRD §8 + §19 + §22 — Record a recap of a session that already happened.
// The recording (which starts with the patient's name + date) is transcribed
// and summarized by AI; the therapist then confirms WHICH patient and WHICH
// session date, and only then is the summary filed into the patient's record.
// Nothing is auto-assigned (§22); audio & transcript are never stored (§16).
export default function VoiceSessionWizard({ aiConfigured }: { aiConfigured: boolean }) {
  const [result, setResult] = useState<VoiceSummaryResult | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  // Runs as soon as the recording stops.
  const analyze = (audio: Blob) => {
    setError(null);
    setResult(null);
    startAnalyze(async () => {
      const fd = new FormData();
      fd.append("audio", audio, "recording.webm");
      const res = await prepareVoiceSummaryAction({}, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(res);
      setSelectedPatient(res.candidates?.[0]?.id ?? "");
      setDate(res.intent?.date ? `${res.intent.date}T10:00` : "");
      setSummary(res.summaryContent ?? "");
    });
  };

  const save = () => {
    if (!selectedPatient || !date || !summary.trim()) return;
    setError(null);
    startSave(async () => {
      const fd = new FormData();
      fd.append("patientId", selectedPatient);
      fd.append("sessionDate", date);
      fd.append("summaryContent", summary);
      const res = await saveVoiceSummaryAction({}, fd);
      // On success the action redirects to the session.
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-5">
      {!aiConfigured && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          מצב הדגמה: לא הוגדר GEMINI_API_KEY — התמלול והסיכום הם לצורך הדגמה בלבד.
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">1. הקלטה</h2>
        <p className="text-sm text-slate-500">
          פתח/י בשם המטופל ובתאריך המפגש, ואז סכם/י את מהלך הטיפול. לדוגמה:
          ״ישראל ישראלי, מפגש 6.6.2026 — דיברנו על…״.
        </p>
        <AudioRecorder
          onAudio={() => {}}
          onComplete={analyze}
          disabled={analyzing}
          startLabel="🎙️ התחלת הקלטה"
          stopLabel="סיום הקלטה ועיבוד"
          showPreview={false}
        />
        {analyzing && (
          <p className="text-sm text-slate-500">מתמלל ומסכם את ההקלטה…</p>
        )}
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {result && (
        <section className="card space-y-4">
          <h2 className="font-semibold">2. אישור ושיוך (חובה)</h2>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="text-slate-500">זוהה מההקלטה:</div>
            <div className="mt-1">
              שם: <strong>{result.intent?.patientName || "—"}</strong> · תאריך:{" "}
              <strong>{result.intent?.date || "—"}</strong>
            </div>
          </div>

          {/* Manual patient selection — never auto-assigned (§22) */}
          <div>
            <label className="label">לאיזה מטופל לשייך?</label>
            {result.candidates && result.candidates.length > 0 ? (
              <div className="space-y-1">
                {result.candidates.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="patient"
                      value={c.id}
                      checked={selectedPatient === c.id}
                      onChange={() => setSelectedPatient(c.id)}
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-slate-400" dir="ltr">
                      {[c.phoneHint, c.emailHint].filter(Boolean).join(" · ")}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                לא נמצאה התאמה.{" "}
                <Link href="/patients/new" className="underline">
                  יצירת מטופל חדש
                </Link>{" "}
                ולאחר מכן חזרה לכאן.
              </p>
            )}
          </div>

          <div>
            <label className="label">תאריך המפגש</label>
            <HebrewDateTime value={date} onChange={setDate} />
          </div>

          <div>
            <label className="label">סיכום הטיפול (ניתן לערוך לפני שמירה)</label>
            <textarea
              className="input min-h-[180px] whitespace-pre-wrap"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <button
            className="btn-primary"
            onClick={save}
            disabled={!selectedPatient || !date || !summary.trim() || saving}
          >
            {saving ? "שומר…" : "אישור ושמירה לתיק המטופל"}
          </button>
        </section>
      )}
    </div>
  );
}
