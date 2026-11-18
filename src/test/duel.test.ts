// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { resetNodeDbForTests, type Db } from "@/lib/db/index.server";
import {
  cairoMidnightIso,
  duelCreate,
  duelJoin,
  duelQuickMatch,
  duelState,
  duelSubmit,
  duelTick,
} from "@/features/duel/duel.server";

let db: Db;
let a: string;
let b: string;

async function user(name: string) {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'x')")
    .bind(id, `${name}@example.com`)
    .run();
  await db.prepare("INSERT INTO profiles (id, display_name) VALUES (?, ?)").bind(id, name).run();
  return id;
}

/** Make the running question start now so answers are accepted (the real game waits 4s). */
async function startNow(duelId: string) {
  await db
    .prepare("UPDATE duels SET question_started_at = ? WHERE id = ?")
    .bind(new Date(Date.now() - 1000).toISOString(), duelId)
    .run();
}

async function correctOption(qid: string) {
  const o = await db
    .prepare("SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1")
    .bind(qid)
    .first<{ id: string }>();
  return o!.id;
}

beforeAll(async () => {
  db = resetNodeDbForTests(":memory:");
  a = await user("alice");
  b = await user("bob");
});

describe("duel rules (ported from plpgsql)", () => {
  it("plays a full points duel and grants XP", async () => {
    const id = await duelCreate(db, a, null, false, "points", "subject", null);
    const waiting = await duelState(db, a, id);
    expect(waiting.status).toBe("waiting");
    expect(waiting.code).toMatch(/^[0-9A-F]{6}$/);

    await expect(duelJoin(db, a, waiting.code)).rejects.toThrow();
    await duelJoin(db, b, waiting.code.toLowerCase());
    for (let i = 0; i < 7; i++) {
      await startNow(id);
      const st = await duelState(db, a, id);
      expect(st.question).not.toBeNull();
      expect(st.index).toBe(i);
      await duelSubmit(db, a, id, await correctOption(st.question!.id));
      const wrong = (await db
        .prepare("SELECT id FROM question_options WHERE question_id = ? AND is_correct = 0 LIMIT 1")
        .bind(st.question!.id)
        .first<{ id: string }>())!.id;
      await duelSubmit(db, b, id, wrong);
    }
    const fin = await duelState(db, a, id);
    expect(fin.status).toBe("finished");
    expect(fin.winner).toBe("me");
    expect(fin.my_score).toBeGreaterThanOrEqual(700);
    expect(fin.opp_score).toBe(0);
    expect(fin.xp).toBe(40);
    expect((await duelState(db, b, id)).xp).toBe(15);
  });

  it("is idempotent: double submit and re-finish do not double count", async () => {
    const id = await duelCreate(db, a, null, false, "penalties", "subject", null);
    const code = (await duelState(db, a, id)).code;
    await duelJoin(db, b, code);
    await startNow(id);
    const st = await duelState(db, a, id);
    const opt = await correctOption(st.question!.id);
    await duelSubmit(db, a, id, opt);
    await duelSubmit(db, a, id, opt);
    expect((await duelState(db, a, id)).my_score).toBe(1);
  });

  it("quick match pairs two players with the same settings", async () => {
    const c = await user("carol");
    const d = await user("dave");
    const first = await duelQuickMatch(db, c, null, "speed", "subject", null);
    expect((await duelState(db, c, first)).status).toBe("waiting");
    const second = await duelQuickMatch(db, d, null, "speed", "subject", null);
    expect(second).toBe(first);
    expect((await duelState(db, d, first)).status).toBe("active");
  });

  it("tick expires waiting duels older than 15 minutes", async () => {
    const e = await user("erin");
    const id = await duelCreate(db, e, null, false, "points", "subject", null);
    await db
      .prepare("UPDATE duels SET created_at = ? WHERE id = ?")
      .bind(new Date(Date.now() - 16 * 60_000).toISOString(), id)
      .run();
    await duelTick(db, id);
    expect((await duelState(db, e, id)).status).toBe("cancelled");
  });

  it("rejects bad packs", async () => {
    await expect(
      duelCreate(db, a, null, false, "points", "lesson", crypto.randomUUID()),
    ).rejects.toThrow(/أسئلة كافية/);
  });

  it("computes Cairo midnight as an ISO instant at 00:00 Cairo time", () => {
    const iso = cairoMidnightIso(new Date("2026-01-15T10:00:00Z"));
    expect(iso).toBe("2026-01-14T22:00:00.000Z");
    expect(cairoMidnightIso(new Date("2026-07-15T10:00:00Z"))).toBe("2026-07-14T21:00:00.000Z");
  });
});
