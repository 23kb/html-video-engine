// Shared ffmpeg-astats probe: measure a file's overall peak/RMS in dB.
// Used by generate.mjs (near-silent detection) and normalize.mjs (gain math).
import { spawnSync } from 'child_process';

// Returns { peakDb, rmsDb } (numbers, dBFS) or throws if ffmpeg fails.
// astats prints per-channel then "Overall" — last occurrence wins.
export function probeAstats(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (r.stderr || '') + (r.stdout || '');
  const last = (re) => { let m, v = null; const g = new RegExp(re, 'g'); while ((m = g.exec(out))) v = m[1] === '-inf' ? -Infinity : parseFloat(m[1]); return v; };
  const peakDb = last('Peak level dB:\\s*(-?[\\d.]+|-inf)');
  const rmsDb = last('RMS level dB:\\s*(-?[\\d.]+|-inf)');
  if (peakDb === null || rmsDb === null) throw new Error(`astats probe failed for ${file}`);
  return { peakDb, rmsDb };
}
