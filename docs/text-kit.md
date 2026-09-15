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

Load SplitText before mounting when possible — a vendored script tag above the module script (`kit.js loadGsap` retired 2026-08-22):

```html
<script src="/vendor/gsap/3.15.0/gsap.min.js"></script>
<script src="/vendor/gsap/3.15.0/SplitText.min.js"></script>
```

The factory still works without SplitText by using a deterministic DOM fallback,
but SplitText is the preferred path for production chapters.

## Presets

**Layout behavior matters (acceptance E-4, 2026-08-23):** split presets render
their units as `inline-block` spans (masked ones inside `overflow: hidden`
wrappers). In a host with no width guard — e.g. an absolutely-positioned
shrink-to-fit container — those units wrap into a vertical stack and masked
units clip mid-glyph; `mask-reveal-up` shipped this way as "broken subtitles".
Give the host an explicit width (or `white-space: nowrap` for one-liners)
before mounting any split preset. `split: none` presets animate the text as
one unit and carry no internal wrap risk.

| Preset | Split unit | Layout behavior |
|---|---|---|
| `mask-reveal-up` | chars (masked) | inline units; wraps + clips without a host width guard |
| `top-down-letters` | chars (masked) | inline units; wraps + clips without a host width guard |
| `per-character-rise` | chars | inline units; wraps without a host width guard |
| `type-out-typewriter` | chars | inline units; wraps without a host width guard |
| `glitch-resolve` | chars | inline units; wraps without a host width guard |
| `wave-rise` | chars | inline units; wraps without a host width guard |
| `cascade-from-edge` | chars | inline units; wraps without a host width guard |
| `letter-flip` | chars | inline units; wraps without a host width guard |
| `bounce-in-letters` | chars | inline units; wraps without a host width guard |
| `magnetic-snap` | chars | inline units; wraps without a host width guard |
| `liquid-morph` | chars | inline units; wraps without a host width guard |
| `slide-mask-left` | words (masked) | inline word units; wraps + clips without a host width guard |
| `slide-mask-right` | words (masked) | inline word units; wraps + clips without a host width guard |
| `elastic-scale-in` | words | inline word units; wraps without a host width guard |
| `word-by-word-emphasis` | words | inline word units; wraps without a host width guard |
| `shutter-bars` | lines (masked) | block-stacked line units by design |
| `paragraph-stagger` | lines | block-stacked line units by design |
| `focus-blur-resolve` | none | one unit; no internal wrap risk |
| `soft-blur-in` | none | one unit; no internal wrap risk |
| `spring-scale-in` | none | one unit; no internal wrap risk |
| `micro-scale-fade` | none | one unit; no internal wrap risk |
| `zoom-blur-in` | none | one unit; no internal wrap risk |
| `gradient-wipe` | none | one unit; no internal wrap risk |
| `chromatic-shift` | none | one unit; no internal wrap risk |

## Cleanup

`dispose()` kills GSAP tweens, reverts SplitText when used, and removes the
mounted element. It is safe to call twice.
