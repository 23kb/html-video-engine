// WPForms-specific widget helpers.
// Scenes call these instead of inlining classList/innerHTML manipulation.
// Each helper is UI-only: it fakes the visual result of a real interaction
// (class toggles, style flips, chip HTML) without needing the live plugin JS.

import { cursor, sleep } from './engine.js';

// Resolve an element inside the iframe, given a selector string.
function $(selector) {
  const iframe = document.querySelector('iframe.ui');
  return iframe?.contentDocument?.querySelector(selector) ?? null;
}
function $$(selector) {
  const iframe = document.querySelector('iframe.ui');
  return iframe?.contentDocument?.querySelectorAll(selector) ?? [];
}
function getDoc() {
  return document.querySelector('iframe.ui')?.contentDocument ?? null;
}

/**
 * Expand a collapsed WPForms fields group (Advanced, Conditional Logic, etc.).
 * Handles the inline display:none + .unfoldable / .closed class patterns.
 * Also hides the collapse chevron icon that sits inside the group title.
 *
 *   await revealSection('.wpforms-builder-notifications-advanced');
 *
 * `groupSelector` must select a `.wpforms-panel-fields-group` container.
 * Matches multiple groups if the selector returns several (e.g. advanced
 * section exists once per notification block).
 */
export async function revealSection(groupSelector, { fade = 400 } = {}) {
  const groups = $$(groupSelector);
  if (!groups.length) {
    console.warn('revealSection: no match for', groupSelector);
    return;
  }
  for (const group of groups) {
    group.classList.remove('unfoldable', 'closed', 'wpforms-hidden');
    group.classList.add('opened');
    // Hide the collapse chevron inside the title — it's meaningless visually once opened.
    const chevron = group.querySelector('.wpforms-panel-fields-group-title i[class*="fa-chevron"]');
    if (chevron) chevron.style.display = 'none';
    const inners = group.querySelectorAll('.wpforms-panel-fields-group-inner');
    for (const inner of inners) {
      inner.style.display = 'block';
      inner.style.opacity = '0';
      inner.style.transition = `opacity ${fade}ms ease`;
    }
    void group.offsetWidth;
    for (const inner of inners) inner.style.opacity = '1';
  }
  await sleep(fade);
}

/**
 * Flip a WPForms toggle-control to checked/on. Moves cursor to the visible
 * slider, performs a click animation, then sets the underlying checkbox's
 * `checked` property (which is what WPForms CSS actually hooks into).
 *
 *   await toggleControl('#wpforms-panel-field-notifications-2-file_upload_attachment_enable-wrap');
 *
 * `fieldWrapSelector` must be the `*-wrap` container. `state` defaults to
 * 'on' — pass 'off' to uncheck, or 'toggle' to flip whatever it currently is.
 */
export async function toggleControl(fieldWrapSelector, { state: desired = 'on' } = {}) {
  const wrap = $(fieldWrapSelector);
  if (!wrap) throw new Error('toggleControl: wrap not found: ' + fieldWrapSelector);
  const input = wrap.querySelector('input[type="checkbox"]');
  const icon  = wrap.querySelector('.wpforms-toggle-control-icon');
  if (!input || !icon) throw new Error('toggleControl: missing input or icon inside ' + fieldWrapSelector);

  const iconSel = `${fieldWrapSelector} .wpforms-toggle-control-icon`;
  await cursor.moveTo(iconSel);
  await cursor.click();

  const next = desired === 'toggle' ? !input.checked : (desired === 'on');
  input.checked = next;
  await sleep(280); // let CSS transition settle
}

/**
 * Full smart-tag interaction: open dropdown, pick an item, insert chip, close.
 *
 *   await smartTag('#wpforms-panel-field-notifications-2-email-wrap', {
 *     pick: { type: 'field', label: 'Email' },  // or { type: 'other', value: 'admin_email' }
 *     direction: 'up',                          // 'up' flips dropdown above (for tight zooms)
 *     replaceChips: true,                       // clear existing chips before inserting
 *   });
 *
 * `fieldSelector` must be the `*-wrap` container that holds both the widget
 * and its pre-rendered dropdown (capture-time snapshot convention).
 */
