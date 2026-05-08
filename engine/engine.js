// Scene engine — promise-based primitives for WPForms HTML-capture videos.
// Scenes import from here and read top-to-bottom like a storyboard.

import { pausableSleep } from '../runtime/pause-manager.js';
import { register as registerFrameAdapter, unregister as unregisterFrameAdapter, registry as frameRegistry } from '../runtime/frame-driver.js';

const state = {
  ui: null,           // iframe element
  stage: null,        // container div
  overlay: null,      // overlay div for highlights/cursor/labels
  cursorEl: null,
  iframeW: 1440,
  iframeH: 900,
  stageW: 0,
  stageH: 0,
  zoom: 1,            // current zoom
  tx: 0, ty: 0,       // current translate (post-scale, in iframe coords)
  doc: null,
};

const sleep = (ms) => pausableSleep(ms);

let cameraDriver = null;
let cameraAnimation = null;
let cameraDriverOrigin = 0;

function cameraTransform({ zoom = state.zoom, tx = state.tx, ty = state.ty } = {}) {
  return `scale(${zoom}) translate(${tx / zoom}px, ${ty / zoom}px)`;
}

function applyCameraImmediate({ zoom = state.zoom, tx = state.tx, ty = state.ty } = {}) {
  if (!state.ui) return;
  state.zoom = zoom;
  state.tx = tx;
  state.ty = ty;
  state.ui.style.transition = 'none';
  state.ui.style.transform = cameraTransform({ zoom, tx, ty });
}

