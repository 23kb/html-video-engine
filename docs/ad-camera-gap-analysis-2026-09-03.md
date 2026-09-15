# Why the first WPVibe ad stayed dull — the camera gap (2026-09-03)

Subject: the first WPVibe ad at v5 (44s, shipped HD) against the reference set
(Shipper 27s, Codex 28s). Umair's verdict on v5:
content and accuracy good, "the animations weren't there, speed slow, motion design non-existent."
Five QC rounds — real Claude UI, real fragments, US locale, HD render — did not move that verdict.

**Short answer to "is it a storyboard issue?": yes, but the storyboard did what the repo's rules
told it to do.** Every change from v1 to v5 was about WHAT was on screen. Nothing in the process
touched HOW it was framed. Fixing the storyboard format alone would have produced the same film,
because three things upstream of it pushed toward one parked stage.

## What the frames say

Fresh keyframes from the shipped render, 2 fps windows of ours, Codex and Shipper:

| | Ours (44s) | Shipper (27s) | Codex (28s) |
|---|---|---|---|
| Distinct framings | 5 | ~14 | ~20 |
| Longest hold on one framing | 23.7s (11.5 → 35.2) | ~2s | ~1.5s |
| Re-frame cadence | never in the core | every 1–2s | every ~1s |
| Camera scale range | 1.00–1.04 | wide ↔ macro toggle | full landscape ↔ a button at 40% of frame |
| Subject fill at the payoff | email field ≈ 8% of frame height | toggle ≈ 30% | cursor + send ≈ 40% |

In our 12–18s window all twelve frames are the same two-panel layout; only the contents change.
Shipper holds one subject (the build queue) for six seconds too — and re-frames it five times by
scrolling and pushing closer. The first-pass analysis said the references re-frame every 2.5–4s;
measured, it is closer to every second.

Ruled out (Umair): real UI is not the cause (the references are full of it); typing pacing is fine.

## Where it broke, ranked

1. **The doctrine said not to do what the references do.** `docs/storyboard-format-morph-chain-2026-05-10.md`
   §5: "the camera follows the morph host. It does NOT cut to staged compositions," with camera
   cuts listed as the slide-projector anti-pattern. `wpforms-marketing`: ad default = "1.0–1.3s per
   move, land-and-HOLD, whip speeds only on explicit ask." The motion audit rated the film A and
   wrote "no camera flights by design." The rules conflated two different things — cutting to a
   new subject with no carrier (bad) and re-framing the same subject (what the references do
   constantly). The repo had no word for the second one, so "one morph host" became "one parked
   window."
2. **The storyboard had no frame column that could fail, and it stopped existing at v4.** The shot
   list's "subject & hero frame" column read "window center, 880px wide" / "form card at 0.7 fill"
   — every row a mid-shot. It self-reported "9 compositions, longest hold 3s"; nobody measured it.
   Then the v4 QC round replaced the chips with the persistent two-panel Claude window in code and
   the storyboard was never amended. From v4 on, the 24-second core had no storyboard at all.
3. **There was no camera for editorial DOM.** Every camera verb in the repo (`flyToElement`,
   `cinematicFlight`, `punchIn`, `whipPan`) needs an `IframeManager` and iframe-doc selectors; the
   shorts verbs are also clamped to the portrait zoom band. The ad skeleton shipped no camera
   wrapper. The film invented its own `#zoomWrap` and used it for two 4% pushes. A perfect
   frame-first storyboard would have had nothing to call.
4. **The one gate that measures composition was blind to this film.** `dead-time` passed at 50%
   dead frames with five planning-bug runs withheld; `seam-gate` passed. `composition-scan`, which
   targets 12–18 framings with holds under 10s, answered "no beat() manifest — not supported" in
   static mode; `--play` was never run. Rulebook §6 "editorial v1 is pre-render → run
   composition-scan --play" is marked partial. Nothing in the battery could say "5 framings, 24s
   hold."
5. **Pacing (smaller, real).** Each task repeats the same 5–6s template — scroll, type, dots,
   stream, payoff — at believable app speed. The references land a state in 1.5–2.5s and cut.
   Sweeps and breaths were added to satisfy the dead-time meter, not to design motion.

