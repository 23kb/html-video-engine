#!/usr/bin/env node
// freeze.mjs <url> <slug> [options] — Path A (public page) and Path C (your own site with a
// driveable session). Freezes the live page into <root>/<slug>/index.html + assets/, a
// live-reference.png for the paint-diff gate, and meta.json.
//
//   --root <dir>            snapshots root (default ./snapshots)
//   --viewport 1440x900     capture viewport
//   --login <plan.json>     Path C: { url, steps[], success_url } run before the target (credentials as ${ENV:NAME})
//   --steps <plan.json>     steps to drive the target page into the wanted state (see steps.mjs)
//   --wait-for <sel>        a RENDERED element that proves the state (never body/html)
//   --wait-url <regex>      for redirect flows: freeze only when the URL matches
//   --settle <ms>           extra wait before freezing (default 1500)
//   --inline                embed assets as data URIs instead of writing assets/
//   --redact <regex>        extra redaction pattern (repeatable)
//   --strip <sel>           remove elements before freezing (repeatable) — chrome the film never shows
//   --preset wp-admin | wp-frontend   optional strip presets for WordPress pages (repeatable)
//   --keep-iframes          keep <iframe> elements (default: removed, src recorded in meta)
//   --force                 write even when the title looks like an error / login page
//   --headed                show the browser (debugging a plan)
//
// What gets baked, and the defect each bake prevents:
//   visibility bake       hidden overlays resurrected expanded once scripts were gone (only the element
//                         that TURNS hidden is stamped; visibility inherits, stamping the subtree empties it;
//                         an element a :checked / :hover / :focus rule can show is left to the stylesheet —
//                         an inline display:none on a switch's "On" label beats the :checked rule and the
//                         label goes blank when the film flips the switch)
//   CSSOM materialization JS-injected rules (insertRule / adoptedStyleSheets) live only in the CSSOM
//   property -> attribute typed values, checked radios, picked options revert to server defaults otherwise
//   stylesheet inlining   every <link rel=stylesheet> becomes <style data-origin>; url() refs localized
//   asset localization    every referenced image / font / css localized under assets/ (or data URIs)
//   canvas -> img         reported: the still is right and the region is dead on camera
//   scripts stripped      a snapshot is a fossil; behaviour is re-added by interactivity-kit.js. Removed in
//                         the DOM, never by a regex over the serialized HTML: a CSS rule such as
//                         content:"<script>" inside an inlined stylesheet matched that regex once and
//                         176 KB of admin CSS vanished up to the next </script>
//   redaction             API keys / tokens the page legitimately embeds
//   live-reference.png    the live paint, after the strips, so the gate compares like with like

import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs, usage, ensureDir, readJson, writeJson, nowIso, hashName, extFor, mimeFor, snapshotDir,
  redactSecrets, isTextAsset, loadPlaywright, isErrorTitle, cssUrlRefs, rewriteCssUrls, dataUri,
} from './lib.mjs';
import { runSteps, runLogin, normalizePlan } from './steps.mjs';

const args = parseArgs(process.argv.slice(2), {
  root: 'string', viewport: 'string', login: 'string', steps: 'string', 'wait-for': 'string', 'wait-url': 'string', settle: 'number',
  inline: 'boolean', redact: 'multi', strip: 'multi', preset: 'multi', 'keep-iframes': 'boolean', force: 'boolean', headed: 'boolean',
});
const [url, slug] = args._;
if (!url || !slug) usage('usage: freeze.mjs <url> <slug> [--root dir] [--viewport WxH] [--login plan.json] [--steps plan.json] [--wait-for sel] [--wait-url regex] [--settle ms] [--inline] [--redact re]... [--strip sel]... [--preset wp-admin|wp-frontend]... [--keep-iframes] [--force] [--headed]', 2);

