// videos/_shared/effects/text-stack-from-right.js
//
// Word-by-word entrance from the right edge with 3D arrival and nudge-back settle.
// Previously-placed words bump slightly down + back as each new word lands.
//
// Source: reference/gsap-effects/effect004.html
// Vocabulary slot: text reveal — stack-from-right

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-text-stack-from-right';

function css(id) {
  return `
    #${id}.${SCOPE} {
      perspective: 1500px;
      margin: 0;
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
      letter-spacing: -0.025em;
      line-height: 1.15;
      text-align: left;
    }
    #${id} .word {
      display: inline-block;
      transform-style: preserve-3d;
      will-change: transform, opacity;
      margin-right: 0.25em;
    }
  `;
}

/**
 * @param {Object} opts
 * @param {string} opts.text — sentence to reveal
 * @param {Object<string,string>} [opts.highlight] — { 'million': 'orange', 'WPForms': 'blue' }
 *   Match is case-sensitive against words with trailing punctuation stripped.
 *   Color names: orange, blue, purple, green, amber, teal, pink, or any CSS color.
 * @param {string} [opts.fontSize='80px']
 * @param {string|number} [opts.fontWeight=600]
 * @param {string} [opts.color='var(--wpf-ink, #14110e)'] — default word color
 * @returns {{ el: HTMLElement, tweenInto: Function, dispose: Function }}
 */
export function mountTextStackFromRight({
  text = '',
  highlight = {},
  fontSize = '80px',
  fontWeight = 600,
  color = 'var(--wpf-ink, #14110e)',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('p');
  el.id = id;
  el.className = SCOPE;
  el.style.fontSize = fontSize;
  el.style.fontWeight = String(fontWeight);
  el.style.color = color;

  const tokens = String(text).split(/(\s+)/);
  const wordEls = [];
  for (const tok of tokens) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) {
      el.appendChild(document.createTextNode(tok));
      continue;
    }
    const span = document.createElement('span');
    span.className = 'word';
    const base = tok.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    if (highlight[base]) span.style.color = resolveColor(highlight[base]);
    span.textContent = tok;
    el.appendChild(span);
    wordEls.push(span);
  }

  if (typeof gsap !== 'undefined') {
    wordEls.forEach((w) => gsap.set(w, { x: 800, opacity: 0, rotateY: -45, rotateX: 12 }));
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    perWordDelay = 0.12,
    duration = 0.85,
    ease = 'power3.out',
    nudge = true,
  } = {}) {
    wordEls.forEach((w, i) => {
      const start = position + i * perWordDelay;
      tl.to(w, { x: 0, opacity: 1, rotateY: 0, rotateX: 0, duration, ease }, start);
      if (nudge && i > 0) {
        tl.to(wordEls.slice(0, i), { y: '+=3', duration: 0.3, ease: 'sine.out' }, start + 0.1);
        tl.to(wordEls.slice(0, i), { y: '-=3', duration: 0.4, ease: 'sine.inOut' }, start + 0.4);
      }
    });
    return tl;
  }

  return {
    el,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
