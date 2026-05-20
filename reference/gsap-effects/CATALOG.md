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

For randomness in any effect, use seeded `mulberry32(seed)` not `Math.random()` — required for INV-9 deterministic render parity (see `tools/render.js --seek`).

## Status legend

- ✅ ported
- 🛠 in progress
- ⏳ planned (description known)
- ⚠ not yet inventoried (description unknown)

## Catalog

| # | Trigger | Effect summary | Port status | Best use |
|---|---------|----------------|-------------|----------|
| 000 | Mouse Move | Image cards shift toward cursor on hover with random rotation yoyo (InertiaPlugin) | ⏳ | Hover gallery decoration |
| 001 | Scroll | Card stack spreads / slides horizontally as you scroll through a pinned section | ✅ [effect001.html](effect001.html) | Template-picker intro |
| 005 | Scroll | Word-by-word reveal from right edge with staggered timing | ✅ [effect005.html](effect005.html) | Editorial paragraph intro |
| 009 | Scroll | "Up & Down" letter reveal — phrases swap through a single slot, chars rise out / new chars rise in (dynamic, any number of phrases) | ✅ [effect009.html](effect009.html) | Headline / tagline reveal — intro & postintro |
| 014 | Scroll | Infinite stacking image scroll — cards appear and scroll with creative position/angle/size variation | ✅ [effect014.html](effect014.html) | Template library showcase |
| 023 | Scroll / Infinite | Infinite circular movement — images orbit a large circle; fast scroll pushes them out of orbit | ⏳ | Feature wheel atmosphere |
| 028 | Drag / Infinite | Infinite drag-scroll list of cards with slight rotation in the direction of drag | ⏳ | Carousel atmosphere |
| 034 | Scroll / Infinite | Multi-column image scroll at different speeds, each column loops seamlessly | ✅ [effect034.html](effect034.html) | Feature-tile background atmosphere |
| 046 | Scroll | Random-order letter reveal — chars appear in shuffled sequence, pinned during scroll | ✅ [effect046.html](effect046.html) | Headline payoff line |
| 047 | Scroll / Infinite | Infinite carousel with squash-deform on cards exiting the viewport | ⏳ | Template parade |
| 050 | Scroll / Infinite | Infinite fullscreen zoom through images on scroll (bidirectional) | ✅ [effect050.html](effect050.html) | Deep-dive intro into product / form |
| 065 | Scroll | Triple marquee parallax — three image ribbons in a pinned band glide sideways at different rates | ⏳ | Logo / template marquee |
| 067 | Scroll | Cylindrical letter reveal — letters appear in perspective on a cylinder, hold upright, fold away upward | ✅ [effect067.html](effect067.html) | Dramatic wordmark intro |
| 075 | Scroll | Rounded cards arranged in a circle fan open one by one as you scroll, ring rotates to accommodate | ✅ [effect075.html](effect075.html) | Integration/feature reveal postintro |
| 078 | Scroll | Image flight — cards cross a pinned stage left-to-right, decelerate at center with 3D rotations | ✅ [effect078.html](effect078.html) | Template parade with feature focus |
| 083 | Scroll | Pinned multi-lane drift — crowd of images drifts L→R across 4 depth bands at different easing speeds | ⏳ | Loose, organic background |
| 098 | Scroll | Curved scroll reveal — paragraph reveals letter-by-letter along stacked curved SVG paths | ⏳ | Editorial typography flourish |
| 100 | Scroll | Orbital scroll gallery — images orbit center, scroll pushes them away / brings them back | ✅ [effect100.html](effect100.html) | Feature constellation around Sullie |
| 002–004 | mixed | ⚠ | ⚠ | |
| 006–008 | mixed | ⚠ | ⚠ | |
| 010–013 | mixed | ⚠ | ⚠ | |
| 015–022 | mixed | ⚠ | ⚠ | |
| 024–027 | mixed | ⚠ | ⚠ | |
| 029–033 | mixed | ⚠ | ⚠ | |
| 035–045 | mixed | ⚠ | ⚠ | |
| 048–049 | mixed | ⚠ | ⚠ | |
| 051–064 | mixed | ⚠ | ⚠ | |
| 066, 068–074 | mixed | ⚠ | ⚠ | |
| 076–077, 079–082 | mixed | ⚠ | ⚠ | |
| 084–097 | mixed | ⚠ | ⚠ | |
| 099 | mixed | ⚠ | ⚠ | |

**Inventory progress:** 18 of 100 effects have public descriptions captured (11 ported, 7 planned). Remaining 82 are tagged ⚠ until their tutorial pages are fetched.

To inventory the remaining 82 effects, hit each `/effects/tutorialNNN` page and pull the description + HTML skeleton. Batch this across sessions — each fetch is ~3-5 lines into this table.

## Priorities (intro / postintro fit)

Best fits for **intro headlines / postintro flourishes** (Umair's stated use case):

### Already ported
1. **009 — letter-by-letter phrase swap** — clean text-only intro.
2. **001 — card stack spread** — template gallery intro.
3. **075 — fanning cards from circle** — integrations / features postintro.
4. **100 — orbital gallery** — Sullie surrounded by features.
5. **050 — infinite zoom** — drill into a form.
6. **034 — multi-speed column atmosphere** — vignette background.
7. **067 — cylindrical letter reveal** — dramatic wordmark intro.
8. **005 — word by word from edge** — editorial paragraph intro.
9. **046 — random-order letter reveal** — headline payoff.
10. **014 — infinite stacking** — template library showcase.
11. **078 — image flight w/ center deceleration** — template parade.

### Top priorities for next batch
- **023 — circular orbit with scroll-eject** — feature wheel with elastic ejects.
- **098 — curved SVG textPath reveal** — most distinctive editorial flourish in the library.
- **065 — triple marquee parallax** — clean logo / template marquee.
- **083 — multi-lane drift parade** — loose-feeling background.
- **047 — squash-deform carousel** — character-driven template parade.

Lower priority (Mouse Move effects): these need cursor choreography to translate to video. Save for later batches.

## Where these get used

- `reference/gsap-effects/effectNNN.html` — the port itself (standalone, openable in browser).
- `videos/_shared/motion-primitives.js` — when a port stabilizes into a reusable primitive, promote the timeline-builder into this file.
- `reference/gsap-effects/index.html` — grid browser of all ports.
