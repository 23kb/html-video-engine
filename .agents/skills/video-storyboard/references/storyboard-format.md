# storyboard.md — the sections, in order, with one filled example row each

`storyboard.md` is the one document a human approves. It is rendered by
`scripts/render-storyboard.mjs` from `scene-map.json` (+ `screens-needed.json`), so the JSON is
the source of truth and the two never drift. Edit the JSON, re-render. The examples below use a
fictional product (**Ledgerly**, an invoicing app) and a fictional reference (`spot-a.mp4`, six
scenes). No real film is quoted.

The reader's test for every section: a person who has not seen the reference and has not seen
the product can say what is on screen, in which state, with which words, for how long, and how
it joins the next scene.

## 1. Status + track

Three or four lines at the top. Status is always `DRAFT — awaiting approval` until the human
says so; the skill never writes `APPROVED`.

```
**Status:** DRAFT — awaiting approval (angle #3 picked: "go for #3")
**Track:** reference replica · target 18.0 s (reference 18.4 s, ratio 0.98) · tool: generic · product: Ledgerly (no profile)
**Spine reference:** spot-a.mp4 · 18.42 s · 1280×720 · 24 fps source · 6 scenes · lens moves: 1
**Exact replica.** Every landing and seam below is the whole movement budget.
```

## 2. Angle

One paragraph: what the film argues and how the reference's structure carries it. Written in
the reference's order so the scene map reads as its expansion.

```
An invoice goes out, the client forgets, Ledgerly reminds them, the invoice gets paid — told in
the reference's grammar: a title on the bed, a wide shot of the invoice, a macro on the
"Remind automatically" toggle as it flips, the reminder email writing itself, the paid badge
landing, the closing line.
```

## 3. Literal copy

Every on-screen line, one row each, with an id the scene map cites. The product name is written
the way the product writes it. Placeholder text, typed prompts, button labels, chips, and
captions are all copy. See `copy-rules.md`.

```
| id | where | scene | text |
|---|---|---|---|
| C1 | display title, centred on the bed | S1 | Ledgerly |
| C2 | statement line, white on the brand field | S2 | Invoices that chase themselves |
| C3 | toggle label (real UI) | S3, S4 | Remind automatically |
| C4 | reminder email subject (real UI, types itself) | S5 | Friendly reminder: invoice #1042 is due Friday |
| C5 | closing line | S6 | Ledgerly. |
```

## 4. Scene map

One row per **reference scene, in the reference's order**. A row says what the reference shows,
how the scene ends, and what we put in its place. `status` is `kept` (the reference's shot with
our content), `override` (mapped to the reference scene but built differently — reason
required), `added` (no reference scene — reason required) or `dropped` (not built). See
`mapping-rules.md` for what may go in each column.

```
| ref | ref t | ref composition | seam out (kind · frames) | our screen / state | what is visible | our copy | our motion | our t (ratio) | evidence | status |
|---|---:|---|---|---|---|---|---|---|---|---|
| S3 | 4.20–6.90 | macro crop of the settings card, the toggle at (0.62, 0.5), cursor approaching; fill 0.31 | hard cut · 1 f; out: card slides left 5 f | `ledgerly-invoice-settings` / `toggle-off` → `toggle-on` | the Reminders card at 1.9×: the "Remind automatically" row with its toggle OFF, the cursor entering lower-right | C3 | cursor glide to the toggle, 5-frame rest, the knob slides right and the track turns brand green; card slides left into the cut | 4.10–6.75 (0.98) | w-4.20:7-11 · f-003:12,22 | kept |
```

### 4b. Triggers, results and overlaps (per scene, under the scene map)

Three columns a build asks for after the fact, so they are in the storyboard from the start
(from a real build in a tool with no camera object; they cost nothing in any other tool):

- **trigger** — every click-driven change with its exact press time and frame at the target
  fps. Seeded from the reference's clicks and typing starts; our time is derived through the
  scene's ratio unless the row sets `t`.
- **in frame at the result** — what must be visible when the payoff lands: the cursor that
  caused it, the whole card, data that is not flat.
- **forbidden overlaps** — what may not cover what in this scene.

```
| scene | trigger | in frame at the result | forbidden overlaps |
|---|---|---|---|
| S3 | press @ 5.92 s / f142 @24 — the toggle (ref click 6.05 s) | the whole Reminders card with the toggle ON, the cursor still on the knob, the "Next reminder: Fri" line readable | cursor over the "Remind automatically" label; caption over the card's rows |
```

## 5. Screens and states needed

The to-do list for the snapshot step (`screens-needed.json`, rendered here). One row per
**screen × state**; a state that must be seen on two surfaces is two rows. The `capture` column
says which capture path applies and, with a product profile, the login route and what chrome to
strip.

