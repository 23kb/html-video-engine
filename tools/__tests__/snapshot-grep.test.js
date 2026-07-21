#!/usr/bin/env node
// FIX-6 (fa-retest 2026-07-13) — snapshot-grep: bounded-context extraction
// from snapshot HTML, replacing the ad-hoc node scripts every session
// re-writes when Grep chokes on 1 MB single-line files.
//
// Usage: node tools/__tests__/snapshot-grep.test.js

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'inspect-snapshot');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function run(argv) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'snapshot-grep.js'), ...argv], {
    encoding: 'utf8',
    env: { ...process.env, WPF_SNAPSHOTS_DIR: FIXTURES },
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

section('Basic match with bounded context');
{
  const { code, out } = run(['fixture-admin-page', 'stat-card-value">[^<]+', '--around', '40']);
  ok(code === 0, `exits 0 on match (${code})`);
  ok(/1,310/.test(out), 'match content printed');
  ok(/── match 1 @ \d+ ──/.test(out), 'match header carries the byte offset');
  const body = out.split('\n')[1] || '';
  ok(body.length <= 40 * 2 + 60, `context is bounded (~${body.length} chars)`);
}

section('--max caps output and reports the total');
{
  const { code, out } = run(['fixture-admin-page', 'stat-card', '--max', '2', '--around', '20']);
  ok(code === 0, 'exits 0');
  ok((out.match(/── match /g) || []).length === 2, 'exactly --max matches printed');
  ok(/matches total, showing 2/.test(out), 'total-vs-shown reported');
}

section('--strip collapses tags and entities');
{
  const { out } = run(['fixture-admin-page', 'MARKER', '--around', '120', '--strip']);
  ok(!/</.test(out.split('\n').slice(1).join('\n')), 'no tags in stripped context');
  ok(/Sullie's Bakery & /.test(out) || /MARKER/.test(out), 'entities decoded, text readable');
}

section('No match → exit 1');
{
  const { code, err } = run(['fixture-admin-page', 'zzz-not-present-zzz']);
  ok(code === 1, `exits 1 on no match (${code})`);
  ok(/no match/.test(err), 'says so on stderr');
}

section('Usage / missing snapshot → exit 2');
{
  ok(run(['fixture-admin-page']).code === 2, 'missing pattern → exit 2');
  ok(run(['no-such-slug', 'x']).code === 2, 'missing snapshot → exit 2');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
