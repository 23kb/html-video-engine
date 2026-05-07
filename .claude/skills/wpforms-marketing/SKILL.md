---
name: wpforms-marketing
description: Use when building editorial, ad-style, launch, release, or mixed-surface WPForms videos.
---

## When To Use This Skill

Use this for ad-style release videos, announcement videos, marketing-mode
chapters, full-bleed editorial surfaces, atmospheric layers, and mixed
product/editorial compositions.

The canonical docs below remain the source of truth; this skill keeps the
entry point small.

## Canonical Docs

- `docs/transitions.md` — `surface: "editorial"` and `surface: "mixed"`.
- `docs/authoring-api.md` — manifest surface field and editorial chapter
  behavior.
- `docs/blocks.md` — parent-document editorial blocks.
- `docs/text-kit.md` — 24 Pixel-Point-style text reveal presets.
- `docs/frame-driver.md` — registered timelines for scrubbable editorial
  beats.
- `docs/render.md` and `docs/preview.md` — render and live-preview workflow.

## Composition Rules

- Use `surface: "editorial"` for pure 1920x1080 ad-style pieces.
- Use `surface: "mixed"` when product DOM still needs to be present behind
  editorial layers.
- Compose atmospheric, blocks, text-kit, Lottie, and Three.js helpers into a
  single deliberate timeline when motion density matters.
- Hide tutorial-specific chrome intentionally in editorial mode; do not let
  mesh/frame/watermark leak into full-bleed ad surfaces.
- Keep render-parity constraints in mind: registered timelines, `pausableRaf`,
  and deterministic logic.

## See Also

- `docs/transitions.md`
- `docs/blocks.md`
- `docs/text-kit.md`
- `docs/frame-driver.md`
- `docs/render.md`
- `docs/preview.md`
