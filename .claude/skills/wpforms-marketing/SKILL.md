---
name: wpforms-marketing
description: "Use BEFORE starting any pure-editorial, ad-style, marketing, announcement, release, launch, or mixed WPForms video — owns the path-decision gate, brand canonical, clone-and-customize first-write rule (INV-16), atmospheric kit, blocks library, text-kit, and surface-mode selection. 3 sessions authored from blank files despite clone-first rule; all needed manual rescue. Triggers: ad-style video, marketing video, release video, announcement video, launch video, editorial video, pure editorial, mixed surface, atmospheric, hero lockup. For tutorial videos showing real product UI, use wpforms-video instead."
---

# WPForms Marketing / Ad-Style Videos

The repo has three authoring paths (see `CLAUDE.md` for the full table):

1. **Tutorial** — real WPForms product UI in an iframe (covered by `wpforms-video`).
2. **Pure editorial / ad-style** — single self-contained HTML, no engine, clone from `reference/html-templates/`. Covered here.
3. **Mixed** — editorial chrome composited over real product UI via `surface: 'mixed'`. Covered here + `wpforms-transitions`.

This skill covers paths 2 and 3.

## ⛔ HARD RULE — motion-graphics density is the mandate; real UI when it exists

Two things an ad-style video MUST be, revised 2026-07-13 after the FA clean-room ad scored **4/10 — "too basic, worse than HyperFrames"**:

### 1. It must be a MOTION-GRAPHICS piece, not a kinetic-type card.

The failure that earns a low score is a basic piece: one text effect, a couple fades, mock tiles. An ad is judged on motion design. Before calling any ad-style build done, it must visibly use **most of** this vocabulary — not one token from it:

- **Effects library (`videos/_shared/effects/`, promoted from the ~100-port `reference/gsap-effects/CATALOG.md`)** — text reveals (`mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`), card layouts (`mountCardsSpreadFan`, `mountCardsFlyInStack`), constellations (`mountConstellationPhyllotaxisBloom`). If the storyboard names a motion archetype not yet promoted, **promote the matching port from `reference/gsap-effects/`** rather than hand-rolling or skipping it. Using one effect when the piece has five beats is the 4/10 failure.
- **Text animations** — `text-kit.js` (24 pixel-point presets) or the effects text reveals. Never a plain opacity fade on a headline.
- **Real transitions between scenes** — morphs (Flip / same-node shape tween), camera flights (`cinematicFlight` / `figjamFlight` / `flyToElement`), wipes, mask reveals. Hard cuts and cross-fades alone are a fail. **Default camera pacing for ads = the L1 cinematic decomposition at premium timing (~1.0–1.3s per move, land-and-HOLD)** — Umair reviewed a fast "whip" pass as "too fast, not smooth" (v3→v4, 2026-07-13); reach for whip speeds only on an explicit ask.
- **Atmospheric kit** (`atmospheric.js`) — grain, sweep, parallax, scale-push, dark backdrop, per-beat atmosphere swaps.
- **SFX** — the cue rig must be wired (punchy-clean, ad-energy per `[[feedback_sfx_ad_energy]]`), landing on the motion beats.

If you finish an ad and it used one effect and some fades, it is not done — go back to the vocabulary.

### 2. When the feature has real captured UI, SHOW THE REAL UI — never a mockup.

Superseded rule: the old "pure motion, no real product UI in pass 1" ban produced kit-built mock stat tiles standing in for the real analytics dashboard. **Wrong.** Umair (2026-07-13): *"when there is a real UI to show in an ad-style video, there should be real product UI, real iframes or whatever — real UI, not a mockup."*

- If a real snapshot of the feature exists (or can be captured), mount it (`IframeManager` + the snapshot) and move the camera across the REAL product (`flyToElement` / `cinematicFlight`). The editorial motion graphics compose **around and into** the real UI — e.g. an editorial number flies in and hands off (Flip / position morph) into the real stat card on the real dashboard.
- Kit-built mock cards (`mountCardsSpreadFan` defaults, hand-drawn tiles) are only for concepts with **no** real UI (a pre-release feature, an abstract idea). Never as a stand-in when the real capture is sitting in `snapshots/`.
- This makes most feature ads **`surface: 'mixed'`** (real iframe + editorial layer above). That is now the expected shape, not an exception. Importing `IframeManager` in an ad is correct, not a smell.

