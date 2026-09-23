# html-video-engine

A deterministic HTML video engine. It turns an approved storyboard into one
self-contained film on a paused GSAP timeline, then renders it to MP4. It
builds four kinds of video:

- **Tutorials** — real product UI (captured snapshots) with a cursor, a camera
  and narration.
- **Ad-style and release films** — editorial HTML/CSS/SVG/GSAP scenes.
- **Mixed films** — editorial scenes over real product UI.
- **9:16 shorts** — portrait films for YouTube and Facebook Shorts.

Each film is one `videos/<slug>/index.html` on a paused master GSAP timeline.
An agent (Claude or Codex) writes the film. A person approves the storyboard
and owns visual QC.

> Per-video packages (`videos/<slug>/`) are local work product and are not in
> this repository. The repository holds the engine: shared libraries,
> skeletons, snapshot packs, tools, docs and skills.

---

## Quickstart

```bash
git clone https://github.com/23kb/html-video-engine.git
cd html-video-engine
npm install
npm run dev
```

`npm run dev` starts the live-reload preview server with a scrubber.

- Film: `http://localhost:4321/videos/<slug>/index.html`
- QC dashboard: `http://localhost:4321/tools/qc-dashboard/`
- A snapshot: `http://localhost:4321/products/<key>/snapshots/<slug>/index.html`

Add `ELEVENLABS_API_KEY` to `.env` for final narration and `GEMINI_API_KEY`
for machine QC. Never commit `.env`.

---

## Snapshot packs

Real product UI comes from **snapshot packs**: static, interactive captures of
a product's admin and frontend screens.

```
products/
  _runtime/core.js        the runtime every snapshot loads (nav, transitions, charts)
  wpforms/snapshots/      203 snapshots
  wp-mail-smtp/snapshots/ 164 snapshots
  sugar-calendar/snapshots/ 481 snapshots
```

Each snapshot folder holds `index.html`, `catalog.md` (selectors), `outline.md`
(what a film can drive) and `meta.json`. Each pack's `_shared/` carries its CSS,
assets, `nav.js` and `interactivity.js`; every snapshot ends with three script
tags that make it navigable and interactive.

Fetch one snapshot without cloning everything:

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/23kb/html-video-engine.git
cd html-video-engine
git sparse-checkout set products/_runtime products/<key>/snapshots/_shared products/<key>/snapshots/<slug>
```

Tools default to the WPForms pack. `VIDEO_PRODUCT=<key>` points them at
another one:

```bash
VIDEO_PRODUCT=sugar-calendar node tools/list-snapshots.js --search venue
```

Capturing **new** snapshots is internal tooling and is not part of this
repository. `capture/capture.js` is the original WPForms-era capturer, kept
for reference.

---

## Where to start

**Agents**

1. Read `CLAUDE.md` (Codex: `AGENTS.md`). It is the operator manual.
2. Read `docs/rulebook.md` before the first beat.
3. Run `node tools/skill-context.js` once per session.
4. Pick the path (tutorial, ad-style, mixed or short) and load its skill.

**People**

- `docs/INDEX.md` — one line per doc.
- `docs/examples/` — clone-first skeletons for tutorials, ads and postIntros,
  plus a QC probe skeleton.
- `docs/vertical-shorts.md` — 9:16 stage and crop rules.
- `docs/qc-dashboard.md` — how review notes come back as a work order.

---

## Making a new video

Tell the agent:

> Storyboard a new video. Slug: `<slug>`. Topic: `<short description>`.
> Sources: `<docs to cover>`. Audience: `<who>`.

The agent then:

1. Writes the storyboard with the storyboard skill, camera plan included.
2. **Stops for approval.** No film code before sign-off.
3. Checks the snapshot pack for every UI state the film needs.
4. Clones the matching skeleton and builds the film on the shared libraries.
5. Renders narration and runs the validator, smoke test and motion audit.
6. Hands off two URLs: the QC dashboard and the film itself.

The MP4 render waits for the reviewer's sign-off.

---

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`. Codex copies live in
`.agents/skills/`. The `wpforms-*` names are historical; the bodies apply to
any product pack and are being renamed to `film-*`.

| Skill | Use it for |
|---|---|
| `wpforms-storyboard` | The storyboard step for every track |
| `wpforms-video` | Tutorial authoring |
| `wpforms-marketing` | Ad-style, release and mixed films |
| `wpforms-ad-to-short` | A 9:16 cut of an approved ad |
| `wpforms-ae-build` | The After Effects build or twin of a film |
| `dev-advocacy-video` | Choosing the next tutorial and its shorts |
| `wpforms-postintro` | The concept beat after the intro |
| `wpforms-gsap-rules` | Timeline and GSAP discipline |
| `wpforms-primitives` | Lookup for the shared motion and interaction libraries |
| `wpforms-motion-audit` | S–F tier scoring before handoff |
| `wpforms-machine-qc` | Advisory Gemini QC on a rendered MP4 |
| `wpforms-video-polish` | Safe polish passes on a shipped film |
| `video-qc` | The review-and-fix loop |

---

## Shared libraries (`videos/_shared/`)

- `motion-primitives.js` — cameras, `Cursor`, typing, reveals, the brand
  bug, `mulberry32`, `boundedRepeats`.
- `wpforms-interactions.js` — `IframeManager` (mounts any pack's snapshots;
  pass `snapshotBase` for a non-WPForms pack) plus the WPForms admin and
  builder interactions.
- `iframe-helpers.js` — click and find-by-text helpers for captured SaaS pages.
- `builder-frontend-split.js` — builder on the left, live frontend mirror on
  the right.
