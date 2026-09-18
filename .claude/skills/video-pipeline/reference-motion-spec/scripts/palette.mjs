#!/usr/bin/env node
// palette.mjs <video> [--at t1,t2,...] [--out <dir>] [--n 6] [--xy x,y[,x,y...]]
//
// Dominant colours per frame, so identity.palette is sampled, never estimated by eye.
// Each t maps to the 24 fps frame nearest it (fps=24 grid, selected by frame index, so the
// frame number matches the sheet badges). Default --at: 12 evenly spaced frames.
// Method: decode the frame at 320 px wide as rgb24, quantize to 4 bits per channel, count,
// merge bins whose centres are closer than 24/255 in RGB distance (most-populated first),
// report the top --n as hex + share (two decimals).
// --xy x,y[,x,y...]: also sample those exact pixels at every --at time on the FULL-RES frame
// (format=rgb24 on the whole frame, pixel read from the raw buffer; never crop=1:1 on yuv420p).
// Writes <out>/palette.json and prints a compact table. Deterministic.

import path from 'node:path';
import { FFMPEG, probe, outDirFor, ensureDir, writeJson, readJson, parseArgs, runBinary, assertFile, fmtT } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { at: 'list', out: 'string', n: 'number', xy: 'list' });
const file = assertFile(args._[0]);
const outDir = ensureDir(outDirFor(file, args.out));
const p = probe(file);
const topN = Number.isInteger(args.n) && args.n > 0 ? args.n : 6;
const MERGE_DIST = 24;
const SMALL_W = 320;

// frame count on the 24 fps grid: sheets.mjs's measured count when available, else the estimate
let totalFrames = Math.max(1, Math.floor(p.duration * 24 + 1e-6));
try { const m = readJson(path.join(outDir, 'meta.json')); if (Number.isInteger(m.frames_24) && m.sheets) totalFrames = m.frames_24; } catch { /* no meta yet */ }

// ---- times -> frame indices (0-based on the 24 fps grid) ----
let times;
if (args.at && args.at.length) {
  times = args.at.map(Number).filter(Number.isFinite);
  if (!times.length) { console.error('no valid times in --at'); process.exit(1); }
} else {
  const K = 12;
  times = Array.from({ length: K }, (_, i) => Math.round(i * (totalFrames - 1) / (K - 1)) / 24);
}
const frameOf = t => Math.max(0, Math.min(totalFrames - 1, Math.round(t * 24)));
const wanted = new Map(); // frame index -> requested t (first wins)
for (const t of times) { const f = frameOf(t); if (!wanted.has(f)) wanted.set(f, t); }
const frames = [...wanted.keys()].sort((a, b) => a - b);

// ---- --xy pairs ----
let xy = [];
if (args.xy && args.xy.length) {
  const nums = args.xy.map(Number);
  if (nums.length % 2 || nums.some(v => !Number.isInteger(v))) { console.error('--xy needs integer pairs: x,y[,x,y...]'); process.exit(1); }
  for (let i = 0; i < nums.length; i += 2) {
    const [x, y] = [nums[i], nums[i + 1]];
    if (x < 0 || y < 0 || x >= p.width || y >= p.height) { console.error(`--xy ${x},${y} outside ${p.width}x${p.height}`); process.exit(1); }
    xy.push({ x, y });
  }
}

