// videos/_shared/wpforms-interactions.js
//
// Standard WPForms interaction sequences — the "executable interaction
// vocabulary" answer to the repeated failure mode where editorial videos
// either (a) skip the user-action arc entirely or (b) re-invent cursor +
// snapshot-swap choreography from scratch and get the timings wrong.
//
// Each interaction is an async method on the WPFormsInteractions class. It
// targets REAL selectors from captured WPForms snapshots, drives the
// motion-primitives Cursor over the iframe-document target, then either
// (snapshot-swap) crossfades to a different captured snapshot, or
// (DOM-only) toggles classes/attributes inside the current snapshot.
//
// IFRAMEMANAGER — small helper, also exported. Owns the iframe slot inside
// the stage, exposes load/swap/elementToStageCoords. The QC pages use this
// directly; production scenes can either use it or wire the engine's own
// snapshot loader and adapt the coord helper.
//
// Source references:
// - videos/_shared/motion-primitives.js — Cursor + cinematicFlight + clickRipple
// - .claude/skills/wpforms-gsap-rules/SKILL.md — L0 GSAP discipline
// - .claude/skills/wpforms-motion-audit/SKILL.md — S–F tier criteria
// - runtime/transitions.js — engine swap-style choreography we mirror at a
//   smaller surface (no flash-guard cover needed; we own both iframes)
//
// Determinism: no Date.now, no unseeded Math.random, no fetch, no repeat:-1.

/* eslint-env browser */
/* global gsap */

import { Cursor, clickRipple } from './motion-primitives.js';

// ─────────────────────────────────────────────────────────────────────────
// IframeManager — snapshot iframe slot + crossfade swap
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
// OVERSAMPLE was tried at 4 (mount iframe at 4× + body zoom + transform scale-down)
// but GPU-downsampling killed subpixel AA — text rendered with color fringes
// and pixelated edges at REST (zoom 1, before any camera move). Reverted to 1
// to match engine.js: iframe at native size, no zoom: trick, no rest transform.
// Trade: deep zooms (>3×) soften. Engine.js had this trade for 12 production
// videos and it was acceptable.
//
// SETTLE-MODE (docs/zoom-quality-fix-2026-05-12.md): the soft-text-at-deep-zoom
// trade is no longer accepted. At the END of any camera tween that lands at
// zoom > SETTLE_THRESHOLD, IframeManager swaps the iframe from CSS-transform
// rendering (compositor-bilinear, blurry) to "settle mode": iframe CSS box
// resized to N× the stage size + iframe-doc `documentElement.style.zoom = N` +
// transform cleared. The two N× factors cancel for layout (viewport stays at
// the original 1280-CSS-px so admin layouts don't trigger mobile breakpoints)
// but content renders at N× pixel density — Chromium re-rasterizes text the
// same way Ctrl+ does. Settle exits at the start of the next tween or any
// camera write so all other primitives keep operating in transform mode.
const DEFAULT_OVERSAMPLE = 1;
// Camera zoom values strictly above this trigger settle mode after a tween
// completes. Below this, CSS transform is fine (sub-1.4× rasterization
// artifacts are tolerable). The threshold is deliberately just above 1 so
// any meaningful zoom benefits from re-rasterization.
const SETTLE_THRESHOLD = 1.001;
// Feature detect CSS `zoom`. Chromium and Safari support it; Firefox added
// support in 126 (May 2024). Older Firefox skips settle mode and falls back
// to transform-only rendering (existing softness at deep zoom).
const SUPPORTS_CSS_ZOOM = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;width:50px;height:1px;zoom:2;';
    document.body.appendChild(probe);
    const supported = Math.abs(probe.getBoundingClientRect().width - 100) < 1;
    probe.remove();
    return supported;
  } catch (_) {
    return false;
  }
})();

/**
 * IframeManager — mounts a snapshot iframe inside a stage element and
 * handles load + crossfade-swap to a different snapshot.
 *
 * Iframe sizing follows the tutorial engine camera model: the iframe renders
 * at its native captured viewport, is centered inside the visible stage, and
 * receives a single direct camera transform. Do not pre-scale the iframe and
 * then zoom a parent wrapper; Chromium will composite the iframe as a texture
 * and closeups become visibly soft.
 *
 * Crossfade swap is a minimal subset of `runtime/transitions.js#swapFast`:
 * outgoing iframe opacity fades 1 → 0 while a freshly-loaded incoming
 * iframe opacity fades 0 → 1. No flash-guard cover needed — we own both
 * iframes simultaneously, so there is no body-wipe gap.
 *
 * @example
 *   const stage = document.getElementById('stage');
 *   const ifm = new IframeManager(stage);
 *   await ifm.load('admin-forms-overview');
 *   // ... user interactions ...
 *   await ifm.swap('admin-templates');
 *   const btn = ifm.query('.page-title-action');
 *   const pt = ifm.elementToStageCoords(btn);
 *   await cursor.glide(pt);
 */
export class IframeManager {
  /**
   * @param {HTMLElement} stage — the 1280×720 stage element
   * @param {Object} [opts]
   * @param {{width:number,height:number}} [opts.viewport] — visible stage size
   * @param {{width:number,height:number}} [opts.iframeSize] — logical snapshot layout size
   * @param {number} [opts.oversample=4] — iframe backing multiplier
   * @param {string} [opts.snapshotBase='/snapshots'] — URL prefix for snapshot folders
   * @param {string} [opts.indexFile='index.html'] — file name inside each snapshot folder
   */
  constructor(stage, opts = {}) {
    const {
      viewport = DEFAULT_VIEWPORT,
      iframeSize = viewport,
      oversample = DEFAULT_OVERSAMPLE,
      snapshotBase = '/snapshots',
      indexFile = 'index.html',
    } = opts;
    this.stage = stage;
    this._viewport = { ...viewport };
    this.iframeSize = { ...iframeSize };
    this.oversample = Math.max(1, Number(oversample) || 1);
    this._baseScale = 1 / this.oversample;
    this.scale = this._baseScale;
    this._physicalIframeSize = {
      width: this.iframeSize.width * this.oversample,
      height: this.iframeSize.height * this.oversample,
    };
    this._origin = {
      x: (viewport.width - this._physicalIframeSize.width * this._baseScale) / 2,
      y: (viewport.height - this._physicalIframeSize.height * this._baseScale) / 2,
    };
    this._camera = { zoom: 1, tx: 0, ty: 0 };
    this.snapshotBase = snapshotBase;
    this.indexFile = indexFile;
    this._slug = null;
    this._iframe = null;
    // Settle-mode flag. True when iframe is rendering at zoom × native density
    // (resized box + html.zoom) instead of CSS transform.
    this._settleMode = false;
    this._settleRafHandle = 0;
    this._slot = this._mountSlot();
  }

  _mountSlot() {
    const slot = document.createElement('div');
    slot.className = 'ifm-slot';
    Object.assign(slot.style, {
      position: 'absolute',
      left: '0', top: '0',
      width: this._viewport.width + 'px',
      height: this._viewport.height + 'px',
      overflow: 'hidden',
      background: '#F4F1EC',
    });
    this.stage.appendChild(slot);
    return slot;
  }

  _createIframe(slug) {
    const f = document.createElement('iframe');
    Object.assign(f.style, {
      position: 'absolute',
      left: this._origin.x + 'px',
      top: this._origin.y + 'px',
      width: this._physicalIframeSize.width + 'px',
      height: this._physicalIframeSize.height + 'px',
      transformOrigin: '0 0',
      border: '0',
      display: 'block',
      opacity: '0',
      // Captured snapshots preserve real WordPress href URLs (e.g. ".../index.php",
      // ".../update-core.php"). A stray click on the iframe — including from
      // QC-page debugging — would navigate the iframe to a URL the dev server
      // doesn't have, returning a 404 plaintext that breaks the stage. Disable
      // pointer-events at rest; interactions library drives clicks via simulated
      // events on specific elements, which bypass this guard.
      pointerEvents: 'none',
      willChange: 'transform, opacity',
    });
    this._applyCameraToIframe(f);
    f.dataset.slug = slug;
    f.loading = 'eager';
    f.src = `${this.snapshotBase}/${slug}/${this.indexFile}`;
    return f;
  }

  _cameraTransform({ zoom = this._camera.zoom, tx = this._camera.tx, ty = this._camera.ty } = {}) {
    const totalScale = this._baseScale * zoom;
    return `scale(${totalScale}) translate(${tx / totalScale}px, ${ty / totalScale}px)`;
  }

  _applyCameraToIframe(iframe = this._iframe) {
    if (!iframe) return;
    // If the iframe being targeted is the current one and we're in settle
    // mode, restore transform-mode geometry first. _exitSettleMode does NOT
    // re-call this method (it only writes geometry), so no recursion.
    if (this._settleMode && iframe === this._iframe) {
      this._exitSettleMode();
    }
    iframe.style.transform = this._cameraTransform();
  }

