---
name: wpforms-gsap-rules
description: Use before writing or reviewing GSAP, Flip, registered timeline, effects, or RAF-loop code in WPForms videos.
---

## When To Use This Skill

Use this whenever chapter effects, postIntros, cinematics, or shared kits use
GSAP, Flip, registered timelines, shared effects, or requestAnimationFrame.

This skill is an index. The linked docs are canonical and must stay in sync
with code.

## Canonical Docs

- `docs/gsap-rules.md` — L0 GSAP discipline.
- `docs/effects-library.md` — `videos/_shared/effects.js` effect APIs.
- `docs/gsap-flip-patterns.md` — Flip usage and sandboxes.
- `docs/frame-driver.md` — registered timeline frame-driver contract.
- `docs/pause-manager.md` — `pausableRaf` and pause/resume behavior.
- `docs/deterministic-logic.md` — deterministic render-parity lint rules.

## Hard Reminders

- Prefer one master `gsap.timeline()` per beat group.
- Use `autoAlpha` for show/hide work.
- Animate transforms, opacity, filters, and SVG attrs; avoid layout tweens.
- Registered timelines must be created with `gsap.timeline({ paused: true })`
  before `registerTimeline(tl, { id })`.
- Author-owned render loops must use `pausableRaf(cb)` from
  `videos/_shared/kit.js`.
- Avoid nondeterministic logic: no `Date.now()`, no unseeded `Math.random()`,
  and no runtime `fetch()`.

## See Also

- `docs/gsap-rules.md`
- `docs/effects-library.md`
- `docs/gsap-flip-patterns.md`
- `docs/frame-driver.md`
- `docs/pause-manager.md`
