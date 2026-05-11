# Engine vs Libraries — Architecture Audit (Revised) — 2026-05-12

Follow-up to `docs/engine-redundancy-audit-2026-05-12.md`. The first audit was a per-export dead-code classification; useful as reference but **architecturally too defensive**. Umair pushed back with one observation that changed the verdict: the QC interaction pages (`videos/_qc-interactions/open-settings-tab.html`, `open-field-options.html`) already do snapshot swaps smoothly — without `flipBridge`, without `engine.loadSnapshot`, without `runtime/transitions.js`. That isn't a small detail. It means **the new library pattern is not "for editorial only" — it is a working single-HTML tutorial architecture, today, at QC scope**. The engine path is no longer "the default forever, libraries are additive"; it is **a transitional architecture that the libraries are positioned to subsume**.

This doc lays out the real comparison: what each video shape does today, what the libraries do, what's missing for tutorial parity, what genuinely stays, and what disappears.

---

## Section 0 — Where the first audit was wrong, briefly

Three concrete mistakes worth naming before the new analysis:

1. **I called `flipBridge` and `runtime/transitions.js#SWAPS` "load-bearing"** based on production caller counts. That's true for the engine path. But flipBridge exists *only* to hide the body-wipe flash of `engine.loadSnapshot` (`document.body.innerHTML = '...'`). The library's `IframeManager.swap` is a slot-based crossfade between two simultaneously-mounted iframes — it never body-wipes — so there's nothing to band-aid. **`flipBridge` is not architecturally necessary; it is a workaround for a problem the new pattern does not have.** When the engine path retires, flipBridge + the entire SWAPS registry (`cover`, `fast`, `whip`, `push`, `morph`) get deleted, not migrated.

2. **I said the new cinematic primitives are "for the beat content between boundaries"** as if they're orthogonal to transitions. That confused the question. The truth is more useful: in the new pattern there are **no body-wipe boundaries** at all. The "boundary" between two snapshots becomes a single `IframeManager.swap()` call inside the master timeline (~320ms crossfade). The "boundary" between two beats inside the same snapshot becomes whatever the master timeline does next. **There are no separate transition layers** — chapter-break vs swap-style is an engine-path concept that doesn't exist outside it.

3. **I treated the single-HTML tutorial as a multi-month research project.** Looking at `videos/_qc-interactions/_shell.js` shows it's already a working 116-LOC harness that boots IframeManager + Cursor + WPFormsInteractions and runs any sequence. The remaining work isn't research; it's filling the library gaps (Wave 2, narration port, measure-driven zoom, highlight-with-label-over-iframe) and writing the per-video master timelines.

The rest of this doc is the analysis I should have written first.

---

## Section 1 — Three video shapes in production today (concrete walk-throughs)

### Shape A — Engine-path tutorial (e.g., `make-field-required`)

Files: `manifest.json` + 4 chapter modules + narration mp3s + selector files.

Boot path: `scenes/player.html` → fetches manifest → `runtime/player.js#playVideo` (since not all-descriptor) → mounts mac-frame chrome via `mountStageChrome` → loads primary snapshot via `engine.loadSnapshot` (body-wipe) → shows start gate → plays intro title card → mounts pre-first-chapter cover → enters chapter loop.

Per chapter: dynamic `import('/videos/make-field-required/chapters/find-field-setting.js')` → reads `export const snapshot/mode/breakStyle/swapStyle/default/setup`. If `snapshot` changed, runs `transitionSnapshots` (flipBridge path: preloadSnapshot to hidden iframe, adoptSnapshotIframe atomically). If same snapshot, runs `runChapterBreak('glide')` (no-op for glide). Builds enriched ctx via `BASE_CTX_FACTORY` (threads `cursor` = richCursor from `engine/interactions.js`, `focusOn`, `highlight`, `clearHighlights`, `popOut`, etc.). Mode dispatch — `per-beat-narration` here — calls `runBeatsPerNarration`.

Per beat: `clearHighlights` → play narration mp3 (BGM ducks) → `resolveCameraPose` for the camera ('mfr-email-field-focus' → `{ focus, level, pad, noScroll }` lookup) → `zoomTo` if camera.focus is set → mount spotlight if `beat.spotlight` → render overlays loop (`highlight`/`pointer`) → labelDwell → run `effect({ doc, cursor, sleep, clearSpot, zoomTo, popOut, ...})` → await narration.ended → postHold → clearSpot.

The effect typically does: `cursor.park({x,y})` → `cursor.glideTo(sel, { via, wait })` → `cursor.click()` → DOM puppetry on `doc` (e.g. set `.required` class + asterisk).

**Touches engine.js + interactions.js + overlays-layer.js + transitions.js + camera-poses.js + scene-helpers.js + dom-prep + prep-ops + title-card.js + frame-driver + pause-manager + scenes/shared.js + scenes/player.html.** That's the full runtime surface.

### Shape B — Engine-path "winner" tutorial (e.g., `build-forms-faster-with-wpforms-ai/scene-2-add-new.js`)

Same boot path as Shape A. Same manifest/chapter shape. But the chapters' `effect` callbacks do much more editorial decoration:

- Inject CSS into iframe `<head>` (real-card conic-gradient ring around `#wpforms-template-generate`, magnetic hover, focus glow).
- `mountSceneLayer` for over-iframe captions on a stage-layer overlay (survives the camera transform).
- `loadGsap` from per-video `_kit.js`, run hand-rolled multi-track GSAP timelines (parallel `opacity` / `transform` / `filter` tracks per the winning-pattern analysis §A3).
- Use `cursor.glideTo(sel, { via: { x, y }, wait })` for curved-arc cursor flights.
- `swapStyle: 'fast'` between snapshots — same flipBridge-or-cover machinery as Shape A.
- All the same engine surface — plus per-video `_kit.js` for atmosphere + register-named-eases + mountSullieBug.

**Same runtime surface as Shape A, plus per-video kits that re-implement what's missing from the library.**

### Shape C — Pure-editorial single-HTML (e.g., `wpforms-ai-prompt-open/index.html`)

One file, 1039 lines. Vendored GSAP + CustomEase. No engine, no runtime, no player.

