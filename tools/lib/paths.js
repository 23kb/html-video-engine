// paths.js — the one place that knows where snapshot roots live.
//
// VIDEO_PRODUCT=<key> points the snapshot tools at products/<key>/snapshots/.
// Unset = WPForms, at products/wpforms/snapshots/ (snapshots/ before the
// 2026-09-23 move; still honoured while that folder exists). The two older
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

// The WPForms pack lives in products/wpforms/snapshots/ like every other
// product (moved from snapshots/ on 2026-09-23). The old root is still used
// while it exists, so a checkout from before the move keeps working.
const WPFORMS_ROOT = path.join(REPO_ROOT, 'products', 'wpforms', 'snapshots');
const LEGACY_ROOT = path.join(REPO_ROOT, 'snapshots');

// A pack is its index.json: an emptied folder left behind (Windows can hold a
// directory open) is not a root.
const hasPack = (root) => fs.existsSync(path.join(root, 'index.json'));

function wpformsRoot() {
  return hasPack(LEGACY_ROOT) && !hasPack(WPFORMS_ROOT) ? LEGACY_ROOT : WPFORMS_ROOT;
}

function snapshotsRoot() {
  const key = productKey(); // validated even when an override wins
  if (process.env.WP_SNAPSHOT_ROOT) return process.env.WP_SNAPSHOT_ROOT;
  if (process.env.WPF_SNAPSHOTS_DIR) return process.env.WPF_SNAPSHOTS_DIR;
  if (key) return path.join(REPO_ROOT, 'products', key, 'snapshots');
  return wpformsRoot();
}

// Films and pages written before the move ask for /snapshots/<slug>/…. The
// repo servers (serve.js, preview.js, the render server) pass every URL
// through here, so those films load the moved pack unchanged.
function mapLegacySnapshotUrl(urlPath) {
  if (!/^\/snapshots(\/|$)/.test(urlPath) || hasPack(LEGACY_ROOT)) return urlPath;
  return '/products/wpforms/snapshots' + urlPath.slice('/snapshots'.length);
}

function snapshotDir(slug) {
  return path.join(snapshotsRoot(), slug);
}

// URL path of the root on the repo-root server (serve.js and the tools' own
// servers): /products/<key>/snapshots (WPForms: /products/wpforms/snapshots).
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
  mapLegacySnapshotUrl,
  snapshotDir,
  snapshotsUrlBase,
  snapshotUrlPath,
  activeProduct,
  loadProduct,
};
