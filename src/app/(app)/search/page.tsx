import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { searchAll } from "@/lib/search";
import {
  formatDate,
  PATIENT_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_STYLES,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const q = (await searchParams).q?.trim() ?? "";
  const results = q.length >= 2 ? await searchAll(session.sub, q) : null;
  const total = results
    ? results.patients.length + results.sessions.length + results.notes.length
    : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">חיפוש</h1>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="חיפוש מטופלים, מפגשים, סיכומים…"
          className="input max-w-md"
        />
        <button type="submit" className="btn-primary">
          חיפוש
        </button>
      </form>

      {q.length >= 2 && total === 0 && (
        <p className="text-sm text-slate-500">לא נמצאו תוצאות עבור ״{q}״.</p>
      )}
      {q.length > 0 && q.length < 2 && (
        <p className="text-sm text-slate-500">יש להזין לפחות שני תווים.</p>
      )}

      {results && results.patients.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">מטופלים</h2>
          <ul className="divide-y divide-slate-100">
            {results.patients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/patients/${p.id}`}
                  className="flex items-center justify-between py-2 hover:bg-slate-50"
                >
                  <span className="font-medium">{p.fullName}</span>
                  <span className="badge bg-slate-100 text-slate-600">
                    {PATIENT_STATUS_LABELS[p.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.sessions.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">מפגשים</h2>
          <ul className="divide-y divide-slate-100">
            {results.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:bg-slate-50"
                >
                  <span>
                    <span className="font-medium">{s.patientName}</span>{" "}
                    <span className="text-xs text-slate-500">
                      #{s.sessionNumber} · {formatDate(s.sessionDate)}
                    </span>
                  </span>
                  <span className={`badge ${SESSION_STATUS_STYLES[s.status]}`}>
                    {SESSION_STATUS_LABELS[s.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.notes.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">סיכומים</h2>
          <ul className="divide-y divide-slate-100">
            {results.notes.map((n, i) => (
              <li key={`${n.sessionId}-${i}`}>
                <Link
                  href={`/sessions/${n.sessionId}`}
                  className="block py-2 hover:bg-slate-50"
                >
                  <div className="text-sm font-medium">{n.patientName}</div>
                  <div className="text-xs text-slate-500">{n.snippet}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