export async function smartTag(fieldSelector, {
  pick,
  direction = 'down',
  replaceChips = true,
  openDelay = 700,
  pickDelay = 220,
  closeDelay = 500,
} = {}) {
  const doc = getDoc();
  if (!doc) throw new Error('smartTag: no iframe doc');

  const wrap = doc.querySelector(fieldSelector);
  if (!wrap) throw new Error('smartTag: wrap not found: ' + fieldSelector);

  const tagIcon = wrap.querySelector('.wpforms-show-smart-tags');
  const dd      = wrap.querySelector('.insert-smart-tag-dropdown');
  // Single-line inputs use `.wpforms-smart-tags-widget-input`; the Email
  // Message textarea uses `.wpforms-smart-tags-widget-textarea`. Both are
  // contenteditable chip hosts — match either.
  const chipHost= wrap.querySelector('.wpforms-smart-tags-widget-input, .wpforms-smart-tags-widget-textarea');
  if (!tagIcon || !dd || !chipHost) {
    throw new Error('smartTag: field is missing widget parts (tagIcon/dropdown/chipHost)');
  }

  // Flip dropdown direction if requested (upward keeps it in frame for tight zooms)
  if (direction === 'up') {
    dd.classList.remove('open-down');
    dd.classList.add('open-up');
    const ddH = dd.getBoundingClientRect().height || 280;
    dd.style.top = `-${ddH + 6}px`;
  }

  // Resolve the target list item for `pick`.
  // Supported shapes:
  //   { type: 'field', label: 'Email' }       → first field-item whose text contains label
  //   { type: 'field', value: '2' }           → <li data-value="2">
  //   { type: 'other', value: 'admin_email' } → <li data-value="admin_email">
  const item = resolvePickItem(dd, pick);
  if (!item) throw new Error('smartTag: pick not resolvable: ' + JSON.stringify(pick));

  // 1) Cursor to tag icon → click → reveal dropdown
  const tagIconSel = `${fieldSelector} .wpforms-show-smart-tags`;
  await cursor.moveTo(tagIconSel);
  await cursor.click();
  dd.classList.remove('closed');
  await sleep(openDelay);

  // 2) Cursor to target item → click. The item span itself has no data-value
  // for `other` tags (admin_email, user_email, all_fields) — only the parent
  // <li> carries it. Use the li's data-value, scoped by data-type so the
  // selector remains unique even if the same value appears under multiple
  // sections of the dropdown.
  const itemLi = item.closest('li');
  const liDataValue = itemLi?.dataset.value ?? '';
  const itemSel = `${fieldSelector} .insert-smart-tag-dropdown ul.list li[data-value="${liDataValue}"] .wpforms-smart-tags-widget-item[data-type="${item.dataset.type}"]`;
  await cursor.moveTo(itemSel);
  await sleep(pickDelay);
  await cursor.click();

  // 3) Insert the chip into the widget's contenteditable
  const label = item.textContent.trim();
  const dataValue = buildChipDataValue(item);
  if (replaceChips) chipHost.innerHTML = '';
  const chip = doc.createElement('span');
  chip.className = 'tag';
  chip.setAttribute('contenteditable', 'false');
  chip.setAttribute('data-value', dataValue);
  chip.innerHTML = `${label} <i class="fa fa-times-circle" title="Delete smart tag"></i>`;
  chip.style.opacity = '0';
  chip.style.transform = 'scale(0.7)';
  chip.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
  chipHost.appendChild(chip);
  await sleep(30);
  chip.style.opacity = '1';
  chip.style.transform = 'scale(1)';

  // 4) Close dropdown
  await sleep(closeDelay);
  dd.classList.add('closed');
}

