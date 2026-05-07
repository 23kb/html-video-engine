# Render Tool

`tools/render.js` exports a playable HTML video to MP4 from the in-repo player.

```bash
node tools/render.js <slug>
node tools/render.js <slug> --chapter <id>
node tools/render.js <slug> --fps 30
node tools/render.js <slug> --resolution 1920x1080
node tools/render.js <slug> --out videos/<slug>/render/custom.mp4
node tools/render.js <slug> --seek
```

## Default Mode

Default rendering is wall-clock visual capture. The tool starts `serve.js` when needed, opens Chromium through Playwright, clicks the start gate, waits for `sceneBooted`, captures frames at the requested FPS, and stops at `sceneDone` or `--timeout`.

The current implementation writes a silent H.264 MP4. Browser audio capture and narration/BGM muxing are intentionally documented as the next step because cross-platform system audio capture is fragile. The visual render path is useful immediately for review clips and editorial smoke output.

Default output:

```text
videos/<slug>/render/<slug>.mp4
```

Chapter output:

```text
videos/<slug>/render/<slug>-<chapter>.mp4
```

## Seek Mode

`--seek` is for editorial-mode videos that register paused timelines through `registerTimeline(tl, { id })`. It seeks each registered adapter at FPS cadence and captures a frame after each seek.

Tutorial-mode rendering is wall-clock screencast only. Seek-render is reserved for editorial-mode videos because snapshot swaps, typed text, narration waits, and imperative chapter effects are still chapter-boundary surfaces rather than arbitrary timeline positions. The tool refuses real tutorials with:

```text
seek mode is only valid for surface: 'editorial' videos or single-chapter editorial beats.
```

Known scope:

- `surface: 'editorial'` with registered timelines is the intended seek target.
- `surface: 'iframe'` tutorials should use default wall-clock mode.
- Typed text, audio-cued `waitAt`, narration, and snapshot swaps are not deterministic mid-chapter seek surfaces.
- Camera movement is pause-aware through the camera driver, but tutorial render seek still stays restricted to editorial registered timelines.

Seek output defaults to:

```text
videos/<slug>/render/<slug>-seek.mp4
```

## Requirements

- Playwright Chromium, already used by the smoke tool.
- `ffmpeg` and `ffprobe` available on `PATH`.

## Examples

```bash
node tools/render.js _phase-c-editorial-pilot --fps 30 --timeout 60
node tools/render.js _phase-c-editorial-pilot --seek --fps 30
node tools/render.js a-complete-guide-to-the-checkboxes-field --seek
```
