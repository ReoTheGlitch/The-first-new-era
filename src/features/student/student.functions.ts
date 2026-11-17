/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { cairoDay, displayedStreak, levelFromXp } from "@/lib/gamification";

// Read/write endpoints for the student UI. The browser never touches the database:
// every query goes through these server functions (D1 via context.db).

const bool = (v: unknown) => v === 1 || v === true;
const parseJson = <T>(v: unknown, fallback: T): T => {
  try {
    return typeof v === "string" ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export type LearningPrefs = {
  user_id: string;
  explanation_style: string;
  explanation_length: string;
  daily_goal_xp: number;
  reduce_motion: boolean;
  large_text: boolean;
  notify_streak: boolean;
  notify_revision: boolean;
  show_on_leaderboard: boolean;
  updated_at: string;
};

export const getStudentOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const userId = context.userId as string;
    const today = cairoDay(new Date());
    const [user, profile, xp, streak, prefs, achs, attempts] = await Promise.all([
      db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>(),
      db
        .prepare("SELECT display_name FROM profiles WHERE id = ?")
        .bind(userId)
        .first<{ display_name: string }>(),
      db
        .prepare("SELECT amount, created_at FROM xp_transactions WHERE user_id = ?")
        .bind(userId)
        .all<{ amount: number; created_at: string }>(),
      db.prepare("SELECT * FROM streaks WHERE user_id = ?").bind(userId).first<{
        current_streak: number;
        longest_streak: number;
        last_activity_date: string | null;
      }>(),
      db.prepare("SELECT * FROM learning_preferences WHERE user_id = ?").bind(userId).first<any>(),
      db
        .prepare(
          `SELECT ua.earned_at, a.title_ar, a.description_ar, a.icon
             FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
            WHERE ua.user_id = ? ORDER BY ua.earned_at DESC`,
        )
        .bind(userId)
        .all<any>(),
      db
        .prepare(
          `SELECT qa.id, qa.concept_id, qa.correct_count, qa.total_count, qa.xp_awarded, qa.completed_at,
                  c.title_ar AS concept_title, c.lesson_id AS lesson_id, l.title_ar AS lesson_title
             FROM quiz_attempts qa
             LEFT JOIN concepts c ON c.id = qa.concept_id
             LEFT JOIN lessons l ON l.id = c.lesson_id
            WHERE qa.user_id = ? ORDER BY qa.started_at DESC LIMIT 10`,
        )
        .bind(userId)
        .all<any>(),
    ]);

    const xpRows = xp.results;
    const totalXp = xpRows.reduce((a, r) => a + r.amount, 0);
    const todayXp = xpRows
      .filter((r) => cairoDay(new Date(r.created_at)) === today)
      .reduce((a, r) => a + r.amount, 0);
    const s = streak;
    const prefsOut: LearningPrefs | null = prefs
      ? {
          user_id: prefs.user_id,
          explanation_style: prefs.explanation_style,
          explanation_length: prefs.explanation_length,
          daily_goal_xp: prefs.daily_goal_xp,
          reduce_motion: bool(prefs.reduce_motion),
          large_text: bool(prefs.large_text),
          notify_streak: bool(prefs.notify_streak),
          notify_revision: bool(prefs.notify_revision),
          show_on_leaderboard: bool(prefs.show_on_leaderboard),
          updated_at: prefs.updated_at,
        }
      : null;
    return {
      userId,
      email: user?.email ?? "",
      displayName: profile?.display_name ?? "طالب",
      totalXp,
      todayXp,
      level: levelFromXp(totalXp),
      streak: s
        ? displayedStreak(
            { current: s.current_streak, longest: s.longest_streak, lastDay: s.last_activity_date },
            today,
          )
        : 0,
      longestStreak: s?.longest_streak ?? 0,
      prefs: prefsOut,
      dailyGoal: prefsOut?.daily_goal_xp ?? 50,
      achievements: achs.results.map((r) => ({
        earned_at: r.earned_at as string,
        achievements: {
          title_ar: r.title_ar as string,
          description_ar: r.description_ar as string,
          icon: r.icon as string,
        } as { title_ar: string; description_ar: string; icon: string } | null,
      })),
      attempts: attempts.results.map((r) => ({
        id: r.id as string,
        concept_id: r.concept_id as string,
        correct_count: r.correct_count as number,
        total_count: r.total_count as number,
        xp_awarded: r.xp_awarded as number,
        completed_at: r.completed_at as string | null,
        concepts: r.concept_title
          ? ({
              title_ar: r.concept_title as string,
              lesson_id: r.lesson_id as string,
              lessons: r.lesson_title ? { title_ar: r.lesson_title as string } : null,
            } as {
              title_ar: string;
              lesson_id: string;
              lessons: { title_ar: string } | null;
            } | null)
          : null,
      })),
    };
  });

