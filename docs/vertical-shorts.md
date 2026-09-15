# Vertical shorts (9:16) — geometry, camera, render

The path for YouTube / Facebook Shorts: **1080×1920, ≤60s.** Built 2026-08-05.
Format and topic contract live in the wiki (`umair-wiki/video/shorts-brief.md`);
this doc is the in-repo mechanics.

## The one rule: CROP, don't shrink

Every snapshot in this repo is a **desktop** capture, and the iframe is deliberately
held at 1280 logical px so WP admin never trips its mobile breakpoints
(`videos/_shared/wpforms-interactions.js:37`). Re-capturing narrow would produce
mobile-admin UI — different product truth, and a whole second snapshot library.

So a vertical short is **a moving window over the desktop raster**, zoomed until the
region being taught fills the width. Shrinking the whole desktop screen into a
1080-wide frame instead produces the artifact Kacie reported on spliced shorts
(2026-08-05):

> "it just puts it in the middle of the vertical screen"

That is the failure mode this path exists to prevent. It is also correct for phones
anyway: big text, one thing at a time.

## Geometry

```
1080 × 1920 stage
  0–140      player top zone                          keep empty
  140–300    title pill
  300–1500   device band — the cropped product UI     1080 × 1200
  1500–1620  caption
  1620–1920  title / channel / description overlay    keep empty
  right ~140px   like / comment / share rail          keep text clear
```

Safe-area numbers are **approximate** until checked against a real Shorts
screenshot. `?guides=1` draws them over the stage; correcting them is a one-line
change in the skeleton's `.g-top` / `.g-bottom` / `.g-rail` rules.

## The zoom floor is forced, not a preference

The device band is 1080×1200; the raster underneath is 1280×720 logical. At camera
zoom `Z` the visible slice is `(1080/Z) × (1200/Z)`. Keeping that inside the raster
requires:

```
1200 / Z ≤ 720   →   Z ≥ 1.67
```

