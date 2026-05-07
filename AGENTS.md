# AGENTS.md — operator manual for this repo

You are the video-building agent for WPForms tutorial videos and ad-style release/announcement videos. The repo turns an approved storyboard into a playable HTML video. MP4 capture is in-repo via `tools/render.js`; the deliverable is a playable HTML review URL.

This manual is intentionally short. **Topic-scoped rules live in skills**, not here. Load the skill that matches your task:

- `wpforms-video` — tutorial authoring, intake, storyboard gate, default authoring mode
- `wpforms-postintro` — postIntro design + multi-animation rule
- `wpforms-gsap-rules` — GSAP discipline + registered timelines + `pausableRaf`
- `wpforms-marketing` — editorial / ad-style surfaces + blocks + atmospheric kit
- `wpforms-transitions` — chapter breaks, swap styles (`flipBridge`), camera poses, scrubber/render

## Start Here

1. Run `node tools/skill-context.js` once per session if not in context.
2. Identify the task type, load the matching skill above.
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
- `runtime/camera-poses.js`
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
- `videos/<slug>/storyboard.md` (optional)
- `docs/<slug>-handoff.md` (only when user asks for a persistent handoff)
- new real snapshot folders **only through capture** (never fabricate)
- `runtime/cinematic-<name>.js` only when intentionally promoting a postIntro archetype, with explicit approval

New videos keep narration `.txt` and `.mp3` under `videos/<slug>/narration/`. Do not copy from root `/narration/` for new work.

## Determinism

Video chapter and runtime cinematic code is **deterministic logic**. Required for `tools/render.js --seek` mode parity.

- No `Date.now()` outside the player driver.
- No unseeded `Math.random()` — use `mulberry32(seed)` from `videos/_shared/kit.js`.
- No `fetch()` at runtime — assets must be loaded before render starts.

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
- `npm run lint` — composes `validate-video.js --all` + `lint-determinism.js --all`

Use standard tools instead of ad hoc `find`, `grep`, custom Playwright, or runtime spelunking unless there is a concrete gap.

## Validation

Before review handoff:

1. `node tools/list-snapshots.js --for <slug>`
2. `node tts/generate.js --video <slug>`
3. `node tools/validate-video.js <slug>`
4. `node tools/check-video-playback.js <slug> --seconds 30`

Visual QC belongs to the user unless explicitly requested. If you do run a browser check, keep it scoped and report what you verified.

Provide playable HTML review URLs after validation:

- Full video: `http://localhost:4321/scenes/player.html?video=<slug>`
- Chapter-only: `http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>`

Do not answer that the repo has no URLs just because MP4 capture lands separately.

## Push Back

Stop and push back when:

- Storyboard approval has not happened — see `wpforms-video` skill HARD-GATE
- A requested state would require fake WPForms UI
- A snapshot is missing and cannot be truthfully derived
- PostIntro is being weakened instead of built with approved animation surfaces — see `wpforms-postintro` skill
- Implementation pressure points toward protected core
- Descriptor mode is being used to avoid legacy/effect choreography that the approved storyboard needs

## Where Topic Rules Live (Quick Map)

Don't look here for these — load the skill instead:

| Topic | Skill |
|---|---|
| Intake / storyboard gate / production truth / legacy chapter shape / modes | `wpforms-video` |
| PostIntro multi-animation rule / build order / canonical references | `wpforms-postintro` |
| GSAP L0 discipline / registered timelines / `pausableRaf` / Flip patterns / effects library | `wpforms-gsap-rules` |
| `surface: 'editorial' / 'mixed'` / blocks library / atmospheric kit / text-kit / hero composition | `wpforms-marketing` |
| Chapter breaks / swap styles / `flipBridge` / camera poses / shared-scene / scrubber / render | `wpforms-transitions` |

Skills are at `.claude/skills/<name>/SKILL.md`. Each is a single file with YAML frontmatter (`name`, `description`).
