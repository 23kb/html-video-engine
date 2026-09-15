// videos/_shared/effects/phrase-chain.js
//
// PHRASE CHAIN + CHIP-IN-HEADLINE — giant type that whips in from the left,
// holds a beat, and throws out to the right, one line replacing the next; the
// final line carries an inline accent CHIP whose label hot-swaps in place while
// the chip itself morphs width and flashes.
//
// Source: promoted from the ad-vocabulary proving reel, beat b1
// (2026-09-03 — motion-audit tier A, seam-gate PASS). Technique lineage:
// xai T7 (chip hot-swap: content slides out, container morphs, fill flashes) in
// docs/xai-voice-motion-rnd-2026-09-02.md; ease voices E1 `whipSettle` (in) and
// E2 `heldSnap` (out / morph) from the same doc.
// Vocabulary slot: text — phrase whips with an inline label swap
//
// ⚠ The chip WIDTH morph runs on `scaleX` with `transformOrigin: '0% 50%'`,
// never on a `width` tween (GSAP L0: transform/opacity/filter only — a width
// tween relayouts the whole line every frame and the type jitters).
//
// Requires `registerXaiEases()` (videos/_shared/effects/xai-eases.js) before
// the timeline runs, or pass your own eases.
//
// Ground: DARK (cream type); pass `color` for a light bed. Fonts are inherited
// by default — pass `font` (display serif for the lines) and `chipFont` (the
// body stack for the label) to match the film.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-phrase-chain';

function css(id, top, fontSize, fontWeight, font, chipW, chipH, chipFont, chipFontSize) {
  const radius = chipH / 2;
  return `
    #${id}.${SCOPE} { position: absolute; inset: 0; }
    #${id} .phrase { position: absolute; left: 0; top: ${top}px; width: 100%;
      text-align: center; font-family: ${font}; font-size: ${fontSize}px;
      font-weight: ${fontWeight}; color: var(--fx-phrase-ink, #f4ecd9);
      white-space: nowrap; opacity: 0; will-change: transform, opacity, filter; }
    #${id} .hl-chip { display: inline-block; vertical-align: baseline; position: relative;
      width: ${chipW}px; height: ${chipH}px; border-radius: ${radius}px;
      background: var(--fx-chip-bg, #E27730);
      margin-left: 26px; overflow: hidden; will-change: transform, opacity; }
    #${id} .chip-label { position: absolute; inset: 0; display: flex;
      align-items: center; justify-content: center; font-family: ${chipFont};
      font-weight: 800; font-size: ${chipFontSize}px; color: #fff; letter-spacing: -0.01em;
      will-change: transform, opacity; }
    #${id} .chip-flash { position: absolute; inset: 0; border-radius: ${radius}px;
      background: var(--fx-chip-flash, rgba(255, 214, 150, 1)); opacity: 0; will-change: opacity; }
  `;
}

/**
 * @param {Object} opts
 * @param {string[]} [opts.lines] — one giant-type line each, in play order. The
 *        LAST line hosts the chip when `chip` is given.
 * @param {{from: string, to: string}} [opts.chip=null] — inline label hot-swap
 * @param {number} [opts.top=380] — line top in stage px
 * @param {number} [opts.fontSize=148]
 * @param {number} [opts.fontWeight=500]
 * @param {string} [opts.font='inherit'] — e.g. 'var(--display-font)'
 * @param {string} [opts.chipFont='inherit'] — e.g. 'var(--font-stack)'
 * @param {number} [opts.parkX=-420] — off-pose the lines wait at
 * @param {number} [opts.parkScaleX=0.72] — the chip's pre-morph width fraction
 * @param {string} [opts.accent='orange'] — chip fill
 * @returns {{ el, lines, chip, labels, flash, tweenInto, swapChip, dispose }}
 */
