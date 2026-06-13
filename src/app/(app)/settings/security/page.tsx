import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TwoFactorSetup from "@/components/TwoFactorSetup";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { twoFactorEnabled: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link href="/dashboard" className="text-sm text-brand-600">
          ← חזרה
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">אבטחה</h1>
        <p className="text-sm text-slate-500">הגדרות אבטחת החשבון (§15.1).</p>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">אימות דו‑שלבי (2FA)</h2>
        <TwoFactorSetup enabled={user?.twoFactorEnabled ?? false} />
      </section>
    </div>
  );
}
