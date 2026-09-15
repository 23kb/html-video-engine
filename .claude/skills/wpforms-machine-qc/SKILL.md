---
name: wpforms-machine-qc
description: "Run the Gemini-based advisory semantic QC pass (tools/machine-qc.js) on a rendered WPForms video MP4 and triage its findings. Use AFTER every MP4 render and re-render, BEFORE the handoff to Umair — alongside the other gate-ledger tools (narration-qc, dead-time, seam-gate). Catches the layer measured gates can't see: UI cut off at frame edges, abrupt endings, on-screen text defects, some narration/visual mismatches. ADVISORY ONLY — never a gate, never blocks a handoff, never replaces Umair's visual QC. NOT for videos with no render yet, NOT a substitute for qc-probe/A11 narration-claim probes (it misses those classes ~2 of 3 times)."
---

# Machine QC — advisory Gemini pass on renders

`tools/machine-qc.js` sends a rendered MP4 to the Gemini API with the
storyboard + narration scripts and returns timestamped findings. Built and
benchmarked 2026-09-02 against 3 renders with documented Umair QC failures.
**Measured recall: ~35% of his findings** — measured on the ORIGINAL 1 fps /
low-resolution defaults, which could not see motion at all. Upgraded
2026-09-08 (see "What it sees" below); recall not yet re-benchmarked. It
shrinks his review list; it does not replace it.

## What it sees (since 2026-09-08)

Two passes per run, merged:

- **static @ 24 fps, high media resolution** — Gemini samples every frame at
  24 fps (the API max, and the rate Umair reads references at) with 280
  tokens per frame, plus the full audio track. One-frame blinks, pop-ins,
  cursor paths and cut boundaries are in view; timestamps come back to the
  millisecond. fps auto-clamps on long films so the video part stays under
  ~700k tokens (a 3-min tutorial lands around 13 fps).
- **agentic** — Gemini 3.7 Flash navigates the timeline itself: re-samples
  windows at higher fps, pulls audio/transcript on demand. The run prints
  how many navigation steps it took.

Same category within 1.5 s across passes is one finding, tagged
`static+agentic` — that is the strongest signal. The checklist now carries
MOTION (blinks, cut-short transitions, jumping cursors, snapping cameras,
never-fired animations) and AUDIO (narration lead/lag, click SFX with no
click, abrupt music/narration endings, narration buried under music,
glitches) sections. Audio reaches the model at 1 Kbps mono — enough for
presence and timing, not for mix or loudness judgments (LUFS owns that).

Fewer frames on purpose: `--mode static --fps 4` reproduces the cheap
pre-upgrade behaviour; `--mode agentic` alone is the quick second opinion.

## When to run (the stage)

Run **after every MP4 render, before the review handoff** — same slot as the
other gate-ledger populators in CLAUDE.md Validation step 6:

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

Flags: `--model gemini-3.7-flash` (default) · `--mode both|static|agentic`
(default both) · `--fps 24` (static pass sampling, API max 24, auto-clamped
by duration) · `--res high|low` (media resolution, default high) · `--focus
"extra instruction"` (scoped re-run, e.g. "watch beat 3's dropdown open") ·
`--no-report` (skip the qc-report.json write — use for dropped/archived
videos and benchmark runs).

Needs `GEMINI_API_KEY` in `.env`. Uploads the render to Google's Files API
(Umair approved 2026-09-02) and deletes the upload after the run. A 37 s
short costs ~420k tokens across both passes on Flash (~240k static + ~180k
agentic), about 70 s wall-clock; still cheap, no longer negligible — don't
loop it.

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

## Known false-positive classes (measured 2026-09-08, 18-film sweep)

Verified against source and dismissed. Check these BEFORE reporting one up:

- **`brand` — "wpforms is lowercase under the mascot".** Fired on 4 films. The
  real `sullie-master.svg` wordmark IS lowercase; only rendered text has to be
  "WPForms". Never a finding.
- **`audio` — a fabricated spoken track** ("an unrelated voiceover about a
  weekly weight loss challenge is playing", HIGH, agentic pass, on a film whose
  audio is `bgms/6.mp3` — Suno, ID3 `[Instrumental]` — plus 8 one-shots ≤1.5s).
  The agentic pass will invent speech content. Confirm any narration/VO finding
  against `sfx/plan.json` and the actual assets before believing it.

Both came from the agentic pass; the static pass reported neither. Treat an
agentic-only finding as a lead, not a defect.

## Measured cost (2026-09-08, Flash at $0.75/M in · $3.75/M out)

- 30–43 s film, both passes @ 24 fps high: 220k–560k tokens ≈ **$0.18–$0.45**
- same film, static only @ 24 fps high: ~240k–280k ≈ **$0.20**
- 90–195 s tutorial, static @ 6 fps low: 43k–89k ≈ **$0.03–$0.07**
- 90–195 s tutorial, both passes @ clamped fps high: ~1.4M ≈ **$1.10**

A full-juice sweep of an 18-film backlog is ~$9. Budget the fps and the media
resolution per track: shorts and ads earn 24 fps high (motion is the product),
long tutorials sweep cheaply at 6 fps low for cursor/narration/layout classes.

## Known blind spots (benchmarked 2026-08-13 shorts, run 2026-09-02 at 1 fps)

Measured BEFORE the 24 fps / agentic upgrade — the first two may have moved;
re-run the benchmark before trusting either way. Until then the
deterministic probes own these classes:

- **Absence of motion** — a storyboard-promised stagger/animation that never
  fires was invisible at 1 fps (0/1). The MOTION checklist section now asks
  for it explicitly; unproven.
- **Narrated-but-never-shown** (A11 class) — missed 2 of 3 despite having
  the narration scripts. The narration↔surface contract + beat-target probes
  remain the only real coverage.
- **Dead time / freezes / pacing** — deliberately excluded from its prompt;
  `dead-time.js` measures that exactly.
- **Taste** — whether an ease voice is right, whether a cadence is dizzying,
  whether the mix sits at the ad bar. It can describe motion now; it cannot
  grade it. `wpforms-motion-audit`, `seam-gate`, LUFS own those.

Known strengths (where it earns its slot): UI cut off at frame edges,
abrupt/missing endings, reading on-screen text verbatim (mojibake, typos,
wrong labels), storyboard/footage copy drift.

## Scoped re-runs

For a suspected defect in one beat, prefer a `--focus` re-run naming the
beat and what to watch ("at 0:20–0:28, does the dropdown visibly open before
the selection appears?") over rerunning the generic checklist — focused runs
measurably out-recall generic ones (benchmark: 1 → 3 real findings on the
same video).
