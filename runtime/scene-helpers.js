// Shared primitives for the authoring runner (and, by extension, any shell
// that wants to reuse the litmus HUD / cover / snapshot-swap patterns).
//
// Everything here came out of the cff-chapter-*.html boilerplate. Each helper
// is the ONE blessed implementation — chapters must call these rather than
// re-inlining the patterns.
//
// Nothing in here knows about the defineChapter descriptor shape. That layer
// lives in chapter-runner.js.

import { loadSnapshot as engineLoadSnapshot, sleep, cursor as engineCursor } from '../engine/engine.js';
import { installMacCursor, cursor } from '../engine/interactions.js';
import { installOverlayStyles } from '../engine/overlays-layer.js';
import { diag, diagDump, iframeState, subscribeDiag } from '../engine/diag.js';
import { cameraState } from '../engine/engine.js';
import { mountMeshBg, mountWatermark as _mountWatermark } from '../scenes/shared.js';
import { runSwapTransition } from './transitions.js';

export function iframeDoc() {
  return document.querySelector('iframe.ui')?.contentDocument ?? null;
}

// ── Flashbang killer ────────────────────────────────────────────────────────
// engine.loadSnapshot() does `document.body.innerHTML = ...` which wipes any
// mounted cover mid-load. A <style> in <head> survives the body-wipe — we use
// it to hide the raw iframe + overlays during load + prep, then remove it once
// our cream cover is safely in place.
const FLASH_STYLE_ID = 'flashbang-killer';
export function installFlashGuard() {
  if (document.getElementById(FLASH_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = FLASH_STYLE_ID;
  s.textContent =
    'html, body { background: var(--cover-color, #FAF6EF) !important; }' +
    'iframe.ui, .stage, .overlay-root, .mac-frame, .mesh-bg { visibility: hidden !important; }';
  document.head.appendChild(s);
}
export function removeFlashGuard() {
  document.getElementById(FLASH_STYLE_ID)?.remove();
}

// Anchor clicks in snapshot iframes 404-blank the page (memory:
// feedback_anchor_click_nav.md). Install a capture-phase listener that
// eats the default navigation while letting click listeners still fire.
export function suppressAnchorNav(doc) {
  if (!doc || doc.__suppressAnchorNavInstalled) return;
  doc.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) e.preventDefault();
  }, true);
  doc.__suppressAnchorNavInstalled = true;
}

// ── Mac-frame + title bar + mesh bg (stage chrome) ──────────────────────────
// engine.loadSnapshot body-wipes the page, so chrome must re-mount after
// every boot/swap. Ported from runtime/player.js mountStageChrome.
export function mountStageChrome(title) {
  document.body.classList.add('with-stage-chrome');
  if (!document.querySelector('.mac-frame')) {
    const f = document.createElement('div');
    f.className = 'mac-frame';
    document.body.appendChild(f);
  }
  if (!document.querySelector('.mac-chrome')) {
    const c = document.createElement('div');
    c.className = 'mac-chrome';
    c.innerHTML =
      '<div class="tl r"></div><div class="tl y"></div><div class="tl g"></div>' +
      '<div class="title">' + (title || 'WPForms') + '</div>';
    document.body.appendChild(c);
  }
}

// ── Watermark (mount once per video, re-mount after every body-wipe) ────────
// Set `window.__wpfVideoTitle` and `window.__wpfWatermarkOn` at the runChain
// layer; boot/swap check these flags so the flag-driven state survives the
// body-wipe that destroys the DOM elements.
export function setWatermarkEnabled(on) {
  window.__wpfWatermarkOn = !!on;
  if (on) _mountWatermark();
}
export function unmountWatermark() {
  window.__wpfWatermarkOn = false;
  const el = document.getElementById('wpf-watermark');
  if (!el) return;
  el.classList.remove('on');
  setTimeout(() => el.remove(), 700);
}

// ── Per-snapshot sanitize pass (optional `sanitize/<slug>.js` default export)
// Swallows missing modules — sanitize is opt-in per snapshot.
async function applySanitize(slug) {
  try {
    const mod = await import('../sanitize/' + slug + '.js');
    const doc = iframeDoc();
    if (doc && mod.default) mod.default(doc);
  } catch (e) {
    const msg = String(e);
    if (!msg.includes('Failed to fetch') && !msg.includes('dynamically imported')) {
      console.warn('[sanitize] ' + slug, e);
    }
  }
}

