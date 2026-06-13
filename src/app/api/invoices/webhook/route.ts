import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// Receives invoice status updates from the external provider (PRD §13).
// Authenticated via a shared secret header, not a user session. Maps the
// provider's external_ref → session and updates invoiceStatus (issued/viewed).
export async function POST(req: NextRequest) {
  const secret = process.env.INVOICE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { external_id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const status =
    body.status === "viewed"
      ? "VIEWED"
      : body.status === "issued"
        ? "ISSUED"
        : null;
  if (!body.external_id || !status) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const session = await prisma.therapySession.findFirst({
    where: { invoiceExternalId: body.external_id },
    select: { id: true },
  });
  if (!session) {
    // Ack unknown references so the provider doesn't retry forever.
    return NextResponse.json({ ok: true, matched: false });
  }

  await prisma.therapySession.update({
    where: { id: session.id },
    data: { invoiceStatus: status },
  });
  await audit({
    action: "invoice.status_update",
    entityType: "TherapySession",
    entityId: session.id,
  });

  return NextResponse.json({ ok: true, matched: true });
}
