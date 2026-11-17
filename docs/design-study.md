# Design study: what makes product UI feel professional

Research notes (November 2026) distilled into rules this codebase can
enforce. Where a claim is backed by a page we read, it is cited in
[Sources](#sources). Where it is our own judgement, it says so. Apple,
Anthropic and Google do not publish one rulebook, so the "traits" below
are patterns observed across the guidelines we could read plus the
project's own constraints (Arabic RTL, dark-only, mid-range Android).

## What "clean" actually buys you

The evidence for restraint is real but narrower than design blogs imply.
The aesthetic-usability effect (Kurosu and Kashimura, Hitachi, 1995:
26 ATM interface variants, 252 participants) found that rated beauty
correlated more strongly with perceived ease of use than with actual ease
of use. In practice: a calm UI makes people trust the product and forgive
small flaws. The same source warns that visual appeal can hide usability
problems from testing, so "looks clean" is never a substitute for task
testing.

The comprehension and load benefit is the part we can act on directly:
fewer distinct type sizes, fewer colors and one alignment grid mean the
reader spends less effort deciding what is a heading, what is a control and
what is status. One cited thesis found the aesthetic effect shrinks after
repeated use, which is exactly the platform's situation (daily returning
students): long term, what remains is legibility, stable layout and
speed. That is why the rules below weight consistency and performance over
polish.

Trust signals are mostly absences: no gradient heroes, no sparkle badges,
no layout that jumps when numbers change. This matches the project's
[ai-slop-notes](./ai-slop-notes.md).

## Nine traits that mark professional product UI

### 1. Decisive type scale

Few sizes, each with a fixed line height. Apple's HIG frames typography as
the carrier of information hierarchy; Rauno's interface guidelines add
that medium headings look best at weight 500 to 600 and to avoid weights
below 400. Rule: UI text uses `xs`, `sm`, `base`, `lg`, `xl`; `2xl` and up
are for page titles and single hero numbers only. No arbitrary
`text-[11px]`. The scale lives in `src/styles.css:25-40`.

### 2. Very small color surface area

One neutral ramp, one accent. Apple's color guidance says judicious color
communicates status and brand; Material 3 moved to named tonal surface
roles instead of ad-hoc overlays. Rule: the accent (`--primary`) marks
the primary action, focus and the active item, never decoration. Status
colors (`success`, `warning`, `destructive`) appear only next to a state
word. `violet`, `electric` and `indigo` are chart-series colors only.

### 3. Hairline borders over heavy shadows

Apple's dark mode separates layers with a lighter "elevated" background,
not a bigger shadow, and Material 3 replaced shadow/overlay elevation with
tone-based surface containers. Rule: separate with `border` (10% white
hairline) and one step up the neutral ramp (`surface` to
`surface-raised`). Shadows are reserved for floating layers (menu, dialog)
and limited to `shadow-xs` or `shadow-sm`.

### 4. One grid, not three

Pick a 4px base unit and keep every container edge on it. Rule: page
content uses one max-width container per route, cards align to its edges,
and lists share the same inline padding. Do not mix `gap-1.5`, `gap-2.5`
and `gap-3.5` for the same relationship; choose per component role and
stick to it.

### 5. Dense but calm

Generous padding inside an element, tight spacing between elements of the
same kind. Rule of thumb (our own): card padding `p-4`/`p-5`, rows inside
a card `gap-2`, sibling cards `gap-3`, section separation `gap-8` or
more. Rauno's guideline that list items have no dead gaps (raise padding,
not margin) supports using padding to build touch targets. Minimum touch
target 44px (already in `docs/performance.md`).

### 6. Functional motion only

Motion explains a state change or it is removed. Rauno's guidelines: keep
interaction animations at 200ms or less, skip animation on frequent
low-novelty actions, pause looping animations off-screen, never animate
theme switches. Rule: transitions 120-200ms with `--ease-out`; a route
transition is a single fade/translate no longer than 220ms; no looping
animation except a loading indicator.

### 7. Tabular numerals wherever digits can shift

Timers, counters, scores, tables, percentages. Rauno's guidelines name
`font-variant-numeric: tabular-nums` for tables and timers. Rule: apply it
on numeric components rather than the whole body (see audit).

### 8. One typographic voice per region

Inside a card or a header, use at most two weights (400 plus 500 or 600).
Never change weight on hover or selected state (it shifts layout, per
Rauno). Arabic and Latin share the same weights because Inter and IBM
Plex Sans Arabic are loaded at 400/500/600 only.

### 9. Material restraint

Tokens are `oklch()`; derived tints use `color-mix(in oklch, ...)`
(`--border`, `--input`, `--sidebar-border` already do). System-font
fallbacks follow the web fonts. No JavaScript layout, no runtime color
libraries, no blur or glow. Apple's HIG advice to use semantic, adaptive
colors rather than hard-coded values maps to: components use semantic
utilities (`bg-card`, `text-muted-foreground`), never raw hex.

## How this project already matches, and what's still off

Counts below are from `grep` over `src/**/*.tsx` on this branch.

Already good:

- One cool neutral ramp, one muted accent, hairline borders as `color-mix`
  (`src/styles.css:100-135`). All text/status colors clear 4.5:1 on
  `background`, `surface` and `surface-raised`; the lowest is
  `destructive` on `surface-raised` at about 4.9:1 (computed from the
  oklch values). Apple recommends at least 4.5:1, and 7:1 for small
  custom text.
- Gradients, glow and float animations are retired
  (`src/styles.css:218-235,264`).
