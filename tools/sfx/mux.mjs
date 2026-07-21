// SFX pipeline step 3: mix a plan's tracks (sound clips + media clips) into
// one audio track and mux it onto the rendered MP4. Video stream is COPIED,
// never re-encoded.
//
// Usage: node tools/sfx/mux.mjs --video <slug> [--plan <path>] [--out <path>]
// Reads:  videos/<slug>/sfx/plan.json (multitrack schema; run migrate-plan.mjs
//         on a legacy flat plan first) + sounds/*.mp3 + any media files.
// Writes: plan.out MP4 next to the source video.
//
// Clip types (see tools/sfx/docs/adr/0001):
//   sound  — references plan.sounds[name]; trim = hard cut + 0.15s auto tail.
//   media  — references an imported file; explicit fadeIn/fadeOut.
// Track-level gainDb sums with clip gainDb. Muted tracks/clips are dropped.
// If any track is soloed, only soloed tracks are mixed.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const video = arg('--video');
if (!video) { console.error('Usage: node tools/sfx/mux.mjs --video <slug> [--plan <path>] [--out <path>]'); process.exit(1); }

const sfxDir = path.resolve('videos', video, 'sfx');
const planPath = arg('--plan') || path.join(sfxDir, 'plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.tracks)) {
  console.error('[mux] plan has no tracks[] — run: node tools/sfx/migrate-plan.mjs --plan ' + planPath);
  process.exit(1);
}
const srcMp4 = path.resolve(plan.mp4);
const outMp4 = path.resolve(arg('--out') || plan.out);
const DUR = plan.duration;
if (!fs.existsSync(srcMp4)) { console.error('source mp4 missing: ' + srcMp4); process.exit(1); }

const probeDur = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!Number.isFinite(d)) throw new Error('ffprobe failed for ' + f);
  return d;
};

// ── Flatten active tracks → render list, resolving each clip to a file ──
const anySolo = plan.tracks.some((t) => t.solo);
const renders = []; // { fileAbs, t, gainDb, kind:'sound'|'media', trim?, fadeIn?, fadeOut? }
for (const tr of plan.tracks) {
  if (tr.muted || (anySolo && !tr.solo)) continue;
  const trackGain = tr.gainDb || 0;
  for (const c of tr.clips || []) {
    if (c.muted) continue;
    let fileAbs;
    if (c.type === 'media') {
      fileAbs = path.isAbsolute(c.file) ? c.file : path.join(sfxDir, c.file);
      if (!fs.existsSync(fileAbs)) { console.warn(`[mux] media file missing, skipping: ${c.file}`); continue; }
    } else {
      fileAbs = path.join(sfxDir, 'sounds', `${c.sound}.mp3`);
      if (!fs.existsSync(fileAbs)) { console.error(`sound missing: ${c.sound}.mp3 — run generate.mjs first`); process.exit(1); }
    }
    renders.push({ fileAbs, kind: c.type, t: c.t, gainDb: (c.gainDb || 0) + trackGain, trim: c.trim, fadeIn: c.fadeIn, fadeOut: c.fadeOut });
  }
}
if (!renders.length) { console.error('[mux] nothing to mix (all tracks muted/empty?)'); process.exit(1); }

// ── Inputs: [0]=video, then one input per UNIQUE audio file ──────
const inputs = [srcMp4];
const fileInput = new Map(); // fileAbs -> input index
const fileUses = new Map();  // fileAbs -> use count
for (const r of renders) fileUses.set(r.fileAbs, (fileUses.get(r.fileAbs) || 0) + 1);
const fileDur = new Map();   // fileAbs -> duration (media only, lazy)
for (const f of fileUses.keys()) { fileInput.set(f, inputs.length); inputs.push(f); }

// ── Filtergraph: split each file per use, then per-clip trim/fade/gain/delay ──
const lines = [];
const mixIn = [];
const splitPads = new Map(); // fileAbs -> [pad labels]
let fi = 0;
for (const [f, idx] of fileInput) {
  const n = fileUses.get(f);
  const pads = Array.from({ length: n }, (_, k) => `f${fi}_${k}`);
  if (n === 1) lines.push(`[${idx}:a]acopy[${pads[0]}]`);
  else lines.push(`[${idx}:a]asplit=${n}${pads.map((p) => `[${p}]`).join('')}`);
  splitPads.set(f, pads);
  fi++;
}

const nextPad = new Map();
renders.forEach((r, i) => {
  const k = nextPad.get(r.fileAbs) || 0;
  nextPad.set(r.fileAbs, k + 1);
  const src = splitPads.get(r.fileAbs)[k];
  const steps = [];
  if (r.kind === 'sound') {
    // Hard trim with a short auto fade-out tail (preserves legacy behavior).
    if (r.trim) {
      steps.push(`atrim=0:${r.trim}`);
      steps.push(`afade=t=out:st=${Math.max(0, r.trim - 0.15).toFixed(3)}:d=0.15`);
    }
  } else {
    // Media: bound to its own duration, explicit fades.
    if (!fileDur.has(r.fileAbs)) fileDur.set(r.fileAbs, probeDur(r.fileAbs));
    const len = r.trim ? Math.min(r.trim, fileDur.get(r.fileAbs)) : fileDur.get(r.fileAbs);
    steps.push(`atrim=0:${len.toFixed(3)}`);
    if (r.fadeIn) steps.push(`afade=t=in:d=${r.fadeIn}`);
    if (r.fadeOut) steps.push(`afade=t=out:st=${Math.max(0, len - r.fadeOut).toFixed(3)}:d=${r.fadeOut}`);
  }
  steps.push(`volume=${r.gainDb}dB`);
  if (r.t > 0) steps.push(`adelay=${Math.round(r.t * 1000)}:all=1`);
  lines.push(`[${src}]${steps.join(',')}[c${i}]`);
  mixIn.push(`[c${i}]`);
});

// Mix without normalization (gains are authored), limit to prevent clipping,
// pad to exactly the video duration. apad MUST be bounded (whole_dur).
lines.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:duration=longest:normalize=0,alimiter=limit=0.891,apad=whole_dur=${DUR}[aout]`);

// filter_complex_script avoids Windows command-length limits (40+ clips).
const scriptFile = path.join(os.tmpdir(), `sfx-mux-${Date.now()}.txt`);
fs.writeFileSync(scriptFile, lines.join(';\n'));

const args = [
  '-y', '-hide_banner', '-loglevel', 'error',
  ...inputs.flatMap((f) => ['-i', f]),
  '-filter_complex_script', scriptFile,
  '-map', '0:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  outMp4,
];
const sounds = renders.filter((r) => r.kind === 'sound').length;
const media = renders.length - sounds;
console.log(`[mux] ${sounds} sound clips, ${media} media clips, ${fileUses.size} unique files → ${path.relative(process.cwd(), outMp4)}`);
const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
fs.rmSync(scriptFile, { force: true });
if (res.status !== 0) { console.error('[mux] ffmpeg failed'); process.exit(1); }

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outMp4], { encoding: 'utf8' });
console.log(`[mux] done — output duration ${parseFloat(probe.stdout).toFixed(2)}s (video ${DUR}s)`);
