import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatTime,
  toDatetimeLocal,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_STYLES,
  INVOICE_STATUS_LABELS,
} from "@/lib/format";
import NotesSection from "@/components/NotesSection";
import SessionControls from "@/components/SessionControls";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const therapySession = await prisma.therapySession.findFirst({
    where: { id, therapistId: session.sub },
    include: {
      patient: { select: { id: true, fullName: true } },
      notes: { orderBy: { createdAt: "desc" } },
      aiSummary: true,
    },
  });
  if (!therapySession) notFound();

  const s = therapySession;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/patients/${s.patient.id}`}
          className="text-sm text-brand-600"
        >
          ← {s.patient.fullName}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              מפגש #{s.sessionNumber}
            </h1>
            <span className={`badge ${SESSION_STATUS_STYLES[s.status]}`}>
              {SESSION_STATUS_LABELS[s.status]}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {formatDate(s.sessionDate)} · {formatTime(s.sessionDate)} ·{" "}
            {s.durationMin} דק׳
          </div>
        </div>
        {s.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {s.tags.map((t) => (
              <span key={t} className="badge bg-brand-50 text-brand-700">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Notes (core of the session) */}
        <section className="card md:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">סיכומי מפגש</h2>
          <NotesSection
            sessionId={s.id}
            notes={s.notes.map((n) => ({
              id: n.id,
              content: n.content,
              source: n.source,
              createdAt: n.createdAt.toISOString(),
              updatedAt: n.updatedAt.toISOString(),
            }))}
          />
        </section>

        <div className="space-y-6">
          {/* AI summary placeholder (Phase 2, PRD §10) */}
          {s.aiSummary && (
            <section className="card">
              <h2 className="mb-3 text-lg font-semibold">סיכום AI</h2>
              <dl className="space-y-2 text-sm">
                {s.aiSummary.keyTopics.length > 0 && (
                  <div>
                    <dt className="text-slate-500">נושאים מרכזיים</dt>
                    <dd>{s.aiSummary.keyTopics.join(", ")}</dd>
                  </div>
                )}
                {s.aiSummary.emotionalState && (
                  <div>
                    <dt className="text-slate-500">מצב רגשי</dt>
                    <dd>{s.aiSummary.emotionalState}</dd>
                  </div>
                )}
                {s.aiSummary.observations && (
                  <div>
                    <dt className="text-slate-500">תצפיות</dt>
                    <dd>{s.aiSummary.observations}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Session details / controls */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">פרטי מפגש</h2>
            <p className="mb-3 text-sm text-slate-500">
              חשבונית: {INVOICE_STATUS_LABELS[s.invoiceStatus]}
            </p>
            <SessionControls
              sessionId={s.id}
              sessionDate={toDatetimeLocal(s.sessionDate)}
              durationMin={s.durationMin}
              status={s.status}
              invoiceStatus={s.invoiceStatus}
              tags={s.tags}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
