// videos/_shared/shorts-bot.js
//
// The spam-bot antagonist — an ORIGINAL character for the shorts path.
//
// Why it exists (Umair QC r3, 2026-08-13): the spam beats were carried by
// abstractions (a panel tremor, junk text appearing). A visible antagonist
// reads instantly at phone size and, crucially, lets a short have an ARC —
// meet the bot, learn the defence, watch the bot bounce. Identity continuity
// is the repo's best-scoring editorial pattern; this makes it available to
// the spam family of shorts (stop-fast-bots, spam-safety-net,
// block-a-country, pick-a-captcha).
//
// ⚠ ORIGINAL ASSET, DELIBERATELY. Reference images Umair sent were
// SocketLabs' and Valimail's marketing art — third-party assets we cannot
// ship. The *register* was the brief (dark plate body, flaring red eyes,
// menacing but cartoonish); every path here is drawn for this repo. Inline
// SVG rather than a bitmap so the eyes, arms and recoil animate and it stays
// crisp at 1080×1920.
//
// Deterministic (INV-9): no Math.random, no Date.now, no infinite repeats.
// Arm "blur" is a bounded yoyo plus static ghost copies, not RNG jitter.
//
// Filters note: the eye glow is an SVG filter INSIDE this SVG. That is safe —
// the rule it must not break is CSS `filter` on an ancestor of a real-UI
// IFRAME (reference_iframe_filter_blur). Mount the bot as an editorial layer
// above the stage or above a parent-doc composite card, never as a filtered
// ancestor of the iframe.

/* eslint-env browser */
/* global gsap */

import { boundedRepeats } from './motion-primitives.js';

let _uid = 0;

const PALETTE = {
  plate: '#22262e',
  plateDark: '#171a20',
  plateLight: '#2e333d',
  edge: '#3d434f',
  eye: '#ff2f2f',
  eyeCore: '#ffd9d9',
};

/**
 * Mount the spam bot.
 *
 * @param {HTMLElement} host — stage or any positioned editorial layer
 * @param {Object} [opts]
 * @param {number} [opts.x=540] [opts.y=900] — stage coords of the bot centre
 * @param {number} [opts.scale=1]
 * @param {number} [opts.width=300] — intrinsic width in stage px
 * @param {number} [opts.zIndex=64]
 * @returns {{el, svg, parts, enter, eyesOn, attack, recoil, exit, dispose}}
 */
