# Performance

## Bundle layout

Client chunks after the KaTeX split (`CF_BUILD=1 npm run build`, raw / gzip):

| Chunk | Raw | Gzip | Contents |
|---|---|---|---|
| `sanitize-svg` | 274 KB | 82 KB | SVG sanitiser (lazy, pre-existing) |
| `MathTexImpl` | 260 KB | 77 KB | KaTeX renderer (lazy) |
| `react-core` | 211 KB | 65 KB | react, react-dom, scheduler |
| `router` | 113 KB | 38 KB | @tanstack/react-router, router-core, history |
| `react-markdown` | 97 KB | 29 KB | markdown pipeline (lazy, assistant/exams only) |
| `index` (entry) | 52 KB | 15 KB | app shell + root route |
| `query` | 41 KB | 13 KB | @tanstack/react-query, query-core |

The entry chunk was 623 KB raw / 197 KB gzip before the split.

`manualChunks` in `vite.config.ts` only splits react, router and query. A
dedicated `markdown` chunk was tried and rejected: it pulled shared helpers and
KaTeX into one 400 KB chunk that the entry imported eagerly. Rolldown's default
split keeps react-markdown lazy.

## Lazy-loaded modules

- KaTeX: `MathTex` in `src/components/common.tsx` lazy-imports
  `src/components/MathTexImpl.tsx` behind `Suspense` with a size-matched
  placeholder. The file must not be named `*.client.*`: TanStack Start's import
  protection denies that pattern in the server build.
- react-markdown (+ rehype-katex): loaded by the assistant and exams routes.
- sanitize-svg: loaded on demand.

## Mobile targets

- Touch targets are at least 44 px: bottom nav items are `min-h-14`, the
  mobile header profile link is `h-11 w-11`, sheet links use `py-3`.
- `prefers-reduced-motion: reduce` zeroes all animation/transition durations
  and delays, forces a single iteration and disables smooth scrolling.
- `<meta name="color-scheme">` and `format-detection` avoid a white flash and
  iOS auto-linking of Arabic numerals.

## Measurement

Run `CF_BUILD=1 npm run build`, then inspect `.output/public/assets/*.js`
(`ls -lS` for raw size, `gzip -9c file | wc -c` for gzip). Compare the `index-*`
entry chunk and the vendor chunks before and after a change. Build output is
the source of truth; check which chunks the entry imports statically
(`grep -o 'from"\./[^"]*\.js"' index-*.js`) to confirm heavy code stays lazy.
