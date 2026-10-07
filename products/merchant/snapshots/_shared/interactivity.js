/**
 * Merchant snapshot transitions (Merchant + Merchant Pro 2.3.1, Botiga storefront).
 *
 * Runs after products/_runtime/core.js (delegation, navigation, show/hide
 * helpers) and ../_shared/nav.js. This file holds only what names a Merchant
 * control. Entry shape: { label, event, match(el, evt), apply(el, evt) } —
 * products/_runtime/DESIGN.md §2.
 *
 * Source of truth: merchant/assets/js/admin/admin.js (module pages, conditions,
 * accordions, colour picker), merchant/assets/js/modules/* and
 * merchant-pro/assets/js/modules/* (storefront). Behaviours:
 * products/merchant/inventory/interactions.md. Nothing here saves, posts or
 * mails: Save, Enable/Disable, licence and install buttons stay inert or hop
 * to a captured state.
 */
(function () {
  'use strict';
  if (!window.SnapRuntime || typeof window.SnapRuntime.register !== 'function') return;
  var R = window.SnapRuntime;

  function closest(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function all(sel, root) { try { return [].slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function slug() { return R.currentSlug ? R.currentSlug() : ''; }
  function isModulePage() { return !!one('.merchant-module-page-content, .merchant-module-page'); }
  // snap-strip-inline-jquery: WooCommerce's order screen carries inline onclick handlers that call jQuery, which a
  // snapshot does not load; the runtime entries below do their job (e.g. wp-enter-new-reveal), so drop them on load.
  [].slice.call(document.querySelectorAll('[onclick*="jQuery"]')).forEach(function (n) { n.removeAttribute('onclick'); });

  // fbt-initial-total: frequently-bought-together.js runs updateBundleTotals on load; with every optional box
  // disabled (variations not picked) live shows the "select" message in the total
  [].slice.call(document.querySelectorAll('.merchant-frequently-bought-together-bundle.optional-bundle')).forEach(function (b) {
    var boxes = [].slice.call(b.querySelectorAll('.is-optional .include-product')), tot = b.querySelector('.merchant-frequently-bought-together-bundle-total-price');
    if (tot && boxes.length && boxes.every(function (x) { return !x.checked; }) && !tot.textContent.trim()) tot.innerHTML = '<div class="choice-missing-message">Please select at least one product.</div>';
  });

  // botiga-style aliases for the entries copied from the botiga pack
  var $ = one, $$ = all, up = closest;
  function unbake(el) { if (el) { R.clearBaked(el); all('[data-snap-baked]', el).forEach(R.clearBaked); } }
  function show(el) { if (!el) return; R.clearBaked(el); el.classList.add('merchant-show'); }
  function hide(el) { if (el) el.classList.remove('merchant-show'); }
  var stop = function (evt) { if (evt && evt.preventDefault) evt.preventDefault(); };
  var parkedCloseAll = function () {
    [].forEach.call(document.querySelectorAll('[data-snap-parked]'), function (n) { n.remove(); });
    [].forEach.call(document.querySelectorAll('.woocommerce-layout__activity-panel-wrapper.is-open'), function (w) { w.classList.remove('is-open'); });
    [].forEach.call(document.querySelectorAll('[data-snap-park]'), function (x) { x.classList.remove('is-pressed', 'is-active'); x.setAttribute('aria-expanded', 'false'); });
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('[data-snap-parked]')) parkedCloseAll(); });

  // ─ conditions ───────────────────────────────────────────────────────────
  // @since 2026-10-03 @source merchant/assets/js/admin/admin.js:2203-2264,2820-2940 @verified 2026-10-03 @product merchant
  // Two condition systems on every settings field: data-condition [field, op, value] (== / any) and
  // data-conditions {field, operator, value} or {relation, terms}. Re-run on every change, as the plugin does.
  // Strings and numbers only: a checkbox's boolean must stay a boolean (=== true), not become 1.
  function isNumeric(v) { return (typeof v === 'string' || typeof v === 'number') && v !== '' && !isNaN(v) && isFinite(v); }
  function targetsFor(field, name, scopeBody) {
    var q = 'input[name="merchant[' + name + ']"],select[name="merchant[' + name + ']"]';
    var t = all(q);
    if (!t.length && scopeBody) t = all('.merchant-field-' + name + ' input, .merchant-field-' + name + ' select', scopeBody);
    if (!t.length) t = all('input[name="merchant[' + name + '][]"],select[name="merchant[' + name + '][]"]');
    if (!t.length) t = all('.merchant-group-fields-container .merchant-field-' + name + ' input[name*="' + name + '"], .merchant-group-fields-container .merchant-field-' + name + ' select[name*="' + name + '"]');
    return t;
  }
  function valueOf(t) {
    if (!t.length) return undefined;
    var first = t[0];
    if (first.type === 'checkbox' && t.length > 1) return t.filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
    if (first.type === 'checkbox') return first.checked;
    if (first.type === 'radio') { var c = t.filter(function (x) { return x.checked; })[0]; return c ? c.value : undefined; }
    return first.value;
  }
  function evaluate(cond, field) {
    if (cond && cond.relation) {
      var rel = String(cond.relation).toUpperCase(), n = 0;
      for (var i = 0; i < cond.terms.length; i++) { var ok = evaluate(cond.terms[i], field); if (rel === 'OR' && ok) return true; if (ok) n++; }
      return rel === 'AND' && n === cond.terms.length;
    }
    var c = cond && cond.terms ? cond.terms[0] : cond;
    if (!c || !c.field) return true;
    var v = valueOf(targetsFor(field, c.field, closest(field, '.layout-body')));
    if (isNumeric(v)) v = Number(v);
    var want = Array.isArray(c.value) ? c.value.map(function (x) { return isNumeric(x) ? Number(x) : x; }) : c.value;
    switch (c.operator) {
      case '===': return v === want;
      case '!==': return v !== want;
      case '>': return v > want;
      case '<': return v < want;
      case '>=': return v >= want;
      case '<=': return v <= want;
      case 'in': return Array.isArray(want) && want.indexOf(v) !== -1;
      case '!in': return Array.isArray(want) && want.indexOf(v) === -1;
      case 'contains': return Array.isArray(v) && v.indexOf(want) !== -1;
      case '!contains': return Array.isArray(v) && v.indexOf(want) === -1;
    }
    return false;
  }
  function setShown(field, on) {
    if (on) { R.clearBaked(field); field.classList.remove('merchant-hide'); field.classList.add('merchant-show'); }
    else { field.classList.remove('merchant-show'); field.classList.add('merchant-hide'); }
  }
  function checkFields() {
    all('.merchant-module-page-setting-field').forEach(function (field) {
      if (closest(field, '.merchant-flexible-content-layouts, template, .layouts-templates')) return;
      var raw = field.getAttribute('data-condition');
      if (raw && raw !== '[]') {
        var cond; try { cond = JSON.parse(raw); } catch (_) { cond = null; }
        if (cond && cond.length) {
          var body = closest(field, '.layout-body');
          var t = body ? all('input[name*="' + cond[0] + '"],select[name*="' + cond[0] + '"]', body) : [];
          if (!t.length) t = all('input[name="merchant[' + cond[0] + ']"],select[name="merchant[' + cond[0] + ']"]');
          if (t.length) {
            var passed = false;
            var picked = t[0].type === 'radio' || t[0].type === 'checkbox' ? t.filter(function (x) { return x.checked; })[0] : null;
            var val = picked ? picked.value : (t[0].tagName === 'SELECT' ? t[0].value : null);
            if (cond[1] === '==') passed = val !== null && val == cond[2]; // eslint-disable-line eqeqeq
            if (cond[1] === 'any') passed = val !== null && String(cond[2]).split('|').indexOf(String(val)) !== -1;
            setShown(field, passed);
          }
        }
      }
      var raws = field.getAttribute('data-conditions');
      if (raws) { var cs; try { cs = JSON.parse(raws); } catch (_) { cs = null; } if (cs && typeof cs === 'object') setShown(field, evaluate(cs, field)); }
    });
  }

  // ─ save bar ─────────────────────────────────────────────────────────────
  // @since 2026-10-03 @source merchant/assets/js/admin/admin.js:22-50 @verified 2026-10-03 @product merchant
  function markDirty() { var bar = one('.merchant-module-page-ajax-header'); if (bar) show(bar); }

  // ─ jQuery UI accordions (campaign rows, field groups, licence help) ─────
  // @since 2026-10-03 @source merchant/assets/js/admin/admin.js:968,1164,1341-1366 @verified 2026-10-03 @product merchant
  // Every Merchant accordion is collapsible with heightStyle content. The capture keeps jQuery UI's own
  // markup (aria-controls, ui-accordion-header-active, ui-accordion-content-active), so a header click
  // swaps those, one open panel per accordion.
  function setHeader(h, on) {
    var panel = document.getElementById(h.getAttribute('aria-controls'));
    h.classList.toggle('ui-accordion-header-active', on); h.classList.toggle('ui-state-active', on);
    h.classList.toggle('ui-accordion-header-collapsed', !on); h.classList.toggle('ui-corner-top', on); h.classList.toggle('ui-corner-all', !on);
    h.setAttribute('aria-selected', on ? 'true' : 'false'); h.setAttribute('aria-expanded', on ? 'true' : 'false');
    var icon = one('.ui-accordion-header-icon', h); if (icon) { icon.classList.toggle('ui-icon-triangle-1-s', on); icon.classList.toggle('ui-icon-triangle-1-e', !on); }
    var grp = closest(h, '.merchant-group-field'); if (grp && grp.firstElementChild === h) grp.classList.toggle('open', on);
    if (!panel) return;
    panel.classList.toggle('ui-accordion-content-active', on); panel.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) { R.clearBaked(panel); R.slideDown(panel, 300); } else R.slideUp(panel, 300);
  }
  function accordionOf(h) { var root = h.parentElement; while (root && !root.classList.contains('ui-accordion')) root = root.parentElement; return root; }

  // ─ colour picker (parked Pickr panel) ───────────────────────────────────
  // @since 2026-10-03 @source merchant/assets/js/admin/admin.js:2265-2345 @verified 2026-10-03 @product merchant
  var pcr = null, pcrFor = null;
  function closePicker() { if (pcr) { pcr.remove(); pcr = null; pcrFor = null; document.body.classList.remove('merchant-height-auto'); } }
  function openPicker(btn) {
    closePicker();
    var tpl = one('template[data-snap-fragment="merchant-pcr-app"]');
    if (!tpl) { R.miss('#colour-picker', 'no parked Pickr panel on this snapshot'); return; }
    var holder = document.createElement('div'); holder.innerHTML = tpl.innerHTML; pcr = holder.firstElementChild; if (!pcr) return;
    document.body.appendChild(pcr); pcrFor = btn;
    var input = one('.merchant-color-input', closest(btn, '.merchant-color')) ;
    var colour = (input && input.value) || btn.getAttribute('data-default-color') || '#212121';
    all('.pcr-result', pcr).forEach(function (r) { r.value = colour; r.setAttribute('value', colour); });
    all('.pcr-current-color, .pcr-last-color', pcr).forEach(function (p) { p.style.setProperty('--pcr-color', colour); p.style.color = colour; });
    var box = btn.getBoundingClientRect();
    pcr.style.position = 'fixed'; pcr.style.left = Math.max(8, Math.min(box.left, window.innerWidth - pcr.offsetWidth - 8)) + 'px';
    var top = box.bottom + 6; if (top + pcr.offsetHeight > window.innerHeight - 8) top = Math.max(8, box.top - pcr.offsetHeight - 6);
    pcr.style.top = top + 'px'; pcr.classList.add('visible'); document.body.classList.add('merchant-height-auto');
  }
  function pickColour(colour) {
    if (!pcrFor) return;
    var wrap = closest(pcrFor, '.merchant-color'); var input = one('.merchant-color-input', wrap);
    pcrFor.style.backgroundColor = colour; if (input) { input.value = colour; input.setAttribute('value', colour); }
    all('.pcr-result', pcr).forEach(function (r) { r.value = colour; });
    all('.pcr-current-color', pcr).forEach(function (p) { p.style.setProperty('--pcr-color', colour); p.style.color = colour; });
    markDirty();
  }

  // ─ AI prompts modal ─────────────────────────────────────────────────────
  // @since 2026-10-03 @source merchant/assets/js/admin/admin.js:2720-2801 @verified 2026-10-03 @product merchant
  var COPY_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M3 10V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var CHECK_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function openAi(badge) {
    var m = one('#merchant-ai-prompts-modal'); if (!m) return;
    var t = one('.merchant-ai-prompts-modal-title-text', m); if (t) t.textContent = badge.getAttribute('data-ai-title') || '';
    var b = one('.merchant-ai-prompts-modal-blurb', m); if (b) b.textContent = badge.getAttribute('data-ai-blurb') || '';
    var list = one('.merchant-ai-prompts-modal-list', m);
    var prompts = []; try { prompts = JSON.parse(badge.getAttribute('data-ai-prompts') || '[]'); } catch (_) {}
    if (list) {
      list.innerHTML = '';
      prompts.forEach(function (p) {
        var row = document.createElement('button'); row.type = 'button'; row.className = 'merchant-ai-prompt-row'; row.setAttribute('data-prompt', p); row.setAttribute('aria-label', 'Click to copy');
        var s = document.createElement('span'); s.className = 'merchant-ai-prompt-text'; s.textContent = p; row.appendChild(s);
        var ic = document.createElement('span'); ic.className = 'merchant-ai-prompt-icon'; ic.innerHTML = COPY_SVG; row.appendChild(ic);
        list.appendChild(row);
      });
    }
    show(m);
  }

  // ─ variation selects (WooCommerce add-to-cart-variation.js, Merchant's offer rows) ─
  // @since 2026-10-03 @source woocommerce/assets/js/frontend/add-to-cart-variation.js:44-330 @verified 2026-10-03 @product merchant
  // The capture keeps WooCommerce's own variation JSON: data-product_variations on the variations form and
  // data-variations on Merchant's volume-discount / bundle / FBT rows. A full selection finds the variation
  // the way WooCommerce does (an empty attribute value matches any), then shows its price and stock line,
  // swaps the main image when that image is in the snapshot, sets variation_id and enables the buttons.
  function variationsHost(el) {
    var host = closest(el, '[data-product_variations], [data-variations]');
    if (host) return host;
    var pid = closest(el, '[data-product-id], [data-product_id]');
    var id = pid && (pid.getAttribute('data-product-id') || pid.getAttribute('data-product_id'));
    return id ? one('form.variations_form[data-product_id="' + id + '"]') : one('form.variations_form');
  }
  function variationsOf(host) {
    var raw = host.getAttribute('data-product_variations') || host.getAttribute('data-variations') || '[]';
    try { var v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function attrSelects(scope) { return all('select[data-attribute_name], select[name^="attribute_"]', scope); }
  function pickedAttrs(scope) {
    var out = {}, full = true;
    attrSelects(scope).forEach(function (s) { var n = s.getAttribute('data-attribute_name') || s.name; out[n] = s.value; if (!s.value) full = false; });
    return { attrs: out, full: full };
  }
  function findVariation(list, attrs) {
    for (var i = 0; i < list.length; i++) {
      var a = list[i].attributes || {}, ok = true;
      for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k) && a[k] && a[k] !== attrs[k]) { ok = false; break; } }
      if (ok) return list[i];
    }
    return null;
  }
  function baseName(u) { return String(u || '').split('?')[0].split('/').pop().replace(/-\d+x\d+(?=\.\w+$)/, ''); }
  function swapImage(v) {
    var img = one('.woocommerce-product-gallery__image img.wp-post-image, .woocommerce-product-gallery__image img');
    if (!img) return;
    if (!img.hasAttribute('data-snap-orig-src')) { img.setAttribute('data-snap-orig-src', img.getAttribute('src') || ''); img.setAttribute('data-snap-orig-srcset', img.getAttribute('srcset') || ''); }
    var want = v && v.image && baseName(v.image.src || v.image.full_src);
    if (!want) return;
    // Only a picture the snapshot holds: any captured <img> whose original URL names the same file.
    var hit = all('img').filter(function (i) { return [i.getAttribute('data-src'), i.getAttribute('data-large_image'), i.getAttribute('data-o_src')].some(function (u) { return u && baseName(u) === want; }); })[0];
    if (hit && hit !== img) { img.setAttribute('src', hit.getAttribute('src')); img.removeAttribute('srcset'); }
  }
  function restoreImage() {
    var img = one('.woocommerce-product-gallery__image img[data-snap-orig-src]');
    if (!img) return;
    img.setAttribute('src', img.getAttribute('data-snap-orig-src')); var ss = img.getAttribute('data-snap-orig-srcset'); if (ss) img.setAttribute('srcset', ss);
  }
  function setButtons(scope, enabled, buyable) {
    all('.single_add_to_cart_button, .merchant-buy-now-button, button[type=submit], .merchant-add-to-cart-button, .add_to_cart_button', scope).forEach(function (b) {
      b.classList.toggle('disabled', !enabled || !buyable);
      b.classList.toggle('wc-variation-selection-needed', !enabled);
      b.classList.toggle('wc-variation-is-unavailable', enabled && !buyable);
      if (b.tagName === 'BUTTON' && b.classList.contains('merchant-buy-now-button')) { if (enabled && buyable) b.removeAttribute('disabled'); else b.setAttribute('disabled', 'disabled'); }
    });
    var wrap = one('.woocommerce-variation-add-to-cart', scope);
    if (wrap) { wrap.classList.toggle('woocommerce-variation-add-to-cart-disabled', !(enabled && buyable)); wrap.classList.toggle('woocommerce-variation-add-to-cart-enabled', enabled && buyable); }
  }
  function applyVariation(sel) {
    var host = variationsHost(sel); if (!host) return;
    var scope = host.matches && host.matches('form') ? host : (closest(sel, '.merchant-volume-discounts-item, .merchant-frequently-bought-together-bundle-product, .merchant-sticky-add-to-cart-wrapper, form, li') || host);
    var p = pickedAttrs(scope);
    var reset = one('.reset_variations', scope);
    var any = Object.keys(p.attrs).some(function (k) { return p.attrs[k]; });
    if (reset) { reset.style.display = any ? 'inline-block' : 'none'; reset.style.visibility = any ? 'visible' : 'hidden'; }
    var box = one('.woocommerce-variation.single_variation', scope);
    var vid = one('input.variation_id', scope);
    var v = p.full ? findVariation(variationsOf(host), p.attrs) : null;
    if (!v) {
      if (box) { box.innerHTML = p.full ? '<div class="woocommerce-variation-availability"><p class="wc-no-matching-variations woocommerce-info">Sorry, no products matched your selection. Please choose a different combination.</p></div>' : ''; box.style.display = p.full ? '' : 'none'; }
      if (vid) vid.value = '0';
      setButtons(scope, false, false);
      if (host.matches && host.matches('form.variations_form')) restoreImage();
      return;
    }
    var buyable = v.is_purchasable !== false && v.is_in_stock !== false;
    if (box) {
      box.innerHTML = '<div class="woocommerce-variation-description">' + (v.variation_description || '') + '</div>' +
        '<div class="woocommerce-variation-price">' + (v.price_html || '') + '</div>' +
        '<div class="woocommerce-variation-availability">' + (v.availability_html || '') + '</div>';
      R.clearBaked(box); box.style.display = '';
    }
    if (vid) { vid.value = String(v.variation_id || 0); vid.setAttribute('value', vid.value); }
    setButtons(scope, true, buyable);
    if (host.matches && host.matches('form.variations_form')) swapImage(v);
  }

  // ─ merchant preview (settings → live preview) ────────────────────────────
  // @since 2026-10-03 @source merchant/assets/js/admin/merchant-preview.js:14-140,251-330 @verified 2026-10-03 @product merchant
  // Port of updateElements(): the capture parks the page's merchantPreviewManipulators on
  // <body data-snap-preview-manipulators>; every change to a merchant[...] field re-applies css variables,
  // text, attributes, classes and icons to the preview, as the plugin does.
  var MAN = null;
  try { MAN = JSON.parse(document.body.getAttribute('data-snap-preview-manipulators') || 'null'); } catch (_) { MAN = null; }
  function fieldOf(setting) { return all('[name="merchant[' + setting + ']"]'); }
  function fieldVal(setting) {
    var f = fieldOf(setting); if (!f.length) return undefined;
    if (f[0].type === 'radio') { var c = f.filter(function (x) { return x.checked; })[0]; return c ? c.value : undefined; }
    if (f[0].type === 'checkbox') return f[0].checked;
    return f[0].value;
  }
  function replacements(v, m) {
    if (!m || !m.replacements || v == null) return v;
    var r = m.replacements; if (Array.isArray(r) && r.length === 2 && Array.isArray(r[0])) { r[0].forEach(function (s, i) { v = String(v).split(s).join(r[1][i] || ''); }); }
    return v;
  }
  function updatePreview() {
    if (!MAN) return;
    Object.keys(MAN.css || {}).forEach(function (k) { var m = MAN.css[k]; var v = fieldVal(m.setting); if (v === undefined) return; all(m.selector).forEach(function (e) { e.style.setProperty(m.variable, v + (m.unit || '')); }); });
    Object.keys(MAN.text || {}).forEach(function (k) { var m = MAN.text[k]; var v = fieldVal(m.setting); if (v === undefined) return; v = replacements(v, m); all(m.selector).forEach(function (e) { e.innerHTML = v; }); });
    Object.keys(MAN.attributes || {}).forEach(function (k) { var m = MAN.attributes[k]; var v = fieldVal(m.setting); if (v === undefined) return; v = replacements(v, m); all(m.selector).forEach(function (e) { e.setAttribute(m.attribute, v); }); });
    Object.keys(MAN.classes || {}).forEach(function (k) {
      var m = MAN.classes[k]; var f = fieldOf(m.setting); if (!f.length) return;
      (m.remove || []).forEach(function (c) { all(m.selector).forEach(function (e) { e.classList.remove(c); }); });
      if (f[0].type === 'checkbox') { all(m.selector).forEach(function (e) { e.classList.toggle(m.add, f[0].checked); }); return; }
      var v = fieldVal(m.setting);
      all(m.selector).forEach(function (e) { if (m.add) e.classList.toggle(m.add); else if (v) e.classList.add(v); });
    });
    Object.keys(MAN.icons || {}).forEach(function (k) {
      var m = MAN.icons[k]; var r = fieldOf(m.setting).filter(function (x) { return x.checked; })[0]; if (!r) return;
      var img = one('figure img', r.parentElement);
      all(m.selector).forEach(function (e) { if (r.value === 'none') e.style.display = 'none'; else { e.style.display = ''; if (img) e.setAttribute('src', img.getAttribute('src')); } });
    });
    Object.keys(MAN.svg_icons || {}).forEach(function (k) {
      var m = MAN.svg_icons[k]; var v = fieldVal(m.setting); if (v === undefined) return;
      all(m.selector).forEach(function (e) { if (v === 'none') e.style.display = 'none'; else { e.style.display = ''; if (m.icons_lib && m.icons_lib[v]) e.innerHTML = m.icons_lib[v]; } });
    });
  }

  // ─ select2 / selectWoo single selects (checkout Country / State, admin selects) ─────
  // @since 2026-10-03 @source woocommerce/assets/js/selectWoo/selectWoo.full.js (single selection, dropdown + search) @verified 2026-10-03 @product merchant
  // The capture keeps the hidden <select> with every option and select2's rendered container. A click opens
  // select2's own dropdown markup built from those options; typing filters; a pick sets the select's value
  // and the rendered label; Escape or an outside click closes it. Multi-selects stay as captured.
  var s2 = null;
  function s2Close() { if (!s2) return; s2.drop.remove(); s2.box.classList.remove('select2-container--open'); var sel = one('.select2-selection', s2.box); if (sel) sel.setAttribute('aria-expanded', 'false'); s2 = null; }
  function s2Fill(ul, select, q) {
    ul.innerHTML = ''; var n = 0, ql = (q || '').toLowerCase();
    [].forEach.call(select.options, function (o) {
      if (o.value === '' && !o.text.trim()) return;
      if (ql && o.text.toLowerCase().indexOf(ql) === -1) return;
      var li = document.createElement('li'); li.className = 'select2-results__option select2-results__option--selectable' + (o.selected ? ' select2-results__option--selected select2-results__option--highlighted' : '');
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', o.selected ? 'true' : 'false'); li.setAttribute('data-snap-value', o.value); li.textContent = o.text; ul.appendChild(li); n++;
    });
    if (!n) { var e = document.createElement('li'); e.className = 'select2-results__option select2-results__message'; e.textContent = 'No matches found'; ul.appendChild(e); }
  }
  function s2Open(box) {
    s2Close();
    var select = box.previousElementSibling; if (!select || select.tagName !== 'SELECT') select = one('select', box.parentElement);
    if (!select || select.multiple) return;
    var r = box.getBoundingClientRect();
    var drop = document.createElement('span'); drop.className = 'select2-container select2-container--default select2-container--open';
    drop.style.cssText = 'position:absolute;left:' + (r.left + window.scrollX) + 'px;top:' + (r.bottom + window.scrollY) + 'px;z-index:100000';
    drop.innerHTML = '<span class="select2-dropdown select2-dropdown--below" dir="ltr" style="width:' + r.width + 'px"><span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="0" autocomplete="off" role="searchbox"></span><span class="select2-results"><ul class="select2-results__options" role="listbox"></ul></span></span>';
    document.body.appendChild(drop);
    var ul = one('ul', drop); s2Fill(ul, select, '');
    box.classList.add('select2-container--open'); var sel = one('.select2-selection', box); if (sel) sel.setAttribute('aria-expanded', 'true');
    s2 = { box: box, drop: drop, select: select };
    var hi = one('.select2-results__option--selected', ul); if (hi) ul.scrollTop = hi.offsetTop - 60;
    var inp = one('.select2-search__field', drop); try { inp.focus(); } catch (_) {}
  }
  function campaignsPage(page) {
    var pag = one('.js-pagination'), per = parseInt((pag && pag.getAttribute('data-rows-per-page')) || '0', 10) || 1e9;
    var rows = all('.js-campaigns-table tbody tr'); var vis = rows.filter(function (r) { return !r.classList.contains('filtered-out'); });
    rows.forEach(function (r) { r.style.display = 'none'; r.classList.add('is-hidden'); });
    vis.forEach(function (r, i) { if (i >= (page - 1) * per && i < page * per) { r.style.display = ''; r.classList.remove('is-hidden'); } });
    if (pag) { pag.setAttribute('data-current-page', page); all('.pagination-button', pag).forEach(function (b) { b.setAttribute('data-current-page', page); b.classList.toggle('active', b.getAttribute('data-page') === String(page)); }); }
    return vis.length;
  }
  function campaignsFilter() {
    var table = one('.js-campaigns-table'); if (!table) return;
    var mod = (one('select.js-filter-module') || {}).value || '', q = ((one('.js-campaign-search') || {}).value || '').toLowerCase();
    all('tbody tr', table).forEach(function (r) {
      var name = ((one('.js-campaign-name', r) || {}).textContent || '').toLowerCase(), mname = ((one('.js-module-name', r) || {}).textContent || '').toLowerCase();
      var ok = (!mod || r.getAttribute('data-module-id') === mod) && (!q || name.indexOf(q) > -1 || mname.indexOf(q) > -1);
      r.classList.toggle('filtered-out', !ok); if (ok) r.classList.remove('is-hidden');
    });
    var n = campaignsPage(1), none = table.nextElementSibling && table.nextElementSibling.classList.contains('no-results-message') ? table.nextElementSibling : null;
    if (!n && !none) { none = document.createElement('div'); none.className = 'no-results-message'; none.textContent = 'No matching campaigns found'; table.parentNode.insertBefore(none, table.nextSibling); }
    if (none) none.style.display = n ? 'none' : '';
  }
  function irisSet(wrap, on) {
    if (!wrap) return; var b = one('.wp-color-result', wrap), iw = one('.wp-picker-input-wrap', wrap), pk = one('.iris-picker', wrap);
    if (b) { b.classList.toggle('wp-picker-open', on); b.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    if (iw) { unbake(iw); iw.classList.toggle('hidden', !on); }
    if (pk) { unbake(pk); pk.style.display = on ? 'block' : 'none'; }
    wrap.classList.toggle('wp-picker-active', on);
  }
  function reviewsPickerSave(c) {
    var ids = all('.selected-reviews .product-reviews .product-review', c).map(function (r) { return r.getAttribute('data-id'); });
    var f = one('.review-saved-ids', c); if (f) { f.value = ids.join(','); f.setAttribute('value', f.value); }
    all('.selector-popup .product-review', c).forEach(function (r) { var cb = one('input[type="checkbox"]', r); if (cb) cb.checked = ids.indexOf(r.getAttribute('data-id')) > -1; });
    all('.selector-popup .product-item', c).forEach(function (p) { var n = all('.product-review', p).filter(function (r) { return ids.indexOf(r.getAttribute('data-id')) > -1; }).length; var k = one('.selected-reviews-count .counter', p); if (k) k.textContent = n; });
    markDirty();
  }
  function iconsRepeaterSync(field) {
    if (!field) return; var h = one('.merchant-sortable-repeater-input, input[type="hidden"][name]', field); if (!h) return;
    var items = all('.merchant-sortable-repeater-icons .repeater', field).map(function (r) { var i = one('.repeater-input', r), t = one('.merchant-icon-picker-toggle', r); return { text: i ? i.value : '', icon: t ? t.getAttribute('data-icon') || '' : '' }; });
    h.value = JSON.stringify(items);
  }
  // ─ PhotoSwipe (ported from the botiga pack; WooCommerce single-product.js openPhotoswipe) ─────────────
  var PS = null;
  function pswpGallery() {
    return all('.woocommerce-product-gallery__image a').map(function (a) {
      var im = one('img', a), w = +(im && (im.getAttribute('data-large_image_width') || im.naturalWidth)) || 1200, h = +(im && (im.getAttribute('data-large_image_height') || im.naturalHeight)) || 1200;
      return { src: a.getAttribute('href'), alt: (im && (im.getAttribute('alt') || im.getAttribute('title'))) || '', w: w, h: h };
    });
  }
  function pswp() { if (!PS) PS = { list: pswpGallery(), i: 0 }; return PS; }
  function pswpShow(i) {
    var st = pswp(), n = st.list.length, root = one('.pswp'); if (!n || !root) return;
    st.i = ((i % n) + n) % n;
    var items = all('.pswp__container > .pswp__item', root), vw = window.innerWidth, vh = window.innerHeight - 88;
    items.forEach(function (it, k) {
      var d = st.list[((st.i + k - 1) % n + n) % n], sc = Math.min(vw / d.w, vh / d.h, 1), w = Math.round(d.w * sc), h = Math.round(d.h * sc);
      it.style.transform = 'translate3d(' + ((k - 1) * Math.round(vw * 1.1)) + 'px, 0px, 0px)';
      it.innerHTML = '<div class="pswp__zoom-wrap" style="transform: translate3d(' + Math.round((vw - w) / 2) + 'px, ' + Math.round(44 + (vh - h) / 2) + 'px, 0px) scale(1);"><img class="pswp__img" src="' + d.src + '" alt="' + d.alt.replace(/"/g, '&quot;') + '" style="opacity:1;width:' + w + 'px;height:' + h + 'px;display:block"></div>';
      if (k === 1) it.setAttribute('data-snap-center', ''); else it.removeAttribute('data-snap-center');
    });
    var c = one('.pswp__counter', root); if (c) c.textContent = (st.i + 1) + ' / ' + n;
    var cap = one('.pswp__caption__center', root); if (cap) cap.textContent = st.list[st.i].alt;
    root.classList.toggle('pswp--zoomed-in', false);
  }
  function pswpOpen(i) {
    var root = one('.pswp'); if (!root) return; unbake(root);
    root.classList.add('pswp--open', 'pswp--visible', 'pswp--animated-in', 'pswp--notouch', 'pswp--css_animation', 'pswp--svg', 'pswp--zoom-allowed', 'pswp--has_mouse');
    root.setAttribute('aria-hidden', 'false'); root.style.position = 'fixed'; root.style.opacity = '1';
    var ui = one('.pswp__ui', root); if (ui) ui.classList.remove('pswp__ui--hidden');
    var bg = one('.pswp__bg', root); if (bg) bg.style.opacity = '1';
    var n = pswp().list.length; all('.pswp__button--arrow--left, .pswp__button--arrow--right', root).forEach(function (b) { b.style.display = n > 1 ? '' : 'none'; });
    pswpShow(i);
  }
  function pswpClose() { var p = one('.pswp'); if (p) { p.classList.remove('pswp--open', 'pswp--visible', 'pswp--animated-in', 'pswp--zoomed-in', 'pswp--fs'); p.setAttribute('aria-hidden', 'true'); } }
  // ─ nearest captured screen for a chrome link (director 77 Task A) ─────────────────────────────────────────
  var CHROME_ADMIN = '#adminmenu, #wpadminbar, .woocommerce-layout__header-breadcrumbs, .woocommerce-layout__header';
  var CHROME_SITE = 'header, nav, footer, .bhfb, .botiga-dropdown-link, .site-header, .botiga-header, .header-mobile-menu, .botiga-offcanvas-menu, .site-footer, .site-branding, .woocommerce-breadcrumb, .category-button, .widget_product_categories, .wp-block-categories, .wc-block-product-categories';
  var ADMIN_FILE = { 'index.php': 'admin-wp-dashboard', 'update-core.php': 'admin-wp-dashboard', 'about.php': 'admin-wp-dashboard', 'profile.php': 'admin-users', 'user-new.php': 'admin-users', 'post-new.php': 'admin-post-new', 'edit-comments.php': 'admin-comments' };
  var ADMIN_BAR = { 'wp-admin-bar-site-name': 'frontend-home', 'wp-admin-bar-view-site': 'frontend-home', 'wp-admin-bar-my-account': 'frontend-home', 'wp-admin-bar-new-content': 'admin-post-new', 'wp-admin-bar-comments': 'admin-comments', 'wp-admin-bar-updates': 'admin-wp-dashboard', 'wp-admin-bar-wp-logo': 'admin-wp-dashboard' };
  function nearestScreen(a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /[?&](remove_item|add-to-cart|_wpnonce|action=logout)\b/.test(href) || /wp-login\.php/.test(href)) return null;
    var abs = /^https?:\/\//i.test(href), u;
    try { u = new URL(href, 'http://fernhillhome.com/wp-admin/'); } catch (e) { return null; }
    if (abs && !/(^|\.)fernhillhome\.com$/.test(u.hostname)) return null;
    if (/\/wp-admin\//.test(u.pathname)) {
      if (!closest(a, CHROME_ADMIN)) return null;
      var file = u.pathname.split('/').pop() || 'index.php', bar = closest(a, '#wpadminbar li[id^="wp-admin-bar-"]');
      for (var b = bar; b; b = b.parentNode && closest(b.parentNode, '#wpadminbar li[id^="wp-admin-bar-"]')) if (ADMIN_BAR[b.id]) return ADMIN_BAR[b.id];
      if (u.searchParams.get('page') === 'wc-admin' && /^\/analytics\//.test(u.searchParams.get('path') || '')) return 'admin-wc-analytics';
      var li = closest(a, '#adminmenu li.menu-top'), top = li && one('a.menu-top', li);
      var up1 = top && top !== a && R.resolveHref(top.getAttribute('href'));
      return up1 || ADMIN_FILE[file] || (u.searchParams.get('page') || '').indexOf('wc-') === 0 && 'admin-wc-home' || 'admin-wp-dashboard';
    }
    if (!closest(a, CHROME_SITE)) return null;
    var path = u.pathname.replace(/\/+$/, '');
    if (!path) return 'frontend-home';
    if (/^\/product-category\//.test(path) || /^\/(shop|product)\b/.test(path)) return 'frontend-shop-all-modules';
    if (/^\/(blog|category|tag|author|\d{4})\b/.test(path)) return 'frontend-blog';
    return 'frontend-home';
  }
  function closeOrderPreview() { var d = one('#wc-backbone-modal-dialog'); if (d) d.parentNode.removeChild(d); document.body.classList.remove('modal-open'); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { s2Close(); closeOrderPreview(); } });

  R.register([
    {
      // admin.js:2599-2614 — an animation choice plays on the preview's demo button for ~1 s.
      label: 'merchant-animation-demo',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-animated-buttons label'); },
      apply: function (el) {
        var input = one('input', closest(el, 'label')); var v = input && input.value; if (!v) return;
        all('.merchant-animation-demo').forEach(function (d) {
          [].slice.call(d.classList).forEach(function (c) { if (c.indexOf('merchant-animation-') === 0 && c !== 'merchant-animation-demo') d.classList.remove(c); });
          R.wait(100, function () { d.classList.add('merchant-animation-' + v); });
          R.wait(1000, function () { d.classList.remove('merchant-animation-' + v); });
        });
      }
    },
    // ─ Copied from the botiga pack (products/botiga/snapshots/_shared/interactivity.js, director 77, 2026-10-05):
    //   core post editor + WooCommerce product data. The helper names ($, $, up, unbake) are the botiga file's, bound
    //   below to this file's own.
    // ─ WordPress core: meta boxes, publish box, slug, category tabs, Screen Options / Help ──
    // @since 2026-10-03 @source wp-admin/js/postbox.js (toggle, move up/down), wp-admin/js/post.js (status / visibility / date editors, editPermalink), wp-admin/js/post.js tabs (category-tabs), wp-admin/js/common.js (screenMeta) @verified 2026-10-03 @product botiga
    {
      label: 'wp-postbox-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.postbox .handlediv, .postbox .hndle') && !up(el, 'a, input, select, .handle-order-higher, .handle-order-lower'); },
      apply: function (el) { var p = up(el, '.postbox'); var closed = p.classList.toggle('closed'); var b = $('.handlediv', p); if (b) b.setAttribute('aria-expanded', closed ? 'false' : 'true'); if (!closed) unbake($('.inside', p)); }
    },
    {
      label: 'wp-postbox-move',
      event: 'click',
      match: function (el) { return !!up(el, '.postbox .handle-order-higher, .postbox .handle-order-lower'); },
      apply: function (el) {
        var p = up(el, '.postbox'), upMove = !!up(el, '.handle-order-higher');
        var sib = upMove ? p.previousElementSibling : p.nextElementSibling;
        while (sib && !sib.classList.contains('postbox')) sib = upMove ? sib.previousElementSibling : sib.nextElementSibling;
        if (sib) { if (upMove) sib.before(p); else sib.after(p); }
      }
    },
    {
      label: 'wp-publish-box-edit',
      event: 'click',
      match: function (el) { return !!up(el, '#submitdiv a.edit-post-status, #submitdiv a.edit-visibility, #submitdiv a.edit-timestamp, #submitdiv a.edit-catalog-visibility, #submitdiv .cancel-post-status, #submitdiv .save-post-status, #submitdiv .cancel-post-visibility, #submitdiv .save-post-visibility, #submitdiv .cancel-timestamp, #submitdiv .save-timestamp, #submitdiv .cancel-post-catalog-visibility, #submitdiv .save-post-catalog-visibility'); },
      apply: function (el) {
        var a = up(el, 'a, button'), map = { 'post-status': '#post-status-select', visibility: '#post-visibility-select', timestamp: '#timestampdiv', 'catalog-visibility': '#catalog-visibility-select', 'post-visibility': '#post-visibility-select', 'post-catalog-visibility': '#catalog-visibility-select' };
        var cls = a.className, key = (cls.match(/(?:edit|cancel|save)-(post-status|visibility|timestamp|catalog-visibility|post-visibility|post-catalog-visibility)/) || [])[1];
        var box = key && $(map[key]); if (!box) return;
        var opening = /\bedit-/.test(cls); var opener = $('#submitdiv a.edit-' + (key === 'post-visibility' ? 'visibility' : key === 'post-catalog-visibility' ? 'catalog-visibility' : key));
        unbake(box);
        if (opening) { R.slideDown(box, 200); a.style.display = 'none'; } else { R.slideUp(box, 200); if (opener) opener.style.display = ''; }
      }
    },
    {
      label: 'wp-edit-slug',
      event: 'click',
      match: function (el) { return !!up(el, '#edit-slug-buttons .edit-slug, #edit-slug-buttons .cancel, #edit-slug-buttons .save'); },
      apply: function (el) {
        var b = up(el, 'button'), wrap = $('#edit-slug-buttons'), name = $('#editable-post-name');
        if (b.classList.contains('edit-slug')) {
          wrap.setAttribute('data-snap-old', wrap.innerHTML); name.setAttribute('data-snap-old', name.innerHTML);
          var slug = ($('#editable-post-name-full') || name).textContent;
          name.innerHTML = '<input type="text" id="new-post-slug" value="' + slug.replace(/"/g, '&quot;') + '" autocomplete="off" spellcheck="false" />';
          wrap.innerHTML = '<button type="button" class="save button button-small">OK</button> <button type="button" class="cancel button-link">Cancel</button>';
          var i = $('#new-post-slug'); if (i) i.focus();
        } else { var v = b.classList.contains('save') && $('#new-post-slug') ? $('#new-post-slug').value : null; name.innerHTML = name.getAttribute('data-snap-old'); if (v) name.textContent = v; wrap.innerHTML = wrap.getAttribute('data-snap-old'); }
      }
    },
    {
      label: 'wp-category-tabs',
      event: 'click',
      match: function (el) { return !!up(el, '.category-tabs a, .categorydiv .category-tabs a'); },
      apply: function (el) {
        var a = up(el, 'a'), ul = up(a, 'ul'), t = a.getAttribute('href');
        $$('li', ul).forEach(function (l) { l.classList.toggle('tabs', l === a.parentNode); });
        $$('.tabs-panel', up(ul, '.categorydiv') || document).forEach(function (p) { var on = '#' + p.id === t; p.style.display = on ? '' : 'none'; if (on) unbake(p); });
      }
    },
    {
      label: 'wp-category-add-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.taxonomy-add-new'); },
      apply: function (el) { var a = up(el, '.taxonomy-add-new'), adder = up(a, '.wp-hidden-children') || up(a, '[id$="-adder"]'); if (adder) { adder.classList.toggle('wp-hidden-children'); var c = $('.category-add', adder); if (c) { unbake(c); c.classList.toggle('wp-hidden-child'); } } }
    },
    {
      label: 'wp-screen-meta',
      event: 'click',
      match: function (el) { return !!up(el, '#screen-options-link-wrap button, #contextual-help-link-wrap button, #show-settings-link, #contextual-help-link'); },
      apply: function (el) {
        var b = up(el, 'button'), panel = $('#' + b.getAttribute('aria-controls')), meta = $('#screen-meta'); if (!panel || !meta) return;
        var open = b.getAttribute('aria-expanded') !== 'true';
        unbake(meta); unbake(panel);
        $$('.screen-meta-toggle').forEach(function (w) { if (!w.contains(b)) w.style.visibility = open ? 'hidden' : ''; });
        b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.classList.toggle('screen-meta-active', open);
        if (open) { meta.style.display = 'block'; panel.style.display = 'block'; panel.classList.remove('hidden'); } else { meta.style.display = 'none'; panel.style.display = 'none'; }
      }
    },
    // ─ Classic editor Visual / Code ──────────────────────────────────────
    // @source wp-admin/js/editor.js (switchEditors: wrap tmce-active / html-active, textarea shown in Code)
    {
      label: 'wp-switch-editor',
      event: 'click',
      match: function (el) { return !!up(el, '.wp-switch-editor'); },
      apply: function (el) {
        var b = up(el, '.wp-switch-editor'), wrap = up(b, '.wp-editor-wrap'); if (!wrap) return;
        var html = b.classList.contains('switch-html');
        wrap.classList.toggle('html-active', html); wrap.classList.toggle('tmce-active', !html);
        var mce = $('.mce-tinymce', wrap), ta = $('textarea.wp-editor-area', wrap), qt = $('.quicktags-toolbar', wrap);
        if (mce) mce.style.display = html ? 'none' : '';
        if (ta) { unbake(ta); ta.style.display = html ? 'block' : 'none'; ta.removeAttribute('aria-hidden'); }
        if (qt) { unbake(qt); qt.style.display = html ? 'block' : 'none'; }
      }
    },
    // ─ WooCommerce product data tabs ─────────────────────────────────────
    // @source woocommerce/assets/js/admin/meta-boxes-product.js (ul.wc-tabs li a: active tab + matching .panel)
    {
      label: 'wc-product-data-tab',
      event: 'click',
      match: function (el) { return !!up(el, '#woocommerce-product-data ul.wc-tabs li a'); },
      apply: function (el) {
        var a = up(el, 'a'), li = a.parentNode, box = up(a, '#woocommerce-product-data'), t = a.getAttribute('href');
        $$('ul.wc-tabs li', box).forEach(function (l) { l.classList.toggle('active', l === li); });
        $$('.panel.woocommerce_options_panel, .panel-wrap > .panel', box).forEach(function (p) { var on = '#' + p.id === t; p.style.display = on ? 'block' : 'none'; if (on) unbake(p); });
      },
      state: function (el) { return { key: 'product.tab', value: up(el, 'a').getAttribute('href') }; }
    },
    {
      // wp-admin/js/tags-box.js init/get — "Choose from the most used tags" shows the cloud the capture parked
      // (<template data-snap-fragment="tagcloud-<tax>">, cleanup park-tagcloud); later clicks toggle it.
      label: 'wp-tagcloud-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.tagcloud-link[id^="link-"]'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, '.tagcloud-link'), tax = a.id.slice(5), cloud = one('#tagcloud-' + tax);
        if (cloud) { var hidden = cloud.style.display === 'none'; cloud.style.display = hidden ? '' : 'none'; a.setAttribute('aria-expanded', hidden ? 'true' : 'false'); return; }
        var tpl = one('template[data-snap-fragment="tagcloud-' + tax + '"]'); if (!tpl) { R.miss('#tagcloud-' + tax, 'tag cloud not parked'); return; }
        cloud = document.createElement('div'); cloud.id = 'tagcloud-' + tax; cloud.className = 'the-tagcloud'; cloud.innerHTML = tpl.innerHTML;
        a.parentNode.insertBefore(cloud, a.nextSibling); a.setAttribute('aria-expanded', 'true');
      }
    },
    {
      // tags-box.js flushTags — a cloud tag joins the post's tag list (with its remove button) and the hidden field.
      label: 'wp-tagcloud-add',
      event: 'click',
      match: function (el) { return !!closest(el, '.the-tagcloud a'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var t = closest(el, 'a').textContent.trim(), box = closest(el, '.tagsdiv') || closest(el, '.inside'); if (!box) return;
        var ta = one('textarea.the-tags', box), list = one('.tagchecklist', box);
        var tags = ta ? ta.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
        if (tags.indexOf(t) !== -1) return; tags.push(t); if (ta) ta.value = tags.join(',');
        if (list) { var li = document.createElement('li'); li.innerHTML = '<button type="button" class="ntdelbutton"><span class="remove-tag-icon" aria-hidden="true"></span><span class="screen-reader-text">Remove term: ' + t.replace(/</g, '&lt;') + '</span></button>&nbsp;'; li.appendChild(document.createTextNode(t)); list.appendChild(li); }
      }
    },
    {
      // tags-box.js — a tag's × in the list removes it from the list and the hidden field.
      label: 'wp-tag-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '.tagchecklist .ntdelbutton'); },
      apply: function (el) {
        var li = closest(el, 'li'), box = closest(el, '.tagsdiv') || closest(el, '.inside'), t = li.textContent.replace(/Remove term:.*$/, '').trim();
        var name = (li.lastChild && li.lastChild.nodeType === 3 ? li.lastChild.textContent : t).trim();
        var ta = box && one('textarea.the-tags', box); if (ta) ta.value = ta.value.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && x !== name; }).join(',');
        li.parentNode.removeChild(li);
      }
    },
    {
      // TinyMCE / Quicktags formatting edits the content in the live editor (an iframe the capture freezes).
      label: 'wp-editor-toolbar-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.mce-toolbar .mce-btn, .quicktags-toolbar input.button, .wp-media-buttons .button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] editor formatting and Add Media work live only (they edit the content)'); }
    },
    // ─ Campaigns table (analytics.js:1077-1160: filterTableTable, paginateRows, select all, status) ──────
    {
      label: 'merchant-campaigns-filter',
      event: 'input',
      match: function (el) { return !!closest(el, '.js-campaign-search'); },
      apply: function () { campaignsFilter(); }
    },
    {
      label: 'merchant-campaigns-module-filter',
      event: 'change',
      match: function (el) { return !!closest(el, 'select.js-filter-module'); },
      apply: function () { var i = one('.js-campaign-search'); if (i) i.value = ''; campaignsFilter(); }
    },
    {
      label: 'merchant-campaigns-select-all',
      event: 'change',
      match: function (el) { return !!closest(el, '.js-campaigns-table thead th:first-child input[type="checkbox"]'); },
      apply: function (el) { all('.js-campaigns-table tbody tr:not(.is-hidden) input[type="checkbox"]:not(.toggle-switch-checkbox)').forEach(function (c) { c.checked = el.checked; }); }
    },
    {
      label: 'merchant-campaigns-page',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-pagination .pagination-button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var n = parseInt(closest(el, '.pagination-button').getAttribute('data-page'), 10); if (!isNaN(n)) campaignsPage(n); }
    },
    {
      label: 'merchant-campaigns-status',
      event: 'change',
      match: function (el) { return !!closest(el, '.js-campaigns-table .js-status input[type="checkbox"]'); },
      apply: function (el) { el.checked = !el.checked; console.info('[snap] switching a campaign on / off works live only (it saves the campaign)'); }
    },
    {
      // analytics.js:1104-1135 — Campaigns bulk Apply: with no action or no rows picked it says so (an alert live);
      // otherwise it changes campaign statuses over AJAX, a write.
      label: 'merchant-campaigns-bulk-apply',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-bulk-action'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var sel = one('select', closest(el, '.bulk-action') || document), table = one('.js-campaigns-table');
        var picked = table ? all('tbody tr:not(.is-hidden) input[type="checkbox"]:not(.toggle-switch-checkbox)', table).filter(function (c) { return c.checked; }).length : 0;
        if (!sel || !sel.value) console.info('[snap] Please select an action. (live shows this as an alert)');
        else if (!picked) console.info('[snap] Please select campaigns. (live shows this as an alert)');
        else console.info('[snap] changing ' + picked + ' campaign status(es) works live only (it saves the campaigns)');
      }
    },
    {
      // delivery-pickup-calendar.js:168-169 — Print opens the browser's print dialog for the calendar.
      label: 'merchant-dp-calendar-print',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-dp-calendar-print'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] Print opens the browser print dialog live (window.print)'); }
    },
    // ─ Size chart (merchant/assets/js/modules/size-chart/size-chart.js:6-40) ─────────────────────────
    {
      label: 'merchant-size-chart-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-product-size-chart-button a'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var m = one('.merchant-product-size-chart-modal', closest(el, '.merchant-product-size-chart') || document); if (m) unbake(m); document.body.classList.add('merchant-product-size-chart-modal-open'); }
    },
    {
      // the backdrop (the modal itself) or × closes it; the content scrolls back to the top
      label: 'merchant-size-chart-close',
      event: 'click',
      match: function (el) { var m = closest(el, '.merchant-product-size-chart-modal'); return !!m && (el === m || !!closest(el, '.merchant-product-size-chart-modal-close')); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var c = one('.merchant-product-size-chart-modal-content', closest(el, '.merchant-product-size-chart') || document); if (c) c.scrollTop = 0; document.body.classList.remove('merchant-product-size-chart-modal-open'); }
    },
    {
      label: 'merchant-size-chart-tab',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-product-size-chart-modal-tab'); },
      apply: function (el) {
        var t = closest(el, '.merchant-product-size-chart-modal-tab'), box = closest(t, '.merchant-product-size-chart') || document;
        var tabs = all('.merchant-product-size-chart-modal-tab', box), tables = all('.merchant-product-size-chart-modal-table', box), i = tabs.indexOf(t);
        tabs.forEach(function (x) { x.classList.toggle('active', x === t); }); tables.forEach(function (x, j) { x.classList.toggle('active', j === i); if (j === i) unbake(x); });
      }
    },
    // ─ Login popup (merchant/assets/js/modules/login-popup/login-popup.js:7-55) ─────────────────────
    {
      // the header button and × toggle the popup (body class); the body fades in a beat later
      label: 'merchant-login-popup-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-login-popup-toggle'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var on = !document.body.classList.contains('merchant-login-popup-show'), body = one('.merchant-login-popup-body');
        document.body.classList.toggle('merchant-login-popup-show', on);
        if (body) { if (on) { unbake(body); R.wait(200, function () { body.classList.add('merchant-show'); }); } else body.classList.remove('merchant-show'); }
      }
    },
    {
      // the footer link swaps the footer line and the form column (login col-1 / register col-2)
      label: 'merchant-login-popup-switch',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-login-popup-footer a'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var foot = closest(el, '.merchant-login-popup-footer'), content = one('.merchant-login-popup-content') || document;
        [].slice.call(foot.children).forEach(function (d) { d.classList.toggle('merchant-show'); });
        var reg = !!(foot.children[1] && foot.children[1].classList.contains('merchant-show'));
        var c1 = one('.col-1', content), c2 = one('.col-2', content);
        if (c1) { unbake(c1); c1.style.display = reg ? 'none' : ''; } if (c2) { unbake(c2); c2.style.display = reg ? '' : 'none'; }
      }
    },
    {
      label: 'merchant-login-popup-submit-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-login-popup .woocommerce-form button[type="submit"], .merchant-login-popup .woocommerce-form input[type="submit"]'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] logging in / registering works live only (admin-ajax merchant_ajax_login_register)'); }
    },
    // ─ WP media modal, parked open (wp-includes/js/media-views.js) ──────────────────────────────
    {
      label: 'wp-media-modal-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.media-modal .media-modal-close, .media-modal-backdrop'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        all('.media-modal, .media-modal-backdrop').forEach(function (m) { var w = closest(m, '[id^="__wp-uploader-id-"]') || m; w.style.display = 'none'; });
        document.body.classList.remove('modal-open');
      }
    },
    {
      // router tabs: Upload files shows the uploader, Media Library the grid; the left menu's other panels load live
      label: 'wp-media-router',
      event: 'click',
      match: function (el) { return !!closest(el, '.media-modal .media-router .media-menu-item, .media-modal .media-menu .media-menu-item'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, '.media-menu-item'), bar = b.parentNode, modal = closest(b, '.media-modal');
        all('.media-menu-item', bar).forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        if (!closest(b, '.media-router')) { console.info('[snap] the "' + b.textContent.trim() + '" media panel loads live only'); return; }
        var upload = /upload/i.test(b.textContent), up = one('.uploader-inline', modal), browser = one('.attachments-browser', modal);
        if (up) { unbake(up); up.style.display = upload ? 'block' : 'none'; up.classList.toggle('hidden', !upload); }
        if (browser) { unbake(browser); browser.style.display = upload ? 'none' : ''; }
      }
    },
    {
      // a tile toggles its selection (check mark); the toolbar button enables while one is picked
      label: 'wp-media-attachment-select',
      event: 'click',
      match: function (el) { return !!closest(el, '.media-modal li.attachment'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var li = closest(el, 'li.attachment'), on = !li.classList.contains('selected');
        li.classList.toggle('selected', on); li.classList.toggle('details', on); li.setAttribute('aria-checked', on ? 'true' : 'false');
        var modal = closest(li, '.media-modal'), n = all('li.attachment.selected', modal).length, btn = one('.media-toolbar-primary .media-button', modal);
        if (btn) { if (n) btn.removeAttribute('disabled'); else btn.setAttribute('disabled', 'disabled'); }
      }
    },
    {
      label: 'wp-media-select-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.media-modal .media-toolbar-primary .media-button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] adding the picked media works live only (it changes the field)'); }
    },
    {
      // wp-includes/js/media-editor.js featuredImage.remove(): the box goes back to its "Set …" link and the hidden
      // _thumbnail_id becomes -1; it is saved only by Update.
      label: 'wp-featured-image-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '#remove-post-thumbnail'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var box = closest(el, '.inside') || closest(el, '#postimagediv'); if (!box) return;
        var label = /product/i.test(box.textContent) ? 'Set product image' : 'Set featured image';
        var idf = one('#_thumbnail_id', box) || one('#_thumbnail_id'); var keep = idf ? idf.outerHTML : '';
        box.innerHTML = '<p class="hide-if-no-js"><a href="#" id="set-post-thumbnail" class="thickbox">' + label + '</a></p>' + keep;
        var id2 = one('#_thumbnail_id', box); if (id2) { id2.value = '-1'; id2.setAttribute('value', '-1'); }
      }
    },
    {
      // Set product image / Add product gallery images open the WordPress media library (not parked on this screen).
      label: 'wp-media-library-live',
      event: 'click',
      match: function (el) { return !!closest(el, '#set-post-thumbnail, .add_product_images a, #woocommerce-product-images .add_product_images'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] the media library opens live only here (admin-module-payment-logos--media-open shows it open)'); }
    },
    // ─ Core wpColorPicker / Iris (wp-admin/js/color-picker.js: toggle, palette, clear) ─────────────
    {
      // "Select Color" opens the captured Iris panel and the hex field; again (or outside) closes it
      label: 'wp-iris-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.wp-picker-container .wp-color-result'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, '.wp-color-result'), wrap = closest(b, '.wp-picker-container'), open = !b.classList.contains('wp-picker-open');
        all('.wp-picker-container .wp-color-result.wp-picker-open').forEach(function (o) { if (o !== b) irisSet(closest(o, '.wp-picker-container'), false); });
        irisSet(wrap, open);
      }
    },
    {
      label: 'wp-iris-palette',
      event: 'click',
      match: function (el) { return !!closest(el, '.wp-picker-container .iris-palette'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var p = closest(el, '.iris-palette'), wrap = closest(p, '.wp-picker-container'), c = p.style.backgroundColor;
        var hex = c.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+).*/, function (m, r, g, b) { return '#' + [r, g, b].map(function (x) { return ('0' + (+x).toString(16)).slice(-2); }).join(''); });
        var input = one('input.wp-color-picker, input[type="text"]', wrap); if (input) { input.value = hex; input.setAttribute('value', hex); }
        var b = one('.wp-color-result', wrap); if (b) b.style.backgroundColor = c;
      }
    },
    {
      label: 'wp-iris-clear',
      event: 'click',
      match: function (el) { return !!closest(el, '.wp-picker-container .wp-picker-clear'); },
      apply: function (el) { var wrap = closest(el, '.wp-picker-container'), input = one('input[type="text"]', wrap), b = one('.wp-color-result', wrap); if (input) { input.value = ''; input.setAttribute('value', ''); } if (b) b.style.backgroundColor = ''; }
    },
    {
      label: 'wp-iris-outside',
      event: 'click',
      order: 'last',
      match: function (el) { return !!one('.wp-picker-container .wp-color-result.wp-picker-open') && !closest(el, '.wp-picker-container'); },
      apply: function () { all('.wp-picker-container .wp-color-result.wp-picker-open').forEach(function (o) { irisSet(closest(o, '.wp-picker-container'), false); }); }
    },
    {
      // merchant quick-view.js: Prev / Next fetch the neighbour product into the open modal over admin-ajax (a read)
      label: 'merchant-quick-view-nav',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-quick-view-nav-next, .merchant-quick-view-nav-prev'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] the ' + (closest(el, '.merchant-quick-view-nav-next') ? 'next' : 'previous') + ' product loads into the quick view live only (admin-ajax); open another product from the shop grid'); }
    },
    {
      // copy-to-clipboard.js:10-21 — copies the hidden share URL and shows "Copied!" in the tooltip for a second
      label: 'merchant-copy-to-clipboard',
      event: 'click',
      match: function (el) { return !!closest(el, '[data-merchant-copy-to-clipboard]'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, '[data-merchant-copy-to-clipboard]'), v = one('.merchant-copy-to-clipboard-value', a), label = a.getAttribute('data-merchant-tooltip');
        try { if (navigator.clipboard && v) navigator.clipboard.writeText(v.value).catch(function () {}); } catch (_) {}
        a.setAttribute('data-merchant-tooltip', 'Copied!');
        R.wait(1000, function () { a.setAttribute('data-merchant-tooltip', label); });
        console.info('[snap] copied the share link' + (v ? ': ' + v.value : ''));
      }
    },
    {
      label: 'merchant-preview-write-review',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-preview .merchant-adv-review-write-button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] preview of the Write a Review button: the review form opens on the product page (frontend-advanced-reviews-single--write-modal)'); }
    },
    // ─ Advanced Reviews: reviews picker (admin.js:1002-1275) ───────────────────────────────────────
    {
      label: 'merchant-reviews-picker-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-reviews-selector .popup-trigger'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var c = closest(el, '.merchant-reviews-selector'); ['.selector-popup', '.overlay'].forEach(function (q) { var x = one(q, c); if (x) { unbake(x); x.classList.add('active'); } });
      }
    },
    {
      label: 'merchant-reviews-picker-dismiss',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-reviews-selector .popup-header .close, .merchant-reviews-selector > .overlay'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var c = closest(el, '.merchant-reviews-selector'); all('.selector-popup, .overlay', c).forEach(function (x) { x.classList.remove('active'); }); }
    },
    {
      label: 'merchant-reviews-picker-toggle',
      event: 'change',
      match: function (el) { return !!closest(el, '.merchant-reviews-selector .product-review input[type="checkbox"]'); },
      apply: function (el) {
        var c = closest(el, '.merchant-reviews-selector'), review = closest(el, '.product-review'), id = review.getAttribute('data-id');
        var list = one('.selected-reviews .product-reviews', c); if (!list) return;
        var have = one('.product-review[data-id="' + id + '"]', list);
        if (el.checked && !have) { var copy = review.cloneNode(true); list.appendChild(copy); }
        if (!el.checked && have) have.parentNode.removeChild(have);
        reviewsPickerSave(c);
      }
    },
    {
      label: 'merchant-reviews-picker-delete',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-reviews-selector .product-review-delete'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var c = closest(el, '.merchant-reviews-selector'), r = closest(el, '.product-review'); if (r) r.parentNode.removeChild(r); reviewsPickerSave(c); }
    },
    // ─ Close-out probe gaps ──────────────────────────────────────────────────────────────────────
    {
      // A module page's right-hand preview is a picture of the storefront widget: its buttons, links and slider arrows
      // do nothing live either. (Controls the runtime does drive in a preview are excluded.)
      label: 'merchant-preview-inert',
      event: 'click',
      order: 'last',
      match: function (el) {
        var c = closest(el, 'a, button'); if (!c || !closest(c, '.merchant-module-page-preview')) return false;
        return !closest(c, '.merchant-login-popup-toggle, .merchant-login-popup-footer a, .merchant-adv-review-write-button, .merchant-clear-cart-button, .merchant-preview-qty button, .merchant-animation-demo');
      },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] this is the module preview: "' + (closest(el, 'a, button').textContent.trim() || 'control').slice(0, 40) + '" works on the storefront, not here'); }
    },
    {
      // Merchant's upload fields (dropzone "Browse", review "Upload images") open the file picker / media library.
      label: 'merchant-upload-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-dropzone__browse, .upload-review-image, .merchant-upload-button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] choosing a file works live only (file picker / media library)'); }
    },
    // ─ Parked panels: toggles whose panel React renders on demand ───────
    // @since 2026-10-06 @source capture cleanup park-toggles (WooCommerce activity panel tabs; block editor Options, View,
    // Block Inserter, Document Overview). The captured panel is re-inserted where it rendered live; a second click (or another
    // parked toggle, Escape, or an outside click for the popovers) closes it. Inside it, links and buttons keep their own entries.
    {
      label: 'parked-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '[data-snap-park]'); },
      apply: function (el, evt) {
        stop(evt); var b = up(el, '[data-snap-park]'), name = b.getAttribute('data-snap-park');
        var wasOpen = document.querySelectorAll('[data-snap-parked="' + name + '"]').length > 0;
        parkedCloseAll();
        if (wasOpen) return;
        var t = document.querySelector('template[data-snap-fragment="' + name + '"]'); if (!t) return;
        var parents = []; try { parents = JSON.parse(t.getAttribute('data-snap-parents') || '[]'); } catch (e) {}
        [].slice.call(t.content.children).forEach(function (k, i) {
          var p = String(parents[i] || 'body|9999').split('|'), par = null; try { par = document.querySelector(p[0]); } catch (e) {}
          par = par || document.body; var n = k.cloneNode(true); n.setAttribute('data-snap-parked', name);
          par.insertBefore(n, par.children[+p[1]] || null); unbake(n);
        });
        b.classList.add('is-pressed', 'is-active'); b.setAttribute('aria-expanded', 'true');
        if (/-wc-activity-/.test(name)) { var w = document.querySelector('.woocommerce-layout__activity-panel-wrapper'); if (w) w.classList.add('is-open'); } // WC shows the wrapper only when open
      }
    },
    {
      label: 'parked-toggle-close',
      event: 'click',
      order: 'last',
      match: function (el) { return !!$('[data-snap-parked*="-blk-options-"], [data-snap-parked*="-blk-preview-"]') && !up(el, '[data-snap-parked], [data-snap-park]'); },
      apply: function () { parkedCloseAll(); }
    },
    {
      // Terms list Quick Edit opens the inline editor (inline-edit-tax.js) and saves over admin-ajax.
      label: 'wp-terms-quick-edit-live',
      event: 'click',
      match: function (el) { return !!closest(el, '#the-list button.editinline, #the-list .editinline'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] Quick Edit works live only (it saves the term)'); }
    },
    {
      // Comment edit: "Edit" next to the parent comment and the box order arrows (wp-admin/js/comment.js, postbox.js).
      label: 'wp-comment-edit-extras',
      event: 'click',
      match: function (el) { return !!closest(el, 'a.edit-comment-parent, #poststuff .handle-order-higher, #poststuff .handle-order-lower'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, 'a.edit-comment-parent');
        if (a) { var box = one('#edit-comment-parent'); if (box) { unbake(box); box.style.display = box.style.display === 'none' || getComputedStyle(box).display === 'none' ? 'block' : 'none'; } else console.info('[snap] editing the parent comment works live only'); return; }
        var p = closest(el, '.postbox'); if (!p) return; var upMove = !!closest(el, '.handle-order-higher');
        var sib = upMove ? p.previousElementSibling : p.nextElementSibling; while (sib && !sib.classList.contains('postbox')) sib = upMove ? sib.previousElementSibling : sib.nextElementSibling;
        if (sib) { if (upMove) sib.before(p); else sib.after(p); }
      }
    },
    {
      // admin.js:778-786 — the row's icon button opens its dropdown (others close)
      label: 'merchant-icon-picker-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-icon-picker-toggle'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var t = closest(el, '.merchant-icon-picker-toggle'), dd = t.parentNode ? one(':scope > .merchant-icon-picker-dropdown', t.parentNode) : null;
        all('.merchant-icon-picker-dropdown').forEach(function (d) { if (d !== dd) d.style.display = 'none'; });
        if (dd) { unbake(dd); dd.style.display = dd.style.display === 'none' || getComputedStyle(dd).display === 'none' ? 'block' : 'none'; }
      }
    },
    {
      // admin.js:789-797,877-897 — an icon sets the row's toggle (SVG, has-icon, data-icon), marks it selected, closes
      label: 'merchant-icon-option',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-icon-picker-dropdown .merchant-icon-option'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var o = closest(el, '.merchant-icon-option'), dd = closest(o, '.merchant-icon-picker-dropdown'), row = closest(o, '.repeater') || dd.parentNode;
        var t = one('.merchant-icon-picker-toggle', row), key = o.getAttribute('data-icon') || '';
        all('.merchant-icon-option', dd).forEach(function (x) { x.classList.toggle('selected', x === o); });
        if (t) { t.setAttribute('data-icon', key); if (key) { t.innerHTML = o.innerHTML; t.classList.add('has-icon'); } else { t.innerHTML = '<span class="dashicons dashicons-plus-alt2"></span>'; t.classList.remove('has-icon'); } }
        dd.style.display = 'none'; iconsRepeaterSync(closest(o, '.merchant-sortable-repeater-icons-control') || closest(o, '.merchant-module-page-setting-field')); markDirty();
      }
    },
    {
      label: 'merchant-icon-picker-outside',
      event: 'click',
      order: 'last',
      match: function (el) { return !closest(el, '.merchant-icon-picker-dropdown, .merchant-icon-picker-toggle') && all('.merchant-icon-picker-dropdown').some(function (d) { return d.offsetWidth; }); },
      apply: function () { all('.merchant-icon-picker-dropdown').forEach(function (d) { d.style.display = 'none'; }); }
    },
    {
      // admin.js:808-826,858-875 — icon-text repeater: Add new item appends a row (icon button + text + dropdown copy), × removes
      label: 'merchant-icons-repeater',
      event: 'click',
      match: function (el) { return !!closest(el, '.customize-control-sortable-repeater-icons-add, .merchant-sortable-repeater-icons .customize-control-sortable-repeater-delete'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var field = closest(el, '.merchant-module-page-setting-field') || document, list = one('.merchant-sortable-repeater-icons', field); if (!list) return;
        if (closest(el, '.customize-control-sortable-repeater-delete')) { var r = closest(el, '.repeater'); if (r) r.parentNode.removeChild(r); }
        else {
          var ref = one('.repeater', list), dd = ref && one('.merchant-icon-picker-dropdown', ref);
          var row = document.createElement('div'); row.className = 'repeater';
          row.innerHTML = '<button type="button" class="merchant-icon-picker-toggle" data-icon="" title="Select icon"><span class="dashicons dashicons-plus-alt2"></span></button>' + (dd ? '<div class="merchant-icon-picker-dropdown" style="display:none;">' + dd.innerHTML + '</div>' : '') + '<input type="text" value="" class="repeater-input"><span class="dashicons dashicons-menu"></span><a class="customize-control-sortable-repeater-delete" href="#"><span class="dashicons dashicons-no-alt"></span></a>';
          all('.merchant-icon-option.selected', row).forEach(function (x) { x.classList.remove('selected'); });
          list.appendChild(row); try { one('input', row).focus(); } catch (_) {}
        }
        iconsRepeaterSync(field); markDirty();
      }
    },
    {
      // admin.js responsive fields — Desktop / Tablet / Mobile switch which values set the field shows
      label: 'merchant-responsive-device',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-settings-responsive .merchant-module-page-settings-devices button'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, 'button'), box = closest(b, '.merchant-module-page-settings-responsive'), dev = b.getAttribute('data-device');
        all('.merchant-module-page-settings-devices button', box).forEach(function (x) { x.classList.toggle('active', x === b); });
        all('.merchant-module-page-settings-device-container', box).forEach(function (c) { var on = c.getAttribute('data-device') === dev; c.classList.toggle('active', on); if (on) unbake(c); });
      }
    },
    {
      // admin.js:2157-2183 — a search result joins the selected products (single fields replace), the value field follows
      label: 'merchant-products-picker-pick',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-setting-field-products_selector .merchant-selections-products-preview li'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var li = closest(el, 'li'), box = closest(li, '.merchant-products-search-container'), val = one('.merchant-selected-products', box), ul = one('.merchant-selected-products-preview ul', box);
        var multiple = box.getAttribute('data-multiple') === 'multiple'; if (!ul) return;
        if (!multiple) { all('li', ul).forEach(function (x) { x.parentNode.removeChild(x); }); if (val) val.value = ''; }
        var rm = one('.remove', li); if (rm) { rm.setAttribute('aria-label', 'Remove'); rm.innerHTML = '×'; }
        ul.appendChild(li); var res = one('.merchant-selections-products-preview', box); if (res) { res.innerHTML = ''; res.style.display = 'none'; }
        var sf = one('.merchant-search-field', box); if (sf) sf.value = '';
        if (val) { var ids = val.value ? val.value.split(',') : []; ids.push(li.getAttribute('data-id')); val.value = (multiple ? ids : [li.getAttribute('data-id')]).join(','); }
        markDirty();
      }
    },
    {
      label: 'merchant-products-picker-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-selected-products-preview .remove'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var li = closest(el, 'li'), box = closest(li, '.merchant-products-search-container'), val = one('.merchant-selected-products', box), id = li.getAttribute('data-id');
        li.parentNode.removeChild(li); if (val) val.value = val.value.split(',').filter(function (x) { return x && x !== id; }).join(','); markDirty();
      }
    },
    {
      // gallery fields (payment logos / trust badges "Select badges") open the media library
      label: 'merchant-gallery-button-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-gallery-button') && !one('.media-modal'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] the media library opens live only here (admin-module-payment-logos--media-open shows it open)'); }
    },
    // ─ External links: inline tip, never a new tab ──────────────────────
    // @since 2026-10-06 @source director ruling (all aThemes packs): an off-site link (another host, or target=_blank to
    // another host) shows "Opens <host> in a new tab ↗" beside the link for ~2 s and opens nothing — a film or a viewer
    // is never thrown onto the live web. The product logo goes to the pack's own dashboard (EXT_LOGO); on that screen it
    // shows the tip too. Shared shape: copy verbatim, change only EXT_LOGO and EXT_SITE_HOSTS. @product merchant
    {
      label: 'external-tip',
      event: 'click',
      match: function (el) {
        var a = el.closest && el.closest('a[href]'); if (!a) return false;
        var EXT_LOGO = { sel: 'a.merchant-top-bar-logo', slug: 'admin-dashboard' };
        if (a.matches(EXT_LOGO.sel)) return true;
        var EXT_SITE_HOSTS = ['fernhillhome.com', 'localhost', '127.0.0.1', location.host];
        var u; try { u = new URL(a.getAttribute('href'), document.baseURI); } catch (e) { return false; }
        return /^https?:$/.test(u.protocol) && EXT_SITE_HOSTS.indexOf(u.host) === -1 && EXT_SITE_HOSTS.indexOf(u.hostname) === -1;
      },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = el.closest('a[href]');
        var EXT_LOGO = { sel: 'a.merchant-top-bar-logo', slug: 'admin-dashboard' };
        var R = window.SnapRuntime;
        if (a.matches(EXT_LOGO.sel) && R && R.currentSlug && R.currentSlug() !== EXT_LOGO.slug) { R.goto(EXT_LOGO.slug); return; }
        var host = ''; try { host = new URL(a.getAttribute('href'), document.baseURI).hostname.replace(/^www\./, ''); } catch (e) {}
        var old = document.querySelector('.snap-ext-tip'); if (old) old.remove();
        var r = a.getBoundingClientRect(), tip = document.createElement('span');
        tip.className = 'snap-ext-tip'; tip.setAttribute('role', 'status');
        tip.textContent = 'Opens ' + (host || 'another site') + ' in a new tab ↗';
        tip.style.cssText = 'position:fixed;z-index:2147483647;left:' + Math.max(8, Math.min(r.left, innerWidth - 260)) + 'px;top:' + (r.bottom + 6 > innerHeight - 40 ? r.top - 34 : r.bottom + 6) + 'px;background:#1d2327;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:6px 10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;white-space:nowrap';
        document.body.appendChild(tip);
        setTimeout(function () { if (tip.parentNode) tip.remove(); }, 2000);
        console.info('[snap] external link (not opened): ' + a.getAttribute('href').replace(/\?.*$/, ''));
      }
    },
    {
      // merchant-metabox.js (size chart edit): + / − add or remove a row or column, Duplicate copies a table, Remove drops it
      label: 'merchant-size-chart-table',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-add-row, .merchant-del-row, .merchant-add-col, .merchant-del-col, a.merchant-duplicate, a.merchant-remove'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, 'a'), td = closest(b, 'td, th'), tr = closest(b, 'tr'), tbody = closest(b, 'tbody, table');
        var clear = function (n) { all('input', n).forEach(function (i) { i.value = ''; i.setAttribute('value', ''); }); };
        var col = function () { var i = [].indexOf.call(tr.children, td); return all('tr', tbody).map(function (r) { return r.children[i]; }).filter(Boolean); };
        if (b.classList.contains('merchant-duplicate') || b.classList.contains('merchant-remove')) {
          var item = closest(b, '.merchant-size-chart-item, .merchant-metabox-field-size-chart-item, li, .merchant-size-chart-table-wrap') || closest(b, 'table');
          if (!item) return;
          if (b.classList.contains('merchant-duplicate')) item.after(item.cloneNode(true));
          else if (item.parentNode && item.parentNode.children.length > 1) item.remove(); else clear(item);
        } else if (b.classList.contains('merchant-add-row')) { var c = tr.cloneNode(true); clear(c); tr.after(c); }
        else if (b.classList.contains('merchant-del-row')) { if (all('tr', tbody).length > 2) tr.remove(); else clear(tr); }
        else if (b.classList.contains('merchant-add-col')) { col().forEach(function (cell) { var c2 = cell.cloneNode(true); clear(c2); cell.after(c2); }); }
        else { if (tr.children.length > 2) col().forEach(function (cell) { cell.remove(); }); else col().forEach(clear); }
      }
    },
    {
      // copied from the botiga pack (botiga/assets/js/metabox.js:7-20): Botiga's own product/post options tabs
      label: 'botiga-metabox-tab',
      event: 'click',
      match: function (el) { return !!closest(el, '.botiga-metabox-tab'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var tab = closest(el, '.botiga-metabox-tab'), box = closest(tab, '.botiga-metabox');
        var i = all('.botiga-metabox-tab', tab.parentNode).indexOf(tab);
        all('.botiga-metabox-tab', tab.parentNode).forEach(function (t) { t.classList.toggle('active', t === tab); });
        all('.botiga-metabox-content', box).forEach(function (c, k) { c.classList.toggle('active', k === i); if (k === i) unbake(c); });
      }
    },
    {
      // block editor chrome (inserter, undo/redo, document overview, view, settings, options, Save) is React state in
      // the live editor; the capture is the open document.
      label: 'block-editor-chrome-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.editor-header button, .edit-post-header button, .interface-interface-skeleton__header button, .editor-post-publish-button') && !closest(el, '[data-snap-park], [data-snap-parked]'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] the block editor toolbar works live only ("' + (closest(el, 'button').getAttribute('aria-label') || closest(el, 'button').textContent.trim()).slice(0, 40) + '")'); }
    },
    {
      // order screen writes and downloads (Update, Grant access, Upload image)
      label: 'woocommerce-order-writes-live-2',
      event: 'click',
      match: function (el) { return !!closest(el, 'button.save_order, button.grant_access, .upload_image_button, .remove_image_button'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] this works live only (it saves)'); }
    },
    {
      // Custom Fields box: "Enter new" swaps the key select for a text field (and back with Cancel), as the inline
      // handler does (wp-admin/includes/template.php meta_form; the handler is removed on load, it needs jQuery)
      label: 'wp-custom-field-enter-new',
      event: 'click',
      match: function (el) { return !!closest(el, '#newmeta-button'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        ['#metakeyinput', '#metakeyselect', '#enternew', '#cancelnew', '#metakey-search'].forEach(function (q) { var n = one(q); if (n) { unbake(n); n.classList.toggle('hidden'); } });
        var sel2 = one('#metakeyselect + .select2-container, #metakeyselect ~ .select2'); var sel = one('#metakeyselect'); if (sel2 && sel) sel2.style.display = sel.classList.contains('hidden') ? 'none' : '';
        var i = one('#metakeyinput'); if (i && !i.classList.contains('hidden')) try { i.focus(); } catch (_) {}
      }
    },
    {
      label: 'tel-mailto-live',
      event: 'click',
      match: function (el) { var a = closest(el, 'a[href]'); return !!a && /^(tel|mailto):/.test(a.getAttribute('href')); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] opens the phone / mail app live: ' + closest(el, 'a').getAttribute('href')); }
    },
    {
      // spending-goal widget: its label opens / closes the widget (live adds .active to .merchant-spending-goal-widget)
      label: 'merchant-spending-goal-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-spending-goal-widget-label'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var w = closest(el, '.merchant-spending-goal-widget'); if (w) { unbake(w); w.classList.toggle('active'); } }
    },
    {
      // analytics date ranges open an air-datepicker; the open state is its own capture
      label: 'merchant-analytics-date-range',
      event: 'click',
      match: function (el) { return !!closest(el, '.date-range-input') && !one('.air-datepicker-global-container .air-datepicker'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); R.goto('admin-analytics--datepicker-open'); }
    },
    // ─ Product gallery lightbox (PhotoSwipe) — ported from the botiga pack (@source botiga/assets/js/botiga-gallery.js:22-108;
    //   woocommerce/assets/js/frontend/single-product.js openPhotoswipe, index = clicked image)
    {
      label: 'gallery-lightbox-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.woocommerce-product-gallery__image a, .woocommerce-product-gallery__trigger') && !one('.pswp--open'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault(); if (evt && evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        var a = closest(el, '.woocommerce-product-gallery__image a'); var idx = a ? all('.woocommerce-product-gallery__image a').indexOf(a) : 0;
        pswpOpen(Math.max(0, idx));
      }
    },
    {
      label: 'lightbox-step',
      event: 'click',
      match: function (el) { return !!closest(el, '.pswp--open .pswp__button--arrow--right, .pswp--open .pswp__button--arrow--left'); },
      apply: function (el) { pswpShow(pswp().i + (closest(el, '.pswp__button--arrow--right') ? 1 : -1)); }
    },
    {
      label: 'lightbox-key',
      event: 'keydown',
      match: function () { return !!one('.pswp--open'); },
      apply: function (el, evt) { var k = (evt && evt.key) || (window.event && window.event.key) || ''; if (k === 'ArrowRight') pswpShow(pswp().i + 1); else if (k === 'ArrowLeft') pswpShow(pswp().i - 1); else if (k === 'Escape') pswpClose(); }
    },
    {
      label: 'lightbox-zoom',
      event: 'click',
      match: function (el) { return !!closest(el, '.pswp--open .pswp__button--zoom') || (!!closest(el, '.pswp--open img.pswp__img') && !closest(el, '.pswp__button')); },
      apply: function () {
        var p = one('.pswp'), on = !p.classList.contains('pswp--zoomed-in'); p.classList.toggle('pswp--zoomed-in', on);
        var w = one('.pswp__item[data-snap-center] .pswp__zoom-wrap'); if (!w) return;
        if (!w.hasAttribute('data-snap-t')) w.setAttribute('data-snap-t', w.style.transform);
        w.style.transition = 'transform 333ms cubic-bezier(.4,0,.22,1)'; w.style.transform = on ? w.getAttribute('data-snap-t').replace('scale(1)', 'scale(1.5)') : w.getAttribute('data-snap-t');
      }
    },
    {
      label: 'lightbox-fullscreen',
      event: 'click',
      match: function (el) { return !!closest(el, '.pswp--open .pswp__button--fs'); },
      apply: function () { var p = one('.pswp'), on = !p.classList.contains('pswp--fs'); p.classList.toggle('pswp--fs', on); try { if (on && p.requestFullscreen) p.requestFullscreen(); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
    },
    {
      label: 'lightbox-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.pswp--open .pswp__button--close') || (!!closest(el, '.pswp--open') && !!closest(el, '.pswp__bg, .pswp__scroll-wrap') && !closest(el, '.pswp__img, .pswp__button, .pswp__top-bar, .pswp__caption')); },
      apply: function () { pswpClose(); }
    },
    {
      // copied from the botiga pack (woocommerce checkout.js show_coupon_form): the coupon line slides the form open / shut
      label: 'checkout-coupon-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.showcoupon'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); var fm = one('form.checkout_coupon'); if (fm) { unbake(fm); R.slideToggle(fm, 400); } }
    },
    {
      // free-shipping-progress-bar.js closeFloatingBar: the floating bar's Close hides it (the cookie is not written)
      label: 'merchant-freespb-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-freespb-floating-bar .bar-close-js'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); all('.merchant-freespb-floating-bar').forEach(function (b) { b.classList.add('hidden'); }); }
    },
    {
      label: 'merchant-free-gift-claim-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-merchant-free-gifts-claim-button, .merchant-free-gifts-widget-offer-product-claim'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] claiming the gift works live only (it adds it to the cart); frontend-free-gifts-cart--claimed shows the result'); }
    },
    {
      // modal.js openModal: [data-merchant-modal-trigger] shows .merchant-modal[data-merchant-modal=<id>], body gets merchant-modal-opened
      label: 'merchant-modal-open',
      event: 'click',
      match: function (el) { return !!closest(el, '[data-merchant-modal-trigger]'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var id = closest(el, '[data-merchant-modal-trigger]').getAttribute('data-merchant-modal'), m = one('.merchant-modal[data-merchant-modal="' + id + '"]');
        if (!m) return; unbake(m); m.classList.add('show'); document.body.classList.add('merchant-modal-opened');
      }
    },
    {
      // modal.js buttonCloseModal / closeModal: the × or a click outside .merchant-modal-body closes it
      label: 'merchant-modal-close',
      event: 'click',
      match: function (el) { var m = closest(el, '.merchant-modal.show'); return !!m && (!!closest(el, '[data-merchant-modal-close]') || !closest(el, '.merchant-modal-body')); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); closest(el, '.merchant-modal').classList.remove('show'); document.body.classList.remove('merchant-modal-opened'); }
    },
    {
      // wishlist-button.js type 'remove': the row spins, fades (.removing) and goes after 800 ms; the header count follows;
      // the last row out reloads the page, which is the empty-wishlist capture
      label: 'merchant-wishlist-remove-item',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-wishlist-remove-item'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, '.merchant-wishlist-remove-item'), tr = closest(b, 'tr'); if (!tr || tr.classList.contains('removing')) return;
        tr.classList.add('removing'); b.classList.add('merchantAnimRotate', 'merchant-anim-infinite');
        R.wait(800, function () {
          var tb = tr.parentNode; tr.remove();
          var n = tb ? all('tr', tb).length : 0; all('.header-wishlist-icon .count-number').forEach(function (c) { c.textContent = n; });
          if (!n) R.goto('frontend-wishlist-page--empty');
        });
      }
    },
    {
      // A chrome link (admin sidebar / admin bar / Woo header, storefront menus / footer / breadcrumbs / category lists)
      // whose own screen is not captured opens the nearest captured one instead of being swallowed.
      label: 'chrome-nearest-screen',
      event: 'click',
      order: 'last',
      match: function (el) { var a = closest(el, 'a[href]'); return !!a && !R.resolveHref(a.getAttribute('href')) && !!nearestScreen(a); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, 'a[href]'), to = nearestScreen(a);
        console.info('[snap] ' + a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '') + ' is not captured; showing the nearest screen, ' + to);
        R.goto(to);
      }
    },
    {
      // a carousel slide (upsells, related, recently viewed) opens its product from anywhere on the card
      label: 'carousel-slide-open',
      event: 'click',
      match: function (el) { var li = closest(el, 'li.product.slick-slide'); return !!li && !closest(el, 'a, button, input, select, label') && !!one('a.woocommerce-LoopProduct-link, a[href*="/product/"]', li); },
      apply: function (el) { one('a.woocommerce-LoopProduct-link, a[href*="/product/"]', closest(el, 'li.product')).click(); }
    },
    // ─ WordPress / WooCommerce order screens ───────────────────────────────
    // @since 2026-10-03 @source wp-admin/js/postbox.js; woocommerce/assets/js/admin/meta-boxes-order.js;
    //   merchant-pro/assets/js/modules/delivery-pickup/admin/delivery-pickup-order-edit.js:517-600 @verified 2026-10-03 @product merchant
    {
      // Billing / Shipping "Edit": the address text gives way to its fields.
      label: 'woocommerce-order-edit-address',
      event: 'click',
      match: function (el) { return !!closest(el, '.order_data_column a.edit_address'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var col = closest(el, '.order_data_column'), a = closest(el, 'a.edit_address');
        var addr = one('div.address', col), form = one('div.edit_address', col);
        if (addr) addr.style.display = 'none'; if (form) { R.clearBaked(form); form.style.display = 'block'; }
        a.style.display = 'none';
        var load = one('.load_customer_billing, .load_customer_shipping, .billing-same-as-shipping', col); if (load) load.style.display = 'inline';
      }
    },
    {
      // Refund: the refund rows and per-line refund inputs show, the totals and other actions hide; Cancel undoes it.
      label: 'woocommerce-order-refund-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '#woocommerce-order-items button.refund-items, #woocommerce-order-items .wc-order-refund-items button.cancel-action'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var box = one('#woocommerce-order-items'), on = !!closest(el, 'button.refund-items');
        var vis = function (sel, show) { all(sel, box).forEach(function (x) { if (show) R.clearBaked(x); x.style.display = show ? '' : 'none'; if (show && getComputedStyle(x).display === 'none') x.style.display = 'block'; }); };
        vis('div.wc-order-refund-items', on); vis('div.wc-order-data-row-toggle:not(.wc-order-refund-items)', !on); vis('div.wc-order-totals-items', !on);
        vis('div.refund', on); vis('.wc-order-edit-line-item .wc-order-edit-line-item-actions', !on);
        if (!on) vis('div.wc-order-bulk-actions', true);
      }
    },
    {
      // woocommerce/assets/js/frontend/woocommerce.js (show-password-input) — the eye flips its password field to text
      // and back, and swaps its own "display-password" state.
      label: 'woocommerce-show-password',
      event: 'click',
      match: function (el) { return !!closest(el, '.show-password-input'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, '.show-password-input'), input = one('input', closest(b, '.password-input') || b.parentNode); if (!input) return;
        var show = input.getAttribute('type') === 'password';
        input.setAttribute('type', show ? 'text' : 'password'); b.classList.toggle('display-password', show);
        b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      }
    },
    {
      // My Account orders paging: /my-account/orders/2/ ends in "2", the same nav key as /shop/page/2/
      // (build-snap-nav keys on the last path segment), so Next / Previous are routed here.
      label: 'woocommerce-account-orders-paging',
      event: 'click',
      match: function (el) { var a = closest(el, '.woocommerce-pagination a[href]'); return !!a && /\/my-account\/orders\//.test(a.getAttribute('href')); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault(); if (evt && evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        var n = (closest(el, 'a').getAttribute('href').match(/\/orders\/(\d+)\//) || [])[1];
        if (!n || n === '1') R.goto('frontend-account-orders'); else if (n === '2') R.goto('frontend-account-orders-page-2'); else R.miss(closest(el, 'a').getAttribute('href'), 'orders page ' + n + ' not captured');
      }
    },
    {
      // My Account "Log out" ends the live session; the snapshot stays where it is.
      label: 'woocommerce-account-logout',
      event: 'click',
      match: function (el) { var a = closest(el, 'a[href]'); return !!a && /customer-logout|[?&]action=logout/.test(a.getAttribute('href')); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); if (evt && evt.stopImmediatePropagation) evt.stopImmediatePropagation(); console.info('[snap] Log out works live only (it ends the session)'); }
    },
    {
      // Writes that go to the server: deleting a note, saving a delivery change, the refund itself.
      label: 'woocommerce-order-writes-live',
      event: 'click',
      match: function (el) { return !!closest(el, 'a.delete_note, .merchant-dp-save, .merchant-dp-submit, button.do-api-refund, button.do-manual-refund, button.add_note'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] this works live only (it writes the order)'); }
    },
    {
      // Merchant delivery/pickup box: Edit opens that part's form (again closes it), Cancel closes it.
      label: 'merchant-dp-order-edit',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-dp-edit, .merchant-dp-cancel'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var root = closest(el, '.postbox, .inside, table') || document, part = null;
        if (closest(el, '.merchant-dp-edit')) {
          var row = closest(el, '.merchant-dp-parts-row'), p = row && row.getAttribute('data-part');
          var open = one('.merchant-dp-parts-edit:not([hidden])', root);
          part = open && open.getAttribute('data-part') === p ? null : p;
        }
        all('.merchant-dp-parts-edit', root).forEach(function (r) { var show = r.getAttribute('data-part') === part; r.hidden = !show; if (!show) r.style.display = 'none'; else { R.clearBaked(r); r.style.display = ''; } });
        all('.merchant-dp-parts-row', root).forEach(function (r) { var b = one('.merchant-dp-edit', r); if (b) b.setAttribute('aria-expanded', r.getAttribute('data-part') === part ? 'true' : 'false'); });
      }
    },
    {
      // wc-orders.js:51-80 — the orders list's Preview (eye) opens WooCommerce's order preview modal. The capture parked
      // each listed order's rendered modal (<template data-snap-fragment="wc-order-preview" data-order-id>); the eye
      // opens that copy. Close, the backdrop and Esc dismiss it; its status buttons write the order (live only).
      label: 'woocommerce-order-preview',
      event: 'click',
      match: function (el) { return !!closest(el, 'a.order-preview'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var id = closest(el, 'a.order-preview').getAttribute('data-order-id');
        var tpl = one('template[data-snap-fragment="wc-order-preview"][data-order-id="' + id + '"]');
        if (!tpl) { R.miss('#order-preview-' + id, 'order preview not parked for this order'); return; }
        closeOrderPreview();
        var holder = document.createElement('div'); holder.innerHTML = tpl.innerHTML;
        var dlg = holder.firstElementChild; if (!dlg) return;
        document.body.appendChild(dlg); document.body.classList.add('modal-open');
      }
    },
    {
      label: 'woocommerce-order-preview-close',
      event: 'click',
      match: function (el) { return !!one('#wc-backbone-modal-dialog') && (!!closest(el, '#wc-backbone-modal-dialog .modal-close, .wc-backbone-modal-backdrop') || (!!closest(el, '#wc-backbone-modal-dialog') && !closest(el, '.wc-backbone-modal-content'))); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); closeOrderPreview(); }
    },
    {
      label: 'woocommerce-order-preview-status',
      event: 'click',
      match: function (el) { return !!closest(el, '#wc-backbone-modal-dialog .wc-action-button, #wc-backbone-modal-dialog footer .button:not([href*="post.php"]):not([href*="page=wc-orders&action=edit"])'); },
      apply: function (el, evt) { if (evt && evt.preventDefault) evt.preventDefault(); console.info('[snap] changing the order status works live only (it writes the order)'); }
    },
    {
      // admin.js:661-720 — sortable repeater (blackout dates, notification emails): Add appends an empty row and
      // focuses it; × removes its row; the hidden JSON field follows the rows.
      label: 'merchant-sortable-repeater',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-sortable-repeater-control .customize-control-sortable-repeater-add, .merchant-sortable-repeater .customize-control-sortable-repeater-delete'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var ctl = closest(el, '.merchant-sortable-repeater-control'), list = one('.merchant-sortable-repeater', ctl); if (!list) return;
        if (closest(el, '.customize-control-sortable-repeater-delete')) { var row = closest(el, '.repeater'); if (row) row.parentNode.removeChild(row); }
        else {
          var r = document.createElement('div'); r.className = 'repeater';
          r.innerHTML = '<input type="text" value="" class="repeater-input"><span class="dashicons dashicons-menu"></span><a class="customize-control-sortable-repeater-delete" href="#"><span class="dashicons dashicons-no-alt"></span></a>';
          list.appendChild(r); try { one('input', r).focus(); } catch (_) {}
        }
        var hidden = one('.merchant-sortable-repeater-input', ctl);
        if (hidden) hidden.value = JSON.stringify(all('.repeater-input', list).map(function (i) { return i.value; }).filter(function (v) { return v !== ''; }));
        markDirty();
      }
    },
    {
      // select2 4 MULTIPLE (shipping zones, categories): the box opens a list of the options not yet chosen; a pick
      // adds a chip and selects the option; a chip's × removes it. Port of select2's MultipleSelection.
      label: 'select2-multiple-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.select2-selection--multiple') && !closest(el, '.select2-selection__choice__remove'); },
      apply: function (el) {
        var box = closest(el, '.select2-container'); if (s2 && s2.box === box) { s2Close(); return; }
        s2Close();
        var select = box.previousElementSibling; if (!select || select.tagName !== 'SELECT') select = one('select', box.parentElement); if (!select) return;
        var r = box.getBoundingClientRect();
        var drop = document.createElement('span'); drop.className = 'select2-container select2-container--default select2-container--open';
        drop.style.cssText = 'position:absolute;left:' + (r.left + window.scrollX) + 'px;top:' + (r.bottom + window.scrollY) + 'px;z-index:100000';
        drop.innerHTML = '<span class="select2-dropdown select2-dropdown--below" dir="ltr" style="width:' + r.width + 'px"><span class="select2-results"><ul class="select2-results__options" role="listbox" aria-multiselectable="true"></ul></span></span>';
        document.body.appendChild(drop);
        var ul = one('ul', drop), n = 0;
        [].forEach.call(select.options, function (o) {
          if (o.selected || (o.value === '' && !o.text.trim())) return;
          var li = document.createElement('li'); li.className = 'select2-results__option select2-results__option--selectable'; li.setAttribute('role', 'option');
          li.setAttribute('data-snap-value', o.value); li.setAttribute('data-snap-multi', '1'); li.textContent = o.text; ul.appendChild(li); n++;
        });
        if (!n) { var e = document.createElement('li'); e.className = 'select2-results__option select2-results__message'; e.textContent = 'No results found'; ul.appendChild(e); }
        box.classList.add('select2-container--open'); var sel = one('.select2-selection', box); if (sel) sel.setAttribute('aria-expanded', 'true');
        s2 = { box: box, drop: drop, select: select, multi: true };
      }
    },
    {
      label: 'select2-multiple-pick',
      event: 'click',
      match: function (el) { return !!(s2 && s2.multi && closest(el, '.select2-results__option[data-snap-multi]')); },
      apply: function (el) {
        var li = closest(el, '.select2-results__option'), v = li.getAttribute('data-snap-value'), select = s2.select, box = s2.box;
        [].forEach.call(select.options, function (o) { if (o.value === v) { o.selected = true; o.setAttribute('selected', 'selected'); } });
        var rend = one('.select2-selection__rendered', box), inline = one('.select2-search--inline', rend);
        var chip = document.createElement('li'); chip.className = 'select2-selection__choice'; chip.title = li.textContent;
        chip.innerHTML = '<span class="select2-selection__choice__remove" role="presentation">×</span>'; chip.appendChild(document.createTextNode(li.textContent));
        chip.setAttribute('data-snap-value', v);
        if (rend) rend.insertBefore(chip, inline || null);
        s2Close(); select.dispatchEvent(new Event('change', { bubbles: true })); markDirty();
      }
    },
    {
      label: 'select2-multiple-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '.select2-selection--multiple .select2-selection__choice__remove'); },
      apply: function (el, evt) {
        if (evt && evt.stopPropagation) evt.stopPropagation();
        var chip = closest(el, '.select2-selection__choice'), box = closest(chip, '.select2-container');
        var select = box.previousElementSibling; if (!select || select.tagName !== 'SELECT') select = one('select', box.parentElement);
        var t = (chip.getAttribute('title') || chip.textContent.replace('×', '')).trim(), v = chip.getAttribute('data-snap-value');
        if (select) [].forEach.call(select.options, function (o) { if ((v !== null && o.value === v) || (v === null && o.text.trim() === t)) { o.selected = false; o.removeAttribute('selected'); } });
        chip.parentNode.removeChild(chip);
        if (s2) s2Close();
        if (select) select.dispatchEvent(new Event('change', { bubbles: true })); markDirty();
      }
    },
    {
      label: 'select2-open',
      event: 'click',
      match: function (el) { var b = closest(el, '.select2-container'); return !!(b && !closest(el, '.select2-dropdown') && closest(el, '.select2-selection--single')); },
      apply: function (el) { var b = closest(el, '.select2-container'); if (s2 && s2.box === b) s2Close(); else s2Open(b); }
    },
    {
      label: 'select2-search',
      event: 'input',
      match: function (el) { return !!(s2 && !s2.multi && closest(el, '.select2-search__field')); },
      apply: function (el) { s2Fill(one('ul', s2.drop), s2.select, el.value); }
    },
    {
      label: 'select2-pick',
      event: 'click',
      match: function (el) { return !!(s2 && !s2.multi && closest(el, '.select2-results__option--selectable')); },
      apply: function (el) {
        var li = closest(el, '.select2-results__option--selectable'); var v = li.getAttribute('data-snap-value'); var sel = s2.select;
        [].forEach.call(sel.options, function (o) { o.selected = o.value === v; o.toggleAttribute('selected', o.value === v); });
        var rend = one('.select2-selection__rendered', s2.box); if (rend) { rend.textContent = li.textContent; rend.setAttribute('title', li.textContent); }
        s2Close(); sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    {
      label: 'select2-outside-close',
      event: 'click',
      order: 'last',
      match: function (el) { return !!(s2 && !closest(el, '.select2-container')); },
      apply: function () { s2Close(); }
    },
    {
      label: 'woocommerce-variation-select',
      event: 'change',
      match: function (el) { return el.tagName === 'SELECT' && (el.hasAttribute('data-attribute_name') || /^attribute_/.test(el.name || '')) && !closest(el, '.merchant-module-page'); },
      apply: function (el) { applyVariation(el); }
    },
    {
      label: 'woocommerce-variation-reset',
      event: 'click',
      match: function (el) { return !!closest(el, '.reset_variations'); },
      apply: function (el) {
        var form = closest(el, 'form') || document;
        attrSelects(form).forEach(function (s) { s.value = ''; });
        var box = one('.woocommerce-variation.single_variation', form); if (box) { box.innerHTML = ''; box.style.display = 'none'; }
        var vid = one('input.variation_id', form); if (vid) vid.value = '0';
        setButtons(form, false, false); restoreImage();
        var r = closest(el, '.reset_variations'); r.style.display = 'none'; r.style.visibility = 'hidden';
      }
    },
    {
      // "(N customer reviews)" jumps to the reviews block (Merchant's advanced reviews sit inside #reviews).
      label: 'woocommerce-review-link-scroll',
      event: 'click',
      match: function (el) { return !!closest(el, '.woocommerce-review-link'); },
      apply: function () {
        var t = one('#reviews') || one('.merchant-adv-reviews') || one('#comments');
        var tab = one('.botiga-collapse-toggle[href="#tab-reviews"], .wc-tabs li.reviews_tab a, .reviews_tab a');
        if (tab && !tab.classList.contains('active')) tab.click();
        if (t) t.scrollIntoView({ behavior: R.motion === 'off' ? 'auto' : 'smooth', block: 'start' });
      }
    },
    {
      label: 'merchant-field-change-conditions',
      event: 'change',
      match: function (el) { return !!closest(el, '.merchant-module-page-setting-field'); },
      apply: function () { checkFields(); markDirty(); updatePreview(); }
    },
    {
      label: 'merchant-field-input-dirty',
      event: 'input',
      match: function (el) { return !!closest(el, '.merchant-module-page-content .merchant-module-page-setting-field'); },
      apply: function () { checkFields(); markDirty(); updatePreview(); }
    },
    {
      // admin.js:1523-1560 — the Active / Inactive badge on a campaign row cycles the row's status field.
      label: 'merchant-campaign-status-badge',
      event: 'click',
      match: function (el) { return !!closest(el, '.layout-status[data-status-field]'); },
      apply: function (el) {
        var badge = closest(el, '.layout-status[data-status-field]'); var layout = closest(badge, '.layout');
        var opts = (badge.getAttribute('data-status-options') || 'active,inactive').split(',');
        var cur = (badge.className.match(/layout-status--(\S+)/) || [])[1] || opts[0];
        var next = opts[(opts.indexOf(cur) + 1) % opts.length];
        badge.classList.remove('layout-status--' + cur); badge.classList.add('layout-status--' + next);
        badge.textContent = next.charAt(0).toUpperCase() + next.slice(1);
        var sel = layout && one('select[name*="[' + badge.getAttribute('data-status-field') + ']"]', layout);
        if (sel) { sel.value = next; [].forEach.call(sel.options, function (o) { o.toggleAttribute('selected', o.value === next); }); }
        markDirty();
      }
    },
    {
      label: 'merchant-accordion-header',
      event: 'click',
      match: function (el) {
        var h = closest(el, '.ui-accordion-header');
        if (!h || closest(el, '.layout-status, .customize-control-flexible-content-move, .layout-actions, .merchant-flexible-content-actions, input, select, textarea, a[href]:not([href="#"])')) return false;
        return !!accordionOf(h);
      },
      apply: function (el) {
        var h = closest(el, '.ui-accordion-header'); var root = accordionOf(h);
        var on = !h.classList.contains('ui-accordion-header-active');
        all('.ui-accordion-header-active', root).forEach(function (o) { if (o !== h && accordionOf(o) === root) setHeader(o, false); });
        setHeader(h, on);
      }
    },
    {
      label: 'merchant-colour-picker-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-color-picker'); },
      apply: function (el) { var b = closest(el, '.merchant-color-picker'); if (pcrFor === b) closePicker(); else openPicker(b); }
    },
    {
      label: 'merchant-colour-picker-swatch',
      event: 'click',
      match: function (el) { return !!(pcr && closest(el, '.pcr-swatches button')); },
      apply: function (el) { var b = closest(el, '.pcr-swatches button'); var c = b.style.getPropertyValue('--pcr-color') || b.style.color || getComputedStyle(b).color; pickColour(c.trim()); }
    },
    {
      label: 'merchant-colour-picker-default',
      event: 'click',
      match: function (el) { return !!(pcr && closest(el, '.pcr-clear')); },
      apply: function () { pickColour(pcrFor.getAttribute('data-default-color') || '#212121'); }
    },
    {
      label: 'merchant-colour-picker-outside',
      event: 'click',
      order: 'last',
      match: function (el) { return !!(pcr && !closest(el, '.pcr-app') && !closest(el, '.merchant-color-picker')); },
      apply: function () { closePicker(); }
    },
    {
      // admin.js:260-272 — the Enabled button opens the Disable dropdown; outside click closes it.
      label: 'merchant-module-enabled-dropdown',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-button-deactivate'); },
      apply: function () { var d = one('.merchant-module-deactivate-dropdown'); if (d) d.classList.toggle('merchant-show'); }
    },
    {
      label: 'merchant-module-dropdown-close',
      event: 'click',
      order: 'last',
      match: function (el) { return !!closest(el, '.merchant-module-dropdown-close') || (!closest(el, '.merchant-module-deactivate') && !!one('.merchant-module-deactivate-dropdown.merchant-show')); },
      apply: function (el) { var d = closest(el, '.merchant-module-dropdown') || one('.merchant-module-deactivate-dropdown.merchant-show'); hide(d); }
    },
    {
      // Disable saves over AJAX (admin.js:229-239): never live. The disabled screen is its own capture.
      label: 'merchant-module-disable',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-button-action-deactivate, .merchant-module-page-button-action-activate'); },
      apply: function (el) { hide(one('.merchant-module-deactivate-dropdown')); R.miss('#module-toggle', 'Enable / Disable saves the module state; not driven in a snapshot'); }
    },
    {
      // Save posts the whole form (admin.js:52-187). In a snapshot it only settles the save bar.
      label: 'merchant-module-save',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-save-button'); },
      apply: function () {
        // admin.js:52-170: the save bar shows "saving" (merchant-saving) while the form posts, then hides.
        var bar = one('.merchant-module-page-ajax-header'); if (!bar) return;
        show(bar); bar.classList.add('merchant-saving');
        console.info('[snap] Save posts the module settings: works live only (the saving state is shown)');
        R.wait(900, function () { bar.classList.remove('merchant-saving'); hide(bar); });
      }
    },
    {
      label: 'merchant-ai-prompts-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-ai-badge'); },
      apply: function (el) { openAi(closest(el, '.merchant-ai-badge')); }
    },
    {
      label: 'merchant-ai-prompt-copy',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-ai-prompt-row'); },
      apply: function (el) {
        var row = closest(el, '.merchant-ai-prompt-row'); if (row.classList.contains('is-copied')) return;
        row.classList.add('is-copied'); row.setAttribute('aria-label', 'Copied!'); var ic = one('.merchant-ai-prompt-icon', row); if (ic) ic.innerHTML = CHECK_SVG;
        R.wait(1600, function () { row.classList.remove('is-copied'); row.setAttribute('aria-label', 'Click to copy'); if (ic) ic.innerHTML = COPY_SVG; });
      }
    },
    {
      label: 'merchant-ai-prompts-close',
      event: 'click',
      match: function (el) { var m = one('#merchant-ai-prompts-modal.merchant-show'); return !!m && (!!closest(el, '.merchant-ai-prompts-modal-close') || el === m); },
      apply: function () { hide(one('#merchant-ai-prompts-modal')); }
    },
    {
      // admin.js:2624-2683 — the bell toggles the news sidebar (the read-receipt POST is not reproduced).
      label: 'merchant-news-sidebar-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-notifications'); },
      apply: function () { var s = one('.merchant-notifications-sidebar'); if (s) { R.clearBaked(s); s.classList.toggle('opened'); } }
    },
    {
      label: 'merchant-news-sidebar-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-notifications-sidebar-close'); },
      apply: function () { var s = one('.merchant-notifications-sidebar'); if (s) s.classList.remove('opened'); }
    },
    {
      label: 'merchant-news-tabs',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-tabs-nav-link[data-tab-to]'); },
      apply: function (el) {
        var a = closest(el, '.merchant-tabs-nav-link'); var nav = closest(a, '.merchant-tabs-nav'); var to = a.getAttribute('data-tab-to');
        all('.merchant-tabs-nav-item', nav).forEach(function (i) { i.classList.remove('active'); }); closest(a, '.merchant-tabs-nav-item').classList.add('active');
        var w = one('.merchant-tab-content-wrapper[data-tab-wrapper-id="' + nav.getAttribute('data-tab-wrapper-id') + '"]');
        if (w) all(':scope > .merchant-tab-content', w).forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-tab-content-id') === to); });
      }
    },
    {
      // admin.js:312-319 — Show more / Show less on long field descriptions.
      label: 'merchant-field-desc-more',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-module-page-setting-field-hidden-desc-trigger'); },
      apply: function (el) {
        var t = closest(el, '.merchant-module-page-setting-field-hidden-desc-trigger'); t.classList.toggle('expanded');
        var s = one('span', t); if (s) s.textContent = t.classList.contains('expanded') ? (t.getAttribute('data-hidden-text') || s.textContent) : (t.getAttribute('data-show-text') || s.textContent);
        var d = one('.merchant-module-page-setting-field-hidden-desc', closest(t, '.merchant-module-page-setting-field')); if (d) R.slideToggle(d, 200);
      }
    },
    {
      // admin.js:2180-2201 — the × on a selected product removes it from the list and the hidden value.
      label: 'merchant-selected-product-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-selected-products-preview .remove, .merchant-selected-products-preview [class*="remove"]'); },
      apply: function (el) {
        var li = closest(el, 'li'); var wrap = closest(el, '.merchant-module-page-setting-field-inner, .merchant-products-selector, .merchant-field-products-selector');
        var input = wrap && one('input.merchant-selected-products', wrap); var id = li && li.getAttribute('data-id');
        if (input && id) input.value = input.value.split(',').filter(function (x) { return x !== id; }).join(',');
        if (li) li.remove(); markDirty();
      }
    },

    // ─── storefront ─────────────────────────────────────────────────────────
    {
      // quick-view.js:37-58 — the modal opens on the product the shopper clicked; only the captured product opens.
      label: 'merchant-quick-view-open',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-quick-view-button'); },
      apply: function (el) {
        var li = closest(el, '.product'); var first = one('.products .product');
        if (li && li === first) R.goto('frontend-quick-view-shop--modal-open');
        else R.miss('#quick-view', 'quick view captured for the first shop product only');
      }
    },
    {
      // quick-view.js:123-145 — close button, overlay or Escape.
      label: 'merchant-quick-view-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-quick-view-close-button, .merchant-quick-view-overlay'); },
      apply: function () {
        var m = one('.merchant-quick-view-modal'); if (m) m.classList.remove('merchant-show');
        var i = one('.merchant-quick-view-inner'); if (i) i.classList.remove('merchant-show');
      }
    },
    {
      // side-cart.js:17-21 — every .js-merchant-side-cart-toggle-handler (floating icon, overlay, close) toggles the drawer.
      label: 'merchant-side-cart-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-merchant-side-cart-toggle-handler, .merchant-side-cart-overlay, .merchant-side-cart-close-button'); },
      apply: function () { var s = one('.merchant-side-cart'); if (s) R.clearBaked(s); document.body.classList.toggle('merchant-side-cart-show'); }
    },
    {
      // cookie-banner.js:19-23 — the button and × hide the banner (the cookie write is not reproduced).
      label: 'merchant-cookie-banner-dismiss',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-cookie-banner-button, .merchant-cookie-close-button'); },
      apply: function () { hide(one('.merchant-cookie-banner')); }
    },
    {
      // free-gifts.js:104-107 — the gift button opens and closes the offers panel.
      label: 'merchant-free-gifts-widget-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-free-gifts-widget-button'); },
      apply: function (el) { var w = closest(el, '.merchant-free-gifts-widget'); if (w) w.classList.toggle('active'); }
    },
    {
      label: 'merchant-recent-sales-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-close-notification'); },
      apply: function (el) { var w = closest(el, '.merchant-recent-sales-notifications-widget'); if (w) w.classList.remove('show'); }
    },
    {
      // Merchant's quantity buttons (js-merchant-quantity-btn): step the input inside its min / max.
      label: 'merchant-quantity-step',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-merchant-quantity-btn'); },
      apply: function (el) {
        var b = closest(el, '.js-merchant-quantity-btn'); var box = b.parentElement; var input = box && one('input.qty, input[type=number]', box);
        if (!input) return;
        var step = Number(input.step) || 1, min = input.min === '' ? 1 : Number(input.min), max = input.max === '' ? Infinity : Number(input.max);
        var v = (Number(input.value) || 0) + (b.classList.contains('merchant-quantity-minus') ? -step : step);
        input.value = String(Math.max(min, Math.min(max, v))); input.setAttribute('value', input.value);
      }
    },
    {
      // admin.js:1751-1784 — the "…" on a campaign row slides its Duplicate / Delete menu; other rows' menus close.
      label: 'merchant-campaign-row-actions',
      event: 'click',
      match: function (el) { return !!closest(el, '.layout-actions__toggle'); },
      apply: function (el) {
        var inner = one('.layout-actions__inner', closest(el, '.layout-actions')); if (!inner) return;
        all('.layout-actions__inner').forEach(function (o) { if (o !== inner && o.style.display !== 'none') R.slideUp(o, 300); });
        R.slideToggle(inner, 300);
      }
    },
    {
      // Duplicate / Delete rebuild the campaign list and are saved with the form: not driven in a snapshot.
      label: 'merchant-campaign-row-duplicate-delete',
      event: 'click',
      match: function (el) { return !!closest(el, '.customize-control-flexible-content-duplicate, .customize-control-flexible-content-delete, .customize-control-flexible-content-add, .merchant-flexible-content-add'); },
      apply: function () { all('.layout-actions__inner').forEach(function (o) { if (o.style.display !== 'none') R.slideUp(o, 300); }); console.info('[snap] campaign add / duplicate / delete works live only (it saves with the form)'); }
    },
    {
      label: 'merchant-campaign-row-actions-outside',
      event: 'click',
      order: 'last',
      match: function (el) { return !closest(el, '.layout-actions') && all('.layout-actions__inner').some(function (o) { return o.style.display !== 'none'; }); },
      apply: function () { all('.layout-actions__inner').forEach(function (o) { if (o.style.display !== 'none') R.slideUp(o, 300); }); }
    },
    {
      // Backup download, restore, feedback submit: AJAX against the site.
      label: 'merchant-module-live-only-buttons',
      event: 'click',
      match: function (el) { return !!closest(el, '#download-backup-button, .merchant-dropzone__browse, .merchant-module-question-answer-button, .merchant-license-button, .merchant-install-plugin'); },
      apply: function () { console.info('[snap] this button works live only (it calls the site or downloads a file)'); }
    },
    {
      // botiga/assets/js/custom.js:1202-1260 — Botiga's quantity arrows step the qty input inside min / max / step.
      label: 'botiga-quantity-step',
      event: 'click',
      match: function (el) { return !!closest(el, '.botiga-quantity-plus, .botiga-quantity-minus'); },
      apply: function (el) {
        var b = closest(el, '.botiga-quantity-plus, .botiga-quantity-minus'); var input = one('.qty', closest(b, '.quantity') || b.parentNode); if (!input) return;
        var max = Number(input.getAttribute('max')) || 99999, min = Number(input.getAttribute('min')) || 0, step = Number(input.getAttribute('step')) || 1;
        var v = Number(input.value) + (b.classList.contains('botiga-quantity-plus') ? step : -step);
        input.value = String(Math.max(min, Math.min(max, v))); input.setAttribute('value', input.value);
      }
    },
    {
      // wishlist-button.js:30-75 — add: the heart turns active and its tooltip changes; an active heart opens the wishlist page.
      label: 'merchant-wishlist-heart',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-wishlist-button'); },
      apply: function (el) {
        var b = closest(el, '.merchant-wishlist-button');
        if (b.classList.contains('active')) { var link = b.getAttribute('data-wishlist-link'); var hit = link && R.resolveHref(link); if (hit) R.goto(hit); else R.miss(link || '#wishlist', 'wishlist page not captured here'); return; }
        b.classList.add('active'); var after = b.getAttribute('data-merchant-wishlist-tooltip-after'); if (after) b.setAttribute('data-merchant-wishlist-tooltip', after);
        var t = one('.merchant-wishlist-text', b); var view = b.getAttribute('data-wishlist-view-text'); if (t && view) t.innerHTML = view;
      }
    },
    // ─ Botiga header search (same theme as the botiga pack) ─────────────────
    // @since 2026-10-03 @source botiga/assets/js/custom.js (header search toggle) @verified 2026-10-03 @product merchant
    {
      label: 'botiga-header-search-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.header-search') && !closest(el, '.header-search-form'); },
      apply: function (el) {
        var h = closest(el, '.header-search'), row = closest(h, '.bhfb-desktop, .bhfb-mobile') || document;
        var form = one('.header-search-form', row) || one('.header-search-form'), ov = one('.search-overlay');
        [form, ov].forEach(function (x) { if (x) { R.clearBaked(x); x.classList.toggle('active'); } });
        document.body.classList.toggle('header-search-form-active');
        all('.icon-search, .icon-cancel', h).forEach(function (i) { i.classList.toggle('active'); });
        h.classList.toggle('active', !!(form && form.classList.contains('active')));
        var f = form && one('.search-field', form); if (f && form.classList.contains('active')) f.focus();
      }
    },
    {
      label: 'botiga-search-overlay-close',
      event: 'click',
      match: function (el) { return !!closest(el, '.search-overlay.active'); },
      apply: function () {
        all('.header-search-form.active, .search-overlay.active').forEach(function (x) { x.classList.remove('active'); });
        document.body.classList.remove('header-search-form-active');
        all('.header-search .icon-search').forEach(function (i) { i.classList.add('active'); });
        all('.header-search .icon-cancel').forEach(function (i) { i.classList.remove('active'); });
        all('a.header-search.active').forEach(function (a) { a.classList.remove('active'); });
      }
    },
    {
      // product-swatches.js:338-410,492-500 (archive) — a loop swatch becomes active, sets its hidden select and, once
      // every attribute is picked, the card shows that variation's price and the title gains the variation name.
      // The card image stays: variation thumbnails point at the live uploads (not captured) and this store's
      // variations share the product image.
      label: 'merchant-loop-swatch',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-product-swatches a.merchant-variation-item'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, 'a.merchant-variation-item'), td = closest(a, 'td') || a.parentNode;
        all('.merchant-variation-item', td).forEach(function (x) { x.classList.toggle('active', x === a); });
        var sel = one('select', td); if (sel) sel.value = a.getAttribute('value');
        var form = closest(a, '.variations_form'), card = closest(a, '.product'); if (!form || !card) return;
        var picked = {}, done = true;
        all('table.variations td', form).forEach(function (cell) {
          var s = one('select', cell), act = one('.merchant-variation-item.active', cell);
          var name = s ? s.name : ''; var val = act ? act.getAttribute('value') : (s ? s.value : '');
          if (name) { if (val) picked[name] = val; else done = false; }
        });
        var title = one('.merchant-wc-loop-product__title, .woocommerce-loop-product__title', card);
        if (title) {
          if (!title.hasAttribute('data-snap-title')) title.setAttribute('data-snap-title', title.textContent.trim());
          var names = all('.merchant-variation-item.active', form).map(function (x) { var t = one('.merchant-variation-tooltip', x) || x; return t.textContent.trim(); }).join(' ');
          title.innerHTML = '';
          title.appendChild(document.createTextNode(title.getAttribute('data-snap-title') + ' '));
          var sp = document.createElement('span'); sp.className = 'merchant-ptitle-variation-name'; sp.textContent = names; title.appendChild(sp);
        }
        if (!done) return;
        var vars; try { vars = JSON.parse(form.getAttribute('data-product_variations') || 'false'); } catch (_) { vars = false; }
        var hit = (vars || []).filter(function (v) { return Object.keys(picked).every(function (k) { return !v.attributes[k] || v.attributes[k] === picked[k]; }); })[0];
        if (!hit) return;
        var price = one('.price', card); if (price && hit.price_html) { var tmp = document.createElement('div'); tmp.innerHTML = hit.price_html; var p = one('.price', tmp); price.innerHTML = p ? p.innerHTML : tmp.innerHTML; }
        var stock = one('.merchant-product-stock > span', card); var st = closest(stock, '.merchant-product-stock');
        if (stock && st) { var key = hit.is_in_stock ? 'in-stock-text' : 'out-of-stock-text'; var t2 = st.getAttribute('data-' + key); if (t2) stock.innerHTML = t2; st.classList.toggle('merchant-product-stock-low', !hit.is_in_stock); }
      }
    },
    {
      // product-swatches.js:36-60 — outside the shop loop (single product, FBT and bundle items) a swatch is a face
      // for its hidden select: it turns active, sets the select and fires change, which drives the form.
      label: 'merchant-swatch-pick',
      event: 'click',
      match: function (el) { return !!closest(el, 'a.merchant-variation-item') && !closest(el, '.merchant-product-swatches'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, 'a.merchant-variation-item'), wrap = closest(a, '.merchant-variations-wrapper') || a.parentNode.parentNode;
        all('a.merchant-variation-item', wrap).forEach(function (x) { x.classList.toggle('active', x === a); });
        var sel = one('select', wrap) || one('select', closest(wrap, 'td, .variations') || wrap);
        if (sel) { sel.value = a.getAttribute('value'); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    },
    // ─ Merchant Pro checkout layouts ────────────────────────────────────────
    // @since 2026-10-03 @source merchant-pro/assets/js/modules/checkout/checkout-multi-step.js:133-305,
    //   checkout-one-step.js:72-140 @verified 2026-10-03 @product merchant
    {
      // Multi-step: a tab (or Next / Prev) makes its step current, marks the tabs either side, switches the
      // wrapper's step class and, for Order Review, copies the order table in. Field validation runs live only.
      label: 'merchant-checkout-multi-step',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-pro-multi-step-tabs-nav-item > a, .merchant-pro-multi-step-next, .merchant-pro-multi-step-prev, .merchant-pro-multi-step-skip-login'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var tabs = all('.merchant-pro-multi-step-tabs-nav-item'); if (!tabs.length) return;
        var cur = tabs.filter(function (t) { return t.classList.contains('current-step'); })[0] || tabs[0], i = tabs.indexOf(cur);
        var a = closest(el, '.merchant-pro-multi-step-tabs-nav-item > a'), to;
        if (a) to = tabs.indexOf(a.parentNode);
        else if (closest(el, '.merchant-pro-multi-step-prev')) to = i - 1;
        else to = i + 1;
        if (to < 0 || to >= tabs.length) return;
        tabs.forEach(function (t, j) { t.classList.remove('previous-step', 'current-step', 'next-step'); if (j === to) t.classList.add('current-step'); if (j === to - 1) t.classList.add('previous-step'); if (j === to + 1) t.classList.add('next-step'); });
        var step = one('a', tabs[to]).getAttribute('data-step'), wrap = one('.merchant-pro-multi-step-wrapper');
        if (wrap) { ['login', 'billing-shipping', 'order-payment', 'order-review'].forEach(function (c) { wrap.classList.remove(c); }); wrap.classList.add(step); }
        if (step === 'order-review') {
          var dest = one('.merchant-pro-multi-step-order-review .merchant-pro-multi-step-order-review__table'), table = one('.woocommerce-checkout-review-order-table');
          if (dest && table && !dest.children.length) dest.innerHTML = table.outerHTML;
        }
        var top = one('.merchant-pro-multi-step-tabs-nav') || wrap; if (top && top.scrollIntoView) top.scrollIntoView({ block: 'start' });
      }
    },
    {
      // Shopify layout: breadcrumbs, Continue to …, « Return to … and Change move between Information, Shipping and
      // Payment (the active section's inputs editable, the others read-only). « Return to cart stays a link.
      label: 'merchant-checkout-shopify-steps',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-pro-sc-layout-shopify') && !!closest(el, '.merchant-pro-sc-breadcrumb-item[data-content-id], .merchant-pro-sc-next, .merchant-pro-sc-prev:not(.merchant-pro-sc-return-cart), .merchant-pro-sc-detail-change'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var id, crumb = closest(el, '.merchant-pro-sc-breadcrumb-item[data-content-id]'), item = closest(el, '.merchant-pro-sc-content-item');
        if (crumb) id = crumb.getAttribute('data-content-id');
        else if (closest(el, '.merchant-pro-sc-detail-change')) id = closest(el, '.merchant-pro-sc-detail-change').getAttribute('data-content-id');
        else if (closest(el, '.merchant-pro-sc-next')) id = item && item.nextElementSibling && item.nextElementSibling.getAttribute('data-content-id');
        else id = item && item.previousElementSibling && item.previousElementSibling.getAttribute('data-content-id');
        if (!id) return;
        all('.merchant-pro-sc-breadcrumb-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-content-id') === id); });
        all('.merchant-pro-sc-content-item[data-content-id]').forEach(function (c) {
          var on = c.getAttribute('data-content-id') === id; c.classList.toggle('active', on); if (on) R.clearBaked(c);
          all('input, select, textarea', c).forEach(function (f) { if (on) f.removeAttribute('readonly'); else f.setAttribute('readonly', 'readonly'); });
        });
        var bc = one('.merchant-pro-sc-breadcrumb'); if (bc && bc.scrollIntoView) bc.scrollIntoView({ block: 'center' });
      }
    },
    {
      // woocommerce cart.js — "Change address" slides the shipping calculator form open / shut.
      label: 'woocommerce-shipping-calculator',
      event: 'click',
      match: function (el) { return !!closest(el, '.shipping-calculator-button'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var f = one('.shipping-calculator-form', closest(el, '.woocommerce-shipping-calculator, td, form') || document); if (!f) return;
        R.clearBaked(f); var open = getComputedStyle(f).display === 'none'; f.style.display = open ? 'block' : 'none';
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    },
    {
      // Clear Cart empties the cart and Update Cart posts it: both write the session. The admin preview's Clear Cart is a
      // picture of the button.
      label: 'merchant-cart-writes-live',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-clear-cart-button, button[name="update_cart"], .merchant-pro-sc-apply-coupon, button[name="apply_coupon"]'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        if (closest(el, '.merchant-module-page-preview')) { console.info('[snap] preview of the Clear Cart button: nothing to clear here'); return; }
        console.info('[snap] ' + (closest(el, '.merchant-clear-cart-button') ? 'Clear Cart' : closest(el, '.merchant-pro-sc-apply-coupon, button[name="apply_coupon"]') ? 'Apply coupon' : 'Update cart') + ' works live only (it writes the cart); the cart states are captured separately');
      }
    },
    {
      // An offer's Add to cart (cart / checkout / thank-you offers) stays .disabled until its options are picked; the
      // button then ignores the pointer and the click lands on its wrapper. Live does nothing here either.
      label: 'merchant-offer-add-to-cart-disabled',
      event: 'click',
      match: function (el) { var w = closest(el, '.add-to-cart'); return !!w && !closest(el, 'button') && !!one('.add-to-cart-button.disabled, .add-offer-to-cart.disabled', w); },
      apply: function () { console.info('[snap] pick the offer\'s options first; Add to cart then works live only (it writes the cart)'); }
    },
    {
      // The admin previews' quantity box (+ / −) steps its number, as on the storefront.
      label: 'merchant-preview-qty',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-preview-qty button'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var b = closest(el, 'button'), input = one('input', b.parentNode); if (!input) return;
        var v = Math.max(1, (parseInt(input.value, 10) || 1) + (b.textContent.trim() === '+' ? 1 : -1));
        input.value = String(v); input.setAttribute('value', input.value);
      }
    },
    {
      // air-datepicker (vendored): Clear empties the selection and the field it belongs to; the picker stays open.
      label: 'air-datepicker-clear',
      event: 'click',
      match: function (el) { return !!closest(el, '.air-datepicker-button'); },
      apply: function (el) {
        var dp = closest(el, '.air-datepicker');
        all('.-selected-, .-range-from-, .-range-to-, .-in-range-', dp).forEach(function (c) { c.classList.remove('-selected-', '-range-from-', '-range-to-', '-in-range-'); });
        var field = all('.merchant-module-page-setting-field-date_time input, .merchant-datetime-field input, input.date-range-input').filter(function (x) { return x.offsetWidth && x.value; })[0];
        if (field) { field.value = ''; field.setAttribute('value', ''); }
      }
    },
    {
      // Adding to the cart writes the WooCommerce session; the cart states are their own captures. A loop button
      // without ajax_add_to_cart (variable products: "Choose a finish", "Back soon") is a plain link to the
      // product page and is left to the navigation layer.
      label: 'merchant-add-to-cart-live',
      event: 'click',
      match: function (el) {
        var b = closest(el, '.single_add_to_cart_button, .add_to_cart_button, .add-offer-to-cart, .add-to-cart-button, .merchant-add-bundle-to-cart, .merchant-upsell-add-to-cart, .merchant-buy-now-button, button[name="add-to-cart"]');
        if (!b) return false;
        if (b.tagName === 'A' && b.classList.contains('add_to_cart_button') && !b.classList.contains('ajax_add_to_cart')) return false;
        return true;
      },
      apply: function () { console.info('[snap] add to cart works live only (it writes the cart); the cart states are captured separately'); }
    },
    {
      // advanced-reviews.js:121-126,580-615 — a review photo opens the photo slider, whose body is a server answer
      // (merchant_reviews_photo_slider). The hero product's slider is its own capture; elsewhere it is live only.
      label: 'merchant-review-photo-slider',
      event: 'click',
      match: function (el) { return !!closest(el, '.js-photo-slider-item[data-comment-id]'); },
      apply: function () {
        var target = 'frontend-advanced-reviews-single--photo-slider';
        if (slug() === target) { console.info('[snap] this capture shows one review\'s photo slider; other reviews\' sliders load live only'); return; }
        if (document.body.classList.contains('postid-260')) R.goto(target);
        else console.info('[snap] the review photo slider loads live only (admin-ajax merchant_reviews_photo_slider)');
      }
    },
    {
      // frequently-bought-together.js:83-125,231-290 — a bundled variable product's checkbox enables once all its
      // options are picked; an optional item's checkbox re-totals the bundle (all in: discounted, some: plain sum,
      // none: the "choose" message). Prices are the data-product-price of each item.
      label: 'merchant-fbt-options',
      event: 'change',
      match: function (el) { return !!closest(el, '.merchant-frequently-bought-together-bundle-product') && !!closest(el, 'select, .include-product'); },
      apply: function (el) {
        var item = closest(el, '.merchant-frequently-bought-together-bundle-product'), bundle = closest(item, '.merchant-frequently-bought-together-bundle');
        if (el.tagName === 'SELECT') {
          var box = one('.include-product', item), ready = all('select', item).every(function (s) { return !!s.value; });
          if (box) { box.disabled = !ready; box.checked = ready; }
        }
        if (!bundle || !bundle.classList.contains('optional-bundle')) return;
        var form = one('.merchant-frequently-bought-together-form', bundle), opt = all('.is-optional .include-product', bundle);
        var on = opt.filter(function (c) { return c.checked; }).length, sum = 0;
        all('.merchant-frequently-bought-together-bundle-product', bundle).forEach(function (p) {
          if (p.classList.contains('disabled') || (p.classList.contains('is-optional') && !(one('.include-product', p) || {}).checked)) return;
          sum += parseFloat(p.getAttribute('data-product-price') || 0);
        });
        var money = function (v) { return '<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">$</span>' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</bdi></span>'; };
        var total = one('.merchant-frequently-bought-together-bundle-total-price', bundle), save = one('.merchant-frequently-bought-together-bundle-save', bundle);
        var label = one('.merchant-frequently-bought-together-bundle-total', bundle), btn = one('button[type="submit"], .merchant-add-bundle-to-cart', bundle);
        var dt = form && form.getAttribute('data-bundle-discount-type'), dv = parseFloat((form && form.getAttribute('data-bundle-discount-value')) || 0);
        if (total) { R.clearBaked(total); total.classList.remove('merchant-hidden'); }
        var msg = one('.merchant-frequently-bought-together-bundle-variable-default-message', bundle); if (msg) msg.classList.add('merchant-hidden');
        if (on === opt.length && !bundle.classList.contains('has-no-discount')) {
          var sale = dt === 'fixed_discount' ? sum - dv : sum - sum * dv / 100;
          if (total) total.innerHTML = '<del class="mrc-fbt-total-price">' + money(sum) + '</del> <ins class="mrc-fbt-total-discounted-price">' + money(sale) + '</ins>';
          if (save) { R.clearBaked(save); save.classList.remove('merchant-hidden'); var amt = one('.fbt-saving-total-amount', save); if (amt) { R.clearBaked(amt); amt.classList.remove('merchant-hidden'); amt.innerHTML = money(sum - sale); } }
          if (btn) btn.classList.remove('disabled');
        } else if (!on) {
          if (total) total.innerHTML = '<div class="choice-missing-message">Please select at least one product.</div>';
          if (save) save.classList.add('merchant-hidden'); if (btn) btn.classList.add('disabled');
        } else {
          if (label) label.textContent = bundle.getAttribute(on > 1 ? 'data-bundle-price-label' : 'data-bundle-price-label-single-choice') || label.textContent;
          if (total) total.innerHTML = '<ins class="mrc-fbt-total-price">' + money(sum) + '</ins>';
          if (save) save.classList.add('merchant-hidden'); if (btn) btn.classList.remove('disabled');
        }
      }
    },
    {
      // admin.js:1599-1650 — "Add new …" under a campaign list: one layout adds a row straight away, several open the
      // layout menu. The row is a copy of the hidden .layouts template, numbered, appended and opened; it is not
      // saved (Save stays live only).
      label: 'merchant-flexible-add',
      event: 'click',
      match: function (el) { return !!closest(el, '.customize-control-flexible-content-add-button, .customize-control-flexible-content-add'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var link = closest(el, '.customize-control-flexible-content-add');
        if (!link) {
          var wrap = closest(el, '.customize-control-flexible-content-add-wrapper') || el.parentNode;
          var links = all('.customize-control-flexible-content-add', wrap);
          if (links.length !== 1) { var list = one('.customize-control-flexible-content-add-list', wrap); if (list) list.classList.toggle('active'); return; }
          link = links[0];
        }
        var ctl = one('.merchant-flexible-content-control[data-id="' + link.getAttribute('data-id') + '"]'); if (!ctl) return;
        var tpl = one('.layouts .layout[data-type="' + link.getAttribute('data-layout') + '"]', ctl), box = one('.merchant-flexible-content', ctl);
        if (!tpl || !box) return;
        var rows = all(':scope > .layout', box), n = rows.length, row = tpl.cloneNode(true);
        all('input, select, textarea', row).forEach(function (f) { var dn = f.getAttribute('data-name'); if (dn) f.setAttribute('name', dn.replace('0', n)); });
        var cnt = one('.layout-count', row); if (cnt) cnt.textContent = n + 1;
        var uid = 'snap-' + (n + 1); row.setAttribute('data-layout-id', uid); var fid = one('.flexible-id', row); if (fid) fid.value = uid;
        // the accordion markup jQuery UI gives a row on refresh, copied from a live row (or built when the list was empty)
        var head = one('.layout-header', row), body = one('.layout-body', row), ref = rows[0];
        if (head && body) {
          var hid = 'snap-flex-h-' + (n + 1), bid = 'snap-flex-p-' + (n + 1);
          head.className = ref && one('.layout-header', ref) ? one('.layout-header', ref).className : 'layout-header ui-accordion-header ui-corner-all ui-state-default ui-accordion-icons ui-accordion-header-collapsed';
          body.className = ref && one('.layout-body', ref) ? one('.layout-body', ref).className : 'layout-body ui-accordion-content ui-corner-bottom ui-helper-reset ui-widget-content';
          head.id = hid; head.setAttribute('aria-controls', bid); head.setAttribute('role', 'tab'); body.id = bid; body.setAttribute('role', 'tabpanel');
        }
        all('.merchant-group-field.has-accordion', row).forEach(function (g, i) {
          var gh = one(':scope > .title-area, :scope > .header', g), gc = gh && gh.nextElementSibling; if (!gh || !gc) return;
          var a = 'snap-grp-' + (n + 1) + '-' + i;
          g.classList.add('ui-accordion', 'ui-widget', 'ui-helper-reset');
          gh.classList.add('ui-accordion-header', 'ui-corner-all', 'ui-state-default', 'ui-accordion-icons', 'ui-accordion-header-collapsed'); gh.id = a + '-h'; gh.setAttribute('aria-controls', a + '-p');
          gc.classList.add('ui-accordion-content', 'ui-corner-bottom', 'ui-helper-reset', 'ui-widget-content'); gc.id = a + '-p'; gc.style.display = 'none';
        });
        box.appendChild(row); box.classList.remove('empty');
        var list2 = closest(link, '.customize-control-flexible-content-add-list'); if (list2) list2.classList.remove('active');
        if (head && accordionOf(head)) { all('.ui-accordion-header-active', box).forEach(function (o) { if (accordionOf(o) === box) setHeader(o, false); }); setHeader(head, true); }
        checkFields(); markDirty();
        row.scrollIntoView({ block: 'center' });
      }
    },
    {
      // wp-admin/js/comment.js — Edit next to "Submitted on" reveals the date fields; OK / Cancel hide them again.
      label: 'wp-comment-edit-timestamp',
      event: 'click',
      match: function (el) { return !closest(el, '#submitdiv') && !!closest(el, '#misc-publishing-actions a.edit-timestamp, #timestampdiv .save-timestamp, #timestampdiv .cancel-timestamp'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var div = one('#timestampdiv'), edit = one('a.edit-timestamp'); if (!div) return;
        var open = !!closest(el, 'a.edit-timestamp');
        R.clearBaked(div); div.style.display = open ? 'block' : 'none'; div.classList.toggle('hide-if-js', !open);
        if (edit) edit.style.display = open ? 'none' : '';
      }
    },
    {
      // advanced-reviews-editor.js — × on a review photo drops it from the list and the hidden id field (saved on Update).
      label: 'merchant-review-image-remove',
      event: 'click',
      match: function (el) { return !!closest(el, '#review-images-wrapper .remove-image'); },
      apply: function (el) {
        var li = closest(el, 'li'); if (!li) return;
        var ids = one('#review_photos_ids'), id = li.getAttribute('data-id');
        if (ids) ids.value = ids.value.split(',').filter(function (x) { return x && x !== id; }).join(',');
        li.parentNode.removeChild(li);
      }
    },
    {
      // woocommerce/assets/js/frontend/single-product.js (stars) — a star in the review form turns active, the row
      // is marked selected and the hidden #rating select takes that value.
      label: 'woocommerce-review-stars',
      event: 'click',
      match: function (el) { return !!closest(el, 'p.stars a, .stars a[class^="star-"]'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = closest(el, 'a'), row = closest(a, '.stars'), form = closest(a, 'form') || document;
        all('a', row).forEach(function (x) { x.classList.toggle('active', x === a); x.setAttribute('aria-checked', x === a ? 'true' : 'false'); });
        row.classList.add('selected');
        var n = (a.className.match(/star-(\d)/) || [])[1], sel = one('select#rating, select[name="rating"]', form); if (sel && n) sel.value = n;
      }
    },
    {
      // advanced-reviews-myaccount.js — Write a Review on an ordered item fills the review popup with that item
      // (image, name, description) and opens it; a click outside the form closes and clears it. Submit stays live only.
      label: 'merchant-account-review-modal',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-collect-order-review .merchant-add-review') || (!!closest(el, '.merchant-collect-order-review .review-modal-body.show') && !closest(el, '.merchant-product-review-form')); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var modal = one('.review-modal-body'), form = one('.merchant-product-review-form'); if (!modal || !form) return;
        var slot = function (s) { return one('.product-data ' + s, form); };
        var btn = closest(el, '.merchant-add-review');
        if (!btn) { modal.classList.remove('show'); ['.product-image', '.product-name', '.product-description'].forEach(function (s) { var x = slot(s); if (x) x.innerHTML = ''; }); return; }
        var p = closest(btn, '.merchant-order-review-product'); if (!p) return;
        var img = one('.merchant-product-image', p), name = one('.merchant-product-name', p), desc = one('.merchant-product-desc', p);
        if (slot('.product-image')) { slot('.product-image').innerHTML = ''; if (img) slot('.product-image').appendChild(img.cloneNode(true)); }
        if (slot('.product-name')) slot('.product-name').textContent = name ? name.textContent.trim() : '';
        if (slot('.product-description')) { var t = desc ? desc.textContent.trim() : ''; slot('.product-description').textContent = t.length > 100 ? t.slice(0, 100) + '...' : t; }
        modal.setAttribute('data-product-id', p.getAttribute('data-product-id') || ''); modal.setAttribute('data-item-id', p.getAttribute('data-item-id') || '');
        R.clearBaked(modal); modal.classList.add('show');
      }
    },
    {
      // advanced-reviews.js:39-46,214-217 — Write a Review toggles the review modal; × or the backdrop closes it.
      label: 'merchant-reviews-write-modal',
      event: 'click',
      match: function (el) {
        var m = one('.merchant-adv-reviews-modal'); if (!m) return false;
        if (closest(el, '.js-merchant-adv-review-write-button, .merchant-adv-reviews-modal-close')) return true;
        return m.classList.contains('show') && closest(el, '.merchant-adv-reviews-modal') && !closest(el, '.merchant-adv-reviews-modal-body');
      },
      apply: function () { var m = one('.merchant-adv-reviews-modal'); R.clearBaked(m); m.classList.toggle('show'); }
    },
    {
      // advanced-reviews.js:77-91 — a rating bar toggles its filter (the list re-filters over AJAX live; here the
      // loaded reviews are filtered by their own star rating).
      label: 'merchant-reviews-rating-filter',
      event: 'click',
      match: function (el) { return !!closest(el, '.merchant-star-rating-bar-item'); },
      apply: function (el) {
        var bar = closest(el, '.merchant-star-rating-bar-item'); var on = !bar.classList.contains('rating-active'); bar.classList.toggle('rating-active', on);
        var x = one(':scope > svg', bar); if (x) x.remove();
        if (on) bar.insertAdjacentHTML('beforeend', '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6.2253 4.81108C5.83477 4.42056 5.20161 4.42056 4.81108 4.81108C4.42056 5.20161 4.42056 5.83477 4.81108 6.2253L10.5858 12L4.81114 17.7747C4.42062 18.1652 4.42062 18.7984 4.81114 19.1889C5.20167 19.5794 5.83483 19.5794 6.22535 19.1889L12 13.4142L17.7747 19.1889C18.1652 19.5794 18.7984 19.5794 19.1889 19.1889C19.5794 18.7984 19.5794 18.1652 19.1889 17.7747L13.4142 12L19.189 6.2253C19.5795 5.83477 19.5795 5.20161 19.189 4.81108C18.7985 4.42056 18.1653 4.42056 17.7748 4.81108L12 10.5858L6.2253 4.81108Z"></path></svg>');
        var wrap = closest(bar, '.merchant-adv-reviews') || document;
        var picked = all('.merchant-star-rating-bar-item.rating-active', wrap).map(function (b) { return String(b.getAttribute('data-rating') || '').trim(); });
        all('.merchant-reviews-list-item', wrap).forEach(function (it) {
          var r = ((one('.star-rating', it) || {}).getAttribute ? one('.star-rating', it).getAttribute('aria-label') : '') || '';
          var n = (r.match(/Rated\s+([\d.]+)/) || [])[1]; n = n ? String(Math.round(Number(n))) : '';
          it.style.display = !picked.length || picked.indexOf(n) !== -1 ? '' : 'none';
        });
      }
    },
    {
      // Botiga's product tabs / accordion toggles (Description, Reviews).
      label: 'botiga-collapse-toggle',
      event: 'click',
      match: function (el) { return !!closest(el, '.botiga-collapse-toggle'); },
      apply: function (el) {
        var t = closest(el, '.botiga-collapse-toggle'); var on = !t.classList.contains('active'); t.classList.toggle('active', on);
        var item = closest(t, '.botiga-accordion__item, .botiga-collapse') || t.parentElement;
        var body = item && one('.botiga-accordion__body, .botiga-collapse__content', item); if (body) { R.clearBaked(body); if (on) R.slideDown(body, 250); else R.slideUp(body, 250); }
      }
    }
  ], { product: 'merchant' });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkFields); else checkFields();
})();
