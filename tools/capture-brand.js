#!/usr/bin/env node
// tools/capture-brand.js — capture a partner brand's REAL assets from its
// website: logo SVGs, icons, palette, and font stacks. For integration/addon
// videos (Klaviyo, Mailchimp, Stripe, …) where the standing rule is "real
// partner visuals only — never recolor, never redraw" and sessions kept
// getting blocked on missing third-party logo assets (entry-importer
// ISSUES.md #5). Capture the brand, don't guess it.
// Adopted from the workflow review: docs/video-system-improvements-2026-08-06.md S4.
//
// What it pulls:
//   · inline <svg> marks found in header/nav/logo-ish containers → .svg files
//   · <link rel*="icon"> + apple-touch-icon + og:image → downloaded files
//   · palette: top non-transparent background/text colors by frequency,
//     plus meta theme-color
//   · font stacks: computed font-family of body / headings / buttons
//
// Output: videos/<slug>/assets/brand/ (or --out DIR) with brand.json
// (provenance: source URL + capture date + per-asset origin). WPForms' own
// brand never goes through this — reference/wpforms-brand/ is canonical.
//
// Usage:
//   node tools/capture-brand.js <url> <slug> [--out dir] [--viewport 1380x900]

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const args = { url: null, slug: null, out: null, viewport: '1380x900' };
  const pos = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--viewport') args.viewport = argv[++i];
    else if (!a.startsWith('--')) pos.push(a);
    else { console.error('unknown arg: ' + a); process.exit(2); }
  }
  [args.url, args.slug] = pos;
  if (!args.url || !args.slug) {
    console.error('usage: node tools/capture-brand.js <url> <slug> [--out dir] [--viewport WxH]');
    process.exit(2);
  }
  return args;
}

function safeName(s, fallback) {
  const base = String(s).split('/').pop().split('?')[0].replace(/[^A-Za-z0-9._-]/g, '_');
  return base || fallback;
}

async function main() {
  const args = parseArgs(process.argv);
  const [vw, vh] = args.viewport.split('x').map(Number);
  const outDir = path.resolve(args.out || path.join(__dirname, '..', 'videos', args.slug, 'assets', 'brand'));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  console.log('[capture-brand] visiting ' + args.url);
  await page.goto(args.url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500); // late-loading fonts/logos

  const data = await page.evaluate(() => {
    const abs = (u) => { try { return new URL(u, location.href).href; } catch (_) { return null; } };

    // 1. inline SVG logo candidates — svgs inside header/nav/home-link/logo-ish wrappers
    const svgSel = 'header svg, nav svg, a[href="/"] svg, [class*="logo" i] svg, [id*="logo" i] svg, [aria-label*="logo" i] svg';
    const svgs = [];
    const seen = new Set();
    for (const svg of document.querySelectorAll(svgSel)) {
      const html = svg.outerHTML;
      if (html.length < 100 || html.length > 200000 || seen.has(html)) continue;
      seen.add(html);
      const r = svg.getBoundingClientRect();
      svgs.push({ html, w: Math.round(r.width), h: Math.round(r.height) });
      if (svgs.length >= 6) break;
    }

    // 2. logo <img> candidates + icons + og:image
    const imgUrls = [];
    for (const img of document.querySelectorAll('header img, nav img, a[href="/"] img, [class*="logo" i] img')) {
      const u = abs(img.currentSrc || img.src);
      if (u) imgUrls.push({ url: u, kind: 'logo-img' });
      if (imgUrls.length >= 6) break;
    }
    for (const l of document.querySelectorAll('link[rel*="icon" i]')) {
      const u = abs(l.href);
      if (u) imgUrls.push({ url: u, kind: 'icon' });
    }
    const og = document.querySelector('meta[property="og:image"]');
    if (og && abs(og.content)) imgUrls.push({ url: abs(og.content), kind: 'og-image' });

    // 3. palette by frequency across visible elements (capped walk)
    const counts = new Map();
    const bump = (c) => {
      if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return;
      counts.set(c, (counts.get(c) || 0) + 1);
    };
    const els = document.querySelectorAll('body *');
    for (let i = 0; i < els.length && i < 1200; i++) {
      const cs = getComputedStyle(els[i]);
      bump(cs.backgroundColor);
      bump(cs.color);
    }
    const palette = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
      .map(([color, count]) => ({ color, count }));

    // 4. accent guesses: primary buttons / prominent links
    const accents = [];
    for (const b of document.querySelectorAll('button, a[class*="btn" i], [class*="button" i], [class*="cta" i]')) {
      const cs = getComputedStyle(b);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') accents.push(cs.backgroundColor);
      if (accents.length >= 12) break;
    }
    const themeColor = document.querySelector('meta[name="theme-color"]')?.content || null;

    // 5. font stacks
    const fontOf = (sel) => { const n = document.querySelector(sel); return n ? getComputedStyle(n).fontFamily : null; };
    const fonts = {
      body: fontOf('body'),
      heading: fontOf('h1') || fontOf('h2'),
      button: fontOf('button, a[class*="btn" i]'),
    };

    return {
      siteName: document.querySelector('meta[property="og:site_name"]')?.content || document.title,
      svgs, imgUrls, palette, accents: [...new Set(accents)], themeColor, fonts,
    };
  });

  const manifest = {
    source: args.url,
    capturedAt: new Date().toISOString(),
    siteName: data.siteName,
    themeColor: data.themeColor,
    palette: data.palette,
    accentCandidates: data.accents,
    fonts: data.fonts,
    files: [],
    note: 'REAL partner assets — never recolor, never redraw (standing rule). Check the partner brand guidelines for usage terms before shipping.',
  };

  // write inline SVGs
  data.svgs.forEach((s, i) => {
    const name = `logo-inline-${i + 1}-${s.w}x${s.h}.svg`;
    fs.writeFileSync(path.join(outDir, name), s.html, 'utf8');
    manifest.files.push({ file: name, kind: 'inline-svg', width: s.w, height: s.h });
  });

  // download image/icon URLs via the page's request context (carries cookies/referer)
  const seenUrls = new Set();
  for (const { url, kind } of data.imgUrls) {
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    try {
      const resp = await page.request.get(url, { timeout: 15000 });
      if (!resp.ok()) { console.log('  skip (' + resp.status() + ') ' + url); continue; }
      const body = await resp.body();
      if (body.length < 64 || body.length > 5 * 1024 * 1024) continue;
      const name = `${kind}-${safeName(url, 'asset')}`;
      fs.writeFileSync(path.join(outDir, name), body);
      manifest.files.push({ file: name, kind, from: url, bytes: body.length });
    } catch (e) {
      console.log('  skip (fetch failed) ' + url);
    }
  }

  fs.writeFileSync(path.join(outDir, 'brand.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  await browser.close();

  console.log(`[capture-brand] ${manifest.files.length} asset(s) + brand.json -> ${path.relative(process.cwd(), outDir)}`);
  console.log('[capture-brand] palette top: ' + manifest.palette.slice(0, 5).map((p) => p.color).join('  '));
  console.log('[capture-brand] fonts: body=' + (manifest.fonts.body || '?') + ' | heading=' + (manifest.fonts.heading || '?'));
  console.log('[capture-brand] REMINDER: these are real partner assets — verify brand-guideline terms; never recolor.');
}

main().catch((e) => { console.error(e); process.exit(1); });
