/**
 * snapshots/_shared/frontend.js
 *
 * Native interactivity for the WPForms frontend (published-form) snapshot.
 * Capture strips all scripts; this re-adds just enough behavior to make the
 * snapshot behave like a real published form for tutorial/demo videos and
 * for standalone QC.
 *
 * Capabilities (Phase 0):
 *   - Number slider hint sync ("Selected Value: N")
 *   - Signature canvas drawing + Clear button
 *   - Phone iti country dropdown (open/close, pick country, swap flag + dial code)
 *   - Rating: SVG fill up to selected item
 *   - NPS: selected highlight class on chosen label
 *   - Likert: per-row selected highlight class
 *   - Modern file upload: stub click → fake file row appears
 *   - Pagebreak navigation: Next / Previous, progress bar, step indicator
 *   - Submit: validate, fade form, show confirmation message
 *   - Inline validation with real WPForms messages
 *
 * Capability B (Phase 1+): postMessage receiver lives here too — listens for
 * { type: 'wpf:field-state', fieldId, setting, value, meta? } and applies
 * the change to frontend DOM. Builder broadcasts via interactivity.js.
 *
 * Determinism: no Date.now(), no Math.random(), no fetch, no timers (except
 * fade animations driven by CSS transition / requestAnimationFrame — both
 * fine for visual-only mirroring; nothing here affects render parity).
 */
