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

Five one-shots (eight when ratified; the three ticks were rejected 2026-09-17 and deleted 2026-09-18), approved by Umair **by ear, in context, on real cuts**. They
live at **`tools/sfx/palette/`** with `manifest.json` (per-sound class, measured
onset, duration, source peak, and the cue each earned its place on) and a
README. Provenance — the original generations and their prompts — stays at
`tools/sfx/palette-candidates-2026-09-03/` (local-only since 2026-09-24: prompts, one-shots and `generate-palette.mjs` are not in git).

| Class | Sounds | Job |
|---|---|---|
| `impact` | `impact-a`, `impact-b`, `impact-c` | hard cuts, and one settle (a counter landing) |
| `boom` | `boom-a`, `boom-b` | the film's open (`boom-a`) and its close (`boom-b`), plus big landings |

Two things carry forward from the ratification and are detailed in the README:
the palette sat on a measured mix ladder (impacts and booms ≈ −10 dB; the tick
tier is gone — reproduce the ladder, never the gain numbers, per rfv 29), and
`impact-b` / `impact-c` are under the −25 dB flag and ride large compensating
gains. Compensate a late onset at placement; never re-trim.

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

**REJECTED CLASS 2026-09-17 (by ear, on a dashboard ad): `tick` — NEVER use tick sounds** — `tick-a`, `tick-b`,
`tick-c`. Umair: *"remove the ticks from sfx. NEVER EVER add those again."* The rejection is the CLASS and it
applies to every film, exactly like shimmer and riser above. On 2026-09-18 Umair had the three mp3s deleted from the
repo and from disk; the manifest keeps their old measurements as the record, `generate-palette.mjs` refuses the
names, `gen-candidates.mjs` refuses the class, and nothing places, generates or downloads a tick again. **The tick tier of the mix ladder
no longer exists**: what is left is one accent tier (impacts and booms). The moments ticks used to cover — a row
completing, a chip swapping, a panel arriving — get a designed MATERIAL cue (a real object doing a real thing:
paper, wood, a mechanism) or they get nothing and the bed carries them.

Two rulings came with it, both standing:

- **A slow bed only works with good SFX.** Umair, same pass. If the SFX are thin, the bed cannot be slow; either
  the cues carry the film or the tempo does. Do not ship a calm bed under sparse sound.
- **"Volume down" is a LEVEL instruction, never a tempo one.** Asked for a quiet bed, this session wrote
  "calm / patient / spacious / 104 bpm" into the generation prompt and delivered elevator music. Mix gain and
  arrangement energy are separate dials — turn the gain down and leave the tempo and drive alone.

## ONE BED PER FILM (ruled 2026-09-17, on a dashboard ad)

Umair, on a film whose bed was two separately generated pieces: *"I don't need two background, only one background.
The first BGM you use is good one."*

**A film gets ONE piece of music.** Not two generations stitched together, however well they are level-matched — a
second take is a different arrangement and the return reads as a track change, not as the music coming back.

This does NOT ban a mid-film drop. Cut the hole out of the ONE take: generate a single piece long enough for the whole
film, then split it with ffmpeg at the film's own cut times and place the segments at those times. The music that
returns is the same performance carrying on where it would have been, so the drop reads as an arrangement drop. On this
film a single 40s take became `music-1.mp3` (0 → 12.40) and `music-2.mp3` (the take's own 13.90 → 30.60), with the
1.5s gap landing on the frame the pile floods the screen.

**Generation length:** over-request and trim. The model puts an outro fade in roughly the final tenth to fifth whatever
the prompt says — a 13s request returned ~8s of music, a 20s request held 16s, a 40s request held 36s.

> Correction, same session: an earlier version of this section read "NEVER TWO SFX" and removed two accents. That was a
> misread of *"never use 2 sfx"*, which Umair immediately corrected — he meant two BGMs. **There is no rule against two
> SFX.** Accents may sit 1.66s apart; that film ships seven cues, two of them within two seconds of each other, and he
> approved them. Do not re-derive a spacing rule from this.

## Measured sound bar (2026-09-03) — U4/U5 RULED

Measured from Umair's Track 3 reference drop. Rulings
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

## Reference-copy recipe (2026-09-18)

Umair, 2026-09-18: our SFX sound **cheap** and sit **louder than the rest of the
video**. Density and timing are fine. The fix: measure a reference ad he likes
and copy two things from it, the **character** of each cue and its **level
against the music**. Never its files. The reference audio belongs to another
brand; everything it produces stays under `tools/sfx/refs/<id>/`
(gitignored) and is for measurement only.

**Setup, once:** `python -m venv tools/sfx/.venv`, then
`tools/sfx/.venv/Scripts/python -m pip install demucs soundfile librosa`.
The first split downloads the `htdemucs` model (~80 MB). The DSP lives in
`tools/sfx/py/sfxref.py`; the `.mjs` wrappers find the venv through
`lib-py.mjs` (override with `SFX_PYTHON`).

**The steps, in order:**

1. `node tools/sfx/split-reference.mjs --ref tools/sfx/refs/<id> --from <clip.mp4>`
   — stems (vocals / drums / bass / other) plus `novocals.wav` and `bed.wav`
   (bass + other), with LUFS per stem in `stems.json`.
2. `node tools/sfx/reference-cues.mjs --ref <dir>` — finds the hits, guesses a
   class, measures each one, writes `reference-cues.json` plus per-cue
   `mix` / `iso` / `bed` WAVs and a frame. Heuristic: demucs splits music
   stems, not SFX from music. A hit scores as likely SFX from how far it rises
   over its stem, whether it sits on a visual cut, and whether it is off the
   beat grid.
3. `node tools/sfx/gen-candidates.mjs --ref <dir> [--dry-run]` — ElevenLabs
   candidates whose prompts are written from the measurement (length, attack,
   brightness, low end, tonality): three voices per class (plain, a real
   material doing a real thing, clean UI). Cached in
   `tools/sfx/candidates/<id>/` with a prompt sidecar. Prints the credit use.
4. `node tools/sfx/match-cues.mjs --ref <dir>` — ranks every candidate against
   every cue by feature distance. Fit: < 0.8 good, 0.8–1.3 fair, ≥ 1.3 poor.
   `--self-test` must show each cue ranking its own clip #1 (32/33 on the
   first reference).
