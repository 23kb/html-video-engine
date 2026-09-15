// SFX pipeline step 2: generate the sounds in a video's sfx/plan.json via
// the ElevenLabs APIs and cache them to disk. Cached files are NEVER
// regenerated (determinism + cost) unless --force <name|music|all>.
//
// Usage: node tools/sfx/generate.mjs --video <slug> [--plan <file>] [--force <name>|all] [--dry-run]
// Reads:  videos/<slug>/sfx/plan.json (or --plan), .env (ELEVENLABS_API_KEY)
// Writes: videos/<slug>/sfx/sounds/<name>.mp3, videos/<slug>/sfx/<music file>
import fs from 'fs';
import path from 'path';
import { probeAstats, probeSegmentPeak, probeDuration } from './lib-astats.mjs';

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

const SILENT_DB = -25;

// ElevenLabs intermittently returns near-silent audio (whatever the prompt).
// Probe every fresh generation and WARN on suspiciously quiet ONE-SHOTS
// (duration <= 2s); beds/ambience/music can legitimately be quiet, so they
// only get the measured levels reported.
//
// Also reports CREST (peak - RMS) and ATTACK (peak of the first 20% minus the
// peak of the rest) for one-shots. Neither is a verdict — no probe hears
// "ugly". airPush/airPull passed every mechanical gate (healthy peaks, right
// duration, correct placement, normalized gains) and came back from review as
// "a snake hiss" (rf-video 27). What a hiss looks like in numbers is a
// one-shot with a bed's shape: low crest AND no attack.
//
// Calibrated against every generated sound in the repo — 158 files, 143 of
// them one-shots. Crest alone does NOT separate: accepted beds run as low as
// 3.0 (subswell) and 6.8 (flatline). What separates is crest AND attack
// together — those beds have attack <= 0, while every hit has a clear positive
// attack (waveHit 19.7, b-cta 16.3, mascotPop 13.1). Applied to one-shots only,
// `crest < 12 && attack < 2` fires on 4 of 143 (monitorBeep, pulse, buzzer,
// bloomWarm). A 3% short list is worth reading; it is not a verdict.
const CREST_FLAG_DB = 12;
const ATTACK_FLAG_DB = 2;

