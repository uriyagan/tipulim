"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import AudioRecorder from "./AudioRecorder";
import {
  extractVoiceIntentAction,
  type VoiceIntentResult,
} from "@/app/(app)/sessions/ai-actions";
import { createSessionAction } from "@/app/(app)/sessions/actions";

// PRD §7B + §19 + §22 — AI-assisted session creation. The AI only *suggests*
// a patient and date; a session is created only after the therapist explicitly
// confirms. Nothing is auto-assigned or auto-created.
export default function VoiceSessionWizard({ aiConfigured }: { aiConfigured: boolean }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<VoiceIntentResult | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const analyze = () => {
    if (!blob) return;
    setError(null);
    startAnalyze(async () => {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const res = await extractVoiceIntentAction({}, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(res);
      setSelectedPatient(res.candidates?.[0]?.id ?? "");
      setDate(res.intent?.date ? `${res.intent.date}T10:00` : "");
    });
  };

  const create = () => {
    if (!selectedPatient || !date) return;
    setError(null);
    startCreate(async () => {
      const fd = new FormData();
      fd.append("patientId", selectedPatient);
      fd.append("sessionDate", date);
      fd.append("durationMin", "50");
      const res = await createSessionAction({}, fd);
      // On success the action redirects to the new session.
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-5">
      {!aiConfigured && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          מצב הדגמה: לא הוגדר GEMINI_API_KEY — הזיהוי הוא לצורך הדגמה בלבד.
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">1. הקלטה</h2>
        <p className="text-sm text-slate-500">
          הקלט/י משפט קצר, למשל: ״ישראל ישראלי, מפגש, 06.06.2026״.
        </p>
        <AudioRecorder onAudio={setBlob} disabled={analyzing} />
        <button className="btn-primary" onClick={analyze} disabled={!blob || analyzing}>
          {analyzing ? "מנתח…" : "נתח הקלטה"}
        </button>
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {result && (
        <section className="card space-y-4">
          <h2 className="font-semibold">2. אישור (חובה)</h2>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="text-slate-500">זוהה מההקלטה:</div>
            <div className="mt-1">
              שם: <strong>{result.intent?.patientName || "—"}</strong> · תאריך:{" "}
              <strong>{result.intent?.date || "—"}</strong>
            </div>
            {result.transcript && (
              <details className="mt-2 text-slate-500">
                <summary className="cursor-pointer">הצג תמליל</summary>
                <p className="mt-1 whitespace-pre-wrap">{result.transcript}</p>
                <p className="mt-1 text-xs text-amber-700">
                  התמליל אינו נשמר — מוצג לאישור בלבד.
                </p>
              </details>
            )}
          </div>

          {/* Manual patient selection — never auto-assigned (§22) */}
          <div>
            <label className="label">בחירת מטופל</label>
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
                    {c.fullName}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                לא נמצאה התאמה.{" "}
                <Link href="/patients/new" className="underline">
                  יצירת מטופל חדש
                </Link>{" "}
                ולאחר מכן יצירת מפגש.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="vdate">
              תאריך ושעה
            </label>
            <input
              id="vdate"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>

          <button
            className="btn-primary"
            onClick={create}
            disabled={!selectedPatient || !date || creating}
          >
            {creating ? "יוצר…" : "אשר וצור מפגש"}
          </button>
        </section>
      )}
    </div>
  );
}
