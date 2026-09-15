// videos/_shared/effects/logo-wall.js
//
// LOGO WALL — the social-proof grid: N tiles pop in on a micro-stagger with a
// short overshoot, then dim as one so a claim or quote can land on top of them.
// An optional seeded per-tile float keeps the grid alive through a long hold
// without any tile drifting off its mark.
//
// Source: promoted from the ad-vocabulary proving reel, beat b5
// (2026-09-03 — motion-audit tier A, seam-gate PASS).
// Vocabulary slot: proof — tile grid of partner marks
//
// ⚠ SHIPS NO LOGOS. `marks` is caller-supplied: [{ name, src }]. Real marks are
// per-film assets with their own provenance — copy them into
// videos/<slug>/assets/brand/ with a `// SOURCE:` cite per file (INV-15) or
// pull them with tools/capture-brand.js. Never invent a partner mark, and never
// let a shared module bundle one.
//
// The cream PLATE behind each mark is not decoration: several real provider
// marks are dark ink and vanish on an ink tile. The plate lets the untouched
// PNG read on any bed. Set `plate: false` only for marks you know are light.
//
// Ground: DARK tiles (ink bed, cream text); restyle the --fx-wall-* vars for a
// light bed. Font is inherited on purpose.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId } from './_utils.js';
import { boundedRepeats, mulberry32 } from './_determinism.js';

const SCOPE = 'fx-logo-wall';

function css(id, columns, rows, gap, plateSize, markSize, radius) {
  return `
    #${id}.${SCOPE} { box-sizing: border-box; display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      grid-template-rows: repeat(${rows}, 1fr);
      gap: ${gap}px; will-change: opacity; }
    #${id} .tile { border-radius: ${radius}px; background: var(--fx-wall-tile, #10161f);
      border: 1px solid var(--fx-wall-line, rgba(244, 236, 217, 0.08));
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px; opacity: 0;
      box-shadow: 0 18px 50px -22px rgba(0, 0, 0, 0.65);
      will-change: transform, opacity; }
    #${id} .tile .t-plate { width: ${plateSize}px; height: ${plateSize}px; border-radius: 22px;
      background: var(--fx-wall-plate, #f4ecd9); display: flex; align-items: center;
      justify-content: center; box-shadow: 0 10px 26px -12px rgba(0, 0, 0, 0.55); }
    #${id} .tile .t-plate img { width: ${markSize}px; height: ${markSize}px; display: block; }
    #${id} .tile .t-mark { width: ${markSize}px; height: ${markSize}px; display: block; }
    #${id} .tile .t-name { font-size: 24px; font-weight: 600; color: var(--fx-wall-ink, #d9d2c0);
      letter-spacing: 0.01em; }
  `;
}

/**
 * @param {Object} opts
 * @param {Array<{name: string, src: string}>} opts.marks — REQUIRED, caller-owned
 * @param {number} [opts.columns=4]
 * @param {number} [opts.rows=2]
 * @param {number} [opts.gap=26]
 * @param {number} [opts.width=1000]
 * @param {number} [opts.height=580]
 * @param {boolean} [opts.plate=true] — cream plate behind each mark
 * @param {boolean} [opts.labels=true] — show the mark's name under it
 * @returns {{ el, tiles, tweenInto, dim, float, dispose }}
 */
export function mountLogoWall({
  marks = [],
  columns = 4,
  rows = 2,
  gap = 26,
  width = 1000,
  height = 580,
  plate = true,
  labels = true,
  plateSize = 96,
  markSize = 66,
  radius = 18,
  parkScale = 0.6,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, columns, rows, gap, plateSize, markSize, radius));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;

  const tiles = marks.map(({ name, src }) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    const img = src
      ? (plate
        ? '<span class="t-plate"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(name) + '"></span>'
        : '<img class="t-mark" src="' + escapeHtml(src) + '" alt="' + escapeHtml(name) + '">')
      : '';
    tile.innerHTML = img + (labels ? '<span class="t-name">' + escapeHtml(name) + '</span>' : '');
    el.appendChild(tile);
    return tile;
  });

  if (typeof gsap !== 'undefined') gsap.set(tiles, { scale: parkScale, transformOrigin: '50% 50%' });

  const refs = { el, style };

  /** Tiles pop in on a micro-stagger with a short overshoot. */
  function tweenInto(tl, {
    position = 0,
    duration = 0.40,
    ease = 'back.out(1.4)',
    stagger = 0.04,
  } = {}) {
    tl.to(tiles, { scale: 1, autoAlpha: 1, duration, ease, stagger }, position);
    return tl;
  }

  /** Recede as one so something can land on top (a quote card, a claim). */
  function dim(tl, {
    position = 0,
    to = 0.35,
    duration = 0.35,
    ease = 'power1.inOut',
  } = {}) {
    tl.to(tiles, { autoAlpha: to, duration, ease }, position);
    return tl;
  }

  /**
   * Seeded per-tile float — carries a long hold without idle frames (D1) and
   * returns every tile to its identity pose before the next seam window.
   * `window` is the on-screen span the float must cover; the repeat count is
   * computed from it (never `repeat: -1`).
   */
  function float(tl, {
    position = 0,
    seed = 0xB5F10A7,
    min = 3,
    max = 6,
    duration = 0.5,
    stagger = 0.04,
    window: visible = 2.0,
  } = {}) {
    const rng = mulberry32(seed);
    const repeat = boundedRepeats(duration, visible);
    tiles.forEach((tile, i) => {
      const dy = min + rng() * (max - min);
      tl.to(tile, { y: -dy, duration, ease: 'sine.inOut', yoyo: true, repeat }, position + i * stagger);
    });
    return tl;
  }

  return {
    el,
    tiles,
    tweenInto,
    dim,
    float,
    dispose() { disposeEffect(refs); },
  };
}
