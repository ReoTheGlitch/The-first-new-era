-- Core identity + curriculum tables (SQLite / Cloudflare D1 dialect).
-- Ported from supabase/schema.sql. IDs are TEXT (crypto.randomUUID() in app code).
-- Timestamps are ISO 8601 TEXT. Booleans are INTEGER 0/1. Arrays/jsonb are JSON TEXT.
-- RLS, grants, functions and triggers are intentionally dropped: access control lives in server functions.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'طالب',
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','moderator','user')),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS content_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  academic_year TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('official','editorial','ai_generated','demo')),
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','pending','verified')),
  notes TEXT,
  retrieved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  accent TEXT NOT NULL DEFAULT 'violet',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','pending','verified')),
  source_id TEXT REFERENCES content_sources(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  summary_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','pending','verified')),
  origin TEXT NOT NULL DEFAULT 'demo' CHECK (origin IN ('official','editorial','ai_generated','demo')),
  source_id TEXT REFERENCES content_sources(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  overview_ar TEXT,
  objectives_ar TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(objectives_ar)),
  body TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(body)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','pending','verified')),
  origin TEXT NOT NULL DEFAULT 'demo' CHECK (origin IN ('official','editorial','ai_generated','demo')),
  source_id TEXT REFERENCES content_sources(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  explanation_ar TEXT,
  formula_tex TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'demo' CHECK (origin IN ('official','editorial','ai_generated','demo')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  prompt_ar TEXT NOT NULL,
  explanation_ar TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  xp_value INTEGER NOT NULL DEFAULT 10,
  origin TEXT NOT NULL DEFAULT 'demo' CHECK (origin IN ('official','editorial','ai_generated','demo')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label_ar TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS courses_subject_id_idx ON courses(subject_id);
CREATE INDEX IF NOT EXISTS units_course_id_idx ON units(course_id);
CREATE INDEX IF NOT EXISTS lessons_unit_id_idx ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS concepts_lesson_id_idx ON concepts(lesson_id);
CREATE INDEX IF NOT EXISTS questions_concept_id_idx ON questions(concept_id);
CREATE INDEX IF NOT EXISTS question_options_question_id_idx ON question_options(question_id);
