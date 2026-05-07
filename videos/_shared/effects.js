// videos/_shared/effects.js
//
// Shared GSAP registerEffect library for video-local chapter choreography.
// Import this module once before calling `gsap.effects.<name>()`.

import { loadGsap } from './kit.js';

const REGISTERED_FLAG = '__wpformsSharedEffectsRegistered';

export const effectsReady = loadGsap({ flip: true, motionPath: false, splitText: true })
  .then(registerSharedEffects);

function registerSharedEffects(gsap) {
  if (gsap[REGISTERED_FLAG]) return gsap;
  gsap[REGISTERED_FLAG] = true;

  gsap.registerEffect({
    name: 'highlightPulse',
    defaults: { color: '#f9c74f', scale: 1.06, duration: 0.55 },
    effect(targets, config) {
      const scope = firstElement(targets);
      let tl;
      gsap.context(() => {
        tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } })
          .to(targets, {
            scale: config.scale,
            filter: `drop-shadow(0 0 18px ${config.color}) brightness(1.06)`,
            duration: config.duration * 0.5,
          }, 0)
          .to(targets, {
            scale: 1,
            filter: 'drop-shadow(0 0 0 rgba(0,0,0,0)) brightness(1)',
            duration: config.duration * 0.5,
            clearProps: 'scale,filter',
          });
      }, scope);
      return tl;
    },
  });

  gsap.registerEffect({
    name: 'fieldBurst',
    defaults: { particles: 10, color: '#ff8a00', duration: 0.7 },
    effect(targets, config) {
      const target = firstElement(targets);
      const host = target?.ownerDocument?.body || document.body;
      const ownerDoc = host.ownerDocument || document;
      let tl;
      gsap.context(() => {
        const rect = target?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dots = Array.from({ length: Math.max(1, config.particles) }, (_, i) => {
          const dot = ownerDoc.createElement('span');
          dot.className = 'shared-effect-burst-dot';
          const angle = (Math.PI * 2 * i) / Math.max(1, config.particles);
          dot.dataset.x = String(Math.cos(angle) * 34);
          dot.dataset.y = String(Math.sin(angle) * 34);
          Object.assign(dot.style, {
            position: 'fixed',
            left: `${cx - 3}px`,
            top: `${cy - 3}px`,
            width: '6px',
            height: '6px',
            borderRadius: '999px',
            background: config.color,
            pointerEvents: 'none',
            zIndex: '9999',
          });
          host.appendChild(dot);
          return dot;
        });
        tl = gsap.timeline({
          onComplete: () => dots.forEach(dot => dot.remove()),
          onInterrupt: () => dots.forEach(dot => dot.remove()),
        }).fromTo(dots, {
          x: 0,
          y: 0,
          scale: 0.7,
          autoAlpha: 0.9,
        }, {
          x: i => Number(dots[i].dataset.x),
          y: i => Number(dots[i].dataset.y),
          scale: 0.15,
          autoAlpha: 0,
          duration: config.duration,
          ease: 'power3.out',
          stagger: { each: 0.015, from: 'center' },
        });
      }, target || host);
      return tl;
    },
  });

  gsap.registerEffect({
    name: 'labelReveal',
    defaults: { from: 'mask-up', duration: 0.75, stagger: 0.025 },
    effect(targets, config) {
      const target = firstElement(targets);
      let tl;
      gsap.context(() => {
        const split = window.SplitText
          ? new window.SplitText(targets, { type: 'chars,words', charsClass: 'shared-effect-char' })
          : null;
        const chars = split?.chars?.length ? split.chars : targets;
        const fromVars = labelRevealFrom(config.from);
        tl = gsap.timeline({
          onComplete: () => split?.revert(),
          onInterrupt: () => split?.revert(),
        }).fromTo(chars, {
          ...fromVars,
          autoAlpha: 0,
        }, {
          yPercent: 0,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          autoAlpha: 1,
          duration: config.duration,
          ease: config.from === 'spring' ? 'back.out(1.7)' : 'expo.out',
          stagger: config.stagger,
          clearProps: 'transform,filter,visibility,opacity',
        });
      }, target);
      return tl;
    },
  });

  gsap.registerEffect({
    name: 'popOutTilt',
    defaults: { lift: 18, rotate: -1.5, shadow: '0 22px 42px rgba(26,34,56,0.20)', duration: 0.65 },
    effect(targets, config) {
      const scope = firstElement(targets);
      let tl;
      gsap.context(() => {
        tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .to(targets, {
            y: -Math.abs(config.lift),
            rotate: config.rotate,
            scale: 1.025,
            filter: `drop-shadow(${config.shadow})`,
            duration: config.duration * 0.62,
          }, 0)
          .to(targets, {
            y: 0,
            rotate: 0,
            scale: 1,
            filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))',
            duration: config.duration * 0.38,
            ease: 'sine.inOut',
            clearProps: 'transform,filter',
          });
      }, scope);
      return tl;
    },
  });

  gsap.registerEffect({
    name: 'cardReflow',
    defaults: { from: null, to: null, duration: 0.75, stagger: 0.035 },
    effect(targets, config) {
      const scope = firstElement(targets);
      let tl;
      gsap.context(() => {
        const state = config.from || window.Flip?.getState(targets);
        if (typeof config.to === 'function') config.to();
        tl = window.Flip.from(state, {
          targets,
          duration: config.duration,
          ease: 'power3.inOut',
          stagger: config.stagger,
          absolute: true,
        });
      }, scope);
      return tl;
    },
  });

  return gsap;
}

function firstElement(targets) {
  if (!targets) return document.body;
  if (targets instanceof Element) return targets;
  if (typeof targets === 'string') return document.querySelector(targets) || document.body;
  return targets[0] || document.body;
}

function labelRevealFrom(from) {
  if (from === 'fade') return { y: 0, scale: 1, filter: 'blur(0px)' };
  if (from === 'spring') return { y: 10, scale: 0.82, filter: 'blur(2px)' };
  return { yPercent: 120, scale: 1, filter: 'blur(4px)' };
}
