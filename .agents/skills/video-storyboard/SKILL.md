---
name: video-storyboard
description: "Turn a motion spec (from reference-motion-spec) plus a topic into an approvable storyboard: literal copy, a scene map in the reference's order with our screen per scene, the screens-and-states list to capture, camera plan, press frames, and a build brief for the target tool. Product-neutral, optional product profile. Use when asked to storyboard this, storyboard <spec> + <topic>, make a video like <clip> about <topic>, which reference fits <need>, map my storyboard to <spec>, scene map, screens needed."
---

# video-storyboard

Decides which reference scene becomes which of OUR scenes, with OUR screen and OUR copy, and
therefore which screens the snapshot step must capture. Skill 1 (`reference-motion-spec`) says
how a reference moves; skill 2 (`html-snapshot`) freezes the real screens; this skill is the
step between them, and it fixes the order for good: **motion spec → storyboard → snapshots →
build.** It writes storyboards, never film code.

## Autopilot — the contract

The only mandatory input is a `motion-spec.json` (or a library folder of them — then the skill
picks). One ask — "storyboard this: `<spec>` + `<topic>`", "make a video like `<clip>` about
`<topic>`" — runs the whole pipeline with **one stop**: the idea + copy gate. Everything else is
hands-off: scene map → screens list → storyboard → validator → brief → `decisions.md`.

Optional inputs are used when given and never demanded: a topic source (a doc URL or path, a
feature name, a post, a one-line ask), existing snapshot slugs and states, a target tool, a
target length, a target fps, a product.

**The one gate.** After intake the skill drafts three angles from the topic — one plain, one
ambitious, one that follows the reference's structure most literally — each with its literal
copy, and stops: *"pick one, edit the copy, or say go for #1."* Nothing else asks. After the
pick, the map, the screens list, the storyboard and the brief are produced without questions.
"You pick" means #1, written to `decisions.md`.

**The one intake question rides on the gate.** *"Is this for a specific product? (say which, or
'no')"* is asked once, in the same message as the three angles, unless the ask already names
the product. With a product, `profiles/<product>.md` is loaded if it exists (only
`profiles/wordpress.md` ships); otherwise the skill works neutral and writes the product's name
into copy the way the product writes it.

Defaults when nothing is given: target `generic`; length = the reference's; fps 24; the output
folder `<topic-slug>-storyboard/` in the working directory (or `-2` if it holds a map). A
reference that repeats its cycle keeps every row (a second cycle is where a follow-up goes).

**Every choice the skill makes on its own is one line in `<out>/decisions.md`** — what, why,
how to override:

```
product=WordPress — the topic names a WordPress plugin — say "no product" to run neutral
angle=#3 (most literal) — the gate answer was "go for the most literal angle"
S6 = the builder, S13 = the published form — "the form is real" lands last on the frontend — swap the rows to change it
ratio 0.996 — target 15 s against the reference's 15.06 s — pass --length to change
```

Nothing in v1 needs consent (no uploads, no downloads, no network). If the spec is missing or
has no `structure.scenes`, say so and stop; that is the only halt besides the gate.

**What it needs:** Node 18+. No other dependency. `render-brief.mjs` and `pick-reference.mjs`
import the `reference-motion-spec` skill's renderer and library script (installed next to this
skill, or `REFERENCE_MOTION_SPEC_DIR`); they carry no copy of them.

**What it does not do:** write film code, capture screens, invent a cadence (the reference
decided it), or approve anything — `storyboard.md` says `DRAFT` until a human writes otherwise.

## Files

