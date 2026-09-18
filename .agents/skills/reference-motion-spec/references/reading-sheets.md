# Reading the sheets

The scripts turn a video into three kinds of image. Each answers a different question. Reading
the wrong one for the question is the most common analysis error.

| Image | Grid (cols × rows) | Tile size (16:9 source) | Time per tile | Answers | Never use it for |
|---|---|---|---|---|---|
| `overview.png` | 4 × 6, 24 cells | 384×216 | ~duration ÷ 23 | acts, host element, repeats, palette | anything about timing |
| `c-NNN.png` (4 fps) | 5 × 6, 30 tiles | 384×216 | 0.25 s (7.5 s per sheet) | composition, framing, holds, candidate seams, what is alive in a hold | the KIND of a seam |
| `w-<t>.png` (24 fps) | 4 × 3, 12 tiles by default (`--span` changes it) | 480×270 (`--cell`) | 1/24 s (0.5 s per strip) | the kind of one seam, its frame count, outgoing / incoming treatments | composition |
| `f-NNN.png` (24 fps) | 6 × 8, 48 tiles | 320×180 (`--cell`) | 1/24 s (2 s per sheet) | in-beat motion: per-word timings, cursor path, typing cadence, ease shapes | nothing — but see "how much to read" |

Other aspect ratios keep the tile width and change the height. Raise the tile size when a caret,
a selection edge or per-letter sharpening has to be read: `windows.mjs --cell 640` for a strip,
`sheets.mjs --cell 480` for the 24 fps sheets. `frame.mjs --at <t>` gives the full-resolution frame
with a 10 % grid for measuring; `palette.mjs` samples colours.

## Badges, frame numbers, tile numbers

Every tile carries `#<frame> <t>s` in its lower-right corner. **The badge is the global frame
number on that sheet type's grid, 1-based:** `t = (frame − 1) / 24` on `f-` and `w-` sheets,
`t = (frame − 1) / 4` on `c-` sheets. The badge also prints `t`, so the two can be cross-checked.

**Tile numbers restart at 1 on every sheet**, row-major (left to right, then the next row):

