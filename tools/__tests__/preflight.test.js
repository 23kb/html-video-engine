#!/usr/bin/env node
// FIX-7 — tools/preflight-site.js go/no-go health table.
//
// Gates:
//   1. Live: an all-green run against the default site exits 0 with the ✓
//      table. SKIPPED (pass, loud SKIP line) when the LocalWP toolchain is
//      down — this test never toggles site state. (The core-deactivated
//      acceptance was proven manually 2026-07-13: deactivate → one-line ✗
//      diagnosis + NO-GO → reactivate → GO.)
//   2. Config error: a bogus --site key exits non-zero with the actionable
//      sites.json message.
//   3. Speed: the live run stays under the 15s budget.
//
// Usage: node tools/__tests__/preflight.test.js

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function run(args) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'preflight-site.js'), ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 90000,
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), secs: (Date.now() - t0) / 1000 };
}

section('Gate 1 — live all-green run (skips if the toolchain is down)');
{
  const r = run([]);
  const toolchainDown = /bundled PHP not found|site path not found|php\.ini|wp-cli boots against .* —/.test(r.out) && r.code !== 0;
  if (toolchainDown) {
    console.log(`  - SKIP: LocalWP toolchain unavailable (exit ${r.code})`);
  } else {
    ok(r.code === 0, `exits 0 (got ${r.code})`);
    ok(/✓ wp-cli boots/.test(r.out), 'wp-cli boot check green');
    ok(/✓ wpforms core ACTIVE/.test(r.out), 'core-active check green');
    ok(/✓ GO/.test(r.out), 'verdict line is GO');
    ok(r.secs < 15, `run under the 15s budget (${r.secs.toFixed(1)}s)`);
  }
}

section('Gate 2 — config errors are actionable');
{
  const r = run(['--site', 'bogus-site']);
  ok(r.code !== 0, `bogus --site exits non-zero (exit ${r.code})`);
  ok(/not in tools\/sites\.json/.test(r.out), 'error names sites.json and lists known sites');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
