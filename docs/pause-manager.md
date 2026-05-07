# Pause Manager

`runtime/pause-manager.js` is the single owner for real preview pause/resume.
It coordinates:

- frame-driver registered timelines;
- the iframe camera driver;
- GSAP global timeline;
- narration and BGM audio elements registered by `scenes/shared.js`;
- document and iframe Web Animations/CSS animations;
- wall-clock sleeps through `pausableSleep(ms)`;
- chapter-boundary seek through `seekToChapter(index)`.

`pausableSleep(ms)` resolves after cumulative unpaused time. Time spent while
paused is not credited, and a chapter seek releases sleepers so the current
chapter can finish its current async boundary and restart at the requested
chapter.

## Author RAF Rule

Any author-owned RAF loop in a video chapter or cinematic must use
`pausableRaf(cb)` from `videos/_shared/kit.js`. Vanilla
`requestAnimationFrame` does not honor preview pause. `pausableRaf` skips both
update and render callbacks while paused and returns a cleanup function for
chapter teardown.

## Seek Scope

The scrubber supports chapter prev/next/restart. A seek restarts at chapter
index N from beat 0. Mid-chapter wall-clock seek is intentionally unsupported
because imperative effect bodies cannot be reconstructed at arbitrary times.

Registered frame-driver timelines remain individually seekable because their
adapters expose deterministic `seek(t)`.
