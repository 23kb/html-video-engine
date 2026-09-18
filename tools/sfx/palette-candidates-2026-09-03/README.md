# SFX palette candidates — Track 3 round (2026-09-03)

> **OUTCOME (2026-09-03): this folder is now provenance, not the working home.**
> 8 candidates were ratified by ear and copied to **`tools/sfx/palette/`** —
> reach for those. `shimmer-a`, `shimmer-b`, `riser-a`, `riser-b` were REJECTED
> (the whole shimmer and riser/whoosh classes); their mp3s stay here as rejected
> candidates and `generate-palette.mjs` refuses those four names. Ruling and
> per-sound measurements: `tools/sfx/palette/README.md` + `manifest.json`.
>
> **TICK: rejected 2026-09-17 for every film, files deleted 2026-09-18. Never
> use tick sounds.** `generate-palette.mjs` refuses `tick-a/b/c` too. The mp3s
> in this folder are local-only (gitignored, ElevenLabs terms).

Standalone ElevenLabs one-shot candidates for Umair's listening pass (U4 rider:
"we need similar sfx").

- `generate-palette.mjs` — standalone generator (mirrors `../generate.mjs`'s
  request path; does not touch it). Cached: existing mp3s are never re-generated.
  Run with names to generate specific candidates:
  `node tools/sfx/palette-candidates-2026-09-03/generate-palette.mjs riser-a shimmer-a`
- Spend ledger 2026-09-03: 15/15 of the round's cap — 12 charged-but-lost to a
  path bug (fixed in-file), 3 landed (`tick-a`, `impact-a`, `boom-a`), all
  onset-clean (0.0–0.1ms head silence, no trims needed).
