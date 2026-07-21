#!/usr/bin/env node
// render-singlehtml-audio.js — MP4 export WITH AUDIO for single-HTML videos.
//
// tools/render-html.js renders a single-HTML video to silent MP4. This adds the
// audio: it records the real run, reads the narration SCHEDULE the page emits,
// lays each narration clip at its cue time, and mixes a low, side-chain-DUCKED
// BGM under it. Promoted from the one-off capture/_tmp/export-eei.mjs (ISSUES
// #11) into a reusable tool.
//
// ── Instrumentation contract (the video's play() must provide) ───────────────
//   window.__T0    = performance.now() at the instant play() starts.
//   window.__sched = array of { key, t } — one per narration cue; `key` is the
//                    clip basename, `t` is seconds since __T0 (push as you say()).
//   window.__dur   = total play() duration in seconds.
//   window.__done  = true once play() finishes.
// Narration audio: videos/<slug>/narration/<key>.mp3 (missing keys are skipped
// with a warning). The render runs in REAL TIME (recording is wall-clock).
//
// Determinism note: the page itself must be deterministic (INV-9); this tool
// only records + muxes. Uncovered keys / missing BGM degrade gracefully.
//
// Audio mix (matches the EEI reference): narration clips adelay'd to cue, amix'd;
// BGM trimmed + lowered + side-chain-compressed under the narration (ducking);
// final narration+ducked-BGM mix through an alimiter against clipping.
//
// ⚠ Whether the mix/ducking SOUNDS right is the user's call — this tool does not
//   and cannot judge audio quality. It guarantees streams + duration, not taste.
//
// Usage:
//   node tools/render-singlehtml-audio.js <slug>
//   node tools/render-singlehtml-audio.js <slug> --bgm bgms/2.mp3 --bgm-volume 0.05
//   node tools/render-singlehtml-audio.js <slug> --bgm none           # narration only
//   node tools/render-singlehtml-audio.js <slug> --out /tmp/test.mp4 --max-seconds 200
//
// Exit: 0 ok · 1 failure · 2 not instrumented · 3 usage.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};

// Ducking + level constants (from the EEI reference; tunable via flags).
const DUCK = { threshold: 0.025, ratio: 8, attack: 15, release: 350 };
const LIMIT = 0.95;

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, bgm: undefined, bgmVolume: 0.055, outPath: null, maxSeconds: 200 };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === '--bgm') out.bgm = a[++i];
    else if (x === '--bgm-volume') out.bgmVolume = Number(a[++i]);
    else if (x === '--out') out.outPath = a[++i];
    else if (x === '--max-seconds') out.maxSeconds = Number(a[++i]);
    else if (!x.startsWith('--') && !out.slug) out.slug = x;
  }
  return out;
}

