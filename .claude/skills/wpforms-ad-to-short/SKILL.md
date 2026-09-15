---
name: wpforms-ad-to-short
description: "Use when an APPROVED 16:9 ad-style film needs a 9:16 (1080×1920) cut for Shorts / Reels / TikTok — 'make the ad a short', '9:16 of <slug>', 'vertical cut', 'portrait version'. Converts videos/<slug>/ into a sibling videos/<slug>-9x16/ that keeps the ad's timeline, copy, SFX cues and bed VERBATIM and changes geometry only: stage flip, per-line type refit, horizontal groups to vertical stacks, a centred live-surface band for mixed films, remapped cursor paths, a re-pointed qc-probe. Branches on whether the ad has live IframeManager surfaces. NOT for carving a short from a tutorial (dev-advocacy-video shorts branch), NOT for an original editorial short (wpforms-storyboard + vertical-short-skeleton), NOT for an un-approved ad (finish the ad first). Triggers: 9:16, vertical, portrait, shorts cut, reel cut, TikTok cut, -9x16."
---

# WPForms Ad → Short (16:9 → 9:16 cut)

**What this is.** A finished, Umair-approved ad (`videos/<slug>/`, 1920×1080) re-cut to
1080×1920 in a sibling folder `videos/<slug>-9x16/`. The landscape film stays as-is for
LinkedIn and desktop-first placements; the portrait cut is for Shorts / Reels / TikTok.

**The contract, in one line:** *same beats, same timing, same copy, same SFX cues, same
bed — only the geometry is re-laid-out.* Every `at:`, `duration:`, `ease:`, label and
`holdFinalFrame` survives byte-for-byte; a `diff` of the two films must show no time
literal changed. This is what made the first two cuts (`wpforms-claude-you-just-chat-9x16`,
`wpforms-chatgpt-wpvibe-ad-9x16`, 2026-09-14) ship in one session each, with one QC note
between them.

**Why it is its own skill.** A 9:16 cut is the fourth source of shorts and behaves like none
of the others: it is not carved from a tutorial (no narration, no `beat()`/`DUR` band), it is
not an original editorial short (no storyboard divergence, no idea/copy gate — the copy is
approved already), and it is not a clone of `vertical-short-skeleton.html` (the parent ad IS
the skeleton). The two shipped cuts used none of `shorts-kit.js` — they keep the ad's own
Sullie-assembly sting and `mountEndCard`. Receipts: `wvb` 5 (editorial portrait shape),
`wvb` 1 / `snpt` 1 (`fill` clamps in portrait), `sc3p` 5 (portrait amplitude), the
chatgpt-9x16 QC note of 2026-09-14 (b10 form cut left and right).

## Step 0 — Gates (do not start without all three)

1. **The ad is APPROVED.** Post-approval freeze applies to the cut: nothing that Umair signed
   off is re-opened. Only changes that portrait *forces* are allowed, and each one is listed in
   the storyboard's portrait section (Step 2). An un-approved ad gets finished first.
2. **Branch decided.** `grep -c "new IframeManager(" videos/<slug>/index.html`:
   - **0 → Branch A, pure editorial DOM** (`you-just-chat`: static `<img>` captures, `makeStageCamera` only). No band, no zoom floor; every `cam.*` call site survives untouched.
   - **≥1 → Branch B, mixed** (`chatgpt-wpvibe-ad`: 1440×900 desktop pages under an iframe camera). Needs the centred live-surface BAND, a viewport rebase and per-pose zoom re-derivation (Step 5).
3. **Umair named the deliverable** ("9:16 of X"). This skill never self-starts a cut because a
   short "would be nice".

## Step 1 — Copy the whole folder (the parent is the skeleton)

```bash
cp -r "videos/<slug>" "videos/<slug>-9x16"
rm "videos/<slug>-9x16/LESSONS-<slug>-*.md"        # the cut writes its OWN lessons file, never carries a twin
rm -f "videos/<slug>-9x16/qc-report.json"          # every chip is re-measured on the cut
rm -rf "videos/<slug>-9x16/render"                  # renders are per-cut
```

Keep `reference-frames/`, `storyboard.md`, `assets/`, `sfx/`, `build-assets.mjs`,
`qc-probe.mjs` — the last two get re-pointed in Steps 11–12. `videos/*` is gitignored
(2026-09-04 ruling), so there is no clone commit; the copy is the INV-16 first write.

