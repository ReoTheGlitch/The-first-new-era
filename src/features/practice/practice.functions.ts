import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  cairoDay,
  MIN_ANSWERS_FOR_QUALIFYING_SESSION,
  nextStreak,
  sessionXp,
} from "@/lib/gamification";

const input = z.object({
  conceptId: z.string().uuid(),
  answers: z
    .array(z.object({ questionId: z.string().uuid(), optionId: z.string().uuid() }))
    .min(1)
    .max(50),
});

/**
 * Grades a practice session on the server and is the ONLY writer of
 * attempts, XP transactions, streaks and achievements.
 */
export const completePracticeSession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const db = context.db as import("@/lib/db/index.server").Db;

    const [qRows, oRows] = await Promise.all([
      db
        .prepare("SELECT id, xp_value, explanation_ar FROM questions WHERE concept_id = ?")
        .bind(data.conceptId)
        .all<{ id: string; xp_value: number; explanation_ar: string | null }>(),
      db
        .prepare(
          `SELECT o.id, o.question_id, o.is_correct FROM question_options o
             JOIN questions q ON q.id = o.question_id WHERE q.concept_id = ?`,
        )
        .bind(data.conceptId)
        .all<{ id: string; question_id: string; is_correct: number }>(),
    ]);
    if (!qRows.results.length) throw new Error("تعذّر تحميل أسئلة هذا المفهوم.");
    const questions = qRows.results.map((q) => ({
      ...q,
      question_options: oRows.results
        .filter((o) => o.question_id === q.id)
        .map((o) => ({ id: o.id, is_correct: o.is_correct === 1 })),
    }));

    const byId = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<string>();
    const graded = data.answers
      .filter((a) => byId.has(a.questionId) && !seen.has(a.questionId) && seen.add(a.questionId))
      .map((a) => {
        const q = byId.get(a.questionId)!;
        const opt = q.question_options.find((o) => o.id === a.optionId);
        if (!opt) throw new Error("إجابة غير صالحة.");
        const correctOpt = q.question_options.find((o) => o.is_correct);
        return {
          ...a,
          isCorrect: opt.is_correct,
          correctOptionId: correctOpt?.id ?? null,
          explanation: q.explanation_ar,
          xp: q.xp_value,
        };
      });

    const correct = graded.filter((g) => g.isCorrect).length;
    const xp = sessionXp({
      totalQuestions: questions.length,
      answered: graded.length,
      correct,
      xpPerQuestion: graded.filter((g) => g.isCorrect).map((g) => g.xp),
    });
    const qualifying =
      graded.length === questions.length && graded.length >= MIN_ANSWERS_FOR_QUALIFYING_SESSION;

    const now = new Date().toISOString();
    const attemptId = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          `INSERT INTO quiz_attempts
             (id, user_id, concept_id, started_at, completed_at, correct_count, total_count, xp_awarded)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(attemptId, userId, data.conceptId, now, now, correct, graded.length, xp),
      ...graded.map((g) =>
        db
          .prepare(
            `INSERT INTO attempt_answers
               (id, attempt_id, user_id, question_id, option_id, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            attemptId,
            userId,
            g.questionId,
            g.optionId,
            g.isCorrect ? 1 : 0,
            now,
          ),
      ),
    ]);

    let streak = 0;
    const newAchievements: string[] = [];
    if (qualifying) {
      if (xp > 0) {
        await db
          .prepare(
            "INSERT INTO xp_transactions (id, user_id, amount, reason, ref_id, created_at) VALUES (?, ?, ?, 'practice_session', ?, ?)",
          )
          .bind(crypto.randomUUID(), userId, xp, attemptId, now)
          .run();
        try {
          const { awardCompetitionPoints } = await import("@/lib/engagement/competition.server");
          await awardCompetitionPoints(db, userId, xp);
        } catch (err) {
          console.error("[competition] practice points failed", err);
        }
      }

      const s = await db
        .prepare(
          "SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = ?",
        )
        .bind(userId)
        .first<{
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
        }>();
      const next = nextStreak(
        {
          current: s?.current_streak ?? 0,
          longest: s?.longest_streak ?? 0,
          lastDay: s?.last_activity_date ?? null,
        },
        cairoDay(new Date()),
      );
      streak = next.current;
      await db
        .prepare(
          `INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             current_streak = excluded.current_streak,
             longest_streak = excluded.longest_streak,
             last_activity_date = excluded.last_activity_date,
             updated_at = excluded.updated_at`,
        )
        .bind(userId, next.current, next.longest, next.lastDay, now)
        .run();

      const codes = [
        "first_practice",
        ...(correct === graded.length ? ["perfect_session"] : []),
        ...(next.current >= 3 ? ["streak_3"] : []),
      ];
      const { results: achs } = await db
        .prepare(
          `SELECT id, code, title_ar, xp_reward FROM achievements
            WHERE code IN (${codes.map(() => "?").join(",")})`,
        )
        .bind(...codes)
        .all<{ id: string; code: string; title_ar: string; xp_reward: number }>();
      const { results: owned } = await db
        .prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?")
        .bind(userId)
        .all<{ achievement_id: string }>();
      const ownedIds = new Set(owned.map((o) => o.achievement_id));
      for (const a of achs) {
        if (ownedIds.has(a.id)) continue;
        // INSERT OR IGNORE: the (user_id, achievement_id) PK makes a concurrent double-unlock harmless.
        const { meta } = await db
          .prepare(
            "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, earned_at) VALUES (?, ?, ?)",
          )
          .bind(userId, a.id, now)
          .run();
        if (!meta.changes) continue;
        if (a.xp_reward > 0)
          await db
            .prepare(
              "INSERT INTO xp_transactions (id, user_id, amount, reason, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(crypto.randomUUID(), userId, a.xp_reward, `achievement:${a.code}`, a.id, now)
            .run();
        newAchievements.push(a.title_ar);
      }
    }

    return {
      correct,
      total: graded.length,
      xp,
      streak,
      qualifying,
      newAchievements,
      review: graded.map((g) => ({
        questionId: g.questionId,
        optionId: g.optionId,
        isCorrect: g.isCorrect,
        correctOptionId: g.correctOptionId,
        explanation: g.explanation,
      })),
    };
  });
