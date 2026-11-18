// PBKDF2-SHA256 password hashing via WebCrypto (works in Cloudflare Workers and Node).
// Workers cap PBKDF2 at 100k iterations, which is what we use.

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(plain: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Constant-time equality. Uses subtle.timingSafeEqual (Workers) when available. */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  const native = (
    crypto.subtle as unknown as { timingSafeEqual?: (a: BufferSource, b: BufferSource) => boolean }
  ).timingSafeEqual;
  if (typeof native === "function")
    return native.call(crypto.subtle, a as BufferSource, b as BufferSource);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Returns "saltB64:hashB64". */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(plain, salt);
  return `${toB64(salt)}:${toB64(hash)}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  try {
    const expected = fromB64(hashB64);
    const actual = await derive(plain, fromB64(saltB64));
    return timingSafeEqualBytes(actual, expected);
  } catch {
    return false;
  }
}
