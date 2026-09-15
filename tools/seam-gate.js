#!/usr/bin/env node
// tools/seam-gate.js — measure exit/entry velocity (px/s) at every cut of a
// single-HTML film. Enforcement tooling for the transitions boundary contract
// (wpforms-marketing skill, "Snapshot transitions" — causality · velocity · direction):
// exits should still be moving, entries should already be in flight, and the
// two speeds should be within the same order of magnitude.
// Adopted from the workflow review: docs/video-system-improvements-2026-08-06.md S2
// (HeyGen ships the same idea as a per-template ledger its agents validate against).
//
// REPORT-ONLY by default: prints per-cut numbers + warnings, exits 0. Pass
// --strict to exit 1 on any warning. Single-HTML films only (needs window.__tl).
//
// ⚠ BEAT-DRIVEN films (await-driven play(), no window.__tl) CANNOT use this
// tool — startup gates on __tl and every seek runs through __tl.time(t)
// (fix-round B4 / ccs 17, sized and PARKED). The missing piece is a
// virtual-clock driver that pauses and steps the page clock (Playwright's
// page.clock is the design candidate) — a real design task, not timestamp
// plumbing: gsap's ticker, awaited setTimeout waits and rAF all have to
// follow the stepped clock coherently. Until then: shorts measure live via
// tools/probe-short.js; long-form beat-driven films measure the RENDER
// (dead-time.js CUT? markers + keyframes.js at the cut times).
//
// Cut marks, in priority order:
//   --cuts 3.2,7.5,12      explicit timestamps
//   (default)              the master timeline's GSAP labels, skipping t=0
//
// Usage:
//   node tools/seam-gate.js <slug> [--cuts t1,t2,...] [--eps 0.15]
//        [--ratio 8] [--min-speed 20] [--strict] [--port 4321] [--resolution WxH]
//
//   --eps       sampling half-window around each cut, seconds (default 0.15)
//   --ratio     warn when max(exit,entry)/min(exit,entry) exceeds this (default 8)
//   --min-speed warn "dead entry/exit" below this px/s (default 20)

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');
const { resolveResolution } = require('./stage-size');

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
function argVal(name, dflt) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : dflt;
}
if (!slug) {
  console.error('usage: node tools/seam-gate.js <slug> [--cuts t1,t2,...] [--eps 0.15] [--ratio 8] [--min-speed 20] [--strict] [--port 4321]');
  process.exit(2);
}

const PORT = Number(argVal('--port', process.env.PORT || 4321));
const EPS = Number(argVal('--eps', 0.15));
const RATIO = Number(argVal('--ratio', 8));
const MIN_SPEED = Number(argVal('--min-speed', 20));
const STRICT = argv.includes('--strict');
const CUTS_ARG = argVal('--cuts', null);
const HTML_PATH = path.join(__dirname, '..', 'videos', slug, 'index.html');
const RES = resolveResolution({ resolutionArg: argVal('--resolution', null), htmlPath: HTML_PATH });
const TARGET_URL = `http://localhost:${PORT}/videos/${slug}/index.html`;

// Injected once: collects a stable node list under .stage (or body), then
// window.__seamSample() returns [key, cx, cy, visible] per node at the current pose.
const SAMPLER_SRC = `
(function () {
  var root = document.querySelector('.stage') || document.body;
  var all = root.querySelectorAll('*');
  var nodes = [];
  for (var i = 0; i < all.length && nodes.length < 2000; i++) {
    var n = all[i];
    if (n.tagName === 'STYLE' || n.tagName === 'SCRIPT' || n.tagName === 'DEFS') continue;
    nodes.push(n);
  }
  window.__seamNodes = nodes;
  window.__seamSample = function () {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var r = n.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) { out.push(null); continue; }
      var cs = getComputedStyle(n);
      var vis = cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
      out.push([r.left + r.width / 2, r.top + r.height / 2, vis ? 1 : 0]);
    }
    return out;
  };
})();
void 0;
`;

