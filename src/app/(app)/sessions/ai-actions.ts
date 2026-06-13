"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getAiProvider } from "@/lib/ai";

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

export interface VoiceIntentResult {
  error?: string;
  transcript?: string;
  intent?: { patientName: string | null; date: string | null };
  candidates?: { id: string; fullName: string }[];
}

// PRD §7B — AI-assisted session creation, step 1: extract intent + suggest
// patient matches. NEVER creates anything (PRD §22) — returns suggestions only.
export async function extractVoiceIntentAction(
  _prev: VoiceIntentResult,
  formData: FormData,
): Promise<VoiceIntentResult> {
  const session = await requireSession();

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "נדרשת הקלטה" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "קובץ ההקלטה גדול מדי (מקסימום 25MB)" };
  }

  let audio: Buffer | null = Buffer.from(await file.arrayBuffer());
  try {
    const ai = getAiProvider();
    const transcript = await ai.transcribeAudio(audio, file.type || "audio/webm");
    audio = null;
    const intent = await ai.extractSessionIntent(transcript);

    // Suggest existing patients by name — manual selection only (§19).
    const candidates = intent.patientName
      ? await prisma.patient.findMany({
          where: {
            therapistId: session.sub,
            status: "ACTIVE",
            fullName: { contains: intent.patientName, mode: "insensitive" },
          },
          select: { id: true, fullName: true },
          take: 10,
        })
      : [];

    return { transcript, intent, candidates };
  } catch {
    audio = null;
    return { error: "עיבוד ההקלטה נכשל" };
  }
}
