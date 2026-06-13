"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireSession, requireElevated } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { patientSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean };

export async function createPatientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "patient.manage")) {
    return { error: "אין הרשאה לניהול מטופלים" };
  }

  const parsed = patientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }
  const { fullName, phone, email } = parsed.data;

  const patient = await prisma.patient.create({
    data: {
      fullName,
      phoneEnc: encrypt(phone || null),
      emailEnc: encrypt(email || null),
      therapistId: session.sub,
    },
  });

  await audit({
    action: "patient.create",
    userId: session.sub,
    entityType: "Patient",
    entityId: patient.id,
  });

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

// Editing personal data is a sensitive action — requires re-auth (PRD §6, §15.3).
export async function updatePatientAction(
  patientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let session;
  try {
    session = await requireElevated();
  } catch {
    return { error: "REAUTH_REQUIRED" };
  }

  const parsed = patientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }
  const { fullName, phone, email } = parsed.data;

  const existing = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
  });
  if (!existing) return { error: "מטופל לא נמצא" };

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      fullName,
      phoneEnc: encrypt(phone || null),
      emailEnc: encrypt(email || null),
    },
  });

  await audit({
    action: "patient.update",
    userId: session.sub,
    entityType: "Patient",
    entityId: patientId,
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function archivePatientAction(patientId: string): Promise<void> {
  const session = await requireSession();
  await prisma.patient.updateMany({
    where: { id: patientId, therapistId: session.sub },
    data: { status: "ARCHIVED" },
  });
  await audit({
    action: "patient.archive",
    userId: session.sub,
    entityType: "Patient",
    entityId: patientId,
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
}

export async function restorePatientAction(patientId: string): Promise<void> {
  const session = await requireSession();
  await prisma.patient.updateMany({
    where: { id: patientId, therapistId: session.sub },
    data: { status: "ACTIVE" },
  });
  await audit({
    action: "patient.restore",
    userId: session.sub,
    entityType: "Patient",
    entityId: patientId,
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
}

// Permanent deletion is only allowed from archive, and requires re-auth
// (PRD §6: "Permanent deletion only from archive with extra password confirmation").
export async function deletePatientAction(
  patientId: string,
): Promise<FormState> {
  let session;
  try {
    session = await requireElevated();
  } catch {
    return { error: "REAUTH_REQUIRED" };
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
  });
  if (!patient) return { error: "מטופל לא נמצא" };
  if (patient.status !== "ARCHIVED") {
    return { error: "ניתן למחוק לצמיתות רק מטופל בארכיון" };
  }

  await prisma.patient.delete({ where: { id: patientId } });
  await audit({
    action: "patient.delete",
    userId: session.sub,
    entityType: "Patient",
    entityId: patientId,
  });

  revalidatePath("/patients");
  redirect("/patients");
}
