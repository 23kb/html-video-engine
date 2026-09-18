---
name: reference-motion-spec
description: "Analyze a reference video into a tool-neutral motion spec and a build brief: 4 fps sheets, 24 fps seam strips, a seam ledger by kind with frame counts, camera plan, text and UI motion, eases. Use when asked to analyze a reference, motion spec for <file>, what does this ad do, seam ledger, 24 fps read, map my storyboard to the reference, scene map, replicate or make a video like this clip."
---

# reference-motion-spec

Reads a reference video and writes what a builder needs to rebuild its motion exactly: what is
on screen, how it is framed, how each composition joins the next (by name, with frame counts),
what moves inside each hold, how text and UI move, what the sound does. The output is a JSON
spec plus a brief rendered for the target tool. The skill never writes film code.

## Say this

- "analyze this reference: `path/to/clip.mp4`"
- "make a video like `clip.mp4` about `<topic>`" — analysis first, then the brief for the tool you build in
- "motion spec for `clip.mp4`, brief for After Effects" (or HyperFrames, Remotion, plain English)
- "which reference fits a 25-second ad that shows one action in real UI?" — picks from `library/`
- "map my storyboard to `clip.mp4`" — mapping mode, needs the storyboard or a beat list
- "analyze `https://…/video`" — the skill asks you to download the file yourself, and offers to do it for you

## Autopilot — the contract

The only mandatory input is the video file. One ask — "analyze `<file>`", "make a video like
`<file>` about `<topic>`" — runs the whole pipeline with **no questions in between**: probe →
sheets → audio → candidate seams → windows → strip reads → `cuts.json` → `motion-spec.json` →
`motion-spec.md` → brief for the target.

Optional inputs are used when given and never demanded: the target tool, a storyboard or beat
list (mapping mode then runs by itself and writes `scene-map.md`), a target length, notes about
what to keep or drop.

