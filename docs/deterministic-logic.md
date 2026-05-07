# Deterministic Logic

Render parity depends on repeatable timeline state. Any author-owned logic that
changes across runs can make `tools/render.js --seek` disagree with the
wall-clock preview, especially for editorial and registered-timeline work.

## Rule Set

- `Date.now()` is an error. Runtime/player timing owns wall-clock state.
- `fetch()` in runtime video surfaces is an error. Capture or vendor data before
  authoring so review and render do not depend on the network.
- `Math.random()` is a warning unless the same module defines a seeded RNG such
  as `mulberry32()` or a function with a `seed` argument.
- `setTimeout()` outside `runtime/`, `engine/`, `tools/`, `scenes/`, and
  `tests/` is a warning. Chapter authors should use ctx `sleep()`,
  `pausableSleep()`, or registered timelines so pause/resume remains honest.

## Command

```bash
node tools/lint-determinism.js --all
node tools/lint-determinism.js --video <slug>
```

Exit codes:

- `0` clean
- `1` errors
- `2` warnings only

Existing violations are reported in `docs/deterministic-logic-findings.md`.
The linter exposes violations; migration is per-video work, opportunistic.
