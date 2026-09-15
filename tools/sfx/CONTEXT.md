# SFX / Soundlab Timeline

The video sound-design subsystem: the model behind `plan.json`, the soundlab
multitrack editor, and the mux renderer that bakes audio onto a rendered MP4.

## Language

**Plan**:
The full sound design for one video (`plan.json`) — the source library, the
tracks, and the render targets (`mp4` in, `out` out).
_Avoid_: config, manifest

**Sound**:
A reusable, AI-generated SFX definition in the library (`plan.sounds`) — a
prompt plus a generation length. Generated once, placed many times.
_Avoid_: sample, asset

**Track**:
A named lane (`plan.tracks[]`) of one kind — `sfx`, `music`, `vo`, or
`ambience` — carrying track-level gain, mute, and solo.
_Avoid_: lane, channel, layer

**Clip**:
A placement of audio on a Track at time `t`. Two distinct types (see ADR-0001):
a **Sound clip** and a **Media clip**.
_Avoid_: event, cue, item

**Sound clip**:
A Clip (`type:"sound"`) that fires a library Sound. Its `trim` is a hard cut
with a short automatic fade-out tail.
_Avoid_: event

**Media clip**:
A Clip (`type:"media"`) that plays an imported file (voiceover, music, or
ambience). Carries its own explicit fade-in/fade-out; not in the Sound library.
_Avoid_: track, bed

**Music bed**:
The background-music Media clip(s) on a Music track. The top-level `plan.music`
holds only its generation spec (prompt, length, file) — not its mix.
_Avoid_: BGM, soundtrack

**Mux**:
The ffmpeg step (`mux.mjs`) that flattens tracks → clips into one audio mix and
copies it onto the rendered MP4.
_Avoid_: render, encode

> Note: `events.json` (from `extract-events.mjs`) is an upstream GSAP-tween dump
> — those "events" are timeline tweens, not Clips. Clip is the only word for a
> placement on a Track.

## In-page audio never reaches the MP4 (ruled 2026-08-28, AP-18)

`tools/render-singlehtml-audio.js` records VIDEO only and muxes narration from
the `__sched` cue times. The browser's own audio — in-page `SFX_CUES` /
`sfxCue()` previews, a `BGM_PREVIEW` bed — is the review experience, never the
deliverable. The ship path for sound design is the Plan (`sfx/plan.json`) +
`mux.mjs`: `sfxCue()` records `{ name, t }` on `window.__sfx` so the plan
lifts real cue times; when the plan carries the bed, render with `--bgm none`
into an intermediate and let the mux lay the music. Two corollaries:

- The muxer pads audio to `ceil(dur + 0.25)` s — a "frozen tail" flagged inside
  that pad is the pad; the real check is "no frozen tail under LIVE audio"
  (`docs/render.md`).
- `mark()` pushes must land in `__sched` in time order — insert sorted, never
  append late, or the cue-order check fails (cad 4).

## Cue placement rules (round-2 T2, adopted 2026-08-08)

Measured practice from the HyperFrames public build (`docs/video-system-improvements-round2-2026-08-08.md`):

1. **Onset is the selection criterion for click/type SFX — measure it, never assume.**
   `node tools/sfx/onset.mjs <file|dir>` reports the first sample above 5% of the file's
   own peak. Head silence fires the cue late by exactly that much: a 158ms onset is ~5
   frames late at 30fps. `silencedetect` is useless here (2s minimum window). Trim with
   the suggested `-ss` before placing, or pick a cleaner file.
