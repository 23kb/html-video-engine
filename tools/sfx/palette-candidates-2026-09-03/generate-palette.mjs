// Track 3 SFX palette round (2026-09-03) — STANDALONE candidate generator.
// Mirrors tools/sfx/generate.mjs's request path (POST /v1/sound-generation,
// {text, duration_seconds, prompt_influence}, output_format=mp3_44100_128)
// without touching it. 12 one-shots, prompts engineered to the envelopes
// measured in the reference SFX snips.
// Cached like the pipeline: existing files are never regenerated.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Only generate the names passed as argv (safety: the 2026-09-03 run lost 12
// charged generations to a %20 path bug before any file landed; the remaining
// budget under the <=15 hard cap is spent one name at a time).
const ONLY = process.argv.slice(2).filter((a) => a !== '--allow-rejected');
// REJECTED BY EAR 2026-09-03 (Umair, in-context QC on the ad-vocabulary proving reel):
// the shimmer and riser/whoosh CLASSES, not the individual rolls. Consistent with
// the standing 2026-06-10 ad-sound ruling — punchy-clean, no cinematic whoosh or
// sparkle cheese. The mp3s stay on disk as rejected candidates; regenerating the
// class is a credit spend against a sound that will be rejected again, so these
// names are refused. Ratified set + rationale: tools/sfx/palette/README.md.
// REJECTED BY EAR 2026-09-17 (Umair, on a dashboard ad): the TICK class —
// 'remove the ticks from sfx. NEVER EVER add those again.' Ticks are out of the palette for
// every film, not just that one. The moments they covered get a designed material cue or nothing.
const REJECTED = new Set(['shimmer-a', 'shimmer-b', 'riser-a', 'riser-b', 'tick-a', 'tick-b', 'tick-c']);
const ALLOW_REJECTED = process.argv.includes('--allow-rejected');
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
const OUT_FMT = 'mp3_44100_128';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// class → candidates. Envelope targets from the measured cue-class table.
const CANDIDATES = {
  // tick/click: 42ms total, 18ms attack, 2.1–5.3kHz
  'tick-a': { duration: 0.5, prompt: 'single tight UI tick, dry percussive click, 40 milliseconds, instant attack, bright 3kHz, no reverb, no tail' },
  'tick-b': { duration: 0.5, prompt: 'crisp digital blip tick, one hit, ultra short 40ms, glassy 4.5kHz brightness, bone dry, no echo' },
  'tick-c': { duration: 0.5, prompt: 'soft wooden tick, single click of a felt hammer, 50 milliseconds, warm 2.5kHz, completely dry' },
  // impact/hit: 18ms attack / 120ms decay, 1.4–1.7kHz
  'impact-a': { duration: 1, prompt: 'punchy percussive impact hit, instant attack, 120 millisecond decay, mid-range 1.5kHz body, tight and dry, single hit' },
  'impact-b': { duration: 1, prompt: 'clean snappy hit, drum rim plus low knock, fast attack, short 150ms tail, warm midrange, no reverb' },
  'impact-c': { duration: 1, prompt: 'muted slam accent, single confident thud with a click edge, instant attack, 120ms decay, dry studio' },
  // whoosh/riser: 190–320ms rise, short land
  'riser-a': { duration: 1, prompt: 'short air whoosh riser, 300 millisecond swell into a soft stop, filtered noise sweep rising in pitch, tight, no tail' },
  'riser-b': { duration: 1.5, prompt: 'quick tonal riser, synth sweep rising 300ms then landing on a muted tick, bright airy 4kHz top, dry' },
  // drop/boom: nearest measured neighbor = rayvo 0.5–1.2kHz thump, soft 100–260ms attack
  'boom-a': { duration: 1, prompt: 'soft deep thump, four-on-the-floor style kick boom, rounded 250ms attack, 600Hz body, short controlled decay, no rumble tail' },
  'boom-b': { duration: 1.5, prompt: 'cinematic mini boom drop, low 500Hz impact with 400ms decay, soft edged, clean and dry, single hit' },
  // shimmer/sweep: nearest measured neighbor = fqnbn 4.1–4.5kHz riser rows
  'shimmer-a': { duration: 1.5, prompt: 'bright shimmer sweep, glassy 4.5kHz sparkle rising then fading over one second, airy, delicate, no reverb tail' },
  'shimmer-b': { duration: 1.5, prompt: 'gentle bell shimmer, high glittery sweep across one second, 4kHz and above, soft attack, clean fade out' },
};

async function callApi(body, label, attempt = 1) {
  const MAX = 4;
  let res;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/sound-generation?output_format=${OUT_FMT}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (attempt >= MAX) throw new Error(`${label}: network error — ${e.message}`);
    await sleep(2000 * attempt);
    return callApi(body, label, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < MAX) {
      console.warn(`[palette] ${label}: HTTP ${res.status}, retrying (${attempt}/${MAX - 1})`);
      await sleep(2000 * attempt);
      return callApi(body, label, attempt + 1);
    }
    throw new Error(`${label}: HTTP ${res.status} — ${text.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

let generated = 0, skipped = 0, failed = 0, rejected = 0;
for (const [name, spec] of Object.entries(CANDIDATES)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  if (REJECTED.has(name) && !ALLOW_REJECTED) {
    rejected++;
    console.log(`[palette] ${name}: REJECTED CLASS (ear QC 2026-09-03) — refusing. Override: --allow-rejected`);
    continue;
  }
  const file = path.join(HERE, `${name}.mp3`);
  if (fs.existsSync(file)) { skipped++; console.log(`[palette] ${name}: cached, skipping`); continue; }
  try {
    const buf = await callApi({ text: spec.prompt, duration_seconds: spec.duration, prompt_influence: 0.4 }, name);
    fs.writeFileSync(file, buf);
    generated++;
    console.log(`[palette] ${name}: generated ${(buf.length / 1024).toFixed(0)} KB (${spec.duration}s)`);
  } catch (e) { failed++; console.error(`[palette] ${name}: FAILED — ${e.message}`); }
}
console.log(`[palette] done: ${generated} generated, ${skipped} cached, ${rejected} refused (rejected class), ${failed} failed (credit spend = ${generated} generations)`);
