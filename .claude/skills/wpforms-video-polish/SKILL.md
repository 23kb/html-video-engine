---
name: wpforms-video-polish
description: "Polish an existing already-shipped WPForms video without breaking it. Use when the user says 'polish this video', 'tweak the X video', 'make this video better', 'improve the timing/easing/typography of <slug>', or asks for a quality pass on videos/<slug>/index.html (or chapter files). Covers single-HTML new-architecture videos AND legacy chapter/manifest videos. NOT for new video authoring (use wpforms-video or wpforms-marketing), NOT for fixing a broken video (debug first), NOT for postIntro design (use wpforms-postintro)."
---

# WPForms Video Polish

## What this skill IS

A safe, repeatable workflow for **incremental quality bumps** on a video that already works. Goal: better easing, tighter timing, refined typography, smoother handoffs — without changing what the video is about, breaking any choreography, or expanding scope.

The hand-rolled pattern this skill codifies (klaviyo-bridge-2, 2026-05-12) ships polish edits in batches of 5–10, surgically, with a backup-first → analyze → execute → audit → handoff loop.

## What this skill IS NOT

- Not a redesign. If the user wants new choreography, use `wpforms-video` (tutorial) or `wpforms-marketing` (editorial).
- Not a debug pass. If the video has actual bugs (broken animations, missing assets, console errors), fix those first using normal video tooling.
- Not architectural. Don't migrate legacy chapter videos to single-HTML; don't touch protected core (engine/, runtime/, scenes/).
- Not a license to refactor. Every changed line traces directly to a polish opportunity.

## ⛔ Non-negotiable rules (in order)

### 1. Backup BEFORE editing — git is not a safety net

Many video HTML files under `videos/<slug>/` are gitignored. There IS no git history to revert from. Before the FIRST edit:

```bash
cp "videos/<slug>/index.html" "videos/<slug>/index.before-polish-<YYYY-MM-DD>.backup.html"
```

For legacy chapter videos, back up every chapter file you'll touch. Skip this and you can permanently destroy work on a botched edit.

### 2. No visual QC from Claude

The user owns all visual QC on videos. Don't screenshot, don't scrub the timeline in the browser, don't ask "want me to verify?" — even if a `PostToolUse:Edit` hook prompts you to. The `feedback_visual_qc_split.md` 5-second rule does NOT apply to video polish.

Verification is **static only**:
- `node tools/validate-video.js <slug>` (for legacy chapter videos)
- `node tools/lint-determinism.js --video <slug>`
- Console error log via preview tools — reading for runtime errors is fine, screenshot/scrub is not
- DOM probes via `preview_eval` to confirm CSS values applied

### 3. Respect determinism rules

See INV-9 in `docs/video-architecture-invariants-2026-05-12.md` for the canonical list (no `Date.now()`, no unseeded `Math.random()`, no `fetch()` at runtime, no `repeat: -1`). The most common polish-suggestion that violates this is `repeat: -1` on ambient atmosphere — reject it, don't apply it. Use `boundedRepeats(cycle, visible)` from `videos/_shared/motion-primitives.js` instead.

### 4. Do NOT touch protected core (CLAUDE.md)

`engine/*`, `runtime/player.js`, `runtime/chapter-runner.js`, `runtime/scene-helpers.js`, `runtime/transitions.js`, `runtime/frame-driver.js`, `runtime/frame-adapter.js`, `runtime/shared-scene.js`, `runtime/pause-manager.js`, `scenes/shared.js`, `scenes/player.html`, validators, accepted/reference packages.

### 5. Do NOT touch load-bearing logic in the target video

Before editing, identify RED-flag zones — math/timing/Flip orchestrations that are explicitly tuned. Typical examples:

- Camera-pose math derived to match a handoff (e.g. `SC_POSE_START_DEFAULT` matching iframeCard view)
- `setTimeout`-based re-measurement passes
- `Flip.getState`/`Flip.from` phases sequenced against overlap (Phase A/B/C ordering)
- `tl.call` timings whose internal async sleeps are tuned to land before the next master beat
- Total timeline duration (`TOTAL`) and the outro start time

Note these explicitly in the plan as "do not touch". Polish goes around them, not through them.

### 6. Reach for primitives, not hand-rolled motion

If a polish suggestion would re-implement a primitive (custom cursor element, single-tween camera, `gsap.to(menu)` for a faux native-select, etc.), use the library instead. See `wpforms-primitives` skill. The CLAUDE.md anti-pattern catalog applies just as hard during polish as during authoring.

### 7. Motion audit before final handoff

