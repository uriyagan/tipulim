import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_LABELS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { fullName: true, email: true, role: true },
  });
  if (!user) return null;

  const perms = ROLE_PERMISSIONS[user.role];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link href="/settings" className="text-sm text-brand-600">
          ← הגדרות
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">חשבון ותפקיד</h1>
      </div>

      <section className="card space-y-2 text-sm">
        <Row label="שם" value={user.fullName} />
        <Row label="אימייל" value={user.email} ltr />
        <Row label="תפקיד" value={ROLE_LABELS[user.role]} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">הרשאות</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {perms.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-green-600">✓</span>
              {PERMISSION_LABELS[p]}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          ההרשאות נקבעות לפי התפקיד (RBAC). תפקידי מרפאה נוספים נתמכים בעיצוב
          לקראת הרחבה רב‑מטפלית (§21).
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 text-slate-500">{label}</span>
      <span className="font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}
