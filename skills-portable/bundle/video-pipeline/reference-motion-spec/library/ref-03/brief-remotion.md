# Build brief — Remotion — ref-03

Source: ref-03 · 15.06 s · 1280×720 (16:9) · 24 fps source, read on a 24 fps grid · audio: yes · presentation chrome: none: the frame is the film; the the brand brand mark top-left is part of the composition (screen-space constant), not chrome.

Sections rendered: rules, mapping, identity, structure, camera plan, landings, sequences, beat by beat, seam ledger, pacing, UI motion, grammar, sound, eases, do-not

> Times are approximate within 1/24 s. Frame counts are on the 24 fps grid. No value below is a recovered keyframe or a source ease; eases are named from the strip's shape (see `basis`).

**Evidence ids** (the files sit beside this brief): `c-NNN` = 4 fps composition sheet in `sheets/` (tiles 1–30, 0.25 s each); `f-NNN` = 24 fps sheet in `sheets/` (tiles 1–48, 2 s per sheet); `w-<t>` = 24 fps strip in `windows/` around one seam (tile count per strip in `windows/index.json`); `frame-<t>` = full-resolution measurement frame in `frames/`; `overview` = 24 evenly spaced cells. Cites read `sheet:tiles` with ranges (`f-003:22-23`); `sheets/map.txt` resolves any cell to a frame and a time.

**Loop:** 7.5 s cycle (180 frames) x 2; opens on the sweep's first frame (frame 1 == frame 181); ends on frame 360 (14.958 s), one frame before a third join would land.. The ledger lists every cycle. Decide up front how a target of another length uses it: keep both cycles verbatim, keep one, or reuse the shots with new content (an OVERRIDE) — the reference's beat count per cycle still governs.

## Rules that made replicas work

1. **Build an exact replica.** Say those words in the build brief. Left alone, a builder adds re-aims, glides and settles the reference never had. Every landing and seam below is the whole movement budget.
2. **Read the seam strips before writing any transition.** A 4 fps read turns every 1–7-frame dissolve into a hard cut and the film ships blinks. The seam kinds below came from 24 fps strips; keep their frame counts.
3. **Camera, object and content motion are three different things.** A card growing is an object move; text typing inside a stable box is content; only a whole-composition reframe is camera. Build each with its own mechanism.
4. **A payoff arrives after a beat.** Show the "before" for the `before_hold` given, then the change with its own motion.
5. **Hold what the reference holds.** A hold is carried by the subject's own motion (typing, cursor, settle), not by a drift the reference does not have.

## Do not

- Do not add camera moves. The lens travels exactly once per cycle (the blur push into the input at 2.917 / 10.417); every other framing change is a hard cut, a soft-to-sharp resolve, a melt + settle-in or the sweep. No glides, no re-aims, no settles on the cuts.
- Do not build the loop join as a corner swell. The join is a one-frame jump into a sweep already 60 % across; the blue mass on the closing bed grows only ~6 % of width beforehand.
- Do not turn the exit slides (title left, wide input right, macro input left) into lens moves: the bed stays, the composition group slides and accelerates into the cut.
- Do not scale the card or bring it from a corner: it arrives soft about 12 % low and slides up ~5 frames while it sharpens (no scale change); the outgoing input softens 2 frames and is not dimmed.
- Do not log or rebuild the blur push as a dissolve: it is the same input surface arriving ~1.9x under blur, with the placeholder swapped for a caret under the blur.
- Do not rebuild the the copy residue at 1.875 / 9.375: it is a leftover of the source film's preceding scene caught by the loop export.
- Do not fill the three ticks together or with a pop: each is a 3-frame clockwise wipe, 0.29-0.375 s apart, top to bottom, and the cut follows the third by one frame.
- Do not centre the copy as a fixed line: the words pop whole (0.917, 1.0, 1.167) and the line re-centres on each pop.
- Do not let the typing complete: the prompt is cut off at the copy by the seam, typing 2 chars per 3 frames with a visible caret, and the input never grows.
- Do not animate the send press with scale or a ripple: the only reaction is the fill flip blue -> grey after a 5-frame rest; the cursor stays on the button afterwards and leaves down-right.
- Do not copy the black of unused sheet cells; the film has no black head or tail (probe: 0 / 0).
- Do not end on the sweep: the export stops on frame 360 (the copy bed), one frame before a third join. A single 7.5 s cycle is the honest unit; the second cycle is the export's repeat.
- Exact replica: use the timings above frame for frame; do not add micro-motion the tiles do not show (only the blue mass creep and the pale squares move inside the holds).

## Mapping

- `<Composition fps={24} durationInFrames={361} width={1280} height={720}>`; one `<Sequence from={in·fps} durationInFrames={(out−in)·fps}>` per scene.
- Camera landings: `interpolate(frame, [start, end], [from, to], { easing: Easing.bezier(...) , extrapolateRight: "clamp" })` on a wrapper transform; `cut` = a new Sequence.
- Seams: overlap the Sequences by `frames`; drive blur / opacity / translate / scale with `interpolate` using the treatments in the ledger.

## Identity

