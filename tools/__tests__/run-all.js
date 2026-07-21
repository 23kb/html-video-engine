#!/usr/bin/env node
// Unified test runner — discovers tools/__tests__/*.test.js, runs each as a
// child process, prints a summary table, exits non-zero if any fail.
//
// Usage:
//   node tools/__tests__/run-all.js              (all tests, each in its fast default mode)
//   node tools/__tests__/run-all.js <filter>     (only test files whose name contains <filter>)
//   node tools/__tests__/run-all.js --all        (forward --all to every test — full-gate mode)
//
// Convention (see generate-snapshot-outline.test.js): each test is a
// self-contained Node script printing ✓/✗ per check and exiting non-zero on
// failure. No test framework — do not add one.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const args = process.argv.slice(2);
const forward = args.filter(a => a.startsWith('--'));
const filter = args.find(a => !a.startsWith('--')) || '';

const tests = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.test.js'))
  .filter(f => f.includes(filter))
  .sort();

if (!tests.length) {
  console.error(`No test files matching "${filter}" in ${DIR}`);
  process.exit(2);
}

const results = [];
for (const file of tests) {
  console.log(`\n━━━ ${file} ━━━`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(DIR, file), ...forward], {
    stdio: 'inherit',
    cwd: path.resolve(DIR, '..', '..'),
  });
  results.push({ file, code: r.status === null ? 1 : r.status, secs: ((Date.now() - t0) / 1000).toFixed(1) });
}

const failed = results.filter(r => r.code !== 0);
const width = Math.max(...results.map(r => r.file.length));
console.log('\n' + '═'.repeat(width + 18));
for (const r of results) {
  console.log(`${r.code === 0 ? '✓ PASS' : '✗ FAIL'}  ${r.file.padEnd(width)}  ${r.secs}s`);
}
console.log('═'.repeat(width + 18));
console.log(`${results.length - failed.length}/${results.length} test files passed`);
process.exit(failed.length ? 1 : 0);
