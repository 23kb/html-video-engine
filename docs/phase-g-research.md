# Phase G — Research + Proposal

**Status:** Research complete. Awaiting Umair's direction on scope before drafting Codex prompt.

---

## 1. Important correction on Hyperframes skill size

Earlier framing assumed Hyperframes skills are "11-12 lines each." That's wrong. **Those 11-12 lines are the YAML frontmatter `description` field** — the trigger text the harness shows when listing available skills. The actual `SKILL.md` body is much larger:

- `~/.claude/skills/hyperframes/SKILL.md` = **347 lines** + 5 sub-files in `references/` + 2 in root (`house-style.md` 4.5K, `visual-styles.md` 9.9K) + `palettes/` + `scripts/`. Total skill bundle ~50 KB.
- Our wpforms skills = **41-51 lines each**, all pointer-only (links to `docs/` files).

Net: **our skills are too thin, not too fat.** They force agents to chain-read 4-6 doc files to get the actual content. Hyperframes' SKILL.md is the canonical surface for that topic; agents read one file and have rules + examples + patterns in context.

This flips Phase G's direction. The right move is **skill enrichment**, not slim-down.

---

## 2. What Hyperframes' SKILL.md actually contains (the pattern to learn)

Reading `~/.claude/skills/hyperframes/SKILL.md` end-to-end:

| Section | Lines | What |
|---|---|---|
| YAML frontmatter | 4 | `name`, `description` with explicit "Use when..." triggers listing specific cases |
| Approach | 8 | High-level thinking checklist (what / structure / timing / layout / animate) |
| Visual Identity Gate | 17 | `<HARD-GATE>` markup; required prerequisite check before writing any HTML |
| Layout Before Animation | 56 | Philosophy + step-by-step + WRONG/RIGHT examples |
| Data Attributes | 22 | Reference tables for `data-start`, `data-duration`, etc. |
| Composition Structure | 27 | Sub-composition `<template>` wrapper rules with full code example |
| Video and Audio | 18 | Hard rules + working code example |
| Timeline Contract | 6 | The five paused-timeline registration invariants |
| Rules (Non-Negotiable) | 28 | 11 numbered "Never do" items + rationale |
| Scene Transitions (Non-Negotiable) | 32 | 4 rules + WRONG/RIGHT examples |
| Animation Guardrails | 7 | Defaults, easing variety, sizing minimums |
| Typography and Assets | 5 | Font loading + helper API |
| Editing Existing Compositions | 4 | Process for diffs |
| Output Checklist | 4 | Lint + validate + animation map |
| Quality Checks | 25 | Contrast audit + animation map workflow |
| References (loaded on demand) | 17 | 13 markdown links with one-line "read when X" |

**Pattern:** SKILL.md is the **canonical authoring surface** for that topic. Includes triggers, philosophy, hard gates, contracts, rules, examples, anti-examples, and on-demand references. Not a pointer index.

The trigger description in frontmatter is aggressive about specifying "Use when..." cases — it lists 8+ explicit scenarios so the harness routes correctly:

> Use when asked to build any HTML-based video content, add captions or subtitles synced to audio, generate text-to-speech narration, create audio-reactive animation (beat sync, glow, pulse driven by music), add animated text highlighting (marker sweeps, hand-drawn circles, burst lines, scribble, sketchout), or add transitions between scenes (crossfades, wipes, reveals, shader transitions). Covers composition authoring, timing, media, and the full video production workflow. For CLI commands (init, lint, preview, render, transcribe, tts) see the hyperframes-cli skill.

Ours, for comparison: "Use when authoring or reviewing WPForms tutorial videos from storyboard through playable HTML validation." Three lines vs eight. We're under-triggering.

---

## 3. Audit of current authoring flow

What an agent reads when starting a fresh WPForms video session today:

1. **`tools/skill-context.js` output** — 262 lines on every run. Lists required-read docs, capability kits, default authoring skeletons, on-demand docs, postIntro examples, workflow numbered list, do-not-touch list, etc.
2. **`CLAUDE.md`** — 421 lines. Operator manual: how to start, intake, token discipline, production truth, storyboard gate, default authoring mode, legacy chapter shape, modes (`per-beat-narration`/`parallel`/`audio-cued`), postIntro rules, per-video files, protected areas, tools, validation, push-back triggers.
3. **`docs/authoring-api.md`** — 752 lines. Public authoring contract.
4. **Maybe a wpforms-* skill** if the harness routes there.
5. **Maybe `docs/postintro-patterns.md`, `docs/gsap-rules.md`, etc.** as needed.

Total upfront read: ~1400 lines minimum, before any actual work. Plus on-demand reads.

### Where the bloat is

Concrete duplication:

