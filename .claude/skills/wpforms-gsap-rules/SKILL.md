---
name: wpforms-gsap-rules
description: Use before writing or reviewing any GSAP code in WPForms videos — chapter effects, postIntros, cinematics, shared kits. Covers L0 GSAP discipline (single timeline per beat, autoAlpha not opacity, transform/opacity/filter only, finite repeats), Phase B registered timelines (paused + registerTimeline + driver-owned seek), Phase E.5 pausableRaf (every author RAF loop), Flip patterns (cross-DOM morphs), and the shared effects.js library. Triggers on any "GSAP", "Flip", "timeline", "tween", "animation", "RAF", or "requestAnimationFrame" work.
---

# GSAP Rules for WPForms Videos

GSAP is the canonical animation library for WPForms videos. All free plugins (Flip, MotionPath, SplitText, MorphSVG, DrawSVG, CustomEase, GSDevTools, MotionPathHelper) are vendored at `vendor/gsap/3.15.0/` and loadable via `videos/_shared/kit.js loadGsap({ ... })`.

These are correctness/perf rules — equivalents of "don't write SQL injection." Apply regardless of authoring mode, surface mode, or storyboard.

## L0 Discipline — The Seven Rules

### 1. One `gsap.timeline()` per beat group; sequence with position params

Position params give frame-accurate sequencing. `await sleep()` / `onComplete: resolve` chains drift on slow frames and cannot seek/scrub.

**WRONG:**
```js
await new Promise(r => gsap.to(el, { x: 100, onComplete: r }));
await new Promise(r => gsap.to(el, { y: 50, onComplete: r }));
```

**RIGHT:**
```js
const tl = gsap.timeline();
tl.to(el, { x: 100, duration: 0.5 }, 0);
tl.to(el, { y: 50, duration: 0.5 }, 0.5);
// Or use position keywords: '<', '>', '<0.2', '+=0.1'
```

### 2. `autoAlpha`, not `opacity` for show/hide

`autoAlpha` sets `visibility: hidden` at 0 — removes hidden elements from hit-testing and avoids leaving invisible interactive layers alive.

**WRONG:** `gsap.to(el, { opacity: 0, duration: 0.3 })`
**RIGHT:** `gsap.to(el, { autoAlpha: 0, duration: 0.3 })`

(Existing accepted videos use `opacity` in some show/hide paths; treat those as legacy. Use `autoAlpha` for new code.)

### 3. Animate transform / opacity / filter / SVG attrs only

`width`, `height`, `top`, `left` trigger layout. Transforms run on the compositor. `filter` is allowed (paint, not full layout). SVG attributes are allowed for path/stroke choreography.

**WRONG:** `gsap.to(el, { width: '60%', top: 200 })`
**RIGHT:** `gsap.to(el, { scale: 0.6, y: 200 })`

(Existing cinematics morph `width`/`minHeight`/`borderRadius` in some places. Proven cinematic implementations stay; new work uses transform/filter/SVG.)

### 4. `clearProps: 'all'` after tweens that leave inline transforms

Inline transforms persist on the element after the tween. If a later beat re-targets the same element with CSS, it loses. Add `clearProps: 'all'` to the final tween that should release control.

```js
tl.to(el, { x: 100, scale: 1.2, duration: 0.4 });
tl.to(el, { x: 0, scale: 1, duration: 0.3, clearProps: 'all' }); // last tween releases
```

### 5. Function-based stagger for ≥5 elements

Manual `delay` chains for many elements drift on slow frames and aren't seek-stable. Use `stagger:` config or function-based stagger.

**WRONG:**
```js
items.forEach((el, i) => gsap.to(el, { y: 0, delay: i * 0.05 }));
```

**RIGHT:**
```js
gsap.to(items, { y: 0, duration: 0.4, stagger: 0.05 });
// Or function-based for non-uniform timing:
gsap.to(items, { y: 0, duration: 0.4, stagger: { each: 0.05, from: 'center' } });
```

### 6. Pin GSAP version. Never load floating `@3` from a CDN

GSAP and all plugins are vendored at `vendor/gsap/3.15.0/`. Load via `videos/_shared/kit.js loadGsap({ flip, motionPath, splitText, morphSVG, drawSVG, customEase, gsDevTools, motionPathHelper })` — flags default off except `flip` and `motionPath`. **Do not** add `<script src="https://cdn.jsdelivr.net/.../gsap.min.js">` to chapters or cinematics.

