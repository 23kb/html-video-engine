// videos/_shared/effects/index.js
//
// Promoted GSAP-effect primitives — see README.md for the motion vocabulary.
// Each effect returns { el, tweenInto(tl, opts), dispose() } and is composed
// into a master timeline. Source references live in each module's header.

export { mountTextStackFromRight }            from './text-stack-from-right.js';
export { mountTextLetterMaskDomino }          from './text-letter-mask-domino.js';
export { mountTextCenterOutRoll }             from './text-center-out-roll.js';
export { mountCardsSpreadFan }                from './cards-spread-fan.js';
export { mountCardsFlyInStack }               from './cards-fly-in-stack.js';
export { mountConstellationPhyllotaxisBloom } from './constellation-phyllotaxis-bloom.js';
