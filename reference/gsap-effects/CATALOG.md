# GSAP Effects — Ports Catalog

Source: [madewithgsap.com](https://madewithgsap.com/effects) — 100 numbered GSAP effects sold as a paid library ($20–25/mo).

The public tutorial pages (`/effects/tutorialNNN`) expose **effect description + HTML skeleton** only; CSS and GSAP code are paywalled. The free preview (`/effects/tutorial000`) ships complete code.

This folder rebuilds each effect from the public description + skeleton, **adapted for WPForms video production**:

- Self-contained single-HTML demo per effect.
- Vendored GSAP at `vendor/gsap/3.15.0/` — no CDN, no auth.
- Master `gsap.timeline({ paused: true })` instead of `ScrollTrigger.scrub` — drives from video playhead, not user scroll.
- WPForms brand tokens (`reference/wpforms-brand/tokens.css`) — orange `#E27730` primary, system font stack.
- Stage 1920×1080 (matches new-pilot resolution per INV-1).
- Scrubber UI at the bottom so Umair can manually preview the effect.

## Adapter pattern (Scroll → Timeline)

The source library uses `ScrollTrigger` heavily. To make these video-friendly:

```js
// Source pattern (paid library):
ScrollTrigger.create({
  trigger: '.pin-height',
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  animation: gsap.timeline().to(...).to(...)
});

// Our adapter:
const tl = gsap.timeline({ paused: true })
  .to(...).to(...);
// Scrub via: tl.progress(scrubValue / tl.duration())
// Or drive from master video timeline.
```

For Mouse Move effects, swap `mousemove` for a choreographed cursor position fed by the master timeline.

## Status legend

- ✅ ported
- 🛠 in progress
- ⏳ planned (description known)
- ⚠ not yet inventoried (description unknown)

## Catalog

| # | Trigger | Effect summary | Port status | Best use |
|---|---------|----------------|-------------|----------|
| 000 | Mouse Move | Image cards shift toward cursor on hover with random rotation yoyo (InertiaPlugin) | ⏳ | Hover gallery decoration |
| 001 | Scroll | Card stack spreads / slides horizontally as you scroll through a pinned section | ⏳ | Template-picker intro |
| 009 | Scroll | "Up & Down" letter reveal — phrases swap through a single slot, chars rise out / new chars rise in (dynamic, any number of phrases) | ⏳ | Headline / tagline reveal — intro & postintro |
| 028 | Drag / Infinite | Infinite drag-scroll list of cards with slight rotation in the direction of drag | ⏳ | Carousel atmosphere |
| 034 | Scroll / Infinite | Multi-column image scroll at different speeds, each column loops seamlessly | ⏳ | Feature-tile background atmosphere |
| 050 | Scroll / Infinite | Infinite fullscreen zoom through images on scroll (bidirectional) | ⏳ | Deep-dive intro into product / form |
| 075 | Scroll | Rounded cards arranged in a circle fan open one by one as you scroll, ring rotates to accommodate | ⏳ | Integration/feature reveal postintro |
| 100 | Scroll | Orbital scroll gallery — images orbit center, scroll pushes them away / brings them back | ⏳ | Feature constellation around Sullie |
| 002–008 | mixed | ⚠ | ⚠ | |
| 010–027 | mixed | ⚠ | ⚠ | |
| 029–033 | mixed | ⚠ | ⚠ | |
| 035–049 | mixed | ⚠ | ⚠ | |
| 051–074 | mixed | ⚠ | ⚠ | |
| 076–099 | mixed | ⚠ | ⚠ | |

To inventory the remaining 86 effects, hit each `/effects/tutorialNNN` page and pull the description + HTML skeleton. Batch this across sessions — each fetch is ~3-5 lines into this table.

## Priorities (intro / postintro fit)

Best fits for **intro headlines / postintro flourishes** (Umair's stated use case):

1. **009 — letter-by-letter phrase swap** — clean text-only intro. Building first.
2. **001 — card stack spread** — template gallery intro.
3. **075 — fanning cards from circle** — integrations / features postintro.
4. **100 — orbital gallery** — Sullie surrounded by features.
5. **050 — infinite zoom** — drill into a form.

Lower priority (Mouse Move effects): these need cursor choreography to translate to video. Save for later batches.

## Where these get used

- `reference/gsap-effects/effectNNN.html` — the port itself (standalone, openable in browser).
- `videos/_shared/motion-primitives.js` — when a port stabilizes into a reusable primitive, promote the timeline-builder into this file.
- `reference/gsap-effects/index.html` — grid browser of all ports.
