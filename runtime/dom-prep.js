// DOM preparation helpers — run against the snapshot iframe's contentDocument
// *after* loadSnapshot, *before* the first camera move. Every helper is
// idempotent and safe to call on snapshots that don't have the target node.
//
// Why these live here: every WPForms video needs the same three cleanups —
// strip the WP admin bar, trim the builder canvas down to the fields the
// chapter actually talks about, and swap the generic "Master Form" label to
// something relevant. Inlining this in each chapter would drift fast.
//
// Default rule of thumb: unless a chapter is specifically about a field,
// `applyDefaultForm(doc)` leaves Name + Email + Message on the canvas and
// calls the form "Simple Contact Form".
//
// Full library documentation: see `docs/dom-prep.md` for the three-layer
// model (universal baseline / per-snapshot profile / chapter-local delta),
// worked composition recipes, and the deprecated/deferred list.

const DEFAULT_FORM_NAME = 'Simple Contact Form';
// Simple Contact Form = Name (#1) + Email (#2) + textarea/"Message" (#4).
// The builder-fields snapshot drops a mega-form with 30+ fields; we keep
// only these three so the canvas matches what the SCF template actually
// produces.
const DEFAULT_FIELD_IDS = [1, 2, 4];
// The textarea field ships labelled "Paragraph Text"; the SCF template
// labels it "Comment or Message". Rename to "Message" for narration clarity.
const DEFAULT_FIELD_LABELS = { 4: 'Message' };

/**
 * Remove builder-canvas cruft that the `builder-fields` snapshot captures but
 * the default Simple Contact Form doesn't have — quiz-addon tabs, the PayPal
 * Commerce button, etc. Safe to call on any builder snapshot; each selector
 * is a no-op if the node isn't present. Extend this list as more addons
 * leak into future snapshots.
 */
export function removeBuilderCruft(doc) {
  if (!doc) return;
  stripQuizEnabled(doc);
  const selectors = [
    '.js-wpforms-quiz-panel-content-section-tabs-list',
    '.wpforms-quiz-panel-content-section-tabs-list',
    // Kill the whole PayPal button — container, logo span, everything.
    // The logo-only selector left the blue pill div still rendering.
    '[id^="wpforms-paypal-commerce-paypal-checkout-button"]',
    '[id^="wpforms-paypal-commerce-buttons"]',
    '[class*="wpforms-paypal-commerce-paypal-checkout-button"]',
    '[class*="wpforms-paypal-commerce-button"]',
  ];
  for (const sel of selectors) {
    for (const el of doc.querySelectorAll(sel)) el.remove();
  }
  // Quiz addon "Graded Quiz Enabled" notice that overlays the canvas.
  for (const el of doc.querySelectorAll('.wpforms-alert, [class*="quiz-enabled-notice"], [class*="wpforms-quiz-notice"]')) {
    el.remove();
  }
}

/** Strip the WP admin toolbar and neutralise the `margin-top: 32px` it forces. */
export function removeAdminBar(doc) {
  if (!doc) return;
  doc.getElementById('wpadminbar')?.remove();
  doc.documentElement.classList.remove('wp-toolbar');
  doc.body?.classList.remove('admin-bar');
  // CSS alone races on cached reloads — DOM removal above is primary, this
  // style is belt-and-braces for anything WP's inline rules still try to do.
  const s = doc.createElement('style');
  s.setAttribute('data-dom-prep', 'admin-bar');
  s.textContent = `
    html, html.wp-toolbar { margin-top: 0 !important; padding-top: 0 !important; }
    body, body.admin-bar  { margin-top: 0 !important; padding-top: 0 !important; }
    #wpadminbar { display: none !important; }
  `;
  doc.head.appendChild(s);
}

/**
 * Hide each `.wpforms-field[data-field-id=<id>]` via inline `display: none`.
 * Used by chapters that need a field to remain in the DOM (so a later drag
 * reveal can find/animate it) but invisible until then. Idempotent —
 * missing nodes are no-ops.
 */
export function hideFields(doc, ids) {
  if (!doc || !ids?.length) return;
  for (const id of ids) {
    doc.getElementById('wpforms-field-' + id)
      ?.style.setProperty('display', 'none', 'important');
  }
}

