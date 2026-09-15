# R&D — x.ai "Voice Agent Builder" reference deconstruction (2026-09-02)

Full extraction of a reference ad's After Effects project + rendered video, distilled into
portable techniques for our single-HTML/GSAP system. **This doc is the handoff for the
build session.** Umair supplied both sources; the R&D below is evidence-based (every number
comes from the AEP's keyframes, not from eyeballing).

## Sources & evidence

| Artifact | Where |
|---|---|
| AEP project | `C:\Users\PC\Downloads\x.ai recreation july 6 2026.aep` (28 MB, AE 2026, RIFX) |
| Rendered video | `C:\Users\PC\Downloads\hroqYx5apSo8hxLY.mp4` (1280×720, 30fps, 45.06s) |
| Distilled keyframe data | `reference/xai-recreation/techniques.json` — every animated layer: keyframe times (s), values, interpolation, ease speed/influence, expressions, text + fonts. 90 comps. |
| Extraction pipeline | `reference/xai-recreation/tools/` — `pyaep-dump.py` (needs `pip install` of [forticheprod/aep_parser](https://github.com/forticheprod/aep_parser), the `py_aep` package) → full JSON; `distill.js` → animated-only; `digest.js "<comp name>"` → human-readable keyframe tables. Reusable on any future `.aep`. |

Read a comp's exact keyframes any time with:
`node reference/xai-recreation/tools/digest.js "Introducing"` (after pointing its require() at a fresh dump, or use techniques.json directly).

## Global system (why it feels expensive)

- **1920×1080 @ 30fps, 46s master.** The master comp (`Master Comp`, 22 layers) has **zero
  animated transforms** — it is a pure cut list. Layers are full-screen card comps with
  staggered in/out points, one beat ≈ 2s. All motion lives *inside* the cards. Rhythm is
  editing, not camera. (Our equivalent: master timeline with hard beat boundaries; no
  global camera drift between beats.)
- **Three scene surfaces, rotated for contrast:**
  1. *White studio* — `#FDFDFD`/#FFF, black SF Pro type, hairline-bordered cards.
  2. *Dark space* — `#0E0E0E`, starfield, iridescent voice orbs, concentric rings.
  3. *Alpine hero* — photographic mountain-at-dusk backdrop with frosted-glass chips
     (translucent white pills, background blur, glowing orb avatars).
- **Type:** SF Pro Regular everywhere. Display beats at 260px/1920w (≈13.5% of frame
  height). UI-card beats at ~35px. One weight; hierarchy comes from size + color only.
- **Color:** monochrome black-on-white; **purple/blue reserved as the "AI accent"**
  (gradient sweeps, caret, active chip, `x.ai/voice` lockup). Note for us: WPForms purple
  is AI-features-only per brand rules — this reference's accent discipline maps 1:1.
- **Real UI is footage composited under editorial chrome** — the in-card screen captures
  are `hf_*.mp4` HyperFrames renders with a CC Light Sweep pass (`time*90` rotating sheen).

## Beat map (video ↔ AEP comps)

| t (s) | On screen | AEP comp | Techniques |
|---|---|---|---|
| 0–3.1 | "Introducing" types on with per-letter purple→blue gradient trailing the reveal; word swaps to "Voice Agent Builder"; waveform icon replaces "Voice"; cards rise off | `Introducing`, `Colors sweep`, `colorsweep` | T3 typewriter, T8 gradient/wipe sweep, T1 micro-stagger, E2 held-snap rise |
| 4.3–6.5 | Alpine scene: frosted-glass agent chips (Call Router / Client Services / Sales Qualifier…) scroll vertically, swelling as they pass center | `roll`, ` roll final`, numbered comps `1`–`18`, `Ball CC Sphere` | T5 dock-magnify roll, T7 chip content swap, glass chip styling |
| 7–7.9 | "Create Agent +" black pill on white | `Pre-comp*` | E1 whip-settle entrance |
| 8–9.5 | Icon row spreads (chat, wrench, sliders, book, shield); "Configuration" label | `wrench`/`open-book`/`shield-check` comps | T1 stagger, icon draw-on (Trim End keys) |
| 10–12.8 | "Create a Voice Agent" form; typewriter fills Agent name + Goal prompt with purple caret; camera pushed into the textarea | form Frame comps | T3 typewriter (expression version), form-fill grammar |
| 12.8–19.5 | Dark space: voice orbs gallery — chat bubbles demo (Ara), then Eve/Leo/etc. cards cycle with scale pulse | `Frame 2365`, `Frame 2358` etc. | T6 bounce-scale pulse, T9 mask-feather focus pull, T1 stagger |
| 20–21.3 | "56+ Voices with voice cloning" + live waveform strip | `waves` | T2 waveform bars |
| 21.5–24 | Knowledge base card: PDFs drag-drop, upload % bars fill | `Frame 2373` family | progress-bar fills, T7 |
| 24.5–28.2 | Chat transcript: refund Q→A, `issue_refund` tool-call code block, confirmation | `Frame 2344/2348` family | chat-bubble cadence, code-block reveal |
| 29–32.7 | Alpine: giant phone field types a number, then **shakes** as numbers hot-swap (call routing) | `+1 (202) 555 -6735 Comp 1` | T4 shake + hot-swap rig, T3 backwards delete |
| 33–34.5 | "Existing phone number" form fill (name, number, SIP URI) | form Frames | form-fill grammar |
| 35–35.9 | Capability chip cloud (Expressive speech, HIPAA, 25+ languages highlighted…) | `Frame 2364` | chip grid pop, T1 |
| 36–38.5 | Language word-columns roll vertically at different speeds, fading at edges | `Pre-comp 4` (58 animated layers) | T10 multi-column word roll |
| 39–40 | "$0.0" → "$0.05 /min" count-up | `$0.05 min` comp | numeric count-up |
| 40–43.5 | `x.ai/voice` endcard (purple → black) | `post x` | endcard hold |

## The ease language (highest-leverage finding)

Nearly **no keyframe uses default easing**. Everything is speed-0 endpoints with wildly
asymmetric influence. AE (speed 0) → CSS bezier conversion: `P1=(outInf/100, 0)`,
`P2=(1−inInf/100, 1)`.

| Name | AE values (out → in) | cubic-bezier | GSAP | Used for |
|---|---|---|---|---|
| **E1 whip-settle** | inf 0.01 → inf 100 | `(0.0001,0,0,1)` | `expo.out` (or `CustomEase.create("whipSettle","M0,0 C0,0 0,1 1,1")`) | text slides, list rolls, chip swaps — instant launch, mile-long decel |
| **E2 held snap** | inf 90 → inf 0.01–0.1 | `(0.9,0,1,1)` | `expo.in`-like: `CustomEase.create("heldSnap","M0,0 C0.9,0 1,1 1,1")` | card rises in `Introducing` — holds, whips, dead stop |
| **E3 soft standard** | inf 33.33 both | `(0.33,0,0.67,1)` | `power2.inOut` | exits, fades, neutral moves |
| **E4 half-whip** | inf 48.6 → 0.01 | `(0.486,0,1,1)` | between power3.in and expo.in | secondary text nudges |

Motion durations: primary moves 0.33–0.67s (10–20 frames); micro-staggers 30–40ms
(1 frame apart at 30fps); beat length ≈ 2s.

## Technique catalog (exact parameters in techniques.json)

- **T1 Micro-stagger entrances.** Sibling elements enter 30–40ms apart, never together.
  `Introducing` cards: in-points 2.767 / 2.800 / 2.833s. Wave bars: 40ms ladder.
  → position-param stagger `"<0.04"` on the master timeline.
- **T2 Waveform bars.** 15 rectangles; height = `[w, wiggle(3, amp)[1]]` — width static,
  height wiggles at 3Hz with **per-bar amplitude 15–47px** (each bar unique), 40ms
  in-point stagger. → port as `mountWaveformBars({bars, freq:3, ampRange:[15,47], seed})`
  using `mulberry32` + `pausableRaf` (determinism: NO raw wiggle/`Math.random`).
- **T3 Typewriter, three variants.**
  1. *Expression version* (title beats): `t.slice(0, l*linear(a,0,100,0,1)) + cursor`,
     cursor char cycles through `["|","_","—","<",">","«","»","^"]` via slider; blink =
     `sin(π·(time−lastKeyTime)·blinkSpeed)` — blink pauses while typing, resumes on idle.
  2. *Text-animator version*: Percent Start 0→100 keyed with E1/E2 ease (letters reveal
     as a ramp, not fixed-interval).
  3. *Backwards delete*: Percent Start 100→0 at **linear −150%/s** (deletion reads
     mechanical, reveal reads eased — deliberate asymmetry).
  Our `caretType` covers the base; gaps = cursor-char cycle, sin-blink-with-idle-detect,
  eased (non-linear) reveal ramp, backwards delete.
- **T4 Shake + hot-swap rig** (phone routing beat). A null does decaying horizontal
  bounces: 960→1127→960→1033→960→1033… with bounce **speeds ~13,000–14,000 px/s** and
  inf-100 arrivals, intervals shrinking 0.4→0.33→0.2s; the text layer hold-swaps its
  content every ~100–200ms during the shake (13 hold keys). Reads as "call bounced
  between numbers." → `shakeSwapRig(el, {kicks:[167,73,73,73], decay, swapFn})`.
- **T5 Dock-magnify roll.** Parent-null chain scrolls a list 1600px in 1.8s (E1); each
  item runs a proximity reaction against a Controller null:
  `zOffset = ease(dist(item, ctrl), 0, Range, −Length, 0)·2` — items swell/lift as they
  pass frame center, driven by two sliders (Length, Range). → per-frame `pausableRaf`
  mapping `distanceToCenter → scale/translateZ` while a timeline scrolls the track.
- **T6 Bounce-scale pulse** (emphasis, voice-card select): scale 100→**80**→**110**→100
  over 0.73s (anticipate-overshoot-settle, speeds 6.28/1.69), repeated per selection;
  exit = 100→24 shrink with E3. → `back.out`-composed pulse; keep exact 80/110 ratios.
- **T7 Chip content swap** (the 84 gallery chips, 1000×300 comps): CC Light Sweep sheen
  rotating at `time*90`°/s; on swap (t=2→2.667s): old text + screenshot slide left
  437px and fade (E3), container **rect width morphs 814→666px** with E2, fill opacity
  flashes 15→100. The chip is one persistent element whose contents change — identity
  continuity, same principle as our morph-chain rule.
- **T8 Gradient/wipe sweeps.** Two `Colors sweep` strips cross the title at **4,050 px/s**
  then **1,150 px/s** (linear, no ease — wipes don't decelerate). The purple→blue letter
  gradient trails the typewriter reveal edge, then letters mature to black. → masked
  gradient layer translated linearly; per-letter `background-clip:text` gradient that
  fades to solid.
- **T9 Mask-feather focus pull.** Blur-to-sharp reveal: mask feather 196→0 in 0.27s.
  → CSS `filter: blur(26px)→0` on the element (NEVER on an iframe ancestor — INV:
  iframe-filter-blur memory).
- **T10 Multi-column word roll** (languages beat): `Pre-comp 4`, 58 layers — word columns
  translate vertically at different speeds with edge fades; near-columns faster
  (parallax), white gradient masks top/bottom.
- **T11 Numeric count-up**: "$0.0" → "$0.05" with /min suffix landing after.
- **T12 Frosted-glass chips** (alpine scenes): translucent white pill, backdrop blur,
  1px inner light border, iridescent orb avatar (the AEP fakes orbs with CC Sphere +
  turbulent noise; we'd bake orb PNGs/videos or CSS conic-gradient spheres).

## Port map (for the build session)

| Technique | We have | Gap → build |
|---|---|---|
| E1–E4 eases | generic GSAP eases | **`xaiEases.js` (or extend text-kit): register `whipSettle`, `heldSnap` CustomEases + doc-comment the AE provenance. Highest leverage, near-zero cost.** |
| T1 stagger | position params | discipline only — bake 0.03–0.04s stagger into new effects' defaults |
| T2 waveform | nothing | `mountWaveformBars` effect (promotion candidate, `videos/_shared/effects/` style: `{el, tweenInto, dispose}`) |
| T3 typewriter | `caretType` | add cursor-char option, sin-blink w/ idle detect, eased reveal ramp, backwards delete |
| T4 shake-swap | nothing | `shakeSwapRig` — video-local first (INV: prove local, promote on 2nd use) |
| T5 dock roll | nothing | `mountDockRoll` — pausableRaf proximity map |
| T6 pulse | ad-hoc scale tweens | canonical `pulseEmphasis(el)` 100/80/110/100 helper |
| T7 chip swap | morph-chain vocabulary | pattern doc + `chipSwap` beat recipe (slide-fade out + width morph + flash) |
| T8 sweeps | markerSweep (different) | linear gradient-strip wipe; per-letter gradient trail on caretType |
| T9 focus pull | nothing | one-liner blur tween — recipe, not a primitive |
| T10 word roll | nothing | `mountWordColumns` effect |
| T12 glass chips | atmospheric kit | CSS recipe block (backdrop-filter pill + orb asset) for editorial surfaces |

**Determinism constraints for every port:** no `wiggle`/`Math.random` → `mulberry32(seed)`;
no `repeat:-1` → `boundedRepeats`; RAF loops via `pausableRaf` registered on the master
timeline. All library work is promotion-gated: video-local first.

**Do NOT copy:** SF Pro (Apple license — use our stack's equivalent); x.ai's
purple-as-hero (WPForms: orange `#E27730` primary, purple AI-only); the 46s cut-only
grammar wholesale (our tutorials need camera moves; this grammar fits **ad-style/mixed
path** and Shorts bookends).

## Suggested build order

1. `whipSettle`/`heldSnap` CustomEases + swap into one existing beat to taste-test.
2. T3 typewriter upgrades on `caretType` (cursor cycle, blink, delete).
3. T2 `mountWaveformBars` + T6 `pulseEmphasis` (small, self-contained).
4. T4 shake-swap + T5 dock roll (rig-level, video-local in the first film that needs them).
5. T7/T8/T12 as recipes in the marketing skill's vocabulary, exercised in the next
   ad-style build; `wpforms-motion-audit` gates as usual.