What it does: defines an atmosphere (3 blooms + grain, fixed positions, no swap). Defines a `.mac-frame` and a `#cta` morph-host element. Mounts ONE iframe (`<iframe src="/snapshots/wpforms-ai-builder-empty/index.html">`) inside the morph-host at the right phase. Builds a `gsap.timeline()` with phases: button arrival → cursor flies in (3-keyframe straight line) → button morphs to input → typewriter → send activates → cursor returns and clicks → button morphs to Sullie pill → pill shrinks AND translates in parallel with mac-frame dolly-back → circle morphs to chat panel. At t=10.3 the iframe's own `.wpforms-ai-chat` HTML is replaced with the "AI thinking" state.

**Touches zero engine files, zero runtime files, zero scenes files. Imports nothing from the project. Renders to MP4 via Puppeteer's headless Chrome.** Genuinely standalone.

### Shape D (the new thing) — Single-HTML tutorial QC shell (e.g., `videos/_qc-interactions/_shell.js`)

116 LOC harness. Boots:

```js
const stage = document.getElementById('stage');
const iframeManager = new IframeManager(stage);           // slot model, no body-wipe
const cursor = new Cursor(stage, { initialX, initialY });  // motion-primitives
const interactions = new WPFormsInteractions(stage, cursor, iframeManager);
await iframeManager.load('builder-fields');
// run() does whatever — full interactions library available
```

Per QC page: `run` is a per-flow sequence like `await interactions.openFieldOptions(48); await interactions.setFieldLabel(48, 'Full Name'); await interactions.setNameFormat(48, 'first-middle-last');`. Each step internally drives Cursor.glide + Cursor.click + iframe DOM puppetry, OR calls `iframeManager.swap(slug)` which does a ~320ms crossfade between two iframes simultaneously mounted in the same slot.

**Touches zero engine files, zero runtime files (except indirectly via the popOut import in motion-primitives), zero scenes files.**

Each QC page is, structurally, **a complete single-HTML tutorial.** What's missing is: a master gsap.timeline for orchestrating beats, narration mp3 sync, title cards, BGM, atmosphere. Those are all portable.

---

## Section 2 — What the libraries actually provide (real inventory)

Verified by reading `videos/_shared/motion-primitives.js` (1,212 LOC) + `videos/_shared/wpforms-interactions.js` (1,373 LOC) end-to-end.

### motion-primitives.js exports

| Export | Type | Status (per QC index) | What it gives you |
|---|---|---|---|
| `boundedRepeats(cycle, visible)` | utility | not built (utility, no visual) | Computes finite repeat count — replaces `repeat: -1` for determinism |
| `mulberry32(seed)` | utility | n/a | Seeded PRNG |
| `cinematicFlight(camera, opts)` | timeline factory | ready | 4-phase decomposed camera move (anticipation → flight w/ scale-dip → land → optional micro-zoom). Paused gsap.timeline. |
| `figjamFlight(camera, opts)` | timeline factory | ready | 3-act inter-snapshot camera (zoom-out → translate-at-wide → zoom-in) for "shared spatial canvas" reveals |
| `focusStationOverview(camera, opts)` | timeline factory | ready | Tutorial-grade focus → station → overview arc with short anchor (polished rest-api shape) |
| `Cursor` class | class | ready | `.glide(to)` / `.click()` / `.hover(to, { target })` / `.drag(from, to, { ghostSource })` / `.remove()`. Anti-frenzy guards built in. |
| `cursorGlideStraight` | function | deprecated | Use Cursor class |
| `clickRipple(stage, x, y)` | function | n/a | Standalone radial ripple at a stage point |
| `caretType(el, text, opts)` | tween factory | ready | Letter-by-letter via scalar gsap tween + innerHTML mutation (fixes caret drift bug) |
| `statusPillMorph(pill, texts)` | timeline factory | ready | Char-by-char text morph through label sequence |
| `markerSweep(textEl, opts)` | timeline factory | ready | Sweep-highlight behind text with color flip |
| `popOut(iframe, sel, opts)` | async function | draft | Clone-and-lift a UI block out of an iframe as a 2.5D card |
| `fieldStaggerReveal(fields, opts)` | timeline factory | ready | Per-field rise + un-blur + fade with stagger |
| `mountSullieBug(opts)` | function | ready | Persistent brand-anchor with bounded yoyo float |
| `cleanFastRejoin(target, opts)` | async function | ready | Polished-rest-api exit pattern (500ms breathe → sine.in 0.35s → anchor → fade) |

### wpforms-interactions.js exports (Wave 1, all DRAFT in QC)

| Export | Operation | Coverage |
|---|---|---|
| `IframeManager` class | — | Stage-slot model. `load(slug)`, `swap(slug, { duration, ease })` (~320ms crossfade), `elementToStageCoords(target)`, `scrollIntoView(target)`, `wait(s)`, `query(sel)`, `queryAll(sel)`, `doc()`, `currentSlug()`. Replaces `engine.loadSnapshot` + `scene-helpers.bootSnapshot` + `scene-helpers.swapSnapshot` + `runtime/transitions.js` SWAPS + `scene-helpers.preloadSnapshot`/`commitPreloadedSnapshot`. |
| `WPFormsInteractions.navAddNewForm()` | snapshot-swap | admin-forms-overview → admin-templates |
| `WPFormsInteractions.selectTemplate(slug)` | dom-only | admin-templates (hover-reveal + click; no swap) |
| `WPFormsInteractions.navWPFormsSidebarMenu(item)` | snapshot-swap | WordPress sidebar → mapped admin/builder snapshot |
| `WPFormsInteractions.openFormInList(formId)` | snapshot-swap + DOM | admin-forms-overview → builder-fields + applyFormProfile |
| `WPFormsInteractions.applyFormProfile(formId)` | dom-only | Filters builder-fields fixture to per-form fields |
| `WPFormsInteractions.dragFieldToForm(fieldSlug)` | dom-only | Visual drag with cloned ghost + FLIP reveal |
| `WPFormsInteractions.openFieldOptions(fieldId)` | dom-only | Activate Field Options tab + reveal option panel |
| `WPFormsInteractions.setFieldLabel(fieldId, newLabel)` | dom-only | Typewriter into label input + canvas mirror |
| `WPFormsInteractions.setNameFormat(fieldId, format)` | dom-only | Faux-dropdown for Name format select |
| `WPFormsInteractions.toggleEmailConfirmation(fieldId, on)` | dom-only | Email confirmation toggle |
| `WPFormsInteractions.navBuilderSidebar(section)` | snapshot-swap | builder-* → mapped builder-* |
| `WPFormsInteractions.openSettingsTab(tab)` | snapshot-swap | builder-settings-* → mapped builder-settings-* |

