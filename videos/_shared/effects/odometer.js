// videos/_shared/effects/odometer.js
//
// INLINE ODOMETER — a big number that ARRIVES rather than counts. Each digit is
// a masked slot holding a 0-9-0 strip; the strips roll to their targets on a
// per-column ease with a short stagger, separators fade in behind them, and the
// whole line takes a settle nod as the value lands.
//
// Source: videos/reel-ad-vocabulary/index.html beat b4 (ad-vocabulary proving
// reel, 2026-09-03 — motion-audit tier A, seam-gate PASS). Roll ease is E1
// `whipSettle` from docs/xai-voice-motion-rnd-2026-09-02.md ("The ease
// language"): instant launch, mile-long decel.
// Vocabulary slot: stat — rolling digit columns
//
// WHY NOT stat-count-up.js: that effect is a CARD whose value is a text node
// tweened by a numeric proxy — one number, one line, ground-agnostic white
// surface. This is a different mechanism (per-digit masked strips, physical
// travel, separators that arrive after the digits) and a different DOM. They
// are siblings, not modes. `mountStatCountUp` is untouched — pick it when the
// number should tick up, pick this when the number should land.
//
// Two modes, one builder, on purpose: `live: true` builds rolling strips,
// `live: false` builds settled glyphs in the SAME slot layout. That is what
// makes a §2.3 pixel-matched hard cut between a rolled number and its static
// twin hold by construction rather than by eyeballing.
//
// Deterministic by construction — the displayed value is a pure function of
// tween progress, so any seek reproduces the exact same frame.
//
// Ground: DARK (cream glyphs); restyle the --fx-odo-* vars for a light bed.

/* global gsap */

import { disposeEffect, escapeHtml, mountStyle, nextEffectId, resolveColor } from './_utils.js';

const SCOPE = 'fx-odometer';

function css(id, slotW, slotH, sepW, plusW, glyphSize) {
  return `
    #${id}.${SCOPE} { position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 22px; }
    #${id} .stat-kicker { font-size: 26px; font-weight: 700; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--fx-odo-ink-mute, #8a8678); }
    #${id} .stat-line { display: flex; align-items: center; height: ${slotH}px; }
    #${id} .odo-slot { position: relative; width: ${slotW}px; height: ${slotH}px; overflow: hidden; }
    #${id} .odo-strip { position: absolute; left: 0; top: 0; width: ${slotW}px; will-change: transform; }
    #${id} .odo-glyph, #${id} .odo-sep { font-variant-numeric: tabular-nums; font-size: ${glyphSize}px;
      font-weight: 800; color: var(--fx-odo-ink, #f4ecd9); line-height: ${slotH}px; text-align: center; }
    #${id} .odo-glyph { width: ${slotW}px; height: ${slotH}px; }
    #${id} .odo-sep { width: ${sepW}px; }
    #${id} .odo-plus { width: ${plusW}px; color: var(--fx-odo-accent, #E27730); }
    #${id} .stat-tail { font-size: 34px; font-weight: 600; color: var(--fx-odo-ink-soft, #d9d2c0); }
  `;
}

/**
 * @param {Object} opts
 * @param {number[]} [opts.digits=[6,0,0,0,0,0,0]] — one entry per slot, left to right
 * @param {number[]} [opts.separatorAfter=[0,3]] — slot indexes a separator follows
 * @param {string} [opts.separator=',']
 * @param {string} [opts.suffix='+'] — accent glyph closing the line ('' to omit)
 * @param {string} [opts.kicker='Trusted by'] — small line above ('' to omit)
 * @param {string} [opts.tail='smart business owners'] — small line below ('' to omit)
 * @param {boolean} [opts.live=true] — true: rolling strips. false: settled glyphs
 *        in the identical layout (the pixel-match twin for a §2.3 hard cut).
 * @param {number} [opts.slotWidth=76]
 * @param {number} [opts.slotHeight=124] — also the roll distance per digit
 * @param {string} [opts.accent='orange']
 * @returns {{ el, line, strips, separators, tweenInto, dispose }}
 */
