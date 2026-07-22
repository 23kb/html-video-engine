#!/usr/bin/env node
// Overlay a talking-head avatar clip as a circular picture-in-picture bubble
// onto a rendered body MP4. Pure ffmpeg — deterministic, render-safe, no
// changes to the HTML stage or tools/render.js seek parity.
//
// Usage:
//   node tools/avatar/composite.js --bg body.mp4 --avatar avatar.mp4 --out out.mp4
//   node tools/avatar/composite.js --bg b.mp4 --avatar a.mp4 --out o.mp4 --size 360 --pos bottom-right --margin 40
//   node tools/avatar/composite.js --bg b.mp4 --avatar a.mp4 --out o.mp4 --start 12.5 --audio avatar
//
// --pos: bottom-right (default) | bottom-left | top-right | top-left
// --start: seconds into the body when the bubble (and its audio) begins
// --audio: auto (default) | bg | avatar | none
//   auto = keep body audio if the body has an audio stream, else use the
//   avatar's narration audio (delayed by --start).
// The bubble edge gets a ~2px feather; the body continues untouched after the
// avatar clip ends (eof_action=pass).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage(code = 1) {
  console.error('Usage: node tools/avatar/composite.js --bg <mp4> --avatar <mp4> --out <mp4> [--size N] [--pos bottom-right|bottom-left|top-right|top-left] [--margin N] [--start seconds] [--audio auto|bg|avatar|none]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    bg: null,
    avatar: null,
    out: null,
    size: 360,
    pos: 'bottom-right',
    margin: 40,
    start: 0,
    audio: 'auto',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bg') args.bg = argv[++i];
    else if (a === '--avatar') args.avatar = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--size') args.size = Number(argv[++i]);
    else if (a === '--pos') args.pos = argv[++i];
    else if (a === '--margin') args.margin = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--audio') args.audio = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.bg || !args.avatar || !args.out) usage();
  if (!Number.isFinite(args.size) || args.size < 80) { console.error('--size must be >= 80'); usage(); }
  if (!['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(args.pos)) { console.error('bad --pos'); usage(); }
  if (!Number.isFinite(args.start) || args.start < 0) { console.error('--start must be >= 0'); usage(); }
  if (!['auto', 'bg', 'avatar', 'none'].includes(args.audio)) { console.error('bad --audio'); usage(); }
  return args;
}

function hasAudioStream(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a',
    '-show_entries', 'stream=index', '-of', 'csv=p=0', file,
  ], { encoding: 'utf8' });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
}

function overlayXY(pos, margin) {
  const m = margin;
  switch (pos) {
    case 'bottom-right': return { x: 'main_w-overlay_w-' + m, y: 'main_h-overlay_h-' + m };
    case 'bottom-left': return { x: String(m), y: 'main_h-overlay_h-' + m };
    case 'top-right': return { x: 'main_w-overlay_w-' + m, y: String(m) };
    case 'top-left': return { x: String(m), y: String(m) };
  }
}

function main() {
  const args = parseArgs(process.argv);
  for (const f of [args.bg, args.avatar]) {
    if (!fs.existsSync(f)) { console.error('not found: ' + f); process.exit(1); }
  }
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });

  const S = Math.round(args.size);
  const C = S / 2;
  const R = C - 1;
  const { x, y } = overlayXY(args.pos, Math.round(args.margin));

  let audioMode = args.audio;
  if (audioMode === 'auto') audioMode = hasAudioStream(args.bg) ? 'bg' : (hasAudioStream(args.avatar) ? 'avatar' : 'none');

  // Circular mask with a ~2px feathered edge, alphamerged onto the scaled
  // avatar, PTS-shifted to --start, overlaid on the body.
  const filter = [
    `color=c=white:s=${S}x${S},format=gray,geq=lum='clip((${R}-sqrt(pow(X-${C},2)+pow(Y-${C},2)))*128,0,255)'[mask]`,
    `[1:v]scale=${S}:${S}:force_original_aspect_ratio=increase,crop=${S}:${S}[avs]`,
    `[avs][mask]alphamerge,setpts=PTS-STARTPTS+${args.start}/TB[ava]`,
    `[0:v][ava]overlay=x=${x}:y=${y}:eof_action=pass:enable='gte(t,${args.start})'[vout]`,
  ];
  const ff = ['-y', '-v', 'error', '-i', args.bg, '-i', args.avatar];
  const maps = ['-map', '[vout]'];
  if (audioMode === 'bg') {
    maps.push('-map', '0:a');
  } else if (audioMode === 'avatar') {
    const ms = Math.round(args.start * 1000);
    filter.push(`[1:a]adelay=${ms}|${ms}[aout]`);
    maps.push('-map', '[aout]');
  }
  ff.push('-filter_complex', filter.join(';'), ...maps,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p');
  if (audioMode !== 'none') ff.push('-c:a', 'aac', '-b:a', '192k');
  ff.push(args.out);

  console.log('compositing ' + args.pos + ' bubble (' + S + 'px, audio=' + audioMode + ') ...');
  const r = spawnSync('ffmpeg', ff, { encoding: 'utf8' });
  if (r.status !== 0) { console.error('ffmpeg failed: ' + (r.stderr || '').trim()); process.exit(1); }

  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', args.out,
  ], { encoding: 'utf8' });
  console.log('done -> ' + args.out + ' (' + Number((probe.stdout || '0').trim()).toFixed(2) + 's)');
}

main();
