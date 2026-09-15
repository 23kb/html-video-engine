// videos/_shared/effects/wash-transition.js
//
// WASH TRANSITION — the whiteout beat-to-beat cut for await-driven (tutorial
// path) films: the outgoing set flies out on one axis, a veil blooms to a full
// whiteout for roughly one blank tile, then the incoming set flies in from the
// opposite side as the veil clears. Axis-configurable so consecutive washes
// vary (y, then x) instead of reading as the same wipe twice.
//
// Source: videos/reel-tutorial-craft/index.html w1/w2 (tutorial-craft proving
// reel, 2026-09-03 — motion-audit tier A). Reference bar it was built to:
// reference/New folder/_extraction/_analysis/analysis-postintro.md rec #3
// ("elements fly out, ~1 blank tile, next set flies in").
// Vocabulary slot: seam — whiteout wash between editorial beats
//
// ⚠ CONTRACT DEVIATION (documented in README.md): `washTransition` is NOT a
// mount. It is an async transition composer over two groups that already exist,
// and it returns a Promise so an await-driven `play()` can sequence on it.
// `mountWashVeil` IS a mount, but a bare one: a veil has no `tweenInto` of its
// own — the wash drives it.
//
// The shared ground both sides sit on is the FILM's (seam doc §1.1). The veil
// is the transition; it is not the background. Mount it as the last child of
// the surface that holds both groups so it covers them and nothing else.
//
// Uses `whipSettle` for the incoming fly-in — call `registerXaiEases()` from
// videos/_shared/effects/xai-eases.js first, or pass your own `inEase`.

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId } from './_utils.js';

const SCOPE = 'fx-wash-veil';

/**
 * The whiteout plate. Parked hidden; the wash owns its opacity.
 *
 * @param {HTMLElement} parent — the surface holding both groups; the veil is
 *        appended last so it covers them.
 * @param {Object} [opts]
 * @param {string} [opts.color='#ffffff']
 * @param {number} [opts.zIndex=90]
 * @returns {{ el: HTMLElement, dispose: Function }}
 */
export function mountWashVeil(parent, { color = '#ffffff', zIndex = 90 } = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, `
    #${id}.${SCOPE} { position: absolute; inset: 0; background: ${color};
      opacity: 0; visibility: hidden; z-index: ${zIndex}; pointer-events: none; }
  `);
  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  if (parent) parent.appendChild(el);
  const refs = { el, style };
  return { el, dispose() { disposeEffect(refs); } };
}

/**
 * Run one wash. Resolves after `hold` seconds, so an await-driven film can
 * simply `await washTransition(a, b, { veil })` between beats.
 *
 * @param {HTMLElement} outGroup — its CHILDREN fly out; the group is then hidden
 * @param {HTMLElement} inGroup — revealed, its CHILDREN fly in
 * @param {Object} opts
 * @param {HTMLElement} opts.veil — from `mountWashVeil`
 * @param {'y'|'x'} [opts.axis='y']
 * @param {number} [opts.hold=0.85] — total wall time before the promise resolves
 * @returns {Promise<gsap.core.Timeline>}
 */
export async function washTransition(outGroup, inGroup, {
  veil,
  axis = 'y',
  hold = 0.85,
  outDistance = axis === 'y' ? -52 : -64,
  inDistance = axis === 'y' ? 58 : 72,
  outDuration = 0.26,
  outEase = 'power2.in',
  outStagger = 0.035,
  veilInAt = 0.06,
  veilInDuration = 0.28,
  veilOutAt = 0.5,
  veilOutDuration = 0.3,
  hideAt = 0.38,
  inAt = 0.46,
  inDuration = 0.34,
  inEase = 'whipSettle',
  inStagger = 0.045,
} = {}) {
  const outEls = [...outGroup.children];
  const inEls = [...inGroup.children];
  const outVars = axis === 'y' ? { y: outDistance } : { x: outDistance };
  const inFrom = axis === 'y' ? { y: inDistance } : { x: inDistance };
  const inTo = axis === 'y' ? { y: 0 } : { x: 0 };

  gsap.set(inGroup, { autoAlpha: 1 });
  gsap.set(inEls, { ...inFrom, autoAlpha: 0 });

  const tl = gsap.timeline();
  tl.to(outEls, { ...outVars, autoAlpha: 0, duration: outDuration, ease: outEase, stagger: outStagger }, 0);
  if (veil) tl.to(veil, { autoAlpha: 1, duration: veilInDuration, ease: 'power1.in' }, veilInAt);
  tl.set(outGroup, { autoAlpha: 0 }, hideAt);
  // ~1 blank tile of whiteout, then the next set flies in as the veil clears
  if (veil) tl.to(veil, { autoAlpha: 0, duration: veilOutDuration, ease: 'power1.out' }, veilOutAt);
  tl.to(inEls, { ...inTo, autoAlpha: 1, duration: inDuration, ease: inEase, stagger: inStagger }, inAt);

  // GSAP-driven wait (never setTimeout in shared code — it drifts off the
  // ticker the rest of the film runs on).
  await new Promise((resolve) => { gsap.delayedCall(hold, resolve); });
  return tl;
}

/**
 * Isolated `?scene=` entry: reveal a group at its settled pose without running
 * a wash into it. Idempotent.
 */
export function unparkGroup(group) {
  gsap.set(group, { autoAlpha: 1 });
  gsap.set([...group.children], { autoAlpha: 1, x: 0, y: 0 });
  return group;
}
