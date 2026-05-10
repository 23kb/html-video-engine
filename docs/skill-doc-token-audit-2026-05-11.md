# Skill + Doc Token-Bloat Audit — 2026-05-11

Phase 5c Track 3 deliverable. Review-only proposal doc — no source files were edited. All claims cite `file:line` or `file:lines`.

## Executive summary

**Volume in scope** (excluding the 132 KB `wpforms-field-state-inventory.md` query-only inventory and the deterministic-logic `.log` files in `core-factors/`):

- 6 local skills (`.claude/skills/wpforms-*`) — **1147 lines / ~91 KB SKILL.md combined**, plus 3 trivial reference stubs (~3 KB)
- 5 external skills (`.agents/skills/*`) — **2168 lines / ~80 KB SKILL.md combined**, plus heavy reference trees (notably `impeccable/reference/` ≈ 280 KB across 35 files; `design-motion-principles/references/` ≈ 67 KB across 8 files)
- 41 docs in `docs/` — **~10,484 lines** (non-inventory), largest non-inventory: `repo-architecture-audit-hyperframes.md` (944), `authoring-api.md` (749), `video-production-templates.md` (510), `dom-prep.md` (499), `gsap-rules.md` (406)
- 3 repo-root operator files: `CLAUDE.md` ≈ `AGENTS.md` (138 lines, **byte-identical-by-`Compare-Object` after a single line difference per `git diff`** — see Redundancy Cluster #1), `BACKLOG.md` (190), `README.md` (253)
- `style guide.md` at repo root (17 KB) — registered in INDEX as `style-guide.md` but actually named with a space: stale path

**Top 5 token-burn offenders (by per-load cost × likely auto-trigger frequency):**

1. **`.agents/skills/impeccable/SKILL.md`** (181 lines / 14 KB) plus 35 reference files including `live.md` (50 KB), `document.md` (28 KB), `craft.md` (14.5 KB), `critique.md` (12.6 KB). YAML `description:` field is 1268 characters and triggers on virtually anything UI-related ("design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract"). For a video-tutorial repo where front-end design isn't the surface area, this is a leaky firehose.
2. **`.agents/skills/emil-design-eng/SKILL.md`** (679 lines, 27.4 KB single file). Re-asserts much of `wpforms-gsap-rules` material from a designer-philosophy lens; not partitioned into references.
3. **`.agents/skills/gsap-scrolltrigger/SKILL.md`** (765 lines, 17.6 KB) plus `references/common_patterns.md` (25 KB) and `references/easing_guide.md` (16.7 KB). Per the Phase-2 install report (`docs/phase-2-skill-installs-report-2026-05-10.md:21-27`) this skill is generic GSAP reference; it duplicates parts of `wpforms-gsap-rules` and adds nothing the local skill is missing.
4. **`docs/wpforms-field-state-inventory.md`** (132 KB / 2321 lines). Already gated as "do not full-read" — but `current-workflow.md:73`, `wpforms-video/SKILL.md:151`, `CLAUDE.md:28` and `INDEX.md:92` each repeat the warning. The gate works; the repeated warning reads as token-burn the moment Claude loads any of those.
5. **`.agents/skills/design-motion-principles/references/jakub-krehel.md`** (10.1 KB), `jhey-tompkins.md` (11.4 KB), `emil-kowalski.md` (9.8 KB), `technical-principles.md` (16.6 KB). The skill body deliberately defers to these; if the auto-trigger fires they all load together — ~58 KB cumulative.

**Top 3 redundancy clusters** (full detail below in *Redundancy clusters*):

- **GSAP L0 rules** appear in `wpforms-gsap-rules/SKILL.md` (the seven rules, §L0), `docs/gsap-rules.md` (the seven rules, almost identical wording, ~250 lines of code samples), and partially in `wpforms-postintro/SKILL.md:106-122`. Three files; one is canonical (the skill), one is the explicit reference doc, one is incidental — but the skill body already inlines the rules.
- **Surface-mode table (`iframe`/`editorial`/`mixed`)** appears in `wpforms-marketing/SKILL.md:16-43`, `wpforms-transitions/SKILL.md:66-78`, `docs/transitions.md:7-16`, and `docs/stage-css.md:25-33`. Same three-row table four times.
- **Camera-pose registration example** (verbatim three lines: `registerCameraPose('focus', { focus: sel.field, level: 1.18, pad: 14 })`) appears in `wpforms-transitions/SKILL.md:84-89`, `docs/camera-poses.md:5-10`, and `docs/camera-lensing.md:58-60` (linked).

**Headline finding.** The local `wpforms-*` skills are well-shaped (each <250 lines, sharp triggers, mutual cross-references). The bloat sits in three places: (1) **CLAUDE.md == AGENTS.md duplication**; (2) **doc-vs-skill double-write** for GSAP rules, transitions/surface modes, camera poses, postIntro shape; (3) **5 installed external skills** of which only 1 (`design-motion-principles`) was the actual goal of Phase 2; the others are background load.

## Skill-file inventory

| Skill | Path | Lines | KB | Issues |
|---|---|---:|---:|---|
| wpforms-video | `.claude/skills/wpforms-video/SKILL.md` | 209 | 14.3 | Healthy. Description well-scoped. References list is long (line 181-202) — every doc is registered as on-demand, fine. Minor: mentions `runtime/shared-scene.js` etc in push-back triggers (line 176) duplicated with `CLAUDE.md` protected list. |
| wpforms-marketing | `.claude/skills/wpforms-marketing/SKILL.md` | 235 | 11.3 | Healthy but cites `videos/_phase-c-editorial-pilot/` (line 42, 218) — confirmed exists. Also references `hyperframes/hyperframes-rest-2/` and `hyperframes/wpforms-ai-scene-10/` (line 219) — both exist. References `docs/transitions.md`, `docs/blocks.md`, `docs/text-kit.md` etc — all exist. Surface-mode block (16-43) overlaps with transitions skill — see Redundancy Cluster #2. |
| wpforms-postintro | `.claude/skills/wpforms-postintro/SKILL.md` | 168 | 12.9 | Healthy. Cites `runtime/cinematic-rough-thought-to-draft.js` (line 93), `runtime/cinematic-one-answer-enough.js` (line 94), `scenes/notifications-combined.html` (line 95) — all exist. **Stale**: line 95 names "Notifications `form-to-inbox` teaser" but no `runtime/cinematic-form-to-inbox.js` exists; the actual file is `runtime/teaser-form-to-inbox.js` and the cinematic lives in `scenes/notifications-combined.html`. Wording is technically correct but easy to mis-resolve. |
| wpforms-transitions | `.claude/skills/wpforms-transitions/SKILL.md` | 189 | 10.8 | Healthy. References `tools/qc-out/a-complete-guide-to-the-checkboxes-field/FINDINGS.md` (line 174) — **does not exist** (only `form-entries-guide/FINDINGS.md` exists under `tools/qc-out/`). Stale. |
| wpforms-gsap-rules | `.claude/skills/wpforms-gsap-rules/SKILL.md` | 248 | 11.8 | Healthy. The Seven Rules content (lines 14-90) duplicates `docs/gsap-rules.md` — see Redundancy Cluster #1. Description well-scoped (triggers on "GSAP", "Flip", "timeline", "tween", "animation", "RAF", "requestAnimationFrame"). |
| wpforms-motion-audit | `.claude/skills/wpforms-motion-audit/SKILL.md` | 98 | 6.7 | Healthy and small. **Self-flagged redundancy at lines 62-63**: `references/criteria-tiers.md` and `references/score-examples.md` are explicitly noted as "legacy, also in this file." These two reference files (~2 KB combined) should be deleted. |
| design-motion-principles (ext) | `.agents/skills/design-motion-principles/SKILL.md` | 203 | 9.5 | Healthy structure but heavy `references/` tree. Trigger description matches "any motion design work" — broad but well-scoped to "UI animations, transitions, hover states." Largest concern: this skill insists on a STEP 1 user-confirmation gate (lines 80-100) which is a poor fit for the autonomous video flow — it will block routine work. |
| emil-design-eng (ext) | `.agents/skills/emil-design-eng/SKILL.md` | 679 | 27.4 | **Excessively large for a single SKILL.md.** Should be split into references. Description triggers on "UI polish, component design, animation decisions" — competes with `wpforms-gsap-rules` and `design-motion-principles`. Initial-response gate (lines 8-14) demands a specific opening message — wastes a turn before any work can happen. |
| gsap-scrolltrigger (ext) | `.agents/skills/gsap-scrolltrigger/SKILL.md` | 765 | 17.6 | Largest external SKILL.md. Description triggers on "GSAP, ScrollTrigger, smooth animations, scroll effects, animation sequencing" — overlaps `wpforms-gsap-rules` (which covers everything actually relevant). Per `phase-2-skill-installs-report-2026-05-10.md:21-27`, this skill adds nothing wpforms-gsap-rules lacks. Recommend uninstall (Codex's Phase 2 report concurs). |
| impeccable (ext) | `.agents/skills/impeccable/SKILL.md` | 181 | 14.0 | SKILL.md modest, but `reference/` tree is enormous: `live.md` 50 KB, `document.md` 28 KB, `craft.md` 14.5 KB, `critique.md` 12.6 KB, plus 31 more files totaling ~280 KB. 1268-character `description:` triggers on "design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract" — broadest trigger surface in the system. Also has placeholders like `{{scripts_path}}` that are never substituted in this repo. |
| remotion-best-practices (ext) | `.agents/skills/remotion-best-practices/SKILL.md` | 340 | 9.8 | The skill that started as "structural reference only" per `editorial-direction-audit-2026-05-10.md:120-123` and `phase-2-skill-installs-report-2026-05-10.md:11`. It still auto-triggers on Remotion-related work, but **this repo never uses Remotion**. The description warns "skip: file imports `openai`/other-provider SDK" but doesn't disqualify itself for repos with no Remotion imports. Drop trigger or convert to non-trigger. |

## Per-skill findings

### `wpforms-video` (`.claude/skills/wpforms-video/SKILL.md`)

- **Description quality.** Sharp. Names triggers, names the four sister skills, ends with a "use X for Y" routing block. Strong.
- **Reference list.** 16 references in two blocks (lines 181-202). All paths exist. The two-block split (canonical vs granular) is good — granular references stay token-light until a beat actually needs them.
- **Redundancy with `CLAUDE.md`.** Production-truth rules (line 39-46) restate what `docs/authoring-api.md:24-59` already says verbatim. Push-back triggers (line 168-178) restate `CLAUDE.md:114-123`. **Recommendation:** keep production-truth in the skill (high-frequency); delete the duplicate from `authoring-api.md` §1 (the skill is canonical).
- **Stale content.** None found. Even the "Modern Features Cheat Sheet" (lines 118-138) is still accurate.
- **Token-density.** 209 lines is at the upper edge of "comfortable inline." Acceptable as-is.

### `wpforms-marketing`

- **Description quality.** Triggers on `surface: 'editorial'`, `surface: 'mixed'`, "ad-style", "marketing video", "announcement", "release video", "atmospheric", "blocks library", "text-kit reveal." Comprehensive and disambiguated against `wpforms-video`.
- **Surface-mode block (lines 16-43).** Duplicates `wpforms-transitions/SKILL.md:66-78` with the same 3-row table. **Recommendation:** keep in `wpforms-transitions` (canonical for surface vocabulary); cross-reference from `wpforms-marketing` with a one-liner.
- **Reference list.** Cites `videos/_phase-c-editorial-pilot/` (exists), `hyperframes/hyperframes-rest-2/` (exists), `hyperframes/wpforms-ai-scene-10/` (exists). All resolve.
- **Redundancy with `wpforms-postintro`.** Modern-features cheat tables (lines 113-122 in postintro, mirrored in marketing 50-58) overlap. Acceptable: each skill restates what *its* author needs.

### `wpforms-postintro`

- **Description quality.** Sharp triggers: "postIntro", "concept beat", "after the title card", `postIntro.kind`. Distinct from `wpforms-video`.
- **Multi-animation rule (HARD-GATE, lines 12-22).** Canonical and authoritative. Also restated in `docs/postintro-patterns.md:34-61`. **Recommendation:** delete from `postintro-patterns.md`; keep in skill (HARD-GATEs belong in skills, not docs).
- **Build order (lines 43-49).** Duplicates `docs/postintro-patterns.md:84-108`. **Recommendation:** delete from doc.
- **Stale content.** Line 95 references "Notifications `form-to-inbox` teaser" in `scenes/notifications-combined.html` — file exists, but the teaser file `runtime/teaser-form-to-inbox.js` is the actual cinematic and isn't named here. Minor, fix the wording or accept.
- **Modern features table (lines 113-122).** Mostly cross-skill pointers — fine.

### `wpforms-transitions`

- **Description quality.** Triggers list is long (`breakStyle`, `swapStyle`, `flipBridge`, `morph`, `cover`, `dolly`, `glide`, `whip`, "camera pose", "shared scene", `surface:`, `pausableRaf`, "preview scrubber", "MP4 render"). **Conflict with `wpforms-gsap-rules`** on `pausableRaf` — both skills claim it. See *Trigger conflict map*.
- **Stale content.** Line 174 references `tools/qc-out/a-complete-guide-to-the-checkboxes-field/FINDINGS.md` — **file does not exist.** Only `form-entries-guide/FINDINGS.md` is present. **Fix the citation or remove.**
- **Tables.** Chapter-break (lines 16-26), swap-styles (lines 28-37), surface-modes (lines 66-78), decision-tree (lines 140-153). Good density. Surface-modes overlaps with marketing; everything else is unique to this skill.

### `wpforms-gsap-rules`

- **Description quality.** Triggers on "GSAP", "Flip", "timeline", "tween", "animation", "RAF", "requestAnimationFrame". The "animation" trigger is broad — competes with `design-motion-principles` and `emil-design-eng` (see *Trigger conflict map*).
- **The Seven Rules (lines 14-90).** Canonical content. **`docs/gsap-rules.md` (406 lines, 15 KB) re-states the same seven rules with longer code samples and audit notes.** The skill version is the modern canonical; the doc is legacy. **Recommendation:** demote `docs/gsap-rules.md` to a "case-study + audit notes" appendix or delete; the skill body and the granular references already cover the discipline + Flip patterns + effects library.
- **Determinism block (lines 201-210).** Duplicates `docs/deterministic-logic.md` (32 lines) and `CLAUDE.md:69-77`. Three locations; the skill is the highest-traffic.

### `wpforms-motion-audit`

- **Description quality.** Sharp triggers: "audit my motion", "score this animation", "is my camera move good", "rate this", proactive before postIntro/cinematic handoff.
- **HARD RULE 1 known-case table (lines 17-26).** Cites real files; verifying:
  - `videos/wpforms-ai-zlyvs/index.html` exists (45.4 KB, has `storyboard.md`)
  - `videos/wpforms-ai-announcement/index.html` exists (55 KB)
  - `videos/wpforms-ai-board/index.html` exists (58.4 KB, has `LESSONS.md`)
  - `reference/html-templates/wpforms-ai-prompt-open.html` exists
  - `reference/html-templates/editorial-reference-36s.html` exists
  - `reference/html-templates/openai-replica-18s.html` exists (also at `sandbox/openai-replica-18s.html`)
  - `videos/build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js` exists
  - `videos/wpforms-rest-api-overview-polished/` exists
  All citations resolve. Strong.
- **References folder is dead weight.** Self-flagged at SKILL.md lines 62-63: `criteria-tiers.md` and `score-examples.md` are "legacy, also in this file." These should be **deleted** (only `wpforms-anti-patterns.md` carries unique content, and even it could be inlined — it's 9 lines).

### External skills

#### `design-motion-principles`
- **Description quality.** Adequate. The auto-trigger surface ("UI animations, transitions, hover states, motion design work") is broad but the SKILL.md body has explicit project-type weighting that should self-correct on a video-tutorial repo. **Risk:** the STEP 1 *Wait for User Confirmation* gate (lines 90-101) blocks autonomous work and demands a turn from the user before the audit even begins. For an autonomous-mode flow, this skill stops work cold.
- **Reference tree.** 8 files, ~67 KB. Per-designer files (Emil 9.8 KB, Krehel 10.1 KB, Tompkins 11.4 KB) load in sequence based on weighting. Acceptable on-demand.
- **Conflict with `wpforms-motion-audit`.** Both audit motion. The wpforms one is calibrated to wpforms videos with a known-case table; the design-motion-principles one is generic with a designer-philosophy lens. **Recommendation:** the wpforms one should run first/preferentially when the path matches a wpforms-repo file; design-motion-principles should kick in only when explicitly invoked or when the surface is non-wpforms.

#### `emil-design-eng`
- **Description quality.** Triggers on "UI polish, component design, animation decisions, the invisible details that make software feel great." Almost any UI mention will hit this — it competes directly with `design-motion-principles`, `impeccable`, and `wpforms-motion-audit`.
- **679 lines is excessive for SKILL.md.** Should be partitioned into references. Loading 27.4 KB at trigger time is the single biggest auto-cost in the system besides `impeccable`.
- **Initial-response gate (lines 8-14).** "When this skill is first invoked without a specific question, respond only with: `I'm ready to help you build interfaces that feel right…`" — wastes a conversational turn before any work. For autonomous video work this is dead weight.
- **Recommendation:** disable trigger; keep installed for explicit `/emil` invocation only.

#### `gsap-scrolltrigger`
- **Per `docs/phase-2-skill-installs-report-2026-05-10.md:21-27`:** "What it lacks compared with `wpforms-gsap-rules`: no WPForms render determinism rules, no vendored GSAP version rule, no `registerTimeline()` contract, no `pausableRaf`, no `awaitTween`, no `withGsapContext`, no finite-repeat requirement, no Flip boundary warning, and no video-validator checklist. What Phase 2 specifically hoped it might add, but it does not: decomposition guidance for cinematic camera moves, multi-phase camera patterns, per-phase CustomEase rules, or WPForms editorial tiering."
- **Verdict from Codex's own Phase 2 report:** redundant.
- **Recommendation:** uninstall.

#### `impeccable`
- **Largest reference tree in the repo** at ~280 KB across 35 files. `reference/live.md` alone is 50 KB.
- **Description triggers on most front-end design verbs.** For a video-tutorial repo where front-end design isn't the surface area, this fires constantly without adding value.
- **Setup gate (lines 14-32).** Demands `PRODUCT.md` (project root, 200+ chars, no TODO markers) before any work proceeds. This file does not exist and shouldn't — wpforms videos aren't a product-design surface. The skill will hard-stop on every trigger waiting for `PRODUCT.md`.
- **Templated placeholders unsubstituted.** `{{scripts_path}}` (line 45), `{{command_prefix}}impeccable craft` (line 22), `{{model}}` (line 71). The skill is plumbing for a different harness; it is non-functional in this repo.
- **Recommendation:** uninstall.

#### `remotion-best-practices`
- **Per `editorial-direction-audit-2026-05-10.md:120-123`:** "**Don't migrate to Remotion.** Detail in the external-resources audit above." Three reasons listed.
- **Per `phase-2-skill-installs-report-2026-05-10.md:11`:** installed "as REFERENCE only."
- **The repo has zero Remotion imports.** The skill's own description acknowledges scope ("Use this skill whenever you are dealing with Remotion code") — but the trigger keywords ("video", "react", "animation", "composition") are broad enough to fire on routine wpforms-video work.
- **Recommendation:** disable trigger; keep installed for the rare "what's the Remotion equivalent of X" research question (matches the original install intent).

## Per-doc findings (top offenders)

### `docs/authoring-api.md` (749 lines, 33.1 KB)

- Status: **canonical contract, justified size.** Manifest schema, chapter exports, descriptor mode, transitions, ctx helpers, validator behavior. The skills explicitly defer to it for "questions a skeleton leaves open."
- **Production-truth rules (lines 24-59) duplicate `wpforms-video/SKILL.md:39-46`.** Both versions are correct. Recommend deleting the doc copy and pointing at the skill.
- **References to `docs/current-workflow.md` (line 10).** That doc is now a 84-line pointer doc — consolidating both into the skill body would shorten the chain.

### `docs/gsap-rules.md` (406 lines, 15 KB)

- **Body almost entirely duplicates `wpforms-gsap-rules/SKILL.md` §L0 (the Seven Rules).** Each rule has more code-sample bulk than the skill version, but the rule statements are identical.
- The "Audit notes" sections (e.g. line 77-80) carry unique content: per-rule notes about which existing videos still violate the rule. This is useful but small (~30 lines total across all rules).
- **Recommendation:** convert to `docs/gsap-audit-notes.md` (the unique audit-note content), delete the rule-statement bulk, point at the skill.

### `docs/repo-architecture-audit-hyperframes.md` (944 lines, 34.1 KB)

- Strategic-context audit doc dated 2026-05-09. Per `INDEX.md:83`: "Strategic context (Phase 2 + Phase 4b execution slice)."
- Cites stale validator counts on line 19: "0 errors, 123 warnings, 30 info" — vs the current `deterministic-logic-findings.md:9` count of "0 errors, 56 warnings."
- **Stale reference**: line 14 cites `docs/hyperframes-system-analysis.md` — **file does not exist** in current repo.
- **Recommendation:** archive into `docs/_archive/` or `docs/audits/`. It's no longer load-bearing for any active work but still has historical value.

### `docs/video-production-templates.md` (510 lines)

- Storyboard / chapter / snapshot checklist + token budget + smoke spec. The `wpforms-video/SKILL.md:184` says "Read only the section needed."
- Reasonable to keep at this size *if* it's truly section-loaded. Risk: agents tend to full-read.
- **Recommendation:** split by section (storyboard / chapter / token-budget / smoke / postintro) into 5 small files in `docs/templates/`. The cost-saving is real if agents start full-reading.

### `docs/dom-prep.md` (499 lines, 18 KB)

- Internal-architecture doc for `runtime/dom-prep.js`. Useful for the rare beat that needs DOM prep beyond the public verb. The protected-core list now spells out that `runtime/dom-prep.js` and `runtime/prep-ops.js` are strict-tier (`CLAUDE.md` strict tier), so this is reference-only.
- **Recommendation:** keep but mark "internal architecture; agents do not edit." Add INDEX one-liner to that effect.

### `docs/wpforms-field-state-inventory.md` (132.5 KB)

- **Already gated.** Multiple "do not full-read" warnings. The gate works.
- The repeated warnings (CLAUDE.md, AGENTS.md, INDEX.md, current-workflow.md, wpforms-video/SKILL.md) are belt-and-suspenders; one canonical statement in the skill is enough.

### `docs/snapshot-health-report.md` (452 lines, 21.4 KB)

- Created 2026-04-27, scoped to snapshot QA at that point. Most rows are dated and may be stale.
- INDEX entry says "hand-written; not regenerated by tooling."
- **Recommendation:** verify currency or archive.

### `docs/transitions.md` (31 lines, 1.3 KB)

- **Tiny.** Contains the surface-mode list and a flipBridge bullet list. Both are restated in `wpforms-transitions/SKILL.md`. **Recommendation:** delete; point INDEX at the skill.

### `docs/camera-poses.md` (24 lines, 910 B), `docs/shared-scene.md` (24 lines, 759 B), `docs/skills.md` (23 lines, 1.1 KB), `docs/text-kit.md` (1.3 KB)

- **All under 50 lines or 1.5 KB.** Either inline into the parent skill or accept they're stub pointers.
- `docs/skills.md` (23 lines) is essentially a list of available skills. Already covered in `CLAUDE.md:7-11` and `INDEX.md` table-of-contents. **Delete candidate.**
- `docs/camera-poses.md` is a 24-line pointer with the same example that's already in `wpforms-transitions/SKILL.md:84-89`. **Delete candidate.**

### `docs/current-workflow.md` (84 lines, 4.3 KB)

- Self-titled "thin pointer doc." Says (lines 5-6): "**This is a thin pointer doc.** The canonical workflow lives in the `wpforms-video` skill."
- But it then re-lists the workflow loop, protected core, per-video files, and token discipline (lines 28-80) — restating in summary form what the skill says in full.
- **References `CONTINUE.md` (line 78) — file does not exist.**
- **References `docs/stage-4-core-api-plan.md` (line 79) — file does not exist.**
- **Recommendation:** delete; merge "Where to read what" table into INDEX.md if needed.

### `docs/editorial-direction-audit-2026-05-10.md` (234 lines, 21.8 KB)

- The Phase 5c master plan. Active work doc; keep.
- **Stale**: line 213-215 mentions moving `videos/wpforms-ai-zlyvs/` to `videos/_archive/wpforms-ai-zlyvs/` with a `WHY-ARCHIVED.md` — **the move has not happened.** The original folder still exists at `videos/wpforms-ai-zlyvs/`, no `_archive` folder.

### `docs/codex-prompts/*` (gitignored)

- Two files: `phase-2-skill-installs.md` (12 KB) and `phase-5g-rest-api-polish-diff.md` (6.9 KB). Per scope they're not auto-loaded.
- **Phase-2 prompt restates context that is already in `editorial-direction-audit-2026-05-10.md`** — by design (briefs are self-contained for Codex).
- No action needed.

## Redundancy clusters

### Cluster 1: `CLAUDE.md` ⇆ `AGENTS.md` (~138 lines × 2 = ~276 lines)

- The two files are functionally identical (`Compare-Object` reports them identical when normalized; `git diff` shows a single one-line difference). Both are loaded each session as operator manuals.
- **Recommendation:** keep `CLAUDE.md`; turn `AGENTS.md` into a single line: `See CLAUDE.md.` This is what `AGENTS.md` *was* per `INDEX.md:114` ("Pointer to `CLAUDE.md` (single source of truth)") — but the current `AGENTS.md` is the full duplicate.
- **Token saving:** ~138 lines per Codex session.

### Cluster 2: GSAP L0 rules (~1100 lines across 3 files)

- `wpforms-gsap-rules/SKILL.md:14-90` (the seven rules)
- `docs/gsap-rules.md` (406 lines — the seven rules expanded with code samples)
- `docs/postintro-patterns.md:106-122` (mentions L0 in passing)
- **Recommendation:** the skill is canonical. Move per-rule audit-notes (~30 lines unique) into `docs/gsap-audit-notes.md` or inline into the skill. Delete the rest of `docs/gsap-rules.md`.
- **Token saving:** ~370 lines whenever an agent reaches for `docs/gsap-rules.md`.

### Cluster 3: Surface-modes (~80 lines × 4 files)

- `wpforms-marketing/SKILL.md:16-43`
- `wpforms-transitions/SKILL.md:66-78`
- `docs/transitions.md:7-16`
- `docs/stage-css.md:25-33`
- **Recommendation:** keep canonical in `wpforms-transitions` (the surface-mode skill). Marketing's surface-mode block can shrink to a one-line cross-ref. Delete `docs/transitions.md` (now redundant at 31 lines). Keep stage-css's z-stack table (it has unique value).
- **Token saving:** ~50 lines × redundant load count.

### Cluster 4: PostIntro multi-animation rule (~40 lines × 2 files)

- `wpforms-postintro/SKILL.md:12-22` (HARD-GATE)
- `docs/postintro-patterns.md:34-61` (same rule re-stated)
- **Recommendation:** skill is canonical. Compress `postintro-patterns.md` to a "history + canonical references" doc. Delete the rule statement.

### Cluster 5: Camera-pose registration example (~10 lines × 3 files)

- `wpforms-transitions/SKILL.md:84-89`
- `docs/camera-poses.md:5-10`
- `docs/camera-lensing.md:58-60`
- **Recommendation:** delete `docs/camera-poses.md` entirely (24 lines, all redundant). Keep the example in the skill.

### Cluster 6: Protected-core list (~25 lines × 5 files)

- `CLAUDE.md:34-50` (Strict + Edit-with-a-plan tiers)
- `AGENTS.md:34-50` (identical duplicate per Cluster 1)
- `wpforms-video/SKILL.md:176` (push-back triggers list)
- `docs/current-workflow.md:46-54`
- `README.md:206-219`
- **Recommendation:** canonical in `CLAUDE.md`. Skill push-back can compress to "see CLAUDE.md protected list." Delete from `current-workflow.md` (whole doc going away). README list is fine — it's the public-facing doc.

### Cluster 7: Determinism rules (~25 lines × 4 files)

- `wpforms-gsap-rules/SKILL.md:201-210`
- `CLAUDE.md:69-77`
- `README.md:190-201`
- `docs/deterministic-logic.md` (32 lines)
- **Recommendation:** the skill is canonical. CLAUDE.md and README each can shrink to a one-line "determinism enforced; see skill." Keep `deterministic-logic.md` if it has rationale not in the skill (sample shows it does — keep but trim).

## Stale references

| File | Line | Stale reference | What's there |
|---|---|---|---|
| `docs/INDEX.md` | 53 | `editorial-track-uplift-plan.md` | **Does not exist** |
| `docs/INDEX.md` | 54 | `editorial-reference-motion-spec.md` | **Does not exist** |
| `docs/INDEX.md` | 55 | `motion-choreography-catalog.md` | **Does not exist** |
| `docs/INDEX.md` | 56 | `wpforms-interaction-state-recipes.md` | **Does not exist** |
| `docs/INDEX.md` | 57 | `wpforms-ai-board-lessons.md` | **Does not exist** |
| `docs/INDEX.md` | 84 | `system-issues-2026-05-09-animation-quality-postmortem.md` | **Does not exist** |
| `docs/INDEX.md` | 85 | `core-system-audit-findings.md` | **Does not exist** |
| `docs/INDEX.md` | 86 | `full-system-audit-2026-05-09.md` | **Does not exist** |
| `docs/INDEX.md` | 87 | `implementation-prompt-core-factors-FULL.md` | **Does not exist** |
| `docs/INDEX.md` | 88 | `implementation-prompt-core-factors-phase-1.md` | **Does not exist** |
| `docs/INDEX.md` | 107 | `style-guide.md` | Path is wrong; file is `style guide.md` (with space) at repo root |
| `docs/INDEX.md` | 108 | `analysis-quality-and-transitions.md` | **Does not exist** (referenced from `wpforms-video/SKILL.md:35` too — see below) |
| `docs/INDEX.md` | 109 | `future-enhancements.md` | **Does not exist** |
| `wpforms-video/SKILL.md` | 35 | `analysis-quality-and-transitions.md` §1 | **Does not exist** |
| `wpforms-transitions/SKILL.md` | 174 | `tools/qc-out/a-complete-guide-to-the-checkboxes-field/FINDINGS.md` | **Does not exist**; only `form-entries-guide/FINDINGS.md` exists |
| `docs/current-workflow.md` | 78 | `CONTINUE.md` | **Does not exist** |
| `docs/current-workflow.md` | 79 | `docs/stage-4-core-api-plan.md` | **Does not exist** |
| `docs/repo-architecture-audit-hyperframes.md` | 14 | `docs/hyperframes-system-analysis.md` | **Does not exist** |
| `CLAUDE.md` | 35 (Edit-with-a-plan tier reference) | `docs/full-system-audit-2026-05-09.md` | **Does not exist** (mentioned implicitly via "the orchestrator merge work all live here per `docs/full-system-audit-2026-05-09.md`") |
| `docs/editorial-direction-audit-2026-05-10.md` | 213-215 | Plan to move `videos/wpforms-ai-zlyvs/` to `_archive/` | Move never executed; folder still at original path |
| `docs/repo-architecture-audit-hyperframes.md` | 19 | "0 errors, 123 warnings, 30 info" | Current is 0/56 (`deterministic-logic-findings.md:9`) — mismatched validator vs determinism counts but figure is dated |

**Approximately 14 broken references in `INDEX.md` alone.** That doc is the canonical map and currently misleads agents who try to load any of the listed-but-missing doc files.

## Trigger conflict map

| Skills that overlap | Prompts that hit both | Disambiguation |
|---|---|---|
| `wpforms-gsap-rules` ↔ `gsap-scrolltrigger` (ext) | "fix the gsap timeline", "this animation isn't playing" | gsap-scrolltrigger is generic & redundant — uninstall. |
| `wpforms-gsap-rules` ↔ `emil-design-eng` (ext) | "review this animation" | emil triggers on "animation decisions" broadly. Disable emil's trigger. |
| `wpforms-gsap-rules` ↔ `design-motion-principles` (ext) | "review my motion code" | wpforms-gsap-rules is correctness rules; design-motion-principles is designer-philosophy critique. Tighten emil/design's descriptions to non-WPForms surfaces. |
| `wpforms-motion-audit` ↔ `design-motion-principles` (ext) | "audit my motion", "score this animation" | wpforms-motion-audit has the calibrated known-case table for THIS repo. Have it run first when path matches `videos/`, `runtime/cinematic-*`, or `reference/html-templates/`. Keep design-motion-principles for non-wpforms surfaces. |
| `wpforms-motion-audit` ↔ `emil-design-eng` ↔ `impeccable` | "review the polish on this UI" | All three claim UI critique. Only `wpforms-motion-audit` is calibrated. Disable triggers on the other two. |
| `wpforms-marketing` ↔ `impeccable` | "design a hero section", "polish this layout" | impeccable is a generic frontend-design skill; not wpforms-tuned. Disable trigger. |
| `wpforms-transitions` ↔ `wpforms-gsap-rules` on `pausableRaf` | "how do I keep my RAF loop scrubbable" | Both skills mention `pausableRaf`. wpforms-gsap-rules owns it (it's a kit primitive); transitions cross-references it. Already documented as cross-cut — fine. |
| `wpforms-marketing` ↔ `wpforms-postintro` | "build a hybrid postIntro with marketing chrome" | Both have legitimate claim. Each cross-references the other. Acceptable. |
| `wpforms-video` ↔ `wpforms-postintro` | "I want to start a new video that's mostly postIntro" | wpforms-video is the universal entry. Documented routing already steers to postintro. Acceptable. |
| `remotion-best-practices` (ext) ↔ everything | any "video" mention | This repo doesn't use Remotion. Disable trigger. |

## Ranked-impact proposal list

| # | Proposal | Token-reduction estimate (per Codex/Claude session) | Risk | Files touched | Description |
|---|---|---:|---|---|---|
| 1 | **Make `AGENTS.md` a one-line pointer to `CLAUDE.md`.** | ~138 lines / ~7 KB per Codex session | Very low | `AGENTS.md` only | Restore `AGENTS.md` to its INDEX-described shape ("Pointer to CLAUDE.md"). Eliminate exact duplication. |
| 2 | **Disable trigger on `gsap-scrolltrigger` (ext) — or uninstall.** | ~17.6 KB skill body + ~25 KB references on each accidental trigger | Very low | `skills-lock.json` or trigger-disable mechanism | Codex's own Phase 2 report concludes it adds nothing. |
| 3 | **Disable trigger on `impeccable` (ext) — or uninstall.** | ~14 KB SKILL.md + up to ~280 KB references on accidental trigger | Low | settings | Trigger surface is too broad; skill is non-functional in this repo (placeholders, missing PRODUCT.md). |
| 4 | **Disable trigger on `remotion-best-practices` (ext).** | ~9.8 KB SKILL.md + ~85 KB rules tree on accidental trigger | Very low | settings | Repo has zero Remotion. Codex installed it as reference-only. |
| 5 | **Disable trigger on `emil-design-eng` (ext).** | ~27.4 KB SKILL.md on accidental trigger | Very low | settings | 679 lines / wastes-a-turn initial gate. Keep installed for explicit invocation. |
| 6 | **Fix every broken reference in `docs/INDEX.md`.** | ~70 lines of false leads | Very low | `docs/INDEX.md` | 14 entries point at non-existent files. Either restore the docs or remove the entries. The `style guide.md` path needs the space. |
| 7 | **Delete `docs/gsap-rules.md` (406 lines), keep ~30 lines of unique audit-notes as `docs/gsap-audit-notes.md`.** | ~370 lines / ~15 KB whenever loaded | Low | `docs/gsap-rules.md`, `docs/INDEX.md`, `wpforms-gsap-rules/SKILL.md:229` (reference link) | Rule statements duplicate the skill. |
| 8 | **Delete `docs/transitions.md` (31 lines), `docs/camera-poses.md` (24 lines), `docs/shared-scene.md` (24 lines), `docs/skills.md` (23 lines), `docs/current-workflow.md` (84 lines).** | ~190 lines | Low | 5 docs + INDEX | Each is fully superseded by a skill. Delete & update INDEX. |
| 9 | **Delete `wpforms-motion-audit/references/criteria-tiers.md` and `wpforms-motion-audit/references/score-examples.md` (self-flagged "legacy").** | ~2 KB | Very low | 2 reference files + SKILL.md `Reference files (load on demand)` block | Already labeled redundant inline. |
| 10 | **Compress `docs/postintro-patterns.md` from 264 to ~80 lines.** Keep canonical references and history; delete rule statements (multi-animation rule, build order, snapshot handoff) — those are in the skill. | ~180 lines per load | Low | `docs/postintro-patterns.md` | Skill HARD-GATE is the canonical location. |
| 11 | **Trim CLAUDE.md determinism block to one line + a pointer.** | ~10 lines per session (CLAUDE.md is always loaded) | Very low | `CLAUDE.md` | Always-loaded file should be sparse; rules belong in the skill. |
| 12 | **Re-scope `design-motion-principles` STEP 1 user-confirmation gate** (or keep but flag in onboarding). | Recovers 1 turn per audit | Medium (the gate is the skill's deliberate UX) | The external skill — would mean either upstream patch or fork | The Wait-for-Confirmation gate stops autonomous flow. |

## Specifically: installed external skills

| Skill | Recommendation | Reasoning |
|---|---|---|
| `design-motion-principles` (kylezantos) | **Keep installed; tighten trigger surface.** | This was *the* skill Phase 2 wanted (`editorial-direction-audit-2026-05-10.md:42-43`). The Emil/Krehel/Tompkins-named lens is the most relevant generic motion lens. Use it for non-wpforms motion review. STEP 1 confirmation gate is its main downside. |
| `emil-design-eng` (emilkowalski) | **Disable auto-trigger; keep for explicit `/emil` invocation.** | Per `editorial-direction-audit-2026-05-10.md:48` ("opaque content … cheap to try"). Now installed and we know it's 679 lines with a wasteful initial-response gate. |
| `gsap-scrolltrigger` (freshtechbro) | **Uninstall** (or disable trigger). | Per `phase-2-skill-installs-report-2026-05-10.md:21-27`, Codex's own diff against `wpforms-gsap-rules` concluded this skill adds nothing. |
| `impeccable` (pbakaus) | **Uninstall.** | Non-functional plumbing in this repo (`{{scripts_path}}` etc never substituted; demands missing `PRODUCT.md`); broadest trigger surface; ~280 KB reference tree. The original install reasoning ("`/animate` command is cheap to try") has been tried; verdict per the `editorial-direction-audit` was "cheap to try", and now we have data. |
| `remotion-best-practices` (remotion-dev) | **Disable auto-trigger; keep installed.** | Per `editorial-direction-audit-2026-05-10.md:120-123` and `phase-2-skill-installs-report-2026-05-10.md:11`, this was "structural reference only," not a code-authoring skill. Repo has zero Remotion code. |

## Open questions for Umair

1. **`AGENTS.md` policy.** It's currently a full duplicate of `CLAUDE.md`. INDEX says it's a "pointer." Did Codex regenerate it as a duplicate accidentally? Confirm the intended shape (single-line pointer vs. duplicate).
2. **`videos/wpforms-ai-zlyvs/` archive.** `editorial-direction-audit-2026-05-10.md:213-215` decided to archive. Move never happened. Is the archive still planned? `wpforms-motion-audit/SKILL.md:18` still references the original path as the F-tier example.
3. **`docs/INDEX.md` broken-reference fixes.** Are the missing docs (`editorial-track-uplift-plan.md`, `motion-choreography-catalog.md`, `wpforms-interaction-state-recipes.md`, etc.) intentionally deleted (so we should remove from INDEX) or were they migrated elsewhere (so we should update the pointer)?
4. **Disable trigger vs. uninstall for external skills.** Disable-trigger requires a settings.json hook surface that I'm not certain exists in this Claude Code build. If only "uninstall" is binary-clean, do you want to uninstall (`gsap-scrolltrigger`, `impeccable`, `remotion-best-practices`) outright and re-install from `skills-lock.json` if needed?
5. **Determinism counts.** `repo-architecture-audit-hyperframes.md:19` says "73 warnings"; `deterministic-logic-findings.md:9` says "56." Update one to match, or accept the doc is dated 2026-05-09 and counts have moved.
6. **`.claude/skills/wpforms-motion-audit/references/`** has two files self-labeled "legacy, also in this file" (lines 62-63 of the SKILL.md). OK to delete?

## Risk inventory

- **Risk 1: deleting `docs/gsap-rules.md` breaks an inbound link.** Mitigation: search for `gsap-rules.md` references first. The skill body and INDEX already point at the skill, but `wpforms-gsap-rules/SKILL.md:229` references it ("Canonical L0 rule reference with full examples and audit notes. Read for the deepest rationale."). Update the cross-ref before deleting.
- **Risk 2: trimming `AGENTS.md` to a pointer breaks Codex.** Mitigation: confirm Codex tooling reads `AGENTS.md` content directly rather than relying on it being identical to `CLAUDE.md`. If Codex has tooling that auto-syncs, the duplication may be intentional and the audit recommendation should change to "let the tool do it."
- **Risk 3: disabling external-skill triggers degrades audit quality.** Mitigation: `wpforms-motion-audit` is the calibrated audit lens; `design-motion-principles` is the next-best generic lens. Both stay. The disabled ones (`gsap-scrolltrigger`, `impeccable`, `emil-design-eng`, `remotion-best-practices`) are duplicative or misfit.
- **Risk 4: shrinking `docs/postintro-patterns.md` loses canonical-reference catalog.** Mitigation: keep the canonical-references section (the three reference cinematics) and the historical context — only delete the rule statements that the skill HARD-GATEs already cover.
- **Risk 5: `videos/wpforms-ai-zlyvs/` stays put** while `wpforms-motion-audit` cites it as a path-keyed F-tier example. If it gets archived/renamed, the skill's known-case table breaks. Mitigation: align the archive decision with a one-line skill update at the same time.
- **Risk 6: deleting tiny docs (`shared-scene.md`, `camera-poses.md`, `skills.md`)** removes targets that some out-of-tree code or copy-paste snippet might reference. Mitigation: grep first; if the only refs are from skills you're already updating, safe to delete.
