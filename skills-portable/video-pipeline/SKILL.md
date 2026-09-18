---
name: video-pipeline
description: "Video material from a reference clip: analyzes the clip into a motion spec, storyboards a topic against it, freezes the real UI as HTML snapshots, and writes one handoff for HyperFrames, Claude Design, After Effects, Remotion or HTML. Use for: make a video like <clip> about <topic>, analyze this reference, motion spec, storyboard this, snapshot this page, continue the video, write the handoff."
---

# video-pipeline

Three skills make the **material** for a video. This one runs them in the right order, keeps
score, and ends by writing `video-handoff.md`: the one file that maps every deliverable, which
the user hands to the tool that builds the video. It does not build the video: the build happens
afterwards in whatever tool the brief targets (HyperFrames, Claude Design, After Effects,
Remotion, plain HTML), from that handoff.

## Say this

- "make a video like `clip.mp4` about `<topic>`" — the whole material pass
- "make a video about `<topic>`" (no clip) — picks a reference from the library first
- "continue the video" / "where are we" — reads the state file, does the next step. Once steps 1–3
  are done this always means: fill what `status.mjs` lists as incomplete, then run
  `scripts/handoff.mjs` again. An existing `video-handoff.md` is never the answer; its status line
  is only as fresh as the last run
- "write the handoff" / "hand off the video material" — step 4 alone, when 1–3 are done: run
  `node scripts/handoff.mjs`. The file is generated from the state and the disk, never written by
  hand, and it is not the storyboard skill's one-line "next step" pointer
- "which skill do I run now" — routing only

For a single step, open that worker's own `SKILL.md` inside this folder and follow it as if it
were the skill: analyze a clip → `reference-motion-spec/SKILL.md`; storyboard from a spec →
`video-storyboard/SKILL.md`; freeze a page → `html-snapshot/SKILL.md`. Their scripts run by path
from this folder, for example `node <this skill>/html-snapshot/scripts/freeze.mjs`.

## The order, and what each step produces