### 7. Finite repeats. Never `repeat: -1`

Infinite repeats break the seek-render pipeline (Phase E.5 `--seek` mode) and never resolve in tests. Compute the repeat count from the visible duration:

```js
// WRONG: repeat: -1
// RIGHT:
const cycleDuration = 0.8;
const visibleDuration = 4;
gsap.to(el, { rotation: 360, duration: cycleDuration,
              repeat: Math.ceil(visibleDuration / cycleDuration) - 1 });
```

## Phase B — Registered Timelines (paused + driver-owned)

Editorial-layer GSAP timelines opt into being **owned by the runtime frame driver**. The driver pauses, seeks, and resumes them deterministically — surviving hidden-tab RAF throttling and pause/resume from the scrubber.

**Contract:**

1. Build the timeline with `gsap.timeline({ paused: true })` — paused at construction.
2. Add all `.to/.from/.fromTo/.set` calls **before** registration. Duration is snapshotted at registration.
3. Call `registerTimeline(tl, { id })` from `videos/_shared/kit.js`.
4. **Never call `tl.play()`** on a registered timeline. The driver seeks.

**Example:**
```js
import { loadGsap, registerTimeline } from '../../_shared/kit.js';
const { gsap } = await loadGsap();

const tl = gsap.timeline({ paused: true });
tl.from('.title', { y: 50, autoAlpha: 0, duration: 0.6 }, 0);
tl.from('.subtitle', { y: 30, autoAlpha: 0, duration: 0.5 }, 0.2);
// ... all tweens here ...

registerTimeline(tl, { id: 'hero-title-reveal' });
// Driver seeks. Don't call tl.play().
```

**When to register:** any paused timeline that should scrub via the author scrubber, survive hidden-tab throttling, or seek deterministically for `tools/render.js --seek`.

**When NOT to register:** fire-and-forget tweens (small SFX-synced animations, narration-cued micro-moves, anything where the author has explicit wall-clock control). Use plain `gsap.to()` and `awaitTween()` for those.

## Phase E.5 — pausableRaf for Author RAF Loops

**Any `requestAnimationFrame` loop in a video chapter or cinematic MUST use `pausableRaf(cb)` from `videos/_shared/kit.js`.** Vanilla `requestAnimationFrame` will not honor pause from the scrubber.

**WRONG:**
```js
function loop() {
  renderer.render(scene, camera);
  requestAnimationFrame(loop); // Ignores pause-manager
}
loop();
```

**RIGHT:**
```js
import { pausableRaf } from '../../_shared/kit.js';

const cancel = pausableRaf((ts) => {
  renderer.render(scene, camera);
});
// Skips the body when paused. Cancels via the returned function on chapter teardown.
```

Already migrated: REST API video's 7 chapters and `runtime/cinematic-rough-thought-to-draft.js`. New Three.js or render-loop beats: route through `pausableRaf` from the start.

## awaitTween — fire-and-forget Promise on tween/timeline

For unregistered tweens that the chapter `await`s, use `awaitTween(tweenOrTimeline, { duration, fallbackMs })` from `videos/_shared/kit.js`. It resolves via `setTimeout` instead of `eventCallback('onComplete')` — survives hidden-tab RAF throttling at the call-site level.

```js
import { awaitTween } from '../../_shared/kit.js';
const tl = gsap.timeline();
tl.to(el, { x: 100, duration: 0.5 });
await awaitTween(tl); // Resolves after 0.5s + fallback (50ms default)
```

## Shared Effects Library

`videos/_shared/effects.js` registers reusable named effects via `gsap.registerEffect()`. Each is callable as `gsap.effects.<name>(target, opts)`:

- **`highlightPulse`** — quick attention pulse (scale + filter flash)
- **`fieldBurst`** — small radial burst at element center
- **`labelReveal`** — character cascade text reveal (uses SplitText)
- **`popOutTilt`** — z-pop + tilt + shadow ("this is the thing")
- **`cardReflow`** — Flip-based layout reflow (uses Flip plugin)

**Use these before hand-rolling.** They follow all L0 rules and use `gsap.context()` for cleanup.

