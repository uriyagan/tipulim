import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, getSession, isElevated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { updatePatientAction, type FormState } from "../../actions";
import PatientForm from "@/components/PatientForm";
import ReauthGate from "@/components/ReauthGate";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const patient = await prisma.patient.findFirst({
    where: { id, therapistId: session.sub },
  });
  if (!patient) notFound();

  // Editing personal data requires re-authentication (PRD §6, §15.3).
  const current = await getSession();
  if (!isElevated(current)) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Link href={`/patients/${id}`} className="text-sm text-brand-600">
          ← חזרה לכרטיס המטופל
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">עריכת מטופל</h1>
        <ReauthGate description="עריכת פרטים אישיים של מטופל דורשת אימות מחדש." />
      </div>
    );
  }

  const boundUpdate = updatePatientAction.bind(null, id) as (
    prev: FormState,
    fd: FormData,
  ) => Promise<FormState>;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/patients/${id}`} className="text-sm text-brand-600">
        ← חזרה לכרטיס המטופל
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">עריכת מטופל</h1>
      <PatientForm
        action={boundUpdate}
        submitLabel="שמירת שינויים"
        requiresReauth
        initial={{
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: decrypt(patient.phoneEnc) ?? "",
          email: decrypt(patient.emailEnc) ?? "",
        }}
      />
    </div>
  );
}