Wave 1 has **8 interactions + IframeManager + applyFormProfile + Cursor + ripple + 11 motion primitives**.

### What the libraries are missing for tutorial parity

Honest gap list — verified by grep + reading the chapter modules:

1. **Wave 2 (form-notifications scope).** Zero coverage today. Need ports of: `revealSection`, `toggleControl`, `smartTag`, `selectDropdown` (generic — current `setNameFormat` is hard-coded to one panel), `toggleBlockActive`, `duplicateBlock`, `collapseBlock`, `showPrompt`, `enableConditionalLogicRule`. These 9 helpers (~480 LOC in `engine/wpforms.js`) are what 4 production chapters in `videos/form-notifications/` depend on.

2. **Measure-driven camera move on iframe elements** (`focusOn` equivalent). Today: `focusOn(sel, { fill: 0.5 })` measures the iframe-doc element's rect and computes `level` so the element fills 50% of the viewport. Library has `cinematicFlight(camera, { from, to })` which expects you to know the pose. **Gap:** something like `cameraToElement(iframe, sel, { fill })` that returns a `{ x, y, scale }` pose, plus a stage-camera wrapper element you can `cinematicFlight` into. ~30 LOC.

3. **Highlight ring + label, projected over iframe coords.** Engine `highlight()` mounts a div over the outer overlay, positioned via `toStage()` math against the iframe transform. Used in 14 production chapters with labels like "Email field", "Required", "Click to enable", etc. **Gap:** library has nothing equivalent. Could be `iframeManager.highlightElement(sel, { label, pad })` — ~50 LOC.

4. **Per-beat narration + BGM duck system.** `scenes/shared.js#playNarration` + `startBGM` + ducking ~80 LOC. **Gap:** library doesn't include narration. Could be imported from `scenes/shared.js` as-is (no engine coupling), or re-implemented in a new `videos/_shared/narration.js` (~120 LOC).

5. **Title cards + postIntro orchestration.** `runtime/title-card.js` is 643 LOC, 3 variants, real product surface. **Not a gap** — can be imported as-is from a single-HTML; it only depends on GSAP. But there's no library-blessed wrapper.

6. **Frame-driver + pause-manager for scrubber + render-mode.** Both are `runtime/*` modules with no engine coupling. **Not a gap** — single-HTML can import them directly; the library's `Cursor` and `cinematicFlight` are already designed to register their timelines via these.

7. **`type()` that drives real iframe `<input>` JS listeners.** Engine `type()` does `el.dispatchEvent(new state.doc.defaultView.Event('input', { bubbles: true }))`. `caretType` writes `innerHTML` — fine for editorial text, **doesn't drive live `<input>.value` + input event**. Library has its own `setFieldLabel` that does `input.value = ...; dispatchEvent('input')` — pattern is there, just not as a standalone primitive. ~20 LOC.

8. **Curved-arc cursor with `via` waypoint.** Production `cursor.glideTo(sel, { via: { x, y } })` produces a 3-keyframe arc — winning-pattern §A3 requirement. `Cursor.glide(to)` is a single straight tween. **Gap:** `Cursor.glide(to, { via })` overload that does two sequential tweens. ~10 LOC.

9. **Engine.cursor semantic verbs** (`clickOn(sel, { instruction, magnetic })`, `parkNearest(sel)`, `toggle(sel)`, `typeInto(sel, text)`). Library Cursor has primitive methods; the rich-cursor verbs in `engine/interactions.js` wrap them with overlay timing, magnetic-pull, anchor-nav suppression. **Gap:** ~150 LOC of adapter to expose the same semantic verbs on top of Cursor.

10. **Spotlight / pointer overlay shapes** (form-notifications `overlays: [{ pointer, spotlight }]`). Engine has both. Library has neither. **Gap:** ~80 LOC each, OR migrate the 3-4 chapters that use them to inline alternatives (e.g., replace `pointer:` overlays with a simple animated triangle div, which is what the engine does anyway).

**Total gap to fill:** ~1,200–1,500 LOC of library extensions + 2-3 months of authoring (most of it Wave 2). After that, single-HTML tutorials become viable for every production video shape.

---

## Section 3 — Per-thing comparison (new vs old, side by side)

### Snapshot loading + swap

| Concern | Engine path | Library path |
|---|---|---|
| Mount a snapshot | `engine.loadSnapshot(slug)` — body-wipes whole page, injects `.stage > iframe.ui + .overlay`, waits for iframe load, primes camera driver, fires `applyCameraImmediate({zoom:1})`. Side effects: every helper mounted before this dies. Workarounds: flash-guard `<style>` in `<head>` that survives body-wipe; `mountMeshBg`/`mountStageChrome`/`mountWatermark`/`installOverlayStyles` re-mounted post-load. | `IframeManager.load(slug)` — creates iframe inside `.ifm-slot`, waits for load, gsap.set opacity 1. No body-wipe. Stage chrome (if any) lives outside the slot and is untouched. |
| Swap to a different snapshot | `transitionSnapshots(newSlug, ...)` — branches on swapStyle. flipBridge path: `preloadSnapshot` (mount hidden iframe in `.stage`), wait for load, `adoptSnapshotIframe` (atomic class swap + state singleton update). Cover/fast/morph/etc.: install flash-guard, `engine.loadSnapshot` (body-wipe), re-mount chrome, run `runSwapTransition(style, doSwap)` for the cream fade choreography. | `IframeManager.swap(slug, { duration: 0.32 })` — creates second iframe, waits for load, parallel gsap.to opacity: prev 1→0, next 0→1. Old iframe removed. |
| Failure mode | Body-wipe at the wrong moment leaves DOM half-built. Flash-guard prevents visual flash but adds 4-5 sequential mount steps. iframe-load errors leave promise hung (no error listener — Track 1 finding). | Second iframe doesn't load → load() never resolves. About-blank initial-doc race handled by `_waitForIframeLoad` check against expected URL. |
| LOC | ~80 (engine.loadSnapshot) + ~30 (adoptSnapshotIframe) + ~50 (preload/commit) + ~270 (transitions.js) + ~120 (scene-helpers boot/swap) ≈ **550 LOC** | ~150 LOC (IframeManager class) |

