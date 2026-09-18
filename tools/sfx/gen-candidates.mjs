// Reference-copy step 4: generate ElevenLabs candidates whose prompts are
// written FROM the reference measurements (length, attack, brightness,
// tonality, low end), not from a guess.
//
// Usage: node tools/sfx/gen-candidates.mjs --ref <dir> [--per-class 3] [--max 12]
//                                          [--classes boom,pop] [--dry-run]
// Reads:  <dir>/reference-cues.json (+ <dir>/audition-decisions.json if present)
// Writes: tools/sfx/candidates/<ref-id>/<class>-<variant>.mp3 + a .json sidecar
//         (prompt, class, the reference cue it targets, target features).
//         Cached: an existing file is never regenerated. The folder is gitignored
//         (ElevenLabs terms: no redistributing generated sounds as files).
//
// Refuses rejected classes (tick, shimmer, riser, whoosh) and tick-like clicks.
// Prints the account's credit use before and after, so the spend is on record.
import fs from 'fs';
import path from 'path';
import { args, HERE } from './lib-py.mjs';

const a = args();
if (!a.ref) {
  console.error('Usage: node tools/sfx/gen-candidates.mjs --ref <dir> [--per-class N] [--max N] [--classes a,b] [--dry-run]');
  process.exit(1);
}
const REFUSE = new Set(['tick', 'shimmer', 'riser', 'whoosh', 'click']);
const perClass = Number(a['per-class'] || 3);
const max = Number(a.max || 12);
const only = a.classes ? String(a.classes).split(',') : null;
const refId = path.basename(path.resolve(a.ref));
const outDir = path.join(HERE, 'candidates', refId);

const doc = JSON.parse(fs.readFileSync(path.join(a.ref, 'reference-cues.json'), 'utf8'));
const decP = path.join(a.ref, 'audition-decisions.json');
const dec = fs.existsSync(decP) ? JSON.parse(fs.readFileSync(decP, 'utf8')).cues || {} : {};
const cues = doc.cues
  .filter((c) => dec[c.id]?.isSfx === true || (c.likelySfx && dec[c.id]?.isSfx !== false))
  .map((c) => ({ ...c, class: dec[c.id]?.class || c.class }));

const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const byClass = {};
for (const c of cues) (byClass[c.class] ||= []).push(c);

// The class's most typical cue: closest to the class median in log-duration + log-brightness.
function medoid(list) {
  const md = Math.log(median(list.map((c) => c.features.durationMs)));
  const mc = Math.log(median(list.map((c) => c.features.centroidHz)));
  return list.reduce((best, c) => {
    const d = Math.hypot(Math.log(c.features.durationMs) - md, Math.log(c.features.centroidHz) - mc);
    return d < best.d ? { c, d } : best;
  }, { c: null, d: Infinity }).c;
}

// Words follow the measurement, but only where the word fits the class: a chime
// never asks for a low thump, a boom never asks for a pitch.
function describe(f, cls) {
  const ms = Math.round(f.durationMs / 10) * 10;
  const attack = f.attackMs < 20 ? 'an instant attack' : f.attackMs < 80 ? 'a fast attack'
    : f.attackMs < 250 ? 'a rounded, slightly soft attack' : 'a slow swelling attack';
  const tone = f.centroidHz < 400 ? 'deep and sub-heavy' : f.centroidHz < 900 ? 'warm low-mid' : f.centroidHz < 2000 ? 'mid-range'
    : f.centroidHz < 4000 ? 'bright' : 'crisp and very bright';
  const lowOk = ['boom', 'impact', 'hit'].includes(cls);
  const body = lowOk && f.lowRatio > 0.4 ? ', with a solid low-end thump underneath' : '';
  const pitch = ['chime', 'pop'].includes(cls) ? (f.harmonic > 0.55 ? ', tonal with a clear pitch' : ', mostly non-tonal') : '';
  const tail = f.durationMs - f.attackMs < 250 ? 'tight and dry, no reverb, no tail' : 'a short natural decay, dry, no reverb';
  return { ms, text: `about ${ms} milliseconds long, ${attack}, ${tone}${body}${pitch}, ${tail}` };
}

