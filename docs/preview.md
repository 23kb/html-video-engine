# Phase E Preview Server

`tools/preview.js` is the authoring server for live reload and scrubber work.

```bash
node tools/preview.js
node tools/preview.js --video _phase-c-editorial-pilot
node tools/preview.js --port 5173
node tools/preview.js --no-open
```

`node serve.js` remains the plain static server on port 4321. `npm run dev` and `npm run preview` use `tools/preview.js`, which adds live reload and the scrubber.

## Live Reload

Preview mode composes with `serve.js` and injects a small client script into served HTML. Direct `serve.js` access does not inject anything.

Watched paths:

- `videos/`
- `runtime/`
- `engine/`
- `scenes/`
- `videos/_shared/`
- `vendor/gsap/`

Changes are debounced and broadcast over `/__preview-ws`. Connected player pages log the reload and refresh.

## Scrubber

Open:

```text
http://localhost:4321/scrubber?video=<slug>
```

The scrubber embeds the player and listens through `BroadcastChannel`. It shows:

- wall-clock cursor, read-only;
- active `window.__hfTimelines.registry` entries;
- click-to-seek on registered timeline rows.

This is a custom timeline-bar rather than GSDevTools. It matches the repo's hybrid timing model: tutorial playback is wall-clock, while registered editorial timelines are seekable. GSDevTools remains a good follow-up for per-beat tuning when an author asks for it, but it is not shipped as the default Phase E control.

## Limitations

- Wall-clock tutorial segments cannot be scrubbed deterministically.
- Registered timelines can be seeked, but the runtime driver may continue advancing them after a click.
- Camera poses and iframe camera transitions are not interpolatable timeline segments yet; routing camera movement through the frame driver is out of Phase E scope.
