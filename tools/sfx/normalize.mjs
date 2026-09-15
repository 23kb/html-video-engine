// SFX pipeline helper: measure every plan.json clip's source levels and show
// (or set) the gains needed to land target mix levels. Replaces the manual
// per-source `ffmpeg astats` + hand-written gainDb loop
// (system-fixes plan 2026-07-15 #4, tooling TODO #3).
//
// Usage:
//   node tools/sfx/normalize.mjs --video <slug> [--plan <path>]
//       Report only: per-clip table of source peak/RMS, track+clip gain, and
//       resulting mix peak (sourcePeak + clipGain + trackGain). No writes.
//   node tools/sfx/normalize.mjs --video <slug> --write --target-peak <dB> [--only name,name]
//       Set each clip's gainDb so its mix peak lands at target
//       (gainDb = target − sourcePeak − trackGain), then write plan.json back.
//       Blunt on purpose — nudge the few that want to sit louder/quieter after.
//       --only scopes by sound name (sound clips) or file basename (media clips).
import fs from 'fs';
import path from 'path';
import { probeAstats } from './lib-astats.mjs';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const video = arg('--video');
const write = argv.includes('--write');
const targetPeak = arg('--target-peak') ? Number(arg('--target-peak')) : null;
const only = arg('--only') ? arg('--only').split(',').map((s) => s.trim()) : null;
if (!video || (write && !Number.isFinite(targetPeak))) {
  console.error('Usage: node tools/sfx/normalize.mjs --video <slug> [--plan <path>] [--write --target-peak <dB>] [--only name,name]');
  process.exit(1);
}

const sfxDir = path.resolve('videos', video, 'sfx');
const planPath = arg('--plan') || path.join(sfxDir, 'plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.tracks)) {
  console.error('[normalize] plan has no tracks[] — run: node tools/sfx/migrate-plan.mjs --plan ' + planPath);
  process.exit(1);
}

// Clip identity for --only and the table: sound name, or media file basename.
const clipName = (c) => c.type === 'media' ? path.basename(c.file, path.extname(c.file)) : c.sound;
// Same file resolution as mux.mjs.
const clipFile = (c) => c.type === 'media'
  ? (path.isAbsolute(c.file) ? c.file : path.join(sfxDir, c.file))
  : path.join(sfxDir, 'sounds', `${c.sound}.mp3`);

const levelCache = new Map(); // fileAbs -> {peakDb, rmsDb} | null (missing/unprobeable)
const levels = (f) => {
  if (!levelCache.has(f)) {
    try { levelCache.set(f, fs.existsSync(f) ? probeAstats(f) : null); }
    catch { levelCache.set(f, null); }
  }
  return levelCache.get(f);
};

const rows = [];
let changed = 0;
for (const tr of plan.tracks) {
  const trackGain = tr.gainDb || 0;
  for (const c of tr.clips || []) {
    const name = clipName(c);
    const inScope = !only || only.includes(name);
    const lv = levels(clipFile(c));
    const clipGain = c.gainDb || 0;
    if (write && inScope && lv) {
      const next = Math.round((targetPeak - lv.peakDb - trackGain) * 10) / 10;
      if (next !== clipGain) { c.gainDb = next; changed++; }
    }
    const gain = write && inScope && lv ? c.gainDb : clipGain;
    rows.push({
      track: tr.name || '', name, t: c.t.toFixed(2),
      peak: lv ? lv.peakDb.toFixed(1) : 'MISSING',
      rms: lv ? lv.rmsDb.toFixed(1) : '',
      trackGain: trackGain ? String(trackGain) : '0',
      gainDb: String(gain),
      mixPeak: lv ? (lv.peakDb + gain + trackGain).toFixed(1) : '',
      flags: [c.muted && 'muted', tr.muted && 'trackMuted', only && !inScope && 'skipped'].filter(Boolean).join(','),
    });
  }
}

const cols = [
  ['track', 'track'], ['name', 'clip'], ['t', 't'], ['peak', 'srcPeak'], ['rms', 'srcRMS'],
  ['trackGain', 'trkGain'], ['gainDb', 'gainDb'], ['mixPeak', 'mixPeak'], ['flags', 'flags'],
];
const widths = cols.map(([k, h]) => Math.max(h.length, ...rows.map((r) => r[k].length)));
const line = (vals) => vals.map((v, i) => v.padEnd(widths[i])).join('  ');
console.log(line(cols.map(([, h]) => h)));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const r of rows) console.log(line(cols.map(([k]) => r[k])));

if (write) {
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
  console.log(`\n[normalize] wrote ${changed} gainDb value(s) → ${path.relative(process.cwd(), planPath)} (target peak ${targetPeak} dB)`);
} else {
  console.log(`\n[normalize] report only — ${rows.length} clips, ${levelCache.size} unique sources. Use --write --target-peak <dB> to set gains.`);
}