- `c-` sheets: `tile = badge − 30 × (sheet − 1)` (c-002 tile 1 is badge #31)
- `f-` sheets: `tile = badge − 48 × (sheet − 1)` (f-003 tile 1 is badge #97)
- `w-` strips: `tile = badge − first_frame + 1` (`windows/index.json` lists each strip's
  `first_frame`, `last_frame` and `tiles`)
- `overview`: cells 1–24; `map.txt` maps each cell to its frame

`sheets/map.txt` lists every cell as `<sheet> tile <n> frame <k> <t>s`. When in doubt, resolve
there. Evidence rows cite `{"sheet": "<id>", "tiles": [n, ...]}` with the ids exactly as the
file names without `.png`: `c-001`, `f-003`, `w-2.83`, `overview`. A window's frame numbers are
absolute, so `w-2.83` tile 6 and `f-002` tile 25 can be the same frame; cite either.

## How much to read

- Every `c-` sheet, always.
- Every `w-` strip you cut, always. Expect two passes on some seams: a candidate read off a
  0.25 s tile is uncertain by ±0.25 s, and the default strip starts 3 frames before it.
- `f-` sheets: for a film under ~30 s, expect to read all of them — every 2 s sheet has a word
  pop, a swap, a rise, a caret or a settle in it, and the strips alone cannot give a typing
  cadence, a cursor path or a slow track. For a long film, read the sheets around the signature
  moments the `c-` sheets pointed at.

## Counting a seam's frames on a strip

1. Find the last tile that is entirely the outgoing composition, sharp and in place. Call it A.
2. Find the first tile that is the incoming composition, settled: sharp, at its final scale and
   position. Call it B.
3. `frames_24 = B − A`. If B is the tile right after A, the seam is 1 frame: a hard cut.
4. The tiles strictly between A and B are the transition. Describe each side from them:
   what the outgoing does (blur, dim, slide, shrink, get covered) and what the incoming does
   (arrive soft and sharpen, slide in, settle from large, pop, fade).
5. If A or B falls outside the strip, re-run `windows.mjs --at <better t>` (aim ~0.1 s earlier
   when the exit was cut off) or `--span 0.7`. Do not extrapolate.

`t` in the seam row is the time of the first tile after A (the first frame that differs).
`t_end` is the time of B.

**The join decides the kind; the sides decide the treatments.** Look at the frame pair where
one composition becomes the other:

- Two **sharp** tiles, the swap complete in one frame → `hard cut` (or match / reframe cut),
  `frames_24: 1`, whatever slides before or after it. A title that slides for 3 frames before
  the cut goes in `outgoing: {treatment: "slide", frames_24: 3}`; an incoming that keeps sliding
  or fading for 4 frames goes in `incoming: {treatment: "slide-in" | "fade-in", frames_24: 4}`
  and the seam's `ease` describes that settle. A is the last tile before the swap, B the swap
  tile: the count is the join, not the landing.
- Any **softness, scale change or overlap across the join** → a named transition, counted from
  A = the last tile before anything departs toward the join (position, blur or scale — a pan
  that leads into a blur is part of the seam) to B = the first settled incoming tile.
- When the outgoing is already in long exit motion (a phone tilting out for half a second, a
  disc shrinking), A is the last tile where that composition is still the subject; the exit is
  written into `outgoing`, and the kind describes the join (often `clear-then-resolve`).

**Decision tree for the soft kinds** (both sides visible around the join):

1. Is the outgoing treated across the join (blur, dim, scale, slide)? **No** → the incoming's
   arrival names it: soft → `soft-to-sharp resolve` (add `settle-from-small` / `slide-in` tokens
   when it also grows or slides); only faint, never soft → `hard cut` + incoming `fade-in`.
2. **Yes** — is the incoming a *different* composition arriving **in place at final scale**?
   → `blur-dissolve`.
3. **Yes** — is it a different composition arriving **oversized and/or offset** (from a corner,
   from below), settling into place while it sharpens? → `melt + settle-in` (the dim is usual,
   not required; the offset alone is enough; the outgoing may be a small element at the frame
   edge that softens for only 1–2 frames — look for it specifically, and measure the incoming's
   edge on two tiles before calling it "in place").
4. **Yes** — is it the **same** surface at a new scale? → `blur push` (a lens move;
   `direction: in` when it arrives larger, `out` when smaller). This branch needs the outgoing
   itself to have blurred or drifted toward the join. A sharp outgoing, a one-frame swap and a
   soft incoming of the same surface at a new scale is step 1's answer: `reframe cut` +
   `incoming: soft-then-sharp` — a lens cut, not a lens move, and not counted in `lens_moves`.

**Step 0, before the tree:** if the outgoing softens and then returns to sharp before the join,
that pulse is in-beat motion. A is the last sharp tile before the real departure; the pulse is
not part of the seam's frame count.

The 4 fps sheet and the 24 fps strip can disagree by a frame about what a 0.25 s tile shows
(each resample picks its own source frame). The strip is the record; the c-tile is the pointer.

## Telling the kinds apart (fast table; definitions in vocabulary.md)

| On the strip | Kind |
|---|---|
| A sharp, B sharp, nothing between | hard cut (match cut if a landmark holds its place; reframe cut if it is the same surface at another crop with state continuing) |
| both compositions visible at once, ghosted, **sharp**, constant brightness | crossfade (position-locked if shared blocks show no ghosting) |
| incoming tile soft, then sharper each tile, **in place at final scale**; outgoing was sharp until the cut | soft-to-sharp resolve |
| outgoing tiles go soft **and** a *different* incoming arrives soft, sharpens; no scale change | blur-dissolve |
| outgoing soft and darker; incoming oversized, offset, soft, shrinking into place | melt + settle-in |
| outgoing soft and drifting 2–3 tiles; then **the same surface** at a new scale (larger or smaller), soft, settling sharp | blur push, `direction: in` / `out` (a lens move) |
| outgoing sharp to a one-frame swap; **the same surface** at a new scale arrives soft and sharpens in 2–4 tiles | reframe cut + incoming soft-then-sharp (a lens cut; not counted in `lens_moves`) |
| the rest clears, but one element survives and the next composition grows out of it | Flip morph (the survivor is the carrier), even if it blurs or whips on the way |
| outgoing shrinks + softens; cut at peak blur; incoming oversized settles | inverse zoom-through |
| one element enlarges, no blur, until its interior is the whole frame | zoom-through |
| a soft-edged colour mass at successive positions across tiles; the composition behind sharpens in its wake | colour sweep |
| a mass anchored at a corner or edge **grows over several tiles** until it covers the frame | corner swell (a one-frame jump into a large mass is the sweep's first frame, not a swell) |
| a hard straight edge advancing per tile, B behind it | wipe |
| 1–3 tiles of directional smear, no readable content | whip |
| the same surface drifts, scales or scrolls across many readable tiles into a new composition; no cut, no unreadable smear (motion blur allowed) | travel (a lens move; the landing row carries verb, duration and ease) |
| outgoing shifts progressively one way and dims; incoming offset the other way lands; no smear | throw (write the direction) |
| one outline deforms across many tiles, never disappears | Flip morph |
| tiles darken / whiten to a flat field, then B fades up | dip-to-colour |
| one or two torn / noisy tiles between two sharp compositions | glitch cut |
| objects exit or shrink on an unchanged bed, an empty beat, then a soft incoming sharpens | clear-then-resolve |

## Camera vs object vs content (decide before the verb)

Pick two or three landmarks that survive the change (a logo, a corner mark, a panel edge, a
line of text).

- **All landmarks scale or shift together** and the frame edge reveals or hides content
  uniformly → **camera**. Write a landing with a verb. A larger crop of the same surface is a
  camera move even when it arrives under blur (blur push) or by a cut (reframe cut).
- **One thing changes** and the others stay → **object**. No landing; it is in-beat motion of
  that element (card rise, dropdown drop, chip swap, phone yaw).
- **The surface outline is fixed** and only its interior changes (text types, a list scrolls,
  a state flips, ticks fill) → **content**. No landing; write it in the scene's `hold_carrier`
  and in `ui_motion` / `text_motion`.

**Object motion has a velocity profile and pose extremes.** "The phone spins slowly" is not a
transcription. Read the tiles and write where the motion is fast, where it slows or dwells (the
readable pose), where it accelerates out, and the extreme poses it passes through (edge-on, fully
turned, off the top edge), with the tile where each happens. A builder animating a constant rate
from "spins slowly" gets the beat wrong even when every timing is right.

**A claim about a small change needs a measured pair of tiles.** "The disc breathes", "drops
~10 %": write the two tile numbers and the two measurements, or leave it out. Unsupported
micro-motion gets built, and then it is the builder's invention wearing your citation.

Landings are every framing the film lands on (including the opening frame and every cycle);
`lens_moves` counts the travelled ones. A landing reached by a cut is `movement_class: camera`
(the framing changed) even though nothing travelled. `hold` = the next landing's `t` − (this
`t` + `duration`), so a travelled move is not counted twice. A film whose landmarks never move
between cuts has a fixed lens: `lens_moves: 0`, and `lens_note` says so. A continuous follow is
a `track` landing with `duration` = its length and `hold: 0`.

**Twin rows.** A looped film repeats its seams, landings and text beats. Write every row (the
ledger is literal), set `twin_of` to the earlier row's id or `t`, verify the twin strip once, and
cite the twin's tiles or leave the evidence empty (the validator warns instead of failing).

## Measuring fill, zoom and colour

- **Fill** = the subject's extent ÷ the frame's shorter side. Measure on `frame.mjs --at <t>`
  (full resolution, 10 % grid) or count pixels on a tile against the tile height. Say the basis
  (`height`, `width`, `shorter-side`). A measurement frame is citable as
  `{"sheet": "frame-3.00", "tiles": []}`; its badge carries the same frame number as the
  f-sheet tile, so either cite works.
- **Zoom** = the same subject's fill at this landing ÷ its fill at the widest framing where it
  appears. Write both when both are measurable; the second is the check on the first.
- Type sizes: cap height ÷ frame height, as `size_frac` in `identity.type_roles`.
- **Colours**: `palette.mjs <video> --at t1,t2` for dominant colours per frame; `--xy x,y` for an
  exact pixel. Never estimate a hex by eye.

## Reading an ease off successive tiles

Pick one landmark and note its position (or the subject's height) on each tile of the move.

- Big first steps, then smaller → an `out` ease (`power3.out` / `expo.out`; if the first step is
  most of the travel, the whip-settle shape).
- Small first steps, then bigger → an `in` ease (`power2.in` / `power3.in`): exits, throws.
- Small, big, small → `inOut` (`power2.inOut`, `sine.inOut`): glides.
- A step past the final value and back → overshoot (`back.out`): punch landings.
- Equal steps → linear (`none`): wipes, sweeps, scroll beds.

Three tiles or fewer cannot name a curve. Use the vocabulary default for the kind and set the
ease's `basis` to `"vocabulary default"`; write `"read from strip"` only when the tiles show it.
Put the per-tile numbers in the row's `note` — the briefs render notes.

## Text, typing, selection

- **Word pop:** each new word is complete on its first tile at full size and opacity. Record
  the time of each first tile as `per_word_timing`.
- **Type-on:** a growing prefix with a caret. Cadence = characters added per tile × the sheet's
  fps; note bursts (2–3 characters in one tile, then a tile with none) and whether the input box
  grows while typing (`surface_growth`). Per-character times go in `note`.
- **Selection sweep:** the whole line is already there and a highlight band widens across it
  with a caret on its edge. At 4 fps it looks like typing; the strip shows no characters
  appearing.
- **Blur resolve:** the whole line is present, soft, and sharpens in place over 4–8 tiles.
- **Letter mask:** the readable prefix grows with a sharp edge and no caret.
- **Cut-in:** the whole line appears in one frame; swaps in place, one per frame, are cut-ins.

## Cursor and clicks

The cursor is a small dark shape; measure its height as a fraction of frame height (3–4 % in
most product films, 8–11 % in macro crops) and write it in `cursor_style`. Its approach runs
along one axis in decelerating steps. A click is: the cursor stops on the target (tile n), the
target changes state (tile n + k). `pre_pause = k / 24`. Record the reaction (fill change,
scale, ripple, none) and whether the cursor stays on screen afterwards.

## Presentation chrome, black tails, loops

- If the tiles show an editor, a slide, a browser or a phone mock around the film, the film is
  the inner panel. Write `meta.presentation_chrome`, cite only the inner region, and measure fill
  against the inner panel's height.
- `meta.black_head` / `black_tail` come from `probe.mjs`. A black tail of several seconds is
  an export artefact. The film's ending is the last non-black composition; say so in `do_not`.
- A film that **opens inside a transition** logs a seam at `t: 0` with `opens_film: true`
  (no outgoing; describe the incoming). A film that **repeats a cycle** logs every cycle's
  seams, scenes and landings (the ledger is literal), marks the join `loop_join: true`, writes
  `meta.loop`, and names the repeat in `structure.acts` so a builder can keep one cycle.

## Sound

`audio.json` onsets are energy rises on the mixed program, not identified events. `on_onset`
(±60 ms) is judged against the chance level `onset_rate_per_s × 0.12`; on a dense bed most
seams will "hit" by chance, on a flat bed none will. Always write `onset_delta_ms`: a miss inside
±100 ms is a near miss a builder should see even though `on_onset` is false. Write the count and the chance level in
`pacing.seams_on_onsets`, and when nothing lines up say so — a flat bed under a cut-driven film
is a real finding. `settle_on_onset` records when the settle frame, not the seam start, sits on
a hit.

## Precision

The 24 fps grid is a resample of the source. A 30 or 60 fps source has frames repeated or
dropped by the `fps=24` filter; a variable-rate screen recording more so. Every time in the spec
is therefore approximate within one sample (0.0417 s), and a frame count is ±1 at the edges.
Say "3–4 frames" when the strip is ambiguous. Never write a value more precise than the grid.

## Running the scripts

Run everything through `node scripts/<name>.mjs`. Never pass an ffmpeg filter string through a
shell by hand: colons, quotes and drive letters need three different escapings on Windows and
the scripts already handle them.
