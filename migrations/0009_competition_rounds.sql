-- Weekly competition rounds. Points reset every Monday 00:00 Africa/Cairo;
-- getOrCreateActiveRound() rotates stale rounds and creates the current one.

CREATE TABLE IF NOT EXISTS competition_rounds (
  id TEXT PRIMARY KEY,
  starts_at TEXT NOT NULL,        -- ISO instant of Monday 00:00 Cairo
  ends_at TEXT NOT NULL,          -- ISO instant of the following Monday 00:00 Cairo
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS competition_rounds_starts_at_uq
  ON competition_rounds(starts_at);
CREATE INDEX IF NOT EXISTS competition_rounds_active_idx
  ON competition_rounds(active, ends_at);

CREATE TABLE IF NOT EXISTS competition_scores (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES competition_rounds(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, round_id)
);
CREATE INDEX IF NOT EXISTS competition_scores_leaderboard_idx
  ON competition_scores(round_id, points DESC);
