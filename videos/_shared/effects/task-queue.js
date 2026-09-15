// videos/_shared/effects/task-queue.js
//
// AI TASK QUEUE — an agent working a checklist on camera. Rows arrive on a
// ladder, then each row ticks done in turn: a same-hue highlight washes the
// row, the SVG check draws itself (stroke-dashoffset), and the status chip
// hot-swaps QUEUED → DONE behind an accent fill.
//
// Source: promoted from the ad-vocabulary proving reel, beat b2
// (2026-09-03 — motion-audit tier A, seam-gate PASS). Technique lineage:
// the checklist beat in docs/hyperframes-seam-grammar-rnd-2026-09-03.md §6
// (compose-ui.html) + the §3.2 same-hue highlight rule.
// Vocabulary slot: agent — task queue ticking done
//
// ⚠ §3.2 (learned the hard way, twice): the row highlight is a CONSTANT
// same-hue wash faded by `opacity`, never a backgroundColor tween from
// `transparent` — that interpolates through gray and flashes. And a wash
// parked at alpha 0 never paints at all: the hue sits at full alpha in CSS,
// the ELEMENT sits at opacity 0, and the timeline fades the element.
//
// Ground: DARK. The card bed is ink (#10161f) with cream text; restyle the
// --fx-tq-* vars for a light bed. Font is inherited on purpose — the card
// takes the film's stack so text metrics match the rest of the frame.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-task-queue';

function css(id) {
  return `
    #${id}.${SCOPE} {
      box-sizing: border-box;
      border-radius: 22px;
      background: var(--fx-tq-bg, #10161f);
      border: 1px solid var(--fx-tq-line, rgba(244, 236, 217, 0.08));
      padding: 34px 38px 26px;
      box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.7);
      will-change: transform, opacity;
    }
    #${id} .tq-title { display: flex; align-items: center; gap: 14px;
      font-size: 30px; font-weight: 700; color: var(--fx-tq-ink, #f4ecd9); margin-bottom: 24px; }
    #${id} .tq-dot { width: 16px; height: 16px; border-radius: 50%;
      background: var(--fx-tq-ai, #7a30e2); box-shadow: 0 0 14px var(--fx-tq-ai-glow, rgba(122, 48, 226, 0.8)); }
    #${id} .tq-sub { font-size: 21px; font-weight: 500; color: var(--fx-tq-ai, #7a30e2); }
    #${id} .tq-row { display: flex; align-items: center; gap: 18px; padding: 18px 16px;
      border-radius: 12px; position: relative; opacity: 0;
      will-change: transform, opacity; }
    #${id} .tq-row .row-glow { position: absolute; inset: 0; border-radius: 12px;
      background: var(--fx-tq-glow, rgba(226, 119, 48, 0.16)); opacity: 0; will-change: opacity; }
    #${id} .tq-row svg { width: 34px; height: 34px; flex: 0 0 auto; }
    #${id} .tq-row svg circle { stroke: var(--fx-tq-ring, rgba(244, 236, 217, 0.25)); stroke-width: 2.5; fill: none; }
    #${id} .tq-row svg path { stroke: var(--fx-tq-accent, #E27730); stroke-width: 3.5; fill: none;
      stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 30; stroke-dashoffset: 30; }
    #${id} .tq-row .row-label { font-size: 26px; color: var(--fx-tq-ink-soft, #d9d2c0); flex: 1; position: relative; }
    #${id} .tq-chip { position: relative; width: 132px; height: 44px; border-radius: 22px;
      background: var(--fx-tq-chip-bg, rgba(244, 236, 217, 0.10)); overflow: hidden; flex: 0 0 auto; }
    #${id} .tq-chip .st { position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 19px; font-weight: 700; letter-spacing: 0.04em;
      will-change: transform, opacity; }
    #${id} .tq-chip .st-q { color: var(--fx-tq-ink-mute, #8a8678); }
    #${id} .tq-chip .st-d { color: #fff; opacity: 0; }
    #${id} .tq-chip .chip-fill { position: absolute; inset: 0; border-radius: 22px;
      background: var(--fx-tq-accent, #E27730); opacity: 0; will-change: opacity; }
  `;
}

