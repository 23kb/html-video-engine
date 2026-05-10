# Docs INDEX

One-line-per-doc map. Use this to find the right doc fast instead of grepping.

For topic-scoped rules, **load a skill first** (`.claude/skills/wpforms-*/SKILL.md`). Skills aggregate the high-frequency rules; the docs below are the deeper canonical reference material the skills link to.

## Authoring contracts and skeletons

- `authoring-api.md` — Public authoring contract. Manifest schema, chapter exports, descriptor mode, transitions, ctx helpers, validator behavior.
- `current-workflow.md` — Thin pointer doc; the workflow loop lives in `wpforms-video` skill.
- `dom-prep.md` — Three-layer DOM staging model: universal baseline → per-snapshot profile → chapter-local delta.
- `video-production-templates.md` — Storyboard / chapter / snapshot checklist + token budget + smoke spec.
- `examples/legacy-manifest-skeleton.md` — Default manifest copy target.
- `examples/legacy-chapter-skeleton.md` — Default legacy/effect-mode chapter shape.
- `examples/legacy-postintro-effect-skeleton.md` — Video-local postIntro skeleton (HTML/CSS/SVG/GSAP).
- `examples/legacy-audio-cued-skeleton.md` — Timestamp-locked narration with `waitAt(t)`.
- `examples/choice-field-generate-choices-skeleton.md` — Choice-field AI Generate Choices flow.

## PostIntro

- `postintro-patterns.md` — PostIntro design rules + canonical references + multi-animation rule rationale. Owned by `wpforms-postintro` skill.

## Authoring craft (granular references)

- `cursor-choreography.md` — `park` / `glideTo` / `dragGrab` / via-waypoint patterns.
- `narration-writing.md` — voice, pacing, sentence shape, beat coupling.
- `beat-pacing.md` — 6-second rule, splitting heuristics.
- `camera-lensing.md` — `level` reading guide (1.0 / 1.18 / 2.2 / 2.4), pad, when to pick which.
- `stage-css.md` — z-stack of every layer, leak surfaces, when to hide what, surface modes.
- `color-palette.md` — WPForms brand orange + supporting accents, when to use which.
- `atmospheric-composition.md` — when grain / sweep / parallax / scale-push work, layering rules.
- `audio-mastering.md` — narration / BGM volume, ducking, SFX channels, `narrationSpeed`.
- `selector-hygiene.md` — `_selectors.js` pattern, when selectors break, validator coverage.
- `title-card-voice.md` — intro/outro shape, `subtitleVariants` array, CTA tone.

## GSAP / animation

- `gsap-rules.md` — L0 GSAP discipline canonical reference. Owned by `wpforms-gsap-rules` skill.
- `gsap-flip-patterns.md` — Flip patterns: morphs, reflows, real-UI clones.
- `effects-library.md` — `videos/_shared/effects.js` API: highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow.
- `frame-driver.md` — Paused-timeline driver contract. Read when registering timelines or migrating cinematics.
- `pause-manager.md` — Pause/seek + `pausableRaf` contract.

## Transitions / surface modes / camera

- `transitions.md` — Surface modes (`iframe` / `editorial` / `mixed`) + swap styles + `flipBridge`. Owned by `wpforms-transitions` skill.
- `camera-poses.md` — Named camera-pose vocabulary (`focus`, `station`, `overview`).
- `shared-scene.md` — Multi-chapter persistent Three.js / editorial scenes (used by `wpforms-rest-api-overview-polished`).

## Marketing / ad-style / editorial

- `blocks.md` — `videos/_shared/blocks/` API: code-card, mac-window, phone-frame, pill, arrow, route-line, terminal.
- `text-kit.md` — Pixel-Point-style text reveal presets.
- `lottie-kit.md` — Lottie integration (bumpers, stings, badges, marker-driven micros).

## Render / preview

- `render.md` — `tools/render.js` MP4 export. Wall-clock for tutorials, `--seek` only for `surface: editorial`.
- `preview.md` — `tools/preview.js` live-reload server + scrubber UI.