## What landed today (2026-09-03)

| # | Fix | Where |
|---|---|---|
| 1 | Doctrine: "composition cut" split from "re-frame"; **the host stays, the frame moves**, ≥1 re-frame per 4s in an ad, zoom wide→close. "Land-and-HOLD" re-scoped to move smoothness, not move frequency. Parked stage added to the anti-pattern list | `docs/storyboard-format-morph-chain-2026-05-10.md` §5 + anti-patterns; `.claude/skills/wpforms-marketing/SKILL.md` (transitions bullet + new *Ad camera doctrine* section + checklist); `CLAUDE.md` anti-pattern #2 |
| 2 | Storyboard format: `## Camera plan` section required for ad-style films — one row per landing with numeric fill, verb + duration in, hold ≤4s, what carries the hold. Approval blocks on a missing number or a long hold; any QC change to what fills the frame re-opens it | `docs/storyboard-format-morph-chain-2026-05-10.md` (new section after Shot list) |
| 3 | Stage camera for editorial DOM: `makeStageCamera` — `#lens` transform-only wrapper, verbs `punch / macro / whip / pullBack / drift / cut`, decomposed by construction (crouch → drive on two eases, or translate/zoom on different curves), time-ordered with mid-air overwrite protection, pose-logged | `docs/examples/single-html-ad-skeleton.html` (ships with the wrapper + a 6-landing plan); proven video-local in the first WPVibe ad; promote to `videos/_shared/` on second use |
| 4 | Gate: `composition-scan` reads label-driven films (the literal `at:` times → planned landings + longest planned hold), has an **ad band** (rate-based: ≥1 landing / 3s, ≤1 / 1.2s, holds ≤4s, end card ≤6s) picked up from `data-film-path="ad"` or `--band ad`, uses the stage box for its Δ thresholds in that band, and writes the `compositionScan` qc-report section (measured in `--play`; planned with `--report`) | `tools/composition-scan.js` |
| 5 | Motion audit ceiling: parked stage (hold >6s, <1 landing / 3s, zoom range <0.3) → max B, measured not estimated | `.claude/skills/wpforms-motion-audit/SKILL.md` HARD RULE 3 |
| 6 | Rulebook rows `wva 1–6` (camera plan, follow ≠ park, re-open on QC change, repeated templates, editorial DOM camera, compression before carriers) + receipt key | `docs/rulebook.md` §4, §6, receipt keys |
| 7 | **The film itself, v6:** 25 landings (+ opening frame), longest in-film hold 2.7s, zoom 1.0–2.2, content timing untouched. Camera plan written into `storyboard.md`. Measured: `composition-scan --play` 25 compositions in band, no hold over cap | The film's `index.html` and `storyboard.md` |

## Not done — deliberately

- **The compression pass on this film** (dots ≤0.5s, post-payoff dwell ≤0.8s). It re-times every
  subsequent tween and SFX cue in a 900-line file; the camera was the confirmed core gap, so it
  went first. The rule is on paper (rulebook `wva 6`, marketing doctrine §4) for the next ad, and
  this film gets it as a follow-up if the camera pass reads right on QC.
- **Promotion of `makeStageCamera` to `videos/_shared/`** — the promotion gate is second use.
- **A validator check for `## Camera plan` presence** — `composition-scan` static already fails a
  label film with no camera calls; the storyboard-section check is a one-line addition to
  `validate-singlehtml` §8 once a second ad carries the section (same season rule as the shot list).
- **The reference-diff stills sheet** (ours and a reference frame alternating on one sheet) —
  proposed in the first-pass analysis; the measured gate covers the same failure with a number.

## How to check it

```
node tools/composition-scan.js <slug>            # planned — reads the at: times
node tools/composition-scan.js <slug> --play     # measured — pose log, writes the chip
node tools/validate-singlehtml.js <slug>
node tools/smoke-singlehtml.js <slug> --seconds 48
```

## QC notes on the v6 camera pass (Umair, 2026-09-04) — recorded, not acted on

Verbatim: "making me dizzy watching this because of so much movement. Also, the easing is wrong, we
need Anticipate ease. You said it's a storyboard issue. You didn't change anything in the storyboard
now. Does this system know how it should write storyboard now? Don't do edits on this video, just
take notes."