const [vw, vh] = (args.viewport || '1440x900').split('x').map(Number);
if (!vw || !vh) usage('bad --viewport, expected WxH', 2);
const outDir = snapshotDir(args.root, slug);
const assetsDir = path.join(outDir, 'assets');
const notes = [];
const PRESETS = {
  'wp-admin': { strip: ['#wpadminbar', '#wp-toolbar', '.notice.is-dismissible', '.update-nag', '#wpfooter'], css: 'html{margin-top:0!important;padding-top:0!important}html.wp-toolbar{padding-top:0!important}body{margin-top:0!important;padding-top:0!important}@media screen{html{margin-top:0!important}}' },
  'wp-frontend': { strip: ['#wpadminbar', 'body > header', '.site-header', '#masthead', 'body nav', '.main-navigation', '#site-navigation', 'form[role="search"]', '.search-form', '#secondary', '.widget-area', 'body > aside', 'body > footer', '.site-footer', '#colophon', '.post-edit-link', '#wp-admin-bar-edit', 'a[href*="action=edit"]'], css: 'html{margin-top:0!important}body{margin-top:0!important}' },
};
for (const p of args.preset || []) if (!PRESETS[p]) usage(`unknown --preset ${p} (wp-admin | wp-frontend)`, 2);
const stripSelectors = [...(args.strip || []), ...(args.preset || []).flatMap(p => PRESETS[p].strip)];
const presetCss = (args.preset || []).map(p => PRESETS[p].css).join('\n');

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: !args.headed });
const assetMap = new Map();     // absolute url -> 'assets/<file>' | data uri
const assetBuffers = new Map(); // file -> Buffer
const assetTypes = new Map();   // file -> content type
const localizer = { fetched: 0, failed: 0, failedUrls: [] };
const inflight = new Map();     // absolute url -> pending fetch (dedupes parallel requests)
let exitCode = 0;