  /**
   * Exit settle mode on the current iframe. Restores transform-mode geometry:
   *
   *   - iframe.style.width/height        ← physical (no N× upscale)
   *   - iframe.style.left/top            ← origin (centered in slot)
   *   - iframe.contentDocument.documentElement.style.zoom  ← '' (clear)
   *
   * Does NOT re-apply the camera transform — caller (_applyCameraToIframe,
   * scroll helpers, etc.) is responsible for the next visual state. Safe to
   * call when not in settle mode (returns immediately).
   *
   * Called automatically by `_applyCameraToIframe`, `cameraToElement`,
   * `smoothScrollIntoView`, and `scrollIntoView`. Any other method that
   * reads or writes iframe-doc coordinates should call this first; settle
   * mode is a "rest display state" that callers must opt out of before
   * touching layout coords.
   */
  _exitSettleMode() {
    if (!this._settleMode) return;
    const iframe = this._iframe;
    if (!iframe) {
      this._settleMode = false;
      return;
    }
    this._settleMode = false;
    if (this._settleRafHandle) {
      cancelAnimationFrame(this._settleRafHandle);
      this._settleRafHandle = 0;
    }
    iframe.style.width = this._physicalIframeSize.width + 'px';
    iframe.style.height = this._physicalIframeSize.height + 'px';
    iframe.style.left = this._origin.x + 'px';
    iframe.style.top = this._origin.y + 'px';
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.documentElement) doc.documentElement.style.zoom = '';
    } catch (_) { /* cross-origin or missing — nothing to clear */ }
  }

  /**
   * Settle-mode entry: re-rasterize iframe contents at `zoom × native density`.
   *
   * Why: CSS `transform: scale(N)` on the iframe rasterizes the iframe contents
   * ONCE at the iframe's CSS box size, then the GPU compositor samples that
   * texture at the transformed scale. At zoom 3-4× the bilinear upscale is
   * visibly soft — text loses subpixel AA and the letter edges read as
   * stair-stepped. The OVERSAMPLE workaround (mounting the iframe at 4× +
   * `body { zoom: 4 }` + `transform: scale(0.25)`) traded sharp deep-zoom for
   * SOFT REST: 4× capture then GPU downsample to display kills subpixel AA
   * even at zoom 1. Both extremes shipped at some point and both were rejected.
   *
   * Settle-mode is the third path. It only activates at the END of a camera
   * tween that lands above `SETTLE_THRESHOLD`. The transition swaps the
   * rendering strategy:
   *
   *   transform-mode (during all tweens, all interactions, rest at zoom 1):
   *     iframe.style.width        = STAGE_W      (e.g. 1280)
   *     iframe.style.height       = STAGE_H      (e.g.  720)
   *     iframe.style.left/top     = origin       (centered in slot)
   *     iframe.style.transform    = scale(N) translate(tx/N, ty/N)
   *     iframe.contentDocument.documentElement.style.zoom = ''  (default 1)
   *
   *   settle-mode (post-tween, zoom > 1.001):
   *     iframe.style.width        = STAGE_W * N  (3840 at N=3)
   *     iframe.style.height       = STAGE_H * N
   *     iframe.style.left/top     = origin + (tx, ty)            (px-offset)
   *     iframe.style.transform    = 'none'
   *     iframe.contentDocument.documentElement.style.zoom = N    (re-rasterize)
   *
   * The math: with `iframe.style.width = STAGE_W * N`, the iframe's internal
   * window.innerWidth becomes STAGE_W * N. Applying `documentElement.zoom = N`
   * then SHRINKS the layout viewport by N back to STAGE_W. The two factors
   * cancel for layout (WPForms admin still sees a desktop-1280 viewport, no
   * mobile-breakpoint collapse), but content renders at N× density across the
   * larger canvas. This is the same path Chromium's Ctrl+ takes — fresh
   * rasterization, sharp text, native subpixel AA preserved.
   *
   * The iframe is then visually wider/taller than the stage slot, so the slot
   * `overflow: hidden` clips it. `iframe.style.left/top = origin + tx/ty`
   * positions the visible 1280×720 window exactly over the same iframe-doc
   * coordinates as the equivalent transform-mode pose.
   *
   * Why a stand-alone enter/exit instead of always settle: any time a tween
   * runs, the iframe-doc layout must be at STAGE_W to match the on-screen
   * dimensions the tween animates against. Switching geometry mid-tween would
   * compound the layout reflow with the animation. Settle is therefore a
   * "rest state" that only the final, no-longer-animating camera pose
   * occupies.
   *
   * Equivalent for callers that read `elementToStageCoords` etc.: see
   * `iframePointToStage` settle branch — BCR returns post-zoom coords inside
   * the iframe doc, and the iframe's left/top already encodes (origin + tx,
   * origin + ty), so the visible position math collapses to a simple add.
   *
   * No-op when zoom ≤ SETTLE_THRESHOLD, when CSS `zoom` is unsupported
   * (older Firefox <126), or when iframe.contentDocument is unavailable.
   */
  _enterSettleMode() {
    this._settleRafHandle = 0;
    if (this._settleMode) return;
    if (!this._iframe) return;
    if (!SUPPORTS_CSS_ZOOM) return;
    const { zoom, tx, ty } = this._camera;
    if (zoom <= SETTLE_THRESHOLD) return;
    const f = this._iframe;
    let doc;
    try { doc = f.contentDocument; } catch (_) { return; }
    if (!doc || !doc.documentElement) return;
    const N = zoom;
    const w = this.iframeSize.width * N;
    const h = this.iframeSize.height * N;
    // Apply width/height + zoom together so the inner doc lays out at the
    // CANCELED viewport (STAGE_W) instead of momentarily at STAGE_W*N.
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    doc.documentElement.style.zoom = String(N);
    f.style.transform = 'none';
    f.style.left = (this._origin.x + tx) + 'px';
    f.style.top = (this._origin.y + ty) + 'px';
    this._settleMode = true;
  }

  /**
   * Schedule a settle-mode entry for one animation frame after the call.
   *
   * The rAF deferral matters: it gives the browser one extra paint cycle to
   * land the final tween frame at full CSS-transform opacity before the
   * geometry swap. If we ran the swap synchronously inside the tween's
   * onComplete (i.e. inside a GSAP-ticker rAF callback), the browser would
   * collapse the last animated frame and the settle reflow into the same
   * paint, which can look like a single-frame jitter.
   *
   * The handle is tracked on `_settleRafHandle` so a subsequent
   * `_applyCameraToIframe` (e.g. a brand-new tween started before settle
   * fired) can cancel the pending settle and avoid a wasted reflow.
   */
  _scheduleSettleMode() {
    if (!SUPPORTS_CSS_ZOOM) return;
    if (this._settleRafHandle) cancelAnimationFrame(this._settleRafHandle);
    this._settleRafHandle = requestAnimationFrame(() => this._enterSettleMode());
  }

  static _waitForIframeLoad(iframe, expectedUrl) {
    return new Promise(resolve => {
      const done = () => resolve();
      // Check if the iframe is ALREADY done loading the EXPECTED url. The
      // about:blank initial doc shows `readyState === 'complete'` before
      // navigation even starts, so we can't trust readyState alone — we
      // also need the contentWindow.location.href to match. If anything
      // doesn't line up, fall through to the load event.
      try {
        const href = iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.href;
        if (expectedUrl && href && href.endsWith(expectedUrl) &&
            iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          Promise.resolve().then(done);
          return;
        }
      } catch (_) { /* cross-origin or not-yet-ready — fall through */ }
      iframe.addEventListener('load', done, { once: true });
    });
  }

  _installOversampleStyles(iframe) {
    if (!iframe || this.oversample === 1) return;
    const doc = iframe.contentDocument;
    if (!doc || !doc.documentElement || !doc.body) return;
    const style = doc.createElement('style');
    style.dataset.ifmOversample = 'true';
    style.textContent = `
      html {
        width: ${this.iframeSize.width}px !important;
        min-width: ${this.iframeSize.width}px !important;
      }
      body {
        width: ${this.iframeSize.width}px !important;
        min-width: ${this.iframeSize.width}px !important;
        zoom: ${this.oversample};
      }
    `;
    doc.head.appendChild(style);
  }

  /**
   * Load a snapshot into the slot. Crossfades from the previous one if any.
   * @param {string} slug — snapshot folder slug
   * @returns {Promise<HTMLIFrameElement>} the loaded iframe element
   */
  async load(slug) {
    if (this._iframe) {
      return this.swap(slug);
    }
    const f = this._createIframe(slug);
    this._slot.appendChild(f);
    await IframeManager._waitForIframeLoad(f, `${this.snapshotBase}/${slug}/${this.indexFile}`);
    this._installOversampleStyles(f);
    this._iframe = f;
    this._slug = slug;
    // Single-frame opacity flip via gsap so determinism check passes (no setTimeout).
    if (typeof gsap !== 'undefined') {
      gsap.set(f, { opacity: 1 });
    } else {
      f.style.opacity = '1';
    }
    return f;
  }

  /**
   * Crossfade-swap to a different snapshot.
   * @param {string} slug
   * @param {Object} [opts]
   * @param {number} [opts.duration=0.32] — crossfade duration (s)
   * @param {string} [opts.ease='sine.inOut']
   * @returns {Promise<HTMLIFrameElement>} the new iframe element
   */
  async swap(slug, opts = {}) {
    const { duration = 0.32, ease = 'sine.inOut' } = opts;
    if (!this._iframe) return this.load(slug);
    if (this._slug === slug) return this._iframe;
    // The new iframe boots in transform mode regardless of the previous
    // iframe's settle state. Clear the flag so post-swap camera applies use
    // the correct geometry (and the new iframe element doesn't get spurious
    // exit-from-settle DOM writes targeting it via the `iframe === _iframe`
    // guard in _applyCameraToIframe).
    if (this._settleRafHandle) {
      cancelAnimationFrame(this._settleRafHandle);
      this._settleRafHandle = 0;
    }
    this._settleMode = false;
    const next = this._createIframe(slug);
    this._slot.appendChild(next);
    await IframeManager._waitForIframeLoad(next, `${this.snapshotBase}/${slug}/${this.indexFile}`);
    this._installOversampleStyles(next);
    this._applyCameraToIframe(next);
    const prev = this._iframe;
    await new Promise(resolve => {
      let done = 0;
      const tick = () => { done++; if (done === 2) resolve(); };
      gsap.to(prev, { opacity: 0, duration, ease, onComplete: tick });
      gsap.to(next, { opacity: 1, duration, ease, onComplete: tick });
    });
    prev.remove();
    this._iframe = next;
    this._slug = slug;
    // If camera is at a deep zoom after swap (e.g. caller didn't reset
    // camera before swap), re-enter settle on the new iframe.
    if (this._camera.zoom > SETTLE_THRESHOLD) this._scheduleSettleMode();
    return next;
  }

  /**
   * @returns {string|null} current snapshot slug
   */
  currentSlug() { return this._slug; }

  /**
   * @returns {{w:number,h:number,width:number,height:number}} visible stage viewport
   */
  viewport() {
    return {
      w: this._viewport.width,
      h: this._viewport.height,
      width: this._viewport.width,
      height: this._viewport.height,
    };
  }

  /**
   * @returns {HTMLIFrameElement|null} current iframe element
   */
  iframe() { return this._iframe; }

  /**
   * @returns {Document|null} current iframe contentDocument
   */
  doc() {
    return this._iframe ? this._iframe.contentDocument : null;
  }

  /**
   * Query a selector inside the iframe document.
   * @param {string} selector
   * @returns {Element|null}
   */
  query(selector) {
    const d = this.doc();
    return d ? d.querySelector(selector) : null;
  }

  /**
   * Query all selectors inside the iframe document.
   * @param {string} selector
   * @returns {Element[]}
   */
  queryAll(selector) {
    const d = this.doc();
    return d ? Array.from(d.querySelectorAll(selector)) : [];
  }

  /**
   * @returns {{zoom:number,tx:number,ty:number,scale:number,x:number,y:number}}
   * current engine-style camera state. `scale/x/y` aliases are provided for
   * older primitive callers that used GSAP transform vocabulary.
   */
  cameraState() {
    return {
      zoom: this._camera.zoom,
      tx: this._camera.tx,
      ty: this._camera.ty,
      scale: this._camera.zoom,
      x: this._camera.tx,
      y: this._camera.ty,
    };
  }

  _logicalRect(rect) {
    return {
      left: rect.left / this.oversample,
      top: rect.top / this.oversample,
      right: rect.right / this.oversample,
      bottom: rect.bottom / this.oversample,
      width: rect.width / this.oversample,
      height: rect.height / this.oversample,
    };
  }

  /**
   * Apply an engine-style camera pose directly to the iframe.
   * @param {{zoom?:number,tx?:number,ty?:number,scale?:number,x?:number,y?:number}} pose
   */
  setCamera(pose = {}) {
    const zoom = pose.zoom ?? pose.scale ?? this._camera.zoom;
    const tx = pose.tx ?? pose.x ?? this._camera.tx;
    const ty = pose.ty ?? pose.y ?? this._camera.ty;
    this._camera = { zoom, tx, ty };
    if (this._cameraTween) {
      this._cameraTween.kill();
      this._cameraTween = null;
    }
    // _applyCameraToIframe exits settle mode if active, then writes transform.
    this._applyCameraToIframe();
    // Instant setCamera into a deep zoom should still benefit from settle.
    if (zoom > SETTLE_THRESHOLD) {
      this._scheduleSettleMode();
    }
  }

  /**
   * Tween the engine-style camera directly on the iframe.
   * @param {{zoom?:number,tx?:number,ty?:number,scale?:number,x?:number,y?:number,duration?:number,ease?:string,onUpdate?:Function}} pose
   * @returns {Promise<void>}
   */
  tweenCamera(pose = {}) {
    const to = {
      zoom: pose.zoom ?? pose.scale ?? this._camera.zoom,
      tx: pose.tx ?? pose.x ?? this._camera.tx,
      ty: pose.ty ?? pose.y ?? this._camera.ty,
    };
    const duration = pose.duration ?? 0.72;
    const ease = pose.ease ?? 'power3.out';
    if (this._cameraTween) this._cameraTween.kill();
    // Cancel any pending settle from a previous tween — the new tween needs
    // transform-mode for its duration.
    if (this._settleRafHandle) {
      cancelAnimationFrame(this._settleRafHandle);
      this._settleRafHandle = 0;
    }
    if (typeof gsap === 'undefined' || duration <= 0) {
      this.setCamera(to);
      return Promise.resolve();
    }
    const state = { ...this._camera };
    return new Promise(resolve => {
      this._cameraTween = gsap.to(state, {
        ...to,
        duration,
        ease,
        onUpdate: () => {
          this._camera = { zoom: state.zoom, tx: state.tx, ty: state.ty };
          this._applyCameraToIframe();
          if (pose.onUpdate) pose.onUpdate(this.cameraState());
        },
        onComplete: () => {
          this._camera = { ...to };
          this._applyCameraToIframe();
          this._cameraTween = null;
          // Schedule re-rasterization at native density for deep zooms.
          if (to.zoom > SETTLE_THRESHOLD) this._scheduleSettleMode();
          resolve();
        },
      });
    });
  }

  resetCamera(opts = {}) {
    return this.tweenCamera({
      zoom: 1,
      tx: 0,
      ty: 0,
      duration: opts.duration ?? 0.32,
      ease: opts.ease ?? 'power2.out',
      onUpdate: opts.onUpdate,
    });
  }

  /**
   * Compute an engine-style camera pose that frames an iframe-doc element.
   * @param {string|Element} target
   * @param {Object} [opts]
   * @param {number} [opts.fill=0.5]
   * @param {number} [opts.pad=24]
   * @param {number} [opts.minZoom=1]
   * @param {number} [opts.maxZoom=3]
   * @param {boolean} [opts.clamp=true]
   * @returns {{zoom:number,tx:number,ty:number,scale:number,x:number,y:number,rect:Object}}
   */
  cameraToElement(target, opts = {}) {
    const {
      fill = 0.5,
      pad = 24,
      minZoom = 1,
      maxZoom = 3,
      clamp = true,
    } = opts;
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager.cameraToElement: target not found: ${target}`);
    // If settle mode is active, the iframe-doc layout is currently at zoom N
    // and getBoundingClientRect returns post-zoom CSS px. The camera math
    // below assumes pre-zoom (unzoomed-layout) coords. Exit settle for a
    // clean measurement; the caller is about to issue a new tweenCamera that
    // will re-enter settle on landing.
    if (this._settleMode) {
      this._exitSettleMode();
      this._iframe.style.transform = this._cameraTransform();
    }
    const r0 = this._logicalRect(el.getBoundingClientRect());
    const r = {
      left: r0.left - pad,
      top: r0.top - pad,
      width: r0.width + pad * 2,
      height: r0.height + pad * 2,
    };
    const rawZoom = Math.min(
      (this._viewport.width * fill) / Math.max(1, r.width),
      (this._viewport.height * fill) / Math.max(1, r.height)
    );
    const zoom = Math.max(minZoom, Math.min(maxZoom, rawZoom));
    let cx = r.left + r.width / 2;
    let cy = r.top + r.height / 2;
    if (clamp) {
      const minCx = this._viewport.width / (2 * zoom);
      const maxCx = this.iframeSize.width - minCx;
      const minCy = this._viewport.height / (2 * zoom);
      const maxCy = this.iframeSize.height - minCy;
      cx = Math.min(Math.max(cx, minCx), maxCx);
      cy = Math.min(Math.max(cy, minCy), maxCy);
    }
    const tx = this._viewport.width / 2 - this._origin.x - cx * zoom;
    const ty = this._viewport.height / 2 - this._origin.y - cy * zoom;
    return { zoom, tx, ty, scale: zoom, x: tx, y: ty, rect: r };
  }

  /**
   * Convert an iframe-document element (or selector string) to its center
   * point in stage-LOCAL coordinates. Cursor.glide consumes stage-local
   * coords (the cursor element is gsap-transformed within the stage's
   * coord space).
   *
   * @param {string|Element} target
   * @returns {{x:number, y:number}}
   * @throws if target not found
   */
  elementToStageCoords(target) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager: target not found: ${target}`);
    const r = el.getBoundingClientRect(); // inside iframe, iframe-CSS pixels
    // Empty rect (width===0 && height===0 && left===0 && top===0) means the
    // element is in the DOM but has no layout — collapsed accordion section,
    // display:none, or detached. Returning origin here makes the cursor jump
    // to (0,0), which is the "cursor goes to top-left" footgun. Throw with a
    // descriptive message so the caller knows which selector to scope.
    if (r.width === 0 && r.height === 0 && r.left === 0 && r.top === 0) {
      throw new Error(
        `IframeManager.elementToStageCoords: element has empty layout rect (likely hidden / display:none / collapsed). ` +
        `Selector: ${typeof target === 'string' ? target : el.tagName + (el.id ? '#' + el.id : '')}`
      );
    }
    const logical = this._logicalRect(r);
    return this.iframePointToStage(logical.left + logical.width / 2, logical.top + logical.height / 2);
  }

  /**
   * Convert an iframe-document element (or selector string) to a stage-local
   * rectangle. Keeps `elementToStageCoords()` backward-compatible while
   * giving highlight/camera helpers the full projected box.
   *
   * @param {string|Element} target
   * @returns {{x:number,y:number,w:number,h:number,width:number,height:number}}
   * @throws if target not found
   */
  elementToStageRect(target) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager: target not found: ${target}`);
    const r = this._logicalRect(el.getBoundingClientRect());
    const p1 = this.iframePointToStage(r.left, r.top);
    const p2 = this.iframePointToStage(r.left + r.width, r.top + r.height);
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    return { x, y, w, h, width: w, height: h };
  }

  /**
   * Port of engine.js toStage(): iframe viewport coordinate -> stage-local
   * coordinate under the current direct iframe camera transform.
   * @param {number} ix
   * @param {number} iy
   * @returns {{x:number,y:number}}
   */
  iframePointToStage(ix, iy) {
    if (this._settleMode) {
      // In settle mode, callers (e.g. elementToStageCoords) read
      // getBoundingClientRect inside the iframe doc, which returns
      // POST-zoom CSS pixels. The iframe element itself is positioned at
      // (origin.x + tx, origin.y + ty) with no CSS transform and width
      // STAGE_W * zoom. So the visible screen position of an iframe-doc
      // post-zoom point (ix, iy) is just origin + tx/ty + ix/iy.
      return {
        x: this._origin.x + this._camera.tx + ix,
        y: this._origin.y + this._camera.ty + iy,
      };
    }
    return {
      x: this._origin.x + ix * this._camera.zoom + this._camera.tx,
      y: this._origin.y + iy * this._camera.zoom + this._camera.ty,
    };
  }

  /**
   * Project a highlight ring and optional label over an iframe-doc element.
   * The ring is mounted in the stage coordinate space so it follows the same
   * transform stack as the iframe slot in single-HTML tutorial scenes.
   *
   * @param {string|Element} target
   * @param {Object} [opts]
   * @param {string} [opts.label='']
   * @param {number} [opts.pad=6]
   * @param {string} [opts.color='rgba(226, 119, 48, 0.92)']
   * @param {number} [opts.strokeWidth=2]
   * @param {number} [opts.fadeMs=220]
   * @param {number} [opts.holdMs=0] — 0 means caller controls removal
   * @returns {{remove:Function, element:HTMLElement}}
   */
  highlightElement(target, opts = {}) {
    const {
      label = '',
      pad = 6,
      color = 'rgba(226, 119, 48, 0.92)',
      strokeWidth = 2,
      fadeMs = 220,
      holdMs = 0,
    } = opts;
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager.highlightElement: target not found: ${target}`);
    this._ensureHighlightStyles();
    const rect = this.elementToStageRect(el);
    const ring = document.createElement('div');
    ring.className = 'ifm-highlight';
    Object.assign(ring.style, {
      left: (rect.x - pad) + 'px',
      top: (rect.y - pad) + 'px',
      width: (rect.w + pad * 2) + 'px',
      height: (rect.h + pad * 2) + 'px',
      boxShadow: `0 0 0 ${strokeWidth}px ${color}, 0 10px 30px rgba(226,119,48,0.16)`,
    });
    this.stage.appendChild(ring);

    let labelEl = null;
    if (label) {
      labelEl = document.createElement('div');
      labelEl.className = 'ifm-highlight-label';
      labelEl.textContent = label;
      this.stage.appendChild(labelEl);
      const viewport = this.viewport();
      const labelTop = rect.y - pad - 34;
      const placeBelow = labelTop < 8;
      const x = Math.max(8, Math.min(rect.x - pad, viewport.w - 240));
      const y = placeBelow ? rect.y + rect.h + pad + 10 : labelTop;
      Object.assign(labelEl.style, {
        left: x + 'px',
        top: y + 'px',
      });
    }

    const nodes = labelEl ? [ring, labelEl] : [ring];
    gsap.to(nodes, { opacity: 1, duration: fadeMs / 1000, ease: 'power2.out' });

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      gsap.to(nodes, {
        opacity: 0,
        duration: fadeMs / 1000,
        ease: 'power2.in',
        onComplete: () => nodes.forEach(n => n.remove()),
      });
    };
    if (holdMs > 0) gsap.delayedCall(holdMs / 1000, remove);
    return { remove, element: ring };
  }

  _ensureHighlightStyles() {
    if (this.stage.querySelector(':scope > style[data-ifm-highlight]')) return;
    const style = document.createElement('style');
    style.dataset.ifmHighlight = 'true';
    style.textContent = `
      .ifm-highlight {
        position: absolute;
        border-radius: 7px;
        pointer-events: none;
        opacity: 0;
        z-index: 82;
      }
      .ifm-highlight-label {
        position: absolute;
        max-width: 232px;
        padding: 7px 10px;
        border-radius: 6px;
        background: #E27730;
        color: #fff;
        font: 700 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0;
        box-shadow: 0 8px 18px rgba(0,0,0,0.18);
        opacity: 0;
        pointer-events: none;
        z-index: 83;
      }
    `;
    this.stage.appendChild(style);
  }

  /**
   * Reverse the stage's CSS transform to convert viewport coords → stage-
   * local coords (the space gsap.set(.., {x, y}) operates in for elements
   * mounted on the stage).
   *
   * Stage transform: scale(s) with transform-origin: center center. So
   * stage-local (X, Y) maps to viewport (centerVx + (X - cssW/2)*s,
   * centerVy + (Y - cssH/2)*s) where center is the same in both coord
   * systems. Inverting that gives the formula below.
   *
   * @param {number} vx
   * @param {number} vy
   * @returns {{x:number, y:number}}
   */
  _viewportToStage(vx, vy) {
    const stageR = this.stage.getBoundingClientRect();
    const win = this.stage.ownerDocument.defaultView;
    const cs = win.getComputedStyle(this.stage);
    const cssW = parseFloat(cs.width) || this._viewport.width;
    const cssH = parseFloat(cs.height) || this._viewport.height;
    let scale = 1;
    const m = (cs.transform || '').match(/matrix\(([-\d.]+),\s*[-\d.]+,\s*[-\d.]+,\s*([-\d.]+),/);
    if (m) scale = parseFloat(m[1]); // scaleX (we don't author non-uniform stage scale)
    const centerVx = stageR.left + stageR.width / 2;
    const centerVy = stageR.top + stageR.height / 2;
    return {
      x: (vx - centerVx) / scale + cssW / 2,
      y: (vy - centerVy) / scale + cssH / 2,
    };
  }

  /**
   * Scroll an iframe-document element into view. Forces `behavior:
   * 'instant'` because some captured snapshots (e.g. builder-fields)
   * ship `html { scroll-behavior: smooth }` which overrides the more
   * permissive `'auto'` — and a still-animating smooth-scroll moves the
   * target out from under cursor.glide. `'instant'` (Chrome 102+) wins
   * over the page setting.
   * @param {string|Element} target
   * @param {ScrollIntoViewOptions} [opts]
   */
  scrollIntoView(target, opts = { block: 'center', behavior: 'instant' }) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) return;
    // Settle mode's iframe doc lays out at N× — scrolling there leaves the
    // window at a post-zoom scrollY that becomes stale once settle exits.
    // Exit first so the scroll lands in 1× iframe-CSS px and remains valid.
    if (this._settleMode) {
      this._exitSettleMode();
      this._iframe.style.transform = this._cameraTransform();
    }
    el.scrollIntoView(opts);
  }

  /**
   * Smoothly scroll an iframe-document element into view with a fixed GSAP
   * tween. Use this for camera/framing beats where the scroll itself is part
   * of the visual motion; cursor interactions keep the instant helper above.
   * @param {string|Element} target
   * @param {ScrollIntoViewOptions & {duration?:number,ease?:string}} [opts]
   * @returns {Promise<Element|undefined>}
   */
  smoothScrollIntoView(target, opts = {}) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) return Promise.resolve();
    const {
      block = 'center',
      inline = 'center',
      duration = 0.62,
      ease = 'power2.out',
    } = opts;
    // Exit settle mode so scroll math runs in 1× iframe-CSS px (see comment
    // on scrollIntoView).
    if (this._settleMode) {
      this._exitSettleMode();
      this._iframe.style.transform = this._cameraTransform();
    }
    const doc = el.ownerDocument;
    const win = doc.defaultView;
    const root = doc.scrollingElement || doc.documentElement;
    const body = doc.body || root;
    if (!win || !root) return Promise.resolve(el);

    const rect = el.getBoundingClientRect();
    const viewportW = win.innerWidth || this.iframeSize.width;
    const viewportH = win.innerHeight || this.iframeSize.height;
    const startX = win.scrollX || root.scrollLeft || body.scrollLeft || 0;
    const startY = win.scrollY || root.scrollTop || body.scrollTop || 0;
    const maxX = Math.max(0, root.scrollWidth - viewportW);
    const maxY = Math.max(0, root.scrollHeight - viewportH);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const axisTarget = (start, leading, size, viewport, align) => {
      if (align === 'start') return start + leading;
      if (align === 'end') return start + leading + size - viewport;
      if (align === 'nearest') {
        if (leading >= 0 && leading + size <= viewport) return start;
        if (leading < 0) return start + leading;
        return start + leading + size - viewport;
      }
      return start + leading + size / 2 - viewport / 2;
    };
    const targetX = clamp(axisTarget(startX, rect.left, rect.width, viewportW, inline), 0, maxX);
    const targetY = clamp(axisTarget(startY, rect.top, rect.height, viewportH, block), 0, maxY);

    if (this._scrollTween) {
      this._scrollTween.kill();
      if (this._scrollResolve) this._scrollResolve();
      this._scrollTween = null;
      this._scrollResolve = null;
    }
    if (typeof gsap === 'undefined' || duration <= 0) {
      win.scrollTo(targetX, targetY);
      return Promise.resolve(el);
    }

    const pos = { x: startX, y: startY };
    return new Promise(resolve => {
      this._scrollResolve = () => resolve(el);
      this._scrollTween = gsap.to(pos, {
        x: targetX,
        y: targetY,
        duration,
        ease,
        onUpdate: () => win.scrollTo(pos.x, pos.y),
        onComplete: () => {
          this._scrollTween = null;
          this._scrollResolve = null;
          resolve(el);
        },
      });
    });
  }

  /**
   * Wait n seconds. Uses setTimeout (same as motion-primitives.js#wait) so
   * the timer fires even when gsap's rAF is throttled by a backgrounded
   * preview browser. Determinism-safe: setTimeout takes a fixed-ms duration,
   * no Date.now or wall-clock dependence.
   * @param {number} seconds
   * @returns {Promise<void>}
   */
  wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// WPFormsInteractions — high-level interaction sequences
