#!/usr/bin/env node
// FIX-9 — stable wp-cli: vendored phar + tools/site-eval.js wrapper.
//
// Gates:
//   1. The phar is vendored at tools/vendor/wp-cli.phar (no more Temp roulette).
//   2. tools/sites.json parses and has the default site with all path fields.
//   3. Live: `site-eval.js "echo 1+1;"` prints 2. SKIPPED (pass, with a loud
//      SKIP line) when LocalWP isn't running / the site is unreachable —
//      config errors still fail.
//   4. A bogus --site name exits non-zero with the actionable message.
//
// Usage: node tools/__tests__/site-eval.test.js

const fs = require('fs');
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

section('Gate 1 — vendored phar');
ok(fs.existsSync(path.join(ROOT, 'tools', 'vendor', 'wp-cli.phar')), 'tools/vendor/wp-cli.phar exists');

section('Gate 2 — sites.json registry');
let reg = null;
try { reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'sites.json'), 'utf8')); } catch (_) {}
ok(Boolean(reg && reg.default && reg.sites && reg.sites[reg.default]), 'sites.json parses with a default site');
if (reg && reg.sites[reg.default]) {
  const s = reg.sites[reg.default];
  ok(Boolean(s.url && s.path && s.php && s.phpIni), 'default site has url/path/php/phpIni');
}

section('Gate 3 — live eval (skips if the site toolchain is down)');
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'site-eval.js'), 'echo 1+1;'], {
    cwd: ROOT, encoding: 'utf8', timeout: 90000,
  });
  const out = (r.stdout || '').trim();
  const err = r.stderr || '';
  if (r.status === 2 || /database connection|not found|php\.ini/i.test(err) && r.status !== 0) {
    console.log(`  - SKIP: site toolchain unavailable (exit ${r.status}) — ${err.split('\n')[0]}`);
  } else {
    ok(r.status === 0 && out.endsWith('2'), `echo 1+1; prints 2 (got "${out.slice(-20)}", exit ${r.status})`);
  }
}

section('Gate 4 — config errors are actionable');
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'site-eval.js'), 'echo 1;', '--site', 'bogus-site'], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000,
  });
  ok(r.status !== 0, `bogus --site exits non-zero (exit ${r.status})`);
  ok(/not in tools\/sites\.json/.test(r.stderr || ''), 'error names sites.json and lists known sites');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
