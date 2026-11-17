# Architecture

Snapshot of how the platform is wired. Updated November 2026.

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1.168 + TanStack Router v1.170 (file-based, SSR) |
| UI | React 19, Tailwind CSS v4 (OKLCH tokens), Radix primitives |
| Build | Vite 8, Nitro (output preset `cloudflare_module` when `CF_BUILD=1`) |
| Runtime | Cloudflare Workers — one worker, single origin |
| Database | Cloudflare D1 (SQLite) — binding `DB`, database `new-era-db` |
| Static assets | Cloudflare Workers KV — binding `STATIC_KV` |
| AI | OpenRouter (OpenAI-compatible API) → Gemini 2.5 Flash |
| Auth | Self-hosted — PBKDF2 WebCrypto + session cookie |

Nothing else is a hard runtime dependency. OpenRouter is the only outbound
host the app calls at request time.

## Request flow

1. The browser hits `thefirst.mrwinter.org`.
2. Cloudflare routes to the `new-era-learning` worker.
3. `scripts/cf/cf-entry.mjs` wraps the Nitro-built server entry:
   - A prefix-matched path inside `_build/` or `assets/` is served from KV
     by `env.ASSETS.fetch(req)`, where `ASSETS` is a shim that reads
     `env.STATIC_KV`.
   - Everything else goes through Nitro → TanStack Start's SSR handler.
4. Server functions (`createServerFn`) run inside the worker and reach
   `env.DB` via `globalThis.__CF_ENV__.DB` through `src/lib/db/index.server.ts`.
5. Auth-gated server functions pass through `requireAuth` which reads
   the `session` cookie, looks up a session row, and injects
   `{ db, userId }` into context.

## Server functions

`createServerFn` from `@tanstack/react-start` is the only path from
browser to database. Direct DB access never happens in the browser.

The auth middleware:

```ts
import { requireAuth } from "@/lib/auth/require-auth.server";

export const getProfile = createServerFn("GET", { middleware: [requireAuth] })
  .handler(async ({ context }) => {
    const row = await context.db
      .prepare("SELECT display_name FROM profiles WHERE id = ?")
      .bind(context.userId)
      .first();
    return row;
  });
```

Rate limits are enforced by counting rows in `ai_interactions` with a
timestamp filter — 30 tutor requests per hour, 5 exams per hour.

## Database

Schema lives in `migrations/` as numbered `.sql` files. Every migration
is idempotent (`CREATE TABLE IF NOT EXISTS`, etc.) and recorded in the
`_migrations` table on first application.

**Local dev** (vite, vitest): `src/lib/db/index.server.ts` opens
`.data/dev.db` with better-sqlite3 and auto-applies pending migrations on
first access.

**Remote (Cloudflare D1)**: `node scripts/cf/apply-migrations.mjs` reads
the directory, skips anything already in `_migrations`, and applies the
rest via the REST API. `scripts/cf/deploy.sh` calls this before every
deploy, so pushing a new `migrations/0012_*.sql` and running the deploy
script is enough to roll out a schema change.

Key tables: `users`, `sessions` (auth), `profiles`, `subjects`, `courses`,
`units`, `lessons`, `concepts`, `questions`, `question_options`,
`quiz_attempts`, `xp_transactions`, `streaks`, `achievements`,
`user_achievements`, `ai_chat_conversations`, `ai_chat_messages`,
`ai_generated_exams`, `ai_interactions`, `competition_rounds`,
`competition_scores`.

## AI provider

`src/lib/ai/provider.server.ts` is a thin OpenAI-compatible client:

- Hits `https://openrouter.ai/api/v1/chat/completions`.
- `generateText` for chat, `generateJson` for strict-schema JSON (exam generation).
- Default model `google/gemini-2.5-flash`, override via env `AI_MODEL`.
  Fallback on transport failure: `google/gemini-2.5-flash-lite`.
- Reads `OPENROUTER_API_KEY`; in this cloud container the value
  `proxy-injected` is treated as a placeholder the proxy fills in.
- In Node (dev) uses undici's `ProxyAgent` so the container's HTTPS
  proxy and CA bundle are picked up. In the worker it's plain `fetch`.

## Streaks & weekly competition

Both are pinned to the Africa/Cairo civil clock — a student at 23:30
Cairo and again at 00:30 Cairo lands on two separate streak days.

- `src/lib/time/cairo.ts`: `cairoDate`, `cairoAddDays`,
  `cairoWeekStartIso`, `cairoNextWeekStartIso`.
- `src/lib/engagement/streak.server.ts`: `touchStreak(db, userId)` is
  idempotent per Cairo day. Any server function representing a real
  student activity (lesson opened, practice submitted, exam finished,
  tutor message sent) calls it. A full missed day resets `current_streak`
  to 1 on the next activity. `getStreak()` zeros out the displayed
  current streak if the last activity was before yesterday, without
  overwriting the row.
- `src/lib/engagement/competition.server.ts`:
  `getOrCreateActiveRound(db)` opens a round on first call after each
  Monday 00:00 Cairo rollover. `awardCompetitionPoints` upserts into
  `competition_scores`. `getActiveLeaderboard` returns the top N for the
  active round and the viewer's own rank if they're not in it.
- `src/features/engagement/WeeklyCountdown.tsx`: client component,
  ticks every 30s, shows `days / hours / minutes` to the round's `ends_at`.

## Routing layout

```
src/routes/
  __root.tsx                    # root layout; QueryClient, ErrorBoundary, SW registration
  index.tsx                     # public landing
  auth.tsx                      # /auth login + signup
  _authenticated/
    route.tsx                   # auth guard — reads session cookie, 401 → /auth
    app.tsx                     # AppShell wrapper
    app.index.tsx               # /app dashboard
    app.assistant.tsx           # /app/assistant AI tutor
    app.exams.tsx               # /app/exams AI exam builder
    app.competition.tsx         # /app/competition leaderboard + weekly countdown
    app.mistakes.tsx            # /app/mistakes notebook
    app.profile.tsx             # /app/profile
    app.subjects.$subjectSlug.tsx
    app.lessons.$lessonId.tsx
    app.practice.$conceptId.tsx
```

Regenerate the type registry whenever a route file is added or removed:

```bash
npx @tanstack/router-cli generate
```

## Styling conventions

- OKLCH tokens everywhere. No hex colors in component code.
- Dark-first; a light-mode token set under `[data-theme="light"]` and
  `@media (prefers-color-scheme: light)`.
- Utilities: `press` (active-scale), `glow-edge`, `ambient` (now a no-op),
  `text-gradient` (now a solid primary), `bg-brand`, `bg-tile` — the
  latter three resolved to solids during the anti-AI-slop pass.
- No gradients anywhere in component code. No emoji in UI (SVG icons via
  `AppIcon` and inline per-use).

## Known typed-middleware quirk

TanStack Start v1 does not fully type the D1-backed context chain. Every
server function that touches `context.db` casts the result row type,
and files that need it start with:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
```

This is a framework limitation, not a bug in our code.

## `loaderData` cast in `head()`

TanStack Router v1 does not propagate loader return types into `head()`
— `loaderData` infers as `never`. Keep casting it explicitly:

```ts
head: ({ loaderData }) => ({
  meta: [{
    title: `${(loaderData as { titleAr?: string } | undefined)?.titleAr ?? "..."} — The first`,
  }],
})
```
