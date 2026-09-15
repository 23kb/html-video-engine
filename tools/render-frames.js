#!/usr/bin/env node
// tools/render-frames.js — FRAME-STEPPED render for seek-safe single-HTML films.
//
// Why: render-singlehtml-audio.js records a Playwright screencast (VP8 at a fixed low
// bitrate, wall-clock timing). Text comes out soft and the first frames after play()
// are lost under load ("the video is not HD", Umair 2026-09-04). A film whose motion
// rides ONE master timeline can instead be stepped: seek __tl to each frame time,
// screenshot the stage as a lossless PNG, pipe the frames to ffmpeg. Pixel-exact,
// deterministic, and the frame clock IS the timeline clock — sfx/plan.json cue
// times need no render-offset correction.
//
// Film contract (see videos/wpforms-claude-job-application-ad/index.html):
//   · opened with ?render=frames the film BUILDS, sets window.__tl, does NOT autoplay,
//     and sets window.__renderReady = true
//   · every visible motion is on __tl (no wall-clock cursor glides, no RAF-driven motion)
//   · the tool calls __tl.time(t, false) per frame so callbacks fire once, in order
//
// Usage:
//   node tools/render-frames.js <slug> [--fps 30] [--out videos/<slug>/render/<slug>-video.mp4]
//        [--scale 1|2] [--crf 15] [--from s] [--to s] [--port 4321]
//   --scale 2 captures at deviceScaleFactor 2 and downsamples to the stage size (supersampled edges).
//   --scale 2 --native keeps the captured 3840×2160 (a true 4K deliverable — crisp on high-DPI displays,
//   and YouTube serves 4K uploads on a higher bitrate ladder). ~4× slower than 1×.
//
// Output is VIDEO ONLY. Lay sound with: node tools/sfx/mux.mjs --video <slug>
// Exit: 0 ok · 1 failure · 2 film not frame-renderable (no __renderReady) · 3 usage.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { resolveResolution } = require('./stage-size');

const REPO = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};

function parseArgs(a) {
  const out = { slug: null, fps: 30, out: null, scale: 1, crf: 15, from: 0, to: null, port: 4321, native: false };
  for (let i = 2; i < a.length; i++) {
    const x = a[i];
    if (x === '--fps') out.fps = Number(a[++i]);
    else if (x === '--out') out.out = a[++i];
    else if (x === '--scale') out.scale = Number(a[++i]);
    else if (x === '--crf') out.crf = Number(a[++i]);
    else if (x === '--from') out.from = Number(a[++i]);
    else if (x === '--to') out.to = Number(a[++i]);
    else if (x === '--port') out.port = Number(a[++i]);
    else if (x === '--native') out.native = true;
    else if (!x.startsWith('--') && !out.slug) out.slug = x;
  }
  if (!out.slug) { console.error('Usage: node tools/render-frames.js <slug> [--fps 30] [--out path] [--scale 1|2] [--crf 15] [--from s] [--to s]'); process.exit(3); }
  return out;
}

function serveRepo() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = path.join(REPO, p.replace(/^\/+/, ''));
      if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const dir = path.join(REPO, 'videos', args.slug);
  const html = path.join(dir, 'index.html');
  if (!fs.existsSync(html)) { console.error(`[render-frames] no film at ${html}`); process.exit(3); }
  const res = resolveResolution({ htmlPath: html });
  const outPath = path.resolve(REPO, args.out || path.join('videos', args.slug, 'render', `${args.slug}-video.mp4`));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const { server, port } = await serveRepo();
  const url = `http://127.0.0.1:${port}/videos/${args.slug}/index.html?render=frames`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: res.width, height: res.height }, deviceScaleFactor: args.scale });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[render-frames] pageerror', e.message));
  let ff = null, code = 1;
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction('window.__renderReady === true', { timeout: 30000, polling: 100 });
    } catch (_) {
      console.error(`[render-frames] ${args.slug} never set window.__renderReady — the film must support ?render=frames (build, expose __tl, do not autoplay).`);
      process.exitCode = 2; return;
    }
    const duration = await page.evaluate(() => window.__tl.duration());
    const t1 = args.to != null ? Math.min(args.to, duration) : duration;
    const total = Math.max(1, Math.round((t1 - args.from) * args.fps));
    console.log(`[render-frames] ${args.slug} ${res.width}x${res.height}@${args.scale}x${args.native && args.scale !== 1 ? ' (native ' + res.width * args.scale + 'x' + res.height * args.scale + ')' : ''}  ${args.fps}fps  ${args.from.toFixed(2)}→${t1.toFixed(2)}s  ${total} frames → ${path.relative(REPO, outPath)}`);

    // ffmpeg: PNG frames on stdin → h264 (yuv420p for players), downscaled when --scale 2.
    const vf = (args.scale !== 1 && !args.native) ? ['-vf', `scale=${res.width}:${res.height}:flags=lanczos`] : [];
    ff = spawn('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(args.fps), '-i', '-',
      ...vf,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-r', String(args.fps), '-movflags', '+faststart', outPath,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve) => ff.on('close', resolve));
    const write = (buf) => new Promise((resolve) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', resolve); else resolve(); });

    const started = Date.now();
    for (let i = 0; i < total; i++) {
      const t = args.from + i / args.fps;
      // suppressEvents=false: callbacks (SFX telemetry, pose logs, review hooks) fire once per crossing.
      await page.evaluate((tt) => { window.__tl.time(tt, false); }, Math.min(t, duration));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const png = await page.screenshot({ type: 'png', fullPage: false, caret: 'hide' }); // no animations:'disabled' — it waits on every CSS animation and cost ~1 fps
      await write(png);
      if (i % 60 === 0 || i === total - 1) {
        const el = (Date.now() - started) / 1000;
        process.stdout.write(`\r[render-frames] frame ${i + 1}/${total}  t=${t.toFixed(2)}s  ${(i + 1) / Math.max(el, 0.001) | 0} fps wall   `);
      }
    }
    process.stdout.write('\n');
    ff.stdin.end();
    code = await done;
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }
  if (code !== 0) { console.error(`[render-frames] ffmpeg exited ${code}`); process.exitCode = 1; return; }
  const sz = (fs.statSync(outPath).size / 1e6).toFixed(1);
  console.log(`[render-frames] DONE → ${path.relative(REPO, outPath)}  (${sz} MB, video-only, pixel-exact)`);
}

main().catch((e) => { console.error('[render-frames] failed:', e && e.stack || e); process.exit(1); });
