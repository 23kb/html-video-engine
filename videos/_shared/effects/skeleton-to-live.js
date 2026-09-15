// videos/_shared/effects/skeleton-to-live.js
//
// SKELETON → LIVE FILL — the loading-placeholder idiom, played as a beat: grey
// skeleton bars sit where content will be, a sheen wipes across them, then each
// bar dissolves and the real field materializes IN PLACE on the same
// coordinates. The point is that nothing jumps: skeleton geometry and live
// geometry are authored as one coordinate set.
//
// Source: promoted from the ad-vocabulary proving reel, beat b3
// (2026-09-03 — motion-audit tier A, seam-gate PASS).
// Vocabulary slot: surface — skeleton resolves into real content
//
// The mount is a CONTENT LAYER (`position: absolute; inset: 0`), not a card:
// drop it inside whatever frame the film already owns. That keeps the frame's
// geometry the film's own §2.2/§2.3 coordinate contract — the shared card that
// carries continuity across a locked crossfade or a pixel-matched hard cut —
// while the effect only owns what is inside it.
//
// Ground: DARK (bars are cream at 0.10 alpha on an ink bed); restyle the
// --fx-sk-* vars for a light bed. Font is inherited on purpose.

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-skeleton-to-live';

function css(id, shimmerWidth, shimmerHeight, shimmerAlpha) {
  return `
    #${id}.${SCOPE} { position: absolute; inset: 0; }
    #${id} .sk-bar { position: absolute; border-radius: 8px;
      background: var(--fx-sk-bar, rgba(244, 236, 217, 0.10)); will-change: opacity; }
    #${id} .lv { position: absolute; opacity: 0; will-change: transform, opacity; }
    #${id} .lv-title { font-size: 40px; font-weight: 800; color: var(--fx-sk-ink, #f4ecd9); }
    #${id} .lv-label { font-size: 22px; font-weight: 600; color: var(--fx-sk-ink-soft, #d9d2c0); }
    #${id} .lv-input { border-radius: 10px; background: var(--fx-sk-input, #0b1018);
      border: 1px solid var(--fx-sk-input-line, rgba(244, 236, 217, 0.16)); }
    #${id} .lv-btn { border-radius: 12px; background: var(--fx-sk-accent, #E27730); color: #fff;
      font-size: 24px; font-weight: 800; display: flex; align-items: center;
      justify-content: center; }
    #${id} .sk-shimmer { position: absolute; top: 0; left: 0;
      width: ${shimmerWidth}px; height: ${shimmerHeight}px;
      background: linear-gradient(105deg, rgba(244,236,217,0) 0%,
        rgba(244, 236, 217, ${shimmerAlpha}) 45%, rgba(244,236,217,0) 100%);
      opacity: 0; will-change: transform, opacity; }
  `;
}

/**
 * @param {Object} opts
 * @param {number} [opts.width=880] — host frame width (drives the sheen travel)
 * @param {number} [opts.height=520] — host frame height (the sheen strip's height)
 * @param {Array<[number,number,number,number]>} [opts.skeleton] — [x, y, w, h] per bar
 * @param {Array<[string,number,number,number,number,string]>} [opts.live]
 *        — [className, x, y, w, h, text] per live element, index-matched to `skeleton`
 * @param {string[]} [opts.autoHeight=['lv-title','lv-label']] — classes whose
 *        height comes from their own line box, so `h` is ignored
 * @param {number} [opts.rise=10] — px the live element travels up as it lands
 * @param {number} [opts.shimmerWidth=260]
 * @param {number} [opts.shimmerAlpha=0.10]
 * @param {string} [opts.accent='orange'] — the submit button
 * @returns {{ el, skeletonEls, liveEls, tweenInto, shimmerSweep, dispose }}
 */
