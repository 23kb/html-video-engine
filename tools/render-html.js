#!/usr/bin/env node
// Render a single-HTML video (no chapter engine, no manifest) by opening
// videos/<slug>/index.html in Playwright with native video recording, then
// transcoding the captured webm to MP4 at the requested framerate.
//
// Pairs with tools/stitch.js for the hybrid pattern where the tutorial body
// is single-HTML + async play() driver and bookends are HF compositions.
//
// Usage:
//   node tools/render-html.js <slug> --duration <seconds> [--fps 30] [--out path] [--headed]

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function parseArgs(argv) {
  const args = { slug: null, duration: 180, fps: 30, out: null, headed: false, resolution: '1920x1080' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--duration') args.duration = Number(argv[++i]);
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--resolution') args.resolution = argv[++i];
    else if (a === '--headed') args.headed = true;
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
  }
  if (!args.slug) {
    console.error('Usage: node tools/render-html.js <slug> --duration <seconds> [--fps 30] [--out path] [--headed]');
    process.exit(1);
  }
  return args;
}

function parseResolution(v) {
  const m = /^(\d+)x(\d+)$/i.exec(v);
  if (!m) throw new Error('invalid --resolution: ' + v);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function probeServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/`, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(750, () => { req.destroy(); resolve(false); });
  });
}

function transcode(inputWebm, outputMp4, fps) {
  return new Promise((resolve, reject) => {
    const r = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', inputWebm,
      '-c:v', 'libx264',
      '-profile:v', 'baseline', '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-movflags', '+faststart',
      outputMp4,
    ], { stdio: 'inherit' });
    if (r.status === 0) resolve(); else reject(new Error('ffmpeg exit ' + r.status));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const { width, height } = parseResolution(args.resolution);
  const out = args.out
    ? path.resolve(args.out)
    : path.join(REPO_ROOT, 'videos', args.slug, 'render', `${args.slug}.mp4`);
  const url = `${BASE}/videos/${encodeURIComponent(args.slug)}/index.html`;
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (!(await probeServer())) {
    console.error('serve.js not running on port ' + PORT + '. Start it first: `node serve.js`');
    process.exit(2);
  }

  const tmpDir = path.join(path.dirname(out), `.render-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`[render-html] slug=${args.slug} duration=${args.duration}s fps=${args.fps} → ${path.relative(REPO_ROOT, out)}`);
  const browser = await chromium.launch({ headless: !args.headed });
  let webmPath = null;
  try {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      recordVideo: { dir: tmpDir, size: { width, height } },
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    // Let the composition's async driver run for the requested duration.
    await new Promise(r => setTimeout(r, args.duration * 1000));
    webmPath = await page.video().path();
    await ctx.close();
  } finally {
    await browser.close();
  }

  if (!webmPath || !fs.existsSync(webmPath)) {
    console.error('[render-html] no captured webm');
    process.exit(3);
  }
  await transcode(webmPath, out, args.fps);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  console.log(`[render-html] OK → ${path.relative(REPO_ROOT, out)}`);
}

main().catch(err => { console.error('[render-html] fatal:', err.message); process.exit(1); });
