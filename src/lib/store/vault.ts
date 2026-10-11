/**
 * Wachtwoord-login zonder server: de GitHub-sleutel wordt in de browser versleuteld met een
 * sleutel die uit het wachtwoord wordt afgeleid (PBKDF2-SHA256, AES-256-GCM). Alleen de
 * versleutelde versie staat online (public/toegang.json in de app-repository).
 */

export interface Vault {
  v: 1;
  /** PBKDF2-rondes */
  iter: number;
  salt: string;
  iv: string;
  data: string;
  createdAt: string;
}

export const MIN_PASSWORD = 12;
const ITERATIONS = 600_000;

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function lock(secret: string, password: string, iter = ITERATIONS): Promise<Vault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const data = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(secret)),
  );
  return { v: 1, iter, salt: toB64(salt), iv: toB64(iv), data: toB64(data), createdAt: new Date().toISOString() };
}

/** Geeft de sleutel terug, of null bij een verkeerd wachtwoord. */
export async function unlock(vault: Vault, password: string): Promise<string | null> {
  try {
    const key = await deriveKey(password, fromB64(vault.salt), vault.iter);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(vault.iv) as BufferSource },
      key,
      fromB64(vault.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
