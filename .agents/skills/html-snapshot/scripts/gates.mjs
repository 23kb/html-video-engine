#!/usr/bin/env node
// gates.mjs — post-capture quality gates for a frozen snapshot.
//
// REPORT-ONLY. Every finding is a WARN; a gate that cannot run prints
// "NOT RUN <gate> — <why>" because a silent skip reads exactly like a pass.
// Exit 0 unless the tool itself throws. Judgment stays with the human: these
// gates inform, they never fail a snapshot.
//
// Usage:
//   node scripts/gates.mjs <slug> [--root <snapshots root>] [--no-paint-diff]
//        [--expect-selector <sel>]... [--interactive <sel>]... [--pii <regex>]...
//        [--name <string>]... [--currency $] [--locale-flag us] [--json]
//
// Writes <root>/<slug>/gates.json and prints the same report as text.

import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs, usage, readJson, writeJson, nowIso, snapshotDir,
  loadPlaywright, startStaticServer, EMAIL_RE, GREETING_RE,
} from './lib.mjs';

const USAGE = `Usage: node scripts/gates.mjs <slug> [--root <snapshots root>] [--no-paint-diff]
       [--expect-selector <sel>]... [--interactive <sel>]... [--pii <regex>]...
       [--name <string>]... [--currency $] [--locale-flag us] [--json]`;

const GATE_NAMES = {
  G1: 'geometry', G2: 'paint diff', G3: 'assets', G4: 'locale', G5: 'stacking',
  G6: 'canvas', G7: 'leftovers', G8: 'personal data', G9: 'viewport-unit shell',
};

// Generic overlay anchors. Product-specific selectors belong in --interactive.
const DEFAULT_INTERACTIVE = [
  '[role=menu]', '[role=listbox]', '[role=dialog]',
  '[class*=dropdown]', '[class*=popover]', '[class*=menu]', '[class*=tooltip]',
];

// ---------- args ----------

let args;
try {
  args = parseArgs(process.argv.slice(2), {
    root: 'string', 'no-paint-diff': 'boolean', 'expect-selector': 'multi', interactive: 'multi',
    pii: 'multi', name: 'multi', currency: 'string', 'locale-flag': 'string', json: 'boolean',
  });
} catch (e) { usage(e.message + '\n' + USAGE, 2); }
if (args._.length !== 1) usage(USAGE, 2);

const slug = args._[0];
const root = path.resolve(args.root || 'snapshots');
const dir = snapshotDir(root, slug);
const indexPath = path.join(dir, 'index.html');
if (!fs.existsSync(indexPath)) { console.error(`no snapshot at ${indexPath}`); process.exit(1); }

let meta = {};
try { meta = readJson(path.join(dir, 'meta.json')); } catch { /* meta is optional */ }
const viewport = (meta.viewport && meta.viewport.width && meta.viewport.height) ? meta.viewport : { width: 1440, height: 900 };
const currency = args.currency || '$';
const localeFlag = (args['locale-flag'] || 'us').toLowerCase();
const interactive = args.interactive && args.interactive.length ? args.interactive : DEFAULT_INTERACTIVE;
const piiPatterns = (args.pii || []).map((p) => { new RegExp(p); return p; }); // validate early, ship as source

// ---------- report ----------

const gates = {};
for (const id of Object.keys(GATE_NAMES)) gates[id] = { status: 'PASS', findings: [], notes: [] };
const warn = (id, text) => { gates[id].status = 'WARN'; gates[id].findings.push(text); };
const note = (id, text) => gates[id].notes.push(text);
const notRun = (id, why) => { gates[id].status = 'NOT RUN'; gates[id].notes.push(why); };

// ---------- main ----------

