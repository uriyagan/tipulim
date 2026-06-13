"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  verifyPassword,
  createPending2FA,
  getPending2FA,
  clearPending2FA,
} from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string; twoFactorRequired?: boolean };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const next = String(formData.get("next") || "/dashboard");
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Constant-ish failure path; do not reveal whether the email exists.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await audit({ action: "auth.login_failed", entityType: "User" });
    return { error: "אימייל או סיסמה שגויים" };
  }

  // Second factor required (PRD §15.1): pause and ask for the TOTP code.
  if (user.twoFactorEnabled) {
    await createPending2FA(user.id);
    return { twoFactorRequired: true };
  }

  await createSession({ sub: user.id, email: user.email, role: user.role });
  await audit({ action: "auth.login", userId: user.id });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

// Second step of login for 2FA-enabled accounts.
export async function verifyTwoFactorAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const userId = await getPending2FA();
  if (!userId) return { error: "פג תוקף ההתחברות, נסה/י שוב", twoFactorRequired: false };

  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") || "/dashboard");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const secret = user?.twoFactorSecret ? decrypt(user.twoFactorSecret) : null;
  if (!user || !secret || !verifyTotp(secret, code)) {
    return { error: "קוד שגוי", twoFactorRequired: true };
  }

  await clearPending2FA();
  await createSession({ sub: user.id, email: user.email, role: user.role });
  await audit({ action: "auth.login", userId: user.id });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
