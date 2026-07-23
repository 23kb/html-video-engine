# Kacie intro/outro recording spec

One-pager to send with each batch of scripts. Goal: real Kacie on camera for
the intro and outro of each tutorial video; the body stays HTML + the cloned
Kacie narration voice, so the whole video sounds like her throughout.

## What we need per video

- **One intro read** (~10–20s) and **one outro read** (~10–20s), to camera.
- Scripts come from us per video (the `narration/intro.txt` / `outro.txt`
  already written for each build). Light paraphrasing to keep it natural is
  fine — the closer to the script, the smoother the hand-off into the
  narrated body.

## Batch it

Record several videos' intros + outros in one sitting — same lighting, same
framing, same room tone across the whole batch makes every stitch cleaner.
20 minutes covers a month of videos.

## Setup (same as your usual videos is exactly right)

- **Camera:** 1080p minimum (4K welcome), landscape, 30fps, on a stable
  stand — no zoom/reframe between intro and outro of the same video.
- **Framing:** head-and-shoulders, centered, eyes to lens — your normal
  full-screen framing from existing videos.
- **Light:** front-lit, no strong backlight.
- **Audio:** your usual mic, quiet room, consistent distance. Audio matters
  double here — it sits right next to the synthesized narration and the cut
  is where ears would notice a change.

## The two habits that make editing painless

1. **Hold 3–4 seconds of still silence** before you start speaking AND after
   you finish, every take (clean trim points + freeze-frame material).
2. **Once per batch, give us one 30-second "idle" take** — just you looking
   at the camera, natural blinks, mouth closed, tiny natural movement. Not
   used in the videos directly; it's freeze-frame and future-proofing
   material (e.g., localized versions down the road).

## Delivery

- Send the original files, no re-encode/compression.
- Naming: `<video-slug>-intro.<ext>`, `<video-slug>-outro.<ext>`,
  `batch-idle.<ext>`.

---

## Pipeline notes (ours, not Kacie's)

- Intake check: `tools/avatar/check-base.py <file>` validates talking-head
  framing on delivery.
- Video shape: **Kacie intro (real) → postIntro → chapters → Kacie outro
  (real)**, assembled by the existing stitch flow; the HTML's own intro beat
  is superseded by her real intro.
- Voice seam: loudness-normalize her recording against the ElevenLabs
  narration (tools/sfx/normalize.mjs) and prefer landing the intro→body
  transition under a chapter-card / music moment.
- OPEN: where the Sullie splash lives now — brand sting between her intro
  and the postIntro, or Sullie bug overlay during the intro. Per-storyboard
  decision; the Sullie-in-every-intro-and-outro rule still applies.
