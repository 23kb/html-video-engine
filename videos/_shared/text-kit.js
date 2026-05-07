// Pixel-point-style editorial text reveals using the standard tweenInto(tl, opts)
// pattern, so caller-owned master timelines control all motion.
// SplitText is the preferred splitter when callers have loaded GSAP with
// loadGsap({ splitText: true }); a deterministic DOM fallback keeps the factory
// usable in older chapters and smoke pages.

export const TEXT_REVEAL_PRESET_NAMES = [
  'mask-reveal-up',
  'top-down-letters',
  'focus-blur-resolve',
  'spring-scale-in',
  'soft-blur-in',
  'per-character-rise',
  'micro-scale-fade',
  'type-out-typewriter',
  'glitch-resolve',
  'shutter-bars',
  'zoom-blur-in',
  'wave-rise',
  'cascade-from-edge',
  'letter-flip',
  'slide-mask-left',
  'slide-mask-right',
  'gradient-wipe',
  'bounce-in-letters',
  'elastic-scale-in',
  'chromatic-shift',
  'magnetic-snap',
  'paragraph-stagger',
  'word-by-word-emphasis',
  'liquid-morph',
];

const TEXT_REVEAL_PRESETS = {
  'mask-reveal-up': {
    split: 'chars', wrapChars: true, masked: true,
    set: { yPercent: 110 },
    to: { yPercent: 0, duration: 0.68, ease: 'expo.out' },
    stagger: 0.028,
  },
  'top-down-letters': {
    split: 'chars', wrapChars: true, masked: true,
    set: { yPercent: -110 },
    to: { yPercent: 0, duration: 0.82, ease: 'expo.out' },
    stagger: 0.028,
  },
  'per-character-rise': {
    split: 'chars',
    set: { y: 40, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' },
    stagger: 0.028,
  },
  'focus-blur-resolve': {
    split: 'none',
    set: { filter: 'blur(10px)', opacity: 0 },
    to: { filter: 'blur(0px)', opacity: 1, duration: 0.70, ease: 'power2.out' },
  },
  'soft-blur-in': {
    split: 'none',
    set: { filter: 'blur(6px)', opacity: 0 },
    to: { filter: 'blur(0px)', opacity: 1, duration: 0.50, ease: 'power2.out' },
  },
  'spring-scale-in': {
    split: 'none',
    set: { scale: 0.72, opacity: 0 },
    to: { scale: 1, opacity: 1, duration: 0.52, ease: 'back.out(1.4)' },
  },
  'micro-scale-fade': {
    split: 'none',
    set: { scale: 0.96, opacity: 0 },
    to: { scale: 1, opacity: 1, duration: 0.42, ease: 'power2.out' },
  },
  'type-out-typewriter': {
    split: 'chars',
    set: { opacity: 0, width: 0 },
    to: { opacity: 1, width: 'auto', duration: 0.04, ease: 'none' },
    stagger: 0.045,
  },
  'glitch-resolve': {
    split: 'chars',
    set: { opacity: 0, x: i => (i % 2 ? 10 : -10), skewX: i => (i % 2 ? 12 : -12), filter: 'blur(3px)' },
    to: { opacity: 1, x: 0, skewX: 0, filter: 'blur(0px)', duration: 0.46, ease: 'steps(6)' },
    stagger: 0.018,
  },
  'shutter-bars': {
    split: 'lines', wrapLines: true, masked: true,
    set: { yPercent: 105, opacity: 0.2 },
    to: { yPercent: 0, opacity: 1, duration: 0.56, ease: 'power3.out' },
    stagger: 0.07,
  },
  'zoom-blur-in': {
    split: 'none',
    set: { scale: 1.18, opacity: 0, filter: 'blur(14px)' },
    to: { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.62, ease: 'power3.out' },
  },
  'wave-rise': {
    split: 'chars',
    set: { y: 34, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 0.55, ease: 'sine.out' },
    stagger: { each: 0.026, from: 'start', ease: 'sine.inOut' },
  },
  'cascade-from-edge': {
    split: 'chars',
    set: { x: -34, opacity: 0 },
    to: { x: 0, opacity: 1, duration: 0.50, ease: 'power3.out' },
    stagger: { each: 0.022, from: 'edges' },
  },
  'letter-flip': {
    split: 'chars',
    set: { rotationX: -92, transformPerspective: 700, opacity: 0 },
    to: { rotationX: 0, opacity: 1, duration: 0.58, ease: 'back.out(1.3)' },
    stagger: 0.024,
  },
  'slide-mask-left': {
    split: 'words', wrapWords: true, masked: true,
    set: { xPercent: -105, opacity: 0.3 },
    to: { xPercent: 0, opacity: 1, duration: 0.54, ease: 'expo.out' },
    stagger: 0.045,
  },
  'slide-mask-right': {
    split: 'words', wrapWords: true, masked: true,
    set: { xPercent: 105, opacity: 0.3 },
    to: { xPercent: 0, opacity: 1, duration: 0.54, ease: 'expo.out' },
    stagger: 0.045,
  },
  'gradient-wipe': {
    split: 'none',
    prepare(el, opts) {
      el.style.backgroundImage = opts.gradient || 'linear-gradient(90deg, #ffffff, #4ec9ff, #ffffff)';
      el.style.backgroundSize = '220% 100%';
      el.style.backgroundClip = 'text';
      el.style.webkitBackgroundClip = 'text';
      el.style.color = 'transparent';
    },
    set: { opacity: 0, backgroundPosition: '100% 50%' },
    to: { opacity: 1, backgroundPosition: '0% 50%', duration: 0.78, ease: 'power2.out' },
  },
  'bounce-in-letters': {
    split: 'chars',
    set: { y: -24, scale: 0.82, opacity: 0 },
    to: { y: 0, scale: 1, opacity: 1, duration: 0.62, ease: 'bounce.out' },
    stagger: 0.026,
  },
  'elastic-scale-in': {
    split: 'words',
    set: { scale: 0.54, opacity: 0 },
    to: { scale: 1, opacity: 1, duration: 0.72, ease: 'elastic.out(1, 0.55)' },
    stagger: 0.06,
  },
  'chromatic-shift': {
    split: 'none',
    prepare(el) {
      el.dataset.text = el.textContent;
      el.style.setProperty('--tk-red-x', '-6px');
      el.style.setProperty('--tk-blue-x', '6px');
      injectTextKitCss();
      el.classList.add('tk-chromatic');
    },
    set: { opacity: 0, x: -8 },
    to: { opacity: 1, x: 0, '--tk-red-x': '0px', '--tk-blue-x': '0px', duration: 0.58, ease: 'power3.out' },
  },
  'magnetic-snap': {
    split: 'chars',
    set: { x: i => (i % 2 ? 44 : -44), y: i => ((i % 3) - 1) * 18, rotation: i => (i % 2 ? 8 : -8), opacity: 0 },
    to: { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.62, ease: 'back.out(1.7)' },
    stagger: { each: 0.018, from: 'center' },
  },
  'paragraph-stagger': {
    split: 'lines',
    set: { y: 22, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 0.50, ease: 'power2.out' },
    stagger: 0.10,
  },
  'word-by-word-emphasis': {
    split: 'words',
    set: { y: 16, opacity: 0, scale: 0.96 },
    to: { y: 0, opacity: 1, scale: 1, duration: 0.48, ease: 'power3.out' },
    stagger: 0.08,
  },
  'liquid-morph': {
    split: 'chars',
    set: { yPercent: 80, scaleY: 0.35, scaleX: 1.25, opacity: 0, filter: 'blur(5px)' },
    to: { yPercent: 0, scaleY: 1, scaleX: 1, opacity: 1, filter: 'blur(0px)', duration: 0.66, ease: 'back.out(1.2)' },
    stagger: 0.022,
  },
};

export function listTextRevealPresets() {
  return [...TEXT_REVEAL_PRESET_NAMES];
}

export function mountTextReveal(text, {
  preset = 'mask-reveal-up',
  position = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  size = 56,
  weight = 600,
  family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color = '#ffffff',
  stagger,
  zIndex = 80,
  className = '',
  parent = document.body,
  ...presetOpts
} = {}) {
  const spec = TEXT_REVEAL_PRESETS[preset];
  if (!spec) throw new Error('mountTextReveal: unknown preset ' + preset);

  let el = document.createElement('div');
  el.className = ['tk-text-reveal', className].filter(Boolean).join(' ');
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: String(zIndex),
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
    display: 'inline-block',
    lineHeight: '1.2',
    fontFamily: family,
    fontSize: size + 'px',
    fontWeight: String(weight),
    color,
    textShadow: '0 1px 0 rgba(255,255,255,0.08)',
  }, position);
  el.textContent = text;
  parent.appendChild(el);

  const split = splitElement(el, spec);
  const targets = pickTargets(split, spec);
  spec.prepare?.(el, presetOpts);

  if (window.gsap) window.gsap.set(targets, resolveVars(spec.set || {}, targets));

  return {
    el,
    tweenInto(tl, {
      duration,
      position: at = 0,
      stagger: localStagger = stagger,
      ...vars
    } = {}) {
      const targetCount = Math.max(1, targets.length);
      const specStagger = localStagger ?? spec.stagger ?? 0;
      const baseDuration = duration ?? spec.to.duration ?? 0.6;
      const tweenVars = {
        ...resolveVars(spec.to, targets),
        ...vars,
        duration: baseDuration,
      };
      if (targetCount > 1 && specStagger) tweenVars.stagger = specStagger;
      return tl.to(targets, tweenVars, at);
    },
    dispose() {
      if (!el) return;
      if (window.gsap) window.gsap.killTweensOf(targets);
      try { split.instance?.revert?.(); } catch {}
      el.remove();
      el = null;
    },
  };
}

