#!/usr/bin/env node
// lint-doc-refs.js — do the files our docs and skills point at still exist?
//
// A skill named a reference film, the film was gone, and the session leaned on
// it anyway before finding out (rf-video 3). Reference paths rot silently
// because nothing reads them but a human mid-task, and by then the cost is
// already paid. This reads every markdown path reference and checks disk.
//
// Scans: CLAUDE.md, docs/**/*.md, .claude/skills/**/*.md, capture/*.md,
//        reference/**/*.md
// Checks: repo-relative paths under videos/, snapshots/, reference/, tools/,
//         capture/, runtime/, engine/, docs/ that look like real files
//         (they carry an extension) — plus bare directory refs under videos/.
//
// videos/ is gitignored, so in a FRESH CLONE every videos/ reference reports
// missing. That is the honest answer: those references are unusable there.
// Use --skip-videos to scan only tracked trees.
//
// Usage:
//   node tools/lint-doc-refs.js [--skip-videos] [--quiet]
// Exit: 0 always (report-only) unless --strict, then 1 when anything is dead.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const skipVideos = args.includes('--skip-videos');
const strict = args.includes('--strict');
const quiet = args.includes('--quiet');

const SCAN_ROOTS = ['docs', '.claude/skills', 'capture', 'reference'];
const SCAN_FILES = ['CLAUDE.md', 'README.md', 'CONTRIBUTING.md'];
const REF_RE = /\b((?:videos|snapshots|reference|tools|capture|runtime|engine|docs)\/[A-Za-z0-9._\-/]+)/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

let docs = [
  ...SCAN_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
  ...SCAN_ROOTS.flatMap((d) => walk(path.join(ROOT, d))),
];

// Gitignored markdown is session scratch and historical prompt archive
// (docs/codex-prompts, docs/plans, handoffs). Their references rotted on
// purpose — linting them buries the live docs in noise. Ask git rather than
// hardcoding a list, so this stays true as .gitignore changes.
try {
  const { spawnSync } = require('child_process');
  const rel = docs.map((f) => path.relative(ROOT, f).replace(/\\/g, '/'));
  const r = spawnSync('git', ['check-ignore', '--stdin'], { cwd: ROOT, input: rel.join('\n'), encoding: 'utf8' });
  const ignored = new Set((r.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean));
  if (ignored.size) docs = docs.filter((f) => !ignored.has(path.relative(ROOT, f).replace(/\\/g, '/')));
} catch (_) { /* no git — scan everything */ }

// A reference is checkable when it names a file (has an extension) or is a
// videos/<slug> directory. Globs, <placeholders> and trailing punctuation are
// not paths.
function checkable(ref) {
  if (/[<>*?]/.test(ref)) return false;
  if (/NNN|XXX|\bfoo\b|\bbar\b/.test(ref)) return false;   // documented placeholders
  if (/[-_]$/.test(ref)) return false;                     // truncated prefix, e.g. videos/_sandbox-<name>
  if (/\/$/.test(ref)) return true;
  return /\.[A-Za-z0-9]{2,5}$/.test(ref) || /^videos\/[A-Za-z0-9._-]+$/.test(ref);
}

const dead = new Map();   // ref -> Set(doc)
let checked = 0;

for (const doc of docs) {
  // URL paths are not repo paths: `https://wpforms.com/docs/foo/` used to be
  // reported as a missing docs/foo/ folder. Blank every http(s):// token
  // before scanning; everything else is unchanged.
  const text = fs.readFileSync(doc, 'utf8').replace(/https?:\/\/[^\s)\]>'"`]+/g, ' ');
  for (const m of text.matchAll(REF_RE)) {
    let ref = m[1].replace(/[.,;:)\]]+$/, '');
    if (!checkable(ref)) continue;
    if (skipVideos && ref.startsWith('videos/')) continue;
    checked++;
    if (fs.existsSync(path.join(ROOT, ref))) continue;
    if (!dead.has(ref)) dead.set(ref, new Set());
    dead.get(ref).add(path.relative(ROOT, doc).replace(/\\/g, '/'));
  }
}

const sorted = [...dead.entries()].sort((a, b) => b[1].size - a[1].size);
console.log(`lint-doc-refs: ${checked} path reference(s) checked, ${sorted.length} not on disk`);
if (!quiet) {
  for (const [ref, docsSet] of sorted) {
    console.log(`  ✗ ${ref}`);
    for (const d of [...docsSet].slice(0, 4)) console.log(`      cited by ${d}`);
    if (docsSet.size > 4) console.log(`      … and ${docsSet.size - 4} more`);
  }
}
if (strict && sorted.length) process.exit(1);
