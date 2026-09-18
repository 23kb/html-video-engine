# Render — MP4 export for single-HTML films

Three tools. The engine-era `render.js` (wall-clock + `--seek`, silent output, `--chapter`) was retired 2026-08-22 with the runtime; every film is single-HTML now. Flags below were checked against each tool's own source on 2026-08-28.

**Vocabulary (rulebook §1):** *snapshot capture* (`capture/capture.js`) freezes a live page and runs FIRST; *MP4 render* (this doc) turns a finished HTML film into video and runs LAST. Never let the bare word "capture" stand alone. Render only after Umair's sign-off or an explicit ask (rulebook §9).

## `tools/render-singlehtml-audio.js` — the ship path (narration + ducked BGM)

```bash
node tools/render-singlehtml-audio.js <slug>
node tools/render-singlehtml-audio.js <slug> --bgm bgms/2.mp3 --bgm-volume 0.12   # long-form band
node tools/render-singlehtml-audio.js <slug> --bgm none                            # narration only
node tools/render-singlehtml-audio.js <slug> --out /tmp/test.mp4 --max-seconds 200
node tools/render-singlehtml-audio.js <slug> --resolution 3840x2160
node tools/render-singlehtml-audio.js <slug> --query skip=postintro                # deliverable variant
node tools/render-singlehtml-audio.js <slug> --print-mix
```

What it does: serves the repo, opens `videos/<slug>/index.html` in headless Chromium with native video recording, waits for the film's instrumentation (`window.__T0`, `__sched`, `__done`, `__dur` — the contract the skeletons bake in and `validate-singlehtml` checks), then muxes with ffmpeg: each narration clip (`videos/<slug>/narration/<key>.mp3`) delayed to its `__sched` cue, the BGM trimmed + lowered + side-chain-ducked under the voice, the whole mix limited against clipping. Missing clips are skipped with a warning.

Flags: `--bgm <path>|none` (default: `bgms/1.mp3` if present), `--bgm-volume` (default `0.17` — the ruled shorts / ad band; long-form passes `0.12` explicitly; measure every mix, never ship the tool default unmeasured — the derivation and the post-render RMS check live in the tool's header comment), `--out <path>`, `--max-seconds <n>` (wall-clock cap, default 200), `--resolution WxH`, `--query <str>` (extra URL query for deliverable variants — `?scene=` stays review-only and must not be used here), `--print-mix`. Exit: `0` ok · `1` failure · `2` not instrumented · `3` usage.

Resolution defaults to the film's own `.stage` box (`tools/stage-size.js`): a 9:16 short renders 1080×1920 with no flag; `--resolution` overrides. See `docs/vertical-shorts.md`.

**Muxer whole-second pad — audio truth (ruled 2026-08-28, AP-18):** the audio track is laid on `ceil(__dur + 0.25)` seconds, so the MP4 can outlast the film's last frame by up to ~1.25s. A "frozen tail" flagged inside that pad — by `dead-time.js`, or by a video ≥ audio check — IS the pad, not a defect. The real check is **"no frozen tail under LIVE audio"**, satisfied by an outro that keeps moving through the pad (rulebook §8; receipts senw 6, fan). Only narration cues in `__sched` reach the MP4: in-page `SFX_CUES` / `sfxCue()` previews and a `BGM_PREVIEW` bed never do — the ship path for sound design is `sfx/plan.json` + `tools/sfx/mux.mjs` (`tools/sfx/CONTEXT.md`).

**Frame-stepped render — `tools/render-frames.js` (2026-09-04):** for a film whose motion rides ONE master timeline (no wall-clock cursor glides, no RAF motion), `node tools/render-frames.js <slug>` seeks `__tl` per frame and pipes lossless PNG screenshots to libx264 (crf 15). Pixel-exact text, no lost head frames, and the frame clock IS the timeline clock, so `sfx/plan.json` cue times need no offset. The film must honour `?render=frames` (build, expose `__tl`, do not autoplay, set `window.__renderReady`). ~2 fps wall (about 7 min for 25 s). Video-only — lay sound with `tools/sfx/mux.mjs`. First used on a Claude ad after the screencast render came back "not HD".

**Load-in trim + screencast latency (measured 2026-09-04):** the renderer cuts the webm at `(__T0 − recStart) − 0.17s`. The 0.17s is the Playwright screencast's start latency — its first frame lands that long after `newPage()` — measured three times (HD and SD) with the burned-in clock page `videos/_qc-sync-marker/` (re-measure: render that slug with `--bgm none` and read the number at video t=0; ±0.05s run variance is normal). Before this, every film lost its first ~0.2–0.45s and every SFX/narration cue landed that much late. A heavy film can still lose frames right after `play()` (a Claude ad measured a further 0.12s under HD load): settle the compositor before setting `__T0` (two rAFs + ~250ms after the async build), and when placing SFX, measure the residual on THAT render with a scene-change probe on a known hard cut and shift the plan's clip times by it (the plan keeps `t0` = film time, `t` = video time).

After a render: re-run the QC gates (`dead-time.js`, `seam-gate.js`, `narration-qc.js`, one at a time — headless lock) — a re-render invalidates every dashboard chip.

## `tools/render-html.js` — silent visual render

```bash
node tools/render-html.js <slug> --duration <seconds> [--fps 30] [--out path] [--resolution WxH] [--headed]
node tools/render-html.js --path videos/<slug>/scenes/<file>.html --duration <seconds> [--out path]
```

Records the page wall-clock for `--duration` seconds and transcodes the webm to MP4 at the requested fps. It trims its own boot lead-in — never correct for it (rulebook §9). No audio: use it for editorial review clips and one-off scene renders; ship through the audio renderer above. Default `--resolution` 1920x1080; default output `videos/<slug>/render/<slug>.mp4`.

## `tools/stitch.js` — Kacie bookends around the HTML body

```bash
node tools/stitch.js videos/<slug>.video.json                  # render each piece, then concat (0.3s xfade)
node tools/stitch.js videos/<slug>.video.json --no-render      # concat existing MP4s only
node tools/stitch.js videos/<slug>.video.json --dry-run        # print the plan, do nothing
node tools/stitch.js videos/<slug>.video.json --xfade <s> | --no-xfade | --fps <n> | --resolution WxH
```

Delivery shape since 2026-07-23: **real-Kacie intro → HTML body → real-Kacie outro**, concatenated per the `.video.json` manifest (`pieces[]` of `{ kind, path, output?, renderer?, duration? }` + `output`; the manifest can override `xfade` / `fps` / `resolution`). `kind: "html"` pieces render through `tools/render-html.js` by default (`renderer` overrides — point it at `tools/render-singlehtml-audio.js` for the body); a finished MP4 (Kacie's trimmed, loudness-normalized recording) is a piece with an explicit `output` path run under `--no-render`. Recording spec: `docs/kacie-intro-outro-recording-spec.md`; flow: `dev-advocacy-video` step 5b. Tutorials author NO intro/outro cards — the HTML body opens on the postIntro.

## Requirements

- Playwright Chromium (already used by the smoke tool); `ffmpeg` + `ffprobe` on `PATH`.
- Stop `tools/preview.js` first and never edit repo files mid-render (rulebook §9). Renders run SOLO — a render + a probe at once produce invalid dead-time evidence.
- Then the QC surface: `http://localhost:4321/tools/qc-dashboard/#<slug>` (`docs/qc-dashboard.md`).
