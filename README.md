# WPForms Video Project

A system for turning approved storyboards into playable HTML tutorial
videos. The agent (Claude or Codex) wires real captured WPForms UI into a
Mac-framed iframe, layers narration + BGM + overlays + a topic-specific
postIntro, and produces a playable URL. MP4 capture is external (OBS or
Puppeteer + ffmpeg).

---

## Quickstart

```bash
# 1. Clone
git clone <repo-url>
cd <repo>

# 2. Install
npm install

# 3. Configure local capture creds (only needed if you'll capture new
#    snapshots; the existing 80 snapshots play without this).
cp .env.example .env
# edit .env with your WordPress demo-site credentials

# 4. Serve
node serve.js
# → http://localhost:4321
```

Open a video:

```
http://localhost:4321/scenes/player.html?video=<slug>
```

The slug is the folder name under `videos/`.

---

## Narration (TTS)

The repo currently ships wired to **Voicebox** (local Kokoro TTS).

- Install Voicebox locally — it runs on `http://127.0.0.1:17493` by default.
- `node tts/generate.js --video <slug>` auto-connects there. No API key,
  no env var needed for the default setup.
- Override per-machine if Voicebox runs elsewhere:
  - `VOICEBOX_URL` — endpoint URL
  - `VOICEBOX_PROFILE` — voice profile ID

**Switching to ElevenLabs (or any other TTS):** not supported out of the
box. You'd patch `tts/generate.js` — replace the three fetch calls
(`/generate`, `/history/<id>`, `/audio/<id>`) with the ElevenLabs API
shape and add API-key auth. The rest of the pipeline (text discovery,
skip-if-newer, ffmpeg wav→mp3) stays the same.

---

## Where to start

If you're an **agent** (Claude / Codex):

- Read `CLAUDE.md` (Claude) or `AGENTS.md` (Codex). Pick one — they're
  parallel operator manuals.
- Run `node tools/skill-context.js` to dump the canonical context.
- Default authoring mode is **legacy/effect**. Skeletons live in
  `docs/examples/legacy-*.md`.

If you're a **human teammate**:

- Read `docs/current-workflow.md` (entry point).
- Read `docs/authoring-api.md` (public authoring contract).
- Look at `docs/examples/legacy-chapter-skeleton.md` for the chapter shape.
- Use `docs/postintro-patterns.md` for postIntro design.

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
   narration via `tts/generate.js`, validate, hand off a playable URL.

Visual QC is owned by the human reviewer.

---

## Folder layout

```
videos/<slug>/         one folder per video (manifest + chapters + narration)
snapshots/<slug>/      captured WPForms UI, reused across videos
narration/             legacy narration pool (mp3 + txt) — new videos use videos/<slug>/narration/
engine/                shared framework — protected, do not edit casually
runtime/               player shell + chapter runner + cinematics
scenes/                player.html entry + reference scenes
capture/               Playwright snapshot tool
tts/                   Voicebox TTS pipeline
docs/                  workflow, authoring API, postIntro patterns, examples
tools/                 inventory, validation, smoke, inspection scripts
CLAUDE.md / AGENTS.md  operator manuals for agents
```

---

## Validation and review

Before considering a video done:

```bash
node tools/list-snapshots.js --for <slug>          # confirm snapshots resolve
node tts/generate.js --video <slug>                # render narration
node tools/validate-video.js <slug>                # static validator
node tools/check-video-playback.js <slug>          # non-visual smoke
```

Then open the playable URL and review.

---

## Recording an MP4

The player is an HTML page. To produce an MP4:

- **Quick:** OBS → record the browser window. Click ▶ Start; stop when
  `document.body.dataset.sceneDone === 'true'`.
- **Programmatic:** Puppeteer headless + ffmpeg, or the Hyperframes CLI
  for deterministic frames.

Audio (narration + ducked BGM) is baked into the page, so a screen
recording is enough.

---

## Existing video packages

| Slug | State |
|---|---|
| `a-complete-guide-to-the-checkboxes-field` | Reference video 1. Don't touch except for scoped fixes. |
| `build-forms-faster-with-wpforms-ai` | Reference video 2. Don't touch except for scoped fixes. |
| `creating-first-form` | Older video, kept for reference. |
| `form-entries-guide` | Older, reference. |
| `form-notifications` | Older, reference. |
| `surveys-and-polls-v4-final-synced` | Older, reference. |
| `stage-5-transition-lab` | Stage-5 transition R&D harness. |

The two reference videos are the authoritative pattern source. Read them
on demand only after you can name the implementation pattern you need.

---

## Protected areas

Per-video work must NOT edit:

- `engine/*`
- `runtime/player.js`, `chapter-runner.js`, `scene-helpers.js`,
  `transitions.js`
- `scenes/player.html`, `scenes/shared.js`
- Existing accepted video packages (except scoped fixes)
- Existing snapshots (capture new ones; do not edit captured DOM)

If a feature seems to need core edits, stop and propose a video-local
helper or a runtime helper sketch — both are approval-gated.

---

## Non-negotiables

- **Voicebox for TTS** (not ElevenLabs).
- **WPForms UI is product truth** — no fabricated UI, no fake snapshot
  folders. Capture what's missing.
- **Storyboard approval is a hard gate.** No chapter code before sign-off.
- **PostIntro is required** unless the operator explicitly skips it. It
  must be a topic-specific concept beat, not a second title card.
- **Don't push to git** without operator confirmation.

See `CONTRIBUTING.md` for the full team workflow.
