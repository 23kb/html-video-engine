# Reference video motion spec

Source: `C:\Users\PC\Downloads\New folder\*.mp4`
Frames + contact sheets: `tools/ref-frames/ref{1..4}-*/`
Vocabulary: maps to this repo's authoring API (`postIntro.kind`, `breakStyle`, `swapStyle`, `surface`, `flipBridge`, `cinematic-*`, blocks, atmospheric kit).

Rendering pattern shared across all 4 references — useful to internalize:

- **Editorial-first surface.** None of these are real-product captures. They are clean DOM/SVG mockups composited on a flat canvas. In this repo: `surface: 'editorial'` or `'mixed'` from `wpforms-marketing`.
- **Single hero element per beat.** Never two competing focal points. Cards/UI panels float into negative space, dwell, then exit.
- **Soft-cuts via cross-snapshot Flip, not jump-cuts.** When the same element type recurs (a card, a chat bubble, a doc page) it flies between positions with morph (`flipBridge`/Flip-style). Only use a hard cut when the entire scene class changes (icon row → talking head).
- **Asymmetric layouts.** UI panels are nudged off-center, slightly rotated (≤2°), or partially clipped at viewport edges to imply a larger spatial canvas.
- **Brand color is a punctuation, not a fill.** Replit-red, Claude-orange, Browserbase-orange — used as accents on cursors, highlight sweeps, button fills. Backgrounds stay neutral (off-white #F4F1EC / dark #0A0A0B).
- **Easings: tight in, lazy out.** Entrances are `power3.out` (≈0.5s); exits and dwells are `power2.inOut` (≈0.7–1.0s). No bounce/elastic anywhere.

---

## Ref 1 — Browserbase "What if your agents were as capable as you?" (26.7s, 30fps)

`tools/ref-frames/ref1-WYzFz/`

### Macro structure
| Beat | t (s) | Surface | Notes |
|---|---|---|---|
| Hero title | 0.0–4.0 | editorial | Pixel-art landscape (bitmap/dithered countryside + clouds) with type reveal |
| Agent prompt UI | 4.0–7.0 | editorial | Floating chat-style input cards stacked; user-prompt typing reveal |
| Talking-head + lower-third | 7.0–11.0 | mixed | Founder (Paul Klein, CEO) center-frame; "Browserbase Platform" lower-third slides in |
| Result UI montage | 11.0–17.0 | editorial | Pink/magenta receipt panels, "$1247.50", "Download All Receipts" — agent output cards drift across canvas |
| Spatial canvas | 17.0–21.0 | editorial | Whiteboard/post-it grid with cursor + "Your agent" pill — workflow visualization |
| Talking head + side-panels | 21.0–25.0 | mixed | Founder reappears with "Search API"/"Fetch API" panels floating beside him |
| Endplate | 25.0–26.7 | editorial | Browserbase logo + partner row |

### Motion design
- **Title type-reveal** — "What if your agents / were as capable as / you?" appears in three cuts. Each line wipes in on top of the static pixel-art landscape; the **landscape itself stays still** (no parallax). Word "agents" / "you" picked out in **brand-orange highlight pill** (looks like animated marker sweep, ≈0.25s).
- **Pixel-art aesthetic carries through** — at one mid-point the founder face cuts to a pixelated/dithered version (frame ~16s) before returning to full resolution. That's a deliberate stylistic match-cut, not a glitch. Replicable as a CSS `image-rendering: pixelated` + low-res snapshot crossfade.
- **Card "fly-in" pattern** — receipt cards / chat bubbles enter from edges with `y:+30, autoAlpha:0 → 0, 1` over ~0.5s, settle, then drift slowly upward (`y:-10` over 2s) before exit. Implies floatiness without distracting.
- **Founder shots use a slow push-in** — barely-perceptible scale (`1.0 → 1.04` over 4s) on the talking-head static. No real video — likely a still photo with subtle camera-pose dolly.

### Camera
- **No parallax, no real 3D.** Everything is 2D layered DOM with z-order changes.
- **Camera pose changes are static + narrow.** Equivalent to `{ scale: 1, x: 0, y: 0 }` baseline with localized `pop-out` zooms on cards (1.0 → 1.06 hold).
- **Layout zoom-out for spatial canvas (~17s)** — wide-shot of post-it grid then dolly-in to "Your agent" pill. This is `dolly` swap style: pre-pose far, target-pose near.

### Transitions
| From → To | Style | Repo equivalent |
|---|---|---|
| Title → prompt UI | Hard cut, both editorial | `breakStyle: 'cut'` (same surface) |
| Prompt UI → founder | Match-cut on frame composition (single centered element) | `swapStyle: 'flipBridge'` with element-class swap |
| Founder ↔ result cards | Push-in then card overlay enters | `breakStyle: 'overlay'`-ish (cards composite over founder bg) |
| Result cards → spatial canvas | Pull-back zoom (cards become tiny in larger grid) | `swapStyle: 'dolly'` with `cameraPose: 'pull-back'` |
| Spatial canvas → founder | Push-in + cards reflow beside head | `flipBridge` with shared cursor as the hand-off element |
| Final → endplate | Crossfade | `breakStyle: 'fade'` (≈0.4s) |

### Replicability in this repo
- Build as `surface: 'editorial'` end-to-end except founder beats which want `surface: 'mixed'` (real photo bg + DOM cards on top).
- Pixel-art landscape: SVG with hand-drawn dither pattern OR low-res image + `image-rendering: pixelated`. Add to `videos/_shared/blocks/` as `pixel-landscape`.
- Card-fly-in is already in the kit — see `runtime/pop-out.js` + `cinematic-kit/*`. Use directly.
- Marker-sweep on key words → `videos/_shared/blocks/text-kit` + sketchout/marker effect from the GSAP rules library.
- **Match risk:** the deliberate pixelated face-cut. Worth recreating only if the brand voice supports playful retro tone. WPForms tutorials probably do not.

---

## Ref 2 — Anthropic Claude (design tools) (81.6s, 24fps)

`tools/ref-frames/ref2-ZlyVs/`

### Macro structure
| Beat | t (s) | Surface | Notes |
|---|---|---|---|
| Hero — Design lozenge | 0–3 | editorial dark | Spinning globe-of-nodes vignette under chrome bar with cursor |
| API panels / code | 3–8 | editorial dark | Code editor + cursor moving over panels |
| Globe close-up | 8–13 | editorial dark | Wireframe globe rotating; cursor hovers labels |
| Design app gallery | 13–22 | editorial light | Mosaic of UI windows scattered, each lightly tilted |
| Comments + edits | 22–35 | mixed | Mountain/landscape design ("Hemlark Retreat '26") with floating comment + suggestion overlays |
| Hero retreat composition | 35–55 | editorial | Single design ("Hemlark") becomes hero; comment cards drift in, edits applied live, hero updates |
| Final — Claude card | 75–81 | editorial light | Claude wordmark on light bg; multiple lockup variants |

### Motion design
- **Dark → light global flip mid-video.** Background goes from `#0A0A0B` (chrome / dev tools feel) to `#F4F1EC` (warm editorial) at ~13s. Treat as a **scene-class change**, not a transition. Use `breakStyle: 'cut'` between snapshots, accept the contrast.
- **Globe of nodes** is the only "real" 3D motion. Slow Y-axis spin, ≤8° tilt, lines draw progressively. In this repo this is a `cinematic-*` candidate — could live as `cinematic-globe-nodes.js` if reused, otherwise inline SVG with stroke-dasharray draw + subtle CSS rotate.
- **Floating window mosaic (13–22s)** — six to eight UI windows arranged on a soft grid, each rotated `-2° to +2°`, scaled `0.85–0.95`. They appear with **staggered fade-up** (`stagger: 0.08`, `y: +20 → 0`, `autoAlpha: 0 → 1`). Then a slow upward drift (`y: -8` over 4s) before the next beat.
- **Comment cards** snap to a target position with a single overshoot (`scale: 0.92 → 1.02 → 1.0` via `back.out(1.6)` — but constrained, no bounce). They are anchored to a content target (e.g. an image inside the hero), not floating arbitrarily.
- **Live edit visualization** — copy in the hero is overwritten character by character (typewriter), with the **changed phrase highlighted in Claude-orange** for ~0.6s, then the highlight bg fades to transparent leaving the new text plain.

### Camera
- **Globe section uses true zoom** — `scale: 0.6 → 1.0` over 5s, with `transform-origin` near the cursor.
- **Window mosaic uses no camera move.** Layered z-order changes only; the mosaic itself doesn't translate.
- **Hero retreat composition uses a slow push-in** — `scale: 1.0 → 1.08` over 8–10s. This is a `glide` swap-style camera anchored to the hero center.

### Transitions
| From → To | Style | Repo equivalent |
|---|---|---|
| Globe → window mosaic | Hard cut, dark→light | `breakStyle: 'cut'` (scene class change) |
| Window mosaic → hero retreat | Mosaic items collapse/fly off, hero settles in center | `swapStyle: 'flipBridge'` with `cameraPose: 'push-in'` |
| Hero edits | In-place; comments and copy mutate live | Same chapter, no transition |
| Hero → final card | Crossfade over ~0.5s | `breakStyle: 'fade'` |

### Replicability
- Window-mosaic pattern → new block `videos/_shared/blocks/window-mosaic.js` (8-up grid, randomized tilt seeded by `mulberry32`).
- Hero with floating-comment-overlays is a strong fit for the `editorial` block stack: hero block + `cinematic-comment-overlay` on top.
- Live-edit typewriter + temporary highlight is **directly the marker-sweep / sketchout effect** in `wpforms-gsap-rules`. Already implementable.
- **Match risk:** the spinning globe is a genuine 3D-ish moment. If the WPForms version doesn't have a globe equivalent, swap it for a wireframe **form-flowing-to-inbox** SVG (already a teaser archetype in the kit: `runtime/teaser-form-to-inbox.js`).

---

## Ref 3 — Claude in Microsoft 365 (87.4s, 24fps)

`tools/ref-frames/ref3-qm50/`

### Macro structure
| Beat | t (s) | Surface | Notes |
|---|---|---|---|
| App icons row | 0–5 | editorial light | Outlook + Excel + Word + PowerPoint icons line up centered |
| Tagline 1 | 5–8 | editorial | "Claude now works across Microsoft 365" |
| Outlook beat | 8–18 | editorial | Email reading; "Thinking…" / "Responding" status badges |
| Word beat | 18–35 | editorial | Word doc opens, **red rectangles highlight** rebuild targets, copy updates inline; status: "Filling field…" / "Checking formatting…" |
| Excel beat | 35–55 | editorial | Spreadsheet redlines with red callouts; "Synergy assumptions look aggressive" comment; live cell updates |
| PowerPoint beat | 55–72 | editorial | Slide deck; "Add a slide to the SteerCo deck" prompt; new slide assembled with red-highlighted edits |
| Cross-app summary | 72–82 | editorial | "Now let's schedule a time to walk the team through the changes" — implies handoff back to Outlook |
| Final | 82–87 | editorial | Claude wordmark + "One conversation across your Microsoft 365 apps" |

### Motion design
- **This is the cleanest of the four.** The motion language is intentionally restrained because the content (corporate productivity) needs to read as serious.
- **App icons row** — icons enter with `stagger: 0.06`, `y: +12 → 0, autoAlpha: 0 → 1, scale: 0.92 → 1.0`. Each icon then has a **gentle hover animation** (`y: ±2` ease sine, repeat infinite, stagger so they don't sync) — adds life without distraction.
- **App-to-app transitions** use a **shared status-pill element** — "Thinking…" / "Filling field…" / "Checking formatting…" persists at top-left across cuts. The pill text **morphs character-by-character** (not a fade swap). This is the spine that links the 4 app sections — a Flip-style hand-off element.
- **Red rectangle highlights** are the dominant motion device. They appear with `strokeDashoffset` line-draw (left → top → right → bottom, ~0.3s total), pulse twice (`opacity 1 → 0.6 → 1`), then fade with the changed copy already swapped in.
- **Doc/sheet/slide content swap** — old content fades to 30% opacity behind a red rectangle, new content fades up at 100%, rectangle line-draws away. ~0.6s total.
- **No camera moves at all.** Every UI shot is dead-center, locked frame. The "motion" is entirely inside the UI.

### Camera
- **Static frames throughout.** No dolly, no push-in, no pan.
- The only spatial-feeling moment is the shadow/elevation on app icons — they sit on a soft drop shadow with a tiny y-offset, which reads as a pseudo-3D base.

### Transitions
| From → To | Style | Repo equivalent |
|---|---|---|
| Icons row → tagline | Hard cut | `breakStyle: 'cut'` |
| Tagline → Outlook | Hard cut, status-pill carries forward | `swapStyle: 'flipBridge'` with the pill as the bridged element |
| Outlook → Word → Excel → PowerPoint | All `flipBridge` on status pill | Single chapter with surface swaps |
| Final fade | `breakStyle: 'fade'` |

### Replicability
- This is **the easiest one to replicate** in this repo. Almost everything is line-draw + content swap + a persistent status pill.
- Status pill: `videos/_shared/blocks/status-pill.js` with `morphText()` — small new block.
- Red rectangle highlight: already exists conceptually as `runtime/line-draw.js` — point it at any selector and it draws + pulses.
- App icon row + hover: standard `videos/_shared/blocks/icon-row.js` candidate.
- Per-app screen: snapshot folders. Real WPForms version would use real WPForms screenshots — but the **transition pattern** transfers verbatim.
- **High-confidence template** for any "Claude/AI works across [thing]" video.

---

## Ref 4 — Replit Slides (80.7s, 30fps)

`tools/ref-frames/ref4-ssstwitter-new/`

### Macro structure
| Beat | t (s) | Surface | Notes |
|---|---|---|---|
| Metric/news flash montage | 0–5 | editorial dark | Rapid cuts: RAMP street index, "9.6M", "PUSH OR PERISH" — quick brand-asset hits |
| Tagline build | 5–10 | editorial light | "The biggest leap yet" / "in AI-powered slides" / "Introducing Replit Slides" — each line on its own beat |
| Replit logo lockup | 10–13 | editorial | Logo + wordmark resolve |
| Tagline 2 + product reveal | 13–18 | editorial | "Turn your ideas into pixel perfect slides" — type reveal with prompt input field morphing into a slide |
| Template gallery | 18–28 | editorial | Pre-designed slide templates drift in, "choose from pre-designed templates" with brand-color sweep on key phrase |
| Brand template extraction | 28–45 | editorial | "Or use your own brand template / and match your style" — brand assets (Pluribus unum, Axis brands) flow into a card |
| Pitch decks gallery | 45–55 | editorial | "Pitch decks" / "Studio Reports" / "Portfolios" — slide thumbnails fan in |
| "Whatever you need" | 55–62 | editorial | Type animation, then "Finetune your slides" with red brackets popping in |
| Hand cursor edit | 62–72 | editorial | "Discover Your Next Adventure" deck; **named hand cursor "Paul"** clicks in, suggesting collaborative editing |
| Export + final | 72–80 | editorial | "Export your slides anywhere" + "Making stunning slides was never this easy" — Replit logo close |

### Motion design
- **Metric flash open** — 4–5 unrelated brand snapshots at ~0.6s each, with **hard cuts and slight scale-pop** (`scale: 0.96 → 1.0` over the first 100ms of each cut). The "wow" is the variety, not the motion. Easy to replicate as a snapshot loop.
- **Type reveal with prompt-input morph** — text "Turn your ideas into pixel perfect slides" appears, then **the input field itself morphs into a thumbnail slide** (Flip-style: input box → card). Strong example of `flipBridge` carrying meaning.
- **Marker / brand-color sweep** on key phrases (`pre-designed templates`, `Replit Slides`, `Finetune`). The sweep is a **filled rectangle with brand-red** that wipes left-to-right behind the text in ~0.3s, then the text color flips to white inside the sweep. This is exactly the marker-sweep pattern in `wpforms-gsap-rules` — direct replication.
- **Brand asset flow** — logos / color swatches / fonts physically fly from a "brand source" mockup into a "deck" mockup. Each asset's path is a curved Bezier (`MotionPathPlugin` style), with stagger.
- **Named cursors with pill labels** — "Paul" pill follows a custom hand cursor across edits. This is the same `runtime/cursor.js` pattern this repo already has, with `data-cursor-label="Paul"`.
- **Slide gallery fan-in** — thumbnails appear from a center point and fan out to a 3-up arc with rotation. Eased with `power3.out`, ~0.7s total. Looks like `Flip` from a stacked source state.

### Camera
- **No real camera moves.** All apparent motion is layout reflow + element fly-ins.
- Slide thumbnails get a `scale: 1.0 → 1.04` hover pulse on the hero one in each gallery beat — pseudo-camera-attention.
- **Mid-canvas tilt drift** — many shots have the entire canvas rotated `≤1.5°` and slowly drifting back to 0° over 3–4s. Adds aliveness. Implementable as a `transform: rotate()` tween on the scene root.

### Transitions
| From → To | Style | Repo equivalent |
|---|---|---|
| Metric flash → tagline | Hard cuts | `breakStyle: 'cut'` per snapshot |
| Tagline → product | Element morph (input → card) | `swapStyle: 'flipBridge'` |
| Product → template gallery | Card multiplies into gallery via Flip | `flipBridge` with stagger |
| Gallery → brand extraction | Cards collapse, brand-source slides up | `swapStyle: 'morph'` |
| Brand extraction → pitch decks | Brand cards become deck thumbs (asset-flow) | `flipBridge` with motion-path |
| Decks → hand-cursor edit | Pull-in to single deck | `swapStyle: 'dolly'` |
| Final | Crossfade + scale | `breakStyle: 'fade'` |

### Replicability
- This is the most **kit-shaped** of the four — almost every beat maps to an existing or near-existing kit piece.
- Marker-sweep: already in `wpforms-gsap-rules` effects library.
- Asset flow with motion paths: needs new block `videos/_shared/blocks/asset-flow.js` — particle-style staggered fly-in on bezier paths. Single-purpose, ~80 lines.
- Slide thumbnail fan-in: `runtime/cinematic-kit/` candidate. Could live as `cinematic-deck-fan-in.js` if reused.
- Named-cursor pill: extend `runtime/cursor.js` with `data-cursor-label` if not already supported.
- **High-confidence template** for any "intro a new product/feature" announcement video.

---

## Picking a reference per WPForms video archetype

| WPForms video type | Best reference | Why |
|---|---|---|
| Tutorial — "Claude/AI now works across X" | **Ref 3** | Status-pill spine + line-draw + content swap is repeatable, calm, doesn't fight tutorial pacing |
| Marketing — feature/product announcement | **Ref 4** | Type-reveals + marker sweep + asset flow + hand-cursor, all kit-shaped |
| Marketing — capability/foundational ("what if X") | **Ref 1** | Founder beats + result-card cinematics, but skip the pixel-art aesthetic for WPForms tone |
| Marketing — design/output gallery | **Ref 2** | Window-mosaic + hero composition + comment overlays — best when the deliverable is a designed artifact |

## What's missing in this repo (gaps these references expose)

1. **`window-mosaic` block** — multi-window scatter with seeded tilt. Used by Ref 2 and partially Ref 4.
2. **`asset-flow` block** — assets following bezier paths from source to target. Used by Ref 4.
3. **`status-pill` block with `morphText()`** — persistent label that morphs across snapshots. Used by Ref 3.
4. **Pixel-art landscape block** (low-priority) — Ref 1 only.
5. **Marker-sweep with text-color flip-inside** — exists as concept in `wpforms-gsap-rules` but verify the "flip text color while highlight is over it" variant is implemented.

## Workflow note

To add a new reference video later:
```powershell
mkdir tools/ref-frames/<slug>
ffmpeg -y -i <video.mp4> -vf "fps=1,scale=280:-1,tile=9x10" -frames:v 1 -update 1 tools/ref-frames/<slug>/contact.jpg
ffmpeg -y -i <video.mp4> -vf "select='gt(scene,0.3)',scale=640:-1" -vsync vfr -q:v 3 tools/ref-frames/<slug>/cut_%03d.jpg
```
Then ask Claude to read `contact.jpg` + a sample of `cut_*.jpg` and append a new section to this doc.
