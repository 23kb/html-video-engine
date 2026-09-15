---
name: video-qc
description: "Run the QC / review / iterate loop on a WPForms video efficiently. Use when the user is reviewing a built video and reporting fixes scene-by-scene ('scene 2 looks wrong', 'QC this video', 'review pass', 'the intro is off', 'fix this then give me the scene URL'), OR when you're about to enter a build→review→iterate cycle and want it to be cheap. Bakes the cost-control discipline + workflow contracts (read outline.md first; state-change hierarchy; preserve the literal verb; state the target back with evidence; surgical edits; no visual/audio QC). NOT for first-time authoring (use wpforms-video / wpforms-marketing), NOT for breakage-free quality bumps on a shipped video (use wpforms-video-polish), NOT for debugging a broken video."
---

# Video QC — the cheap review/iterate loop

This skill exists because past QC passes burned 7 iterations where 2 would do. Root cause every time: substituting your own short-circuit for the user's explicit guidance, and over-working builds you can't visually verify.
The user (Umair) owns ALL visual and audio judgment. Your job in QC is to turn his one-line report into the **minimal correct** edit, fast, give him the review URLs, and wait. Not to perfect it blind.

## 🎯 The QC dashboard is the QC surface (canonical since 2026-08-25)

`http://localhost:4321/tools/qc-dashboard/#<slug>` — gate chips, the render with
dead-time bands and seam ticks, a client-side filmstrip, and Umair's timestamped
notes in one page. Needs `node tools/preview.js --no-open` running (the
`/__qc/videos.json` route lives there, not in bare `serve.js`).
Full reference: `docs/qc-dashboard.md`.

**Two obligations this puts on you:**

1. **Populate the gate ledger before every handoff.** The dashboard reads
   `videos/<slug>/qc-report.json`. An empty chip row means "not measured" and
   wastes Umair's pass. See "The loop" step 5 for the exact commands.
   Report chips as **absence-of-breakage, never as quality** — the battery
   measures execution; nothing in it reads the idea, the copy, or the script
   (rulebook §9 "Every gate chip is green"; `cad` 8, `road` 1).
2. **Treat a pasted feedback block as a work order.** When Umair hits "Copy for
   chat" you get:

   ```
   QC feedback — <slug>
   - 15.90s — pane re-centers late after the reveal
   - 31.80s — payoff chip overlaps the field label
   ```

   Each line is ONE report under the five cost rules below — one minimal edit,
   nothing adjacent, worked in timestamp order. Map each timestamp to its beat
   (timeline labels, or `DUR` accumulation) BEFORE editing, and state that
   mapping back in one line — this is G2 applied to time instead of selectors:
   *"15.90s lands in `beat-reveal` (label at 14.8s); target is the pane
   re-center tween. Confirming."* If a timestamp sits ambiguously between two
   beats, ask — one clarifying line beats a wrong build.

Timestamps are evidence, not opinion. Never answer a timestamped note by
explaining why the beat is correct; either fix it or report what you measured
at that exact second.

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

## ⛔ Post-approval + evidence integrity (fix-round C8, 2026-08-17)

### Post-approval freeze — measurement is not authority
After Umair approves a beat, measured defects in it earn a **REPORT, never an edit**. The custom-css session ran a self-directed QC pass on an approved postIntro and made three rounds of unrequested changes ("wtf is happening, you just needed to add the bgm") — all reverted (ccs 19/A16). This is G3's mirror: *after approval, no edits at all without a new instruction.*

### Two rejections → re-concept, not a third execution patch
When the same beat is rejected twice, the next iteration must present a **CONCEPT change** — layout, camera, kinetics, the visual language — not another execution patch (as 8; ccs 13 — earned twice). Dressing-only passes are for "almost there" verdicts. Corollary (ccs 20): the re-concept arrives as a **written proposal** with options + costs + named constraints BEFORE any build.