function splitElement(el, spec) {
  if (spec.split === 'none') return { chars: [el], words: [el], lines: [el], all: [el], instance: null };

  if (window.SplitText) {
    const instance = new window.SplitText(el, {
      type: 'chars,words,lines',
      charsClass: 'tk-char',
      wordsClass: 'tk-word',
      linesClass: 'tk-line',
    });
    applyWraps(instance, spec);
    return {
      chars: instance.chars || [],
      words: instance.words || [],
      lines: instance.lines || [],
      all: [...(instance.chars || []), ...(instance.words || []), ...(instance.lines || [])],
      instance,
    };
  }

  return fallbackSplit(el, spec);
}

function pickTargets(split, spec) {
  if (spec.split === 'words') return split.words.length ? split.words : split.chars;
  if (spec.split === 'lines') return split.lines.length ? split.lines : (split.words.length ? split.words : split.chars);
  if (spec.split === 'none') return [split.chars[0]];
  return split.chars.length ? split.chars : [split.chars[0]];
}

function applyWraps(instance, spec) {
  if (spec.wrapChars || spec.masked) wrapNodes(instance.chars, 'tk-mask');
  if (spec.wrapWords) wrapNodes(instance.words, 'tk-mask');
  if (spec.wrapLines) wrapNodes(instance.lines, 'tk-mask');
  [...(instance.chars || []), ...(instance.words || []), ...(instance.lines || [])].forEach((node) => {
    Object.assign(node.style, {
      display: 'inline-block',
      willChange: 'transform, opacity, filter',
      transformOrigin: '50% 70%',
    });
  });
}

