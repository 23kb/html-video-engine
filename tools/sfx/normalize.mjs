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
//   node tools/sfx/normalize.mjs --video <slug> --from-reference <ref>/reference-cues.json [--write] [--only ...]
//       Reference-copy levels (2026-09-18): set each SOUND clip's gain so the
//       energy it adds over the film's own backdrop (music/VO/ambience at that
//       moment) matches the reference's median for the same class — the ratio,
//       not a flat peak. Honours <ref>/audition-decisions.json. A cue that
//       lands on a silent backdrop, or whose change is over 10 dB (pass
//       --allow-large to apply), is reported and left for the ear.
import fs from 'fs';
import path from 'path';
import { probeAstats } from './lib-astats.mjs';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const video = arg('--video');
const write = argv.includes('--write');
const targetPeak = arg('--target-peak') ? Number(arg('--target-peak')) : null;
const only = arg('--only') ? arg('--only').split(',').map((s) => s.trim()) : null;
const fromRef = arg('--from-reference');
if (!video || (write && !fromRef && !Number.isFinite(targetPeak))) {
  console.error('Usage: node tools/sfx/normalize.mjs --video <slug> [--plan <path>] [--write --target-peak <dB> | --from-reference <reference-cues.json> [--write]] [--only name,name]');
  process.exit(1);
}

const sfxDir = path.resolve('videos', video, 'sfx');
const planPath = arg('--plan') || path.join(sfxDir, 'plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.tracks)) {
  console.error('[normalize] plan has no tracks[] — run: node tools/sfx/migrate-plan.mjs --plan ' + planPath);
  process.exit(1);
}

if (fromRef) {
  const { sfxrefJson } = await import('./lib-py.mjs');
  const refDoc = JSON.parse(fs.readFileSync(fromRef, 'utf8'));
  const decP = path.join(path.dirname(fromRef), 'audition-decisions.json');
  const dec = fs.existsSync(decP) ? JSON.parse(fs.readFileSync(decP, 'utf8')).cues || {} : {};
  const REFUSED = new Set(['tick', 'shimmer', 'riser', 'whoosh', 'click']);
  const refCues = refDoc.cues
    .filter((c) => dec[c.id]?.isSfx === true || (c.likelySfx && dec[c.id]?.isSfx !== false))
    .map((c) => ({ ...c, class: dec[c.id]?.class || c.class }))
    .filter((c) => !REFUSED.has(c.class) && c.excessOverBedDb != null);
  const median = (xs) => { const s = [...xs].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  // Our plan classes → the reference classes that carry the same job.
  const ALIAS = { impact: ['impact', 'hit'], hit: ['hit', 'impact'], material: ['hit', 'pop', 'impact'], boom: ['boom'], pop: ['pop'], chime: ['chime'] };
  const target = (cls) => {
    const keys = ALIAS[cls] || [cls];
    const xs = refCues.filter((c) => keys.includes(c.class)).map((c) => c.excessOverBedDb);
    if (xs.length) return { db: median(xs), n: xs.length, from: keys.join('+') };
    return { db: median(refCues.map((c) => c.excessOverBedDb)), n: refCues.length, from: 'all classes' };
  };
  const lv = sfxrefJson(['plan-levels', planPath]);
  const rows = [];
  let changed = 0;
  for (const tr of plan.tracks) {
    for (const c of tr.clips || []) {
      if (c.type !== 'sound' || (only && !only.includes(c.sound))) continue;
      const m = lv.clips.find((r) => r.sound === c.sound && Math.abs(r.t - c.t) < 1e-6);
      const cls = plan.sounds?.[c.sound]?.class || 'impact';
      const tg = target(cls);
      const cur = m?.excessOverBedDb;
      const old = c.gainDb || 0;
      let next = old, note = '';
      if (m?.missing) note = 'sound file missing';
      else if (cur == null) note = 'backdrop silent here — set by ear';
      else if (Math.abs(tg.db - cur) > 10 && !argv.includes('--allow-large')) note = 'change > 10 dB — not written; check by ear (--allow-large)';
      else next = Math.round((old + (tg.db - cur)) * 10) / 10;
      if (write && next !== old) { c.gainDb = next; changed++; }
      rows.push([c.sound, c.t.toFixed(2), cls, cur == null ? '—' : cur.toFixed(1), `${tg.db.toFixed(1)} (${tg.from}, n=${tg.n})`,
        cur == null ? '' : (tg.db - cur).toFixed(1), String(old), String(next), note]);
    }
  }
  const head = ['clip', 't', 'class', 'addsNow', 'refTarget', 'delta', 'gainDb', '→ new', 'note'];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (vals) => vals.map((v, i) => v.padEnd(w[i])).join('  ');
  console.log(line(head)); console.log(line(w.map((n) => '-'.repeat(n))));
  for (const r of rows) console.log(line(r));
  console.log('\naddsNow / refTarget = dB of energy the cue adds over the backdrop during the cue (same measure on both sides).');
  if (write) {
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
    console.log(`[normalize] wrote ${changed} gainDb value(s) → ${path.relative(process.cwd(), planPath)} (reference ${path.relative(process.cwd(), fromRef)})`);
  } else console.log('[normalize] report only — add --write to set the gains.');
  process.exit(0);
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
