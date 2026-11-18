# Anti-AI-slop design notes

Research summary and the rules this project applies. Sourced November
2026 from a small set of recent design-blog critiques.

## The rules we keep

- **No gradients.** Not on heroes, cards, buttons, borders, SVG defs,
  or Tailwind utilities. Solid colors only.
- **No emoji in UI.** Icons are SVG (feather-style or hand-drawn). Even
  dingbats (✓, ✗, ★) inside strings get replaced with inline SVG.
- **No "AI-generated" badges.** The platform's identity is what it is;
  slapping a sparkle badge on every AI reply reads as insecure.
- **No chatbot-style encouragement.** "أحسنت!", "ممتاز!", "Great job!"
  as decoration are out. Praise tied to a specific achievement unlock
  is fine because it's tied to a real event.
- **No motivational quote cards.** DailyQuote, random proverbs — gone.
- **No infinite floating icons.** `animate-float` for the hero or empty
  state is out. One-shot entrance animations (`animate-rise`) are OK
  because they're bounded.
- **No three-across icon-topped feature-card grids.** The classic
  landing page tell. Replace with a shorter hierarchy or stacked
  sections.
- **No typewriter / stagger / letter-by-letter animations.**

## What stays

- Per-value progress rings on the dashboard. They show real data.
- Status badges with specific wording tied to row status (unverified,
  demo, etc.) — these communicate state, not vibes.
- Entrance fades on route change are OK if they're brief and not
  staggered.

## Audit cadence

After any major content or component addition, run through the
[audit commands below](#audits) and fix the output before merging.

## Audits

```bash
# Gradient utilities + CSS defs (should return only Radix animations)
rg -nE 'bg-gradient-|from-\w+(-\d)?|to-\w+(-\d)?|via-\w+(-\d)?|text-gradient|gradient-to-|linear-gradient|radial-gradient' src/

# Emoji in UI text (approximate — adjust the Unicode class as needed)
rg -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src/ --glob '!*.gen.*' --glob '!public/sw.js'

# Chatbot-style encouragement
rg -n 'أحسنت|ممتاز|رائع|!' src/routes/ | grep -v 'achievement\|Unlock'

# "AI-generated" badges / disclosures (should be empty)
rg -n 'مولَّد بالذكاء|AI-generated|يولّده الذكاء' src/

# Motion decoration
rg -n 'animate-float\|animate-bounce\|animate-pulse' src/
```

## Sources

- [AI Slop Website Design: How to Stop Looking AI-Generated](https://buildtolaunch.substack.com/p/fix-ai-slop-website-design)
- [Is your website AI slop? How to tell, and how to fix it](https://dev.to/laurilllll/is-your-website-ai-slop-how-to-tell-and-how-to-fix-it-1fn5)
- [What makes a website look AI-generated? · InterfaceKit](https://blog.interfacekit.io/what-makes-a-website-look-ai-generated)
- [AI Design Slop: 16 Patterns That Mark a Site as Vibe-Coded](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it)
- [AI slop website checklist](https://illos.dev/guides/ai-slop-website-checklist)
- [AI Slop Fonts and Gradients](https://www.925studios.co/blog/ai-slop-design-tells)
- [How to Make Your UI Look Less Like AI Slop (2026 Guide)](https://www.tremoloo.com/blog/how-to-make-ui-look-less-like-ai-slop)

## One line summary

"Slop isn't about AI. It's about nobody making the decisions."
