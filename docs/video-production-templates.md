# Video Production Templates

Last updated: 2026-04-29

Reusable scaffolding for guided video sessions. Pair with
`docs/current-workflow.md` (the workflow itself) and the audit.

Sections:

1. Storyboard Approval Template
2. Optional Video Handoff Template
3. Chapter Authoring Checklist
4. Snapshot Inventory / Capture Checklist
5. Token Budget Checklist
6. Standard Non-Visual Smoke Test Proposal

---

## 1. Storyboard Approval Template

Post this in chat after research, before any code. Wait for explicit approval.

```markdown
# Storyboard: <video title>

Slug: <slug>
Sources read: <urls / repo paths>

Surface mode: <iframe (default for tutorials) | editorial (ad-style) | mixed (hybrid postIntro)>
Swap style for cross-snapshot chapters: <flipBridge (preferred for cream-bleed kill) | morph | cover>
Break style default: <glide (default, continuous pan) | soft-dolly | dolly | whip | hold>

## Angle
<One paragraph: what this video proves and to whom.>

## Length target
<e.g. 60–90s total, postIntro 12–15s>

## PostIntro concept
<Required unless user explicitly skips it. Describe the original visual concept
beat in 2–3 sentences: what changes on screen, what product truth it uses, and
why it previews the topic. Use `docs/postintro-patterns.md` for examples.
Existing cinematics may be referenced for code patterns only after naming the
exact implementation pattern needed; reuse one only if its product semantics
match. Do not use a second title card as postIntro.>

## Chapters
1. <chapter-id> — <one-line purpose> — mode: per-beat-narration | parallel | audio-cued | descriptor-if-simple
2. ...

For field videos, start by adding/selecting the field from the builder sidebar
unless the user says the field is already present. For `Dropdown`, `Multiple
Choice`, and `Checkboxes`, include AI Generate Choices by default: button,
modal, generated options, and insertion/apply result.

## Narration drafts
- postIntro: "<text>"
- <chapter-id>: "<text>"
- ...

## Snapshot plan
| Chapter / beat | Base snapshot | Final state needed | Status | DOM-derived source of truth (if applicable) | Staged-state note for final summary |
|---|---|---|---|---|---|
| ... | snapshots/<base> | <what the viewer sees> | exists / DOM-derived / NEEDS CAPTURE / ASK USER | `node tools/field-state.js --field <name> ...` / real DOM snippet path / existing captured DOM | <one line: base + what was staged> |

Status legend:
- **exists** — real captured UI under `snapshots/<name>/`, used as-is.
- **DOM-derived** — staged on top of an existing base snapshot, with a
  product-truth source: `node tools/field-state.js --field <name> ...`,
  a real captured DOM snippet, or existing captured DOM cloned in place.
  Source must be named in the row. The field-state inventory remains canonical,
  but query it with `tools/field-state.js` instead of full-reading it.
- **NEEDS CAPTURE** — base structure missing or not truthfully derivable;
  capture before chapter code.
- **ASK USER** — unclear which exact state is intended. Pause, do not guess.

Forbidden: fabricating a product-looking snapshot folder or hand-writing
WPForms-shaped HTML to avoid capture or DOM derivation.

## Open questions for user
- ...

## What I will NOT do without further approval
- Touch engine/runtime/shared/chapter code in other videos
- Capture new snapshots not listed above
- Add new cinematic modules
- Drop postIntro instead of replacing a bad postIntro choice
```

Approval rule: explicit only. Don't infer it from "ok" in passing.

---

## 2. Optional Video Handoff Template

Use only when the user asks for a persistent handoff doc. Keep concise. Separate
implementation issues from story direction (see WPForms AI handoff for the
shape).

