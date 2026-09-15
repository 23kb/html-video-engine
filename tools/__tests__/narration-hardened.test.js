#!/usr/bin/env node
// FIX-2 — RAF-deadlock hardening at library level.
//
// The master flow of a single-HTML video must never await a raw GSAP tween:
// in an RAF-throttled context (hidden tab, in-app Browser pane) the ticker
// freezes and the await deadlocks the video. The shared helpers in
// videos/_shared/narration.js (say/beat/hideCaption/withTimeout) resolve all
// waits via setTimeout. This suite:
//   1. withTimeout unit (in-page): fast promise resolves; stalled one falls
//      through within budget.
//   2. Negative control: proves the frozen-RAF harness actually freezes GSAP
//      (a raw awaited tween does NOT resolve) — without this, gate 3 is vacuous.
//   3. Fixture video reaches __done with __sched ordered under FROZEN RAF.
//   4. Same fixture, normal RAF — no behavior change in a visible run.
//   5. Static goldens on the two patched videos (shared imports, no local
//      raw-tween hideCaption, withTimeout on top-level cursor awaits).
//   --full: additionally runs BOTH real videos end-to-end under frozen RAF
//   (~6 min) and asserts they reach __done. (FIX-2 acceptance run.)
//
// Usage:
//   node tools/__tests__/narration-hardened.test.js           (fast, ~20s)
//   node tools/__tests__/narration-hardened.test.js --full    (+ real videos)

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ensureServer } = require('../generate-snapshot-outline.js');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.PORT) || 4321;
const FIXTURE_URL = `http://localhost:${PORT}/tools/__tests__/fixtures/mini-video/index.html`;
const FULL = process.argv.includes('--full') || process.argv.includes('--all');

// Mimics the in-app Browser pane / deeply-throttled hidden tab: RAF callbacks
// never fire, so the GSAP ticker is frozen. setTimeout still runs.
const FROZEN_RAF = 'window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {};';

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

async function newPage(browser, { freezeRaf = false } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  if (freezeRaf) await page.addInitScript(FROZEN_RAF);
  return { ctx, page };
}

async function runFixture(browser, { freezeRaf }) {
  const { ctx, page } = await newPage(browser, { freezeRaf });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(FIXTURE_URL, { waitUntil: 'load', timeout: 15000 });
  let done = true;
  // polling:interval — waitForFunction's default polling rides RAF, which the
  // frozen-RAF harness (and a real throttled tab) never fires.
  try { await page.waitForFunction(() => window.__done === true, null, { timeout: 15000, polling: 100 }); }
  catch (_) { done = false; }
  const state = await page.evaluate(() => ({ sched: window.__sched || [], dur: window.__dur }));
  await ctx.close();
  return { done, state, errors };
}

