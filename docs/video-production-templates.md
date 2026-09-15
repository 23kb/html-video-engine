# Video Production Templates

Last updated: 2026-08-22 (post legacy-retirement refresh; every video is now single-HTML)

Reusable scaffolding for guided video sessions. Pair with the `wpforms-video`
skill (workflow) and `docs/storyboard-format-morph-chain-2026-05-10.md`
(required morph-chain section for editorial films).

Sections:

1. Storyboard Approval Template
2. Optional Video Handoff Template
3. Single-Film Authoring Checklist
4. Snapshot Inventory / Capture Checklist
5. Token Budget Checklist
6. Standard Non-Visual Smoke Test

---

## 1. Storyboard Approval Template

Post this in chat after research, before any code. Wait for explicit approval.

```markdown
# Storyboard: <video title>

Slug: <slug>
Sources read: <urls / repo paths>

Film type: <tutorial (real UI) | editorial (ad-style) | mixed (editorial chrome over real UI)>
Cross-snapshot movement (if any): <ifm.swap() crossfade between snapshots | one continuous timeline / morph-chain>

## Angle
<One paragraph: what this video proves and to whom.>

## Length target
<e.g. 45–90s total, intro/postIntro per skill rules>

## PostIntro concept
<Required unless user explicitly skips it. Describe the original visual concept
beat in 2–3 sentences: what changes on screen, what product truth it uses,
and why it previews the topic. Use `wpforms-postintro` skill rules — never a
second title card.>

## Morph chain (REQUIRED for editorial films)
Per docs/storyboard-format-morph-chain-2026-05-10.md — list each morph:
element identity that threads beats, entry/exit velocities at each seam.

## Beats
1. <beat-id> — <one-line purpose>
2. ...

For field videos, start by adding/selecting the field from the builder sidebar
unless the user says the field is already present. For `Dropdown`, `Multiple
Choice`, and `Checkboxes`, include AI Generate Choices by default: button,
modal, generated options, insertion/apply result.

## Narration drafts
- intro/postIntro: "<text>"
- <beat-id>: "<text>"
- ...

## Shot list
<!-- REQUIRED (validate-singlehtml §8 checks parity with the film's beats).
     The parser keys on the FIRST column — `| beat |` must lead, exactly this
     column order. A reordered table passes eyeballs and fails parity
     (acceptance T-4, 2026-08-23). -->
| beat | narration (TXT) | surface / target | transformation | motion hook |
|---|---|---|---|---|
| <beat-id> | <spoken line> | <snapshot + selector> | <what changes on screen> | <named hook> |

## Snapshot plan
| Beat | Base snapshot | Final state needed | Status | DOM-derived source of truth (if applicable) | Staged-state note |
|---|---|---|---|---|---|
| ... | snapshots/<base> | <what the viewer sees> | exists / DOM-derived / NEEDS CAPTURE / ASK USER | `node tools/field-state.js --field <name>` / real DOM snippet | <base + what was staged> |

Status legend:
- **exists** — real captured UI under `snapshots/<name>/`, used as-is.
- **DOM-derived** — staged on top of an existing base snapshot, with a
  product-truth source named in the row (field-state query, real captured
  DOM snippet, or existing captured DOM cloned in place).
- **NEEDS CAPTURE** — base structure missing or not truthfully derivable;
  capture before film code.
- **ASK USER** — unclear which exact state is intended. Pause, do not guess.

Forbidden: fabricating a product-looking snapshot folder or hand-writing
WPForms-shaped HTML to avoid capture or DOM derivation.

Cite panel STATES, not names (acceptance T-7/S-4/E-9): a row that says
"Location panel" hides that the capture holds its ERROR state; a selector
like `#entry_note` can be a hidden backing textarea while the visible surface
is an empty-state postbox. For every cited surface, name the visible state
(filled / empty / error / hidden) and resolve visibility before writing the
beat — narration must describe the pixels, not the panel's label.

## Open questions for user
- ...

## What I will NOT do without further approval
- Touch `videos/_shared/*` libraries or validator behavior
- Capture new snapshots not listed above
- Drop postIntro instead of replacing a bad postIntro choice
```

Approval rule: explicit only. Don't infer it from "ok" in passing.

---

## 2. Optional Video Handoff Template

Use only when the user asks for a persistent handoff doc. Keep concise.

```markdown
# <Title> Handoff

Status: <date>, <slice or final>

Slug: `<slug>`

Preview URL: http://localhost:4321/videos/<slug>/index.html

## Direction
<2–4 bullets: angle, length, postIntro concept.>

## Current Slice
<What got built this pass.>

## Source UI Inventory
<Snapshots used + any DOM-staged overlays, each with its product-truth source.>

## Production Issues And Fixes
<One bullet per real issue hit. Issue → Fix. Reusable lessons go to the
video's LESSONS file.>

## QC Findings — Open
<User-flagged items not yet fixed. Do not mark "done" without confirmation.>

## Verification
- node tools/validate-singlehtml.js <slug> → <result>
- node tools/smoke-singlehtml.js <slug> --seconds <dur+slack> → <result>

