#!/usr/bin/env node
// manifest.mjs <slug> [--root dir] [--viewport WxH] [--dpr 2] [--min-size 8] [--select <css>] [--all]
//
// Layer manifest for tools that are not HTML (After Effects, Figma, Remotion). Serves the frozen
// snapshot the way gates.mjs does, opens it in Playwright at the viewport, walks the rendered DOM
// and writes:
//   manifest/layers.json      page size, fonts, layers in paint order
//   manifest/raster/<id>.png  one PNG per raster element (img, svg, canvas, background image) at --dpr
//   manifest/page@<dpr>x.png  the full page
//
// Why (a real After Effects build off a snapshot): text layers anchored at centre for every
// justification, fonts resolved by name on the machine, hidden and off-screen elements came
// through, no per-element assets existed. One coordinate space (page CSS px) is what made the
// 3D rig possible.
//
// COORDINATE SPACE (the one rule): every box is CSS px in PAGE coordinates (0,0 = top-left of the
// document, not of the viewport). Rasters are the same boxes at --dpr. Paths are relative to the
// snapshot folder (assets/..., manifest/...).
//
// Z-ORDER, best effort from the DOM: layers[] is paint order, bottom first, and z is the index.
// Each element gets a key from its stacking-context ancestors (z-index, then positioned-before-
// in-flow, then document order) and its own document order; layers sort by that key. Floats,
// inline-vs-block interleaving and mix-blend-mode are not modelled.
//
// TEXT: an element with direct text nodes is ONE text layer. Inline descendants that paint nothing
// of their own (span / a / strong ...) fold into its content; the style is the element's own, so
// mixed inline styles come through as the first run's style. Inline descendants with their own
// paint (a badge with a background, an img, an svg) are separate layers. ::before / ::after
// content is not emitted: a pseudo-element has no readable box.
//
// VISIBILITY: display:none, visibility:hidden, opacity 0 (own or inherited), zero size, fully
// off-page, fully clipped by an overflow ancestor, or under --min-size in BOTH dimensions is
// skipped (the walk still descends, except under display:none and opacity 0). --all keeps such
// elements with visible:false and no raster.
//
// RASTER: an element screenshot is what is painted inside that box. For a background-image element
// with children, the children are hidden for the shot so the PNG is the background alone and the
// children stay native layers on top.

import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs, usage, ensureDir, readJson, writeJson, nowIso, snapshotDir, loadPlaywright, startStaticServer,
} from './lib.mjs';

const USAGE = 'usage: node scripts/manifest.mjs <slug> [--root dir] [--viewport WxH] [--dpr 2] [--min-size 8] [--select <css>] [--all]';

let args;
try {
  args = parseArgs(process.argv.slice(2), { root: 'string', viewport: 'string', dpr: 'number', 'min-size': 'number', select: 'string', all: 'boolean', help: 'boolean' });
} catch (e) { usage(e.message + '\n' + USAGE, 2); }
if (args.help) usage(USAGE, 0);
if (args._.length !== 1) usage(USAGE, 2);

const slug = args._[0];
const root = path.resolve(args.root || 'snapshots');
const dir = snapshotDir(root, slug);
const indexPath = path.join(dir, 'index.html');
if (!fs.existsSync(indexPath)) { console.error(`no snapshot at ${indexPath}`); process.exit(1); }

let meta = {};
try { meta = readJson(path.join(dir, 'meta.json')); } catch { /* meta is optional */ }
let viewport = (meta.viewport && meta.viewport.width && meta.viewport.height) ? { width: meta.viewport.width, height: meta.viewport.height } : { width: 1440, height: 900 };
if (args.viewport) {
  const [w, h] = args.viewport.split('x').map(Number);
  if (!w || !h) usage('bad --viewport, expected WxH', 2);
  viewport = { width: w, height: h };
}
const dpr = Number.isFinite(args.dpr) && args.dpr > 0 ? args.dpr : 2;
const minSize = Number.isFinite(args['min-size']) && args['min-size'] >= 0 ? args['min-size'] : 8;
const select = args.select || null;
const all = Boolean(args.all);

