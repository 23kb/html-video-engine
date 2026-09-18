# reference-motion-spec

A portable Claude skill: reference video in, tool-neutral motion spec out. Contact sheets at
4 fps for composition, 24 fps strips around every cut for transitions, measured audio, a seam
ledger that names every join by kind with frame counts, a camera plan, text and UI motion, eases
as GSAP name + cubic-bezier, and a build brief rendered for the tool you are about to use.

## Requirements

- Node 18 or newer
- `ffmpeg` and `ffprobe` on PATH, or `FFMPEG_PATH` set to the binary or its folder
- No npm install. No network.

Optional: `SHEET_FONT=/path/to/font.ttf` if the badge font is not found automatically
(Windows: Arial Bold; macOS: Arial Bold / Helvetica; Linux: DejaVu Sans Bold).

## Install

Copy this folder into your skills directory and keep the folder name:

```
# project-local
cp -r reference-motion-spec  <your-project>/.claude/skills/reference-motion-spec
# or user-wide
cp -r reference-motion-spec  ~/.claude/skills/reference-motion-spec
```

Then ask: "analyze this reference: path/to/clip.mp4" or "motion spec for clip.mp4, brief for
After Effects", or "make a video like clip.mp4 about <topic>".

## Hands-off

The video file is the only mandatory input. One ask runs the whole pipeline with no questions in
between; the target tool, a storyboard or beat list, a length and keep/drop notes are optional
and used when given. Every choice the skill makes on its own lands in `<out>/decisions.md` with
its reason and how to override it. See SKILL.md § Autopilot.

## Quick start (by hand)

```
node scripts/probe.mjs   clip.mp4
node scripts/sheets.mjs  clip.mp4
node scripts/audio.mjs   clip.mp4
node scripts/windows.mjs clip.mp4 --at 0.85,2.8,5.5      # after reading the 4 fps sheets; 12-tile strips
# read the strips, write clip-motion-spec/cuts.json
node scripts/validate-spec.mjs clip-motion-spec/cuts.json --windows clip-motion-spec/windows --meta clip-motion-spec/meta.json
node scripts/spec-from-cuts.mjs clip-motion-spec                  # motion-spec.json with the ledger copied in
node scripts/frame.mjs   clip.mp4 --at 2.9,5.5                    # full-res frames with a 10% grid, for fill / zoom
node scripts/palette.mjs clip.mp4 --at 0.5,3.0                    # dominant colours, for identity.palette
# fill identity / structure / camera / grammar / sound / eases / do_not
node scripts/validate-spec.mjs clip-motion-spec/motion-spec.json --sheets clip-motion-spec/sheets --windows clip-motion-spec/windows
node scripts/render-brief.mjs  clip-motion-spec/motion-spec.json --target spec-md
node scripts/render-brief.mjs  clip-motion-spec/motion-spec.json --target after-effects --fps 30
```

Outputs land in `clip-motion-spec/` in the folder you run from (`--out <dir>` for another folder; the
tools refuse to overwrite an existing analysis without `--force`): `meta.json`, `audio.json`,
`sheets/`, `windows/`, `frames/`, `palette.json`, `cuts.json`, `motion-spec.json`,
`motion-spec.md`, `brief-<target>.md`, `decisions.md`, and `scene-map.md` when beats were given.

Many analyses in one folder become a library:
`node scripts/library.mjs <that folder> --out <that folder>/catalog.json` writes `catalog.json`
(searchable with `--query "fixed lens, word pop"`) and `examples-by-kind.md` (every vocabulary
kind with the clips, strips and tiles that show it).

## Library

The skill ships with analyzed references in `library/` (neutral ids, names redacted, no source
videos, only the strips each spec cites). With no clip of your own, ask "which reference fits
<what the video must do>?" and the skill ranks them from `catalog.json`; `examples-by-kind.md`
gives a real strip for every transition, camera verb, text reveal and UI motion in
`vocabulary.md`. Add your own: analyze a clip, then `node scripts/package-library.mjs <folder
of analyses> --out library --redact "<names>"` re-packages and re-indexes.

## Folder

```
SKILL.md                     the procedure Claude follows
scripts/
  lib.mjs                    ffmpeg resolution, badge filter, arg parsing
  probe.mjs                  meta.json
  sheets.mjs                 c-NNN.png (4 fps) · f-NNN.png (24 fps) · overview.png · map.txt
  windows.mjs                w-<t>.png strips around candidate seams (+ index.json)
  audio.mjs                  audio.json
  frame.mjs                  full-resolution frame with a 10% grid (measuring)
  palette.mjs                dominant colours per frame, exact pixel samples
  spec-from-cuts.mjs         motion-spec.json from meta + audio + cuts (placeholders for the rest)
  validate-spec.mjs          schema + evidence rules
  render-brief.mjs           motion-spec.md and brief-<target>.md
  library.mjs                catalog.json + examples-by-kind.md across many specs
  package-library.mjs        working library -> shareable library (neutral ids, redacted, cited strips only)
library/
  ref-NN/                    shipped analyses: motion-spec.md, motion-spec.json, cuts.json, brief-*.md, windows/
  catalog.json               searchable index (--query)
  examples-by-kind.md        a real example (clip, time, strip, tiles) for every kind in the vocabulary
references/
  vocabulary.md              seams, camera verbs, text reveals, UI motion, eases — with recognition cues
  reading-sheets.md          how to read the sheets and count frames
  spec-schema.json           motion-spec.json v1
```

## Targets for `render-brief.mjs`

`hyperframes` · `claude-design` · `after-effects` · `remotion` · `generic` · `spec-md`

## Notes

- The analysis never leaves the machine. You supply the video file; if you give a URL the skill
  asks you to download it and offers to run yt-dlp for you — only on your yes, and the source is
  your responsibility.
- The 24 fps grid is a resample. Times are approximate within 1/24 s; no value is a recovered
  keyframe or source ease.
- Outputs are deterministic for the same input, so a re-run can be diffed.
