# Tool notes — what each build tool needs from this material, and what it cannot do as written

`handoff.mjs` copies these sections into `video-handoff.md` under "If you build in …", the target
tool first. One section per tool; each line is a constraint the tool imposes and what to do
instead. They come from real build checks; add a line when a tool teaches you one, delete a line
when a tool stops needing it. Keep each section under ten lines.

A section heading is `## <key> — <name>`; `<key>` is the value `--tool` / `target` uses.

## html — plain HTML with GSAP (an iframe mount, a camera on the wrapper)

- Mount each snapshot in an iframe at its capture width (the mount line in the brief); the camera is a transform on the iframe's wrapper, never on the page inside it.
- Never put `filter: blur()` on the iframe or any ancestor: it blurs the whole raster. Depth-blur behind a lifted element is a veil over the iframe, or a clone of the element lifted above it.
- A press changes the DOM in place (`checked`, a class, a text node); the page CSS reacts. Anchors keep live hrefs, so the player intercepts navigation. When the mounted DOM already holds the hidden state (rows with `display:none`), mutate that mount rather than swapping to the next snapshot.
- A `selector (text: …)` in the material is a CSS selector plus the match whose text contains the words, not one selector: query all, pick by text.
- A morph from an element inside the iframe to one in the parent document: clone the element into the parent first; Flip cannot cross documents.
- Frame numbers are at the storyboard's target fps; a renderer that runs at another rate re-derives frames from the seconds.
- Deep zoom (above about 2×) softens an iframe raster; for a macro landing prefer a closer capture or a lifted clone.
- Determinism for a frame-stepped render: no `Date.now`, no `Math.random`, no infinite repeats.

## hyperframes — HyperFrames

- Stage: `data-width` / `data-height` from the stage line; one composition, one GSAP timeline.
- The skill forbids exit animations except on the final scene: express the ledger's outgoing treatment as the transition's own parameters (blur crossfade, push slide with directional blur, focus pull), or record a per-seam exception and keep it short.
- No iframe clip type: mount the snapshot as an iframe inside a `div` clip served over http, look nodes up lazily in `onUpdate` (the timeline is built before the iframe loads), or use the full-page raster per state (`page-full.png`, or `manifest/page@2x.png`). Zoom above about 2× on an iframe raster reads soft: use a lifted clone or a closer raster for macro landings.
- The skill's rules (no exit animations, no jump cuts, entrance tweens on every element) are written for authored elements; the brief's "Exceptions to record" section lists each seam and beat of this film that needs a recorded exception. Record them; do not soften the ledger.
- The Visual Identity gate asks for a DESIGN.md: take palette, type and logo from the brief's "Identity — ours" section.
- Per-element depth-of-field is on the transitions catalog's do-not list: a blur behind a lifted card is a veil, or CSS injected into the mounted page.
- Entrance tweens are for elements you create, not for the nodes inside a mounted real-UI page.

## after-effects — After Effects through the MCP bridge

- The comp is the stage line. Page precomps come from each snapshot's `manifest/` rasters (run `manifest.mjs`) in page px; the `PAGE rig` null carries every landing (anchor point = the measured anchor px, scale = zoom %).
- This bridge runs no ExtendScript (`ae_batch` only chains its own tools). A hold keyframe (every cut) is a layer trim or a 1-frame keyframe pair; an asymmetric ease goes through `ae_set_temporal_ease` (separate in and out) where it applies; any other bezier is baked to per-frame keys. `::before` / `::after` parts (a switch's knob) are not in the manifest's rasters: crop them from `manifest/page@2x.png`.
- Every press that changes the screen needs its result captured as a state (the film cannot flip a live DOM here); a spare snapshot without a manifest is not a state.
- `ae_create_transition` offers dissolve, wipe and zoom only: build every seam from the ledger as keyframed Gaussian Blur, Opacity and rig moves.
- A Flip-style morph of a shape's size: Slider Controls plus expressions, not Rect Size keyframes.
- The cursor is a layer parented to its target at the target's depth, position keyed on each press frame.
- `ae_build_scene_from_html` takes an HTML string, not a page with assets: the real UI enters as rasters, never as HTML.

## claude-design — Claude Design (its own composition engine, not HyperFrames)

- Two engines: **animations-v3** (`CompositionStage`, the `OM_SCENES` JSON literal in a plain inline script, `CUES`, host-timeline write-back) is the target; an older Stage engine (`<Stage width height duration>`, `<Sprite start end>`, `useSprite()` → localTime) gets one Sprite per scene from the OM_SCENES durations and no CUES.
- Two idioms, both real: one paused GSAP timeline seeked to `T`, or pure `Easing.*` / `interpolate` / `animate({from, to, start, end, ease})(T)` functions. Link one previous Claude Design video project as the style reference: it arrives as its scene jsx, and the build inherits that idiom and its helpers. The brief gives every seam and camera recipe in both.
- Everything renders from `T`: no wall-clock, no requestAnimationFrame, no effects that paint. The exporter seeks frames synchronously and serializes the stage to svg/foreignObject; a live iframe exports empty. Rebuild the real UI from the snapshot's layer manifest (its measured boxes and real text are the geometry constants) traced over `page-full.png` at stage scale; invent no data.
- Claude Design reads an uploaded screencast at ≤ 1 fps (its own frame extractor): UI truth only. The seam ledger and camera plan are what it cannot see; do not upload the reference clip expecting motion.
- The camera is a focus point (fx, fy, s) on a stage-wrapping transform `translate(W/2 − fx·s, H/2 − fy·s) scale(s)` — `camTo`, `camStyle`, `<Camera cx cy s>` are the same — keyed to T, decomposed per landing (translate and scale as separate tweens, anticipate first), never one tween per move.
- One element tree, nothing mounts at a boundary; a hard cut is `<Shot from to>`; one `<Captions items>` gated by the document's `captions` prop; exactly three motion helpers (the brief names them). Do not substitute the house defaults — the white sweep bar, a 0.35 s scene fade, `power2.inOut` everywhere — for a seam or an ease the ledger names.
- Copy, captions on/off, transitions on/off, scheme and pace are tweaks (`TWEAK_DEFAULTS` between `/*EDITMODE-BEGIN*/` and `/*EDITMODE-END*/`, the host edit mode writes them back): a revision is a tweak, not a prompt. The brief emits the block with the storyboard's copy as defaults.
- Pacing is trimmed and sped on the host timeline and written back into OM_SCENES; voice-over and music are added outside (the brief's voice-over skeleton: one timed line per section at a stated wpm, ending 2–4 s early, the on-screen column beside it).
- Export hygiene: icons from an embedded icon-font css or the linked design system, never a CDN link; partner fonts as `@font-face` woff2 in the helmet; the export copy strips Google Fonts links and the tweaks panel; `OM_PLAYBACK` is `'{"mode":"loop"}'` or `'{"mode":"times","count":1}'`.
- A design system may be linked in the host document (a `_ds/` folder with colours and type): take `identity_ours` from it when one exists.

## remotion — Remotion

- `<Composition>` from the stage line and fps; one `<Sequence>` per scene from the Sequences table; seams as overlapping Sequences driven by `interpolate` with `Easing.bezier`.
- Mount a snapshot with `<IFrame>` at its capture width, or use the full-page raster per state (`page-full.png`, or `manifest/page@2x.png` when the capture predates it); anchors are page px inside that mount.
- Frames are integers at the composition fps: round the storyboard's seconds once and keep the rounding.

## generic — any other tool

- Read the stage and mount lines, the anchors in page px, the presses with their selectors and the seam ledger; everything else in the brief is in neutral terms.
