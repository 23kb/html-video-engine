#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function parseArgs(argv) {
  const args = {
    slug: null,
    chapter: null,
    fps: 30,
    resolution: '1920x1080',
    out: null,
    seek: false,
    headed: false,
    timeout: 30 * 60,
    settle: 0,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--chapter') args.chapter = argv[++i];
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--resolution') args.resolution = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--seek') args.seek = true;
    else if (a === '--headed') args.headed = true;
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a === '--settle') args.settle = Number(argv[++i]);
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
  }
  return args;
}

function usage(exitCode = 1) {
  console.error('Usage: node tools/render.js <slug> [--seek] [--chapter <id>] [--fps 30] [--resolution 1920x1080] [--out <path>] [--timeout <seconds>] [--headed]');
  process.exit(exitCode);
}

function readManifest(slug) {
  const manifestPath = path.join(REPO_ROOT, 'videos', slug, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`unknown slug: ${slug}`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function parseResolution(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value || '');
  if (!match) throw new Error(`invalid --resolution: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
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
    cwd: REPO_ROOT,
    stdio: 'ignore',
    detached: false,
    windowsHide: true,
  });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await probeServer()) return child;
  }
  try { child.kill(); } catch (_) {}
  throw new Error('could not start serve.js on port 4321');
}

function renderUrl(args) {
  let url = `${BASE}/scenes/player.html?video=${encodeURIComponent(args.slug)}`;
  if (args.chapter) url += `&chapter=${encodeURIComponent(args.chapter)}`;
  if (args.seek) url += '&phaseESeek=1';
  return url;
}

function outputPath(args) {
  if (args.out) return path.resolve(args.out);
  const name = args.seek
    ? `${args.slug}${args.chapter ? '-' + args.chapter : ''}-seek.mp4`
    : `${args.slug}${args.chapter ? '-' + args.chapter : ''}.mp4`;
  return path.join(REPO_ROOT, 'videos', args.slug, 'render', name);
}

function startFfmpeg({ out, fps, width, height }) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(fps),
    '-i', 'pipe:0',
    '-an',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-level', '3.1',
    '-pix_fmt', 'yuv420p',
    '-vf', `scale=${width}:${height}:flags=lanczos`,
    '-movflags', '+faststart',
    out,
  ], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

  let stderr = '';
  ffmpeg.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr}`));
    });
  });
  return { ffmpeg, done };
}

async function clickStartGate(page) {
  try {
    const btn = await page.waitForSelector(
      '#start #go, .start-gate .start-btn, #start, .start-gate',
      { timeout: 8000 }
    );
    if (btn) await btn.click().catch(() => {});
  } catch (_) {}
}

async function waitForBoot(page, timeoutMs) {
  await page.waitForFunction(() => {
    const body = document.body;
    return body && body.dataset && (
      body.dataset.sceneBooted === 'true' ||
      body.dataset.sceneDone === 'true' ||
      body.dataset.bootError
    );
  }, { timeout: timeoutMs });
  const bootError = await page.evaluate(() => document.body.dataset.bootError || '');
  if (bootError) throw new Error(`scene boot error: ${bootError}`);
}

async function writeBuffer(ffmpeg, png) {
  await new Promise((resolve, reject) => {
    ffmpeg.stdin.write(png, err => err ? reject(err) : resolve());
  });
}

async function writeFrame(ffmpeg, page) {
  const frame = await page.screenshot({ type: 'jpeg', quality: 86, animations: 'allow' });
  await writeBuffer(ffmpeg, frame);
}

