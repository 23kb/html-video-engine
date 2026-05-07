# Shared Editorial Blocks

`videos/_shared/blocks/` contains parent-document editorial chrome for tutorial
and marketing-style videos. Blocks sit above the iframe or inside an editorial
surface. They never read or mutate iframe DOM.

## Contract

Each module exports a `mountX(opts)` function and returns:

```js
{
  el,
  dispose(),
  tweenInto(tl, { duration, position })
}
```

`dispose()` is idempotent. Blocks inject only instance-scoped CSS and remove it
on dispose. `tweenInto()` is optional in the contract, but every Phase D block
ships it for timeline composition.

## Blocks

- `mountCodeCard({ code, language, title, status, x, y, width, zIndex })`
  Terminal-style code card with lightweight JS/JSON highlighting.
- `mountMacWindow({ title, subtitle, content, x, y, width, height })`
  macOS-style window frame for editorial cards, diagrams, or screenshots.
- `mountPhoneFrame({ content, x, y, width, height })`
  Mobile device frame for responsive screenshots or mobile-state beats.
- `mountPill({ label, tone, x, y })`
  Compact state/tag/metric badge. Tones: `blue`, `orange`, `green`, `dark`.
- `mountArrow({ from, to, bend, stroke, width })`
  Animated curved arrow connector.
- `mountRouteLine({ points, stroke, width })`
  Animated multi-point route or flow line.
- `mountTerminal({ lines, prompt, title, x, y, width })`
  Multi-line command/output terminal.

## Example

```js
import { loadGsap } from '../../_shared/kit.js';
import { mountCodeCard, mountPill } from '../../_shared/blocks/index.js';

const gsap = await loadGsap({ drawSVG: true });
const tl = gsap.timeline({ paused: true });
const card = mountCodeCard({
  title: 'request',
  code: 'const form = await wpforms.getForm(42);',
  x: 180,
  y: 210,
});
const pill = mountPill({ label: '200 OK', tone: 'green', x: 720, y: 188 });

card.tweenInto(tl, { position: 0 });
pill.tweenInto(tl, { position: 0.28 });
```

Dispose blocks in chapter cleanup or after the beat:

```js
card.dispose();
pill.dispose();
```