const { chromium } = await loadPlaywright();
const server = await startStaticServer(root);
const browser = await chromium.launch({ headless: true });
try {
  // bypassCSP: a leftover CSP <meta> would blank inline styles and make every other gate measure a broken page.
  // G7 still reports the meta; the real mount honors it, so it must be stripped either way.
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, bypassCSP: true });

  // G3 listeners go on BEFORE navigation so the document request itself is covered.
  const failures = [];
  page.on('response', (r) => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (req) => {
    // ERR_ABORTED is the browser cancelling a load it no longer needs, not a missing file.
    const err = (req.failure() || {}).errorText || '';
    if (err && err !== 'net::ERR_ABORTED') failures.push(`${err} ${req.url()}`);
  });

  // A 200 whose bytes do not decode (a 0-byte tracker pixel saved as .bin, a mistyped font) never shows as an
  // HTTP failure; the element's own error event is the only witness, and it fires while the page parses.
  await page.addInitScript(() => {
    window.__resourceErrors = [];
    window.addEventListener('error', (e) => {
      const t = e.target;
      if (t && t !== window && t.tagName) window.__resourceErrors.push('<' + t.tagName.toLowerCase() + '> ' + String(t.currentSrc || t.src || t.href || '').slice(0, 200));
    }, true);
  });

  const pageUrl = `${server.url}/${slug}/index.html`;
  let navError = null;
  await page.goto(pageUrl, { waitUntil: 'load', timeout: 45000 }).catch((e) => { navError = e.message; });
  if (navError) note('G3', `navigation did not reach load: ${navError.split('\n')[0]}`);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600); // late font / image fetches

  // Runtime rehydration paints after load; without this wait the paint gate reads
  // a still-empty region as a defect. A snapshot declares its own budget in
  // <body data-paint-settle="ms">.
  const settle = await page.evaluate(() => {
    const v = document.body && document.body.getAttribute('data-paint-settle');
    return v ? Math.min(parseInt(v, 10) || 0, 5000) : 0;
  });
  if (settle) { note('G2', `paint settle: waited ${settle}ms (body[data-paint-settle])`); await page.waitForTimeout(settle); }

  // G2 screenshot is taken FIRST, before any gate mutates the DOM (G5 clones nodes).
  const refPath = path.join(dir, 'live-reference.png');
  let frozenPng = null;
  const paintDiffWanted = !args['no-paint-diff'] && fs.existsSync(refPath);
  if (paintDiffWanted) frozenPng = await page.screenshot({ type: 'png' });

  // ---- G1 geometry ----
  const geo = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth }));
  const mult = geo.sh / viewport.height;
  gates.G1.doc_height = geo.sh;
  gates.G1.doc_width = geo.sw;
  // When freeze.mjs recorded the LIVE document height, the question is growth (a hidden overlay
  // serialized expanded), not length: a long landing page is long live too.
  const liveH = Number(meta.doc_height) || 0;
  if (liveH && geo.sh > liveH * 1.2 + 200) warn('G1', `scrollHeight ${geo.sh}px vs ${liveH}px live (grew ${Math.round((geo.sh / liveH - 1) * 100)}%: a hidden overlay may have serialized expanded inline)`);
  else if (liveH) note('G1', `scrollHeight ${geo.sh}px vs ${liveH}px live (${mult.toFixed(1)}x the ${viewport.height}px viewport; mount at h=${geo.sh} to reach the bottom), scrollWidth ${geo.sw}px`);
  else if (mult > 3) warn('G1', `scrollHeight ${geo.sh}px = ${mult.toFixed(1)}x the ${viewport.height}px viewport (over 3x and no live height recorded: hidden overlays may have serialized expanded inline)`);
  else note('G1', `scrollHeight ${geo.sh}px (${mult.toFixed(1)}x viewport), scrollWidth ${geo.sw}px`);

  // ---- G3 assets ----
  const uniqFailures = [...new Set(failures)];
  if (uniqFailures.length) {
    note('G3', `${uniqFailures.length} failed asset request(s)`);
    for (const f of uniqFailures) warn('G3', f);
  }
  const decodeFailures = await page.evaluate(() => [...new Set(window.__resourceErrors || [])]).catch(() => []);
  for (const f of decodeFailures) warn('G3', `${f} was served but did not load (0-byte or mistyped asset): the mount test counts it as a console error`);
  if (!gates.G3.findings.length) note('G3', 'every request resolved and every element loaded');

  // ---- G4 locale ----
  const locale = await page.evaluate(({ currency }) => {
    const out = { flags: [], dateHits: [], currencyHits: {} };
    // Only the SELECTED phone flag reads on camera; the dropdown legitimately holds every country.
    for (const f of document.querySelectorAll('.iti__selected-flag .iti__flag, .iti__selected-country-primary .iti__flag')) {
      const code = [...f.classList].find((c) => /^iti__[a-z]{2}$/.test(c));
      if (code) out.flags.push(code.slice(5));
    }
    // euro, pound, rupee, yen as char codes so the source stays ASCII
    const symbols = ['$', ...[0x20AC, 0x00A3, 0x20B9, 0x00A5].map((c) => String.fromCharCode(c))].filter((s) => s !== currency);
    const pathOf = (el) => {
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && n !== document.documentElement && parts.length < 6; n = n.parentElement) {
        if (n.id) { parts.unshift('#' + n.id); break; }
        const cls = n.classList && n.classList.length ? '.' + n.classList[0] : '';
        parts.unshift(n.tagName.toLowerCase() + cls);
      }
      return parts.join(' > ');
    };
    const scan = (text, el) => {
      if (!text) return;
      if (/DD\/MM\/YYYY/i.test(text) && out.dateHits.length < 5) out.dateHits.push(pathOf(el));
      for (const s of symbols) if (text.includes(s) && !out.currencyHits[s]) out.currencyHits[s] = pathOf(el);
    };
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const p = t.parentElement;
      if (p && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) continue;
      scan(t.nodeValue, p);
    }
    for (const el of document.querySelectorAll('[placeholder], input[value]')) {
      scan(el.getAttribute('placeholder'), el); scan(el.getAttribute('value'), el);
    }
    return out;
  }, { currency });
  const badFlags = [...new Set(locale.flags.filter((c) => c !== localeFlag))];
  if (badFlags.length) warn('G4', `selected phone flag(s) "${badFlags.join(', ')}" differ from --locale-flag ${localeFlag} (the capture machine's locale leaked into the field; swap the class before filming)`);
  for (const p of locale.dateHits) warn('G4', `DD/MM/YYYY date placeholder at ${p}`);
  for (const [s, p] of Object.entries(locale.currencyHits)) warn('G4', `currency symbol ${s} (not --currency ${currency}) at ${p}`);
  if (!gates.G4.findings.length) note('G4', `flags ${locale.flags.length ? locale.flags.join(',') : 'none'}, no DD/MM/YYYY, no foreign currency symbol`);

  // ---- G6 canvas ----
  const canvas = await page.evaluate(() => ({
    rasters: [...document.querySelectorAll('img[data-from-canvas]')].map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`),
    live: [...document.querySelectorAll('canvas')].map((c) => `${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}`),
  }));
  for (const r of canvas.rasters) warn('G6', `${r} canvas was baked to a PNG raster: dead region (no hover, no resize, not animatable as DOM)`);
  for (const c of canvas.live) warn('G6', `${c} <canvas> still in the DOM: paints nothing without its script`);
  if (!gates.G6.findings.length) note('G6', 'no canvas rasters, no live canvas');

  // ---- G7 leftovers ----
  const left = await page.evaluate(({ expectSelectors }) => {
    const out = {};
    out.csp = document.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]').length;
    out.base = [...document.querySelectorAll('base')].map((b) => b.getAttribute('href') || '');
    out.scripts = [...document.querySelectorAll('script')]
      .filter((s) => !/json/i.test(s.getAttribute('type') || ''))
      .map((s) => s.src || ('inline ' + (s.textContent || '').trim().slice(0, 60).replace(/\s+/g, ' ')));
    out.crossorigin = document.querySelectorAll('[crossorigin]').length;
    out.externalCss = [...document.querySelectorAll('link[rel~="stylesheet"]')]
      .map((l) => l.getAttribute('href') || '').filter((h) => /^(https?:)?\/\//i.test(h));
    out.handlers = { count: 0, first: [] };
    for (const el of document.querySelectorAll('*')) for (const a of el.attributes) if (/^on[a-z]+$/i.test(a.name)) {
      out.handlers.count++;
      if (out.handlers.first.length < 3) out.handlers.first.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '[' + a.name + ']');
    }
    out.iframes = [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src') || (f.hasAttribute('srcdoc') ? '[srcdoc]' : '[no src]'));
    const visibleText = (document.body && document.body.innerText) || '';
    out.jsNotice = /enable JavaScript|JavaScript is (disabled|required|turned off)|requires JavaScript/i.test(visibleText);
    out.missing = [];
    for (const sel of expectSelectors) { try { if (!document.querySelector(sel)) out.missing.push(sel); } catch { out.missing.push(sel + ' (invalid selector)'); } }
    return out;
  }, { expectSelectors: args['expect-selector'] || [] });
  if (left.csp) warn('G7', `${left.csp} CSP <meta>: blocks every injected script and the preview client (these gates ran with CSP bypassed; a real mount honors it and can lose inline styles too)`);
  for (const b of left.base) warn('G7', `<base href="${b}">: relative asset paths resolve away from the snapshot folder`);
  if (left.scripts.length) warn('G7', `${left.scripts.length} <script> tag(s) survive (first: ${left.scripts[0]}): a frozen page must not run product JS`);
  if (left.crossorigin) warn('G7', `${left.crossorigin} crossorigin attribute(s): a file:// or 127.0.0.1 mount fails the CORS check and drops the asset`);
  for (const h of left.externalCss) warn('G7', `external stylesheet ${h}: not localized, breaks offline and changes under you`);
  for (const s of left.iframes) warn('G7', `<iframe src="${s}">: nested document is not frozen`);
  if (left.handlers.count) warn('G7', `${left.handlers.count} inline on* handler attribute(s) survive (${left.handlers.first.join(', ')}): product JS runs on the first click; strip them or let the interactivity kit own the behaviour`);
  if (left.jsNotice) warn('G7', '"enable JavaScript" notice is visible: it renders because scripts were stripped, no visitor sees it');
  for (const m of left.missing) warn('G7', `--expect-selector ${m} is absent: the capture is missing a region it was supposed to carry`);
  if (!gates.G7.findings.length) note('G7', 'no CSP, base, script, inline handler, crossorigin, external css, iframe or JS notice');

  // ---- G8 personal data ----
  const pii = await page.evaluate(({ emailSrc, greetingSrc, names, piiSrc }) => {
    const emailRe = new RegExp(emailSrc, 'g');
    const greetingRe = new RegExp(greetingSrc, 'g');
    const piiRes = piiSrc.map((s) => new RegExp(s, 'g'));
    const namesLc = names.map((n) => n.toLowerCase());
    const out = { emails: { count: 0 }, greetings: [], names: {}, avatars: [], avatarNames: [], lists: [], pii: {} };
    const pathOf = (el) => {
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && n !== document.documentElement && parts.length < 8; n = n.parentElement) {
        if (n.id) { parts.unshift('#' + n.id); break; }
        const cls = n.classList && n.classList.length ? '.' + n.classList[0] : '';
        let nth = '';
        if (n.parentElement) {
          const sibs = [...n.parentElement.children].filter((c) => c.tagName === n.tagName);
          if (sibs.length > 1) nth = `:nth-of-type(${sibs.indexOf(n) + 1})`;
        }
        parts.unshift(n.tagName.toLowerCase() + cls + nth);
      }
      return parts.join(' > ');
    };
    const maskEmail = (e) => { const [u, d] = e.split('@'); return u[0] + '***@' + d; };
    const mask = (s) => (s.length <= 2 ? '***' : s.slice(0, 2) + '***');
    const greetingHits = new Map(); // element -> matched text; reduced to the deepest elements after the walk
    const scan = (text, el, where) => {
      if (!text || text.length > 4000) return; // skip base64 blobs
      const emails = text.match(emailRe);
      if (emails) {
        out.emails.count += emails.length;
        if (!out.emails.first) out.emails.first = { masked: maskEmail(emails[0]), path: pathOf(el), where };
      }
      namesLc.forEach((n, i) => {
        if (!out.names[names[i]] && text.toLowerCase().includes(n)) out.names[names[i]] = { path: pathOf(el), where };
      });
      piiRes.forEach((re, i) => {
        re.lastIndex = 0;
        const m = text.match(re);
        if (m) {
          const k = piiSrc[i];
          out.pii[k] = out.pii[k] || { count: 0, first: { masked: mask(m[0]), path: pathOf(el), where } };
          out.pii[k].count += m.length;
        }
      });
    };
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const p = t.parentElement;
      if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName) || !t.nodeValue.trim()) continue;
      scan(t.nodeValue, p, 'text');
      // A greeting can straddle inline tags ("Welcome back, <b>Jordan</b>"), so test the small parent too.
      const ctx = p.textContent && p.textContent.length < 300 ? p.textContent : t.nodeValue;
      greetingRe.lastIndex = 0;
      const g = ctx.match(greetingRe);
      if (g && !greetingHits.has(p)) greetingHits.set(p, g[0].trim());
    }
    for (const [el, text] of greetingHits) {
      if ([...greetingHits.keys()].some((o) => o !== el && el.contains(o))) continue; // report the deepest element only
      if (out.greetings.length < 5) out.greetings.push({ text, path: pathOf(el) });
    }
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (a.name === 'class' || a.name === 'style') continue;
        scan(a.value, el, '@' + a.name);
      }
    }
    for (const img of document.querySelectorAll('img')) {
      const probe = (img.getAttribute('src') || '').slice(0, 300) + ' ' + (img.getAttribute('alt') || '');
      if (!/avatar|gravatar|profile|user-photo/i.test(probe) || out.avatars.length >= 5) continue;
      out.avatars.push(pathOf(img));
      // An account menu pairs the avatar with the holder's name: a name-like leaf within a few ancestors is that name.
      const nameLike = /^[A-Z][a-zA-Z'.-]+(\s[A-Z][a-zA-Z'.-]+){1,3}$/;
      let box = img.parentElement;
      for (let up = 0; box && box !== document.body && up < 4; up++, box = box.parentElement) {
        const hit = [...box.querySelectorAll('*')].find((n) => n.children.length === 0 && n !== img && nameLike.test((n.textContent || '').trim()));
        if (hit) { if (out.avatarNames.length < 5) out.avatarNames.push({ masked: mask((hit.textContent || '').trim()), path: pathOf(hit) }); break; }
      }
    }
    // History / recents lists: a long list of real titles is a person's usage record.
    const flagged = [];
    for (const box of document.querySelectorAll('nav, aside, [class*=sidebar], [class*=history], [class*=recent]')) {
      if (flagged.some((f) => f.contains(box))) continue;
      const titles = [...box.querySelectorAll('a')].map((a) => (a.textContent || '').trim()).filter((t) => t.length > 12);
      if (titles.length > 8) { flagged.push(box); out.lists.push({ count: titles.length, example: titles[0].slice(0, 60), path: pathOf(box) }); }
    }
    return out;
  }, { emailSrc: EMAIL_RE.source, greetingSrc: GREETING_RE.source, names: args.name || [], piiSrc: piiPatterns });
  if (pii.emails.count) warn('G8', `${pii.emails.count} email address(es), first ${pii.emails.first.masked} in ${pii.emails.first.where} at ${pii.emails.first.path}`);
  for (const g of pii.greetings) warn('G8', `greeting "${g.text}" at ${g.path}: names the account owner`);
  for (const [n, hit] of Object.entries(pii.names)) warn('G8', `--name "${n}" found in ${hit.where} at ${hit.path}`);
  for (const p of pii.avatars) warn('G8', `avatar-like image at ${p}`);
  for (const a of pii.avatarNames) warn('G8', `name-like text "${a.masked}" beside an avatar at ${a.path}: reads as the account holder's name (pass it as --name to confirm)`);
  for (const l of pii.lists) warn('G8', `history / recents list: ${l.count} titles, e.g. '${l.example}' at ${l.path}; neutralize at film time by selector, never by editing the snapshot`);
  for (const [k, hit] of Object.entries(pii.pii)) warn('G8', `--pii /${k}/ matched ${hit.count}x, first "${hit.first.masked}" in ${hit.first.where} at ${hit.first.path}`);
  if (!gates.G8.findings.length) note('G8', 'no emails, greetings, names, avatars, avatar-adjacent names, long link lists or --pii hits');

  // ---- G9 viewport-unit shell ----
  const shell = await page.evaluate(() => {
    const hits = [];
    const shellSel = /(^|[\s>+~,(])(html|body|main)(?![\w-])|:root(?![\w-])|#(root|app|__next)(?![\w-])|\.[\w-]*(shell|layout)[\w-]*|\[class\*=["']?(shell|layout)/i;
    // Only the SUBJECT (last compound) of each selector is the shell: "body .modal" sizes the modal, not body.
    const isShellRule = (text) => text.split(',').some((s) => shellSel.test((s.trim().split(/\s*[\s>+~]\s*/).pop() || '')));
    const sizeProp = /^(min-|max-)?(width|height)$/;
    const vpUnit = /\b\d*\.?\d+(vw|vh|dvh|svh|lvh)\b/i;
    const walk = (rules) => {
      for (const r of rules) {
        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        if (!r.selectorText || !r.style) continue;
        if (!isShellRule(r.selectorText)) continue;
        for (const prop of r.style) {
          if (sizeProp.test(prop) && vpUnit.test(r.style.getPropertyValue(prop))) {
            hits.push(`${r.selectorText.slice(0, 80)} { ${prop}: ${r.style.getPropertyValue(prop)} }`);
          }
        }
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ } }
    for (const el of document.querySelectorAll('html, body, main, #root, #app, #__next, [class*=shell], [class*=layout]')) {
      for (const prop of el.style) {
        if (sizeProp.test(prop) && vpUnit.test(el.style.getPropertyValue(prop))) hits.push(`${el.tagName.toLowerCase()}[style] { ${prop}: ${el.style.getPropertyValue(prop)} }`);
      }
    }
    return [...new Set(hits)].slice(0, 20);
  });
  for (const h of shell) warn('G9', `shell sized from viewport units: ${h}; pin it under a zoomed mount`);
  if (!shell.length) note('G9', 'no vw/vh/dvh/svh/lvh sizing on shell selectors');

  // ---- G5 stacking (mutates the DOM with off-screen clones, so it runs last) ----
  const stack = await page.evaluate(({ selectors }) => {
    const found = [];
    const seen = new Set();
    // Dedupe on kind+text, not anchor: one trapped element matched by two selectors is one finding.
    const push = (kind, anchor, text) => { const k = kind + '|' + text; if (!seen.has(k)) { seen.add(k); found.push({ kind, anchor, text }); } };
    const nameOf = (n) => (n.id ? '#' + n.id : (n.classList && n.classList.length ? '.' + n.classList[0] : n.tagName.toLowerCase()));
    const badOf = (el) => {
      const cs = getComputedStyle(el);
      const bad = [];
      if (cs.transform && cs.transform !== 'none') bad.push('transform:' + cs.transform.slice(0, 40));
      if (cs.filter && cs.filter !== 'none') bad.push('filter:' + cs.filter.slice(0, 40));
      if (cs.contain && cs.contain !== 'none') bad.push('contain:' + cs.contain);
      return bad;
    };
    let targets = 0;
    for (const sel of selectors) {
      let matches = [];
      try { matches = [...document.querySelectorAll(sel)]; } catch { continue; }
      for (const el of matches.slice(0, 40)) {
        targets++;
        // (i) ancestors with transform/filter/contain: a containing block that traps the overlay whatever its z-index.
        for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const bad = badOf(n);
          if (bad.length) push('ancestor', sel, nameOf(n) + ' -> ' + bad.join(','));
        }
        // (ii) siblings of the nearest stacking-context ancestor: identity-transformed rows paint OVER the overlay.
        let sc = null;
        for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const isSC = cs.transform !== 'none' || cs.filter !== 'none' || cs.contain !== 'none'
            || parseFloat(cs.opacity) < 1 || (cs.position !== 'static' && cs.zIndex !== 'auto');
          if (isSC) { sc = n; break; }
        }
        const host = sc || el;
        if (host.parentElement) {
          for (const sib of host.parentElement.children) {
            if (sib === host) continue;
            const bad = badOf(sib);
            if (bad.length) push('sibling', sel, nameOf(sib) + ' -> ' + bad.join(','));
          }
        }
        // (iii) stripped presentation: capture inlines styles for VISIBLE nodes only, so the shown state may have no box.
        // Nav-style [class*=menu] is static by design; only true overlays get the position/background probe.
        const overlayish = /dropdown|popover|tooltip|listbox|dialog|role=menu/i.test(sel);
        try {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'position:absolute;left:-99999px;top:0;width:800px;';
          const clone = el.cloneNode(true);
          clone.style.setProperty('display', 'block', 'important');
          clone.style.setProperty('visibility', 'visible', 'important');
          wrap.appendChild(clone);
          document.body.appendChild(wrap);
          const cs = getComputedStyle(clone);
          const bg = cs.backgroundColor;
          const transparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
          if (clone.offsetHeight === 0) push('stripped', sel, nameOf(el) + ' -> offsetHeight 0 when shown');
          else if (overlayish) {
            if (cs.position === 'static') push('stripped', sel, nameOf(el) + ' -> position:static when shown (overlay placement stripped)');
            if (transparent) push('stripped', sel, nameOf(el) + ' -> transparent background when shown (panel chrome stripped)');
          }
          wrap.remove();
        } catch { /* clone probe is best-effort */ }
      }
    }
    return { found, targets };
  }, { selectors: interactive });
  if (!stack.targets) notRun('G5', `no element matched any interactive selector (${interactive.join(', ')})`);
  else {
    note('G5', `${stack.targets} target(s) audited across ${interactive.length} selector(s)`);
    for (const h of stack.found) {
      if (h.kind === 'ancestor') warn('G5', `${h.text} on the ancestor chain of ${h.anchor}: traps the overlay in that stacking context and breaks camera math`);
      else if (h.kind === 'sibling') warn('G5', `${h.text} beside ${h.anchor}: a sibling stacking context paints over the revealed overlay (strip identity transforms or add transform:none)`);
      else warn('G5', `${h.anchor} ${h.text}: the shown state was never serialized (restore the product's own box inline)`);
    }
  }

  // ---- G2 paint diff ----
  if (args['no-paint-diff']) notRun('G2', 'suppressed by --no-paint-diff');
  else if (!fs.existsSync(refPath)) notRun('G2', 'no live-reference.png beside index.html (ingested saves have none; re-freeze to get one)');
  else {
    const cmp = await browser.newPage();
    try {
      await cmp.setContent('<!doctype html><html><body></body></html>');
      const result = await cmp.evaluate(async ({ a, b, width }) => {
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode failed')); i.src = src; });
        const gray = async (src) => {
          const img = await load(src);
          const h = Math.max(2, Math.round(img.naturalHeight * width / img.naturalWidth / 2) * 2);
          const c = document.createElement('canvas'); c.width = width; c.height = h;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, width, h);
          const d = ctx.getImageData(0, 0, width, h).data;
          const g = new Float64Array(width * h);
          let sum = 0;
          for (let i = 0, j = 0; i < d.length; i += 4, j++) { g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += g[j]; }
          const mean = sum / g.length;
          let v = 0; for (let j = 0; j < g.length; j++) { const dd = g[j] - mean; v += dd * dd; }
          return { g, mean, std: Math.sqrt(v / g.length), w: width, h, srcW: img.naturalWidth, srcH: img.naturalHeight };
        };
        const A = await gray(a), B = await gray(b);
        const out = { live: { mean: A.mean, std: A.std, w: A.srcW, h: A.srcH }, frozen: { mean: B.mean, std: B.std, w: B.srcW, h: B.srcH } };
        if (A.g.length === B.g.length) { let s = 0; for (let i = 0; i < A.g.length; i++) s += Math.abs(A.g[i] - B.g[i]); out.mad = s / A.g.length; }
        return out;
      }, { a: 'data:image/png;base64,' + fs.readFileSync(refPath).toString('base64'), b: 'data:image/png;base64,' + frozenPng.toString('base64'), width: 480 });
      // Measure each side BEFORE trusting the diff: a near-zero std side is a blank or broken reference.
      note('G2', `live mean ${result.live.mean.toFixed(1)} std ${result.live.std.toFixed(1)} (${result.live.w}x${result.live.h}); frozen mean ${result.frozen.mean.toFixed(1)} std ${result.frozen.std.toFixed(1)} (${result.frozen.w}x${result.frozen.h}); a near-zero std side is a blank reference, distrust the diff`);
      gates.G2.live = result.live; gates.G2.frozen = result.frozen;
      if (result.mad === undefined) warn('G2', `dimension mismatch (live ${result.live.w}x${result.live.h} vs frozen ${result.frozen.w}x${result.frozen.h}): viewports differ, comparison not run`);
      else {
        gates.G2.mean_abs_diff = result.mad;
        if (result.mad > 8) {
          const frozenPath = path.join(dir, 'gates-frozen.png');
          fs.writeFileSync(frozenPath, frozenPng);
          warn('G2', `mean abs diff ${result.mad.toFixed(1)}/255 (over 8): the frozen page paints differently from the live one (CSSOM-injected styles are the usual cause). Clear this ONLY by looking at live-reference.png next to gates-frozen.png, or by fixing the capture; never by explaining it`);
        } else note('G2', `mean abs diff ${result.mad.toFixed(1)}/255`);
      }
    } finally { await cmp.close().catch(() => {}); }
  }
} finally {
  await browser.close().catch(() => {});
  await server.close();
}

