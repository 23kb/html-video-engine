---
name: wpforms-video
description: Use when authoring or reviewing WPForms tutorial videos from storyboard through playable HTML validation.
---

## When To Use This Skill

Use this for normal WPForms tutorial-video work: intake, snapshot inventory,
storyboarding, manifest/chapter authoring, narration, validation, and review
URL handoff.

This skill is a map to the canonical repo docs. Load only the linked sections
needed for the current task; do not duplicate or drift the source content here.

## Canonical Docs

- `docs/authoring-api.md` — public authoring contract, manifest/chapter shapes,
  descriptor vs legacy/effect mode, transitions, ctx helpers, validator.
- `docs/postintro-patterns.md` — required topic-specific postIntro guidance.
- `CLAUDE.md` — storyboarding gate, intake rules, production-truth rules,
  protected areas, validation commands.
- `docs/current-workflow.md` — startup workflow and video production sequence.
- `docs/video-production-templates.md` — storyboard/checklist templates; read
  only the section needed.

## Operating Rules

- Start with intake and snapshot inventory.
- Produce a storyboard proposal and stop for explicit approval before writing
  chapter code or narration MP3s.
- Default to legacy/effect-mode authoring for new videos.
- Use real captured WPForms UI as product truth; never fabricate snapshot
  folders or WPForms-looking HTML.
- Keep normal video work out of protected core.
- Validate with `tools/validate-video.js` and `tools/check-video-playback.js`.

## See Also

- `docs/authoring-api.md`
- `docs/postintro-patterns.md`
- `docs/current-workflow.md`
- `docs/video-production-templates.md`
- `docs/deterministic-logic.md`
