"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addNoteAction,
  updateNoteAction,
  deleteNoteAction,
  type FormState,
} from "@/app/(app)/sessions/actions";
import { NOTE_SOURCE_LABELS } from "@/lib/note-labels";

type Note = {
  id: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export default function NotesSection({
  sessionId,
  notes,
}: {
  sessionId: string;
  notes: Note[];
}) {
  const [addState, addAction, adding] = useActionState<FormState, FormData>(
    addNoteAction,
    {},
  );

  return (
    <div className="space-y-4">
      {/* Quick "Add Session Note" (PRD §18) */}
      <form action={addAction} className="space-y-2">
        <input type="hidden" name="sessionId" value={sessionId} />
        <textarea
          name="content"
          rows={4}
          required
          placeholder="הוספת סיכום מפגש…"
          className="input resize-y"
        />
        {addState.error && (
          <p className="text-sm text-red-700">{addState.error}</p>
        )}
        <button type="submit" className="btn-primary" disabled={adding}>
          {adding ? "שומר…" : "הוספת סיכום"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">אין סיכומים עדיין.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteItem({ note }: { note: Note }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const boundUpdate = updateNoteAction.bind(null, note.id) as (
    p: FormState,
    fd: FormData,
  ) => Promise<FormState>;
  const [state, action, pending] = useActionState<FormState, FormData>(
    boundUpdate,
    {},
  );

  if (state.ok && editing) setEditing(false);

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span className="badge bg-slate-100 text-slate-600">
          {NOTE_SOURCE_LABELS[note.source] ?? note.source}
        </span>
        <span>{new Date(note.createdAt).toLocaleString("he-IL")}</span>
      </div>

      {editing ? (
        <form action={action} className="space-y-2">
          <textarea
            name="content"
            rows={4}
            defaultValue={note.content}
            className="input resize-y"
            required
          />
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              שמירה
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(false)}
            >
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-slate-800">
            {note.content}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <button
              className="text-brand-600 hover:underline"
              onClick={() => setEditing(true)}
            >
              עריכה
            </button>
            <button
              className="text-red-600 hover:underline"
              onClick={async () => {
                if (confirm("למחוק את הסיכום?")) {
                  await deleteNoteAction(note.id);
                  router.refresh();
                }
              }}
            >
              מחיקה
            </button>
          </div>
        </>
      )}
    </li>
  );
}
