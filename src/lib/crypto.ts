import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// Field-level encryption for sensitive patient data at rest (PRD §15.4).
// Algorithm: AES-256-GCM. Storage format (base64 of):
//   [12-byte IV][16-byte auth tag][ciphertext]

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Use \`openssl rand -base64 32\`.`,
    );
  }

  cachedKey = key;
  return key;
}

/** Encrypts a plaintext string. Returns base64, or null for empty input. */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Decrypts a value produced by `encrypt`. Returns null for null input. */
export function decrypt(payload: string | null | undefined): string | null {
  if (payload == null || payload === "") return null;

  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Safe decrypt that never throws — returns null on any failure. */
export function tryDecrypt(payload: string | null | undefined): string | null {
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}
