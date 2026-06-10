// videos/_shared/effects/cards-spread-fan.js
//
// Real WPForms admin template cards fan horizontally like dealing a hand.
// Starts as a centered deck with subtle scale-descent (cards behind are
// smaller); spreads outward with stagger + per-card tilt + a gentle arc
// (outer cards drop slightly); optional center-card hover-lift on the
// resolved layout.
//
// Card markup + styling come from snapshots/admin-templates/ (real WPForms
// admin template picker). Default templates are a curated 5-card subset of
// REAL_TEMPLATES from _wpforms-templates.js.
//
// Source: reference/gsap-effects/effect001.html
// Vocabulary slot: card layout — spread-fan

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId } from './_utils.js';
import {
  REAL_TEMPLATES,
  templateCardInnerHTML,
  templateCardInnerCSS,
  TEMPLATE_BASE_STYLES,
} from './_wpforms-templates.js';

const SCOPE = 'fx-cards-spread-fan';

function css(id) {
  return `
    #${id}.${SCOPE} {
      position: relative;
      width: 360px; height: 460px;
    }
    #${id} .wpforms-template {
      ${TEMPLATE_BASE_STYLES}
      position: absolute; inset: 0;
      transform-origin: bottom center;
      will-change: transform;
    }
    ${templateCardInnerCSS(`#${id}`)}
  `;
}

/**
 * @param {Object} opts
 * @param {Array} [opts.templates] — array of WPForms template objects (slug/name/desc/thumb).
 *   Defaults to first 5 entries of REAL_TEMPLATES.
 * @param {number} [opts.spacing=380] — px between final card centers
 * @param {string} [opts.thumbBase] — base URL for thumbnails (default '/snapshots/_shared/assets/')
 * @returns {{ el: HTMLElement, cards: HTMLElement[], tweenInto: Function, dispose: Function }}
 */
export function mountCardsSpreadFan({
  templates = REAL_TEMPLATES.slice(0, 5),
  spacing = 380,
  thumbBase,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;

  templates.forEach((t, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'wpforms-template';
    cardEl.id = `${id}-template-${t.slug}`;
    cardEl.dataset.i = String(i);
    cardEl.innerHTML = templateCardInnerHTML(t, { thumbBase });
    el.appendChild(cardEl);
  });

  const cardEls = [...el.querySelectorAll('.wpforms-template')];

  if (typeof gsap !== 'undefined') {
    cardEls.forEach((card, i) => {
      gsap.set(card, {
        x: 0,
        y: i * 8,
        rotate: 0,
        scale: 1 - i * 0.02,
        zIndex: cardEls.length - i,
        opacity: i === 0 ? 1 : 0.95,
      });
    });
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    spreadDuration = 1.4,
    stagger = 0.08,
    ease = 'power3.out',
    centerCardLift = true,
    centerCardLiftAt = 1.6,
    breatheAfter = true,
  } = {}) {
    const n = cardEls.length;
    const offsets = cardEls.map((_, i) => (i - (n - 1) / 2) * spacing);
    const tilts   = cardEls.map((_, i) => (i - (n - 1) / 2) * 4);

    cardEls.forEach((card, i) => {
      tl.to(card, {
        x: offsets[i],
        y: Math.abs(i - (n - 1) / 2) * 18,
        rotate: tilts[i],
        scale: 1,
        opacity: 1,
        duration: spreadDuration,
        ease,
      }, position + i * stagger);
    });

    if (centerCardLift && n >= 1) {
      const center = cardEls[Math.floor((n - 1) / 2)];
      tl.to(center, { y: -32, scale: 1.04, duration: 0.8, ease: 'power2.out' }, position + centerCardLiftAt);
    }

    if (breatheAfter) {
      tl.to(cardEls, {
        y: '+=2',
        duration: 1.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
        stagger: { each: 0.05, from: 'center' },
      }, position + centerCardLiftAt + 1.4);
    }

    return tl;
  }

  return {
    el, cards: cardEls,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
