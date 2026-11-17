// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { resetNodeDbForTests, type Db } from "@/lib/db/index.server";
import { hashPassword, verifyPassword } from "@/lib/auth/password.server";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionCookie,
  readSession,
  setSessionCookie,
} from "@/lib/auth/session.server";

let db: Db;
beforeAll(() => {
  db = resetNodeDbForTests(":memory:");
});

async function addUser(email: string) {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
    .bind(id, email, await hashPassword("correct horse"))
    .run();
  return id;
}

describe("db adapter", () => {
  it("applies every migration and seeds content", async () => {
    const tables = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .bind()
      .all<{ name: string }>();
    expect(tables.results.length).toBeGreaterThanOrEqual(25);
    const applied = await db
      .prepare("SELECT COUNT(*) AS n FROM _migrations")
      .bind()
      .first<{ n: number }>();
    expect(applied!.n).toBeGreaterThanOrEqual(8);
    const subjects = await db.prepare("SELECT slug FROM subjects ORDER BY sort_order").bind().all();
    expect(subjects.results).toEqual([{ slug: "physics" }, { slug: "chemistry" }]);
  });

  it("rejects undefined/boolean binds like D1", () => {
    expect(() => db.prepare("SELECT ?").bind(undefined)).toThrow();
    expect(() => db.prepare("SELECT ?").bind(true)).toThrow();
  });
});

describe("password hashing", () => {
  it("round-trips and rejects wrong passwords", async () => {
    const stored = await hashPassword("s3cret-pass");
    expect(stored).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("s3cret-pass", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});

describe("sign up -> sign in -> sign out cycle", () => {
  it("creates, reads and deletes a session", async () => {
    const userId = await addUser("cycle@example.com");
    const user = await db
      .prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .bind("cycle@example.com")
      .first<{ id: string; password_hash: string }>();
    expect(await verifyPassword("correct horse", user!.password_hash)).toBe(true);

    const session = await createSession(db, userId);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
    expect(await readSession(db, session.id)).toEqual({ userId });

    // the DB never stores the raw cookie token
    const raw = await db.prepare("SELECT id FROM sessions WHERE id = ?").bind(session.id).first();
    expect(raw).toBeNull();

    await deleteSession(db, session.id);
    expect(await readSession(db, session.id)).toBeNull();
  });

  it("ignores expired sessions and unknown tokens", async () => {
    const userId = await addUser("expired@example.com");
    const s = await createSession(db, userId);
    await db
      .prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?")
      .bind(new Date(Date.now() - 1000).toISOString(), userId)
      .run();
    expect(await readSession(db, s.id)).toBeNull();
    expect(await readSession(db, "0".repeat(64))).toBeNull();
    expect(await readSession(db, "not-a-token")).toBeNull();
  });

  it("deleting a user cascades to sessions; emails are unique", async () => {
    const userId = await addUser("cascade@example.com");
    await createSession(db, userId);
    await expect(addUser("cascade@example.com")).rejects.toThrow();
    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    const left = await db
      .prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?")
      .bind(userId)
      .first<{ n: number }>();
    expect(left!.n).toBe(0);
  });
});

describe("session cookie", () => {
  it("sets HttpOnly/Secure/SameSite=Lax and reads back", () => {
    const h = new Headers();
    setSessionCookie(h, "abc", new Date("2030-01-01T00:00:00Z"));
    const c = h.get("set-cookie")!;
    expect(c).toContain("session=abc");
    for (const part of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Expires="])
      expect(c).toContain(part);
    const req = new Request("https://x.test", { headers: { cookie: "a=1; session=abc; b=2" } });
    expect(getSessionCookie(req)).toBe("abc");
    expect(getSessionCookie(new Request("https://x.test"))).toBeNull();
    const out = new Headers();
    clearSessionCookie(out);
    expect(out.get("set-cookie")).toContain("session=;");
  });
});
