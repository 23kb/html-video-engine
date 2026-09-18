#!/usr/bin/env node
// sheets.mjs <video> [--out <dir>] [--cell 320] [--cell-c 384] [--skip-24] [--force]
//
// Writes <out>/sheets/:
//   c-NNN.png    composition sheets at 4 fps, 5x6 tiles, 0.25 s per tile, 7.5 s per sheet
//   f-NNN.png    full 24 fps sheets, 6x8 tiles = 48 frames = 2 s per sheet
//   overview.png 24 evenly spaced 24 fps frames, 4x6
//   map.txt      sheet / tile / frame / time for every cell
// Every tile carries a burned "#<frame> <t>s" badge. Sheet ids (c-001, f-003, overview)
// are the ids the spec's evidence rows cite. Deterministic for the same input. Refuses to
// re-render into a folder that already holds cuts.json / motion-spec.json unless --force.

import fs from 'node:fs';
import path from 'node:path';
import { FFMPEG, probe, outDirFor, ensureDir, parseArgs, runOrThrow, badgeFilter, assertFile, stemOf, refuseIfAnalysed } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { out: 'string', cell: 'number', 'cell-c': 'number', 'skip-24': 'boolean', force: 'boolean' });
const file = assertFile(args._[0]);
const outDir = ensureDir(outDirFor(file, args.out));
refuseIfAnalysed(outDir, args.force);
const sheetsDir = ensureDir(path.join(outDir, 'sheets'));

const p = probe(file);
const cell24 = args.cell || 320;                 // 6 x 320 = 1920 wide
const cellC = args['cell-c'] || 384;             // 5 x 384 = 1920 wide
const h24 = even(Math.round(cell24 * p.height / p.width));
const hC = even(Math.round(cellC * p.height / p.width));

// clean previous output of this script so a re-run is byte-comparable
for (const f of fs.readdirSync(sheetsDir)) {
  if (/^(c|f)-\d{3}\.png$/.test(f) || f === 'overview.png' || f === 'map.txt') fs.unlinkSync(path.join(sheetsDir, f));
}

const mapLines = [
  `Input: ${path.basename(file)}`,
  `Source: ${p.width}x${p.height}, ${p.fps.toFixed(3)} fps, ${p.duration.toFixed(3)} s.`,
  `Sheets: c-NNN = 4 fps composition sheets: grid 5 cols x 6 rows = 30 tiles per sheet, 0.25 s per tile, 7.5 s per sheet, ${cellC}x${hC} cells.`,
  `        f-NNN = 24 fps full sheets: grid 6 cols x 8 rows = 48 tiles per sheet = 2 s per sheet, ${cell24}x${h24} cells.`,
  `        overview = 24 evenly spaced 24 fps frames: grid 4 cols x 6 rows.`,
  `Tiles are numbered 1..N row-major (left to right, then the next row). Times are on the resampled output timeline; approximate within one sample.`,
  `Formulas: t = (frame - 1) / fps_of_sheet  (fps_of_sheet = 4 on c-sheets, 24 on f-sheets and windows).`,
  `          tile = badge frame - tiles_per_sheet x (sheet - 1)  (tiles_per_sheet = 30 on c-sheets, 48 on f-sheets).`,
  `Unused cells on the last sheet are black.`,
  '',
];

// ---- composition sheets, 4 fps ----
const cCount = runSheet({
  fps: 4, cellW: cellC, cellH: hC, cols: 5, rows: 6, prefix: 'c',
});
mapLines.push(`# composition sheets (4 fps): ${cCount} frames, ${Math.ceil(cCount / 30)} sheets`);
for (let i = 0; i < cCount; i++) {
  mapLines.push(`c-${pad3(Math.floor(i / 30) + 1)} tile ${pad2(i % 30 + 1)} frame ${i + 1} ${(i / 4).toFixed(3)}s`);
}
mapLines.push('');

