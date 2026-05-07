# GSAP Discipline (L0)

Universal rules. Apply regardless of authoring mode, surface mode, or
storyboard. These are correctness/perf rules - the equivalent of "don't write
SQL injection." They are not style choices.

## Layer separation

- Prompts / storyboards = intent ("what moves, with which plugin, what
  atmospheric layer")
- This rulebook = discipline ("how - autoAlpha not opacity, single timeline,
  transforms only")
- Ease vocabulary (below) = parameters ("entrance? use back.out. Ambient? use
  sine.inOut.")

Don't redefine discipline in prompts. Don't override intent in rules.

## The seven rules

### 1. One `gsap.timeline()` per beat group

Position params give frame-accurate sequencing. `await`/`sleep` chains drift on
slow frames and cannot seek/scrub.

Correct:

```js
// videos/_shared/atmospheric.js:94-100
tweenInto(tl, { duration = 4, ease = 'sine.inOut', position = 0 } = {}) {
  return tl.fromTo(
    layer,
    { xPercent: -100 },
    { xPercent: 100, duration, ease },
    position
  );
}
```

```js
// videos/build-forms-faster-with-wpforms-ai/chapters/scene-1-hook.js:128-140
const tl = gsap.timeline();
tl.to(frags, {
  y: 0, opacity: 1, scale: 1,
  duration: 1.0, ease: 'power3.out', stagger: 0.07,
}, 0);
tl.to(s1.chars, {
  y: 0, opacity: 1, filter: 'blur(0px)',
  duration: 0.65, ease: 'expo.out', stagger: 0.022,
}, 0.18);
```

Wrong:

```js
await new Promise(r => gsap.to(el, { x: 100, onComplete: r }));
```

GSAP docs: https://gsap.com/docs/v3/GSAP/Timeline

### 2. `autoAlpha`, not `opacity`

`autoAlpha` sets `visibility: hidden` at 0. That removes hidden elements from
hit-testing and avoids leaving invisible interactive layers alive.

Correct shape for new show/hide tweens:

```js
gsap.to(el, { autoAlpha: 0, duration: 0.3 });
```

Wrong:

```js
gsap.to(el, { opacity: 0, duration: 0.3 });
```

Audit note: the L0 rule is canonical, but current reviewed examples still use
`opacity` in several show/hide paths. Do not copy those lines for new
visibility toggles. Treat them as legacy code to improve when touched, not as
an alternate contract.

### 3. Animate transform / opacity / filter / SVG attrs only

`width`, `height`, `top`, and `left` trigger layout. Transforms run on the
compositor. `filter` is allowed: it can trigger paint, but not full layout.
SVG attributes are allowed for path and stroke choreography.

Correct:

```js
// videos/_shared/atmospheric.js:139-142
tweenInto(tl, { duration = 6, ease = 'sine.inOut', position = 0 } = {}) {
  tl.to(layerBack, { scale: backScale.to, y: backY.to, duration, ease }, position);
  tl.to(layerFront, { scale: frontScale.to, y: frontY.to, duration, ease }, position);
  return tl;
}
```

```js
// videos/build-forms-faster-with-wpforms-ai/chapters/scene-9-final-payoff.js:448-459
tl.to(browserWrap, {
  y: 0, opacity: 1, scale: 1, filter: 'blur(0px)',
  duration: 0.72, ease: 'expo.out',
}, 0.20);
tl.to(formElements, {
  y: 0, opacity: 1, filter: 'blur(0px)',
  duration: 0.34, ease: 'power3.out', stagger: 0.052,
}, 0.62);
```

Wrong:

```js
gsap.to(el, { width: '60%', top: 200 });
```

Architecture note: `runtime/cinematic-rough-thought-to-draft.js:439-446`
currently morphs `width`, `minHeight`, `borderRadius`, and `padding` inside a
timeline. That is a proven cinematic implementation, but it is not a new
chapter-authoring contract. New work should use transform/filter/SVG motion or
raise a specific architecture question.

### 4. `clearProps: 'all'` at end of tweens that leave inline transforms

GSAP writes inline transform values while tweening. If a temporary tween should
return control to CSS, clear the inline props at the end; otherwise later CSS
rules can lose to stale inline styles.

Correct:

```js
// videos/build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js:205-208
gsap.set(captionPop, {
  filter: 'drop-shadow(0 18px 30px rgba(26,34,56,0.10))',
  clearProps: 'x,y,rotation',
});
```

Skip `clearProps` when the tween's end-state is the desired final state for
the rest of the chapter. That is common in this repo: `mountSweep.tweenInto()`,
`mountParallaxPair.tweenInto()`, and `mountTextReveal().tweenInto()` all leave
their final frame on screen until dispose.

### 5. Function-based stagger for >=5 elements

A for-loop of N timelines is N timeline objects on the ticker. One stagger
tween is one tween with built-in `each`/`from`/`grid` math.

Correct:

```js
// videos/_shared/text-kit.js:75-82
const total = duration ?? (spec.duration + (spec.split ? Math.max(0, targets.length - 1) * stagger : 0));
if (spec.split) {
  const each = Math.max(0.001, total - Math.max(0, targets.length - 1) * stagger);
  return tl.to(targets, {
    yPercent: 0,
    ...(spec.opacityTo != null ? { opacity: spec.opacityTo } : {}),
    duration: each, ease: spec.ease, stagger,
  }, at);
}
```

```js
// runtime/cinematic-one-answer-enough.js:326-332
await new Promise((resolve) => gsap.timeline({ onComplete: resolve })
  .to(cue, { opacity: 0, y: 8, duration: 0.18, ease: 'power2.in' }, 0)
  .to(wave, { opacity: 0.42, scale: 1.06, duration: 0.42, ease: 'power2.out' }, 0)
  .to(wave, { opacity: 0, scale: 1.12, duration: 0.34, ease: 'power2.in' }, 0.36)
  .fromTo(root.querySelectorAll('.oae-option .mark'), { scale: 0.72, rotate: -12 }, {
    scale: 1, rotate: 0, duration: 0.44, ease: 'back.out(2.3)', stagger: 0.035,
  }, 0.06)
);
```

Wrong:

```js
els.forEach((el, i) => gsap.to(el, { y: 0, delay: i * 0.04 }));
```

### 6. Pin GSAP version in loaders

Floating `@3` means the deploy that worked yesterday can silently change
tomorrow. Vendor or pin.

Correct:

```js
// videos/_shared/kit.js
const s = document.createElement('script');
s.src = '/vendor/gsap/3.15.0/gsap.min.js';
s.onload = () => resolve(window.gsap);
```

Repo status: vendored at `vendor/gsap/3.12.5/` with GSAP core, Flip, and
MotionPathPlugin, and at `vendor/gsap/3.15.0/` with core plus the Phase A
free-plugin set: Flip, MotionPathPlugin, SplitText, MorphSVGPlugin,
DrawSVGPlugin, CustomEase, GSDevTools, and MotionPathHelper. New shared
authoring code loads from `3.15.0`.

Wrong:

```js
import 'gsap@3';
```

### 7. Finite repeat counts

`repeat: -1` keeps the ticker hot forever. Chapter dispose should clean up, but
the forensic source of warm pages is often a forgotten infinite repeat.

Correct:

```js
// runtime/cinematic-rough-thought-to-draft.js:493
gsap.to(dots, { opacity: 1, y: -4, duration: 0.32, ease: 'sine.inOut', stagger: 0.12, repeat: 2, yoyo: true });
```

```js
// runtime/cinematic-one-answer-enough.js:313-317
await new Promise((resolve) => gsap.timeline({ onComplete: resolve })
  .to(cue, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0)
  .to(form, { x: -8, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 0)
  .to(option('Billing issue'), { x: -5, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 0)
);
```

Wrong:

```js
gsap.to(el, { rotation: 360, repeat: -1, duration: 1 });
```

Need a long pulse? Use a finite count larger than the chapter's max possible
duration.

## GSAP core trio

### timeline

Single master timeline per beat group, sequenced with position params:
`'<'`, `'>-0.1'`, `0.3`.

See `videos/_shared/atmospheric.js:94-100` and
`videos/_shared/atmospheric.js:139-142` for the canonical helper pattern:
helpers add tweens to the caller's master timeline at a specified position;
helpers never own their own playhead.

### context

`gsap.context(() => { ... }, scope)` gives scoped cleanup. One `.revert()` call
kills all tweens created in the scope. This is useful for chapter `effect()`
cleanup at beat-end / chapter swap. Today cleanup is usually implicit or
manual, such as `gsap.killTweensOf(target)` in
`videos/_shared/atmospheric.js:163` and `videos/_shared/text-kit.js:90`.

Docs: https://gsap.com/docs/v3/GSAP/gsap.context/

### registerEffect

`gsap.registerEffect({ name, effect, defaults })` defines reusable named effects
such as `highlightPulse`, `fieldBurst`, or `labelReveal` once, then calls them
by name across videos. This replaces copy-pasted morph code. Document standard
effects in this file once vocabulary stabilizes.

Docs: https://gsap.com/docs/v3/GSAP/gsap.registerEffect/

`gsap.utils` has `clamp`, `mapRange`, `snap`, `random`, `interpolate`, `pipe`,
`wrap`, and `splitColor`. Use those instead of hand-rolled equivalents when
procedural motion needs them.

## Ease vocabulary by motion type

| Motion type       | Ease                            | Use for                                |
| ----------------- | ------------------------------- | -------------------------------------- |
| Entrance          | `back.out(1.4)`                 | Bouncy/playful arrivals                |
| Entrance          | `expo.out`                      | Sharp, decisive arrivals               |
| Entrance          | `power3.out`                    | Smooth, neutral arrivals               |
| Ambient/breathing | `sine.inOut`                    | Loops, breathing scale, parallax drift |
| Pulse             | `sine.inOut` + `yoyo: true` + `repeat: 1` | One-shot attention pulse      |
| Exit              | `power2.in`                     | Acceleration into off-screen           |
| Exit              | `filter: blur(20-30px)`         | Optional velocity-matched blur out     |

Don't override these in prompts unless the storyboard explicitly calls for
non-standard motion. Handle one-off motion inline in the chapter, not by
rewriting the rulebook.

## Hard rules

- This rulebook codifies existing practice: atmospheric/text/lottie kits and
  build-forms-faster patterns. It does not introduce new authoring contracts or
  new APIs.
- If a proposed rule has no existing chapter or helper precedent, stop. That is
  a proposal, not documentation. Surface it as an architectural question.
- Use real codebase examples when reviewing. Do not invent toy examples as
  evidence that a pattern is production-ready.
- Do not use descriptor mode, `sleep()`, or one-off promises to weaken approved
  GSAP choreography that needs a timeline.

## Status of L0 enforcement in this repo

None of these rules is currently checked by `tools/validate-video.js`. The
rulebook is documentation, not gating. Authors and reviewers enforce it by
reading. Future enhancement: a small lint rule for common violations
(`opacity`-for-show/hide, `repeat: -1`) could land if violations accumulate.

## Phase A Patterns

### `awaitTween(tweenOrTimeline, { duration, fallbackMs })`

Use `awaitTween()` from `videos/_shared/kit.js` when chapter code must wait for
a GSAP tween/timeline but cannot rely on RAF-driven `onComplete`. Hidden tabs
and headless smoke tests may throttle RAF heavily enough that `onComplete`
never fires. `awaitTween()` resolves from the tween's expected duration plus a
small fallback buffer using `setTimeout`, matching the hidden-tab issue called
out in `analysis-quality-and-transitions.md` §2.5.

### `withGsapContext(fn, scope)`

Use `withGsapContext()` from `videos/_shared/kit.js` when an effect mounts
temporary animation state that should be cleanly reverted at beat end or
chapter swap. It wraps `gsap.context(fn, scope)` and returns `{ ctx, revert }`
so chapter-local code can keep cleanup ergonomics consistent.

### Shared `registerEffect` Library

Import `videos/_shared/effects.js` to register the Phase A shared effect
vocabulary. Existing videos are not migrated in Phase A; these effects are for
new or intentionally touched authoring surfaces.

- `highlightPulse(target, opts)` - quick transform/filter attention pulse.
- `fieldBurst(target, opts)` - finite radial particle burst with no leftover DOM.
- `labelReveal(target, opts)` - SplitText-backed character cascade.
- `popOutTilt(target, opts)` - in-place lift/tilt emphasis for a target element.
- `cardReflow(targets, opts)` - Flip-backed layout reflow after DOM mutation.
