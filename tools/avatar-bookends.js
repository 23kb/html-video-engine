#!/usr/bin/env node
// avatar-bookends.js — render the avatar INTRO and OUTRO clips for one video.
//
// Socials avatar track (2026-09-07): a real-person digital twin (HeyGen Avatar V)
// speaks a hook, the film body (the existing shorts / tutorial mechanism) plays,
// the same twin speaks the outro. This tool produces the two bookend MP4s.
//
// Pipeline per line:  text ──ElevenLabs (cloned voice)──▶ mp3
//                     mp3  ──HeyGen /v3/assets──────────▶ audio_asset_id
//                     look + asset ──HeyGen /v3/videos──▶ poll ──▶ raw mp4
//                     raw mp4 ──ffmpeg CFR 30fps, exact stage size──▶ intro.mp4 / outro.mp4
//
// Input:  videos/<slug>/bookends.md
//           ## Intro            (spoken text, one paragraph)
//           ## Outro            (spoken text, one paragraph)
//           ## Motion intro     (optional — HeyGen motion prompt)
//           ## Motion outro     (optional)
//           look: <label>       (optional line anywhere — pins a look)
//           expressiveness: high|medium|low   (optional line anywhere)
// Flags: --only intro|outro renders one clip (cheap A/B on motion settings).
// Output: videos/<slug>/bookends/{intro,outro}.mp3, .raw.mp4, .mp4 (+ manifest.json)
//
// Usage:
//   node tools/avatar-bookends.js <slug> [--aspect 9:16|16:9] [--look <label>]
//                                        [--person umair] [--dry-run] [--tts-only]
//
// Env (.env): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_UMAIR (or --voice), HEYGEN_API_KEY
// Looks:     config/avatar-looks.json — rotation cursor per person; intro+outro share one look.
// Re-runs are idempotent: unchanged text skips TTS, unchanged audio+look+aspect skips HeyGen.
//
// HeyGen v3 only. The v2 generate endpoint is Legacy and sunsets 2026-10-31.
// Rates: Avatar V ≈ $0.0667/s (~$4/min) of finished video, 720p and 1080p alike.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOOKS_PATH = path.join(ROOT, 'config', 'avatar-looks.json');
const EL_API = 'https://api.elevenlabs.io/v1';
const HG_API = 'https://api.heygen.com/v3';
const HG_RATE_PER_SEC = 0.0667;
const POLL_MS = 10_000;
const POLL_MAX_MS = 20 * 60_000;

// "v1" clone settings — the only ElevenLabs variant Umair accepted (2026-09-07).
const EL_MODEL = 'eleven_multilingual_v2';
const EL_VOICE_SETTINGS = { stability: 0.35, similarity_boost: 1.0, style: 0.0, use_speaker_boost: true };

