---
name: dev-advocacy-video
description: "Rock-level production line for Umair's Dev Advocacy rock (Rock 4): DECIDES which tutorial video to make from the ranked topic backlog, then drives it end-to-end — doc research, authoring via wpforms-video (its gates apply), review via video-qc, headless render, ship to Kacie, embed in the doc, write back to the wiki (log + scorecard + in-flight state). Also owns the weekly shape of 1 long-form + 2 YouTube/Facebook Shorts, where the shorts are CARVED out of that week's long-form (never built independently) and rendered 9:16 vertical. Use when Umair says 'continue on dev advocacy rock', 'dev advocacy', 'video day', 'next video', 'what video should I make', 'rock 4', 'shorts', 'make a short', 'vertical video', '9:16', or resumes video production. NOT the authoring skill itself (that's wpforms-video), NOT for marketing/launch films (wpforms-marketing), NOT for polish passes on shipped videos (wpforms-video-polish)."
---

# Dev Advocacy Video — the Rock 4 production line

The rock (Q3 2026): "2 x educational / short product video aimed at developers and advanced users for YouTube/social media and docs." Decoupled from launches. Cadence beats polish — David scores the drumbeat.

**Weekly shape (expanded 2026-08, David approved): 1 long-form tutorial + 2 shorts.** The two shorts are **carved out of that week's long-form** — same snapshots, same product truth, same build session. Three independent builds a week is not survivable; one tutorial plus two 45-second slices of its own UI is. See the Shorts branch below.

This skill is the WRAPPER. Authoring belongs to `wpforms-video` (tutorial path), review to `video-qc`, postIntro to `wpforms-postintro`. This skill decides WHAT to build, adds the render/ship/logging tail those skills stop short of, and keeps the rock's state in the wiki.

## Wiki state (absolute paths — sessions run in THIS repo, state lives in the wiki)

- Backlog: `C:\Users\PC\Desktop\umair-wiki\video\wpforms-video-topics-2026-07-21.xlsx` (Summary sheet; read with python/openpyxl)
- In-flight + shipped tracker: `C:\Users\PC\Desktop\umair-wiki\video\ideas.md`
- Rock definition: `C:\Users\PC\Desktop\umair-wiki\rocks\rock4-video.md`
- Work log: `C:\Users\PC\Desktop\umair-wiki\log.md` · Scorecard: `C:\Users\PC\Desktop\umair-wiki\scorecard.md`
- Avatar roadmap (do not block shipping on it): `C:\Users\PC\Desktop\umair-wiki\video\avatar-plan.md`

## Tutorial format contract — these are PROPER tutorials

Rock videos read like tutorials, not films. the-drop / lights-come-on are launch-film precedents for RENDERING only, never for format.

