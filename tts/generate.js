// Voicebox → <target>/<slug>.mp3
//
// Per-video (preferred):
//   node tts/generate.js --video creating-first-form              # all .txt in that video's narration dir
//   node tts/generate.js --video creating-first-form cff-2-templates  # subset
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VOICEBOX   = process.env.VOICEBOX_URL     || 'http://127.0.0.1:17493';
const PROFILE_ID = process.env.VOICEBOX_PROFILE || 'bfbab6b4-6712-4c34-8f26-d5a8df4a3f2d';

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
const flagValues = new Set([videoSlug, chapterArg, beatArg].filter(Boolean));
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

// ── main ───────────────────────────────────────────────────────────────────
const buckets = await resolveTargets();
if (!buckets.length || !buckets.some(b => b.slugs.length)) {
  console.error('Nothing to render. Pass --video <slug>, --all, or bare slugs (legacy).');
  process.exit(1);
}

console.log(`[voicebox] ${VOICEBOX}  profile=${PROFILE_ID.slice(0, 8)}…`);
let ok = 0, skipped = 0, totalDur = 0;
for (const { dir, slugs, label } of buckets) {
  if (!slugs.length) continue;
  console.log(`\n--- ${label} (${dir}) ---`);
  for (const slug of slugs) {
    try {
      const r = await synth(dir, slug);
      if (r.skipped) skipped++;
      else { ok++; totalDur += r.duration || 0; }
    } catch (e) {
      console.error(`[${slug}] ✗ ${e.message}`);
      process.exitCode = 1;
    }
  }
}
console.log(`\n✓ ${ok} rendered, ${skipped} skipped, ${totalDur.toFixed(2)}s total`);
