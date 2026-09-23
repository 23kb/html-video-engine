// videos/_shared/builder-frontend-split.js
//
// Split-screen authoring helper. Mounts a builder snapshot + the frontend
// snapshot side-by-side inside a single stage, with a "fade frontend in"
// affordance, automatic builder→frontend mirror bridge, and forwarder
// methods for frontend-isolate / show-all and field-state overrides.
//
// Why this exists: every "tutorial showing real-time mirror" video would
// otherwise rewrite the same plumbing — two IframeManagers, a message
// listener, layout math. This wraps it.
//
// Usage:
//   import { BuilderFrontendSplit } from '../../videos/_shared/builder-frontend-split.js';
//   const split = new BuilderFrontendSplit(stage);
//   await split.mountBuilder('builder-field-options-checkbox');
//   // ... cursor + camera + narration on builder ...
//   await split.fadeInFrontend('frontend-published-form');
//   split.isolateFrontend([7]);                 // show only checkbox (field 7)
//   // ... walk through options; mirror is automatic ...
//   await split.fadeOutFrontend();
//
// Determinism: no Date.now, no unseeded Math.random, no fetch, no repeat:-1.
// Animations use GSAP tweens with fixed durations + finite repeats.

/* eslint-env browser */
/* global gsap */

import { IframeManager } from './wpforms-interactions.js';

const DEFAULT_STAGE = { width: 1920, height: 1080 };
const DEFAULT_PANE = { width: 1280, height: 720 };
const FADE_DURATION = 0.55;
const SLIDE_OFFSET = 36;
const LAYOUT_DURATION = 0.7;

export class BuilderFrontendSplit {
  /**
   * @param {HTMLElement} stage - the outer stage element (1920×1080 by default)
   * @param {Object} [opts]
   * @param {{width:number, height:number}} [opts.stage]
   * @param {{width:number, height:number}} [opts.pane] - iframe logical size per pane
   * @param {string} [opts.snapshotBase='/products/wpforms/snapshots']
   * @param {boolean} [opts.autoBridge=true] - relay wpf:field-state from builder to frontend
   * @param {number} [opts.gap=24] - px gap between panes when split is active
   */
  constructor(stage, opts = {}) {
    const cfg = {
      stage: opts.stage || DEFAULT_STAGE,
      pane: opts.pane || DEFAULT_PANE,
      snapshotBase: opts.snapshotBase || '/products/wpforms/snapshots',
      autoBridge: opts.autoBridge !== false,
      gap: opts.gap != null ? opts.gap : 24,
    };
    this.stage = stage;
    this.cfg = cfg;
    this.state = 'idle'; // idle | builder-only | split | fading

    // Mount two pane hosts inside the stage. Each is its own IframeManager
    // stage so the iframe transform/zoom math stays clean.
    const W = cfg.stage.width;
    const H = cfg.stage.height;
    const paneW = cfg.pane.width;

    this.leftHost = this._mountHost({
      left: (W - paneW) / 2,
      top: (H - cfg.pane.height) / 2,
      width: paneW,
      height: cfg.pane.height,
    });
    this.rightHost = this._mountHost({
      left: (W + paneW) / 2 + cfg.gap,
      top: (H - cfg.pane.height) / 2,
      width: paneW,
      height: cfg.pane.height,
      opacity: 0,
      translateX: SLIDE_OFFSET,
      visibility: 'hidden',
    });

    this.builder = new IframeManager(this.leftHost, {
      viewport: { width: paneW, height: cfg.pane.height },
      snapshotBase: cfg.snapshotBase,
    });
    this.frontend = new IframeManager(this.rightHost, {
      viewport: { width: paneW, height: cfg.pane.height },
      snapshotBase: cfg.snapshotBase,
    });

    if (cfg.autoBridge) this._installBridge();
  }

  _mountHost({ left, top, width, height, opacity = 1, translateX = 0, visibility = 'visible' }) {
    const host = document.createElement('div');
    host.className = 'bfs-pane';
    Object.assign(host.style, {
      position: 'absolute',
      left: left + 'px',
      top: top + 'px',
      width: width + 'px',
      height: height + 'px',
      transform: `translateX(${translateX}px)`,
      opacity: String(opacity),
      visibility,
      transformOrigin: '0 0',
      willChange: 'transform, opacity',
    });
    this.stage.appendChild(host);
    return host;
  }

  _installBridge() {
    this._onMessage = (e) => {
      const d = e?.data;
      if (!d || d.type !== 'wpf:field-state') return;
      const fromBuilder = e.source === this.builder.iframe()?.contentWindow;
      if (!fromBuilder) return;
      const fw = this.frontend.iframe()?.contentWindow;
      if (fw) fw.postMessage(d, '*');
    };
    window.addEventListener('message', this._onMessage);
  }

  destroy() {
    if (this._onMessage) {
      window.removeEventListener('message', this._onMessage);
      this._onMessage = null;
    }
    this.leftHost?.remove();
    this.rightHost?.remove();
  }

  // ─── Mount / swap snapshots ─────────────────────────────────────────────