- **PostIntro rules** appear in: `CLAUDE.md` (lines ~189-210), `wpforms-postintro/SKILL.md` (35 lines), `docs/postintro-patterns.md` (canonical). Three copies, drift risk on every change.
- **Protected core list** appears in: `CLAUDE.md` (lines ~221-237), `REFACTOR-BRIEF.md` §4, `tools/skill-context.js` (Do not touch section). Three copies.
- **GSAP discipline rules** appear in: `CLAUDE.md` (no — actually CLAUDE.md has a brief `docs/gsap-rules.md` reference), `wpforms-gsap-rules/SKILL.md` (6 hard reminders), `docs/gsap-rules.md` (canonical). Two copies plus a link.
- **Storyboard intake / production truth** rules appear in: `CLAUDE.md` (lines ~38-95), `tools/skill-context.js` (Production-truth rules section), `wpforms-video/SKILL.md`. Three places.
- **Default authoring mode** in: `CLAUDE.md` (lines ~123-146), `tools/skill-context.js` (multiple places), `wpforms-video/SKILL.md`. Three places.

**skill-context.js measurement:** running it produces 262 lines of output. Of those:
- ~30 lines are introduction/headers
- ~50 lines are "Required reads" + "Default authoring skeletons"
- ~30 lines are "Shared capability kits"
- ~20 lines are "Operator manual" pointers
- ~80 lines are workflow + production-truth rules + tools (largely duplicated in CLAUDE.md)
- ~50 lines are known video packages list

Estimated 50-60% of skill-context.js output is duplicative or low-value at session start. The package list is the biggest "always present, rarely useful" chunk.

---

## 4. Proposed Phase G scope (recalibrated)

Three deliverables. Each independent.

### G1 — Skill enrichment (canonical surfaces, not pointers)

**Target:** each wpforms-* skill grows from ~45 to ~150-200 lines. Move HIGH-FREQUENCY rules from CLAUDE.md and linked docs INTO the skill body so agents don't chain-read.

Per skill, body sections (mirror Hyperframes structure where relevant):

- **Tight YAML frontmatter description** — 4-6 sentences, list explicit "Use when..." triggers (specific cases, not general purpose).
- **When To Use** — 2-3 lines, plain language.
- **Approach / Hard Gates** — high-level checklist or required prerequisite check (e.g., wpforms-video could include the storyboard-approval gate as a `<HARD-GATE>`).
- **Contracts / Rules** — non-negotiable rules numbered, with brief rationale where useful.
- **Anti-patterns** — WRONG/RIGHT examples for the most common mistakes.
- **Working examples** — 5-10 line code snippets showing canonical shape (manifest skeleton, chapter skeleton, paused-timeline registration, etc.).
- **Output checklist** — what runs before review (validators, smoke).
- **References (loaded on demand)** — links to deep-dive docs with one-line "read this when X."

The skill body becomes the canonical surface for that topic. `docs/<topic>.md` files remain authoritative reference material the skill links to, but the skill body is what agents actually read upfront.

Per-skill notes:

- **`wpforms-video`** — full storyboard gate, intake checklist, default authoring mode comparison (legacy/effect vs descriptor), validation workflow. Canonical entry point.
- **`wpforms-postintro`** — 8-15s + 5+ phases hard rule, multi-animation rule, canonical reference table (which cinematic to read for which pattern), build order with HARD-GATE for "is this concept-specific or default editorial."
- **`wpforms-gsap-rules`** — full L0 rules inline (currently deferred to docs/gsap-rules.md), plus registerTimeline/pausableRaf/effects.js APIs. The doc/gsap-rules.md becomes the historical/expanded reference.
- **`wpforms-marketing`** — surface modes inline with examples, atmospheric kit recipes, when-to-use editorial vs mixed, blocks library highlights.
- **`wpforms-transitions`** — break styles vs swap styles inline, flipBridge contract, camera-pose vocabulary, pause/seek limits, render and preview workflow.

### G2 — CLAUDE.md slim-down (move discipline to skills, keep operator manual)

**Target:** 200-250 lines (from 421).

Keep in CLAUDE.md:
- Boot order ("Start Here" — read order, key files)
- Protected areas list (the do-not-touch contract)
- Validation commands (the regression set + how to run)
- Per-video files allowed list
- Push-back triggers
- "Tools" section (which CLI to use when)

Move OUT of CLAUDE.md (into skills or already-linked docs):
- Default authoring mode discussion → `wpforms-video` skill body
- Legacy chapter shape example → `wpforms-video` skill body
- Modes (per-beat-narration/parallel/audio-cued) detail → `wpforms-video` skill body
- PostIntro rules → `wpforms-postintro` skill body (canonical home)
- Storyboard gate → `wpforms-video` skill HARD-GATE
- Production truth long-form → keep one-line summary, link to `wpforms-video` skill
- Token discipline → keep one-line summary, link to `tools/skill-context.js`

CLAUDE.md becomes: "here's how to boot, here's what's protected, here's how to validate, see the skills for topic-specific rules."

### G3 — `tools/skill-context.js` slim-down + `docs/INDEX.md`

`tools/skill-context.js` slim from 262 lines output to ~100 lines:

Keep:
- One-line repo purpose
- Boot-order pointer (read CLAUDE.md, then relevant skill)
- Required tools list (validate, smoke, snapshots)
- Last-known-good commit pointer (for new sessions to confirm state)
- Phase status (REFACTOR COMPLETE per REFACTOR-DONE.md)

