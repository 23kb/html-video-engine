#!/usr/bin/env node
// measure-narration.js — ffprobe every narration mp3 and print the
// ready-to-paste `const DUR = {...}` block (P0-3, tutorial-system-fixes
// 2026-07-22: the DUR table was hand-copied from TTS console output, and
// hand-estimated durations caused a whole "audio and steps not in sync"
// QC-round class).
//
// Run after every `tts/generate.js` run — the DUR table is voice-coupled;
// re-render means re-measure.
//
// Usage:
//   node tools/measure-narration.js <slug> [--settle 0.4]
//
// Output: per-clip measured durations, then the DUR block with
// (duration + settle) per key, grouped by chapter, intro/postintro first,
// outro last. Exit 1 if the narration folder is missing or any mp3 can't
// be probed (a bad clip must not silently drop out of the table).

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, settle: 0.4 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--settle') out.settle = Number(a[++i]);
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

// mp3 duration via ffprobe (same probe as tts/generate.js); null on failure.
function probeDuration(file) {
  return new Promise(resolve => {
    let out = '';
    const p = spawn('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    p.stdout.on('data', d => { out += d; });
    p.on('close', code => resolve(code === 0 ? parseFloat(out) || null : null));
    p.on('error', () => resolve(null));
  });
}

// Scene-aware key order: intro, postintro, ch1-*, ch2-*, …, misc, outro.
function keyRank(key) {
  if (key === 'intro') return [0];
  if (key === 'postintro') return [1];
  const ch = key.match(/^ch(\d+)(.*)$/);
  if (ch) return [2, Number(ch[1]), ch[2]];
  if (key === 'outro') return [4];
  return [3, 0, key];
}

function compareKeys(a, b) {
  const ra = keyRank(a);
  const rb = keyRank(b);
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    const va = ra[i], vb = rb[i];
    if (va === undefined) return -1;
    if (vb === undefined) return 1;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  return 0;
}

// Group keys for the emitted block: intro+postintro share a line, each
// chapter shares a line, outro alone — the shape the videos already use.
function groupOf(key) {
  if (key === 'intro' || key === 'postintro') return '_head';
  const ch = key.match(/^ch(\d+)/);
  if (ch) return 'ch' + ch[1];
  if (key === 'outro') return '_outro';
  return '_misc';
}

function fmtEntry(key, val) {
  const k = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `'${key}'`;
  return `${k}: ${val}`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug || !Number.isFinite(args.settle)) {
    console.error('Usage: node tools/measure-narration.js <slug> [--settle 0.4]');
    process.exit(1);
  }
  const dir = path.join(ROOT, 'videos', args.slug, 'narration');
  if (!fs.existsSync(dir)) {
    console.error(`✗ ${path.relative(ROOT, dir)} not found`);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3'));
  if (!files.length) {
    console.error(`✗ no mp3s in ${path.relative(ROOT, dir)}`);
    process.exit(1);
  }

  const rows = [];
  let probeFailures = 0;
  for (const f of files) {
    const key = f.replace(/\.mp3$/i, '');
    const dur = await probeDuration(path.join(dir, f));
    if (dur == null) {
      console.error(`  ✗ ${f}: ffprobe failed (missing ffprobe on PATH, or corrupt mp3)`);
      probeFailures++;
      continue;
    }
    rows.push({ key, dur });
  }
  rows.sort((a, b) => compareKeys(a.key, b.key));

  console.log(`measured ${rows.length} clip(s) in videos/${args.slug}/narration (settle +${args.settle}s):`);
  for (const r of rows) {
    console.log(`  ${r.key.padEnd(12)} ${r.dur.toFixed(2)}s → ${(r.dur + args.settle).toFixed(1)}`);
  }

  const groups = new Map();
  for (const r of rows) {
    const g = groupOf(r.key);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(fmtEntry(r.key, (r.dur + args.settle).toFixed(1)));
  }
  console.log(`\n// Clip durations (seconds) — measured ${new Date().toISOString().slice(0, 10)} via ffprobe (+${args.settle}s settle).`);
  console.log('// Voice-coupled — re-measure after every tts/generate.js run.');
  console.log('const DUR = {');
  for (const entries of groups.values()) {
    console.log(`  ${entries.join(', ')},`);
  }
  console.log('};');

  if (probeFailures) {
    console.error(`\n✗ ${probeFailures} clip(s) failed to probe — DUR block above is INCOMPLETE`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
