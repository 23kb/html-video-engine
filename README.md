# WPForms Video Project

A system for turning approved storyboards into playable HTML videos —
both **tutorial videos** (real WPForms UI in a Mac-framed iframe) and
**ad-style / release announcements** (editorial scenes, blocks, atmospheric
kit). The agent (Claude or Codex) wires snapshots, narration, BGM,
overlays, transitions, and a topic-specific postIntro into a deterministic
playable URL. MP4 capture is **in-repo** via `tools/render.js`.

---

## Quickstart

```bash
git clone <repo-url>
cd <repo>
npm install

# Optional — only needed if you'll capture new snapshots.
# The existing snapshots play without this.
cp .env.example .env
# edit .env with your WordPress demo-site credentials

# Live-reload preview server with scrubber
node tools/preview.js
# → http://localhost:4321
```

Open a video:

```
http://localhost:4321/scenes/player.html?video=<slug>
```

Single chapter only:

```
http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>
```

The slug is the folder name under `videos/`.

---

## Where to start

**If you're an agent (Claude / Codex):**

1. Read `CLAUDE.md` (Claude) or `AGENTS.md` (Codex) — the canonical
   operator manual. It's intentionally short; topic-scoped rules live in
   skills, not there.
2. Run `node tools/skill-context.js` once per session.
3. Load the skill that matches your task:
   - `wpforms-video` — tutorial authoring, intake, storyboard gate
   - `wpforms-postintro` — postIntro design + multi-animation rule
   - `wpforms-gsap-rules` — GSAP discipline, registered timelines, `pausableRaf`
   - `wpforms-marketing` — editorial / ad-style surfaces + blocks
   - `wpforms-transitions` — chapter breaks, swap styles, camera poses

Skills live at `.claude/skills/<name>/SKILL.md`.

**If you're a human teammate:**

- `docs/INDEX.md` — one-line-per-doc map. Use it to find the right doc fast.
- `docs/authoring-api.md` — public authoring contract (manifest schema,
  chapter exports, ctx helpers, validator behavior).
- `docs/examples/legacy-chapter-skeleton.md` — default chapter shape.
- `docs/postintro-patterns.md` — postIntro design rules.

---

## Making a new video

Tell the agent:

> I want a new video. Slug: `<slug>`. Topic: `<short description>`.
> Source links: `<docs you want covered>`. Audience: `<who>`.

The agent will:

1. Inventory existing snapshots (`tools/list-snapshots.js`).
2. Propose a storyboard with chapters, narration drafts, postIntro concept.
3. **Stop for explicit approval** before any chapter code.
4. After approval: capture missing states, write chapters, render TTS
   narration, validate, hand off a playable URL.

Visual QC is owned by the human reviewer.

---

## Narration (TTS)

Wired to **Voicebox** (local Kokoro TTS).

- Install Voicebox locally — runs on `http://127.0.0.1:17493` by default.
- `node tts/generate.js --video <slug>` auto-connects there. No API key
  or env var needed for the default setup.
- Override per-machine if Voicebox runs elsewhere:
  - `VOICEBOX_URL` — endpoint URL
  - `VOICEBOX_PROFILE` — voice profile ID

Switching to ElevenLabs or another TTS isn't supported out of the box —
patch `tts/generate.js` (replace the three fetch calls; the rest of the
pipeline stays the same).

---

## Surface modes

Videos are no longer iframe-only. Each chapter declares a surface:

- `iframe` — real WPForms UI in a Mac-framed iframe (default for tutorials).
- `editorial` — pure HTML/CSS/SVG/GSAP scene (ad-style / hero / cinematic).
- `mixed` — editorial overlays composited over the iframe.

See `docs/transitions.md` for swap styles (`flipBridge`, `morph`, `cover`,
`dolly`, `glide`, `whip`) and `docs/camera-poses.md` for the named
camera-pose vocabulary (`focus`, `station`, `overview`).

---

## Folder layout

```
videos/<slug>/         one folder per video (manifest + chapters + narration)
videos/_shared/        shared kit, effects, blocks, text-kit, lottie-kit
snapshots/<slug>/      captured WPForms UI, reused across videos
engine/                shared framework — protected
runtime/               player shell, chapter runner, cinematics, transitions
scenes/                player.html entry + reference scenes
capture/               Playwright snapshot tool
tts/                   Voicebox TTS pipeline
tools/                 inventory, validation, smoke, preview, render, lint
docs/                  authoring contract, granular references, INDEX.md
.claude/skills/        topic-scoped skill bundles (wpforms-*)
CLAUDE.md / AGENTS.md  operator manuals for agents
```

