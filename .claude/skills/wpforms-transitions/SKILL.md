---
name: wpforms-transitions
description: Use when choosing, validating, or debugging WPForms video break styles, swap styles, flipBridge, camera poses, preview, or render handoffs.
---

## When To Use This Skill

Use this for transition decisions: chapter breaks, snapshot swaps,
`flipBridge`, surface-mode handoffs, camera poses, registered timeline timing,
preview scrubber behavior, and render workflow.

This skill links to the canonical docs; do not copy transition internals here.

## Canonical Docs

- `docs/transitions.md` — surface modes, break styles, swap styles,
  `flipBridge`.
- `docs/camera-poses.md` — named camera-pose vocabulary.
- `docs/shared-scene.md` — keeping editorial/Three.js state alive across
  chapter boundaries.
- `docs/frame-driver.md` — registered timeline ownership.
- `docs/pause-manager.md` — pause/resume and chapter seek limits.
- `docs/render.md` and `docs/preview.md` — MP4 export, live reload, and
  scrubber workflow.

## Working Notes

- Prefer `flipBridge` for cross-snapshot continuity when the storyboard needs a
  clean handoff without cream-bleed or Mac chrome remount.
- Use break styles for camera movement within the same snapshot; use swap
  styles for snapshot changes.
- Treat URL transition overrides as QC knobs, not authoring contracts.
- Named camera poses improve repeatability, but the chapter still needs a real
  product target or editorial intent.
- Registered timelines must be paused and built before registration.

## See Also

- `docs/transitions.md`
- `docs/camera-poses.md`
- `docs/shared-scene.md`
- `docs/frame-driver.md`
- `docs/pause-manager.md`
- `docs/render.md`
- `docs/preview.md`