/** Remove every `.wpforms-field` on the canvas whose data-field-id isn't in `keepIds`. */
export function keepOnlyFields(doc, keepIds) {
  if (!doc || !keepIds?.length) return;
  const keep = new Set(keepIds.map(String));
  const fields = doc.querySelectorAll('.wpforms-field[data-field-id]');
  for (const el of fields) {
    if (!keep.has(el.dataset.fieldId)) el.remove();
  }
}

/** Rewrite a field's visible label on the builder canvas. */
export function setFieldLabel(doc, fieldId, label) {
  const target = doc?.querySelector(`#wpforms-field-${fieldId} > label.label-title > span.text`);
  if (target) target.textContent = label;
}

/** Rewrite the visible choice labels for a checkbox/radio field. */
export function setChoiceLabels(doc, fieldId, labels = []) {
  if (!doc || !labels?.length) return;

  const wrap = doc.getElementById(`wpforms-field-${fieldId}`);
  const canvasItems = wrap?.querySelectorAll('ul.primary-input > li');
  if (canvasItems?.length) {
    labels.forEach((text, i) => {
      const li = canvasItems[i];
      if (!li) return;
      const iconLabel = li.querySelector('.wpforms-icon-choices-label');
      if (iconLabel) {
        iconLabel.textContent = text;
        return;
      }
      const label = li.querySelector('label');
      if (label) {
        const input = label.querySelector('input');
        label.textContent = '';
        if (input) label.appendChild(input);
        label.appendChild(doc.createTextNode(' ' + text));
      } else {
        const input = li.querySelector('input');
        li.textContent = '';
        if (input) li.appendChild(input);
        li.appendChild(doc.createTextNode(' ' + text));
      }
    });
  }

  const sideItems = doc.querySelectorAll(`#wpforms-field-option-${fieldId}-choices-list > li`);
  labels.forEach((text, i) => {
    const li = sideItems[i];
    if (!li) return;
    const labelInput = li.querySelector('input.label');
    if (labelInput) {
      labelInput.value = text;
      labelInput.setAttribute('value', text);
    }
    const valueInput = li.querySelector('input.value');
    if (valueInput && !valueInput.value) {
      valueInput.setAttribute('value', '');
    }
  });
}

/** Mirror checked choices in the builder preview. `indexes` are zero-based. */
export function setCheckedChoices(doc, fieldId, indexes = []) {
  const wrap = doc?.getElementById(`wpforms-field-${fieldId}`);
  const checked = new Set(indexes.map(Number));
  const sideItems = doc?.querySelectorAll(`#wpforms-field-option-${fieldId}-choices-list > li`) || [];
  sideItems.forEach((li, i) => {
    const input = li.querySelector('input.default');
    if (!input) return;
    const on = checked.has(i);
    input.checked = on;
    input.defaultChecked = on;
    if (on) input.setAttribute('checked', 'checked');
    else input.removeAttribute('checked');
  });
  if (!wrap) return;
  wrap.querySelectorAll('ul.primary-input > li').forEach((li, i) => {
    const input = li.querySelector('input[type="checkbox"], input[type="radio"]');
    if (!input) return;
    const on = checked.has(i);
    input.checked = on;
    input.defaultChecked = on;
    if (on) input.setAttribute('checked', 'checked');
    else input.removeAttribute('checked');
    li.classList.toggle('wpforms-selected', on);
  });
}

/** Swap "Master Form" (or whatever the snapshot captured) for a meaningful name. */
export function setFormName(doc, name) {
  if (!doc) return;
  // Builder header pill — the large "Now editing <name>" label up top.
  for (const el of doc.querySelectorAll('.wpforms-form-name, .wpforms-center-form-name')) {
    el.textContent = name;
  }
  // Settings → General → Form Title input (user may zoom into settings later).
  const titleInput = doc.getElementById('wpforms-panel-field-settings-form_title');
  if (titleInput) titleInput.value = name;
}

/**
 * Default builder canvas state: Name + Email + Message, no admin bar,
 * renamed to "Simple Contact Form". Call this at the top of any builder
 * chapter's `setup()` / litmus startup unless the chapter is specifically
 * about a field that wouldn't be in the SCF template.
 */
export function applyDefaultForm(doc, opts = {}) {
  removeAdminBar(doc);
  removeBuilderCruft(doc);
  const keepIds = opts.keepIds ?? DEFAULT_FIELD_IDS;
  keepOnlyFields(doc, keepIds);
  const labels = { ...DEFAULT_FIELD_LABELS, ...(opts.labels || {}) };
  for (const [id, label] of Object.entries(labels)) setFieldLabel(doc, id, label);
  setFormName(doc, opts.formName ?? DEFAULT_FORM_NAME);
}

