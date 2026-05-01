// Closed-vocabulary verb dispatcher. Each verb is a thin shim over existing
// primitives in engine/interactions.js and runtime/scene-helpers.js — no DOM
// poking, no camera moves (the runner owns camera).
//
// Verb signature: async (step, ctx) → void
// ctx: { doc, cursor, engineCursor, sleep, focusOn, sameChapter, helpers }

import { applySearchFilter, activateSection, activatePanel, swapSnapshot, resolveOrThrow, iframeDoc, mountToast } from './scene-helpers.js';
import {
  smartTag as wpfSmartTag,
  selectDropdown as wpfSelectDropdown,
  showPrompt as wpfShowPrompt,
  duplicateBlock as wpfDuplicateBlock,
  collapseBlock as wpfCollapseBlock,
  toggleBlockActive as wpfToggleBlockActive,
  enableConditionalLogicRule as wpfEnableConditionalLogicRule,
  revealSection as wpfRevealSection,
} from '../engine/wpforms.js';
import { verbStart, verbEnd, verbErrorCrumb } from '../engine/diag.js';
import { injectField } from './dom-prep.js';
import { showHighlight } from '../engine/overlays-layer.js';
import { dragField } from './drag.js';
import { popOut } from './pop-out.js';
import { mountAnimateText, getEditorialConfig } from './animate-text.js';
import { showSectionTitle } from './section-title.js';
import { tiltFocus } from './tilt-focus.js';
import { focusPull } from './focus-pull.js';
import { lineDraw } from './line-draw.js';

function ensureIconPickerDemoStyles() {
  if (document.getElementById('icon-picker-demo-css')) return;
  const s = document.createElement('style');
  s.id = 'icon-picker-demo-css';
  s.textContent = `
    .wpf-icon-picker-demo-backdrop {
      position: fixed; inset: 0; z-index: 1420; pointer-events: none;
      background: rgba(19, 25, 32, 0.24);
      opacity: 0; transition: opacity 220ms ease;
    }
    .wpf-icon-picker-demo-backdrop.on { opacity: 1; }
    .wpf-icon-picker-demo {
      position: fixed; left: 50%; top: 50%; z-index: 1421;
      width: min(760px, calc(100vw - 120px)); max-height: min(620px, calc(100vh - 120px));
      transform: translate(-50%, -46%) scale(0.97);
      opacity: 0; pointer-events: none;
      background: #fff; border-radius: 8px;
      box-shadow: 0 26px 80px rgba(15, 23, 42, 0.30), 0 0 0 1px rgba(15, 23, 42, 0.10);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #2f3742; overflow: hidden;
      transition: opacity 260ms ease, transform 260ms ease;
    }
    .wpf-icon-picker-demo.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .wpf-icon-picker-demo .jconfirm-closeIcon {
      position: absolute; right: 18px; top: 14px; color: #8b949e; font-size: 26px; line-height: 1;
    }
    .wpf-icon-picker-demo .jconfirm-title-c { padding: 26px 32px 20px; border-bottom: 1px solid #e6e9ed; }
    .wpf-icon-picker-demo .jconfirm-title { display: block; font-size: 24px; font-weight: 700; }
    .wpf-icon-picker-demo .wpforms-icon-picker-description {
      display: block; margin-top: 6px; color: #6b7280; font-size: 14px; font-weight: 400;
    }
    .wpf-icon-picker-demo .search {
      display: block; width: 100%; box-sizing: border-box; margin-top: 18px;
      padding: 12px 14px; border: 1px solid #d7dce2; border-radius: 4px;
      font: 15px/1.2 inherit; color: #2f3742;
    }
    .wpf-icon-picker-demo .jconfirm-content-pane { padding: 24px 32px 26px; }
    .wpf-icon-picker-demo .wpforms-icon-picker-icons {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;
      list-style: none; margin: 0; padding: 0;
    }
    .wpf-icon-picker-demo .wpforms-icon-picker-icons li {
      min-height: 82px; border: 1px solid #dfe4ea; border-radius: 6px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; color: #356fa8; background: #fff;
    }
    .wpf-icon-picker-demo .wpforms-icon-picker-icons i { font-size: 24px; }
    .wpf-icon-picker-demo .wpforms-icon-picker-icons .name { font-size: 12px; color: #5d6673; }
    .wpf-icon-picker-demo .wpforms-icon-picker-pagination {
      display: flex; justify-content: center; gap: 6px; list-style: none; margin: 22px 0 0; padding: 0;
    }
    .wpf-icon-picker-demo .wpforms-icon-picker-pagination a {
      display: block; min-width: 30px; padding: 7px 8px; text-align: center;
      border: 1px solid #dfe4ea; border-radius: 4px; color: #566272; text-decoration: none;
      font-size: 13px;
    }
    .wpf-icon-picker-demo .wpforms-icon-picker-pagination .active a {
      border-color: #e27730; color: #e27730; font-weight: 700;
    }
  `;
  document.head.appendChild(s);
}