**Verdict: REPLACED by IframeManager.** The 400-LOC reduction comes from not needing a flash-guard, not needing 6 mount-on-every-swap steps, and not needing 6 swap-style choreographies because the slot model has no flash to hide.

### Camera (zoom / pan / move)

| Concern | Engine path | Library path |
|---|---|---|
| Mount the camera | `applyCameraImmediate` + `ensureCameraDriver` (registers frame-driver adapter with duration 60min and a seek loop that interpolates from→to over elapsed time). Iframe element is the transformed surface. State lives in `engine.state` singleton. | Stage element (or a wrapper inside it) is the `.scene-camera`. gsap tweens its `x/y/scale/rotation` directly. State lives in the gsap timeline. |
| Manual zoom to specific level | `zoomTo([sel], { level: 1.4, pad: 34, noScroll: true, duration: 550 })` — resolves selectors against iframe, computes union rect, clamps center to viewport, applies `scale + translate` to iframe.style.transform. | Author writes `gsap.to('.scene-camera', { x, y, scale, duration, ease })` directly OR uses `cinematicFlight` for the 4-phase decomposed version. |
| Measure-driven (fill 50% of viewport) | `focusOn(sel, { fill: 0.5 })` — measures rect, computes level so element fills `fill`, calls `zoomTo` with it. | **Gap.** Library has no element-measuring camera helper. Needs ~30 LOC: a `cameraToElement(iframeManager, sel, { fill })` that returns `{ x, y, scale }` for `cinematicFlight`. |
| Cinematic 4-phase flight (anticipation → flight w/ scale-dip → land → micro-zoom) | Author has to compose this by hand in chapter `effect`. Engine offers no help. The winning-pattern §A3 multi-track parallel composition is hand-rolled per chapter (`build-forms-faster` per-video `_kit.js`). | `cinematicFlight(camera, { from, to, anticipationDuration, flightDuration, landHold, scaleDipFactor, rotationTilt, microZoom })` — one call. |
| Smooth pan within a chapter | `zoomTo` with `smooth: true` + `scrollBehavior: 'smooth'`. | Author tweens .scene-camera with `ease: 'expo.inOut'` or `power3.inOut`. `focusStationOverview` is the canonical pattern. |
| LOC | ~80 (apply/driver/zoomTo basics) + ~40 (highlight math) + ~50 (focusOn) ≈ **170 LOC** | ~100 (3 camera primitives in motion-primitives) |

**Verdict: REPLACED for cinematic work; gap of ~30 LOC for measure-driven equivalent of focusOn.** Net library is more capable for editorial; needs one helper to match focusOn for tutorial scope.

### Cursor

| Concern | Engine path | Library path |
|---|---|---|
| Mount cursor | engine.loadSnapshot mounts `<svg class="cursor">` inside `.overlay`. `installMacCursor()` swaps to mac SVG. State in `engine.state.cursorEl`. | `new Cursor(stage, { initialX, initialY, svg, size, zIndex })` — mounts `<div class="ml-cursor">` inside stage. State in instance. |
| Glide to selector | `cursor.moveTo(sel)` — resolves against iframe doc, projects to stage coord via `toStage`, sets cursor.style.left/top with CSS transition. | `cursor.glide({ x, y })` — author resolves coords via `iframeManager.elementToStageCoords(sel)`, then `cursor.glide(pt)`. Returns gsap.to promise. |
| Click | `cursor.click({ effect })` — toggle .click class + 140ms sleep. `effect` supports `{ remove: sel }` (animate-and-remove node) or `{ toggleClass: { target, name } }`. | `cursor.click({ ripple, rippleColor, rippleScale })` — squash + ripple timeline. **No `effect` parameter.** The author does the DOM mutation themselves. |
| Curved-arc via waypoint | `cursor.glideTo(sel, { via: {x, y}, wait: 880 })` — does two sequential moveTo calls. Winning-pattern §A3 requirement. | **Gap.** `Cursor.glide(to)` is one straight tween. Easy to extend: ~10 LOC for `{ via }` overload. |
| Magnetic-pull on target | `cursor.clickOn(sel, { magnetic: true })` — partway through glide, target scales 1.04 + plays hover SFX, then scales back on click. Real product-feel. | **Gap.** Library Cursor doesn't know about its target element. Adapter could add this: ~20 LOC. |
| Drag with ghost | `cursor.dragGrab(srcSel, dstSel, { wait, rotate, ghostMaxPx, ghostScale })` — removed 2026-05-11 per Phase 5c.1. Replaced by `runtime/drag.js#dragField`. | `cursor.drag(from, to, { ghostSource, ghostRotate, ghostScale, ghostMaxPx, glideDuration, dragDuration })`. **Already in Cursor class.** Also `WPFormsInteractions.dragFieldToForm` does it library-native. |
| Type into iframe input | `cursor.moveTo(sel) → cursor.click() → engine.type(sel, text, { cps })` — engine.type dispatches `input` event from iframe's defaultView. | `WPFormsInteractions.setFieldLabel` does this internally. No standalone primitive yet. **Gap:** ~20 LOC. |
| Park off-screen | `cursor.park({ x, y })` (iframe-coord) or `cursor.parkAt('off-right')` (anchor name) | `cursor.setPos(x, y)` (stage-coord). No anchor names — author picks coords. |
| LOC | engine.cursor ~65 + engine/interactions.js semantic verbs ~190 ≈ **255 LOC** | Cursor class ~340 LOC (more capable: hover w/ target effect, drag w/ ghost, hoverGlow). |

**Verdict: Mostly REPLACED. ~50 LOC of gaps (`via` overload, magnetic-pull, type-into-input).** The 104 production cursor.* call sites need an adapter (`legacy-cursor-adapter.js` exposing clickOn/glideTo/parkAt/parkNearest/hoverOn/typeInto/dragFromTo/toggle on top of Cursor class), or per-site migration. Adapter is ~150 LOC.

### Type / Typewriter

