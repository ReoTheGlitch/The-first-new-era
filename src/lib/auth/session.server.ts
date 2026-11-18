import type { Db } from "@/lib/db/index.server";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sessions are stored by SHA-256 of the token, so a DB leak does not leak usable cookies. */
async function tokenId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

/** Creates a session. `id` is the opaque token to put in the cookie (256 random bits). */
export async function createSession(
  db: Db,
  userId: string,
): Promise<{ id: string; expiresAt: string }> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await tokenId(token), userId, expiresAt, new Date().toISOString())
    .run();
  return { id: token, expiresAt };
}

export async function readSession(db: Db, token: string): Promise<{ userId: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await db
    .prepare(
      `SELECT s.user_id AS user_id, s.expires_at AS expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`,
    )
    .bind(await tokenId(token))
    .first<{ user_id: string; expires_at: string }>();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return { userId: row.user_id };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE id = ?")
    .bind(await tokenId(token))
    .run();
}

/** Drops every session of a user except the one identified by `keepToken`. */
export async function deleteOtherSessions(
  db: Db,
  userId: string,
  keepToken: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?")
    .bind(userId, await tokenId(keepToken))
    .run();
}

export function setSessionCookie(
  headers: Headers,
  token: string,
  expires: string | Date,
  opts: { secure?: boolean } = {},
): void {
  const exp = typeof expires === "string" ? new Date(expires) : expires;
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    ...(opts.secure === false ? [] : ["Secure"]),
    "SameSite=Lax",
    "Path=/",
    `Expires=${exp.toUTCString()}`,
  ];
  headers.append("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(headers: Headers, opts: { secure?: boolean } = {}): void {
  setSessionCookie(headers, "", new Date(0), opts);
}

export function getSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) {
      const value = part.slice(idx + 1).trim();
      return value || null;
    }
  }
  return null;
}

/** Secure cookies break plain-http localhost in some browsers (Safari), so skip it there only. */
export function cookieOptsFor(request: Request): { secure: boolean } {
  const url = new URL(request.url);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return { secure: !(url.protocol === "http:" && local) };
}