function easeProgress(k) {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function ensureCameraDriver() {
  if (!state.ui) return;
  if (cameraDriver && frameRegistry.has('camera')) return;
  cameraDriverOrigin = performance.now() / 1000;
  cameraDriver = {
    id: 'camera',
    duration: 60 * 60,
    seek(t) {
      if (!cameraAnimation) return;
      const now = cameraDriverOrigin + t;
      const k = Math.min(1, Math.max(0, (now - cameraAnimation.start) / cameraAnimation.duration));
      const eased = cameraAnimation.ease(k);
      applyCameraImmediate({
        zoom: cameraAnimation.from.zoom + (cameraAnimation.to.zoom - cameraAnimation.from.zoom) * eased,
        tx: cameraAnimation.from.tx + (cameraAnimation.to.tx - cameraAnimation.from.tx) * eased,
        ty: cameraAnimation.from.ty + (cameraAnimation.to.ty - cameraAnimation.from.ty) * eased,
      });
      if (k >= 1) cameraAnimation = null;
    },
    destroy() {
      cameraAnimation = null;
      cameraDriver = null;
    },
  };
  registerFrameAdapter(cameraDriver);
}

function applyCamera({ zoom = state.zoom, tx = state.tx, ty = state.ty, duration = 0, easing = 'cubic-bezier(0.65, 0, 0.35, 1)' } = {}) {
  if (!state.ui) return;
  ensureCameraDriver();
  if (!duration || duration <= 0) {
    cameraAnimation = null;
    applyCameraImmediate({ zoom, tx, ty });
    return;
  }
  cameraAnimation = {
    start: performance.now() / 1000,
    duration: duration / 1000,
    easing,
    ease: easeProgress,
    from: { zoom: state.zoom, tx: state.tx, ty: state.ty },
    to: { zoom, tx, ty },
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────
export function loadSnapshot(slug, { iframeSize = [1440, 900] } = {}) {
  state.iframeW = iframeSize[0];
  state.iframeH = iframeSize[1];

  document.body.innerHTML = `
    <style>
      html, body { margin:0; background:#1a1a1a; overflow:hidden; width:100vw; height:100vh; }
      .stage { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
      .ui { width:${state.iframeW}px; height:${state.iframeH}px; border:0; background:white;
            flex: 0 0 auto; min-width:${state.iframeW}px; min-height:${state.iframeH}px;
            transform-origin: 0 0; transition: none; }
      .overlay { position:absolute; inset:0; pointer-events:none; }
      .hl { position:absolute; border:3px solid #E27730; border-radius:6px;
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.55); opacity:0;
            transition: opacity 0.4s ease, left 0.6s ease, top 0.6s ease, width 0.6s ease, height 0.6s ease; }
      .hl.on { opacity:1; }
      .label { position:absolute; background:#E27730; color:white; padding:10px 16px; border-radius:6px;
               font:600 18px/1.2 -apple-system, 'Segoe UI', sans-serif;
               box-shadow:0 6px 20px rgba(0,0,0,0.4); white-space:nowrap;
               opacity:0; transform:translateY(-4px);
               transition: opacity 0.4s ease, transform 0.4s ease, left 0.6s ease, top 0.6s ease; }
      .label.on { opacity:1; transform:translateY(0); }
      .label::before { content:''; position:absolute; top:-8px; left:24px;
                       border:8px solid transparent; border-bottom-color:#E27730; border-top:0; }
      .cursor { position:absolute; width:28px; height:28px; z-index:20; pointer-events:none; opacity:0;
                transition: left 0.6s cubic-bezier(0.25,0.1,0.25,1), top 0.6s cubic-bezier(0.25,0.1,0.25,1),
                            opacity 0.25s ease, transform 0.12s ease;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
      .cursor.on { opacity:1; }
      .cursor.click { transform: scale(0.78); }
      .debug-rect { position:absolute; border:2px dashed #00E5FF; pointer-events:none; z-index:9; }
      .pointer { position:absolute; pointer-events:none; z-index:18; opacity:0;
                 transition: opacity 0.35s ease; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); }
      .pointer.on { opacity:1; }
      .pointer.down { animation: ptrBounceDown 0.9s ease-in-out infinite; }
      .pointer.up   { animation: ptrBounceUp   0.9s ease-in-out infinite; }
      .pointer.left { animation: ptrBounceLeft 0.9s ease-in-out infinite; }
      .pointer.right{ animation: ptrBounceRight 0.9s ease-in-out infinite; }
      @keyframes ptrBounceDown  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
      @keyframes ptrBounceUp    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes ptrBounceLeft  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
      @keyframes ptrBounceRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
      .pointer-label { position:absolute; background:#E27730; color:#fff; padding:8px 12px; border-radius:6px;
                       font:600 15px/1.2 -apple-system,'Segoe UI',sans-serif; white-space:nowrap;
                       box-shadow:0 4px 14px rgba(0,0,0,0.35); opacity:0; z-index:19;
                       transition:opacity 0.35s ease; }
      .pointer-label.on { opacity:1; }
    </style>
    <div class="stage">
      <iframe class="ui" src="/snapshots/${slug}/index.html"></iframe>
      <div class="overlay">
        <svg class="cursor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 2L4 20L9 16L12 22L15 20.5L12.5 15L19 15L4 2Z"
                fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;

  state.stage    = document.querySelector('.stage');
  state.ui       = document.querySelector('.ui');
  state.overlay  = document.querySelector('.overlay');
  state.cursorEl = document.querySelector('.cursor');
  state.stageW   = window.innerWidth;
  state.stageH   = window.innerHeight;
  cameraAnimation = null;
  try { unregisterFrameAdapter('camera'); } catch (_) {}
  cameraDriver = null;

  return new Promise((resolve) => {
    state.ui.addEventListener('load', () => {
      state.doc = state.ui.contentDocument;
      applyCameraImmediate({ zoom: 1, tx: 0, ty: 0 });
      ensureCameraDriver();
      installDebugHotkey();
      resolve();
    });
  });
}

export function adoptSnapshotIframe(iframe, { preserveCamera = true } = {}) {
  if (!iframe) throw new Error('adoptSnapshotIframe: iframe required');
  const previous = state.ui;
  iframe.classList.add('ui');
  iframe.classList.remove('preloaded-ui');
  iframe.style.display = '';
  iframe.style.visibility = '';
  iframe.style.pointerEvents = '';
  iframe.style.zIndex = '';
  iframe.style.transformOrigin = '0 0';

  state.ui = iframe;
  state.doc = iframe.contentDocument;
  state.stage = document.querySelector('.stage') || state.stage;
  state.overlay = document.querySelector('.overlay') || state.overlay;
  state.cursorEl = document.querySelector('.cursor') || state.cursorEl;
  state.stageW = window.innerWidth;
  state.stageH = window.innerHeight;

  if (preserveCamera && previous) {
    iframe.style.transition = 'none';
    iframe.style.transform = previous.style.transform || cameraTransform();
    state.zoom = state.zoom || 1;
  } else {
    applyCamera({ zoom: 1, tx: 0, ty: 0, duration: 0 });
  }
  cameraAnimation = null;
  try { unregisterFrameAdapter('camera'); } catch (_) {}
  cameraDriver = null;
  ensureCameraDriver();
  return state;
}

export function setCameraTransform({ zoom = 1, tx = 0, ty = 0, duration = 0, easing } = {}) {
  applyCamera({ zoom, tx, ty, duration, easing });
}

// ── Geometry helpers ─────────────────────────────────────────────────────────
function unionRects(rects) {
  const L = Math.min(...rects.map(b => b.left));
  const T = Math.min(...rects.map(b => b.top));
  const R = Math.max(...rects.map(b => b.right));
  const B = Math.max(...rects.map(b => b.bottom));
  return { left: L, top: T, width: R - L, height: B - T };
}

function resolveTargets(targets) {
  const hits = [];
  for (const sel of targets) {
    const nodes = state.doc.querySelectorAll(sel);
    if (!nodes.length) { console.warn('⚠ No match for:', sel); continue; }
    for (const n of nodes) hits.push({ sel, node: n, rect: n.getBoundingClientRect() });
  }
  return hits;
}

// iframe coord → stage coord (using current zoom/translate)
function toStage(ix, iy) {
  const iframeOriginX = (state.stageW - state.iframeW) / 2;
  const iframeOriginY = (state.stageH - state.iframeH) / 2;
  return {
    x: iframeOriginX + ix * state.zoom + state.tx,
    y: iframeOriginY + iy * state.zoom + state.ty,
  };
}

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * Zoom the iframe so the union of `targets` lands in stage center at `level`.
 * Returns when the transition completes.
 */
export async function zoomTo(targets, { level = 2.4, pad = 10, smooth = false, noScroll = false, scrollBehavior = 'auto', duration = 1200, easing = 'cubic-bezier(0.65, 0, 0.35, 1)' } = {}) {
  const hits = resolveTargets(targets);
  if (!hits.length) throw new Error('zoomTo: no targets resolved');

  console.log('[zoomTo:pre-scroll]', targets[0], 'rect=', hits[0].node.getBoundingClientRect());
  if (!noScroll) hits[0].node.scrollIntoView({ block: 'center', inline: 'center', behavior: scrollBehavior });
  // Smooth scroll needs ~500ms to settle before rects are stable. Auto is instant.
  await sleep(scrollBehavior === 'smooth' ? 500 : 100);
  for (const h of hits) h.rect = h.node.getBoundingClientRect();
  console.log('[zoomTo:post-scroll]', targets[0], 'rect=', hits[0].rect, 'scrollY=', state.ui.contentWindow?.scrollY);

  const u = unionRects(hits.map(h => h.rect));
  const r = { left: u.left - pad, top: u.top - pad, width: u.width + pad * 2, height: u.height + pad * 2 };

  const iframeOriginX = (state.stageW - state.iframeW) / 2;
  const iframeOriginY = (state.stageH - state.iframeH) / 2;
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;

  // Clamp center so zoom doesn't reveal areas outside the iframe viewport.
  const cxClamped = Math.min(Math.max(cx, state.iframeW / (2 * level)), state.iframeW - state.iframeW / (2 * level));
  const cyClamped = Math.min(Math.max(cy, state.iframeH / (2 * level)), state.iframeH - state.iframeH / (2 * level));

  const tx = (state.stageW / 2) - iframeOriginX - cxClamped * level;
  const ty = (state.stageH / 2) - iframeOriginY - cyClamped * level;

  const _ifrR = state.ui.getBoundingClientRect();
  const _bodyR = state.ui.contentDocument?.body?.getBoundingClientRect?.();
  const _scrollY = state.ui.contentWindow?.scrollY;
  console.log('[zoomTo]', targets[0], { rect: r, cx, cy, cxClamped, cyClamped, tx, ty, level, iframeH: state.iframeH, stageW: state.stageW, stageH: state.stageH, ifrElW: _ifrR.width, ifrElH: _ifrR.height, bodyW: _bodyR?.width, bodyH: _bodyR?.height, scrollY: _scrollY });

  // If camera target unchanged (pure scroll-pan within a chapter), skip the long transform sleep.
  const noChange = Math.abs(tx - state.tx) < 1 && Math.abs(ty - state.ty) < 1 && Math.abs(level - state.zoom) < 0.01;

  const moveDuration = smooth ? duration : 0;
  applyCamera({ zoom: level, tx, ty, duration: noChange ? 0 : moveDuration, easing });

  // Stage 7: noChange short-circuit retains a small floor (~10% of duration)
  // so the camera ack feels deliberate without waiting the full transition.
  await sleep(noChange ? 0 : moveDuration);
  return { rect: r, hits };
}

/**
 * Draw a highlight overlay and optional label over a set of target selectors
 * (or over the last zoomed area if `targets` is omitted).
 */
export async function highlight(targets, { label = '', pad = 10, fadeIn = 400 } = {}) {
  let r;
  if (targets) {
    const hits = resolveTargets(targets);
    if (!hits.length) throw new Error('highlight: no targets resolved');
    const u = unionRects(hits.map(h => h.node.getBoundingClientRect()));
    r = { left: u.left - pad, top: u.top - pad, width: u.width + pad * 2, height: u.height + pad * 2 };
  } else {
    throw new Error('highlight: targets required (TODO: auto-reuse last zoomTo rect)');
  }

  const hl = document.createElement('div');
  hl.className = 'hl';
  const p1 = toStage(r.left, r.top);
  Object.assign(hl.style, {
    left: p1.x + 'px', top: p1.y + 'px',
    width:  (r.width  * state.zoom) + 'px',
    height: (r.height * state.zoom) + 'px',
  });
  state.overlay.appendChild(hl);
  // force layout, then animate
  void hl.offsetWidth;
  hl.classList.add('on');

  let lab = null;
  if (label) {
    lab = document.createElement('div');
    lab.className = 'label';
    lab.textContent = label;
    Object.assign(lab.style, {
      left: p1.x + 'px',
      top:  (p1.y + r.height * state.zoom + 14) + 'px',
    });
    state.overlay.appendChild(lab);
    void lab.offsetWidth;
    setTimeout(() => lab.classList.add('on'), 200);
  }

  await sleep(fadeIn + (label ? 400 : 0));
  return { hl, lab };
}

/**
 * Remove all highlights/labels/pointers from the overlay.
 */
export async function clearHighlights({ fadeOut = 300 } = {}) {
  const nodes = state.overlay.querySelectorAll('.hl, .label, .pointer, .pointer-label');
  for (const n of nodes) n.classList.remove('on');
  await sleep(fadeOut);
  for (const n of nodes) n.remove();
}

/**
 * Small animated triangle pointing at a target, with optional label.
 * Bounces rhythmically toward the target. No dark backdrop.
 *
 *   await pointer('.wpforms-show-smart-tags', { direction: 'down', label: 'Click Smart Tags', size: 32, gap: 14 });
 *
 * `direction` = 'up'|'down'|'left'|'right' — which way the triangle tip faces.
 * The pointer is placed opposite to the tip direction relative to the target:
 *   direction:'down' → pointer sits ABOVE target, tip pointing down at it.
 */
export async function pointer(selector, {
  direction = 'down',
  label = '',
  size = 32,
  gap = 10,
  color = '#E27730',
} = {}) {
  const hits = resolveTargets([selector]);
  if (!hits.length) throw new Error('pointer: no target resolved for ' + selector);
  const r = hits[0].node.getBoundingClientRect();

  // Anchor point on the target edge the tip should touch.
  const anchorI = (() => {
    switch (direction) {
      case 'down':  return { x: r.left + r.width/2, y: r.top };       // pointer above, tip ↓
      case 'up':    return { x: r.left + r.width/2, y: r.bottom };    // pointer below, tip ↑
      case 'right': return { x: r.left,             y: r.top + r.height/2 }; // pointer left, tip →
      case 'left':  return { x: r.right,            y: r.top + r.height/2 }; // pointer right, tip ←
    }
  })();
  const anchor = toStage(anchorI.x, anchorI.y);

  // Triangle SVG in the chosen direction. Tip is always at (size/2, size) for 'down' by default;
  // we rotate via a transform on the inner SVG.
  const rot = { down: 0, left: 90, up: 180, right: 270 }[direction];
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24"
         style="transform: rotate(${rot}deg); transform-origin: center center;">
      <polygon points="12,22 2,6 22,6" fill="${color}"
               stroke="#fff" stroke-width="2" stroke-linejoin="round" />
    </svg>
  `;

  // Position the pointer wrapper so the tip sits at `anchor` (offset by gap outward).
  const wrap = document.createElement('div');
  wrap.className = 'pointer ' + direction;
  wrap.innerHTML = svg;

  let left, top;
  switch (direction) {
    case 'down':  left = anchor.x - size/2;       top = anchor.y - size - gap; break;
    case 'up':    left = anchor.x - size/2;       top = anchor.y + gap;        break;
    case 'right': left = anchor.x - size - gap;   top = anchor.y - size/2;     break;
    case 'left':  left = anchor.x + gap;          top = anchor.y - size/2;     break;
  }
  Object.assign(wrap.style, { left: left + 'px', top: top + 'px', width: size + 'px', height: size + 'px' });
  state.overlay.appendChild(wrap);
  void wrap.offsetWidth;
  wrap.classList.add('on');

  let lab = null;
  if (label) {
    lab = document.createElement('div');
    lab.className = 'pointer-label';
    lab.textContent = label;
    let labLeft, labTop;
    switch (direction) {
      case 'down':  labLeft = left + size/2; labTop = top - 36;       break;
      case 'up':    labLeft = left + size/2; labTop = top + size + 8; break;
      case 'right': labLeft = left - 8;      labTop = top + size/2;   break;
      case 'left':  labLeft = left + size + 8; labTop = top + size/2; break;
    }
    Object.assign(lab.style, {
      left: labLeft + 'px',
      top:  labTop + 'px',
      transform:
        (direction === 'down' || direction === 'up' ? 'translateX(-50%) ' : '') +
        (direction === 'right' ? 'translateX(-100%) ' : '') +
        (direction === 'left' || direction === 'right' ? 'translateY(-50%)' : ''),
    });
    state.overlay.appendChild(lab);
    void lab.offsetWidth;
    setTimeout(() => lab.classList.add('on'), 120);
  }

  await sleep(350);
  return { wrap, lab };
}

/**
 * Dim everything in the iframe except the target element + its ancestor chain.
 * Returns a clear() function that restores the UI.
 *
 *   const clear = await spotlight('.wpforms-smart-tags-widget-container');
 *   // ... beat interaction ...
 *   await clear();
 *
 * Opacity compounds through DOM ancestors, so every ancestor of the target is
 * marked "ancestor-keep" (only itself kept opaque, siblings still dim). Target
 * and its descendants stay fully opaque.
 */
export async function spotlight(selector, { dim = 0.08, fade = 400 } = {}) {
  const el = state.doc.querySelector(selector);
  if (!el) throw new Error('spotlight: not found: ' + selector);

  let style = state.doc.getElementById('__spotlight_style');
  if (!style) {
    style = state.doc.createElement('style');
    style.id = '__spotlight_style';
    state.doc.head.appendChild(style);
  }
  style.textContent = `
    body.__spot *              { transition: opacity ${fade}ms ease; }
    body.__spot *              { opacity: ${dim} !important; }
    body.__spot .__spot_chain  { opacity: 1 !important; }
    body.__spot .__spot_keep,
    body.__spot .__spot_keep * { opacity: 1 !important; }
  `;

  // Mark the target + all descendants (via .__spot_keep on target only; CSS handles descendants).
  el.classList.add('__spot_keep');
  // Mark every ancestor up to <body> so the parent chain stays opaque without making siblings opaque.
  let cur = el.parentElement;
  while (cur && cur !== state.doc.body) {
    cur.classList.add('__spot_chain');
    cur = cur.parentElement;
  }
  state.doc.body.classList.add('__spot');
  await sleep(fade);

  return async function clear() {
    state.doc.body.classList.remove('__spot');
    await sleep(fade);
    state.doc.querySelectorAll('.__spot_keep').forEach(n => n.classList.remove('__spot_keep'));
    state.doc.querySelectorAll('.__spot_chain').forEach(n => n.classList.remove('__spot_chain'));
  };
}

// ── Cursor ───────────────────────────────────────────────────────────────────
export const cursor = {
  async park({ x = 1800, y = 1000 } = {}) {
    const s = toStage(x, y);
    const prevTransition = state.cursorEl.style.transition;
    state.cursorEl.classList.remove('on');
    state.cursorEl.style.transition = 'none';
    state.cursorEl.style.left = (s.x - 4) + 'px';
    state.cursorEl.style.top  = (s.y - 2) + 'px';
    void state.cursorEl.offsetWidth;
    state.cursorEl.style.transition = prevTransition;
    state.cursorEl.classList.add('on');
    await sleep(250);
  },

  async moveTo(target, { wait = 600 } = {}) {
    let ix, iy;
    if (typeof target === 'string') {
      const el = state.doc.querySelector(target);
      if (!el) throw new Error('cursor.moveTo: selector not found: ' + target);
      const r = el.getBoundingClientRect();
      ix = r.left + r.width / 2;
      iy = r.top  + r.height / 2;
    } else {
      ix = target.x; iy = target.y;
    }
    const s = toStage(ix, iy);
    state.cursorEl.style.left = (s.x - 4) + 'px';
    state.cursorEl.style.top  = (s.y - 2) + 'px';
    state.cursorEl.classList.add('on');
    await sleep(wait);
  },

  async click({ effect } = {}) {
    state.cursorEl.classList.add('click');
    await sleep(140);
    state.cursorEl.classList.remove('click');

    if (effect) {
      if (effect.remove) {
        const el = state.doc.querySelector(effect.remove);
        if (el) {
          el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          el.style.opacity = '0';
          el.style.transform = 'scale(0.7)';
          await sleep(260);
          el.remove();
        }
      }
      if (effect.toggleClass) {
        const el = state.doc.querySelector(effect.toggleClass.target);
        if (el) el.classList.toggle(effect.toggleClass.name);
        await sleep(150);
      }
    }
  },

  async hide() {
    state.cursorEl.classList.remove('on');
    await sleep(250);
  },

  // Drag a visual clone of `srcSel` to `dstSel`, timed with the cursor so
  // it looks like the cursor is grabbing the element. The clone lives in
  // the parent document (stage layer) so it floats above the iframe and
  // rides on the same coordinate space as the cursor. A real drop isn't
  // attempted — chapters handle the "drop" by revealing/injecting the new
  // field themselves. `ghostMaxPx` caps width to avoid scaled clones
  // dragging a huge slab across the stage when the source is a full-width
  // button in a narrow sidebar.
  async dragGrab(srcSel, dstSel, { wait = 900, rotate = 2.5, ghostMaxPx = 260, ghostScale = 0.9 } = {}) {
    const src = state.doc.querySelector(srcSel);
    const dst = state.doc.querySelector(dstSel);
    if (!src) throw new Error('cursor.dragGrab: src not found: ' + srcSel);
    if (!dst) throw new Error('cursor.dragGrab: dst not found: ' + dstSel);
    const srcR = src.getBoundingClientRect();
    const dstR = dst.getBoundingClientRect();
    const gw = Math.min(srcR.width * state.zoom * ghostScale, ghostMaxPx);
    const gh = srcR.height * state.zoom * ghostScale * (gw / (srcR.width * state.zoom * ghostScale));

    const clone = src.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    const ghost = document.createElement('div');
    ghost.className = '__drag-ghost';
    ghost.appendChild(clone);

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
      background: '#fff',
      pointerEvents: 'none',
      transition: `left ${wait}ms cubic-bezier(.4,.1,.3,1), top ${wait}ms cubic-bezier(.4,.1,.3,1), transform 220ms ease, opacity 220ms ease`,
      opacity: '0',
    });
    const inner = ghost.firstElementChild;
    if (inner) {
      inner.style.margin = '0';
      inner.style.width  = '100%';
      inner.style.height = '100%';
      inner.style.boxSizing = 'border-box';
    }
    document.body.appendChild(ghost);

    // Phase 1: cursor arrives at source, ghost fades in + slight lift.
    await this.moveTo(srcSel, { wait: 500 });
    ghost.style.opacity = '0.95';
    ghost.style.transform = `rotate(${rotate}deg) scale(1.06)`;
    await sleep(220);

    // Phase 2: cursor and ghost glide together to destination.
    const end = toStage(dstR.left + dstR.width / 2, dstR.top + dstR.height / 2);
    ghost.style.left = (end.x - gw / 2) + 'px';
    ghost.style.top  = (end.y - gh / 2) + 'px';
    await this.moveTo(dstSel, { wait });

    // Phase 3: drop — ghost fades/settles.
    ghost.style.transition = 'opacity 260ms ease, transform 260ms ease';
    ghost.style.opacity = '0';
    ghost.style.transform = 'rotate(0deg) scale(0.96)';
    await sleep(280);
    ghost.remove();
  },
};

// ── Typewriter ───────────────────────────────────────────────────────────────
export async function type(target, text, { cps = 14, clear = true } = {}) {
  const el = state.doc.querySelector(target);
  if (!el) throw new Error('type: selector not found: ' + target);
  const isInput = el.matches('input, textarea');
  if (clear) {
    if (isInput) el.value = '';
    else         el.innerHTML = '';
  }
  const perChar = Math.max(20, 1000 / cps);
  for (const ch of text) {
    if (isInput) {
      el.value = (el.value || '') + ch;
      el.dispatchEvent(new state.doc.defaultView.Event('input', { bubbles: true }));
    } else {
      el.appendChild(state.doc.createTextNode(ch));
    }
    await sleep(perChar);
  }
}

// ── Debug overlay (press 'd') ────────────────────────────────────────────────
function installDebugHotkey() {
  const tracked = [];
  const originalResolve = resolveTargets;
  // wrap to track last call
  window.__engineTracked = tracked;

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'd') return;
    document.querySelectorAll('.debug-rect').forEach(n => n.remove());
    // Highlight every element currently in overlay .hl as a debug rect
    const hls = document.querySelectorAll('.hl');
    for (const h of hls) {
      const r = h.getBoundingClientRect();
      const dr = document.createElement('div');
      dr.className = 'debug-rect';
      Object.assign(dr.style, {
        left: (r.left - 4) + 'px', top: (r.top - 4) + 'px',
        width: (r.width + 8) + 'px', height: (r.height + 8) + 'px',
      });
      state.overlay.appendChild(dr);
    }
  });
}

