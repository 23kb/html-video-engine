// The blessed drag primitive. Single code path for every drag beat in every
// video — one field drag, multi-field drag, canvas-to-sidebar drag, etc.
//
// Fixes baked in:
// - Ghost visually matches the source button (the clone is hosted in the
//   parent document where iframe CSS doesn't reach; we walk the tree and
//   inline computed styles so it looks like the real WPForms pill).
// - Reveal-at callback lands a real field on the canvas MID-drag, so the
//   "drop" shows a real WPForms field node (not a fabricated div).
// - No end-ring by default; opt in via { endRing: true }.
// - Cursor path + ghost path are synced: ghost starts where the cursor
//   arrives at the source, glides with the cursor to the destination.

import { cursor as engineCursor, sleep } from '../engine/engine.js';
import { playPop } from './sfx.js';

// Read current engine zoom by inspecting the iframe transform.
function currentZoom() {
  const ui = document.querySelector('iframe.ui');
  if (!ui) return 1;
  const m = /scale\(([-\d.]+)\)/.exec(ui.style.transform || '');
  return m ? parseFloat(m[1]) : 1;
}

// Map iframe-local (ix, iy) → viewport (stage) pixels. Mirrors engine's toStage.
function toStage(ix, iy) {
  const ui = document.querySelector('iframe.ui');
  const W = 1440, H = 900; // engine's hardcoded iframe size
  const z = currentZoom();
  const stageW = window.innerWidth, stageH = window.innerHeight;
  const iframeOriginX = (stageW - W) / 2;
  const iframeOriginY = (stageH - H) / 2;
  // Derive current translate from transform matrix (translate in post-scale space)
  const t = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(ui.style.transform || '');
  const tx = t ? parseFloat(t[1]) * z : 0;
  const ty = t ? parseFloat(t[2]) * z : 0;
  return {
    x: iframeOriginX + ix * z + tx,
    y: iframeOriginY + iy * z + ty,
  };
}

// Visual-only style props worth inlining onto the ghost.
const INLINE_PROPS = [
  'background-color', 'background-image', 'background-repeat', 'background-position', 'background-size',
  'color', 'opacity',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius',
  'box-shadow',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'display', 'align-items', 'justify-content', 'gap',
  'width', 'height', 'min-width', 'min-height',
];

function copyVisual(src, dst) {
  const win = src.ownerDocument.defaultView;
  if (!win) return;
  const cs = win.getComputedStyle(src);
  for (const prop of INLINE_PROPS) {
    const v = cs.getPropertyValue(prop);
    if (v) dst.style.setProperty(prop, v);
  }
}

// Walk source + clone trees in lockstep and copy computed styles onto clone.
function inlineTreeStyles(srcRoot, cloneRoot) {
  const srcTreeWalker   = srcRoot.ownerDocument.createTreeWalker(srcRoot,   NodeFilter.SHOW_ELEMENT);
  const cloneTreeWalker = document.createTreeWalker(cloneRoot, NodeFilter.SHOW_ELEMENT);
  copyVisual(srcRoot, cloneRoot);
  let s = srcTreeWalker.nextNode();
  let c = cloneTreeWalker.nextNode();
  while (s && c) {
    copyVisual(s, c);
    s = srcTreeWalker.nextNode();
    c = cloneTreeWalker.nextNode();
  }
}

/**
 * Drag a single field from `fromSel` in the iframe sidebar to `toSel` on the
 * canvas. Returns when the ghost has faded out at the drop point.
 *
 * @param {string} fromSel   - iframe-scoped selector for the source button
 * @param {string} toSel     - iframe-scoped selector for the drop target
 * @param {object} [opts]
 * @param {number} [opts.wait=900]        - ms for the glide from src→dst
 * @param {number} [opts.rotate=2.5]      - degrees of ghost tilt
 * @param {number} [opts.ghostMaxPx=260]  - cap ghost width
 * @param {number} [opts.ghostScale=0.9]  - shrink factor
 * @param {number} [opts.revealAt]        - ms offset into the glide when to
 *                                           show the landing field in the canvas
 * @param {string} [opts.reveal]          - selector (iframe) to `display:block` mid-drag
 * @param {string} [opts.revealDisplay='block']
 * @param {boolean}[opts.endRing=false]   - draw a ring at drop point
 */
