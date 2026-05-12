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

## Sound design (queued — not yet implemented in new architecture)

- `sound-design-reference-2026-05-12.md` — Reference doc combining (a) the "Music and SFX Selection for Tech Demo Videos" skill content received 2026-05-12, (b) our existing in-repo SFX pipeline state (`runtime/sfx.js` + `scenes/shared.js` BGM/ducking, engine-path coupled), and (c) gap analysis + recommended workflow for wiring sound into the new single-HTML pattern. Includes music matching matrix by content type, mix levels in dB, ducking specs (S-curve, 100-200ms attack, -6 to -8 dB reduction), royalty-free sources, and a 5-phase implementation plan for when sound work is greenlit.

## Single-HTML video architecture (NEW default for tutorial videos)

- `video-architecture-invariants-2026-05-12.md` — **11 hard rules (INV-1 through INV-11) for single-HTML videos.** Stage at native + no transform, iframe at native + single direct camera transform, mac frame is outer chrome only, cursor stage-local, snapshot field IDs vary per capture, smoothScrollIntoView before glide, library as reference (3-test promotion), pointer-events: none guard, determinism, real brand, required Intro→PostIntro→Tutorial→Outro shape. Cross-references each invariant to the commit it was learned from. Read before any new single-HTML video work.
- `pilot-videos-plan-2026-05-12.md` — Original plan for the 3 pilot videos (editorial / mixed / tutorial). Reference for snapshot inventory + storyboard structure.
- `library-scope-frequency-2026-05-12.md` — Empirical audit of 20 WPForms.com docs frequency-ranking interactions. Wave 2 Batch A retrospective: ~6 of 15 methods earned library status by ≥3-doc threshold. Use to decide library promotion candidates.
- `engine-redundancy-audit-2026-05-12.md` — Per-export classification of engine + runtime: REPLACED / REPLACEABLE / WPFORMS-PORTABLE / LOAD-BEARING / DEAD. Reference for any engine-slimming work.
- `engine-vs-libraries-architecture-2026-05-12.md` — Revised verdict after user pushback: engine is transitional, libraries can subsume. ~6,000 LOC deletable if all production migrates to single-HTML. But existing 12 videos stay on engine — engine is load-bearing for legacy.

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

## Code libraries (use, do not reinvent)

- `videos/_shared/motion-primitives.js` — Executable motion primitives: `cinematicFlight`, `figjamFlight`, `focusStationOverview` (cameras); `Cursor` class with glide/click/hover/drag; `caretType`, `statusPillMorph`, `markerSweep`, `popOut`, `fieldStaggerReveal`, `mountSullieBug`, `cleanFastRejoin`, plus utilities. Owned by `wpforms-primitives` skill. QC at `videos/_qc-primitives/`.
- `videos/_shared/wpforms-interactions.js` — Standard WPForms interactions. **Wave 1 (builder/admin):** `navAddNewForm`, `selectTemplate`, `navWPFormsSidebarMenu`, `openFormInList`, `dragFieldToForm`, `openFieldOptions`, `navBuilderSidebar`, `openSettingsTab` + sub-interactions. **Wave 2 Batch A (notifications + CL):** `addNotification`, `insertSmartTag`, `selectFromDropdown`, `addConditionalLogicRule`, `duplicateNotificationBlock`, notification setters (per `docs/library-scope-frequency-2026-05-12.md` retrospective ~6/15 earned status). **Plus `IframeManager`** with engine-pattern direct camera transform, OVERSAMPLE=1, pointer-events: none guard. Owned by `wpforms-primitives` skill. QC at `videos/_qc-interactions/`.
- `docs/wpforms-interactions-library-2026-05-11.md` — Per-interaction usage doc (template button variants, hover-state inventory, sub-interaction notes).
