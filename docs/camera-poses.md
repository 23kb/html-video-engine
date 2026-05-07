# Camera Poses

Phase C adds a small named-pose registry for iframe camera moves.

```js
import { registerCameraPose } from '../../_shared/kit.js';

registerCameraPose('focus', { focus: sel.field, level: 1.18, pad: 14 });
registerCameraPose('station', { focus: sel.section, level: 1.05, pad: 24 });
registerCameraPose('overview', { focus: 'body', level: 1, pad: 0 });
```

Legacy beats may then use `camera: 'focus'`. The runtime resolves the name to
the same camera object accepted before Phase C, so existing camera options stay
valid. The seed vocabulary is:

- `focus`: tight element focus.
- `station`: a stable chapter-content pose.
- `overview`: full-surface context.

The iframe transform is now applied through a single engine camera helper.
Non-smooth moves become zero-duration transforms rather than a temporary
scale-1 reset, which removes the old one-frame camera jolt.