Cut:
- Required reads enumeration (let the harness route via skill triggers)
- Default authoring skeletons enumeration (let `wpforms-video` skill point at them)
- Production-truth rules duplication (lives in `wpforms-video` skill body now)
- Workflow numbered list (lives in `wpforms-video` skill body now)
- Known video packages enumeration (let `git ls-tree HEAD videos/` answer this)

New file `docs/INDEX.md` (~30-50 lines): every doc in `docs/` listed with one-line "read this when X." Replaces having to read skill-context.js to find a doc.

### G4 — Doc dedup pass (manual audit, surgical edits)

For each duplicated rule, pick one canonical home, replace the others with a link. Specific known dupes:

- PostIntro rules: canonical = `wpforms-postintro` skill body. CLAUDE.md keeps one-line summary + link. `docs/postintro-patterns.md` keeps deep dive.
- Protected core: canonical = `CLAUDE.md`. `REFACTOR-BRIEF.md` §4 stays (historical). `tools/skill-context.js` drops the section.
- GSAP rules: canonical = `wpforms-gsap-rules` skill body. `docs/gsap-rules.md` keeps deep dive + history.
- Storyboard intake: canonical = `wpforms-video` skill HARD-GATE. CLAUDE.md keeps one-line.
- Default authoring mode: canonical = `wpforms-video` skill body. CLAUDE.md drops the long version.

### G5 — Trigger description audit

Replace each skill's frontmatter description with explicit "Use when..." trigger conditions following the Hyperframes pattern. Aim for 4-8 specific cases per skill, not one general-purpose sentence.

Example, current vs proposed for `wpforms-video`:

Current:
> Use when authoring or reviewing WPForms tutorial videos from storyboard through playable HTML validation.

Proposed:
> Use when starting a new WPForms video, when intake-ing a topic and storyboarding it, when adding or editing chapters in `videos/<slug>/chapters/`, when wiring narration mp3s, when running `tools/validate-video.js` or `tools/check-video-playback.js`, or when handing off review URLs. Covers intake, storyboard gate, default authoring mode (legacy/effect), modes (per-beat-narration/parallel/audio-cued), validation, and review handoff. For postIntros specifically use `wpforms-postintro`. For transition decisions use `wpforms-transitions`.

This is what makes the harness route correctly.

---

## 5. Out of scope for Phase G

- No core edits.
- No video migrations (the determinism findings backlog is separate work).
- No new validators or tools.
- No new docs beyond `docs/INDEX.md`.
- No skill consolidation (5 skills stay; we enrich each, not merge them).

---

## 6. Acceptance criteria (proposed)

- All 7 regression baselines validate + smoke clean (no behavior change — pure docs/skill work).
- Each enriched skill is self-sufficient: an agent reading only `SKILL.md` for that topic can author the related work without chasing 4-6 docs upfront.
- Each duplicated rule lives in exactly one canonical home; other locations link.
- `CLAUDE.md` ≤ 250 lines.
- `tools/skill-context.js` output ≤ 120 lines.
- `docs/INDEX.md` exists with one-line per doc.
- Manual smoke: open a fresh session, ask agent to start a new video. Confirm it reads `wpforms-video` skill (not 6 separate docs) before proposing storyboard.

---

## 7. Open questions for Umair

1. **Approval on the recalibration.** Phase G is enrichment, not slim-down (except CLAUDE.md and skill-context.js). OK to proceed on this basis?
2. **Codex vs me.** This is half research-y (audit) and half mechanical (edit X files, move Y rules). The mechanical part fits Codex; the editorial calls (which rules go where, which examples to inline) need a human or me. Suggested split: I draft the new SKILL.md bodies + slim CLAUDE.md + index file, Codex applies the dedup pass and drops orphaned sections per a checklist. Or all-Codex with a tighter prompt. Your call.
3. **Skill enrichment depth.** Hyperframes skill is 347 lines + 13 reference files. Ours could go that deep or stop at ~150 lines per skill. Higher = more self-contained but harder to keep current. Suggest ~150-200 lines target.
4. **Does `wpforms-video` need a `<HARD-GATE>` block** for the storyboard-approval gate? Hyperframes uses these for required prerequisites. Useful to enforce "no chapter code before storyboard approval" at the agent level.
5. **`tools/skill-context.js` future.** Keep as a slim startup dump, or replace entirely with `docs/INDEX.md` + skill-routing? My lean: keep it slim, it's a useful "where am I" check.

---

## 8. Recommendation

Proceed on the proposal above with these adjustments based on your answers:

1. If you approve recalibration → I draft the new skill bodies + CLAUDE.md slim + INDEX.md myself in a single PR. Codex doesn't need to touch this — the work is editorial, not implementation.
2. If you'd rather Codex do it → I write a precise prompt with each skill's target outline, the dedup checklist, and the exact CLAUDE.md sections to move where. Codex applies mechanically. Risk: editorial calls become arbitrary.
3. Either way, the deliverables are the same.

If green-light, I start with `wpforms-video` as the pilot skill (richest, highest-traffic), iterate, then apply the pattern to the other four.
