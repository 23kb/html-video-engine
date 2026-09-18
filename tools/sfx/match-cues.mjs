// Reference-copy step 3: rank candidate sounds against the reference cues.
//
// Usage: node tools/sfx/match-cues.mjs --ref <dir> [--pool <dir>]... [--top 3] [--all] [--self-test]
//   Default pools: tools/sfx/palette, tools/sfx/candidates/<ref-id>, tools/sfx/explore.
//   Ranks by feature distance (duration, attack, brightness, noisiness, crest,
//   low/high energy, tonality, pitch slope + MFCC timbre). Rejected classes
//   (tick, shimmer, riser/whoosh) are never offered as picks.
//   Honours <dir>/audition-decisions.json: cues marked "not SFX" drop out,
//   relabelled classes are used.
// Writes: <dir>/match-report.json
// --self-test adds the reference's own isolated cues as candidates: each cue
// should rank its own clip #1 (sanity check of the measure).
import fs from 'fs';
import path from 'path';
import { args, runSfxref } from './lib-py.mjs';

const a = args();
if (!a.ref) {
  console.error('Usage: node tools/sfx/match-cues.mjs --ref <dir> [--pool <dir>]... [--top N] [--all] [--self-test]');
  process.exit(1);
}
const refId = path.basename(path.resolve(a.ref));
const pools = a.pool ? [].concat(a.pool)
  : ['tools/sfx/palette', path.join('tools/sfx/candidates', refId), 'tools/sfx/explore'].filter((p) => fs.existsSync(p));
const pass = ['match', a.ref, ...pools.flatMap((p) => ['--pool', p])];
if (a.top) pass.push('--top', String(a.top));
if (a.all) pass.push('--all');
if (a['self-test']) pass.push('--self-test');
console.log(`[match] pools: ${pools.join(', ')}`);
runSfxref(pass);
