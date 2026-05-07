# Frame Driver

Phase B adds an opt-in frame-driven surface for editorial-layer timelines. The
iframe, camera, narration, `waitAt(t)`, descriptor verbs, and legacy
`effect()` timing remain wall-clock driven.

## Contract

Frame adapters expose:

```js
{
  id: 'chapter-local-id',
  duration: 1.2,       // seconds
  seek(t) {},          // deterministic, idempotent
  destroy() {},
}
```

`runtime/frame-adapter.js` ships:

- `gsapTimelineAdapter(tl, { id, context })` for paused GSAP timelines.
  `seek(t)` calls `tl.seek(t, false)`, so GSAP callbacks/events fire. Any
  callback that mutates DOM must be idempotent.
- `waapiAdapter(animations, { id })` for Web Animations API instances. It
  pauses animations, seeks via `currentTime`, and cancels on destroy.

TODO: add Lottie and Three.js adapters after Phase B pilots. The AI postIntro
keeps its Three.js-style independent loops on their own clock in Phase B.

## Registry

`runtime/frame-driver.js` owns `window.__hfTimelines` and an internal
`Map`. Authors do not write to the namespace directly. Video code imports
`registerTimeline()` from `videos/_shared/kit.js`.

Each registration receives its own `t0 = performance.now()` when it enters the
registry. The player can start the driver once at boot while postIntros,
chapter-local beats, and later editorial sequences anchor independently.

## Tick Loop

The driver prefers `requestAnimationFrame` while the document is visible. It
switches to `setTimeout(..., 16)` when:

- `document.visibilityState !== 'visible'`, or
- the previous RAF tick arrived more than 250ms late.

That fallback is the hidden-tab fix. Registered GSAP timelines no longer rely
on GSAP's RAF completing an `onComplete`; the runtime seeks them to the
wall-clock elapsed position on every driver tick.

## Worked Example

```js
import { loadGsap, registerTimeline } from '../../_shared/kit.js';

export default [
  {
    id: 'concept-beat',
    effect: async ({ sleep }) => {
      const gsap = await loadGsap();
      const tl = gsap.timeline({ paused: true });
      tl.to('.editorial-card', { opacity: 1, y: 0, duration: 0.45 });
      tl.to('.editorial-card', { scale: 1.04, duration: 0.25 });
      registerTimeline(tl, { id: 'my-video:concept-beat' });
      await sleep(tl.duration() * 1000);
    },
  },
];
```

The `creating-first-form` pilot registers one invisible editorial timeline in
`cff-chapter-1-7` to prove the author API round-trips without changing the
visible descriptor scroll. The `build-forms-faster-with-wpforms-ai` pilot
uses the same registration path for the GSAP sequences inside
`runtime/cinematic-rough-thought-to-draft.js`.

## Cleanup

The player and descriptor runner clear the registry after postIntro and after
each chapter/descriptor teardown. With `?debug=1`, teardown also warns if the
registry is non-empty after clearing.

## Lessons From The AI PostIntro

The AI postIntro surfaced the expected Phase B boundary: typed text and
narration remain wall-clock, while GSAP-only motion can register through the
driver. This keeps the existing cadence intact without pretending that
DOM-typing side effects are deterministic seekable animation yet. A later
phase can promote typed text to an adapter if scrub-preview needs it.