```markdown
# <Title> Handoff

Status: <date>, <slice or final>

Slug: `<slug>`

Preview URL:
http://localhost:4321/scenes/player.html?video=<slug>

## Direction
<2–4 bullets: angle, length, postIntro, story constraints, recording flags
like manifest.hud: false.>

## Current Slice
<What got built this pass: intro, postIntro, chapter list, narration set.>

## Source UI Inventory
<Link to docs/<slug>-state-inventory.md if a separate doc, OR list snapshots
used + any DOM-staged overlays.>

## Production Issues And Fixes
<One bullet per real issue hit. Issue → Fix. Keep one-off issues here, NOT
in the storyboard. Reusable lessons go to two-video-pattern-audit.md only
if proven again.>

## QC Findings — Open
<Things the user flagged that are NOT yet fixed. Do not mark "done" without
user confirmation.>

## Verification
- node tools/validate-video.js <slug> → <result>
- Smoke: <result, sceneDone, bootError, consoleErrors, missingResources>

## Review URLs
These are playable HTML review URLs. MP4 capture is external, but the agent
still provides these URLs after validation.

Chapter-only:
- http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>
Full:
- http://localhost:4321/scenes/player.html?video=<slug>

## Notes To Carry Forward
<Story-level decisions worth remembering: what was rejected and why.>
```

---

## 3. Chapter Authoring Checklist

Run mentally before writing each chapter file. Most repeat-mistake categories
from prior videos trace back to skipping these.

- [ ] Imports are bounded:
      - Legacy chapters import only local selector files.
      - Descriptor chapters are secondary and may import `defineChapter`
        from `/runtime/chapter-api.js` plus local selectors.
      - No other direct imports from `runtime/`, `engine/`, or
        `scenes/` during normal authoring. Helpers flow through `ctx`,
        descriptor verbs, or prep ops.
- [ ] New videos are legacy/effect-mode by default.
      Descriptor mode remains supported only for simple closed-vocabulary
      chapters where it preserves the approved beat. Do not use descriptor mode
      to weaken postIntro, timing, or custom choreography.
- [ ] Chapter uses base snapshots + DOM prep / state derivation where
      truthful. No fabricated product UI. Staged states are documented
      in the storyboard's snapshot table and final summary (base snapshot
      + what was staged + product-truth source). Write a handoff doc only
      if requested.
- [ ] Protected core untouched: `engine/*`, `runtime/player.js`,
      `runtime/chapter-runner.js`, `runtime/scene-helpers.js`,
      `runtime/transitions.js`, `runtime/frame-driver.js`,
      `runtime/frame-adapter.js`, `runtime/shared-scene.js`,
      `runtime/camera-poses.js`, `runtime/pause-manager.js`,
      `scenes/shared.js`, existing video chapters, snapshots. New
      `runtime/*` files are also off-limits in normal authoring.
- [ ] **Phase F lints clean:** `node tools/validate-video.js <slug>` runs
      audio-vs-duration, pausableRaf-usage, and registerTimeline-paused
      lints. Review warnings; treat them as soft gates.
- [ ] **Determinism check:** `node tools/lint-determinism.js --video <slug>`
      passes. No `Date.now()`, no unseeded `Math.random()`, no `fetch()`
      at runtime. See `docs/deterministic-logic.md`.
- [ ] **`pausableRaf` for any author RAF loop** in chapter or cinematic
      code. Vanilla `requestAnimationFrame` won't honor scrubber pause.
      See `wpforms-gsap-rules` skill.
- [ ] **Registered timelines paused before registration.** Any
      `registerTimeline(tl, { id })` call requires `tl` built with
      `gsap.timeline({ paused: true })` and all tweens added before
      registration (duration is snapshotted).
- [ ] Mode chosen deliberately: `parallel` / `audio-cued` / `per-beat-narration`.
      See `CLAUDE.md` "three modes" section.
- [ ] No beat exceeds ~6s of animation under a single narration clip. Split
      into sub-beats with their own mp3.
- [ ] Default canvas/prep is applied in `setup({ doc })` for legacy chapters
      or declarative `prep` ops for descriptor chapters. Either way, keep it
      grounded in real product truth: Name / Email / Message + topic field,
      admin bar removed, addon cruft hidden. Do not import `runtime/dom-prep.js`
      directly in new chapter modules unless explicitly approved as a
      system-change exception.
- [ ] Snapshot/link hygiene checked. Suppress iframe anchor navigation and
      confirm captures do not contain duplicate `<body>` blocks.
- [ ] Cross-tab clicks use a snapshot swap (`swapToSnapshot()` via ctx),
      not a guess at DOM that isn't loaded.
- [ ] Highlights stay inside the Mac frame. Anything outside needs the
      `.stage` clip-path (set by `body.with-stage-chrome`).
