---
name: wpforms-motion-audit
description: "Use BEFORE declaring any postIntro, cinematic, or editorial beat done — HARD GATE producing a tier rating (S/A/B/C/D/F) that file-read of the rubric does NOT produce. Run on v1, after major restructures, and at final handoff. Don't defer to 'I'll audit at handoff' — that path cost 10+ iteration rounds. Triggers: audit my motion, score this, is this good, rate this, v1 ready, before sign-off, postIntro complete, cinematic done, editorial done. Invoke via Skill tool, not file-read."
---

# WPForms Motion Audit

## ⛔ HARD GATE — must invoke before any postIntro / cinematic / editorial sign-off

**This skill is a non-bypassable gate. Reading this file is NOT the same as invoking the skill. Use the Skill tool (`/wpforms-motion-audit` or programmatic invocation) to actually run the audit.**

Sign-off criteria for any postIntro, cinematic beat, or editorial chapter:
- Motion-audit invocation logged
- Tier rating recorded (S / A / B / C / D / F)
- Hard-rule violations either fixed OR explicitly overridden by the user
- Tier A or higher is the merge bar; B or below requires fix or override

**Run on v1 builds, not just final handoff.** Both the Klaviyo tutorial v11 session and the editorial session (2026-05-12) skipped running motion-audit on their v1 builds. The editorial session's own retro: "should have run it on the v1 build before showing you — would've caught the failures." Iterating against the user's eyes for 12 rounds is 11 rounds more expensive than running the audit on v1, getting the tier, and iterating against the rubric.

Invocation cadence:
- v1 build complete (before showing to user) → invoke + record tier
- After any major restructure (PostIntro morph chain rewritten, camera arc changed) → invoke + record tier
- Final handoff → invoke + record tier (mandatory, the "gate")

The Klaviyo tutorial v11 shipped to QC after 12 postIntro iterations WITHOUT ever invoking this skill. That's the failure mode this gate exists to prevent. Reading wpforms-motion-audit/SKILL.md inline ≠ running the audit.

## Overview

Score a WPForms video animation, camera move, postIntro, cinematic beat, or editorial chapter on an S-F tier. Output a concrete score with file:line evidence and tier-climbing fixes.

## HARD RULE 1: Calibration check (do this FIRST, before any scoring)

If the file being audited matches one of these **known cases**, you MUST use the score below. Do not re-derive. These scores are calibrated against actual reviewer judgments.

| Known case | Score | Why |
|---|---|---|
| Virtual-board film | **B** | Virtual-board with real iframe DOM puppetry; CSS injection works; cinematic-flight pattern present; final score capped 6/10 after 4 rebuild rounds. Cursor frenzy and zoom-undershoot issues. |
| Identity-continuity morph film | **S** | Identity-continuity `#cta` morph Button → Input → Sullie pill → Chat over 12s; parallel motion tracks. |
| 36s linear-scene editorial rebuild | **A** | 36s OpenAI Layo rebuild; 13 beats with named atmospheres + transitions; multi-phase camera moves. |
| First-try single-HTML proof | **A** | First-try single-HTML proof; mimicked ssstwitter contact sheet; vendored GSAP. |

If the film you're scoring is in this table, **state the tier verbatim and skip to the "Why" + fix section**. Do not re-evaluate criteria.

**Species-2 calibration (U1 ruling 2026-09-03):** a species-2 *illustrated-montage* postIntro (see `wpforms-postintro` "Species 2") is scored on ambient density, composition thresholds, scene-cut hygiene, and stakes-last — the absence of a morph-chain or cursor is NOT a deduction for that species.

**Historical calibration (files deleted 2026-08-22 — cannot be path-matched; kept only for the tier LANGUAGE each one anchors):**

- Early AI editorial film — **F**: 4-tween-everything-changes camera; 5-layer atmosphere stacked; no identity continuity. The "slide projector" anchor for tier F.
- AI announcement film — **D**: editorial chrome painted OVER the real iframe (overlay panels as iframe siblings, not injected into iframe DOM); fake mosaic cards; purple as primary. The anchor for the sibling-overlay and purple-primary ceilings.
- Engine-era AI form-builder chapter — **A**: multi-phase choreography; clean iframe DOM puppetry via CSS injection + stage-position projection. The anchor for an A-tier product beat (engine era).
- Engine-era REST API overview polish — **A**: persistent Three.js shared-scene; multi-chapter camera choreography. The anchor for an A-tier polish pass (engine era).

## HARD RULE 2: Tier criteria (apply only if not in known-case table)

> **Blended counts as decomposed (2026-09-02, AP-4).** A single tween carrying
> two overlapped curves — e.g. `flyToElement`'s dip via `zoomKeyframes`, where
> zoom and translation ride different eases inside ONE tween — COUNTS as a
> multi-phase / decomposed camera move here and in HARD RULE 3. The
> "single-tween" ceilings target a constant-ease translate+scale between fixed
> poses with no scale arc, not a blended arc.

