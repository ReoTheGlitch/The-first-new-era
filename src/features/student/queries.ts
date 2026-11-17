import { queryOptions } from "@tanstack/react-query";
import {
  getConceptPractice,
  getLeaderboard,
  getLesson,
  getStudentOverview,
  getSubject,
  getWeeklyXp,
  listSubjects,
} from "./student.functions";

// Browser-side query definitions. All data comes from server functions (D1); the browser has no DB access.

export const studentOverviewQuery = queryOptions({
  queryKey: ["student", "overview"],
  queryFn: () => getStudentOverview(),
});

export const subjectsQuery = queryOptions({
  queryKey: ["curriculum", "subjects"],
  queryFn: () => listSubjects(),
});

export const subjectQuery = (slug: string) =>
  queryOptions({
    queryKey: ["curriculum", "subject", slug],
    queryFn: () => getSubject({ data: { slug } }),
  });

export const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ["curriculum", "lesson", id],
    queryFn: () => getLesson({ data: { id } }),
  });

export const conceptPracticeQuery = (conceptId: string) =>
  queryOptions({
    queryKey: ["practice", conceptId],
    queryFn: () => getConceptPractice({ data: { conceptId } }),
  });

export const weeklyXpQuery = queryOptions({
  queryKey: ["student", "weekly-xp"],
  queryFn: () => getWeeklyXp(),
});

export const leaderboardQuery = queryOptions({
  queryKey: ["competition", "leaderboard"],
  queryFn: () => getLeaderboard(),
  // Replaces the old realtime feel: refresh while the page is open.
  refetchInterval: 30_000,
});