/**
 * Pick a value from a native WPForms `<select>` (Email Template, etc.).
 * Native selects can't be animated by the browser, so we render a faux
 * dropdown overlay inside the iframe doc, animate the cursor to the target
 * option, then set `select.value` and dispatch a `change` event.
 *
 *   await selectDropdown('#wpforms-panel-field-notifications-2-template-wrap', {
 *     pick: 'modern',       // option value OR visible label
 *   });
 */
export async function selectDropdown(fieldWrapSelector, { pick, direction = 'down', openDelay = 500, pickDelay = 250 } = {}) {
  const doc = getDoc();
  const wrap = $(fieldWrapSelector);
  if (!wrap) throw new Error('selectDropdown: wrap not found: ' + fieldWrapSelector);
  const select = wrap.querySelector('select');
  if (!select) throw new Error('selectDropdown: no <select> inside ' + fieldWrapSelector);

  // Resolve target option by value or visible label
  const options = Array.from(select.options);
  const target = options.find(o => o.value === pick)
              || options.find(o => o.textContent.trim().toLowerCase() === String(pick).toLowerCase());
  if (!target) throw new Error('selectDropdown: pick not found: ' + pick);

  // Cursor on the select itself → click → open faux dropdown
  const selectSel = `${fieldWrapSelector} select`;
  await cursor.moveTo(selectSel);
  await cursor.click();

  const rect = select.getBoundingClientRect();
  const menu = doc.createElement('div');
  // __spot_keep so an active spotlight() doesn't dim the faux menu to invisibility.
  menu.className = '__wpf_faux_select __spot_keep';
  // Rough height estimate so we can place above the select when direction='up'.
  const estRowH = 34;
  const estMenuH = options.length * estRowH + 8;
  // position:fixed (not absolute) + max-z — escapes WPForms panel stacking contexts.
  // `body`-level absolute divs get covered by .wpforms-panel-content-wrap regardless of z-index;
  // `fixed` establishes a new stacking context anchored to the iframe viewport.
  const topPx = direction === 'up'
    ? (rect.top - estMenuH - 2)
    : (rect.bottom + 2);
  Object.assign(menu.style, {
    position: 'fixed',
    left:  rect.left + 'px',
    top:   topPx + 'px',
    width: rect.width + 'px',
    background: '#fff',
    border: '1px solid #8c8f94',
    borderRadius: '4px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
    padding: '4px 0',
    fontFamily: '-apple-system, "Segoe UI", sans-serif',
    fontSize: '14px',
    color: '#1d2327',
    zIndex: '2147483647',
    opacity: '0',
    transform: 'translateY(-4px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
  });
  for (const opt of options) {
    const row = doc.createElement('div');
    row.textContent = opt.textContent.trim();
    row.dataset.value = opt.value;
    Object.assign(row.style, {
      padding: '8px 14px',
      cursor: 'pointer',
      background: opt === target ? 'transparent' : 'transparent',
    });
    row.addEventListener('mouseenter', () => row.style.background = '#f0f6fc');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');
    menu.appendChild(row);
  }
  doc.body.appendChild(menu);
  void menu.offsetWidth;
  menu.style.opacity = '1';
  menu.style.transform = 'translateY(0)';
  await sleep(openDelay);

  // Cursor moves to the target option, highlights it, clicks
  const targetRow = menu.querySelector(`[data-value="${CSS.escape(target.value)}"]`);
  // Give the row a temporary id so cursor.moveTo can address it via selector in the iframe
  targetRow.id = '__wpf_faux_pick';
  await cursor.moveTo('#__wpf_faux_pick');
  targetRow.style.background = '#036aab';
  targetRow.style.color = '#fff';
  await sleep(pickDelay);
  await cursor.click();

  // Commit the selection on the real <select>
  select.value = target.value;
  select.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));

  // Fade out faux menu
  menu.style.opacity = '0';
  menu.style.transform = 'translateY(-4px)';
  await sleep(260);
  menu.remove();
}

