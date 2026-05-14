/**
 * snapshots/_shared/interactivity.js
 *
 * Real native-feeling interactivity baked into snapshots. Capture strips all
 * scripts; this is the deliberate, deterministic re-add.
 *
 * Architecture:
 *   - Intercept clicks on <select> inside option panels — render a custom
 *     HTML overlay (since OS-drawn native popovers can't be visually driven
 *     by a synthetic cursor in production renders).
 *   - When the user picks an option, set select.value + dispatch change.
 *   - Listeners on 'change' watch for known transitions (by selector pattern,
 *     not by snapshot) and perform the canvas mirror updates the live
 *     plugin would do.
 *
 * Determinism: no Date.now(), no Math.random(), no fetch, no timers.
 * Pure event listeners + synchronous DOM mutations.
 *
 * Adding a new transition = add one entry to TRANSITIONS below, keyed by
 * the option select's ID pattern. Each handler reads select.value, finds
 * the relevant canvas element, and applies the mutations.
 */
(function () {
  'use strict';

  // ─── Custom dropdown overlay for native <select> ────────────────────────

  let activeOverlay = null;

  function closeOverlay() {
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }
  }

  function openOverlay(select) {
    closeOverlay();
    const rect = select.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'wpf-snap-dropdown';
    Object.assign(overlay.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.bottom + 'px',
      width: rect.width + 'px',
      background: '#ffffff',
      border: '1px solid #8c8f94',
      borderTop: 'none',
      borderRadius: '0',
      boxShadow: 'none',
      zIndex: '999999',
      maxHeight: '300px',
      overflowY: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4',
      padding: '0',
      opacity: '0',
      transform: 'translateY(-6px)',
      transition: 'opacity 180ms ease-out, transform 180ms ease-out',
      transformOrigin: 'top',
    });

    const items = [];
    let hoveredValue = null;

    function paint() {
      items.forEach((it) => {
        const v = it.dataset.value;
        const blue =
          hoveredValue === v ||
          (hoveredValue === null && v === select.value);
        it.style.background = blue ? '#2271b1' : '#ffffff';
        it.style.color = blue ? '#ffffff' : '#2c3338';
      });
    }

    Array.from(select.options).forEach((opt) => {
      const item = document.createElement('div');
      item.className = 'wpf-snap-dropdown-item';
      item.textContent = opt.textContent;
      item.dataset.value = opt.value;
      Object.assign(item.style, {
        padding: '4px 8px',
        cursor: 'pointer',
        fontWeight: '400',
      });
      item.addEventListener('mouseenter', () => {
        hoveredValue = opt.value;
        paint();
      });
      item.addEventListener('mousedown', (e) => {
        // mousedown (not click) so we fire before the document-level
        // outside-click handler closes the overlay first.
        e.preventDefault();
        e.stopPropagation();
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closeOverlay();
      });
      items.push(item);
      overlay.appendChild(item);
    });

    overlay.addEventListener('mouseleave', () => {
      hoveredValue = null;
      paint();
    });

    paint();

    document.body.appendChild(overlay);
    activeOverlay = overlay;
    // Animate in on next frame so the initial styles paint first.
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0)';
    });
  }

  // Only intercept selects we want to make interactive. The selects inside
  // the field-options sidebar are the target set; we whitelist by their
  // option-panel ancestor.
  function isInteractiveSelect(el) {
    if (!(el instanceof HTMLSelectElement)) return false;
    return !!el.closest('.wpforms-field-option');
  }

  document.addEventListener(
    'mousedown',
    (e) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && isInteractiveSelect(t)) {
        // Prevent native OS-drawn popover; render our own overlay instead.
        e.preventDefault();
        openOverlay(t);
        return;
      }
      // Outside-click closes the active overlay.
      if (activeOverlay && !activeOverlay.contains(t)) {
        closeOverlay();
      }
    },
    true /* capture, so we intercept before native popover opens */,
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });

  // ─── Canvas-mutation helper: fade out, apply, fade back in ───────────────
  // Disguises the layout snap that happens when sub-block visibility flips.
  // ~360ms total. Determinism-safe: sync DOM mutation, CSS-driven easing.

  function fadeSwap(el, mutateFn, duration = 180) {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
    setTimeout(() => {
      mutateFn();
      el.style.transition = `opacity ${duration}ms ease-in`;
      el.style.opacity = '1';
      setTimeout(() => {
        el.style.transition = '';
      }, duration + 20);
    }, duration);
  }

  // ─── Field lookup helpers ────────────────────────────────────────────────

  function getFieldId(el) {
    const row = el.closest('.wpforms-field-option-row');
    return row?.dataset.fieldId ?? null;
  }

  function getField(el) {
    const id = getFieldId(el);
    return id ? document.getElementById(`wpforms-field-${id}`) : null;
  }

  function getFieldType(el) {
    return getField(el)?.dataset.fieldType ?? null;
  }

  // Re-render a number-slider hint by splicing the current value into the
  // data-hint template at the {value} marker, wrapped in <b>. Uses DOM
  // construction (not innerHTML) so user-supplied templates can't inject
  // markup.
  // Show/hide a panel option row by toggling the wpforms-hidden class.
  // Used by File Upload's access-restrictions and camera-enabled cascades
  // (and any other reveal-sub-rows transition).
  function toggleRow(rowId, visible) {
    const row = document.getElementById(rowId);
    if (row) row.classList.toggle('wpforms-hidden', !visible);
  }

  // Serialize a Smart Tags widget's children to a plain text representation
  //   for canvas mirroring: pill spans become `{value}`, text nodes are
  //   kept verbatim. Trims trailing whitespace.
  function serializeSmartTagsWidget(widget) {
    if (!widget) return '';
    let out = '';
    widget.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.nodeValue || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('tag') && node.dataset.value) {
          out += `{${node.dataset.value}}`;
        } else {
          out += node.textContent || '';
        }
      }
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  // Sample fields for the Conditional Logic field-select. In the live
  // plugin this is populated from the form's other eligible fields, but
  // snapshots are single-field — so we mock a representative set covering
  // both text-based and choice-based field types.
  const CL_SAMPLE_FIELDS = [
    { id: 18, type: 'text',                 label: 'Single Line Text' },
    { id: 19, type: 'textarea',             label: 'Paragraph Text' },
    { id: 20, type: 'email',                label: 'Email' },
    { id: 21, type: 'url',                  label: 'Website / URL' },
    { id: 22, type: 'number',               label: 'Numbers' },
    { id: 23, type: 'number-slider',        label: 'Number Slider' },
    { id: 24, type: 'radio',                label: 'Multiple Choice' },
    { id: 25, type: 'checkbox',             label: 'Checkboxes' },
    { id: 26, type: 'select',               label: 'Dropdown' },
    { id: 27, type: 'payment-multiple',     label: 'Multiple Items' },
    { id: 28, type: 'payment-checkbox',     label: 'Checkbox Items' },
    { id: 29, type: 'payment-select',       label: 'Dropdown Items' },
    { id: 30, type: 'hidden',               label: 'Hidden Field' },
    { id: 31, type: 'rating',               label: 'Rating' },
    { id: 32, type: 'net_promoter_score',   label: 'Net Promoter Score' },
  ];

  const CL_CHOICE_TYPES = new Set([
    'radio', 'checkbox', 'select',
    'payment-multiple', 'payment-checkbox', 'payment-select',
    'rating',
  ]);
  const CL_NUMBER_TYPES = new Set(['number', 'number-slider', 'net_promoter_score']);

  // Sample choices keyed by field type for the value-select.
  function getSampleChoices(type) {
    if (type === 'rating') {
      return ['1', '2', '3', '4', '5'];
    }
    if (type === 'net_promoter_score') {
      return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    }
    return ['First Choice', 'Second Choice', 'Third Choice'];
  }

  // Build the value cell content based on field type + operator. Returns
  // an HTML string (rendered into the `<td class="value">` cell).
  function buildConditionalValueCellHTML(fieldId, groupIndex, ruleIndex, fieldType, operator) {
    const name = `fields[${fieldId}][conditionals][${groupIndex}][${ruleIndex}][value]`;
    // empty / not empty operators don't need a value.
    if (operator === 'e' || operator === '!e') {
      return `<input type="text" name="${name}" class="wpforms-conditional-value" disabled placeholder="(no value needed)">`;
    }
    // Contains / starts / ends always use a text input regardless of type.
    if (operator === 'c' || operator === '!c' || operator === '^' || operator === '~') {
      return `<input type="text" name="${name}" class="wpforms-conditional-value" placeholder="value">`;
    }
    // Greater than / less than always use a number input.
    if (operator === '>' || operator === '<') {
      return `<input type="number" name="${name}" class="wpforms-conditional-value" placeholder="value">`;
    }
    // is / is not: choice-based -> select with sample choices; otherwise
    //   number input for numeric fields, plain text input for text-based.
    if (!fieldType) {
      // No field picked yet — placeholder select like the live plugin.
      return `<select name="${name}" class="wpforms-conditional-value"><option value="">--- Select Choice ---</option></select>`;
    }
    if (CL_CHOICE_TYPES.has(fieldType)) {
      const opts = getSampleChoices(fieldType)
        .map((c) => `<option value="${c}">${c}</option>`)
        .join('');
      return `<select name="${name}" class="wpforms-conditional-value"><option value="">--- Select Choice ---</option>${opts}</select>`;
    }
    if (CL_NUMBER_TYPES.has(fieldType)) {
      return `<input type="number" name="${name}" class="wpforms-conditional-value" placeholder="value">`;
    }
    return `<input type="text" name="${name}" class="wpforms-conditional-value" placeholder="value">`;
  }

  // Build a Conditional Logic rule row matching the live plugin markup,
  // populated with the sample fields list.
  function buildConditionalLogicRow(fieldId, groupIndex, ruleIndex) {
    const row = document.createElement('tr');
    row.className = 'wpforms-conditional-row';
    row.dataset.fieldId = String(fieldId);
    row.dataset.inputName = `fields[${fieldId}]`;
    const fieldOpts = CL_SAMPLE_FIELDS.map(
      (f) => `<option value="${f.id}" data-type="${f.type}">${f.label}</option>`,
    ).join('');
    row.innerHTML = [
      '<td class="field">',
        `<select name="fields[${fieldId}][conditionals][${groupIndex}][${ruleIndex}][field]" class="wpforms-conditional-field" data-groupid="${groupIndex}" data-ruleid="${ruleIndex}">`,
          '<option value="">--- Select Field ---</option>',
          fieldOpts,
        '</select>',
      '</td>',
      '<td class="operator">',
        `<select name="fields[${fieldId}][conditionals][${groupIndex}][${ruleIndex}][operator]" class="wpforms-conditional-operator">`,
          '<option value="==">is</option>',
          '<option value="!=">is not</option>',
          '<option value="e">empty</option>',
          '<option value="!e">not empty</option>',
          '<option value="c">contains</option>',
          '<option value="!c">does not contain</option>',
          '<option value="^">starts with</option>',
          '<option value="~">ends with</option>',
          '<option value="&gt;">greater than</option>',
          '<option value="&lt;">less than</option>',
        '</select>',
      '</td>',
      '<td class="value">',
        buildConditionalValueCellHTML(fieldId, groupIndex, ruleIndex, '', '=='),
      '</td>',
      '<td class="actions">',
        '<button class="wpforms-conditional-rule-add wpforms-btn wpforms-btn-sm wpforms-btn-blue" title="Create new rule">And</button>',
        '<button class="wpforms-conditional-rule-delete" title="Delete rule"><i class="fa fa-trash-o" aria-hidden="true"></i></button>',
      '</td>',
    ].join('');
    return row;
  }

  // Build a Conditional Logic group: table of rule rows (AND) + an "or"
  // separator between groups.
  function buildConditionalLogicGroup(fieldId, groupIndex) {
    const group = document.createElement('div');
    group.className = 'wpforms-conditional-group';
    group.dataset.reference = String(fieldId);
    group.dataset.groupIndex = String(groupIndex);
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    tbody.appendChild(buildConditionalLogicRow(fieldId, groupIndex, 0));
    table.appendChild(tbody);
    group.appendChild(table);
    const or = document.createElement('h5');
    or.textContent = 'or';
    group.appendChild(or);
    return group;
  }

  // Build the full Conditionals UI. Reads data-reference (field id) and
  // data-actions JSON from the toggle.
  function buildConditionalLogicGroups(toggle) {
    const fieldId = toggle.getAttribute('data-reference') || toggle.id.match(/\d+/)?.[0] || '';
    const wrap = document.createElement('div');
    wrap.className = 'wpforms-conditional-groups wpforms-undo-redo-container';
    wrap.id = `wpforms-conditional-groups-fields-${fieldId}`;
    let actions = { show: 'Show', hide: 'Hide' };
    try {
      const parsed = JSON.parse(toggle.getAttribute('data-actions') || '{}');
      if (parsed.show) actions = parsed;
    } catch {}
    const desc = toggle.getAttribute('data-action-desc') || 'this field if';
    const h4 = document.createElement('h4');
    h4.innerHTML = [
      `<select name="fields[${fieldId}][conditional_type]">`,
        `<option value="show">${actions.show}</option>`,
        `<option value="hide">${actions.hide}</option>`,
      '</select>',
      ` ${desc}`,
    ].join('');
    wrap.appendChild(h4);
    wrap.appendChild(buildConditionalLogicGroup(fieldId, 0));
    const addBtn = document.createElement('button');
    addBtn.className = 'wpforms-conditional-groups-add wpforms-btn wpforms-btn-sm wpforms-btn-blue';
    addBtn.textContent = 'Add New Group';
    wrap.appendChild(addBtn);
    return wrap;
  }

  // Open the browser's native color picker anchored to the minicolors
  // swatch. Mounts the input on document.body (not inside the swatch,
  // because the swatch is inline and 0×0 wouldn't anchor anything) and
  // positions it over the swatch using fixed coords each call.
  function ensureNativeColorInput(row, defaultColor) {
    const swatch = row.querySelector('.minicolors-swatch');
    const textInput = row.querySelector('input.minicolors-input');
    if (!swatch || !textInput) return null;
    const rect = swatch.getBoundingClientRect();
    let native = row._wpfSnapColorNative;
    if (!native || !native.isConnected) {
      // Create AND position before insertion so the very first click finds
      // the input already at the right coords (no pre-layout flash at 0,0).
      native = document.createElement('input');
      native.type = 'color';
      Object.assign(native.style, {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 16)}px`,
        height: `${Math.max(rect.height, 16)}px`,
        opacity: '0',
        border: 'none',
        padding: '0',
        margin: '0',
        background: 'transparent',
      });
      document.body.appendChild(native);
      native.addEventListener('input', () => {
        textInput.value = native.value;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      row._wpfSnapColorNative = native;
    } else {
      // Reposition over the swatch (handles scroll / resize between calls).
      native.style.top = `${rect.top}px`;
      native.style.left = `${rect.left}px`;
      native.style.width = `${Math.max(rect.width, 16)}px`;
      native.style.height = `${Math.max(rect.height, 16)}px`;
    }
    native.value = (textInput.value || defaultColor).trim();
    // Force layout flush so the browser uses the final coords when click()
    // dispatches the picker. Without this, first-click can anchor stale.
    void native.offsetHeight;
    return native;
  }

  // Re-render the canvas <ul.primary-input> based on its current mode
  // classes (wpforms-image-choices / wpforms-icon-choices). Image/Icon
  // modes need richer per-li markup than the bare `<input> Label` shape;
  // mode classes live on the ul itself (not the field div), matching the
  // live plugin output. Called from the image/icon toggle handlers and
  // from the resync transitions on choice mutations.
  // Placeholder SVG path is relative to each snapshot's index.html.
  const IMAGE_PLACEHOLDER_SRC = '../_shared/assets/placeholder-200x125.svg';
  function renderCanvasChoices(field) {
    const fieldId = field.dataset.fieldId;
    const fieldType = field.dataset.fieldType;
    if (!fieldId) return;
    const optionUl = document.getElementById(
      `wpforms-field-option-${fieldId}-choices-list`,
    );
    const canvasUl = field.querySelector('ul.primary-input');
    if (!optionUl || !canvasUl) return;
    const isImage = canvasUl.classList.contains('wpforms-image-choices');
    const isIcon = canvasUl.classList.contains('wpforms-icon-choices');
    // payment-multiple uses radio inputs on canvas (single-select).
    const radioLike = fieldType === 'radio' || fieldType === 'payment-multiple';
    const inputType = radioLike ? 'radio' : 'checkbox';
    const newLis = [];
    Array.from(optionUl.children).forEach((optionLi) => {
      const labelInput = optionLi.querySelector('input.label');
      const defaultInput = optionLi.querySelector('input.default');
      const labelText = (labelInput && labelInput.value) || '';
      const checked = !!(defaultInput && defaultInput.checked);
      const li = document.createElement('li');
      if (isImage) {
        li.className = 'wpforms-image-choices-item';
        if (checked) li.classList.add('wpforms-selected');
        const lbl = document.createElement('label');
        const imgWrap = document.createElement('span');
        imgWrap.className = 'wpforms-image-choices-image';
        const img = document.createElement('img');
        img.src = IMAGE_PLACEHOLDER_SRC;
        img.alt = labelText;
        img.title = labelText;
        imgWrap.appendChild(img);
        const input = document.createElement('input');
        input.className = 'wpforms-screen-reader-element';
        input.type = inputType;
        input.readOnly = true;
        input.checked = checked;
        const lblText = document.createElement('span');
        lblText.className = 'wpforms-image-choices-label';
        lblText.textContent = labelText;
        lbl.appendChild(imgWrap);
        lbl.appendChild(input);
        lbl.appendChild(lblText);
        li.appendChild(lbl);
      } else if (isIcon) {
        li.className = 'wpforms-icon-choices-item';
        if (checked) li.classList.add('wpforms-selected');
        const lbl = document.createElement('label');
        const iconWrap = document.createElement('span');
        iconWrap.className = 'wpforms-icon-choices-icon';
        // Mirror panel's <i>, but strip ic-fa-preview (canvas omits it).
        const sourceI = optionLi.querySelector('.wpforms-icon-select i.ic-fa-preview');
        const iconEl = document.createElement('i');
        const src = (sourceI && sourceI.className) || 'ic-fa-preview ic-fa-regular ic-fa-face-smile';
        iconEl.className = src.split(/\s+/).filter((c) => c && c !== 'ic-fa-preview').join(' ');
        // Icon <i> first, then bg span (matches live order).
        iconWrap.appendChild(iconEl);
        const iconBg = document.createElement('span');
        iconBg.className = 'wpforms-icon-choices-icon-bg';
        iconWrap.appendChild(iconBg);
        const input = document.createElement('input');
        input.className = 'wpforms-screen-reader-element';
        input.type = inputType;
        input.readOnly = true;
        input.checked = checked;
        const lblText = document.createElement('span');
        lblText.className = 'wpforms-icon-choices-label';
        lblText.textContent = labelText;
        lbl.appendChild(iconWrap);
        lbl.appendChild(input);
        lbl.appendChild(lblText);
        li.appendChild(lbl);
      } else {
        const input = document.createElement('input');
        input.type = inputType;
        input.readOnly = true;
        input.checked = checked;
        li.appendChild(input);
        li.appendChild(document.createTextNode(' ' + labelText));
      }
      newLis.push(li);
    });
    canvasUl.replaceChildren(...newLis);
    // For payment-choice field types, re-apply the Show Price After Labels
    // suffix to the freshly-built canvas labels (image / icon / plain).
    if (isPaymentChoiceField(field)) renderPaymentChoiceLabels(field);
  }

  // When min/max changes, clamp the default value in/out of range and
  // sync the slider thumb + hint. Mirrors the plugin's
  // updateNumberSliderDefaultValueAttr behavior.
  function clampSliderDefault(fieldId, bound, which) {
    const defaultInput = document.getElementById(
      `wpforms-field-option-${fieldId}-default_value`,
    );
    if (!defaultInput) return;
    defaultInput.setAttribute(which, bound);
    const currentDefault = parseFloat(defaultInput.value);
    const boundNum = parseFloat(bound);
    if (Number.isNaN(currentDefault) || Number.isNaN(boundNum)) return;
    const needsClamp =
      (which === 'min' && currentDefault < boundNum) ||
      (which === 'max' && boundNum < currentDefault);
    if (!needsClamp) return;
    defaultInput.value = String(boundNum);
    const field = document.getElementById(`wpforms-field-${fieldId}`);
    const slider = field?.querySelector('input[type="range"].wpforms-number-slider');
    const hint = field?.querySelector('.wpforms-number-slider-hint');
    if (slider) slider.value = String(boundNum);
    if (hint) renderSliderHint(hint, String(boundNum));
  }

  function renderSliderHint(hintEl, value) {
    const template = hintEl.dataset.hint || '';
    hintEl.textContent = '';
    const parts = template.split('{value}');
    parts.forEach((part, i) => {
      hintEl.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        const b = document.createElement('b');
        b.textContent = String(value);
        hintEl.appendChild(b);
      }
    });
  }

  // Rebuild the Likert canvas <table> from current option-panel state.
  // Ports the plugin's tmpl-wpforms-likert-scale-preview (LikertScale/Field.php).
  // Reads: rows list, columns list, single_row, multiple_responses, style.
  function renderLikertCanvas(field) {
    const fieldId = field.id?.replace('wpforms-field-', '');
    if (!fieldId) return;
    const rowsUl = document.querySelector(
      `#wpforms-field-option-row-${fieldId}-rows .choices-list`,
    );
    const colsUl = document.querySelector(
      `#wpforms-field-option-row-${fieldId}-columns .choices-list`,
    );
    if (!rowsUl || !colsUl) return;
    const singleRow = document.getElementById(
      `wpforms-field-option-${fieldId}-single_row`,
    )?.checked || false;
    const inputType = document.getElementById(
      `wpforms-field-option-${fieldId}-multiple_responses`,
    )?.checked ? 'checkbox' : 'radio';
    const style = document.getElementById(
      `wpforms-field-option-${fieldId}-style`,
    )?.value || 'modern';
    const cols = Array.from(colsUl.children).map((li) => ({
      value: li.querySelector('input')?.value || '',
    }));
    const rows = Array.from(rowsUl.children).map((li) => ({
      value: li.querySelector('input')?.value || '',
    }));
    const colCount = cols.length || 1;
    const width = singleRow ? 100 / colCount : 80 / colCount;
    const table = document.createElement('table');
    table.className = singleRow ? `${style} single-row` : style;
    const thead = document.createElement('thead');
    const headTr = document.createElement('tr');
    if (!singleRow) {
      const spacerTh = document.createElement('th');
      spacerTh.style.width = '20%';
      headTr.appendChild(spacerTh);
    }
    for (const col of cols) {
      const th = document.createElement('th');
      th.style.width = `${width}%`;
      th.textContent = col.value;
      headTr.appendChild(th);
    }
    thead.appendChild(headTr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const renderRows = singleRow ? rows.slice(0, 1) : rows;
    for (const row of renderRows) {
      const tr = document.createElement('tr');
      if (!singleRow) {
        const rowTh = document.createElement('th');
        rowTh.textContent = row.value;
        tr.appendChild(rowTh);
      }
      for (let i = 0; i < cols.length; i++) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = inputType;
        input.readOnly = true;
        td.appendChild(input);
        td.appendChild(document.createElement('label'));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const existing = field.querySelector('table');
    if (existing) {
      fadeSwap(existing, () => existing.replaceWith(table));
    } else {
      // No existing table — just insert before description.
      const desc = field.querySelector('.description');
      if (desc) desc.before(table);
      else field.appendChild(table);
    }
  }

  // ─── Payment field helpers ──────────────────────────────────────────────
  // Used by payment-single + payment-checkbox + payment-multiple +
  // payment-select + payment-coupon transitions. Each helper reads the
  // option-panel state for a single field and writes the canvas.

  function _money(val) {
    const n = parseFloat(val);
    return '$' + (Number.isFinite(n) ? n : 0).toFixed(2);
  }

  function isPaymentChoiceField(field) {
    return !!field && (
      field.classList.contains('wpforms-field-payment-checkbox') ||
      field.classList.contains('wpforms-field-payment-multiple') ||
      field.classList.contains('wpforms-field-payment-select')
    );
  }

  function renderPaymentChoiceLabels(field) {
    const fid = field.dataset.fieldId;
    const ul = document.getElementById(`wpforms-field-option-${fid}-choices-list`);
    if (!ul) return;
    const showPriceCb = document.getElementById(
      `wpforms-field-option-${fid}-show_price_after_labels`,
    );
    const showPrice = showPriceCb?.checked || false;
    const labels = Array.from(ul.children).map((li) => {
      const label = li.querySelector('input.label')?.value || '';
      const price = li.querySelector('input.value')?.value || '';
      if (!showPrice || !price) return label;
      const priceNum = parseFloat(price);
      if (!Number.isFinite(priceNum)) return label;
      return `${label} - $${priceNum.toFixed(2)}`;
    });
    const canvasSelect = field.querySelector('select.primary-input');
    if (canvasSelect) {
      const offset = canvasSelect.querySelector('option[data-placeholder="1"]') ? 1 : 0;
      labels.forEach((text, i) => {
        const opt = canvasSelect.children[i + offset];
        if (opt) { opt.textContent = text; opt.value = text; }
      });
      return;
    }
    const canvasUl = field.querySelector('ul.primary-input');
    if (!canvasUl) return;
    const isImageMode = canvasUl.classList.contains('wpforms-image-choices');
    const isIconMode = canvasUl.classList.contains('wpforms-icon-choices');
    labels.forEach((text, i) => {
      const canvasLi = canvasUl.children[i];
      if (!canvasLi) return;
      if (isImageMode) {
        const span = canvasLi.querySelector('.wpforms-image-choices-label');
        if (span) span.textContent = text;
        return;
      }
      if (isIconMode) {
        const span = canvasLi.querySelector('.wpforms-icon-choices-label');
        if (span) span.textContent = text;
        return;
      }
      // Plain mode: rewrite the trailing text node (leaves input untouched).
      let textNode = canvasLi.lastChild;
      while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
        textNode = textNode.previousSibling;
      }
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.nodeValue = ' ' + text;
      } else {
        canvasLi.appendChild(document.createTextNode(' ' + text));
      }
    });
  }

  function renderPaymentSinglePrice(field) {
    const fid = field.dataset.fieldId;
    const val = document.getElementById(`wpforms-field-option-${fid}-price`)?.value || '';
    field
      .querySelectorAll('.price-label .price')
      .forEach((s) => { s.textContent = _money(val); });
  }

  function renderPaymentSinglePriceLabel(field) {
    const fid = field.dataset.fieldId;
    const template = document.getElementById(
      `wpforms-field-option-${fid}-price_label`,
    )?.value || 'Price: {price}';
    const priceVal = document.getElementById(
      `wpforms-field-option-${fid}-price`,
    )?.value || '';
    const priceLabel = field.querySelector('.price-label');
    if (!priceLabel) return;
    const parts = template.split('{price}');
    priceLabel.textContent = '';
    parts.forEach((part, i) => {
      priceLabel.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        const span = document.createElement('span');
        span.className = 'price';
        span.textContent = _money(priceVal);
        priceLabel.appendChild(span);
      }
    });
  }

  function renderPaymentSingleMinPrice(field) {
    const fid = field.dataset.fieldId;
    const val = document.getElementById(
      `wpforms-field-option-${fid}-min_price`,
    )?.value || '';
    const span = field.querySelector('.item-min-price .min-price');
    if (span) span.textContent = _money(val);
  }

  function renderPaymentSingleFormat(field) {
    const fid = field.dataset.fieldId;
    const fmt = document.getElementById(`wpforms-field-option-${fid}-format`)?.value || 'single';
    const set = (selOrEl, on) => {
      const el = typeof selOrEl === 'string' ? field.querySelector(selOrEl) : selOrEl;
      if (el) el.classList.toggle('wpforms-hidden', !on);
    };
    const defaultP = field.querySelector('.item-price.item-price-single');
    const hiddenP = field.querySelector('.item-price.item-price-hidden');
    const userBlock = field.querySelector('.single-item-user-defined-block');
    const note = field.querySelector('.item-price-hidden-note');
    const minPrice = field.querySelector('.item-min-price');
    const minPriceRow = document.getElementById(`wpforms-field-option-row-${fid}-min_price`);
    const placeholderRow = document.getElementById(`wpforms-field-option-row-${fid}-placeholder`);
    const priceLabelRow = document.getElementById(`wpforms-field-option-row-${fid}-price_label`);
    if (fmt === 'single') {
      set(defaultP, true);
      set(hiddenP, false);
      set(userBlock, false);
      set(note, false);
      set(minPrice, false);
      set(minPriceRow, false);
      set(placeholderRow, false);
      set(priceLabelRow, true);
    } else if (fmt === 'user') {
      set(defaultP, false);
      set(hiddenP, false);
      set(userBlock, true);
      set(note, false);
      set(minPrice, true);
      set(minPriceRow, true);
      set(placeholderRow, true);
      set(priceLabelRow, false);
    } else if (fmt === 'hidden') {
      set(defaultP, false);
      set(hiddenP, true);
      set(userBlock, false);
      set(note, true);
      set(minPrice, false);
      set(minPriceRow, false);
      set(placeholderRow, false);
      set(priceLabelRow, false);
    }
  }

  function renderPaymentEnableQuantity(field) {
    const fid = field.dataset.fieldId;
    const on = document.getElementById(`wpforms-field-option-${fid}-enable_quantity`)?.checked || false;
    const quantityRow = document.getElementById(`wpforms-field-option-row-${fid}-quantity`);
    if (quantityRow) quantityRow.classList.toggle('wpforms-hidden', !on);
    const quantitySelect = field.querySelector('select.quantity-input');
    if (quantitySelect) quantitySelect.classList.toggle('wpforms-hidden', !on);
    // payment-select / payment-single: match the live plugin convention by
    // toggling .payment-quantity-enabled on the field. Snapshot CSS already
    // floats select.quantity-input (width:70px) + sizes .choices wrappers
    // for the main select. We don't ship a .choices wrapper on the canvas,
    // so the main bare <select> needs an inline float+width to leave room
    // for the floated quantity-input.
    field.classList.toggle('payment-quantity-enabled', on);
    if (field.classList.contains('wpforms-field-payment-select')) {
      const mainSelect = field.querySelector('select.primary-input');
      if (mainSelect) {
        if (on) {
          mainSelect.style.float = 'inline-start';
          mainSelect.style.boxSizing = 'border-box';
        } else {
          mainSelect.style.float = '';
          mainSelect.style.width = '';
          mainSelect.style.boxSizing = '';
        }
      }
    }
  }

  // Sample coupons themed for Sullie's bakery, matching the dynamic-choices
  // pattern. Oliver Norton kept (matches Umair's reference image).
  const SAMPLE_COUPONS = [
    { value: '1', text: 'Oliver Norton' },
    { value: '2', text: 'BIRTHDAY10' },
    { value: '3', text: 'SUMMER20' },
    { value: '4', text: 'WELCOME15' },
    { value: '5', text: 'BAKERY25' },
  ];

  // Coupon helpers scope to the option-panel row (.choices__* markup lives
  // there, not on the canvas field).
  function _couponRow(fid) {
    return document.getElementById(`wpforms-field-option-row-${fid}-allowed_coupons`);
  }

  function initCouponField(field) {
    const fid = field.dataset.fieldId;
    const row = _couponRow(fid);
    const select = document.getElementById(`wpforms-field-option-${fid}-allowed_coupons`);
    if (!row || !select) return;
    select.innerHTML = '';
    SAMPLE_COUPONS.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.text;
      select.appendChild(opt);
    });
    const dropdownList = row.querySelector(
      '.choices__list--dropdown .choices__list[role="listbox"]',
    );
    if (dropdownList) {
      dropdownList.innerHTML = '';
      SAMPLE_COUPONS.forEach((c, i) => {
        const div = document.createElement('div');
        div.id = `choices--wpforms-field-option-${fid}-allowed_coupons-item-choice-${i + 1}`;
        div.className = 'choices__item choices__item--choice choices__item--selectable';
        div.setAttribute('role', 'option');
        div.setAttribute('data-choice', '');
        div.setAttribute('data-id', String(i + 1));
        div.setAttribute('data-value', c.value);
        div.setAttribute('data-select-text', 'Press to select');
        div.setAttribute('data-choice-selectable', '');
        div.textContent = c.text;
        dropdownList.appendChild(div);
      });
    }
    // No pill pre-selected — user adds via the dropdown.
  }

  function addCouponPill(field, value, text) {
    const fid = field.dataset.fieldId;
    const row = _couponRow(fid);
    const select = document.getElementById(`wpforms-field-option-${fid}-allowed_coupons`);
    if (!row || !select) return;
    const opt = Array.from(select.options).find((o) => o.value === value);
    if (opt) opt.selected = true;
    const pillList = row.querySelector('.choices__list--multiple');
    if (!pillList) return;
    if (pillList.querySelector(`[data-value="${value}"]`)) return;
    const pill = document.createElement('div');
    pill.className = 'choices__item choices__item--selectable';
    pill.setAttribute('data-item', '');
    pill.setAttribute('data-id', value);
    pill.setAttribute('data-value', value);
    pill.setAttribute('data-deletable', '');
    pill.setAttribute('aria-selected', 'true');
    pill.textContent = text;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choices__button';
    btn.setAttribute('aria-label', `Remove item: '${text}'`);
    btn.setAttribute('data-button', '');
    btn.textContent = 'Remove item';
    pill.appendChild(btn);
    pillList.appendChild(pill);
    const alert = row.querySelector('.wpforms-alert-warning');
    if (alert) alert.style.display = 'none';
  }

  function removeCouponPill(field, value) {
    const fid = field.dataset.fieldId;
    const row = _couponRow(fid);
    const select = document.getElementById(`wpforms-field-option-${fid}-allowed_coupons`);
    const opt = Array.from(select?.options || []).find((o) => o.value === value);
    if (opt) opt.selected = false;
    const pillList = row?.querySelector('.choices__list--multiple');
    pillList?.querySelector(`[data-value="${value}"]`)?.remove();
    if (pillList && !pillList.children.length) {
      const alert = row.querySelector('.wpforms-alert-warning');
      if (alert) alert.style.display = '';
    }
  }

  // ─── Transition registry ────────────────────────────────────────────────
  // Each transition declares the event it listens on, a match predicate,
  // and an apply function that mirrors what the plugin's JS would do.

  const TRANSITIONS = [
    // ─ Universal: Label text (input event, not change) ──────────────────
    // Plugin: .wpforms-field-option-row-label input -> field > .label-title .text
    {
      label: 'universal-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-label, .wpforms-field-option-row-name') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const type = field.dataset.fieldType;
        let val = el.value;
        const empty = val.length === 0 && type !== 'html';
        if (empty) val = 'Empty Label';
        field.classList.toggle('label_empty', empty);
        const text = field.querySelector(':scope > .label-title .text');
        if (text) text.textContent = val;
      },
    },

    // ─ Universal: Required toggle (change event) ────────────────────────
    // Plugin: .wpforms-field-option-row-required input -> field.required
    {
      label: 'universal-required',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-required') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        field.classList.toggle('required', el.checked);
      },
    },

    // ─ Universal: Hide Label toggle (change event) ──────────────────────
    // Plugin: .wpforms-field-option-row-label_hide input -> field.label_hide
    // Layout shifts when label hides — wrap in fadeSwap on the field root.
    {
      label: 'universal-label-hide',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-label_hide') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        fadeSwap(field, () => {
          field.classList.toggle('label_hide', el.checked);
        });
      },
    },

    // ─ Universal: Field Size (Small / Medium / Large) ───────────────────
    // Plugin: .wpforms-field-option-row-size select -> field size-{val}
    {
      label: 'universal-size',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-size') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        fadeSwap(field, () => {
          field.classList.remove('size-small', 'size-medium', 'size-large');
          field.classList.add(`size-${el.value}`);
        });
      },
    },

    // ─ Universal: Placeholder text -> .primary-input placeholder attr ───
    // Text inputs: set placeholder attr.
    // Select fields: prepend (or update) a disabled <option value=""> that
    //   acts as the visible placeholder; remove it when value is cleared.
    {
      label: 'universal-placeholder',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-placeholder') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const target = field.querySelector('.primary-input');
        if (!target) return;
        if (target instanceof HTMLSelectElement) {
          let ph = target.querySelector('option[data-placeholder="1"]');
          if (el.value) {
            if (!ph) {
              ph = document.createElement('option');
              ph.value = '';
              ph.dataset.placeholder = '1';
              ph.disabled = true;
              ph.selected = true;
              target.insertBefore(ph, target.firstChild);
            }
            ph.textContent = el.value;
          } else if (ph) {
            ph.remove();
          }
        } else {
          target.setAttribute('placeholder', el.value);
        }
      },
    },

    // ─ Universal: Subfield placeholder (Name + Address) ─────────────────
    // Plugin handlers:
    //   .wpforms-field-option .format-selected input.placeholder   (Name)
    //   .wpforms-field-option-address input.placeholder            (Address)
    // Both share the same pattern: the row carries data-subfield, and the
    // canvas target is `.wpforms-{subfield} input` (Address has multiple
    // .wpforms-{subfield} per scheme container — we hit them all, matching
    // the plugin's jQuery .find behavior).
    {
      label: 'universal-placeholder-subfield',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.classList.contains('placeholder') &&
        el.closest('.wpforms-field-option-row')?.dataset.subfield != null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const row = el.closest('.wpforms-field-option-row');
        const subfield = row?.dataset.subfield;
        if (!subfield) return;
        field
          .querySelectorAll(`.wpforms-${subfield} input`)
          .forEach((input) => input.setAttribute('placeholder', el.value));
      },
    },

    // ─ Universal: Read-Only toggle ──────────────────────────────────────
    // Plugin: .wpforms-field-option-row-read_only input ->
    //   field.toggleClass('readonly', checked); and cascades to Required
    //   toggle (disables it + unchecks while read-only is on, restores on
    //   release). We mirror the cascade by dispatching a synthetic change
    //   on the Required input so universal-required removes the asterisk.
    {
      label: 'universal-read-only',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-read_only') !== null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const reqRow = document.getElementById(
          `wpforms-field-option-row-${fieldId}-required`,
        );
        const reqInput = reqRow?.querySelector('input[type="checkbox"]');
        fadeSwap(field, () => {
          field.classList.toggle('readonly', el.checked);
          if (!reqInput || !reqRow) return;
          if (el.checked) {
            // Save prior state, then disable + uncheck so the canvas
            // asterisk (controlled by .required) is removed.
            reqInput.dataset.priorChecked = reqInput.checked ? '1' : '0';
            reqRow.classList.add('wpforms-disabled');
            reqInput.disabled = true;
            if (reqInput.checked) {
              reqInput.checked = false;
              reqInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            reqRow.classList.remove('wpforms-disabled');
            reqInput.disabled = false;
            const prior = reqInput.dataset.priorChecked === '1';
            if (prior !== reqInput.checked) {
              reqInput.checked = prior;
              reqInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            delete reqInput.dataset.priorChecked;
          }
        });
      },
    },

    // ─ Universal: Description textarea ──────────────────────────────────
    // Plugin: .wpforms-field-option-row-description textarea ->
    //   #wpforms-field-{id} > .description  (innerHTML, with nl2br branch)
    // We use textContent — safer than innerHTML and the snapshot doesn't
    // need the nl2br fidelity (single-line descriptions only in tutorials).
    {
      label: 'universal-description',
      event: 'input',
      match: (el) =>
        el instanceof HTMLTextAreaElement &&
        el.closest('.wpforms-field-option-row-description') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const target = field.querySelector(':scope > .description');
        if (target) target.textContent = el.value;
      },
    },

    // ─ Email field: Allowlist / Denylist filter_type ────────────────────
    // Plugin: .wpforms-field-option-row-filter_type select ->
    //   on the option panel (#wpforms-field-option-{id}), swap classes
    //   wpforms-filter-allowlist / wpforms-filter-denylist. CSS in the
    //   snapshot then reveals the matching textarea row (display:block).
    {
      label: 'email-filter-type',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-filter_type') !== null,
      apply: (el) => {
        const panel = el.closest('.wpforms-field-option');
        if (!panel) return;
        panel.classList.remove('wpforms-filter-allowlist', 'wpforms-filter-denylist');
        if (el.value) panel.classList.add(`wpforms-filter-${el.value}`);
      },
    },

    // ─ Date/Time field: Date Type (datepicker / dropdown) ───────────────
    // Plugin: .wpforms-field-option-row-date .type select ->
    //   $('#wpforms-field-'+id).find('.wpforms-date').addClass(t).removeClass(l)
    //   and same swap on the option panel.
    // Both canvas DOM trees (.wpforms-date-datepicker + .wpforms-date-dropdown)
    // are always present; visibility is CSS-controlled by the type class.
    {
      label: 'date-type',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-date_type$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        const panel = el.closest('.wpforms-field-option');
        if (!field || !panel) return;
        const add = el.value === 'datepicker'
          ? 'wpforms-date-type-datepicker'
          : 'wpforms-date-type-dropdown';
        const remove = el.value === 'datepicker'
          ? 'wpforms-date-type-dropdown'
          : 'wpforms-date-type-datepicker';
        const dateEl = field.querySelector('.wpforms-date');
        if (!dateEl) return;
        fadeSwap(dateEl, () => {
          dateEl.classList.add(add);
          dateEl.classList.remove(remove);
          panel.classList.add(add);
          panel.classList.remove(remove);
        });
      },
    },

    // ─ Rating: Scale (1–10) ─────────────────────────────────────────────
    // Plugin: .wpforms-field-option-row-scale select -> show first N
    //   .rating-icon elements, hide the rest via inline display.
    {
      label: 'rating-scale',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-scale$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const wrap = field.querySelector('.wpforms-rating-field-icons');
        const scale = parseInt(el.value, 10);
        if (!wrap || Number.isNaN(scale)) return;
        const icons = wrap.querySelectorAll('.rating-icon');
        fadeSwap(wrap, () => {
          icons.forEach((icon, idx) => {
            icon.style.display = idx < scale ? 'inline-block' : 'none';
          });
        });
      },
    },

    // ─ Rating: Icon (Star / Heart / Thumb / Smiley) ─────────────────────
    // Plugin: removeClass fa-star fa-heart fa-thumbs-up fa-smile-o ->
    //   addClass matching the new icon family.
    {
      label: 'rating-icon',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-icon$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const wrap = field.querySelector('.wpforms-rating-field-icons');
        if (!wrap) return;
        const next =
          el.value === 'heart' ? 'fa-heart'
          : el.value === 'thumb' ? 'fa-thumbs-up'
          : el.value === 'smiley' ? 'fa-smile-o'
          : 'fa-star';
        fadeSwap(wrap, () => {
          wrap.querySelectorAll('.rating-icon').forEach((icon) => {
            icon.classList.remove('fa-star', 'fa-heart', 'fa-thumbs-up', 'fa-smile-o');
            icon.classList.add(next);
          });
        });
      },
    },

    // ─ Rating: Icon Size (Small / Medium / Large) ───────────────────────
    // Plugin: font-size 18 / 28 / 38 inline on .rating-icon.
    {
      label: 'rating-icon-size',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-icon_size$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const wrap = field.querySelector('.wpforms-rating-field-icons');
        if (!wrap) return;
        const px =
          el.value === 'small' ? '18px'
          : el.value === 'large' ? '38px'
          : '28px';
        fadeSwap(wrap, () => {
          wrap.querySelectorAll('.rating-icon').forEach((icon) => {
            icon.style.fontSize = px;
          });
        });
      },
    },

    // ─ File Upload: Style (Modern / Classic) ────────────────────────────
    // Plugin's fieldFileUploadPreviewUpdate juggles modern title/hint
    // localized strings and camera state — we mirror the core visual swap
    // only: toggle .wpforms-hide on the .wpforms-file-upload-builder-{type}
    // canvas elements.
    {
      label: 'file-upload-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-style$/.test(el.id) &&
        getFieldType(el) === 'file-upload',
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const classic = field.querySelector('.wpforms-file-upload-builder-classic');
        const modern = field.querySelector('.wpforms-file-upload-builder-modern');
        if (!classic || !modern) return;
        const isClassic = el.value === 'classic';
        fadeSwap(field, () => {
          classic.classList.toggle('wpforms-hide', !isClassic);
          modern.classList.toggle('wpforms-hide', isClassic);
        });
      },
    },

    // ─ Rich Text: Editor Style (Basic / Full) ───────────────────────────
    // Plugin: toggle `wpforms-field-richtext-toolbar-basic` on
    //   #wpforms-field-{id} .wpforms-richtext-wrap .mce-toolbar-grp when
    //   value !== 'full'.
    {
      label: 'richtext-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-style$/.test(el.id) &&
        getFieldType(el) === 'richtext',
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const toolbar = field.querySelector('.wpforms-richtext-wrap .mce-toolbar-grp');
        if (!toolbar) return;
        fadeSwap(toolbar, () => {
          toolbar.classList.toggle(
            'wpforms-field-richtext-toolbar-basic',
            el.value !== 'full',
          );
        });
      },
    },

    // ─ Choices: Label edit (Checkbox / Radio / Multiple Choice) ─────────
    // Canvas: <ul class="primary-input"><li>...<TEXT_NODE></li>...</ul>.
    // Option panel: <ul class="choices-list"><li data-key=N><input.label></li>...</ul>.
    // Match canvas li to option li by **position** (data-key may be sparse
    // after add/remove). We rewrite the last text node of the canvas li so
    // the leading checkbox/radio input stays put.
    {
      label: 'choices-label-edit',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.classList.contains('label') &&
        el.closest('.choices-list') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const optionLi = el.closest('li');
        const optionUl = el.closest('.choices-list');
        if (!optionLi || !optionUl) return;
        const idx = Array.from(optionUl.children).indexOf(optionLi);
        // Select-shape canvas: <select.primary-input><option>...</option></select>.
        const canvasSelect = field.querySelector('select.primary-input');
        if (canvasSelect) {
          // Account for a leading placeholder option if present.
          const offset = canvasSelect.querySelector('option[data-placeholder="1"]') ? 1 : 0;
          const opt = canvasSelect.children[idx + offset];
          if (opt) {
            opt.textContent = el.value;
            opt.value = el.value;
          }
          return;
        }
        const canvasUl = field.querySelector('ul.primary-input');
        if (!canvasUl) return;
        const canvasLi = canvasUl.children[idx];
        if (!canvasLi) return;
        // Find or create the trailing text node.
        let textNode = canvasLi.lastChild;
        while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
          textNode = textNode.previousSibling;
        }
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.nodeValue = ' ' + el.value;
        } else {
          canvasLi.appendChild(document.createTextNode(' ' + el.value));
        }
      },
    },

    // ─ Choices: Default toggle (which choice starts checked) ────────────
    // Mirror the option .default checkbox state onto the canvas <input> at
    // the same index. For radios, only one default is allowed — plugin
    // handles that by un-checking siblings; we mirror that here too.
    {
      label: 'choices-default-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('default') &&
        el.closest('.choices-list') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const optionLi = el.closest('li');
        const optionUl = el.closest('.choices-list');
        if (!optionLi || !optionUl) return;
        const fieldType = optionUl.dataset.fieldType;
        // payment-multiple renders radio inputs on canvas → mutex like radio.
        // payment-select renders a single-select <select> on canvas → mutex
        // like select. Existing radio + select keep the same behavior.
        const isRadio = fieldType === 'radio' || fieldType === 'payment-multiple';
        const isSelect = fieldType === 'select' || fieldType === 'payment-select';
        const idx = Array.from(optionUl.children).indexOf(optionLi);
        // Select-shape canvas.
        if (isSelect) {
          const canvasSelect = field.querySelector('select.primary-input');
          if (!canvasSelect) return;
          const isMulti = canvasSelect.multiple;
          const offset = canvasSelect.querySelector('option[data-placeholder="1"]') ? 1 : 0;
          if (!isMulti && el.checked) {
            // Single-select: only one default allowed.
            optionUl.querySelectorAll('input.default').forEach((other) => {
              if (other !== el) other.checked = false;
            });
            Array.from(canvasSelect.options).forEach((o) => { o.selected = false; });
          }
          const opt = canvasSelect.children[idx + offset];
          if (opt) opt.selected = el.checked;
          return;
        }
        const canvasUl = field.querySelector('ul.primary-input');
        if (!canvasUl) return;
        if (isRadio && el.checked) {
          // Plugin: only one default at a time for radios. Uncheck siblings
          // in both option list and canvas.
          optionUl.querySelectorAll('input.default').forEach((other) => {
            if (other !== el) other.checked = false;
          });
          canvasUl
            .querySelectorAll('input[type="radio"]')
            .forEach((input) => { input.checked = false; });
        }
        const canvasInput = canvasUl.children[idx]?.querySelector('input');
        if (canvasInput) canvasInput.checked = el.checked;
      },
    },

    // ─ Choices: Add (click on a.add inside choices-list) ────────────────
    // Clone the row, increment data-next-id on the ul, patch name+id
    // attrs to use the new key, clear values + default state, append. On
    // the canvas, append a matching <li> with a fresh input.
    {
      label: 'choices-add',
      event: 'click',
      match: (el) =>
        el.closest?.('a.add') !== null &&
        el.closest('.choices-list') !== null,
      apply: (el) => {
        const anchor = el.closest('a.add');
        if (!anchor) return;
        const field = getField(anchor);
        if (!field) return;
        const optionUl = anchor.closest('.choices-list');
        const sourceLi = anchor.closest('li');
        if (!optionUl || !sourceLi) return;
        const canvasUl = field.querySelector('ul.primary-input');
        const canvasSelect = field.querySelector('select.primary-input');
        // Note: canvasUl + canvasSelect can both be null for Likert / NPS
        // (table-based canvas). The panel-side clone still runs; canvas
        // mirroring branches below are gated individually. Likert resync
        // transitions at the end of the registry rebuild the table.
        const fieldId = optionUl.dataset.fieldId;
        const fieldType = optionUl.dataset.fieldType;
        const nextId = parseInt(optionUl.dataset.nextId || '0', 10);
        if (!fieldId || !Number.isFinite(nextId)) return;
        // Clone and rewrite attributes referencing the choice key.
        const newLi = sourceLi.cloneNode(true);
        newLi.dataset.key = String(nextId);
        const sourceKey = sourceLi.dataset.key;
        newLi.querySelectorAll('input, select, textarea, label, [id]').forEach((node) => {
          ['id', 'name', 'for'].forEach((attr) => {
            const v = node.getAttribute(attr);
            if (!v) return;
            const next = v.replace(
              new RegExp(`(\\[choices\\]\\[)${sourceKey}(\\])`),
              `$1${nextId}$2`,
            ).replace(
              new RegExp(`(-choice-)${sourceKey}(-|$)`),
              `$1${nextId}$2`,
            );
            node.setAttribute(attr, next);
          });
        });
        // Clear values + uncheck default on the new row.
        newLi.querySelectorAll('input.label, input.value').forEach((input) => {
          input.value = '';
        });
        const defaultInput = newLi.querySelector('input.default');
        if (defaultInput) defaultInput.checked = false;
        sourceLi.after(newLi);
        optionUl.dataset.nextId = String(nextId + 1);
        const idx = Array.from(optionUl.children).indexOf(sourceLi);
        // Canvas mirror.
        if (canvasSelect) {
          // Insert a fresh <option> after the source option (account for
          // leading placeholder option if present).
          const offset = canvasSelect.querySelector('option[data-placeholder="1"]') ? 1 : 0;
          const newOpt = document.createElement('option');
          newOpt.value = '';
          newOpt.textContent = '';
          const refOpt = canvasSelect.children[idx + offset];
          if (refOpt) refOpt.after(newOpt);
          else canvasSelect.appendChild(newOpt);
        } else if (canvasUl) {
          // Insert li after the canvas li at the same index.
          const newCanvasLi = document.createElement('li');
          newCanvasLi.className = '';
          const newInput = document.createElement('input');
          // payment-multiple renders radio inputs on canvas, same as radio.
          newInput.type = (fieldType === 'radio' || fieldType === 'payment-multiple') ? 'radio' : 'checkbox';
          newInput.readOnly = true;
          newCanvasLi.appendChild(newInput);
          newCanvasLi.appendChild(document.createTextNode(' '));
          const refCanvasLi = canvasUl.children[idx];
          if (refCanvasLi) refCanvasLi.after(newCanvasLi);
          else canvasUl.appendChild(newCanvasLi);
        }
      },
    },

    // ─ Choices: Remove (click on a.remove inside choices-list) ──────────
    // Plugin blocks removing the last remaining choice. We mirror that.
    {
      label: 'choices-remove',
      event: 'click',
      match: (el) =>
        el.closest?.('a.remove') !== null &&
        el.closest('.choices-list') !== null,
      apply: (el) => {
        const anchor = el.closest('a.remove');
        if (!anchor) return;
        const field = getField(anchor);
        if (!field) return;
        const optionLi = anchor.closest('li');
        const optionUl = anchor.closest('.choices-list');
        if (!optionLi || !optionUl) return;
        if (optionUl.children.length <= 1) return; // can't remove the last one
        const canvasUl = field.querySelector('ul.primary-input');
        const canvasSelect = field.querySelector('select.primary-input');
        const idx = Array.from(optionUl.children).indexOf(optionLi);
        if (canvasSelect) {
          const offset = canvasSelect.querySelector('option[data-placeholder="1"]') ? 1 : 0;
          canvasSelect.children[idx + offset]?.remove();
        } else if (canvasUl) {
          canvasUl.children[idx]?.remove();
        }
        optionLi.remove();
      },
    },

    // ─ Password / Email: Enable Confirmation toggle ─────────────────────
    // Plugin: .wpforms-field-option-row-confirmation input ->
    //   #wpforms-field-{id} .wpforms-confirm toggles
    //     wpforms-confirm-enabled / wpforms-confirm-disabled
    //   #wpforms-field-option-{id} toggles the same pair (panel-side).
    // Each class is toggled independently so the pair always inverts.
    {
      label: 'confirmation-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-confirmation') !== null,
      apply: (el) => {
        const field = getField(el);
        const panel = el.closest('.wpforms-field-option');
        if (!field || !panel) return;
        const confirm = field.querySelector('.wpforms-confirm');
        const flip = (node) => {
          node.classList.toggle('wpforms-confirm-enabled');
          node.classList.toggle('wpforms-confirm-disabled');
        };
        if (confirm) {
          fadeSwap(confirm, () => {
            flip(confirm);
            flip(panel);
          });
        } else {
          flip(panel);
        }
      },
    },

    // ─ Checkbox / Radio: Disclaimer toggle ──────────────────────────────
    // Plugin: .wpforms-field-option-row-disclaimer_format input ->
    //   toggle .disclaimer on #wpforms-field-{id} .description.
    {
      label: 'checkbox-disclaimer',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-disclaimer_format') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const desc = field.querySelector('.description');
        if (!desc) return;
        desc.classList.toggle('disclaimer', el.checked);
      },
    },

    // ─ Choices: Layout (input_columns) ──────────────────────────────────
    // Plugin: .wpforms-field-option-row-input_columns select ->
    //   field gets one of: wpforms-list-2-columns, wpforms-list-3-columns,
    //   wpforms-list-inline. Default (value "") is 1-column, no class.
    //   Universal across Multiple Choice / Checkboxes / Radio.
    {
      label: 'choices-layout',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-input_columns') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const next =
          el.value === '2' ? 'wpforms-list-2-columns'
          : el.value === '3' ? 'wpforms-list-3-columns'
          : el.value === 'inline' ? 'wpforms-list-inline'
          : '';
        fadeSwap(field, () => {
          field.classList.remove(
            'wpforms-list-2-columns',
            'wpforms-list-3-columns',
            'wpforms-list-inline',
          );
          if (next) field.classList.add(next);
        });
      },
    },

    // ─ Choices: Use Image Choices toggle ────────────────────────────────
    // Class-only mirror (no per-li image placeholder render). On enable:
    //   - canvas field gets wpforms-image-choices + wpforms-image-choices-{style}
    //     using the current Image Choice Style select value
    //   - choices_images_style + choices_images_hide sub-rows reveal
    //   - input_columns is forced to "inline" (plugin behavior); previous
    //     value saved to dataset for restore on disable
    //   - Use Icon Choices is unchecked if on (mutex), dispatching its change
    // Hide Images in Entries (_hide) is entries-only, no canvas effect — skipped.
    {
      label: 'image-choices-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-choices_images') !== null &&
        el.closest('.wpforms-field-option-row-choices_images_hide') === null &&
        el.closest('.wpforms-field-option-row-choices_images_style') === null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const canvasUl = field.querySelector('ul.primary-input');
        const optionList = document.getElementById(
          `wpforms-field-option-${fieldId}-choices-list`,
        );
        const styleSelect = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_images_style`,
        );
        const columnsSelect = document.getElementById(
          `wpforms-field-option-${fieldId}-input_columns`,
        );
        const iconToggle = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_icons`,
        );
        const style = (styleSelect && styleSelect.value) || 'modern';
        fadeSwap(field, () => {
          if (canvasUl) {
            canvasUl.classList.remove(
              'wpforms-image-choices',
              'wpforms-image-choices-modern',
              'wpforms-image-choices-classic',
              'wpforms-image-choices-none',
            );
            if (el.checked) {
              canvasUl.classList.add('wpforms-image-choices', `wpforms-image-choices-${style}`);
            }
          }
          if (optionList) {
            optionList.classList.toggle('show-images', el.checked);
          }
          renderCanvasChoices(field);
        });
        toggleRow(`wpforms-field-option-row-${fieldId}-choices_images_style`, el.checked);
        toggleRow(`wpforms-field-option-row-${fieldId}-choices_images_hide`, el.checked);
        // Mutex with Icon Choices.
        if (el.checked && iconToggle && iconToggle.checked) {
          iconToggle.checked = false;
          iconToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // input_columns: force "inline" on enable, restore on disable.
        if (columnsSelect) {
          if (el.checked) {
            el.dataset.prevColumns = columnsSelect.value;
            if (columnsSelect.value !== 'inline') {
              columnsSelect.value = 'inline';
              columnsSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (el.dataset.prevColumns !== undefined) {
            if (columnsSelect.value !== el.dataset.prevColumns) {
              columnsSelect.value = el.dataset.prevColumns;
              columnsSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            delete el.dataset.prevColumns;
          }
        }
      },
    },

    // ─ Choices: Image Choice Style sub-select ───────────────────────────
    {
      label: 'image-choices-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-choices_images_style') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const canvasUl = field.querySelector('ul.primary-input');
        if (!canvasUl || !canvasUl.classList.contains('wpforms-image-choices')) return;
        fadeSwap(field, () => {
          canvasUl.classList.remove(
            'wpforms-image-choices-modern',
            'wpforms-image-choices-classic',
            'wpforms-image-choices-none',
          );
          canvasUl.classList.add(`wpforms-image-choices-${el.value}`);
        });
      },
    },

    // ─ Choices: Use Icon Choices toggle ─────────────────────────────────
    // Class-only mirror. On enable canvas gets wpforms-icon-choices +
    //   -{style} + -{size}; sub-rows reveal; mutex with Image Choices.
    // Icon Color (minicolors widget) is skipped — separate beast.
    {
      label: 'icon-choices-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-choices_icons') !== null &&
        el.closest('.wpforms-field-option-row-choices_icons_style') === null &&
        el.closest('.wpforms-field-option-row-choices_icons_size') === null &&
        el.closest('.wpforms-field-option-row-choices_icons_color') === null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const canvasUl = field.querySelector('ul.primary-input');
        const optionList = document.getElementById(
          `wpforms-field-option-${fieldId}-choices-list`,
        );
        const styleSelect = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_icons_style`,
        );
        const sizeSelect = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_icons_size`,
        );
        const colorInput = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_icons_color`,
        );
        const imageToggle = document.getElementById(
          `wpforms-field-option-${fieldId}-choices_images`,
        );
        const style = (styleSelect && styleSelect.value) || 'default';
        const size = (sizeSelect && sizeSelect.value) || 'large';
        const color = (colorInput && colorInput.value) || '#066aab';
        fadeSwap(field, () => {
          if (canvasUl) {
            canvasUl.classList.remove(
              'wpforms-icon-choices',
              'wpforms-icon-choices-default',
              'wpforms-icon-choices-modern',
              'wpforms-icon-choices-classic',
              'wpforms-icon-choices-none',
              'wpforms-icon-choices-small',
              'wpforms-icon-choices-medium',
              'wpforms-icon-choices-large',
            );
            if (el.checked) {
              canvasUl.classList.add(
                'wpforms-icon-choices',
                `wpforms-icon-choices-${style}`,
                `wpforms-icon-choices-${size}`,
              );
              canvasUl.style.setProperty('--wpforms-icon-choices-color', color);
            } else {
              canvasUl.style.removeProperty('--wpforms-icon-choices-color');
            }
          }
          if (optionList) {
            optionList.classList.toggle('show-icons', el.checked);
            if (el.checked) {
              optionList.style.setProperty('--wpforms-icon-choices-color', color);
            }
          }
          renderCanvasChoices(field);
        });
        toggleRow(`wpforms-field-option-row-${fieldId}-choices_icons_style`, el.checked);
        toggleRow(`wpforms-field-option-row-${fieldId}-choices_icons_color`, el.checked);
        toggleRow(`wpforms-field-option-row-${fieldId}-choices_icons_size`, el.checked);
        if (el.checked && imageToggle && imageToggle.checked) {
          imageToggle.checked = false;
          imageToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    },

    // ─ Choices: Icon Choice Style sub-select ────────────────────────────
    {
      label: 'icon-choices-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-choices_icons_style') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const canvasUl = field.querySelector('ul.primary-input');
        if (!canvasUl || !canvasUl.classList.contains('wpforms-icon-choices')) return;
        fadeSwap(field, () => {
          canvasUl.classList.remove(
            'wpforms-icon-choices-default',
            'wpforms-icon-choices-modern',
            'wpforms-icon-choices-classic',
            'wpforms-icon-choices-none',
          );
          canvasUl.classList.add(`wpforms-icon-choices-${el.value}`);
        });
      },
    },

    // ─ Choices: Bulk Add toggle (paste-many-at-once UI) ─────────────────
    // Plugin: clicking the "Bulk Add" link expands a textarea + "Add New
    //   Choices" / "Cancel" buttons under the Choices row. Pasting newline-
    //   separated lines and clicking Add creates one choice row per line.
    // Snapshot: the bulk UI isn't in the captured DOM — we inject it on
    //   first activation and keep it for subsequent toggles.
    {
      label: 'choices-bulk-add-toggle',
      event: 'click',
      match: (el) =>
        el.closest?.('.toggle-bulk-add-display') !== null,
      apply: (el) => {
        const anchor = el.closest('.toggle-bulk-add-display');
        const row = anchor?.closest('.wpforms-field-option-row-choices');
        if (!row) return;
        const optionList = row.querySelector('.choices-list');
        if (!optionList) return;
        let bulk = row.querySelector('.wpf-snap-bulk-add');
        if (!bulk) {
          bulk = document.createElement('div');
          bulk.className = 'wpf-snap-bulk-add';
          Object.assign(bulk.style, {
            marginTop: '8px',
            padding: '10px',
            background: '#f4f5f7',
            border: '1px solid #d4d6db',
            borderRadius: '4px',
            display: 'none',
          });
          bulk.innerHTML = [
            '<p style="margin:0 0 6px 0;font-size:12px;color:#50575e;">',
            'Enter each choice on a separate line.',
            '</p>',
            '<textarea class="wpf-snap-bulk-textarea" rows="6" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;padding:6px;border:1px solid #c3c4c7;border-radius:3px;resize:vertical;"></textarea>',
            '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;">',
            '<button type="button" class="wpf-snap-bulk-add-btn wpforms-btn wpforms-btn-sm wpforms-btn-blue">Add New Choices</button>',
            '<a href="#" class="wpf-snap-bulk-cancel" style="color:#646970;text-decoration:underline;font-size:13px;">Cancel</a>',
            '</div>',
          ].join('');
          optionList.after(bulk);
        }
        const isOpen = bulk.style.display !== 'none';
        if (isOpen) {
          bulk.style.display = 'none';
          optionList.style.display = '';
        } else {
          bulk.style.display = '';
          optionList.style.display = 'none';
          const ta = bulk.querySelector('.wpf-snap-bulk-textarea');
          if (ta) ta.focus();
        }
      },
    },

    // ─ Choices: Bulk Add — Cancel ───────────────────────────────────────
    {
      label: 'choices-bulk-cancel',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpf-snap-bulk-cancel') !== null,
      apply: (el) => {
        const bulk = el.closest('.wpf-snap-bulk-add');
        const row = bulk?.closest('.wpforms-field-option-row-choices');
        const optionList = row?.querySelector('.choices-list');
        if (!bulk || !optionList) return;
        bulk.style.display = 'none';
        optionList.style.display = '';
        const ta = bulk.querySelector('.wpf-snap-bulk-textarea');
        if (ta) ta.value = '';
      },
    },

    // ─ Choices: Bulk Add — Submit ───────────────────────────────────────
    // Splits textarea by newlines, creates one choice row per non-empty
    //   line. Replaces the current choices (matches plugin behavior when
    //   the bulk-add modal hasn't been told to append). Mirrors to canvas.
    {
      label: 'choices-bulk-submit',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpf-snap-bulk-add-btn') !== null,
      apply: (el) => {
        const bulk = el.closest('.wpf-snap-bulk-add');
        const row = bulk?.closest('.wpforms-field-option-row-choices');
        const optionList = row?.querySelector('.choices-list');
        const ta = bulk?.querySelector('.wpf-snap-bulk-textarea');
        if (!bulk || !optionList || !ta) return;
        const field = getField(optionList);
        if (!field) return;
        const lines = ta.value
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (lines.length === 0) return;
        const fieldId = optionList.dataset.fieldId;
        const fieldType = optionList.dataset.fieldType;
        const sourceLi = optionList.querySelector('li');
        if (!sourceLi || !fieldId) return;
        const canvasUl = field.querySelector('ul.primary-input');
        const canvasSelect = field.querySelector('select.primary-input');
        const offsetSelect = canvasSelect?.querySelector('option[data-placeholder="1"]') ? 1 : 0;
        fadeSwap(field, () => {
          // Wipe existing rows in option list + canvas.
          optionList.innerHTML = '';
          if (canvasUl) canvasUl.innerHTML = '';
          if (canvasSelect) {
            // Keep the placeholder option if present.
            const ph = canvasSelect.querySelector('option[data-placeholder="1"]');
            canvasSelect.innerHTML = '';
            if (ph) canvasSelect.appendChild(ph);
          }
          lines.forEach((label, i) => {
            const key = i + 1;
            // Clone source row template and patch attrs + label.
            const newLi = sourceLi.cloneNode(true);
            newLi.dataset.key = String(key);
            newLi.querySelectorAll('input, select, textarea, label, [id]').forEach((node) => {
              ['id', 'name', 'for'].forEach((attr) => {
                const v = node.getAttribute(attr);
                if (!v) return;
                const next = v
                  .replace(/\[choices\]\[\d+\]/g, `[choices][${key}]`)
                  .replace(/-choice-\d+/g, `-choice-${key}`);
                node.setAttribute(attr, next);
              });
            });
            newLi.querySelectorAll('input.label').forEach((inp) => { inp.value = label; });
            newLi.querySelectorAll('input.value').forEach((inp) => { inp.value = ''; });
            const def = newLi.querySelector('input.default');
            if (def) def.checked = false;
            optionList.appendChild(newLi);
            // Canvas mirror.
            if (canvasUl) {
              const li = document.createElement('li');
              const inp = document.createElement('input');
              inp.type = fieldType === 'radio' ? 'radio' : 'checkbox';
              inp.readOnly = true;
              li.appendChild(inp);
              li.appendChild(document.createTextNode(' ' + label));
              canvasUl.appendChild(li);
            }
            if (canvasSelect) {
              const opt = document.createElement('option');
              opt.value = label;
              opt.textContent = label;
              canvasSelect.appendChild(opt);
            }
          });
          optionList.dataset.nextId = String(lines.length + 1);
        });
        // Close bulk UI.
        bulk.style.display = 'none';
        optionList.style.display = '';
        ta.value = '';
      },
    },

    // ─ Choices: Dynamic Choices (Off / Post Type / Taxonomy) ────────────
    // Live plugin: when set, replaces the field's choices with rows pulled
    //   from WordPress (posts of a given type, or terms of a taxonomy) and
    //   shows the "Dynamic Choices Active" alert. The option-panel choices
    //   list becomes read-only placeholder rows.
    // Snapshot approach: cache original choices markup on the field on
    //   first activation; on Off, restore it. Sullie's-bakery-themed sample
    //   rows are used so the snapshot reads as a real WP install.
    {
      label: 'choices-dynamic',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-dynamic_choices') !== null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const optionList = document.getElementById(
          `wpforms-field-option-${fieldId}-choices-list`,
        );
        if (!optionList) return;
        const choicesRow = optionList.closest('.wpforms-field-option-row-choices');
        const alertBox = choicesRow?.querySelector('.wpforms-alert-warning');
        const canvasUl = field.querySelector('ul.primary-input');
        const canvasSelect = field.querySelector('select.primary-input');
        const POST_NAMES = [
          "Sullie's first post",
          'Fresh sourdough Saturday',
          'Behind the bakery counter',
        ];
        const TAXONOMY_NAMES = ['Breads', 'Pastries', 'Holiday specials'];
        const labels = el.value === 'taxonomy' ? TAXONOMY_NAMES
          : el.value === 'post_type' ? POST_NAMES
          : null;
        fadeSwap(field, () => {
          if (labels) {
            // Cache originals (once).
            if (!optionList.dataset.dynamicCacheSet) {
              optionList.dataset.dynamicCacheSet = '1';
              field.dataset.dynamicOriginalOptionList = optionList.innerHTML;
              if (canvasUl) field.dataset.dynamicOriginalCanvasUl = canvasUl.innerHTML;
              if (canvasSelect) field.dataset.dynamicOriginalCanvasSelect = canvasSelect.innerHTML;
            }
            // Option-panel: replace rows with read-only placeholder lis.
            optionList.innerHTML = '';
            labels.forEach((name, i) => {
              const li = document.createElement('li');
              li.dataset.key = String(i + 1);
              li.className = 'wpforms-dynamic-choice';
              const move = document.createElement('span');
              move.className = 'move';
              move.innerHTML = '<i class="fa fa-grip-lines"></i>';
              const inp = document.createElement('input');
              inp.type = field.dataset.fieldType === 'checkbox' ? 'checkbox' : 'radio';
              inp.className = 'default';
              inp.disabled = true;
              const label = document.createElement('input');
              label.type = 'text';
              label.className = 'label';
              label.value = name;
              label.readOnly = true;
              li.appendChild(move);
              li.appendChild(inp);
              li.appendChild(label);
              optionList.appendChild(li);
            });
            // Canvas: replace with placeholder rows / options.
            if (canvasUl) {
              canvasUl.innerHTML = '';
              labels.forEach((name) => {
                const li = document.createElement('li');
                const inp = document.createElement('input');
                inp.type = field.dataset.fieldType === 'checkbox' ? 'checkbox' : 'radio';
                inp.readOnly = true;
                li.appendChild(inp);
                li.appendChild(document.createTextNode(' ' + name));
                canvasUl.appendChild(li);
              });
            }
            if (canvasSelect) {
              // Preserve any placeholder option.
              const ph = canvasSelect.querySelector('option[data-placeholder="1"]');
              canvasSelect.innerHTML = '';
              if (ph) canvasSelect.appendChild(ph);
              labels.forEach((name) => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                canvasSelect.appendChild(opt);
              });
            }
            // Show alert.
            if (alertBox) {
              alertBox.classList.remove('wpforms-hidden');
              const nameSpan = alertBox.querySelector('.dynamic-name');
              const typeSpan = alertBox.querySelector('.dynamic-type');
              if (nameSpan) nameSpan.textContent = el.value === 'post_type' ? 'Posts' : 'Categories';
              if (typeSpan) typeSpan.textContent = el.value === 'post_type' ? 'Post Type' : 'Taxonomy';
            }
          } else {
            // Restore originals.
            if (optionList.dataset.dynamicCacheSet) {
              if (field.dataset.dynamicOriginalOptionList !== undefined) {
                optionList.innerHTML = field.dataset.dynamicOriginalOptionList;
              }
              if (canvasUl && field.dataset.dynamicOriginalCanvasUl !== undefined) {
                canvasUl.innerHTML = field.dataset.dynamicOriginalCanvasUl;
              }
              if (canvasSelect && field.dataset.dynamicOriginalCanvasSelect !== undefined) {
                canvasSelect.innerHTML = field.dataset.dynamicOriginalCanvasSelect;
              }
              delete optionList.dataset.dynamicCacheSet;
              delete field.dataset.dynamicOriginalOptionList;
              delete field.dataset.dynamicOriginalCanvasUl;
              delete field.dataset.dynamicOriginalCanvasSelect;
            }
            if (alertBox) alertBox.classList.add('wpforms-hidden');
          }
        });
      },
    },

    // ─ Choices: Icon Color swatch click -> native picker ────────────────
    // The minicolors widget grid/hue picker isn't re-implemented; instead
    // we hijack a swatch click and open the browser's native color picker.
    // The native picker's value writes back into the text input and fires
    // an 'input' event, which triggers icon-choices-color below.
    {
      label: 'icon-choices-color-swatch',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpforms-field-option-row-choices_icons_color') !== null &&
        (el.closest('.minicolors-swatch') !== null ||
         el.closest('.minicolors-panel') !== null),
      apply: (el) => {
        const row = el.closest('.wpforms-field-option-row-choices_icons_color');
        if (!row) return;
        const native = ensureNativeColorInput(row, '#066aab');
        if (native) native.click();
      },
    },

    // ─ Choices: Icon Color picker live edit ─────────────────────────────
    // Plugin uses minicolors widget. We listen on the text input directly
    // and accept any value that looks like a CSS color (#hex or named).
    // Updates: minicolors swatch background + canvas/option-list CSS var
    // --wpforms-icon-choices-color so all icons recolor live.
    {
      label: 'icon-choices-color',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-choices_icons_color') !== null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const value = el.value.trim() || '#066aab';
        const swatch = el.parentElement?.querySelector('.minicolors-swatch-color');
        if (swatch) swatch.style.backgroundColor = value;
        const canvasUl = field.querySelector('ul.primary-input');
        if (canvasUl && canvasUl.classList.contains('wpforms-icon-choices')) {
          canvasUl.style.setProperty('--wpforms-icon-choices-color', value);
        }
        const optionList = document.getElementById(
          `wpforms-field-option-${fieldId}-choices-list`,
        );
        if (optionList && optionList.classList.contains('show-icons')) {
          optionList.style.setProperty('--wpforms-icon-choices-color', value);
        }
      },
    },

    // ─ Checkbox: Choice Limit (frontend-prep) ───────────────────────────
    // Plugin: limits how many checkboxes a user can select on the frontend.
    // No visible builder-canvas effect. We persist the value to the canvas
    // field via data-choice-limit so the eventual frontend-form snapshot
    // can read it.
    {
      label: 'choice-limit',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'number' &&
        el.closest('.wpforms-field-option-row-choice_limit') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const v = el.value.trim();
        if (v) field.dataset.choiceLimit = v;
        else delete field.dataset.choiceLimit;
      },
    },

    // ─ Choices: Add Other Choice toggle (Radio / Checkbox) ──────────────
    // Live plugin behavior: canvas shows just an extra radio/checkbox + " Other"
    //   label (NO text input — the input only renders on the frontend, and
    //   only when Other is selected). other_size + other_placeholder are
    //   persisted to dataset for the frontend-form snapshot to consume.
    // Reveals other_size + other_placeholder sub-rows in the option panel.
    {
      label: 'choices-other-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-choices_other') !== null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const fieldType = field.dataset.fieldType || 'radio';
        const canvasUl = field.querySelector('ul.primary-input');
        fadeSwap(field, () => {
          if (canvasUl) {
            const existing = canvasUl.querySelector(`li.wpforms-field-${fieldType}-other`);
            if (el.checked && !existing) {
              const li = document.createElement('li');
              li.className = `wpforms-field-${fieldType}-other`;
              const inp = document.createElement('input');
              inp.type = fieldType === 'checkbox' ? 'checkbox' : 'radio';
              inp.readOnly = true;
              li.appendChild(inp);
              li.appendChild(document.createTextNode(' Other'));
              canvasUl.appendChild(li);
            } else if (!el.checked && existing) {
              existing.remove();
            }
          }
        });
        toggleRow(`wpforms-field-option-row-${fieldId}-other_size`, el.checked);
        toggleRow(`wpforms-field-option-row-${fieldId}-other_placeholder`, el.checked);
      },
    },

    // ─ Choices: Other Placeholder (frontend-prep) ───────────────────────
    // Canvas has no Other text input (only frontend renders it when picked).
    // Persist value to field dataset for the frontend-form snapshot.
    {
      label: 'choices-other-placeholder',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-other_placeholder') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        if (el.value) field.dataset.otherPlaceholder = el.value;
        else delete field.dataset.otherPlaceholder;
      },
    },

    // ─ Choices: Other Size (frontend-prep) ──────────────────────────────
    {
      label: 'choices-other-size',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-other_size') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        field.dataset.otherSize = el.value;
      },
    },

    // ─ Dropdown: Style (Modern / Classic) ───────────────────────────────
    // Plugin renders Modern dropdowns via Choices.js. For snapshot purposes
    // we mirror the class on the canvas <select> so styling hooks apply;
    // the Choices.js overlay itself isn't re-rendered.
    {
      label: 'dropdown-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-style') !== null &&
        el.closest('.wpforms-field-option-select') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const canvasSelect = field.querySelector('select.primary-input');
        if (!canvasSelect) return;
        fadeSwap(field, () => {
          canvasSelect.classList.remove('wpforms-field-style-modern', 'wpforms-field-style-classic');
          canvasSelect.classList.add(`wpforms-field-style-${el.value}`);
          field.dataset.dropdownStyle = el.value;
        });
      },
    },

    // ─ Dropdown: Multiple Options Selection toggle ──────────────────────
    // Plugin sets the canvas <select multiple>. Visually this turns the
    // dropdown into a scrollable multi-select list.
    {
      label: 'dropdown-multiple',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-multiple') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const canvasSelect = field.querySelector('select.primary-input');
        if (!canvasSelect) return;
        fadeSwap(field, () => {
          if (el.checked) canvasSelect.setAttribute('multiple', '');
          else canvasSelect.removeAttribute('multiple');
        });
      },
    },

    // ─ Date/Time: Date Format select ────────────────────────────────────
    // The select <option> textContent already holds the formatted sample
    //   (e.g. "04/20/2026 (m/d/Y)"). Strip the parenthetical suffix and
    //   use it as the placeholder on the canvas datepicker input. For the
    //   dropdown variant, rewrite the three MM/DD/YYYY <option> tokens to
    //   match the format order.
    {
      label: 'date-format',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-date_format$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const opt = el.options[el.selectedIndex];
        if (!opt) return;
        const sample = (opt.textContent || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const datepickerInput = field.querySelector('.wpforms-date-datepicker input.primary-input');
        if (datepickerInput) datepickerInput.setAttribute('placeholder', sample);
        // Dropdown variant: reorder MM/DD/YYYY tokens.
        const v = el.value;
        const tokens = v.includes('Y/m/d') || v.includes('Y.m.d') ? ['YYYY', 'MM', 'DD']
          : v.includes('d/m/Y') || v.includes('d.m.Y') ? ['DD', 'MM', 'YYYY']
          : ['MM', 'DD', 'YYYY'];
        const sel = field.querySelectorAll('.wpforms-date-dropdown select');
        if (sel.length === 3) {
          sel[0].querySelector('option').textContent = tokens[0];
          sel[1].querySelector('option').textContent = tokens[1];
          sel[2].querySelector('option').textContent = tokens[2];
        }
        field.dataset.dateFormat = v;
      },
    },

    // ─ Date/Time: Time Format select (12H / 24H) ────────────────────────
    {
      label: 'time-format',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-time_format$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const sample = el.value === 'H:i' ? '14:00' : '9:00 am';
        const timeInput = field.querySelector('.wpforms-time input.primary-input');
        if (timeInput) timeInput.setAttribute('placeholder', sample);
        field.dataset.timeFormat = el.value;
      },
    },

    // ─ Date/Time: Date subfield placeholder ─────────────────────────────
    {
      label: 'date-placeholder',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-date_placeholder$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const datepickerInput = field.querySelector('.wpforms-date-datepicker input.primary-input');
        if (datepickerInput) datepickerInput.setAttribute('placeholder', el.value);
      },
    },

    // ─ Date/Time: Time subfield placeholder ─────────────────────────────
    {
      label: 'time-placeholder',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-time_placeholder$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const timeInput = field.querySelector('.wpforms-time input.primary-input');
        if (timeInput) timeInput.setAttribute('placeholder', el.value);
      },
    },

    // ─ Universal: Default Value -> .primary-input value attr ────────────
    // The default-value field is a contenteditable "smart tags" widget.
    //   Pills become `{tag_value}`, plain text passes through. Mirrors to
    //   the canvas primary input (covers <input> + <textarea>).
    {
      label: 'universal-default-value',
      event: 'input',
      match: (el) =>
        el instanceof HTMLElement &&
        el.classList.contains('wpforms-smart-tags-widget-input') &&
        el.closest('.wpforms-field-option-row-default_value') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const target = field.querySelector('.primary-input');
        if (!target || target instanceof HTMLSelectElement) return;
        const v = serializeSmartTagsWidget(el);
        target.setAttribute('value', v);
        if (target instanceof HTMLInputElement) target.value = v;
        else if (target instanceof HTMLTextAreaElement) target.value = v;
      },
    },

    // ─ Signature: Ink Color (minicolors) ────────────────────────────────
    // Signature pad is canvas-rendered (no live recolor of empty preview).
    // Persist to field dataset + update swatch + wire swatch->native picker.
    {
      label: 'signature-ink-color',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-ink_color') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const value = el.value.trim() || '#000000';
        const swatch = el.parentElement?.querySelector('.minicolors-swatch-color');
        if (swatch) swatch.style.backgroundColor = value;
        field.dataset.inkColor = value;
      },
    },
    {
      label: 'signature-ink-color-swatch',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpforms-field-option-row-ink_color') !== null &&
        (el.closest('.minicolors-swatch') !== null ||
         el.closest('.minicolors-panel') !== null),
      apply: (el) => {
        const row = el.closest('.wpforms-field-option-row-ink_color');
        if (!row) return;
        const native = ensureNativeColorInput(row, '#000000');
        if (native) native.click();
      },
    },

    // ─ HTML field: Code -> rendered onto canvas .wpforms-field-html ─────
    {
      label: 'html-field-code',
      event: 'input',
      match: (el) =>
        el instanceof HTMLTextAreaElement &&
        /^wpforms-field-option-\d+-code$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        // Canvas renders inside .wpforms-html — set its innerHTML to the code.
        const target = field.querySelector('.wpforms-html') || field.querySelector('.description');
        if (target) target.innerHTML = el.value;
      },
    },

    // ─ Content field: Content -> rendered onto canvas ───────────────────
    {
      label: 'content-field',
      event: 'input',
      match: (el) =>
        (el instanceof HTMLTextAreaElement ||
         (el instanceof HTMLElement && el.classList.contains('wpforms-smart-tags-widget-input'))) &&
        el.closest('.wpforms-field-option-row-content') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const target = field.querySelector('.wpforms-content') || field.querySelector('.description');
        if (!target) return;
        target.innerHTML = el instanceof HTMLTextAreaElement ? el.value : el.innerHTML;
      },
    },

    // ─ Divider: Hide line toggle ────────────────────────────────────────
    {
      label: 'divider-hide-line',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-hide_divider_line') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        field.classList.toggle('wpforms-divider-hide-line', el.checked);
      },
    },

    // ─ Repeater: Display (Rows / Blocks) ────────────────────────────────
    // Rows: shows .wpforms-field-repeater-display-rows-buttons, hides
    //   blocks-buttons, and hides the button-type + button-labels option
    //   sub-rows.
    // Blocks: inverse. Plugin also flips wpforms-layout-display-rows class
    //   on the canvas layout-columns wrap.
    {
      label: 'repeater-display',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'radio' &&
        el.closest('.wpforms-field-option-row-display') !== null &&
        el.closest('.wpforms-field-option-repeater') !== null,
      apply: (el) => {
        if (!el.checked) return;
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const isBlocks = el.value === 'blocks';
        const rowsBtns = field.querySelector('.wpforms-field-repeater-display-rows-buttons');
        const blocksBtns = field.querySelector('.wpforms-field-repeater-display-blocks-buttons');
        const layoutWrap = field.querySelector('.wpforms-field-layout-columns');
        fadeSwap(field, () => {
          if (rowsBtns) rowsBtns.classList.toggle('wpforms-hidden', isBlocks);
          if (blocksBtns) blocksBtns.classList.toggle('wpforms-hidden', !isBlocks);
          if (layoutWrap) layoutWrap.classList.toggle('wpforms-layout-display-rows', !isBlocks);
        });
        toggleRow(`wpforms-field-option-row-${fieldId}-button-type`, isBlocks);
        // Note: button-labels row id is 0 in this snapshot (sloppy plugin id);
        // we toggle by element selector instead.
        const labelsRow = document.querySelector(
          `.wpforms-field-option-row-button-labels[data-field-id="${fieldId}"]`,
        );
        if (labelsRow) labelsRow.classList.toggle('wpforms-hidden', !isBlocks);
      },
    },

    // ─ Repeater: Button Type ────────────────────────────────────────────
    // Renders the Add/Remove blocks-buttons in five visual modes:
    //   buttons_with_icons → icon left + text  (default; full button style)
    //   buttons            → text only         (full button style)
    //   icons_with_text    → text + icon right (full button style)
    //   icons              → icon only         (small icon-only button)
    //   plain_text         → text, no button styling (link-like)
    {
      label: 'repeater-button-type',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-button_type$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const blocksBtns = field.querySelector('.wpforms-field-repeater-display-blocks-buttons');
        if (!blocksBtns) return;
        const mode = el.value;
        blocksBtns.dataset.buttonType = mode;
        ['add', 'remove'].forEach((kind) => {
          const btn = blocksBtns.querySelector(
            `.wpforms-field-repeater-display-blocks-buttons-${kind}`,
          );
          if (!btn) return;
          const icon = btn.querySelector('i.dashicons');
          let span = btn.querySelector('span');
          if (!span) {
            span = document.createElement('span');
            btn.appendChild(span);
          }
          // Reset visibility + order.
          if (icon) icon.style.display = '';
          span.style.display = '';
          // Reset button styling tweaks.
          btn.style.cssText = '';
          if (mode === 'buttons') {
            if (icon) icon.style.display = 'none';
          } else if (mode === 'icons_with_text') {
            // Move icon AFTER span.
            if (icon && btn.firstChild === icon) btn.appendChild(icon);
          } else if (mode === 'icons') {
            span.style.display = 'none';
          } else if (mode === 'plain_text') {
            if (icon) icon.style.display = 'none';
            btn.style.cssText =
              'background:transparent;border:none;color:#066aab;padding:0;cursor:pointer;text-decoration:underline;';
          } else {
            // buttons_with_icons: ensure icon comes first.
            if (icon && btn.firstChild !== icon) btn.insertBefore(icon, btn.firstChild);
          }
        });
      },
    },

    // ─ Repeater: Layout preset -> disable Field Size when not 1-column ──
    // Plugin locks Field Size when a multi-column preset is selected,
    //   because column width drives field width. The hint sub-label
    //   ".wpforms-notice-field-size" is un-hidden in that case.
    {
      label: 'repeater-preset-size-lock',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'radio' &&
        el.closest('.wpforms-field-option-row-preset') !== null &&
        el.closest('.wpforms-field-option-repeater') !== null,
      apply: (el) => {
        if (!el.checked) return;
        const fieldId = getFieldId(el);
        if (!fieldId) return;
        const sizeSelect = document.getElementById(`wpforms-field-option-${fieldId}-size`);
        const notice = sizeSelect?.parentElement?.querySelector('.wpforms-notice-field-size');
        if (!sizeSelect) return;
        const isMultiCol = el.value !== '100';
        sizeSelect.disabled = isMultiCol;
        if (notice) notice.style.display = isMultiCol ? '' : 'none';
      },
    },

    // ─ Repeater: Add / Remove button labels ─────────────────────────────
    {
      label: 'repeater-button-add-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-button_add_label$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const span = field.querySelector('.wpforms-field-repeater-display-blocks-buttons-add span');
        if (span) span.textContent = el.value;
      },
    },
    {
      label: 'repeater-button-remove-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-button_remove_label$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const span = field.querySelector('.wpforms-field-repeater-display-blocks-buttons-remove span');
        if (span) span.textContent = el.value;
      },
    },

    // ─ Repeater: rows_limit_min / rows_limit_max (frontend-prep) ────────
    {
      label: 'repeater-rows-limit',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'number' &&
        /^wpforms-field-option-\d+-rows_limit_(min|max)$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const which = el.id.endsWith('_min') ? 'rowsLimitMin' : 'rowsLimitMax';
        if (el.value !== '') field.dataset[which] = el.value;
        else delete field.dataset[which];
      },
    },

    // ─ Pagebreak: Title -> bottom "Page Break" divider label ────────────
    // Adding a Page Break field renders TWO canvas elements in the live
    // plugin: a top "First Page / Progress Indicator" wrap and a bottom
    // dark "Page Break" divider. The snapshot only captured the top one,
    // so the init pass below injects the missing bottom divider. The
    // Title input renames the BOTTOM divider's label (plugin semantics).
    {
      label: 'pagebreak-title',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-title$/.test(el.id) &&
        el.closest('.wpforms-field-option-pagebreak') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        // Title lives on the bottom divider inside the injected -normal wrap.
        const normal = field.parentElement?.querySelector(
          `.wpforms-pagebreak-normal[data-field-id="${field.dataset.fieldId}"]`,
        );
        const titleSpan = normal?.querySelector('.wpforms-pagebreak-title');
        // CSS adds the wrapping "(" / ")" via :before/:after when not empty.
        if (titleSpan) titleSpan.textContent = el.value;
      },
    },

    // ─ Pagebreak: Progress Indicator type select ────────────────────────
    // Swaps both the type class AND the inner markup, since each type
    // (progress / circles / connector / none) renders a different DOM shape.
    {
      label: 'pagebreak-indicator',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-indicator$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field) return;
        const indicator = field.querySelector('.wpforms-page-indicator');
        if (!indicator) return;
        // Read current color + progress text so the rebuild preserves them.
        const colorInput = document.getElementById(`wpforms-field-option-${fieldId}-indicator_color`);
        const textInput = document.getElementById(`wpforms-field-option-${fieldId}-progress_text`);
        const color = colorInput?.value?.trim() || '#066aab';
        const progressText = textInput?.value || 'Step {current_page} of {last_page}';
        // Reset type classes.
        Array.from(indicator.classList)
          .filter((c) => c.startsWith('wpforms-page-indicator-'))
          .forEach((c) => indicator.classList.remove(c));
        const type = el.value;
        if (type && type !== 'none') {
          indicator.classList.add(`wpforms-page-indicator-${type}`);
          indicator.style.display = '';
          indicator.innerHTML = buildPageIndicatorInner(type, color, progressText);
        } else {
          indicator.style.display = 'none';
          indicator.innerHTML = '';
        }
        field.dataset.indicator = type;
      },
    },

    // ─ Pagebreak: Nav Align select -> class on buttons wrap ─────────────
    {
      label: 'pagebreak-nav-align',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-nav_align$/.test(el.id),
      apply: (el) => {
        const fieldId = getFieldId(el);
        if (!fieldId) return;
        const buttons = document.querySelector(
          `.wpforms-pagebreak-normal[data-field-id="${fieldId}"] .wpforms-pagebreak-buttons`,
        );
        if (!buttons) return;
        Array.from(buttons.classList)
          .filter((c) => c.startsWith('wpforms-pagebreak-buttons-'))
          .forEach((c) => buttons.classList.remove(c));
        if (el.value) buttons.classList.add(`wpforms-pagebreak-buttons-${el.value}`);
      },
    },

    // ─ Pagebreak: Progress Text -> steps span content ───────────────────
    {
      label: 'pagebreak-progress-text',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-progress_text$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const steps = field.querySelector('.wpforms-page-indicator-steps');
        if (!steps) return;
        steps.innerHTML = renderProgressSteps(el.value, 1, 2);
      },
    },

    // ─ Pagebreak: Indicator Color (minicolors swatch + text input) ──────
    // Updates swatch + recolors the injected progress bar live.
    {
      label: 'pagebreak-indicator-color',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-indicator_color') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const value = el.value.trim() || '#066aab';
        const swatch = el.parentElement?.querySelector('.minicolors-swatch-color');
        if (swatch) swatch.style.backgroundColor = value;
        // progress: recolor the progress bar.
        const progressBar = field.querySelector('.wpforms-page-indicator-page-progress');
        if (progressBar) progressBar.style.backgroundColor = value;
        // circles + connector: recolor the active page-number circle.
        const activeNumber = field.querySelector(
          '.wpforms-page-indicator-page.active .wpforms-page-indicator-page-number',
        );
        if (activeNumber) activeNumber.style.backgroundColor = value;
        // connector only: recolor the active triangle's border-top-color.
        const activeTriangle = field.querySelector(
          '.wpforms-page-indicator-page.active .wpforms-page-indicator-page-triangle',
        );
        if (activeTriangle) activeTriangle.style.borderTopColor = value;
        field.dataset.indicatorColor = value;
      },
    },
    {
      label: 'pagebreak-indicator-color-swatch',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpforms-field-option-row-indicator_color') !== null &&
        (el.closest('.minicolors-swatch') !== null ||
         el.closest('.minicolors-panel') !== null),
      apply: (el) => {
        const row = el.closest('.wpforms-field-option-row-indicator_color');
        if (!row) return;
        const native = ensureNativeColorInput(row, '#066aab');
        if (native) native.click();
      },
    },

    // ─ Number: Min / Max range -> canvas input min/max attrs ───────────
    {
      label: 'number-min-max',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'number' &&
        el.closest('.wpforms-field-option-row-min_max') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const target = field.querySelector('.primary-input');
        if (!(target instanceof HTMLInputElement)) return;
        const isMin = el.classList.contains('wpforms-numbers-min');
        if (isMin) {
          if (el.value !== '') target.setAttribute('min', el.value);
          else target.removeAttribute('min');
        } else {
          if (el.value !== '') target.setAttribute('max', el.value);
          else target.removeAttribute('max');
        }
      },
    },

    // ─ Universal: Sidebar tab toggle (Add Fields / Field Options) ───────
    // Clicking the "Add Fields" or "Field Options" tab nav swaps the
    // .active class on the <a> and toggles display of the two tab-content
    // panels (#wpforms-add-fields-tab and #wpforms-field-options).
    {
      label: 'sidebar-tab-toggle',
      event: 'click',
      match: (el) => {
        const tab = el.closest?.('#add-fields, #field-options');
        if (!tab) return false;
        return tab.classList.contains('wpforms-tab');
      },
      apply: (el) => {
        const tab = el.closest('#add-fields, #field-options');
        const tabs = tab.parentElement?.querySelectorAll('.wpforms-tab');
        if (!tabs) return;
        tabs.forEach((t) => {
          const a = t.querySelector('a');
          if (a) a.classList.toggle('active', t === tab);
        });
        const addFields = document.getElementById('wpforms-add-fields-tab');
        const fieldOptions = document.getElementById('wpforms-field-options');
        const showAddFields = tab.id === 'add-fields';
        if (addFields) addFields.style.display = showAddFields ? 'block' : 'none';
        if (fieldOptions) fieldOptions.style.display = showAddFields ? 'none' : 'block';
      },
    },

    // ─ Universal: Smart Tags toggle (tag icon click) ────────────────────
    // Clicking the .wpforms-show-smart-tags icon next to a Default Value
    // (or any) Smart Tags widget toggles the .closed class on the sibling
    // .insert-smart-tag-dropdown. The dropdown markup is already in the
    // snapshot — we just need to remove `closed` to show it.
    {
      label: 'smart-tags-toggle',
      event: 'click',
      match: (el) => el.closest?.('.wpforms-show-smart-tags') !== null,
      apply: (el) => {
        const trigger = el.closest('.wpforms-show-smart-tags');
        const container = trigger?.closest('.wpforms-smart-tags-widget-container');
        const dropdown = container?.querySelector('.insert-smart-tag-dropdown');
        if (!dropdown) return;
        // Close any other open Smart Tags dropdowns first.
        document.querySelectorAll('.insert-smart-tag-dropdown:not(.closed)').forEach((d) => {
          if (d !== dropdown) d.classList.add('closed');
        });
        dropdown.classList.toggle('closed');
      },
    },

    // ─ Universal: Smart Tags item click -> insert pill into widget ──────
    // Clicking a Smart Tags <li data-value="..."> appends a pill span to
    // the contenteditable widget matching the live plugin shape:
    //   <span class="tag" contenteditable="false" data-value="...">Label<i class="fa fa-times-circle"></i></span>
    // Then closes the dropdown and fires the widget's `input` event so
    // canvas mirrors update.
    {
      label: 'smart-tags-insert',
      event: 'click',
      match: (el) => {
        const li = el.closest?.('.insert-smart-tag-dropdown li[data-value]');
        if (!li) return false;
        return li.dataset.value && li.dataset.value !== '0';
      },
      apply: (el) => {
        const li = el.closest('li[data-value]');
        const dropdown = li.closest('.insert-smart-tag-dropdown');
        const container = dropdown.closest('.wpforms-smart-tags-widget-container');
        const widget = container?.querySelector('.wpforms-smart-tags-widget-input');
        if (!widget) return;
        const value = li.dataset.value;
        // Label text is in the <span.wpforms-smart-tags-widget-item> child;
        // fall back to data-value if no label found.
        const labelEl = li.querySelector('.wpforms-smart-tags-widget-item');
        const label = (labelEl?.textContent || value).trim();
        // Build the pill.
        const pill = document.createElement('span');
        pill.className = 'tag';
        pill.contentEditable = 'false';
        pill.dataset.value = value;
        pill.textContent = label;
        const trash = document.createElement('i');
        trash.className = 'fa fa-times-circle';
        trash.title = 'Delete smart tag';
        pill.appendChild(trash);
        // Insert with a single space separator (matches plugin output).
        const last = widget.lastChild;
        if (last && !(last.nodeType === Node.TEXT_NODE && /\s$/.test(last.nodeValue || ''))) {
          widget.appendChild(document.createTextNode(' '));
        }
        widget.appendChild(pill);
        widget.appendChild(document.createTextNode(' '));
        dropdown.classList.add('closed');
        widget.dispatchEvent(new Event('input', { bubbles: true }));
      },
    },

    // ─ Universal: Smart Tags pill delete (trash icon click) ─────────────
    {
      label: 'smart-tags-pill-delete',
      event: 'click',
      match: (el) =>
        el.closest?.('.wpforms-smart-tags-widget-input .tag .fa-times-circle') !== null,
      apply: (el) => {
        const pill = el.closest('.tag');
        const widget = pill?.closest('.wpforms-smart-tags-widget-input');
        if (!pill || !widget) return;
        pill.remove();
        widget.dispatchEvent(new Event('input', { bubbles: true }));
      },
    },

    // ─ Universal: Smart Tags search filter ──────────────────────────────
    {
      label: 'smart-tags-search',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'search' &&
        el.closest('.wpforms-builder-dropdown-list-search-container') !== null,
      apply: (el) => {
        const dropdown = el.closest('.insert-smart-tag-dropdown');
        if (!dropdown) return;
        const query = el.value.trim().toLowerCase();
        dropdown.querySelectorAll('li[data-value]').forEach((li) => {
          if (li.dataset.value === '0') return; // headings always visible
          const text = li.textContent.toLowerCase();
          li.style.display = (!query || text.includes(query)) ? '' : 'none';
        });
      },
    },

    // ─ Universal: Conditional Logic toggle (Smart Logic tab) ────────────
    // Same UI across all supported field types. Scoped to
    //   .wpforms-conditional-block-field so it doesn't fire on
    //   Notifications/Confirmations/Payment conditional logic toggles.
    // Lazy-injects the real wpforms-conditional-groups markup (uses real
    //   class names so the snapshot's bundled CSS styles it natively).
    {
      label: 'universal-conditional-logic',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        /^wpforms-field-option-\d+-conditional_logic$/.test(el.id) &&
        el.closest('.wpforms-conditional-block-field') !== null,
      apply: (el) => {
        const block = el.closest('.wpforms-conditional-block-field');
        if (!block) return;
        const fieldId = el.getAttribute('data-reference') || el.id.match(/\d+/)?.[0];
        let groups = block.querySelector(`#wpforms-conditional-groups-fields-${fieldId}`);
        if (!groups) {
          groups = buildConditionalLogicGroups(el);
          block.appendChild(groups);
        }
        groups.style.display = el.checked ? '' : 'none';
      },
    },

    // ─ Conditional Logic: Field-select change ───────────────────────────
    // Rebuild value cell based on chosen field's type. Choice-based fields
    // (radio / checkbox / select / payment-multiple / etc. / rating) get a
    // <select> with the field's choices. Text-based fields get a text or
    // number input.
    {
      label: 'conditional-logic-field-change',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.classList.contains('wpforms-conditional-field'),
      apply: (el) => {
        const row = el.closest('.wpforms-conditional-row');
        if (!row) return;
        const valueCell = row.querySelector('td.value');
        const operatorSelect = row.querySelector('.wpforms-conditional-operator');
        if (!valueCell || !operatorSelect) return;
        const fieldId = row.dataset.fieldId || '';
        const groupIndex = el.dataset.groupid || '0';
        const ruleIndex = el.dataset.ruleid || '0';
        const opt = el.options[el.selectedIndex];
        const fieldType = opt?.dataset.type || '';
        valueCell.innerHTML = buildConditionalValueCellHTML(
          fieldId, groupIndex, ruleIndex, fieldType, operatorSelect.value,
        );
      },
    },

    // ─ Conditional Logic: Operator-select change ────────────────────────
    // Operator dictates input shape: empty/not-empty → disabled input,
    // contains/starts/ends → text, >/< → number, is/is-not → respect type.
    {
      label: 'conditional-logic-operator-change',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.classList.contains('wpforms-conditional-operator'),
      apply: (el) => {
        const row = el.closest('.wpforms-conditional-row');
        if (!row) return;
        const valueCell = row.querySelector('td.value');
        const fieldSelect = row.querySelector('.wpforms-conditional-field');
        if (!valueCell || !fieldSelect) return;
        const fieldId = row.dataset.fieldId || '';
        const groupIndex = fieldSelect.dataset.groupid || '0';
        const ruleIndex = fieldSelect.dataset.ruleid || '0';
        const opt = fieldSelect.options[fieldSelect.selectedIndex];
        const fieldType = opt?.dataset.type || '';
        valueCell.innerHTML = buildConditionalValueCellHTML(
          fieldId, groupIndex, ruleIndex, fieldType, el.value,
        );
      },
    },

    // ─ Conditional Logic: Add rule (And button) ─────────────────────────
    {
      label: 'conditional-logic-rule-add',
      event: 'click',
      match: (el) => el.closest?.('.wpforms-conditional-rule-add') !== null,
      apply: (el) => {
        const group = el.closest('.wpforms-conditional-group');
        const tbody = group?.querySelector('table tbody');
        if (!tbody || !group) return;
        const fieldId = group.dataset.reference;
        const groupIndex = parseInt(group.dataset.groupIndex || '0', 10);
        const nextRuleIndex = tbody.querySelectorAll('.wpforms-conditional-row').length;
        tbody.appendChild(buildConditionalLogicRow(fieldId, groupIndex, nextRuleIndex));
      },
    },

    // ─ Conditional Logic: Delete rule (trash icon) ──────────────────────
    {
      label: 'conditional-logic-rule-delete',
      event: 'click',
      match: (el) => el.closest?.('.wpforms-conditional-rule-delete') !== null,
      apply: (el) => {
        const row = el.closest('.wpforms-conditional-row');
        const tbody = row?.parentElement;
        if (!row || !tbody) return;
        // Don't allow deleting the last rule in the only group.
        const allRules = tbody.closest('.wpforms-conditional-groups')
          ?.querySelectorAll('.wpforms-conditional-row');
        if (!allRules || allRules.length <= 1) return;
        row.remove();
      },
    },

    // ─ Conditional Logic: Add new group (OR) ────────────────────────────
    {
      label: 'conditional-logic-group-add',
      event: 'click',
      match: (el) => el.closest?.('.wpforms-conditional-groups-add') !== null,
      apply: (el) => {
        const groups = el.closest('.wpforms-conditional-groups');
        if (!groups) return;
        const existing = groups.querySelectorAll('.wpforms-conditional-group');
        const fieldId = existing[0]?.dataset.reference || '';
        const newGroup = buildConditionalLogicGroup(fieldId, existing.length);
        // Insert before the Add-New-Group button (which is the last child).
        groups.insertBefore(newGroup, el.closest('button'));
      },
    },

    // ─ Name: Subfield Default Value (Smart Tags widget per subfield) ────
    // Name field has format-specific subfield rows (simple / first / middle
    //   / last), each containing its own default-value smart-tags widget
    //   inside a `.default` column. Mirror the widget text to the canvas
    //   subfield input's value attr.
    {
      label: 'name-subfield-default',
      event: 'input',
      match: (el) =>
        el instanceof HTMLElement &&
        el.classList.contains('wpforms-smart-tags-widget-input') &&
        el.closest('.default') !== null &&
        el.closest('[data-subfield]') !== null &&
        el.closest('.wpforms-field-option-name') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const row = el.closest('[data-subfield]');
        const subfield = row?.dataset.subfield;
        if (!subfield) return;
        const target = subfield === 'simple'
          ? field.querySelector('.primary-input')
          : field.querySelector(`.wpforms-${subfield} input`);
        if (!target) return;
        const v = serializeSmartTagsWidget(el);
        target.setAttribute('value', v);
        if (target instanceof HTMLInputElement) target.value = v;
      },
    },

    // ─ Email: Confirmation Placeholder ─────────────────────────────────
    {
      label: 'email-confirmation-placeholder',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-confirmation_placeholder') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const confirmInput = field.querySelector('.wpforms-confirm-confirmation input.secondary-input');
        if (confirmInput) confirmInput.setAttribute('placeholder', el.value);
      },
    },

    // ─ Universal: Hide sublabels toggle ─────────────────────────────────
    // Plugin: toggles `sublabel_hide` class on the field which CSS uses
    //   to hide all `.wpforms-sub-label` children.
    {
      label: 'universal-sublabel-hide',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-sublabel_hide') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        field.classList.toggle('sublabel_hide', el.checked);
      },
    },

    // ─ Universal: Limit-toggle body reveal (data-toggle pattern) ────────
    // The plugin renders many sub-row groups as:
    //   <input type="checkbox" id="X" name="..."> +
    //   <div data-toggle="..." data-toggle-value="1" style="display:none">.
    // When the toggle checkbox flips, the body shows/hides. Snapshot CSS
    // does not auto-bind this, so we wire it generically here.
    {
      label: 'universal-toggle-body',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.classList.contains('wpforms-panel-field-toggle'),
      apply: (el) => {
        const name = el.getAttribute('name');
        if (!name) return;
        const bodies = document.querySelectorAll(
          `[data-toggle="${name}"][data-toggle-value="1"]`,
        );
        bodies.forEach((body) => {
          body.style.display = el.checked ? '' : 'none';
        });
      },
    },

    // ─ Choices: Icon Size sub-select ────────────────────────────────────
    {
      label: 'icon-choices-size',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-choices_icons_size') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const canvasUl = field.querySelector('ul.primary-input');
        if (!canvasUl || !canvasUl.classList.contains('wpforms-icon-choices')) return;
        fadeSwap(field, () => {
          canvasUl.classList.remove(
            'wpforms-icon-choices-small',
            'wpforms-icon-choices-medium',
            'wpforms-icon-choices-large',
          );
          canvasUl.classList.add(`wpforms-icon-choices-${el.value}`);
        });
      },
    },

    // ─ Password: Strength toggle ────────────────────────────────────────
    // Plugin: updatePasswordStrengthControls toggles wpforms-hidden on
    //   #wpforms-field-option-row-{id}-password-strength-level. Panel-only.
    {
      label: 'password-strength',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-password-strength') !== null,
      apply: (el) => {
        const fieldId = getFieldId(el);
        if (!fieldId) return;
        toggleRow(`wpforms-field-option-row-${fieldId}-password-strength-level`, el.checked);
      },
    },

    // ─ Layout: Preset (1 col / 50-50 / 33-33-33 / 25-25-25-25 / etc.) ──
    // Plugin's presetChange rebuilds column DOM via generatePreviewColumns
    // and re-attaches any dropped fields. Snapshot fields are empty
    // placeholders, so we just regenerate the column wrappers from the
    // preset value (parts split on '-' → widths).
    {
      label: 'layout-preset',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'radio' &&
        el.closest('.wpforms-field-option-row-preset') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const cols = field.querySelector('.wpforms-field-layout-columns');
        if (!cols) return;
        const widths = el.value.split('-').map((w) => parseInt(w, 10)).filter(Number.isFinite);
        if (!widths.length) return;
        // Preserve any non-placeholder children per existing column.
        const existing = Array.from(cols.querySelectorAll(':scope > .wpforms-layout-column'))
          .map((col) =>
            Array.from(col.children).filter(
              (c) => !c.classList.contains('wpforms-layout-column-placeholder'),
            ),
          );
        fadeSwap(cols, () => {
          cols.innerHTML = '';
          widths.forEach((w, i) => {
            const col = document.createElement('div');
            col.className = `wpforms-layout-column wpforms-layout-column-${w} ui-sortable`;
            const placeholder = document.createElement('div');
            placeholder.className = 'wpforms-layout-column-placeholder';
            placeholder.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">' +
              '<path d="M11.25 14H0.75C0.3125 14 0 13.6875 0 13.25V13.5C0 13.0938 0.3125 12.75 0.75 12.75H11.25C11.6562 12.75 12 13.0938 12 13.5V13.25C12 13.6875 11.6562 14 11.25 14ZM4 0.75C4 0.34375 4.3125 0 4.75 0H7.25C7.65625 0 8 0.34375 8 0.75V5H10.7188C11.2812 5 11.5625 5.6875 11.1562 6.09375L6.40625 10.8438C6.1875 11.0625 5.78125 11.0625 5.5625 10.8438L0.8125 6.09375C0.40625 5.6875 0.6875 5 1.25 5H4V0.75Z" fill="#A6A6A6"></path>' +
              '</svg><span>Add Fields</span>';
            col.appendChild(placeholder);
            // Re-attach any prior children at this index (best-effort).
            if (existing[i]) existing[i].forEach((c) => col.appendChild(c));
            cols.appendChild(col);
          });
        });
      },
    },

    // ─ Layout: Display (Rows / Columns) ─────────────────────────────────
    // Plugin: displayChange swaps wpforms-layout-display-rows /
    //   wpforms-layout-display-columns on .wpforms-field-layout-columns,
    //   mirrors the rows class on the panel preset row, and adjusts the
    //   inner field margin-bottom. Skipping the preset-row class mirror
    //   (cosmetic; affects sub-field icon labels in panel only).
    {
      label: 'layout-display',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-display') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const cols = field.querySelector('.wpforms-field-layout-columns');
        if (!cols) return;
        const isRows = el.value === 'rows';
        fadeSwap(cols, () => {
          cols.classList.toggle('wpforms-layout-display-rows', isRows);
          cols.classList.toggle('wpforms-layout-display-columns', !isRows);
          cols.querySelectorAll('.wpforms-field').forEach((subField) => {
            subField.style.marginBottom = isRows ? '' : '5px';
          });
        });
        const presetRow = document.querySelector(
          `#wpforms-field-option-row-${getFieldId(el)}-preset`,
        );
        if (presetRow) presetRow.classList.toggle('wpforms-layout-display-rows', isRows);
      },
    },

    // ─ File Upload: Max File Uploads (max_file_number) ──────────────────
    // Plugin: fieldFileUploadPreviewUpdate updates the .modern-hint text
    //   using wpforms_builder.file_upload.preview_hint (a localized
    //   "You can upload up to {maxFileNumber} files." string). The snapshot
    //   doesn't ship that global, so we hardcode the English template.
    //   Hint shows when max > 1, hides when max <= 1.
    {
      label: 'file-upload-max',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'number' &&
        el.closest('.wpforms-field-option-row-max_file_number') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const hint = field.querySelector('.modern-hint');
        if (!hint) return;
        const max = parseInt(el.value, 10);
        const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
        hint.textContent = `You can upload up to ${safeMax} files.`;
        hint.classList.toggle('wpforms-hide', safeMax <= 1);
      },
    },

    // ─ File Upload: Access Restrictions toggle ──────────────────────────
    // Plugin: optionsHandler() reveals user_restrictions + password_restrictions
    //   panel rows when is_restricted is on. user_roles_restrictions and
    //   user_names_restrictions cascade on user_restrictions === 'logged'.
    {
      label: 'file-upload-access-restrictions',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-file-upload-access-restrictions'),
      apply: (el) => {
        const fieldId = getFieldId(el);
        if (!fieldId) return;
        const enabled = el.checked;
        toggleRow(`wpforms-field-option-row-${fieldId}-user_restrictions`, enabled);
        toggleRow(`wpforms-field-option-row-${fieldId}-password_restrictions`, enabled);
        const userRestrictions = document.getElementById(
          `wpforms-field-option-${fieldId}-user_restrictions`,
        );
        const loggedIn = enabled && userRestrictions?.value === 'logged';
        toggleRow(`wpforms-field-option-row-${fieldId}-user_roles_restrictions`, loggedIn);
        toggleRow(`wpforms-field-option-row-${fieldId}-user_names_restrictions`, loggedIn);
      },
    },

    // ─ File Upload: User Restrictions select (cascade from access toggle)
    // Plugin: userRestrictionsOptionHandler toggles roles + names rows
    //   based on whether 'Logged-in Users' is picked.
    {
      label: 'file-upload-user-restrictions',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.classList.contains('wpforms-file-upload-user-restrictions'),
      apply: (el) => {
        const fieldId = getFieldId(el);
        if (!fieldId) return;
        const loggedIn = el.value === 'logged';
        toggleRow(`wpforms-field-option-row-${fieldId}-user_roles_restrictions`, loggedIn);
        toggleRow(`wpforms-field-option-row-${fieldId}-user_names_restrictions`, loggedIn);
      },
    },

    // ─ File Upload: Camera Enabled toggle ───────────────────────────────
    // Plugin: toggleCameraOptions reveals camera_format and
    //   camera_aspect_ratio panel rows. Canvas (classic style only): show
    //   the .wpforms-file-upload-capture-camera-classic "Capture With Your
    //   Camera" text by toggling wpforms-hidden.
    {
      label: 'file-upload-camera-enabled',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-file-upload-camera-enabled-toggle'),
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const enabled = el.checked;
        toggleRow(`wpforms-field-option-row-${fieldId}-camera_format`, enabled);
        toggleRow(`wpforms-field-option-row-${fieldId}-camera_aspect_ratio`, enabled);
        const canvasCamera = field.querySelector(
          '.wpforms-file-upload-capture-camera-classic',
        );
        if (canvasCamera) {
          canvasCamera.classList.toggle('wpforms-hidden', !enabled);
        }
      },
    },

    // ─ Rich Text: Allow Media Uploads (media_enabled) ───────────────────
    // Plugin: toggle visibility of the media_controls panel row + toggle
    //   .wpforms-field-richtext-media-enabled on the canvas toolbar grp.
    {
      label: 'richtext-media-enabled',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-media_enabled') !== null,
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const toolbar = field.querySelector('.wpforms-richtext-wrap .mce-toolbar-grp');
        const mediaControlsRow = document.getElementById(
          `wpforms-field-option-row-${fieldId}-media_controls`,
        );
        if (mediaControlsRow) {
          mediaControlsRow.style.display = el.checked ? '' : 'none';
        }
        if (toolbar) {
          fadeSwap(toolbar, () => {
            toolbar.classList.toggle('wpforms-field-richtext-media-enabled', el.checked);
          });
        }
      },
    },

    // ─ Number Slider helpers ────────────────────────────────────────────
    // The canvas has:
    //   <input type="range" id="wpforms-number-slider-{id}" ...>
    //   <div id="wpforms-number-slider-hint-{id}" data-hint="Selected Value: {value}">
    //     Selected Value: <b>0</b>
    //   </div>
    // The hint is re-rendered by substituting {value} in data-hint with the
    // current slider value, wrapped in <b>. We build it via createElement
    // so user-supplied template strings can't inject markup.

    // ─ Number Slider: Default Value ─────────────────────────────────────
    {
      label: 'slider-default',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-number-slider-default-value'),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const slider = field.querySelector('input[type="range"].wpforms-number-slider');
        const hint = field.querySelector('.wpforms-number-slider-hint');
        if (slider) slider.value = el.value;
        if (hint) renderSliderHint(hint, el.value);
      },
    },

    // ─ Number Slider: Min ───────────────────────────────────────────────
    // Also clamps default value up if it's now below the new min, matching
    // the plugin's updateNumberSliderDefaultValueAttr behavior.
    {
      label: 'slider-min',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-number-slider-min'),
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const slider = field.querySelector('input[type="range"].wpforms-number-slider');
        if (slider) slider.setAttribute('min', el.value);
        clampSliderDefault(fieldId, el.value, 'min');
      },
    },

    // ─ Number Slider: Max ───────────────────────────────────────────────
    // Also clamps default value down if it's now above the new max.
    {
      label: 'slider-max',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-number-slider-max'),
      apply: (el) => {
        const field = getField(el);
        const fieldId = getFieldId(el);
        if (!field || !fieldId) return;
        const slider = field.querySelector('input[type="range"].wpforms-number-slider');
        if (slider) slider.setAttribute('max', el.value);
        clampSliderDefault(fieldId, el.value, 'max');
      },
    },

    // ─ Number Slider: Step ──────────────────────────────────────────────
    {
      label: 'slider-step',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-number-slider-step'),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const slider = field.querySelector('input[type="range"].wpforms-number-slider');
        if (slider) slider.setAttribute('step', el.value);
      },
    },

    // ─ Number Slider: Value Display (format string) ─────────────────────
    // Plugin: update data-hint on the hint element, then re-render using
    // the current default value.
    {
      label: 'slider-value-display',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-number-slider-value-display'),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const hint = field.querySelector('.wpforms-number-slider-hint');
        const slider = field.querySelector('input[type="range"].wpforms-number-slider');
        if (!hint) return;
        hint.dataset.hint = el.value;
        renderSliderHint(hint, slider?.value ?? '');
      },
    },

    // ─ Rating: Icon Color ───────────────────────────────────────────────
    // Plugin: .wpforms-field-option-row-icon_color input.wpforms-color-picker
    //   -> set color on .wpforms-rating-field-icons i.fa.
    // Note: the minicolors swatch overlay isn't wired in snapshots; the
    // input is a plain text field with a hex value. Editing the hex live
    // recolors the canvas icons.
    {
      label: 'rating-icon-color',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('wpforms-color-picker') &&
        el.closest('.wpforms-field-option-row-icon_color') !== null,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const color = el.value || el.dataset.fallbackColor || '';
        field
          .querySelectorAll('.wpforms-rating-field-icons i.fa')
          .forEach((icon) => {
            icon.style.color = color;
          });
      },
    },

    // ─ Rating: Label Position (Above / Below) ───────────────────────────
    // Plugin: toggle `.wpforms-rating-field-labels-position-above` on the
    //   labels wrap when value === 'above'.
    {
      label: 'rating-label-position',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-label_position$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const wrap = field.querySelector('.wpforms-rating-field-labels');
        if (!wrap) return;
        fadeSwap(wrap, () => {
          wrap.classList.toggle(
            'wpforms-rating-field-labels-position-above',
            el.value === 'above',
          );
        });
      },
    },

    // ─ Rating: Lowest / Highest Label text ──────────────────────────────
    // Plugin: set text on .wpforms-rating-field-{lowest|highest}-label;
    //   hide the labels container entirely when both spans are empty.
    {
      label: 'rating-edge-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        /^wpforms-field-option-\d+-(lowest|highest)_label$/.test(el.id),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const which = el.id.endsWith('-lowest_label') ? 'lowest' : 'highest';
        const target = field.querySelector(`.wpforms-rating-field-${which}-label`);
        if (target) target.textContent = el.value;
        const wrap = field.querySelector('.wpforms-rating-field-labels');
        if (!wrap) return;
        const anyText = Array.from(wrap.querySelectorAll('.wpforms-sub-label'))
          .some((sub) => sub.textContent.trim() !== '');
        wrap.classList.toggle('wpforms-hidden', !anyText);
      },
    },

    // ─ Address: Hide subfield toggle ────────────────────────────────────
    // Hide toggles next to Address Line 2 / ZIP / Country. Real WPForms
    // doesn't update the builder canvas live (serialization-only), but the
    // tutorial demo wants the canvas to reflect the toggle. data-subfield
    // on the row maps directly to canvas class `.wpforms-{subfield}`.
    {
      label: 'address-subfield-hide',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.classList.contains('wpforms-subfield-hide'),
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const row = el.closest('.wpforms-field-option-row');
        const subfield = row?.dataset.subfield;
        if (!subfield) return;
        fadeSwap(field, () => {
          field
            .querySelectorAll(`.wpforms-${subfield}`)
            .forEach((sub) => sub.classList.toggle('wpforms-hide', el.checked));
        });
      },
    },

    // ─ Phone: Format (Smart / US / International) ───────────────────────
    // Plugin sets a data-format attribute on .wpforms-field-phone-input-container.
    // Phone has no .format-selected wrapper, so universal-format no-ops here.
    {
      label: 'phone-format',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-format$/.test(el.id) &&
        getFieldType(el) === 'phone',
      apply: (select) => {
        const field = getField(select);
        if (!field) return;
        const target = field.querySelector('.wpforms-field-phone-input-container');
        if (!target) return;
        target.setAttribute('data-format', select.value);
      },
    },

    // ─ Address: Scheme (US / International) ─────────────────────────────
    // Plugin: .wpforms-field-option-row-scheme select ->
    //   add .wpforms-hide to all .wpforms-address-scheme; remove from the
    //   one matching the selected value. (We skip the panel-internal
    //   state/country attribute juggling — purely serialization.)
    {
      label: 'address-scheme',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-scheme') !== null,
      apply: (select) => {
        const field = getField(select);
        if (!field) return;
        const visible = field.querySelector(
          `.wpforms-address-scheme-${select.value}`,
        );
        const fadeTarget = visible || field;
        fadeSwap(fadeTarget, () => {
          field
            .querySelectorAll('.wpforms-address-scheme')
            .forEach((el) => el.classList.add('wpforms-hide'));
          field
            .querySelectorAll(`.wpforms-address-scheme-${select.value}`)
            .forEach((el) => el.classList.remove('wpforms-hide'));
        });
      },
    },

    // ─ Universal: Format select ─────────────────────────────────────────
    // Covers Name (simple/first-last/first-middle-last), Date/Time
    // (date/time/date-time), Phone (us/international/smart), and any future
    // field whose .format-selected wrap takes a format-selected-{value}
    // class. Plugin handler: .wpforms-field-option-row-format select ->
    //   field .format-selected and option panel .format-selected both get
    //   their classList reset to `format-selected format-selected-{val}`.
    {
      label: 'universal-format',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        /^wpforms-field-option-\d+-format$/.test(el.id),
      apply: (select) => {
        const field = getField(select);
        if (!field) return;
        const panel = select.closest('.wpforms-field-option');
        const targets = [field.querySelector('.format-selected')];
        if (panel) targets.push(panel.querySelector('.format-selected'));
        const fadeTarget = targets[0];
        if (!fadeTarget) return;
        fadeSwap(fadeTarget, () => {
          targets.forEach((el) => {
            if (!el) return;
            Array.from(el.classList)
              .filter((c) => c.startsWith('format-selected-'))
              .forEach((c) => el.classList.remove(c));
            el.classList.add(`format-selected-${select.value}`);
          });
        });
      },
    },

    // ─ Choices: canvas re-sync when in Image/Icon mode ──────────────────
    // In image/icon mode the canvas li markup is richer than the bare
    // `<input> Label` shape. After any choice mutation (add/remove/label
    // edit/default toggle), re-render the full canvas list via
    // renderCanvasChoices so the visual matches. These 4 transitions run
    // AFTER the corresponding base handlers (registry order), then
    // overwrite the bare-li mutation with the correct image/icon markup.
    {
      label: 'choices-resync-add',
      event: 'click',
      match: (el) => {
        if (!el.closest?.('a.add')) return false;
        if (!el.closest('.choices-list')) return false;
        const field = getField(el);
        if (!field) return false;
        const ul = field.querySelector('ul.primary-input');
        return !!ul && (
          ul.classList.contains('wpforms-image-choices') ||
          ul.classList.contains('wpforms-icon-choices')
        );
      },
      apply: (el) => {
        const field = getField(el);
        if (field) renderCanvasChoices(field);
      },
    },
    {
      label: 'choices-resync-remove',
      event: 'click',
      match: (el) => {
        if (!el.closest?.('a.remove')) return false;
        if (!el.closest('.choices-list')) return false;
        const field = getField(el);
        if (!field) return false;
        const ul = field.querySelector('ul.primary-input');
        return !!ul && (
          ul.classList.contains('wpforms-image-choices') ||
          ul.classList.contains('wpforms-icon-choices')
        );
      },
      apply: (el) => {
        const field = getField(el);
        if (field) renderCanvasChoices(field);
      },
    },
    {
      label: 'choices-resync-label',
      event: 'input',
      match: (el) => {
        if (!(el instanceof HTMLInputElement)) return false;
        if (!el.classList.contains('label')) return false;
        if (!el.closest('.choices-list')) return false;
        const field = getField(el);
        if (!field) return false;
        const ul = field.querySelector('ul.primary-input');
        return !!ul && (
          ul.classList.contains('wpforms-image-choices') ||
          ul.classList.contains('wpforms-icon-choices')
        );
      },
      apply: (el) => {
        const field = getField(el);
        if (field) renderCanvasChoices(field);
      },
    },
    {
      label: 'choices-resync-default',
      event: 'change',
      match: (el) => {
        if (!(el instanceof HTMLInputElement)) return false;
        if (!el.classList.contains('default')) return false;
        if (!el.closest('.choices-list')) return false;
        const field = getField(el);
        if (!field) return false;
        const ul = field.querySelector('ul.primary-input');
        return !!ul && (
          ul.classList.contains('wpforms-image-choices') ||
          ul.classList.contains('wpforms-icon-choices')
        );
      },
      apply: (el) => {
        const field = getField(el);
        if (field) renderCanvasChoices(field);
      },
    },

    // ─ Likert: rebuild canvas table on rows/columns add/remove/label ────
    // Likert canvas is a <table>, not ul.primary-input. The universal
    // choices-add / choices-remove handlers run BEFORE this in registry
    // order. For remove, choices-remove detaches the clicked <li>, which
    // breaks closest('.wpforms-field-option-row') / getField() against the
    // click target. So match/apply look up the Likert field by document
    // query instead of climbing through the click target's parents.
    {
      label: 'likert-rows-cols-resync',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        // closest('a.add, a.remove') still works on the detached subtree
        // because the <a> is in the same removed <li>.
        if (!el.closest('a.add, a.remove')) return false;
        return !!document.querySelector('.wpforms-field-likert_scale');
      },
      apply: () => {
        document
          .querySelectorAll('.wpforms-field-likert_scale')
          .forEach(renderLikertCanvas);
      },
    },
    {
      label: 'likert-rows-cols-resync-input',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.choices-list') !== null &&
        getField(el)?.classList.contains('wpforms-field-likert_scale') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderLikertCanvas(field);
      },
    },

    // ─ Likert: Style select (Modern / Classic) ──────────────────────────
    // Plugin: .wpforms-field-option-row-style select -> table class swap.
    // Rebuild reads style from the panel.
    {
      label: 'likert-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-style') !== null &&
        getField(el)?.classList.contains('wpforms-field-likert_scale') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderLikertCanvas(field);
      },
    },

    // ─ Likert: Single Row toggle ────────────────────────────────────────
    // Plugin: also hides the Rows option panel row when single_row is on.
    {
      label: 'likert-single-row-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-single_row') !== null &&
        getField(el)?.classList.contains('wpforms-field-likert_scale') === true,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const fieldId = getFieldId(el);
        const rowsRow = document.getElementById(
          `wpforms-field-option-row-${fieldId}-rows`,
        );
        if (rowsRow) toggleRow(rowsRow.id, !el.checked);
        renderLikertCanvas(field);
      },
    },

    // ─ Likert: Multiple Responses toggle (radio -> checkbox inputs) ─────
    {
      label: 'likert-multiple-responses-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-multiple_responses') !== null &&
        getField(el)?.classList.contains('wpforms-field-likert_scale') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderLikertCanvas(field);
      },
    },

    // ─ NPS: Lowest Score Label / Highest Score Label (input) ────────────
    // Plugin: writes input value into .not-likely / .extremely-likely
    // <span>s in the canvas table thead.
    {
      label: 'nps-edge-labels',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        (el.closest('.wpforms-field-option-row-lowest_label') !== null ||
          el.closest('.wpforms-field-option-row-highest_label') !== null) &&
        getField(el)?.classList.contains('wpforms-field-net_promoter_score') === true,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        const isLowest = el.closest('.wpforms-field-option-row-lowest_label') !== null;
        const target = field.querySelector(isLowest ? '.not-likely' : '.extremely-likely');
        if (target) target.textContent = el.value;
      },
    },

    // ─ NPS: Style select (Modern / Classic) ─────────────────────────────
    // Plugin: table class swap, no markup rebuild.
    {
      label: 'nps-style',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-style') !== null &&
        getField(el)?.classList.contains('wpforms-field-net_promoter_score') === true,
      apply: (el) => {
        const field = getField(el);
        const table = field?.querySelector('table');
        if (!table) return;
        table.classList.remove('classic', 'modern');
        table.classList.add(el.value === 'classic' ? 'classic' : 'modern');
      },
    },

    // ─ Universal: Click canvas field → activate it + show its option panel
    // Needed for combined-field snapshots (e.g. builder-field-options-payment-fields)
    // where multiple fields share one snapshot. Clicking a canvas field swaps
    // the .active class and reveals the matching #wpforms-field-option-<id>
    // (others get wpforms-hidden). Also switches sidebar to Field Options tab.
    // Per-field-stripped snapshots only have one panel so this is a no-op there.
    {
      label: 'activate-canvas-field',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        const field = el.closest('.wpforms-field[data-field-id]');
        if (!field) return false;
        // Ignore clicks on duplicate/delete/menu icons.
        if (el.closest('.wpforms-field-duplicate, .wpforms-field-delete, .wpforms-field-multi-field-menu')) return false;
        return true;
      },
      apply: (el) => {
        const field = el.closest('.wpforms-field[data-field-id]');
        const fid = field.dataset.fieldId;
        if (!fid) return;
        document
          .querySelectorAll('.wpforms-field.active')
          .forEach((f) => f.classList.remove('active'));
        field.classList.add('active');
        // Sidebar tab → Field Options
        document.getElementById('add-fields')?.querySelector('a')?.classList.remove('active');
        document.getElementById('field-options')?.querySelector('a')?.classList.add('active');
        const addFields = document.getElementById('wpforms-add-fields-tab');
        const fieldOptions = document.getElementById('wpforms-field-options');
        if (addFields) addFields.style.display = 'none';
        if (fieldOptions) fieldOptions.style.display = 'block';
        // Show only the clicked field's option panel.
        document
          .querySelectorAll('#wpforms-field-options .wpforms-field-option')
          .forEach((p) => p.classList.add('wpforms-hidden'));
        document
          .getElementById('wpforms-field-option-' + fid)
          ?.classList.remove('wpforms-hidden');
      },
    },

    // ─ Payment Single: Item Price (input) ───────────────────────────────
    {
      label: 'payment-single-price',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.closest('.wpforms-field-option-row-price') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-single') === true,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        renderPaymentSinglePrice(field);
        renderPaymentSinglePriceLabel(field);
      },
    },

    // ─ Payment Single: Price Display (price_label template) ────────────
    {
      label: 'payment-single-price-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.closest('.wpforms-field-option-row-price_label') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-single') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentSinglePriceLabel(field);
      },
    },

    // ─ Payment Single: Item Type / format (Single / User Defined / Hidden)
    {
      label: 'payment-single-format',
      event: 'change',
      match: (el) =>
        el instanceof HTMLSelectElement &&
        el.closest('.wpforms-field-option-row-format') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-single') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentSingleFormat(field);
      },
    },

    // ─ Payment Single: Minimum Price (input) ─────────────────────────────
    {
      label: 'payment-single-min-price',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.closest('.wpforms-field-option-row-min_price') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-single') === true,
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentSingleMinPrice(field);
      },
    },

    // ─ Payment Single / Select: Enable Quantity toggle ──────────────────
    {
      label: 'payment-enable-quantity',
      event: 'change',
      match: (el) => {
        if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return false;
        if (!el.closest('.wpforms-field-option-row-enable_quantity')) return false;
        const field = getField(el);
        return !!field && (
          field.classList.contains('wpforms-field-payment-single') ||
          field.classList.contains('wpforms-field-payment-select')
        );
      },
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentEnableQuantity(field);
      },
    },

    // ─ Payment Choices: Show Price After Item Labels toggle ─────────────
    {
      label: 'payment-choices-show-price-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-show_price_after_labels') !== null &&
        isPaymentChoiceField(getField(el)),
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentChoiceLabels(field);
      },
    },

    // ─ Payment Choices: Per-choice price input (input.value.wpforms-money-input)
    {
      label: 'payment-choices-price-input',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('value') &&
        el.classList.contains('wpforms-money-input') &&
        el.closest('.choices-list') !== null &&
        isPaymentChoiceField(getField(el)),
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentChoiceLabels(field);
      },
    },

    // ─ Payment Choices: Resync labels after label-edit / add / remove ────
    // The universal choices-label-edit / choices-add / choices-remove
    // handlers run first; this resync re-renders the canvas text with the
    // price suffix when show_price_after_labels is on (and rebuilds clean
    // text when off).
    {
      label: 'payment-choices-resync-label',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.classList.contains('label') &&
        el.closest('.choices-list') !== null &&
        isPaymentChoiceField(getField(el)),
      apply: (el) => {
        const field = getField(el);
        if (field) renderPaymentChoiceLabels(field);
      },
    },
    {
      label: 'payment-choices-resync-click',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        if (!el.closest('a.add, a.remove')) return false;
        if (!el.closest('.choices-list')) return false;
        return !!document.querySelector(
          '.wpforms-field-payment-checkbox, .wpforms-field-payment-multiple, .wpforms-field-payment-select',
        );
      },
      apply: () => {
        document
          .querySelectorAll(
            '.wpforms-field-payment-checkbox, .wpforms-field-payment-multiple, .wpforms-field-payment-select',
          )
          .forEach(renderPaymentChoiceLabels);
      },
    },

    // ─ Payment Coupon: Button Text ──────────────────────────────────────
    {
      label: 'payment-coupon-button-text',
      event: 'input',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'text' &&
        el.closest('.wpforms-field-option-row-button_text') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-coupon') === true,
      apply: (el) => {
        const field = getField(el);
        const btn = field?.querySelector('.wpforms-field-payment-coupon-button');
        if (btn) btn.textContent = el.value;
      },
    },

    // ─ Payment Coupon: Click .choices container → open dropdown ─────────
    // The choices.js list is hidden by default (CSS rule
    // `.choices__list--dropdown{display:none}` with `.is-active{display:block}`).
    // Clicking the inner select area toggles the `is-active` class.
    {
      label: 'payment-coupon-open',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        // Open click is on .choices__inner (the area showing pills + search).
        // Picking an option or clicking a pill button is handled separately.
        if (el.closest('.choices__list--dropdown')) return false;
        if (el.closest('.choices__button')) return false;
        const inner = el.closest('.choices__inner');
        if (!inner) return false;
        return getField(inner)?.classList.contains('wpforms-field-payment-coupon') === true;
      },
      apply: (el) => {
        const choices = el.closest('.choices');
        const dropdown = choices?.querySelector('.choices__list--dropdown');
        if (!dropdown) return;
        // Close any other open coupon dropdowns first.
        document
          .querySelectorAll('.choices__list--dropdown.is-active')
          .forEach((d) => { if (d !== dropdown) d.classList.remove('is-active'); });
        dropdown.classList.toggle('is-active');
      },
    },

    // ─ Payment Coupon: Click dropdown option → add pill + close ─────────
    {
      label: 'payment-coupon-pick',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        const opt = el.closest('.choices__list--dropdown .choices__item--choice');
        if (!opt) return false;
        return getField(opt)?.classList.contains('wpforms-field-payment-coupon') === true;
      },
      apply: (el) => {
        const opt = el.closest('.choices__list--dropdown .choices__item--choice');
        const field = getField(opt);
        if (!field || !opt) return;
        addCouponPill(field, opt.getAttribute('data-value'), opt.textContent || '');
        opt.closest('.choices__list--dropdown')?.classList.remove('is-active');
      },
    },

    // ─ Payment Coupon: Click pill ✕ → remove pill ──────────────────────
    {
      label: 'payment-coupon-pill-remove',
      event: 'click',
      match: (el) => {
        if (!el.closest) return false;
        const btn = el.closest('.choices__list--multiple .choices__button');
        if (!btn) return false;
        return getField(btn)?.classList.contains('wpforms-field-payment-coupon') === true;
      },
      apply: (el) => {
        const btn = el.closest('.choices__button');
        const pill = btn?.closest('.choices__item');
        const field = getField(btn);
        if (!field || !pill) return;
        removeCouponPill(field, pill.getAttribute('data-value'));
      },
    },

    // ─ Payment Total: Enable Summary toggle ─────────────────────────────
    // ON  → show .wpforms-order-summary-container, hide .wpforms-total-amount
    // OFF → hide .wpforms-order-summary-container, show .wpforms-total-amount
    // initial state synced via initPaymentTotalSummary on load (snapshot was
    // captured with toggle off but both visible).
    {
      label: 'payment-total-summary-toggle',
      event: 'change',
      match: (el) =>
        el instanceof HTMLInputElement &&
        el.type === 'checkbox' &&
        el.closest('.wpforms-field-option-row-summary') !== null &&
        getField(el)?.classList.contains('wpforms-field-payment-total') === true,
      apply: (el) => {
        const field = getField(el);
        if (!field) return;
        applyPaymentTotalSummary(field, el.checked);
      },
    },
  ];

  function applyPaymentTotalSummary(field, on) {
    const summary = field.querySelector('.wpforms-order-summary-container');
    const total = field.querySelector('.wpforms-total-amount');
    if (summary) {
      fadeSwap(summary, () => {
        summary.style.display = on ? '' : 'none';
      });
    }
    if (total) total.style.display = on ? 'none' : '';
  }

  function initPaymentTotalSummary() {
    document
      .querySelectorAll('.wpforms-field-payment-total')
      .forEach((field) => {
        const fid = field.id?.replace('wpforms-field-', '');
        if (!fid) return;
        const cb = document.getElementById(`wpforms-field-option-${fid}-summary`);
        if (!cb) return;
        // Set initial visibility without fadeSwap (no transition on load).
        const summary = field.querySelector('.wpforms-order-summary-container');
        const total = field.querySelector('.wpforms-total-amount');
        if (summary) summary.style.display = cb.checked ? '' : 'none';
        if (total) total.style.display = cb.checked ? 'none' : '';
      });
  }

  function dispatch(eventName, target) {
    if (!(target instanceof HTMLElement)) return;
    for (const tr of TRANSITIONS) {
      if (tr.event !== eventName) continue;
      if (!tr.match(target)) continue;
      try {
        tr.apply(target);
      } catch (err) {
        console.error('[interactivity] transition failed:', tr.label, err);
      }
    }
  }

  document.addEventListener('change', (e) => dispatch('change', e.target));
  document.addEventListener('input', (e) => dispatch('input', e.target));
  // Click delegation — only dispatch when a matching transition exists so
  // we don't preventDefault on every link in the snapshot.
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const matched = TRANSITIONS.some(
      (tr) => tr.event === 'click' && tr.match(e.target),
    );
    if (!matched) return;
    e.preventDefault();
    dispatch('click', e.target);
  });

  // ─── Smart Tags dropdown — close on outside click ───────────────────────
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const inside = e.target.closest('.wpforms-smart-tags-widget-container');
    document.querySelectorAll('.insert-smart-tag-dropdown:not(.closed)').forEach((d) => {
      if (!inside || d.closest('.wpforms-smart-tags-widget-container') !== inside) {
        d.classList.add('closed');
      }
    });
  });

  // ─── Field-option tab switch (General / Advanced / Smart Logic) ─────────
  // Visibility is CSS-driven:
  //   .wpforms-field-option-group .wpforms-field-option-group-inner { display: none }
  //   .wpforms-field-option-group.active .wpforms-field-option-group-inner { display: block }
  // Toggling `.active` on the group is sufficient. Wrap the swap in a
  // fadeSwap on the field-option panel so the General→Advanced swap reads clean.

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest?.('.wpforms-field-option-group-toggle');
    if (!anchor) return;
    e.preventDefault();
    const clickedGroup = anchor.closest('.wpforms-field-option-group');
    const panel = anchor.closest('.wpforms-field-option');
    if (!clickedGroup || !panel) return;
    if (clickedGroup.classList.contains('active')) return; // no-op on active tab
    fadeSwap(panel, () => {
      panel
        .querySelectorAll(':scope > .wpforms-field-option-group')
        .forEach((g) => g.classList.toggle('active', g === clickedGroup));
    });
  });

  // ─── Icon Picker modal ──────────────────────────────────────────────────
  // Clicking the panel's <div class="wpforms-icon-select"> opens a modal
  // that mirrors the live jconfirm-based Icon Picker. Picking an icon
  // updates the option panel's preview + hidden inputs and (if the canvas
  // ul is in icon-choices mode) the canvas via renderCanvasChoices.
  const ICON_LIBRARY = [
    ['envelope','regular'],['bullhorn','solid'],['pencil','solid'],['palette','solid'],
    ['pen-to-square','solid'],['image','regular'],['heart','regular'],['clipboard','regular'],
    ['chart-simple','solid'],['star','regular'],['circle-check','regular'],['circle-xmark','regular'],
    ['calendar','regular'],['handshake','regular'],['bell','regular'],['phone','solid'],
    ['circle-user','regular'],['bookmark','regular'],['bullseye','solid'],['cart-shopping','solid'],
    ['comments','regular'],['address-card','regular'],['rectangle-ad','solid'],['shield-halved','solid'],
    ['ban','solid'],['face-smile','regular'],['camera','solid'],['gear','solid'],
    ['house','solid'],['lock','solid'],['user','solid'],['thumbs-up','regular'],
  ];
  let activeIconPicker = null; // { panelLi, modal }

  function closeIconPicker() {
    if (!activeIconPicker) return;
    activeIconPicker.modal.remove();
    activeIconPicker = null;
  }

  function openIconPicker(panelLi) {
    closeIconPicker();
    const modal = document.createElement('div');
    modal.className = 'wpforms-snapshot-icon-picker-backdrop';
    // Aggressive inline styles so no stylesheet can hide/displace the modal.
    modal.setAttribute('style', [
      'position:fixed',
      'top:0','left:0','right:0','bottom:0',
      'width:100vw','height:100vh',
      'background:rgba(0,0,0,0.5)',
      'z-index:2147483647',
      'display:flex',
      'align-items:flex-start',
      'justify-content:center',
      'padding-top:60px',
      'box-sizing:border-box',
      'pointer-events:auto',
    ].join(';'));
    modal.innerHTML = `
      <div class="jconfirm-box jconfirm-type-orange wpforms-icon-picker-jconfirm-box" role="dialog">
        <div class="jconfirm-closeIcon">×</div>
        <div class="jconfirm-title-c wpforms-icon-picker-title">
          <span class="jconfirm-title">
            Icon Picker
            <span class="wpforms-icon-picker-description">Browse or search for the perfect icon.</span>
            <input type="text" placeholder="Search 2000+ icons..." class="search">
          </span>
        </div>
        <div class="jconfirm-content-pane wpforms-icon-picker-jconfirm-content-pane">
          <div class="jconfirm-content">
            <div class="wpforms-icon-picker-container">
              <ul class="wpforms-icon-picker-icons"></ul>
            </div>
          </div>
        </div>
      </div>
    `;
    const grid = modal.querySelector('.wpforms-icon-picker-icons');
    ICON_LIBRARY.forEach(([name, style]) => {
      const li = document.createElement('li');
      li.dataset.icon = name;
      li.dataset.iconStyle = style;
      const i = document.createElement('i');
      i.className = `ic-fa-${style} ic-fa-${name}`;
      const nameEl = document.createElement('span');
      nameEl.className = 'name';
      nameEl.textContent = name;
      li.appendChild(i);
      li.appendChild(nameEl);
      grid.appendChild(li);
    });
    document.body.appendChild(modal);
    activeIconPicker = { panelLi, modal };
    const search = modal.querySelector('input.search');
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      grid.querySelectorAll('li').forEach((li) => {
        li.style.display = li.dataset.icon.includes(q) ? '' : 'none';
      });
    });
  }

  function applyIconPick(panelLi, iconName, iconStyle) {
    const sel = panelLi.querySelector('.wpforms-icon-select');
    if (!sel) return;
    const preview = sel.querySelector('i.ic-fa-preview');
    if (preview) preview.className = `ic-fa-preview ic-fa-${iconStyle} ic-fa-${iconName}`;
    const nameSpan = sel.querySelector('span');
    if (nameSpan) nameSpan.textContent = iconName;
    const hiddenIcon = sel.querySelector('input.source-icon');
    const hiddenStyle = sel.querySelector('input.source-icon-style');
    if (hiddenIcon) hiddenIcon.value = iconName;
    if (hiddenStyle) hiddenStyle.value = iconStyle;
    // Canvas re-render if in icon mode.
    const fieldOption = sel.closest('.wpforms-field-option');
    const fieldId = fieldOption && fieldOption.id.replace(/^wpforms-field-option-/, '');
    if (fieldId) {
      const field = document.getElementById(`wpforms-field-${fieldId}`);
      const ul = field && field.querySelector('ul.primary-input');
      if (ul && ul.classList.contains('wpforms-icon-choices')) {
        renderCanvasChoices(field);
      }
    }
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    // Close button or backdrop click.
    if (activeIconPicker) {
      if (target.closest('.jconfirm-closeIcon')) {
        e.preventDefault();
        e.stopPropagation();
        closeIconPicker();
        return;
      }
      if (target.classList.contains('wpforms-snapshot-icon-picker-backdrop')) {
        closeIconPicker();
        return;
      }
      const iconLi = target.closest('.wpforms-icon-picker-icons > li');
      if (iconLi && activeIconPicker.modal.contains(iconLi)) {
        e.preventDefault();
        e.stopPropagation();
        applyIconPick(activeIconPicker.panelLi, iconLi.dataset.icon, iconLi.dataset.iconStyle);
        closeIconPicker();
        return;
      }
    }
    // Open on click of the option-panel icon preview.
    const iconSelect = target.closest('.wpforms-icon-select');
    if (iconSelect && iconSelect.closest('.choices-list')) {
      e.preventDefault();
      e.stopPropagation();
      const panelLi = iconSelect.closest('li');
      if (panelLi) openIconPicker(panelLi);
    }
  }, true /* capture, runs before other delegated click handlers */);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeIconPicker();
  });

  // Inject minimal styling for the modal — the live plugin's jconfirm
  // theme isn't captured into snapshot CSS bundles.
  const style = document.createElement('style');
  style.textContent = `
    .wpforms-snapshot-icon-picker-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding-top:60px}
    .wpforms-snapshot-icon-picker-backdrop .jconfirm-box{background:#fff;border-radius:6px;max-width:800px;width:90%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);position:relative;overflow:hidden}
    .wpforms-snapshot-icon-picker-backdrop .jconfirm-closeIcon{position:absolute;top:10px;right:14px;font-size:24px;cursor:pointer;color:#666;line-height:1;z-index:2;user-select:none}
    .wpforms-snapshot-icon-picker-backdrop .jconfirm-closeIcon:hover{color:#000}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-title{padding:20px 24px 12px;border-bottom:1px solid #e0e0e0}
    .wpforms-snapshot-icon-picker-backdrop .jconfirm-title{font-size:20px;font-weight:600;display:block;color:#333}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-description{display:block;font-size:13px;font-weight:400;color:#777;margin-top:4px}
    .wpforms-snapshot-icon-picker-backdrop input.search{display:block;width:100%;margin-top:12px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box}
    .wpforms-snapshot-icon-picker-backdrop .jconfirm-content-pane{overflow-y:auto;flex:1;padding:16px 24px}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-icons{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-icons li{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 6px;border:1px solid transparent;border-radius:4px;cursor:pointer;text-align:center}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-icons li:hover{background:#f5f5f5;border-color:#ddd}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-icons li i{font-size:24px;color:#444}
    .wpforms-snapshot-icon-picker-backdrop .wpforms-icon-picker-icons li .name{font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}

    /* Dashicons — the snapshot CSS bundles don't include the font-face,
       so dashicons-* glyphs render as blank without this rule. Path is
       resolved relative to the HTML document (snapshots/<field>/index.html). */
    @font-face{
      font-family:dashicons;
      src:url("../fonts/dashicons.ttf?99ac726223c749443b642ce33df8b800") format("truetype");
      font-weight:normal;font-style:normal;
    }
    .dashicons,.dashicons-before:before{
      font-family:dashicons !important;
      display:inline-block;line-height:1;font-weight:400;font-style:normal;
      speak:never;text-decoration:inherit;text-transform:none;text-rendering:auto;
      -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
      width:20px;height:20px;font-size:20px;vertical-align:top;text-align:center;
    }
    .dashicons-insert:before{content:"\\f10f"}
    .dashicons-remove:before{content:"\\f14f"}
    .dashicons-plus:before{content:"\\f132"}
    .dashicons-minus:before{content:"\\f460"}

    /* Pagebreak: real plugin rules extracted from builder-fields-types.min.css
       because the snapshot's bundled CSS doesn't include the pagebreak file. */
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons{overflow:hidden;text-align:center;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-left{text-align:left;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-left .wpforms-pagebreak-button{margin:0 20px 0 0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-right{text-align:right;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-right .wpforms-pagebreak-button{margin:0 0 0 20px;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-split .wpforms-pagebreak-prev{float:left;margin:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-buttons.wpforms-pagebreak-buttons-split .wpforms-pagebreak-next{float:right;margin:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-button{background:#999c9e;border:none;border-radius:4px;color:#ffffff;cursor:pointer;display:inline-block;font-size:17px;font-weight:600;line-height:21px;margin:0 10px;min-width:85px;padding:10px 15px;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-button.wpforms-hidden{display:none;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-divider{height:30px;position:relative;text-align:center;}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-top .wpforms-pagebreak-divider{height:auto;}
    .wpforms-panel-fields .wpforms-field-pagebreak .line{border-top:1px dashed #c3c4c7;display:block;left:0;position:absolute;top:50%;width:100%;}
    .wpforms-panel-fields .wpforms-field-pagebreak .pagebreak-label{background-color:#ffffff;display:inline-block;font-size:16px;font-weight:600;padding:0 20px;position:relative;z-index:10;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-title{color:#6a6f76;font-weight:400;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-title:not(:empty):after{content:")";}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-pagebreak-title:not(:empty):before{content:"(";}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-normal{border:none;margin:0 -15px 20px -15px;padding:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-normal .wpforms-pagebreak-divider{background-color:#50575e;height:60px;padding-top:16px;}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-normal .pagebreak-label{background-color:#50575e;color:#e8e9e9;font-weight:400;}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-normal .wpforms-pagebreak-title{color:#dcdcde;}
    .wpforms-panel-fields .wpforms-field-pagebreak.wpforms-pagebreak-normal .wpforms-pagebreak-buttons{border:1px solid #ffffff;border-radius:6px;margin:0 15px 5px 15px;padding:15px;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator{margin:20px 0 0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-progress{font-size:16px;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-progress .wpforms-page-indicator-page-progress-wrap{display:block;width:100%;background-color:#dcdcde;height:18px;border-radius:10px;overflow:hidden;position:relative;margin:10px 0 0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-progress .wpforms-page-indicator-page-progress{height:18px;position:absolute;left:0;top:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-circles{display:flex;flex-wrap:wrap;gap:15px 20px;justify-content:flex-start;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-circles .wpforms-page-indicator-page{display:flex;align-items:center;gap:10px;margin:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-circles .wpforms-page-indicator-page-number{height:40px;width:40px;border-radius:50%;display:inline-block;margin:0;line-height:40px;text-align:center;background-color:#dcdcde;color:#6a6f76;flex-shrink:0;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-circles .active .wpforms-page-indicator-page-number{color:#ffffff;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-connector{display:flex;justify-content:flex-start;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-connector .wpforms-page-indicator-page{text-align:center;line-height:1.2;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-connector .wpforms-page-indicator-page-number{display:block;text-indent:-9999px;height:6px;background-color:#c3c4c7;margin:0 0 20px 0;position:relative;width:100%;}
    .wpforms-panel-fields .wpforms-field-pagebreak .wpforms-page-indicator.wpforms-page-indicator-connector .wpforms-page-indicator-page-triangle{position:absolute;top:100%;left:50%;width:0;height:0;margin-left:-5px;border-style:solid;border-width:6px 5px 0 5px;border-color:transparent transparent transparent transparent;}
  `;
  document.head.appendChild(style);

  // ─── Init pass: inject missing Pagebreak canvas pieces ──────────────────
  // Snapshot captured only the wpforms-pagebreak-top wrap. The live plugin
  // also renders:
  //   - .wpforms-page-indicator (Step X of Y + progress bar) inside the top wrap
  //   - A SIBLING .wpforms-field-pagebreak.wpforms-pagebreak-normal wrap that
  //     contains Prev/Next buttons AND the dark "Page Break" divider
  // (Both elements use the real plugin's wrapper so the CSS rules
  //  scoped to .wpforms-field-pagebreak.wpforms-pagebreak-normal apply.)
  function initPagebreakBottomDividers() {
    document.querySelectorAll(
      '.wpforms-field-pagebreak.wpforms-pagebreak-top'
    ).forEach((topField) => {
      const fieldId = topField.dataset.fieldId;
      if (!fieldId) return;
      if (topField.querySelector('.wpforms-page-indicator')) return; // already injected
      const titleInput = document.getElementById(`wpforms-field-option-${fieldId}-title`);
      const indicatorSelect = document.getElementById(`wpforms-field-option-${fieldId}-indicator`);
      const colorInput = document.getElementById(`wpforms-field-option-${fieldId}-indicator_color`);
      const progressTextInput = document.getElementById(`wpforms-field-option-${fieldId}-progress_text`);
      const navAlignSelect = document.getElementById(`wpforms-field-option-${fieldId}-nav_align`);
      const initialTitle = titleInput?.value || '';
      const initialIndicator = indicatorSelect?.value || 'progress';
      const initialColor = colorInput?.value || '#066aab';
      const initialProgressText = progressTextInput?.value || 'Step {current_page} of {last_page}';
      const initialNavAlign = navAlignSelect?.value || 'left';

      // ─ A: progress indicator inside the top wrap ─────────────────────
      const indicator = document.createElement('div');
      indicator.className = `wpforms-page-indicator wpforms-page-indicator-${initialIndicator}`;
      indicator.setAttribute('data-allow-page-navigation', '0');
      indicator.innerHTML = buildPageIndicatorInner(
        initialIndicator,
        initialColor,
        initialProgressText,
      );
      if (initialIndicator === 'none') indicator.style.display = 'none';
      topField.appendChild(indicator);

      // ─ B: sibling wpforms-pagebreak-normal wrap with buttons + divider
      const normalWrap = document.createElement('div');
      normalWrap.className = 'wpforms-field wpforms-field-pagebreak wpforms-pagebreak-normal';
      normalWrap.dataset.fieldId = fieldId;
      normalWrap.dataset.injected = 'pagebreak-normal';
      normalWrap.setAttribute('data-field-type', 'pagebreak');
      normalWrap.innerHTML = [
        `<div class="wpforms-pagebreak-buttons wpforms-pagebreak-buttons-${initialNavAlign}">`,
          '<button class="wpforms-pagebreak-button wpforms-pagebreak-prev wpforms-hidden">Previous</button>',
          '<button class="wpforms-pagebreak-button wpforms-pagebreak-next">Next</button>',
        '</div>',
        '<div class="wpforms-pagebreak-divider">',
          '<span class="pagebreak-label">Page Break ',
            `<span class="wpforms-pagebreak-title">${initialTitle}</span>`,
          '</span>',
          '<span class="line"></span>',
        '</div>',
      ].join('');
      topField.after(normalWrap);
    });
  }

  // Render "Step 1 of 2" with the nested `wpforms-page-indicator-steps-current`
  // span the live plugin emits around the current page number.
  function renderProgressSteps(template, current, last) {
    return template
      .replace(/\{current_page\}/g, `<span class="wpforms-page-indicator-steps-current">${current}</span>`)
      .replace(/\{last_page\}/g, String(last));
  }

  // Build the inner markup of .wpforms-page-indicator based on type. Mirrors
  // the live plugin output for progress / circles / connector / none.
  function buildPageIndicatorInner(type, color, progressText) {
    if (type === 'progress') {
      return [
        '<span class="wpforms-page-indicator-page-title"></span>',
        '<span class="wpforms-page-indicator-page-title-sep" style="display:none;"> - </span>',
        '<span class="wpforms-page-indicator-steps">',
          renderProgressSteps(progressText, 1, 2),
        '</span>',
        '<div class="wpforms-page-indicator-page-progress-wrap">',
          `<div class="wpforms-page-indicator-page-progress" style="width:50%;background-color:${color}"></div>`,
        '</div>',
      ].join('');
    }
    if (type === 'circles') {
      return [
        '<div class="wpforms-page-indicator-page active wpforms-page-indicator-page-1" data-page="1">',
          `<span class="wpforms-page-indicator-page-number" style="background-color:${color}" data-page="1">1</span>`,
        '</div>',
        '<div class="wpforms-page-indicator-page wpforms-page-indicator-page-2" data-page="2">',
          '<span class="wpforms-page-indicator-page-number" data-page="2">2</span>',
        '</div>',
      ].join('');
    }
    if (type === 'connector') {
      return [
        '<div class="wpforms-page-indicator-page active wpforms-page-indicator-page-1" style="min-width:50%;" data-page="1">',
          `<span class="wpforms-page-indicator-page-number" style="background-color:${color}" data-page="1">1`,
            `<span class="wpforms-page-indicator-page-triangle" style="border-top-color:${color}"></span>`,
          '</span>',
        '</div>',
        '<div class="wpforms-page-indicator-page wpforms-page-indicator-page-2" style="min-width:50%;" data-page="2">',
          '<span class="wpforms-page-indicator-page-number" data-page="2">2',
            '<span class="wpforms-page-indicator-page-triangle"></span>',
          '</span>',
        '</div>',
      ].join('');
    }
    return ''; // 'none' → indicator is hidden via display:none on the wrap
  }


  function initCanvasFieldActiveSync() {
    // Combined-field snapshots (e.g. builder-field-options-payment-fields)
    // ship with every option panel rendered visible and no .active field
    // on canvas. Match the live plugin's default: Add Fields tab showing,
    // every option panel hidden until a canvas field is clicked. For
    // per-field-stripped snapshots (one .active field, one panel in DOM)
    // this just ensures the active panel stays visible and the rest hide.
    const activeField = document.querySelector(
      '.wpforms-field-wrap.ui-sortable .wpforms-field.active',
    );
    const activeId = activeField?.dataset.fieldId || null;
    const panels = document.querySelectorAll(
      '#wpforms-field-options .wpforms-field-option',
    );
    if (!panels.length) return;
    panels.forEach((p) => {
      const matches = activeId && p.id === 'wpforms-field-option-' + activeId;
      p.classList.toggle('wpforms-hidden', !matches);
    });
    // If no active field, default sidebar to Add Fields tab.
    if (!activeId) {
      const addFields = document.getElementById('wpforms-add-fields-tab');
      const fieldOptions = document.getElementById('wpforms-field-options');
      if (addFields) addFields.style.display = 'block';
      if (fieldOptions) fieldOptions.style.display = 'none';
      document.getElementById('add-fields')?.querySelector('a')?.classList.add('active');
      document.getElementById('field-options')?.querySelector('a')?.classList.remove('active');
    }
  }

  function initCouponDropdownOutsideClose() {
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        // If the click is inside any coupon `.choices` container, let the
        // open/pick/remove transitions handle it.
        if (target.closest('.wpforms-field-option-row[id$="-allowed_coupons"] .choices')) return;
        document
          .querySelectorAll(
            '.wpforms-field-option-row[id$="-allowed_coupons"] .choices__list--dropdown.is-active',
          )
          .forEach((d) => d.classList.remove('is-active'));
      },
      true,
    );
  }

  function initPaymentFields() {
    // payment-single: sync format-driven visibility + price + price_label
    // + min_price + quantity to the captured panel state.
    document.querySelectorAll('.wpforms-field-payment-single').forEach((field) => {
      renderPaymentSingleFormat(field);
      renderPaymentSinglePrice(field);
      renderPaymentSinglePriceLabel(field);
      renderPaymentSingleMinPrice(field);
      renderPaymentEnableQuantity(field);
    });
    // payment-select: quantity sync.
    document.querySelectorAll('.wpforms-field-payment-select').forEach((field) => {
      renderPaymentEnableQuantity(field);
    });
    // payment-choices fields: re-render labels so price suffix matches toggle.
    document
      .querySelectorAll(
        '.wpforms-field-payment-checkbox, .wpforms-field-payment-multiple, .wpforms-field-payment-select',
      )
      .forEach(renderPaymentChoiceLabels);
    // payment-coupon: seed sample coupons.
    document.querySelectorAll('.wpforms-field-payment-coupon').forEach(initCouponField);
    initCouponDropdownOutsideClose();
  }

  function runInits() {
    initPagebreakBottomDividers();
    initPaymentTotalSummary();
    initCanvasFieldActiveSync();
    initPaymentFields();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInits);
  } else {
    runInits();
  }
})();
