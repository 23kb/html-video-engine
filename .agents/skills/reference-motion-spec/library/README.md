# Motion library

4 reference analyses produced by reference-motion-spec, packaged for sharing: neutral ids, brand names redacted, source videos not included, only the cited 24 fps strips kept (scaled JPEG). Internal reference only.

How to use:

- `node scripts/library.mjs library --query "fixed lens, word pop, typing"` — pick a reference by need; `catalog.json` carries each entry's `use_when`.
- `examples-by-kind.md` — every seam kind, text mechanism and UI motion with the clip, time and strip that shows it. Open the strip; that is the example.
- Each entry: `motion-spec.md` (read this), `motion-spec.json` + `cuts.json` (machine-readable), `brief-*.md` (per tool), `windows/` (the cited strips).
