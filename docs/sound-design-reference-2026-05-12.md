# Sound Design Reference — 2026-05-12

Reference doc. NOT a current implementation plan — sound work is queued for after the architecture / merge work lands.

Combines:
1. The "Music and SFX Selection for Tech Demo Videos" skill (received from external source 2026-05-12, archived below)
2. Our existing in-repo audio infrastructure (already-implemented for the engine path, NOT yet wired into single-HTML)
3. The gaps + recommendations for when we wire sound into the new architecture

## What we already have (in-repo)

### Existing SFX pipeline — `runtime/sfx.js`

Full Web Audio API SFX engine, engine-path coupled. 9 channels, 8 MP3 assets at `assets/sfx/`:

| Channel | File | When (current usage) |
|---|---|---|
| `click` | `click.mp3` | Every `cursor.click()` in engine path |
| `clickAlt` | `click.mp3` (same file) | Alt variation, used via `playClickAlt()` |
| `type` | `type.mp3` | Per-keystroke during `typeInto` |
| `hover` | `hover.mp3` | Pre-click magnetic affordance tick |
| `swoosh` | `swoosh.mp3` | Every chapter break + snapshot swap |
| `swooshEntry` | `swoosh-entry.mp3` | Intro → first chapter handoff only |
| `swipe` | `swipe.mp3` | `push` swap style (now removed — file may be orphan) |
| `popUi` | `pop-ui.mp3` | Highlight appear, card surface tick |
| `popDrop` | `pop-drop.mp3` | Drag-drop landing |

**Architecture wins:**
- Web Audio (not `<audio>` tags) → zero latency, true overlap, decode-once buffer-many
- Autoplay-gated via `initSfx()` from start-gate handlers
- Channels = clean separation, easy to extend

### Existing BGM + ducking — `scenes/shared.js`

- `startBGM(src, opts)`, `stopBGM(opts)`, `playNarration(slug)`
- Duck-on-narration-start, un-duck-on-end
- `BGM_FULL = 0.30` default; manifest can override via `bgm: { volume: 0.30 }`
- Linear ramp (could be upgraded to S-curve per skill spec)

### Existing TTS — `tts/generate.js`

- Voicebox-backed (`http://127.0.0.1:17493` by default, Kokoro af_heart profile)
- Per-video: `node tts/generate.js --video <slug>`
- Renders `videos/<slug>/narration/*.txt` → `*.mp3`
- Skips if mp3 newer than txt (override with `--force`)

### NEW single-HTML pipeline status — **sound NOT wired**

- `Cursor.click()` — visual squash + ripple but no `playClick()` call
- `IframeManager.swap()` — visual crossfade but no `playSwoosh()` call
- `caretType` — no per-key tick
- `popOut` — no `playPopUi()`
- `videos/_shared/narration.js` (Phase 3 gap-fill) — narration helper exists but ducking not yet wired

## Gap analysis vs the skill's "Essential SFX Kit"

The shared skill recommends 8 essential SFX. We have 7 of them already. Missing 1, plus 3 nice-to-have-for-premium-feel:

| Essential | Have? | Notes |
|---|---|---|
| Keyboard clicks (3-4 variations) | ✅ `type.mp3` (single variant — could layer 2-3 more) | Recommend recording 2 more variants for variety per skill |
| Mouse click | ✅ `click.mp3` + `clickAlt.mp3` (same file currently) | Should diverge clickAlt into a real second sound |
| Success chime | ❌ **MISSING** | High-value addition for "✓ Connected" beats, postIntro payoff |
| Error tone | ❌ Missing | Lower priority — tutorial videos rarely show errors |
| Notification ping | ❌ Missing | For "form submitted" moments |
| Whoosh (fast/slow) | ✅ `swoosh.mp3` + `swooshEntry.mp3` | Have 2 variants already |
| Pop/spawn | ✅ `popUi.mp3` + `popDrop.mp3` | Covered |
| Ambient data flow | ❌ Not in stock | Optional ambience layer — low priority |

**Tier-1 additions (when we do sound work):**
- `success.mp3` — rising chime, 200-400ms, for "Connected ✓" / completion beats
- A real second `clickAlt.mp3` (currently a duplicate of click.mp3)

**Tier-2 additions (nice-to-have):**
- `submit.mp3` — satisfying form-submit press
- `signoff.mp3` — short brand outro chord (matches the brand sign-off card moment)
- `pillMorph.mp3` — soft pitch-up between status pill phases

## Industry-standard mix levels (from the skill, for our reference)