/**
 * Activate one of a field's `.wpforms-field-option-group` siblings (Basic /
 * Advanced / etc.) — mirrors the runtime `switchTab` group-toggle (verbs.js)
 * statically, before the camera moves. Snapshots are captured with one group
 * active; controls in inactive groups render rect-zero.
 *
 * Pass either `controlName` (look up the group containing
 * `#wpforms-field-option-<fieldId>-<controlName>`) or `group` (look up
 * `#wpforms-field-option-<group>-<fieldId>` directly). Idempotent — no-op if
 * the target is missing.
 */
export function activateFieldOptionGroup(doc, fieldId, opts = {}) {
  if (!doc) return;
  let group = null;
  if (opts.controlName) {
    const ctrl = doc.getElementById(`wpforms-field-option-${fieldId}-${opts.controlName}`);
    group = ctrl?.closest('.wpforms-field-option-group') || null;
  } else if (opts.group) {
    group = doc.getElementById(`wpforms-field-option-${opts.group}-${fieldId}`);
  }
  if (!group) return;
  const card = group.parentElement;
  if (!card) return;
  for (const g of card.querySelectorAll('.wpforms-field-option-group')) {
    g.classList.remove('active');
  }
  group.classList.add('active');
}

// ── Choice-field payoff helpers ─────────────────────────────────────────────
// These mirror the builder's live JS reactions to field-option toggles so the
// canvas visibly reflects the new state in static snapshots. Generic across
// any choice field (Checkboxes, Multiple Choice, Dropdowns), keyed by
// `#wpforms-field-<id>` and operating on the visible `ul.primary-input`.

const _LAYOUT_CLASSES = ['wpforms-list-2-columns', 'wpforms-list-3-columns', 'wpforms-list-inline'];

/**
 * Mirror Choice Layout (1 column / 2 columns / 3 columns / inline). The CSS
 * lives on the field wrapper; selectors like `wpforms-list-2-columns ul.primary-input li`
 * style the children. Idempotent.
 */
export function setChoiceLayout(doc, fieldId, value) {
  const wrap = doc?.getElementById(`wpforms-field-${fieldId}`);
  if (!wrap) return;
  const ul = wrap.querySelector('ul.primary-input');
  for (const cls of _LAYOUT_CLASSES) {
    wrap.classList.remove(cls);
    if (ul) ul.classList.remove(cls);
  }
  let cls = null;
  if (value === '2' || value === 2) cls = 'wpforms-list-2-columns';
  else if (value === '3' || value === 3) cls = 'wpforms-list-3-columns';
  else if (value === 'inline') cls = 'wpforms-list-inline';
  if (cls) {
    wrap.classList.add(cls);
    if (ul) ul.classList.add(cls);
  }
}

// ── Internal helpers (used by applyIconChoicesV2 sidebar reveal) ───────────

/**
 * Snapshot capture pipeline gap: WPForms ships separate `@font-face`
 * declarations for FA5, FA6, and FA7. Only FA5/FA7 woff2 assets get
 * inlined under the snapshot's `assets/` folder; FA6 still references
 * `../webfonts/...` which doesn't resolve. The new icon-choices CSS
 * (`.ic-fa-regular`, `.ic-fa-solid`, `.ic-fa-brands`) targets FA6 by
 * name, so without an alias every glyph renders as a missing-glyph box.
 *
 * This injects three `@font-face` rules that re-point the FA6 family
 * names at the FA5/FA7 woff2 URLs already present in the document
 * (codepoints are stable across FA versions, so the same byte file
 * serves either family). Idempotent — keyed by an injected `<style>`
 * element id.
 *
 * Long-term fix is to bundle FA6 woff2 at capture time; this is a
 * runtime workaround keyed off whatever assets the snapshot already has.
 */
