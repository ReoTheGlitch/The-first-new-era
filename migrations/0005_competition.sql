-- Competition modes + question packs (supabase/competition-modes.sql).
-- Pack selection and mode rules moved to src/features/duel/duel.server.ts.

ALTER TABLE duels ADD COLUMN mode TEXT NOT NULL DEFAULT 'points' CHECK (mode IN ('points','speed','penalties'));
ALTER TABLE duels ADD COLUMN pack_scope TEXT NOT NULL DEFAULT 'subject' CHECK (pack_scope IN ('subject','unit','lesson'));
ALTER TABLE duels ADD COLUMN pack_id TEXT;