// ---------- args / env ----------
function usage(code = 1) {
  console.error('Usage: node tools/avatar-bookends.js <slug> [--aspect 9:16|16:9] [--look <label>] [--person <name>] [--voice <id>] [--dry-run] [--tts-only]');
  process.exit(code);
}
function parseArgs(argv) {
  const a = { slug: null, aspect: '9:16', look: null, person: 'umair', voice: null, engine: null, dryRun: false, ttsOnly: false, only: null };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--aspect') a.aspect = argv[++i];
    else if (t === '--only') a.only = argv[++i];
    else if (t === '--engine') a.engine = argv[++i];
    else if (t === '--look') a.look = argv[++i];
    else if (t === '--person') a.person = argv[++i];
    else if (t === '--voice') a.voice = argv[++i];
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--tts-only') a.ttsOnly = true;
    else if (t.startsWith('--')) usage();
    else a.slug = t;
  }
  if (!a.slug) usage();
  if (!['9:16', '16:9'].includes(a.aspect)) usage();
  return a;
}
// Minimal .env loader — same pattern as tts/generate.js (no dotenv dependency).
function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
function need(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing ${name} in .env`); process.exit(1); }
  return v;
}

// ---------- bookends.md ----------
function parseBookends(md) {
  const out = { intro: '', outro: '', motionIntro: '', motionOutro: '', look: null, expressiveness: null };
  const lookLine = md.match(/^\s*look:\s*(\S+)\s*$/mi);
  if (lookLine) out.look = lookLine[1];
  const exLine = md.match(/^\s*expressiveness:\s*(high|medium|low)\s*$/mi);
  if (exLine) out.expressiveness = exLine[1].toLowerCase();
  const engLine = md.match(/^\s*voice-engine:\s*(heygen|elevenlabs)\s*$/mi);
  out.engine = engLine ? engLine[1].toLowerCase() : null;
  const sections = md.split(/^##\s+/m).slice(1);
  for (const s of sections) {
    const nl = s.indexOf('\n');
    const head = s.slice(0, nl).trim().toLowerCase();
    const body = s.slice(nl + 1).replace(/^\s*(look|expressiveness|voice-engine):.*$/gmi, '').trim().replace(/\s+/g, ' ');
    if (head === 'intro') out.intro = body;
    else if (head === 'outro') out.outro = body;
    else if (head === 'motion intro') out.motionIntro = body;
    else if (head === 'motion outro') out.motionOutro = body;
  }
  if (!out.intro || !out.outro) {
    console.error('bookends.md needs "## Intro" and "## Outro" sections with text.');
    process.exit(1);
  }
  return out;
}

// ---------- looks ----------
function loadLooks() { return JSON.parse(fs.readFileSync(LOOKS_PATH, 'utf8')); }
function saveLooks(j) { fs.writeFileSync(LOOKS_PATH, JSON.stringify(j, null, 2) + '\n'); }
function pickLook({ person, wantLabel, manifest, dryRun }) {
  const looks = loadLooks();
  const mine = looks.looks.filter(l => l.person === person);
  if (!mine.length) { console.error(`No looks for person "${person}" in config/avatar-looks.json`); process.exit(1); }
  if (wantLabel) {
    const l = mine.find(x => x.label === wantLabel || x.id === wantLabel);
    if (!l) { console.error(`Look "${wantLabel}" not found for ${person}. Have: ${mine.map(x => x.label).join(', ')}`); process.exit(1); }
    return l;
  }
  if (manifest && manifest.look) {                 // re-run: keep the recorded look
    const l = mine.find(x => x.id === manifest.look.id);
    if (l) return l;
  }
  const idx = (looks.next?.[person] ?? 0) % mine.length;   // rotation, not random
  const l = mine[idx];
  if (!dryRun) { looks.next = looks.next || {}; looks.next[person] = (idx + 1) % mine.length; saveLooks(looks); }
  return l;
}

// ---------- helpers ----------
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ffprobeDur(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(r.stdout) || 0;
}
function ffprobeFps(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [n, d] = (r.stdout.trim() || '0/1').split('/').map(Number);
  return d ? n / d : n;
}
async function httpJson(url, opts, label) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

// ---------- ElevenLabs ----------
async function tts({ text, voice, out }) {
  const key = need('ELEVENLABS_API_KEY');
  const res = await fetch(`${EL_API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: EL_MODEL, voice_settings: EL_VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}

// ---------- HeyGen v3 ----------
async function hgUploadAudio(file) {
  const key = need('HEYGEN_API_KEY');
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), path.basename(file));
  const j = await httpJson(`${HG_API}/assets`, { method: 'POST', headers: { 'x-api-key': key }, body: fd }, 'HeyGen upload');
  const id = j.data?.asset_id || j.data?.id;
  if (!id) throw new Error(`HeyGen upload: no asset id in ${JSON.stringify(j).slice(0, 300)}`);
  return id;
}
// Two voice paths: pre-rendered audio (ElevenLabs clone → audio_asset_id) or
// HeyGen's own TTS/clone (script + voice_id). Exactly one is sent.
async function hgCreate({ avatarId, assetId, script, voiceId, aspect, motion, expressiveness, title }) {
  const key = need('HEYGEN_API_KEY');
  const body = {
    type: 'avatar',
    avatar_id: avatarId,
    ...(assetId ? { audio_asset_id: assetId } : { script, voice_id: voiceId }),
    engine: { type: 'avatar_v' },
    resolution: '1080p',
    aspect_ratio: aspect,
    fit: 'cover',
    output_format: 'mp4',
    title,
  };
  // Docs label these "photo avatars only"; the web app exposes both for Avatar V
  // twins ("Apply custom motion" + "More expressive"), so we send them and measure.
  if (motion) body.motion_prompt = motion;
  if (expressiveness) body.expressiveness = expressiveness;
  const j = await httpJson(`${HG_API}/videos`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json', 'Idempotency-Key': sha(title + (assetId || script + voiceId) + avatarId + aspect + (motion || '') + (expressiveness || '')) },
    body: JSON.stringify(body),
  }, 'HeyGen create');
  const id = j.data?.video_id || j.data?.id;
  if (!id) throw new Error(`HeyGen create: no video id in ${JSON.stringify(j).slice(0, 300)}`);
  return id;
}
async function hgPoll(videoId) {
  const key = need('HEYGEN_API_KEY');
  const t0 = Date.now();
  while (Date.now() - t0 < POLL_MAX_MS) {
    const j = await httpJson(`${HG_API}/videos/${videoId}`, { headers: { 'x-api-key': key } }, 'HeyGen status');
    const d = j.data || {};
    process.stdout.write(`    status: ${d.status}   \r`);
    if (d.status === 'completed') { process.stdout.write('\n'); return d; }
    if (d.status === 'failed') throw new Error(`HeyGen render failed: ${d.failure_code || ''} ${d.failure_message || ''}`);
    await sleep(POLL_MS);
  }
  throw new Error('HeyGen poll timed out');
}
async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}
// HeyGen ships 25 fps (measured 2026-09-07). Every downstream cut drifts on a
// frame-rate mismatch, so normalize once here: CFR 30, exact stage size, 48 kHz AAC.
function normalize(raw, out, aspect) {
  const [w, h] = aspect === '9:16' ? [1080, 1920] : [1920, 1080];
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw,
    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=30,format=yuv420p`,
    '-r', '30', '-vsync', 'cfr', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg normalize failed: ${r.stderr}`);
}

