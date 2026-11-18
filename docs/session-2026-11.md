# November 2026 session log

Snapshot of what landed across this push, for anyone picking up next.

## Live

- https://thefirst.mrwinter.org (Cloudflare Worker `new-era-learning`, D1 `new-era-db`, KV `new-era-static`).
- HTTP → HTTPS 301 at the zone; HSTS `max-age=31536000; includeSubDomains`; full CSP/Permissions-Policy/X-Frame-Options/X-Content-Type-Options/Referrer-Policy from the Worker.

## Platform shift

| | Was | Now |
|---|---|---|
| Database | Supabase Postgres | Cloudflare D1 (migrations 0001–0011, 29 tables) |
| Auth | Supabase Auth | PBKDF2 WebCrypto + hashed-token session cookie; rate-limited sign-up/sign-in |
| AI | `@google/genai` SDK, Gemini direct | OpenRouter OpenAI-compatible → `google/gemini-2.5-flash` (fallback `-flash-lite`) with strict JSON schema for exams |
| Analytics | `@vercel/analytics` | removed |
| Static hosting | Vite preview | Worker + KV asset serving via a thin `env.ASSETS` shim |
| CI/CD | none | `.github/workflows/deploy.yml` runs tsc/lint/tests + `deploy:cf` on push |

## Product features shipped

- "The first" external brand (English) with Arabic kept inside the app. Tagline "تعلم منهجك الدراسي بطريقة تفاعلية".
- Chemistry book seeded (`migrations/0010_seed_chemistry.sql`): 2 units, 8 lessons, 16 concepts, 100 questions across equilibrium + acids/bases.
- Streak system on the Africa/Cairo civil clock (`src/lib/engagement/streak.server.ts`): one per Cairo day, wired into practice / exam / tutor message / lesson open.
- Weekly competition (`competition_rounds` + `competition_scores`): auto-rotates every Monday 00:00 Cairo, live countdown on `/app/competition`.
- Rate-limited auth: sign-up 5/IP/hour, sign-in 10/IP/15 min + 5/IP+email/15 min. Blocked users see a friendly Arabic minutes-until-retry message.
- Change-password server fn exists (`src/features/auth/auth.functions.ts`); no change-password UI yet.
- Service worker caches static assets, routes AI calls around the cache.

## UI refresh

- Direction: Apple-calm. Cool neutral ramp, hairline borders, muted indigo accent used sparingly.
- OKLCH palette tightened; radii consolidated to **sm / md / lg / full** app-wide (0 `rounded-xl`/`2xl`/`3xl` outside shadcn primitives).
- Type scale enforced (no arbitrary `text-[Npx]`, max display size `text-4xl`).
- `shadow-lg`/`shadow-xl` on floating layers replaced with `border + shadow-md`.
- `tabular-nums` scoped to numeric cells instead of global body.
- Zero gradients in rendered page, zero emoji in UI (SVG icons throughout), no decorative motion. "AI-generated" badges and chatbot encouragement removed.

## Brand

- New SVG LogoMark (`src/components/brand/LogoMark.tsx`): monoline numeral "1" on a 32×32 grid, `currentColor` strokes.
- Favicons regenerated from the SVG:
  - `/favicon.svg` (374 B, scales to any size)
  - `/favicon.png` 32×32 (525 B)
  - `/app-icon-192.png` (3.4 KB maskable)
  - `/app-icon-512.png` (12 KB maskable, down from 139 KB)
- `docs/brand.md` + `docs/design-study.md` document the system and the research behind it.

## Performance

| Metric | Before | After |
|---|---|---|
| Initial entry JS gzipped | 197 KB | **16 KB** |
| First-paint critical (entry + react + router + query) | 197 KB | ~130 KB gzipped |
| KaTeX bundling | eager in entry | lazy on demand (77 KB gzip chunk) |
| Icon payload | 224 KB | 16 KB |
| Font weights loaded | 6 (Readex Pro) | 6 total across 2 faces (Inter + IBM Plex Sans Arabic, 3 weights each) |
| `prefers-reduced-motion` | partial | full zero-duration lockdown |
| Touch targets | mixed | ≥ 44 px on all primary nav/header actions |

## Pipeline and conventions

- Dev branch: `ccr-52216415-px8xos`. Never push to `main`.
- CI: `.github/workflows/deploy.yml` runs tsc, lint, tests, `deploy:cf` on push.
- Parent-agent → sub-agent lane discipline documented in `CLAUDE.md`. Sonnet for feature work, Haiku for grep/audit/verify, never Opus or Fable.
- Migrations: numbered SQLite files in `migrations/`, auto-applied in dev (better-sqlite3) and by `deploy:cf` (via REST API) in prod.

## Also landed (final sweep)

- Change-password UI on `/app/settings` wired to `changePassword` server fn; signs out other sessions on rotation.
- `public/robots.txt` + `public/sitemap.xml` for SEO basics.
- Favicon/PWA icons regenerated from the SVG LogoMark (total icon payload 224 KB → 16 KB).
- `OPENROUTER_API_KEY` set as a Cloudflare Worker secret — AI tutor and exam builder live.

## User-action items still open

1. **`CLOUDFLARE_API_TOKEN`** — add as a GitHub repo secret (Settings → Secrets and variables → Actions). Without it the push-to-deploy flow 401s on `deploy:cf`; manual `npm run deploy:cf` from a shell with the token set works.
2. **Teacher review of seeded content** — every lesson is `origin='editorial'` and `status='unverified'`.
3. **Turnstile / WAF rules** — mentioned in `docs/security.md` as next-step anti-bot work.

## File map

- `scripts/cf/deploy.sh` — the one-command deploy. Reads token, applies migrations, builds CF preset, uploads to KV, runs wrangler deploy.
- `scripts/cf/cf-entry.mjs` — Worker entry shim. Serves KV static assets, injects security headers, exposes bindings on `globalThis.__CF_ENV__`.
- `scripts/cf/apply-migrations.mjs` — numbered migration runner against remote D1.
- `src/lib/db/index.server.ts` — one D1-shaped adapter with better-sqlite3 fallback.
- `src/lib/auth/` — password / session helpers + `requireAuth` middleware.
- `src/lib/ai/provider.server.ts` — OpenRouter OpenAI-compat client.
- `src/lib/security/` — rate limiter + security headers library.
- `src/lib/engagement/` — streak + weekly competition logic.
- `src/lib/time/cairo.ts` — Africa/Cairo civil-clock date math.
- `src/components/brand/LogoMark.tsx` — the mark.
- `migrations/0001`–`0011` — schema + seed content + rate limits.
- `docs/architecture.md | brand.md | content.md | deploy.md | design-study.md | performance.md | security.md | workflow.md` — the reference set.
