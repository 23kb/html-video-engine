// videos/_shared/effects/stat-count-up.js
//
// "One number that matters" — editorial stat card whose value counts up as the
// card lands. Deterministic: the displayed value is a pure function of tween
// progress (seek/scrub-safe for render.js --seek parity).
//
// Source: original house effect (no ported GSAP effect — the catalog's
// "counter" hits are counter-rotation, unrelated). Slot vocabulary adopted from
// docs/video-system-improvements-2026-08-06.md E1.
// Vocabulary slot: stat — count-up card

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-stat-count-up';

function css(id) {
  return `
    #${id}.${SCOPE} {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      padding: 44px 56px;
      border-radius: 24px;
      background: var(--fx-stat-bg, #ffffff);
      box-shadow: 0 24px 60px rgba(20, 17, 14, 0.12);
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
      will-change: transform, opacity;
    }
    #${id} .label {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--fx-stat-label, #6b6459);
    }
    #${id} .value {
      font-size: 128px;
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--fx-stat-ink, #14110e);
      will-change: contents;
    }
    #${id} .value .suffix { color: inherit; }
    #${id} .sublabel {
      font-size: 22px;
      font-weight: 500;
      color: var(--fx-stat-sub, #9a9184);
    }
  `;
}

function formatThousands(n) {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * @param {Object} opts
 * @param {string} [opts.label='Entries collected'] — small line above the number
 * @param {number} [opts.from=0]
 * @param {number} [opts.to=5278]
 * @param {string} [opts.suffix=''] — e.g. '+', '%'
 * @param {string} [opts.sublabel=''] — small line under the number, e.g. 'Last 30 days'
 * @param {string} [opts.accent='orange'] — number color at emphasis; name or CSS color
 * @param {boolean} [opts.accentOnLand=true] — tint the number with the accent as it lands
 * @returns {{ el: HTMLElement, tweenInto: Function, dispose: Function }}
 */
export function mountStatCountUp({
  label = 'Entries collected',
  from = 0,
  to = 5278,
  suffix = '',
  sublabel = '',
  accent = 'orange',
  accentOnLand = true,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;

  const labelEl = document.createElement('div');
  labelEl.className = 'label';
  labelEl.textContent = label;

  const valueEl = document.createElement('div');
  valueEl.className = 'value';
  valueEl.textContent = formatThousands(from) + suffix;

  el.appendChild(labelEl);
  el.appendChild(valueEl);

  let subEl = null;
  if (sublabel) {
    subEl = document.createElement('div');
    subEl.className = 'sublabel';
    subEl.textContent = sublabel;
    el.appendChild(subEl);
  }

  if (typeof gsap !== 'undefined') {
    gsap.set(el, { y: 60, opacity: 0, scale: 0.96 });
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    entranceDuration = 0.7,
    countDuration = 1.4,
    countDelay = 0.25,       // count starts while the card is still settling
    ease = 'power3.out',
    countEase = 'power2.out',
  } = {}) {
    tl.to(el, { y: 0, opacity: 1, scale: 1, duration: entranceDuration, ease }, position);

    // Deterministic count: proxy value is timeline-driven, so any seek
    // reproduces the exact same displayed number.
    const proxy = { v: from };
    tl.to(proxy, {
      v: to,
      duration: countDuration,
      ease: countEase,
      onUpdate() { valueEl.textContent = formatThousands(proxy.v) + suffix; },
    }, position + countDelay);

    if (accentOnLand) {
      const landAt = position + countDelay + countDuration;
      tl.to(valueEl, { color: resolveColor(accent), duration: 0.35, ease: 'sine.out' }, landAt - 0.15);
      tl.fromTo(valueEl, { scale: 1 }, {
        scale: 1.04, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1,
        transformOrigin: 'left center',
      }, landAt - 0.05);
    }
    return tl;
  }

  return {
    el,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