```
| slug | surface | page | state | what must be visible | scenes | capture |
|---|---|---|---|---|---|---|
| ledgerly-invoice-settings | app | Ledgerly → Invoice #1042 → Settings tab | toggle-off | the Reminders card with "Remind automatically" OFF; the invoice header above it | S3 | path B (SingleFile save of the logged-in app; human saves, tool ingests) |
| ledgerly-invoice-settings | app | same page | toggle-on | the same card, toggle ON, the "Next reminder: Fri" line under it | S4 | state fragment after clicking the toggle |
| ledgerly-reminder-email | app | the reminder preview modal | rendered | subject line + first two body lines | S5 | state fragment (modal open) |
```

Rows with `surface: editorial` do not appear here; they are listed under the table as
"editorial scenes: S1, S2, S6".

## 6. Camera plan

The header is **copied from the spec** — cadence, lens moves, max hold, ease voice, zoom range,
the lens note. The storyboard does not invent a cadence; the reference already decided it. The
table below the header is the spec's landing list re-timed to our scenes, with our subject in
each row, written so a tool with **no camera object** (a 3D null or a rig as the stand-in) can
key it straight from the row: time in seconds AND frame at the target fps, the anchor as a page
point (the element to centre — in page px when a snapshot manifest exists, else the element's
name), scale %, rotation in degrees, the move in frames, the hold in frames, the ease as GSAP
name + cubic-bezier (a keyframe tool bakes it to per-frame keys), and the trigger.

```
Cadence: 0.54 landings / s (~1 landing / 1.9 s across 10 landings, cuts included) — copied from the spec
Lens moves: 1
Max hold: 2.70 s
Ease voice: cut; snap on the one travelled landing (from its ease)
Zoom range: 1–1.9
Lens: the lens travels once (the blur push into the settings card at 4.20); every other framing change is a cut or a resolve in place.
Target fps: 24 (frames below are at this rate)

| our t (s) | frame | ref t | our subject | anchor (page point) | scale % | rot ° | move in | move (f) | hold (s) | hold (f) | ease | trigger | class | carries the hold | evidence |
|---:|---:|---:|---|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|
| 4.10 | 98 | 4.20 | the Reminders card, macro on the toggle | the toggle row (`.reminder-row`, page px 640,412) | 190 | 0 | blur push | 5 | 2.44 | 59 | expo.out cubic-bezier(0.16, 1, 0.3, 1) — bake to per-frame keys | typing starts / the cut at 4.10 | camera | cursor glide, the flip, the card's exit slide | w-4.20:7-11 |
```

## 7. Seam ledger

Copied from the spec's ledger (kind, frames, outgoing, incoming, ease, evidence) with **our
carrier** in the carrier column — the element of OUR composition that stays continuous across
the join. When the reference's carrier has no equivalent in our content, the row says so and
names what we use instead.

```
| # | our t | ref t | kind | frames | outgoing | incoming | our carrier (ref carrier) | on hit | ease | evidence |
|---|---:|---:|---|---:|---|---|---|---|---|---|
| 3 | 6.75 | 6.90 | hard cut | 1 f | slide left (~5 % of width, 5 f) | none | the brand mark top-left and the near-white bed (ref: the brand mark) | no | none | w-6.85:4-6 |
```

## 8. OVERRIDE list

Every row whose status is `override` or `added`, with its reason. A film with none says `none`.
An override is a deliberate departure, named so the reviewer sees it; it is never dressed as a
citation.

```
- S5 (override): the reference types a chat reply; ours types an email subject line in a real preview modal — same type-on cadence and surface growth, different surface. The modal is a captured state, not editorial.
- S7 (added): a 1.2 s end card with the URL. The reference ends on its closing line; the channel asks for a URL. No reference scene; built as a cut-in.
```

## 9. Open questions

What the spec and the topic could not settle. Each line names what is missing and who can
answer it. Empty is allowed and means "nothing blocks the build".

```
- The toggle's ON colour: the product's brand green or the reference's blue? (product owner)
- Does the reminder email preview exist as a modal or a full page in the current build? (capture step)
```

## Footer

```
Rendered by render-storyboard.mjs from scene-map.json — edit the JSON and re-render; do not edit this file by hand.
```

## What is deliberately not here

- No film code, no primitive names, no tool-specific verbs. Those belong in `brief-<tool>.md`,
  which `render-brief.mjs` produces from the same map through the motion-spec renderer (and
  appends the same null-rig camera table, triggers, results and overlaps for every target).
- No morph chain, shot list or capability map. A tool that needs them adds them after approval;
  this document is the part every tool shares.
- No adjectives as references ("make it feel premium"). Every look claim points at a scene id
  and its evidence tiles.
