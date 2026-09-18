#!/usr/bin/env node
// frame.mjs <video> --at t1,t2,... [--out <dir>] [--grid 10] [--plain]
//
// Full-resolution PNG of the 24 fps frame nearest each t, selected on the same fps=24 grid the
// sheets use (so the badge frame number matches map.txt), with a grid overlay every --grid % of
// the frame (thin, semi-transparent; default 10 %) and the standard "#<frame> <t>s" badge.
// The grid is the ruler for framing_fill / size_frac: subject height / frame height reads off
// the lines. --plain writes the frame with the badge only.
// Output: <out>/frames/frame-<t>.png (t with 2 decimals). Prints the frame size and the grid
// step in px. Deterministic.

import path from 'node:path';
import { FFMPEG, probe, outDirFor, ensureDir, parseArgs, runOrThrow, badgeFilter, assertFile, fmtT, readJson } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { at: 'list', out: 'string', grid: 'number', plain: 'boolean' });
const file = assertFile(args._[0]);
if (!args.at || !args.at.length) { console.error('usage: frame.mjs <video> --at t1,t2,... [--out <dir>] [--grid 10] [--plain]'); process.exit(1); }
const outDir = ensureDir(outDirFor(file, args.out));
const framesDir = ensureDir(path.join(outDir, 'frames'));

const p = probe(file);
const gridPct = Number.isFinite(args.grid) && args.grid > 0 && args.grid <= 100 ? args.grid : 10;
const stepX = p.width * gridPct / 100, stepY = p.height * gridPct / 100;

let totalFrames = Math.max(1, Math.floor(p.duration * 24 + 1e-6));
try { const m = readJson(path.join(outDir, 'meta.json')); if (Number.isInteger(m.frames_24) && m.sheets) totalFrames = m.frames_24; } catch { /* no meta yet */ }

const times = args.at.map(Number).filter(Number.isFinite);
if (!times.length) { console.error('no valid times in --at'); process.exit(1); }

console.log(`${path.basename(file)}: ${p.width}x${p.height}` + (args.plain ? ', no grid' : `, grid every ${gridPct}% = ${fmtNum(stepX)} x ${fmtNum(stepY)} px (${Math.round(100 / gridPct)} cells across, ${Math.round(100 / gridPct)} down)`));

for (const t of times) {
  const f = Math.max(0, Math.min(totalFrames - 1, Math.round(t * 24)));
  const vf = ['fps=24:start_time=0', `select='eq(n\\,${f})'`];
  if (!args.plain) {
    // drawgrid: line every step, 1 px, 35 % white so it reads on dark and light grounds alike
    vf.push(`drawgrid=w=iw*${gridPct}/100:h=ih*${gridPct}/100:t=1:c=white@0.35`);
  }
  // after select, n restarts at 0 -> print the source 24 fps frame number
  vf.push(badgeFilter({ frameExpr: `n+${f + 1}`, fontsize: Math.max(18, Math.round(p.width / 48)), pad: 8 }));
  const name = `frame-${fmtT(t)}.png`;
  const out = path.join(framesDir, name);
  runOrThrow(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', file, '-an', '-vf', vf.join(','), '-fps_mode', 'passthrough', '-frames:v', '1', out]);
  console.log(`${name}: frame #${f + 1} (${(f / 24).toFixed(4)}s)` + (Math.abs(t - f / 24) > 1e-6 ? ` for --at ${t}` : '') + ` ${p.width}x${p.height}`);
}
console.log('wrote ' + framesDir + ` (${times.length} frame(s))`);

function fmtNum(x) { return Number.isInteger(x) ? String(x) : x.toFixed(1); }
