// Cinematic-kit · text helpers.
//
// Thin wrapper around runtime/animate-text.js. Captures the caption-line
// defaults that every cinematic archetype was duplicating (mask-reveal-up,
// role-caption, color #444, centered with bottom-anchored position).
//
// Returns the same `{ el, show, exit }` handle that `mountAnimateText`
// returns — callers `await captionHandle.show()` and `await
// captionHandle.exit({ ms })` exactly as before.

import { mountAnimateText } from '../animate-text.js';

const CAPTION_DEFAULTS = {
  preset: 'mask-reveal-up',
  role:   'caption',
  stagger: 18,
  color:   '#444444',
  position: { left: '50%', bottom: '12vh', transform: 'translateX(-50%)' },
};

/**
 * Mount a single caption line for a cinematic. Same return shape as
 * `mountAnimateText` — caller controls show()/exit() timing.
 *
 * @param {string} text
 * @param {object} [opts] — overrides merged on top of CAPTION_DEFAULTS.
 *   `opts.position` (if provided) replaces the default position object
 *   wholesale, so callers can move the caption to a different anchor
 *   (e.g. `bottom: '8vh'`) without partial-merge surprises.
 */
export function mountCaption(text, opts = {}) {
  const merged = { ...CAPTION_DEFAULTS, ...opts };
  if (opts.position) merged.position = opts.position;
  return mountAnimateText(text, merged);
}
