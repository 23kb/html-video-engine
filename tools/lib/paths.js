// paths.js — the one place that knows where snapshot roots live.
//
// VIDEO_PRODUCT=<key> points the snapshot tools at products/<key>/snapshots/.
// Unset = today's behaviour on snapshots/ (the WPForms root). The two older
// overrides keep working and win over the product root:
//   WP_SNAPSHOT_ROOT   — capture.js / capture-saas.js test sandboxes
//   WPF_SNAPSHOTS_DIR  — inspect-snapshot.js / snapshot-grep.js fixtures
//
// Everything is resolved per call (no caching), so a test can change the env
// between calls. CommonJS, no dependencies.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function productFile(key) {
  return path.join(REPO_ROOT, 'products', key, 'product.json');
}

// The active product key, or null for WPForms. A typo must never create a
// stray root, so an unknown key throws instead of falling back. `wpforms`
// counts as unset until its pack (products/wpforms/product.json) exists.
function productKey() {
  const key = process.env.VIDEO_PRODUCT;
  if (!key) return null;
  if (key === 'wpforms' && !fs.existsSync(productFile(key))) return null;
  if (!KEY_RE.test(key)) {
    throw new Error(`invalid VIDEO_PRODUCT "${key}" — use a lowercase key like wp-mail-smtp`);
  }
  if (!fs.existsSync(productFile(key))) {
    throw new Error(`unknown product "${key}" — no products/${key}/product.json`);
  }
  return key;
}

function snapshotsRoot() {
  const key = productKey(); // validated even when an override wins
  if (process.env.WP_SNAPSHOT_ROOT) return process.env.WP_SNAPSHOT_ROOT;
  if (process.env.WPF_SNAPSHOTS_DIR) return process.env.WPF_SNAPSHOTS_DIR;
  if (key) return path.join(REPO_ROOT, 'products', key, 'snapshots');
  return path.join(REPO_ROOT, 'snapshots');
}

function snapshotDir(slug) {
  return path.join(snapshotsRoot(), slug);
}

// URL path of the root on the repo-root server (serve.js and the tools' own
// servers): /snapshots or /products/<key>/snapshots.
function snapshotsUrlBase() {
  const root = snapshotsRoot();
  const rel = path.relative(REPO_ROOT, root);
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    throw new Error(`snapshot root ${root} is outside the repo — it has no URL on the repo server`);
  }
  return '/' + rel.split(path.sep).join('/');
}

function snapshotUrlPath(slug, file = 'index.html') {
  return `${snapshotsUrlBase()}/${slug}/${file}`;
}

// Use this to gate WPForms-only steps.
function activeProduct() {
  return productKey() || 'wpforms';
}

// Parsed products/<key>/product.json, or null for wpforms while it has no pack.
function loadProduct(key = activeProduct()) {
  if (key === 'wpforms' && !fs.existsSync(productFile(key))) return null;
  if (!KEY_RE.test(key) || !fs.existsSync(productFile(key))) {
    throw new Error(`unknown product "${key}" — no products/${key}/product.json`);
  }
  return JSON.parse(fs.readFileSync(productFile(key), 'utf8'));
}

module.exports = {
  REPO_ROOT,
  productKey,
  snapshotsRoot,
  snapshotDir,
  snapshotsUrlBase,
  snapshotUrlPath,
  activeProduct,
  loadProduct,
};