async function wallClockRender(page, args, ffmpeg) {
  const deadline = Date.now() + args.timeout * 1000;
  const started = Date.now();
  let frames = 0;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      sceneDone: document.body.dataset.sceneDone === 'true',
      bootError: document.body.dataset.bootError || '',
    }));
    if (state.bootError) throw new Error(`scene boot error: ${state.bootError}`);
    const frame = await page.screenshot({ type: 'jpeg', quality: 86, animations: 'allow' });
    const elapsed = Math.max(0, (Date.now() - started) / 1000);
    const targetFrames = Math.max(frames + 1, Math.floor(elapsed * args.fps));
    while (frames < targetFrames) {
      await writeBuffer(ffmpeg, frame);
      frames++;
    }
    if (state.sceneDone) break;
    await new Promise(r => setTimeout(r, 10));
  }
  if (Date.now() >= deadline) throw new Error(`render timeout after ${args.timeout}s`);
  return frames;
}

async function getTimelineEntries(page) {
  return page.evaluate(() => {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    if (!registry || typeof registry.entries !== 'function') return [];
    return Array.from(registry.entries()).map(([id, entry]) => ({
      id,
      duration: Number(entry && entry.adapter && entry.adapter.duration) || 0,
    }));
  });
}

async function waitForTimelines(page) {
  await page.waitForFunction(() => {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    return registry && registry.size > 0;
  }, { timeout: 15000 });
}

async function seekRender(page, args, ffmpeg) {
  await waitForTimelines(page);
  const entries = await getTimelineEntries(page);
  const duration = Math.max(0, ...entries.map(entry => entry.duration));
  if (!duration) throw new Error('seek mode found no registered timeline duration');
  const totalFrames = Math.ceil(duration * args.fps);
  for (let frame = 0; frame <= totalFrames; frame++) {
    const t = frame / args.fps;
    await page.evaluate((time) => {
      const registry = window.__hfTimelines && window.__hfTimelines.registry;
      if (!registry) return;
      const now = performance.now();
      for (const entry of registry.values()) {
        if (entry) entry.t0 = now - time * 1000;
        entry && entry.adapter && entry.adapter.seek(time);
      }
    }, t);
    if (args.settle > 0) await page.waitForTimeout(args.settle);
    await writeFrame(ffmpeg, page);
  }
  return totalFrames + 1;
}

function assertSeekAllowed(args, manifest) {
  const surface = manifest.surface || 'iframe';
  const chapterCount = Array.isArray(manifest.chapters) ? manifest.chapters.length : 0;
  if (surface === 'editorial') return;
  if (args.chapter && chapterCount <= 1) return;
  throw new Error("seek mode is only valid for surface: 'editorial' videos or single-chapter editorial beats.");
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) usage(1);
  const manifest = readManifest(args.slug);
  if (args.seek) assertSeekAllowed(args, manifest);
  const viewport = parseResolution(args.resolution);
  const out = outputPath(args);
  const server = await ensureServer();

  let browser;
  try {
    browser = await chromium.launch({
      headless: !args.headed,
      args: ['--autoplay-policy=no-user-gesture-required'],
    });
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: undefined,
    });
    if (args.seek) {
      await context.addInitScript(() => {
        const originalSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (fn, delay, ...rest) => {
          const d = Number(delay) || 0;
          return originalSetTimeout(fn, d >= 5000 ? d * 1000 : d, ...rest);
        };
      });
    }
    const page = await context.newPage();
    const url = renderUrl(args);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clickStartGate(page);
    await waitForBoot(page, Math.min(args.timeout * 1000, 60000));

    const { ffmpeg, done } = startFfmpeg({ out, fps: args.fps, ...viewport });
    const frames = args.seek
      ? await seekRender(page, args, ffmpeg)
      : await wallClockRender(page, args, ffmpeg);
    ffmpeg.stdin.end();
    await done;
    const stat = fs.statSync(out);
    console.log(JSON.stringify({
      slug: args.slug,
      chapter: args.chapter || null,
      mode: args.seek ? 'seek' : 'wall-clock',
      fps: args.fps,
      resolution: args.resolution,
      frames,
      out,
      bytes: stat.size,
      audio: 'silent',
    }, null, 2));
    await context.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) {
      try { server.kill(); } catch (_) {}
    }
  }
}

main().catch(err => {
  console.error(err && err.message || err);
  process.exit(1);
});
