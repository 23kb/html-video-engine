#!/usr/bin/env node
// tools/render.js — frame-exact, parallel renderer for single-HTML films (video only, for now).
//
// How it works:
//   · Chrome virtual time (CDP Emulation.setVirtualTimePolicy) owns the page clock, so every film
//     type renders frame-exact without changes: tutorials and shorts (async play() + waits),
//     ads (__tl), snapshot iframes, CSS transitions. tools/lib/render-clock-shim.js drives GSAP
//     and Web Animations from that clock. Proven on a 2026-09-26 prototype.
//   · The film is cut into N contiguous blocks, one browser per block. Each browser steps the film
//     from the start (about 2-5 ms a frame without capture) and captures only its block into its
//     own segment; the segments are joined with ffmpeg concat (-c copy).
//     Why blocks and not every-Nth-frame: the virtual clock leaks a fraction of a millisecond of
//     real timing, so now and then an event lands one frame later in one browser than in another
//     (measured 2026-10-13: 13 of 14 cues identical across 8 browsers, one off by 1 frame, no
//     build-up). Interleaving would show that as jitter on every frame; blocks only at the joins.
//     Joins sit on still moments where possible. Each block also renders 3 overlap frames; they are
//     matched against the previous block to find a ±1-2 frame shift, the block is trimmed to fit
//     (frame-exact: forced keyframes + concat inpoint) and its narration cues move with it.
//   · Static frames (the shim saw nothing change) reuse the previous frame instead of a capture.
//   · CDP Page.captureScreenshot with clip.scale, not page.screenshot(): Playwright's screenshot
//     waits for fonts and hangs while virtual time is paused.
//
// Quality presets (Umair 2026-10-13: drafts are 720p "to get a feel"; 4K only on "final"):
//   draft  720p   (720 on the short side)  device scale 0.667, x264 veryfast crf 20
//   hd     1080p  device scale 2 + lanczos downscale (today's HD look), x264 slow crf 16
//   final  4K     device scale 2 native (3840x2160, portrait 2160x3840), x264 medium crf 16
//
// Film contract: the same as render-singlehtml-audio.js (window.__T0 set when play starts,
// window.__done / window.__dur at the end). Output length = ceil(__dur + 0.25) s (AP-18 pad).
// A sidecar <out>.render.json keeps timings and each block's __sched/__cuts/__beats/__sfx.
//
// Usage:
//   node tools/render.js <slug> [--quality draft|hd|final] [--workers 8] [--fps 30]
//     [--no-skip] [--verify-skip] [--seconds N] [--query str] [--out path] [--no-lock] [--force]
//     [--no-audio] [--bgm <path>|none] [--bgm-volume 0.17]
//
// Sound (same sources as today's ship paths): a film with videos/<slug>/sfx/plan.json is mixed by
// tools/sfx/mux.mjs (ads); otherwise narration clips from window.__sched + the ducked bed
// (tools/lib/narration-mix.js; bed default bgms/1.mp3 at 0.17, long-form passes --bgm-volume 0.12).
// Cue times come from the browser that rendered that part of the film.
// Exit: 0 ok · 1 failure · 2 film not instrumented (no __T0) · 3 usage
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { mapLegacySnapshotUrl } = require('./lib/paths');
const { resolveResolution } = require('./stage-size');
const { mixNarration } = require('./lib/narration-mix');

const REPO = path.resolve(__dirname, '..');
const SHIM = path.join(__dirname, 'lib', 'render-clock-shim.js');
const POLICY = 'pauseIfNetworkFetchesPending';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};

