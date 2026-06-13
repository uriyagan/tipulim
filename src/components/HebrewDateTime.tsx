"use client";

import { useMemo } from "react";

// Native <input type="datetime-local"> renders in the browser's locale, which
// can't be forced to Hebrew from the page. This control renders Hebrew labels
// explicitly and emits a "YYYY-MM-DDTHH:mm" value (what the session action
// expects), guaranteeing a Hebrew date/time experience regardless of browser.

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

function parse(v: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || "");
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

function fmt(y: number, mo: number, d: number, h: number, mi: number): string {
  return `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
}

function daysInMonth(y: number, mo: number): number {
  return new Date(y, mo, 0).getDate();
}

export default function HebrewDateTime({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  name?: string;
}) {
  const p = parse(value);
  // Fall back to a stable, parseable default so the form always submits.
  const cur = p ?? { y: 2026, mo: 1, d: 1, h: 10, mi: 0 };

  const years = useMemo(() => {
    const base = cur.y;
    return [base - 1, base, base + 1, base + 2];
  }, [cur.y]);

  const set = (patch: Partial<typeof cur>) => {
    const next = { ...cur, ...patch };
    next.d = Math.min(next.d, daysInMonth(next.y, next.mo));
    onChange(fmt(next.y, next.mo, next.d, next.h, next.mi));
  };

  const days = Array.from({ length: daysInMonth(cur.y, cur.mo) }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Step by 5, but always include the current minute so any value displays.
  const minutes = Array.from(
    new Set([...Array.from({ length: 12 }, (_, i) => i * 5), cur.mi]),
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select className="input" aria-label="יום" value={cur.d} onChange={(e) => set({ d: +e.target.value })}>
          {days.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select className="input" aria-label="חודש" value={cur.mo} onChange={(e) => set({ mo: +e.target.value })}>
          {MONTHS.map((label, i) => (
            <option key={label} value={i + 1}>{label}</option>
          ))}
        </select>
        <select className="input" aria-label="שנה" value={cur.y} onChange={(e) => set({ y: +e.target.value })}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="input" aria-label="שעה" value={cur.h} onChange={(e) => set({ h: +e.target.value })}>
          {hours.map((h) => (
            <option key={h} value={h}>{pad(h)}</option>
          ))}
        </select>
        <select className="input" aria-label="דקות" value={cur.mi} onChange={(e) => set({ mi: +e.target.value })}>
          {minutes.map((mi) => (
            <option key={mi} value={mi}>{pad(mi)}</option>
          ))}
        </select>
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}