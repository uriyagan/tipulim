import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toDatetimeLocal, patientDisplayName } from "@/lib/format";
import SessionForm from "@/components/SessionForm";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const session = await requireSession();
  const { patientId } = await searchParams;

  const patients = await prisma.patient.findMany({
    where: { therapistId: session.sub, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/calendar" className="text-sm text-brand-600">
        ← חזרה ליומן
      </Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">מפגש חדש</h1>
        <Link href="/sessions/voice" className="btn-secondary">
          🎙️ תיעוד מהקלטה (AI)
        </Link>
      </div>
      <SessionForm
        patients={patients.map((p) => ({ id: p.id, fullName: patientDisplayName(p) }))}
        defaultPatientId={patientId}
        defaultDate={toDatetimeLocal(new Date())}
      />
    </div>
  );
}
