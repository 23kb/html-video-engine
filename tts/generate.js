// Voicebox / ElevenLabs → <target>/<slug>.mp3
//
// Per-video (preferred):
//   node tts/generate.js --video <slug>              # all .txt in that video's narration dir
//   node tts/generate.js --video <slug> <clip-key>   # subset
//
// Engine selection (2026-07-22, tutorial QC r4 issue 4):
//   --engine voicebox     (default) local Voicebox drafts — unchanged behavior
//   --engine elevenlabs   ElevenLabs API finals. Reads ELEVENLABS_API_KEY from
//                         env or .env. Voice resolution: --voice <id> flag →
//                         ELEVENLABS_VOICE_ID_KACIE env — no silent stock
//                         fallback (finals must never render on a stock voice
//                         by accident; pass --voice explicitly for tests).
//                         Model: --model / ELEVENLABS_MODEL, default
//                         eleven_v3 (fix-round C9, 2026-08-17 — Umair's
//                         instruction 2026-08-14: "v2 needs to be fixed for
//                         tutorials also, its currently soulless and not
//                         lively"). Returns mp3 directly (no ffmpeg step).
//                         Use --force when switching engines — the
//                         mp3-newer-than-txt skip is engine-agnostic.
//
// ── v3 PRESETS (fix-round C9) ───────────────────────────────────────────────
//   shorts / ad-energy:    eleven_v3 --stability 0 (Creative) + audio tags
//                          ([warmly], [confident]) + QC with --expressive.
//   tutorial / long-form:  eleven_v3 --stability 0.5 (Natural) + moderate
//                          tags + the STANDARD narration-qc gate first —
//                          widen to --expressive only if the gate fights a
//                          read you like. Do NOT chase the voice-cluster gate
//                          by raising stability: that playbook SHIPPED the
//                          monotone (ssn 10, superseded by ssn 11).
//   Mixing v3 stability tiers inside one video is fine when the cluster
//   passes (bac A). Voice stays Kacie — v3 fixes the delivery, not the voice.
//
// ── ⚠ BREAKING-CHANGE NOTE (the v2→v3 default flip) ─────────────────────────
//   v2 honors <break time="0.6s"/> SSML pause tags; eleven_v3 silently
//   IGNORES <break> — on v3, pacing is written as punctuation (dashes,
//   ellipses, sentence breaks) + audio tags (sfb 10's trick). Any narration
//   .txt authored for v2 that relies on <break> will lose its pauses if
//   re-synthesized under the new default. Existing narration files are NOT
//   auto-migrated (retrofit is forward-only until Umair names videos —
//   README decision 2). The tool prints a warning when it detects <break>
//   text going to a v3 model. [tone] audio tags are v3-only markup — they
//   are stripped for non-v3 models (they'd be read aloud).
//
//   After ANY re-synthesis: `node tools/measure-narration.js <slug>` and
//   re-paste the DUR block — DUR tables are voice-coupled and spoken-sync
//   beats shift.
//   --engine fishaudio    Fish Audio API. Model: --model / FISHAUDIO_MODEL,
//                         default s2.1-pro (s2.1-pro-free = $0 drafts). Keys:
//                         FISHAUDIO_API_KEY + FISHAUDIO_VOICE_ID_KACIE in .env.
//                         Residual <break> tags translate to Fish-native
//                         [break]/[long-break] at synth time.
//
// Partial re-render (phase-2 step-level narration):
//   node tts/generate.js --video <slug> --chapter <chapter-id>    # all .txt matching "<chapter-id>*"
//   node tts/generate.js --video <slug> --beat <chapter>:<beat>   # one .txt → "<chapter>-<beat>"
//
// All videos:
//   node tts/generate.js --all                                    # scan videos/*/narration/*.txt, render missing/stale
//
// Legacy (root /narration/ — for notifications-combined reference scenes):
//   node tts/generate.js welcome entry                            # bare slugs against /narration/
//
// Behavior:
//   - Renders only .txt files that exist. No hardcoded whitelist.
//   - Skips synthesis when <slug>.mp3 exists and is newer than <slug>.txt
//     (override with --force).
//   - VOICEBOX_URL     env var  (default http://127.0.0.1:17493)
//   - VOICEBOX_PROFILE env var  (default bfbab6b4-… Kokoro af_heart)
//   - Health check runs ONCE before rendering: Voicebox down → on Windows it
//     auto-launches the app and polls up to 30s (opt out with --no-launch);
//     otherwise fails fast with the start command instead of N × "fetch failed".

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VOICEBOX   = process.env.VOICEBOX_URL     || 'http://127.0.0.1:17493';
const PROFILE_ID = process.env.VOICEBOX_PROFILE || 'bfbab6b4-6712-4c34-8f26-d5a8df4a3f2d';