// ── Cream cover (hides the raw iframe during load / snapshot swap) ──────────
export function mountCover({ id = 'prep-cover', z = 650 } = {}) {
  const c = document.createElement('div');
  c.id = id;
  c.style.cssText =
    'position:fixed;inset:0;z-index:' + z + ';background:var(--cover-color, #FAF6EF);' +
    'opacity:1;transition:opacity 420ms ease-out;pointer-events:none;';
  document.body.appendChild(c);
  void c.offsetWidth;
  return c;
}

export async function dropCover(c, { holdAfter = 450 } = {}) {
  if (!c) return;
  c.style.opacity = '0';
  await sleep(holdAfter);
  c.remove();
}

// ── Start gate (solo mode only — chain mode uses its own) ───────────────────
export async function waitForStartClick(label, { onClick } = {}) {
  const g = document.createElement('div');
  g.id = 'start';
  g.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'z-index:2000;background:rgba(0,0,0,0.7);';
  g.innerHTML =
    '<button id="go" style="background:#E27730;color:white;border:0;' +
    'padding:14px 28px;border-radius:6px;font:600 16px/1 -apple-system,sans-serif;' +
    'cursor:pointer;">▶ ' + label + '</button>';
  document.body.appendChild(g);
  await new Promise(r => g.querySelector('#go').addEventListener('click', () => {
    // Fire onClick INSIDE the user gesture — needed to unlock BGM autoplay.
    try { onClick?.(); } catch (e) { console.warn(e); }
    r();
  }, { once: true }));
  g.remove();
}

// ── HUD (step checklist + error tail) ───────────────────────────────────────
const HUD_CSS =
  '#hud { position:fixed;left:16px;top:16px;z-index:1000;' +
  'background:rgba(20,20,24,0.92);color:#f7f7f9;' +
  'padding:10px 14px;border-radius:8px;max-width:620px;' +
  'font:500 12px/1.5 -apple-system,"Segoe UI",sans-serif; }' +
  '#hud b { color:#ffe8a3; } ' +
  '#hud .row.ok { color:#7ee787; } ' +
  '#hud .row.err { color:#ff7b72; } ' +
  '#hud .crumbs { margin-top:8px;padding-top:6px;border-top:1px solid #333;' +
  'font:10px/1.35 ui-monospace,monospace;color:#c9d1d9;opacity:0.85; }' +
  '#hud .crumbs .c { display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }' +
  '#hud .crumbs .c.err { color:#ff7b72; }' +
  '#hud pre { margin:8px 0 0;font:10px/1.3 ui-monospace,monospace;' +
  'color:#ffbaba;white-space:pre-wrap;max-width:620px; }';

export function createHud({ title, steps }) {
  if (!document.getElementById('hud-css')) {
    const s = document.createElement('style');
    s.id = 'hud-css';
    s.textContent = HUD_CSS;
    document.head.appendChild(s);
  }
  let hud = document.getElementById('hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hud';
    document.body.appendChild(hud);
  }
  const state = Object.fromEntries(steps.map(s => [s.id, { ok: null, msg: '' }]));
  const render = () => {
    const rows =
      '<div><b>' + title + '</b></div>' +
      steps.map((s, i) => {
        const st = state[s.id];
        const cls = st.ok === true ? 'ok' : st.ok === false ? 'err' : '';
        const tick = st.ok === true ? ' — ✓' : st.ok === false ? ' — ✗' : '';
        return '<div class="row ' + cls + '">' + (i + 1) + '. ' + s.label + tick +
               (st.msg ? ' ' + st.msg : '') + '</div>';
      }).join('');
    const tail = diagDump().slice(-8).map(e => {
      const isErr = /error|ERROR/.test(e.tag) || /^ERROR/.test(e.msg);
      const safeMsg = (e.msg || '').replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;');
      return '<span class="c' + (isErr ? ' err' : '') + '">' +
        e.t + ' [' + e.tag + '] ' + safeMsg + '</span>';
    }).join('');
    const pres = hud.querySelectorAll('pre');
    hud.innerHTML = rows + '<div class="crumbs">' + tail + '</div>';
    // Preserve any error <pre> blocks appendError wrote.
    for (const p of pres) hud.appendChild(p);
  };
  render();
  // Live breadcrumb tail: re-render on every diag entry. One subscription
  // per HUD; the previous HUD's subscription is dropped when .remove() runs.
  const unsub = subscribeDiag(() => render());
  return {
    mark(id, ok, msg) {
      if (!state[id]) return;
      state[id] = { ok, msg: msg || '' };
      render();
    },
    appendError(message) {
      const pre = document.createElement('pre');
      pre.textContent = message;
      hud.appendChild(pre);
    },
    state,
    remove: () => { unsub(); hud.remove(); },
  };
}