function parseArgs(argv) {
  const a = argv.slice(2);
  const o = { slug: null, quality: 'draft', workers: 8, fps: 30, skip: true, verify: false,
    seconds: null, query: null, out: null, lock: true, force: false, audio: true, bgm: undefined, bgmVolume: 0.17 };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === '--quality') o.quality = a[++i];
    else if (x === '--workers') o.workers = Number(a[++i]);
    else if (x === '--fps') o.fps = Number(a[++i]);
    else if (x === '--no-skip') o.skip = false;
    else if (x === '--verify-skip') { o.verify = true; o.skip = false; }
    else if (x === '--seconds') o.seconds = Number(a[++i]);
    else if (x === '--query') o.query = String(a[++i]).replace(/^\?/, '');
    else if (x === '--out') o.out = a[++i];
    else if (x === '--no-lock') o.lock = false;
    else if (x === '--no-audio') o.audio = false;
    else if (x === '--bgm') o.bgm = a[++i];
    else if (x === '--bgm-volume') o.bgmVolume = Number(a[++i]);
    else if (x === '--force') o.force = true;
    else if (!x.startsWith('--') && !o.slug) o.slug = x;
    else { console.error(`unknown argument: ${x}`); process.exit(3); }
  }
  if (!o.slug || !['draft', 'hd', 'final'].includes(o.quality) || !(o.workers >= 1) || !(o.fps > 0)) {
    console.error('Usage: node tools/render.js <slug> [--quality draft|hd|final] [--workers 8] [--fps 30]');
    console.error('       [--no-skip] [--verify-skip] [--seconds N] [--query str] [--out path] [--no-lock] [--force]');
    console.error('       [--no-audio] [--bgm <path>|none] [--bgm-volume 0.17]');
    process.exit(3);
  }
  return o;
}

