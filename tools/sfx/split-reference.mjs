// Reference-copy step 1: split a reference clip's audio into stems (demucs htdemucs).
//
// Usage: node tools/sfx/split-reference.mjs --ref <dir> [--from <clip.mp4>]
//   <dir> lives under tools/sfx/refs/ (gitignored). --from copies the
//   clip in as <dir>/source.mp4 first. Writes <dir>/audio.wav, <dir>/stems/
//   {vocals,drums,bass,other,novocals,bed}.wav and <dir>/stems.json (LUFS per stem).
//
// The reference is another brand's audio: measurement only, never shipped.
// Recipe + rules: tools/sfx/CONTEXT.md § "Reference-copy recipe".
import fs from 'fs';
import path from 'path';
import { args, runSfxref } from './lib-py.mjs';

const a = args();
if (!a.ref) {
  console.error('Usage: node tools/sfx/split-reference.mjs --ref <tools/sfx/refs/<id>> [--from <clip.mp4>]');
  process.exit(1);
}
fs.mkdirSync(a.ref, { recursive: true });
if (a.from) {
  const dest = path.join(a.ref, 'source.mp4');
  if (!fs.existsSync(dest)) fs.copyFileSync(a.from, dest);
}
runSfxref(['split', a.ref]);
