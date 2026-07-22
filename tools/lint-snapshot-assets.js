#!/usr/bin/env node
// lint-snapshot-assets.js — load a snapshot headless and list every asset
// request that 404s (P1-6, tutorial-system-fixes 2026-07-22: 30 console 404s
// on the entry-automation first smoke — per-snapshot CSS resolving
// ../webfonts/*, root-absolute /wpforms/assets/... plugin images, etc.).
//
// Serves the repo root (same server the outline generator uses) so
// root-absolute refs resolve exactly as they do in a video run, then loads
// /snapshots/<slug>/index.html and records every 4xx/5xx response and
// failed request.
//
// Usage:
//   node tools/lint-snapshot-assets.js <slug> [<slug2> ...]
//
// Runs as a post-capture step; standalone for auditing older snapshots.
// Exit: 0 clean · 1 any snapshot had failures · 2 usage.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;

async function lintSlug(page, slug) {
  const failures = [];
  const onResponse = (r) => {
    if (/\/__preview/.test(r.url())) return; // dev-server live-reload probe, not the snapshot
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  };
  const onFailed = (req) => {
    // net::ERR_ABORTED for cancelled loads is noise; report real failures.
    const err = (req.failure() || {}).errorText || '';
    if (err && err !== 'net::ERR_ABORTED') failures.push(`${err} ${req.url()}`);
  };
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  try {
    await page.goto(`http://localhost:${PORT}/snapshots/${slug}/index.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000); // late font/img fetches
  } finally {
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
  }
  return failures;
}

async function main() {
  const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!slugs.length) {
    console.error('Usage: node tools/lint-snapshot-assets.js <slug> [<slug2> ...]');
    process.exit(2);
  }
  for (const slug of slugs) {
    if (!fs.existsSync(path.join(ROOT, 'snapshots', slug, 'index.html'))) {
      console.error(`✗ snapshots/${slug}/index.html not found`);
      process.exit(2);
    }
  }

  const server = await ensureServer(PORT);
  const browser = await chromium.launch({ headless: true });
  let bad = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1380, height: 668 } });
    for (const slug of slugs) {
      const failures = await lintSlug(page, slug);
      if (failures.length) {
        bad++;
        console.log(`✗ ${slug}: ${failures.length} failed asset request(s)`);
        for (const f of [...new Set(failures)]) console.log(`    ${f}`);
      } else {
        console.log(`✓ ${slug}: all asset requests resolved`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