Keep the file's line endings as they are (LF). One cut drifted to CRLF and every later diff
reported the whole file changed.

## Step 2 — The storyboard's portrait section (before any geometry)

Append to `videos/<slug>-9x16/storyboard.md` (the copied file) a dated section. The rest of
the storyboard is the approved ad's and stays verbatim — the cadence, max hold and ease voice
do not change because the timeline does not change.

```md
## Portrait cut (9:16) — <date>
Source: videos/<slug>/ (approved <date>). Timeline, copy, cues, bed: verbatim.
Branch: A (pure editorial) | B (mixed — N live surfaces)
Band (B only): 1080×<h> at y <top>–<bottom>; raster <w>×<h>; ZMIN = band.h / raster.h = <n>
Composition changes portrait FORCES (and nothing else):
| Beat | Landscape | Portrait | Why width forces it |
| s3   | triptych, 3×620px side by side | vertical stack | 3×620 > 1080 |
| title| Sullie beside 2-line lockup     | Sullie ABOVE   | group is ~1710px wide |
Pose table (every pose whose zoom / anchor / fill changed):
| Pose | Landscape | Portrait | Derivation (measured rect, band, fill) |
Cursor: size <n> (Branch A: ~7% of frame width; Branch B: unchanged 26), PARK <x,y> off-frame
Stills: storyboard-sheet.png of the cut approved beside the landscape sheet BEFORE render
```

The pose table is the camera plan for the cut. A pose written by feel here is the defect the
2026-09-14 QC note was: the dropdown beat carried a landscape zoom (2.6) over and its form ran
off both edges.

## Step 3 — Header block, then the stage flip

**Prepend** a portrait note above the original film header (keep the original, but fix its
geometry line to `1080×1920 — portrait cut of videos/<slug>/`; two cuts shipped headers that
still said 1920×1080 beneath the note):

```
<!-- [film] <slug>-9x16 — PORTRAIT (1080×1920) cut of videos/<slug>. Same beats, same timing,
     same copy, same SFX cues, same bed — only the geometry is re-laid-out for 9:16.
     What portrait changed, and nothing else:
       - stage 1080×1920; camera / stageRect() read the stage box, not a 1920 literal
       - type re-set per line to its own portrait fit (most lines get BIGGER — see Step 6)
       - <the composition changes from the storyboard table, one line each>
       - pointer <108 → 76> (7% of frame width either way) / cursor paths remapped
     The landscape film stays as-is for LinkedIn and desktop-first placements. -->
```

**Stage:**

| What | Landscape | Portrait | Why |
|---|---|---|---|
| `:root` | `--stage-w: 1920px; --stage-h: 1080px` | `--stage-w: 1080px; --stage-h: 1920px` | |
| `.stage` | `width: var(--stage-w); height: var(--stage-h)` | **`width: 1080px; height: 1920px;` — literals, NOT `var()`** | `tools/stage-size.js` regex-parses the `.stage` box for the render resolution; a `var()` falls back to 1920×1080 and produces the letterbox |
| `#grain` canvas | `width="480" height="270"` | `width="270" height="480"` | intrinsic size of a replaced element (`cgw` 8) |
| `.stage-wrap` | — | `padding: 0` (verify) | the 24px portrait crop (`snpt` 6) |
| JS | `const W = 1920, H = 1080` or bare literals | `const STAGE_W = 1080, STAGE_H = 1920;` and **every** `1920` / `1080` / `960` / `540` literal replaced | `makeStageCamera`'s internal `W, H`, `stageRect()`'s `k = STAGE_W / s.width`, `poseFor` — poses re-derive from the measured subject instead of a frame literal |

```bash
grep -nE "\b(1920|1080|960|540)\b" "videos/<slug>-9x16/index.html"   # every hit is a decision: constant, band, or remap
```

## Step 4 — Branch A: pure editorial (no live iframes)

Nothing in the camera changes but its constants. `makeStageCamera(tl, lens, { minZoom, maxZoom,
voice })` keeps its signature and defaults; every `cam.punch / cut / drift` call stays
byte-identical because `poseFor(rect, { fill, anchor, zoom })` now measures against the
1080-wide stage. Go to Step 6.