function reportLevels(name, file, oneShotDuration) {
  let levels;
  try { levels = probeAstats(file); }
  catch { console.warn(`[sfx] ${name}: level probe failed (ffmpeg missing?)`); return null; }
  const { peakDb, rmsDb } = levels;
  const crest = peakDb - rmsDb;
  const isOneShot = oneShotDuration != null && oneShotDuration <= 2;

  let attack = null;
  if (isOneShot) {
    const dur = probeDuration(file) || oneShotDuration;
    const head = Math.max(0.08, dur * 0.2);
    const a = probeSegmentPeak(file, 0, head);
    const b = probeSegmentPeak(file, head, Math.max(0.05, dur - head));
    if (a != null && b != null) attack = a - b;
  }

  console.log(`[sfx] ${name}: peak ${peakDb.toFixed(1)} dB, RMS ${rmsDb.toFixed(1)} dB, crest ${crest.toFixed(1)} dB${attack == null ? '' : `, attack ${attack.toFixed(1)} dB`}`);

  if (isOneShot && peakDb < SILENT_DB) {
    console.warn(`[sfx] ⚠ ${name}: peak ${peakDb.toFixed(0)} dB — near-silent generation`);
  } else if (isOneShot && attack != null && crest < CREST_FLAG_DB && attack < ATTACK_FLAG_DB) {
    console.warn(`[sfx] ♪ ${name}: LISTEN FIRST — crest ${crest.toFixed(1)} dB with no attack (${attack.toFixed(1)} dB) is a one-shot shaped like a bed. That is what the hiss that shipped measured like. Not a failure; a short list.`);
  }
  return { peakDb, rmsDb, crest, attack };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ElevenLabs fails two different ways in one run: a 429 `system_busy` outright,
// and near-silent audio that returns 200. Both hit the same 17-generation run
// (3 silent, 1 dead) and all four regenerated cleanly on a second call — but
// the 429 only showed up in the exit summary as advice for a human to act on
// (rf-video 28). Retry transient failures here instead.
async function callApi(url, body, label, attempt = 1) {
  const MAX = 4;
  let res;
  try {
    res = await fetch(`${url}?output_format=${OUT_FMT}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (attempt >= MAX) throw new Error(`${label}: network error after ${MAX} attempts — ${e.message}`);
    const wait = 2000 * attempt;
    console.warn(`[sfx] ${label}: network error, retrying in ${wait / 1000}s (${attempt}/${MAX - 1})`);
    await sleep(wait);
    return callApi(url, body, label, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const transient = res.status === 429 || res.status >= 500;
    if (transient && attempt < MAX) {
      const wait = 2000 * attempt;
      console.warn(`[sfx] ${label}: HTTP ${res.status}, retrying in ${wait / 1000}s (${attempt}/${MAX - 1})`);
      await sleep(wait);
      return callApi(url, body, label, attempt + 1);
    }
    throw new Error(`${label}: HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

let generated = 0, skipped = 0, failed = 0;
const stillSilent = [];

// ── Sound effects ────────────────────────────────────────────────
for (const [name, spec] of Object.entries(plan.sounds || {})) {
  const file = path.join(soundsDir, `${name}.mp3`);
  if (fs.existsSync(file) && force !== name && force !== 'all' && force !== 'sounds') {
    skipped++; console.log(`[sfx] ${name}: cached, skipping`); continue;
  }
  if (dryRun) { console.log(`[sfx] ${name}: WOULD generate (${spec.duration}s) — "${spec.prompt.slice(0, 60)}…"`); continue; }
  const body = {
    text: spec.prompt,
    duration_seconds: spec.duration,
    prompt_influence: spec.promptInfluence ?? 0.4,
  };
  try {
    let buf = await callApi('https://api.elevenlabs.io/v1/sound-generation', body, name);
    fs.writeFileSync(file, buf);
    generated++;
    console.log(`[sfx] ${name}: generated ${(buf.length / 1024).toFixed(0)} KB`);
    let levels = reportLevels(name, file, spec.duration);

    // A near-silent return is a failed generation that answered 200. Regenerate
    // it here rather than printing advice — 3 of 17 came back silent in one run
    // and every one was fine on the next call (rf-video 28).
    let regen = 0;
    while (levels && spec.duration <= 2 && levels.peakDb < SILENT_DB && regen < 2) {
      regen++;
      console.warn(`[sfx] ${name}: regenerating (attempt ${regen}/2) — near-silent`);
      buf = await callApi('https://api.elevenlabs.io/v1/sound-generation', body, name);
      fs.writeFileSync(file, buf);
      levels = reportLevels(name, file, spec.duration);
    }
    if (levels && spec.duration <= 2 && levels.peakDb < SILENT_DB) stillSilent.push(name);
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

      // The generator treats music_length_ms as a hint, and absolute
      // timestamps in a prompt override it outright (rf-weight 26). A bed that
      // is short leaves the film's tail silent; a long one runs under the end
      // card. Measure it here — the cue plan is authored against this number.
      const actualMs = Math.round(probeDuration(file) * 1000);
      const driftMs = actualMs - plan.music.lengthMs;
      if (Math.abs(driftMs) > 1500) {
        console.warn(`[sfx] ⚠ music: asked for ${(plan.music.lengthMs / 1000).toFixed(1)}s, got ${(actualMs / 1000).toFixed(1)}s (${driftMs > 0 ? '+' : ''}${(driftMs / 1000).toFixed(1)}s). Absolute timestamps in the prompt override the length parameter — describe structure RELATIVELY, then re-generate.`);
      } else {
        console.log(`[sfx] music: ${(actualMs / 1000).toFixed(1)}s (asked ${(plan.music.lengthMs / 1000).toFixed(1)}s)`);
      }
    } catch (e) {
      failed++; console.error(`[sfx] music: FAILED — ${e.message}`);
    }
  }
}

// A run is done when every entry in sounds{} has a file that is not silent AND
// nothing failed — not when the command exits (rf-video 28).
const missing = Object.keys(plan.sounds || {}).filter((n) => !fs.existsSync(path.join(soundsDir, `${n}.mp3`)));
console.log(`[sfx] done: ${generated} generated, ${skipped} cached, ${failed} failed`);
if (!dryRun && (missing.length || stillSilent.length)) {
  if (missing.length) console.error(`[sfx] ✗ no file for: ${missing.join(', ')}`);
  if (stillSilent.length) console.error(`[sfx] ✗ still near-silent after retries: ${stillSilent.join(', ')} — re-run with --force <name>`);
}
if (failed || missing.length || stillSilent.length) process.exitCode = 1;
