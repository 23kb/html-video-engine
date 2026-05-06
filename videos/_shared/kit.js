// videos/_shared/kit.js
//
// Shared video-author kit. Universal helpers reusable across videos.
//
// Per-video `_kit.js` may re-export from here and add video-specific helpers
// on top. Chapter modules may also import from this file directly.
//
// "Local during dev, promote at ship time" — new helpers may live in a
// video's per-video `_kit.js` while the video is being authored. When the
// video is accepted, review its `_kit.js`: anything reusable gets lifted
// here. Helpers that are genuinely video-specific stay local.
//
// See docs/chapter-module-contract.md for the import allowlist amendment.

// ─────────────────────────────────────────────────────────────────────────
// GSAP loader — vendored from /vendor/gsap/3.12.5/.
//
// Loads GSAP core plus optional Flip and MotionPathPlugin. Cached after
// first call. `window.gsap` is shared with the runtime cinematic-kit
// loader (runtime/cinematic-kit/gsap-loader.js) so a chapter that calls
// loadGsap() and a runtime cinematic that calls its own loadGsap() share
// the same library instance.
// ─────────────────────────────────────────────────────────────────────────

let gsapPromise = null;

export function loadGsap({ flip = true, motionPath = true } = {}) {
  if (window.gsap
      && (!flip || window.Flip)
      && (!motionPath || window.MotionPathPlugin)) {
    return Promise.resolve(window.gsap);
  }
  if (gsapPromise) return gsapPromise;
  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  gsapPromise = (async () => {
    if (!window.gsap)            await load('/vendor/gsap/3.12.5/gsap.min.js');
    if (motionPath && !window.MotionPathPlugin) await load('/vendor/gsap/3.12.5/MotionPathPlugin.min.js');
    if (flip && !window.Flip)    await load('/vendor/gsap/3.12.5/Flip.min.js');
    const plugins = [];
    if (window.MotionPathPlugin) plugins.push(window.MotionPathPlugin);
    if (window.Flip)             plugins.push(window.Flip);
    if (plugins.length) window.gsap.registerPlugin(...plugins);
    return window.gsap;
  })();
  return gsapPromise;
}

// ─────────────────────────────────────────────────────────────────────────
// Editorial stage layer — full-viewport overlay div above the snapshot
// iframe. Caller is responsible for mounting/removing children.
// ─────────────────────────────────────────────────────────────────────────

export function mountSceneLayer(id, { z = 80 } = {}) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const layer = document.createElement('div');
  layer.id = id;
  layer.className = 'scene-layer';
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none',
    zIndex: String(z), overflow: 'hidden', opacity: '0',
  });
  document.body.appendChild(layer);
  return layer;
}

// ─────────────────────────────────────────────────────────────────────────
// macOS-style cursor — two flavors. mountSceneCursor adds a cursor element
// to a stage layer (for editorial use). customizeEngineCursor reskins the
// engine's `.cursor` SVG in place (idempotent).
// ─────────────────────────────────────────────────────────────────────────

export function mountSceneCursor(layer) {
  const c = document.createElement('div');
  c.className = 'scene-cursor';
  c.innerHTML = `
    <svg viewBox="0 0 24 24" width="34" height="34" class="sc-arrow" aria-hidden="true">
      <path d="M5.5 3.2 V20.8 c0 .45 .54 .67 .85 .35 l4.5-4.5 a.5 .5 0 0 1 .35-.15 h6.4
               a.5 .5 0 0 0 .35-.85 L6.35 2.85 a.5 .5 0 0 0-.85 .36 Z"
        fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>
  `;
  Object.assign(c.style, {
    position: 'fixed', left: '0', top: '0', pointerEvents: 'none',
    transform: 'translate(-100px, -100px)', willChange: 'transform',
    zIndex: '9999',
  });
  layer.appendChild(c);
  return c;
}

export const SCENE_CURSOR_CSS = `
.scene-cursor .sc-arrow {
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,.34));
}
`;

