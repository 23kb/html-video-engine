/* _snapshot-iframe.js — minimal snapshot loader for the gsap-effects-wpforms ports.
 *
 * Each port mounts ONE OR MORE real captured WPForms snapshots
 * (snapshots/<slug>/index.html) inside the stage as iframes. After load, the
 * port's GSAP timeline reaches into the iframe.contentDocument and mutates the
 * REAL captured DOM (template cards, field rows, entries, payment cards,
 * settings rows, AI panel, etc.).
 *
 * No mockup CSS — the kit is the snapshot itself.
 *
 * Usage:
 *   const { iframe, ready, query } = mountSnapshot(stage, {
 *     slug: 'admin-templates',
 *     x: 0, y: 0,
 *     w: 1280, h: 720,
 *     scale: 1.5    // fills 1920×1080 stage
 *   });
 *   await ready;
 *   const cards = query('.wpforms-template');  // returns real captured nodes
 *   gsap.from(cards, { y: 30, opacity: 0, stagger: 0.02 });  // animates real DOM
 *
 * Notes:
 * - GSAP targets cross-document elements fine — transforms are per-element.
 * - Iframe pointer-events disabled (snapshots preserve real WP hrefs).
 * - Stage origin top-left; x/y are CSS px in the stage's 1920×1080 coord space.
 * - `scale` is applied via CSS transform with transformOrigin top-left so
 *   (x, y) lands at the iframe's top-left in stage coords regardless of scale.
 */
(function (global) {
  'use strict';

  const SNAPSHOT_BASE = '../../snapshots';

  /**
   * @param {HTMLElement} stage — the .stage element (1920×1080)
   * @param {Object} opts
   * @param {string} opts.slug — snapshot folder name under /snapshots/
   * @param {number} [opts.x=0] — iframe top-left in stage coords
   * @param {number} [opts.y=0] — iframe top-left in stage coords
   * @param {number} [opts.w=1280] — iframe native width (matches snapshot capture)
   * @param {number} [opts.h=720] — iframe native height
   * @param {number} [opts.scale=1] — CSS transform scale applied at top-left
   * @param {number} [opts.zIndex=1]
   * @returns {{ iframe: HTMLIFrameElement, ready: Promise<HTMLIFrameElement>,
   *             query: (sel:string)=>NodeList, queryOne: (sel:string)=>Element|null,
   *             elementToStageRect: (el:Element)=>{x,y,w,h} }}
   */
  function mountSnapshot(stage, opts) {
    const {
      slug,
      x = 0, y = 0,
      w = 1280, h = 720,
      scale = 1,
      zIndex = 1,
    } = opts;

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'absolute',
      left: x + 'px',
      top: y + 'px',
      width: w + 'px',
      height: h + 'px',
      border: '0',
      transformOrigin: '0 0',
      transform: `scale(${scale})`,
      pointerEvents: 'none',
      display: 'block',
      zIndex: String(zIndex),
      willChange: 'transform, opacity',
      background: '#F4F1EC',
    });
    iframe.src = `${SNAPSHOT_BASE}/${slug}/index.html`;
    iframe.dataset.slug = slug;
    iframe.loading = 'eager';
    stage.appendChild(iframe);

    // Resolve as soon as the captured snapshot DOM is parsed — NOT on the
    // window 'load' event. Snapshots embed 1000+ remote wpforms.com CDN
    // <img> thumbnails; waiting for 'load' hangs indefinitely on them.
    // Must also skip the iframe's initial about:blank document — poll
    // until contentDocument is the real snapshot doc (URL matches slug)
    // and its DOM is parsed. 12s safety resolve as a last resort.
    const ready = new Promise((resolve) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(iframe); } };
      iframe.addEventListener('load', finish, { once: true });
      const t0 = performance.now();
      (function poll() {
        if (settled) return;
        const d = iframe.contentDocument;
        const onRealDoc = !!d && typeof d.URL === 'string'
          && d.URL.indexOf('about:blank') === -1
          && d.URL.indexOf(slug) !== -1;
        if (onRealDoc && d.body && (d.readyState === 'interactive' || d.readyState === 'complete')) {
          finish();
        } else if (performance.now() - t0 > 12000) {
          finish();
        } else {
          requestAnimationFrame(poll);
        }
      })();
    });

    function query(sel) {
      const doc = iframe.contentDocument;
      return doc ? doc.querySelectorAll(sel) : [];
    }
    function queryOne(sel) {
      const doc = iframe.contentDocument;
      return doc ? doc.querySelector(sel) : null;
    }
    /** Convert an in-iframe element's bounding box → stage coords (top-left origin) */
    function elementToStageRect(el) {
      if (!el || !iframe.contentDocument) return { x:0, y:0, w:0, h:0 };
      const r = el.getBoundingClientRect();
      return {
        x: x + r.left * scale,
        y: y + r.top * scale,
        w: r.width * scale,
        h: r.height * scale,
      };
    }

    return { iframe, ready, query, queryOne, elementToStageRect };
  }

  /**
   * Wait until the iframe DOM contains at least `min` matches for selector `sel`,
   * polling at 60fps. Resolves with the NodeList. Rejects after timeoutMs.
   * Some snapshots boot interactivity scripts post-load; this lets effects
   * tolerate that without racing.
   */
  function awaitDom(query, sel, { min = 1, timeoutMs = 3000 } = {}) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      function tick() {
        const list = query(sel);
        if (list && list.length >= min) return resolve(list);
        if (performance.now() - t0 > timeoutMs) return reject(new Error(`awaitDom timeout: ${sel} (found ${list ? list.length : 0}, want ${min})`));
        requestAnimationFrame(tick);
      }
      tick();
    });
  }

  /**
   * Rewrite relative URLs in adopted DOM nodes so images resolve correctly
   * once moved out of the iframe into the parent document.
   *
   * Snapshot HTML uses paths relative to `snapshots/<slug>/index.html` (e.g.
   * `_shared/assets/abc.svg`, `../_shared/assets/abc.svg`). After adopting a
   * node into the parent doc at `reference/gsap-effects-wpforms/effectXXX.html`,
   * those relatives resolve to nonexistent paths. This rewrites them to
   * absolute paths anchored at `../../snapshots/<slug>/`.
   */
  function rewriteRelativeUrls(rootEl, snapshotSlug) {
    const base = `../../snapshots/${snapshotSlug}/`;
    function fixSrc(src) {
      if (!src) return src;
      if (/^(https?:|data:|\/\/|blob:|\/)/.test(src)) return src;
      return base + src.replace(/^\.\//,'');
    }
    rootEl.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) img.setAttribute('src', fixSrc(src));
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        img.setAttribute('srcset', srcset.split(',').map(s => {
          const parts = s.trim().split(/\s+/);
          parts[0] = fixSrc(parts[0]);
          return parts.join(' ');
        }).join(', '));
      }
    });
    // also rewrite background-image inline styles
    rootEl.querySelectorAll('[style*="url("]').forEach(el => {
      const style = el.getAttribute('style');
      const fixed = style.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_, q, url) => `url(${q}${fixSrc(url)}${q})`);
      el.setAttribute('style', fixed);
    });
  }

  global.SnapshotIframe = { mountSnapshot, awaitDom, rewriteRelativeUrls };
})(window);