## Step 5 — Branch B: mixed (live desktop surfaces)

A 9:16 frame cannot show a 16:10 page full-bleed: it letterboxes, or the crop gets so tight the
UI stops reading. The treatment the landscape film already gave its form dock is applied to
**every** live surface — mount it in a **centred band** and let the iframe camera crop inside
the band. Never shrink the raster (the "puts it in the middle of the vertical screen" artifact
`docs/vertical-shorts.md` exists to prevent).

```js
// PORTRAIT: the live-surface band (matches .dock in CSS). Desktop pages are cropped INSIDE
// this window, never stretched across the tall frame. BAND.h / raster.h is the zoom floor:
// below it the band shows bars above and below the page.
const BAND = { x: 0, y: 420, w: 1080, h: 1080 };          // 1080×1080 centred; y = (1920 − h) / 2 − 60 for a title above
const ZMIN = BAND.h / 900;                                 // = 1.2 for a 1440×900 raster (the formula, not the number)
```

- CSS `.dock { inset: 0 }` → `.dock { left: 0; top: 420px; width: 1080px; height: 1080px }`.
- Every `new IframeManager(dock, { viewport: { width: W, height: H }, iframeSize })` →
  `viewport: { width: BAND.w, height: BAND.h }`. Raise `iframeSize.height` where the page needs
  a taller layout box (the dropdown page: 900 → 1382). The band's floor is
  `BAND.h / iframeSize.height`, so a taller `iframeSize` lowers the floor — say so in the pose table.
- In the film-local iframe camera: clamp against the manager's OWN viewport (`ifm._viewport`),
  not `W/H`; offset `stagePoint()` by `BAND.x / BAND.y` so cursor targets land in stage space.
- Poses: replace frame fractions with a band helper and a measured subject rect:
  ```js
  const zForm = (fill) => Math.max(ZMIN, fill * BAND.w / R_form.w);   // fill = share of the band's width
  compact: zForm(0.86)   typeStart: zForm(1.02)   typeEnd: zForm(1.14)   macro: 2.9 (was 3.2)
  ```
- **Frame the SUBJECT'S OWN rect, not a control inside it.** The one QC note on the shipped cut
  (b10, 2026-09-14): the dropdown pose centred on the choices control at a carried-over zoom
  2.6 and the form ran off both edges. Fix: `zDD = 0.97 * BAND.w / R_formD.w`, centred on
  `R_formD` (`lrect(ifmD, doc.querySelector('#wpforms-1932'))`). Measure the form; derive the zoom.
- The shorts doctrine's `1080×1200 @ y 300, minZoom 1.78` is the 1280×720-raster case of the
  same formula. A 1440×900 raster in a 1080×1080 band floors at 1.2 — declare the band and the
  floor in the storyboard section rather than inheriting either number.

## Step 6 — Type: re-set every line to its own portrait fit (not a uniform scale)

A line that used 30% of a 1920 frame can use 55% of a 1080 one. Measured on the two cuts:

| Element | Landscape | Portrait | Rule |
|---|---|---|---|
| single big words (`#formsDark`, `#formsLight`, `#yourWords`, `.claim`) | 151 / 86 / 108 / 76 | **230 / 150 / 132 / 92** | partial-width lines go UP |
| frame-wide lines (`#claudeBig`, `#chatLine`, `#title`) | 280 / 108 / 132 | 250 / 96 / 116 | full-width lines come DOWN, a little |
| nowrap line that no longer fits (`#buildsLine`) | 76, nowrap | **106**, `white-space: normal; width: 900px; line-height: 1.12` | let it wrap to two and get BIGGER |
| side-by-side lockups (`#title` "WPForms + ChatGPT", `#endHost .wordmark`) | one line | `display: flex; flex-direction: column; align-items: center` | stack, never shrink to fit |
| chrome (`#pill`, `#mark`, `#composer`, `#permissionCard`, `#formDock`) | 980 / 132 / 960 / 900 / 1110 wide | 900 / 116 / 940 / 960 / 1000 | ≤ ~1000px, re-centred |
| end card `.cta` / `.url` | 66 / 38 | 68 + `max-width: 880px` / 36 | |

Every typographic change is a choreography change: recompute wrap points and the end time of
any `caretType` against its exit (`itf` 6); a headline width feeds the pose table.