// Minimal .env loader — no dotenv dependency (same pattern as tools/sfx/generate.mjs).
try {
  const envFile = path.join(ROOT, '.env');
  for (const line of (await fs.readFile(envFile, 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* no .env — env vars may still be set directly */ }

// ── arg parsing ─────────────────────────────────────────────────────────────
const raw = process.argv.slice(2);
const flags = new Set(raw.filter(a => a.startsWith('--')));
const positional = raw.filter(a => !a.startsWith('--'));

function flagValue(name) {
  const i = raw.findIndex(a => a === name);
  return i >= 0 ? raw[i + 1] : null;
}
const videoSlug  = flagValue('--video');
const chapterArg = flagValue('--chapter');        // e.g. "cff-chapter-3" → matches "cff-chapter-3*.txt"
const beatArg    = flagValue('--beat');           // e.g. "cff-chapter-3:click-save" → "cff-chapter-3-click-save.txt"
const engineArg  = flagValue('--engine') || process.env.TTS_ENGINE || 'voicebox';
const voiceArg   = flagValue('--voice');          // elevenlabs voice id override (stock-voice tests)
const modelArg   = flagValue('--model');          // elevenlabs model id override
const flagValues = new Set([videoSlug, chapterArg, beatArg, flagValue('--engine'), voiceArg, modelArg, flagValue('--stability'), flagValue('--style')].filter(Boolean));
const rest = positional.filter(a => !flagValues.has(a));
const allMode = flags.has('--all');
const force   = flags.has('--force');

if ((chapterArg || beatArg) && !videoSlug) {
  console.error('--chapter / --beat require --video <slug>');
  process.exit(1);
}
if (beatArg && !/^[^:]+:[^:]+$/.test(beatArg)) {
  console.error('--beat must look like "<chapter>:<beat>", got: ' + beatArg);
  process.exit(1);
}
const beatSlug = beatArg ? beatArg.replace(':', '-') : null;

if (!['voicebox', 'elevenlabs', 'fishaudio'].includes(engineArg)) {
  console.error(`--engine must be voicebox, elevenlabs, or fishaudio, got: ${engineArg}`);
  process.exit(1);
}
// ElevenLabs config — resolved once, validated before any rendering starts.
const EL_KEY   = process.env.ELEVENLABS_API_KEY;
const EL_VOICE = voiceArg || process.env.ELEVENLABS_VOICE_ID_KACIE;
// Default eleven_v3 (fix-round C9; was eleven_multilingual_v2 — see the
// breaking-change note in the header: v3 ignores <break> SSML).
const EL_MODEL = modelArg || process.env.ELEVENLABS_MODEL || 'eleven_v3';
// QC r6: stability override for the v3 voice-drift fix (--stability 1.0 = Robust).
const EL_STABILITY = (() => {
  const v = parseFloat(flagValue('--stability') ?? process.env.ELEVENLABS_STABILITY ?? '0.5');
  return Number.isFinite(v) ? v : 0.5;
})();
// QC r6: style override — v2 expressiveness knob (0 = neutral read; ~0.2-0.4
// adds life while keeping clone fidelity; high values distort the voice).
const EL_STYLE = (() => {
  const v = parseFloat(flagValue('--style') ?? process.env.ELEVENLABS_STYLE ?? '0');
  return Number.isFinite(v) ? v : 0;
})();
if (engineArg === 'elevenlabs') {
  if (!EL_KEY) { console.error('✗ ELEVENLABS_API_KEY not set (checked env + .env)'); process.exit(1); }
  if (!EL_VOICE) {
    console.error('✗ No ElevenLabs voice: pass --voice <id> (stock test) or set ELEVENLABS_VOICE_ID_KACIE in .env (finals).');
    process.exit(1);
  }
}
// Fish Audio config — same fail-fast shape as the ElevenLabs block above.
const FISH_KEY   = process.env.FISHAUDIO_API_KEY;
const FISH_VOICE = voiceArg || process.env.FISHAUDIO_VOICE_ID_KACIE;
const FISH_MODEL = (engineArg === 'fishaudio' && modelArg) || process.env.FISHAUDIO_MODEL || 's2.1-pro';
if (engineArg === 'fishaudio') {
  if (!FISH_KEY) { console.error('✗ FISHAUDIO_API_KEY not set (checked env + .env)'); process.exit(1); }
  if (!FISH_VOICE) {
    console.error('✗ No Fish Audio voice: pass --voice <id> or set FISHAUDIO_VOICE_ID_KACIE in .env.');
    process.exit(1);
  }
}

// ── target resolution ──────────────────────────────────────────────────────
// Returns an array of { dir, slugs } buckets to process.
async function resolveTargets() {
  if (allMode) {
    const videosDir = path.join(ROOT, 'videos');
    const entries = await fs.readdir(videosDir, { withFileTypes: true });
    const buckets = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(videosDir, e.name, 'narration');
      const slugs = await slugsIn(dir);
      if (slugs.length) buckets.push({ dir, slugs, label: e.name });
    }
    return buckets;
  }
  if (videoSlug) {
    const dir = path.join(ROOT, 'videos', videoSlug, 'narration');
    const present = await slugsIn(dir);
    let slugs;
    if (beatSlug) {
      if (!present.includes(beatSlug)) {
        console.error(`--beat ${beatArg}: no ${beatSlug}.txt in ${dir}`);
        process.exit(1);
      }
      slugs = [beatSlug];
    } else if (chapterArg) {
      slugs = present.filter(s => s === chapterArg || s.startsWith(chapterArg + '-'));
      if (!slugs.length) {
        console.error(`--chapter ${chapterArg}: no .txt matching "${chapterArg}*" in ${dir}`);
        process.exit(1);
      }
    } else {
      slugs = rest.length ? rest : present;
      const missing = rest.filter(s => !present.includes(s));
      if (missing.length) console.warn(`[warn] no .txt for: ${missing.join(', ')} in ${dir}`);
    }
    return [{ dir, slugs, label: videoSlug }];
  }
  // Legacy: root /narration/
  const dir = path.join(ROOT, 'narration');
  const present = await slugsIn(dir);
  const slugs = rest.length ? rest : present;
  return [{ dir, slugs, label: '(root)' }];
}

async function slugsIn(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.txt')).map(f => f.replace(/\.txt$/, ''));
  } catch { return []; }
}

async function shouldSkip(txtPath, mp3Path) {
  if (force) return false;
  try {
    const [t, m] = await Promise.all([fs.stat(txtPath), fs.stat(mp3Path)]);
    return m.mtimeMs >= t.mtimeMs;
  } catch { return false; }
}

// ── synthesis ──────────────────────────────────────────────────────────────
async function synth(dir, slug) {
  const txtPath = path.join(dir, `${slug}.txt`);
  const outMp3  = path.join(dir, `${slug}.mp3`);

  if (await shouldSkip(txtPath, outMp3)) {
    console.log(`[${slug}] skip (mp3 newer than txt; pass --force to rerender)`);
    return { slug, skipped: true };
  }

  const text = (await fs.readFile(txtPath, 'utf8')).trim();
  if (!text) throw new Error(`empty narration: ${txtPath}`);

  if (engineArg === 'elevenlabs') return synthElevenLabs(slug, text, outMp3);
  if (engineArg === 'fishaudio')  return synthFishAudio(slug, text, outMp3);

  process.stdout.write(`[${slug}] ${text.length} chars → voicebox... `);
  const res = await fetch(`${VOICEBOX}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile_id: PROFILE_ID, text, language: 'en', engine: 'kokoro' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  let gen = await res.json();
  const started = Date.now();
  while (gen.status !== 'completed' && gen.status !== 'failed') {
    if (Date.now() - started > 120_000) throw new Error(`timeout; last status=${gen.status}`);
    await new Promise(r => setTimeout(r, 800));
    const s = await fetch(`${VOICEBOX}/history/${gen.id}`);
    if (!s.ok) throw new Error(`poll HTTP ${s.status}`);
    gen = await s.json();
  }
  if (gen.status !== 'completed' || !gen.audio_path) {
    throw new Error(`generation status=${gen.status}, error=${gen.error}`);
  }
  process.stdout.write(`${gen.duration?.toFixed(2)}s wav → mp3... `);

  const audioRes = await fetch(`${VOICEBOX}/audio/${gen.id}`);
  if (!audioRes.ok) throw new Error(`audio fetch HTTP ${audioRes.status}`);
  const wavBuf = Buffer.from(await audioRes.arrayBuffer());
  const tmpWav = path.join(dir, `.${slug}.tmp.wav`);
  await fs.writeFile(tmpWav, wavBuf);

  try {
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-i', tmpWav,
        '-codec:a', 'libmp3lame', '-qscale:a', '2',
        outMp3,
      ], { stdio: ['ignore', 'ignore', 'inherit'] });
      ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
    });
  } finally {
    await fs.unlink(tmpWav).catch(() => {});
  }
  console.log('done');
  return { slug, duration: gen.duration };
}

// ── ElevenLabs synthesis — direct mp3, no ffmpeg step ──────────────────────
async function synthElevenLabs(slug, text, outMp3) {
  // QC r6: [warmly]/[curious]-style audio tags are eleven_v3-only markup —
  // earlier models (multilingual_v2 etc.) read them ALOUD. Strip when not v3.
  const isV3 = /_v3/.test(EL_MODEL);
  const elText = isV3
    ? text
    : text.replace(/\s*\[[a-z][a-z -]*\]\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
  // C9 migration guard: v2-era .txt files pace with <break> SSML, which v3
  // silently ignores — the clip loses its pauses. Warn, don't block.
  if (isV3 && /<break[\s/>]/i.test(elText)) {
    console.warn(`\n  ⚠ [${slug}] contains <break> SSML but model ${EL_MODEL} IGNORES it — this is v2-era text. Rewrite pacing as punctuation/dashes/ellipses (header note), or pass --model eleven_multilingual_v2.`);
  }
  process.stdout.write(`[${slug}] ${elText.length} chars → elevenlabs (${EL_MODEL}, stab ${EL_STABILITY})... `);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      text: elText,
      model_id: EL_MODEL,
      // stability 0.5 = "Natural" (v3 rounds to 0.0/0.5/1.0; 1.0 = "Robust" — most
      // consistent clip-to-clip + closest clone adherence, 0.0 = hallucination-prone).
      // QC r6: overridable via --stability / ELEVENLABS_STABILITY for the voice-drift fix.
      voice_settings: { stability: EL_STABILITY, similarity_boost: 0.75, style: EL_STYLE, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`suspiciously small mp3 (${buf.length} bytes)`);
  await fs.writeFile(outMp3, buf);
  const duration = await probeDuration(outMp3);
  console.log(`${duration ? duration.toFixed(2) + 's ' : ''}done`);
  return { slug, duration };
}

// ── Fish Audio synthesis — direct mp3; model id rides an HTTP HEADER ────────
async function synthFishAudio(slug, text, outMp3) {
  // <break time> is ElevenLabs-v2-only markup — translate residuals to Fish-native pause tags.
  const fishText = text.replace(/<break\s+time="?([\d.]+)\s*s"?\s*\/?\s*>/gi,
    (_, s) => (parseFloat(s) >= 0.6 ? ' [long-break] ' : ' [break] '));
  process.stdout.write(`[${slug}] ${fishText.length} chars → fishaudio (${FISH_MODEL})... `);
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FISH_KEY}`, 'content-type': 'application/json', 'model': FISH_MODEL },
    body: JSON.stringify({
      text: fishText, reference_id: FISH_VOICE, format: 'mp3', mp3_bitrate: 128,
      sample_rate: 44100, temperature: 0.7, top_p: 0.7, normalize: true, latency: 'normal',
    }),
  });
  if (!res.ok) {
    const hint = res.status === 402 ? ' — prepaid API credits exhausted (separate from web subscription)' : '';
    throw new Error(`HTTP ${res.status}${hint}: ${(await res.text()).slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`suspiciously small mp3 (${buf.length} bytes)`);
  await fs.writeFile(outMp3, buf);
  const duration = await probeDuration(outMp3);
  console.log(`${duration ? duration.toFixed(2) + 's ' : ''}done`);
  return { slug, duration };
}

// mp3 duration via ffprobe (ships with the repo's ffmpeg toolchain); null on failure.
function probeDuration(file) {
  return new Promise(resolve => {
    let out = '';
    const p = spawn('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    p.stdout.on('data', d => { out += d; });
    p.on('close', code => resolve(code === 0 ? parseFloat(out) || null : null));
    p.on('error', () => resolve(null));
  });
}

// ── Voicebox health check — fail fast ONCE, not per-clip ────────────────────
const VOICEBOX_START_CMD = 'Start-Process "shell:AppsFolder\\sh.voicebox.app"';

async function voiceboxUp(timeoutMs = 3000) {
  try {
    await fetch(`${VOICEBOX}/`, { signal: AbortSignal.timeout(timeoutMs) });
    return true; // any HTTP response = listening
  } catch { return false; }
}

async function ensureVoicebox() {
  if (await voiceboxUp()) return;
  if (process.platform === 'win32' && !flags.has('--no-launch')) {
    console.log(`[voicebox] not running — launching (${VOICEBOX_START_CMD}), polling up to 30s…`);
    spawn('powershell', ['-NoProfile', '-Command', VOICEBOX_START_CMD], { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await voiceboxUp(1500)) { console.log('[voicebox] up.'); return; }
    }
    console.error(`✗ Voicebox did not come up within 30s — start it manually (${VOICEBOX_START_CMD}) and re-run.`);
    process.exit(1);
  }
  console.error(`✗ Voicebox not running at ${VOICEBOX} — start the Voicebox app (${VOICEBOX_START_CMD}) and re-run.`);
  process.exit(1);
}

// ── main ───────────────────────────────────────────────────────────────────
const buckets = await resolveTargets();
if (!buckets.length || !buckets.some(b => b.slugs.length)) {
  console.error('Nothing to render. Pass --video <slug>, --all, or bare slugs (legacy).');
  process.exit(1);
}

if (engineArg === 'voicebox') {
  await ensureVoicebox();
  console.log(`[voicebox] ${VOICEBOX}  profile=${PROFILE_ID.slice(0, 8)}…`);
} else if (engineArg === 'fishaudio') {
  console.log(`[fishaudio] model=${FISH_MODEL}  voice=${FISH_VOICE.slice(0, 8)}…${voiceArg ? ' (--voice override)' : ''}`);
} else {
  console.log(`[elevenlabs] model=${EL_MODEL}  voice=${EL_VOICE.slice(0, 8)}…${voiceArg ? ' (--voice override)' : ''}`);
}
// ── .tts.json sidecar (AP-9, 2026-09-02) ────────────────────────────────────
// narration-qc.js judges voice consistency against a per-voice centroid
// reference keyed `${voice}:${model}:${stability}` (tts/voice-reference.json).
// The sidecar records WHICH voice/model/stability rendered this folder so the
// gate can pick the right reference. The raw voice id NEVER lands on disk —
// only sha1(id).slice(0, 8).
async function writeTtsSidecar(dir) {
  try {
    const id = engineArg === 'elevenlabs' ? EL_VOICE
      : engineArg === 'fishaudio' ? FISH_VOICE
      : PROFILE_ID;
    const sidecar = {
      voice: crypto.createHash('sha1').update(String(id || '')).digest('hex').slice(0, 8),
      model: engineArg === 'elevenlabs' ? EL_MODEL : engineArg === 'fishaudio' ? FISH_MODEL : 'kokoro',
      stability: engineArg === 'elevenlabs' ? EL_STABILITY : null,
      engine: engineArg,
      at: new Date().toISOString(),
    };
    await fs.writeFile(path.join(dir, '.tts.json'), JSON.stringify(sidecar, null, 2) + '\n');
  } catch (e) {
    console.warn(`  ⚠ .tts.json sidecar not written for ${dir}: ${e.message}`);
  }
}

let ok = 0, skipped = 0, totalDur = 0;
for (const { dir, slugs, label } of buckets) {
  if (!slugs.length) continue;
  console.log(`\n--- ${label} (${dir}) ---`);
  let renderedHere = 0;
  for (const slug of slugs) {
    try {
      const r = await synth(dir, slug);
      if (r.skipped) skipped++;
      else { ok++; renderedHere++; totalDur += r.duration || 0; }
    } catch (e) {
      console.error(`[${slug}] ✗ ${e.message}`);
      process.exitCode = 1;
    }
  }
  if (renderedHere) await writeTtsSidecar(dir);
}
console.log(`\n✓ ${ok} rendered, ${skipped} skipped, ${totalDur.toFixed(2)}s total`);