function wrapNodes(nodes = [], className) {
  nodes.forEach((node) => {
    if (!node.parentNode || node.parentNode.classList?.contains(className)) return;
    const mask = node.ownerDocument.createElement('span');
    mask.className = className;
    Object.assign(mask.style, {
      display: 'inline-block',
      overflow: 'hidden',
      verticalAlign: 'baseline',
      padding: '0.12em 0',
      margin: '-0.12em 0',
      lineHeight: 'inherit',
    });
    node.parentNode.insertBefore(mask, node);
    mask.appendChild(node);
  });
}

function fallbackSplit(el, spec) {
  const text = el.textContent || '';
  el.textContent = '';
  const chars = [];
  const words = [];
  const lines = [];
  const line = el.ownerDocument.createElement('span');
  line.className = 'tk-line';
  line.style.display = 'inline-block';
  lines.push(line);
  el.appendChild(line);

  text.split(/(\s+)/).forEach((chunk) => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) {
      line.appendChild(document.createTextNode(chunk));
      return;
    }
    const word = el.ownerDocument.createElement('span');
    word.className = 'tk-word';
    Object.assign(word.style, { display: 'inline-block', whiteSpace: 'nowrap' });
    [...chunk].forEach((char) => {
      const ch = el.ownerDocument.createElement('span');
      ch.className = 'tk-char';
      Object.assign(ch.style, {
        display: 'inline-block',
        willChange: 'transform, opacity, filter',
        transformOrigin: '50% 70%',
      });
      ch.textContent = char;
      word.appendChild(ch);
      chars.push(ch);
    });
    line.appendChild(word);
    words.push(word);
  });
  applyWraps({ chars, words, lines }, spec);
  return { chars, words, lines, all: [...chars, ...words, ...lines], instance: null };
}

function resolveVars(vars, targets) {
  const out = {};
  Object.entries(vars || {}).forEach(([key, value]) => {
    out[key] = typeof value === 'function' ? (i) => value(i, targets[i]) : value;
  });
  return out;
}

function injectTextKitCss() {
  if (document.getElementById('tk-text-kit-css')) return;
  const style = document.createElement('style');
  style.id = 'tk-text-kit-css';
  style.textContent = `
    .tk-chromatic::before,
    .tk-chromatic::after {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    .tk-chromatic::before { color: rgba(255, 52, 86, 0.72); transform: translateX(var(--tk-red-x)); }
    .tk-chromatic::after { color: rgba(55, 180, 255, 0.72); transform: translateX(var(--tk-blue-x)); }
  `;
  document.head.appendChild(style);
}
