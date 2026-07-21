---
name: video-qc
description: "Run the QC / review / iterate loop on a WPForms video efficiently. Use when the user is reviewing a built video and reporting fixes scene-by-scene ('scene 2 looks wrong', 'QC this video', 'review pass', 'the intro is off', 'fix this then give me the scene URL'), OR when you're about to enter a build→review→iterate cycle and want it to be cheap. Bakes the cost-control discipline + workflow contracts (read outline.md first; state-change hierarchy; preserve the literal verb; state the target back with evidence; surgical edits; no visual/audio QC). NOT for first-time authoring (use wpforms-video / wpforms-marketing), NOT for breakage-free quality bumps on a shipped video (use wpforms-video-polish), NOT for debugging a broken video."
---

# Video QC — the cheap review/iterate loop

This skill exists because past QC passes burned 7 iterations where 2 would do. Root cause every time: substituting your own short-circuit for the user's explicit guidance, and over-working builds you can't visually verify. Source post-mortem: `videos/switch-to-wpforms-entry-importer/ISSUES.md` ("Process cost retro").

The user (Umair) owns ALL visual and audio judgment. Your job in QC is to turn his one-line report into the **minimal correct** edit, fast, give him the scene URL, and wait. Not to perfect it blind.

## When to use vs. neighbours

- **video-qc (this)** — the user is reviewing and reporting fixes; you iterate cheaply against his eye.
- **wpforms-video / wpforms-marketing** — first-time authoring (storyboard gate, build).
- **wpforms-video-polish** — proactive quality bumps (easing/timing/typography) on a shipped, working video, no user-in-the-loop.
- **debug first** — if the video is actually broken (console errors, missing assets), fix that with normal tooling before QC.

## ⛔ The five cost rules (from the retro — worst first)

1. **Edit only what was reported. One change → one verifiable result.** Don't "improve" adjacent scenes. The biggest past waste was edit → revert → redo from doing more than asked. (Edge of CLAUDE.md G3 / §3.)
2. **Ship a reasonable first pass, then let the eye review — don't over-deliberate blind.** Long reasoning to get a build "perfect" when you cannot see it has near-zero value. Make a sound choice, hand over the `?scene=` URL, iterate on the actual feedback.
3. **Batch all edits for a scene in one pass; one syntax check at the end.** Don't re-read a region you just wrote. Don't one-edit-per-message.
4. **Reuse selectors already proven in the file** (e.g. `tbody#the-list`). Inspect a snapshot only when the selector is genuinely unknown — and then read its `outline.md` first (below), not the raw `index.html`.
5. **Terse replies.** Scene observation → fix → one-line confirm + the scene URL. No walls of text, no "feels great now."

## ⛔ Workflow contracts (do not violate during QC)

### Read `outline.md` FIRST for any selector/interaction question
`snapshots/<slug>/outline.md` is the per-snapshot sidecar (~1.5K tokens): the author-targetable selectors + which `interactivity.js` transitions actually fire. Read it before `inspect-snapshot.js`, before grep, and NEVER `Read` the raw `index.html` (often ~1 MB — CLAUDE.md G4). `catalog.md` is the deep fallback when the outline's capped lists say "+N more".

### State-change hierarchy — drive the real UI, don't fake it
When a scene changes product state, use the highest-applicable rung (canonical: the plan's hierarchy + INV):
1. **BEST** — drive the snapshot's real interactivity (click/select/type a control; `interactivity.js` mutates the DOM). The outline's "Interactions — drivable inside the video iframe" section tells you exactly what fires.
2. **OK** — DOM puppetry (mutate the live DOM in place) when no transition exists.
3. **PAGE CHANGE ONLY** — `ifm.swap('<next-snapshot>')`. The outline's "HAND-BROWSE ONLY" section lists the nav links that are inert in-video and the `ifm.swap()` target to use instead.
4. **NEVER** — capture or fabricate a new snapshot to fake an in-page change.

### Preserve the literal verb (G1)
If the report says zoom, implement a camera transform — not a cross-fade. morph → the same element changes shape — not a swap of two elements. move/click/type/fade each have a literal implementation (CLAUDE.md G1 table). If the literal verb is genuinely hard, say so and ask — do not silently substitute and ship.

### State the target back with evidence before coding (G2)
When the report names a part of the UI (especially a class/ID), find the **exact** handle in the snapshot's `outline.md` and state it back in one line before editing: *"Target is `.wpforms-field[data-field-id]`; confirming."* A one-line correction is far cheaper than a wrong build.

### Surgical edits, never a full-file rewrite (G3)
Fix the ONE thing reported. Per-iteration full-file rewrites were the single biggest token sink in past builds. If a rewrite is genuinely required, say why and confirm first.

### No visual or audio QC from you — ever
Static checks only; the user runs the eye and the ear. Do not screenshot, scrub, or claim it "looks/sounds right" — even if a `PostToolUse:Edit` hook prompts you. For anything visual/audio, build it, run what static checks exist, and hand over the scene URL.

## The loop

1. **Backup first** if the video HTML is gitignored (many are — no git history to revert). `cp videos/<slug>/index.html videos/<slug>/index.before-qc-<YYYY-MM-DD>.backup.html`. (Memory: backup before video edits.)
2. **Read the report. Map it to a target** via `outline.md`. State the target back if a UI part is named (G2).
3. **Make the minimal edit(s)** for that one report, batched, surgical (rules 1, 3; G3).
4. **Static-verify only**: file parses (`node --check` for JS, or load the page and read console for errors via preview tools — reading errors is fine, screenshotting is not); for legacy chapter videos `node tools/validate-video.js <slug>` + `node tools/lint-determinism.js --video <slug>`. For single-HTML films, `node tools/smoke-singlehtml.js <slug>` (liveness) and — if the film ships a `videos/<slug>/qc-probe.mjs` — `node tools/probe-singlehtml.js <slug>` (per-scene correctness: seek-steps the timeline and asserts computed DOM state, so number-continuity / scene-isolation regressions surface WITHOUT the user's eye). When a fix touches a checked value, update the matching `qc-probe.mjs` check.
5. **Hand over the scene URL and stop.** Single-HTML: `http://localhost:<port>/videos/<slug>/index.html?scene=<id>` (see the `?scene=` convention in `wpforms-video`). Full engine video: `http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>`. Give the complete, copy-pasteable URL (memory: complete URLs always).
6. **Iterate on the actual feedback.** Don't pre-empt the next three fixes blind.

## Output convention

```
Scene <N> — <one-line of what you changed>
- target: `<selector from outline.md>`  (rung: drive | puppet | swap)
- <the one edit, diff-replicable>
Review: http://localhost:<port>/videos/<slug>/index.html?scene=<id>
```

If a fix needs the user's input (a missing asset, a visual/audio call), say so in one line and move on — don't guess (e.g. ISSUES.md #5 blocked on third-party logo assets).
