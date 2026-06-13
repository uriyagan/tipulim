import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, createCipheriv } from "node:crypto";

// Seed a demo therapist with a couple of patients and sessions so the app is
// usable immediately after setup. Safe to re-run (idempotent on the user).

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL ?? "therapist@example.com";
const PASSWORD = process.env.SEED_PASSWORD ?? "Passw0rd!";

// Inline AES-256-GCM encrypt (mirrors src/lib/crypto.ts) so the seed does not
// import the app's TS module.
function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32).");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const therapist = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      email: EMAIL,
      passwordHash,
      fullName: "ד״ר דמו",
      role: "THERAPIST",
    },
  });

  const existing = await prisma.patient.count({
    where: { therapistId: therapist.id },
  });
  if (existing > 0) {
    console.log(`Seed: therapist ${EMAIL} already has patients, skipping demo data.`);
    return;
  }

  const patient = await prisma.patient.create({
    data: {
      firstName: "ישראל",
      lastName: "ישראלי",
      fullName: "ישראל ישראלי",
      phoneEnc: encrypt("050-1234567"),
      emailEnc: encrypt("israel@example.com"),
      therapistId: therapist.id,
    },
  });

  const now = new Date();
  await prisma.therapySession.create({
    data: {
      patientId: patient.id,
      therapistId: therapist.id,
      sessionDate: new Date(now.getTime() + 24 * 3600 * 1000),
      sessionNumber: 1,
      status: "SCHEDULED",
      tags: ["התחלה"],
    },
  });

  console.log("Seed complete.");
  console.log(`  Login: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