// ─────────────────────────────────────────────────────────────────────────

// Submenu item → snapshot slug map for navWPFormsSidebarMenu. Items not in
// this map are click-only (no snapshot swap).
const WPF_SIDEBAR_TARGETS = {
  'All Forms': 'admin-forms-overview',
  'Add New Form': 'builder-setup',
  'Entries': 'admin-entries-overview',
  'Payments': 'admin-payments',
  'Form Templates': 'admin-templates',
  'Settings': 'admin-settings-general',
  'Tools': 'admin-tools-import',
  'Addons': 'admin-addons',
  'Privacy Compliance': 'admin-privacy-compliance',
};

// Builder sidebar section → snapshot slug map for navBuilderSidebar.
const BUILDER_PANEL_TARGETS = {
  setup: 'builder-setup',
  fields: 'builder-fields',
  settings: 'builder-settings-general',
  providers: 'builder-providers',
  payments: 'builder-payments',
  revisions: 'builder-revisions',
};

// Per-form profile for openFormInList. Each entry maps a form_id (as it
// appears in the admin-forms-overview snapshot) to the form's display name
// and the subset of `data-field-id` values to keep visible after swapping
// to builder-fields. Field IDs are sourced from the captured all-fields
// fixture (snapshots/builder-fields/index.html): 48=Name, 49=Email,
// 50=Textarea, 10=Phone, 15=Address.
const FORM_PROFILES = {
  '55': { name: 'Contact Us form', fields: ['48', '49', '50'] },
  '53': { name: 'Newsletter Signup', fields: ['48', '49'] },
  '40': { name: 'Job Application', fields: ['48', '49', '10', '15', '50'] },
  // Demo-only profile for the open-field-options QC page — exposes one
  // example of each field family Umair wants demos for (Name, Email,
  // Paragraph Text, Checkboxes, Multiple Choice). Not a "real" form on
  // the live site; just keeps the canvas tidy while sub-interactions run.
  'demo-5': { name: 'Demo form (5 fields)', fields: ['48', '49', '50', '7', '6'] },
};

// Settings sub-tab → snapshot slug map for openSettingsTab.
const SETTINGS_TAB_TARGETS = {
  general: 'builder-settings-general',
  notifications: 'builder-settings-notifications',
  confirmation: 'builder-settings-confirmation',
  anti_spam: 'builder-settings-anti_spam',
  themes: 'builder-settings-themes',
};

/**
 * WPFormsInteractions — async methods that execute a WPForms interaction
 * sequence using a Cursor over an IframeManager-managed snapshot iframe.
 *
 * Methods are documented with the brief's JSDoc convention:
 *   @prerequisite — what snapshot must be loaded before calling
 *   @operation — snapshot-swap | dom-only | hybrid
 *   @endsAt — what snapshot is loaded after the call returns
 *   @primitives — which motion-primitives are used
 *   @realDom — citation of the real WPForms DOM target
 *   @duration — approximate runtime in seconds
 */
export class WPFormsInteractions {
  /**
   * @param {HTMLElement} stage — the 1280×720 stage element
   * @param {Cursor} cursor — Cursor instance from motion-primitives.js
   * @param {IframeManager} iframeManager
   */
  constructor(stage, cursor, iframeManager) {
    this.stage = stage;
    this.cursor = cursor;
    this.iframe = iframeManager;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  _assertSnapshot(expected, methodName) {
    const cur = this.iframe.currentSlug();
    if (cur !== expected) {
      throw new Error(
        `${methodName}: expected current snapshot '${expected}' but got '${cur}'. ` +
        `Call iframeManager.load('${expected}') first.`
      );
    }
  }

  _assertSnapshotOneOf(expected, methodName) {
    const cur = this.iframe.currentSlug();
    if (!expected.includes(cur)) {
      throw new Error(
        `${methodName}: expected one of ${expected.map(s => `'${s}'`).join(', ')} but got '${cur}'. ` +
        `Call iframeManager.load('${expected[0]}') first.`
      );
    }
  }

  _findOrThrow(selector, methodName) {
    const el = this.iframe.query(selector);
    if (!el) {
      throw new Error(`${methodName}: selector not found in '${this.iframe.currentSlug()}': ${selector}`);
    }
    return el;
  }

  async _glideAndClick(selector, opts = {}) {
    let el = typeof selector === 'string' ? this._findOrThrow(selector, 'glideAndClick') : selector;
    el = this._visibleTarget(el);
    // skipScroll: bail on the second scrollIntoView. Useful after a hover
    // reveal that's already aligned the target — re-scrolling would shift
    // the click point out from under the cursor, which is exactly the bug
    // selectTemplate hit when buttons appeared at `position:absolute;bottom`.
    if (!opts.skipScroll) {
      this.iframe.scrollIntoView(el);
      await this.iframe.wait(0.25);
    }
    const pt = this.iframe.elementToStageCoords(el);
    await this.cursor.glide(pt, { duration: opts.glideDuration ?? 0.95 });
    await this.cursor.click({ ripple: opts.ripple ?? true });
  }

  _visibleTarget(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) return el;
    return el.querySelector?.([
      '.wpforms-smart-tags-widget',
      '.wpforms-smart-tags-widget-input',
      '.wpforms-smart-tags-widget-textarea',
      '.wpforms-toggle-control-icon',
      'select',
      'button',
      'input:not([type="hidden"])',
      'textarea',
    ].join(',')) || el;
  }

