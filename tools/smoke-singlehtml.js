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
//   node tools/smoke-singlehtml.js <slug> --no-strict-glide  (glide-warns downgrade to ⚠;
//                                                             they FAIL by default — issue-14)
//   node tools/smoke-singlehtml.js <slug> --text-probe        (OPT-IN, AP-13: sample visible text
//                                                             1.2s after each __sched cue; WARN-only
//                                                             overlap/duplicate/off-frame findings →
//                                                             qc-report textOverlap. Default OFF —
//                                                             behaviour unchanged without the flag)
//   node tools/smoke-singlehtml.js --path tools/__tests__/fixtures/mini-video/index.html?hang=1 --seconds 5
//
// Also reports beat motion overruns (P0-4): the shared beat() records
// window.__beatStats { key: { motionS, durS, overrun } }; any beat whose
// motion resolved > DUR + 0.5s is WARNED — that's the "trailing camReset
// fires during the next beat" QC class.
//
// Exit: 0 ok · 1 failure · 2 not instrumented · 3 usage.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');
const { resolveResolution } = require('./stage-size');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;

function parseArgs(argv) {
  const a = argv.slice(2);
  // strictGlide defaults ON (issue-14, QC r4): r3 shipped with a sign-in
  // click silently no-opping while smoke passed green. --no-strict-glide
  // opts out; --strict-glide kept as an accepted no-op.
  const out = { slug: null, scene: null, seconds: 200, path: null, strictGlide: true, resolution: null, report: false, textProbe: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--resolution') out.resolution = a[++i];
    else if (a[i] === '--scene') out.scene = a[++i];
    else if (a[i] === '--seconds') out.seconds = Number(a[++i]);
    else if (a[i] === '--path') out.path = a[++i];
    else if (a[i] === '--report') out.report = true;
    else if (a[i] === '--text-probe') out.textProbe = true;
    else if (a[i] === '--strict-glide') out.strictGlide = true;
    else if (a[i] === '--no-strict-glide') out.strictGlide = false;
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
  // Timing-sensitive: runs alone (rf-video 25). --force overrides.
  require('./headless-lock').acquire('smoke-singlehtml', { force: process.argv.includes('--force') });
  if (!args.slug && !args.path) {
    console.error('Usage: node tools/smoke-singlehtml.js <slug> [--scene X] [--seconds N] [--resolution WxH] | --path <repo-rel html path>');
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
  // Viewport follows the page's .stage box (portrait shorts smoke portrait).
  const res = resolveResolution({
    resolutionArg: args.resolution,
    htmlPath: path.join(ROOT, urlPath.split(/[?#]/)[0].replace(/^\//, '')),
  });

  const server = await ensureServer(PORT);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  let failures = 0;
  const fail = (msg) => { console.log('  ✗ ' + msg); failures++; };
  const pass = (msg) => { console.log('  ✓ ' + msg); };

  try {
    const page = await browser.newPage({ viewport: { width: res.width, height: res.height } });
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
      console.log('  x window.__T0 never set - not instrumented (see render-singlehtml-audio.js contract)');
      // Acceptance T-3: a silent no-boot cost a full debug cycle - the page
      // error that CAUSED the dead module was invisible from this exit path.
      if (errors.length) {
        console.log('  errors collected before the bail:');
        errors.slice(0, 10).forEach((e) => console.log('    - ' + e));
      } else {
        console.log('  (no page/console errors captured - extract the <script type=module> and node --check it)');
      }
      process.exitCode = 2;
      return;
    }
    pass('__T0 set without user gesture');

    // ── OPT-IN text probe (AP-13, 2026-09-02). Inert without --text-probe. ──
    const textFindings = [];
    let textSamples = 0;
    let textTimer = null;
    if (args.textProbe) {
      const { collectTextBoxesSource, judgeText } = require('./lib/text-overlap.js');
      try { await page.evaluate(collectTextBoxesSource); } catch (_) {}
      let lastSched = 0;
      let dueAt = 0;
      textTimer = setInterval(async () => {
        try {
          const n = await page.evaluate(() => (window.__sched || []).length);
          const now = Date.now();
          if (n > lastSched) { lastSched = n; dueAt = now + 1200; }
          if (dueAt && now >= dueAt) {
            dueAt = 0;
            const boxes = await page.evaluate(() => window.__wpfCollectTextBoxes(null));
            textSamples++;
            const j = judgeText(boxes, { w: res.width, h: res.height });
            if (j.offFrame.length || j.overlaps.length || j.duplicates.length) textFindings.push(j);
          }
        } catch (_) { /* sampling is a nicety — navigation/close races are fine */ }
      }, 400);
    }

    const budgetMs = args.seconds * 1000 * 1.2;
    let done = true;
    const t0 = Date.now();

    // Mid-run reload detector (rf-weight 21). preview.js appends a live-reload
    // client to everything it serves, and smoke reuses that server — so any
    // file written under the watched root WHILE smoke runs reloads the page,
    // resets __T0, restarts the timeline, and __done never fires. That failed
    // three runs across three budgets on a 46.4s film, and got mis-diagnosed
    // as a preload cost (measured preload: 0.6s) with the wrong advice shipped
    // to the user. The tell was in the data the whole time: the page's own
    // performance.now() - __T0 DECREASING between samples, which nothing but a
    // reload can do. Cheap to watch, so watch it.
    let reloaded = false;
    let lastAge = -Infinity;
    const ageTimer = setInterval(async () => {
      try {
        const age = await page.evaluate(() => (window.__T0 == null ? null : performance.now() - window.__T0));
        if (age == null) return;
        if (age < lastAge - 250) reloaded = true;
        lastAge = age;
      } catch (_) { /* navigation in flight — the next sample tells us */ }
    }, 1000);

    try { await page.waitForFunction(() => window.__done === true, null, { timeout: budgetMs, polling: 250 }); }
    catch (_) { done = false; }
    clearInterval(ageTimer);
    if (textTimer) clearInterval(textTimer);

    if (reloaded) {
      fail('the page RELOADED mid-run (its own performance.now() - __T0 decreased) — preview.js live-reload fired. Nothing measured after that point means anything. Stop writing files under the repo root while smoke runs, then re-run');
    }
    const state = await page.evaluate(() => ({
      sched: window.__sched || [], dur: window.__dur, done: window.__done === true,
      beatStats: window.__beatStats || null,
    }));

    if (args.scene && !state.done) {
      pass(`scene run observed for ${((Date.now() - t0) / 1000).toFixed(0)}s (scene runs may end without __done)`);
    } else if (done) {
      pass(`__done in ${((Date.now() - t0) / 1000).toFixed(0)}s (__dur ${state.dur ? state.dur.toFixed(1) : '?'}s)`);
    } else {
      fail(`__done not reached within ${(budgetMs / 1000).toFixed(0)}s${reloaded ? ' — but the page reloaded mid-run, so this number is not evidence of anything. Fix the quiet-tree problem first, do NOT raise --seconds' : ''}`);
    }

    if (state.sched.length) {
      const ordered = state.sched.every((s, i) => i === 0 || s.t >= state.sched[i - 1].t);
      if (ordered) {
        pass(`__sched: ${state.sched.length} cue(s), times non-decreasing`);
        if (process.argv.includes('--dump-sched')) {
          state.sched.forEach((s) => console.log('    ' + String(s.t).padStart(7) + 's  ' + (s.key || '(unnamed)')));
        }
      }
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

    // FIX-9 / issue-14 — silent no-op cursor beats: FAIL by default,
    // downgrade to a warning under --no-strict-glide.
    if (glideWarns.length) {
      const line = `glide-warns: ${glideWarns.length} (helpers warned + returned null — cursor beats may have silently no-op'd)`;
      if (args.strictGlide) fail(line);
      else console.log('  ⚠ ' + line + ' [--no-strict-glide]');
      for (const w of glideWarns.slice(0, 5)) console.log(`      ${w}`);
    } else {
      pass('no glide-warns (glideClick/glideToText/flyToElement all resolved)');
    }

    // OPT-IN text-probe verdicts (WARN-only — never a failure).
    if (args.textProbe) {
      const totals = textFindings.reduce(
        (a, f) => ({ off: a.off + f.offFrame.length, ov: a.ov + f.overlaps.length, dup: a.dup + f.duplicates.length }),
        { off: 0, ov: 0, dup: 0 });
      if (totals.ov || totals.dup || totals.off) {
        console.log(`  ⚠ text-probe: ${totals.ov} overlap(s), ${totals.dup} duplicate(s), ${totals.off} off-frame across ${textSamples} sample(s) (WARN-only)`);
        for (const f of textFindings.slice(0, 3)) {
          for (const o of f.overlaps.slice(0, 2)) console.log(`      ${o.a} ∩ ${o.b} (${o.ox}x${o.oy}px)`);
          for (const d of f.duplicates.slice(0, 1)) console.log(`      duplicate "${d.text}" in ${d.ids.join(' + ')}`);
        }
      } else {
        pass(`text-probe: no overlaps / duplicates / off-frame across ${textSamples} sample(s)`);
      }
      if (args.slug) {
        require('./lib/qc-report').writeSection(args.slug, 'textOverlap', {
          pass: !(totals.ov || totals.dup || totals.off), source: 'smoke --text-probe',
          samples: textSamples, overlaps: totals.ov, duplicates: totals.dup, offFrame: totals.off,
        });
      }
    }

    // P0-4 — beat motion overruns: a motionFn outliving its narration clip is
    // the "trailing camReset fires during the NEXT beat's scroll" class.
    const OVERRUN_TOLERANCE = 0.5;
    if (state.beatStats && Object.keys(state.beatStats).length) {
      const over = Object.entries(state.beatStats)
        .filter(([, s]) => s && typeof s.overrun === 'number' && s.overrun > OVERRUN_TOLERANCE);
      if (over.length) {
        console.log(`  ⚠ beat motion overruns (> DUR + ${OVERRUN_TOLERANCE}s) — motion outlives its narration clip:`);
        for (const [k, s] of over) console.log(`      ${k}: motion ${s.motionS}s vs clip ${s.durS}s (+${s.overrun}s)`);
      } else {
        pass(`beat motion within DUR + ${OVERRUN_TOLERANCE}s (${Object.keys(state.beatStats).length} instrumented beat(s))`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  if (failures) process.exitCode = 1;
  console.log(failures ? `✗ FAIL (${failures})` : '✓ PASS');
  // Opt-in qc-report.json emit (QC dashboard). Default behavior unchanged.
  if (args.report && args.slug) {
    require('./lib/qc-report').writeSection(args.slug, 'smoke', {
      pass: !failures, failures, seconds: args.seconds, scene: args.scene || null,
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
