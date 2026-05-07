# Text Kit

`videos/_shared/text-kit.js` provides Pixel-Point-style editorial text reveals
through one stable factory:

```js
import { mountTextReveal } from '../../_shared/text-kit.js';

const reveal = mountTextReveal('WPForms', {
  preset: 'mask-reveal-up',
  size: 72,
  color: '#ffffff',
});
reveal.tweenInto(tl, { position: 0, duration: 0.8 });
```

Load GSAP with SplitText before mounting when possible:

```js
const gsap = await loadGsap({ splitText: true });
```

The factory still works without SplitText by using a deterministic DOM fallback,
but SplitText is the preferred path for production chapters.

## Presets

- `mask-reveal-up`
- `top-down-letters`
- `focus-blur-resolve`
- `spring-scale-in`
- `soft-blur-in`
- `per-character-rise`
- `micro-scale-fade`
- `type-out-typewriter`
- `glitch-resolve`
- `shutter-bars`
- `zoom-blur-in`
- `wave-rise`
- `cascade-from-edge`
- `letter-flip`
- `slide-mask-left`
- `slide-mask-right`
- `gradient-wipe`
- `bounce-in-letters`
- `elastic-scale-in`
- `chromatic-shift`
- `magnetic-snap`
- `paragraph-stagger`
- `word-by-word-emphasis`
- `liquid-morph`

## Cleanup

`dispose()` kills GSAP tweens, reverts SplitText when used, and removes the
mounted element. It is safe to call twice.