1. **Too much movement.** 25 landings in 41s (one every ~1.7s), moves of 0.35–0.7s, zoom swinging
   1.0 ↔ 2.2 repeatedly. The parked camera was over-corrected into a busy one. The ad band written
   into `tools/composition-scan.js` (≥1 landing / 3s, ≤1 / 1.2s) and the "≥1 re-frame per 4s" line in
   the doctrine are miscalibrated on the upper side and are NOT confirmed values.
2. **Wrong ease.** Camera moves need an **Anticipate** curve — pull slightly away from the target,
   then drive, then a soft landing (the AE/Flow "Anticipate" shape, `back.in`-family) — not the
   crouch-toward + overshoot landing (`cam-punch-land`) the stage camera uses now.
3. **Storyboard came after the code.** This film's `## Camera plan` was derived from
   `scheduleCamera()` after the fact. The rule (format doc + marketing skill) says plan first; the
   session that wrote the rule did not follow it. Plan on paper → stills pass → approval → code.

Status: no video edits. Doctrine numbers, the default camera ease, and the plan-first gate wait for
Umair's recalibration.

## Recalibration (Umair's ruling, 2026-09-04) — system-wide, no video edits

Ruling, verbatim in substance: too much movement "should depend on video type and not forced — in this video our UI had to stay the same so too much motion made little sense"; ease "not only restricted to anticipate"; "cadence yes, ease yes but not only anticipate, yes on camera plan — make sure the skill making the storyboard knows this"; "the storyboarding skill for editorial and shorts videos should be full creative"; "the cadence has to be set by the storyboarding skill, because videos will have and should have different cadence."

What changed (the 2026-09-03 fixed numbers are withdrawn):

| Where | Change |
|---|---|
| `docs/storyboard-format-morph-chain-2026-05-10.md` | §5: cadence is declared per film by the storyboard, never a system number. Camera plan: required header `Cadence:` (+why) / `Max hold:` / `Ease voice:` / `Landings, Zoom range`; ease-voice table (anticipate / glide / snap / punch); "the storyboarding pass is full creative"; paper → stills → approval → code. Anti-patterns: *Parked stage* + *Busy stage* |
| `.claude/skills/wpforms-marketing/SKILL.md` | *Ad camera doctrine* rewritten to five rules: cadence per film, full-creative storyboarding with the plan before code, four ease voices, stage camera with voices, compression pass. Gate judges against the declared cadence; UNDECLARED = storyboard defect |
| `.claude/skills/dev-advocacy-video/SKILL.md`, `docs/vertical-shorts.md` | Shorts storyboards carry the same `## Camera plan` header; the storyboard sets the short's cadence (a `Cadence:` line overrides the 2026-08-22 shorts band) |
| `.claude/skills/wpforms-motion-audit/SKILL.md` | Ceiling renamed *Camera off its own plan*: no plan, or measured landings off the declared cadence, or a hold over the declared max → max B. Both parked (v5) and busy (v6) fail it |
| `tools/composition-scan.js` | Parses `Cadence:` / `Max hold:` / `Ease voice:` from the storyboard's Camera plan and derives the band from them (tolerance 0.6–1.5× the declared spacing). Ads have no fallback band → UNDECLARED. Shorts/long-form fixed bands remain only as fallbacks. `cam.move(` recognised |
| `docs/examples/single-html-ad-skeleton.html` | Stage camera gains ease voices (`voice:` per move, film default from the plan): anticipate (away → drive → soft land, `cam-settle`), glide, snap, punch. Framing presets `move / punch / macro / whip / pullBack` separate WHAT from HOW. Sample plan calmer, voice declared |
| `docs/rulebook.md` | `wva` 1–2 amended (declared cadence); new `wva` 7 (no cadence from a rule), 8 (ease voices), 9 (plan written from code is backwards) |
| `CLAUDE.md` anti-pattern #2 | "do not park it or busy it — at the cadence and ease voice the storyboard declares" |

Untouched by ruling: the film, its storyboard and its camera code. Its storyboard has no `Cadence:` line, so `composition-scan` now reports it UNDECLARED — which is the truthful state of a plan that was written from the code.
