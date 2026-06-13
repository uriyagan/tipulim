import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatTime,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_STYLES,
} from "@/lib/format";

export const dynamic = "force-dynamic";

// Agenda view of sessions grouped by day. The full day/week/month grid with
// drag-and-drop rescheduling and Google Calendar sync is Phase 2 (PRD §12).
export default async function CalendarPage() {
  const session = await requireSession();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7); // include the past week

  const sessions = await prisma.therapySession.findMany({
    where: { therapistId: session.sub, sessionDate: { gte: start } },
    orderBy: { sessionDate: "asc" },
    include: { patient: { select: { fullName: true } } },
  });

  // Group by calendar day.
  const groups = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = formatDate(s.sessionDate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">יומן</h1>
        <Link href="/sessions/new" className="btn-primary">
          מפגש חדש
        </Link>
      </div>

      {groups.size === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          אין מפגשים להצגה.
        </div>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">
                {day}
              </h2>
              <ul className="space-y-2">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="card flex items-center justify-between gap-3 py-3 hover:border-brand-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-700">
                          {formatTime(s.sessionDate)}
                        </span>
                        <div>
                          <div className="font-medium text-slate-900">
                            {s.patient.fullName}
                          </div>
                          <div className="text-xs text-slate-500">
                            מפגש #{s.sessionNumber} · {s.durationMin} דק׳
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${SESSION_STATUS_STYLES[s.status]}`}>
                        {SESSION_STATUS_LABELS[s.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
