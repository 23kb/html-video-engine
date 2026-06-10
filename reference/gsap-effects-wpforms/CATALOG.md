# GSAP Effects — Ports Catalog (101 / 101 COMPLETE)

Source: [madewithgsap.com](https://madewithgsap.com/effects) — 100 numbered GSAP effects (000–100) sold as a paid library ($20–25/mo).

The public tutorial pages (`/effects/tutorialNNN`) expose **effect description + HTML skeleton** only; CSS and GSAP code are paywalled. The free preview (`/effects/tutorial000`) ships complete code.

This folder rebuilds each effect from the public description + skeleton, **adapted for WPForms video production**:

- Self-contained single-HTML demo per effect.
- Vendored GSAP at `vendor/gsap/3.15.0/` — no CDN, no auth.
- Master `gsap.timeline({ paused: true })` instead of `ScrollTrigger.scrub` — drives from video playhead, not user scroll.
- WPForms brand tokens (`reference/wpforms-brand/tokens.css`) — orange `#E27730` primary, purple AI-only.
- Stage 1920×1080 (matches new-pilot resolution per INV-1).
- Scrubber UI at the bottom so Umair can manually preview the effect.
- Any randomness uses seeded `mulberry32()` for INV-9 deterministic render parity.

## Static QC sweep — `qc.js`

Run `node reference/gsap-effects/qc.js` to verify every port follows the structural pattern (vendor path, brand link, paused master timeline, scrubber, play button, fit() function, brand corner, controls bar, stage id, JS parses).

**Result:** 100/101 effects pass all 10 checks. The one exception is `effect000.html` (intentionally uses the source's collection-style header instead of the standard brand corner — pill + count + "Add more").

## Adapter pattern (Scroll → Timeline)

```js
// Source pattern (paid library):
ScrollTrigger.create({
  trigger: '.pin-height', start: 'top top', end: 'bottom bottom',
  scrub: true, animation: gsap.timeline().to(...).to(...)
});

// Our adapter:
const tl = gsap.timeline({ paused: true }).to(...).to(...);
// Scrub via: tl.progress(scrubValue / tl.duration())
// Or drive from master video timeline.
```

For Mouse Move / Drag effects we substitute choreographed motion (ghost cursor paths, simulated drag bursts).

## All 101 ports

### Text reveals (24)

| # | What it does |
|---|---|
| 004 | [Word stacking from right edge with 3D arrival + nudge-back](effect004.html) |
| 005 | [Editorial paragraph words slide in from right](effect005.html) |
| 006 | [Multi-word phrases cycle through a slot](effect006.html) |
| 009 | [Up & Down letter reveal — phrases cross through one slot](effect009.html) |
| 010 | [Jazzy sine-wave horizontal text drift](effect010.html) |
| 011 | [Sentence slides R→L while letters land into place](effect011.html) |
| 015 | [Duplicate-word mask reveal (dark out / orange in)](effect015.html) |
| 022 | [Progressive sentences with stagger + progress dots](effect022.html) |
| 027 | [Per-letter mask reveal domino + reverse settle](effect027.html) |
| 029 | [Words shift from seeded random positions to home](effect029.html) |
| 032 | [Concentric counter-rotating circular SVG text rings](effect032.html) |
| 041 | [Center-out letter propagation — orange overlay rolls outward](effect041.html) |
| 046 | [Random-order letter reveal (seeded mulberry32)](effect046.html) |
| 049 | [Defying gravity — letters rise at varied per-char speeds](effect049.html) |
| 052 | [Pinned text rail — left header + character-mask lines](effect052.html) |
| 053 | [3D Y-axis line swap — quotes rotate through same space](effect053.html) |
| 058 | [Per-letter spin inside masks (chars flip from upside-down)](effect058.html) |
| 059 | [Long curved SVG textPath panned past by camera](effect059.html) |
| 066 | [Pinned line mask reveal with paragraph drift](effect066.html) |
| 067 | [Cylindrical letter reveal — chars rotate in from below cylinder](effect067.html) |
| 079 | [Weight-shift marquee — font-weight wave rides text](effect079.html) |
| 081 | [Letter-by-letter paragraph swap (L→R fade reveal + exit)](effect081.html) |
| 085 | [Scroll word mask — only center 4-5 words fully visible](effect085.html) |
| 089 | [Jelly headline motion w/ scroll-velocity bursts](effect089.html) |
| 090 | [Scrubbed random descramble — shuffled chars find their slot](effect090.html) |
| 097 | [Tightening word lines — gap 300→18px per line](effect097.html) |
| 098 | [Curved SVG paths straighten + chars fade in left-to-right](effect098.html) |

### Card / template layouts (20)

| # | What it does |
|---|---|
| 001 | [Stacked deck of 5 templates fans outward, center lifts](effect001.html) |
| 003 | [Card shuffle fan from bottom via rotating pivot arms](effect003.html) |
| 014 | [Templates fly in from below + stack with varied pos/angle/size](effect014.html) |
| 018 | [Cards rise + pause center + bounce off to top (wave-through)](effect018.html) |
| 019 | [Scaled deform infinite scroll with 3 acceleration bursts](effect019.html) |
| 030 | [List hover image reveal — left list lights up, right preview slides](effect030.html) |
| 031 | [Pinned slides recede in 3D with content rotateX tilt](effect031.html) |
| 035 | [Row expand on hover — categories take turns expanding](effect035.html) |
| 036 | [Hover word shuffles cards — burst out + snap back](effect036.html) |
| 038 | [Horizontal flipbook scroll through 4 WPForms milestones](effect038.html) |
| 042 | [Z-depth stack — fronts peel forward, stack steps up](effect042.html) |
| 045 | [Folders perspective cycle with cursor-tilt root rotation](effect045.html) |
| 047 | [Cards squash-stretch + tilt at edges (per-frame deform)](effect047.html) |
| 050 | [Infinite fullscreen zoom drills through 5 form types](effect050.html) |
| 056 | [Dual front/back stacks rotate through the same frame](effect056.html) |
| 060 | [Masked vertical image rail — middle slide expands](effect060.html) |
| 074 | [Bottom-hinge trapdoor flip reveals back face copy](effect074.html) |
| 078 | [Cards cross L→R with custom centerSlow ease + 3D rotation](effect078.html) |
| 082 | [Upward image suction — bounce in, shrink up + away](effect082.html) |
| 087 | [Testimonial cards w/ tightening gap (60→10px)](effect087.html) |

### Carousels & marquees (12)

| # | What it does |
|---|---|
| 008 | [Drag list with per-card seeded subtle jitter loop](effect008.html) |
| 013 | [Two rotated text marquees in opposite directions](effect013.html) |
| 024 | [Opposite marquees + sentence reveals beneath first](effect024.html) |
| 026 | [Infinite 2D grid drift with x/y wrap modifiers (80 tiles)](effect026.html) |
| 028 | [Drag-rotation infinite list with 4 simulated drag bursts](effect028.html) |
| 033 | [Random gallery — 14 cards flow horizontally L→R](effect033.html) |
| 040 | [Dual circular carousel — two giant counter-rotating rings](effect040.html) |
| 051 | [Vertical multi-track scroll (3 cols at different speeds)](effect051.html) |
| 063 | [Long-press drag reorder simulation](effect063.html) |
| 065 | [3 horizontal pill ribbons at different parallax speeds](effect065.html) |
| 069 | [Inchworm R→L exit with arc-up arc-down per step](effect069.html) |
| 070 | [Inchworm step scroll L w/ arc-up arc-down per step](effect070.html) |
| 072 | [Scroll flow with center-wobble + scaling](effect072.html) |
| 073 | [Scroll timeline with parallax-counter giant year titles](effect073.html) |
| 088 | [Drag gallery reveal — cards scale 0→1 entering viewport](effect088.html) |

### Constellations & atmosphere (14)

| # | What it does |
|---|---|
| 007 | [Cards ride a giant rotating arc trajectory](effect007.html) |
| 016 | [Swirling spiral inward — 16 cards spiral to hub](effect016.html) |
| 023 | [Orbit + 3 timed eject events with elastic snap-back](effect023.html) |
| 034 | [5 columns of tiles drift at different speeds + directions](effect034.html) |
| 037 | [Gradient mask sweep reveals stacked form images](effect037.html) |
| 057 | [NEXT/FORM split + cards burst from gap then snap back](effect057.html) |
| 064 | [Phyllotaxis spiral bloom — 30 tiles at golden angle 137.5°](effect064.html) |
| 075 | [8 integration cards fan from hub onto rotating ring](effect075.html) |
| 076 | [Pinned radial spread with continuous ring rotation](effect076.html) |
| 080 | [Matter-style cursor swarm with collision repulsion](effect080.html) |
| 083 | [4 depth bands drift with random Y jitter (loose parade)](effect083.html) |
| 084 | [Pinned depth rows past camera — z=-1800 → 0 → 800](effect084.html) |
| 094 | [Orbital scroll — cards arc sine curves around centered headline](effect094.html) |
| 096 | [Magnetic image reveal — random pos → pull to center elastic](effect096.html) |
| 100 | [12 features orbit glowing hub with 3 elastic scroll-pushes](effect100.html) |

### Cursor-driven interactions (16)

| # | What it does |
|---|---|
| 000 | [Cursor inertia gallery — ghost cursor kicks cards in proximity](effect000.html) |
| 002 | [Ghost-cursor distance image cycle](effect002.html) |
| 017 | [Grid tiles tilt toward cursor with distance-scaled rotation](effect017.html) |
| 020 | [Sliding mouse trail — 8 cards form lagging chase tail](effect020.html) |
| 021 | [Bubbly mouse trail w/ seeded random offsets + damping](effect021.html) |
| 025 | [Randomize and focus — nearest card scales up, others drift](effect025.html) |
| 039 | [Image with perspective tilt tracking cursor position](effect039.html) |
| 044 | [Cursor radial mask reveal — dark→orange message swap](effect044.html) |
| 055 | [Elastic pointer rail — row centers on cursor, cards lift](effect055.html) |
| 061 | [3D orbit disc inside viewport, cursor tilts the rig](effect061.html) |
| 062 | [Inertia trail burst — bubbles spawn at cursor, throw + shrink](effect062.html) |
| 071 | [Grid proximity scale flow — 35 tiles bloom toward cursor](effect071.html) |
| 077 | [Depth parallax card (bg/fg move opposite to cursor)](effect077.html) |
| 091 | [3D wheel gallery cylinder with cursor tilt](effect091.html) |
| 092 | [Vanishing mouse trail — bubbles pull to center + vanish](effect092.html) |
| 095 | [Bouncy 3D card grid with proximity tilt](effect095.html) |

### 3D / advanced techniques (8)

| # | What it does |
|---|---|
| 012 | [Cards travel from z=-1500 toward camera then past + dissolve](effect012.html) |
| 043 | [Curved fan on enter + hover-lift cycle](effect043.html) |
| 048 | [3D spiral staircase — translate3d helix of 14 form steps](effect048.html) |
| 054 | [Pinned cylinder X-axis flip with 5-card rotation](effect054.html) |
| 068 | [Cylindrical image flow — center sharp, edges warp + recede](effect068.html) |
| 086 | [Image inserts between letters via expanding gap](effect086.html) |
| 093 | [Hover letter → image insertion (F·O·R·M·S gap fills)](effect093.html) |
| 099 | [3D sphere of 30 tiles distributed via Fibonacci algorithm](effect099.html) |

## Where these get used

- `reference/gsap-effects/effectNNN.html` — the port itself (standalone, openable in browser).
- `videos/_shared/motion-primitives.js` — when a port stabilizes into a reusable primitive, promote the timeline-builder into this file.
- `reference/gsap-effects/index.html` — grid browser of all 101 ports.
- `reference/gsap-effects/qc.js` — static QC sweep validator.
