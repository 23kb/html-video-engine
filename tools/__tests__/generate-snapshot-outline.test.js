#!/usr/bin/env node
// Test suite for tools/generate-snapshot-outline.js — the per-snapshot sidecar.
//
// No test runner is configured in this repo, so this is a self-contained Node
// script: it boots one dev server + one browser, runs every gate, prints
// ✓/✗ per check, and exits non-zero if anything fails.
//
// Usage:
//   node tools/__tests__/generate-snapshot-outline.test.js          (representatives — fast)
//   node tools/__tests__/generate-snapshot-outline.test.js --all    (every outline — full gate)
//
// Gates:
//   1. Selector resolution — every selector in every checked outline.md
//      resolves in that snapshot's live DOM. 0 dangling = pass. (core gate)
//   2. Size band — every outline ≤ 12 KB (hard); soft target 8 KB reported.
//   3. Idempotency — regenerating an outline is byte-identical.
//   4. Interactivity goldens — builder-fields drives activate-canvas-field;
//      an admin-* snapshot lists cross-snapshot nav as HAND-BROWSE-ONLY only.
//   5. Pipeline — post-capture.js runs the generator end-to-end (temp copy).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { ensureServer, allSnapshotSlugs } = require('../generate-snapshot-outline.js');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAP = require('../lib/paths').snapshotsRoot();
const GEN = path.join(ROOT, 'tools', 'generate-snapshot-outline.js');
const POST = path.join(ROOT, 'tools', 'post-capture.js');
const PORT = Number(process.env.PORT) || 4321;
const FULL = process.argv.includes('--all');
const REPRESENTATIVES = ['admin-tools-import-entries', 'admin-forms-overview', 'builder-fields', 'builder-setup'];

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function outlinePath(slug) { return path.join(SNAP, slug, 'outline.md'); }
function readOutline(slug) { return fs.readFileSync(outlinePath(slug), 'utf8'); }

// First inline-code token of each "- " bullet is a selector (targets have no
// event prefix; drivable/nav lines have an "event " word first). "+N more"
// notes have no leading backtick and are skipped.
function selectorsFromOutline(md) {
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^- (?:[a-z]+ )?`([^`]+)`/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}
// The drivable line that names a given transition label → its selector.
function driveLineSelector(md, label) {
  for (const line of md.split(/\r?\n/)) {
    if (line.includes('`' + label + '`')) {
      const m = /^- [a-z]+ `([^`]+)`/.exec(line);
      if (m) return m[1];
    }
  }
  return null;
}

async function loadFrame(browser, slug) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const url = `http://localhost:${PORT}/scenes/snapshot-viewer.html?snap=${slug}`;
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  const handle = await page.waitForSelector('iframe#frame', { state: 'attached', timeout: 15000 });
  const frame = await handle.contentFrame();
  // Match the generator: wait for FULL parse so validation sees the same
  // settled DOM the outline was generated against (5 MB snapshots stream).
  await frame.waitForFunction(() => document.readyState === 'complete', { timeout: 25000 });
  await page.waitForTimeout(300);
  return { page, frame };
}

async function resolveSelectors(frame, selectors) {
  return frame.evaluate((sels) => sels.map((s) => {
    try { return document.querySelector(s) ? 'ok' : 'dangling'; }
    catch (_) { return 'invalid'; }
  }), selectors);
}