**The one guardrail from the old rule that still holds:** do not let the real UI turn the ad into a literal walkthrough. The editorial motion still drives; the real UI is the payoff the motion resolves into. And per `[[feedback_mixed_surface_scalepush_pitfall]]`: never `scalePush` the iframe (it steamrolls camera tweens) — use `flyToElement`/`cinematicFlight` camera moves on the iframe and keep `scalePush` for editorial-only layers.

**HARD RULE — never CSS-`filter` over a real-UI iframe (it blurs the whole frame).** Grades, tints, temperature grades, brightness dips over real product UI = translucent **veil overlays**, NEVER an animated `filter` on `#stage`/the camera element or any node that contains the iframe. Chromium rasterizes the iframe through the filter compositing pipeline and visibly **blurs the real UI** — even at neutral filter values, even when the filter is on an *ancestor* rather than the iframe itself. `will-change: transform, filter` on the camera pins the same raster. This is the sibling trap to `scalePush` above; it directly cost a QC round on The Drop (first build graded via `filter` on `#stage` → blurry dashboard). **The camera element animates `transform` only — no `will-change: filter`, no animated `filter`.** The veil recipe:

- **Temperature / tint** → a `div` above the iframe with a background color + animated `opacity` (warm `rgba(255,214,150,·)` radial, cold `rgba(86,96,114,·)`).
- **Desaturation / B&W** → a gray `div` with `mix-blend-mode: saturation`.
- These composite over the iframe pixels without re-rasterizing them → the UI stays sharp.
- Filters are fine on **editorial-only** layers (text, atmospheric divs) that don't sit above a live iframe.

Reference (veils done right): `videos/the-drop/index.html` — `#gradeWarm`/`#gradeCold` (temperature), `#bwVeil` (`mix-blend-mode: saturation` B&W dropout), `#redVeil` (alarm vignette); all animate `opacity`/`autoAlpha`, never `filter`. See `[[reference_iframe_filter_blur]]`.

### 3. The snapshot is a LIVE DOM — its elements ARE the motion graphics (the USP)

Umair rated this **11/10** (fa-retest ad v3/v4, 2026-07-13). A screen-recording competitor cannot do any of it. The technique catalog — all proven in `videos/form-analytics-ad-v2/index.html`:

- **Assembly:** `gsap.set` real iframe-doc elements hidden after load, then choreograph them in one-by-one (cards fly in as 3D objects with `transformPerspective`, table rows domino, chrome drops in). Parent-page GSAP tweens same-origin iframe nodes directly.
- **Live count-ups on real values:** mutate the value's **first text node** (`[...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim())`), never `textContent` — nested links (e.g. the Set Goal anchor inside the stat value) survive. Counters END at the captured values (production truth).
- **Real hidden UI:** toggle captured-but-hidden popovers/modals (`aria-hidden` + `display`), cascade their real rows, type into real inputs (`typeIntoIframeInput`), click real buttons.
- **Off-plane lifts:** `popOut` clones a real element into 2.5D above the page (the goal-arrow money shot).
- **Before/after:** two real captures of the same screen (e.g. `admin-forms-overview` vs `-analytics`) = an honest "what's new" transformation.
- **Real-to-editorial handoffs:** real rows burst outward INTO an editorial effect (constellation) with matched velocity.

### 4. Async real-UI flows: CHAIN them + mark() the boundaries

