# Preview Server

`tools/preview.js` is the authoring server for live reload and scrubber work.

```bash
node tools/preview.js
node tools/preview.js --video _phase-c-editorial-pilot
node tools/preview.js --port 5173
node tools/preview.js --no-open
```

`node serve.js` remains the plain static server on port 4321. `npm run dev` and `npm run preview` use `tools/preview.js`, which adds live reload and the real pause/seek scrubber.

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

- pause/resume controls;
- chapter prev, next, and restart controls;
- current chapter index and chapter list;
- wall-clock cursor, read-only;
- active `window.__hfTimelines.registry` entries;
- click-to-seek on registered timeline rows.

This is a custom timeline-bar rather than GSDevTools. It matches the repo's hybrid timing model: tutorial playback seeks at chapter boundaries, while registered editorial timelines are seekable within their own adapter windows.

## Limitations

- Wall-clock tutorial segments cannot be scrubbed mid-chapter.
- Chapter seek restarts at the target chapter's first beat.
- Registered timelines can be seeked, and resume continues from the selected adapter time.
- Pause/resume is owned by `runtime/pause-manager.js`; see `docs/pause-manager.md`.