/**
 * Flip a notification (or any settings-block) between Active / Inactive.
 * Green "Active" badge ↔ silver "Inactive" badge. Handles label, title,
 * data-active attribute, icon swap, and mirrors the hidden input value.
 *
 *   await toggleBlockActive('[data-block-type="notification"][data-block-id="2"]', { state: 'inactive' });
 *
 * `state` = 'active' | 'inactive' | 'toggle' (default).
 */
export async function toggleBlockActive(blockSelector, { state: desired = 'toggle' } = {}) {
  const doc = getDoc();
  const block = doc.querySelector(blockSelector);
  if (!block) throw new Error('toggleBlockActive: block not found: ' + blockSelector);
  const badge = block.querySelector('.wpforms-builder-settings-block-status');
  if (!badge) throw new Error('toggleBlockActive: status badge not found in ' + blockSelector);

  const badgeSel = `${blockSelector} .wpforms-builder-settings-block-status`;
  await cursor.moveTo(badgeSel);
  await cursor.click();

  const currentlyActive = badge.dataset.active === '1' || badge.classList.contains('wpforms-badge-green');
  const next = desired === 'toggle' ? !currentlyActive : (desired === 'active');

  badge.classList.remove('wpforms-badge-green', 'wpforms-badge-silver');
  badge.classList.add(next ? 'wpforms-badge-green' : 'wpforms-badge-silver');
  badge.dataset.active = next ? '1' : '0';
  badge.title = next ? 'Deactivate' : 'Activate';

  const label = badge.querySelector('.wpforms-status-label');
  if (label) label.textContent = next ? 'Active' : 'Inactive';
  const icon = badge.querySelector('i.fa');
  if (icon) {
    icon.classList.remove('fa-check', 'fa-ban');
    icon.classList.add(next ? 'fa-check' : 'fa-ban');
  }
  // Mirror the hidden input so form-submit state is consistent (not strictly needed for video).
  const input = block.querySelector('input[type="hidden"][id$="-enable"]');
  if (input) input.value = next ? '1' : '0';

  await sleep(280);
}

/**
 * Visually duplicate a settings-block (notification, confirmation, etc). Clones
 * the full DOM node, rewrites its data-block-id to something non-colliding, and
 * slide-fades it in below the original. Scene is responsible for the cursor —
 * call this AFTER you've clicked the clone icon.
 *
 *   await cursor.moveTo(cloneBtnSel); await cursor.click();
 *   await duplicateBlock('[data-block-type="notification"][data-block-id="2"]');
 *
 * Returns the new block's selector (useful for a follow-up zoomTo).
 */
