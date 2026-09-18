#!/usr/bin/env node
// audio.mjs <video> [--out <dir>] [--onset-db 6] [--silence-db -50]
//
// Writes <out>/audio.json: ebur128 (integrated LUFS, LRA, true peak), silence intervals,
// RMS per duration decile, onsets (energy rises on a 10 ms hop), program end.
// Everything is measured on the MIXED program. No stems, no ducking proof, no SFX count.

import path from 'node:path';
import { FFMPEG, probe, outDirFor, ensureDir, writeJson, parseArgs, run, runBinary, assertFile } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { out: 'string', 'onset-db': 'number', 'silence-db': 'number' });
const file = assertFile(args._[0]);
const outDir = ensureDir(outDirFor(file, args.out));
const p = probe(file);

const out = {
  source: path.basename(file),
  present: Boolean(p.audio),
  method: 'ffmpeg ebur128=peak=true; silencedetect; mono 16 kHz PCM for RMS deciles and onsets. Mixed program only.',
  limits: 'No stem separation. Integrated loudness does not reveal music/voice balance. A music transient is not a click sound. Onsets are energy rises, not identified events.',
};

if (!p.audio) {
  out.note = 'No audio stream.';
  writeJson(path.join(outDir, 'audio.json'), out);
  console.log(`${out.source}: NO AUDIO`);
  process.exit(0);
}

out.codec = p.audio.codec_name;
out.channels = Number(p.audio.channels);
out.sample_rate = Number(p.audio.sample_rate);

// ---- loudness + silence ----
const silenceDb = Number.isFinite(args['silence-db']) ? args['silence-db'] : -50;
const scan = run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `ebur128=peak=true,silencedetect=noise=${silenceDb}dB:d=0.3`, '-f', 'null', '-'], { maxBuffer: 64e6 });
if (scan.status !== 0) throw new Error('audio scan failed: ' + scan.stderr.split('\n').slice(-10).join('\n'));
const summary = scan.stderr.slice(scan.stderr.lastIndexOf('Summary:'));
out.integrated_lufs = num(summary.match(/I:\s*([-\d.]+) LUFS/)?.[1]);
out.lra_lu = num(summary.match(/LRA:\s*([-\d.]+) LU/)?.[1]);
out.true_peak_dbtp = num(summary.match(/Peak:\s*([-\d.]+) dBFS/)?.[1]);
out.silence_threshold_db = silenceDb;
const sil = [];
let cur = null;
for (const m of scan.stderr.matchAll(/silence_(start|end):\s*([-\d.]+)/g)) {
  if (m[1] === 'start') cur = { start: round(Number(m[2]), 3) };
  else if (cur) { cur.end = round(Number(m[2]), 3); cur.duration = round(cur.end - cur.start, 3); sil.push(cur); cur = null; }
}
if (cur) { cur.end = round(p.duration, 3); cur.duration = round(cur.end - cur.start, 3); sil.push(cur); }
out.silence = sil;

