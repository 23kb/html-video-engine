// videos/_shared/effects/text-letter-mask-domino.js
//
// Per-letter mask reveal — each letter is two glyphs (top + bottom) clipped to
// 1em height. Domino-style: top slides down out of view while bottom slides up
// into place. Optional second pass returns to the top color for an exit.
//
// Source: reference/gsap-effects/effect027.html
// Vocabulary slot: text reveal — letter-mask-domino

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-text-letter-mask-domino';

function css(id, topColor, botColor) {
  return `
    #${id}.${SCOPE} {
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
      letter-spacing: -0.035em;
      line-height: 1;
      list-style: none;
      padding: 0; margin: 0;
      display: flex; flex-wrap: wrap;
      justify-content: center;
      gap: 0 30px;
    }
    #${id} li { display: flex; gap: 0; }
    #${id} .letter {
      display: inline-block; position: relative;
      height: 1em; overflow: hidden;
      vertical-align: bottom;
    }
    #${id} .letter span { display: block; line-height: 1; }
    #${id} .letter .top { color: ${topColor}; }
    #${id} .letter .bot { color: ${botColor}; }
  `;
}

/**
 * @param {Object} opts
 * @param {string} opts.text — words separated by '·' (e.g. 'JUST · FORMS')
 * @param {string} [opts.fontSize='170px']
 * @param {string|number} [opts.fontWeight=800]
 * @param {string} [opts.topColor='#faf6ee'] — initial letter color
 * @param {string} [opts.botColor='orange'] — second-pass letter color (named or any CSS)
 * @returns {{ el: HTMLElement, letters: HTMLElement[], tweenInto: Function, dispose: Function }}
 */
export function mountTextLetterMaskDomino({
  text = '',
  fontSize = '170px',
  fontWeight = 800,
  topColor = '#faf6ee',
  botColor = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, topColor, resolveColor(botColor)));

  const el = document.createElement('ul');
  el.id = id;
  el.className = SCOPE;
  el.style.fontSize = fontSize;
  el.style.fontWeight = String(fontWeight);

  const words = String(text).split('·').map((w) => w.trim()).filter(Boolean);
  words.forEach((w) => {
    const li = document.createElement('li');
    [...w].forEach((c) => {
      const ch = c === ' ' ? ' ' : c;
      const wrap = document.createElement('span');
      wrap.className = 'letter';
      wrap.innerHTML = `<span class="top">${escapeHtml(ch)}</span><span class="bot">${escapeHtml(ch)}</span>`;
      li.appendChild(wrap);
    });
    el.appendChild(li);
  });

  const letters = [...el.querySelectorAll('.letter')];

  if (typeof gsap !== 'undefined') {
    letters.forEach((l) => {
      gsap.set(l.querySelector('.top'), { yPercent: 0 });
      gsap.set(l.querySelector('.bot'), { yPercent: -100 });
    });
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    perLetterDelay = 0.07,
    duration = 0.55,
    ease = 'power3.inOut',
    reverse = true,
    holdAfter = 0.8,
    reverseDelay = 0.04,
  } = {}) {
    letters.forEach((l, i) => {
      const t = position + i * perLetterDelay;
      tl.to(l.querySelector('.top'), { yPercent: 100, duration, ease }, t);
      tl.to(l.querySelector('.bot'), { yPercent: 0,   duration, ease }, t);
    });
    if (reverse) {
      const second = position + letters.length * perLetterDelay + holdAfter;
      letters.forEach((l, i) => {
        const t = second + i * reverseDelay;
        tl.to(l.querySelector('.bot'), { yPercent: -100, duration: duration * 0.75, ease }, t);
        tl.to(l.querySelector('.top'), { yPercent: 0,    duration: duration * 0.75, ease }, t);
      });
    }
    return tl;
  }

  return {
    el, letters,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
