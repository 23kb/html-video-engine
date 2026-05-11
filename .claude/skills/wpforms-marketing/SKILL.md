---
name: wpforms-marketing
description: Use when authoring or reviewing ad-style / release / announcement / launch WPForms videos — editorial-surface compositions, atmospheric layers, character cascades, hero lockups, full-bleed 1920×1080 ad pieces, or hybrid postIntros that mix product geometry with marketing chrome. Triggers on `surface: 'editorial'`, `surface: 'mixed'`, "ad-style", "marketing video", "announcement", "release video", "atmospheric", "blocks library", "text-kit reveal", or any non-tutorial composition. For tutorial videos, use wpforms-video instead.
---

# WPForms Marketing / Ad-Style Videos

The repo has three authoring paths (see `CLAUDE.md` for the full table):

1. **Tutorial** — real WPForms product UI in an iframe (covered by `wpforms-video`).
2. **Pure editorial / ad-style** — single self-contained HTML, no engine, clone from `reference/html-templates/`. Covered here.
3. **Mixed** — editorial chrome composited over real product UI via `surface: 'mixed'`. Covered here + `wpforms-transitions`.

This skill covers paths 2 and 3.

## REQUIRED references — clone, do not invent

Before writing any editorial chapter or single-HTML video, **load these**:

### Canonical clone-and-customize templates (`reference/html-templates/`)

For pure-editorial videos, START FROM ONE OF THESE — do not author from scratch:

- `reference/html-templates/wpforms-ai-prompt-open.html` — **S-tier** identity-continuity morph (Button → Input → Pill → Chat over 12s). The canonical pattern for "AI feature demo" or "product reveal" pieces.
- `reference/html-templates/editorial-reference-36s.html` + `editorial-reference-BEATS.md` — **A-tier** 36s linear-scene reference (OpenAI Layo rebuild). Use for product-announcement / launch / multi-beat narrative work.
- `reference/html-templates/openai-replica-18s.html` — **A-tier** first-try single-HTML proof. Use for short ad-style pieces.

The clone-and-customize rule: copy a template, replace content + brand, keep the motion vocabulary. Three failed editorial attempts (`wpforms-ai-board`, `wpforms-ai-announcement`, `wpforms-ai-zlyvs`) all skipped this and tried to invent from scratch.

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
- `design-motion-principles` skill (kylezantos, auto-triggers) — designer-philosophy critique by Emil Kowalski / Jakub Krehel / Jhey Tompkins lens.

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
- `reference/html-templates/wpforms-ai-prompt-open.html` — **Primary clone target.** S-tier identity-continuity morph.
- `reference/html-templates/editorial-reference-36s.html` + `editorial-reference-BEATS.md` — Linear-scene reference, 13 beats, named atmospheres + transitions.
- `reference/html-templates/openai-replica-18s.html` — First-try single-HTML proof.
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
