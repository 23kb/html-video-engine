#!/usr/bin/env node
// FIX-4 — post-capture.js pipeline: interactivity-link ordering + index.json
// auto-registration.
//
// Uses a temp COPY of a real small snapshot (form-analytics-date-open — one
// of the FA captures that shipped unlinked, which is exactly the bug) inside
// snapshots/ (the sub-tools hardcode that root). The global index.json and
// CATALOG.md are backed up and restored.
//
// Gates:
//   1. After one post-capture run: interactivity.js is linked and the fresh
//      outline does NOT say "not linked".
//   2. index.json gains the slug exactly once, with sourcePath from meta.json
//      and a TODO-describe placeholder for shows.
//   3. Second run is idempotent: no duplicate index entry, link is a no-op,
//      index entry unchanged.
//
// Usage: node tools/__tests__/post-capture-pipeline.test.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAP = require('../lib/paths').snapshotsRoot();
const SOURCE = 'form-analytics-date-open';
const TMP = 'zz-pc-pipeline-test'; // non-underscore: _-prefixed slugs are never index-registered (infra convention)
const TMP_DIR = path.join(SNAP, TMP);
const INDEX = path.join(SNAP, 'index.json');
const CATALOG_INDEX = path.join(SNAP, 'CATALOG.md');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function runPostCapture() {
  return execFileSync(process.execPath, [path.join(ROOT, 'tools', 'post-capture.js'), TMP], {
    cwd: ROOT, encoding: 'utf8', timeout: 180000,
  });
}
function indexEntries() {
  return JSON.parse(fs.readFileSync(INDEX, 'utf8')).snapshots.filter((s) => s.slug === TMP);
}

const indexBackup = fs.readFileSync(INDEX);
const catalogBackup = fs.existsSync(CATALOG_INDEX) ? fs.readFileSync(CATALOG_INDEX) : null;

try {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.cpSync(path.join(SNAP, SOURCE), TMP_DIR, { recursive: true });
  fs.rmSync(path.join(TMP_DIR, 'outline.md'), { force: true });
  const preLinked = fs.readFileSync(path.join(TMP_DIR, 'index.html'), 'utf8').includes('interactivity.js');
  ok(!preLinked, `fixture starts UNLINKED (real ${SOURCE} state — the bug being fixed)`);

  section('Gate 1 — one run: link happens before the outline');
  let out1 = '';
  try { out1 = runPostCapture(); } catch (e) { ok(false, `post-capture run failed: ${(e.message || '').split('\n')[0]}`); throw e; }
  ok(fs.readFileSync(path.join(TMP_DIR, 'index.html'), 'utf8').includes('interactivity.js'),
    'interactivity.js linked into the snapshot');
  const outline1 = fs.readFileSync(path.join(TMP_DIR, 'outline.md'), 'utf8');
  ok(!/is not linked/.test(outline1), 'fresh outline does NOT say "not linked"');

  section('Gate 2 — index.json auto-registration');
  const entries1 = indexEntries();
  ok(entries1.length === 1, `slug registered exactly once (${entries1.length})`);
  if (entries1.length === 1) {
    ok(/^TODO-describe/.test(entries1[0].shows), `shows defaults to a TODO-describe placeholder (${entries1[0].shows})`);
    ok(/^\/wp-admin\//.test(entries1[0].sourcePath), `sourcePath pulled from meta.json (${entries1[0].sourcePath})`);
    ok(Array.isArray(entries1[0].topics) && entries1[0].topics.length > 0, 'topics has slug-derived placeholders');
  } else { checks += 3; failures += 3; }
  ok(/index\.json: zz-pc-pipeline-test registered/.test(out1), 'registration reported in output');

  section('Gate 3 — second run is idempotent');
  const entrySnapshot = JSON.stringify(indexEntries()[0]);
  const out2 = runPostCapture();
  const entries2 = indexEntries();
  ok(entries2.length === 1, `still exactly one index entry (${entries2.length})`);
  ok(JSON.stringify(entries2[0]) === entrySnapshot, 'index entry unchanged on re-run');
  ok(/already-linked/.test(out2), 'interactivity re-link is a no-op');
  ok(/already registered/.test(out2), 'index re-registration is a no-op');

  section('Gate 4 — waitFor re-verify passes when the anchor survives');
  const metaPath = path.join(TMP_DIR, 'meta.json');
  const metaOrig = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  fs.writeFileSync(metaPath, JSON.stringify({ ...metaOrig, waitFor: 'body' }, null, 2));
  const out3 = runPostCapture();
  ok(/waitFor ✓ "body" still resolves/.test(out3), 'surviving anchor reported ✓');

  section('Gate 5 — waitFor re-verify FAILS loudly when the anchor is gone');
  fs.writeFileSync(metaPath, JSON.stringify({ ...metaOrig, waitFor: '#zz-missing-anchor-9999' }, null, 2));
  let failedRun = null;
  try { runPostCapture(); } catch (e) { failedRun = e; }
  ok(failedRun !== null && failedRun.status === 1, `pipeline exits 1 (got ${failedRun && failedRun.status})`);
  const failOut = failedRun ? String(failedRun.stdout || '') + String(failedRun.stderr || '') : '';
  ok(/NO LONGER RESOLVES/.test(failOut), 'loud "NO LONGER RESOLVES" message printed');
  ok(/waitFor anchor lost in: zz-pc-pipeline-test/.test(failOut), 'failing slug named in the summary');
} finally {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.writeFileSync(INDEX, indexBackup);
  if (catalogBackup) fs.writeFileSync(CATALOG_INDEX, catalogBackup);
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
