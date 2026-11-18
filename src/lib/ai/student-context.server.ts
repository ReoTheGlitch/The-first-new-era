import { getDb } from "@/lib/db/index.server";

export type StudentAdaptiveSummary = {
  totalXp: number;
  streak: number;
  accuracyPct: number | null;
  weakConcepts: string[];
  promptSummary: string;
};

/** يجلب ملخص بيانات الطالب للتكيّف مع مستواه ونقاط ضعفه دون تعطيل المسار عند غياب الاتصال. */
export async function getStudentAdaptiveSummary(userId: string): Promise<StudentAdaptiveSummary> {
  const empty: StudentAdaptiveSummary = {
    totalXp: 0,
    streak: 0,
    accuracyPct: null,
    weakConcepts: [],
    promptSummary: "",
  };

  try {
    const db = getDb();
    const [xpRes, streakRes, attemptsRes, mistakesRes] = await Promise.allSettled([
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM xp_transactions WHERE user_id = ?")
        .bind(userId)
        .first<{ total: number }>(),
      db
        .prepare("SELECT current_streak FROM streaks WHERE user_id = ?")
        .bind(userId)
        .first<{ current_streak: number }>(),
      db
        .prepare(
          `SELECT correct_count, total_count FROM quiz_attempts
            WHERE user_id = ? ORDER BY started_at DESC LIMIT 10`,
        )
        .bind(userId)
        .all<{ correct_count: number; total_count: number }>(),
      db
        .prepare(
          `SELECT c.title_ar AS title FROM attempt_answers aa
             JOIN questions q ON q.id = aa.question_id
             JOIN concepts c ON c.id = q.concept_id
            WHERE aa.user_id = ? AND aa.is_correct = 0
            ORDER BY aa.answered_at DESC LIMIT 12`,
        )
        .bind(userId)
        .all<{ title: string | null }>(),
    ]);

    const totalXp = xpRes.status === "fulfilled" ? (xpRes.value?.total ?? 0) : 0;

    const streak = streakRes.status === "fulfilled" ? (streakRes.value?.current_streak ?? 0) : 0;

    let accuracyPct: number | null = null;
    if (attemptsRes.status === "fulfilled" && attemptsRes.value.results.length > 0) {
      const rows = attemptsRes.value.results;
      const correct = rows.reduce((s, r) => s + (r.correct_count ?? 0), 0);
      const total = rows.reduce((s, r) => s + (r.total_count ?? 0), 0);
      if (total > 0) accuracyPct = Math.round((correct / total) * 100);
    }

    const weakSet = new Set<string>();
    if (mistakesRes.status === "fulfilled") {
      for (const row of mistakesRes.value.results) if (row.title) weakSet.add(row.title);
    }
    const weakConcepts = Array.from(weakSet).slice(0, 4);

    const parts = [
      `إجمالي نقاط الخبرة: ${totalXp} XP`,
      `سلسلة الالتزام: ${streak} أيام`,
      ...(accuracyPct !== null ? [`معدل الدقة في التدريبات الأخيرة: ${accuracyPct}%`] : []),
      ...(weakConcepts.length > 0
        ? [`موضوعات أخطأ فيها الطالب مؤخرًا ويحتاج دعمًا فيها: ${weakConcepts.join("، ")}`]
        : []),
    ];

    return {
      totalXp,
      streak,
      accuracyPct,
      weakConcepts,
      promptSummary: `بيانات الطالب الحالية (${parts.join(" | ")}). كيّف مستوى الشرح والأسئلة والأمثلة لتناسب مستواه الفعلي.`,
    };
  } catch {
    return empty;
  }
}
