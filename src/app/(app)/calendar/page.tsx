import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isCalendarConfigured } from "@/lib/calendar/sync";
import { patientDisplayName } from "@/lib/format";
import CalendarView from "@/components/CalendarView";

export const dynamic = "force-dynamic";

type View = "month" | "week" | "day";

function parseAnchor(date?: string): Date {
  if (date) {
    const d = new Date(date + "T00:00:00");
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Visible range for the given view, padded to whole weeks for the month grid.
function rangeFor(view: View, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  const end = new Date(anchor);
  if (view === "day") {
    end.setDate(end.getDate() + 1);
  } else if (view === "week") {
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else {
    start.setDate(1);
    start.setDate(start.getDate() - start.getDay()); // Sunday on/before the 1st
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 42); // 6 weeks
  }
  return { start, end };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const view: View =
    params.view === "week" || params.view === "day" ? params.view : "month";
  const anchor = parseAnchor(params.date);
  const { start, end } = rangeFor(view, anchor);

  const sessions = await prisma.therapySession.findMany({
    where: {
      therapistId: session.sub,
      sessionDate: { gte: start, lt: end },
    },
    orderBy: { sessionDate: "asc" },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  const events = sessions.map((s) => ({
    id: s.id,
    title: `${patientDisplayName(s.patient)} #${s.sessionNumber}`,
    dateISO: s.sessionDate.toISOString(),
    durationMin: s.durationMin,
    status: s.status,
  }));

  return (
    <CalendarView
      view={view}
      anchorISO={anchor.toISOString()}
      events={events}
      calendarConfigured={isCalendarConfigured()}
    />
  );
}
