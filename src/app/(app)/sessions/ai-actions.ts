"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { getAiProvider } from "@/lib/ai";
import { syncSessionToCalendar } from "@/lib/calendar/sync";
import { patientDisplayName } from "@/lib/format";

export type AiActionState = { error?: string; ok?: boolean };

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// PRD §8 — Voice → structured note pipeline.
// The audio file and transcript are TRANSIENT: held in memory only and never
// written to disk or the database (PRD §5.4, §16).
export async function processVoiceNoteAction(
  sessionId: string,
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const session = await requireSession();

  const owned = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { id: true, status: true },
  });
  if (!owned) return { error: "מפגש לא נמצא" };

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "נדרשת הקלטה" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "קובץ ההקלטה גדול מדי (מקסימום 25MB)" };
  }

  // Mark processing + create the job lifecycle record (metadata only).
  const previousStatus = owned.status;
  await prisma.$transaction([
    prisma.therapySession.update({
      where: { id: sessionId },
      data: { status: "PROCESSING_AI" },
    }),
    prisma.aiProcessingJob.upsert({
      where: { sessionId },
      create: { sessionId, status: "TRANSCRIBING" },
      update: { status: "TRANSCRIBING", error: null, completedAt: null },
    }),
  ]);
  revalidatePath(`/sessions/${sessionId}`);

  let audio: Buffer | null = Buffer.from(await file.arrayBuffer());
  let transcript: string | null = null;

  try {
    const ai = getAiProvider();

    // 1. Speech-to-text (transient).
    transcript = await ai.transcribeAudio(audio, file.type || "audio/webm");
    // Audio is no longer needed — drop the reference immediately (§16).
    audio = null;

    await prisma.aiProcessingJob.update({
      where: { sessionId },
      data: { status: "SUMMARIZING" },
    });

    // 2. Structured note generation.
    const note = await ai.summarizeToNote(transcript);
    // 3. Interim summary (§10).
    const summary = await ai.interimSummary(note.content);

    // Transcript is no longer needed — drop it (§16).
    transcript = null;

    await prisma.$transaction([
      prisma.sessionNote.create({
        data: { sessionId, content: note.content, source: "AI_VOICE" },
      }),
      prisma.aiSummary.upsert({
        where: { sessionId },
        create: { sessionId, ...summary },
        update: { ...summary },
      }),
      prisma.therapySession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED" },
      }),
      prisma.aiProcessingJob.update({
        where: { sessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);

    await audit({
      action: "ai.voice_process",
      userId: session.sub,
      entityType: "TherapySession",
      entityId: sessionId,
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { ok: true };
  } catch (err) {
    audio = null;
    transcript = null;
    const message = err instanceof Error ? err.message : "שגיאת עיבוד AI";
    await prisma.$transaction([
      prisma.aiProcessingJob.update({
        where: { sessionId },
        data: { status: "FAILED", error: message.slice(0, 500) },
      }),
      prisma.therapySession.update({
        where: { id: sessionId },
        data: {
          status: previousStatus === "PROCESSING_AI" ? "MISSING_NOTE" : previousStatus,
        },
      }),
    ]);
    await audit({
      action: "ai.voice_failed",
      userId: session.sub,
      entityType: "TherapySession",
      entityId: sessionId,
    });
    revalidatePath(`/sessions/${sessionId}`);
    return { error: "עיבוד ההקלטה נכשל. נסה/י שוב." };
  }
}

// PRD §10 — Generate/refresh an interim summary from the session's notes.
export async function generateInterimSummaryAction(
  sessionId: string,
): Promise<AiActionState> {
  const session = await requireSession();

  const owned = await prisma.therapySession.findFirst({
    where: { id: sessionId, therapistId: session.sub },
    select: { id: true, notes: { select: { content: true } } },
  });
  if (!owned) return { error: "מפגש לא נמצא" };
  if (owned.notes.length === 0) return { error: "אין סיכומים לסכם" };

  try {
    const ai = getAiProvider();
    const combined = owned.notes.map((n) => n.content).join("\n\n");
    const summary = await ai.interimSummary(combined);

    await prisma.aiSummary.upsert({
      where: { sessionId },
      create: { sessionId, ...summary },
      update: { ...summary },
    });

    await audit({
      action: "ai.summary_generate",
      userId: session.sub,
      entityType: "TherapySession",
      entityId: sessionId,
    });
    revalidatePath(`/sessions/${sessionId}`);
    return { ok: true };
  } catch {
    return { error: "הפקת הסיכום נכשלה" };
  }
}

// Partial contact hints shown on the confirmation screen so the therapist can
// disambiguate the patient WITHOUT exposing full personal data (PRD §19).
function phoneHint(p: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 4 ? "•••" + digits.slice(-4) : "•••";
}
function emailHint(e: string | null): string | null {
  if (!e) return null;
  const [user, domain] = e.split("@");
  if (!domain) return "•••";
  return `${user?.[0] ?? ""}•••@${domain}`;
}

export interface VoiceSummaryResult {
  error?: string;
  intent?: { patientName: string | null; date: string | null };
  candidates?: {
    id: string;
    name: string;
    phoneHint: string | null;
    emailHint: string | null;
  }[];
  // The final structured summary, ready to be filed once the therapist
  // confirms the patient + session date. Transcript & audio are discarded.
  summaryContent?: string;
}

// PRD §7B/§8/§19 — Record a session recap: transcribe → extract who/when →
// generate the structured summary. NOTHING is saved yet; the therapist must
// confirm the patient and date first (PRD §22).
export async function prepareVoiceSummaryAction(
  _prev: VoiceSummaryResult,
  formData: FormData,
): Promise<VoiceSummaryResult> {
  const session = await requireSession();

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "נדרשת הקלטה" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "קובץ ההקלטה גדול מדי (מקסימום 25MB)" };
  }

  let audio: Buffer | null = Buffer.from(await file.arrayBuffer());
  let transcript: string | null = null;
  try {
    const ai = getAiProvider();
    transcript = await ai.transcribeAudio(audio, file.type || "audio/webm");
    audio = null;

    const intent = await ai.extractSessionIntent(transcript);
    const note = await ai.summarizeToNote(transcript);
    transcript = null; // never persisted (§16)

    // Suggest existing patients by name — manual selection only (§19).
    const matched = intent.patientName
      ? await prisma.patient.findMany({
          where: {
            therapistId: session.sub,
            status: "ACTIVE",
            fullName: { contains: intent.patientName, mode: "insensitive" },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneEnc: true,
            emailEnc: true,
          },
          take: 10,
        })
      : [];
    const candidates = matched.map((p) => ({
      id: p.id,
      name: patientDisplayName(p),
      phoneHint: phoneHint(decrypt(p.phoneEnc)),
      emailHint: emailHint(decrypt(p.emailEnc)),
    }));

    return {
      intent: { patientName: intent.patientName, date: intent.date },
      candidates,
      summaryContent: note.content,
    };
  } catch {
    audio = null;
    transcript = null;
    return { error: "עיבוד ההקלטה נכשל" };
  }
}

// Step 2 — file the confirmed summary into the patient's session for that day
// (creating the session if it doesn't exist yet), then generate the interim
// summary. Only the final summary is stored (PRD §8, §16).
export async function saveVoiceSummaryAction(
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const session = await requireSession();

  const patientId = String(formData.get("patientId") ?? "");
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const summaryContent = String(formData.get("summaryContent") ?? "").trim();
  if (!patientId || !sessionDate || !summaryContent) {
    return { error: "חסרים פרטים לשמירה" };
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId: session.sub },
    select: { id: true },
  });
  if (!patient) return { error: "מטופל לא נמצא" };

  const when = new Date(sessionDate);
  if (Number.isNaN(when.getTime())) return { error: "תאריך לא תקין" };

  // Attach to the patient's session on that calendar day, or create one.
  const dayStart = new Date(when);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await prisma.therapySession.findFirst({
    where: {
      patientId,
      therapistId: session.sub,
      sessionDate: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { sessionDate: "asc" },
    select: { id: true },
  });

  let sessionId: string;
  if (existing) {
    sessionId = existing.id;
  } else {
    const last = await prisma.therapySession.findFirst({
      where: { patientId },
      orderBy: { sessionNumber: "desc" },
      select: { sessionNumber: true },
    });
    const created = await prisma.therapySession.create({
      data: {
        patientId,
        therapistId: session.sub,
        sessionDate: when,
        durationMin: 50,
        sessionNumber: (last?.sessionNumber ?? 0) + 1,
        tags: [],
        status: "SCHEDULED",
      },
    });
    sessionId = created.id;
    await syncSessionToCalendar(sessionId).catch(() => {});
  }

  let summary = null;
  try {
    summary = await getAiProvider().interimSummary(summaryContent);
  } catch {
    summary = null;
  }

  await prisma.$transaction([
    prisma.sessionNote.create({
      data: { sessionId, content: summaryContent, source: "AI_VOICE" },
    }),
    ...(summary
      ? [
          prisma.aiSummary.upsert({
            where: { sessionId },
            create: { sessionId, ...summary },
            update: { ...summary },
          }),
        ]
      : []),
    prisma.therapySession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    }),
  ]);

  await audit({
    action: "ai.voice_process",
    userId: session.sub,
    entityType: "TherapySession",
    entityId: sessionId,
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/calendar");
  redirect(`/sessions/${sessionId}`);
}
