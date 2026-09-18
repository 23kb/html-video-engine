#!/usr/bin/env node
// probe.mjs <video> [--out <dir>] [--black-min 0.1] [--force]
// Writes <out>/meta.json: duration, source fps, size, aspect, audio present,
// black head / tail (ffmpeg blackdetect). frames_24 = nb_frames for a 24 fps source (within
// 0.01 fps), else floor(duration * 24). Refuses to write into a folder that already holds
// cuts.json / motion-spec.json unless --force. Deterministic. No network.

import path from 'node:path';
import { FFMPEG, probe, aspectLabel, outDirFor, ensureDir, writeJson, parseArgs, runOrThrow, assertFile, refuseIfAnalysed } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { out: 'string', 'black-min': 'number', force: 'boolean' });
const file = assertFile(args._[0]);
const outDir = ensureDir(outDirFor(file, args.out));
refuseIfAnalysed(outDir, args.force);

const p = probe(file);
const blackMin = Number.isFinite(args['black-min']) ? args['black-min'] : 0.1;

// blackdetect: intervals darker than pix_th for at least d seconds.
const bd = runOrThrow(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-an', '-vf', `blackdetect=d=${blackMin}:pix_th=0.10`, '-f', 'null', '-']);
const blacks = [...bd.stderr.matchAll(/black_start:\s*([\d.]+)\s+black_end:\s*([\d.]+)\s+black_duration:\s*([\d.]+)/g)]
  .map(m => ({ start: Number(m[1]), end: Number(m[2]), duration: Number(m[3]) }));

const head = blacks.find(b => b.start <= 0.05);
const tail = blacks.find(b => b.end >= p.duration - 0.08);

const meta = {
  source: path.basename(file),
  duration: round(p.duration, 3),
  fps: round(p.fps, 3),
  fps_raw: p.video.avg_frame_rate,
  nb_frames: p.video.nb_frames ? Number(p.video.nb_frames) : null,
  // a 24 fps source has exactly nb_frames frames on the 24 fps grid; anything else is resampled
  frames_24: (Math.abs(p.fps - 24) < 0.01 && Number(p.video.nb_frames) > 0) ? Number(p.video.nb_frames) : Math.floor(p.duration * 24 + 1e-6),
  sample_fps: 24,
  width: p.width,
  height: p.height,
  aspect: aspectLabel(p.width, p.height),
  audio: Boolean(p.audio),
  audio_codec: p.audio ? p.audio.codec_name : null,
  audio_channels: p.audio ? Number(p.audio.channels) : null,
  audio_sample_rate: p.audio ? Number(p.audio.sample_rate) : null,
  black_head: head ? round(head.end, 3) : 0,
  black_tail: tail ? round(p.duration - tail.start, 3) : 0,
  black_intervals: blacks.map(b => ({ start: round(b.start, 3), end: round(b.end, 3) })),
  time_precision: '24 fps resample; every time in this analysis is approximate within 1/24 s (0.0417 s). Nothing here is a recovered keyframe or a source ease.',
  notes: [
    head ? `Black head ${round(head.end, 2)} s: the film starts at the first non-black frame.` : null,
    tail ? `Black tail ${round(p.duration - tail.start, 2)} s: an export artefact, not an ending. The ending is the last non-black composition.` : null,
    p.fps && Math.abs(p.fps - 24) > 0.5 ? `Source is ${round(p.fps, 2)} fps; the 24 fps sheets repeat or drop source frames. Frame counts are on the 24 fps grid.` : null,
  ].filter(Boolean),
};

writeJson(path.join(outDir, 'meta.json'), meta);
console.log(`${meta.source}: ${meta.duration}s ${meta.width}x${meta.height} ${meta.aspect} ${meta.fps}fps audio=${meta.audio} black_head=${meta.black_head} black_tail=${meta.black_tail}`);
console.log('wrote ' + path.join(outDir, 'meta.json'));

function round(x, d) { const k = 10 ** d; return Math.round(Number(x) * k) / k; }
