#!/usr/bin/env node
// tools/probe-singlehtml.js — reusable seek-step QC harness for single-HTML
// timeline films. Loads the film's co-located checks module
// videos/<slug>/qc-probe.mjs, seek-steps the master timeline
// (window.__tl.time(t, false)) and asserts computed DOM state at each timestamp
// — scene isolation, number continuity, and (for tick-grid films) that beats
// land on their rhythm lattice.
//
// This REPLACES the throwaway tmp-probe-*.js scripts. Single-HTML timeline
// films can't be smoke-run visually in a browser pane (the RAF ticker throttles
// when the tab isn't focused, so playback freezes); seek-stepping headlessly is
// the working verification. smoke-singlehtml.js proves liveness (reaches
// __done, no errors); this proves per-scene correctness. (FA log #25.)
//
// Usage:
//   node tools/probe-singlehtml.js <slug> [--port 4321]
//
// The film ships its checks at videos/<slug>/qc-probe.mjs (default export).
// If that file is absent, the probe exits 0 with a "nothing to assert" note.
// See the schema at the bottom of this file, or any existing qc-probe.mjs.

const path = require('path');
const fs = require('fs');
const url = require('url');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');

// ── arg parse ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const portIdx = argv.indexOf('--port');
const PORT = portIdx !== -1 ? Number(argv[portIdx + 1]) : Number(process.env.PORT) || 4321;

if (!slug) {
  console.error('usage: node tools/probe-singlehtml.js <slug> [--port 4321]');
  process.exit(2);
}

const PROBE_PATH = path.join(__dirname, '..', 'videos', slug, 'qc-probe.mjs');
const TARGET_URL = `http://localhost:${PORT}/videos/${slug}/index.html`;

// ── film-agnostic default resolver (injected into the page) ──────────────────
// window.__qcDefault(sel, kind, want) resolves a plain top-document selector to
// a raw comparable value. Films with custom keys (odometer decode, iframe-
// internal DOM, split-flap readout) define window.__probeResolve via
// installProbe() and delegate plain selectors back here.
const QC_DEFAULT_SRC = `
window.__qcVisOf = function (node) {
  var cs = node.ownerDocument.defaultView.getComputedStyle(node);
  return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 ? 'vis' : 'hid';
};
window.__qcDefault = function (sel, kind, want) {
  var node = document.querySelector(sel);
  if (!node) return 'MISSING';
  if (kind === 'vis' || kind === 'hid') return window.__qcVisOf(node);
  if (kind === 'scale') {
    var t = getComputedStyle(node).transform;
    var m = new DOMMatrixReadOnly(t === 'none' ? undefined : t);
    return Math.round(m.a * 100) / 100;
  }
  if (kind === 'ztop') {
    var r = node.getBoundingClientRect();
    var stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    var first = stack.find(function (e) { return e.closest(sel) || (want && e.closest(want)); });
    return first && first.closest(sel) ? 'above' : 'below';
  }
  // text / val / starts and any other textual kind → trimmed textContent
  return node.textContent.trim();
};
void 0;
`;

// ── comparison per kind (film-agnostic, runs in Node) ────────────────────────
function compare(kind, got, want) {
  if (kind === 'vis') return got === 'vis';
  if (kind === 'hid') return got === 'hid';
  if (kind === 'val' || kind === 'text') return got === want;
  if (kind === 'starts') return String(got).indexOf(want) === 0;
  if (kind === 'scale') return Math.abs(got - want) < 0.03;
  if (kind === 'open') return got === 'open';
  if (kind === 'ztop') return got === 'above';
  return got === want; // generic fallback
}

