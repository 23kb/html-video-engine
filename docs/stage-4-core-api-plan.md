# Stage 4 Core API Plan

Status: docs-only planning slice (4a). 2026-04-29.

## 0. System Rules / Production Truth Contract

These rules apply to all Stage 4 design and to normal video work. They
are non-negotiable framing for every section that follows.

- Real WPForms UI is the product truth.
- Use real captured snapshots as base structural surfaces.
- Do not fabricate product-looking WPForms HTML or fake snapshot folders
  to avoid capture.
- Snapshots are required when the base structure is missing, broken, or
  not truthfully derivable from existing DOM.
- Snapshots are not required for every final visible state.
- DOM staging is allowed when it is derived from real captured DOM,
  product-truth snippets, or `docs/wpforms-field-state-inventory.md`.
- Staged states must be documented in storyboard/handoff: the base
  snapshot used + what was staged on top.
- Capture structural source; derive state when the state inventory
  proves the DOM change.
- Normal video work should stay in `videos/<slug>/`, narration files,
  and handoff docs.
- If a video seems to need core edits, stop and ask whether the
  behavior is reusable.

## 0a. Base Snapshot + DOM-Derived State Model

- Snapshots are base structural surfaces, not one snapshot per final
  visible state.
- New snapshots are needed only when the base product structure is
  missing, broken, or cannot be truthfully derived from existing DOM.
- Many video states should be produced through DOM prep, prep ops,
  runtime verbs, cloned real DOM, transient overlays/controls that are either product-derived or clearly marked as staged visual aids, or
  product-truth snippets — not new captures.
- `docs/wpforms-field-state-inventory.md` is product-truth evidence for
  field states: it records base snapshots, real after-state HTML,
  trigger conditions, and whether a state is must / nice / skip / never.
- Stage 4 descriptors must support DOM-derived states. Descriptor
  design must not push the workflow toward "every state gets a new
  snapshot."

## 1. Purpose And Non-Goals

Stage 4 stabilizes the per-video authoring workflow so new videos do not
require edits to protected core files. It starts with descriptors,
tooling, and docs — core changes come last and only if a future video
would otherwise force them.

Non-goals:

- Not building a new video.
- Not polishing Checkboxes, WPForms AI, or any existing video.
- Not a broad runtime rewrite.
- Not landing helpers, descriptors, or core wiring in this slice.

## 2. Protected Core / Authoring Boundary

Approval-gated during normal video work — do not edit without explicit
sign-off:

| Path | Reason |
|---|---|
| `engine/*` | Engine primitives. Touch only with team approval. |
| `runtime/player.js` | Main orchestrator. Repeated pressure point. |
| `runtime/chapter-runner.js` | Chapter dispatch. Hosts swap-path audit concern. |
| `runtime/scene-helpers.js` | Shared scene plumbing. |
| `runtime/transitions.js` | Snapshot/cover transitions. |
| `scenes/shared.js` | BGM/narration/cover utility. |
| `videos/<slug>/` (existing) | Existing chapter modules and manifests. |
| `snapshots/<slug>/` | Captured/promoted UI fixtures. |

Also approval-gated: **any new file under `runtime/` intended as a
shared helper, even unwired**. Docs may propose helper names, shapes,
and contracts freely; actual runtime helper files are not part of
slices 4a or 4b. Creating a new `runtime/*.js` file requires explicit
approval under slice 4d or later.

Free-edit zone for Stage 4 (when slices are approved):

- `docs/*`
- `tools/*` (validator, smoke, list, skill-context)

New `runtime/*` files — including unwired helper sketches — are
**not** in the free-edit zone.

## 3. Current API Inventory

Grounded in code referenced by the two reference video handoffs and the
Stage 3 closeout. Items not directly verified in this slice are marked
"partial" pending a code-only confirmation pass in 4b.

### Manifest fields

