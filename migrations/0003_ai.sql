-- AI persistence + learning preferences (supabase/schema.sql + supabase/ai-persistence.sql).

CREATE TABLE IF NOT EXISTS learning_preferences (
  user_id TEXT PRIMARY KEY,
  explanation_style TEXT NOT NULL DEFAULT 'balanced',
  explanation_length TEXT NOT NULL DEFAULT 'detailed',
  daily_goal_xp INTEGER NOT NULL DEFAULT 50 CHECK (daily_goal_xp BETWEEN 10 AND 500),
  reduce_motion INTEGER NOT NULL DEFAULT 0 CHECK (reduce_motion IN (0,1)),
  large_text INTEGER NOT NULL DEFAULT 0 CHECK (large_text IN (0,1)),
  notify_streak INTEGER NOT NULL DEFAULT 1 CHECK (notify_streak IN (0,1)),
  notify_revision INTEGER NOT NULL DEFAULT 1 CHECK (notify_revision IN (0,1)),
  show_on_leaderboard INTEGER NOT NULL DEFAULT 1 CHECK (show_on_leaderboard IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_chars INTEGER NOT NULL,
  response_chars INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ai_interactions_user_created_idx ON ai_interactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  subject TEXT CHECK (subject IN ('physics','chemistry') OR subject IS NULL),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ai_chat_conversations_user_updated_idx ON ai_chat_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 6000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ai_chat_messages_conversation_created_idx ON ai_chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ai_chat_messages_user_idx ON ai_chat_messages(user_id);

CREATE TABLE IF NOT EXISTS ai_generated_exams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('physics','chemistry')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  topic TEXT,
  exam_title TEXT NOT NULL,
  questions TEXT NOT NULL CHECK (json_valid(questions)),
  answers TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(answers)),
  score INTEGER,
  submitted INTEGER NOT NULL DEFAULT 0 CHECK (submitted IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS ai_generated_exams_user_created_idx ON ai_generated_exams(user_id, created_at DESC);
