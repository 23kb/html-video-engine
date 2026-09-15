# QC dashboard — the QC surface

`http://localhost:4321/tools/qc-dashboard/` is where video QC happens. Every
review pass on a rendered film runs here: gate results, the render, the
dead-time bands, and Umair's timestamped notes in one page.

Built 2026-08-25. It replaces the old handoff shape — a wall of pasted tool
stdout plus a bare review URL — which cost a round-trip per ambiguous note
("the bit after the address field looks off" → which second?).

## Running it

```bash
node tools/preview.js --no-open
```

Then open `http://localhost:4321/tools/qc-dashboard/`. The dashboard needs
`preview.js` specifically — the video-index route (`/__qc/videos.json`) lives
there, not in bare `serve.js`. Deep-link a video with
`#<slug>`: `http://localhost:4321/tools/qc-dashboard/#<slug>`.

## What it shows

- **Sidebar** — every video with a render or a `qc-report.json`, newest first.
  The dot is the worst gate verdict: green all-pass, amber warnings, red a
  failed gate or an un-withheld PLANNING BUG.
- **Chips** — one per gate section that has actually run. A gate with no data
  shows no chip; absence means "not measured", never "passed".
- **Timeline strip** — dead-time runs as bands (red PLANNING BUG, amber
  borderline, gray comma, hatched = withheld by the second-opinion pass),
  seam-gate cuts as ticks (red = flagged), CUT? spikes as short marks. Click
  anywhere to seek. Hover for the numbers.
- **Filmstrip** — 12 frames decoded client-side by vendored Mediabunny
  (`vendor/mediabunny/`, v1.55.2, MPL-2.0). No ffmpeg call, no contact-sheet
  PNG to generate. Click a thumb to seek.
- **Notes** — timestamped feedback, stored per-slug in `localStorage`.

## The feedback loop (this is the point)

1. Umair plays the render, pauses where something is wrong.
2. Types the note, hits **Add** — it stamps the paused `currentTime`.
3. Repeats for everything spotted in the pass.
4. Hits **Copy for chat** and pastes the block into the session.

The block looks like this:

```
QC feedback — <slug>
- 15.90s — pane re-centers late after the reveal
- 31.80s — payoff chip overlaps the field label
```

**For Claude: a pasted block is a work order.** Each line is one report under
the `video-qc` cost rules — one minimal edit, nothing adjacent. Work in
timestamp order and map each timestamp to its beat before editing (the film's
timeline labels, or `DUR` accumulation, resolve a second to a beat). If a
timestamp lands ambiguously between two beats, ask which — one line of
clarification is cheaper than a wrong build.

Notes that arrive as relative deltas ("slow the typing to 0.8×") are cheap;
notes that arrive as verdicts ("the intro feels off") force a re-spec. The
shapes are catalogued in `video-qc` under "The shape of a good polish note".

## Populating the gates — the handoff step

The dashboard reads `videos/<slug>/qc-report.json`. Before handing a build to
Umair, run the gates so the chips are populated. Two of the five need an
opt-in flag; the rest write automatically.

```bash
node tools/validate-singlehtml.js <slug> --report
node tools/smoke-singlehtml.js <slug> --report
node tools/narration-qc.js <slug>
node tools/dead-time.js <slug>
node tools/seam-gate.js <slug>
```

Shorts also want the band scan, which lands in its own `deadTimeCrop` section
so both readings coexist:

```bash
node tools/dead-time.js <slug> --crop 1080:1200:0:300
```

Values no tool computes go in via the CLI — the motion-audit tier is the
standing case:

```bash
node tools/lib/qc-report.js <slug> --set motionAudit.tier=A
```

`--show` prints the current ledger. Writes are atomic and per-section, so
concurrent sessions and re-runs merge instead of clobbering.

**`smoke-singlehtml` / `dead-time` / `seam-gate` hold the headless lock** —
run them one at a time, never alongside a render (`docs/probe-playbook.md`).

## Reading the chips honestly

- **A chip is a measurement, not a promise.** It reflects the last run of that
  tool. Re-render a film and the render changes while the chips do not — the
  date next to the slug is the tell. Re-run the gates after any re-render.
- **Full-frame vs band dead-time are different questions.** On shorts, the
  full-frame scan reads high by nature (word-by-word captions animate almost
  continuously, so an idle device band hides behind them). The band scan
  (`--crop`) is the one the ≤2s rule is calibrated against. Both chips show;
  read the crop one for shorts idleness.
- **Withheld runs are hatched, not red.** A PLANNING BUG that full-res
  freezedetect or the quadrant re-measure disagrees with is the meter out of
  its depth at 270px, not the film stopping (rf-weight 28).
- **seam-gate cut counts depend on the args.** With no `--cuts` it measures
  every timeline label; a curated `--cuts` list measures the real chapter
  boundaries. Different numbers, both true — note which one the chip came from.

## narration-qc's voice reference (AP-9, 2026-09-02)

Voice-consistency verdicts judge each clip's spectral centroid against a
**stable per-voice reference**, not the batch median: `tts/generate.js` writes
`videos/<slug>/narration/.tts.json` (voice hash + model + stability) and
`tts/voice-reference.json` maps `voice:model:stability` → running-mean
centroid. The old batch median was membership-relative — add, drop or re-roll
one clip and every OTHER clip re-judged (ee 2, wh 4n) — which cost ~2–3 TTS
re-rolls per film. When the sidecar or the reference key is missing, the gate
falls back to the batch median and prints `reference: batch median` so the
chip says which anchor judged it. Fold a passing batch into the running mean
with `node tools/narration-qc.js <slug> --update-reference`; judge against an
explicit centroid with `--reference <Hz>`.

## Scope

QC of the **render** lives here. The HTML film itself is still scrubbed
through `tools/preview.js` (live reload, `?scene=` deep links) — the dashboard
does not replace that, and it never writes to the repo from the browser.

The no-visual-QC split is unchanged: Umair runs the eye and the ear here,
Claude runs the measurement (`video-qc`, "Verify numerically, not by eye").
The dashboard just makes his half faster and his output machine-readable.