**No file, only a topic?** The skill picks from the shipped `library/` (and any specs the user
has added to it): `node scripts/library.mjs library --query "<what the video must do>"`, then
propose the top three with one reason each ("fixed lens, one action, typed copy — fits a
25-second product spot"). "Go" or "you pick" takes the first. The pick and its reason go into
`decisions.md`; the chosen entry's `motion-spec.json` is the spec from then on, no re-analysis.

Defaults when nothing is given: target `generic` unless the ask names one
(`hyperframes`, `claude-design`, `after-effects`, `remotion`); every candidate seam gets a strip; every `f-` sheet
is read for a film under ~30 s; a looped film is written as twins; a presentation canvas is
detected on the overview and the inner panel is the film; the output folder is
`./<stem>-motion-spec/` in the working directory (the project), never next to the video; if it already holds an analysis, `-motion-spec-2`.

**Every choice the skill makes on its own is one line in `<out>/decisions.md`** — what, why,
how to override:

```
target=generic — no target named — pass --target <tool>
loop: cycle 2 written as twins of cycle 1 — 7 strips frame-identical — set twins:false in the ask to read it fresh
chrome: inner panel = the film — an editor UI frames the clip on the overview — say "no chrome" to cite the full frame
```

The human reads that file only if they want to. Nothing in v1 needs consent (no uploads, no
downloads, no network), so nothing stops to ask. If the file is missing or unreadable, say so
and stop; that is the only halt.

**What it needs:** Node 18+ and `ffmpeg` / `ffprobe` on PATH (or `FFMPEG_PATH` set to the
binary or its folder). No other dependency. No network. Nothing is uploaded anywhere.

**When the user gives a URL instead of a file:** ask them to download the video themselves, and
offer to do it for them — "I can fetch it with `yt-dlp` if you want; you are responsible for the
source." Only on a yes: `yt-dlp -f "bv*[height<=1080]+ba/b" -o "<folder>/<name>.mp4" <url>`
(needs `yt-dlp` on PATH; say so if it is missing). Never fetch without that yes.

**What it does not do:** send frames to a remote model, or guess a transition from a 4 fps sheet.

## Files

| Path | Role |
|---|---|
| `scripts/probe.mjs` | `meta.json`: duration, fps, size, aspect, audio, black head / tail; refuses to overwrite an existing analysis |
| `scripts/sheets.mjs` | `sheets/`: `c-NNN.png` (4 fps, 5×6, 7.5 s each), `f-NNN.png` (24 fps, 6×8, 2 s each), `overview.png`, `map.txt` |
| `scripts/windows.mjs` | `windows/w-<t>.png`: a 12-tile 24 fps strip around one candidate seam (+ `index.json`) |
| `scripts/audio.mjs` | `audio.json`: LUFS / LRA / true peak, silences, RMS deciles, onsets, onset rate |
| `scripts/frame.mjs` | one full-resolution frame with a 10 % grid, for measuring fill and zoom |
| `scripts/palette.mjs` | dominant colours per frame and exact pixel samples, for `identity.palette` |
| `scripts/spec-from-cuts.mjs` | builds `motion-spec.json` from `meta.json` + `audio.json` + `cuts.json`, placeholders for what is left to write |
| `scripts/validate-spec.mjs` | schema + evidence rules for `cuts.json` and `motion-spec.json` |
| `scripts/render-brief.mjs` | `motion-spec.md` (`--target spec-md`) and `brief-<target>.md` |
| `scripts/brief-claude-design.mjs` | the `claude-design` target's renderer: contract, OM_SCENES, three motion helpers mapped to `Easing.*`, focus-point camera, seams as cue straddles in both idioms (GSAP on T / animate) |
| `scripts/library.mjs` | `catalog.json` + `examples-by-kind.md` over many specs; `--query` picks a reference by need |
| `scripts/package-library.mjs` | turns a working library into a shareable one: neutral ids, names redacted, only the cited strips (scaled JPEG), no source video, re-indexed |
| `library/` | shipped analyses (`ref-NN/`): `motion-spec.md` to read, `motion-spec.json` + `cuts.json` for tools, five briefs, the cited strips; `catalog.json` for `--query`, `examples-by-kind.md` for a real example of every kind |
| `<out>/decisions.md` | every choice the skill made on its own: what, why, how to override (written by the model, one line each) |
| `references/vocabulary.md` | every seam / camera verb / text reveal / UI motion / ease, with **recognition cues** for a 24 fps strip, and the reading rulings |
| `references/reading-sheets.md` | how to read the sheets: badges, tile numbering, counting frames, camera vs object vs content, measuring |
| `references/spec-schema.json` | the contract for `motion-spec.json` and the shared parts of `cuts.json` — **open it before writing JSON** |

All outputs land in one folder in the working directory (the project): `./<stem>-motion-spec/`
(override with `--out <dir>`). `probe.mjs` and `sheets.mjs` refuse to run into a folder that
already holds a `cuts.json` or `motion-spec.json` unless `--force`; on that refusal do not ask —
run into `<stem>-motion-spec-2/`, note it in `decisions.md`, and do not read the old analysis
while you work (reading it biases the strip reads). Outputs are deterministic: the same file
gives the same sheets and JSON, so a diff proves a regression.

## Pipeline

Run the scripts from the skill folder (or by absolute path). `<video>` is a local mp4/mov/webm.
Always through `node`; never hand an ffmpeg filter string to a shell yourself.

```
node scripts/probe.mjs  <video> --out <out>                        # 1  meta.json (check first that <out> is not someone's analysis)
node scripts/sheets.mjs <video> --out <out>                        # 2  c-*.png f-*.png overview.png map.txt
node scripts/audio.mjs  <video> --out <out>                        # 3  audio.json (skip if meta says audio:false)
# 4  READ: overview -> every c-sheet -> candidate seam list
node scripts/windows.mjs <video> --at t1,t2,... --out <out>        # 5  one 24 fps strip per candidate (12 tiles)
# 6  READ every strip against references/vocabulary.md; READ the f-sheets for in-beat motion
node scripts/frame.mjs   <video> --at t1,t2 --out <out>            #    full-res frames with a grid, for fill / zoom
node scripts/palette.mjs <video> --at t1,t2 --out <out>            #    dominant colours, for identity.palette
# 7  write cuts.json (seams, pacing, ui_motion, text_motion)
node scripts/validate-spec.mjs <out>/cuts.json --sheets <out>/sheets --windows <out>/windows --meta <out>/meta.json
node scripts/spec-from-cuts.mjs <out>                              # 8  motion-spec.json with the ledger copied in
# 9  fill identity / structure / camera / grammar / sound / eases / do_not
node scripts/validate-spec.mjs <out>/motion-spec.json --sheets <out>/sheets --windows <out>/windows
node scripts/render-brief.mjs <out>/motion-spec.json --target spec-md            # 10 motion-spec.md
node scripts/render-brief.mjs <out>/motion-spec.json --target <target>           #    brief for the target
# 11 write <out>/decisions.md (every choice made without asking); scene-map.md when beats were given
```

Steps 4, 6 and 9 are reading steps: the model opens the PNGs with its image reader and writes
JSON. The scripts serve the reading; they do not replace it. The f-sheets are read **before**
`cuts.json` because its pacing, UI-motion and text-motion sections (per-word timings, typing
cadence, cursor path, tick fills) can only be read there. If `cuts.json` changes later, run
`spec-from-cuts.mjs <out> --merge` to promote the ledger into the spec without touching the
hand-written sections. `--out` can be omitted when the default folder in the working directory is the video is
free; the scripts refuse to write into an existing analysis.

### Read order (do not skip ahead)

1. `meta.json`. Note black head / tail, whether the source fps is 24, and `frames_24`. If the
   frame is a presentation canvas (an editor, a slide, a phone mock around the film), decide
   which region is the film, write it into `meta.presentation_chrome`, and cite only that region.
2. `references/spec-schema.json` — the fields you are about to fill, what is required, which
   enums exist. Reading it once saves a validation loop.
3. `sheets/overview.png` — 24 cells across the whole film. Name the acts and the recurring host
   element. Notice repeats (the second half re-runs the first with new copy). Write
   `meta.reference_brand_terms` now: every product, brand, mascot and slogan word you can see;
   from here on those words appear nowhere else in the spec.
4. Every `c-NNN.png` in order — composition, framing, holds, what is alive inside each hold.
   Write the **candidate seam list**: every tile boundary where the composition changes, plus
   every boundary where something large enters or leaves. Over-list; the strips decide.
5. Every `windows/w-<t>.png` — one per candidate. This is where a seam gets its **kind**. Read
   the strip tile by tile against the recognition cues in `references/vocabulary.md`. Count
   frames as `reading-sheets.md` says (A = last outgoing tile, B = first settled incoming tile).
   If A or B is outside the strip, re-run `windows.mjs` aimed earlier or with `--span 0.7`.
6. The `f-NNN.png` sheets — for in-beat motion, per-word timings, cursor paths, typing cadence,
   slow tracks and ease shapes. For a film under ~30 s expect to read all of them; for a long
   film, the sheets around the signature moments the c-sheets pointed at. Use `--cell 480` on
   `sheets.mjs` or `windows.mjs --cell 640` when a caret or a selection edge has to be read.
   A looped film: verify that cycle 2 is frame-identical on a few strips, then write its rows
   as twins (`twin_of`) instead of reading them fresh.

### cuts.json — the seam ledger, pacing, UI motion, text motion

Write `cuts.json` before anything else. Shape (fields per `references/spec-schema.json`):

```
{ "version": 1, "source": "<file name>",
  "candidates": [ { "t": 0.85, "from_sheet": "c-001", "tiles": [4,5], "note": "title -> blue card" }, ... ],   // scratch list, not validated
  "seams":  [ { "id": "1", "t": 0.917, "kind": "hard cut", "frames_24": 1, "duration": 0.042,
                "outgoing": {"treatment": "none"}, "incoming": {"treatment": "none"},
                "carrier": "the brand mark, top-left", "on_onset": false, "ease": {"gsap": "none", "cubic_bezier": [0,0,1,1], "basis": "read from strip"},
                "evidence": [{"sheet": "w-0.90", "tiles": [3,4]}], "confidence": "high" }, ... ],
  "pacing": { "landing_cadence_per_s", "holds": [...], "longest_hold", "cuts_per_10s", "seams_on_onsets", "typing_cadence", "stagger_spacing" },
  "ui_motion": { "cursor_present", "cursor_style", "clicks": [...], "typing_beats": [...], "dropdowns": [...], "card_rises": [...], "payoffs": [...], "agent_vs_user" },
  "text_motion": [ { "t", "text_role", "mechanism", "per_word_timing": [...], "hold", "note", "evidence": [...] }, ... ],
  "camera_note": "one sentence: how many times the lens travels and how; what moves instead" }
```

Rules for every seam row:

- **`kind` is a vocabulary name**, never "transition" or "fade". If no cue matches, write
  `other` and describe the tiles in `note`. Directional kinds (throw, whip, wipe, slide, sweep)
  carry their direction in `outgoing.direction` / `incoming.direction`.
- **`frames_24`** is counted on the strip: A to B. **The join decides the kind**: two sharp
  tiles with the swap complete in one frame is a hard cut (**1 frame**) whatever slides or fades
  before or after it — the exit goes in `outgoing`, the settle in `incoming.frames_24` /
  `incoming.treatment`, and the seam's `ease` describes that settle (`none` when there is none).
  Any softness, scale change or overlap across the join is a named transition counted from the
  first frame that departs toward it. `t_end` = the settled frame's time.
- **`outgoing` / `incoming`** say what each side does as `+`-joined tokens (`blur+dim`,
  `slide-in+soft-then-sharp`, `settle-from-large+soft-then-sharp`) with direction and amount. A
  builder rebuilds from these two columns when the kind has no shared recipe.
- **`carrier`** names what stays continuous across the join (an element, a colour, a baseline,
  a corner mark, the cursor, the music), or `none`.
- **`on_onset`**: within ±60 ms of an `audio.json` onset; write `onset_delta_ms`. Judge the count
  against `audio.json`'s `chance_hit_per_seam`; `settle_on_onset` when the settle frame hits.
- **`evidence`**: the strip id and the tile numbers that show it. A row with no citation is a
  guess: set `confidence: "low"` and say so. `validate-spec.mjs` rejects an uncited row that
  claims medium or high confidence.
- **`opens_film: true`** on a seam at `t: 0` when the film starts inside a transition;
  **`loop_join: true`** on the seam that joins one cycle to the next. Every cycle's seams are
  written (the ledger is literal).
- **`note`** is allowed on every row and is rendered in the briefs: put the per-tile
  measurements that justify the kind there. `twin_of` marks a row that repeats an earlier one
  frame-for-frame (looped films); its evidence may cite the twin's strip.
- Name screen-space constants (a brand mark that survives every seam) once in
  `identity.persistent_elements`, not as the carrier of every row.

`pacing` answers: how often does the frame land somewhere new, how long is the longest hold and
what carries it, how many seams per 10 s, how many seams sit on audio onsets against the chance
level, typing cadence (chars/s and burst shape), stagger spacing between siblings. `ui_motion`
records the cursor (present? height as a fraction of frame height, path shape), every click
(target, reaction, the pause before the state changes), typing beats (with input growth),
selection sweeps, dropdown drop distance, card rise distance, payoff emphasis and the
before-hold, and which steps are performed by a cursor (user) versus appearing on their own
(agent). `text_motion` records each text beat's mechanism (word pop, letter mask, blur resolve,
type-on, selection sweep, slide, ...) with per-word timings where discrete.

