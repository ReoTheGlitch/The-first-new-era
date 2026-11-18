# CLAUDE.md — session orientation

Fast context for a Claude Code session. Full detail lives in `docs/`.

## The product

**The first** — an Egyptian Grade-12 learning platform (Physics,
Chemistry). Arabic-first (RTL), dark-only design on OKLCH tokens.
Students practice concepts, take AI-generated exams, chat with a tutor,
and track streaks + weekly competition points.

## The stack

- **TanStack Start v1.168** on **Cloudflare Workers** (one worker, one origin).
- **Cloudflare D1** for data (binding `DB`), **Workers KV** for static
  assets (binding `STATIC_KV`).
- **OpenRouter** → `google/gemini-2.5-flash` for AI.
- **Self-hosted auth** (PBKDF2 WebCrypto + session cookie). No Supabase.

See `docs/architecture.md` for the full picture.

## Dev branch

Always work on `ccr-52216415-px8xos`. Never push to `main`.

## Commands

```bash
npm run dev          # http://localhost:3000, better-sqlite3 .data/dev.db
npm run build:cf     # production build with Cloudflare preset
npm run deploy:cf    # migrations → build → KV upload → wrangler deploy
npm run lint         # 0 errors expected
npm run test         # vitest
npx tsc --noEmit     # 0 errors expected
```

## Data

- **Cloudflare D1**, database `new-era-db`, bound to the Worker as `DB`
  via `scripts/cf/cf-entry.mjs` (`globalThis.__CF_ENV__.DB`).
- Schema lives in `migrations/NNNN_*.sql` (SQLite dialect). Numbered,
  idempotent, tracked in the `_migrations` table. Remote: run
  `node scripts/cf/apply-migrations.mjs` (also invoked by `deploy:cf`).
- Adapter: `src/lib/db/index.server.ts` — `getDb()` returns a
  D1-shaped `Db` (`prepare(sql).bind(...).first/all/run`). In the
  Worker it's the binding; in Node it's better-sqlite3 over
  `.data/dev.db` (git-ignored), with migrations auto-applied on first
  access. The Node wrapper rejects `undefined`/boolean binds to match
  D1's semantics. See `docs/content.md` for how to author lessons.
- Conventions: ids `TEXT` (`crypto.randomUUID()`), timestamps ISO-8601
  `TEXT`, booleans `INTEGER 0/1`, jsonb → JSON `TEXT`. No triggers / no
  RLS: every server function authorises with `requireAuth` and scopes
  queries by `context.userId`. D1 caps bound params at 100 per statement;
  chunk long `IN (...)` lists.
- Auth lives in `src/lib/auth/`. `require-auth.ts` is intentionally
  **not** a `.server.ts` module — the middleware object is referenced
  from client bundles and must stay isomorphic; the handler itself
  remains server-only.
- Server data access lives in `*.functions.ts` (via `createServerFn`)
  and `*.server.ts` (e.g. `features/duel/duel.server.ts`). The browser
  never touches the DB directly.

## Routes

See `docs/architecture.md` → "Routing layout". Regenerate the type
registry when files are added or removed:

```bash
npx @tanstack/router-cli generate
```

## AI

`src/lib/ai/provider.server.ts` — OpenRouter, OpenAI-compatible API.
Model override: env `AI_MODEL`. Key: env `OPENROUTER_API_KEY` (worker
secret in prod; in this cloud container the proxy accepts the
placeholder `proxy-injected`).

## Deploy

```bash
npm run deploy:cf
```

See `docs/deploy.md`. Live site: `https://thefirst.mrwinter.org`. The
worker needs one real secret: `OPENROUTER_API_KEY` set in the Cloudflare
dashboard.

## Security

Auth endpoints are rate-limited via D1 (`src/lib/security/rate-limit.server.ts`) and the Worker adds CSP/HSTS and other security headers to every response (`scripts/cf/cf-entry.mjs`). See `docs/security.md`.

## Patterns that aren't bugs

- Every server function that touches `context.db` begins with
  `/* eslint-disable @typescript-eslint/no-explicit-any */` and casts
  row types. TanStack Start v1 does not propagate D1's typed interface
  through the middleware chain.
- `head: ({ loaderData }) => …` needs `loaderData as { … } | undefined`
  — v1 Router doesn't propagate loader types into `head()`.
- `bg-brand`, `bg-tile`, `text-gradient` utilities resolve to solid
  colors (not gradients). See `docs/ai-slop-notes.md`.

## Parallel agents — lane discipline

When this session spawns multiple sub-agents in parallel, each one owns
a lane. Collisions = merge pain. Cross-lane edits must be coordinated
through the parent session.

### Lanes

| Lane | Files it owns |
|---|---|
| **DB / auth** | `migrations/0001`–`0008`, `0011`, `src/lib/db/`, `src/lib/auth/`, `src/lib/security/`, `src/features/**/*.functions.ts`, `src/features/**/*.server.ts`, `src/features/**/queries.ts`, `src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx` |
| **AI provider** | `src/lib/ai/` (every file). May edit the model-call line inside `*.functions.ts` files from the DB lane **only** by coordinating with the DB agent — write the DB lane's agent first and let AI patch the calls after. |
| **Content seed** | `migrations/0010+` **only**. Never schema changes. |
| **UI / slop** | `src/components/`, `src/routes/**/*.tsx` **except** `route.tsx` and `auth.tsx`, `src/styles.css`, `public/manifest.json`, `public/sw.js` |
| **Engagement** | `src/lib/time/`, `src/lib/engagement/`, `src/features/engagement/`, `migrations/0009_competition_rounds.sql` |
| **Docs / meta** | `docs/`, `CLAUDE.md`, `README.md`, `.env.example` (append-only), `scripts/cf/` |

### Shared files

`package.json` and the lockfile are append-safe (adding deps) but risky
to remove from — if two agents both remove a package, one merge wins. Have
one agent own all `npm install/uninstall` operations per run.

### Commit discipline

- `git fetch origin ccr-52216415-px8xos && git merge --no-edit FETCH_HEAD`
  **before every commit**.
- One commit = one coherent change. Push immediately.
- Never force-push. Never rebase someone else's work.
- Attribution footer on every commit (see "Commit convention" below).

### Model selection

- **Sonnet** for feature coding, UI, migrations, product work. Default.
- **Haiku** for bulky reads, grep audits, verifications, test runs,
  large-file summaries.
- **Never Opus. Never Fable.** (These are too costly for session work.)
- Forks inherit the parent model. If the parent is Opus/Fable, use
  `subagent_type: "general-purpose"` with an explicit `model` override
  instead of forking.

### Scope discipline

Every parent-written agent brief ends with:
- the files/lanes the agent may touch
- the files/lanes it must leave alone (name any parallel agent's lane)
- a verify step (`npx tsc --noEmit`, `npm run lint`, targeted smoke)
- "do not deploy — the coordinator deploys after all agents land"

Agents report back with a concise handback. The coordinator deploys.

## Commit convention

```
feat: short description
fix: short description
refactor: short description
docs: short description
chore: short description
style: short description
```

End each commit message with:

```
Co-Authored-By: Claude <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LoCBXy2BNS8Xqhaxm3GZYf
```

(The `Claude` token is replaced with the specific model variant by the
session reminders on each turn.)
