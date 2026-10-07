/* products/botiga/snapshots/_shared/interactivity.js — Botiga + Botiga Pro snapshot runtime.
 * Loads after products/_runtime/core.js. Every entry cites the theme / plugin source it mirrors
 * (roots: botiga/ = the theme, botiga-pro/ = the plugin, woocommerce/ = Woo core).
 * Results that need the server were parked at capture time as <template data-snap-fragment>
 * (products/botiga/capture-plans/_cleanup.json park-* steps); nothing here invents UI.
 */
(function () {
  'use strict';
  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }
  var P = { product: 'botiga', file: 'interactivity.js' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var up = function (el, s) { return el && el.closest ? el.closest(s) : null; };
  var frag = function (name) { var t = document.querySelector('template[data-snap-fragment="' + name + '"]'); return t ? t.content.cloneNode(true) : null; };
  // State snapshots reached only through goto (not URL-reachable).
  var KNOWN = ['admin-botiga-templates-builder--conditions-modal', 'admin-botiga-templates-builder--edit-card', 'admin-nav-menus--mega-menu-depth0', 'admin-nav-menus--mega-menu-depth1', 'admin-nav-menus--mega-menu-depth2'];
  var unbake = function (el) { if (el) { R.clearBaked(el); $$('[data-snap-baked]', el).forEach(R.clearBaked); } };

  // ─ Theme shims for the inline handlers the markup carries ─────────────
  // @since 2026-10-03 @source botiga/assets/js/custom.js:1483-1502 (botiga.toggleClass) @verified 2026-10-03 @product botiga
  // The header cart, side-cart close and off-canvas buttons call botiga.toggleClass.init(event, this, '<event>')
  // inline; this is the theme function verbatim, so the snapshot keeps the theme's own wiring.
  window.botiga = window.botiga || {};
  window.botiga.toggleClass = {
    init: function (event, el, triggerEvent) {
      event.preventDefault(); event.stopPropagation();
      var target = document.querySelector(el.getAttribute('data-botiga-selector'));
      if (!target) return;
      var rm = el.getAttribute('data-botiga-toggle-class-remove');
      if (typeof rm === 'string') target.classList.remove(rm);
      unbake(target);
      target.classList.toggle(el.getAttribute('data-botiga-toggle-class'));
      if (triggerEvent) window.dispatchEvent(new Event(triggerEvent));
    }
  };
  // @source botiga-pro/assets/js/botiga-side-mini-cart.js:17-38,74-82 — overlay class + outside click closes.
  function sideCartOutside(e) {
    if (!up(e.target, '.botiga-side-mini-cart') && !up(e.target, '.cart-contents')) {
      var c = $('.botiga-side-mini-cart'); if (c) c.classList.remove('show');
      window.dispatchEvent(new Event('side-mini-cart-toggle'));
    }
  }
  window.addEventListener('side-mini-cart-toggle', function () {
    var c = $('.botiga-side-mini-cart'); if (!c) return;
    var on = c.classList.contains('show');
    document.body.classList.toggle('side-mini-cart-overlay', on);
    if (on) setTimeout(function () { document.body.addEventListener('click', sideCartOutside); });
    else document.body.removeEventListener('click', sideCartOutside);
  });
  // Customizer "go to section" links: onclick="wp.customize.section('<id>').focus()" (botiga HFB grid,
  // botiga/inc/modules/hf-builder/class-header-footer-builder.php:746-788). The section is its own snapshot.
  if (document.getElementById('customize-controls')) {
    window.wp = window.wp || {};
    var gotoSection = function (kind, id) {
      if (kind === 'section' && /^sidebar-widgets-/.test(id) && !R.resolveHref('customize.php?autofocus[section]=' + id)) { R.goto('admin-customize-panel-widgets'); return; } // widget areas: the Widgets panel is captured
      var href = 'customize.php?autofocus[' + kind + ']=' + id;
      var slug = R.resolveHref(href);
      if (slug) R.goto(slug); else R.miss(href, 'Customizer ' + kind + ' not captured yet');
    };
    window.wp.customize = window.wp.customize || {
      section: function (id) { return { focus: function () { gotoSection('section', id); }, expand: function () { gotoSection('section', id); } }; },
      panel: function (id) { return { focus: function () { gotoSection('panel', id); }, expand: function () { gotoSection('panel', id); } }; },
      control: function () { return { focus: function () {} }; }
    };
  }

  // Copied verbatim from products/merchant/snapshots/_shared/interactivity.js (merchant capture worker, 2026-10-03),
  // per the director: one generic select2 / selectWoo replay for the checkout Country / State fields.
  var one = function (s, r) { return (r || document).querySelector(s); };
  var closest = function (el, s) { return el && el.closest ? el.closest(s) : null; };
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') s2Close(); });

  R.register([
    // ─ Botiga dashboard tabs ─────────────────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/admin/botiga-dashboard.js:137-163 @verified 2026-10-03 @product botiga
    {
      label: 'dashboard-tab',
      event: 'click',
      match: function (el) { var a = up(el, '.botiga-dashboard-tabs-nav-link'); return !!a && !a.classList.contains('no-tabs-link') && !!up(a, '.botiga-dashboard-tabs-nav'); },
      apply: function (el) {
        var a = up(el, '.botiga-dashboard-tabs-nav-link'), nav = up(a, '.botiga-dashboard-tabs-nav');
        var wrapId = nav.getAttribute('data-tab-wrapper-id'), to = a.getAttribute('data-tab-to');
        $$('.botiga-dashboard-tabs-nav-item', nav).forEach(function (i) { i.classList.remove('active'); });
        var item = up(a, '.botiga-dashboard-tabs-nav-item'); if (item) item.classList.add('active');
        $$('.botiga-dashboard-tab-content-wrapper[data-tab-wrapper-id="' + wrapId + '"]').forEach(function (w) {
          $$(':scope > .botiga-dashboard-tab-content', w).forEach(function (c) {
            var on = c.getAttribute('data-tab-content-id') === to;
            c.classList.toggle('active', on); if (on) unbake(c);
          });
        });
      },
      state: function (el) { return { key: 'dashboard.tab', value: up(el, '.botiga-dashboard-tabs-nav-link').getAttribute('data-tab-to') }; }
    },
    // ─ Dashboard notifications sidebar ───────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/admin/botiga-dashboard.js:358-397 @verified 2026-10-03 @product botiga
    // Open/close only; the real "mark read" POST (botiga_notifications_read) is a write and stays out.
    {
      label: 'dashboard-notifications-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-dashboard-theme-notifications'); },
      apply: function () { var s = $('.botiga-dashboard-notifications-sidebar'); if (s) { unbake(s); s.classList.toggle('opened'); } }
    },
    {
      label: 'dashboard-notifications-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-dashboard-notifications-sidebar-close'); },
      apply: function () { var s = $('.botiga-dashboard-notifications-sidebar'); if (s) s.classList.remove('opened', 'closing'); }
    },
    // ─ Customizer: General / Style tabs ──────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/customizer-scripts.js:359-403 @verified 2026-10-03 @product botiga
    {
      label: 'customizer-tab',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-control-botiga-tab-control .control-tab'); },
      apply: function (el) {
        var tab = up(el, '.control-tab');
        var list = function (t) { try { return JSON.parse(t.getAttribute('data-connected') || '[]'); } catch (e) { return []; } };
        var mark = function (sels, hide) {
          sels.forEach(function (s, i) {
            $$(s).forEach(function (c) {
              if (i === 0) c.classList.add('botiga-tab-control-item-first');
              if (i === sels.length - 1) c.classList.add('botiga-tab-control-item-last');
              c.classList.toggle('botiga-hide-control', hide);
              if (!hide) unbake(c);
            });
          });
        };
        tab.classList.add('active');
        $$('.control-tab', tab.parentNode).forEach(function (t) { if (t !== tab) { t.classList.remove('active'); mark(list(t), true); } });
        mark(list(tab), false);
      },
      state: function (el) { return { key: 'customizer.tab', value: up(el, '.control-tab').textContent.trim() }; }
    },
    // ─ Customizer: section back button ───────────────────────────────────
    // @since 2026-10-03 @source wp-admin/js/customize-controls.js (core: back returns to the panel list) @verified 2026-10-03 @product botiga
    {
      label: 'customizer-back',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-section-back, .customize-panel-back'); },
      apply: function () { R.goto('admin-customizer-home'); }
    },
    // ─ Customizer: preview device buttons + Hide Controls ────────────────
    // @since 2026-10-03 @source wp-admin/js/customize-controls.js (core previewedDevice → .wp-full-overlay preview-<device>) @verified 2026-10-03 @product botiga
    {
      label: 'customizer-device',
      event: 'click',
      match: function (el) { return !!up(el, '.devices button[data-device]'); },
      apply: function (el) { setDevice(up(el, 'button[data-device]').getAttribute('data-device')); },
      state: function (el) { return { key: 'customizer.device', value: up(el, 'button[data-device]').getAttribute('data-device') }; }
    },
    // A control title focuses its field, as a <label for> does live (Botiga's titles often have no for=).
    {
      label: 'customizer-control-title',
      event: 'click',
      match: function (el) { var l = up(el, '#customize-controls label.customize-control-title, #customize-controls .customize-control-title'); return !!l && !l.getAttribute('for'); },
      apply: function (el) {
        var c = up(el, '.customize-control'); if (!c) return;
        var f = c.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea') || c.querySelector('input[type=radio]:checked, input[type=checkbox]');
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
      }
    },
    {
      label: 'customizer-collapse',
      event: 'click',
      match: function (el) { return !!up(el, '.collapse-sidebar'); },
      apply: function () {
        var o = $('.wp-full-overlay'); if (!o) return;
        var exp = o.classList.contains('expanded');
        o.classList.toggle('expanded', !exp); o.classList.toggle('collapsed', exp);
        var b = $('.collapse-sidebar'); if (b) b.setAttribute('aria-expanded', exp ? 'false' : 'true');
      }
    },
    // ─ Customizer: Pickr colour popover ──────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/customizer-scripts.js:1460-1560 @verified 2026-10-03 @product botiga
    // The popover body is the real Pickr DOM parked per setting (park-pickr). Clicking a swatch sets the
    // picker colour, as pickr.on('change') does (the setting itself is never saved: no Publish).
    {
      label: 'customizer-color-open',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-color-control .botiga-color-picker'); },
      apply: function (el) {
        var p = up(el, '.botiga-color-picker');
        var open = $('.botiga-pcr-app.visible[data-snap-for]');
        if (open) { var same = open.__for === p; open.remove(); if (same) return; }
        var inp = up(p, '.botiga-color-control').querySelector('.botiga-color-input');
        var key = inp && inp.getAttribute('data-customize-setting-link');
        var f = frag('pickr-' + key); if (!f) { R.miss('pickr-' + key, 'colour popover not parked'); return; }
        var app = f.firstElementChild; document.body.appendChild(f);
        app.setAttribute('data-snap-for', key); app.__for = p;
        var r = p.getBoundingClientRect();
        app.style.position = 'fixed'; app.style.zIndex = '600000';
        app.style.left = Math.max(8, r.right - app.offsetWidth) + 'px';
        app.style.top = (r.bottom + 6) + 'px';
        app.classList.add('visible');
      }
    },
    {
      label: 'customizer-color-swatch',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-pcr-app[data-snap-for] .pcr-swatches button, .botiga-pcr-app[data-snap-for] .pcr-clear'); },
      apply: function (el) {
        var app = up(el, '.botiga-pcr-app'), p = app.__for; if (!p) return;
        var b = up(el, 'button');
        var col = b.classList.contains('pcr-clear') ? (p.getAttribute('data-default-color') || '') : getComputedStyle(b).getPropertyValue('--pcr-color').trim();
        if (!col) return;
        p.style.backgroundColor = col;
        var inp = up(p, '.botiga-color-control').querySelector('.botiga-color-input'); if (inp) { inp.value = col; inp.dispatchEvent(new Event('change', { bubbles: true })); } // the preview bridge listens for change
        var res = app.querySelector('.pcr-result'); if (res) res.value = col;
        var cur = app.querySelector('.pcr-current-color'); if (cur) cur.style.setProperty('--pcr-color', col);
      },
      state: function (el) { var a = up(el, '.botiga-pcr-app'); return { key: 'customizer.color.' + a.getAttribute('data-snap-for'), value: (a.querySelector('.pcr-result') || {}).value }; }
    },
    {
      label: 'customizer-color-close',
      event: 'click',
      match: function (el) { return !!$('.botiga-pcr-app.visible[data-snap-for]') && !up(el, '.botiga-pcr-app, .botiga-color-picker'); },
      apply: function () { $$('.botiga-pcr-app.visible[data-snap-for]').forEach(function (a) { a.remove(); }); },
      order: 'last'
    },

    // ─ Header search ─────────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/custom.js:650-697 @verified 2026-10-03 @product botiga
    {
      label: 'header-search-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.header-search') && !up(el, '.header-search-form'); },
      apply: function (el) {
        var h = up(el, '.header-search'), row = up(h, '.bhfb-desktop, .bhfb-mobile') || document;
        var form = $('.header-search-form', row) || $('.header-search-form'), ov = $('.search-overlay');
        [form, ov].forEach(function (x) { if (x) { unbake(x); x.classList.toggle('active'); } });
        document.body.classList.toggle('header-search-form-active');
        $$('.icon-search, .icon-cancel', h).forEach(function (i) { i.classList.toggle('active'); });
        var f = form && form.querySelector('.search-field'); if (f && form.classList.contains('active')) f.focus();
      }
    },
    {
      label: 'search-overlay-close',
      event: 'click',
      match: function (el) { return !!up(el, '.search-overlay.active'); },
      apply: function () {
        $$('.header-search-form.active, .search-overlay.active').forEach(function (x) { x.classList.remove('active'); });
        document.body.classList.remove('header-search-form-active');
        $$('.header-search .icon-search').forEach(function (i) { i.classList.add('active'); });
        $$('.header-search .icon-cancel').forEach(function (i) { i.classList.remove('active'); });
      }
    },
    // ─ Quick view ────────────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/botiga-quick-view.js:28-107 @verified 2026-10-03 @product botiga
    // Body = the parked botiga_quick_view_content answer for that product (qv-<id>).
    {
      label: 'quick-view-open',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-quick-view[data-product-id]'); },
      apply: function (el) {
        var id = up(el, '.botiga-quick-view').getAttribute('data-product-id');
        var pop = $('.botiga-quick-view-popup'), box = pop && $('.botiga-quick-view-popup-content-ajax', pop);
        var f = frag('qv-' + id); if (!pop || !box) return;
        if (!f) { R.miss('quick-view ' + id, 'quick view body not parked'); return; }
        unbake(pop); box.innerHTML = ''; box.appendChild(f); unbake(box);
        pop.classList.add('opened'); pop.classList.remove('loading');
      },
      state: function (el) { return { key: 'quickview', value: up(el, '.botiga-quick-view').getAttribute('data-product-id') }; }
    },
    {
      label: 'quick-view-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-quick-view-popup.opened') && (!!up(el, '.botiga-quick-view-popup-close-button') || !up(el, '.botiga-quick-view-popup-content-ajax')); },
      apply: function () { var p = $('.botiga-quick-view-popup'); if (p) p.classList.remove('opened'); }
    },
    // ─ Load more ─────────────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga-pro/assets/js/botiga-pagination.js:79-150 @verified 2026-10-03 @product botiga
    {
      label: 'shop-load-more',
      event: 'click',
      match: function (el) { return !!up(el, 'a.botiga-pagination-button'); },
      apply: function (el) {
        var b = up(el, 'a.botiga-pagination-button'), wrap = $('ul.products') || $('.site-main .posts-archive > .row'); if (!wrap) return;
        var cur = +(b.getAttribute('data-current-page') || 1), total = +(b.getAttribute('data-total-pages') || 1);
        if (cur >= total) return;
        var f = frag('more-' + (cur + 1)); if (!f) { R.miss('load more ' + (cur + 1), 'page not parked'); return; }
        var items = [].slice.call(f.children);
        items.forEach(function (li, i) { li.classList.add('botiga-animated', 'botigaFadeInShort', 'botiga-anim-duration-300ms', 'botiga-anim-fowards'); li.style.animationDelay = (i * 200) + 'ms'; wrap.appendChild(li); });
        b.setAttribute('data-current-page', String(cur + 1));
        if (cur + 1 >= total) { var n = up(b, '.botiga-pagination-wrapper, nav') || b; n.style.setProperty('display', 'none', 'important'); }
      }
    },
    // ─ Wishlist heart ────────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga-pro/assets/js/botiga-wishlist.js:17-77 @verified 2026-10-03 @product botiga
    // Add → .active + header count; a second click on an active heart opens the wishlist page (nav).
    {
      label: 'wishlist-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-wishlist-button'); },
      apply: function (el) {
        var b = up(el, '.botiga-wishlist-button');
        if (b.classList.contains('active')) { var href = b.getAttribute('data-wishlist-link'), s = href && R.resolveHref(href); if (s) R.goto(s); else R.miss(href, 'wishlist page not captured yet'); return; }
        b.classList.add('active');
        var t = b.querySelector('.botiga-wishlist-text'); if (t && t.getAttribute('data-wishlist-view-text') && !up(b, 'li.product')) t.innerHTML = t.getAttribute('data-wishlist-view-text');
        $$('.header-wishlist-icon .count-number').forEach(function (c) { c.textContent = String((+c.textContent || 0) + 1); });
      },
      state: function (el) { return { key: 'wishlist.add', value: up(el, '.botiga-wishlist-button').getAttribute('data-product-id') }; }
    },
    // ─ Quantity +/- ──────────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/custom.js:1202-1256 @verified 2026-10-03 @product botiga
    // Cart-page and mini-cart quantities only change the input (Update cart enables, as Woo does); no AJAX.
    {
      label: 'qty-button',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-quantity-plus, .botiga-quantity-minus'); },
      apply: function (el) {
        var b = up(el, '.botiga-quantity-plus, .botiga-quantity-minus');
        var q = (up(b, '.quantity') || b.parentNode).querySelector('input.qty'); if (!q) return;
        var step = parseFloat(q.getAttribute('step')) || 1, min = parseFloat(q.getAttribute('min')), max = parseFloat(q.getAttribute('max'));
        var v = (parseFloat(q.value) || 0) + (b.classList.contains('botiga-quantity-plus') ? step : -step);
        if (!isNaN(min) && v < min) v = min; if (!isNaN(max) && max > 0 && v > max) v = max; if (v < 0) v = 0;
        q.value = String(v); q.setAttribute('value', String(v));
        q.dispatchEvent(new Event('change', { bubbles: true }));
        var u = $('button[name="update_cart"]'); if (u && up(q, '.woocommerce-cart-form')) { u.disabled = false; u.removeAttribute('disabled'); }
      },
      state: function (el) { var q = (up(el, '.quantity') || el.parentNode).querySelector('input.qty'); return { key: 'qty', value: q && q.value }; }
    },
    // ─ Variation swatches ────────────────────────────────────────────────
    // @since 2026-10-03 @source botiga-pro/assets/js/botiga-product-swatch.js:50-136; woocommerce/assets/js/frontend/add-to-cart-variation.js (found_variation) @verified 2026-10-03 @product botiga
    // Data: the form's own data-product_variations (server-rendered). Image swap reuses an <img> already in
    // the snapshot with the same file name (the JSON keeps live URLs).
    {
      label: 'variation-swatch',
      event: 'click',
      match: function (el) { var i = up(el, '.botiga-variation-item'); return !!i && !i.classList.contains('disabled') && !!up(i, 'form.variations_form'); },
      apply: function (el) {
        var item = up(el, '.botiga-variation-item'), form = up(item, 'form.variations_form'), w = up(item, '.botiga-variations-wrapper');
        var sel = w.querySelector('select'), val = item.getAttribute('value');
        var on = !item.classList.contains('active');
        $$('.botiga-variation-item', w).forEach(function (x) { x.classList.remove('active'); });
        if (on) item.classList.add('active');
        if (sel) { sel.value = on ? val : ''; $$('option', sel).forEach(function (o) { if (o.value === sel.value) o.setAttribute('selected', 'selected'); else o.removeAttribute('selected'); }); }
        syncVariation(form);
      },
      state: function (el) { var i = up(el, '.botiga-variation-item'); return { key: 'variation.' + ((up(i, '.botiga-variations-wrapper').querySelector('select') || {}).name || ''), value: i.getAttribute('value') }; }
    },
    {
      label: 'variation-reset',
      event: 'click',
      match: function (el) { return !!up(el, 'form.variations_form .reset_variations'); },
      apply: function (el) {
        var form = up(el, 'form.variations_form');
        $$('.botiga-variation-item.active', form).forEach(function (x) { x.classList.remove('active'); });
        $$('select', form).forEach(function (s) { s.value = ''; });
        syncVariation(form);
      }
    },
    // ─ Product tabs (Woo) and Botiga accordion tabs ──────────────────────
    // @since 2026-10-03 @source woocommerce/assets/js/frontend/single-product.js (wc-tabs); botiga/assets/js/custom.js:1507-1575 (botiga.collapse) @verified 2026-10-03 @product botiga
    {
      label: 'product-tab',
      event: 'click',
      match: function (el) { return !!up(el, '.wc-tabs li a'); },
      apply: function (el) {
        var a = up(el, 'a'), ul = up(a, '.wc-tabs'), wrap = up(ul, '.woocommerce-tabs');
        $$('li', ul).forEach(function (l) { l.classList.remove('active'); });
        up(a, 'li').classList.add('active');
        $$('.wc-tab, .woocommerce-Tabs-panel', wrap).forEach(function (p) { p.style.display = 'none'; });
        var p = $(a.getAttribute('href'), wrap); if (p) { unbake(p); p.style.display = ''; }
      }
    },
    {
      label: 'product-accordion',
      event: 'click',
      match: function (el) { return !!up(el, '[data-botiga-collapse]'); },
      apply: function (el) {
        var t = up(el, '[data-botiga-collapse]'), cfg = t.getAttribute('data-botiga-collapse') || '';
        var m = cfg.match(/'id':\s*'([^']+)'/); var body = m && document.getElementById(m[1]); if (!body) return;
        var open = !t.classList.contains('active');
        if (/oneAtTime':\s*true/.test(cfg)) {
          var root = up(t, '.botiga-accordion') || document;
          $$('[data-botiga-collapse].active', root).forEach(function (o) { if (o !== t) { o.classList.remove('active'); var mm = (o.getAttribute('data-botiga-collapse') || '').match(/'id':\s*'([^']+)'/); var b = mm && document.getElementById(mm[1]); if (b) { b.classList.remove('active'); R.slideUp(b, 300); } } });
        }
        t.classList.toggle('active', open); body.classList.toggle('active', open); unbake(body);
        if (open) R.slideDown(body, 300); else R.slideUp(body, 300);
      }
    },
    // ─ Advanced reviews modal ────────────────────────────────────────────
    // @since 2026-10-03 @source botiga-pro/assets/js/botiga-reviews-advanced.js:19-46 @verified 2026-10-03 @product botiga
    {
      label: 'review-modal-open',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-adv-review-write-button, .botiga-adv-reviews-write-button'); },
      apply: function () { var m = $('.botiga-adv-reviews-modal'); if (m) { unbake(m); m.classList.add('show'); } }
    },
    {
      label: 'review-modal-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-adv-reviews-modal.show') && (!!up(el, '.botiga-adv-reviews-modal-close') || !up(el, '.botiga-adv-reviews-modal-content')); },
      apply: function () { var m = $('.botiga-adv-reviews-modal'); if (m) m.classList.remove('show'); }
    },
    // ─ Cart: shipping calculator ─────────────────────────────────────────
    // @since 2026-10-03 @source woocommerce/assets/js/frontend/cart.js (toggle_shipping) @verified 2026-10-03 @product botiga
    {
      label: 'cart-shipping-calculator',
      event: 'click',
      match: function (el) { return !!up(el, '.shipping-calculator-button'); },
      apply: function (el) {
        var b = up(el, '.shipping-calculator-button'), f = $('.shipping-calculator-form'); if (!f) return;
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open ? 'true' : 'false'); unbake(f);
        if (open) R.slideDown(f, 400); else R.slideUp(f, 400);
      }
    },
    // ─ Cart / checkout: shipping rate → totals (live posts update_shipping_method and re-renders) ─
    // @since 2026-10-05 @source woocommerce/assets/js/frontend/cart.js + checkout.js (update_shipping_method / update_checkout) @verified 2026-10-05 @product botiga
    {
      label: 'shipping-method-totals',
      event: 'change',
      match: function (el) { return !!(el.matches && el.matches('input.shipping_method')); },
      apply: function (el) {
        var t = up(el, 'table') || document, num = function (n) { var a = n && n.querySelector('.woocommerce-Price-amount'); return a ? parseFloat(a.textContent.replace(/[^0-9.\-]/g, '')) || 0 : 0; };
        var sub = num($('.cart-subtotal td', t) || $('.cart-subtotal', t)), off = 0;
        $$('.cart-discount td', t).forEach(function (d) { off += Math.abs(num(d)); });
        var lab = el.id ? t.querySelector('label[for="' + el.id + '"]') : null, ship = num(lab);
        var tot = $('.order-total .woocommerce-Price-amount bdi', t); if (!tot) return;
        var cur = (tot.querySelector('.woocommerce-Price-currencySymbol') || {}).outerHTML || '$';
        tot.innerHTML = cur + (sub - off + ship).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
    },
    // ─ Checkout: payment boxes, ship elsewhere, coupon / login toggles ───
    // @since 2026-10-03 @source woocommerce/assets/js/frontend/checkout.js (payment_method_selected, ship_to_different_address, show_coupon_form, show_login_form) @verified 2026-10-03 @product botiga
    {
      label: 'checkout-payment-method',
      event: 'change',
      match: function (el) { return el.name === 'payment_method' && !!up(el, '.wc_payment_methods'); },
      apply: function (el) {
        $$('.wc_payment_methods .payment_box').forEach(function (b) {
          var on = b.classList.contains('payment_method_' + el.value);
          if (on) { unbake(b); R.slideDown(b, 250); } else if (b.style.display !== 'none') R.slideUp(b, 250);
        });
      },
      state: function (el) { return { key: 'checkout.payment', value: el.value }; }
    },
    {
      label: 'checkout-ship-elsewhere',
      event: 'change',
      match: function (el) { return el.id === 'ship-to-different-address-checkbox'; },
      apply: function (el) { var s = $('.shipping_address'); if (!s) return; unbake(s); if (el.checked) R.slideDown(s, 300); else R.slideUp(s, 300); }
    },
    {
      label: 'checkout-create-account',
      event: 'change',
      match: function (el) { return el.id === 'createaccount'; },
      apply: function (el) { var s = $('div.create-account'); if (!s) return; unbake(s); if (el.checked) R.slideDown(s, 300); else R.slideUp(s, 300); }
    },
    {
      label: 'checkout-coupon-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.showcoupon'); },
      apply: function () { var f = $('form.checkout_coupon'); if (f) { unbake(f); R.slideToggle(f, 400); } }
    },
    {
      label: 'checkout-login-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.showlogin'); },
      apply: function () { var f = $('form.woocommerce-form-login'); if (f) { unbake(f); R.slideToggle(f, 400); } }
    },
    // ─ Dashboard / Customizer links into Customizer sections ─────────────
    // @since 2026-10-03 @source botiga/inc/dashboard/html-home.php (customize links, target=_blank); wp-admin/js/customize-controls.js (accordion-trigger expands a panel/section) @verified 2026-10-03 @product botiga
    {
      label: 'customize-section-link',
      event: 'click',
      match: function (el) { return !!up(el, 'a.botiga-dashboard-customize-link[href*="customize.php"], #customize-theme-controls li.accordion-section > h3 > button.accordion-trigger'); },
      apply: function (el) {
        var a = up(el, 'a[href]'), href;
        if (a) href = decodeURIComponent(a.getAttribute('href').replace(/^https?:\/\/[^/]+\/wp-admin\//, ''));
        else { var li = up(el, 'li.accordion-section'), id = li.id.replace(/^accordion-(section|panel)-/, ''); href = 'customize.php?autofocus[' + (li.id.indexOf('accordion-panel-') === 0 ? 'panel' : 'section') + ']=' + id; }
        // Panels whose expanded view is captured under another key (builder screens, preset-carrying captures). 2026-10-06
        var ALIAS = { 'autofocus[panel]=botiga_panel_header': 'admin-customize-header-builder', 'autofocus[panel]=botiga_panel_footer': 'admin-customize-footer-builder', 'autofocus[panel]=woocommerce': 'admin-customize-woo-general', 'autofocus[section]=shop_single_recently_viewed_products_section': 'admin-customize-single-recently-viewed', 'autofocus[section]=botiga_login_register_popup': 'admin-customize-hb-login-register' };
        var alias = ALIAS[href.replace(/^customize\.php\?/, '')];
        var slug = alias || R.resolveHref(href); if (slug) R.goto(slug); else R.miss(href, 'Customizer screen not captured yet');
      }
    },
    {
      label: 'customizer-help-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-help-toggle'); },
      apply: function (el) {
        var b = up(el, '.customize-help-toggle'), d = up(b, '.customize-panel-description, .panel-meta, .customize-info'); d = d && d.querySelector('.customize-panel-description, .description');
        var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', open ? 'true' : 'false');
        var info = up(b, '.customize-info'); if (info) info.classList.toggle('open', open);
        if (d) { unbake(d); if (open) R.slideDown(d, 150); else R.slideUp(d, 150); }
      }
    },
    // ─ Customizer device sync (footer devices, Botiga responsive controls, HFB device links) ─
    // @since 2026-10-03 @source botiga/assets/js/customizer-scripts.js:203-256; botiga/assets/js/admin/botiga-bhfb.js:199-213 @verified 2026-10-03 @product botiga
    {
      label: 'customizer-responsive-device',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-devices-preview button, .botiga-bhfb-devices .botiga-bhfb-device-link'); },
      apply: function (el) {
        var b = up(el, '.botiga-devices-preview button, .botiga-bhfb-device-link');
        var d = b.getAttribute('data-device') || (b.classList.contains('preview-tablet') ? 'tablet' : b.classList.contains('preview-mobile') ? 'mobile' : 'desktop');
        setDevice(d);
      }
    },
    // ─ Customizer dimensions: link values ────────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/customizer-scripts.js:1584,1637-1645 @verified 2026-10-03 @product botiga
    {
      label: 'customizer-dimensions-link',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-dimensions-link-btn'); },
      apply: function (el) { var w = up(el, '.botiga-dimensions-link-values'); if (w) w.classList.toggle('linked'); }
    },
    // ─ Multi-step checkout (Botiga Pro layout 3) ─────────────────────────
    // @since 2026-10-03 @source botiga-pro/assets/js/botiga-multi-step-checkout.js:138-200,284-305 @verified 2026-10-03 @product botiga
    // Validation is the live form's; the snapshot moves between the three steps as the tab nav allows.
    {
      label: 'checkout-step',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-mstepc-tabs-nav-item > a, a.botiga-mstepc-next, a.botiga-mstepc-prev'); },
      apply: function (el) {
        var a = up(el, 'a'), step = a.getAttribute('data-step') || a.getAttribute('data-to');
        if (!step) { var cur = $('.botiga-mstepc-tabs-nav-item.current-step'); var sib = cur && (a.classList.contains('botiga-mstepc-next') ? cur.nextElementSibling : cur.previousElementSibling); step = sib && sib.querySelector('a').getAttribute('data-step'); }
        var tab = step && $('.botiga-mstepc-tabs-nav-item > a[data-step="' + step + '"]'); if (!tab) return;
        mstepShow(tab);
      },
      state: function (el) { var a = up(el, 'a'); return { key: 'checkout.step', value: a.getAttribute('data-step') || a.getAttribute('data-to') || a.className }; }
    },
    // ─ Reviews sort select ───────────────────────────────────────────────
    // @since 2026-10-03 @source botiga/template-parts/single-product/content-reviews-advanced.php:131-139 (onchange submits ?orderby=) @verified 2026-10-03 @product botiga
    {
      label: 'reviews-orderby',
      event: 'change',
      match: function (el) { return el.id === 'botiga-reviews-orderby' || (el.classList && el.classList.contains('botiga-reviews-orderby')); },
      apply: function (el) {
        var href = location.pathname.replace(/.*\/snapshots\/[^/]+\/index\.html$/, '') + '?orderby=' + el.value;
        var base = (document.querySelector('link[rel="canonical"]') || {}).href || '';
        var key = (base ? base.replace(/^https?:\/\/[^/]+/, '') : '') + '?orderby=' + el.value;
        var slug = R.resolveHref(key) || R.resolveHref(href); if (slug) R.goto(slug); else R.miss(key, 'sorted reviews not captured yet');
      }
    },
    // ─ Product gallery lightbox (PhotoSwipe) ─────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/botiga-gallery.js:22-108; woocommerce/assets/js/frontend/single-product.js (openPhotoswipe, index = clicked image) @verified 2026-10-03 @product botiga
    // The open lightbox is its own snapshot (<product>--lightbox) whose frozen .pswp holds every gallery image.
    {
      label: 'gallery-lightbox-open',
      event: 'click',
      match: function (el) { return !!up(el, '.woocommerce-product-gallery__image a, .woocommerce-product-gallery__trigger') && !$('.pswp--open'); },
      apply: function (el) {
        var a = up(el, '.woocommerce-product-gallery__image a');
        var idx = a ? $$('.woocommerce-product-gallery__image a').indexOf(a) : 0;
        var target = LIGHTBOX[R.currentSlug()];
        if (target) R.goto(target, { params: { index: Math.max(0, idx) } }); else R.miss(R.currentSlug() + '--lightbox', 'lightbox state not captured for this product');
      }
    },
    {
      label: 'lightbox-step',
      event: 'click',
      match: function (el) { return !!up(el, '.pswp--open .pswp__button--arrow--right, .pswp--open .pswp__button--arrow--left'); },
      apply: function (el) { pswpShow(pswp().i + (up(el, '.pswp__button--arrow--right') ? 1 : -1)); },
      state: function () { return { key: 'lightbox.index', value: pswp().i }; }
    },
    {
      label: 'lightbox-key',
      event: 'keydown',
      match: function (el) { return !!$('.pswp--open'); },
      apply: function () {
        var k = (window.event && window.event.key) || '';
        if (k === 'ArrowRight') pswpShow(pswp().i + 1);
        else if (k === 'ArrowLeft') pswpShow(pswp().i - 1);
        else if (k === 'Escape') pswpClose();
      }
    },
    {
      label: 'lightbox-zoom',
      event: 'click',
      match: function (el) { return !!up(el, '.pswp--open .pswp__button--zoom') || (!!up(el, '.pswp--open .pswp__item img.pswp__img') && !up(el, '.pswp__button')); },
      apply: function () {
        var p = $('.pswp'), on = !p.classList.contains('pswp--zoomed-in');
        p.classList.toggle('pswp--zoomed-in', on);
        var w = $('.pswp__item[data-snap-center] .pswp__zoom-wrap') || $$('.pswp__item .pswp__zoom-wrap')[1];
        if (w) { if (!w.hasAttribute('data-snap-t')) w.setAttribute('data-snap-t', w.style.transform); var base = w.getAttribute('data-snap-t').replace(/scale\([^)]*\)/, ''); w.style.transition = 'transform 333ms cubic-bezier(.4,0,.22,1)'; w.style.transform = on ? base.replace(/translate3d\(([-\d.]+)px, ([-\d.]+)px/, function (m, x, y) { return 'translate3d(' + (x - 160) + 'px, ' + (y - 200) + 'px'; }) + ' scale(1.5)' : w.getAttribute('data-snap-t'); }
      }
    },
    {
      label: 'lightbox-fullscreen',
      event: 'click',
      match: function (el) { return !!up(el, '.pswp--open .pswp__button--fs'); },
      apply: function () {
        var p = $('.pswp'), on = !p.classList.contains('pswp--fs'); p.classList.toggle('pswp--fs', on);
        try { if (on && p.requestFullscreen) p.requestFullscreen(); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      }
    },
    {
      label: 'lightbox-close',
      event: 'click',
      match: function (el) { return !!up(el, '.pswp--open .pswp__button--close') || (!!up(el, '.pswp--open') && !!up(el, '.pswp__bg, .pswp__scroll-wrap') && !up(el, '.pswp__img, .pswp__button, .pswp__top-bar, .pswp__caption')); },
      apply: function () { pswpClose(); }
    },
    // ─ Variation gallery: Add Video From URL popup ───────────────────────
    // @since 2026-10-05 @source botiga-pro/assets/js/admin/botiga-product-variation-gallery.js:95-160 (popup opened class; close; Add Video appends to the gallery) @verified 2026-10-05 @product botiga
    // Live markup leaves the popup div unclosed, so the footer dialogs nest inside it; closing only hides the popup box.
    {
      label: 'video-url-popup',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-video-from-url-popup-close, .botiga-video-from-url-popup-add'); },
      apply: function (el, evt) {
        stop(evt); var p = $('.botiga-video-from-url-popup');
        if (up(el, '.botiga-video-from-url-popup-add')) { var u = $('#botiga-video-from-url-popup-url'); if (!u || !u.value.trim()) return say('enter a video URL first'); live('add the video to the variation gallery'); }
        if (p) p.classList.remove('opened');
      }
    },
    // ─ Controls that only work on the live site ──────────────────────────
    // @since 2026-10-03 @source products/botiga/inventory/interactions.md §A, §C, §H (⚠ rows) @verified 2026-10-03 @product botiga
    // Each saves, installs, uploads or leaves the site; the snapshot logs it and does nothing.
    {
      label: 'live-only',
      event: 'click',
      match: function (el) { return !!up(el, '.upload_image_button, .remove_image_button, .botiga-dashboard-module-activation, .botiga-dashboard-module-activation-all, .botiga-dashboard-plugin-ajax-button, .botiga-dashboard-option-switcher, #customize-controls .upload-button, #customize-controls .remove-button, #customize-controls .change-theme, #customize-save-button, a[href^="tel:"], a[href^="mailto:"], .bt-template-card__action--delete, .btsf-filter-actions .botiga-dashboard-link, #botiga-shop-filters-settings .button-primary, .bt-shop-filter-preset-settings-form ~ * .button-primary, .mce-btn, .mce-widget.mce-btn button, .insert-media, .tagcloud-link, #publish, #save-post, #post-preview, .submitdelete, #menu-to-edit .submitdelete, .item-delete, #save_menu_footer, #save_menu_header'); },
      apply: function (el) { var a = up(el, 'a, button'); console.info('[snap] live only — would save or leave the site: ' + ((a && (a.getAttribute('href') || a.textContent.trim())) || '').slice(0, 80)); }
    },
    {
      label: 'customizer-style-guide',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-style-guide-toggle-button'); },
      apply: function () { R.miss('admin-customize--style-guide', 'style guide state not captured yet'); }
    },
    // ─ Botiga metabox tabs + size chart table ────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/metabox.js:7-20 (tabs), size chart table add/del row/col (metabox.js, $sizeChart handlers) @verified 2026-10-03 @product botiga
    {
      label: 'botiga-metabox-tab',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-metabox-tab'); },
      apply: function (el) {
        var tab = up(el, '.botiga-metabox-tab'), box = up(tab, '.botiga-metabox');
        var i = $$('.botiga-metabox-tab', tab.parentNode).indexOf(tab);
        $$('.botiga-metabox-tab', tab.parentNode).forEach(function (t) { t.classList.toggle('active', t === tab); });
        $$('.botiga-metabox-content', box).forEach(function (c, k) { c.classList.toggle('active', k === i); if (k === i) unbake(c); });
      },
      state: function (el) { return { key: 'metabox.tab', value: up(el, '.botiga-metabox-tab').textContent.trim() }; }
    },
    {
      label: 'size-chart-table',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-add-row, .botiga-del-row, .botiga-add-col, .botiga-del-col'); },
      apply: function (el) {
        var b = up(el, 'a'), td = up(b, 'td'), tr = up(b, 'tr'), tbody = up(b, 'tbody');
        var clear = function (n) { $$('input', n).forEach(function (i) { i.value = ''; i.setAttribute('value', ''); }); };
        var col = function () { var i = [].indexOf.call(tr.children, td); return $$('tr', tbody).map(function (r) { return r.children[i]; }).filter(Boolean); };
        if (b.classList.contains('botiga-add-row')) { var c = tr.cloneNode(true); clear(c); tr.after(c); }
        else if (b.classList.contains('botiga-del-row')) { if ($$('tr', tbody).length > 2) tr.remove(); else clear(tr); }
        else if (b.classList.contains('botiga-add-col')) { col().forEach(function (cell) { var c = cell.cloneNode(true); clear(c); cell.after(c); }); }
        else { if (tr.children.length > 2) col().forEach(function (cell) { cell.remove(); }); else col().forEach(clear); }
      }
    },
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
    // ─ Menus screen ──────────────────────────────────────────────────────
    // @source wp-admin/js/nav-menu.js (item-edit toggles .menu-item-edit-active + settings), wp-admin/js/accordion.js (Add menu items sections)
    {
      label: 'wp-menu-item-edit',
      event: 'click',
      match: function (el) { return !!up(el, '#menu-to-edit .item-edit, #menu-to-edit .menu-item-settings .item-cancel'); },
      apply: function (el) {
        var li = up(el, 'li.menu-item'), s = li && $('.menu-item-settings', li); if (!s) return;
        var open = !li.classList.contains('menu-item-edit-active');
        li.classList.toggle('menu-item-edit-active', open); li.classList.toggle('menu-item-edit-inactive', !open);
        var b = $('.item-edit', li); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
        unbake(s); if (open) R.slideDown(s, 200); else R.slideUp(s, 200);
      }
    },
    {
      label: 'wp-accordion-section',
      event: 'click',
      match: function (el) { return !!up(el, '#nav-menu-meta .accordion-section-title, #side-sortables .accordion-section-title'); },
      apply: function (el) {
        var sec = up(el, '.accordion-section'), list = up(sec, '.accordion-container') || document;
        var open = !sec.classList.contains('open');
        $$('.accordion-section.open', list).forEach(function (o) { if (o !== sec) { o.classList.remove('open'); var c = $('.accordion-section-content', o); if (c) R.slideUp(c, 150); } });
        sec.classList.toggle('open', open); var c = $('.accordion-section-content', sec); if (c) { unbake(c); if (open) R.slideDown(c, 150); else R.slideUp(c, 150); }
      }
    },
    // ─ Menus screen: Botiga mega menu options popup ──────────────────────
    // @source botiga-pro/inc/modules/mega-menu/class-mega-menu.php (menu item "Mega Menu" button opens #botiga-menu-options-popup)
    {
      label: 'mega-menu-options',
      event: 'click',
      match: function (el) { return !!up(el, '#menu-to-edit .botiga-menu-options > a'); },
      apply: function (el) {
        var li = up(el, 'li.menu-item'); if (!li) return;
        var title = (($('.menu-item-title', li) || {}).textContent || '').trim(), d = (li.className.match(/menu-item-depth-(\d)/) || [])[1];
        // Captured popups: Shop (depth 0), its Living Room column (depth 1), the Lounge chairs link (depth 2).
        var to = d === '0' && title === 'Shop' ? 'admin-nav-menus--mega-menu-depth0' : d === '1' && title === 'Living Room' ? 'admin-nav-menus--mega-menu-depth1' : d === '2' && title === 'Lounge chairs' ? 'admin-nav-menus--mega-menu-depth2' : null;
        if (to && to !== R.currentSlug()) R.goto(to); else if (!to) R.miss('mega menu options for ' + title, 'popup captured for Shop, Living Room and Lounge chairs only');
      }
    },
    {
      label: 'mega-menu-options-close',
      event: 'click',
      match: function (el) { return !!up(el, '#botiga-menu-options-popup.show') && (!!up(el, '.botiga-popup-close, .botiga-menu-options-popup-close, [class*="close"]') || el.id === 'botiga-menu-options-popup'); },
      apply: function () { R.goto('admin-nav-menus'); }
    },
    // ─ Templates Builder cards ───────────────────────────────────────────
    // @source botiga-pro templates-builder v3 (TBJS: card edit → inline title input, conditions → modal, create new page)
    {
      label: 'tb-card-actions',
      event: 'click',
      match: function (el) { return !!up(el, '.bt-template-card__action--edit, .bt-display-conditions, .bt-template-card--create-new, a.components-button.is-primary'); },
      apply: function (el) {
        var to = up(el, '.bt-template-card__action--edit') ? 'admin-botiga-templates-builder--edit-card' : up(el, '.bt-display-conditions') ? 'admin-botiga-templates-builder--conditions-modal' : 'admin-botiga-templates-builder-create-new';
        if (to === R.currentSlug()) return;
        var href = 'admin.php?page=botiga-dashboard&module-page=builder&settings-page=' + (to.indexOf('create-new') > 0 ? 'create-new' : 'all-templates');
        if (to.indexOf('create-new') > 0) { var s = R.resolveHref(href); if (s) return R.goto(s); }
        if (KNOWN.indexOf(to) >= 0) R.goto(to); else R.miss(to, 'state not captured yet');
      }
    },
    // ─ Product Filters editor panels ─────────────────────────────────────
    // @source botiga-pro shop-filters admin (SFJS: components PanelBody toggles; closed panels render no body)
    {
      label: 'filters-panel-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '#wpbody-content .components-panel__body-toggle') && !!$('.bt-shop-filter-preset-settings-form'); },
      apply: function (el) {
        var body = up(el, '.components-panel__body'), open = !body.classList.contains('is-opened');
        var all = $$('#wpbody-content .components-panel__body'), i = all.indexOf(body);
        body.classList.toggle('is-opened', open); var t = up(el, 'button'); t.setAttribute('aria-expanded', open ? 'true' : 'false');
        var kids = [].slice.call(body.children).filter(function (c) { return !c.classList.contains('components-panel__body-title'); });
        if (open && !kids.length) { var f = frag('fp-' + i); if (f) body.appendChild(f); else R.miss('filter panel ' + i, 'panel body not parked'); }
        kids.forEach(function (c) { c.style.display = open ? '' : 'none'; });
      }
    },
    {
      label: 'filters-back-to-presets',
      event: 'click',
      match: function (el) { var a = up(el, 'a.botiga-dashboard-external-link'); return !!a && /Back to presets/.test(a.textContent) && !!$('.bt-shop-filter-preset-settings-form'); },
      apply: function () { R.goto('admin-botiga-product-filters'); }
    },
    {
      label: 'filters-editor-live',
      event: 'click',
      match: function (el) { return !!$('.bt-shop-filter-preset-settings-form') && !!up(el, '#wpbody-content .botiga-dashboard-link-danger, #wpbody-content .btsf-add-new-panel-button'); },
      apply: function (el) { console.info('[snap] live only — would save the filter preset: ' + (up(el, 'button, a').textContent || '').trim()); }
    },
    // ─ Shop filter inputs ───────────────────────────────────────────────
    // @source botiga-pro/assets/js/modules/shop-filters/shop-filters.js:79-190 (change → GET btsf_ajax_loaded, grid swapped)
    // Term links resolve through the nav map; checkboxes / ranges refilter the grid over AJAX live, logged here.
    {
      label: 'shop-filter-input',
      event: 'change',
      match: function (el) { return !!up(el, '.btsf-filter-wrapper, .botiga-shop-filters') && /^(INPUT|SELECT)$/.test(el.tagName); },
      apply: function (el) { console.info('[snap] live only — the grid refilters over AJAX: ' + (el.name || el.className) + '=' + (el.type === 'checkbox' ? el.checked : el.value)); }
    },
    // The term links the server prints (btsf-filter=1&filter_pa_<attr>=<slug>) are rewritten by the plugin's JS into the
    // canonical filter URL (filter_<attr without pa_>=<slug>, shop-filters Frontend/Filter.php:1267) and loaded over AJAX.
    {
      label: 'shop-filter-term-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href*="btsf-filter=1"]'); return !!a; },
      apply: function (el) {
        var a = up(el, 'a'), u; try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
        var q = [];
        u.searchParams.forEach(function (v, k) { if (k === 'btsf-filter') return; q.push((k.indexOf('filter_pa_') === 0 ? 'filter_' + k.slice(10) : k) + '=' + v); });
        var seg = u.pathname.split('/').filter(Boolean), i0 = Math.max(seg.indexOf('shop'), seg.indexOf('product-category'));
        var href = '/' + (i0 >= 0 ? seg.slice(i0) : seg).join('/') + '/' + (q.length ? '?' + q.join('&') : '');
        var slug = R.resolveHref(href); if (slug) R.goto(slug); else R.miss(href, 'filtered view not captured yet');
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
      match: function (el) { return !!(s2 && closest(el, '.select2-search__field')); },
      apply: function (el) { s2Fill(one('ul', s2.drop), s2.select, el.value); }
    },
    {
      label: 'select2-pick',
      event: 'click',
      match: function (el) { return !!(s2 && closest(el, '.select2-results__option--selectable')); },
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
    // ─ Popup close (modal popup, login / register popup) ────────────────
    // @source botiga/assets/js/botiga-popup.js:61-65 (closePopup removes the open class, body scroll back)
    {
      label: 'popup-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-popup-wrapper__close-button') || (!!up(el, '.botiga-popup.show') && !up(el, '.botiga-popup-wrapper__content, .botiga-popup-wrapper')); },
      apply: function (el) { var p = up(el, '.botiga-popup') || $('.botiga-popup.show'); if (p) p.classList.remove('show', 'transition-effect'); document.body.classList.remove('disable-scroll'); }
    },
    // ─ Same-page anchors: table of contents, "(N customer reviews)" ──────
    // @source botiga-pro/assets/js/botiga-single-post-toc.js:32-61 (smooth scroll with the TOC offset); woocommerce single-product.js (review link opens reviews)
    {
      label: 'same-page-anchor',
      event: 'click',
      match: function (el) { var a = up(el, 'a.botiga-single-post-toc__list-link, a.woocommerce-review-link'); return !!a; },
      apply: function (el) {
        var a = up(el, 'a'), id = (a.getAttribute('href') || '').split('#')[1]; var t = id && document.getElementById(id);
        if (!t && a.classList.contains('woocommerce-review-link')) t = $('#reviews');
        if (!t) return;
        var top = t.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: top, behavior: R.motion === 'off' ? 'auto' : 'smooth' });
      }
    },
    // ─ Shopify-style checkout (layout 4) steps ───────────────────────────
    // @source botiga-pro/assets/js/botiga-shopify-checkout.js:125-182 (breadcrumb items, next / prev buttons, .botiga-sc-content-item.active)
    {
      label: 'sc-checkout-step',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-sc-breadcrumb-item, a.botiga-sc-next, a.botiga-sc-prev:not(.botiga-sc-return-cart), .botiga-sc-detail-change'); },
      apply: function (el) {
        var b = up(el, '.botiga-sc-breadcrumb-item, a.botiga-sc-next, a.botiga-sc-prev, .botiga-sc-detail-change'), id;
        if (b.classList.contains('botiga-sc-breadcrumb-item') || b.classList.contains('botiga-sc-detail-change')) id = b.getAttribute('data-content-id');
        else { var cur = up(b, '.botiga-sc-content-item'); var sib = cur && (b.classList.contains('botiga-sc-next') ? cur.nextElementSibling : cur.previousElementSibling); id = sib && sib.getAttribute('data-content-id'); }
        if (!id) return;
        $$('.botiga-sc-breadcrumb-item').forEach(function (i) { i.classList.toggle('active', i.getAttribute('data-content-id') === id); });
        $$('.botiga-sc-content-item').forEach(function (c) { var on = c.getAttribute('data-content-id') === id; c.classList.toggle('active', on); if (on) unbake(c); });
        window.scrollTo(0, 0);
      },
      state: function (el) { return { key: 'checkout.step', value: (up(el, '[data-content-id]') || {}).getAttribute ? up(el, '[data-content-id]').getAttribute('data-content-id') : '' }; }
    },
    // Quick Edit entries copied from products/sydney/snapshots/_shared/interactivity.js (sydney capture worker, 2026-10-03).
    // ─ List tables: Quick Edit (core inline-edit-post.js / inline-edit-tax.js) ─
    // @since 2026-10-03 @source wp-admin/js/inline-edit-post.js (edit(): clone #inline-edit, fill from #inline_<id>, hide the row); wp-admin/js/inline-edit-tax.js (name, slug) @verified 2026-10-03 @product sydney
    {
      label: 'quick-edit-open',
      event: 'click',
      match: function (el) { return !!up(el, '#the-list .editinline'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        $$('#the-list tr.inline-editor').forEach(closeQuickEdit);
        var row = up(el, 'tr'), id = (row.id.match(/(\d+)$/) || [])[1], tpl = $('#inline-edit'), data = document.getElementById('inline_' + id);
        if (!row || !tpl || !data) return;
        var ed = tpl.cloneNode(true); ed.id = 'edit-' + id; ed.classList.add('inline-editor'); ed.style.display = 'table-row'; ed.removeAttribute('data-snap-baked');
        var tax = !!up(row, '#the-list') && /^tag-/.test(row.id);
        var fields = tax ? ['name', 'slug'] : ['post_title', 'post_name', 'post_author', '_status', 'jj', 'mm', 'aa', 'hh', 'mn', 'ss', 'post_password', 'menu_order', 'page_template'];
        fields.forEach(function (f) {
          var src = data.querySelector('.' + f); if (!src) return; var v = src.textContent;
          $$('[name="' + f + '"]', ed).forEach(function (inp) { if (inp.type === 'checkbox' || inp.type === 'radio') inp.checked = inp.value === v; else { inp.value = v; inp.setAttribute('value', v); if (inp.tagName === 'SELECT') $$('option', inp).forEach(function (o) { o.selected = o.value === v; }); } });
        });
        $$('.post_category', data).forEach(function (pc) { var t = pc.id.replace(/_\d+$/, ''), ids = pc.textContent.split(','); $$('ul.' + t + '-checklist input[type=checkbox], ul.cat-checklist input[type=checkbox]', ed).forEach(function (c) { if (up(c, 'ul.' + t + '-checklist') || t === 'category') c.checked = ids.indexOf(c.value) !== -1; }); });
        $$('.tags_input', data).forEach(function (ti) { var t = ti.id.replace(/_\d+$/, ''), ta = ed.querySelector('textarea[data-wp-taxonomy="' + t + '"], textarea[name="tax_input[' + t + ']"]'); if (ta) ta.value = ti.textContent.replace(/,\s*/g, ', '); });
        $$('[data-snap-baked]', ed).forEach(R.clearBaked);
        row.style.display = 'none'; row.after(ed);
        var first = ed.querySelector('input[type=text]'); if (first) first.focus();
      }
    },
    {
      label: 'quick-edit-cancel',
      event: 'click',
      match: function (el) { return !!up(el, '#the-list tr.inline-editor .cancel'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); closeQuickEdit(up(el, 'tr.inline-editor')); }
    },
    {
      label: 'quick-edit-update',
      event: 'click',
      match: function (el) { return !!up(el, '#the-list tr.inline-editor .save'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); console.info('[snap] live only — Quick Edit Update saves the item'); }
    },
    // ─ Starter Sites: quick import buttons ──────────────────────────────
    // @source athemes-starter-sites/v2/assets/js/script.js (atss-import-open-button → atssCheckAndRedirectToWizard: loading class,
    // POST atss_init_wizard_from_legacy (a write, not replayed), redirect to the onboarding wizard)
    {
      label: 'starter-import-open',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-import-open-button'); },
      apply: function (el) {
        var b = up(el, '.atss-import-open-button'); document.body.classList.add('atss-wizard-redirect-loading');
        console.info('[snap] live only — would save the wizard state for ' + b.getAttribute('data-demo-id') + ' / ' + b.getAttribute('data-builder'));
        var href = 'admin.php?page=atss-onboarding-wizard', slug = R.resolveHref(href);
        R.wait(400, function () { document.body.classList.remove('atss-wizard-redirect-loading'); if (slug) R.goto(slug); else R.miss(href, 'wizard not captured yet'); });
      }
    },
    // ─ select2 multiple (linked variation products) ──────────────────────
    // @source woocommerce selectWoo multiple: the dropdown lists the selected options; product search is AJAX (live only)
    {
      label: 'select2-multi-open',
      event: 'click',
      match: function (el) { return !!up(el, '.select2-selection--multiple') && !up(el, '.select2-selection__choice__remove'); },
      apply: function (el) {
        var box = up(el, '.select2-container'), sel = box.previousElementSibling; if (!sel || sel.tagName !== 'SELECT') sel = box.parentElement.querySelector('select');
        if (!sel) return; var old = $('.select2-container--open[data-snap-multi]'); if (old) { old.remove(); box.classList.remove('select2-container--open'); return; }
        var r = box.getBoundingClientRect(), drop = document.createElement('span');
        drop.className = 'select2-container select2-container--default select2-container--open'; drop.setAttribute('data-snap-multi', '');
        drop.style.cssText = 'position:absolute;left:' + (r.left + scrollX) + 'px;top:' + (r.bottom + scrollY) + 'px;z-index:100000';
        drop.innerHTML = '<span class="select2-dropdown select2-dropdown--below" style="width:' + r.width + 'px"><span class="select2-results"><ul class="select2-results__options" role="listbox"></ul></span></span>';
        var ul = drop.querySelector('ul');
        [].forEach.call(sel.options, function (o) { var li = document.createElement('li'); li.className = 'select2-results__option' + (o.selected ? ' select2-results__option--selected' : ''); li.setAttribute('aria-selected', o.selected ? 'true' : 'false'); li.textContent = o.text; ul.appendChild(li); });
        var hint = document.createElement('li'); hint.className = 'select2-results__option select2-results__message'; hint.textContent = 'Type to search more products'; ul.appendChild(hint);
        document.body.appendChild(drop); box.classList.add('select2-container--open');
        var inp = box.querySelector('.select2-search__field'); if (inp) inp.focus();
      }
    },
    {
      label: 'select2-multi-search',
      event: 'input',
      match: function (el) { return !!up(el, '.select2-selection--multiple .select2-search__field'); },
      apply: function (el) { console.info('[snap] live only — product search runs over AJAX: ' + el.value); }
    },
    {
      label: 'select2-multi-remove',
      event: 'click',
      match: function (el) { return !!up(el, '.select2-selection--multiple .select2-selection__choice__remove'); },
      apply: function (el) {
        var li = up(el, '.select2-selection__choice'), box = up(el, '.select2-container'), sel = box.previousElementSibling, txt = (li.getAttribute('title') || li.textContent).replace('×', '').trim();
        if (sel && sel.tagName === 'SELECT') [].forEach.call(sel.options, function (o) { if (o.text.trim() === txt) { o.selected = false; o.removeAttribute('selected'); } });
        li.remove();
      }
    },
    {
      label: 'select2-multi-close',
      event: 'click',
      order: 'last',
      match: function (el) { return !!$('.select2-container--open[data-snap-multi]') && !up(el, '.select2-container'); },
      apply: function () { $$('.select2-container--open[data-snap-multi]').forEach(function (d) { d.remove(); }); $$('.select2-container--open').forEach(function (b) { b.classList.remove('select2-container--open'); }); }
    },
    // Block editor entries copied from the athemes-addons runtime (see the helpers' credit).
    {
      label: 'blk-panel-body',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.components-panel__body-toggle'); },
      apply: function (el, evt) {
        stop(evt); var p = up(el, '.components-panel__body'), open = !p.classList.contains('is-opened');
        p.classList.toggle('is-opened', open); up(el, '.components-panel__body-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
        $$(':scope > *:not(.components-panel__body-title)', p).forEach(function (c) { c.style.display = open ? '' : 'none'; });
      }
    },
    {
      label: 'blk-sidebar-toggle',
      event: 'click',
      match: function (el) { var b = up(el, 'button'); return isBlockEditor && !!b && /^(Settings|Close Settings)$/.test(b.getAttribute('aria-label') || ''); },
      apply: function (el, evt) {
        stop(evt);
        var s = $('.interface-interface-skeleton__sidebar, .interface-complementary-area');
        if (s) { var hide = s.style.display !== 'none'; s.style.display = hide ? 'none' : ''; $$('button[aria-label="Settings"]').forEach(function (b) { b.classList.toggle('is-pressed', !hide); }); }
      }
    },
    {
      label: 'blk-format',
      event: 'click',
      match: function (el) { var b = up(el, '.block-editor-block-toolbar button'); return isBlockEditor && !!b && /^(Bold|Italic)$/.test(b.getAttribute('aria-label') || ''); },
      apply: function (el, evt) { stop(evt); var b = up(el, 'button'); b.classList.toggle('is-pressed'); }
    },
    {
      label: 'blk-meta-boxes',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.edit-post-meta-boxes-main__presenter button, .edit-post-meta-boxes-main button'); },
      apply: function (el, evt) { stop(evt); var m = up(el, '.edit-post-meta-boxes-main'); if (m) m.classList.toggle('is-open'); var l = $('.edit-post-meta-boxes-main__liner', m); if (l) l.style.display = l.style.display === 'none' ? '' : 'none'; }
    },
    {
      label: 'blk-chrome',
      event: 'click',
      // Fallback only: controls another entry handles (panel toggles, Settings / Close Settings, Bold / Italic, sidebar
      // tabs, meta-box pane, notices, inserter) are excluded so they don't also log a miss (QC b7, 2026-10-03).
      match: function (el) {
        var b = up(el, 'button'); if (!isBlockEditor || !b || b.hasAttribute('data-snap-park')) return false;
        if (up(b, '.components-panel__body-title, .editor-sidebar__panel-tabs, .edit-post-sidebar__panel-tabs, .edit-widgets-sidebar__panel-tabs, .edit-post-meta-boxes-main__presenter, .components-notice, .block-editor-inserter__menu, .editor-inserter-sidebar')) return false;
        if (/^(Settings|Close Settings|Bold|Italic)$/.test(b.getAttribute('aria-label') || '')) return false;
        return !!up(el, '.editor-header button, .edit-post-header button, .edit-widgets-header button, .block-editor-block-toolbar button, .interface-complementary-area button, .block-editor-block-breadcrumb button, .edit-post-meta-boxes-main button');
      },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, 'button'), lab = ((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')).trim();
        if (/Inserter|Add block|Toggle block inserter/i.test(lab)) return hop('editor-blocks-inserter', 'the block inserter');
        if (/Save|Publish|Update|Undo|Redo|Move|Drag|Reset/i.test(lab)) return live(lab.split(' ').slice(0, 2).join(' ').toLowerCase() + ' in the block editor');
        if (/Edit with Elementor/i.test(lab)) return live('switch this page to Elementor');
        notCaptured((lab || 'this control') + ' in the block editor');
      }
    },

    // Native selects open the browser's own list in a snapshot too.
    {
      label: 'blk-notice',
      event: 'click',
      match: function (el) { return !!up(el, '.components-notice__dismiss, .components-notice__action'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.components-notice__action')) return live((el.textContent || 'notice action').trim());
        var n = up(el, '.components-notice'); if (n) n.remove();
      }
    },
    {
      label: 'blk-inserter',
      event: 'click',
      match: function (el) { if (up(el, '[data-snap-park]')) return false; return isBlockEditor && (!!up(el, '.block-editor-inserter__menu, .block-editor-tabbed-sidebar, .editor-inserter-sidebar') || (!!up(el, '.editor-document-tools__inserter-toggle.is-pressed') && !!$('.editor-inserter-sidebar'))); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.block-editor-tabbed-sidebar__close-button') || up(el, '.editor-document-tools__inserter-toggle')) { var p = up(el, '.editor-inserter-sidebar, .block-editor-tabbed-sidebar') || $('.editor-inserter-sidebar'); if (p) p.style.display = 'none'; var t = $('.editor-document-tools__inserter-toggle'); if (t) t.classList.remove('is-pressed'); return; }
        var tab = up(el, '.block-editor-tabbed-sidebar__tab');
        if (tab) { if (tab.getAttribute('aria-selected') === 'true') return say('current tab'); return notCaptured((tab.textContent || '').trim() + ' tab of the inserter'); }
        var item = up(el, '.block-editor-block-types-list__item');
        if (item) return live('insert the ' + (item.textContent || 'block').trim() + ' block');
        notCaptured('this inserter control');
      }
    },
    // ─ Theme Builder: display conditions modal, header type ───────────────────
    // @since 2026-10-03 @source lite/assets/js/admin/admin.js (display-conditions modal: toggle, backdrop click closes, add / remove rows, select2:select shows the id picker when the option has data-ajax; header type select posts athemes_addons_header_type) @verified 2026-10-03 @product athemes-addons
    // Settings sidebar Post / Block tabs (core editor). The Block tab's body renders only for a selected block.
    // @since 2026-10-03 @source wp-includes/js/dist/editor (sidebar tabs) @verified 2026-10-03 @product botiga
    {
      label: 'blk-sidebar-tabs',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.editor-sidebar__panel-tabs button[role="tab"], .edit-post-sidebar__panel-tabs button, .edit-widgets-sidebar__panel-tabs button'); },
      apply: function (el, evt) {
        stop(evt); var b = up(el, 'button');
        if (b.getAttribute('aria-selected') === 'true' || b.classList.contains('is-active')) return say('current tab');
        notCaptured((b.textContent || 'this').trim() + ' tab (shows the selected block settings)');
      }
    },
    // ─ Starter Sites onboarding wizard (React) ───────────────────────────
    // @since 2026-10-03 @source athemes-starter-sites/v2/onboarding/build (steps nav, close, starter cards atss-starter-card--selected, Back / Skip / Continue) @verified 2026-10-03 @product botiga
    // Captured steps: 1 Getting Started (wizard-getting-started), 2 Design (wizard-template). Later steps unlock after a pick.
    {
      label: 'wizard-step',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-onboarding-wizard__steps .atss-onboarding-wizard__step'); },
      apply: function (el) {
        var s = up(el, '.atss-onboarding-wizard__step'), i = $$('.atss-onboarding-wizard__steps .atss-onboarding-wizard__step').indexOf(s);
        var to = ['wizard-getting-started', 'wizard-template'][i];
        if (s.classList.contains('is-active')) return say('current step');
        if (s.classList.contains('is-disabled') || !to) return R.miss('wizard step ' + (i + 1), 'unlocks after choosing a starter (later steps not captured)');
        R.goto(to);
      }
    },
    {
      label: 'wizard-close',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-onboarding-wizard__close'); },
      apply: function () { R.goto('admin-botiga-dashboard'); }
    },
    {
      label: 'wizard-starter-card',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-starter-card'); },
      apply: function (el) { var c = up(el, '.atss-starter-card'); $$('.atss-starter-card').forEach(function (x) { x.classList.toggle('atss-starter-card--selected', x === c); x.classList.toggle('is-selected', x === c); }); },
      state: function (el) { return { key: 'wizard.starter', value: (up(el, '.atss-starter-card').querySelector('.atss-starter-card__name') || {}).textContent }; }
    },
    {
      label: 'wizard-footer',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-onboarding-wizard__footer .atss-onboarding-wizard__btn, .atss-onboarding-wizard__step--getting-started button.atss-onboarding-wizard__btn'); },
      apply: function (el) {
        var b = up(el, '.atss-onboarding-wizard__btn'), here = R.currentSlug();
        if (b.classList.contains('atss-onboarding-wizard__btn--back')) return here === 'wizard-template' ? R.goto('wizard-getting-started') : say('first step');
        if (here === 'wizard-getting-started') return R.goto('wizard-template');
        if (b.classList.contains('atss-onboarding-wizard__btn--skip') || !$('.atss-starter-card--selected')) return R.miss('wizard step 3', 'next step not captured');
        live('save the wizard choice and continue (atss wizard state)');
      }
    },
    {
      label: 'wizard-builder-switch',
      event: 'click',
      match: function (el) { return !!up(el, '.atss-search-starters-control__builder-button'); },
      apply: function () { R.miss('builder menu', 'Block Editor / Elementor menu not captured'); }
    },
    // ─ WooCommerce variation rows (product data → Variations) ────────────
    // @source woocommerce/assets/js/admin/meta-boxes-product-variation.js (h3 / .edit_variation toggles .woocommerce_variation open/closed, slides .woocommerce_variable_attributes)
    {
      label: 'wc-variation-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.woocommerce_variation > h3, .woocommerce_variation a.edit_variation') && !up(el, 'select, input, .remove_variation, .delete'); },
      apply: function (el, evt) {
        stop(evt); var v = up(el, '.woocommerce_variation'), body = $('.woocommerce_variable_attributes', v); if (!body) return;
        var open = !v.classList.contains('open');
        v.classList.toggle('open', open); v.classList.toggle('closed', !open); unbake(body);
        if (open) R.slideDown(body, 200); else R.slideUp(body, 200);
      }
    },
    // ─ Customizer style guide (open state) ──────────────────────────────
    // @since 2026-10-03 @source botiga/inc/customizer/style-guide/js/style-guide.js:686-711 (close hides; focusCustomizerTarget: control, else section), :896-910 (nav scrolls to its section) @verified 2026-10-03 @product botiga
    {
      label: 'style-guide-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-style-guide-close'); },
      apply: function () { var g = $('.botiga-style-guide'); if (g) g.style.display = 'none'; }
    },
    {
      label: 'style-guide-nav',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-style-guide-navigation a[href^="#"]'); },
      apply: function (el, evt) { stop(evt); var tg = document.getElementById(up(el, 'a').getAttribute('href').slice(1)); if (tg) tg.scrollIntoView({ behavior: R.motion === 'off' ? 'auto' : 'smooth', block: 'start' }); }
    },
    {
      label: 'style-guide-target',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-style-guide-customizer-link'); },
      apply: function (el, evt) {
        stop(evt); var a = up(el, '.botiga-style-guide-customizer-link');
        // Controls without a section attribute live in the HFB logo component (custom_logo, site_icon).
        var map = { custom_logo: 'botiga_section_hb_component__logo', site_icon: 'botiga_section_hb_component__logo' };
        var sec = a.getAttribute('data-customizer-section') || map[a.getAttribute('data-customizer-control')];
        if (sec && window.wp && wp.customize) wp.customize.section(sec).focus(); else R.miss(a.getAttribute('data-customizer-control') || 'control', 'Customizer section not known');
      }
    },
    // ─ Header / footer builder: component chips, bottom bar Show / Hide ──
    // @source botiga/assets/js/admin/botiga-bhfb.js:195-197 + the chip's data-bhfb-focus-section (focus its section), :900-910 (showHideBuilderTop)
    {
      label: 'bhfb-component-chip',
      event: 'click',
      match: function (el) { return !!up(el, 'a.bhfb-button[data-bhfb-focus-section]') && !up(el, '.bhfb-remove-element'); },
      apply: function (el, evt) { stop(evt); var s = up(el, 'a.bhfb-button').getAttribute('data-bhfb-focus-section'); if (window.wp && wp.customize) wp.customize.section(s).focus(); }
    },
    {
      label: 'bhfb-bottom-display',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-bhfb-bottom-display'); },
      apply: function (el, evt) {
        stop(evt); var b = up(el, '.botiga-bhfb-bottom-display');
        document.body.classList.toggle('bhfb-active-bottom'); b.classList.toggle('show');
        $$('.botiga-bhfb-top').forEach(function (x) { x.classList.toggle('show'); unbake(x); });
        $$('.botiga-bhfb').forEach(function (x) { x.classList.toggle('show-bottom'); });
      }
    },
    // ─ Customizer display conditions modal ──────────────────────────────
    // @since 2026-10-03 @source botiga/assets/js/customizer-scripts.js:1058-1110 (toggle opens the modal; backdrop click closes; add clones the first row; remove deletes it) @verified 2026-10-03 @product botiga
    {
      label: 'dc-modal-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-display-conditions-modal-toggle, .botiga-display-conditions-modal-button'); },
      apply: function (el, evt) {
        stop(evt); var c = up(el, '.botiga-display-conditions-control'), li = up(el, 'li.customize-control'); if (!c || !li) return;
        var m = $('.botiga-display-conditions-modal', c);
        if (!m) { var f = frag('dc-' + li.id.replace('customize-control-', '')); if (!f) return R.miss('display conditions for ' + li.id, 'modal not parked'); c.appendChild(f); m = $('.botiga-display-conditions-modal', c); }
        unbake(m); m.classList.toggle('open');
      }
    },
    {
      label: 'dc-modal-backdrop',
      event: 'click',
      match: function (el) { return !!el && el.classList && el.classList.contains('botiga-display-conditions-modal'); },
      apply: function (el) { el.classList.remove('open'); }
    },
    {
      label: 'dc-modal-rows',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-display-conditions-modal-add, .botiga-display-conditions-modal-remove'); },
      apply: function (el, evt) {
        stop(evt); var m = up(el, '.botiga-display-conditions-modal');
        if (up(el, '.botiga-display-conditions-modal-remove')) { var it = up(el, '.botiga-display-conditions-modal-content-list-item'); if (it) it.remove(); return; }
        var b = up(el, '.botiga-display-conditions-modal-add'), g = b.getAttribute('data-condition-group'), first = $('.botiga-display-conditions-modal-content-list-item', m); if (!first) return;
        var item = first.cloneNode(true); item.classList.remove('hidden');
        $$('.botiga-display-conditions-select2-condition', item).forEach(function (x) { if (x.getAttribute('data-condition-group') !== g) x.remove(); });
        $('.botiga-display-conditions-modal-content-list', m).appendChild(item);
      }
    },
    // ─ Customizer sortable repeater (social links etc.) ──────────────────
    // @source botiga/assets/js/customizer-scripts.js:308-340 (Add new appends botigaAppendRow's row; × deletes a row)
    {
      label: 'sortable-repeater',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-control-sortable-repeater-add, .customize-control-sortable-repeater-delete'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.customize-control-sortable-repeater-delete')) { var row = up(el, '.repeater'); if (row) row.remove(); return; }
        var wrap = up(el, '.customize-control-sortable-repeater-add').parentNode, list = $('.sortable', wrap); if (!list) return;
        var regular = list.classList.contains('regular-field');
        var row = document.createElement('div'); row.className = 'repeater';
        row.innerHTML = '<input type="text" value="" class="repeater-input" placeholder="' + (regular ? '' : 'https://') + '" /><span class="dashicons dashicons-menu"></span><a class="customize-control-sortable-repeater-delete" href="#"><span class="dashicons dashicons-no-alt"></span></a>';
        list.appendChild(row); var i = row.querySelector('input'); if (i) i.focus();
      }
    },
    // ─ Customizer "go to section" links with javascript: hrefs ──────────
    // @source botiga HFB settings panel: <a class="botiga-to-widget-area-link" href="javascript:wp.customize.section('<id>').focus();" data-goto-section="<id>">
    {
      label: 'customize-goto-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[data-goto-section], a[href^="javascript:wp.customize."]'); return !!a; },
      apply: function (el, evt) {
        stop(evt); var a = up(el, 'a'), id = a.getAttribute('data-goto-section'), kind = 'section';
        if (!id) { var m = (a.getAttribute('href') || '').match(/customize\.(section|panel|control)\(\s*'([^']+)'/); if (m) { kind = m[1]; id = m[2]; } }
        var t = id && window.wp && wp.customize && wp.customize[kind] ? wp.customize[kind](id) : null; if (t && t.focus) t.focus(); else R.miss('customize.php?autofocus[' + kind + ']=' + id, 'Customizer ' + kind + ' not captured yet');
      }
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
      match: function (el) { return !!$('[data-snap-parked*="-blk-options-"], [data-snap-parked*="-blk-preview-"], [data-snap-parked*="-blk-command-"]') && !up(el, '[data-snap-parked], [data-snap-park]'); },
      apply: function () { parkedCloseAll(); }
    },
    // WooCommerce first-visit tour (tour-kit, Shipping settings): × dismisses it; later steps render only live (React state).
    {
      label: 'wc-tour-kit',
      event: 'click',
      match: function (el) { return !!up(el, '.woocommerce-tour-kit .woocommerce-tour-kit-step-controls__close-btn, .woocommerce-tour-kit .woocommerce-tour-kit-step-navigation__next-btn, .woocommerce-tour-kit .tour-kit-overlay'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.woocommerce-tour-kit-step-navigation__next-btn')) { notCaptured('the next tour step'); return; }
        var t = up(el, '.woocommerce-tour-kit'); if (t) t.remove();
      }
    },
    // Media Library grid: "Bulk select" enters select mode (wp-includes/js/media-grid.js SelectModeToggleButton: frame.mode-select,
    // button reads Cancel, Delete permanently appears disabled); Cancel leaves it. Deleting stays live-only.
    {
      label: 'media-bulk-select',
      event: 'click',
      match: function (el) { return !!up(el, '.media-toolbar .select-mode-toggle-button'); },
      apply: function (el, evt) {
        stop(evt); var b = up(el, '.select-mode-toggle-button'), fr = up(b, '.media-frame') || $('.media-frame'); if (!fr) return;
        var on = !fr.classList.contains('mode-select'); fr.classList.toggle('mode-select', on); fr.classList.toggle('mode-grid', !on);
        b.textContent = on ? 'Cancel' : 'Bulk select';
        $$('.delete-selected-button', fr).forEach(function (d) { unbake(d); d.classList.toggle('hidden', !on); d.disabled = true; });
      }
    },
    // Customizer widget areas: the block-widgets welcome guide's "Got it" dismisses it (@wordpress/customize-widgets
    // WelcomeGuide → toggles the welcomeGuide preference; the preference write itself is live-only).
    {
      label: 'customize-widgets-welcome-close',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-widgets-welcome-guide > button.components-button.is-primary'); },
      apply: function (el, evt) { stop(evt); var g = up(el, '.customize-widgets-welcome-guide'); if (g) g.remove(); }
    },
    // Custom Sidebars repeater (botiga/assets/js/customizer-scripts.js:1180-1188): Add clones the first (template) row and shows
    // it; × removes a row. Saving the sidebars stays live-only (Publish).
    {
      label: 'custom-sidebar-rows',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-custom-sidebars-control .botiga-custom-sidebar-add, .botiga-custom-sidebars-control .botiga-custom-sidebar-remove'); },
      apply: function (el, evt) {
        stop(evt); var c = up(el, '.botiga-custom-sidebars-control'); if (!c) return;
        if (up(el, '.botiga-custom-sidebar-remove')) { var it = up(el, '.botiga-custom-sidebar-list-item'); if (it) it.remove(); return; }
        var list = $('.botiga-custom-sidebar-list', c), tpl = $('.botiga-custom-sidebar-list-item', c); if (!list || !tpl) return;
        var item = tpl.cloneNode(true); item.classList.remove('hidden'); unbake(item); item.style.display = '';
        $$('input[type=text]', item).forEach(function (i) { i.value = ''; i.removeAttribute('value'); });
        list.appendChild(item); var f = $('input[type=text]', item); if (f) f.focus();
      }
    },
    // Menus panel "Create New Menu" opens the add_menu section (wp-admin/js/customize-nav-menus.js, AddMenuSection).
    {
      label: 'customize-add-menu',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-add-menu-button'); },
      apply: function (el, evt) { stop(evt); if (window.wp && wp.customize && wp.customize.section) wp.customize.section('add_menu').focus(); }
    },
    // WooCommerce › Product Images: custom aspect-ratio inputs show only for "custom" (woocommerce/assets/js/admin/wc-customizer.js).
    {
      label: 'wc-thumbnail-cropping',
      event: 'change',
      match: function (el) { return !!(el.matches && el.matches('input[name="woocommerce_thumbnail_cropping"]')); },
      apply: function (el) { $$('.woocommerce-cropping-control-aspect-ratio').forEach(function (n) { unbake(n); n.style.display = el.value === 'custom' ? '' : 'none'; }); }
    },
    // ─ Site menus: the ▾ arrow expands its sub menu (botiga/assets/js/custom.js:400-420, parent li.expand) ─
    {
      label: 'menu-dropdown-symbol',
      event: 'click',
      match: function (el) { return !!up(el, '.menu-item-has-children > .dropdown-symbol'); },
      apply: function (el, evt) { stop(evt); var li = up(el, '.menu-item-has-children'); if (li) li.classList.toggle('expand'); }
    },
    // ─ index.php by space: the nav map leaves "/" and index.php out (both the site front page and the Dashboard claim it) ─
    // A site-root link (Home, the logo) opens the front page; an admin index.php link opens the Dashboard.
    {
      label: 'index-by-space',
      event: 'click',
      match: function (el) {
        var a = up(el, 'a[href]'); if (!a) return false; var h = a.getAttribute('href') || '';
        if (/^https?:\/\/(fernhillhome\.com|localhost[^/]*)\/?(index\.php)?(\?snap-[^#]*)?(#.*)?$/.test(h) || /^\/(index\.php)?(\?snap-[^#]*)?$/.test(h)) return true;
        return /\/wp-admin\/(index\.php)?$/.test(h) || (/^(\.\/)?index\.php$/.test(h) && !!document.querySelector('#adminmenu'));
      },
      apply: function (el, evt) {
        stop(evt); var h = up(el, 'a[href]').getAttribute('href') || '';
        var admin = /\/wp-admin\//.test(h) || (/^(\.\/)?index\.php$/.test(h) && !!document.querySelector('#adminmenu'));
        R.goto(admin ? 'admin-dashboard' : 'frontend-home');
      }
    },
    // ─ WP list screens: status filters and column sorting ───────────────
    // @since 2026-10-06 @source wp-admin/includes/class-wp-list-table.php (views() .subsubsub, print_column_headers sortable/sorted)
    // A filter with its own captured screen navigates (nav map); one that would reload this same list marks itself current.
    // A sortable column header flips its sort indicator (live reloads the list sorted; the captured rows stay as they are).
    {
      label: 'wp-list-filter',
      event: 'click',
      match: function (el) { var a = up(el, '.wrap ul.subsubsub a[href]'); if (!a) return false; var hit = R.resolve(a.getAttribute('href') || ''); return !hit || hit.slug === (R.currentSlug && R.currentSlug()); },
      apply: function (el, evt) {
        stop(evt); var a = up(el, 'a'), ul = up(a, 'ul.subsubsub');
        $$('a', ul).forEach(function (x) { x.classList.toggle('current', x === a); if (x === a) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
        say('list filtered by ' + (a.textContent || '').replace(/\(\d+\)/, '').trim() + ' (live reloads the list)');
      }
    },
    {
      label: 'wp-list-sort',
      event: 'click',
      match: function (el) { return !!up(el, 'table.wp-list-table thead th.sortable a, table.wp-list-table thead th.sorted a, table.wp-list-table tfoot th.sortable a, table.wp-list-table tfoot th.sorted a'); },
      apply: function (el, evt) {
        stop(evt); var th = up(el, 'th'), table = up(th, 'table'), cls = Array.prototype.find.call(th.classList, function (c) { return /^column-/.test(c); });
        var desc = th.classList.contains('sorted') ? th.classList.contains('asc') : false;
        $$('thead th, tfoot th', table).forEach(function (x) { if (x.classList.contains('sorted')) { x.classList.remove('sorted', 'asc', 'desc'); x.classList.add('sortable', 'desc'); } });
        $$('thead th.' + cls + ', tfoot th.' + cls, table).forEach(function (x) { x.classList.remove('sortable', 'asc', 'desc'); x.classList.add('sorted', desc ? 'desc' : 'asc'); x.setAttribute('aria-sort', desc ? 'descending' : 'ascending'); });
      }
    },
    // ─ Customizer pane: a panel / section title opens that panel / section (its own snapshot); "Close" returns to the site.
    // @since 2026-10-06 @source wp-admin/js/customize-controls.js (Section/Panel onClickHead → expand; customize-controls-close href)
    {
      label: 'customizer-close',
      event: 'click',
      match: function (el) { return !!up(el, '#customize-header-actions a.customize-controls-close'); },
      apply: function (el, evt) { stop(evt); var h = up(el, 'a').getAttribute('href') || '/'; var hit = R.resolve(h); R.goto(hit ? hit.slug : (/wp-admin/.test(h) ? 'admin-dashboard' : 'frontend-home')); }
    },
    // ─ External links: inline tip, never a new tab ──────────────────────
    // @since 2026-10-06 @source director ruling (all aThemes packs): an off-site link (another host, or target=_blank to
    // another host) shows "Opens <host> in a new tab ↗" beside the link for ~2 s and opens nothing — a film or a viewer
    // is never thrown onto the live web. The product logo goes to the pack's own dashboard (EXT_LOGO); on that screen it
    // shows the tip too. Shared shape: copy verbatim, change only EXT_LOGO and EXT_SITE_HOSTS. @product botiga
    {
      label: 'external-tip',
      event: 'click',
      match: function (el) {
        var a = el.closest && el.closest('a[href]'); if (!a) return false;
        var EXT_LOGO = { sel: 'a.botiga-dashboard-top-bar-logo', slug: 'admin-botiga-dashboard' };
        if (a.matches(EXT_LOGO.sel)) return true;
        var EXT_SITE_HOSTS = ['fernhillhome.com', 'localhost', '127.0.0.1', location.host];
        var u; try { u = new URL(a.getAttribute('href'), document.baseURI); } catch (e) { return false; }
        return /^https?:$/.test(u.protocol) && EXT_SITE_HOSTS.indexOf(u.host) === -1 && EXT_SITE_HOSTS.indexOf(u.hostname) === -1;
      },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = el.closest('a[href]');
        var EXT_LOGO = { sel: 'a.botiga-dashboard-top-bar-logo', slug: 'admin-botiga-dashboard' };
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
    // WP admin chrome fallback (director Task A, 2026-10-06): an admin menu / admin bar / breadcrumb link with no captured
    // target lands on the nearest captured screen instead of being swallowed. Exact targets stay with the nav map.
    {
      label: 'admin-chrome-fallback',
      event: 'click',
      order: 'last',
      match: function (el) {
        // Chrome links always; on an admin screen also any other same-site admin navigation link (not a write link).
        var a = up(el, '#adminmenu a[href], #wpadminbar a[href], .woocommerce-layout__breadcrumbs a[href], .woocommerce-layout__header a[href]');
        if (!a && document.querySelector('#adminmenu, #customize-controls')) {
          a = up(el, 'a[href]');
          if (a && !/(\.php|\/wp-admin\/?)([?#]|$)/.test(a.getAttribute('href') || '')) a = null;
          if (a && /[?&](_wpnonce|delete|trash|untrash|doaction)=|[?&]action=(delete|trash|untrash|activate|deactivate|delete-selected|bulk|-1|lostpassword|logout)/.test(a.getAttribute('href') || '')) a = null;
          if (a && up(a, 'th.sortable, th.sorted, ul.subsubsub')) a = null; // wp-list-sort / wp-list-filter own these
        }
        if (!a) return false; var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(href)) return false;
        try { var hu = new URL(href, document.baseURI); if (/^https?:$/.test(hu.protocol) && /^https?:\/\//i.test(href) && ['fernhillhome.com', location.host].indexOf(hu.host) === -1) return false; } catch (e) { return false; }
        return !(R.resolve && R.resolve(href));
      },
      apply: function (el, evt) {
        stop(evt); var a = up(el, 'a[href]'), href = a.getAttribute('href'), u;
        try { u = new URL(href, document.baseURI); } catch (e) { return; }
        var go = function (slug, why) { say('no exact snapshot for ' + (u.pathname.split('/').pop() + u.search) + ' — opening ' + why); R.goto(slug); };
        // 1. The parent menu's own screen (Posts > Categories → Posts).
        var top = a.closest('#adminmenu li.menu-top') && a.closest('#adminmenu li.menu-top').querySelector('a.menu-top');
        if (top && top !== a && R.resolve(top.getAttribute('href') || '')) return go(R.resolve(top.getAttribute('href')).slug, 'its menu (' + (top.textContent || '').trim() + ')');
        // 2. Nearest captured screen by URL.
        // Admin links are often relative (tools.php), which resolve against the snapshot folder, not /wp-admin/.
        var isAdmin = !!a.closest('#adminmenu') || (!/^[a-z]+:\/\//i.test(href) && href.charAt(0) !== '/') || /\/wp-admin\//.test(u.pathname);
        if (!isAdmin) return go('frontend-home', 'the site');
        var f = href.split(/[?#]/)[0].split('/').pop() || 'index.php', q = u.searchParams, pt = q.get('post_type') || '', tax = q.get('taxonomy') || '', page = q.get('page') || '';
        var T = [
          [f === 'post-new.php' && pt === 'page', 'admin-post-page', 'the page editor'],
          [f === 'post-new.php' && pt === 'product', 'admin-post-product', 'the product editor'],
          [f === 'post-new.php' && pt === 'size_chart', 'admin-post-size-chart', 'the size chart editor'],
          [f === 'post-new.php' && pt === 'linked_variation', 'admin-post-linked-variation', 'the linked variation editor'],
          [f === 'post-new.php' && (!pt || pt === 'post'), 'admin-post-new', 'Add New Post'],
          [/^(edit|post-new)\.php$/.test(f) && pt === 'page', 'admin-pages-list', 'Pages'],
          [/^(edit|post-new)\.php$/.test(f) && pt === 'product' || /^product_/.test(tax) || page === 'product_attributes', 'admin-products-list', 'Products'],
          [/^(edit|post-new)\.php$/.test(f) && pt === 'size_chart', 'admin-edit-size-chart', 'Size Charts'],
          [/^(edit|post-new)\.php$/.test(f) && pt === 'linked_variation', 'admin-edit-linked-variation', 'Linked Variations'],
          [/^(edit|post-new|edit-tags)\.php$/.test(f), 'admin-posts-list', 'Posts'],
          [/^wc-(orders|reports|admin)$/.test(page) || page === 'wc-admin', 'admin-orders-list', 'WooCommerce orders'],
          [/^wc-/.test(page), 'admin-wc-settings-shipping-options', 'WooCommerce settings'],
          [/^botiga/.test(page), 'admin-botiga-dashboard', 'the Botiga dashboard'],
          [/^(upload|media-new)\.php$/.test(f), 'admin-media-library', 'the Media Library'],
          [f === 'edit-comments.php', 'admin-comments', 'Comments'],
          [f === 'customize.php', 'admin-customize', 'the Customizer'],
          [f === 'widgets.php', 'admin-widgets--shop-sidebar', 'Widgets'],
          [f === 'nav-menus.php', 'admin-nav-menus', 'Menus'],
          [/^(themes|theme-editor|theme-install|site-editor)\.php$/.test(f), 'admin-themes--botiga-hero', 'Themes'],
          [/^plugin(s|-install|-editor)\.php$/.test(f), 'admin-plugins', 'Plugins'],
          [f === 'profile.php', 'admin-profile', 'your profile'],
          [/^(users|user-new|user-edit)\.php$/.test(f), 'admin-users', 'Users'],
          [/^options(-[a-z]+)?\.php$/.test(f), 'admin-settings-general', 'Settings']
        ];
        for (var i = 0; i < T.length; i++) if (T[i][0]) return go(T[i][1], T[i][2]);
        go('admin-dashboard', 'the Dashboard');
      }
    },
    // Single product size chart popup + tabs (botiga-pro/assets/js/botiga-size-chart.js:18-45).
    {
      label: 'size-chart-modal',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-product-size-chart-button a, .botiga-product-size-chart-modal, .botiga-product-size-chart-modal-tab'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.botiga-product-size-chart-button a')) { var m = up(el, '.botiga-product-size-chart'); if (m) unbake($('.botiga-product-size-chart-modal', m)); document.body.classList.add('botiga-product-size-chart-modal-open'); return; }
        var tab = up(el, '.botiga-product-size-chart-modal-tab');
        if (tab) { var sc = up(tab, '.botiga-product-size-chart'), tabs = $$('.botiga-product-size-chart-modal-tab', sc), i = tabs.indexOf(tab); tabs.forEach(function (t, k) { t.classList.toggle('active', k === i); }); $$('.botiga-product-size-chart-modal-table', sc).forEach(function (t, k) { t.classList.toggle('active', k === i); }); return; }
        if (el.classList.contains('botiga-product-size-chart-modal') || up(el, '.botiga-product-size-chart-modal-close')) { var c = $('.botiga-product-size-chart-modal-content'); if (c) c.scrollTop = 0; document.body.classList.remove('botiga-product-size-chart-modal-open'); }
      }
    },
    // Add-to-cart notification close × (botiga-add-to-cart-notifications.js:28 closeNotification).
    {
      label: 'adtcnotif-close',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-adtcnotif-close'); },
      apply: function (el, evt) { stop(evt); var n = up(el, '.botiga-adtcnotif'); if (n) n.classList.remove('active'); }
    },
    // Customizer Menu Locations: "+ Create New Menu" opens add_menu; "Edit Menu" focuses the chosen menu's section.
    {
      label: 'customize-menu-location-buttons',
      event: 'click',
      match: function (el) { return !!up(el, '#customize-controls button.create-menu, #customize-controls button.edit-menu'); },
      apply: function (el, evt) {
        stop(evt); if (!(window.wp && wp.customize && wp.customize.section)) return;
        if (up(el, 'button.create-menu')) return wp.customize.section('add_menu').focus();
        var ctl = up(el, '.customize-control'), sel = ctl && $('select', ctl), id = sel && sel.value;
        if (id && id !== '0') wp.customize.section('nav_menu[' + id + ']').focus(); else say('pick a menu first');
      }
    },
    // Templates Builder card: pencil opens the template in the editor modal; the second icon is its other card action.
    {
      label: 'tb-card-icons',
      event: 'click',
      match: function (el) { return !!up(el, 'button.bt-template-card__icon'); },
      apply: function (el, evt) {
        stop(evt); var b = up(el, 'button.bt-template-card__icon'), i = $$('button.bt-template-card__icon', b.parentNode).indexOf(b);
        if (i === 0) return notCaptured('the template editor modal (opens the template in the block editor)');
        live('this template card action');
      }
    },
    // Blog pagination links: the nav map keys /blog/page/2/ and /shop/page/2/ alike ("2", shop owns it), so blog pages route here.
    {
      label: 'blog-pagination-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a.page-numbers, .navigation.pagination a'); return !!a && /\/(blog|category\/[^\/]+)\/page\/\d+/.test(a.getAttribute('href') || ''); },
      apply: function (el, evt) {
        stop(evt); var m = (up(el, 'a').getAttribute('href') || '').match(/\/(blog|category\/([^\/]+))\/page\/(\d+)/);
        var to = m[2] ? 'frontend-blog-category--' + m[2] + '--page-' + m[3] : 'frontend-blog--page-' + m[3];
        if (to === 'frontend-blog--page-2') R.goto(to); else R.miss(to, 'page not captured');
      }
    },
    // add_menu "Next": empty name → field gets .invalid and focus (core validation); a typed name would create the menu.
    {
      label: 'customize-add-menu-submit',
      event: 'click',
      match: function (el) { return !!up(el, '#customize-new-menu-submit'); },
      apply: function (el, evt) {
        stop(evt); var f = $('.menu-name-field');
        if (f && !f.value.trim()) { f.classList.add('invalid'); f.focus(); return; }
        if (f) f.classList.remove('invalid'); live('create the menu');
      }
    },
    // ─ Customizer custom fonts list ─────────────────────────────────────
    // @source botiga/assets/js/customizer-scripts.js:1330-1345 (Add New Font clones the hidden first item; remove deletes)
    {
      label: 'custom-font-rows',
      event: 'click',
      match: function (el) { return !!up(el, '.botiga-custom-font-add, .botiga-custom-font-remove'); },
      apply: function (el, evt) {
        stop(evt); var c = up(el, '.botiga-custom-fonts-control'); if (!c) return;
        if (up(el, '.botiga-custom-font-remove')) { var it = up(el, '.botiga-custom-font-item'); if (it) it.remove(); return; }
        var first = $('.botiga-custom-font-item', c), list = $('.botiga-custom-font-items', c); if (!first || !list) return;
        var item = first.cloneNode(true); item.classList.remove('hidden'); unbake(item); list.appendChild(item);
      }
    },
    // ─ Swallow links that would act on the live store ────────────────────
    // @since 2026-10-03 @source woocommerce templates (remove item, logout, add-to-cart, place order) @verified 2026-10-03 @product botiga
    // These are writes (cart, session, order); the snapshot keeps them visible but inert, logged as misses.
    {
      label: 'store-write-guard',
      event: 'click',
      match: function (el) { return !!up(el, 'a.remove[data-product_id], a[href*="customer-logout"], a.add_to_cart_button, button.single_add_to_cart_button, button.botiga-buy-now-button, #place_order, button[name="apply_coupon"], button[name="update_cart"], .botiga-quick-view-popup button[type="submit"]'); },
      apply: function (el) { var a = up(el, 'a, button'); R.miss((a && (a.getAttribute('href') || a.name || a.className)) || 'store write', 'store write — not replayed in a snapshot'); }
    }
  ], P);

  // Copied from the sydney runtime with the Quick Edit entries.
  function closeQuickEdit(ed) {
    if (!ed) return; var id = ed.id.replace('edit-', '');
    var row = document.getElementById('post-' + id) || document.getElementById('tag-' + id); if (row) row.style.display = '';
    ed.remove();
  }

  // Helpers for the block-editor entries copied from products/athemes-addons/snapshots/_shared/interactivity.js
  // (addons capture worker, 2026-10-03), per the director: reuse, don't rewrite.
  var isBlockEditor = !!document.querySelector('.block-editor, .edit-post-layout, .editor-editor-interface, iframe[name="editor-canvas"], .blocks-widgets-container');
  var stop = function (evt) { if (evt && evt.preventDefault) evt.preventDefault(); };
  var live = function (what) { console.info('[snap] live only — would ' + what); };
  var say = function (what) { console.info('[snap] ' + what); };
  var parkedCloseAll = function () {
    [].forEach.call(document.querySelectorAll('[data-snap-parked]'), function (n) { n.remove(); });
    [].forEach.call(document.querySelectorAll('.woocommerce-layout__activity-panel-wrapper.is-open'), function (w) { w.classList.remove('is-open'); });
    [].forEach.call(document.querySelectorAll('[data-snap-park]'), function (x) { x.classList.remove('is-pressed', 'is-active'); x.setAttribute('aria-expanded', 'false'); });
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('[data-snap-parked]')) parkedCloseAll(); });

  // ─ Customizer live preview ───────────────────────────────────────────
  // @since 2026-10-06 @source botiga/assets/js/customizer.js (customize_preview_init: wp.customize(id).bind handlers) and
  // botiga/assets/js/admin/botiga-bhfb-customize-preview.js, vendored byte for byte into _shared/lib/ @verified 2026-10-06
  // @product botiga. Same shape as the Sydney pack (48's port): the preview iframe is a frontend snapshot of ours, so the
  // theme's OWN preview scripts run inside it behind a small wp.customize shim, and a panel change sets the setting there
  // as customize-preview.js would after a postMessage. Settings with no instant handler log that live refreshes the preview.
  if (document.getElementById('customize-controls')) {
    var czLinkVal = function (id) {
      var inp = document.querySelectorAll('[data-customize-setting-link="' + id + '"]'); if (!inp.length) return undefined;
      var a = inp[0]; if (a.type === 'radio') { for (var i = 0; i < inp.length; i++) if (inp[i].checked) return inp[i].value; return undefined; }
      return a.type === 'checkbox' ? a.checked : a.value;
    };
    var czMod = function (id) { var f = document.querySelector('#customize-preview iframe'); var w = f && f.contentWindow; var x = czLinkVal(id); return x !== undefined ? x : ((w && w.__snapThemeMods) || {})[id]; };
    // Parent API the theme's preview scripts read: control(id).setting.get(), control(id).settings[k].get(), container,
    // toggle; section(id).expanded (a bindable boolean: the section this snapshot has open).
    var parentCz = window.wp && window.wp.customize;
    if (parentCz) {
      var navSection = parentCz.section, navControl = parentCz.control;
      parentCz.control = function (id) {
        var el = document.getElementById('customize-control-' + id), base = navControl ? navControl(id) : {};
        if (!el && czMod(id) === undefined) return undefined; // absent control: the theme's scripts test for undefined
        var setting = { get: function () { return czMod(id); } }; setting._value = czMod(id);
        return Object.assign({}, base, { id: id, setting: setting, container: el ? [el] : [], settings: new Proxy({}, { get: function (t, k) { return { get: function () { return czMod(id + '[' + String(k) + ']') || czMod(String(k)); } }; } }),
          toggle: function (on) { if (el) el.style.display = on ? '' : 'none'; } });
      };
      parentCz.section = function (id) {
        var base = navSection ? navSection(id) : {}, open = !!document.querySelector('#sub-accordion-section-' + CSS.escape(id) + '.open');
        var expanded = function () { return open; }; expanded.bind = function (fn) { try { fn(open); } catch (e) {} };
        return Object.assign({}, base, { id: id, expanded: expanded });
      };
      window._wpCustomizeSettings = window._wpCustomizeSettings || { controls: {}, settings: {} };
    }
    var PREVIEW_SHIM = function (win, parentWin) {
      var reg = {};
      var V = function (id) {
        if (reg[id]) return reg[id];
        var v = { id: id, fns: [], _v: undefined, _set: false };
        v.bind = function (fn) { v.fns.push(fn); return v; };
        v.unbind = function () { return v; };
        v.get = function () { if (v._set) return v._v; var x = czLinkVal(id); return x !== undefined ? x : (win.__snapThemeMods || {})[id]; };
        v.set = function (x) { v._v = x; v._set = true; for (var i = 0; i < v.fns.length; i++) { try { v.fns[i].call(v, x, undefined); } catch (e) { win.console.warn('[snap] preview handler ' + id, e); } } };
        return (reg[id] = v);
      };
      var api = function () {
        var args = [].slice.call(arguments), cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        var vals = args.map(V); if (cb) cb.apply(null, vals); return vals[0];
      };
      api.bind = function (evt, fn) { if (evt === 'preview-ready') win.setTimeout(fn, 0); };
      api.instance = V; api.value = V; api.has = function (id) { return !!reg[id]; };
      api.control = function (id) { return parentWin.wp.customize.control(id); };
      api.section = function (id) { return parentWin.wp.customize.section(id); };
      api.panel = function (id) { return parentWin.wp.customize.panel(id); };
      api.selectiveRefresh = { bind: function () {}, partial: function () { return null; }, partialConstructor: {} };
      api.preview = { send: function () {}, bind: function () {} };
      win.wp = win.wp || {}; win.wp.customize = api;
      win.__snapCz = { set: function (id, x) { var r = reg[id]; if (!r || !r.fns.length) return false; r.set(x); return true; }, ids: function () { return Object.keys(reg); } };
    };
    var wirePreview = function (frame) {
      var w, d; try { w = frame.contentWindow; d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body || w.__snapCz || w.__snapCzLoading) return;
      w.__snapCzLoading = true;
      PREVIEW_SHIM(w, window);
      var srcs = [w.jQuery ? null : '../_shared/lib/jquery.min.js', '../_shared/lib/botiga-theme-mods.js', '../_shared/lib/botiga-theme-options.js', '../_shared/lib/botiga-customizer-preview.js', '../_shared/lib/botiga-bhfb-customize-preview.js'].filter(Boolean);
      (function next(i) {
        if (i >= srcs.length) { w.__snapCzLoading = false; return; }
        var s = d.createElement('script'); s.src = srcs[i]; s.onload = s.onerror = function () { next(i + 1); }; d.body.appendChild(s);
      })(0);
    };
    var previewFrame = function () { return document.querySelector('#customize-preview iframe'); };
    var bootPreview = function () {
      var f = previewFrame(); if (!f) return;
      f.addEventListener('load', function () { wirePreview(f); });
      if (f.contentDocument && f.contentDocument.readyState === 'complete') wirePreview(f);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootPreview); else bootPreview();
    var noHandlerLogged = {};
    var pushSetting = function (inp) {
      var id = inp.getAttribute('data-customize-setting-link'); if (!id) return;
      if (inp.type === 'radio' && !inp.checked) return;
      var v = inp.type === 'checkbox' ? inp.checked : inp.value;
      var f = previewFrame(), cz = f && f.contentWindow && f.contentWindow.__snapCz;
      var ok = false; try { ok = !!(cz && cz.set(id, v)); } catch (e) { ok = false; }
      if (!ok && !noHandlerLogged[id]) { noHandlerLogged[id] = true; live('refresh the whole preview for ' + id + ' (no instant handler on the live site)'); }
    };
    document.addEventListener('change', function (e) { var t = e.target; if (t && t.closest && t.closest('#customize-theme-controls') && t.hasAttribute('data-customize-setting-link')) pushSetting(t); });
    document.addEventListener('input', function (e) { var t = e.target; if (t && t.closest && t.closest('#customize-theme-controls') && t.hasAttribute('data-customize-setting-link') && /range|number|text|color/.test(t.type)) pushSetting(t); });
  }
  // Infinite scroll (botiga-pagination.js): live loads the next page when the button nears the viewport. Same here,
  // through the click entry that appends the parked page.
  if (document.querySelector('.botiga-pagination-button[data-pagination-type="infinite-scroll"]')) {
    window.addEventListener('scroll', function () {
      var b = document.querySelector('.botiga-pagination-button[data-pagination-type="infinite-scroll"]');
      if (!b || b.offsetParent === null || +b.getAttribute('data-current-page') >= +b.getAttribute('data-total-pages')) return;
      if (b.getBoundingClientRect().top < window.innerHeight + 200) b.click();
    }, { passive: true });
  }
  var notCaptured = function (what) { R.miss(what, 'not captured yet'); };
  var hop = function (slug, what) { if (KNOWN.indexOf(slug) >= 0) R.goto(slug); else notCaptured(what); };

  // ─ PhotoSwipe lightbox state ─────────────────────────────────────────
  // Product snapshot → its captured lightbox state.
  var LIGHTBOX = { 'frontend-product-simple': 'frontend-product-simple--lightbox' };
  // The frozen .pswp keeps three items: [previous, current, next] = images [n-1, 0, 1]. Read them once as the
  // gallery list in order, then show image i in the centre item and keep the side items as its neighbours.
  var PS = null;
  function pswp() {
    if (PS) return PS;
    var items = $$('.pswp__container > .pswp__item');
    var img = function (it) { var m = it && it.querySelector('img.pswp__img'); return m ? { src: m.getAttribute('src'), alt: m.getAttribute('alt') || '', style: m.getAttribute('style') || '' } : null; };
    var list = items.length === 3 ? [img(items[1]), img(items[2])] : items.map(img);
    if (items.length === 3) { var last = img(items[0]); if (last && last.src !== list[0].src && last.src !== list[1].src) list.push(last); }
    PS = { items: items, list: list.filter(Boolean), i: 0 };
    if (items[1]) items[1].setAttribute('data-snap-center', '');
    return PS;
  }
  function pswpShow(i) {
    var s = pswp(), n = s.list.length; if (!n) return;
    s.i = ((i % n) + n) % n;
    var put = function (it, k) { var m = it && it.querySelector('img.pswp__img'); var d = s.list[((k % n) + n) % n]; if (m && d) { m.setAttribute('src', d.src); m.setAttribute('alt', d.alt); } };
    if (s.items.length === 3) { put(s.items[0], s.i - 1); put(s.items[1], s.i); put(s.items[2], s.i + 1); }
    var c = $('.pswp__counter'); if (c) c.textContent = (s.i + 1) + ' / ' + n;
    var cap = $('.pswp__caption__center'); if (cap) cap.textContent = s.list[s.i].alt;
    var p = $('.pswp'); if (p && p.classList.contains('pswp--zoomed-in')) R.fire('lightbox-zoom', $('.pswp__button--zoom'));
  }
  function pswpClose() {
    var base = R.currentSlug().replace(/--lightbox$/, '');
    if (base !== R.currentSlug()) R.goto(base); else { var p = $('.pswp'); if (p) p.classList.remove('pswp--open', 'pswp--visible'); }
  }
  if ($('.pswp--open')) { var startAt = +((R.params && R.params().index) || 0); if (startAt) pswpShow(startAt); }

  // ─ Customizer device: one state everywhere ───────────────────────────
  // customizer-scripts.js:203-256 (responsive controls follow the footer devices) and botiga-bhfb.js:199-213
  // (the builder shows Desktop or Tablet/Mobile; mobile maps to tablet).
  function setDevice(d) {
    var o = $('.wp-full-overlay');
    if (o) { o.classList.remove('preview-desktop', 'preview-tablet', 'preview-mobile'); o.classList.add('preview-' + d); }
    $$('.wp-full-overlay-footer .devices button[data-device]').forEach(function (x) { var on = x.getAttribute('data-device') === d; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    ['desktop', 'tablet', 'mobile'].forEach(function (k) {
      $$('.botiga-devices-preview .preview-' + k).forEach(function (x) { x.classList.toggle('active', k === d); });
      $$('.responsive-control-' + k).forEach(function (x) { x.classList.toggle('active', k === d); if (k === d) unbake(x); });
    });
    if (d === 'mobile') $$('.responsive-control-tablet.show-mobile').forEach(function (x) { x.classList.add('active'); });
    var hb = d === 'mobile' ? 'tablet' : d;
    $$('.botiga-bhfb-devices .botiga-bhfb-device-link').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-device') === hb); });
  }

  // ─ Multi-step checkout: show one step ────────────────────────────────
  // botiga-multi-step-checkout.js:186-200 (classes) + showNextStep (content selectors on the tab link).
  function mstepShow(tab) {
    var li = tab.parentNode, step = tab.getAttribute('data-step');
    var all = $$('.botiga-mstepc-tabs-nav-item');
    all.forEach(function (t) { t.classList.remove('previous-step', 'current-step', 'next-step'); });
    li.classList.add('current-step');
    if (li.previousElementSibling) { li.previousElementSibling.classList.add('previous-step', 'completed'); }
    if (li.nextElementSibling) li.nextElementSibling.classList.add('next-step');
    // showNextStep (:383-391): the step panes switch by the show / showEffect classes.
    $$('.woocommerce-form-coupon-toggle,.woocommerce-form-login,form.woocommerce-checkout #customer_details,.checkout-wrapper,.woocommerce-form-coupon').forEach(function (c) { c.classList.remove('show', 'showEffect'); });
    (tab.getAttribute('data-content-selector') || '').split(',').filter(Boolean).forEach(function (s) { $$(s).forEach(function (c) { unbake(c); c.classList.add('show', 'showEffect'); }); });
    var w = $('.botiga-mstepc-wrapper'); if (w) { w.classList.remove('login', 'billing-shipping', 'order-payment', 'order-review'); w.classList.add(step); }
    if (step === 'order-review') {
      var rv = $('.botiga-mstep-order-review .botiga-mstep-order-review__table'), t = $('.woocommerce-checkout-review-order-table');
      if (rv && t) { var c = t.cloneNode(true); $$('.woocommerce-shipping-methods .shipping_method', c).forEach(function (i) { if (i.checked) i.remove(); else if (i.parentNode) i.parentNode.remove(); }); rv.innerHTML = ''; rv.appendChild(c); }
    }
    window.scrollTo(0, 0);
  }

  // ─ Variation sync (shared by the swatch entries) ─────────────────────
  // Mirrors Woo's VariationForm: available options narrow, a full match shows price / stock and
  // enables Add to cart; botiga-product-swatch.js:115-136 greys out unavailable items.
  function syncVariation(form) {
    var vars; try { vars = JSON.parse(form.getAttribute('data-product_variations') || '[]'); } catch (e) { vars = []; }
    if (!Array.isArray(vars)) return;
    var chosen = {};
    $$('select[name^="attribute_"]', form).forEach(function (s) { chosen[s.name] = s.value; });
    var fits = function (v, skip) { return Object.keys(chosen).every(function (k) { if (k === skip || !chosen[k]) return true; var a = v.attributes[k]; return a === '' || a === chosen[k]; }); };
    $$('.botiga-variations-wrapper', form).forEach(function (w) {
      var s = w.querySelector('select'); if (!s) return;
      $$('.botiga-variation-item', w).forEach(function (it) {
        var val = it.getAttribute('value');
        var ok = vars.some(function (v) { return v.is_in_stock !== false && fits(v, s.name) && (v.attributes[s.name] === '' || v.attributes[s.name] === val); });
        it.classList.toggle('disabled', !ok);
      });
    });
    var all = Object.keys(chosen).every(function (k) { return !!chosen[k]; });
    var match = all ? vars.filter(function (v) { return fits(v); })[0] : null;
    var single = $('.single_variation', form), btn = $('.single_add_to_cart_button', form), reset = $('.reset_variations', form);
    if (reset) { unbake(reset); var any = Object.keys(chosen).some(function (k) { return !!chosen[k]; }); reset.style.setProperty('visibility', any ? 'visible' : 'hidden', 'important'); reset.style.setProperty('display', any ? 'inline-block' : 'none', 'important'); }
    if (single) {
      if (match) { single.innerHTML = '<div class="woocommerce-variation-description">' + (match.variation_description || '') + '</div><div class="woocommerce-variation-price">' + (match.price_html || '') + '</div><div class="woocommerce-variation-availability">' + (match.availability_html || '') + '</div>'; unbake(single); single.style.display = ''; }
      else { single.innerHTML = ''; single.style.display = 'none'; }
    }
    var vid = $('input[name="variation_id"]', form); if (vid) vid.value = match ? match.variation_id : '';
    if (btn) { var ok = !!(match && match.is_in_stock !== false); btn.classList.toggle('disabled', !ok); btn.classList.toggle('wc-variation-selection-needed', !match); btn.classList.toggle('wc-variation-is-unavailable', !!match && !ok); }
    if (match && match.image && match.image.src) {
      var name = String(match.image.src).split('/').pop().split('?')[0].replace(/-\d+x\d+(?=\.)/, '');
      var scope = up(form, '.product, .botiga-quick-view-popup-content-ajax') || document;
      var main = $('.woocommerce-product-gallery__image img, .woocommerce-product-gallery img', scope);
      var local = $$('img').filter(function (i) { return (i.getAttribute('src') || '').indexOf(name.replace(/\.[a-z]+$/, '')) !== -1; })[0];
      if (main && local && main !== local) { main.setAttribute('src', local.getAttribute('src')); main.removeAttribute('srcset'); }
    }
  }
})();
