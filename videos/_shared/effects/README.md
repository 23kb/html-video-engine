# Effects Library — motion vocabulary for editorial work

This is the **named-effect vocabulary** for pure-editorial and mixed-surface videos. Each effect is a promoted GSAP-effect port from `reference/gsap-effects/`, restructured as a mountable JS module:

```js
import { mountTextStackFromRight } from '../../_shared/effects/index.js';

const fx = mountTextStackFromRight({ text: '...', highlight: { ... } });
stage.appendChild(fx.el);

const tl = gsap.timeline({ paused: true });
fx.tweenInto(tl, { position: 0.5 });
```

All effects return `{ el, tweenInto(tl, opts), dispose() }`. The caller mounts `el` into the stage at whatever position they need, then composes the tween into a master timeline.

**Source of motion:** [reference/gsap-effects/CATALOG.md](../../../reference/gsap-effects/CATALOG.md) — the full 101-port library. This `_shared/effects/` directory is the **production subset** — effects promoted to be importable. The full catalog stays in `reference/` as the visual menu.

**QC harness:** [videos/_qc-effects/index.html](../../_qc-effects/index.html) — picker UI to scrub each effect.

---

## Vocabulary

Effects are grouped by **motion intent**, not by source-effect-number. When authoring a beat, pick by intent:

### Text reveals

