// Shared helpers for the reference-motion-spec scripts.
// Node 18+ and ffmpeg/ffprobe on PATH (or FFMPEG_PATH pointing at the binary or its folder).
// No dependencies. Every output is deterministic for the same input file.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const IS_WIN = process.platform === 'win32';

// ---------- ffmpeg / ffprobe resolution ----------

function exeName(name) {
  return IS_WIN && !name.endsWith('.exe') ? name + '.exe' : name;
}

function resolveBinary(name) {
  const env = process.env.FFMPEG_PATH;
  if (env) {
    const p = path.resolve(env);
    try {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        const cand = path.join(p, exeName(name));
        if (fs.existsSync(cand)) return cand;
      } else if (st.isFile()) {
        // FFMPEG_PATH points at ffmpeg itself; derive the sibling.
        const cand = path.join(path.dirname(p), exeName(name));
        if (fs.existsSync(cand)) return cand;
      }
    } catch { /* fall through to PATH */ }
  }
  return name; // rely on PATH
}

export const FFMPEG = resolveBinary('ffmpeg');
export const FFPROBE = resolveBinary('ffprobe');

export function run(bin, args, { maxBuffer = 64e6, input } = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer, windowsHide: true, input });
  if (r.error) {
    if (r.error.code === 'ENOENT') {
      throw new Error(`${bin} not found. Install ffmpeg and put it on PATH, or set FFMPEG_PATH to the binary or its folder.`);
    }
    throw r.error;
  }
  return r;
}

export function runOrThrow(bin, args, opts) {
  const r = run(bin, args, opts);
  if (r.status !== 0) {
    const tail = (r.stderr || '').split('\n').slice(-25).join('\n');
    throw new Error(`${path.basename(bin)} exited ${r.status}\n${bin} ${args.join(' ')}\n${tail}`);
  }
  return r;
}

export function runBinary(bin, args, { maxBuffer = 256e6 } = {}) {
  // Raw stdout as a Buffer (PCM extraction).
  const r = spawnSync(bin, args, { maxBuffer, windowsHide: true });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${path.basename(bin)} exited ${r.status}: ${(r.stderr || '').toString().split('\n').slice(-10).join('\n')}`);
  return r.stdout;
}

// ---------- probe ----------

export function probe(file) {
  const r = runOrThrow(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]);
  const meta = JSON.parse(r.stdout);
  const video = (meta.streams || []).find(s => s.codec_type === 'video');
  const audio = (meta.streams || []).find(s => s.codec_type === 'audio');
  if (!video) throw new Error('no video stream in ' + file);
  const fps = parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 0;
  const duration = Number(meta.format?.duration ?? video.duration ?? 0);
  return { meta, video, audio, fps, duration, width: Number(video.width), height: Number(video.height) };
}

export function parseRate(s) {
  if (!s || typeof s !== 'string') return 0;
  const [a, b] = s.split('/').map(Number);
  if (!b) return a || 0;
  return a / b;
}

export function aspectLabel(w, h) {
  const g = gcd(w, h);
  const a = w / g, b = h / g;
  const known = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:3': 4 / 3, '3:4': 3 / 4, '4:5': 4 / 5, '21:9': 21 / 9 };
  const ratio = w / h;
  for (const [label, val] of Object.entries(known)) if (Math.abs(ratio - val) < 0.01) return label;
  return `${a}:${b}`;
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// ---------- output layout ----------

export function stemOf(file) {
  return path.basename(file, path.extname(file));
}

// Default output folder: "<stem>-motion-spec" inside the current working directory (the project), never next to the video.
export function outDirFor(file, explicit) {
  if (explicit) return path.resolve(explicit);
  return path.join(process.cwd(), stemOf(file) + '-motion-spec');
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

// Refuse to write into a folder that already holds an analysis (cuts.json / motion-spec.json)
// unless --force: a re-run of probe / sheets would silently change the frames the citations point at.
export function refuseIfAnalysed(dir, force) {
  if (force) return;
  const found = ['cuts.json', 'motion-spec.json'].filter(f => fs.existsSync(path.join(dir, f)));
  if (found.length) {
    console.error('an analysis already exists in ' + dir + ' (' + found.join(', ') + '); pass --force to overwrite it or --out <dir> for a new folder');
    process.exit(1);
  }
}

export function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---------- args ----------

export function parseArgs(argv, spec = {}) {
  // spec: { flag: 'string' | 'number' | 'boolean' | 'list' }
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const kind = spec[key];
      if (!kind) throw new Error('unknown option --' + key);
      if (kind === 'boolean') { out[key] = true; continue; }
      const v = argv[++i];
      if (v === undefined) throw new Error('--' + key + ' needs a value');
      if (kind === 'number') out[key] = Number(v);
      else if (kind === 'list') out[key] = v.split(',').map(s => s.trim()).filter(Boolean);
      else out[key] = v;
    } else out._.push(a);
  }
  return out;
}

// ---------- drawtext font ----------

let fontOptCache;
export function drawtextFontOption() {
  if (fontOptCache !== undefined) return fontOptCache;
  const candidates = [];
  if (process.env.SHEET_FONT) candidates.push(process.env.SHEET_FONT);
  if (IS_WIN) {
    const winDir = process.env.WINDIR || 'C:\\Windows';
    candidates.push(path.join(winDir, 'Fonts', 'arialbd.ttf'), path.join(winDir, 'Fonts', 'segoeuib.ttf'), path.join(winDir, 'Fonts', 'arial.ttf'));
  } else if (process.platform === 'darwin') {
    candidates.push('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc');
  } else {
    candidates.push('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf');
  }
  const found = candidates.find(f => { try { return fs.statSync(f).isFile(); } catch { return false; } });
  if (found) {
    // ffmpeg filter-graph escaping: forward slashes; the drive colon must be escaped.
    const esc = found.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    fontOptCache = `fontfile='${esc}'`;
  } else {
    fontOptCache = 'font=Sans'; // needs fontconfig in the ffmpeg build
  }
  return fontOptCache;
}

// Badge in the lower-right corner of each tile: "#<frame> <t>s".
// frameExpr: an ffmpeg expression for the frame number to print (e.g. 'n+1' or 'n+120+1');
// null prints the time only (used where `n` no longer means the source frame, e.g. after select).
export function badgeFilter({ frameExpr = 'n+1', fontsize = 18, pad = 6 } = {}) {
  const text = frameExpr ? `#%{eif\\:${frameExpr}\\:d} %{pts\\:flt}s` : `%{pts\\:flt}s`;
  return `drawtext=${drawtextFontOption()}:text='${text}':fontsize=${fontsize}:fontcolor=white:x=w-tw-${pad + 2}:y=h-th-${pad + 2}:box=1:boxcolor=black@0.62:boxborderw=${pad}`;
}

export function fmtT(t, digits = 2) {
  return Number(t).toFixed(digits);
}

export function assertFile(file) {
  if (!file) throw new Error('missing <video> argument');
  const p = path.resolve(file);
  if (!fs.existsSync(p)) throw new Error('input not found: ' + p);
  return p;
}
