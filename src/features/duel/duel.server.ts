/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Db } from "@/lib/db/index.server";
import { cairoDay } from "@/lib/gamification";
import type { DuelMode, DuelState, PackScope } from "./types";

// Duel game rules. These used to be plpgsql functions (supabase/duels.sql + competition-modes.sql);
// they now run in TypeScript against D1. Where Postgres relied on `select ... for update`,
// we use guarded UPDATEs / INSERT OR IGNORE so a race cannot double-apply a step.

export class DuelError extends Error {}

const MODES: DuelMode[] = ["points", "speed", "penalties"];
const SCOPES: PackScope[] = ["subject", "unit", "lesson"];

type DuelRow = {
  id: string;
  code: string;
  subject_id: string | null;
  host_id: string;
  guest_id: string | null;
  question_ids: string[];
  status: "waiting" | "active" | "finished" | "cancelled";
  is_open: number;
  current_index: number;
  question_started_at: string | null;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  last_seen: string;
  created_at: string;
  mode: DuelMode;
  pack_scope: PackScope;
  pack_id: string | null;
};

const iso = (ms: number) => new Date(ms).toISOString();

async function loadDuel(db: Db, id: string): Promise<DuelRow | null> {
  const row = await db.prepare("SELECT * FROM duels WHERE id = ?").bind(id).first<any>();
  if (!row) return null;
  return { ...row, question_ids: JSON.parse(row.question_ids) as string[] };
}

/** Midnight (Cairo) of the current Cairo day, as an ISO instant. */
export function cairoMidnightIso(now = new Date()): string {
  const day = cairoDay(now);
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    return (
      Date.UTC(
        +p["year"]!,
        +p["month"]! - 1,
        +p["day"]!,
        +p["hour"]!,
        +p["minute"]!,
        +p["second"]!,
      ) -
      Math.floor(t / 1000) * 1000
    );
  };
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  let t = utcMidnight - offsetAt(utcMidnight);
  t = utcMidnight - offsetAt(t);
  return iso(t);
}