After polish edits land, polish on cinematic / postIntro / editorial beats requires `wpforms-motion-audit` sign-off. Record the tier rating before reporting "done."

## Workflow

### Step 0 — Path identification

Confirm which video and which architecture:

- **New-architecture single-HTML** — `videos/<slug>/index.html` only (sometimes `storyboard.md`). Master GSAP timeline. Examples: klaviyo-bridge-2, klaviyo-quick-connect.
- **Legacy chapter/manifest** — `manifest.json` + `chapters/*.js` + narration mp3s. Examples: wpforms-rest-api-overview, builder/admin tutorials. **The polish surface is multiple files.**

Different architecture = different polish surface, but the same rules.

### Step 1 — Backup

Per Rule 1 above. Always. First action in the session.

### Step 2 — Delegate the polish analysis to a Plan agent

Use the `Plan` subagent_type. Brief it like a smart colleague:

- Hand it the file path(s) and tell it the architecture.
- Tell it to compare against a recent polish reference if one exists in the repo (e.g. `videos/wpforms-rest-api-overview-polished/`).
- Ask for 5–10 concrete polish edits: `file_path:line_number → current value → suggested value → reason`.
- Ask explicitly for a **RED-flag list** of things it identified as too-risky-to-touch, so you can avoid them.
- Cap the response under 600 words to keep your context lean.

Typical polish categories to cover in the brief:

- **Easing curves** — `expo.out` repeated across siblings reads as isolated events; `power4.out` cohesive. `expo.out` for settle into rest can feel yanked → `expo.inOut` or `power3.out`. Match easing family to gesture intent.
- **Timing pacing** — heading-stagger gaps. Outro pulses that fire once and die — add a softer secondary pulse 0.6-0.9s later.
- **Typography** — `letter-spacing: 0` on display serifs at 60+px → `-0.008em` to `-0.012em` (editorial set).
- **Unused authored eases** — repos often define `CustomEase.create('logo-arrival', ...)` and never wire it. Find and use what's authored.
- **Atmospheric layer alpha** — flicker-prone or too-strong values.
- **Filter/shadow/blur** polish.
- **Handoff smoothness** — frozen-camera gaps during snapshot crossfades. Run motion concurrent with the swap so motion masks the asset change.
- **Cursor / motion-primitive** quality.
- **CLAUDE.md anti-patterns** — hand-mounted cursors, single-tween cameras, iframe swaps to show state changes, faux native `<select>`s, mock iframe siblings painting over real iframes, invented UI fragments.

### Step 3 — Vet each suggestion against rules 3–6

Before applying any suggestion:
- Does it use `repeat: -1`? Reject.
- Does it modify protected core? Reject.
- Does it touch a documented RED-flag zone? Reject.
- Would it re-invent a primitive? Substitute the primitive.
- Does the proposed numerical change cascade into a `tl.call` async timing? Sanity-check the landing.

A 10-item plan often distills to 7–8 safe edits after vetting. That's fine — drop the unsafe ones explicitly with a one-line rationale.

### Step 4 — Apply edits, surgically

Use `Edit` (not `Write`). One change per edit call. Match existing indentation and style. Don't "improve" adjacent code, comments, or formatting.

When timing edits move beats around, double-check the cumulative shift fits within the slack before the next master timeline event (`tl.call`, outro start, `TOTAL`).

For comments around the edit: don't add new ones. Don't write "polished from X to Y" — the diff IS the explanation. Keep the file readable for the next pass.

### Step 5 — Static verification

Run only static checks. NEVER screenshot, NEVER scrub:

- For new-arch single-HTML: load the URL via `preview_eval` to confirm the page boots, then read console for errors. `preview_inspect` or `preview_eval` to confirm specific CSS values applied. Stop there.
- For legacy chapter videos: `node tools/validate-video.js <slug>` + `node tools/lint-determinism.js --video <slug>` + `node tools/check-video-playback.js <slug>`.
- For both: ignore pre-existing warnings (e.g. GSAP "Invalid property name FROM_A" warnings predate any polish).

### Step 6 — Audit if motion-heavy beats changed

If polish touched a postIntro, cinematic, or editorial beat (camera moves, handoffs, surface transitions), invoke `wpforms-motion-audit` via the Skill tool and record the tier rating before handoff.

### Step 7 — Hand off

Report:
- **What changed** — bullet list per beat, with the kind of polish (easing / timing / typography / handoff smoothness).
- **What was skipped** — RED-flag zones plus any rule-3-rejected suggestions, with one-line rationale.
- **Backup location** — confirm the user has a restore point.
- **Net timing delta** — if cumulative pacing shifted (e.g. +0.30s across a 54s timeline), state it and confirm it's within slack.

