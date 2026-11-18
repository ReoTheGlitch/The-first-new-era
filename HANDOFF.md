# Handoff — The first

Last updated: 2026-11-18. Live: **https://thefirst.mrwinter.org**.

Read this if you've never seen the project. Ten minutes gets you to
productive. For anything deeper, follow the links into `docs/`.

## What the product is

An Egyptian Grade-12 learning platform. Arabic-first, dark-mode.
Students work through curriculum lessons, practice concepts with graded
MCQs, chat with an AI tutor, sit AI-generated exams, and compete on a
weekly leaderboard that rolls over every Monday on the Cairo civil
clock.

External brand: **"The first"** (English). Internal Arabic naming kept
via `BRAND_NAME_AR` constant. Tagline: تعلم منهجك الدراسي بطريقة
تفاعلية.

## Where things live

| Thing | Where |
|---|---|
| Live site | https://thefirst.mrwinter.org |
| Repo | https://github.com/ReoTheGlitch/The-first-new-era |
| Dev branch (only branch used) | `ccr-52216415-px8xos` |
| Worker | Cloudflare → Workers & Pages → `new-era-learning` (account `15c5b3be6ca473052a3636a3a2ce21da`) |
| Database | Cloudflare D1 → `new-era-db` (id `b8c72bd3-1dc5-44a7-89d5-c7ca261797b7`) |
| Static assets | Cloudflare KV namespace `new-era-static` (id `3ada463be94644d8ba169751b0e04d66`) |
| Zone | `mrwinter.org` → route `thefirst.mrwinter.org/*` points at `new-era-learning` |
| CI | `.github/workflows/deploy.yml` — runs tsc/lint/tests + `deploy:cf` on push |

## How to run locally

```bash
git clone https://github.com/ReoTheGlitch/The-first-new-era.git
cd The-first-new-era
git checkout ccr-52216415-px8xos
npm install
npm run dev       # http://localhost:3000
```

`.data/dev.db` is created on first access (better-sqlite3), with all
migrations auto-applied. Without `OPENROUTER_API_KEY` set, the tutor
and exam builder return a friendly error; everything else runs.

## How to deploy

```bash
export CLOUDFLARE_API_TOKEN=<token>   # once per shell
npm run deploy:cf
```

What that runs, in order:

1. `node scripts/cf/apply-migrations.mjs` applies pending
   `migrations/*.sql` to remote D1.
2. `CF_BUILD=1 vite build` with the `cloudflare_module` Nitro preset.
3. `scripts/cf/kv-payload.mjs` base64-encodes `.output/public/*` and
   bulk-writes to the KV namespace.
4. `npx wrangler deploy` with a generated `wrangler.deploy.json` that
   binds `STATIC_KV` + `DB` and sets compatibility flags.

Full detail: [`docs/deploy.md`](./docs/deploy.md).

## Secrets

| Secret | Where it lives | Status |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Local shell env OR GitHub Actions repo secret | **Needs to be set in GitHub** for CI auto-deploy; local shell works today |
| `OPENROUTER_API_KEY` | Cloudflare Worker secret | **Set** as of 2026-11-18 — live AI tutor + exam builder work |

None of these are checked into git. The required permissions on the
Cloudflare token are listed in [`docs/deploy.md`](./docs/deploy.md).

## Commands

```bash
npm run dev          # dev server
npm run build:cf     # production build (CF preset)
npm run deploy:cf    # full deploy pipeline
npm run lint         # ESLint + Prettier (0 errors expected)
npm run test         # Vitest (27 tests, all pass)
npm run e2e          # Playwright smoke tests (needs dev server)
npx tsc --noEmit     # strict type check (0 errors expected)
```

## Architecture in one page

```
                                         Cloudflare Worker (new-era-learning)
 browser ── HTTPS → edge ────────────▶  ┌───────────────────────────────────┐
                                        │  scripts/cf/cf-entry.mjs (shim)   │
                                        │  ├─ applySecurityHeaders()        │
                                        │  ├─ STATIC_KV asset serving       │
                                        │  └─ nitro SSR handler             │
                                        │        ↕                          │
                                        │   src/server.ts (TanStack Start)  │
                                        │        ↕                          │
                                        │   createServerFn handlers         │
                                        │   ↳ requireAuth → {db, userId}    │
                                        │        ↕                          │
                                        │   env.DB (D1) via getDb()         │
                                        └───────────────┬───────────────────┘
                                                        │
                                              OpenRouter API (AI only)
```

Full detail: [`docs/architecture.md`](./docs/architecture.md).

## The layers you'll actually edit