// ---- full 24 fps sheets ----
let fCount = 0;
if (!args['skip-24']) {
  fCount = runSheet({ fps: 24, cellW: cell24, cellH: h24, cols: 6, rows: 8, prefix: 'f' });
  mapLines.push(`# 24 fps sheets: ${fCount} frames, ${Math.ceil(fCount / 48)} sheets`);
  for (let i = 0; i < fCount; i++) {
    mapLines.push(`f-${pad3(Math.floor(i / 48) + 1)} tile ${pad2(i % 48 + 1)} frame ${i + 1} ${(i / 24).toFixed(4)}s`);
  }
  mapLines.push('');
} else {
  // no 24 fps render to count: take probe.mjs's frames_24 when it exists, else the same formula it uses
  let known = null;
  try { known = JSON.parse(fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8')).frames_24; } catch { /* no meta yet */ }
  fCount = Number.isInteger(known) ? known : Math.floor(p.duration * 24 + 1e-6);
}

// ---- overview: 24 evenly spaced 24 fps frames ----
const n = Math.max(1, fCount);
const idx = Array.from({ length: 24 }, (_, i) => Math.round(i * (n - 1) / 23));
const uniq = [...new Set(idx)];
const select = uniq.map(i => `eq(n\\,${i})`).join('+');
const ovVf = [
  'fps=24:start_time=0',
  `select='${select}'`,
  `scale=${cellC}:${hC}:flags=lanczos`,
  'setsar=1',
  // after select, n restarts at 0 -> print the time only; map.txt carries the frame numbers
  badgeFilter({ frameExpr: null, fontsize: Math.max(16, Math.round(cellC / 20)) }),
  `tile=4x6:nb_frames=${uniq.length}:color=black`,
].join(',');
runOrThrow(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', file, '-an', '-vf', ovVf, '-fps_mode', 'passthrough', '-frames:v', '1', path.join(sheetsDir, 'overview.png')]);
mapLines.push(`# overview: ${uniq.length} cells`);
uniq.forEach((fi, k) => mapLines.push(`overview cell ${pad2(k + 1)} frame ${fi + 1} ${(fi / 24).toFixed(4)}s`));
mapLines.push('');

fs.writeFileSync(path.join(sheetsDir, 'map.txt'), mapLines.join('\n'), 'utf8');

// record the measured 24 fps frame count in meta.json (probe.mjs estimates it from the container duration)
const metaFile = path.join(outDir, 'meta.json');
if (fs.existsSync(metaFile)) {
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  meta.frames_24 = fCount;
  meta.sheets = { composition: Math.ceil(cCount / 30), full_24fps: Math.ceil(fCount / 48), overview_cells: uniq.length, cell_c: `${cellC}x${hC}`, cell_24: `${cell24}x${h24}` };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
}

console.log(`${stemOf(file)}: c-sheets ${Math.ceil(cCount / 30)} (${cCount} frames @4fps)` + (args['skip-24'] ? '' : `, f-sheets ${Math.ceil(fCount / 48)} (${fCount} frames @24fps)`) + `, overview ${uniq.length} cells`);
console.log('wrote ' + sheetsDir);

// ---------------------------------------------------------------------------

function runSheet({ fps, cellW, cellH, cols, rows, prefix }) {
  const per = cols * rows;
  const vf = [
    `fps=${fps}:start_time=0`,
    `scale=${cellW}:${cellH}:flags=lanczos`,
    'setsar=1',
    badgeFilter({ frameExpr: 'n+1', fontsize: Math.max(16, Math.round(cellW / 20)) }),
    'showinfo',
    `tile=${cols}x${rows}:nb_frames=${per}:color=black`,
  ].join(',');
  const r = runOrThrow(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', file, '-an', '-vf', vf, '-fps_mode', 'passthrough', path.join(sheetsDir, `${prefix}-%03d.png`)]);
  const count = (r.stderr.match(/Parsed_showinfo.*? n:\s*\d+\s+pts:/g) || []).length;
  const sheets = fs.readdirSync(sheetsDir).filter(f => f.startsWith(prefix + '-') && f.endsWith('.png')).length;
  if (!count || sheets !== Math.ceil(count / per)) {
    throw new Error(`sheet count mismatch for ${prefix}: ${count} frames, ${sheets} sheets`);
  }
  return count;
}

function even(x) { return x % 2 ? x + 1 : x; }
function pad3(n) { return String(n).padStart(3, '0'); }
function pad2(n) { return String(n).padStart(2, '0'); }
