import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatTime,
  formatDate,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_STYLES,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const therapistId = session.sub;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [todays, upcoming, missingNotes, activePatients] = await Promise.all([
    prisma.therapySession.findMany({
      where: {
        therapistId,
        sessionDate: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { sessionDate: "asc" },
      include: { patient: { select: { fullName: true } } },
    }),
    prisma.therapySession.findMany({
      where: { therapistId, sessionDate: { gt: endOfDay } },
      orderBy: { sessionDate: "asc" },
      take: 5,
      include: { patient: { select: { fullName: true } } },
    }),
    prisma.therapySession.count({
      where: { therapistId, status: "MISSING_NOTE" },
    }),
    prisma.patient.count({ where: { therapistId, status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">לוח בקרה</h1>
        <p className="text-sm text-slate-500">{formatDate(now)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="מפגשים היום" value={todays.length} />
        <StatCard label="מטופלים פעילים" value={activePatients} href="/patients" />
        <StatCard
          label="חסרי סיכום"
          value={missingNotes}
          highlight={missingNotes > 0}
        />
        <StatCard label="מפגשים קרובים" value={upcoming.length} href="/calendar" />
      </div>

      {/* Today */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">מפגשי היום</h2>
        {todays.length === 0 ? (
          <p className="text-sm text-slate-500">אין מפגשים מתוכננים להיום.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todays.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                name={s.patient.fullName}
                number={s.sessionNumber}
                time={formatTime(s.sessionDate)}
                status={s.status}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">מפגשים קרובים</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">אין מפגשים עתידיים.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                name={s.patient.fullName}
                number={s.sessionNumber}
                time={`${formatDate(s.sessionDate)} · ${formatTime(s.sessionDate)}`}
                status={s.status}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <div
      className={`card ${highlight ? "border-amber-300 bg-amber-50" : ""}`}
    >
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function SessionRow({
  id,
  name,
  number,
  time,
  status,
}: {
  id: string;
  name: string;
  number: number;
  time: string;
  status: string;
}) {
  return (
    <li>
      <Link
        href={`/sessions/${id}`}
        className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">מפגש #{number}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`badge ${SESSION_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"}`}
          >
            {SESSION_STATUS_LABELS[status] ?? status}
          </span>
          <span className="text-slate-500">{time}</span>
        </div>
      </Link>
    </li>
  );
}
