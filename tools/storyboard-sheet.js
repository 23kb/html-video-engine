#!/usr/bin/env node
// tools/storyboard-sheet.js — stills-first contact sheet for single-HTML films.
//
// Seeks a PAUSED film to each beat mark, screenshots the stage, and tiles the
// stills into one badged contact sheet — so the LOOK is approved on stills
// before (or without) motion work. This is the pre-build sibling of
// tools/keyframes.js (which needs a rendered MP4); the tiling comes from there.
// Adopted from the stills-first workflow review: docs/video-system-improvements-2026-08-06.md S1.
//
// Beat marks, in priority order:
//   --beats 0.5,3.2,7      explicit timestamps
//   (default)              the master timeline's GSAP labels (window.__tl.labels)
//   --frames N             fallback when no labels exist: N evenly-spaced samples
//
// Usage:
//   node tools/storyboard-sheet.js <slug> [--beats t1,t2,...] [--frames 12]
//        [--cols 4] [--cell-width 320] [--out path] [--port 4321] [--resolution WxH]
//
// Output: videos/<slug>/storyboard-sheet.png (override with --out) + a tile map
// on stdout so "still 3" resolves to an exact timestamp/label.
// The sheet is an artifact FOR UMAIR — the agent never interprets it visually.
//
// ⚠ BEAT-DRIVEN films (await-driven play(), no window.__tl) CANNOT use this
// tool — startup gates on __tl and seeks run through __tl.time(t) (fix-round
// B4 / ccs 17, sized and PARKED; a virtual-clock driver — Playwright
// page.clock — is the design candidate; see tools/seam-gate.js's note).
// Until then, beat-driven films get stills from the RENDER via keyframes.js.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');
const { resolveResolution } = require('./stage-size');
const { tileToSheet } = require('./keyframes.js');

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
function argVal(name, dflt) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : dflt;
}
if (!slug) {
  console.error('usage: node tools/storyboard-sheet.js <slug> [--beats t1,t2,...] [--frames 12] [--cols 4] [--cell-width 320] [--out path] [--port 4321] [--resolution WxH]');
  process.exit(2);
}

const PORT = Number(argVal('--port', process.env.PORT || 4321));
const COLS = Number(argVal('--cols', 4));
const CELL_W = Number(argVal('--cell-width', 320));
const FRAMES = Number(argVal('--frames', 12));
const BEATS_ARG = argVal('--beats', null);
const HTML_PATH = path.join(__dirname, '..', 'videos', slug, 'index.html');
const OUT = path.resolve(argVal('--out', path.join(__dirname, '..', 'videos', slug, 'storyboard-sheet.png')));
const RES = resolveResolution({ resolutionArg: argVal('--resolution', null), htmlPath: HTML_PATH });
const TARGET_URL = `http://localhost:${PORT}/videos/${slug}/index.html`;

// scale + badge a PNG still (same drawtext badge style as keyframes.js)
function labelStill(inPath, outPath, cellW, cellH, text) {
  const fontsize = Math.max(14, Math.round(cellW / 13));
  const font = process.platform === 'win32'
    ? "fontfile='C\\:/Windows/Fonts/arialbd.ttf'"
    : 'font=Arial';
  const vf = `scale=${cellW}:${cellH}:flags=lanczos,`
    + `drawtext=${font}:text='${text.replace(/[':]/g, ' ')}':fontsize=${fontsize}:fontcolor=white:`
    + 'x=w-tw-10:y=h-th-10:box=1:boxcolor=black@0.55:boxborderw=8';
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inPath, '-vf', vf, outPath],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error('ffmpeg still label failed for ' + inPath);
}

async function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error('no film at videos/' + slug + '/index.html');
    process.exit(2);
  }

  await ensureServer(PORT);
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: RES.width, height: RES.height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));

  await page.goto(TARGET_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tl, null, { polling: 100, timeout: 25000 });
  await page.evaluate(() => { window.__tl.pause(); });

  // resolve beat marks
  let beats; // [{ t, label }]
  if (BEATS_ARG) {
    beats = BEATS_ARG.split(',').map((s) => ({ t: Number(s), label: '' }));
  } else {
    const labels = await page.evaluate(() => window.__tl.labels || {});
    const entries = Object.entries(labels).sort((a, b) => a[1] - b[1]);
    if (entries.length >= 2) {
      beats = entries.map(([label, t]) => ({ t, label }));
    } else {
      const dur = await page.evaluate(() => window.__tl.duration());
      const sliceLen = dur / FRAMES;
      beats = Array.from({ length: FRAMES }, (_, i) => ({ t: (i + 0.5) * sliceLen, label: '' }));
      console.log(`[storyboard-sheet] no timeline labels — sampling ${FRAMES} evenly-spaced stills over ${dur.toFixed(1)}s`);
    }
  }
  if (beats.some((b) => !Number.isFinite(b.t))) {
    console.error('bad beat timestamps: ' + JSON.stringify(beats));
    process.exit(2);
  }

  console.log(`[storyboard-sheet] ${slug} @ ${RES.width}x${RES.height} — ${beats.length} stills`);
  console.log('[storyboard-sheet] tile map: ' + beats.map((b, i) => `${i + 1}:${b.t.toFixed(1)}s${b.label ? '(' + b.label + ')' : ''}`).join('  '));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-sheet-'));
  const cellH = Math.round(CELL_W * (RES.height / RES.width));
  const tiles = [];
  try {
    const stage = page.locator('.stage').first();
    const useStage = (await stage.count()) > 0;
    for (let i = 0; i < beats.length; i++) {
      const { t, label } = beats[i];
      await page.evaluate((tt) => { window.__tl.time(tt, false); }, t);
      await page.waitForTimeout(60); // let fonts/rasters settle at the pose
      const raw = path.join(tmpDir, `raw-${String(i).padStart(3, '0')}.png`);
      if (useStage) await stage.screenshot({ path: raw });
      else await page.screenshot({ path: raw });
      const tile = path.join(tmpDir, `tile-${String(i).padStart(3, '0')}.png`);
      labelStill(raw, tile, CELL_W, cellH, `#${i + 1} ${t.toFixed(1)}s ${label}`.trim());
      tiles.push(tile);
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    tileToSheet(tiles, COLS, CELL_W, cellH, OUT);
    console.log('[storyboard-sheet] OK -> ' + path.relative(process.cwd(), OUT));
    if (errors.length) console.log('[storyboard-sheet] page errors (film may be broken): ' + errors.join(' | '));
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    await browser.close();
  }
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
