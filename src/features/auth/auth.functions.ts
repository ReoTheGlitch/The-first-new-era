import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";

// Account endpoints. Responses never include secrets: only `{ userId }` or `{ error }`.

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(200);

const signUpInput = z.object({
  email,
  password,
  name: z.string().trim().min(2).max(20).optional(),
});
const signInInput = z.object({ email, password: z.string().min(1).max(200) });

type AuthResult = { userId: string } | { error: string; retryAfterSec?: number };

const HOUR_MS = 3_600_000;
const QUARTER_MS = 900_000;

/** Run limiters in order; on the first block, set Retry-After and return the error result. */
async function rateLimit(
  checks: Array<[scope: string, key: string, limit: number, windowMs: number]>,
): Promise<{ error: "too_many_requests"; retryAfterSec: number } | null> {
  const { getDb } = await import("@/lib/db/index.server");
  const { checkAndIncrement } = await import("@/lib/security/rate-limit.server");
  const db = getDb();
  let worst: number | null = null;
  for (const [scope, key, limit, windowMs] of checks) {
    const r = await checkAndIncrement(db, scope, key, limit, windowMs);
    if (!r.allowed) worst = Math.max(worst ?? 0, r.retryAfterSec);
  }
  if (worst === null) return null;
  setResponseHeader("Retry-After", String(worst));
  return { error: "too_many_requests", retryAfterSec: worst };
}

async function requestIp(): Promise<string> {
  const { clientIp } = await import("@/lib/security/rate-limit.server");
  return clientIp(getRequest().headers);
}

async function startSession(userId: string): Promise<void> {
  const { getDb } = await import("@/lib/db/index.server");
  const { createSession, setSessionCookie, cookieOptsFor } =
    await import("@/lib/auth/session.server");
  const session = await createSession(getDb(), userId);
  const headers = new Headers();
  setSessionCookie(headers, session.id, session.expiresAt, cookieOptsFor(getRequest()));
  setResponseHeader("Set-Cookie", headers.getSetCookie());
}

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signUpInput.parse(d))
  .handler(async ({ data }): Promise<AuthResult> => {
    const { getDb } = await import("@/lib/db/index.server");
    const { hashPassword } = await import("@/lib/auth/password.server");
    const ip = await requestIp();
    const limited = await rateLimit([["auth.signup", ip, 5, HOUR_MS]]);
    if (limited) return limited;
    const db = getDb();
    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(data.email)
      .first();
    if (existing) return { error: "هذا البريد مسجّل بالفعل" };
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const hash = await hashPassword(data.password);
    try {
      // Replaces the legacy on_auth_user_created trigger.
      await db.batch([
        db
          .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
          .bind(userId, data.email, hash, now),
        db
          .prepare(
            "INSERT INTO profiles (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
          )
          .bind(userId, (data.name ?? "طالب").slice(0, 20), now, now),
        db
          .prepare("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'user')")
          .bind(crypto.randomUUID(), userId),
        db
          .prepare("INSERT INTO learning_preferences (user_id, updated_at) VALUES (?, ?)")
          .bind(userId, now),
        db.prepare("INSERT INTO streaks (user_id, updated_at) VALUES (?, ?)").bind(userId, now),
      ]);
    } catch {
      // Unique-email race or any DB failure: do not leak details.
      return { error: "تعذّر إنشاء الحساب. حاول مرة أخرى." };
    }
    await startSession(userId);
    return { userId };
  });

// Verified against this when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = "AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signInInput.parse(d))
  .handler(async ({ data }): Promise<AuthResult> => {
    const { getDb } = await import("@/lib/db/index.server");
    const { verifyPassword } = await import("@/lib/auth/password.server");
    const ip = await requestIp();
    const limited = await rateLimit([
      ["auth.signin.ip", ip, 10, QUARTER_MS],
      ["auth.signin.ip_email", `${ip}|${data.email}`, 5, QUARTER_MS],
    ]);
    if (limited) return limited;
    const user = await getDb()
      .prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .bind(data.email)
      .first<{ id: string; password_hash: string }>();
    const ok = await verifyPassword(data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) return { error: "بيانات الدخول غير صحيحة" };
    await startSession(user.id);
    return { userId: user.id };
  });

export const signOut = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { getDb } = await import("@/lib/db/index.server");
    const { clearSessionCookie, deleteSession, getSessionCookie, cookieOptsFor } =
      await import("@/lib/auth/session.server");
    const request = getRequest();
    const token = getSessionCookie(request);
    if (token) await deleteSession(getDb(), token);
    const headers = new Headers();
    clearSessionCookie(headers, cookieOptsFor(request));
    setResponseHeader("Set-Cookie", headers.getSetCookie());
    return { ok: true };
  },
);

/** The signed-in user, or a 401 (thrown by requireAuth). Used by the route auth guard. */
export const me = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return { userId: context.userId as string };
  });

const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});

/** Logged-in-only. Rotates the password and signs out every other session. */
export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => changePasswordInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth/password.server");
    const { getSessionCookie, deleteOtherSessions } = await import("@/lib/auth/session.server");
    const db = context.db as import("@/lib/db/index.server").Db;
    const userId = context.userId as string;
    const row = await db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(userId)
      .first<{ password_hash: string }>();
    if (!row || !(await verifyPassword(data.currentPassword, row.password_hash)))
      return { error: "كلمة المرور الحالية غير صحيحة" };
    const hash = await hashPassword(data.newPassword);
    const token = getSessionCookie(getRequest());
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, userId).run();
    if (token) await deleteOtherSessions(db, userId, token);
    return { ok: true };
  });
