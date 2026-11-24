# العصر الجديد الأول · The First "New Era"

An Arabic-language learning platform for Egyptian Grade‑12 students (الثانوية العامة) covering
**physics and chemistry** — lessons, adaptive practice, AI‑generated exams, a built‑in AI tutor,
duels, and weekly competitions.

> The app UI is in Arabic (RTL). This README is in English for contributors.

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19) + Vite 8 |
| Styling | Tailwind CSS v4 (OKLCH) + shadcn/ui |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, Row‑Level Security |
| AI | [OpenRouter](https://openrouter.ai) → `google/gemini-2.5-flash` (direct Google Gemini as fallback) |
| Hosting | [Cloudflare Workers](https://workers.cloudflare.com) via Nitro (`cloudflare_module`) |
| Math rendering | KaTeX (lazy‑loaded) |

## Features

- **Lessons & concepts** — structured physics/chemistry content with interactive SVG labs.
- **Adaptive practice** — questions tuned to the student's level and weak topics.
- **AI tutor** — explains concepts in Arabic with LaTeX math and generated diagrams.
- **AI exam generator** — multiple‑choice exams by subject/difficulty, auto‑graded.
- **Gamification** — XP, streaks (Cairo‑local), weekly competitions, 1v1 duels.
- **Mistakes tracking** — review and reinforce past errors.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenRouter](https://openrouter.ai) API key for the AI features

## Local setup

```bash
git clone https://github.com/ReoTheGlitch/The-first-new-era
cd The-first-new-era
npm install
cp .env.example .env     # then fill in the values (see below)
npm run dev              # http://localhost:3000
```

### Database

In the Supabase **SQL Editor**, run the files in `supabase/` once, in this order:

1. `schema.sql` — core tables, RLS policies, seed data
2. `ai-persistence.sql` — AI tutor conversations & generated exams
3. `competition-modes.sql`, `duels.sql` — gamification
4. `content-physics.sql` — physics lesson/question content

> For easy testing, temporarily disable **Confirm email** under Supabase → Authentication → Providers → Email.

## Environment variables

All server‑side keys are read from the environment and are **never** exposed to the browser
(no `VITE_` prefix). `VITE_`‑prefixed values are inlined into the client bundle at build time.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | build + client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build + client | Supabase anon/publishable key |
| `SUPABASE_URL` | server | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | server | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service role key (rate limits, admin reads) — **secret** |
| `OPENROUTER_API_KEY` | server | OpenRouter API key — **secret** |
| `OPENROUTER_MODEL` | server | Model id (default `google/gemini-2.5-flash`) |
| `GEMINI_API_KEY` | server | Optional: direct Google Gemini fallback (used only if `OPENROUTER_API_KEY` is empty) |

Copy `.env.example` to `.env` and fill it in. **Never commit a real `.env`** — it is gitignored, and
`.env.example` must stay placeholder‑only.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build (targets Cloudflare Workers) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run deploy:cf` | Build + deploy to Cloudflare Workers |
| `npm run cf:preview` | Build + run the Worker locally with `wrangler dev` |

## Deployment (Cloudflare Workers)

The build uses the Nitro `cloudflare_module` preset and auto‑generates `.output/server/wrangler.json`
(with `nodejs_compat` and the assets binding). Supabase remains the backend — only compute runs on
Cloudflare, so Row‑Level Security is preserved.

**Option A — GitHub Actions (recommended).** Add these **repo secrets** (Settings → Secrets and
variables → Actions): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`. Pushing to `main` (or a manual run of the **Deploy** workflow)
builds and deploys.

**Option B — local.** `CLOUDFLARE_API_TOKEN=<token> npm run deploy:cf`

After the first deploy, set the **Worker runtime secrets** in the Cloudflare dashboard (or
`wrangler secret put <NAME>`): `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Then point your custom domain at the Worker via a Workers Custom Domain.

## Project structure

```
src/
  routes/            TanStack Start file-based routes (_authenticated/ = app shell)
  features/          Domain logic (practice, exams, duel, mistakes, student)
  lib/ai/            AI tutor: provider factory, OpenRouter/Gemini adapters (server-only)
  components/        UI (shadcn/ui), brand, labs, layout
  integrations/      Supabase client, auth middleware, generated DB types
supabase/            SQL schema, RLS, seed content
```

## License

No license is set. Add one before redistributing.
