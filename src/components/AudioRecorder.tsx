"use client";

import { useEffect, useRef, useState } from "react";

// Reusable audio capture: records via MediaRecorder or accepts an uploaded
// file. Produces a Blob via `onAudio`. The blob is held in memory only and is
// the caller's responsibility to submit (and never persist — PRD §16).
export default function AudioRecorder({
  onAudio,
  disabled,
}: {
  onAudio: (blob: Blob | null) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setBlob = (blob: Blob | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(blob ? URL.createObjectURL(blob) : null);
    onAudio(blob);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("לא ניתן לגשת למיקרופון. ניתן להעלות קובץ במקום.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={start}
            disabled={disabled}
          >
            🎙️ התחל הקלטה
          </button>
        ) : (
          <button type="button" className="btn-danger" onClick={stop}>
            ⏹️ עצור ({mm}:{ss})
          </button>
        )}

        <label className="btn-secondary cursor-pointer">
          📁 העלאת קובץ
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setBlob(f);
            }}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {previewUrl && (
        <div className="flex items-center gap-3">
          <audio controls src={previewUrl} className="h-9" />
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline"
            onClick={() => setBlob(null)}
          >
            נקה
          </button>
        </div>
      )}
    </div>
  );
}
