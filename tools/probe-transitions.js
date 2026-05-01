#!/usr/bin/env node
// Stage 5b-1 transition probe.
//
// Launches headless Chromium against /scenes/player.html, samples cover/iframe
// state every ~50ms, captures screenshots at fixed intervals across a
// configurable time window, and records a console log of `[<tag>] ...`
// messages from the runtime's diag channel (engine/diag.js).
//
// Usage:
//   node tools/probe-transitions.js <slug> [--window <name>] [--from <s>] [--to <s>]
//                                          [--chapter <id>] [--breakStyle <s>]
//                                          [--swapStyle <s>] [--shot-every <ms>]
//
// Output:
//   probe-out/<slug>/<window>/timeline.json
//   probe-out/<slug>/<window>/console.log
//   probe-out/<slug>/<window>/shots/<msec>.png
//   probe-out/<slug>/<window>/summary.txt
//
// Exit codes:
//   0 — probe completed (does not assert pass/fail; that is for the human or
//       a follow-up diff against a baseline run)
//   1 — probe failed to boot the page or write artifacts
//   3 — usage error

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function usage(msg) {
  process.stderr.write((msg ? msg + '\n' : '') +
    'Usage: node tools/probe-transitions.js <slug> [--window <name>] [--from <s>] [--to <s>]\n' +
    '                                       [--chapter <id>] [--breakStyle <s>] [--swapStyle <s>]\n' +
    '                                       [--shot-every <ms>]\n');
  process.exit(3);
}

function parseArgs(argv) {
  const args = {
    slug: null, windowName: 'full', from: 0, to: 60,
    chapter: null, breakStyle: null, swapStyle: null, shotEvery: 200,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--window') args.windowName = argv[++i];
    else if (a === '--from') args.from = Number(argv[++i]);
    else if (a === '--to') args.to = Number(argv[++i]);
    else if (a === '--chapter') args.chapter = argv[++i];
    else if (a === '--breakStyle') args.breakStyle = argv[++i];
    else if (a === '--swapStyle') args.swapStyle = argv[++i];
    else if (a === '--shot-every') args.shotEvery = Number(argv[++i]);
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
    else usage('unknown arg: ' + a);
  }
  if (!args.slug) usage('missing <slug>');
  if (!Number.isFinite(args.from) || !Number.isFinite(args.to) || args.to <= args.from) {
    usage('--from/--to must be numeric and --to > --from');
  }
  return args;
}

function probeServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/scenes/player.html`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(750, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await probeServer()) return null;
  const child = spawn(process.execPath, [path.join(REPO_ROOT, 'serve.js')], {
    cwd: REPO_ROOT, stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await probeServer()) return child;
  }
  try { child.kill(); } catch (_) {}
  return null;
}

function buildUrl(args) {
  const params = new URLSearchParams();
  params.set('video', args.slug);
  if (args.chapter) params.set('chapter', args.chapter);
  if (args.breakStyle) params.set('breakStyle', args.breakStyle);
  if (args.swapStyle)  params.set('swapStyle', args.swapStyle);
  return `${BASE}/scenes/player.html?` + params.toString();
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function main() {
  const args = parseArgs(process.argv);
  const outDir = path.join(REPO_ROOT, 'probe-out', args.slug, args.windowName);
  const shotsDir = path.join(outDir, 'shots');
  ensureDir(shotsDir);

  const server = await ensureServer();

  const url = buildUrl(args);
  const consoleLog = [];
  const timeline = [];
  const summary = [];

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      const text = msg.text();
      const t = Date.now();
      consoleLog.push({ t, type: msg.type(), text });
    });
    page.on('pageerror', (err) => {
      consoleLog.push({ t: Date.now(), type: 'pageerror', text: String(err && err.message || err) });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.max(30000, args.to * 1000) });

    // Auto-click start gate (chain mode `#start #go`, solo mode `.start-gate .start-btn`).
    try {
      const btn = await page.waitForSelector(
        '#start #go, .start-gate .start-btn, #start, .start-gate',
        { timeout: 8000 }
      );
      if (btn) await btn.click().catch(() => {});
    } catch (_) {}

    const t0 = Date.now();
    const fromMs = args.from * 1000;
    const toMs   = args.to   * 1000;
    const sampleEveryMs = 50;
    const shotEveryMs = args.shotEvery;
    let nextShotAt = fromMs;

    while (true) {
      const elapsed = Date.now() - t0;
      if (elapsed > toMs) break;

      if (elapsed >= fromMs) {
        // DOM sample
        const snap = await page.evaluate(() => {
          const covers = [];
          // Anything that looks like a cover: explicit known classes, plus
          // any element with a `cover` substring in its id or class. Cheap,
          // catches ad-hoc cover divs.
          const sel = '.fade-cover, .swap-cover, [id*="cover" i], [id*="-handoff" i], #flashbang-killer';
          document.querySelectorAll(sel).forEach((el) => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            covers.push({
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              cls: el.className || null,
              z: cs.zIndex,
              opacity: parseFloat(cs.opacity || '1'),
              w: r.width, h: r.height,
            });
          });
          const ifr = document.querySelector('iframe.ui');
          let iframe = null;
          if (ifr) {
            const cs = getComputedStyle(ifr);
            iframe = {
              opacity: parseFloat(cs.opacity || '1'),
              transform: ifr.style.transform || cs.transform || null,
              filter: ifr.style.filter || cs.filter || null,
              visibility: cs.visibility,
            };
          }
          const sceneDone = document.body && document.body.dataset && document.body.dataset.sceneDone === 'true';
          return { covers, iframe, sceneDone };
        }).catch(() => null);

        if (snap) {
          timeline.push({ tMs: elapsed, ...snap });
        }

        // Screenshot at fixed cadence
        if (elapsed >= nextShotAt) {
          const fname = String(elapsed).padStart(6, '0') + 'ms.png';
          await page.screenshot({ path: path.join(shotsDir, fname), fullPage: false }).catch(() => {});
          nextShotAt += shotEveryMs;
        }
      }

      await new Promise(r => setTimeout(r, sampleEveryMs));
    }

    await ctx.close();
  } catch (err) {
    summary.push('probe failed: ' + (err && err.message || err));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  // Persist artifacts
  fs.writeFileSync(path.join(outDir, 'timeline.json'),
    JSON.stringify({ slug: args.slug, window: args.windowName, url,
                     from: args.from, to: args.to, samples: timeline }, null, 2));
  fs.writeFileSync(path.join(outDir, 'console.log'),
    consoleLog.map(e => `${e.t}\t${e.type}\t${e.text}`).join('\n'));

  // Heuristic summary lines
  const opaqueCoverAt = (sample) =>
    (sample.covers || []).some(c => c.opacity >= 0.9 && c.w > 0 && c.h > 0);
  const flashCandidates = timeline.filter(s =>
    s.iframe && s.iframe.opacity > 0.05 && !opaqueCoverAt(s));
  const firstSceneDone = timeline.find(s => s.sceneDone);
  summary.push('slug:           ' + args.slug);
  summary.push('window:         ' + args.windowName);
  summary.push('window range:   ' + args.from + 's → ' + args.to + 's');
  summary.push('samples:        ' + timeline.length);
  summary.push('flash candidates (iframe opaque, no opaque cover): ' + flashCandidates.length);
  if (flashCandidates.length) {
    summary.push('  first 5:');
    for (const s of flashCandidates.slice(0, 5)) {
      summary.push('    t=' + s.tMs + 'ms  iframe.opacity=' + s.iframe.opacity +
                   '  covers=' + (s.covers.length));
    }
  }
  summary.push('sceneDone:      ' + (firstSceneDone ? 'true at t=' + firstSceneDone.tMs + 'ms' : 'never within window'));
  // diag-line tally — `[tag] ...` lines from console
  const diagCount = consoleLog.filter(e => /^\s*\[\w[\w:.-]*\]/.test(e.text)).length;
  summary.push('diag log lines: ' + diagCount);
  fs.writeFileSync(path.join(outDir, 'summary.txt'), summary.join('\n') + '\n');

  process.stdout.write(summary.join('\n') + '\n');
}

main().catch((err) => {
  process.stderr.write('probe error: ' + (err && err.message || err) + '\n');
  process.exit(1);
});
