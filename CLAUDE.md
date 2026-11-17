# CLAUDE.md — session orientation

Fast context for a Claude Code session. Full detail lives in `docs/`.

## The product

**The first** — an Egyptian Grade-12 learning platform (Physics,
Chemistry). Arabic-first (RTL), dark-only design on OKLCH tokens.
Students practice concepts, take AI-generated exams, chat with a tutor,
and track streaks + weekly competition points.

## The stack

- **TanStack Start v1.168** on **Cloudflare Workers** (one worker, one
  origin).
- **Cloudflare D1** for data (binding `DB`), **Workers KV** for static
  assets (binding `STATIC_KV`).
- **OpenRouter** → Gemini 2.5 Flash for AI.
- **Self-hosted auth** (PBKDF2 WebCrypto + session cookie). No Supabase.

See `docs/architecture.md` for the full picture.

## Dev branch

Always work on `ccr-52216415-px8xos`. Never push to `main`.

## Commands

```bash
npm run dev          # http://localhost:3000, better-sqlite3 .data/dev.db
npm run build        # production build
npm run build:cf     # same, with Cloudflare preset
npm run deploy:cf    # apply D1 migrations → build → upload KV → wrangler deploy
npm run lint         # 0 errors expected
npm run test         # vitest
npx tsc --noEmit     # 0 errors expected
```

## Patterns that aren't bugs

- Every file that accesses `context.db` disables
  `@typescript-eslint/no-explicit-any` and casts row types. TanStack
  Start v1 does not propagate D1's typed interface through the
  middleware chain — this is a framework limit.
- `head: ({ loaderData }) => …` needs `loaderData as { … } | undefined`
  because v1 Router doesn't propagate loader types into `head()`.
- `bg-brand`, `bg-tile`, `text-gradient` utilities are kept for backward
  compatibility but now resolve to **solid** colors. See
  `docs/ai-slop-notes.md` for the rule set.

## Routes

See `docs/architecture.md` → "Routing layout". Regenerate the type
registry when files are added or removed:

```bash
npx @tanstack/router-cli generate
```

## Data

See `docs/architecture.md` → "Database" and `docs/content.md` for how to
add lessons. Migrations in `migrations/*.sql`, auto-applied in dev, and
applied by `scripts/cf/deploy.sh` on every deploy.

## AI

`src/lib/ai/provider.server.ts` — OpenRouter, OpenAI-compatible API.
Model override: env `AI_MODEL`. Key: env `OPENROUTER_API_KEY`
(worker secret in prod; in this cloud container the proxy accepts the
placeholder `proxy-injected`).

## Deploy

```bash
npm run deploy:cf
```

See `docs/deploy.md`. The worker needs one real secret:
`OPENROUTER_API_KEY` set in the Cloudflare dashboard.

## Commit convention

```
feat: short description
fix: short description
refactor: short description
docs: short description
chore: short description
```

End each commit message with:

```
Co-Authored-By: Claude <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LoCBXy2BNS8Xqhaxm3GZYf
```

(The `Claude` token is replaced with the specific model variant by the
session reminders on each turn.)
