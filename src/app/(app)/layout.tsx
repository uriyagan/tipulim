import { redirect } from "next/navigation";
import { getSession, authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Idle-window sliding (PRD §15.2) happens in middleware — cookies cannot be
  // mutated during a server-component render.

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { fullName: true },
  });

  return (
    <AppShell
      userName={user?.fullName ?? session.email}
      idleMinutes={authConfig.IDLE_MINUTES}
    >
      {children}
    </AppShell>
  );
}