## Determinism / linting

- `deterministic-logic.md` — Render-parity rules: no `Date.now()`, no unseeded `Math.random()`, no `fetch()`.
- `deterministic-logic-findings.md` — Existing-video violations logged by the linter.

## Skills

- `skills.md` — Skill bundle index.

## System audits / postmortems / strategic context

- `editorial-direction-audit-2026-05-10.md` — **Master synthesis + 7-phase plan after 3 failed editorial attempts.** Read this first if working on editorial-track.
- `winning-pattern-analysis-2026-05-10.md` — What 3 winning videos share vs 3 failed editorial videos (Agent B).
- `wpforms-source-inventory-2026-05-10.md` — Real WPForms brand + motion + UI inventory from live plugin source.
- `engine-reading-notes-2026-05-10.md` — Engine primitive usage counts, what bypassing costs, when engine helps vs hurts.
- `storyboard-format-morph-chain-2026-05-10.md` — Editorial storyboard format addition: required morph-chain section. Authoring contract.
- `phase-2-skill-installs-report-2026-05-10.md` — Codex's Phase 2 outputs: 5 skills installed, custom `wpforms-motion-audit` skill built.
- `engine-runtime-optimization-audit-2026-05-11.md` — Phase 5c Track 1 review-only proposals: dead primitives, duplication, hot-path logging.
- `tools-optimization-audit-2026-05-11.md` — Phase 5c Track 2 review-only proposals: validator I/O, ffprobe caching, orphan scripts.
- `skill-doc-token-audit-2026-05-11.md` — Phase 5c Track 3 review-only proposals: skill bloat, doc redundancy, broken refs.
- `polish-vocabulary-2026-05-11.md` — Phase 5g (Codex): rest-api polished-vs-unpolished deltas; tutorial-polish primitive candidates.
- `repo-architecture-audit-hyperframes.md` — Strategic context (Phase 2 + Phase 4b execution slice).

## Field / UI inventories (canonical reference, not for full-read)

- `wpforms-field-state-inventory.md` — Canonical field-state inventory (132 KB). **Do not full-read.** Query via `node tools/field-state.js --field <name>`. Cross-referenced from: `wpforms-video`, `wpforms-postintro`, `wpforms-transitions` (after Phase 5a).
- `wpforms-ai-state-inventory.md` — WPForms AI UI state references.
- `snapshot-health-report.md` — Snapshot inventory health (hand-written; not regenerated by tooling).

## Per-video handoffs (read only when working on that video)

- `checkboxes-rescue-handoff.md` — Working notes for `a-complete-guide-to-the-checkboxes-field`.
- `wpforms-ai-guided-handoff.md` — Working notes for `build-forms-faster-with-wpforms-ai`.

## Followups / backlog

- `helper-rollout-backlog.md` — Candidate beats for `popOut` / `cursor.glideTo` / `lineDraw` rollout.

## Repo-root references

- `CLAUDE.md` — Operator manual for Claude Code. Always loaded by Claude Code sessions. Boot order + path-decision tree + protected core + validation + push-back triggers.
- `AGENTS.md` — Operator manual for Codex. Full copy of CLAUDE.md kept in sync. Both files are needed because Claude Code and Codex read different filenames. Use `tools/check-claude-agents-sync.js` (Phase 5a) to verify they match.
- `BACKLOG.md` — Living architectural-debt + future-phase candidate list.

## Brand canonical truth

- `reference/wpforms-brand/BRAND.md` — Canonical WPForms brand reference (colors, typography, Sullie, AI chat structure, real templates API). Use this; do not invent brand details.
- `reference/wpforms-brand/tokens.css` — Drop-in CSS variables for any video.
- `reference/wpforms-brand/assets/` — Real Sullie + loading-avatar + loading-spinner SVGs from plugin source, plus AI 3-dot chat spinner.
- `reference/html-templates/` — Canonical clone-and-customize HTML video templates (the 3 winners + their per-beat specs).
