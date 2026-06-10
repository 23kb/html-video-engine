// videos/_shared/effects/cards-fly-in-stack.js
//
// Real WPForms admin template cards fly in from below and land at varied
// stop positions (x/y/rotation/scale per card) for a hand-arranged feel.
// Center card lifts to emphasize after all have arrived. Designed for
// "show the form library" or "pick a template" beats.
//
// Card markup + styling come from snapshots/admin-templates/ (real WPForms
// admin template picker). Default templates are a curated 6-card subset of
// REAL_TEMPLATES from _wpforms-templates.js.
//
// Source: reference/gsap-effects/effect014.html
// Vocabulary slot: card layout — fly-in-stack

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId } from './_utils.js';
import {
  REAL_TEMPLATES,
  templateCardInnerHTML,
  templateCardInnerCSS,
  TEMPLATE_BASE_STYLES,
} from './_wpforms-templates.js';

const SCOPE = 'fx-cards-fly-in-stack';

function css(id) {
  return `
    #${id}.${SCOPE} {
      position: relative;
      width: 100%; height: 100%;
    }
    #${id} .medias {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
    }
    #${id} .wpforms-template {
      ${TEMPLATE_BASE_STYLES}
      position: absolute;
      width: 360px; height: 460px;
      transform-origin: center center;
      will-change: transform, opacity;
      opacity: 0;
    }
    ${templateCardInnerCSS(`#${id}`)}
  `;
}

function defaultStops() {
  return [
    { x: -560, y:  -10, rotate: -6,  scale: 0.94 },
    { x: -340, y:   25, rotate: -3,  scale: 0.96 },
    { x: -110, y:  -15, rotate:  0,  scale: 1.00 },
    { x:  110, y:   30, rotate:  4,  scale: 0.97 },
    { x:  340, y:  -20, rotate:  7,  scale: 0.93 },
    { x:  560, y:   10, rotate: 10,  scale: 0.92 },
  ];
}

/**
 * @param {Object} opts
 * @param {Array} [opts.templates] — array of WPForms template objects (slug/name/desc/thumb).
 *   Defaults to first 6 entries of REAL_TEMPLATES.
 * @param {Array} [opts.stops] — array of { x, y, rotate, scale } landing positions
 * @param {string} [opts.thumbBase] — base URL for thumbnails (default '/snapshots/_shared/assets/')
 * @returns {{ el: HTMLElement, medias: HTMLElement[], tweenInto: Function, dispose: Function }}
 */
export function mountCardsFlyInStack({
  templates = REAL_TEMPLATES.slice(0, 6),
  stops = defaultStops(),
  thumbBase,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;

  const medias = document.createElement('div');
  medias.className = 'medias';
  el.appendChild(medias);

  templates.forEach((t) => {
    const media = document.createElement('div');
    media.className = 'wpforms-template';
    media.id = `${id}-template-${t.slug}`;
    media.innerHTML = templateCardInnerHTML(t, { thumbBase });
    medias.appendChild(media);
  });

  const mediaEls = [...medias.querySelectorAll('.wpforms-template')];

  if (typeof gsap !== 'undefined') {
    mediaEls.forEach((m) => gsap.set(m, { y: 800, opacity: 0, scale: 0.9, rotate: 0 }));
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    enterStagger = 0.55,
    enterDuration = 1.0,
    ease = 'power3.out',
    emphasizeCenter = true,
    breatheAfter = true,
  } = {}) {
    mediaEls.forEach((m, i) => {
      const stop = stops[i % stops.length];
      tl.to(m, {
        x: stop.x, y: stop.y,
        rotate: stop.rotate, scale: stop.scale,
        opacity: 1,
        duration: enterDuration,
        ease,
      }, position + i * enterStagger);
    });

    const arrivalsEnd = position + mediaEls.length * enterStagger + enterDuration;

    if (breatheAfter) {
      tl.to(mediaEls, {
        y: '+=10',
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true, repeat: 1,
        stagger: { each: 0.07, from: 'center' },
      }, arrivalsEnd);
    }

    if (emphasizeCenter && mediaEls.length > 0) {
      const center = mediaEls[Math.floor(mediaEls.length / 2)];
      tl.to(center, {
        y: -50, scale: 1.08, rotate: 0,
        duration: 0.8, ease: 'power2.out',
      }, arrivalsEnd + 0.3);
    }

    return tl;
  }

  return {
    el, medias: mediaEls,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
