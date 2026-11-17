# Deploy

One target: `https://thefirst.mrwinter.org`, backed by the Cloudflare
Worker `new-era-learning` in account `15c5b3be6ca473052a3636a3a2ce21da`.

## One-command deploy

```bash
npm run deploy:cf
```

What that script does, in order:

1. **Apply pending migrations.** `node scripts/cf/apply-migrations.mjs`
   diffs `migrations/*.sql` against the `_migrations` table in the remote
   D1 and applies anything new.
2. **Build.** `CF_BUILD=1 vite build` runs Nitro with the
   `cloudflare_module` preset into `.output/`.
3. **Upload static assets to KV.** `scripts/cf/kv-payload.mjs` reads
   `.output/public`, base64-encodes each file, and bulk-writes to the
   `new-era-static` KV namespace (id `3ada463be94644d8ba169751b0e04d66`).
4. **Deploy the worker.** `npx wrangler deploy` with a generated
   `wrangler.deploy.json` that binds `STATIC_KV`, `DB`, and sets the
   compatibility flags.

Custom domain + TLS are already wired at the zone level. The route
`thefirst.mrwinter.org/*` points at `new-era-learning`.

## Credentials

The only secret a deploy needs is `CLOUDFLARE_API_TOKEN` — exported in
the shell, or left unset and filled in by this container's proxy
(the token is also shared with your session's proxy-injected credentials
for `api.cloudflare.com`). The token must have:

- Account → Workers Scripts: Edit
- Account → Workers KV Storage: Edit
- Account → D1: Edit
- Zone → `mrwinter.org` → Workers Routes: Edit
- Zone → `mrwinter.org` → Zone: Read

## Runtime secrets on the worker

The worker itself needs one secret:

- `OPENROUTER_API_KEY` — for the AI tutor and exam builder.

Set it in the Cloudflare dashboard → **Workers & Pages → new-era-learning →
Settings → Variables and Secrets → Add → Type: Secret**. Without it, AI
features surface a user-friendly error but the rest of the app still
works.

Optional: `AI_MODEL` (plain variable, not secret) if you want to pin to
something other than `google/gemini-2.5-flash`.

## Adding a schema change

```bash
# 1. Write the migration
cat > migrations/0012_new_thing.sql <<'SQL'
CREATE TABLE IF NOT EXISTS new_thing (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
SQL

# 2. Try it locally (auto-applies on next DB access via better-sqlite3)
npm run dev

# 3. Push and deploy — the deploy script applies it to remote D1 before build
git add migrations/0012_new_thing.sql
git commit -m "feat: add new_thing table"
git push
npm run deploy:cf
```

## Rolling back

Wrangler keeps the last N deployments. Roll back from the Cloudflare
dashboard → **Workers & Pages → new-era-learning → Deployments → …**. A
rolled-back worker still points at the current D1 schema, so a schema
change that broke things has to be rolled back separately with a new
migration that adds the fix, not by reverting SQL in place.

## Why not Workers Assets?

Cloudflare's newer Workers Assets flow uses a short-lived JWT for the
upload endpoint. This container's credential proxy rewrites the
`Authorization` header on every request to `api.cloudflare.com` with the
stored token, which clobbers that JWT, so `wrangler deploy` with
`assets.directory` set fails with a 401 on the asset upload. KV avoids
the issue — every request is token-authenticated at upload time and the
worker's `env.STATIC_KV` serves them on request.