Palette: `#f6fdfd` ground (near-white bed under the title (palette.mjs 0.5 s, 96 %)) · `#fcfcfc` ground (near-white bed under the wide and macro input (2.5 s / 4.0 s, 96-97 %); carries a faint fine grid and a few pale squares) · `#0866f5` fill (brand blue as the whole-frame field behind the copy (1.5 s, 97 %)) · `#aedafc` ground (light-blue gradient bed of the send-state and card scenes (5.0 s: #aedafc 36 %, #cee8fd 28 %, #f0f6fb 33 %)) · `#cee8fd` ground (mid stop of the same gradient) · `#4796f8` ui-primary (send button fill before the click (5.0 s); flips to grey #a8a8a8 on the click) · `#010408` ink (the copy in the title, card copy) · `#1261bf` accent (the copy in the title is a dark-to-mid blue gradient (#05162d -> #1261bf)) · `#56a3f6` interstitial (the sweep / right-edge blue mass (pixel 1200,700 at 7.0 s); soft-edged, no hard boundary) · `#f9fbfd` ui-surface (checklist card (6.2 s, 75 %)) · `#a8a8a8` ui-body (hollow tick rings and the disabled send button)
Type: display title the copy 16.0% of frame height bold sans · statement the copy 10.4% of frame height regular sans · heading the copy (wide) 3.9% of frame height regular sans · heading (macro crop) 5.8% of frame height regular sans · placeholder in the wide input 2.2% of frame height regular mono · typed prompt (macro) 5.6% of frame height regular sans · card heading the copy 3.2% of frame height regular sans · card item title 3.9% of frame height medium sans · closing line the copy 4.2% of frame height bold sans · brand mark the copy 5.0% of frame height regular sans
Ground: Near-white flat bed with a very faint fine grid and two or three pale translucent squares that drift slowly; on the send-state and card scenes the bed becomes a soft light-blue gradient darkening toward the right and bottom; on the closing scene a soft-edged brand-blue mass sits at the right edge and creeps inward; the statement scene is a solid brand-blue field. No grain, no vignette, no photo.
Host element: The prompt input box: wide with a placeholder (S3), then a 1.9x crop of its left end while the prompt types (S4), then the right end of the send-state input with its button and the cursor (S5). The the brand brand mark is the screen-space constant on every frame.
Brand colour role: mixed

## Structure

- **Brand title and statement** 0.00–1.88 s — the copy under the sweep, then the copy on a blue field
- **Ask: the input in three framings** 1.88–5.50 s — wide with placeholder -> blur push into the macro left end while the prompt types -> cut to the right end, cursor sends
- **Payoff: the checklist ticks itself** 5.50–6.71 s — card settles in from below while it sharpens (melt + settle-in), three clock-wipe tick fills
- **Closing line, the sweep begins** 6.71–7.50 s — the copy on the bed while the blue mass creeps in from the right
- **Cycle 2 repeats cycle 1 frame-for-frame** 7.50–14.96 s — S8-S14 == S1-S7 with frames +180; the export stops on frame 360, one frame before a third join. A builder may keep one 7.5 s cycle on purpose.

## Camera plan

Cadence: 0.93 landings / s (~1 landing / 1.1 s across 14 landings, cuts included)
Lens moves: 2 travelled landings
Max hold: 1.33 s
Ease voice: snap on the 2 travelled landing(s) (from their eases); every other framing change is a cut — spec declared "cut"
Zoom range: 1–1.9
Lens: The lens travels twice in the export (once per 7.5 s cycle): a blur push from the wide input into a 1.9x crop of its left end at 2.917 / 10.417. Every other framing change is a hard cut, a melt + settle-in or the colour sweep; what moves instead is object motion (exit slides of the title and the macro input, the incoming settle of the send-state input, the cursor) and content motion (word pops, gradient sweep on the heading, type-on, tick fills, the blue mass creeping in at the right edge).

| t | subject | fill / zoom | move in | duration | hold | class | carries the hold | evidence | note |
|---:|---|---|---|---:|---:|---|---|---|---|
| 0.00 | title the copy (arriving under the sweep) | fill 0.16 (height) | cut | 0.00 | 0.92 | camera | sweep clears by 0.333; static 0.333-0.79; exit slide left over the last 4 frames | w-0.00:1,9 [high] | Opening frame; the film starts inside the colour sweep (seam 1, opens_film). Zoom undefined: no other framing of this subject. |
| 0.92 | blue field, statement the copy | fill 0.104 (height) | cut | 0.00 | 0.96 | camera | word pops at 0.917 / 1.0 / 1.167, then static white on blue for 0.7 s | w-0.80:7 [high] |  |
| 1.88 | wide input + heading (the widest framing of the host) | fill 0.23 (height) zoom 1 | cut | 0.00 | 1.04 | camera | soft-to-sharp resolve (grows from ~0.5x, fades up) 1.875-2.167; gradient sweep trail on the heading 2.0-2.75 (blue -> ink, left to right); pale squares on the bed; rightward drift + blur out from ~2.8 | w-1.90:3,10; f-002:13 [high] | Box height 118 px of 720 (frame.mjs 2.5 s): the reference for zoom. |
| 2.92 | macro crop of the input's left end | fill 0.31 (height) zoom 1.9 | blur push · Easing.bezier(0.16, 1, 0.3, 1) · expo.out | 0.21 | 1.33 | camera | type-on ~16-17 chars/s 3.083-4.417; slow leftward drift (~2 % of width) then an accelerating exit slide left over the last 6 frames | w-2.80:7-11; f-002:27 [high] | Box height 223 px of 720 (frame.mjs 4.0 s) / 118 px wide = 1.89x; heading cap 42 / 28 px = 1.5x (the two landmarks disagree; the box is the cleaner one). Lens move #1. The macro hold also drifts left ~2 % of width (box left edge 200 -> 197 of 480 across frames 76-105) before the exit slide. |
| 4.46 | right end of the send-state input + cursor | fill 0.18 (height) | cut | 0.00 | 1.04 | camera | incoming settle 4 frames; cursor approach 4.458-4.875 (diagonal, decelerating), rest 5 frames, click at 5.083 (blue -> grey), cursor exits down-right 5.25-5.5; blur-out over the last 2 frames | w-4.30:8,12 [high] | Incoming settles leftward 4 frames (~4 % of width, power3.out) - an object settle of the incoming composition, not a lens move; the frame is otherwise fixed. Box height 130 px of 720 (frame.mjs 5.0 s). |
| 5.50 | checklist card | fill 0.76 (height) | cut | 0.00 | 1.21 | camera | melt + settle-in: the card slides up ~12 % while sharpening 5.5-5.79; tick fills (clock wipe, 3 frames each) at 5.917, 6.292, 6.583; nothing else moves | w-5.30:11-12; f-003:43 [high] | Joined by a blur-dissolve (seam 6); the card arrives in place, so the framing changes without travel. Card 550 px of 720 tall (frame.mjs 6.2 s), cropped at the right edge. |
| 6.71 | closing line the copy | fill 0.042 (height) | cut | 0.00 | 0.79 | camera | the blue mass creeps inward ~6 % of width over 18 frames; pale squares on the bed; the line itself is static | w-6.55:8 [high] |  |
| 7.50 | title the copy under the sweep (cycle 2, loop join) | fill 0.16 (height) | cut | 0.00 | 0.92 | camera | sweep clears by 0.333; static 0.333-0.79; exit slide left over the last 4 frames (cycle 2: every time quoted here is +7.5 s) | w-7.20:11,17 [high] | The loop join is a one-frame jump into the sweep's first frame (seam 8). |
| 8.42 | blue field, statement (cycle 2) | fill 0.104 (height) | cut | 0.00 | 0.96 | camera | word pops at 0.917 / 1.0 / 1.167, then static white on blue for 0.7 s (cycle 2: every time quoted here is +7.5 s) | w-8.30:7 [high] |  |
| 9.38 | wide input + heading (cycle 2) | fill 0.23 (height) zoom 1 | cut | 0.00 | 1.04 | camera | soft-to-sharp resolve (grows from ~0.5x, fades up) 1.875-2.167; gradient sweep trail on the heading 2.0-2.75 (blue -> ink, left to right); pale squares on the bed; rightward drift + blur out from ~2.8 (cycle 2: every time quoted here is +7.5 s) | w-9.30:6,12 [high] |  |
| 10.42 | macro crop of the input's left end (cycle 2) | fill 0.31 (height) zoom 1.9 | blur push · Easing.bezier(0.16, 1, 0.3, 1) · expo.out | 0.21 | 1.33 | camera | type-on ~16-17 chars/s 3.083-4.417; slow leftward drift (~2 % of width) then an accelerating exit slide left over the last 6 frames (cycle 2: every time quoted here is +7.5 s) | w-10.30:7-11 [high] | Lens move #2 (twin of 2.917). |
| 11.96 | right end of the send-state input + cursor (cycle 2) | fill 0.18 (height) | cut | 0.00 | 1.04 | camera | incoming settle 4 frames; cursor approach 4.458-4.875 (diagonal, decelerating), rest 5 frames, click at 5.083 (blue -> grey), cursor exits down-right 5.25-5.5; blur-out over the last 2 frames (cycle 2: every time quoted here is +7.5 s) | w-11.80:8,12 [high] |  |
| 13.00 | checklist card (cycle 2) | fill 0.76 (height) | cut | 0.00 | 1.21 | camera | melt + settle-in: the card slides up ~12 % while sharpening 5.5-5.79; tick fills (clock wipe, 3 frames each) at 5.917, 6.292, 6.583; nothing else moves (cycle 2: every time quoted here is +7.5 s) | w-12.80:11-12; f-007:31 [high] |  |
| 14.21 | closing line the copy (cycle 2) | fill 0.042 (height) | cut | 0.00 | 0.75 | camera | the blue mass creeps inward ~6 % of width over 18 frames; pale squares on the bed; the line itself is static (cycle 2: every time quoted here is +7.5 s); the export ends on frame 360 before a third sweep starts | w-14.05:8; w-14.70:17 [high] | Holds to the last frame (360, 14.958 s). No third join. |

## Sequences

| scene | from (frames) | durationInFrames | subject | seam out | overlap frames |
|---|---:|---:|---|---|---:|
| S1 | 0 | 22 | display title the copy on the near-white bed, arriving from under the rightward blue sweep | hard cut | 1 |
| S2 | 22 | 23 | solid brand-blue field with the white statement the copy | soft-to-sharp resolve | 7 |
| S3 | 45 | 25 | wide prompt input (placeholder the copy) under the heading the copy, near-white bed | blur push | 5 |
| S4 | 70 | 37 | macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge | hard cut | 1 |
| S5 | 107 | 25 | right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed | melt + settle-in | 7 |
| S6 | 132 | 29 | white checklist card the copy with three items and tick rings, on the light-blue gradient bed | hard cut | 1 |
| S7 | 161 | 19 | small bold the copy centred on the near-white bed; soft blue mass at the right edge | colour sweep | 8 |
| S8 | 180 | 22 | display title the copy on the near-white bed, arriving from under the rightward blue sweep (cycle 2) | hard cut | 1 |
| S9 | 202 | 23 | solid brand-blue field with the white statement the copy (cycle 2) | soft-to-sharp resolve | 7 |
| S10 | 225 | 25 | wide prompt input (placeholder the copy) under the heading the copy, near-white bed (cycle 2) | blur push | 5 |
| S11 | 250 | 37 | macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge (cycle 2) | hard cut | 1 |
| S12 | 287 | 25 | right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed (cycle 2) | melt + settle-in | 7 |
| S13 | 312 | 29 | white checklist card the copy with three items and tick rings, on the light-blue gradient bed (cycle 2) | hard cut | 1 |
| S14 | 341 | 18 | small bold the copy centred on the near-white bed; soft blue mass at the right edge (cycle 2) | — | — |

## Beat by beat

### S1 · 0.00–0.92 s · display title the copy on the near-white bed, arriving from under the rightward blue sweep

- **On screen:** display title the copy on the near-white bed, arriving from under the rightward blue sweep. centred; title 0.52 of width, baseline at ~0.59 of height. Fill 0.16.
- **What moves (class):** content, object. Hold carried by: sweep clears by 0.333; static 0.333-0.79; exit slide left over the last 4 frames.
- **Landing 0.00 s:** cut → title the copy (arriving under the sweep), fill 0.16 height; camera. w-0.00:1,9 Note: Opening frame; the film starts inside the colour sweep (seam 1, opens_film). Zoom undefined: no other framing of this subject.
- **Text 0.00 s:** display title 'the brand' — other, 0.33 s, hold 0.58 s. w-0.00:1-8; f-001:1-8,19-22 Note: Revealed left to right in the wake of the colour sweep: each letter is soft under the mass's soft edge and sharp one frame after the edge passes (a wipe-shaped blur reveal, not a mask and not an in-place blur resolve). 'Ask' is ink, 'the brand' a blue gradient. Exits by a 4-frame slide left at 0.79-0.875.
- **Out (0.92 s): hard cut**, 1 f. Outgoing slide left (title x at 480-px strip scale 108,108,108,100,88,78 on frames 17-22: ~-6% of frame width, accelerating) [the title is already in exit motion; the bed does not move]; incoming none [solid blue field with the word 'Ai' already present on the first incoming frame]. Carrier: the the brand brand mark top-left (stays in place on the blue field); nothing else. Not on a hit. Ease none cubic-bezier(0, 0, 1, 1). w-0.80:3-7; f-001:19-23 Exit slide of the title reads power2.in (steps 0, -8, -12, -10 of 480 then the cut). The cut lands on the first word of the statement.

### S2 · 0.92–1.88 s · solid brand-blue field with the white statement the copy

- **On screen:** solid brand-blue field with the white statement the copy. line centred (final centre ~0.51, 0.49); re-centred on each word pop. Fill 0.104.
- **What moves (class):** content. Hold carried by: word pops at 0.917 / 1.0 / 1.167, then static white on blue for 0.7 s.
- **Landing 0.92 s:** cut → blue field, statement the copy, fill 0.104 height; camera. w-0.80:7
- **Text 0.92 s:** statement 'Ai - powered' (white on brand blue) — word pop at 0.92 / 1.00 / 1.17 s, 0.25 s, hold 0.71 s. f-001:22-30; w-0.80:6-10 Note: Each word is whole at full size and opacity on its first frame; no tile shows an intermediate. The line re-centres on every pop: the 'Ai' glyph's left edge moves 195 -> 165 -> 120 of 480 on frames 23, 25, 29. The first word lands on the cut itself.
- **Out (1.88 s): soft-to-sharp resolve**, 7 f. Outgoing none [blue field sharp and static to the last frame; the bed flips blue -> near-white on the cut frame]; incoming settle-from-small+soft-then-sharp+fade-in in from ×0.5 [heading + wide input arrive faint AND soft on the first frame after the cut, grow from roughly half size (measured by eye on two tiles) and sharpen in place over 7 frames; a residual line from the preceding source scene slides right and fades over the same frames]. Carrier: the the brand brand mark top-left; the bed flips blue -> near-white in the same frame. Not on a hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-1.90:2-10; w-1.80:5-12; f-001:45-48; f-002:1-5 Kind corrected from the blind read (hard cut + fade-in): the incoming is soft, not only faint — see w-1.90 tiles 3-6 at 480 px — and it grows, so this is a resolve with a settle-from-small incoming.

### S3 · 1.88–2.92 s · wide prompt input (placeholder the copy) under the heading the copy, near-white bed

- **On screen:** wide prompt input (placeholder the copy) under the heading the copy, near-white bed. centred; box 0.69 of width x 0.164 of height, top at 0.45 of height; heading above it. Fill 0.23.
- **What moves (class):** content, camera. Hold carried by: soft-to-sharp resolve (grows from ~0.5x, fades up) 1.875-2.167; gradient sweep trail on the heading 2.0-2.75 (blue -> ink, left to right); pale squares on the bed; rightward drift + blur out from ~2.8.
- **Landing 1.88 s:** cut → wide input + heading (the widest framing of the host), fill 0.23 height zoom 1; camera. w-1.90:3,10; f-002:13 Note: Box height 118 px of 720 (frame.mjs 2.5 s): the reference for zoom.
- **Text 1.88 s:** residual line 'your broker portal.' (leftover of the source film's preceding scene) — letter mask, 0.21 s, hold 0.00 s. w-1.90:3-8; f-001:46-48; f-002:1-3 Note: An EXIT, not an entrance: the readable suffix shrinks from the left with a sharp edge over frames 46-50 ('your broker portal.' -> 'broker portal.' -> 'oker portal.' -> 'ker portal.' -> 'er portal.') while fading. Present only because the loop export starts the scene mid-transition; do not rebuild it.
- **Text 1.88 s:** heading 'Your AI assistant for all things the brand' + wide input with mono placeholder — blur resolve, 0.29 s, hold 0.75 s. w-1.90:3-10; f-002:1-5 Note: Opacity ramp over 7 frames (46-53); edges crisp while ghosted at 640 px. The heading arrives all light-blue and then matures to ink by a gradient sweep trail (next row). Corrected from the copy: the line is soft as well as faint on its first frames and sharpens in place while growing from ~0.5x.
- **Text 2.00 s:** heading 'Your AI assistant for all things the brand' — gradient sweep trail, 0.75 s, hold 0.17 s. f-002:7,10,13,16,19 Note: The blue-to-ink boundary rides left to right: whole line blue at 2.25 (f-002 tile 7), 'all things the brand' blue at 2.5 (tile 13, and frame.mjs 2.5), 'the brand' only at 2.625 (tile 16), all ink by 2.75 (tile 19). Measured pair: tile 7 vs tile 19.
- **Out (2.92 s): blur push**, 5 f. Outgoing blur+slide right (heading x at 480-px scale 120,120,122,127,130,142,152,182 on frames 65-72 (accelerating, ~13% of width by frame 72); blur visible on frames 71-72) [the drift starts ~4 frames before the blur]; incoming slide-in+soft-then-sharp right from ×1.9 [the same input box ~1.9x (box height 118 px wide framing -> 223 px macro, frame.mjs 2.5 s vs 4.0 s), arriving soft and left-shifted (box left edge 152,182,190,200 of 480 on frames 73-76), caret already in it; sharp by frame 75]. Carrier: the input surface and its heading: same element, larger crop; the state changes under the blur (placeholder 'Write me a health benifits poem' -> empty box with a caret). Not on a hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-2.80:1-11; f-002:20-27 The one lens move of the cycle. Movement class camera: heading and box scale together, the frame edge crops the box's right end. Exit power2.in (vocabulary default); entry decelerates 30, 8, 10 of 480 over three tiles, too few to name a curve.

### S4 · 2.92–4.46 s · macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge

- **On screen:** macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge. box left edge at ~0.44 of width, box 0.31 of frame height, cropped right; heading top-right. Fill 0.31.
- **What moves (class):** camera, content. Hold carried by: type-on ~16-17 chars/s 3.083-4.417; slow leftward drift (~2 % of width) then an accelerating exit slide left over the last 6 frames.
- **Landing 2.92 s:** blur push over 0.21 s (expo.out, cubic-bezier(0.16, 1, 0.3, 1)) → macro crop of the input's left end, fill 0.31 height zoom 1.9; camera. w-2.80:7-11; f-002:27 Note: Box height 223 px of 720 (frame.mjs 4.0 s) / 118 px wide = 1.89x; heading cap 42 / 28 px = 1.5x (the two landmarks disagree; the box is the cleaner one). Lens move #1. The macro hold also drifts left ~2 % of width (box left edge 200 -> 197 of 480 across frames 76-105) before the exit slide.
- **Text 3.08 s:** prompt text in the macro input — type-on, 1.33 s, hold 0.00 s. f-002:27,30,33,36,39,42,45,48; f-003:1,4,7,10-11 Note: See ui_motion.typing_beats for per-character times. 2 chars per 3 frames, caret on every frame, the box does not grow, cut off mid-word ('Pl') by the seam at 4.458.
- **Typing 3.08–4.42 s:** prompt text in the macro input; ~16-17 chars/s; 1 char per frame for 2 frames then 1 idle frame; steady, no long bursts; blue caret visible on every frame; none: the input keeps its size; the camera drifts instead (box left edge 200 -> 183 of 480 across the beat). f-002:27-48; f-003:1-11
- **Out (4.46 s): hard cut**, 1 f. Outgoing slide left (macro box left edge at 480-px scale 207,207,205,200,197,188,183 on frames 101-107: ~-5% of width, accelerating) [typing continues to the last frame ('Compare the brand Pl|')]; incoming slide-in left [the send-state input's right end lands from the right: box right edge 355,345,340,337,335 of 480 on frames 108-112 (~4% of width, steps 10,5,3,2); the cursor enters with it at the lower right]. Carrier: the the brand brand mark; a text input of the same family (rounded box) but a different crop, copy ('...u need to know'), border weight and bed, so no shared landmark holds its place. Not on a hit. Ease power3.out cubic-bezier(0.33, 1, 0.68, 1). w-4.30:1-12; f-003:5-16 Not a reframe cut: the copy in the box changes ('Compare the brand Pl' -> '...u need to know'), the border becomes a 2-px blue stroke and the bed gains a blue gradient, so it is a new composition that happens to use the same input styling.

### S5 · 4.46–5.50 s · right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed

- **On screen:** right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed. box runs off the left edge, right edge at ~0.68 of width, vertical centre ~0.5; button at (0.62, 0.5). Fill 0.18.
- **What moves (class):** object, content. Hold carried by: incoming settle 4 frames; cursor approach 4.458-4.875 (diagonal, decelerating), rest 5 frames, click at 5.083 (blue -> grey), cursor exits down-right 5.25-5.5; blur-out over the last 2 frames.
- **Landing 4.46 s:** cut → right end of the send-state input + cursor, fill 0.18 height; camera. w-4.30:8,12 Note: Incoming settles leftward 4 frames (~4 % of width, power3.out) - an object settle of the incoming composition, not a lens move; the frame is otherwise fixed. Box height 130 px of 720 (frame.mjs 5.0 s).
- **Click 5.08 s:** send button (up-arrow) at the right end of the input → fill blue (#4796f8) -> grey, no scale change, no ripple; the cursor stays on the button 4 more frames; cursor rests 0.21 s first. w-4.85:5-10; f-003:22-27
- **Out (5.50 s): melt + settle-in**, 7 f. Outgoing blur (the input (right end, send button) goes soft over 2 frames (slightly, then unreadable); no dim; the bed is unchanged); incoming slide-in+soft-then-sharp up from ×1 [the checklist card arrives soft about 12 % of frame height LOW (card top 70 px into a 270 px tile on the first frame, 40 px four frames later) and slides up while sharpening; its left edge stays at 100/480 and the heading width does not change, so no horizontal or scale settle]. Carrier: the light-blue gradient bed (unchanged through the join) and the the brand brand mark. Not on a hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-5.30:8-12; f-003:36-43 Kind corrected from the blind read (blur-dissolve): the outgoing softens AND the incoming settles from an offset (up ~12 %), so this is melt + settle-in without a dim, not a dissolve in place.

### S6 · 5.50–6.71 s · white checklist card the copy with three items and tick rings, on the light-blue gradient bed

- **On screen:** white checklist card the copy with three items and tick rings, on the light-blue gradient bed. card left edge at 0.21 of width, top 0.12, bottom 0.88, right edge off frame; content left-aligned inside. Fill 0.76.
- **What moves (class):** content. Hold carried by: melt + settle-in: the card slides up ~12 % while sharpening 5.5-5.79; tick fills (clock wipe, 3 frames each) at 5.917, 6.292, 6.583; nothing else moves.
- **Landing 5.50 s:** cut → checklist card, fill 0.76 height; camera. w-5.30:11-12; f-003:43 Note: Joined by a blur-dissolve (seam 6); the card arrives in place, so the framing changes without travel. Card 550 px of 720 tall (frame.mjs 6.2 s), cropped at the right edge.
- **Text 5.58 s:** checklist card copy (heading, three titles, three subtitles) — blur resolve, 0.17 s, hold 0.96 s. f-003:39-43; w-5.30:11-12 Note: The whole card, copy included, is present soft on frame 135 and sharpens in place over 4 frames; no per-line stagger.
- **Payoff 5.92 s:** tick 1 fills: hollow grey ring -> dark disc with a white check, drawn as a clockwise clock wipe from 12 o'clock; emphasis tick fill; show the before for 0.33 s. f-003:46-48; f-004:1
- **Payoff 6.29 s:** tick 2 fills (same clock wipe); emphasis tick fill; show the before for 0.71 s. f-004:7-10
- **Payoff 6.58 s:** tick 3 fills (same clock wipe); the cut to 'the brand.' follows one frame after it completes; emphasis tick fill; show the before for 1.00 s. w-6.55:4-7; f-004:14-17
- **Out (6.71 s): hard cut**, 1 f. Outgoing none [card sharp and static; the third tick completes on frame 161, the cut is on 162]; incoming none ['the brand.' small bold line centred, whole on its first frame]. Carrier: the light bed with the soft blue mass at the right edge (present on both sides), the the brand brand mark. Not on a hit. Ease none cubic-bezier(0, 0, 1, 1). w-6.55:7-9; f-004:17-19 The cut follows the third tick fill by one frame: payoff, then title.

### S7 · 6.71–7.50 s · small bold the copy centred on the near-white bed; soft blue mass at the right edge

- **On screen:** small bold the copy centred on the near-white bed; soft blue mass at the right edge. centred (0.5, 0.49); mass covers ~0.15-0.2 of width at the right, diagonal soft edge. Fill 0.042.
- **What moves (class):** content. Hold carried by: the blue mass creeps inward ~6 % of width over 18 frames; pale squares on the bed; the line itself is static.
- **Landing 6.71 s:** cut → closing line the copy, fill 0.042 height; camera. w-6.55:8
- **Text 6.71 s:** closing line 'the brand.' (small bold, centred) — cut-in, 0.04 s, hold 0.79 s. w-6.55:7-9; f-004:18-20 Note: Whole on its first frame; static to the loop join.
- **Out (7.50 s): colour sweep**, 8 f. Outgoing covered (one-frame jump: the closing bed (blue mass ~35% of width at the right edge) is replaced by the sweep frame (mass ~60% of width, 'Ask' visible at left)) [the export loops here: frame 181 == frame 1]; incoming reveal-behind+soft-then-sharp right [identical to seam 1's incoming]. Carrier: the blue colour (the right-edge mass of the closing scene becomes the sweep mass), the near-white bed, the the brand brand mark. Not on a hit. Ease none cubic-bezier(0, 0, 1, 1). w-7.20:8-17; f-004:36-44 A one-frame jump into a large moving mass is the sweep's first frame, not a corner swell (the mass grows only ~6% of width over frames 162-180 before the jump). The join is the loop point of the export.

### S8 · 7.50–8.42 s · display title the copy on the near-white bed, arriving from under the rightward blue sweep (cycle 2)

- **On screen:** display title the copy on the near-white bed, arriving from under the rightward blue sweep (cycle 2). centred; title 0.52 of width, baseline at ~0.59 of height. Fill 0.16.
- **What moves (class):** content, object. Hold carried by: sweep clears by 0.333; static 0.333-0.79; exit slide left over the last 4 frames (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S1.
- **Note:** Frame-for-frame twin of S1 (frames +180). The audio does not repeat.
- **Landing 7.50 s:** cut → title the copy under the sweep (cycle 2, loop join), fill 0.16 height; camera. w-7.20:11,17 Note: The loop join is a one-frame jump into the sweep's first frame (seam 8).
- **Text 7.50 s:** display title 'the brand' (cycle 2) — other, 0.33 s, hold 0.58 s. w-7.20:11-17; f-004:37-44 Note: Twin of the 0.0 row.
- **Out (8.42 s): hard cut**, 1 f. Outgoing slide left (as seam 2: ~-6% of width over 4 frames); incoming none. Carrier: the the brand brand mark. Not on a hit. Ease none cubic-bezier(0, 0, 1, 1). w-8.30:3-7; f-005:7-11 Cycle 2 twin of seam 2 (frames +180).

### S9 · 8.42–9.38 s · solid brand-blue field with the white statement the copy (cycle 2)

- **On screen:** solid brand-blue field with the white statement the copy (cycle 2). line centred (final centre ~0.51, 0.49); re-centred on each word pop. Fill 0.104.
- **What moves (class):** content. Hold carried by: word pops at 0.917 / 1.0 / 1.167, then static white on blue for 0.7 s (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S2.
- **Note:** Frame-for-frame twin of S2 (frames +180). The audio does not repeat.
- **Landing 8.42 s:** cut → blue field, statement (cycle 2), fill 0.104 height; camera. w-8.30:7
- **Text 8.42 s:** statement 'Ai - powered' (cycle 2) — word pop at 8.42 / 8.50 / 8.67 s, 0.25 s, hold 0.71 s. f-005:10-18; w-8.30:6-10 Note: Twin of the 0.917 row.
- **Out (9.38 s): soft-to-sharp resolve**, 7 f. Outgoing none [blue field sharp and static to the last frame; the bed flips blue -> near-white on the cut frame]; incoming settle-from-small+soft-then-sharp+fade-in in from ×0.5 [heading + wide input arrive faint AND soft on the first frame after the cut, grow from roughly half size (measured by eye on two tiles) and sharpen in place over 7 frames; a residual line from the preceding source scene slides right and fades over the same frames]. Carrier: the the brand brand mark. Not on a hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-9.30:5-12; f-005:33-41 Cycle 2 twin of seam 3 (frames +180). Kind corrected from the blind read (hard cut + fade-in): the incoming is soft, not only faint — see w-1.90 tiles 3-6 at 480 px — and it grows, so this is a resolve with a settle-from-small incoming.

### S10 · 9.38–10.42 s · wide prompt input (placeholder the copy) under the heading the copy, near-white bed (cycle 2)

- **On screen:** wide prompt input (placeholder the copy) under the heading the copy, near-white bed (cycle 2). centred; box 0.69 of width x 0.164 of height, top at 0.45 of height; heading above it. Fill 0.23.
- **What moves (class):** content, camera. Hold carried by: soft-to-sharp resolve (grows from ~0.5x, fades up) 1.875-2.167; gradient sweep trail on the heading 2.0-2.75 (blue -> ink, left to right); pale squares on the bed; rightward drift + blur out from ~2.8 (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S3.
- **Note:** Frame-for-frame twin of S3 (frames +180). The audio does not repeat.
- **Landing 9.38 s:** cut → wide input + heading (cycle 2), fill 0.23 height zoom 1; camera. w-9.30:6,12
- **Text 9.38 s:** heading + wide input (cycle 2) — blur resolve, 0.29 s, hold 0.75 s. w-9.30:6-12; f-005:34-41 Note: Twin of the 1.875 row, residue included (f-005 tiles 34-38). Corrected from the copy: the line is soft as well as faint on its first frames and sharpens in place while growing from ~0.5x.
- **Text 9.50 s:** heading (cycle 2) — gradient sweep trail, 0.75 s, hold 0.17 s. f-005:43,46; f-006:1,4,7 Note: Twin of the 2.0 row.
- **Out (10.42 s): blur push**, 5 f. Outgoing blur+slide right (as seam 4); incoming slide-in+soft-then-sharp right from ×1.9. Carrier: the input surface and its heading (same element, larger crop). Not on a hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-10.30:6-11; f-006:10-15 Cycle 2 twin of seam 4; the second and last lens move of the film.

### S11 · 10.42–11.96 s · macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge (cycle 2)

- **On screen:** macro crop of the same input's left end, prompt typing with a caret; heading the copy cropped at the right edge (cycle 2). box left edge at ~0.44 of width, box 0.31 of frame height, cropped right; heading top-right. Fill 0.31.
- **What moves (class):** camera, content. Hold carried by: type-on ~16-17 chars/s 3.083-4.417; slow leftward drift (~2 % of width) then an accelerating exit slide left over the last 6 frames (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S4.
- **Note:** Frame-for-frame twin of S4 (frames +180). The audio does not repeat.
- **Landing 10.42 s:** blur push over 0.21 s (expo.out, cubic-bezier(0.16, 1, 0.3, 1)) → macro crop of the input's left end (cycle 2), fill 0.31 height zoom 1.9; camera. w-10.30:7-11 Note: Lens move #2 (twin of 2.917).
- **Text 10.58 s:** prompt text in the macro input (cycle 2) — type-on, 1.33 s, hold 0.00 s. f-006:15,18,21,24,27,30,33,36,39,42,45,47 Note: Twin of the 3.083 row.
- **Typing 10.58–11.92 s:** prompt text in the macro input (cycle 2); as cycle 1; none. f-006:15-47
- **Out (11.96 s): hard cut**, 1 f. Outgoing slide left (as seam 5: ~-5% of width over 6 frames); incoming slide-in left. Carrier: the the brand brand mark. Not on a hit. Ease power3.out cubic-bezier(0.33, 1, 0.68, 1). w-11.80:7-12; f-006:47-48; f-007:1-4 Cycle 2 twin of seam 5.

### S12 · 11.96–13.00 s · right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed (cycle 2)

- **On screen:** right end of the send-state input (the copy) with a blue up-arrow button and a black arrow cursor, on a light-blue gradient bed (cycle 2). box runs off the left edge, right edge at ~0.68 of width, vertical centre ~0.5; button at (0.62, 0.5). Fill 0.18.
- **What moves (class):** object, content. Hold carried by: incoming settle 4 frames; cursor approach 4.458-4.875 (diagonal, decelerating), rest 5 frames, click at 5.083 (blue -> grey), cursor exits down-right 5.25-5.5; blur-out over the last 2 frames (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S5.
- **Note:** Frame-for-frame twin of S5 (frames +180). The audio does not repeat.
- **Landing 11.96 s:** cut → right end of the send-state input + cursor (cycle 2), fill 0.18 height; camera. w-11.80:8,12
- **Click 12.58 s:** send button (cycle 2 twin) → fill blue -> grey; cursor rests 0.21 s first. f-007:10-16
- **Out (13.00 s): melt + settle-in**, 7 f. Outgoing blur (the input (right end, send button) goes soft over 2 frames (slightly, then unreadable); no dim; the bed is unchanged); incoming slide-in+soft-then-sharp up from ×1 [the checklist card arrives soft about 12 % of frame height LOW (card top 70 px into a 270 px tile on the first frame, 40 px four frames later) and slides up while sharpening; its left edge stays at 100/480 and the heading width does not change, so no horizontal or scale settle]. Carrier: the light-blue gradient bed and the the brand brand mark. Not on a hit. The incoming settles on an audio hit. Ease expo.out cubic-bezier(0.16, 1, 0.3, 1). w-12.80:8-12; f-007:24-31 Cycle 2 twin of seam 6 (frames +180). Kind corrected from the blind read (blur-dissolve): the outgoing softens AND the incoming settles from an offset (up ~12 %), so this is melt + settle-in without a dim, not a dissolve in place.

### S13 · 13.00–14.21 s · white checklist card the copy with three items and tick rings, on the light-blue gradient bed (cycle 2)

- **On screen:** white checklist card the copy with three items and tick rings, on the light-blue gradient bed (cycle 2). card left edge at 0.21 of width, top 0.12, bottom 0.88, right edge off frame; content left-aligned inside. Fill 0.76.
- **What moves (class):** content. Hold carried by: melt + settle-in: the card slides up ~12 % while sharpening 5.5-5.79; tick fills (clock wipe, 3 frames each) at 5.917, 6.292, 6.583; nothing else moves (cycle 2: every time quoted here is +7.5 s).
- **Repeats:** S6.
- **Note:** Frame-for-frame twin of S6 (frames +180). The audio does not repeat.
- **Landing 13.00 s:** cut → checklist card (cycle 2), fill 0.76 height; camera. w-12.80:11-12; f-007:31
- **Text 13.08 s:** checklist card copy (cycle 2) — blur resolve, 0.17 s, hold 0.96 s. f-007:27-31 Note: Twin of the 5.583 row.
- **Payoff 13.42 s:** tick 1 fills (cycle 2); emphasis tick fill; show the before for 0.33 s. f-007:34-37
- **Payoff 13.79 s:** tick 2 fills (cycle 2); emphasis tick fill; show the before for 0.71 s. f-007:43-46
- **Payoff 14.08 s:** tick 3 fills (cycle 2); emphasis tick fill; show the before for 1.00 s. f-008:2-5
- **Out (14.21 s): hard cut**, 1 f. Outgoing none; incoming none. Carrier: the light bed with the blue mass at the right edge, the the brand brand mark. Not on a hit. Ease none cubic-bezier(0, 0, 1, 1). w-14.05:7-9; f-008:5-7 Cycle 2 twin of seam 7. The film then holds on 'the brand.' to frame 360 (14.958) and stops one frame before a third join would land (w-14.70 tiles 1-17 all the closing bed).

### S14 · 14.21–14.96 s · small bold the copy centred on the near-white bed; soft blue mass at the right edge (cycle 2)

- **On screen:** small bold the copy centred on the near-white bed; soft blue mass at the right edge (cycle 2). centred (0.5, 0.49); mass covers ~0.15-0.2 of width at the right, diagonal soft edge. Fill 0.042.
- **What moves (class):** content. Hold carried by: the blue mass creeps inward ~6 % of width over 18 frames; pale squares on the bed; the line itself is static (cycle 2: every time quoted here is +7.5 s); the export ends on frame 360 before a third sweep starts.
- **Repeats:** S7.
- **Note:** Frame-for-frame twin of S7 (frames +180). The audio does not repeat.
- **Landing 14.21 s:** cut → closing line the copy (cycle 2), fill 0.042 height; camera. w-14.05:8; w-14.70:17 Note: Holds to the last frame (360, 14.958 s). No third join.
- **Text 14.21 s:** closing line 'the brand.' (cycle 2) — cut-in, 0.04 s, hold 0.75 s. w-14.05:8-12; f-008:6-7,24 Note: Twin of the 6.708 row; holds to the last frame.

## Seam ledger

| # | t | kind | frames | outgoing | incoming | carrier | on hit | ease | evidence | note |
|---|---:|---|---:|---|---|---|---|---|---|---|
| 1 | 0.00 | colour sweep (opens the film) | 8 f | none — no outgoing composition: the export starts on the sweep's first frame (frame 1 == frame 181) | reveal-behind+soft-then-sharp right (8 f) — 'the brand' title revealed left to right in the mass's wake; letters soft under the soft edge, sharp one tile later | the the brand brand mark top-left (screen space) and the near-white bed; the blue mass itself continues from the previous cycle's closing frame | no (70 ms) | none cubic-bezier(0, 0, 1, 1) | w-0.00:1-9; f-001:1-9 [high] | Mass travels rightward off frame at ~40/480 of the width per frame (linear). B is tile 8 or 9 (7-8 frames); 8 written. The film starts mid-sweep: the pre-roll rule. |
| 2 | 0.92 | hard cut | 1 f | slide left — title x at 480-px strip scale 108,108,108,100,88,78 on frames 17-22: ~-6% of frame width, accelerating (4 f) — the title is already in exit motion; the bed does not move | none — solid blue field with the word 'Ai' already present on the first incoming frame | the the brand brand mark top-left (stays in place on the blue field); nothing else | no (-847 ms) | none cubic-bezier(0, 0, 1, 1) | w-0.80:3-7; f-001:19-23 [high] | Exit slide of the title reads power2.in (steps 0, -8, -12, -10 of 480 then the cut). The cut lands on the first word of the statement. |
| 3 | 1.88 | soft-to-sharp resolve | 7 f | none — blue field sharp and static to the last frame; the bed flips blue -> near-white on the cut frame | settle-from-small+soft-then-sharp+fade-in in from ×0.5 (7 f) — heading + wide input arrive faint AND soft on the first frame after the cut, grow from roughly half size (measured by eye on two tiles) and sharpen in place over 7 frames; a residual line from the preceding source scene slides right and fades over the same frames | the the brand brand mark top-left; the bed flips blue -> near-white in the same frame | no (-1805 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-1.90:2-10; w-1.80:5-12; f-001:45-48; f-002:1-5 [high] | Kind corrected from the blind read (hard cut + fade-in): the incoming is soft, not only faint — see w-1.90 tiles 3-6 at 480 px — and it grows, so this is a resolve with a settle-from-small incoming. |
| 4 | 2.92 | blur push | 5 f | blur+slide right — heading x at 480-px scale 120,120,122,127,130,142,152,182 on frames 65-72 (accelerating, ~13% of width by frame 72); blur visible on frames 71-72 (2 f) — the drift starts ~4 frames before the blur | slide-in+soft-then-sharp right from ×1.9 (3 f) — the same input box ~1.9x (box height 118 px wide framing -> 223 px macro, frame.mjs 2.5 s vs 4.0 s), arriving soft and left-shifted (box left edge 152,182,190,200 of 480 on frames 73-76), caret already in it; sharp by frame 75 | the input surface and its heading: same element, larger crop; the state changes under the blur (placeholder 'Write me a health benifits poem' -> empty box with a caret) | no (-2847 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-2.80:1-11; f-002:20-27 [high] | The one lens move of the cycle. Movement class camera: heading and box scale together, the frame edge crops the box's right end. Exit power2.in (vocabulary default); entry decelerates 30, 8, 10 of 480 over three tiles, too few to name a curve. |
| 5 | 4.46 | hard cut | 1 f | slide left — macro box left edge at 480-px scale 207,207,205,200,197,188,183 on frames 101-107: ~-5% of width, accelerating (6 f) — typing continues to the last frame ('Compare the brand Pl\|') | slide-in left (4 f) — the send-state input's right end lands from the right: box right edge 355,345,340,337,335 of 480 on frames 108-112 (~4% of width, steps 10,5,3,2); the cursor enters with it at the lower right | the the brand brand mark; a text input of the same family (rounded box) but a different crop, copy ('...u need to know'), border weight and bed, so no shared landmark holds its place | no (1212 ms) | power3.out cubic-bezier(0.33, 1, 0.68, 1) | w-4.30:1-12; f-003:5-16 [high] | Not a reframe cut: the copy in the box changes ('Compare the brand Pl' -> '...u need to know'), the border becomes a 2-px blue stroke and the bed gains a blue gradient, so it is a new composition that happens to use the same input styling. |
| 6 | 5.50 | melt + settle-in | 7 f | blur — the input (right end, send button) goes soft over 2 frames (slightly, then unreadable); no dim; the bed is unchanged (2 f) | slide-in+soft-then-sharp up from ×1 (5 f) — the checklist card arrives soft about 12 % of frame height LOW (card top 70 px into a 270 px tile on the first frame, 40 px four frames later) and slides up while sharpening; its left edge stays at 100/480 and the heading width does not change, so no horizontal or scale settle | the light-blue gradient bed (unchanged through the join) and the the brand brand mark | no (170 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-5.30:8-12; f-003:36-43 [high] | Kind corrected from the blind read (blur-dissolve): the outgoing softens AND the incoming settles from an offset (up ~12 %), so this is melt + settle-in without a dim, not a dissolve in place. |
| 7 | 6.71 | hard cut | 1 f | none — card sharp and static; the third tick completes on frame 161, the cut is on 162 | none — 'the brand.' small bold line centred, whole on its first frame | the light bed with the soft blue mass at the right edge (present on both sides), the the brand brand mark | no (232 ms) | none cubic-bezier(0, 0, 1, 1) | w-6.55:7-9; f-004:17-19 [high] | The cut follows the third tick fill by one frame: payoff, then title. |
| 8 | 7.50 | colour sweep (loop join) | 8 f | covered — one-frame jump: the closing bed (blue mass ~35% of width at the right edge) is replaced by the sweep frame (mass ~60% of width, 'Ask' visible at left) (1 f) — the export loops here: frame 181 == frame 1 | reveal-behind+soft-then-sharp right (8 f) — identical to seam 1's incoming | the blue colour (the right-edge mass of the closing scene becomes the sweep mass), the near-white bed, the the brand brand mark | no (-80 ms) | none cubic-bezier(0, 0, 1, 1) | w-7.20:8-17; f-004:36-44 [high] | A one-frame jump into a large moving mass is the sweep's first frame, not a corner swell (the mass grows only ~6% of width over frames 162-180 before the jump). The join is the loop point of the export. |
| 9 | 8.42 | hard cut | 1 f | slide left — as seam 2: ~-6% of width over 4 frames (4 f) | none | the the brand brand mark | no (1033 ms) | none cubic-bezier(0, 0, 1, 1) | w-8.30:3-7; f-005:7-11 [high] | Cycle 2 twin of seam 2 (frames +180). |
| 10 | 9.38 | soft-to-sharp resolve | 7 f | none — blue field sharp and static to the last frame; the bed flips blue -> near-white on the cut frame | settle-from-small+soft-then-sharp+fade-in in from ×0.5 (7 f) — heading + wide input arrive faint AND soft on the first frame after the cut, grow from roughly half size (measured by eye on two tiles) and sharpen in place over 7 frames; a residual line from the preceding source scene slides right and fades over the same frames | the the brand brand mark | no (75 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-9.30:5-12; f-005:33-41 [high] | Cycle 2 twin of seam 3 (frames +180). Kind corrected from the blind read (hard cut + fade-in): the incoming is soft, not only faint — see w-1.90 tiles 3-6 at 480 px — and it grows, so this is a resolve with a settle-from-small incoming. |
| 11 | 10.42 | blur push | 5 f | blur+slide right — as seam 4 (2 f) | slide-in+soft-then-sharp right from ×1.9 (3 f) | the input surface and its heading (same element, larger crop) | no (-277 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-10.30:6-11; f-006:10-15 [high] | Cycle 2 twin of seam 4; the second and last lens move of the film. |
| 12 | 11.96 | hard cut | 1 f | slide left — as seam 5: ~-5% of width over 6 frames (6 f) | slide-in left (4 f) | the the brand brand mark | no (-718 ms) | power3.out cubic-bezier(0.33, 1, 0.68, 1) | w-11.80:7-12; f-006:47-48; f-007:1-4 [high] | Cycle 2 twin of seam 5. |
| 13 | 13.00 | melt + settle-in (settle on onset) | 7 f | blur — the input (right end, send button) goes soft over 2 frames (slightly, then unreadable); no dim; the bed is unchanged (2 f) | slide-in+soft-then-sharp up from ×1 (5 f) — the checklist card arrives soft about 12 % of frame height LOW (card top 70 px into a 270 px tile on the first frame, 40 px four frames later) and slides up while sharpening; its left edge stays at 100/480 and the heading width does not change, so no horizontal or scale settle | the light-blue gradient bed and the the brand brand mark | no (230 ms) | expo.out cubic-bezier(0.16, 1, 0.3, 1) | w-12.80:8-12; f-007:24-31 [high] | Cycle 2 twin of seam 6 (frames +180). Kind corrected from the blind read (blur-dissolve): the outgoing softens AND the incoming settles from an offset (up ~12 %), so this is melt + settle-in without a dim, not a dissolve in place. |
| 14 | 14.21 | hard cut | 1 f | none | none | the light bed with the blue mass at the right edge, the the brand brand mark | no (302 ms) | none cubic-bezier(0, 0, 1, 1) | w-14.05:7-9; f-008:5-7 [high] | Cycle 2 twin of seam 7. The film then holds on 'the brand.' to frame 360 (14.958) and stops one frame before a third join would land (w-14.70 tiles 1-17 all the closing bed). |

## Pacing

- Landing cadence: 0.93 / s · longest hold 1.33 s · cuts per 10 s: 9.3
- Seams on audio onsets: 0 of 14 seams within +-60 ms of an audio onset (chance level ~1.6 of 14 at 0.93 onsets/s); two near misses at 70 ms (seam 1) and 75 ms (seam 10). One settle frame hits: the cycle-2 blur-dissolve settles at 13.25 against the 13.23 onset. The bed is flat (LRA 1.8 LU) and the cuts do not ride it.
- Typing cadence: ~16-17 chars/s: one character on each of two consecutive frames, then one frame with none (2 chars per 3 frames); 23 characters ('Compare the brand Pl') over 1.33 s; caret visible throughout; no bursts longer than 2; the typing is cut off mid-word by the seam at 4.458 · stagger spacing: word pops 0.083 s then 0.167 s apart; tick fills 0.375 s then 0.292 s apart; no sibling entrance staggers elsewhere
- Holds: 0.33 s ×0.58 s ('the brand' title static after the sweep clears; exit slide left begins at ~0.79); 0.92 s ×0.96 s (word pops 'Ai' (0.917) '-' (1.0) 'powered' (1.167), line re-centring on each pop; then static white on blue); 2.17 s ×0.75 s (gradient sweep trail on the heading (blue -> ink, left to right, 2.0-2.75); faint pale squares on the bed; drift right starts ~2.8); 3.08 s ×1.33 s (type-on 'Compare the brand Pl' at ~16-17 chars/s with a visible caret; the frame drifts left ~2% then accelerates out over the last 6 frames); 4.63 s ×0.88 s (cursor approach to the send button (diagonal up-right, decelerating), 0.2 s rest, fill flip blue -> grey at 5.083, cursor exits down-right from 5.25); 5.75 s ×0.96 s (three tick fills (clock wipe, 3 frames each) at 5.917, 6.292, 6.583); 6.71 s ×0.79 s ('the brand.' static; the blue mass at the right edge creeps in ~6% of width; pale squares on the bed); 7.83 s ×0.58 s (cycle 2 twin of the title hold); 8.42 s ×0.96 s (cycle 2 word pops at 8.417, 8.5, 8.667); 9.67 s ×0.75 s (cycle 2 gradient sweep on the heading); 10.58 s ×1.33 s (cycle 2 type-on); 12.13 s ×0.88 s (cycle 2 cursor approach + click at 12.583); 13.25 s ×0.96 s (cycle 2 tick fills at 13.417, 13.792, 14.083); 14.21 s ×0.75 s ('the brand.' static to the last frame (360); the blue mass creeps in; no third sweep)

## UI motion

- Cursor: present — black arrow pointer, ~0.09 of frame height (65 px of 720 on frame.mjs 5.0 s; a macro-crop size); enters with the cut at 4.458 at ~(0.51, 0.87) of the frame and approaches the send button along one diagonal (up-right) in decelerating steps, reaching (0.62, 0.53) by frame 118; rests 5 frames; leaves down-right accelerating from frame 127 and is gone under the blur at 133
- Agent vs user steps: The prompt types itself with no pointer on screen (system-driven type-on, caret only). The send is a user step: a cursor approaches, rests 0.2 s and the button flips state. The three checklist ticks fill on their own after the send (agent). No dropdowns, no drags.

## Grammar

- Entrances: title: revealed left to right in the wake of a linear rightward colour sweep (8 frames), letters sharpening one frame behind the soft edge; statement: word pops on the cut, then at +2 and +6 frames; the line re-centres on each pop; wide input: 7-frame opacity fade-in after a hard cut; the heading arrives light-blue and matures to ink by a left-to-right gradient sweep over 0.75 s; macro input: blur push - the same surface arrives ~1.9x, soft and left-shifted, sharp in 3 frames, caret already present; send-state input: hard cut with a 4-frame leftward slide-in settle (power3.out), cursor entering with it at the lower right; card: blur-dissolve, arriving in place at final scale, sharp in 4 frames; no rise, no scale; closing line: cut-in, whole on its first frame
- Exits: title: accelerating slide left over 4 frames (~6 % of width) into a hard cut; blue field: hard cut, no treatment; wide input: accelerating drift right (~4 frames) then 2 frames of blur into the blur push; macro input: accelerating slide left over 6 frames (~5 % of width) into a hard cut, typing still running; send-state input: 2 frames of blur (no dim) into the blur-dissolve; card: hard cut one frame after the third tick completes; closing bed: covered in one frame by the sweep's first frame (the loop join)
- Reveal order: Brand first (title, then a one-line statement on a blue field), then the product in three framings that get closer to the action (wide -> typing macro -> send button under a cursor), then the result (a checklist that ticks itself, top to bottom), then the brand line again; the whole thing loops. Every payoff is shown before its next step: the typed prompt is cut off mid-word, the send flips the button before the card arrives, each tick completes before the next starts.
- Motifs: the the brand brand mark fixed top-left on every frame, including the blue field; brand blue in three roles: whole-frame fill (statement), soft gradient bed (send + card), soft-edged sweep mass (closing -> title); the input box as host, seen in three crops; clock-wipe tick fills, 3 frames each, ~0.3 s apart; near-white bed with a faint fine grid and slowly drifting pale squares; exits by accelerating slides; entrances by settles and sharpen-ins; the lens itself travels only for the blur push

## Sound

Measured on the mixed program: -21.5 LUFS integrated, LRA 1.8 LU, true peak -11.5 dBTP. Mixed program measurement. Not a delivery target. Stems, ducking and SFX counts cannot be recovered.
Layers: VO — none identifiable; the program is a flat bed (LRA 1.8 LU, RMS deciles within 2 dB). Stems cannot be separated from the mixed measurement.; music — a continuous bed at ~-19 dBFS RMS from the first to the last frame; no build, no drop, no fade (energy arc flat).; SFX — cannot be separated. The onset list clusters at 5.67-7.65 (six rises ~230 ms apart across the click, the tick fills and the closing cut) and at 14.51-14.99 (three rises); these may be UI sounds riding the bed, unverified. Cycle 1 and cycle 2 do not share onsets, so the audio is not looped with the picture..
Energy arc: flat opening to middle; holds to the end. Ending: Sound runs to the last frame at bed level (tail silence 1 ms). No fade, no sting: the export is a loop cut one frame before its third join, and the ending is the the copy bed at frame 360, not a resolution..
Sync points: 6.29 s tick 2 begins its clock-wipe fill ↔ onset at 6.23 (62 ms before): borderline, just outside the +-60 ms window; 13.25 s cycle-2 card settles sharp (seam 13 B frame) ↔ onset at 13.23 (20 ms before): the one settle that hits; 7.50 s loop join into the sweep ↔ onsets at 7.42 and 7.65 bracket it; neither within 60 ms; 5.08 s send button flips blue -> grey ↔ no onset within 500 ms (nearest 5.67)

## Eases

| name | GSAP | cubic-bezier | frames | used for | Remotion |
|---|---|---|---:|---|---|
| linear sweep travel | `none` | (0, 0, 1, 1) | 8 f | the colour sweep mass crossing the frame (~40/480 of width per frame, constant: w-0.00 tiles 1-8) | `Easing.bezier(0, 0, 1, 1)` |
| accelerating exit slide | `power2.in` | (0.11, 0, 0.5, 0) | 5 f | title exit left (4 frames), macro input exit left (6 frames), wide input drift right before the blur push (4 frames) | `Easing.bezier(0.11, 0, 0.5, 0)` |
| blur-out | `power3.in` | (0.32, 0, 0.67, 0) | 2 f | outgoing blur on the blur push and the blur-dissolve (2 frames each) | `Easing.bezier(0.32, 0, 0.67, 0)` |
| incoming slide settle | `power3.out` | (0.33, 1, 0.68, 1) | 4 f | send-state input settling leftward after the cut at 4.458 (steps 10, 5, 3, 2 of 480); cursor approach deceleration | `Easing.bezier(0.33, 1, 0.68, 1)` |
| sharpen-in settle | `expo.out` | (0.16, 1, 0.3, 1) | 4 f | blur push arrival (3 frames), blur-dissolve card (4 frames), title letters behind the sweep edge | `Easing.bezier(0.16, 1, 0.3, 1)` |
| fade-in | `power2.out` | (0.5, 1, 0.89, 1) | 7 f | wide input + heading opacity ramp after the cut at 1.875 (curve not resolvable from the ghosted tiles: a guess) | `Easing.bezier(0.5, 1, 0.89, 1)` |
| pop / cut-in | `none` | (0, 0, 1, 1) | 1 f | word pops in the statement, the closing line, the send button fill flip | `Easing.bezier(0, 0, 1, 1)` |
| tick clock wipe | `none` | (0, 0, 1, 1) | 3 f | each tick ring fills clockwise from 12 o'clock over 3 frames (~1/3 per frame: f-003 tiles 46-48) | `Easing.bezier(0, 0, 1, 1)` |

