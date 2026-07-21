// SFX pipeline step 2: generate the sounds in a video's sfx/plan.json via
// the ElevenLabs APIs and cache them to disk. Cached files are NEVER
// regenerated (determinism + cost) unless --force <name|music|all>.
//
// Usage: node tools/sfx/generate.mjs --video <slug> [--plan <file>] [--force <name>|all] [--dry-run]
// Reads:  videos/<slug>/sfx/plan.json (or --plan), .env (ELEVENLABS_API_KEY)
// Writes: videos/<slug>/sfx/sounds/<name>.mp3, videos/<slug>/sfx/<music file>
import fs from 'fs';
import path from 'path';
import { probeAstats } from './lib-astats.mjs';

const argv = process.argv.slice(2);
const arg = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const video = arg('--video');
const force = arg('--force');
const dryRun = argv.includes('--dry-run');
if (!video) { console.error('Usage: node tools/sfx/generate.mjs --video <slug> [--force <name>|all] [--dry-run]'); process.exit(1); }

// Minimal .env loader — no dotenv dependency.
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY && !dryRun) { console.error('ELEVENLABS_API_KEY not set (checked env + .env)'); process.exit(1); }

const sfxDir = path.resolve('videos', video, 'sfx');
const plan = JSON.parse(fs.readFileSync(arg('--plan') || path.join(sfxDir, 'plan.json'), 'utf8'));
const soundsDir = path.join(sfxDir, 'sounds');
fs.mkdirSync(soundsDir, { recursive: true });

const OUT_FMT = 'mp3_44100_128';

// ElevenLabs intermittently returns near-silent audio (whatever the prompt).
// Probe every fresh generation and WARN on suspiciously quiet ONE-SHOTS
// (duration <= 2s); beds/ambience/music can legitimately be quiet, so they
// only get the measured levels reported.
function reportLevels(name, file, oneShotDuration) {
  let levels;
  try { levels = probeAstats(file); }
  catch { console.warn(`[sfx] ${name}: level probe failed (ffmpeg missing?)`); return; }
  const { peakDb, rmsDb } = levels;
  console.log(`[sfx] ${name}: peak ${peakDb.toFixed(1)} dB, RMS ${rmsDb.toFixed(1)} dB`);
  if (oneShotDuration != null && oneShotDuration <= 2 && peakDb < -25) {
    console.warn(`[sfx] ⚠ ${name}: peak ${peakDb.toFixed(0)} dB — likely a failed generation, consider --force ${name} regen`);
  }
}

async function callApi(url, body, label) {
  const res = await fetch(`${url}?output_format=${OUT_FMT}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${label}: HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

let generated = 0, skipped = 0, failed = 0;

// ── Sound effects ────────────────────────────────────────────────
for (const [name, spec] of Object.entries(plan.sounds || {})) {
  const file = path.join(soundsDir, `${name}.mp3`);
  if (fs.existsSync(file) && force !== name && force !== 'all' && force !== 'sounds') {
    skipped++; console.log(`[sfx] ${name}: cached, skipping`); continue;
  }
  if (dryRun) { console.log(`[sfx] ${name}: WOULD generate (${spec.duration}s) — "${spec.prompt.slice(0, 60)}…"`); continue; }
  try {
    const buf = await callApi('https://api.elevenlabs.io/v1/sound-generation', {
      text: spec.prompt,
      duration_seconds: spec.duration,
      prompt_influence: spec.promptInfluence ?? 0.4,
    }, name);
    fs.writeFileSync(file, buf);
    generated++;
    console.log(`[sfx] ${name}: generated ${(buf.length / 1024).toFixed(0)} KB`);
    reportLevels(name, file, spec.duration);
  } catch (e) {
    failed++; console.error(`[sfx] ${name}: FAILED — ${e.message}`);
  }
}

// ── Music bed ────────────────────────────────────────────────────
if (plan.music) {
  const file = path.join(sfxDir, plan.music.file || 'music.mp3');
  if (fs.existsSync(file) && force !== 'music' && force !== 'all') {
    skipped++; console.log('[sfx] music: cached, skipping');
  } else if (dryRun) {
    console.log(`[sfx] music: WOULD generate (${plan.music.lengthMs}ms) — "${plan.music.prompt.slice(0, 60)}…"`);
  } else {
    try {
      const buf = await callApi('https://api.elevenlabs.io/v1/music', {
        prompt: plan.music.prompt,
        music_length_ms: plan.music.lengthMs,
        force_instrumental: true,
        model_id: 'music_v1',
      }, 'music');
      fs.writeFileSync(file, buf);
      generated++;
      console.log(`[sfx] music: generated ${(buf.length / 1024).toFixed(0)} KB`);
      reportLevels('music', file, null);
    } catch (e) {
      failed++; console.error(`[sfx] music: FAILED — ${e.message}`);
    }
  }
}

console.log(`[sfx] done: ${generated} generated, ${skipped} cached, ${failed} failed`);
if (failed) process.exitCode = 1;