| Field | Status | Notes |
|---|---|---|
| `hud` | supported now | Validator warns if not explicitly `false`. |
| `narrationSpeed` | supported now | Added during WPForms AI build; needs typed schema/range. |
| `bgm` | partial | In use by reference videos; schema not formalized. |
| `coverColor` / paper-cover color | partial | Used for paper cover handoff; not a formal field yet. |
| `intro` / `outro` | supported now | Sullie title-card variants. |
| `postIntro` | supported now | `kind` + `opts`; opts contract is per-cinematic and informally validated. |
| `chapters` | supported now | Active-chapter source of truth (Slice 1 of Stage 3). |
| `primarySnapshot` | supported now | Validator checks folder exists. |
| `defaults` (e.g. breakStyle/swapStyle) | partial | Honored in code where present; not documented as a manifest schema. |
| `expectedMissingResources` | proposal only | Smoke currently hardcodes optional sanitize-404 handling; not a manifest field. Proposal: manifest-driven allowlist/reconciler. |

### Chapter patterns

| Pattern | Status | Notes |
|---|---|---|
| Legacy beat modules (`export default [ ... ]` + `export const snapshot/mode/narration`) | supported now | Used by Checkboxes and most existing videos. |
| `defineChapter(...)` descriptor style | partial | Used by some newer chapters; coexists with legacy beats. |
| Inert `validator = { snapshot: '...' }` hint | supported now | Workaround for guided chapters with non-descriptor swaps. |
| `setup(ctx)` post-swap | supported now | Default. |
| `setup(ctx)` under-cover during swap | partial | Implemented in `runtime/player.js` for chapter-boundary snapshot loads; not declarative. |

### Prep ops (`runtime/prep-ops.js`)

| Op | Status |
|---|---|
| `applyDefaultForm` | supported now |
| `applyIconChoicesV2` | supported now |
| `setChoiceLabels` | supported now |
| `setCheckedChoices` | supported now |
| `applyImageChoices` | supported now |
| `swapToSnapshot` (effect ctx, not prep) | supported now |
| `stripQuizEnabled` | supported now (legacy debt warned by validator) |

Possibly related but **verify before planning**: `iconPickerOpen` was
referenced in the Checkboxes handoff as a runtime demo verb for the
JS-mounted Icon Picker modal. It is not confirmed as a `prep-ops.js`
export by this slice. Treat as unverified until 4b reads
`runtime/prep-ops.js` directly.

### Snapshot swap paths

More than one runner path performs snapshot swaps. Currently known:

- `runtime/player.js` defines `transitionSnapshots()` and exposes
  `swapToSnapshot()` through the effect ctx for mid-chapter swaps.
- `runtime/scene-helpers.js` exports `swapSnapshot()`, used by
  `runtime/chapter-runner.js` and the descriptor verbs.
- `runtime/transitions.js` contains transition-style helpers used by
  the descriptor path.

**Audit concern.** Multiple coexisting swap paths are the main reason
every new "smooth handoff" lesson lands as a one-off `player.js` edit.
A future slice should reconcile these into one declarative `swapStyle`
honoring path. **Status: approval-gated core change.** Not in scope
for 4a. Path ownership above is current best knowledge; 4b should
confirm by reading the files directly before any reconciliation work.

## 4. Descriptor Candidates

### Near-term likely

| Descriptor | Where it lives | Replaces |
|---|---|---|
| `postIntro.kind` enum + per-kind `opts` schema | manifest | Ad-hoc opts drift (`orbit` vs `fields`). |
| `manifest.defaults.breakStyle` / `defaults.swapStyle` | manifest | Implicit per-video defaults. |
| Chapter-level `swapStyle` / `breakStyle` override | chapter | One-off `player.js` paper-cover edits. |
| `defaultForm` cleanup vocabulary (`{ keep, topicField, stripQuiz, stripPayments, formName }`) | chapter or manifest | Per-chapter cleanup blocks. |
| `setup.runDuring: 'transition' \| 'after'` | chapter | Implicit under-cover behavior. |
| Manifest-driven `expectedMissingResources` allowlist/reconciler | manifest (new) | Replaces hardcoded optional-sanitize 404 handling in smoke; not yet a manifest field. |
| `narrationSpeed` schema + numeric range | manifest | Value works; no validation. |
| Builder camera floor | validator-only (no new descriptor) | Already a warning. |

