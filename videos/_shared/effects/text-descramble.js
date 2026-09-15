// videos/_shared/effects/text-descramble.js
//
// Scrubbed random descramble — characters sit at seeded-shuffled x positions
// and slide home (direction 'in'), or scatter from home back to shuffled
// positions and fade (direction 'out' — the "letters fly apart" exit).
// Char slots are measured at mount; randomness is mulberry32-seeded so every
// run is identical (INV-9 determinism).
//
// Source: ported GSAP effect.
// Vocabulary slot: text reveal — descramble (in/out)
//
// NOTE (fa-retest lesson): mounts PARKED — container autoAlpha 0 until
// tweenInto reveals it. Effects that mount visible text overlay every earlier
// scene (the center-out-roll jumbled-frame bug).

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId } from './_utils.js';

const SCOPE = 'fx-text-descramble';

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function css(id, color) {
  return `
    #${id}.${SCOPE} {
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: ${color};
      display: block;
      position: relative;
      white-space: nowrap;
    }
    #${id} .ch { display: inline-block; position: absolute; will-change: transform, opacity; opacity: 0; }
  `;
}

/**
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} [opts.fontSize='72px']
 * @param {string|number} [opts.fontWeight=600]
 * @param {string} [opts.color='var(--wpf-ink, #14110e)']
 * @param {number} [opts.seed=90]
 * @returns {{ el: HTMLElement, chars: HTMLElement[], tweenInto: Function, dispose: Function }}
 *   tweenInto(tl, { position, direction: 'in'|'out', stagger, travelDuration, ease })
 */
export function mountTextDescramble({
  text = '',
  fontSize = '72px',
  fontWeight = 600,
  color = 'var(--wpf-ink, #14110e)',
  seed = 90,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, color));
  const rng = mulberry32(seed);

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.fontSize = fontSize;
  el.style.fontWeight = String(fontWeight);

  // Measure per-char slots (requires layout — visibility:hidden still lays out)
  const chars = [];
  const measure = document.createElement('span');
  measure.style.cssText = 'visibility:hidden;white-space:nowrap;position:relative;display:inline-block;';
  el.appendChild(measure);
  const pending = [...String(text)];
  // build after el is attached — caller appends el THEN calls layout()
  let built = false;
  function layout() {
    if (built) return;
    built = true;
    let cumX = 0;
    for (const c of pending) {
      measure.textContent = c === ' ' ? ' ' : c;
      const w = measure.getBoundingClientRect().width;
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = c === ' ' ? ' ' : c;
      span.style.left = cumX + 'px';
      el.appendChild(span);
      chars.push(span);
      cumX += w;
    }
    measure.remove();
    el.style.width = cumX + 'px';
    el.style.height = '1.2em';
    // seeded shuffled offsets, applied as x deltas
    const targets = chars.map((_, i) => i);
    const xs = [];
    let x = 0;
    for (const ch of chars) { xs.push(parseFloat(ch.style.left)); }
    const shuffled = [...xs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (typeof gsap !== 'undefined') {
      chars.forEach((ch, i) => {
        ch.dataset.scrX = shuffled[i] - xs[i];
        gsap.set(ch, { x: Number(ch.dataset.scrX), y: 26, opacity: 0 });
      });
      gsap.set(el, { autoAlpha: 0 }); // parked until tweenInto (fa-retest lesson)
    }
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    direction = 'in',
    stagger = 0.013,
    travelDuration = 0.9,
    ease = 'power3.inOut',
  } = {}) {
    layout();
    if (direction === 'in') {
      tl.set(el, { autoAlpha: 1 }, position);
      tl.to(chars, { opacity: 1, y: 0, duration: 0.32, stagger, ease: 'power2.out' }, position);
      chars.forEach((ch, i) => {
        tl.to(ch, { x: 0, duration: travelDuration, ease }, position + 0.28 + i * stagger);
      });
    } else {
      chars.forEach((ch, i) => {
        tl.to(ch, {
          x: Number(ch.dataset.scrX || 0), y: -22, opacity: 0,
          duration: travelDuration * 0.6, ease: 'power2.in',
        }, position + i * stagger);
      });
      tl.set(el, { autoAlpha: 0 }, position + travelDuration * 0.6 + chars.length * stagger);
    }
    return tl;
  }

  return {
    el, chars, layout, tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