async function main() {
  if (!fs.existsSync(PROBE_PATH)) {
    console.log(`no qc-probe.mjs at videos/${slug}/ — nothing to assert (run smoke-singlehtml for liveness)`);
    process.exit(0);
  }

  const probe = (await import(url.pathToFileURL(PROBE_PATH).href)).default;
  const tlGlobal = probe.timelineGlobal || '__tl';
  const bootTimeout = probe.bootTimeoutMs || 25000;
  const checks = probe.checks || [];

  await ensureServer(PORT);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));

  await page.goto(TARGET_URL, { waitUntil: 'load' });
  await page.waitForFunction((g) => !!window[g], tlGlobal, { polling: 100, timeout: bootTimeout });
  await page.evaluate((g) => { window[g].pause(); }, tlGlobal);

  // inject the film-agnostic default resolver, then the film's custom resolver
  await page.evaluate(QC_DEFAULT_SRC);
  if (probe.installProbe) {
    await page.evaluate(`(${probe.installProbe.toString()})(); void 0;`);
  } else {
    await page.evaluate('window.__probeResolve = window.__qcDefault; void 0;');
  }

  let failures = 0;
  for (const [t, asserts] of checks) {
    const results = await page.evaluate(({ t, asserts, g }) => {
      window[g].time(t, false);
      const resolver = window.__probeResolve || window.__qcDefault;
      return asserts.map(([sel, kind, want]) => {
        try { return resolver(sel, kind, want); }
        catch (e) { return 'ERR:' + String(e.message).slice(0, 40); }
      });
    }, { t, asserts, g: tlGlobal });

    asserts.forEach(([sel, kind, want], i) => {
      const got = results[i];
      if (!compare(kind, got, want)) {
        console.log('  x t=' + t + ' ' + sel + ' ' + kind + ' want=' + (want != null ? want : kind) + ' got=' + got);
        failures++;
      }
    });
    console.log('t=' + t + 's checked (' + asserts.length + ')');
  }

  // optional tick-grid audit: every tween of `tweenDuration` on a target with
  // `targetKey` must start on the (t0 + n*period) lattice. Child-local start
  // times are correct even when the film is nested under a master (see #2).
  if (probe.gridAudit) {
    const { tweenDuration, t0, period, targetKey } = probe.gridAudit;
    const grid = await page.evaluate(({ tweenDuration, t0, period, targetKey, g }) => {
      const bad = [];
      for (const tw of window[g].getChildren(true, true, false)) {
        const tgt = tw.targets && tw.targets()[0];
        if (!tgt || typeof tgt !== 'object' || !(targetKey in tgt) || tw.duration() !== tweenDuration) continue;
        const st = tw.startTime();
        const steps = (st - t0) / period;
        if (Math.abs(steps - Math.round(steps)) > 0.001) bad.push(st);
      }
      return bad;
    }, { tweenDuration, t0, period, targetKey, g: tlGlobal });
    if (grid.length) { console.log('  x off-grid ticks at ' + grid.join(', ')); failures += grid.length; }
    else console.log(`tick grid: all ${Math.round(tweenDuration * 1000)}ms rolls on the ${Math.round(period * 1000)}ms lattice`);
  }

  if (errors.length) { console.log('page errors: ' + errors.join(' | ')); failures += errors.length; }
  await browser.close();
  console.log(failures === 0 ? 'PROBE PASS' : 'PROBE FAIL (' + failures + ')');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

// ── checks-module contract (videos/<slug>/qc-probe.mjs, default export) ──────
//
// export default {
//   timelineGlobal: '__tl',        // optional, default '__tl'
//   bootTimeoutMs: 25000,          // optional; real-iframe films need ~25s
//   // ascending-time assertions. Each row: [t, [ [sel, kind, want?], ... ]]
//   //   kinds (harness default): vis, hid, text, val, starts, scale, ztop
//   //   kinds (custom-resolver): open, or anything installProbe returns
//   checks: [
//     [1.6, [['#splash','vis'], ['#splashMark','vis']]],
//     [10.1, [['odoE','val',275], ['conv','text','21.4%']]],
//   ],
//   // OPTIONAL: injected once; defines window.__probeResolve(sel, kind, want)
//   // returning the RAW comparable value for custom keys. Delegate plain
//   // selectors to window.__qcDefault(sel, kind, want).
//   installProbe: function () {
//     window.__probeResolve = function (sel, kind, want) {
//       if (sel === 'odoE') { /* decode odometer → number */ }
//       return window.__qcDefault(sel, kind, want);
//     };
//   },
//   // OPTIONAL: generic rhythm-lattice audit (tick-grid films only)
//   gridAudit: { tweenDuration: 0.24, t0: 0.30, period: 0.415, targetKey: 'v' },
// };
