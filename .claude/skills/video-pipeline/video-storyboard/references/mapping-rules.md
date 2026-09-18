# Mapping rules — reference scene → our scene

The scene map is where a reference's motion meets our content. These rules decide what may go
in a row. Each one exists because a replica that broke it came back as "like the reference but
not good".

## 1. One spine reference

The map follows one `motion-spec.json`. A second spec may fill a beat the spine has no scene
for; that row names the second spec in `our.note` and is still an `added` row against the spine
(the validator counts reference scenes from the spine only). Two spines make a film that is
neither.

## 2. Beat count follows the reference

One row per reference scene, in the reference's order, including twins (a looped or repeated
cycle). Our story is cut to the reference's scene count, not the other way round. If the topic
has more steps than the reference has scenes, steps merge or wait for another film; if it has
fewer, a scene is `dropped` with a reason in `our.note`, never padded. A repeated cycle is a
gift: the second cycle carries the follow-up, the edit, the second example.

## 3. "The reference's shot with our content", or it is an override

A row is `kept` only when a stranger could say: *this is the reference's scene S<n> — same
framing, same in-beat motion, same seam out — with our screen and our words in it.* Anything
else is `override` (mapped to a reference scene, built differently) or `added` (no reference
scene), each with a one-line `override_reason`. Do not dress an invention in a citation. The
OVERRIDE list is not a failure list; it is the reviewer's short list.

## 4. Time ratio, stated when it is not 1

`our.duration ÷ ref_duration` is the ratio. `scene-map.mjs` seeds a uniform ratio from
`--length`; the map may redistribute time between scenes (a longer type-on, a shorter title),
and the storyboard prints the ratio on every row so a 2× stretch is visible. The sum of kept
durations is the target length (±5 %, validator). Frame counts on seams do not scale — a 1-frame
cut stays 1 frame at any ratio.

## 5. Live reference scenes get live substitutes

If the reference scene is alive (text streaming, a label cycling, a card settling, a cursor
travelling, bars growing), our scene is alive the same way: `our.motion` names the equivalent
(what moves, from what to what, continuous or discrete). A static screenshot in a live scene is
the single most common cause of "not like the reference". The reference's `hold_carrier` is the
checklist for the row.

## 6. Agent steps emerge, user steps click

Copy the reference's `ui_motion.agent_vs_user` split. Where the reference shows a cursor
clicking, our row has a cursor and a click on a real control; where the reference's result
appears on its own (a reply streams, fields land, a chart draws), ours appears on its own. Do
not add a cursor the reference does not have, and do not let an agent's result arrive under a
cursor.

## 7. A payoff arrives after a beat

Each reference payoff (`ui_motion.payoffs`) has a `before_hold`: the "before" is shown for that
long, then the change lands with its own motion. Our row keeps the before-hold and names our
payoff (the field that appears, the badge that lands, the option that is added). One payoff per
reference payoff; a step with no visible consequence is not a payoff and does not get one.

## 8. Screens follow the map, not the other way round

`our.screen` + `our.state` + `our.visible` on every non-editorial row is the contract for the
snapshot step. `screens.mjs` derives `screens-needed.json` from these fields — unique screen ×
state pairs, which scenes need each, what must be visible in the union. Write `visible` as what
a camera must be able to see in that scene (the row with its toggle, the header above it), not
what the page contains. A state that exists only after interaction (a menu open, a value
typed) is its own state row.

## 9. "Exact replica" goes into the brief

The storyboard does not restate the motion rules; `render-brief.mjs` re-renders skill 1's brief
with our content, and that brief opens with the replica rules and the spec's do-not list. The
storyboard's job is what and when; the brief's job is how.

## 10. Copy is literal

Every on-screen line is in the copy table with an id, and every row that shows text cites the
ids it shows. Copy that is "roughly like this" is not copy. See `copy-rules.md`.

## 11. Chrome and presentation

If the spec's `meta.presentation_chrome` names an inner panel, the map treats the panel as the
film; our screens are framed the same way. Product chrome that the reference does not show (an
admin bar, a notice, a browser frame) is stripped at capture — the profile says which.

## 12. What a row may not do

- cite a reference **phase** ("cards stack in") instead of a scene id — portable phrases prove
  nothing about a composition;
- change the seam kind or frame count — those belong to the spec; a different join is an
  override with a reason;
- name a tool primitive — the brief does that per target;
- carry copy that is not in the copy table;
- leave `visible` empty on a kept row.

## 13. Every demo click has a visible cursor that belongs to the object it clicks

A click the viewer cannot see is a state change with no cause. The cursor is drawn at the depth
of the thing it presses (the same card, the same lifted layer, the same 3D plane in a tool that
has one), moves with it, and is checked in the render, not in the key table. A row with a click
names the cursor in `motion` and lists it under `in_frame_at_result`.

## 14. A page-load cut between two layouts reads as a jerk

When a step navigates (a save that reloads, a tab that swaps the page), do not cut from one
layout to the next: dissolve the content and slide the column that changes, with the cursor
riding its target across the join. The row's `carrier` names the column and the cursor; the seam
kind stays the reference's, the treatment is how our two layouts meet inside it.

## 15. Every click names its press frame; every payoff names what is in frame

Three things a build asks for after the fact, so the storyboard carries them per scene:

- **trigger** — for every click-driven change, the exact press time in seconds and the frame at
  the target fps ("press @ 4.42 s / f106 @24"). `scene-map.mjs` seeds one trigger per reference
  click and typing start; our time is derived through the scene's ratio unless the row sets it.
- **in frame at the result** — what must be visible when the payoff lands: the cursor that
  caused it, the whole card (not a cropped one), data that is not flat (a chart with bars, a
  list with rows).
- **forbidden overlaps** — what may not cover what in this scene: a caption over headings, rows
  or click targets; a cursor over the label it is about to press; a lifted card over the
  column that explains it.

The validator warns when a scene has a click and no press frame, or a payoff and no result
line.

## Filling order that works

1. Read the spec's `meta.use_when`, `structure.acts`, every scene's `subject` /
   `hold_carrier`, the seam kinds, `ui_motion.agent_vs_user`, the payoffs.
2. Walk the topic's steps in order and lay them against the acts — which step is the ask,
   which is the work, which is the payoff, which is the closing line.
3. Assign a screen × state to every non-editorial scene; write `visible` for each.
4. Write `motion` for every live scene from its `hold_carrier`.
5. Write the copy table, then cite ids per row.
6. Decide the carriers across seams (what of OURS stays put).
7. For every click: the press time and frame; for every payoff: what is in frame; per scene:
   the forbidden overlaps; for every landing scene: the anchor element to centre.
8. Mark overrides and added rows honestly. Re-read rule 3.
