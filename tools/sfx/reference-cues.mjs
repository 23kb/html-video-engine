// Reference-copy step 2: find the SFX hits in a split reference and measure them.
//
// Usage: node tools/sfx/reference-cues.mjs --ref <dir> [--min-excess 6] [--other-z 2.5]
//                                          [--min-score 0.9] [--scene 0.25]
// Reads:  <dir>/audio.wav, <dir>/stems/*.wav, <dir>/source.mp4 (visual cuts + frames)
// Writes: <dir>/reference-cues.json — per cue: time, class guess, rejected-class
//         flag, likelySfx score, level vs the bed and vs program loudness,
//         features — plus <dir>/cues/cue-NN-{mix,iso,bed}.wav and cue-NN.jpg.
//
// Detection is a heuristic (demucs splits music stems, not SFX from music).
// Every cue gets confirmed by ear on the audition page (audition.mjs).
import { args, runSfxref } from './lib-py.mjs';

const a = args();
if (!a.ref) {
  console.error('Usage: node tools/sfx/reference-cues.mjs --ref <dir> [--min-excess dB] [--other-z x] [--min-score x] [--scene x]');
  process.exit(1);
}
const pass = [];
for (const k of ['min-excess', 'other-z', 'min-score', 'scene']) if (a[k] !== undefined) pass.push(`--${k}`, String(a[k]));
runSfxref(['cues', a.ref, ...pass]);