- 🛑 **NO intro card, NO outro/sign-off card — the film STARTS at the postIntro** (Umair ruling 2026-08-28, receipt `webhooks` 8: *"for tutorials, we dont need intros and outros. Kacie will make those. Our videos should start from postIntro."*). This is the delivery architecture ruled 2026-05-19 finally applied: Kacie records the real bookends and `tools/stitch.js` concatenates them around the HTML body. Every tutorial had been building duplicates the pipeline replaces (`introCard`/`signoff` ×25 in webhooks-addon, geolocation-addon, entry-exports, layout-field alike). Consequences: the skeleton drops both cards; `intro` and `outro`/`close` narration clips are no longer generated for tutorials (the `.txt` files, if written, are Kacie's reading scripts); **the doc-URL duty moves to Kacie's outro — RESOLVED 2026-08-28, see below.** Shorts are UNAFFECTED (they keep the Sullie sting + end card, charter 2026-08-13).
- **Shape:** postIntro → numbered step-by-step walkthrough of the REAL UI in the order a user would actually click → **the payoff**: the LAST content beat shows the outcome on a real frontend surface (a `frontend-*` snapshot), not the Save button (rulebook §1; `geo` 6, `ee`, `lf` 8). Where the outcome lives outside the product (webhooks-class) the storyboard declares it explicitly. Tag the beat `// PAYOFF:` in the film — the same "ONE payoff frame that proves it" rule the shorts carve already enforces. No self-authored bookends.
- **The UI is the star.** Cursor, clicks, typing, panel focus, zoom-to-direct-attention. Motion exists to guide the eye, never to perform. No editorial/ad-style beats, no kinetic typography, no atmospheric sequences — that's the `wpforms-marketing` path, not this rock.
- **Narration is instructional and doc-adjacent** ("Click Save. Next, open..."), synced beat-for-beat to the on-screen action. WPForms style-guide voice: conversational, 3rd-grade reading level — **blog-post voice, not robot-doc voice** (Umair ruling 2026-07-22). Pace the read with punctuation (dashes, ellipses, sentence breaks) and `[tone]` tags at the phrase boundaries the motion needs — the default `eleven_v3` model IGNORES `<break>` SSML (see Narration voice below). The video is a doc you can watch — a viewer should be able to DO the steps along with it.
- **PostIntro is a MUST for rock tutorials** (Umair overruled the old "default: skip" 2026-07-22). Build it to the full multi-animation rule via `wpforms-postintro`; the CONCEPT still gets ruled at the storyboard gate — mandatory presence, negotiable content.
- **Connect/OAuth flows are IN scope** for addon tutorials: if the doc walks through connecting an account, the video shows it — real sign-in state + a frozen real OAuth page (`tools/capture-external.js`), never fabricated. Scoping OAuth out caused the entry-automation ch3 rework.
- **Chapter headings live in a top-of-stage pill**, never centered over the product UI.
- **Product UI fills the frame** — mac body ≈ 90% stage width (the skeleton's 1720×868 outer mounts the INHERITED 1380×668 capture geometry at ×1.246377; capture geometry itself is decided per capture WITH Umair — 668 was never agreed as a standard, see `wpforms-video`). A 71%-width frame read as "too small" at first QC.
- ✅ **RESOLVED 2026-08-28 — the doc URL is KACIE'S CALL.** It moves with the outro to her recording; we neither author an outro card nor place the URL on-screen ourselves. Do not re-open this. ~~Outro card carries the doc's FULL URL as on-screen text~~ (e.g. `https://wpforms.com/docs/entry-automation-addon/`) — the doc is the distribution target.

## Narration voice — ElevenLabs + Kacie's voice ID (SHIPPED 2026-07-22)

- **Final narration ships via `node tts/generate.js --video <slug> --engine elevenlabs`** in Kacie's cloned voice (channel-voice continuity — Kacie uploads these to WPForms socials/YouTube). Key = `ELEVENLABS_API_KEY`, voice = `ELEVENLABS_VOICE_ID_KACIE`, both in the repo `.env` (never committed); the engine hard-errors when unresolved. Model default **`eleven_v3`** (fix-round C9, Umair 2026-08-14: "v2 is soulless") — presets: shorts/ad-energy `--stability 0` + audio tags + `--expressive` QC; tutorials `--stability 0.5` + standard gate first. ⚠ v3 IGNORES `<break>` SSML — pacing is punctuation (dashes, ellipses) + `[tone]` tags; v2-era `.txt` needs a pacing rewrite before re-synth (tool warns). `eleven_multilingual_v2` remains available via `--model` for `<break>`-era files.
- **Drafts + QC iterations** may use Voicebox (local, free, fast). Never ship Voicebox audio.
- **TTS-spelling pass before every render:** URLs read as words ("WPForms dot com"), initialisms spaced ("F T P", "A M"). Grep `narration/*.txt` for `\.(com|org)\b|http` before generating.
- **DUR tables are voice-coupled.** After EVERY tts/generate run (draft→final voice switch especially): `node tools/measure-narration.js <slug>` and paste the emitted block — durations WILL shift between voices; hand-estimated DURs caused a whole audio-desync QC class.
- This supersedes the repo's "Voicebox, not ElevenLabs" rule FOR THIS ROCK's videos (Umair decision, 2026-07-22).

## Shorts branch (2 per week, carved from the long-form)

Format + topic contract: `C:\Users\PC\Desktop\umair-wiki\video\shorts-brief.md`.
In-repo mechanics: `docs/vertical-shorts.md`. First two built 2026-08-05:
`videos/short-spam-safety-net`, `videos/short-block-a-country`.

**Mode — Umair picks per short:**

| Mode | When | Shape |
|---|---|---|
| **Micro-tutorial (DEFAULT)** | Any normal week | ONE tiny specific task, 30-60s, real UI, animated Sullie sting + end card (charter 2026-08-13 — never static, never Kacie), cut straight into the UI |
| **Ad-style spot** | Launch weeks only | Motion-design film. Precedents: `the-drop` 49s, `what-counts` 48.8s, `the-update` 35s, `form-analytics-ad-v2` 58.4s, `lights-come-on` 43.1s |

Micro-tutorial is the default on evidence, not taste: @wpforms has **48 shorts, all
micro-tutorials, zero ads**, and the winners are small field-level tweaks (CSV export
5.9K, address fields 5.6K, field size 5.3K) while the ad-flavoured Form Analytics
launch batch sits at 98-889.

**The carve rule.** Never author a short from scratch. After the week's long-form is
built, pick 2 self-contained moments from it, give each its own hook, drop the
bookends, and cut straight into the UI. Snapshots and product truth are already in
hand — **a short never justifies a capture session.** If a short seems to need a
capture, it is the wrong short.

🛑 **A short's postIntro is OPTIONAL — ruled by Umair 2026-08-28.** Include one only when:

1. **The storyboard idea is strong enough to deserve it** — there is a real story worth telling up front, or
2. **The story needs help being set up, or the problem needs help being explained.**

Otherwise cut straight into the UI. A postIntro is not a structural checkbox; it earns its seconds by serving the story or the problem. Umair's words: *"Short's postIntro is optional. If the storyboard is too good, then postIntro OR if we need help in setting up the story or need help in explaining the problem = postIntro."*

The storyboard states which trigger applies, or states that neither does and the short opens on the UI. Six of the seven shorts on disk carry a postIntro and one does not, with no gate either way (receipt `sscg` 1) — that undeclared drift is what this ruling closes.

**Carve SURFACES, never beat structure (ruled 2026-08-28, receipt `scs` 11).**
`short-coupon-switch` obeyed the carve rule perfectly — zero captures, full snapshot
and helper reuse — and was scratched 0/10 with *"Idea was not thought through."* It
inherited the long-form's chapter mechanics instead of earning its own reason to
exist. Before authoring, name and get agreed: **the ONE thing this short teaches**
and **the ONE payoff frame that proves it**. Reusing snapshots is a cost win;
reusing beat structure produces a purposeless subset of the long-form.

Two more from the same rejection:

- **Copy goes to Umair as plain text before any film code** — hook line, every
  caption, outro line. `scs` 9: the hook "Take coupon codes" was pasted into both the
  sting and the title pill, reviewed by nobody, and the opening spent a short's entire
  retention window restating the title in three registers. He is the technical writer;
  this is the artifact where his review is cheapest and my draft is worth least.
- **The sting OWNS the hook text for its duration.** Anything else carrying the same
  words is a duplicate, not a layer (`scs` 8: `gsap.set([deviceBand, titlePill], {autoAlpha:1})`
  ran *before* `sting.play()`, so two near-identical texts plus the postIntro painted
  at once — reported as "text overlapping in intro"). Reveal the pill on the sting's
  exit, never beneath it.
- **A camera duration written as `DUR.bN - k` is a smell** (`scs` 10) — it means motion
  is padding to cover audio, which reads to a viewer as "no purpose of showing this
  screen." Every move must be justified by what it reveals; the honest fix for leftover
  VO is shorter VO.

**Authoring a short:**
1. `cp reference/html-templates/vertical-short-skeleton.html videos/<slug>/index.html`
2. `git add -f videos/<slug>/index.html && git commit` — clone committed BEFORE
   customizing (INV-16); `videos/` is gitignored, hence `-f`.
3. Storyboard still gates, just smaller: angle, 3-4 beats, **which beat carries the
   short** (the hero beat — build it first, spend revisions there), any **rules for
   the whole run** (invariants that hold across every beat, treated as literal
   contracts), snapshot plan, product-truth rulings, and a **seam ledger** — one row
   per cut (exit vector | entry vector | carrier | technique; a short has 2-4 cuts,
   so this is a 3-row table). A cut with no nameable carrier or causality gets fixed
   at the beat level before build — see *Snapshot transitions* in `wpforms-marketing`.
   **Plus a `## Camera plan`** (ruled 2026-09-04 — the storyboarding pass is FULL
   CREATIVE and is owned by `wpforms-storyboard`; invoke it for the storyboard step and
   build from its file): the storyboard DECIDES this short's camera, with reasons, and writes
   `Cadence:` (seconds per landing + why — a short whose UI stays on one panel moves
   only on story turns; one that hops between surfaces moves densely), `Max hold:`,
   `Ease voice:` (`anticipate` / `glide` / `snap` / `punch` — anticipate is one voice,
   not the only one), then one row per landing with a numeric fill and what carries
   the hold. Format: `docs/storyboard-format-morph-chain-2026-05-10.md` *Camera plan*.
   No default cadence exists to fall back on; `composition-scan <slug>` judges the
   built short against the numbers THIS storyboard declared (a `Cadence:` line
   overrides the 2026-08-22 shorts band). Paper → stills → approval → code; a plan
   written from the code afterwards is the defect that made the wpvibe ad's v6
   camera pass "dizzy" (`wva` 7–9).
   🛑 **Name the PROBLEM the short solves, in one sentence, before authoring**
   (ruled 2026-08-28, receipt `sfc` 5). Umair on `short-form-columns`: *"no actual
   mistake, the videos are well made, its just that Shorts are suppose to solve a
   problem. this angle wasnt present."* Execution was clean and the short still
   missed — craft cannot rescue a missing angle after the fact.

   Hook shapes that work on this channel: hidden-feature, stop-doing-X, vs-explainer.
   **`micro-task` was dropped from this menu 2026-08-28** — it carries no problem by
   construction, it is the shape a carve falls into by default, and it produced
   exactly that film. The other three each imply a stake (something hidden, something
   you should stop, a choice between options). If a short genuinely is a micro-task,
   it still has to state the problem sentence, or it has no reason to exist.

   **Pixel discipline (Umair ruling 2026-08-08): a micro-tutorial is an ad-style spot
   that teaches.** Narration pins WHEN beats end — it does not require pixels to
   freeze. Within a narration hold, no pure idle: hold via consequence (cursor already
   traveling to the next control, the toggle's effect still settling, a highlight still
   sweeping). True stillness is allowed only as a **reading hold** — the viewer must
   read a panel to follow along — and is capped at ~1.5-2s per hold. The D1 recipe
   ("How to hold without idling") is in `wpforms-marketing`.
4. Narration → `node tts/generate.js --video <slug> --engine elevenlabs` →
   `node tools/measure-narration.js <slug>` → paste DUR. Model resolves to
   `eleven_v3` (tool default since fix-round C9; the stale `.env` v2 pin was
   retired the same day — Umair's 2026-08-14 "v2 is soulless" ruling
   supersedes the earlier v2 ear pick). Shorts preset: `--stability 0` +
   audio tags; QC with `--expressive`.
5. Validate → smoke → `node tools/render-singlehtml-audio.js <slug> --bgm <bed>` (the 0.17
   shorts band is the default; full ad sound per the 2026-08-13 charter — `--bgm none`
   only when the SFX plan carries the bed) → **ffprobe must read 1080×1920** (no `--resolution` flag needed; resolution comes
   from the `.stage` box via `tools/stage-size.js`).
6. **`node tools/dead-time.js <slug>` on the render — standard for every short.**
   Run the band scan too (`--crop 1080:1200:0:300`) — it lands in its own
   `deadTimeCrop` chip on the dashboard, and it's the reading the ≤2s rule is
   calibrated against. The full-frame number reads high on shorts by nature.
   The shorts reading of the report: reading holds are fine; any run where nothing
   is even settling — no cursor in flight, no consequence resolving, no highlight
   moving — is a fix, and any run past ~2s is a fix regardless. Don't chase the
   total-% number (narration content reads high by nature); chase the runs. Findings
   go in the handoff next to the validator results — the numbers are evidence for
   Umair's eye, not a hard gate.
7. **Run the frame sweep per `docs/vertical-shorts.md` ("Handoff: the frame
   sweep") — mandatory before every shorts handoff; report what was checked.**

**Portrait gotchas that will bite** (full derivation in `docs/vertical-shorts.md`):
camera zoom floor is **1.78** (must clear `flyToElement`'s ×0.96 dip, or bars flash
for ~0.3s per move); **vertical camera panning is unavailable** — scroll the admin
pane instead; **never call `camReset()`** — zoom 1 is bars by definition.

**Shorts skip:** Kacie bookends and 4K. They KEEP the animated Sullie sting + end card,
BGM + SFX (charter 2026-08-13); the postIntro is optional by ruling (above).
`wpforms-motion-audit` is mandatory — the bookends are editorial beats (CLAUDE.md path table).

## Pipeline

### 0. Resume check (every run, before anything)
Read `ideas.md` → "In flight". If a video is mid-pipeline, resume at its recorded stage. Only pick a new topic when nothing is in flight.

### 1. Pick the work (Claude decides, Umair confirms)

A run is one of three things — check in this order:
1. **Something built but unshipped?** Ship it. Two finished long-forms sat at QC with
   Rock 4 showing 0 shipped for Q3 (2026-08-05) — the bottleneck was QC and shipping,
   not production. Building a third would have added inventory, not rock points.
2. **This week's long-form not built?** Build it (steps 2-6 below).
3. **Long-form built, shorts not carved?** Carve the 2 shorts (Shorts branch above).

Then, for a long-form:
1. Read the xlsx Summary sheet + `ideas.md` "Shipped" list.
2. Pick = highest-ranked Tier A topic not shipped and not in flight. **Standing override: Entry Automation is video 1 (David named it in the 1:1).**
3. State the pick with its numbers (sessions / revenue / video-on-doc) and the one-sentence reason. Confirm before spending time. If Umair names a topic, skip the ceremony.

### 2. Doc research → angle note (~15 min)
Fetch the live doc (curl, not WebFetch). Reduce to ONE teachable promise — not the whole doc. Angle note: promise, 3-5 beats, target runtime (1-3 min; "short product video" is the lane), UI states each beat needs. This note is the intake for `wpforms-video`.

Audience check: does it teach a developer or advanced user? If it drifted general-audience, flag it (Tier C needs David's OK).

🛑 **Idea/copy gate** (rulebook §9; `road` 2, `lf` 7): the angle note plus the actual hook/copy go to Umair for a yes/no BEFORE authoring. A topic pick authorizes the BUILD, never the ANGLE — the same rule the shorts branch already carries.

**Diverge before the gate (added 2026-09-02):** the promise is doc-derived, but the HOOK (and a short's problem sentence) goes to Umair as options — 3–5 distinct directions (seed-string trick: random alphanumeric strings, one creative direction interpreted from each), at least one deliberately ambitious beside the safe pick. Films get scratched on idea, not execution (`cad` 9 / `scs` 9 / `sfc` 5); divergence costs one message here vs a rebuild later. Ideation-only — post-approval the angle is a literal contract. Source: Anshu Chimala (Lenny's Newsletter).

### 3. Author — INVOKE `wpforms-video` (its rules govern)
Hand over the angle note + the Tutorial format contract above. That skill owns: snapshot inventory (`tools/list-snapshots.js`), capture (real UI only, local WP — **ask which local site if not stated**; needs WPForms Pro + target addon active), the 🛑 storyboard approval gate, single-HTML authoring (skeleton clone → beats on the master timeline), narration (draft voice per Narration section — Voicebox for drafts, confirm running at `http://127.0.0.1:17493`; Kacie voice ID for finals), validation, review URL.
- PostIntro: REQUIRED per the format contract (full multi-animation rule via `wpforms-postintro`); the concept gets ruled at the storyboard gate.

### 4. Review loop — per `video-qc`
Umair owns all visual/audio judgment. Minimal correct edits, review URLs back, wait. No self-QC theater.

**QC runs in the dashboard** (canonical since 2026-08-25): populate the gate
ledger, then hand over `http://localhost:4321/tools/qc-dashboard/#<slug>`
alongside the film's `?scene=` URL. Umair's notes come back as a timestamped
block — each line is one report, worked in timestamp order. Commands and the
full contract: `video-qc` ("The QC dashboard is the QC surface") and
`docs/qc-dashboard.md`. Needs `node tools/preview.js --no-open` running.

### 5. Render (Claude renders — NEVER OBS)
```bash
node tools/render-singlehtml-audio.js <slug> --resolution 3840x2160 --bgm-volume 0.12
```
- `tools/render-singlehtml-audio.js` IS the ship renderer: it records the real run, lays each narration clip at its `__sched` cue, side-chain-ducks the BGM under it and muxes everything into the MP4 itself — no separate mux step, no silent intermediate. `--bgm-volume 0.12` is the long-form band (the default 0.17 is the shorts band). Resolution defaults to the film's `.stage` box (`tools/stage-size.js`); `--resolution` overrides it. Flags: `docs/render.md`.
- **4K (3840x2160) is the target.** Nothing has shipped above 1080p yet, so on the first 4K run: render a short variant (`--max-seconds 30`, or `--query skip=<scene>` for a deliverable cut — there is no per-chapter render flag), inspect layout/text at 2x, then the full render. If the player breaks at 4K: ship 2560x1440 and log the gap to the rock file's tool-work queue.
- Preflight: `ffmpeg` + `ffprobe` on PATH. The muxer pads audio to a whole second (`ceil(dur + 0.25)`): a "frozen tail" flagged inside that pad is the pad, not a defect — the real check is "no frozen tail under LIVE audio" (`docs/render.md`).
- QC the MP4: ffprobe resolution/fps/duration; audio present + synced at start/middle/end; spot-check 3 frames.

### 5b. Kacie bookends (standing delivery shape since 2026-07-23)
Real Kacie on camera opens and closes every shipped tutorial; body stays HTML + her cloned narration voice. No synthetic face — the avatar route failed QC 3x and is parked (`tools/avatar/README.md`).
1. **At body-QC pass** (parallel with render, don't serialize): Umair sends Kacie `docs/kacie-intro-outro-recording-spec.md` + this video's `narration/intro.txt` / `outro.txt` as reading scripts. Nudge batch-recording (several videos per sitting).
2. **Intake on delivery:** `tools/avatar/check-base.py <file>` validates framing → trim the 3-4s pre/post-roll → loudness-normalize against the ElevenLabs narration (`tools/sfx/normalize.mjs`).
3. **Stitch:** Kacie intro → postIntro/body → Kacie outro, via `tools/stitch.js`. No HTML end card — the doc URL travels with Kacie's outro (RESOLVED 2026-08-28, format contract above).
4. **Seam QC (Umair):** the two real-mic ↔ cloned-voice cut points; prefer landing intro→body under a chapter-card/music moment.
5. **Cadence guard:** if her footage is days out, Umair decides ship-plain vs hold — cadence beats polish is still the law; never silently hold a finished video.

### 6. Ship + close the loop
1. MP4 to Kacie (she uploads to WPForms socials/YouTube).
2. When her upload is live: **embed it in the matching wpforms.com doc** ("docs" is a named distribution target in the rock). Metric: docs-without-video baseline 231 (2026-07-21) ticks down per embed.
3. **Doc-staleness feedback:** log any doc↔product divergences found while building into `docs/product-truth/<feature>.md` and TELL UMAIR — he owns the docs; each video doubles as a doc audit. (Precedent: entry-automation found the live addon renders the Drive account dropdown directly — the doc's "click Add New Connection" step no longer occurs.)
4. Wiki write-backs (absolute paths above): one-liner to `log.md`; bump the `scorecard.md` videos row; move the topic to "Shipped" in `ideas.md`; clear "In flight". Remind Umair to keep rock status honest in the collective agenda (QR behavioral ask).

## Standing rules

- Timebox: new-surface video ≤ half a day; existing-surface ≤ 3h. Overrun → cut scope (shorter video, existing postIntro kind), never the sleep (QR: sustainability is explicit).
- Pausing mid-video: write slug + stage + next action to `ideas.md` "In flight" before the session ends.
- Tool development never happens inside a video slot. Gaps (4K verification, audio one-command mux, avatar phases) go to the rock file's tool-work queue.
- **The 9:16 vertical path already exists** (built 2026-08-05, outside a video slot): `tools/stage-size.js` + portrait skeleton + `docs/vertical-shorts.md`. Don't rebuild it, and don't "fix" a 1080×1920 stage back to 1920×1080 — CLAUDE.md anti-pattern #9 and INV-1 both carry the exception.
- Launch/marketing clips are NOT this rock (Rock 3 / wpforms-marketing).