// Device scale and output size per quality. W x H is the film's .stage box.
function preset(q, W, H) {
  const even = (n) => Math.round(n / 2) * 2;
  if (q === 'draft') {
    const s = 720 / Math.min(W, H);
    return { dsf: s, outW: even(W * s), outH: even(H * s), enc: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'] };
  }
  if (q === 'hd') return { dsf: 2, outW: W, outH: H, enc: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16'] };
  // 4K: x264 in 8 parallel blocks starves the browsers of CPU (0.65x real time, 2026-10-13), so the GPU
  // encoder is the default. Same SSIM as x264 slow crf 16 on a test film, bigger file.
  if (process.env.RENDER_4K_X264) return { dsf: 2, outW: W * 2, outH: H * 2, enc: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16'] };
  return { dsf: 2, outW: W * 2, outH: H * 2, enc: ['-c:v', 'h264_nvenc', '-preset', 'p5', '-tune', 'hq', '-rc', 'vbr', '-cq', '18', '-b:v', '0', '-maxrate', '120M', '-bufsize', '240M'] };
}

function startServer() {
  const server = http.createServer((req, res) => {
    const p = mapLegacySnapshotUrl(decodeURIComponent((req.url || '/').split('?')[0]));
    let fp = path.join(REPO, p);
    try { if (fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html'); } catch (_) {}
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const LAUNCH_ARGS = [
  '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--force-color-profile=srgb', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  ...(process.platform === 'win32'
    ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : ['--enable-gpu', '--ignore-gpu-blocklist']),
];

// One browser running the film on the render clock, booted to __T0, frame grid aligned.
async function openFilm({ url, stage, dsf, logErrors }) {
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const ctx = await browser.newContext({ viewport: { width: stage.width, height: stage.height }, deviceScaleFactor: dsf, reducedMotion: 'no-preference' });
  await ctx.addInitScript({ path: SHIM });
  await ctx.addInitScript(() => { // hide the preview-audio pill (render-html.js)
    const add = () => { const s = document.createElement('style'); s.textContent = 'body > div[style*="z-index:120"] { display:none !important; }'; document.head.appendChild(s); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  });
  await ctx.route('**/__preview-ws', (r) => r.abort());
  const page = await ctx.newPage();
  const pending = new Set();
  page.on('request', (r) => pending.add(r.url()));
  page.on('requestfinished', (r) => pending.delete(r.url()));
  page.on('requestfailed', (r) => pending.delete(r.url()));
  if (logErrors) page.on('pageerror', (e) => console.log(`[render] page error: ${String(e.message).slice(0, 200)}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: POLICY, budget: 0 });
  const step = (ms) => new Promise(async (resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`virtual step stalled 60 s; pending: ${[...pending].slice(0, 5).join(' | ') || 'none'}`)), 60000);
    cdp.once('Emulation.virtualTimeBudgetExpired', () => { clearTimeout(to); resolve(); });
    try { await cdp.send('Emulation.setVirtualTimePolicy', { policy: POLICY, budget: ms }); } catch (e) { clearTimeout(to); reject(e); }
  });
  const sync = () => page.evaluate(() => {
    const dirty = window.__renderSync ? window.__renderSync() : true;
    return { t0: window.__T0 != null, done: !!window.__done, dur: window.__dur == null ? null : Number(window.__dur), dirty };
  });
  const telemetry = () => page.evaluate(() => ({ sched: window.__sched || null, cuts: window.__cuts || null, beats: window.__beats || null, sfx: window.__sfx || null }));
  const shot = { format: 'jpeg', quality: 95, optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: stage.width, height: stage.height, scale: dsf } };
  const capture = async () => {
    const r = await cdp.send('Page.captureScreenshot', shot).catch(() => cdp.send('Page.captureScreenshot', shot));
    return Buffer.from(r.data, 'base64');
  };

  await page.goto(url, { waitUntil: 'commit' });
  let boot = 0;
  for (;;) {
    const s = await sync().catch(() => ({ t0: false }));
    if (s.t0) break;
    if (boot > 60000) { const e = new Error('film never set window.__T0 (not instrumented?)'); e.code = 2; throw e; }
    await step(1000 / 60); boot += 1000 / 60;
  }
  const off0 = await page.evaluate(() => performance.now() - window.__T0);
  return { step, sync, capture, telemetry, off0, close: () => browser.close().catch(() => {}) };
}

// ffmpeg: JPEG frames on stdin → BT.709-tagged H.264 (the colour chain render-singlehtml.js proved).
function encoder(file, P, fps, keyHead) {
  const vf = [
    'format=rgb24',
    `scale=${P.outW}:${P.outH}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=limited`,
    'format=yuv420p',
    'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  ].join(',');
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-vf', vf, ...P.enc, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    ...(keyHead ? ['-force_key_frames', `expr:lte(n,${keyHead})`, ...(P.enc.includes('h264_nvenc') ? ['-forced-idr', '1'] : [])] : []),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-an', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  ff.stdin.on('error', () => {});
  return {
    write: (b) => new Promise((r) => (ff.stdin.write(b) ? r() : ff.stdin.once('drain', r))),
    end: async () => { ff.stdin.end(); return done; },
  };
}

async function main() {
  const o = parseArgs(process.argv);
  const htmlPath = path.join(REPO, 'videos', o.slug, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.error(`not found: ${path.relative(REPO, htmlPath)}`); process.exit(3); }
  if (o.lock) require('./headless-lock').acquire('render', { force: o.force });

  const stage = resolveResolution({ htmlPath });
  const P = preset(o.quality, stage.width, stage.height);
  const out = o.out ? path.resolve(REPO, o.out)
    : path.join(REPO, 'videos', o.slug, 'render', `${o.slug}-${o.quality}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const fps = o.fps, frameMs = 1000 / fps;
  console.log(`[render] ${o.slug}: ${o.quality} ${P.outW}x${P.outH} @${fps} (stage ${stage.width}x${stage.height} ${stage.source}, scale ${+P.dsf.toFixed(3)}, ${o.workers} workers, reuse ${o.skip ? 'on' : o.verify ? 'verify' : 'off'})`);

  const server = await startServer();
  const url = `http://127.0.0.1:${server.address().port}/videos/${o.slug}/index.html${o.query ? '?' + o.query : ''}`;
  const film = () => openFilm({ url, stage, dsf: P.dsf, logErrors: false });
  const w0 = Date.now();

  // ── length: --seconds, or one fast pass with no capture until __done ──
  let N = o.seconds ? Math.round(o.seconds * fps) : null;
  let preTele = null;
  const still = []; // still[i]: the length pass saw nothing change into frame i
  if (N == null) {
    const f = await openFilm({ url, stage, dsf: P.dsf, logErrors: true });
    try {
      for (let i = 0; ; i++) {
        if (i === 1) await f.step(frameMs - f.off0); else if (i > 1) await f.step(frameMs);
        const s = await f.sync();
        still[i] = i > 0 && !s.dirty;
        if (s.done) { N = Math.ceil(s.dur + 0.25) * fps; for (let j = i + 1; j <= N; j++) still[j] = false; break; }
        if (i > 1000 * fps) throw new Error('no window.__done after 1000 s of film time');
      }
      preTele = await f.telemetry();
    } finally { await f.close(); }
    console.log(`[render] length ${(N / fps).toFixed(2)} s (${N} frames), measured in ${((Date.now() - w0) / 1000).toFixed(1)} s`);
  }

  // ── blocks: one browser each ──
  const K = Math.max(1, Math.min(o.workers, Math.floor(N / fps) || 1));
  // Joins go to the nearest still moment (3 still frames in a row, within ±1.5 s of the even split):
  // a block that runs one frame ahead or behind its neighbour is invisible there.
  const cuts = [0];
  for (let k = 1; k < K; k++) {
    const ideal = Math.round((k * N) / K);
    let cut = ideal;
    for (let d = 0; d <= Math.round(1.5 * fps); d++) {
      const hit = [ideal - d, ideal + d].find((j) => j > cuts[cuts.length - 1] + fps && j < N - 1 && still[j - 1] && still[j] && still[j + 1]);
      if (hit) { cut = hit; break; }
    }
    cuts.push(cut);
  }
  cuts.push(N);
  // Each block after the first also renders OVERLAP frames before its start. At the join the overlap
  // is matched against the previous block's last frames to find the shift (a browser can run a frame
  // ahead or behind); the block is then trimmed so motion runs straight through, and its cue times move
  // with it. The last block renders EXTRA end-hold frames so the total stays N after the shifts.
  const OVERLAP = 3, TAIL = 5, EXTRA = 6;
  const S = { written: 0, captured: 0, skipped: 0, predicted: [], failed: null };
  const blocks = Array.from({ length: K }, (_, k) => ({ k, start: cuts[k], end: k === K - 1 ? N + EXTRA : cuts[k + 1],
    segStart: k > 0 ? cuts[k] - OVERLAP : 0, stillJoin: k > 0 && !!still[cuts[k]],
    part: `${out}.part${k}.mp4`, off0: null, tele: null, head: new Map(), tail: new Map(), shift: 0, outStart: 0,
    t: { boot: 0, ff: 0, step: 0, cap: 0 } })).filter((b) => b.start < b.end);
  let lastLog = Date.now();

  async function worker(b) {
    const enc = encoder(b.part, P, fps, b.k > 0 ? OVERLAP + 2 : 0);
    const tb = Date.now();
    const f = await film();
    b.off0 = f.off0; b.t.boot = Date.now() - tb;
    try {
      let last = null;
      for (let i = 0; i < b.end; i++) {
        if (S.failed) return;
        const ta = Date.now();
        if (i === 1) await f.step(frameMs - f.off0); else if (i > 1) await f.step(frameMs);
        const s = await f.sync();
        if (i < b.segStart) { b.t.ff += Date.now() - ta; continue; }
        b.t.step += Date.now() - ta;
        let buf;
        if (o.skip && last && !s.dirty && i > b.start) { buf = last; S.skipped++; }
        else {
          if (o.verify && i > b.start && !s.dirty) S.predicted.push(i);
          const tc = Date.now();
          buf = await f.capture();
          b.t.cap += Date.now() - tc;
          S.captured++;
        }
        last = buf;
        await enc.write(buf);
        if (i < b.start) b.head.set(i, buf);
        if (i >= b.end - TAIL) b.tail.set(i, buf);
        if (i >= b.start) S.written++;
        if (Date.now() - lastLog > 5000) {
          lastLog = Date.now();
          const sec = (Date.now() - w0) / 1000;
          console.log(`[render] ${S.written}/${N} frames  ${(S.written / sec).toFixed(1)} fps  (${S.captured} captured, ${S.skipped} reused)`);
        }
      }
      b.tele = await f.telemetry();
    } finally {
      await f.close();
      await enc.end();
    }
  }

  let code = 0;
  try {
    await Promise.all(blocks.map((b) => worker(b).catch((e) => { if (!S.failed) S.failed = e; throw e; })));
  } catch (e) {
    console.error(`[render] FAILED: ${S.failed ? S.failed.message : e.message}`);
    code = (S.failed && S.failed.code) || 1;
  }
  server.close();

  // ── joins: find each block's shift against the block before, trim, join ──
  const joins = [];
  for (let k = 1; k < blocks.length && !code; k++) {
    const a = blocks[k - 1], b = blocks[k], j = b.start - OVERLAP;
    const tries = [-2, -1, 0, 1, 2].map((d) => ({ d, psnr: joinPsnr(b.head.get(j), a.tail.get(j + d)) }));
    const best = tries.reduce((x, y) => (y.psnr > x.psnr ? y : x));
    const zero = tries.find((x) => x.d === 0);
    b.shift = zero.psnr >= best.psnr - 0.5 ? 0 : best.d;
    joins.push({ t: +(b.start / fps).toFixed(2), still: b.stillJoin, shift: b.shift, psnr: (b.shift ? best : zero).psnr });
    if (process.env.RENDER_KEEP_JOINS) {
      fs.mkdirSync(process.env.RENDER_KEEP_JOINS, { recursive: true });
      fs.writeFileSync(path.join(process.env.RENDER_KEEP_JOINS, `join-${b.start}-next.jpg`), b.head.get(j));
      fs.writeFileSync(path.join(process.env.RENDER_KEEP_JOINS, `join-${b.start}-prev.jpg`), a.tail.get(j + b.shift));
    }
  }
  let outPos = 0;
  for (const b of blocks) { b.outStart = outPos; outPos += b.end - (b.start - b.shift); }
  const silent = out.replace(/\.mp4$/, '.silent.mp4');
  if (!code) {
    const list = `${out}.parts.txt`;
    fs.writeFileSync(list, blocks.map((b) => `file '${path.basename(b.part)}'` +
      (b.k > 0 ? `\ninpoint ${((OVERLAP - b.shift) / fps + 0.0005).toFixed(4)}` : '')).join('\n'));
    const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
      '-i', path.basename(list), '-c', 'copy', '-frames:v', String(N), '-movflags', '+faststart', path.basename(silent)], { cwd: path.dirname(out), stdio: 'inherit' });
    if (r.status !== 0) { console.error('[render] concat failed'); code = 1; }
    fs.rmSync(list, { force: true });
  }
  for (const b of blocks) fs.rmSync(b.part, { force: true });
  if (code) process.exit(code);
  if (!o.audio || o.seconds) { fs.renameSync(silent, out); if (o.audio) console.log('[render] no sound on a --seconds test render'); }
  else if (addAudio({ o, silent, out, N, fps, blocks, preTele }) !== 0) { console.error('[render] sound mix failed; silent video kept at ' + path.relative(REPO, silent)); process.exit(1); }
  else fs.rmSync(silent, { force: true });

  // ── report ──
  const wall = (Date.now() - w0) / 1000;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,nb_read_packets,color_space,color_primaries,color_transfer', '-of', 'json', out], { encoding: 'utf8' });
  const st = JSON.parse(probe.stdout || '{}').streams?.[0] || {};
  const filmS = N / fps;
  console.log(`[render] DONE ${path.relative(REPO, out)}  ${st.width}x${st.height}, ${st.nb_read_packets}/${N} frames, ${st.color_primaries}/${st.color_transfer}/${st.color_space}`);
  console.log(`[render] ${filmS.toFixed(1)} s of film in ${wall.toFixed(1)} s = ${(filmS / wall).toFixed(2)}x real time · ${(N / wall).toFixed(1)} fps · captured ${S.captured}, reused ${S.skipped} (${(100 * S.skipped / N).toFixed(0)}%)`);
  const avg = (key) => (blocks.reduce((a, b) => a + b.t[key], 0) / blocks.length / 1000).toFixed(1);
  console.log(`[render] per block (avg s): boot ${avg('boot')} · fast-forward ${avg('ff')} · step ${avg('step')} · capture ${avg('cap')} (${(blocks.reduce((a, b) => a + b.t.cap, 0) / Math.max(1, S.captured)).toFixed(0)} ms/capture)`);
  const bad = joins.filter((j) => j.psnr < 40);
  console.log(`[render] joins: ${joins.length - bad.length}/${joins.length} seamless (PSNR ≥ 40 dB after alignment); shifted ${joins.filter((j) => j.shift).map((j) => `${j.t}s by ${j.shift > 0 ? '+' : ''}${j.shift}`).join(', ') || 'none'}${bad.length ? ' — still differ at ' + bad.map((j) => `${j.t}s (${j.psnr} dB)`).join(', ') : ''}`);
  fs.writeFileSync(out.replace(/\.mp4$/, '.render.json'), JSON.stringify({ slug: o.slug, quality: o.quality, fps, frames: N, wall,
    captured: S.captured, reused: S.skipped, joins, blocks: blocks.map((b) => ({ start: b.start, end: b.end, shift: b.shift, outStart: b.outStart, off0: b.off0, t: b.t, telemetry: b.tele })),
    lengthPass: preTele }, null, 1));
  if (Number(st.nb_read_packets) !== N) { console.error('[render] frame count mismatch'); process.exit(1); }
  if (o.verify) verifySkip(out, S.predicted, fps);
}


// Sound for the finished video. Returns an exit status.
function addAudio({ o, silent, out, N, fps, blocks, preTele }) {
  const DUR = N / fps;
  const planPath = path.join(REPO, 'videos', o.slug, 'sfx', 'plan.json');
  if (fs.existsSync(planPath)) {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    plan.mp4 = silent; plan.out = out; plan.duration = DUR;
    const drift = blocks.map((b) => b.outStart - (b.start - b.shift)).filter((d) => d);
    if (drift.length) console.log(`[render] note: block joins moved later parts by ${[...new Set(drift)].join('/')} frame(s); plan cue times are used as authored`);
    const tmp = path.join(require('os').tmpdir(), `render-plan-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify(plan));
    console.log('[render] sound: sfx/plan.json via tools/sfx/mux.mjs');
    const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'sfx', 'mux.mjs'), '--video', o.slug, '--plan', tmp], { cwd: REPO, stdio: 'inherit' });
    fs.rmSync(tmp, { force: true });
    return r.status;
  }
  // Narration cues: take each cue from the browser that rendered the frames it falls in.
  const ref = (preTele && preTele.sched) || blocks[blocks.length - 1].tele?.sched || [];
  const cues = ref.map((e, i) => {
    const b = blocks.find((x) => e.t * fps >= x.start && e.t * fps < x.end) || blocks[blocks.length - 1];
    const own = b.tele?.sched?.[i];
    const t = own && own.key === e.key ? own.t : e.t;
    return { key: e.key, t: Math.max(0, (b.outStart + t * fps - (b.start - b.shift)) / fps) };
  }).filter((e) => e && e.key);
  const narrDir = path.join(REPO, 'videos', o.slug, 'narration');
  const clips = cues.map((c) => ({ key: c.key, t: c.t, file: path.join(narrDir, `${c.key}.mp3`) })).filter((c) => fs.existsSync(c.file));
  const missing = cues.filter((c) => !fs.existsSync(path.join(narrDir, `${c.key}.mp3`))).map((c) => c.key);
  let bgm = null;
  if (o.bgm === 'none') bgm = null;
  else if (o.bgm) bgm = path.resolve(REPO, o.bgm);
  else { const def = path.join(REPO, 'bgms', '1.mp3'); if (fs.existsSync(def)) bgm = def; }
  if (bgm && !fs.existsSync(bgm)) { console.error(`[render] BGM not found: ${bgm}`); return 1; }
  console.log(`[render] sound: ${clips.length}/${cues.length} narration clips${missing.length ? ' (no mp3: ' + missing.join(', ') + ')' : ''}, bed ${bgm ? path.relative(REPO, bgm) + ' @' + o.bgmVolume : 'none'}`);
  return mixNarration({ videoIn: silent, out, clips, DUR, bgm, bgmVolume: o.bgmVolume });
}

// The last frame of one block, rendered by the next block's browser too: same film state → high PSNR.
function joinPsnr(a, b) {
  if (!a || !b) return 0;
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'render-join-'));
  fs.writeFileSync(path.join(dir, 'a.jpg'), a); fs.writeFileSync(path.join(dir, 'b.jpg'), b);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', 'a.jpg', '-i', 'b.jpg', '-lavfi', 'psnr', '-f', 'null', '-'], { cwd: dir, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  const m = /average:([\d.]+|inf)/.exec(r.stderr || '');
  return m ? (m[1] === 'inf' ? 99 : +(+m[1]).toFixed(1)) : 0;
}

// --verify-skip: everything was captured; check that the frames the shim called static really
// match the frame before them in the encoded output (max luma difference at 960 px).
function verifySkip(out, predicted, fps) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-vf',
    'scale=960:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YMAX',
    '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const ymax = [];
  let fr = null;
  for (const line of (r.stderr || '').split(/\r?\n/)) {
    const m = /frame:(\d+)/.exec(line); if (m) fr = Number(m[1]);
    const v = /lavfi\.signalstats\.YMAX=(\d+)/.exec(line); if (v && fr != null) ymax[fr + 1] = Number(v[1]);
  }
  const bad = predicted.filter((i) => (ymax[i] ?? 0) > 8);
  const totalStatic = ymax.filter((v) => v === 0).length;
  console.log(`[verify] shim predicted ${predicted.length} static frames; ${totalStatic} frames are truly identical to the one before`);
  console.log(`[verify] false reuse (predicted static, but changed): ${bad.length}${bad.length ? ' — e.g. ' + bad.slice(0, 12).map((i) => `${i} (${(i / fps).toFixed(2)} s, Δ${ymax[i]})`).join(', ') : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