- `prefers-reduced-motion` zeroes animation (`src/styles.css:325-335`).
- Dark-only is legitimate: Apple's dark mode page explicitly allows a
  dark-only appearance for apps where the UI should recede.

Still off:

| Trait | Finding | Location |
|---|---|---|
| 1 Type scale | 13 distinct sizes app-wide: 8 scale steps, `text-5xl`/`text-6xl`, and arbitrary `text-[10px]`, `text-[11px]`, `text-[7rem]` (about 14 arbitrary uses) | `src/components/layout/AppShell.tsx:43,150,189`, `src/components/CommandPalette.tsx:109,135`, `src/routes/_authenticated/app.duel.tsx:274,355`, `src/routes/__root.tsx:23` |
| 1 Type scale | `text-5xl`/`6xl` are not defined in the project scale (`src/styles.css:25-40` stops at `4xl`), so they fall back to Tailwind defaults | `app.duel.tsx:274,355` |
| 3 Shadows | Floating layers still use `shadow-lg`/`shadow-xl`, heavier than the `--shadow-*` tokens | `src/components/ui/dialog.tsx:41`, `src/components/ui/chart.tsx:162`, `src/components/ui/sheet.tsx:34` |
| 3 Radius | 7 radii in use: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `full` (counts: md 109, full 38, lg 29, sm 24, xl 10, xs 6, 2xl 2); `2xl` contradicts "small radii" | `src/components/ErrorBoundary.tsx:35`, `src/components/labs/LessonLab.tsx:22` |
| 6 Motion | Route entrance `animate-rise` is 520ms (above the 220ms budget) while `page-enter` is 220ms; two systems for one job. Sheet opens at 500ms. `achievement-pop` uses an overshoot curve; `xp-pop-fade` is 1.6s | `src/styles.css:249,282,300,498`, `src/components/ui/sheet.tsx:34` |
| 6 Motion | `animate-pulse` on a streaming-text caret and a placeholder; skeleton also pulses infinitely (acceptable as loading state, but should pause off-screen) | `src/routes/_authenticated/app.assistant.tsx:332,367`, `src/components/ui/skeleton.tsx:4` |
| 7 Tabular | `tabular-nums` is applied to the whole `body` (`src/styles.css:179`). Digits in prose get uneven spacing, and Arabic-Indic numerals gain nothing. Prefer opt-in on numeric components | `src/styles.css:179` |
| 8 Weights | 81 `font-semibold` vs 81 `font-medium` is a healthy split, but one `font-black` at 7rem on the 404 | `src/routes/__root.tsx:23` |
| 9 Tokens | Residual purple-tinted hex `#0f0b1a` from the pre-redesign palette in `theme-color`, manifest and medal text contradicts the neutral ramp (neutral-950 is about `#0a0b0e`) | `src/routes/__root.tsx:88`, `public/manifest.json:8-9`, `src/routes/_authenticated/app.competition.tsx:55,70` |

Concrete work items, in order of payoff: (1) collapse radii to four
(`xs`, `md`, `lg`, `full`), (2) replace `text-[10px]`/`[11px]` with
`text-xs`, (3) unify route entrances on `page-enter` and drop
`animate-rise` to 220ms, (4) scope `tabular-nums` to numeric components,
(5) swap `shadow-lg/xl` for `shadow-sm` plus border on floating layers.
These touch the UI lane; they are not done by this study.

## Measuring progress

| Metric | Target | How to count |
|---|---|---|
| Distinct text sizes per page | 5 or fewer | DevTools: computed `font-size` set on `document.body.querySelectorAll('*')`; or `grep -oE 'text-(xs\|sm\|base\|lg\|xl\|[2-9]xl\|\[[^]]+\])' route-file \| sort -u` |
| Distinct radii across the app | 4 or fewer | `grep -rhoE 'rounded(-[a-z0-9]+)?' src --include=*.tsx \| sort -u` (today 7) |
| Color tokens rendered on first paint | 12 or fewer | Set of computed `color`, `background-color`, `border-color` values on the landing and `/app` pages |
| LCP | 2.5s or less on mid-range Android | Lighthouse mobile preset, 4x CPU throttle, Slow 4G; Google's "good" threshold |
| Cumulative animation per route transition | 1s or less | Sum of `animation-duration + delay` and `transition-duration` of elements that run on navigation, from the Animations panel |

Re-run the audit after each UI-lane change and record the numbers in
`docs/performance.md`. Today: sizes 13 on the whole app (target 5 per
page, so check per page), radii 7, longest route transition 520ms.

## Sources

Read in full via fetch, or confirmed through search results:

- Apple, Human Interface Guidelines, Dark Mode:
  https://developer.apple.com/design/human-interface-guidelines/dark-mode.md
  (read in full: base vs elevated backgrounds, 4.5:1 minimum and 7:1
  target contrast, semantic colors, dark-only allowed)
- Rauno Freiberg, Web Interface Guidelines (README, read in full):
  https://raw.githubusercontent.com/raunofreiberg/interfaces/main/README.md
- Laws of UX, Aesthetic-Usability Effect (read in full):
  https://lawsofux.com/aesthetic-usability-effect/index.md
- Material Design 2, Dark theme (search result only; page body did not
  load): https://m2.material.io/design/color/dark-theme
- Material 3, "Learn about tone-based surfaces" (search result and title
  only; article body did not load):
  https://material.io/blog/tone-based-surface-color-m3
- Apple HIG Foundations (search snippet only):
  https://developer.apple.com/design/human-interface-guidelines/foundations.md

Not verified: Anthropic's marketing-site styling (the fetch returned page
structure but no CSS, so no claim is made about it), the Vercel Geist
audit, and Apple's Typography page.
