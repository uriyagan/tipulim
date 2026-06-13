import { redirect } from "next/navigation";
import { getSession, authConfig, refreshSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Slide the idle window forward on navigation activity (PRD §15.2).
  await refreshSession();

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