export function mountSkeletonToLive({
  width = 880,
  height = 520,
  skeleton = [
    [70, 58, 340, 44], [70, 140, 150, 24], [70, 176, 740, 58],
    [70, 268, 190, 24], [70, 304, 740, 58], [70, 402, 250, 60],
  ],
  live = [
    ['lv-title', 70, 52, 500, 52, 'Contact us'],
    ['lv-label', 70, 138, 200, 28, 'Name'],
    ['lv-input', 70, 176, 740, 58, ''],
    ['lv-label', 70, 266, 200, 28, 'Email address'],
    ['lv-input', 70, 304, 740, 58, ''],
    ['lv-btn', 70, 398, 250, 64, 'Send message'],
  ],
  autoHeight = ['lv-title', 'lv-label'],
  rise = 10,
  shimmerWidth = 260,
  shimmerAlpha = 0.10,
  accent = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, shimmerWidth, height, shimmerAlpha));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  if (accent) el.style.setProperty('--fx-sk-accent', resolveColor(accent));

  const skHost = document.createElement('div');
  skHost.className = 'sk-layer';
  const skeletonEls = skeleton.map(([x, y, w, h]) => {
    const b = document.createElement('div');
    b.className = 'sk-bar';
    b.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    skHost.appendChild(b);
    return b;
  });

  const lvHost = document.createElement('div');
  lvHost.className = 'lv-layer';
  const liveEls = live.map(([cls, x, y, w, h, text]) => {
    const node = document.createElement('div');
    node.className = 'lv ' + cls;
    node.style.cssText = `left:${x}px;top:${y}px;width:${w}px;` +
      (autoHeight.includes(cls) ? '' : `height:${h}px;`);
    node.textContent = text;
    lvHost.appendChild(node);
    return node;
  });

  const shimmer = document.createElement('div');
  shimmer.className = 'sk-shimmer';

  el.appendChild(skHost);
  el.appendChild(lvHost);
  el.appendChild(shimmer);

  if (typeof gsap !== 'undefined') gsap.set(liveEls, { y: rise });

  const refs = { el, style };

  /**
   * Sheen wipe across the skeleton — a WIPE DOES NOT DECELERATE (xai T8): the
   * travel is `ease: 'none'`; only the fade in/out is eased.
   */
  function shimmerSweep(tl, {
    position = 0,
    fadeIn = 0.12,
    sweep = 0.60,
    fadeOut = 0.12,
    from = -(shimmerWidth + 20),
    to = width + 20,
  } = {}) {
    tl.fromTo(shimmer, { x: from, opacity: 0 },
      { opacity: 1, duration: fadeIn, ease: 'none', immediateRender: false }, position);
    tl.to(shimmer, { x: to, duration: sweep, ease: 'none' }, position);
    tl.to(shimmer, { opacity: 0, duration: fadeOut, ease: 'none' }, position + sweep - fadeOut);
    return tl;
  }

  /**
   * @param {gsap.core.Timeline} tl
   * @param {Object} [opts]
   * @param {number} [opts.position=0] — beat start on the master timeline
   * @param {boolean} [opts.shimmer=true] — run the sheen wipe first
   * @param {number} [opts.shimmerAt=0.35] — sheen start, relative to position
   * @param {number} [opts.swapAt=1.40] — first bar→field swap, relative to position
   * @param {number} [opts.swapStagger=0.14]
   */
  function tweenInto(tl, {
    position = 0,
    shimmer: runShimmer = true,
    shimmerAt = 0.35,
    swapAt = 1.40,
    swapStagger = 0.14,
    outDuration = 0.30,
    outEase = 'power2.inOut',
    inDuration = 0.34,
    inEase = 'power3.out',
    inOffset = 0.05,
  } = {}) {
    if (runShimmer) shimmerSweep(tl, { position: position + shimmerAt });
    liveEls.forEach((node, i) => {
      const T = position + swapAt + i * swapStagger;
      if (skeletonEls[i]) tl.to(skeletonEls[i], { autoAlpha: 0, duration: outDuration, ease: outEase }, T);
      tl.to(node, { autoAlpha: 1, y: 0, duration: inDuration, ease: inEase }, T + inOffset);
    });
    return tl;
  }

  return {
    el,
    skeletonEls,
    liveEls,
    tweenInto,
    shimmerSweep,
    dispose() { disposeEffect(refs); },
  };
}
