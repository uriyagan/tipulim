import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isCalendarConfigured } from "@/lib/calendar/sync";
import { formatDateTime } from "@/lib/format";
import CalendarSyncControls from "@/components/CalendarSyncControls";

export const dynamic = "force-dynamic";

export default async function CalendarSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const configured = isCalendarConfigured();
  const conn = await prisma.calendarConnection.findUnique({
    where: { userId: session.sub },
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link href="/calendar" className="text-sm text-brand-600">
          ← חזרה ליומן
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          סנכרון Google Calendar
        </h1>
        <p className="text-sm text-slate-500">
          סנכרון דו‑כיווני של מפגשים עם יומן Google.
        </p>
      </div>

      {params.connected && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          היומן חובר בהצלחה ✓
        </p>
      )}
      {params.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error === "not_configured"
            ? "סנכרון Google אינו מוגדר בשרת (חסרים GOOGLE_CLIENT_ID/SECRET)."
            : "החיבור נכשל. נסה/י שוב."}
        </p>
      )}

      <section className="card space-y-3">
        {!configured ? (
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-800">הסנכרון אינו מוגדר</p>
            <p className="mt-1">
              כדי להפעיל, יש להגדיר <code>GOOGLE_CLIENT_ID</code>,{" "}
              <code>GOOGLE_CLIENT_SECRET</code> ו‑<code>GOOGLE_REDIRECT_URI</code>{" "}
              במשתני הסביבה.
            </p>
          </div>
        ) : conn ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge bg-green-100 text-green-800">מחובר</span>
              <span className="text-slate-500">
                יומן: {conn.calendarId}
                {conn.expiresAt
                  ? ` · תוקף טוקן: ${formatDateTime(conn.expiresAt)}`
                  : ""}
              </span>
            </div>
            <CalendarSyncControls />
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">היומן אינו מחובר.</p>
            <a href="/api/calendar/google/connect" className="btn-primary inline-flex">
              חיבור ל‑Google Calendar
            </a>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">
        מפגשים שתיצור/י יסונכרנו אוטומטית. שינויי מועד (כולל גרירה ביומן) נדחפים
        ל‑Google; ״משוך שינויים״ מייבא עדכונים מ‑Google חזרה למערכת.
      </p>
    </div>
  );
}