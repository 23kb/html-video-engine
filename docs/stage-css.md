# Stage CSS — Leak Surfaces and Z-Stack

Which DOM layers exist on the stage, what each one is for, when to hide what, and how to compose editorial overlays without leaking.

Recurring class of bug: an editorial postIntro or marketing-mode chapter mounts an overlay, but the cream `.mac-frame` chrome bleeds through behind, or `.mesh-bg` bleeds through the corners, or the watermark sits on top of the editorial layer. The fix is always the same — explicit CSS hides the leak surfaces. This doc names them.

## The stage z-stack (bottom to top)

| Z | Element | What it is | Mounted by |
|---|---|---|---|
| 0 | `body` | Page background | runtime |
| 1 | `.mesh-bg` | Animated colorful mesh gradient (cyan/violet/orange swirls). Visible behind the Mac frame. | `scenes/shared.js mountMeshBg()` |
| 10 | `.stage` | Centered flex container holding the iframe. Has `clip-path` for `body.with-stage-chrome`. | `engine.js loadSnapshot` |
| 20 | `iframe.ui` | The product DOM iframe (real WPForms UI snapshot). | `engine.js loadSnapshot` |
| 30 | `.overlay` | Highlight rings, labels, pointers, ripples (siblings of iframe inside `.stage`). | `engine.js loadSnapshot` |
| 50 | `.mac-frame` | Decorative outer Mac window frame (rounded corners, drop shadow). | `scene-helpers.js mountStageChrome` |
| 60 | `.mac-chrome` | Title bar with traffic-light dots + title text. | `scene-helpers.js mountStageChrome` |
| 70 | `#wpf-watermark` | "wpforms" logo top-right corner. | `scenes/shared.js mountWatermark` |
| 595 | pre-first-chapter cover | Drops once the first chapter's `setup()` returns. | `runtime/chapter-runner.js` |
| 650 | `prep-cover` | Mounted around mid-effect snapshot swaps. | `scene-helpers.js mountCover` |
| 999 | `.swap-cover` | Mounted during legacy `cover` / `morph` / `whip` swap styles. | `runtime/transitions.js mountCover` |

`flipBridge` swap does NOT mount a top-level cover; the incoming iframe crossfades over the outgoing one in-place, so chrome stays visible.

## Surface modes

`manifest.surface` controls which layers are mounted:

| Surface | mesh-bg | mac-frame | mac-chrome | watermark | iframe |
|---|---|---|---|---|---|
| `iframe` (default) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `editorial` | ✗ | ✗ | ✗ | optional | ✗ |
| `mixed` | ✓ | ✓ | ✓ | ✓ | ✓ (with editorial overlay above) |

In `editorial` mode, your stage CSS has full freedom. In `iframe` and `mixed` modes, all layers are present and you may need to hide some.

## When to hide what

### Editorial overlay above iframe (`mixed` surface or hybrid postIntro)

Default behavior: editorial overlay appended to `body` lands at z:auto (effectively above watermark depending on stack context). Usually fine.

If your overlay needs the FULL screen including corners outside the Mac frame:
```css
/* Hide just the Mac chrome around the editorial layer */
body.editorial-active .mac-frame,
body.editorial-active .mac-chrome,
body.editorial-active #wpf-watermark { display: none !important; }
```

Toggle the body class when the overlay mounts; remove on dismiss.

### Pure ad-style hero composition (`editorial` surface)

The runtime doesn't mount Mac chrome / mesh-bg in `editorial` surface, so usually nothing to hide. But if a previous chapter ran `iframe` surface and left mounts behind:

```js
// In setup({ doc }):
const css = doc.createElement('style');
css.textContent = `
  .mesh-bg, .stage, .mac-frame, .mac-chrome,
  #wpf-watermark, .watermark, iframe.ui {
    display: none !important;
  }
`;
doc.head.appendChild(css);
```

This was a real Phase 0 lesson on the REST API video (authored before `surface: 'editorial'` existed). Now that `surface: 'editorial'` is locked, this CSS is only needed for `surface: 'mixed'` work where you want to selectively hide some surfaces.

