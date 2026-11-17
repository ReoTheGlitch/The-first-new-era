-- Fixed-window rate limit counters (see src/lib/security/rate-limit.server.ts).
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  id TEXT PRIMARY KEY,                       -- "scope:key:window_start_epoch_ms"
  scope TEXT NOT NULL,                       -- "auth.signup", "auth.signin.ip", "auth.signin.ip_email"
  key TEXT NOT NULL,                         -- IP address, or IP|email for login
  window_start TEXT NOT NULL,                -- ISO timestamp of the window start
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS rate_limit_lookup ON rate_limit_counters(scope, key, window_start);