Fixed-time `tl.call()` cues for multi-second async UI flows WILL desync (caught twice by smoke's glide-warns). Chain the flows (`introFlow().then(dashboardFlow).then(...)`), push `__sched` marks at each boundary, **measure with a headless run**, and align the master timeline's fixed beats to the measured numbers. The ad skeleton carries the `mark()` helper.

### 5. Every effect mount is PARKED until its beat — and probe it

Assume effects mount their text/content VISIBLE (center-out-roll and letter-mask-domino both do). `gsap.set(fx.el, { autoAlpha: 0 })` every mount at build; reveal with a `tl.set` at its beat. Verify with a scene-isolation probe (sample computed opacity of every scene host at 6–8 timestamps headlessly) — the "jumbled frame" bug shipped because nothing checked cross-scene visibility.

### 6. Sound levels that actually work (measured, fa-retest)

Music bed at **−24dB gain was inaudible** (mix RMS −35dB); **−11dB reads clearly** (mix RMS ≈ −27dB). SFX between −16 and −21dB. Verify with `ffmpeg -af astats` on the muxed file — a silent BGM is a mechanical defect, not a taste call. Palette is SEMANTIC: a real click sound only where a click happens, popover-open on popovers, counter-roll under count-ups — never generic whoosh-everything.

**Workflow:** storyboard (motion beats named by intent + which real snapshots appear + the morph/transition between each) → compose effects + text-kit + real iframe camera into the master timeline → **motion-audit gate (A/S required)** → render with SFX.

## Editorial named-effects library (pass-1 vocabulary)

For pass-1 motion, **pick from `videos/_shared/effects/`** before writing custom GSAP. The vocabulary covers the most common editorial archetypes:

- **Text reveals:** `mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`
- **Card layouts:** `mountCardsSpreadFan`, `mountCardsFlyInStack`
- **Constellations:** `mountConstellationPhyllotaxisBloom`

Each returns `{ el, tweenInto(tl, opts), dispose() }`. See `videos/_shared/effects/README.md` for the full vocabulary table + parameters. QC harness at `videos/_qc-effects/index.html`.

If the storyboard names a motion archetype not yet in the library, check `reference/gsap-effects/CATALOG.md` — the full 101-port menu. If the source port matches, promote it to `videos/_shared/effects/` per the README's "Adding a new effect" instructions, then use it. Do not author from scratch when a source port exists.

## REQUIRED references — clone, do not invent

Before writing any editorial chapter or single-HTML video, **load these**:

**Product truth for claims/values:** check `docs/product-truth/<feature>.md` (FIX-5 fa-retest) before putting any feature claim, metric name, or number on screen; when the note is missing and the source doc is reachable, write it during intake — UI-derived semantics get an `UNVERIFIED` marker.

### Canonical clone-and-customize templates

For pure-editorial videos, START FROM ONE OF THESE — do not author from scratch (see INV-16):

**⚠ Playback/instrumentation contract (FIX-2, fa-retest 2026-07-13):** first write = copy `docs/examples/single-html-ad-skeleton.html` — it bakes in AUTOPLAY + `__T0/__sched/__done/__dur`, onComplete end bookkeeping, `?scene=` review wiring, and the SFX-rig/BGM-disabled conventions. **bridge-2 predates that contract** (click-to-start, no instrumentation — smoke/render can't drive a raw clone of it). Clone bridge-2 for VOCABULARY — atmosphere beds, ease voices, SFX cue placement, masked-reveal idiom — but never its playback block.

- **`videos/klaviyo-bridge-2/index.html` — CORE REFERENCE for pure editorial.** Approved after 3 sessions + multiple iterations. **This is the primary vocabulary reference for any new pure-editorial video** (see the contract note above for what NOT to take from it). It encodes the patterns the 3 templates below demonstrate individually, refined through real feedback. When in doubt about motion voice, clone this.
- `reference/html-templates/wpforms-ai-prompt-open.html` — **S-tier** identity-continuity morph (Button → Input → Pill → Chat over 12s). Secondary reference for single-element morph-chain pieces ("AI feature demo" / "product reveal").
- `reference/html-templates/editorial-reference-36s.html` + `editorial-reference-BEATS.md` — **A-tier** 36s linear-scene reference (OpenAI Layo rebuild). Secondary reference for product-announcement / launch / multi-beat narrative work.
- `reference/html-templates/openai-replica-18s.html` — **A-tier** first-try single-HTML proof. Secondary reference for short ad-style pieces.

The clone-and-customize rule (INV-16): copy a template, commit the unmodified clone FIRST, then replace content + brand, keep the motion vocabulary. Three failed editorial attempts (`wpforms-ai-board`, `wpforms-ai-announcement`, `wpforms-ai-zlyvs`) all skipped this and tried to invent from scratch.

### Brand canonical (`reference/wpforms-brand/`)

Do NOT invent brand details. The plugin source-of-truth is here:

- `reference/wpforms-brand/BRAND.md` — usage doc, anti-patterns, AI chat HTML structure
- `reference/wpforms-brand/tokens.css` — `--wpf-orange #E27730` (primary), `--wpf-ai-purple` (AI-feature accent ONLY, never primary), `--wpf-blue`, OS font stack
- `reference/wpforms-brand/assets/` — real Sullie + loading visuals + AI 3-dot spinner SVGs

**Anti-pattern caught in audit (`wpforms-ai-announcement`):** purple `#7a30e2` declared as primary brand. WRONG. Purple is AI-feature-only. Primary is orange.

### Templates API (for "show 200+ templates" beats)

`https://wpforms.com/templates/api/get/` returns real WPForms templates. Cache locally via `tools/fetch-templates.js` (Phase 5e). Use `videos/_shared/wpforms-brand/templates.js` helper. Do NOT invent template names + thumbnails (the `wpforms-ai-announcement/index.html:725-757` mosaic mistake).

### Audit gates — MUST run before handoff

- `wpforms-motion-audit` skill — score every postIntro/cinematic/editorial beat S-F tier. Tier A or higher is merge bar.
- `design-motion-principles` skill (kylezantos) — designer-philosophy critique by Emil Kowalski / Jakub Krehel / Jhey Tompkins lens. **Invoke manually when designer-grade review is wanted — nothing fires it automatically** (FIX-8: two full editorial runs assumed automatic invocation and it never ran).

**Async-approver clause:** if the user has explicitly ordered the finished deliverable and is unavailable to approve mid-run, the storyboard/brief gates convert to: write the artifact to disk, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`, proceed, and surface it FIRST in the handoff. Do not improvise a different self-override.

### Editorial storyboard format

Editorial storyboards MUST include a **morph-chain section** per `docs/storyboard-format-morph-chain-2026-05-10.md`. Without it, editorial videos default to state-table compositions and fail.

### Motion primitives library (`videos/_shared/motion-primitives.js`)

Required reading alongside the templates and brand. The library is the executable form of the camera / cursor / typing / field-reveal / brand-anchor / exit vocabulary that editorial winners share:

- Camera: `cinematicFlight`, `figjamFlight`, `focusStationOverview`
- Cursor: `Cursor` class (glide / click / hover / drag with anti-frenzy guards)
- Text: `caretType`, `statusPillMorph`, `markerSweep`
- Field: `fieldStaggerReveal`
- Brand: `mountSullieBug`
- Exit: `cleanFastRejoin`
- Highlight: `popOut`

QC: `videos/_qc-primitives/index.html`. Lookup: load `wpforms-primitives` skill. **The 3 failed editorial attempts each re-implemented one or more of these from scratch and re-introduced the bug they exist to fix.**

### WPForms interactions library (`videos/_shared/wpforms-interactions.js`)

For `surface: 'mixed'` videos that drive real WPForms admin / builder UI under the editorial overlay: use the Wave 1 interaction methods (`navAddNewForm`, `selectTemplate`, `navWPFormsSidebarMenu`, `openFormInList`, `dragFieldToForm`, `openFieldOptions`, `navBuilderSidebar`, `openSettingsTab`) plus the `IframeManager` helper. Don't hand-roll click + glide + snapshot-swap sequences in mixed editorial scenes — the library is grounded in real selectors and handles the crossfade with no flash-guard cover needed.

## Surface Modes

`manifest.surface` declares the stage type. **For ad-style work, use `editorial` or `mixed`.**

- **`editorial`** — no iframe mounted, no Mac chrome, full-bleed 1920×1080 stage. Pure ad/marketing piece. Chapters export `mode: 'editorial'`.
- **`mixed`** — iframe + Mac chrome stay mounted, full-bleed editorial overlay sits above. Use for hybrid postIntros that need product-truth iframe geometry plus marketing chrome above.
- `iframe` (default) — for tutorials. Don't use for ad-style.

**WRONG — putting an ad-style hero composition in `iframe` surface, then hiding everything with CSS:**
```js
// Wastes the iframe boot, fights the runtime, leaks Mac chrome on resize
manifest.json: { /* no surface field */ }
chapter: { /* attempts to .mac-frame { display: none } */ }
```

**RIGHT — `editorial` surface:**
```json
// videos/<slug>/manifest.json
{ "slug": "wpforms-2-0-launch", "surface": "editorial", "primarySnapshot": null, ... }
```

```js
// videos/<slug>/chapters/hero.js
export const mode = 'editorial';
export default [/* beats */];
```

See `videos/_phase-c-editorial-pilot/` for a minimal reference.

## Composition Patterns

Ad-style videos compose multiple editorial layers into a deliberate timeline. The capability kits exist to make this fast.

### Blocks Library

`videos/_shared/blocks/` provides parent-document editorial blocks (mounted above the iframe, or stand-alone in `editorial` surface). Each returns `{ el, dispose, tweenInto?(tl, opts) }`:

- **`mountCodeCard`** — terminal-style code card with syntax highlight, traffic lights.
- **`mountMacWindow`** — macOS browser/app frame with traffic-light controls.
- **`mountPhoneFrame`** — mobile device frame for phone-screenshot beats.
- **`mountPill`** — labeled rounded badge for tags / states / metrics.
- **`mountArrow`** — animated arrow connector between two points (DrawSVG-backed).
- **`mountRouteLine`** — curved path between elements (MotionPath-backed).
- **`mountTerminal`** — terminal output styling.

```js
import { mountCodeCard } from '../../_shared/blocks/code-card.js';
import { gsap } from 'gsap';

const card = mountCodeCard(stage, {
  title: 'curl wpforms.test/wp-json/wpforms/v1/forms',
  body: '...',
});

const tl = gsap.timeline({ paused: true });
card.tweenInto(tl, { position: 0, duration: 0.6, ease: 'expo.out' });
// ... compose with other tweenInto calls ...
registerTimeline(tl, { id: 'hero-reveal' });
```

**Blocks never read iframe DOM.** They live in the parent document above the iframe (or stand alone). See `docs/blocks.md`.

### Atmospheric Kit

`videos/_shared/atmospheric.js` provides additive ambient layers — grain, sweep, parallax pair, scale push, dark backdrop. Each has `tweenInto(tl, opts)`:

- **`grain`** — Mulberry32-seeded film grain canvas (~2-3% opacity, draw-once).
- **`gradientSweep`** — diagonal CSS gradient panned across.
- **`parallaxPair`** — two stacked image layers, opposite scale/translate.
- **`scalePush`** — wrapper element scale 1 → 1.02 over 3-4s. "No frozen pixels."
- **`darkBackdrop`** — dimming layer.

```js
import { atmospheric } from '../../_shared/atmospheric.js';

const tl = gsap.timeline({ paused: true });
atmospheric.grain.mount(stage);
atmospheric.gradientSweep.mount(stage);
atmospheric.scalePush.tweenInto(tl, { duration: 4, position: 0 });
```

**Use sparingly on routine cursor+click tutorial beats** — atmospheric layers distract from the lesson. Best fit: postIntros, title cards, ad-mode compositions, transformation interstitials.

### Text Kit

`videos/_shared/text-kit.js` provides 24 Pixel-Point-style text reveal presets via `mountTextReveal(text, { preset, ...opts })`. Presets include: mask-reveal-up, top-down-letters, focus-blur-resolve, spring-scale-in, soft-blur-in, per-character-rise, micro-scale-fade, and 17 more.

```js
import { mountTextReveal } from '../../_shared/text-kit.js';

const reveal = mountTextReveal('WPForms 2.0', {
  preset: 'spring-scale-in',
  fontSize: '120px',
  fontWeight: 900,
});
stage.appendChild(reveal.el);

const tl = gsap.timeline({ paused: true });
reveal.tweenInto(tl, { position: 0.4, duration: 0.8 });
```

Uses vendored `SplitText` when loaded. Deterministic DOM fallback when not.

## Composition Pattern: Build → Breathe → Resolve

A common phase structure for ad-style beats (≥3s). Document it in beat comments, don't enforce.

- **Build** (0-30% of beat) — entrance animations, layers fade/cascade in
- **Breathe** (30-70%) — ambient motion only (parallax, scale push, grain pulse). Hold the visual; let it land.
- **Resolve** (70-100%) — payoff cue (label flip, color shift) → exit (blur out, velocity-matched translate)

## Ease Vocabulary

| Motion type | Recommended ease |
|---|---|
| Entrances | `back.out(1.4)`, `expo.out`, `power3.out` |
| Ambient / breathing | `sine.inOut` |
| Pulses | `yoyo: true, repeat: 1, ease: sine.inOut` |
| Exits | `power2.in` + `filter: blur(20-30px)` + optional velocity-matched translate |
| Mechanical / stop motion | `power4.out` or stepped easing via `CustomEase` |

## Hero Composition Skeleton

For a new ad-style video, use this shape as a starting point:

```js
// videos/wpforms-2-0-launch/chapters/hero.js
import { gsap } from 'gsap';
import { loadGsap, registerTimeline } from '../../_shared/kit.js';
import { atmospheric } from '../../_shared/atmospheric.js';
import { mountTextReveal } from '../../_shared/text-kit.js';
import { mountMacWindow } from '../../_shared/blocks/mac-window.js';

export const mode = 'editorial';

export default [{
  id: 'hero',
  duration: 10,
  setup: async ({ doc }) => {
    const stage = doc.body.appendChild(document.createElement('div'));
    stage.id = 'hero-stage';
    Object.assign(stage.style, { position: 'absolute', inset: 0, background: '#0a0e14' });

    atmospheric.grain.mount(stage);
    atmospheric.gradientSweep.mount(stage);

    const title = mountTextReveal('WPForms 2.0', {
      preset: 'spring-scale-in', fontSize: '180px', color: '#E27730',
    });
    title.el.style.cssText += 'position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);';
    stage.appendChild(title.el);

    const window = mountMacWindow(stage, { title: 'Launching today' });
    window.el.style.cssText += 'position:absolute;left:50%;top:65%;transform:translate(-50%,-50%);';

    const tl = await loadGsap().then(({ gsap }) => gsap.timeline({ paused: true }));
    title.tweenInto(tl, { position: 0.5, duration: 0.8 });
    window.tweenInto(tl, { position: 1.4, duration: 0.6 });
    atmospheric.scalePush.tweenInto(tl, { duration: 4, position: 2.0 });

    registerTimeline(tl, { id: 'hero' });
  },
}];
```

## Stage CSS — Hide Leak Surfaces

In `editorial` surface, the runtime doesn't mount `.mac-frame`, `.mac-chrome`, or `.mesh-bg`. But your own stage CSS may need to hide other surfaces if a previous chapter mounted them. Inject hide rules in `setup()` if needed:

```js
const css = doc.createElement('style');
css.textContent = `
  .mesh-bg, .stage, .mac-frame, .mac-chrome, .watermark, #wpf-watermark,
  iframe.ui { display: none !important; }
`;
doc.head.appendChild(css);
```

This was a real Phase 0 lesson on the REST API video (which was authored before `surface: 'editorial'` existed). Now: declare `surface: 'editorial'` and the runtime skips them. CSS injection is only needed for `surface: 'mixed'` work where you want to selectively hide product chrome behind the editorial overlay.

## Output Checklist

Before declaring an ad-style video done:

- [ ] `manifest.surface` is `editorial` or `mixed` (not `iframe`)
- [ ] Uses blocks from `videos/_shared/blocks/` rather than re-implementing chrome
- [ ] Text reveals use `text-kit.js` presets, not hand-rolled
- [ ] Atmospheric layers (grain, sweep, scale push) used where motion density helps; not over-layered on every beat
- [ ] Build-breathe-resolve phase structure for beats ≥3s
- [ ] Final beat has a real exit (blur out, velocity-matched translate, fade-to-black) — not a hard cut
- [ ] All GSAP timelines that span ≥3s and need scrubbing are registered (see `wpforms-gsap-rules`)
- [ ] If using Three.js, render loops use `pausableRaf` (see `wpforms-gsap-rules`)
- [ ] Validators + smoke + render-tool MP4 export all pass

## References (loaded on demand)

- `docs/transitions.md` — Read for `surface: 'editorial'` and `surface: 'mixed'` mechanics + `flipBridge` integration.
- `docs/blocks.md` — Read for the full blocks library API and tweenInto contract.
- `docs/text-kit.md` — Read for the 24-preset text-reveal API.
- `docs/authoring-api.md` — Read for the manifest `surface` field and editorial chapter behavior.
- `docs/postintro-patterns.md` — Read when the marketing video is a hybrid (postIntro + walkthrough) — postIntro rules apply.
- `docs/frame-driver.md` — Read when authoring registered timelines for scrubbable editorial beats.
- `docs/render.md` — Read when running `tools/render.js --seek` (only valid for `surface: 'editorial'`).
- `videos/klaviyo-bridge-2/index.html` — **CORE REFERENCE / Primary clone target** for pure editorial (approved after 3 sessions + iterations).
- `reference/html-templates/wpforms-ai-prompt-open.html` — Secondary, S-tier identity-continuity morph.
- `reference/html-templates/editorial-reference-36s.html` + `editorial-reference-BEATS.md` — Secondary, linear-scene reference, 13 beats, named atmospheres + transitions.
- `reference/html-templates/openai-replica-18s.html` — Secondary, first-try single-HTML proof.
- `reference/wpforms-brand/BRAND.md` — Brand canonical, anti-patterns, real AI chat HTML structure.
- `docs/winning-pattern-analysis-2026-05-10.md` — Identity-continuity authoring rule + 5-variable winning pattern.
- `docs/polish-vocabulary-2026-05-11.md` — Per-chapter polish deltas from rest-api polished-vs-unpolished. Tutorial-polish primitives.
- `docs/storyboard-format-morph-chain-2026-05-10.md` — Morph-chain storyboard section authoring contract.

## Granular craft references

- `docs/atmospheric-composition.md` — Read when picking grain / sweep / parallax / scale-push and layering them.
- `docs/color-palette.md` — Read for the canvas-void / cyan / violet / amber accent palette used in editorial videos.
- `docs/title-card-voice.md` — Read for hero title shape and CTA tone in ad-style outros.
- `docs/stage-css.md` — Read for `surface: 'editorial'` / `'mixed'` z-stack and when to hide chrome.
- `docs/beat-pacing.md` — Read for Build → Breathe → Resolve phase structure in 3-12s editorial beats.
- `docs/camera-lensing.md` — Read when the editorial composition uses iframe geometry (`surface: 'mixed'`).

## See Also

- `wpforms-primitives` — `motion-primitives.js` + `wpforms-interactions.js` lookup. Editorial compositions pull cursor / camera / typing / field-reveal / brand-anchor / exit straight from here.
- `wpforms-video` — for tutorial-mode work (the other half of the dual mandate).
- `wpforms-postintro` — postIntros often share patterns with ad-style work.
- `wpforms-gsap-rules` — registered timelines + `pausableRaf` are how editorial beats become scrubbable.
- `wpforms-transitions` — `surface: 'mixed'` + cross-snapshot bridges for hybrid pieces.
