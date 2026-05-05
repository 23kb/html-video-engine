# GSAP Flip Patterns

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

Flip is loaded by chapter-local `_kit.js`, mirroring the existing GSAP loader
pattern. The shared `runtime/cinematic-kit/gsap-loader.js` is protected core
and only loads core GSAP — adding plugins there is approval-gated.

```js
let p = null;
export function loadGsapFlip() {
  if (window.gsap && window.Flip) return Promise.resolve(window.gsap);
  if (p) return p;
  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  p = (async () => {
    if (!window.gsap) await load('https://unpkg.com/gsap@3/dist/gsap.min.js');
    if (!window.Flip) await load('https://unpkg.com/gsap@3/dist/Flip.min.js');
    window.gsap.registerPlugin(window.Flip);
    return window.gsap;
  })();
  return p;
}
```

CDN family matches `runtime/cinematic-kit/gsap-loader.js` (`unpkg.com/gsap@3/...`).

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

Reference: `videos/flip-sandbox/chapters/flip-tour.js` Beat 1.

### 2. Parent-change Flip

Element moves between containers via `appendChild`; Flip animates the
screen-space delta as if it slid across.

```js
const state = Flip.getState(chip);
binB.appendChild(chip);
await flipDone(Flip.from(state, { duration: 0.8, ease: 'power3.inOut', clearProps: 'transform' }));
```

Reference: `videos/flip-sandbox/chapters/flip-tour.js` Beat 2;
`videos/flip-generate-card/chapters/generate-card-flip-tour.js` Beat 2 (real
card flying into a shortlist pane).

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

Reference: `videos/flip-sandbox/chapters/flip-tour.js` Beat 3.

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

Reference: `videos/flip-sandbox/chapters/flip-tour.js` Beat 4;
`videos/flip-generate-card/chapters/generate-card-flip-tour.js` Beat 3
(reflowing the inner blocks of a real template card).

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

References:

- `videos/flip-sandbox/chapters/flip-tour.js` Beat 5 — clones a form table
  row's primary cell; lifts to a center-stage preview card.
- `videos/flip-generate-card/chapters/generate-card-flip-tour.js` — full
  4-beat tour on the same cloned card (`#wpforms-template-generate`):
  lift → parent-change → internal reflow → snap back to original rect.

## Sandboxes

Both validated via `validate-video.js` + `check-video-playback.js`. Treat as
canonical references for Flip work; do not delete without replacement.

| Slug | Backdrop snapshot | What it proves |
|---|---|---|
| `flip-sandbox` | `admin-forms-overview` | Five Flip patterns on editorial DOM and cloned product DOM. |
| `flip-generate-card` | `builder-setup` | Four Flip patterns on the same cloned real card (`#wpforms-template-generate`). |

Run them locally:

```
http://localhost:4321/scenes/player.html?video=flip-sandbox
http://localhost:4321/scenes/player.html?video=flip-generate-card
```

## Open question — cross-snapshot Flip

Flip across an `engine.loadSnapshot` swap is not yet implemented in this
repo. The viable approach is a host-document **bridge clone**:

1. Pre-swap: `cloneFromIframe(sourceSelector)`, mount on a layer parented to
   `<html>` so it survives the body-wipe (see `videos/build-forms-faster-with-wpforms-ai/chapters/_kit.js`
   `migrateOverlayToHtml` / `freezeChrome` for the existing pattern).
2. `Flip.getState(clone)`.
3. Trigger `swapToSnapshot(slug, { setup })`.
4. Post-swap: measure destination element rect through the new iframe;
   resize/reposition the clone; `Flip.from(state)`.
5. Fade clone out, reveal real destination element.

Doable video-local. Worth its own sandbox before promoting any pattern to
docs as canonical.
