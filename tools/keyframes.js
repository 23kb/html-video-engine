#!/usr/bin/env node
// Extract N evenly-spaced frame PNGs from an MP4 and tile them into a
// contact-sheet image. Cheap visual QC artifact — pair with storyboard
// approval to verify the rendered video matches the storyboard arc.
// Each tile carries a burned-in "#N t.ts" badge (frame index + timestamp),
// and the index→timestamp map is printed to stdout, so QC feedback like
// "frame 7" resolves to an exact second.
//
// Usage:
//   node tools/keyframes.js <video.mp4>                              # 12 frames, 4 columns
//   node tools/keyframes.js <video.mp4> --frames 16 --cols 4         # 16 frames in a 4×4 grid
//   node tools/keyframes.js <video.mp4> --out path/to/sheet.png      # custom output path
//   node tools/keyframes.js <video.mp4> --keep-frames                # keep the per-frame PNGs alongside the sheet
//
// Defaults: 12 frames, 4 columns (= 3 rows), 320px per cell width, the
// sheet lands next to the input as `<basename>-keyframes.png`.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function usage(code = 1) {
  console.error('Usage: node tools/keyframes.js <video.mp4> [--frames N] [--cols N] [--cell-width N] [--out path] [--keep-frames]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    input: null,
    frames: 12,
    cols: 4,
    cellWidth: 320,
    out: null,
    keepFrames: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--frames') args.frames = Number(argv[++i]);
    else if (a === '--cols') args.cols = Number(argv[++i]);
    else if (a === '--cell-width') args.cellWidth = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--keep-frames') args.keepFrames = true;
    else if (a === '-h' || a === '--help') usage(0);
    else if (!args.input && !a.startsWith('--')) args.input = a;
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.input) usage();
  if (!Number.isFinite(args.frames) || args.frames < 1) { console.error('--frames must be a positive integer'); usage(); }
  if (!Number.isFinite(args.cols) || args.cols < 1) { console.error('--cols must be a positive integer'); usage(); }
  if (!Number.isFinite(args.cellWidth) || args.cellWidth < 80) { console.error('--cell-width must be >= 80'); usage(); }
  return args;
}

function ffprobeDuration(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffprobe failed: ' + (r.stderr || '').trim());
  return Number((r.stdout || '').trim());
}

function ffprobeStream(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0',
    file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffprobe failed: ' + (r.stderr || '').trim());
  const [w, h] = (r.stdout || '').trim().split(',').map(Number);
  return { width: w, height: h };
}

// drawtext filter for the "#N t.ts" badge in a tile's lower-right corner.
function labelFilter(text, cellWidth) {
  const fontsize = Math.max(14, Math.round(cellWidth / 13));
  const font = process.platform === 'win32'
    ? "fontfile='C\\:/Windows/Fonts/arialbd.ttf'"
    : 'font=Arial';
  return `drawtext=${font}:text='${text}':fontsize=${fontsize}:fontcolor=white:`
    + 'x=w-tw-10:y=h-th-10:box=1:boxcolor=black@0.55:boxborderw=8';
}

function extractFrame(file, atSeconds, outPath, cellWidth, cellHeight, label) {
  const vf = `scale=${cellWidth}:${cellHeight}:flags=lanczos`
    + (label ? ',' + labelFilter(label, cellWidth) : '');
  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', String(atSeconds),
    '-i', file,
    '-frames:v', '1',
    '-vf', vf,
    outPath,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`ffmpeg frame extract failed at ${atSeconds}s`);
}

function tileToSheet(frames, cols, cellWidth, cellHeight, outPath) {
  const rows = Math.ceil(frames.length / cols);
  const inputArgs = [];
  for (const f of frames) { inputArgs.push('-i', f); }
  // Pad the last row with copies of the last frame so the grid is rectangular.
  // ffmpeg `tile` filter expects exactly cols*rows inputs.
  const padded = cols * rows;
  for (let k = frames.length; k < padded; k++) inputArgs.push('-i', frames[frames.length - 1]);

  // Use the `tile` filter — needs all inputs concatenated as a sequence.
  // Build a filter that stacks all inputs into one stream then tiles.
  const n = padded;
  const concat = Array.from({ length: n }, (_, i) => `[${i}:v]`).join('');
  const filter = `${concat}concat=n=${n}:v=1:a=0[s];[s]tile=${cols}x${rows}[out]`;

  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputArgs,
    '-filter_complex', filter,
    '-map', '[out]',
    '-frames:v', '1',
    outPath,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error('ffmpeg tile failed');
}

function main() {
  const args = parseArgs(process.argv);
  const input = path.resolve(args.input);
  if (!fs.existsSync(input)) {
    console.error('input not found: ' + input);
    process.exit(2);
  }
  const inputBase = path.basename(input, path.extname(input));
  const outDir = path.dirname(input);
  const out = args.out
    ? path.resolve(args.out)
    : path.join(outDir, `${inputBase}-keyframes.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const duration = ffprobeDuration(input);
  const { width, height } = ffprobeStream(input);
  const cellHeight = Math.round(args.cellWidth * (height / width));

  // Sample at the centers of N equal-time slices so frame 0 isn't always a
  // black/title frame and frame N isn't always the cut-off last frame.
  const sliceLen = duration / args.frames;
  const timestamps = Array.from({ length: args.frames }, (_, i) => (i + 0.5) * sliceLen);

  console.log(`[keyframes] input: ${path.relative(process.cwd(), input)}  duration: ${duration.toFixed(2)}s  source ${width}x${height}`);
  console.log(`[keyframes] sampling ${args.frames} frames @ ${args.cols}x${Math.ceil(args.frames / args.cols)} grid, ${args.cellWidth}x${cellHeight} per cell`);
  console.log(`[keyframes] tile map: ${timestamps.map((t, i) => `${i + 1}:${t.toFixed(1)}s`).join('  ')}`);

  const tmpDir = args.keepFrames
    ? path.join(outDir, `${inputBase}-keyframes-frames`)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'keyframes-'));
  fs.mkdirSync(tmpDir, { recursive: true });

  const frameFiles = [];
  try {
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      const f = path.join(tmpDir, `frame-${String(i).padStart(3, '0')}.png`);
      extractFrame(input, t, f, args.cellWidth, cellHeight, `#${i + 1} ${t.toFixed(1)}s`);
      frameFiles.push(f);
    }
    tileToSheet(frameFiles, args.cols, args.cellWidth, cellHeight, out);
    console.log(`[keyframes] OK → ${path.relative(process.cwd(), out)}`);
    if (args.keepFrames) {
      console.log(`[keyframes] frames kept in ${path.relative(process.cwd(), tmpDir)}`);
    }
  } finally {
    if (!args.keepFrames) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

if (require.main === module) main();

module.exports = { ffprobeDuration, ffprobeStream, extractFrame, tileToSheet };
