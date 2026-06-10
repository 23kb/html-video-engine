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

| Effect | Intent | When to use |
|---|---|---|
| `mountTextStackFromRight` | Word-by-word arrival with 3D rotation + nudge-back | Sentence-level reveal where each word is a beat. Highlights via per-word color. |
| `mountTextLetterMaskDomino` | Per-letter top/bottom mask flip in domino | Title cards / hero lockups. Two-color (top → accent). |
| `mountTextCenterOutRoll` | Center-out letter wave per line | Multi-line punchy statements. Each line's center letter goes first; wave propagates outward; then rolls out. |

### Card layouts

| Effect | Intent | When to use |
|---|---|---|
| `mountCardsSpreadFan` | Card stack fans horizontally with center-lift | "Pick a form" / template tease. 5 cards default, center card emphasizes. |
| `mountCardsFlyInStack` | Cards fly in from below at varied stops | Template library showcase. 6 cards default, hand-arranged scatter, center lifts after all arrive. |

### Constellations

| Effect | Intent | When to use |
|---|---|---|
| `mountConstellationPhyllotaxisBloom` | N tiles bloom from center along golden-angle spiral | "Hundreds of templates" / scale payoff. 30 tiles default; bloom from z=-1200 toward camera. |

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
7. If the effect uses randomness, use `mulberry32(seed)` — never `Math.random()`. If it uses repeats, use `boundedRepeats(cycle, visible)` — never `repeat: -1`. Both are in `videos/_shared/motion-primitives.js`.

---

## Authoring rule: pick by intent first

For pure-editorial work, the storyboard should call effects by motion intent ("text reveal: stack-from-right"; "card layout: spread-fan"). Map intent → effect via the vocabulary table above; don't pick an effect first and then back-fill copy.
