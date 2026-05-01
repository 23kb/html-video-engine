# Legacy PostIntro Effect Skeleton

Default copy target when the postIntro needs a real topic-specific concept beat.

This is a video-local legacy chapter, normally listed first in
`manifest.chapters`. It does not require a new runtime module and should not be
reduced to a second title card.

## Multi-animation rule (mandatory)

PostIntros are **never single-beat**. The canonical references
(`runtime/cinematic-rough-thought-to-draft.js`,
`runtime/cinematic-one-answer-enough.js`, the Notifications form-to-inbox
teaser) all run **8–15 seconds with at least 5 distinct animation phases**.

A new postIntro must:

- Hit **≥ 5 distinct animation phases** (mount, primary morph, payoff,
  secondary morph or label reveal, exit/handoff). A single fade-in followed
  by a fade-out is not a postIntro.
- Run **8–15 seconds total**, including narration.
- Choreograph at least **one cursor or pointer interaction** with the
  editorial DOM (click, hover, drag, type) so it does not feel like a slide.
- End by **handing off into the first content chapter** — fade into the real
  snapshot, dive-zoom into a captured element, or hand the cursor to a
  product-truth control. Do not just `.remove()` the layer onto a bare
  snapshot (this causes a visible flash; see "Snapshot handoff" below).

If the approved concept genuinely needs more time, go up to ~18 s; if the
concept is unusually simple, the floor is still 8 s.

## Snapshot handoff

A postIntro chapter declares `snapshot: '<base>'` so the runtime preloads
that iframe behind the editorial layer. When the layer dismisses, the bare
snapshot is exposed. **Do not `.remove()` the layer abruptly onto a bare
snapshot.** Instead:

1. Mount the editorial layer in `setup()` (which runs under the boot cover).
2. Run the multi-phase animation in the chapter's beat `effect()`.
3. End the final phase by easing the layer's opacity to 0 over 300–500 ms,
   ideally over a UI element the next chapter will focus (a dive into the
   target).
4. Then `.remove()` the layer.

The runtime mounts a pre-first-chapter cover for chapter-mode postIntros and
drops it once the chapter's `setup()` completes — so the editorial layer
must be painted by the end of `setup()`, not lazily inside `effect()`.

## Skeleton

```js
export const snapshot = '<real-base-snapshot>';
export const validator = { snapshot: '<real-base-snapshot>' };
export const mode = 'per-beat-narration';
export const breakStyle = 'glide';
export const swapStyle = 'morph';

let layer = null;

function installPostIntroStyle(doc) {
  if (doc.getElementById('postintro-style')) return;
  const style = doc.createElement('style');
  style.id = 'postintro-style';
  style.textContent = `
    /* Editorial CSS for the postIntro layer.
       Define the phases as toggleable classes on .postintro-layer:
         .is-mounted, .is-phase-1, .is-phase-2, .is-phase-3,
         .is-payoff, .is-handoff
       Each phase changes transform / opacity / clip / colors so the
       beat animation is choreographed in CSS, not in effect(). */
  `;
  doc.head.appendChild(style);
}

function mountPostIntro(doc) {
  const root = doc.createElement('div');
  root.className = 'postintro-layer';
  root.innerHTML = `<!-- editorial DOM (cards, table, cursor) -->`;
  doc.body.appendChild(root);
  return root;
}

export async function setup({ doc }) {
  // Mount the layer NOW (under the pre-first-chapter cover) so the cover
  // can drop onto a fully-painted editorial layer.
  installPostIntroStyle(doc);
  layer = mountPostIntro(doc);
  layer.classList.add('is-mounted');
}

export default [
  {
    id: 'postintro-build',
    chapter: 'postintro',
    camera: { focus: 'body', level: 1, pad: 0, noScroll: true },
    narration: 'postintro-build',
    effect: async ({ sleep }) => {
      // PHASE 1 — establish (≈1.4 s)
      await sleep(1400);

      // PHASE 2 — primary motion (≈2.0 s)
      layer.classList.add('is-phase-1');
      await sleep(2000);

      // PHASE 3 — secondary morph / payoff (≈2.5 s)
      layer.classList.add('is-phase-2');
      await sleep(2500);

      // PHASE 4 — interaction beat (cursor click / hover) (≈2.0 s)
      layer.classList.add('is-phase-3');
      await sleep(2000);

      // PHASE 5 — handoff dive (≈2.0 s)
      layer.classList.add('is-handoff');
      await sleep(1600);

      // Cleanup — fade to 0 then remove. Total ≈ 11.5 s.
      layer.style.transition = 'opacity 360ms ease';
      layer.style.opacity = '0';
      await sleep(380);
      layer.remove();
      layer = null;
    },
    duration: 0.2,
  },
];
```

Rules:

- Replace placeholder copy and visuals with the approved postIntro concept.
- Product-looking UI must be cloned from real captured DOM or product-truth
  snippets. Editorial cards/arrows/counters are allowed when clearly staged.
- Keep the CSS and DOM video-local unless the user approves a reusable runtime
  cinematic.
- Do not use this as a generic title card.
- Multi-animation rule is mandatory (see top of file). The validator does not
  enforce it, but the user will reject postIntros that feel like a single
  fade-in.
