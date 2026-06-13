"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import {
  generateTotpSecret,
  provisioningUri,
  verifyTotp,
} from "@/lib/totp";

export type SecurityState = { error?: string; ok?: boolean };

// Step 1 of enabling 2FA: generate + store a (not-yet-active) secret and return
// the provisioning details for the authenticator app (PRD §15.1).
export async function startEnroll2FA(): Promise<{
  secret: string;
  uri: string;
} | { error: string }> {
  const session = await requireSession();
  const secret = generateTotpSecret();

  await prisma.user.update({
    where: { id: session.sub },
    data: { twoFactorSecret: encrypt(secret), twoFactorEnabled: false },
  });

  return { secret, uri: provisioningUri(secret, session.email) };
}

// Step 2: confirm a valid code, which activates 2FA.
export async function confirmEnroll2FA(code: string): Promise<SecurityState> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  const secret = user?.twoFactorSecret ? decrypt(user.twoFactorSecret) : null;
  if (!secret) return { error: "יש להתחיל את ההגדרה מחדש" };
  if (!verifyTotp(secret, code)) return { error: "קוד שגוי" };

  await prisma.user.update({
    where: { id: session.sub },
    data: { twoFactorEnabled: true },
  });
  await audit({ action: "auth.reauth", userId: session.sub });
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function disable2FA(code: string): Promise<SecurityState> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  const secret = user?.twoFactorSecret ? decrypt(user.twoFactorSecret) : null;
  // Require a valid current code to disable.
  if (!secret || !verifyTotp(secret, code)) return { error: "קוד שגוי" };

  await prisma.user.update({
    where: { id: session.sub },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  revalidatePath("/settings/security");
  return { ok: true };
}
