import Link from "next/link";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ITEMS = [
  { href: "/settings/account", title: "חשבון ותפקיד", desc: "תפקיד והרשאות" },
  { href: "/settings/security", title: "אבטחה", desc: "אימות דו‑שלבי (2FA)" },
  { href: "/settings/calendar", title: "יומן Google", desc: "סנכרון דו‑כיווני" },
];

export default async function SettingsPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">הגדרות</h1>
      <ul className="grid gap-3">
        {ITEMS.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="card block hover:border-brand-300">
              <div className="font-medium text-slate-900">{it.title}</div>
              <div className="text-sm text-slate-500">{it.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
