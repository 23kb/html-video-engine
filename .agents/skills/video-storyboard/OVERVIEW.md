# video-storyboard

A portable Claude skill: a motion spec (from `reference-motion-spec`) plus a topic in, an
approvable storyboard out — literal copy, a scene map in the reference's order with our screen
and state per scene, the screens-and-states list the snapshot step captures, the camera plan
and seam ledger copied from the spec with our landings and carriers, the press frame of every
click, and a build brief for the target tool with our content substituted. Product-neutral; one
product profile ships (WordPress).

The order it fixes: **motion spec → storyboard → snapshots → build.**

## Requirements

- Node 18 or newer
- The `reference-motion-spec` skill installed next to this one (its renderer and library script
  are imported by `render-brief.mjs` and `pick-reference.mjs`; nothing is copied). Set
  `REFERENCE_MOTION_SPEC_DIR` if it lives elsewhere.
- No npm install. No network.

## Install

Copy this folder into your skills directory and keep the folder name:

```
# project-local
cp -r video-storyboard  <your-project>/.claude/skills/video-storyboard
# or user-wide
cp -r video-storyboard  ~/.claude/skills/video-storyboard
```

## Say this

- "storyboard this: `path/to/motion-spec.json` + `<topic>`"
- "make a video like `clip.mp4` about `<topic>`" (runs `reference-motion-spec` first)
- "which reference fits `<need>`?" (over a library folder of specs)
- "map my storyboard to `<spec>`"
- "storyboard this for WordPress: …" (the product profile, no intake question)

## Hands-off

The spec is the only mandatory input. One ask runs the whole pipeline with **one stop**: the
idea + copy gate (three angles with literal copy — pick one, edit the copy, or "go for #1"). The
product question ("Is this for a specific product? say which, or 'no'") rides on the same
message when the ask did not say. Every other choice lands in `<out>/decisions.md` with its
reason and how to override it. See SKILL.md § Autopilot.

## Quick start (by hand)

```
node scripts/scene-map.mjs clip-motion-spec/motion-spec.json --topic "entries export" --length 20 --product WordPress
# fill entries-export-storyboard/scene-map.json: angle, copy table, every row's "our" block
node scripts/screens.mjs            entries-export-storyboard
node scripts/render-storyboard.mjs  entries-export-storyboard
node scripts/validate-storyboard.mjs entries-export-storyboard         # 0 errors before hand-off
node scripts/render-brief.mjs       entries-export-storyboard --target after-effects --fps 30
node scripts/pick-reference.mjs     <library-folder> --need "fixed lens, typing, one click"
```

Outputs land in `<topic-slug>-storyboard/`: `scene-map.json` (the source of truth),
`screens-needed.json`, `storyboard.md` (rendered from the map — never hand-edited),
`spec-ours.json`, `brief-<tool>.md`, `decisions.md`.

## Folder

```
SKILL.md                       the procedure Claude follows: autopilot, the gate, filling the map, rules, profile
scripts/
  lib.mjs                      args, timeline (our times derived from durations), triggers, the rig table, profiles
  scene-map.mjs                scene-map.json skeleton from a motion-spec.json
  pick-reference.mjs           rank a library of specs for a need (wraps skill 1's library.mjs)
  screens.mjs                  screens-needed.json from the filled map (profile-aware capture routes)
  render-storyboard.mjs        storyboard.md from the map + screens list
  validate-storyboard.mjs      the checks, one line each; exit 1 on errors
  render-brief.mjs             spec-ours.json + brief-<tool>.md through skill 1's renderer (imported)
references/
  storyboard-format.md         the sections in order with a filled example row each
  mapping-rules.md             what may go in a row
  copy-rules.md                literal copy
  handoffs.md                  what to say when the next step is another skill
profiles/
  wordpress.md                 surfaces, chrome, routes, login; machine hints for screens.mjs
```

## Targets for `render-brief.mjs`

`hyperframes` · `claude-design` · `after-effects` · `remotion` · `generic` (the same set as
skill 1). Every brief gets the rig camera table (time in s and frames, anchor as a page point,
scale %, rotation, move and hold in frames, ease to bake, trigger), the triggers / results /
overlaps table and the copy table appended.

## Notes

- The camera header (cadence, lens moves, max hold, ease voice, zoom range) is copied from the
  spec. The reference decided it; the validator refuses a map that edits it.
- `storyboard.md` says `DRAFT — awaiting approval` until a human writes otherwise.
- Nothing leaves the machine; no screen is captured here.
