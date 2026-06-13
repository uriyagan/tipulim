"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

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

  await createSession({ sub: user.id, email: user.email, role: user.role });
  await audit({ action: "auth.login", userId: user.id });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
