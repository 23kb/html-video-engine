// videos/_shared/effects/glass-card.js
//
// Frosted-glass / holographic surface — tinted-white multi-stop gradient glass
// with true frost (backdrop-filter blur + saturate), embossed hairline edges,
// a soft-light sheen sweep, and a soft-spring entrance. True frost reads
// whatever moves BEHIND the card, so pair it with a live gradient/photo
// "world" layer underneath (worlds stay video-local — per-film art direction).
//
// Source: original house extract — videos/glass-style-demo/index.html
// (approved 2026-09-02; style study of glass-pilot-hyperframes).
// Vocabulary slot: surface — frosted glass card
//
// NOTE: backdrop-filter re-samples on every frame something moves behind the
// card. Never animate the filter itself; tween transform/autoAlpha only
// (wpforms-gsap-rules L0). Never mount over a real-UI iframe region you care
// about reading sharply at small sizes — the frost is the point, but it frosts.

/* global gsap, CustomEase */

import { disposeEffect, mountStyle, nextEffectId } from './_utils.js';

const SCOPE = 'fx-glass-card';

// Soft spring — dampingFraction ~0.84 feel (small overshoot, long settle).
// Registered once; falls back to back.out when CustomEase isn't loaded.
export function glassSpringEase() {
  if (typeof gsap !== 'undefined' && typeof CustomEase !== 'undefined') {
    if (!glassSpringEase._registered) {
      gsap.registerPlugin(CustomEase);
      CustomEase.create('fx-glass-spring', 'M0,0 C0.16,0.55 0.28,1.035 0.5,1.02 C0.7,1.005 0.85,1 1,1');
      glassSpringEase._registered = true;
    }
    return 'fx-glass-spring';
  }
  return 'back.out(1.2)';
}

function css(id, blur, saturate) {
  return `
    #${id}.${SCOPE} {
      position: relative;
      background: var(--fx-glass-tint, linear-gradient(155deg,
        rgba(255,255,255,0.82) 0%, rgba(255,240,248,0.72) 24%,
        rgba(230,244,255,0.74) 50%, rgba(255,255,255,0.78) 74%,
        rgba(240,232,255,0.70) 100%));
      -webkit-backdrop-filter: blur(${blur}px) saturate(${saturate}%);
      backdrop-filter: blur(${blur}px) saturate(${saturate}%);
      border: 1px solid rgba(255,255,255,0.74);
      box-shadow: 0 16px 40px rgba(16,22,40,0.18),
        inset 0 1px 0 rgba(255,255,255,0.88),
        inset 0 -1px 0 rgba(255,255,255,0.18);
      overflow: hidden;
      will-change: transform, opacity;
    }
    #${id} .fx-glass-viewport {
      position: absolute; inset: 0; overflow: hidden; border-radius: inherit;
    }
    #${id} .fx-glass-sheen {
      position: absolute; inset: -40%; pointer-events: none;
      background: linear-gradient(108deg, transparent 36%,
        rgba(255,255,255,0) 44%, rgba(255,255,255,0.55) 50%,
        rgba(255,210,236,0.22) 55%, transparent 64%);
      mix-blend-mode: soft-light;
      will-change: transform;
    }
  `;
}

/**
 * @param {Object} opts
 * @param {number} [opts.width=700]
 * @param {number} [opts.height=560]
 * @param {number} [opts.radius=44]
 * @param {HTMLElement|string} [opts.content=''] — author markup mounted inside
 *   the masked viewport (dark ink reads on the light glass; the ground behind
 *   the card should be a rich/dark world for the frost to show)
 * @param {number} [opts.blur=22] — frost blur px (glass-pilot extract value)
 * @param {number} [opts.saturate=180] — frost saturation % (punches color through)
 * @returns {{ el, viewport, tweenInto, sheenSweep, dispose }}
 */
export function mountGlassCard({
  width = 700,
  height = 560,
  radius = 44,
  content = '',
  blur = 22,
  saturate = 180,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, blur, saturate));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.borderRadius = `${radius}px`;

  const viewport = document.createElement('div');
  viewport.className = 'fx-glass-viewport';
  if (content instanceof HTMLElement) viewport.appendChild(content);
  else if (content) viewport.innerHTML = content;

  const sheen = document.createElement('div');
  sheen.className = 'fx-glass-sheen';

  el.appendChild(viewport);
  el.appendChild(sheen);

  if (typeof gsap !== 'undefined') {
    gsap.set(el, { y: 90, autoAlpha: 0, scale: 0.94 });
    gsap.set(sheen, { xPercent: -160 });
  }

  const refs = { el, style };

  // Soft-spring entrance (rise + settle). distance can go off-frame for
  // velocity-matched scene cuts (pass the exit yourself on the master).
  function tweenInto(tl, {
    position = 0,
    duration = 1.15,
    distance = 90,
    ease = glassSpringEase(),
  } = {}) {
    tl.fromTo(el, { y: distance, autoAlpha: 0, scale: 0.94 },
      { y: 0, autoAlpha: 1, scale: 1, duration, ease }, position);
    return tl;
  }

  // Slow liquid light sweep — never a whip (smoothness ruling 2026-09-02:
  // 1.4–1.5s sine, not sub-1s power2). Seek-safe fromTo.
  function sheenSweep(tl, {
    position = 0,
    duration = 1.5,
    ease = 'sine.inOut',
  } = {}) {
    tl.fromTo(sheen, { xPercent: -160 }, { xPercent: 160, duration, ease }, position);
    return tl;
  }

  return {
    el,
    viewport,
    tweenInto,
    sheenSweep,
    dispose() { disposeEffect(refs); },
  };
}
