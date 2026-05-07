# Current Workflow

Last updated: 2026-05-07 (Phase G).

**This is a thin pointer doc.** The canonical workflow lives in the `wpforms-video` skill (`.claude/skills/wpforms-video/SKILL.md`) — load that for the full Approach, HARD-GATE, Production Truth, and Output Checklist.

## Where to read what

| Need | Read |
|---|---|
| The workflow loop + storyboard gate + production truth | `wpforms-video` skill body |
| PostIntro design + multi-animation rule | `wpforms-postintro` skill body |
| GSAP discipline + registered timelines + `pausableRaf` | `wpforms-gsap-rules` skill body |
| Transitions + `flipBridge` + camera poses + scrubber/render | `wpforms-transitions` skill body |
| Editorial / ad-style surfaces + blocks library + atmospheric | `wpforms-marketing` skill body |
| One-line-per-doc map | `docs/INDEX.md` |
| Operator manual (always loaded for Claude) | `CLAUDE.md` |
| Operator manual (always loaded for Codex) | `AGENTS.md` |

## What this tool is

A guided HTML video builder. Two equally-important modes:

1. **Tutorial videos with real WPForms UI** — staged inside a Mac-framed iframe, layered with narration + cinematic moments. Real product DOM is product truth.
2. **Ad-style release / announcement videos** — full-bleed 1920×1080 editorial DOM compositions. `surface: 'editorial'`.

MP4 capture is in-repo via `tools/render.js` (Phase E.5). Wall-clock screencast for tutorials; `--seek` deterministic capture for editorial. The deliverable is a playable HTML review URL plus the MP4.

## The workflow loop

For the canonical sequence with HARD-GATE around storyboard approval, see `wpforms-video` skill "Approach" section. Short version:

1. Intake (topic, slug, sources, constraints).
2. Snapshot inventory (`node tools/list-snapshots.js`).
3. Storyboard proposal.
4. **🛑 STORYBOARD GATE** — explicit user approval required.
5. Implement (legacy/effect-mode by default).
6. TTS via `node tts/generate.js --video <slug>`.
7. Validate: `node tools/validate-video.js <slug>` + `node tools/check-video-playback.js <slug>`.
8. Handoff: playable URL + (optional) `tools/render.js` MP4.

## Production truth (one-line summary)

Real WPForms UI is product truth. Use real captured snapshots as base structural surfaces. Compose DOM-derived states grounded in `tools/field-state.js` or real captured DOM. **Do not fabricate** product-looking HTML or fake snapshot folders. See `wpforms-video` skill "Production Truth" section for full rules.

## Protected core (do not edit during normal video work)

- `engine/*` (entire directory)
- `runtime/player.js`, `runtime/chapter-runner.js`, `runtime/scene-helpers.js`, `runtime/transitions.js`
- `runtime/frame-driver.js`, `runtime/frame-adapter.js`, `runtime/shared-scene.js`, `runtime/camera-poses.js`, `runtime/pause-manager.js`
- `scenes/shared.js`, `scenes/player.html`
- accepted/reference video packages
- existing snapshots
- `tools/validate-video.js` validator behavior

If a beat seems to need a new core helper, surface it as a maintainer change proposal. Don't quietly patch core.

## Per-video files allowed

- `videos/<slug>/manifest.json`
- `videos/<slug>/chapters/*.js` and `chapters/_selectors*.js`
- `videos/<slug>/narration/*.txt` + rendered `*.mp3`
- `videos/<slug>/storyboard.md` (optional)
- `docs/<slug>-handoff.md` (only when user asks for a persistent handoff)
- New snapshot folders **only through capture** (never fabricate)
- `runtime/cinematic-<name>.js` only when intentionally promoting a postIntro archetype, with explicit approval

## Token / cost floor

- Don't grep the whole repo. Read named files.
- Run `node tools/skill-context.js` once per session, then load the skill matching the task.
- Use `docs/examples/legacy-*-skeleton.md` as first copy targets for new chapter / postIntro / manifest work.
- Don't run visual QC unless asked. Visual QC belongs to the user.
- Don't reread historical plan docs. Read this file (or the `wpforms-video` skill).

## What not to use as guidance

- `CONTINUE.md` (don't use)
- Historical stage plans (`docs/stage-4-core-api-plan.md`) unless the user asks for governance/history
- Accepted video packages during startup — read only after you can name the exact pattern needed

---

For the deeper context that used to live in this doc, see the `wpforms-video` skill body. Phase G (2026-05-07) inverted the architecture — topic-scoped rules now live in skills, this doc is a pointer.