async function main() {
  // Ensure outlines exist for the slugs we test.
  const targets = FULL
    ? allSnapshotSlugs().filter(s => fs.existsSync(outlinePath(s)))
    : REPRESENTATIVES;
  for (const slug of REPRESENTATIVES) {
    if (!fs.existsSync(outlinePath(slug))) {
      console.error(`Missing outline for ${slug}. Generate first: node tools/generate-snapshot-outline.js ${slug}`);
      process.exit(2);
    }
  }

  const server = await ensureServer(PORT);
  const browser = await chromium.launch({ headless: true });

  try {
    // ── Gate 1: selector resolution (core) ──────────────────────────────
    section(`Gate 1 — selector resolution (${targets.length} snapshot${targets.length === 1 ? '' : 's'})`);
    let totalSel = 0, totalDangling = 0;
    for (const slug of targets) {
      const sels = selectorsFromOutline(readOutline(slug));
      totalSel += sels.length;
      const { page, frame } = await loadFrame(browser, slug);
      const res = await resolveSelectors(frame, sels);
      await page.close().catch(() => {});
      const bad = sels.filter((s, i) => res[i] !== 'ok').map((s, i) => ({ s, r: res[sels.indexOf(s)] }));
      const dangling = res.filter(r => r !== 'ok').length;
      totalDangling += dangling;
      ok(dangling === 0, `${slug}: ${sels.length} selectors, ${dangling} dangling`);
      if (dangling) {
        for (const b of bad.slice(0, 8)) console.log(`        ${b.r}: ${b.s}`);
      }
    }
    console.log(`    → ${totalSel} selectors checked, ${totalDangling} dangling total`);

    // ── Gate 2: size band ───────────────────────────────────────────────
    section('Gate 2 — size band (≤ 12 KB hard, 8 KB soft target)');
    const sizeSlugs = FULL ? targets : allSnapshotSlugs().filter(s => fs.existsSync(outlinePath(s)));
    let over = [], soft = [];
    for (const slug of sizeSlugs) {
      const bytes = fs.statSync(outlinePath(slug)).size;
      if (bytes > 12 * 1024) over.push(`${slug} (${(bytes / 1024).toFixed(1)}KB)`);
      else if (bytes > 8 * 1024) soft.push(`${slug} (${(bytes / 1024).toFixed(1)}KB)`);
    }
    ok(over.length === 0, `no outline over 12 KB hard cap (${sizeSlugs.length} checked)`);
    if (over.length) console.log('        OVER: ' + over.join(', '));
    if (soft.length) console.log('        over-soft (allowed, large surface): ' + soft.join(', '));

    // ── Gate 3: idempotency ─────────────────────────────────────────────
    // Cover an admin snapshot AND a builder one (more inits run on builders —
    // initCanvasFieldActiveSync etc. — so it's the stronger determinism test).
    section('Gate 3 — idempotency (byte-identical regeneration)');
    for (const idSlug of ['admin-tools-import-entries', 'builder-fields']) {
      // Regenerate a temp copy beside the real one (so ../_shared/ resolves) —
      // regenerating the real outline left snapshots/ modified after every run.
      const copy = '_gate3-' + idSlug;
      const copyDir = path.join(SNAP, copy);
      try {
        fs.rmSync(copyDir, { recursive: true, force: true });
        fs.cpSync(path.join(SNAP, idSlug), copyDir, { recursive: true });
        execFileSync(process.execPath, [GEN, copy], { stdio: 'ignore' });
        const a = readOutline(copy);
        execFileSync(process.execPath, [GEN, copy], { stdio: 'ignore' });
        const b = readOutline(copy);
        ok(a === b, `${idSlug}: two regenerations byte-identical`);
      } finally {
        fs.rmSync(copyDir, { recursive: true, force: true });
      }
    }

    // ── Gate 4: interactivity goldens ───────────────────────────────────
    section('Gate 4 — interactivity goldens');
    // 4a — builder-fields drives activate-canvas-field on a canvas field.
    {
      const md = readOutline('builder-fields');
      const drivable = md.split('HAND-BROWSE ONLY')[0];
      const present = /`activate-canvas-field`/.test(drivable);
      ok(present, 'builder-fields: activate-canvas-field listed as drivable');
      const sel = driveLineSelector(md, 'activate-canvas-field');
      const { page, frame } = await loadFrame(browser, 'builder-fields');
      const good = sel ? await frame.evaluate((s) => {
        try { const n = document.querySelector(s); return !!(n && n.matches('.wpforms-field[data-field-id]')); }
        catch (_) { return false; }
      }, sel) : false;
      await page.close().catch(() => {});
      ok(good, `builder-fields: its selector (${sel}) resolves to a .wpforms-field[data-field-id]`);
    }
    // 4b — an admin-* snapshot lists cross-snapshot nav ONLY under hand-browse.
    {
      const md = readOutline('admin-forms-overview');
      const [drivable, handbrowse = ''] = md.split('HAND-BROWSE ONLY');
      ok(/cross-snapshot nav/.test(handbrowse), 'admin-forms-overview: cross-snapshot nav under HAND-BROWSE-ONLY');
      ok(!/cross-snapshot nav/.test(drivable), 'admin-forms-overview: cross-snapshot nav NOT under drivable');
    }

    // ── Gate 5: post-capture pipeline (temp copy; restores global index) ──
    section('Gate 5 — post-capture.js runs the generator end-to-end');
    const tmp = '_outline_pipeline_test';
    const tmpDir = path.join(SNAP, tmp);
    const catalogIndex = path.join(SNAP, 'CATALOG.md');
    const indexBackup = fs.existsSync(catalogIndex) ? fs.readFileSync(catalogIndex) : null;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.cpSync(path.join(SNAP, 'admin-tools-import-entries'), tmpDir, { recursive: true });
      fs.rmSync(path.join(tmpDir, 'outline.md'), { force: true }); // ensure it's freshly produced
      execFileSync(process.execPath, [POST, tmp], { stdio: 'ignore' });
      const produced = fs.existsSync(path.join(tmpDir, 'outline.md')) &&
        fs.statSync(path.join(tmpDir, 'outline.md')).size > 200;
      ok(produced, 'post-capture.js produced outline.md for the temp snapshot');
    } catch (e) {
      ok(false, 'post-capture.js ran without error — ' + e.message.split('\n')[0]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (indexBackup) fs.writeFileSync(catalogIndex, indexBackup); // un-pollute the index
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
