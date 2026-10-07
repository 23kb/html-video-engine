/* products/sydney/snapshots/_shared/interactivity.js — Sydney + Sydney Pro snapshot runtime.
 * Loads after products/_runtime/core.js. Every entry cites the theme / plugin source it mirrors
 * (roots: sydney-pro-ii/ = the theme, sydney-toolbox/ = the plugin, wp-admin/ = core).
 * Results that need the server are parked at capture time as <template data-snap-fragment>
 * (products/sydney/capture-plans/_cleanup.json park-* steps); nothing here invents UI.
 */
(function () {
  'use strict';
  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }
  var P = { product: 'sydney', file: 'interactivity.js' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var up = function (el, s) { return el && el.closest ? el.closest(s) : null; };
  var frag = function (name) { var t = document.querySelector('template[data-snap-fragment="' + name + '"]'); return t ? t.content.cloneNode(true) : null; };
  var unbake = function (el) { if (el) { R.clearBaked(el); $$('[data-snap-baked]', el).forEach(R.clearBaked); } };
  var hop = function (href, why) { var s = R.resolveHref(href); if (s) R.goto(s); else R.miss(href, why || 'not captured yet'); };
  var isCustomizer = !!document.getElementById('customize-controls');
  // Helpers for the block-editor + parked-toggle entries ported from botiga / athemes-addons (2026-10-07).
  var isBlockEditor = !!document.querySelector('.block-editor, .edit-post-layout, .editor-editor-interface, iframe[name="editor-canvas"], .blocks-widgets-container');
  var stop = function (evt) { if (evt && evt.preventDefault) evt.preventDefault(); };
  var say = function (what) { console.info('[snap] ' + what); };
  var blkLive = function (what) { console.info('[snap] live only — would ' + what); };
  var notCaptured = function (what) { R.miss(what, 'not captured yet'); };
  // A freshly opened editor has nothing to undo or save: core renders Undo / Redo / Save aria-disabled until the post is
  // dirty. Copied from the athemes-addons runtime (worker 00, blockEditorFresh), 2026-10-07.
  // Block editor canvas (srcdoc iframe): a click on a block selects it, as live; links inside the canvas never navigate
  // (the editor swallows them live too). From the athemes-addons runtime (worker 00, canvasClicks), 2026-10-07, without
  // its aThemes-blocks hop. @source wp/packages/block-editor block selection
  (function canvasClicks() {
    if (!isBlockEditor) return;
    var f = $('iframe[name="editor-canvas"]'); if (!f) return;
    var wire = function () {
      var d; try { d = f.contentDocument; } catch (e) { return; }
      if (!d || !d.body || d.__snapWired) return; d.__snapWired = true;
      d.addEventListener('click', function (e) {
        var blk = e.target.closest && e.target.closest('[data-block]'); if (e.target.closest && e.target.closest('a[href]')) e.preventDefault();
        if (!blk) return;
        [].forEach.call(d.querySelectorAll('.is-selected[data-block]'), function (x) { x.classList.remove('is-selected'); });
        blk.classList.add('is-selected'); say('selected the ' + (blk.getAttribute('data-type') || 'block') + ' block');
      }, true);
    };
    if (f.contentDocument && f.contentDocument.readyState === 'complete') wire();
    f.addEventListener('load', wire);
  })();
  (function blockEditorFresh() {
    if (!isBlockEditor) return;
    $$('.editor-history__undo, .editor-history__redo, .editor-post-publish-button, .editor-post-save-draft').forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
  })();
  var parkedCloseAll = function () {
    [].forEach.call(document.querySelectorAll('[data-snap-parked]'), function (n) { n.remove(); });
    [].forEach.call(document.querySelectorAll('.woocommerce-layout__activity-panel-wrapper.is-open'), function (w) { w.classList.remove('is-open'); });
    [].forEach.call(document.querySelectorAll('[data-snap-park]'), function (x) { x.classList.remove('is-pressed', 'is-active'); x.setAttribute('aria-expanded', 'false'); });
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('[data-snap-parked]')) parkedCloseAll(); });


  var live = function (what, why) { console.info('[snap] live-only: ' + what + ' — ' + why); };

  // Customizer "go to section/panel" links call wp.customize.section('<id>').focus() inline (HF builder grid
  // chips, sydney-pro-ii/inc/modules/hf-builder/assets/js/admin/sydney-shfb.js:181-198). Each section is its own snapshot.
  // @since 2026-10-03 @source sydney-pro-ii/inc/modules/hf-builder (empty div.sydney-shfb-bottom-upsell over the builder bar) @verified 2026-10-03 @product sydney
  // DEVIATION — the snapshot fixes a live Sydney Pro bug; not product behaviour. Pro renders the upsell empty and it still swallows clicks on the device links / chips (a real mouse click fails on the
  // live site too, 1440x900). Same fix as the shfb-upsell-passthrough cleanup step, for snapshots captured before it.
  if (isCustomizer) $$('.sydney-shfb-bottom-upsell').forEach(function (u) { if (!u.textContent.trim() && !u.querySelector('img,a,button')) u.style.pointerEvents = 'none'; });
  // The footer builder has no mobile grid (sydney-shfb.css:807-814 excludes .sydney-shfb-footer); its device links sit painted
  // under the bar's own strip, invisible on the live site. Hide them so nothing invisible is clickable.
  if (isCustomizer) $$('.sydney-shfb-footer .sydney-shfb-devices, .sydney-shfb-footer .sydney-shfb-devices *, .sydney-shfb:not(.show) .sydney-shfb-devices, .sydney-shfb:not(.show) .sydney-shfb-devices *').forEach(function (d) { d.style.visibility = 'hidden'; });

  if (isCustomizer) {
    window.wp = window.wp || {};
    var gotoSection = function (kind, id) { hop('customize.php?autofocus[' + kind + ']=' + id, 'Customizer ' + kind + ' not captured yet'); };
    // A control's own section, for links that focus a control that is not on the open pane (Style Book colour swatches:
    // href=javascript:wp.customize.control('custom_palette').focus(), sydney-pro-ii/inc/customizer/style-book.php).
    var CONTROL_SECTION = { custom_palette: 'colors' };
    // The panel's current value of a setting, read from its linked input(s).
    var linkValue = function (id) {
      var inp = document.querySelectorAll('[data-customize-setting-link="' + id + '"]'); if (!inp.length) return undefined;
      if (inp[0].type === 'radio') { for (var i = 0; i < inp.length; i++) if (inp[i].checked) return inp[i].value; return undefined; }
      return inp[0].type === 'checkbox' ? inp[0].checked : inp[0].value;
    };
    // Callable like core's wp.customize(id): the theme's preview script calls window.parent.wp.customize(id) and
    // wp.customize.control(id).setting._value (sydney-pro-ii/js/customizer.js, the sydney_theme_options loop).
    var czApi = function (id) { return document.querySelector('[data-customize-setting-link="' + id + '"]') ? { get: function () { return linkValue(id); }, _value: linkValue(id) } : undefined; };
    czApi.section = function (id) { return { focus: function () { gotoSection('section', id); }, expand: function () { gotoSection('section', id); } }; };
    czApi.panel = function (id) { return { focus: function () { gotoSection('panel', id); }, expand: function () { gotoSection('panel', id); } }; };
    // toggle/container: the theme's preview script shows and hides dependent controls through here (hideControls / showControls).
    czApi.control = function (id) {
      var el = document.getElementById('customize-control-' + id);
      if (!el) { var sec = CONTROL_SECTION[id]; return sec ? { focus: function () { gotoSection('section', sec); } } : undefined; } // not on this pane: the theme's preview script checks typeof control(id) !== 'undefined'
      return { focus: function () {}, container: el ? [el] : [], setting: { _value: linkValue(id), get: function () { return linkValue(id); } }, toggle: function (on) { if (el) el.style.display = on ? '' : 'none'; } };
    };
    window.wp.customize = czApi;

    // ─ Customizer live preview ───────────────────────────────────────────
    // @since 2026-10-06 @source sydney-pro-ii/js/customizer.js (customize_preview_init → 259 wp.customize(id).bind
    // handlers) and inc/modules/hf-builder/assets/js/admin/sydney-shfb-customize-preview.js, vendored byte for byte into
    // _shared/lib/ @verified 2026-10-06 @product sydney. The preview iframe is a frontend snapshot of ours, so the theme's
    // OWN preview scripts run inside it behind a small wp.customize shim; a panel control change sets the setting there
    // exactly as customize-preview.js would after a postMessage. Settings with no handler (transport refresh) log that
    // the preview reloads live.
    var PREVIEW_SHIM = function (win, parentWin) {
      var reg = {};
      var linkVal = function (id) {
        var inp = parentWin.document.querySelectorAll('[data-customize-setting-link="' + id + '"]'); if (!inp.length) return undefined;
        var a = inp[0]; if (a.type === 'radio') { for (var i = 0; i < inp.length; i++) if (inp[i].checked) return inp[i].value; return undefined; }
        return a.type === 'checkbox' ? a.checked : a.value;
      };
      var V = function (id) {
        if (reg[id]) return reg[id];
        var v = { id: id, fns: [], _v: undefined, _set: false };
        v.bind = function (fn) { v.fns.push(fn); return v; };
        v.unbind = function () { return v; };
        v.get = function () { if (v._set) return v._v; var x = linkVal(id); return x !== undefined ? x : (win.__snapThemeMods || {})[id]; };
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
      win.syd_data = win.syd_data || { post_types: [] };
      win.__snapCz = { set: function (id, x) { var r = reg[id]; if (!r || !r.fns.length) return false; r.set(x); return true; }, ids: function () { return Object.keys(reg); } };
    };
    var wirePreview = function (frame) {
      var w, d; try { w = frame.contentWindow; d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body || w.__snapCz || w.__snapCzLoading) return;
      w.__snapCzLoading = true;
      PREVIEW_SHIM(w, window);
      var srcs = [w.jQuery ? null : '../_shared/lib/jquery.min.js', '../_shared/lib/sydney-theme-options.js', '../_shared/lib/sydney-theme-mods.js', '../_shared/lib/sydney-customizer-preview.js', '../_shared/lib/sydney-shfb-customize-preview.js'].filter(Boolean);
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
      var v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (inp.type === 'radio' && !inp.checked) return;
      var f = previewFrame(), cz = f && f.contentWindow && f.contentWindow.__snapCz;
      var ok = false; try { ok = !!(cz && cz.set(id, v)); } catch (e) { ok = false; }
      if (!ok && !noHandlerLogged[id]) { noHandlerLogged[id] = true; live('preview of ' + id, 'this setting refreshes the whole preview on the live site (no instant handler)'); }
    };
    document.addEventListener('change', function (e) { var t = e.target; if (t && t.closest && t.closest('#customize-theme-controls') && t.hasAttribute('data-customize-setting-link')) pushSetting(t); });
    document.addEventListener('input', function (e) { var t = e.target; if (t && t.closest && t.closest('#customize-theme-controls') && t.hasAttribute('data-customize-setting-link') && /range|number|text|color/.test(t.type)) pushSetting(t); });
  }

  R.register([
    // ─ index.php by space ────────────────────────────────────────────────
    // @since 2026-10-06 @source core URL shape (wp-admin/index.php = Dashboard; site-root index.php = front page)
    // @verified 2026-10-06 @product sydney. The nav map holds one slot per file name, and index.php is claimed from both
    // spaces (the Dashboard's own menu link and every site Home/logo link), so the map leaves it out. The page knows
    // its space: a relative index.php link on an admin screen is the Dashboard; a site-root link is the front page.
    {
      label: 'index-by-space',
      event: 'click',
      match: function (el) {
        var a = up(el, 'a[href]'); if (!a) return false;
        var h = a.getAttribute('href') || '';
        if (/^(\.\/)?index\.php([?#].*)?$/.test(h) || /\/wp-admin\/(index\.php)?([?#].*)?$/.test(h)) return !!document.body.classList.contains('wp-admin') || /\/wp-admin\//.test(h);
        return /^https?:\/\/[^/]+\/?(index\.php)?$/.test(h);
      },
      apply: function (el) {
        var h = up(el, 'a[href]').getAttribute('href') || '';
        var admin = /\/wp-admin\//.test(h) || (!/^https?:/.test(h) && document.body.classList.contains('wp-admin'));
        R.goto(admin ? 'admin-wp-dashboard' : 'frontend-home');
      }
    },
    // ─ Admin menu fallback ───────────────────────────────────────────────
    // @since 2026-10-06 @source wp-admin/menu-header.php (#adminmenu: li.menu-top > a + .wp-submenu) @verified 2026-10-06
    // @product sydney. Director rule (Umair QC "nothing is interactive"): no admin menu link is swallowed silently. A
    // sidebar link with no captured screen lands on its parent menu's captured screen (a Customizer link on the
    // Customizer), and the log names what the live link would have opened.
    {
      label: 'adminmenu-fallback',
      event: 'click',
      match: function (el) {
        var a = up(el, '#adminmenu a[href]'); if (!a || /(^|\/)plugin-install\.php/.test(a.getAttribute('href') || '')) return false;
        return !R.resolveHref(a.getAttribute('href') || '');
      },
      apply: function (el) {
        var a = up(el, '#adminmenu a[href]'), href = a.getAttribute('href') || '';
        var target = /^customize\.php/.test(href) ? R.resolveHref('customize.php') : null;
        if (!target) { var li = up(a, 'li.menu-top'), top = li && li.querySelector(':scope > a[href]'); target = top && R.resolveHref(top.getAttribute('href') || ''); }
        if (target) console.info('[snap] not captured: ' + href + ' — showing its parent menu screen instead');
        else { target = 'admin-wp-dashboard'; console.info('[snap] not captured: ' + href + ' (and its parent menu) — showing the Dashboard instead'); }
        R.goto(target);
      }
    },
    // ─ Block editor welcome guide ────────────────────────────────────────
    // @since 2026-10-06 @source @wordpress/components Guide (components-guide: Close, page dots, Next / Get started)
    // @verified 2026-10-06 @product sydney. The admin has not dismissed the widgets guide, so live opens with it too.
    // Close (or a backdrop click) removes it; pages 2–4 are rendered only live (React state), so Next / a dot logs that.
    {
      label: 'welcome-guide-close',
      event: 'click',
      match: function (el) {
        var g = up(el, '.components-modal__screen-overlay'); if (!g || !g.querySelector('.components-guide')) return false;
        return !!up(el, '.components-guide .components-modal__header button, .components-guide button[aria-label="Close"]') || !up(el, '.components-guide');
      },
      apply: function (el) { var ov = up(el, '.components-modal__screen-overlay'); if (ov) ov.remove(); }
    },
    {
      label: 'welcome-guide-pages',
      event: 'click',
      match: function (el) { return !!up(el, '.components-guide .components-guide__forward-button, .components-guide .components-guide__back-button, .components-guide .components-guide__page-control button'); },
      apply: function () { live('welcome guide pages 2–4', 'the guide renders its other pages in React state; Close dismisses it'); }
    },
    // ─ Block editor (posts, pages, portfolio, widgets) ──────────────────
    // Copied verbatim from products/botiga/snapshots/_shared/interactivity.js (botiga worker f3, itself from the athemes-addons
    // runtime, worker 00) per director 77, 2026-10-07; only the helper names differ (blkLive / notCaptured below).
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
        if (/Inserter|Add block|Toggle block inserter/i.test(lab)) return notCaptured('the block inserter');
        if (/Save|Publish|Update|Undo|Redo|Move|Drag|Reset/i.test(lab)) return blkLive(lab.split(' ').slice(0, 2).join(' ').toLowerCase() + ' in the block editor');
        // Elementor's switch-mode button toggles the page between the block editor and the "Edit with Elementor" placeholder
        // (elementor/assets/dev/js/admin/admin.js switchMode: body.elementor-editor-active); live also saves the mode.
        // From the athemes-addons runtime (worker 00), 2026-10-07.
        if (b.id === 'elementor-switch-mode-button' || up(b, '#elementor-switch-mode') || /Back to WordPress Editor/i.test(lab)) {
          var on = document.body.classList.toggle('elementor-editor-active');
          return blkLive((on ? 'switch this page to Elementor' : 'switch back to the WordPress editor') + ' (saves the edit mode)');
        }
        if (/Edit with Elementor/i.test(lab)) return blkLive('open this page in the Elementor editor');
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
        if (up(el, '.components-notice__action')) return blkLive((el.textContent || 'notice action').trim());
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
        if (item) return blkLive('insert the ' + (item.textContent || 'block').trim() + ' block');
        notCaptured('this inserter control');
      }
    },
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

    // Admin menu flyouts: WP opens a non-current menu's submenu on hover by adding .opensub to the li
    // (hoverIntent); without it the .wp-submenu sits at top:-1000em and no submenu link can be reached.
    // Copied verbatim from products/athemes-addons/snapshots/_shared/interactivity.js (worker 00), 2026-10-07.
    // @since 2026-10-06 @source wp/wp-admin/js/common.js ($adminmenu hoverIntent: over → addClass('opensub'), out → removeClass) @verified 2026-10-07 @product sydney
    {
      label: 'wp-menu-flyout',
      event: 'mouseover',
      match: function (el) { return !!up(el, '#adminmenu li.wp-has-submenu') || (!up(el, '#adminmenu') && !!$('#adminmenu li.opensub')); },
      apply: function (el) {
        var li = up(el, '#adminmenu li.wp-has-submenu');
        $$('#adminmenu li.opensub').forEach(function (x) { if (x !== li) x.classList.remove('opensub'); });
        if (!li || li.classList.contains('wp-has-current-submenu')) return;
        if (li.classList.contains('opensub')) return;
        li.classList.add('opensub');
        // common.js adjustSubmenu: keep the flyout inside the viewport.
        var sub = $('.wp-submenu', li); if (!sub) return;
        sub.style.marginTop = '';
        var r = sub.getBoundingClientRect(), over = r.bottom - window.innerHeight + 10;
        if (over > 0) sub.style.marginTop = '-' + Math.min(over, Math.max(0, r.top - 32)) + 'px';
      }
    },
    // ─ Customizer accordions ─────────────────────────────────────────────
    // @since 2026-10-07 @source sydney-pro-ii/inc/customizer/controls/accordion/accordion.js:22-90 (click: one item open at a
    // time; showOrHide walks the controls after the title's control up to data-until and toggles .sydney-accordion-hide)
    // @verified 2026-10-07 @product sydney
    {
      label: 'sydney-accordion',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.sydney-accordion-title'); },
      apply: function (el, evt) {
        stop(evt);
        var t = up(el, '.sydney-accordion-title');
        var showOrHide = function (title, status) {
          var ctl = up(title, '.customize-control'), until = 'customize-control-' + title.getAttribute('data-until'), cur = ctl && ctl.nextElementSibling, n = 0;
          while (cur && n < 200) { cur.classList.add('sydney-accordion-item', 'active'); cur.classList.toggle('sydney-accordion-hide', status === 'hide'); if (cur.id === until) break; cur = cur.nextElementSibling; n++; }
        };
        if (t.classList.contains('expanded')) { showOrHide(t, 'hide'); t.classList.remove('expanded'); return; }
        $$('.sydney-accordion-title.expanded').forEach(function (x) { showOrHide(x, 'hide'); x.classList.remove('expanded'); });
        showOrHide(t, 'show'); t.classList.add('expanded');
      }
    },
    // ─ Sortable repeater: remove a row ───────────────────────────────────
    // @since 2026-10-07 @source sydney-pro-ii/inc/customizer/controls/repeater/script.js:31-47 (more than one row: the row
    // slides up and is removed; the last row is emptied instead; sydneyGetAllInputs re-serialises the hidden input)
    // @verified 2026-10-07 @product sydney
    {
      label: 'sortable-repeater-delete',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.customize-control-sortable-repeater-delete'); },
      apply: function (el, evt) {
        stop(evt);
        var row = up(el, '.repeater'), box = row && row.parentNode; if (!row) return;
        if (box.querySelectorAll('.repeater').length > 1) row.remove(); else { var i = row.querySelector('.repeater-input'); if (i) i.value = ''; }
        var hidden = up(box, '.customize-control') && up(box, '.customize-control').querySelector('input[data-customize-setting-link]');
        if (hidden) { hidden.value = [].map.call(box.querySelectorAll('.repeater-input'), function (x) { return x.value; }).filter(Boolean).join(','); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    },
    // ─ Plugins › Add Plugin ──────────────────────────────────────────────
    // @since 2026-10-07 @source wp-admin/plugin-install.php (the directory loads from api.wordpress.org) @verified 2026-10-07 @product sydney
    {
      label: 'add-plugin-live-only',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href]'); return !!a && /(^|\/)plugin-install\.php/.test(a.getAttribute('href') || ''); },
      apply: function (el, evt) {
        stop(evt); live('Add Plugin', 'the plugin directory loads from wordpress.org, live only');
        // A visible note beside the button (as the other packs' external-tip): the click is seen, nothing opens.
        var a = up(el, 'a[href]'), old = document.querySelector('.snap-live-tip'); if (old) old.remove();
        var tip = document.createElement('span'); tip.className = 'snap-live-tip'; tip.setAttribute('role', 'status');
        tip.textContent = 'The plugin directory loads from WordPress.org on the live site';
        tip.style.cssText = 'margin-left:8px;padding:3px 8px;border-radius:3px;background:#1d2327;color:#fff;font-size:12px;vertical-align:middle;white-space:nowrap';
        a.insertAdjacentElement('afterend', tip); setTimeout(function () { if (tip.parentNode) tip.remove(); }, 2500);
      }
    },
    // ─ Blog "Load more posts" ────────────────────────────────────────────
    // @since 2026-10-05 @source sydney-pro-ii/js/infinite-load.js (sydney.infiniteScroll.init: the button hides on click,
    // InfiniteScroll appends the next page's .post items, the button shows again; on the last page it stays hidden)
    // @verified 2026-10-05 @product sydney. Pages are parked at capture (cleanup park-load-more → more-posts-<n>).
    {
      label: 'blog-load-more',
      event: 'click',
      match: function (el) { return !!up(el, '.load-more-container .load-more-posts'); },
      apply: function (el) {
        var b = up(el, '.load-more-posts'), wrap = $('.row[data-pagination="button"]'); if (!wrap) return;
        // Live (checked 2026-10-05): the click hides the button; the append handler shows it again even after the last
        // page, and a click past the last page only hides it (InfiniteScroll canLoad is false, nothing appends).
        var next = +(wrap.getAttribute('data-snap-next-page') || 2), parked = +(wrap.getAttribute('data-snap-more-pages') || 0);
        b.style.display = 'none';
        if (next - 1 > parked) return;
        var f = frag('more-posts-' + next);
        if (!f) { R.miss('journal page ' + next, 'page not parked'); return; }
        wrap.appendChild(f);
        wrap.setAttribute('data-snap-next-page', String(next + 1));
        b.style.display = 'inline-block';
      }
    },
    // ─ Sydney dashboard ──────────────────────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/inc/dashboard/assets/js/sydney-dashboard.js:515-542 @verified 2026-10-03 @product sydney
    {
      label: 'dashboard-tab',
      event: 'click',
      match: function (el) { var a = up(el, '.sydney-dashboard-tabs-nav-link[data-tab-to]'); return !!a && !!up(a, '.sydney-dashboard-tabs-nav'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var a = up(el, '.sydney-dashboard-tabs-nav-link'), nav = up(a, '.sydney-dashboard-tabs-nav');
        var wrapId = nav.getAttribute('data-tab-wrapper-id'), to = a.getAttribute('data-tab-to');
        $$('.sydney-dashboard-tabs-nav-item', nav).forEach(function (i) { i.classList.remove('active'); });
        var item = up(a, '.sydney-dashboard-tabs-nav-item'); if (item) item.classList.add('active');
        $$('.sydney-dashboard-tab-content-wrapper[data-tab-wrapper-id="' + wrapId + '"]').forEach(function (w) {
          $$(':scope > .sydney-dashboard-tab-content', w).forEach(function (c) { var on = c.getAttribute('data-tab-content-id') === to; c.classList.toggle('active', on); if (on) unbake(c); });
        });
      },
      state: function (el) { return { key: 'dashboard.tab', value: up(el, '.sydney-dashboard-tabs-nav-link').getAttribute('data-tab-to') }; }
    },
    // @since 2026-10-03 @source sydney-pro-ii/inc/dashboard/assets/js/sydney-dashboard.js:767-800 @verified 2026-10-03 @product sydney
    // Open/close only; the "mark read" POST (sydney_notifications_read) is a write and stays out.
    {
      label: 'dashboard-notifications-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-dashboard-theme-notifications'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var s = $('.sydney-dashboard-notifications-sidebar'); if (s) { unbake(s); s.classList.toggle('opened'); } }
    },
    {
      label: 'dashboard-notifications-close',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-dashboard-notifications-sidebar-close'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var s = $('.sydney-dashboard-notifications-sidebar'); if (s) s.classList.remove('opened', 'closing'); }
    },
    // @since 2026-10-03 @source sydney-pro-ii/inc/dashboard/assets/js/sydney-dashboard.js:567-746; updater/theme-updater.php:14-76 @verified 2026-10-03 @product sydney
    // Module activation, plugin install/activate and license submit write to the site (H3, H4, H6): inert, logged.
    {
      label: 'dashboard-write-guard',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-dashboard-module-activation, .sydney-dashboard-module-activation-all, .sydney-dashboard-plugin-ajax-button, button[name="sydney_pro_license_submit"], button[name="sydney_pro_license_deactivate"], #save-templates'); },
      apply: function (el, evt) { if (evt) { evt.preventDefault(); evt.__snapHandled = true; } var a = up(el, 'a, button'); live((a && (a.getAttribute('data-module-id') || a.getAttribute('data-slug') || a.name || a.textContent.trim())) || 'dashboard write', 'saves to the site, works live only'); }
    },

    // ─ Sydney dashboard: Template Builder (client-side row editing) ──────
    // @since 2026-10-03 @source sydney-pro-ii/inc/dashboard/assets/js/sydney-dashboard.js:120-242 @verified 2026-10-03 @product sydney
    {
      label: 'builder-part-options',
      event: 'click',
      match: function (el) { return !!up(el, '#template-builder .part-options-toggle, #template-builder .template-part-inner .not-selected'); },
      apply: function (el) {
        var part = up(el, '.template-part'), o = part && part.querySelector('.part-options'); if (!o) return;
        unbake(o); var open = o.style.display === 'none' || getComputedStyle(o).display === 'none'; o.style.display = open ? 'block' : 'none';
        var ic = part.querySelector('.part-options-toggle span'); if (ic) { ic.classList.toggle('dashicons-ellipsis', !open); ic.classList.toggle('dashicons-no-alt', open); }
      }
    },
    {
      label: 'builder-part-panel',
      event: 'click',
      match: function (el) { return !!up(el, '#template-builder .part-options .select-existing, #template-builder .part-options .select-page-builder'); },
      apply: function (el) {
        var part = up(el, '.template-part'), w = part.querySelector(up(el, '.select-existing') ? '.existing-parts-wrapper' : '.page-builder-wrapper'); if (!w) return;
        unbake(w); w.style.display = (w.style.display === 'none' || getComputedStyle(w).display === 'none') ? 'block' : 'none';
      }
    },
    {
      label: 'builder-part-pick',
      event: 'change',
      match: function (el) { return el.classList && el.classList.contains('existing-parts-select'); },
      apply: function (el) {
        var part = up(el, '.template-part'), item = up(el, '.template-item'), t = part.getAttribute('data-part-type'), inp = item.querySelector('input[name="' + t + '"]');
        if (inp) inp.value = el.value;
        if (el.value) { part.setAttribute('data-part-active', 'active'); var s = part.querySelector('.part-title .selected'), n = part.querySelector('.part-title .not-selected'); if (s) s.style.display = 'block'; if (n) n.style.display = 'none'; }
        console.log('[snap] set: template part ' + t + ' = ' + el.value);
      }
    },
    {
      label: 'builder-part-reset',
      event: 'click',
      match: function (el) { return !!up(el, '#template-builder .part-options .reset'); },
      apply: function (el) {
        var part = up(el, '.template-part'), item = up(el, '.template-item'), t = part.getAttribute('data-part-type'), inp = item.querySelector('input[name="' + t + '"]');
        if (inp) inp.value = ''; part.setAttribute('data-part-active', 'inactive');
        var s = part.querySelector('.part-title .selected'), n = part.querySelector('.part-title .not-selected'); if (s) s.style.display = 'none'; if (n) n.style.display = 'block';
        var o = part.querySelector('.part-options'); if (o) o.style.display = 'none';
      }
    },
    {
      label: 'builder-part-live',
      event: 'click',
      match: function (el) { return !!up(el, '#template-builder .part-options .edit-part, #template-builder .page-builder-wrapper .create-new'); },
      apply: function (el) { live(up(el, '.edit-part') ? 'Edit template part' : 'Create template part', 'creates or opens the part in Elementor, works live only'); }
    },
    {
      label: 'builder-row-edit',
      event: 'click',
      match: function (el) { return !!up(el, '#add-new-template, #template-builder .template-options .duplicate-template, #template-builder .template-options .delete-template'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var tb = $('#template-builder'); if (!tb) return;
        if (up(el, '#add-new-template')) {
          var c = $('.template-item', tb).cloneNode(true); c.setAttribute('data-id', 'sydney-template-new');
          var h = c.querySelector('h4'); if (h) { var i = document.createElement('input'); i.type = 'text'; i.name = 'template_name'; i.placeholder = 'Template name'; h.replaceWith(i); }
          var o = c.querySelector('.template-options'); if (o) o.style.display = 'block';
          $$('input', c).forEach(function (x) { if (x.type !== 'button') x.value = ''; }); $$('.template-part', c).forEach(function (p) { p.setAttribute('data-part-active', 'inactive'); });
          tb.appendChild(c); return;
        }
        var row = up(el, '.template-item');
        if (up(el, '.delete-template')) row.remove();
        else { var d = row.cloneNode(true); d.setAttribute('data-id', row.getAttribute('data-id') + '-copy'); row.after(d); }
        console.log('[snap] set: template rows = ' + $$('.template-item', tb).length);
      }
    },
    {
      label: 'builder-conditions-open',
      event: 'click',
      match: function (el) { return !!up(el, '#template-builder .sydney-display-conditions-modal-toggle'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var m = up(el, '.sydney-display-conditions-control').querySelector('.sydney-display-conditions-modal');
        if (m && m.querySelector('.sydney-display-conditions-modal-content')) { unbake(m); m.classList.toggle('open'); return; }
        if (R.currentSlug() !== 'admin-dashboard-builder--conditions') R.goto('admin-dashboard-builder--conditions');
      }
    },
    {
      label: 'builder-conditions-close',
      event: 'click',
      match: function (el) { return !!el.classList && el.classList.contains('sydney-display-conditions-modal') && el.classList.contains('open'); },
      apply: function (el) { $$('.sydney-display-conditions-modal.open').forEach(function (m) { m.classList.remove('open'); }); }
    },
    {
      label: 'builder-conditions-rows',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-display-conditions-modal-add, .sydney-display-conditions-modal-remove, .sydney-display-conditions-modal-save'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var m = up(el, '.sydney-display-conditions-modal');
        if (up(el, '.sydney-display-conditions-modal-remove')) { up(el, '.sydney-display-conditions-modal-content-list-item').remove(); return; }
        if (up(el, '.sydney-display-conditions-modal-add')) {
          var list = m.querySelector('.sydney-display-conditions-modal-content-list'), it = m.querySelector('.sydney-display-conditions-modal-content-list-item');
          if (list && it) { var c = it.cloneNode(true); c.classList.remove('hidden'); list.appendChild(c); unbake(c); } return;
        }
        m.classList.remove('open'); console.log('[snap] set: display conditions saved to the row (Save Templates writes them — live only)');
      }
    },
    // ─ Appearance › Menus (core nav-menu.js) + Sydney mega menu popup ───
    // @since 2026-10-03 @source sydney-pro-ii/inc/modules/mega-menu/class-sydney-mega-menu.php:77-115, js/sydney-popup.js (popup close; Save / Create content write) @verified 2026-10-03 @product sydney
    {
      label: 'megamenu-popup-close',
      event: 'click',
      match: function (el) { return !!up(el, '#sydney-menu-options-popup .sydney-popup-close'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var p = $('#sydney-menu-options-popup'); if (p) p.classList.remove('show'); }
    },
    {
      label: 'megamenu-popup-write',
      event: 'click',
      match: function (el) { return !!up(el, '#sydney-menu-options-popup .sydney-popup-save-button, #sydney-menu-options-popup .sydney-create-mega-menu-template'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); live(up(el, 'a').textContent.trim(), up(el, '.sydney-popup-save-button') ? 'saves the menu item, works live only' : 'creates an Elementor template, works live only'); }
    },
    {
      label: 'megamenu-popup-open',
      event: 'click',
      match: function (el) { return !!up(el, '#menu-to-edit [data-item-is-mega-menu]'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var p = $('#sydney-menu-options-popup.content-loaded'); if (p) { unbake(p); p.classList.add('show'); return; }
        R.goto('admin-nav-menus--mega-menu-popup');
      }
    },
    // @since 2026-10-03 @source wp-admin/js/nav-menu.js (item-edit toggles .menu-item-edit-active / settings; metabox accordions; tab links) @verified 2026-10-03 @product sydney
    {
      label: 'navmenu-item-edit',
      event: 'click',
      match: function (el) { return !!up(el, '#menu-to-edit .item-edit, #menu-to-edit .menu-item-settings .item-cancel'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var li = up(el, 'li.menu-item'), s = li && li.querySelector('.menu-item-settings'); if (!s) return;
        var open = !li.classList.contains('menu-item-edit-active');
        li.classList.toggle('menu-item-edit-active', open); li.classList.toggle('menu-item-edit-inactive', !open); unbake(s);
        if (open) R.slideDown(s, 150); else R.slideUp(s, 150);
        var a = li.querySelector('.item-edit'); if (a) a.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    },
    {
      label: 'navmenu-metabox-accordion',
      event: 'click',
      match: function (el) { return !!up(el, '#side-sortables .accordion-section > .accordion-section-title, #nav-menu-meta .accordion-trigger'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var sec = up(el, '.accordion-section'), list = up(sec, '.accordion-container') || document, open = !sec.classList.contains('open');
        $$('.accordion-section.open', list).forEach(function (x) { if (x !== sec) { x.classList.remove('open'); var c = x.querySelector('.accordion-section-content'); if (c) c.style.display = 'none'; } });
        sec.classList.toggle('open', open); var c = sec.querySelector('.accordion-section-content'); if (c) { unbake(c); c.style.display = open ? 'block' : 'none'; }
        var t = sec.querySelector('.accordion-trigger'); if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    },
    {
      label: 'navmenu-metabox-tab',
      event: 'click',
      match: function (el) { return !!up(el, '#nav-menu-meta .nav-tab-link[data-type]'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var a = up(el, '.nav-tab-link'), box = up(a, '.inside, .posttypediv, .taxonomydiv') || document, t = a.getAttribute('data-type');
        $$('.tabs', box).forEach(function (x) { x.classList.remove('tabs'); }); a.parentNode.classList.add('tabs');
        $$('.tabs-panel', box).forEach(function (p) { var on = p.id === t; p.classList.toggle('tabs-panel-active', on); p.classList.toggle('tabs-panel-inactive', !on); if (on) unbake(p); });
      }
    },
    // @since 2026-10-03 @source wp-admin/js/common.js (screenMeta: Screen Options / Help panels) @verified 2026-10-03 @product sydney
    {
      label: 'screen-meta-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '#screen-meta-links .show-settings'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var b = up(el, '.show-settings'), p = document.getElementById(b.getAttribute('aria-controls')), wrap = $('#screen-meta'); if (!p || !wrap) return;
        var open = b.getAttribute('aria-expanded') !== 'true';
        $$('#screen-meta-links .show-settings').forEach(function (x) { if (x !== b) x.parentNode.style.visibility = open ? 'hidden' : ''; });
        b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.classList.toggle('screen-meta-active', open);
        wrap.style.display = open ? 'block' : 'none'; p.style.display = open ? 'block' : 'none'; unbake(wrap); unbake(p);
      }
    },
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
      apply: function (el, evt) { if (evt) evt.preventDefault(); live('Quick Edit Update', 'saves the item, works live only'); }
    },
    // ─ Block editor shell (portfolio / page edit screens) ────────────────
    // @since 2026-10-03 @source wp-includes/js/dist/editor (React editor; undo/redo, save, view, options, panels run live) @verified 2026-10-03 @product sydney
    {
      label: 'block-editor-ui',
      event: 'click',
      // 2026-10-07: block-editor chrome (.interface-interface-skeleton) is handled by the ported blk-* / parked-toggle entries.
      match: function (el) { return !!up(el, '.postbox-header button') && !up(el, '.interface-interface-skeleton, .sydney-dashboard'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var b = up(el, 'button');
        if (b.classList.contains('handlediv')) { var pb = up(b, '.postbox'); if (pb) { pb.classList.toggle('closed'); b.setAttribute('aria-expanded', pb.classList.contains('closed') ? 'false' : 'true'); return; } }
        live((b.getAttribute('aria-label') || b.textContent || 'editor control').trim(), 'block editor control, works live only');
      },
      order: 'last'
    },
    // ─ TinyMCE editors (Customizer modal / offcanvas content, classic fields) ─
    // @since 2026-10-03 @source wp-includes/js/tinymce (formatting runs on the live editor iframe) @verified 2026-10-03 @product sydney
    {
      label: 'tinymce-buttons',
      event: 'click',
      match: function (el) { return !!up(el, '.mce-toolbar .mce-btn, .wp-media-buttons .insert-media'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var b = up(el, '.mce-btn, .insert-media'); live((b.getAttribute('aria-label') || b.textContent || 'editor button').trim(), up(el, '.insert-media') ? 'opens the media library, works live only' : 'formats text in the live editor, works live only'); }
    },
    {
      label: 'tinymce-switch',
      event: 'click',
      match: function (el) { return !!up(el, '.wp-switch-editor.switch-html, .wp-switch-editor.switch-tmce'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var w = up(el, '.wp-editor-wrap'); if (!w) return; var html = !!up(el, '.switch-html');
        w.classList.toggle('html-active', html); w.classList.toggle('tmce-active', !html);
        var ta = w.querySelector('textarea.wp-editor-area'), ed = w.querySelector('.mce-tinymce, .mce-container.mce-panel');
        if (ta) { ta.style.display = html ? 'block' : 'none'; ta.removeAttribute('aria-hidden'); unbake(ta); } if (ed) ed.style.display = html ? 'none' : '';
        console.log('[snap] set: editor mode = ' + (html ? 'code' : 'visual'));
      }
    },
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:1092-1150 (Customizer display-conditions modal; options load over AJAX) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-conditions',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.sydney-display-conditions-control .sydney-display-conditions-modal-toggle, .customize-control .sydney-display-conditions-modal-toggle, .customize-control a.button-primary[href="#"]') && !!up(el, '.customize-control'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var c = up(el, '.customize-control'), m = c && c.querySelector('.sydney-display-conditions-modal');
        if (m && m.querySelector('.sydney-display-conditions-modal-content')) { unbake(m); m.classList.toggle('open'); return; }
        live('Display conditions', 'loads the condition rules over AJAX and saves them, works live only');
      }
    },
    // ─ Customizer: root list → section / panel snapshots ─────────────────
    // @since 2026-10-03 @source wp-admin/js/customize-controls.js (core: section/panel title expands it) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-open-section',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, 'li.accordion-section > .accordion-section-title, li.control-panel > .accordion-section-title'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var li = up(el, 'li.accordion-section, li.control-panel');
        var m = (li.id || '').match(/^accordion-(section|panel)-(.+)$/); if (!m) return;
        gotoSection(m[1], m[2]);
      }
    },
    {
      label: 'customizer-back',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.customize-section-back, .customize-panel-back'); },
      apply: function (el, evt) { if (evt) evt.__snapHandled = true; R.goto('admin-customizer'); }
    },
    // ─ Customizer: General / Style tabs ──────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:681-696 @verified 2026-10-03 @product sydney
    {
      label: 'customizer-tab',
      event: 'click',
      match: function (el) { return !!up(el, '.customize-control-sydney-tab-control .control-tab'); },
      apply: function (el) {
        var tab = up(el, '.control-tab'), list = []; try { list = JSON.parse(tab.getAttribute('data-connected') || '[]'); } catch (e) { list = []; }
        tab.classList.add('active');
        $$('.control-tab', tab.parentNode).forEach(function (t) { if (t !== tab) t.classList.remove('active'); });
        var sec = up(tab, 'ul.accordion-section-content, .customize-pane-child') || document;
        $$('li', sec).forEach(function (li) { if (!li.classList.contains('section-meta') && !li.classList.contains('customize-control-sydney-tab-control') && li.parentNode === sec) li.classList.add('sydney-hide-control'); });
        list.forEach(function (s) { $$(s).forEach(function (c) { c.classList.remove('sydney-hide-control'); unbake(c); }); });
      },
      state: function (el) { return { key: 'customizer.tab', value: up(el, '.control-tab').textContent.trim() }; }
    },
    // ─ Customizer: device switches (footer + per-control) ────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:366-411 @verified 2026-10-03 @product sydney
    {
      label: 'customizer-device',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.wp-full-overlay-footer .devices button[data-device], .sydney-devices-preview button'); },
      apply: function (el) {
        var b = up(el, 'button'), d = b.getAttribute('data-device');
        if (!d) d = b.classList.contains('preview-tablet') ? 'tablet' : b.classList.contains('preview-mobile') ? 'mobile' : 'desktop';
        $$('.wp-full-overlay-footer .devices button[data-device]').forEach(function (x) { var on = x.getAttribute('data-device') === d; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        var o = $('.wp-full-overlay'); if (o) { o.classList.remove('preview-desktop', 'preview-tablet', 'preview-mobile'); o.classList.add('preview-' + d); }
        $$('.sydney-devices-preview').forEach(function (g) { $$('.preview-desktop, .preview-tablet, .preview-mobile', g).forEach(function (x) { x.classList.toggle('active', x.classList.contains('preview-' + d)); }); });
        ['font-size', 'responsive-control'].forEach(function (p) { $$('.' + p + '-desktop, .' + p + '-tablet, .' + p + '-mobile').forEach(function (x) { var on = x.classList.contains(p + '-' + d); x.classList.toggle('active', on); if (on) unbake(x); }); });
      },
      state: function (el) { var b = up(el, 'button'); return { key: 'customizer.device', value: b.getAttribute('data-device') || b.className }; }
    },
    {
      label: 'customizer-collapse',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.collapse-sidebar'); },
      apply: function () {
        var o = $('.wp-full-overlay'); if (!o) return;
        var exp = o.classList.contains('expanded');
        o.classList.toggle('expanded', !exp); o.classList.toggle('collapsed', exp);
        var b = $('.collapse-sidebar'); if (b) b.setAttribute('aria-expanded', exp ? 'false' : 'true');
      }
    },
    // ─ Customizer: range slider ↔ number box ─────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/inc/customizer/controls/responsive-slider/class_sydney_responsive_slider.php:46-57 (range + number pair) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-range',
      event: 'input',
      match: function (el) { return !!up(el, '.range-slider') && (el.classList.contains('range-slider__range') || el.classList.contains('range-slider__value')); },
      apply: function (el) {
        var w = up(el, '.range-slider'), other = $(el.classList.contains('range-slider__range') ? '.range-slider__value' : '.range-slider__range', w);
        if (other) { other.value = el.value; other.setAttribute('value', el.value); }
        el.setAttribute('value', el.value);
      },
      state: function (el) { var c = up(el, '.customize-control'); return { key: 'customizer.range.' + (c ? c.id : ''), value: el.value }; }
    },
    // ─ Customizer: Pickr colour popover (parked by park-pickr) ───────────
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:579-640 @verified 2026-10-03 @product sydney
    {
      label: 'customizer-color-open',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-color-picker'); },
      apply: function (el) {
        var p = up(el, '.sydney-color-picker');
        var open = $('.sydney-pcr-app.visible[data-snap-for]');
        if (open) { var same = open.__for === p; open.remove(); if (same) return; }
        var inp = up(p, '.customize-control').querySelector('.sydney-color-input');
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
      label: 'customizer-color-input',
      event: 'change',
      match: function (el) { return !!up(el, '.sydney-pcr-app[data-snap-for] .pcr-result'); },
      apply: function (el) {
        var app = up(el, '.sydney-pcr-app'), p = app.__for, col = el.value.trim(); if (!p || !col) return;
        p.style.backgroundColor = col;
        var inp = up(p, '.customize-control').querySelector('.sydney-color-input'); if (inp) { inp.value = col; inp.setAttribute('value', col); }
      },
      state: function (el) { return { key: 'customizer.color.' + up(el, '.sydney-pcr-app').getAttribute('data-snap-for'), value: el.value }; }
    },
    {
      label: 'customizer-color-clear',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-pcr-app[data-snap-for] .pcr-clear'); },
      apply: function (el) {
        var app = up(el, '.sydney-pcr-app'), p = app.__for; if (!p) return;
        var col = p.getAttribute('data-default-color') || ''; p.style.backgroundColor = col;
        var res = app.querySelector('.pcr-result'); if (res) res.value = col;
      }
    },
    {
      label: 'customizer-color-close',
      event: 'click',
      match: function (el) { return !!$('.sydney-pcr-app.visible[data-snap-for]') && !up(el, '.sydney-pcr-app, .sydney-color-picker'); },
      apply: function () { $$('.sydney-pcr-app.visible[data-snap-for]').forEach(function (a) { a.remove(); }); },
      order: 'last'
    },
    // ─ Customizer: global colour link dropdown ───────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:530-576 @verified 2026-10-03 @product sydney
    {
      label: 'customizer-global-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-global-control .dashicons'); },
      apply: function (el) {
        var d = up(el, '.dashicons').nextElementSibling; if (!d || !d.classList.contains('global-colors-dropdown')) return;
        $$('.global-colors-dropdown.show').forEach(function (x) { if (x !== d) x.classList.remove('show'); });
        unbake(d); d.classList.toggle('show');
      }
    },
    {
      label: 'customizer-global-pick',
      event: 'click',
      match: function (el) { return !!up(el, '.global-colors-dropdown .global-color'); },
      apply: function (el) {
        var g = up(el, '.global-color'), dd = up(g, '.global-colors-dropdown'), icon = dd.previousElementSibling;
        var on = !g.classList.contains('active');
        $$('.global-color', dd).forEach(function (x) { x.classList.remove('active'); });
        g.classList.toggle('active', on); if (icon) icon.classList.toggle('active', on);
        var hid = dd.nextElementSibling; if (hid && hid.classList.contains('sydney-connected-global')) hid.value = on ? g.getAttribute('data-global-setting') : '';
        if (on) { var ctl = up(dd, '.customize-control'), p = ctl && ctl.querySelector('.sydney-color-picker'); if (p) p.style.backgroundColor = g.getAttribute('data-color'); }
      },
      state: function (el) { return { key: 'customizer.global.' + (up(el, '.customize-control') || {}).id, value: up(el, '.global-color').getAttribute('data-global-setting') }; }
    },
    {
      label: 'customizer-global-close',
      event: 'click',
      match: function (el) { return !!$('.global-colors-dropdown.show') && !up(el, '.sydney-global-control'); },
      apply: function () { $$('.global-colors-dropdown.show').forEach(function (x) { x.classList.remove('show'); }); },
      order: 'last'
    },
    // ─ Customizer: select2 (font family / weight), parked by park-select2 ─
    // @since 2026-10-03 @source sydney-pro-ii/inc/customizer/controls/typography/script.js:5-9; select2 4.x open/close @verified 2026-10-03 @product sydney
    {
      label: 'select2-open',
      event: 'click',
      match: function (el) { return !!up(el, '.select2-container .select2-selection') && !up(el, 'body > .select2-container'); },
      apply: function (el) {
        var box = up(el, '.select2-container'), sel = box.previousElementSibling;
        var cur = $('body > .select2-container[data-snap-for]');
        if (cur) { var same = cur.__box === box; closeSelect2(); if (same) return; }
        var ctl = up(box, '.customize-control') || up(box, '.sydney-display-conditions-modal-content-list-item, .template-item, form, .wrap'); if (!ctl || !sel) return;
        var idx = $$('select.select2-hidden-accessible', ctl).indexOf(sel);
        var key = (ctl.id || 'sel') + ':' + idx, f = ctl.id ? frag('select2-' + key) : null;
        // Not parked (dashboard condition fields): select2 renders its list from the <select>'s own options; an AJAX-backed
        // id field (minimumInputLength 1, sydney-dashboard.js:412-441) shows select2's "enter 1 or more characters" prompt.
        if (!f) f = select2FromSelect(sel);
        var c = f.firstElementChild; document.body.appendChild(f);
        c.setAttribute('data-snap-for', key); c.__box = box; c.__sel = sel;
        var r = box.getBoundingClientRect();
        c.classList.add('select2-container--open');
        c.style.position = 'absolute'; c.style.left = (r.left + window.scrollX) + 'px'; c.style.top = (r.bottom + window.scrollY) + 'px'; c.style.width = r.width + 'px'; c.style.zIndex = '600000';
        var dd = c.querySelector('.select2-dropdown'); if (dd) { dd.style.width = r.width + 'px'; dd.classList.add('select2-dropdown--below'); }
        box.classList.add('select2-container--open', 'select2-container--below');
        var s = c.querySelector('.select2-search__field'); if (s) { s.value = ''; s.focus(); }
      }
    },
    // select2's own matcher: case-insensitive substring; the list shows only the matches, first one highlighted.
    {
      label: 'select2-search',
      event: 'input',
      match: function (el) { return !!up(el, 'body > .select2-container[data-snap-for] .select2-search__field'); },
      apply: function (el) { filterSelect2(up(el, '.select2-container'), el.value); }
    },
    {
      label: 'select2-search-keyup',
      event: 'keyup',
      match: function (el, evt) { return !!up(el, 'body > .select2-container[data-snap-for] .select2-search__field') && !(evt && /^(Enter|ArrowUp|ArrowDown|Escape)$/.test(evt.key)); },
      apply: function (el) { var c = up(el, '.select2-container'); if (c.__q !== el.value) filterSelect2(c, el.value); }
    },
    {
      label: 'select2-keys',
      event: 'keydown',
      match: function (el, evt) { return !!up(el, 'body > .select2-container[data-snap-for]') && !!evt && /^(Enter|ArrowUp|ArrowDown|Escape)$/.test(evt.key); },
      apply: function (el, evt) {
        var c = up(el, '.select2-container'); evt.preventDefault();
        if (evt.key === 'Escape') { closeSelect2(); return; }
        var opts = $$('.select2-results__option:not(.select2-results__message)', c), h = $('.select2-results__option--highlighted', c), i = opts.indexOf(h);
        if (evt.key === 'Enter') { if (h) pickSelect2(c, h); return; }
        i = evt.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1);
        opts.forEach(function (x, j) { x.classList.toggle('select2-results__option--highlighted', j === i); });
        if (opts[i]) opts[i].scrollIntoView({ block: 'nearest' });
      }
    },
    {
      label: 'select2-pick',
      event: 'click',
      match: function (el) { return !!up(el, 'body > .select2-container[data-snap-for] .select2-results__option:not(.select2-results__message)'); },
      apply: function (el) { pickSelect2(up(el, '.select2-container'), up(el, '.select2-results__option')); },
      state: function (el) { return { key: 'select2.' + up(el, '.select2-container').getAttribute('data-snap-for'), value: up(el, '.select2-results__option').textContent.trim() }; }
    },
    {
      label: 'select2-hover',
      event: 'mouseover',
      match: function (el) { return !!up(el, 'body > .select2-container[data-snap-for] .select2-results__option'); },
      apply: function (el) { var li = up(el, '.select2-results__option'); $$('.select2-results__option--highlighted', up(li, '.select2-results')).forEach(function (x) { x.classList.remove('select2-results__option--highlighted'); }); li.classList.add('select2-results__option--highlighted'); }
    },
    {
      label: 'select2-close',
      event: 'click',
      match: function (el) { return !!$('body > .select2-container[data-snap-for]') && !up(el, 'body > .select2-container, .select2-selection'); },
      apply: function () { closeSelect2(); },
      order: 'last'
    },
    // ─ Customizer: header preset → preview shows that layout ─────────────
    // @since 2026-10-03 @source sydney-pro-ii/inc/modules/hf-builder/assets/js/admin/sydney-shfb.js:1155-1258 (preset rewrites rows; preview refreshes) @verified 2026-10-03 @product sydney
    // The preview is the matching frontend snapshot (frontend-home--header-layout-<n>) when one was captured.
    {
      label: 'customizer-header-preset',
      event: 'change',
      match: function (el) { return el.type === 'radio' && /header_preset_layout/.test(el.name || el.getAttribute('data-customize-setting-link') || ''); },
      apply: function (el) {
        var n = String(el.value).replace(/\D/g, ''), slug = 'frontend-home--header-layout-' + n, f = $('iframe[data-snap-preview]');
        console.log('[snap] set: header preset = ' + el.value);
        if (!f) return;
        var m = R.navMap(), known = !!m && Object.keys(m.k).some(function (k) { return m.k[k] === slug; });
        if (known) { f.setAttribute('src', '../' + slug + '/index.html'); f.setAttribute('data-snap-preview', slug); }
        else R.miss(slug, 'preview for this preset not captured yet');
      },
      state: function (el) { return { key: 'customizer.header_preset', value: el.value }; }
    },
    // @since 2026-10-03 @source wp-admin/js/customize-controls.js (core Publish / Save Draft / Schedule) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-publish-guard',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '#save, #publish-settings, .customize-save-button-wrapper button'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); live('Customizer Publish', 'saves theme mods, works live only'); }
    },

    // ─ Customizer: header/footer builder grid ───────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/inc/modules/hf-builder/assets/js/admin/sydney-shfb.js:181-214 (chips focus their section; device links switch the grid) @verified 2026-10-03 @product sydney
    {
      label: 'shfb-chip',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.shfb-button[data-shfb-focus-section]') && !up(el, '.shfb-remove-element'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var btn = up(el, '.shfb-button'), id = btn.getAttribute('data-shfb-focus-section');
        // B1 (2026-10-06) kept one snapshot per control family: Widget Area 2–4, Button 2, HTML 2… resolve to the one kept.
        // When that is THIS screen, say so beside the chip instead of a silent no-op.
        var to = R.resolveHref('customize.php?autofocus[section]=' + id);
        if (to && to === R.currentSlug()) {
          var old = document.querySelector('.snap-live-tip'); if (old) old.remove();
          var r = btn.getBoundingClientRect(), tip = document.createElement('span'); tip.className = 'snap-live-tip'; tip.setAttribute('role', 'status');
          tip.textContent = (btn.textContent || 'This component').trim() + ' has the same settings as the one shown here';
          tip.style.cssText = 'position:fixed;z-index:2147483647;left:' + Math.max(8, Math.min(r.left, innerWidth - 320)) + 'px;top:' + Math.max(8, r.top - 34) + 'px;background:#1d2327;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:6px 10px;border-radius:4px;pointer-events:none;white-space:nowrap';
          document.body.appendChild(tip); setTimeout(function () { if (tip.parentNode) tip.remove(); }, 2200);
          console.info('[snap] ' + id + ' shares this screen (one capture per control family)');
          return;
        }
        gotoSection('section', id);
      }
    },
    {
      label: 'shfb-device',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.sydney-shfb-devices .sydney-shfb-device-link'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var d = up(el, '.sydney-shfb-device-link').getAttribute('data-device');
        $$('.sydney-shfb-devices .sydney-shfb-device-link').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-device') === d); });
        $$('.wp-full-overlay-footer .devices button[data-device]').forEach(function (x) { var on = x.getAttribute('data-device') === d; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        var o = $('.wp-full-overlay'); if (o) { o.classList.remove('preview-desktop', 'preview-tablet', 'preview-mobile'); o.classList.add('preview-' + d); }
        // sydney-shfb.css:787-814 swaps the header grid off .wp-full-overlay.preview-tablet/-mobile (footer builder: desktop only);
        // the capture baked the hidden grid's display, so clear it and let the theme CSS decide.
        $$('.sydney-shfb .sydney-shfb-desktop, .sydney-shfb .sydney-shfb-mobile, .sydney-shfb .sydney-shfb-elements-desktop, .sydney-shfb .sydney-header-builder-available-mobile-components, .shfb-available-columns-desktop, #customize-control-sydney_section_hb_wrapper__header_builder_available_components').forEach(unbake);
        console.log('[snap] set: header builder device = ' + d);
      },
      state: function (el) { return { key: 'shfb.device', value: up(el, '.sydney-shfb-device-link').getAttribute('data-device') }; }
    },
    // ─ Customizer: Style Book overlay ───────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/inc/customizer/style-book/js/scripts.js:7-28 (toggle shows/hides .sydney-style-book; close hides it) @verified 2026-10-03 @product sydney
    {
      label: 'stylebook-toggle',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.sydney-style-book-toggle, #accordion-section-sydney_stylebook_toggle'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var sb = $('.sydney-style-book');
        if (sb) { unbake(sb); sb.style.display = sb.style.display === 'none' ? '' : 'none'; return; }
        R.goto('admin-customizer-stylebook-toggle');
      }
    },
    {
      label: 'stylebook-close',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-style-book-close'); },
      apply: function () { var sb = $('.sydney-style-book'); if (sb) sb.style.display = 'none'; }
    },
    {
      label: 'stylebook-nav',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-style-book-nav-link[href^="#"]'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var a = up(el, '.sydney-style-book-nav-link'), t = document.getElementById(a.getAttribute('href').slice(1));
        $$('.sydney-style-book-nav-link').forEach(function (x) { x.classList.toggle('active', x === a); });
        if (t) t.scrollIntoView({ block: 'start', behavior: R.motion === 'off' ? 'auto' : 'smooth' });
        console.log('[snap] set: style book section = ' + a.getAttribute('data-section'));
      }
    },
    // @since 2026-10-03 @source sydney-pro-ii/js/customize-controls.js:8 (.sydney-to-widget-area-link href="javascript:wp.customize.section('<id>').focus()") @verified 2026-10-03 @product sydney
    // core.js swallows javascript: links; this one opens the section / panel it names.
    {
      label: 'customizer-js-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href^="javascript:wp.customize"]'); return isCustomizer && !!a; },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var m = up(el, 'a').getAttribute('href').match(/wp\.customize\.(section|panel|control)\(\s*['"]([^'"]+)['"]/);
        // The block-widget areas run the block editor inside the Customizer: not frozen (capture timed out / lost its pane).
        if (m && /^sidebar-widgets-/.test(m[2])) { live('widget area ' + m[2].replace('sidebar-widgets-', ''), 'opens the block widget editor, works live only'); return; }
        if (m && m[1] !== 'control') gotoSection(m[1], m[2]);
        else if (m && CONTROL_SECTION[m[2]]) gotoSection('section', CONTROL_SECTION[m[2]]);
        else if (m) R.miss('control ' + m[2], 'Customizer control link not captured yet');
      }
    },
    // @since 2026-10-03 @source wp-includes/js/media-views.js (core media frame opens over the Customizer) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-media-button',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.customize-control .upload-button, .customize-control .remove-button, .customize-control .button.new, .customize-control-media .thumbnail-image, .customize-control-cropped_image .thumbnail-image'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var b = up(el, 'button, img, .thumbnail-image'); live((b && b.textContent.trim()) || 'media', 'opens the WordPress media library and saves the image, works live only'); }
    },
    // @since 2026-10-03 @source wp-admin/js/customize-controls.js (core .customize-help-toggle opens the panel description) @verified 2026-10-03 @product sydney
    {
      label: 'customizer-help',
      event: 'click',
      match: function (el) { return isCustomizer && !!up(el, '.customize-help-toggle'); },
      apply: function (el) {
        var b = up(el, '.customize-help-toggle'), info = up(b, '.customize-info'), d = info && info.querySelector('.customize-panel-description, .customize-section-description');
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (info) info.classList.toggle('open', open);
        if (d) { unbake(d); d.classList.toggle('open', open); if (open) R.slideDown(d, 200); else R.slideUp(d, 200); }
      }
    },
    // @since 2026-10-03 @source sydney-pro-ii/inc/customizer/controls/radio-buttons/ (native radios in labels) @verified 2026-10-03 @product sydney
    // The browser flips the radio; the log makes the swap visible to the click probe (radio flips look unchanged to it).
    {
      label: 'customizer-radio-log',
      event: 'change',
      match: function (el) { return isCustomizer && el.type === 'radio' && !!up(el, '.customize-control'); },
      apply: function (el) { console.log('[snap] set: ' + (up(el, '.customize-control').id || el.name) + ' = ' + el.value); },
      state: function (el) { return { key: 'customizer.radio.' + el.name, value: el.value }; }
    },

    // ─ Frontend: links that leave the site / reload this page ───────────
    // @since 2026-10-03 @source products/_runtime/core.js initNav (swallows every link; external apps and self-links get no feedback there) @verified 2026-10-03 @product sydney
    {
      label: 'external-app-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href]'); return !!a && /^(mailto|tel|sms):/i.test(a.getAttribute('href') || ''); },
      apply: function (el, evt) { if (evt) { evt.preventDefault(); evt.__snapHandled = true; } live(up(el, 'a').getAttribute('href'), 'opens an outside app, works live only'); }
    },
    // ─ External links: inline tip, never a new tab ──────────────────────
    // Shared shape, copied verbatim from products/botiga/qc/external-tip.snippet.js (worker f3; director ruling for all aThemes
    // packs, 2026-10-06); only EXT_LOGO and EXT_SITE_HOSTS changed for sydney, 2026-10-07.
    // @since 2026-10-06 @source director ruling (all aThemes packs): an off-site link (another host, or target=_blank to
    // another host) shows "Opens <host> in a new tab ↗" beside the link for ~2 s and opens nothing — a film or a viewer
    // is never thrown onto the live web. The product logo goes to the pack's own dashboard (EXT_LOGO); on that screen it
    // shows the tip too. @product sydney
    {
      label: 'external-tip',
      event: 'click',
      match: function (el) {
        var a = el.closest && el.closest('a[href]'); if (!a) return false;
        var EXT_LOGO = { sel: 'a.sydney-dashboard-top-bar-logo', slug: 'admin-dashboard' };
        if (a.matches(EXT_LOGO.sel)) return true;
        var EXT_SITE_HOSTS = ['northlinestudio.com', 'www.northlinestudio.com', 'localhost', '127.0.0.1', location.host];
        var u; try { u = new URL(a.getAttribute('href'), document.baseURI); } catch (e) { return false; }
        return /^https?:$/.test(u.protocol) && EXT_SITE_HOSTS.indexOf(u.host) === -1 && EXT_SITE_HOSTS.indexOf(u.hostname) === -1;
      },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var a = el.closest('a[href]');
        var EXT_LOGO = { sel: 'a.sydney-dashboard-top-bar-logo', slug: 'admin-dashboard' };
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
      label: 'self-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href]'); if (!a || up(a, '.sydney-dashboard-tabs-nav')) return false; var h = a.getAttribute('href') || ''; if (!h || h.charAt(0) === '#' || /^javascript:/i.test(h)) return false; var s = R.resolveHref(h); return !!s && s === R.currentSlug(); },
      // A live click reloads this same page; here it returns to the top, as the reload would.
      apply: function (el, evt) { if (evt) { evt.preventDefault(); evt.__snapHandled = true; } window.scrollTo(0, 0); console.log('[snap] self-link: this page (' + R.currentSlug() + ')'); }
    },
    // @since 2026-10-03 @source elementor/assets/js/frontend.js (video widget: image overlay opens the YouTube lightbox) @verified 2026-10-03 @product sydney
    {
      label: 'video-play',
      event: 'click',
      match: function (el) { return !!up(el, '.elementor-custom-embed-image-overlay, .elementor-custom-embed-play'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); live('video', 'plays the YouTube video, works live only'); }
    },

    // ─ Frontend: mobile offcanvas menu ───────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/functions.js:52-160 @verified 2026-10-03 @product sydney
    {
      label: 'mobile-menu-open',
      event: 'click',
      match: function (el) { return !!up(el, '.menu-toggle'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var b = up(el, '.menu-toggle'), oc = $('.sydney-offcanvas-menu');
        b.classList.add('open'); if (oc) { unbake(oc); oc.classList.add('toggled'); }
        document.body.classList.add('mobile-menu-visible');
      }
    },
    {
      label: 'mobile-menu-close',
      event: 'click',
      match: function (el) { return !!up(el, '.mobile-menu-close'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        $$('.menu-toggle.open').forEach(function (b) { b.classList.remove('open'); });
        $$('.sydney-offcanvas-menu.toggled').forEach(function (o) { o.classList.remove('toggled'); });
        document.body.classList.remove('mobile-menu-visible');
      }
    },
    {
      label: 'mobile-submenu-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-offcanvas-menu .dropdown-symbol'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var li = up(el, 'li'), sm = li && li.querySelector('.sub-menu'); if (sm) { unbake(sm); sm.classList.toggle('toggled'); } }
    },
    // ─ Frontend: header search ───────────────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/functions.js:811-937 @verified 2026-10-03 @product sydney
    {
      label: 'header-search-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.header-search') && !up(el, '.header-search-form'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var btn = up(el, '.header-search'), mobile = !!up(btn, '.shfb-mobile, .sydney-offcanvas-menu');
        var form = $(mobile ? '.shfb-mobile .header-search-form' : '.shfb-desktop .header-search-form') || $('.header-search-form');
        if (!form) return;
        unbake(form); form.classList.toggle('active');
        $$('.icon-search, .icon-cancel', btn).forEach(function (i) { i.classList.toggle('active'); });
        var oc = up(btn, '.sydney-offcanvas-menu'); if (oc) oc.classList.remove('toggled');
        var f = form.querySelector('.search-field'); if (f && form.classList.contains('active')) f.focus();
      }
    },
    {
      label: 'header-search-close',
      event: 'click',
      match: function (el) { return !!up(el, '.close-full-search') || (!!up(el, '.header-search-form.active') && !up(el, '.search-form')); },
      apply: function () {
        $$('.header-search-form.active').forEach(function (f) { f.classList.remove('active'); });
        $$('.header-search').forEach(function (b) { var c = b.querySelector('.icon-cancel'), s = b.querySelector('.icon-search'); if (c) c.classList.remove('active'); if (s) s.classList.add('active'); });
      }
    },
    // ─ Frontend: desktop dropdowns (keyboard / tap opens with .focus) ────
    // @since 2026-10-03 @source sydney-pro-ii/js/functions.js:198-261 @verified 2026-10-03 @product sydney
    // Hover needs no runtime (CSS :hover). A click on the arrow toggles .focus as the theme's touch handler does.
    {
      label: 'dropdown-arrow',
      event: 'click',
      match: function (el) { return !!up(el, '.shfb-desktop .dropdown-symbol, #masthead .dropdown-symbol'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var li = up(el, 'li'); if (!li) return;
        var on = !li.classList.contains('focus');
        $$('.shfb-desktop li.focus, #masthead li.focus').forEach(function (x) { if (x !== li && !x.contains(li)) x.classList.remove('focus', 'hovered'); });
        li.classList.toggle('focus', on); li.classList.toggle('hovered', on);
      }
    },
    // ─ Frontend: aThemes Portfolio filter tabs (Isotope) ────────────────
    // @since 2026-10-03 @source sydney-toolbox/js/main.js:131-160 (isotope filter on .sydney-portfolio-items) @verified 2026-10-03 @product sydney
    // Isotope's absolute positions were frozen at capture; the entry re-runs the same masonry on the visible items.
    {
      label: 'portfolio-filter',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-portfolio-filter a[data-filter]'); },
      apply: function (el, evt) {
        if (evt) { evt.preventDefault(); evt.__snapHandled = true; }
        var a = up(el, 'a[data-filter]'), f = a.getAttribute('data-filter'), wrap = up(a, '.elementor-widget-container, .sydney-portfolio-wrapper') || document;
        $$('.sydney-portfolio-filter a', wrap).forEach(function (x) { x.classList.toggle('active', x === a); });
        var box = $('.sydney-portfolio-items', wrap); if (!box) return;
        var items = $$(':scope > .sydney-portfolio-item', box);
        if (!box.__cols) { var lefts = []; items.forEach(function (i) { var l = i.offsetLeft; if (lefts.indexOf(l) === -1) lefts.push(l); }); box.__cols = lefts.sort(function (x, y) { return x - y; }); }
        var hs = box.__cols.map(function () { return 0; });
        items.forEach(function (i) {
          var on = f === '*' || i.matches(f);
          i.style.display = on ? '' : 'none'; if (!on) return;
          var c = hs.indexOf(Math.min.apply(null, hs));
          i.style.left = box.__cols[c] + 'px'; i.style.top = hs[c] + 'px'; i.style.position = 'absolute';
          hs[c] += i.offsetHeight;
        });
        box.style.height = Math.max.apply(null, hs) + 'px';
        console.log('[snap] set: portfolio filter = ' + f);
      },
      state: function (el) { return { key: 'portfolio.filter', value: up(el, 'a[data-filter]').getAttribute('data-filter') }; }
    },
    // ─ Frontend: modules ─────────────────────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/sydney-popup.js:56-120 (.has-popup opens #modalPopup: .show + .transition-effect; close button / overlay close) @verified 2026-10-03 @product sydney
    {
      label: 'modal-open',
      event: 'click',
      match: function (el) { return !!up(el, '.has-popup[data-popup-id]'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var m = document.getElementById(up(el, '.has-popup').getAttribute('data-popup-id')); if (!m) return;
        unbake(m); m.classList.add('show'); m.classList.add('transition-effect'); document.body.classList.add('disable-scroll');
      }
    },
    {
      label: 'modal-close',
      event: 'click',
      match: function (el) { var m = up(el, '.sydney-popup.show'); return !!m && (!!up(el, '.sydney-popup-wrapper__close-button') || !up(el, '.sydney-popup-wrapper')); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var m = up(el, '.sydney-popup'); m.classList.remove('show', 'transition-effect'); document.body.classList.remove('disable-scroll'); }
    },
    // @since 2026-10-03 @source sydney-pro-ii/js/functions.js:1270-1297 (offcanvas trigger toggles .is-visible; close button / Esc) @verified 2026-10-03 @product sydney
    {
      label: 'offcanvas-toggle',
      event: 'click',
      match: function (el) { var oc = $('.sydney-offcanvas-content[data-trigger]'); if (!oc) return false; try { return !!up(el, oc.getAttribute('data-trigger')); } catch (e) { return false; } },
      apply: function (el, evt) { if (evt) { evt.preventDefault(); evt.__snapHandled = true; } var oc = $('.sydney-offcanvas-content[data-trigger]'); unbake(oc); oc.classList.toggle('is-visible'); }
    },
    {
      label: 'offcanvas-close',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-offcanvas-close'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); $$('.sydney-offcanvas-content.is-visible').forEach(function (o) { o.classList.remove('is-visible'); }); }
    },
    // @since 2026-10-03 @source sydney-pro-ii/js/modules/live-chat.js:18 (.live-chat-button toggles .live-chat-open) @verified 2026-10-03 @product sydney
    {
      label: 'live-chat-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.sydney-whatsapp-live-chat .live-chat-button') && !up(el, '.live-chat-popup'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var w = up(el, '.sydney-whatsapp-live-chat'); unbake(w); w.classList.toggle('live-chat-open'); }
    },
    // ─ Frontend: back to top ─────────────────────────────────────────────
    // @since 2026-10-03 @source sydney-pro-ii/js/functions.js:316-357 @verified 2026-10-03 @product sydney
    {
      label: 'go-top',
      event: 'click',
      match: function (el) { return !!up(el, '.go-top'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); window.scrollTo({ top: 0, behavior: R.motion === 'off' ? 'auto' : 'smooth' }); }
    },
    // @since 2026-10-03 @source wpforms-lite/assets/js/frontend/wpforms.js (submit sends the form + notification mail) @verified 2026-10-03 @product sydney
    {
      label: 'form-submit-guard',
      event: 'click',
      match: function (el) { return !!up(el, '.wpforms-submit, #commentform #submit, .comment-form .submit'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); live('form submit', 'sends a message, works live only'); }
    }
  ], P);

  function closeQuickEdit(ed) {
    if (!ed) return; var id = ed.id.replace('edit-', '');
    var row = document.getElementById('post-' + id) || document.getElementById('tag-' + id); if (row) row.style.display = '';
    ed.remove();
  }
  function select2FromSelect(sel) {
    var frg = document.createDocumentFragment(), c = document.createElement('span');
    c.className = 'select2-container select2-container--default';
    var opts = $$('option', sel).filter(function (o) { return o.textContent.trim() !== ''; });
    var ajax = opts.length <= 1 && /id|ajax/i.test(sel.className + ' ' + (sel.name || '') + ' ' + (sel.getAttribute('data-ajax') || ''));
    var lis = ajax ? '<li class="select2-results__option select2-results__message" role="alert">Please enter 1 or more characters</li>'
      : opts.map(function (o) { return '<li class="select2-results__option' + (o.selected ? ' select2-results__option--selected' : '') + '" role="option" aria-selected="' + (o.selected ? 'true' : 'false') + '">' + o.textContent.trim().replace(/</g, '&lt;') + '</li>'; }).join('');
    c.innerHTML = '<span class="select2-dropdown" dir="ltr"><span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="0" autocomplete="off" role="searchbox"></span><span class="select2-results"><ul class="select2-results__options" role="listbox">' + lis + '</ul></span></span>';
    frg.appendChild(c); return frg;
  }
  function filterSelect2(c, value) {
    var ul = c.querySelector('.select2-results__options'); if (!ul) return;
    if (!c.__all) c.__all = $$('.select2-results__option:not(.select2-results__message)', ul);
    var q = String(value || '').trim().toLowerCase(); c.__q = value;
    var hits = c.__all.filter(function (li) { return !q || li.textContent.toLowerCase().indexOf(q) !== -1; });
    ul.innerHTML = '';
    hits.forEach(function (li, i) { li.classList.toggle('select2-results__option--highlighted', i === 0); ul.appendChild(li); });
    if (!hits.length) { var msg = document.createElement('li'); msg.className = 'select2-results__option select2-results__message'; msg.setAttribute('role', 'alert'); msg.setAttribute('aria-live', 'assertive'); msg.textContent = 'No results found'; ul.appendChild(msg); }
    ul.scrollTop = 0;
  }
  function pickSelect2(c, li) {
    var box = c.__box, sel = c.__sel, txt = li.textContent.trim();
    (c.__all || $$('.select2-results__option', c)).forEach(function (x) { x.setAttribute('aria-selected', x === li ? 'true' : 'false'); x.classList.toggle('select2-results__option--selected', x === li); });
    var r = box && box.querySelector('.select2-selection__rendered'); if (r) { r.textContent = txt; r.setAttribute('title', txt); }
    if (sel) { var o = $$('option', sel).filter(function (x) { return x.textContent.trim() === txt || x.value === txt; })[0]; if (o) sel.value = o.value; }
    console.log('[snap] set: ' + c.getAttribute('data-snap-for') + ' = ' + txt);
    closeSelect2();
  }
  function closeSelect2() {
    $$('body > .select2-container[data-snap-for]').forEach(function (c) { if (c.__box) c.__box.classList.remove('select2-container--open', 'select2-container--below'); c.remove(); });
  }
})();
