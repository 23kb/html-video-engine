// videos/_shared/iframe-manager.js
//
// IframeManager — owns the snapshot iframe slot inside the stage: load, swap,
// the camera transform + settle mode, elementToStageCoords. Product-neutral.
// Moved verbatim out of videos/_shared/wpforms-interactions.js on 2026-09-23
// (product-neutral rename, Phase 1); that path still re-exports it.
//
// Default snapshotBase: /products/<key>/snapshots when the film declares
// <meta name="film:product" content="<key>">, else /products/wpforms/snapshots.
// An explicit opts.snapshotBase always wins.
//
// Source references:
// - videos/_shared/motion-primitives.js — Cursor + cinematicFlight + clickRipple
// - runtime/transitions.js — engine swap-style choreography we mirror at a
//   smaller surface (no flash-guard cover needed; we own both iframes)
//
// Determinism: no Date.now, no unseeded Math.random, no fetch, no repeat:-1.

/* eslint-env browser */
/* global gsap */

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

// Snapshot pack for this film: <meta name="film:product" content="<key>"> picks
// /products/<key>/snapshots; no meta keeps the WPForms pack.
function defaultSnapshotBase() {
  const meta = typeof document !== 'undefined'
    && document.querySelector('meta[name="film:product"]');
  const key = meta && (meta.getAttribute('content') || '').trim();
  return key ? `/products/${key}/snapshots` : '/products/wpforms/snapshots';
}

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
   * @param {string} [opts.snapshotBase] — URL prefix for snapshot folders; default from `<meta name="film:product">`, else '/products/wpforms/snapshots'
   * @param {string} [opts.indexFile='index.html'] — file name inside each snapshot folder
   */
  constructor(stage, opts = {}) {
    const {
      viewport = DEFAULT_VIEWPORT,
      iframeSize = viewport,
      oversample = DEFAULT_OVERSAMPLE,
      snapshotBase = defaultSnapshotBase(),
      indexFile = 'index.html',
      killTransitions = true,
    } = opts;
    this.stage = stage;
    this.killTransitions = killTransitions;
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
    // Default cross-snapshot nav listener. Snapshot interactivity layer
    // emits `{type:'snapshot:navigate', slug}` when the user clicks the
    // top panel buttons or the settings left-rail; any video using
    // IframeManager gets the swap for free.
    this._onSnapshotNavigate = (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'snapshot:navigate' || typeof d.slug !== 'string') return;
      if (this._slug === d.slug) return;
      this.loadSnapshot(d.slug);
    };
    window.addEventListener('message', this._onSnapshotNavigate);
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
    // Path-arg guard (mp 2, fix-round B2): load()/swap() take a SLUG. A
    // path-shaped arg silently composed <base>//<base>/<slug>/
    // index.html/index.html and fell back to an empty stage that "passed
    // visually". Throwing beats auto-repair — auto-repair would mask the
    // caller's mental model being wrong. Both load() and swap() pass here.
    if (/^\//.test(slug) || /\.html?$/i.test(slug)) {
      throw new Error(
        `IframeManager: load/swap take a snapshot SLUG (e.g. 'builder-fields'), got a path: '${slug}'. ` +
        `The URL is composed as ${this.snapshotBase}/<slug>/${this.indexFile}.`
      );
    }
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

  // Tall-document warn (mp C, fix-round B2): a document taller than
  // iframeSize.height silently never renders its lower content — the camera
  // clamps near the top and cameraToElement frames nothing real (settings
  // page 1982px vs iframe 1000px). Warn-only: some videos intentionally
  // window a tall page.
  _warnTallDoc(iframe, slug) {
    try {
      const doc = iframe.contentDocument;
      const sh = doc && doc.documentElement && doc.documentElement.scrollHeight;
      const ih = this.iframeSize && this.iframeSize.height;
      if (sh && ih && sh > ih * 1.15) {
        console.warn(
          `[IframeManager] '${slug}' document is ${sh}px tall vs iframeSize.height ${ih}px — ` +
          `content below ${ih}px never renders and the camera clamps near the top. ` +
          `Measure the page before choosing iframeSize (or scroll inside, then frame).`
        );
      }
    } catch (_) { /* cross-origin or missing doc — nothing to measure */ }
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
   * Kill wall-clock motion inside a mounted station.
   *
   * A captured snapshot ships the product's own CSS transitions — e.g.
   * `border-color .15s ease-in-out` on ranking rows, `opacity .15s` on the
   * handles and arrows, `transition: all` on the results legend. That is a
   * THIRD mover nobody declared: not a snapshot handler, not a GSAP tween.
   * R11 says handlers set state off-camera and GSAP makes motion on camera;
   * a captured transition obeys neither, and INV-9 never looked for it.
   *
   * What it breaks, measured (rf-weight 1): the film writes the correct value
   * every frame and the COMPUTED value then crawls toward it over 150ms of
   * wall clock, so `t(11.5) → t(24) → t(11.5)` does not reproduce the 11.5s
   * frame — a row border read rgba(220,116,47,.925) inbound and
   * rgba(196,103,42,.804) on the way back, never settling. A `--seek` render
   * frame is exposed to exactly the same drift. The sibling failure is worse:
   * a transition cannot advance AT ALL in a non-compositing tab, so a correct
   * fix measures as broken and a wrong one can measure as working
   * (rf-video 16, rf 16/17/22).
   *
   * Every mixed-surface film in this repo is exposed, not just the one that
   * found it — so this is default-on. Opt out per manager with
   * `new IframeManager({ killTransitions: false })` and say why.
   */
  _installDeterminismStyles(iframe, slug) {
    if (this.killTransitions === false) return;
    const doc = iframe && iframe.contentDocument;
    if (!doc || !doc.head) return;
    if (doc.querySelector('style[data-ifm-determinism]')) return;

    // Report the exposure before removing it — an author who sees "37 elements
    // carried live transitions" learns something a silent fix would hide.
    let live = 0;
    let sample = '';
    try {
      for (const el of doc.querySelectorAll('*')) {
        const cs = doc.defaultView.getComputedStyle(el);
        const dur = (cs.transitionDuration || '').split(',').some(d => parseFloat(d) > 0);
        const anim = cs.animationName && cs.animationName !== 'none';
        if (dur || anim) {
          live++;
          if (!sample && el.className && typeof el.className === 'string') {
            sample = '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
          }
        }
      }
    } catch (_) { /* measurement is a nicety; the kill-sheet is the point */ }

    const style = doc.createElement('style');
    style.setAttribute('data-ifm-determinism', 'true');
    style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    doc.head.appendChild(style);

    if (live) {
      console.warn(`[IframeManager] ${slug}: ${live} element(s) carried live CSS transitions/animations${sample ? ` (e.g. ${sample})` : ''} — suppressed. That is wall-clock motion the timeline does not own (rf-weight 1).`);
    }
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
    this._installDeterminismStyles(f, slug);
    this._warnTallDoc(f, slug);
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
    this._installDeterminismStyles(next, slug);
    this._warnTallDoc(next, slug);
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
   * Public alias for swap(slug). Used by the cross-snapshot postMessage
   * protocol (`{type:'snapshot:navigate', slug}`) emitted by
   * snapshots/_shared/interactivity.js so callers don't need to know the
   * crossfade implementation.
   * @param {string} slug
   * @param {Object} [opts]
   * @returns {Promise<HTMLIFrameElement>}
   */
  async loadSnapshot(slug, opts = {}) { return this.swap(slug, opts); }

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
   * @param {{zoom?:number,tx?:number,ty?:number,scale?:number,x?:number,y?:number,duration?:number,ease?:string,onUpdate?:Function,zoomKeyframes?:Array<{zoom:number,duration:number,ease?:string}>}} pose
   *   `zoomKeyframes` (additive 2026-09-02, AP-4 — omit it and behaviour is
   *   byte-identical to before): builds ONE gsap.timeline in which the tx/ty
   *   tween runs the full `duration` on `ease` from position 0 while the zoom
   *   plays the keyframes back-to-back from position 0 on the SAME state
   *   object — a zoom dip can blend INSIDE one camera move. Two sequential
   *   tweenCamera calls can never overlap (each kills the one in flight), so
   *   this is the only way to overlap pan and zoom. The timeline is assigned
   *   to `_cameraTween`, so kill semantics, `setCamera` interruption and
   *   settle scheduling behave exactly as for a plain tween.
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
    const zoomKeyframes = Array.isArray(pose.zoomKeyframes) && pose.zoomKeyframes.length
      ? pose.zoomKeyframes : null;
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
    if (zoomKeyframes) {
      return new Promise(resolve => {
        const tl = gsap.timeline({
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
        tl.to(state, { tx: to.tx, ty: to.ty, duration, ease }, 0);
        let at = 0;
        for (const kf of zoomKeyframes) {
          tl.to(state, { zoom: kf.zoom, duration: kf.duration, ease: kf.ease || 'none' }, at);
          at += kf.duration;
        }
        this._cameraTween = tl;
      });
    }
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
    const cxUn = r.left + r.width / 2;
    const cyUn = r.top + r.height / 2;
    let cx = cxUn;
    let cy = cyUn;
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
    // clampedBy (ccs-A20, fix-round B3): stage px the clamp MOVED the pose
    // away from true-center — the silent displacement that fails the
    // field-centre probe later (ccs 23 measured the error-by-fill curve:
    // fill 0.66 → 82px low, 0.78 → 36, 0.86 → 5, 0.90 → 0). {x:0,y:0} when
    // the clamp didn't bite. Additive field; probe-short computes the same
    // number externally.
    const clampedBy = { x: (cx - cxUn) * zoom, y: (cy - cyUn) * zoom };
    return { zoom, tx, ty, scale: zoom, x: tx, y: ty, rect: r, clampedBy };
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
   *
   * Three modes (fix-round C3):
   *
   *   anchor:'stage' (default) — ring + label mounted on the STAGE at the
   *     element's projected coords, computed ONCE at creation. Byte-identical
   *     to the pre-C3 behavior. ⚠ Any later camera move leaves it floating
   *     over the wrong UI (as 2: a "seconds" label stranded over the
   *     Protection heading) — use it only when the camera holds still for the
   *     highlight's whole lifetime.
   *   anchor:'doc' — the highlight is styled INSIDE the iframe document
   *     (outline on the element itself + label appended to the element), so
   *     it rides every camera move BY CONSTRUCTION. Ported from a
   *     shipped film's video-local fix. Recommended default whenever the
   *     camera will move during the highlight's lifetime.
   *   track:true (stage mode only) — a gsap.ticker callback re-reads
   *     `elementToStageRect` each tick and re-positions ring + label
   *     (nvc B's "tracking highlight that re-anchors per frame").
   *     gsap.ticker is driven by the render driver in seek mode, so tracking
   *     stays deterministic — do NOT swap this for a free-running rAF.
   *
   * Live-layout pages (nvc B): the just-swapped page reflows under a
   * correctly-placed overlay (~380px miss). Mount highlights only after
   * layout settles (`settleAndMeasure` in iframe-helpers.js is the tool) and
   * compute coordinates AT FIRE TIME, not at storyboard time.
   *
   * @param {string|Element} target
   * @param {Object} [opts]
   * @param {string} [opts.label='']
   * @param {number} [opts.pad=6]
   * @param {string} [opts.color='rgba(226, 119, 48, 0.92)']
   * @param {number} [opts.strokeWidth=2]
   * @param {number} [opts.fadeMs=220]
   * @param {number} [opts.holdMs=0] — 0 means caller controls removal
   * @param {number} [opts.labelFontSize=12] — label type size in stage px.
   *   Padding / max-width / radius / offsets scale with it. 12 keeps the
   *   landscape defaults byte-identical; portrait shorts pass ~30 (A4,
   *   shorts fix round 2026-08-13 — 12px is ~1% of a phone-width frame).
   *   Honored in every mode (doc mode scales the in-doc label identically).
   * @param {'stage'|'doc'} [opts.anchor='stage']
   * @param {boolean} [opts.track=false] — stage mode only
   * @returns {{remove:Function, element:HTMLElement, label:HTMLElement|null}}
   *   element = the stage ring (stage mode) or the in-doc target (doc mode)
   */
  highlightElement(target, opts = {}) {
    const {
      label = '',
      pad = 6,
      color = 'rgba(226, 119, 48, 0.92)',
      strokeWidth = 2,
      fadeMs = 220,
      holdMs = 0,
      labelFontSize = 12,
      anchor = 'stage',
      track = false,
    } = opts;
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager.highlightElement: target not found: ${target}`);

    // ── doc mode: style the target inside the iframe document ─────────────
    // (ported from a shipped film — rides the camera by construction)
    if (anchor === 'doc') {
      const d = el.ownerDocument;
      const k = labelFontSize / 12;
      const prev = {
        outline: el.style.outline, outlineOffset: el.style.outlineOffset,
        transition: el.style.transition, position: el.style.position,
        borderRadius: el.style.borderRadius,
      };
      el.style.transition = `outline-color ${fadeMs}ms ease`;
      el.style.outline = `${strokeWidth}px solid rgba(226,119,48,0)`;
      el.style.outlineOffset = (pad + 1) + 'px';
      if (!el.style.borderRadius) el.style.borderRadius = '4px';
      gsap.delayedCall(0.03, () => { el.style.outlineColor = color; });
      let tag = null;
      if (label) {
        const win = d.defaultView;
        if (win && win.getComputedStyle(el).position === 'static') el.style.position = 'relative';
        tag = d.createElement('div');
        tag.textContent = label;
        const padV = Math.round(7 * k);
        const padH = Math.round(12 * k);
        tag.style.cssText = `position:absolute; left:${Math.round(-9 * k)}px; top:${Math.round(-46 * k)}px;`
          + `padding:${padV}px ${padH}px;`
          + `border-radius:${Math.round(6 * k)}px; background:#E27730; color:#fff; white-space:nowrap;`
          + `font:700 ${Math.round(labelFontSize * 13 / 12)}px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;`
          + 'box-shadow:0 8px 18px rgba(0,0,0,0.18); opacity:0;'
          + `transition:opacity ${fadeMs}ms ease; z-index:99999; pointer-events:none;`;
        el.appendChild(tag);
        gsap.delayedCall(0.03, () => { tag.style.opacity = '1'; });
      }
      let removedDoc = false;
      const removeDoc = () => {
        if (removedDoc) return;
        removedDoc = true;
        el.style.outlineColor = 'rgba(226,119,48,0)';
        if (tag) tag.style.opacity = '0';
        gsap.delayedCall(Math.max(0.25, fadeMs / 1000), () => {
          el.style.outline = prev.outline; el.style.outlineOffset = prev.outlineOffset;
          el.style.transition = prev.transition; el.style.position = prev.position;
          el.style.borderRadius = prev.borderRadius;
          if (tag) tag.remove();
        });
      };
      if (holdMs > 0) gsap.delayedCall(holdMs / 1000, removeDoc);
      return { remove: removeDoc, element: el, label: tag };
    }

    // ── stage mode (default; byte-identical to pre-C3 behavior) ───────────
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

    // A4: every geometry constant scales with labelFontSize/12 so the
    // label reads at phone size in portrait. At the default 12 the k
    // factor is 1 and this block reproduces the legacy numbers exactly.
    const k = labelFontSize / 12;
    const padV = Math.round(7 * k);
    const padH = Math.round(10 * k);
    const maxW = Math.round(232 * k);
    const placeLabel = (labelNode, r) => {
      const viewport = this.viewport();
      const labelH = Math.round(labelFontSize * 1.3) + padV * 2;
      const labelTop = r.y - pad - (labelH + Math.round(4 * k));
      const placeBelow = labelTop < 8;
      const x = Math.max(8, Math.min(r.x - pad, viewport.w - (maxW + 8)));
      const y = placeBelow ? r.y + r.h + pad + Math.round(10 * k) : labelTop;
      Object.assign(labelNode.style, {
        left: x + 'px',
        top: y + 'px',
      });
    };

    let labelEl = null;
    if (label) {
      labelEl = document.createElement('div');
      labelEl.className = 'ifm-highlight-label';
      labelEl.textContent = label;
      if (labelFontSize !== 12) {
        Object.assign(labelEl.style, {
          font: `700 ${labelFontSize}px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`,
          padding: `${padV}px ${padH}px`,
          borderRadius: `${Math.round(6 * k)}px`,
          maxWidth: maxW + 'px',
        });
      }
      this.stage.appendChild(labelEl);
      placeLabel(labelEl, rect);
    }

    const nodes = labelEl ? [ring, labelEl] : [ring];
    gsap.to(nodes, { opacity: 1, duration: fadeMs / 1000, ease: 'power2.out' });

    // track mode (nvc B): re-anchor ring + label per gsap.ticker tick. The
    // ticker is paused/stepped by the render driver, so seek-mode frames stay
    // stable (INV-9) — no free-running rAF here.
    let tickFn = null;
    if (track) {
      tickFn = () => {
        let r2;
        try { r2 = this.elementToStageRect(el); } catch (_) { return; }
        Object.assign(ring.style, {
          left: (r2.x - pad) + 'px',
          top: (r2.y - pad) + 'px',
          width: (r2.w + pad * 2) + 'px',
          height: (r2.h + pad * 2) + 'px',
        });
        if (labelEl) placeLabel(labelEl, r2);
      };
      gsap.ticker.add(tickFn);
    }

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      if (tickFn) { gsap.ticker.remove(tickFn); tickFn = null; }
      gsap.to(nodes, {
        opacity: 0,
        duration: fadeMs / 1000,
        ease: 'power2.in',
        onComplete: () => nodes.forEach(n => n.remove()),
      });
    };
    if (holdMs > 0) gsap.delayedCall(holdMs / 1000, remove);
    // A4: label node exposed so shorts can choreograph it (pulse on the
    // narration naming it, exit with motion) instead of a static tag.
    return { remove, element: ring, label: labelEl };
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

    // Inner-scroller fix (as 3, fix-round C2): this method used to drive ONLY
    // the window scroller, silently no-oping when the target lives inside an
    // inner overflow pane (builder settings panes). Resolve the element's real
    // scroll container by walking UP (never by pane class — inactive builder
    // panels ship hidden 0×0 twins); when a real inner scroller exists, drive
    // ITS scrollTop with the same tween shape. Normal pages (no inner
    // scroller) keep the window path below unchanged.
    let pane = null;
    for (let n = el.parentElement; n && n !== doc.documentElement && n !== doc.body; n = n.parentElement) {
      const cs = win.getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) { pane = n; break; }
    }
    if (pane) {
      const elRect = el.getBoundingClientRect();
      const paneRect = pane.getBoundingClientRect();
      const leading = elRect.top - paneRect.top; // el offset within the pane viewport
      const paneView = pane.clientHeight;
      const clampPane = (v2) => Math.max(0, Math.min(pane.scrollHeight - pane.clientHeight, v2));
      let goal;
      if (block === 'start') goal = pane.scrollTop + leading;
      else if (block === 'end') goal = pane.scrollTop + leading + elRect.height - paneView;
      else if (block === 'nearest') {
        if (leading >= 0 && leading + elRect.height <= paneView) goal = pane.scrollTop;
        else if (leading < 0) goal = pane.scrollTop + leading;
        else goal = pane.scrollTop + leading + elRect.height - paneView;
      } else goal = pane.scrollTop + leading + elRect.height / 2 - paneView / 2;
      goal = clampPane(goal);
      if (this._scrollTween) {
        this._scrollTween.kill();
        if (this._scrollResolve) this._scrollResolve();
        this._scrollTween = null;
        this._scrollResolve = null;
      }
      // scrollTo({behavior:'instant'}) — NOT scrollTop assignment: snapshot CSS
      // ships scroll-behavior:smooth, which turns scrollTop writes into queued
      // smooth animations that swallow subsequent writes. The tween supplies
      // the smoothness; each tick must land instantly.
      if (typeof gsap === 'undefined' || duration <= 0) {
        pane.scrollTo({ top: goal, behavior: 'instant' });
        return Promise.resolve(el);
      }
      const pos = { y: pane.scrollTop };
      return new Promise(resolve => {
        this._scrollResolve = () => resolve(el);
        this._scrollTween = gsap.to(pos, {
          y: goal,
          duration,
          ease,
          onUpdate: () => { pane.scrollTo({ top: pos.y, behavior: 'instant' }); },
          onComplete: () => {
            this._scrollTween = null;
            this._scrollResolve = null;
            resolve(el);
          },
        });
      });
    }

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
