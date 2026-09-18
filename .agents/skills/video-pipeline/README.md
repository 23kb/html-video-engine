# video-pipeline

The driver for the video-material skills. One ask — "make a video like `clip.mp4` about
`<topic>`" — runs `reference-motion-spec` → `video-storyboard` → `html-snapshot` in order,
stops once for your angle and copy, reports progress after each step, and keeps
`video-pipeline.json` so "continue the video" and "where are we" always know what is done and
what is next.

It makes the **material** for a video (motion spec, storyboard, brief, real-UI snapshots) and
ends with `video-handoff.md`, one file that maps all of it. The video itself is built afterwards
in your tool (HyperFrames, Claude Design, After Effects, Remotion, HTML): give a fresh session
that file and say "build the video from `video-handoff.md`", or "is the material in
`video-handoff.md` enough to produce the video?".

## Say this

- "make a video like `clip.mp4` about `<topic>`"
- "make a video about `<topic>`" — picks a reference from the shipped library first
- "continue the video" · "where are we" · "which skill do I run now"

`node scripts/status.mjs` prints done / next / remaining from the state file.
`node scripts/handoff.mjs` writes `video-handoff.md` once steps 1–3 are done.

## Install

See `references/install.md`. Four folders; each skill also works on its own.
