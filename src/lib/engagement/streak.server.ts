/* eslint-disable @typescript-eslint/no-explicit-any */
// Thin DB wrapper around the pure streak rules in `src/lib/gamification.ts`.
// Call this from any server function that represents a real student
// activity (lesson opened, practice submit, exam complete, tutor message).
// Idempotent per Cairo calendar day.

import { cairoDay, displayedStreak, nextStreak, type StreakState } from "@/lib/gamification";
import type { Db } from "@/lib/db/index.server";

type Row = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

export async function touchStreak(db: Db, userId: string, now: Date = new Date()): Promise<void> {
  const today = cairoDay(now);
  const row = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<Row>();

  const prev: StreakState = row
    ? {
        current: row.current_streak,
        longest: row.longest_streak,
        lastDay: row.last_activity_date,
      }
    : { current: 0, longest: 0, lastDay: null };

  const next = nextStreak(prev, today);
  if (next === prev) return; // same-day no-op

  if (row) {
    await db
      .prepare(
        "UPDATE streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ?",
      )
      .bind(next.current, next.longest, next.lastDay, userId)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
      )
      .bind(userId, next.current, next.longest, next.lastDay)
      .run();
  }
}

/** Non-throwing variant for code paths where a streak write failure
 *  must not fail the user's action. */
export async function tryTouchStreak(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    await touchStreak(db, userId, now);
  } catch (err) {
    console.error("[streak] failed to update", userId, err);
  }
}

export async function getStreakForDisplay(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<{ current: number; longest: number; lastDay: string | null }> {
  const row = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<Row>();
  if (!row) return { current: 0, longest: 0, lastDay: null };
  const state: StreakState = {
    current: row.current_streak,
    longest: row.longest_streak,
    lastDay: row.last_activity_date,
  };
  return {
    current: displayedStreak(state, cairoDay(now)),
    longest: state.longest,
    lastDay: state.lastDay,
  };
}