export async function dragField(fromSel, toSel, opts = {}) {
  const {
    wait = 900, rotate = 2.5, ghostMaxPx = 260, ghostScale = 0.9,
    revealAt, reveal, revealDisplay = 'block', endRing = false,
  } = opts;

  const doc = document.querySelector('iframe.ui')?.contentDocument;
  if (!doc) throw new Error('dragField: iframe not mounted');
  const src = doc.querySelector(fromSel);
  const dst = doc.querySelector(toSel);
  if (!src) throw new Error('dragField: src not found: ' + fromSel);
  if (!dst) throw new Error('dragField: dst not found: ' + toSel);

  const srcR = src.getBoundingClientRect();
  const dstR = dst.getBoundingClientRect();
  const z = currentZoom();

  // Ghost sizing — cap width so wide sidebar buttons don't become a slab.
  const gw = Math.min(srcR.width * z * ghostScale, ghostMaxPx);
  const gh = srcR.height * z * ghostScale * (gw / (srcR.width * z * ghostScale));

  // Build ghost
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

  const ghost = document.createElement('div');
  ghost.className = '__drag-ghost';
  ghost.appendChild(clone);

  // Copy computed styles from source → clone (fixes gray-ghost bug).
  // Must run BEFORE the clone is appended off-doc, because getComputedStyle
  // on the clone would return defaults. We read from src (live) and set on
  // clone's inline style. The clone is then appended; inline styles win.
  inlineTreeStyles(src, clone);

  // Position ghost at src center on stage.
  const start = toStage(srcR.left + srcR.width / 2, srcR.top + srcR.height / 2);
  Object.assign(ghost.style, {
    position: 'fixed', zIndex: '700',
    width: gw + 'px', height: gh + 'px',
    left: (start.x - gw / 2) + 'px',
    top:  (start.y - gh / 2) + 'px',
    transform: `rotate(${rotate}deg) scale(1)`,
    transformOrigin: 'center',
    boxShadow: '0 18px 40px rgba(0,0,0,0.30), 0 6px 14px rgba(0,0,0,0.15)',
    borderRadius: '6px',
    overflow: 'hidden',
    pointerEvents: 'none',
    transition: `left ${wait}ms cubic-bezier(.4,.1,.3,1), top ${wait}ms cubic-bezier(.4,.1,.3,1), transform 220ms ease, opacity 220ms ease`,
    opacity: '0',
  });

  // Normalise inner so it fills the ghost box cleanly.
  const inner = ghost.firstElementChild;
  if (inner) {
    inner.style.margin = '0';
    inner.style.width  = '100%';
    inner.style.height = '100%';
    inner.style.boxSizing = 'border-box';
  }
  document.body.appendChild(ghost);

  // Phase 1: cursor arrives at source, ghost fades in + lifts.
  await engineCursor.moveTo(fromSel, { wait: 500 });
  ghost.style.opacity = '0.95';
  ghost.style.transform = `rotate(${rotate}deg) scale(1.06)`;
  await sleep(220);

  // Optional mid-drag reveal: show the landing field so the "drop" isn't
  // faked onto empty canvas. With FLIP, we measure sibling rects before the
  // reveal, reveal the field, re-measure, then animate each sibling back to
  // its original position → transitions them smoothly into the new layout.
  let revealTimer = null;
  if (revealAt && reveal) {
    revealTimer = setTimeout(() => {
      const el = doc.querySelector(reveal);
      if (!el) return;
      const parent = el.parentElement;
      const siblings = parent ? [...parent.children].filter(n => n !== el) : [];
      // FIRST: capture current positions (before reveal).
      const first = new Map(siblings.map(n => [n, n.getBoundingClientRect()]));
      // LAYOUT change: reveal the new field.
      el.style.setProperty('display', revealDisplay, 'important');
      // LAST: capture new positions; INVERT + PLAY each sibling.
      for (const n of siblings) {
        const a = first.get(n);
        const b = n.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top  - b.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        n.style.transition = 'none';
        n.style.transform  = `translate(${dx}px, ${dy}px)`;
        void n.offsetWidth;
        n.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
        n.style.transform  = 'translate(0, 0)';
        setTimeout(() => { n.style.transition = ''; n.style.transform = ''; }, 500);
      }
      // Pop the inserted field in: quick scale-up from 0.96.
      el.style.transformOrigin = 'center';
      el.style.transition = 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease';
      el.style.transform = 'scale(0.96)';
      el.style.opacity = '0.6';
      void el.offsetWidth;
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
      setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }, 420);
    }, revealAt);
  }

  // Phase 2: cursor + ghost glide to destination together.
  const end = toStage(dstR.left + dstR.width / 2, dstR.top + dstR.height / 2);
  ghost.style.left = (end.x - gw / 2) + 'px';
  ghost.style.top  = (end.y - gh / 2) + 'px';
  await engineCursor.moveTo(toSel, { wait });

  // Phase 3: drop — ghost fades/settles.
  ghost.style.transition = 'opacity 260ms ease, transform 260ms ease';
  ghost.style.opacity = '0';
  ghost.style.transform = 'rotate(0deg) scale(0.96)';
  await sleep(220);
  playPop();                                 // tock at the moment of landing
  await sleep(60);
  ghost.remove();

  if (revealTimer) clearTimeout(revealTimer);

  // Drop settle: pop the just-landed field out briefly. Reads as "this is
  // what just landed on your canvas" without the screenshot-y feel of a
  // static highlight ring. Kept short so it doesn't bloat chapter timing.
  if (reveal) {
    const landed = doc.querySelector(reveal);
    if (landed) {
      const { popOut } = await import('./pop-out.js');
      await popOut(reveal, {
        lift: 1.06,
        riseMs: 240, holdMs: 280, fallMs: 320,
      });
    }
  }

  // Optional end-ring (off by default per brief F).
  if (endRing) {
    const { showHighlight } = await import('../engine/overlays-layer.js');
    await showHighlight(toSel, { label: '' });
    await sleep(600);
    const { clearHighlights } = await import('../engine/engine.js');
    await clearHighlights();
  }
}

/**
 * Drag multiple fields in sequence — one after another, into the same canvas.
 * Each item: { from, to, revealAt, reveal, wait, ... }.
 */
export async function dragFieldsSequential(items) {
  for (const it of items) {
    await dragField(it.from, it.to, it);
  }
}
