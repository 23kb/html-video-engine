# Ad SFX palette — RATIFIED 2026-09-03

The eight one-shots Umair approved **by ear, in context, on real cuts**. This is
the standing palette for ad-style films. Machine-readable copy: `manifest.json`.

- **Ratified by** — Umair, 2026-09-03, listening to them placed on real cuts in
  the ad proving reel. Not judged as bare snippets.
- **Provenance** — `tools/sfx/palette-candidates-2026-09-03/` keeps the original
  ElevenLabs one-shots and `generate-palette.mjs` (the prompts that made them).
  That folder stays intact as the record; **this** folder is the working home.

## The eight

| Sound | Class | Onset | Duration | Source peak | Use when |
|---|---|---|---|---|---|
| `tick-a` | tick | 0.1ms clean | 0.48s | −3.2 dB | Default tick. Row completes, soft/locked crossfade cut, cursor press frame |
| `tick-b` | tick | 0.0ms clean | 0.48s | −8.7 dB | Brighter tick. Starts a run — odometer roll, chip appears |
| `tick-c` | tick | **30.0ms LATE** | 0.48s | −0.3 dB | Warmest tick. Hot-swap, last row, tile pop. **Cue it 30ms early** (see below) |
| `impact-a` | impact | 0.0ms clean | 1.00s | −23.1 dB | Hard cut — the throw/whip that lands a new scene |
| `impact-b` | impact | 0.0ms clean | 1.00s | −30.1 dB | Second hard cut, drier. ⚠ under the −25 dB flag |
| `impact-c` | impact | 0.0ms clean | 1.00s | −29.1 dB | A settle, not a cut — a counter landing. ⚠ under the −25 dB flag |
| `boom-a` | boom | 0.0ms clean | 1.00s | −18.1 dB | **Film open**, and pulse/overshoot weight with no cut under it |
| `boom-b` | boom | 0.0ms clean | 1.48s | −1.4 dB | **Film close**, and big landings. Longest tail — don't stack inside its decay |

Onsets measured `node tools/sfx/onset.mjs tools/sfx/palette`; peaks by
`ffmpeg -af volumedetect` (rulebook rfe 37); durations by `ffprobe`.

## The mix ladder — reproduce this, not the gain numbers

The reel's ratified gains put the palette on two tiers about 6 dB apart:

- **Ticks are currency** — all three land at ≈ **−16 dB**. They rotate a/b/c so a
  run of ticks reads as three different objects, not one machine-gun sample.
  They differ by *timbre*, not by level.
- **Impacts and booms are accents** — all five land at ≈ **−10 dB**.

Copy the ladder. Do **not** copy `reelGainDb`: prompts port between films, gains
never do (rulebook rfv 29). Run `normalize.mjs` and set gains from that film's
own measured source peaks.

## Three caveats you inherit

1. **`tick-c` is at the mp3 priming floor.** 30ms of head silence, and re-encodes
   do not converge (rulebook rfw 24 / rfe 26). Compensate at **placement** — cue
   it 30ms early. Do **not** re-trim it: the reel shipped a `-ss 0.029` re-trim
   whose onset read a tidy 21ms while its peak collapsed −0.3 → −15.1 dB, because
   the trim cut past the transient. Onset is measured against the file's *own*
   peak, so destroying the transient flatters the number.
2. **`impact-b` and `impact-c` are under the −25 dB near-silence flag** (rulebook
   rfv 28) and ride +20/+19 dB compensating gains, which raises their noise floor
   with them. They passed the ear test at reel level; they are not certified
   clean. Re-roll both when a generation budget exists.
3. **`impact-a` is a regen.** Its failed near-silent first roll is kept in the
   candidates folder as `impact-a-v1-near-silent.mp3`. Don't reach for that file.

## Rejected classes — do not regenerate

**shimmer** (`shimmer-a`, `shimmer-b`) and **riser / whoosh** (`riser-a`,
`riser-b`) were rejected by ear on 2026-09-03, in the same pass that ratified the
eight above. All six of their clips were unmapped from the reel. The mp3s stay in
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