### Speculative / defer

| Item | Reason to defer |
|---|---|
| `interaction.target` deciding overlay type (in-iframe outline vs stage overlay) | Pattern used twice; wait for a third video to confirm shape. |
| `cameraFloor` as a per-chapter descriptor | Validator warning likely sufficient. |
| `snapshotHint` formalization | Doesn't map cleanly to legacy `export const snapshot` + `defineChapter` coexistence. |

## 5. Helper Extraction Candidates

**Do not create these yet.** Listed for planning only. Chapters should
not directly import runtime helpers during normal authoring; helpers
should reach chapters via descriptors, prep ops, verbs, or `ctx` only
after approval.

| Helper | First home | Production wiring |
|---|---|---|
| Paper-cover transition | docs first; later isolated `runtime/transitions/paper-cover.js` | Core wiring (4e) — honored via `swapStyle`. |
| Type-with-SFX | docs first; later isolated `runtime/sfx/type-with-sfx.js` | Core wiring (4e) — replace inline `playType()` graft. |
| Clean builder canvas / default-form prep | prep-ops (`runtime/prep-ops.js`) | Exposed as `defaultForm` descriptor + prep verb. |
| Choice payoff prep (label/checked/image/icon) | prep-ops | Already mostly there; consolidate behind one verb table. |
| In-iframe outline overlay | docs first; later isolated overlay helper | Exposed via ctx verb after a third video confirms. |
| Modal-over-snapshot | docs only; defer extraction until a third video repeats it | Not wired until proven. |
| Cinematic / postIntro option schemas | docs (schema) + validator | No runtime wiring needed beyond schema. |

## 6. Validator / Smoke Backlog

Priority-ordered. Default to warnings; promote to error only with
explicit approval (see §8). Items already in `tools/validate-video.js`
or `tools/check-video-playback.js` are marked **(in)**.

| # | Check | Level | Notes |
|---|---|---|---|
| 1 | Forbidden chapter imports from `engine/`, `runtime/`, `scenes/` (except approved contract files like `_selectors.js`) | warning (initial) | CLAUDE.md rule, not yet codified. Legacy packages may already violate the boundary; promotion to error requires baseline cleanup and explicit approval. |
| 2 | Manifest schema (known fields, types, enums) | warning | Foundational for #3–#7. |
| 3 | `postIntro.kind` in known set + per-kind opts contract | warning | (in) for kind; opts contract is new. |
| 4 | `narrationSpeed` numeric and within range (e.g. 0.85–1.25) | warning | Range to be agreed in 4b. |
| 5 | `defaults.breakStyle` / `defaults.swapStyle` in allowed values | warning | Depends on §4 enum. |
| 6 | Referenced snapshot folder exists | error | (in) |
| 7 | Referenced narration mp3/txt exists; per-beat-narration coverage | warning | (in) |
| 8 | `expectedMissingResources` reconciler vs smoke output | warning | New; needs manifest field first. |
| 9 | Duplicate `<body>` / static snapshot health | warning | Memory rule; codify. |
| 10 | Zero-size click/typing target pre-click | warning | Smoke-time check. |
| 11 | Builder snapshot beat with `camera.level < 1.0` | warning | (in) |
| 12 | Stage-overlay highlight at `camera.level < ~1.05` on builder snapshots | warning | Overlay-spill prevention. |
| 13 | Long beat / narration-duration > 6s under one clip | warning | Only if mp3 duration extraction is practical. |
| 14 | Cinematic opts lint (introspect `runtime/cinematic-*.js` exports) | warning | Catches `orbit` vs `fields` drift. |

