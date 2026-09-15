// videos/_shared/effects/waveform-bars.js
//
// WAVEFORM BARS (xai T2) + PULSE EMPHASIS (xai T6) — the "there is audio here"
// idiom. N bars ladder in to their resting heights, then breathe at a fixed
// frequency with per-bar amplitudes drawn from a SEEDED generator, so the
// pattern looks organic and renders byte-identical every time. `pulseEmphasis`
// is the paired press-reaction: the exact 1 → 0.8 → 1.1 → 1 bounce ratios.
//
// Source: videos/reel-ad-vocabulary/index.html beat b6 (ad-vocabulary proving
// reel, 2026-09-03 — motion-audit tier A, seam-gate PASS). Constants T2 and T6
// from docs/xai-voice-motion-rnd-2026-09-02.md (AE teardown).
// Vocabulary slot: audio — seeded waveform + press pulse
//
// Determinism: amplitudes come from mulberry32(seed), never Math.random(); the
// breathe loop takes a computed finite repeat from its on-screen window, never
// `repeat: -1` (INV-9).
//
// `pulseEmphasis` ships here rather than in its own module because T2 and T6
// are one beat in practice — the bars say "audio", the pulse says "played".
// It is target-agnostic: pass any element (a play chip, a button, a card).

/* global gsap */

import { disposeEffect, mountStyle, nextEffectId, resolveColor } from './_utils.js';
import { boundedRepeats, mulberry32 } from './_determinism.js';

const SCOPE = 'fx-waveform-bars';

function css(id, barWidth, barHeight) {
  return `
    #${id}.${SCOPE} { display: flex; align-items: center; justify-content: space-between; }
    #${id} .wbar { width: ${barWidth}px; height: ${barHeight}px; border-radius: ${barWidth / 2}px;
      background: var(--fx-wave-accent, #E27730); transform-origin: 50% 50%; opacity: 0;
      will-change: transform, opacity; }
  `;
}

/**
 * @param {Object} opts
 * @param {number} [opts.count=15]
 * @param {number} [opts.seed=0x57A9E5] — change it for a different silhouette
 * @param {number} [opts.width=600]
 * @param {number} [opts.height=150]
 * @param {number} [opts.barWidth=22]
 * @param {number} [opts.barHeight=130] — the bar's un-scaled height
 * @param {[number,number]} [opts.rest=[0.22, 0.44]] — resting scaleY range
 * @param {[number,number]} [opts.swing=[15, 47]] — breathe amplitude in px
 * @param {number} [opts.parkScaleY=0.06] — the flat line before the ladder
 * @param {string} [opts.accent='orange']
 * @returns {{ el, bars, specs, tweenInto, wiggle, dispose }}
 */
export function mountWaveformBars({
  count = 15,
  seed = 0x57A9E5,
  width = 600,
  height = 150,
  barWidth = 22,
  barHeight = 130,
  rest = [0.22, 0.44],
  swing = [15, 47],
  parkScaleY = 0.06,
  accent = 'orange',
} = {}) {
  const id = nextEffectId(SCOPE);
  const style = mountStyle(`${id}-style`, css(id, barWidth, barHeight));

  const el = document.createElement('div');
  el.id = id;
  el.className = SCOPE;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  if (accent) el.style.setProperty('--fx-wave-accent', resolveColor(accent));

  const rng = mulberry32(seed);
  const specs = [];
  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'wbar';
    el.appendChild(bar);
    const base = rest[0] + rng() * (rest[1] - rest[0]);          // resting scaleY
    const amp = (swing[0] + rng() * (swing[1] - swing[0])) / barHeight;
    specs.push({ el: bar, base, hi: Math.min(1, base + amp) });
  }
  const bars = specs.map((s) => s.el);

  if (typeof gsap !== 'undefined') gsap.set(bars, { scaleY: parkScaleY });

  const refs = { el, style };

  /** Bars ladder in to their resting heights (T1/T2 40ms ladder). */
  function tweenInto(tl, {
    position = 0,
    duration = 0.30,
    ease = 'power3.out',
    stagger = 0.04,
  } = {}) {
    specs.forEach(({ el: bar, base }, i) => {
      tl.to(bar, { autoAlpha: 1, scaleY: base, duration, ease }, position + i * stagger);
    });
    return tl;
  }

  /**
   * Breathe at `hz`, for exactly `window` seconds of screen time.
   * The yoyo half-cycle is 1/(2·hz) and the repeat count is computed from the
   * window — a finite count, never `repeat: -1` (INV-9; yoyo callers pass HALF
   * the cycle, rulebook sfb 9).
   */
  function wiggle(tl, {
    position = 0,
    hz = 3,
    window: visible = 2.3,
    stagger = 0.04,
    ease = 'sine.inOut',
  } = {}) {
    const half = 1 / (2 * hz);
    const repeat = boundedRepeats(half, visible);
    specs.forEach(({ el: bar, hi }, i) => {
      tl.to(bar, { scaleY: hi, duration: half, ease, yoyo: true, repeat }, position + i * stagger);
    });
    return tl;
  }

  return {
    el,
    bars,
    specs,
    tweenInto,
    wiggle,
    dispose() { disposeEffect(refs); },
  };
}

/**
 * xai T6 — bounce-scale press pulse: 1 → 0.8 → 1.1 → 1, on the exact AEP
 * ratios and durations. Target-agnostic; pair it with a cursor tap landing on
 * the same frame.
 *
 * @param {gsap.core.Timeline} tl
 * @param {HTMLElement|string} target
 * @param {Object} [opts]
 * @param {number} [opts.position=0] — the press frame on the master timeline
 */
export function pulseEmphasis(tl, target, {
  position = 0,
  down = 0.8,
  over = 1.1,
  downDuration = 0.18,
  overDuration = 0.30,
  settleDuration = 0.25,
} = {}) {
  tl.to(target, { scale: down, duration: downDuration, ease: 'power2.in' }, position);
  tl.to(target, { scale: over, duration: overDuration, ease: 'back.out(2)' }, position + downDuration);
  tl.to(target, { scale: 1, duration: settleDuration, ease: 'power2.inOut' },
    position + downDuration + overDuration);
  return tl;
}
