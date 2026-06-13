"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "./AudioRecorder";
import { processVoiceNoteAction } from "@/app/(app)/sessions/ai-actions";

// PRD §8 — record/upload a session recording and turn it into a structured
// note via the AI pipeline. The audio is submitted directly and never stored.
export default function VoiceNoteProcessor({
  sessionId,
  aiConfigured,
}: {
  sessionId: string;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const process = () => {
    if (!blob) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      const ext = blob.type.includes("webm") ? "webm" : "audio";
      fd.append("audio", blob, `recording.${ext}`);
      const res = await processVoiceNoteAction(sessionId, {}, fd);
      if (res.error) {
        setError(res.error);
      } else {
        setBlob(null);
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <button className="btn-secondary w-full" onClick={() => setOpen(true)}>
        🎙️ סיכום מהקלטה (AI)
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
      {!aiConfigured && (
        <p className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
          מצב הדגמה: לא הוגדר GEMINI_API_KEY — ייווצר סיכום לדוגמה.
        </p>
      )}

      <AudioRecorder onAudio={setBlob} disabled={pending} />

      {error && <p className="text-sm text-red-700">{error}</p>}

      {pending && (
        <p className="text-sm text-purple-700">
          מעבד הקלטה… (תמלול → סיכום). ההקלטה נמחקת מיד לאחר העיבוד.
        </p>
      )}

      <div className="flex gap-2">
        <button
          className="btn-primary"
          onClick={process}
          disabled={!blob || pending}
        >
          {pending ? "מעבד…" : "עבד הקלטה"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setOpen(false);
            setBlob(null);
            setError(null);
          }}
          disabled={pending}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
