---
name: dev-advocacy-video
description: "Rock-level production line for Umair's Dev Advocacy rock (Rock 4): DECIDES which tutorial video to make from the ranked topic backlog, then drives it end-to-end — doc research, authoring via wpforms-video (its gates apply), review via video-qc, headless 4K render (never OBS), ship to Kacie, embed in the doc, write back to the wiki (log + scorecard + in-flight state). Use when Umair says 'continue on dev advocacy rock', 'dev advocacy', 'video day', 'next video', 'what video should I make', 'rock 4', or resumes video production. NOT the authoring skill itself (that's wpforms-video), NOT for marketing/launch films (wpforms-marketing), NOT for polish passes on shipped videos (wpforms-video-polish)."
---

# Dev Advocacy Video — the Rock 4 production line

One run = one shipped video. The rock (Q3 2026): "2 x educational / short product video aimed at developers and advanced users for YouTube/social media and docs." 2/week, decoupled from launches. Cadence beats polish — David scores the drumbeat.

This skill is the WRAPPER. Authoring belongs to `wpforms-video` (tutorial path), review to `video-qc`, postIntro to `wpforms-postintro`. This skill decides WHAT to build, adds the render/ship/logging tail those skills stop short of, and keeps the rock's state in the wiki.

## Wiki state (absolute paths — sessions run in THIS repo, state lives in the wiki)

- Backlog: `C:\Users\PC\Desktop\umair-wiki\video\wpforms-video-topics-2026-07-21.xlsx` (Summary sheet; read with python/openpyxl)
- In-flight + shipped tracker: `C:\Users\PC\Desktop\umair-wiki\video\ideas.md`
- Rock definition: `C:\Users\PC\Desktop\umair-wiki\rocks\rock4-video.md`
- Work log: `C:\Users\PC\Desktop\umair-wiki\log.md` · Scorecard: `C:\Users\PC\Desktop\umair-wiki\scorecard.md`
- Avatar roadmap (do not block shipping on it): `C:\Users\PC\Desktop\umair-wiki\video\avatar-plan.md`

## Tutorial format contract — these are PROPER tutorials

Rock videos read like tutorials, not films. the-drop / lights-come-on are launch-film precedents for RENDERING only, never for format.

- **Shape:** brief title → what-you'll-learn intro (1-2 lines) → numbered step-by-step walkthrough of the REAL UI in the order a user would actually click → recap outro + pointer to the full doc.
- **The UI is the star.** Cursor, clicks, typing, panel focus, zoom-to-direct-attention. Motion exists to guide the eye, never to perform. No editorial/ad-style beats, no kinetic typography, no atmospheric sequences — that's the `wpforms-marketing` path, not this rock.
- **Narration is instructional and doc-adjacent** ("Click Save. Next, open..."), synced beat-for-beat to the on-screen action. WPForms style-guide voice: conversational, 3rd-grade reading level — **blog-post voice, not robot-doc voice** (Umair ruling 2026-07-22). Use `<break time="0.6s" />` pause markup at phrase boundaries the motion needs (ElevenLabs honors it). The video is a doc you can watch — a viewer should be able to DO the steps along with it.
- **PostIntro is a MUST for rock tutorials** (Umair overruled the old "default: skip" 2026-07-22). Build it to the full multi-animation rule via `wpforms-postintro`; the CONCEPT still gets ruled at the storyboard gate — mandatory presence, negotiable content.
- **Connect/OAuth flows are IN scope** for addon tutorials: if the doc walks through connecting an account, the video shows it — real sign-in state + a frozen real OAuth page (`tools/capture-external.js`), never fabricated. Scoping OAuth out caused the entry-automation ch3 rework.
- **Chapter headings live in a top-of-stage pill**, never centered over the product UI.
- **Product UI fills the frame** — mac body ≈ 90% stage width (1720×868 outer for 1380×668 captures, same aspect, ×1.246377 upscale on the slot wrapper). A 71%-width frame read as "too small" at first QC.
- **Outro card carries the doc's FULL URL as on-screen text** (e.g. `https://wpforms.com/docs/entry-automation-addon/`) — the doc is the distribution target.

## Narration voice — ElevenLabs + Kacie's voice ID (SHIPPED 2026-07-22)

- **Final narration ships via `node tts/generate.js --video <slug> --engine elevenlabs`** in Kacie's cloned voice (channel-voice continuity — Kacie uploads these to WPForms socials/YouTube). Key = `ELEVENLABS_API_KEY`, voice = `ELEVENLABS_VOICE_ID_KACIE`, both in the repo `.env` (never committed); the engine hard-errors when unresolved. Model default `eleven_multilingual_v2` — honors `<break time="0.6s" />` and punctuation pacing.
- **Drafts + QC iterations** may use Voicebox (local, free, fast). Never ship Voicebox audio.
- **TTS-spelling pass before every render:** URLs read as words ("WPForms dot com"), initialisms spaced ("F T P", "A M"). Grep `narration/*.txt` for `\.(com|org)\b|http` before generating.
- **DUR tables are voice-coupled.** After EVERY tts/generate run (draft→final voice switch especially): `node tools/measure-narration.js <slug>` and paste the emitted block — durations WILL shift between voices; hand-estimated DURs caused a whole audio-desync QC class.
- This supersedes the repo's "Voicebox, not ElevenLabs" rule FOR THIS ROCK's videos (Umair decision, 2026-07-22).

