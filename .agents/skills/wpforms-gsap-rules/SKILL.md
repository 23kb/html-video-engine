---
name: wpforms-gsap-rules
description: "Use BEFORE writing gsap.to, gsap.timeline, gsap.from, Flip, or any author requestAnimationFrame loop — defines L0 discipline rules (one timeline per beat with position params, autoAlpha not opacity, transform/opacity/filter only, finite repeats, pausableRaf, the master-timeline + instrumentation contract, Flip for cross-DOM morphs). Skipping this means L0 violations on first-write, caught by motion-audit later, 3-iteration-minimum rewrite. Triggers: GSAP, gsap.to, gsap.timeline, timeline, tween, ease, stagger, Flip, MorphSVG, CustomEase, RAF, requestAnimationFrame, pausableRaf, animation loop. Also applies when reviewing existing timeline code."
---

# GSAP Rules for WPForms Videos

GSAP is the canonical animation library for WPForms videos. All plugins (gsap core, CustomEase, Flip, MotionPath, SplitText, MorphSVG, DrawSVG, GSDevTools, MotionPathHelper) are vendored at `vendor/gsap/3.15.0/` and loaded with plain `<script src="/vendor/gsap/3.15.0/<plugin>.min.js">` tags. (`kit.js loadGsap` was removed with the legacy runtime on 2026-08-22.)

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

**Park-state trap (acceptance E-2, 2026-08-23): park and reveal must use the
SAME visibility channel.** Parking with `autoAlpha: 0` sets
`visibility: hidden`; a reveal that tweens `opacity` only (e.g. the current
`fieldStaggerReveal`, which itself violates this rule — lib fix proposed,
pending approval) never restores visibility, and the element animates
invisibly through every run. This shipped an entirely empty builder canvas
that validator + smoke could not see. If a reveal helper tweens `opacity`,
park with `opacity: 0`; if it tweens `autoAlpha`, park with `autoAlpha: 0` —
and check which one the helper uses before parking.

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

GSAP and all plugins are vendored at `vendor/gsap/3.15.0/`. Load each piece you need with its own `<script>` tag before your module script — e.g. `gsap.min.js` always, plus `CustomEase.min.js` / `Flip.min.js` / etc. as needed. **Do not** add `<script src="https://cdn.jsdelivr.net/.../gsap.min.js">` to any film.

### 6b. Never tween an element whose centering rides a CSS `transform`

GSAP owns the `transform` property when it tweens x/y/scale/rotation — it **replaces** any CSS `translate(-50%, -50%)` centering, so the element silently re-anchors to its top-left corner the moment a tween touches it. This shipped twice in one day (form analytics ad v3: off-center stamps + drifted CTA pill; both caught only by the user's eyes).

**The discipline:**
- Hosts that center via CSS transform are **never tweened**. Tween their children.
- If the animated element itself must be centered, center it with GSAP: `gsap.set(el, { xPercent: -50, yPercent: -50 })` — percent transforms compose with later x/y/scale tweens.

```js
// WRONG — the scale tween erases the CSS translate(-50%,-50%):
/* css: #pill { left: 50%; transform: translate(-50%, -50%); } */
gsap.fromTo('#pill', { scale: 0.5 }, { scale: 1 });

// RIGHT — untweened wrapper centers; the child animates:
/* css: #pillHost { left: 50%; transform: translate(-50%, -50%); } */
gsap.fromTo('#pillHost > .pill', { scale: 0.5 }, { scale: 1 });
```

### 6c. Transform ownership — no inline CSS `translateX/Y` on a GSAP-tweened element (mp 3)

An element GSAP will tween on x/y must not carry an inline CSS `translateX/Y` offset: GSAP parses the existing transform into its own `x`, so a later `x: 0` yanks the element to origin. Use `xPercent/yPercent` for centering and let `gsap.set()` own the pixel offset from the start.

```js
// WRONG — style="transform: translateX(240px)" + gsap.to(el, { x: 0 }) → teleports to origin
// RIGHT — gsap.set(el, { x: 240 }) at mount; every later tween composes predictably
```

### 7. Finite repeats. Never `repeat: -1`

Infinite repeats break frame-stepped seeking (QC probes like `qc-probe.mjs`, any future seek-mode renderer) and never resolve in tests. Compute the repeat count from the visible duration:

```js
// WRONG: repeat: -1
// RIGHT:
const cycleDuration = 0.8;
const visibleDuration = 4;
gsap.to(el, { rotation: 360, duration: cycleDuration,
              repeat: Math.ceil(visibleDuration / cycleDuration) - 1 });
```

### 8. A mid-shot camera state is never SET, only tweened (as 13)

Any `setCamera(...)` / `gsap.set` on a visible camera or carrier element at a beat boundary is a hard cut — a defect by inspection. A chapter-entry drift that STARTED with `ifm.setCamera(...)` shipped an instantaneous reposition at every chapter break, and the seam check counted the one-frame diff spike as "good, the seam is moving" (frozen and jump-cut are opposite failures; `dead-time.js` now flags isolated spikes as `CUT?`). Start from the CURRENT pose and tween out-and-back, or bake the offset before the previous shot ends.

## Authoring discipline — call it and let it throw (mp A)

**Never `obj.method && obj.method()`.** Feature-detecting a method you believe exists converts a typo into silence: every puppetry call in one launch film's v1 no-opped through `ifm.getDocument && ifm.getDocument()` — no such method (it's `doc()`) — and the whole video shipped visually empty into a 3/10 QC round with zero console errors. If the method should exist, call it; the throw is the diagnostic. Optional chaining for a method call (`obj.method?.()`) carries the same trap.

