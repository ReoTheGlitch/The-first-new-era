// D1-backed fixed-window rate limiter. Server-only.
import type { Db } from "@/lib/db/index.server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Count one hit for (scope, key) in the current fixed window and report whether it is allowed.
 * The increment is a single atomic upsert, so concurrent requests cannot undercount.
 * `nowMs` is injectable for tests.
 */
export async function checkAndIncrement(
  db: Db,
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now(),
): Promise<RateLimitResult> {
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const id = `${scope}:${key}:${windowStartMs}`;
  const row = await db
    .prepare(
      `INSERT INTO rate_limit_counters (id, scope, key, window_start, count, updated_at)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
       RETURNING count`,
    )
    .bind(id, scope, key, windowStart, new Date(nowMs).toISOString())
    .first<{ count: number }>();
  const count = row?.count ?? 1;
  // Opportunistic cleanup of long-expired windows (~1% of calls).
  if (Math.random() < 0.01) {
    const cutoff = new Date(nowMs - 2 * windowMs - 86_400_000).toISOString();
    await db
      .prepare("DELETE FROM rate_limit_counters WHERE window_start < ?")
      .bind(cutoff)
      .run()
      .catch(() => undefined);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.max(1, Math.ceil((windowStartMs + windowMs - nowMs) / 1000)),
  };
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:.]+$/i;

function validIp(v: string | null | undefined): string | null {
  const s = v?.trim();
  if (!s || s.length > 45) return null;
  if (IPV4.test(s)) return s;
  if (s.includes(":") && IPV6.test(s)) return s;
  return null;
}

/** Client IP from Cloudflare's header, falling back to the first X-Forwarded-For hop. */
export function clientIp(headers: Headers): string {
  return (
    validIp(headers.get("cf-connecting-ip")) ??
    validIp(headers.get("x-forwarded-for")?.split(",")[0]?.trim()) ??
    "unknown"
  );
}
