"use server";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getEmailProvider } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { forgotSchema } from "@/lib/validation";

export type ForgotState = { error?: string; sent?: boolean };

function appUrl(): string {
  return (process.env.APP_URL ?? "https://www.haclinica.io").replace(/\/$/, "");
}

// Requests a password reset (PRD §15.1). Always reports success so the form
// never reveals whether an email is registered.
export async function forgotAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const url = `${appUrl()}/reset?token=${token}`;
    const { subject, html } = passwordResetEmail(url);
    try {
      await getEmailProvider().send({ to: user.email, subject, html });
    } catch {
      // Don't leak send failures to the requester.
    }
    await audit({ action: "auth.reset_request", userId: user.id });
  }

  return { sent: true };
}