async function main() {
  const server = await ensureServer(PORT);
  const browser = await chromium.launch({ headless: true });

  try {
    // ── 1. withTimeout unit (in-page, real module) ────────────────────────
    section('withTimeout unit');
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(FIXTURE_URL, { waitUntil: 'load', timeout: 15000 });
      const fast = await page.evaluate(async () => {
        const m = await import('/videos/_shared/narration.js');
        const t0 = performance.now();
        const v = await m.withTimeout(Promise.resolve('fast'), 5);
        return { v, ms: performance.now() - t0 };
      });
      ok(fast.v === 'fast' && fast.ms < 1000, `fast promise resolves immediately with its value (${Math.round(fast.ms)}ms)`);
      const hung = await page.evaluate(async () => {
        const m = await import('/videos/_shared/narration.js');
        const t0 = performance.now();
        await m.withTimeout(new Promise(() => {}), 0.5);
        return performance.now() - t0;
      });
      ok(hung >= 400 && hung < 3000, `never-resolving promise falls through at ~budget (${Math.round(hung)}ms for 0.5s)`);
      await ctx.close();
    }

    // ── 1b. Word-mode captions (shorts) — in-page, real module ────────────
    section('Word-mode captions');
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(FIXTURE_URL, { waitUntil: 'load', timeout: 15000 });
      const res = await page.evaluate(async () => {
        const m = await import('/videos/_shared/narration.js');
        const el = document.createElement('div');
        document.body.appendChild(el);
        const t0 = performance.now();
        m.showCaptionWords('Running a sale? Your form can take coupon codes.', { captionEl: el, durS: 4 });
        const syncMs = performance.now() - t0;
        const spans = el.querySelectorAll('span');
        const count = spans.length;
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        await new Promise(r => setTimeout(r, 600));
        const vis = s => getComputedStyle(s).visibility !== 'hidden' && parseFloat(getComputedStyle(s).opacity) > 0.5;
        return { syncMs, count, text, firstVisible: vis(spans[0]), lastStillHidden: !vis(spans[count - 1]) };
      });
      ok(res.count === 9, `one span per word (${res.count}/9)`);
      ok(res.text === 'Running a sale? Your form can take coupon codes.', 'textContent preserves the full caption');
      ok(res.syncMs < 100, `fire-and-forget: returns synchronously (${Math.round(res.syncMs)}ms)`);
      ok(res.firstVisible, 'first word visible shortly after clip start');
      ok(res.lastStillHidden, 'last word still pending at 0.6s of a 4s clip (paced, not all-at-once)');
    }

    // ── 2. Frozen-RAF harness sanity (negative control) ───────────────────
    section('Frozen-RAF harness sanity');
    {
      const probe = `(async () => {
        const winner = await Promise.race([
          gsap.to({ v: 0 }, { v: 1, duration: 0.2 }).then(() => 'tween'),
          new Promise(r => setTimeout(() => r('timeout'), 1500)),
        ]);
        return winner;
      })()`;
      const { ctx: cf, page: pf } = await newPage(browser, { freezeRaf: true });
      await pf.goto(FIXTURE_URL, { waitUntil: 'load', timeout: 15000 });
      const frozenWinner = await pf.evaluate(probe);
      await cf.close();
      ok(frozenWinner === 'timeout', `frozen RAF: raw awaited tween never resolves (winner: ${frozenWinner})`);

      const { ctx: cv, page: pv } = await newPage(browser);
      await pv.goto(FIXTURE_URL, { waitUntil: 'load', timeout: 15000 });
      const liveWinner = await pv.evaluate(probe);
      await cv.close();
      ok(liveWinner === 'tween', `live RAF: the same tween resolves normally (winner: ${liveWinner})`);
    }

    // ── 3. Fixture reaches __done under frozen RAF ────────────────────────
    section('Fixture video — frozen RAF (the deadlock scenario)');
    {
      const { done, state, errors } = await runFixture(browser, { freezeRaf: true });
      ok(done, 'reaches __done despite frozen RAF');
      const keys = state.sched.map(s => s.key);
      ok(keys.join(',') === 'one,two', `__sched keys in order (${keys.join(',')})`);
      ok(state.sched.every((s, i) => i === 0 || s.t >= state.sched[i - 1].t), '__sched cue times ascending');
      ok(state.dur > 2.5 && state.dur < 8, `__dur plausible (${state.dur && state.dur.toFixed(2)}s for a ~3.5s fixture)`);
      ok(errors.length === 0, `no page errors (${errors.length})`);
    }

    // ── 4. Fixture, visible run — no behavior change ──────────────────────
    section('Fixture video — live RAF (visible run unchanged)');
    {
      const { done, state, errors } = await runFixture(browser, { freezeRaf: false });
      ok(done, 'reaches __done');
      ok(state.sched.map(s => s.key).join(',') === 'one,two', '__sched keys in order');
      ok(errors.length === 0, `no page errors (${errors.length})`);
    }

    // ── 5. Static goldens on the two patched videos ───────────────────────
    section('Static goldens — patched videos use the shared hardened helpers');
    for (const slug of ['switch-to-wpforms-entry-importer', 'form-analytics-complete-guide']) {
      const src = fs.readFileSync(path.join(ROOT, 'videos', slug, 'index.html'), 'utf8');
      ok(/import \{[^}]*narrBeat[^}]*\} from '\/videos\/_shared\/narration\.js'/.test(src),
        `${slug}: imports shared beat helpers`);
      ok(!/function hideCaption\(\)\s*\{\s*return gsap/.test(src),
        `${slug}: no local raw-tween hideCaption`);
      ok(!/function say\(key/.test(src) && !/async function beat\(key/.test(src),
        `${slug}: no local say/beat copies`);
    }
    {
      const src = fs.readFileSync(path.join(ROOT, 'videos', 'switch-to-wpforms-entry-importer', 'index.html'), 'utf8');
      ok(/await withTimeout\(piCursor\.glide/.test(src) && /await withTimeout\(piCursor\.click/.test(src),
        'entry-importer: postIntro cursor awaits wrapped in withTimeout');
      ok(/await withTimeout\(scrollTo\(/.test(src),
        'entry-importer: top-level scrollTo wrapped in withTimeout');
    }

    // ── 6. --full: real videos end-to-end under frozen RAF ────────────────
    if (FULL) {
      section('FULL — real videos reach __done under frozen RAF');
      for (const [slug, budgetMs] of [
        ['switch-to-wpforms-entry-importer', 200000],
        ['form-analytics-complete-guide', 280000],
      ]) {
        const { ctx, page } = await newPage(browser, { freezeRaf: true });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`http://localhost:${PORT}/videos/${slug}/index.html`, { waitUntil: 'load', timeout: 30000 });
        let done = true;
        const t0 = Date.now();
        try { await page.waitForFunction(() => window.__done === true, null, { timeout: budgetMs, polling: 250 }); }
        catch (_) { done = false; }
        const sched = await page.evaluate(() => (window.__sched || []).length);
        await ctx.close();
        ok(done, `${slug}: __done in ${((Date.now() - t0) / 1000).toFixed(0)}s (${sched} cues fired, ${errors.length} page errors)`);
      }
    } else {
      console.log('\n(skipping real-video frozen-RAF runs — pass --full for the ~6 min acceptance run)');
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
