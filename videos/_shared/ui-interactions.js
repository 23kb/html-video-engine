// videos/_shared/ui-interactions.js
//
// UIInteractions — the product-neutral base for interaction classes. It holds
// the helpers every product layer needs: snapshot guards, glide + click on an
// iframe node, typing into a real input, the faux dropdown that stands in for
// a native <select> (CLAUDE.md anti-pattern #3), a block slide-in, and the
// drag ghost. A product pack extends it. WPForms:
// products/wpforms/film/wpforms-interactions.js (WPFormsInteractions).
//
// Moved verbatim out of WPFormsInteractions on 2026-09-23 (product-neutral
// rename, Phase 1). One addition: a generic _visibleTarget, which a product
// class overrides with its own widget selectors.
//
// Determinism: no Date.now, no unseeded Math.random, no fetch, no repeat:-1.

/* eslint-env browser */
/* global gsap */

// ─────────────────────────────────────────────────────────────────────────
// UIInteractions — shared helpers for Cursor-over-iframe interactions
// ─────────────────────────────────────────────────────────────────────────

export class UIInteractions {
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

  /**
   * Resolve the snapshot allowlist for a slug-guarded method.
   *
   * The guards exist to stop a method running against markup it was not written
   * for, but they check a NAME, not the markup — so a fresh capture of the same
   * surface under a new slug is rejected even when the markup is identical.
   * `opts.snapshot` lets a film name the slug(s) it captured, exactly as
   * `toggleSettingControl` has always allowed. Defaults are unchanged: a call
   * that passes nothing behaves exactly as it did before.
   *
   * @param {{snapshot?: string|string[]}} [opts]
   * @param {string[]} defaults
   * @returns {string[]}
   */
  _snapshotAllowlist(opts, defaults) {
    const override = opts && opts.snapshot;
    if (!override) return defaults;
    return Array.isArray(override) ? override : [override];
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

  // Resolve a zero-size wrapper to the visible control inside it. A product
  // class overrides this to try its own widget selectors first.
  _visibleTarget(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) return el;
    return el.querySelector?.([
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
    // QC r5 (tutorial-system-fixes #18): in settle mode the root zoom doubles
    // this panel's fixed-position math (the BCR is measured post-zoom, then the
    // panel renders inside the zoomed root → zoom² displacement, ~200-400px at
    // 1.55×). Exit settle to the transform camera before measuring — the panel
    // then rides the iframe transform correctly at any zoom.
    if (this.iframe._settleMode) this.iframe._applyCameraToIframe();
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
}

// ─────────────────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────────────────

// CSS.escape polyfill — modern browsers have CSS.escape, but fall back to a
// minimal escape for selectors used in this library.
export function cssEscape(v) {
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
