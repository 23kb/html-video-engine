// videos/_shared/effects/seams.js
//
// SEAM RECIPES — the five named scene-to-scene cut grammars, as timeline
// composers. All five are hard cuts disguised by matched motion: exit velocity
// ≈ entry velocity at the cut instant, which is exactly what
// `tools/seam-gate.js` measures.
//
// Source: docs/hyperframes-seam-grammar-rnd-2026-09-03.md §2.1–§2.5 (verbatim
// constants, kept as the defaults below). Proven video-local in
// the ad-vocabulary proving reel (5 cuts, seam-gate PASS with zero flags,
// motion-audit tier A) and promoted here on Umair's proving-reel ruling
// (2026-09-03).
// Vocabulary slot: seam — scene-to-scene cut grammar
//
// ⚠ CONTRACT DEVIATION (documented in README.md): these are NOT mounts. They
// build no DOM and return no `{ el, tweenInto, dispose }` — a seam composes
// ACROSS two beats that already exist, so it takes `(tl, outEl, inEl, cut)` and
// writes to the master timeline at absolute position `cut`. `outEl` / `inEl`
// are whole-scene wrappers (or any GSAP target), never anything inside a scene.
//
// Two structural rules make every seam cheap (seam doc §1):
//   1. SHARED GROUND — every scene sits on the same background bed, so a throw
//      or zoom exposes identical ground on both sides and no edge flashes.
//   2. HOLD THE FINAL FRAME — end each beat with `holdFinalFrame()` so a hard
//      cut never lands on a 1-frame gap. Use it; it is a seam requirement, not
//      idle time.
//
// ⚠ seamZoomThrough animates `filter: blur()`. NEVER put it over a live-UI
// iframe — a filter on any ancestor blurs the whole raster (standing rule).
// Editorial scenes and PNG-baked states only; for an iframe scene use
// seamThrowLeft or seamLockedCrossfade instead.

/* global gsap */

/**
 * §1.2 — no-op hold that pins a beat's final frame to its exact end time, so a
 * hard cut never lands on a 1-frame gap.
 *
 * @param {gsap.core.Timeline} tl
 * @param {number} cut — absolute time the beat ends
 * @param {Object} [opts]
 * @param {number} [opts.duration=0.01]
 */
export function holdFinalFrame(tl, cut, { duration = 0.01 } = {}) {
  tl.to({}, { duration }, cut - duration);
  return tl;
}

/**
 * §2.1 — inverse zoom-through. Outbound recedes + blurs + dims fast; hard cut
 * at peak blur; inbound enters oversized and settles. Both sides move in the
 * shrinking direction, so the velocities match.
 *
 * Constants that matter: exit 0.2s power3.in, entry 0.5s expo.out (asymmetric —
 * snap out, settle in); blur peak 20px; opacity floor 0.15 on BOTH sides (never
 * 0 at the cut — the residue sells the continuity); entry scale 1.25.
 */
export function seamZoomThrough(tl, outEl, inEl, cut, {
  outScale = 0.8,
  outDuration = 0.2,
  outEase = 'power3.in',
  blur = 20,
  floor = 0.15,
  inScale = 1.25,
  inDuration = 0.5,
  inEase = 'expo.out',
} = {}) {
  tl.to(outEl, { scale: outScale, filter: `blur(${blur}px)`, duration: outDuration, ease: outEase }, cut - outDuration);
  tl.to(outEl, { opacity: floor, duration: outDuration, ease: 'none' }, cut - outDuration);
  tl.set(outEl, { opacity: 0 }, cut);
  tl.set(inEl, { opacity: floor, scale: inScale, filter: `blur(${blur}px)` }, cut);
  tl.to(inEl, { scale: 1, filter: 'blur(0px)', opacity: 1, duration: inDuration, ease: inEase }, cut);
  return tl;
}

/**
 * §2.4 — leftward cut-the-curve (the throw), MASTER half. Outbound accelerates
 * off-frame left while dimming; the hard cut lands mid-throw with the out-scene
 * still mostly on-frame, so the motion — not the disappearance — carries the eye.
 *
 * Pair with `parkThrowEntry` + `seamThrowEntry` on the entering scene's hero.
 */
export function seamThrowLeft(tl, outEl, inEl, cut, {
  xPercent = -13,
  duration = 0.26,
  ease = 'power2.in',
  fadeTo = 0.55,
} = {}) {
  tl.to(outEl, { xPercent, duration, ease }, cut - duration);
  tl.to(outEl, { opacity: fadeTo, duration, ease }, cut - duration);
  tl.set(outEl, { opacity: 0 }, cut);
  tl.set(inEl, { opacity: 1 }, cut);
  return tl;
}