export function mountOdometer({
  digits = [6, 0, 0, 0, 0, 0, 0],
  separatorAfter = [0, 3],
  separator = ',',
  suffix = '+',
  kicker = 'Trusted by',
  tail = 'smart business owners',
  live = true,
  slotWidth = 76,
  slotHeight = 124,
  separatorWidth = 40,
  suffixWidth = 66,
  glyphSize = 112,
  accent = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`,
    css(id, slotWidth, slotHeight, separatorWidth, suffixWidth, glyphSize));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  if (accent) el.style.setProperty('--fx-odo-accent', resolveColor(accent));
  el.innerHTML =
    (kicker ? '<div class="stat-kicker">' + escapeHtml(kicker) + '</div>' : '') +
    '<div class="stat-line"></div>' +
    (tail ? '<div class="stat-tail">' + escapeHtml(tail) + '</div>' : '');

  const line = el.querySelector('.stat-line');
  const sepAfter = new Set(separatorAfter);
  const strips = [];

  digits.forEach((d, i) => {
    const slot = document.createElement('span');
    slot.className = 'odo-slot';
    if (live) {
      const strip = document.createElement('span');
      strip.className = 'odo-strip';
      // 0..9 then a duplicate 0 so zero-targets still travel a full turn.
      for (let g = 0; g <= 10; g++) {
        const gl = document.createElement('span');
        gl.className = 'odo-glyph';
        gl.textContent = String(g % 10);
        gl.style.display = 'block';
        strip.appendChild(gl);
      }
      slot.appendChild(strip);
      strips.push({ strip, target: d === 0 ? 10 : d });
    } else {
      const gl = document.createElement('span');
      gl.className = 'odo-glyph';
      gl.style.display = 'block';
      gl.textContent = String(d);
      slot.appendChild(gl);
    }
    line.appendChild(slot);
    if (sepAfter.has(i)) {
      const sep = document.createElement('span');
      sep.className = 'odo-sep';
      sep.textContent = separator;
      line.appendChild(sep);
    }
  });

  if (suffix) {
    const plus = document.createElement('span');
    plus.className = 'odo-sep odo-plus';
    plus.textContent = suffix;
    line.appendChild(plus);
  }

  const separators = Array.from(line.querySelectorAll('.odo-sep'));

  // Separators + suffix arrive WITH the roll; the static twin is fully settled
  // from frame 0 (its scene is invisible until the cut).
  if (live && typeof gsap !== 'undefined') gsap.set(separators, { autoAlpha: 0 });

  const refs = { el, style };

  /**
   * @param {gsap.core.Timeline} tl
   * @param {Object} [opts]
   * @param {number} [opts.position=0] — beat start on the master timeline
   * @param {number} [opts.rollAt=0.75] — first column launches, relative to position
   * @param {number} [opts.rollStagger=0.04] — per-column launch offset
   * @param {number} [opts.rollDuration=1.30] — first column's travel time
   * @param {number} [opts.rollDecay=0.05] — each column right of it finishes sooner
   * @param {string} [opts.ease='whipSettle'] — E1; call registerXaiEases() first
   * @param {number} [opts.separatorAt=2.05] — separators fade in, relative to position
   * @param {boolean} [opts.settle=true] — settle nod on the line as the value lands
   */
  function tweenInto(tl, {
    position = 0,
    rollAt = 0.75,
    rollStagger = 0.04,
    rollDuration = 1.30,
    rollDecay = 0.05,
    ease = 'whipSettle',
    separatorAt = 2.05,
    separatorDuration = 0.30,
    separatorStagger = 0.05,
    settle = true,
    settleAt = 2.06,
    settleScale = 1.03,
    settleDuration = 0.24,
  } = {}) {
    if (!live) return tl;
    strips.forEach(({ strip, target }, i) => {
      tl.to(strip, { y: -target * slotHeight, duration: rollDuration - i * rollDecay, ease },
        position + rollAt + i * rollStagger);
    });
    if (separators.length) {
      tl.to(separators, { autoAlpha: 1, duration: separatorDuration, ease: 'power3.out',
        stagger: separatorStagger }, position + separatorAt);
    }
    if (settle) {
      tl.to(line, { scale: settleScale, duration: settleDuration, ease: 'sine.inOut',
        yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, position + settleAt);
    }
    return tl;
  }

  return {
    el,
    line,
    strips,
    separators,
    tweenInto,
    dispose() { disposeEffect(refs); },
  };
}