export async function duplicateBlock(blockSelector, { fade = 900, nameOverride = null, insertBefore = null, expanded = false } = {}) {
  const doc = getDoc();
  const block = doc.querySelector(blockSelector);
  if (!block) throw new Error('duplicateBlock: block not found: ' + blockSelector);

  const copy = block.cloneNode(true);
  const origId = parseInt(block.dataset.blockId, 10) || 99;
  const newId = origId + 100; // big offset to avoid collisions with existing ids
  copy.setAttribute('data-block-id', String(newId));
  copy.classList.remove('wpforms-builder-settings-block-default');

  if (nameOverride) {
    const nameSpan = copy.querySelector('.wpforms-builder-settings-block-name');
    if (nameSpan) nameSpan.textContent = nameOverride;
    const nameInput = copy.querySelector('.wpforms-builder-settings-block-name-edit input');
    if (nameInput) nameInput.value = nameOverride;
  }

  if (expanded) {
    // Force expanded state even if the source block was collapsed.
    const content = copy.querySelector('.wpforms-builder-settings-block-content');
    if (content) content.style.display = '';
    const toggleIcon = copy.querySelector('.wpforms-builder-settings-block-toggle i');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-chevron-circle-down');
      toggleIcon.classList.add('fa-chevron-circle-up');
    }
  }

  // Pretty slide-in: collapse height from 0 to natural, fade+scale from 0.94 up.
  copy.style.opacity = '0';
  copy.style.transform = 'translateY(-12px) scale(0.94)';
  copy.style.maxHeight = '0px';
  copy.style.overflow = 'hidden';
  copy.style.transition = `max-height ${fade}ms cubic-bezier(0.22, 1, 0.36, 1),
                           opacity ${fade}ms ease,
                           transform ${fade}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  if (insertBefore) {
    const ref = doc.querySelector(insertBefore);
    if (!ref) throw new Error('duplicateBlock: insertBefore target not found: ' + insertBefore);
    ref.parentNode.insertBefore(copy, ref);
  } else {
    block.parentNode.insertBefore(copy, block.nextSibling);
  }
  // Measure natural height by temporarily unsetting max-height
  copy.style.maxHeight = 'none';
  const naturalH = copy.getBoundingClientRect().height;
  copy.style.maxHeight = '0px';
  void copy.offsetWidth;

  copy.style.maxHeight = naturalH + 'px';
  copy.style.opacity = '1';
  copy.style.transform = 'translateY(0) scale(1)';
  await sleep(fade + 120);
  // Release max-height so future content changes don't break layout
  copy.style.maxHeight = '';
  copy.style.overflow = '';

  return `[data-block-type="${block.dataset.blockType}"][data-block-id="${newId}"]`;
}

/**
 * WPForms-style modal prompt: "Enter a notification name" dialog with text input
 * + OK/Cancel. Mimics the native jconfirm dialog visually. Animates the cursor to
 * the OK button and commits.
 *
 *   await showPrompt({
 *     title: 'Enter a notification name',
 *     placeholder: 'Eg: User Confirmation',
 *     typeText: 'New Notification',
 *   });
 *
 * Returns the typed value.
 */
export async function showPrompt({
  title = 'Enter a name',
  placeholder = '',
  typeText = '',
  openDelay = 400,
  typeDelay = 50,
  confirmDelay = 500,
  fade = 280,
  backdropColor = 'rgba(0,0,0,0.5)',
} = {}) {
  const doc = getDoc();

  // Backdrop — position:fixed escapes WPForms panel stacking contexts (see memory reference).
  const backdrop = doc.createElement('div');
  backdrop.className = '__wpf_prompt_backdrop __spot_keep __whiteout_keep';
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0',
    background: backdropColor,
    zIndex: '2147483646',
    opacity: '0',
    transition: `opacity ${fade}ms ease`,
  });

  const dialog = doc.createElement('div');
  dialog.className = '__wpf_prompt_dialog __spot_keep __whiteout_keep';
  Object.assign(dialog.style, {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%) scale(0.92)',
    background: '#fff',
    borderRadius: '4px',
    borderTop: '6px solid #3892d2',
    padding: '30px 40px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
    zIndex: '2147483647',
    opacity: '0',
    transition: `opacity ${fade}ms ease, transform ${fade}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
    minWidth: '420px',
    textAlign: 'center',
    color: '#1d2327',
  });
  dialog.innerHTML = `
    <div style="width:56px;height:56px;border-radius:50%;background:#3892d2;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;color:#fff;font-size:30px;font-style:italic;font-weight:700;font-family:Georgia,serif;line-height:1;">i</div>
    <div style="font-size:16px;margin-bottom:18px;">${title}</div>
    <input type="text" class="__wpf_prompt_input" placeholder="${placeholder}" style="width:100%;padding:10px 12px;border:1px solid #ccd0d4;border-radius:3px;font-size:14px;box-sizing:border-box;margin-bottom:24px;outline:none;">
    <div style="display:flex;justify-content:center;gap:10px;">
      <button class="__wpf_prompt_ok" id="__wpf_prompt_ok_tmp" style="background:#218ecb;color:#fff;border:none;padding:10px 28px;border-radius:3px;cursor:pointer;font-size:15px;font-weight:600;">OK</button>
      <button class="__wpf_prompt_cancel" style="background:#f1f1f1;color:#333;border:none;padding:10px 24px;border-radius:3px;cursor:pointer;font-size:15px;">Cancel</button>
    </div>
  `;

  doc.body.appendChild(backdrop);
  doc.body.appendChild(dialog);
  void dialog.offsetWidth;
  backdrop.style.opacity = '1';
  dialog.style.opacity = '1';
  dialog.style.transform = 'translate(-50%, -50%) scale(1)';
  await sleep(fade + openDelay);

  // Type into the input, char-by-char
  const input = dialog.querySelector('.__wpf_prompt_input');
  if (typeText) {
    for (const ch of typeText) {
      input.value += ch;
      await sleep(typeDelay);
    }
    await sleep(320);
  }

  // Cursor → OK → click
  await cursor.moveTo('#__wpf_prompt_ok_tmp');
  await sleep(confirmDelay);
  await cursor.click();

  // Fade out
  backdrop.style.opacity = '0';
  dialog.style.opacity = '0';
  dialog.style.transform = 'translate(-50%, -50%) scale(0.92)';
  await sleep(fade);
  backdrop.remove();
  dialog.remove();
  return typeText;
}

