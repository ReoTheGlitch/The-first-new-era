# العصر الجديد الأول — The First New Era

> منصة تعليمية تفاعلية لطلاب الثانوية العامة في مصر (فيزياء وكيمياء)
>
> An interactive learning platform for Egyptian high-school students — Physics & Chemistry

---

## Stack

| Layer | Tech |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) |
| UI | React 19 · Tailwind CSS v4 · shadcn/ui (Radix) |
| Auth & DB | [Supabase](https://supabase.com) (Auth + Postgres + RLS) |
| AI | Google Gemini (server-only via `@google/genai`) |
| Deployment | [Vercel](https://vercel.com) (via Nitro adapter) |

---

## Quick start

### Prerequisites

- Node.js **≥ 20**
- A free [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (for the AI tutor & exam generator)

### 1 — Clone & install

```bash
git clone https://github.com/reotheglitch/the-first-new-era.git
cd the-first-new-era
npm install
```

### 2 — Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → `anon` key |
| `SUPABASE_URL` | same as `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | same as `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (**keep secret**) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) → Get API key |
| `GEMINI_MODEL` | Optional. Default: `gemini-2.5-flash` |

### 3 — Run the database migrations

In Supabase → SQL Editor, run these scripts **in order**, once each:

1. `supabase/schema.sql` — core tables, RLS policies, demo seed data
2. `supabase/ai-persistence.sql` — AI chat history & generated exam tables

> **Tip:** To skip email confirmation during development, go to Supabase → Authentication → Providers → Email and disable *Confirm email*.

### 4 — Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier auto-format |

---

## Project structure

```
src/
├── routes/                 # File-based pages (TanStack Router)
│   ├── index.tsx           # Landing page
│   ├── auth.tsx            # Login / sign-up
│   └── _authenticated/     # Protected app routes
│       ├── app.index.tsx   # Dashboard
│       ├── app.subjects.*  # Subjects & lesson tree
│       ├── app.lessons.*   # Lesson + interactive lab
│       ├── app.practice.*  # Adaptive practice session
│       ├── app.exams.tsx   # AI-generated exams
│       ├── app.assistant.tsx  # AI tutor chat
│       ├── app.competition.tsx  # Leaderboard & duels
│       ├── app.mistakes.tsx   # Mistake notebook
│       └── app.profile.tsx    # Profile & XP
│
├── features/               # Domain logic (server functions & helpers)
│   ├── student/            # Queries: dashboard, leaderboard
│   ├── exams/              # AI exam generation & submission
│   ├── practice/           # Practice session logic
│   ├── mistakes/           # Mistake classification
│   └── duel/               # Duel / ghost-mode challenge
│
├── lib/ai/                 # Server-only AI layer
│   ├── config.server.ts    # Provider resolver
│   ├── gemini-adapter.server.ts
│   ├── tutor.functions.ts  # Chat server functions
│   └── student-context.server.ts  # Adaptive context builder
│
├── integrations/supabase/  # Supabase client, auth middleware
├── components/             # UI components (shadcn/ui + custom)
│   ├── brand/              # Logo
│   ├── layout/AppShell.tsx # Sidebar / bottom-bar shell
│   ├── labs/               # Interactive SVG physics labs
│   └── ui/                 # shadcn/ui primitives
│
├── config/navigation.ts    # Single source-of-truth for nav links
└── styles.css              # Tailwind v4 theme + design tokens
```

---

## Design system

The app uses a **dark-only** OKLCH color palette with a violet–indigo–electric-blue gradient as the brand accent. All tokens are in `src/styles.css` under `:root {}`.

Key utility classes:

| Class | Purpose |
|---|---|
| `surface-card` | Frosted glass card background |
| `ambient` | Radial gradient glow behind page content |
| `glow-edge` | Violet edge glow on hover |
| `press` | Subtle scale + opacity active state |
| `text-gradient` | Brand gradient text |
| `animate-rise` | Fade-up entrance animation |

---

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are **server-only** — never use a `VITE_` prefix for them.
- Row Level Security (RLS) is enforced at the database layer; all user data is scoped to `auth.uid()`.
- SVG content returned by the AI is sanitized through `src/lib/sanitize-svg.ts` before rendering.
- XP and ranking are computed server-side only; clients cannot submit raw XP values.

---

## Deployment (Vercel)

1. Connect the GitHub repo to Vercel.
2. Add all environment variables from `.env.example` in **Vercel → Project Settings → Environment Variables**.
3. The build command is `npm run build` and the output directory is `.output` (Nitro auto-detected).
4. Enable the [Vercel Analytics](https://vercel.com/analytics) integration for usage tracking.