**Ground assumption (acceptance E-3, 2026-08-23):** every text mount defaults
its letters to a color that assumes ONE ground — dark ink assumes a light bed,
cream assumes a dark bed. Mounting on the opposite ground renders the reveal
near-invisible (centerOutRoll's base line vanished on a dark bed and shipped).
Check the Ground column; override the color param when your bed differs — and
apply the accent-contrast-per-ground rule to EVERY line, not just the accent.

| Effect | Intent | When to use | Ground (default) |
|---|---|---|---|
| `mountTextStackFromRight` | Word-by-word arrival with 3D rotation + nudge-back | Sentence-level reveal where each word is a beat. Highlights via per-word color. | LIGHT (`color` = ink `#14110e`) |
| `mountTextLetterMaskDomino` | Per-letter top/bottom mask flip in domino | Title cards / hero lockups. Two-color (top → accent). | DARK (`topColor` = cream `#faf6ee`) |
| `mountTextCenterOutRoll` | Center-out letter wave per line | Multi-line punchy statements. Each line's center letter goes first; wave propagates outward; then rolls out. | LIGHT (`baseColor` = ink `#14110e`) |
| `mountTextDescramble` | Seeded per-char descramble in (or fly-apart out) | Scramble-resolve statements; `direction: 'out'` is the exit form. | LIGHT (`color` = ink `#14110e`) |
| `mountTextDupWordMask` | Duplicate-word mask: base copy slides out, accent copy slides in | Punchy single-line statements (dark out / orange in). | LIGHT (`baseColor` = ink `#14110e`) |
| `mountPhraseChain` | Giant-type lines whip in from the left and throw out right, one replacing the next; the last line carries an inline accent chip whose label hot-swaps while the chip morphs width and flashes (xai T7) | Ad openings — a 3-phrase claim chain that ends on a headline with a live word in it. Chip width morphs on `scaleX`, never `width`. | DARK (`--fx-phrase-ink` = cream `#f4ecd9`) |

### Ad-path surfaces

Promoted from `videos/reel-ad-vocabulary` (proving reel, tier A, all gates green — Umair's ruling 2026-09-03). All four are **dark-ground** by default (ink card, cream text); restyle their `--fx-*` vars for a light bed. All four **inherit the film's font** on purpose, so their text metrics match the rest of the frame.

| Effect | Intent | When to use |
|---|---|---|
| `mountTaskQueue` | An agent working a checklist on camera: rows ladder in, then each ticks done — same-hue row wash, SVG check draws itself, status chip swaps QUEUED → DONE behind an accent fill | "AI is doing the work" beats. The row wash is the §3.2 same-hue-at-constant-alpha pattern; a `backgroundColor` tween from transparent flashes gray. |
| `mountSkeletonToLive` | Skeleton bars → real fields materialize on the SAME coordinates, after a sheen wipe | "It builds itself" / loading-resolves beats. Mounts as a content layer (`position:absolute; inset:0`) inside a frame the FILM owns, so the frame stays the film's §2.2/§2.3 coordinate contract. |
| `mountLogoWall` | Tile grid of partner marks popping in on a micro-stagger, then dimming as one; optional seeded per-tile float | Social proof. **Ships no logos** — `marks: [{name, src}]` is caller-supplied with per-file `// SOURCE:` provenance (INV-15). The cream plate exists because real marks are often dark ink. |
| `mountQuoteCard` | Testimonial card lifts and settles over the dimmed wall, optional slow sheen | The claim on top of the proof. A quote is a claim: real attributed copy or an explicitly labelled sample only. |

### Card layouts

| Effect | Intent | When to use |
|---|---|---|
| `mountCardsSpreadFan` | Card stack fans horizontally with center-lift | "Pick a form" / template tease. 5 cards default, center card emphasizes. |
| `mountCardsFlyInStack` | Cards fly in from below at varied stops | Template library showcase. 6 cards default, hand-arranged scatter, center lifts after all arrive. |

### Constellations

| Effect | Intent | When to use |
|---|---|---|
| `mountConstellationPhyllotaxisBloom` | N tiles bloom from center along golden-angle spiral | "Hundreds of templates" / scale payoff. 30 tiles default; bloom from z=-1200 toward camera. |

Card and constellation mounts carry their own white surfaces — ground-agnostic.

### Stats & brand

| Effect | Intent | When to use |
|---|---|---|
| `mountStatCountUp` | "One number that matters" — card lands, value counts up, accent tint at landing | Scale/payoff stat beats (entries collected, spam blocked, sites served). Deterministic count — seek-safe. |
| `mountOdometer` | Rolling digit columns — masked slots, per-column ease and stagger, separators arrive behind the digits, settle nod as the value lands | Big round numbers that should ARRIVE, not tick. Two modes from one builder: `live: true` rolls, `live: false` renders the settled twin in the identical slot layout — that is what makes a §2.3 pixel-matched hard cut between them hold by construction. |
| `mountEndCard` | House outro — real Sullie + WPForms wordmark + CTA + URL underline sweep | Editorial/ad-style outros. Sullie in every outro is a standing rule; this is the canonical composition, restylable per film. |

**`mountStatCountUp` vs `mountOdometer`** — siblings, not modes. `mountStatCountUp` is a white CARD whose value is a text node tweened by a numeric proxy: one number, one line, ground-agnostic; pick it when the number should tick UP. `mountOdometer` is a different mechanism (per-digit masked strips, physical travel, separators that arrive after the digits) on a dark ground; pick it when the number should LAND. `stat-count-up.js` was deliberately left untouched by the odometer promotion — its API and defaults are unchanged.

### Audio

| Effect | Intent | When to use |
|---|---|---|
| `mountWaveformBars` | N bars ladder in, then breathe at a fixed Hz with SEEDED per-bar amplitudes (xai T2) | "There is audio here" beats — voice, playback, recording. `wiggle()` takes an on-screen `window` and computes a finite repeat from it. |
| `pulseEmphasis` | Press pulse on the exact AEP ratios: 1 → 0.8 → 1.1 → 1 (xai T6) | The paired press-reaction on whatever was clicked. Not a mount — a composer that takes any target. |

`mountStatCountUp` brings its own white card (ground-agnostic); `mountEndCard`
has NO bed of its own — its ink text (`--fx-endcard-ink #14110e`) assumes a
LIGHT ground; restyle the CSS vars on a dark bed.

### Glass surfaces

| Effect | Intent | When to use |
|---|---|---|
| `mountGlassCard` | Frosted-glass / holographic card: tinted gradient glass, true frost (`blur(22px) saturate(180%)`), soft-light sheen sweep (`sheenSweep`), soft-spring entrance (`glassSpringEase`) | Premium editorial surfaces over a rich moving "world" bed. Style reference: `videos/glass-style-demo/index.html` (approved 2026-09-02, from the glass-pilot-hyperframes study). |

Glass needs a rich/dark world MOVING behind it (the true frost is the point);
content inside the viewport is dark ink on light glass. Never animate the
backdrop-filter itself, and never mount over a real-UI iframe region that must
stay readable. Sheen sweeps are slow liquid (default 1.5s `sine.inOut`) — the
sub-1s power2 whip was rejected in review.

### Seams & transitions (⚠ these deviate from the mount contract)

A seam composes ACROSS two beats that already exist, so there is nothing to mount: no `el`, no `tweenInto`, no `dispose`. These take `(tl, outEl, inEl, cut)` and write to the master timeline at absolute position `cut`. `outEl` / `inEl` are whole-scene wrappers — the master owns seams, scenes own beats, and the master never touches anything inside a scene.

**`seams.js`** — the five recipes from `docs/hyperframes-seam-grammar-rnd-2026-09-03.md` §2.1–§2.5 (verbatim constants as defaults), proven on `videos/reel-ad-vocabulary` (5 cuts, `seam-gate` PASS with zero flags):

| Export | Recipe | When to use |
|---|---|---|
| `seamZoomThrough` | §2.1 — outbound recedes + blurs + dims (0.2s `power3.in`), hard cut at peak blur, inbound enters at scale 1.25 and settles (0.5s `expo.out`); opacity floor 0.15 on both sides | The signature cut. **Editorial scenes and PNG-baked states ONLY** — it animates `filter: blur()`, and a filter on any ancestor of a live-UI iframe blurs the whole raster. |
| `seamThrowLeft` + `parkThrowEntry` / `seamThrowEntry` | §2.4 — outbound accelerates off-frame left while dimming to 0.55; the cut lands mid-throw; the entering hero is ALREADY sliding left (x 210 → 0, `power3.out`) | The workhorse cut, and the iframe-safe alternative to the zoom-through. Motion, not disappearance, carries the eye. |
| `seamLockedCrossfade` | §2.2 — 0.6s `power1.inOut` opacity swap where surviving elements sit at IDENTICAL coordinates on both sides | Continuity cuts. The recipe is trivial; the craft is the coordinate contract. A crossfade alone is invisible to the velocity gate — carry a shared element across at matched speed. |
| `seamHardCut` | §2.3 — two `set`s, no blend; scene A's last frame is BUILT to equal scene B's first | When the geometry contract IS the seam. Best practice: split one release ACROSS the cut so position *and* velocity agree mid-flight, rather than matching at rest. |
| `seamCursorVelocitySplit` + `splitPoint` | §2.5 — one continuous cursor move spans the cut: 1:2 split in time, `power2.in` → `power2.out`, in-cursor `set` at the exact handoff point | Cursor continuity across a cut. Takes two matched glyphs (pass real `Cursor` instances' `.el`) — it never mounts a cursor of its own. |
| `holdFinalFrame` | §1.2 — no-op hold pinning a beat's last frame to its exact end time | Every beat, before every cut. A seam requirement, not idle time: without it a hard cut can land on a 1-frame gap. |

Two structural rules make all five cheap (§1): **shared ground** — every scene sits on the same background bed, so a throw or zoom exposes identical ground and no edge flashes; and **hold the final frame**.

**`wash-transition.js`** — the whiteout cut for await-driven (tutorial-path) films, from `videos/reel-tutorial-craft`:

| Export | Intent | When to use |
|---|---|---|
| `washTransition(out, in, {veil, axis})` | Outgoing set flies out, veil blooms to a full whiteout for ~1 blank tile, incoming set flies in as it clears. Async — returns a Promise so `await`-driven `play()` can sequence on it | Beat-to-beat cuts in a film with no master timeline. Alternate the axis (`y`, then `x`) so consecutive washes don't read as the same wipe twice. |
| `mountWashVeil(parent)` | The whiteout plate, parked hidden | Mount once as the LAST child of the surface holding both groups. A bare mount — no `tweenInto`; the wash drives it. |
| `unparkGroup(group)` | Reveal a group at its settled pose with no wash | Isolated `?scene=` entry. |

### Ease voices

| Module | Intent | When to use |
|---|---|---|
| `xai-eases.js` | AE-provenance ease vocabulary (xAI voice-agent teardown): `registerXaiEases()` registers `whipSettle` (E1 — instant launch, mile-long decel) + `heldSnap` (E2 — hold, whip, dead stop); documents E3 = `power2.inOut` and E4 ≈ power3.in–expo.in in one place | Text slides, list rolls, chip swaps (E1); card rises (E2). Full table + durations: `docs/xai-voice-motion-rnd-2026-09-02.md` ("The ease language"). |

Not a mount — no DOM, no `tweenInto`, and not exported from `index.js`. Import
directly and call once after `CustomEase.min.js` loads (no-ops with a warn if
it is absent):

```js
import { registerXaiEases } from '../../_shared/effects/xai-eases.js';
registerXaiEases();
tl.to(el, { x: 0, duration: 0.5, ease: 'whipSettle' });
```

---

## API contract

Every effect follows this shape:

```ts
interface Effect {
  el: HTMLElement;                              // root element; caller mounts + positions
  tweenInto(tl: gsap.Timeline, opts?: {
    position?: number;                          // start time on the master timeline
    // ...per-effect options (stagger, duration, ease, etc.)
  }): gsap.Timeline;
  dispose(): void;                              // remove element + scoped style tag
}
```

**Two sanctioned deviations.** Not every promoted piece of vocabulary is a mountable element:

1. **Timeline composers** — `seams.js` and `washTransition` compose across two beats that already exist, so they build no DOM. Signature is `(tl, outEl, inEl, cut, opts)` (seams) or `async (outGroup, inGroup, opts)` (wash). They still obey every other rule: absolute positions on the master timeline, transform/opacity/filter only, deterministic.
2. **Target-agnostic composers** — `pulseEmphasis(tl, target, opts)` applies a fixed motion signature to whatever element the caller names.

Anything that owns DOM stays a mount. If you find yourself adding a third deviation category, the vocabulary is probably drifting — check whether the piece belongs in `motion-primitives.js` instead.

**Why a `mount` function rather than a `gsap.registerEffect()` call?** Because we need full DOM construction (the source effects are not just tweens — they build multi-element structures like phyllotaxis spirals or per-character spans), and we need to follow the determinism rules (mulberry32 for any randomness, boundedRepeats for loops). The mount pattern matches the existing `blocks/`, `text-kit.js`, and `atmospheric.js` conventions in this repo.

---

## Adding a new effect

1. Pick the source port from `reference/gsap-effects/effectNNN.html`.
2. Create `videos/_shared/effects/<category>-<motion-verb>.js` — name it by motion intent, not by source number.
3. Extract from the source HTML:
   - **CSS** → scoped under `#${id}.${SCOPE}` (use `mountStyle` from `_utils.js`)
   - **DOM build** → make options drive the content (text, cards, count, etc.)
   - **Initial state** (`gsap.set(...)`) → run in mount
   - **Timeline build** → move into `tweenInto(tl, opts)`, accept `position`, expose tunable params
   - **Strip:** `.stage-wrap`, `.brand`, `.controls`, `fit()`, scrubber wiring — those are demo chrome, not the effect
4. Re-export from `index.js`.
5. Add an entry in this README's Vocabulary table.
6. Add a builder to `videos/_qc-effects/index.html` so it's previewable.
7. If the effect uses randomness, use `mulberry32(seed)` — never `Math.random()`. If it uses repeats, use `boundedRepeats(cycle, visible)` — never `repeat: -1`. Import both from `./_determinism.js` (a bit-identical local mirror of the canonical pair in `videos/_shared/motion-primitives.js`, so a pure-editorial film pulls in one small module instead of the tutorial-weight primitives file).

## Promoting from a proving reel

The standing gate is "prove it video-local, promote on second use". Umair's 2026-09-03 ruling adds a second door: **a QC-approved proving reel counts as the proof**, because a reel is built to exercise the vocabulary rather than to tell one story. Two reels went through it — `videos/reel-ad-vocabulary` (ad vocabulary + the 5 seam recipes, tier A, seam-gate PASS) and `videos/reel-tutorial-craft` (tutorial craft, tier A).

A promotion out of a reel is only finished when the reel **imports the promoted module and its gates still pass at the same measured values**. An unexercised promotion is untested code: refactor the source film to the shared module, re-run its battery, and compare the numbers — for a film with cuts, the `seam-gate` velocities must be identical, not merely still-passing.

## External port source: Originkit (round-2 T3, 2026-08-08)

Besides `reference/gsap-effects/`, **originkit.dev** is a free copy-paste component
library (~250 animations: shader backgrounds, pixel cards, dot matrices, text paths,
text lifts, neon borders). Port pieces on demand through the steps above — never in bulk.

**The one thing that MUST change when porting: replace the clock.** Library components
run on wall time (`requestAnimationFrame` elapsed), which is fine on a website and fatal
under our seek renderer — the frame at t=6.2s must look identical every time it's seeked.
Drive the animation off the timeline's time instead (for WebGL shaders: `uTime` = timeline
time, not rAF time; for JS loops: `pausableRaf` / a tween-driven proxy). Take the geometry
verbatim, swap the clock — same rule as INV-9. A ported piece that still reads wall time
will pass preview and fail render parity.

---

## Authoring rule: pick by intent first

For pure-editorial work, the storyboard should call effects by motion intent ("text reveal: stack-from-right"; "card layout: spread-fan"). Map intent → effect via the vocabulary table above; don't pick an effect first and then back-fill copy.