| Step | Skill | Input | Output | Human stop |
|---|---|---|---|---|
| 1 | `reference-motion-spec` | a video file, or a need to pick from the library | `<clip>-motion-spec/` — `motion-spec.md`, `motion-spec.json` (in a pass, no brief here: the build brief is the storyboard's, with our content) | none |
| 2 | `video-storyboard` | the spec + the topic (+ product, tool, length if given) | `<topic>-storyboard/` — `storyboard.md`, `scene-map.json`, `screens-needed.json`, `brief-<tool>.md` | **one**: pick an angle and the copy |
| 3 | `html-snapshot` | `screens-needed.json` | one snapshot folder per screen, states, gates, mount test, measured `targets.json`; `manifest/` when the target is not HTML | none (a SingleFile save is the human's, when a page is a logged-in SaaS) |
| 4 | this skill — `scripts/handoff.mjs` | the state file and what is on disk | `video-handoff.md` — the map: every file, what it is, who reads it, the screens with their gates, the presses, the open questions, complete or not | none |
| — | the build tool | `video-handoff.md` | the video | the user's own review loop |

Step 3 comes after step 2 because only the storyboard knows which screens and states the
film needs. A user who already has screens can say so; step 3 then captures only what is
missing. Step 3 ends with the measure pass, because every build tool asked for numbers where
the storyboard had words: `video-storyboard/scripts/fill-anchors.mjs <storyboard> --snapshots
snapshots --list` names the words each snapshot must map; write each snapshot's `targets.json`
(word → selector, verified in the fossil), run `html-snapshot/scripts/targets.mjs <slug>` to
measure them, run `fill-anchors.mjs` without `--list`, then re-render the storyboard and the
brief and validate. When the target is After Effects or any tool that is not HTML, run
`html-snapshot/scripts/manifest.mjs <slug>` per snapshot as well. Whenever the map is touched
after its gate — a measure pass, a re-render, "continue the video" — fill what the validator
warns about before the handoff: `identity_ours` from the product's own CSS (the snapshot's
stylesheet is the truth for its palette and type; the logo is the asset in the page header),
`target.stage` (1920×1080 unless told), and a `— default: …` on every open question (the choice
you would build with, said as a default, never as an answer for the user). The handoff counts
each of these as **incomplete** until it is there. Step 4 runs once 1–3 are done (`node scripts/handoff.mjs` in the working directory);
it reads, never re-generates, and says **complete** or **incomplete** with what is missing. It
also copies in `references/tool-notes.md` under "If you build in …": one section per build tool
(the target first) with the constraints that tool imposes and what to do instead, learned from
real builds. A tool that teaches a new constraint gets a line there, not a new file. The
user gives that one file to a fresh build session with one of the two sentences printed inside
it: build the video from it, or check whether it is enough to produce the video.

## Keep the user in the loop

Start by saying what the pass will produce and where the one stop is (the storyboard's angle
and copy). Then run. In a pass, skill 1 renders `spec-md` only; the build brief is the
storyboard's `brief-<tool>.md`, and the handoff names it. At the end name `video-handoff.md`
and nothing else: it carries the file map and the two sentences for the build session. After
every step, one line, then what is next and what is left:

```
done  1/4  motion spec — 14 seams, 2 lens moves → clip-motion-spec/motion-spec.md
next  2/4  storyboard — stops once for your angle + copy
left       3/4 snapshots (6 screens from the storyboard's list) · 4/4 handoff
```

```
done  4/4  handoff — 6 screens, brief-hyperframes.md, 2 open questions → video-handoff.md
```

At the storyboard gate, show the three angles with their copy and wait. Nothing else stops.
If a step fails (a missing tool, a page that will not freeze, an account limit), say which
step, what exists on disk, and the exact ask that resumes it. The state file makes the resume
cheap.

## The state file

`video-pipeline.json` in the working directory (the project). Every step's output lands there too: `./<clip>-motion-spec/`, `./<topic>-storyboard/`, `./snapshots/`. Nothing is written next to the video.

```json
{ "topic": "…", "reference": "clip.mp4 | library:ref-02", "target": "hyperframes",
  "spec": "clip-motion-spec/motion-spec.json", "storyboard": "topic-storyboard/storyboard.md",
  "screens": [ { "slug": "pricing", "status": "captured | pending | human-save" } ],
  "steps": { "1": "done", "2": "gate", "3": "pending", "4": "pending" }, "handoff": "video-handoff.md", "updated": "<iso date>" }
```

Write it after each step. `node scripts/status.mjs` reads it, checks that every referenced
file still exists, and prints done / next / remaining. "Continue the video" and "where are we"
start from that output. Never re-run a step whose output exists unless the user asks; say
"spec exists from <date>, reusing" instead.

## Layout — one skill, three workers inside it

This folder is the whole set. Beside this file sit `scripts/` and `references/` (the driver's),
and three worker folders, each a complete skill with its own `SKILL.md`, `scripts/` and
`references/`:

```
video-pipeline/            ← this SKILL.md, scripts/status.mjs, scripts/handoff.mjs, references/
  reference-motion-spec/   ← step 1: clip → motion spec (+ the library of four references)
  video-storyboard/        ← step 2: spec + topic → storyboard, screens list, briefs
  html-snapshot/           ← step 3: page → snapshot, gates, targets, manifest (needs `npm install` once)
```

When a step runs, read that worker's `SKILL.md` first and follow it; run its scripts by path from
this folder. The workers find each other as siblings (the storyboard borrows the spec skill's brief
renderer from `../reference-motion-spec/`), so the folder is moved or copied whole, never split.
If a worker folder is missing, say which step needs it and stop that step; the others still run.

## What this skill never does

- Build the video, render frames, or touch the build tool.
- Run a step the user did not ask for, or re-analyze a clip that already has a spec.
- Hide a failure inside a summary: a step that did not finish is reported as not finished.