// Build the ffmpeg filtergraph from the clip schedule + BGM presence.
// Returns { fc, outLabel } — outLabel null means "no audio track".
function buildFilter(clips, DUR, hasBgm, bgmIdx, bgmVolume) {
  const clipCount = clips.length;
  if (clipCount === 0 && !hasBgm) return { fc: null, outLabel: null };
  let fc = '';
  let narr = null;
  if (clipCount >= 1) {
    // delay each narration clip to its cue time, pad to full duration (adelay
    // is the reliable in-filtergraph delay; matches the EEI reference)
    for (let i = 0; i < clipCount; i++) {
      const ms = Math.round(clips[i].t * 1000);
      fc += `[${i + 1}:a]adelay=${ms}|${ms},apad=whole_dur=${DUR}[a${i}];`;
    }
    if (clipCount === 1) {
      narr = 'a0';
    } else {
      for (let i = 0; i < clipCount; i++) fc += `[a${i}]`;
      fc += `amix=inputs=${clipCount}:normalize=0:duration=longest[narr];`;
      narr = 'narr';
    }
  }
  const d = `threshold=${DUCK.threshold}:ratio=${DUCK.ratio}:attack=${DUCK.attack}:release=${DUCK.release}`;
  if (clipCount >= 1 && hasBgm) {
    fc += `[${narr}]asplit=2[narrA][narrSC];`;
    fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume}[bglow];`;
    fc += `[bglow][narrSC]sidechaincompress=${d}[bgduck];`;
    fc += `[narrA][bgduck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  if (clipCount >= 1) { // narration only
    fc += `[${narr}]alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  // BGM only
  fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume},alimiter=limit=${LIMIT}[aout]`;
  return { fc, outLabel: 'aout' };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/render-singlehtml-audio.js <slug> [--bgm <path>|none] [--bgm-volume N] [--out <path>] [--max-seconds N]');
    process.exit(3);
  }
  const indexPath = path.join(REPO, 'videos', args.slug, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`No single-HTML video at videos/${args.slug}/index.html`);
    process.exit(1);
  }

  // Resolve BGM: default bgms/1.mp3 if present; --bgm none disables; --bgm <p> overrides.
  let bgm = null;
  if (args.bgm === 'none') bgm = null;
  else if (args.bgm) bgm = path.isAbsolute(args.bgm) ? args.bgm : path.join(REPO, args.bgm);
  else { const def = path.join(REPO, 'bgms', '1.mp3'); if (fs.existsSync(def)) bgm = def; }
  if (bgm && !fs.existsSync(bgm)) { console.error(`BGM not found: ${bgm}`); process.exit(1); }

  const outPath = args.outPath
    ? (path.isAbsolute(args.outPath) ? args.outPath : path.join(REPO, args.outPath))
    : path.join(REPO, 'videos', args.slug, 'render', `${args.slug}.mp4`);

  // ── static server ──
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    let fp = path.join(REPO, p);
    try { if (fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html'); } catch (_) {}
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end('404 ' + p); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, r));
  const PORT = server.address().port;
  const url = `http://localhost:${PORT}/videos/${args.slug}/index.html`;
  console.log(`[audio-export] ${args.slug} — serving on ${PORT}`);

  const tmpDir = path.join(REPO, 'tools', `.rec-${process.pid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference',
    recordVideo: { dir: tmpDir, size: { width: 1920, height: 1080 } },
  });
  const recStart = Date.now();
  const page = await ctx.newPage();

  let info, webm, O;
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction('window.__T0 != null', { timeout: 15000 });
    } catch (_) {
      await ctx.close(); await browser.close(); server.close();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      console.error(`[audio-export] ${args.slug} is not instrumented (window.__T0 never set).`);
      console.error('  play() must set __T0 / push {key,t} to __sched / set __dur / set __done. See this file\'s header.');
      process.exit(2);
    }
    const t0Wall = await page.evaluate(() => performance.timeOrigin + window.__T0);
    O = Math.max(0, (t0Wall - recStart) / 1000); // load-in seconds before play() began

    console.log('[audio-export] running in real time…');
    info = null;
    const start = Date.now();
    while (Date.now() - start < args.maxSeconds * 1000) {
      info = await page.evaluate(() => window.__done ? { sched: window.__sched || [], dur: window.__dur } : null);
      if (info) break;
      await page.waitForTimeout(500);
    }
    if (!info) info = await page.evaluate(() => ({ sched: window.__sched || [], dur: (performance.now() - window.__T0) / 1000 }));
    webm = await page.video().path();
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }

  const DUR = Math.ceil((info.dur || 0) + 0.25);
  const narrDir = path.join(REPO, 'videos', args.slug, 'narration');
  const all = (info.sched || []).filter(s => s && s.key);
  const clips = all
    .map(s => ({ key: s.key, t: s.t, file: path.join(narrDir, `${s.key}.mp3`) }))
    .filter(c => fs.existsSync(c.file));
  const missing = all.filter(s => !fs.existsSync(path.join(narrDir, `${s.key}.mp3`))).map(s => s.key);
  console.log(`[audio-export] load-in O=${O.toFixed(2)}s  dur=${DUR}s  clips=${clips.length}/${all.length}  bgm=${bgm ? path.relative(REPO, bgm) : 'none'}`);
  if (missing.length) console.log(`[audio-export] WARN missing narration mp3s (skipped): ${missing.join(', ')}`);

  // ── ffmpeg inputs ──
  // [0]=video (trimmed by load-in O), [1..N]=narration clips (delayed in-filter
  // via adelay), [N+1]=bgm.
  const inputs = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', O.toFixed(3), '-i', webm];
  clips.forEach(c => inputs.push('-i', c.file));
  if (bgm) inputs.push('-i', bgm);
  const bgmIdx = clips.length + 1;

  const { fc, outLabel } = buildFilter(clips, DUR, !!bgm, bgmIdx, args.bgmVolume);

  const ff = [...inputs];
  if (fc) ff.push('-filter_complex', fc, '-map', '0:v', '-map', `[${outLabel}]`);
  else ff.push('-map', '0:v', '-an');
  ff.push(
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30',
    ...(outLabel ? ['-c:a', 'aac', '-b:a', '192k'] : []),
    '-movflags', '+faststart', '-t', String(DUR), outPath
  );

  console.log('[audio-export] muxing…');
  const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  if (r.status !== 0) { console.error('[audio-export] ffmpeg FAILED'); process.exit(1); }

  const sz = (fs.statSync(outPath).size / 1e6).toFixed(1);
  console.log(`[audio-export] DONE → ${path.relative(REPO, outPath)}  (${sz} MB, ${DUR}s${outLabel ? ', +audio' : ', video-only'})`);
  console.log('[audio-export] ⚠ audio mix/ducking quality is the user\'s call — not verified by this tool.');
}

main().catch(e => { console.error('[audio-export]', e && e.message || e); process.exit(1); });
