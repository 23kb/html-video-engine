// render-clock-shim.js — injected by tools/render.js into every frame (same-origin iframes too)
// through context.addInitScript(), before any page script runs.
//
// It works together with Chrome virtual time (CDP Emulation.setVirtualTimePolicy). Virtual time
// already makes performance.now(), Date.now(), timers and requestAnimationFrame follow the render
// clock. Two things still drift without this shim (both measured on the 2026-09-26 prototype):
//   1. GSAP's own ticker: its root clock goes stale during boot, then jumps (tweens 0.12-0.22 s
//      ahead). Fix: take gsap.updateRoot off the ticker and call it with the virtual clock.
//   2. CSS transitions/animations and element.animate(): the compositor clock ran ~2x fast under
//      stepped time. Fix: pause every Web Animation on first sight, set currentTime from the clock.
// DO NOT override requestAnimationFrame here: a manual rAF queue starved Chrome's rendering steps
// and CSS transitions randomly never started.
//
// It also reports whether anything visible may have changed since the last sync ("dirty"), so the
// renderer can reuse the previous frame instead of capturing a static one. Dirty = a DOM mutation,
// a running Web Animation, a canvas draw call, a scroll, an image/font load, a focused text field
// (caret blink) or a playing <video>. Anything it can't see is a false skip; tools/render.js
// --verify-skip measures that against a full capture.
//
// tools/render.js calls window.__renderSync() after every virtual-time step, before every capture.

(() => {
  if (window.__renderSyncLocal) return;
  const owned = new WeakMap();
  let dirty = true;
  const mark = () => { dirty = true; };

  let mo = null;
  try {
    mo = new MutationObserver(mark);
    mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  } catch (e) { /* no document yet */ }
  for (const ev of ['scroll', 'load', 'input']) {
    try { document.addEventListener(ev, mark, true); } catch (e) {}
  }
  try { document.fonts.addEventListener('loadingdone', mark); } catch (e) {}

  const wrapDraw = (proto, names) => {
    if (!proto) return;
    for (const n of names) {
      const f = proto[n];
      if (typeof f !== 'function') continue;
      proto[n] = function () { dirty = true; return f.apply(this, arguments); };
    }
  };
  wrapDraw(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype,
    ['fillRect', 'clearRect', 'strokeRect', 'fill', 'stroke', 'fillText', 'strokeText', 'drawImage', 'putImageData']);
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    wrapDraw(C && C.prototype, ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'clear']);
  }

  // Audio is mixed offline from window.__sched, so in-page media only has to keep film code moving.
  // play() resolves when Chrome's media pipeline starts, on the real clock, so a film that awaits it
  // would drift by however long that took on this machine. Resolve it at once instead.
  try {
    const MP = HTMLMediaElement.prototype, play = MP.play;
    MP.play = function () {
      try { const p = play.call(this); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      return Promise.resolve();
    };
  } catch (e) {}

  function hookGsap(w) {
    try {
      if (w.gsap && !w.__gsapManual) {
        w.__gsapManual = true;
        w.gsap.ticker.lagSmoothing(0);
        w.gsap.ticker.remove(w.gsap.updateRoot);
      }
    } catch (e) { /* not ready */ }
  }

  // Drive every Web Animation of `doc` from the clock. Returns true when one moved.
  function syncAnims(doc, nowMs) {
    let moving = false;
    for (const a of doc.getAnimations()) {
      let start = owned.get(a);
      if (start === undefined) {
        start = nowMs - (a.currentTime || 0);
        owned.set(a, start);
        a.pause();
        moving = true;
      }
      let end = Infinity;
      try { end = a.effect.getComputedTiming().endTime; } catch (e) {}
      const prev = a.currentTime;
      const t = Math.max(0, nowMs - start);
      a.currentTime = t;
      if (prev !== t && (prev == null || prev < end)) moving = true;
    }
    return moving;
  }

  function liveMedia(doc) {
    const ae = doc.activeElement;
    if (ae && (ae.isContentEditable || ae.tagName === 'TEXTAREA' ||
        (ae.tagName === 'INPUT' && !/^(button|checkbox|radio|submit|reset|range|color|file|hidden|image)$/i.test(ae.type)))) return true;
    for (const v of doc.querySelectorAll('video')) if (!v.paused) return true;
    return false;
  }

  // Sync this frame's own document. Returns dirty.
  window.__renderSyncLocal = () => {
    const nowMs = performance.now();
    hookGsap(window);
    if (window.gsap && window.__gsapManual) window.gsap.updateRoot(nowMs / 1000);
    const moving = syncAnims(document, nowMs);
    const d = dirty || moving || (mo && mo.takeRecords().length > 0) || liveMedia(document);
    dirty = false;
    return d;
  };

  // Top-level entry: this document plus every same-origin iframe below it.
  window.__renderSync = () => {
    let d = window.__renderSyncLocal();
    const walk = (doc) => {
      for (const f of doc.querySelectorAll('iframe')) {
        try {
          const w = f.contentWindow;
          if (!w || !w.document) continue;
          if (w.__renderSyncLocal) {
            if (w.__renderSyncLocal()) d = true;
          } else {
            // No shim in this frame (not injected yet): drive it from here and never skip.
            hookGsap(w);
            if (w.gsap && w.__gsapManual) w.gsap.updateRoot(w.performance.now() / 1000);
            syncAnims(w.document, w.performance.now());
            d = true;
          }
          walk(w.document);
        } catch (e) { /* cross-origin iframe: not ours to drive */ }
      }
    };
    walk(document);
    return d;
  };
})();
