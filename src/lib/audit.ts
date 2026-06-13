import { prisma } from "@/lib/db";

// Audit logging (PRD §5.5, §15.6): metadata only, never sensitive content.
// entityId is a non-sensitive surrogate id, never a name/phone/email.

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.reauth"
  | "patient.create"
  | "patient.update"
  | "patient.archive"
  | "patient.restore"
  | "patient.delete"
  | "patient.view_personal"
  | "patient.export"
  | "session.create"
  | "session.update"
  | "session.delete"
  | "note.create"
  | "note.update"
  | "note.delete"
  | "ai.voice_process"
  | "ai.voice_failed"
  | "ai.summary_generate"
  | "ai.overview_generate"
  | "invoice.issue"
  | "invoice.status_update";

export async function audit(params: {
  action: AuditAction;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actionType: params.action,
        userId: params.userId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    });
  } catch {
    // Auditing must never break the primary action; swallow failures.
  }
}