export const listSubjects = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const [subjects, courses, units, lessons] = await Promise.all([
      db
        .prepare(
          `SELECT id, slug, name_ar, name_en, description_ar, accent FROM subjects
            WHERE is_active = 1 ORDER BY sort_order`,
        )
        .bind()
        .all<any>(),
      db
        .prepare(
          "SELECT id, subject_id, title_ar, academic_year, status FROM courses ORDER BY sort_order",
        )
        .bind()
        .all<any>(),
      db.prepare("SELECT id, course_id FROM units ORDER BY sort_order").bind().all<any>(),
      db.prepare("SELECT id, unit_id FROM lessons ORDER BY sort_order").bind().all<any>(),
    ]);
    return subjects.results.map((s) => ({
      id: s.id as string,
      slug: s.slug as string,
      name_ar: s.name_ar as string,
      name_en: s.name_en as string,
      description_ar: s.description_ar as string | null,
      accent: s.accent as string,
      courses: courses.results
        .filter((c) => c.subject_id === s.id)
        .map((c) => ({
          id: c.id as string,
          title_ar: c.title_ar as string,
          academic_year: c.academic_year as string,
          status: c.status as string,
          units: units.results
            .filter((u) => u.course_id === c.id)
            .map((u) => ({
              id: u.id as string,
              lessons: lessons.results
                .filter((l) => l.unit_id === u.id)
                .map((l) => ({ id: l.id as string })),
            })),
        })),
    }));
  });

export const getSubject = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const s = await db
      .prepare("SELECT id, slug, name_ar, name_en, description_ar FROM subjects WHERE slug = ?")
      .bind(data.slug)
      .first<any>();
    if (!s) return null;
    const [courses, units, lessons] = await Promise.all([
      db
        .prepare(
          `SELECT id, title_ar, academic_year, status FROM courses
            WHERE subject_id = ? ORDER BY sort_order`,
        )
        .bind(s.id)
        .all<any>(),
      db
        .prepare(
          `SELECT u.id, u.course_id, u.title_ar, u.summary_ar, u.status, u.origin, u.sort_order
             FROM units u JOIN courses c ON c.id = u.course_id WHERE c.subject_id = ?
            ORDER BY u.sort_order`,
        )
        .bind(s.id)
        .all<any>(),
      db
        .prepare(
          `SELECT l.id, l.unit_id, l.title_ar, l.overview_ar, l.origin, l.status, l.sort_order
             FROM lessons l JOIN units u ON u.id = l.unit_id JOIN courses c ON c.id = u.course_id
            WHERE c.subject_id = ? ORDER BY l.sort_order`,
        )
        .bind(s.id)
        .all<any>(),
    ]);
    return {
      id: s.id as string,
      slug: s.slug as string,
      name_ar: s.name_ar as string,
      name_en: s.name_en as string,
      description_ar: s.description_ar as string | null,
      courses: courses.results.map((c) => ({
        id: c.id as string,
        title_ar: c.title_ar as string,
        academic_year: c.academic_year as string,
        status: c.status as string,
        units: units.results
          .filter((u) => u.course_id === c.id)
          .map((u) => ({
            id: u.id as string,
            title_ar: u.title_ar as string,
            summary_ar: u.summary_ar as string | null,
            status: u.status as string,
            origin: u.origin as string,
            sort_order: u.sort_order as number,
            lessons: lessons.results
              .filter((l) => l.unit_id === u.id)
              .map((l) => ({
                id: l.id as string,
                title_ar: l.title_ar as string,
                overview_ar: l.overview_ar as string | null,
                origin: l.origin as string,
                status: l.status as string,
                sort_order: l.sort_order as number,
              })),
          })),
      })),
    };
  });

export type LessonBodyBlock = { type: string; text?: string; tex?: string; lab?: string };

