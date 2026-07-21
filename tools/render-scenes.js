#!/usr/bin/env node
// render-scenes.js — MP4 export for the SCENE-PER-FILE architecture (FIX-10).
//
// tools/render-html.js and render-singlehtml-audio.js hardcode a single
// videos/<slug>/index.html. Scene-per-file videos (videos/<slug>/scenes/*.html,
// e.g. the SendGrid tutorial) needed a hand-written driver — this is that
// driver (capture/_tmp/export-sendgrid.mjs) promoted, byte-for-byte on the
// proven ffmpeg shapes:
//
//   A) record each scene (Playwright, REAL TIME) → per-scene mp4 with
//      narration laid at its __sched cue times (no BGM yet)
//   B) concat scene mp4s → one continuous narration video
//   C) ONE continuous side-chain-ducked BGM over the full video (BGM does
//      not restart at each cut)
//   D) ffprobe verification (streams + duration)
//
// Scenes must implement the instrumentation contract (__T0/__sched/__done —
// see tools/render-singlehtml-audio.js). Scene order = sorted filename order
// (keep the NN- numeric prefixes); _-prefixed files are kit assets, skipped.
//
// Usage:
//   node tools/render-scenes.js <slug> [--bgm <path>|none] [--bgm-volume 0.05]
//                               [--scenes 01-intro,02-postintro] [--out <path>]
//                               [--max-scene-seconds 120] [--dry-run]
//
// ⚠ Whether the mix/ducking SOUNDS right is the user's QC, not this tool's.
// Exit: 0 ok · 1 failure · 3 usage.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..');
const DUCK = { threshold: 0.03, ratio: 9, attack: 15, release: 350 };
const LIMIT = 0.95;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, bgm: path.join(REPO, 'bgms', '1.mp3'), bgmVolume: 0.05, scenes: null, out: null, maxSceneSeconds: 120, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--bgm') { const v = a[++i]; out.bgm = v === 'none' ? null : path.resolve(REPO, v); }
    else if (a[i] === '--bgm-volume') out.bgmVolume = Number(a[++i]);
    else if (a[i] === '--scenes') out.scenes = a[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a[i] === '--out') out.out = path.resolve(a[++i]);
    else if (a[i] === '--max-scene-seconds') out.maxSceneSeconds = Number(a[++i]);
    else if (a[i] === '--dry-run') out.dryRun = true;
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

function listScenes(scenesDir) {
  return fs.readdirSync(scenesDir)
    .filter(f => f.endsWith('.html') && !f.startsWith('_'))
    .map(f => f.replace(/\.html$/, ''))
    .sort();
}

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    let fp = path.join(REPO, p);
    try { if (fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html'); } catch {}
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}

function ff(args) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
}

async function recordScene(port, slug, name, maxMs) {
  const tmpDir = path.join(REPO, 'tools', `.rec-${process.pid}-${name}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: tmpDir, size: { width: 1920, height: 1080 } } });
  const recStart = Date.now();
  const page = await ctx.newPage();
  let info, webm, O = 0;
  try {
    await page.goto(`http://localhost:${port}/videos/${slug}/scenes/${name}.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.__T0 != null', { timeout: 15000 });
    const t0Wall = await page.evaluate(() => performance.timeOrigin + window.__T0);
    O = Math.max(0, (t0Wall - recStart) / 1000);
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      info = await page.evaluate(() => window.__done ? { sched: window.__sched || [], dur: window.__dur } : null);
      if (info) break;
      await page.waitForTimeout(400);
    }
    if (!info) info = await page.evaluate(() => ({ sched: window.__sched || [], dur: (performance.now() - window.__T0) / 1000 }));
    webm = await page.video().path();
  } finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }
  return { webm, tmpDir, O, sched: info.sched || [], dur: info.dur || 0 };
}

