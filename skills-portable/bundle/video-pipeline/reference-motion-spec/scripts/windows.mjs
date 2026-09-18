#!/usr/bin/env node
// windows.mjs <video> --at t1,t2,... [--out <dir>] [--pre 0.125] [--span 0.5] [--cell 480]
//
// One 24 fps strip per candidate seam, cut from the SAME 24 fps resample the f-sheets use
// (select on the full stream), so its frame numbers match map.txt exactly. Default: 12 tiles
// (4 cols x 3 rows) starting 3 frames (0.125 s) before the candidate and running 0.5 s. A
// candidate read off a 4 fps sheet is uncertain by +-0.25 s and transitions run 4-9 frames, so
// the original 8-tile recipe (--pre 0.05 --span 0.34, fps=24,tile=4x2) needed a second pass on
// most seams; it is still available with those flags. Badge: "#<24fps frame> <t>s".
// Output: <out>/windows/w-<t>.png (t with 2 decimals) + windows/index.json (one entry per strip
// with its own tile count, which validate-spec.mjs reads).
//
// Also accepts --at from a file: --at @candidates.json (an array of numbers or of {t} objects).

import fs from 'node:fs';
import path from 'node:path';
import { FFMPEG, probe, outDirFor, ensureDir, parseArgs, runOrThrow, badgeFilter, assertFile, fmtT, readJson } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { at: 'string', out: 'string', pre: 'number', span: 'number', cell: 'number' });
const file = assertFile(args._[0]);
if (!args.at) { console.error('usage: windows.mjs <video> --at t1,t2,... [--pre 0.05] [--span 0.34] [--cell 480]'); process.exit(1); }
const outDir = ensureDir(outDirFor(file, args.out));
const winDir = ensureDir(path.join(outDir, 'windows'));

const p = probe(file);
const pre = Number.isFinite(args.pre) ? args.pre : 0.125;
const span = Number.isFinite(args.span) ? args.span : 0.5;
const cellW = args.cell || 480;                       // 4 x 480 = 1920 wide
const cellH = even(Math.round(cellW * p.height / p.width));
const nFrames = Math.max(1, Math.round(span * 24));   // 0.5 s -> 12 frames
const cols = 4, rows = Math.ceil(nFrames / cols);
// Frame count on the 24 fps grid: the measured count sheets.mjs wrote into meta.json when
// available (the container duration can run past the last frame), else the probe estimate.
let totalFrames = Math.floor(p.duration * 24 + 1e-6);
try { const m = readJson(path.join(outDir, 'meta.json')); if (Number.isInteger(m.frames_24) && m.sheets) totalFrames = m.frames_24; } catch { /* no meta yet */ }

let times;
if (args.at.startsWith('@')) {
  const arr = readJson(args.at.slice(1));
  times = arr.map(x => typeof x === 'number' ? x : Number(x.t));
} else {
  times = args.at.split(',').map(s => Number(s.trim()));
}
times = times.filter(t => Number.isFinite(t));
if (!times.length) { console.error('no valid times in --at'); process.exit(1); }

const written = [];
for (const t of times) {
  const wanted = Math.round((t - pre) * 24);
  const startFrame = Math.max(0, Math.min(totalFrames - nFrames, wanted));
  if (startFrame !== wanted) console.log(`  (strip for ${fmtT(t)} clamped to the film: starts at frame ${startFrame + 1}, not ${wanted + 1})`);
  const endFrame = startFrame + nFrames - 1;
  const vf = [
    'fps=24:start_time=0',
    `select='between(n\\,${startFrame}\\,${endFrame})'`,
    `scale=${cellW}:${cellH}:flags=lanczos`,
    'setsar=1',
    badgeFilter({ frameExpr: `n+${startFrame + 1}`, fontsize: Math.max(18, Math.round(cellW / 22)), pad: 7 }),
    `tile=${cols}x${rows}:nb_frames=${nFrames}:color=black`,
  ].join(',');
  const name = `w-${fmtT(t)}.png`;
  const out = path.join(winDir, name);
  runOrThrow(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', file, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-frames:v', '1', out]);
  written.push({ id: `w-${fmtT(t)}`, file: name, t, tiles: nFrames, cols, rows, first_frame: startFrame + 1, last_frame: endFrame + 1, first_t: round(startFrame / 24, 4), last_t: round(endFrame / 24, 4) });
  console.log(`${name}: ${nFrames} tiles, frames ${startFrame + 1}-${endFrame + 1} (${(startFrame / 24).toFixed(3)}s - ${(endFrame / 24).toFixed(3)}s)`);
}

// windows/index.json: what each strip covers (merged with earlier runs, keyed by id, sorted by t).
// Each strip carries its own tile count so wide re-aim strips (--span 0.6) stay citable.
const indexFile = path.join(winDir, 'index.json');
let index = [];
if (fs.existsSync(indexFile)) {
  const prev = readJson(indexFile);
  index = (Array.isArray(prev) ? prev : prev.strips || []).filter(w => fs.existsSync(path.join(winDir, w.file)));
}
const byId = new Map(index.map(w => [w.id, w]));
for (const w of written) byId.set(w.id, w);
index = [...byId.values()].sort((a, b) => a.t - b.t);
fs.writeFileSync(indexFile, JSON.stringify({ default_tiles: nFrames, cols, rows, pre, span, strips: index }, null, 2) + '\n');
console.log('wrote ' + winDir + ` (${written.length} strip(s) this run, ${index.length} indexed)`);

function even(x) { return x % 2 ? x + 1 : x; }
function round(x, d) { const k = 10 ** d; return Math.round(x * k) / k; }
