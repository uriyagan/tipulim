import { prisma } from "@/lib/db";

// Global search (PRD §14), scoped to the requesting therapist. Results never
// expose sensitive data: patient phone/email are encrypted and never returned,
// and note matches return only a short snippet for the owner.

export interface SearchResults {
  patients: { id: string; fullName: string; status: string }[];
  sessions: {
    id: string;
    patientName: string;
    sessionNumber: number;
    sessionDate: Date;
    status: string;
  }[];
  notes: { sessionId: string; patientName: string; snippet: string }[];
}

const EMPTY: SearchResults = { patients: [], sessions: [], notes: [] };

function snippet(content: string, q: string): string {
  const idx = content.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return content.slice(0, 80) + (content.length > 80 ? "…" : "");
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + q.length + 50);
  return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
}

export async function searchAll(
  therapistId: string,
  rawQuery: string,
): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return EMPTY;

  const asNumber = Number(q);
  const isNum = Number.isInteger(asNumber) && asNumber > 0;

  const [patients, sessions, notes] = await Promise.all([
    prisma.patient.findMany({
      where: {
        therapistId,
        fullName: { contains: q, mode: "insensitive" },
      },
      select: { id: true, fullName: true, status: true },
      take: 10,
      orderBy: { fullName: "asc" },
    }),
    prisma.therapySession.findMany({
      where: {
        therapistId,
        OR: [
          { tags: { has: q } },
          { patient: { fullName: { contains: q, mode: "insensitive" } } },
          ...(isNum ? [{ sessionNumber: asNumber }] : []),
        ],
      },
      select: {
        id: true,
        sessionNumber: true,
        sessionDate: true,
        status: true,
        patient: { select: { fullName: true } },
      },
      take: 15,
      orderBy: { sessionDate: "desc" },
    }),
    prisma.sessionNote.findMany({
      where: {
        session: { therapistId },
        content: { contains: q, mode: "insensitive" },
      },
      select: {
        content: true,
        sessionId: true,
        session: { select: { patient: { select: { fullName: true } } } },
      },
      take: 15,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    patients,
    sessions: sessions.map((s) => ({
      id: s.id,
      patientName: s.patient.fullName,
      sessionNumber: s.sessionNumber,
      sessionDate: s.sessionDate,
      status: s.status,
    })),
    notes: notes.map((n) => ({
      sessionId: n.sessionId,
      patientName: n.session.patient.fullName,
      snippet: snippet(n.content, q),
    })),
  };
}