try {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  // Pool every css / image / font the live page fetches.
  page.on('response', async res => {
    try {
      const u = res.url();
      const ct = res.headers()['content-type'] || '';
      // Stylesheets are inlined, never pooled: pooling them rewrote every data-origin attribute
      // to an assets/ path and emitted orphan .css files.
      if (/\.css(\?|$)/i.test(u) || /text\/css/.test(ct)) return;
      if (!/\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm)(\?|$)/i.test(u) && !/image|font/.test(ct)) return;
      if (assetMap.has(u) || res.status() >= 400) return;
      const buf = await res.body();
      pool(u, buf, ct);
    } catch { /* body unavailable (redirects, 204) */ }
  });

  if (args.login) await runLogin(page, readJson(args.login));

  console.log(`-> ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (args['wait-url']) { console.log(`-> waiting for URL /${args['wait-url']}/`); await page.waitForURL(new RegExp(args['wait-url']), { timeout: 60000 }); }
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => notes.push('network never went idle within 30 s (long-polling page?) — froze anyway'));

  let stepCount = 0;
  if (args.steps) stepCount = await runSteps(page, normalizePlan(readJson(args.steps)).steps);
  if (args['wait-for']) {
    if (['body', 'html', '*'].includes(args['wait-for'])) notes.push('--wait-for body/html/* matches instantly and proves nothing');
    console.log(`-> waitFor ${args['wait-for']}`);
    await page.waitForSelector(args['wait-for'], { state: 'visible', timeout: 15000 }).catch(() => { notes.push(`--wait-for "${args['wait-for']}" never became visible — the frozen state may not be the one you wanted`); console.log('   ! wait-for not found — continuing'); });
  }
  await page.waitForTimeout(Number.isFinite(args.settle) ? args.settle : 1500);

  const title = await page.title().catch(() => '');
  const finalUrl = page.url();
  if (!args.force && (isErrorTitle(title) || /\/(wp-login\.php|login|signin|sign-in)(\?|$)/i.test(finalUrl))) {
    throw new Error(`the page looks like an error or login page (title "${title}", url ${finalUrl}). Nothing written. Pass --force if this is really the page you want.`);
  }

  // ---- in-page bakes (paint-neutral: they write values the page already computes) ----
  const baked = await page.evaluate(({ stripSelectors, presetCss, keepIframes }) => {
    const report = { stripped: 0, visibilityStamped: 0, visibilityInheritedSkipped: 0, visibilityStateSkipped: 0, cssomMaterialized: 0, canvases: [], iframes: [], scripts: 0, noscripts: 0, crossorigin: 0 };
    for (const sel of stripSelectors) { try { document.querySelectorAll(sel).forEach(n => { n.remove(); report.stripped++; }); } catch { /* bad selector */ } }
    // scripts / noscript / crossorigin: removed as DOM nodes and attributes. A text regex over the
    // serialized HTML cannot tell a <script> tag from the string "<script>" inside a CSS rule.
    for (const n of document.querySelectorAll('script')) { n.remove(); report.scripts++; }
    for (const n of document.querySelectorAll('noscript')) { n.remove(); report.noscripts++; }
    for (const el of document.querySelectorAll('[crossorigin]')) { el.removeAttribute('crossorigin'); report.crossorigin++; }
    if (presetCss) { const s = document.createElement('style'); s.setAttribute('data-snapshot-preset', '1'); s.textContent = presetCss; document.head.appendChild(s); document.documentElement.classList.remove('wp-toolbar'); document.body.classList.remove('admin-bar'); }
    // visibility bake — only the element that turns hidden, and never one that a state rule can show.
    // A rule such as `input:checked ~ .label--on { display: block }` lives in the serialized stylesheet;
    // stamping display:none on that label would beat the rule for good, and the switch the film flips
    // would lose its label. State rules are recognised by their pseudo-classes; the selector with the
    // pseudo-classes removed says which elements they can reach.
    const STATE_RE = /:(?:not\((?::[a-z-]+)\)|(?:checked|hover|focus|focus-within|focus-visible|active|target|disabled|enabled|indeterminate|placeholder-shown|open|popover-open)(?![a-z-]))/;
    const STATE_STRIP = new RegExp(STATE_RE.source, 'g');
    const stateRules = [];
    (function collect(rules) {
      for (const r of rules) {
        try {
          if (r.cssRules && !r.selectorText) { collect(r.cssRules); continue; }
          if (!r.selectorText || !STATE_RE.test(r.selectorText)) continue;
          if (!/\b(?:display|visibility)\s*:/.test(r.style?.cssText || '')) continue;
          const bare = r.selectorText.replace(STATE_STRIP, '').trim();
          if (bare) stateRules.push(bare);
        } catch { /* cross-origin */ }
      }
    })([...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }));
    const stateShown = el => stateRules.some(sel => { try { return el.matches(sel); } catch { return false; } });
    for (const el of document.body.querySelectorAll('*')) {
      try {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' && el.style.display !== 'none') {
          if (stateShown(el)) { report.visibilityStateSkipped++; continue; }
          el.style.display = 'none'; report.visibilityStamped++;
        }
        else if (cs.visibility === 'hidden' && el.style.visibility !== 'hidden') {
          const parent = el.parentElement;
          if (parent && getComputedStyle(parent).visibility === 'hidden') { report.visibilityInheritedSkipped++; continue; }
          if (stateShown(el)) { report.visibilityStateSkipped++; continue; }
          el.style.visibility = 'hidden'; report.visibilityStamped++;
        }
      } catch { /* detached */ }
    }
    // CSSOM materialization
    for (const styleEl of document.querySelectorAll('style')) {
      try { const sheet = styleEl.sheet; if (sheet && sheet.cssRules.length && !styleEl.textContent.trim()) { styleEl.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n'); report.cssomMaterialized++; } } catch { /* cross-origin */ }
    }
    try { for (const sheet of (document.adoptedStyleSheets || [])) { const s = document.createElement('style'); s.setAttribute('data-adopted-sheet', '1'); s.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n'); document.head.appendChild(s); report.cssomMaterialized++; } } catch { /* none */ }
    // property -> attribute
    for (const el of document.querySelectorAll('input')) {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') { if (el.checked) el.setAttribute('checked', 'checked'); else el.removeAttribute('checked'); }
      else if (type !== 'file' && type !== 'password') el.setAttribute('value', el.value);
      else if (type === 'password') el.setAttribute('value', '');
    }
    for (const sel of document.querySelectorAll('select')) for (const opt of sel.options) { if (opt.selected) opt.setAttribute('selected', 'selected'); else opt.removeAttribute('selected'); }
    for (const ta of document.querySelectorAll('textarea')) ta.textContent = ta.value;
    // canvas -> img (dead region; reported)
    for (const c of document.querySelectorAll('canvas')) {
      try {
        const r = c.getBoundingClientRect();
        report.canvases.push({ w: Math.round(r.width), h: Math.round(r.height), cls: (c.className || '').toString().slice(0, 60) });
        const img = document.createElement('img');
        img.src = c.toDataURL('image/png'); img.setAttribute('data-from-canvas', '1');
        img.style.width = r.width + 'px'; img.style.height = r.height + 'px'; img.style.display = 'block';
        if (c.className) img.className = c.className;
        c.parentNode.replaceChild(img, c);
      } catch { /* tainted canvas */ }
    }
    // iframes: record, then remove unless kept
    for (const f of document.querySelectorAll('iframe')) { report.iframes.push((f.getAttribute('src') || '').slice(0, 120)); if (!keepIframes) f.remove(); }
    // tracking pixels: images that render at 1x1 or smaller (or are hidden with a 0/1 size attribute)
    // fetch a beacon and paint nothing; in the fossil they only produce a failed request per mount
    report.pixels = 0;
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      const w = Number(img.getAttribute('width')), h = Number(img.getAttribute('height'));
      const tiny = (r.width <= 1 && r.height <= 1) || (w <= 1 && h <= 1 && img.hasAttribute('width') && img.hasAttribute('height'));
      const remote = /^https?:\/\//.test(img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith(location.origin);
      if (tiny && (remote || getComputedStyle(img).display === 'none')) { img.remove(); report.pixels++; }
    }
    return report;
  }, { stripSelectors, presetCss, keepIframes: Boolean(args['keep-iframes']) });
  if (baked.stripped) notes.push(`stripped ${baked.stripped} element(s) via --strip/--preset`);
  if (baked.visibilityInheritedSkipped || baked.visibilityStateSkipped) notes.push(`visibility bake: ${baked.visibilityStamped} stamped, ${baked.visibilityInheritedSkipped} skipped as inherited, ${baked.visibilityStateSkipped} left to state CSS (:checked / :hover / :focus rules)`);
  if (baked.cssomMaterialized) notes.push(`materialized ${baked.cssomMaterialized} CSSOM-injected style sheet(s)`);
  for (const c of baked.canvases) notes.push(`canvas ${c.w}x${c.h}${c.cls ? ' .' + c.cls.split(/\s+/).join('.') : ''} baked to PNG — DEAD region on camera (no hover, no resize, not animatable)`);
  if (baked.iframes.length) notes.push(`${baked.iframes.length} iframe(s) ${args['keep-iframes'] ? 'kept' : 'removed'}: ${baked.iframes.join(' | ')}`);
  if (baked.pixels) notes.push(`removed ${baked.pixels} tracking pixel image(s) (1x1 or hidden, remote)`);

  // ---- live paint reference, after the strips ----
  ensureDir(outDir);
  await page.screenshot({ path: path.join(outDir, 'live-reference.png') }).catch(e => notes.push('live-reference.png failed: ' + e.message));
  await page.screenshot({ path: path.join(outDir, 'page-full.png'), fullPage: true }).catch(e => notes.push('page-full.png failed: ' + e.message)); // the whole document; live-reference.png is the viewport crop the paint gate compares

  // ---- stylesheets: fetch through the browser context (cookies, no CORS) and localize url() refs ----
  const links = await page.evaluate(() => [...document.querySelectorAll('link[rel~="stylesheet"]')].map(l => ({ href: l.href, media: l.getAttribute('media') || '' })));
  // href -> inlined css (string) | { drop: reason } (the live page never received it either) | null (kept as <link>)
  const sheets = {};
  const dropped = [];
  for (const { href } of links) {
    if (!href || sheets[href] !== undefined) continue;
    const r = await fetchStylesheet(page, href);
    if (typeof r.css === 'string') sheets[href] = await localizeCss(page, r.css, href, 0);
    else if (r.status) {
      // A 4xx / 5xx answered the live page too (a Google Fonts URL naming a family it does not serve
      // answers 400 to every client): there is no CSS to inline and the <link> would fail on every mount.
      sheets[href] = { drop: 'HTTP ' + r.status };
      dropped.push(href);
      // Show the END of the query too: the reason usually lives there (a font stack passed as a
      // family name, an expired signature), and a head-only truncation hides it.
      notes.push(`stylesheet dropped: ${shortUrl(href)} answers HTTP ${r.status} (the live page got the same answer, so it styled nothing; the <link> is removed)`);
    } else {
      sheets[href] = null;
      notes.push(`stylesheet unreachable: ${shortUrl(href)} (${r.error}; kept as <link>; the snapshot may render wrong offline)`);
    }
  }
  // <style> blocks and inline style attributes: localize their url() refs too
  const inlineCssRefs = await page.evaluate(() => {
    const out = [];
    for (const s of document.querySelectorAll('style')) out.push({ kind: 'style', css: s.textContent || '' });
    for (const el of document.querySelectorAll('[style*="url("]')) out.push({ kind: 'attr', css: el.getAttribute('style') || '' });
    return out;
  });
  await mapLimit(inlineCssRefs.flatMap(({ css }) => cssUrlRefs(css, finalUrl)), 8, r => ensureAsset(page, r.abs));

  // ---- referenced media: img / source / video / poster / svg use / icons ----
  const mediaUrls = await page.evaluate(() => {
    const out = new Set();
    const add = v => { if (!v) return; try { const u = new URL(v, document.baseURI).toString(); if (/^https?:/.test(u)) out.add(u); } catch { /* ignore */ } };
    for (const el of document.querySelectorAll('img, source, video, audio, track, object, embed, use, image, link[rel~="icon"], link[rel~="apple-touch-icon"]')) {
      add(el.getAttribute('src')); add(el.getAttribute('poster')); add(el.getAttribute('data-src')); add(el.getAttribute('data-lazy-src'));
      const href = el.getAttribute('href') || el.getAttribute('xlink:href');
      if (href && !href.startsWith('#') && (el.tagName.toLowerCase() === 'use' || el.tagName.toLowerCase() === 'image' || el.tagName.toLowerCase() === 'link')) add(href.split('#')[0]);
      for (const attr of ['srcset', 'data-srcset']) { const ss = el.getAttribute(attr); if (ss) for (const cand of ss.split(',')) add(cand.trim().split(/\s+/)[0]); }
    }
    return [...out];
  });
  await mapLimit(mediaUrls, 8, u => ensureAsset(page, u));

  // ---- rewrite the DOM: replace stylesheet links, rewrite attributes, drop dead links ----
  await page.evaluate(({ sheets, assets, mediaOf }) => {
    for (const link of [...document.querySelectorAll('link[rel~="stylesheet"]')]) {
      const css = sheets[link.href];
      if (css && typeof css === 'object' && css.drop) { link.remove(); continue; }
      if (typeof css !== 'string') continue;
      const s = document.createElement('style');
      s.setAttribute('data-origin', link.href);
      const media = link.getAttribute('media'); if (media && media !== 'all') s.setAttribute('media', media);
      s.textContent = css; link.replaceWith(s);
    }
    const abs = v => { try { return new URL(v, document.baseURI).toString(); } catch { return v; } };
    const map = v => assets[abs(v)] || assets[v] || null;
    for (const el of document.querySelectorAll('*')) {
      for (const a of ['src', 'poster', 'data-src', 'data-lazy-src']) { const v = el.getAttribute(a); if (v && !v.startsWith('data:')) { const l = map(v); if (l) el.setAttribute(a, l); } }
      for (const a of ['srcset', 'data-srcset']) {
        const v = el.getAttribute(a); if (!v) continue;
        el.setAttribute(a, v.split(',').map(c => { const [u, d] = c.trim().split(/\s+/); const l = map(u); return (l || u) + (d ? ' ' + d : ''); }).join(', '));
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'use' || tag === 'image') { for (const a of ['href', 'xlink:href']) { const v = el.getAttribute(a); if (v && !v.startsWith('#')) { const [u, frag] = v.split('#'); const l = map(u); if (l) el.setAttribute(a, l + (frag ? '#' + frag : '')); } } }
      if (tag === 'link') { const rel = (el.getAttribute('rel') || '').toLowerCase(); if (/icon/.test(rel)) { const l = map(el.getAttribute('href')); if (l) el.setAttribute('href', l); else el.remove(); } else if (!/stylesheet/.test(rel)) el.remove(); }
      const st = el.getAttribute('style');
      if (st && st.includes('url(')) el.setAttribute('style', st.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, raw) => { const l = map(raw.trim()); return l ? `url(${l})` : m; }));
    }
    for (const s of document.querySelectorAll('style')) { if (s.textContent.includes('url(')) s.textContent = s.textContent.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, raw) => { const l = map(raw.trim()); return l ? `url(${l})` : m; }); }
    document.querySelectorAll('base').forEach(b => b.remove());
    for (const el of document.querySelectorAll('[integrity]')) el.removeAttribute('integrity');
    if (!document.querySelector('meta[charset]')) { const m = document.createElement('meta'); m.setAttribute('charset', 'utf-8'); document.head.prepend(m); }
    void mediaOf;
  }, { sheets, assets: Object.fromEntries(assetMap), mediaOf: null });

  const geometry = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth }));
  let html = await page.evaluate(() => document.documentElement.outerHTML);

  // ---- text-level passes (URL rewrites and redaction only; structure was edited in the DOM above) ----
  const scriptCount = baked.scripts;
  // Backstop for absolute asset URLs in text (json blobs, srcset variants), both raw and &amp; forms.
  for (const [u, local] of assetMap) { for (const v of u.includes('&') ? [u, u.replace(/&/g, '&amp;')] : [u]) html = html.split(v).join(local); }
  const red = redactSecrets(html, (args.redact || []).map(r => new RegExp(r, 'g')));
  html = red.text;
  if (red.count) notes.push(`redacted ${red.count} secret(s): ${Object.entries(red.report).map(([k, n]) => k + ' x' + n).join(', ')}`);
  const mojibake = (html.match(/�/g) || []).length;
  if (mojibake) notes.push(`${mojibake} replacement character(s) in the HTML — the source encoding was already broken`);

  // ---- emit referenced assets only ----
  let emitted = 0;
  if (!args.inline) {
    const referenced = new Set([...html.matchAll(/assets\/([A-Za-z0-9._-]+)/g)].map(m => m[1]));
    ensureDir(assetsDir);
    for (const [file, buf] of assetBuffers) {
      if (!referenced.has(file)) continue;
      let out = buf;
      if (isTextAsset(file)) { const r = redactSecrets(buf.toString('utf8')); if (r.count) out = Buffer.from(r.text, 'utf8'); }
      fs.writeFileSync(path.join(assetsDir, file), out); emitted++;
    }
  }
  if (localizer.failed) notes.push(`${localizer.failed} asset(s) unreachable, left as absolute URLs: ${localizer.failedUrls.slice(0, 5).join(' | ')}${localizer.failed > 5 ? ' ...' : ''}`);

  fs.writeFileSync(path.join(outDir, 'index.html'), '<!doctype html>\n' + html, 'utf8');
  const meta = {
    slug, path: args.login ? 'C' : 'A', source_url: finalUrl, requested_url: url, title, captured_at: nowIso(),
    viewport: { width: vw, height: vh }, doc_height: geometry.h, doc_width: geometry.w,
    assets: args.inline ? 0 : emitted, inline: Boolean(args.inline), redactions: red.count,
    stripped: { scripts: scriptCount, noscripts: baked.noscripts, iframes: args['keep-iframes'] ? 0 : baked.iframes.length, crossorigin: baked.crossorigin },
    canvas_rasterized: baked.canvases, stylesheets_dropped: dropped, wait_for: args['wait-for'] || null, steps: stepCount, presets: args.preset || [], notes,
  };
  writeJson(path.join(outDir, 'meta.json'), meta);
  console.log(`${slug}: ${Math.round(Buffer.byteLength(html) / 1024)} KB html, ${emitted} asset(s), doc ${geometry.w}x${geometry.h}, ${scriptCount} script(s) stripped, ${red.count} redaction(s)${baked.canvases.length ? `, ${baked.canvases.length} canvas DEAD` : ''}`);
  for (const n of notes) console.log('  note: ' + n);
  console.log('wrote ' + outDir);
  console.log('next: node scripts/gates.mjs ' + slug + (args.root ? ` --root "${args.root}"` : ''));
} catch (e) {
  console.error('freeze failed: ' + (e.message || e));
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
}
process.exit(exitCode);

// ---------------------------------------------------------------------------

function pool(absUrl, buf, contentType) {
  // A zero-byte body (tracking pixels answer with 204 / empty 200) is not an asset: pooling it
  // writes an empty file that the browser then reports as a failed image on every mount.
  if (!buf || buf.length === 0) { localizer.failed++; localizer.failedUrls.push(absUrl.slice(0, 100) + ' (empty body)'); return null; }
  const file = hashName(absUrl, extFor(absUrl, contentType));
  assetMap.set(absUrl, args.inline ? dataUri(buf, contentType.split(';')[0] || mimeFor(absUrl)) : 'assets/' + file);
  assetBuffers.set(file, buf);
  assetTypes.set(file, contentType);
  return assetMap.get(absUrl);
}

async function ensureAsset(page, absUrl) {
  if (assetMap.has(absUrl)) return assetMap.get(absUrl);
  if (!/^https?:/.test(absUrl) || /\.css(\?|$)/i.test(absUrl)) return null;
  if (inflight.has(absUrl)) return inflight.get(absUrl);
  const p = fetchAsset(page, absUrl).finally(() => inflight.delete(absUrl));
  inflight.set(absUrl, p);
  return p;
}
async function fetchAsset(page, absUrl) {
  try {
    const res = await page.request.get(absUrl, { timeout: 15000, maxRedirects: 5 });
    if (!res.ok()) { localizer.failed++; localizer.failedUrls.push(absUrl.slice(0, 100)); return null; }
    const buf = await res.body();
    const ct = res.headers()['content-type'] || '';
    if (/text\/css/.test(ct)) return null;
    localizer.fetched++;
    return pool(absUrl, buf, ct);
  } catch { localizer.failed++; localizer.failedUrls.push(absUrl.slice(0, 100)); return null; }
}

async function fetchText(page, absUrl) {
  const r = await fetchStylesheet(page, absUrl);
  return typeof r.css === 'string' ? r.css : null;
}

// { css } on success; { status } when the server answered an HTTP error (the browser session and a
// plain Node fetch with the page's user agent both tried, so a CDN that dislikes one client's headers
// still gets inlined); { error } when nothing answered at all (DNS, timeout).
async function fetchStylesheet(page, absUrl) {
  let status = 0, error = 'no response';
  try {
    const res = await page.request.get(absUrl, { timeout: 15000, maxRedirects: 5 });
    if (res.ok()) return { css: (await res.body()).toString('utf8') };
    status = res.status();
  } catch (e) { error = (e && e.message || String(e)).split('\n')[0].slice(0, 80); }
  try {
    const ua = await page.evaluate(() => navigator.userAgent).catch(() => '');
    const res = await fetch(absUrl, { headers: ua ? { 'user-agent': ua, accept: 'text/css,*/*;q=0.1' } : undefined, signal: AbortSignal.timeout(15000) });
    if (res.ok) return { css: await res.text() };
    status = res.status;
  } catch (e) { if (!status) error = (e && e.message || String(e)).split('\n')[0].slice(0, 80); }
  return status ? { status } : { error };
}

// Resolve @import recursively, localize every url() ref, return the rewritten CSS.
async function localizeCss(page, css, baseHref, depth) {
  if (depth > 3) return css;
  const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?([^;]*);/g)];
  for (const m of imports) {
    let abs; try { abs = new URL(m[1], baseHref).toString(); } catch { continue; }
    const sub = await fetchText(page, abs);
    if (sub === null) { notes.push(`@import unreachable: ${abs.slice(0, 100)}`); continue; }
    const localized = await localizeCss(page, sub, abs, depth + 1);
    const media = (m[2] || '').trim();
    css = css.replace(m[0], media ? `@media ${media}{\n${localized}\n}` : `/* @import ${abs} */\n${localized}`);
  }
  await mapLimit(cssUrlRefs(css, baseHref), 8, r => ensureAsset(page, r.abs));
  return rewriteCssUrls(css, baseHref, abs => assetMap.get(abs) || null);
}

// A long URL shortened from the MIDDLE: both ends carry meaning (host and path at the front, the
// query parameter that broke it at the back).
function shortUrl(u, max = 160) {
  if (u.length <= max) return u;
  const head = Math.ceil((max - 5) * 0.55);
  return u.slice(0, head) + ' ... ' + u.slice(u.length - (max - 5 - head));
}

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); });
  await Promise.all(workers);
}
