# CLAUDE.md — operator manual for this repo

You are the video-building agent for WPForms tutorial videos and ad-style release/announcement videos. The repo turns an approved storyboard into a playable HTML video. MP4 capture is in-repo via `tools/render.js`; the deliverable is a playable HTML review URL.

## ⛔ Anti-patterns — DO NOT do these (9-line catalog)

Across 3 horrible-v1 sessions on 2026-05-12, these patterns kept being re-invented. Re-read this list before each beat:

1. **DO NOT** hand-mount a cursor element (`<div class="cursor">` + `gsap.to(cursorEl, ...)`). Use `Cursor` from `motion-primitives.js`.
2. **DO NOT** single-tween a camera move (`tl.to(camera, {x, y, scale})`). Slide-projector failure mode. Use `cinematicFlight` / `figjamFlight` / `focusStationOverview`.
3. **DO NOT** use a native `<select>` for an editorial dropdown — it can't be opened by JS. Use the faux-overlay pattern from `selectFromDropdown` in `wpforms-interactions.js`.
4. **DO NOT** mount overlays as iframe SIBLINGS painting over the iframe. Inject into iframe DOM directly, OR mount in the parent doc using `elementToStageCoords` for positioning.
5. **DO NOT** swap iframes to show state changes. Keep the same live iframe; mutate its DOM in place. Reference: `videos/klaviyo-quick-connect/` pattern.
6. **DO NOT** invent UI fragments (chips, result cards, payoff overlays) without explicit user approval. Every inline UI fragment needs a `// SOURCE: snapshots/<name>/...` snapshot citation OR `// OVERRIDE: <user approval>` annotation in the code itself. See INV-15.
7. **DO NOT** ship a postIntro / cinematic / editorial beat without invoking `wpforms-motion-audit` (Skill tool) and recording the tier rating.
8. **DO NOT** first-write `videos/<slug>/index.html` for a pure-editorial video from a blank file. First write = `cp reference/html-templates/<closest>.html ...`, commit the unmodified clone, THEN customize. See INV-16.
9. **DO NOT** set a new pilot's stage to anything less than 1920×1080. Lower stage resolutions (1280 / 1440 / 1600) cause snapshot compression that reads as blur. See INV-1.

This manual is intentionally short. **Topic-scoped rules live in skills**, not here. The first thing to do in any session is identify which video path you're on — that decides which skills load.

## Pick your path FIRST

Three paths. Pick before loading any topic skill.

| Path | Use when | Architecture | Primary skill | Audit gate |
|---|---|---|---|---|
| **Tutorial** | Real product UI, narration-driven, viewer learns a workflow | **NEW work (default):** single-HTML — `videos/<slug>/index.html` + master `gsap.timeline({paused:true})` + `IframeManager` + `Cursor` + `WPFormsInteractions` + `videos/_shared/narration.js`. **LEGACY (12 existing videos):** Engine + `manifest.json` + `chapters/*.js` + narration mp3s + `surface: 'iframe'` — still load-bearing, do not migrate. | `wpforms-video` | `wpforms-motion-audit` for any postIntro/cinematic beat |
| **Pure editorial / ad-style** | No real product UI, motion-heavy, ad/announcement piece | Single self-contained HTML, vendored GSAP, NO `runtime/player.js`. Clone from `reference/html-templates/`. | `wpforms-marketing` | `wpforms-motion-audit` mandatory; morph-chain storyboard section required per `docs/storyboard-format-morph-chain-2026-05-10.md` |
| **Mixed** (editorial chrome + real product UI) | Hybrid: real product geometry beneath editorial chrome (e.g. `klaviyo-addon-intro`, `wpforms-rest-api-overview-polished`) | Engine + chapters with `surface: 'mixed'` | `wpforms-marketing` + `wpforms-transitions` | `wpforms-motion-audit` mandatory |