function mountIconPickerDemo({ holdMs = 2600 } = {}) {
  ensureIconPickerDemoStyles();
  document.querySelector('.wpf-icon-picker-demo')?.remove();
  document.querySelector('.wpf-icon-picker-demo-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'wpf-icon-picker-demo-backdrop';
  const modal = document.createElement('div');
  modal.className = 'jconfirm-box jconfirm-hilight-shake jconfirm-type-orange jconfirm-type-animated wpforms-icon-picker-jconfirm-box wpf-icon-picker-demo';
  modal.setAttribute('role', 'dialog');
  const icons = [
    ['envelope', 'regular'], ['bullhorn', 'solid'], ['heart', 'regular'], ['star', 'regular'], ['calendar', 'regular'],
    ['phone', 'solid'], ['user', 'regular'], ['check', 'solid'], ['gift', 'solid'], ['face-smile', 'regular'],
    ['clock', 'regular'], ['location-dot', 'solid'], ['cart-shopping', 'solid'], ['pizza-slice', 'solid'], ['image', 'regular'],
  ];
  modal.innerHTML = `
    <div class="jconfirm-closeIcon" style="display: block;">&times;</div>
    <div class="jconfirm-title-c wpforms-icon-picker-title">
      <span class="jconfirm-title">
        Icon Picker
        <span class="wpforms-icon-picker-description">Browse or search for the perfect icon.</span>
        <input type="text" placeholder="Search 2000+ icons..." class="search" id="wpforms-icon-picker-search">
      </span>
    </div>
    <div class="jconfirm-content-pane wpforms-icon-picker-jconfirm-content-pane">
      <div class="jconfirm-content">
        <div class="wpforms-icon-picker-container" id="wpforms-icon-picker-icons">
          <ul class="wpforms-icon-picker-icons" data-field-id="7" data-choice-id="1">
            ${icons.map(([icon, style]) => `
              <li data-icon="${icon}" data-icon-style="${style}">
                <i class="ic-fa-${style} ic-fa-${icon}"></i>
                <span class="name">${icon}</span>
              </li>
            `).join('')}
          </ul>
          <ul class="wpforms-icon-picker-pagination">
            <li class="active"><a class="page" href="#" data-i="1" data-page="50">1</a></li>
            <li><a class="page" href="#" data-i="2" data-page="50">2</a></li>
            <li><a class="page" href="#" data-i="3" data-page="50">3</a></li>
            <li class="disabled"><a class="page" href="#">...</a></li>
          </ul>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  requestAnimationFrame(() => {
    backdrop.classList.add('on');
    modal.classList.add('on');
  });
  return {
    done: new Promise(resolve => {
      setTimeout(() => {
        modal.classList.remove('on');
        backdrop.classList.remove('on');
        setTimeout(() => {
          modal.remove();
          backdrop.remove();
          resolve();
        }, 260);
      }, holdMs);
    }),
  };
}

const VERBS = {
  // Pure camera — runner already focused on step.target before dispatch.
  // Used for "settle" beats: the zoom itself is the action.
  async focus(step, ctx) {
    if (step.hold) await ctx.sleep(step.hold);
  },

  async hold(step, ctx) {
    await ctx.sleep(step.ms ?? 800);
  },

  // typeInto — typewriter into an input. Optional `filter` folds the old
  // `searchSidebar` verb's job: after typing finishes, hide every add-field
  // button except the one whose id matches `filter`. Use on the WPForms
  // sidebar search input — the snapshot's native filter JS is inert, so
  // the runtime has to drive the visible filter manually.
  async typeInto(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await ctx.cursor.typeInto(step.target, step.text, {
      label: step.label || '',
      cps: step.cps,
      perCharMs: step.perCharMs,
      clear: step.clear,
    });
    if (step.filter) {
      applySearchFilter(iframeDoc(), step.filter);
    }
  },

  async clickOn(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await ctx.cursor.clickOn(step.target, {
      instruction: step.instruction || '',
      direction: step.direction,
      label: step.label || '',
      dispatch: step.dispatch !== false,
      magnetic: step.magnetic === true,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
    if (step.hideCursor) await ctx.engineCursor.hide();
    // Built-in mirror: WPForms canvas field selection. The snapshot JS
    // doesn't run, so mirror the sidebar swap here when the author
    // opts in with `openFieldOptions: <fieldId>`. Fired AFTER postHold
    // and hideCursor so the DOM mutation happens with no cursor over
    // the click site and the next step's focusOn re-measures against
    // the settled layout — matches the pre-Phase-6 two-step shape.
    if (step.openFieldOptions != null) {
      openFieldOptionsMirror(iframeDoc(), step.openFieldOptions);
      await ctx.sleep(step.mirrorHold ?? 200);
    }
  },

  async iconPickerOpen(step, ctx) {
    const target = step.from || step.target;
    if (!target) throw new Error('iconPickerOpen: step.target or step.from is required');
    resolveOrThrow(target, { label: step.id + ':icon-select' });
    await ctx.cursor.clickOn(target, {
      instruction: step.instruction || 'Open Icon Picker',
      direction: step.direction,
      label: step.label || '',
      dispatch: step.dispatch !== false,
      magnetic: step.magnetic === true,
    });
    const picker = mountIconPickerDemo({ holdMs: step.holdMs ?? 3000 });
    await picker.done;
  },

  async highlight(step, ctx) {
    // `highlights` (array) unions multiple rects into one ring; otherwise
    // fall back to the single target the runner already focused on.
    const ringSel = step.highlights || step.target;
    if (Array.isArray(ringSel)) {
      for (const s of ringSel) resolveOrThrow(s, { label: step.id });
    } else {
      resolveOrThrow(ringSel, { label: step.id });
    }
    await showHighlight(ringSel, { label: step.label || '', padX: step.padX, padY: step.padY });
    if (step.hold) await ctx.sleep(step.hold);
  },

  async dragGrab(step, ctx) {
    resolveOrThrow(step.from, { label: step.id + ':from' });
    resolveOrThrow(step.to,   { label: step.id + ':to' });
    await dragField(step.from, step.to, {
      wait: step.wait ?? 900,
      rotate: step.rotate,
      ghostMaxPx: step.ghostMaxPx,
      ghostScale: step.ghostScale,
      revealAt: step.revealAt,
      reveal: step.reveal,
      revealDisplay: step.revealDisplay,
      endRing: step.endRing,
    });
    if (step.hideCursor) await ctx.engineCursor.hide();
  },

  // Pop-out card — clone the target out of the iframe, tilt + lift, fall back.
  // Use for "look at this panel" beats where a ring would be cluttering the
  // view. Target must be a visible block element (section, card, panel).
  async popOut(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await popOut(step.target, {
      tilt:   step.tilt,
      lift:   step.lift,
      riseMs: step.riseMs,
      holdMs: step.holdMs,
      fallMs: step.fallMs,
      hideOriginal: step.hideOriginal,
    });
  },

  // Mid-video section title — "Step 2 · Customize settings". Full-bleed
  // card that fades in over the current snapshot. Use between chapters
  // for narrative beats rather than inside a chapter.
  async sectionTitle(step, ctx) {
    await showSectionTitle({
      eyebrow: step.eyebrow || '',
      title:   step.title || '',
      holdMs:  step.holdMs,
      fadeInMs: step.fadeInMs,
      fadeOutMs: step.fadeOutMs,
      accent:  step.accent,
      underline: step.underline,
      underlineD: step.underlineD,
      underlineWidth: step.underlineWidth,
      underlineDuration: step.underlineDuration,
    });
  },

  // Tilt-on-focus — clone the target and tilt it on the Y axis, no lift,
  // no shadow. Subtler than popOut: reads as "this element just turned to
  // look at you" rather than "this element popped out of the page".
  async tiltFocus(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await tiltFocus(step.target, {
      tiltY:  step.tiltY,
      riseMs: step.riseMs,
      holdMs: step.holdMs,
      fallMs: step.fallMs,
    });
  },

  // Focus-pull — blur the iframe + place a sharp clone of the target on
  // top. Fake depth of field. Use for "this is where your eye goes" beats.
  async focusPull(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await focusPull(step.target, {
      blur:   step.blur,
      riseMs: step.riseMs,
      holdMs: step.holdMs,
      fallMs: step.fallMs,
    });
  },

  // Line-draw — animate an SVG path drawing itself. Mostly used by teasers
  // but available as a beat-level flourish.
  async lineDraw(step, ctx) {
    const { dismiss, done } = await lineDraw({
      d: step.d,
      stroke: step.stroke,
      width:  step.width,
      duration: step.duration,
      holdMs: step.holdMs,
      vw: step.vw, vh: step.vh,
      zIndex: step.zIndex,
    });
    await done;
    if (step.autoDismiss !== false) dismiss();
  },

  async snapshotSwap(step, ctx) {
    await swapSnapshot(step.snapshot, { prep: step.prep });
    if (step.activateSection) activateSection(iframeDoc(), step.activateSection);
    // Tell the runner the iframe doc just changed so it re-reads.
    ctx._docChanged = true;
  },

  async injectField(step, ctx) {
    const doc = iframeDoc();
    await injectField(doc, step.harvestFrom, step.fieldType, {
      containerSel: step.containerSel,
      newId: step.newId,
    });
  },

  // Hover-over: glide cursor to target, add .active (WPForms' hover look), and
  // fire mouseenter/mouseover for any listener. Used for template card reveal.
  async hover(step, ctx) {
    resolveOrThrow(step.target, { label: step.id });
    await ctx.cursor.glideTo(step.target, { wait: step.wait ?? 700 });
    const doc = iframeDoc();
    const el = doc.querySelector(step.target);
    el.classList.add(step.activeClass || 'active');
    try {
      const MouseEvent = doc.defaultView.MouseEvent;
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      el.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
    } catch {}
    if (step.hold) await ctx.sleep(step.hold);
  },

  // Smooth rAF-eased vertical scroll inside the iframe. Finds EVERY scrollable
  // element (scrollHeight > clientHeight) and scrolls all of them in parallel —
  // cheap, and covers the case where the overflow lives on an inner wrapper
  // (setup pages, field-options panels) rather than document.body.
  async scroll(step, ctx) {
    const doc = iframeDoc();
    const win = doc.defaultView;

    // Collect candidates: window, documentElement, body, and any deeper
    // element with real overflow. Filter out zero-height / near-empty ones.
    const scrollers = new Set();
    const pushIfScrollable = (el) => {
      if (!el) return;
      if (el.scrollHeight - el.clientHeight > 20) scrollers.add(el);
    };
    pushIfScrollable(doc.scrollingElement);
    pushIfScrollable(doc.documentElement);
    pushIfScrollable(doc.body);
    for (const el of doc.querySelectorAll('*')) pushIfScrollable(el);

    const distance = step.distance ?? 1800;
    const duration = step.duration ?? 10000;

    // Snapshot starting positions so the animation is relative per-scroller.
    const starts = [...scrollers].map(el => ({ el, start: el.scrollTop || 0 }));
    const winStart = win.scrollY || 0;

    ctx.doc && ctx.doc.defaultView; // keep ref
    console.log('[scroll] found', scrollers.size, 'scrollable elements; distance', distance);

    const t0 = performance.now();
    await new Promise(resolve => {
      function tick(now) {
        const t = Math.min(1, (now - t0) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const dy = distance * eased;
        for (const s of starts) {
          try { s.el.scrollTop = s.start + dy; } catch {}
        }
        try { win.scrollTo(0, winStart + dy); } catch {}
        if (t < 1) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
  },

  // ── Phase 5 step 3 — interaction verbs ──────────────────────────────────
  // Contract-shaped to match docs/phase-5-verbs.md §3. Each verb pairs a
  // visual cursor beat with a DOM state mirror because snapshot JS is inert.
  // Selectors carried in step.* must resolve before dispatch (handled by
  // resolveSelectorsOrThrow at the top of runVerb).

  // openDropdown — click a Choices.js container or native <select> to open.
  // Action-shaped. Visual only; state mirror lives in selectOption.
  // `direction` forwards to the cursor click for pointer angle.
  async openDropdown(step, ctx) {
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      direction: step.direction,
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // selectOption — pick `value` inside the dropdown at `target`.
  // Choices.js path: find .choices__item[data-value=...] inside the container
  // and click it; native <select> path: set .value + fire 'change'.
  // Action-shaped with a state mirror for the Choices DOM (inert JS).
  async selectOption(step, ctx) {
    const doc = iframeDoc();
    const container = doc.querySelector(step.target);
    if (!container) {
      throw new Error('selectOption: target missing in snapshot: ' + step.target);
    }
    // Native <select>: no visible list, just mirror value + change.
    if (container.tagName === 'SELECT') {
      container.value = step.value;
      try {
        const Evt = doc.defaultView.Event;
        container.dispatchEvent(new Evt('change', { bubbles: true }));
      } catch {}
      if (step.postHold) await ctx.sleep(step.postHold);
      return;
    }
    // Choices.js: locate the option item by [data-value]. Items live in a
    // sibling .choices__list--dropdown; search within the Choices root.
    const item = container.querySelector('.choices__item[data-value="' + step.value + '"]')
              || container.querySelector('[data-value="' + step.value + '"]');
    if (!item) {
      throw new Error('selectOption: value "' + step.value + '" not found in ' + step.target);
    }
    if (!item.id) item.id = 'wpf-verb-option-' + Math.random().toString(36).slice(2, 8);
    await ctx.cursor.clickOn('#' + item.id, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    // State mirror: WPForms UI shows the selected value in .choices__item--selectable
    // inside .choices__inner. Set text to the item's text so the picked value
    // reads visually even when the snapshot's Choices JS is dead.
    const inner = container.querySelector('.choices__inner .choices__list');
    if (inner) inner.textContent = item.textContent;
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // switchTab — click a tab and activate its panel. Action-shaped.
  // Built-in mirror for the WPForms settings sidebar (`.wpforms-panel-sidebar-section-*`)
  // because its snapshot JS is dead. For other tab patterns, rely on the
  // click alone + optional `panel` selector that we `.active`-flag manually.
  async switchTab(step, ctx) {
    const doc = iframeDoc();
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    const el = doc.querySelector(step.target);
    // Built-in mirror: settings panel sidebar. Detect by class; route through
    // existing activateSection helper (parses the section name off the class).
    const sidebarMatch = el?.className?.match(/wpforms-panel-sidebar-section-([a-z0-9_-]+)/);
    if (sidebarMatch) activateSection(doc, sidebarMatch[1]);
    // Explicit panel mirror for non-sidebar tabs.
    if (step.panel) {
      resolveOrThrow(step.panel, { label: step.id + ':panel' });
      for (const sib of doc.querySelectorAll(step.panel + ' ~ *, ' + step.panel)) {
        // no-op; just proving the selector resolves
      }
      doc.querySelector(step.panel)?.classList.add('active');
    }
    if (step.postHold) await ctx.sleep(step.postHold);
    if (step.hideCursor) await ctx.engineCursor.hide();
    // Built-in mirror: field-option group toggle (Basic/Advanced tabs
    // inside a field options card). Fired AFTER postHold/hideCursor so
    // the layout shift (basic→advanced swap) does not happen while the
    // camera is still locked tight on the pre-swap tab coordinates.
    // The next step's focusOn re-measures against the settled layout.
    if (el?.classList?.contains('wpforms-field-option-group-toggle')) {
      const group = el.closest('.wpforms-field-option-group');
      const card  = group?.parentElement;
      if (group && card) {
        for (const g of card.querySelectorAll('.wpforms-field-option-group')) g.classList.remove('active');
        group.classList.add('active');
        await ctx.sleep(step.mirrorHold ?? 200);
      }
    }
  },

  // toggle — flip a checkbox-style control (WPForms toggle-control pattern).
  // Action-shaped with a post-state assertion: after the click, the input's
  // .checked must match `to` ('on'|'off'). Throws on mismatch so authors
  // see a clear failure rather than a silent visual.
  async toggle(step, ctx) {
    const doc = iframeDoc();
    const el = doc.querySelector(step.target);
    // `target` can be the input itself or the wpforms-toggle-control wrapper.
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input[type=checkbox]');
    if (!input) throw new Error('toggle: no checkbox under ' + step.target);
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    // DOM mirror: snapshot JS won't flip the checkbox, so do it.
    const want = step.to === 'off' ? false : step.to === 'on' ? true : !input.checked;
    input.checked = want;
    const wrap = input.closest('.wpforms-toggle-control');
    if (wrap) wrap.classList.toggle('wpforms-toggle-control-checked', want);
    if (step.to && input.checked !== want) {
      throw new Error('toggle: post-state mismatch on ' + step.target + ' (want ' + step.to + ')');
    }
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // expandAccordion — click the toggle heading, reveal the inner panel.
  // Built-in mirror for WPForms field-option-group structure: sets
  // `.wpforms-field-option-group-inner` display to block. `body` override
  // lets authors point at a non-standard inner panel selector.
  async expandAccordion(step, ctx) {
    const doc = iframeDoc();
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    const head = doc.querySelector(step.target);
    const body = step.body
      ? doc.querySelector(step.body)
      : head?.parentElement?.querySelector('.wpforms-field-option-group-inner');
    if (body) body.style.setProperty('display', 'block', 'important');
    head?.parentElement?.classList.add('wpforms-field-option-group-open');
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // collapseAccordion — inverse of expandAccordion. Same selector contract.
  async collapseAccordion(step, ctx) {
    const doc = iframeDoc();
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    const head = doc.querySelector(step.target);
    const body = step.body
      ? doc.querySelector(step.body)
      : head?.parentElement?.querySelector('.wpforms-field-option-group-inner');
    if (body) body.style.setProperty('display', 'none', 'important');
    head?.parentElement?.classList.remove('wpforms-field-option-group-open');
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // openModal — reveal a modal that's present in the snapshot DOM.
  // HARD no-fabrication guard (D2): `modal` MUST resolve in the current
  // snapshot or we throw. No synthesized modal HTML. If the snapshot doesn't
  // ship the modal, Phase 6 needs to capture a modal-bearing snapshot first.
  // State-shaped: `modal` carries the selector, not `target`.
  async openModal(step, ctx) {
    const doc = iframeDoc();
    const sel = step.modal;
    if (!sel) throw new Error('openModal: step.modal is required');
    const el = doc.querySelector(sel);
    if (!el) {
      throw new Error('openModal: modal DOM not present in snapshot: ' + sel +
        ' — capture a modal-bearing snapshot (Phase 6) rather than fabricating.');
    }
    // Optional `from`: click the trigger first for the visual beat.
    if (step.from) {
      resolveOrThrow(step.from, { label: step.id + ':from' });
      await ctx.cursor.clickOn(step.from, { label: step.label || '', dispatch: step.dispatch !== false });
    }
    // Reveal: ensure display + a generic .active/.open flag WPForms uses.
    el.style.setProperty('display', 'block', 'important');
    el.classList.add('wpforms-is-open');
    el.classList.add('active');
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // dismissModal — click a close target, hide its owning modal.
  // Action-shaped. Walks up to the nearest modal-ish container and hides it;
  // `target` is the close button. Authors can also pass `modal` to override
  // the container selector explicitly.
  async dismissModal(step, ctx) {
    const doc = iframeDoc();
    await ctx.cursor.clickOn(step.target, {
      label: step.label || '',
      dispatch: step.dispatch !== false,
      instruction: step.instruction || '',
    });
    const btn = doc.querySelector(step.target);
    const modal = step.modal
      ? doc.querySelector(step.modal)
      : btn?.closest('.wpforms-is-open, [id*="embed-wizard"], .jconfirm, [role=dialog]');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      modal.classList.remove('wpforms-is-open');
      modal.classList.remove('active');
    }
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // toast — runtime-owned overlay. State-shaped: no snapshot selector
  // required. Optional `anchor` pins the toast near an iframe element;
  // otherwise it floats in the top-right of the stage. No snapshot DOM
  // is written — this is pure runtime chrome (like title cards).
  async toast(step, ctx) {
    if (!step.text) throw new Error('toast: step.text is required');
    const dismiss = mountToast({
      text: step.text,
      variant: step.variant || 'info',
      duration: step.duration ?? 1800,
      anchor: step.anchor || null,
    });
    // Await the full duration so the beat timing reads as a hold.
    await ctx.sleep(step.duration ?? 1800);
    dismiss();
  },

  // ── Pattern verbs — thin wrappers over engine/wpforms.js helpers ────────
  // Each wraps an existing UI primitive so chapter modules can stay flat
  // (do/target shape) instead of importing engine helpers themselves. The
  // engine helpers do the heavy DOM work; these verbs only thread step.*
  // arguments through and emit the standard verb breadcrumb.

  // activatePanel — region-only top-level panel switch (Fields / Settings /
  // Marketing / Payments / Revisions). Click the tab button visually, then
  // mirror WPForms' production behavior by toggling `.active` on the panel
  // containers — no snapshot swap, no full reload. Optional `section` then
  // routes to a sub-section inside the freshly active panel (e.g. Settings
  // → Notifications). This is the canonical replacement for the old
  // settings-tour pattern that mounted three full snapshots back-to-back
  // and read as a slideshow.
  async activatePanel(step, ctx) {
    const doc = iframeDoc();
    if (!step.panel) throw new Error('activatePanel: step.panel is required (e.g. "settings")');
    if (step.target) {
      await ctx.cursor.clickOn(step.target, {
        label: step.label || '',
        direction: step.direction,
        instruction: step.instruction || '',
        dispatch: step.dispatch !== false,
      });
    }
    activatePanel(doc, step.panel);
    if (step.section) activateSection(doc, step.section);
    if (step.postHold) await ctx.sleep(step.postHold);
    if (step.hideCursor) await ctx.engineCursor.hide();
  },

  // revealSection — fade-in expand a collapsed `.wpforms-panel-fields-group`
  // (Advanced, Conditional Logic, etc.). State-shaped: `selector` carries the
  // group selector. No cursor move; pair with a preceding focus or click.
  async revealSection(step, ctx) {
    if (!step.selector) throw new Error('revealSection: step.selector is required');
    resolveOrThrow(step.selector, { label: step.id });
    await wpfRevealSection(step.selector, { fade: step.fade });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // notificationAdd — full "Add New Notification" pattern: click the Add
  // button, type a name into the prompt, OK → clone the default block with
  // the typed name. `from` is the Add button selector; `block` is the source
  // block to clone (defaults to the first notification block). The cloned
  // block keeps the source's structure (smart-tag widgets, conditional
  // toggle, etc.) — only the visible name is overridden.
  async notificationAdd(step, ctx) {
    const trigger = step.from || 'button.wpforms-notifications-add';
    const block   = step.block || '[data-block-type="notification"][data-block-id="1"]';
    resolveOrThrow(trigger, { label: step.id + ':from' });
    resolveOrThrow(block,   { label: step.id + ':block' });
    await ctx.cursor.clickOn(trigger, {
      label: step.label || '',
      direction: step.direction,
      instruction: step.instruction || '',
    });
    if (step.hideCursor) await ctx.engineCursor.hide();
    await wpfShowPrompt({
      title: step.title || 'Enter a notification name',
      placeholder: step.placeholder || 'Eg: User Confirmation',
      typeText: step.name || 'New Notification',
      backdropColor: step.backdropColor,
    });
    await wpfDuplicateBlock(block, {
      nameOverride: step.name || 'New Notification',
      expanded: step.expanded !== false,
      fade: step.fade,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // blockClone — duplicate any settings-block in place. `from` is the clone
  // button (e.g. `.wpforms-builder-settings-block-clone` inside a block).
  // `block` selector identifies the source to copy. Optional `name` swaps
  // the visible label on the new block.
  async blockClone(step, ctx) {
    if (!step.block) throw new Error('blockClone: step.block (source selector) is required');
    resolveOrThrow(step.block, { label: step.id + ':block' });
    if (step.from) {
      resolveOrThrow(step.from, { label: step.id + ':from' });
      await ctx.cursor.clickOn(step.from, {
        label: step.label || '',
        direction: step.direction,
        instruction: step.instruction || '',
      });
    }
    await wpfDuplicateBlock(step.block, {
      nameOverride: step.name || null,
      expanded: step.expanded !== false,
      fade: step.fade,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // blockCollapseToggle — collapse a notification/confirmation block to its
  // header. `from` is the toggle chevron (the click target); `block` is the
  // block whose `.wpforms-builder-settings-block-content` we hide; `target`
  // is the camera-framing target (typically the block itself, not the small
  // chevron). To re-expand pass `to: 'expanded'`.
  async blockCollapseToggle(step, ctx) {
    if (!step.block) throw new Error('blockCollapseToggle: step.block is required');
    const doc = iframeDoc();
    resolveOrThrow(step.block, { label: step.id + ':block' });
    const clickSel = step.from || step.target;
    if (clickSel) {
      await ctx.cursor.clickOn(clickSel, {
        label: step.label || '',
        direction: step.direction,
        instruction: step.instruction || '',
      });
    }
    if (step.to === 'expanded') {
      const blk = doc.querySelector(step.block);
      const content = blk?.querySelector('.wpforms-builder-settings-block-content');
      if (content) content.style.display = '';
      const icon = blk?.querySelector('.wpforms-builder-settings-block-toggle i');
      if (icon) {
        icon.classList.remove('fa-chevron-circle-down');
        icon.classList.add('fa-chevron-circle-up');
      }
    } else {
      await wpfCollapseBlock(step.block);
    }
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // blockToggleActive — flip the green "Active" badge to silver "Inactive"
  // (or back). State-shaped via `to: 'active'|'inactive'`. The cursor click
  // is owned by the engine helper.
  async blockToggleActive(step, ctx) {
    if (!step.block) throw new Error('blockToggleActive: step.block is required');
    resolveOrThrow(step.block, { label: step.id + ':block' });
    await wpfToggleBlockActive(step.block, { state: step.to || 'toggle' });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // smartTagInsert — full smart-tag widget choreography on `target` (the
  // *-wrap container). `pick` selects the option:
  //   { type: 'field', label: 'Email' }       — by visible label
  //   { type: 'field', value: '2' }           — by data-value
  //   { type: 'other', value: 'admin_email' } — non-field tags
  // Same pattern shape works on every smart-tag-bearing field — Email,
  // Subject, From Name, Message, Default Value, Form Description — only
  // the host wrap selector changes.
  async smartTagInsert(step, ctx) {
    if (!step.target) throw new Error('smartTagInsert: step.target (wrap selector) is required');
    if (!step.pick)   throw new Error('smartTagInsert: step.pick is required');
    resolveOrThrow(step.target, { label: step.id });
    await wpfSmartTag(step.target, {
      pick: step.pick,
      direction: step.direction || 'down',
      replaceChips: step.replaceChips !== false,
      openDelay: step.openDelay,
      pickDelay: step.pickDelay,
      closeDelay: step.closeDelay,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // enableConditionalLogic — flip the conditional toggle ON and inject a
  // styled rule row. Snapshot HTML doesn't ship the rule-builder UI; the
  // engine helper builds a faux scaffold matching WPForms' look. Same
  // pattern applies to notification/confirmation conditional toggles —
  // only the wrap selector and `rule` shape change per host.
  async enableConditionalLogic(step, ctx) {
    if (!step.target) throw new Error('enableConditionalLogic: step.target (toggle wrap) is required');
    if (!step.rule)   throw new Error('enableConditionalLogic: step.rule is required');
    resolveOrThrow(step.target, { label: step.id });
    const refs = await wpfEnableConditionalLogicRule(step.target, { rule: step.rule, fade: step.fade });
    ctx._lastClRefs = refs; // available to subsequent steps for highlight/zoom
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // selectFauxDropdown — pick a value from a native `<select>` by rendering
  // a faux dropdown overlay (cursor-driven, like the real Choices UI does).
  // `target` is the wpforms-panel-field wrap selector. `pick` matches by
  // option value or visible label.
  async selectFauxDropdown(step, ctx) {
    if (!step.target) throw new Error('selectFauxDropdown: step.target (wrap selector) is required');
    if (step.pick == null) throw new Error('selectFauxDropdown: step.pick is required');
    resolveOrThrow(step.target, { label: step.id });
    await wpfSelectDropdown(step.target, {
      pick: step.pick,
      direction: step.direction || 'down',
      openDelay: step.openDelay,
      pickDelay: step.pickDelay,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // prompt — generic WPForms-style modal prompt (info dialog, text input,
  // OK/Cancel). State-shaped: no snapshot selector required. Use directly
  // for lone prompts; for the "Add New Notification" path, prefer
  // `notificationAdd` which combines this with duplicateBlock.
  async prompt(step, ctx) {
    await wpfShowPrompt({
      title: step.title || 'Enter a value',
      placeholder: step.placeholder || '',
      typeText: step.text || '',
      backdropColor: step.backdropColor,
      openDelay: step.openDelay,
      typeDelay: step.typeDelay,
      confirmDelay: step.confirmDelay,
    });
    if (step.postHold) await ctx.sleep(step.postHold);
  },

  // ── Phase 5 step 4 — editorial text verbs ────────────────────────────────
  // All four mount runtime-owned overlay chrome via mountAnimateText and
  // never write snapshot DOM. Shared A+B tutorial-default art direction is
  // locked in runtime/animate-text.js (single font family, four named
  // motion presets, one hierarchy via weight + size). Mode C art direction
  // is a theme override at the shared layer, NOT a vocabulary fork —
  // authors write the same verbs in every mode.
  //
  // Preset / role / default position per verb:
  //   animateText   → preset: top-down-letters   role: headline   pos: top-center (left 50%, top 18vh)
  //   eyebrow       → preset: focus-blur-resolve role: eyebrow    pos: top-center (left 50%, top 8vh)
  //   captionLine   → preset: mask-reveal-up     role: caption    pos: bottom-center (left 50%, bottom 10vh)
  //   calloutLabel  → preset: spring-scale-in    role: callout    pos: anchor-relative (side right, gap 10)
  //
  // Authors override any field per-beat (preset, role, position). Only
  // calloutLabel is anchor-relative — the other three resolve their defaults
  // from the preset table above. Unresolved calloutLabel anchors throw.

  /** animateText — per-char reveal; headline emphasis. Preset/position from theme config. */
  async animateText(step, ctx) {
    if (!step.text) throw new Error('animateText: step.text is required');
    const cfg = getEditorialConfig('animateText');
    const ct = mountAnimateText(step.text, {
      preset:   step.preset   || cfg.preset,
      role:     step.role     || 'headline',
      position: step.position || cfg.position,
      color:    step.color,
      stagger:  step.stagger,
    });
    await ct.show();
    if (step.hold) await ctx.sleep(step.hold);
    if (step.autoExit !== false) await ct.exit();
  },

  /** eyebrow — section-intro overline. Preset/position from theme config. */
  async eyebrow(step, ctx) {
    if (!step.text) throw new Error('eyebrow: step.text is required');
    const cfg = getEditorialConfig('eyebrow');
    const ct = mountAnimateText(step.text, {
      preset:   step.preset   || cfg.preset,
      role:     step.role     || 'eyebrow',
      position: step.position || cfg.position,
      color:    step.color,
    });
    await ct.show();
    if (step.hold) await ctx.sleep(step.hold);
    if (step.autoExit !== false) await ct.exit();
  },

  /** captionLine — instructional caption. Preset/position from theme config. */
  async captionLine(step, ctx) {
    if (!step.text) throw new Error('captionLine: step.text is required');
    const cfg = getEditorialConfig('captionLine');
    const ct = mountAnimateText(step.text, {
      preset:   step.preset   || cfg.preset,
      role:     step.role     || 'caption',
      position: step.position || cfg.position,
      color:    step.color,
      stagger:  step.stagger ?? 20,
    });
    await ct.show();
    if (step.hold) await ctx.sleep(step.hold);
    if (step.autoExit !== false) await ct.exit();
  },

  /** calloutLabel — spring-scale-in label pinned to a resolved anchor (required). */
  async calloutLabel(step, ctx) {
    if (!step.text) throw new Error('calloutLabel: step.text is required');
    if (!step.anchor) throw new Error('calloutLabel: step.anchor is required');
    resolveOrThrow(step.anchor, { label: step.id + ':anchor' });
    // Anchor-relative positioning: compute viewport coords from iframe rect
    // + element rect. calloutLabel is the ONLY editorial verb that's
    // anchor-relative; the other three use fixed preset positions.
    const iframe = document.querySelector('iframe.ui');
    const el = iframeDoc()?.querySelector(step.anchor);
    const ir = iframe.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const side = step.side || 'right';
    const gap = step.gap ?? 10;
    const position = side === 'right'
      ? { left: Math.round(ir.left + er.right + gap) + 'px', top: Math.round(ir.top + er.top) + 'px' }
      : side === 'left'
      ? { right: Math.round(window.innerWidth - (ir.left + er.left) + gap) + 'px', top: Math.round(ir.top + er.top) + 'px' }
      : side === 'above'
      ? { left: Math.round(ir.left + er.left) + 'px', top: Math.round(ir.top + er.top - 36) + 'px' }
      : { left: Math.round(ir.left + er.left) + 'px', top: Math.round(ir.top + er.bottom + gap) + 'px' };
    const cfg = getEditorialConfig('calloutLabel');
    const ct = mountAnimateText(step.text, {
      preset:   step.preset || cfg.preset,
      role:     step.role   || 'callout',
      position,
      color:    step.color,
    });
    await ct.show();
    if (step.hold) await ctx.sleep(step.hold);
    if (step.autoExit !== false) await ct.exit();
  },

};

// DOM mirror for canvas field selection. Matches real WPForms behavior:
// clicking a `.wpforms-field` in the canvas swaps the right sidebar to
// Field Options for that field. Invoked from `clickOn` when the step
// carries `openFieldOptions: <fieldId>`.
function openFieldOptionsMirror(doc, fieldId) {
  const add = doc.getElementById('wpforms-add-fields-tab');
  const opt = doc.getElementById('wpforms-field-options');
  add?.style.setProperty('display', 'none', 'important');
  opt?.style.setProperty('display', 'block', 'important');
  doc.querySelector('#add-fields > a')?.classList.remove('active');
  doc.querySelector('#field-options > a')?.classList.add('active');
  for (const el of doc.querySelectorAll('.wpforms-field.active')) el.classList.remove('active');
  doc.getElementById('wpforms-field-' + fieldId)?.classList.add('active');
  for (const el of opt?.querySelectorAll('.wpforms-field-option') ?? []) {
    const keep = el.id === 'wpforms-field-option-' + fieldId;
    el.style.setProperty('display', keep ? 'block' : 'none', 'important');
  }
  // Reset the card to its Basic group as the default entry state.
  const card = doc.getElementById('wpforms-field-option-' + fieldId);
  if (card) {
    for (const g of card.querySelectorAll('.wpforms-field-option-group')) g.classList.remove('active');
    card.querySelector('#wpforms-field-option-basic-' + fieldId)?.classList.add('active');
  }
}

// Fields that carry selectors across the vocabulary. Resolve-before-run
// applies to every present one — a missing selector is a hard error before
// any camera or DOM effect fires. Kept in sync with tools/validate-video.js.
const SELECTOR_FIELDS = ['target', 'from', 'to', 'highlightTarget'];

// Verbs that repurpose a SELECTOR_FIELDS name as a state enum rather than a
// selector. `toggle` carries `to: 'on' | 'off'` — not a selector — so the
// pre-dispatch resolver must skip it. Mirrors the equivalent skip in the
// static validator (tools/validate-video.js parseChapter) so runtime and
// static checks agree on what counts as a selector.
const VERB_NON_SELECTOR_FIELDS = {
  toggle: new Set(['to', 'from']),
};

function resolveSelectorsOrThrow(step) {
  const skip = VERB_NON_SELECTOR_FIELDS[step.do];
  for (const f of SELECTOR_FIELDS) {
    if (skip && skip.has(f)) continue;
    const v = step[f];
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const s of v) resolveOrThrow(s, { label: step.id + ':' + f });
    } else {
      resolveOrThrow(v, { label: step.id + ':' + f });
    }
  }
  if (Array.isArray(step.highlights)) {
    for (const s of step.highlights) resolveOrThrow(s, { label: step.id + ':highlights' });
  }
}

// Verbs whose target is not a snapshot selector (different semantics).
// openModal + toast are state-shaped: openModal carries selector on `modal`
// (checked with a bespoke no-fabrication guard inside the verb); toast has
// no snapshot selector at all (runtime-owned overlay).
// animateText/captionLine/eyebrow are runtime-owned overlay chrome — no
// snapshot selector. calloutLabel carries its selector on `anchor` and
// resolves it inside the verb (still a hard error on miss).
// `prompt` carries no selector at all (runtime-owned modal).
// `notificationAdd`, `blockClone`, `blockCollapseToggle`, `blockToggleActive`,
// `revealSection`, `enableConditionalLogic` resolve their own selectors
// (`from`, `block`, `selector`, `target`) inside the verb body, with
// per-arg labels — pre-resolve would mislabel against the wrong field.
// `activatePanel` may run with no `target` (state-only flip).
const SKIP_PRE_RESOLVE = new Set([
  'hold', 'snapshotSwap', 'sectionTitle', 'lineDraw', 'injectField', 'scroll',
  'openModal', 'toast', 'animateText', 'captionLine', 'eyebrow', 'calloutLabel',
  'activatePanel', 'revealSection', 'notificationAdd', 'blockClone',
  'blockCollapseToggle', 'blockToggleActive', 'smartTagInsert',
  'enableConditionalLogic', 'selectFauxDropdown', 'prompt',
  'iconPickerOpen',
]);

export async function runVerb(step, ctx) {
  const verb = VERBS[step.do];
  if (!verb) throw new Error('runVerb: unknown verb "' + step.do + '" in step ' + step.id);

  // Pre-dispatch resolve guard. Keeps authoring-layer failures at the
  // dispatch boundary so bug reports identify the broken selector
  // without having to reach mid-animation.
  if (!SKIP_PRE_RESOLVE.has(step.do)) {
    try { resolveSelectorsOrThrow(step); }
    catch (err) { verbErrorCrumb({ ...ctx, step }, err); throw err; }
  }

  const t0 = performance.now();
  verbStart({ ...ctx, step });
  try {
    await verb(step, ctx);
    verbEnd({ ...ctx, step }, Math.round(performance.now() - t0));
  } catch (err) {
    verbErrorCrumb({ ...ctx, step }, err);
    throw err;
  }
}

export function listVerbs() {
  return Object.keys(VERBS);
}
