// Marketing-mode atmospheric capability for Lottie editorial micro-animations.
// Use this for bumpers, stings, and compact illustrations that sit above the
// captured WPForms surface without becoming runtime core.
// Lottie is loaded lazily so GSAP-only and Three.js-only videos do not pay for
// this bundle.
// Phase 1 ships a single autoplay-driven helper with timeline start/stop hooks.
// Phase 2 adds frame-driven GSAP scrubbing for precise forward/reverse/hold
// choreography.

let lottiePromise = null;

export function loadLottie() {
  if (window.lottie) return Promise.resolve(window.lottie);
  if (lottiePromise) return lottiePromise;
  lottiePromise = (async () => {
    const mod = await import('/vendor/lottie-web/5.12.2/lottie.esm.min.js');
    window.lottie = mod.default || mod;
    return window.lottie;
  })();
  return lottiePromise;
}

export function mountLottie(src, {
  loop = false,
  autoplay = false,
  zIndex = 70,
  position = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  width = 480,
  height = 480,
} = {}) {
  const lottie = window.lottie;
  if (!lottie) throw new Error('mountLottie: call loadLottie() before mounting');

  let container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    pointerEvents: 'none',
    zIndex: String(zIndex),
    ...position,
  });
  document.body.appendChild(container);

  const config = { container, renderer: 'svg', loop, autoplay };
  if (typeof src === 'string') config.path = src;
  else config.animationData = src;
  let animation = lottie.loadAnimation(config);
  // Keep Lottie's ticker quiet after assets load; GSAP drives Phase 2 frames.
  const pauseOnLoaded = () => {
    animation.removeEventListener('DOMLoaded', pauseOnLoaded);
    animation.pause();
  };
  animation.addEventListener('DOMLoaded', pauseOnLoaded);

  return {
    container,
    animation,
    tweenInto(tl, { duration = animation.getDuration(false), position = 0 } = {}) {
      tl.call(() => animation.goToAndPlay(0, true), [], position);
      tl.call(() => animation.stop(), [], position + duration);
      return tl;
    },
    tweenFrames(tl, {
      from = 0,
      to = animation.totalFrames - 1,
      duration,
      position = 0,
      ease = 'none',
    } = {}) {
      if (duration == null) throw new Error('tweenFrames: duration is required');
      const proxy = { frame: from };
      animation.goToAndStop(proxy.frame, true);
      tl.to(proxy, {
        frame: to,
        duration,
        ease,
        onUpdate: () => animation.goToAndStop(proxy.frame, true),
      }, position);
      return tl;
    },
    dispose() {
      animation?.destroy();
      container?.remove();
      animation = null;
      container = null;
    },
  };
}
