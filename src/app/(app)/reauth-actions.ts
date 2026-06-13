"use server";

import { prisma } from "@/lib/db";
import {
  requireSession,
  verifyPassword,
  elevateSession,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { reauthSchema } from "@/lib/validation";

export type ReauthState = { error?: string; ok?: boolean };

// Re-authentication for sensitive actions (PRD §15.3). On success the session
// is elevated for a short window; the caller then re-tries the gated action.
export async function reauthAction(
  _prev: ReauthState,
  formData: FormData,
): Promise<ReauthState> {
  const session = await requireSession();

  const parsed = reauthSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "סיסמה שגויה" };
  }

  await elevateSession();
  await audit({ action: "auth.reauth", userId: session.sub });
  return { ok: true };
}
