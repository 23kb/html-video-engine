# Render — MP4 export for single-HTML films

**One renderer: `tools/render.js` (`npm run render`).** It renders every film type — tutorial, short, ad, mixed — frame-exact, in parallel, with sound. The older renderers stay in `tools/` only as a fallback (bottom of this page).

**Vocabulary (rulebook §1):** *snapshot capture* (`capture/capture.js`) freezes a live page and runs FIRST; *MP4 render* (this doc) turns a finished HTML film into video and runs LAST. Never let the bare word "capture" stand alone. Render only after Umair's sign-off or an explicit ask (rulebook §9).

## Draft and final (Umair, 2026-10-13)

Review renders are **drafts at 720p** — "to get a feel of the video". **4K only when Umair says "final"** for that render.

```bash
node tools/render.js <slug>                                  # draft, 720p (default)
node tools/render.js <slug> --bgm-volume 0.12                # long-form tutorial (bed band 0.12)
node tools/render.js <slug> --quality hd                     # 1080p, 2x supersampled (the old HD look)
node tools/render.js <slug> --quality final                  # 4K master — only on "final"
node tools/render.js <slug> --query skip=postintro           # deliverable variant (?scene= stays review-only)
node tools/render.js <slug> --seconds 10 --no-audio          # quick test of the first 10 s
```

| Quality | Output size | Capture | Encode | Output file |
|---|---|---|---|---|
| `draft` (default) | 720 on the short side (1280×720 / 720×1280) | device scale 0.667 | x264 veryfast crf 20 | `videos/<slug>/render/<slug>.mp4` |
| `hd` | stage size (1920×1080 / 1080×1920) | device scale 2, lanczos down | x264 slow crf 16 | `videos/<slug>/render/<slug>.mp4` |
| `final` | 2× stage (3840×2160 / 2160×3840) | device scale 2, native | NVENC cq 18 | `videos/<slug>/render/<slug>-4k.mp4` |

Stage size comes from the film's `.stage` box (`tools/stage-size.js`), so a 9:16 short renders portrait with no flag; `--resolution WxH` overrides. Colour is BT.709, tagged.

Measured on this machine (i7-12700K, RTX 2060, 8 workers, 2026-10-13):

| Film | Length | Draft | Old screencast render |
|---|---|---|---|
| tutorial | 194 s | 82–90 s | ~4–5 min |
| real-UI short | 40 s | 22–26 s | ~1 min |
| ad (blur-heavy) | 31 s | 40–45 s | 7–25 min (`render-frames.js`, serial) |
| 4K final | — | ≈ 1× real time | — |

## How it works

1. **Virtual time.** Chrome's `Emulation.setVirtualTimePolicy` owns the page clock, so `performance.now()`, timers, rAF and the snapshot iframes advance only when the renderer steps. `tools/lib/render-clock-shim.js` (injected into every frame) drives GSAP and every Web Animation (CSS transitions too) from that clock, and resolves `audio.play()` at once. Films render unchanged — async tutorial drivers and `__tl` ads alike. Load time costs zero film time, so a tutorial can come out a fraction of a second shorter than wall-clock playback.
2. **Length pass.** One browser runs the film with no capture (≈ 2 ms a frame) to `window.__done`; length = `ceil(__dur + 0.25)` s. It also notes which frames are still.
3. **Blocks.** The film is cut into 8 contiguous blocks, one browser each; joins sit on still moments where possible. Each browser steps from the start and captures only its block (CDP `Page.captureScreenshot`, JPEG q95, `clip.scale` = device scale). Frames where nothing changed reuse the previous capture.
4. **Joins.** The virtual clock leaks a fraction of a millisecond of real timing, so a browser can run a frame ahead or behind its neighbour. Each block renders 3 overlap frames; they are matched against the previous block, the block is trimmed to fit (forced keyframes + concat `inpoint`, no re-encode) and its narration cues move with it. The report line `joins: 7/7 seamless` confirms it; a rolling counter mid-count can read 37–39 dB and is harmless.
5. **Sound.** A film with `videos/<slug>/sfx/plan.json` is mixed by `tools/sfx/mux.mjs` (ads; plan times as authored). Otherwise narration clips from `window.__sched` (`videos/<slug>/narration/<key>.mp3`) at their cue times plus the bed (`--bgm`, default `bgms/1.mp3`; `--bgm-volume` default `0.17` for shorts, `0.12` long-form), side-chain-ducked under the voice and limited (`tools/lib/narration-mix.js`). In-page `SFX_CUES` / `sfxCue()` / `BGM_PREVIEW` never reach the MP4.
6. **Report + sidecar.** Frame count, colour tags, speed, joins; `<out>.render.json` keeps timings, block shifts and each block's `__sched` / `__cuts` / `__beats` / `__sfx`.

