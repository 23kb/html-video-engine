# Cursor Choreography

How the on-screen cursor reads as intentional vs robotic. Covers `park`, `moveTo`, `glideTo`, `dragGrab`, click timing, and the "via waypoint" pattern.

The cursor is the most-watched element in tutorial videos. Stiff cursor moves are the #1 reason a beat reads as "automated demo" rather than "tutorial." This doc captures the patterns that make it feel deliberate.

## API surface

From `engine.js` cursor object (passed via ctx to chapter `effect()`):

- **`cursor.park({ x, y })`** — instant placement at iframe coords. No animation. Use to set initial position before a beat starts.
- **`cursor.moveTo(target, { wait })`** — straight-line move from current position to `target` (selector or coords). Default 600ms ease.
- **`cursor.click({ effect })`** — click animation at current position. Optional `effect.remove` (selector to fade-out) or `effect.toggleClass`.
- **`cursor.dragGrab(srcSel, dstSel, { wait, rotate, ghostMaxPx })`** — visual drag from source element to destination. Creates a clone "ghost," tilts it, animates to destination, releases.
- **`cursor.hide()`** / **`cursor.show()`** — visibility toggle.

From `interactions.js` (semantic wrappers):

- **`cursor.parkAt(anchor | sel)`** — park at a named anchor (`'center'`, `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`) or selector center.
- **`cursor.parkNearest(sel)`** — park at the nearest off-screen edge for a target. Useful before a `glideTo` to set up a natural arc entry.
- **`cursor.glideTo(target, { via, wait })`** — move via an optional waypoint (selector or `{ x, y }`) for a curved/arc'd path. **Strongly preferred over `moveTo` for non-trivial moves.**
- **`cursor.clickOn(sel, { dispatch, label, instruction, direction, magnetic })`** — highlight + (optional) instruction + click. Most beats use this rather than separate `highlight` + `click`.
- **`cursor.hoverOn(sel, ms, { label })`** — highlight + cursor hold for N ms.
- **`cursor.typeInto(sel, text, opts)`** — highlight + click + typewriter with per-keystroke sound.
- **`cursor.dragFromTo(srcSel, dstSel)`** — visual drag wrapper.
- **`cursor.toggle(sel)`** — flip a checkbox/radio with proper event dispatch.

## The `glideTo via` pattern (most under-used helper)

Straight-line cursor moves look robotic. Real users curve their hand to the target. `glideTo` accepts a `via` waypoint so the cursor takes a natural arc.

**WRONG — straight line across the form:**
```js
await cursor.moveTo(sel.firstField);     // top of form
await cursor.moveTo(sel.submitButton);   // bottom — straight line, robotic
```

**RIGHT — arc via the side of the canvas:**
```js
await cursor.glideTo(sel.submitButton, {
  via: { x: 1200, y: 400 },   // off-canvas waypoint creates a curve
});
```

**RIGHT — arc via another element:**
```js
await cursor.glideTo(sel.submitButton, {
  via: sel.previewArea,   // arcs through the preview, like the user's hand swept past
});
```

This single change makes routine "click here, click there" beats feel like a real human is operating the form.

## Timing — what reads as natural

- **Park before a beat:** the cursor should be in position 200-400ms before the narration cue. Park during the previous beat's trailing dwell or at the chapter break.
- **Move duration:** 500-700ms feels right for a normal cross-canvas move. <400ms reads as "teleport." >900ms drags. Default `wait: 600` is correct most of the time.
- **Settle pause before click:** 200-350ms after arrival, before `click()`. Otherwise the click looks rushed.
- **Click effect duration:** 140ms (the engine default). Don't extend; the snap-back is the click.
- **Post-click hold:** 300-500ms before the next move. Lets the click "land" visually.

## When to hide the cursor

