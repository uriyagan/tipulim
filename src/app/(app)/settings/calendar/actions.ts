"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { pullCalendarChanges } from "@/lib/calendar/sync";

export async function disconnectCalendarAction(): Promise<void> {
  const session = await requireSession();
  await prisma.calendarConnection.deleteMany({ where: { userId: session.sub } });
  // Forget external linkage so future syncs recreate events cleanly.
  await prisma.therapySession.updateMany({
    where: { therapistId: session.sub },
    data: { externalCalendarId: null },
  });
  revalidatePath("/settings/calendar");
}

export async function pullCalendarAction(): Promise<{ applied: number; error?: string }> {
  const session = await requireSession();
  try {
    const applied = await pullCalendarChanges(session.sub);
    revalidatePath("/calendar");
    return { applied };
  } catch {
    return { applied: 0, error: "סנכרון נכשל" };
  }
}
