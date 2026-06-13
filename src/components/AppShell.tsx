"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import IdleLogout from "./IdleLogout";
import { logoutAction } from "@/app/login/actions";

const NAV = [
  { href: "/dashboard", label: "לוח בקרה", icon: "🏠" },
  { href: "/calendar", label: "יומן", icon: "🗓️" },
  { href: "/patients", label: "מטופלים", icon: "👤" },
];

export default function AppShell({
  userName,
  idleMinutes,
  children,
}: {
  userName: string;
  idleMinutes: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen md:flex">
      <IdleLogout minutes={idleMinutes} onLogout={logoutAction} />

      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 border-l border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 p-4">
          <div className="text-base font-semibold text-brand-700">
            ניהול טיפולים
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">{userName}</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary w-full">
              התנתקות
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white p-3 md:hidden">
        <button
          className="rounded-lg p-2 hover:bg-slate-100"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="תפריט"
        >
          ☰
        </button>
        <span className="font-semibold text-brand-700">ניהול טיפולים</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-slate-500">
            יציאה
          </button>
        </form>
      </header>

      {menuOpen && (
        <nav className="space-y-1 border-b border-slate-200 bg-white p-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="ml-2" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Main content */}
      <main className="relative flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>

        {/* Floating Action Button — primary CTA (PRD §18) */}
        <Link
          href="/sessions/new"
          className="fixed bottom-6 left-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg transition hover:bg-brand-700"
          aria-label="מפגש חדש"
          title="מפגש חדש"
        >
          +
        </Link>
      </main>
    </div>
  );
}
