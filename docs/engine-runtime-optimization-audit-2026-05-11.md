# Engine + Runtime Optimization Audit — 2026-05-11

Phase 5c Track 1. Review-only doc; no code edits proposed for direct execution.

## Executive summary

Three signals stand out across the audited surface (~3,800 LOC of engine + runtime, plus `scenes/shared*` and `videos/_shared/kit.js`):

1. **The biggest token-burn lever is dead/legacy code that survives because it once mattered.** `engine/engine.js#runScene`, `engine/engine.js#spotlight`, `engine/engine.js#pointer`, `engine/engine.js#cursor.dragGrab`, `engine/wpforms.js#whiteout`, `runtime/dom-prep.js#applyIconChoices` (the deprecated unicode-star variant), `runtime/dom-prep.js#harvestField`/`injectField`, the entire `scenes/shared.js#runBeatsAtTimes`/`runBeatsSequential` pair, and the `runtime/camera-poses.js` registry are all kept alive but have zero direct chapter callers in production videos. They cumulatively burn ~600 LOC every time Claude reads the engine, and the prose comments around them (especially `runScene`'s 60-line beat-shape comment block at engine.js:666-688 and the deprecated-helper paragraphs at dom-prep.js:267-356/611-669) are the prose equivalent — explaining how something works that nothing uses.

2. **The biggest perf lever is hot-path debug logging and per-call rect re-measurement.** `zoomTo` (engine.js:242-283) prints three `console.log` lines per call — including a 12-key serialized object — for every camera move in every chapter. Selector resolution allocates a fresh `{ sel, node, rect: getBoundingClientRect() }` array for every call (engine.js:216-224), and `interactions.js#resolve` (interactions.js:30-49) re-reads computed style on every cursor move. None of this is per-frame, but it's per-step in 50+ steps per video. The compounding loss is real, and it's also a token tax during dev work because every test run produces hundreds of `[zoomTo]` log lines that pollute `node tools/check-video-playback.js` output.

3. **The biggest structural lever is duplication between `runtime/player.js` and `runtime/chapter-runner.js`.** Two paint-anchored gates (`awaitPostIntroReady`) duplicated word-for-word; two start-gate implementations; two `loadTeaser` implementations; two URL-override resolvers; two intro/postIntro/teaser/outro orchestration blocks; two cover-mounting helpers (`mountCover` in player.js + scene-helpers.js + transitions.js — three copies). The legacy/descriptor split is a real product decision but the boilerplate around it is not. `scenes/shared.js` further duplicates the same ideas (`mountCover`, `runBeatsSequential`, `runBeatsAtTimes`) for legacy `scenes/*.html` callers that no production video uses.

The authoring audit was right that the system can produce winners. This audit doesn't dispute that. The recommendations are about **removing weight** so that future authoring work is faster and cheaper, not about replumbing the engine. Top three highest-impact deltas: kill dead primitives (proposal #1), extract a player↔chapter-runner shared core (#3), and gate the `zoomTo` debug logs behind a flag (#2).

---

## Per-file findings

### engine/engine.js — 749 lines

- **Token-burn:**
  - engine.js:666-688 — 22-line block-comment documenting the `runScene` beat shape. Helpful when `runScene` was the canonical chapter shape; `runScene` now has zero direct chapter callers (verified via grep across `videos/`). The comment + function body is ~83 lines that no chapter exercises.
  - engine.js:351-428 — `pointer()` is a 78-line primitive with extensive direction-switch logic; zero direct chapter callers. Only invoked indirectly via `runScene`'s overlay loop and `runBeatsPerNarration`'s overlay loop, neither of which has a production user that passes `{ pointer: ... }` overlay shapes (verified — `overlays: [` exists in 16 video chapters, but they all pass `{ highlight: }` / `{ highlights: }` shapes, never `{ pointer: }`).
  - engine.js:442-477 — `spotlight()` is a 35-line primitive with class-chain marking; zero direct chapter callers.
  - engine.js:541-610 — `cursor.dragGrab` is a 70-line composite primitive; zero callers under `videos/` (only mentions are `wpforms-rest-api-overview*/postmortem-ch1.md`).
  - engine.js:633-655 — debug `'d'` hotkey installer, ~22 lines. Useful when authoring; pure overhead at runtime and read time.
  - engine.js:666-749 — `runScene` itself, ~80 lines of declarative beat compositor that production routes through `runtime/player.js#runChapter` instead.
  - The inlined CSS in `loadSnapshot` (engine.js:95-137, ~43 lines of CSS-in-JS) bundles cursor/highlight/label/pointer/debug-rect styles into a string template that gets re-parsed on every snapshot load. Half of those styles (`.pointer*`, `.debug-rect`) are for primitives nothing calls.
- **Performance:**
  - engine.js:246, 251, 271 — `zoomTo` does **three** `console.log` calls per invocation, including one with 12+ keys and live `getBoundingClientRect()` reads (line 268-270 measures `_ifrR` + `_bodyR` + `_scrollY` only to log them). This fires on every camera move; in a 50-step chapter that's 150 console rows of debug output, plus three needless rect/scroll reads per call.
  - engine.js:208-214 — `unionRects` calls `Math.min(...rects.map(b => b.left))` four times. For N rects that's 4 array allocations and 4N comparisons; trivial today but should be a single 4-loop. Not a bottleneck — flag as polish.
  - engine.js:216-224 — `resolveTargets` reads `getBoundingClientRect()` synchronously for every selector hit. `zoomTo` then re-reads it at line 250 (`for (const h of hits) h.rect = h.node.getBoundingClientRect();`). That double-read is intentional (post-scroll), but the first read at line 221 is wasted work for the smooth-scroll path. Could be a `noScroll` short-circuit.
  - engine.js:159-167 — `loadSnapshot` resolves a Promise on iframe `'load'`, but adds no `'error'` listener. A failed snapshot URL leaves the boot hung indefinitely.
  - engine.js:480-510 — `cursor.park` and `cursor.moveTo` reset `transition` and toggle `'on'` class on every call. `state.cursorEl.style.transition = 'none' / restore` is a layout-trip pattern (`void state.cursorEl.offsetWidth`) — not free, but called per-cursor-move. Probably fine; flag as low-priority.
  - engine.js:44-69 — `ensureCameraDriver` registers a `frame-driver` adapter with `duration: 60 * 60` (1 hour). `frame-driver` ticks every adapter every frame (frame-driver.js:63-69) — at 60fps that's 3,600 ticks/min just to seek a camera that often isn't animating. The `if (!cameraAnimation) return;` guard at line 52 short-circuits, so cost is one branch per frame per adapter, not real wall-time. Still: if `cameraAnimation` is null 99% of the time the seek loop is wasted iterations. Cheap fix is unregister-when-idle.
  - engine.js:71-87 — `applyCamera` calls `easeProgress` (line 40-42) which is a fixed cubic — `easing` parameter is **accepted but ignored** (just stored on `cameraAnimation.easing`, never read). Every chapter that passes `easing: '...'` is being silently overridden.
- **Dead-code / orphan:**
  - `runScene` (line 689): 0 production callers — verified via Grep across `videos/**/*`. (Does still get pulled in by player.js mode `parallel` / `audio-cued` import path; but the player wraps beats first, so player.js could inline a thinned runScene that drops the chapter-break-on-zoom branch + spotlight/pointer overlays.)
  - `pointer` (line 351), `spotlight` (line 442), `cursor.dragGrab` (line 549): 0 production callers.
  - debug hotkey installer (line 634): exists but never documented; harmless.
  - The `easing` argument on `applyCamera` (line 71) and `setCameraTransform` (line 203) is plumbed through the API but never used — easeProgress is hardcoded.
- **Premature abstraction:**
  - `unionRects` is a real primitive (used by `zoomTo` and `highlight`); fine. But the two-stage scroll-then-measure dance in `zoomTo` (lines 247-250) plus the noChange short-circuit (lines 274-281) is the kind of branching that hides the simple 80% case under 5 cases of corner handling. Could read cleaner without losing correctness.
- **Coupling smells:**
  - `state` is a module singleton; multi-iframe is impossible by construction. That's a real architectural choice and probably fine for this product, but worth flagging if `flipBridge`'s temporary preloaded iframe ever needs to be addressed independently.
  - `state.doc` is read 6 places without nullcheck (e.g. line 219, 443, 614). After body-wipe + before iframe `load`, accessing these throws TypeError. Defensive in `wpforms.js` (`?.contentDocument ?? null`); not defensive here.
- **Recommendation summary:** (1) Move `runScene`/`pointer`/`spotlight`/`dragGrab` and the debug hotkey out into a `engine/legacy.js` companion (or delete outright) — that's ~250 LOC token-burn savings on every read with zero behavioural impact on shipping videos. (2) Gate the three `zoomTo` `console.log` calls behind `?debug=1` or remove — saves console noise plus three rect reads per camera move. (3) Either honor the `easing` parameter or drop it from the signature.

---

### engine/wpforms.js — 698 lines

- **Token-burn:**
  - wpforms.js:489-543 — `whiteout()` is a 55-line primitive with `addKeep` / `removeKeep` / `clear` returning a handle. **Zero callers in production videos** (Grep shows it referenced only in docs and `runtime/verbs.js`'s descriptor verb table, but no descriptor-mode chapter actually uses it). Burns the read budget every time the file is loaded.
  - wpforms.js:577-661 — `enableConditionalLogicRule` is an 85-line primitive. Used by the form-notifications/conditional-logic chapter — confirmed callable. Keeps.
  - wpforms.js:564-661 — `collapseBlock` and `enableConditionalLogicRule` co-exist; `collapseBlock` is referenced by 0 video files. Same tier as `whiteout`.
  - The `escapeHtml` function (line 663) is a 1-use util inlined for HTML injection in `enableConditionalLogicRule`. Fine.
  - The `resolvePickItem` (line 669) and `buildChipDataValue` (line 683) and `uniqueSelectorFor` (line 696) are at the bottom of the file as "internals" — `uniqueSelectorFor` is a 1-line wrapper that just concatenates two strings (`return ${wrapSelector} ${relativeSelector};`). Inline candidate.
- **Performance:**
  - wpforms.js:9-19 — `$`, `$$`, `getDoc` each call `document.querySelector('iframe.ui')` fresh on every helper invocation. Production chapters call wpforms helpers ~10x per chapter (toggleControl + smartTag + selectDropdown across notifications); each helper internally calls `$` 1-3 times. Net ~30 redundant `iframe.ui` queries per chapter. Not a bottleneck (the document tree is small at the document level), but a Map cache + DOM mutation listener would be sub-millisecond and would eliminate a lot of redundant work.
  - wpforms.js:235-247 — `selectDropdown` builds a faux dropdown by iterating options and setting per-row `mouseenter`/`mouseleave` listeners (lines 244-245). Listeners are added to nodes that are removed at line 272 — listeners die with the node, but it's noisy.
  - wpforms.js:328-388 — `duplicateBlock` measures natural height by `maxHeight: 'none'` → `getBoundingClientRect()` → `maxHeight: '0px'` (lines 374-377). Triggers two layout passes per call. Production sites (form-notifications managing.js) call this once per chapter, so absolute cost is small; pattern is fine.
  - wpforms.js:69-75 — `toggleControl` runs `cursor.moveTo(iconSel)` then `cursor.click()` — but these are done by `cursor.clickOn` over in `interactions.js` already with the same intent. `clickOn` is the modern shape. `toggleControl`'s existence is fine (it does the WPForms-state update too) but the cursor chunk is duplicated semantics.
- **Dead-code / orphan:**
  - `whiteout` (line 502): 0 production callers.
  - `collapseBlock` (line 551): 0 production callers in `videos/` (`form-notifications/managing.js` references `duplicateBlock` and `toggleBlockActive` but not `collapseBlock`).
  - `applyIconChoices` (deprecated original) is in `dom-prep.js`, not here. Noting for cross-reference.
- **Premature abstraction:**
  - `uniqueSelectorFor` (line 696) — single-line wrapper, single caller. Inline.
  - The `pick` argument to `smartTag` accepts 3 different shapes (`{type:'field', label}`, `{type:'field', value}`, `{type:'other', value}`) — fine, but the `resolvePickItem` function dispatches them in 8 lines (line 669-679). That's the one place a discriminated union would help: if any of the 3 shapes were dropped this could halve.
- **Coupling smells:**
  - Whole file knows WPForms class names (`.wpforms-toggle-control-icon`, `.wpforms-smart-tags-widget-input`, etc.) — that's by design. This is the WPForms-puppetry layer; it's correctly named and scoped. No issue.
- **Recommendation summary:** Delete `whiteout`, `collapseBlock`, and `uniqueSelectorFor` (~85 LOC). Cache the iframe lookup. Otherwise this file pulls its weight for every WPForms tutorial video.

---

### engine/interactions.js — 327 lines

- **Token-burn:**
  - interactions.js:80-92 — `installMacCursor` re-injects the cursor SVG; called inside `chapter-runner.js#bootSnapshot` and `swapSnapshot`. Fine.
  - interactions.js:106-116 — `ANCHORS` map; small, useful.
  - interactions.js:282-306 — `toggle()` does selector resolution + magnetic ripple + native event dispatch. Production usage is for radio/checkbox litmus, real users (`form-notifications`, `klaviyo-addon-intro`). Keeps.
- **Performance:**
  - interactions.js:30-49 — `resolve()` calls `el.getBoundingClientRect()` then `getComputedStyle(el)` on every cursor verb. The display/visibility/opacity check is good defensive validation but it's per-call. For a chapter that runs `cursor.clickOn(sel)` 5 times, each click adds 5 computed-style reads. Could be a `_pendingResolve` cache invalidated on DOM mutation, but the simpler win is a `?debug=1` gate so production doesn't pay for it.
  - interactions.js:166-220 — `clickOn` is the canonical click verb. It mounts overlay (highlight + instruction), runs magnetic-pull timer, awaits ripple, awaits engine click, restores transform, suppresses anchor nav, post-holds. ~55 lines for one click; the choreography is intentional but it's a sequential chain of awaits. Each `await sleep(N)` is a microtask + setTimeout — not a perf issue, but 6 awaits per click × 50 clicks per video = 300 microtasks in the critical path. Compounding factor is low.
  - interactions.js:185-189 — magnetic-pull `setTimeout(..., 280)` while in the middle of a 600ms `await engineCursor.moveTo(sel, { wait: 600 })`. If the user pauses during the move, the magnetic timer keeps ticking via wall-clock setTimeout (it's not pause-aware). Noting; low impact.
- **Dead-code / orphan:**
  - `ANCHORS['off-top']` and `ANCHORS['off-bottom']` (line 114-115): only `parkNearest` ever resolves to those (line 142-144). Real users mostly hit `off-right`/`off-left`. Fine — just noting the sparseness.
- **Premature abstraction:**
  - `glideTo` accepts `via` as either an anchor name, selector string, or `{x, y}` object (line 152-164). Three branches all converging on the same `engineCursor.moveTo` call. Could be normalize-then-call. Light savings.
- **Coupling smells:**
  - Imports from `runtime/overlays-config.js` (line 15) and `engine/overlays-layer.js` (line 16) — engine code reaching into runtime config. That's an inversion: configuration normally lives downstream of primitives. Functionally fine because the imports are config-only (no orchestration), but worth flagging if engine ever needs to be vendorable as a standalone bundle.
- **Recommendation summary:** Gate the `resolve()` `getComputedStyle` check behind a debug flag. Consolidate `glideTo`'s three input shapes. Otherwise this file is small and earns its weight (the modern click verb is here).

---

### engine/overlays-layer.js — 211 lines

- **Token-burn:**
  - overlays-layer.js:21-99 — `cssFromConfig()` builds a ~80-line CSS string from config every time `installOverlayStyles()` is called. The CSS string itself is mostly inline CSS with `${i.bg}` etc. interpolation; configurable, but most production videos don't override the config so it's the same string emitted N times.
  - overlays-layer.js:105-124 — `animateLabelWriteOn` is a per-character span wrapper for label animations. ~20 lines, called by `showHighlight` (line 154-157). Fine — small enough not to cause concern.
- **Performance:**
  - overlays-layer.js:126-134 — `installOverlayStyles` is called five times per chapter (every snapshot boot/swap, every transitionSnapshots branch). It's idempotent (existing `<style id="overlays-layer-css">` is reused), but `cssFromConfig()` rebuilds the string each call — wasted work after first call. The config-cache miss is the right thing to optimize, since config is set-once-per-video.
- **Dead-code / orphan:** None notable.
- **Premature abstraction:**
  - `cfgHighlight()`/`cfgRipple()`/`cfgInstruction()` are config getters in `runtime/overlays-config.js`. Three layers of indirection (config → getter → CSS template) for one variable that nobody overrides per-chapter. Could collapse to a constant export with a single override hook for the rare case.
- **Coupling smells:**
  - This file is engine-shaped but imports `runtime/overlays-config.js` (line 16). Same inversion noted in `interactions.js`. Real but not urgent.
- **Recommendation summary:** Cache the generated CSS string after first build (one-line memoization). Otherwise this file is reasonable.

---

### runtime/player.js — 752 lines

- **Token-burn:**
  - player.js:108-182 — `transitionSnapshots` has three branches: flipBridge, runSwapTransition with style, legacy paper-cover. The legacy paper-cover branch (lines 170-181) is documented at the top of the function (lines 109-114) as "unreachable now (kept for reference until step 9d cleanup lands)." That's a 12-line dead branch + a 6-line comment explaining why it's dead.
  - player.js:227-244 — `wrapBeats` and `makeWaitAt`. Both are small utilities used in different modes; fine.
  - player.js:250-293 — `runBeatsPerNarration` is structurally identical to `scenes/shared.js#runBeatsSequential` with a different ctxBuilder. Since `scenes/shared.js#runBeatsSequential` is unused (no callers), this is the only live copy. Fine. But the body-shape duplicates `engine/engine.js#runScene`'s overlay loop nearly verbatim (lines 274-278 here vs engine.js:723-728). Three copies of the overlay-loop pattern total.
  - player.js:419-438 — URL-override resolution + diag logging. The `diag('player', ...)` template at lines 433-438 is 6 lines for a single console message. Fine, but it's the kind of decorative diagnostic that adds up.
  - player.js:540-555 — postIntro flash-guard handling. The detailed comment block (lines 540-543) explaining `sceneBooted` semantics is good but long.
  - Cross-cutting: `player.js` and `runtime/chapter-runner.js` repeat each other for **intro card mounting** (player.js:483-499 vs chapter-runner.js:398-414), **postIntro playback** (player.js:545-555 vs chapter-runner.js:433-443), **teaser handoff** (player.js:558-588 vs chapter-runner.js:446-475), **outro choreography** (player.js:683-705 vs chapter-runner.js:495-522), and the `awaitPostIntroReady` function itself (player.js:724-745 vs chapter-runner.js:43-64) is byte-identical except whitespace. ~150 lines of duplicated orchestration boilerplate.
- **Performance:**
  - player.js:230-243 — `makeWaitAt` registers a `timeupdate` listener AND a setInterval polling loop at 80ms (line 240). The interval is the fallback for when `timeupdate` is sluggish (it can be), but adding both means each `waitAt(t)` allocates two timer sources. For an audio-cued chapter with 8 beats, that's 16 timers in flight. Not a wall-clock issue but a lifecycle smell — should be either-or, with timer cleanup tied to `audio.ended`.
  - player.js:599-664 — main chapter loop. `import('/videos/...' + name)` is dynamic per chapter (line 612). Fine — chapters are individual files. But the `manifest.chapters.map((name) => import(...))` parallel preload that `scenes/player.html:73-75` does is **not** mirrored here. The player imports each chapter sequentially in the loop. For an 8-chapter video, that's 7 sequential network round-trips that could be parallel.
  - player.js:638-648 — `onAfterSetup` callback drops the `prefirstchapter` cover with `requestAnimationFrame` + `setTimeout`. The triple await (`requestAnimationFrame` → `style` set → `setTimeout` 420ms → remove) is what gives the cinematic feel; fine.
- **Dead-code / orphan:**
  - The legacy paper-cover branch in `transitionSnapshots` (lines 167-181). Comment says it's unreachable.
  - `playVideo._teaserPreload` (line 518) and `playVideo._handoffCover` (line 587, 660-663) are state attached to the function object — fine pattern, but they're used once each across the function. Could be locals.
- **Premature abstraction:**
  - The `mode` dispatch (lines 342-388) handles 4 modes: `editorial`, `parallel`, `audio-cued`, `per-beat-narration`. Verified usage via Grep:
    - `parallel` — 25 chapters (build-forms, surveys-and-polls, atmospheric-sandbox, stage-5-transition-lab, lottie-sandbox, etc.)
    - `per-beat-narration` — 23 chapters (klaviyo-addon-intro, form-entries-guide, form-notifications, make-field-required, build-forms, wpforms-rest-api-overview*)
    - `editorial` — 9 chapters (klaviyo-addon-intro intro/outro, wpf-ai-55, _phase-c-editorial-pilot, _sandbox-pausable-raf, _sandbox-register-timeline)
    - `audio-cued` — **1 chapter** (`form-notifications/smart-tags.js`)
  - `audio-cued` mode is exactly one production user. The `makeWaitAt` machinery + `runScene` invocation + URL gymnastics for one chapter is a lot of surface area. Either promote a verb (`waitAt`) into the standard ctx and drop the mode, or document the migration path away from audio-cued.
- **Coupling smells:**
  - `import('../sanitize/${slug}.js')` (line 32) — runtime knows about a `sanitize/` directory that's snapshot-specific. Not the runtime's job to know snapshot conventions. (Same pattern in `scene-helpers.js`.)
  - `playVideo._teaserPreload` and `playVideo._handoffCover` use the function object as a global state holder — works, but undeclared shape.
- **Recommendation summary:** Extract the duplicated orchestration (`awaitPostIntroReady`, intro card, postIntro, teaser, outro, URL overrides, mode dispatcher header) into a shared `runtime/orchestrator.js` module that both player.js and chapter-runner.js import. Drop the unreachable legacy paper-cover branch. Parallelize chapter imports.

---

### runtime/chapter-runner.js — 527 lines

- **Token-burn:**
  - chapter-runner.js:43-64 — `awaitPostIntroReady` duplicate of player.js's. The "Keep in sync with..." comment (lines 39-42) is the smell — a comment that says "keep two things in sync" is admitting a refactor wasn't done.
  - chapter-runner.js:66-70 — `loadTeaser` duplicate of player.js's.
  - chapter-runner.js:74-84 — `createSilentHud` is a 11-line silent stub used when `opts.hud === false` (recording builds). Fine; small.
  - chapter-runner.js:344-365 — URL overrides (`?breakStyle=`, `?swapStyle=`, `?coverColor=`) duplicate of player.js's. **player.js** uses `urlOverrides` separately from manifest defaults (player.js:419-438) for layered resolution; **chapter-runner.js** mutates the manifest in place (chapter-runner.js:355-359). Different semantics for the same conceptual operation.
  - chapter-runner.js:375-378 — `configureEditorial` import + call. One line of work wrapped in try/catch. Fine.
- **Performance:**
  - chapter-runner.js:119-280 — main runChapters loop. Per step: `clearHighlights` + chapter-break + step-narration kickoff + `cursor.parkNearest` (only first step) + `focusOn` + `preHold` + `runVerb` + `step.after` + `postHold` + narration-await. Several awaits in the critical path; expected for a sequencer.
  - chapter-runner.js:215-220 — `cursor.parkNearest(step.target)` with a try/catch on every first-step. Fine.
  - chapter-runner.js:179-180 — `playNarration(desc.narration, { keepDucked: true })` runs as fire-and-forget; `narrationEnded = ended` is awaited only at line 268 after all steps. Right pattern.
- **Dead-code / orphan:**
  - `runSolo` (line 294) — used by `authoring/runner.html?video=&chapter=`. Verified live entry point in tools/player-host.html paths. Keeps.
  - `runChain` (line 320) — used by `scenes/player.html` for descriptor-mode videos. Live.
- **Premature abstraction:**
  - The `defaults`, `surface`, `initialSnapshot`, `hud` opts on `runChapters` (line 94) are all passed through from `runChain`. `runChain` is the only caller of `runChapters` other than `runSolo` (which passes `[descriptor]` of length 1). The split between "run a chain" and "the chain runner" is a real abstraction but the opts pass-through is straight wiring.
  - `installGlobalErrorLogger()` is called at module top-level (line 72). Side effect on import — fine for a global error logger, but worth flagging for tree-shaking attempts.
- **Coupling smells:**
  - chapter-runner.js:152-165 — `if (swapStyle !== 'morph' && swapStyle !== 'flipBridge')` resets the iframe transform. That logic belongs to the swap-style implementation, not the runner. Each new transition style added means touching this if-guard. Better: ask `transitions.js` "does this style preserve camera?".
- **Recommendation summary:** Same as player.js — extract the duplicated orchestration. Pull the swap-style camera-reset decision out of the runner and into the transition registry.

---

### runtime/transitions.js — 272 lines

- **Token-burn:**
  - transitions.js:97-105 — 9-line block-comment explaining "why a new iframe is built on swap." Earned its keep when this was new behavior; could be a one-liner now.
  - transitions.js:1-12 — top-of-file purpose comment. Fine.
- **Performance:**
  - Each swap style is a sequential await chain (`fadeOutIframe` + `mountCover` + `doSwap` + `primeIframeFadeIn` + `dropCover`). The CSS transitions inside aren't owned by `frame-driver`, so they tick on wall clock — fine for now (snapshot swaps aren't seek targets), but if the seek/render pipeline ever extends to swap moments the cover's `opacity` transition will be invisible to the seek.
  - transitions.js:160-168 — `swapCover` does `fadeOutIframe(240)` + `mountCover()` + `doSwap()` + `sleep(60)` + `fadeIn(320)` + `dropCover(320, 340)`. Total ≈ 240 + (await doSwap) + 60 + 340 = ~640ms minimum. Audible swoosh + visual fade is the design; just noting.
- **Dead-code / orphan:**
  - `transitionStyles` export (line 269) — exposes the registry names. Only consumer per Grep is the QC tool path; might or might not be live. Low priority.
- **Premature abstraction:**
  - The two registries (`CHAPTER_BREAKS`, `SWAPS`) are well-shaped one-liners; not over-abstracted.
- **Coupling smells:**
  - Imports `engine.cameraState`, `engine.setCameraTransform`, `engine.sleep`. Reasonable — transitions drive the camera and need engine state.
  - Per-style implementations directly mutate `iframe.ui.style.filter` etc. Real iframe coupling but appropriate.
- **Recommendation summary:** Solid file. Trim the legacy comment block. No structural changes proposed.

---

### runtime/frame-driver.js — 130 lines

- **Token-burn:** None notable. File is dense and comment-light.
- **Performance:**
  - frame-driver.js:38-52 — `scheduleNext` chooses between `requestAnimationFrame` and a `setTimeout(16)` fallback. The fallback fires when `document.hidden` or RAF is late (>250ms). Reasonable.
  - frame-driver.js:63-69 — `tickAt` iterates the entire registry every frame, even if registered adapters have no animation in progress. Cheap because each adapter's `seek()` is a noop short-circuit when nothing is happening (engine.js:52: `if (!cameraAnimation) return;`), but the iteration itself is an allocation-free loop on a small Map. Probably fine; flag as future opportunity.
  - frame-driver.js:7-13 — the `state` object is mutated in place, including `state.timer = { kind, id }` allocations every frame (line 42, 49). Creating a new object literal at 60 fps for one timer is GC pressure. Could reuse a single object.
- **Dead-code / orphan:**
  - `tick(elapsedSeconds)` at line 109 — exported but only consumer per Grep is `tools/render.js` (the seek-mode renderer). Real use, keep.
  - `assertRegistryEmpty` (line 120) — gated on `?debug=1` per `player.js:653-657` and `chapter-runner.js:278-279`. Fine.
- **Premature abstraction:**
  - `exposeNamespace()` is called from `register`, `unregister`, `start`, and at module top (line 129). It rebuilds `window.__hfTimelines` repeatedly. Could be top-of-module once.
- **Coupling smells:** None.
- **Recommendation summary:** Replace the per-frame `state.timer = {}` allocation with a reused object (small, harmless win). Otherwise solid.

---

### runtime/frame-adapter.js — 75 lines

- **Token-burn:** None. Spec-compact.
- **Performance:** N/A — no hot path.
- **Dead-code / orphan:**
  - `waapiAdapter` (line 50) — exported. One Grep hit in `runtime/cinematic-kit/` (uses it indirectly). Live.
  - `gsapTimelineAdapter` (line 18) — used by `videos/_shared/kit.js` `registerTimeline` path. Live.
- **Premature abstraction:**
  - The two adapters cover the two registered animation runtimes (GSAP, WAAPI). Real abstraction.
- **Coupling smells:** None.
- **Recommendation summary:** Solid file, no changes.

---

### runtime/pause-manager.js — 207 lines

- **Token-burn:**
  - pause-manager.js:170-189 — `freezeIframeAnimations` walks `document.getAnimations({ subtree: true })` for both the parent doc and the iframe doc on every pause. For a snapshot iframe with many CSS animations, this can return dozens of animations — all paused, then thawed on resume. The `cssAnimationFreezers` Set is the "what was running" record. Reasonable; doesn't run unless user pauses.
- **Performance:**
  - pause-manager.js:85-120 — `pausableSleep` schedules a 33ms `setTimeout` tick (line 115), waits for it, computes elapsed, decides to finish or re-tick. For a 1000ms sleep that's ~30 iterations. Each iteration does 2-3 Date readings via `performance.now()`. Functionally correct — pausable; perf-wise it's a rough recreation of `await sleep(N)` with pause-awareness.
  - pause-manager.js:198-203 — `shiftFrameDriverClock` mutates every entry's `t0` by paused-ms. Linear in adapter count; usually 1-3 adapters; fine.
  - pause-manager.js:122-130 — `registerAudio` / `unregisterAudio` track audio elements in a Set. Fine.
- **Dead-code / orphan:** None.
- **Premature abstraction:**
  - `wallClockWaiters` (line 15, 109, 147-153) — Set of pending `pausableSleep` ticks. Used to flush waiters on resume + seek. Real machinery.
- **Coupling smells:** None — module owns its concern.
- **Recommendation summary:** Solid. The `pausableSleep` 33ms tick is the perf floor on pause-awareness; could be lifted to 16ms (one frame) without UX impact, or kept as is.

---

### runtime/dom-prep.js — 669 lines

- **Token-burn:**
  - dom-prep.js:267-322 — `patchFontAwesome6Aliasing` is a 56-line workaround for a snapshot-capture issue (FA6 woff2 paths break on captured snapshots). The fix walks every `<style>` in the doc, regex-extracts `src: url(...)` for FA5/FA7, then injects FA6 aliases. Comment block lines 267-285 explains the "why" thoroughly. Useful documentation, but the function should ideally be pushed to a `sanitize/` per-snapshot module — it's not generic dom-prep, it's a per-snapshot capture-pipeline fixup.
  - dom-prep.js:349-372 — deprecated `applyIconChoices` with a 7-line `@deprecated` JSDoc block explaining it's banned but kept to "avoid breaking any leftover legacy call site that bypasses the compiler." Verified: 0 video chapters use it. The runtime `prep-ops.js` registers it (lines 196-207) and `tools/validate-video.js:159-167` validates it. Three places maintaining a function with zero users.
  - dom-prep.js:611-669 — `harvestField` + `injectField`, both `@deprecated`. Cache (`_harvestCache`) + DOMParser fetch + ID-rewriting. ~58 lines of code marked deprecated with a "deferred until source path is decided" rationale (PLAN.md §Phase 6). Verified: 0 callers (Grep across entire repo). Three places maintaining functions with zero users.
- **Performance:**
  - dom-prep.js:81-88, 92-97, 153-176, 248-264, 540-553 — each helper does `doc.querySelectorAll(...)` once. None are per-frame; all are once-per-chapter-setup. Fine.
  - dom-prep.js:106-149 — `setChoiceLabels` is dense but not a hot path (called once per chapter setup).
- **Dead-code / orphan:**
  - `applyIconChoices` (line 356) — deprecated, 0 callers.
  - `harvestField` (line 631), `injectField` (line 657) — deprecated, 0 callers.
  - `removeBuilderCruft` (line 35) — production users yes, via `applyDefaultForm`. Keeps.
- **Premature abstraction:**
  - `_LAYOUT_CLASSES` (line 241) — small constant array; fine.
  - `applyIconChoicesV2` is the real function; `applyIconChoices` exists "for backwards compat." This is the textbook signal that the deprecation should be finished — there's no live caller to break.
- **Coupling smells:**
  - `patchFontAwesome6Aliasing` knows specific FA family-name strings. Per-snapshot detail leaking into a generic helper. Should live in `sanitize/<snapshot>.js`.
- **Recommendation summary:** Delete `applyIconChoices` (and its `prep-ops.js` registry entry + `validate-video.js` validator entry). Delete `harvestField` + `injectField` (and the `do: 'injectField'` verb in `runtime/verbs.js`). Move `patchFontAwesome6Aliasing` into the `sanitize/` per-snapshot module that needs it. Net: ~150 LOC removed from a strict-tier file.

---

### runtime/prep-ops.js — 334 lines

- **Token-burn:**
  - Each op has identical shape (`allowedFields` + `validate` + `run`). 14 ops × ~15 lines = ~210 lines of mostly-similar validation code. The validation primitives (`isPosInt`, `isNonEmptyString`, `isBool`) are already extracted, but each op then writes its own throw messages.
  - prep-ops.js:209-246 — `applyIconChoicesV2` op duplicates almost-the-same validation logic across `glyph`, `iconStyle`, `color`, `size`, `style` — each a 4-line if-block.
- **Performance:** N/A — runs once per chapter setup.
- **Dead-code / orphan:**
  - `applyIconChoices` op (line 196) — deprecated function in dom-prep, registered here, 0 video uses.
- **Premature abstraction:**
  - The `compileOp` registry is fine. The per-op `validate` shape could be more declarative (a JSON-Schema-like spec) but that would be a bigger refactor than is warranted.
- **Coupling smells:**
  - The op vocabulary maps 1-to-1 to dom-prep functions. Real adapter layer.
- **Recommendation summary:** Drop the `applyIconChoices` op (along with its dom-prep counterpart). Consider a generic `validateField(name, type, opts)` helper that compresses the per-op throws.

---

### runtime/scene-helpers.js — 584 lines

- **Token-burn:**
  - scene-helpers.js:23-40 — flash-guard install/remove pair; small, fine.
  - scene-helpers.js:42-52 — `suppressAnchorNav` + memory-rule comment. Fine.
  - scene-helpers.js:113-163 — `preloadSnapshot` + `commitPreloadedSnapshot` for flipBridge. Real machinery; keeps.
  - scene-helpers.js:166-182 — `mountCover` + `dropCover`. **Third copy** of mount-cover/drop-cover (transitions.js:110-129; player.js:80-92). Three subtly different implementations — different default `z`, different background source, different fade durations. Worth deduping.
  - scene-helpers.js:184-202 — `waitForStartClick` for solo mode. Player.js has its own `waitForStartClick` (player.js:94-101). Two copies again.
  - scene-helpers.js:204-273 — HUD (`createHud`). Real machinery for descriptor-mode videos.
  - scene-helpers.js:275-356 — `errorReport` + `bugReportReplacer`. ~80 lines of error surfacing. Fine, well-shaped.
  - scene-helpers.js:436-527 — WPForms-specific helpers (`applySearchFilter`, `activateSection`, `activatePanel`). These are WPForms DOM puppetry — should arguably live in `engine/wpforms.js`, not in `scene-helpers.js`. Cross-module placement smell.
  - scene-helpers.js:530-574 — Toast helper. ~45 lines. Used by descriptor verb `toast`. Real consumer.
- **Performance:** N/A — all once-per-boot or once-per-event.
- **Dead-code / orphan:** None blatant.
- **Premature abstraction:**
  - `setWatermarkEnabled` + `unmountWatermark` (line 78-88) — controlled via `window.__wpfWatermarkOn` global flag. The flag-driven pattern is needed because body-wipe destroys the DOM. Real workaround for engine.loadSnapshot's body-wipe behavior.
- **Coupling smells:**
  - `applySearchFilter`/`activateSection`/`activatePanel` (lines 436-527) know WPForms class names. Belongs in `engine/wpforms.js` thematically.
  - `mountCover`/`dropCover` triplicated.
- **Recommendation summary:** Move WPForms-specific helpers (`applySearchFilter`/`activateSection`/`activatePanel`) into `engine/wpforms.js`. Dedupe `mountCover`/`dropCover` via a single export from this file (or transitions.js). Otherwise solid.

---

### runtime/title-card.js — 644 lines

- **Token-burn:**
  - title-card.js:16-111 — `CSS` template string for the default title card variant. ~95 lines of inline CSS. Useful for self-contained mounting. Fine.
  - title-card.js:189-344 — default `playTitleCard` variant. ~155 lines of GSAP timeline choreography. Has a strict-tier rationale (it's the visual signature for every video). Fine.
  - title-card.js:346-374 — `playSullieSystemTitleCard` is a 28-line dispatcher for variant `'sullie-system'` that re-imports the cinematic and forwards args. Real consumer.
  - title-card.js:397-501 — `EDITORIAL_CSS` for variant `'editorial-v4'`. Another ~105 lines of inline CSS.
  - title-card.js:530-643 — `playEditorialV4Outro` is a 113-line variant. Self-contained, no GSAP — uses CSS transitions + `await sleep`. Real consumer (e.g. `wpforms-rest-api-overview-polished/manifest.outro`).
- **Performance:**
  - title-card.js:149-187 — `startDust` runs an unowned `requestAnimationFrame` loop until `stopDust()` is called. **Not pause-aware** — dust will keep ticking through user pause. Low-impact (tiny canvas, 70 particles), but it bypasses the `frame-driver` registry.
- **Dead-code / orphan:** None.
- **Premature abstraction:**
  - Three variants (default, sullie-system, editorial-v4). Real product variants.
- **Coupling smells:**
  - Loads Inter + Instrument Serif fonts from Google Fonts CDN (line 119). External dependency. (Note: GSAP was just vendored per `core-factors step 11`; fonts could follow.)
- **Recommendation summary:** Wrap `startDust` in `pausableRaf` (matches the GSAP-rules skill mandate). Vendor the Google Fonts. Otherwise this file is feature-complete and self-contained.

---

### runtime/shared-scene.js — 36 lines

- **Token-burn:** Minimal.
- **Performance:** N/A.
- **Dead-code / orphan:** Used by 3D / Three.js cinematics (rest-api wireframe burst). Live.
- **Premature abstraction:** None.
- **Coupling smells:** None.
- **Recommendation summary:** No changes.

---

### runtime/camera-poses.js — 27 lines

- **Token-burn:** Minimal in absolute terms.
- **Performance:** N/A.
- **Dead-code / orphan:**
  - `registerCameraPose` (line 5) — used only by `videos/_sandbox-camera-pose/chapters/pose-tour.js`. **Zero production users.** Production chapters pass camera as inline objects (`camera: { focus: '...', level: 2.2 }`), never as registered names.
  - `unregisterCameraPose`, `clearCameraPoses` — zero users.
  - `resolveCameraPose` (line 18) — called by `runtime/player.js#wrapBeats` (line 220) and `runBeatsPerNarration` (line 260). Both production paths. But because no string names are registered in production, the function always falls through to `return pose` (the inline-object branch at line 25). The string-lookup branch is dead in production.
- **Premature abstraction:**
  - The whole registry is unused outside sandbox. Real but speculative abstraction. ~25 LOC of registry machinery in scope plus the `wrapBeats` / `runBeatsPerNarration` integration plumbing.
- **Coupling smells:** None.
- **Recommendation summary:** Either promote camera-poses to a real production feature (document in skills, encourage in storyboard format) or delete the whole module. The current state is undocumented dead infrastructure.

---

### scenes/player.html — 96 lines

- **Token-burn:**
  - player.html:38-92 — boot logic. ~55 lines that detect descriptor-vs-mode shape, route to runChain or playVideo. Real dispatcher. Fine.
  - player.html:50-61 — QC chapter-scope override. Duplicated in `runtime/player.js:443-455`. Two copies.
- **Performance:**
  - player.html:73-75 — `Promise.all` of all chapter imports — parallel, fast. Note this is the right pattern; player.js's chapter loop does the slower sequential pattern (per-file finding above).
- **Dead-code / orphan:** None.
- **Premature abstraction:** None — clean dispatcher.
- **Coupling smells:**
  - Hardcoded URL paths (`/videos/...`, `/runtime/...`). Real coupling, real product.
- **Recommendation summary:** Push the QC chapter-scope filter into a shared utility used by both this file and `runtime/player.js`.

---

### scenes/shared.js — 277 lines

- **Token-burn:**
  - shared.js:154-202 — `runBeatsAtTimes` is a 49-line audio-synced beat runner. **Zero callers in production videos** — Grep shows references only in `scenes/chapters/fields.html` (a legacy single-page scene) and `scenes/shared.js` itself.
  - shared.js:228-274 — `runBeatsSequential` is a 47-line per-narration beat runner. **Zero callers** under `videos/`. The active equivalent is `runtime/player.js#runBeatsPerNarration` which does the same thing with the enriched ctxBuilder.
  - shared.js:1-152 — narration/BGM/cover/mesh/watermark functions. All actively used. Keeps.
- **Performance:**
  - shared.js:204-219 — `waitForAudioAt` registers `timeupdate` listener AND a setInterval polling loop at 80ms. **Identical pattern to `runtime/player.js#makeWaitAt`.** Two copies of the same audio-time-waiter.
  - shared.js:88-106 — `playNarration` is the only audio entry point. Live.
- **Dead-code / orphan:**
  - `runBeatsAtTimes` and `runBeatsSequential` — confirmed unused. ~96 LOC of dead beat runners.
  - `mountCover`/`dropCover` (lines 140-152) — duplicate of player.js's, scene-helpers.js's, transitions.js's. Four copies.
  - `waitForStart` (line 130) — alternative to `runtime/scene-helpers.js#waitForStartClick`. Two more copies.
- **Premature abstraction:**
  - `setNarrationSpeed`/`setNarrationVolume` are exported but production manifests only set them once at boot via `runtime/player.js`. Fine.
- **Coupling smells:** None — narration/BGM module owning one concern.
- **Recommendation summary:** Delete `runBeatsAtTimes`, `runBeatsSequential`, `waitForStart`, `mountCover`/`dropCover`, `loadSnapshot` (the file has its own one-line wrapper at line 221-225 — unused too). Keep narration/BGM/mesh-bg/watermark + the small mount/cover helpers if any remaining callers prove necessary. Net ~120 LOC in a non-strict file.

---

### scenes/shared.css — 71 lines

- **Token-burn:** Minimal.
- **Performance:** Pure CSS. The `@keyframes wpf-float` and the `.mesh-bg` blob animations run on the watermark and bg layer continuously — outside the `frame-driver` registry, so they tick on wall clock and don't seek-pause. Same as the title-card dust, low impact, but inconsistent with the seek-mode discipline.
- **Dead-code / orphan:** None.
- **Premature abstraction:** None.
- **Coupling smells:** None.
- **Recommendation summary:** Acceptable as-is.

---

### videos/_shared/kit.js (secondary; 444 lines) — context only, light read

- **Engine leakage observed:** None directly. Imports `runtime/frame-driver.js`, `runtime/frame-adapter.js`, `runtime/camera-poses.js`, `runtime/pause-manager.js`. All are public runtime APIs. The runtime/kit boundary is clean.
- **Token-burn:** ~444 LOC; substantial, but it's the kit consumed by every video. Not in scope to optimize per the brief.
- **Note:** `pausableRaf` (line 22-36) is the canonical pause-aware RAF wrapper. The `runtime/title-card.js#startDust` and `scenes/shared.css` blob keyframes do NOT use it, which makes them seek-mode escapees. Already noted in title-card.js findings.

### videos/_shared/effects.js (secondary; 193 lines) — light read

- **Engine leakage observed:** None.
- **Note:** Pure GSAP effects library. Outside the audit scope; flag only.

---

## Cross-file / system-level findings

1. **Quadruple `mountCover` / `dropCover`.** `runtime/player.js:80-92`, `runtime/transitions.js:110-129`, `runtime/scene-helpers.js:166-182`, `scenes/shared.js:140-152`. Four implementations with subtly different defaults (z-index, background source, fade timing). Pick one canonical export — likely scene-helpers — and import from there everywhere. Net ~50 LOC.

2. **Duplicated paint-anchored gate.** `awaitPostIntroReady` is byte-identical between `runtime/player.js:724-745` and `runtime/chapter-runner.js:43-64`, with a "keep in sync" comment at the top of one. Extract to `runtime/scene-helpers.js` or a new `runtime/paint-gate.js`.

3. **Triple overlay-loop.** `engine/engine.js#runScene` (lines 723-728), `runtime/player.js#runBeatsPerNarration` (lines 274-278), `scenes/shared.js#runBeatsSequential` (lines 255-259) and `runBeatsAtTimes` (lines 185-189). Same `for (const o of beat.overlays)` switch on `o.pointer` / `o.highlights` / `o.highlight`. With `runBeatsAtTimes`/`runBeatsSequential` deleted as orphans, this drops to two; the engine's runScene copy can then either be kept (legacy) or merged with the player's.

4. **Duplicate audio-time waiter.** `runtime/player.js#makeWaitAt:230-243` ≡ `scenes/shared.js#waitForAudioAt:204-219`. Same dual `timeupdate` + 80ms-interval pattern. With shared.js dead, drop the orphan and keep player's.

5. **Duplicate URL-overrides resolution.** `runtime/player.js:419-438` and `runtime/chapter-runner.js:344-365` resolve `?breakStyle=`, `?swapStyle=`, `?coverColor=` against the manifest. Different mutation strategies (player keeps separate `urlOverrides`, runner mutates manifest). One canonical resolver would prevent drift.

6. **WPForms class-name knowledge straddles two files.** `engine/wpforms.js` is the documented WPForms-puppetry layer, but `runtime/scene-helpers.js#applySearchFilter`/`activateSection`/`activatePanel` (lines 436-527) also know WPForms class names. Move them into wpforms.js; scene-helpers should be product-agnostic.

7. **Camera-pose registry lives in production code path but has zero production callers.** `registerCameraPose` is documented in three skills (per Grep) but used only in `_sandbox-camera-pose/chapters/pose-tour.js`. Either bake the registry into the storyboard format (per Phase 4 recommendation in the editorial-direction-audit) or delete.

8. **Easing parameter accepted-but-ignored.** `engine.js#applyCamera` and `setCameraTransform` accept an `easing` arg that is stored on `cameraAnimation.easing` but never read (the seek loop uses `easeProgress`, a hardcoded cubic). Every chapter passing custom easing has been silently overridden.

9. **`runtime/title-card.js#startDust` and `scenes/shared.css` `.mesh-bg::before/::after` keyframes are NOT pause-aware.** The wpforms-gsap-rules skill mandates `pausableRaf` for all author RAF loops; both bypass that. Consequence: scrubber/seek mode renders these layers running at wall-clock during pause/seek, breaking determinism for `tools/render.js --seek` mode.

10. **Hot-path debug logging in `engine.js#zoomTo`.** Three `console.log` calls per call, including one with 12+ keys and live rect reads. Compounds across all chapters. Should be `?debug=1`-gated.

---

## Ranked-impact proposal list

| # | Proposal | Impact | Risk | Files | Description |
|---|----------|--------|------|-------|-------------|
| 1 | Delete dead primitives | token | low | `engine/engine.js`, `engine/wpforms.js`, `runtime/dom-prep.js`, `runtime/prep-ops.js`, `tools/validate-video.js` | Remove `runScene`'s overlay branches + `pointer` + `spotlight` + `cursor.dragGrab` + `whiteout` + `collapseBlock` + `applyIconChoices` (deprecated) + `harvestField`/`injectField`. ~600 LOC, all verified zero-direct-callers in production. Move runScene's used kernel inline into player's `runChapter` or keep a thin `runDeclarativeBeats` shim. |
| 2 | Gate hot-path debug logging | both | low | `engine/engine.js`, `engine/interactions.js` | Wrap `zoomTo`'s three `console.log` calls (lines 246, 251, 271) and `interactions.js#resolve`'s `getComputedStyle` visibility check (lines 42-46) behind `?debug=1` (read once on boot via `URLSearchParams`). Saves 3 rect reads + 1 computed-style read per cursor verb in production. |
| 3 | Extract player↔chapter-runner shared core | token+structure | medium | new `runtime/orchestrator.js` (or expand `scene-helpers.js`), `runtime/player.js`, `runtime/chapter-runner.js` | Move `awaitPostIntroReady`, intro/postIntro/teaser/outro mounting blocks, URL-override resolution, start-gate setup, watermark lifecycle, and `loadTeaser` into a shared module. Both player.js and chapter-runner.js shrink by ~150 LOC each; one source of truth for orchestration shape. Risk is medium because both runners ship videos today. |
| 4 | Dedupe `mountCover`/`dropCover` | token | low | `runtime/player.js`, `runtime/transitions.js`, `runtime/scene-helpers.js`, `scenes/shared.js` | Pick one canonical pair (recommend `runtime/scene-helpers.js` since it already exports them with the cleanest defaults), import everywhere else. Net ~50 LOC. |
| 5 | Cache iframe lookup in `engine/wpforms.js` | perf+token | low | `engine/wpforms.js` | Replace `$`/`$$`/`getDoc` (lines 9-19) with a cached iframe reference invalidated on `loadSnapshot`/`adoptSnapshotIframe`. Saves ~30 redundant `document.querySelector('iframe.ui')` calls per chapter. |
| 6 | Honor or remove `easing` parameter | correctness | low | `engine/engine.js` | Either thread `easing` through into the `frame-driver`'s seek (replacing `easeProgress` with a CSS-cubic-bezier evaluator) or drop the parameter from `applyCamera`/`setCameraTransform` and document that custom easing isn't supported on the camera. Currently silently ignored. |
| 7 | Make `startDust` and CSS blob animations pause-aware | correctness | low | `runtime/title-card.js`, `scenes/shared.css` (or shared.js mount logic) | Wrap the dust loop in `pausableRaf` from `videos/_shared/kit.js`. For the `.mesh-bg::before/::after` blob keyframes, either move to a `pausableRaf`-driven JS animation or accept the wall-clock semantics and document. |
| 8 | Move WPForms-specific helpers into `engine/wpforms.js` | structure | low | `runtime/scene-helpers.js` (move-out), `engine/wpforms.js` (move-in), every importer | `applySearchFilter`/`activateSection`/`activatePanel` are WPForms DOM puppetry. They belong in the puppetry module. Risk only because importers will need updates. |
| 9 | Decide camera-poses fate | token | low | `runtime/camera-poses.js`, `runtime/player.js`, skills/docs | Either delete (zero production callers) or promote (require in storyboard format per Phase 4 plan). Currently undocumented infrastructure. |
| 10 | Parallelize chapter imports in `runtime/player.js` | perf | low | `runtime/player.js` | Mirror `scenes/player.html:73-75`'s `Promise.all(manifest.chapters.map(import))` pattern in player.js's chapter loop (currently sequential at line 612). Saves ~6 round-trips on an 8-chapter video boot. |

---

## Open questions for Umair

1. **`audio-cued` mode is one chapter (`form-notifications/smart-tags.js`).** Keep the mode or migrate the chapter to `per-beat-narration` + manual `waitAt` and drop the dispatcher branch?
2. **Camera-pose registry (`runtime/camera-poses.js`) — promote or delete?** Phase 4 of the editorial direction audit names "morph-chain in the storyboard format" but doesn't speak to camera poses. Currently zero production users.
3. **Legacy paper-cover branch in `runtime/player.js#transitionSnapshots` (lines 167-181).** Comment says it's unreachable since flipBridge became default. Delete now or wait for "step 9d cleanup"?
4. **`engine/engine.js#easeProgress` is hardcoded — was that intentional?** The `easing` argument is plumbed but unused. If chapter authors expect it, that's a bug; if it was always intended to be a fixed cubic, drop the param.
5. **Should `engine/engine.js#runScene` survive at all?** It's pulled in by `parallel` and `audio-cued` modes via player.js, but its `pointer`/`spotlight`/`dragGrab` branches are unreached. A thinned `runDeclarativeBeats` (camera + `clearHighlights` + `effect` + dwell only) would cover production.
6. **`scenes/shared.js` is the legacy boot helper for `scenes/*.html` single-page scenes.** Are any single-page scenes still in scope, or can shared.js be aggressively trimmed (delete `runBeatsAtTimes`/`runBeatsSequential`/`waitForStart`/`mountCover`/`dropCover`/`loadSnapshot` wrapper)?

---

## Risk inventory

What could go wrong with the proposals, and which videos break:

- **Proposal 1 (delete dead primitives):** Breaks any chapter that secretly imports the deleted symbols. Verified with Grep that none do; confidence high. Risk: a video file outside `videos/` (e.g. `tools/`, `scenes/chapters/*.html` — the legacy single-page scenes) imports them. `scenes/chapters/smart-tags.html` uses `spotlight` and `pointer` per Grep earlier — those legacy single-page scenes are not in production but may be referenced by an old QC URL. **Mitigation:** Grep `tools/`, `scenes/chapters/*` before deletion; consider a `engine/legacy.js` companion that re-exports them for transitional use rather than outright delete.

- **Proposal 2 (gate debug logging):** Risk: an authoring workflow relies on the `[zoomTo]` console output for debug. **Mitigation:** Default `?debug=1` to OFF; document the flag; keep the `console.warn('⚠ No match for:', sel)` at line 220 unconditional (it's a real warning, not a debug log).

- **Proposal 3 (extract orchestrator):** Risk medium. Both player.js and chapter-runner.js ship videos. A subtle behavior delta in shared code (e.g. cover-z-index, BGM-fade-on-postIntro) could regress one path. **Mitigation:** Phase the extraction — move one duplicate at a time, smoke-test the 2 winning videos (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`) after each move. Use `node tools/check-video-playback.js` baseline at each step per Phase 6 QC gate of the master plan.

- **Proposal 4 (dedupe covers):** Low risk. The four implementations have slight default differences; pick the most-permissive defaults and accept that a few callers may see a 100ms timing shift. **Mitigation:** Smoke-test winners.

- **Proposal 5 (cache iframe lookup):** Risk: cache invalidation. `loadSnapshot` body-wipes; `adoptSnapshotIframe` swaps. Cache must invalidate on both. **Mitigation:** invalidate the cache inside both functions; smoke-test all 2 winners + form-notifications + creating-first-form (heavy wpforms.js users).

- **Proposal 6 (honor easing or drop):** Drop is zero-risk — current behavior is "easing ignored." Honor is a behavior change; some chapters may have written easing names that look better when parsed (cinematic feel) — these chapters might subtly speed up/slow down. **Mitigation:** Drop is the safe move; if any author wants honor, do it as a separate phase with QC.

- **Proposal 7 (pause-aware dust + blobs):** Risk minimal — failure mode is "dust keeps moving during pause," same as today. Upside is seek-mode determinism for `tools/render.js`.

- **Proposal 8 (move WPForms helpers):** Risk low. Sciopered file moves; verify the importer updates are exhaustive (Grep `applySearchFilter|activateSection|activatePanel`).

- **Proposal 9 (camera-poses fate):** Either branch is low-risk. Delete: only `_sandbox-camera-pose` breaks (sandbox, not production). Promote: zero immediate breakage; new authoring guidance needed.

- **Proposal 10 (parallelize chapter imports):** Risk low — the descriptor-mode path already does this in `scenes/player.html`. Mode-mixed cases (where one chapter being available alters another's behavior) are rare and would already be a bug. **Mitigation:** Smoke-test winners.

**Hard rule reminder:** Per the master plan Phase 6, every proposal must be QC'd against the 2 winners (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`) before merging. None of the proposals above touch postIntro or cinematic surfaces (so winners' postIntro choreography is unaffected); all touch boot/orchestration/dispatch surfaces, which the smoke validators exercise directly.
