// videos/_shared/effects/text-center-out-roll.js
//
// Center-out letter propagation — an accent-color version of the sentence sits
// behind the base text. Each line's chars slide up from below in a wave that
// starts at the center letter and propagates outward, then back down. Repeats
// per sentence with adjustable per-line stagger.
//
// Source: reference/gsap-effects/effect041.html
// Vocabulary slot: text reveal — center-out-roll

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-text-center-out-roll';

function css(id, baseColor, accentColor) {
  return `
    #${id}.${SCOPE} {
      display: flex; flex-direction: column;
      gap: 30px;
      font-family: var(--wpf-font-stack, system-ui, sans-serif);
    }
    #${id} .item { position: relative; }
    #${id} .item .hidden,
    #${id} .item .visible {
      display: block;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    #${id} .item .hidden  { color: ${baseColor}; }
    #${id} .item .visible {
      position: absolute; inset: 0;
      color: ${accentColor};
      display: flex; gap: 0;
    }
    #${id} .item .ch { display: inline-block; overflow: hidden; height: 1em; }
    #${id} .item .ch span { display: inline-block; line-height: 1; }
  `;
}

/**
 * @param {Object} opts
 * @param {string[]} opts.lines — one entry per line, e.g. ['Build the form.', 'Capture the lead.']
 * @param {string} [opts.fontSize='78px']
 * @param {string} [opts.baseColor='var(--wpf-ink, #14110e)']
 * @param {string} [opts.accentColor='orange'] — name (orange/blue/purple/...) or any CSS color
 * @returns {{ el: HTMLElement, tweenInto: Function, dispose: Function }}
 */
export function mountTextCenterOutRoll({
  lines = [],
  fontSize = '78px',
  baseColor = 'var(--wpf-ink, #14110e)',
  accentColor = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, baseColor, resolveColor(accentColor)));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;

  const items = [];
  for (const line of lines) {
    const p = document.createElement('p');
    p.className = 'item';
    p.style.cssText = 'position:relative;margin:0;';
    let hidden = `<div class="hidden" style="font-size:${fontSize}">`;
    let visible = `<div class="visible" style="font-size:${fontSize}">`;
    for (const c of String(line)) {
      const safe = c === ' ' ? '&nbsp;' : escapeHtml(c);
      hidden += safe;
      visible += `<div class="ch"><span>${safe}</span></div>`;
    }
    hidden += '</div>';
    visible += '</div>';
    p.innerHTML = hidden + visible;
    el.appendChild(p);
    items.push(p);
  }

  if (typeof gsap !== 'undefined') {
    items.forEach((p) => {
      const chars = p.querySelectorAll('.visible .ch span');
      gsap.set(chars, { yPercent: 100 });
    });
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    perLineDelay = 1.6,
    waveStep = 0.04,
    inDuration = 0.5,
    inEase = 'power3.out',
    holdBeforeExit = 1.2,
    exitStep = 0.03,
    outDuration = 0.4,
    outEase = 'power3.in',
    persist = false,
  } = {}) {
    items.forEach((p, pi) => {
      const chars = [...p.querySelectorAll('.visible .ch span')];
      const center = (chars.length - 1) / 2;
      const lineStart = position + pi * perLineDelay;
      chars.forEach((c, i) => {
        const dist = Math.abs(i - center);
        tl.to(c, { yPercent: 0, duration: inDuration, ease: inEase }, lineStart + dist * waveStep);
      });
      if (!persist) {
        const exitStart = lineStart + holdBeforeExit;
        chars.forEach((c, i) => {
          const dist = Math.abs(i - center);
          tl.to(c, { yPercent: 100, duration: outDuration, ease: outEase }, exitStart + dist * exitStep);
        });
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