## L1 Camera Decomposition (Editorial / Cinematic Work)

Editorial camera moves and postIntro cinematic moments require multi-phase decomposed choreography — the single biggest gap between winning videos and failed editorial attempts.

**Default ceiling enforcement for any camera move on a postIntro/cinematic/editorial beat: maximum tier C if violated. Score with `wpforms-motion-audit` skill before handoff.**

### Phase-decomposition contract

Any camera move that translates more than ~250px in canvas coords MUST decompose into phases. Single-tween translate-and-scale between fixed poses reads as a slide projector.

| Phase | Duration | What happens |
|---|---|---|
| Anticipation | 0.10–0.20s | Pre-nudge in direction of (or away from) target. Camera "winds up" before flight. |
| Flight outbound | 30–45% of move | Scale dips down to ≤0.95× target scale; translation begins. Wide-angle feel. |
| Flight inbound | 30–45% of move | Scale climbs back up to target; translation completes. Lock-in feel. |
| Land + hold | 0.30–0.50s | Camera arrives at pose, holds. 1s minimum hold for postIntros (the "land-hold-zoom rhythm"). |
| Micro-zoom (optional) | 0.40–0.60s | Tight zoom to inner target (e.g. a button, input, glyph) for "now look at this." Scale 3.0+ for inputs / 3.2+ for buttons / 2.8+ for cards. |

### Per-phase ease discipline

- Each phase uses its own ease — not one ease across the whole move.
- Use `CustomEase` for phase-specific curves. Stock easings (`power2.out` etc.) are acceptable for individual phases but the **sum of phases** must read as decomposed motion.
- Registered ease vocabulary: `videos/_shared/effects/xai-eases.js` — `registerXaiEases()` adds `whipSettle` (E1: instant launch, mile-long decel) and `heldSnap` (E2: hold, whip, dead stop); E3 = stock `power2.inOut`, E4 ≈ between `power3.in` and `expo.in`. Full AE-provenance table: `docs/xai-voice-motion-rnd-2026-09-02.md` ("The ease language").
- Rotation tilt of ±1.0° to ±1.5° during the flight phases adds cinematic feel. Skip rotation for pure-product zoom moves.
- **Short and click-triggered moves skip the anticipation phase** (`yjc` 6–7, 2026-09-04). Under ~0.5s, or when a click fires the move, the pre-nudge reads as a lurch — one blended arc (`glide`) or a launch on the click frame (`snap`). **Overshoot eases and deep zooms do not mix:** a land ease that peaks past 1.0 (`cam-whip-land` → 1.015) makes a 3.4× dive sail past its pose and rebound — use `expo.out` on deep dives. A dive moves one way only; sample the lens scale every 40ms in the film's probe and fail on any reversal.

### Concrete code shape

```js
// Three sequential tweens on the camera, one per major phase, plus a held land.
const camera = stage.querySelector('.scene-camera');
const tl = gsap.timeline({ paused: true });
const flightEase = CustomEase.create('cinematic-flight', 'M0,0 C0.18,0 0.30,0.6 0.5,0.85 C0.7,1.0 0.85,1.0 1,1');

// Phase 1: anticipation (0.15s pre-nudge in opposite direction)
tl.to(camera, { x: -40, duration: 0.15, ease: 'cinematic-anticip' });
// Phase 2: flight outbound (scale dip + translate begin)
tl.to(camera, { x: 230, scale: 0.95, rotation: 1.2, duration: 0.45, ease: 'flight-dip-out' });
// Phase 3: flight inbound (scale climbs, translate completes)
tl.to(camera, { x: 480, scale: 1.65, rotation: 0.8, duration: 0.45, ease: 'flight-land-in' });
// Phase 4: land + hold (no tween — dwell)
tl.to({}, { duration: 0.40 });
// Phase 5: micro-zoom to target element (after hold)
tl.to(camera, { x: 540, scale: 2.4, duration: 0.60, ease: 'power3.out' });
```