- `shorts-kit.js` — the 9:16 motion vocabulary.
- `narration.js`, `instruments.js`, `pop-out.js`, `blocks/`.
- `effects/` — named effects: text reveals, cards, end card, glass card,
  odometer, seams and more. See `videos/_shared/effects/README.md`.

QC harnesses for these live in `videos/_qc-*/`.

---

## Narration (TTS)

```bash
node tts/generate.js --video <slug> [--engine voicebox|elevenlabs|fishaudio]
```

- `voicebox` (default) — local drafts on `http://127.0.0.1:17493`.
- `elevenlabs` — finals. Needs `ELEVENLABS_API_KEY`.
- `fishaudio` — Fish Audio API.

Clip durations depend on the voice. After every TTS render, run
`node tools/measure-narration.js <slug>` and paste the new `DUR` block into
the film.

---

## Tools

| Tool | Purpose |
|---|---|
| `tools/list-snapshots.js` | Snapshot inventory (`--search`, `--for <slug>`) |
| `tools/inspect-snapshot.js` | Selector emit (`--emit-selectors --filter`) |
| `tools/verify-selectors.js` | Selector check against snapshot DOM |
| `tools/field-state.js` | Field-state and interactivity query |
| `tools/skill-context.js` | Startup context dump |
| `tools/preview.js` | Live-reload server, scrubber and QC dashboard |
| `tools/storyboard-sheet.js` | Stills sheet from a paused film, before motion work |
| `tools/validate-singlehtml.js` | Static validator for single-HTML films |
| `tools/smoke-singlehtml.js` | Non-visual smoke test |
| `tools/probe-singlehtml.js` | Seek-step QC probe runner (`videos/<slug>/qc-probe.mjs`) |
| `tools/lint-determinism.js` | Determinism check |
| `tools/lint-doc-refs.js` | Checks that paths cited in docs still exist |
| `tools/narration-qc.js` | Per-clip narration gate |
| `tools/dead-time.js` | Frame-diff scan for dead time in a render |
| `tools/seam-gate.js` | Exit and entry velocity at each cut |
| `tools/composition-scan.js` | Composition and monotony metric |
| `tools/machine-qc.js` | Advisory Gemini QC pass on an MP4 |
| `tools/lib/qc-report.js` | Per-video gate ledger the dashboard reads |
| `tools/render-singlehtml-audio.js` | MP4 render with narration and ducked BGM |
| `tools/render-frames.js` | Frame-stepped lossless render |
| `tools/keyframes.js` | Contact sheet from an MP4 |
| `tools/sfx/` | Timeline-driven sound design, SFX palette, onset probe |
| `tools/post-capture.js`, `tools/capture-gates.js` | Post-capture trims and quality gates for a pack |
| `tools/site-eval.js` | wp-cli wrapper for a local WordPress site (`tools/sites.example.json` → `tools/sites.json`) |

`smoke-singlehtml`, `dead-time` and `seam-gate` share a lock. Run them one at
a time.

---

## Validation and review

Before handoff:

```bash
node tools/list-snapshots.js --for <slug>
node tts/generate.js --video <slug>
node tools/validate-singlehtml.js <slug> --report
node tools/smoke-singlehtml.js <slug> --seconds 30 --report
```

Then score editorial and cinematic beats with the motion-audit skill. Tier A
is the bar. Record it:

```bash
node tools/lib/qc-report.js <slug> --set motionAudit.tier=<tier>
```

Hand off both URLs:

- `http://localhost:4321/tools/qc-dashboard/#<slug>`
- `http://localhost:4321/videos/<slug>/index.html`

---

## Rendering an MP4

```bash
node tools/render-singlehtml-audio.js <slug>
node tools/render-singlehtml-audio.js <slug> --resolution WxH
```

The output size defaults to the film's `.stage` box, so a 9:16 short renders
at 1080×1920 with no flag.

---

## Determinism

Film code must give the same frame at the same timestamp:

- No `Date.now()` outside the player driver.
- No unseeded `Math.random()`. Use `mulberry32(seed)` from
  `motion-primitives.js`.
- No `fetch()` at runtime. Preload assets.
- No `repeat: -1`. Use `boundedRepeats(cycle, visible)`.

`node tools/lint-determinism.js` enforces it. See
`docs/deterministic-logic.md`.

---

## Protected areas

Normal video work must not edit:

- `videos/_shared/*` libraries — propose additions instead.
- Existing snapshot packs under `products/` — never edit captured DOM.
- `tools/validate-singlehtml.js`, `tools/smoke-singlehtml.js`,
  `tools/lint-determinism.js`, `capture/capture.js` behavior.

A new helper starts video-local. It moves into `videos/_shared/` on its second
use.

---

## What is not in this repository

- Per-video packages (`videos/<slug>/`), renders and narration audio.
- The snapshot capture tooling, capture plans, seed data and product configs.
- Planning notes, handoffs, lessons files and reference material.
- `.env`, `tools/sites.json` (copy `tools/sites.example.json`).

---

## Non-negotiables

- **Storyboard approval is a hard gate.**
- **Captured product UI is the truth.** No fabricated UI, no fake snapshots.
- **Tutorials need a postIntro:** a topic-specific concept beat with several
  animation phases, not a second title card.
- **Brand comes from the product pack.** For WPForms: `#E27730` orange is
  primary and purple is for AI features only.
- **Determinism** is enforced by the linter.
- **Visual QC belongs to the reviewer.**

See `CONTRIBUTING.md` for the team workflow.
