// videos/_shared/effects/index.js
//
// Promoted GSAP-effect primitives — see README.md for the motion vocabulary.
// Each effect returns { el, tweenInto(tl, opts), dispose() } and is composed
// into a master timeline. Source references live in each module's header.

export { mountTextStackFromRight }            from './text-stack-from-right.js';
export { mountTextLetterMaskDomino }          from './text-letter-mask-domino.js';
export { mountTextCenterOutRoll }             from './text-center-out-roll.js';
export { mountTextDescramble }                from './text-descramble.js';
export { mountTextDupWordMask }               from './text-dup-word-mask.js';
export { mountCardsSpreadFan }                from './cards-spread-fan.js';
export { mountCardsFlyInStack }               from './cards-fly-in-stack.js';
export { mountConstellationPhyllotaxisBloom } from './constellation-phyllotaxis-bloom.js';
export { mountStatCountUp }                   from './stat-count-up.js';
export { mountEndCard }                       from './end-card.js';
export { mountGlassCard, glassSpringEase }    from './glass-card.js';

// ── Ad-path vocabulary, promoted from the ad-vocabulary proving reel (2026-09-03) ──
export { mountPhraseChain }                   from './phrase-chain.js';
export { mountTaskQueue }                     from './task-queue.js';
export { mountSkeletonToLive }                from './skeleton-to-live.js';
export { mountOdometer }                      from './odometer.js';
export { mountLogoWall }                      from './logo-wall.js';
export { mountQuoteCard }                     from './quote-card.js';
export { mountWaveformBars, pulseEmphasis }   from './waveform-bars.js';

// ── Seam grammar + wash: timeline composers, NOT mounts (see README) ──
export {
  holdFinalFrame,
  seamZoomThrough,
  seamThrowLeft,
  parkThrowEntry,
  seamThrowEntry,
  seamLockedCrossfade,
  seamHardCut,
  seamCursorVelocitySplit,
  splitPoint,
}                                             from './seams.js';
export { mountWashVeil, washTransition, unparkGroup } from './wash-transition.js';