### Use the camera primitives — don't hand-decompose

**The shape above is shipped as executable code in `videos/_shared/motion-primitives.js`.** Don't author it from scratch. Three camera primitives cover the common cases:

- **`cinematicFlight(camera, { from, to, anticipationDuration, flightDuration, landHold, scaleDipFactor, rotationTilt, microZoom })`** — 5-phase intra-snapshot flight (anticipation → outbound scale-dip → inbound recover → land+hold → optional micro-zoom). Source: `motion-primitives.js:100`.
- **`figjamFlight(camera, { from, to, wide, zoomOutDuration, translateDuration, zoomInDuration, landHold })`** — 3-act inter-snapshot reveal (zoom out only → translate at wide scale → zoom in only). Use when the storyboard's payoff is the wide-shot reveal between A and B. Source: `motion-primitives.js:195`.
- **`focusStationOverview(camera, { focusPose, stationPose?, overviewPose, ...durations })`** — tutorial-grade focus → station → overview arc with a 120ms anchor hold. Polished rest-api shape. Source: `motion-primitives.js:272`.

Each returns a paused timeline — compose it into your master (`master.add(tl, pos)` + `tl.paused(false)`). Hand-rolling a decomposed camera reads as "almost right" and trips `wpforms-motion-audit` HARD RULE 3 (re-invented canonical → max tier B).

Load `wpforms-primitives` skill for the lookup table with QC statuses.

### Auto-ceiling triggers (from `wpforms-motion-audit` HARD RULE 3)

The motion-audit skill caps the maximum score at C/D/F when these are detected. Avoid them:

- **Sequential 4+ tweens where every value changes per tween** → max C
- **5+ atmosphere layers stacked simultaneously** → max D
- **Editorial overlay panels painted as iframe siblings rather than injected into iframe DOM** → max D
- **Purple as primary brand color** (vs. AI-feature accent) → max D
- **12+ beats packed into ≤45s without identity continuity** → max C
- **Heavy blur+scale exits** (`scale: 1.05+ + filter: blur(N px)+ + power2.in 0.5+s`) on product/content surfaces → max C
- **Dead-air holds after landing** (any wait > 800ms after the visual idea lands, without narration) → max C
- **`repeat: -1` on ambient atmosphere** (parallax, grain, glow drift) → max D (this also violates L0 rule 7 above)

### Designer principles

Designer-grade pass (Emil Kowalski / Jakub Krehel / Jhey Tompkins): when the audit critique cites them by name, file-read `.agents/skills/design-motion-principles/SKILL.md` + its `references/` for the full per-designer material — it is NOT Skill-tool invocable (installed outside `.Codex/skills/`), and nothing fires it automatically. High-level summary:

- **Emil Kowalski (UI motion):** every animation needs a purpose; default UI durations 180–240ms; exits should be faster than entrances; no animation on keyboard-driven hot paths.
- **Jakub Krehel (animation principles):** identity continuity across beats; rhythmic-not-uniform pacing; the camera follows the protagonist, doesn't cut to staged shots.
- **Jhey Tompkins (CSS/SVG/web motion):** prefer transform + opacity + filter; SVG path morphs with `morphSVG` over generated DOM; performance is part of the design.

## The Master Timeline + instrumentation contract

Single-HTML films are ONE master timeline, self-driven — no external frame driver (removed 2026-08-22 with the legacy runtime). The renderer and smoke tools discover the film through window globals:

**Contract:**

1. Build the film as one `gsap.timeline({ paused: true })` master; nest piece timelines into it (un-pause children after `add()`).
2. Expose it: `window.__tl = master`.
3. Set `window.__T0 = performance.now()` when playback actually starts.
4. Schedule `window.__done = true` (+ `window.__dur`) when the master completes (`tl.eventCallback('onComplete', ...)` or a final `tl.call`).
5. Keep cue times in `window.__sched` (non-decreasing) for beat checks.

**Never call `.play()` on nested children directly** — drive everything through the master.

## Nesting Timelines — un-pause children after `add()` (paused-child footgun)