## Step 7 — Horizontal groups become vertical stacks (the only composition changes)

- A triptych (3 × 620px cards) → a vertical stack (`top: 430 / 810 / 1200`), same tilts.
- Sullie beside a title → Sullie ABOVE a two-line lockup (`groupH = SULLIE + GAP + titleH`, centred on `H`).
- `mountCardsFlyInStack` → pass explicit portrait `stops` (the default fans ±560px, a landscape row):
  `[{x:-250,y:-230,rotate:-7,scale:.94},{x:240,y:-120,rotate:5,scale:.96},{x:0,y:30,rotate:0,scale:1.04},{x:-240,y:200,rotate:-4,scale:.96},{x:250,y:300,rotate:8,scale:.93}]`.
- `#cardsHost` presence scale comes down (1.55 → 1.05) because the stops already fit 1080.

Each one is a row in the storyboard's composition table. Anything not forced by width is a
re-opened approved beat — not allowed.

## Step 8 — Axes: what was wide is now tall

- Burst / scatter: the landscape squashed **Y** (`y * 0.52`); portrait squashes **X** (`x * 0.50`, `y * 1`). Radii ≈ unchanged (`[300, 520, 690]`).
- Every `radial-gradient(ellipse Wpx Hpx …)` swaps its axes (`1400 900` → `900 1400`); blob sizes come down (~1300 → ~1000); decor squares (`.gsq`) are remapped to the tall stage.
- Perspective distances shrink slightly (1600 → 1200, 1400 → 1100).

## Step 9 — Cursor