### motion-spec.json — the deliverable

- **The spec never quotes the reference.** No on-screen words in quotes anywhere; no product,
  brand, mascot or slogan name anywhere except `meta.reference_brand_terms`, which lists them
  once (write it right after the overview read). A `subject` says what the element is and where
  (one headline line, centred, with a cursor under its last two words); `text_motion` carries
  counts and timings, never the words; a brand mark is "the brand mark", a product name "the
  product name", a mascot "the mascot". The validator REJECTS a spec that breaks this. Everything
  downstream (the storyboard's reference column, the briefs, the shared library) copies these
  strings verbatim, so this is where the reference stays private.
- **Fill the optional fields whenever the frames allow.** On landings: `box` (the subject's box
  from `frame.mjs`), `rotation_deg`, `trigger` (`press` with the click's `t` from `ui_motion.clicks`,
  or `beat`); on seams: `overlap_frames`, `blur_px_1080`, `dim_pct`. A brief for After Effects
  prints "measure" wherever these are missing; a spec that found five clicks and left every
  `trigger` empty is not finished.

`spec-from-cuts.mjs` copies the ledger in and leaves placeholders. Fill: `identity` (palette
from `palette.mjs`, type roles as fractions of frame height, ground, host element, brand role),
`structure` (acts + one scene per composition between two seams; `repeats` when a scene is a
cycle-2 twin), `camera` (cadence, `lens_moves`, max hold, ease voice, zoom range, `lens_note`,
one landing per framing with `move_in` verb, fill, duration, hold, **movement_class**),
`grammar`, `sound` (measured values are copied; write layers, sync points, ending), `eases`
(every ease used anywhere, GSAP name + cubic-bezier + frames), `do_not`, and `meta.use_when`
(one sentence: what this reference is good for — the library and its query carry it).

- **Fill** is measured on `frame.mjs` output: subject extent ÷ frame shorter side (say
  `fill_basis`). Zoom derives from the widest framing of the same subject. Never by feel.
- **movement_class** on every landing and scene: `camera` (whole composition reframes,
  including a larger crop of the same surface arriving under blur), `object` (one element
  changes), `content` (things change inside a stable surface). A card growing is `object`.
- **Landings** are every framing the film lands on — the opening frame at `t: 0`, every cut,
  every travelled move, in every cycle. `cadence_landings_per_s` = landings ÷ duration.
  **`lens_moves`** counts the travelled ones. A **fixed lens** is `lens_moves: 0`, and
  `lens_note` says what carries the film instead. A continuous follow is one `track` landing.
  A landing reached by a cut is `movement_class: camera` (the framing changed). `hold` = next
  `t` − (this `t` + `duration`).
- Every scene, landing, seam and text beat cites `sheet + tiles`. Run the validator with
  `--sheets` and `--windows` so the citations are checked against real files and each strip's
  own tile count.
- Render `motion-spec.md` with `render-brief.mjs --target spec-md`; do not hand-write it — the
  JSON is the source of truth and the two must not drift.

### Briefs (`render-brief.mjs --target ...`)

The same spec, rendered as build instructions for one tool. Nothing new is added: a brief is a
view of the spec. Every brief renders: identity, structure, camera plan (cadence, lens moves,
max hold, ease voice, zoom range), the landing table, beat by beat (with notes), the seam
ledger, pacing, UI motion, grammar, sound, eases, do-not. `--out` takes a directory or a file.

| target | what it maps |
|---|---|
| `hyperframes` | one clip per scene with `data-start` / `data-duration`, seams as timeline overlaps, eases by GSAP name |
| `claude-design` | Claude Design's composition engine (not HyperFrames): the `OM_SCENES` literal (name / dur / desc) as the outline, `CUES` per section, every seam as a tween straddling the next cue (or a `<Shot>` for a cut), the camera as decomposed `camTo` moves, exactly three motion helpers mapped from the eases, render-from-T and no live iframe stated once |
| `after-effects` | a brief an AE builder works from alone: comp size + fps, frame numbers 0-based at `--fps` (default 24); a **rig** section (the 3D-null camera stand-in — anchor = page point to centre, position = frame centre, scale = zoom %, X / Y rotation for three-quarter views, page precomps as 3D children, card lifts as child z moves, the cursor parented to its target) and a **gotchas** section (Rect Size temporal ease crashes through script → sliders + expressions, per-frame keys for a steering cursor, effects on collapsed layers apply after the transform, never remove every time-remap key, never read an expression back through a bridge, read the project state after a hard error); **per landing**: seconds + frame, anchor point (the `box` centre in source px, else `measure`), scale % (zoom × 100, or from fill — stated), rotation, move and hold in frames, the ease as BOTH the speed-0 influence pair (≈ when y1 ≠ 0 or y2 ≠ 1) AND the cubic-bezier to bake to per-frame keys, the trigger (press frame / beat / none); **per seam**: the Gaussian Blur radius at the comp height (from `blur_px_1080` or the 20 px @1080p default), dim as an Opacity target, overlap frames vs cut, HOLD keyframes for cuts, keyframe lists per phase, ease per phase, stable layer names (`S03 <subject>`, `S03>S04 seam`); a closing **measure before build** list of the optional fields the spec did not carry |
| `remotion` | `Sequence` table (from / durationInFrames), `interpolate` ranges, `Easing.bezier(...)` |
| `generic` | plain English per beat: what is on screen, what moves, how long, what ease, what the cut is |

Every brief opens with the rules that made replicas work (below) and the spec's `do_not` list.
Pass `--fps 30` (or 25, 60) when the target comp is not 24 fps; frame counts convert and are
marked.

## Mapping mode — "map my storyboard to the reference"

Runs by itself whenever the ask includes a storyboard, a beat list or a topic ("make a video
like `<file>` about `<topic>`"): the spec is written first, then the map. Input: the user's beat
list (or the topic, turned into beats that follow the reference's scene count) and the finished
`motion-spec.json`. Output: `scene-map.md` in the spec folder, one row per **reference scene, in
the reference's order**:

```
| ref scene | ref t | ref composition + framing | seam out (kind, frames) | our content | kept / dropped / added | our t (ratio) | evidence |
```

Rules: one spine reference — a second reference may fill a beat the spine has no scene for, and
the row says so. Beat count follows the reference, not the user's first draft; if the reference
runs its structure twice, the map runs twice (a builder may then keep one cycle on purpose). A
row that cannot say "this is the reference's shot with our content" is an invention: mark it
`OVERRIDE` with a one-line reason, never dress it in a citation. Time ratio = our beat length ÷
reference scene length; say it when it is not 1. Each row carries the reference's in-beat motion
(what moves inside the hold) and our equivalent; a live reference scene (text streaming, a label
cycling) gets a live substitute, not a still.

## Library mode — a by-product, not a project

The library grows when real analyses happen: every `<clip>-motion-spec/` folder produced for
real work lands in one shared folder (the user names it once) and
`node scripts/library.mjs <that folder> --out <folder>/catalog.json` re-indexes it. Two outputs:

- `catalog.json` — one entry per spec: tags (seam kinds, text mechanisms, lens, cursor, host
  element, motifs), camera verbs, `meta.use_when`. `--query "fixed lens, word pop, typing"` ranks
  them so a reference is chosen by need ("show one action quickly") instead of by memory.
- `examples-by-kind.md` — for every seam kind, text mechanism, camera verb and UI motion in the
  vocabulary, the clips + strips + tiles that show it (`blur push → <clip> w-2.80 tiles 6-11`).
  A builder opens a real strip instead of reading a definition; kinds with no example yet are
  listed so the gap is visible.

Write `meta.use_when` in every spec (one sentence: what this reference is good for); the
catalog and the query carry it. No batch run over old references: the library is what real work
leaves behind.

## Six rules, each from a shipped defect

1. **Read cuts at 24 fps.** A 4 fps sheet hides every 1–7-frame transition; two rebuild rounds
   shipped "blinks" because dissolves were logged as cuts. Never write a seam kind from a
   `c-` sheet.
2. **Camera, object and content motion are three different things.** A card growing is not a
   camera move. Confusing them makes a builder replace all three with one scale tween. And the
   reverse: the same surface arriving larger under blur *is* a lens move — do not log it as a
   dissolve.
3. **Every claim cites a sheet and tiles.** A remote model once invented a prop on a mascot that
   no frame shows; an earlier hand read logged a whip where the strip shows ticks filling. A
   claim without a citation is a guess and says so.
4. **Do not copy presentation chrome; watch for black tails.** If the film sits inside an editor
   or a slide, the inner panel is the film. A multi-second black tail is an export artefact; the
   ending is the last non-black composition. `probe.mjs` reports both.
5. **Say "exact replica" in the brief.** Left alone, a builder adds re-aims, glides and settles
   the reference never had, and the result scores as "camera too fast, not the reference".
6. **The 24 fps resample is approximate to 1/24 s.** Source frames may be repeated or dropped.
   Never claim recovered keyframes or source eases; name the ease from the strip's shape and
   record `basis`.

## Traps while reading

- A 1-frame difference between two sharp tiles is a hard cut even when the compositions look
  related; if a landmark stays put, it is a match cut or a reframe cut — name the carrier.
- A blur that appears on the incoming tile only, in place, at final scale, is a soft-to-sharp
  resolve. Both sides soft with two *different* compositions = blur-dissolve. Outgoing dims as
  well and the incoming arrives large from an offset = melt + settle-in. The **same** surface
  arriving ×2 under blur = blur push, a lens move.
- A colour mass with a soft edge crossing successive tiles is a colour sweep; a hard straight
  edge is a wipe; a mass growing from a corner over several tiles is a corner swell; a one-frame
  jump into a large mass is the sweep's first frame.
- One or two smeared tiles between sharp ones is a whip. Ticks filling or rows lighting are
  payoffs, not whips. Two sharp compositions with a directional offset ramp and no smear is a
  throw.
- Words that appear whole, one per tile, with no intermediate size or opacity are word pops; a
  growing readable prefix with a sharp edge is a letter mask; a soft line that sharpens in place
  is a blur resolve; a prefix with a caret is type-on; a highlight widening over text that is
  already there is a selection sweep.
- The cursor is a small dark shape that moves along one axis in decelerating steps; note the
  tile where it stops and the tile where the state changes — the gap is the pre-action pause.
- A hold is not dead time. Write what carries it (typing, cursor, settle, a colour cycling on a
  label, a live waveform). A film that measures still at frame level is usually alive in exactly
  those ways, and a rebuild that copies the cuts and not the carriers is stills.

## Privacy and rights

Analyze only files the user supplies. The spec's `meta.source` is a file name, never a URL or a
path. The skill does not download from social platforms and does not upload frames or audio
anywhere. A spec describes technique; it does not carry the reference's copy, logos or assets.