To prepend an intro splash or append an outro to an already-fully-timed film, **nest the finished piece as a child timeline at an offset** — this is the sanctioned pattern. Do NOT hand-shift every cue's absolute time.

**The footgun:** a child timeline built with `gsap.timeline({ paused: true })` **stays frozen when added to a parent**. `parent.add(child, pos)` does NOT resume it, so the parent's playhead never drives it and the child appears dead (you get a silent no-op — smoke's `__done` never fires — not an error). Fix: call `child.paused(false)` after adding. Keep the parent itself paused and control playback through the parent. Same shape as primitives that return paused timelines (`statusPillMorph`, etc.) — they also need `.paused(false)` / `.play()` when composed into a master (see `wpforms-primitives`; FA log #26).

```js
const master = gsap.timeline({ paused: true });
master.add(splashTl, 0);
master.add(filmTl, SPL);
splashTl.paused(false);        // ← un-pause each child so the master can drive it
filmTl.paused(false);
master.pause();                // control playback through master.play()
window.__tl = master;          // instrumentation + probe read the master
```

**Offset bookkeeping:** shift everything downstream by the SAME offset — `SCENE_T`/review markers, `sfx/plan.json` clip `t` values, and `qc-probe.mjs` check times. But the nested child's own tween `startTime()`s stay **child-local** (relative to their direct parent), so a tick-grid audit that reads `startTime()` keeps working unchanged.
## pausableRaf for Author RAF Loops

**Any `requestAnimationFrame` loop in a film must be pause-aware.** There is no shared helper — films define this tiny function locally (canonical shape):

```js
function pausableRaf(cb) {
  let id = null, stopped = false;
  const tick = (ts) => { if (stopped) return; cb(ts); id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  return () => { stopped = true; if (id != null) cancelAnimationFrame(id); };
}
```

Vanilla `requestAnimationFrame` loops that never stop keep burning CPU after the film ends and can't be paused by probes.

## Awaiting tweens — prefer timeline positions over sleep chains

For beats that must wait on a tween, put the NEXT beat at a position on the same timeline instead of `await sleep(duration)` chains (rule 1). Where a genuine wall-clock await is unavoidable, use a plain timeout with a small fallback margin:

```js
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(520); // duration + ~20ms settle
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

Wrap a beat's animation scope in `gsap.context()` so teardown cleanly reverts every tween:

```js
const ctx = gsap.context(() => {
  gsap.to('.foo', { x: 100 });
  gsap.timeline().to('.bar', { y: 50 });
}, scopeElement);
// ... later ...
ctx.revert(); // Single call kills every tween created in scope
```

## Flip Patterns

Use Flip for layout-change animations (label-to-field morphs, card reflows, choice-row reorder). Load the plugin with its own vendored script tag when the film needs it (`/vendor/gsap/3.15.0/Flip.min.js`), then use the global `Flip`.

```js
const state = Flip.getState('.choice-row');
// ... mutate DOM (reorder, reparent, change classes) ...
Flip.from(state, { duration: 0.5, ease: 'power2.inOut',
                    absolute: true, // detach from layout flow during animation
                    onComplete: () => { /* cleanup */ } });
```

**Don't try to Flip across snapshot boundaries** — compose both states into one continuous timeline instead, or use `IframeManager.swap()`'s crossfade between snapshots (see `wpforms-marketing`, *Snapshot transitions*).

## Determinism (Cross-Cuts All GSAP Work)

Film code must be deterministic so frame-stepped QC probes and renders reproduce identical state. **See INV-9 in `docs/video-architecture-invariants-2026-05-12.md`** — that is the canonical source. Rule 7 above (no `repeat: -1`) is part of the determinism set.

Static check: `node tools/lint-determinism.js [--video <slug>]`.

## Seek-Render Traps (round-2 B3, adopted 2026-08-08)

Frame-stepped seeking (`qc-probe.mjs` seeks the paused master timeline; a future seek-mode renderer would too) changes how GSAP evaluates state. These eight traps come from a production build on the same architecture (HyperFrames public build, `docs/video-system-improvements-round2-2026-08-08.md`) — the first one bit that project SIX times:

1. **Park initial states in CSS** (or `gsap.set()` at parse). A `fromTo` with `immediateRender: false` doesn't apply its from-state until the tween starts — if the element is visible before that (its own `tl.set`, or a parent turning opaque), it displays in its FINAL state first, then snaps back and animates in ("double reveal" / "flash"). Rule of thumb: **any element whose `fromTo` starts LATER than the visibility set on its scene wrapper must be parked hidden in CSS.** Never hide via `tl.set(..., 0)` — a zero-duration set at position 0 does not render on frame 0, and frame 0 may be a match-cut frame.
2. **Masked-word reveals: the hidden state comes from the tween, not CSS `%`.** A CSS `translateY(100%)` on the words gets baked into GSAP's own pixel value and the words stay under the mask forever. Set the hidden offset via the tween's `from` values.
3. **`.to()` reads its start from CSS under render seeks.** Anything the renderer seeks past needs `fromTo` with explicit starts. Two known flavors: a card whose CSS rest was `rgba(...,0)` interpolated from *transparent*; and tweening from `background: transparent` raises alpha off a BLACK base — a warm tint passes through visible grey. Rest colors on tweened surfaces must be opaque.
4. **Reveals use `clip-path`, never `width`/`scaleX`.** Layout props snap to integer device pixels under seek-by-frame capture (stepping); `scaleX` squashes radii and inner content.
5. **Never trust a zero-duration `set` on a visibility/asset boundary.** A `tl.set` landing exactly on a clip's start/end frame can produce one frame where neither state is painted (measured: a single black frame). Cross boundaries with a short explicit cross-tween (~2 frames) so exactly one side is always painted.
6. **Absolute-value tweens on one property stack.** A later tween writing absolute `y` overwrites the earlier one mid-flight. For multi-phase camera moves, drive independent proxy channels composed in ONE paint function — and where an anchor must not drift, derive one axis from the other (e.g. `x = -(scale-1) * anchorX` pins the anchor column at every scale).
7. **A mask defeats a cut-the-curve.** `overflow: hidden` per word pins the leading edge — glyphs reveal in place with zero travel, and the seam's velocity match dies. No masks on elements that carry a seam vector.
8. **`transform-origin: 0 0` is load-bearing** for any morph using the offsets-are-position-negated trick. A centre origin sends the zoom off-screen with content cropped.

If a camera move or ease is duplicated across two files that meet at a cut (both sides evaluating the same analytic clock), the constants **MUST stay identical** — change one, change the other, re-verify the seam.

## Output Checklist

Before declaring GSAP work done:

- [ ] Every timeline used for choreography is `gsap.timeline()` with position params, not `await/sleep` chains
- [ ] Show/hide uses `autoAlpha`, not `opacity` (for new code)
- [ ] Tweens animate transform/opacity/filter/SVG only (or have a documented exception)
- [ ] Final tween in a chain has `clearProps: 'all'` if inline transforms shouldn't persist
- [ ] Multi-element animations use `stagger:`, not manual delay loops
- [ ] No `repeat: -1` anywhere
- [ ] No CDN-loaded GSAP — vendored `vendor/gsap/3.15.0/` script tags only
- [ ] Author RAF loops are pause-aware (inline `pausableRaf` shape, no raw never-stopping loops)
- [ ] ONE master timeline (`window.__tl`, built `paused: true`, driven only through the master's `play()`); nested children un-paused after `add()` and never `.play()`ed directly
- [ ] `node tools/lint-determinism.js --video <slug>` passes (or warnings reviewed and accepted)

## References (loaded on demand)

- `docs/gsap-rules.md` — Canonical L0 rule reference with full examples and audit notes. Read for the deepest rationale.
- `docs/effects-library.md` — Read when picking or composing a registered effect (`highlightPulse`, etc.) — full API for each.
- `docs/gsap-flip-patterns.md` — Read when using Flip for morphs, reflows, or label-to-field transforms.
- `docs/deterministic-logic.md` — Read for the determinism rule rationale and `tools/lint-determinism.js` behavior.
- `docs/deterministic-logic-findings.md` — Read when investigating an existing-video determinism warning before migrating it.

## Granular craft references

- `docs/atmospheric-composition.md` — Read when composing GSAP timelines that include grain / sweep / parallax / scale-push.
- `docs/cursor-choreography.md` — Read when GSAP-tweening cursor positions or building drag-grab motion paths.
- `docs/beat-pacing.md` — Read when timing GSAP timelines to narration cues.

## See Also

- `wpforms-primitives` — `motion-primitives.js` lookup. `cinematicFlight`, `figjamFlight`, `focusStationOverview` are the executable L1 camera decomposition.
- `wpforms-video` — universal authoring + storyboard gate.
- `wpforms-postintro` — postIntro design (postIntros are the heaviest GSAP code in the repo).

- `wpforms-marketing` — text-kit + atmospheric kit + blocks library (all GSAP-backed editorial helpers).
