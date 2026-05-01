// Pop-out card — a 2.5D "this UI block is important" motion.
//
// Clones the target element out of the iframe into the parent document,
// floats it above the stage with a tilt + scale + soft shadow, then
// un-pops back into place. The original stays put (we hide it with
// visibility:hidden while the card is out, to avoid a ghost doubling).
//
// Why clone instead of transforming in-place: the iframe sits inside the
// stage frame with clip-path: inset(...) round ... — any 3D transform on
// an iframe element gets clipped by the mac-frame mask. Cloning into the
// parent doc escapes the clip and casts a shadow over the chrome.
//
// Why a FULL computed-style copy: iframe stylesheets don't apply to the
// parent doc, so an inner icon / label / SVG disappears unless every
// relevant property (font, flex, fill, text-align, grid, etc.) is inlined.
// An earlier version copied a ~30-prop allow-list and inner content either
// vanished or reflowed. The trade-off of copying all ~350 computed props
// is a bit of extra work per node; correctness wins.
//
// Authoring surface:
//   await popOut('#wpforms-panel-notifications', { tilt: 8, lift: 1.08, holdMs: 900 });

import { sleep } from '../engine/engine.js';
import { diag } from '../engine/diag.js';

// One-time import of the iframe's @font-face rules into the parent doc so
// Font Awesome glyphs (and any other icon fonts) render in clones. Without
// this, a pseudo-element with `content: "\f023"` renders as a missing glyph
// because the @font-face was declared inside the iframe's stylesheet.
//
// Catch: @font-face rules use `url(...)` paths relative to the stylesheet
// they live in. Copying the cssText verbatim resolves those URLs against the
// PARENT doc's URL, which 404s. We rewrite every `url(...)` to an absolute
// URL before handing the rule to the parent doc.
let fontsInjected = false;
function resolveUrls(cssText, baseUrl) {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, q, u) => {
    if (!u || /^(data:|blob:)/i.test(u)) return match;
    try {
      return `url("${new URL(u, baseUrl).href}")`;
    } catch { return match; }
  });
}
export async function injectIframeFonts(iframeDoc) {
  if (fontsInjected) return;
  fontsInjected = true;
  const chunks = [];
  const families = new Set();
  for (const sheet of iframeDoc.styleSheets) {
    // The stylesheet's own URL is the correct base for its relative url()s.
    // Fall back to the iframe's baseURI for inline <style> blocks.
    const base = sheet.href || iframeDoc.baseURI;
    try {
      for (const rule of sheet.cssRules || []) {
        if (rule.constructor?.name === 'CSSFontFaceRule' || rule.type === 5) {
          chunks.push(resolveUrls(rule.cssText, base));
          const fam = rule.style?.getPropertyValue('font-family');
          if (fam) families.add(fam.replace(/^['"]|['"]$/g, ''));
        }
      }
    } catch (e) {
      // cross-origin stylesheet — CORS blocks access to cssRules. Skip.
    }
  }
  if (chunks.length) {
    const style = document.createElement('style');
    style.setAttribute('data-popout-fonts', '');
    style.textContent = chunks.join('\n');
    document.head.appendChild(style);
    diag('popOut', 'injected iframe font-faces', { count: chunks.length, families: families.size });
  }
  // @font-face declarations alone don't fetch the font files — the browser
  // waits until a node *uses* the family. That's too late for our clones:
  // the pseudo-span renders once, and if the font isn't in cache the glyph
  // falls back to a missing-char box. Force each family to load now so the
  // clone paints with real glyphs the first time.
  if (document.fonts && families.size) {
    try {
      await Promise.all([...families].map(f =>
        document.fonts.load(`1em "${f}"`).catch(() => {})
      ));
    } catch {}
  }
}

// Copy every enumerated computed property. Mirrors the full CSSStyleDeclaration
// onto the clone's inline style — heavier than an allow-list but correct.
function copyAllComputed(src, dst) {
  const win = src.ownerDocument.defaultView;
  if (!win) return;
  const cs = win.getComputedStyle(src);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    const v = cs.getPropertyValue(prop);
    if (v) dst.style.setProperty(prop, v, cs.getPropertyPriority(prop));
  }
}

// Pseudo-elements (::before / ::after) are CSS artifacts, not DOM nodes.
// Cloning the host element doesn't clone the pseudo, and the pseudo's CSS
// rules live in the iframe stylesheet so they don't apply in the parent doc.
// Solution: read the computed content + styling of each pseudo, and if it's
// renderable, materialize it as a real <span> inserted into the clone.
// Parse a CSS `content` value into its displayed text. Compound values come
// back from getComputedStyle like `"foo" "bar"` or `"\uf1f4" " / "` — naive
// strip-outer-quotes leaves the middle quotes visible as `foo" "bar`. Extract
// every quoted segment and concat.
function parseCssContent(raw) {
  const matches = raw.match(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g);
  if (!matches) return '';
  return matches.map(q => q.slice(1, -1).replace(/\\(.)/g, '$1')).join('');
}

function materializePseudo(srcEl, cloneEl, which) {
  const win = srcEl.ownerDocument.defaultView;
  if (!win) return;
  const cs = win.getComputedStyle(srcEl, which);
  const raw = cs.getPropertyValue('content');
  if (!raw || raw === 'none' || raw === 'normal') return;
  if (/^(url|counter|attr|var)\(/.test(raw)) return;
  const text = parseCssContent(raw);
  if (!text) return;
  // Pure-decoration separators (slashes, bullets, whitespace) come from
  // WPForms' sidebar pills where ::before sits between icon and label. They
  // render as "  /  " blobs in clones because the original flex layout put
  // them in a specific slot we don't reproduce. Skip them.
  if (/^[\s/\\|•·・—–\-,;:.'"]+$/.test(text)) return;
  const span = document.createElement('span');
  span.textContent = text;
  // Copy every computed property from the pseudo so font-family, color,
  // line-height, padding, etc. render the same way.
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    const v = cs.getPropertyValue(prop);
    if (v) span.style.setProperty(prop, v);
  }
  // The pseudo is generated content — make sure it flows like one.
  span.style.setProperty('content', 'normal');
  if (which === '::before') cloneEl.insertBefore(span, cloneEl.firstChild);
  else                      cloneEl.appendChild(span);
}

// Walk src + clone trees in lockstep. cloneNode(true) preserves tree shape,
// so a parallel treeWalker zip works — BUT only if neither tree mutates
// during the walk. materializePseudo() inserts <span> children into the
// clone, so a naive single-pass walk desyncs the moment a pseudo fires.
// Fix: collect pairs in phase 1 (pure walk, no mutation), process in phase 2.
// Phase 2 also prunes clone nodes whose source was display:none/visibility:
// hidden in the iframe — WPForms renders all Name-field formats (Simple /
// First-Last / First-Middle-Last) in the DOM and hides inactive ones via
// parent-class rules that don't cascade into the parent doc.
export function inlineTreeStyles(srcRoot, cloneRoot) {
  const win = srcRoot.ownerDocument.defaultView;

  // Phase 1: collect pairs without mutating either tree.
  const pairs = [[srcRoot, cloneRoot]];
  const srcWalker   = srcRoot.ownerDocument.createTreeWalker(srcRoot,   NodeFilter.SHOW_ELEMENT);
  const cloneWalker = document.createTreeWalker(cloneRoot, NodeFilter.SHOW_ELEMENT);
  let s = srcWalker.nextNode();
  let c = cloneWalker.nextNode();
  while (s && c) {
    pairs.push([s, c]);
    s = srcWalker.nextNode();
    c = cloneWalker.nextNode();
  }

  // Phase 2: style or prune each pair. Don't prune the root even if it's
  // somehow hidden — caller asked for it specifically.
  const hiddenClones = [];
  for (let i = 0; i < pairs.length; i++) {
    const [src, clone] = pairs[i];
    if (win && i > 0) {
      const cs = win.getComputedStyle(src);
      if (cs.display === 'none' || cs.visibility === 'hidden') {
        hiddenClones.push(clone);
        continue;
      }
    }
    copyAllComputed(src, clone);
    materializePseudo(src, clone, '::before');
    materializePseudo(src, clone, '::after');
  }
  hiddenClones.forEach(n => n.remove());
}

// WPForms fields carry builder-only chrome inside them: a rotated
// "Drag to Reorder" handle on the left edge, a "Click to Edit" helper, and
// the small duplicate/delete action buttons on the right. These only make
// sense in the live builder — in a clone floated above the stage they render
// as vertical-text blobs next to the field. Strip them before measuring
// styles so neither the layout nor the visuals inherit the chrome.
export function stripBuilderChrome(root) {
  const kill = root.querySelectorAll([
    '.wpforms-field-helper',
    '[class*="wpforms-field-helper-"]',
    '.wpforms-field-multi-field-menu',
    '.wpforms-field-duplicate',
    '.wpforms-field-delete',
    '.wpforms-debug',
  ].join(','));
  kill.forEach(el => el.remove());
}

// Remove elements that were display:none in the source. WPForms renders
// alternate formats (Name as Simple / First-Last / First-Middle-Last) all
// in the DOM and hides inactive ones via parent-class selectors like
// `.format-selected-simple .wpforms-first-name { display: none }`. Those
// rules don't apply in the parent doc, and even though we inline computed
// styles, some siblings slip through — prune anything that had
// `display: none` on the source side.
export function pruneHiddenInSource(srcRoot, cloneRoot) {
  const win = srcRoot.ownerDocument.defaultView;
  if (!win) return;
  const srcWalker   = srcRoot.ownerDocument.createTreeWalker(srcRoot, NodeFilter.SHOW_ELEMENT);
  const cloneWalker = document.createTreeWalker(cloneRoot, NodeFilter.SHOW_ELEMENT);
  let s = srcWalker.nextNode(), c = cloneWalker.nextNode();
  const toRemove = [];
  while (s && c) {
    const d = win.getComputedStyle(s).display;
    const v = win.getComputedStyle(s).visibility;
    if (d === 'none' || v === 'hidden') toRemove.push(c);
    s = srcWalker.nextNode();
    c = cloneWalker.nextNode();
  }
  toRemove.forEach(n => n.remove());
}

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
 * Pop a UI block out of the iframe as a floating 2.5D card.
 *
 * @param {string} sel              - iframe-scoped selector for the target
 * @param {object} [opts]
 * @param {number} [opts.tilt=6]    - Y-axis tilt in degrees
 * @param {number} [opts.lift=1.06] - scale factor at peak
 * @param {number} [opts.tiltX]     - optional X-axis tilt at peak (deg).
 *                                    Default: derived as -tilt*0.3, which
 *                                    adds a cinematic "looking up at the
 *                                    card" feel without over-rotating.
 * @param {number} [opts.perspective=900] - smaller value = more dramatic 3D
 * @param {number} [opts.riseMs=420]
 * @param {number} [opts.holdMs=800]
 * @param {number} [opts.fallMs=340]
 * @param {boolean}[opts.hideOriginal=true] - hide the in-iframe element while popped
 * @param {boolean}[opts.border=true] - hairline 1px edge for crisp card look
 */
export async function popOut(sel, opts = {}) {
  const {
    tilt = 0, lift = 1.10,
    riseMs = 420, holdMs = 800, fallMs = 340,
    hideOriginal = true,
    shadow = true,
    centerOrigin = false,
    perspective = 700,
    border = true,
    stripTextShadow = false,
  } = opts;
  // tiltX auto-derives as -tilt*0.45 (negative so the card leans toward the
  // viewer). At tilt=0 it's also 0 — pure vertical lift, no rotation. Pass
  // explicit tilt/tiltX on the step if you want rotation.
  const tiltX = opts.tiltX ?? -tilt * 0.45;

  const doc = document.querySelector('iframe.ui')?.contentDocument;
  if (!doc) throw new Error('popOut: iframe not mounted');
  const src = doc.querySelector(sel);
  if (!src) throw new Error('popOut: not found: ' + sel);

  await injectIframeFonts(doc);

  const r = src.getBoundingClientRect();
  const z = currentZoom();
  const pos = toStage(r.left, r.top);
  const cw = r.width * z;
  const ch = r.height * z;

  diag('popOut', sel.slice(0,80), { tilt, lift });

  // Build clone in parent doc.
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  // inlineTreeStyles handles both style inlining AND pruning of hidden-in-
  // source nodes internally (collect pairs first, then mutate). Don't strip
  // chrome before it: the walk needs matching tree shapes on both sides.
  inlineTreeStyles(src, clone);
  stripBuilderChrome(clone);

  // tiltFocus is the "clean rotation, nothing else" variant. WPForms
  // labels/inputs sometimes carry a subtle text-shadow (or a filter drop-
  // shadow), which reads as a halo around glyphs when the clone lifts off
  // the page. Kill both on the clone root and every descendant.
  if (stripTextShadow) {
    clone.style.setProperty('text-shadow', 'none', 'important');
    clone.style.setProperty('filter', 'none', 'important');
    clone.querySelectorAll('*').forEach(n => {
      n.style.setProperty('text-shadow', 'none', 'important');
      n.style.setProperty('filter', 'none', 'important');
    });
  }

  // Position + size the clone to match the source rect on stage. DON'T
  // force 100%/100% on a child wrapper — that breaks children that rely on
  // the original width for their own layout. Instead: scale the whole
  // clone by `z` via CSS transform so internal px values stay native.
  // The tilt/lift transform is applied on top as a second scale factor.
  //
  // Width/height on the clone match the SOURCE's pre-zoom rect. The `z`
  // scale then sizes everything to the current camera. This preserves
  // inner layout perfectly.
  clone.style.position = 'fixed';
  clone.style.margin = '0';
  clone.style.zIndex = '800';
  clone.style.pointerEvents = 'none';
  // Override whatever `position` was just copied from computed style.
  // (copyAllComputed sets `position: static` back to relative/whatever — we
  // need fixed on the root.)
  clone.style.setProperty('position', 'fixed', 'important');

  // Lock the clone root's box to the source's pre-zoom rect. Without this,
  // complex fields (Name split into First/Last, field with "Drag to Reorder"
  // helper) re-run flex/grid layout against some implicit width and collapse
  // — children stack vertically with 1-char-wide columns.
  clone.style.setProperty('width',  r.width  + 'px', 'important');
  clone.style.setProperty('height', r.height + 'px', 'important');

  // Pivot choice:
  // - default (popOut):  top-left origin, so scale+tilt+lift all compose from
  //   the measured rect. Card appears to peel up from where it lives.
  // - centerOrigin (tiltFocus): rotate in place. We shift left/top by half
  //   the *zoomed* rect delta so the center of the scaled clone lands on the
  //   center of the source rect.
  if (centerOrigin) {
    clone.style.left = (pos.x + (cw - r.width) / 2) + 'px';
    clone.style.top  = (pos.y + (ch - r.height) / 2) + 'px';
    clone.style.transformOrigin = '50% 50%';
  } else {
    clone.style.left = pos.x + 'px';
    clone.style.top  = pos.y + 'px';
    clone.style.transformOrigin = '0 0';
  }
  // Shadow stacks:
  // - REST: just the hairline border if enabled, nothing else.
  // - PEAK: hairline border + ambient wide shadow + directional mid shadow
  //   + tight contact shadow. Four layers so the card reads as a real
  //   object floating over the stage, not a flat clone with a blob under it.
  const restBorder = border ? '0 0 0 1px rgba(16,14,10,0.06)' : null;
  const restShadow = restBorder || '0 0 0 rgba(0,0,0,0)';
  const peakShadow = [
    border ? '0 0 0 1px rgba(16,14,10,0.08)'    : null,  // crisp edge
    '0 60px 110px -22px rgba(14,10,6,0.42)',             // deep ambient
    '0 28px 54px -16px rgba(14,10,6,0.30)',              // directional
    '0 10px 22px -10px rgba(14,10,6,0.18)',              // near-field
    '0 2px 6px rgba(14,10,6,0.12)',                      // contact
  ].filter(Boolean).join(', ');

  clone.style.transform = `scale(${z}) perspective(${perspective}px) rotateY(0deg) rotateX(0deg)`;
  clone.style.transition = `transform ${riseMs}ms cubic-bezier(.2,.9,.3,1.1), box-shadow ${riseMs}ms ease, filter ${riseMs}ms ease`;
  clone.style.boxShadow = restShadow;
  clone.style.filter = 'none';
  // backface-visibility prevents the far edge from blurring on strong rotateY.
  clone.style.backfaceVisibility = 'hidden';

  document.body.appendChild(clone);

  // Hide original with visibility (preserves layout) — no ghost double.
  const prevVis = src.style.visibility;
  if (hideOriginal) src.style.visibility = 'hidden';

  // Rise + tilt. Two-axis tilt (rotateY + rotateX) gives a cinematic "card
  // lifting off the page, angled slightly toward you" feel rather than a
  // flat pivot. tiltX is auto-derived from tilt but overridable.
  await sleep(20);
  const combined = z * lift;
  clone.style.transform =
    `scale(${combined}) perspective(${perspective}px) rotateY(${tilt}deg) rotateX(${tiltX}deg)`;
  if (shadow) clone.style.boxShadow = peakShadow;
  await sleep(riseMs + 20);

  // Hold.
  await sleep(holdMs);

  // Fall back.
  clone.style.transition = `transform ${fallMs}ms cubic-bezier(.4,.1,.3,1), box-shadow ${fallMs}ms ease`;
  clone.style.transform = `scale(${z}) perspective(${perspective}px) rotateY(0deg) rotateX(0deg)`;
  clone.style.boxShadow = restShadow;
  await sleep(fallMs + 20);

  // Restore + cleanup.
  if (hideOriginal) src.style.visibility = prevVis;
  clone.remove();
}