| Path | Role |
|---|---|
| `scripts/scene-map.mjs` | `scene-map.json` skeleton: one row per reference scene with its time, composition, framing, seam out, in-beat motion, landings, text beats, clicks (seeded as triggers with press frames), evidence; our columns empty; durations seeded by the target ratio |
| `scripts/pick-reference.mjs` | ranks a library of specs for a need (wraps skill 1's `library.mjs --query`); top 3 with one reason each and the next command |
| `scripts/screens.mjs` | `screens-needed.json` from the filled map: unique screen × state, which scenes need each, what must be visible, the capture route (profile-aware) |
| `scripts/Codex-design.mjs` | what the storyboard adds to a Codex Design brief: our `OM_SCENES`, camera focus points (fx, fy, s) in stage px from the measured anchors, `<Captions>` items and `TWEAK_DEFAULTS` from the copy table, the voice-over skeleton at a wpm |
| `scripts/fill-anchors.mjs` | after the snapshots exist: `--list` names the words each snapshot's `targets.json` must map; then fills `anchor_px`, `anchor_selector`, every press's `selector` + `px` and the row's `mount` from the measured `targets.json` |
| `scripts/render-storyboard.mjs` | `storyboard.md` from the map + screens list — the document a human approves; the JSON is the source of truth |
| `scripts/validate-storyboard.mjs` | every row cites a reference scene or carries OVERRIDE; `visible` on every kept row; copy covers every text beat; camera header equals the spec's; every screen in the map is in the screens list; durations sum to the target ±5 %; every click has a press frame; storyboard.md matches the map |
| `scripts/render-brief.mjs` | `brief-<tool>.md`: writes `spec-ours.json` (the spec with our scenes, copy, carriers, timeline) and imports skill 1's renderer to render it; appends the rig camera table, triggers / results / overlaps and the copy table |
| `references/storyboard-format.md` | the sections in order, a filled example row each (fictional product, fictional reference) — **open it before filling a map** |
| `references/mapping-rules.md` | what may go in a row: one spine, beat count follows the reference, kept vs override, ratios, live substitutes, agent vs user, payoffs, press frames, cursors, page-load cuts |
| `references/copy-rules.md` | literal copy is a contract; the product name as the product writes it |
| `references/handoffs.md` | the two lines to say when the next step is `html-snapshot`, `reference-motion-spec`, the build, or the library |
| `profiles/wordpress.md` | admin / builder / frontend surfaces, chrome to strip, `admin.php?page=`, `wp-login.php` route; machine hints `screens.mjs` reads |

Outputs, in `<topic-slug>-storyboard/`: `scene-map.json`, `screens-needed.json`,
`storyboard.md`, `spec-ours.json`, `brief-<tool>.md`, `decisions.md`.

## Pipeline

Run the scripts from the skill folder (or by absolute path), always through `node`.

```
node scripts/pick-reference.mjs <library> --need "…"                       # 0  only when the ask has a need and no spec
node scripts/scene-map.mjs <motion-spec.json> --topic "…" [--length s] [--product p] [--tool t] [--fps 24] [--out dir]   # 1  skeleton
# 2  READ the spec's use_when, acts, scenes, seams, agent_vs_user, payoffs; READ the topic source
# 3  draft three angles with literal copy; the GATE (with the product question if unstated)
# 4  FILL scene-map.json: angle, copy table, every row's "our" block (below)
node scripts/screens.mjs <out>                                            # 5  screens-needed.json
node scripts/render-storyboard.mjs <out>                                  # 6  storyboard.md
node scripts/validate-storyboard.mjs <out>                                # 7  0 errors before hand-off; fix the map, re-render
node scripts/render-brief.mjs <out> --target <tool> [--wpm 140|relaxed]  # 8  brief-<tool>.md via skill 1's renderer (wpm: the Codex-design voice-over budget)
# 8b once the snapshots exist: node scripts/fill-anchors.mjs <out> --snapshots <root> --list → targets.json per snapshot → html-snapshot's targets.mjs → fill-anchors.mjs (no --list) → re-run 6, 7, 8
# 9  write <out>/decisions.md; say the next-step line (references/handoffs.md)
```

Steps 2–4 are reading and writing steps: the model reads JSON and fills JSON. The scripts serve
the filling; they do not replace it. Never hand-write `storyboard.md` — edit the map and
re-render, so the document and the machine-readable map cannot drift.

## The gate message

One message, then wait. Shape:

```
Product? (say which, or "no")                      ← only when the ask did not say

Angle 1 — plain: <one paragraph>
  copy: <every on-screen line, one per line>
Angle 2 — ambitious: <one paragraph>
  copy: …
Angle 3 — the reference's structure, literally: <one paragraph>
  copy: …

Pick one, edit the copy, or say "go for #1".
```

The three angles differ in structure, not adjectives: #1 uses the fewest scenes the reference
allows (a repeated cycle dropped), #2 spends the reference's shape on a bolder idea (the second
cycle shows the other side, the result, the customer), #3 keeps every reference scene and lays
the topic's steps over them in order. Each angle's copy follows `references/copy-rules.md`.

