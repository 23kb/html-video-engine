// videos/_shared/pop-out.js
//
// Clone-and-lift DOM helpers used by motion-primitives.js popOut().
//
// Provenance: extracted from runtime/pop-out.js on 2026-08-22 during legacy
// retirement (engine/ + runtime/ removal). These three exports are the only
// functions the new single-HTML path ever imported; the engine-coupled parts
// of the original file (runtime's iframe.ui popOut with hardcoded 1440x900
// stage math, pruneHiddenInSource) were NOT carried over — motion-primitives
// has its own generalized popOut.
//
// Why a FULL computed-style copy: iframe stylesheets don't apply to the
// parent doc, so an inner icon / label / SVG disappears unless every
// relevant property (font, flex, fill, text-align, grid, etc.) is inlined.
// An earlier version copied a ~30-prop allow-list and inner content either
// vanished or reflowed. The trade-off of copying all ~350 computed props
// is a bit of extra work per node; correctness wins.

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
    console.debug('[popOut] injected iframe font-faces', { count: chunks.length, families: families.size });
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
