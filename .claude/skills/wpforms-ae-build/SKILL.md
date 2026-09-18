---
name: wpforms-ae-build
description: "Use BEFORE the first After Effects call on any WPForms film built through the AE connector (ae_* tools) — an AE-native film, or the AE twin of an HTML film from the same storyboard. Owns the AE build line: what the AE build takes from this repo (the approved storyboard as contract, real snapshots rastered at 2×, captured data, brand assets, the tools/sfx sound path), the two-phase gate (rig + stills, STOP, then motion), the build-script pattern for execute_script, ~40 bridge rules that each cost a round, the aerender + ffprobe render recipe, the 4K pass, and the handoff + lessons files. The connector's own skills know After Effects; they know nothing about this repo. Triggers: After Effects, AE build, AE twin, ae_batch, execute_script, aerender, .aep, 'build it in AE', 'same film in After Effects'. NOT for HTML films (wpforms-marketing / wpforms-video), NOT for writing the storyboard (wpforms-storyboard)."
---

# WPForms After Effects build — the repo's side of an AE film

**Why this exists (2026-09-18).** Three AE films were built here in one week. The first took ten
versions. The third matched an approved stills sheet and rendered picture-complete in two phases.
The gain came from what the AE session was handed: an approved storyboard as the contract, real
captures to raster, and the bridge rules the earlier films paid for. Until now those rules lived
in per-film handoff files that a fresh session could only find if a brief pointed at them. This
skill is that brief, made permanent.

**The connector has its own skills.** Load `ae-clean-rig` through `ae_get_skill` before the first
mutating call; its table names any further module. Those skills cover AE craft. This skill covers
the repo: inputs, gates, the bridge traps, render and handoff. Local exemplar paths (the prior AE
handoffs, lessons files and build scripts) are in `CLAUDE.local.md`.

## What an AE build takes from the repo — and what it bypasses

| Takes | From |
|---|---|
| The contract: `## Beats` t-values, `## Seam ledger`, `## Camera plan`, `## Beds`, the literal copy | `videos/<slug>/storyboard.md`, written by `wpforms-storyboard`, APPROVED |
| The reference read: `motion-spec.md`, `cuts.json`, `brief-after-effects.md`, the 24 fps sheets | the `reference-motion-spec` worker in the `video-pipeline` skill |
| Every pixel of product UI, every number | real snapshots (`node tools/list-snapshots.js`), rastered at 2×; selectors from `node tools/inspect-snapshot.js <slug> --emit-selectors --filter <text>` |
| Sullie + wordmark | the official Sullie WITH ARMS (rasterize the vector at or above display size); lockup proportions from the designer's export, never by eye |
| Sound | the same `tools/sfx/` plan as the HTML film; `node tools/sfx/mux.mjs`, mastered against the LUFS bar |
| Review sheet | `node tools/keyframes.js <mp4>` — badged tiles, the same handoff shape as HTML films |

**Bypassed — so nothing catches these for you:** `motion-primitives.js`, `wpforms-interactions.js`,
the `video-guard` hook, `validate-singlehtml`, `smoke-singlehtml`, `qc-probe.mjs`,
`composition-scan`, `seam-gate`, the QC dashboard chips. The AE equivalents are manual and listed
under *Checks*. `wpforms-motion-audit` still applies: its rubric scores the rendered film; record
the tier.

## Step 0 — Preconditions (stop if one is missing)

1. **An approved storyboard.** No storyboard, no AE call. If the ask is "build X in AE" with no
   storyboard, invoke `wpforms-storyboard` first. Rig from the AMENDED `## Beats` and
   `## Seam ledger`, never from a brief's summary of them — a 24 fps read changes the rig, not only
   the timing (`dosa` 10).
2. **The connector is live.** Call `get_host_status`. A stale "requires authentication" note can
   name the server while it works — try one read call before believing it, and tell subagents the
   same (`wdl` 9). If it truly needs auth, that is Umair's step in his connector settings.
3. **The captures exist and are clean.** Grep the frozen markup for `<b>Warning</b>:`, `Notice:`,
   `Deprecated:` — a PHP notice freezes into a snapshot and passes every capture gate. The AE raster
   pass found ~60 of them that the gates missed (`dosa` 5).
4. **Read the previous AE film's handoff and lessons** (paths in `CLAUDE.local.md`). Comp ids are
   never reused; the bridge rules, layer-map conventions and render recipe are.
5. **Disk space.** One 3D render adds ~23 GB to `%TEMP%\Adobe\After Effects\<ver>`; the cache
   reached 94 GB and crashed AE. Check free space before each full render. Purging the cache is
   Umair's action, never the agent's (`wdl` 50).

