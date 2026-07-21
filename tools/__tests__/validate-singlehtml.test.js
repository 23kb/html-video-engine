#!/usr/bin/env node
// FIX-1 — static validator for single-HTML videos.
//
// Gates:
//   1. GREEN on the 4 canary videos (exit 0, zero errors).
//   2. RED on six fixtures each seeding exactly one violation class
//      (fixtures/validate-singlehtml/<case>/index.html).
//   3. Dispatch — validate-video.js on a manifest-less video delegates to
//      validate-singlehtml.js instead of stack-tracing; manifest videos
//      keep their legacy path.
//   4. --all sweep exits 0 (legacy skip list holds).
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
const CANARIES = [
  'form-analytics-complete-guide',
  'form-analytics-ad',
  'switch-to-wpforms-entry-importer',
  'klaviyo-quick-connect',
];
{
  const r = runTool('validate-singlehtml.js', CANARIES);
  ok(r.code === 0, `4 canaries validate clean (exit ${r.code})`);
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

// ── Gate 3: dispatch from validate-video.js ─────────────────────────────
section('Gate 3 — validate-video.js dispatch');
{
  const r = runTool('validate-video.js', ['switch-to-wpforms-entry-importer']);
  ok(r.code === 0, `manifest-less video exits 0 via dispatch (exit ${r.code})`);
  ok(/\[dispatch\] single-HTML/.test(r.out), 'dispatch line printed');
  ok(!/No manifest at|at loadVideo|throw/.test(r.out), 'no stack trace / raw loadVideo error');
}
{
  // a manifest video still runs the legacy path untouched
  const r = runTool('validate-video.js', ['wpforms-rest-api-overview']);
  ok(r.code === 0 && !/\[dispatch\]/.test(r.out), `manifest video (wpforms-rest-api-overview) keeps the legacy path and passes (exit ${r.code})`);
}

// ── Gate 4: --all sweep ─────────────────────────────────────────────────
section('Gate 4 — --all sweep green (legacy skip list holds)');
{
  const r = runTool('validate-singlehtml.js', ['--all']);
  ok(r.code === 0, `--all exits 0 (exit ${r.code})`);
  ok(/skipped \(/.test(r.out), 'legacy skips are reported, not silent');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