- [ ] `focusPull` clones append into `.stage` by default (verified
      contract — `clipToStage: true` in `runtime/focus-pull.js`). Don't
      override unless you have a specific reason; the stage clip-path is
      what keeps the sharp clone inside the recording rectangle.
- [ ] BGM volume changes use `setBgmVolume()` / `stopBGM()`.
- [ ] If the chapter changes snapshots mid-flow, `setup()` runs inside the
      transition, before the cover drops, to avoid raw-iframe flash.
- [ ] Final manifest sets `"hud": false` for recording.
- [ ] Builder-snapshot beats keep `camera.level >= 1.0`. Below 1.0 the
      Mac frame chrome leaks around the iframe (WPForms AI hardfix).
- [ ] Validator clean: `node tools/validate-video.js <slug>` → 0 errors.
      Validator defaults to chapters listed in `manifest.chapters[]` —
      orphan chapter files are reported as `[INFO]` and skipped. Pass
      `--all-chapters` only when inspecting orphans or pre-cleanup work.
      Validator also flags missing snapshots (error), missing narration
      mp3s, builder camera < 1.0, hud-not-false, unknown postIntro kinds,
      and per-beat-narration coverage.

---

## 4. Snapshot Inventory / Capture Checklist

Required **before** storyboard proposal. Catches the WPForms AI fake-fixture
class of mistake. Exact product UI is the core promise — do not synthesize a
product-looking snapshot.

### Step 1: Inventory existing

- [ ] List `snapshots/` and read `snapshots/CATALOG.md` if present.
- [ ] Cross-reference `snapshots/index.json` and `snapshots/readiness.json`.
- [ ] For each chapter in the proposed storyboard, name the snapshot.
- [ ] **Cleaned builder snapshots are promoted in-place (Slice 3d).**
      Use the normal `builder-field-options-*` slugs. The cleanable
      slugs were promoted on top of their raw originals: the canvas
      collapses to the 6-field baseline (Name, Email, Message, Phone,
      Multiple Choice, Checkboxes) plus the field under test, with the
      active field on row 3. No duplicate `-clean` sibling set is kept.
- [ ] **Compose, don't capture, for state variants.** The old
      per-state variant captures (e.g. dynamic-choices on, image-choices
      uploaded, richtext toolbar rendered, content editor active, file-
      upload modern camera on) were intentionally deleted as artifacts
      of the "every state needs a snapshot" mindset. Future videos
      should pair a clean base snapshot with DOM-derived states grounded
      by `node tools/field-state.js --field <name>` or real captured DOM.
      Recapture only if a structural base is genuinely missing.

### Step 2: Classify each needed state

Each row in the storyboard's snapshot table must end up as one of:

| Status | Meaning | Action |
|---|---|---|
| `exists` | Real captured UI under `snapshots/<name>/` | Use as-is |
| `exists + DOM stage` | Real base + product-derived modal/markup overlay | Document the overlay source (user-supplied real HTML/classes) |
| `NEEDS CAPTURE` | Exact UI state missing | Capture from live WPForms before chapter code |
| `ASK USER` | Unclear which exact state is intended | Pause, ask, don't guess |

Forbidden: a fourth status of "I'll build a snapshot folder that looks like
WPForms." If the temptation appears, stop and re-read the production-truth
rules in `docs/current-workflow.md`.

### Step 3: Capture pass (if needed)

- [ ] Use `capture/capture.js` with the configured `WP_URL`, `WP_USER`,
      `WP_PASS`, and the target URL/state for the current project. Don't
      hardcode site or credentials in the storyboard or chapter code.
- [ ] Verify the captured folder has only one `<body>` block.
- [ ] Add the snapshot name to the storyboard's snapshot table with status
      flipped to `exists`.

### Step 4: Cleanup expectation

DOM prep should hide cruft, not blank the useful preview. After cleanup the
visible form must still show the intended Name / Email / Message + topic
field unless the chapter explicitly stages otherwise.

---

## 5. Token Budget Checklist

Cost is a product requirement (WPForms AI consumed ~a full Pro session — not
acceptable as the steady-state). Treat these as defaults; only deviate with
reason.

### Session entry

- [ ] Read `docs/current-workflow.md` first. Do not reread historical plans
      to reorient.
