// Focus pull — fake depth-of-field.
//
// Puts a blur on the whole iframe, then lays a sharp, unblurred clone of the
// focused element on top. The eye reads it as "camera focused on this
// element, the rest is out of focus." Standard trick on macros where true
// DOF isn't available — cheap, looks convincing on camera.
//
// Authoring:
//   { id: 'dof-email', do: 'focusPull', target: '#wpforms-field-2',
//     blur: 5, holdMs: 900 }

import { sleep } from '../engine/engine.js';
import { diag } from '../engine/diag.js';

// Reuse pop-out's style-inlining so the sharp clone looks identical to the
// original. Pop-out already solves cross-document fidelity (computed styles,
// pseudo-elements, @font-face injection).
import { inlineTreeStyles, injectIframeFonts, stripBuilderChrome } from './pop-out.js';

function currentZoom() {
  const ui = document.querySelector('iframe.ui');
  if (!ui) return 1;
  const m = /scale\(([-\d.]+)\)/.exec(ui.style.transform || '');
  return m ? parseFloat(m[1]) : 1;
}

function toStage(ix, iy) {
  const ui = document.querySelector('iframe.ui');
  const W = 1440, H = 900;
  const z = currentZoom();
  const stageW = window.innerWidth, stageH = window.innerHeight;
  const iframeOriginX = (stageW - W) / 2;
  const iframeOriginY = (stageH - H) / 2;
  const t = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(ui.style.transform || '');
  const tx = t ? parseFloat(t[1]) * z : 0;
  const ty = t ? parseFloat(t[2]) * z : 0;
  return { x: iframeOriginX + ix * z + tx, y: iframeOriginY + iy * z + ty };
}

/**
 * Blur the iframe and place a sharp clone of `sel` on top.
 *
 * @param {string} sel
 * @param {object} [opts]
 * @param {number} [opts.blur=5]     - px blur applied to iframe
 * @param {number} [opts.riseMs=360] - ms to ramp blur in
 * @param {number} [opts.holdMs=900]
 * @param {number} [opts.fallMs=280] - ms to ramp blur out
 * @param {number} [opts.dim=0]      - opacity for a subtle stage dim behind the clone
 */
export async function focusPull(sel, opts = {}) {
  const { blur = 4, riseMs = 360, holdMs = 900, fallMs = 280, clipToStage = true, dim = 0 } = opts;

  const iframe = document.querySelector('iframe.ui');
  if (!iframe) throw new Error('focusPull: iframe not mounted');
  const doc = iframe.contentDocument;
  const src = doc.querySelector(sel);
  if (!src) throw new Error('focusPull: not found: ' + sel);

  await injectIframeFonts(doc);

  const r = src.getBoundingClientRect();
  const z = currentZoom();
  const pos = toStage(r.left, r.top);

  diag('focusPull', sel.slice(0,80), { blur });

  // Sharp clone ─────────────────────────────────────────────────────────
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  // inlineTreeStyles handles pruning internally. See pop-out.js.
  inlineTreeStyles(src, clone);
  stripBuilderChrome(clone);

  clone.style.position = 'fixed';
  clone.style.left = pos.x + 'px';
  clone.style.top  = pos.y + 'px';
  clone.style.margin = '0';
  clone.style.zIndex = '790';
  clone.style.pointerEvents = 'none';
  clone.style.setProperty('position', 'fixed', 'important');
  // Lock the clone's box or complex fields reflow and stack vertically.
  clone.style.setProperty('width',  r.width  + 'px', 'important');
  clone.style.setProperty('height', r.height + 'px', 'important');
  clone.style.transformOrigin = '0 0';
  clone.style.transform = `scale(${z})`;
  clone.style.opacity = '0';
  clone.style.transition = `opacity ${riseMs}ms ease`;
  // Glass-UI edge: outer-only shadow. drop-shadow traces the alpha of every
  // descendant including glyphs, which blurs text. box-shadow hugs the
  // clone's bounding box only — the sharp content reads as glass-in-focus
  // floating above the blurred iframe.
  clone.style.boxShadow = [
    '0 0 0 1px rgba(16,14,10,0.06)',
    '0 30px 70px -14px rgba(14,10,6,0.32)',
    '0 10px 24px -10px rgba(14,10,6,0.18)',
  ].join(', ');

  const host = clipToStage ? document.querySelector('.stage') : document.body;
  let dimmer = null;
  if (dim > 0) {
    dimmer = document.createElement('div');
    Object.assign(dimmer.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '789',
      pointerEvents: 'none',
      background: 'rgba(12, 18, 28, 1)',
      opacity: '0',
      transition: `opacity ${riseMs}ms ease`,
    });
    (host || document.body).appendChild(dimmer);
  }
  (host || document.body).appendChild(clone);

  // Blur the iframe ─────────────────────────────────────────────────────
  const prevFilter     = iframe.style.filter;
  const prevTransition = iframe.style.transition;
  iframe.style.transition = `filter ${riseMs}ms ease`;

  await sleep(20);
  iframe.style.filter = `blur(${blur}px)`;
  if (dimmer) dimmer.style.opacity = String(dim);
  clone.style.opacity = '1';

  await sleep(riseMs + holdMs);

  iframe.style.transition = `filter ${fallMs}ms ease`;
  iframe.style.filter = prevFilter || 'none';
  clone.style.transition = `opacity ${fallMs}ms ease`;
  clone.style.opacity = '0';
  if (dimmer) {
    dimmer.style.transition = `opacity ${fallMs}ms ease`;
    dimmer.style.opacity = '0';
  }
  await sleep(fallMs + 20);

  iframe.style.transition = prevTransition;
  clone.remove();
  dimmer?.remove();
}