## Cleanup — `gsap.context()` and `withGsapContext()`

Wrap chapter/postIntro animation in `gsap.context()` so chapter teardown cleanly reverts every tween:

```js
import { withGsapContext } from '../../_shared/kit.js';
effect: async ({ doc }) => {
  const { ctx, revert } = withGsapContext(() => {
    gsap.to('.foo', { x: 100 });
    gsap.timeline().to('.bar', { y: 50 });
  }, doc.body);
  // ... wait for narration ...
  revert(); // Single call kills every tween created in scope
}
```

## Flip Patterns

Use Flip for layout-change animations (label-to-field morphs, card reflows, choice-row reorder). The `Flip` plugin is loaded by default via `loadGsap()`.

```js
import { Flip } from 'gsap/Flip'; // or via loadGsap({ flip: true })

const state = Flip.getState('.choice-row');
// ... mutate DOM (reorder, reparent, change classes) ...
Flip.from(state, { duration: 0.5, ease: 'power2.inOut',
                    absolute: true, // detach from layout flow during animation
                    onComplete: () => { /* cleanup */ } });
```

**Don't try to Flip across snapshot boundaries** — the source DOM is gone before the target mounts. That's what `flipBridge` swap style handles (see `wpforms-transitions` skill).

## Determinism (Cross-Cuts All GSAP Work)

For Phase E.5 `--seek` mode render parity, video chapter and cinematic code is **deterministic**:

- No `Date.now()` outside the player driver.
- No unseeded `Math.random()` — use `mulberry32(seed)` from `videos/_shared/kit.js`.
- No `fetch()` at runtime — assets must be loaded before render starts.
- No `repeat: -1` (already covered above).

Static check: `node tools/lint-determinism.js [--video <slug>]`.

## Output Checklist

Before declaring GSAP work done:

- [ ] Every timeline used for choreography is `gsap.timeline()` with position params, not `await/sleep` chains
- [ ] Show/hide uses `autoAlpha`, not `opacity` (for new code)
- [ ] Tweens animate transform/opacity/filter/SVG only (or have a documented exception)
- [ ] Final tween in a chain has `clearProps: 'all'` if inline transforms shouldn't persist
- [ ] Multi-element animations use `stagger:`, not manual delay loops
- [ ] No `repeat: -1` anywhere
- [ ] No CDN-loaded GSAP — `loadGsap()` from `videos/_shared/kit.js` only
- [ ] Author RAF loops use `pausableRaf` (no raw `requestAnimationFrame`)
- [ ] Any registered timeline is `paused: true` and never has `tl.play()` called on it
- [ ] `node tools/lint-determinism.js --video <slug>` passes (or warnings reviewed and accepted)

## References (loaded on demand)

- `docs/gsap-rules.md` — Canonical L0 rule reference with full examples and audit notes. Read for the deepest rationale.
- `docs/effects-library.md` — Read when picking or composing a registered effect (`highlightPulse`, etc.) — full API for each.
- `docs/gsap-flip-patterns.md` — Read when using Flip for morphs, reflows, or label-to-field transforms.
- `docs/frame-driver.md` — Read when migrating an existing cinematic to registered timelines or debugging the driver.
- `docs/pause-manager.md` — Read when authoring a Three.js or render-loop beat (`pausableRaf` contract) or debugging scrubber pause/resume.
- `docs/deterministic-logic.md` — Read for the determinism rule rationale and `tools/lint-determinism.js` behavior.
- `docs/deterministic-logic-findings.md` — Read when investigating an existing-video determinism warning before migrating it.

## Granular craft references

- `docs/atmospheric-composition.md` — Read when composing GSAP timelines that include grain / sweep / parallax / scale-push.
- `docs/cursor-choreography.md` — Read when GSAP-tweening cursor positions or building drag-grab motion paths.
- `docs/beat-pacing.md` — Read when timing GSAP timelines to narration cues.

## See Also

- `wpforms-video` — universal authoring + storyboard gate.
- `wpforms-postintro` — postIntro design (postIntros are the heaviest GSAP code in the repo).
- `wpforms-transitions` — `flipBridge`, camera poses, scrubber/render workflow.
- `wpforms-marketing` — text-kit + atmospheric kit + blocks library (all GSAP-backed editorial helpers).