- [ ] Use `docs/examples/legacy-manifest-skeleton.md`,
      `docs/examples/legacy-chapter-skeleton.md`,
      `docs/examples/legacy-postintro-effect-skeleton.md`, and
      `docs/examples/legacy-audio-cued-skeleton.md` as the first copy targets
      for new video code.
- [ ] Use `node tools/field-state.js --field <name> [--summary]` for
      field-state evidence. Do not full-read
      `docs/wpforms-field-state-inventory.md` during normal authoring.
- [ ] Do not read accepted reference packages during normal startup. Use them
      only as evidence/debug material after naming the exact implementation
      pattern needed.
- [ ] Default to legacy-first skeletons for new-video learning. Descriptor
      examples are secondary references only.
- [ ] Use `docs/postintro-patterns.md` for postIntro examples instead of
      opening product-specific video packages for inspiration.
- [ ] No broad `Grep`/`Glob` against the whole repo unless the search is
      genuinely scoped to unknown territory.

### During build

- [ ] Storyboard before any code.
- [ ] After storyboard approval, build toward a full first draft unless the
      user asks for slice-by-slice QC. Validate meaningful slices internally.
      Stop early for missing capture, protected-core pressure, or visual-risk
      review. For ambitious postIntros, build the approved animation with the
      proven HTML/CSS/SVG/GSAP surfaces and expect a user QC revision pass.
- [ ] One standard non-visual smoke per slice (see section 6). Don't invent
      a custom Playwright snippet each time.
- [ ] No visual QC (screenshots, preview snapshots, eval) unless the user
      explicitly asks. Two failed fix attempts on a stubborn bug is the
      threshold to ask.
- [ ] No fake snapshots ever. Capturing real UI is cheaper than the rework.
- [ ] If a UI state is uncertain, ask immediately. Don't design around the
      uncertainty.

### Files / scope

- [ ] Edits stay under `videos/<slug>/` and maybe `docs/<slug>-handoff.md`
      only when requested. A new `runtime/cinematic-*.js` requires explicit
      approval. Anything else is a flag.
- [ ] Do not touch `engine/*`, `runtime/player.js`,
      `runtime/chapter-runner.js`, `scenes/shared.js`, or other videos'
      chapter files.

### Final summary

- [ ] Concise final response. Write a handoff doc only when requested.
- [ ] Open QC findings stay flagged as open. Don't mark fixed without user
      confirmation.

If a session is consuming more budget than expected, stop and ask before
continuing — the answer is almost always "split into a follow-up session."

---

## 6. Standard Non-Visual Smoke Test

Implemented at `tools/check-video-playback.js`.

### Goal

One command every session runs to confirm a video boots cleanly, without
inventing custom Playwright. Replaces the ad-hoc smoke snippets that show up
in both reference handoffs.

### Proposed shape

```text
node tools/check-video-playback.js <slug> [--chapter <id>] [--seconds <n>] [--allow-resource-404]
```

### Inputs

- `<slug>` — required, must match a `videos/<slug>/` package.
- `--chapter <id>` — optional, runs the chapter-only URL.
- `--seconds <n>` — optional cap on wait, default 90.
- `--allow-resource-404` — report missing resources but do not fail the smoke
  for those 404s. Default is strict.

### What it does

- Boots the player URL headlessly.
- Waits for `document.body.dataset.sceneDone === "true"` or timeout.
- Captures: `bootError`, page errors, console errors, `missingResources`,
  final snapshot title, HUD flag.

### Expected exit codes

- `0` — `sceneDone === "true"`, no bootError, no page/console errors, and no
  missing resources unless `--allow-resource-404` is set.
- `1` — boot failed (bootError set, or sceneDone never reached).
- `2` — booted but had console/page errors, or missing resources in strict
  mode.

### Output (stdout, machine-readable)

```json
{
  "slug": "<slug>",
  "chapter": "<id|null>",
  "sceneDone": true,
  "bootError": "",
  "pageErrors": [],
  "consoleErrors": [],
  "missingResources": [],
  "finalSnapshotTitle": "...",
  "hud": false,
  "allowResource404": false
}
```

### Out of scope

- Visual diffing.
- Auto-fixing.
- Multi-chapter parallel runs.

---

## 7. Standard Tools (use these before reaching for ad-hoc commands)

