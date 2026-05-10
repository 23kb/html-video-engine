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
const DEFAULT_IFRAME = { width: 1444, height: 900 };

/**
 * IframeManager — mounts a snapshot iframe inside a stage element and
 * handles load + crossfade-swap to a different snapshot.
 *
 * Iframe sizing follows the canonical QC pattern from
 * `videos/_qc-primitives/cinematic-flight-inter-snapshot.html`: the iframe
 * renders at its native captured viewport (default 1444×900) and is
 * `transform: scale(...)` down to the stage viewport size (default
 * 1280×720). This keeps WPForms admin layouts looking the same as the
 * existing primitive demos.
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
   * @param {{width:number,height:number}} [opts.iframeSize] — native iframe size before scaling
   * @param {string} [opts.snapshotBase='/snapshots'] — URL prefix for snapshot folders
   * @param {string} [opts.indexFile='index.html'] — file name inside each snapshot folder
   */
  constructor(stage, opts = {}) {
    const {
      viewport = DEFAULT_VIEWPORT,
      iframeSize = DEFAULT_IFRAME,
      snapshotBase = '/snapshots',
      indexFile = 'index.html',
    } = opts;
    this.stage = stage;
    this.viewport = { ...viewport };
    this.iframeSize = { ...iframeSize };
    this.scale = viewport.width / iframeSize.width;
    this.snapshotBase = snapshotBase;
    this.indexFile = indexFile;
    this._slug = null;
    this._iframe = null;
    this._slot = this._mountSlot();
  }

  _mountSlot() {
    const slot = document.createElement('div');
    slot.className = 'ifm-slot';
    Object.assign(slot.style, {
      position: 'absolute',
      left: '0', top: '0',
      width: this.viewport.width + 'px',
      height: this.viewport.height + 'px',
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
      left: '0', top: '0',
      width: this.iframeSize.width + 'px',
      height: this.iframeSize.height + 'px',
      transform: `scale(${this.scale})`,
      transformOrigin: 'top left',
      border: '0',
      display: 'block',
      opacity: '0',
      willChange: 'opacity',
    });
    f.dataset.slug = slug;
    f.loading = 'eager';
    f.src = `${this.snapshotBase}/${slug}/${this.indexFile}`;
    return f;
  }

  static _waitForIframeLoad(iframe) {
    return new Promise(resolve => {
      const done = () => resolve();
      // Most browsers fire load after src is set; if already complete, resolve
      // on a microtask.
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        Promise.resolve().then(done);
        return;
      }
      iframe.addEventListener('load', done, { once: true });
    });
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
    await IframeManager._waitForIframeLoad(f);
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
    const next = this._createIframe(slug);
    this._slot.appendChild(next);
    await IframeManager._waitForIframeLoad(next);
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
    return next;
  }

  /**
   * @returns {string|null} current snapshot slug
   */
  currentSlug() { return this._slug; }

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
   * Convert an iframe-document element (or selector string) to its center
   * point in stage coordinates. Accounts for the iframe's transform scale.
   *
   * Useful for: positioning the cursor over a target element captured in
   * the snapshot iframe.
   *
   * @param {string|Element} target
   * @returns {{x:number, y:number}}
   * @throws if target not found
   */
  elementToStageCoords(target) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) throw new Error(`IframeManager: target not found: ${target}`);
    const r = el.getBoundingClientRect();
    // The iframe element itself is scaled by this.scale, so iframe-document
    // coords map to stage coords by (rect * scale + iframeOffsetInStage).
    // The slot is anchored at (0, 0) and the iframe is anchored at (0, 0)
    // inside the slot, so the offset is (0, 0). If a caller mounts the
    // slot elsewhere, this still works because we read the slot's offset.
    const slotLeft = this._slot.offsetLeft || 0;
    const slotTop = this._slot.offsetTop || 0;
    return {
      x: slotLeft + (r.left + r.width / 2) * this.scale,
      y: slotTop + (r.top + r.height / 2) * this.scale,
    };
  }

  /**
   * Scroll an iframe-document element into view (smooth, no Date.now).
   * @param {string|Element} target
   * @param {ScrollIntoViewOptions} [opts]
   */
  scrollIntoView(target, opts = { block: 'center', behavior: 'smooth' }) {
    const el = typeof target === 'string' ? this.query(target) : target;
    if (!el) return;
    el.scrollIntoView(opts);
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

  _findOrThrow(selector, methodName) {
    const el = this.iframe.query(selector);
    if (!el) {
      throw new Error(`${methodName}: selector not found in '${this.iframe.currentSlug()}': ${selector}`);
    }
    return el;
  }

  async _glideAndClick(selector, opts = {}) {
    const el = typeof selector === 'string' ? this._findOrThrow(selector, 'glideAndClick') : selector;
    this.iframe.scrollIntoView(el);
    await this.iframe.wait(0.25); // let smooth-scroll settle (deterministic via gsap)
    const pt = this.iframe.elementToStageCoords(el);
    await this.cursor.glide(pt, { duration: opts.glideDuration ?? 0.95 });
    await this.cursor.click({ ripple: opts.ripple ?? true });
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
    const selector = `.wpforms-template-select[data-slug="${cssEscape(slug)}"]`;
    const btn = this._findOrThrow(selector, 'selectTemplate');
    this.iframe.scrollIntoView(btn);
    await this.iframe.wait(0.55);
    await this._glideAndClick(btn);
    await this.iframe.wait(0.18);
    await this.iframe.swap('builder-setup', { duration: opts.swapDuration ?? 0.32 });
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
      const txt = (a.textContent || '').replace(/NEW!?/i, '').trim();
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
    const selector = `td.column-name a[href*="form_id=${formId}"]`;
    const link = this._findOrThrow(selector, 'openFormInList');
    this.iframe.scrollIntoView(link);
    await this.iframe.wait(0.35);
    await this._glideAndClick(link);
    await this.iframe.wait(0.18);
    await this.iframe.swap('builder-fields', { duration: opts.swapDuration ?? 0.32 });
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
    const sourceSel = `.wpforms-add-fields-button[data-field-type="${cssEscape(fieldSlug)}"]`;
    const source = this._findOrThrow(sourceSel, 'dragFieldToForm');
    const dropZone = this._findOrThrow('.wpforms-field-wrap', 'dragFieldToForm');

    // Make sure source is visible (its panel group might be folded).
    this.iframe.scrollIntoView(source);
    await this.iframe.wait(0.35);

    // Stage-coord positions for cursor + ghost.
    const fromPt = this.iframe.elementToStageCoords(source);
    // Drop target = bottom-middle of the field-wrap (mimics dropping at end).
    const dropRect = dropZone.getBoundingClientRect();
    const dropElCenter = {
      x: dropRect.left + dropRect.width / 2,
      // bottom inset 32px so the ghost lands inside the wrap, not at the edge.
      y: dropRect.bottom - 32,
    };
    const toPt = {
      x: (this.iframe._slot.offsetLeft || 0) + dropElCenter.x * this.iframe.scale,
      y: (this.iframe._slot.offsetTop || 0) + dropElCenter.y * this.iframe.scale,
    };

    // Glide cursor over the source first (no click — drag picks up on press).
    await this.cursor.glide(fromPt, { duration: 0.85 });

    // Mount the visual ghost on the stage.
    const ghost = this._mountFieldGhost(source);
    Object.assign(ghost.style, {
      left: fromPt.x + 'px',
      top: fromPt.y + 'px',
    });

    // Press feedback on cursor + ghost (synced with Cursor.drag's press phase).
    await this.cursor.drag(fromPt, toPt, { glideDuration: 0.10, dragDuration: 1.20 });
    // We re-run a parallel ghost tween that matches the drag carry. Because
    // Cursor.drag already moved the cursor to `toPt`, the ghost catches up.
    await this._tweenGhostTo(ghost, toPt, 0.0); // already there after drag

    // Drop: fade ghost out, append placeholder field to canvas.
    await new Promise(resolve => {
      gsap.to(ghost, { opacity: 0, scale: 0.92, duration: 0.22, ease: 'power2.in', onComplete: resolve });
    });
    ghost.remove();
    this._appendPlaceholderField(fieldSlug, dropZone);

    // Tiny settle so the new field's reveal lands cleanly.
    await this.iframe.wait(0.18);
  }

  _mountFieldGhost(sourceButtonEl) {
    const rect = sourceButtonEl.getBoundingClientRect();
    const wPx = rect.width * this.iframe.scale;
    const hPx = rect.height * this.iframe.scale;
    const ghost = document.createElement('div');
    ghost.className = 'ifm-field-ghost';
    Object.assign(ghost.style, {
      position: 'absolute',
      width: wPx + 'px',
      height: hPx + 'px',
      marginLeft: -wPx / 2 + 'px',
      marginTop: -hPx / 2 + 'px',
      borderRadius: '4px',
      background: '#0399ED',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      fontSize: 13 * this.iframe.scale + 'px',
      fontWeight: '500',
      pointerEvents: 'none',
      boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
      opacity: '0.92',
      zIndex: '95',
      transform: 'scale(1)',
      willChange: 'transform, left, top, opacity',
    });
    ghost.textContent = sourceButtonEl.textContent.trim();
    this.stage.appendChild(ghost);
    return ghost;
  }

  async _tweenGhostTo(ghost, pt, duration) {
    return new Promise(resolve => {
      gsap.to(ghost, {
        left: pt.x + 'px', top: pt.y + 'px',
        duration: duration,
        ease: 'power2.inOut',
        onComplete: resolve,
      });
    });
  }

  _appendPlaceholderField(fieldSlug, fieldWrap) {
    const d = this.iframe.doc();
    if (!d) return;
    // Compose a minimal placeholder mirroring real WPForms field markup
    // shape: classes `wpforms-field wpforms-field-<slug> size-medium` +
    // data-field-type. Visual fidelity is intentionally light — production
    // chapters should use real DOM cloning via engine helpers instead.
    const newId = 9000 + Math.floor((this.iframe.queryAll('.wpforms-field').length || 0));
    const html = `
      <div class="wpforms-field wpforms-field-${escapeHtml(fieldSlug)} size-medium ui-sortable-handle"
           id="wpforms-field-${newId}" data-field-id="${newId}" data-field-type="${escapeHtml(fieldSlug)}"
           style="opacity:0; transform: translateY(8px);">
        <label class="label-title"><span class="text">${escapeHtml(humanizeSlug(fieldSlug))}</span></label>
        <div class="wpforms-field-helper">
          <span class="wpforms-field-helper-edit">Click to Edit</span>
        </div>
        <input type="text" placeholder="" value="" class="primary-input" readonly>
      </div>
    `.trim();
    const template = d.createElement('template');
    template.innerHTML = html;
    const node = template.content.firstElementChild;
    fieldWrap.appendChild(node);
    // Reveal the new field.
    gsap.to(node, {
      opacity: 1, y: 0,
      duration: 0.45, ease: 'power2.out',
    });
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
    if (addPanel) addPanel.style.display = 'none';
    if (optPanel) {
      optPanel.style.display = '';
      // Hide all field-option panels, show the targeted one.
      const panels = optPanel.querySelectorAll('.wpforms-field-option');
      for (const p of panels) {
        p.style.display = p.getAttribute('data-field-id') === String(fieldId) ? '' : 'none';
      }
    }
    // Mark the canvas field as active (matches the real product .active class).
    for (const el of this.iframe.queryAll('.wpforms-field.active')) el.classList.remove('active');
    field.classList.add('active');
    await this.iframe.wait(0.18);
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