export function mountPhraseChain({
  lines = [],
  chip = null,
  top = 380,
  fontSize = 148,
  fontWeight = 500,
  font = 'inherit',
  chipWidth = 470,
  chipHeight = 132,
  chipFont = 'inherit',
  chipFontSize = 74,
  parkX = -420,
  parkScaleX = 0.72,
  labelParkX = 34,
  accent = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`,
    css(id, top, fontSize, fontWeight, font, chipWidth, chipHeight, chipFont, chipFontSize));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  if (accent) el.style.setProperty('--fx-chip-bg', resolveColor(accent));

  let chipEl = null;
  let labelA = null;
  let labelB = null;
  let flashEl = null;

  const lineEls = lines.map((text, i) => {
    const line = document.createElement('div');
    line.className = 'phrase';
    const isLast = i === lines.length - 1;
    if (isLast && chip) {
      line.innerHTML = escapeHtml(text) +
        '<span class="hl-chip"><span class="chip-label">' + escapeHtml(chip.from) + '</span>' +
        '<span class="chip-label">' + escapeHtml(chip.to) + '</span>' +
        '<span class="chip-flash"></span></span>';
      chipEl = line.querySelector('.hl-chip');
      const labels = line.querySelectorAll('.chip-label');
      labelA = labels[0];
      labelB = labels[1];
      flashEl = line.querySelector('.chip-flash');
    } else {
      line.textContent = text;
    }
    el.appendChild(line);
    return line;
  });

  if (typeof gsap !== 'undefined') {
    gsap.set(lineEls, { x: parkX, autoAlpha: 0 });
    if (chipEl) {
      gsap.set(labelB, { x: labelParkX, autoAlpha: 0 });
      // T7 width morph via transform, never a width tween (L0).
      gsap.set(chipEl, { scaleX: parkScaleX, transformOrigin: '0% 50%' });
    }
  }

  const refs = { el, style };

  /**
   * @param {gsap.core.Timeline} tl
   * @param {Object} [opts]
   * @param {number} [opts.position=0] — beat start on the master timeline
   * @param {Array<{in?:number, inDuration?:number, out?:number, outDuration?:number}>} [opts.marks]
   *        — per-line arrival/exit, RELATIVE to position. Omit `out` on the
   *        line that stays up into the cut.
   * @param {number} [opts.travel=420] — px each line throws out to the right
   */
  function tweenInto(tl, {
    position = 0,
    marks = [
      { in: 0.10, inDuration: 0.42, out: 1.00, outDuration: 0.30 },
      { in: 1.22, inDuration: 0.42, out: 1.92, outDuration: 0.28 },
      { in: 2.10, inDuration: 0.45 },
    ],
    travel = 420,
    inEase = 'whipSettle',
    outEase = 'heldSnap',
  } = {}) {
    lineEls.forEach((line, i) => {
      const m = marks[i];
      if (!m) return;
      if (m.in != null) {
        tl.to(line, { x: 0, autoAlpha: 1, duration: m.inDuration ?? 0.42, ease: inEase }, position + m.in);
      }
      if (m.out != null) {
        tl.to(line, { x: travel, autoAlpha: 0, duration: m.outDuration ?? 0.30, ease: outEase }, position + m.out);
      }
    });
    return tl;
  }

  /**
   * T7 chip hot-swap: the old label slides out, the container morphs to full
   * width, the fill flashes, the new label slides in. `position` is the swap
   * instant on the master timeline.
   */
  function swapChip(tl, {
    position = 0,
    outTravel = -34,
    outDuration = 0.18,
    outEase = 'power2.inOut',
    inAt = 0.04,
    inDuration = 0.22,
    inEase = 'power3.out',
    morphDuration = 0.25,
    morphEase = 'heldSnap',
    flashPeak = 0.35,
    flashInDuration = 0.08,
    flashAt = 0.10,
    flashOutDuration = 0.22,
  } = {}) {
    if (!chipEl) return tl;
    tl.to(labelA, { x: outTravel, autoAlpha: 0, duration: outDuration, ease: outEase }, position);
    tl.to(labelB, { x: 0, autoAlpha: 1, duration: inDuration, ease: inEase }, position + inAt);
    tl.to(chipEl, { scaleX: 1, duration: morphDuration, ease: morphEase }, position);
    // Same paint rule as the task-queue wash: the flash hue sits at full alpha
    // in CSS, the element at opacity 0, and the tween caps the peak.
    tl.fromTo(flashEl, { opacity: 0 },
      { opacity: flashPeak, duration: flashInDuration, ease: 'power1.in', immediateRender: false }, position);
    tl.to(flashEl, { opacity: 0, duration: flashOutDuration, ease: 'power1.out' }, position + flashAt);
    return tl;
  }

  return {
    el,
    lines: lineEls,
    chip: chipEl,
    labels: [labelA, labelB],
    flash: flashEl,
    tweenInto,
    swapChip,
    dispose() { disposeEffect(refs); },
  };
}
