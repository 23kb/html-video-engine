---
name: wpforms-motion-audit
description: Score animations and camera moves S-F tier and prescribe fixes. Triggers on "audit my motion", "score this animation", "is my camera move good", "rate this", or proactively before any postIntro / cinematic / editorial chapter handoff. WPForms-specific criteria backed by 3 winning + 3 failed video case studies.
---

# WPForms Motion Audit

## Overview

Use this skill to judge whether a WPForms video animation, camera move, postIntro, cinematic beat, or editorial chapter is good enough to hand off. It scores motion on an S-F tier, explains the score with concrete file:line evidence, and prescribes the smallest code changes needed to climb tiers.

## Phase 1: Load references

Before scoring, read:

- `references/criteria-tiers.md`
- `references/wpforms-anti-patterns.md`

Read `references/score-examples.md` when calibrating against known winners and failures.

## Phase 2: Score

Inspect the subject code and assign exactly one tier: S, A, B, C, D, or F. Apply the criteria in `criteria-tiers.md`, then write one paragraph explaining the score with specific code line citations. Evaluate camera decomposition, easing choice, atmosphere, identity continuity, and zoom level where relevant.

## Phase 3: Prescribe

For any score below A, list the specific fix or fixes required to climb tiers. Cite the relevant tier criteria and point to reference HTMLs at `reference/html-templates/` where the pattern is done correctly.

## Output format

```md
## Motion Audit

**Subject:** [file:lines being audited]
**Tier:** [S / A / B / C / D / F]
**One-line verdict:** [reason in <15 words]

### What it does well
- [bullet]

### What's missing or broken
- [bullet] - fix: [specific change, citing tier criteria]

### To climb to [next tier]
- [specific change with file:line]
- [reference: where this is done correctly in reference/html-templates/]
```
