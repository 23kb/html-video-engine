# Engine Redundancy Audit — 2026-05-12

Review-only doc. **No code edits proposed for direct execution.** Read this carefully before any deletion lands.

This audit answers Umair's recurring framing — *"since now we have primitives and motions code separately defined, what is the purpose of runner, engine, player core files etc."* — with a per-file, per-function, per-primitive classification backed by grep evidence.

It is **not** the Track 1 dead-code audit (`docs/engine-runtime-optimization-audit-2026-05-11.md`). That asked "what is unused?" — and Codex's verification pass (`docs/phase-5c1-dead-code-verification-2026-05-11.md`) caught 5 reachability errors in it. This audit asks the different question: **"given the new libraries, what is now redundant vs load-bearing?"**

Branch verified: `audit-shape-2026-05-10`. LOC counts measured 2026-05-12 (post-batch-1 deletions).

## Caveats up front

Three things that make this audit's strategic claims load-bearing-but-not-final:

1. **`wpforms-interactions.js` Wave 1 is all DRAFT.** Per `videos/_qc-interactions/index.html`, all 8 Wave 1 interactions ship with status `draft — needs QC`. **The library is built but not blessed.** Production migration cannot start until QC clears.
2. **`wpforms-interactions.js` Wave 1 does NOT cover form-notifications.** Grep confirms zero `smartTag`/`toggleControl`/`selectDropdown`/`enableConditionalLogicRule`/`revealSection`/`duplicateBlock`/`showPrompt`/`toggleBlockActive` in the library. Those 8 helpers live only in `engine/wpforms.js` today. They are **WPFORMS-PORTABLE in principle, blocked-by-Wave-2 in practice.**
3. **The libraries depend on `runtime/pop-out.js`** (motion-primitives imports `injectIframeFonts` / `inlineTreeStyles` / `stripBuilderChrome` from it). The "single-HTML can drop all of runtime" framing has one dependency leak the library hasn't broken yet.

If the audit reads more "load-bearing" than Umair expected: that's not me padding. The engine + runtime is doing real work that the libraries don't yet cover. The slimming opportunity is real but smaller than 80%, and the migration sequence is multi-month.

---

## Section 1 — Executive answer to Umair's question