/**
 * @param {Object} opts
 * @param {string} [opts.title='WPForms AI'] — bold half of the title line
 * @param {string} [opts.subtitle='is building your form'] — accent half
 * @param {string[]} [opts.rows] — task labels, one row each
 * @param {number} [opts.width=800]
 * @param {string} [opts.queuedLabel='QUEUED']
 * @param {string} [opts.doneLabel='DONE']
 * @param {string} [opts.accent='orange'] — check + chip fill + row wash hue
 * @param {string} [opts.aiAccent='purple'] — the dot + subtitle (AI features only)
 * @returns {{ el: HTMLElement, rows: HTMLElement[], tweenInto: Function, dispose: Function }}
 */
export function mountTaskQueue({
  title = 'WPForms AI',
  subtitle = 'is building your form',
  rows = ['Add a Name field', 'Add an Email field', 'Write the confirmation'],
  width = 800,
  queuedLabel = 'QUEUED',
  doneLabel = 'DONE',
  accent = 'orange',
  aiAccent = 'purple',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.width = `${width}px`;
  if (accent) el.style.setProperty('--fx-tq-accent', resolveColor(accent));
  if (aiAccent) el.style.setProperty('--fx-tq-ai', resolveColor(aiAccent));

  const titleEl = document.createElement('div');
  titleEl.className = 'tq-title';
  titleEl.innerHTML = '<span class="tq-dot"></span>' + escapeHtml(title) +
    (subtitle ? ' <span class="tq-sub">' + escapeHtml(subtitle) + '</span>' : '');
  el.appendChild(titleEl);

  const rowsHost = document.createElement('div');
  rowsHost.className = 'tq-rows';
  const rowEls = rows.map((label) => {
    const row = document.createElement('div');
    row.className = 'tq-row';
    row.innerHTML = '<span class="row-glow"></span>' +
      '<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="14.5"></circle>' +
      '<path d="M10.5 17.5 L15.5 22.5 L24 12.5"></path></svg>' +
      '<span class="row-label">' + escapeHtml(label) + '</span>' +
      '<span class="tq-chip"><span class="st st-q">' + escapeHtml(queuedLabel) + '</span>' +
      '<span class="chip-fill"></span><span class="st st-d">' + escapeHtml(doneLabel) + '</span></span>';
    rowsHost.appendChild(row);
    return row;
  });
  el.appendChild(rowsHost);

  if (typeof gsap !== 'undefined') gsap.set(rowEls, { y: 14 });

  const refs = { el, style };

  /**
   * @param {gsap.core.Timeline} tl
   * @param {Object} [opts]
   * @param {number} [opts.position=0] — beat start on the master timeline
   * @param {number} [opts.rowIn=0.25] — first row's arrival, relative to position
   * @param {number} [opts.rowStagger=0.09]
   * @param {number} [opts.tickStart=0.70] — first row ticks done, relative to position
   * @param {number} [opts.tickStep=0.80] — seconds between row ticks
   */
  function tweenInto(tl, {
    position = 0,
    rowIn = 0.25,
    rowStagger = 0.09,
    rowInDuration = 0.30,
    rowInEase = 'power3.out',
    tickStart = 0.70,
    tickStep = 0.80,
  } = {}) {
    rowEls.forEach((row, i) => {
      tl.to(row, { autoAlpha: 1, y: 0, duration: rowInDuration, ease: rowInEase }, position + rowIn + i * rowStagger);
      const T = position + tickStart + i * tickStep;
      const glow = row.querySelector('.row-glow');
      const check = row.querySelector('svg path');
      const stQ = row.querySelector('.st-q');
      const stD = row.querySelector('.st-d');
      const fill = row.querySelector('.chip-fill');
      // §3.2 same-hue wash: constant alpha in CSS, faded by opacity — never
      // through gray, and it actually paints.
      tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: 'power1.in', immediateRender: false }, T - 0.05);
      tl.to(glow, { opacity: 0, duration: 0.45, ease: 'power1.out' }, T + 0.15);
      tl.to(check, { strokeDashoffset: 0, duration: 0.30, ease: 'power2.out' }, T);
      tl.to(stQ, { autoAlpha: 0, y: -8, duration: 0.16, ease: 'power2.in' }, T);
      tl.to(fill, { opacity: 1, duration: 0.18, ease: 'power1.in' }, T + 0.04);
      tl.to(stD, { autoAlpha: 1, duration: 0.20, ease: 'power3.out' }, T + 0.10);
    });
    return tl;
  }

  return {
    el,
    rows: rowEls,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
