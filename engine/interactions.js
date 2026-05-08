// Semantic camera + cursor helpers built on top of engine/engine.js.
//
// Every value here is either measured from a live rect or derived from a named
// anchor — no magic zoom levels, no guessed coords. Chapter `effect()` gets
// these via ctx, so authoring reads as: `cursor.clickOn('#save')`, not
// `cursor.moveTo('#save'); await cursor.click();` with a `{x:1200,y:700}`
// park preceding it.
//
// Helpers resolve rects against the iframe's contentDocument. Iframe native
// size is 1440x900 (hardcoded in engine), which we use as the conceptual
// "viewport" for zoom-fill math.

import { zoomTo, cursor as engineCursor, sleep, type as engineType,
         highlight as engineHighlight, clearHighlights } from './engine.js';
import { cfgZoom, cfgInstruction } from '../runtime/overlays-config.js';
import { installOverlayStyles, showHighlight, showInstruction, hideHighlight,
         hideInstruction, ripple as overlayRipple } from './overlays-layer.js';
import { diag, diagError, iframeState } from './diag.js';
import { playClick, playType, playHover } from '../runtime/sfx.js';

const IFRAME_W = 1440;
const IFRAME_H = 900;

function getDoc() {
  const f = document.querySelector('iframe.ui');
  if (!f) throw new Error('[interactions] iframe.ui not mounted');
  return f.contentDocument;
}

function resolve(sel) {
  const doc = getDoc();
  const el = doc.querySelector(sel);
  if (!el) {
    diagError('resolve', new Error('selector did not match'), { sel, iframe: iframeState() });
    throw new Error(`[interactions] selector did not resolve: ${sel}`);
  }
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) {
    diagError('resolve', new Error('zero size'), { sel, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, iframe: iframeState() });
    throw new Error(`[interactions] element has zero size: ${sel}`);
  }
  const style = doc.defaultView.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || +style.opacity === 0) {
    diagError('resolve', new Error('not visible'), { sel, display: style.display, visibility: style.visibility, opacity: style.opacity });
    throw new Error(`[interactions] element not visible: ${sel}`);
  }
  diag('resolve', `ok: ${sel.slice(0,80)}${sel.length>80?'…':''}`, { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, tag: el.tagName, id: el.id || null });
  return { el, rect: r, doc };
}

// ── Camera ───────────────────────────────────────────────────────────────────

/**
 * Zoom so the element's rect occupies `fill` fraction of the iframe viewport
 * (min of width/height axes). Replaces manual `level` + `pad`. `fill` is the
 * only dial — default 0.5 means the element fills half the visible frame.
 */
export async function focusOn(sel, { fill, noScroll = false, smooth = true } = {}) {
  const z = cfgZoom();
  const useFill = fill ?? z.defaultFill;
  const { rect } = resolve(sel);
  const levelX = (useFill * IFRAME_W) / rect.width;
  const levelY = (useFill * IFRAME_H) / rect.height;
  const raw = Math.min(levelX, levelY);
  const afterTrim = raw - z.globalTrim;
  const level = Math.max(z.minLevel, Math.min(afterTrim, z.maxLevel));
  diag('focusOn', `level ${level.toFixed(2)}× (raw ${raw.toFixed(2)} −${z.globalTrim} trim, clamp [${z.minLevel},${z.maxLevel}])`, {
    sel: sel.slice(0,100),
    rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
    fill: useFill,
    iframe: iframeState(),
  });
  return zoomTo([sel], { level, pad: 0, smooth, noScroll, scrollBehavior: smooth ? 'smooth' : 'auto' });
}

// ── Cursor ───────────────────────────────────────────────────────────────────

// Mac-style pointer: black fill, white outline, ~20° tilt. Swaps the engine's
// default SVG in-place. Call after loadSnapshot (which rebuilds the cursor el).
export function installMacCursor() {
  const el = document.querySelector('.cursor');
  if (!el) return;
  el.setAttribute('viewBox', '0 0 24 24');
  el.innerHTML = `
    <path d="M5.5 3.2 V20.8 c0 .45 .54 .67 .85 .35 l4.5-4.5 a.5 .5 0 0 1 .35-.15 h6.4
             a.5 .5 0 0 0 .35-.85 L6.35 2.85 a.5 .5 0 0 0-.85 .36 Z"
          fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
  `;
  // Overlay layer owns highlight/ripple/instruction styles.
  installOverlayStyles();
}

const emitRipple = overlayRipple;

// Draw a ring around `sel` for `hold` ms. Config-driven; callers pass only
// semantic bits (optional label, optional hold).
async function highlightAt(sel, { label = '', hold = 0 } = {}) {
  resolve(sel);
  await showHighlight(sel, { label });
  if (hold) await sleep(hold);
}