| Branch | Size | Park | Paths |
|---|---|---|---|
| A (stage cursor on `#lens`) | `PTR = 76` (108 on 1920 = 5.6% of width; 76 on 1080 = 7%); `TIP = { x: PTR*0.125, y: PTR*0.083 }` | `{ x: 980, y: 2020 }` — off-frame, bottom-right of the tall stage | timings untouched |
| B (skeleton cursor, `size: 26`) | **unchanged** (it rides the iframe camera's zoom) | `initialY: 2100` | **every** literal `from / via / to` remapped (`{1330,905}` → `{800,1440}`, `{2080,1240}` → `{1240,2060}`); durations untouched |

`grep -n "cursorGlide\|glideTo\|initialX\|PARK" index.html` — every coordinate is a remap.

## Step 10 — Tween offsets: values move, times never

Only the *offset values* of x/y tweens change (`#pill` exit `x: -1250` → `-900`; `#claim1`
`x: -280 → -76` becomes `-210 → -60`; `#brandHost` `y: -168` → `-260`; a dot's final `scale: 4.6`
→ `5.5` to fill the tall frame). The contract check, run before any render:

```bash
# every at:/duration:/ease:/label must survive verbatim
diff <(grep -oE "(at|duration|ease|label): *[^,}]+" "videos/<slug>/index.html") \
     <(grep -oE "(at|duration|ease|label): *[^,}]+" "videos/<slug>-9x16/index.html") && echo "timeline verbatim"
```

## Step 11 — Audio: rebase paths, nothing else

`sfx/plan.json`: change only the `video` / `mp4` / `out` slug paths and add a `_notes` line
("PORTRAIT (9:16) cut. Timeline identical; every cue time, gain and the bed carried over
verbatim — only the slug paths were rebased."). **String-edit it**; a `JSON.parse/stringify`
round-trip rewrote `1.0` → `1` and unescaped `—`. The bed file is byte-identical. No new
SFX, no re-mix, no re-levelling — the mix was approved with the ad.

## Step 12 — Re-point the probe, then the gates

The copied `qc-probe.mjs` tests the **landscape** film until it is re-pointed (one shipped cut
still carried `goto(.../videos/<slug>/index.html)`, `viewport 1920×1080`, `k = 1920 / sr.width`,
a `54px` size check and an `860/480` aspect against a `740×460` terminal). Edit, in order:
slug → viewport `{1080, 1920}` → `STAGE_W = 1080` → every expected size / aspect / position
from the pose table → the cursor tip fractions off `PTR`. Then ADD the portrait assertions the
landscape probe never needed (`docs/examples/qc-probe-skeleton.mjs` has them):

- `inFrame(label, t, sel)` for every full-width element at every landing — edge clipping is the portrait defect (b10; `wvb` 14; `scaf` 3).
- distinct `anchor.y` / `ty` per consecutive landing (≥ ~100px apart) or a Δzoom ≥ 0.2 — folded landings become one hold (`sc3p` 5, `wvb` 2).
- the hold cap from the ad's `Max hold:` line, unchanged.

Gates, on a private port, in this order (headless lock: one chain):

```bash
PORT=4399 node tools/validate-singlehtml.js <slug>-9x16 --report
PORT=4399 node tools/smoke-singlehtml.js <slug>-9x16 --seconds 40 --report
PORT=4399 node tools/composition-scan.js <slug>-9x16 --play        # portrait band auto-detected; the storyboard's Cadence: line overrides it
PORT=4399 node videos/<slug>-9x16/qc-probe.mjs
node tools/storyboard-sheet.js <slug>-9x16                          # → Umair, beside the landscape sheet, BEFORE render
```

Stills approval, then render. Match the parent's supersample — the landscape chatgpt master is
3840×2160 and its first cut shipped at 1× — so an ad cut renders through
`tools/render-frames.js --scale 2 --native` (2160×3840) when the parent did, else
`render-singlehtml-audio.js` (resolution auto from `.stage`: no `--resolution` flag). Then:

```bash
ffprobe -v error -show_entries stream=width,height -of default=noprint_wrappers=1 <mp4>   # 1080/1920 (or 2160/3840)
node tools/dead-time.js <slug>-9x16                                                          # full frame
node tools/dead-time.js <slug>-9x16 --crop 1080:<band.h>:0:<band.y>                          # Branch B: the band
node tools/keyframes.js videos/<slug>-9x16/render/<slug>-9x16.mp4 --frames 16 --cols 4
node tools/lib/qc-report.js <slug>-9x16 --set motionAudit.tier=<inherited tier, re-audited if any camera pose changed>
```

Edge walk (both counts must be 0 — `docs/vertical-shorts.md` § stage-wrap padding). Both
shipped cuts had NO `qc-report.json`; the chips are the handoff surface, populate them.

## Step 13 — Handoff

Render + badged keyframe sheet + the storyboard's portrait section, in one message, with both
URLs complete: `http://localhost:4321/tools/qc-dashboard/#<slug>-9x16` and
`http://localhost:4321/videos/<slug>-9x16/index.html`. Say which beats changed composition and
why, and that every timing is verbatim (the diff line above, pasted). Write
`videos/<slug>-9x16/LESSONS-<slug>-9x16-<date>.md` for anything learned on the cut — not a copy
of the parent's.

## What this skill never does

- Re-time, re-copy, re-mix, or re-open an approved beat. Portrait forces geometry; nothing else.
- Mount `mountShortIntro` / `mountShortOutro`, `beat()` / `DUR`, narration or a title pill — the ad's own sting and `mountEndCard` stay; an ad cut is not a micro-tutorial short.
- Clone `vertical-short-skeleton.html`. The parent film is the skeleton.
- Shrink the desktop raster to fit the width (letterbox), or run a full-width lockup on one line by shrinking its type (stack it).
- Carry a landscape zoom into a portrait pose (the b10 defect). Every changed pose is derived from a measured rect and the band.
- Ship the parent's `qc-probe.mjs`, `qc-report.json`, `render/` or `LESSONS-*.md` un-touched in the cut.

## References

- `docs/vertical-shorts.md` — the crop-don't-shrink rule, the zoom-floor derivation, `stage-size.js`, the edge walk, `dead-time --crop`
- `docs/rulebook.md` §5 Portrait — `fill` clamps in portrait (`wvb` 1, `snpt` 1), amplitude from `anchor.y` (`sc3p` 5), the editorial-short shape (`wvb` 5)
- `wpforms-marketing` — the reference-driven recipe the parent ad was built with; `wpforms-storyboard` — the track table row for this path
- `docs/examples/qc-probe-skeleton.mjs` — `inFrame`, `monotonic`, `stillAcross`, `computed`, `imagesDecoded`
- Shipped cuts: `videos/wpforms-claude-you-just-chat-9x16/` (Branch A), `videos/wpforms-chatgpt-wpvibe-ad-9x16/` (Branch B, one QC round)
