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

- Import only local selector files.
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
