# Shared Scene

`runtime/shared-scene.js` exposes persistent scene instances for visuals that
must survive chapter teardown.

```js
import { getSharedScene, disposeSharedScene } from '/runtime/shared-scene.js';

const shared = await getSharedScene({
  id: 'video-slug:scene-name',
  mount: async (stage, gsap) => {
    return { dispose() {} };
  },
});

await disposeSharedScene('video-slug:scene-name');
```

The first `getSharedScene()` call for an id must provide `mount`. Later calls
return the existing instance. Mount long-lived canvases below chapter-local DOM
layers; chapter layers can fade above the shared scene without creating a blank
frame between chapters. Dispose at the outro or at the point where the visual
language intentionally changes.