---

## Tools

| Tool | Purpose |
|---|---|
| `tools/skill-context.js` | Canonical startup context dump |
| `tools/list-snapshots.js` | Snapshot inventory (`--search`, `--for <slug>`) |
| `tools/inspect-snapshot.js` | Selector emit (`--emit-selectors --filter`) |
| `tools/verify-selectors.js` | Selector validation against snapshot DOM |
| `tools/field-state.js` | Field-state inventory query (don't full-read the 132 KB doc) |
| `tts/generate.js` | Render narration mp3s |
| `tools/validate-video.js` | Static validator |
| `tools/check-video-playback.js` | Non-visual smoke test |
| `tools/preview.js` | Live-reload server + scrubber UI |
| `tools/render.js` | In-repo MP4 export (`--seek` only for editorial) |
| `tools/lint-determinism.js` | Render-parity check (no `Date.now`, no unseeded `Math.random`, no `fetch`) |
| `npm run lint` | Composes `validate-video.js --all` + `lint-determinism.js --all` |

---

## Validation and review

Before review handoff:

```bash
node tools/list-snapshots.js --for <slug>          # confirm snapshots resolve
node tts/generate.js --video <slug>                # render narration
node tools/validate-video.js <slug>                # static validator
node tools/check-video-playback.js <slug> --seconds 30   # non-visual smoke
```

Then open the playable URL.

---

## Recording an MP4

In-repo, deterministic:

```bash
node tools/render.js <slug>             # wall-clock (default for tutorials)
node tools/render.js <slug> --seek      # frame-stepped (editorial only)
node tools/render.js <slug> --fps 30
```

Audio (narration + ducked BGM) is baked into the page — the renderer
captures it.

---

## Determinism

Video chapter and runtime cinematic code is **deterministic logic**
(required for `--seek` parity):

- No `Date.now()` outside the player driver.
- No unseeded `Math.random()` — use `mulberry32(seed)` from
  `videos/_shared/kit.js`.
- No `fetch()` at runtime — assets must be loaded before render starts.

Enforced by `node tools/lint-determinism.js`. See
`docs/deterministic-logic.md` for rationale.

---

## Protected areas

Per-video work must NOT edit:

- `engine/*` (entire directory)
- `runtime/player.js`, `chapter-runner.js`, `scene-helpers.js`,
  `transitions.js`, `frame-driver.js`, `frame-adapter.js`,
  `shared-scene.js`, `camera-poses.js`, `pause-manager.js`
- `scenes/player.html`, `scenes/shared.js`
- Existing accepted video packages (except scoped fixes)
- Existing snapshots (capture new ones; do not edit captured DOM)
- `tools/validate-video.js` validator behavior

If a beat seems to need core, stop and propose a video-local helper or a
runtime helper sketch — both are approval-gated.

---

## Reference video packages

| Slug | State |
|---|---|
| `a-complete-guide-to-the-checkboxes-field` | Reference video 1. Scoped fixes only. |
| `build-forms-faster-with-wpforms-ai` | Reference video 2. Scoped fixes only. |
| `creating-first-form` | Older, reference. |
| `form-entries-guide` | Older, reference. |
| `form-notifications` | Older, reference. |
| `surveys-and-polls-v4-final-synced` | Older, reference. |
| `stage-5-transition-lab` | Stage-5 transition R&D harness. |

Read reference packages on demand only after you can name the
implementation pattern you need.

---

## Non-negotiables

- **Voicebox for TTS** (not ElevenLabs).
- **WPForms UI is product truth** — no fabricated UI, no fake snapshot
  folders. Capture what's missing.
- **Storyboard approval is a hard gate.** No chapter code before sign-off.
- **PostIntro is required** unless explicitly skipped — must be a
  topic-specific concept beat with multiple animation phases, not a
  second title card.
- **Determinism** — render parity is enforced by the linter.
- **Don't push to git** without operator confirmation.

See `CONTRIBUTING.md` for the full team workflow.