// Small helper if scenes want it
export { sleep };

// Read-only snapshot of camera state for diag/bug-report consumers.
export function cameraState() {
  return { zoom: state.zoom, tx: state.tx, ty: state.ty, iframeW: state.iframeW, iframeH: state.iframeH };
}

// ── Compositor: runScene(beats) ──────────────────────────────────────────────
// Each beat is a DECLARATION of end-state, not an imperative command.
// Transitions between beats are computed based on chapter continuity:
//   - Same chapter as previous beat → smooth pan (content glides via smooth scroll)
//   - Different chapter              → dolly-out to 1x, brief hold, dolly-in (real animation)
//   - transition: 'hard-cut'         → skip animation entirely
//
// Beat shape:
//   {
//     id: 'string',                              // for logs / reordering reference
//     chapter: 'string',                         // beats in same chapter flow together
//     camera: { focus: selector|[sels], level, pad, noScroll },
//     spotlight: selector,                        // optional — dim everything else during the beat
//     overlays: [                                 // what's drawn on top of the UI
//       { highlight: selector, label, pad },
//       { highlights: [selectors], label, pad },  // union of multiple
//       { pointer: selector, direction, label, size, gap },
//     ],
//     labelDwell: seconds,                        // hold overlays before effect runs (default 0)
//     effect: async ({ doc, cursor, type, sleep, clearSpot, zoomTo }) => { ... },
//     duration: seconds,                          // trailing dwell after overlays+effect (default 2.5)
//     transition: 'hard-cut' | undefined,
//   }
export async function runScene(beats) {
  let prev = null;
  for (const beat of beats) {
    const sameChapter = prev && prev.chapter === beat.chapter && beat.transition !== 'hard-cut';

    // Clear any overlays left over from previous beat
    await clearHighlights({ fadeOut: sameChapter ? 180 : 280 });

    // Chapter break → real animated dolly-out to 1x, hold briefly, then dolly in below.
    if (!sameChapter && prev && state.zoom !== 1) {
      const { runChapterBreak } = await import('../runtime/transitions.js');
      await runChapterBreak('dolly');
    }

    // Camera move:
    //   same-chapter → smooth pan (content glides under a fixed transform via smooth scroll)
    //   chapter break → animated dolly-in from the 1x hold above
    const cam = beat.camera || {};
    if (cam.focus) {
      await zoomTo(Array.isArray(cam.focus) ? cam.focus : [cam.focus], {
        level:          cam.level ?? 2.2,
        pad:            cam.pad   ?? 14,
        smooth:         cam.smooth ?? sameChapter,
        noScroll:       cam.noScroll ?? false,
        scrollBehavior: cam.scrollBehavior ?? (sameChapter ? 'smooth' : 'auto'),
      });
    }

    // Spotlight — dim everything except target for the label phase
    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
    const clearSpot = async () => {
      if (spotHandle) { await spotHandle(); spotHandle = null; }
    };

    // Render overlays
    for (const o of (beat.overlays || [])) {
      if (o.pointer)         await pointer(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
      else if (o.highlights) await highlight(o.highlights, { label: o.label, pad: o.pad ?? 10 });
      else if (o.highlight)  await highlight([o.highlight], { label: o.label, pad: o.pad ?? 10 });
    }

    // Label dwell — hold overlays before interaction, so the viewer can read them
    if (beat.labelDwell) await sleep(beat.labelDwell * 1000);

    // Interaction effect: by default clear labels so they don't clash with the
    // action; beats can opt into `keepLabels: true` to hold labels visible through
    // the effect (e.g. keep "Value: Urgent" on screen while char-by-char typing).
    if (beat.effect) {
      if (!beat.keepLabels) await clearHighlights();
      await beat.effect({ doc: state.doc, cursor, type, sleep, clearSpot, zoomTo });
    }

    // Trailing dwell
    await sleep((beat.duration ?? 2.5) * 1000);

    // Ensure spotlight is cleared before the next beat even if effect didn't
    await clearSpot();

    prev = beat;
  }
}
