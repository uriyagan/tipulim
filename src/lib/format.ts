// Hebrew/RTL-aware formatting helpers.

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) =>
  dateTimeFmt.format(new Date(d));
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

/** Converts a Date to the value expected by <input type="datetime-local">. */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "מתוכנן",
  COMPLETED: "הושלם",
  MISSING_NOTE: "חסר סיכום",
  PROCESSING_AI: "בעיבוד AI",
};

export const SESSION_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  MISSING_NOTE: "bg-amber-100 text-amber-800",
  PROCESSING_AI: "bg-purple-100 text-purple-800",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  NOT_ISSUED: "לא הופקה",
  ISSUED: "הופקה",
  VIEWED: "נצפתה",
};

export const PATIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "פעיל",
  ARCHIVED: "בארכיון",
};
