"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { rescheduleSessionAction } from "@/app/(app)/sessions/actions";
import { SESSION_STATUS_STYLES, SESSION_STATUS_LABELS } from "@/lib/format";

type View = "month" | "week" | "day";

interface CalEvent {
  id: string;
  title: string;
  dateISO: string;
  durationMin: number;
  status: string;
}

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00–21:00

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b);
const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default function CalendarView({
  view,
  anchorISO,
  events,
  calendarConfigured,
}: {
  view: View;
  anchorISO: string;
  events: CalEvent[];
  calendarConfigured: boolean;
}) {
  const router = useRouter();
  const anchor = new Date(anchorISO);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const navigate = (v: View, date: Date) =>
    router.push(`/calendar?view=${v}&date=${ymd(date)}`);

  const shift = (dir: number) => {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    navigate(view, d);
  };

  // Move a session to a new day (preserving its time) or to a day+hour slot.
  const drop = (target: Date, hour?: number) => {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const orig = new Date(ev.dateISO);
    const next = new Date(target);
    if (hour != null) next.setHours(hour, 0, 0, 0);
    else next.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
    if (next.getTime() === orig.getTime()) return;

    startTransition(async () => {
      await rescheduleSessionAction(id, next.toISOString());
      router.refresh();
    });
  };

  const title =
    view === "day"
      ? `${anchor.getDate()} ${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-2">
          <Link href="/settings/calendar" className="btn-secondary" title="סנכרון יומן">
            ⚙️{calendarConfigured ? "" : " הגדרה"}
          </Link>
          <Link href="/sessions/new" className="btn-primary">
            מפגש חדש
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button className="btn-secondary" onClick={() => shift(-1)}>
            ›
          </button>
          <button className="btn-secondary" onClick={() => navigate(view, new Date())}>
            היום
          </button>
          <button className="btn-secondary" onClick={() => shift(1)}>
            ‹
          </button>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => navigate(v, anchor)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                view === v
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {v === "month" ? "חודש" : v === "week" ? "שבוע" : "יום"}
            </button>
          ))}
        </div>
      </div>

      {pending && <p className="text-sm text-purple-700">מעדכן מועד…</p>}

      {view === "month" && (
        <MonthGrid
          anchor={anchor}
          events={events}
          onDragStart={setDragId}
          onDrop={(d) => drop(d)}
          onDayClick={(d) => navigate("day", d)}
        />
      )}
      {view === "week" && (
        <TimeGrid
          days={weekDays(anchor)}
          events={events}
          onDragStart={setDragId}
          onDrop={drop}
        />
      )}
      {view === "day" && (
        <TimeGrid
          days={[startOfDay(anchor)]}
          events={events}
          onDragStart={setDragId}
          onDrop={drop}
        />
      )}
    </div>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function weekDays(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function EventChip({
  ev,
  onDragStart,
}: {
  ev: CalEvent;
  onDragStart: (id: string) => void;
}) {
  return (
    <a
      href={`/sessions/${ev.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(ev.id);
      }}
      className={`block cursor-grab truncate rounded px-1.5 py-0.5 text-xs ${
        SESSION_STATUS_STYLES[ev.status] ?? "bg-slate-100 text-slate-700"
      }`}
      title={`${ev.title} · ${SESSION_STATUS_LABELS[ev.status] ?? ev.status}`}
    >
      {hhmm(new Date(ev.dateISO))} {ev.title}
    </a>
  );
}

function MonthGrid({
  anchor,
  events,
  onDragStart,
  onDrop,
  onDayClick,
}: {
  anchor: Date;
  events: CalEvent[];
  onDragStart: (id: string) => void;
  onDrop: (day: Date) => void;
  onDayClick: (day: Date) => void;
}) {
  const start = startOfDay(anchor);
  start.setDate(1);
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
        {DAY_NAMES.map((n) => (
          <div key={n} className="py-2">
            {n}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayEvents = events.filter((e) => sameDay(new Date(e.dateISO), d));
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = sameDay(d, today);
          return (
            <div
              key={ymd(d)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(d)}
              className={`min-h-[92px] border-b border-l border-slate-100 p-1 ${
                inMonth ? "" : "bg-slate-50/60 text-slate-400"
              }`}
            >
              <button
                onClick={() => onDayClick(d)}
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-brand-600 text-white" : "hover:bg-slate-100"
                }`}
              >
                {d.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 4).map((ev) => (
                  <EventChip key={ev.id} ev={ev} onDragStart={onDragStart} />
                ))}
                {dayEvents.length > 4 && (
                  <div className="px-1 text-[10px] text-slate-400">
                    +{dayEvents.length - 4}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  events,
  onDragStart,
  onDrop,
}: {
  days: Date[];
  events: CalEvent[];
  onDragStart: (id: string) => void;
  onDrop: (day: Date, hour: number) => void;
}) {
  const today = new Date();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        {/* Header row */}
        <div className="border-b border-slate-200 bg-slate-50" />
        {days.map((d) => (
          <div
            key={ymd(d)}
            className="border-b border-l border-slate-200 bg-slate-50 py-2 text-center text-xs font-medium text-slate-600"
          >
            {DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
            {sameDay(d, today) && <span className="ms-1 text-brand-600">•</span>}
          </div>
        ))}

        {/* Hour rows */}
        {HOURS.map((h) => (
          <RowFragment
            key={h}
            hour={h}
            days={days}
            events={events}
            onDragStart={onDragStart}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  hour,
  days,
  events,
  onDragStart,
  onDrop,
}: {
  hour: number;
  days: Date[];
  events: CalEvent[];
  onDragStart: (id: string) => void;
  onDrop: (day: Date, hour: number) => void;
}) {
  return (
    <>
      <div className="border-b border-slate-100 py-3 pe-1 text-left text-[11px] text-slate-400">
        {String(hour).padStart(2, "0")}:00
      </div>
      {days.map((d) => {
        const cellEvents = events.filter((e) => {
          const ed = new Date(e.dateISO);
          return sameDay(ed, d) && ed.getHours() === hour;
        });
        return (
          <div
            key={ymd(d) + hour}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(d, hour)}
            className="min-h-[44px] border-b border-l border-slate-100 p-0.5"
          >
            {cellEvents.map((ev) => (
              <EventChip key={ev.id} ev={ev} onDragStart={onDragStart} />
            ))}
          </div>
        );
      })}
    </>
  );
}
