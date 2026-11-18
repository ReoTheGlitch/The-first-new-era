/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Db } from "@/lib/db/index.server";

// دوال التحدي المباشر ووضع الشبح. منطق اللعبة في duel.server.ts (يعمل فوق D1)،
// والواجهة تستطلع الحالة بالاستعلام الدوري (polling) بدل الاشتراك اللحظي.

const server = () => import("./duel.server");

async function subjectIdFromSlug(db: Db, slug?: string): Promise<string | null> {
  if (!slug) return null;
  const row = await db
    .prepare("SELECT id FROM subjects WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>();
  return row?.id ?? null;
}

const setup = z.object({
  subject: z.string().max(40).optional(),
  mode: z.enum(["points", "speed", "penalties"]).default("points"),
  scope: z.enum(["subject", "unit", "lesson"]).default("subject"),
  pack: z.string().uuid().nullish(),
});
const duelInput = z.object({ duelId: z.string().uuid() });

async function stateOf(db: Db, userId: string, duelId: string) {
  const { duelTick, duelState } = await server();
  await duelTick(db, duelId);
  return duelState(db, userId, duelId);
}

/** الباكات المتاحة: كل المادة، ثم كل فصل، ثم دروسه، مع عدد الأسئلة. */
export const listPacks = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ subject: z.string().max(40).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const sid = await subjectIdFromSlug(db, data.subject);
    const { results } = await db
      .prepare(
        `SELECT u.id AS unit_id, u.title_ar AS unit_title, u.sort_order AS unit_sort,
                l.id AS lesson_id, l.title_ar AS lesson_title, l.sort_order AS lesson_sort,
                (SELECT COUNT(*) FROM questions q JOIN concepts c ON c.id = q.concept_id
                  WHERE c.lesson_id = l.id) AS cnt
           FROM units u
           JOIN courses co ON co.id = u.course_id
           LEFT JOIN lessons l ON l.unit_id = u.id
          WHERE (? IS NULL OR co.subject_id = ?)
          ORDER BY u.sort_order, l.sort_order`,
      )
      .bind(sid, sid)
      .all<any>();

    const units = new Map<
      string,
      { title: string; lessons: { id: string; title: string; count: number }[] }
    >();
    for (const r of results) {
      const u = units.get(r.unit_id) ?? { title: r.unit_title as string, lessons: [] };
      if (r.lesson_id) u.lessons.push({ id: r.lesson_id, title: r.lesson_title, count: r.cnt });
      units.set(r.unit_id, u);
    }

    const packs: {
      scope: string;
      id: string | null;
      title: string;
      group: string;
      count: number;
    }[] = [];
    let total = 0;
    const rest: typeof packs = [];
    for (const [unitId, u] of units) {
      const lessonPacks = u.lessons.map((l) => ({
        scope: "lesson",
        id: l.id,
        title: l.title,
        group: u.title,
        count: l.count,
      }));
      const unitCount = lessonPacks.reduce((n, l) => n + l.count, 0);
      total += unitCount;
      rest.push(
        {
          scope: "unit",
          id: unitId,
          title: `كل أسئلة هذا الفصل`,
          group: u.title,
          count: unitCount,
        },
        ...lessonPacks,
      );
    }
    packs.push(
      { scope: "subject", id: null, title: "كل أسئلة المادة", group: "الكل", count: total },
      ...rest,
    );
    return packs;
  });

/** إنشاء تحدٍّ جديد ينتظر منافسًا (يُدعى بالكود). */
export const createDuel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => setup.parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const { duelCreate } = await server();
    const id = await duelCreate(
      db,
      context.userId as string,
      await subjectIdFromSlug(db, data.subject),
      false,
      data.mode,
      data.scope,
      data.pack ?? null,
    );
    return stateOf(db, context.userId as string, id);
  });

/** البحث عن منافس: ينضم لتحدٍّ مفتوح بنفس الوضع والباك أو ينشئ واحدًا ينتظر. */
export const quickMatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => setup.parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const { duelQuickMatch } = await server();
    const id = await duelQuickMatch(
      db,
      context.userId as string,
      await subjectIdFromSlug(db, data.subject),
      data.mode,
      data.scope,
      data.pack ?? null,
    );
    return stateOf(db, context.userId as string, id);
  });

