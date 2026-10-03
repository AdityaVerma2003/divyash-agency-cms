import crypto from "node:crypto";

/**
 * AES-256-GCM for at-rest secrets (currently client website admin
 * credentials). Format: base64(iv):base64(authTag):base64(ciphertext).
 *
 * The key lives in CREDENTIALS_ENCRYPTION_KEY (32 bytes, base64). Rotating it
 * requires re-encrypting every stored value — there is no key-id envelope.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY is not set — cannot read or write stored credentials"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored credential is malformed");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when the encryption key is configured, so routes can 503 rather than crash. */
export function encryptionAvailable(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
