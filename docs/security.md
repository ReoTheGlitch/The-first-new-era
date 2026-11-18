# Security posture

## HTTPS everywhere
- Zone level: Cloudflare "Always Use HTTPS" and HSTS are enabled on the zone.
- Per response: the Worker also sets `strict-transport-security: max-age=31536000; includeSubDomains`
  on every response, so the policy holds even if the zone setting is changed.

## Content security policy
Set from `scripts/cf/cf-entry.mjs` (mirrored in `src/lib/security/security-headers.ts`; a test fails if they drift) on every response, static assets included.
- `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`.
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'`: inline needed for TanStack Start's bootstrap script, eval for KaTeX. Weaker than a nonce-based policy; tightening is future work.
- `style-src` adds `'unsafe-inline'` and Google Fonts; `font-src` adds `fonts.gstatic.com` and `data:`.
- `img-src 'self' data: blob:`; `connect-src 'self' https://openrouter.ai`.
- Also sent: `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, a deny-all `permissions-policy` (camera, mic, geolocation, payment, usb, motion sensors), `x-dns-prefetch-control: on`.

## Rate limiting
Fixed-window counters in D1 table `rate_limit_counters` (migration `0011`), keyed by scope, key and window start; increment is one atomic upsert (`src/lib/security/rate-limit.server.ts`). Client IP comes from `CF-Connecting-IP`, falling back to the first `X-Forwarded-For` hop, else `unknown`.

| Endpoint | Limit |
|---|---|
| `signUp` | 5 per IP per hour |
| `signIn` | 10 per IP per 15 min, and 5 per `ip|email` per 15 min |

Blocked calls return `{ error: "too_many_requests", retryAfterSec }` and set `Retry-After`. Attempts count whether or not they succeed. Stale rows are purged opportunistically. AI endpoints keep their own `ai_interactions` row-count limits.

## Secrets
Live only as Cloudflare Worker secrets (e.g. `OPENROUTER_API_KEY`), read server-side from bindings. Never in client bundles, `VITE_*` vars, or the repo. Auth responses never include hashes or tokens.

## Session cookies
`HttpOnly`, `Secure` (on HTTPS), `SameSite=Lax`, 30-day lifetime. Session rows live in D1 and are deleted on sign-out; changing the password revokes all other sessions. Passwords are salted and hashed (`password.server.ts`).

## Future work
- Cloudflare Turnstile on sign-up and sign-in.
- Bot Management / Super Bot Fight Mode.
- WAF rules and zone-level rate limiting in front of `/_serverFn/*`.
- Nonce-based CSP to drop `'unsafe-inline'` / `'unsafe-eval'`.
- Friendly Arabic message for `too_many_requests` in `src/routes/auth.tsx`.