5. `node tools/sfx/audition.mjs --ref <dir>` → `http://localhost:4546/` —
   Umair confirms each cue by ear (SFX / not SFX, class), plays the top three
   candidates alone, over the reference's own bed at the reference cue's
   level, and A/B against the reference. Decisions land in
   `audition-decisions.json`; steps 3–4 and `normalize.mjs` honour them.
6. Place the approved sounds in a film's `sfx/plan.json`, then
   `node tools/sfx/normalize.mjs --video <slug> --from-reference <dir>/reference-cues.json`
   — sets each cue's gain so the energy it **adds over the film's own
   backdrop** matches the reference median for its class. Report first;
   `--write` to apply. Changes over 10 dB and cues on a silent backdrop are
   left for the ear. Then `onset.mjs`, `mux.mjs`, integrated LUFS.

**Rules that still bind.** Rejected classes (tick, shimmer, riser/whoosh) are
flagged in the cue map and refused by the generator and the matcher; a lone
short bright `click` is treated as tick-like until Umair rules on it. An
audition approval is a **shortlist**: a sound joins `tools/sfx/palette/` only
after Umair hears it placed on a real cut in a real film. `candidates/` and
`explore/` are gitignored (ElevenLabs terms: no redistributing generated
sounds as files).

**ElevenLabs library sounds (Explore tab).** The API only generates; there is
no endpoint to browse or download the library. To use a library sound,
download it by hand from the Sound Effects page into
`tools/sfx/explore/<class>/<name>.mp3` and save its prompt in `<name>.json`
next to it (`{"class": "pop", "prompt": "…"}`). `match-cues.mjs` ranks the
folder with everything else. On a paid plan the sounds are royalty-free for
commercial use with no credit line; sounds other users shared are licensed
through ElevenLabs unless the creator opted out (low risk, not zero).

### Measured: first reference vs our latest ad (2026-09-18)

Reference `ref-2026-09-18-a` (a 40.3 s third-party ad): **no voice**
(vocals stem −70 LUFS), program −23.8 LUFS / LRA 11.9 / TP −4.5 dBTP, bed
(bass + other) −30.6 LUFS, ~100 bpm. 42 hits, 33 likely SFX, 12 of them
within 150 ms of a visual cut. Ours: our latest 30 s ad's plan as
it stood that night (program −22.2 LUFS).

| Class | Reference: adds over bed (median, range) | Reference: cue vs program | Ours: adds over bed | Ours: cue vs program |
|---|---|---|---|---|
| boom | +4.7 dB (−10.2..+23.2, n=16) | −5.5 dB | boom-a +11.1 · boom-b +4.4 | +0.1 · +3.4 |
| impact / hit | −1.4 dB (n=6) | −16.4 (hit) · −11.4 (impact) | impact-b +5.7 / +4.4 · impact-c −3.2 | +1.3 · −4.7 |
| pop | −1.0 dB (−11.9..+1.3, n=5) | −11.7 dB | — | — |

**What it says.** The reference tucks its SFX **into** the music: a typical
hit adds about as much energy as the bed already has, and its pops and hits
sit 11–16 dB under program loudness. Ours sit on top: our opening boom adds
~6 dB more than the reference's, and our impacts run ~6–7 dB hotter over
the bed and 12–17 dB hotter against program. Two things feed the gap: the
palette impacts ride +18..+19 dB of gain on weak sources (their noise floor
rises with them), and every hot cue pushes the mix into `mux.mjs`'s −1 dBFS
limiter. Numbers only: no default changes until Umair has heard the
reference-levelled version.

### Audition outcome, first reference (2026-09-18)

Umair's ear pass on `ref-2026-09-18-a`: 5 of the 42 detected hits are real
SFX (the rest are music), and **8 sounds are shortlisted** for the next film:

| Sound | Where it came from | Approved against |
|---|---|---|
| `chime-a`, `pop-c` | generated from the measurement | the 14.46s hit |
| `hit-b`, `pop-a`, `boom-b` | generated from the measurement | the 26.54s impact |
| `boom-a` | generated from the measurement | the 28.07s and 28.94s booms |
| `impact-a`, `impact-c` | the existing palette | the 28.07s boom |

A shortlist is not the palette: each sound still has to earn its place on a
real cut in a real film before it joins `tools/sfx/palette/`. The next film
built is the one that tries them (Umair 2026-09-18: no existing film gets a
retro-fitted SFX pass).

Worth knowing for the next pass: the ranking is advisory. The 14.46s cue
measured a **poor** fit against every candidate, and Umair approved two of
them anyway. Rank to shortlist, then decide by ear.