## 7. Safe Implementation Order

| Slice | Scope | Approved here? |
|---|---|---|
| 4a | This plan doc only (`docs/stage-4-core-api-plan.md`). | yes |
| 4b | Docs/schema promotion into chapter contract + production templates after review. | no — needs review of 4a. |
| 4c | Validator/tooling warnings from §6. No runtime changes. | no |
| 4d | Isolated helper extraction (no core wiring). | no |
| 4e | Core wiring (descriptors honored, helpers wired, swap-path reconciliation). Only if a future video would otherwise force core edits. | no |

4d and 4e are explicitly **not approved** by this task. They require
their own approval gates.

## 8. Approval Gates

Explicit approval is required for any of the following:

- Any edit to `runtime/player.js` or `runtime/chapter-runner.js`.
- Any edit to `scenes/shared.js`.
- Any edit under `engine/*`.
- Any edit to an existing video's chapters or manifest.
- Any edit to an existing snapshot folder.
- Any new file under `runtime/` intended as a shared helper, even
  unwired. Docs-only proposals are fine; the file itself is gated.
- Any validator warning promoted to error level.
- Any new manifest/chapter descriptor field that requires runtime
  changes to honor.

## 9. Verification Expectations

### Docs-only verification (this slice)

- Doc matches current workflow (`docs/current-workflow.md`) and Stage 3
  closeout (`docs/stage-3-reusable-fixes-plan.md`).
- No code, snapshot, video, tool, or schema file changed.
- Reference videos unchanged; no validator/smoke run required.

### Future code/tooling verification (4c onward)

For each later slice:

- `node tools/validate-video.js a-complete-guide-to-the-checkboxes-field`
- `node tools/validate-video.js build-forms-faster-with-wpforms-ai`
- `node tools/check-video-playback.js <slug>` for both reference videos.
- Record warning/error/info deltas before vs after, in the slice's
  verification record (Stage 3 pattern).
- For 4d/4e: explicit before/after `missingResources`, `bootError`,
  `sceneDone` capture; visual QC owned by the operator.

## 9a. Slice 4c Verification Record (2026-04-29)

**Slice 4c-1: validator warnings only.**

### Files changed

- `tools/validate-video.js` — three additive warning-only checks:
  1. **Forbidden chapter import boundary.** `findForbiddenImports(text, file)`
     scans each active chapter for static `import`, dynamic `import()`,
     and `require()` specifiers that hit `engine/`, `scenes/`, or
     `runtime/`. Allowlist: exact `/runtime/chapter-api.js`. Relative
     imports are allowed only when they stay inside the video/chapter
     package; relative traversal that resolves to repo-level `runtime/`,
     `engine/`, or `scenes/` warns. Resolution is done with `path.resolve`
     against the importing file's directory, then made repo-relative.
     Warning only (legacy packages may already violate).
  2. **`runtime/dom-prep.js` direct import.** Same scan flags this path
     specifically with a "prefer declarative `prep` ops" message.
  3. **Manifest schema warnings.** `narrationSpeed` must be a number in
     soft range 0.85–1.25; `defaults.breakStyle` must be in
     `{cut, dolly, glide}`; `defaults.swapStyle` must be in
     `{crossfade, fade, morph, paper-cover}`. All warning-only.

No promotion to error. No runtime/tooling/snapshot/video edits.

### Conservative style sets

Sourced from reference video handoffs and related learnings:

| Field | Allowed values | Provenance |
|---|---|---|
| `defaults.breakStyle` | `cut`, `dolly`, `glide` | Checkboxes manifest uses `glide`; `dolly` referenced in Phase 4 default ("dolly+cover"); `cut` is the obvious hard-snap value. |
| `defaults.swapStyle` | `crossfade`, `fade`, `morph`, `paper-cover` | Checkboxes uses `morph`; WPForms AI hardfix established `paper-cover`; `crossfade` / `fade` are conservative additions. |