**The current state** is that the engine + runtime is roughly **30–40% redundant** if you measure against what the libraries can do *today* — and that 30% sits inside a system where 100% is currently load-bearing for the 2 winning tutorial videos (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`). Concrete numbers: the in-scope surface is **7,834 LOC** across `engine/*` (1,836), `runtime/*` (5,558 with title-card + cinematic + pop-out included), and `scenes/*` (443). Of that, ~600 LOC is dead transition styles, dead beat runners, dead camera-pose registry, and dead overlay branches; ~1,200 LOC is duplicated between `runtime/player.js` and `runtime/chapter-runner.js` (Track 1 finding, still un-fixed); ~1,400 LOC is `engine/wpforms.js` + `runtime/dom-prep.js` + `runtime/prep-ops.js` which are 100% **WPFORMS-PORTABLE** — they could move into `wpforms-interactions.js` as setup methods, but the library would need to grow to cover the form-notifications panel before that delete is safe. The remaining ~4,500 LOC — flash-guards, snapshot-swap covers, narration loader, title-card, cinematic-runner, frame-driver, pause-manager, postIntro/teaser/outro orchestration — is genuinely **LOAD-BEARING** as long as multi-chapter narration-driven tutorial videos exist.

**The minimum viable engine** — if production fully migrated to single-HTML + libraries — would be roughly **800–1,200 LOC**: an `IframeManager` (already in libraries, 297 LOC), a paused master timeline + `frame-driver` + `pause-manager` for scrubber parity (already in runtime, ~400 LOC combined), the `flipBridge` snapshot swap or its single-HTML equivalent (~80 LOC), a narration loader (~100 LOC, already in `scenes/shared.js`), and a title-card system (~600 LOC, already in `runtime/title-card.js`). The engine's iframe + camera + cursor stack (`engine/engine.js` ≈ 660 LOC), the wpforms-puppetry layer (`engine/wpforms.js` ≈ 640 LOC), the descriptor mode (`runtime/chapter-runner.js` ≈ 530 LOC), the prep-ops vocabulary (`runtime/dom-prep.js` + `prep-ops.js` ≈ 1,000 LOC combined), and the player.js mode dispatcher (`runtime/player.js` ≈ 750 LOC) **all eventually disappear** if every chapter becomes "import library, write a master timeline, attach it to the frame-driver." That's a real slimming target.

**The migration cost** to actually execute that is the catch. It's not one PR; it's multi-month, video-by-video, with three blockers: (1) `wpforms-interactions.js` Wave 1 is unapproved and Wave 2 doesn't exist — covering form-notifications smartTags / dropdown / conditional-logic / templates / addons is the single largest gap; (2) every existing chapter would need to be rewritten or wrapped — production has 100+ chapters split across descriptor mode (13 chapters, 2 videos) and beats-array mode (~70 chapters across 12 videos), each with their own narration timing, camera continuity, and snapshot-swap requirements; (3) the postIntro / teaser / outro / BGM-ducking / flash-guard / start-gate / watermark scaffolding is non-trivial to re-implement in single-HTML form, and the current 2 winners depend on it. The honest answer: **the engine earns its place for tutorial work today. The redundancy is real but smaller than 80%. The slimming sequence is months of work, not a weekend.**

---

## Section 2 — Per-file classification table

LOC counts measured 2026-05-12 via `wc -l`. Production caller counts grep'd across `videos/**`.

### Legend

| Class | Meaning |
|---|---|
| **REPLACED** | Library equivalent exists, approved. Engine version can be deleted after production migrates. |
| **REPLACEABLE** | Library equivalent exists but Wave 1 DRAFT. Cannot delete until QC blesses. |
| **WPFORMS-PORTABLE** | Engine version is WPForms-specific DOM puppetry. Could move to `wpforms-interactions.js` as a method. Wave 2 work. |
| **LOAD-BEARING** | No library equivalent. Genuinely hard to replace. Keep. |
| **DEAD** | Zero production callers verified by grep. Safe to delete now. |

### engine/engine.js — 660 LOC

| Export | LOC | Class | Replacement | Production callers (grep) |
|---|---|---|---|---|
| `loadSnapshot(slug, opts)` — body-wipes page, mounts iframe stage, primes camera | ~80 (engine.js:90-166) | **LOAD-BEARING** for engine path | `IframeManager` in wpforms-interactions.js uses a slot model (no body-wipe) — different design. Engine version body-wipes the page; library version mounts inside a stage element. Incompatible without rewrite. | 0 direct chapter callers; called by `runtime/scene-helpers.js#bootSnapshot`, `runtime/player.js`, `scenes/shared.js` |
| `adoptSnapshotIframe(iframe, opts)` — flipBridge atomic swap | ~30 (engine.js:168-199) | **LOAD-BEARING** | flipBridge is the default + 5-manifest + many-chapter swap style. No library equivalent. | Via `runtime/scene-helpers.js#commitPreloadedSnapshot` (engine path only) |
| `setCameraTransform(opts)` + `cameraState()` | ~5 + ~5 | **LOAD-BEARING** | Camera transform stack lives downstream of iframe; gsap.to on .scene-camera replaces it for single-HTML. | `runtime/transitions.js` (dolly, soft-dolly), `runtime/chapter-runner.js`, `runtime/player.js`, `engine/wpforms.js` (cameraState for diag) |
| `applyCamera` / `applyCameraImmediate` / `ensureCameraDriver` / `easeProgress` — camera animation engine | ~70 (engine.js:27-87) | **REPLACEABLE** (engine path only) | Single-HTML pattern uses `gsap.timeline({ paused: true })` + `frame-driver` adapter. `cinematicFlight` / `figjamFlight` / `focusStationOverview` are the new shape. | Internal-only |
| `unionRects` / `resolveTargets` / `toStage` | ~30 | **LOAD-BEARING** (camera math) | Iframe-coord-to-stage-coord projection is what enables overlays-on-stage-positioned-at-iframe-coords. Single-HTML doesn't need this because everything's stage-native. | Internal-only |
| `zoomTo(targets, opts)` | 42 (engine.js:240-281) | **REPLACEABLE** (engine path) | Production routes through `focusOn` (engine/interactions.js wrapper) and the camera-bounds math. Single-HTML uses inline gsap.to. | `videos/build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js:160` (direct), and via `runScene`'s `cam.focus` branch in 25+ parallel-mode chapters. Cumulative ~50 chapter call sites. |
| `highlight(targets, opts)` | ~40 (engine.js:287-327) | **REPLACEABLE** (engine path) | Production: 22+ direct calls across 14 chapters (form-entries-guide, make-field-required, klaviyo-addon-intro, form-notifications). Outer-overlay vignette over iframe-projected coords. Library `markerSweep` / `popOut` cover some cases; full overlay-vignette doesn't have a library equivalent. | 22 grep hits in 14 chapter files |
| `clearHighlights()` | ~8 | **LOAD-BEARING** for engine path | Trivial DOM op but tightly coupled to the .overlay layer the engine mounts. | Heavy use in player.js + chapter-runner.js + all overlay-using chapters |
| `pointer(selector, opts)` | 78 (engine.js:349-426) | **WPFORMS-PORTABLE** | Reached via `overlays: [{ pointer: ... }]` shape in form-notifications. **Production-live per Codex verification** (5 chapters). No library equivalent. | 5 production chapters in form-notifications (smart-tags, managing×3, conditional-logic, advanced) |
| `spotlight(selector, opts)` | 36 (engine.js:440-475) | **WPFORMS-PORTABLE** | Reached via `spotlight:` beat property in form-notifications. **Production-live per Codex verification** (3 chapters). No library equivalent. | 3 production chapters (form-notifications/advanced×3, smart-tags) |
| `cursor` object (`park`/`moveTo`/`click`/`hide`) | ~65 (engine.js:478-542) | **REPLACED in principle, blocked by migration** | The `Cursor` class in motion-primitives.js is approved (ready). But production uses `cursor` via the rich-cursor facade in `engine/interactions.js` (clickOn/glideTo/parkAt/typeInto/dragFromTo/toggle). 104 cursor.* call sites in 30 chapter files. **Can't delete until those sites migrate.** | 104 occurrences across 30 chapter files |
| `type(target, text, opts)` | ~19 (engine.js:545-563) | **REPLACED** | `caretType` primitive (approved) does this in single-HTML with the caret-position fix. Engine version's only advantage: dispatches `input` events on iframe inputs. | Via player.js's `typeWithSfx` wrapper. Direct chapter usage: 9 calls per Phase 1 reading notes. |
| `runScene(beats)` | 60 (engine.js:600-660) | **REPLACEABLE** (engine path) | Production parallel-mode + audio-cued-mode + editorial-mode routes through this. ~25 parallel-mode chapters + 1 audio-cued chapter + 9 editorial-mode chapters. Body of runScene is: clearHighlights → optional chapter-break → zoomTo → spotlight → overlays → labelDwell → effect → dwell. A `runDeclarativeBeats` shim in player.js could absorb this. | 0 direct chapter callers (verified by Codex). Routed via player.js modes for ~35 chapters. |
| Debug `d` hotkey | ALREADY REMOVED | — | Per engine.js:565-567 comment "removed 2026-05-11 per Phase 5c.1". | — |
| `cursor.dragGrab` | ALREADY REMOVED | — | Per engine.js:539-541 comment "removed 2026-05-11". Descriptor `do: 'dragGrab'` routes to `runtime/drag.js#dragField`, not this method. | — |

**Net engine.js classification:** ~440 LOC LOAD-BEARING (iframe + camera math + adoptSnapshotIframe + clearHighlights + applyCamera stack); ~140 LOC REPLACEABLE (zoomTo + highlight + cursor object + type + runScene); ~115 LOC WPFORMS-PORTABLE (pointer + spotlight). Zero DEAD lines remaining post-batch-1.

### engine/wpforms.js — 639 LOC

| Export | LOC | Class | Replacement | Production callers (grep) |
|---|---|---|---|---|
| `revealSection(groupSelector, opts)` | ~23 (wpforms.js:32-54) | **WPFORMS-PORTABLE** | No library equivalent. Form-notifications panel-fields-group expand pattern. | 1 chapter: form-notifications/advanced.js:22 |
| `toggleControl(fieldWrapSel, opts)` | ~15 (wpforms.js:66-80) | **WPFORMS-PORTABLE** | No library equivalent. `toggleEmailConfirmation` in interactions covers email-confirmation only; this is generic. | 2 calls in form-notifications/advanced.js |
| `smartTag(fieldSel, opts)` | ~80 (wpforms.js:94-173) | **WPFORMS-PORTABLE** | No library equivalent. Heavy interaction (open dropdown / pick / insert chip / close). | form-notifications/smart-tags.js (smartTag is the chapter's centerpiece) |
| `selectDropdown(fieldWrapSel, opts)` | ~88 (wpforms.js:185-272) | **WPFORMS-PORTABLE** | Library has `setNameFormat` which is an analogous faux-dropdown; pattern is portable. Engine version targets ANY native `<select>` via `fieldWrapSelector`; library version is hard-coded for one panel. Wave 2 candidate. | 1 chapter: form-notifications/advanced.js:31 (Email Template dropdown) |
| `toggleBlockActive(blockSel, opts)` | ~32 (wpforms.js:283-314) | **WPFORMS-PORTABLE** | No library equivalent. Active/Inactive badge flip on notification blocks. | 1 chapter: form-notifications/managing.js |
| `duplicateBlock(blockSel, opts)` | ~60 (wpforms.js:327-387) | **WPFORMS-PORTABLE** | No library equivalent. Clone + slide-in animation. | 2 chapters: form-notifications/managing.js (2 calls) |
| `showPrompt(opts)` | ~85 (wpforms.js:402-485) | **WPFORMS-PORTABLE** | No library equivalent. Modal prompt with typewriter + OK click. | 1 chapter: form-notifications/managing.js:37 |
| `collapseBlock(blockSel)` | ~13 (wpforms.js:496-507) | **WPFORMS-PORTABLE** | No library equivalent. 4-line DOM toggle. | form-notifications/managing.js (4 calls — verified by Codex re-check) |
| `enableConditionalLogicRule(toggleWrapSel, opts)` | ~85 (wpforms.js:522-606) | **WPFORMS-PORTABLE** | No library equivalent. Injects faux CL rule row with cell-by-cell fade. | 1 chapter: form-notifications/conditional-logic.js |
| `whiteout` | ALREADY REMOVED | — | Per wpforms.js:487-488 comment. | — |
| `uniqueSelectorFor` | ALREADY REMOVED | — | Per wpforms.js:638-639 comment. | — |

**Net wpforms.js classification:** ~480 LOC WPFORMS-PORTABLE (every helper). Zero LOAD-BEARING beyond product-specific puppetry. **Production callers concentrated in `form-notifications/` (4 chapters: smart-tags, managing, conditional-logic, advanced).** If wpforms-interactions Wave 2 grows to cover form-notifications, the entire file moves; until then, it stays.

**Direct answer to Umair's "what even is `selectDropdown`?"** It is a faux-native-select overlay. WPForms ships real `<select>` elements that can't be visually animated (the browser's native dropdown popover is opaque to JS). `selectDropdown` builds a styled HTML overlay that *looks like* the native dropdown, animates the cursor through it, then sets the real `<select>.value` and dispatches `change`. The library's `setNameFormat` uses the same trick (via `_openFakeDropdown` at wpforms-interactions.js:1148). They are the same primitive at different scopes.

### engine/interactions.js — 327 LOC

| Export | LOC | Class | Replacement | Production callers (grep) |
|---|---|---|---|---|
| `focusOn(sel, opts)` | ~17 (interactions.js:58-74) | **LOAD-BEARING** for engine path | No library equivalent. Semantic camera helper used by `runtime/chapter-runner.js:222` per step + threaded into player.js ctx. The "fill" math (level computed from element rect) doesn't exist in single-HTML. | Via player.js ctx + chapter-runner.js step loop |
| `installMacCursor()` | ~12 (interactions.js:80-91) | **LOAD-BEARING** for engine path | Swaps the engine's default cursor SVG. The `Cursor` class in motion-primitives has its own SVG; conceptually equivalent. | bootSnapshot + swapSnapshot |
| `cursor` (rich facade — clickOn/parkAt/parkNearest/glideTo/clickOn/hoverOn/typeInto/dragFromTo/toggle/highlightAt) | ~190 (interactions.js:166-327) | **REPLACED in principle, blocked by migration** | `Cursor` class (motion-primitives, ready) covers glide/click/hover/drag. But: rich-cursor's clickOn/toggle do magnetic-pull + ripple + post-click hold + overlay-coupled label timing. Production uses these features. Migration is non-trivial — would need to expand Cursor class OR add a wrapper. | 104 cursor.* call sites |
| `ANCHORS` map (parking spots) | ~15 | **LOAD-BEARING** for engine path | `parkAt('off-right')` parks cursor in iframe-coord space. Library Cursor uses stage coords; no anchor concept. | parkAt + parkNearest |

**Net interactions.js classification:** ~230 LOC LOAD-BEARING (focusOn + installMacCursor + ANCHORS + the cursor facade verbs not yet ported); ~90 LOC could-be-REPLACED once Cursor class is wrapped to provide the semantic verbs.

### engine/overlays-layer.js — 210 LOC

| Export | LOC | Class | Replacement | Production callers (grep) |
|---|---|---|---|---|
| `installOverlayStyles()` + `cssFromConfig()` | ~100 (overlays-layer.js:21-134) | **LOAD-BEARING** for engine path | Config-driven CSS for `.hl` / `.cursor-ripple` / `.pointer-label` / `.label`. Single-HTML videos inline their own styles. | Called from `runtime/player.js`, `runtime/chapter-runner.js`, `runtime/scene-helpers.js` — multiple touchpoints. |
| `animateLabelWriteOn` | ~20 | **LOAD-BEARING** | Per-char label write-on stagger. Coupled to `engineHighlight`. | Called from `showHighlight` |
| `showHighlight` / `hideHighlight` / `showInstruction` / `hideInstruction` / `ripple` | ~90 | **LOAD-BEARING** for engine path | Wrappers around engine's `highlight` / `pointer` / `clearHighlights`. | Used by interactions.js + scene-helpers (toast) |

**Net:** All LOAD-BEARING for engine path. Replaceable only if engine.highlight + engine.pointer get replaced first.

### runtime/player.js — 752 LOC

| Section | LOC | Class | Replacement | Production usage |
|---|---|---|---|---|
| Stylesheet + chrome mount (`ensurePlayerStylesheet`, `mountStageChrome`) | ~30 | **LOAD-BEARING** | Mac-frame + title-bar chrome. Single-HTML reinvents it per video. | Always |
| `mountCover` / `dropCover` (player-local) | ~12 (player.js:80-92) | **DEDUPE CANDIDATE** | Triplicate copy with `runtime/transitions.js:110-129`, `runtime/scene-helpers.js:166-182`, `scenes/shared.js:140-152`. Track 1 #4. | All cover-using paths |
| `waitForStartClick` / `exitStartGate` | ~13 | **LOAD-BEARING** | Start gate. Single-HTML videos use their own. | Always |
| `transitionSnapshots` | ~80 (player.js:108-182) | **LOAD-BEARING** | The body-wipe-and-swap orchestration. Contains an unreachable legacy paper-cover branch (lines 167-181, Track 1 finding). | Snapshot-changing chapters |
| `typeWithSfx` | ~12 | **LOAD-BEARING** | Type with input-event SFX. | All `type` ctx in chapters |
| `BASE_CTX_FACTORY` / `wrapBeats` | ~30 | **LOAD-BEARING** | Threads engine + wpforms + library helpers into chapter ctx. Centralizes imports so chapter modules don't import directly. | All modes |
| `makeWaitAt(audio)` | ~14 (player.js:230-243) | **DUPLICATE** of `scenes/shared.js#waitForAudioAt` | Track 1 finding. Dual timeupdate + setInterval polling. | `audio-cued` mode (1 chapter) |
| `runBeatsPerNarration` | ~44 (player.js:250-293) | **LOAD-BEARING** | Per-beat narration runner. ~23 production chapters use `per-beat-narration` mode. Body is structurally identical to `scenes/shared.js#runBeatsSequential` (the dead one); only this copy is live. | 23 chapters |
| `runChapter(chapterModule, opts)` — mode dispatch | ~95 (player.js:298-389) | **PARTLY-LOAD-BEARING** | 4 modes (parallel/audio-cued/editorial/per-beat-narration). audio-cued has **1 chapter** (form-notifications/smart-tags.js). | parallel: 25 chapters; per-beat-narration: 23; editorial: 9; audio-cued: 1 |
| `loadTeaser` (dup of chapter-runner.js's) | ~6 | **DEDUPE CANDIDATE** | Track 1 #3. | Teasers (rare) |
| `playVideo(slug)` — main orchestration | ~310 (player.js:403-711) | **LOAD-BEARING** | Manifest fetch → start gate → BGM → intro → postIntro → teaser → chapter loop → outro. Half is duplicated with chapter-runner.js (Track 1 #3). The non-duplicated half is real product orchestration. | All manifest videos that aren't all-descriptor |
| `awaitPostIntroReady` | ~22 (player.js:724-745) | **DUPLICATE** of chapter-runner.js:43-64 (byte-identical) | Track 1 #2. | postIntro |
| `findFirstSnapshot` | ~5 | **LOAD-BEARING** | Trivial. | Always |

**Net player.js classification:** ~600 LOC LOAD-BEARING; ~150 LOC duplicated with chapter-runner.js (extractable per Track 1 #3); ~12 LOC dead legacy paper-cover branch; 1 chapter's worth of `audio-cued` machinery would be deletable if `form-notifications/smart-tags.js` migrates to `per-beat-narration` + manual `waitAt`.

### runtime/chapter-runner.js — 527 LOC

| Section | LOC | Class | Replacement | Production usage |
|---|---|---|---|---|
| `awaitPostIntroReady` | ~22 (43-64) | **DUPLICATE** of player.js | Extractable | postIntro |
| `loadTeaser` | ~5 (66-70) | **DUPLICATE** of player.js | Extractable | Teasers |
| `createSilentHud` | ~11 (74-84) | **LOAD-BEARING** | Recording-mode silent HUD | hud:false manifests |
| `runChapters(descriptors, opts)` — main descriptor loop | ~190 (94-286) | **LOAD-BEARING** for descriptor path | Walks descriptor steps + camera continuity + per-step narration. Used by 13 production chapters in 2 videos. | 13 chapters (creating-first-form, a-complete-guide-to-the-checkboxes-field) |
| `runSolo(descriptor, opts)` | ~17 (294-310) | **LOAD-BEARING** | Authoring path: `authoring/runner.html?video=&chapter=` | Authoring |
| `runChain(descriptors, opts)` — chain-mode entry | ~205 (320-527) | **LOAD-BEARING** for descriptor path | Production entry for descriptor-mode videos. Heavy duplication with player.js intro/postIntro/teaser/outro blocks. | 2 videos route through this |

**Net chapter-runner.js classification:** ~250 LOC LOAD-BEARING (the actual step-walking + verb dispatch); ~200 LOC duplicated with player.js. The descriptor-mode question is the design question: **keep 4-mode dispatch (parallel + per-beat-narration + editorial + audio-cued + descriptor) or consolidate?** With descriptor mode at 2 videos and `audio-cued` at 1 chapter, both are candidates for deprecation review.

### runtime/transitions.js — 272 LOC

Per manifest+chapter grep (`videos/**/manifest.json` + `videos/**/chapters/*.js`):

| Style | Class | Production manifest usage | Production chapter-export usage |
|---|---|---|---|
| `dolly` (chapter break) | **DEAD as default** | 0 manifests | 0 chapters | (Runtime fallback when no override given; per-chapter `breakStyle` is always explicitly set in the 12+ production videos that use breakStyle.) |
| `soft-dolly` (chapter break) | **LOAD-BEARING** | 2 manifests | ~11 chapters (build-forms-faster scenes) |
| `whip` (chapter break) | **LOAD-BEARING** | 0 manifests | 1 chapter (klaviyo-addon-intro/04-payoff.js) |
| `hold` (chapter break) | **LOAD-BEARING** | 1 manifest (wpf-ai-55) | 1 chapter (scene-4-burst.js) |
| `glide` (chapter break) | **LOAD-BEARING** | 5 manifests | ~17 chapters across rest-api, form-entries-guide, klaviyo, make-field-required, build-forms-faster |
| `cover` (swap) | **LOAD-BEARING** | 1 manifest (stage-5-transition-lab — explicit lab) | ~4 chapters (build-forms-faster scenes 7/8/9/10, generate-choices) |
| `fast` (swap) | **LOAD-BEARING** | 1 manifest (wpf-ai-55) | 4 chapters (build-forms-faster scenes 1/2/3/4) |
| `whip` (swap) | **DEAD** | 0 manifests | 0 chapters |
| `push` (swap) | **DEAD** | 0 manifests | 0 chapters |
| `morph` (swap) | **LOAD-BEARING** | 2 manifests (build-forms-faster, checkboxes) | 3 chapters (postintro-mission-control, prompt-form, generate-with-ai) |
| `flipBridge` (swap) | **LOAD-BEARING** | 5 manifests + as runtime default | Many chapters |

**Net transitions.js classification:** ~30 LOC DEAD (`whip` swap function transitions.js:183-205 + `push` swap function transitions.js:209-220 + the 4-style registry entries `whip:`/`push:` + the 9-line block-comment at top); ~25 LOC unreachable legacy paper-cover branch in player.js. **DELETE these now — zero production callers verified by grep.**

### runtime/frame-driver.js — 129 LOC

**LOAD-BEARING** as a whole. Drives camera animations and registered timelines. Required for scrubber + `--seek` mode. Single-HTML videos that want scrub-and-play need this OR a re-implementation. Per Track 1 the only optimization is per-frame timer-object allocation (frame-driver.js:42-49) — minor GC pressure. No deletion candidates.

### runtime/frame-adapter.js — 74 LOC

**LOAD-BEARING.** GSAP-timeline adapter + WAAPI adapter for the frame-driver. Both adapters are live (used by `videos/_shared/kit.js#registerTimeline` and `runtime/cinematic-kit/*`). No deletion candidates.

### runtime/pause-manager.js — 205 LOC

**LOAD-BEARING.** Owns global pause/resume + chapter-seek + audio + CSS animation freeze. Real product machinery — no library equivalent. Single-HTML editorial videos that want pause/scrub re-implement a subset of this themselves. Keep.

### runtime/dom-prep.js + runtime/prep-ops.js — 669 + 334 = 1,003 LOC

| Function | LOC | Class | Replacement | Production callers (grep) |
|---|---|---|---|---|
| `applyDefaultForm` | ~60 | **WPFORMS-PORTABLE** | Setup helper for builder canvas. Could move to `wpforms-interactions.js` as `applyFormProfile` extension. | 12 chapters in 2 videos (cff + checkboxes) |
| `removeAdminBar` / `removeBuilderCruft` | ~40 | **WPFORMS-PORTABLE** | Snapshot sanitization. Already moved to `sanitize/<slug>.js` for per-snapshot specificity; these generic versions could fold there. | Via applyDefaultForm + direct call |
| `hideFields` / `setFieldLabel` / `setChoiceLabels` / `setCheckedChoices` / `setFormName` / `activateFieldOptionGroup` / `setChoiceLayout` / `applyIconChoicesV2` / `applyImageChoices` / `setHideLabel` / `setRequired` / `stripQuizEnabled` | ~400 combined | **WPFORMS-PORTABLE** | All are WPForms-state vocabulary for the static snapshot. wpforms-interactions has `setFieldLabel` / `toggleEmailConfirmation` / `setNameFormat` — different scopes, same idea. Wave N candidate. | 38 op invocations across 9 chapter files (same 2 videos) |
| `applyIconChoices` (deprecated) | ALREADY GATED | — | Per Codex verification: safe to delete (Phase 5c.1 target #9). Has 0 production callers; only validator + prep-ops registry references. | — |
| `harvestField` / `injectField` (deprecated) | ALREADY GATED | — | Per Codex: safe to delete (targets #10, #11). 0 production callers. | — |
| `patchFontAwesome6Aliasing` | 56 (dom-prep.js:267-322) | **PER-SNAPSHOT FIXUP** | Belongs in `sanitize/<snapshot>.js` per Track 1. | Internal-only |
| `prep-ops.js` op registry | 334 | **WPFORMS-PORTABLE** | The declarative `prep: [{ op: ... }]` vocabulary used by descriptor mode. If descriptor mode dies, this dies too. | 38 op invocations in 9 chapter files |

**Net dom-prep.js + prep-ops.js classification:** ~900 LOC WPFORMS-PORTABLE (all helpers); ~130 LOC DEAD (deprecated applyIconChoices + harvestField/injectField + their validator/registry plumbing per Codex). **Production usage concentrates in the 2 descriptor-mode videos.** If those videos migrate away from descriptor mode, this entire file pair becomes deletable. Otherwise, it's a port-to-wpforms-interactions Wave 3 candidate.

### runtime/scene-helpers.js — 583 LOC

| Function | LOC | Class | Notes |
|---|---|---|---|
| `iframeDoc` / `installFlashGuard` / `removeFlashGuard` / `suppressAnchorNav` | ~30 | **LOAD-BEARING** | Flash-guard idiom survives body-wipe. Real product fix. |
| `mountStageChrome` | ~20 | **DEDUPE CANDIDATE** with player.js's | Same content. |
| `setWatermarkEnabled` / `unmountWatermark` | ~10 | **LOAD-BEARING** | Flag-driven watermark. |
| `preloadSnapshot` / `commitPreloadedSnapshot` | ~50 | **LOAD-BEARING** | flipBridge machinery. Default swap style. |
| `mountCover` / `dropCover` | ~15 | **DEDUPE CANDIDATE** — fourth copy | |
| `waitForStartClick` | ~17 | **DEDUPE CANDIDATE** with player.js's | |
| `createHud` | ~70 | **LOAD-BEARING** | Descriptor-mode HUD checklist. |
| `errorReport` + `bugReportReplacer` | ~80 | **LOAD-BEARING** | Real product bug-report machinery. |
| `resolveOrThrow` | ~12 | **LOAD-BEARING** | |
| `bootSnapshot` / `swapSnapshot` | ~60 | **LOAD-BEARING** | Engine path entry points. |
| `applySearchFilter` / `activateSection` / `activatePanel` | ~90 (scene-helpers.js:444-527) | **WPFORMS-PORTABLE** | WPForms class-name knowledge. Track 1 #6: belongs in `engine/wpforms.js` thematically. |
| `mountToast` | ~40 | **LOAD-BEARING** | Descriptor `toast` verb. |
| `signalChapterDone` / `signalChapterFailed` | ~10 | **LOAD-BEARING** | Chain-mode listener. |

**Net:** ~470 LOC LOAD-BEARING; ~90 LOC WPFORMS-PORTABLE (move to engine/wpforms.js or eventual wpforms-interactions Wave); ~50 LOC dedup-with-other-mount-cover-copies.

### runtime/title-card.js — 643 LOC

**LOAD-BEARING.** Per Track 1: 3 variants (default + sullie-system + editorial-v4) all have production consumers. Recommendation per Track 1 was just to wrap `startDust` in `pausableRaf` and vendor Google Fonts. No deletion candidates.

### runtime/shared-scene.js — 36 LOC

**LOAD-BEARING.** Used by 3D/Three.js cinematics (rest-api wireframe burst).

### runtime/camera-poses.js — 27 LOC

**REPLACEABLE.** Production-live via `videos/_shared/kit.js` re-export → `videos/make-field-required/chapters/*.js` (3 chapters). Per Codex's verification this is the only consumer. **The 3 chapters could pass inline camera objects** (per Phase 1 of any slimming sequence). Per Track 1 audit doc this module is "0 production callers as of audit" — that was a known error caught by Codex.

### runtime/verbs.js — 1,047 LOC

**LOAD-BEARING for descriptor path.** Verb dispatcher for descriptor mode. 13 production chapters use it. If descriptor mode is deprecated, this dies — but that's a 2-video decision.

### runtime/drag.js — 257 LOC

**LOAD-BEARING for descriptor path** + indirectly used by interactions/cursor.dragFromTo and wpforms-interactions.js#dragFieldToForm (Wave 1, DRAFT). The `inlineTreeStyles` + ghost-clone pattern is what makes drags read as real WPForms drags. Library wpforms-interactions#dragFieldToForm reimplements this inline — eventually consolidate.

### scenes/player.html — 96 LOC

**LOAD-BEARING.** Boot dispatcher. Routes all-descriptor to runChain, mode-based to playVideo. Per Track 1: QC chapter-scope filter (lines 50-61) is duplicated with player.js:443-455.

### scenes/shared.js — 276 LOC

| Section | Class | Notes |
|---|---|---|
| Narration/BGM helpers (`setNarrationBase`/`startBGM`/`stopBGM`/`playNarration`) | **LOAD-BEARING** | Real product audio. Used by every video. |
| `mountMeshBg` / `mountWatermark` | **LOAD-BEARING** | Used by player.js + scene-helpers.js. |
| `waitForStart` / `mountCover` / `dropCover` / `loadSnapshot` wrapper | **DEAD or DUPLICATE** | Per Track 1 #4 + #6. ~30 LOC. |
| `runBeatsAtTimes` | **DEAD** in `videos/**` per Codex (target #12) | Used only by `scenes/chapters/fields.html` legacy single-page scene. **NEEDS USER DECISION**. |
| `runBeatsSequential` | **DEAD** in `videos/**` per Codex (target #13) | Used only by legacy `scenes/chapters/*.html` + `scenes/notifications-combined*.html`. **NEEDS USER DECISION**. |

### scenes/shared.css — 71 LOC

**LOAD-BEARING.** Mesh-bg + watermark + grain styles. Per Track 1: blob animations aren't pause-aware; minor concern.

---

## Section 3 — Recommended slimming sequence (ordered, low-risk first)

Each step lists files touched + expected LOC reduction + risk. **Steps 1–3 are safe today.** Steps 4+ are blocked on library QC or new library work.

### Step 1 — Delete dead transition styles (low risk, ~50 LOC)

- **`runtime/transitions.js` — delete `swapWhip` (lines 183-205) + `swapPush` (lines 209-220) + registry entries.** Verified zero production callers via `swapStyle.{0,5}['"](whip|push)['"]` grep across `videos/**/manifest.json` and `videos/**/chapters/*.js`.
- **`runtime/transitions.js` — delete or simplify the 9-line block-comment at lines 97-105.** Earned its keep when flipBridge was new; reads as redundant now.
- **`runtime/player.js` — delete the unreachable legacy paper-cover branch (lines 167-181 + comment at lines 109-114).** Track 1 finding; comment says it's unreachable since flipBridge became default.
- LOC reduction: ~50

### Step 2 — Delete dead deprecated dom-prep helpers (low risk, ~150 LOC) — per Codex's deletion order

Already verified safe by Codex's verification pass:

1. **`runtime/dom-prep.js:356-372`** — deprecated `applyIconChoices` (use `applyIconChoicesV2`).
2. **`runtime/prep-ops.js:17` + `:196-207`** — registry entry for deprecated `applyIconChoices`.
3. **`tools/validate-video.js:159-167`** — validator schema for deprecated `applyIconChoices`.
4. **`runtime/dom-prep.js:625-669`** — `harvestField` + `injectField` (both deprecated, 0 callers).
5. **`runtime/verbs.js:20` + `:335-341` + `:1014`** — `injectField` verb plumbing.
6. **`tools/validate-video.js:528-534`** — `injectField` validator entry.

LOC reduction: ~150

### Step 3 — Honor or drop the `easing` parameter (low risk, ~5 LOC) — Track 1 #6

`engine/engine.js#applyCamera` and `setCameraTransform` accept `easing` but `easeProgress` is hardcoded (engine.js:40-42). Either:
- Drop the param (zero-risk; current behavior unchanged), or
- Thread `easing` through (behavior change — chapters passing custom easing might subtly speed up/slow down).

Recommend **drop**. Quick win, removes a silent-override bug.

### Step 4 — Extract player ↔ chapter-runner shared orchestrator (~300 LOC saved net) — Track 1 #3

Move `awaitPostIntroReady`, intro card mount, postIntro playback, teaser handoff, outro choreography, URL overrides, `loadTeaser`, and `mountCover`/`dropCover` into a new `runtime/orchestrator.js` (or expand `scene-helpers.js`). Both player.js and chapter-runner.js shrink by ~150 LOC each. **Medium risk** — both runners ship videos; behavior delta in shared code could regress one path.

**Mitigation:** smoke-test the 2 winners after each move. Per `docs/editorial-direction-audit-2026-05-10.md` Phase 6.

### Step 5 — Wait for `wpforms-interactions.js` Wave 1 QC sign-off

Hard blocker. Until all 8 Wave 1 interactions move from `draft — needs QC` to `ready — approved`, no production migration can start.

**Recommendation to Umair:** QC the 8 Wave 1 demos at `videos/_qc-interactions/index.html`. They are:

- `navAddNewForm()`, `selectTemplate(slug)`, `navWPFormsSidebarMenu(item)`, `openFormInList(formId)` (admin-side)
- `dragFieldToForm(fieldSlug)`, `openFieldOptions(fieldId)`, `navBuilderSidebar(section)`, `openSettingsTab(tab)` (builder-side)

Plus: `popOut` in motion-primitives is the one remaining draft primitive (per `videos/_qc-primitives/index.html`). QC that too — `popOut` is consumed by `runtime/drag.js#dragField` + 7 production chapters.

### Step 6 — Build wpforms-interactions Wave 2 (form-notifications scope, ~6 weeks of authoring)

Add to `wpforms-interactions.js` (the gap engine/wpforms.js fills today):

- `setupNotificationPanel({ N })` — analog of `applyDefaultForm`, sets up the panel
- `insertSmartTag(fieldSel, { type, label/value })` — analog of `smartTag` (~80 engine LOC port)
- `selectEmailTemplate(value)` — analog of `selectDropdown` for the Email Template field
- `toggleField(fieldWrapSel, state)` — analog of `toggleControl`
- `duplicateNotification(blockSel, opts)` — analog of `duplicateBlock`
- `collapseNotification(blockSel)` / `setNotificationActive(blockSel, state)` — analogs of `collapseBlock` / `toggleBlockActive`
- `enableConditionalRule(toggleWrapSel, { rule })` — analog of `enableConditionalLogicRule`
- `expandSettingsSection(groupSel)` — analog of `revealSection`
- `wpformsPrompt({ title, placeholder, typeText })` — analog of `showPrompt`

Estimated cost: ~600 LOC of library code + 9 QC pages. Once approved, `engine/wpforms.js` becomes deletable.

### Step 7 — Migrate `form-notifications/` chapters off `engine/wpforms.js` (4 chapters)

Once Wave 2 lands and is approved:
- `chapters/smart-tags.js` — uses `smartTag`, `cursor.*`, `spotlight`, `pointer`, `highlight`
- `chapters/managing.js` — uses `collapseBlock` (×4), `duplicateBlock` (×2), `showPrompt`, `toggleBlockActive`, `pointer`, `highlight`
- `chapters/conditional-logic.js` — uses `enableConditionalLogicRule`, `pointer`, `highlight`
- `chapters/advanced.js` — uses `revealSection`, `toggleControl` (×2), `selectDropdown`, `spotlight`, `pointer`, `highlight`

This is also where `engine/engine.js#pointer` and `engine/engine.js#spotlight` get retired — they exist only because form-notifications uses them.

**Risk:** medium. 4 chapters, ~600 LOC of chapter code touched. Visual regressions possible. Per CLAUDE.md "wpforms-motion-audit" gate.

### Step 8 — Delete `engine/wpforms.js`, `engine/engine.js#pointer`, `engine/engine.js#spotlight` (~750 LOC)

After step 7. Net deletion: ~640 LOC (wpforms.js) + ~120 LOC (pointer + spotlight) = ~760 LOC.

### Step 9 — Migrate `make-field-required/` from string camera poses to inline (3 chapters, ~10 LOC of chapter changes)

Then delete `runtime/camera-poses.js` (27 LOC) + the 8 LOC integration in player.js (`resolveCameraPose` import + 2 call sites).

LOC reduction: ~35

### Step 10 — Cursor migration (heavy lift, ~104 cursor.* sites across 30 chapters)

Build an adapter (`videos/_shared/legacy-cursor-adapter.js`) that exposes the rich-cursor API (clickOn / glideTo / parkAt / parkNearest / typeInto / hoverOn / dragFromTo / toggle / highlightAt) on top of the `Cursor` class. Once adapter exists + 30 chapters migrate to it, **delete `engine/engine.js#cursor` (~65 LOC) + `engine/interactions.js#cursor` facade (~190 LOC)**. Total ~255 LOC after migration, but the migration itself touches 30 chapter files.

### Step 11 — Migrate `applyDefaultForm` + state vocabulary into wpforms-interactions (Wave 3)

The 2 descriptor-mode videos (`creating-first-form`, `a-complete-guide-to-the-checkboxes-field`) use 38 op invocations across 9 chapters. Port the prep-ops vocabulary into wpforms-interactions setup methods. Then **delete `runtime/dom-prep.js` (669 LOC) + `runtime/prep-ops.js` (334 LOC)** = ~1,000 LOC.

This is also where descriptor mode (`defineChapter`) gets a deprecate-or-keep decision. With only 2 videos using it, deprecation is plausible.

### Step 12 — Audio-cued mode deprecation (~30 LOC)

`form-notifications/smart-tags.js` is the only production chapter on `audio-cued` mode. Migrate it to `per-beat-narration` + manual `waitAt` (already exposed via ctx in player.js#makeWaitAt) and delete the audio-cued branch in player.js#runChapter + makeWaitAt itself.

LOC reduction: ~30

### Step 13 — Delete dead legacy beat runners in scenes/shared.js (~120 LOC) — Track 1 conclusion

Only blocker: confirm `scenes/chapters/*.html` and `scenes/notifications-combined*.html` are not in production scope. If they're not, delete `runBeatsAtTimes`, `runBeatsSequential`, `waitForStart`, `mountCover`/`dropCover`, `loadSnapshot` wrapper.

LOC reduction: ~120

---

## Section 4 — What the system looks like AFTER full migration

If steps 1–13 all land successfully (multi-month):

```
engine/
  ├── engine.js          (~200 LOC — iframe stage + adoptSnapshotIframe + clearHighlights + camera math)
  ├── interactions.js    (~50 LOC  — focusOn + installMacCursor + ANCHORS)
  ├── overlays-layer.js  (~80 LOC  — installOverlayStyles only, no highlight/pointer/spotlight)
runtime/
  ├── player.js          (~400 LOC — playVideo orchestration; 350 LOC of duplicates extracted)
  ├── chapter-runner.js  (DELETED if descriptor mode deprecated; else ~330 LOC)
  ├── orchestrator.js    (~200 LOC — extracted intro/postIntro/teaser/outro/URL overrides)
  ├── transitions.js     (~220 LOC — flipBridge + cover + fast + morph + glide/soft-dolly/whip/hold)
  ├── frame-driver.js    (129 LOC, unchanged)
  ├── frame-adapter.js   (74 LOC, unchanged)
  ├── pause-manager.js   (205 LOC, unchanged)
  ├── scene-helpers.js   (~470 LOC — WPForms-specific helpers moved to wpforms-interactions)
  ├── title-card.js      (643 LOC, unchanged)
  ├── shared-scene.js    (36 LOC, unchanged)
  ├── verbs.js           (DELETED if descriptor mode deprecated; else 1,047)
  ├── drag.js            (DELETED — fully ported into wpforms-interactions; else 257)
  ├── dom-prep.js        (DELETED — ported to wpforms-interactions setup methods)
  ├── prep-ops.js        (DELETED — descriptor mode artifact)
  ├── camera-poses.js    (DELETED — inline poses)
scenes/
  ├── player.html        (~80 LOC — simpler boot dispatcher)
  ├── shared.js          (~150 LOC — narration/BGM/mesh-bg/watermark only)
  └── shared.css         (71 LOC, unchanged)
videos/_shared/
  ├── motion-primitives.js  (1,212 LOC — unchanged or grown)
  ├── wpforms-interactions.js (~2,200 LOC — Wave 1 + 2 + 3 combined)
  └── kit.js (444 LOC, unchanged)
```

**Total in-scope LOC after migration:** ~3,500 LOC (engine + runtime + scenes), down from 7,834.

**Net LOC reduction:** ~4,300 LOC.

**What stays:** iframe stage + camera math (engine.js core); flipBridge swap; narration + BGM + watermark; postIntro/teaser/outro orchestration; frame-driver + pause-manager (scrubber parity); title-card + cinematic-runner.

**What changes shape:** player.js shrinks to ~400 LOC (orchestrator extracted); chapter-runner.js either deletes or stays at ~300 LOC depending on descriptor-mode decision; transitions.js loses the dead styles.

**What disappears:** engine/wpforms.js; engine.pointer + spotlight + cursor + type + runScene; runtime/dom-prep.js + prep-ops.js + camera-poses.js; legacy beat runners in scenes/shared.js; potentially runtime/verbs.js + drag.js + chapter-runner.js if descriptor mode is deprecated.

**Honest caveat:** the "after" tree assumes Wave 2 + Wave 3 of wpforms-interactions exist and are approved. They don't yet. The migration is real but multi-month.

---

## Section 5 — Migration risk inventory

| Step | Risk | What breaks | Mitigation |
|---|---|---|---|
| 1 — Delete dead transition styles | Low | Out-of-tree `?swapStyle=whip` URLs would 404 → fallback to `cover`. | Default fallback already exists in runSwapTransition. |
| 2 — Delete dead deprecated dom-prep | Low | Any out-of-tree chapter calling deprecated `applyIconChoices` or `do: 'injectField'`. Codex verified zero in-tree callers. | Validator already gates `injectField` as deprecated. |
| 3 — Drop `easing` param | Low | Chapters passing custom easing values silently behave same as today (the values are already ignored). | None needed. |
| 4 — Extract orchestrator | Medium | Subtle behavior delta in cover-z-index / BGM-fade-on-postIntro / postIntro flash-guard timing could regress either path. | Phase in one duplicate at a time; smoke-test 2 winners after each. |
| 5 — Wave 1 QC | Low | Library may need fixes per Umair's QC feedback. | That's what QC is for. |
| 6 — Build Wave 2 | Medium | 600 LOC of new library code + 9 QC pages. Has to match the visual fidelity of the existing engine.wpforms helpers. | Authoring time is non-trivial; each new method needs its own QC page. |
| 7 — Migrate form-notifications | High | 4 production chapters, ~600 LOC of chapter code. Visual regressions possible. Cursor-on-iframe-coord vs Cursor-on-stage-coord could miss targets. | wpforms-motion-audit gate; smoke-test; per-chapter visual QC by Umair (5-second rule per memory: feedback_visual_qc_split). |
| 8 — Delete engine/wpforms.js + pointer + spotlight | Low (after step 7) | None if step 7 is done. | Post-deletion smoke. |
| 9 — Camera-poses migration | Low | 3 chapters in `make-field-required` need ~10 LOC of changes (string → inline). | Trivial. |
| 10 — Cursor migration | High | 30 chapters, 104 sites. Adapter must preserve semantics exactly (magnetic-pull, ripple, post-click hold, anchor-nav suppression). | Build adapter first; migrate one chapter at a time; smoke-test winners after each. |
| 11 — dom-prep/prep-ops migration | High | 2 videos with 38 op invocations. State vocabulary needs full port. Possible descriptor-mode deprecation. | Wave 3 work; per-video migration; per-chapter visual QC. |
| 12 — Audio-cued deprecation | Low | 1 chapter (smart-tags.js) needs migration to per-beat-narration. The chapter is currently in form-notifications scope, which is touched by step 7 anyway. | Roll into step 7. |
| 13 — Legacy beat runners in scenes/shared.js | Low | Only `scenes/chapters/*.html` legacy single-page scenes break. **NEEDS USER DECISION**. | Confirm legacy scenes aren't in production scope. |

**Hard rule reminder (CLAUDE.md):** every step must be QC'd against the 2 winners (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`) before merging. Visual QC for changes >5s of motion goes to Umair per the memory rule.

---

## Section 6 — Open questions for Umair

1. **Wave 1 QC sign-off.** The 8 `wpforms-interactions.js` interactions are built but draft. Can you walk through `videos/_qc-interactions/index.html` and approve/red-line each? Until they're blessed, no migration can start. Same question for `popOut` in motion-primitives (last remaining draft).

2. **Wave 2 scope (form-notifications).** The biggest migration unlock is porting the 8 helpers in `engine/wpforms.js` into wpforms-interactions Wave 2. Estimated authoring cost: ~600 LOC of library code + 9 QC pages. Is this on the roadmap? If yes, when? If no, `engine/wpforms.js` stays load-bearing.

3. **Descriptor mode (defineChapter) — keep, deprecate, or delete?** Only 2 videos use it (`creating-first-form` + `a-complete-guide-to-the-checkboxes-field`, 13 chapters total). Keeping it preserves a real product feature (declarative `prep:` + `do:` verb vocabulary). Deprecating it unlocks deletion of `runtime/chapter-runner.js` (530 LOC) + `runtime/verbs.js` (1,047 LOC) + `runtime/prep-ops.js` (334 LOC) + `runtime/dom-prep.js` (669 LOC) = **~2,580 LOC**. The 2 videos would need to migrate to beats-array mode.

4. **Mode dispatch consolidation.** Player.js's `runChapter` has 4 modes (`parallel`, `per-beat-narration`, `editorial`, `audio-cued`). `audio-cued` is 1 chapter. `editorial` mode is mostly a `surface: 'editorial'` accommodation. Could the dispatch reduce to 2 modes (parallel + per-beat-narration), with editorial absorbed into per-beat? With audio-cued migrated (step 12), this is plausible.

5. **Library / runtime decoupling.** `motion-primitives.js#popOut` imports from `/runtime/pop-out.js` (`injectIframeFonts` / `inlineTreeStyles` / `stripBuilderChrome`). The single-HTML-can-drop-the-runtime framing has this leak. Should we vendor those helpers into motion-primitives, or keep the runtime dependency?

6. **`scenes/chapters/*.html` + `scenes/notifications-combined*.html` legacy pages — in scope or not?** Codex's verification flagged these as the only callers of `runBeatsAtTimes` / `runBeatsSequential`. If they're frozen legacy, we delete ~120 LOC from scenes/shared.js. If they're active, we keep.

7. **Cursor migration approach.** The 104 cursor.* call sites across 30 chapters are the single biggest blocker to deleting `engine/engine.js#cursor` (65 LOC) + `engine/interactions.js#cursor` (190 LOC). Two options: (a) build a `legacy-cursor-adapter.js` that exposes the rich-cursor API on top of the new Cursor class — chapters need only swap the import; (b) chapter-by-chapter manual migration. Option (a) is faster but leaves an adapter layer; option (b) is cleaner but slower. Which?

8. **Engine path vs single-HTML path — strategic direction.** Per `docs/winning-pattern-analysis-2026-05-10.md`, "architecture is not the variable" — both paths can produce winners. The slimming question is: are we sunsetting the engine path for new tutorial work too, or just sunsetting it for editorial work? If the engine stays for tutorials, ~3,500 LOC of "load-bearing tutorial scaffolding" stays. If everything migrates to single-HTML + libraries eventually, the slimming target is much larger but the migration cost is also much larger.

---

## Things to flag back to Umair

**Mismatches between JSDoc and code (worth fixing):**

- `engine/engine.js#applyCamera` JSDoc plumbs `easing` (line 71), but the code uses hardcoded `easeProgress`. Any chapter passing custom easing has been silently overridden since the function was written. Track 1 also flagged this.
- `engine/engine.js#zoomTo` does **three** `console.log` calls per call (lines 244, 249, 269), including a 12-key serialized object with live `getBoundingClientRect` reads at line 269. Production fires this on every camera move. Compounds across all chapters. Track 1 #2 — should be `?debug=1` gated.

**Cross-file coupling that makes clean delete impossible:**

- `engine/wpforms.js` directly imports `cursor` and `sleep` from `engine/engine.js` (line 6). Deleting the engine's cursor object would break every wpforms helper. **Order matters: cursor migration BEFORE wpforms.js port.**
- `engine/interactions.js` imports `runtime/overlays-config.js` + `engine/overlays-layer.js` (which itself imports from `engine/engine.js`). Track 1 #5 noted this as engine-reaching-into-runtime; functionally fine, but worth flagging if engine ever needs to be vendorable standalone.
- `motion-primitives.js#popOut` imports from `/runtime/pop-out.js`. Single-HTML videos can't be fully runtime-independent today.

**Gaps between primitive and engine-equivalent:**

- `Cursor.click()` does squash + ripple. `engine.cursor.click({ effect })` ALSO supports `effect.remove` (animate-and-remove a DOM node) and `effect.toggleClass`. **The library version lacks the effect parameter.** Engine version has more features. Gap to fill before deletion.
- `caretType` writes to `el.innerHTML`. `engine.type` writes to `el.value` for inputs/textarea and dispatches synthetic `input` events on `state.doc.defaultView`. **The library can't drive real WPForms `<input>` fields** that have live JS listeners. For chapters that need real-form-input simulation, engine.type is still required.
- `Cursor.glide` doesn't have `via` (waypoint) support. Production chapters use `cursor.glideTo(sel, { via: { x, y } })` for curved arcs (Phase 1 reading notes §A3 — winning-pattern requirement). The library Cursor would need a `via` parameter.
- `IframeManager` (wpforms-interactions) uses a stage-slot model with `transform: scale()` and `viewport: {1280, 720}`. Engine's `loadSnapshot` uses a body-wipe with `iframeSize: [1440, 900]` and a `.stage` container. **These are not interchangeable — coordinates and stage chrome are different.** Migrating from one to the other is a per-video rewrite.

**Minimum viable engine estimate (honest):**

Production has 2 categories of winners: editorial single-HTML (`wpforms-ai-prompt-open` shape — already runtime-independent) and tutorial manifest+chapters (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished` shapes — heavy runtime users). For the tutorial winners to keep running:

- **Cannot delete without rewrite:** loadSnapshot + camera math + frame-driver + pause-manager + transitions (most) + title-card + cinematic-runner + scene-helpers (most) + narration loader. ~3,000 LOC.
- **Could delete after Wave 2 + 3 + cursor migration:** engine/wpforms.js + dom-prep + prep-ops + chapter-runner (if descriptor mode deprecated) + camera-poses + engine.pointer + engine.spotlight + engine.cursor + most of overlays-layer. ~3,500 LOC.

That's the realistic split.

---

**Final note:** the audit's value is in being right, not in being aggressive. The engine + runtime is doing more work than Umair's "what is the purpose of engine, player core files" framing implies — but less than the team's pre-2026-05-11 instinct to treat it all as load-bearing implied. The truth is ~half-and-half. The slimming sequence above is the honest path to the smaller engine: multi-month, library-QC-gated, video-by-video. The 80% redundancy intuition is too aggressive. The "everything earns its place" instinct is too defensive. Both deserve a course-correction.
