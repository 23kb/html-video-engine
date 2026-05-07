# Shared Effects Library

`videos/_shared/effects.js` registers reusable GSAP effects for chapter and
editorial choreography. Import it once, wait for `effectsReady` when immediate
use matters, then call `gsap.effects.<name>(target, opts)`.

```js
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
gsap.effects.highlightPulse('.wpforms-field-label');
```

## `highlightPulse(target, opts)`

Signature: `gsap.effects.highlightPulse(target, { color, scale, duration })`

Defaults: `{ color: '#f9c74f', scale: 1.06, duration: 0.55 }`

Visual: scales the target up and back while flashing a soft filter glow. It
clears temporary transform/filter props at the end.

```js
import { awaitTween } from '../../_shared/kit.js';
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
const label = doc.querySelector('.wpforms-field-label');
const pulse = gsap.effects.highlightPulse(label, { color: '#ff8a00' });
await awaitTween(pulse);
```

Use when a real UI control needs a quick "look here" beat. Do not use it as a
long-running ambient loop or as a replacement for a proper camera focus.

## `fieldBurst(target, opts)`

Signature: `gsap.effects.fieldBurst(target, { particles, color, duration })`

Defaults: `{ particles: 10, color: '#ff8a00', duration: 0.7 }`

Visual: emits a small finite radial burst from the target center using temporary
dot elements. The effect removes all generated DOM on complete or interruption.

```js
import { awaitTween } from '../../_shared/kit.js';
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
const button = doc.querySelector('.wpforms-save-button');
const burst = gsap.effects.fieldBurst(button, { particles: 14 });
await awaitTween(burst);
```

Use for payoff moments such as a save, insert, or completed field action. Do
not use it over dense UI where particles would obscure product truth.

## `labelReveal(target, opts)`

Signature: `gsap.effects.labelReveal(target, { from, duration, stagger })`

Defaults: `{ from: 'mask-up', duration: 0.75, stagger: 0.025 }`

`from` accepts: `'mask-up'`, `'fade'`, or `'spring'`.

Visual: uses SplitText to cascade label characters into place, then reverts the
SplitText wrapper DOM when the animation completes.

```js
import { awaitTween } from '../../_shared/kit.js';
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
const headline = layer.querySelector('.chapter-title');
const reveal = gsap.effects.labelReveal(headline, { from: 'spring' });
await awaitTween(reveal);
```

Use for editorial labels, title-card text, or staged helper copy. Do not use it
on form-field values where splitting text could distort a captured product
state during inspection.

## `popOutTilt(target, opts)`

Signature: `gsap.effects.popOutTilt(target, { lift, rotate, shadow, duration })`

Defaults:
`{ lift: 18, rotate: -1.5, shadow: '0 22px 42px rgba(26,34,56,0.20)', duration: 0.65 }`

Visual: lifts the element in place with a slight tilt, scale, and drop shadow,
then settles it back. This is not `runtime/pop-out.js`: it does not clone
elements out of the iframe or create a host-stage actor. It only animates the
target in place.

```js
import { awaitTween } from '../../_shared/kit.js';
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
const card = doc.querySelector('.wpforms-panel-content-section');
const pop = gsap.effects.popOutTilt(card, { rotate: 1.2 });
await awaitTween(pop);
```

Use when the target itself can safely move without breaking the shot. Do not
use when a target needs to rise above iframe clipping; use the runtime pop-out
helper for that separate job.

## `cardReflow(targets, opts)`

Signature: `gsap.effects.cardReflow(targets, { from, to, duration, stagger })`

Defaults: `{ from: null, to: null, duration: 0.75, stagger: 0.035 }`

Visual: runs a Flip reflow after a DOM layout mutation. Pass `from` as a
pre-captured `Flip.getState(targets)` when the DOM has already been mutated, or
pass `to` as a function that mutates layout after the effect captures state.

```js
import { awaitTween } from '../../_shared/kit.js';
import { effectsReady } from '../../_shared/effects.js';

const gsap = await effectsReady;
const cards = layer.querySelectorAll('.plan-card');
const state = gsap.core.globals().Flip.getState(cards);
cards[0].after(cards[2]);
await awaitTween(gsap.effects.cardReflow(cards, { from: state }));
```

Use for editorial card stacks, product-derived option lists, or staged layout
reordering. Do not use it to fake a WPForms state that has no product-truth
source.