If the runtime later supports more values, expand the sets here and in
the validator together.

### Commands run

```
node tools/validate-video.js a-complete-guide-to-the-checkboxes-field
node tools/validate-video.js build-forms-faster-with-wpforms-ai
```

### Validator output (before vs after)

| Run | Errors | Warnings | Info |
|---|---|---|---|
| Checkboxes — before (baseline) | 0 | 4 | 2 |
| Checkboxes — after | 0 | 4 | 2 |
| WPForms AI — before (baseline) | 0 | 0 | 0 |
| WPForms AI — after | 0 | 0 | 0 |

**Zero new warnings on either reference video.** The new boundary checks
fire only on actual violations; both videos correctly route helpers
through `ctx`/descriptor verbs and neither manifest sets out-of-range
`narrationSpeed` or unknown `defaults.breakStyle`/`defaults.swapStyle`
values. The Checkboxes 4× `stripQuizEnabled` warnings and 2× orphan
infos are pre-existing Stage 3 baseline.

### Result vs locked Stage 4 baseline

**Acceptable.** Validator deltas are zero. No playback smoke run for
this validator-only slice (per Stage 4 testing baseline policy §10).

## 9b. Slice 4c-3 Verification Record (2026-04-29)

**Slice 4c-3: duplicate `<body>` snapshot health check.**

### Files changed

- `tools/validate-video.js` — additive warning-only check inside
  `runVideoChecks`. For each snapshot referenced by the active video
  (manifest.primarySnapshot, chapter `snapshot:` declarations, and
  `swapToSnapshot('...')` call sites — all collected in the existing
  `refs` map) that has an `index.html` on disk, scan and count real
  `<body[\s>]` opening tags. Before counting, strip HTML comments and
  the bodies of `<script>`, `<template>`, and `<noscript>` so a
  serialized `<body` inside JS, JSON-in-script, or a comment does not
  cause false positives. If the surviving count is > 1, warn against
  the first chapter call site.

No promotion to error. Only referenced snapshots are scanned — no
repo-wide walk.

### Conservative scan note / known limitations

- A literal `<body` inside `<style>` or inside an attribute value would
  still count. Current snapshots do not stage that case. If a future
  false positive surfaces, the next refinement is to also strip
  `<style>` bodies and limit the regex to top-level matches.
- The check runs only when the snapshot folder exists; non-existent
  folders are already errored by the existing snapshot-existence check.

### Commands run

```
node tools/validate-video.js a-complete-guide-to-the-checkboxes-field
node tools/validate-video.js build-forms-faster-with-wpforms-ai
```

### Validator output (before vs after)

| Run | Errors | Warnings | Info |
|---|---|---|---|
| Checkboxes — before (locked baseline) | 0 | 4 | 2 |
| Checkboxes — after | 0 | 4 | 2 |
| WPForms AI — before (locked baseline) | 0 | 0 | 0 |
| WPForms AI — after | 0 | 0 | 0 |

**Zero new warnings on either reference video.** None of the
referenced snapshots tripped the duplicate-`<body>` check.

### Result vs locked Stage 4 baseline

**Acceptable.** Validator deltas are zero. No playback smoke run for
this validator-only slice (per §10).

## 10. Testing Baseline Policy

| Slice type | Required testing |
|---|---|
| Docs-only | Verify changed files only. No playback smoke required. |
| Validator / tool | Run `validate-video.js` on both reference videos; record warning deltas. |
| Runtime / helper / core | Before and after each slice, run `validate-video.js` and `check-video-playback.js` on both reference videos. Stop on any new `bootError`, `sceneDone` failure, console/page error, or unexpected missing resource. |

Any validator warning promoted to error level requires explicit
approval (see §8).