Three commands cover the vast majority of pre-build / pre-review checks.
Run them in order before TTS and again before the user does visual QC.

```text
node tools/skill-context.js                         # entry-point dump for new sessions
node tools/list-snapshots.js [--search <topic>]     # pre-storyboard snapshot search
node tools/list-snapshots.js --for <slug>           # post-manifest dependency check
node tools/validate-video.js <slug>                 # static checks (shape, snapshots, narration, hud, camera floor, postIntro kind)
node tools/check-video-playback.js <slug> [--chapter <id>]
                                                    # non-visual smoke, headless
```

Defaults to know:

- `list-snapshots --search <topic>` helps choose existing snapshots before
  storyboard approval. `list-snapshots --for <slug>` exits non-zero if any
  snapshot referenced by manifest/chapters is missing on disk; use it after
  the video package exists.
- `validate-video <slug>` is the gate before TTS. Errors block; warnings
  surface things to confirm (stripQuizEnabled debt, narration coverage,
  camera floor, etc.). Default mode validates only chapters in
  `manifest.chapters[]`; orphan chapter files appear as `[INFO]` and are
  skipped. Use `--all-chapters` only to inspect orphans intentionally.
- `check-video-playback <slug>` is the gate before review. `--chapter`
  for a single chapter; default `--seconds 90` is right for full chapters.
  Sanitize 404s land in `expectedMissingResources` and never fail strict
  mode; non-sanitize 404s do unless `--allow-resource-404` is set.

If a check needs a custom Playwright snippet, that's a sign the standard
tool needs an upgrade — file a maintainer note instead of writing one
inline in the session.

## 8. Transition style house rules

The `runtime/player.js` path honors per-chapter `export const breakStyle`
and `export const swapStyle` (Slice 5b-1.7). Variety per video is fine,
but flashy styles cost viewer attention — these rules keep it deliberate.

Resolution order at every chapter boundary:

1. URL override (`?breakStyle=…` / `?swapStyle=…`) — QC/lab debug knob.
2. Per-chapter export on the *incoming* chapter — author intent.
3. `manifest.defaults.breakStyle` / `defaults.swapStyle` — video-wide default.
4. Runtime default (`dolly` / paper-cover hardfix).

For mid-chapter `swapToSnapshot()` calls, the *current* chapter owns
`swapStyle` because the swap happens inside that chapter's effect.

### Defaults (use without thinking)

- **Default break:** `soft-dolly` for subtle camera retargets,
  `dolly` when the boundary marks a payoff moment, `hold` when the next
  chapter wants the viewer to stay still and read.
- **Default swap:** `cover` for "the screen meaningfully changed" transitions
  (clean fade-out → fade-in), `morph` when you want to preserve the camera
  framing across the swap (the new state materializes inside the same
  shot).

### Flashy styles — `whip` and `push`

- Require a storyboard / final-summary sentence justifying the choice. "It looked
  cool" is not a justification.
- **Avoid using either more than once in a short video** unless the
  repetition is deliberate (e.g. before/after pivot pattern). Reviewers
  should ask "what is each `whip` doing?" — every instance should answer.
- Don't use `whip` or `push` on the very first or very last boundary in a
  chapter chain — those slots belong to the intro→ch1 and chN→outro
  transitions, which have their own treatments.
- `whip` reads as a cinematic cut. `push` reads as a slide between two
  frames. They are not interchangeable; pick the one that matches the
  narrative (cut vs. transition).

### Per-chapter authoring

Add to a chapter file when the chapter wants something other than the
manifest default:

```js
// Same-snapshot boundary INTO this chapter:
export const breakStyle = 'dolly';

// Snapshot-changed boundary INTO this chapter (or any mid-chapter
// swapToSnapshot inside its effect):
export const swapStyle = 'morph';
```

The validator scans these literal exports against the runtime-supported
sets and warns on unknown values. No new manifest schema needed.

### Manifest defaults — when to set them

- Set `defaults.breakStyle` / `defaults.swapStyle` if the *majority* of
  boundaries in the video want the same style. Then per-chapter exports
  only need to mark the exceptions.
- Leave both unset (or `null`) if the video genuinely wants per-chapter
  control everywhere — the per-chapter exports are the source of truth.