function buildSceneMp4({ webm, O, sched, dur }, narrDir, outPath) {
  const DUR = Math.round((dur + 0.2) * 100) / 100;
  const clips = sched.filter(s => s && s.key).map(s => ({ t: s.t, file: path.join(narrDir, `${s.key}.mp3`) })).filter(c => fs.existsSync(c.file));
  const inputs = ['-ss', O.toFixed(3), '-i', webm];
  clips.forEach(c => inputs.push('-i', c.file));
  let fc = '', outLabel = null;
  if (clips.length) {
    for (let i = 0; i < clips.length; i++) { const ms = Math.round(clips[i].t * 1000); fc += `[${i + 1}:a]adelay=${ms}|${ms},apad=whole_dur=${DUR}[a${i}];`; }
    if (clips.length === 1) fc += `[a0]alimiter=limit=${LIMIT}[aout]`;
    else { for (let i = 0; i < clips.length; i++) fc += `[a${i}]`; fc += `amix=inputs=${clips.length}:normalize=0:duration=longest,alimiter=limit=${LIMIT}[aout]`; }
    outLabel = 'aout';
  }
  const a = [...inputs];
  if (outLabel) a.push('-filter_complex', fc, '-map', '0:v', '-map', `[${outLabel}]`, '-c:a', 'aac', '-b:a', '192k');
  else a.push('-map', '0:v', '-f', 'lavfi', '-t', String(DUR), '-i', 'anullsrc=r=44100:cl=stereo', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  a.push('-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-t', String(DUR), outPath);
  ff(a);
  return DUR;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/render-scenes.js <slug> [--bgm <path>|none] [--scenes a,b] [--out <path>] [--dry-run]');
    process.exit(3);
  }
  const scenesDir = path.join(REPO, 'videos', args.slug, 'scenes');
  if (!fs.existsSync(scenesDir)) {
    console.error(`✗ videos/${args.slug}/scenes/ not found — this tool is for scene-per-file videos`);
    process.exit(3);
  }
  const scenes = args.scenes || listScenes(scenesDir);
  if (!scenes.length) { console.error('✗ no scene .html files found'); process.exit(3); }
  const narrDir = path.join(REPO, 'videos', args.slug, 'narration');
  const outDir = path.join(REPO, 'videos', args.slug, 'render');
  const finalMp4 = args.out || path.join(outDir, `${args.slug}.mp4`);

  if (args.dryRun) {
    console.log(`[dry-run] slug: ${args.slug}`);
    console.log(`[dry-run] scenes (${scenes.length}): ${scenes.join(', ')}`);
    for (const s of scenes) {
      const p = path.join(scenesDir, `${s}.html`);
      const src = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      const instrumented = /__T0/.test(src) || /_kit\.js/.test(src);
      console.log(`[dry-run]   ${fs.existsSync(p) ? '✓' : '✗'} ${s}.html${instrumented ? '' : '  ⚠ no __T0 marker found'}`);
    }
    console.log(`[dry-run] narration dir: ${fs.existsSync(narrDir) ? '✓' : '⚠ missing'} ${path.relative(REPO, narrDir)}`);
    console.log(`[dry-run] bgm: ${args.bgm ? (fs.existsSync(args.bgm) ? '✓ ' + path.relative(REPO, args.bgm) : '✗ missing ' + args.bgm) : 'none'}`);
    const ffOk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
    console.log(`[dry-run] ffmpeg: ${ffOk ? '✓' : '✗ not on PATH'}`);
    console.log(`[dry-run] out: ${path.relative(REPO, finalMp4)}`);
    process.exit(0);
  }

  fs.mkdirSync(path.join(outDir, 'scenes'), { recursive: true });
  const server = serve();
  await new Promise(r => server.listen(0, r));
  const PORT = server.address().port;
  console.log(`[render-scenes] serving :${PORT}`);

  const sceneMp4s = [];
  let total = 0;
  for (const name of scenes) {
    console.log(`[render-scenes] recording ${name}… (real time)`);
    const rec = await recordScene(PORT, args.slug, name, args.maxSceneSeconds * 1000);
    const outPath = path.join(outDir, 'scenes', `${name}.mp4`);
    const dur = buildSceneMp4(rec, narrDir, outPath);
    try { fs.rmSync(rec.tmpDir, { recursive: true, force: true }); } catch {}
    sceneMp4s.push(outPath); total += dur;
    console.log(`[render-scenes]   → ${name}.mp4  ${dur}s  cues=${rec.sched.length}`);
  }
  server.close();

  // B) concat scene mp4s → narration-only full video
  const listFile = path.join(outDir, 'concat-list.txt');
  fs.writeFileSync(listFile, sceneMp4s.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const concatMp4 = path.join(outDir, `${args.slug}.narration.mp4`);
  console.log('[render-scenes] concatenating…');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatMp4]);

  // C) ONE continuous ducked BGM over the whole video
  if (args.bgm && fs.existsSync(args.bgm)) {
    console.log('[render-scenes] laying continuous ducked BGM…');
    const d = `threshold=${DUCK.threshold}:ratio=${DUCK.ratio}:attack=${DUCK.attack}:release=${DUCK.release}`;
    const fc = `[0:a]asplit=2[narrA][narrSC];` +
      `[1:a]volume=${args.bgmVolume}[bglow];` +
      `[bglow][narrSC]sidechaincompress=${d}[bgduck];` +
      `[narrA][bgduck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=${LIMIT}[aout]`;
    ff(['-i', concatMp4, '-stream_loop', '-1', '-i', args.bgm, '-filter_complex', fc, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', finalMp4]);
  } else {
    if (args.bgm) console.warn(`[render-scenes] ⚠ BGM missing (${args.bgm}) — shipping narration-only audio`);
    fs.copyFileSync(concatMp4, finalMp4);
  }

  // D) ffprobe
  console.log('[render-scenes] ffprobe:');
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name', '-of', 'default=noprint_wrappers=1', finalMp4], { encoding: 'utf8' });
  console.log(probe.stdout);
  console.log(`[render-scenes] DONE → ${path.relative(REPO, finalMp4)}  (sum-of-scenes ${total.toFixed(1)}s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