| Concern | Engine path | Library path |
|---|---|---|
| Typewriter into iframe input (fires JS listeners) | `engine.type(sel, text, { cps })` — sets el.value per-char + dispatches synthetic `input` event from iframe's defaultView | `WPFormsInteractions.setFieldLabel` does this inline. No standalone. **Gap.** |
| Typewriter into stage text element | author writes their own gsap.to + onUpdate innerHTML | `caretType(el, text, { charDuration, caretHtml })` — proven pattern, fixes caret-drift bug from wpforms-ai-board |
| LOC | ~19 (engine.type) | caretType ~18 LOC |

**Verdict: REPLACED for stage text. Gap for iframe-input version (~20 LOC port).**

### Highlight + overlays

| Concern | Engine path | Library path |
|---|---|---|
| Ring around iframe element with label | `highlight([sel], { label, pad })` — projects iframe coord to stage via `toStage`, mounts `.hl` div + optional `.label` div on `.overlay`, animated fade-in. Used in 14 production chapters. | **Gap.** Library has `markerSweep` (over text) and `popOut` (clone-and-lift card) but no ring-with-label. Could be `iframeManager.highlightElement(sel, { label, pad, fadeMs })` — ~50 LOC. |
| Spotlight (dim everything except target chain) | `spotlight(sel, { dim, fade })` — injects CSS into iframe doc using `.__spot_chain` ancestor marking. Used in 3 form-notifications chapters. | **Gap.** Library has nothing. Could be ~40 LOC. |
| Animated bouncing pointer (arrow + label) | `pointer(sel, { direction, label, size, gap })` — stage-positioned animated SVG triangle. Used in 5 form-notifications chapters as `overlays: [{ pointer }]`. | **Gap.** ~80 LOC. OR: those chapters use the new Cursor + a static "click here" caption pill instead, removing the bouncing-triangle pattern entirely. |
| Click ripple at point | `engine/overlays-layer.js#ripple()` (engine path); `Cursor.click()` includes ripple in motion-primitives. | `clickRipple(stage, x, y)` (standalone) + `Cursor.click({ ripple: true })` (instance method). Both ready. |
| LOC | engine/overlays-layer.js ~210 + engine.highlight ~40 + engine.pointer ~78 + engine.spotlight ~36 ≈ **365 LOC** | Equivalents would be ~170 LOC |

**Verdict: Mostly REPLACEABLE. ~170 LOC of new library code needed.** Spotlight + pointer are form-notifications-only; could be inlined per-chapter OR ported as library primitives.

### Snapshot setup / DOM prep

| Concern | Engine path | Library path |
|---|---|---|
| Apply default form (3-field SCF on builder-fields) | `applyDefaultForm(doc, { keepIds, labels, formName })` from `runtime/dom-prep.js`. 60 LOC. | `WPFormsInteractions.applyFormProfile('demo-5')` — same pattern. ~40 LOC. Only difference: declarative profile vs imperative options. |
| Hide fields, set field label, set choice labels, set required, set hide-label, set choice layout, apply icon choices, apply image choices, set form name, activate field option group | All in `runtime/dom-prep.js` (669 LOC) + `runtime/prep-ops.js` (334 LOC) declarative op registry. | **Gap.** Library has `setFieldLabel`, `toggleEmailConfirmation`, `setNameFormat`. The other ~10 state-vocabulary helpers don't exist. Wave 3 candidates. |
| Sanitize a captured snapshot (strip admin bar, remove builder cruft, patch FA6 aliasing) | Mostly in `runtime/dom-prep.js` + `sanitize/<snapshot>.js` per-snapshot modules. | **Gap.** Could move per-snapshot work into `sanitize/<snapshot>.js` (already partly done) and let single-HTML videos import them. The generic helpers (`removeAdminBar`, `removeBuilderCruft`) port cleanly. |
| LOC | dom-prep ~669 + prep-ops ~334 ≈ **1,000 LOC** | applyFormProfile + 3 setters ≈ ~100 LOC; rest is gap |

**Verdict: WPFORMS-PORTABLE. ~900 LOC of state vocabulary needs to be ported.** Concentrated in 2 videos (creating-first-form + checkboxes), so the migration is tractable.

### Orchestration (intro / postIntro / teaser / outro / chapter loop / start gate / BGM / narration)