| Tier | Camera (count and rule out failures) | Easing | Atmosphere | Identity continuity | Zoom level |
|---|---|---|---|---|---|
| **S** | Multi-phase decomposed: anticipation (0.10-0.20s pre-nudge) → flight w/ scale-dip (peak ≤ 0.95× target) → land → micro-zoom (≥ 0.4s after land) — **for slow, considered moves only.** On a move under ~0.5s or any click-triggered move the pre-nudge reads as a lurch and an overshooting land ease as a bounce: there `glide` (one blended arc) or `snap` (launch on the click frame — the click IS the anticipation) IS the S-tier shape. A dive moves one way only; a push followed by an animated retreat is a yo-yo — cut instead (`yjc` 6–8, 2026-09-04: applying this row to every move made the best film worse) | CustomEase per phase, named | Swap per beat | One element morphs across beats (identity continuity contract per `docs/storyboard-format-morph-chain-2026-05-10.md`) | Inputs 3.0+, buttons 3.2+, cards 2.8+ |
| **A** | 3+ phases visible in timeline | At least 1 named CustomEase | Swap optional but visible variation | Visible scale arc | Close to S thresholds |
| **B** | 2-phase, OR a single-HTML tutorial beat with proper cursor + zoom (`Cursor` + `flyToElement`) | Stock easing acceptable | No swap acceptable | Lands → 1s hold → zoom | Content-appropriate |
| **C** | Single-tween translate+scale | Stock easing | None | Per-beat states only | Anything |
| **D** | Translate-only OR scale-only | None visible | None | None; OR overlay chrome painted over real iframe | Anything |
| **F** | "Literal swipe like phone images" — single tween, no scale arc, no rotation, no anticipation. OR: 4-tween-everything-changes camera. OR: 5+ stacked atmosphere layers per beat. | Linear or one bezier | Stacked layers or none | None | Often too low (1.5-2.0 for inputs) |

## HARD RULE 3: Automatic-ceiling triggers

These conditions **cap the maximum score regardless of other criteria**:

- Sequential 4+ tweens where every value changes per tween → maximum **C**
- 5+ atmosphere layers stacked simultaneously → maximum **D**
- Editorial overlay panels (e.g., status pill, plan checklist, comment modal) painted as siblings outside the iframe rather than injected into iframe DOM → maximum **D**
- Purple as **primary brand** color (vs. AI-feature accent) → maximum **D**
- 12+ beats packed into ≤45s without identity continuity → maximum **C**
- Single-tween translate+scale between fixed poses with no scale arc → maximum **C**
- Cursor frenzy via motion-path single via point with `via.y = Math.min(fromY, toY) - 40` (overshoots target) → maximum **C**
- **Ad-style density floor (fa-retest calibration, 2026-07-13):** an ad-style piece ≥25s using **fewer than 3 distinct motion-vocabulary items** (effects-library mounts, text-kit presets, real-DOM choreography sequences, camera arcs — count kinds, not instances) → maximum **C**. Rationale: the rubric scored a one-effect-plus-fades ad an A while the reviewer scored it 4/10 ("too basic, where did my motion graphics go") — rule-compliance without density is not an ad. Also verify the mechanical premium checklist before sign-off: no off-center/overlapping text (probe computed positions), real UI fills the frame when captures exist, BGM audible in the mux (`ffmpeg -af astats` — mix RMS better than ≈−30dB), SFX semantic not generic.
- **Mockup product UI when a real capture exists** for the feature being advertised → maximum **C** (real-UI-not-mockups rule, wpforms-marketing HARD RULE §2)
- **Camera off its own plan (first WPVibe ad calibration, 2026-09-03/04):** an ad-style or shorts piece whose storyboard has no `## Camera plan` declaring `Cadence:` / `Max hold:` / `Ease voice:`, OR whose measured landings miss the declared cadence (`composition-scan --play` verdict FAIL or UNDECLARED), OR with any hold longer than the declared max → maximum **B**. Measure it, don't estimate it. Both directions fail: the parked v5 (5 framings in 44s, a 23.7s hold — this rubric scored it A with "no camera flights by design"; "by design" is not an exemption) and the busy v6 (25 landings in 41s on a film whose UI never changes — "making me dizzy"). Cadence is the storyboard's creative call per film; the audit checks that the film honoured it and that the ease voice is the declared one.
- **Re-invented primitive when a canonical exists in `videos/_shared/motion-primitives.js`** (hand-written cursor mount/glide when `Cursor` class exists, hand-written 5-phase camera when `cinematicFlight` / `figjamFlight` / `focusStationOverview` exist, hand-written letter-stagger when `caretType` exists, hand-written status-pill morph or marker-sweep when those primitives exist, hand-written field-stagger when `fieldStaggerReveal` exists, hand-written Sullie mount when `mountSullieBug` exists, hand-written exit-with-blur when `cleanFastRejoin` exists) → maximum **B** (loses style points for not using the approved primitive — the primitives codify the shipped fix for the bug that hand-rolled versions keep re-introducing)

## Phase 1: Calibration check

Is the file in the HARD RULE 1 table? **Yes → use that score, skip to "Why" section.**

## Phase 2: Score (only if Phase 1 didn't match)

Read the subject code. Apply HARD RULES 2 and 3. Cite specific line numbers.

Reference files (load on demand for deeper context):
- `references/wpforms-anti-patterns.md` — 5 anti-patterns with citations
- `references/criteria-tiers.md` — same table as HARD RULE 2 (legacy, also in this file)
- `references/score-examples.md` — same table as HARD RULE 1 (legacy, also in this file)

## Phase 3: Prescribe

For any score below A, list the specific fix(es) required to climb tiers. Cite the relevant tier criteria.
## Output format (mandatory shape)

```md
## Motion Audit

**Subject:** [file:lines being audited]
**Tier:** [S / A / B / C / D / F]
**Calibration source:** [known-case table | derived from HARD RULES 2-3]
**One-line verdict:** [reason in <15 words]

### What it does well
- [bullet]

### What's missing or broken
- [bullet] — fix: [specific change, citing tier criteria or hard rule]

### To climb to [next tier]
- [specific change with file:line]```

## Self-check before delivering the audit

Before responding to the user:

1. Did I check the HARD RULE 1 known-case table? If the file matches, did I use the listed score verbatim?
2. Did I check HARD RULE 3 automatic-ceiling triggers? If any apply, is my score at or below the ceiling?
3. Is the **Calibration source** field filled (either "known-case table" or "derived from HARD RULES 2-3")?

If any of these fail, redo the audit before responding.