## Step 1 — Project + assets

- **New project per film:** `videos/<slug>/ae/<slug>.aep`. Never open or modify another film's
  project. Audition risky ideas in a project COPY (`app.open()` swaps the bridge to it) (`wdl` 83).
- **Master comp** 1920×1080, 30 fps, the storyboard's length. **Markers = the storyboard's beat
  labels at their t-values.** One precomp per scene; components as their own precomps; page
  precomps per surface; a bed comp; Sullie lockups.
- **Save** with `app.project.save()` at the end of every script. Copy the project, build scripts,
  sound plan and render to `ae/backup/` with a `-phaseN-<date>` or `-delivered-<date>` suffix
  before each phase and each revision round (`wdlr` 10).
- **Raster from the snapshot, at 2×**, with Playwright scripts that live IN the film's `ae/`
  folder (Node resolves `playwright` from the script's folder, not the cwd — `dosa` 6). Write
  `ae/raster-manifest.json` with the source snapshot per file. Get the selectors from
  `inspect-snapshot.js` BEFORE writing the raster script: WordPress list tables name the title
  column `column-name`, and extra `tbody tr` are message rows (`dosa` 4).
- **The harvest viewport is the page coordinate system.** A capture at DPR 2 scaled 50 % and
  placed at page (0, 0) lines up with AE-native widgets built from the harvest (`wdl` 41). Compare
  a harvested box against its sibling's x before trusting it — nested spans lie (`wdl` 10).
- **Icon pass before v1.** Any surface built from geometry ships circles where glyphs were.
  Screenshot each icon box from the snapshot at 4× and place the PNGs (`wdl` 64). Check the live
  page top too — a missing header band reads as a blank strip (`wdl` 65).
- **Hidden UI** (a date picker at `display:none`) has 0×0 geometry. Open it in the snapshot with
  Playwright and read computed styles (`wdl` 22). Remove a card by re-capturing with
  `display:none` so the column reflows, never by editing the raster (`wdl` 66).
- **Count-ups and value rolls are expressions on card time** inside the card comp; the scene
  remaps card time through that window (`wdlr` 2). Never retype a number.

## Step 2 — Phase 1: rig + stills, then STOP

Build the rig and the comps. Export one static frame per storyboard composition beat
(`CompItem.saveFrameToPng(time, file)` works on the instance in AE 26.5 even though probing the
prototype says `undefined` — `dosa` 8). Put them in `ae/stills/`. Write
`ae/HANDOFF-<slug>-phase1.md` (files, comp ids, layer map, what was rastered from where, open
questions) and start the lessons file. **Then stop and report.** No seams, no sound.

In a two-engine film the HTML stills sheet is what Umair approves; the AE stills are compared
against it and corrected to match. In an AE-only film the AE stills ARE the look gate, shown beside
the donor frames. Motion starts on "stills approved", not before.

## Step 3 — Phase 2: motion from the tables

- **Poses come from tables** — the geometry JSON, the storyboard's beat table, a poses JSON one
  step writes for the next. Then no transform read-back is ever needed, and the unreadable-rig
  trap never fires (`dosa` 18).
- **Components** = the real card comp, collapsed, parented to a per-scene lens null in page
  coordinates, masked to the card box, time-remapped to the state needed (`wdlr` 1). Set a
  component comp's DURATION past every use (`wdl` 85).
- **A persistent layout is one camera null**, not per-card framing keys. Check every framing for
  neighbour slivers (`wdl` 35). A framing change is a cut to a different object or an eased move,
  never a held re-zoom (`wdl` 14).
- **Anticipate a zoom with a parent null** above the lens: anchor = position = the target's frame
  point; 100 → 95 in 0.2 s, then → final in 0.5 s. The target stays pinned (`wdlr` 7).
- **A push-in is bounded by the panel.** Compute the zoom ceiling from `sourceRectAtTime` before
  choosing it (`wdl` 30).
- **Cursor:** a pointer belongs to the object it clicks — parent it to that card at the card's
  depth (`wdl` 46). The steering ("fish") cursor is one expression on `velocityAtTime`; use it
  only where it was asked for (`wdlr` 8, 13). Check the flyout rows before keying a cursor (`wdlr` 4).
- **Hover beats animate the pointer and the product's own hover state**, never a value the UI
  would not show. Overlay dots come from the RENDER (blob-detect), not the config (`wdl` 75, 76).
- **Motion blur:** comp shutter, the per-layer switch, AND a render setting that enables it.
  Shutter 90° before 180°. Turn blur OFF on per-frame-keyed 3D cursors — it hid one for 2.7 s
  (`wdl` 23, 37, 47). Close every blur ramp with a 0 key (`wdl` 24).
- **Retime with one table.** Insert time by walking keys backwards; remove time by walking
  forwards; never apply two shifts to one property. Rebuild table-driven things (pills, veils,
  time remaps) from the table after a retime (`wdl` 68, 69, 78, 79).

## Build-script pattern (`ae_batch` → `execute_script`)

`ae_batch` accepts `{tool:"execute_script", input:{script}}` and runs full ExtendScript (`wdl` 19).
Probe hidden batch ops before declaring a connector limit. The dedicated tools cannot move a layer
in time, reorder layers, or save.

- Wrap every script in try/catch and **return a plain string**.
- **Globals do not persist between calls.** Each op re-evaluates the build files (`evalFile`).
  An ES3 reserved word as a variable name (`short`) fails the whole batch with only "After Effects
  reported an error" — isolate with one small op per call (`wdlr` 14).
- **One heavy step per call.** The bridge times out at ~60 s while AE keeps working. After a
  timeout, READ state (comp names, layer counts, dirty flag) before anything else. Never re-run a
  mutating step blind (`dosa` 16).
- **A hard error keeps the edits made before it.** Read state, continue from the first missing
  step (`wdl` 53).
- **Completeness guards:** an "exists → skip" guard keeps a half-built comp forever. Check
  `numLayers` against the expected count; remove and rebuild when short (`dosa` 3).
- Keep batches to `execute_script`. Call the export tools directly — as batch ops they return the
  PNG as base64 text (`wdl` 81). `ae_add_text_layer` can fail inside a batch and work direct.
- Lottie route (large geometry builds): one `ae_build_scene_from_lottie` per film; `op` ≤ film
  length; each precomp referenced ONCE (a second reference makes an empty twin); absolute film
  time everywhere (`wdl` 1–3).

## Bridge rules — each one cost a round

**Never read through the bridge:** `.expression` or `valueAtTime()` on an expression-driven
property; transform values on the rig or on freshly added nulls; `Source Text .value`. Each
reports a hard error though every earlier edit applied. Verify with `expressionEnabled` and an
exported frame (`wdl` 52, 60, 71).

**Hard errors:** `setParentWithJump`; `new TextDocument()`; `KeyframeEase(0, 0)` (influence ≥ 0.1);
`setTemporalEaseAtKey` on shape `Rect Size` (drive it with a Slider expression); removing every
Time Remap key (add yours first, then remove the old ones by time); `itemByID` on a missing id —
check `app.project.file` first, an empty untitled project means the project closed (`wdl` 20, 39,
43, 51, 71).

**Handles go stale.** After any `addProperty` (an effect, a shape group), re-acquire the layer and
its properties: `layer.property('ADBE Effect Parade').property('<name>')` (`wdl` 38, `dosa` 2).
`replaceSource` renames the layer — find by `source.id`, rename back (`wdl` 32).

**Parenting compensates at the current time** — position, anchor, scale AND rotation/orientation.
After every `layer.parent =`, set all of them explicitly in parent space. A `resetRot()` after each
parent call is a hard rule, not a reminder (`wdl` 34, 40, `dosa` 1).

**Time:** `inPoint` alone keeps the duration — the out point moves. Set `inPoint`, then `outPoint`,
always both (`wdl` 16, 33, 54). Moving a precomp layer earlier cuts its tail; extend the source
comp first (`wdl` 36). Set interpolation types LAST; HOLD set before re-keying does not survive
(`wdl` 48). An expression pop timed exactly on a frame can miss it in float — subtract 2 ms
(`dosa` 15).

**Keys:** a 2D layer's Scale reports three dimensions; missing components count as no change in
the key helper (`dosa` 12). Temporal ease on a 3D-spatial Position wants ONE `KeyframeEase`; Scale
wants three (`wdl` 71).

**3D:** Collapse Transformations on a 3D precomp DROPS its z. Collapsed 3D precomps also IGNORE a
camera layer in Classic 3D. Fix for both: a 2× wrapper comp with the collapse INSIDE, shown
uncollapsed at 50 % (`wdl` 61, `dosa` 11). A collapsed precomp ignores an INTERSECT mask that lies
wholly outside the frame — hide the layer with a HOLD opacity key until the wipe starts (`wdl` 86).
A 3D rig costs ~8× render time; tune with `aerender -s/-e` sections (`wdl` 42).

**Effects and shapes:** Drop Shadow `Opacity` is 0–255 in scripting (30 % = 77) (`dosa` 7). Linear
Wipe 270 reveals left → right; 90 reveals right → left — check one mid-wipe frame before keying a
family (`dosa` 13). `addShape()` lands at comp centre; set anchor and position to (0, 0) when
groups carry absolute coordinates (`dosa` 14). Gaussian Blur on a shape layer clips to its bbox —
precompose, blur the precomp (`wdl` 6). Hue/Sat Master Saturation is not keyable; use Tint (`wdl` 18).

**Text:** `add_text_layer` anchors at the text CENTRE for every justification — shift left/right
text by measured half-width (`wdl` 5). Seed one text layer, `duplicate()` it per word, set each by
Source Text expression; widths from `sourceRectAtTime(0)` (`wdlr` 18). In text expressions `value`
is the string (`wdl` 70). Pill widths are a linear fit of measured text, never eyeballed (`wdl` 73).

## Checks (the manual gates)

1. `ae_audit_motion` on the master.
2. **A master frame sheet:** `saveFrameToPng` at 24+ times, tiled with ffmpeg. Local, no expiring
   URLs. One sheet caught three defects before the first render (`dosa` 17). Scene comps render
   black in sheets (transparent) — judge them in the master over the bed (`wdlr` 6). Keep QC
   labels off the UI under review (`wdl` 44).
3. **Read render frames around every cut**, not the 1 s tile (`dosa` 15).
4. **A tier score is not a communication check.** For every result on screen, confirm its cause
   (the cursor), its subject (the whole card, unclipped) and its data (no flatlines) are visible.
   A film scored S with no visible pointer for 13 s (`wdl` 49).
5. The camera plan is measurable: read the transform key table by script and compare landings and
   holds to the storyboard's `Cadence:` and `Max hold:` (`wdl` 29).

## Render

```
"<AE install>/Support Files/aerender.exe" -project <aep> -rqindex <N> -sound OFF
```

- **Verify every render with `ffprobe`:** frame count = length × fps, plus a late frame. aerender
  reports Finished on truncated files; the exit code proves nothing (`wdl` 62).
- Picture-only from AE. Sound is muxed after.
- **4K = nest, don't rebuild:** a 3840×2160 comp holding the duplicated 1080p comp as a 3D layer at
  200 % with Collapse on; Collapse only FLAT precomps; 2× wrappers for lifted 3D cards; ×2
  expressions on px-unit effect values. Set `app.project.gpuAccelType = GpuAccelType.SOFTWARE`
  first (the GPU OOMs), render a TIFF sequence, encode with ffmpeg `libx264 -crf 17` — AE's H.264
  export failed two of three 4K passes. Verify by frame diff against the 1080p render. 4K waits for
  Umair's look approval (`wdl` 59–63).

## Sound

Same plan file as the HTML film, re-pointed at the AE picture: `node tools/sfx/mux.mjs --video
<slug> --plan <plan>`, then two-pass `loudnorm` against the ad bar with `-t <film length>` (AAC
pads the tail — `wdl` 27). Set the bed gain from each music take's own measured LUFS (`wdl` 82).
Ask the music model for length + 6 s and "no ending" (`wdl` 26). Judge a cue in the mix, never as a
file (`wdl` 25). No tick sounds in any film. Rules: `tools/sfx/CONTEXT.md`.

## Handoff + lessons

- `ae/HANDOFF-<slug>-phase<N>.md`: files, comp ids, layer map, time remaps, the pipeline commands
  that worked, open items. The next session starts from it.
- Render + `tools/keyframes.js` badged sheet + tile map, in one message. In a two-engine film,
  beside the HTML build's.
- `videos/<slug>/LESSONS-<slug>-ae-<date>.md`: defect → root cause → where the fix belongs, plus a
  `## What worked` section. A new bridge trap goes into THIS skill's bridge rules once mined.
- Report format: files, comp ids, still paths, what was rastered from which snapshot, what AE did
  differently from the storyboard and how. No prose about how good it looks — the frames are the
  evidence.

## Anti-patterns (receipts)

- A whole admin page under a moving camera. Nine versions; "a dashboard demonstration with camera
  movement". Components on a bed (`wdl`, `wdlr`; `wpforms-storyboard` § components).
- Inserted functionality scenes that need a cursor inside an ad spine — a tutorial beat in an ad
  (`wdl` 13).
- Motion before stills approval.
- Re-running a mutating script after a timeout or hard error without reading state.
- Declaring a connector limit without probing `execute_script`.
- Believing aerender's "Finished".
- Applying a requested motion style everywhere when it was asked for in one place (`wdlr` 13).
- The armless Sullie crop in a lockup (`wdl` 31).