### Missing surface = ask-user, at asset-selection time
When a storyboard beat needs a surface that doesn't exist (no snapshot, asset can't meet an invariant), the choices are: ask for a capture / redesign the beat on real markup / raise the conflict. **NEVER narrate the missing thing** ("the big lie") and never silently scope down. Three sightings across two production lines (ssn 12, cc 1, mp 5). Raised at asset-selection time, not discovered in QC.

### Ship renders run SOLO
Never two renders — or a render + probe — concurrently on this machine. Dead-time verdicts from a contended render are invalid evidence (bac G: identical code measured 2.00s vs 3.03s under contention). Full probe-integrity rules: `docs/probe-playbook.md`.

### Grep before adding any shared-module export
Before adding a NEW export to `videos/_shared/*`, grep for the name first. A concurrent session adding the same export is a SyntaxError that takes every consumer dark — it happened: both sessions implemented the same QC feedback independently (bac 6).

### Frame sweep at production handoff — shorts (long-form: on request only)
Shorts handoffs run the mandatory frame sweep per `docs/vertical-shorts.md` ("Handoff: the frame sweep"): dense per-beat frame extraction from the rendered MP4, reviewed as a viewer, reported as WHAT was checked. Scope RULED 2026-08-22 (fix-round README decision 1): long-form handoffs do NOT run it by default — only when Umair asks or the session flags a build as unusually risky. The standing no-visual-QC rule holds on long-form otherwise.

## Verify numerically, not by eye (round-2 B5, 2026-08-08)

The complement to the no-visual-QC rule: your lane is **measurement off render-truth**. "Looks right" is Umair's call; "measures right" is yours, and nearly every defect a measured pass finds is one no amount of looking would have. The menu:

