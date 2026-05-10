# Phase 2 Skill Installs Report - 2026-05-10

## Skills installed

| Skill | Install path | `name:` | Install command | Status |
|---|---|---|---|---|
| design-motion-principles | `.agents/skills/design-motion-principles/` | `design-motion-principles` | `npx add-skill kylezantos/design-motion-principles` | Success via explicit fallback. The command as written failed after the deprecated `add-skill` forwarder could not spawn `npx` on Windows; `npx skills add kylezantos/design-motion-principles` installed it. |
| Emil Kowalski skill | `.agents/skills/emil-design-eng/` | `emil-design-eng` | `npx skills add emilkowalski/skill` | Success |
| impeccable | `.agents/skills/impeccable/` | `impeccable` | `npx skills add pbakaus/impeccable` | Success |
| Remotion Best Practices | `.agents/skills/remotion-best-practices/` | `remotion-best-practices` | `npx skills add https://github.com/remotion-dev/skills --skill remotion-best-practices` | Success; reference only |
| freshtechbro GSAP | `.agents/skills/gsap-scrolltrigger/` | `gsap-scrolltrigger` | CLI equivalent of `/plugin install gsap-scrolltrigger`: `npx skills add freshtechbro/claudedesignskills --skill gsap-scrolltrigger` | Success |

## MotionScore Pattern Distilled

Motion AI Kit's `/motion-audit` pattern is a source-code audit that scans Motion and CSS animations, classifies every animation from S to F, produces a scorecard, and gives specific fixes. MotionScore extends the same scoring model to a live site/runtime audit: it detects animations, scroll animations, layout/style thrashing, and GPU pressure, then grades each area independently before combining them into an overall score. Sources: [AI Kit](https://motion.dev/docs/ai-kit), [MotionScore docs](https://motion.dev/docs/motionscore), [Animation Performance Audit](https://motion.dev/docs/animation-performance-audit), and [score.motion.dev](https://score.motion.dev/).

The key pattern to borrow is not the browser-performance content itself, but the audit architecture: inspect concrete properties, map them to a small S-F tier system, show a breakdown, and provide copy-pasteable remediation. Motion's tier ladder is intentionally legible: S means compositor-only; A means JS-driven compositor properties; B means compositor work with one-time layout measurement; C repaints every frame; D triggers layout and repaint; F forces per-cycle style/layout thrashing. It also names the inspected signals: animated properties, off-screen work, large paint surfaces, CSS variable inheritance, scroll handlers, interleaved DOM reads/writes, promoted layer count, texture memory, overlapping layers, and persistent `will-change`.

For WPForms editorial motion, the equivalent audit dimensions are cinematic rather than browser-cost-only: camera decomposition, easing quality, atmosphere restraint, identity continuity, and product-scale/zoom thresholds. The new `wpforms-motion-audit` skill mirrors the MotionScore shape: S-F score, one-line verdict, specific evidence, and tier-climbing fixes. Instead of "width is D-tier because it triggers layout," it says "single-tween camera is C/F-tier because it has no anticipation, scale arc, landing hold, or identity continuity," with references to the WPForms winners and failures.

## freshtechbro GSAP diff vs wpforms-gsap-rules

`gsap-scrolltrigger` is a broad GSAP/ScrollTrigger reference. It covers tweens, timelines, position parameters, ScrollTrigger starts/ends/scrub/toggleActions, parallax, pinning, batch/stagger, Three.js integration, React `useGSAP`, image sequence scrubbing, media queries, cleanup, and generic easing examples. It does include useful reminders about timeline position parameters, conflicting tweens, plugin registration, `will-change`, and transform/opacity performance.

What it lacks compared with `.claude/skills/wpforms-gsap-rules/SKILL.md`: no WPForms render determinism rules, no vendored GSAP version rule, no `registerTimeline()` contract, no `pausableRaf`, no `awaitTween`, no `withGsapContext`, no finite-repeat requirement, no Flip boundary warning, and no video-validator checklist.

What Phase 2 specifically hoped it might add, but it does not: decomposition guidance for cinematic camera moves, multi-phase camera patterns, per-phase CustomEase rules, or WPForms editorial tiering. It is a generic implementation reference, not a motion-direction audit lens.

## wpforms-motion-audit skill created

Created the requested repo-local skill:

- `.claude/skills/wpforms-motion-audit/SKILL.md`
- `.claude/skills/wpforms-motion-audit/references/criteria-tiers.md`
- `.claude/skills/wpforms-motion-audit/references/wpforms-anti-patterns.md`
- `.claude/skills/wpforms-motion-audit/references/score-examples.md`

The skill uses the required frontmatter name `wpforms-motion-audit`, loads criteria and anti-pattern references before scoring, outputs the requested Motion Audit markdown block, and cites the canonical references at `reference/html-templates/`.

## QC baseline diff

Ran:

```powershell
node tools/validate-video.js --all > tools/qc-after-phase-2.txt 2>&1
Compare-Object (Get-Content tools/qc-baseline-2026-05-10.txt) (Get-Content tools/qc-after-phase-2.txt)
```

`validate-video.js --all` exited `1`, matching the existing baseline state. `Compare-Object` produced no output, so Phase 2 introduced no validator-output regression.

## Anything that failed or needed manual intervention

- `npx add-skill kylezantos/design-motion-principles` failed only in its deprecated forwarding path (`spawn npx ENOENT`). The explicit replacement command succeeded and is recorded above.
- The freshtechbro slash-command UI was not available in this Codex shell, so I used the equivalent `npx skills add ... --skill gsap-scrolltrigger`, which selected only that one skill from the 23 available skills.
- Remotion was read as structural reference only. No `wpforms-*` skill was modified.
