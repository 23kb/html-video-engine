# Docs INDEX

One-line-per-doc map. Use this to find the right doc fast instead of grepping.

For topic-scoped rules, **load a skill first** (`.claude/skills/wpforms-*/SKILL.md`). Skills aggregate the high-frequency rules; the docs below are the deeper canonical reference material the skills link to.

## Authoring contracts and skeletons

- `authoring-api.md` — Public authoring contract. Manifest schema, chapter exports, descriptor mode, transitions, ctx helpers, validator behavior. **Read for the contract reference; skills have the high-frequency subset.**
- `current-workflow.md` — Workflow + storyboard rules. Read for the canonical sequence.
- `chapter-module-contract.md` — Locked interface spec for descriptor-mode chapter modules.
- `dom-prep.md` — Three-layer DOM staging model: universal baseline → per-snapshot profile → chapter-local delta.
- `video-production-templates.md` — Storyboard / chapter / snapshot checklist + token budget + smoke spec. Read only the section you need.
- `examples/legacy-manifest-skeleton.md` — Default manifest copy target.
- `examples/legacy-chapter-skeleton.md` — Default legacy/effect-mode chapter shape.
- `examples/legacy-postintro-effect-skeleton.md` — Video-local postIntro skeleton (HTML/CSS/SVG/GSAP).
- `examples/legacy-audio-cued-skeleton.md` — Timestamp-locked narration with `waitAt(t)`.
- `examples/choice-field-generate-choices-skeleton.md` — Choice-field AI Generate Choices flow.
- `examples/descriptor-chapter-skeleton.md` — Descriptor-mode chapter (closed-vocabulary).
- `examples/manifest-skeleton.md` — Bare manifest skeleton.
- `examples/postintro-concept-chapter-skeleton.md` — PostIntro as a video-local concept chapter.

## PostIntro

- `postintro-patterns.md` — PostIntro design rules + canonical references + multi-animation rule rationale. Owned by `wpforms-postintro` skill.

## GSAP / animation

- `gsap-rules.md` — L0 GSAP discipline canonical reference. Owned by `wpforms-gsap-rules` skill.
- `gsap-flip-patterns.md` — Flip patterns: morphs, reflows, real-UI clones.
- `effects-library.md` — `videos/_shared/effects.js` API: highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow.
- `frame-driver.md` — Phase B paused-timeline driver contract. Read when registering timelines or migrating cinematics.
- `pause-manager.md` — Phase E.5 pause/seek + `pausableRaf` contract.

## Transitions / surface modes / camera

- `transitions.md` — Surface modes (`iframe` / `editorial` / `mixed`) + swap styles + `flipBridge`. Owned by `wpforms-transitions` skill.
- `camera-poses.md` — Named camera-pose vocabulary (`focus`, `station`, `overview`).
- `shared-scene.md` — Multi-chapter persistent Three.js / editorial scenes.

## Marketing / ad-style / blocks

- `blocks.md` — `videos/_shared/blocks/` API: code-card, mac-window, phone-frame, pill, arrow, route-line, terminal.
- `text-kit.md` — 24 Pixel-Point-style text reveal presets.
- `lottie-kit.md` — Lottie integration (bumpers, stings, badges, marker-driven micros).

## Render / preview

- `render.md` — `tools/render.js` MP4 export. Wall-clock for tutorials, `--seek` only for `surface: editorial`.
- `preview.md` — `tools/preview.js` live-reload server + scrubber UI.

## Determinism / linting

- `deterministic-logic.md` — Render-parity rules: no `Date.now()`, no unseeded `Math.random()`, no `fetch()`. Enforced by `tools/lint-determinism.js`.
- `deterministic-logic-findings.md` — Existing-video violations logged by Phase F (not migrated; per-video cleanup is separate work).

## Skills

- `skills.md` — Phase F skill bundle index. Lists each `.claude/skills/wpforms-*/SKILL.md`.

## Field / UI inventories (canonical reference, not for full-read)

- `wpforms-field-state-inventory.md` — Canonical field-state inventory (132 KB). **Do not full-read.** Query via `node tools/field-state.js --field <name>`.
- `wpforms-ai-state-inventory.md` — WPForms AI UI state references.
- `snapshot-health-report.md` — Snapshot health audit.

## Per-video handoffs (read only when working on that video)

- `checkboxes-rescue-handoff.md` — Working notes for `a-complete-guide-to-the-checkboxes-field`.
- `wpforms-ai-guided-handoff.md` — Working notes for `build-forms-faster-with-wpforms-ai`.

## Followups / backlog

- `helper-rollout-backlog.md` — Candidate beats for `popOut` / `cursor.glideTo` / `lineDraw` rollout.
- `two-video-pattern-audit.md` — Pattern-proven-across-references audit.

## Refactor history (governance only)

- `stage-4-core-api-plan.md` — Pre-refactor stage-4 core API plan. Historical.
- `phase-g-research.md` — Phase G research + proposal that produced this index + the enriched skills.

## Repo-root references

- `CLAUDE.md` — Operator manual. Always loaded. Boot order + protected core + validation + push-back triggers.
- `AGENTS.md` — Codex operator manual. Same role as CLAUDE.md.
- `REFACTOR-BRIEF.md` — Locked architectural decisions (§3) + protected-core list (§4) + session output rules (§8.1).
- `REFACTOR-PROGRESS.md` — Per-phase log + known gaps (§2.1) + architectural debt (§2.2).
- `REFACTOR-DONE.md` — One-page closure summary.
- `repo-audit-findings.md` — Full Phase 0 architectural audit.
- `analysis-quality-and-transitions.md` — REST API video lessons (Phase 0 input).
