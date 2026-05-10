---
name: wpforms-transitions
description: Use when choosing, validating, or debugging WPForms transitions — chapter breaks (within same snapshot), snapshot swaps (across snapshots), surface modes (iframe / editorial / mixed), camera-pose vocabulary, or the scrubber/render workflow. Triggers on `breakStyle`, `swapStyle`, `flipBridge`, `morph`, `cover`, `dolly`, `glide`, `whip`, "camera pose", "shared scene", `surface:`, `pausableRaf` discussions, or "preview scrubber" / "MP4 render" tasks.
---

# WPForms Transitions

Transitions in this repo come in two flavors:

- **Chapter-break styles** — camera punctuation between chapters on the **same** snapshot.
- **Snapshot-swap styles** — what happens when the iframe DOM changes (cross-snapshot).

Default: `manifest.defaults = { breakStyle: 'glide', swapStyle: 'morph' }`. Override per chapter via `export const breakStyle = ...` / `swapStyle = ...`.

## Chapter-Break Styles (Same Snapshot)

| Style | Duration | Camera | Use when |
|---|---|---|---|
| **`glide`** (default) | 0ms | continuous smooth pan | next chapter's `focusOn` IS the transition; same screen continues |
| `soft-dolly` | 420ms | zoom-out to 1×, no hold | want a chapter-break stamp, no hard establishing shot |
| `dolly` | 700ms + 200ms hold | zoom-out to 1×, hold | new chapter is in a different screen region; full establishing shot |
| `whip` | 180ms | stay zoomed, blur+brightness flash | cinematic cut feel, not a continuation |
| `hold` | 240ms | no camera move | silent micro-pause, HUD beat |

**`glide` is correct most of the time.** It produces zero gap; the next `focusOn` smoothly pans from the current framing to the new target. Use `dolly` only when chapters live on visibly different screens (e.g., builder → settings tab).

## Snapshot-Swap Styles (Cross-Snapshot)

| Style | Mechanism | Cream-bleed | Use when |
|---|---|---|---|
| **`flipBridge`** | preload next snapshot in hidden iframe → opacity crossfade | **none** ✓ | always preferred for cross-snapshot |
| `morph` | body-wipe under cover, restore camera transform on incoming | ~1s flat-color seam | legacy default; use only if `flipBridge` doesn't compose with the chapter |
| `cover` | body-wipe under cover, fade in | ~1.5s flat-color seam | legacy fallback |
| `whip` | blur+dim outgoing, swap, un-blur incoming | ~1s flat seam, blur masks it | rare — cinematic cut + DOM change |
| `push` | cover slides off post-swap | ~1s + slide | rare — motion cue desired |
| `fast` | trimmed-timing `cover` | ~1s flat seam | retire — `flipBridge` replaces |

**The `flipBridge` path is the cream-bleed kill.** It eliminates the "page-refresh" feel you see on legacy swap styles by:

1. Preloads the incoming snapshot to a hidden iframe (`scene-helpers.preloadSnapshot`).
2. Runs prep against the hidden document.
3. Opacity-crossfades incoming over outgoing without wiping the host body.
4. Preserves Mac chrome + watermark + mesh-bg across the swap.
5. Carries the current camera transform (no scale-1 reset).

Verified frame-by-frame on `a-complete-guide-to-the-checkboxes-field` and `form-entries-guide`. See `tools/qc-out/.../FINDINGS.md`.

**WRONG — manifest defaults swapStyle to `morph` and the chapter doesn't override:**
```js
// videos/<slug>/chapters/edit-section.js
// (nothing) → swapStyle inherits manifest default (morph) → cream-bleed seam
```

**RIGHT — explicit `flipBridge` per chapter or in manifest defaults:**
```js
// videos/<slug>/chapters/edit-section.js
export const swapStyle = 'flipBridge';
```

Or, repo-wide preferred:
```json
// videos/<slug>/manifest.json
{ "defaults": { "breakStyle": "glide", "swapStyle": "flipBridge" } }
```

## Surface Modes

`manifest.surface` declares the stage type. Default is `iframe`.

| Surface | iframe | Mac chrome | mesh-bg | Editorial overlay | Use for |
|---|---|---|---|---|---|
| **`iframe`** (default) | mounted | yes | yes | optional | every existing tutorial video |
| **`editorial`** | NOT mounted | NOT mounted | optional | full-bleed | ad-style / marketing pieces |
| **`mixed`** | mounted | yes | yes | full-bleed above iframe | hybrid postIntros that need product geometry + marketing chrome |

**`iframe` produces byte-identical playback to pre-Phase-C.** Don't change `surface` on existing tutorials; only declare it for new ad-style work.

For `editorial` surface authoring, see `wpforms-marketing` skill.

## Camera-Pose Vocabulary

Named camera poses for legacy/effect beats. Author registers once, beats reference by name:

```js
import { registerCameraPose } from '../../_shared/kit.js';

registerCameraPose('focus', { focus: sel.field, level: 1.18, pad: 14 });
registerCameraPose('station', { focus: sel.section, level: 1.05, pad: 24 });
registerCameraPose('overview', { focus: 'body', level: 1.0, pad: 0 });

// Beat references by name:
{
  id: 'show-field',
  camera: 'focus', // resolves to the registered spec
  // ...
}
```

Seed names: `focus`, `station`, `overview`. Add custom names per video as needed. The runtime resolves before focusing.

**Note:** Pose-to-pose interpolation currently goes through CSS-transition `zoomTo` (not the frame driver). Visible jolts are gone, but scrubber camera-seek through pose changes is approximate. Tracked as deferred work.

## Shared-Scene Primitive