/**
 * §2.4 SCENE half, park — the entering hero starts ALREADY sliding left.
 * Fixed px is safe: scene coordinates are always 1920-wide.
 * Call at build time, before the timeline runs.
 */
export function parkThrowEntry(hero, {
  x = 210,
  scale = 1.045,
  autoAlpha = 0,
  transformOrigin = '50% 50%',
} = {}) {
  gsap.set(hero, { x, autoAlpha, scale, transformOrigin });
  return hero;
}

/** §2.4 SCENE half, motion — the parked hero settles at the cut. */
export function seamThrowEntry(tl, hero, cut, {
  duration = 0.18,
  ease = 'power3.out',
} = {}) {
  tl.to(hero, { x: 0, autoAlpha: 1, scale: 1, duration, ease }, cut);
  return tl;
}

/**
 * §2.2 — position-locked crossfade. The recipe is trivial; the craft is the
 * COORDINATE CONTRACT: before authoring scene B, copy scene A's end-state
 * geometry (position, size, weight, shadow) for every element that survives the
 * cut, so only the changing content dissolves.
 *
 * A crossfade alone is invisible to the velocity gate — carry a shared element
 * across the boundary at matched speed (see the reel's frame-card rise).
 */
export function seamLockedCrossfade(tl, outEl, inEl, cut, {
  duration = 0.6,
  ease = 'power1.inOut',
} = {}) {
  tl.to(inEl, { opacity: 1, duration, ease }, cut);
  tl.to(outEl, { opacity: 0, duration, ease }, cut);
  return tl;
}

/**
 * §2.3 — pixel-matched hard cut. No blend at all: scene A's last frame is BUILT
 * to equal scene B's first frame. The code is two `set`s; the seam is the
 * geometry contract, which is a QC checklist, not a parameter:
 *   - out-scene end geometry == in-scene start geometry for every surviving
 *     element (px, radius, shadow, font weight)
 *   - cursor position identical on both sides
 *   - background identical
 *   - verify with a paused seek to `cut − 1 frame` and `cut`
 * Best practice (reel fix round): make the match hold MID-FLIGHT rather than at
 * rest — split one release across the cut so position AND velocity agree.
 */
export function seamHardCut(tl, outEl, inEl, cut) {
  tl.set(outEl, { opacity: 0 }, cut);
  tl.set(inEl, { opacity: 1 }, cut);
  return tl;
}

/**
 * The point on `from → to` where a velocity-split hands over (default ⅓).
 * @returns {{x:number, y:number}}
 */
export function splitPoint(from, to, { at = 1 / 3 } = {}) {
  return { x: from.x + (to.x - from.x) * at, y: from.y + (to.y - from.y) * at };
}

/**
 * §2.5 — cursor velocity-split handoff. ONE continuous move spans a hard cut:
 * the out-scene cursor animates the accelerating first ⅓ of the path, the
 * in-scene cursor is `set` at exactly that position and finishes the
 * decelerating remaining ⅔. The split is 1:2 in TIME (0.30s in / 0.60s out)
 * with power2.in → power2.out, so position AND velocity match at the cut.
 *
 * Pass real `Cursor` instances' `.el` (or any two matched glyphs) — this
 * composer never mounts a cursor of its own (anti-pattern #1). It exists
 * because the Cursor class's promise-based `.glide()` cannot express a split
 * ease landing on an absolute cut position; the seam doc specifies direct
 * timeline tweens here.
 *
 * @returns {{ pivot: {x:number, y:number} }}
 */
export function seamCursorVelocitySplit(tl, {
  outEl,
  inEl,
  from,
  to,
  cut,
  at = 1 / 3,
  outDuration = 0.30,
  inDuration = 0.60,
  outEase = 'power2.in',
  inEase = 'power2.out',
  reveal = 0.01,
} = {}) {
  const pivot = splitPoint(from, to, { at });
  gsap.set(inEl, { x: pivot.x, y: pivot.y });
  tl.to(outEl, { x: pivot.x, y: pivot.y, duration: outDuration, ease: outEase }, cut - outDuration);
  tl.to(inEl, { autoAlpha: 1, duration: reveal, ease: 'none' }, cut);
  tl.to(inEl, { x: to.x, y: to.y, duration: inDuration, ease: inEase }, cut);
  return { pivot };
}
