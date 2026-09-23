// tools/lib/brand.js — a film's brand pack, for Node tools.
//
// A film names its product with <meta name="film:product" content="<key>">;
// no meta = WPForms. Its brand lives in products/<key>/brand/brand.json (the
// same file videos/_shared/brand.js loads in the browser). Tools read:
//   voice        — TTS voice key: ELEVENLABS_VOICE_ID_<voice> / FISHAUDIO_VOICE_ID_<voice>
//   name         — product name for prompts
//   colors       — { primary }
//   qcBrandRule  — the BRAND line of the machine-QC checklist

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KEY_RE = /^[a-z0-9][a-z0-9-]*$/;

// The film's declared product key, or 'wpforms'.
function filmProduct(slug) {
  if (!slug) return 'wpforms';
  let html = '';
  try { html = fs.readFileSync(path.join(REPO_ROOT, 'videos', slug, 'index.html'), 'utf8'); } catch (_) { return 'wpforms'; }
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (!/\bname\s*=\s*["']film:product["']/i.test(tag)) continue;
    const m = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    const key = m && m[1].trim();
    if (key && KEY_RE.test(key)) return key;
  }
  return 'wpforms';
}

// products/<key>/brand/brand.json, falling back to the WPForms pack.
function loadBrand(key = 'wpforms') {
  for (const k of [key, 'wpforms']) {
    const f = path.join(REPO_ROOT, 'products', k, 'brand', 'brand.json');
    if (KEY_RE.test(k) && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  throw new Error('no products/wpforms/brand/brand.json');
}

function brandForFilm(slug) {
  return loadBrand(filmProduct(slug));
}

module.exports = { filmProduct, loadBrand, brandForFilm };
