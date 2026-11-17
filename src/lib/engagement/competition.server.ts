/* eslint-disable @typescript-eslint/no-explicit-any */
// Weekly competition rounds. Points reset each Monday 00:00 Africa/Cairo.
// The first server call after the switch rotates stale rounds and opens the
// current one; nothing else is needed — no scheduled job.

import { cairoNextWeekStartIso, cairoWeekStartIso } from "@/lib/time/cairo";
import type { Db } from "@/lib/db/index.server";

export type CompetitionRound = {
  id: string;
  starts_at: string;
  ends_at: string;
  active: number;
  created_at: string;
};

/** Return the current round, creating one (and retiring stale ones) if needed. */
export async function getOrCreateActiveRound(db: Db): Promise<CompetitionRound> {
  const startIso = cairoWeekStartIso();
  const endIso = cairoNextWeekStartIso();

  // Retire anything that has already ended.
  await db
    .prepare(
      "UPDATE competition_rounds SET active = 0 WHERE active = 1 AND ends_at <= CURRENT_TIMESTAMP",
    )
    .bind()
    .run();

  const existing = await db
    .prepare(
      "SELECT id, starts_at, ends_at, active, created_at FROM competition_rounds WHERE starts_at = ?",
    )
    .bind(startIso)
    .first<CompetitionRound>();
  if (existing) {
    if (!existing.active) {
      await db
        .prepare("UPDATE competition_rounds SET active = 1 WHERE id = ?")
        .bind(existing.id)
        .run();
      return { ...existing, active: 1 };
    }
    return existing;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO competition_rounds (id, starts_at, ends_at, active) VALUES (?, ?, ?, 1)",
    )
    .bind(id, startIso, endIso)
    .run();
  return {
    id,
    starts_at: startIso,
    ends_at: endIso,
    active: 1,
    created_at: new Date().toISOString(),
  };
}

/** Add `points` to `userId` in the active round. Creates the row if missing. */
export async function awardCompetitionPoints(
  db: Db,
  userId: string,
  points: number,
): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;
  const round = await getOrCreateActiveRound(db);
  await db
    .prepare(
      "INSERT INTO competition_scores (user_id, round_id, points, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, round_id) DO UPDATE SET points = points + excluded.points, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(userId, round.id, Math.floor(points))
    .run();
}

export type LeaderboardRow = {
  user_id: string;
  rank: number;
  display_name: string;
  points: number;
  is_me: boolean;
};

/** Top `limit` of the active round, with the caller's row if not in the top. */
export async function getActiveLeaderboard(
  db: Db,
  viewerId: string | null,
  limit = 25,
): Promise<{ round: CompetitionRound; rows: LeaderboardRow[] }> {
  const round = await getOrCreateActiveRound(db);
  const top = await db
    .prepare(
      `SELECT s.user_id, s.points, COALESCE(p.display_name, u.email) AS display_name
         FROM competition_scores s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN profiles p ON p.id = s.user_id
        WHERE s.round_id = ?
        ORDER BY s.points DESC, s.updated_at ASC
        LIMIT ?`,
    )
    .bind(round.id, limit)
    .all<{ user_id: string; points: number; display_name: string | null }>();

  const rows: LeaderboardRow[] = top.results.map((r, i) => ({
    user_id: r.user_id,
    rank: i + 1,
    display_name: r.display_name ?? "طالب",
    points: r.points,
    is_me: viewerId !== null && r.user_id === viewerId,
  }));

  if (viewerId && !rows.some((r) => r.is_me)) {
    const me = await db
      .prepare(
        `SELECT s.user_id, s.points, COALESCE(p.display_name, u.email) AS display_name,
                (SELECT COUNT(*) FROM competition_scores s2 WHERE s2.round_id = s.round_id AND s2.points > s.points) + 1 AS rank
           FROM competition_scores s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN profiles p ON p.id = s.user_id
          WHERE s.round_id = ? AND s.user_id = ?`,
      )
      .bind(round.id, viewerId)
      .first<{ user_id: string; points: number; display_name: string | null; rank: number }>();
    if (me) {
      rows.push({
        user_id: me.user_id,
        rank: me.rank,
        display_name: me.display_name ?? "طالب",
        points: me.points,
        is_me: true,
      });
    }
  }

  return { round, rows };
}