  async _typeIntoIframeInput(input, text, opts = {}) {
    const { charDuration = 0.045, clear = true } = opts;
    const win = input.ownerDocument.defaultView;
    if (clear) {
      input.value = '';
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      await this.iframe.wait(0.12);
    }
    for (let i = 1; i <= String(text).length; i++) {
      input.value = String(text).slice(0, i);
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      await this.iframe.wait(charDuration);
    }
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  }

  async _typeIntoSmartTagWidget(wrap, text, opts = {}) {
    const { charDuration = 0.04, clear = true } = opts;
    const host = wrap.querySelector('.wpforms-smart-tags-widget-input, .wpforms-smart-tags-widget-textarea');
    const original = wrap.querySelector('.wpforms-smart-tags-widget-original, input, textarea');
    if (!host) throw new Error('_typeIntoSmartTagWidget: visible smart-tag widget not found');
    await this._glideAndClick(host, { ripple: false });
    const win = host.ownerDocument.defaultView;
    if (clear) {
      host.textContent = '';
      if (original) {
        original.value = '';
        original.dispatchEvent(new win.Event('input', { bubbles: true }));
      }
      host.dispatchEvent(new win.Event('input', { bubbles: true }));
      await this.iframe.wait(0.12);
    }
    for (let i = 1; i <= String(text).length; i++) {
      const slice = String(text).slice(0, i);
      host.textContent = slice;
      if (original) {
        original.value = slice;
        original.dispatchEvent(new win.Event('input', { bubbles: true }));
      }
      host.dispatchEvent(new win.Event('input', { bubbles: true }));
      await this.iframe.wait(charDuration);
    }
    if (original) original.dispatchEvent(new win.Event('change', { bubbles: true }));
  }

  _resolveSmartTagWrap(target, methodName) {
    const el = typeof target === 'string' ? this._findOrThrow(target, methodName) : target;
    const wrap = el.matches?.('.wpforms-panel-field, .wpforms-field-option-row')
      ? el
      : el.closest?.('.wpforms-panel-field, .wpforms-field-option-row');
    if (!wrap) throw new Error(`${methodName}: target is not inside a smart-tag field wrapper`);
    return wrap;
  }

  _selectorForElement(el, fallback = '') {
    if (el.id) return `#${cssEscape(el.id)}`;
    return fallback;
  }

  _resolveSmartTagItem(dropdown, pick) {
    const query = pick || {};
    const wantedTag = query.tag ?? query.value;
    const wantedLabel = query.label ?? query.tag;
    const items = Array.from(dropdown.querySelectorAll('ul.list li'));
    const find = (respectType) => {
      for (const li of items) {
        const span = li.querySelector('.wpforms-smart-tags-widget-item');
        if (!span) continue;
        if (respectType && query.type && span.dataset.type !== query.type) continue;
        if (wantedTag !== undefined && String(li.dataset.value) === String(wantedTag)) return span;
        if (wantedLabel && span.textContent.trim().toLowerCase().includes(String(wantedLabel).toLowerCase())) return span;
      }
      return null;
    };
    return find(true) || find(false);
  }

  _smartTagOptionsForField(fieldSel) {
    const wrap = this._resolveSmartTagWrap(fieldSel, '_smartTagOptionsForField');
    const dropdown = wrap.querySelector('.insert-smart-tag-dropdown');
    if (!dropdown) return [];
    return Array.from(dropdown.querySelectorAll('ul.list li'))
      .map(li => {
        const span = li.querySelector('.wpforms-smart-tags-widget-item');
        if (!span) return null;
        return {
          value: li.dataset.value,
          label: span.textContent.trim(),
          type: span.dataset.type || '',
        };
      })
      .filter(Boolean);
  }

  getSmartTagOptions(fieldSel) {
    return this._smartTagOptionsForField(fieldSel);
  }

  _chipDataValue(item) {
    const li = item.closest('li');
    if (item.dataset.type === 'field') {
      const additional = item.dataset.additional ? `|${item.dataset.additional}` : '';
      return `field_id="${li.dataset.value}${additional}"`;
    }
    return li.dataset.value;
  }

  _nextBlockId(blockType) {
    const ids = this.iframe.queryAll(`.wpforms-builder-settings-block[data-block-type="${cssEscape(blockType)}"]`)
      .map(block => parseInt(block.dataset.blockId, 10))
      .filter(Number.isFinite);
    return String((ids.length ? Math.max(...ids) : 0) + 1);
  }

  _updateBlockName(block, name) {
    const label = block.querySelector('.wpforms-builder-settings-block-name');
    const input = block.querySelector('.wpforms-builder-settings-block-name-edit input');
    if (label) label.textContent = name;
    if (input) input.value = name;
  }

