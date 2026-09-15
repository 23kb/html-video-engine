# Preview / static serving

`node serve.js` is the plain static server on port 4321 — the review URL for
any film is simply:

```
http://localhost:4321/videos/<slug>/index.html
```

`npm run dev` / `npm run preview` start `tools/preview.js`, which wraps the
same server with live reload. The old pause/seek scrubber UI belonged to the
retired engine player and was removed on 2026-08-22; films are reviewed by
playing the page directly, and timing work goes through the instrumentation
globals (`__tl/__T0/__sched/__done/__dur`) plus:

- `node tools/storyboard-sheet.js <slug>` — pre-render stills at beat marks
- `node tools/smoke-singlehtml.js <slug> --seconds <n>` — headless playback check
- `node tools/seam-gate.js <slug>` — exit/entry velocity at cuts
- `node tools/dead-time.js <slug>` — full-track idle-motion scan

Headless tools (`smoke-singlehtml`, `seam-gate`, `dead-time`) hold an advisory
lock and refuse to run concurrently — a timing failure is re-run alone before
it is believed.
