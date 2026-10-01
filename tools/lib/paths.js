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

// A product exists when any of its files does: product.json (local only, never
// committed), pack.json or snapshots/index.json (both committed). A fresh clone
// has only the last two, so they must be enough.
function productExists(key) {
  const dir = path.join(REPO_ROOT, 'products', key);
  return ['product.json', 'pack.json', path.join('snapshots', 'index.json')]
    .some((f) => fs.existsSync(path.join(dir, f)));
}
const unknownProduct = (key) =>
  new Error(`unknown product "${key}" — no products/${key}/ pack (product.json, pack.json or snapshots/index.json)`);

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
  if (!productExists(key)) throw unknownProduct(key);
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
// through here, so those films load the moved pack unchanged. Films that
// link the old local brand tokens get the WPForms pack's tokens.css.
const LEGACY_TOKENS_URL = '/reference/wpforms-brand/tokens.css';
function mapLegacySnapshotUrl(urlPath) {
  if (urlPath === LEGACY_TOKENS_URL) return '/products/wpforms/brand/tokens.css';
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
// On a fresh clone (no product.json) it falls back to the committed pack.json
// (key, name, classPrefixes, pluginDirs), or to { key } when only the
// snapshots exist.
function loadProduct(key = activeProduct()) {
  if (key === 'wpforms' && !fs.existsSync(productFile(key))) return null;
  if (!KEY_RE.test(key) || !productExists(key)) throw unknownProduct(key);
  if (fs.existsSync(productFile(key))) return JSON.parse(fs.readFileSync(productFile(key), 'utf8'));
  const packFile = path.join(REPO_ROOT, 'products', key, 'pack.json');
  const pack = fs.existsSync(packFile) ? JSON.parse(fs.readFileSync(packFile, 'utf8')) : {};
  return { key, displayName: pack.name, classPrefixes: [], ...pack };
}

// products/<key>/pack.json — the committed per-pack tool data: classPrefixes
// (the product's own CSS class / id prefixes) and pluginDirs (its WordPress
// plugin folders). product.json stays local; this is the part tools share.
// A pack without pack.json falls back to the WPForms one.
function loadPack(key = activeProduct()) {
  for (const k of [key, 'wpforms']) {
    const f = path.join(REPO_ROOT, 'products', k, 'pack.json');
    if (KEY_RE.test(k) && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  throw new Error('no products/wpforms/pack.json');
}

// A RegExp that matches any of the pack's class prefixes anywhere in a string.
function packClassRe(pack) {
  const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(pack.classPrefixes.map(esc).join('|'));
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
  loadPack,
  packClassRe,
};
