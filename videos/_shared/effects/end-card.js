// videos/_shared/effects/end-card.js
//
// House end-card — the brand mascot (WPForms: real Sullie) + product name +
// CTA line + URL line, all from the film's brand pack (../brand.js).
// The canonical outro composition for editorial/ad-style films, restylable per
// film via options (S3 in docs/video-system-improvements-2026-08-06.md; every
// intro AND outro carries the real Sullie — standing rule).
//
// Sullie is loaded as an <img> from the tracked brand asset — an image asset
// load, INV-9 compatible; it preloads like any other <img> in the film.
// Vocabulary slot: brand — end card

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId, resolveColor } from './_utils.js';
import { brand } from '../brand.js';

const SCOPE = 'fx-end-card';
function css(id) {
  return `
    #${id}.${SCOPE} {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      text-align: center;
      font-family: var(--brand-font, var(--wpf-font-stack, system-ui, sans-serif));
    }
    #${id} .sullie {
      width: var(--fx-endcard-sullie, 160px);
      height: auto;
      will-change: transform, opacity;
    }
    #${id} .wordmark {
      font-size: 76px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--fx-endcard-ink, #14110e);
      line-height: 1.1;
      will-change: transform, opacity;
    }
    #${id} .cta {
      font-size: 34px;
      font-weight: 500;
      color: var(--fx-endcard-sub, #55504a);
      max-width: 22em;
      will-change: transform, opacity;
    }
    #${id} .url {
      font-size: 28px;
      font-weight: 600;
      color: var(--fx-endcard-accent, var(--brand-primary, #E27730));
      padding-bottom: 6px;
      position: relative;
      will-change: transform, opacity;
    }
    #${id} .url .underline {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 3px;
      border-radius: 2px;
      background: currentColor;
      transform-origin: left center;
    }
  `;
}

/**
 * @param {Object} opts
 * @param {string} [opts.title] — wordmark line; default brand.name (WPForms: 'WPForms')
 * @param {string} [opts.cta=''] — one CTA sentence, e.g. 'Read the full guide'
 * @param {string} [opts.url] — display URL line; default brand.url (WPForms: 'WPForms.com')
 * @param {string} [opts.accent='brand'] — URL/accent color; name or CSS color ('brand' = the brand primary)
 * @param {string} [opts.sullieSrc] — override the mascot path (default brand.mascot.src)
 * @param {string} [opts.sullieSize='160px']
 * @returns {{ el: HTMLElement, tweenInto: Function, dispose: Function }}
 */
export function mountEndCard({
  title = brand.name,
  cta = '',
  url = brand.url,
  accent = 'brand',
  sullieSrc = brand.mascot.src,
  sullieSize = '160px',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.setProperty('--fx-endcard-sullie', sullieSize);
  el.style.setProperty('--fx-endcard-accent', resolveColor(accent));

  const sullie = document.createElement('img');
  sullie.className = 'sullie';
  sullie.src = sullieSrc;
  sullie.alt = brand.mascot.alt;

  const wordmark = document.createElement('div');
  wordmark.className = 'wordmark';
  wordmark.textContent = title;

  el.appendChild(sullie);
  el.appendChild(wordmark);

  let ctaEl = null;
  if (cta) {
    ctaEl = document.createElement('div');
    ctaEl.className = 'cta';
    ctaEl.textContent = cta;
    el.appendChild(ctaEl);
  }

  const urlEl = document.createElement('div');
  urlEl.className = 'url';
  urlEl.textContent = url;
  const underline = document.createElement('span');
  underline.className = 'underline';
  urlEl.appendChild(underline);
  el.appendChild(urlEl);

  if (typeof gsap !== 'undefined') {
    gsap.set(sullie, { scale: 0.4, opacity: 0, transformOrigin: '50% 60%' });
    gsap.set(wordmark, { y: 34, opacity: 0 });
    if (ctaEl) gsap.set(ctaEl, { y: 26, opacity: 0 });
    gsap.set(urlEl, { y: 20, opacity: 0 });
    gsap.set(underline, { scaleX: 0 });
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    stagger = 0.16,
    ease = 'power3.out',
  } = {}) {
    tl.to(sullie, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.6)' }, position);
    tl.to(wordmark, { y: 0, opacity: 1, duration: 0.6, ease }, position + stagger);
    if (ctaEl) tl.to(ctaEl, { y: 0, opacity: 1, duration: 0.55, ease }, position + stagger * 2);
    tl.to(urlEl, { y: 0, opacity: 1, duration: 0.5, ease }, position + stagger * (ctaEl ? 3 : 2));
    tl.to(underline, { scaleX: 1, duration: 0.45, ease: 'power2.inOut' }, position + stagger * (ctaEl ? 3 : 2) + 0.25);
    return tl;
  }

  return {
    el,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
