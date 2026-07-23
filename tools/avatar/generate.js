#!/usr/bin/env node
// Lip-sync a talking-head base video of Umair to a narration audio track.
// Wraps the vendored Wav2Lip inference (tools/avatar/Wav2Lip) running in the
// local Python 3.10 venv (tools/avatar/.venv) on GPU. Output is a plain MP4
// asset — composite it onto a rendered body with tools/avatar/composite.js.
//
// Usage:
//   node tools/avatar/generate.js --audio videos/<slug>/narration/01.mp3 --out videos/<slug>/avatar/01.mp4
//   node tools/avatar/generate.js --audio n.mp3 --out a.mp4 --base reference/avatar-source/base.mp4
//   node tools/avatar/generate.js --audio n.mp3 --out a.mp4 --resize-factor 2 --nosmooth
//
// Defaults: base = reference/avatar-source/base.mp4, pads "0 10 0 0",
// face_det_batch_size 4 / wav2lip_batch_size 32 (sized for a 6GB RTX 2060),
// resize-factor auto (downscales >720p bases so face detection fits VRAM).
// If the audio is longer than the base video, Wav2Lip loops the base frames.
//
// Setup (one-time): see tools/avatar/README.md.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const AVATAR_DIR = __dirname;
const VENV_PY = path.join(AVATAR_DIR, '.venv', 'Scripts', 'python.exe');
const W2L_DIR = path.join(AVATAR_DIR, 'Wav2Lip');
const CHECKPOINT = path.join(AVATAR_DIR, 'weights', 'wav2lip_gan.pth');
const S3FD = path.join(W2L_DIR, 'face_detection', 'detection', 'sfd', 's3fd.pth');
const DEFAULT_BASE = path.join(ROOT, 'reference', 'avatar-source', 'base.mp4');

function usage(code = 1) {
  console.error('Usage: node tools/avatar/generate.js --audio <mp3|wav> --out <mp4> [--base <mp4>] [--pads "T B L R"] [--resize-factor N] [--nosmooth] [--face-det-batch N] [--wav2lip-batch N]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    audio: null,
    out: null,
    base: DEFAULT_BASE,
    pads: '0 10 0 0',
    resizeFactor: null, // null = auto from base height
    nosmooth: false,
    skipBaseCheck: false,
    faceDetBatch: 4,
    wav2lipBatch: 32,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--audio') args.audio = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--base') args.base = argv[++i];
    else if (a === '--pads') args.pads = argv[++i];
    else if (a === '--resize-factor') args.resizeFactor = Number(argv[++i]);
    else if (a === '--nosmooth') args.nosmooth = true;
    else if (a === '--skip-base-check') args.skipBaseCheck = true;
    else if (a === '--face-det-batch') args.faceDetBatch = Number(argv[++i]);
    else if (a === '--wav2lip-batch') args.wav2lipBatch = Number(argv[++i]);
    else if (a === '-h' || a === '--help') usage(0);
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.audio || !args.out) usage();
  return args;
}

