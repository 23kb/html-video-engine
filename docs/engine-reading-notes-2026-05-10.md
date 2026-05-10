# Engine Reading Notes — 2026-05-10

**Reading-not-authoring caveat:** This audit comes from reading 4365 lines of source plus one engine-using-winner chapter. It does NOT come from authoring a video against this engine. Mechanical descriptions (what each primitive does, what arguments it takes, what it returns) are reliable. Strategic recommendations (use engine vs bypass, primitive X is awkward, primitive Y is essential) lean on observed code patterns and `docs/winning-pattern-analysis-2026-05-10.md` — they're not lived authoring intuition. Treat strategic claims with that lens; defer to Umair where his authoring history disagrees.

## Executive summary

The engine is a **WPForms-specific tutorial scaffold**, not a general motion engine. Its core job is reducing two large costs: (1) framing real captured WPForms HTML as a believable product UI (camera + cursor + overlay + iframe puppetry), and (2) keeping multi-chapter tutorials internally consistent (camera state across chapter boundaries, narration timing, snapshot swaps without flash). Roughly: `engine/engine.js` (749 lines) gives you an iframe stage + camera + cursor + highlight/label overlays. `engine/wpforms.js` (698 lines) is product-shaped DOM puppetry — toggles, smart tags, dropdowns, prompts, conditional-logic rule rows — that fakes the visual result of WPForms interactions without running the live plugin JS. `runtime/dom-prep.js` + `runtime/prep-ops.js` (1003 lines) sanitize the captured snapshot into a clean canvas (strip admin bar, keep three default fields, rename "Master Form"). `runtime/chapter-runner.js` + `runtime/player.js` (1279 lines) handle orchestration: intro → postIntro → teaser → chapters → outro, narration bound to beats, snapshot swaps, transitions, watermark.

**When the engine helps:** when the video shows the real WPForms builder doing something the user could reproduce. The whole iframe-puppetry stack pays off here — `applyDefaultForm` is used in 14 chapters across 2 videos (creating-first-form, a-complete-guide-to-the-checkboxes-field), `revealSection`/`toggleControl`/`smartTag`/`enableConditionalLogicRule` are used 20 times across 2 chapters of `form-notifications`. `cursor.*` calls show up in 169 places across 54 chapter files. That's the engine earning its keep.

