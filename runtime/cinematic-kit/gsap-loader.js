// Cinematic-kit · GSAP loader.
//
// Single source of truth for lazy-loading GSAP from the CDN. Every cinematic
// archetype calls `await loadGsap()` instead of duplicating the script-tag
// boilerplate.
//
// GSAP 3 is loaded once per page. Subsequent calls return the cached promise
// (or the live `window.gsap` if it's already attached, e.g. by title-card.js
// or a teaser).

let gsapReady = null;

export function loadGsap() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('cinematic-kit/gsap-loader: window required'));
  }
  if (window.gsap) return Promise.resolve(window.gsap);
  if (gsapReady) return gsapReady;
  gsapReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/gsap/3.12.5/gsap.min.js';
    s.onload = () => resolve(window.gsap);
    s.onerror = (e) => {
      gsapReady = null; // allow retry
      reject(e);
    };
    document.head.appendChild(s);
  });
  return gsapReady;
}
