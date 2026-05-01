// Cinematic-kit · theme presets.
//
// Tiny shared module — exports the three light-gradient presets used across
// every cinematic archetype, plus a `resolveTheme()` helper that picks a
// preset by name (with a sane fallback) and returns its background +
// cardShadow recipe.
//
// Accent color and any per-archetype theme options stay in the archetype
// module — this kit only canonicalizes the light gradient pool.
//
// Schema: see docs/cinematic-spec-contract.md.

export const THEMES = {
  'warm-cream': {
    background:
      'radial-gradient(60% 50% at 22% 20%, rgba(255,196,140,0.55), transparent 60%),' +
      'radial-gradient(55% 45% at 82% 78%, rgba(255,168,110,0.45), transparent 65%),' +
      'linear-gradient(180deg, #fff7ec 0%, #ffeedc 100%)',
    cardShadow: '0 30px 60px rgba(120, 60, 20, 0.15), 0 8px 20px rgba(120, 60, 20, 0.08)',
  },
  'cool-paper': {
    background:
      'radial-gradient(60% 50% at 78% 18%, rgba(140, 196, 255, 0.45), transparent 60%),' +
      'radial-gradient(55% 45% at 22% 80%, rgba(110, 168, 240, 0.32), transparent 65%),' +
      'linear-gradient(180deg, #f4f8fd 0%, #e7eef7 100%)',
    cardShadow: '0 30px 60px rgba(20, 60, 120, 0.14), 0 8px 20px rgba(20, 60, 120, 0.07)',
  },
  'neutral-fog': {
    background:
      'radial-gradient(60% 60% at 50% 28%, rgba(255,255,255,0.6), transparent 65%),' +
      'linear-gradient(180deg, #fafafa 0%, #eceef1 100%)',
    cardShadow: '0 30px 60px rgba(20, 22, 28, 0.12), 0 8px 20px rgba(20, 22, 28, 0.06)',
  },
};

/**
 * Resolve a theme option to a preset record.
 *
 * @param {{background?: string, accent?: string}|undefined} themeOpt
 *   — the spec's `theme` block (or undefined).
 * @param {string} [fallback='warm-cream']
 *   — preset name to use when `themeOpt.background` is absent or unknown.
 * @returns {{background: string, cardShadow: string}}
 *
 * Note: accent color is intentionally NOT resolved here. Each archetype
 * decides its own default accent (e.g. cause-effect → '#E27730',
 * workflow-map → '#056AAB') and reads `themeOpt.accent` itself.
 */
export function resolveTheme(themeOpt, fallback = 'warm-cream') {
  const name =
    (themeOpt && typeof themeOpt.background === 'string' && THEMES[themeOpt.background])
      ? themeOpt.background
      : fallback;
  return THEMES[name] || THEMES[fallback] || THEMES['warm-cream'];
}
