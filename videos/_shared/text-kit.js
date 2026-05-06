// Pixel-point-style editorial text reveals using the standard tweenInto(tl, opts)
// pattern, so caller-owned master timelines control all motion.
// The kit currently includes seven reviewed presets.
// Full pixel-point parity (24 presets) is deferred; see project memory
// project_future_enhancements.md, "Deferred - full pixel-point parity".
// Upstream catalog source of truth:
// https://github.com/pixel-point/animate-text/catalog/text-animations/specs/

const TEXT_REVEAL_PRESETS = {
  'mask-reveal-up': { split: true, masked: true, yFrom: 110, duration: 0.68, ease: 'expo.out' },
  'top-down-letters': { split: true, masked: true, yFrom: -110, duration: 0.82, ease: 'expo.out' },
  'per-character-rise': { split: true, masked: false, yFrom: 40, opacityFrom: 0, opacityTo: 1, duration: 0.55, ease: 'power3.out' },
  'focus-blur-resolve': { filterFrom: 'blur(10px)', filterTo: 'blur(0px)', duration: 0.70, ease: 'power2.out' },
  'soft-blur-in': { filterFrom: 'blur(6px)', filterTo: 'blur(0px)', duration: 0.50, ease: 'power2.out' },
  'spring-scale-in': { scaleFrom: 0.72, scaleTo: 1, duration: 0.52, ease: 'back.out(1.4)' },
  'micro-scale-fade': { scaleFrom: 0.96, scaleTo: 1, duration: 0.42, ease: 'power2.out' },
};

export function mountTextReveal(text, {
  preset = 'mask-reveal-up',
  position = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  size = 56,
  weight = 600,
  family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color = '#ffffff',
  stagger = 0.028,
  zIndex = 80,
} = {}) {
  const spec = TEXT_REVEAL_PRESETS[preset];
  if (!spec) throw new Error('mountTextReveal: unknown preset ' + preset);
  let el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', zIndex: String(zIndex), pointerEvents: 'none',
    whiteSpace: 'pre', display: 'inline-block', lineHeight: '1.2',
    fontFamily: family, fontSize: size + 'px', fontWeight: String(weight),
    color, textShadow: '0 1px 0 rgba(255,255,255,0.08)',
  }, position);
  if (spec.split) {
    [...text].forEach((char) => {
      const ch = document.createElement('span');
      ch.className = 'ch';
      Object.assign(ch.style, { display: 'inline-block', willChange: 'transform' });
      ch.innerHTML = char === ' ' ? '&nbsp;' : char;
      if (spec.masked) {
        const mask = document.createElement('span');
        mask.className = 'mask';
        Object.assign(mask.style, {
          display: 'inline-block', overflow: 'hidden', verticalAlign: 'baseline',
          padding: '0.12em 0', margin: '-0.12em 0', lineHeight: 'inherit',
        });
        mask.appendChild(ch);
        el.appendChild(mask);
      } else {
        // per-character-rise uses flat visible .ch spans so letters travel without clipping.
        el.appendChild(ch);
      }
    });
  } else {
    el.textContent = text;
  }
  document.body.appendChild(el);
  const targets = spec.split ? [...el.querySelectorAll('.ch')] : [el];
  if (window.gsap) {
    if (spec.split) {
      window.gsap.set(targets, {
        yPercent: spec.yFrom,
        ...(spec.opacityFrom != null ? { opacity: spec.opacityFrom } : {}),
      });
    } else if (spec.filterFrom) window.gsap.set(el, { filter: spec.filterFrom, opacity: 0 });
    else window.gsap.set(el, { scale: spec.scaleFrom, opacity: 0 });
  }
  return {
    el,
    tweenInto(tl, { duration, position: at = 0 } = {}) {
      const total = duration ?? (spec.duration + (spec.split ? Math.max(0, targets.length - 1) * stagger : 0));
      if (spec.split) {
        const each = Math.max(0.001, total - Math.max(0, targets.length - 1) * stagger);
        return tl.to(targets, {
          yPercent: 0,
          ...(spec.opacityTo != null ? { opacity: spec.opacityTo } : {}),
          duration: each, ease: spec.ease, stagger,
        }, at);
      }
      if (spec.filterFrom) {
        return tl.to(el, { filter: spec.filterTo, opacity: 1, duration: total, ease: spec.ease }, at);
      }
      return tl.to(el, { scale: spec.scaleTo, opacity: 1, duration: total, ease: spec.ease }, at);
    },
    dispose() {
      if (window.gsap) window.gsap.killTweensOf(targets);
      el?.remove();
      el = null;
    },
  };
}
