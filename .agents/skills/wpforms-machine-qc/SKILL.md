---
name: wpforms-machine-qc
description: "Run the Gemini-based advisory semantic QC pass (tools/machine-qc.js) on a rendered WPForms video MP4 and triage its findings. Use AFTER every MP4 render and re-render, BEFORE the handoff to Umair — alongside the other gate-ledger tools (narration-qc, dead-time, seam-gate). Catches the layer measured gates can't see: UI cut off at frame edges, abrupt endings, on-screen text defects, some narration/visual mismatches. ADVISORY ONLY — never a gate, never blocks a handoff, never replaces Umair's visual QC. NOT for videos with no render yet, NOT a substitute for qc-probe/A11 narration-claim probes (it misses those classes ~2 of 3 times)."
---

# Machine QC — advisory Gemini pass on renders

`tools/machine-qc.js` sends a rendered MP4 to the Gemini API with the
storyboard + narration scripts and returns timestamped findings. Built and
benchmarked 2026-09-02 against 3 renders with documented Umair QC failures.
**Measured recall: ~35% of his findings.** It shrinks his review list; it
does not replace it.

## When to run (the stage)

Run **after every MP4 render, before the review handoff** — same slot as the
other gate-ledger populators in AGENTS.md Validation step 6:

```
render → narration-qc → dead-time → seam-gate → machine-qc → handoff URLs
```

- **Every re-render re-runs it.** A re-render invalidates every chip;
  machineQc is a chip like any other.
- It needs no headless lock (pure API call) — it can run while dead-time or
  seam-gate holds the lock.
- Do NOT run it pre-render as a substitute for validate/smoke — it only sees
  pixels, and there are no pixels yet.
- Do NOT wait for it before fixing things the measured gates already flagged.

## How to run

```
node tools/machine-qc.js <slug>                      # prefers <slug>-audio.mp4
node tools/machine-qc.js videos/<slug>/render/x.mp4  # explicit path
```

Flags: `--model gemini-3.7-flash` (default) · `--focus "extra instruction"`
(scoped re-run, e.g. "watch beat 3's dropdown open") · `--no-report` (skip the
qc-report.json write — use for dropped/archived videos and benchmark runs).

Needs `GEMINI_API_KEY` in `.env`. Uploads the render to Google's Files API
(Umair approved 2026-09-02) and deletes the upload after the run. Cost is
negligible (~5–10k tokens/run on Flash).

## How to treat findings — the advisory contract

The model is non-deterministic: same video, different findings run to run.
Severity skews lenient. Therefore:

1. **Verify every finding against the source before acting.** Open the film
   at the timestamp (probe, inspect-snapshot, code read) and confirm the
   defect exists in the HTML/timeline. Never edit the film from a Gemini
   sentence alone — it can hallucinate (one benchmark cursor finding is
   still unverified).
2. **A clean run is NOT a clean video.** Zero findings clears nothing; it
   only means the pre-screen found nothing. Umair's pass still owns the
   verdict. Never write "machine-qc clean" as evidence of quality in a
   handoff — the chip already says it, advisory-labeled.
3. **Findings feed the fix list, not the changelog.** Treat a confirmed
   finding like a line of Umair QC feedback: minimal surgical edit, then
   re-verify. Dismissed findings need a one-line reason in the handoff notes
   if they were HIGH.
4. **Never let it upgrade to a gate.** It writes `machineQc` (advisory chip);
   it must never feed `statusOf()` / the dashboard dot, never block a render
   or handoff, and never appear in "merge bar" language.

## Known blind spots (benchmarked 2026-08-13 shorts, run 2026-09-02)

Do not expect it to catch — the deterministic probes own these classes:

- **Absence of motion** — a storyboard-promised stagger/animation that never
  fires is invisible to it, even with the storyboard in context (0/1).
- **Narrated-but-never-shown** (A11 class) — missed 2 of 3 despite having
  the narration scripts. The narration↔surface contract + beat-target probes
  remain the only real coverage.
- **Dead time / freezes / pacing** — deliberately excluded from its prompt;
  `dead-time.js` measures that exactly.

Known strengths (where it earns its slot): UI cut off at frame edges,
abrupt/missing endings, reading on-screen text verbatim (mojibake, typos,
wrong labels), storyboard/footage copy drift.

## Scoped re-runs

For a suspected defect in one beat, prefer a `--focus` re-run naming the
beat and what to watch ("at 0:20–0:28, does the dropdown visibly open before
the selection appears?") over rerunning the generic checklist — focused runs
measurably out-recall generic ones (benchmark: 1 → 3 real findings on the
same video).
