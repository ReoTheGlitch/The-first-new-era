#!/usr/bin/env bash
# Deploys the app to Cloudflare Workers with static assets in Workers KV.
# Static files go through KV because this container's proxy breaks the
# Workers Assets JWT upload flow; plain API calls work fine.
# Requires CLOUDFLARE_API_TOKEN (value or "proxy-injected" in the cloud session).
set -euo pipefail
cd "$(dirname "$0")/../.."

ACCT=15c5b3be6ca473052a3636a3a2ce21da
KV_NS=3ada463be94644d8ba169751b0e04d66
: "${CLOUDFLARE_API_TOKEN:=proxy-injected}"
export CLOUDFLARE_API_TOKEN

echo "==> Build (Cloudflare preset)"
CF_BUILD=1 npm run build

echo "==> Sync static assets to KV"
node scripts/cf/kv-payload.mjs .output/public /tmp/kv-bulk.json
curl -sf -X PUT \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/kv-bulk.json \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/storage/kv/namespaces/$KV_NS/bulk" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);if(!r.success){console.error(r.errors);process.exit(1)}console.log('KV keys uploaded:',r.result.successful_key_count)})"
rm -f /tmp/kv-bulk.json

echo "==> Deploy worker"
cp scripts/cf/cf-entry.mjs .output/server/cf-entry.mjs
cat > .output/server/wrangler.deploy.json <<EOF
{
  "name": "new-era-learning",
  "main": "cf-entry.mjs",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "no_bundle": true,
  "rules": [{ "type": "ESModule", "globs": ["**/*.mjs", "**/*.js"] }],
  "kv_namespaces": [{ "binding": "STATIC_KV", "id": "$KV_NS" }],
  "d1_databases": [
    { "binding": "DB", "database_name": "new-era-db", "database_id": "b8c72bd3-1dc5-44a7-89d5-c7ca261797b7" }
  ],
  "ai": { "binding": "AI" },
  "workers_dev": true
}
EOF
npx wrangler deploy --config .output/server/wrangler.deploy.json

echo "==> Done: https://thefirst.mrwinter.org"