When we wire ducking into `videos/_shared/narration.js`:

| Element | Level | Notes |
|---|---|---|
| Background Music (full) | -18 to -15 dB | Baseline, always present |
| Music during narration (ducked) | -24 to -20 dB | -6 to -8 dB below baseline |
| Primary SFX | -12 to -8 dB | Important interactions |
| Secondary SFX | -18 to -14 dB | Ambient, supporting |
| Notification SFX | -10 to -6 dB | Attention-grabbing |
| Voice/Narration | -6 to -3 dB | Always prominent |
| Master headroom | 3 dB | No clipping above -3 dB peaks |

### Ducking spec (improvement over our current linear ramp)

- **Attack:** 100-200ms (S-curve, not linear)
- **Hold:** narration duration + 200ms lookahead-on-end
- **Release:** 300-500ms (S-curve)
- **Reduction:** -6 to -8 dB from baseline
- **Lookahead anticipation:** start the duck ~80ms BEFORE narration audio begins (sounds more "intentional")

### Fade curves (for our gsap-style audio fades)

```js
// Linear (simple transitions)
const linear = (t) => t;

// Exponential (natural fade-out)
const expoOut = (t) => t * t;

// Logarithmic (perceived-linear fade-in for volume)
const logIn = (t) => Math.sqrt(t);

// S-curve (smooth crossfade — recommended for ducking)
const sCurve = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
```

Standard durations:
- Scene change: 500-800ms (S-curve)
- Music intro fade-in: 1-2s (logarithmic)
- Music outro fade-out: 2-3s (exponential)
- SFX tail: 100-300ms (exponential)
- Narration ducking: 150-250ms (S-curve)

## Music matching matrix (for our content categories)

Per the skill, mapped to our actual video types:

| Our video type | Mood | Style | BPM |
|---|---|---|---|
| WPForms tutorial (e.g., make-field-required) | Calm/Professional | Code-tutorial lo-fi | 70-90 |
| AI-feature tutorial (build-forms-faster-with-wpforms-ai) | AI/ML demo ambient | Subtle synths, minimal percussion | 80-100 |
| Marketing/announcement (e.g., wpforms-notifications-promise) | Uplifting corporate | Building energy, positive resolution | 100-120 |
| Mixed (klaviyo-quick-connect, rest-api-overview-polished) | Tech corporate | Professional, modern, clean | 95-115 |
| Performance/speed demo | High energy electronic | Driving beats | 120-140 |

Use sparingly — most WPForms tutorial content lives at 80-110 BPM.

## Royalty-free sources to evaluate

| Service | Tier | Best for |
|---|---|---|
| **Epidemic Sound** | Premium ($15-49/mo) | High-quality tracks, large library — best ROI if we ship many videos |
| **Artlist** | Premium ($16-25/mo) | Cinematic, modern tracks — for postIntro / editorial work |
| **Musicbed** | Premium ($9-49/mo) | Premium unique compositions — when a specific concept needs a specific track |
| **Pixabay** | Free | Attribution optional — good for testing, prototype audio |
| **Freesound.org** | Free (CC) | SFX libraries — supplement to existing 8 channels |
| **Mixkit** | Free | Commercial use allowed, decent quality |
| **ElevenLabs Sound Effects API** | Pay-per-use (~$0.05/generation) | Generate custom SFX from text prompts — exactly what we'd use for the missing success/submit/signoff sounds |

## Recommended workflow (for when we do sound work)

### Phase 1 — Wire existing SFX into single-HTML pattern (~150 LOC)
1. Move/refactor `runtime/sfx.js` → `videos/_shared/sfx.js` (or keep both, with single-HTML version as a wrapper)
2. Add optional `sfx: true` parameter to `Cursor` constructor + `IframeManager` constructor
3. When `sfx: true`, auto-play the right channel on `cursor.click()` / `iframeManager.swap()` / etc.
4. Keep manual `playClick()` / `playSwoosh()` exports for one-off triggering
5. Standard: every new video opts in via constructor flag, defaults to off in QC pages

### Phase 2 — Port BGM + ducking into `videos/_shared/narration.js` (~80 LOC)
1. Take existing ducking logic from `scenes/shared.js`
2. Upgrade linear ramp → S-curve
3. Add 80ms anticipatory lookahead on duck-start
4. Verify against the dB targets in the table above
5. Wire into `playNarration()` automatically

