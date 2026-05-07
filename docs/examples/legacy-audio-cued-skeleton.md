# Legacy Audio-Cued Skeleton

Use this when one narration clip must drive exact actions at timestamps.

```js
import sel from './_selectors.js';

export const snapshot = '<real-snapshot-slug>';
export const validator = { snapshot: '<real-snapshot-slug>' };
export const mode = 'audio-cued';
export const narration = '<chapter-narration-key>';
export const breakStyle = 'soft-dolly';
export const swapStyle = 'cover';

export default [
  {
    id: 'timestamped-flow',
    chapter: 'timestamped-flow',
    camera: { focus: sel.start, level: 1.18, pad: 14 },
    effect: async ({
      cursor,
      type,
      waitAt,
      sleep,
      highlight,
      clearHighlights,
      swapToSnapshot,
    }) => {
      await waitAt(0.6);
      await highlight([sel.start], { label: 'Start here', pad: 10 });

      await waitAt(2.3);
      await cursor.moveTo(sel.input);
      await type(sel.input, 'Example text', { clear: true });

      await waitAt(4.8);
      await clearHighlights();

      // Optional mid-effect swap, under cover.
      await waitAt(6.2);
      await swapToSnapshot('<next-real-snapshot>', {
        setup: async ({ doc }) => {
          // Seed payoff DOM under cover if grounded in product truth.
        },
      });

      await sleep(600);
    },
    duration: 0.2,
  },
];
```

Rules:

- `waitAt(t)` exists only in `mode = 'audio-cued'`.
- Use this for precise choreography, not as the default for ordinary chapters.
- Keep the narration clip manageable. If the beat naturally splits into
  shorter sentences, prefer `per-beat-narration`.

## Modern features (optional additions)

- **`swapStyle: 'flipBridge'`** is the modern preferred swap for the embedded `swapToSnapshot` example. Eliminates the cream-bleed seam from the `cover` / `morph` paths. Override the export at the top:
  ```js
  export const swapStyle = 'flipBridge';
  ```
  See `wpforms-transitions` skill.
- **Registered timelines** — for editorial choreography that should pause/seek with the scrubber, build a paused timeline and register it via `videos/_shared/kit.js registerTimeline()`. The `audio-cued` mode timestamps still drive the *narration cues*; the registered timeline handles the *visual choreography* underneath. See `wpforms-gsap-rules` skill.
- **Camera poses** — `import { registerCameraPose }` from `../../_shared/kit.js`; reference by name in the beat (`camera: 'focus'`) instead of inline `level/pad`.
- **`pausableRaf`** — required for any author RAF render loop in the chapter. See `wpforms-gsap-rules` skill.
