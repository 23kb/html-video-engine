# Video Pipeline — reference clip to build-ready material

Give it a reference video and a topic. It hands back everything a video tool needs to build that
motion on your real product UI: a motion spec read from the clip frame by frame, a storyboard for
your topic in the clip's rhythm, the real screens frozen as HTML snapshots, and one handoff file
with a build brief for HyperFrames, Claude Design, After Effects, Remotion or plain HTML.

It does not build the video. The build happens in your tool, from the handoff.

## Two ways to start

**With a specific reference clip** — paste the path and say what the video is about:

```
make a video like C:\path\to\reference.mp4 about https://your-site.com/docs/the-feature/
```

**Without a clip** — the skill ships a small library of references already read into motion
specs (each one anonymised: motion only, no names, no copy). It picks the one that fits your
need and goes on from there. The library is small and only one of its references shows real
product UI, so a real-UI ask with no clip lands on that one every time: bring a clip when you
can, and grow the library with the reference worker when you find a film worth copying:

```
make a video about https://your-site.com/docs/the-feature/
```

Add the target tool when you know it (`target hyperframes`, `claude-design`, `after-effects`,
`remotion` or `html`). Without it you get the generic brief.

## What happens

1. **Motion spec** — 4 fps contact sheets for composition, 24 fps strips around every cut for the
   transitions, a seam ledger with frame counts, a camera plan, text and UI motion, eases. The
   reference never travels with the material: the spec describes motion, never quotes the clip.
2. **Storyboard** — your topic laid over the reference's scenes: literal copy, one screen per scene,
   the screens and states to capture, camera anchors, press frames. This is the **one stop**: it
   shows three angles with their copy and waits for your pick. Nothing else asks.
3. **Snapshots** — every screen the storyboard needs, frozen as a self-contained HTML page (public
   page, your own site behind a login, or a SingleFile save you make), run through nine quality
   gates and a mount test, with every camera anchor and press target measured in pixels.
4. **Handoff** — `video-handoff.md`: the map of all of it, the presses with their selectors, the
   open questions with defaults, and a section per build tool saying what that tool cannot do as
   written and what to do instead.

Then, in a fresh session or in the tool: *"Build the video from `video-handoff.md`."*

Progress is one line per step, and `video-pipeline.json` keeps the state, so `continue the video`
and `where are we` always know what is done and what is next.

## Each part works on its own

The three workers inside this folder are complete skills. You do not need the pipeline to use one:

- **Analyze a clip only** — `analyze C:\path\to\clip.mp4` or `motion spec for this reference`
  → `reference-motion-spec/`
- **Storyboard a topic against a spec** — `storyboard <spec> for <topic>` → `video-storyboard/`
- **Freeze a page only** — `snapshot https://example.com/pricing as pricing` or
  `freeze my admin page behind login` → `html-snapshot/`

Each worker's own `SKILL.md` and `OVERVIEW.md` explain it; their scripts run by path from this
folder.

## Install and requirements

Copy this folder whole into `.claude/skills/` (project or user level) and keep its name. Run
`npm install` once inside `html-snapshot/` for Playwright. Node 18 or newer; `ffmpeg` on PATH for
the reference read. Nothing leaves the machine; credentials are environment variables, never
typed in the chat. Details in `references/install.md`.
