#!/usr/bin/env node
// FIX-1 — runtime smoke for single-HTML videos (tools/smoke-singlehtml.js).
//
// Gates (each spawns the real CLI):
//   1. The ~3.5s mini-video fixture (2 say() cues via the shared hardened
//      helpers) smokes green: __T0, __done, ordered __sched, no errors.
//   2. The ?hang=1 variant (never sets __done) FAILS within its budget.
//   3. An uninstrumented video exits 2 (distinct from failure).
//
// Usage: node tools/__tests__/smoke-singlehtml.test.js

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = 'tools/__tests__/fixtures/mini-video/index.html';

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function smoke(args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'smoke-singlehtml.js'), ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 90000,
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

section('Gate 1 — fixture video smokes green');
{
  const r = smoke(['--path', FIXTURE, '--seconds', '10']);
  ok(r.code === 0, `exit 0 (got ${r.code})`);
  ok(/✓ __done in/.test(r.out), '__done reached');
  ok(/__sched: 2 cue\(s\), times non-decreasing/.test(r.out), '__sched: 2 cues, ordered');
  ok(/no page\/console errors/.test(r.out), 'no page/console errors');
}

section('Gate 2 — a video that never sets __done fails within budget');
{
  const t0 = Date.now();
  const r = smoke(['--path', `${FIXTURE}?hang=1`, '--seconds', '4']);
  const secs = (Date.now() - t0) / 1000;
  ok(r.code === 1, `exit 1 (got ${r.code})`);
  ok(/__done not reached/.test(r.out), 'reports __done not reached');
  ok(secs < 45, `fails within timeout (${secs.toFixed(0)}s)`);
}

section('Gate 3 — uninstrumented video exits 2, not 1');
{
  const r = smoke(['klaviyo-bridge-2', '--seconds', '5']);
  ok(r.code === 2, `exit 2 for missing __T0 (got ${r.code})`);
  ok(/not instrumented/.test(r.out), 'says "not instrumented"');
}

section('Gate 4 — FIX-9/issue-14: glide-warns FAIL by default');
{
  const r = smoke(['--path', `${FIXTURE}?glidewarn=1`, '--seconds', '10']);
  ok(r.code === 1, `default run FAILS on glide-warns (got ${r.code})`);
  ok(/✗ glide-warns: 1/.test(r.out), 'glide-warn counted as a failure');
  ok(/\[glideClick\] target not found/.test(r.out), 'warn text echoed');

  const lax = smoke(['--path', `${FIXTURE}?glidewarn=1`, '--seconds', '10', '--no-strict-glide']);
  ok(lax.code === 0, `--no-strict-glide downgrades to a warning (got ${lax.code})`);
  ok(/⚠ glide-warns: 1/.test(lax.out), 'downgraded warning line printed');

  const clean = smoke(['--path', FIXTURE, '--seconds', '10']);
  ok(clean.code === 0 && /no glide-warns/.test(clean.out), 'clean video passes the default (strict) mode');
}

section('Gate 5 — P0-4: beat motion overruns surfaced from __beatStats');
{
  const r = smoke(['--path', `${FIXTURE}?overrun=1`, '--seconds', '10']);
  ok(r.code === 0, `overrun is a warning, not a failure (got ${r.code})`);
  ok(/beat motion overruns/.test(r.out), 'overrun warning printed');
  ok(/one: motion 2(\.\d+)?s vs clip 1\.2s/.test(r.out), 'offending beat named with motion vs clip seconds');

  const clean = smoke(['--path', FIXTURE, '--seconds', '10']);
  ok(/beat motion within DUR/.test(clean.out), 'clean run reports instrumented beats within DUR');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
