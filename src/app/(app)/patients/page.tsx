import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PATIENT_STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const showArchived = params.status === "archived";

  const patients = await prisma.patient.findMany({
    where: {
      therapistId: session.sub,
      status: showArchived ? "ARCHIVED" : "ACTIVE",
      ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { fullName: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">מטופלים</h1>
        <Link href="/patients/new" className="btn-primary">
          מטופל חדש
        </Link>
      </div>

      {/* Search + filter (PRD §14 — no sensitive data in results) */}
      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="חיפוש לפי שם…"
          className="input max-w-xs"
        />
        {showArchived && <input type="hidden" name="status" value="archived" />}
        <button type="submit" className="btn-secondary">
          חיפוש
        </button>
        <div className="ms-auto flex gap-2 text-sm">
          <Link
            href="/patients"
            className={`rounded-lg px-3 py-1.5 ${!showArchived ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}
          >
            פעילים
          </Link>
          <Link
            href="/patients?status=archived"
            className={`rounded-lg px-3 py-1.5 ${showArchived ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}
          >
            ארכיון
          </Link>
        </div>
      </form>

      {patients.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          {q ? "לא נמצאו מטופלים תואמים." : "אין מטופלים להצגה."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {patients.map((p) => (
            <li key={p.id}>
              <Link
                href={`/patients/${p.id}`}
                className="card flex items-center justify-between hover:border-brand-300"
              >
                <div>
                  <div className="font-medium text-slate-900">{p.fullName}</div>
                  <div className="text-xs text-slate-500">
                    {p._count.sessions} מפגשים
                  </div>
                </div>
                <span className="badge bg-slate-100 text-slate-600">
                  {PATIENT_STATUS_LABELS[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