## Notes To Carry Forward
<Story-level decisions worth remembering: what was rejected and why.>
```

---

## 3. Single-Film Authoring Checklist

Run mentally before writing each beat of `videos/<slug>/index.html`.

- [ ] Imports bounded to `videos/_shared/*` plus vendored GSAP script tags
      (`/vendor/gsap/3.15.0/gsap.min.js`, CustomEase/Flip as needed).
      Never import from removed paths (`engine/`, `runtime/`, `scenes/`
      beyond the snapshot-viewer harness).
- [ ] Film structure follows the master-timeline + instrumentation contract:
      one `gsap.timeline({ paused: true })` master exposed as `window.__tl`,
      started with `window.__T0`, cue marks in `__sched`, completion sets
      `__done`/`__dur`. See `wpforms-gsap-rules`.
- [ ] Base snapshots + DOM staging where truthful. No fabricated product UI.
      Staged states documented in the storyboard snapshot table.
- [ ] Protected areas untouched: `videos/_shared/*`, `snapshots/**`,
      validators/smoke tools, other shipped videos.
- [ ] Validator clean: `node tools/validate-singlehtml.js <slug>` → 0 errors.
- [ ] Determinism check: `node tools/lint-determinism.js --video <slug>`
      passes. No `Date.now()`, no unseeded `Math.random()`, no runtime
      `fetch()`. See `docs/deterministic-logic.md`.
- [ ] RAF loops pause-aware (inline `pausableRaf` shape). No raw
      never-stopping loops.
- [ ] No `repeat: -1`; use finite repeats sized to visible duration.
- [ ] Cross-snapshot moves follow *Snapshot transitions* in `wpforms-marketing`
      (`ifm.swap()` crossfade or continuous timeline); preload before swap.
- [ ] Narration `.mp3`s exist under `videos/<slug>/narration/`; DUR block pasted
      from `node tools/measure-narration.js <slug>` (never hand-estimated).
- [ ] Highlights stay inside the stage frame; camera level >= 1.0 on builder
      surfaces.
- [ ] BGM via `startBGM`/duck helpers from `videos/_shared/narration.js`.

---

## 4. Snapshot Inventory / Capture Checklist

Required **before** storyboard proposal. Exact product UI is the core promise —
do not synthesize a product-looking snapshot.

### Step 1: Inventory existing

- [ ] `node tools/list-snapshots.js [--search <topic>]` before proposing.
- [ ] For each beat, name the snapshot.
- [ ] **Compose, don't capture, for state variants.** Pair a clean base
      snapshot with DOM-derived states grounded by
      `node tools/field-state.js --field <name>` or real captured DOM.
      Recapture only if a structural base is genuinely missing.

### Step 2: Classify each needed state

| Status | Meaning | Action |
|---|---|---|
| `exists` | Real captured UI under `snapshots/<name>/` | Use as-is |
| `exists + DOM stage` | Real base + product-derived overlay | Document the overlay source |
| `NEEDS CAPTURE` | Exact UI state missing | Capture before film code |
| `ASK USER` | Unclear which exact state is intended | Pause, ask, don't guess |

Forbidden: a fourth status of "I'll build a folder that looks like WPForms."

### Step 3: Capture pass (if needed)

- [ ] `capture/capture.js` with env credentials (`WP_URL`, `WP_USER`,
      `WP_PASS`) — never hardcoded.
- [ ] Verify the captured folder has only one `<body>` block.
- [ ] Flip the storyboard row status to `exists`.

### Step 4: Cleanup expectation

DOM staging hides cruft; it must not blank the useful preview unless the
beat explicitly stages otherwise.

---

## 5. Token Budget Checklist

Cost is a product requirement. Defaults; deviate with reason.

### Session entry

- [ ] Read `CLAUDE.md`, run `node tools/skill-context.js`, load the path skill.
- [ ] Use `reference/html-templates/` clones as first copy targets for new
      editorial films (INV-16); tutorials start from the most recent similar
      film.
- [ ] Query field state (`tools/field-state.js`); never full-read the 132 KB
      inventory.
- [ ] No broad repo-wide Grep/Glob unless genuinely unknown territory.

### During build

- [ ] Storyboard before any code; build toward a full first draft after
      approval; stop early for missing capture or protected-area pressure.
- [ ] One standard non-visual smoke per slice (section 6).
- [ ] No visual QC unless the user asks; two failed fix attempts on a stubborn
      bug is the threshold to ask.
- [ ] No fake snapshots ever. Capturing real UI is cheaper than rework.

### Files / scope

- [ ] Edits stay under `videos/<slug>/` (+ `docs/<slug>-handoff.md` when asked).
- [ ] New `videos/_shared/` helpers are promotion-gated: prove video-local
      first, promote on second use with approval.

---

## 6. Standard Non-Visual Smoke Test

Implemented at `tools/smoke-singlehtml.js`.

```text
node tools/smoke-singlehtml.js <slug> [--seconds <n>]
```

What it checks (real Chromium, real playback):

- `window.__T0` set without user gesture.
- Master timeline reaches completion: `__done` within the budget
  (budget must exceed the film's `__dur`).
- `__sched` cues exist and are non-decreasing.
- No page/console errors.
- Cursor glide targets resolve; instrumented beats move within DUR + 0.5s.

Static gate before it:

```text
node tools/validate-singlehtml.js <slug>   # shape, snapshots, narration, instrumentation
```

Exit codes: `0` pass; non-zero lists the failed checks on stdout.
