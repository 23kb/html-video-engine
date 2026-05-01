// Cinematic adapter · Lottie loader.
//
// Lifecycle-only adapter for mascot/brand flourishes. Mirrors the shape of
// runtime/cinematic-kit/gsap-loader.js so callers get a single cached
// Promise for `lottie-web` and a tiny mountLottie() helper.
//
// Policy: Lottie is for mascot / Sullie / wordmark / logo decoration only.
// It must NOT be used to animate live WPForms UI — that path stays
// iframe-snapshot driven.
//
// Contract:
//   const lottie = await loadLottie();
//   const handle = await mountLottie({ container, src, loop, autoplay });
//   handle.destroy(); // tears down the anim and clears the container
//
// When the asset is missing or unparseable, mountLottie throws
// LottieAssetMissingError so archetypes can render a graceful
// asset-missing state instead of crashing the lab.

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
const DOTLOTTIE_ESM =
  'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.40.2/+esm';

let lottieReady = null;
let dotLottieReady = null;

export class LottieAssetMissingError extends Error {
  constructor(message, { src, cause } = {}) {
    super(message);
    this.name = 'LottieAssetMissingError';
    this.src = src || null;
    if (cause) this.cause = cause;
  }
}

/**
 * Lazy-load `@lottiefiles/dotlottie-web` (the canvas-based player that can
 * read `.lottie` zip bundles directly). Cached after first call.
 */
export function loadDotLottie() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('cinematic-adapters/lottie: window required'));
  }
  if (dotLottieReady) return dotLottieReady;
  dotLottieReady = import(/* @vite-ignore */ DOTLOTTIE_ESM).catch((err) => {
    dotLottieReady = null;
    throw new Error(
      'cinematic-adapters/lottie: dotlottie-web ESM load failed — ' +
      (err && err.message ? err.message : String(err))
    );
  });
  return dotLottieReady;
}

export function loadLottie() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('cinematic-adapters/lottie: window required'));
  }
  if (window.lottie) return Promise.resolve(window.lottie);
  if (lottieReady) return lottieReady;
  lottieReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN;
    s.onload = () => resolve(window.lottie);
    s.onerror = (e) => {
      lottieReady = null; // allow retry
      reject(new Error('cinematic-adapters/lottie: CDN load failed'));
    };
    document.head.appendChild(s);
  });
  return lottieReady;
}

/**
 * Mount a Lottie animation into a container.
 *
 * @param {object} args
 * @param {HTMLElement} args.container       — required mount node.
 * @param {string}      [args.src]           — URL to a Lottie JSON.
 * @param {object}      [args.animationData] — pre-loaded JSON object (used
 *                                              when src is omitted or as a
 *                                              fallback if both are passed).
 * @param {boolean}     [args.loop=false]
 * @param {boolean}     [args.autoplay=true]
 * @param {string}      [args.renderer='svg']
 *
 * @returns {Promise<{ anim: object, destroy: () => void }>}
 *
 * @throws {LottieAssetMissingError} when src 404s, returns non-JSON, or
 *   neither src nor animationData is supplied.
 */
export async function mountLottie({
  container,
  src,
  animationData,
  loop = false,
  autoplay = true,
  renderer = 'svg',
} = {}) {
  if (!container) {
    throw new Error('cinematic-adapters/lottie: container required');
  }
  if (!src && !animationData) {
    throw new LottieAssetMissingError(
      'cinematic-adapters/lottie: no src or animationData provided',
      { src: null }
    );
  }

  // Branch A — `.lottie` (dotLottie zip bundle). lottie-web can't load these
  // directly; use the canvas-based dotlottie-web player instead.
  if (src && /\.lottie(\?|#|$)/i.test(src)) {
    let DotLottie;
    try {
      const mod = await loadDotLottie();
      DotLottie = mod.DotLottie || (mod.default && mod.default.DotLottie);
    } catch (err) {
      throw new LottieAssetMissingError(
        `cinematic-adapters/lottie: dotlottie-web load failed for ${src}`,
        { src, cause: err }
      );
    }
    if (!DotLottie) {
      throw new LottieAssetMissingError(
        'cinematic-adapters/lottie: DotLottie class not found in module',
        { src }
      );
    }

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const baseW = container.clientWidth || 220;
    const baseH = container.clientHeight || 220;
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(baseW * dpr);
    canvas.height = Math.round(baseH * dpr);
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const dl = new DotLottie({
      canvas,
      src,
      loop,
      autoplay,
    });

    return {
      anim: dl,
      destroy() {
        try { dl.destroy(); } catch (_) {}
        while (container.firstChild) container.removeChild(container.firstChild);
      },
      setSpeed(s) { try { dl.setSpeed(s); } catch (_) {} },
      setLoop(l)  { try { dl.setLoop(l);  } catch (_) {} },
    };
  }

  // Branch B — raw `.json` Lottie (lottie-web SVG renderer).
  let data = animationData || null;
  if (src) {
    try {
      const res = await fetch(src);
      if (!res.ok) {
        throw new LottieAssetMissingError(
          `cinematic-adapters/lottie: fetch ${src} → ${res.status}`,
          { src }
        );
      }
      data = await res.json();
    } catch (err) {
      if (err instanceof LottieAssetMissingError) throw err;
      // network error or JSON parse failure: surface as asset-missing
      // unless we have a fallback animationData.
      if (!data) {
        throw new LottieAssetMissingError(
          `cinematic-adapters/lottie: could not load ${src}`,
          { src, cause: err }
        );
      }
    }
  }

  const lottie = await loadLottie();
  const anim = lottie.loadAnimation({
    container,
    renderer,
    loop,
    autoplay,
    animationData: data,
  });

  return {
    anim,
    destroy() {
      try { anim.destroy(); } catch (_) {}
      while (container.firstChild) container.removeChild(container.firstChild);
    },
    setSpeed(s) { try { anim.setSpeed(s); } catch (_) {} },
    setLoop(l)  { try { anim.loop = !!l; } catch (_) {} },
  };
}