function patchFontAwesome6Aliasing(doc) {
  if (!doc) return;
  if (doc.getElementById('wpforms-fa6-alias-style')) return; // idempotent
  // Walk every <style> element — `style[data-origin]` would be ideal but
  // attribute selectors aren't universally supported by lightweight DOM
  // implementations used in tests.
  let allCss = '';
  for (const s of doc.querySelectorAll('style')) {
    allCss += '\n' + (s.textContent || '');
  }

  const findSrc = (family, weight) => {
    const re = new RegExp(
      '@font-face\\s*\\{[^}]*font-family:\\s*"' +
      family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '"[^}]*font-weight:\\s*' + weight +
      '[^}]*src:\\s*url\\(([^)]+)\\)',
      'i',
    );
    const m = allCss.match(re);
    if (!m) return null;
    return m[1].replace(/^['"]|['"]$/g, '').trim();
  };

  const reg400 = findSrc('Font Awesome 7 Free',   400) || findSrc('Font Awesome 5 Free',   400);
  const sol900 = findSrc('Font Awesome 7 Free',   900) || findSrc('Font Awesome 5 Free',   900);
  const brn400 = findSrc('Font Awesome 7 Brands', 400) || findSrc('Font Awesome 5 Brands', 400);

  const parts = [];
  if (reg400) parts.push(`@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:400;font-display:block;src:url(${reg400}) format("woff2");}`);
  if (sol900) parts.push(`@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:900;font-display:block;src:url(${sol900}) format("woff2");}`);
  if (brn400) parts.push(`@font-face{font-family:"Font Awesome 6 Brands";font-style:normal;font-weight:400;font-display:block;src:url(${brn400}) format("woff2");}`);
  if (parts.length === 0) return;

  const styleEl = doc.createElement('style');
  styleEl.setAttribute('id', 'wpforms-fa6-alias-style');
  styleEl.textContent = parts.join('\n');
  (doc.head || doc.documentElement || doc.body)?.appendChild(styleEl);
}

/** Convert `#RRGGBB` to the `rgb(r, g, b)` form WPForms uses on the
 *  Minicolors swatch. Returns null if the input isn't a 6-char hex. */
function hexToRgbCss(hex) {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(String(hex || ''));
  if (!m) return null;
  return `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})`;
}

/** Set a `<select>`'s selected `<option>` by value, mirroring the static
 *  `selected="selected"` attribute the WPForms server-side renderer emits
 *  (so a captured snapshot of the post-mutation state would match). */
function selectOptionValue(selectEl, value) {
  if (!selectEl || value == null) return;
  const wanted = String(value);
  for (const opt of selectEl.querySelectorAll('option')) {
    if (opt.getAttribute('value') === wanted) {
      opt.setAttribute('selected', 'selected');
    } else {
      opt.removeAttribute('selected');
    }
  }
  selectEl.value = wanted;
}

/**
 * Use Icon Choices — exact replacement for the deprecated `applyIconChoices`.
 *
 * Mirrors the builder's reaction when the **Use Icon Choices** toggle is
 * flipped on. Generic across radio + checkbox choice fields. Renders the
 * real WPForms icon-choices DOM with Font Awesome class names — never a
 * unicode stand-in.
 *
 * Source of truth: `docs/wpforms-field-state-inventory.md` § 6 Multiple
 * Choice → Use Icon Choices (and § 7 Checkboxes which inherits verbatim).
 *
 * Two mutations, both idempotent:
 *
 *  1. **Sidebar (option panel)**: adds `show-icons` to the choices-list
 *     `<ul>`. The per-row `.wpforms-icon-select` blocks (with
 *     `<i class="ic-fa-preview ic-fa-regular ic-fa-face-smile">`, hidden
 *     `source-icon` and `source-icon-style` inputs) are already present
 *     in the snapshot DOM; CSS reveals them via the parent class.
 *
 *  2. **Canvas (preview)**: rebuilds the inner `<ul class="primary-input">`
 *     into the icon-choices template. Wrapper classes:
 *     `wpforms-icon-choices wpforms-icon-choices-{style} wpforms-icon-choices-{size}`.
 *     Inline style: `--wpforms-icon-choices-color: {color}`. Each `<li>`
 *     becomes:
 *       <li class="wpforms-icon-choices-item">
 *         <label>
 *           <span class="wpforms-icon-choices-icon">
 *             <i class="ic-fa-{iconStyle} ic-fa-{glyph}"></i>
 *             <span class="wpforms-icon-choices-icon-bg"></span>
 *           </span>
 *           <input class="wpforms-screen-reader-element" type="{radio|checkbox}" readonly>
 *           <span class="wpforms-icon-choices-label">{labelText}</span>
 *         </label>
 *       </li>
 *
 * The `<input>` type tracks the host field's `data-field-type` (`radio`
 * vs `checkbox`); the choice text on each canvas list item is preserved.
 *
 * Defaults match the inventory's "default state" snippet: glyph `face-smile`,
 * iconStyle `regular`, color `#066aab`, size `large`, style `default`.
 *
 * @param {Document} doc
 * @param {number}   fieldId
 * @param {object}   [opts]
 * @param {string}   [opts.glyph='face-smile']      FA name without prefix
 * @param {string}   [opts.iconStyle='regular']     'regular' | 'solid' | 'brands'
 * @param {string}   [opts.color='#066aab']         CSS color string
 * @param {string}   [opts.size='large']            'large' | 'medium' | 'small'
 * @param {string}   [opts.style='default']         'default' | 'modern' | 'classic' | 'none'
 */
export function applyIconChoicesV2(doc, fieldId, opts = {}) {
  if (!doc) return;
  const wrap = doc.getElementById(`wpforms-field-${fieldId}`);
  if (!wrap) return;
  const fieldType = wrap.dataset.fieldType;
  if (fieldType !== 'radio' && fieldType !== 'checkbox') return;
  const inputType = fieldType; // 'radio' or 'checkbox' map 1:1 to <input type>

  const glyph     = opts.glyph     ?? 'face-smile';
  const iconStyle = opts.iconStyle ?? 'regular';
  const color     = opts.color     ?? '#066aab';
  const size      = opts.size      ?? 'large';
  const style     = opts.style     ?? 'default';

  // Snapshots ship FA6 family declarations whose woff2 files live at a
  // relative path that doesn't survive capture (`../webfonts/...`). Only
  // the FA5/FA7 woff2 assets get bundled. Without this alias, every
  // `.ic-fa-*` glyph renders as a missing-glyph square. Idempotent.
  patchFontAwesome6Aliasing(doc);

  // ── 1. Sidebar (option panel) ─────────────────────────────────────────
  // Mark the toggle input as checked. WPForms toggle visual state is
  // driven by `input:checked + label.wpforms-toggle-control-icon`. Set
  // BOTH the HTML attribute and the IDL property so CSS `:checked`
  // activates regardless of how the document was constructed.
  const toggleInput = doc.getElementById(`wpforms-field-option-${fieldId}-choices_icons`);
  if (toggleInput) {
    toggleInput.setAttribute('checked', 'checked');
    toggleInput.checked = true;
  }

  // Reveal the per-row icon select on every choice. The `.wpforms-icon-select`
  // blocks are already present in every <li>; CSS reveals them via the
  // parent's `show-icons` class.
  const sidebarList = doc.getElementById(`wpforms-field-option-${fieldId}-choices-list`);
  if (sidebarList) sidebarList.classList.add('show-icons');

  // Drop `wpforms-hidden` from the three reveal rows (Icon Color, Size,
  // Style). The rows are already in the snapshot DOM — JS toggles
  // visibility on the live builder; we mirror that statically.
  for (const suffix of ['choices_icons_color', 'choices_icons_size', 'choices_icons_style']) {
    const row = doc.getElementById(`wpforms-field-option-row-${fieldId}-${suffix}`);
    if (row) row.classList.remove('wpforms-hidden');
  }

  // Confirm/set the three control values + the Minicolors swatch tint.
  const colorInput = doc.getElementById(`wpforms-field-option-${fieldId}-choices_icons_color`);
  if (colorInput) {
    colorInput.setAttribute('value', color);
    colorInput.value = color;
    colorInput.setAttribute('data-fallback-color', color);
    // Sibling minicolors swatch lives inside the same option-row.
    const row = doc.getElementById(`wpforms-field-option-row-${fieldId}-choices_icons_color`);
    const swatch = row?.querySelector('.minicolors-swatch-color');
    if (swatch) {
      const rgb = hexToRgbCss(color);
      swatch.setAttribute('style', `background-color: ${rgb || color};`);
    }
  }

  selectOptionValue(doc.getElementById(`wpforms-field-option-${fieldId}-choices_icons_size`), size);
  selectOptionValue(doc.getElementById(`wpforms-field-option-${fieldId}-choices_icons_style`), style);

  // ── 2. Canvas (preview) — rebuild the inner ul.primary-input
  const ul = wrap.querySelector('ul.primary-input');
  if (!ul) return;

  // Preserve choice labels in their existing order.
  const labels = Array.from(ul.querySelectorAll(':scope > li')).map(li => {
    const labelSpan = li.querySelector(
      '.wpforms-icon-choices-label, .wpforms-image-choices-label, label > span:last-child, label'
    );
    const text = (labelSpan?.textContent ?? li.textContent ?? '').trim();
    return text || 'Choice';
  });
  if (labels.length === 0) return; // nothing to render

  // Set wrapper classes + inline color custom property.
  ul.className = `primary-input wpforms-icon-choices wpforms-icon-choices-${style} wpforms-icon-choices-${size}`;
  ul.setAttribute('style', `--wpforms-icon-choices-color: ${color};`);

  // Rebuild children with the exact icon-choices template from inventory.
  while (ul.firstChild) ul.removeChild(ul.firstChild);
  for (const labelText of labels) {
    const li = doc.createElement('li');
    li.className = 'wpforms-icon-choices-item';

    const label = doc.createElement('label');

    const iconSpan = doc.createElement('span');
    iconSpan.className = 'wpforms-icon-choices-icon';
    const i = doc.createElement('i');
    i.className = `ic-fa-${iconStyle} ic-fa-${glyph}`;
    iconSpan.appendChild(i);
    const bg = doc.createElement('span');
    bg.className = 'wpforms-icon-choices-icon-bg';
    iconSpan.appendChild(bg);

    const input = doc.createElement('input');
    input.className = 'wpforms-screen-reader-element';
    input.type = inputType;
    input.setAttribute('readonly', '');

    const labelSpan = doc.createElement('span');
    labelSpan.className = 'wpforms-icon-choices-label';
    labelSpan.textContent = labelText;

    label.appendChild(iconSpan);
    label.appendChild(input);
    label.appendChild(labelSpan);
    li.appendChild(label);
    ul.appendChild(li);
  }
}

/** Mirror Use Image Choices in the sidebar choices editor. */
export function applyImageChoices(doc, fieldId) {
  if (!doc) return;
  const toggleInput = doc.getElementById(`wpforms-field-option-${fieldId}-choices_images`);
  if (toggleInput) {
    toggleInput.setAttribute('checked', 'checked');
    toggleInput.checked = true;
  }
  const sidebarList = doc.getElementById(`wpforms-field-option-${fieldId}-choices-list`);
  if (sidebarList) sidebarList.classList.add('show-images');
  for (const suffix of ['choices_images_style', 'choices_images_hide']) {
    const row = doc.getElementById(`wpforms-field-option-row-${fieldId}-${suffix}`);
    if (row) row.classList.remove('wpforms-hidden');
  }
}

/** Mirror Hide Label — drops the label-title above the choices. Idempotent. */
export function setHideLabel(doc, fieldId, hidden) {
  const wrap = doc?.getElementById(`wpforms-field-${fieldId}`);
  if (!wrap) return;
  const label = wrap.querySelector(':scope > label.label-title');
  if (!label) return;
  if (hidden) label.style.setProperty('display', 'none', 'important');
  else label.style.removeProperty('display');
}

/** Mirror Required — show/hide the asterisk inside `label.label-title`. Idempotent. */
export function setRequired(doc, fieldId, on) {
  const wrap = doc?.getElementById(`wpforms-field-${fieldId}`);
  if (!wrap) return;
  const label = wrap.querySelector(':scope > label.label-title');
  if (!label) return;
  let star = label.querySelector(':scope > span.required');
  if (on) {
    if (!star) {
      star = doc.createElement('span');
      star.className = 'required';
      star.textContent = '*';
      label.appendChild(star);
    }
    star.style.removeProperty('display');
  } else if (star) {
    star.remove();
  }
}

/** Helper: resolve the iframe document (what every other helper wants). */
export function iframeDoc() {
  return document.querySelector('iframe.ui')?.contentDocument ?? null;
}

/**
 * Drop the `wpforms-quiz-enabled` body class that the Quiz addon adds.
 * Several snapshots were captured while Quiz was active — which replaces
 * the Confirmations block with Outcomes and hides the whole Confirmations
 * section via CSS. Stripping the class restores the stock view. the operator
 * plans to recapture without the addon; this is the workaround until then.
 *
 * Migration-only. Delete this helper after the affected snapshots are
 * recaptured with the Quiz addon disabled. Tracked in REFACTOR-BRIEF item K.
 */
export function stripQuizEnabled(doc) {
  if (!doc) return;
  doc.body?.classList.remove(
    'wpforms-quiz-enabled',
    'wpforms-quiz-graded-type-selected',
    'wpforms-quiz-personality-type-selected',
    'wpforms-quiz-weighted-type-selected',
    'wpforms-quiz-not-selected-type-selected',
  );
}