| Layer | Path | Notes |
|---|---|---|
| Routes (file-based) | `src/routes/` | Regenerate the type registry on add/remove: `npx @tanstack/router-cli generate` |
| Server functions | `src/features/**/*.functions.ts`, `src/features/**/*.server.ts` | Every DB-reading fn uses `requireAuth` and reads `context.db` + `context.userId` |
| Browser queries | `src/features/student/queries.ts` | Thin react-query wrappers over server fns |
| DB adapter | `src/lib/db/index.server.ts` | D1 binding in Worker, better-sqlite3 in dev |
| Auth | `src/lib/auth/` | password (PBKDF2), session (hashed token, cookie), `require-auth.ts` middleware |
| AI | `src/lib/ai/provider.server.ts` | OpenRouter OpenAI-compat; `generateText`, `generateJson` |
| Security | `src/lib/security/` | Rate limiter + security headers |
| Engagement | `src/lib/engagement/`, `src/lib/time/` | Streak + weekly competition + Cairo date math |
| Brand | `src/components/brand/` | LogoMark SVG + wordmark, `BRAND_NAME` constants |
| Design tokens | `src/styles.css` | OKLCH ramp + type scale + radius scale |
| UI building blocks | `src/components/common.tsx` | Card / PageHeader / StatusBadge / EmptyState / ProgressRing / MathTex / SkeletonBlock |
| Migrations | `migrations/NNNN_*.sql` | SQLite dialect, idempotent, tracked in `_migrations` table |

## Design + content rules (so you don't drift)

- **No gradients.** Not on hero, cards, buttons, borders, SVG defs, or Tailwind utilities.
- **No emoji in UI.** Icons are SVG; even dingbats inside Arabic strings are replaced.
- **No chatbot encouragement.** "أحسنت!"/"ممتاز!"/"Great job!" as decoration are out.
- **Four radii app-wide.** `rounded-sm | rounded-md | rounded-lg | rounded-full`. Nothing else outside shadcn primitives.
- **Type scale.** `xs → 4xl` only. No arbitrary `text-[Npx]`, no `text-5xl+` on content pages.
- **Floating layers.** Hairline border + `shadow-md`. No `shadow-lg`/`shadow-xl`.
- **`tabular-nums`.** Scoped to numeric cells only — NOT applied to `body`.
- **Server fn pattern** — see `docs/architecture.md` → "Server functions". Every DB-reading fn disables `no-explicit-any` and uses a row type cast through `context.db as import("@/lib/db/index.server").Db`. TanStack Start v1 doesn't propagate D1's typed interface through the middleware chain — this is intentional.

Full rulebook: [`docs/ai-slop-notes.md`](./docs/ai-slop-notes.md), [`docs/design-study.md`](./docs/design-study.md), [`docs/brand.md`](./docs/brand.md).

## Adding content

Seed migrations are the only way content enters the DB. Walk through
[`docs/content.md`](./docs/content.md); `migrations/0007_seed_physics.sql` and
`migrations/0010_seed_chemistry.sql` are the two real examples.

Every seeded row starts as `status='unverified'`. Flip to `verified` in a
follow-up migration once a teacher has reviewed it.

## Adding a schema change

```bash
cat > migrations/0012_new_thing.sql <<'SQL'
CREATE TABLE IF NOT EXISTS new_thing (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
SQL
npm run dev          # auto-applies locally
git add migrations/0012_new_thing.sql
git commit -m "feat: add new_thing table"
git push             # CI applies to remote D1 as part of deploy
```

## Working on this codebase with Claude

[`CLAUDE.md`](./CLAUDE.md) is the session orientation document. It
describes:

- The parallel-agent lane discipline (so sub-agents don't collide on
  the same files)
- Model selection rules (Sonnet for coding, Haiku for grep/audit,
  never Opus or Fable)
- Commit convention + attribution footer

For how a feature travels from idea to production:
[`docs/workflow.md`](./docs/workflow.md).

## Open items (things still for a human to do)

1. **Add `CLOUDFLARE_API_TOKEN` as a GitHub repo secret** (Settings → Secrets and variables → Actions) so the GitHub Action deploy step works. Manual deploys from a local shell with the token set already work.
2. **Teacher review of seeded content** — `editorial / unverified` → `verified` in a follow-up migration once reviewed.
3. **(Optional) Turnstile + WAF rules** — flagged as next-step anti-bot hardening in [`docs/security.md`](./docs/security.md).
4. **(Optional) Spaced-repetition scheduler** for practice questions — not in the current roadmap.
5. **(Optional) Parent/teacher dashboard** — not in the current roadmap.

## Document map

| Topic | Doc |
|---|---|
| Full architecture | [docs/architecture.md](./docs/architecture.md) |
| Deploy pipeline | [docs/deploy.md](./docs/deploy.md) |
| Adding lessons / subjects | [docs/content.md](./docs/content.md) |
| Brand identity | [docs/brand.md](./docs/brand.md) |
| Design study (research + heuristics) | [docs/design-study.md](./docs/design-study.md) |
| Anti-AI-slop rules | [docs/ai-slop-notes.md](./docs/ai-slop-notes.md) |
| Performance | [docs/performance.md](./docs/performance.md) |
| Security posture | [docs/security.md](./docs/security.md) |
| Feature → GitHub → Cloudflare workflow | [docs/workflow.md](./docs/workflow.md) |
| November 2026 migration notes | [docs/session-2026-11.md](./docs/session-2026-11.md) |
| Claude Code orientation | [CLAUDE.md](./CLAUDE.md) |
