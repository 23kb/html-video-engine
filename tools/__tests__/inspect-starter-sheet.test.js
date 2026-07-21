#!/usr/bin/env node
// FIX-4 (fa-retest 2026-07-13) — inspect-snapshot --emit-selectors starter
// sheet must be useful on NON-builder snapshots.
//
// Before: the starter classify() allowlists were builder-biased — on an
// admin-page snapshot (form-analytics-main) the sheet emitted 1/42 rows and
// `--filter stat` emitted 0 despite matching rows existing. After: outline.md
// role groups (Actions / Inputs / Tabs / Panels) feed the starter first-class,
// and an explicit --filter bypasses the starter subset entirely.
//
// Runs against a fixture snapshot dir via the WPF_SNAPSHOTS_DIR override —
// never a real snapshot.
//
// Usage: node tools/__tests__/inspect-starter-sheet.test.js

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

function emit(args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'inspect-snapshot.js'), 'fixture-admin-page', '--emit-selectors', ...args], {
    encoding: 'utf8',
    env: { ...process.env, WPF_SNAPSHOTS_DIR: FIXTURES },
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

section('Unfiltered starter — outline role groups included');
{
  const { code, out } = emit([]);
  ok(code === 0, `exits 0 (${code})`);
  ok(/Outline targets — actions/.test(out) && /"\.export-csv"/.test(out), 'outline Actions selector emitted');
  ok(/"#goal-input"/.test(out), 'outline Inputs selector emitted');
  ok(/"#field-table"/.test(out), 'outline Tabs selector emitted');
  ok(/"#ai-modal"/.test(out), 'outline Panels & modals selector emitted');
  ok((out.match(/"\.export-csv"/g) || []).length === 1, 'catalog duplicate of an outline selector dedupes (once)');
  ok(!/"\.random-thing"/.test(out), 'unclassified catalog rows still drop from the starter');
  ok(!/should-not-emit/.test(out), 'outline "Other anchors" section is not starter-grade');
  ok(/starter subset \+ outline targets/.test(out), 'mode line names the outline contribution');
}

section('--filter bypasses the starter subset');
{
  const { code, out } = emit(['--filter', 'stat']);
  ok(code === 0, `exits 0 (${code})`);
  ok(/Catalog rows matching --filter/.test(out) && /"\.stat-card"/.test(out), 'filter match emits the catalog row the old classifier dropped');
  ok(/filter match \(starter subset bypassed\)/.test(out), 'mode line says the subset was bypassed');
  ok(!/"\.random-thing"/.test(out), 'non-matching rows stay out');
}

section('--filter applies to outline targets too (case-insensitive)');
{
  const { out } = emit(['--filter', 'EXPORT']);
  ok((out.match(/"\.export-csv"/g) || []).length === 1, 'outline selector matches case-insensitively, once');
  ok(!/"#goal-input"/.test(out), 'non-matching outline targets stay out');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
