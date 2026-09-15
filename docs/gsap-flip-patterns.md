# GSAP Flip Patterns

> **HISTORICAL API NOTE (2026-08-28):** code examples below predate the 2026-08-22 engine retirement. The craft rules stand; the `engine/`/`runtime/`/manifest APIs they mention are gone — implement in single-HTML per CLAUDE.md.
How and when to use the GSAP Flip plugin for chapter beats and postIntros in
this repo. Two video-local sandboxes prove these patterns end-to-end without
touching protected core.

## When Flip is the right reach

- A concept morph between two layouts of the **same DOM elements** (compact →
  expanded card, vertical → horizontal media row, grid → list).
- A "lift out" beat where a real WPForms element appears to detach from the
  iframe and become a focused stage card.
- Parent-change choreography (chip moves between containers, card slides into
  a shortlist column).
- State-driven reflows where ≥3 sibling elements all reposition under a class
  toggle and you want a single coherent motion.

## When it is not

- Per-chapter cursor + click + highlight beats — descriptor verbs already do
  this cleanly.
- Snapshot-to-snapshot transitions — Flip cannot animate across the
  `engine.loadSnapshot` body-wipe or the iframe document boundary. The
  closest pattern is a host-document **bridge clone**: clone the source
  element on the host stage layer before the swap, `Flip.getState`, perform
  the swap, then `Flip.from` against the destination's measured rect. This is
  feasible video-local but currently unproven; see the open question below.

## Loader pattern

Flip is loaded via `videos/_shared/kit.js`'s `loadGsap()`, which lazy-loads
the vendored GSAP at `/vendor/gsap/3.12.5/` plus Flip and MotionPathPlugin
from the same vendor directory. Chapter modules either import `loadGsap`
directly from shared, or via a per-video `_kit.js` that re-exports from
shared (with optional back-compat aliases like `loadGsapFlip`).

```js
// Direct import from shared (recommended for new videos):
import { loadGsap } from '../../_shared/kit.js';
await loadGsap(); // both Flip and MotionPathPlugin loaded by default
// Or opt out of plugins you don't need:
await loadGsap({ flip: true, motionPath: false });
```

Per-video `_kit.js` may re-export with a back-compat alias:
```js
export { loadGsap as loadGsapFlip } from '../../_shared/kit.js';
```

`window.gsap` is shared with `runtime/cinematic-kit/gsap-loader.js` so a
chapter and a runtime cinematic on the same page use the same library
instance. See `docs/chapter-module-contract.md` → "Shared video-author kit"
for the full contract.

## Authoring discipline (mandatory)

These rules from `project_future_enhancements.md` are the discipline layer for
every Flip beat:

1. One `gsap.timeline()` (or one `Flip.from` tween) per beat group; await
   completion via an `onComplete` promise.
2. `autoAlpha`, not `opacity`, for show/hide.
3. Animate transforms + opacity/filter only. Flip computes layout deltas and
   applies them as transforms — no direct `width/height/top/left` tweens.
4. `clearProps: 'transform'` on every Flip tween, `'all'` on exit fades, so
   no inline transforms leak to the next beat.
5. Function-based stagger for ≥5 elements, not a for-loop of timelines.
6. Finite `repeat` counts. No `repeat: -1`.
7. When pinning to a real iframe element, assert iframe transform is identity
   at trigger time; if not, log a warning and apply the scale factor to the
   pin math.

## Patterns

### 1. Layout-change Flip

Same element, different size/shape via class swap.

```js
const state = Flip.getState(card);
card.classList.replace('compact', 'expanded');
const tween = Flip.from(state, {
  duration: 0.7,
  ease: 'power2.inOut',
  clearProps: 'transform',
});
await flipDone(tween);
```

### 2. Parent-change Flip

Element moves between containers via `appendChild`; Flip animates the
screen-space delta as if it slid across.

```js
const state = Flip.getState(chip);
binB.appendChild(chip);
await flipDone(Flip.from(state, { duration: 0.8, ease: 'power3.inOut', clearProps: 'transform' }));
```

### 3. Pin-to-UI Flip

Editorial card morphs onto the screen rect of a real iframe element.
Measurement: `iframe.getBoundingClientRect()` + iframe-element's
`getBoundingClientRect()` × current iframe scale.

```js
const scale = iframeScale();   // assert ~1 or apply factor
const ifrRect = iframe.getBoundingClientRect();
const tRect = idoc.querySelector(sel.target).getBoundingClientRect();
const left = ifrRect.left + tRect.left * scale;
// ...
const state = Flip.getState(card);
card.style.left = left + 'px';   // + top, width, height
await flipDone(Flip.from(state, { duration: 0.85, ease: 'power3.inOut', clearProps: 'transform' }));
```

### 4. State-driven reflow Flip

Multiple siblings reposition under a parent class toggle; one Flip tween,
function-based stagger.

```js
const state = Flip.getState(grid.querySelectorAll('.chip'));
grid.classList.replace('compact', 'expanded');
await flipDone(Flip.from(state, {
  duration: 0.8, ease: 'power2.inOut',
  stagger: (i) => i * 0.04,
  clearProps: 'transform',
}));
```

### 5. Real-UI clone-and-Flip (product-truth-safe)

Clone a real iframe element onto the host stage layer with computed styles
inlined, then run any of the patterns above on the clone. The iframe DOM is
never mutated.

Key helper (`cloneFromIframe`): walks source + clone trees in parallel,
copies every property of `iframe.contentWindow.getComputedStyle(src)` to the
clone's inline `cssText`, rewrites relative `<img src>` and `url(...)`
references against the iframe's `baseURI`, strips event surfaces.

```js
const { clone, rect } = cloneFromIframe(sel.realElement, { scale });
shell.appendChild(clone);
// then any Flip pattern: layout-change, parent-change, internal reflow…
```

Constraints:

- The clone has no event listeners — visual actor only.
- Some browser-rendered controls (native `<select>`, `<input>` focus rings,
  scrollbars) won't replicate visually. Pick clone targets that are
  presentational blocks.
- Flip cannot reach the original element across the iframe document
  boundary. All Flip work happens on the host-document clone.

## Open question — cross-snapshot Flip

Flip across an `engine.loadSnapshot` swap is not yet implemented in this
repo. The viable approach is a host-document **bridge clone**:

1. Pre-swap: `cloneFromIframe(sourceSelector)`, mount on a layer parented to
   `<html>` so it survives the body-wipe (the `migrateOverlayToHtml` /
   `freezeChrome` helpers are the existing pattern).
2. `Flip.getState(clone)`.
3. Trigger `swapToSnapshot(slug, { setup })`.
4. Post-swap: measure destination element rect through the new iframe;
   resize/reposition the clone; `Flip.from(state)`.
5. Fade clone out, reveal real destination element.

Doable video-local. Worth its own sandbox before promoting any pattern to
docs as canonical.
