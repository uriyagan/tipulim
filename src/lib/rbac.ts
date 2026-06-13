import type { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";

// Role-based access control (PRD §3.2, §21). Modeled from day one even though
// only THERAPIST is active initially, so multi-therapist/clinic features can be
// gated without refactoring.

export type Permission =
  | "patient.manage" // create/edit/archive/delete patients
  | "session.manage" // create/edit/delete sessions & notes
  | "ai.use" // run AI summaries/overviews
  | "calendar.manage" // connect/sync external calendar
  | "invoice.manage" // issue invoices
  | "clinic.manage_members" // add/remove therapists (clinic admin)
  | "clinic.view_all"; // view across all therapists in a clinic

const THERAPIST: Permission[] = [
  "patient.manage",
  "session.manage",
  "ai.use",
  "calendar.manage",
  "invoice.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  THERAPIST,
  // Clinic admin manages members and sees the clinic, plus everything a
  // therapist can do.
  CLINIC_ADMIN: [...THERAPIST, "clinic.manage_members", "clinic.view_all"],
  // Staff/assistant: scheduling & invoicing, but not clinical AI or patient PII.
  STAFF: ["session.manage", "calendar.manage", "invoice.manage"],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

/** Guard for server code that requires a specific permission. */
export async function requirePermission(perm: Permission): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.role, perm)) {
    throw new Error("FORBIDDEN");
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  THERAPIST: "מטפל/ת",
  CLINIC_ADMIN: "מנהל/ת מרפאה",
  STAFF: "צוות",
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "patient.manage": "ניהול מטופלים",
  "session.manage": "ניהול מפגשים וסיכומים",
  "ai.use": "שימוש ב‑AI",
  "calendar.manage": "ניהול יומן וסנכרון",
  "invoice.manage": "הפקת חשבוניות",
  "clinic.manage_members": "ניהול חברי מרפאה",
  "clinic.view_all": "צפייה כלל‑מרפאתית",
};
