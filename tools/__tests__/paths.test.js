#!/usr/bin/env node
// tools/lib/paths.js — the snapshot-root helper (WO-001, product-neutral).
//
// Gates:
//   1. Default root — no env: snapshots/, /snapshots URLs, wpforms, no pack.
//   2. Product root — VIDEO_PRODUCT=<key>: products/<key>/snapshots/ + URLs.
//   3. Precedence — WP_SNAPSHOT_ROOT → WPF_SNAPSHOTS_DIR → product → default.
//   4. Unknown / invalid product throws, in-process and through a real tool.
//   5. A root outside the repo has no URL (throws, never a garbage path).
//
// Uses a temp product folder (products/zz-paths-test/) so it does not depend
// on any real product pack; the folder is removed in `finally`.
//
// Usage: node tools/__tests__/paths.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const paths = require('../lib/paths');

const TEST_KEY = 'zz-paths-test';
const TEST_DIR = path.join(ROOT, 'products', TEST_KEY);
const ENV_KEYS = ['VIDEO_PRODUCT', 'WP_SNAPSHOT_ROOT', 'WPF_SNAPSHOTS_DIR'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }
function setEnv(vars) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, vars);
}
function throwsWith(fn, re) {
  try { fn(); return false; } catch (e) { return re.test(e.message); }
}

