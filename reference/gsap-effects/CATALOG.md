# GSAP Effects — Ports Catalog (50 / 100)

Source: [madewithgsap.com](https://madewithgsap.com/effects) — 100 numbered GSAP effects sold as a paid library ($20–25/mo).

The public tutorial pages (`/effects/tutorialNNN`) expose **effect description + HTML skeleton** only; CSS and GSAP code are paywalled. The free preview (`/effects/tutorial000`) ships complete code.

This folder rebuilds each effect from the public description + skeleton, **adapted for WPForms video production**:

- Self-contained single-HTML demo per effect.
- Vendored GSAP at `vendor/gsap/3.15.0/` — no CDN, no auth.
- Master `gsap.timeline({ paused: true })` instead of `ScrollTrigger.scrub` — drives from video playhead, not user scroll.
- WPForms brand tokens (`reference/wpforms-brand/tokens.css`) — orange `#E27730` primary, purple AI-only.
- Stage 1920×1080 (matches new-pilot resolution per INV-1).
- Scrubber UI at the bottom so Umair can manually preview the effect.
- Any randomness uses seeded `mulberry32()` for INV-9 deterministic render parity.

## Adapter pattern (Scroll → Timeline)

```js
// Source pattern (paid library):
ScrollTrigger.create({
  trigger: '.pin-height',
  start: 'top top', end: 'bottom bottom',
  scrub: true,
  animation: gsap.timeline().to(...).to(...)
});

// Our adapter:
const tl = gsap.timeline({ paused: true })
  .to(...).to(...);
// Scrub via: tl.progress(scrubValue / tl.duration())
// Or drive from master video timeline.
```

For Mouse Move / Drag effects we substitute choreographed motion (ghost cursor paths, simulated drag bursts).

## All ports (50)

### Text reveals (18)

| # | Effect | What it does |
|---|--------|--------------|
| 004 | [effect004.html](effect004.html) | Word stacking from right edge with 3D arrival + nudge-back |
| 005 | [effect005.html](effect005.html) | Editorial paragraph words slide in from right with stagger |
| 006 | [effect006.html](effect006.html) | Multi-word phrases cycle through a slot (paragraph swap) |
| 009 | [effect009.html](effect009.html) | Up & Down letter reveal — phrases cross through one slot |
| 011 | [effect011.html](effect011.html) | Sentence slides R→L while letters land into place |
| 015 | [effect015.html](effect015.html) | Duplicate-word mask reveal (dark slides out / orange in) |
| 022 | [effect022.html](effect022.html) | Progressive sentences with stagger + progress dots |
| 027 | [effect027.html](effect027.html) | Per-letter mask reveal domino + reverse settle |
| 029 | [effect029.html](effect029.html) | Words shift from seeded random positions to home |
| 032 | [effect032.html](effect032.html) | Concentric counter-rotating circular SVG text rings |
| 046 | [effect046.html](effect046.html) | Random-order letter reveal (seeded mulberry32) |
| 049 | [effect049.html](effect049.html) | Defying gravity — letters rise at varied per-char speeds |
| 052 | [effect052.html](effect052.html) | Pinned text rail — left header + character-mask lines |
| 053 | [effect053.html](effect053.html) | 3D Y-axis line swap — quotes rotate through same space |
| 059 | [effect059.html](effect059.html) | Long curved SVG textPath panned past by camera |
| 081 | [effect081.html](effect081.html) | Letter-by-letter paragraph swap (L→R fade reveal + exit) |
| 090 | [effect090.html](effect090.html) | Scrubbed random descramble — shuffled chars find their slot |
| 098 | [effect098.html](effect098.html) | Curved SVG paths straighten + chars fade in left-to-right |

### Card / template layouts (10)

| # | Effect | What it does |
|---|--------|--------------|
| 001 | [effect001.html](effect001.html) | Stacked deck of 5 templates fans outward, center lifts |
| 003 | [effect003.html](effect003.html) | Card shuffle fan from bottom via rotating pivot arms |
| 014 | [effect014.html](effect014.html) | Templates fly in from below + stack with varied pos/angle/size |
| 018 | [effect018.html](effect018.html) | Cards rise + pause center + bounce off to top (wave-through) |
| 042 | [effect042.html](effect042.html) | Z-depth stack — fronts peel forward, stack steps up |
| 047 | [effect047.html](effect047.html) | Cards squash-stretch + tilt at edges (per-frame deform) |
| 050 | [effect050.html](effect050.html) | Infinite fullscreen zoom drills through 5 form types |
| 056 | [effect056.html](effect056.html) | Dual front/back stacks rotate through the same frame |
| 074 | [effect074.html](effect074.html) | Bottom-hinge trapdoor flip reveals back face copy |
| 078 | [effect078.html](effect078.html) | Cards cross L→R with custom centerSlow ease + 3D rotation |

### Carousels & marquees (8)

| # | Effect | What it does |
|---|--------|--------------|
| 008 | [effect008.html](effect008.html) | Drag list with per-card seeded subtle jitter loop |
| 013 | [effect013.html](effect013.html) | Two rotated text marquees in opposite directions |
| 024 | [effect024.html](effect024.html) | Opposite marquees + sentence reveals beneath first |
| 028 | [effect028.html](effect028.html) | Drag-rotation infinite list with 4 simulated drag bursts |
| 033 | [effect033.html](effect033.html) | Random gallery — 14 cards flow horizontally L→R |
| 065 | [effect065.html](effect065.html) | 3 horizontal pill ribbons at different parallax speeds |
| 070 | [effect070.html](effect070.html) | Inchworm step scroll with arc-up arc-down per step |
| 087 | [effect087.html](effect087.html) | Testimonial cards w/ tightening gap (60→10px) |

### Constellations & atmosphere (8)

| # | Effect | What it does |
|---|--------|--------------|
| 007 | [effect007.html](effect007.html) | Cards ride a giant rotating arc trajectory |
| 023 | [effect023.html](effect023.html) | Orbit + 3 timed eject events with elastic snap-back |
| 034 | [effect034.html](effect034.html) | 5 columns of tiles drift at different speeds + directions |
| 037 | [effect037.html](effect037.html) | Gradient mask sweep reveals stacked form images |
| 064 | [effect064.html](effect064.html) | Phyllotaxis spiral bloom — 30 tiles at golden angle 137.5° |
| 075 | [effect075.html](effect075.html) | 8 integration cards fan from hub onto rotating ring |
| 083 | [effect083.html](effect083.html) | 4 depth bands drift with random Y jitter (loose parade) |
| 100 | [effect100.html](effect100.html) | 12 features orbit glowing hub with 3 elastic scroll-pushes |

### 3D / advanced techniques (6)

| # | Effect | What it does |
|---|--------|--------------|
| 000 | [effect000.html](effect000.html) | Ghost cursor on choreographed path kicks cards in proximity |
| 012 | [effect012.html](effect012.html) | Cards travel from z=-1500 toward camera then past + dissolve |
| 026 | [effect026.html](effect026.html) | 80-tile infinite 2D grid drift (x/y wrap modifiers) |
| 048 | [effect048.html](effect048.html) | 3D spiral staircase — translate3d helix of 14 form steps |
| 067 | [effect067.html](effect067.html) | Cylindrical letter reveal — chars rotate in from below cylinder |
| 068 | [effect068.html](effect068.html) | Cylindrical image flow — center sharp, edges warp + recede |

## Remaining queue

50 of 100 ported. The other 50 await:

1. Inventory: fetch `/effects/tutorialNNN` for the remaining numbered effects to capture their public descriptions + HTML skeletons.
2. Port: same workflow as above — read description, write WPForms-themed standalone HTML, rebind any scroll/mouse trigger to a master timeline.

## Where these get used

- `reference/gsap-effects/effectNNN.html` — the port itself (standalone, openable in browser).
- `videos/_shared/motion-primitives.js` — when a port stabilizes into a reusable primitive, promote the timeline-builder into this file.
- `reference/gsap-effects/index.html` — grid browser of all 50 ports.
