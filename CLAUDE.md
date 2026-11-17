# CLAUDE.md — AI Session Context

This file gives Claude Code sessions fast orientation on the project without reading every file.

## Project

**Egyptian Grade 12 learning platform** — Physics & Chemistry. Arabic-first (RTL), dark-only design (OKLCH tokens). Students practice concepts, take AI-generated exams, chat with an AI tutor, and track XP/streaks/achievements.

## Dev Branch

```
ccr-52216415-px8xos
```

Always develop on this branch. Never push directly to `main`.

## Run Commands

```bash
npm run dev          # dev server → http://localhost:3000
npm run build        # production build
npm run lint         # ESLint + Prettier (must be 0 errors before committing)
npm run format       # auto-fix Prettier
npm run test         # Vitest unit tests (9 tests, all must pass)
npm run e2e          # Playwright smoke tests (needs dev server running)
npx tsc --noEmit     # TypeScript check (must be 0 errors before committing)
```

## Framework

- **TanStack Start v1.168** + **TanStack Router v1.170** — file-based routing, SSR
- **React 19**, **Tailwind CSS v4** (OKLCH color space, dark-first)
- **Vite 8** build

## Key Architectural Decisions

### Server Functions
All AI calls, DB mutations, and auth-gated reads use `createServerFn` from `@tanstack/react-start`. These never run in the browser.

### Auth Middleware
`src/integrations/supabase/auth-middleware.ts` exports `requireSupabaseAuth`. It injects `{ supabase, userId, claims }` into the server function context. **Every server function that touches the DB uses this middleware.**

### `context.supabase as any`
TanStack Start v1 does not fully type the Supabase client through the middleware context chain. Every server function does `context.supabase as any` — this is correct and intentional, not a bug. Each file has `/* eslint-disable @typescript-eslint/no-explicit-any */` at the top.

### `loaderData` typing in `head()`
TanStack Router v1 does not propagate loader return types into the `head()` function — `loaderData` infers as `never`. The workaround is an explicit type cast:
```ts
head: ({ loaderData }) => ({
  meta: [{ title: `${(loaderData as { titleAr?: string } | undefined)?.titleAr ?? "fallback"}` }]
})
```

### AI
- Provider: OpenRouter (OpenAI-compatible `chat/completions`, plain `fetch`, no SDK) — `src/lib/ai/provider.server.ts` (`generateText`, `generateJson`)
- Default model: `google/gemini-2.5-flash` (env `AI_MODEL` to override)
- Fallback (one retry on 5xx/429/model-unavailable): `google/gemini-2.5-flash-lite` (`gemini-2.0-flash-lite-001` is no longer listed on OpenRouter)
- Exams use `response_format: json_schema` (strict) with `max_tokens: 4096`; parse failure retries once with a "return ONLY valid JSON" amendment
- Env: `OPENROUTER_API_KEY` (Worker secret in prod). In dev it can stay blank: the agent proxy injects the key (code sends `Bearer proxy-injected`). In Node dev the module builds an undici `ProxyAgent` from `HTTPS_PROXY`/`NODE_EXTRA_CA_CERTS`; in the Worker plain `fetch` is used.
- Config: `src/lib/ai/config.server.ts`
- Rate limits: 30 req/hr (tutor), 5 exams/hr — enforced by Supabase row count in server functions

### Styling
- **Dark-only** design. Light mode tokens added in `src/styles.css` for the theme toggle, but the default brand is dark violet-indigo-blue.
- OKLCH color space throughout — no hex literals in component code.
- Key utilities: `press` (active scale), `glow-edge`, `ambient`, `text-gradient`
- CSS file: `src/styles.css` — Tailwind v4 `@theme`, custom `@keyframes`, `@utility` blocks

### Route Structure
```
src/routes/
  __root.tsx              ← root layout, QueryClientProvider, ErrorBoundary, SW registration
  auth.tsx                ← login/signup/reset (no auth required)
  index.tsx               ← public landing → redirects to /app
  _authenticated/
    route.tsx             ← Supabase auth guard
    app.tsx               ← AppShell wrapper
    app.index.tsx         ← /app dashboard
    app.assistant.tsx     ← /app/assistant AI chat
    app.exams.tsx         ← /app/exams AI exam builder
    app.competition.tsx   ← /app/competition leaderboard
    app.mistakes.tsx      ← /app/mistakes mistake notebook
    app.profile.tsx       ← /app/profile stats + achievements
    app.subjects.*.tsx    ← /app/subjects subject pages
    app.lessons.$lessonId.tsx     ← lesson reader
    app.practice.$conceptId.tsx   ← MCQ practice
```

### Route Tree
If you add or remove route files, regenerate the type registry:
```bash
npx @tanstack/router-cli generate
```

## Database

Supabase Postgres with RLS. Key tables: `profiles`, `subjects`, `courses`, `units`, `lessons`, `concepts`, `questions`, `quiz_attempts`, `xp_transactions`, `streaks`, `achievements`, `user_achievements`, `ai_chat_conversations`, `ai_chat_messages`, `ai_generated_exams`, `ai_interactions`, `learning_preferences`.

Client: `src/integrations/supabase/client.ts` (browser) — used in `src/features/student/queries.ts`.
Server: injected via `requireSupabaseAuth` middleware into `createServerFn` context.

## Components

- `src/components/common/` — `Card`, `PageHeader`, `SkeletonBlock` (`role="status"`), `StatusBadge`, `MathTex`
- `src/components/layout/AppShell.tsx` — sidebar + mobile nav + `<StudyTimer />` + `<CommandPalette />`
- `src/components/CommandPalette.tsx` — Ctrl+K / ⌘K overlay
- `src/components/StudyTimer.tsx` — floating Pomodoro (25/5/15 min)
- `src/components/LessonNotes.tsx` — collapsible per-lesson notepad
- `src/components/ThemeToggle.tsx` — dark/light/system cycle
- `src/components/ErrorBoundary.tsx` — React class error boundary wrapping `<Outlet />`
- `src/components/achievements/AchievementUnlock.tsx` — spring-pop popup

## PWA

- Manifest: `public/manifest.json`
- Service worker: `public/sw.js` — vanilla JS, cache-first for static, network-only for Supabase/OpenRouter
- Registration: `useEffect` in `src/routes/__root.tsx` root component

## ESLint / Prettier

Config: `eslint.config.js`. Ignores: `dist`, `.output`, `.vinxi`, `e2e/`, `playwright.config.ts`.
Prettier is enforced via `eslint-plugin-prettier` — run `npm run format` to fix.

## Git Commit Convention

```
feat: short description
fix: short description
docs: short description
perf: short description
refactor: short description
```

End every commit message with:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LoCBXy2BNS8Xqhaxm3GZYf
```