// ── Bug report: structured dump on verb/chapter throw ──────────────────────
// Phase 5 debug-loop contract. One copy-pasteable console.group with
// everything needed to triage without re-running. Consumers:
//   - the operator copies the group into the next session → agent has full context.
//   - HUD breadcrumb tail already renders live; here we pin an <pre>
//     summary so a screenshot carries the essentials too.
export function errorReport(hud, err, { slug, pendingId, descriptor } = {}) {
  console.error(err);
  if (hud && pendingId) hud.mark(pendingId, false, err.message);

  const crumbs = diagDump();
  // Walk backwards to find the failing verb's step + context.
  const lastVerb = [...crumbs].reverse().find(e => e.tag === 'verb:start' || e.tag === 'verb:error');
  const step = lastVerb?.data?.step ?? null;
  const snapshot = lastVerb?.data?.snapshot ?? descriptor?.snapshot ?? null;
  const catalogPath = snapshot ? '/snapshots/' + snapshot + '/catalog.md' : null;

  // Resolve target rects where possible — silent on misses (that's the point).
  const doc = iframeDoc();
  const rectOf = (sel) => {
    if (!sel || !doc) return null;
    try {
      const el = doc.querySelector(sel);
      if (!el) return { selector: sel, resolved: false };
      const r = el.getBoundingClientRect();
      return { selector: sel, resolved: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
    } catch (e) { return { selector: sel, resolved: false, error: e.message }; }
  };
  const targets = step ? {
    target:           rectOf(step.target),
    from:             rectOf(step.from),
    to:               rectOf(step.to),
    highlightTarget:  rectOf(step.highlightTarget),
    highlights:       Array.isArray(step.highlights) ? step.highlights.map(rectOf) : null,
  } : null;

  const report = {
    chapterSlug: slug,
    snapshot,
    catalogPath,
    pendingId,
    step,
    targets,
    camera: safeCall(cameraState),
    iframe: iframeState(),
    error: { message: err?.message || String(err), stack: err?.stack || null },
    breadcrumbs: crumbs.slice(-16),
  };

  console.group('%c[litmus] BUG REPORT — copy everything below', 'color:#ff5a5a;font-weight:700');
  console.log('chapter:', report.chapterSlug, '| snapshot:', report.snapshot);
  console.log('catalog:', report.catalogPath, '(read this first — do not assume DOM)');
  console.log('step:', step);
  console.log('targets:', targets);
  console.log('camera:', report.camera);
  console.log('iframe:', report.iframe);
  console.log('error:', err);
  console.log('breadcrumbs (last 16):');
  for (const entry of report.breadcrumbs) {
    console.log('  ' + entry.t + ' [' + entry.tag + '] ' + entry.msg, entry.data ?? '');
  }
  console.log('--- JSON (single object, copy-paste) ---');
  try { console.log(JSON.stringify(report, bugReportReplacer, 2)); } catch (e) { console.log('(stringify failed:', e.message, ')'); }
  console.groupEnd();

  if (hud) {
    const lines = [
      '[BUG REPORT] ' + (err?.message || err),
      'chapter: ' + slug + '  snapshot: ' + snapshot,
      'catalog: ' + catalogPath,
      'step.id: ' + (step?.id ?? '?') + '  do: ' + (step?.do ?? '?'),
    ];
    hud.appendError(lines.join('\n'));
  }
}

function safeCall(fn) { try { return fn(); } catch { return null; } }
function bugReportReplacer(_k, v) {
  if (v instanceof Error) return { message: v.message, stack: v.stack };
  if (typeof v === 'function') return '[fn]';
  return v;
}

// ── Selector-resolves guard (item M): fail fast before a step runs ──────────
export function resolveOrThrow(sel, { label = '' } = {}) {
  const doc = iframeDoc();
  if (!doc) throw new Error('resolveOrThrow: iframe not mounted');
  const el = doc.querySelector(sel);
  if (!el) {
    throw new Error('resolveOrThrow: selector missing in snapshot' +
      (label ? ' (' + label + ')' : '') + ': ' + sel);
  }
  return el;
}

// ── Snapshot load / swap under cover ────────────────────────────────────────
// First-time load. engine.loadSnapshot does `document.body.innerHTML = ...`
// which wipes ANY element mounted before it — including a pre-cover. So we
// mount the real cover AFTER the body wipe, and run prep under it before
// dropping. This is the same two-cover dance transitionSnapshots uses, minus
// the pre-cover (which there's no visible content to cover on first boot).
export async function bootSnapshot(slug, { prep, videoTitle } = {}) {
  diag('scene', 'bootSnapshot ' + slug);
  installFlashGuard();                          // hide raw iframe + overlays through body-wipe
  await engineLoadSnapshot(slug);
  const cover = mountCover({ z: 999 });
  // Stage chrome + mesh bg must re-mount after every body-wipe.
  mountMeshBg();
  mountStageChrome(videoTitle || window.__wpfVideoTitle);
  if (window.__wpfWatermarkOn) _mountWatermark();
  installOverlayStyles();
  installMacCursor();
  // Park cursor offscreen + hide, so the first moveTo slides the cursor IN
  // from off-right rather than popping into existence at the target.
  try { await cursor.parkAt('off-right'); } catch {}
  await engineCursor.hide();
  suppressAnchorNav(iframeDoc());
  await applySanitize(slug);
  if (prep) await prep(iframeDoc());
  await sleep(200);
  removeFlashGuard();                           // cover is holding; safe to reveal iframe
  await dropCover(cover);
}

// Mid-chapter snapshot swap. Delegates to runSwapTransition so per-chapter
// `swapStyle` picks the visual treatment (cover | fast | whip | push).
// The inner `doSwap` does the invariant work: flash guard, engine load,
// stage-chrome re-mount, sanitize, prep. The transition wraps it with the
// style-specific cover/fade/blur/slide.
export async function swapSnapshot(slug, { prep, videoTitle, style = 'cover' } = {}) {
  diag('scene', 'swapSnapshot → ' + slug + ' (style=' + style + ')');
  const doSwap = async () => {
    installFlashGuard();                // survive body-wipe
    await engineLoadSnapshot(slug);
    mountMeshBg();
    mountStageChrome(videoTitle || window.__wpfVideoTitle);
    if (window.__wpfWatermarkOn) _mountWatermark();
    installOverlayStyles();
    installMacCursor();
    await engineCursor.hide();
    suppressAnchorNav(iframeDoc());
    await applySanitize(slug);
    if (prep) await prep(iframeDoc());
    removeFlashGuard();
  };
  await runSwapTransition(style, doSwap);
}

// ── WPForms-specific UI mirrors (moved out of chapter boilerplate) ──────────
// The real builder does these with JS that won't run in a dead snapshot.
// We mirror the end state directly.

/**
 * Search-box filter on the Add Fields sidebar. Hides every add-field button
 * and group heading except the one whose id matches `keepBtnId`.
 */
export function applySearchFilter(doc, keepBtnId) {
  if (!doc) return;
  const groups = doc.querySelectorAll('.wpforms-add-fields-group');
  for (const g of groups) {
    const btns = g.querySelectorAll('.wpforms-add-fields-button');
    let anyVisible = false;
    for (const b of btns) {
      const keep = b.id === keepBtnId;
      b.style.setProperty('display', keep ? 'block' : 'none', 'important');
      if (keep) anyVisible = true;
    }
    g.style.setProperty('display', anyVisible ? 'block' : 'none', 'important');
  }
  doc.querySelector('.wpforms-search-fields-input-close')?.classList.add('active');
}

/**
 * Swap the active Settings sub-section (Confirmations / Notifications / etc).
 * Sets `.active` on both the sidebar nav row and the panel content section,
 * AND mirrors the inline `display` style WPForms uses in production. The
 * snapshot ships the previously-active section with inline `display: block`
 * and the rest hidden via CSS — toggling `.active` alone leaves the original
 * section painted on top because inline style wins on specificity. The
 * inline-style flip is what makes the swap actually visible.
 */
export function activateSection(doc, section) {
  if (!doc) return;
  for (const a of doc.querySelectorAll('.wpforms-panel-sidebar-section')) a.classList.remove('active');
  doc.querySelector('.wpforms-panel-sidebar-section-' + section)?.classList.add('active');
  for (const sec of doc.querySelectorAll('.wpforms-panel-content-section')) {
    sec.classList.remove('active');
    sec.style.setProperty('display', 'none', 'important');
  }
  const target = doc.querySelector('.wpforms-panel-content-section-' + section);
  if (target) {
    target.classList.add('active');
    target.style.setProperty('display', 'block', 'important');
  }
}

/**
 * Region-only top-level builder panel switch (Fields / Settings / Marketing /
 * Payments / Revisions / Setup). The builder snapshot already contains every
 * `.wpforms-panel` block in the DOM; only the active one is `display: block`
 * via the `.active` class. WPForms in production toggles the same class on
 * panel button click — this mirror reproduces that without a full snapshot
 * reload, which is what made the old settings-tour beat read like a slideshow.
 *
 *   activatePanel(doc, 'settings');     // → flips wpforms-panel + tab button
 *   activatePanel(doc, 'fields');
 *
 * Returns the activated panel element, or null if the panel name isn't
 * present in the snapshot DOM.
 */
export function activatePanel(doc, panel) {
  if (!doc) return null;
  // Toggle .active on every .wpforms-panel container AND mirror the inline
  // display style. WPForms ships only the active panel as `display: block`
  // and hides others via CSS — the swap won't read visually until both are
  // flipped.
  for (const p of doc.querySelectorAll('.wpforms-panel')) {
    p.classList.remove('active');
    p.style.setProperty('display', 'none', 'important');
  }
  const target = doc.getElementById('wpforms-panel-' + panel);
  if (target) {
    target.classList.add('active');
    target.style.setProperty('display', 'block', 'important');
    // Size the activated panel for layout. The Fields panel has explicit
    // width/height in CSS; other panels don't, so they collapse to height:0
    // and break focusOn. Mirror the iframe's working size so subsequent
    // camera moves can measure the panel.
    target.style.setProperty('min-height', '100vh', 'important');
    target.style.setProperty('width', '100%', 'important');
  }
  // Toolbar tab buttons (they hold .active for the highlighted tab). Match
  // by `data-panel` so we catch every panel button regardless of which
  // wrapper the snapshot puts them in.
  for (const b of doc.querySelectorAll('button[data-panel]')) {
    b.classList.remove('active');
  }
  doc.querySelector('button[data-panel="' + panel + '"]')?.classList.add('active');
  return target;
}

// ── Toast overlay (runtime-owned chrome, never touches snapshot DOM) ────────
// Phase 5 step 3 `toast` verb. Mounts a styled pill on the stage layer; if
// `anchor` is passed, pins it near the matching iframe element. Returns a
// dismiss fn so the verb can hold for `duration` then clean up.
const TOAST_CSS =
  '.wpf-toast { position:fixed;z-index:1400;right:24px;top:24px;' +
  'background:rgba(20,20,24,0.95);color:#f7f7f9;padding:10px 14px;' +
  'border-radius:8px;font:500 13px/1.3 -apple-system,"Segoe UI",sans-serif;' +
  'box-shadow:0 6px 18px rgba(0,0,0,0.25);opacity:0;transform:translateY(-6px);' +
  'transition:opacity 180ms ease-out,transform 180ms ease-out; }' +
  '.wpf-toast.on { opacity:1;transform:translateY(0); }' +
  '.wpf-toast.success { background:#1f6f43; }' +
  '.wpf-toast.error   { background:#a33636; }';

export function mountToast({ text, variant = 'info', duration = 1800, anchor = null } = {}) {
  if (!document.getElementById('wpf-toast-css')) {
    const s = document.createElement('style');
    s.id = 'wpf-toast-css';
    s.textContent = TOAST_CSS;
    document.head.appendChild(s);
  }
  const t = document.createElement('div');
  t.className = 'wpf-toast ' + variant;
  t.textContent = text;
  document.body.appendChild(t);
  // Anchor positioning: resolve iframe element → stage coords.
  if (anchor) {
    try {
      const el = iframeDoc()?.querySelector(anchor);
      const iframe = document.querySelector('iframe.ui');
      if (el && iframe) {
        const ir = iframe.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        t.style.right = 'auto';
        t.style.left = Math.round(ir.left + er.left) + 'px';
        t.style.top  = Math.round(ir.top  + er.top  - 36) + 'px';
      }
    } catch {}
  }
  void t.offsetWidth;
  t.classList.add('on');
  return () => {
    t.classList.remove('on');
    setTimeout(() => t.remove(), 220);
  };
}

// ── Chapter-done signal (chain mode listener uses this) ─────────────────────
export function signalChapterDone(slug) {
  try { window.postMessage({ type: 'chapter-done', slug }, '*'); } catch {}
}

export function signalChapterFailed(slug, message) {
  try { window.postMessage({ type: 'chapter-failed', slug, message }, '*'); } catch {}
}
