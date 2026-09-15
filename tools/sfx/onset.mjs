#!/usr/bin/env node
// Onset probe: how much silence is baked into the head of an SFX file.
//
// Onset = time of the first sample above N% of the file's own peak (default
// 5%). This is the selection criterion for click/type SFX — a click with
// 158ms of head silence fires ~5 frames late at 30fps no matter how well
// the cue is placed. ffmpeg's silencedetect is useless here (2s minimum
// window, reports "no leading silence" on all of these).
//
// Usage:
//   node tools/sfx/onset.mjs <file.mp3> [more files...]
//   node tools/sfx/onset.mjs <dir>            # probes every audio file in it
//   node tools/sfx/onset.mjs <file> --pct 5 --fps 30
//
// Verdicts are frame-budget at --fps (default 30, our render rate):
//   clean  <= 5ms      use as-is
//   ok     <= half a frame
//   LATE   <= 1 frame  trim before use (suggested -ss printed)
//   REJECT >  1 frame  trim past the onset or pick another file
//
// Beds (typing, ambience, music) have no sharp transient — do NOT judge a
// bed by onset; check it by energy window (RMS inside vs outside its
// placement). Adopted 2026-08-08 (round-2 T2).

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const SR = 48000;

function parseArgs(argv) {
  const args = { inputs: [], pct: 5, fps: 30 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pct') args.pct = Number(argv[++i]);
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '-h' || a === '--help') { usage(); process.exit(0); }
    else args.inputs.push(a);
  }
  if (!args.inputs.length) { usage(); process.exit(1); }
  return args;
}

function usage() {
  console.error('Usage: node tools/sfx/onset.mjs <file|dir> [more...] [--pct 5] [--fps 30]');
}

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    if (!fs.existsSync(input)) { console.error(`skip (not found): ${input}`); continue; }
    if (fs.statSync(input).isDirectory()) {
      for (const e of fs.readdirSync(input)) {
        if (AUDIO_EXT.has(path.extname(e).toLowerCase())) files.push(path.join(input, e));
      }
    } else files.push(input);
  }
  return files;
}

// Decode to mono s16 PCM at 48k and return the sample buffer.
function decode(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file,
    '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'],
    { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed for ${file}: ${(r.stderr || '').toString().slice(-200)}`);
  return new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
}

function measureOnset(samples, pct) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  if (peak === 0) return { onsetMs: null, peak: 0 };
  const gate = peak * (pct / 100);
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > gate) return { onsetMs: (i / SR) * 1000, peak };
  }
  return { onsetMs: null, peak };
}

function verdict(onsetMs, fps) {
  const frame = 1000 / fps;
  if (onsetMs <= 5) return 'clean';
  if (onsetMs <= frame / 2) return 'ok';
  if (onsetMs <= frame) return 'LATE — trim';
  return `REJECT (${(onsetMs / frame).toFixed(1)} frames late) — trim past onset or pick another`;
}

function main() {
  const args = parseArgs(process.argv);
  const files = collectFiles(args.inputs);
  if (!files.length) { console.error('no audio files found'); process.exit(1); }
  console.log(`onset probe: first sample > ${args.pct}% of peak, frame budget @ ${args.fps}fps\n`);
  console.log('  onset      verdict                     file');
  for (const f of files) {
    let line;
    try {
      const { onsetMs, peak } = measureOnset(decode(f), args.pct);
      if (peak === 0) line = `  silent     n/a                         ${f}`;
      else {
        const v = verdict(onsetMs, args.fps);
        const trim = onsetMs > 5 ? `   (trim: -ss ${(Math.max(0, onsetMs - 1) / 1000).toFixed(4)})` : '';
        line = `  ${onsetMs.toFixed(1).padStart(7)}ms  ${v.padEnd(26)}  ${f}${trim}`;
      }
    } catch (e) {
      line = `  ERROR      ${e.message.slice(0, 60)}  ${f}`;
    }
    console.log(line);
  }
}

main();
