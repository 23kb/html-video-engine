// videos/_shared/effects/text-dup-word-mask.js
//
// Duplicate-word mask reveal — each word is two stacked copies inside a 1em
// overflow mask: the base-color copy slides DOWN out of frame while the
// accent-color copy slides down INTO frame. Punchy single-line statements.
//
// Source: reference/gsap-effects/effect015.html
// Vocabulary slot: text reveal — duplicate-word mask (dark out / orange in)
//
// NOTE (fa-retest lesson): mounts PARKED — container autoAlpha 0 until
// tweenInto reveals it.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-text-dup-word-mask';

function css(id, baseColor, accentColor) {
  return `
    #${id}.${SCOPE} {
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
      letter-spacing: -0.025em;
      line-height: 1.1;
      text-align: center;
    }
    #${id} .word { display: inline-block; position: relative; height: 1em; overflow: hidden; vertical-align: bottom; }
    #${id} .word-hidden, #${id} .word-visible { display: block; line-height: 1; }
    #${id} .word-hidden { color: ${baseColor}; }
    #${id} .word-visible { color: ${accentColor}; }
  `;
}

/**
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} [opts.fontSize='110px']
 * @param {string|number} [opts.fontWeight=700]
 * @param {string} [opts.baseColor='var(--wpf-ink, #14110e)']
 * @param {string} [opts.accentColor='orange']
 * @returns {{ el: HTMLElement, words: HTMLElement[], tweenInto: Function, dispose: Function }}
 *   tweenInto(tl, { position, perWordDelay, duration, ease })
 */
export function mountTextDupWordMask({
  text = '',
  fontSize = '110px',
  fontWeight = 700,
  baseColor = 'var(--wpf-ink, #14110e)',
  accentColor = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, baseColor, resolveColor(accentColor)));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.fontSize = fontSize;
  el.style.fontWeight = String(fontWeight);

  String(text).split(' ').forEach((w, i, arr) => {
    const wrap = document.createElement('span');
    wrap.className = 'word';
    wrap.innerHTML = `<span class="word-hidden">${escapeHtml(w)}</span><span class="word-visible">${escapeHtml(w)}</span>`;
    el.appendChild(wrap);
    if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
  const words = [...el.querySelectorAll('.word')];

  if (typeof gsap !== 'undefined') {
    words.forEach((w) => {
      // layout: hidden occupies the 1em window (rows 0..1em); visible's natural
      // slot is the row BELOW the window (1em..2em). Parking visible at -100
      // puts it INSIDE the window on top of hidden (the fa-retest "footer text
      // stacked" bug) — park it fully ABOVE at -200, reveal lands at -100.
      gsap.set(w.querySelector('.word-hidden'), { yPercent: 0 });
      gsap.set(w.querySelector('.word-visible'), { yPercent: -200 });
    });
    gsap.set(el, { autoAlpha: 0 }); // parked until tweenInto (fa-retest lesson)
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    perWordDelay = 0.18,
    duration = 0.7,
    ease = 'power3.inOut',
  } = {}) {
    tl.set(el, { autoAlpha: 1 }, position);
    words.forEach((w, i) => {
      const t = position + i * perWordDelay;
      tl.to(w.querySelector('.word-hidden'), { yPercent: 100, duration, ease }, t);
      tl.to(w.querySelector('.word-visible'), { yPercent: -100, duration, ease }, t);
    });
    return tl;
  }

  return {
    el, words, tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