**When bypassing pays:** when the video is editorial — abstract, expressive, atmospheric, or a single morphing host element. The engine offers nothing useful for "morph a button into a chat panel over 12s" (that's `wpforms-ai-prompt-open`, a single-HTML winner). The iframe is dead weight if there's no real product UI on screen, and the chapter-runner's HUD/cover/watermark/start-gate add ceremony you don't want for a 30s ad. The three failed editorial bypasses are not evidence the engine should be used for editorial — Agent B's analysis (§A1, §A2) shows the failures shared *content* and *discipline* problems with the bypass HTML, not architecture problems.

## Per-primitive reference

### `loadSnapshot(slug, { iframeSize })` — engine/engine.js:90-168

- **Signature:** async; takes a snapshot slug, optional `iframeSize: [W, H]` (default 1440x900). Returns a Promise that resolves on iframe load.
- **What it does:** Body-wipes the page, injects a `.stage > iframe.ui + .overlay` scaffold, sets pointer to `/snapshots/<slug>/index.html`, waits for the iframe load event, then primes `state.doc` and the camera driver. The body-wipe is total — every helper that survives the wipe (flash-guard, overlay layer, watermark) has to re-mount in the post-load step. CSS is inlined inside the body-wipe, including the cursor SVG, highlight/label/pointer styles, debug-rect class, and four bouncing pointer keyframes.
- **What state it touches:** `document.body.innerHTML`, the engine's `state` singleton (ui, stage, overlay, cursorEl, doc, camera origin), and the global frame-driver registry (registers a 60-min camera driver via `ensureCameraDriver`).
- **Used by:** Engine path goes through `scenes/shared.js`'s wrapper, then `runtime/scene-helpers.js#bootSnapshot` and `runtime/player.js`. Direct chapter-side imports: zero — chapters never call this themselves; the runner calls it for them. 61 textual occurrences across the repo, mostly in runtime/scene plumbing and legacy single-file `scenes/chapters/*.html` (which are the old pre-engine pattern).
- **Bypassable?** Yes if you don't want the iframe stage at all. The function IS the iframe stage — you cannot get camera/cursor/overlay primitives without it. For editorial work that has no captured snapshot to show, you'd skip it entirely.
- **Editorial fit:** Irrelevant unless the editorial piece needs to land on a real builder snapshot at the end. Note `surface: 'editorial'` in 7 manifests bypasses iframe boot in `runtime/chapter-runner.js:147-150` (`if (!currentSnapshot && surface === 'editorial') { currentSnapshot = desc.snapshot; ... }`) — the engine already knows editorial chapters don't want a snapshot mounted.

### `zoomTo(targets, { level, pad, smooth, noScroll, scrollBehavior, duration, easing })` — engine/engine.js:242-283

- **Signature:** async; `targets` is an array of CSS selectors resolved inside the iframe doc. Returns `{ rect, hits }`.
- **What it does:** Resolves selectors against the iframe doc, scrolls the first match into the iframe viewport (instant or smooth), measures the union rect, computes a clamped center so the zoom doesn't reveal off-canvas, applies `scale(level) translate(...)` to the iframe element, and sleeps for the transition. Has explicit clamping (lines 262-263) so high-zoom moves don't expose the dark backdrop. Uses the registered camera driver for seek-mode parity.
- **What state it touches:** `iframe.style.transform`, engine `state.zoom/tx/ty`, `cameraAnimation`. Reads `state.doc` for selector resolution.
- **Used by:** 64 textual occurrences (most in `runtime/`, `engine/`, the old `scenes/notifications-combined*.html`). In production chapter files, `zoomTo` shows up directly when an effect needs a non-default duration override — `scene-2-add-new.js:160` (`zoomTo([sel.generateCard], { level: 1.4, pad: 34, noScroll: true, duration: 550 })`) is the canonical case. Most chapters use `focusOn` instead (engine/interactions.js wrapper that picks `level` and `smooth` from continuity flags).
- **Bypassable?** Yes for editorial — nothing requires zooming a transformed iframe. For tutorial chapters, you'd reinvent the rect-union + clamping math yourself, and you'd lose camera-state continuity with the rest of the engine.
- **Editorial fit:** Hurts more than helps in editorial. Editorial works better with GSAP transforms on its own DOM. `zoomTo` is iframe-coupled.

### `highlight(targets, { label, pad, fadeIn })` — engine/engine.js:289-329

- **Signature:** async; targets required (the function throws on omitted targets at line 297). Returns `{ hl, lab }` DOM nodes.
- **What it does:** Resolves selectors inside the iframe, computes union rect, draws a `.hl` div in the OUTER overlay (not the iframe) at the iframe-projected coords (using `toStage` math) with a dark `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` vignette and an animated orange ring. Optional `label` mounts a tooltip below it.
- **What state it touches:** `state.overlay.appendChild` — adds DOM nodes that `clearHighlights` removes.
- **Used by:** 22 calls across 8 chapter files. Heavy users: `form-entries-guide/entry-detail.js` (5), `klaviyo-addon-intro/01-connect.js` (3), `make-field-required/verify-preview.js` (3), `form-entries-guide/where-entries-live.js` (4), `form-entries-guide/export-entries.js` (2). Tutorial chapters lean on it; build-forms and rest-api-overview use it sparingly.
- **Bypassable?** Easily — it's a positioned div with a vignette. The non-trivial part is the iframe-coord-to-stage-coord math (`toStage` at lines 227-234), which couples to the camera transform. Outside the iframe context, drawing a ring around an element is one CSS rule.
- **Editorial fit:** Irrelevant. Editorial doesn't have a tutorial vignette aesthetic.

### `cursor` object (`park`, `moveTo`, `click`, `hide`, `dragGrab`) — engine/engine.js:480-610

- **Signature:** Methods chained off the exported `cursor` object. `moveTo` accepts a string selector (resolved inside iframe) or `{x, y}` in iframe coords. `click({ effect })` supports built-in DOM mutation effects (remove a node, toggle a class). `dragGrab(srcSel, dstSel, …)` clones the source, animates ghost from src→dst rect with `cursor.moveTo`, then drops.
- **What it does:** Translates iframe-doc coordinates to stage coordinates and animates a CSS-transitioned `<svg class="cursor">` over the overlay. The cursor is stage-layer (not iframe-layer), so it floats above the camera transform and reads naturally regardless of zoom level. `dragGrab` is a 60-line composite: phases are arrive-at-source → ghost-fade-in → glide-to-destination → drop-fade-out.
- **What state it touches:** `state.cursorEl.style.left/top` and CSS classes. `dragGrab` appends `.__drag-ghost` to `document.body` (stage-layer) and removes it after drop.
- **Used by:** 169 calls across 54 chapter files — the most-used primitive in the engine. Top users: `form-notifications/managing.js` (9), `form-notifications/smart-tags.js` (6), `build-forms-faster-with-wpforms-ai/scene-7-ai-choices.js` (7), `build-forms-faster-with-wpforms-ai/generate-choices.js` (7), `klaviyo-addon-intro/01-connect.js` (10).
- **Bypassable?** No, in practice. The mac-cursor + iframe-coord-translation + click animation + drag-ghost is non-trivial to reproduce. `runtime/player.js:13` actually uses `richCursor` from `engine/interactions.js` — the engine ships TWO cursor APIs (low-level `cursor` and semantic `richCursor` with `clickOn`/`toggle`/`parkAt`). Replacing the cursor is the highest-cost engine bypass.
- **Editorial fit:** Mostly irrelevant. Editorial videos rarely have a pointer, and when they do (e.g. `wpforms-ai-prompt-open` glow-arrow cursor) they hand-roll it because the editorial cursor is a brand element, not a generic mac arrow.

### `type(target, text, { cps, clear })` — engine/engine.js:613-631

- **Signature:** async; target is a CSS selector inside the iframe. `cps` characters per second, default 14.
- **What it does:** Resolves element, optionally clears, then loops appending one character at a time, dispatching an `input` event on real form inputs so WPForms's hidden listeners (still alive in the captured DOM) react.
- **What state it touches:** `el.value` or `el.appendChild`, fires synthetic input events.
- **Used by:** 9 calls across 7 chapter files. Light usage — it shows up where typewriter narration matters (`scene-3-prompt.js:2`, `scene-6-refine.js:1`, `prompt-form.js:1`, etc.).
- **Bypassable?** Trivially. A 15-line typewriter is no problem outside the engine. The only engine-bound subtlety is dispatching `Event` from `state.doc.defaultView` (the iframe window), which only matters if the iframe contains live JS listening for input events.
- **Editorial fit:** Irrelevant for ad-style; useful for tutorial typewriter beats.

### `runScene(beats)` — engine/engine.js:689-749

- **Signature:** async; takes an array of beat objects (id, chapter, camera, spotlight, overlays, labelDwell, effect, duration, transition).
- **What it does:** A declarative-beat compositor. Computes `sameChapter` continuity, runs `clearHighlights`, runs a chapter-break `dolly` if crossing chapters at non-1x zoom, runs `zoomTo` on the beat's camera target, mounts a spotlight, draws overlays, holds for `labelDwell`, runs `effect`, holds for `duration`, clears spotlight. This is the legacy chapter shape — `runtime/player.js:runChapter` invokes this for `mode: 'parallel' | 'audio-cued' | 'editorial'`.
- **Used by:** Imported by `runtime/player.js`. Most modern videos route through `runtime/chapter-runner.js` instead (descriptor mode). Legacy chapters still use it.
- **Bypassable?** Yes — chapters can implement `effect: async ({ doc, cursor, sleep, ... }) => { ... }` that does all their own choreography and ignore the beat declarative shape. Many do.
- **Editorial fit:** Partly. `mode: 'editorial'` (player.js:342-359) walks beats sequentially and just runs each `effect`, skipping the camera/zoom/overlay/spotlight machinery. So `runScene` itself is iframe-coupled, but the player offers a stripped-down editorial path that just runs `effect` callbacks with the engine's enriched ctx.

### `pointer(selector, { direction, label, size, gap, color })` — engine/engine.js:351-428

- **What it does:** Animated triangle pointing at a target with bouncing keyframe animation and optional label. Stage-layer DOM, iframe-coord-projected.
- **Used by:** Zero direct chapter calls (greps return nothing under `videos/`). Used internally by `runScene`'s overlay loop. **Effectively unused.** Defined but not load-bearing.
- **Editorial fit:** Irrelevant.

### `spotlight(selector, { dim, fade })` — engine/engine.js:442-477

- **What it does:** Inside the iframe doc, dims everything except a target's ancestor chain via injected CSS. Returns `clear()` for restoration.
- **Used by:** Zero direct chapter calls under `videos/`. Used internally by `runScene` and `runBeatsPerNarration`. Two old `scenes/*.html` files use it directly. **Not actively used by current chapters.**
- **Editorial fit:** Irrelevant — editorial controls its own composition.

## Per-system overview

### `engine/engine.js` (749 lines) — iframe stage + camera + cursor + overlay primitives

- **Purpose:** Mount a real WPForms snapshot as an iframe inside a stage scaffold and provide the four primitives needed to direct the viewer's eye through it: camera (`zoomTo`/`setCameraTransform`), pointer (`cursor.*`), framing (`highlight`/`spotlight`/`pointer`), and typewriter (`type`).
- **Surface area:** `loadSnapshot`, `adoptSnapshotIframe`, `setCameraTransform`, `cameraState`, `zoomTo`, `highlight`, `clearHighlights`, `pointer`, `spotlight`, `cursor` (object with park/moveTo/click/hide/dragGrab), `type`, `runScene`, `sleep`. Plus a debug 'd' hotkey (line 640).
- **Coupling:** Chapter authors don't import this directly in modern videos — they get it via `runtime/player.js`'s `BASE_CTX_FACTORY` (line 200) which threads engine helpers into each beat's `ctx`. Every primitive assumes the iframe stage is mounted. `state.doc` is global singleton — there's no support for multi-iframe.
- **Bypass cost:** Replacing the camera math + cursor coord projection + iframe boot is the expensive part. ~150 lines of math (`toStage`, `unionRects`, `applyCamera`, `ensureCameraDriver`) are not glamorous to rewrite.
- **Editorial relevance:** Partly relevant — `surface: 'mixed'` videos (`klaviyo-addon-intro`, `wpforms-rest-api-overview*`) use the iframe for some beats and editorial for others. Pure editorial videos don't need any of this.

### `runtime/dom-prep.js` (669 lines) + `runtime/prep-ops.js` (334 lines) — snapshot-state vocabulary

- **Purpose:** Turn the captured `builder-fields` snapshot (which ships a mega-form with 30+ fields, the admin bar, addon cruft) into the canonical "Simple Contact Form" canvas the storyboard expects. Plus a richer per-field-state vocabulary (icon choices, image choices, hide-label, required, layout, checked choices) that mirrors live WPForms reactions in the static snapshot.
- **Surface area:** `applyDefaultForm`, `removeAdminBar`, `removeBuilderCruft`, `keepOnlyFields`, `hideFields`, `setFieldLabel`, `setChoiceLabels`, `setCheckedChoices`, `setFormName`, `activateFieldOptionGroup`, `setChoiceLayout`, `applyIconChoicesV2`, `applyImageChoices`, `setHideLabel`, `setRequired`, `stripQuizEnabled`, plus deprecated `harvestField`/`injectField`. Declarative `prep` op vocabulary in `prep-ops.js` validates and dispatches each by name.
- **Coupling:** Operates on the iframe `contentDocument`. `applyDefaultForm` is the universal opener — every chapter that lives in the form builder calls it (or the descriptor-mode `prep: [{ op: 'applyDefaultForm' }]` form). Chapters declare prep declaratively (op entries) or as a `(doc) => …` function escape hatch.
- **Bypass cost:** Re-implementing every helper means re-implementing WPForms's state vocabulary. For tutorials about field-state changes this is essentially the entire content of the video. For editorial that doesn't show the builder, irrelevant.
- **Editorial relevance:** Irrelevant.
- **Usage counts:** `applyDefaultForm | removeAdminBar | …` 92 occurrences across 17 files — but concentrated in two videos: `a-complete-guide-to-the-checkboxes-field` (8 chapters using it) and `creating-first-form` (4 chapters). The form-notifications/build-forms/rest-api videos largely don't use this layer because their chapters address parts of WPForms outside the field canvas.

### `runtime/chapter-runner.js` (527 lines) — descriptor mode

- **Purpose:** Run "descriptor" chapters (chapters defined by `defineChapter()` returning a steps array with `do:` verb names like `clickOn`, `type`, `swapToSnapshot`) sequentially on a single page. Owns HUD, start gate, cream cover lifecycle, snapshot boot/swap, camera continuity (`sameChapter` flag → smooth pan, chapter-break → `runChapterBreak`), per-step `focusOn`, narration timing (parallel start, `await ended` per step), error reporting.
- **Surface area:** `runChapters(descriptors, opts)`, `runSolo(descriptor, {video, manifest})`, `runChain(descriptors, {label, video, manifest})`. Manifest fields it reads: `surface`, `defaults.breakStyle/swapStyle`, `intro`, `postIntro`, `teaser`, `outro`, `coverColor`, `editorial`, `bgm`, `hud`.
- **Coupling:** Only chapters using `defineChapter()` go through this path. `do: '...'` descriptor verbs occur 41 times across 13 chapter files (creating-first-form, a-complete-guide-to-the-checkboxes-field). Modern non-checkbox chapters use `effect: async ({...}) => { ... }` and route through `runtime/player.js:runChapter` instead.
- **Bypass cost:** All the orchestration scaffolding (HUD, narration timing, error reports, chapter continuity) is here. Bypassing it for editorial is fine — `surface: 'editorial'` already disables the iframe boot and `prep` (lines 147-150). Bypassing for tutorial means rebuilding HUD + cream-cover flash-guarding + narration `await ended`.
- **Editorial relevance:** Partly — the `surface: 'editorial'` branch is the editorial accommodation, and it's narrow.

### `runtime/transitions.js` (272 lines) — chapter-break + swap styles

- **Purpose:** Bracket chapter boundaries with motion. Two registries: `CHAPTER_BREAKS` (dolly, soft-dolly, whip, hold, glide — same-snapshot boundaries) and `SWAPS` (cover, fast, whip, push, morph, flipBridge — across-snapshot boundaries). `flipBridge` is the new default (preloads next snapshot in a hidden iframe and atomically adopts it via `adoptSnapshotIframe`, no body-wipe seam).
- **Surface area:** `runChapterBreak(style)`, `runSwapTransition(style, doSwap)`, `transitionStyles` (named registry export). Wired through manifest `defaults.breakStyle`/`defaults.swapStyle`, per-chapter `export const breakStyle / swapStyle`, or URL `?breakStyle=&swapStyle=`.
- **Coupling:** Chapters opt into a style by exporting it. 120 occurrences of `breakStyle | swapStyle` across 57 files — broad adoption. Reads camera state via `engine.cameraState`, mutates `iframe.ui.style`. SFX hooks via `playSwoosh`/`playSwipe`.
- **Bypass cost:** Re-implementing 6 named transition styles and the cover/fadeOut/morph choreography is real work. Editorial rarely needs this — a single-HTML editorial doesn't have multiple snapshots to swap between.
- **Editorial relevance:** Mostly irrelevant.

### `runtime/player.js` (752 lines) — orchestration

- **Purpose:** End-to-end lifecycle for a manifest-driven video. Order: stylesheet → frameDriver.start → manifest fetch → narration base → URL overrides → first-snapshot preload → start gate → BGM → intro title card → pre-cover → postIntro cinematic → teaser → chapters loop → outro → BGM stop. Owns the watermark, mac-frame chrome, mesh background, cover layers, flash-guard.
- **Surface area:** `playVideo(slug)` is the only export. Internally it dispatches per chapter `mode` (`per-beat-narration`, `parallel`, `audio-cued`, `editorial`), each branching to a different beat runner.
- **Coupling:** Reads almost every manifest field. Threads engine + wpforms helpers into each chapter's effect via `BASE_CTX_FACTORY` (line 200-214). `swapToSnapshot` is exposed mid-chapter (line 310) so an effect can drive a snapshot swap inline.
- **Bypass cost:** Rebuilding intro/postIntro/teaser/outro orchestration plus narration timing + cover handoffs + BGM ducking is ~700 lines of plumbing. Editorial bypass attempts re-built almost all of this in single HTMLs.
- **Editorial relevance:** Mostly relevant when it's a manifest-driven video. A single-HTML editorial bypasses it entirely.

## Engine-using winner pattern: scene-2-add-new.js

This chapter (364 lines) is the canonical engine-using-winner shape per Agent B's analysis. What it actually does:

1. **Engine boundary metadata** (lines 20-23): `export const snapshot = 'builder-setup'; export const mode = 'parallel'; export const breakStyle = 'soft-dolly'; export const swapStyle = 'fast';` — declares to the player which snapshot to mount, which beat-runner mode, and how the chapter-boundary motion should feel arriving here. Zero code, full configuration.
2. **`mode: 'parallel'`** (player.js:361-370) means narration starts and beats run alongside it. The chapter inherits the player's enriched ctx (cursor, sleep, zoomTo, doc, type, gsap-via-_kit, etc.) without importing them.
3. **One beat, one effect** (lines 154-309). The beat is single-subject — the entire scene is "approach the Generate With AI card." Matches winning-pattern §A1.
4. **Manual `zoomTo` override** (line 160): `zoomTo([sel.generateCard], { level: 1.4, pad: 34, noScroll: true, duration: 550 })` — author-controlled duration, not the engine default 1200. Demonstrates the engine's primitives accept overrides; you don't have to fight them.
5. **Editorial decoration on real DOM** (lines 167-185): inject a `<style>` into `ifrDoc.head` adding a conic-gradient ring around `#wpforms-template-generate`. Inject a shimmer bar div as a real child of the captured card. The card itself is the real captured DOM. This is the §A2 "editorial decoration on real DOM, not editorial replacement of DOM" pattern.
6. **Custom GSAP timelines on top of engine primitives** (lines 210-234): `gsap.timeline()` + `gsap.fromTo` for letter-by-letter caption. The engine is happy to coexist with GSAP — chapter helpers `loadGsap`, `mountSceneLayer`, `injectCss`, `tlDone` are imported from a video-local `_kit.js` (matches §A4 atmosphere kit).
7. **Engine cursor + custom waypointed glide** (line 239): `await cursor.glideTo(sel.generateCard, { via: { x: 1700, y: 700 }, wait: 880 })` — waypoint produces curved arc (§A3). The engine cursor is doing the projection; the chapter is choosing the path.
8. **Real card hover via real classes** (lines 247-286): `card.classList.add('scene-hover', 'active', 'selected')` then `gsap.to(card, { y: -9, scale: 1.1, ... })`. The engine isn't doing the hover; the engine got us to a place where `card` is a live DOM node we can puppet.
9. **Page-layer overlay via `mountSceneLayer`** (line 188): caption text lives in a stage-layer overlay, not in the iframe, so it survives camera transforms and reads at full crispness.

**Why this works where bypass attempts fail:** The engine paid for the iframe-mount + camera + cursor-projection so the chapter could spend its 364 lines on **content** — caption motion, conic-gradient ring, magnetic hover, mission-control click burst. The failed editorial bypasses (per Agent B) all spent their lines re-implementing transform math, narration timing, and cover handoffs from scratch, which crowded out the actual scene work.

## What the engine gives editorial work that bypass-HTML doesn't

Honestly: **almost nothing if the editorial is purely abstract**. Specifically:

- **Surface modes** (`surface: 'editorial' | 'mixed' | 'iframe'`) provide a partial off-ramp — `surface: 'editorial'` skips iframe boot, skips iframe prep, skips watermark mount, skips stage chrome. So you get manifest-driven intro/postIntro/teaser/chapter loop/outro orchestration WITHOUT the iframe stage. That's `runtime/chapter-runner.js:147-150` and `runtime/player.js:411-462`.
- **Custom-named transitions** between editorial chapters survive (`flipBridge`, `morph`, `cover`, `whip`, etc. work even when chapters are editorial — they just don't have an iframe to swap).
- **Title cards + postIntro cinematics** — `runtime/title-card.js` plus the cinematic-runner give you intro/outro production value for free.
- **BGM + narration ducking + start-gate + watermark + outro choreography** are non-trivial and reusable.
- **Per-step narration timing** (await ended) is solid.

If the editorial wants any of those, the engine is the cheap path. If the editorial is one 30s self-contained morph (`wpforms-ai-prompt-open` shape), the engine adds ceremony you don't want.

## What the engine costs editorial work

- **Chapter format constraint:** A chapter has to be a JS module exporting `default` (beats array or descriptor) plus optional `snapshot`, `mode`, `narration`, `setup`, `breakStyle`, `swapStyle`. Editorial work that wants one big `<style>` + one timeline runs against the grain.
- **Narration expectations:** the runner expects `.mp3` files under `videos/<slug>/narration/`. Editorial pieces that want one through-composed track + on-screen captions instead of per-beat clips have to either skip narration or use `mode: 'audio-cued'` / single-clip `narration` and bind beats to timestamps.
- **The iframe mental model:** chapters with `snapshot: '...'` and any iframe-coupled primitive (`zoomTo`, `cursor.*`, `highlight`) silently assume that iframe is mounted. Editorial chapters either need to be `mode: 'editorial'` + skip those, or do the bookkeeping themselves.
- **Player chrome:** mac-frame, watermark, mesh-bg, stage chrome class — those mount unless `surface: 'editorial'`. They're product-feel, not ad-feel.
- **Cover/swap discipline:** the cover layers (`prepostintro`, `preteaser`, `prefirstchapter`, `swap-cover`, `outro-cover`) are real load-bearing flash guards. Single-HTML editorial doesn't need them and doesn't have to think about them.

## Recommendations

- **For tutorial videos:** keep using the engine. Default to `mode: 'parallel'` or `mode: 'per-beat-narration'`. Lean on `applyDefaultForm` and the prep-ops vocabulary for builder chapters; `engine/wpforms.js` (smartTag, toggleControl, selectDropdown, duplicateBlock, showPrompt, enableConditionalLogicRule) carries 80% of the WPForms-state choreography.
- **For editorial videos:** there are two reasonable paths, pick by scope:
  - **Single-piece editorial** (one 20-60s morph, no chapters, no real product UI): keep bypassing. Use the `wpforms-ai-prompt-open` shape. The three failed attempts didn't fail because of bypass — they failed because they violated §A1-A7 of the winning-pattern doc (single subject, real DOM if any, multi-track timelines, custom eases, minimal atmosphere, color discipline, 1s-hold-then-micro-zoom pacing). Use the bypass HTML, but build it with that discipline in mind.
  - **Editorial-style multi-chapter video with real product moments** (the "ad with two builder shots in the middle" case): use `surface: 'mixed'` (it works — `klaviyo-addon-intro`, `wpforms-rest-api-overview*` are mixed). Editorial chapters get atmospheric kit + GSAP + canvas; mixed chapters with `snapshot: '…'` set get the iframe primitives.
- **For mixed-mode (`surface: 'mixed'`):** the engine accommodates this well. Each chapter declares its own `snapshot` (or doesn't); the runner handles the swap. `wpforms-rest-api-overview-polished` is the canonical shape. The cost is per-chapter discipline — the editorial chapters have to not accidentally call iframe-coupled primitives.
- **Specific primitives that should be ported into a single-HTML editorial template if we keep editorial bypassed:**
  - `pausableSleep` / pause-manager equivalent (so scrubber/seek works)
  - `pausableRaf` (the wpforms-gsap-rules skill mandates this)
  - The narration loader + `await ended` pattern from `scenes/shared.js`
  - The flash-guard idiom (head-level `<style>` that survives body-wipes — relevant if the bypass HTML ever loads anything async).
- **Specific primitives that ONLY make sense inside the engine:**
  - `loadSnapshot` (it IS the iframe stage)
  - `zoomTo` (camera math is iframe-coupled)
  - `cursor.*` (iframe-coord projection)
  - `highlight` (overlay positioned via iframe-coord projection)
  - `runScene` (legacy beat compositor; new chapters use descriptor or `mode: 'editorial'`)
  - The entire `engine/wpforms.js` (depends on captured WPForms DOM)
  - The entire `runtime/dom-prep.js` + `prep-ops.js` (depends on captured WPForms DOM)
  - `runtime/transitions.js` swap styles (depend on iframe element existing)
  - This means: if the editorial scope grows to want real WPForms moments, that scope crosses back into the engine's territory and bypass stops paying.

## Gaps in this audit

What I'd need to author or watch authored to verify each strategic claim:

- **"Editorial-mixed pays off"** — I can see the manifests use `surface: 'mixed'` but I haven't authored against it. I'd want to build one mixed chapter (one editorial beat → one iframe beat → one editorial beat) and see whether the camera continuity / chapter-break transitions feel coherent across the mode boundary, or whether the iframe boot inside an editorial-feeling chain reads as a jarring genre shift.
- **"Bypass fails for editorial because of content discipline, not architecture"** — I'm taking Agent B's word for this from `docs/winning-pattern-analysis-2026-05-10.md`. To verify I'd need to read the three failure videos' source and confirm they violate §A1-A7 specifically, not engine-shaped concerns.
- **"`runScene` is legacy, descriptor mode is modern"** — I see `defineChapter` is referenced in 13 chapter files (one slug each, mostly checkbox + creating-first-form). Most other videos use beats-array `default` exports with `mode: 'parallel'`. I haven't traced which path the user prefers in 2026-05 — both are alive in the codebase. The `core-factors` branch suggests active migration but I don't know the direction.
- **"Editorial wants one through-composed track"** — guessing from how single-HTML winners are structured (`wpforms-ai-prompt-open`'s 12-second single timeline). Authored editorial work might prove the per-beat narration model is fine and I've over-stated the constraint.
- **"`spotlight`/`pointer` are unused"** — zero direct calls under `videos/`, but they're invoked indirectly via `runScene`'s overlay loop and `runBeatsPerNarration`'s overlay loop. So old-style chapters that pass `overlays: [{ pointer: '...' }]` use them. To know if any modern chapter still reaches them, I'd need to grep beat overlay shapes.
- **"`type` is engine-bound"** — it isn't really; it's almost trivially portable. I named it as "engine-only" because it depends on `state.doc` and `state.doc.defaultView.Event`, but a 15-line equivalent outside the engine is fine.
- **"`focusOn` is the modern camera API"** — I see player.js line 13 imports `focusOn` from `engine/interactions.js` and threads it through ctx; I see it called inside `chapter-runner.js` per step. But greps return zero direct chapter-side `focusOn(` calls under `videos/`. So either chapter ctx receives it without name (likely — ctx-destructured), or it's only used by descriptor-mode runner. Authoring would clarify which.
- **"Engine-using winner pattern is reproducible"** — this is the single biggest gap. I read one chapter (`scene-2-add-new.js`). I'd need to author a chapter from scratch using the engine to know whether the primitive set feels generative or constraining. Reading code under-weights friction.
