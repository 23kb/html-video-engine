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
    //    purple-dark for the AI generate card).
    const primary = card.querySelector(
      '.wpforms-template-generate, .wpforms-template-select'
    );
    if (!primary) {
      throw new Error(`selectTemplate: no primary action button inside card for slug '${slug}'`);
    }
    await this._glideAndClick(primary);
    await this.iframe.wait(0.18);
    await this.iframe.swap('builder-setup', { duration: opts.swapDuration ?? 0.32 });
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
    // <strong> puts the cursor squarely on the title text.
    const titleEl = link.querySelector('strong') || link;
    this.iframe.scrollIntoView(titleEl);
    await this.iframe.wait(0.35);
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
  _applyFormProfile(formId) {
    const profile = FORM_PROFILES[formId];
    if (!profile) return;
    const doc = this.iframe.doc();
    if (!doc) return;
    const titleEl = doc.querySelector('.wpforms-form-name');
    if (titleEl) titleEl.textContent = profile.name;
    const allowed = new Set(profile.fields.map(String));
    for (const field of this.iframe.queryAll('.wpforms-field-wrap > .wpforms-field')) {
      const id = field.getAttribute('data-field-id');
      if (!allowed.has(id)) field.style.display = 'none';
    }
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

    // Resolve start (source) + end (drop-zone bottom) in stage coords.
    const fromPt = this.iframe.elementToStageCoords(source);
    const dropRect = dropZone.getBoundingClientRect();
    const dropEnd = {
      x: dropRect.left + dropRect.width / 2,
      y: dropRect.bottom - 28,
    };
    const toPt = {
      x: (this.iframe._slot.offsetLeft || 0) + dropEnd.x * this.iframe.scale,
      y: (this.iframe._slot.offsetTop || 0) + dropEnd.y * this.iframe.scale,
    };

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
  _prepareLandingField(fieldSlug, fieldWrap) {
    const doc = this.iframe.doc();
    const donor = this.iframe.query(
      `.wpforms-field-wrap > .wpforms-field[data-field-type="${cssEscape(fieldSlug)}"]`
    );
    let node;
    if (donor) {
      node = donor.cloneNode(true);
      // Strip IDs to keep the DOM valid; assign a fresh data-field-id.
      const newId = 9000 + (this.iframe.queryAll('.wpforms-field').length || 0);
      node.id = `wpforms-field-${newId}`;
      node.setAttribute('data-field-id', String(newId));
      node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      // Show the field unconditionally (the donor might be display:none from
      // a prior _applyFormProfile call).
      node.style.display = 'none';
    } else {
      // Donor not in fixture — fall back to a minimal placeholder so the
      // interaction still completes for fringe field types.
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
    fieldWrap.appendChild(node);
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
    // Pop the inserted field in.
    el.style.transformOrigin = 'center';
    el.style.transition = 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease';
    el.style.transform = 'scale(0.96)';
    el.style.opacity = '0.6';
    void el.offsetWidth;
    el.style.transform = 'scale(1)';
    el.style.opacity = '1';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }, 420);
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
