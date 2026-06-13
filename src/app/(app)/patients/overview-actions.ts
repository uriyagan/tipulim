"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { getAiProvider } from "@/lib/ai";

export type OverviewActionState = { error?: string; ok?: boolean };

// PRD §11 — generate/refresh the longitudinal therapeutic overview for a
// patient by aggregating the notes across all of their sessions. Only clinical
// text is sent to the model; no identifiers (data minimization, §15.5).
export async function generatePatientOverviewAction(
  patientId: string,
): Promise<OverviewActionState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "ai.use")) {
    return { error: "אין הרשאה להפעלת AI" };
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
    select: {
      id: true,
      sessions: {
        orderBy: { sessionDate: "asc" },
        select: {
          sessionDate: true,
          notes: { select: { content: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!patient) return { error: "מטופל לא נמצא" };

  const documented = patient.sessions
    .filter((s) => s.notes.length > 0)
    .map((s) => ({
      date: s.sessionDate.toISOString().slice(0, 10),
      content: s.notes.map((n) => n.content).join("\n"),
    }));

  if (documented.length < 2) {
    return { error: "נדרשים לפחות שני מפגשים מתועדים להפקת סקירה" };
  }

  try {
    const ai = getAiProvider();
    const overview = await ai.therapeuticOverview(documented);

    await prisma.aiPatientOverview.upsert({
      where: { patientId },
      create: { patientId, ...overview, sessionsCount: documented.length },
      update: { ...overview, sessionsCount: documented.length },
    });

    await audit({
      action: "ai.overview_generate",
      userId: session.sub,
      entityType: "Patient",
      entityId: patientId,
    });

    revalidatePath(`/patients/${patientId}`);
    return { ok: true };
  } catch {
    return { error: "הפקת הסקירה נכשלה" };
  }
}
