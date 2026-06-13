"use server";

import { prisma } from "@/lib/db";
import { requireSession, getSession, isElevated } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export type PersonalData =
  | { ok: true; fullName: string; phone: string | null; email: string | null }
  | { ok: false; reason: "REAUTH_REQUIRED" | "NOT_FOUND" };

// Returns decrypted personal data ONLY when the session is currently elevated
// via re-authentication (PRD §6, §15.3). Viewing is itself audited (§15.6).
export async function getPatientPersonalData(
  patientId: string,
): Promise<PersonalData> {
  const session = await requireSession();

  const current = await getSession();
  if (!isElevated(current)) {
    return { ok: false, reason: "REAUTH_REQUIRED" };
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
    select: { fullName: true, phoneEnc: true, emailEnc: true },
  });
  if (!patient) return { ok: false, reason: "NOT_FOUND" };

  await audit({
    action: "patient.view_personal",
    userId: session.sub,
    entityType: "Patient",
    entityId: patientId,
  });

  return {
    ok: true,
    fullName: patient.fullName,
    phone: decrypt(patient.phoneEnc),
    email: decrypt(patient.emailEnc),
  };
}
