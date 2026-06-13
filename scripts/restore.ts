/**
 * Restore an encrypted database backup (PRD §17).
 *
 * Usage:  tsx scripts/restore.ts <path-to-.sql.enc>   (or `npm run restore -- <file>`)
 *
 * WARNING: applies the dump to DATABASE_URL via psql. Run against the intended
 * (e.g. freshly created) database.
 */
import "./load-env";
import { spawn } from "node:child_process";
import { createDecipheriv } from "node:crypto";
import { readFile } from "node:fs/promises";

function getKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY ?? process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("Set BACKUP_ENCRYPTION_KEY or ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Backup key must decode to 32 bytes");
  return key;
}

function libpqUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("schema");
    u.searchParams.delete("connection_limit");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url;
  }
}

async function decryptFile(file: string): Promise<Buffer> {
  const data = await readFile(file);
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/restore.ts <file.sql.enc>");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = await decryptFile(file);
  console.log(`Decrypted ${file} (${(sql.length / 1024).toFixed(1)} KB). Restoring…`);

  await new Promise<void>((resolve, reject) => {
    const psql = spawn("psql", [libpqUrl(url)], { stdio: ["pipe", "inherit", "inherit"] });
    psql.on("error", reject);
    psql.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`psql exited ${code}`)),
    );
    psql.stdin.write(sql);
    psql.stdin.end();
  });

  console.log("Restore complete.");
}

main().catch((e) => {
  console.error("Restore failed:", e);
  process.exit(1);
});
