#!/usr/bin/env node
// smoke-singlehtml.js — headless runtime smoke for single-HTML videos (FIX-1).
//
// tools/check-video-playback.js only boots scenes/player.html (engine videos).
// This is its single-HTML counterpart: real Chromium, real RAF, autoplay
// allowed. It loads the page, waits for the instrumentation contract to
// come alive, and asserts the run completes:
//
//   · window.__T0 set without a user gesture (else exit 2 — not instrumented)
//   · window.__sched grows with non-decreasing cue times
//   · window.__done within --seconds (+20% grace)
//   · zero page errors / console errors (narration-mp3 404s are tolerated —
//     the visual timeline is deliberately audio-independent)
//
// All instrumentation waits use interval polling — Playwright's default
// waitForFunction polling rides RAF, which a throttled page never fires.
//
// Usage:
//   node tools/smoke-singlehtml.js <slug> [--seconds N]      (default budget 200s)
//   node tools/smoke-singlehtml.js <slug> --scene ch1        (scene runs may skip __done;
//                                                             observed for --seconds, errors only)
//   node tools/smoke-singlehtml.js --path tools/__tests__/fixtures/mini-video/index.html?hang=1 --seconds 5
//
// Exit: 0 ok · 1 failure · 2 not instrumented · 3 usage.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, scene: null, seconds: 200, path: null, strictGlide: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--scene') out.scene = a[++i];
    else if (a[i] === '--seconds') out.seconds = Number(a[++i]);
    else if (a[i] === '--path') out.path = a[++i];
    else if (a[i] === '--strict-glide') out.strictGlide = true;
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

// FIX-9 (fa-retest 2026-07-13): the iframe helpers are deliberately defensive —
// on failure they console.warn and return null, so a video whose cursor beats
// ALL silently no-op still smokes green. Surface those warns.
const GLIDE_WARN_RE = /^\[(glideClick|glideToText|flyToElement)\]/;

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug && !args.path) {
    console.error('Usage: node tools/smoke-singlehtml.js <slug> [--scene X] [--seconds N] | --path <repo-rel html path>');
    process.exit(3);
  }

  let urlPath;
  if (args.path) {
    const clean = args.path.split(/[?#]/)[0];
    if (!fs.existsSync(path.join(ROOT, clean))) {
      console.error(`✗ not found on disk: ${clean}`);
      process.exit(3);
    }
    urlPath = '/' + args.path.replace(/\\/g, '/').replace(/^\//, '');
  } else {
    if (!fs.existsSync(path.join(ROOT, 'videos', args.slug, 'index.html'))) {
      console.error(`✗ videos/${args.slug}/index.html not found`);
      process.exit(3);
    }
    urlPath = `/videos/${args.slug}/index.html${args.scene ? `?scene=${args.scene}` : ''}`;
  }
  const url = `http://localhost:${PORT}${urlPath}`;

  const server = await ensureServer(PORT);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  let failures = 0;
  const fail = (msg) => { console.log('  ✗ ' + msg); failures++; };
  const pass = (msg) => { console.log('  ✓ ' + msg); };

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    const glideWarns = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).split('\n')[0]}`));
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && GLIDE_WARN_RE.test(msg.text())) {
        glideWarns.push(msg.text().slice(0, 160));
        return;
      }
      if (msg.type() !== 'error') return;
      // Resource-load failures are judged via the response listener below
      // (the console message carries no usable URL to filter on).
      if (/Failed to load resource/.test(msg.text())) return;
      errors.push(`console: ${msg.text().slice(0, 160)}`);
    });
    page.on('response', (r) => {
      if (r.status() < 400) return;
      if (/\/narration\//.test(r.url())) return; // audio-independent visual timeline
      if (/\/__preview/.test(r.url())) return; // dev-server live-reload probe, not the video
      errors.push(`resource ${r.status()}: ${r.url().slice(0, 140)}`);
    });

    console.log(`smoke ${urlPath} (budget ${args.seconds}s)`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });

    // __T0 — the render contract requires it without a user gesture.
    let instrumented = true;
    try { await page.waitForFunction(() => window.__T0 != null, null, { timeout: 20000, polling: 100 }); }
    catch (_) { instrumented = false; }
    if (!instrumented) {
      console.log('  ✗ window.__T0 never set — not instrumented (see render-singlehtml-audio.js contract)');
      process.exitCode = 2;
      return;
    }
    pass('__T0 set without user gesture');

    const budgetMs = args.seconds * 1000 * 1.2;
    let done = true;
    const t0 = Date.now();
    try { await page.waitForFunction(() => window.__done === true, null, { timeout: budgetMs, polling: 250 }); }
    catch (_) { done = false; }
    const state = await page.evaluate(() => ({
      sched: window.__sched || [], dur: window.__dur, done: window.__done === true,
    }));

    if (args.scene && !state.done) {
      pass(`scene run observed for ${((Date.now() - t0) / 1000).toFixed(0)}s (scene runs may end without __done)`);
    } else if (done) {
      pass(`__done in ${((Date.now() - t0) / 1000).toFixed(0)}s (__dur ${state.dur ? state.dur.toFixed(1) : '?'}s)`);
    } else {
      fail(`__done not reached within ${(budgetMs / 1000).toFixed(0)}s`);
    }

    if (state.sched.length) {
      const ordered = state.sched.every((s, i) => i === 0 || s.t >= state.sched[i - 1].t);
      if (ordered) pass(`__sched: ${state.sched.length} cue(s), times non-decreasing`);
      else fail(`__sched cue times out of order: ${JSON.stringify(state.sched.map(s => s.t))}`);
    } else if (!args.scene) {
      fail('__sched empty — no narration cues fired');
    }

    if (errors.length) {
      fail(`${errors.length} page/console error(s):`);
      for (const e of errors.slice(0, 8)) console.log(`      ${e}`);
    } else {
      pass('no page/console errors');
    }

    // FIX-9 — silent no-op cursor beats: warn by default, fail under --strict-glide.
    if (glideWarns.length) {
      const line = `glide-warns: ${glideWarns.length} (helpers warned + returned null — cursor beats may have silently no-op'd)`;
      if (args.strictGlide) fail(line);
      else console.log('  ⚠ ' + line);
      for (const w of glideWarns.slice(0, 5)) console.log(`      ${w}`);
    } else {
      pass('no glide-warns (glideClick/glideToText/flyToElement all resolved)');
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  if (failures) process.exitCode = 1;
  console.log(failures ? `✗ FAIL (${failures})` : '✓ PASS');
}

main().catch((e) => { console.error(e); process.exit(1); });