export const getLesson = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const l = await db
      .prepare(
        `SELECT l.id, l.title_ar, l.overview_ar, l.objectives_ar, l.body, l.origin, l.status,
                u.id AS unit_id, u.title_ar AS unit_title, s.slug AS subject_slug, s.name_ar AS subject_name
           FROM lessons l
           LEFT JOIN units u ON u.id = l.unit_id
           LEFT JOIN courses c ON c.id = u.course_id
           LEFT JOIN subjects s ON s.id = c.subject_id
          WHERE l.id = ?`,
      )
      .bind(data.id)
      .first<any>();
    if (!l) return null;
    const concepts = await db
      .prepare(
        `SELECT c.id, c.title_ar, c.explanation_ar, c.formula_tex, c.sort_order
           FROM concepts c WHERE c.lesson_id = ? ORDER BY c.sort_order`,
      )
      .bind(l.id)
      .all<any>();
    const qs = await db
      .prepare(
        `SELECT q.id, q.concept_id FROM questions q JOIN concepts c ON c.id = q.concept_id
          WHERE c.lesson_id = ?`,
      )
      .bind(l.id)
      .all<{ id: string; concept_id: string }>();
    try {
      const { tryTouchStreak } = await import("@/lib/engagement/streak.server");
      await tryTouchStreak(db, context.userId as string);
    } catch (err) {
      console.error("[streak] lesson", err);
    }
    return {
      id: l.id as string,
      title_ar: l.title_ar as string,
      overview_ar: l.overview_ar as string | null,
      objectives_ar: parseJson<string[]>(l.objectives_ar, []),
      body: parseJson<LessonBodyBlock[]>(l.body, []),
      origin: l.origin as string,
      status: l.status as string,
      units: l.unit_id
        ? {
            id: l.unit_id as string,
            title_ar: l.unit_title as string,
            courses: l.subject_slug
              ? { subjects: { slug: l.subject_slug as string, name_ar: l.subject_name as string } }
              : null,
          }
        : null,
      concepts: concepts.results.map((c) => ({
        id: c.id as string,
        title_ar: c.title_ar as string,
        explanation_ar: c.explanation_ar as string | null,
        formula_tex: c.formula_tex as string | null,
        sort_order: c.sort_order as number,
        questions: qs.results.filter((q) => q.concept_id === c.id).map((q) => ({ id: q.id })),
      })),
    };
  });

export const getConceptPractice = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ conceptId: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const c = await db
      .prepare(
        `SELECT c.id, c.title_ar, c.formula_tex, c.origin, c.lesson_id, l.title_ar AS lesson_title
           FROM concepts c LEFT JOIN lessons l ON l.id = c.lesson_id WHERE c.id = ?`,
      )
      .bind(data.conceptId)
      .first<any>();
    if (!c) return null;
    const [questions, options] = await Promise.all([
      db
        .prepare(
          `SELECT id, prompt_ar, explanation_ar, origin FROM questions
            WHERE concept_id = ? ORDER BY created_at, id`,
        )
        .bind(c.id)
        .all<any>(),
      // The practice UI reveals right/wrong instantly, so is_correct is included here exactly as
      // the old PostgREST query selected it. Grading and XP still happen only on the server.
      db
        .prepare(
          `SELECT o.id, o.question_id, o.label_ar, o.sort_order, o.is_correct
             FROM question_options o JOIN questions q ON q.id = o.question_id
            WHERE q.concept_id = ? ORDER BY o.sort_order`,
        )
        .bind(c.id)
        .all<any>(),
    ]);
    return {
      id: c.id as string,
      title_ar: c.title_ar as string,
      formula_tex: c.formula_tex as string | null,
      origin: c.origin as string,
      lesson_id: c.lesson_id as string,
      lessons: c.lesson_title ? { title_ar: c.lesson_title as string } : null,
      questions: questions.results.map((q) => ({
        id: q.id as string,
        prompt_ar: q.prompt_ar as string,
        explanation_ar: q.explanation_ar as string | null,
        origin: q.origin as string,
        question_options: options.results
          .filter((o) => o.question_id === q.id)
          .map((o) => ({
            id: o.id as string,
            label_ar: o.label_ar as string,
            sort_order: o.sort_order as number,
            is_correct: o.is_correct === 1,
          })),
      })),
    };
  });

