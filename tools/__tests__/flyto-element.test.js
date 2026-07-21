#!/usr/bin/env node
// FIX-1 (fa-retest 2026-07-13) — flyToElement: decomposed tutorial camera.
//
// Both FA test builds' v1 audits capped at tier B because the tutorial camera
// shipped as a bare single-tween translate+scale. flyToElement is the library
// form of the fix: a two-phase dip/pan → land arc. This test drives it against
// a stub IframeManager (no browser, no gsap — the helper's Node-safe fallback
// path) and asserts the arc's contract.
//
// Usage: node tools/__tests__/flyto-element.test.js

const path = require('path');
const { pathToFileURL } = require('url');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

async function main() {
  const mod = await import(pathToFileURL(path.resolve(__dirname, '..', '..', 'videos', '_shared', 'iframe-helpers.js')).href);
  ok(typeof mod.flyToElement === 'function', 'flyToElement is exported from iframe-helpers.js');

  section('Two-phase arc between poses');
  {
    const calls = [];
    const stub = {
      cameraState: () => ({ zoom: 1.6, tx: -100, ty: -50 }),
      cameraToElement: () => ({ zoom: 1.8, tx: -300, ty: -140 }),
      tweenCamera: (p) => { calls.push(p); return Promise.resolve(); },
    };
    const pose = await mod.flyToElement({ iframeManager: stub }, '.x', { duration: 1.0 });
    ok(calls.length === 2, `exactly two tweenCamera phases (${calls.length})`);
    ok(Math.abs(calls[0].zoom - 1.6 * 0.96) < 1e-9, 'dip zoom = min(cur, target) × 0.96');
    ok(calls[0].zoom < Math.min(1.6, 1.8), 'dip sits below both poses (visible scale arc)');
    ok(Math.abs(calls[0].tx - (-100 + (-300 - -100) * 0.42)) < 1e-9, 'dip phase covers 42% of the translation');
    ok(Math.abs(calls[0].duration - 0.42) < 1e-9 && Math.abs(calls[1].duration - 0.58) < 1e-9, 'duration split 42/58');
    ok(calls[0].ease === 'power2.in', 'dip phase uses power2.in');
    ok(calls[1].zoom === 1.8 && calls[1].tx === -300 && calls[1].ty === -140, 'landing phase hits the measured pose exactly');
    ok(calls[1].ease === 'power3.out', 'Node env (no CustomEase) falls back to power3.out');
    ok(pose && pose.zoom === 1.8, 'resolves with the landed pose');
  }

  section('From rest (zoom 1) the dip clamps to 1 — translate-then-zoom shape');
  {
    const calls = [];
    const stub = {
      cameraState: () => ({ zoom: 1, tx: 0, ty: 0 }),
      cameraToElement: () => ({ zoom: 1.8, tx: -300, ty: -140 }),
      tweenCamera: (p) => { calls.push(p); return Promise.resolve(); },
    };
    await mod.flyToElement({ iframeManager: stub }, '.x', {});
    ok(calls[0].zoom === 1, 'dip clamps to zoom 1 (never below content edge)');
    ok(calls[1].zoom === 1.8, 'still lands on the target zoom');
  }

  section('Options pass through to cameraToElement');
  {
    let seen = null;
    const stub = {
      cameraState: () => ({ zoom: 1, tx: 0, ty: 0 }),
      cameraToElement: (t, o) => { seen = o; return { zoom: 1.5, tx: 0, ty: 0 }; },
      tweenCamera: () => Promise.resolve(),
    };
    await mod.flyToElement({ iframeManager: stub }, '.x', { fill: 0.5, pad: 10, maxZoom: 1.7, minZoom: 1.1 });
    ok(seen.fill === 0.5 && seen.pad === 10 && seen.maxZoom === 1.7 && seen.minZoom === 1.1, 'fill/pad/maxZoom/minZoom forwarded');
    ok(true, `default maxZoom is 2.0 (iframe sharpness limit) — spot-checked next`);
    await mod.flyToElement({ iframeManager: stub }, '.x', {});
    ok(seen.maxZoom === 2.0, 'default maxZoom = 2.0');
  }

  section('Defensive contract (glideClick parity)');
  {
    const stub = {
      cameraState: () => ({ zoom: 1, tx: 0, ty: 0 }),
      cameraToElement: () => { throw new Error('target not found: .missing'); },
      tweenCamera: () => Promise.resolve(),
    };
    const r = await mod.flyToElement({ iframeManager: stub }, '.missing', { silent: true });
    ok(r === null, 'warn-and-null on failure — never throws into the timeline');
  }

  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