## Pipeline

### 0. Resume check (every run, before anything)
Read `ideas.md` → "In flight". If a video is mid-pipeline, resume at its recorded stage. Only pick a new topic when nothing is in flight.

### 1. Pick the video (Claude decides, Umair confirms)
1. Read the xlsx Summary sheet + `ideas.md` "Shipped" list.
2. Pick = highest-ranked Tier A topic not shipped and not in flight. **Standing override: Entry Automation is video 1 (David named it in the 1:1).**
3. State the pick with its numbers (sessions / revenue / video-on-doc) and the one-sentence reason. Confirm before spending time. If Umair names a topic, skip the ceremony.

### 2. Doc research → angle note (~15 min)
Fetch the live doc (curl, not WebFetch). Reduce to ONE teachable promise — not the whole doc. Angle note: promise, 3-5 beats, target runtime (1-3 min; "short product video" is the lane), UI states each beat needs. This note is the intake for `wpforms-video`.

Audience check: does it teach a developer or advanced user? If it drifted general-audience, flag it (Tier C needs David's OK).

### 3. Author — INVOKE `wpforms-video` (its rules govern)
Hand over the angle note + the Tutorial format contract above. That skill owns: snapshot inventory (`tools/list-snapshots.js`), capture (real UI only, local WP — **ask which local site if not stated**; needs WPForms Pro + target addon active), the 🛑 storyboard approval gate, chapter/manifest authoring, narration (draft voice per Narration section — Voicebox for drafts, confirm running at `http://127.0.0.1:17493`; Kacie voice ID for finals), validation, review URL.
- PostIntro: REQUIRED per the format contract (full multi-animation rule via `wpforms-postintro`); the concept gets ruled at the storyboard gate.

### 4. Review loop — per `video-qc`
Umair owns all visual/audio judgment. Minimal correct edits, scene URL back, wait. No self-QC theater.

### 5. Render (Claude renders — NEVER OBS)
```bash
node tools/render.js <slug> --resolution 3840x2160 --fps 30
```
- **4K (3840x2160) is the target.** Nothing has shipped above 1080p yet (the-drop = 1920x1080), so on the first 4K run: render ONE chapter (`--chapter <id>`), inspect layout/text at 2x, then full render. If the player breaks at 4K: ship 2560x1440 and log the gap to the rock file's tool-work queue.
- Renderer writes silent H.264 (by design — docs/render.md). **Mux narration + BGM** (single-html: `tools/render-singlehtml-audio.js`; else ffmpeg mux — `videos/the-drop/render/the-drop-with-audio.mp4` is the precedent). Final file must have sound.
- Preflight: `ffmpeg` + `ffprobe` on PATH.
- QC the MP4: ffprobe resolution/fps/duration; audio present + synced at start/middle/end; spot-check 3 frames.

### 6. Ship + close the loop
1. MP4 to Kacie (she uploads to WPForms socials/YouTube).
2. When her upload is live: **embed it in the matching wpforms.com doc** ("docs" is a named distribution target in the rock). Metric: docs-without-video baseline 231 (2026-07-21) ticks down per embed.
3. **Doc-staleness feedback:** log any doc↔product divergences found while building into `docs/product-truth/<feature>.md` and TELL UMAIR — he owns the docs; each video doubles as a doc audit. (Precedent: entry-automation found the live addon renders the Drive account dropdown directly — the doc's "click Add New Connection" step no longer occurs.)
4. Wiki write-backs (absolute paths above): one-liner to `log.md`; bump the `scorecard.md` videos row; move the topic to "Shipped" in `ideas.md`; clear "In flight". Remind Umair to keep rock status honest in the collective agenda (QR behavioral ask).

## Standing rules

- Timebox: new-surface video ≤ half a day; existing-surface ≤ 3h. Overrun → cut scope (shorter video, existing postIntro kind), never the sleep (QR: sustainability is explicit).
- Pausing mid-video: write slug + stage + next action to `ideas.md` "In flight" before the session ends.
- Tool development never happens inside a video slot. Gaps (4K verification, audio one-command mux, avatar phases) go to the rock file's tool-work queue.
- Launch/marketing clips are NOT this rock (Rock 3 / wpforms-marketing).
- Note: `wpforms-video` still says "MP4 capture is external" — outdated for this pipeline; step 5 here supersedes it. Don't re-edit that skill mid-run.
