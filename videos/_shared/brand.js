// videos/_shared/brand.js
//
// The film's brand, as data. A film names its product pack with
//   <meta name="film:product" content="<key>">
// and the shared engine (brand bug, end card, shorts bookends, task queue,
// cursor ripple / hover / marker colors) reads products/<key>/brand/brand.json
// instead of hard-coding WPForms. No meta = the WPForms pack.
//
// brand.json fields the engine reads:
//   name, url, cta          — "WPForms", "WPForms.com", "Full guide on WPForms.com"
//   aiName                  — task-queue title (optional; falls back to name)
//   mascot   { src, alt }   — brand bug, end card, shorts bookends
//   wordmark { src, alt }   — shorts bookends
//   colors   { primary }    — hex; accents, ripples, markers
//   shortIntroWash          — CSS background for the shorts intro (optional;
//                             derived from colors.primary when missing)
// Node tools read the same file (tools/lib/brand.js): voice, qcBrandRule.
//
// Loading: the WPForms pack is a static JSON import, so WPForms films load it
// with the module graph (no fetch at runtime, INV-9). Another pack loads with
// a dynamic import; if it is missing, the film falls back to WPForms and warns.
//
// On load this module sets --brand-primary and --brand-primary-rgb on :root so
// CSS can use var(--brand-primary, …) and rgba(var(--brand-primary-rgb), a).

import WPFORMS from '../../products/wpforms/brand/brand.json' with { type: 'json' };

export const WPFORMS_BRAND = WPFORMS;

function readFilmProduct() {
  if (typeof document === 'undefined') return 'wpforms';
  const meta = document.querySelector('meta[name="film:product"]');
  return (meta && (meta.getAttribute('content') || '').trim()) || 'wpforms';
}

export const filmProduct = readFilmProduct();

async function loadPack(key) {
  try {
    const url = new URL(`../../products/${key}/brand/brand.json`, import.meta.url);
    return (await import(url.href, { with: { type: 'json' } })).default;
  } catch (e) {
    console.warn(`[brand] no brand.json for "${key}" — using the WPForms brand`);
    return WPFORMS;
  }
}

const pack = filmProduct === 'wpforms' ? WPFORMS : await loadPack(filmProduct);

export const brand = {
  ...pack,
  colors: { primary: WPFORMS.colors.primary, ...(pack.colors || {}) },
};

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "r, g, b" of a hex color (default: the brand primary). */
export function brandRgb(hex = brand.colors.primary) {
  return hexToRgb(hex).join(', ');
}

/** rgba() string of the brand primary at `alpha`, e.g. 'rgba(226, 119, 48, 0.92)'. */
export function brandRgba(alpha, hex = brand.colors.primary) {
  return `rgba(${brandRgb(hex)}, ${alpha})`;
}

if (typeof document !== 'undefined') {
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', brand.colors.primary);
  root.setProperty('--brand-primary-rgb', brandRgb());
}
