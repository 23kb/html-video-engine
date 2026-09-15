// videos/_shared/effects/_determinism.js
//
// INV-9 helpers for the effects library: a seeded PRNG and a finite repeat
// count. Mirrors `mulberry32` / `boundedRepeats` in
// videos/_shared/motion-primitives.js bit-for-bit — duplicated here for the
// same reason motion-primitives duplicates them from kit.js: the effects
// library has zero dependencies outside `effects/`, so a pure-editorial film
// can import one small module instead of the tutorial-weight primitives file.
//
// Canonical source: videos/_shared/motion-primitives.js:46 (boundedRepeats)
// and :58 (mulberry32). If those change, change these to match.
//
// Verified equivalent: motion-primitives keeps its accumulator signed (`| 0`)
// while some video-local copies keep it unsigned (`>>> 0`); every downstream
// operation is bitwise / Math.imul, which read the same 32 bits either way, so
// both spellings emit the identical sequence for a given seed.

/**
 * Finite GSAP `repeat:` count for a looping tween — never `repeat: -1`
 * (INV-9: an infinite repeat cannot be frame-stepped by a seek render).
 * Yoyo callers pass HALF the cycle (rulebook sfb 9).
 *
 * @param {number} cycleDuration — seconds per cycle
 * @param {number} visibleDuration — total seconds the loop is on-screen
 * @returns {number} GSAP `repeat:` value (total plays = repeat + 1)
 */
export function boundedRepeats(cycleDuration, visibleDuration) {
  if (!(cycleDuration > 0) || !(visibleDuration > 0)) return 0;
  return Math.max(0, Math.ceil(visibleDuration / cycleDuration) - 1);
}

/**
 * Mulberry32 PRNG factory — seeded and deterministic, so every render of a
 * scattered/jittered effect is byte-identical. Never `Math.random()`.
 *
 * @param {number} seed
 * @returns {() => number} next() in [0, 1)
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
