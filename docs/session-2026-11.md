# November 2026 session log

Context for anyone picking up where the November 2026 push left off.

## What landed this round

1. **External rename to "The first"** across landing, root metadata, PWA
   manifest, Logo component. Internal Arabic naming preserved via
   `BRAND_NAME_AR`. Tagline: "تعلم منهجك الدراسي بطريقة تفاعلية".
2. **Off Supabase, onto Cloudflare D1.** Full schema port
   (`migrations/0001`–`0008`) applied to `new-era-db`. Custom auth with
   PBKDF2 WebCrypto + session cookie middleware. Every server function
   migrated off PostgREST to D1 SQL.
3. **Off Gemini SDK, onto OpenRouter.** `src/lib/ai/provider.server.ts`
   hits OpenAI-compatible `/chat/completions`. Default model
   `google/gemini-2.5-flash`, fallback `google/gemini-2.5-flash-lite`,
   strict JSON schema for exam generation.
4. **De-AI-slopped the UI.** Gradients retired across `styles.css` and
   components (`bg-brand`, `bg-tile`, `text-gradient` utilities are now
   solid). DailyQuote, "AI-generated" badges, chatbot-style praise,
   `animate-float` all gone. Community page replaced its three-across
   icon-card coming-soon grid with one sentence. See
   [ai-slop-notes.md](./ai-slop-notes.md) for the rule set.
5. **Streak system** on Africa/Cairo civil clock. `touchStreak(db, userId)`
   is idempotent per Cairo day; resets on a missed day.
6. **Weekly competition rounds.** `getOrCreateActiveRound` rotates on
   first call after each Monday 00:00 Cairo. `WeeklyCountdown.tsx`
   client ticker renders days / hours / minutes to `ends_at`.
7. **Grade-12 Egyptian chemistry seed** — real content across chapters 1
   and 2 (equilibrium, acids & bases), migration 0010.
8. **Deploy pipeline** now applies pending D1 migrations before every
   deploy — see [deploy.md](./deploy.md).

## Known follow-ups

- **OpenRouter key.** Add `OPENROUTER_API_KEY` as a worker secret in the
  Cloudflare dashboard before the AI tutor and exam builder work live.
- **Teacher review.** All seeded content (physics + chemistry) is
  `origin='editorial'` and `status='unverified'`. Flip to `verified` only
  after a subject-matter review.
- **Password reset.** The Supabase email-based reset flow is gone. A
  logged-in "change password" server fn is on the roadmap but not built;
  for now, password changes require admin intervention.

## Files to know

- `src/lib/db/index.server.ts` — D1 adapter + Node/better-sqlite3 fallback.
- `src/lib/auth/{password,session,require-auth}.server.ts` — auth stack.
- `src/lib/ai/provider.server.ts` — OpenRouter provider.
- `src/lib/time/cairo.ts` — Cairo-civil date math.
- `src/lib/engagement/{streak,competition}.server.ts` — engagement rules.
- `scripts/cf/{deploy.sh,apply-migrations.mjs,cf-entry.mjs,kv-payload.mjs}`
  — the full Cloudflare path.