/** Random questions from a pack: the whole subject, one unit, or one lesson. */
export async function pickPackQuestions(
  db: Db,
  subjectId: string | null,
  scope: PackScope,
  packId: string | null,
  count: number,
): Promise<string[]> {
  const where =
    scope === "lesson"
      ? "l.id = ?"
      : scope === "unit"
        ? "u.id = ?"
        : "(? IS NULL OR co.subject_id = ?)";
  const binds: unknown[] =
    scope === "lesson" || scope === "unit" ? [packId] : [subjectId, subjectId];
  const { results } = await db
    .prepare(
      `SELECT q.id AS id FROM questions q
         JOIN concepts cn ON cn.id = q.concept_id
         JOIN lessons l ON l.id = cn.lesson_id
         JOIN units u ON u.id = l.unit_id
         JOIN courses co ON co.id = u.course_id
        WHERE ${where}
        ORDER BY RANDOM() LIMIT ?`,
    )
    .bind(...binds, count)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

function randomCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function duelCreate(
  db: Db,
  userId: string,
  subjectId: string | null,
  open: boolean,
  mode: DuelMode,
  scope: PackScope,
  packId: string | null,
): Promise<string> {
  if (!MODES.includes(mode)) throw new DuelError("وضع غير معروف.");
  if (!SCOPES.includes(scope)) throw new DuelError("باك غير معروف.");
  const count = mode === "speed" ? 5 : mode === "points" ? 7 : 8;
  const min = mode === "speed" ? 5 : mode === "points" ? 7 : 5;

  await db
    .prepare("UPDATE duels SET status = 'cancelled' WHERE host_id = ? AND status = 'waiting'")
    .bind(userId)
    .run();

  const ids = await pickPackQuestions(db, subjectId, scope, packId, count);
  if (ids.length < min)
    throw new DuelError(
      `الباك المختار لا يحتوي أسئلة كافية لهذا الوضع (يلزم ${min} أسئلة على الأقل).`,
    );

  const id = crypto.randomUUID();
  for (let tries = 0; ; tries++) {
    try {
      await db
        .prepare(
          `INSERT INTO duels (id, code, subject_id, host_id, question_ids, is_open, mode, pack_scope, pack_id, last_seen, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          randomCode(),
          subjectId,
          userId,
          JSON.stringify(ids),
          open ? 1 : 0,
          mode,
          scope,
          packId,
          iso(Date.now()),
          iso(Date.now()),
        )
        .run();
      return id;
    } catch (e) {
      // code collision (UNIQUE) → retry with a new code
      if (tries >= 10) throw new DuelError("تعذّر إنشاء الكود، أعد المحاولة.");
      if (
        !String((e as Error)?.message)
          .toLowerCase()
          .includes("unique")
      )
        throw e;
    }
  }
}

async function activate(db: Db, duelId: string, guestId: string): Promise<boolean> {
  const { meta } = await db
    .prepare(
      `UPDATE duels SET guest_id = ?, status = 'active', is_open = 0,
              current_index = 0, question_started_at = ?
        WHERE id = ? AND status = 'waiting' AND guest_id IS NULL`,
    )
    .bind(guestId, iso(Date.now() + 4000), duelId)
    .run();
  return meta.changes === 1;
}

export async function duelJoin(db: Db, userId: string, code: string): Promise<string> {
  const row = await db
    .prepare("SELECT id, host_id, status, created_at FROM duels WHERE code = ?")
    .bind(code.trim().toUpperCase())
    .first<{ id: string; host_id: string; status: string; created_at: string }>();
  if (!row) throw new DuelError("الكود غير صحيح.");
  if (row.host_id === userId) throw new DuelError("لا يمكنك الانضمام إلى تحدٍّ أنشأته أنت.");
  const unavailable = () => new DuelError("هذا التحدي لم يعد متاحًا.");
  if (row.status !== "waiting" || Date.parse(row.created_at) < Date.now() - 15 * 60_000)
    throw unavailable();
  if (!(await activate(db, row.id, userId))) throw unavailable();
  return row.id;
}

export async function duelQuickMatch(
  db: Db,
  userId: string,
  subjectId: string | null,
  mode: DuelMode,
  scope: PackScope,
  packId: string | null,
): Promise<string> {
  await db
    .prepare("UPDATE duels SET status = 'cancelled' WHERE host_id = ? AND status = 'waiting'")
    .bind(userId)
    .run();
  for (let attempt = 0; attempt < 3; attempt++) {
    const cand = await db
      .prepare(
        `SELECT id FROM duels
          WHERE status = 'waiting' AND is_open = 1 AND host_id <> ?
            AND last_seen > ? AND subject_id IS ?
            AND mode = ? AND pack_scope = ? AND pack_id IS ?
          ORDER BY created_at LIMIT 1`,
      )
      .bind(userId, iso(Date.now() - 8000), subjectId, mode, scope, packId)
      .first<{ id: string }>();
    if (!cand) break;
    if (await activate(db, cand.id, userId)) return cand.id;
  }
  return duelCreate(db, userId, subjectId, true, mode, scope, packId);
}

/** Ends the duel, decides the winner and grants XP (max 5 rewarded duels per student per Cairo day). */
export async function duelFinish(db: Db, duelId: string): Promise<void> {
  const d = await loadDuel(db, duelId);
  if (!d || d.status === "finished") return;
  const total = d.question_ids.length;
  let winner: string | null;
  let hostScore = d.host_score;
  let guestScore = d.guest_score;

  if (d.mode === "speed") {
    const adjusted = async (uid: string | null) => {
      const r = await db
        .prepare(
          `SELECT COALESCE(MAX(ms_taken), 0) AS mx, COALESCE(SUM(is_correct), 0) AS ok
             FROM duel_answers WHERE duel_id = ? AND user_id = ?`,
        )
        .bind(duelId, uid ?? "")
        .first<{ mx: number; ok: number }>();
      return (r?.mx ?? 0) + 5000 * (total - (r?.ok ?? 0));
    };
    hostScore = await adjusted(d.host_id);
    guestScore = await adjusted(d.guest_id);
    winner = hostScore < guestScore ? d.host_id : guestScore < hostScore ? d.guest_id : null;
  } else {
    winner =
      d.host_score > d.guest_score ? d.host_id : d.guest_score > d.host_score ? d.guest_id : null;
  }

  // Claim the transition; a concurrent finisher gets changes = 0 and must not pay XP twice.
  const { meta } = await db
    .prepare(
      `UPDATE duels SET host_score = ?, guest_score = ?, status = 'finished',
              finished_at = ?, winner_id = ?
        WHERE id = ? AND status <> 'finished'`,
    )
    .bind(hostScore, guestScore, iso(Date.now()), winner, duelId)
    .run();
  if (meta.changes !== 1) return;

  const anyCorrect = await db
    .prepare("SELECT 1 AS x FROM duel_answers WHERE duel_id = ? AND is_correct = 1 LIMIT 1")
    .bind(duelId)
    .first();
  if (!anyCorrect) return;
  const today = cairoMidnightIso();
  for (const uid of [d.host_id, d.guest_id]) {
    if (!uid) continue;
    const c = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM xp_transactions WHERE user_id = ? AND reason = 'duel' AND created_at >= ?",
      )
      .bind(uid, today)
      .first<{ n: number }>();
    if ((c?.n ?? 0) < 5) {
      const amount = winner === null ? 25 : winner === uid ? 40 : 15;
      await db
        .prepare(
          "INSERT INTO xp_transactions (id, user_id, amount, reason, ref_id, created_at) VALUES (?, ?, ?, 'duel', ?, ?)",
        )
        .bind(crypto.randomUUID(), uid, amount, duelId, iso(Date.now()))
        .run();
    }
  }
}

/** Synchronous modes (points, penalties): advance once both players answered the current question. */
export async function duelResolve(db: Db, duelId: string): Promise<void> {
  const d = await loadDuel(db, duelId);
  if (!d || d.status !== "active" || d.mode === "speed") return;
  const n = await db
    .prepare("SELECT COUNT(*) AS n FROM duel_answers WHERE duel_id = ? AND question_index = ?")
    .bind(duelId, d.current_index)
    .first<{ n: number }>();
  if ((n?.n ?? 0) < 2) return;

  const total = d.question_ids.length;
  const finish =
    d.mode === "points"
      ? d.current_index >= total - 1
      : // Penalties: five kicks, then sudden death if tied (up to three extra kicks).
        d.current_index >= total - 1 || (d.current_index >= 4 && d.host_score !== d.guest_score);
  if (finish) {
    await duelFinish(db, duelId);
  } else {
    // Guarded on the index we read, so two racing resolvers advance only one step.
    await db
      .prepare(
        `UPDATE duels SET current_index = current_index + 1, question_started_at = ?
          WHERE id = ? AND current_index = ? AND status = 'active'`,
      )
      .bind(iso(Date.now() + 3000), duelId, d.current_index)
      .run();
  }
}

export async function duelSubmit(
  db: Db,
  userId: string,
  duelId: string,
  optionId: string,
): Promise<void> {
  const d = await loadDuel(db, duelId);
  if (!d || d.status !== "active") throw new DuelError("التحدي غير نشط.");
  if (userId !== d.host_id && userId !== d.guest_id)
    throw new DuelError("أنت لست طرفًا في هذا التحدي.");
  const startedAt = d.question_started_at ? Date.parse(d.question_started_at) : 0;
  const now = Date.now();
  if (now < startedAt) throw new DuelError("السؤال لم يبدأ بعد.");
  const total = d.question_ids.length;

  const isCorrectFor = async (questionId: string) => {
    const o = await db
      .prepare("SELECT is_correct FROM question_options WHERE id = ? AND question_id = ?")
      .bind(optionId, questionId)
      .first<{ is_correct: number }>();
    if (!o) throw new DuelError("إجابة غير صالحة.");
    return o.is_correct === 1;
  };
  const insertAnswer = (idx: number, qid: string, correct: boolean, ms: number, points: number) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO duel_answers
           (duel_id, user_id, question_index, question_id, option_id, is_correct, ms_taken, points, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(duelId, userId, idx, qid, optionId, correct ? 1 : 0, ms, points, iso(now))
      .run();

  if (d.mode === "speed") {
    // Everyone advances at their own pace: the next question index is the answer count.
    const c = await db
      .prepare("SELECT COUNT(*) AS n FROM duel_answers WHERE duel_id = ? AND user_id = ?")
      .bind(duelId, userId)
      .first<{ n: number }>();
    const idx = c?.n ?? 0;
    if (idx >= total) return;
    const qid = d.question_ids[idx]!;
    const correct = await isCorrectFor(qid);
    const ms = Math.floor(now - startedAt);
    if (ms > 151_000) throw new DuelError("انتهى وقت التحدي.");
    await insertAnswer(idx, qid, correct, Math.min(ms, 150_000), correct ? 1 : 0);
    const all = await db
      .prepare("SELECT COUNT(*) AS n FROM duel_answers WHERE duel_id = ?")
      .bind(duelId)
      .first<{ n: number }>();
    if ((all?.n ?? 0) >= total * 2) await duelFinish(db, duelId);
    return;
  }

  const idx = d.current_index;
  const already = await db
    .prepare(
      "SELECT 1 AS x FROM duel_answers WHERE duel_id = ? AND user_id = ? AND question_index = ?",
    )
    .bind(duelId, userId, idx)
    .first();
  if (already) return;
  const limit = d.mode === "penalties" ? 15 : 20;
  const qid = d.question_ids[idx]!;
  let correct = await isCorrectFor(qid);
  const secs = (now - startedAt) / 1000;
  const ms = Math.min(limit * 1000, Math.floor(secs * 1000));
  if (secs > limit + 1) correct = false;
  let points = 0;
  if (correct) points = d.mode === "penalties" ? 1 : 100 + Math.floor((50 * (20000 - ms)) / 20000);

  const ins = await insertAnswer(idx, qid, correct, ms, points);
  if (ins.meta.changes !== 1) return; // lost a double-submit race; score already counted
  const col = userId === d.host_id ? "host_score" : "guest_score";
  await db.prepare(`UPDATE duels SET ${col} = ${col} + ? WHERE id = ?`).bind(points, duelId).run();
  await duelResolve(db, duelId);
}

/** Called on every state poll: closes timed-out questions and cleans up abandoned duels. */
export async function duelTick(db: Db, duelId: string): Promise<void> {
  const d = await loadDuel(db, duelId);
  if (!d) return;
  const now = Date.now();

  if (d.status === "waiting") {
    if (Date.parse(d.created_at) < now - 15 * 60_000)
      await db.prepare("UPDATE duels SET status = 'cancelled' WHERE id = ?").bind(duelId).run();
    else
      await db.prepare("UPDATE duels SET last_seen = ? WHERE id = ?").bind(iso(now), duelId).run();
    return;
  }
  if (d.status !== "active" || !d.question_started_at || !d.guest_id) return;
  const startedAt = Date.parse(d.question_started_at);
  const total = d.question_ids.length;
  const fill = (uid: string, idx: number, ms: number) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO duel_answers
           (duel_id, user_id, question_index, question_id, option_id, is_correct, ms_taken, points, created_at)
         VALUES (?, ?, ?, ?, NULL, 0, ?, 0, ?)`,
      )
      .bind(duelId, uid, idx, d.question_ids[idx]!, ms, iso(now));

  if (d.mode === "speed") {
    // Overall time is up: whatever is unanswered counts as wrong.
    if (now < startedAt + 150_500) return;
    const stmts = [];
    for (const uid of [d.host_id, d.guest_id])
      for (let i = 0; i < total; i++) stmts.push(fill(uid, i, 150_000));
    await db.batch(stmts);
    await duelFinish(db, duelId);
    return;
  }

  const limitMs = d.mode === "penalties" ? 15_000 : 20_000;
  if (now < startedAt + limitMs + 500) return;
  await db.batch([d.host_id, d.guest_id].map((uid) => fill(uid, d.current_index, limitMs)));
  await duelResolve(db, duelId);
}

/** The duel as one student sees it. Never reveals the correct answer of the running question. */
export async function duelState(db: Db, userId: string, duelId: string): Promise<DuelState> {
  const d = await loadDuel(db, duelId);
  if (!d || (userId !== d.host_id && userId !== d.guest_id))
    throw new DuelError("تحدٍّ غير موجود.");
  const total = d.question_ids.length;
  const finished = d.status === "finished";
  const opp = userId === d.host_id ? d.guest_id : d.host_id;

  const countAnswers = async (uid: string | null) =>
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM duel_answers WHERE duel_id = ? AND user_id = ?")
        .bind(duelId, uid ?? "")
        .first<{ n: number }>()
    )?.n ?? 0;
  const answeredAt = async (uid: string | null, idx: number) =>
    !!(await db
      .prepare(
        "SELECT 1 AS x FROM duel_answers WHERE duel_id = ? AND user_id = ? AND question_index = ?",
      )
      .bind(duelId, uid ?? "", idx)
      .first());
  const answerAt = async (uid: string | null, idx: number) => {
    const a = await db
      .prepare(
        "SELECT is_correct, points FROM duel_answers WHERE duel_id = ? AND user_id = ? AND question_index = ?",
      )
      .bind(duelId, uid ?? "", idx)
      .first<{ is_correct: number; points: number }>();
    return a ? { is_correct: a.is_correct === 1, points: a.points } : null;
  };

  let myIdx: number;
  let oppIdx: number;
  if (d.mode === "speed") {
    myIdx = await countAnswers(userId);
    oppIdx = await countAnswers(opp);
  } else {
    myIdx = d.current_index;
    oppIdx = 0;
  }

  const questionPayload = async (qid: string, withOptions: boolean) => {
    const q = await db
      .prepare("SELECT id, prompt_ar, explanation_ar FROM questions WHERE id = ?")
      .bind(qid)
      .first<{ id: string; prompt_ar: string; explanation_ar: string | null }>();
    const { results } = withOptions
      ? await db
          .prepare(
            "SELECT id, label_ar, is_correct FROM question_options WHERE question_id = ? ORDER BY sort_order",
          )
          .bind(qid)
          .all<{ id: string; label_ar: string; is_correct: number }>()
      : { results: [] as { id: string; label_ar: string; is_correct: number }[] };
    return { q, options: results };
  };

  let question: DuelState["question"] = null;
  if (d.status === "active" && myIdx < total) {
    const { q, options } = await questionPayload(d.question_ids[myIdx]!, true);
    if (q)
      question = {
        id: q.id,
        prompt: q.prompt_ar,
        options: options.map((o) => ({ id: o.id, label: o.label_ar })),
      };
  }

  const prevIdx =
    finished && d.mode === "speed"
      ? total - 1
      : finished
        ? d.current_index
        : d.status === "active" && myIdx > 0
          ? myIdx - 1
          : null;
  let prev: DuelState["prev"] = null;
  if (prevIdx !== null) {
    const { q, options } = await questionPayload(d.question_ids[prevIdx]!, true);
    prev = {
      index: prevIdx,
      correct_label: options.find((o) => o.is_correct === 1)?.label_ar ?? "",
      explanation: q?.explanation_ar ?? null,
      mine: await answerAt(userId, prevIdx),
      theirs: d.mode === "speed" ? null : await answerAt(opp, prevIdx),
    };
  }

  const resolved = finished ? d.current_index + 1 : d.current_index;
  const kicks = async (uid: string | null) => {
    if (d.mode !== "penalties") return [] as boolean[];
    const { results } = await db
      .prepare(
        `SELECT is_correct FROM duel_answers WHERE duel_id = ? AND user_id = ? AND question_index < ?
          ORDER BY question_index`,
      )
      .bind(duelId, uid ?? "", resolved)
      .all<{ is_correct: number }>();
    return results.map((r) => r.is_correct === 1);
  };
  const oppName = opp
    ? ((
        await db
          .prepare("SELECT display_name FROM profiles WHERE id = ?")
          .bind(opp)
          .first<{ display_name: string }>()
      )?.display_name ?? "منافس")
    : null;
  const myWrong =
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS n FROM duel_answers WHERE duel_id = ? AND user_id = ? AND is_correct = 0",
        )
        .bind(duelId, userId)
        .first<{ n: number }>()
    )?.n ?? 0;
  const xp =
    (
      await db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) AS s FROM xp_transactions WHERE ref_id = ? AND user_id = ? AND reason = 'duel'",
        )
        .bind(d.id, userId)
        .first<{ s: number }>()
    )?.s ?? 0;
  const hideScores = d.mode === "speed" && !finished;
  const mine = userId === d.host_id;

  return {
    id: d.id,
    code: d.code,
    status: d.status,
    mode: d.mode,
    total: d.mode === "penalties" ? Math.min(5, total) : total,
    sudden_death: d.mode === "penalties" && d.current_index >= 5,
    index: myIdx,
    started_at: d.question_started_at ? Date.parse(d.question_started_at) : null,
    server_now: Date.now(),
    time_limit: d.mode === "speed" ? 150 : d.mode === "penalties" ? 15 : 20,
    my_score: hideScores ? 0 : mine ? d.host_score : d.guest_score,
    opp_score: hideScores ? 0 : mine ? d.guest_score : d.host_score,
    opp_name: oppName,
    me_answered: d.mode === "speed" ? myIdx >= total : await answeredAt(userId, d.current_index),
    opp_answered: d.mode === "speed" ? oppIdx >= total : await answeredAt(opp, d.current_index),
    my_wrong: myWrong,
    opp_count: oppIdx,
    my_kicks: await kicks(userId),
    opp_kicks: await kicks(opp),
    question,
    prev,
    winner: d.winner_id === null ? null : d.winner_id === userId ? "me" : "opp",
    xp,
  };
}
