# Brand identity

One page. The design rationale is in [design-study.md](./design-study.md).

## Name

- **External: "The first"**. Latin script, sentence case, two words, no
  article stylisation. Used in the browser tab, manifest `name`, social
  cards, the wordmark next to the logo mark and anywhere a Latin string
  is expected. Constant: `BRAND_NAME` in `src/components/brand/Logo.tsx`.
- **Internal Arabic: "العصر الجديد الأول"**. Used in Arabic body copy,
  legal and support text, and the page `<title>` of Arabic routes.
  Constant: `BRAND_NAME_AR`.
- Never translate "The first" literally, never write it in capitals, and
  never put both names in the same line.

## Voice

Factual, Arabic-first and brief. State what the thing is or what happened,
with the number or the name attached. Write Arabic natively (modern
standard, Egyptian-school register where it helps) rather than translating
English UI strings. No chatbot encouragement, no hype, no exclamation
marks as decoration. Praise appears only when tied to a concrete event
such as an achievement unlock.

- Do: "أنهيت 8 من 10 أسئلة. راجع سؤالين في الحركة." Don't: "أحسنت! أنت نجم!"
- Do: "انتهت المهلة. حاول مرة أخرى." Don't: "عفوا! حدث شيء غير متوقع"
- Do: "تتجدد المنافسة الأسبوعية بعد 2 يوم" Don't: "لا تفوّت الفرصة الذهبية!"

## Palette

Dark-only. Source of truth: `src/styles.css`. Neutral ramp has hue 260
(cool) and chroma at or under 0.008, so surfaces never read as tinted.

| Token | oklch | Usage |
|---|---|---|
| `--neutral-950` / `--background` | `oklch(0.15 0.006 260)` | Page background; the only full-bleed color. |
| `--neutral-900` / `--surface`, `--card` | `oklch(0.2 0.007 260)` | Cards, popovers, sidebar rows at rest. |
| `--neutral-800` / `--surface-raised`, `--muted`, `--accent` | `oklch(0.27 0.008 260)` | One step above a card: hover, selected row, inputs fill. |
| `--neutral-700` | `oklch(0.37 0.008 260)` | Progress tracks, dividers that must be stronger than a hairline. |
| `--neutral-600` | `oklch(0.48 0.008 260)` | Disabled glyphs only. |
| `--neutral-500` | `oklch(0.6 0.008 260)` | Placeholder text. |
| `--neutral-400` / `--muted-foreground` | `oklch(0.73 0.007 260)` | Secondary text and captions (8.2:1 on background). |
| `--neutral-200` | `oklch(0.92 0.004 260)` | Sidebar text. |
| `--neutral-100` / `--foreground` | `oklch(0.965 0.003 260)` | Primary text (17.8:1 on background). |
| `--primary` | `oklch(0.72 0.1 270)` | The single accent: primary button, focus ring, active nav item. Never decoration. |
| `--primary-foreground` | `neutral-950` | Text on `--primary` (7.8:1). |
| `--success` | `oklch(0.74 0.11 160)` | Correct answer, completed state. Pair with a word. |
| `--warning` | `oklch(0.8 0.1 80)` | Time running out, unverified content. |
| `--destructive` | `oklch(0.68 0.14 25)` | Wrong answer, delete. Lowest contrast in the set: 4.9:1 on `surface-raised`. |
| `--electric`, `--indigo`, `--violet` | `oklch(0.74 0.09 240)`, `0.68 0.1 270`, `0.72 0.09 295` | Chart series only (`--chart-1..5`). |
| `--border` | `10%` of neutral-50 in oklch | Default hairline. |
| `--input` | `14%` of neutral-50 in oklch | Input outlines. |
| `--ring` | `oklch(0.72 0.1 270 / 0.7)` | Focus outline. |

Contrast figures are computed from the oklch values. All text colors clear
Apple's 4.5:1 floor on `background`, `surface` and `surface-raised`.

Refinement proposed after the study: no change to any oklch token (the
ramp already matches the observed pattern of cool, near-zero-chroma
neutrals). One residual: the pre-redesign purple-tinted `#0f0b1a` still
appears in `theme-color`, the manifest and medal text. Replace with
`#0a0b0e`, the sRGB value of `--neutral-950`, so the browser chrome and
splash screen match the page.

## Typography

- **Latin:** Inter. **Arabic:** IBM Plex Sans Arabic. Both loaded from
  Google Fonts at 400, 500, 600 only (`src/routes/__root.tsx`), fallback
  `system-ui`. `--font-display` and `--font-sans` are the same stack.
- Headings: `letter-spacing: -0.02em` on Latin. Do not letter-space
  Arabic.
- Numerals: use `tabular-nums` on timers, scores, tables and counters.

| Token | Size | Line height | Use |
|---|---|---|---|
| `xs` | 12px | 18px | Captions, badges, kbd hints |
| `sm` | 14px | 22px | Default UI text, buttons, nav |
| `base` | 16px | 26px | Lesson body, chat messages |
| `lg` | 18px | 28px | Card titles, lead paragraph |
| `xl` | 20px | 28px | Section headings |
| `2xl` | 24px | 32px | Page titles |
| `3xl` | 30px | 36px | Landing sub-hero, large stat |
| `4xl` | 36px | 40px | Landing hero only |

Weights: 400 for running text, 500 for labels and controls, 600 for
headings and the wordmark. Never below 400, never above 600, never change
weight on hover or selection. At most two weights per card or header.

## Spacing and radius scale

- **Spacing:** Tailwind's 4px scale. Roles: inside a card `p-4`/`p-5`;
  between rows of one kind `gap-2`; between sibling cards `gap-3`;
  between page sections `gap-8` or more. Touch targets at least 44px.
- **Radius tokens** (`src/styles.css`): `xs` 6px, `sm` 8px, `md` 10px
  (default, `--radius`), `lg` 14px, `xl` 18px, `2xl` 20px, `3xl` 24px,
  `4xl` 28px, `full`. **Allowed set going forward: `xs`, `md`, `lg`,
  `full`.** `md` for controls and cards, `lg` for large panels and
  dialogs, `xs` for kbd and small chips, `full` for avatars and pills.

## Logo

The mark is a monoline numeral 1 on a 32x32 grid: one vertical stem, a
short diagonal flag at the top and a flat serif foot. It reads as modernist
typography and as "first" without any literal object. It is defined in code
(`src/components/brand/LogoMark.tsx`), draws entirely in `currentColor`
with 2.5 stroke, square caps and mitered joins, and takes a `size` prop
(default 28).

- **Full lockup:** mark, 10px gap, "The first" in Inter 600, `tracking-tight`,
  `text-sm`, always left-to-right even on RTL pages. Use in headers and
  auth.
- **Mark only:** use below 140px of available width, in the mobile
  header and as app icon.
- **Colors:** foreground color by default; `--primary` is allowed for the
  mark only on the landing page. Never a fill, gradient or outline
  effect.
- **Minimum size:** mark 16px; lockup 96px wide.
- **Clearspace:** half of the mark's height on all sides.
- The old glasses bitmap (`src/assets/logo-glasses.png`) is retired and
  no longer referenced. The PNG favicon and app icons still show the old
  art until they are regenerated from the SVG.

## Don't list

1. Gradient hero or gradient text. Solid colors only.
2. Emoji or dingbats as icons. Use SVG.
3. Decorative glow, blur or ambient background washes.
4. `rounded-3xl` (or anything above `lg`) as the default container radius.
5. Heavy headings that mix weights, such as `font-black` next to
   `font-light`. Stay on 400/500/600.
