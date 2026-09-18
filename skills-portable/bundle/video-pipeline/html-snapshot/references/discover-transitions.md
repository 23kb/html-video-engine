# Discovering transitions for a new product

A snapshot is a frozen page. Capture strips every script, so nothing in it
reacts. `scripts/interactivity-kit.js` re-adds behaviour one registration at a
time. This file is the procedure for writing those registrations for a product
the kit has never seen.

The bar is "behaves like the product on camera". A registration that reaches
the right final DOM state through a different code path than the product is
fine. One that reaches a different state is a lie on film.

Three paths, in this order. Path 1 is the default; ask its one question before
anything else. Path 2 costs real time and needs a go. Path 3 is tagged so the
film crew can see it.

## Path 1 — the product's source code (default)

Ask ONE question: **"Is the product installed locally, and may I read its
source?"** For a team that films its own product the answer is almost always
yes, and source is the specification: captures show *states*, source shows
*rules*.

Locate it:

- WordPress plugins: `<site path>/wp-content/plugins/<plugin slug>/`. The site
  path comes from a `sites.json` in the working directory, one found elsewhere on
  the machine (say which file you used; ask first when not in an auto mode), or from the user. Built admin scripts usually sit in
  `build/`, `assets/js/` or `dist/`; unminified sources in `src/` when shipped.
- Other products: wherever the user points. A `node_modules` package, a
  checked-out repo, a `dist/` bundle with source maps.

Then, for the control the film needs:

1. Find the handler that runs on it. Search the built script for the control's
   class name or `data-` attribute; jQuery delegations look like
   `$(document).on('click', '.the-control', fn)`, vanilla ones like
   `addEventListener('click', ...)` under a `closest('.the-control')` check.
2. Follow it to every DOM write: classes, attributes, inline styles, text,
   `hidden`, `aria-*`, sibling visibility, `display` toggles, `value`.
3. Follow every condition. A toggle that also hides two siblings when a third
   option is set has three render rules, and a capture of one click shows one.
4. Write `apply(el, event)` from those writes, synchronously. Keep the
   product's order when order matters (a class that a CSS rule keys on, then
   the text it labels). Do not call the product's function; re-state its DOM
   effect.
5. Tag it `source: "source-code"` with the date you read the source and the
   file you read it in (a comment is enough).

Precedent: the interactivity layer that drives one WordPress form builder on
camera was written this way — about 200 registrations, most of them from the
plugin's own JavaScript, each mirroring the plugin function it stands in for.
For one control, 3 of its 5 render rules were invisible in both a before and an
after capture; only the source showed them. That is why this path is first.

## Path 2 — drive the live control and diff (secondary; needs a go)

Use it when the source is not available or not readable. **Before running it,
tell the user what it costs and wait for a go:** it takes minutes per control
(a browser launch, two captures, a diff), spends tokens on the two documents,
and needs the live site up and reachable with a session that may drive it. A
third-party logged-in session is never automated.

1. Open the live page with Playwright and use REAL input: `page.mouse.click`,
   `page.keyboard.press`, `locator.click()`. Synthetic `el.click()` and
   framework `trigger()` calls are ignored by delegated bindings in most
   frameworks, so the state you diff would be the state nothing produced.
2. Capture the DOM before the interaction and again after it. Two runs of
   `freeze.mjs` (one with a `--steps` plan that performs the interaction) or
   one run of `states.mjs` that records a state fragment per step.
3. Diff the two documents. What you are looking for, per changed element:
   - attributes added, removed, or changed (`class`, `aria-expanded`,
     `data-state`, `hidden`, `disabled`, `value`, `checked`, `selected`)
   - inline `style` changes (`display`, `visibility`, `height`, `transform`)
   - text content changes (labels, counters, status pills)
   - elements inserted or removed (dropdown lists, chips, rows)
4. Write `apply()` so that it produces exactly that diff, synchronously.
   Nothing may wait on a timer, an animation frame, or a `transitionend`:
   a frame-stepped render seeks to a timestamp and reads the DOM right then.
5. Tag it `source: "captured"` with the date of the capture.

A diff tells you what one interaction did in one state. It does not tell you
what the product does in other states. Say so in the label or a comment when
you know the coverage is partial.

## Path 3 — synthetic (tagged, never dressed as a capture)

If a state you need was never captured and the source is not available, you
can still write an `apply()` from your understanding of the product. Tag it
`source: "synthetic"`. The tag exists so the film crew can decide whether an
invented state may appear on camera. Do not launder a guess as a capture.

## Writing the registration

```js
SnapKit.register({
  label: 'product/area/what-it-does',   // stable id, used in error output
  event: 'click',                        // click | change | input | mousedown | keydown
  match: '.control-selector',            // CSS selector (closest() from the event target) or function(el)
  apply: function (el, event) { /* synchronous DOM writes */ },
  source: 'source-code',                 // source-code | captured | synthetic
  verified: '2026-01-31'                 // the day it was checked against the product (or its source)
});
```

Use `SnapKit.fadeSwap(el, mutateFn)` when a mutation causes a visible layout
snap. The mutation still runs first, on the same call stack; the fade only
decorates the frame after it.

Use `SnapKit.enhanceSelects(selector)` for native `<select>` controls you need
to open on camera. The OS draws the native popover outside the page, so a
synthetic cursor cannot show it; the kit replaces it with an in-DOM list that
sets `select.value` and dispatches `change`, which then reaches your `change`
registrations.

A frame-stepped probe asserts STATE, never decoration: the overlay's `.is-open`
class and `select.value`, not its opacity (a CSS transition leaves opacity at 0
on the frame the overlay opens, by design). The same rule applies to any
registration that uses `fadeSwap`: assert the mutated DOM, not the fade.

Captured-hidden elements carry an inline `display: none`. The capture's visibility bake stamps
the computed hidden state inline, and an inline style beats the product's class rule: a
registration that adds `.is-active` to a panel changes nothing until it also clears the inline
`display` (`el.style.removeProperty('display')`) and lets the product's CSS decide. The live
product never needed that line; the fossil does.

Anchors: a fossil keeps its live `href`s. The kit's delegated `click` handler
runs on the capture phase and calls `preventDefault()` on any `<a href>` so a
registered click never navigates the iframe to the live site; a registration
that wants a link to "work" mutates the DOM to the target state instead.

## What the kit does NOT do

- It ships no product handlers. The registry is empty on load.
- It does not detect what a page needs. Discovery is the procedure above.
- It does not fetch, poll, or talk to a server. A snapshot is static.
- It does not fix captures that lost their styling. That is a capture problem.
- A snapshot with zero registrations is display-only. That is a valid
  deliverable: many beats only need the page to stand still under a camera.