// ---------- main ----------
(async () => {
  loadEnv();
  const args = parseArgs(process.argv);
  const dir = path.join(ROOT, 'videos', args.slug);
  const mdPath = path.join(dir, 'bookends.md');
  if (!fs.existsSync(mdPath)) { console.error(`Not found: ${path.relative(ROOT, mdPath)}`); process.exit(1); }
  const outDir = path.join(dir, 'bookends');
  fs.mkdirSync(outDir, { recursive: true });
  const manPath = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};

  const be = parseBookends(fs.readFileSync(mdPath, 'utf8'));
  const engine = args.engine || be.engine || 'elevenlabs';
  if (!['elevenlabs', 'heygen'].includes(engine)) { console.error(`voice-engine must be elevenlabs|heygen, got "${engine}"`); process.exit(1); }
  const P = args.person.toUpperCase();
  const voice = args.voice || (engine === 'heygen'
    ? (process.env[`HEYGEN_VOICE_ID_${P}`] || need('HEYGEN_VOICE_ID_UMAIR'))
    : (process.env[`ELEVENLABS_VOICE_ID_${P}`] || need('ELEVENLABS_VOICE_ID_UMAIR')));
  const look = pickLook({ person: args.person, wantLabel: args.look || be.look, manifest, dryRun: args.dryRun });
  const aspectKey = args.aspect.replace(':', 'x');

  console.log(`avatar-bookends  ${args.slug}  aspect=${args.aspect}  look=${look.label} (${look.id})  voice=${engine}:${voice}`);
  console.log(`  intro: "${be.intro}"`);
  console.log(`  outro: "${be.outro}"`);
  if (args.dryRun) { console.log('  dry-run: nothing rendered'); return; }

  manifest.look = { id: look.id, label: look.label, person: args.person };
  manifest.voice = engine === 'heygen' ? { engine, id: voice } : { engine, id: voice, model: EL_MODEL, settings: EL_VOICE_SETTINGS };
  manifest.clips = manifest.clips || {};

  let totalSec = 0;
  for (const kind of ['intro', 'outro']) {
    if (args.only && args.only !== kind) continue;
    const text = be[kind];
    const motion = kind === 'intro' ? be.motionIntro : be.motionOutro;
    const mp3 = path.join(outDir, `${kind}.mp3`);
    const clip = manifest.clips[kind] || {};
    manifest.clips[kind] = clip;

    // HeyGen-voice path: no local TTS, no upload — HeyGen speaks the script itself.
    if (engine === 'heygen') {
      if (args.ttsOnly) { console.log(`  [${kind}] heygen voice: nothing to pre-render`); continue; }
      const raw = path.join(outDir, `${kind}.${aspectKey}.raw.mp4`);
      const fin = path.join(outDir, aspectKey === '9x16' ? `${kind}.mp4` : `${kind}.${aspectKey}.mp4`);
      const renderKey = sha('hg:' + text + voice + look.id + args.aspect + (motion || '') + (be.expressiveness || ''));
      clip.renders = clip.renders || {};
      if (clip.renders[aspectKey]?.renderKey === renderKey && fs.existsSync(fin)) {
        console.log(`  [${kind}] heygen: unchanged, reuse ${path.basename(fin)}`); totalSec += ffprobeDur(fin); continue;
      }
      process.stdout.write(`  [${kind}] heygen create (avatar_v, ${args.aspect}, heygen voice) ... `);
      const videoId = await hgCreate({ avatarId: look.id, script: text, voiceId: voice, aspect: args.aspect, motion, expressiveness: be.expressiveness, title: `${args.slug} ${kind} ${args.aspect} hgvoice` });
      console.log(videoId);
      const done = await hgPoll(videoId);
      await download(done.video_url, raw);
      console.log(`  [${kind}] downloaded ${path.basename(raw)} (${ffprobeFps(raw)} fps, ${ffprobeDur(raw).toFixed(2)}s) → normalize CFR 30`);
      normalize(raw, fin, args.aspect);
      totalSec += ffprobeDur(fin);
      clip.renders[aspectKey] = { renderKey, videoId, raw: path.basename(raw), out: path.basename(fin), duration: ffprobeDur(fin), look: look.label, motion: motion || null, voice: `heygen:${voice}` };
      fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
      continue;
    }

    // 1. TTS (skip if the text has not changed)
    const textHash = sha(text + EL_MODEL + JSON.stringify(EL_VOICE_SETTINGS) + voice);
    if (clip.textHash === textHash && fs.existsSync(mp3)) {
      console.log(`  [${kind}] tts: unchanged, reuse ${path.basename(mp3)}`);
    } else {
      process.stdout.write(`  [${kind}] tts → ${path.basename(mp3)} ... `);
      await tts({ text, voice, out: mp3 });
      clip.textHash = textHash; clip.assetId = null; clip.renders = {};
      console.log(`${ffprobeDur(mp3).toFixed(2)}s`);
    }
    const dur = ffprobeDur(mp3);
    totalSec += dur;
    manifest.clips[kind] = clip;
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
    if (args.ttsOnly) continue;

    // 2. HeyGen upload (once per audio)
    if (!clip.assetId) {
      process.stdout.write(`  [${kind}] heygen upload ... `);
      clip.assetId = await hgUploadAudio(mp3);
      console.log(clip.assetId);
      fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
    }

    // 3. HeyGen render (skip if same audio + look + aspect + motion already rendered)
    const raw = path.join(outDir, `${kind}.${aspectKey}.raw.mp4`);
    const fin = path.join(outDir, aspectKey === '9x16' ? `${kind}.mp4` : `${kind}.${aspectKey}.mp4`);
    const renderKey = sha(clip.assetId + look.id + args.aspect + (motion || '') + (be.expressiveness || ''));
    clip.renders = clip.renders || {};
    const prev = clip.renders[aspectKey];
    if (prev && prev.renderKey === renderKey && fs.existsSync(fin)) {
      console.log(`  [${kind}] heygen: unchanged, reuse ${path.basename(fin)}`);
      continue;
    }
    process.stdout.write(`  [${kind}] heygen create (avatar_v, ${args.aspect}, ~$${(dur * HG_RATE_PER_SEC).toFixed(2)}) ... `);
    const videoId = await hgCreate({ avatarId: look.id, assetId: clip.assetId, aspect: args.aspect, motion, expressiveness: be.expressiveness, title: `${args.slug} ${kind} ${args.aspect}` });
    console.log(videoId);
    const done = await hgPoll(videoId);
    await download(done.video_url, raw);
    console.log(`  [${kind}] downloaded ${path.basename(raw)} (${ffprobeFps(raw)} fps, ${ffprobeDur(raw).toFixed(2)}s) → normalize CFR 30`);
    normalize(raw, fin, args.aspect);
    clip.renders[aspectKey] = { renderKey, videoId, raw: path.basename(raw), out: path.basename(fin), duration: ffprobeDur(fin), look: look.label, motion: motion || null, expressiveness: be.expressiveness || null };
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`done. speech ${totalSec.toFixed(1)}s ≈ $${(totalSec * HG_RATE_PER_SEC).toFixed(2)} HeyGen per aspect. manifest: ${path.relative(ROOT, manPath)}`);
})().catch(e => { console.error(`\nERROR: ${e.message}`); process.exit(1); });
