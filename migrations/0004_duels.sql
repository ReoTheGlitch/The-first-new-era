-- Live duels (legacy Postgres duels.sql). The plpgsql game logic moved to src/features/duel/duel.server.ts.

CREATE TABLE IF NOT EXISTS duels (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  subject_id TEXT REFERENCES subjects(id),
  host_id TEXT NOT NULL,
  guest_id TEXT,
  question_ids TEXT NOT NULL CHECK (json_valid(question_ids)),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished','cancelled')),
  is_open INTEGER NOT NULL DEFAULT 0 CHECK (is_open IN (0,1)),
  current_index INTEGER NOT NULL DEFAULT 0,
  question_started_at TEXT,
  host_score INTEGER NOT NULL DEFAULT 0,
  guest_score INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS duel_answers (
  duel_id TEXT NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  option_id TEXT,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0,1)),
  ms_taken INTEGER NOT NULL,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (duel_id, user_id, question_index)
);

CREATE INDEX IF NOT EXISTS duels_open_idx ON duels(created_at) WHERE status = 'waiting' AND is_open = 1;
CREATE INDEX IF NOT EXISTS duels_players_idx ON duels(host_id, guest_id);
CREATE INDEX IF NOT EXISTS duel_answers_user_idx ON duel_answers(user_id, created_at DESC);
