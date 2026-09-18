# Motion vocabulary — names, recognition cues, numbers

This file is what lets the model NAME a seam, a camera move, a text reveal or a UI motion instead
of guessing. Every entry has four parts:

- **What it is** — the definition a builder can act on.
- **On a 24 fps strip** — how it looks tile by tile. This is the recognition cue. Read the strip,
  match the cue, write the name. If no cue matches, write `other` and describe the tiles.
- **Numbers** — typical frame counts at 24 fps, the GSAP ease and its cubic-bezier, and default
  outgoing / incoming treatments for the seam ledger.
- **Measurable signature** — what a v2 script would compute per frame to propose the same name.
  Not used in v1; kept so the two reads (eyes, numbers) can be compared later.

Contents: [Reading rule](#reading-rule) · [Movement classes](#the-three-movement-classes) ·
[Seams](#seams) · [Camera verbs](#camera-verbs-move_in) · [Text reveals](#text-reveals) ·
[UI motion](#ui-motion) · [Eases](#eases) · [Traps](#traps)

---

## Reading rule

- **4 fps sheets** (`c-NNN`, 0.25 s per tile) answer composition questions: what is on screen,
  where, how big, for how long. They **cannot** show a transition. At 4 fps a 1-frame cut, a
  3-frame blur-dissolve and a 7-frame melt all look identical: tile A, then tile B.
- **24 fps windows** (`w-<t>`, 12 tiles around one seam by default; `--span` changes it and
  each strip's own tile count sits in `windows/index.json`) and **24 fps full sheets** (`f-NNN`,
  48 tiles = 2 s) answer transition questions. A seam is named from these only.
- **The resample is approximate to 1/24 s.** Source frames may be repeated or dropped by the
  `fps=24` filter. Never claim a recovered keyframe or a source ease. "3–4 frames" is honest;
  "0.146 s power3.in" is not, unless the strip shows the curve.
- **Badge numbers are 1-based, global frame numbers:** `t = (frame − 1) / 24` on `f-`/`w-` sheets
  and `(frame − 1) / 4` on `c-` sheets. Tile numbers restart at 1 on every sheet
  (tile = badge − 48 × (sheet − 1) on `f-`, − 30 × (sheet − 1) on `c-`); `sheets/map.txt`
  resolves any cell. Tile sizes for a 16:9 source: `c-` 384×216, `f-` 320×180, `w-` 480×270
  (raise with `--cell` when a caret or a selection edge has to be read).
- Frame counts below are for 24 fps. At 30 fps multiply by 1.25; at 60 fps by 2.5.
- **Two rulings on frame counts.** (1) A hard cut is **1 frame** by definition; when the
  incoming keeps settling after the cut (slides 4 frames, sharpens 3), the cut stays 1 frame
  and the settle goes in `incoming.frames_24` + `incoming.treatment` (and the seam's `ease` is the
  settle's ease). (2) When the outgoing is already in exit motion before the join (a card
  sliding out for 12 frames), A is the last tile where that composition is still the subject and
  the exit motion is written into `outgoing.treatment` / `amount`; the seam does not absorb the
  whole exit.
- **Loops and pre-roll.** A film that opens inside a transition logs a seam at `t: 0` with
  `opens_film: true` (there is no outgoing composition; describe the incoming). A film that
  repeats a cycle logs every seam, scene and landing of every cycle (the ledger is literal; the
  cadence counts them all), marks the join with `loop_join: true`, writes `meta.loop`, and names
  the repeat in `structure.acts` so a builder can keep one cycle on purpose.

---

## The three movement classes

Write one of these on every landing and every in-beat motion. Confusing them is the most common
rebuild error: a builder replaces all three with a scale tween on the whole scene.

| Class | Definition | On the strip | Build as |
|---|---|---|---|
| **camera** | Several landmarks keep their relationships while the whole composition changes scale, crop or position | Every element shifts or scales together; edges of the frame reveal or hide content uniformly | a transform on the stage / lens wrapper |
| **object** | One element rotates, resizes, travels or rearranges relative to stable neighbours | One thing moves; the background and other elements stay put | a tween on that element only |
| **content** | Something changes inside a stable surface: text types, a list scrolls, a state flips, a counter ticks | The surface outline is fixed; pixels inside it change | a DOM mutation / inner scroll / text reveal |

A card growing larger while the background stays still is **object**, not camera. An input box
whose left edge drifts out of frame while the text stays the same size is **camera** (the lens
pushed in), not object.

---

## Seams

Seam = the join between two compositions. Name the kind, count the frames, record what each side
does and what stays continuous (the carrier). Defaults are for the ledger when the strip shows
the shape but not the exact numbers.

### hard cut
- **What:** composition A on frame n, composition B on frame n+1. Nothing in between.
- **Strip:** one tile is entirely A, the next tile is entirely B, both sharp. No tile shows a mix.
- **Numbers:** 1 frame. outgoing `none`, incoming `none`. No ease.
- **Signature:** a single frame-difference spike; sharpness stays high on both sides.

### match cut
- **What:** a hard cut where one shape, position or motion continues across the join (a circle
  becomes a button; a moving element keeps its direction).
- **Strip:** as hard cut, but a landmark occupies the same place on both tiles. Name the carrier.
- **Numbers:** 1 frame. Carrier required.
- **Signature:** spike plus a locally low difference around the shared landmark.

### reframe cut
- **What:** hard cut to a different crop of the **same** surface (wide → macro, left end → right
  end of the same input). The scene does not change; the framing does. This is a camera landing
  with `move_in: cut`.
- **Strip:** both tiles show the same surface at different scale or offset; brand mark or a
  corner element stays in place if it lives in screen space.
- **Numbers:** 1 frame. Carrier: the surface itself (state continues: typed text, cursor).
- **Signature:** spike; scale-change with a stable centre would confirm.

### pixel-matched hard cut
- **What:** a hard cut where A's last frame was **built** to equal B's first frame for every
  surviving element (layout, weight, shadow, cursor). Reads as no cut at all.
- **Strip:** the two tiles differ only where the content intends to differ.
- **Numbers:** 1 frame. Carrier: everything shared. Log it because the build must copy A's end
  geometry into B's start.
- **Signature:** small spike confined to a region.

### crossfade
- **What:** A fades out while B fades in over the same frames. Nothing moves or blurs.
- **Strip:** 3–12 tiles where both compositions are visible at once, ghosted, both **sharp**,
  brightness roughly constant.
- **Numbers:** typical 8–15 frames (0.3–0.6 s). outgoing `fade`, incoming `fade-in`.
  Ease `power1.inOut` (0.37,0,0.63,1).
- **Signature:** long low ramp of difference; sharpness stays high; no dominant motion vector.

### position-locked crossfade
- **What:** a crossfade where the shared elements (window chrome, a message, a composer) sit at
  identical coordinates in both scenes; only the changing content dissolves.
- **Strip:** as crossfade, but the frame edges, panels and shared blocks show no ghosting at all.
- **Numbers:** 0.4–0.6 s (10–15 frames). `power1.inOut`. Carrier: the locked elements.
- **Signature:** difference confined to the content region.

### blur-dissolve
- **What:** A blurs and fades over a few frames; B appears blurred and sharpens. Two motions
  overlap across the join.
- **Strip:** the outgoing tiles go **soft** (edges melt, text unreadable) over 2–4 tiles while
  dimming; the incoming appears soft in the same or next tile and sharpens over ~3–5 tiles.
  Contrast with crossfade: here the tiles are visibly out of focus.
- **Numbers:** total 4–8 frames (0.17–0.33 s). outgoing `blur+dim` 3 frames; incoming
  `soft-then-sharp` 4 frames. Exit `power3.in` (0.55,0,1,0.45); entry `expo.out` (0.16,1,0.3,1).
  Blur peak ≈ 20 px at 1080p.
- **Signature:** sharpness (Laplacian variance) drops then recovers across the ramp; difference
  ramp 4–8 frames.

### soft-to-sharp resolve
- **What:** a hard cut (or cut to a bed) where the **incoming** frame arrives out of focus and
  sharpens; the outgoing has no treatment. The incoming may also fade up and settle from a
  smaller or larger scale or from an offset — write those as extra incoming tokens
  (`settle-from-small+soft-then-sharp`, `slide-in+soft-then-sharp`) with `from_scale` /
  `direction`; the kind stays resolve as long as the outgoing is untouched.
- **Strip:** the outgoing tile is sharp until the cut; the first incoming tile is soft and
  possibly faint; each following tile is sharper; readable by tile 4–7. A pure opacity fade
  with no softness is `hard cut` + incoming `fade-in`.
- **Numbers:** 4–8 frames incoming (0.17–0.33 s). outgoing `none`, incoming `soft-then-sharp`.
  `expo.out` or `power3.out` (0.22,1,0.36,1).
- **Signature:** spike, then sharpness rises monotonically over the next frames.

### melt + settle-in
- **What:** the outgoing composition blurs (and usually dims — the melt) while the incoming
  arrives soft, **larger and/or offset** (from a corner, from below), and settles into place
  while it sharpens. The deciding cue is the incoming: not yet at its final scale or position
  while the outgoing is still soft on screen. Measure its edge on two tiles; a 10 % slide is
  easy to miss at 320 px.
- **Strip:** outgoing tiles soften (and often darken) over 1–5 tiles — the outgoing may be a
  small element near the frame edge, so look for it specifically; the incoming is visible
  during the melt, oversized and shifted (often from a corner), shrinking toward its final
  position while sharpening over 5–7 tiles.
- **Numbers:** 6–9 frames total. outgoing `blur+dim` 3–4 frames; incoming
  `settle-from-large` from_scale 1.1–1.3, 5–7 frames, direction = where it comes from.
  Exit `power3.in`; entry `expo.out`. The inverse (outgoing shrinks + blurs, incoming settles from
  large) is **inverse zoom-through**, below.
- **Signature:** sharpness dip; luminance dip; scale change with a moving centre on the incoming.

### blur push
- **What:** the lens pushes **into the surface already on screen** under blur. The outgoing
  frames blur and drift 2–3 frames; at peak blur the frame swaps to a **larger crop of the same
  surface** (×1.5–2.5), which arrives soft and offset and settles sharp over 3–5 frames. The
  state may change under the blur (a placeholder becomes a caret). Movement class **camera**:
  landmarks keep their relationships while the scale changes.
- **Strip:** 2–3 outgoing tiles soften and shift in one direction (often the direction the
  incoming will settle from); the next tile shows the same heading / input / panel at roughly
  double size, cropped by the frame, soft; each following tile is sharper and a little further
  along the settle. No tile shows two *different* compositions.
- **Numbers:** 4–7 frames total. outgoing `blur+slide` (or `blur+scale-up`), incoming
  `settle-from-large+soft-then-sharp` or `slide-in+soft-then-sharp`, `from_scale` 1.5–2.5 relative
  to the outgoing. Exit `power2.in`; entry `expo.out`. Carrier: the surface itself.
- **Do not confuse with:** *blur-dissolve* (two different compositions, no scale change, no
  drift), *zoom-through* (no blur; one element's interior becomes the frame), *whip* (lateral,
  smeared, no scale change), *throw* (no blur, no scale change), *melt + settle-in* (a new
  composition arrives; here it is the same one, closer).
- **Direction:** in (the surface arrives larger) or out (a pull: it arrives smaller). Write
  `outgoing.direction` / `incoming.direction` as `in` / `out` and `from_scale`; both count as one
  lens move.
- **The reframe-cut boundary:** a blur push needs the OUTGOING to blur or drift toward the join.
  When the outgoing stays sharp to a one-frame swap and only the incoming arrives soft (the same
  surface at a new scale, sharpening over 2–4 tiles), it is a `reframe cut` with
  `incoming: soft-then-sharp` — a lens cut, not a lens move; it does not count in `lens_moves`
  and a builder cuts + sharpens instead of travelling.
- **Signature:** sharpness dip; scale change of tracked landmarks with a stable relationship;
  a small directional offset ramp on both sides.

### inverse zoom-through
- **What:** outgoing recedes (scale down ~0.8) + blurs + dims fast; hard cut at peak blur;
  incoming enters oversized (~1.25) and settles. Both sides move in the shrinking direction so
  velocity matches at the cut.
- **Strip:** 2–5 outgoing tiles shrink and soften; then 8–12 incoming tiles start large and
  soft and settle sharp. The middle tile is the blurriest.
- **Numbers:** exit 5 frames `power3.in` to scale 0.8, blur 20 px, opacity to 0.15; entry
  12 frames `expo.out` from scale 1.25. outgoing `scale-down` + `blur+dim`; incoming
  `settle-from-large`.
- **Signature:** scale change with stable centre on both sides; sharpness dip at the join.

### zoom-through
- **What:** the camera pushes into one element until it fills the frame and the next scene is
  revealed inside or behind it (a window, a card, a circle).
- **Strip:** successive tiles enlarge one element until its interior is the whole frame; the new
  composition is already there when the edges leave the frame.
- **Numbers:** 12–24 frames. `power2.in` then `power3.out`, or one `power2.inOut`.
  outgoing `scale-up`, incoming `reveal-behind`.
- **Signature:** monotonic scale-up with a stable centre; no sharpness dip.

### dip-to-colour
- **What:** A fades to a solid colour (black, white, brand), holds 0–3 frames, B fades in.
- **Strip:** tiles darken / whiten to a flat field, one or more flat tiles, then B fades up.
- **Numbers:** 6–18 frames. outgoing `fade`, incoming `fade-in`. `power1.inOut`.
- **Signature:** luminance goes to an extreme and back; variance near zero in the middle.

### colour sweep
- **What:** a soft-edged colour mass (blurred blob, gradient band) travels across the frame in
  one direction; the new composition appears in its wake (or the old one disappears under it).
- **Strip:** a blurred region of one hue occupies successive positions across consecutive tiles
  (e.g. left edge → centre → right edge), while the content behind it changes or sharpens
  where the sweep has passed. Distinguish from **wipe**: the sweep's edge is soft and the mass
  is a colour, not the next frame.
- **Numbers:** 4–8 frames (0.17–0.33 s) for the crossing; the settle behind it 4–6 more.
  Linear travel (wipes do not decelerate): ease `none`; content behind: `power2.out`.
  outgoing `covered`, incoming `reveal-behind` (+ `soft-then-sharp` if the payoff sharpens).
- **Signature:** dominant motion vector in one direction over the full frame height; hue mass
  moving monotonically.

### wipe
- **What:** a hard edge moves across the frame; B replaces A behind the edge.
- **Strip:** each tile shows A on one side of a straight line and B on the other; the line
  advances per tile.
- **Numbers:** 6–12 frames, linear or `power2.inOut`. Direction named.
- **Signature:** a straight boundary translating; difference confined to a moving band.

### whip
- **What:** the camera (or the whole composition) throws laterally or vertically so fast the
  frame smears; the next composition arrives on the other side of the smear.
- **Strip:** 1–3 tiles show directional motion blur (streaks) with no readable content; the
  tiles before and after are sharp and different. A 2-frame whip is common.
- **Numbers:** 2–6 frames. `power3.in` out, `power3.out` in, or one `expo.inOut`.
  outgoing `slide` (direction), incoming `slide-in` (same direction).
- **Signature:** 1–3 frames of strong single-direction motion vector and very low sharpness.
- **No smeared tile → not a whip.** A lateral move on the same surface whose tiles stay readable
  is a travelled landing (`snap` or `glide`, with the direction); log the seam as `other` with a
  note ("pan left along the bar, 9 frames, readable"), never as whip.

### travel (a camera move that changes the composition without a join)
- **What:** the lens moves continuously from one composition to the next — a glide down to the
  next card, a push into a detail, a scroll along a surface — and nothing cuts. The tiles stay
  readable (a whip does not); motion blur may ride along as a treatment.
- **Strip:** every tile shows the same surface at a slightly different offset or scale; no tile
  is entirely the outgoing or entirely the incoming; no smear that hides the content.
- **Numbers:** frames = the move's length (8–30). Write the move in the **landing row** (verb:
  glide / push / pull / snap / track, ease, duration) and here only the join facts: `outgoing`
  `slide` (+`blur` when motion-blurred) with its direction, `incoming` `slide-in` (+`soft-then-sharp`
  when it settles from blur), carrier = the surface. It counts in `lens_moves`.
- **Do not confuse with:** *whip* (smeared, unreadable tiles), *blur push* (a swap to a larger
  crop at peak blur), *glide* as a verb (that is the landing; `travel` is the seam row that
  explains why the composition changed with no cut).
- **Signature:** long low difference ramp with a steady motion vector; sharpness may dip with
  motion blur but never to an unreadable smear.

### throw (directional — write `throw` + `outgoing.direction`; `leftward throw` is the alias for left)
- **What:** outgoing accelerates off-frame (any direction) while dimming; hard cut mid-throw;
  incoming is **already** sliding the same way and settles.
- **Strip:** outgoing tiles shift progressively in one direction (2–6 tiles) and dim; the first
  incoming tile is offset the opposite way and lands over 4–8 tiles. No smear (unlike whip).
- **Numbers:** exit 6 frames `power2.in` (x −13 % of width, opacity to 0.55); entry 4–10 frames
  `power3.out` from +11 % of width. outgoing `slide`, incoming `already-moving`.
- **Signature:** two motion ramps with a spike between; velocity roughly equal at the spike.

### corner swell
- **What:** a colour mass anchored in a corner grows until it covers the frame and becomes the
  next scene's bed (often the start of a colour sweep).
- **Strip:** a corner region of one hue expands radially over successive tiles until the tile is
  flat colour; the old content is covered, not faded.
- **Numbers:** 6–10 frames, `power2.in` (accelerating cover). outgoing `covered`, incoming
  `reveal-behind` or the sweep that follows.
- **Signature:** hue area growing from one corner; luminance moving toward the swell colour.

### slide / push-through
- **What:** B pushes A out of frame along one axis; both move together (push), or B slides over
  a static A (slide).
- **Strip:** the boundary between A and B travels across tiles; A is displaced (push) or covered
  (slide). No blur.
- **Numbers:** 8–16 frames, `power3.out` or `expo.out`.
- **Signature:** whole-frame single-direction motion vector (push) or a moving band (slide).

### Flip morph (identity morph)
- **What:** the **same** element changes shape / size / position to become the next scene's
  element (a button becomes a card; a chip becomes a panel). Not a crossfade between two elements.
- **Strip:** one outline visibly deforms across 6–20 tiles, never disappears; its contents may
  swap partway.
- **Numbers:** 12–24 frames, `power2.inOut` or `expo.inOut`. Carrier: the element.
- **Signature:** a tracked blob with continuous bounding box; no spike.
- **Also a Flip morph:** the rest of the outgoing clears while one element survives, travels
  (even soft, even smeared) and becomes the seed the incoming grows from. Carrier = that element.

### mask reveal
- **What:** B appears through a growing or moving mask (circle, rectangle, feathered edge).
- **Strip:** B is visible inside a shape that grows per tile; A remains outside it until covered.
- **Numbers:** 8–16 frames, `power2.out`.

### glitch cut
- **What:** a hard cut dressed with 1–3 frames of analog damage: a torn / smeared / noise frame,
  a horizontal displacement band, a colour split. Common on brand lockups and maker credits.
- **Strip:** one or two tiles of noisy, torn or duplicated content between two sharp, different
  compositions; the bed may flip (white to black) on the same frame.
- **Numbers:** 2–4 frames. outgoing `none` or `slide`, incoming `pop`. Carrier: none, or the bed
  colour. Ease `none`.
- **Signature:** a spike with very low sharpness and high noise on the middle frame(s).

### clear-then-resolve
- **What:** the outgoing **objects leave** a persistent bed (a phone lifts out, a disc shrinks to
  nothing) over several frames, the bed stands empty for 0–3 frames, then the next composition
  resolves soft-to-sharp on the same bed. Not a blur-dissolve: nothing overlaps.
- **Strip:** tiles show the outgoing objects exiting or shrinking on an unchanged bed, one or
  more near-empty tiles, then a soft incoming sharpening in place.
- **Numbers:** exit 4–12 frames (`power2.in`), gap 0–3, resolve 4–8 (`expo.out`). outgoing
  `slide` / `scale-down`, incoming `soft-then-sharp` or `slide-in+soft-then-sharp`. Carrier:
  the bed.
- **Signature:** two separated difference ramps with a near-zero plateau between them.
- **Not this kind when one element survives the clear** and the next composition grows out of
  it (a tile that travels, then widens into a card): that is a **Flip morph** with the survivor
  as carrier. Identity is the test, not sharpness — the survivor may blur and whip on the way.

---

## Camera verbs (`move_in`)

The verb names how a landing is reached. Zoom is measured, never guessed: **zoom = subject
height ÷ frame height** at the landing, compared with the same subject at the widest framing.

| Verb | Definition | On the strip | Duration / ease |
|---|---|---|---|
| `cut` | the framing changes between two frames | one tile wide, next tile close; content continuous | 0 |
| `snap` | fast launch, dead stop; lands on a hit | 3–8 tiles of travel, first ones far apart, last ones nearly equal | 0.3–0.5 s, `expo.out` / E1 whip-settle |
| `glide` | one calm arc; the camera is felt, not seen | 8–30 tiles of small, even steps; no overshoot | 0.6–1.5 s, `power2.inOut` or translate `power2.inOut` + zoom `sine.inOut` |
| `push` | a slow continuous move in (zoom up) | every tile slightly larger than the last; edges of the subject drift out | 1–4 s, `power1.inOut` or `none` |
| `pull` | the opposite: zoom down / widen | every tile slightly smaller | as push |
| `whip` | lateral / vertical throw at constant zoom with a smear | 1–3 smeared tiles | 0.2–0.5 s, `power3.in` → `power3.out` |
| `blur push` | the lens pushes into the surface already on screen under blur, lands on a larger crop of it (the seam of the same name) | 2–3 soft drifting tiles, then the same surface ×1.5–2.5 soft, sharpening | 0.17–0.3 s, `power2.in` → `expo.out` |
| `anticipate` | pull slightly away from the target (≈6 % of the travel), then drive on a fast-start / soft-landing curve | 1–2 tiles move the wrong way first | 0.6–0.9 s |
| `punch` | crouch toward the target, overshoot the landing, settle | tiles overshoot the final scale by 2–5 % then return | 0.4–0.7 s, `back.out(1.4)` |
| `drift` | not a landing: a slow float that carries a long hold | sub-pixel changes across many tiles | 2–8 s, `sine.inOut`, ≤3 % zoom |
| `hold` | the frame stands | identical tiles (content may move) | — |
| `track` | the frame follows a moving subject | subject stays in place on the tile while the background shifts | matches the subject's motion |

**Landings and the lens are counted separately.** A landing is every framing the film lands on:
the opening frame at `t: 0`, every cut, every travelled move, in every cycle;
`cadence_landings_per_s` = landings ÷ duration. `lens_moves` counts only the travelled ones
(`move_in` other than `cut` / `hold`). A **fixed lens** is a valid plan: `lens_moves: 0`, every
landing `cut`, cadence still reports how often the frame changes, and `lens_note` says what
carries the film instead (object and content motion). A `track` (a continuous follow) is one
landing with `duration` = its length and `hold: 0`.

---

## Text reveals

| Mechanism | What | On the strip | Numbers |
|---|---|---|---|
| **word pop** | words appear in place, one after another, no tween (or a 1-frame pop) | each tile adds one whole word at full size and opacity; nothing slides | per-word gaps 0.08–0.2 s; no ease |
| **letter mask** (domino) | letters reveal through a moving mask, left to right | tiles show a growing readable prefix with a sharp edge; no blur | 0.3–0.8 s per line, `power3.out` or E1 |
| **blur resolve** | the line is present but soft, then sharpens | first tile soft/unreadable, each next tile sharper, no position change | 4–8 frames, `expo.out`; mask feather 196→0 px in 0.27 s is one measured source |
| **type-on** | characters appear at a caret, in order | tiles show a growing prefix **with a caret**; sometimes bursts (2–3 chars per tile then a pause) | 8–25 chars/s; humanised bursts; reveal by width clip; deletion reads linear |
| **selection sweep** | a selection highlight grows over text that is **already** on screen, a caret riding its edge (reads as "typing" at 4 fps) | the full line is present in every tile; a tinted band widens across it; no characters appear | 0.4–1.0 s, linear or `power1.inOut`; record the direction and whether the text was complete before the sweep |
| **glitch** | a torn / noise / displaced frame or two, then the clean line | one or two damaged tiles, then sharp | 1–3 frames, no ease |
| **slide** | line translates in from an offset with a fade | first tile offset (y +20–40 px), following tiles settle | 8–12 frames, `power3.out` |
| **fade** | opacity only | ghosted tile(s), no movement | 6–12 frames |
| **gradient sweep trail** | a colour gradient rides the reveal edge, then letters mature to the ink colour | tiles show coloured glyphs near the edge, older glyphs already solid | sweep linear 1,000–4,000 px/s at 1080p |
| **count-up** | a number ticks to its value; suffix lands after | tiles show intermediate values | 0.6–1.2 s, `power2.out` |
| **word roll** | columns of words scroll vertically at different speeds with edge fades | tiles show partial words at top/bottom edges | 1–3 s, linear per column |
| **scale settle** | text enters slightly large (1.05–1.12) + blurred and settles | first tile bigger and soft | 0.4 s, `power3.out` |
| **cut-in** | the whole line appears in one frame | one tile without, next with | 1 frame |

A line that is on screen for the whole beat but "alive" (a colour cycling on a label, a
shimmer riding a status word) is **content** motion; record it in the scene's `hold_carrier`.

---

## UI motion

| Motion | What | On the strip | Numbers |
|---|---|---|---|
| **cursor approach** | the pointer travels to a target | the pointer moves along **one axis** (straight up, straight left) in decelerating steps | 0.3–0.9 s, `power3.out`; measure the cursor's height as a fraction of frame height (3–4 % in most product films, up to 8–11 % in macro crops) and write it in `cursor_style` |
| **cursor tap** | press at the cursor **tip** | one tile slightly smaller pointer (scale 0.84), next tiles back to 1 | 0.1 s in `power2.in`, 0.22 s out `power2.out` |
| **pre-action pause** | the cursor rests on the target before the state changes | 3–6 identical tiles with the pointer on the button | 0.15–0.3 s |
| **button press state** | fill darkens / greys, shadow deepens, scale 1.07 | one tile shows the changed fill; often held until the payoff | rationed: once per film is a known good pattern |
| **hover highlight** | row / item tints under the pointer | a background tint appears without a dark flash | 0.14 s; animate from the same hue at 0 alpha, never from `transparent` |
| **dropdown drop** | a menu opens downward | the panel grows from the anchor over 3–6 tiles, often with a soft start | 0.15–0.3 s, `power3.out`; drop distance as fraction of frame height |
| **card rise** | a card enters from below (or a corner), often soft | first tile offset down 3–8 % of frame height and soft; settles over 5–8 tiles | 0.25–0.4 s, `expo.out` |
| **payoff wash / pulse** | the result region flashes a tint, ticks fill, a check draws | one or two tiles brighter / tinted, then normal; check marks fill in sequence | wash 0.2–0.4 s; tick fills 0.1–0.2 s apart |
| **just-written wash** | a field's value surfaces on its own with a highlight, no cursor, no typing | the value is absent in one tile and present + tinted in the next | agent steps emerge; user steps click |
| **chip / content swap** | one persistent element's contents change: old slides out and fades, width morphs, new slides in | outline continuous across tiles; interior changes | 0.4–0.67 s: exit E3, width E2, flash 0.15→1 opacity |
| **micro-stagger** | siblings enter 1–2 frames apart, never together | successive tiles each add one sibling | 30–40 ms |
| **bounce-scale pulse** | emphasis: scale 1 → 0.8 → 1.1 → 1 | one small tile, one large tile, then normal | 0.73 s, `back.out`-shaped |
| **shake + hot-swap** | horizontal decaying bounces while the content swaps every 100–200 ms | tiles alternate offset left/right with shrinking amplitude; text differs per tile | kicks 0.4 → 0.33 → 0.2 s |
| **shimmer / status word** | a gradient highlight rides across a thinking word; the word swaps every ~0.9 s | a bright band at different x per tile on the same word | band linear; swap 0.3 s `power2.inOut`; new word enters scale 1.12 + blur 12 px → 1, 0.4 s |
| **inverse-eased scroll** | a long surface scrolls on one curve; lines pop as they reach a settle line | content translates up in decelerating steps; new rows appear at a fixed y | custom bezier (0.76,0,0.24,1) |
| **waveform bars** | bars change height every frame at ~3 Hz with per-bar amplitude | bar heights differ in every tile | deterministic noise, seeded |
| **dock-magnify roll** | items swell as they pass the centre while a list scrolls | the item nearest the centre is larger in every tile | 1.8 s roll, E1 |

---

## Eases

Name the ease by GSAP name and give the cubic-bezier so any tool can map it. When the strip
does not show the curve, use the vocabulary default and mark `basis: "vocabulary default"`.

GSAP `powerN` is the penner curve of degree N + 1: `power1` = Quad, `power2` = Cubic, `power3` = Quart, `power4` = Quint; easings.net's easeInOutQuad (0.45, 0, 0.55, 1) is `power1.inOut`. The cubic-bezier is the exact form; the validator warns when a name and its bezier disagree.

| Name | GSAP | cubic-bezier | Shape | Use | AE influence (speed 0) |
|---|---|---|---|---|---|
| **E1 whip-settle** | `expo.out` (or CustomEase `M0,0 C0,0 0,1 1,1`) | (0.0001, 0, 0, 1) | instant launch, mile-long decel | text slides, list rolls, chip swaps, snap landings | out 0 % / in 100 % |
| **E2 held snap** | CustomEase `M0,0 C0.9,0 1,1 1,1` | (0.9, 0, 1, 1) | holds, then whips to a dead stop | card rises that hang then land; width morphs | out 90 % / in 0 % |
| **E3 soft standard** | CustomEase (between `power1.inOut` and `power2.inOut`) | (0.33, 0, 0.67, 1) | symmetric | exits, fades, neutral moves | out 33 % / in 33 % |
| **E4 half-whip** | between `power3.in` and `expo.in` | (0.486, 0, 1, 1) | slow start, hard end | secondary text nudges | out 49 % / in 0 % |
| linear | `none` | (0, 0, 1, 1) | constant | wipes, sweeps, deletion, scroll beds | out 0 % / in 0 % (linear keys) |
| sine.inOut | `sine.inOut` | (0.37, 0, 0.63, 1) | gentle | crossfades | out 37 % / in 37 % |
| power1.in | `power1.in` | (0.11, 0, 0.5, 0) | accelerate | throws out, covers | ≈ out 11 % / in 50 % |
| power1.out | `power1.out` | (0.5, 1, 0.89, 1) | decelerate | small entrances | ≈ out 50 % / in 11 % |
| power1.inOut | `power1.inOut` | (0.45, 0, 0.55, 1) | symmetric | glides | out 45 % / in 45 % |
| power2.in | `power2.in` | (0.32, 0, 0.67, 0) | strong accelerate | blur-out exits | ≈ out 32 % / in 33 % |
| power2.out | `power2.out` | (0.33, 1, 0.68, 1) | strong decelerate | entrances, cursor approach | ≈ out 33 % / in 32 % |
| expo.out | `expo.out` | (0.16, 1, 0.3, 1) | very strong decelerate | settle-ins, sharpen-ins | ≈ out 16 % / in 70 % |
| expo.inOut | `expo.inOut` | (0.87, 0, 0.13, 1) | snap both ends | whips | out 87 % / in 87 % |
| sine.inOut | `sine.inOut` | (0.37, 0, 0.63, 1) | soft | drift, zoom component of a glide | out 37 % / in 37 % |
| back.out(1.4) | `back.out(1.4)` | (0.34, 1.4, 0.64, 1) | overshoot | punch landings | ≈ out 34 % / in 36 % (influence cannot overshoot: bake it) |
| scrollBez | CustomEase | (0.76, 0, 0.24, 1) | long inOut | inverse-eased scrolls | out 76 % / in 76 % |

**After Effects mapping** (speed-0 endpoints): `outgoing influence = x1 × 100`,
`incoming influence = (1 − x2) × 100`. Valid when y1 = 0 and y2 = 1; otherwise approximate and
say so — the `≈` rows above: bake the cubic-bezier to per-frame keys when the curve must be
exact. The column is computed with the same formula `render-brief.mjs --target after-effects`
uses, so the brief and this table agree. Frames: multiply seconds by the target comp's fps.
Blur radius defaults: ≈ 20 px at 1080p for blur-dissolve / melt + settle-in / blur push (and any
`soft-then-sharp` arrival); scale by comp height ÷ 1080, and record a measured value in the seam's
`blur_px_1080` when the strip gives one.

**Reading an ease off a strip:** measure the position (or scale) of one landmark per tile.
Big first steps then tiny ones = `out` family (E1 if the first step is most of the travel).
Tiny first steps then big ones = `in` family. Small–big–small = `inOut`. A step past the final
value and back = overshoot (`back.out`). Two or three tiles is not enough to name a curve;
write `basis: "guess"`.

---

## Traps

- **Presentation chrome.** If the film sits inside an editor, a slide, a phone mock or a
  browser window, the film is the inner panel. Record `meta.presentation_chrome` and cite only
  the inner region. Do not copy the chrome.
- **Black tails / heads.** `probe.mjs` reports them. A 4 s black tail is an export artefact,
  not an ending; the ending is the last non-black composition.
- **Card growing ≠ camera.** Movement class before verb.
- **A 4 fps read of a seam is always "cut".** Never write a seam kind from a `c-` sheet.
- **An incoming that arrives oversized and offset is never a plain resolve.** Check the 1–3
  tiles before it for softening or dimming of the outgoing: that is a melt + settle-in. A
  soft-to-sharp resolve's incoming arrives in place, at its final scale.
- **The same surface, bigger, under blur, is a lens move** (blur push), not a dissolve. Ask
  first: is the incoming a different composition, or the one already on screen at a new scale?
- **A one-frame jump into a moving colour mass is the sweep's first frame**, not a corner swell.
  A swell needs intermediate tiles in which the mass grows from its edge or corner.
- **Ticks filling, rows lighting up, a check drawing are UI payoffs**, not whips. A whip needs a
  smeared tile.
- **A blur pulse that returns to sharp before the join is in-beat motion.** The seam starts at
  the last departure toward the join, not at the pulse; count frames from there.
- **A pull under blur is a blur push with `direction: out`.** And only when the outgoing
  blurred or drifted: a sharp outgoing, a one-frame swap and a soft incoming of the same surface
  at a new scale is a `reframe cut` + `incoming: soft-then-sharp` — a lens cut, not a lens move.
- **A repeated cycle is a structure fact.** Say "cycle 2 repeats cycle 1 as the edit" and cite
  both; a builder may then keep one cycle on purpose.
- **Sound.** Measurements are on the mixed program: no stems, no ducking proof, no SFX count. A
  music transient is not a click sound.
- **Exact replica.** The brief must say it. Left alone, a builder adds re-aims and glides the
  reference never had.