If the user's request is ambiguous, ask **one question**: "Tutorial showing real product UI workflow, or editorial / ad-style piece?" Then pick the path. Do not bypass the engine for tutorial work; do not load the engine for pure-editorial work.

**Default reference templates for pure-editorial work** (clone-and-customize, do not invent from scratch):

- **`videos/klaviyo-bridge-2/index.html` — CORE REFERENCE for pure editorial.** Approved after 3 sessions + multiple iterations. Use this as the primary clone target. The 3 earlier `reference/html-templates/` exemplars below remain valid as secondary references for specific stylistic intents.
- `reference/html-templates/wpforms-ai-prompt-open.html` — S-tier identity-continuity morph (single element threading the story)
- `reference/html-templates/editorial-reference-36s.html` + `editorial-reference-BEATS.md` — 36s linear-scene reference
- `reference/html-templates/openai-replica-18s.html` — first-try single-HTML proof

## Three libraries — use these, don't reinvent

For any motion / camera / cursor / typing / field-reveal / brand-anchor / WPForms interaction / iframe-glue work, the executable code **already exists** in `videos/_shared/`. Reach for the library first. Inventing a new approximation is a recurring failure mode (3 horrible-v1 sessions in 2026-05-12) that re-opens bugs the library already fixed (cursor frenzy, caret drift, slide-projector cameras, snapshot-swap cream-flash).

- **`motion-primitives.js`** — animation kit: cameras (`cinematicFlight`, `figjamFlight`, `focusStationOverview`), `Cursor` class (glide / click / hover / drag), text (`caretType`, `statusPillMorph`, `markerSweep`), reveal (`popOut`, `fieldStaggerReveal`), brand (`mountSullieBug`, `cleanFastRejoin`), utils (`boundedRepeats`, `mulberry32`). Full when-to-use in `wpforms-primitives` skill. QC at `videos/_qc-primitives/index.html`.
- **`wpforms-interactions.js`** — WPForms admin/builder interactions: `navAddNewForm`, `selectTemplate`, `openSettingsTab`, `addNotification`, `insertSmartTag`, `selectFromDropdown`, `addConditionalLogicRule`, `dragFieldToForm`, plus the `IframeManager` helper (native 1280×720 mount, engine-pattern camera transform, `pointer-events: none` guard). Full list in `wpforms-primitives` skill. QC at `videos/_qc-interactions/index.html`.
- **`iframe-helpers.js`** — defensive-pattern glue: `glideClick` (scrollIntoView + glide + click in one call), `findInIframeByText` / `glideToText` for SaaS captures with content-hashed class names (Klaviyo `.sc-jTrPJq`, Mailchimp, Stripe). Use whenever class names won't survive a re-capture.

**Load the `wpforms-primitives` skill BEFORE writing motion / cursor / interaction code.** The skill is the per-primitive when-to-use index. Scanning the QC pages above is the fastest way to confirm a primitive matches your need before authoring.

**Hard rule:** if you're about to write `gsap.to(cursor, ...)` or hand-mount a cursor element, stop and use the `Cursor` class. If you're about to write a click-Add-New-Form sequence, stop and call `navAddNewForm()`.

## ⛔ Two consumption patterns — match the skill type

**Procedural skills** (`wpforms-video`, `wpforms-marketing`, `wpforms-postintro`, `wpforms-motion-audit`) define gates that produce artifacts (tier rating, storyboard approval, multi-animation rule check). **Invoke via the Skill tool — file-read is NOT sufficient.** Reading the rubric ≠ running the scorer.

**Reference skills** (`wpforms-primitives`, `wpforms-gsap-rules`, `wpforms-transitions`) are lookup indices + rules references. **File-read IS sufficient.** Skill tool invocation is optional. But you still have to READ them at the right moment — `wpforms-primitives` before writing motion code, `wpforms-gsap-rules` before timeline work.