// ---------- output ----------

const warnCount = Object.values(gates).reduce((n, g) => n + (g.status === 'WARN' ? g.findings.length : 0), 0);
const notRunList = Object.entries(gates).filter(([, g]) => g.status === 'NOT RUN').map(([id, g]) => `${id} ${GATE_NAMES[id]} - ${g.notes[0]}`);
const report = { slug, ran_at: nowIso(), viewport, gates, warn_count: warnCount, not_run: notRunList };
const outPath = path.join(dir, 'gates.json');
writeJson(outPath, report);

const summary = `${warnCount} WARN, ${notRunList.length} NOT RUN - a gate that never fired is not a gate that passed`;
if (args.json) {
  console.log(JSON.stringify(report, null, 2));
  console.error(summary);
  console.error(`wrote ${outPath}`);
} else {
  console.log(`gates: ${slug}  (viewport ${viewport.width}x${viewport.height}${meta.path ? ', path ' + meta.path : ''})`);
  for (const [id, g] of Object.entries(gates)) {
    if (g.status === 'NOT RUN') { console.log(`NOT RUN ${id} ${GATE_NAMES[id]} - ${g.notes[0]}`); continue; }
    console.log(`${g.status.padEnd(4)} ${id} ${GATE_NAMES[id]}`);
    for (const n of g.notes) console.log(`       ${n}`);
    for (const f of g.findings) console.log(`  WARN ${f}`);
  }
  console.log(summary);
  console.log(`wrote ${outPath}`);
}