Don't summarize what the diff would show. Don't say "polished — feels much better now." The user runs the eye.

## Common polish patterns (canonical)

### Pattern 1 — Repeated `expo.out` siblings → `power4.out` cohesive

Three heading words revealed with `expo.out` 0.58s at 0.35/0.73/1.03 read as three isolated events. Tighten to `power4.out` 0.55s at 0.30/0.62/0.88. Same family, tighter rhythm.

### Pattern 2 — Settle into rest

`expo.out` on a 1.0+s arrival tween (e.g. iframeCard settle) decelerates very late and reads as "yanked to rest." Swap to `expo.inOut` or bump duration to absorb the deceleration over more of the gesture.

### Pattern 3 — Unused authored CustomEase

Grep for `CustomEase.create` and check call sites. Eases are often authored, then never wired because the author moved on. Wire them where the name implies (`logo-arrival` for logo arrivals, `magnetic-pull` for snap-to-target moves, `resolve` for end-state settles).

### Pattern 4 — One-shot pulse with long tail of silence

Outro pill green-pulse fires once then sits static for 1.4s before the video ends. Add a softer secondary pulse at +0.85s (~30% intensity) — same fromTo, half the spread. Cheap life.

### Pattern 5 — Display-serif `letter-spacing: 0`

Fraunces, Canela, Recoleta, etc. at 60+px need `letter-spacing: -0.008em` to `-0.012em` for editorial set. Zero motion risk.

### Pattern 6 — Frozen-camera between crossfade and zoom-out

After a snapshot crossfade (e.g. iframeCard → scatteredScene), the camera often sits frozen for 0.5–1.0s before the next move starts. Reads as "snapshot loaded, then the camera decided to move." Fix: start the camera move SIMULTANEOUS with the crossfade — motion masks the asset swap.

```js
// BEFORE — 0.78s of frozen camera after the swap
tl.to('#iframeCard',    { autoAlpha: 0, duration: 0.40 }, 26.50);
tl.to('#scatteredScene',{ autoAlpha: 1, duration: 0.40 }, 26.50);
tl.to('#scatteredCamera', { x: '+=22', y: '+=12', duration: 0.18 }, 27.10);  // anticipation
tl.to('#scatteredCamera', { ...SC_POSE_WIDE_MID, duration: 1.30 }, 27.28);   // zoom-out

// AFTER — zoom-out concurrent with crossfade, power2.inOut gives implicit anticipation
tl.to('#iframeCard',    { autoAlpha: 0, duration: 0.50 }, 26.50);
tl.to('#scatteredScene',{ autoAlpha: 1, duration: 0.50 }, 26.50);
tl.to('#scatteredCamera', { ...SC_POSE_WIDE_MID, duration: 1.40, ease: 'power2.inOut' }, 26.50);
```

Re-time downstream beats to absorb the saved 0.78s as longer settle at the end.

### Pattern 7 — Redundant interactive cycle

When an interactive showcase's first cycle is "click the already-selected option" (no morph happens), the click is theatre. Skip it and start the showcase at cycle 2. The remaining cycles cover the same option-set via the dropdown reveal anyway.

### Pattern 8 — Block-centred zoom with content gutter

When `getBoundingClientRect` zooms on a block whose content is left-aligned with a whitespace gutter, the framing reads as imbalanced (form on left, white on right). Prefer focusing on the content wrapper (`.fields-wrap`, etc.) and biasing vertical focus toward the active region (e.g. `y * 0.38` to favour the top dropdown row).

## Output convention

When polish lands, the user wants a punch list — not a wall of text:

```
## Polish applied — N edits

**Typography**
1. `.wm-wpf` — letter-spacing 0 → -0.008em (editorial Fraunces set)

**Easing & timing**
2. B2 heading reveal — expo.out 0.58s @ 0.35/0.73/1.03 → power4.out 0.55s @ 0.30/0.62/0.88 (less "isolated event")
3. ...

**Handoff smoothness**
N. B13 crossfade → zoom-out — separate anticipation removed, zoom-out concurrent with crossfade (motion masks the snapshot swap)

**Skipped intentionally**
- `atmoDrift repeat: -1` — violates CLAUDE.md determinism rule
- `#sp3` transformOrigin mid-rotation — visual snap risk

Backup at: videos/<slug>/index.before-polish-<date>.backup.html
Net timing delta: +0.30s within 54.4s slack
```

Concise. Diff-replicable. No "feels great now" filler.