Same applies to `docs/video-architecture-invariants-2026-05-12.md` — pure reference, read inline. Codex doing exactly that on 2026-05-12 was the doc working as designed.

If you're working from a detailed codex prompt at `docs/codex-prompts/*.md`, the prompt is the brief — the skills are STILL the gates. Both apply. Common failure mode (observed in Klaviyo tutorial v11, 2026-05-12): session reads CLAUDE.md → reads codex prompt → goes straight to code, treating skill files as references. PostIntro went 12 iterations without ever invoking `wpforms-motion-audit`. Don't repeat that.

Non-negotiable invocations for tutorial / postIntro / cinematic / editorial work:
- `wpforms-video` at session start for tutorial path
- `wpforms-marketing` at session start for editorial / ad-style path
- `wpforms-postintro` before designing any postIntro
- `wpforms-gsap-rules` before writing any timeline beat (registered timelines, pausableRaf, boundedRepeats)
- **`wpforms-primitives` BEFORE writing any motion code** (the most-skipped skill — both Klaviyo + editorial sessions hand-rolled approximations of existing primitives because they didn't invoke this. The skill is a WRITE-TIME gate, not a lookup-when-you-think-of-it reference.)
- **`wpforms-motion-audit` on the v1 build AND before final handoff** (the second-most-skipped skill — applies to v1 review + major restructures + final handoff. Skipping v1 audit means iterating against the user's eyes instead of the rubric, which is 10+ rounds more expensive. HARD GATE, must record tier S/A/B/C/D/F.)

## Topic skills (load AFTER picking a path)

- `wpforms-video` — tutorial authoring, intake, storyboard gate, default authoring mode
- `wpforms-postintro` — postIntro design + multi-animation rule + morph-chain integration
- `wpforms-gsap-rules` — GSAP L0 discipline + camera-decomposition rules + designer principles (Emil / Krehel / Jhey)
- `wpforms-marketing` — editorial / ad-style surfaces + blocks + atmospheric kit + reference templates + brand canonical
- `wpforms-transitions` — chapter breaks, swap styles (`flipBridge` is default), camera poses, scrubber/render
- `wpforms-primitives` — lookup index for `videos/_shared/motion-primitives.js` (cameras / cursor / typing / field-reveal / brand-anchor / exit) and `videos/_shared/wpforms-interactions.js` (Wave 1 standard interactions). Reach here BEFORE writing any new GSAP cursor / camera / interaction code.
- `wpforms-motion-audit` — score animations and camera moves S–F tier with hard-rule calibration. Run before any postIntro/cinematic handoff.
- `wpforms-video-polish` — polish an existing already-shipped video without breaking it. Backup-first → analyze → surgical edits in batches of 5–10 → static verification → motion-audit if cinematic touched. NOT for new authoring, NOT for debug. Codified from klaviyo-bridge-2 polish work (2026-05-12), includes 8 canonical polish patterns.

Plus auto-triggering motion-design skill:
- `design-motion-principles` (kylezantos) — Emil Kowalski / Jakub Krehel / Jhey Tompkins designer-grade audit. Complements `wpforms-motion-audit`.

## Brand canonical source

Real WPForms brand assets are tracked at `reference/wpforms-brand/`. Do not invent.

- `reference/wpforms-brand/BRAND.md` — usage doc + anti-patterns
- `reference/wpforms-brand/tokens.css` — drop-in CSS variables (`--wpf-orange #E27730` primary, `--wpf-ai-purple` AI-feature-only)
- `reference/wpforms-brand/assets/` — real Sullie + loading visuals + AI 3-dot spinner
- Real templates API: `https://wpforms.com/templates/api/get/` (cached locally via `tools/fetch-templates.js`)

## Start Here

1. Run `node tools/skill-context.js` once per session if not in context.
2. **Pick your path** (table above). Load the matching primary skill.
3. For repo-wide context (boot order, protected core, validation), this file is canonical.
4. For topic content (postIntro shape, GSAP rules, etc.), read the skill — not this file.

`docs/INDEX.md` is a one-line-per-doc index. Use it to find the right doc fast.

## Token Discipline

- Use targeted tools before broad shell searches.
- Snapshot inventory: `node tools/list-snapshots.js [--search <q>] [--for <slug>]`.
- Selector discovery: `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]`.
- Selector validation: `node tools/verify-selectors.js <snapshot> ...`.
- Field-state evidence: `node tools/field-state.js --field <name> [--summary]`. **Do not full-read** `docs/wpforms-field-state-inventory.md` (132 KB).
- Do not list or read `videos/` packages during startup. Reference packages are debug-only after you can name the exact pattern needed.
- Do not inspect runtime internals during normal authoring. Use the relevant skill, `docs/authoring-api.md`, skeletons, validators, snapshot tools first. Inspect runtime only after a concrete validator/smoke/debug failure.

## Protected Areas

Normal video work must NOT edit:

- `engine/*` (entire directory)
- `runtime/player.js`
- `runtime/chapter-runner.js`
- `runtime/scene-helpers.js`
- `runtime/transitions.js`
- `runtime/frame-driver.js`
- `runtime/frame-adapter.js`
- `runtime/shared-scene.js`
- `runtime/camera-poses.js` (registry has 0 production callers as of audit 2026-05-11; flagged for deprecation review in `docs/engine-runtime-optimization-audit-2026-05-11.md`)
- `runtime/pause-manager.js`
- `scenes/shared.js`
- `scenes/player.html`
- accepted/reference video packages
- existing snapshots
- `tools/validate-video.js` validator behavior

New files under `runtime/` (including unwired helper sketches) are approval-gated. If a beat seems to need core, stop and propose a reusable helper or a video-local legacy implementation.

## Per-Video Files

Normal video work may create or edit:

- `videos/<slug>/manifest.json`
- `videos/<slug>/chapters/*.js`
- `videos/<slug>/chapters/_selectors*.js` or `videos/<slug>/chapters/_selectors/*.js`
- `videos/<slug>/narration/*.txt` and rendered `*.mp3`
- `videos/<slug>/storyboard.md` (optional; **required** with morph-chain section if editorial — see `docs/storyboard-format-morph-chain-2026-05-10.md`)
- `docs/<slug>-handoff.md` (only when user asks for a persistent handoff)
- new real snapshot folders **only through capture** (never fabricate)
- `runtime/cinematic-<name>.js` only when intentionally promoting a postIntro archetype, with explicit approval

For pure-editorial work, the per-video files shrink to a single `videos/<slug>/index.html` plus optional `storyboard.md`. No manifest, no chapter modules, no narration system, no engine boot.

New videos keep narration `.txt` and `.mp3` under `videos/<slug>/narration/`. Do not copy from root `/narration/` for new work.

## Determinism

Video chapter and cinematic code must be deterministic — required for `tools/render.js --seek` mode render parity (the renderer jumps to specific timestamps and captures frames; non-deterministic code produces different frames each run). Four rules: no `Date.now()` outside player driver, no unseeded `Math.random()` (use `mulberry32(seed)`), no `fetch()` at runtime (preload), no `repeat: -1` (use `boundedRepeats(cycle, visible)`). **Canonical source: INV-9** in `docs/video-architecture-invariants-2026-05-12.md`.

Static check: `node tools/lint-determinism.js [--all]`. See `docs/deterministic-logic.md` for rationale and `docs/deterministic-logic-findings.md` for known existing warnings (logged, not migrated).

## Tools

- `node tools/skill-context.js` — canonical startup context dump
- `node tools/list-snapshots.js [--search <q>] [--for <slug>]` — snapshot inventory
- `node tools/field-state.js --field <name> [--summary] | --search <q>` — field-state query
- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]` — selector emit
- `node tools/verify-selectors.js <snapshot> ...` — selector validate
- `node tts/generate.js --video <slug>` — render narration mp3s
- `node tools/validate-video.js <slug>` — static validator
- `node tools/check-video-playback.js <slug> [--seconds <n>]` — non-visual smoke
- `node tools/render.js <slug> [--seek] [--fps 30]` — MP4 export
- `node tools/preview.js [--video <slug>] [--port 4321]` — live-reload + scrubber
- `node tools/lint-determinism.js [--all] [--video <slug>]` — determinism check
- `node tools/check-claude-agents-sync.js` — verify CLAUDE.md and AGENTS.md are in sync (Phase 5a tool)
- `npm run lint` — composes `validate-video.js --all` + `lint-determinism.js --all`

Use standard tools instead of ad hoc `find`, `grep`, custom Playwright, or runtime spelunking unless there is a concrete gap.

## Validation

Before review handoff:

1. `node tools/list-snapshots.js --for <slug>`
2. `node tts/generate.js --video <slug>`
3. `node tools/validate-video.js <slug>`
4. `node tools/check-video-playback.js <slug> --seconds 30`
5. **For postIntro/cinematic/editorial beats:** ask `wpforms-motion-audit` skill to score them. Tier A or higher is the merge bar; anything B or below needs a fix or an explicit override.

Visual QC belongs to the user unless explicitly requested. If you do run a browser check, keep it scoped and report what you verified.

Provide playable HTML review URLs after validation:

- Full video: `http://localhost:4321/scenes/player.html?video=<slug>`
- Chapter-only: `http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>`
- Pure editorial (no player): `http://localhost:4321/videos/<slug>/index.html`

Do not answer that the repo has no URLs just because MP4 capture lands separately.

## Push Back

Stop and push back when:

- Storyboard approval has not happened — see `wpforms-video` skill HARD-GATE
- Editorial storyboard lacks the morph-chain section — see `docs/storyboard-format-morph-chain-2026-05-10.md`
- A requested state would require fake WPForms UI
- A snapshot is missing and cannot be truthfully derived
- PostIntro is being weakened instead of built with approved animation surfaces — see `wpforms-postintro` skill
- Implementation pressure points toward protected core
- Descriptor mode is being used to avoid legacy/effect choreography that the approved storyboard needs
- An editorial build is being authored from scratch instead of cloned from `reference/html-templates/`
- Purple is being used as primary brand (it's AI-feature-only — `--wpf-orange #E27730` is primary)

## Where Topic Rules Live (Quick Map)

Don't look here for these — load the skill instead:

| Topic | Skill |
|---|---|
| Path selection / intake / storyboard gate / production truth / legacy chapter shape / modes | `wpforms-video` |
| PostIntro multi-animation rule / build order / canonical references / morph-chain | `wpforms-postintro` |
| GSAP L0 discipline / camera-decomposition / registered timelines / `pausableRaf` / Flip patterns / designer principles | `wpforms-gsap-rules` |
| `surface: 'editorial' / 'mixed'` / blocks library / atmospheric kit / text-kit / hero composition / `reference/html-templates/` clones / brand canonical | `wpforms-marketing` |
| Chapter breaks / swap styles / `flipBridge` (default) / camera poses / shared-scene / scrubber / render | `wpforms-transitions` |
| Motion S–F tier scoring / hard-rule calibration / pre-handoff gate | `wpforms-motion-audit` |
| Motion-primitives + wpforms-interactions library lookup (per-primitive when-to-use, signatures, QC status) | `wpforms-primitives` |
| Polish an existing video (timing / easing / typography / handoffs) without breaking it | `wpforms-video-polish` |
| Designer-grade audit (Emil Kowalski / Jakub Krehel / Jhey Tompkins) | `design-motion-principles` (auto-triggers) |

Skills are at `.claude/skills/<name>/SKILL.md`. Each is a single file with YAML frontmatter (`name`, `description`).