function maxSpeed(a, b, eps, visKey) {
  // max px/s displacement among nodes visible at the sample the caller cares
  // about (visKey: 0 = visible in `a`, 1 = visible in `b`)
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i]; const pb = b[i];
    if (!pa || !pb) continue;
    if (visKey === 0 && !pa[2]) continue;
    if (visKey === 1 && !pb[2]) continue;
    const d = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const v = d / eps;
    if (v > max) max = v;
  }
  return max;
}

async function main() {
  // Timing-sensitive: runs alone (rf-video 25). --force overrides.
  require('./headless-lock').acquire('seam-gate', { force: process.argv.includes('--force') });
  if (!fs.existsSync(HTML_PATH)) {
    console.error('no film at videos/' + slug + '/index.html');
    process.exit(2);
  }

  await ensureServer(PORT);
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: RES.width, height: RES.height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));

  await page.goto(TARGET_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tl, null, { polling: 100, timeout: 25000 });
  await page.evaluate(() => { window.__tl.pause(); });
  await page.evaluate(SAMPLER_SRC);

  const duration = await page.evaluate(() => window.__tl.duration());

  let cuts; // [{ t, label }]
  if (CUTS_ARG) {
    cuts = CUTS_ARG.split(',').map((s) => ({ t: Number(s), label: '' }));
  } else {
    const labels = await page.evaluate(() => window.__tl.labels || {});
    cuts = Object.entries(labels)
      .map(([label, t]) => ({ t, label }))
      .filter((c) => c.t > EPS && c.t < duration - EPS)
      .sort((a, b) => a.t - b.t);
    if (!cuts.length) {
      console.log('[seam-gate] no timeline labels and no --cuts given — nothing to measure');
      await browser.close();
      process.exit(0);
    }
  }

  console.log(`[seam-gate] ${slug} — ${cuts.length} cuts, eps=${EPS}s, warn ratio>${RATIO} or speed<${MIN_SPEED}px/s`);
  let warnings = 0;
  const reportCuts = [];

  async function sampleAt(t) {
    return page.evaluate((tt) => { window.__tl.time(tt, false); return window.__seamSample(); }, t);
  }

  for (const { t, label } of cuts) {
    const before = await sampleAt(Math.max(0, t - EPS));
    const atCut = await sampleAt(t);
    const after = await sampleAt(Math.min(duration, t + EPS));

    const exitV = maxSpeed(before, atCut, EPS, 0);  // movers visible before the cut
    const entryV = maxSpeed(atCut, after, EPS, 1);  // movers visible after the cut

    const tag = label ? ` (${label})` : '';
    const flags = [];
    if (exitV < MIN_SPEED) flags.push('DEAD EXIT — outgoing beat is static at the cut');
    if (entryV < MIN_SPEED) flags.push('DEAD ENTRY — incoming beat starts from rest');
    const lo = Math.max(Math.min(exitV, entryV), 0.001);
    const ratio = Math.max(exitV, entryV) / lo;
    if (exitV >= MIN_SPEED && entryV >= MIN_SPEED && ratio > RATIO) {
      flags.push(`VELOCITY MISMATCH — ${ratio.toFixed(1)}x between exit and entry`);
    }

    console.log(`  cut ${t.toFixed(2)}s${tag}: exit ${exitV.toFixed(0)} px/s | entry ${entryV.toFixed(0)} px/s${flags.length ? '  ⚠ ' + flags.join('; ') : '  ok'}`);
    warnings += flags.length;
    reportCuts.push({ t: Number(t.toFixed(3)), label, exit: Math.round(exitV), entry: Math.round(entryV), flags });
  }

  if (errors.length) { console.log('[seam-gate] page errors: ' + errors.join(' | ')); warnings += errors.length; }
  await browser.close();
  console.log(warnings === 0 ? '[seam-gate] PASS — every seam moves' : `[seam-gate] ${warnings} warning(s) — judgement is Umair's; numbers are the evidence`);
  require('./lib/qc-report').writeSection(slug, 'seamGate', {
    pass: warnings === 0, warnings, eps: EPS, ratio: RATIO, minSpeed: MIN_SPEED,
    cuts: reportCuts, pageErrors: errors,
  });
  process.exit(STRICT && warnings ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
