# Legacy Chapter Skeleton

Default copy target for normal new video chapters.

```js
import sel from './_selectors.js';

export const snapshot = '<real-snapshot-slug>';
export const validator = { snapshot: '<real-snapshot-slug>' };
export const mode = 'per-beat-narration';
export const breakStyle = 'glide';
export const swapStyle = 'morph';

export async function setup({ doc }) {
  // Optional product-truth DOM staging under cover.
  // Ground this in tools/field-state.js, real captured DOM, or cloned product DOM.
}

export default [
  {
    id: 'name-the-control',
    chapter: 'setup',
    camera: { focus: sel.control, level: 2.2, pad: 14, noScroll: false },
    overlays: [{ highlight: sel.control, label: 'Important control', pad: 10 }],
    narration: 'name-the-control',
    effect: async ({ highlight, clearHighlights, sleep }) => {
      await highlight([sel.control], { label: 'Important control', pad: 10 });
      await sleep(650);
      await clearHighlights();
    },
    duration: 0.2,
  },
  {
    id: 'show-payoff',
    chapter: 'payoff',
    camera: { focus: sel.payoff, level: 2.0, pad: 18 },
    narration: 'show-payoff',
    effect: async ({ cursor, sleep }) => {
      await cursor.moveTo(sel.payoff);
      await sleep(500);
    },
    duration: 0.2,
  },
];
```

Selector sheet shape:

```js
export default {
  control: '#real-selector-from-catalog',
  payoff: '#real-selector-from-catalog'
};
```

Rules:

- Allowed imports: `./_selectors*.js`, `./_kit.js` (per-video), and
  `../../_shared/kit.js` (universal video-author helpers — vendored GSAP
  loader, scene layer, click ripple, cursor styling, font loader, text
  splitting, iframe transform helpers, clone-from-iframe). See
  `docs/chapter-module-contract.md` → "Shared video-author kit".
- Capability kits are opt-in: use `../../_shared/atmospheric.js` for grain/sweep/parallax,
  `../../_shared/text-kit.js` for text reveals, `../../_shared/lottie-kit.js`
  for Lottie bumpers, or `../../_shared/three-kit.js` for editorial 3D layers.
- Do not import from `engine/`, `runtime/`, or `scenes/`.
- Do not use descriptor step fields such as `do`, `target`, `after`, or
  descriptor verb signatures inside legacy `effect()` bodies.
- Keep narration clips close to the 6-second beat rule.
- Use `swapToSnapshot(slug, { setup })` from ctx for mid-effect snapshot swaps.
- Default camera levels are `2.0–2.4` for normal product beats; the runtime
  default is `2.2`. Anything below `~1.4` will read as a wide PowerPoint pan
  rather than a focused beat.
- Default `breakStyle: 'glide'` and `swapStyle: 'morph'` match the locked
  manifest defaults. Override only with reason.
- Real cursor/click interactions on captured DOM (or staged DOM cloned from
  product truth) make a chapter feel like a tutorial. Pure highlight + label
  beats with no pointer motion read as slides — avoid that as the only mode
  unless the beat is genuinely a hold.

## Phase B–E.5 optional additions (Phase G note)

The skeleton above is the simplest authoring shape. Modern features are opt-in via `videos/_shared/kit.js`:

```js
// Phase A capability kits (allowed imports, opt-in):
import { atmospheric }     from '../../_shared/atmospheric.js';
import { mountTextReveal } from '../../_shared/text-kit.js';
// Phase D blocks library (parent-document editorial chrome):
import { mountCodeCard }   from '../../_shared/blocks/code-card.js';
// Phase A registered effects library:
// gsap.effects.highlightPulse, .fieldBurst, .labelReveal, .popOutTilt, .cardReflow

// Phase B: paused, driver-owned, scrubbable timelines:
import { loadGsap, registerTimeline, awaitTween } from '../../_shared/kit.js';

// Phase C: named camera poses (cleaner than inline level/pad):
import { registerCameraPose, resolveCameraPose } from '../../_shared/kit.js';
registerCameraPose('focus', { focus: sel.target, level: 1.18, pad: 14 });
// Then in beats:  camera: 'focus'   // resolves to the registered spec

// Phase C: cross-snapshot continuity (override default morph):
export const swapStyle = 'flipBridge';

// Phase E.5: pause-aware RAF (REQUIRED for any author render loop):
import { pausableRaf } from '../../_shared/kit.js';
// Vanilla `requestAnimationFrame` won't honor scrubber pause.
```

Allowed imports beyond `./_selectors*.js`:

- `../../_shared/kit.js` — `loadGsap`, `awaitTween`, `withGsapContext`, `registerTimeline`, `registerCameraPose`, `pausableRaf`, `mulberry32`.
- `../../_shared/effects.js` — `gsap.effects.<name>` registry. Side-effect import.
- `../../_shared/atmospheric.js` — grain, sweep, parallax pair, scale push, dark backdrop.
- `../../_shared/text-kit.js` — 24 Pixel-Point text-reveal presets.
- `../../_shared/lottie-kit.js` — Lottie editorial bumpers.
- `../../_shared/three-kit.js` — Three.js scene helpers.
- `../../_shared/blocks/*.js` — code-card, mac-window, phone-frame, pill, arrow, route-line, terminal.

Do not import from `engine/`, `runtime/`, or `scenes/`.

For deeper context: load `wpforms-gsap-rules` (registered timelines, `pausableRaf`, effects), `wpforms-transitions` (camera poses, `flipBridge`), or `wpforms-marketing` (blocks, atmospheric, text-kit) skills.
