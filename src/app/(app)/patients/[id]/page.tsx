import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatTime,
  PATIENT_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_STYLES,
} from "@/lib/format";
import PatientPersonalData from "@/components/PatientPersonalData";
import PatientDangerActions from "@/components/PatientDangerActions";

export const dynamic = "force-dynamic";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const patient = await prisma.patient.findFirst({
    where: { id, therapistId: session.sub },
    include: {
      sessions: {
        orderBy: { sessionDate: "desc" },
        include: { _count: { select: { notes: true } } },
      },
    },
  });
  if (!patient) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/patients" className="text-sm text-brand-600">
          ← חזרה למטופלים
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {patient.fullName}
            </h1>
            <span className="badge bg-slate-100 text-slate-600">
              {PATIENT_STATUS_LABELS[patient.status]}
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/patients/${id}/edit`} className="btn-secondary">
              עריכה
            </Link>
            <Link
              href={`/sessions/new?patientId=${id}`}
              className="btn-primary"
            >
              מפגש חדש
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sessions list (session-centric) */}
        <section className="card md:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">
            מפגשים ({patient.sessions.length})
          </h2>
          {patient.sessions.length === 0 ? (
            <p className="text-sm text-slate-500">אין מפגשים עדיין.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patient.sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        מפגש #{s.sessionNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(s.sessionDate)} · {formatTime(s.sessionDate)}{" "}
                        · {s._count.notes} סיכומים
                      </div>
                    </div>
                    <span
                      className={`badge ${SESSION_STATUS_STYLES[s.status]}`}
                    >
                      {SESSION_STATUS_LABELS[s.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Encrypted personal data (re-auth gated) */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">פרטים אישיים</h2>
            <PatientPersonalData patientId={id} />
          </section>

          {/* Lifecycle actions */}
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">פעולות</h2>
            <PatientDangerActions patientId={id} status={patient.status} />
          </section>
        </div>
      </div>
    </div>
  );
}
