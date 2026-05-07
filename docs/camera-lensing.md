# Camera Lensing

Zoom level vocabulary. What `level: 1.0`, `1.5`, `1.8`, `2.2`, `2.4` actually read as on-screen, and how to pick.

The `camera.level` field on a beat controls iframe scale. The math is simple: `level: 2.2` means the target element fills the stage at 2.2× the iframe's native scale. The visual reading is what matters.

## Level reading guide

| Level | Reads as | Use when |
|---|---|---|
| **1.0** | Full iframe view, no zoom | Establishing shots, overview chapters, "look at the whole form" beats |
| **1.05** | Subtle zoom, ambient | The `station` camera-pose default. Used between focused beats to give variety. |
| **1.18** | Comfortable section view | Single-section focus (one panel of the builder, one column of a table) |
| **1.5** | Medium close-up | Multi-element focus: a label + its input + its description |
| **1.8** | Close on a control group | A toggle + adjacent label + helper text. Tight enough to read details. |
| **2.0** | Standard tutorial close-up | Default for normal product beats. The runtime default is 2.2; `2.0` is slightly looser. |
| **2.2** | Default (runtime) | What `runScene` uses if `cam.level` is unset. Works for most click/type beats. |
| **2.4** | Tight focus | Single button or input with surrounding context. Reads as "this is the thing." |
| **2.8+** | Macro detail | Single character / single icon / single state badge. Use sparingly — context disappears. |

## Defaults

- **Runtime default:** `cam.level: 2.2` if unset (engine.js `runScene`).
- **Locked manifest convention:** typical chapters use 1.5-2.4 depending on element size.
- **Below 1.0:** **don't.** The Mac frame chrome leaks around the iframe (it's a fixed-size hard outer frame; iframe at <1× scale shows gaps). Validator flags this for builder snapshots.
- **PostIntro beats:** typically `level: 1.0` (full bleed, no zoom) so the editorial layer fills the stage.
- **Editorial surface mode:** `level` is generally meaningless — the editorial layer fills 1920×1080.

## How to pick

Start from the element you want the viewer to focus on:

- **Single button or input field:** `level: 2.0-2.4`.
- **One panel (Field Options, Settings tab):** `level: 1.18-1.5`.
- **Section with multiple controls:** `level: 1.0-1.5`.
- **Whole canvas / form preview:** `level: 1.0`.
- **Macro detail (one icon, one badge, one character):** `level: 2.8+`. Verify visually.

If the rendered framing feels too tight, drop level. Too loose, raise it. The `pad` field adds breathing room without changing the level.

## `pad` — the breathing room

`camera.pad: 14` adds 14px of padding around the union bounding box of the focus targets. Default is 10. Use higher pad (20-30) for:

- Dense panels where you want the section header/footer visible
- Reaction shots where surrounding context matters
- Beats where the user might glance at adjacent elements

Use lower pad (4-8) for:

- Macro detail beats where you want zero visual chrome around the target
- Read-the-text beats (level 2.5+) where pad would push the text off-stage

## Camera poses (Phase C)

For repeat camera framing across beats, use `registerCameraPose` from `videos/_shared/kit.js`:

```js
import { registerCameraPose } from '../../_shared/kit.js';

registerCameraPose('focus',    { focus: sel.target,  level: 1.18, pad: 14 });
registerCameraPose('station',  { focus: sel.section, level: 1.05, pad: 24 });
registerCameraPose('overview', { focus: 'body',      level: 1.0,  pad: 0 });

// In beats:
{ id: '...', camera: 'focus', ... }   // resolves to the registered spec
```

Three named seeds (`focus`, `station`, `overview`) cover most chapters. Add custom names per video.

See `wpforms-transitions` skill for the camera-pose API.

## Smooth pan vs hard dolly

By default `zoomTo` does a 1-frame snap-to-scale-1 reset before applying the new transform when `smooth: false` (the default). That's the "page refresh" jolt diagnosed in Phase 0. Phase C centralized camera writes; the visible jolt is now gone.

For continuous beats within a chapter (`sameChapter` true), the camera smooth-pans between targets. For chapter breaks with `breakStyle: 'glide'`, the next beat's `focusOn` IS the transition — pure smooth pan from current framing to new target.

`breakStyle: 'dolly'` zooms out to 1× then back in. Use only when chapters are on visibly different screens.

## Common mistakes

| Mistake | Fix |
|---|---|
| `level: 1.0` for a single-button click beat | Bump to 2.0-2.4 — viewer can't tell what's clicked |
| `level: 2.4` for a multi-section overview | Drop to 1.0-1.5 — too tight, viewer loses spatial context |
| `level: 0.8` to "zoom out" beyond the iframe | Don't — Mac chrome leaks. Use `level: 1.0` with high `pad` |
| Inline `level: 1.18, pad: 14` repeated in 5 beats | Register a camera pose once, reference by name |
| Camera changes every beat with no rest | Cluster beats around 2-3 poses with smooth pans between |
| Dolly chapter-break used between beats on the same screen | Use `glide` instead — `dolly` adds 700ms+ that you don't need |
| Level chosen for narration, not visual | Pick from the visual reading; narration will stretch/contract to fit |

## See also

- `wpforms-video` skill — chapter shape with `camera` field.
- `wpforms-transitions` skill — camera poses + chapter break / swap styles.
- `engine/engine.js` `zoomTo` — the underlying API.
- `runtime/camera-poses.js` — pose registry source.
- `docs/camera-poses.md` — pose API reference.
- `analysis-quality-and-transitions.md` §1.5 — REST API video lesson on framing the curl one-liner.