// ---- one decode pass per resolution: select the union of frames, raw rgb24 out ----
const select = frames.map(f => `eq(n\\,${f})`).join('+');
function decode(width, height) {
  const vf = [`fps=24:start_time=0`, `select='${select}'`];
  if (width !== p.width || height !== p.height) vf.push(`scale=${width}:${height}:flags=area`);
  vf.push('format=rgb24');
  const buf = runBinary(FFMPEG, ['-v', 'error', '-i', file, '-an', '-vf', vf.join(','), '-fps_mode', 'passthrough', '-frames:v', String(frames.length), '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
  const per = width * height * 3;
  if (buf.length !== per * frames.length) throw new Error(`decoded ${buf.length} bytes, expected ${per * frames.length} (${frames.length} frames of ${width}x${height} rgb24)`);
  return { buf, per };
}

const smallW = Math.min(SMALL_W, p.width);
const smallH = Math.max(1, Math.round(smallW * p.height / p.width));
const small = decode(smallW, smallH);
const full = xy.length ? decode(p.width, p.height) : null;

// ---- per frame: quantize, count, merge, top n ----
function dominant(buf, off, len) {
  const bins = new Map(); // key -> [count, sumR, sumG, sumB]
  for (let i = off; i < off + len; i += 3) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = bins.get(key);
    if (e) { e[0]++; e[1] += r; e[2] += g; e[3] += b; } else bins.set(key, [1, r, g, b]);
  }
  const sorted = [...bins.entries()].sort((a, b) => b[1][0] - a[1][0] || a[0] - b[0]);
  const clusters = []; // { count, r, g, b } centres (sums kept for exact weighted means)
  for (const [, [c, sr, sg, sb]] of sorted) {
    const r = sr / c, g = sg / c, b = sb / c;
    let hit = null;
    for (const k of clusters) {
      const cr = k.sr / k.count, cg = k.sg / k.count, cb = k.sb / k.count;
      if (Math.hypot(r - cr, g - cg, b - cb) < MERGE_DIST) { hit = k; break; }
    }
    if (hit) { hit.count += c; hit.sr += sr; hit.sg += sg; hit.sb += sb; }
    else clusters.push({ count: c, sr, sg, sb });
  }
  clusters.sort((a, b) => b.count - a.count || a.sr - b.sr);
  const total = len / 3;
  return clusters.slice(0, topN).map(k => ({
    hex: hex(Math.round(k.sr / k.count), Math.round(k.sg / k.count), Math.round(k.sb / k.count)),
    share: Number((k.count / total).toFixed(2)),
  }));
}

const out = {
  source: path.basename(file),
  width: p.width,
  height: p.height,
  method: `24 fps grid; frame = round(t*24); decoded at ${smallW}x${smallH} rgb24; 4 bits per channel; bins closer than ${MERGE_DIST}/255 RGB merged (largest first); top ${topN} by pixel share. Samples: exact pixels on the full ${p.width}x${p.height} rgb24 frame.`,
  frames: frames.map((f, i) => {
    const row = { t: round(f / 24, 4), frame: f + 1, colours: dominant(small.buf, i * small.per, small.per) };
    const req = wanted.get(f);
    if (Math.abs(req - f / 24) > 1e-6) row.t_requested = req;
    if (full) {
      row.samples = xy.map(({ x, y }) => {
        const o = i * full.per + (y * p.width + x) * 3;
        return { x, y, hex: hex(full.buf[o], full.buf[o + 1], full.buf[o + 2]) };
      });
    } else row.samples = [];
    return row;
  }),
};

writeJson(path.join(outDir, 'palette.json'), out);

// ---- table ----
console.log(`${out.source}: ${frames.length} frame(s), top ${topN} colours each` + (xy.length ? `, ${xy.length} pixel sample(s) per frame` : ''));
console.log('t'.padStart(8) + '  ' + 'frame'.padStart(5) + '  colours (hex share)' + (xy.length ? '  | samples' : ''));
for (const r of out.frames) {
  const cols = r.colours.map(c => `${c.hex} ${c.share.toFixed(2)}`).join('  ');
  const smp = r.samples.length ? '  | ' + r.samples.map(s => `${s.x},${s.y} ${s.hex}`).join('  ') : '';
  console.log(fmtT(r.t, 3).padStart(8) + '  ' + ('#' + r.frame).padStart(5) + '  ' + cols + smp);
}
console.log('wrote ' + path.join(outDir, 'palette.json'));

function hex(r, g, b) { return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
function round(x, d) { const k = 10 ** d; return Math.round(x * k) / k; }
