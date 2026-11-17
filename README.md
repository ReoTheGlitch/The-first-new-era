# العصر الجديد الأول

> AI-powered study platform for Egyptian Grade 12 students — Physics & Chemistry

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![Built with TanStack](https://img.shields.io/badge/built%20with-TanStack%20Start-orange)

---

## ✨ Features

| Feature | Detail |
|---|---|
| **AI Tutor** | Gemini-powered chat with 4 teaching styles (balanced, simplified, examples, Socratic) + typewriter animation |
| **AI Exams** | Auto-generated MCQ exams, rate-limited to 5/hour per user |
| **Leaderboard** | Weekly XP podium (gold/silver/bronze), rank-change column, mobile card view |
| **Mistake Notebook** | Per-concept wrong-answer log with subject/status filters and optimistic dismiss |
| **Study Timer** | Floating Pomodoro widget — Focus (25 min) / Short Break (5 min) / Long Break (15 min) |
| **Lesson Notes** | Collapsible per-lesson notepad, persisted in `localStorage` |
| **XP & Achievements** | Levelling system, weekly sparkline, achievement unlock popup with spring animation |
| **Concept Checklist** | Per-lesson checkbox list with `localStorage` persistence and completion banner |
| **Reading Progress** | Fixed-top progress bar driven by scroll position |
| **Command Palette** | `Ctrl+K` / `⌘K` quick-nav with Arabic search and arrow-key navigation |
| **PWA** | Web manifest + service worker; cache-first for static assets, network-only for API |
| **Theme** | Light / Dark / System toggle, full OKLCH token set for both |
| **Accessibility** | RTL Arabic, `aria-live` regions, `role=status` skeletons, focus-visible ring |

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) v1.168 (SSR, file-based routing) |
| Router | TanStack Router v1.170 |
| UI | React 19, Tailwind CSS v4 (OKLCH design tokens, dark-first) |
| Components | shadcn/ui (Radix UI primitives) |
| Database | [Supabase](https://supabase.com) — Postgres + Auth + Row Level Security |
| AI | Google Gemini via `@google/genai` SDK (`gemini-2.5-flash`, fallback `gemini-2.0-flash-lite`) |
| Math | KaTeX via `rehype-katex` + `remark-math` |
| Analytics | `@vercel/analytics` |
| Deployment | [Vercel](https://vercel.com) + Nitro adapter |
| Testing | Vitest (unit) + Playwright (E2E smoke) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key

### Environment Variables

Create `.env.local` at the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI — either key name works
GEMINI_API_KEY=your-gemini-key
# GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key  # alternative

# Optional — override the default model
# GEMINI_MODEL=gemini-2.5-flash
```

### Install & Run

```bash
npm install
npm run dev        # dev server → http://localhost:3000
npm run build      # production build
npm run preview    # preview production build locally
```

### Code Quality

```bash
npm run lint       # ESLint + Prettier check
npm run format     # Prettier auto-fix
```

---

## 📁 Project Structure

```
src/
├── routes/                        # File-based pages (TanStack Router)
│   ├── __root.tsx                 # Root layout, providers, SW registration
│   ├── auth.tsx                   # Login / Sign-up / Password reset
│   ├── index.tsx                  # Public landing (redirects to /app)
│   └── _authenticated/
│       ├── route.tsx              # Auth guard middleware
│       ├── app.tsx                # App shell wrapper
│       ├── app.index.tsx          # Dashboard
│       ├── app.assistant.tsx      # AI Tutor chat
│       ├── app.exams.tsx          # AI-generated exam builder
│       ├── app.competition.tsx    # Weekly leaderboard
│       ├── app.mistakes.tsx       # Mistake notebook
│       ├── app.profile.tsx        # XP, achievements, stats, daily quote
│       ├── app.subjects.*.tsx     # Subject & course listings
│       ├── app.lessons.$lessonId.tsx   # Lesson reader with concept checklist
│       └── app.practice.$conceptId.tsx # Per-concept MCQ practice
│
├── features/
│   ├── student/queries.ts         # TanStack Query definitions (client-side)
│   ├── exams/exams.functions.ts   # Server functions: generate + save exam
│   └── mistakes/mistakes.functions.ts
│
├── lib/
│   ├── ai/
│   │   ├── config.server.ts       # AI limits, provider resolution
│   │   ├── gemini-adapter.server.ts # Gemini API adapter
│   │   └── tutor.functions.ts     # createServerFn: askTutor, rate limit
│   ├── gamification.ts            # XP → level, streak logic
│   └── utils.ts                   # cn(), misc helpers
│
├── components/
│   ├── layout/AppShell.tsx        # Sidebar, mobile nav, StudyTimer, CommandPalette
│   ├── common/                    # Card, PageHeader, SkeletonBlock, StatusBadge
│   ├── CommandPalette.tsx         # Ctrl+K overlay
│   ├── StudyTimer.tsx             # Floating Pomodoro widget
│   ├── LessonNotes.tsx            # Per-lesson note panel
│   ├── ThemeToggle.tsx            # Dark/Light/System toggle
│   ├── ErrorBoundary.tsx          # React class error boundary
│   └── achievements/
│       └── AchievementUnlock.tsx  # Spring-pop achievement popup
│
├── integrations/supabase/
│   ├── client.ts                  # Browser Supabase client
│   └── auth-middleware.ts         # requireSupabaseAuth — injects { supabase, userId, claims }
│
└── styles.css                     # Tailwind v4 config, OKLCH tokens, animations
```

---

## 🤖 AI Architecture

All AI calls go through **TanStack Start server functions** (`createServerFn`) — Gemini API keys never reach the browser.

```
Browser → createServerFn → requireSupabaseAuth middleware
                         → resolveProvider() checks GEMINI_API_KEY
                         → rate-limit check (Supabase row count)
                         → @google/genai SDK → Gemini API
                         → response streamed back to client
```

**Rate limits (enforced server-side):**
- AI Tutor: 30 requests / hour / user
- AI Exams: 5 generated exams / hour / user

**Model config (`src/lib/ai/config.server.ts`):**
- Default: `gemini-2.5-flash` (or `GEMINI_MODEL` env var)
- Fallback: `gemini-2.0-flash-lite`
- Max output tokens: 2 500
- Max conversation history: 12 messages
- Max input chars: 2 000

**`context.supabase as any` pattern:** TanStack Start v1's middleware context chain does not fully propagate the Supabase client type, so every server function casts it. This is an intentional framework limitation workaround, not a bug.

---

## 🗄 Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Display name, avatar per user |
| `subjects` | Physics / Chemistry (slug, name_ar) |
| `courses` | Per-subject yearly course (academic_year) |
| `units` | Course units with sort_order |
| `lessons` | Lesson content (body JSON blocks, objectives_ar) |
| `concepts` | Named concept within a lesson, with optional KaTeX formula |
| `questions` | MCQ questions linked to a concept |
| `quiz_attempts` | Per-concept practice session results |
| `xp_transactions` | Append-only XP ledger |
| `streaks` | Current + longest streak per user |
| `achievements` | Achievement definitions |
| `user_achievements` | Earned achievements with timestamp |
| `ai_chat_conversations` | Saved AI tutor conversation metadata |
| `ai_chat_messages` | Per-message content in a conversation |
| `ai_generated_exams` | Exam metadata + questions (JSONB) |
| `ai_interactions` | Audit log of all AI requests |
| `learning_preferences` | Per-user daily XP goal, preferred style |

Row Level Security is enabled on all tables — users can only read/write their own rows.

---

## 🧪 Testing

```bash
# Unit tests (Vitest + Testing Library)
npm run test
npm run test:watch   # watch mode

# E2E smoke tests (Playwright — requires dev server running)
npm run dev &
npm run e2e
```

Smoke tests cover: auth page loads, mode switch, forgot-password flow, /app redirect for unauthenticated users.

---

## 📱 PWA

The app ships a web manifest (`public/manifest.json`) and service worker (`public/sw.js`):

- **Static assets** (navigation, JS/CSS bundles): cache-first, background update
- **Supabase / Gemini API calls**: network-only, never cached
- **Everything else**: network-first with cache fallback

Install prompt appears automatically on mobile Chrome/Safari after visiting the site.

---

## 🚢 Deployment

The project uses the **Nitro + Vercel adapter** (`nitro` in devDependencies).

1. Connect the repository to Vercel
2. Set environment variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. Push to `main` — Vercel builds and deploys automatically

Build command: `npm run build` · Output directory: `.output`

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
4. Open a pull request against `main`

Please run `npm run lint` and `npm run test` before submitting.

---

## License

MIT © 2025