// ---- PCM: deciles, onsets, program end ----
const SR = 16000;
const pcm = runBinary(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1']);
const n = Math.floor(pcm.length / 4);
const samples = new Float32Array(n);
for (let i = 0; i < n; i++) samples[i] = pcm.readFloatLE(i * 4);

// deciles
const D = 10, sum = new Array(D).fill(0), cnt = new Array(D).fill(0);
for (let i = 0; i < n; i++) { const b = Math.min(D - 1, Math.floor(i / n * D)); sum[b] += samples[i] * samples[i]; cnt[b]++; }
out.rms_dbfs_by_decile = sum.map((s, i) => round(10 * Math.log10(s / (cnt[i] || 1) || 1e-12), 1));
out.energy_arc = describeArc(out.rms_dbfs_by_decile);

// envelope: 20 ms window, 10 ms hop
const hop = SR / 100, win = SR / 50;
const frames = Math.max(0, Math.floor((n - win) / hop) + 1);
const env = new Float64Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0; const o = f * hop;
  for (let i = 0; i < win; i++) s += samples[o + i] * samples[o + i];
  env[f] = 10 * Math.log10(s / win || 1e-12);
}
// onsets: rise of >= onsetDb over 30 ms, level above -45 dBFS, local max of the rise, >= 80 ms apart
const onsetDb = Number.isFinite(args['onset-db']) ? args['onset-db'] : 6;
const onsets = [];
let lastT = -1;
for (let f = 3; f < frames; f++) {
  const rise = env[f] - Math.max(env[f - 3], -80); // -80 dBFS floor: a rise out of digital silence is capped, not infinite
  if (rise < onsetDb || env[f] < -45) continue;
  let isPeak = true;
  for (let k = Math.max(3, f - 4); k <= Math.min(frames - 1, f + 4); k++) { if (k !== f && (env[k] - Math.max(env[k - 3], -80)) > rise) { isPeak = false; break; } }
  if (!isPeak) continue;
  const t = f * hop / SR;
  if (t - lastT < 0.08) continue;
  lastT = t;
  onsets.push({ t: round(t, 3), level_db: round(env[f], 1), rise_db: round(rise, 1) });
}
out.onsets = onsets;
out.onset_rate_per_s = round(onsets.length / (p.duration || 1), 3);
out.chance_hit_per_seam = round(Math.min(1, out.onset_rate_per_s * 0.12), 3);
out.chance_note = 'chance_hit_per_seam = min(1, onset_rate_per_s x 0.12 s): the probability a random seam lands within +-60 ms of an onset. pacing.seams_on_onsets is judged against that chance level (N of M seams on hits vs chance_hit_per_seam x M).';
out.onset_method = `energy rise >= ${onsetDb} dB over 30 ms on a 20 ms window / 10 ms hop, level > -45 dBFS, local maximum, >= 80 ms apart. A cue for "does the seam land on a hit"; not an event classifier.`;

// program end: last 10 ms frame above -60 dBFS
let endF = frames - 1;
while (endF > 0 && env[endF] < -60) endF--;
out.program_end = round((endF * hop + win) / SR, 3);
out.tail_silence = round(Math.max(0, p.duration - out.program_end), 3);
out.ending = out.tail_silence > 0.5 ? `sound ends ${out.tail_silence} s before the picture` : (out.rms_dbfs_by_decile[9] < out.rms_dbfs_by_decile[8] - 6 ? 'fade / drop in the last decile' : 'sound runs to the end');

writeJson(path.join(outDir, 'audio.json'), out);
console.log(`${out.source}: I=${out.integrated_lufs} LUFS  LRA=${out.lra_lu} LU  peak=${out.true_peak_dbtp} dBTP  onsets=${onsets.length} (${out.onset_rate_per_s}/s, chance hit per seam ${out.chance_hit_per_seam})  silences=${sil.length}  program_end=${out.program_end}s`);
console.log('wrote ' + path.join(outDir, 'audio.json'));

function num(x) { return x === undefined ? null : Number(x); }
function round(x, d) { const k = 10 ** d; return Math.round(x * k) / k; }
function describeArc(d) {
  const first = avg(d.slice(0, 3)), mid = avg(d.slice(3, 7)), last = avg(d.slice(7));
  const parts = [];
  if (mid - first > 3) parts.push('rises into the middle'); else if (first - mid > 3) parts.push('drops after the opening'); else parts.push('flat opening to middle');
  if (last - mid > 3) parts.push('builds to the end'); else if (mid - last > 3) parts.push('falls toward the end'); else parts.push('holds to the end');
  const minI = d.indexOf(Math.min(...d)); if (d[minI] < avg(d) - 8) parts.push(`dip at decile ${minI + 1}`);
  return parts.join('; ');
}
function avg(a) { return a.reduce((s, x) => s + x, 0) / (a.length || 1); }