const outDir = path.join(dir, 'manifest');
const rasterDir = path.join(outDir, 'raster');
// Rasters from an earlier run (another --select, another --dpr) would outlive their layers.
fs.rmSync(rasterDir, { recursive: true, force: true });
ensureDir(rasterDir);
for (const f of fs.readdirSync(outDir)) if (/^page@\d+(\.\d+)?x\.png$/.test(f)) fs.rmSync(path.join(outDir, f), { force: true });

const { chromium } = await loadPlaywright();
const server = await startStaticServer(root);
const browser = await chromium.launch({ headless: true });
let exitCode = 0;
try {
  // bypassCSP as gates.mjs: a leftover CSP <meta> would blank inline styles and the walk would measure a broken page.
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, bypassCSP: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageUrl = `${server.url}/${slug}/index.html`;
  await page.goto(pageUrl, { waitUntil: 'load', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  const settle = await page.evaluate(() => { const v = document.body && document.body.getAttribute('data-paint-settle'); return v ? Math.min(parseInt(v, 10) || 0, 5000) : 0; });
  await page.waitForTimeout(600 + settle);

  const walk = await page.evaluate(walkPage, { select, minSize, all });
  if (walk.error) throw new Error(walk.error);
  const { layers, fonts, notes } = walk;

  // paint order
  layers.sort((a, b) => cmpKey(a.key, b.key));
  layers.forEach((l, i) => { l.z = i; delete l.key; });

  // natural size of background images (the walk is synchronous; a decode is not)
  const bgSrcs = [...new Set(layers.filter(l => l.image && l.image.kind === 'background' && l.image.abs).map(l => l.image.abs))];
  const natural = bgSrcs.length ? await page.evaluate(async srcs => {
    const out = {};
    await Promise.all(srcs.map(s => new Promise(res => {
      const im = new Image();
      const t = setTimeout(res, 3000);
      im.onload = () => { clearTimeout(t); out[s] = [im.naturalWidth, im.naturalHeight]; res(); };
      im.onerror = () => { clearTimeout(t); res(); };
      im.src = s;
    })));
    return out;
  }, bgSrcs) : {};
  for (const l of layers) {
    if (l.image && l.image.abs) { const n = natural[l.image.abs]; if (n) { l.image.natural_w = n[0]; l.image.natural_h = n[1]; } delete l.image.abs; }
  }

  // rasters: full page first, then one element screenshot per raster layer
  await page.screenshot({ path: path.join(outDir, `page@${dpr}x.png`), fullPage: true, animations: 'disabled' });
  let rasters = 0;
  const rasterFails = [];
  for (const l of layers) {
    if (!l.raster) continue;
    const sel = `[data-manifest-id="${l.id}"]`;
    try {
      if (l._hideChildren) await page.evaluate(s => { for (const c of document.querySelector(s).children) { c.setAttribute('data-manifest-vis', c.style.visibility || ''); c.style.visibility = 'hidden'; } }, sel);
      await page.locator(sel).first().screenshot({ path: path.join(rasterDir, l.id + '.png'), animations: 'disabled', timeout: 8000 });
      rasters++;
    } catch (e) {
      l.raster = null;
      rasterFails.push(`${l.id}: ${String(e.message || e).split('\n')[0].slice(0, 100)}`);
    } finally {
      if (l._hideChildren) await page.evaluate(s => { for (const c of document.querySelector(s).children) { c.style.visibility = c.getAttribute('data-manifest-vis') || ''; c.removeAttribute('data-manifest-vis'); } }, sel).catch(() => {});
    }
    delete l._hideChildren;
  }
  if (rasterFails.length) notes.push(`${rasterFails.length} raster(s) failed: ${rasterFails.slice(0, 5).join(' | ')}${rasterFails.length > 5 ? ' ...' : ''}`);

  const manifest = {
    _about: {
      generated_by: 'html-snapshot manifest.mjs',
      generated_at: nowIso(),
      slug,
      select,
      coordinate_space: 'CSS px, page coordinates (0,0 = document top-left, not the viewport). Rasters are the same boxes at page.dpr. Paths are relative to the snapshot folder.',
      z_order: 'layers[] is paint order, bottom first; z is the index. Best effort from the DOM: stacking-context ancestors (z-index, positioned before in-flow, document order), then document order. Floats, inline/block interleaving and blend modes are not modelled.',
      text: 'An element with direct text nodes is one layer; inline descendants that paint nothing fold into its content with the element\'s own (first run\'s) style. ::before / ::after content is not emitted. measured_width_px is the longest line measured on a canvas with the same font; baseline_offset is from the top of box to the first line\'s baseline.',
      visibility: all ? 'every element is listed; visible:false marks the skipped ones' : 'display:none, visibility:hidden, opacity 0, zero size, off-page, clipped and specks under --min-size are not listed (--all lists them)',
    },
    page: { css_width: walk.page.w, css_height: walk.page.h, viewport, dpr },
    fonts,
    layers,
  };
  const outPath = path.join(outDir, 'layers.json');
  writeJson(outPath, manifest);

  const textCount = layers.filter(l => l.type === 'text').length;
  console.log(`${slug}: ${layers.length} layers (${textCount} text, ${rasters} rasters), ${fonts.length} fonts, page ${walk.page.w}x${walk.page.h} css px @${dpr}x${select ? `, subtree ${select}` : ''}`);
  for (const n of notes) console.log('  note: ' + n);
  console.log('wrote ' + outPath);
} catch (e) {
  console.error('manifest failed: ' + (e.message || e));
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close();
}
process.exit(exitCode);

// ---------------------------------------------------------------------------

// Lexicographic compare of stacking keys (arrays of [z, layer, docIndex]); a prefix sorts first,
// so a container always precedes its descendants.
function cmpKey(a, b) {
  const n = Math.min(a.length, b.length);
  for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) if (a[k][j] !== b[k][j]) return a[k][j] - b[k][j];
  return a.length - b.length;
}

// Runs inside the page. Self-contained: Playwright serializes the function.
function walkPage({ select, minSize, all }) {
  const rootEl = select ? document.querySelector(select) : document.body;
  if (!rootEl) return { error: `--select "${select}" matches nothing in the snapshot` };

  const SKIP = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template', 'head', 'title', 'br', 'wbr', 'source', 'track', 'param', 'area', 'map', 'col', 'colgroup', 'datalist', 'option', 'optgroup', 'dialog']);
  const LEAF = new Set(['img', 'svg', 'canvas', 'video', 'audio', 'select', 'input', 'textarea', 'iframe', 'object', 'embed', 'meter', 'progress']);
  const INLINE_TEXT_TAGS = new Set(['input', 'select', 'textarea']);
  const pageW = document.documentElement.scrollWidth, pageH = document.documentElement.scrollHeight;
  const sx = window.scrollX, sy = window.scrollY;
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  const ctx = document.createElement('canvas').getContext('2d');
  const lhCache = new Map(), famCache = new Map(), fileCache = new Map();
  const fonts = new Map();
  const layers = [];
  const ids = new Set();
  const notes = [];
  let docIndex = 0, skipped = 0;

  const round = v => Math.round(v * 100) / 100;
  const px = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const alpha = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const rel = u => (u && u.startsWith(base)) ? u.slice(base.length) : u;
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clean = s => String(s).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'el';
  const uniqueId = base0 => { let id = base0, n = 1; while (ids.has(id)) id = `${base0}~${++n}`; ids.add(id); return id; };
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height }; };

  const isStackingRoot = (cs, parentCs) => {
    if (cs.position !== 'static' && cs.zIndex !== 'auto') return true;
    if (cs.position === 'fixed' || cs.position === 'sticky') return true;
    if (parseFloat(cs.opacity) < 1) return true;
    if (cs.transform !== 'none' || cs.filter !== 'none' || (cs.backdropFilter && cs.backdropFilter !== 'none')) return true;
    if (cs.isolation === 'isolate' || cs.mixBlendMode !== 'normal') return true;
    if (/transform|opacity|filter/.test(cs.willChange)) return true;
    if (/paint|layout|strict|content/.test(cs.contain)) return true;
    if (cs.clipPath !== 'none' || cs.perspective !== 'none' || (cs.maskImage && cs.maskImage !== 'none')) return true;
    if (cs.zIndex !== 'auto' && parentCs && /flex|grid/.test(parentCs.display)) return true;
    return false;
  };

  // An inline descendant that paints nothing of its own folds into the parent's text run.
  const foldable = child => {
    const tag = child.tagName.toLowerCase();
    if (SKIP.has(tag) || LEAF.has(tag)) return tag === 'br';
    const cs = getComputedStyle(child);
    if (cs.display !== 'inline') return false;
    if (alpha(cs.backgroundColor) > 0 || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none') return false;
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (px(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none') return false;
    return true;
  };
  // Direct text plus folded inline descendants; returns { text, firstNode }.
  const collectText = el => {
    let text = '', firstNode = null;
    const rec = node => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { if (!firstNode && /\S/.test(c.data)) firstNode = c; text += c.data; }
        else if (c.nodeType === 1) { if (c.tagName.toLowerCase() === 'br') text += '\n'; else if (foldable(c) && getComputedStyle(c).display !== 'none') rec(c); }
      }
    };
    rec(el);
    return { text, firstNode };
  };
  const hasDirectText = el => { for (const c of el.childNodes) if (c.nodeType === 3 && /\S/.test(c.data)) return true; return false; };
  const normalizeText = (text, cs) => {
    const ws = cs.whiteSpace;
    if (ws === 'pre' || ws === 'pre-wrap' || ws === 'break-spaces') text = text.replace(/\r\n?/g, '\n');
    else if (ws === 'pre-line') text = text.replace(/[ \t\f]+/g, ' ').replace(/ ?\n ?/g, '\n');
    else text = text.replace(/\s+/g, ' ');
    text = text.trim();
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
    else if (cs.textTransform === 'capitalize') text = text.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
    return text;
  };

  // Which family in the stack actually renders: the one whose width matches the stack's width and
  // differs from the monospace fallback (a missing family falls through to monospace).
  const resolveFamily = (stack, weight, style) => {
    const key = stack + '|' + weight + '|' + style;
    if (famCache.has(key)) return famCache.get(key);
    const fams = stack.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    const probe = 'The quick brown fox jumps 0123456789';
    const w = f => { ctx.font = `${style} ${weight} 32px ${f}`; return ctx.measureText(probe).width; };
    const target = w(stack), mono = w('monospace');
    let resolved = null;
    for (const f of fams) {
      const q = /[\s"']/.test(f) ? `"${f}"` : f;
      const wf = w(`${q}, monospace`);
      if (Math.abs(wf - target) < 0.05 && (f === 'monospace' || Math.abs(wf - mono) > 0.05)) { resolved = f; break; }
    }
    if (!resolved) resolved = fams.find(f => /^(serif|sans-serif|monospace|system-ui|cursive|fantasy)$/i.test(f)) || fams[0] || 'sans-serif';
    famCache.set(key, resolved);
    return resolved;
  };
  // The localized font file for a family/weight/style from the page's @font-face rules, else null.
  const fontFile = (family, weight, style) => {
    const key = family + '|' + weight + '|' + style;
    if (fileCache.has(key)) return fileCache.get(key);
    const rules = [];
    const scan = list => { for (const r of list) { try { if (r instanceof CSSFontFaceRule) rules.push(r); else if (r.cssRules) scan(r.cssRules); } catch { /* cross-origin */ } } };
    for (const sh of document.styleSheets) { try { scan(sh.cssRules); } catch { /* cross-origin */ } }
    const fam = family.toLowerCase();
    const weightRange = v => { v = (v || 'normal').trim(); if (v === 'normal') return [400, 400]; if (v === 'bold') return [700, 700]; const p = v.split(/\s+/).map(Number); return p.length > 1 ? [p[0], p[1]] : [p[0], p[0]]; };
    let best = null, bestScore = Infinity;
    for (const r of rules) {
      if ((r.style.fontFamily || '').replace(/^["']|["']$/g, '').toLowerCase() !== fam) continue;
      const [lo, hi] = weightRange(r.style.fontWeight);
      const st = (r.style.fontStyle || 'normal').split(/\s+/)[0];
      const score = (weight < lo ? lo - weight : weight > hi ? weight - hi : 0) + (st === style ? 0 : 1000);
      if (score < bestScore) { best = r; bestScore = score; }
    }
    let file = null;
    if (best) {
      const srcs = [...(best.style.src || '').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)(?:\s*format\(\s*["']?([^"')]+)["']?\s*\))?/g)].map(m => ({ url: m[1], fmt: (m[2] || '').toLowerCase() }));
      const rank = s => s.url.startsWith('data:') ? 6 : /woff2/.test(s.fmt + s.url) ? 0 : /woff/.test(s.fmt + s.url) ? 1 : /ttf|truetype/.test(s.fmt + s.url) ? 2 : /otf|opentype/.test(s.fmt + s.url) ? 3 : /eot|embedded/.test(s.fmt + s.url) ? 4 : 5;
      srcs.sort((a, b) => rank(a) - rank(b));
      if (srcs.length) { const u = srcs[0].url; file = u.startsWith('data:') ? 'data-uri' : (/assets\/[^"')?\s]+/.exec(u) || [rel(u)])[0]; }
    }
    fileCache.set(key, file);
    return file;
  };
  const normalLineHeight = fontStr => {
    if (lhCache.has(fontStr)) return lhCache.get(fontStr);
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;line-height:normal;padding:0;border:0;margin:0';
    d.style.font = fontStr; d.textContent = 'Hg';
    document.body.appendChild(d);
    const h = d.getBoundingClientRect().height;
    d.remove();
    lhCache.set(fontStr, h);
    return h;
  };

  const borderOf = cs => {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => { const st = cs['border' + s + 'Style']; const w = px(cs['border' + s + 'Width']); const c = cs['border' + s + 'Color']; return (st !== 'none' && st !== 'hidden' && w > 0 && alpha(c) > 0) ? { w, c } : { w: 0, c: null }; });
    const on = sides.filter(s => s.w > 0);
    if (!on.length) return null;
    const width = Math.max(...on.map(s => s.w));
    const uniform = on.length === 4 && sides.every(s => s.w === width && s.c === on[0].c);
    return uniform ? { color: on[0].c, width } : { color: on[0].c, width, sides: sides.map(s => s.w) };
  };
  const radiusOf = cs => {
    const r = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(c => px(cs['border' + c + 'Radius']));
    return r.every(v => v === r[0]) ? r[0] : r;
  };

  const visit = (el, parentId, parentSel, ctxKey, group, clip, effOpacity, parentCs, nthPath) => {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return 0;
    const i = docIndex++;
    const cs = getComputedStyle(el);
    const box = rectOf(el);
    const displayNone = cs.display === 'none';
    const opacity = parseFloat(cs.opacity);
    const eff = effOpacity * (Number.isFinite(opacity) ? opacity : 1);
    const zero = box.w < 0.5 || box.h < 0.5;
    const offPage = !intersects(box, { x: 0, y: 0, w: pageW, h: pageH });
    const clipped = Boolean(clip) && !intersects(box, clip);
    const speck = box.w < minSize && box.h < minSize;
    const visible = !displayNone && cs.visibility === 'visible' && eff > 0 && !zero && !offPage && !clipped && !speck;
    if (!visible) skipped++;
    const listed = visible || all;
    // nothing under display:none or opacity 0 has a paint; an unlisted element still lets its children through
    if (!listed && (displayNone || eff <= 0)) return 0;

    // stacking key: [z, layer, docIndex] per level; a root's key IS its context so it precedes its descendants
    const isRoot = isStackingRoot(cs, parentCs);
    const positioned = cs.position !== 'static';
    const z = cs.zIndex === 'auto' ? 0 : (parseInt(cs.zIndex, 10) || 0);
    let myCtx = ctxKey, myGroup = group, key;
    if (isRoot) { myCtx = ctxKey.concat([[z, 1, i]]); myGroup = null; key = myCtx; }
    else { if (positioned) myGroup = [0, 1, i]; key = ctxKey.concat([myGroup || [0, 0, i], [0, 0, i]]); }

    // identity
    const domId = el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1 ? el.id : null;
    const nth = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) + 1 : 1;
    const myPath = el === rootEl ? nthPath : nthPath.concat(nth);
    const id = listed ? uniqueId(domId ? clean(domId) : `${tag}_${myPath.length ? myPath.join('-') : 'root'}`) : null;
    const selector = domId ? '#' + CSS.escape(domId) : (el === rootEl ? (select || 'body') : `${parentSel} > ${tag}:nth-child(${nth})`);

    // paint
    const bgImage = cs.backgroundImage;
    const bgUrl = (/url\(\s*["']?([^"')]+)["']?\s*\)/.exec(bgImage) || [])[1] || null;
    const gradient = /gradient\(/.test(bgImage) ? bgImage : null;
    const bgColor = alpha(cs.backgroundColor) > 0 ? cs.backgroundColor : null;
    const stroke = borderOf(cs);
    const shadow = cs.boxShadow !== 'none' ? cs.boxShadow : null;
    const paints = Boolean(bgColor || bgUrl || gradient || stroke || shadow);

    // type + text + image
    let type = null, text = null, image = null, hideChildren = false;
    const fontSize = px(cs.fontSize);
    if (tag === 'img' || tag === 'canvas' || tag === 'video') {
      type = 'image';
      const src = tag === 'img' ? (el.getAttribute('src') || rel(el.currentSrc) || null) : tag === 'video' ? (el.getAttribute('poster') || el.getAttribute('src') || null) : null;
      image = { kind: tag, src: src && src.startsWith('data:') ? src.slice(0, src.indexOf(',') + 1) + '...' : src, natural_w: tag === 'img' ? el.naturalWidth : tag === 'canvas' ? el.width : (el.videoWidth || null), natural_h: tag === 'img' ? el.naturalHeight : tag === 'canvas' ? el.height : (el.videoHeight || null), object_fit: cs.objectFit };
    } else if (tag === 'svg') {
      type = 'svg';
      const use = el.querySelector('use');
      const href = use ? (use.getAttribute('href') || use.getAttribute('xlink:href')) : null;
      const vb = (el.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      image = { kind: 'svg', src: href, natural_w: vb.length === 4 ? vb[2] : round(box.w), natural_h: vb.length === 4 ? vb[3] : round(box.h), object_fit: null, view_box: vb.length === 4 ? el.getAttribute('viewBox') : null };
    } else if (bgUrl) {
      type = 'image';
      image = { kind: 'background', src: rel(bgUrl).startsWith('data:') ? 'data:...' : rel(bgUrl), abs: bgUrl.startsWith('data:') ? null : bgUrl, natural_w: null, natural_h: null, object_fit: null, background: { size: cs.backgroundSize, position: cs.backgroundPosition, repeat: cs.backgroundRepeat } };
      hideChildren = el.children.length > 0;
    }
    let content = null, firstNode = null;
    if (!type || (type === 'image' && image.kind === 'background')) {
      if (INLINE_TEXT_TAGS.has(tag)) {
        const it = (el.getAttribute('type') || 'text').toLowerCase();
        if (tag === 'select') content = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
        else if (tag === 'textarea') content = el.value;
        else if (!/^(checkbox|radio|range|color|file|hidden|image)$/.test(it)) content = el.value || el.placeholder || '';
        if (content !== null) content = normalizeText(content, cs);
      } else if (hasDirectText(el)) {
        const c = collectText(el); firstNode = c.firstNode; content = normalizeText(c.text, cs);
      }
    }
    if (content && fontSize >= 1) {
      type = type === 'image' ? 'image' : 'text';
      const weight = parseInt(cs.fontWeight, 10) || 400, style = cs.fontStyle.split(/\s+/)[0], stack = cs.fontFamily;
      const family = resolveFamily(stack, weight, style);
      const fontStr = `${style} ${weight} ${fontSize}px ${stack}`;
      ctx.font = fontStr;
      const ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
      if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px';
      const measured = Math.max(...content.split('\n').map(l => ctx.measureText(l).width));
      const m = ctx.measureText('Hg');
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      const lh = cs.lineHeight === 'normal' ? normalLineHeight(fontStr) : px(cs.lineHeight);
      const pad = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
      const bt = px(cs.borderTopWidth), bb = px(cs.borderBottomWidth);
      let baseline = null;
      if (firstNode) { const rg = document.createRange(); rg.selectNodeContents(firstNode); const rr = rg.getBoundingClientRect(); if (rr.height) baseline = rr.top + sy - box.y + asc; }
      if (baseline === null) {
        // no text node to measure (an input's value): single-line controls centre the text in the content box, a textarea starts at the top
        const contentH = box.h - pad[0] - pad[2] - bt - bb;
        baseline = tag === 'textarea' ? bt + pad[0] + (lh - (asc + desc)) / 2 + asc : bt + pad[0] + (contentH - (asc + desc)) / 2 + asc;
      }
      const usingPlaceholder = INLINE_TEXT_TAGS.has(tag) && tag !== 'select' && !el.value && Boolean(el.placeholder);
      let color = cs.color;
      if (usingPlaceholder) { try { color = getComputedStyle(el, '::placeholder').color || color; } catch { /* keep */ } }
      let align = cs.textAlign;
      if (align === 'start') align = cs.direction === 'rtl' ? 'right' : 'left';
      else if (align === 'end') align = cs.direction === 'rtl' ? 'left' : 'right';
      text = { content, font_family: family, font_size_px: round(fontSize), font_weight: weight, font_style: style, color, line_height_px: round(lh), letter_spacing_px: ls, text_align: align, measured_width_px: round(measured), baseline_offset: round(baseline), padding: pad.map(round) };
      if (usingPlaceholder) text.placeholder = true;
      const fkey = `${family}|${weight}|${style}`;
      if (!fonts.has(fkey)) { const file = fontFile(family, weight, style); fonts.set(fkey, { family, weight, style, file: file || 'system:' + family, stack }); }
    }

    let layer = null, slot = -1;
    if (listed) {
      layer = {
        id, selector, type, tag, parent: parentId, z: null, box: { x: round(box.x), y: round(box.y), w: round(box.w), h: round(box.h) }, visible,
        opacity: Number.isFinite(opacity) ? opacity : 1, fill: gradient || bgColor, stroke, radius: radiusOf(cs), shadow, text, image, raster: null, key,
      };
      if (visible && image) { layer.raster = `manifest/raster/${id}.png`; el.setAttribute('data-manifest-id', id); if (hideChildren) layer._hideChildren = true; }
      slot = layers.length;
      layers.push(layer);
    }

    // descend: a leaf never; an element with a text run only into children that are not folded; else every child.
    // An unlisted element hands its children to the nearest listed ancestor.
    const textRun = firstNode !== null;
    let childCount = 0;
    if (!LEAF.has(tag) && !displayNone && eff > 0) {
      const clipsChildren = /hidden|clip|auto|scroll/.test(cs.overflowX + ' ' + cs.overflowY);
      const childClip = clipsChildren ? (clip ? { x: Math.max(clip.x, box.x), y: Math.max(clip.y, box.y), w: Math.min(clip.x + clip.w, box.x + box.w) - Math.max(clip.x, box.x), h: Math.min(clip.y + clip.h, box.y + box.h) - Math.max(clip.y, box.y) } : box) : clip;
      for (const c of el.children) {
        if (textRun && foldable(c)) continue;
        childCount += visit(c, listed ? id : parentId, selector, myCtx, myGroup, childClip, eff, cs, myPath);
      }
    }
    if (!type) {
      if (childCount) type = 'container';
      else if (paints) type = 'shape';
      else { if (listed) { layers.splice(slot, 1); ids.delete(id); } return childCount; }
    }
    if (layer) layer.type = type;
    return childCount + (listed ? 1 : 0);
  };

  visit(rootEl, null, null, [], null, null, 1, rootEl.parentElement ? getComputedStyle(rootEl.parentElement) : null, []);
  if (skipped) notes.push(`${skipped} element(s) ${all ? 'listed with visible:false' : 'not listed'}: hidden, zero-size, off-page, clipped or under --min-size ${minSize}`);
  const fontList = [...fonts.values()].sort((a, b) => a.family.localeCompare(b.family) || a.weight - b.weight || a.style.localeCompare(b.style));
  return { page: { w: pageW, h: pageH }, fonts: fontList, layers, notes };
}