function ffprobe(file, entries, stream) {
  const sel = stream ? ['-select_streams', stream] : [];
  const r = spawnSync('ffprobe', [
    '-v', 'error', ...sel,
    '-show_entries', entries,
    '-of', 'csv=p=0',
    file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffprobe failed on ' + file + ': ' + (r.stderr || '').trim());
  return (r.stdout || '').trim();
}

function preflight(args) {
  const missing = [];
  if (!fs.existsSync(VENV_PY)) missing.push('venv python (' + VENV_PY + ')');
  if (!fs.existsSync(W2L_DIR)) missing.push('Wav2Lip clone (' + W2L_DIR + ')');
  if (!fs.existsSync(CHECKPOINT)) missing.push('wav2lip_gan.pth checkpoint (' + CHECKPOINT + ')');
  if (!fs.existsSync(S3FD)) missing.push('s3fd face-detection weights (' + S3FD + ')');
  if (missing.length) {
    console.error('Setup incomplete — missing:\n  - ' + missing.join('\n  - '));
    console.error('See tools/avatar/README.md for one-time setup.');
    process.exit(1);
  }
  if (!fs.existsSync(args.audio)) { console.error('audio not found: ' + args.audio); process.exit(1); }
  if (!fs.existsSync(args.base)) {
    console.error('base footage not found: ' + args.base);
    console.error('Drop talking-head footage at reference/avatar-source/base.mp4 (see reference/avatar-source/README.md) or pass --base.');
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv);
  args.audio = path.resolve(args.audio);
  args.out = path.resolve(args.out);
  args.base = path.resolve(args.base);
  preflight(args);

  // Guardrail (2026-07-23): reject screen-share/PiP frames posing as base
  // footage — Wav2Lip happily syncs a tiny corner face into a garbage asset.
  if (!args.skipBaseCheck) {
    const chk = spawnSync(VENV_PY, [path.join(AVATAR_DIR, 'check-base.py'), args.base], { cwd: W2L_DIR, encoding: 'utf8' });
    const lastLine = (chk.stdout || '').trim().split('\n').pop() || '{}';
    let verdict = {};
    try { verdict = JSON.parse(lastLine); } catch (_) { /* fall through to status check */ }
    if (chk.status !== 0) {
      console.error('base footage REJECTED: ' + (verdict.reason || (chk.stderr || '').trim() || 'check-base failed'));
      console.error('Use genuine talking-head framing (face >= 22% of frame height, centered), or --skip-base-check to override.');
      process.exit(1);
    }
    console.log('base check ok: face ' + Math.round(verdict.faceH_frac * 100) + '% of frame height at (' + verdict.cx + ', ' + verdict.cy + ')');
  }

  const baseH = Number(ffprobe(args.base, 'stream=height', 'v:0').split('\n')[0]);
  let resize = args.resizeFactor;
  if (!Number.isFinite(resize) || resize < 1) {
    resize = baseH > 720 ? Math.ceil(baseH / 720) : 1;
    if (resize > 1) console.log('base is ' + baseH + 'p — auto resize-factor ' + resize + ' (processing at ' + Math.round(baseH / resize) + 'p; override with --resize-factor 1)');
  }

  // Wav2Lip's inference.py shells out to ffmpeg with unquoted paths, so the
  // audio and outfile it sees must be space-free relative paths under its cwd.
  const tempDir = path.join(W2L_DIR, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(path.dirname(args.out), { recursive: true });

  const wavRel = path.join('temp', 'narration_in.wav');
  const outRel = path.join('temp', 'avatar_out.mp4');
  const conv = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', args.audio, path.join(W2L_DIR, wavRel)], { encoding: 'utf8' });
  if (conv.status !== 0) { console.error('audio->wav conversion failed: ' + (conv.stderr || '').trim()); process.exit(1); }

  const pyArgs = [
    'inference.py',
    '--checkpoint_path', CHECKPOINT,
    '--face', args.base,
    '--audio', wavRel,
    '--outfile', outRel,
    '--pads', ...args.pads.split(/\s+/),
    '--face_det_batch_size', String(args.faceDetBatch),
    '--wav2lip_batch_size', String(args.wav2lipBatch),
    '--resize_factor', String(resize),
  ];
  if (args.nosmooth) pyArgs.push('--nosmooth');

  console.log('lip-syncing ' + path.relative(ROOT, args.audio) + ' onto ' + path.relative(ROOT, args.base) + ' ...');
  const t0 = Date.now();
  const run = spawnSync(VENV_PY, pyArgs, { cwd: W2L_DIR, stdio: 'inherit' });
  if (run.status !== 0) {
    console.error('Wav2Lip inference failed (exit ' + run.status + ').');
    console.error('If CUDA out-of-memory: retry with --resize-factor ' + (resize + 1) + ' or --face-det-batch 2.');
    process.exit(1);
  }

  const produced = path.join(W2L_DIR, outRel);
  if (!fs.existsSync(produced)) { console.error('inference reported success but no output at ' + produced); process.exit(1); }
  fs.copyFileSync(produced, args.out);
  fs.rmSync(produced, { force: true });
  fs.rmSync(path.join(W2L_DIR, wavRel), { force: true });

  const dur = Number(ffprobe(args.out, 'format=duration'));
  const audioDur = Number(ffprobe(args.audio, 'format=duration'));
  const size = fs.statSync(args.out).size;
  console.log('done in ' + Math.round((Date.now() - t0) / 1000) + 's -> ' + path.relative(ROOT, args.out));
  console.log('  duration ' + dur.toFixed(2) + 's (audio ' + audioDur.toFixed(2) + 's), ' + (size / 1024 / 1024).toFixed(1) + ' MB');
  if (Math.abs(dur - audioDur) > 0.5) {
    console.error('WARNING: output/audio duration mismatch > 0.5s — check the clip before using it.');
    process.exit(2);
  }
}

main();