  async mountBuilder(slug, opts = {}) {
    await this.builder.loadSnapshot(slug, opts);
    if (this.state === 'idle') this.state = 'builder-only';
  }

  async swapBuilder(slug, opts = {}) {
    await this.builder.loadSnapshot(slug, opts);
  }

  async mountFrontend(slug, opts = {}) {
    await this.frontend.loadSnapshot(slug, opts);
  }

  async swapFrontend(slug, opts = {}) {
    await this.frontend.loadSnapshot(slug, opts);
  }

  // ─── Layout — center builder when solo, or split when frontend visible ──

  _centeredBuilderLeft() {
    return (this.cfg.stage.width - this.cfg.pane.width) / 2;
  }

  _splitBuilderLeft() {
    return (this.cfg.stage.width / 2 - this.cfg.pane.width - this.cfg.gap / 2);
  }

  _splitFrontendLeft() {
    return (this.cfg.stage.width / 2 + this.cfg.gap / 2);
  }

  /**
   * Beautiful fade-in: frontend pane slides in from the right + fades,
   * builder pane slides to the left to make room. Both at once with a
   * shared easing.
   *
   * @param {string} slug - frontend snapshot to load (default frontend-published-form)
   * @param {Object} [opts]
   * @param {boolean} [opts.skipLayout=false] - just fade in, don't shift builder
   */
  async fadeInFrontend(slug = 'frontend-published-form', opts = {}) {
    if (!this.frontend.currentSlug()) {
      await this.frontend.loadSnapshot(slug);
    } else if (this.frontend.currentSlug() !== slug) {
      await this.frontend.loadSnapshot(slug);
    }
    this.state = 'fading';

    return new Promise((resolve) => {
      this.rightHost.style.visibility = 'visible';
      const tl = gsap.timeline({
        onComplete: () => { this.state = 'split'; resolve(); },
      });

      if (!opts.skipLayout) {
        tl.to(this.leftHost, {
          left: this._splitBuilderLeft(),
          duration: LAYOUT_DURATION,
          ease: 'power3.inOut',
        }, 0);
        // The frontend host is anchored at the post-shift target so the slide
        // is just a small translateX offset settling to 0.
        gsap.set(this.rightHost, { left: this._splitFrontendLeft() });
      }

      tl.to(this.rightHost, {
        opacity: 1,
        x: 0,
        duration: FADE_DURATION,
        ease: 'power2.out',
      }, opts.skipLayout ? 0 : 0.15);
    });
  }

  /**
   * Reverse of fadeInFrontend: frontend pane fades out + slides back, builder
   * returns to center.
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.skipLayout=false]
   */
  async fadeOutFrontend(opts = {}) {
    if (this.state !== 'split') return;
    this.state = 'fading';

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.rightHost.style.visibility = 'hidden';
          this.state = 'builder-only';
          resolve();
        },
      });

      tl.to(this.rightHost, {
        opacity: 0,
        x: SLIDE_OFFSET,
        duration: FADE_DURATION,
        ease: 'power2.in',
      }, 0);

      if (!opts.skipLayout) {
        tl.to(this.leftHost, {
          left: this._centeredBuilderLeft(),
          duration: LAYOUT_DURATION,
          ease: 'power3.inOut',
        }, FADE_DURATION * 0.5);
      }
    });
  }

  // ─── Forwarded frontend controls ────────────────────────────────────────

  /**
   * Show ONLY the listed field IDs on the frontend, hide the rest. Reversible
   * via showAllFrontend(). Animates by default.
   * @param {Array<string|number>} fieldIds
   * @param {Object} [opts]
   * @param {boolean} [opts.animate=true]
   */
  isolateFrontend(fieldIds, opts) {
    const fw = this.frontend.iframe()?.contentWindow;
    if (!fw) return;
    fw.postMessage({
      type: 'wpf:frontend-isolate',
      fieldIds: (fieldIds || []).map((id) => String(id)),
      opts: opts || {},
    }, '*');
  }

  showAllFrontend(opts) {
    const fw = this.frontend.iframe()?.contentWindow;
    if (!fw) return;
    fw.postMessage({ type: 'wpf:frontend-show-all', opts: opts || {} }, '*');
  }

  /**
   * Manually apply a field-state on the frontend (no builder needed). Useful
   * for "demo this without the builder visible" or "force initial state".
   * @param {string|number} fieldId
   * @param {string} setting
   * @param {*} value
   * @param {Object} [meta]
   */
  setFieldState(fieldId, setting, value, meta) {
    const fw = this.frontend.iframe()?.contentWindow;
    if (!fw) return;
    const msg = { type: 'wpf:field-state', fieldId: String(fieldId), setting, value };
    if (meta) msg.meta = meta;
    fw.postMessage(msg, '*');
  }

  // ─── Convenience getters ────────────────────────────────────────────────

  builderDoc() { return this.builder.doc(); }
  frontendDoc() { return this.frontend.doc(); }
  builderQuery(sel) { return this.builder.query(sel); }
  frontendQuery(sel) { return this.frontend.query(sel); }
}
