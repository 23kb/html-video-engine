#!/usr/bin/env node
// capture-external.js — freeze a NON-WordPress page (OAuth/consent screens,
// SaaS dashboards) into a self-contained display-only snapshot (P1-8,
// tutorial-system-fixes 2026-07-22 — generalized from
// capture/_tmp/grab-google-oauth.js; addon tutorials keep needing frozen
// OAuth pages: Google, Dropbox, Slack, Google Sheets…).
//
// What it does, by construction:
//   · scripts / noscript / iframes stripped (display-only; never drivable)
//   · external stylesheets inlined as <style>, images inlined as data URIs
//   · <base> tag removed (a leftover base href made every relative fetch in
//     the preview resolve cross-origin — the preview-ws CORS noise class)
//   · <meta charset> ensured
//   · writes snapshots/<slug>/{index.html, meta.json} and registers the slug
//     in snapshots/index.json (category "external" by default) so
//     validate-singlehtml passes with zero manual steps. `_`/`zz-` slugs skip
//     registration (temp/infra convention).
//
// Usage:
//   node tools/capture-external.js <url> <slug> [--wait-url <regex>]
//     [--wait-for <selector>] [--viewport 1380x668]
//     [--shows "…"] [--topics a,b] [--category external]
//
//   --wait-url: for middleware redirect flows (e.g. the WPForms
//     google-drive-connect middleware → accounts.google.com), wait until the
//     final URL matches before freezing.
//
// NEVER enter credentials or complete consent with this tool — navigation
// and freezing only.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SNAP = require('./lib/paths').snapshotsRoot();
const INDEX_PATH = path.join(SNAP, 'index.json');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { url: null, slug: null, waitUrl: null, waitFor: null, viewport: '1380x668', shows: null, topics: null, category: 'external' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--wait-url') out.waitUrl = a[++i];
    else if (a[i] === '--wait-for') out.waitFor = a[++i];
    else if (a[i] === '--viewport') out.viewport = a[++i];
    else if (a[i] === '--shows') out.shows = a[++i];
    else if (a[i] === '--topics') out.topics = a[++i].split(',').map(t => t.trim()).filter(Boolean);
    else if (a[i] === '--category') out.category = a[++i];
    else if (!out.url) out.url = a[i];
    else if (!out.slug) out.slug = a[i];
  }
  return out;
}

function registerInIndex(slug, { shows, topics, category, sourceUrl }) {
  if (slug.startsWith('_') || slug.startsWith('zz-')) {
    console.log(`  index.json: ${slug} not registered (temp/infra slug convention)`);
    return;
  }
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const existing = idx.snapshots.find(s => s.slug === slug);
  if (existing) {
    if (shows) existing.shows = shows;
    if (topics) existing.topics = topics;
    if (category) existing.category = category;
    console.log(`  index.json: ${slug} already registered — ${shows || topics ? 'updated from flags' : 'left alone'}`);
  } else {
    const entry = {
      slug,
      category: category || 'external',
      shows: shows || `TODO-describe: frozen external page (${new URL(sourceUrl).host})`,
      topics: topics || slug.split('-').filter(w => w.length > 2),
      sourcePath: sourceUrl,
    };
    const at = idx.snapshots.findIndex(s => s.slug > slug);
    idx.snapshots.splice(at === -1 ? idx.snapshots.length : at, 0, entry);
    console.log(`  index.json: ${slug} registered (${entry.shows.startsWith('TODO') ? 'TODO-describe placeholder — refine with --shows/--topics' : 'described'})`);
  }
  idx.count = idx.snapshots.length;
  idx.generatedAt = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 1) + '\n', 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url || !args.slug) {
    console.error('Usage: node tools/capture-external.js <url> <slug> [--wait-url <regex>] [--wait-for <sel>] [--viewport WxH] [--shows "…"] [--topics a,b] [--category external]');
    process.exit(1);
  }
  const [vw, vh] = args.viewport.split('x').map(Number);
  if (!vw || !vh) { console.error(`bad --viewport: ${args.viewport}`); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: vw, height: vh } });
    const page = await context.newPage();
    console.log(`→ navigating ${args.url}`);
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (args.waitUrl) {
      console.log(`→ waiting for URL matching /${args.waitUrl}/ (redirect middleware)…`);
      await page.waitForURL(new RegExp(args.waitUrl), { timeout: 60000 });
    }
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    if (args.waitFor) {
      console.log(`→ waitFor ${args.waitFor}`);
      await page.waitForSelector(args.waitFor, { timeout: 15000 })
        .catch(() => console.warn(`  ⚠ waitFor not found — freezing anyway`));
    }
    await page.waitForTimeout(2000);
    const landed = page.url();
    console.log(`→ landed: ${landed.slice(0, 100)}`);

    const frozen = await page.evaluate(async () => {
      const doc = document.cloneNode(true);
      doc.querySelectorAll('script, noscript, iframe').forEach(el => el.remove());
      // A leftover <base> re-roots every relative URL in the preview → CORS noise.
      doc.querySelectorAll('base').forEach(el => el.remove());
      for (const link of [...doc.querySelectorAll('link[rel="stylesheet"]')]) {
        try {
          const res = await fetch(link.href);
          const css = await res.text();
          const style = doc.createElement('style');
          style.textContent = css;
          link.replaceWith(style);
        } catch (e) { link.remove(); }
      }
      // Non-stylesheet external links (favicons, preconnects) are dead weight.
      doc.querySelectorAll('link[href]').forEach(el => el.remove());
      const toDataUri = async url => {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      };
      for (const img of [...doc.querySelectorAll('img[src]')]) {
        try { if (!img.src.startsWith('data:')) img.setAttribute('src', await toDataUri(img.src)); } catch (e) { /* keep */ }
      }
      if (!doc.querySelector('meta[charset]')) {
        const meta = doc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        doc.head && doc.head.prepend(meta);
      }
      return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
    });

    const dir = path.join(SNAP, args.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), frozen, 'utf8');
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
      sourceUrl: landed,
      requestedUrl: args.url,
      capturedAt: new Date().toISOString(),
      external: true,
      note: 'Display-only frozen external page (scripts stripped, css+img inlined, base removed). Captured via tools/capture-external.js — no credentials, no consent.',
    }, null, 2));
    console.log(`✓ wrote snapshots/${args.slug}/index.html (${Math.round(frozen.length / 1024)} KB, self-contained)`);
    registerInIndex(args.slug, { shows: args.shows, topics: args.topics, category: args.category, sourceUrl: landed });
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(e => { console.error(e); process.exit(1); });