// Three voices per class: plain, a real material doing a real thing (the
// 2026-09-17 ruling's preferred source), and a clean designed UI version.
const VOICES = {
  boom: ['One single low impact hit', 'One heavy hardcover book dropped flat onto a solid wooden table', 'One single clean designed sub impact for a video cut'],
  pop: ['One single soft pop', 'One cork pulled gently from a small glass bottle', 'One single clean UI pop, like a card appearing on screen'],
  hit: ['One single muted percussive hit', 'One knuckle knock on a thick wooden desk', 'One single soft designed UI hit'],
  chime: ['One single short chime', 'One light tap of a spoon on a small ceramic bowl', 'One single clean UI notification ping'],
  impact: ['One single punchy impact hit', 'One firm palm slap on a closed wooden drawer', 'One single clean designed impact for a hard cut'],
};
const TAIL = 'Recorded close, clean, one single sound, no music, no voice, no background noise.';

const jobs = [];
for (const [cls, list] of Object.entries(byClass)) {
  if (only && !only.includes(cls)) continue;
  if (REFUSE.has(cls)) { console.log(`[gen] ${cls}: refused — rejected class (see tools/sfx/CONTEXT.md)`); continue; }
  const voices = VOICES[cls] || VOICES.hit;
  const target = medoid(list);
  const d = describe(target.features, cls);
  for (let v = 0; v < Math.min(perClass, voices.length); v++) {
    const name = `${cls}-${'abc'[v]}`;
    jobs.push({
      name, cls, cue: target.id,
      prompt: `${voices[v]}, ${d.text}. ${TAIL}`,
      duration: Math.min(3, Math.max(0.5, Math.round((d.ms / 1000 + 0.3) * 10) / 10)),
      target: target.features,
    });
  }
}

const env = path.resolve('.env');
if (fs.existsSync(env)) {
  for (const line of fs.readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function credits() {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
    if (!r.ok) return null;
    const j = await r.json();
    return { used: j.character_count, limit: j.character_limit, tier: j.tier };
  } catch { return null; }
}

async function generate(job, attempt = 1) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: job.prompt, duration_seconds: job.duration, prompt_influence: 0.5 }),
  });
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(2000 * attempt); return generate(job, attempt + 1); }
    throw new Error(`HTTP ${res.status} — ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const todo = jobs.filter((j) => !fs.existsSync(path.join(outDir, `${j.name}.mp3`))).slice(0, max);
for (const j of jobs) console.log(`[gen] ${j.name.padEnd(9)} ${j.duration}s  ← ${j.cue}  "${j.prompt}"${todo.includes(j) ? '' : '  (cached)'}`);
if (a['dry-run'] || !todo.length) {
  console.log(`[gen] ${a['dry-run'] ? 'dry run' : 'nothing to do'} — ${todo.length} generation(s) pending, cap ${max}`);
  process.exit(0);
}
if (!KEY) { console.error('[gen] ELEVENLABS_API_KEY not set (.env)'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const before = await credits();
let ok = 0;
for (const j of todo) {
  try {
    const buf = await generate(j);
    fs.writeFileSync(path.join(outDir, `${j.name}.mp3`), buf);
    fs.writeFileSync(path.join(outDir, `${j.name}.json`), JSON.stringify({
      class: j.cls, prompt: j.prompt, durationSeconds: j.duration, promptInfluence: 0.5,
      ref: path.relative(process.cwd(), a.ref).replace(/\\/g, '/'), targetCue: j.cue,
      target: Object.fromEntries(['durationMs', 'attackMs', 'centroidHz', 'lowRatio', 'harmonic', 'flatness'].map((k) => [k, j.target[k]])),
      generatedOn: new Date().toISOString().slice(0, 10), source: 'elevenlabs /v1/sound-generation',
    }, null, 1));
    ok++;
    console.log(`[gen] ${j.name}: ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) { console.error(`[gen] ${j.name}: FAILED — ${e.message}`); }
}
const after = await credits();
const spent = before && after ? after.used - before.used : null;
console.log(`[gen] done: ${ok}/${todo.length} generated → ${path.relative(process.cwd(), outDir)}`
  + (spent !== null ? `  | credits used ${spent} (now ${after.used}/${after.limit}, ${after.tier})` : ''));
