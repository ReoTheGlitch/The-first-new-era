/* eslint-disable @typescript-eslint/no-explicit-any */
// Streak book-keeping. One day is counted per calendar day in Africa/Cairo,
// regardless of whether the student visits once or twenty times. A full
// missed day resets the streak to 1 on the next activity.

import { cairoAddDays, cairoDate } from "@/lib/time/cairo";
import type { Db } from "@/lib/db/index.server";

type Row = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

/**
 * Record one streak-earning activity for `userId`. Idempotent per Cairo day.
 * Call from any server function that represents real student activity:
 * opening a lesson, submitting a practice answer, finishing an exam, sending
 * a tutor message.
 */
export async function touchStreak(db: Db, userId: string): Promise<void> {
  const today = cairoDate();
  const row = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<Row>();

  if (!row) {
    await db
      .prepare(
        "INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at) VALUES (?, 1, 1, ?, CURRENT_TIMESTAMP)",
      )
      .bind(userId, today)
      .run();
    return;
  }

  if (row.last_activity_date === today) return; // already counted today

  const continuing = row.last_activity_date === cairoAddDays(today, -1);
  const newCurrent = continuing ? row.current_streak + 1 : 1;
  const newLongest = Math.max(row.longest_streak, newCurrent);

  await db
    .prepare(
      "UPDATE streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
    )
    .bind(newCurrent, newLongest, today, userId)
    .run();
}

/**
 * Non-throwing variant: swallows any error and reports via console. Use from
 * code paths where a streak write failure should NOT fail the user's action
 * (lesson open, practice submit, etc.).
 */
export async function tryTouchStreak(db: Db, userId: string): Promise<void> {
  try {
    await touchStreak(db, userId);
  } catch (err) {
    console.error("[streak] failed to update", userId, err);
  }
}

export async function getStreak(
  db: Db,
  userId: string,
): Promise<{ current: number; longest: number; lastActivityDate: string | null }> {
  const row = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<Row>();
  if (!row) return { current: 0, longest: 0, lastActivityDate: null };
  // If the student hasn't touched the app since yesterday-plus, the current
  // streak is effectively broken for display purposes — but we don't zero it
  // in the row until the next activity, so an old streak doesn't quietly
  // disappear if they come back.
  const today = cairoDate();
  const stillCounts =
    row.last_activity_date === today || row.last_activity_date === cairoAddDays(today, -1);
  return {
    current: stillCounts ? row.current_streak : 0,
    longest: row.longest_streak,
    lastActivityDate: row.last_activity_date,
  };
}
