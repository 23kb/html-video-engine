# Ref 2 deep dive — Anthropic "Design by Anthropic Labs" (81.5s, 24fps)

Source export: `C:\Users\PC\Downloads\refs\ZlyVsbXArxWaNQMC\` (Layoapps frame dump).
Same video as `tools/ref-frames/motion-spec.md` § Ref 2 — this file replaces the
12-cut-frame stub with a per-second + OCR-grounded analysis. Keep the parent
motion-spec.md as the 4-ref overview; come here for the full beat sheet.

Inputs used:
- `_per_second.jpg` (6×14 grid, one frame/sec) — beat-level overview
- `_contact_sheet.jpg` (16×11 grid, 0.5s spacing) — sub-beat motion
- `f_0001..f_0326.jpg` (0.25s spacing) — frame inspection at scene cuts
- `_text.txt` — per-frame OCR (used to anchor every timestamp in the macro table)
- `_scenes.txt` — ffmpeg `showinfo` scene-score; cuts at 4.46 / 5.33 / 13.88 /
  14.42 / 17.83 / 21.08 / 44.83 / 49.92 / 53.88 / 61.0 / 62.08 / 65.71 / 66.79 /
  67.92 / 68.88 / 68.92
- `_zoomout_1m11s.jpg` — special wide-shot frame at 71s (24-up design mosaic)

## Macro structure (OCR-anchored)

| Beat | t (s) | Surface | Notes |
|---|---|---|---|
| Title — `🎨 Design` lozenge | 0.0–1.5 | editorial light (cream `#F4F1EC`) | Wordmark + palette icon, dead-center, locked frame. Cursor enters from upper-right. |
| Click → prompt input reveals | 1.5–4.5 | editorial light | Floating input pill: `Describe what you want to create…`. Whole chrome bar slides down from top. |
| Typewriter prompt + file pills | 4.5–8.5 | editorial light | Phrase types in: `Let's design an interactive, dark themed graphic showing how culture flows between cities. A rotating globe with the cities connected by glowing paths.` Two file pills attach mid-type: `flows.docx`, `cities.xlsx`. |
| Status pill: Designing… | 8.75–9.5 | editorial light | Small pill, top-left. |
| Status pill: Tweaking… | 9.75 | editorial light | One-frame swap; pill text mutates char-by-char (visible in OCR `Design 'g... → Tweaking`). |
| Globe forming (dark cut) | 9.5–13.75 | editorial dark (`#0A0A0B`) | Wireframe globe materialises; arc paths draw progressively (stroke-dashoffset). Subtle Y-rotation, ≤8° tilt. |
| Status: Soldering… | 17.75–18.75 | editorial dark | Same pill style, third verb. |
| Comment overlay — Tweaks request | 14.0–17.0 | editorial dark + light overlay | Yellow modal: `Ask Claude to add tweakable sliders or options` → user types `Add controls for the globe and options to see different breakpoints` → cursor on brand-orange `Send`. |
| Plan checklist 5/5 | 17.75–20.75 | editorial light overlay on dark | 5 items appear top-to-bottom with green ✓ chips, then **strike-through** as completed (frame f_0084 = full state). Items: `Read current page layout and components`, `Build tweaks state with defaults`, `Create floating tweaks panel UI`, `Add arc and city toggle controls`, `Add breakpoint viewport switcher`. |
| Globe + Tweaks panel reveals | 21.0–24.5 | editorial dark | Right-side panel slides in. `THEME`, `BREAKPOINT` (Desktop / Tablet / Mobile), `NETWORK` (Arc color, Arc width 0.6, Arc glow 13, Arc density 100%, City size 1.0, Pulse speed 3.4s), `GLOBE` (Grid opacity 0.10, Grid density 10°, Country fill 0.07, Globe size 400, Rotation 1°/s, Tilt 21°, Outer rings, Back grid). City labels populate progressively as camera pans. |
| Hero — `Every place has a story` | 24.75–28.75 | editorial dark | Big serif-ish quote left-aligned, globe centered-right. Numbers `112 / 168 / 6` flicker as if live counters. |
| Flash to white (cut) | 30.0 | flash | Single-frame overexposed bridge between dark mode and prototype mode. |
| Prototype mode prompt | 30.5–32.5 | editorial light | Typewriter again: `Prototype a serene mobile meditation app. It should have calming typography, subtle nature-inspired colors, and a clean layout.` Status morphs `Read, Write x3 → Plan`. |
| Phone mockup + Verifier panel | 32.5–35.0 | editorial light | iOS phone frame center; right-side `Verifier` block lists 5 features (Japandi palette, session cards, ensō progress ring, weekly stats, frosted glass tab bar). |
| Live theme/typography swap | 35.0–46.0 | editorial light | Tweaks panel (right): theme swatches `Stone / Moss / Mist / Clay / Dusk / Sakura / Ink`, `Heading size 100%`, `Body size 100%`. User adds a comment `Add a dark mode toggle` → phone interior animates from cream to near-black; clock stays `12:43 / 12:44 / 12:45 / 12:46` ticking through the change. |
| Status: Dimming… | 41.75–43.0 | editorial light | Verb-pill again, char-mutation. |
| **Window mosaic — 8-up** | 46.0–50.0 | editorial light | Tilted grid of 8 design windows: forest, mobile mockup, dark editorial, design system, mountain landscape, code editor, mobile UI, hero with photo. Each rotated `-2° to +2°`, scaled `0.85–0.95`. Stagger fade-up `y:+20→0, autoAlpha:0→1`, `stagger:0.08`. Then slow upward drift (`y:-8` over 4s). |
| Hemlark Retreat hero | 50.0–53.5 | editorial light | One window centers + scales up — Flip-style hand-off from mosaic tile to hero. Comment `Swap this to the coastline photo` lands → forest photo cross-fades to coast. Right column: schedule list (12:30 Arrive + Check In, 2:30 PM All Hands, 3:30 PM Workshop Icebreaker, 5:00 Free Time, 7:00 Welcome Dinner, 9:00 Bonfire + S'mores). |
| Typography inspector knobs | 53.75–58.0 | editorial light | Right-side panel zooms tighter: `Font Space Grotesk`, `Size 48px → 60px`, `Weight 700`, `Color #000000`, `Align left`, `Line 50.4`, `Tracking -1px`, `Width 426px`, `Height 90px`, `Opacity 1`, `Padding 0px`, `Margin Mixed`, `Radius 2px`. The `Size` slider drives a live type-resize on the hero. |
| Stats card | 58.5–63.5 | editorial light (slate accent) | Card slides up: `3,200+ engineering teams onboarded`, then `78% / 4.9` callouts, then a bar chart. |
| Comment: line graph swap | 63.75–66.5 | editorial light | Yellow comment `Make this a line graph instead?` → bars **morph** to a smooth line chart with `2.2k / 2.8k / 3.2k` labels. |
| Export menu | 67.0–72.0 | editorial light | Top-right `Export` button dropdown opens (frame f_0260): Download project as .zip, Export as PDF, Export as PPTX, Send to Canva, Export as standalone HTML, Handoff to Claude Code. Six items, dwell ~5s — read time. |
| **Pull-back zoom-out** | ~71.0 | editorial light | Camera pulls way back to reveal a 24-up grid of every design seen so far + ~16 unseen ones (`_zoomout_1m11s.jpg`). Same frame contains: Hemlark, stats card, mountain landscape, DNA helix, Quiet Disappearance editorial, mobile meditation, coffee bag packaging, 3D scene, plus globe. |
| Send to Claude Code handoff | 72.0–75.5 | editorial light | Local-coding-agent prompt panel: `Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/spBNpoD4iyF?open_file=Interactive+globe.html`. Then a second pill: `Implement: Interactive globe.html`. |
| Endplate 1 — wordmark | 74.5–75.75 | editorial light | `🎨 Design by Anthropic Labs` |
| Endplate 2 — Claude lockup | 76.5–81.5 | editorial light | `✳️ Claude` wordmark only, dwell to end. Bookends with the opening Design lozenge. |

## Motion design (revised — finer than the original ref2 entry)

- **Verb-pill spine.** `Designing → Tweaking → Soldering → Dimming` is the connective tissue across all 4 act-changes. Each pill text mutates **character-by-character**, not via fade-swap (visible in `_text.txt` partial OCR on adjacent frames). Repo equivalent: small text-kit element with `gsap.to(el, { text: …, ease: 'none' })` from the GSAP plugin set, or a manual `setInterval`-style char swap inside `pausableRaf`. **This is the single highest-value pattern to lift** — it costs almost nothing to implement and instantly ties multi-beat sequences together.
- **Status checklist with strike-through completion** (17.75–20.75s). Each row enters with the unchecked state, then ✓ flips on, then `text-decoration: line-through` + `color: var(--muted)` apply. Already implementable via `cinematic-rough-thought-to-draft`-style staged reveal.
- **Yellow comment modal pattern** is repeated 3 times (14s globe, 36s dark mode, 65s line graph). Always: rounded white panel, yellow tinted by content, **brand-orange Send button** as the only saturated element. The pattern is `block + brand-accent button` — already buildable from `videos/_shared/blocks/`.
- **Slider-driven live editing** is the hero feature this video sells. The motion convention: slider thumb moves, **target element animates concurrently** with no delay (no "Apply" button). For the repo this maps to a `cinematic-knob-to-target` pattern — emit a single GSAP timeline keyed off the slider value, all targets tween off the same time.
- **Bar → line chart morph** (66s) uses a path-morphing tween — bars collapse to dots, dots connect with a stroke-drawn polyline. Implementable with `MorphSVGPlugin` (already in vendored GSAP) or cheaper: tween `polyline points` directly.
- **Window mosaic stagger** (46–50s) — 8 windows enter with `stagger:{ amount: 0.4, from: 'random' }`, each rotated by a `mulberry32`-seeded value in `±2°`. Hold ~1s. Camera holds locked.
- **Mosaic → hero hand-off** (50s) — single tile FLIPs out of the grid, scales `0.9 → 1.4`, translates to center, other tiles fade to `autoAlpha: 0.15`. Classic Flip / `flipBridge` motion — already in the repo's swap-style vocabulary.
- **Pull-back zoom-out** (71s) — the only "real" camera-move beat. Frame zooms out from a Hemlark-ish hero to reveal a much larger spatial canvas of designs. In repo terms this is `swapStyle: 'dolly'` with `cameraPose: 'pull-back'`, anchored on the hero center.
- **Bookended endplate.** Open on `Design` lozenge, close on `Claude` lozenge — the brand handoff. Identical font weight, identical y-position. Cheap to copy: just two title-card states with a `flipBridge` between them.

## Camera

- **Locked frames dominate.** ~75% of the runtime is camera-static; UI does the moving.
- **Three real camera moves** total:
  1. Globe close-up zoom (21–24s): `scale 0.8 → 1.0`, `transform-origin` near cursor on city label.
  2. Phone push-in inside the prototype beat (32–35s): `scale 1.0 → 1.06` over 3s on the device frame.
  3. Wide pull-back at 71s: `scale 1.4 → 0.4` over ~1.2s, `transform-origin: center`.
- **No parallax.** Layered z-order with no scroll-coupled motion.

## Transitions (sub-beat, anchored to scene-score spikes)

| Time | From → To | Style | Repo equivalent |
|---|---|---|---|
| 4.46s | Title → prompt input | hard cut, same surface | `breakStyle: 'cut'` |
| 5.33s | Prompt empty → first keystroke | live mutate, no transition | inline |
| 13.88s | Status pill → globe-formation dark | hard cut, surface flip light→dark | `breakStyle: 'cut'`, surface change |
| 17.83s | Globe → comment overlay | overlay enters above | `breakStyle: 'overlay'` |
| 21.08s | Plan checklist → globe + tweaks panel reveal | wipe + slide | combo: `breakStyle: 'cut'` then panel slide-in inside chapter |
| 30.0s | `Every place has a story` → prototype prompt | flash-to-white bridge | `breakStyle: 'flash'` (custom; ≈1 frame white) |
| 44.83s | Theme swatch swap → mosaic | hard cut, dramatic surface widening | `swapStyle: 'flipBridge'` with `cameraPose: 'pull-back'` |
| 49.92s | Mosaic → Hemlark hero | one tile FLIPs to hero; rest fade | `swapStyle: 'flipBridge'` (canonical) |
| 53.88s | Hemlark hero → typography inspector | side-panel slides in over hero | overlay-in-place |
| 61.0s / 62.08s | Hemlark deck → stats card | crossfade | `breakStyle: 'fade'` |
| 65.71s / 66.79s / 67.92s | Bars → line graph | morph tween, no cut | inline |
| 68.88s / 68.92s | Stats card → export menu reveal | dropdown overlay | overlay-in-place |
| 74.5s | Page → endplate `Design by Anthropic Labs` | crossfade ~0.4s | `breakStyle: 'fade'` |
| 75.75s | Endplate 1 → blank → endplate 2 (`Claude`) | quick fade-out, fade-in | two `flipBridge` states |

## Replicability in this repo

Sharper than the original ref2 entry because the per-second data exposes which patterns are reusable vs. one-offs. Ranked by reuse value:

1. **Verb-pill spine** (Designing/Tweaking/Soldering/Dimming) — adopt as a small text-kit primitive in `videos/_shared/blocks/text-kit/status-verb-pill.js`. Highest leverage; trivial to implement.
2. **Window mosaic** — already noted in motion-spec.md. Confirm: 8 tiles, `±2°` rotation, `stagger:0.08`, `mulberry32` seed required for `--seek` parity (per CLAUDE.md determinism rule). Add as `videos/_shared/blocks/window-mosaic.js`.
3. **Yellow comment modal + brand-orange Send** — three-times-repeated pattern. Worth a `cinematic-comment-overlay` archetype with slots for `prompt`, `body`, `accent`. Maps cleanly to `wpforms-postintro` build-order (existing kind, not new cinematic).
4. **Slider-driven live edit** — the central UX claim of this video. For WPForms, the equivalent demo is "field setting changes → form preview updates instantly." Already supported by the WPForms DOM-puppetry layer; what's missing is the **knob panel as a visual surface**. Worth a `cinematic-knob-to-target` archetype if a tutorial calls for it.
5. **Status-checklist with strikethrough** — adopt for any "Claude is doing N things" beat. Already close to `cinematic-rough-thought-to-draft`'s staged reveal.
6. **Pull-back zoom-out reveal** — high-impact but needs an underlying spatial canvas (grid of mini-snapshots). Heavy lift; only build if a video's storyboard explicitly calls for "look at everything we made." Maps to `swapStyle: 'dolly'` + `cameraPose: 'pull-back'`.
7. **Bookended endplate** — cheap, classy, already trivially buildable with two title-card states + `flipBridge`.

### Match risks (don't lift these blindly)

- **Globe wireframe rotation.** Genuine 3D-ish moment. WPForms has no globe semantic. Substitute with the form-flowing-to-inbox SVG (`runtime/teaser-form-to-inbox.js`).
- **Bar → line chart morph.** Visually striking but requires `MorphSVGPlugin` and matching geometries. Skip unless a tutorial actually compares two chart types.
- **24-up pull-back mosaic.** Requires a library of pre-made mini-designs. Anthropic has dozens; WPForms tutorials would need a corpus of form snapshots big enough to fill the frame. Don't attempt for a first pass.
- **Flash-to-white bridge between dark/light surfaces.** WPForms tutorials are uniformly light-mode — no surface flip to bridge. Skip.

## Provenance

- Anchored every timestamp in the macro table to OCR text and at least one inspected frame.
- Scene-cut times come from `_scenes.txt` showinfo output (ffmpeg `select=gt(scene\,X)`); not all listed cuts are author-intended cuts (some are content changes inside a static composition), but the cluster around 65.7–68.9s is real and matches the bars→line→export-menu sequence.
- Motion timings (e.g. stagger amounts, easings) are author-inferred from sub-beat frame inspection. Treat as hypotheses, not measurements.
