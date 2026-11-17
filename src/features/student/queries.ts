import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cairoDay, displayedStreak, levelFromXp } from "@/lib/gamification";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("not signed in");
  return data.user;
}

export const studentOverviewQuery = queryOptions({
  queryKey: ["student", "overview"],
  queryFn: async () => {
    const user = await uid();
    const today = cairoDay(new Date());
    const [profile, xp, streak, prefs, achs, attempts] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("xp_transactions").select("amount, created_at").eq("user_id", user.id),
      supabase.from("streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("learning_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_achievements")
        .select("earned_at, achievements(title_ar, description_ar, icon)")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false }),
      supabase
        .from("quiz_attempts")
        .select(
          "id, concept_id, correct_count, total_count, xp_awarded, completed_at, concepts(title_ar, lesson_id, lessons(title_ar))",
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10),
    ]);
    const xpRows = xp.data ?? [];
    const totalXp = xpRows.reduce((a, r) => a + r.amount, 0);
    const todayXp = xpRows
      .filter((r) => cairoDay(new Date(r.created_at)) === today)
      .reduce((a, r) => a + r.amount, 0);
    const s = streak.data;
    return {
      userId: user.id,
      email: user.email ?? "",
      displayName: profile.data?.display_name ?? "طالب",
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
      prefs: prefs.data,
      dailyGoal: prefs.data?.daily_goal_xp ?? 50,
      achievements: achs.data ?? [],
      attempts: attempts.data ?? [],
    };
  },
});

export const subjectsQuery = queryOptions({
  queryKey: ["curriculum", "subjects"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, slug, name_ar, name_en, description_ar, accent, courses(id, title_ar, academic_year, status, units(id, lessons(id)))",
      )
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const subjectQuery = (slug: string) =>
  queryOptions({
    queryKey: ["curriculum", "subject", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select(
          "id, slug, name_ar, name_en, description_ar, courses(id, title_ar, academic_year, status, units(id, title_ar, summary_ar, status, origin, sort_order, lessons(id, title_ar, overview_ar, origin, status, sort_order)))",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ["curriculum", "lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, title_ar, overview_ar, objectives_ar, body, origin, status, units(id, title_ar, courses(subjects(slug, name_ar))), concepts(id, title_ar, explanation_ar, formula_tex, sort_order, questions(id))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const conceptPracticeQuery = (conceptId: string) =>
  queryOptions({
    queryKey: ["practice", conceptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concepts")
        .select(
          "id, title_ar, formula_tex, origin, lesson_id, lessons(title_ar), questions(id, prompt_ar, explanation_ar, origin, question_options(id, label_ar, sort_order, is_correct))",
        )
        .eq("id", conceptId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const weeklyXpQuery = queryOptions({
  queryKey: ["student", "weekly-xp"],
  queryFn: async () => {
    const user = await uid();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("xp_transactions")
      .select("amount, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());
    const days: number[] = Array(7).fill(0);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    for (const row of data ?? []) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((todayMidnight.getTime() - d.getTime()) / 86_400_000);
      if (diff >= 0 && diff < 7) days[6 - diff] = (days[6 - diff] ?? 0) + (row.amount ?? 0);
    }
    const bestIdx = days.reduce((best, v, i) => (v > (days[best] ?? 0) ? i : best), 0);
    const bestDate = new Date(todayMidnight);
    bestDate.setDate(bestDate.getDate() - (6 - bestIdx));
    const bestDayName = new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
    }).format(bestDate);
    return {
      days,
      total: days.reduce((a, b) => a + b, 0),
      bestDayName: (days[bestIdx] ?? 0) > 0 ? bestDayName : null,
    };
  },
});

export const leaderboardQuery = queryOptions({
  queryKey: ["competition", "leaderboard"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_leaderboard", { _limit: 50 });
    if (error) throw error;
    return data ?? [];
  },
});