  async _slideBlockIn(block, fade = 0.72) {
    const naturalHeight = block.getBoundingClientRect().height || block.scrollHeight || 280;
    gsap.set(block, {
      opacity: 0,
      y: -18,
      scale: 0.96,
      maxHeight: 0,
      overflow: 'hidden',
      transformOrigin: 'top center',
      filter: 'blur(2px)',
    });
    await new Promise(resolve => {
      gsap.to(block, {
        opacity: 1,
        y: 0,
        scale: 1,
        maxHeight: naturalHeight,
        filter: 'blur(0px)',
        duration: fade,
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(block, { clearProps: 'maxHeight,overflow,filter,transform' });
          resolve();
        },
      });
    });
  }

  async _selectElementFromDropdown(select, value, opts = {}) {
    const options = Array.from(select.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
    const target = options.find(o => o.value === value)
      || options.find(o => o.label.toLowerCase() === String(value).toLowerCase());
    if (!target) throw new Error(`_selectElementFromDropdown: option not found: ${value}`);
    await this._glideAndClick(select, { ripple: false, glideDuration: opts.glideDuration ?? 0.62 });
    const panel = await this._openFakeDropdown(select, options, select.value, opts);
    const row = panel.querySelector(`[data-value="${cssEscape(target.value)}"]`);
    await this._glideAndClick(row, { ripple: false, skipScroll: true, glideDuration: 0.56 });
    row.style.background = '#036aab';
    row.style.color = '#fff';
    select.value = target.value;
    select.dispatchEvent(new select.ownerDocument.defaultView.Event('change', { bubbles: true }));
    await this._closeFakeDropdown(panel);
  }

  async _openModalPrompt(opts = {}) {
    const {
      title = 'Enter a name',
      placeholder = '',
      typeText = '',
      methodName = '_openModalPrompt',
      fade = 0.28,
      charDuration = 0.045,
    } = opts;
    const doc = this.iframe.doc();
    const backdrop = doc.createElement('div');
    backdrop.className = '__wpf_prompt_backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '2147483646',
      opacity: '0',
    });
    const dialog = doc.createElement('div');
    dialog.className = '__wpf_prompt_dialog';
    Object.assign(dialog.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: '420px',
      transform: 'translate(-50%, -50%) scale(0.94)',
      background: '#fff',
      borderRadius: '4px',
      borderTop: '6px solid #0399ED',
      boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
      color: '#1d2327',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      padding: '30px 40px',
      textAlign: 'center',
      zIndex: '2147483647',
      opacity: '0',
    });
    dialog.innerHTML = `
      <div style="width:56px;height:56px;border-radius:50%;background:#0399ED;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;font-size:30px;font-style:italic;font-weight:700;font-family:Georgia,serif;">i</div>
      <div style="font-size:16px;margin-bottom:18px;">${escapeHtml(title)}</div>
      <input type="text" class="__wpf_prompt_input" placeholder="${escapeHtml(placeholder)}" style="width:100%;padding:10px 12px;border:1px solid #ccd0d4;border-radius:3px;font-size:14px;box-sizing:border-box;margin-bottom:24px;outline:none;">
      <div style="display:flex;justify-content:center;gap:10px;">
        <button class="__wpf_prompt_ok" style="background:#0399ED;color:#fff;border:none;padding:10px 28px;border-radius:3px;cursor:pointer;font-size:15px;font-weight:600;">OK</button>
        <button class="__wpf_prompt_cancel" style="background:#f1f1f1;color:#333;border:none;padding:10px 24px;border-radius:3px;cursor:pointer;font-size:15px;">Cancel</button>
      </div>
    `;
    doc.body.appendChild(backdrop);
    doc.body.appendChild(dialog);
    await new Promise(resolve => {
      gsap.to(backdrop, { opacity: 1, duration: fade, ease: 'sine.out' });
      gsap.to(dialog, { opacity: 1, scale: 1, duration: fade, ease: 'back.out(1.4)', onComplete: resolve });
    });
    const input = dialog.querySelector('.__wpf_prompt_input');
    await this._glideAndClick(input, { ripple: false, skipScroll: true, glideDuration: 0.55 });
    await this._typeIntoIframeInput(input, typeText, { charDuration, clear: true });
    const ok = dialog.querySelector('.__wpf_prompt_ok');
    await this._glideAndClick(ok, { ripple: true, skipScroll: true, glideDuration: 0.55 });
    await new Promise(resolve => {
      gsap.to(backdrop, { opacity: 0, duration: fade, ease: 'sine.in' });
      gsap.to(dialog, { opacity: 0, scale: 0.94, duration: fade, ease: 'sine.in', onComplete: resolve });
    });
    backdrop.remove();
    dialog.remove();
    if (!typeText) throw new Error(`${methodName}: prompt submitted without text`);
    return typeText;
  }

  // ── Wave 1: Admin-side ──────────────────────────────────────────────────

  /**
   * Click the "Add New" button on the WPForms All Forms page to start
   * creating a new form. Crossfades to the template library snapshot.
   *
   * @prerequisite Current snapshot: 'admin-forms-overview'
   * @operation snapshot-swap (admin-forms-overview → admin-templates)
   * @endsAt 'admin-templates'
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap
   * @realDom Targets `.page-title-action[data-action="add"]` — the orange
   *   "Add New" button in the page header (snapshots/admin-forms-overview/
   *   index.html:416).
   * @duration ~2.4s (glide 0.95 + click 0.3 + swap 0.32 + buffers)
   *
   * @param {Object} [opts]
   * @param {number} [opts.swapDuration=0.32]
   * @returns {Promise<void>}
   */
  async navAddNewForm(opts = {}) {
    this._assertSnapshot('admin-forms-overview', 'navAddNewForm');
    await this._glideAndClick('.page-title-action[data-action="add"]');
    await this.iframe.wait(0.18);
    await this.iframe.swap('admin-templates', { duration: opts.swapDuration ?? 0.32 });
  }

  /**
   * Pick a template card on the Form Templates page. Crossfades to the
   * builder setup snapshot. Accepts the template's `data-slug` value (see
   * `tools/list-snapshots.js` or `snapshots/admin-templates/index.html`).
   *
   * @prerequisite Current snapshot: 'admin-templates'
   * @operation snapshot-swap (admin-templates → builder-setup)
   * @endsAt 'builder-setup'
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap,
   *   IframeManager.scrollIntoView
   * @realDom Targets `.wpforms-template-select[data-slug="<slug>"]`
   *   (snapshots/admin-templates/index.html:476 for 'blank').
   * @duration ~3.0s (scroll 0.6 + glide 0.95 + click 0.3 + swap 0.32)
   *
   * @param {string} slug — template data-slug (e.g. 'blank',
   *   'simple-contact-form-template', 'newsletter-signup-form-template')
   * @returns {Promise<void>}
   */
  async selectTemplate(slug, opts = {}) {
    this._assertSnapshot('admin-templates', 'selectTemplate');
    const card = this._findOrThrow(
      `.wpforms-template[id="wpforms-template-${cssEscape(slug)}"]`,
      'selectTemplate'
    );

    // 1) Scroll card into view + glide cursor toward it (lands on the
    //    thumbnail area, mimicking a user hovering the card itself).
    this.iframe.scrollIntoView(card);
    await this.iframe.wait(0.55);
    const thumb = card.querySelector('.wpforms-template-thumbnail') || card;
    const hoverPt = this.iframe.elementToStageCoords(thumb);
    await this.cursor.glide(hoverPt, { duration: 0.85 });

    // 2) Reveal the per-card action buttons. The snapshot ships a
    //    `.wpforms-template.active .wpforms-template-buttons { opacity: 1 }`
    //    rule, but it lives inside a CSS `@layer` that loses to the
    //    unlayered `.wpforms-template-buttons { opacity: 0 }` base — so
    //    adding `.active` alone doesn't reveal them. We add `.active` to
    //    keep the visual state class correct (other rules hook off it),
    //    AND set inline opacity (which beats the layered cascade). The
    //    button text is normalized to match the live product copy — see
    //    docs/wpforms-interactions-library-2026-05-11.md "Template hover
    //    state inventory" for the per-card variants.
    card.classList.add('active');
    this._normalizeTemplateButtons(card, slug);
    const buttonsWrap = card.querySelector('.wpforms-template-buttons');
    if (buttonsWrap) {
      buttonsWrap.style.transition = 'opacity 200ms ease-out';
      buttonsWrap.style.opacity = '1';
    }
    await this.iframe.wait(0.55); // dwell so the viewer reads the buttons

    // 3) Click the primary action button (orange for blank + standard;
    //    purple-dark for the AI generate card). skipScroll: the buttons
    //    sit `position:absolute; bottom:15px` inside the already-in-view
    //    card; a second scrollIntoView would shift them out from under
    //    the cursor mid-glide and the click would miss.
    const primary = card.querySelector(
      '.wpforms-template-generate, .wpforms-template-select'
    );
    if (!primary) {
      throw new Error(`selectTemplate: no primary action button inside card for slug '${slug}'`);
    }
    await this._glideAndClick(primary, { skipScroll: true });
    // No snapshot swap. selectTemplate is intentionally scoped to: pick a
    // card → hover-reveal its action buttons → click the primary action.
    // The handoff to builder-setup belongs to a separate interaction; not
    // every caller wants to leave admin-templates after a click.
  }

  /**
   * Per-template-variant button normalization. The snapshot ships some
   * older copy ("Create Form") for the non-blank / non-AI cards; we replace
   * it with "Use Template" so the hover state matches the live product.
   * Blank and AI variants already match.
   *
   * Variants (from docs/wpforms-interactions-library-2026-05-11.md):
   *   • slug='generate'  → single purple-dark "Generate Form"
   *   • slug='blank'     → single orange "Create Blank Form"
   *   • all others       → orange "Use Template" + light-grey "View Demo"
   */
  _normalizeTemplateButtons(card, slug) {
    const buttonsWrap = card.querySelector('.wpforms-template-buttons');
    if (!buttonsWrap) return;
    const select = buttonsWrap.querySelector('.wpforms-template-select');
    const generate = buttonsWrap.querySelector('.wpforms-template-generate');
    const demo = buttonsWrap.querySelector('.wpforms-template-demo');
    if (slug === 'generate') {
      if (generate) generate.textContent = 'Generate Form';
    } else if (slug === 'blank') {
      if (select) select.textContent = 'Create Blank Form';
      if (demo) demo.remove();
    } else {
      if (select) select.textContent = 'Use Template';
      if (demo) demo.textContent = 'View Demo';
    }
  }

  /**
   * Click a WordPress sidebar WPForms submenu item to navigate. Items map
   * to canonical snapshots (see WPF_SIDEBAR_TARGETS at the top of this
   * file). Most snapshots (admin-forms-overview, builder-*) already render
   * the submenu open and current.
   *
   * @prerequisite Current snapshot has the `#toplevel_page_wpforms-overview`
   *   sidebar visible. True of all admin-* snapshots and builder-* snapshots.
   * @operation snapshot-swap (current → target snapshot for item)
   * @endsAt The mapped snapshot for `item` (or stays on current if no map)
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap
   * @realDom Targets `#toplevel_page_wpforms-overview .wp-submenu a`
   *   filtered by visible link text (snapshots/admin-forms-overview/
   *   index.html:353).
   * @duration ~2.6s
   *
   * @param {string} item — visible submenu label (e.g. 'Add New Form',
   *   'Entries', 'Settings', 'Form Templates', 'Addons')
   * @param {Object} [opts]
   * @param {boolean} [opts.swap=true] — set false to click without swap
   * @returns {Promise<void>}
   */
  async navWPFormsSidebarMenu(item, opts = {}) {
    const { swap = true, swapDuration = 0.32 } = opts;
    const doc = this.iframe.doc();
    if (!doc) throw new Error('navWPFormsSidebarMenu: no iframe loaded');
    const links = doc.querySelectorAll('#toplevel_page_wpforms-overview .wp-submenu a');
    let target = null;
    for (const a of links) {
      // Strip the "NEW!" badge span (`.wpforms-menu-new`) before comparing —
      // previously a `/NEW!?/i` regex was eating the literal word "New" from
      // "Add New Form", so the equality check failed.
      const clone = a.cloneNode(true);
      clone.querySelectorAll('.wpforms-menu-new').forEach(n => n.remove());
      const txt = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt === item) { target = a; break; }
    }
    if (!target) {
      throw new Error(`navWPFormsSidebarMenu: submenu item '${item}' not found in '${this.iframe.currentSlug()}'`);
    }
    await this._glideAndClick(target);
    if (swap && WPF_SIDEBAR_TARGETS[item]) {
      await this.iframe.wait(0.18);
      await this.iframe.swap(WPF_SIDEBAR_TARGETS[item], { duration: swapDuration });
    }
  }

  /**
   * Click a form row in the All Forms list to open it in the builder.
   * Crossfades to the builder-fields snapshot.
   *
   * @prerequisite Current snapshot: 'admin-forms-overview'
   * @operation snapshot-swap (admin-forms-overview → builder-fields)
   * @endsAt 'builder-fields'
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap
   * @realDom Targets `td.column-name a[href*="form_id=<id>"]`
   *   (snapshots/admin-forms-overview/index.html:499 for form_id=55).
   * @duration ~2.5s
   *
   * @param {number|string} formId — the form's WP post ID (e.g. 55, 53, 40)
   * @returns {Promise<void>}
   */
  async openFormInList(formId, opts = {}) {
    this._assertSnapshot('admin-forms-overview', 'openFormInList');
    const link = this._findOrThrow(
      `td.column-name a[href*="form_id=${formId}"]`,
      'openFormInList'
    );
    // Click target: the bolded form-name <strong>, not the parent <a>. The
    // anchor's bounding rect includes the row-actions row below the title,
    // which made the cursor land visibly below the form name. Targeting
    // <strong> puts the cursor squarely on the title text. `_glideAndClick`
    // handles the scroll-into-view internally (instant, then coord read).
    const titleEl = link.querySelector('strong') || link;
    await this._glideAndClick(titleEl);
    await this.iframe.wait(0.18);
    await this.iframe.swap('builder-fields', { duration: opts.swapDuration ?? 0.32 });
    // After the swap, set the form-specific name + fields so the three demo
    // forms don't all look like the same all-fields fixture.
    this._applyFormProfile(String(formId));
  }

  /**
   * Apply the per-form DOM profile after openFormInList swaps to
   * builder-fields. Sets the form title and hides any canvas fields not
   * in the form's profile. Falls back to a no-op for unknown form IDs
   * (visible result: the all-fields fixture as captured).
   */
  /**
   * Apply a form profile to the currently-loaded builder-fields snapshot.
   * Sets the form title (both toolbar span AND canvas h2 — there are TWO
   * `.wpforms-form-name` elements) and hides any canvas field whose
   * data-field-id isn't in the profile's allowlist. Public so callers
   * can apply a profile without going through openFormInList (e.g. the
   * dragFieldToForm QC page mounts on builder-fields and wants the
   * Contact Us layout from the start).
   *
   * @param {string|number} formId — key into FORM_PROFILES
   * @returns {boolean} true if a profile was applied
   */
  applyFormProfile(formId) {
    return this._applyFormProfile(String(formId));
  }

  _applyFormProfile(formId) {
    const profile = FORM_PROFILES[formId];
    if (!profile) return false;
    const doc = this.iframe.doc();
    if (!doc) return false;
    // BOTH form-name elements get updated — the captured builder ships a
    // `.wpforms-center-form-name.wpforms-form-name` <span> in the toolbar
    // AND an `<h2 class="wpforms-form-name">` in the canvas title-desc.
    // querySelector would only catch the first; querySelectorAll catches both.
    for (const titleEl of doc.querySelectorAll('.wpforms-form-name')) {
      titleEl.textContent = profile.name;
    }
    const allowed = new Set(profile.fields.map(String));
    // Iterate ALL fields anywhere in the wrap (not just direct children) —
    // payment fields like paypal-commerce, stripe-credit-card, and the
    // payment-* set live alongside the basics in the captured All-Fields
    // Fixture and need to be hidden too. The direct-child selector missed
    // them when they were grouped inside a layout container.
    for (const field of this.iframe.queryAll('.wpforms-field-wrap .wpforms-field')) {
      const id = field.getAttribute('data-field-id');
      if (!allowed.has(id)) field.style.display = 'none';
    }
    // Hide non-field decorative UI that the captured fixture renders
    // outside the `.wpforms-field-wrap`. The PayPal commerce buttons
    // (Apple Pay / Google Pay / PayPal Checkout) live as a sibling of
    // the form-submit button under `.wpforms-preview` — they look
    // out-of-place on Contact Us / Newsletter / Job Application demos
    // since none of those forms use PayPal Commerce. Adding more such
    // elements? Append them to the list here.
    const STRAY_UI_SELECTORS = [
      '#wpforms-paypal-commerce-buttons-wrapper',
    ];
    for (const sel of STRAY_UI_SELECTORS) {
      const el = doc.querySelector(sel);
      if (el) el.style.display = 'none';
    }
    return true;
  }

  // ── Wave 1: Builder-side ────────────────────────────────────────────────

  /**
   * Drag a field from the builder's left palette onto the form canvas.
   * Visual drag uses a ghost element cloned from the palette button so the
   * carry looks like a real WPForms drop. On release, appends a placeholder
   * `.wpforms-field` to the canvas inside the iframe so the dropped state
   * persists.
   *
   * @prerequisite Current snapshot: 'builder-fields'
   * @operation dom-only (visual drag + placeholder append; no swap)
   * @endsAt 'builder-fields' (with one extra placeholder field appended)
   * @primitives Cursor.glide, Cursor.drag, plus a stage-mounted ghost clone
   * @realDom Source: `[data-field-type="<slug>"].wpforms-add-fields-button`
   *   (snapshots/builder-fields/index.html:762). Target: `.wpforms-field-wrap`
   *   (snapshots/builder-fields/index.html:4719).
   * @duration ~3.2s (glide 0.95 + carry 1.2 + drop 0.4 + DOM ~0.2)
   *
   * @param {string} fieldSlug — palette field type (e.g. 'text', 'email',
   *   'name', 'textarea', 'select', 'phone', 'address')
   * @returns {Promise<void>}
   */
  async dragFieldToForm(fieldSlug, opts = {}) {
    this._assertSnapshot('builder-fields', 'dragFieldToForm');
    const { carryDuration = 1.10 } = opts;
    const source = this._findOrThrow(
      `.wpforms-add-fields-button[data-field-type="${cssEscape(fieldSlug)}"]`,
      'dragFieldToForm'
    );
    const dropZone = this._findOrThrow('.wpforms-field-wrap', 'dragFieldToForm');

    this.iframe.scrollIntoView(source);
    await this.iframe.wait(0.35);

    // Build the landing field FIRST (hidden), so mid-drag we can do a real
    // FLIP reveal instead of fabricating a div. Mirrors the engine's pattern
    // in runtime/drag.js where prep stashes the field and the drag reveals
    // it with `display: block`.
    const landed = this._prepareLandingField(fieldSlug, dropZone);

    // Drop point = just below the LAST VISIBLE existing field that's still
    // in the iframe's viewport. The all-fields fixture renders ~50 fields
    // at full height, so its wrap-bottom is several thousand pixels down;
    // we clamp to the iframe's visible viewport so the cursor stays on
    // screen. If no visible-and-on-screen field exists, drop near the top
    // of the wrap.
    const iframeViewportH = this.iframe.iframeSize.height;
    const visibleFields = this.iframe
      .queryAll('.wpforms-field-wrap .wpforms-field')
      .filter(el => {
        if (el === landed) return false;
        if (el.offsetParent === null) return false;
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.bottom < iframeViewportH;
      });
    const anchorEl = visibleFields[visibleFields.length - 1] || dropZone;
    const anchorRect = anchorEl.getBoundingClientRect();
    const fromPt = this.iframe.elementToStageCoords(source);
    // Compute drop point in iframe-CSS pixels, then convert through the
    // same viewport-to-stage path elementToStageCoords uses (so the drop
    // ends up where the field-wrap actually renders, not where naive
    // multiply-by-scale would put it).
    const dropEnd = anchorEl === dropZone
      ? { x: anchorRect.left + anchorRect.width / 2, y: Math.min(anchorRect.top + 80, iframeViewportH - 60) }
      : { x: anchorRect.left + anchorRect.width / 2, y: anchorRect.bottom + 28 };
    const ifrR = this.iframe.iframe().getBoundingClientRect();
    const sx = ifrR.width / this.iframe.iframeSize.width;
    const sy = ifrR.height / this.iframe.iframeSize.height;
    const toPt = this.iframe._viewportToStage(
      ifrR.left + dropEnd.x * sx,
      ifrR.top + dropEnd.y * sy
    );

    // Glide cursor onto source (lifts before press).
    await this.cursor.glide(fromPt, { duration: 0.55 });

    // Build the cloned + style-inlined ghost — looks like the real WPForms
    // sidebar pill (per runtime/drag.js#dragField). Capped at 260px wide.
    const ghost = this._buildSidebarPillGhost(source, fromPt);
    await this.iframe.wait(0.18); // brief press dwell with ghost lifted

    // Carry: ghost + cursor glide simultaneously to toPt over carryDuration.
    // Ghost uses a CSS transition (mirrors engine pattern); cursor uses gsap
    // — both reach the destination at carryDuration seconds.
    ghost.style.transition =
      `left ${carryDuration}s cubic-bezier(.4,.1,.3,1), ` +
      `top ${carryDuration}s cubic-bezier(.4,.1,.3,1), ` +
      `transform 220ms ease, opacity 220ms ease`;
    requestAnimationFrame(() => {
      ghost.style.left = (toPt.x - ghost._halfW) + 'px';
      ghost.style.top = (toPt.y - ghost._halfH) + 'px';
    });

    // Mid-drag reveal: at ~58% of carry, FLIP-reveal the landing field so
    // the canvas grows BEFORE the ghost lands. This is what makes the drop
    // feel like a real DOM mutation instead of a faked appearance.
    const revealAfter = Math.max(0, carryDuration * 0.58);
    setTimeout(() => this._flipRevealLanded(landed), revealAfter * 1000);

    await this.cursor.glide(toPt, { duration: carryDuration });

    // Drop: ghost fades + un-tilts on top of the now-visible field.
    ghost.style.transition = 'opacity 260ms ease, transform 260ms ease';
    ghost.style.opacity = '0';
    ghost.style.transform = 'rotate(0deg) scale(0.96)';
    await this.iframe.wait(0.26);
    ghost.remove();

    // Cursor release squash-back (synthesized — `cursor.click()` style
    // without the ripple).
    await new Promise(resolve => {
      gsap.to(this.cursor.el, {
        scale: 1.0, duration: 0.20, ease: 'back.out(2)', onComplete: resolve,
      });
    });

    // Tiny post-drop settle so the next beat doesn't piggyback.
    await this.iframe.wait(0.16);
  }

  // Build a sidebar-pill ghost that visually matches the real WPForms drag.
  // Implementation cribbed from runtime/drag.js#dragField — clone source,
  // walk both trees, inline computed styles, cap width 260px, tilt + shadow.
  _buildSidebarPillGhost(source, startPt) {
    const srcR = source.getBoundingClientRect();
    const z = this.iframe.scale;
    const ghostScale = 0.9;
    const maxW = 260;
    const naturalW = srcR.width * z * ghostScale;
    const gw = Math.min(naturalW, maxW);
    const gh = gw * (srcR.height / srcR.width);

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

    const ghost = document.createElement('div');
    ghost.className = 'ifm-field-ghost';
    ghost.appendChild(clone);

    inlineTreeStyles(source, clone);

    Object.assign(ghost.style, {
      position: 'absolute',
      width: gw + 'px', height: gh + 'px',
      left: (startPt.x - gw / 2) + 'px',
      top: (startPt.y - gh / 2) + 'px',
      transform: 'rotate(2.5deg) scale(1)',
      transformOrigin: 'center',
      boxShadow: '0 18px 40px rgba(0,0,0,0.30), 0 6px 14px rgba(0,0,0,0.15)',
      borderRadius: '6px',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '95',
      opacity: '0',
      transition: 'opacity 220ms ease, transform 220ms ease',
      willChange: 'transform, left, top, opacity',
    });
    // Make the inner clone fill the ghost box cleanly.
    const inner = ghost.firstElementChild;
    if (inner) {
      inner.style.margin = '0';
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.boxSizing = 'border-box';
    }
    this.stage.appendChild(ghost);

    // Cache half-dimensions for the carry phase (avoid re-measuring under transition).
    ghost._halfW = gw / 2;
    ghost._halfH = gh / 2;

    // Press: lift + fade in.
    requestAnimationFrame(() => {
      ghost.style.opacity = '0.95';
      ghost.style.transform = 'rotate(2.5deg) scale(1.06)';
    });
    return ghost;
  }

  // Prepare a hidden landing field by cloning an existing same-type field
  // from the captured fixture. Returns the hidden element so the drag can
  // reveal it with FLIP at the right moment.
  //
  // Insertion point: AFTER the last VISIBLE existing field in the wrap.
  // On a profile-filtered canvas (e.g. Contact Us shows 3 fields), the
  // new field becomes the 4th — matching Umair's "land at position 4"
  // ask. With no profile, it's appended after the last visible field
  // (which is typically the natural append point anyway).
  _prepareLandingField(fieldSlug, fieldWrap) {
    const doc = this.iframe.doc();
    const donor = this.iframe.query(
      `.wpforms-field-wrap > .wpforms-field[data-field-type="${cssEscape(fieldSlug)}"]`
    );
    let node;
    if (donor) {
      node = donor.cloneNode(true);
      const newId = 9000 + (this.iframe.queryAll('.wpforms-field').length || 0);
      node.id = `wpforms-field-${newId}`;
      node.setAttribute('data-field-id', String(newId));
      node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      node.style.display = 'none';
    } else {
      const tpl = doc.createElement('template');
      const newId = 9000 + (this.iframe.queryAll('.wpforms-field').length || 0);
      tpl.innerHTML = `
        <div class="wpforms-field wpforms-field-${escapeHtml(fieldSlug)} size-medium ui-sortable-handle"
             id="wpforms-field-${newId}" data-field-id="${newId}" data-field-type="${escapeHtml(fieldSlug)}"
             style="display:none">
          <label class="label-title"><span class="text">${escapeHtml(humanizeSlug(fieldSlug))}</span></label>
          <input type="text" class="primary-input" readonly>
        </div>`.trim();
      node = tpl.content.firstElementChild;
    }
    const visibleFields = [...fieldWrap.children].filter(el =>
      el.classList && el.classList.contains('wpforms-field') && el.style.display !== 'none'
    );
    const lastVisible = visibleFields[visibleFields.length - 1];
    if (lastVisible) lastVisible.after(node);
    else fieldWrap.appendChild(node);
    return node;
  }

  // FLIP reveal: capture sibling positions, reveal the landed field, then
  // animate siblings from their old positions back to their new positions
  // so the canvas grows smoothly instead of jumping. Pops the landed field
  // in with a brief scale-up.
  _flipRevealLanded(el) {
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    const siblings = [...parent.children].filter(n => n !== el);
    const first = new Map(siblings.map(n => [n, n.getBoundingClientRect()]));
    el.style.display = 'block';
    for (const n of siblings) {
      const a = first.get(n);
      const b = n.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      n.style.transition = 'none';
      n.style.transform = `translate(${dx}px, ${dy}px)`;
      void n.offsetWidth;
      n.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
      n.style.transform = 'translate(0, 0)';
      setTimeout(() => { n.style.transition = ''; n.style.transform = ''; }, 500);
    }
    // Pop the inserted field in — fade-in from opacity 0 with a gentle
    // scale-up + rise. Stronger than the previous 0.6→1 fade so the drop
    // reads as "a new field just appeared" instead of just settling siblings.
    el.style.transformOrigin = 'center';
    el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms ease-out';
    el.style.transform = 'translateY(8px) scale(0.94)';
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.transform = 'translateY(0) scale(1)';
    el.style.opacity = '1';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }, 480);
  }

  /**
   * Click a field on the form canvas to open its Field Options. The Field
   * Options tab activates (swap from "Add Fields") and the field's option
   * panel becomes visible. DOM-only — no snapshot swap, because the field
   * options live in the same `builder-fields` snapshot under
   * `#wpforms-field-options`.
   *
   * @prerequisite Current snapshot: 'builder-fields'
   * @operation dom-only (toggle tab active + show field-option panel)
   * @endsAt 'builder-fields' (with field-options tab active)
   * @primitives Cursor.glide, Cursor.click, clickRipple
   * @realDom Targets `.wpforms-field[data-field-id="<id>"]` in the canvas
   *   (snapshots/builder-fields/index.html:4720 for id=48). Tab toggle:
   *   `#add-fields a.active` / `#field-options a` (index.html:731-739).
   *   Option panel reveal: `.wpforms-field-option[data-field-id="<id>"]`.
   * @duration ~1.8s
   *
   * @param {number|string} fieldId — `data-field-id` of a `.wpforms-field`
   *   on the canvas (e.g. 48 for Name, 49 for Email, 50 for Textarea in the
   *   default builder-fields snapshot)
   * @returns {Promise<void>}
   */
  async openFieldOptions(fieldId, opts = {}) {
    this._assertSnapshot('builder-fields', 'openFieldOptions');
    const fieldSel = `.wpforms-field[data-field-id="${cssEscape(String(fieldId))}"]`;
    const field = this._findOrThrow(fieldSel, 'openFieldOptions');
    this.iframe.scrollIntoView(field);
    await this.iframe.wait(0.35);
    await this._glideAndClick(field, { ripple: opts.ripple ?? true });
    // DOM puppetry: activate Field Options tab.
    const doc = this.iframe.doc();
    const addFieldsLink = doc.querySelector('#add-fields a');
    const fieldOptsLink = doc.querySelector('#field-options a');
    if (addFieldsLink) addFieldsLink.classList.remove('active');
    if (fieldOptsLink) fieldOptsLink.classList.add('active');
    const addPanel = doc.querySelector('#wpforms-add-fields-tab');
    const optPanel = doc.querySelector('#wpforms-field-options');
    // The base `.wpforms-tab-content` rule is `display:none`; only
    // `.wpforms-tab-content.wpforms-add-fields` defaults to `display:block`.
    // So we must explicitly force the field-options panel to block — clearing
    // the inline style would fall back to the stylesheet default (none).
    if (addPanel) addPanel.style.display = 'none';
    if (optPanel) {
      optPanel.style.display = 'block';
      const panels = optPanel.querySelectorAll('.wpforms-field-option');
      for (const p of panels) {
        p.style.display = p.getAttribute('data-field-id') === String(fieldId) ? 'block' : 'none';
      }
    }
    // Mark the canvas field as active (matches the real product .active class).
    for (const el of this.iframe.queryAll('.wpforms-field.active')) el.classList.remove('active');
    field.classList.add('active');
    await this.iframe.wait(0.18);
  }

  // ── Wave 1: Field-option sub-interactions ───────────────────────────────
  // After `openFieldOptions(fieldId)` exposes a field's option panel, these
  // methods drive specific sub-controls. Each one (a) glides + clicks the
  // sub-control, (b) updates the option DOM (the actual control value), and
  // (c) mirrors the change to the field's canvas representation so the
  // viewer sees the form update in real time. State references come from
  // `docs/wpforms-field-state-inventory.md` (queryable via
  // `node tools/field-state.js --field <name>`).

  /**
   * Rename a field's label. The Label option input under General gets the
   * new text typed in, and the canvas `.label-title .text` element updates
   * to match. Works for any field type that exposes a Label option.
   *
   * @prerequisite openFieldOptions(fieldId) has been called for this field
   * @operation dom-only
   * @realDom Input `#wpforms-field-option-<id>-label` (option panel).
   *   Canvas mirror: `#wpforms-field-<id> .label-title .text`.
   *
   * @param {number|string} fieldId
   * @param {string} newLabel
   * @returns {Promise<void>}
   */
  async setFieldLabel(fieldId, newLabel, opts = {}) {
    this._assertSnapshot('builder-fields', 'setFieldLabel');
    const { charDuration = 0.055 } = opts;
    const input = this._findOrThrow(
      `#wpforms-field-option-${cssEscape(String(fieldId))}-label`,
      'setFieldLabel'
    );
    await this._glideAndClick(input, { ripple: false });
    // Clear existing value (the captured snapshot has "Name", "Email", etc.
    // already typed). Update the canvas label too so the user sees the
    // before/after transition cleanly.
    const canvasLabel = this.iframe.query(
      `#wpforms-field-${cssEscape(String(fieldId))} .label-title .text`
    );
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (canvasLabel) canvasLabel.textContent = '';
    await this.iframe.wait(0.20);
    // Letter-by-letter type into the input. Each char triggers an
    // `input` event AND updates the canvas mirror in lockstep — that's
    // what makes the canvas update read as live. caretType (the motion-
    // primitive) drives innerHTML, not input.value, so we do the same
    // letter loop here with setTimeout for the per-char delay.
    for (let i = 1; i <= newLabel.length; i++) {
      input.value = newLabel.slice(0, i);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (canvasLabel) canvasLabel.textContent = newLabel.slice(0, i);
      await new Promise(r => setTimeout(r, charDuration * 1000));
    }
    await this.iframe.wait(0.18);
  }

  /**
   * Switch a Name field's Format between 'simple', 'first-last', and
   * 'first-middle-last'. The Format dropdown value changes and the
   * canvas wrapper's `format-selected-*` class flips. The captured CSS
   * already controls which sub-blocks (.wpforms-simple, .wpforms-first-name,
   * .wpforms-middle-name, .wpforms-last-name) show per format — flipping
   * the wrapper class makes the canvas re-layout instantly.
   *
   * @prerequisite openFieldOptions(fieldId) has been called for a Name field
   * @operation dom-only
   * @realDom Select `#wpforms-field-option-<id>-format` (option panel).
   *   Canvas wrapper: `#wpforms-field-<id> .format-selected`.
   *
   * @param {number|string} fieldId
   * @param {'simple'|'first-last'|'first-middle-last'} format
   * @returns {Promise<void>}
   */
  async setNameFormat(fieldId, format) {
    this._assertSnapshot('builder-fields', 'setNameFormat');
    const allowed = ['simple', 'first-last', 'first-middle-last'];
    if (!allowed.includes(format)) {
      throw new Error(`setNameFormat: invalid format '${format}'. Valid: ${allowed.join(', ')}`);
    }
    const select = this._findOrThrow(
      `#wpforms-field-option-${cssEscape(String(fieldId))}-format`,
      'setNameFormat'
    );
    // Click the select to "open" the dropdown — then we overlay a fake
    // dropdown panel because the native <select> popover can't be
    // animated or visually driven by a synthetic cursor. The panel uses
    // the real <option> labels so the dropdown content is authentic.
    await this._glideAndClick(select, { ripple: false });
    const labels = { simple: 'Simple', 'first-last': 'First Last', 'first-middle-last': 'First Middle Last' };
    const panel = await this._openFakeDropdown(select, [
      { value: 'simple', label: 'Simple' },
      { value: 'first-last', label: 'First Last' },
      { value: 'first-middle-last', label: 'First Middle Last' },
    ], select.value);
    await this.iframe.wait(0.25);
    const optionEl = panel.querySelector(`[data-value="${cssEscape(format)}"]`);
    await this._glideAndClick(optionEl, { ripple: false, skipScroll: true });
    optionEl.classList.add('is-active');
    await this.iframe.wait(0.18);
    // Apply the real select value + dispatch change so other listeners (if any)
    // can react. Then tear down the fake panel.
    select.value = format;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await this._closeFakeDropdown(panel);
    // Canvas mirror: flip the wrapper class.
    const wrapper = this.iframe.query(
      `#wpforms-field-${cssEscape(String(fieldId))} .format-selected`
    );
    if (wrapper) {
      wrapper.classList.remove('format-selected-simple', 'format-selected-first-last', 'format-selected-first-middle-last');
      wrapper.classList.add(`format-selected-${format}`);
    }
    await this.iframe.wait(0.18);
  }

  /**
   * Build + animate-in a fake dropdown panel below a real <select>. The
   * native dropdown popover can't be visually driven; this overlay mirrors
   * the option list so the cursor can glide to and click each row. The
   * caller is responsible for selecting (clicking) the chosen row and
   * then calling `_closeFakeDropdown(panel)` to tear it down.
   *
   * @param {HTMLSelectElement} selectEl
   * @param {{value:string,label:string}[]} options
   * @param {string} [activeValue] — value to render as already-active
   * @returns {Promise<HTMLElement>} the mounted panel element
   */
  async _openFakeDropdown(selectEl, options, activeValue, opts = {}) {
    const doc = this.iframe.doc();
    const panel = doc.createElement('div');
    panel.className = 'ifm-fake-dropdown';
    Object.assign(panel.style, {
      position: 'fixed',
      background: '#fff',
      border: '1px solid #d4d6dd',
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      zIndex: '2147483647',
      overflow: 'hidden',
      opacity: '0',
      transform: 'translateY(-6px)',
      transition: 'opacity 180ms ease, transform 180ms ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      fontSize: '14px',
    });
    for (const o of options) {
      const row = doc.createElement('div');
      row.dataset.value = o.value;
      Object.assign(row.style, {
        padding: '8px 12px',
        cursor: 'pointer',
        color: '#1a2238',
        background: o.value === activeValue ? '#f4f6fa' : '#fff',
      });
      row.textContent = o.label;
      panel.appendChild(row);
    }
    // Inject a one-shot style for `.is-active` highlight without polluting
    // the iframe's stylesheets.
    panel.querySelectorAll('div').forEach(r => {
      r.addEventListener('mouseover', () => { r.style.background = '#eef1f7'; });
    });
    doc.body.appendChild(panel);
    const r = selectEl.getBoundingClientRect();
    const viewportH = doc.defaultView.innerHeight || this.iframeSize.height;
    const rowH = 34;
    const menuH = Math.min(options.length * rowH, opts.maxHeight ?? 280);
    const shouldOpenUp = opts.direction === 'up' || (opts.direction !== 'down' && r.bottom + menuH + 8 > viewportH);
    Object.assign(panel.style, {
      left: r.left + 'px',
      top: (shouldOpenUp ? Math.max(8, r.top - menuH - 4) : r.bottom + 4) + 'px',
      minWidth: r.width + 'px',
      maxHeight: menuH + 'px',
      overflowY: options.length * rowH > menuH ? 'auto' : 'hidden',
    });
    // Flush + reveal
    void panel.offsetWidth;
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
    await this.iframe.wait(0.20);
    return panel;
  }

  async _closeFakeDropdown(panel) {
    if (!panel) return;
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(-6px)';
    await this.iframe.wait(0.20);
    panel.remove();
  }

  /**
   * Toggle the Email field's "Enable Email Confirmation" option. When ON,
   * the canvas wrapper's class flips from `wpforms-confirm-disabled` to
   * `wpforms-confirm-enabled`, which the captured CSS uses to reveal the
   * confirmation sub-input. The toggle's checkbox is flipped too.
   *
   * @prerequisite openFieldOptions(fieldId) has been called for an Email field
   * @operation dom-only
   * @realDom Toggle `#wpforms-field-option-<id>-confirmation` (option panel).
   *   Canvas wrapper: `#wpforms-field-<id> .wpforms-confirm`.
   *
   * @param {number|string} fieldId
   * @param {boolean} [on=true]
   * @returns {Promise<void>}
   */
  async toggleEmailConfirmation(fieldId, on = true) {
    this._assertSnapshot('builder-fields', 'toggleEmailConfirmation');
    const checkbox = this._findOrThrow(
      `#wpforms-field-option-${cssEscape(String(fieldId))}-confirmation`,
      'toggleEmailConfirmation'
    );
    // Click the visible toggle slider (the icon label), not the hidden checkbox.
    const slider = checkbox.parentElement?.querySelector('.wpforms-toggle-control-icon') || checkbox;
    await this._glideAndClick(slider, { ripple: false });
    checkbox.checked = !!on;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const wrapper = this.iframe.query(
      `#wpforms-field-${cssEscape(String(fieldId))} .wpforms-confirm`
    );
    if (wrapper) {
      wrapper.classList.toggle('wpforms-confirm-enabled', !!on);
      wrapper.classList.toggle('wpforms-confirm-disabled', !on);
    }
    await this.iframe.wait(0.18);
  }

  // ── Wave 2 / Batch A: Notifications + notification-only conditional logic ─

  /**
   * Add a notification block from the Settings → Notifications panel.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only (click add + modal prompt + cloned notification block)
   * @endsAt 'builder-settings-notifications' (new notification block inserted)
   * @primitives Cursor.glide, Cursor.click, IframeManager.elementToStageCoords
   * @realDom Add button `.wpforms-notifications-add.wpforms-builder-settings-block-add`
   *   (snapshots/builder-settings-notifications/index.html:7497).
   *   Block scaffold `.wpforms-notification.wpforms-builder-settings-block`
   *   (snapshots/builder-settings-notifications/index.html:7503).
   * @duration ~4.2s
   *
   * @param {Object} [opts]
   * @param {string} [opts.name='New Notification']
   * @param {string} [opts.templateBlockSel='[data-block-type="notification"][data-block-id="2"]']
   * @returns {Promise<string>} selector for the new block
   */
  async addNotification(opts = {}) {
    this._assertSnapshot('builder-settings-notifications', 'addNotification');
    const {
      name = 'New Notification',
      templateBlockSel = '[data-block-type="notification"][data-block-id="2"]',
    } = opts;
    const addBtn = this._findOrThrow(
      '.wpforms-notifications-add.wpforms-builder-settings-block-add, .wpforms-builder-settings-block-add[data-block-type="notification"]',
      'addNotification'
    );
    await this._glideAndClick(addBtn);
    const blockName = await this._openModalPrompt({
      title: 'Enter a notification name',
      placeholder: 'Eg: User Confirmation',
      typeText: name,
      methodName: 'addNotification',
    });
    const template = this._findOrThrow(templateBlockSel, 'addNotification');
    const copy = template.cloneNode(true);
    const newId = this._nextBlockId('notification');
    copy.dataset.blockId = newId;
    copy.classList.remove('wpforms-builder-settings-block-default');
    this._updateBlockName(copy, blockName);
    const content = copy.querySelector('.wpforms-builder-settings-block-content');
    if (content) content.style.display = '';
    const firstBlock = template.parentNode.querySelector('.wpforms-notification.wpforms-builder-settings-block');
    template.parentNode.insertBefore(copy, firstBlock || template);
    await this._slideBlockIn(copy);
    return `[data-block-type="notification"][data-block-id="${newId}"]`;
  }

  /**
   * Rename an existing notification block through its edit-pencil affordance.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (block name updated)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Edit button `.wpforms-builder-settings-block-edit` and name input
   *   `.wpforms-builder-settings-block-name-edit input`
   *   (snapshots/builder-settings-notifications/index.html:7518-7521).
   * @duration ~2.8s
   *
   * @param {string} blockSel
   * @param {string} newName
   * @returns {Promise<void>}
   */
  async editNotificationName(blockSel, newName) {
    this._assertSnapshot('builder-settings-notifications', 'editNotificationName');
    const block = this._findOrThrow(blockSel, 'editNotificationName');
    const editBtn = block.querySelector('.wpforms-builder-settings-block-edit');
    const editWrap = block.querySelector('.wpforms-builder-settings-block-name-edit');
    const input = editWrap?.querySelector('input');
    if (!editBtn || !input) throw new Error(`editNotificationName: missing edit controls in ${blockSel}`);
    await this._glideAndClick(editBtn, { ripple: false });
    const nameLabel = block.querySelector('.wpforms-builder-settings-block-name');
    if (nameLabel) nameLabel.style.display = 'none';
    if (editWrap) editWrap.style.display = 'block';
    await this._glideAndClick(input, { ripple: false, skipScroll: true, glideDuration: 0.55 });
    await this._typeIntoIframeInput(input, newName, { charDuration: 0.045, clear: true });
    this._updateBlockName(block, newName);
    if (editWrap) editWrap.style.display = '';
    if (nameLabel) nameLabel.style.display = '';
    await this.iframe.wait(0.18);
  }

  /**
   * Set the "Send To Email Address" field for a notification using the
   * smart-tag picker.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (email chip inserted)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Email wrap `#wpforms-panel-field-notifications-<id>-email-wrap`
   *   (snapshots/builder-settings-notifications/index.html:7526,8084).
   * @duration ~3.2s
   *
   * @param {string} blockSel
   * @param {{tag?:string,value?:string,label?:string,type?:string}} value
   * @returns {Promise<void>}
   */
  async setNotificationSendTo(blockSel, value = { tag: 'Email', type: 'field' }) {
    this._assertSnapshot('builder-settings-notifications', 'setNotificationSendTo');
    const block = this._findOrThrow(blockSel, 'setNotificationSendTo');
    const field = block.querySelector('[id$="-email-wrap"]');
    if (!field) throw new Error(`setNotificationSendTo: email wrap not found in ${blockSel}`);
    await this.insertSmartTag(field, value);
  }

  /**
   * Type into a notification's Email Subject Line input.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (subject input updated)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Subject input `#wpforms-panel-field-notifications-<id>-subject`
   *   (snapshots/builder-settings-notifications/index.html:7754,8312).
   * @duration ~2.6s
   *
   * @param {string} blockSel
   * @param {string} text
   * @returns {Promise<void>}
   */
  async setNotificationSubject(blockSel, text) {
    this._assertSnapshot('builder-settings-notifications', 'setNotificationSubject');
    const block = this._findOrThrow(blockSel, 'setNotificationSubject');
    const wrap = block.querySelector('[id$="-subject-wrap"]');
    if (!wrap) throw new Error(`setNotificationSubject: subject wrap not found in ${blockSel}`);
    await this._typeIntoSmartTagWidget(wrap, text, { charDuration: 0.04, clear: true });
  }

  /**
   * Type into a notification's Email Message textarea.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (message textarea updated)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Message textarea `#wpforms-panel-field-notifications-<id>-message`
   *   (snapshots/builder-settings-notifications/index.html:8024,8582).
   * @duration ~3.0s
   *
   * @param {string} blockSel
   * @param {string} text
   * @returns {Promise<void>}
   */
  async setNotificationMessage(blockSel, text) {
    this._assertSnapshot('builder-settings-notifications', 'setNotificationMessage');
    const block = this._findOrThrow(blockSel, 'setNotificationMessage');
    const wrap = block.querySelector('[id$="-message-wrap"]');
    if (!wrap) throw new Error(`setNotificationMessage: message wrap not found in ${blockSel}`);
    await this._typeIntoSmartTagWidget(wrap, text, { charDuration: 0.035, clear: true });
  }

  /**
   * Open a WPForms smart-tag picker for any smart-tag-enabled field.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (picker open)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Smart-tag icon `.wpforms-show-smart-tags` and dropdown
   *   `.insert-smart-tag-dropdown` inside a field wrap
   *   (snapshots/builder-settings-notifications/index.html:7526-7542).
   * @duration ~1.6s
   *
   * @param {string|Element} fieldSel
   * @returns {Promise<HTMLElement>} the opened dropdown element
   */
  async openSmartTagPicker(fieldSel, opts = {}) {
    this._assertSnapshotOneOf(['builder-settings-notifications', 'builder-fields'], 'openSmartTagPicker');
    const wrap = this._resolveSmartTagWrap(fieldSel, 'openSmartTagPicker');
    const icon = wrap.querySelector('.wpforms-show-smart-tags');
    const dropdown = wrap.querySelector('.insert-smart-tag-dropdown');
    if (!icon || !dropdown) throw new Error('openSmartTagPicker: field missing smart-tag icon or dropdown');
    if (opts.direction === 'up') {
      dropdown.classList.remove('open-down');
      dropdown.classList.add('open-up');
      const h = dropdown.getBoundingClientRect().height || 280;
      dropdown.style.top = `-${h + 6}px`;
    }
    await this._glideAndClick(icon, { ripple: false });
    dropdown.classList.remove('closed');
    await this.iframe.wait(0.35);
    return dropdown;
  }

  /**
   * Close the currently open smart-tag picker.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (picker closed)
   * @primitives none
   * @realDom Dropdown `.insert-smart-tag-dropdown`
   *   (snapshots/builder-settings-notifications/index.html:7526-7542).
   * @duration ~0.3s
   *
   * @returns {Promise<void>}
   */
  async closeSmartTagPicker() {
    this._assertSnapshotOneOf(['builder-settings-notifications', 'builder-fields'], 'closeSmartTagPicker');
    for (const dropdown of this.iframe.queryAll('.insert-smart-tag-dropdown:not(.closed)')) {
      dropdown.classList.add('closed');
    }
    await this.iframe.wait(0.25);
  }

  /**
   * Insert a smart tag into any WPForms smart-tag widget field.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only (open picker + choose tag + insert chip)
   * @endsAt 'builder-settings-notifications' (chip inserted)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Smart-tag widget host `.wpforms-smart-tags-widget-input` or
   *   `.wpforms-smart-tags-widget-textarea`; dropdown `.insert-smart-tag-dropdown`
   *   (snapshots/builder-settings-notifications/index.html:7526-7542).
   * @duration ~3.0s
   *
   * @param {string|Element} fieldSel
   * @param {{tag?:string,value?:string,label?:string,type?:string,replaceChips?:boolean}} opts
   * @returns {Promise<void>}
   */
  async insertSmartTag(fieldSel, opts = {}) {
    this._assertSnapshotOneOf(['builder-settings-notifications', 'builder-fields'], 'insertSmartTag');
    const { replaceChips = true } = opts;
    const wrap = this._resolveSmartTagWrap(fieldSel, 'insertSmartTag');
    const dropdown = await this.openSmartTagPicker(wrap, opts);
    const item = this._resolveSmartTagItem(dropdown, opts);
    if (!item) throw new Error(`insertSmartTag: tag not found: ${JSON.stringify(opts)}`);
    await this._glideAndClick(item, { ripple: false, skipScroll: true, glideDuration: 0.65 });
    const host = wrap.querySelector('.wpforms-smart-tags-widget-input, .wpforms-smart-tags-widget-textarea');
    if (!host) throw new Error('insertSmartTag: chip host not found');
    if (replaceChips) host.innerHTML = '';
    const chip = this.iframe.doc().createElement('span');
    chip.className = 'tag';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-value', this._chipDataValue(item));
    chip.innerHTML = `${escapeHtml(item.textContent.trim())} <i class="fa fa-times-circle" title="Delete smart tag"></i>`;
    host.appendChild(chip);
    gsap.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.8)' });
    const original = wrap.querySelector('.wpforms-smart-tags-widget-original');
    if (original) {
      original.value = chip.dataset.value;
      original.dispatchEvent(new original.ownerDocument.defaultView.Event('input', { bubbles: true }));
    }
    await this.iframe.wait(0.42);
    await this.closeSmartTagPicker();
  }

  /**
   * Pick a value from any native WPForms select by rendering a faux dropdown.
   *
   * @prerequisite Current snapshot: any builder settings snapshot
   * @operation dom-only
   * @endsAt current snapshot (select value changed)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Any field wrap containing a native `<select>`, for example
   *   `#wpforms-panel-field-notifications-1-template-wrap`
   *   (snapshots/builder-settings-notifications/catalog.md:1964).
   * @duration ~2.4s
   *
   * @param {string} fieldWrapSel
   * @param {string} value option value or visible label
   * @returns {Promise<void>}
   */
  async selectFromDropdown(fieldWrapSel, value) {
    this._assertSnapshotOneOf([
      'builder-settings-notifications',
      'builder-settings-confirmation',
      'builder-settings-notifications-cl',
    ], 'selectFromDropdown');
    const wrap = this._findOrThrow(fieldWrapSel, 'selectFromDropdown');
    const select = wrap.querySelector('select');
    if (!select) throw new Error(`selectFromDropdown: no select inside ${fieldWrapSel}`);
    await this._selectElementFromDropdown(select, value);
  }

  /**
   * Toggle any WPForms setting control.
   *
   * @prerequisite Current snapshot: any builder settings snapshot
   * @operation dom-only
   * @endsAt current snapshot (checkbox state changed)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Toggle wraps such as
   *   `#wpforms-panel-field-notifications-1-file_upload_attachment_enable-wrap`
   *   (snapshots/builder-settings-notifications/catalog.md:1944).
   * @duration ~1.4s
   *
   * @param {string} fieldWrapSel
   * @param {boolean|'toggle'} [state=true]
   * @returns {Promise<void>}
   */
  async toggleSettingControl(fieldWrapSel, state = true) {
    this._assertSnapshotOneOf([
      'builder-settings-notifications',
      'builder-settings-confirmation',
      'builder-settings-notifications-cl',
    ], 'toggleSettingControl');
    const wrap = this._findOrThrow(fieldWrapSel, 'toggleSettingControl');
    const input = wrap.querySelector('input[type="checkbox"]');
    const icon = wrap.querySelector('.wpforms-toggle-control-icon');
    const root = wrap.querySelector('.wpforms-toggle-control');
    if (!input || !icon) throw new Error(`toggleSettingControl: missing checkbox or slider in ${fieldWrapSel}`);
    await this._glideAndClick(icon, { ripple: false });
    const next = state === 'toggle' ? !input.checked : !!state;
    input.checked = next;
    if (root) root.classList.toggle('wpforms-toggle-control-checked', next);
    input.dispatchEvent(new input.ownerDocument.defaultView.Event('change', { bubbles: true }));
    await this.iframe.wait(0.24);
  }

  /**
   * Duplicate a notification block using the clone icon and slide in the copy.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (duplicated block inserted)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Clone button `.wpforms-builder-settings-block-clone`
   *   (snapshots/builder-settings-notifications/index.html:7509,8067).
   * @duration ~2.5s
   *
   * @param {string} blockSel
   * @param {Object} [opts]
   * @param {string} [opts.name='Duplicated Notification']
   * @returns {Promise<string>} selector for duplicated block
   */
  async duplicateNotificationBlock(blockSel, opts = {}) {
    this._assertSnapshot('builder-settings-notifications', 'duplicateNotificationBlock');
    const { name = 'Duplicated Notification' } = opts;
    const block = this._findOrThrow(blockSel, 'duplicateNotificationBlock');
    const button = block.querySelector('.wpforms-builder-settings-block-clone');
    if (!button) throw new Error(`duplicateNotificationBlock: clone button not found in ${blockSel}`);
    await this._glideAndClick(button, { ripple: false });
    const copy = block.cloneNode(true);
    const newId = this._nextBlockId('notification');
    copy.dataset.blockId = newId;
    copy.classList.remove('wpforms-builder-settings-block-default');
    this._updateBlockName(copy, name);
    block.parentNode.insertBefore(copy, block);
    await this._slideBlockIn(copy);
    return `[data-block-type="notification"][data-block-id="${newId}"]`;
  }

  /**
   * Set a notification block's Active / Inactive status badge.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (status badge updated)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Status badge `.wpforms-builder-settings-block-status`
   *   (snapshots/builder-settings-notifications/index.html:7508,8066).
   * @duration ~1.5s
   *
   * @param {string} blockSel
   * @param {boolean} isActive
   * @returns {Promise<void>}
   */
  async setNotificationActive(blockSel, isActive) {
    this._assertSnapshot('builder-settings-notifications', 'setNotificationActive');
    const block = this._findOrThrow(blockSel, 'setNotificationActive');
    const badge = block.querySelector('.wpforms-builder-settings-block-status');
    if (!badge) throw new Error(`setNotificationActive: status badge not found in ${blockSel}`);
    await this._glideAndClick(badge, { ripple: false });
    badge.classList.toggle('wpforms-badge-green', !!isActive);
    badge.classList.toggle('wpforms-badge-silver', !isActive);
    badge.dataset.active = isActive ? '1' : '0';
    badge.title = isActive ? 'Deactivate' : 'Activate';
    const label = badge.querySelector('.wpforms-status-label');
    if (label) label.textContent = isActive ? 'Active' : 'Inactive';
    const icon = badge.querySelector('i.fa');
    if (icon) {
      icon.classList.toggle('fa-check', !!isActive);
      icon.classList.toggle('fa-ban', !isActive);
    }
    await this.iframe.wait(0.24);
  }

  /**
   * Collapse a notification block to its header row.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (content hidden)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Collapse button `.wpforms-builder-settings-block-toggle`
   *   (snapshots/builder-settings-notifications/index.html:7511,8069).
   * @duration ~1.2s
   *
   * @param {string} blockSel
   * @returns {Promise<void>}
   */
  async collapseNotificationBlock(blockSel) {
    this._assertSnapshot('builder-settings-notifications', 'collapseNotificationBlock');
    const block = this._findOrThrow(blockSel, 'collapseNotificationBlock');
    const button = block.querySelector('.wpforms-builder-settings-block-toggle');
    if (button) await this._glideAndClick(button, { ripple: false });
    const content = block.querySelector('.wpforms-builder-settings-block-content');
    if (content) {
      await new Promise(resolve => {
        gsap.to(content, {
          opacity: 0,
          height: 0,
          duration: 0.28,
          ease: 'sine.inOut',
          onComplete: () => {
            content.style.display = 'none';
            content.style.height = '';
            content.style.opacity = '';
            resolve();
          },
        });
      });
    }
    const icon = block.querySelector('.wpforms-builder-settings-block-toggle i');
    if (icon) {
      icon.classList.remove('fa-chevron-circle-up');
      icon.classList.add('fa-chevron-circle-down');
    }
    this.iframe.scrollIntoView(block, { block: 'center', behavior: 'instant' });
    await this.iframe.wait(0.18);
  }

  /**
   * Expand a collapsed panel-fields group such as Advanced settings.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications' (group opened)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Group `.wpforms-builder-notifications-advanced.unfoldable`
   *   (snapshots/builder-settings-notifications/index.html:8044,8602).
   * @duration ~1.5s
   *
   * @param {string} groupSel
   * @returns {Promise<void>}
   */
  async expandSettingsSection(groupSel) {
    this._assertSnapshot('builder-settings-notifications', 'expandSettingsSection');
    const groups = this.iframe.queryAll(groupSel);
    if (!groups.length) throw new Error(`expandSettingsSection: selector not found in '${this.iframe.currentSlug()}': ${groupSel}`);
    const title = groups[0].querySelector('.wpforms-panel-fields-group-title') || groups[0];
    await this._glideAndClick(title, { ripple: false });
    for (const group of groups) {
      group.classList.remove('unfoldable', 'closed', 'wpforms-hidden');
      group.classList.add('opened');
      const groupTitle = group.querySelector('.wpforms-panel-fields-group-title');
      if (groupTitle) groupTitle.style.marginBottom = '14px';
      const inners = Array.from(group.querySelectorAll('.wpforms-panel-fields-group-inner'));
      for (const inner of inners) {
        inner.style.display = 'block';
        gsap.fromTo(inner, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.36, ease: 'sine.out' });
      }
    }
    await this.iframe.wait(0.42);
  }

  /**
   * Enable Notifications conditional logic and fill a single rule row.
   * This flow is scoped to Settings -> Notifications only; other WPForms
   * conditional logic surfaces have different DOM and should use separate flows.
   *
   * @prerequisite Current snapshot: 'builder-settings-notifications-cl'
   * @operation dom-only
   * @endsAt 'builder-settings-notifications-cl' (notification rule visible and populated)
   * @primitives Cursor.glide, Cursor.click
   * @realDom Toggle `#wpforms-panel-field-notifications-1-conditional_logic-wrap`
   *   and rule box `#wpforms-conditional-groups-settings-notifications-1`
   *   (snapshots/builder-settings-notifications-cl/index.html:2808-2813).
   * @duration ~3.4s for empty/not empty; ~4.2s when a value is required
   *
   * @param {Object} opts
   * @param {string} [opts.toggleWrapSel='#wpforms-panel-field-notifications-1-conditional_logic-wrap']
   * @param {{field:string,operator:string,value:string}} [opts.rule]
   * @returns {Promise<void>}
   */
  async addConditionalLogicRule(opts = {}) {
    this._assertSnapshot('builder-settings-notifications-cl', 'addConditionalLogicRule');
    const {
      toggleWrapSel = '#wpforms-panel-field-notifications-1-conditional_logic-wrap',
      rule = { field: 'Message', operator: 'contains', value: 'Urgent' },
    } = opts;
    const wrap = this._findOrThrow(toggleWrapSel, 'addConditionalLogicRule');
    const icon = wrap.querySelector('.wpforms-toggle-control-icon');
    if (!icon) throw new Error(`addConditionalLogicRule: toggle icon not found in ${toggleWrapSel}`);
    await this._glideAndClick(icon, { ripple: false });
    const root = wrap.querySelector('.wpforms-toggle-control');
    const checkbox = wrap.querySelector('input[type="checkbox"]');
    if (root) root.classList.add('wpforms-toggle-control-checked');
    if (checkbox) checkbox.checked = true;
    const blockId = toggleWrapSel.match(/notifications-(\d+)-conditional_logic/)?.[1] || '1';
    const ruleBox = this._findOrThrow(`#wpforms-conditional-groups-settings-notifications-${cssEscape(blockId)}`, 'addConditionalLogicRule');
    ruleBox.style.display = '';
    this.iframe.scrollIntoView(ruleBox, { block: 'center', behavior: 'instant' });
    await this.iframe.wait(0.18);
    gsap.fromTo(ruleBox, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.42, ease: 'sine.out' });
    await this.iframe.wait(0.48);
    const field = ruleBox.querySelector('.wpforms-conditional-field');
    const operator = ruleBox.querySelector('.wpforms-conditional-operator');
    const valueCell = ruleBox.querySelector('td.value');
    if (field) {
      await this._selectElementFromDropdown(field, rule.field, { maxHeight: 220 });
      gsap.fromTo(field, { opacity: 0.35 }, { opacity: 1, duration: 0.24 });
    }
    await this.iframe.wait(0.32);
    if (operator) {
      for (const opt of operator.options) opt.disabled = false;
      await this._selectElementFromDropdown(operator, rule.operator, { maxHeight: 240 });
      gsap.fromTo(operator, { opacity: 0.35 }, { opacity: 1, duration: 0.24 });
    }
    await this.iframe.wait(0.32);
    const operatorValue = operator?.value || rule.operator;
    if (operatorValue === 'e' || operatorValue === '!e') {
      const currentValue = valueCell?.querySelector('select, input, textarea');
      if (currentValue) {
        currentValue.disabled = true;
        currentValue.setAttribute('aria-disabled', 'true');
        currentValue.style.opacity = '0.55';
        currentValue.style.cursor = 'not-allowed';
      }
      return;
    }
    const doc = this.iframe.doc();
    const oldValue = valueCell?.querySelector('select, input');
    const input = doc.createElement('input');
    input.type = 'text';
    input.className = 'wpforms-conditional-value';
    input.placeholder = 'Enter value';
    input.style.cssText = 'width:100%;box-sizing:border-box;';
    if (oldValue) oldValue.replaceWith(input);
    else if (valueCell) valueCell.appendChild(input);
    await this._glideAndClick(input, { ripple: false, glideDuration: 0.55 });
    await this._typeIntoIframeInput(input, rule.value, { charDuration: 0.045, clear: true });
  }

  /**
   * Click a builder panel button in the bottom-left navigation (Setup /
   * Fields / Settings / Marketing / Payments / Revisions). Crossfades to
   * the corresponding builder snapshot.
   *
   * @prerequisite Current snapshot: any 'builder-*' snapshot
   * @operation snapshot-swap (current → BUILDER_PANEL_TARGETS[section])
   * @endsAt The mapped snapshot for `section`
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap
   * @realDom Targets `.wpforms-panel-<section>-button[data-panel="<section>"]`
   *   (snapshots/builder-fields/index.html:681-708).
   * @duration ~2.4s
   *
   * @param {'setup'|'fields'|'settings'|'providers'|'payments'|'revisions'} section
   *   Note: `providers` is the slug for the "Marketing" panel.
   * @param {Object} [opts]
   * @param {boolean} [opts.swap=true]
   * @returns {Promise<void>}
   */
  async navBuilderSidebar(section, opts = {}) {
    const { swap = true, swapDuration = 0.32 } = opts;
    if (!BUILDER_PANEL_TARGETS[section]) {
      throw new Error(`navBuilderSidebar: unknown section '${section}'. Valid: ${Object.keys(BUILDER_PANEL_TARGETS).join(', ')}`);
    }
    const selector = `.wpforms-panel-${section}-button[data-panel="${section}"]`;
    const btn = this._findOrThrow(selector, 'navBuilderSidebar');
    await this._glideAndClick(btn);
    if (swap) {
      await this.iframe.wait(0.18);
      await this.iframe.swap(BUILDER_PANEL_TARGETS[section], { duration: swapDuration });
    }
  }

  /**
   * Click a Settings sub-tab in the builder's Settings panel sidebar
   * (General / Notifications / Confirmations / Anti-Spam / Themes).
   * Crossfades to the corresponding `builder-settings-<tab>` snapshot.
   *
   * @prerequisite Current snapshot: any 'builder-settings-*' snapshot
   *   (the section list is the same across all of them).
   * @operation snapshot-swap (current → SETTINGS_TAB_TARGETS[tab])
   * @endsAt The mapped snapshot for `tab`
   * @primitives Cursor.glide, Cursor.click, IframeManager.swap
   * @realDom Targets `.wpforms-panel-sidebar-section[data-section="<tab>"]`
   *   (snapshots/builder-settings-general/index.html:65922).
   * @duration ~2.4s
   *
   * @param {'general'|'notifications'|'confirmation'|'anti_spam'|'themes'} tab
   * @returns {Promise<void>}
   */
  async openSettingsTab(tab, opts = {}) {
    if (!SETTINGS_TAB_TARGETS[tab]) {
      throw new Error(`openSettingsTab: unknown tab '${tab}'. Valid: ${Object.keys(SETTINGS_TAB_TARGETS).join(', ')}`);
    }
    const selector = `.wpforms-panel-sidebar-section[data-section="${cssEscape(tab)}"]`;
    const link = this._findOrThrow(selector, 'openSettingsTab');
    this.iframe.scrollIntoView(link);
    await this.iframe.wait(0.30);
    await this._glideAndClick(link);
    await this.iframe.wait(0.18);
    await this.iframe.swap(SETTINGS_TAB_TARGETS[tab], { duration: opts.swapDuration ?? 0.32 });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────────────────

// CSS.escape polyfill — modern browsers have CSS.escape, but fall back to a
// minimal escape for selectors used in this library.
function cssEscape(v) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(v);
  return String(v).replace(/(["\\'`#.\[\]:;,>~+= ])/g, '\\$1');
}

// Visual-only style props worth inlining when cloning iframe-doc elements
// onto the stage (parent document). Lifted verbatim from runtime/drag.js so
// the standalone ghost matches the engine's behavior.
const INLINE_PROPS = [
  'background-color', 'background-image', 'background-repeat', 'background-position', 'background-size',
  'color', 'opacity',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius',
  'box-shadow',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'display', 'align-items', 'justify-content', 'gap',
  'width', 'height', 'min-width', 'min-height',
];

function copyVisualStyles(src, dst) {
  const win = src.ownerDocument && src.ownerDocument.defaultView;
  if (!win) return;
  const cs = win.getComputedStyle(src);
  for (const prop of INLINE_PROPS) {
    const v = cs.getPropertyValue(prop);
    if (v) dst.style.setProperty(prop, v);
  }
}

// Walk source + clone trees in lockstep and copy computed styles onto clone.
// This is the fix for the "gray ghost" bug — iframe CSS doesn't reach a
// clone mounted on the parent document, so we materialize every visual
// style inline before the carry begins.
function inlineTreeStyles(srcRoot, cloneRoot) {
  const srcWalker = srcRoot.ownerDocument.createTreeWalker(srcRoot, NodeFilter.SHOW_ELEMENT);
  const cloneWalker = document.createTreeWalker(cloneRoot, NodeFilter.SHOW_ELEMENT);
  copyVisualStyles(srcRoot, cloneRoot);
  let s = srcWalker.nextNode();
  let c = cloneWalker.nextNode();
  while (s && c) {
    copyVisualStyles(s, c);
    s = srcWalker.nextNode();
    c = cloneWalker.nextNode();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function humanizeSlug(slug) {
  return String(slug)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Re-export the primitives layer so callers only need one import.
export { Cursor, clickRipple };
