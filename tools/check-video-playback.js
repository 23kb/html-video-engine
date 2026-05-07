#!/usr/bin/env node
// Standard non-visual smoke for a video package.
// Spec: docs/video-production-templates.md §6.
//
// Usage:
//   node tools/check-video-playback.js <slug> [--chapter <id>] [--seconds <n>] [--allow-resource-404]
//
// Default --seconds is 90: a full chapter typically takes 30–90s of real
// playback. Override down for short slices, up for long chains.
//
// Exit codes:
//   0 — sceneBooted === "true" (boot sequence past intro/postIntro/teaser
//       reached chapter playback) OR sceneDone === "true", with no bootError
//       and no page/console errors. Unexpected resource 404s ignored when
//       --allow-resource-404 is set.
//   1 — boot failed (bootError set, or neither sceneBooted nor sceneDone
//       reached within --seconds).
//   2 — booted but had console/page errors, or had unexpected resource 404s.
//   3 — usage / setup error.
//
// `sceneBooted` is the practical smoke milestone — set in runtime/player.js
// right before the chapter loop. `sceneDone` only fires after the FULL video
// (intro + chapters + outro) plays through, which for tutorials is many
// minutes; gating on it alone made smoke exit 1 even for clean boots.
//
// `expectedMissingResources` (e.g. `/sanitize/<slug>.js`) are reported but
// never affect the exit code: the runtime loaders treat sanitize as opt-in,
// so a missing file is documented behavior, not a failure.

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function parseArgs(argv) {
  const args = { slug: null, chapter: null, seconds: 90, allowResource404: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--chapter') args.chapter = argv[++i];
    else if (a === '--seconds') args.seconds = Number(argv[++i]);
    else if (a === '--allow-resource-404') args.allowResource404 = true;
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
  }
  return args;
}

function emit(obj, exitCode) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  process.exit(exitCode);
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

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    emit({
      error: 'missing <slug>',
      usage: 'node tools/check-video-playback.js <slug> [--chapter <id>] [--seconds <n>] [--allow-resource-404]',
    }, 3);
  }

  const manifestPath = path.join(REPO_ROOT, 'videos', args.slug, 'manifest.json');
  if (!fs.existsSync(manifestPath)) emit({ error: `unknown slug: ${args.slug}` }, 3);
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}

  const server = await ensureServer();
  let serverStarted = !!server;

  let url = `${BASE}/scenes/player.html?video=${encodeURIComponent(args.slug)}`;
  if (args.chapter) url += `&chapter=${encodeURIComponent(args.chapter)}`;

  const result = {
    slug: args.slug,
    chapter: args.chapter || null,
    url,
    sceneBooted: false,
    sceneDone: false,
    bootError: '',
    pageErrors: [],
    consoleErrors: [],
    missingResources: [],
    expectedMissingResources: [],
    hud: manifest.hud === true,
    finalSnapshotTitle: null,
    serverStarted,
    allowResource404: args.allowResource404,
  };

  // Paths that are documented as opt-in / optional in the runtime. A 404
  // here is the loader's "this snapshot has no per-snapshot module" path,
  // not a failure. They get reported under `expectedMissingResources` and
  // do not affect the exit code.
  // - /sanitize/<slug>.js: opt-in per-snapshot DOM scrub, see
  //   runtime/player.js applySanitize() and runtime/scene-helpers.js.
  const EXPECTED_MISSING = [
    /^https?:\/\/[^/]+\/sanitize\/[^/]+\.js(\?.*)?$/i,
  ];
  const isExpectedMissing = (u) => EXPECTED_MISSING.some((re) => re.test(u));

  // URLs of HTTP failures, used to deduplicate the generic
  // "Failed to load resource" console-error noise that Chromium emits for
  // each one. Stored as a Set so console-message filtering is O(1).
  const failedUrlSet = new Set();

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    page.on('pageerror', (err) => result.pageErrors.push(String(err && err.message || err)));

    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        const u = res.url();
        failedUrlSet.add(u);
        result.missingResources.push({ url: u, status });
      }
    });
    page.on('requestfailed', (req) => {
      const u = req.url();
      failedUrlSet.add(u);
      result.missingResources.push({
        url: u,
        status: 0,
        failure: (req.failure() && req.failure().errorText) || 'request failed',
      });
    });

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      const loc = msg.location && msg.location();
      const locUrl = loc && loc.url;
      // Suppress the generic "Failed to load resource" mirror message when
      // the failing URL is already captured under missingResources.
      if (/Failed to load resource/i.test(text) && locUrl && failedUrlSet.has(locUrl)) {
        return;
      }
      result.consoleErrors.push(text);
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.seconds * 1000 });

    // Auto-click the start gate so BGM/autoplay primes inside a "user gesture".
    // Two gate variants exist:
    //   chain mode (chapter-runner.js) — `#start` overlay with `#go` button
    //   solo mode (player.js)          — `.start-gate` with `.start-btn`
    try {
      const btn = await page.waitForSelector(
        '#start #go, .start-gate .start-btn, #start, .start-gate',
        { timeout: 8000 }
      );
      if (btn) await btn.click().catch(() => {});
    } catch (_) {}

    const deadline = Date.now() + args.seconds * 1000;
    while (Date.now() < deadline) {
      const state = await page.evaluate(() => ({
        sceneBooted: document.body && document.body.dataset && document.body.dataset.sceneBooted === 'true',
        sceneDone: document.body && document.body.dataset && document.body.dataset.sceneDone === 'true',
        bootError: (document.body && document.body.dataset && document.body.dataset.bootError) || '',
      })).catch(() => ({ sceneBooted: false, sceneDone: false, bootError: '' }));
      result.sceneBooted = !!state.sceneBooted;
      result.sceneDone = !!state.sceneDone;
      result.bootError = state.bootError || '';
      if (result.sceneDone || result.sceneBooted || result.bootError) break;
      await new Promise(r => setTimeout(r, 250));
    }

    result.finalSnapshotTitle = await page.evaluate(() => {
      const f = document.querySelector('iframe.snapshot-iframe, iframe[data-snapshot], iframe');
      try { return (f && f.contentDocument && f.contentDocument.title) || null; } catch (_) { return null; }
    }).catch(() => null);

    await ctx.close();
  } catch (err) {
    result.bootError = result.bootError || `playwright: ${err && err.message || err}`;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  // Dedup missingResources by URL. Chromium emits both a `response` (with a
  // real HTTP status) and a `requestfailed` (status 0, ERR_ABORTED) for the
  // same asset; prefer the entry with a non-zero status.
  const byUrl = new Map();
  for (const m of result.missingResources) {
    const prev = byUrl.get(m.url);
    if (!prev || (prev.status === 0 && m.status !== 0)) byUrl.set(m.url, m);
  }
  // Split into expected (opt-in/optional) vs unexpected. Only unexpected
  // ones gate the exit code.
  const all = [...byUrl.values()];
  result.expectedMissingResources = all.filter((m) => isExpectedMissing(m.url));
  result.missingResources = all.filter((m) => !isExpectedMissing(m.url));

  let code = 0;
  if (result.bootError || (!result.sceneBooted && !result.sceneDone)) {
    code = 1;
  } else if (result.pageErrors.length || result.consoleErrors.length) {
    code = 2;
  } else if (result.missingResources.length && !args.allowResource404) {
    code = 2;
  }
  emit(result, code);
}

main().catch((err) => emit({ error: String(err && err.message || err) }, 3));