// whiteout() removed 2026-05-11 per Phase 5c.1 dead-code deletion.
// Zero production callers verified by Codex (docs/phase-5c1-dead-code-verification-2026-05-11.md).

/**
 * Collapse a settings-block to just its header (hide the content div).
 * Mirrors what WPForms does when a user clicks the collapse chevron.
 *
 *   await collapseBlock('[data-block-type="notification"][data-block-id="1"]');
 */
export async function collapseBlock(blockSelector) {
  const doc = getDoc();
  const block = doc.querySelector(blockSelector);
  if (!block) throw new Error('collapseBlock: block not found: ' + blockSelector);
  const content = block.querySelector('.wpforms-builder-settings-block-content');
  if (content) content.style.display = 'none';
  const toggleIcon = block.querySelector('.wpforms-builder-settings-block-toggle i');
  if (toggleIcon) {
    toggleIcon.classList.remove('fa-chevron-circle-up');
    toggleIcon.classList.add('fa-chevron-circle-down');
  }
}

/**
 * Enable the conditional-logic toggle on a notification and inject a faux
 * WPForms-style rule row, populated from `rule`. Snapshot HTML doesn't contain
 * the rule-builder UI (WPForms renders it at runtime), so we build a styled
 * scaffold and animate each cell filling in.
 *
 *   await enableConditionalLogicRule('#wpforms-panel-field-notifications-1-conditional_logic-wrap', {
 *     rule: { action: 'Send', match: 'all', field: 'Message', operator: 'contains', value: 'Urgent' },
 *   });
 *
 * Returns selector hashes useful for scene zoom/highlight:
 *   { containerSel, actionSel, fieldSel, operatorSel, valueSel }
 */
