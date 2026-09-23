# Docs INDEX

One-line-per-doc map. Use this to find the right doc fast instead of grepping.

For topic-scoped rules, **load a skill first** (`.claude/skills/wpforms-*/SKILL.md`). Skills aggregate the high-frequency rules; the docs below are the deeper canonical reference material.

Refreshed 2026-08-22 after legacy retirement: engine/manifest-path docs removed; every video is now single-HTML.

## Authoring contracts

- `storyboard-format-morph-chain-2026-05-10.md` — REQUIRED morph-chain storyboard section for editorial films. Authoring contract.
- `ad-camera-gap-analysis-2026-09-03.md` (local-only) — Why the first WPVibe ad stayed dull through five QC rounds: a parked camera (5 framings/44s). Doctrine split (cut vs re-frame), `## Camera plan` storyboard section, `makeStageCamera` for editorial DOM, composition-scan ad band, motion-audit parked-stage ceiling. What landed / what is deferred.
- `kacie-intro-outro-recording-spec.md` — Real Kacie intro/outro bookends (delivery shape since 2026-07-23) + pipeline notes.
- `examples/` — **The first-write skeletons (INV-16):** `single-html-tutorial-skeleton.html` (tutorial: postIntro → chapters, no bookends, `BGM_PREVIEW`, sentinels, `// PAYOFF:` slot), `single-html-ad-skeleton.html` (pure-editorial / ad / mixed: playback + instrumentation contract), `single-html-postintro-skeleton.html` (postIntro block: named eases + primitives pre-wired). `choice-field-generate-choices-skeleton.md` is engine-era (historical API note).
- `authoring-prompts/README.md` — Reusable fill-the-blanks briefs for new video sessions (`builder-frontend-split.md`; the README lists TODO kinds).
- `video-production-templates.md` — Storyboard / snapshot checklist / token budget / smoke-spec templates (read only the section needed).
- `vertical-shorts.md` — The 9:16 path: crop-don't-shrink, band layout, zoom floor, stage-driven resolution. Read before portrait geometry work.
- `lessons-index.md` — Index of the `LESSONS-*.md` files inside video folders (59 on disk as of 2026-09-14, grouped by track; 6 tutorial files unmined) + the standing capability asks.
- `lessons-mining-2026-08-28.md` + `engine-action-points-2026-08-28.md` — The 2026-08-28 mining ledger and the ranked tooling/skill action points it produced (AP-1..20; the S-effort items shipped 2026-08-28).
- `lessons-mining-2026-09-14.md` — The 2026-09-14 ledger: the reference-driven ad batch (`yjc` `cja` `itf` `cgw` `wcr` `wvb`) and the 2026-09-04/05 shorts, per-entry verdicts, 18 action points, the OPEN items for Umair.
- `examples/qc-probe-skeleton.mjs` — Per-film QC probe skeleton (clone to `videos/<slug>/qc-probe.mjs` on v1): pointer-tip-inside-subject, monotonic camera move, frame-still window, computed colour/font, park-state visibility, `<img>` decoded, in-frame.
- `shorts-qc-2026-08-13.md` — Shorts QC ledger: dead-time verdicts per short, the ≤2s band-run rule, animated-bookends ruling.
- `ga4-video-priorities/README.md` — The curated next-video list (GA4 export): start here for "what video should we make next".

## PostIntro / craft

Craft docs below carry a **HISTORICAL API NOTE (2026-08-28)**: their code examples predate the engine retirement; the craft rules stand.

- `postintro-patterns.md` — PostIntro design rules + multi-animation rule rationale. Owned by `wpforms-postintro` skill. (historical API note)
- `cursor-choreography.md` — park / glide / drag / via-waypoint patterns. (historical API note)
- `narration-writing.md` — Voice, pacing, sentence shape, beat coupling. (historical API note)
- `beat-pacing.md` — 6-second rule, splitting heuristics. (historical API note)
- `camera-lensing.md` — Zoom-level reading guide (1.0 / 1.18 / 2.2 / 2.4), pad, when to pick which. (historical API note)
- `color-palette.md` — Brand orange + supporting accents. (historical API note)
- `atmospheric-composition.md` — Grain / sweep / parallax / scale-push usage rules. (historical API note)
- `selector-hygiene.md` — Selector source hierarchy, when selectors break. (historical API note; `_selectors.js` modules are engine-era — selectors live inline in the film now)
- `title-card-voice.md` — **SUPERSEDED** (manifest-era intro/outro cards; tutorials carry no bookends since 2026-08-28). Its CTA-tone rules still read for shorts / editorial end cards.

## GSAP / animation

- `gsap-rules.md` — L0 discipline canonical reference (deep version). Owned by `wpforms-gsap-rules` skill. (historical API note — its registered-timeline / frame-driver / kit.js sections are retired; the master-timeline contract in the skill replaces them)
- `gsap-flip-patterns.md` — Flip patterns: morphs, reflows, real-UI clones. (historical API note — sandbox chapter paths are gone)
- `../videos/_shared/effects/README.md` — the named-effect vocabulary (mountTextStackFromRight, mountCardsSpreadFan, mountEndCard, seams, odometer…); QC page `videos/_qc-effects/`.
- `hyperframes-seam-grammar-rnd-2026-09-03.md` (local-only) — Seam-transition recipes R&D'd from HeyGen's claude-paper-launch film: inverse zoom-through, leftward cut-the-curve, pixel-matched cut, position-locked crossfade, cursor velocity-split handoff, humanized typing. Code-first; prove video-local, promote on second use.