### PostIntro that shouldn't see Mac chrome

PostIntros that span the full screen (rare; most postIntros sit inside the Mac frame):

```js
async setup({ doc }) {
  const root = doc.body.appendChild(document.createElement('div'));
  root.id = 'postintro-stage';
  root.style.cssText = `
    position: fixed; inset: 0;
    z-index: 100;  // above iframe overlay (30) but below mac-frame (50)
    background: #0a0e14;
  `;
  // If you want the Mac frame hidden:
  doc.body.classList.add('postintro-fullbleed');
  const css = doc.createElement('style');
  css.textContent = `
    .postintro-fullbleed .mac-frame,
    .postintro-fullbleed .mac-chrome { display: none !important; }
  `;
  doc.head.appendChild(css);
}
```

Remove the class on dismiss.

## The pre-first-chapter cover

The runtime mounts a cover at z:595 right before the first chapter's `setup()`. The cover **drops** once `setup()` returns. This means:

- Editorial layer mounted in `setup()` → cover drops onto a fully-painted stage. ✓
- Editorial layer mounted lazily inside the first beat's `effect()` → cover drops onto a bare snapshot for ~1 frame. ✗

Lesson: paint the editorial layer in `setup()`, not in `effect()`. See `wpforms-postintro` skill "Snapshot handoff" section.

## The `body.with-stage-chrome` class

`scene-helpers.js mountStageChrome()` adds this class to `body`. It enables `clip-path` on `.stage` so highlights/labels/cursor stay inside the Mac frame visual rectangle.

If you mount editorial chrome OUTSIDE the Mac frame (e.g., a bottom caption strip below the Mac window), the clip-path will hide it. Either:

1. Mount the editorial chrome at z >= 50 (above `.mac-frame`) so it's outside the clip context.
2. Remove `body.with-stage-chrome` for the duration of the editorial beat (re-add after).

The `surface: 'editorial'` mode never adds `with-stage-chrome` — full canvas freedom.

## The cream `coverColor`

`manifest.coverColor` (default `#FAF6EF` cream / `#F4F7FB` cool-paper) is the background of swap covers. It shows during legacy `cover` / `morph` / `whip` / `fast` swaps. `flipBridge` doesn't use it; covers aren't mounted there.

If your editorial mode wants a different "between-snapshots" color, set `coverColor` in the manifest. Doesn't affect `flipBridge`.

## Common leaks (and fixes)

| Symptom | Cause | Fix |
|---|---|---|
| Cream/cool-paper "page-refresh" frame on snapshot swap | Legacy swap style (`cover` / `morph` / `whip` / `fast`) | Switch chapter to `swapStyle: 'flipBridge'` |
| Mesh-bg gradient bleeding through editorial layer corners | Mesh-bg z:1 still mounted in `iframe` surface | `manifest.surface: 'editorial'` or hide `.mesh-bg` in setup |
| Mac frame visible behind a full-screen postIntro | `.mac-frame` at z:50; postIntro layer below | Either mount postIntro at z >= 60 or hide `.mac-frame` during postIntro |
| Watermark sitting on top of editorial layer | `#wpf-watermark` at z:70 | Hide watermark for editorial beat: `#wpf-watermark { display: none }` |
| Highlight ring clipped at Mac frame edge | `body.with-stage-chrome` clip-path on `.stage` | Move target inside Mac frame, or remove class for that beat |
| Cursor cut off below the iframe | Cursor lives in `.overlay` (sibling of iframe inside `.stage`); also subject to clip | Same as above |

## See also

- `scenes/shared.js` — `mountMeshBg`, `mountWatermark` source.
- `scene-helpers.js` — `mountStageChrome`, `mountCover` source.
- `engine/engine.js loadSnapshot` — initial stage build (`.stage`, `.ui`, `.overlay`, `.cursor`).
- `wpforms-marketing` skill — `surface: 'editorial'` and `'mixed'` mechanics.
- `wpforms-transitions` skill — swap styles, when chrome stays vs hides.
- `analysis-quality-and-transitions.md` §1.2 — the REST API "PowerPoint" leak lesson.
