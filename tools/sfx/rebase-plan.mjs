// Re-time a video's sfx plan after a re-render. Event timestamps in
// plan.json are global MP4 times built from per-scene clip offsets; when
// clips are re-rendered their durations shift by a frame or two, so every
// downstream scene's events must slide. This probes the fresh clips,
// recomputes offsets, and rebases plan.json + scenes.json in place.
//
// Usage: node tools/sfx/rebase-plan.mjs --video <slug> --clips <dir> [--xfade <s>]
//   --xfade: cross-dissolve overlap per boundary when the final MP4 was
//   stitched with ffmpeg xfade (each scene k starts k*xfade earlier than
//   a hard concat would place it).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const video = arg('--video');
const clipsDir = arg('--clips');
const xfade = parseFloat(arg('--xfade') || '0');
if (!video || !clipsDir) { console.error('Usage: node tools/sfx/rebase-plan.mjs --video <slug> --clips <dir> [--xfade <s>]'); process.exit(1); }

const sfxDir = path.resolve('videos', video, 'sfx');
const scenes = JSON.parse(fs.readFileSync(path.join(sfxDir, 'scenes.json'), 'utf8'));
const planPath = path.join(sfxDir, 'plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

const probe = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!Number.isFinite(d)) throw new Error('ffprobe failed for ' + f);
  return d;
};

// New offsets from the fresh clips, in scenes.json order. With --xfade,
// each boundary overlaps by that much (ffmpeg xfade stitch).
let acc = 0;
const updated = scenes.map((s, i) => {
  const dur = probe(path.join(clipsDir, s.slug + '.mp4'));
  if (i > 0) acc -= xfade;
  const out = { ...s, oldOffset: s.offset, offset: Math.round(acc * 1e6) / 1e6, dur: Math.round(dur * 1e6) / 1e6 };
  acc += dur;
  return out;
});
const newDuration = Math.round(acc * 1e3) / 1e3;

// Map each event to its scene via the OLD offsets, then slide it.
const sceneFor = (t) => {
  let j = updated.length - 1;
  while (j > 0 && t < updated[j].oldOffset - 0.001) j--;
  return updated[j];
};
// Only sound clips are scene-anchored; media clips (music/VO/ambience) are
// not, so they are left in place.
let moved = 0, total = 0;
for (const tr of plan.tracks || []) {
  for (const c of tr.clips || []) {
    if (c.type !== 'sound') continue;
    total++;
    const s = sceneFor(c.t);
    const nt = Math.round((c.t - s.oldOffset + s.offset) * 1000) / 1000;
    if (nt !== c.t) moved++;
    c.t = nt;
  }
}
plan.duration = newDuration;

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
fs.writeFileSync(path.join(sfxDir, 'scenes.json'),
  JSON.stringify(updated.map(({ oldOffset, ...s }) => s), null, 1));

updated.forEach((s) => console.log(`[rebase] ${s.slug}: offset ${s.oldOffset.toFixed(3)} → ${s.offset.toFixed(3)} (dur ${s.dur.toFixed(3)})`));
console.log(`[rebase] ${moved}/${total} sound clips re-timed, total duration ${newDuration}s`);
