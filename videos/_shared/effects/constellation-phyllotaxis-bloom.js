// videos/_shared/effects/constellation-phyllotaxis-bloom.js
//
// N real WPForms template tiles bloom outward from a center point along a
// phyllotaxis spiral (golden angle 137.5°). Each tile is a real template
// from snapshots/admin-templates/ (thumbnail + name only — buttons + desc
// stripped because tiles are tiny). Arrives with back.out ease, slight
// per-tile rotation alternation, from deep z toward camera. Use for
// "thousands of templates" / "all your forms in one place" payoff beats.
//
// Source: ported GSAP effect.
// Vocabulary slot: constellation — phyllotaxis-bloom

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId } from './_utils.js';
import { REAL_TEMPLATES, DEFAULT_THUMB_BASE } from './_wpforms-templates.js';

const SCOPE = 'fx-constellation-phyllotaxis-bloom';

function css(id) {
  return `
    #${id}.${SCOPE} {
      position: relative;
      width: 100%; height: 100%;
      perspective: 1200px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #${id} .gallery { position: absolute; inset: 0; }
    #${id} .tile {
      position: absolute; top: 50%; left: 50%;
      width: 160px; height: 200px;
      margin: -100px 0 0 -80px;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 0 0 1px #c3c4c7, 0 16px 36px rgba(0,0,0,0.5);
      overflow: hidden;
      display: flex; flex-direction: column;
      will-change: transform, opacity;
      opacity: 0;
      box-sizing: border-box;
    }
    #${id} .tile .wpforms-template-thumbnail {
      background-color: #F5F9FD;
      border-bottom: 1px solid #EBEEF1;
      overflow: hidden;
      padding: 10px 16px 0;
      flex: 1;
      display: flex; align-items: center; justify-content: center;
    }
    #${id} .tile .wpforms-template-thumbnail > img {
      max-width: 100%;
      max-height: 100%;
      border-radius: 2px 2px 0 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      object-fit: cover;
      object-position: top center;
    }
    #${id} .tile .wpforms-template-name {
      font-size: 11px;
      font-weight: 600;
      line-height: 14px;
      padding: 8px 10px;
      margin: 0;
      color: #3c434a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
}

/**
 * @param {Object} opts
 * @param {number} [opts.count=30] — number of tiles
 * @param {number} [opts.spacingC=70] — phyllotaxis radius constant (r = C * sqrt(i))
 * @param {Array} [opts.templates] — pool of WPForms templates to cycle through.
 *   Defaults to REAL_TEMPLATES (12 entries). With count=30 the pool cycles 2.5×.
 * @param {string} [opts.thumbBase=DEFAULT_THUMB_BASE]
 * @returns {{ el: HTMLElement, tiles: HTMLElement[], positions: Array, tweenInto: Function, dispose: Function }}
 */
export function mountConstellationPhyllotaxisBloom({
  count = 30,
  spacingC = 70,
  templates = REAL_TEMPLATES,
  thumbBase = DEFAULT_THUMB_BASE,
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;

  const gallery = document.createElement('div');
  gallery.className = 'gallery';
  el.appendChild(gallery);

  const ANGLE = 137.5 * Math.PI / 180;
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = spacingC * Math.sqrt(i);
    const t = i * ANGLE;
    positions.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });

    const template = templates[i % templates.length];
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.id = `${id}-tile-${i}-${template.slug}`;
    tile.innerHTML = `
      <div class="wpforms-template-thumbnail">
        <img src="${escapeHtml(thumbBase + template.thumb)}" alt="${escapeHtml(template.name)}" loading="lazy">
      </div>
      <h3 class="wpforms-template-name">${escapeHtml(template.name)}</h3>
    `;
    gallery.appendChild(tile);
  }

  const tiles = [...gallery.querySelectorAll('.tile')];

  if (typeof gsap !== 'undefined') {
    tiles.forEach((m) => gsap.set(m, { x: 0, y: 0, z: -1200, scale: 0.3, opacity: 0, rotation: 0 }));
  }

  const refs = { el, style };

  function tweenInto(tl, {
    position = 0,
    perTileDelay = 0.06,
    duration = 0.9,
    ease = 'back.out(1.4)',
    alternateRotation = 6,
  } = {}) {
    tiles.forEach((m, i) => {
      const p = positions[i];
      tl.to(m, {
        x: p.x, y: p.y, z: 0,
        scale: 1, opacity: 1,
        rotation: alternateRotation === 0 ? 0 : (i % 2 === 0 ? alternateRotation : -alternateRotation),
        duration,
        ease,
      }, position + i * perTileDelay);
    });
    return tl;
  }

  return {
    el, tiles, positions,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
