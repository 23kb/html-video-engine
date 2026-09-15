// videos/_shared/effects/quote-card.js
//
// QUOTE CARD LIFT — a testimonial card rises and settles over whatever is
// behind it (typically a dimmed logo wall), with an optional slow sheen that
// carries the read hold.
//
// Source: promoted from the ad-vocabulary proving reel, beat b5
// (2026-09-03 — motion-audit tier A, seam-gate PASS). Pairs with
// `mountLogoWall`: wall pops → wall dims → card lifts.
// Vocabulary slot: proof — testimonial card
//
// ⚠ A quote is a CLAIM. Real attributed copy or an explicitly labelled sample
// only — never a fabricated customer voice presented as real (INV-15).
//
// Ground: DARK (ink card, cream text); restyle the --fx-quote-* vars for a
// light bed. Body font is inherited; the opening mark takes `markFont` so the
// film's display serif can carry it.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-quote-card';

function css(id, sheenWidth, sheenAlpha, markFont) {
  return `
    #${id}.${SCOPE} {
      box-sizing: border-box;
      border-radius: 22px; background: var(--fx-quote-bg, #121a24);
      border: 1px solid var(--fx-quote-line, rgba(244, 236, 217, 0.14));
      padding: 44px 48px 36px; box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.85);
      opacity: 0; will-change: transform, opacity; overflow: hidden; }
    #${id} .q-mark { font-family: ${markFont}; font-size: 70px;
      color: var(--fx-quote-accent, #E27730); line-height: 0.6; margin-bottom: 18px; }
    #${id} .q-text { font-size: 34px; font-weight: 600; line-height: 1.35;
      color: var(--fx-quote-ink, #f4ecd9); }
    #${id} .q-attr { margin-top: 22px; font-size: 20px; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase; color: var(--fx-quote-ink-mute, #8a8678); }
    #${id} .q-sheen { position: absolute; top: 0; left: 0; width: ${sheenWidth}px; height: 100%;
      background: linear-gradient(105deg, rgba(244,236,217,0) 0%,
        rgba(244, 236, 217, ${sheenAlpha}) 45%, rgba(244,236,217,0) 100%);
      opacity: 0; will-change: transform, opacity; }
  `;
}

/**
 * @param {Object} opts
 * @param {string} opts.text — the quote body
 * @param {string} [opts.attribution=''] — small caps line under it
 * @param {string} [opts.mark='“'] — opening quotation glyph ('' to omit)
 * @param {string} [opts.markFont='inherit'] — e.g. 'var(--display-font)'
 * @param {number} [opts.width=700]
 * @param {boolean} [opts.sheen=true]
 * @param {string} [opts.accent='orange']
 * @returns {{ el, tweenInto, sheenSweep, dispose }}
 */
export function mountQuoteCard({
  text = '',
  attribution = '',
  mark = '“',
  markFont = 'inherit',
  width = 700,
  sheen = true,
  sheenWidth = 220,
  sheenAlpha = 0.09,
  accent = 'orange',
  parkY = 30,
  parkScale = 0.94,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, sheenWidth, sheenAlpha, markFont));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.width = `${width}px`;
  if (accent) el.style.setProperty('--fx-quote-accent', resolveColor(accent));
  el.innerHTML =
    (mark ? '<div class="q-mark">' + mark + '</div>' : '') +
    '<div class="q-text">' + escapeHtml(text) + '</div>' +
    (attribution ? '<div class="q-attr">' + escapeHtml(attribution) + '</div>' : '');

  let sheenEl = null;
  if (sheen) {
    sheenEl = document.createElement('div');
    sheenEl.className = 'q-sheen';
    el.appendChild(sheenEl);
  }

  if (typeof gsap !== 'undefined') {
    gsap.set(el, { y: parkY, scale: parkScale, transformOrigin: '50% 50%' });
  }

  const refs = { el, style };

  /** The lift: rise + settle with a short overshoot. */
  function tweenInto(tl, {
    position = 0,
    duration = 0.45,
    ease = 'back.out(1.3)',
  } = {}) {
    tl.to(el, { autoAlpha: 1, y: 0, scale: 1, duration, ease }, position);
    return tl;
  }

  /** Slow sheen across the card — a wipe does not decelerate (xai T8). */
  function sheenSweep(tl, {
    position = 0,
    fadeIn = 0.10,
    sweep = 0.55,
    fadeOut = 0.10,
    from = -(sheenWidth + 40),
    to = width + 60,
  } = {}) {
    if (!sheenEl) return tl;
    tl.fromTo(sheenEl, { x: from, opacity: 0 },
      { opacity: 1, duration: fadeIn, ease: 'none', immediateRender: false }, position);
    tl.to(sheenEl, { x: to, duration: sweep, ease: 'none' }, position);
    tl.to(sheenEl, { opacity: 0, duration: fadeOut, ease: 'none' }, position + sweep - fadeOut);
    return tl;
  }

  return {
    el,
    sheen: sheenEl,
    tweenInto,
    sheenSweep,
    dispose() { disposeEffect(refs); },
  };
}
