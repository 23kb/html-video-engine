# Ad SFX palette — RATIFIED 2026-09-03

The one-shots Umair approved **by ear, in context, on real cuts**. This is the
standing palette for ad-style films. Machine-readable copy: `manifest.json`.

> **NEVER use tick sounds.** The tick class was rejected on 2026-09-17 for every
> film (Umair: "NEVER EVER add those again"), and the three tick mp3s were deleted
> from the repo and from disk on 2026-09-18. Do not place, generate, download or
> re-create a tick, a click run or a typing tick. The moments ticks covered get a
> designed material cue or nothing — the bed carries them.

> **The mp3s are local-only.** ElevenLabs terms do not allow sharing generated
> sounds as standalone files, so since 2026-09-18 the audio in this folder and in
> `palette-candidates-2026-09-03/` is gitignored. A fresh clone has the manifest
> and the prompts, not the sounds.

- **Ratified by** — Umair, 2026-09-03, listening to them placed on real cuts in
  the ad proving reel. Not judged as bare snippets.
- **Provenance** — `tools/sfx/palette-candidates-2026-09-03/` (local-only, not in git since 2026-09-24) keeps the original
  ElevenLabs one-shots and `generate-palette.mjs` (the prompts that made them).
  That folder stays intact as the record; **this** folder is the working home.

## The five

| Sound | Class | Onset | Duration | Source peak | Use when |
|---|---|---|---|---|---|
| `impact-a` | impact | 0.0ms clean | 1.00s | −23.1 dB | Hard cut — the throw/whip that lands a new scene |
| `impact-b` | impact | 0.0ms clean | 1.00s | −30.1 dB | Second hard cut, drier. ⚠ under the −25 dB flag |
| `impact-c` | impact | 0.0ms clean | 1.00s | −29.1 dB | A settle, not a cut — a counter landing. ⚠ under the −25 dB flag |
| `boom-a` | boom | 0.0ms clean | 1.00s | −18.1 dB | **Film open**, and pulse/overshoot weight with no cut under it |
| `boom-b` | boom | 0.0ms clean | 1.48s | −1.4 dB | **Film close**, and big landings. Longest tail — don't stack inside its decay |

Onsets measured `node tools/sfx/onset.mjs tools/sfx/palette`; peaks by
`ffmpeg -af volumedetect` (rulebook rfe 37); durations by `ffprobe`.

## The mix ladder — reproduce this, not the gain numbers

The reel's ratified gains put the palette on two tiers about 6 dB apart. The
tick tier (≈ −16 dB) no longer exists: ticks are a rejected class (2026-09-17).
What is left is one tier:

- **Impacts and booms are accents** — all five land at ≈ **−10 dB**.

Measured against a reference ad on 2026-09-18, even that tier sits too hot: our
impacts add ~6–7 dB more over the bed than the reference's hits do. See
`tools/sfx/CONTEXT.md` § Reference-copy recipe and `normalize.mjs --from-reference`.

Copy the ladder. Do **not** copy `reelGainDb`: prompts port between films, gains
never do (rulebook rfv 29). Run `normalize.mjs` and set gains from that film's
own measured source peaks.

## Caveats you inherit

1. **Never re-trim a sound to chase its onset.** The deleted `tick-c` sat at the
   mp3 priming floor (30ms of head silence that re-encodes do not remove; rulebook
   rfw 24 / rfe 26). The reel shipped a `-ss 0.029` re-trim whose onset read a
   tidy 21ms while its peak collapsed −0.3 → −15.1 dB, because the trim cut past
   the transient. Compensate at **placement** instead — cue the sound early.
2. **`impact-b` and `impact-c` are under the −25 dB near-silence flag** (rulebook
   rfv 28) and ride +20/+19 dB compensating gains, which raises their noise floor
   with them. They passed the ear test at reel level; they are not certified
   clean. Re-roll both when a generation budget exists.
3. **`impact-a` is a regen.** Its failed near-silent first roll is kept in the
   candidates folder as `impact-a-v1-near-silent.mp3`. Don't reach for that file.

## Rejected classes — do not regenerate

**tick** (`tick-a`, `tick-b`, `tick-c`) was rejected by ear on 2026-09-17, for
every film, and its files were deleted on 2026-09-18. **shimmer** (`shimmer-a`,
`shimmer-b`) and **riser / whoosh** (`riser-a`, `riser-b`) were rejected by ear on
2026-09-03, in the same pass that ratified the palette. All six of their clips were unmapped from the reel. The mp3s stay in
the candidates folder as rejected candidates — never place them, never re-roll
the class. This matches the standing 2026-06-10 ad-sound ruling: confident and
punchy-clean, no cinematic whoosh or sparkle cheese.

The moments they used to cover — the sheen beats, and one invisible
cursor-continuity cut — now get **nothing**. The bed carries them. That is the
ruling, not an omission.

## Adding to the palette

A new sound joins only after Umair hears it **placed on a real cut**, in a real
film, against a real bed. Never as a bare snippet in a folder — that is how the
four rejected ones got as far as they did. Add the row to `manifest.json` with a
measured onset, peak, duration, and the cue it earned its place on.