## Marketing / editorial

- `blocks.md` — `videos/_shared/blocks/` API: code-card, mac-window, phone-frame, pill, arrow, route-line, terminal.
- `text-kit.md` — Pixel-Point-style text reveal presets.
- `lottie-kit.md` — Lottie bumpers, stings, badges, marker micros. (historical API note — examples import a per-video `_kit.js`)

## Render / preview / QC

- `qc-dashboard.md` — **The QC surface.** Gate chips, render + dead-time bands, filmstrip, timestamped feedback notes. How to populate `qc-report.json` before a handoff and how the feedback block works.
- `render.md` — MP4 pipeline: `render-singlehtml-audio.js` (ship path — narration + ducked BGM, stage-driven resolution, whole-second audio pad), `render-html.js` (silent), `stitch.js` (Kacie bookends). Rewritten 2026-08-28.
- `preview.md` — Live-reload server notes.
- `deterministic-logic.md` — Render-parity rules: no `Date.now()`, no unseeded `Math.random()`, no `fetch()`.
- `deterministic-logic-findings.md` — **SUPERSEDED** (2026-05 linter pass over engine-era files that no longer exist). Re-run `node tools/lint-determinism.js --all` for the live picture.
- `probe-playbook.md` — Playwright probe rules with receipts (pixel truth, console filters, beat contracts).

## Architecture

- `video-architecture-invariants-2026-05-12.md` — INV-1..16 hard rules for single-HTML videos, each cross-referenced to its teaching commit. Read before any new film. (INV-11 and INV-16 carry 2026-08-28 amendment notes: no tutorial bookends; first write = the `docs/examples/` skeleton.)
- `snapshot-interactivity.md` — Conventions for `products/wpforms/snapshots/_shared/interactivity.js`: transition registry, canvas/options model, admin-side systems.

## System context

- `rulebook.md` — ~240 IF/THEN session rules mined from all LESSONS files; each names an enforcement slot + receipt. Read before first beat.
- `track3-analysis-2026-09-03.md` — Track 3 reference analysis (Umair's 17-video drop): the measured bar for postIntro / TTS+script / sound / motion, what was built, and the pending U-items awaiting his ruling.
- `skills.md` — Index of the 9 live skills (procedural vs reference) + retired / file-read-only notes.
- `jake-moran-workflow-adoption-2026-08-06.md`, `video-system-improvements-2026-08-06.md`, `video-system-improvements-round2-2026-08-08.md`, `fix-round-2026-08-14/`, `motion-design-round-2026-08-17/` — Dated system-improvement rounds (historical record of rulings + specs).
- `product-truth/` — Per-feature plugin-truth notes captured during builds (entry-automation, anti-spam, custom-css, form-analytics, qr-code...). Each video doubles as a doc audit; log divergences here.
- `surfaces/` — Per-builder-surface interaction notes (e.g. builder-settings-notifications).

## Field / UI inventories (query, don't full-read)

- `wpforms-field-state-inventory.md` — Canonical field-state inventory (132 KB). Query via `node tools/field-state.js --field <name>`.
- `snapshot-health-report.md` — Snapshot health (local-only; hand-written).

## Repo-root references

- `CLAUDE.md` — Operator manual. Boot order, path decision tree, protected areas, validation.
- `BACKLOG.md` — Living debt + future candidates (local-only, gitignored).
- `implementation-notes.html` — Instruction-fidelity post-mortem behind CLAUDE.md's G1–G4 gates.

## Code libraries (use, do not reinvent)

- `videos/_shared/motion-primitives.js` — Cameras (`cinematicFlight`, `figjamFlight`, `focusStationOverview`), `Cursor`, typing (`caretType`, `typeIntoIframeInput`), reveals, brand bug, utils. QC: `videos/_qc-primitives/`.
- `videos/_shared/wpforms-interactions.js` — `IframeManager` (mount/swap/preload + camera transform), builder/admin interactions Wave 1–2. QC: `videos/_qc-interactions/`.
- `videos/_shared/narration.js` — say/beat/wait/startBGM + hardened awaits. Self-contained.
- `videos/_shared/iframe-helpers.js` — `glideClick`, text-finding helpers for SaaS captures with hashed classes.
- `videos/_shared/builder-frontend-split.js` — Split-screen builder⇄frontend mirror harness. Skeleton: `videos/_examples/builder-frontend-split-skeleton/`. QC: `videos/_qc-frontend-mirror/`.
- `videos/_shared/effects/` — Named editorial effects vocabulary (text stacks, card fans, constellations). QC: `videos/_qc-effects/`.
- `videos/_shared/instruments.js` — Payoff instruments + state chips (C-SPEC C5). QC: `videos/_qc-instruments/`.
- `videos/_shared/shorts-kit.js` — 9:16 bookends/stings/surround. QC: `videos/_qc-shorts-kit/`.