## Filling the map — the row's `our` block

For every row (`references/mapping-rules.md` has the full rules; `storyboard-format.md` the
filled examples):

- `screen` — a snapshot slug (`chatgpt-home`, `form-builder`) or `editorial` for a drawn
  scene; `surface` — `editorial | app | page | admin | builder | frontend` (a profile may add
  its own); `page` — the URL or page name; `state` — the state the scene needs (`composer-empty`,
  `option-added`): a state that exists only after interaction is its own state.
- `visible` — what a camera must be able to see in this scene, in words a stranger could point
  at. Required on every kept row; this is what makes the storyboard readable on its own.
- `copy` — ids from the copy table; every row that shows text cites its ids.
- `motion` — our equivalent of the reference's in-beat motion (what moves, from what to what,
  continuous or discrete, where a type-on is cut off). A live reference scene gets a live
  substitute.
- `carrier` — what of ours stays continuous across the seam out.
- `triggers` — seeded from the reference's clicks and typing starts (`ref_t`); set `t` to move a
  press; add one for every click-driven change of ours. The press frame renders at the target fps.
- `in_frame_at_result` — what must be visible when the payoff lands (the cursor that caused it,
  the whole card, data that is not flat); `forbidden_overlaps` — what may not cover what.
- `anchor` — the element to centre for the landings in this scene, in the words `targets.json`
  will map (`anchor_px`, `anchor_selector` and `mount` are filled by `fill-anchors.mjs` from the
  snapshots' measured `targets.json`; a build never measures prose); `rotation_deg` for
  three-quarter views.
- `duration` — seeded by the ratio; redistribute if a scene needs it; the sum stays the target.
- `status` — `kept` (the reference's shot with our content) · `override` (mapped, built
  differently — reason required) · `added` (no reference scene — reason required) · `dropped`.

The top level holds `angle` (options, picked, text), `copy` (id, where, scene, text),
`open_questions`, `product` / `profile`, `target` (length, tool, fps, `stage` — 1920×1080 unless
`--stage WxH`; every fill and zoom is a fraction of it), `identity_ours` (our palette hex, type
families, logo asset — fill it at the gate from the product's own site; the brief's Identity stays
the reference's and the validator warns until it is filled). The camera header is
copied from the spec and never edited.

## Rules that decide a row

1. **One spine, the reference's beat count.** A second reference fills at most a gap and says so.
2. **Kept means "the reference's shot with our content."** Anything else is an override with a
   reason. Never dress an invention in a citation.
3. **Live scenes get live substitutes.** The reference's `hold_carrier` is the checklist.
4. **Agent steps emerge, user steps click** — copy the reference's split; a demo click has a
   visible cursor at the depth of the object it presses, checked in the render.
5. **A payoff arrives after a beat**, on the reference's before-hold, with its own motion.
6. **Every click names its press frame; every payoff names what is in frame; every scene lists
   its forbidden overlaps.** A build asks for these after the fact.
7. **A page-load cut between two layouts reads as a jerk:** dissolve the content, slide the
   column that changes, the cursor riding its target.
8. **The camera plan is copied, not written.** The reference decided the cadence; the storyboard
   re-times the landings to our scenes and adds the anchor per landing.
9. **Copy is literal**, product names as the product writes them.
10. **"Exact replica" lives in the brief**, not the storyboard: what and when here, how there.

## Product profile

Neutral by default. With `--product <name>` (or the gate answer), `profiles/<name>.md` is
loaded when it exists; its prose tells the model how the product's screens are organised, its
JSON block tells `screens.mjs` the capture route, login and chrome per surface. Only
`wordpress` ships: admin vs builder vs frontend surfaces, the admin bar and notices as chrome, a
frontend capture as a shot of the form or page rather than the theme, plugin pages under
`admin.php?page=`, a possible site registry, login through `wp-login.php` with `#user_login` /
`#user_pass` / `#wp-submit`. It knows no particular plugin. A product with no profile still gets
its name in copy and neutral capture routes.

> At the gate, persist what was offered: `angle.options[] = {name, summary}` (one line each) and `angle.picked`; `angle.text` is the picked angle in one paragraph. The storyboard renders all three so the approver sees what the pick was chosen against.

## Say this

- **"storyboard this: `<path/to/motion-spec.json>` + `<topic>`"** — the full pipeline; one stop
  at the gate.
- **"make a video like `<clip.mp4>` about `<topic>`"** — runs `reference-motion-spec` on the clip
  first, then this skill on its `motion-spec.json`.
- **"which reference fits `<need>`?"** — `pick-reference.mjs` over the library; the top three
  with reasons; "storyboard #2" continues.
- **"map my storyboard to `<spec>`"** — an existing beat list or storyboard is laid over the
  reference's scenes: the rows are filled from it, the rest of the pipeline runs.
- **"storyboard this for WordPress: …"** — the product profile, no intake question.
- **"you pick"** at the gate — angle #1, written to `decisions.md`.

## Next-step lines

Say them in one or two lines (`references/handoffs.md`): screens → `html-snapshot` with the
`screens-needed.json` path and the install link; a clip without a spec → `reference-motion-spec`
first; the build → `storyboard.md` + `brief-<tool>.md` + the snapshot slugs. The idea and the
copy never hand off: they stop at the human, once, here. These lines are not the video handoff
file: in a pass, `video-pipeline` writes `video-handoff.md` with its `scripts/handoff.mjs`. Never
hand-write a handoff document.

Two rules the build depends on:

- Every entry in `open_questions` ends with `— default: …`, the choice the build makes until the
  answer comes. The validator warns on one without it. Write the default yourself — the choice
  you would build with — and leave the question open; never wait for the user to supply it.
- `identity_ours` is filled whenever the map is touched and it is empty: palette hex and type
  families read from the product's own stylesheet (a snapshot's `index.html` carries it), the
  logo from the page header, and `roles` — bed, emphasis, cursor, ink, trail — the editorial
  colours OURS uses (a decision; the reference's are not ours). `type` names an embeddable family
  (a woff2 you can ship), never only a system stack. It is ours, not the reference's, and not a guess.
- A default on an open question never rearranges the real UI: a whip lands on the real geometry
  ("down-left to Save Settings"), it does not move Save Settings.
- A scene with more than one landing fills `landing_anchors[]`: a glide lands on a different
  element than the cut it left; the rig, the handoff and the focus points read the landing's
  anchor first. The validator warns while a landing after the first has no anchor.
- For a target that is not HTML (After Effects, Codex Design, Remotion), every press that changes
  the screen needs its result as a captured state in `screens-needed.json` (`states.mjs`), because
  those tools rebuild from rasters and a live DOM flip does not exist there.
- The storyboard renders a `## Sound` section from the spec (bed, SFX, energy, the sync points
  re-timed to our timeline). When the reference has a music bed and the ask names no track, add
  the open question: "Music: the reference has a bed and N seams sit on its beats; we have no
  track — default: build silent, keep the beat times in ## Sound".

## Privacy and rights

The storyboard carries our copy, never the reference's, and never the reference's file name:
`storyboard.md`, `brief-<tool>.md` and `spec-ours.json` say "the reference clip" and nothing
more, because they leave the machine with the build. The spec's `meta.source` (the file name)
stays in the spec folder; `scene-map.json` keeps the spec's path only, as the machine pointer the
re-render and the brief need. No screen is captured here; the screens list names pages, never
credentials.
