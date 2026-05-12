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

| File pattern | Score | Why |
|---|---|---|
| `videos/wpforms-ai-zlyvs/` (any file under this dir) | **F** | 4-tween-everything-changes camera at `index.html:649-832`; 5-layer atmosphere stacked `index.html:71-102`; no identity continuity. |
| `videos/wpforms-ai-announcement/` (any file under this dir) | **D** | Anthropic chrome painted OVER real iframe (overlay panels as iframe siblings, not injected into iframe DOM); fake mosaic cards at `index.html:725-757`; purple as primary at `index.html:52-58`. |
| `videos/wpforms-ai-board/` (any file under this dir) | **B** | Virtual-board with real iframe DOM puppetry; CSS injection works; cinematic-flight pattern present; final score capped 6/10 after 4 rebuild rounds. Cursor frenzy and zoom-undershoot issues per `LESSONS.md`. |
| `reference/html-templates/wpforms-ai-prompt-open.html` | **S** | Identity-continuity `#cta` morph Button → Input → Sullie pill → Chat over 12s (see comment at line 152); parallel motion tracks. |
| `reference/html-templates/editorial-reference-36s.html` | **A** | 36s OpenAI Layo rebuild; 13 beats with named atmospheres + transitions; multi-phase camera moves. |
| `reference/html-templates/openai-replica-18s.html` | **A** | First-try single-HTML proof; mimicked ssstwitter contact sheet; vendored GSAP. |
| `videos/build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js` | **A** | Engine-using winner; multi-phase choreography; clean iframe DOM puppetry via CSS injection + getElStagePos. Per Agent B's winning-pattern analysis. |
| `videos/wpforms-rest-api-overview-polished/` (any file under this dir) | **A** | Engine-using winner; persistent Three.js shared-scene; multi-chapter camera choreography. |

If the path you're scoring is in this table, **state the tier verbatim and skip to the "Why" + fix section**. Do not re-evaluate criteria.

## HARD RULE 2: Tier criteria (apply only if not in known-case table)

| Tier | Camera (count and rule out failures) | Easing | Atmosphere | Identity continuity | Zoom level |
|---|---|---|---|---|---|
| **S** | Multi-phase decomposed: anticipation (0.10-0.20s pre-nudge) → flight w/ scale-dip (peak ≤ 0.95× target) → land → micro-zoom (≥ 0.4s after land) | CustomEase per phase, named | Swap per beat | One element morphs across beats (identity continuity contract per `docs/storyboard-format-morph-chain-2026-05-10.md`) | Inputs 3.0+, buttons 3.2+, cards 2.8+ |
| **A** | 3+ phases visible in timeline | At least 1 named CustomEase | Swap optional but visible variation | Visible scale arc | Close to S thresholds |
| **B** | 2-phase, OR engine-using-tutorial with proper cursor + zoom | Stock easing acceptable | No swap acceptable | Lands → 1s hold → zoom (per `videos/wpforms-ai-board/LESSONS.md`) | Content-appropriate |
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

For any score below A, list the specific fix(es) required to climb tiers. Cite the relevant tier criteria. Point to canonical-correct examples at `reference/html-templates/`.

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
- [specific change with file:line]
- [reference: where this is done correctly in reference/html-templates/]
```

## Self-check before delivering the audit

Before responding to the user:

1. Did I check the HARD RULE 1 known-case table? If the file matches, did I use the listed score verbatim?
2. Did I check HARD RULE 3 automatic-ceiling triggers? If any apply, is my score at or below the ceiling?
3. Is the **Calibration source** field filled (either "known-case table" or "derived from HARD RULES 2-3")?

If any of these fail, redo the audit before responding.