(function () {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function fieldContainerById(id) {
    return $(`[data-field-id="${id}"]`);
  }

  function formIdFromContainer(container) {
    const m = (container?.id || '').match(/^wpforms-(\d+)-field_/);
    return m ? m[1] : null;
  }

  /**
   * Find the form id from any element inside the form.
   */
  function formId() {
    const form = $('form.wpforms-form');
    return form?.dataset.formid || null;
  }

  // ─── 1. Number slider hint sync ─────────────────────────────────────────
  // Plugin: <input type="range"> change/input → "Selected Value: N" in
  // .wpforms-field-number-slider-hint (data-hint contains template).

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'range') return;
    const container = t.closest('.wpforms-field-number-slider');
    if (!container) return;
    const hint = container.querySelector('.wpforms-field-number-slider-hint');
    if (!hint) return;
    const tmpl = hint.dataset.hint || 'Selected Value: {value}';
    const parts = tmpl.split('{value}');
    hint.textContent = '';
    parts.forEach((p, i) => {
      hint.appendChild(document.createTextNode(p));
      if (i < parts.length - 1) {
        const b = document.createElement('b');
        b.textContent = t.value;
        hint.appendChild(b);
      }
    });
  });

  // ─── 2. Signature canvas drawing ────────────────────────────────────────

  function initSignaturePads() {
    $$('.wpforms-signature-canvas').forEach((canvas) => {
      if (canvas.dataset.wpfWired) return;
      canvas.dataset.wpfWired = '1';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const color = canvas.dataset.color || '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;

      let drawing = false;
      let lastX = 0;
      let lastY = 0;
      let dirty = false;
      const hidden = canvas.parentElement?.parentElement
        ?.querySelector('.wpforms-signature-input');

      function pos(e) {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width / r.width;
        const sy = canvas.height / r.height;
        return {
          x: (e.clientX - r.left) * sx,
          y: (e.clientY - r.top) * sy,
        };
      }

      canvas.addEventListener('pointerdown', (e) => {
        drawing = true;
        const p = pos(e);
        lastX = p.x;
        lastY = p.y;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastX = p.x;
        lastY = p.y;
        dirty = true;
      });
      canvas.addEventListener('pointerup', () => {
        drawing = false;
        if (dirty && hidden) hidden.value = 'data:image/png;base64,signed';
      });
      canvas.addEventListener('pointercancel', () => { drawing = false; });

      // Clear button
      const wrap = canvas.closest('.wpforms-signature-wrap');
      const clearBtn = wrap?.querySelector('.wpforms-signature-clear');
      if (clearBtn && !clearBtn.dataset.wpfWired) {
        clearBtn.dataset.wpfWired = '1';
        clearBtn.addEventListener('click', () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          dirty = false;
          if (hidden) hidden.value = '';
        });
      }
    });
  }

  // ─── 3. Phone iti country dropdown ──────────────────────────────────────

  function closeAllItiDropdowns() {
    $$('.iti__dropdown-content').forEach((d) => {
      d.classList.add('iti__hide');
    });
    $$('.iti__selected-country').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Click on a country list item
    const item = target.closest('.iti__country');
    if (item) {
      const iti = item.closest('.iti');
      const selected = iti?.querySelector('.iti__selected-country');
      const flagPrimary = iti?.querySelector('.iti__selected-country-primary .iti__flag');
      if (flagPrimary) {
        // Remove any existing iti__xx class, add new
        const newCode = item.dataset.countryCode;
        const oldClasses = Array.from(flagPrimary.classList);
        oldClasses.forEach((c) => {
          if (c !== 'iti__flag' && c.startsWith('iti__')) flagPrimary.classList.remove(c);
        });
        if (newCode) flagPrimary.classList.add(`iti__${newCode}`);
      }
      const name = item.querySelector('.iti__country-name')?.textContent || '';
      const dial = item.querySelector('.iti__dial-code')?.textContent || '';
      if (selected) {
        selected.setAttribute('aria-label', `Change country, selected ${name} (${dial})`);
        selected.setAttribute('title', name);
      }
      // Mark selected in list
      iti?.querySelectorAll('.iti__country').forEach((li) => {
        li.classList.remove('iti__highlight');
        li.setAttribute('aria-selected', 'false');
      });
      item.classList.add('iti__highlight');
      item.setAttribute('aria-selected', 'true');
      closeAllItiDropdowns();
      return;
    }

    // Click on the selected-country button → toggle dropdown
    const btn = target.closest('.iti__selected-country');
    if (btn) {
      const iti = btn.closest('.iti');
      const dropdown = iti?.querySelector('.iti__dropdown-content');
      if (!dropdown) return;
      const wasOpen = !dropdown.classList.contains('iti__hide');
      closeAllItiDropdowns();
      if (!wasOpen) {
        dropdown.classList.remove('iti__hide');
        btn.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    // Outside click → close
    if (!target.closest('.iti__dropdown-content')) {
      closeAllItiDropdowns();
    }
  });

  // ─── 4. Rating: SVG fill up to selected ─────────────────────────────────

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
    const ratingWrap = t.closest('.wpforms-field-rating-items');
    if (!ratingWrap) return;
    const val = parseInt(t.value, 10);
    if (!Number.isFinite(val)) return;
    Array.from(ratingWrap.children).forEach((label, i) => {
      const idx = i + 1;
      label.classList.toggle('wpforms-field-rating-item-selected', idx <= val);
    });
  });

  // Hover preview for rating
  function initRatingHover() {
    $$('.wpforms-field-rating-items').forEach((wrap) => {
      if (wrap.dataset.wpfWired) return;
      wrap.dataset.wpfWired = '1';
      const items = Array.from(wrap.children);
      items.forEach((label, i) => {
        const idx = i + 1;
        label.addEventListener('mouseenter', () => {
          items.forEach((l, j) => {
            l.classList.toggle('wpforms-field-rating-item-hover', j + 1 <= idx);
          });
        });
        label.addEventListener('mouseleave', () => {
          items.forEach((l) => l.classList.remove('wpforms-field-rating-item-hover'));
        });
      });
    });
  }

  // ─── 5. NPS: selected highlight class ───────────────────────────────────

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
    if (!t.classList.contains('wpforms-net-promoter-score-option')) return;
    const npsField = t.closest('.wpforms-field-net_promoter_score');
    if (!npsField) return;
    npsField.querySelectorAll('label').forEach((l) =>
      l.classList.remove('wpforms-net-promoter-score-option-selected'));
    const myLabel = npsField.querySelector(`label[for="${t.id}"]`);
    if (myLabel) myLabel.classList.add('wpforms-net-promoter-score-option-selected');
  });

  // ─── 6. Likert: per-row selected highlight ──────────────────────────────

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
    if (!t.classList.contains('wpforms-likert-scale-option')) return;
    const row = t.closest('tr');
    if (!row) return;
    row.querySelectorAll('label, .wpforms-likert-scale-mobile-flex').forEach((el) =>
      el.classList.remove('wpforms-likert-scale-option-selected'));
    const myLabel = row.querySelector(`label[for="${t.id}"]`);
    if (myLabel) myLabel.classList.add('wpforms-likert-scale-option-selected');
    const mobile = t.closest('.wpforms-likert-scale-mobile-flex');
    if (mobile) mobile.classList.add('wpforms-likert-scale-option-selected');
  });

  // ─── 7. Modern file upload: stub click → fake file row ──────────────────

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const uploader = target.closest('.wpforms-uploader.dz-clickable');
    if (!uploader) return;
    // Suppress real file picker
    e.preventDefault();
    // Already has a file? skip
    if (uploader.querySelector('.dz-preview')) return;
    const preview = document.createElement('div');
    preview.className = 'dz-preview dz-file-preview dz-processing dz-complete';
    preview.innerHTML = `
      <div class="dz-image"><img alt="file preview"></div>
      <div class="dz-details">
        <div class="dz-size"><span>1.2 MB</span></div>
        <div class="dz-filename"><span>sample-document.pdf</span></div>
      </div>
      <div class="dz-progress"><span class="dz-upload" style="width:100%;"></span></div>
      <div class="dz-success-mark"><span>✓</span></div>
      <a class="dz-remove" href="#" title="Remove file">Remove file</a>
    `;
    uploader.appendChild(preview);
    uploader.classList.add('dz-started');
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.classList.contains('dz-remove')) return;
    e.preventDefault();
    const preview = t.closest('.dz-preview');
    const uploader = t.closest('.wpforms-uploader');
    preview?.remove();
    if (uploader && !uploader.querySelector('.dz-preview')) {
      uploader.classList.remove('dz-started');
    }
  });

  // ─── 8. Pagebreak navigation ────────────────────────────────────────────

  function getPages(form) {
    return $$('.wpforms-page', form);
  }
  function currentPageNum(form) {
    const pages = getPages(form);
    for (const p of pages) {
      if (p.style.display !== 'none') {
        const m = (p.className || '').match(/wpforms-page-(\d+)/);
        if (m) return parseInt(m[1], 10);
      }
    }
    return 1;
  }
  function totalPages(form) { return getPages(form).length; }

  function showPage(form, num) {
    const pages = getPages(form);
    pages.forEach((p) => {
      const m = (p.className || '').match(/wpforms-page-(\d+)/);
      const n = m ? parseInt(m[1], 10) : -1;
      p.style.display = n === num ? '' : 'none';
    });
    // Update progress indicator
    const total = pages.length;
    const indicator = $('.wpforms-page-indicator', form);
    if (indicator) {
      indicator.setAttribute('aria-valuenow', String(num));
      const progressBar = indicator.querySelector('.wpforms-page-indicator-page-progress');
      if (progressBar) progressBar.style.width = Math.round((num / total) * 100) + '%';
      const cur = indicator.querySelector('.wpforms-page-indicator-steps-current');
      if (cur) cur.textContent = String(num);
    }
    // Submit container visibility — only on the last page
    const submitContainer = $('.wpforms-submit-container', form);
    const submitBtn = $('.wpforms-submit', form);
    const isLast = num === total;
    if (submitContainer) submitContainer.style.display = isLast ? '' : 'none';
    if (submitBtn) submitBtn.classList.toggle('wpforms-hidden', !isLast);
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('.wpforms-page-button');
    if (!btn) return;
    e.preventDefault();
    const form = btn.closest('form.wpforms-form');
    if (!form) return;
    const action = btn.dataset.action;
    const cur = currentPageNum(form);
    const total = totalPages(form);
    if (action === 'next' && cur < total) {
      showPage(form, cur + 1);
    } else if (action === 'prev' && cur > 1) {
      showPage(form, cur - 1);
    }
  });

  // ─── 9. Submit: validate, fade, show confirmation ───────────────────────

  const REAL_MESSAGES = {
    required: 'This field is required.',
    email: 'Please enter a valid email address.',
    url: 'Please enter a valid URL.',
    number: 'Please enter a valid number.',
  };

  function clearFieldError(container) {
    container.classList.remove('wpforms-has-error');
    container.querySelectorAll('input, select, textarea').forEach((el) => {
      el.classList.remove('wpforms-error');
    });
    container.querySelectorAll('em.wpforms-error, label.wpforms-error').forEach((el) => el.remove());
  }

  function setFieldError(container, input, message) {
    container.classList.add('wpforms-has-error');
    if (input) input.classList.add('wpforms-error');
    const errId = input ? `${input.id}-error` : `${container.id}-error`;
    if (container.querySelector(`#${errId}`)) return;
    const em = document.createElement('em');
    em.className = 'wpforms-error';
    em.id = errId;
    em.textContent = message;
    // Real WPForms appends the <em> after the input
    if (input && input.parentElement) {
      input.parentElement.appendChild(em);
    } else {
      container.appendChild(em);
    }
  }

  function isVisible(el) {
    if (!el) return false;
    let cur = el;
    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      cur = cur.parentElement;
    }
    return true;
  }

  function validateForm(form) {
    let firstInvalid = null;
    $$('.wpforms-field', form).forEach((container) => {
      if (!isVisible(container)) return;
      clearFieldError(container);
      const required = container.classList.contains('required');
      const type = container.dataset.fieldType;
      const inputs = $$('input, select, textarea', container).filter(
        (el) => el.type !== 'hidden' && !el.classList.contains('wpforms-screen-reader-element'),
      );
      // Required check
      if (required) {
        const groupName = inputs[0]?.name;
        const isChoiceGroup = inputs.some((i) => i.type === 'radio' || i.type === 'checkbox');
        if (isChoiceGroup) {
          // need at least one checked among visible
          const anyChecked = inputs.some((i) => (i.type === 'radio' || i.type === 'checkbox') && i.checked);
          if (!anyChecked) {
            setFieldError(container, null, REAL_MESSAGES.required);
            if (!firstInvalid) firstInvalid = container;
          }
        } else {
          for (const input of inputs) {
            if (!input.value || !String(input.value).trim()) {
              setFieldError(container, input, REAL_MESSAGES.required);
              if (!firstInvalid) firstInvalid = container;
              break;
            }
          }
        }
      }
      // Format check (email / url / number)
      const primary = inputs[0];
      if (primary && primary.value) {
        if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary.value)) {
          setFieldError(container, primary, REAL_MESSAGES.email);
          if (!firstInvalid) firstInvalid = container;
        } else if (type === 'url' && !/^https?:\/\/.+/.test(primary.value)) {
          setFieldError(container, primary, REAL_MESSAGES.url);
          if (!firstInvalid) firstInvalid = container;
        } else if (type === 'number' && !/^-?\d+(\.\d+)?$/.test(String(primary.value).trim())) {
          setFieldError(container, primary, REAL_MESSAGES.number);
          if (!firstInvalid) firstInvalid = container;
        }
      }
    });
    return firstInvalid;
  }

  function realConfirmationHTML() {
    return '<div class="wpforms-confirmation-container-full wpforms-confirmation-scroll" tabindex="-1" role="alert">'
      + '<p>Thanks for contacting us! We will be in touch with you shortly.</p>'
      + '</div>';
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const submit = t.closest('.wpforms-submit');
    if (!submit) return;
    e.preventDefault();
    const form = submit.closest('form.wpforms-form');
    if (!form) return;
    if (form.dataset.wpfSubmitted === '1') return;
    const invalid = validateForm(form);
    if (invalid) {
      // Real WPForms scrolls the first error into view
      try { invalid.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
      return;
    }
    form.dataset.wpfSubmitted = '1';
    // Fade form → confirmation
    form.style.transition = 'opacity 240ms ease';
    form.style.opacity = '0';
    setTimeout(() => {
      const container = form.closest('.wpforms-container') || form.parentElement;
      const conf = document.createElement('div');
      conf.innerHTML = realConfirmationHTML().trim();
      const confEl = conf.firstChild;
      form.style.display = 'none';
      if (container) container.insertBefore(confEl, form);
      // Fade-in
      if (confEl instanceof HTMLElement) {
        confEl.style.opacity = '0';
        confEl.style.transition = 'opacity 240ms ease';
        requestAnimationFrame(() => { confEl.style.opacity = '1'; });
      }
    }, 260);
  });

  // Clear errors on input (real WPForms behavior)
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const container = t.closest('.wpforms-field');
    if (!container || !container.classList.contains('wpforms-has-error')) return;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
      if (t.value && String(t.value).trim()) {
        clearFieldError(container);
      }
    }
  });

  // ─── 10. Reset to start (for QC: ?reset rebuilds the form fresh) ────────
  // Triggered by reload; not exposed here.

  // ─── Init pass ──────────────────────────────────────────────────────────

  function runInits() {
    initSignaturePads();
    initRatingHover();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInits);
  } else {
    runInits();
  }

  // ─── Phase 1 hook: mirror sink (postMessage receiver) ───────────────────
  // Builder broadcasts { type: 'wpf:field-state', fieldId, setting, value, meta? }.
  // Phase 2+ adds applier entries to APPLIERS. Phase 1 keeps the listener
  // present so end-to-end plumbing can be tested before any appliers exist.

  const APPLIERS = Object.create(null);

  window.addEventListener('message', (e) => {
    const d = e?.data;
    if (!d || d.type !== 'wpf:field-state') return;
    const fn = APPLIERS[d.setting];
    if (!fn) return;
    const container = fieldContainerById(d.fieldId);
    if (!container) return;
    try {
      fn(container, d.value, d.meta || {});
    } catch (err) {
      console.error('[frontend] applier failed:', d.setting, err);
    }
  });

  // ─── Frontend isolate / show-only-these-fields ──────────────────────────
  // Lets video authors focus the frontend on just the fields the tutorial is
  // about — e.g. for a Checkbox-field video, isolate field_7 and hide the
  // other 30+ fields. Reversible.
  //
  // Messages (also callable via window.__wpfFrontend.isolate / showAll):
  //   { type: 'wpf:frontend-isolate', fieldIds: [7], opts?: { animate: true } }
  //   { type: 'wpf:frontend-show-all', opts?: { animate: true } }
  //
  // Default animate=true (fade affected fields). Pass animate:false for an
  // instant cut.

  function _allFieldContainers() {
    return $$('.wpforms-field[data-field-id]');
  }

  function _fadeHide(el) {
    el.style.transition = 'opacity 220ms ease, height 220ms ease, margin 220ms ease';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 240);
  }
  function _fadeShow(el) {
    el.style.display = '';
    el.style.opacity = '0';
    el.style.transition = 'opacity 280ms ease';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }

  function isolateFields(fieldIds, opts) {
    const allow = new Set((fieldIds || []).map(String));
    const animate = opts ? opts.animate !== false : true;
    _allFieldContainers().forEach((el) => {
      const id = el.dataset.fieldId;
      const keep = allow.has(String(id));
      if (keep) {
        if (el.style.display === 'none') {
          if (animate) _fadeShow(el);
          else { el.style.display = ''; el.style.opacity = ''; }
        }
      } else {
        if (el.style.display !== 'none') {
          if (animate) _fadeHide(el);
          else { el.style.display = 'none'; }
        }
      }
    });
  }

  function showAllFields(opts) {
    const animate = opts ? opts.animate !== false : true;
    _allFieldContainers().forEach((el) => {
      if (el.style.display === 'none') {
        if (animate) _fadeShow(el);
        else { el.style.display = ''; el.style.opacity = ''; }
      }
    });
  }

  window.addEventListener('message', (e) => {
    const d = e?.data;
    if (!d) return;
    if (d.type === 'wpf:frontend-isolate') {
      isolateFields(d.fieldIds || [], d.opts);
    } else if (d.type === 'wpf:frontend-show-all') {
      showAllFields(d.opts);
    }
  });

  // Expose for QC tooling (open the snapshot directly and call from console).
  window.__wpfFrontend = {
    APPLIERS,
    apply(fieldId, setting, value, meta) {
      const fn = APPLIERS[setting];
      const container = fieldContainerById(fieldId);
      if (!fn || !container) return false;
      fn(container, value, meta || {});
      return true;
    },
    isolate: isolateFields,
    showAll: showAllFields,
  };

  // ═══════════════════════════════════════════════════════════════════════
  // APPLIERS — Phase 2+ entries appended below this line.
  // Each: APPLIERS['setting-name'] = function(container, value, meta) { ... }
  // container is the .wpforms-field[data-field-id=N] element.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Shared lookup helpers for appliers ─────────────────────────────────

  function findLabel(container) {
    // <label> for input-style fields, <legend> for fieldset-style (radio/checkbox/likert/NPS/rating/address)
    return container.querySelector(':scope > label.wpforms-field-label')
      || container.querySelector(':scope > fieldset > legend.wpforms-field-label');
  }

  function visibleInputs(container) {
    return $$('input, select, textarea', container).filter((el) =>
      el.type !== 'hidden' && !el.classList.contains('wpforms-screen-reader-element'));
  }

  function findPrimaryInput(container) {
    return visibleInputs(container)[0] || null;
  }

  function preservedReqSpan(label) {
    return label.querySelector('.wpforms-required-label');
  }

  // ─── Phase 2 — Universal appliers ────────────────────────────────────────

  APPLIERS.label = (container, value) => {
    const label = findLabel(container);
    if (!label) return;
    const reqSpan = preservedReqSpan(label);
    label.textContent = (value == null || value === '') ? '' : String(value);
    if (reqSpan) label.appendChild(reqSpan);
  };

  APPLIERS.required = (container, value) => {
    container.classList.toggle('required', !!value);
    const label = findLabel(container);
    if (!label) return;
    let star = preservedReqSpan(label);
    if (value) {
      if (!star) {
        star = document.createElement('span');
        star.className = 'wpforms-required-label';
        star.setAttribute('aria-hidden', 'true');
        // Real WPForms uses a non-breaking space + asterisk
        star.textContent = ' *';
        label.appendChild(star);
      }
    } else if (star) {
      star.remove();
    }
  };

  APPLIERS['label-hide'] = (container, value) => {
    const label = findLabel(container);
    if (!label) return;
    // Real WPForms toggles visibility via CSS using .wpforms-label-hide on the field;
    // for the snapshot (no plugin CSS), inline display:none is the deterministic toggle.
    container.classList.toggle('label_hide', !!value);
    label.style.display = value ? 'none' : '';
  };

  APPLIERS.size = (container, value) => {
    const size = String(value || 'medium');
    // Real WPForms applies wpforms-field-<size> to inputs, selects, textareas,
    // and the wrapping field-row for address/uploader/etc.
    const targets = $$(
      'input:not([type=hidden]):not(.wpforms-screen-reader-element), select, textarea, .wpforms-field-row, .wpforms-uploader',
      container,
    );
    targets.forEach((el) => {
      el.classList.remove('wpforms-field-small', 'wpforms-field-medium', 'wpforms-field-large');
      el.classList.add('wpforms-field-' + size);
    });
  };

  APPLIERS.placeholder = (container, value) => {
    const primary = findPrimaryInput(container);
    if (!primary) return;
    if (primary instanceof HTMLSelectElement) {
      let ph = primary.querySelector('option[data-placeholder="1"], option.placeholder');
      if (value) {
        if (!ph) {
          ph = document.createElement('option');
          ph.value = '';
          ph.dataset.placeholder = '1';
          ph.disabled = true;
          ph.selected = true;
          primary.insertBefore(ph, primary.firstChild);
        }
        ph.textContent = String(value);
      } else if (ph) {
        ph.remove();
      }
    } else if (primary instanceof HTMLInputElement || primary instanceof HTMLTextAreaElement) {
      primary.setAttribute('placeholder', value || '');
    }
  };

  APPLIERS['placeholder-subfield'] = (container, value, meta) => {
    const subfield = meta?.subfield;
    if (!subfield) return;
    // Address subfields: .wpforms-field-address-<subfield>
    // Name subfields (when not in simple format): .wpforms-field-name-<subfield>
    const sels = [
      `.wpforms-field-address-${subfield}`,
      `.wpforms-field-name-${subfield}`,
      `[name$="[${subfield}]"]`,
    ];
    for (const sel of sels) {
      const els = $$(sel, container);
      if (!els.length) continue;
      els.forEach((el) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.setAttribute('placeholder', value || '');
        } else if (el instanceof HTMLSelectElement) {
          let ph = el.querySelector('option.placeholder, option[data-placeholder="1"]');
          if (value) {
            if (!ph) {
              ph = document.createElement('option');
              ph.value = '';
              ph.className = 'placeholder';
              ph.disabled = true;
              ph.selected = true;
              el.insertBefore(ph, el.firstChild);
            }
            ph.textContent = value;
          } else if (ph) ph.remove();
        }
      });
      return;
    }
  };

  APPLIERS['read-only'] = (container, value) => {
    const inputs = $$('input:not([type=hidden]):not(.wpforms-screen-reader-element), textarea', container);
    inputs.forEach((el) => {
      if (el.type === 'radio' || el.type === 'checkbox' || el.type === 'file') return;
      if (value) el.setAttribute('readonly', 'readonly');
      else el.removeAttribute('readonly');
    });
  };

  APPLIERS.description = (container, value) => {
    let desc = container.querySelector(':scope > .wpforms-field-description');
    const text = (value == null) ? '' : String(value);
    if (text) {
      if (!desc) {
        desc = document.createElement('div');
        desc.className = 'wpforms-field-description';
        container.appendChild(desc);
      }
      desc.textContent = text;
    } else if (desc) {
      desc.remove();
    }
  };

  APPLIERS['default-value'] = (container, value) => {
    const type = container.dataset.fieldType;
    const v = value == null ? '' : String(value);
    if (type === 'checkbox' || type === 'radio') {
      // Match by visible label text OR by input value
      const items = $$('li', container);
      items.forEach((li) => {
        const inp = li.querySelector('input[type=radio], input[type=checkbox]');
        if (!inp) return;
        const lab = li.querySelector('label')?.textContent.trim() || '';
        inp.checked = (inp.value === v || lab === v);
      });
      return;
    }
    const primary = findPrimaryInput(container);
    if (!primary) return;
    if (primary instanceof HTMLSelectElement) {
      const opt = Array.from(primary.options).find((o) => o.value === v || o.textContent.trim() === v);
      if (opt) primary.value = opt.value;
    } else if (primary instanceof HTMLInputElement || primary instanceof HTMLTextAreaElement) {
      primary.value = v;
      primary.setAttribute('value', v);
    }
  };

  APPLIERS['sublabel-hide'] = (container, value, meta) => {
    const subfield = meta?.subfield;
    let sels;
    if (subfield) {
      sels = $$(`.wpforms-field-sublabel[for*="-${subfield}"], .wpforms-field-sublabel[for*="${subfield}"]`, container);
    } else {
      sels = $$('.wpforms-field-sublabel', container);
    }
    sels.forEach((l) => { l.style.display = value ? 'none' : ''; });
  };

  // ─── Phase 3 — Choices (radio / checkbox / select) ──────────────────────

  function choiceItems(container) {
    return $$(':scope > fieldset > ul > li, :scope > ul > li', container);
  }
  function selectOptions(container) {
    const sel = container.querySelector('select');
    if (!sel) return [];
    return Array.from(sel.options).filter((o) => !o.classList.contains('placeholder') && !o.dataset.placeholder);
  }

  APPLIERS['choice-label'] = (container, value, meta) => {
    const idx = (meta?.index | 0) - 1;
    if (idx < 0) return;
    const text = value == null ? '' : String(value);
    const items = choiceItems(container);
    if (items[idx]) {
      const lab = items[idx].querySelector('label');
      if (lab) lab.textContent = text;
      const inp = items[idx].querySelector('input');
      if (inp) inp.value = text;
    }
    const opts = selectOptions(container);
    if (opts[idx]) {
      opts[idx].textContent = text;
      opts[idx].value = text;
    }
  };

  APPLIERS['choice-add'] = (container, value, meta) => {
    const text = value == null ? 'New Choice' : String(value);
    const type = container.dataset.fieldType;
    const fid = container.dataset.fieldId;
    const formId = formIdFromContainer(container) || formId();
    const ul = container.querySelector(':scope > fieldset > ul, :scope > ul');
    if (ul) {
      const existing = ul.children.length;
      const newIdx = existing + 1;
      const inputType = (type === 'checkbox' || type === 'payment-checkbox') ? 'checkbox'
        : (type === 'radio' || type === 'payment-multiple') ? 'radio' : 'radio';
      const inputName = (inputType === 'checkbox') ? `wpforms[fields][${fid}][]` : `wpforms[fields][${fid}]`;
      const inputId = `wpforms-${formId}-field_${fid}_${newIdx}`;
      const li = document.createElement('li');
      li.className = `choice-${newIdx} depth-1`;
      li.innerHTML = `<input type="${inputType}" id="${inputId}" name="${inputName}" value="${text}"><label class="wpforms-field-label-inline" for="${inputId}">${text}</label>`;
      ul.appendChild(li);
    }
    const sel = container.querySelector('select');
    if (sel) {
      const opt = document.createElement('option');
      opt.value = text;
      opt.className = `choice-${sel.options.length + 1} depth-1`;
      opt.textContent = text;
      sel.appendChild(opt);
    }
  };

  APPLIERS['choice-remove'] = (container, _value, meta) => {
    const idx = (meta?.index | 0) - 1;
    if (idx < 0) return;
    const items = choiceItems(container);
    if (items[idx]) items[idx].remove();
    const opts = selectOptions(container);
    if (opts[idx]) opts[idx].remove();
    // Re-number choice classes
    choiceItems(container).forEach((li, i) => {
      li.className = li.className.replace(/choice-\d+/, `choice-${i + 1}`);
    });
  };

  APPLIERS['choice-default'] = (container, value, meta) => {
    const idx = (meta?.index | 0) - 1;
    if (idx < 0) return;
    const on = !!value;
    const items = choiceItems(container);
    if (items[idx]) {
      const inp = items[idx].querySelector('input[type=radio], input[type=checkbox]');
      if (inp) {
        if (inp.type === 'radio') {
          // Radio: only one default; uncheck siblings
          $$('input[type=radio]', container).forEach((i) => { i.checked = false; });
        }
        inp.checked = on;
      }
    }
    const opts = selectOptions(container);
    if (opts[idx]) opts[idx].selected = on;
  };

  APPLIERS['choices-layout'] = (container, value) => {
    const v = String(value || '1-column');
    const cls = {
      '1-column': '',
      '2-columns': 'wpforms-list-2-columns',
      '3-columns': 'wpforms-list-3-columns',
      'inline': 'wpforms-list-inline',
    };
    container.classList.remove('wpforms-list-2-columns', 'wpforms-list-3-columns', 'wpforms-list-inline');
    if (cls[v]) container.classList.add(cls[v]);
  };

  APPLIERS['choices-other'] = (container, value) => {
    const on = !!value;
    const ul = container.querySelector(':scope > fieldset > ul, :scope > ul');
    if (!ul) return;
    let other = ul.querySelector('.wpforms-field-radio-choice-other, .wpforms-field-checkbox-choice-other');
    if (on) {
      if (!other) {
        const fid = container.dataset.fieldId;
        const fmtId = formIdFromContainer(container) || formId();
        const type = container.dataset.fieldType;
        const inputType = (type === 'checkbox') ? 'checkbox' : 'radio';
        const inputName = (inputType === 'checkbox') ? `wpforms[fields][${fid}][]` : `wpforms[fields][${fid}]`;
        const otherIdx = ul.children.length + 1;
        other = document.createElement('li');
        other.className = `choice-${otherIdx} depth-1 wpforms-field-${type}-choice-other`;
        other.innerHTML = `
          <input type="${inputType}" id="wpforms-${fmtId}-field_${fid}_${otherIdx}" name="${inputName}" value="">
          <label class="wpforms-field-label-inline" for="wpforms-${fmtId}-field_${fid}_${otherIdx}">Other</label>
          <input type="text" placeholder="Other" class="wpforms-field-${type}-choice-other-input" disabled>
        `;
        ul.appendChild(other);
      }
    } else if (other) other.remove();
  };

  APPLIERS['choices-other-placeholder'] = (container, value) => {
    const other = container.querySelector('.wpforms-field-radio-choice-other-input, .wpforms-field-checkbox-choice-other-input');
    if (other) other.setAttribute('placeholder', value || 'Other');
  };

  APPLIERS['dropdown-multiple'] = (container, value) => {
    const sel = container.querySelector('select');
    if (!sel) return;
    if (value) sel.setAttribute('multiple', 'multiple');
    else sel.removeAttribute('multiple');
  };

  APPLIERS['dropdown-style'] = (container, value) => {
    // Real plugin: classic = native <select>; modern wraps in choices.js DOM.
    // For the snapshot, we toggle a marker class; choices.js DOM is not built.
    container.classList.toggle('wpforms-field-select-style-modern', value === 'modern');
    container.classList.toggle('wpforms-field-select-style-classic', value !== 'modern');
  };

  // ─── Phase 3 — Date / Time ──────────────────────────────────────────────

  APPLIERS['date-format'] = (container, value) => {
    const inp = container.querySelector('input.wpforms-field-date, input[type=text].flatpickr-input, input[type=text]');
    if (inp) inp.setAttribute('placeholder', String(value || ''));
  };
  APPLIERS['time-format'] = (container, value) => {
    const inp = container.querySelector('input.wpforms-field-time, input[type=text]');
    if (inp) inp.setAttribute('placeholder', String(value || ''));
  };
  APPLIERS['date-placeholder'] = (container, value) => {
    const inp = container.querySelector('input.wpforms-field-date, input[type=text]');
    if (inp) inp.setAttribute('placeholder', value || '');
  };
  APPLIERS['time-placeholder'] = (container, value) => {
    const inp = container.querySelector('input.wpforms-field-time, input[type=text]');
    if (inp) inp.setAttribute('placeholder', value || '');
  };
  APPLIERS['date-type'] = (container, value) => {
    container.classList.remove('wpforms-date-type-date', 'wpforms-date-type-time', 'wpforms-date-type-datetime');
    container.classList.add('wpforms-date-type-' + String(value || 'date'));
  };

  // ─── Phase 3 — Number slider ────────────────────────────────────────────

  APPLIERS['slider-range'] = (container, _value, meta) => {
    const range = container.querySelector('input[type=range]');
    if (!range) return;
    if (meta && Number.isFinite(meta.min)) range.setAttribute('min', String(meta.min));
    if (meta && Number.isFinite(meta.max)) range.setAttribute('max', String(meta.max));
    // Clamp value
    const v = parseFloat(range.value);
    const mn = parseFloat(range.min);
    const mx = parseFloat(range.max);
    if (Number.isFinite(mn) && v < mn) range.value = String(mn);
    if (Number.isFinite(mx) && v > mx) range.value = String(mx);
    range.dispatchEvent(new Event('input', { bubbles: true }));
  };
  APPLIERS['slider-min'] = (container, value) => APPLIERS['slider-range'](container, null, { min: parseFloat(value) });
  APPLIERS['slider-max'] = (container, value) => APPLIERS['slider-range'](container, null, { max: parseFloat(value) });
  APPLIERS['slider-step'] = (container, value) => {
    const range = container.querySelector('input[type=range]');
    if (range) range.setAttribute('step', String(value));
  };
  APPLIERS['slider-default'] = (container, value) => {
    const range = container.querySelector('input[type=range]');
    if (!range) return;
    range.setAttribute('value', String(value));
    range.value = String(value);
    range.dispatchEvent(new Event('input', { bubbles: true }));
  };
  APPLIERS['slider-value-display'] = (container, value) => {
    const hint = container.querySelector('.wpforms-field-number-slider-hint');
    if (!hint) return;
    hint.dataset.hint = String(value || 'Selected Value: {value}');
    // Re-render
    const range = container.querySelector('input[type=range]');
    if (range) range.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // ─── Phase 3 — Rating ───────────────────────────────────────────────────

  const RATING_PATHS = {
    star: 'M1728 647q0 22-26 48l-363 354 86 500q1 7 1 20 0 21-10.5 35.5t-30.5 14.5q-19 0-40-12l-449-236-449 236q-22 12-40 12-21 0-31.5-14.5t-10.5-35.5q0-6 2-20l86-500-364-354q-25-27-25-48 0-37 56-46l502-73 225-455q19-41 49-41t49 41l225 455 502 73q56 9 56 46z',
    heart: 'M896 1664q-26 0-44-18l-624-602q-10-8-27.5-26T145 952.5 77 855 23.5 734 0 596q0-220 127-344t351-124q62 0 126.5 21.5t120 58T820 276t76 68q36-36 76-68t95.5-68.5 120-58T1314 128q224 0 351 124t127 344q0 221-229 450l-623 600q-18 18-44 18z',
    thumb: 'M1408 1216q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm0-768q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm-192 192q0-26-19-45t-45-19q-99 0-181 50t-127 130q-69-110-188-110q-83 0-141 58t-58 141v640q0 83 58 141t141 58q119 0 188-110 45 80 127 130t181 50q26 0 45-19t19-45-19-45-45-19q-72 0-128-44t-86-110q4 0 7 1t7 1q31 8 59 8 81 0 137-56t56-137q0-79-54-135-50-52-119-52t-119 52q-54 56-54 135 0 80 56 137t137 56q33 0 60-8t52-23q-21 87-79 145t-145 79z',
    smiley: 'M768 1536q-209 0-385.5-103T103 1153.5 0 768t103-385.5T382.5 103 768 0t385.5 103T1433 382.5 1536 768t-103 385.5-279.5 279.5T768 1536zm-256-1024q0-53-37.5-90.5T384 384t-90.5 37.5T256 512t37.5 90.5T384 640t90.5-37.5T512 512zm640 0q0-53-37.5-90.5T1024 384t-90.5 37.5T896 512t37.5 90.5T1024 640t90.5-37.5T1152 512zM896 1248q116 0 211.5-58t150.5-160l-72-40q-49 75-126 121.5T896 1158q-93 0-170-46.5T600 990l-72 40q55 102 150.5 160T896 1248z',
  };

  APPLIERS['rating-scale'] = (container, value) => {
    const wrap = container.querySelector('.wpforms-field-rating-items');
    if (!wrap) return;
    const targetCount = parseInt(value, 10) || 5;
    const items = Array.from(wrap.children);
    const fid = container.dataset.fieldId;
    const fmtId = formIdFromContainer(container) || formId();
    // Add or remove
    while (wrap.children.length > targetCount) wrap.removeChild(wrap.lastChild);
    while (wrap.children.length < targetCount) {
      const idx = wrap.children.length + 1;
      const sample = items[0];
      const label = document.createElement('label');
      label.className = `wpforms-field-rating-item choice-${idx}`;
      label.setAttribute('for', `wpforms-${fmtId}-field_${fid}_${idx}`);
      label.innerHTML = `<span class="wpforms-screen-reader-element">Rate ${idx} out of ${targetCount}</span>`
        + `<input type="radio" id="wpforms-${fmtId}-field_${fid}_${idx}" class="wpforms-screen-reader-element" name="wpforms[fields][${fid}]" value="${idx}">`
        + (sample?.querySelector('svg')?.outerHTML || '');
      wrap.appendChild(label);
    }
    // Update screen-reader text to reflect new scale
    Array.from(wrap.children).forEach((label, i) => {
      const sr = label.querySelector('.wpforms-screen-reader-element');
      if (sr) sr.textContent = `Rate ${i + 1} out of ${targetCount}`;
    });
  };

  APPLIERS['rating-icon'] = (container, value) => {
    const path = RATING_PATHS[value] || RATING_PATHS.star;
    $$('.wpforms-field-rating-item svg path', container).forEach((p) => p.setAttribute('d', path));
  };

  APPLIERS['rating-icon-size'] = (container, value) => {
    const size = parseInt(value, 10) || 24;
    $$('.wpforms-field-rating-item svg', container).forEach((svg) => {
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.style.width = size + 'px';
      svg.style.height = size + 'px';
    });
  };

  APPLIERS['rating-icon-color'] = (container, value) => {
    const color = String(value || '#066aab');
    $$('.wpforms-field-rating-item svg', container).forEach((svg) => {
      svg.setAttribute('color', color);
      svg.style.color = color;
    });
  };

  APPLIERS['rating-label-position'] = (container, value) => {
    const wrap = container.querySelector('.wpforms-field-rating-wrapper');
    if (!wrap) return;
    wrap.classList.remove(
      'wpforms-field-rating-labels-position-above',
      'wpforms-field-rating-labels-position-below',
      'wpforms-field-rating-labels-position-hidden',
    );
    wrap.classList.add('wpforms-field-rating-labels-position-' + (value || 'below'));
  };

  APPLIERS['rating-edge-label'] = (container, value, meta) => {
    const wrap = container.querySelector('.wpforms-field-rating-wrapper');
    if (!wrap) return;
    let band = wrap.querySelector('.wpforms-field-rating-edge-labels');
    if (!band) {
      band = document.createElement('div');
      band.className = 'wpforms-field-rating-edge-labels';
      band.innerHTML = '<span class="lowest"></span><span class="highest"></span>';
      wrap.insertBefore(band, wrap.firstChild);
    }
    const which = meta?.edge === 'highest' ? 'highest' : 'lowest';
    band.querySelector('.' + which).textContent = String(value || '');
  };

  // ─── Phase 3 — Phone format ─────────────────────────────────────────────

  APPLIERS['phone-format'] = (container, value) => {
    const fmt = String(value || 'smart');
    container.classList.remove('wpforms-field-phone-format-smart', 'wpforms-field-phone-format-international', 'wpforms-field-phone-format-us');
    container.classList.add('wpforms-field-phone-format-' + fmt);
    // Hide / show iti country picker
    const countryBtn = container.querySelector('.iti__country-container');
    if (countryBtn) countryBtn.style.display = fmt === 'us' ? 'none' : '';
    // US format adds a fixed mask
    const inp = container.querySelector('input[type=tel], input[type=text]');
    if (inp) {
      if (fmt === 'us') inp.setAttribute('placeholder', '(555) 555-5555');
      else inp.removeAttribute('placeholder');
    }
  };

  // ─── Phase 3 — Address scheme + subfield hide ───────────────────────────

  const US_STATES = [
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
    ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],
    ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
    ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
    ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
    ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
    ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
    ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],
    ['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
    ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
    ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ];

  APPLIERS['address-scheme'] = (container, value) => {
    const scheme = String(value || 'us');
    const stateEl = container.querySelector('.wpforms-field-address-state');
    const postalLabel = container.querySelector('.wpforms-field-address-postal + label, label[for$="-postal"]');
    const countryWrap = container.querySelector('.wpforms-field-address-country')?.closest('.wpforms-field-row-block');
    if (scheme === 'us') {
      if (stateEl && stateEl.tagName !== 'SELECT') {
        const sel = document.createElement('select');
        sel.id = stateEl.id;
        sel.className = stateEl.className.replace('wpforms-field-address-state', 'wpforms-field-address-state');
        sel.className = 'wpforms-field-address-state';
        sel.name = stateEl.name;
        sel.innerHTML = '<option class="placeholder" value="" selected disabled>— Select state —</option>'
          + US_STATES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
        stateEl.replaceWith(sel);
      }
      const postalSublabel = container.querySelector('label[for$="-postal"]');
      if (postalSublabel) postalSublabel.textContent = 'Zip Code';
      if (countryWrap) countryWrap.style.display = 'none';
    } else if (scheme === 'international') {
      if (stateEl && stateEl.tagName === 'SELECT') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.id = stateEl.id;
        inp.className = 'wpforms-field-address-state';
        inp.name = stateEl.name;
        stateEl.replaceWith(inp);
      }
      const postalSublabel = container.querySelector('label[for$="-postal"]');
      if (postalSublabel) postalSublabel.textContent = 'Postal Code';
      if (countryWrap) countryWrap.style.display = '';
    }
  };

  APPLIERS['address-subfield-hide'] = (container, value, meta) => {
    const sub = meta?.subfield;
    if (!sub) return;
    const el = container.querySelector(`.wpforms-field-address-${sub}`);
    const row = el?.closest('.wpforms-field-row-block') || el?.closest('.wpforms-field-row');
    if (row) row.style.display = value ? 'none' : '';
  };

  // ─── Phase 3 — Name format ──────────────────────────────────────────────

  APPLIERS['name-format'] = (container, value) => {
    const fmt = String(value || 'simple');
    const fid = container.dataset.fieldId;
    const fmtId = formIdFromContainer(container) || formId();
    container.classList.remove('wpforms-field-name-format-simple', 'wpforms-field-name-format-first-last', 'wpforms-field-name-format-first-middle-last');
    container.classList.add('wpforms-field-name-format-' + fmt);
    const label = findLabel(container);
    // Strip everything after label
    if (label) {
      let next = label.nextSibling;
      while (next) {
        const toRemove = next;
        next = next.nextSibling;
        toRemove.parentNode.removeChild(toRemove);
      }
    }
    function subfield(cls, name, ph) {
      return `<div class="wpforms-field-row-block ${cls}-wrap"><input type="text" id="wpforms-${fmtId}-field_${fid}-${name}" class="wpforms-field-name-${name} wpforms-field-medium" name="wpforms[fields][${fid}][${name}]"><label for="wpforms-${fmtId}-field_${fid}-${name}" class="wpforms-field-sublabel after">${ph}</label></div>`;
    }
    if (fmt === 'simple') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = `wpforms-${fmtId}-field_${fid}`;
      inp.className = 'wpforms-field-medium';
      inp.name = `wpforms[fields][${fid}]`;
      container.appendChild(inp);
    } else if (fmt === 'first-last') {
      const row = document.createElement('div');
      row.className = 'wpforms-field-row wpforms-field-medium';
      row.innerHTML = subfield('wpforms-one-half wpforms-first', 'first', 'First')
        + subfield('wpforms-one-half', 'last', 'Last');
      container.appendChild(row);
    } else if (fmt === 'first-middle-last') {
      const row = document.createElement('div');
      row.className = 'wpforms-field-row wpforms-field-medium';
      row.innerHTML = subfield('wpforms-one-third wpforms-first', 'first', 'First')
        + subfield('wpforms-one-third', 'middle', 'Middle')
        + subfield('wpforms-one-third', 'last', 'Last');
      container.appendChild(row);
    }
  };

  APPLIERS['name-subfield-default'] = APPLIERS['name-format'];

  // ─── Phase 3 — Number min/max ───────────────────────────────────────────

  APPLIERS['number-min-max'] = (container, _value, meta) => {
    const inp = container.querySelector('input[type=number], input[type=text]');
    if (!inp) return;
    if (meta && meta.min != null && Number.isFinite(parseFloat(meta.min))) inp.setAttribute('min', String(meta.min));
    if (meta && meta.max != null && Number.isFinite(parseFloat(meta.max))) inp.setAttribute('max', String(meta.max));
  };

  // ─── Phase 3 — Divider / Pagebreak / HTML / Content ─────────────────────

  APPLIERS['divider-hide-line'] = (container, value) => {
    container.classList.toggle('wpforms-divider-hide-line', !!value);
    // Hide the actual <hr> if present
    const hr = container.querySelector('h3, hr');
    if (hr && hr.tagName === 'HR') hr.style.display = value ? 'none' : '';
  };

  APPLIERS['pagebreak-title'] = (container, value) => {
    // Title goes in .wpforms-page-indicator-page-title — find indicator at form level
    const form = container.closest('form');
    const title = form?.querySelector('.wpforms-page-indicator-page-title');
    if (title) title.textContent = String(value || '');
  };

  APPLIERS['pagebreak-indicator'] = (container, value) => {
    const form = container.closest('form');
    const indicator = form?.querySelector('.wpforms-page-indicator');
    if (!indicator) return;
    indicator.classList.remove('progress', 'circles', 'connector', 'none');
    if (value !== 'none') indicator.classList.add(String(value || 'progress'));
    indicator.setAttribute('data-indicator', String(value || 'progress'));
    indicator.style.display = value === 'none' ? 'none' : '';
  };

  APPLIERS['pagebreak-progress-text'] = (container, value) => {
    const form = container.closest('form');
    const steps = form?.querySelector('.wpforms-page-indicator-steps');
    if (!steps) return;
    // Template like "Step {current} of {total}"
    const current = steps.querySelector('.wpforms-page-indicator-steps-current')?.textContent || '1';
    const total = (form?.querySelectorAll('.wpforms-page').length) || 2;
    const tmpl = String(value || 'Step {current} of {total}');
    steps.innerHTML = tmpl
      .replace('{current}', `<span class="wpforms-page-indicator-steps-current">${current}</span>`)
      .replace('{total}', String(total));
  };

  APPLIERS['pagebreak-indicator-color'] = (container, value) => {
    const form = container.closest('form');
    const indicator = form?.querySelector('.wpforms-page-indicator');
    if (indicator) {
      indicator.setAttribute('data-indicator-color', String(value));
      const bar = indicator.querySelector('.wpforms-page-indicator-page-progress');
      if (bar) bar.style.backgroundColor = String(value);
    }
  };

  APPLIERS['pagebreak-nav-align'] = (container, value) => {
    const wrap = container.querySelector('.wpforms-pagebreak-left, .wpforms-pagebreak-right, .wpforms-pagebreak-center, .wpforms-pagebreak-split');
    if (!wrap) return;
    wrap.className = wrap.className.replace(/wpforms-pagebreak-(left|right|center|split)/, 'wpforms-pagebreak-' + String(value || 'left'));
  };

  APPLIERS['html-code'] = (container, value) => {
    const inner = container.querySelector(':scope > div');
    if (inner) inner.innerHTML = String(value || '');
  };

  APPLIERS['content-html'] = (container, value) => {
    const inner = container.querySelector(':scope > div');
    if (inner) inner.innerHTML = String(value || '');
  };

  // ─── Phase 3 — Email confirmation placeholder ───────────────────────────

  APPLIERS['email-confirmation-placeholder'] = (container, value) => {
    // The secondary (confirmation) email input is the second input in the container
    const inputs = $$('input[type=email]', container);
    if (inputs.length >= 2) inputs[1].setAttribute('placeholder', value || '');
  };

  // ─── Phase 4 — Payment fields ───────────────────────────────────────────

  function fmtMoney(v) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return '$0.00';
    return '$' + n.toFixed(2);
  }

  APPLIERS['payment-price'] = (container, value) => {
    const priceEl = container.querySelector('.wpforms-payment-price, .item-price, .price');
    if (priceEl) priceEl.textContent = fmtMoney(value);
    // For payment-single, also update the hidden amount input
    const hidden = container.querySelector('input[name*="[amount]"], input.wpforms-payment-price');
    if (hidden) hidden.value = String(value);
  };

  APPLIERS['payment-price-label'] = (container, value) => {
    const labelEl = container.querySelector('.price-label, .wpforms-payment-price-label');
    if (!labelEl) return;
    const priceVal = parseFloat(container.querySelector('input.wpforms-payment-price, .item-price, .price')?.textContent || '0');
    const template = String(value || 'Price: {price}');
    labelEl.textContent = template.replace('{price}', fmtMoney(priceVal));
  };

  APPLIERS['payment-format'] = (container, value) => {
    const fmt = String(value || 'single');
    container.classList.remove('wpforms-payment-format-single', 'wpforms-payment-format-user', 'wpforms-payment-format-hidden');
    container.classList.add('wpforms-payment-format-' + fmt);
    // single: show fixed price label; user: show input; hidden: nothing
    const inp = container.querySelector('input[type=text], input[type=number]');
    const label = container.querySelector('.price-label, .item-price');
    if (fmt === 'hidden') {
      if (label) label.style.display = 'none';
      if (inp) inp.style.display = 'none';
    } else if (fmt === 'user') {
      if (label) label.style.display = 'none';
      if (inp) inp.style.display = '';
    } else {
      if (label) label.style.display = '';
      if (inp) inp.style.display = 'none';
    }
  };

  APPLIERS['payment-min-price'] = (container, value) => {
    const note = container.querySelector('.item-min-price, .min-price');
    if (note) note.textContent = 'Minimum price: ' + fmtMoney(value);
  };

  APPLIERS['payment-quantity-toggle'] = (container, value) => {
    container.classList.toggle('wpforms-payment-quantity-enabled', !!value);
    let qty = container.querySelector('.wpforms-payment-quantity');
    if (value) {
      if (!qty) {
        qty = document.createElement('div');
        qty.className = 'wpforms-payment-quantity';
        qty.innerHTML = '<label>Quantity</label><input type="number" min="1" value="1" style="width:60px">';
        container.appendChild(qty);
      }
    } else if (qty) qty.remove();
  };

  APPLIERS['payment-choices-show-price'] = (container, value) => {
    container.classList.toggle('wpforms-payment-choices-show-price', !!value);
    // For each choice, append " - $X.XX" or strip it
    const items = choiceItems(container);
    items.forEach((li, i) => {
      const lab = li.querySelector('label');
      if (!lab) return;
      const baseText = lab.dataset.wpfBaseLabel || lab.textContent.replace(/\s*-\s*\$[\d.]+$/, '').trim();
      lab.dataset.wpfBaseLabel = baseText;
      const inp = li.querySelector('input');
      const price = inp?.dataset.wpfPrice || '0';
      lab.textContent = value ? `${baseText} - ${fmtMoney(price)}` : baseText;
    });
  };

  APPLIERS['payment-choice-price'] = (container, value, meta) => {
    const idx = (meta?.index | 0) - 1;
    if (idx < 0) return;
    const items = choiceItems(container);
    if (!items[idx]) return;
    const inp = items[idx].querySelector('input');
    if (inp) inp.dataset.wpfPrice = String(value);
    const lab = items[idx].querySelector('label');
    if (lab && container.classList.contains('wpforms-payment-choices-show-price')) {
      const baseText = lab.dataset.wpfBaseLabel || lab.textContent.replace(/\s*-\s*\$[\d.]+$/, '').trim();
      lab.dataset.wpfBaseLabel = baseText;
      lab.textContent = `${baseText} - ${fmtMoney(value)}`;
    }
  };

  APPLIERS['coupon-button-text'] = (container, value) => {
    const btn = container.querySelector('.wpforms-coupon-apply, button[data-coupon]');
    if (btn) btn.textContent = String(value || 'Apply');
  };

  APPLIERS['payment-total-summary'] = (container, value) => {
    let summary = container.querySelector('.wpforms-order-summary-container');
    const total = container.querySelector('.wpforms-total-amount');
    if (value) {
      if (total) total.style.display = 'none';
      if (summary) summary.style.display = '';
    } else {
      if (summary) summary.style.display = 'none';
      if (total) total.style.display = '';
    }
  };

  // ─── Phase 4 — File upload ──────────────────────────────────────────────

  APPLIERS['file-upload-style'] = (container, value) => {
    const isModern = value === 'modern';
    const uploader = container.querySelector('.wpforms-uploader');
    const classicInput = container.querySelector('input[type=file]');
    if (isModern) {
      if (!uploader && classicInput) {
        // Swap classic → modern (basic shell)
        const fid = container.dataset.fieldId;
        const fmtId = formIdFromContainer(container) || formId();
        const div = document.createElement('div');
        div.className = 'wpforms-uploader dz-clickable';
        div.dataset.fieldId = fid;
        div.dataset.formId = fmtId;
        div.innerHTML = '<div class="dz-message"><span>Drop your file here or click to upload</span></div>';
        classicInput.replaceWith(div);
      }
    } else {
      // Swap modern → classic
      if (uploader && !classicInput) {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.id = `wpforms-${formIdFromContainer(container) || formId()}-field_${container.dataset.fieldId}`;
        uploader.replaceWith(inp);
      }
    }
  };

  APPLIERS['file-upload-max'] = (container, value) => {
    const uploader = container.querySelector('.wpforms-uploader');
    if (uploader) uploader.dataset.maxFileNumber = String(value);
  };

  APPLIERS['file-upload-camera'] = (container, value) => {
    const uploader = container.querySelector('.wpforms-uploader');
    if (!uploader) return;
    let cam = uploader.querySelector('.wpforms-uploader-camera');
    if (value) {
      if (!cam) {
        cam = document.createElement('button');
        cam.type = 'button';
        cam.className = 'wpforms-uploader-camera';
        cam.textContent = 'Take Photo';
        uploader.appendChild(cam);
      }
    } else if (cam) cam.remove();
  };

  // ─── Phase 4 — Richtext ─────────────────────────────────────────────────

  APPLIERS['richtext-style'] = (container, value) => {
    container.classList.remove('wpforms-richtext-style-full', 'wpforms-richtext-style-simple');
    container.classList.add('wpforms-richtext-style-' + String(value || 'full'));
    const toolbar = container.querySelector('.wpforms-richtext-toolbar, .mce-toolbar');
    if (toolbar) {
      // 'simple' shows fewer buttons — we toggle visibility on advanced ones
      const advanced = toolbar.querySelectorAll('.wpforms-richtext-advanced, .mce-btn[data-advanced]');
      advanced.forEach((b) => { b.style.display = value === 'simple' ? 'none' : ''; });
    }
  };

  APPLIERS['richtext-media'] = (container, value) => {
    const btn = container.querySelector('.wpforms-richtext-media, .mce-btn[data-mce-name="image"]');
    if (btn) btn.style.display = value ? '' : 'none';
  };

  // ─── Phase 4 — Repeater ─────────────────────────────────────────────────

  APPLIERS['repeater-display'] = (container, value) => {
    container.classList.remove('wpforms-repeater-display-rows', 'wpforms-repeater-display-grid');
    container.classList.add('wpforms-repeater-display-' + String(value || 'rows'));
  };

  APPLIERS['repeater-button-type'] = (container, value) => {
    const buttons = $$('.wpforms-repeater-button, .wpforms-repeater-add, .wpforms-repeater-remove', container);
    buttons.forEach((b) => {
      b.classList.remove('wpforms-repeater-button-text', 'wpforms-repeater-button-icon');
      b.classList.add('wpforms-repeater-button-' + String(value || 'text'));
    });
  };

  APPLIERS['repeater-button-add-label'] = (container, value) => {
    const add = container.querySelector('.wpforms-repeater-add');
    if (add) add.textContent = String(value || 'Add Row');
  };

  APPLIERS['repeater-button-remove-label'] = (container, value) => {
    $$('.wpforms-repeater-remove', container).forEach((b) => { b.textContent = String(value || 'Remove'); });
  };

  APPLIERS['repeater-rows-limit'] = (container, value) => {
    container.dataset.rowsLimit = String(value || 0);
  };

  // ─── Phase 4 — Layout ───────────────────────────────────────────────────

  APPLIERS['layout-preset'] = (container, value) => {
    container.classList.forEach((c) => {
      if (c.startsWith('wpforms-layout-preset-')) container.classList.remove(c);
    });
    container.classList.add('wpforms-layout-preset-' + String(value || '50-50'));
  };

  APPLIERS['layout-display'] = (container, value) => {
    container.classList.remove('wpforms-layout-display-rows', 'wpforms-layout-display-columns');
    container.classList.add('wpforms-layout-display-' + String(value || 'columns'));
  };

  // ─── Phase 4 — Likert ───────────────────────────────────────────────────

  APPLIERS['likert-style'] = (container, value) => {
    const table = container.querySelector('table');
    if (table) {
      table.classList.remove('modern', 'classic');
      table.classList.add(String(value || 'modern'));
    }
  };

  APPLIERS['likert-single-row'] = (container, value) => {
    container.classList.toggle('wpforms-likert-single-row', !!value);
  };

  APPLIERS['likert-multiple-responses'] = (container, value) => {
    container.classList.toggle('wpforms-likert-multiple-responses', !!value);
    // Switch radios to checkboxes (or back)
    const desiredType = value ? 'checkbox' : 'radio';
    $$('input.wpforms-likert-scale-option', container).forEach((inp) => {
      if (inp.type !== desiredType) {
        // Have to recreate input; type is immutable in some browsers
        const newInp = document.createElement('input');
        newInp.type = desiredType;
        Array.from(inp.attributes).forEach((a) => newInp.setAttribute(a.name, a.value));
        if (value && !newInp.name.endsWith('[]')) newInp.name = newInp.name + '[]';
        else if (!value && newInp.name.endsWith('[]')) newInp.name = newInp.name.slice(0, -2);
        inp.replaceWith(newInp);
      }
    });
  };

  // ─── Phase 4 — NPS ──────────────────────────────────────────────────────

  APPLIERS['nps-edge-labels'] = (container, value, meta) => {
    const which = meta?.edge === 'highest' ? 'extremely-likely' : 'not-likely';
    const span = container.querySelector('.' + which);
    if (span) span.textContent = String(value || '');
  };

  APPLIERS['nps-style'] = (container, value) => {
    const table = container.querySelector('table');
    if (table) {
      table.classList.remove('modern', 'classic');
      table.classList.add(String(value || 'modern'));
    }
  };

  // ─── Phase 4 — Image choices ────────────────────────────────────────────

  APPLIERS['image-choices'] = (container, value) => {
    const ul = container.querySelector(':scope > fieldset > ul, :scope > ul');
    if (!ul) return;
    if (value) {
      ul.classList.add('wpforms-image-choices');
      $$('li', ul).forEach((li) => {
        if (li.querySelector('.wpforms-image-choices-image')) return;
        const lab = li.querySelector('label');
        const labText = lab?.textContent.trim() || '';
        const img = document.createElement('span');
        img.className = 'wpforms-image-choices-image';
        img.innerHTML = '<img alt="" src="data:image/svg+xml;utf8,&lt;svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22%3E&lt;rect width=%22100%25%22 height=%22100%25%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E">';
        li.insertBefore(img, lab);
        if (lab) {
          const labelSpan = document.createElement('span');
          labelSpan.className = 'wpforms-image-choices-label';
          labelSpan.textContent = labText;
          lab.textContent = '';
          lab.appendChild(labelSpan);
        }
      });
    } else {
      ul.classList.remove('wpforms-image-choices', 'wpforms-image-choices-classic', 'wpforms-image-choices-modern', 'wpforms-image-choices-none');
      $$('.wpforms-image-choices-image', ul).forEach((s) => s.remove());
      $$('.wpforms-image-choices-label', ul).forEach((s) => {
        const parent = s.parentElement;
        if (parent) {
          parent.textContent = s.textContent;
        }
      });
    }
  };

  APPLIERS['image-choices-style'] = (container, value) => {
    const ul = container.querySelector(':scope > fieldset > ul, :scope > ul');
    if (!ul) return;
    ul.classList.remove('wpforms-image-choices-classic', 'wpforms-image-choices-modern', 'wpforms-image-choices-none');
    ul.classList.add('wpforms-image-choices-' + String(value || 'classic'));
  };

  // ─── Phase 4 — Icon choices ─────────────────────────────────────────────

  APPLIERS['icon-choices'] = (container, value) => {
    const ul = container.querySelector(':scope > fieldset > ul, :scope > ul');
    if (!ul) return;
    if (value) {
      ul.classList.add('wpforms-icon-choices');
      $$('li', ul).forEach((li) => {
        if (li.querySelector('.wpforms-icon-choices-icon')) return;
        const lab = li.querySelector('label');
        const labText = lab?.textContent.trim() || '';
        const icon = document.createElement('span');
        icon.className = 'wpforms-icon-choices-icon';
        icon.innerHTML = '<i class="fa fa-star"></i>';
        li.insertBefore(icon, lab);
        if (lab) {
          const labelSpan = document.createElement('span');
          labelSpan.className = 'wpforms-icon-choices-label';
          labelSpan.textContent = labText;
          lab.textContent = '';
          lab.appendChild(labelSpan);
        }
      });
    } else {
      ul.classList.remove('wpforms-icon-choices');
      $$('.wpforms-icon-choices-icon', ul).forEach((s) => s.remove());
      $$('.wpforms-icon-choices-label', ul).forEach((s) => {
        const parent = s.parentElement;
        if (parent) parent.textContent = s.textContent;
      });
    }
  };

  APPLIERS['icon-choices-style'] = (container, value) => {
    container.classList.remove('wpforms-icon-choices-style-default', 'wpforms-icon-choices-style-modern');
    container.classList.add('wpforms-icon-choices-style-' + String(value || 'default'));
  };

  APPLIERS['icon-choices-color'] = (container, value) => {
    $$('.wpforms-icon-choices-icon i, .wpforms-icon-choices-icon svg', container).forEach((el) => {
      el.style.color = String(value || '#066aab');
    });
  };

  APPLIERS['icon-choices-size'] = (container, value) => {
    const px = ({ small: 24, medium: 36, large: 48 })[value] || parseInt(value, 10) || 36;
    $$('.wpforms-icon-choices-icon i, .wpforms-icon-choices-icon svg', container).forEach((el) => {
      el.style.fontSize = px + 'px';
      el.style.width = px + 'px';
      el.style.height = px + 'px';
    });
  };

  // ─── Phase 4 — Signature ink color ──────────────────────────────────────

  APPLIERS['signature-ink-color'] = (container, value) => {
    const canvas = container.querySelector('.wpforms-signature-canvas');
    if (!canvas) return;
    canvas.dataset.color = String(value || '#000000');
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.strokeStyle = String(value || '#000000');
  };

  // ─── Phase 4 — Password strength ────────────────────────────────────────

  APPLIERS['password-strength'] = (container, value) => {
    container.classList.toggle('wpforms-password-strength', !!value);
    let bar = container.querySelector('.wpforms-password-strength-indicator');
    if (value) {
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'wpforms-password-strength-indicator';
        bar.innerHTML = '<div class="wpforms-password-strength-bar"></div><span class="wpforms-password-strength-level">Strength</span>';
        container.appendChild(bar);
      }
    } else if (bar) bar.remove();
  };

  // ─── Phase 4 — Checkbox disclaimer ──────────────────────────────────────

  APPLIERS['checkbox-disclaimer'] = (container, value) => {
    const fieldset = container.querySelector('fieldset');
    if (!fieldset) return;
    fieldset.classList.toggle('wpforms-checkbox-disclaimer-format', !!value);
  };

})();
