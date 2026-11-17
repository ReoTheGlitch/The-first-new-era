# The first

An Egyptian Grade-12 learning platform. Arabic-first, dark-mode. Students
move through curriculum lessons, practice concepts with graded MCQs,
chat with an AI tutor, sit AI-generated exams, and compete on a weekly
leaderboard that rolls over every Monday on the Cairo civil clock.

Live: **https://thefirst.mrwinter.org**

## Stack

- TanStack Start + TanStack Router (file-based routing, SSR)
- React 19, Tailwind v4 (OKLCH), Radix primitives
- Nitro → Cloudflare Workers (`cloudflare_module` preset)
- Cloudflare D1 (SQLite) for data, Workers KV for static assets
- OpenRouter for AI (default model: `google/gemini-2.5-flash`)
- Self-hosted auth — PBKDF2 WebCrypto + session cookie

## Quick start

```bash
git clone https://github.com/ReoTheGlitch/The-first-new-era.git
cd The-first-new-era
npm install
cp .env.example .env     # optional — only the AI key matters locally
npm run dev              # http://localhost:3000
```

First-run notes:

- The dev database (`.data/dev.db`, better-sqlite3) is created on first
  access and migrations in `migrations/` are auto-applied.
- Without `OPENROUTER_API_KEY` set, the tutor and exam builder return a
  friendly error; everything else runs normally.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build (Node preset)
npm run build:cf     # production build (Cloudflare preset)
npm run deploy:cf    # migrations → build → KV upload → wrangler deploy
npm run lint         # ESLint + Prettier
npm run format       # auto-fix Prettier
npm run test         # vitest unit tests
npm run e2e          # Playwright smoke tests (dev server must be running)
npx tsc --noEmit     # strict type check
```

## Project layout

```
.
├── migrations/              # numbered SQLite migrations, auto-applied dev + prod
├── src/
│   ├── routes/              # TanStack file-based routes
│   ├── features/            # feature modules (student, duel, exams, practice, mistakes, engagement)
│   ├── components/          # UI components, layout, brand, achievements
│   ├── lib/
│   │   ├── db/              # D1 adapter (better-sqlite3 in dev)
│   │   ├── auth/            # password + session + requireAuth middleware
│   │   ├── ai/              # OpenRouter provider + tutor & exam server fns
│   │   ├── engagement/      # streak + weekly competition
│   │   └── time/            # Cairo-local date math
│   ├── integrations/supabase/  # retired — nothing imports it, slated for deletion
│   ├── server.ts            # Cloudflare fetch handler (SSR entry)
│   └── styles.css           # Tailwind v4 + OKLCH tokens
├── scripts/cf/              # deploy.sh, apply-migrations.mjs, cf-entry.mjs, kv-payload.mjs
├── docs/                    # architecture / deploy / content / design notes
├── CLAUDE.md                # Claude Code session orientation
└── README.md                # this file
```

## Dev branch

All feature work goes on `ccr-52216415-px8xos`. The deploy script and
GitHub automation watch this branch.

## Documentation

| Topic | Where |
|---|---|
| How the pieces fit | [docs/architecture.md](./docs/architecture.md) |
| How to deploy | [docs/deploy.md](./docs/deploy.md) |
| Adding lessons / subjects | [docs/content.md](./docs/content.md) |
| UI design rules | [docs/ai-slop-notes.md](./docs/ai-slop-notes.md) |
| November 2026 migration notes | [docs/session-2026-11.md](./docs/session-2026-11.md) |
| Claude session orientation | [CLAUDE.md](./CLAUDE.md) |

## Status

| Area | State |
|---|---|
| Auth | Working — custom session cookie over D1 |
| Physics content | Chapters 1-2 seeded (`migrations/0007`), teacher review pending |
| Chemistry content | Chapters 1-2 seeded (`migrations/0010`), teacher review pending |
| AI tutor | Wired to OpenRouter; needs `OPENROUTER_API_KEY` secret on the worker |
| Weekly competition | Round rotation + countdown implemented |
| Streaks | Cairo-local, idempotent per day |
| PWA | Service worker caches static assets, bypasses openrouter.ai |

## License

Private project. Not currently open-source licensed.
