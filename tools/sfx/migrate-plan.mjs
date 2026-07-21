// One-shot migration: flat plan.json (sounds + events + music) → multitrack
// schema (sounds library + tracks[] of typed clips). Idempotent: skips a plan
// that already has tracks. Backs the original up to <plan>.legacy.json first.
//
// Usage: node tools/sfx/migrate-plan.mjs --plan <path>   (repeat per plan file)
//
// New schema:
//   {
//     video, mp4, out, duration,
//     sounds: { <name>: { prompt, duration, promptInfluence } },  // SFX library (generation)
//     music:  { file, prompt, lengthMs },                         // music GENERATION spec only
//     tracks: [
//       { id, name, kind: "sfx"|"music"|"vo"|"ambience", gainDb, muted, solo, clips: [
//           { type:"sound", sound:<name>, t, gainDb, trim?, label?, muted? },   // SFX placement
//           { type:"media", file:<rel-to-sfxDir>, t, trim?, gainDb, fadeIn?, fadeOut?, label?, muted? }
//       ]}
//     ]
//   }
import fs from 'fs';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const planPath = arg('--plan');
if (!planPath) { console.error('Usage: node tools/sfx/migrate-plan.mjs --plan <path>'); process.exit(1); }
if (!fs.existsSync(planPath)) { console.error('plan not found: ' + planPath); process.exit(1); }

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (Array.isArray(plan.tracks)) { console.log('[migrate] already multitrack — nothing to do: ' + planPath); process.exit(0); }

const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const tracks = [];

// Music bed → a Media clip on a Music track. plan.music keeps generation-only fields.
if (plan.music) {
  const m = plan.music;
  tracks.push({
    id: 'music', name: 'Music', kind: 'music',
    gainDb: 0, muted: !!m.muted, solo: false,
    clips: [strip({
      type: 'media',
      file: m.file || 'music.mp3',
      t: 0,
      trim: plan.duration,
      gainDb: m.gainDb ?? 0,
      fadeIn: m.fadeIn,
      fadeOut: m.fadeOut,
      label: 'music bed',
    })],
  });
}

// SFX events → Sound clips on a single SFX track.
tracks.push({
  id: 'sfx', name: 'SFX', kind: 'sfx',
  gainDb: 0, muted: false, solo: false,
  clips: (plan.events || []).map((e) => strip({
    type: 'sound',
    sound: e.sound,
    t: e.t,
    gainDb: e.gainDb ?? 0,
    trim: e.trim,
    label: e.label,
    muted: e.muted,
  })),
});

const next = strip({
  video: plan.video,
  mp4: plan.mp4,
  out: plan.out,
  duration: plan.duration,
  sounds: plan.sounds,
  music: plan.music ? strip({ file: plan.music.file || 'music.mp3', prompt: plan.music.prompt, lengthMs: plan.music.lengthMs }) : undefined,
  tracks,
});

const backup = planPath.replace(/\.json$/, '.legacy.json');
if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(plan, null, 2));
fs.writeFileSync(planPath, JSON.stringify(next, null, 2));

const sfxClips = tracks.find((t) => t.kind === 'sfx')?.clips.length || 0;
console.log(`[migrate] ${planPath}: ${tracks.length} tracks, ${sfxClips} sound clips${plan.music ? ', music bed' : ''} (backup → ${backup})`);