Below 1.67 the band shows empty bars above and below the UI. The ceiling is the
existing sharpness limit (`flyToElement`'s `maxZoom: 2.0`, CSS pixel-doubling). The
skeleton ships `PORTRAIT_CAM = { minZoom: 1.7, maxZoom: 2.0 }` — 1.7 rather than
1.67 for margin.

**Consequence for storyboarding:** usable zoom is a narrow 1.7–2.0 band, so portrait
camera moves are **pans at near-constant zoom**, not zoom arcs. One region per beat.
This is a big reason a short teaches exactly one task — the frame cannot hold more.

## No new camera code

`flyToElement` (`videos/_shared/iframe-helpers.js:233`) and `IframeManager.cameraToElement`
(`videos/_shared/wpforms-interactions.js:643`) already derive framing from the
IframeManager's `viewport`, with no hardcoded 1920×1080. Portrait needed *different
arguments*, not new primitives — verified 2026-08-05. `IframeManager`'s existing
split between `viewport` (visible window) and `iframeSize` (desktop layout) **is**
the crop mechanism:

```js
const ifm = new IframeManager(iframeStage, {
  viewport:   { width: 1080, height: 1200 },   // the portrait window
  iframeSize: { width: 1280, height: 720  },   // the desktop layout under it
});
```

Anti-pattern #2 and the `wpforms-primitives` write-time gate both still apply. If a
portrait beat seems to need a new camera primitive, it almost certainly needs
different `fill` / `minZoom` instead.

**Cursor size:** the skeleton mounts `size: 26`, and because the cursor rides the
camera transform, the 1.7–2.0 zoom band renders it ~44–52 px effective — sized for
phone viewing. If a short's cursor reads small, raise the per-video `size` in its
`index.html`; never "fix" the shared library default (see
`docs/cursor-choreography.md` § Size).

## The stage-wrap padding must be 0 (measured 2026-09-04)

`.stage-wrap { padding: 24px }` silently cropped every portrait render: at a
1080-wide render viewport the 1080-wide stage starts at x=24, so each frame
showed 24px of body colour down the LEFT and **lost 24px off the RIGHT**.
Confirmed on two shorts and absent on every landscape render — portrait-only,
because only here does the stage exactly equal the viewport width.

The skeleton now ships `padding: 0`; `margin: auto` on `.stage` still centres it
for human scrubbing. **Shorts rendered before 2026-09-04 still carry the offset
and need a re-render to pick up the fix.**

Check any render in one line — walk in from each edge until the pixel stops
matching the body colour; both counts must be 0:

```bash
ffmpeg -v error -y -ss 5 -i <mp4> -frames:v 1 /tmp/f.png
python -c "from PIL import Image; im=Image.open('/tmp/f.png').convert('RGB'); w,h=im.size; r=h//2; d=lambda p: max(p)<40; l=0
while l<w and d(im.getpixel((l,r))): l+=1
x=w-1
while x>0 and d(im.getpixel((x,r))): x-=1
print('dark-left',l,'dark-right',w-1-x)"
```

## Resolution is automatic

`tools/stage-size.js` resolves render/viewport resolution from the video's own
`.stage` CSS box; `--resolution WxH` overrides; 1920×1080 is the fallback. Wired
into `render-singlehtml-audio.js`, `smoke-singlehtml.js` and `probe-singlehtml.js`.

Auto-detection rather than a flag alone is deliberate: **a flag you must remember is
a flag a future session forgets**, and forgetting it recreates the letterbox artifact.

```bash
node tools/render-singlehtml-audio.js <slug> --bgm <bed>
```

(`--bgm none` is superseded for shorts — charter #3, 2026-08-13: full ad
sound, a driving bed ducked under the VO. Pick the bed per video until a
house bed is ratified.)

No `--resolution` needed. Verify every portrait render:

```bash
ffprobe -v error -show_entries stream=width,height -of default=noprint_wrappers=1 <file>.mp4
```

It must read `width=1080 / height=1920`. Regression harness for the path itself:
`videos/_qc-vertical/` (smoke + render + ffprobe; re-run after touching
`stage-size.js` or any viewport call site).

## Captions — word by word, paced to the clip

Shorts captions reveal **word by word**, not as a whole block (Umair ruling
2026-08-12). The skeleton wires this via `captionMode: 'words'` on the
`say`/`beat` wrappers; the engine is `showCaptionWords` in
`videos/_shared/narration.js`. How it paces:

- Word start times are spread across the clip's **measured `DUR`** entry
  (weighted by word length; punctuation stretches the gap after it), so the
  reveal starts with the audio and finishes just before it ends. This is why
  the DUR-paste step is not optional — without it every caption paces at a
  flat 4s.
- Hidden words keep their layout slot (`autoAlpha`), so line breaks are
  stable — the caption block never reflows while words appear.
- `showCaptionWords` also accepts a `times: number[]` array (seconds from
  clip start, one per word) for exact per-word timestamps if we later emit
  alignment data from ElevenLabs `with-timestamps`. Until then, DUR pacing
  is the sync mechanism.
- Long-form videos keep the classic block rise-in; word mode is opt-in.

## Authoring a short

1. Copy the 9:16 short skeleton to `videos/<slug>/index.html`.
2. `git add -f videos/<slug>/index.html && git commit` — **commit the clone before
   customizing** (INV-16). `videos/` is gitignored, hence `-f`.
3. Storyboard first (A6 — approved before beats are built): seam ledger, a
   named **motion hook per beat**, the narration↔surface contract (every
   narration claim names snapshot + selector; the beat declares the same
   `target:` in code), and a **`## Camera plan`** (2026-09-04) that declares
   THIS short's `Cadence:` (with the why), `Max hold:` and `Ease voice:` before
   any `punchIn` / `whipPan` is written — the storyboard sets the cadence per
   video, the tool (`composition-scan`) measures against it; a `Cadence:` line
   overrides the fixed shorts band. Format: `docs/storyboard-format-morph-chain-2026-05-10.md`.
4. Fill the TODO markers: slug, snapshot, title pill, TXT + beats, DUR.
5. Narration: `node tts/generate.js --video <slug> --engine elevenlabs`, then
   `node tools/measure-narration.js <slug>` and paste the emitted `DUR` block.
   Never hand-estimate — DUR is voice-coupled. Then gate it:
   `node tools/narration-qc.js <slug>` (pace, voice cluster, DUR drift —
   after EVERY tts render).

   **Budget for v3 overhead (measured, acceptance 2026-08-23):** every fresh
   eleven_v3 clip needs an onset trim (28–137ms head silence observed), and
   expect ~3 re-rolls per short for slurred pace or voice outliers. The full
   chain is tts → onset-trim → measure → narration-qc → repaste DUR;
   narration-qc is the gate that decides, not your ear.
6. The verify chain (A2 — all of it):
   ```bash
   node tools/validate-singlehtml.js <slug>
   node tools/narration-qc.js <slug>
   node tools/smoke-singlehtml.js <slug> --seconds 90
   node tools/probe-short.js <slug>
   node tools/render-singlehtml-audio.js <slug> --bgm <bed>
   node tools/dead-time.js <slug>
   node tools/dead-time.js <slug> --crop 1080:1200:0:300 --fail-over 2
   node tools/keyframes.js videos/<slug>/render/<slug>.mp4 --frames 16 --cols 4
   ```
   Run BOTH dead-time passes — full frame catches render defects, the band
   crop catches UI idleness the word captions would otherwise mask. The
   round's hard number: **zero band runs > 2s**.

   Probe hygiene for every step above: `docs/probe-playbook.md` (pixel truth,
   `__preview-ws` route-abort, foreground probes, side-measurement before diffs).

## Ship-render checklist (fix-round A4)

1. **Solo renders** (bac G): never run two renders — or a render + probe —
   concurrently on this machine. Dead-time verdicts from a contended render
   are invalid evidence (identical code measured 2.00s vs 3.03s under
   contention).
2. **Tail alignment** (ssn 2): the outro animation must loop THROUGH the
   render pad — 0.7s of audio once played past the last video frame. After
   render, verify video duration ≥ audio duration:
   `ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 <mp4>`
   and the same with `-select_streams a:0`.
3. **Mix check** (nvc E): passing `--bgm` is not enough — measure the result.
   Run the astats procedure documented in `tools/render-singlehtml-audio.js`'s
   header (bed-only window + speech window; targets there), or just render
   with `--print-mix`. Shorts band: bed-only ≈ −23 to −28 dB in loud
   sections at the 0.17 default (the −27 band, ruled 2026-08-22; the old
   0.32 / −18 band is explicit-override only).
4. **Smoke routing** (cc 5): single-HTML shorts smoke via
   `node tools/smoke-singlehtml.js <slug> --seconds <n>` —
   `check-video-playback.js` is legacy-engine only (requires `manifest.json`,
   rejects single-HTML slugs).
5. **Dead-time band scan**: `node tools/dead-time.js <slug> --crop 1080:1200:0:300`
   (crop excludes the caption zone). Run the full-frame pass too — see the
   verify chain above. Hard number: zero band runs > 2s.

**Shorts bookends (charter A5, 2026-08-13 — supersedes the old "no bookends"
spec):** every short opens on an animated Sullie intro sting (~1.6–2.0s) and
closes on an animated Sullie outro card (~2.5–3.0s), both from
`videos/_shared/shorts-kit.js` — **never a static slide**. What shorts still
drop: Kacie on-camera bookends, postIntro, the landscape title card. BGM is
IN (charter #3). Shorts are carved from that week's long-form and reuse its
snapshots — a short never justifies a capture session.

**Composite rules** (sfb 19, 20; ssn 5): a composite card gets ZONES — one
strip per role (instruments / verdict slot / subject / instruments) — and
the subject strip is never written into by anything else; verify by
measuring rects (probe-short's overlap check covers stage composites). A
real surface that is the beat's subject gets the full 1080 width or gets
cropped — never shrunk beside chrome. The offscreen-loader + `liftComposite`
chain (hidden IframeManager loads snapshots during the sting; clones lift
with inlined computed styles) is the sanctioned way to compose payoffs from
real markup with no capture session (sfb 15, 18 — console 426 noise during
loader swaps is the frozen captures' own external refs; normal).
Locale-sensitive widgets (intl-tel flags): swap the class in the LOADER doc
BEFORE lifting — `liftComposite` inlines COMPUTED styles, so the sprite
position only resolves where the snapshot stylesheet lives (bac D;
`tools/capture-gates.js` now warns on non-US selected flags at capture time).

**Verdicts are behaviour, not badges** (sfb 21, 26; ssn 6): when real UI
accepts or refuses something, animate the OBJECT — `nodYes` / `shakeNo` on
the surface itself. A banner or stamp alone is a caption of the event.
Corollary: *a missing primitive is a missing idea* — if the beat wants a
physical behaviour the kit lacks, add the primitive (shorts-bot precedent),
don't fall back to states-appearing.

**Original assets only** (sfb 25): no third-party marketing art — copyright.
Character/antagonist work is original inline SVG in the repo's register
(`videos/_shared/shorts-bot.js` precedent) — crisper at 1080×1920 than
bitmaps anyway.

**Probe-record idiom** (nvc 5; cc playbook): each beat's probe record
declares the thing that beat EXISTS TO SHOW (the ephemeral overlay, the
taught element), sampled inside its visibility window; the opening record
declares the composed frame's visual anchor, and strict taught-element
assertions live in the beat that teaches it.

## The carrier law (measured)

An area-visible event at least every **~2s** during any hold (sfb 8, 17, 29,
31 — measured four times; nvc 6; cc 8, 11; ssn 8, 16). Three axes, ALL
required:

| Axis | Threshold | Receipt |
|---|---|---|
| **Amplitude** | ≥ 4px | px-2 jolts are decoration at the 270px diff scale (bac 8) |
| **Area** | fraction of the FRAME, not the object | a 300px sprite moving 34px changes ~1% of frame pixels; a full-frame veil at 0.3 alpha changes 100% (sfb 31) |
| **Contrast** | jolt the TOPMOST surface | white-on-white never registers; on low-contrast surfaces use a dark/sheen sweep (ssn 16, nvc 6) |

| Proven carriers | Proven NON-carriers |
|---|---|
| camera moves (most reliable — sfb 38) | cursors, at any speed |
| band/card jitters ≥ 4px | alpha fades, any size |
| full-frame washes | thin ring strokes |
| sheen sweeps | typed 14px text |
| build cascades | smooth sprite bobs |
| slams / stamps | row pops at deep zoom; sub-60px/s drift (sfb 8, 17; cc 8) |

**Traverse, don't decorate** (cc 11): a long static wait gets a slow camera
drift — a fly with duration = the wait — onto the upcoming click target:
continuous full-frame motion that can't read dead. This killed a 4.8s hold
that a full round of pulses + jolts + sweeps had only dented (4.80s → 2.70s;
the traverse ended it — 1.90s longest run after). Typing moments need their
own carrier (input scale pulse + jolt); reading holds get subject-scale
pulses on the SMALL cell — 182px × 1.12 registers, a 1238px row nod does not
(cc 8).

`tools/dead-time.js --crop 1080:1200:0:300` is the measured form of this law
(its header carries the same numbers).

## Width physics

At the 1.78 portrait floor the visible slice is **607×674 logical px** of
the 1280×720 raster (sfb 27, 37; ssn 7; nvc 1; cc playbook).

- **Never frame or target anything wider than 607px.** Use the primary cell
  (`td.column-primary`, `td.code`), never the row.
- Real forms reflow to `max-width: 560px`, so the payoff fits the slice.
- **The field-centre rule is satisfiable ONLY inside x∈[303,977],
  y∈[337,383]** — a 46px vertical band. Outside it, framed-and-visible is
  the contract and probe-short's clamp-aware WARN (not FAIL) is correct.
- The builder form canvas measures 822–854px and cannot be shown whole in
  portrait — **anchor builder beats on the panel nav.**

## The beat contract

- **Arc** (sfb 35, 36): Hook → **Promise** → Steps → Payoff. The promise
  (what WPForms does about the problem, BY NAME) is the last thing cut when
  trimming — trim hook and steps instead. Beat length is the budget;
  narration is written to it, never the reverse (the 7.8s postIntro
  failure). First product UI belongs inside ~8s.
- **Motivated camera** (bac 2): one continuous journey — every move CAUSED
  by the story (reveal cascade → punch; config complete → whip to Save; Save
  click → payoff). Five independent scroll+fly hops in 27s earned a full
  "redo". More beat boundaries = more camera moves = better pacing (sfb 38),
  but each move needs a cause.
- **One slam per short** (sfb 13); treatments never repeat back-to-back;
  verdicts stamp or behave, they don't re-slam.
- **Framed nav — tell AND show** (nvc A; cc 10): when navigation is part of
  the teaching, frame the LABELED control first (sidebar at fill ~0.72
  clamps the slice so labels are readable), click ON CAMERA in spoken sync,
  THEN punch to the target. Never let panels teleport in while the sidebar
  is cropped to chevrons. Narration names the places.
- **Selector discipline** (cc 3, 7): named, verified anchors only — run
  `node tools/verify-selectors.js` on every fly/click target INCLUDING
  panel-machinery IDs (the `#add-fields` tab-li vs `#wpforms-add-fields-tab`
  pane confusion cost a probe round). Generic single-class first-match flies
  (`.wpforms-btn`) are banned.
- **The taught element always gets its own framing move** (sfb 6):
  `gcFramed` skips the fly when the target is already visible, silently
  degrading "framed action" to "visible action" — force the fly (`flyOpts`)
  for the element the beat teaches.
- **Re-run dead-time after ANY beat reorder** (sfb 30): a hold that only
  worked because something interrupted it becomes a hole when the
  interruption moves.

## Handoff: the frame sweep (MANDATORY — shorts)

Two videos shipped with defects any viewer pass would catch, and Umair
called it both times ("you didnt QC yourself?" — ssn 14; "its clear you
havent QC'd the video yourself. please do." — nvc C). Probes check declared
contracts; the 16-tile sheet samples every ~2.9s and skipped the exact nav
moments. The sweep reviews the film as a viewer. Once adopted it caught two
defects BEFORE handoff (nvc D — a spatial narration claim contradicting the
real sidebar order; cc 9 — fixture text colliding with the story).

Scope: **shorts, mandatory, before every handoff.** It operates on the
RENDERED MP4's extracted frames — it is the sanctioned exception to the
standing no-visual-QC rule, demanded by Umair himself. Long-form: RULED
2026-08-22 (fix-round README decision 1) — on request only; a long-form
handoff runs the sweep only when Umair asks or the session flags the build
as unusually risky. The no-visual-QC rule holds on long-form otherwise.

1. **Render done → dense sweep:** ~10 frames per beat at the beat's key
   moments — times from the beat schedule + `spokenAt` marks, NOT an even
   grid:
   ```bash
   ffmpeg -ss <t> -i videos/<slug>/render/<slug>.mp4 -frames:v 1 sweep-<t>.png
   ```
2. **Review each frame AS A VIEWER** — what a viewer must be able to READ,
   not what probes assert: labels legible? nav shown, not teleported?
   spatial narration claims match the real layout on the frame (nvc D)?
   fixture texture consistent with the story — no colliding names, stale
   warnings, wrong locale flags (cc 9, bac D; ssn 13's wrong-register spam
   message is the same class)?
3. **Report in the handoff WHAT was checked** — beats × frames, what passed.
4. **Debug rule while fixing:** when a dead run or defect survives ONE fix,
   frame-extract inside the run BEFORE the next attempt — the extracted
   caption pins true beat-relative time instantly (nvc 7: "one look replaced
   two wasted render cycles").

## Rules amended for this path

- CLAUDE.md anti-pattern **#9** — carries the portrait exception.
- **INV-1** (`docs/video-architecture-invariants-2026-05-12.md`) — 1080×1920 is a
  *different* native, not a smaller one. The no-transform structural rule is
  untouched, and the blur INV-1 guards against came from compressing a wide capture
  into a narrow stage, which cropping avoids by construction.

## QC rulings (2026-08-24)

- **Tail check:** the muxer pads audio to the next whole second, so video-length == audio-length is unreachable by design. The rule is intent-based: no frozen tail frame under live audio - the outro animates through the pad.
- **Band dead-time:** hard gate stays at 2s. Runs of 1.0-2.0s are review-flags, not failures - name the reason (cursor-glide window, sub-meter outro bob) in the QC notes.