export const joinDuel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const { duelJoin } = await server();
    const id = await duelJoin(db, context.userId as string, data.code);
    return stateOf(db, context.userId as string, id);
  });

export const getDuel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => duelInput.parse(d))
  .handler(async ({ data, context }) =>
    stateOf(context.db as Db, context.userId as string, data.duelId),
  );

export const answerDuel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => duelInput.extend({ optionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const { duelSubmit } = await server();
    await duelSubmit(db, context.userId as string, data.duelId, data.optionId);
    return stateOf(db, context.userId as string, data.duelId);
  });

// ---------- وضع الشبح (نموذج أولي) ----------
// منافس محاكى بمستوى دقة محدد (مبتدئ أو محترف أو بطل) يلعب على نفس الباك والوضع. لا يمنح نقاط خبرة.

const ACCURACY = { beginner: 0.5, pro: 0.7, champion: 0.88 } as const;
const GHOST_NAME = { beginner: "شبح مبتدئ", pro: "شبح محترف", champion: "شبح البطل" } as const;
const QUESTION_COUNT = { points: 7, speed: 5, penalties: 5 } as const;

export const startGhost = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    setup.extend({ level: z.enum(["beginner", "pro", "champion"]).default("pro") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const { pickPackQuestions } = await server();
    const subjectId = await subjectIdFromSlug(db, data.subject);
    const count = QUESTION_COUNT[data.mode];
    const ids = await pickPackQuestions(db, subjectId, data.scope, data.pack ?? null, count);
    if (ids.length < count)
      throw new Error(`الباك المختار لا يحتوي أسئلة كافية لهذا الوضع (يلزم ${count}).`);

    const accuracy = ACCURACY[data.level];
    const pace = accuracy > 0.8 ? 7000 : accuracy > 0.6 ? 9000 : 12000;
    const plan = ids.map(() => ({
      correct: Math.random() < accuracy,
      ms: Math.round(pace * (0.9 + Math.random() * 0.2)),
    }));

    const marks = ids.map(() => "?").join(",");
    const [qs, opts] = await Promise.all([
      db
        .prepare(`SELECT id, prompt_ar FROM questions WHERE id IN (${marks})`)
        .bind(...ids)
        .all<any>(),
      db
        .prepare(
          `SELECT id, question_id, label_ar, sort_order FROM question_options
            WHERE question_id IN (${marks}) ORDER BY sort_order`,
        )
        .bind(...ids)
        .all<any>(),
    ]);
    const byId = new Map<string, any>(qs.results.map((q: any) => [q.id, q]));
    const questions = ids.map((id) => {
      const q = byId.get(id);
      return {
        id,
        prompt: q.prompt_ar as string,
        options: opts.results
          .filter((o: any) => o.question_id === id)
          .map((o: any) => ({ id: o.id as string, label: o.label_ar as string })),
      };
    });
    return { ghostName: GHOST_NAME[data.level], mode: data.mode, plan, questions };
  });

/** تصحيح إجابة واحدة في وضع الشبح. */
export const gradeGhostAnswer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ questionId: z.string().uuid(), optionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const q = await db
      .prepare("SELECT explanation_ar FROM questions WHERE id = ?")
      .bind(data.questionId)
      .first<{ explanation_ar: string | null }>();
    const { results } = await db
      .prepare("SELECT id, is_correct, label_ar FROM question_options WHERE question_id = ?")
      .bind(data.questionId)
      .all<{ id: string; is_correct: number; label_ar: string }>();
    const picked = results.find((o) => o.id === data.optionId);
    if (!picked) throw new Error("إجابة غير صالحة.");
    const correct = results.find((o) => o.is_correct === 1);
    return {
      isCorrect: picked.is_correct === 1,
      correctLabel: correct?.label_ar ?? "",
      explanation: q?.explanation_ar ?? "",
    };
  });
