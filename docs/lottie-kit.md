# Lottie Kit

## When To Use

Use `videos/_shared/lottie-kit.js` for bumpers, badges, stings, and editorial
micro-animations that sit above the WPForms iframe surface. Do not use Lottie to
replace or fake iframe content.

## What It Ships

- `loadLottie()` — lazy-loads the vendored `lottie-web` ESM module and caches it on `window.lottie`.
- `mountLottie(src, opts)` — mounts a fixed SVG-rendered Lottie layer and returns `{ container, animation, tweenInto, tweenFrames, tweenMarker, dispose }`.
- `tweenInto(tl, opts)` — Phase 1 call-based play/stop timing on the caller's GSAP timeline.
- `tweenFrames(tl, opts)` — scrubs numeric frames with GSAP, including reverse and eased motion.
- `tweenMarker(tl, opts)` — resolves embedded marker names to frames, then scrubs with the same frame path.

## Minimal Example

```js
import { loadGsap, loadLottie, mountLottie, tlDone } from './_kit.js';

export const snapshot = 'admin-forms-overview';
export const validator = { snapshot: 'admin-forms-overview' };
export const mode = 'parallel';
export const narration = 'bumper';

export default [{
  id: 'bumper',
  chapter: 'bumper',
  duration: 0.2,
  effect: async () => {
    const gsap = await loadGsap({ flip: false, motionPath: false });
    await loadLottie();
    const lottie = mountLottie('/videos/lottie-sandbox/assets/bumper.json');
    const tl = gsap.timeline();
    lottie.tweenInto(tl, { duration: 2, position: 0 });
    await tlDone(tl);
    lottie.dispose();
  },
}];
```

## Marker Example

```js
import { loadGsap, loadLottie, mountLottie, tlDone } from './_kit.js';

export const snapshot = 'admin-forms-overview';
export const validator = { snapshot: 'admin-forms-overview' };
export const mode = 'parallel';
export const narration = 'bumper';

export default [{
  id: 'markers',
  chapter: 'markers',
  duration: 0.2,
  effect: async () => {
    const gsap = await loadGsap({ flip: false, motionPath: false });
    await loadLottie();
    const lottie = mountLottie('/videos/lottie-sandbox/assets/badge.json');
    const tl = gsap.timeline();
    lottie.tweenMarker(tl, { from: 'enter', to: 'hold', duration: 0.6 });
    tl.to({}, { duration: 0.4 });
    lottie.tweenMarker(tl, { from: 'hold', to: 'exit', duration: 0.6, position: '>' });
    await tlDone(tl);
    lottie.dispose();
  },
}];
```

## Asset Rules

Lottie runtime code is vendored from `/vendor/lottie-web/<version>/`; runtime
chapters must not fetch `lottie-web` from a CDN. Store sample JSONs under
`videos/<slug>/assets/` and document source/license per file in that folder's
`README.md`.

## Disposal Contract

Call `dispose()` at the end of every chapter that mounts a Lottie instance.
Mid-flight dispose is safe: active frame tweens are killed before Lottie tears
down its SVG nodes and ticker.

## Known Limits

One autoplay/scrub sequence per mounted instance per chapter is the supported
path. The kit uses Lottie's SVG renderer only; canvas and HTML renderers are not
supported. Marker scrubbing requires markers embedded in the source JSON.