try {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, 'product.json'),
    JSON.stringify({ key: TEST_KEY, displayName: 'Paths Test', classPrefixes: ['zz-'] }) + '\n');

  section('Gate 1 — default root (no env)');
  setEnv({});
  ok(paths.REPO_ROOT === ROOT, 'REPO_ROOT is the repo root');
  ok(paths.productKey() === null, 'productKey() is null');
  ok(paths.activeProduct() === 'wpforms', 'activeProduct() is wpforms');
  ok(paths.loadProduct() === null, 'loadProduct() is null for wpforms');
  ok(paths.snapshotsRoot() === path.join(ROOT, 'products', 'wpforms', 'snapshots'), 'snapshotsRoot() is <repo>/products/wpforms/snapshots');
  ok(paths.snapshotDir('admin-x') === path.join(path.join(ROOT, 'products', 'wpforms', 'snapshots'), 'admin-x'), 'snapshotDir() joins the slug');
  ok(paths.snapshotsUrlBase() === '/products/wpforms/snapshots', 'snapshotsUrlBase() is /products/wpforms/snapshots');
  ok(paths.snapshotUrlPath('admin-x') === '/products/wpforms/snapshots/admin-x/index.html', 'snapshotUrlPath() defaults to index.html');
  ok(paths.mapLegacySnapshotUrl('/snapshots/admin-x/index.html') === '/products/wpforms/snapshots/admin-x/index.html', 'an old /snapshots/ URL maps onto the moved pack');
  ok(paths.mapLegacySnapshotUrl('/videos/x/index.html') === '/videos/x/index.html', 'other URLs pass through');
  ok(paths.snapshotUrlPath('admin-x', 'outline.md') === '/products/wpforms/snapshots/admin-x/outline.md', 'snapshotUrlPath() takes a file');
  setEnv({ VIDEO_PRODUCT: '' });
  ok(paths.productKey() === null, 'an empty VIDEO_PRODUCT counts as unset');
  setEnv({ VIDEO_PRODUCT: 'wpforms' });
  const wpformsPack = fs.existsSync(path.join(ROOT, 'products', 'wpforms', 'product.json'));
  if (wpformsPack) {
    console.log('  (products/wpforms/product.json exists — the wpforms-as-unset checks do not apply)');
  } else {
    ok(paths.productKey() === null, 'VIDEO_PRODUCT=wpforms with no pack counts as unset');
    ok(paths.activeProduct() === 'wpforms', '… activeProduct() is wpforms');
    ok(paths.snapshotsRoot() === path.join(ROOT, 'products', 'wpforms', 'snapshots'), '… snapshotsRoot() is <repo>/products/wpforms/snapshots');
    ok(paths.loadProduct() === null, '… loadProduct() is null');
  }

  section('Gate 2 — product root');
  setEnv({ VIDEO_PRODUCT: TEST_KEY });
  const pRoot = path.join(ROOT, 'products', TEST_KEY, 'snapshots');
  ok(paths.productKey() === TEST_KEY, 'productKey() returns the key');
  ok(paths.activeProduct() === TEST_KEY, 'activeProduct() returns the key');
  ok((paths.loadProduct() || {}).displayName === 'Paths Test', 'loadProduct() parses product.json');
  ok(paths.snapshotsRoot() === pRoot, 'snapshotsRoot() is products/<key>/snapshots');
  ok(paths.snapshotsUrlBase() === `/products/${TEST_KEY}/snapshots`, 'snapshotsUrlBase() is /products/<key>/snapshots');
  ok(paths.snapshotUrlPath('admin-x') === `/products/${TEST_KEY}/snapshots/admin-x/index.html`, 'snapshotUrlPath() uses the product root');

  section('Gate 3 — precedence');
  const tmpA = path.join(os.tmpdir(), 'paths-test-a');
  const tmpB = path.join(os.tmpdir(), 'paths-test-b');
  setEnv({ VIDEO_PRODUCT: TEST_KEY, WP_SNAPSHOT_ROOT: tmpA, WPF_SNAPSHOTS_DIR: tmpB });
  ok(paths.snapshotsRoot() === tmpA, 'WP_SNAPSHOT_ROOT beats everything');
  setEnv({ VIDEO_PRODUCT: TEST_KEY, WPF_SNAPSHOTS_DIR: tmpB });
  ok(paths.snapshotsRoot() === tmpB, 'WPF_SNAPSHOTS_DIR beats the product root');
  setEnv({ VIDEO_PRODUCT: TEST_KEY });
  ok(paths.snapshotsRoot() === pRoot, 'the product root beats the default');
  setEnv({ WP_SNAPSHOT_ROOT: tmpA });
  ok(paths.activeProduct() === 'wpforms', 'an override alone does not change the active product');

  section('Gate 4 — unknown and invalid products');
  setEnv({ VIDEO_PRODUCT: 'nope' });
  ok(throwsWith(() => paths.productKey(), /unknown product "nope"/), 'productKey() throws unknown product');
  ok(throwsWith(() => paths.snapshotsRoot(), /unknown product "nope"/), 'snapshotsRoot() throws — no stray root');
  setEnv({ VIDEO_PRODUCT: 'nope', WP_SNAPSHOT_ROOT: tmpA });
  ok(throwsWith(() => paths.snapshotsRoot(), /unknown product "nope"/), 'a typo still throws when an override is set');
  setEnv({ VIDEO_PRODUCT: 'Bad_Key' });
  ok(throwsWith(() => paths.productKey(), /invalid VIDEO_PRODUCT/), 'a malformed key throws');
  setEnv({ VIDEO_PRODUCT: '../snapshots' });
  ok(throwsWith(() => paths.snapshotsRoot(), /invalid VIDEO_PRODUCT/), 'a path-like key throws');
  setEnv({});
  ok(throwsWith(() => paths.loadProduct('nope'), /unknown product "nope"/), 'loadProduct() throws on an unknown key');
  const env = { ...process.env, VIDEO_PRODUCT: 'nope' };
  for (const k of ['WP_SNAPSHOT_ROOT', 'WPF_SNAPSHOTS_DIR']) delete env[k];
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'list-snapshots.js')], { encoding: 'utf8', env });
  ok(r.status !== 0, `VIDEO_PRODUCT=nope list-snapshots.js exits non-zero (${r.status})`);
  ok(/unknown product "nope"/.test(r.stderr || ''), 'and says unknown product on stderr');

  section('Gate 5 — a root outside the repo has no URL');
  setEnv({ WP_SNAPSHOT_ROOT: tmpA });
  ok(throwsWith(() => paths.snapshotsUrlBase(), /outside the repo/), 'snapshotsUrlBase() throws');
  ok(throwsWith(() => paths.snapshotUrlPath('x'), /outside the repo/), 'snapshotUrlPath() throws');
} finally {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
