/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth/require-auth";
import { classifyMistake } from "./classify";

export type MistakeItem = {
  questionId: string;
  conceptId: string;
  lessonId: string;
  lessonTitle: string;
  subjectSlug: string;
  subjectName: string;
  prompt: string;
  chosenLabel: string | null;
  correctLabel: string;
  explanation: string | null;
  cause: ReturnType<typeof classifyMistake>;
  wrongCount: number;
  lastAt: string;
};

/**
 * دفتر الأخطاء: كل سؤال كانت آخر إجابة عنه خاطئة (من التدريب أو من التحديات).
 * يخرج السؤال من الدفتر تلقائيًا عندما تجيب عنه صحيحًا.
 */
export const getMistakes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const userId = context.userId as string;

    const [practice, duels] = await Promise.all([
      db
        .prepare(
          `SELECT question_id, option_id, is_correct, answered_at FROM attempt_answers
            WHERE user_id = ? ORDER BY answered_at DESC LIMIT 1000`,
        )
        .bind(userId)
        .all<any>(),
      db
        .prepare(
          `SELECT question_id, option_id, is_correct, created_at FROM duel_answers
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 500`,
        )
        .bind(userId)
        .all<any>(),
    ]);

    type Row = { question_id: string; option_id: string | null; is_correct: boolean; at: string };
    const rows: Row[] = [
      ...practice.results.map((r: any) => ({
        question_id: r.question_id,
        option_id: r.option_id,
        is_correct: r.is_correct === 1,
        at: r.answered_at,
      })),
      ...duels.results.map((r: any) => ({
        question_id: r.question_id,
        option_id: r.option_id,
        is_correct: r.is_correct === 1,
        at: r.created_at,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));

    const latest = new Map<string, Row>();
    const wrongCount = new Map<string, number>();
    const everWrong = new Set<string>();
    for (const r of rows) {
      if (!latest.has(r.question_id)) latest.set(r.question_id, r);
      if (!r.is_correct) {
        wrongCount.set(r.question_id, (wrongCount.get(r.question_id) ?? 0) + 1);
        everWrong.add(r.question_id);
      }
    }
    const open = [...latest.values()].filter((r) => !r.is_correct).slice(0, 60);
    const resolved = [...everWrong].filter((id) => latest.get(id)?.is_correct).length;
    if (!open.length) return { items: [] as MistakeItem[], resolved };

    const ids = open.map((r) => r.question_id);
    const marks = ids.map(() => "?").join(",");
    const [qs, opts] = await Promise.all([
      db
        .prepare(
          `SELECT q.id, q.prompt_ar, q.explanation_ar, q.concept_id,
                  l.id AS lesson_id, l.title_ar AS lesson_title,
                  s.slug AS subject_slug, s.name_ar AS subject_name
             FROM questions q
             LEFT JOIN concepts cn ON cn.id = q.concept_id
             LEFT JOIN lessons l ON l.id = cn.lesson_id
             LEFT JOIN units u ON u.id = l.unit_id
             LEFT JOIN courses co ON co.id = u.course_id
             LEFT JOIN subjects s ON s.id = co.subject_id
            WHERE q.id IN (${marks})`,
        )
        .bind(...ids)
        .all<any>(),
      db
        .prepare(
          `SELECT id, question_id, label_ar, is_correct FROM question_options
            WHERE question_id IN (${marks})`,
        )
        .bind(...ids)
        .all<any>(),
    ]);
    const byId = new Map<string, any>(qs.results.map((q: any) => [q.id, q]));

    const items: MistakeItem[] = open.flatMap((r) => {
      const q = byId.get(r.question_id);
      if (!q) return [];
      const options: { id: string; label_ar: string; is_correct: boolean }[] = opts.results
        .filter((o: any) => o.question_id === q.id)
        .map((o: any) => ({ id: o.id, label_ar: o.label_ar, is_correct: o.is_correct === 1 }));
      const correct = options.find((o) => o.is_correct)?.label_ar ?? "";
      const chosen = options.find((o) => o.id === r.option_id)?.label_ar ?? null;
      return [
        {
          questionId: q.id,
          conceptId: q.concept_id,
          lessonId: q.lesson_id ?? "",
          lessonTitle: q.lesson_title ?? "",
          subjectSlug: q.subject_slug ?? "",
          subjectName: q.subject_name ?? "",
          prompt: q.prompt_ar,
          chosenLabel: chosen,
          correctLabel: correct,
          explanation: q.explanation_ar,
          cause: classifyMistake(correct, chosen),
          wrongCount: wrongCount.get(q.id) ?? 1,
          lastAt: r.at,
        },
      ];
    });
    return { items, resolved };
  });