### Phase 3 — Generate missing SFX via ElevenLabs (~$0.30 total)
Generate the Tier-1 additions:
- `success.mp3` — text prompt: "Soft rising chime, 250ms, gentle confirmation, premium UI feedback"
- `clickAlt.mp3` (a real second variant) — text prompt: "Subtle bubble-pop UI click, lighter than primary, 80ms"

### Phase 4 — Curate BGM tracks per content type
- One track each for: Tutorial / AI-feature / Marketing / Mixed / Performance
- Source from Epidemic Sound or equivalent
- Loop-friendly, no abrupt arrangement transitions

### Phase 5 — Audio QC pass per video
- Verify SFX timing matches visual events (frame-accurate)
- Verify ducking levels (-6 to -8 dB drop on narration)
- Verify master headroom (no clipping above -3 dB peaks)
- Per-video config: BGM track, narration speed, SFX opt-in flags

---

## Appendix: archived skill content

Below is the verbatim "Music and SFX Selection for Tech Demo Videos" skill received 2026-05-12. Preserved here as canonical reference; do not re-fetch.

### Music Matching Matrix

| Content Type | Audio Style | BPM Range | Key Characteristics |
|--------------|-------------|-----------|---------------------|
| AI/ML Demo | Electronic Ambient | 80-100 | Subtle synths, minimal percussion, futuristic pads |
| Code Tutorial | Lo-fi/Chill | 70-90 | Relaxed beats, non-intrusive, study-music feel |
| Product Launch | Uplifting Corporate | 100-120 | Building energy, positive resolution |
| Bug Fix/Debug | Tense to Resolution | 90-110 | Minor key start, major key resolution |
| Performance Demo | High Energy Electronic | 120-140 | Driving beats, impressive feel |
| API Integration | Tech Corporate | 95-115 | Professional, modern, clean |
| Security Feature | Dark Electronic | 85-105 | Suspenseful undertones, protective feel |
| Success Story | Inspirational | 100-120 | Emotional build, triumphant finish |

### SFX Categories
- **Typing/Keyboard**: mechanical keyboard, soft membrane, terminal beep (layer 2-3 variations)
- **UI Interaction**: click/tap, hover whoosh, toggle, scroll
- **Transition**: whoosh, sweep, glitch, portal/warp
- **Feedback**: success chime, error buzz, warning tone, notification ping
- **Ambient**: data flow, server hum, digital rain, circuit pulse

### Timing patterns
- **Typing sequence**: first keystroke at frame 0, subsequent every 3-5 frames with randomization, pause every 15-20 frames, completion sound on final
- **Success animation**: action initiated → processing indicator loop → completion chime (200-400ms) → visual confirmation lands 10 frames after
- **Error sequence**: attempt → error tone (150-300ms descending) → visual shake → recovery option 30 frames later
- **Spawn/appear**: optional anticipation buildup → main spawn SFX → settle sound 5-10 frames after

### Essential SFX Kit (8 sounds)
1. Keyboard clicks (3-4 variations)
2. Mouse click
3. Success chime
4. Error tone
5. Notification ping
6. Whoosh (fast/slow)
7. Pop/spawn
8. Ambient data flow

### Audio checklist
- [ ] Music matches content mood
- [ ] BPM appropriate for pacing
- [ ] SFX synced to visual events
- [ ] Volume levels balanced
- [ ] Ducking configured for speech
- [ ] Fade curves applied
- [ ] License verified for usage
- [ ] No clipping (peaks under -3 dB)

### Tech demo presets (mood + SFX + music recommendations)
- **AI Assistant**: ambient electronic + subtle pulse, soft typing + thinking indicator + friendly chimes, helpful/intelligent mood
- **Code Generation**: lo-fi beats + minimal electronic, fast typing + completion pops + success tones, productive/focused mood
- **Performance/Speed**: driving electronic + building intensity, whooshes + rapid transitions + impact sounds, impressive/fast mood
- **Error Handling**: tense → resolved (minor → major), warning tones + recovery sounds + success chimes, problem-to-solution narrative
- **Integration/API**: corporate tech + clean electronic, connection sounds + data flow + completion, professional/reliable mood

### Related skills mentioned
- `audio-mixing-patterns`: ffmpeg commands for mixing narration with music
- `remotion-composer`: audio layer integration in Remotion compositions
- `video-pacing`: timing patterns that audio must sync with
- `demo-producer`: full pipeline using these audio patterns

These related skills aren't in our repo currently. If we expand sound design work, the ffmpeg mixing patterns from `audio-mixing-patterns` are likely the most directly useful for our `tools/render.js` MP4 pipeline.
