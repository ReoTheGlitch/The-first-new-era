# Workflow: feature → GitHub → Cloudflare

How a change gets from an idea to production.

```
  idea ─▶ Claude session ─▶ sub-agents ─▶ commits ─▶ GitHub push ─▶ CI ─▶ Cloudflare worker
                                                                   │
                                                                   ├─ typecheck
                                                                   ├─ lint
                                                                   ├─ unit tests
                                                                   └─ deploy:cf (migrations → build → KV → wrangler)
```

## Day-to-day loop

1. Describe the change in a Claude session (or any editor).
2. Changes are committed on the dev branch `ccr-52216415-px8xos` with the
   session's attribution footer.
3. Push.
4. The GitHub Action in `.github/workflows/deploy.yml` runs:
   - `npx tsc --noEmit` — strict type check
   - `npm run lint` — ESLint + Prettier
   - `npm run test` — Vitest
   - `npm run deploy:cf` — the same deploy script used locally
5. The worker at `thefirst.mrwinter.org` is updated. Rollback from the
   Cloudflare dashboard.

## GitHub secret required

One secret on the repo: `CLOUDFLARE_API_TOKEN` (settings → Secrets and
variables → Actions → New repository secret). Permissions needed —
see `docs/deploy.md`.

## Parent agent → sub-agent orchestration

A Claude session that owns a multi-part change spawns one sub-agent per
lane. Lanes are defined in `CLAUDE.md` → "Parallel agents". Example:

```
parent session
  ├─▶ sub-agent A (Sonnet)  — design system refresh in src/styles.css + common.tsx
  ├─▶ sub-agent B (Sonnet)  — product pages polish (dashboard, landing, auth)
  ├─▶ sub-agent C (Sonnet)  — content pages polish (lessons, practice, competition)
  └─▶ sub-agent D (Haiku)   — grep audit, verification
```

Rules:
- Each agent gets a brief that names its **files owned** and **files
  off-limits** (the other agents' lanes).
- Each agent commits as it goes with `git fetch && git merge --no-edit
  FETCH_HEAD` before every commit and pushes immediately. Merges are
  usually fast-forward because lanes don't overlap.
- Parent coordinates **shared files**: `package.json` lockfile,
  `CLAUDE.md`, the design tokens in `src/styles.css`.
- Parent verifies (`tsc`, `lint`, `build`) and runs the single
  `npm run deploy:cf` only after all agents report back.

## Hotfix

Small bug? Fix it in the session directly, don't spawn an agent. Commit
and push. CI handles the rest.

## Model selection

See `CLAUDE.md` → "Parallel agents" → "Model selection". Default Sonnet.
Haiku for grep audits / verification / bulk reads. Never Opus, never
Fable.
