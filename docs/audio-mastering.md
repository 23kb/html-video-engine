# Audio Mastering

Narration volume, BGM volume, per-beat ducking, SFX, and what `narrationSpeed` actually does.

The runtime has three audio sources: narration (one clip per beat or chapter), BGM (one looped track for the whole video), and SFX (Web Audio click/type/hover/swoosh/pop). Each has its own volume control.

## Manifest-level audio

```jsonc
{
  "narrationSpeed": 1,           // TTS playback rate (1.0 = normal, 1.1 = slightly faster)
  "narrationVolume": 0.25,       // 0.0-1.0, default 1.0
  "bgm": {                       // BGM is optional; omit to use default
    "src": "/bgms/56.mp3",       // path to BGM file
    "volume": 0.2                // 0.0-1.0
  }
}
```

Or `"bgm": false` to disable BGM entirely.

Or `"bgm": "default"` to use the runtime default (low-level ambient).

## Mixing levels (typical values)

| Track | Volume | Reason |
|---|---|---|
| Narration | **0.25-0.5** | Should sit above BGM but not compete with click SFX |
| BGM | **0.05-0.2** | Background presence only. >0.3 fights narration. |
| SFX | (Web Audio master gain) | Per-channel via `runtime/sfx.js` config. Default master is balanced for narration at 0.25. |

The reference videos use these baselines:

- `a-complete-guide-to-the-checkboxes-field`: `narrationVolume: 0.25, bgm.volume: 0.2`
- `form-entries-guide`: `narrationVolume: 0.3, bgm.volume: 0.05`
- `wpforms-rest-api-overview`: BGM-only (no per-beat narration).

## When to use per-beat narration vs BGM-only

**Per-beat narration** (default tutorial mode):
- Each beat has its own `.mp3`. Runner waits for the audio `ended` event.
- Right for: instructional tutorials with a clear "do X then Y" flow.
- Wrong when: cinematic-heavy videos where narration timing fights the visual choreography (REST API lesson).

**BGM-only**:
- No per-beat narration. The video is silent except for BGM + SFX.
- Beats use explicit `duration:` for pacing, not narration `ended` event.
- Right for: cinematic videos, marketing pieces, tech demos where visuals carry the story.
- Wrong when: the viewer needs spoken instruction.

Switching between modes is a manifest-level decision. Don't mix per-beat narration with chapter-level BGM-only.

## Ducking

When narration plays, BGM should drop in volume so the narration sits cleanly. The runtime handles this automatically:

- BGM duck depth: typically `bgm.volume * 0.4` (i.e. drop to 40% of base during narration).
- Duck attack: 200-300ms fade-in.
- Duck release: 400-600ms fade-back.

Per-beat duck override isn't currently exposed; the runtime's automatic ducking covers most cases. If a specific beat needs the narration to stand fully alone (no BGM), manually `await stopBGM()` at beat start and `startBGM()` after.

## `keepDucked` (per-beat narration option)

For sequences where multiple narration clips play in a row (no BGM-back-up between them), pass `keepDucked: true` on the narration call. The BGM stays ducked across the multi-clip sequence and only restores at the end.

The chapter-runner handles this automatically when chapter-level `narration: '<key>'` is used (single clip for the whole chapter), but for `parallel` mode chapters with multiple sequential micro-clips, the option matters.

## SFX channels

`runtime/sfx.js` exposes:

- **`click`** — primary cursor click.
- **`clickAlt`** — alternate click for variety (avoid every click sounding identical).
- **`type`** — per-keystroke during `cursor.typeInto`.
- **`hover`** — soft hover cue.
- **`swoosh`** — chapter-break / camera move accent.
- **`swooshEntry`** — entry variant (postIntro mount, scene start).
- **`swipe`** — `swapStyle: 'push'` slide accent.
- **`popUi`** — element pop-in accent.
- **`popDrop`** — element drop-out accent.

Per-channel volume is set in `runtime/overlays-config.js` `sfx.masterVolume` and per-channel ratios. Don't override per-video unless storyboard approves a different SFX scheme.

**Phase E.5 note:** SFX uses Web Audio (zero-latency `BufferSource`), not `<audio>` tags. The pause-manager pauses Web Audio via `gsap.globalTimeline` + frame-driver, but Web Audio doesn't natively `.pause()` — SFX continues if mid-playback. SFX is short (200-500ms each) so this rarely matters.

## `narrationSpeed`

`manifest.narrationSpeed: 1.1` speeds up TTS playback 10%. Useful for:

- Cinematic videos where slower narration drags the visual.
- Long videos where shaving 10% off total runtime matters.
- AI-build video uses `narrationSpeed: 1.1`.

Don't use it to compensate for too-long narration — split the beats instead.

The TTS is rendered at 1.0× and the manifest applies playback rate at runtime. Per-clip overrides aren't currently supported.

## Common mistakes

| Mistake | Fix |
|---|---|
| BGM at 0.3+ — drowns narration | Drop to 0.05-0.2 |
| Narration at 1.0 (default) without specifying — varies by clip | Always set `narrationVolume` explicitly in manifest |
| Mixing per-beat narration + parallel BGM-only chapters in one video | Pick one mode per video |
| `narrationSpeed: 1.3` to fit narration into too-short beats | Wrong direction — split beats or extend duration |
| BGM file at root `/bgms/56.mp3` referenced but not committed | Phase E.5 fix: tolerate missing audio (404 silent skip), or commit the asset |
| Click SFX volume too high relative to narration | Adjust `runtime/overlays-config.js sfx.masterVolume` (don't fight per-video) |
| No SFX at all (`sfx.enabled: false`) | Reads as silent product demo, not tutorial. Default SFX should be on. |

## TTS pipeline

`node tts/generate.js --video <slug>` reads `videos/<slug>/narration/<id>.txt` files and renders `<id>.mp3` files via the configured TTS engine. The .txt files are committed; .mp3 files are committed for shipping videos but ignored locally for in-progress work.

ElevenLabs / higher-quality TTS replacement is tracked as a future enhancement (REFACTOR-BRIEF.md L6 future-enhancements). Current TTS is sufficient for review URLs.

## Known gap (REFACTOR-PROGRESS.md §2.1)

`assets/sfx/click-alt.mp3` and `bgms/56.mp3` are referenced in `runtime/sfx.js` and some manifests but not committed to the repo. Smoke tolerates missing audio via `--allow-resource-404`. Real fix: commit the assets OR alias `clickAlt` to `click`.

## See also

- `runtime/sfx.js` — Web Audio SFX pipeline.
- `scenes/shared.js` — `startBGM`, `stopBGM`, `playNarration` source.
- `runtime/overlays-config.js` — SFX master volume + per-channel ratios.
- `docs/beat-pacing.md` — narration ↔ beat duration coupling.
- `docs/narration-writing.md` — voice + sentence structure.
- `analysis-quality-and-transitions.md` §1.7 — per-beat-narration vs BGM-only lesson.