**Film contract** (the skeletons bake it in; `validate-singlehtml` checks it): `window.__T0` set when play starts, `__sched` for narration cues, `window.__done` + `window.__dur` at the end. No `__T0` → exit 2.

**Audio pad (AP-18):** the video is `ceil(__dur + 0.25)` s long and the renderer keeps capturing live frames through the pad, so the end hold is real frames, not a frozen tail.

Flags: `--quality draft|hd|final`, `--workers <n>` (default 8; more did not help on this machine), `--fps <n>` (30), `--bgm <path>|none`, `--bgm-volume <n>`, `--no-audio`, `--query <str>`, `--resolution WxH`, `--seconds <n>` (test renders: no length pass, no sound), `--out <path>`, `--no-skip` (capture every frame), `--verify-skip` (capture every frame and report frames the shim wrongly called still), `--no-lock`, `--force`. Exit: `0` ok · `1` failure · `2` not instrumented · `3` usage.

After a render: re-run the QC gates (`dead-time.js`, `seam-gate.js`, `narration-qc.js`, one at a time — headless lock). A re-render invalidates every dashboard chip.

## `tools/stitch.js` — presenter bookends around the HTML body

```bash
node tools/stitch.js videos/<slug>.video.json                  # render each piece, then concat (0.3s xfade)
node tools/stitch.js videos/<slug>.video.json --no-render      # concat existing MP4s only
node tools/stitch.js videos/<slug>.video.json --dry-run        # print the plan, do nothing
node tools/stitch.js videos/<slug>.video.json --xfade <s> | --no-xfade | --fps <n> | --resolution WxH
```

Delivery shape since 2026-07-23: **recorded presenter intro → HTML body → recorded presenter outro**, concatenated per the `.video.json` manifest (`pieces[]` of `{ kind, path, output?, renderer?, args?, duration? }` + `output`). `kind: "html"` pieces render through `tools/render.js --quality hd --bgm-volume 0.12` by default (`args` replaces those flags; `renderer` points at a fallback tool). A finished MP4 is a piece with an explicit `output` path run under `--no-render`. The presenter, recording spec and flow are the pack's (`products/<key>/PRODUCT.md`, `dev-advocacy-video` step 5b). Tutorials author NO intro/outro cards — the HTML body opens on the postIntro.

## Requirements

- Playwright Chromium; `ffmpeg` + `ffprobe` on `PATH`; a GPU (Windows uses ANGLE D3D11; without it Chromium falls back to software GL and captures run ~2× slower).
- The renderer runs its own no-store server and blocks the preview live-reload socket, so `tools/preview.js` can stay up. It takes the headless lock so it does not skew a real-time gate running beside it.
- Then the QC surface: `http://localhost:4321/tools/qc-dashboard/#<slug>` (`docs/qc-dashboard.md`).

## Fallback renderers (use only when `tools/render.js` fails on a film)

| Tool | What it does | When |
|---|---|---|
| `tools/render-singlehtml-audio.js` | real-time Playwright screencast + narration/bed mix | a film that misbehaves under virtual time; known defects: 25 fps screencast stretched to 30 (1 frame in 6 repeats), soft VP8 intermediate, a 0.17 s start-latency constant, 200 s cap |
| `tools/render-frames.js` | seeks `__tl` per frame, PNG → x264, video only (`?render=frames` contract) | a `__tl` ad that needs pure timeline seeking; serial, ~1–2 fps |
| `tools/render-singlehtml.js` | seeks `__tl`, JPEG → BT.709 x264, `sfx/plan.json` mux | as above |
| `tools/render-html.js` | silent real-time screencast for `--duration` s | quick silent clip of a page with no instrumentation |

Each prints a one-line fallback note when it starts.