- **Seams:** sample the carrier's position per frame either side of a cut; compare exit vs entry velocity (`node tools/seam-gate.js <slug>` does this). Target: cut on the peak-velocity frame.
- **"Double reveal" / "flash" reports:** count *direction reversals* per frame, and check whether the element is visible before its tween starts — nearly always the parked-state trap (`wpforms-gsap-rules` seek-render trap #1).
- **Motion continuity:** sample composite speed per frame across a hand-off; a butt-joined rig passes through exactly 0. "Looks smoother" is not a check.
- **Layout / cursor targets:** read the real rect and compute from it — "obviously right" coordinates have landed 20px off the target.
- **Renders:** exit code 0 is not proof. Decode frames and check for flat/frozen runs (`node tools/dead-time.js <mp4>`); verify background videos actually play (frame-diff over their region).

**Probe hygiene — measurement artifacts that fake bugs** (full rules with receipts: `docs/probe-playbook.md` — pixel truth, console filters, side-measurement before diffs, `__preview-ws` route-abort, foreground probes, beat contracts):

- Seek/screenshot times in **ASCENDING order only** — a backward seek re-renders tween start states and returns frames the forward render never shows.
- Measure a **centered band**, not a full-frame ink mask — frame-edge content pollutes the read (a "wordmark width" check once measured wall tiles).
- Read the transform GSAP wrote (`el.style.transform`), **not** `getBoundingClientRect()` through a preview scale — the division manufactures sub-pixel noise and invents reversals.
- Audio beds are verified by **energy window** (RMS inside vs outside), never by onset detector — a continuous bed has no transient, so the detector locks onto the nearest click's decay tail and reports a false offset.

## The loop

1. **Backup first** if the video HTML is gitignored (many are — no git history to revert). `cp videos/<slug>/index.html videos/<slug>/index.before-qc-<YYYY-MM-DD>.backup.html`. (Memory: backup before video edits.)
2. **Read the report. Map it to a target** via `outline.md`. State the target back if a UI part is named (G2). A dashboard note already carries its exact second — map it to a beat and state that back (see the dashboard section above). If the report points at a keyframes contact-sheet tile ("frame 7"), the tile's burned-in `#N t.ts` badge (and the `tools/keyframes.js` stdout tile map) resolves it to an exact second — don't guess which beat it means.
3. **Make the minimal edit(s)** for that one report, batched, surgical (rules 1, 3; G3).
4. **Static-verify only**: file parses (`node --check` for JS, or load the page and read console for errors via preview tools — reading errors is fine, screenshotting is not); `node tools/lint-determinism.js --video <slug>`. For single-HTML films, `node tools/smoke-singlehtml.js <slug>` (liveness) and — if the film ships a `videos/<slug>/qc-probe.mjs` — `node tools/probe-singlehtml.js <slug>` (per-scene correctness: seek-steps the timeline and asserts computed DOM state, so number-continuity / scene-isolation regressions surface WITHOUT the user's eye). When a fix touches a checked value, update the matching `qc-probe.mjs` check.
5. **Populate the gate ledger, then hand over the URLs and stop.**

   Run the gates so the dashboard chips are truthful (two need the opt-in flag;
   the other three write their section automatically). One at a time — smoke,
   dead-time and seam-gate hold the headless lock:

   ```bash
   node tools/validate-singlehtml.js <slug> --report
   node tools/smoke-singlehtml.js <slug> --report
   node tools/narration-qc.js <slug>
   node tools/dead-time.js <slug>          # shorts: also --crop 1080:1200:0:300
   node tools/seam-gate.js <slug>
   node tools/lib/qc-report.js <slug> --set motionAudit.tier=<tier>
   ```

   Then hand over BOTH complete, copy-pasteable URLs (memory: complete URLs always):
   - **Render QC** — `http://localhost:4321/tools/qc-dashboard/#<slug>`
   - **Film scrub** — `http://localhost:<port>/videos/<slug>/index.html?scene=<id>`
     (the `?scene=` convention in `wpforms-video`)

   Say in one line what the gates measured — as not-broken evidence, never as a
   quality verdict — and never re-paste raw tool stdout; the chips carry it now. A re-render invalidates every chip, so re-run the gates
   after any re-render rather than letting a stale chip stand.
6. **Iterate on the actual feedback.** Don't pre-empt the next three fixes blind.

## Output convention

```
Scene <N> — <one-line of what you changed>
- target: `<selector from outline.md>`  (rung: drive | puppet | swap)
- <the one edit, diff-replicable>
Review: http://localhost:<port>/videos/<slug>/index.html?scene=<id>
```

Answering a pasted dashboard block — one line per note, timestamp first, so
Umair can diff his list against your replies:

```
QC feedback applied — <slug>
- 15.90s (beat-reveal) — pulled the pane re-center 0.3s earlier
- 31.80s (beat-payoff) — chip now anchors below the label, no overlap
Re-render + re-run gates: http://localhost:4321/tools/qc-dashboard/#<slug>
```

If a fix needs the user's input (a missing asset, a visual/audio call), say so in one line and move on — don't guess.

## Hero beat — where the iteration budget goes

The storyboard names **which beat carries the video** (see the `wpforms-video` gate). That beat is built first, at higher fidelity, and it's where Umair's review passes and your fixes should concentrate; supporting beats get one pass unless broken.

**This does NOT dilute cost rule 1.** Hero-beat priority governs build order and where *Umair* spends review passes — it is not license to keep polishing the hero beat unprompted. You still edit only what was reported.

## The shape of a good polish note (for Umair's note-writing as much as for you)

The cheapest notes to execute are **relative deltas on something that already exists** — nothing in them invites a rewrite:

- **Relative multipliers** — "slow the typing to 0.8×", "make scene 2 twice as fast"
- **Offsets** — "delay the label flip a beat", "start the fade half a second earlier"
- **Proportional positions** — "start the fall three-quarters through the collapse"
- **Named curve swaps** — "slow-in long-tail instead of the bezier", "expo.out not power2"
- **Exact-trigger cuts** — "cut 0.2s after the third checkmark lands"

Contrast with the shape that triggers rewrites: "the intro feels off", "make it pop" — those force a re-spec. If you receive one, ask which of the shapes above it means before touching code.

**Derived-rule step:** after applying a batch of pacing notes, state in one line the general rule they imply (e.g. "process beats run at 2×, payoff beats at 1×") and record it in the video's storyboard.md — later beats inherit it instead of re-collecting the same notes.