For multi-chapter Three.js or persistent editorial scenes that should survive chapter teardown:

```js
import { getSharedScene, disposeSharedScene } from '../../runtime/shared-scene.js';

const scene = getSharedScene({ id: 'rest-api-orbit', mount: (stage, gsap) => {
  // mount Three.js renderer + initial state
} });
// Subsequent chapters call getSharedScene with the same id — returns the singleton.
// disposeSharedScene at video outro, NOT at chapter teardown.
```

Used in production by `wpforms-rest-api-overview-polished` for the persistent abilities-orbit Three.js scene that survives chapter changes.

## Pause / Seek / Scrubber

The runtime scrubber lives at `/scrubber?video=<slug>` (served by both `serve.js` and `tools/preview.js`). Exposes:

- **Pause / Resume** — hammers every motion source via `runtime/pause-manager.js`: GSAP global timeline, frame driver, iframe CSS animations, narration audio, BGM, wall-clock `pausableSleep`.
- **Chapter prev / next / restart** — restart chapter from beat 0.
- **Registered timeline strip** — seek freely within registered-timeline windows (opt-in via `registerTimeline`).

**Mid-chapter wall-clock seek is NOT supported.** Imperative `effect()` bodies cannot be replayed at arbitrary positions without full state reconstruction. Documented limit. Restart-from-chapter-N is the seek granularity.

For the contract: see `docs/pause-manager.md`. For author RAF loops, see `wpforms-gsap-rules` skill (`pausableRaf`).

## Render Workflow

`node tools/render.js <slug> [--seek] [--fps 30]` produces an MP4.

- **Default (wall-clock)** — Puppeteer screencast + FFmpeg encode. Works on every video. Output at `videos/<slug>/render/<slug>.mp4`.
- **`--seek`** — frame-deterministic seek render. **Only valid for `surface: 'editorial'` videos** (registered timelines + paused-timeline pipeline). The render tool refuses `--seek` for `surface: 'iframe'` videos — wall-clock + audio-cued + per-beat-narration aren't seekable.

The wall-clock and seek modes produce visually similar but not byte-identical output (PSNR ~41 dB on the editorial pilot).

## Decision Tree

| Situation | Use |
|---|---|
| Same snapshot, next chapter on same screen | `breakStyle: 'glide'` |
| Same snapshot, next chapter on different screen region | `breakStyle: 'soft-dolly'` or `'dolly'` |
| Same snapshot, want cinematic cut feel | `breakStyle: 'whip'` |
| Snapshot change, default | `swapStyle: 'flipBridge'` |
| Snapshot change, `flipBridge` doesn't compose | `swapStyle: 'morph'` (legacy) |
| Ad-style / marketing video, no product UI | `manifest.surface: 'editorial'` |
| Hybrid: product geometry + marketing chrome above | `manifest.surface: 'mixed'` |
| Multi-chapter Three.js / persistent editorial | `runtime/shared-scene.js` |
| Need scrubbable / hidden-tab-survivable choreography | Register timeline via `registerTimeline()` (see `wpforms-gsap-rules`) |
| Author RAF loop in a chapter | `pausableRaf()` from `videos/_shared/kit.js` |

## Output Checklist

Before declaring transition work done:

- [ ] Every snapshot-changing chapter has `swapStyle: 'flipBridge'` (manifest default or per-chapter)
- [ ] Cross-snapshot transitions verified visually — no flat-color "page-refresh" frame, Mac chrome stays mounted across swap
- [ ] Camera poses registered once at module top, beats reference by name (no inline `level: 1.18` if a pose name fits)
- [ ] If `surface: 'editorial'`, the storyboard explicitly approved ad-style / no-iframe staging
- [ ] Author RAF loops use `pausableRaf` (cross-cuts with `wpforms-gsap-rules`)

## References (loaded on demand)

- `docs/transitions.md` — Canonical reference for all transition styles, surface modes, `flipBridge` algorithm, and chrome-above-cover invariant.
- `docs/camera-poses.md` — Read when working with named camera poses or extending the seed set (`focus`, `station`, `overview`).
- `docs/shared-scene.md` — Read when designing or migrating a multi-chapter persistent scene.
- `docs/frame-driver.md` — Read when scrubber camera-seek behavior matters (deferred camera-on-driver work).
- `docs/pause-manager.md` — Read when working with the scrubber, pause/resume hooks, or chapter-seek semantics.
- `docs/render.md` — Read when running `tools/render.js` (wall-clock or `--seek` mode).
- `docs/preview.md` — Read when using `tools/preview.js` for live-reload + scrubber.
- `tools/qc-out/form-entries-guide/FINDINGS.md` — Read for the morph-vs-fast comparison + race-condition analysis.

## Granular craft references

- `docs/camera-lensing.md` — Read when picking `level:` for `registerCameraPose` specs or for chapter beats.
- `docs/cursor-choreography.md` — Read for cursor behavior across `flipBridge` swaps and chapter-break transitions.
- `docs/stage-css.md` — Read for chrome-above-cover invariant and z-stack across swap styles.
- `docs/beat-pacing.md` — Read for chapter-break timing (`glide` is silent; `dolly` adds 700ms).

## See Also

- `wpforms-video` — universal authoring + chapter shape (chapters declare `breakStyle` / `swapStyle`).
- `wpforms-postintro` — postIntros often span snapshot boundaries; `flipBridge` is the right tool.
- `wpforms-marketing` — `surface: 'editorial'` and `surface: 'mixed'` authoring.
- `wpforms-gsap-rules` — registered timelines + `pausableRaf` (cross-cuts the scrubber and seek render).
