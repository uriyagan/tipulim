/**
 * Encrypted database backup (PRD §17).
 *
 * Runs `pg_dump` on DATABASE_URL, encrypts the dump with AES-256-GCM, writes it
 * to the backups directory, and prunes backups older than the retention window.
 *
 * Usage:  tsx scripts/backup.ts   (or `npm run backup`)
 * Schedule daily via cron, e.g.:  0 3 * * *  cd /app && npm run backup
 *
 * Env:
 *   DATABASE_URL              Postgres connection string
 *   BACKUP_ENCRYPTION_KEY     base64 32-byte key (falls back to ENCRYPTION_KEY)
 *   BACKUP_DIR                output dir (default: ./backups)
 *   BACKUP_RETENTION_DAYS     default: 30
 */
import "./load-env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdir, writeFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

function getKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY ?? process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("Set BACKUP_ENCRYPTION_KEY or ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Backup key must decode to 32 bytes");
  return key;
}

// libpq tools reject Prisma-only params like `schema`; strip them.
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

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const dir = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 30);
  await mkdir(dir, { recursive: true });

  // 1. Dump (plain SQL, captured to memory).
  const { stdout } = await execFileAsync("pg_dump", [libpqUrl(url), "--no-owner", "--no-privileges"], {
    maxBuffer: 1024 * 1024 * 512,
    encoding: "buffer",
  });

  // 2. Encrypt: [iv(12)][tag(16)][ciphertext]
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(stdout), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `tipulim-${stamp}.sql.enc`);
  await writeFile(file, payload);
  console.log(`Backup written: ${file} (${(payload.length / 1024).toFixed(1)} KB)`);

  // 3. Prune old backups beyond the retention window.
  const cutoff = Date.now() - retentionDays * 24 * 3600 * 1000;
  const entries = await readdir(dir);
  let pruned = 0;
  for (const name of entries) {
    if (!name.endsWith(".sql.enc")) continue;
    const p = path.join(dir, name);
    const s = await stat(p);
    if (s.mtimeMs < cutoff) {
      await unlink(p);
      pruned++;
    }
  }
  if (pruned) console.log(`Pruned ${pruned} backup(s) older than ${retentionDays} days.`);
}

main().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
