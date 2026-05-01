// Tilt-on-focus — subtler sibling of popOut.
//
// Same clone-into-parent-doc choreography as popOut, but *without* the
// lift and drop-shadow. The element rotates on the Y axis in place, so
// it reads as "this UI block just turned to look at you" rather than
// "this UI block popped out of the page". Good when popOut would be
// too dramatic.
//
// Authoring:
//   { id: 'settle', do: 'tiltFocus', target: '#wpforms-save', tiltY: 12 }

import { popOut } from './pop-out.js';

/**
 * Clone-and-tilt, no lift, no shadow.
 *
 * @param {string} sel
 * @param {object} [opts]
 * @param {number} [opts.tiltY=10]   - Y-axis degrees (main read)
 * @param {number} [opts.riseMs=420]
 * @param {number} [opts.holdMs=900]
 * @param {number} [opts.fallMs=280]
 */
export async function tiltFocus(sel, opts = {}) {
  const { tiltY = 10, riseMs = 420, holdMs = 900, fallMs = 280 } = opts;
  await popOut(sel, {
    tilt:   tiltY,
    // Explicit tiltX: 0 so tiltFocus rotates on Y axis only. popOut's
    // default auto-derives tiltX from tilt for its 2-axis card lean —
    // wrong look for tiltFocus, which is meant to be pure Y rotation.
    tiltX:  0,
    lift:   1.0,
    shadow: false,
    border: false,
    stripTextShadow: true,
    centerOrigin: true,
    riseMs, holdMs, fallMs,
    hideOriginal: true,
  });
}