// Named parking spots in iframe coordinates. engineCursor.park takes
// iframe-local {x,y}, so we translate anchors once here.
const ANCHORS = {
  'center':     { x: IFRAME_W / 2,      y: IFRAME_H / 2 },
  'top-left':   { x: 60,                y: 60 },
  'top-right':  { x: IFRAME_W - 60,     y: 60 },
  'bottom-left':{ x: 60,                y: IFRAME_H - 60 },
  'bottom-right':{x: IFRAME_W - 60,     y: IFRAME_H - 60 },
  'off-right':  { x: IFRAME_W + 60,     y: IFRAME_H / 2 },
  'off-left':   { x: -60,               y: IFRAME_H / 2 },
  'off-bottom': { x: IFRAME_W / 2,      y: IFRAME_H + 60 },
  'off-top':    { x: IFRAME_W / 2,      y: -60 },
};

async function parkAt(anchor) {
  if (typeof anchor === 'string') {
    if (ANCHORS[anchor]) return engineCursor.park(ANCHORS[anchor]);
    // Treat as selector — park at its center.
    const { rect } = resolve(anchor);
    return engineCursor.park({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }
  return engineCursor.park(anchor);
}

// Pick the off-screen edge nearest to `sel` and park there. Used for the
// "glide in from frame edge" opening, so the first cursor move reads as
// entering the scene rather than popping into existence.
async function parkNearest(sel) {
  const { rect } = resolve(sel);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dLeft   = cx;
  const dRight  = IFRAME_W - cx;
  const dTop    = cy;
  const dBottom = IFRAME_H - cy;
  const min = Math.min(dLeft, dRight, dTop, dBottom);
  let anchor = 'off-right';
  if (min === dLeft)        anchor = 'off-left';
  else if (min === dRight)  anchor = 'off-right';
  else if (min === dTop)    anchor = 'off-top';
  else if (min === dBottom) anchor = 'off-bottom';
  diag('cursor', 'parkNearest: ' + anchor + ' (dL/R/T/B=' +
       [dLeft, dRight, dTop, dBottom].map(n => Math.round(n)).join('/') + ')');
  return engineCursor.park(ANCHORS[anchor]);
}

// Glide via an optional waypoint for natural arcs. engineCursor.moveTo already
// uses a CSS transition, so we just sequence two moves when `via` is given.
async function glideTo(sel, { via, wait = 600 } = {}) {
  resolve(sel);
  if (via) {
    if (typeof via === 'string' && ANCHORS[via]) {
      await engineCursor.moveTo(ANCHORS[via], { wait: Math.max(240, wait / 2) });
    } else if (typeof via === 'string') {
      await engineCursor.moveTo(via, { wait: Math.max(240, wait / 2) });
    } else {
      await engineCursor.moveTo(via, { wait: Math.max(240, wait / 2) });
    }
  }
  return engineCursor.moveTo(sel, { wait });
}

async function clickOn(sel, { dispatch = true, label = '', instruction = '', direction, magnetic = false } = {}) {
  diag('click', `target ${sel.slice(0,80)}`, { instruction: instruction || null, direction: direction || null });
  const { el } = resolve(sel);
  // Arrow stagger: arrow lands first, label writes on `labelDelayMs` later.
  // Gives the eye a moment to lock onto the target before the text appears.
  if (instruction) {
    await showInstruction(sel, instruction, { direction, dwell: false });
    const delay = cfgInstruction().labelDelayMs ?? 220;
    if (delay) await sleep(delay);
  }
  await highlightAt(sel, { label });
  // Magnetic pull: as the cursor starts gliding in, the target scales up a
  // touch to meet it. Settles back to 1.0 on click. Reads as "this button
  // knows the cursor is coming" — subtle affordance, not cartoony.
  let magnetTimer = null;
  const prevTransform = el.style.transform;
  const prevTransition = el.style.transition;
  if (magnetic) {
    el.style.transition = 'transform 260ms cubic-bezier(.2,.8,.2,1)';
    magnetTimer = setTimeout(() => {
      el.style.transform = (prevTransform || '') + ' scale(1.04)';
      playHover();
    }, 280); // fires partway through the 600ms moveTo
  }
  await engineCursor.moveTo(sel, { wait: 600 });
  await emitRipple();
  playClick();
  if (magnetic) {
    clearTimeout(magnetTimer);
    el.style.transition = 'transform 160ms cubic-bezier(.4,.1,.3,1)';
    el.style.transform = prevTransform || '';
  }
  await engineCursor.click();
  if (magnetic) {
    // Restore so the next layout pass isn't fighting our inline transition.
    setTimeout(() => { el.style.transition = prevTransition || ''; }, 200);
  }
  if (dispatch) {
    // Anchor clicks in a snapshot iframe would navigate to a page we don't have
    // (admin.php?page=...), 404, and blank out the content — making it look
    // like the click landed nowhere. Suppress default navigation; keep the
    // event (onclick handlers still fire) so behaviors relying on the click
    // still run.
    try {
      const suppressNav = (e) => e.preventDefault();
      el.addEventListener('click', suppressNav, { capture: true, once: true });
      el.click();
    } catch (e) { diag('click', 'native click() threw (non-fatal)', { err: e.message }); }
  }
  // Let the viewer read the label/arrow after the click lands before we clear.
  // Without this the overlays vanish instantly and authoring feels rushed.
  const postHold = cfgInstruction().postClickHoldMs ?? 650;
  if (postHold) await sleep(postHold);
  await clearHighlights({ fadeOut: 320 });
}

async function click(opts = {}) {
  playClick();
  return engineCursor.click(opts);
}

async function hoverOn(sel, ms = 600, { label = '' } = {}) {
  resolve(sel);
  await highlightAt(sel, { label });
  await engineCursor.moveTo(sel, { wait: 500 });
  await sleep(ms);
  await clearHighlights({ fadeOut: 250 });
}

async function typeInto(sel, text, opts = {}) {
  const { el } = resolve(sel);
  const { label = '', ...typeOpts } = opts;
  await highlightAt(sel, { label });
  await engineCursor.moveTo(sel, { wait: 500 });
  await emitRipple();
  playClick();
  await engineCursor.click();
  try { el.focus(); } catch {}
  // Per-keystroke tick. engineType dispatches 'input' on each character for
  // input/textarea; for contentEditable the event doesn't fire, so we also
  // schedule a timed fallback matching the cps.
  const tickOnInput = () => playType();
  el.addEventListener('input', tickOnInput, true);
  let fallbackTimer = null;
  if (!el.matches('input, textarea')) {
    const perChar = Math.max(20, 1000 / (typeOpts.cps || 14));
    let i = 0;
    fallbackTimer = setInterval(() => {
      if (i >= text.length) { clearInterval(fallbackTimer); return; }
      playType(); i++;
    }, perChar);
  }
  try {
    await engineType(sel, text, typeOpts);
  } finally {
    el.removeEventListener('input', tickOnInput, true);
    if (fallbackTimer) clearInterval(fallbackTimer);
  }
  await clearHighlights({ fadeOut: 250 });
}

async function dragFromTo(srcSel, dstSel, { wait = 600 } = {}) {
  resolve(srcSel); resolve(dstSel);
  await engineCursor.moveTo(srcSel, { wait });
  // Visual drag: press → glide → release. We rely on engine's cursor.click
  // animation for press feedback; actual HTML5 drag events would need the
  // underlying WPForms sortable, which is out of scope for a visual beat.
  playClick();
  await engineCursor.click();
  await engineCursor.moveTo(dstSel, { wait: Math.max(600, wait) });
  playClick();
  await engineCursor.click();
}

/**
 * Litmus test: pick a single radio button, click it, verify state flipped.
 * Throws if the element isn't a checkable input or if state didn't change.
 */
async function toggle(sel) {
  const { el } = resolve(sel);
  if (!(el instanceof el.ownerDocument.defaultView.HTMLInputElement) ||
      (el.type !== 'radio' && el.type !== 'checkbox')) {
    throw new Error(`[interactions] toggle expects radio/checkbox, got ${el.tagName}[type=${el.type}]`);
  }
  const before = el.checked;
  await highlightAt(sel);
  await engineCursor.moveTo(sel, { wait: 600 });
  await emitRipple();
  playClick();
  await engineCursor.click();
  el.checked = !before;
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('change', { bubbles: true }));
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('click', { bubbles: true }));
  // Verify. Radio groups might reflect state via name-group logic — just
  // confirm target is now in the expected state.
  const expected = el.type === 'checkbox' ? !before : true;
  if (el.checked !== expected) {
    throw new Error(`[interactions] toggle failed: ${sel} checked=${el.checked}, expected=${expected}`);
  }
  await clearHighlights({ fadeOut: 250 });
}

// Combined cursor facade — merges the engine's low-level cursor with the
// semantic verbs so chapter code can say `ctx.cursor.clickOn(...)` and also
// keep access to `ctx.cursor.park(...)` / `ctx.cursor.hide()`.
export { highlightAt };

export const cursor = {
  ...engineCursor,
  click,
  parkAt,
  parkNearest,
  glideTo,
  clickOn,
  hoverOn,
  typeInto,
  dragFromTo,
  toggle,
  highlightAt,
  showInstruction,
  hideInstruction,
};
