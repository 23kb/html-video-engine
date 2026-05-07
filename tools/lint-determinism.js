#!/usr/bin/env node
// Static deterministic-logic linter for video authoring surfaces.
//
// Usage:
//   node tools/lint-determinism.js [--video <slug>] [--all]
//
// Exit codes:
//   0 clean
//   1 errors
//   2 warnings only

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VIDEO_DIR = path.join(ROOT, 'videos');
const ALLOW_SET_TIMEOUT = /^(runtime|engine|tools|scenes|tests)\//;

function usage() {
  console.error('Usage: node tools/lint-determinism.js [--video <slug>] [--all]');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let all = false;
  let video = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--all') all = true;
    else if (a === '--video') video = args[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!all && !video) all = true;
  return { all, video };
}

function posixRel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function walk(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, pred, out);
    else if (entry.isFile() && pred(p)) out.push(p);
  }
  return out;
}

function findVideoDir(slug) {
  const direct = path.join(VIDEO_DIR, slug);
  if (fs.existsSync(path.join(direct, 'manifest.json'))) return direct;
  for (const entry of fs.readdirSync(VIDEO_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(VIDEO_DIR, entry.name, slug);
    if (fs.existsSync(path.join(nested, 'manifest.json'))) return nested;
  }
  return direct;
}

function allVideoSlugs() {
  if (!fs.existsSync(VIDEO_DIR)) return [];
  const out = [];
  const visit = (dir) => {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) {
      out.push(path.basename(dir));
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sub = path.join(dir, entry.name);
      if (fs.existsSync(path.join(sub, 'manifest.json'))) out.push(entry.name);
    }
  };
  for (const entry of fs.readdirSync(VIDEO_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) visit(path.join(VIDEO_DIR, entry.name));
  }
  return [...new Set(out)].sort();
}

function targetFiles({ all, video }) {
  const files = new Set();
  const slugs = video ? [video] : (all ? allVideoSlugs() : []);
  for (const slug of slugs) {
    const chapters = path.join(findVideoDir(slug), 'chapters');
    walk(chapters, p => p.endsWith('.js'), []).forEach(p => files.add(p));
  }
  walk(path.join(VIDEO_DIR, '_shared'), p => p.endsWith('.js'), []).forEach(p => files.add(p));
  if (fs.existsSync(path.join(ROOT, 'runtime'))) {
    for (const name of fs.readdirSync(path.join(ROOT, 'runtime'))) {
      if (/^cinematic-.+\.js$/.test(name)) files.add(path.join(ROOT, 'runtime', name));
    }
  }
  return [...files].sort((a, b) => posixRel(a).localeCompare(posixRel(b)));
}

function hasSeededRng(text) {
  return /\bmulberry32\s*\(/.test(text) ||
    /\bfunction\s+[A-Za-z_$][\w$]*\s*\([^)]*\bseed\w*\b[^)]*\)/.test(text) ||
    /\([^)]*\bseed\w*\b[^)]*\)\s*=>/.test(text);
}

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

function lintFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = posixRel(file);
  const findings = [];
  const note = (level, line, msg) => findings.push({ level, file, rel, line, msg });

  for (const m of text.matchAll(/\bDate\.now\s*\(/g)) {
    note('error', lineOf(text, m.index), 'Date.now() is nondeterministic; pass time in through the runtime driver instead');
  }
  for (const m of text.matchAll(/\bfetch\s*\(/g)) {
    note('error', lineOf(text, m.index), 'runtime fetch() breaks render parity; capture or vendor the data before authoring');
  }
  if (/\bMath\.random\s*\(/.test(text) && !hasSeededRng(text)) {
    for (const m of text.matchAll(/\bMath\.random\s*\(/g)) {
      note('warning', lineOf(text, m.index), 'Math.random() has no seeded RNG helper in this module; use mulberry32 or a seed-named RNG');
    }
  }
  if (!ALLOW_SET_TIMEOUT.test(rel)) {
    for (const m of text.matchAll(/\bsetTimeout\s*\(/g)) {
      note('warning', lineOf(text, m.index), 'setTimeout() in author/shared code should usually be ctx sleep() or pausableSleep()');
    }
  }
  return findings;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    console.error(e.message);
    usage();
    process.exit(1);
  }

  const findings = targetFiles(opts).flatMap(lintFile);
  const errors = findings.filter(f => f.level === 'error');
  const warnings = findings.filter(f => f.level === 'warning');

  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.rel)) byFile.set(f.rel, []);
    byFile.get(f.rel).push(f);
  }
  for (const [rel, items] of byFile) {
    console.log(`\n${rel}`);
    for (const f of items) {
      const tag = f.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`  ${rel}:${f.line}  [${tag}] ${f.msg}`);
    }
  }

  console.log(`\nsummary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  if (errors.length) process.exit(1);
  if (warnings.length) process.exit(2);
  process.exit(0);
}

main();