2. **Click cues land on the PRESS frame, not the release.** Lift cue times from the
   cursor press tweens (`Cursor.click()`'s press-scale moment) in `events.json`, not by
   eye — the sound belongs to the press.
3. **Typing above ~15 cps is a continuous bed, never per-key ticks.** Fast editorial
   typing (30+ cps) with discrete ticks reads as a machine gun. One trimmed, faded,
   loudness-normalized bed across the typing window.
4. **Verify beds by energy window, never by onset detector.** A continuous bed has no
   sharp transient — an onset detector locks onto the nearest click's decay tail and
   reports a false offset. Check RMS inside vs outside the placement window.
5. **SFX-over-silence levels are provisional.** When a music bed lands, every SFX gain
   set against silence needs rebalancing — and the beat grid itself may re-time against
   the bed, which re-opens every seam (plan for it, don't discover it).

## RATIFIED PALETTE (2026-09-03) — the standing ad SFX set

Eight one-shots, approved by Umair **by ear, in context, on real cuts**. They
live at **`tools/sfx/palette/`** with `manifest.json` (per-sound class, measured
onset, duration, source peak, and the cue each earned its place on) and a
README. Provenance — the original generations and their prompts — stays at
`tools/sfx/palette-candidates-2026-09-03/`.

| Class | Sounds | Job |
|---|---|---|
| `tick` | `tick-a`, `tick-b`, `tick-c` | grid currency — a row completing, a chip swapping, a cursor press frame. Rotate all three so a run reads as three objects, not one sample |
| `impact` | `impact-a`, `impact-b`, `impact-c` | hard cuts, and one settle (a counter landing) |
| `boom` | `boom-a`, `boom-b` | the film's open (`boom-a`) and its close (`boom-b`), plus big landings |

**Proof of placement:** `videos/reel-ad-vocabulary/sfx/plan.json` — 17 cues over
20s. That is the cue map these earned their place on; read it before placing.

Two things carry forward from the ratification and are detailed in the README:
the palette sits on a measured **two-tier mix ladder** (ticks ≈ −16 dB, impacts
and booms ≈ −10 dB — reproduce the ladder, never the gain numbers, per rfv 29),
and three sounds carry caveats (`tick-c` sits at the mp3 priming floor and is
compensated at placement, never re-trimmed; `impact-b` / `impact-c` are under
the −25 dB flag and ride large compensating gains).

**REJECTED CLASSES (2026-09-03, by ear): `shimmer` and `riser`/whoosh** —
`shimmer-a`, `shimmer-b`, `riser-a`, `riser-b`. Umair rejected the whole classes,
not the individual rolls, in the same pass that ratified the eight; all six of
their clips were unmapped from the reel. Consistent with the standing 2026-06-10
ad-sound ruling (punchy-clean; no cinematic whoosh or sparkle cheese). The mp3s
stay in the candidates folder as rejected candidates. **Never place them and
never regenerate the class** — `generate-palette.mjs` refuses those four names.
The moments they covered now get nothing; the bed carries them, by ruling.

New sounds join the palette only after Umair hears them **placed on a real cut**
in a real film against a real bed — never as bare snippets in a folder.

## Measured sound bar (2026-09-03) — U4/U5 RULED

Measured from Umair's Track 3 reference drop (full tables + method:
`reference/New folder/_extraction/_analysis/analysis-sound.md`). Rulings
2026-09-03: **U4 — the AD path adopts this profile** (music-forward, bed at
program level, arrangement drops instead of sidechain ducking, shaped arcs,
fade-to-true-silence or hard-out endings); **U5 — tutorial/postIntro bed
defaults STAY 0.17/0.12.** The SFX-palette extraction + ElevenLabs candidate
round this queued ("we need similar sfx" — Umair judges by ear) is **DONE**:
8 of 12 candidates ratified, 4 rejected. See the RATIFIED PALETTE section above.

**Group table:**

| Register | Program | LRA | Bed vs voice | Ducking | Transients | Arc | Endings |
|---|---|---|---|---|---|---|---|
| Ad refs | −12.2 LUFS mean (−7.1..−15.4) | 5.1 mean | bed AT program level (music-only sections −0.9..+0.7 dB vs adjacent VO mix) | **zero compressor ducking** — the arrangement drops instead (one ref sits 8.7 dB down under VO, swells after) | 30–116/min, beat-locked on 0.35–0.5s grids | shaped 10 dB builds, 8–10 dB mid dips, 10–13 dB outro drops | 0.6–1.7s fade to true silence or hard-out; **no mid-program silent holds** |
| postIntro windows | −19.2 mean | flat (1.3–2.5) | bed-in-gaps 5.2–6.9 dB under the VO mix | — | — | flat | — |
| Tutorial ref | flat | — | gaps −27.7 dBFS (matches our 0.17 band almost exactly) | — | 7.1/min | flat | — |

**Measured deltas vs `render-singlehtml-audio.js` constants (condensed from analysis-sound.md §4):**

1. **Program loudness** — ad bar is 4–9 LU hotter than our speech-led −16.1 dB speech / −27.6 dB bed mix.
2. **Bed vs voice** — ad bar runs the bed 8–11 dB hotter relative to voice than our default (bed-only ≈ program level vs our 11.5 dB under speech).
3. **Duck mechanism** — no ad ref uses a compressor duck; we run sidechaincompress ratio 8 / attack 15ms / release 350ms on an already-low bed. The bar's room comes from arrangement drops.
4. **Cue density** — ad bar measures 30–116 onsets/min (mean ~82) on regular beat grids; our rule is qualitative sparseness with no number. Tutorial ref: 7.1/min.
5. **Loudness arc** — ad refs are shaped (builds/dips/outro drops, LRA mean 5.1); our graph has no level automation at all (one static bed volume + duck + limiter). postIntro windows are flat — matching our shape.
6. **Endings** — 3 of 7 ad refs measure a 0.6–1.7s fade to TRUE silence; one hard-outs at full level; none hold silence mid-program.
7. **postIntro bed level** — refs' bed-in-gaps (−22.9..−24.5 momentary) sits 3–5 dB hotter than our 0.17 default (−27.6) and 5–8 dB hotter than our long-form 0.12 (−29..−31). The tutorial ref matches our 0.17 band; one postIntro source runs its tutorial body with NO bed.
8. **True peak** — ad refs master to +0.1..+2.6 dBTP (6 of 7 over 0); our limiter caps at 0.95 (≈ −0.4 dBFS). The liked intro sting is the quiet outlier (−19 I / −8.2 dBTP).
