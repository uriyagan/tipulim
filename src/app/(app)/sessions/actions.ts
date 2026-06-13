"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  sessionSchema,
  sessionUpdateSchema,
  noteSchema,
} from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean };

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

  const parsed = sessionSchema.safeParse({
    patientId: formData.get("patientId"),
    sessionDate: formData.get("sessionDate"),
    durationMin: formData.get("durationMin") ?? 50,
    tags: parseTags(formData.get("tags")),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }
  const { patientId, sessionDate, durationMin, tags } = parsed.data;

  // Ownership + existence check (no auto-create of patients — PRD §22).
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
  });
  if (!patient) return { error: "מטופל לא נמצא" };

  // Sequential session number per patient (PRD §5.2).
  const last = await prisma.therapySession.findFirst({
    where: { patientId },
    orderBy: { sessionNumber: "desc" },
    select: { sessionNumber: true },
  });
  const sessionNumber = (last?.sessionNumber ?? 0) + 1;

  const created = await prisma.therapySession.create({
    data: {
      patientId,
      therapistId: session.sub,
      sessionDate: new Date(sessionDate),
      durationMin,
      sessionNumber,
      tags,
      status: "SCHEDULED",
    },
  });

  await audit({
    action: "session.create",
    userId: session.sub,
    entityType: "TherapySession",
    entityId: created.id,
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/sessions/${created.id}`);
}

export async function updateSessionAction(
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

  const parsed = sessionUpdateSchema.safeParse({
    sessionDate: formData.get("sessionDate") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    status: formData.get("status") || undefined,
    invoiceStatus: formData.get("invoiceStatus") || undefined,
    tags: formData.get("tags") != null ? parseTags(formData.get("tags")) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const owned = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { id: true, patientId: true },
  });
  if (!owned) return { error: "מפגש לא נמצא" };

  const data = parsed.data;
  await prisma.therapySession.update({
    where: { id: sessionId },
    data: {
      ...(data.sessionDate ? { sessionDate: new Date(data.sessionDate) } : {}),
      ...(data.durationMin ? { durationMin: data.durationMin } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.invoiceStatus ? { invoiceStatus: data.invoiceStatus } : {}),
      ...(data.tags ? { tags: data.tags } : {}),
    },
  });

  await audit({
    action: "session.update",
    userId: session.sub,
    entityType: "TherapySession",
    entityId: sessionId,
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const session = await requireSession();
  const owned = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { patientId: true },
  });
  if (!owned) return;

  await prisma.therapySession.delete({ where: { id: sessionId } });
  await audit({
    action: "session.delete",
    userId: session.sub,
    entityType: "TherapySession",
    entityId: sessionId,
  });

  revalidatePath("/calendar");
  revalidatePath(`/patients/${owned.patientId}`);
  redirect(`/patients/${owned.patientId}`);
}

// --- Session notes (PRD §9) ---

export async function addNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

  const parsed = noteSchema.safeParse({
    sessionId: formData.get("sessionId"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }
  const { sessionId, content } = parsed.data;

  const owned = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { id: true, status: true },
  });
  if (!owned) return { error: "מפגש לא נמצא" };

  await prisma.sessionNote.create({
    data: { sessionId, content, source: "MANUAL" },
  });

  // A documented session moves out of "missing note" / "scheduled".
  if (owned.status === "SCHEDULED" || owned.status === "MISSING_NOTE") {
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });
  }

  await audit({
    action: "note.create",
    userId: session.sub,
    entityType: "SessionNote",
    entityId: sessionId,
  });

  revalidatePath(`/sessions/${sessionId}`);
  return { ok: true };
}

export async function updateNoteAction(
  noteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "נדרש תוכן" };

  const note = await prisma.sessionNote.findFirst({
    where: { id: noteId, session: { therapistId: session.sub } },
    select: { id: true, sessionId: true },
  });
  if (!note) return { error: "סיכום לא נמצא" };

  await prisma.sessionNote.update({ where: { id: noteId }, data: { content } });
  await audit({
    action: "note.update",
    userId: session.sub,
    entityType: "SessionNote",
    entityId: noteId,
  });

  revalidatePath(`/sessions/${note.sessionId}`);
  return { ok: true };
}

export async function deleteNoteAction(noteId: string): Promise<void> {
  const session = await requireSession();
  const note = await prisma.sessionNote.findFirst({
    where: { id: noteId, session: { therapistId: session.sub } },
    select: { sessionId: true },
  });
  if (!note) return;

  await prisma.sessionNote.delete({ where: { id: noteId } });
  await audit({
    action: "note.delete",
    userId: session.sub,
    entityType: "SessionNote",
    entityId: noteId,
  });
  revalidatePath(`/sessions/${note.sessionId}`);
}