| Concern | Engine path | Library path |
|---|---|---|
| Boot, start gate, intro card | `runtime/player.js#playVideo` — ~310 LOC of orchestration. Same machinery in `runtime/chapter-runner.js#runChain` (~205 LOC duplicated, Track 1 #3). | **Gap.** Library has no boot scaffolding. Single-HTML videos do their own (e.g., `wpforms-ai-prompt-open` has its own start-gate-less self-running shape). |
| Title card (intro/outro variants) | `runtime/title-card.js` — 643 LOC, 3 variants. | **Not a gap** — single-HTML can `import { playTitleCard }` from `/runtime/title-card.js` directly. Only GSAP dependency. |
| Narration + BGM + ducking | `scenes/shared.js` — `startBGM`/`stopBGM`/`playNarration` (~80 LOC of audio). | **Gap.** Not in library. Portable as `videos/_shared/narration.js` — ~100 LOC. |
| Per-beat narration sync | `runtime/player.js#runBeatsPerNarration` — beats await `narration.ended` between them. ~45 LOC. | **Gap.** Author would orchestrate this in their master timeline. Or library could add a `playNarrationSync(audio, timeline, beats)` helper. |
| Audio-cued timeline (beats fire at `audio.currentTime` markers) | `runtime/player.js#makeWaitAt` + `audio-cued` mode. 1 chapter uses it (form-notifications/smart-tags). | **Gap.** Master timeline + `audio.addEventListener('timeupdate')` is straightforward in single-HTML. |
| Snapshot-swap mid-chapter | `swapToSnapshot` exposed via ctx in player.js. Routes through transitionSnapshots. | `iframeManager.swap(slug)` called inline from the timeline. Same idea, lighter. |
| Mode dispatch (parallel / audio-cued / editorial / per-beat-narration / descriptor) | 4-mode `runChapter` + descriptor's `runChapters`. ~500 LOC combined. | **No equivalent and none needed.** A single-HTML video doesn't have modes; it has a master timeline. |
| Frame-driver + pause-manager | `runtime/frame-driver.js` + `runtime/pause-manager.js` — scrubber + render-mode. ~340 LOC. | **Not a gap** — single-HTML imports them directly. Already engine-decoupled. |
| LOC | player.js ~750 + chapter-runner ~530 + title-card ~640 + scenes/shared ~280 ≈ **2,200 LOC** | Single-HTML video typically has ~100-200 LOC of orchestration code per video (much of it cribbing from prompt-open's pattern). |

**Verdict: ~1,300 LOC of orchestration disappears, replaced by per-video timeline composition (~100-200 LOC each). Title-card + frame-driver + pause-manager stay (~1,000 LOC).**

### Chapter break / swap-style transitions

| Concern | Engine path | Library path |
|---|---|---|
| Same-snapshot chapter boundary | `runtime/transitions.js#runChapterBreak(style)` — `dolly` / `soft-dolly` / `whip` / `hold` / `glide`. | **No equivalent and none needed.** Boundary between two beats is just whatever the master timeline does next. `glide` = nothing. `soft-dolly` = a quick `gsap.to(camera, { scale: 1, duration: 0.42 })`. `whip` = inline blur tween. |
| Snapshot-changing chapter boundary | `runtime/transitions.js#runSwapTransition(style)` — `flipBridge` / `cover` / `fast` / `morph` / `whip` / `push`. | `iframeManager.swap(slug, { duration })` — one crossfade. Author can extend with their own pre/post tweens if `morph`-style camera-preservation is wanted (set new iframe's container transform to match outgoing before crossfading). |
| LOC | ~270 (transitions.js) | ~20 (IframeManager.swap itself; rest is author-controlled) |

**Verdict: All of `runtime/transitions.js` DELETED in the destination architecture.** The chapter-break vocabulary disappears because there are no chapter boundaries — only timeline phases. The swap-style vocabulary disappears because there's only one swap (crossfade) and any other styling is per-video master-timeline work.

---

## Section 4 — The destination architecture (what stays, what disappears)

If the engine path fully retires:

### What stays (~1,800 LOC of genuinely shared runtime)

```
runtime/
  ├── title-card.js       (~640 LOC — intro/outro card, real product machinery, GSAP-only deps)
  ├── frame-driver.js     (~130 LOC — required for scrubber + render --seek mode)
  ├── frame-adapter.js    (~75 LOC  — GSAP + WAAPI adapters for the driver)
  ├── pause-manager.js    (~205 LOC — global pause/resume + audio + CSS animation freeze)
  ├── pop-out.js          (~LOC depends — currently imported by motion-primitives.js; vendor into library or keep here)
  ├── cinematic-runner.js (~LOC — postIntro cinematic registry, used by `postIntro.kind` manifest declaration; OR sunset and let postIntros be regular master timelines)
  ├── focus-pull.js       (~LOC — depth-of-field bokeh effect for cinematic beats)
  ├── shared-scene.js     (~36 LOC — Three.js scene registry for rest-api wireframe burst)

videos/_shared/
  ├── motion-primitives.js   (~1,200 LOC + ~50 LOC of gap-fillers)
  ├── wpforms-interactions.js (~1,400 LOC + ~600 LOC for Wave 2 form-notifications + ~400 LOC for Wave 3 state vocabulary)
  ├── kit.js                  (~444 LOC — registerTimeline, pausableRaf, etc.; tighter coupling once engine retires)
  ├── narration.js (NEW)      (~100 LOC — BGM + ducking + playNarration; port of scenes/shared.js audio half)
  ├── effects.js              (~193 LOC — GSAP effects library, unchanged)
```

Per-video files (~150 LOC per tutorial video):

```
videos/<slug>/
  ├── index.html              (master timeline + IframeManager + Cursor + WPFormsInteractions setup)
  ├── _kit.js (optional)      (per-video atmosphere, named eases, video-specific helpers)
  ├── narration/*.mp3
  ├── selectors.js (optional) (named iframe selectors)
```

### What disappears (~6,000 LOC)

```
engine/
  ├── engine.js                  ~660 LOC — fully obsolete (iframe stage replaced by IframeManager)
  ├── wpforms.js                 ~640 LOC — port to wpforms-interactions Wave 2
  ├── interactions.js            ~330 LOC — focusOn → camera helper in library; semantic cursor verbs → Cursor adapter
  ├── overlays-layer.js          ~210 LOC — replaced by library highlight + Cursor.click ripple
runtime/
  ├── player.js                  ~750 LOC — per-video timeline replaces it
  ├── chapter-runner.js          ~530 LOC — descriptor mode retired
  ├── transitions.js             ~270 LOC — IframeManager.swap subsumes
  ├── dom-prep.js                ~670 LOC — port to wpforms-interactions Wave 3
  ├── prep-ops.js                ~330 LOC — declarative op registry retires with descriptor mode
  ├── camera-poses.js            ~30 LOC — string poses retired, inline poses everywhere
  ├── verbs.js                   ~1,050 LOC — descriptor verb dispatcher retires
  ├── drag.js                    ~260 LOC — already replicated in WPFormsInteractions.dragFieldToForm
  ├── scene-helpers.js (most)    ~470 LOC — flash-guard / cover / HUD all engine-path concerns
scenes/
  ├── player.html                ~95 LOC — replaced by per-video index.html
  ├── shared.js (most)           ~150 LOC — narration half moves to videos/_shared/narration.js; rest retires
  ├── shared.css (most)          ~50 LOC — mesh-bg + watermark folded into per-video CSS
```

**Net deletable: ~6,000 LOC.** Net retained: ~1,800 LOC + the libraries (~3,200 LOC). Total system size after migration: **~5,000 LOC**, down from the current ~10,800 LOC (engine + runtime + scenes + libraries combined).

This is **much larger than the first audit's "4,300 LOC" target.** The difference is that the first audit assumed the engine path stayed; this audit assumes it sunsets.

---

## Section 5 — What this means for the four video shapes

### Shape A — Engine-path tutorial → migrates to single-HTML

`make-field-required` reshapes to ~250 LOC of `index.html`:

```js
const stage = document.getElementById('stage');
const iframeManager = new IframeManager(stage);
const cursor = new Cursor(stage, { initialX: 1180, initialY: 660 });
const interactions = new WPFormsInteractions(stage, cursor, iframeManager);
const camera = document.getElementById('scene-camera'); // wraps iframeManager's slot
const tl = gsap.timeline({ paused: true });

// Beat 1: glide to email field on builder-fields, click
await iframeManager.load('builder-fields');
tl.add(cinematicFlight(camera, { from: { x: 0, y: 0, scale: 1 }, to: { x: -200, y: -100, scale: 1.22 } }));
tl.add(() => playNarration('find-field-setting'));
tl.add(() => cursor.glide(iframeManager.elementToStageCoords('.wpforms-field[data-field-id="2"]')));
tl.add(() => cursor.click());

// Beat 2: swap to field-options snapshot
tl.add(() => iframeManager.swap('builder-field-options-email'));
tl.add(() => playNarration('toggle-required'));
tl.add(() => cursor.glide(...));
tl.add(() => cursor.click());
// DOM mutation: set required class + asterisk
tl.add(() => {
  const doc = iframeManager.doc();
  doc.querySelector('.wpforms-field').classList.add('required');
  doc.querySelector('label').appendChild(starSpan);
});

// Beat 3: payoff popOut on the asterisk
tl.add(() => popOut(iframeManager.iframe(), '.wpforms-field-label .required'));

// Start
document.getElementById('startBtn').addEventListener('click', () => tl.play());
```

Reads like the QC shell. Reads like the editorial winner. **One mental model, one file per video.**

### Shape B — Engine-path winner → migrates to single-HTML with per-video _kit.js

`build-forms-faster-with-wpforms-ai/scene-2-add-new.js` reshapes the same way, but with a per-video `_kit.js` providing the conic-gradient ring CSS injection, magnetic hover, named eases. The kit is what `build-forms-faster` already has — it just runs without an engine wrapping it.

### Shape C — Pure-editorial single-HTML → unchanged

`wpforms-ai-prompt-open/index.html` already is the destination shape. **No migration needed.** It serves as the canonical template.

### Shape D — Mixed-surface (`klaviyo-addon-intro`, `rest-api-overview-polished`)

These have editorial chapters (no snapshot) + iframe chapters (with snapshot). In the destination architecture, the surface distinction disappears — the master timeline simply does or doesn't include an `iframeManager.load()` call. **`surface: 'mixed'` becomes "the master timeline talks to iframeManager sometimes."**

---

## Section 6 — Concrete migration sequence (honest)

This is what the first audit's "Section 3 — Recommended slimming sequence" should have looked like. Same steps 1–3 (delete dead transitions, delete deprecated dom-prep, drop unused easing). Then:

**Step 4 — Library extensions (~1,200 LOC of new library code, ~2-3 months):**

- 4a. Wave 1 QC sign-off (no LOC; just QC the 8 demos).
- 4b. `cameraToElement(iframeManager, sel, { fill })` helper — measure-driven camera (~30 LOC).
- 4c. `iframeManager.highlightElement(sel, { label, pad })` — ring + label projected over iframe coords (~50 LOC).
- 4d. `Cursor.glide(to, { via })` overload — curved arc (~10 LOC).
- 4e. `Cursor.clickOn(sel, opts)` semantic verb wrapper or full `legacy-cursor-adapter.js` (~150 LOC).
- 4f. `typeIntoIframeInput(input, text, opts)` primitive (~20 LOC).
- 4g. `videos/_shared/narration.js` — BGM + ducking + playNarration port (~100 LOC).
- 4h. Wave 2: 9 form-notifications interactions (~600 LOC, biggest single piece).
- 4i. Wave 3: dom-prep state vocabulary (~400 LOC). May be optional if descriptor mode also retires.

**Step 5 — Build one tutorial in single-HTML form, end-to-end, as proof.**

Recommend: `make-field-required`. Smallest production tutorial (3 chapters). Tests the library against a real tutorial-grade arc with narration, snapshot swap, DOM mutation, popOut payoff. If this works, the pattern is proven.

**Step 6 — Migrate per-video, smallest-to-largest:**

Order by chapter count and complexity. Tentative:
1. `make-field-required` (3 chapters) — pilot from step 5
2. `surveys-and-polls-v4-final-synced` (6 chapters)
3. `form-entries-guide` (6 chapters)
4. `klaviyo-addon-intro` (5 chapters)
5. `build-forms-faster-with-wpforms-ai` (10 chapters)
6. `wpforms-rest-api-overview-polished` (6 chapters)
7. `form-notifications` (5 chapters, blocked on Wave 2)
8. `creating-first-form` + `a-complete-guide-to-the-checkboxes-field` (13 descriptor chapters, blocked on Wave 3 — OR migrate descriptor mode → beats mode at the same time)

Each migration is a per-video PR. Visual QC by Umair before merge (5-second rule).

**Step 7 — Delete the engine + runtime path:**

After step 6, every production video runs single-HTML. Delete:
- `engine/` (all 4 files, ~1,840 LOC)
- `runtime/player.js`, `chapter-runner.js`, `transitions.js`, `dom-prep.js`, `prep-ops.js`, `camera-poses.js`, `verbs.js`, `drag.js` (~3,890 LOC)
- `runtime/scene-helpers.js` (mostly — ~470 LOC; keep small bits if reused)
- `scenes/player.html`, most of `scenes/shared.js`, most of `scenes/shared.css` (~270 LOC)
- `tools/validate-video.js` validation rules tied to descriptor verbs
- `runtime/cinematic-runner.js` if postIntros are now just master timelines

**Total time:** 3-6 months realistically, depending on how aggressively Wave 2/3 ship.

---

## Section 7 — Things I genuinely don't yet know

To be honest:

1. **Does `caretType` actually work for driving live WPForms `<input>` JS listeners?** caretType writes innerHTML. WPForms snapshots usually have static DOM; the live event handlers don't fire. But sanitized snapshots that preserve some JS (e.g., the chip insertion in `smartTag`) might break. Need to test in a single-HTML pilot.

2. **Does `IframeManager.elementToStageCoords` work correctly when the stage has a CSS transform applied (e.g., camera zoom)?** Reading the code, it reverses the stage transform via `_viewportToStage`. Looks correct. But the engine path puts the camera transform on the iframe element itself, not on a stage wrapper. The library puts it on the stage. **Implication for the audit:** in the new pattern, you transform `.scene-camera` (a stage wrapper around the slot), and Cursor stays in stage-coord space — so cursor projection naturally tracks the camera without the engine's `toStage` math. This is cleaner. But it does mean the camera transform stack is different — cinematicFlight tweens the wrapper, not the iframe — which means `engine.applyCamera`'s entire pattern is replaced by "gsap.to a wrapper" with no equivalent in the library, and the math is trivial enough to inline.

3. **Are there production beats that genuinely need `engine.runScene`'s spotlight chain (`__spot_chain` ancestor marking)?** Spotlight injects CSS into the iframe doc using `.__spot_chain` on ancestors so the target's parent chain stays opaque while siblings dim. Used in 3 form-notifications chapters. In a single-HTML pilot, those 3 chapters either get a ported `WPFormsInteractions.spotlightField(sel)`, or migrate to a different emphasis pattern (e.g., popOut + dim-overlay). Need to decide.

4. **Cost of postIntro / cinematic-runner.** PostIntros are registered cinematics with their own runtime registry (`runtime/cinematic-runner.js` + variants). 2 production manifests have `postIntro` declared. Migration cost depends on whether the cinematic registry stays or the postIntro becomes just-another-timeline-phase per-video.

5. **Render-mode parity.** `tools/render.js --seek` drives frame-by-frame MP4 capture via frame-driver. The new pattern needs to register the master gsap.timeline with frame-driver via `registerTimeline` for `--seek` to work. Library already does this (Cursor and cinematicFlight integrate). But the per-video author has to remember to wire it. **A `videos/_shared/runVideo(masterTimeline, opts)` boot helper would standardize this.**

These aren't reasons to delay the architecture decision. They're items to verify in the step-5 pilot.

---

## Section 8 — Direct answers to the four questions

> **What is the purpose of each file in engine/?**

- `engine/engine.js` — iframe stage + camera math + cursor + highlight/pointer/spotlight + runScene compositor. **Subsumed by IframeManager + Cursor + library highlight equivalents.**
- `engine/wpforms.js` — WPForms-specific DOM puppetry (smartTag, toggleControl, etc.). **WPFORMS-PORTABLE — ported in Wave 2.**
- `engine/interactions.js` — focusOn (measure-driven camera) + rich-cursor facade. **Replaced by cameraToElement helper + Cursor adapter.**
- `engine/overlays-layer.js` — overlay CSS + highlight/instruction/ripple renderers. **Replaced by library highlight + Cursor click ripple.**

After migration: **all 4 files deleted.** ~1,840 LOC.

> **How are transitions handled now that we have cinematicFlight and figjamFlight?**

In the engine path: `flipBridge` (snapshot swap) + `runChapterBreak` (same-snapshot boundary). In the new pattern: **neither exists.** `iframeManager.swap(slug, { duration: 0.32 })` is the only snapshot transition. Beat-to-beat is whatever the master timeline does — usually nothing special, sometimes `cinematicFlight` or `figjamFlight` for cinematic moves between poses. `runtime/transitions.js` is fully deletable post-migration.

The `cinematicFlight` and `figjamFlight` primitives are for **camera motion** — they don't compete with `flipBridge` because flipBridge isn't a camera move, it's a DOM-swap workaround. Once the DOM swap is a crossfade (IframeManager), there's nothing for flipBridge to band-aid.

> **How is zoom handled now?**

In the new pattern, the camera is a `.scene-camera` wrapper element around the IframeManager slot. `gsap.to('.scene-camera', { x, y, scale })` does what `engine.zoomTo` did, only on a stage element instead of an iframe. For measure-driven zoom (the focusOn pattern), you'd call `cameraToElement(iframeManager, sel, { fill: 0.5 })` to get the pose, then `cinematicFlight(camera, { from, to: thatPose })`. The library doesn't have `cameraToElement` yet — it's a ~30 LOC gap. After that's filled, every engine `zoomTo`/`focusOn` call has a library equivalent.

> **Single-HTML tutorial with master gsap.timeline + these motions/primitives — thoughts?**

**Yes. It's not just plausible — the QC shells already do it.** The path forward is exactly what you described: master timeline + IframeManager + Cursor + WPFormsInteractions, plus a per-video `_kit.js` for atmosphere/named-eases when needed. The pilot should be a small real tutorial (`make-field-required` recommended) once the four blocking library gaps are filled (Wave 1 QC, cameraToElement, highlightElement, narration port). After that proof, every tutorial migrates the same way, and the engine + runtime stack retires.

---

## Section 9 — Recommendation

**Three weeks of focused work to get to a proof:**

1. **Week 1:** QC the Wave 1 interactions + popOut. Sign off or red-line. (Blocker for everything.)
2. **Week 1-2:** Fill the 4 library gaps for tutorial parity — `cameraToElement`, `iframeManager.highlightElement`, `Cursor.glide({via})`, narration port. ~200 LOC total.
3. **Week 2-3:** Pilot — rebuild `make-field-required` as a single-HTML video. End-to-end, with narration, snapshot swap, payoff popOut. Real visual QC. If the pilot looks as good as the current engine version, the architecture decision is confirmed.

**If the pilot succeeds:** start Wave 2 (form-notifications) and per-video migrations in parallel. Engine + runtime path retires over the following 3-6 months. Net deletion: ~6,000 LOC of engine + runtime + scenes.

**If the pilot fails:** the failure tells you exactly which library gap is hardest to close. The first audit's "engine stays load-bearing" framing becomes more defensible. But until the pilot runs, the engine path is not actually the only-possible-answer it looked like.

---

## Section 10 — What I am NOT saying

To avoid swinging too far the other way:

- **`runtime/title-card.js` is not redundant.** 643 LOC of real product machinery. Stays.
- **`runtime/frame-driver.js` + `pause-manager.js` are not redundant.** Required for scrubber + `--seek` MP4 render. Stays.
- **`scenes/shared.js#playNarration` + BGM is not redundant.** Just gets relocated to `videos/_shared/narration.js`.
- **`engine/wpforms.js` is not deletable today.** Stays until Wave 2 lands.
- **The two engine-using winners (`build-forms-faster`, `rest-api-overview-polished`) are not bad videos.** They produced winning output. The argument is not "the engine is bad"; it is "the libraries can produce the same output with fewer moving parts, and the QC shells already prove that pattern works at small scope."

The first audit erred toward "engine is load-bearing therefore stays." This audit corrects toward "engine is transitional therefore sunsets." Both extremes are wrong if held literally; the honest position is the migration sequence above — engine stays until each migration step lands, then retires in stages.

That's the architect's call I should have made on the first pass.
