#!/usr/bin/env node
// FIX-1 — static validator for single-HTML videos.
//
// Gates:
//   1. GREEN on the 4 canary videos (exit 0, zero errors).
//   2. RED on six fixtures each seeding exactly one violation class
//      (fixtures/validate-singlehtml/<case>/index.html).
//   (Gates 3-4 removed 2026-08-22: Gate 3 tested the deleted validate-video.js
//   dispatcher; Gate 4's repo-wide --all sweep is stale while ~40 pre-retirement
//   experiment folders under videos/ fail the current validator. Revisit after
//   the videos/ folder cleanup.)
//
// Usage: node tools/__tests__/validate-singlehtml.test.js

const path = require('path');
const { spawnSync } = require('child_process');
const { validateVideoDir } = require('../validate-singlehtml.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'validate-singlehtml');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function runTool(tool, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', tool), ...args], {
    cwd: ROOT, encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function errorsFor(dir) {
  const errors = [];
  validateVideoDir(dir, { report: (level, msg) => { if (level === 'error') errors.push(msg); } });
  return errors;
}

// ── Gate 1: canaries green ──────────────────────────────────────────────
section('Gate 1 — canaries green');
const CANARIES = require('../lib/local-films.js').validatorCanaries || [];
if (!CANARIES.length) {
  console.log('  - skipped: no local canary list (tools/local-films.local.json)');
} else {
  const r = runTool('validate-singlehtml.js', CANARIES);
  ok(r.code === 0, `${CANARIES.length} canaries validate clean (exit ${r.code})`);
  for (const slug of CANARIES) {
    ok(new RegExp(`✓ ${slug}: 0 error`).test(r.out), `${slug}: 0 errors`);
  }
}

// ── Gate 2: red fixtures ────────────────────────────────────────────────
section('Gate 2 — seeded violations each turn RED (and only their own class)');
const RED = [
  ['bad-import', /unresolvable import/],
  ['bad-snapshot', /snapshot reference does not exist/],
  ['missing-narration', /has no narration\/ghost\.txt/],
  ['missing-done', /instrumentation contract incomplete — missing __done/],
  ['total-endcheck', /TOTAL end-check .*done-under-total/],
  ['infinite-repeat', /video-guard:infinite-repeat/],
];
for (const [name, re] of RED) {
  const errors = errorsFor(path.join(FIXTURES, name));
  ok(errors.length === 1 && re.test(errors[0]),
    `${name}: exactly 1 error, matching ${re} (got: ${errors.join(' | ').slice(0, 90) || 'none'})`);
}

// ── Gates 3-4 removed 2026-08-22 with legacy retirement (see header). ───

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