export function mountSpamBot(host, opts = {}) {
  const {
    x = 540, y = 900, scale = 1, width = 300, zIndex = 64,
  } = opts;
  const id = `spambot-${++_uid}`;

  const el = document.createElement('div');
  el.className = 'spam-bot';
  el.id = id;
  Object.assign(el.style, {
    position: 'absolute', left: '0px', top: '0px',
    width: width + 'px',
    zIndex: String(zIndex),
    pointerEvents: 'none',
    visibility: 'hidden',        // parked at parse (seek-trap #1)
  });

  el.innerHTML = `
<svg viewBox="0 0 200 250" width="100%" xmlns="http://www.w3.org/2000/svg" aria-label="Spam bot">
  <defs>
    <filter id="${id}-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="${id}-plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PALETTE.plateLight}"/>
      <stop offset="100%" stop-color="${PALETTE.plateDark}"/>
    </linearGradient>
  </defs>

  <!-- antenna -->
  <g class="bot-antenna">
    <rect x="97" y="8" width="6" height="26" rx="3" fill="${PALETTE.edge}"/>
    <circle class="bot-bulb" cx="100" cy="10" r="9" fill="${PALETTE.eye}" filter="url(#${id}-glow)"/>
  </g>

  <!-- arms: transform-origin at the shoulder, set below via GSAP -->
  <g class="bot-arm bot-arm-l">
    <rect x="16" y="112" width="26" height="74" rx="13" fill="url(#${id}-plate)" stroke="${PALETTE.edge}" stroke-width="3"/>
    <rect x="14" y="176" width="30" height="22" rx="9" fill="${PALETTE.plateLight}" stroke="${PALETTE.edge}" stroke-width="3"/>
  </g>
  <g class="bot-arm bot-arm-r">
    <rect x="158" y="112" width="26" height="74" rx="13" fill="url(#${id}-plate)" stroke="${PALETTE.edge}" stroke-width="3"/>
    <rect x="156" y="176" width="30" height="22" rx="9" fill="${PALETTE.plateLight}" stroke="${PALETTE.edge}" stroke-width="3"/>
  </g>

  <!-- body -->
  <g class="bot-body">
    <rect x="44" y="128" width="112" height="104" rx="22" fill="url(#${id}-plate)" stroke="${PALETTE.edge}" stroke-width="4"/>
    <rect x="66" y="152" width="68" height="10" rx="5" fill="${PALETTE.edge}" opacity="0.75"/>
    <rect x="66" y="172" width="46" height="10" rx="5" fill="${PALETTE.edge}" opacity="0.55"/>
    <rect x="66" y="192" width="58" height="10" rx="5" fill="${PALETTE.edge}" opacity="0.4"/>
  </g>

  <!-- head -->
  <g class="bot-head">
    <rect x="34" y="34" width="132" height="92" rx="26" fill="url(#${id}-plate)" stroke="${PALETTE.edge}" stroke-width="4"/>
    <g class="bot-eyes" filter="url(#${id}-glow)">
      <rect class="bot-eye bot-eye-l" x="60" y="66" width="30" height="20" rx="7" fill="${PALETTE.eye}"/>
      <rect class="bot-eye bot-eye-r" x="110" y="66" width="30" height="20" rx="7" fill="${PALETTE.eye}"/>
      <rect x="66" y="71" width="8" height="7" rx="3" fill="${PALETTE.eyeCore}" opacity="0.85"/>
      <rect x="116" y="71" width="8" height="7" rx="3" fill="${PALETTE.eyeCore}" opacity="0.85"/>
    </g>
    <!-- grille mouth -->
    <g opacity="0.85">
      <rect x="72" y="100" width="56" height="12" rx="6" fill="${PALETTE.plateDark}"/>
      <rect x="78" y="103" width="4" height="6" rx="2" fill="${PALETTE.edge}"/>
      <rect x="88" y="103" width="4" height="6" rx="2" fill="${PALETTE.edge}"/>
      <rect x="98" y="103" width="4" height="6" rx="2" fill="${PALETTE.edge}"/>
      <rect x="108" y="103" width="4" height="6" rx="2" fill="${PALETTE.edge}"/>
      <rect x="118" y="103" width="4" height="6" rx="2" fill="${PALETTE.edge}"/>
    </g>
  </g>
</svg>`.trim();

  host.appendChild(el);

  const q = (s) => el.querySelector(s);
  const parts = {
    svg: el.querySelector('svg'),
    head: q('.bot-head'),
    body: q('.bot-body'),
    armL: q('.bot-arm-l'),
    armR: q('.bot-arm-r'),
    eyes: q('.bot-eyes'),
    eyeL: q('.bot-eye-l'),
    eyeR: q('.bot-eye-r'),
    bulb: q('.bot-bulb'),
    antenna: q('.bot-antenna'),
  };

  // Park the rig. xPercent/yPercent centre it on (x, y) so every later tween
  // composes against a known transform.
  gsap.set(el, { xPercent: -50, yPercent: -50, x, y, scale, autoAlpha: 0 });
  gsap.set([parts.armL, parts.armR], { transformOrigin: '50% 8%' });
  gsap.set(parts.head, { transformOrigin: '50% 100%' });
  gsap.set(parts.eyes, { autoAlpha: 0 });
  gsap.set(parts.bulb, { autoAlpha: 0 });

  const api = {
    el,
    parts,
    /** Current stage position, for callers choreographing around the bot. */
    pos: () => ({ x: gsap.getProperty(el, 'x'), y: gsap.getProperty(el, 'y') }),

    /**
     * Swoop in from off-frame and land with a settle.
     * @param {Object} [o] { from='right', duration=0.55, overshoot=true }
     */
    enter(o = {}) {
      const { from = 'right', duration = 0.55 } = o;
      const dx = from === 'right' ? 620 : from === 'left' ? -620 : 0;
      const dy = from === 'top' ? -620 : 0;
      const tl = gsap.timeline();
      tl.set(el, { visibility: 'visible' }, 0)
        .fromTo(el, { autoAlpha: 0, x: `+=${dx}`, y: `+=${dy}`, rotation: from === 'right' ? 14 : -14 },
          { autoAlpha: 1, x: `-=${dx}`, y: `-=${dy}`, rotation: 0, duration, ease: 'back.out(1.5)' }, 0)
        .fromTo(parts.head, { rotation: from === 'right' ? 8 : -8 },
          { rotation: 0, duration: duration * 0.9, ease: 'back.out(2.2)' }, 0.08);
      return tl;
    },

    /** Eyes flare on (plus the antenna bulb). */
    eyesOn(o = {}) {
      const { duration = 0.28 } = o;
      const tl = gsap.timeline();
      tl.to(parts.eyes, { autoAlpha: 1, duration: duration * 0.4, ease: 'power2.out' }, 0)
        .fromTo([parts.eyeL, parts.eyeR], { scaleY: 0.15, transformOrigin: '50% 50%' },
          { scaleY: 1, duration, ease: 'back.out(2.6)' }, 0)
        .to(parts.bulb, { autoAlpha: 1, duration: duration * 0.5 }, 0.05);
      return tl;
    },

    /**
     * The attack: lunge forward, arms hammer (bounded yoyo — the "blur"),
     * head thrust. Loops for `seconds`.
     * @param {Object} [o] { seconds=1.4, reach=26, dir=-1 }
     */
    attack(o = {}) {
      const { seconds = 1.4, reach = 26, dir = -1 } = o;
      const cycle = 0.16;
      const halves = Math.max(1, boundedRepeats(cycle / 2, seconds));
      const tl = gsap.timeline();
      // lunge toward the target
      tl.to(el, { x: `+=${dir * reach}`, duration: 0.18, ease: 'power3.in' }, 0)
        .to(parts.head, { rotation: dir * 5, duration: 0.18, ease: 'power2.out' }, 0);
      // arms hammer
      tl.to(parts.armL, { rotation: -34, duration: cycle / 2, yoyo: true, repeat: halves, ease: 'sine.inOut' }, 0.1)
        .to(parts.armR, { rotation: 34, duration: cycle / 2, yoyo: true, repeat: halves, ease: 'sine.inOut' }, 0.1 + cycle / 4)
        .to(parts.body, { y: 3, duration: cycle, yoyo: true, repeat: Math.max(1, boundedRepeats(cycle, seconds)), ease: 'sine.inOut' }, 0.1);
      // settle back
      tl.to(el, { x: `-=${dir * reach}`, duration: 0.24, ease: 'power2.out' }, 0.1 + seconds)
        .to([parts.armL, parts.armR], { rotation: 0, duration: 0.22, ease: 'power2.out' }, 0.1 + seconds)
        .to(parts.head, { rotation: 0, duration: 0.22, ease: 'power2.out' }, 0.1 + seconds);
      return tl;
    },

    /** Knocked back — the refusal hit. Eyes stutter, head snaps away. */
    recoil(o = {}) {
      const { dir = 1, distance = 70, duration = 0.5 } = o;
      const tl = gsap.timeline();
      tl.to(el, { x: `+=${dir * distance}`, rotation: dir * 12, duration: 0.16, ease: 'power4.out' }, 0)
        .to(parts.head, { rotation: dir * -14, duration: 0.16, ease: 'power3.out' }, 0)
        .to([parts.armL, parts.armR], { rotation: dir * -22, duration: 0.16, ease: 'power3.out' }, 0)
        .to(parts.eyes, { autoAlpha: 0.25, duration: 0.08, yoyo: true, repeat: 3, ease: 'none' }, 0.05)
        .to(el, { x: `-=${dir * distance * 0.45}`, rotation: dir * 6, duration: duration - 0.16, ease: 'elastic.out(1, 0.5)' }, 0.16)
        .to(parts.head, { rotation: 0, duration: duration - 0.16, ease: 'elastic.out(1, 0.55)' }, 0.16)
        .to([parts.armL, parts.armR], { rotation: 0, duration: duration - 0.16, ease: 'elastic.out(1, 0.6)' }, 0.16);
      return tl;
    },

    /** Tumble out of frame — velocity does the hiding, never a mid-frame fade. */
    exit(o = {}) {
      const { dir = 1, duration = 0.5 } = o;
      const tl = gsap.timeline();
      tl.to(parts.eyes, { autoAlpha: 0, duration: 0.18, ease: 'power2.in' }, 0)
        .to(parts.bulb, { autoAlpha: 0, duration: 0.18 }, 0)
        .to(el, {
          x: `+=${dir * 900}`, y: '+=180', rotation: dir * 42,
          duration, ease: 'power3.in',
        }, 0.05);
      return tl;
    },

    dispose() { el.remove(); },
  };

  return api;
}