export const getWeeklyXp = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const userId = context.userId as string;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { results } = await db
      .prepare(
        "SELECT amount, created_at FROM xp_transactions WHERE user_id = ? AND created_at >= ?",
      )
      .bind(userId, sevenDaysAgo.toISOString())
      .all<{ amount: number; created_at: string }>();
    // Bucket by Cairo calendar day (the server runs in UTC).
    const dayIndex = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      dayIndex.set(cairoDay(new Date(Date.now() - (6 - i) * 86_400_000)), i);
    }
    const days: number[] = Array(7).fill(0);
    for (const row of results) {
      const idx = dayIndex.get(cairoDay(new Date(row.created_at)));
      if (idx !== undefined) days[idx] = (days[idx] ?? 0) + (row.amount ?? 0);
    }
    const bestIdx = days.reduce((best, v, i) => (v > (days[best] ?? 0) ? i : best), 0);
    const bestDate = new Date(Date.now() - (6 - bestIdx) * 86_400_000);
    const bestDayName = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
    }).format(bestDate);
    return {
      days,
      total: days.reduce((a, b) => a + b, 0),
      bestDayName: (days[bestIdx] ?? 0) > 0 ? bestDayName : null,
    };
  });

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  total_xp: number;
  is_me: boolean;
};

/** Only name + XP of opted-in users. */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<LeaderboardRow[]> => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const me = context.userId as string;
    const { results } = await db
      .prepare(
        `SELECT p.id AS user_id, p.display_name AS display_name, SUM(x.amount) AS total_xp
           FROM profiles p
           JOIN xp_transactions x ON x.user_id = p.id
           LEFT JOIN learning_preferences lp ON lp.user_id = p.id
          WHERE COALESCE(lp.show_on_leaderboard, 1) = 1
          GROUP BY p.id, p.display_name
          ORDER BY total_xp DESC, p.id
          LIMIT 50`,
      )
      .bind()
      .all<{ user_id: string; display_name: string; total_xp: number }>();
    return results.map((r, i) => ({
      rank: i + 1,
      user_id: r.user_id,
      display_name: r.display_name,
      total_xp: r.total_xp,
      is_me: r.user_id === me,
    }));
  });

const prefsInput = z.object({
  displayName: z.string().trim().min(1).max(40),
  prefs: z.object({
    explanation_style: z.string().max(40),
    explanation_length: z.string().max(40),
    daily_goal_xp: z.number().int().min(10).max(500),
    reduce_motion: z.boolean(),
    large_text: z.boolean(),
    notify_streak: z.boolean(),
    notify_revision: z.boolean(),
    show_on_leaderboard: z.boolean(),
  }),
});

export const getWeeklyCompetition = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getActiveLeaderboard } = await import("@/lib/engagement/competition.server");
    const db = context.db as import("@/lib/db/index.server").Db;
    const { round, rows } = await getActiveLeaderboard(db, context.userId as string, 50);
    return {
      round: { id: round.id, startsAt: round.starts_at, endsAt: round.ends_at },
      rows,
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => prefsInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const userId = context.userId as string;
    const now = new Date().toISOString();
    const p = data.prefs;
    await db.batch([
      db
        .prepare("UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?")
        .bind(data.displayName, now, userId),
      db
        .prepare(
          `INSERT INTO learning_preferences
             (user_id, explanation_style, explanation_length, daily_goal_xp, reduce_motion,
              large_text, notify_streak, notify_revision, show_on_leaderboard, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             explanation_style = excluded.explanation_style,
             explanation_length = excluded.explanation_length,
             daily_goal_xp = excluded.daily_goal_xp,
             reduce_motion = excluded.reduce_motion,
             large_text = excluded.large_text,
             notify_streak = excluded.notify_streak,
             notify_revision = excluded.notify_revision,
             show_on_leaderboard = excluded.show_on_leaderboard,
             updated_at = excluded.updated_at`,
        )
        .bind(
          userId,
          p.explanation_style,
          p.explanation_length,
          p.daily_goal_xp,
          p.reduce_motion ? 1 : 0,
          p.large_text ? 1 : 0,
          p.notify_streak ? 1 : 0,
          p.notify_revision ? 1 : 0,
          p.show_on_leaderboard ? 1 : 0,
          now,
        ),
    ]);
    return { ok: true };
  });
