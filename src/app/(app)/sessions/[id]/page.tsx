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
} from "@/lib/format";
import NotesSection from "@/components/NotesSection";
import SessionControls from "@/components/SessionControls";
import VoiceNoteProcessor from "@/components/VoiceNoteProcessor";
import AiSummaryPanel from "@/components/AiSummaryPanel";
import InvoiceControls from "@/components/InvoiceControls";
import { isAiConfigured } from "@/lib/ai";
import { isInvoiceConfigured } from "@/lib/invoice";

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
      aiJob: true,
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
        <section className="card md:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">סיכומי מפגש</h2>
            <div className="w-56">
              <VoiceNoteProcessor sessionId={s.id} aiConfigured={isAiConfigured()} />
            </div>
          </div>

          {s.aiJob?.status === "FAILED" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              עיבוד ההקלטה האחרון נכשל. ניתן לנסות שוב.
            </p>
          )}
          {s.status === "PROCESSING_AI" && (
            <p className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700">
              מתבצע עיבוד AI…
            </p>
          )}

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
          {/* AI interim summary (PRD §10) */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">סיכום AI</h2>
            <AiSummaryPanel
              sessionId={s.id}
              hasNotes={s.notes.length > 0}
              summary={
                s.aiSummary
                  ? {
                      keyTopics: s.aiSummary.keyTopics,
                      emotionalState: s.aiSummary.emotionalState,
                      progressIndicators: s.aiSummary.progressIndicators,
                      observations: s.aiSummary.observations,
                    }
                  : null
              }
            />
          </section>

          {/* Invoicing (PRD §13) */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">חיוב</h2>
            <InvoiceControls
              sessionId={s.id}
              invoiceStatus={s.invoiceStatus}
              configured={isInvoiceConfigured()}
            />
          </section>

          {/* Session details / controls */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">פרטי מפגש</h2>
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