export function customizeEngineCursor() {
  const c = document.querySelector('.cursor');
  if (!c || c.dataset.styled === 'mac-black') return;
  c.dataset.styled = 'mac-black';
  c.setAttribute('viewBox', '0 0 24 24');
  c.style.width = '34px';
  c.style.height = '34px';
  c.style.filter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.34))';
  // engine.cursor.moveTo positions at x - 4 / y - 2. The supplied mac cursor
  // wants x - 6.4 / y - 3.7, so margin supplies the remaining offset.
  c.style.marginLeft = '-2.4px';
  c.style.marginTop = '-1.7px';
  c.innerHTML = `
    <path d="M5.5 3.2 V20.8 c0 .45 .54 .67 .85 .35 l4.5-4.5 a.5 .5 0 0 1 .35-.15 h6.4
             a.5 .5 0 0 0 .35-.85 L6.35 2.85 a.5 .5 0 0 0-.85 .36 Z"
          fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// Inter font — loaded once via Google Fonts.
// ─────────────────────────────────────────────────────────────────────────

export function ensureFont() {
  if (document.getElementById('scene-fonts')) return;
  const l = document.createElement('link');
  l.id = 'scene-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(l);
}

// ─────────────────────────────────────────────────────────────────────────
// CSS injection — injects a <style id="..."> once. No-op if id exists.
// ─────────────────────────────────────────────────────────────────────────

export function injectCss(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────
// SFX — plays an audio file from /assets/sfx/<name>.mp3. Cached by name;
// each playback uses a cloned Audio so concurrent triggers work.
//
// Note: runtime/sfx.js already auto-fires built-in cursor/type/swoosh
// sounds. This helper covers custom moments inside an effect closure.
// ─────────────────────────────────────────────────────────────────────────

const sfxCache = {};
export function playSfx(name, { volume = 0.7, rate = 1 } = {}) {
  try {
    if (!sfxCache[name]) sfxCache[name] = new Audio(`/assets/sfx/${name}.mp3`);
    const c = sfxCache[name].cloneNode();
    c.volume = volume;
    c.playbackRate = rate;
    c.play().catch(() => {});
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────
// Text splitting — wraps each character in a per-char <span> for animation.
// Returns the spans grouped by word and flat-by-char.
//
// Note: docs/chapter-module-contract.md (line 26-29) flags bespoke text
// animations as a future-cleanup item in favor of the approved animateText
// editorial verb. This helper is here for compatibility with existing
// videos until that migration happens.
// ─────────────────────────────────────────────────────────────────────────

export function splitText(el) {
  const text = el.textContent;
  el.textContent = '';
  const words = text.split(' ');
  const wordSpans = [];
  const charSpans = [];
  words.forEach((w, i) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'sw-word';
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';
    [...w].forEach(ch => {
      const cs = document.createElement('span');
      cs.className = 'sw-char';
      cs.style.display = 'inline-block';
      cs.textContent = ch;
      wordSpan.appendChild(cs);
      charSpans.push(cs);
    });
    el.appendChild(wordSpan);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    wordSpans.push(wordSpan);
  });
  return { words: wordSpans, chars: charSpans };
}

// ─────────────────────────────────────────────────────────────────────────
// Promisify a GSAP timeline or tween — resolves on `onComplete`. Aliased
// as `flipDone` for back-compat with flip-* videos.
// ─────────────────────────────────────────────────────────────────────────

export function tlDone(tl) {
  return new Promise(resolve => tl.eventCallback('onComplete', resolve));
}

// ─────────────────────────────────────────────────────────────────────────
// Click ripple — animates a small ring at a screen point. Caller provides
// the gsap instance to avoid a circular load dependency.
// ─────────────────────────────────────────────────────────────────────────

export function clickRipple(layer, x, y, gsap, color = 'rgba(5,106,171,.55)') {
  const r = document.createElement('div');
  Object.assign(r.style, {
    position: 'fixed', left: (x - 6) + 'px', top: (y - 6) + 'px',
    width: '12px', height: '12px', borderRadius: '50%',
    border: `2px solid ${color}`, pointerEvents: 'none', zIndex: '9998',
  });
  layer.appendChild(r);
  gsap.timeline()
    .to(r, { width: 90, height: 90, left: x - 45, top: y - 45, opacity: 0, duration: 0.55, ease: 'power3.out' })
    .call(() => r.remove());
}

// ─────────────────────────────────────────────────────────────────────────
// Iframe transform helpers — read the snapshot iframe's current transform
// for pin-math in flip-style cross-iframe animation.
// ─────────────────────────────────────────────────────────────────────────

export function iframeScale() {
  const el = document.querySelector('iframe.ui');
  if (!el) return 1;
  const m = /scale\(([-\d.]+)\)/.exec(el.style.transform || '');
  return m ? parseFloat(m[1]) : 1;
}

export function iframeTranslate() {
  const el = document.querySelector('iframe.ui');
  if (!el) return { x: 0, y: 0 };
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
}

// ─────────────────────────────────────────────────────────────────────────
// Clone an iframe element with computed styles inlined; pin clone to its
// source's screen rect via position:fixed. Returns { clone, rect }.
//
// The clone has all relative URLs (img.src, inline url() in style attrs)
// rewritten to absolute against the iframe's baseURI, so the host document
// can fetch them correctly.
//
// Used by Flip-style cross-iframe animation: animate a copy of a real
// WPForms element without touching iframe DOM.
// ─────────────────────────────────────────────────────────────────────────

export function cloneFromIframe(selector, { scale = 1 } = {}) {
  const iframe = document.querySelector('iframe.ui');
  const idoc = iframe?.contentDocument;
  const iwin = iframe?.contentWindow;
  if (!iframe || !idoc || !iwin) return null;
  const src = idoc.querySelector(selector);
  if (!src) return null;

  const ifrRect = iframe.getBoundingClientRect();
  const sRect = src.getBoundingClientRect();
  const screenLeft = ifrRect.left + sRect.left * scale;
  const screenTop = ifrRect.top + sRect.top * scale;
  const screenW = sRect.width * scale;
  const screenH = sRect.height * scale;

  const clone = src.cloneNode(true);
  inlineComputedStylesDeep(iwin, src, clone);

  // Resolve relative URLs (img.src, inline url(...) in style attrs) against
  // the iframe's base URL so the host document can fetch them. Without this,
  // "assets/foo.svg" in the snapshot resolves to /scenes/assets/foo.svg.
  const baseUrl = iframe.contentDocument.baseURI;
  clone.querySelectorAll('img[src]').forEach((img) => {
    try { img.src = new URL(img.getAttribute('src'), baseUrl).href; } catch {}
  });
  clone.querySelectorAll('[style*="url("]').forEach((el) => {
    el.style.cssText = el.style.cssText.replace(
      /url\(["']?([^"')]+)["']?\)/g,
      (_, u) => {
        try { return 'url(' + new URL(u, baseUrl).href + ')'; }
        catch { return 'url(' + u + ')'; }
      }
    );
  });

  // Strip event surfaces — clone is a visual actor only.
  clone.querySelectorAll('a, button').forEach((el) => {
    el.setAttribute('tabindex', '-1');
    el.style.pointerEvents = 'none';
  });

  // Absolute on the host stage at the source's screen position. Width/height
  // pinned so the clone's own layout matches the original; Flip will animate
  // deltas via transform when these change later.
  clone.style.position = 'fixed';
  clone.style.left = Math.round(screenLeft) + 'px';
  clone.style.top = Math.round(screenTop) + 'px';
  clone.style.width = Math.round(screenW) + 'px';
  clone.style.height = Math.round(screenH) + 'px';
  clone.style.margin = '0';
  clone.style.zIndex = '1';

  return { clone, rect: { left: screenLeft, top: screenTop, width: screenW, height: screenH } };
}

// Walk source + clone trees in parallel, copying every computed style from
// source to clone as inline cssText. Uses the iframe window's getComputedStyle
// because the source lives in iframe.contentDocument.
function inlineComputedStylesDeep(srcWin, srcRoot, dstRoot) {
  const srcWalker = srcRoot.ownerDocument.createTreeWalker(srcRoot, NodeFilter.SHOW_ELEMENT);
  const dstWalker = document.createTreeWalker(dstRoot, NodeFilter.SHOW_ELEMENT);
  let s = srcRoot;
  let d = dstRoot;
  while (s && d) {
    copyComputedStyle(srcWin, s, d);
    s = srcWalker.nextNode();
    d = dstWalker.nextNode();
  }
}

function copyComputedStyle(win, src, dst) {
  const cs = win.getComputedStyle(src);
  let css = '';
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    css += prop + ':' + cs.getPropertyValue(prop) + ';';
  }
  dst.style.cssText = css;
}