- **Drag operations** — `cursor.dragGrab` already handles this; the cursor hides when the ghost takes over.
- **`focusPull` reveals** — the cursor would distract from the focused element. Hide before, show after.
- **PostIntro phases without interaction** — concept beats often have no cursor; hide it during the editorial layer's run, show it for the handoff dive.
- **Atmospheric / scale-push beats** — pure ambient motion shouldn't have a cursor visible.

```js
await cursor.hide();
// ... atmospheric beat or pure dive ...
await cursor.parkNearest(sel.target);  // park off-screen first
await cursor.show();
await cursor.glideTo(sel.target, { via: ... });
```

## `clickOn` vs `highlight` + `click`

`clickOn` is the integrated beat. It does highlight + (optional) instruction arrow + cursor approach + click + post-click hold in one call. For most "show this control, then click it" beats, this is the right verb.

```js
// Preferred — single integrated call:
await cursor.clickOn(sel.smartTagsButton, {
  label: 'Click Smart Tags',
  instruction: 'Insert a dynamic value here',
  magnetic: true,  // target scales 1.04 during cursor approach
});

// Avoid — three separate calls when one works:
await highlight([sel.smartTagsButton], { label: 'Smart Tags' });
await cursor.moveTo(sel.smartTagsButton);
await cursor.click();
```

The `magnetic: true` option scales the target slightly during cursor approach, then settles on click. Reads as intentional anticipation.

## Drag patterns

- **`dragGrab(src, dst)`** — visual drag, no real HTML5 drag event. The ghost is a clone of `src`, tilted, scaled, animated to `dst`. Used for sidebar→canvas field-add beats.
- **`dragFromTo(srcSel, dstSel)`** — same shape, semantic wrapper.

```js
await cursor.dragGrab(sel.fieldButton, sel.canvasDropZone, {
  wait: 850,
  rotate: 6,        // ghost tilts 6deg during transit
  ghostMaxPx: 220,  // cap clone width so scaled clones don't overflow
});
```

The `revealAt` + `reveal` + `revealDisplay` pattern in chapter beat objects (see `videos/a-complete-guide-to-the-checkboxes-field/chapters/add-checkboxes-field.js`) reveals the actual field in the canvas at a fraction-through-drag point, simulating the drop.

## Typing

`cursor.typeInto(sel, text, { cps, clear })` is highlight + click + typewriter:

- `cps: 18` (chars per second) is the default; reads natural.
- `clear: true` clears the input first.
- Typing dispatches per-keystroke `input` events so any product-truth listeners fire (search filters, autocompletes, etc.).
- Each keystroke plays the type SFX; turn off with `audio: false` if SFX would interfere.

For long inputs (>30 chars), split into beats with mid-pauses or use a `parallel` mode chapter so the typing doesn't drag the narration.

## Common mistakes

| Mistake | Fix |
|---|---|
| Cursor teleports to target (no `moveTo` before `click`) | Always `glideTo` then `click`, never bare `click` mid-flight |
| Move is straight-line across busy DOM | Use `glideTo` with `via:` waypoint |
| Click happens during narration cue, not after the listener has had time to read | Add 200-350ms settle pause after move, before click |
| Cursor visible during pure-atmospheric beats | `cursor.hide()` during ambient motion |
| Multiple `cursor.moveTo` calls in a row with no narration coverage | Either `glideTo` with one waypoint, or use a single beat with multiple `await sleep()` accents |
| Drag ghost is hidden because `hideCursor: true` was set | The drag itself replaces the cursor with the ghost; `hideCursor` is only for the cursor returning post-drag |

## See also

- `videos/_shared/kit.js` — `cursor.glideTo`, `cursor.parkAt`, etc.
- `engine/interactions.js` — full semantic-cursor source.
- `engine/engine.js` — primitive cursor methods (`park`, `moveTo`, `click`, `dragGrab`).
- `wpforms-video` skill — cursor as a beat-level rule (chapter feel like a tutorial vs slide).
- `wpforms-postintro` skill — cursor handoff at postIntro→chapter boundary.
