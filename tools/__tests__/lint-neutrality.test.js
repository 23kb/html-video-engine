#!/usr/bin/env node
// lint-neutrality.js — the ratchet: passes on today's tree, fails when a file
// names WPForms more often than its baseline allows, and when a new file with
// hits is missing from the baseline.
//
// Usage: node tools/__tests__/lint-neutrality.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL = path.join(ROOT, 'tools', 'lint-neutrality.js');
const BASELINE = path.join(ROOT, 'tools', 'neutrality-baseline.json');

let failures = 0; let checks = 0;
function ok(cond, msg) { checks++; if (cond) console.log('  ✓ ' + msg); else { console.log('  ✗ ' + msg); failures++; } }
const run = (...args) => spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8' });

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const tmp = path.join(os.tmpdir(), `neutrality-baseline-${process.pid}.json`);

try {
  console.log('\nGate 1 — today\'s tree passes its baseline');
  const r1 = run();
  ok(r1.status === 0, `exit 0 on the committed baseline (got ${r1.status})`);

  console.log('\nGate 2 — a file above its baseline fails');
  const [file, n] = Object.entries(base).find(([, v]) => v > 1);
  fs.writeFileSync(tmp, JSON.stringify({ ...base, [file]: n - 1 }));
  const r2 = run('--baseline', tmp);
  ok(r2.status === 1, `exit 1 when ${file} is capped one below today (got ${r2.status})`);
  ok(r2.stdout.includes(file), 'the offending file is named');

  console.log('\nGate 3 — a file with hits that the baseline does not list fails');
  const { [file]: _, ...without } = base;
  fs.writeFileSync(tmp, JSON.stringify(without));
  const r3 = run('--baseline', tmp);
  ok(r3.status === 1, `exit 1 when ${file} is missing from the baseline (got ${r3.status})`);

  console.log('\nGate 4 — exempt paths are never counted');
  ok(!Object.keys(base).some((f) => /^products\/wpforms\//.test(f) || /^products\/[^/]+\/snapshots\//.test(f) || /skills\/dev-advocacy-video\//.test(f)),
    'no products/wpforms/, snapshots/ or dev-advocacy-video path in the baseline');
} finally {
  fs.rmSync(tmp, { force: true });
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
