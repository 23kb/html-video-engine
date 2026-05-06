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
  // Hidden until a tween reveals on its timeline — avoids the one-frame empty
  // SVG paint between Lottie mount and first frame render.
  Object.assign(container.style, {
    position: 'fixed',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    pointerEvents: 'none',
    visibility: 'hidden',
    zIndex: String(zIndex),
    ...position,
  });
  document.body.appendChild(container);

  const config = { container, renderer: 'svg', loop, autoplay };
  if (typeof src === 'string') config.path = src;
  else config.animationData = src;
  let animation = lottie.loadAnimation(config);
  let activeTweens = new Set();
  // Keep Lottie's ticker quiet after assets load; GSAP drives Phase 2 frames.
  const pauseOnLoaded = () => {
    animation?.removeEventListener('DOMLoaded', pauseOnLoaded);
    animation?.pause();
  };
  animation.addEventListener('DOMLoaded', pauseOnLoaded);

  const scrubFrames = (tl, { from, to, duration, position, ease }) => {
    if (duration == null) throw new Error('tweenFrames: duration is required');
    const proxy = { frame: from };
    animation.goToAndStop(proxy.frame, true);
    tl.call(() => { if (container) container.style.visibility = 'visible'; }, [], position);
    const before = tl.getChildren(false, true, false).length;
    tl.to(proxy, {
      frame: to,
      duration,
      ease,
      onUpdate: () => animation?.goToAndStop(proxy.frame, true),
      onComplete: () => activeTweens?.delete(tween),
    }, position);
    const tween = tl.getChildren(false, true, false)[before];
    if (tween) activeTweens.add(tween);
    return tl;
  };

  const resolveMarkerFrame = (value) => {
    if (typeof value === 'number') return value;
    const markers = animation.markers || animation.animationData?.markers || [];
    const markerName = (m) => m.cm || m.comment || m.name || m.payload?.name;
    const markerFrame = (m) => m.tm ?? m.time;
    const marker = markers.find((m) => markerName(m) === value);
    if (marker) return markerFrame(marker);
    const available = markers.map(markerName).filter(Boolean);
    throw new Error(
      `tweenMarker: unknown marker "${value}". Available markers: ${available.join(', ') || 'none'}`
    );
  };

  return {
    container,
    animation,
    tweenInto(tl, { duration = animation.getDuration(false), position = 0 } = {}) {
      tl.call(() => {
        if (container) container.style.visibility = 'visible';
        animation?.goToAndPlay(0, true);
      }, [], position);
      tl.call(() => animation?.stop(), [], position + duration);
      return tl;
    },
    tweenFrames(tl, {
      from = 0,
      to = animation.totalFrames - 1,
      duration,
      position = 0,
      ease = 'none',
    } = {}) {
      if (typeof from !== 'number') throw new Error('tweenFrames: from must be a number');
      if (typeof to !== 'number') throw new Error('tweenFrames: to must be a number');
      return scrubFrames(tl, { from, to, duration, position, ease });
    },
    tweenMarker(tl, {
      from,
      to,
      duration,
      position = 0,
      ease = 'none',
    } = {}) {
      if (from == null) throw new Error('tweenMarker: from is required');
      if (to == null) throw new Error('tweenMarker: to is required');
      return scrubFrames(tl, {
        from: resolveMarkerFrame(from),
        to: resolveMarkerFrame(to),
        duration,
        position,
        ease,
      });
    },
    dispose() {
      activeTweens.forEach((tween) => tween.kill?.());
      activeTweens.clear();
      animation?.removeEventListener('DOMLoaded', pauseOnLoaded);
      animation?.destroy();
      container?.remove();
      animation = null;
      container = null;
      activeTweens = null;
    },
  };
}