export async function enableConditionalLogicRule(toggleWrapSelector, { rule, fade = 400 } = {}) {
  const doc = getDoc();
  const wrap = doc.querySelector(toggleWrapSelector);
  if (!wrap) throw new Error('enableConditionalLogicRule: wrap not found: ' + toggleWrapSelector);

  // 1) Flip the checkbox ON.
  const toggleRoot = wrap.querySelector('.wpforms-toggle-control') || wrap;
  toggleRoot.classList.add('wpforms-toggle-control-checked');
  const cb = wrap.querySelector('input[type="checkbox"]');
  if (cb) cb.checked = true;

  // 2) Build the scaffold (hidden, then animated in).
  const containerId = '__cl_rule_' + Math.random().toString(36).slice(2, 7);
  const container = doc.createElement('div');
  container.id = containerId;
  container.className = 'wpforms-conditional-groups __cl_injected';
  container.style.cssText = `
    margin-top: 16px; padding: 16px; background: #f5f7fa; border: 1px solid #dde2e7;
    border-radius: 6px; font-size: 13px; color: #2b2f33;
    opacity: 0; max-height: 0; overflow: hidden;
    transition: max-height ${fade}ms cubic-bezier(0.22, 1, 0.36, 1),
                opacity ${fade}ms ease, padding ${fade}ms ease;
  `;
  container.innerHTML = `
    <p class="wpforms-conditional-sub-title" style="margin:0 0 12px 0;line-height:1.8;">
      <select class="__cl_action" style="padding:4px 8px;border:1px solid #c3c9ce;border-radius:4px;background:#fff;margin:0 6px;"><option>${escapeHtml(rule.action || 'Send')}</option></select>
      this notification if
      <select class="__cl_match" style="padding:4px 8px;border:1px solid #c3c9ce;border-radius:4px;background:#fff;margin:0 6px;"><option>${escapeHtml(rule.match || 'all')}</option></select>
      of the following match:
    </p>
    <table style="width:100%;border-collapse:separate;border-spacing:8px 0;">
      <tr>
        <td style="width:36%;">
          <select class="__cl_field" style="width:100%;padding:8px 10px;border:1px solid #c3c9ce;border-radius:4px;background:#fff;opacity:0;transition:opacity 300ms ease;">
            <option>${escapeHtml(rule.field)}</option>
          </select>
        </td>
        <td style="width:28%;">
          <select class="__cl_operator" style="width:100%;padding:8px 10px;border:1px solid #c3c9ce;border-radius:4px;background:#fff;opacity:0;transition:opacity 300ms ease;">
            <option>${escapeHtml(rule.operator)}</option>
          </select>
        </td>
        <td style="width:36%;">
          <input class="__cl_value" type="text" value="" placeholder="Enter value"
            style="width:100%;padding:8px 10px;border:1px solid #c3c9ce;border-radius:4px;background:#fff;opacity:0;transition:opacity 300ms ease;">
        </td>
      </tr>
    </table>
  `;

  wrap.parentNode.insertBefore(container, wrap.nextSibling);

  // 3) Expand container
  const natH = container.scrollHeight;
  container.style.opacity = '1';
  container.style.maxHeight = natH + 'px';
  await sleep(fade + 80);
  container.style.maxHeight = 'none';

  // 4) Animate cells filling in sequentially
  const fieldEl = container.querySelector('.__cl_field');
  const opEl    = container.querySelector('.__cl_operator');
  const valEl   = container.querySelector('.__cl_value');

  fieldEl.style.opacity = '1';
  await sleep(350);
  opEl.style.opacity = '1';
  await sleep(350);
  valEl.style.opacity = '1';
  // Type the value character by character
  const text = rule.value || '';
  for (let i = 1; i <= text.length; i++) {
    valEl.value = text.slice(0, i);
    await sleep(55);
  }

  return {
    containerSel: `#${containerId}`,
    actionSel:    `#${containerId} .__cl_action`,
    matchSel:     `#${containerId} .__cl_match`,
    fieldSel:     `#${containerId} .__cl_field`,
    operatorSel:  `#${containerId} .__cl_operator`,
    valueSel:     `#${containerId} .__cl_value`,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ── internals ───────────────────────────────────────────────────────────────

function resolvePickItem(dropdown, pick) {
  if (!pick) return null;
  const items = dropdown.querySelectorAll('ul.list li');
  for (const li of items) {
    const span = li.querySelector(`.wpforms-smart-tags-widget-item[data-type="${pick.type}"]`);
    if (!span) continue;
    if (pick.value !== undefined && String(li.dataset.value) === String(pick.value)) return span;
    if (pick.label && span.textContent.trim().toLowerCase().includes(pick.label.toLowerCase())) return span;
  }
  return null;
}

// Build the chip's data-value attribute matching WPForms conventions.
// For field items: `field_id="N"`; for other: the tag key literal.
function buildChipDataValue(item) {
  const li = item.closest('li');
  const type = item.dataset.type;
  if (type === 'field') {
    const additional = item.dataset.additional ? `|${item.dataset.additional}` : '';
    return `field_id="${li.dataset.value}${additional}"`;
  }
  return li.dataset.value;
}

// uniqueSelectorFor() removed 2026-05-11 per Phase 5c.1 dead-code deletion.
// Was a 1-line wrapper; 2 call sites above now use template strings directly.
