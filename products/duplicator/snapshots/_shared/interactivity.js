/**
 * Duplicator Pro snapshot transitions.
 *
 * Third of the three script tags tools/link-interactivity-script.js injects:
 *   ../../../_runtime/core.js  →  ../_shared/nav.js  →  this file.
 * core.js defines window.SnapRuntime during parse, so it is here by the time
 * this IIFE runs. Nothing in here may reference the WPForms runtime.
 *
 * Entries keep the proven shape { label, event, match(el), apply(el) } and each
 * block opens with a provenance banner that tools/field-state.js parses:
 *
 *   // ─ <label> ────────────────────────────────────────────────────────────
 *   // @since <date> @source duplicator-pro/<path>:<line> @verified <date> @product duplicator
 *
 * `@source synthetic` is banned (anti-pattern #6 / INV-15). Every entry mirrors
 * what the plugin's own JS does and is checked by tools/behavior-parity.js
 * (products/duplicator/qc/parity.json). Plugin source: duplicator-pro 5.0.4.
 * Behaviours: products/duplicator/inventory/interactions.md (Phase 7).
 *
 * How this pack works (read before adding an entry):
 *
 * 1. The plugin's own libraries run (PLAN T12). Almost all of Duplicator's JS
 *    is inline <script> in its PHP templates, which the capture strips; what it
 *    calls lives in libraries the page loaded. Those are vendored byte for byte
 *    in ../_shared/lib/ and loaded on every page through SnapRuntime.lib():
 *    WordPress's jQuery 3.7.1 + Migrate, WordPress's ThickBox (every alert and
 *    confirm is tb_show() of hidden markup the page already prints,
 *    src/Views/UI/UiDialog.php:137-143), the plugin's vendor bundle (tippy
 *    tooltips through DuplicatorTooltip, the dynamic help) and
 *    DuplicatorModalBox. Tooltips are the plugin's own DuplicatorTooltip.load()
 *    (assets/js/javascript.php:309); no tooltip is drawn here.
 *
 * 2. The capture keeps the plugin's inline on* attributes
 *    (onclick="DupliJs.Pack.ConfirmDelete()", onclick="tb_remove();",
 *    onclick="jQuery('#size-more-details').toggle(400)"). With jQuery and
 *    ThickBox loaded, the ones that only call libraries now work as live — they
 *    are the plugin's own code, so no entry sits on top of them (DESIGN
 *    WO-202J). The functions the others name were defined in the stripped
 *    inline scripts; each is defined here as a no-op (inlineStubs below) so the
 *    click does not throw, and what the function did is the registered entry
 *    that matches the same control. Download, AJAX save and delete functions
 *    stay no-ops for good: that is the "never" half of every hazard row.
 *
 * 3. A confirm opens exactly as live; its Yes / OK never runs the write. Where
 *    the Yes has no tb_remove() of its own it closes the dialog (entry
 *    `dialog-confirm-no-write`), instead of the live progress spinner that would
 *    wait on an AJAX answer forever.
 *
 * 4. SnapRuntime.motion 'off' sets jQuery.fx.off, so ThickBox's close fade and
 *    every jQuery effect follow the switch (DESIGN WO-202I).
 *
 * 5. The plugin's ready steps (tooltips, the capabilities select2) are entries
 *    on a one-shot `dup:ready` on <body>, fired once core has booted and the
 *    libraries are in. The Help button reads the captured help answer
 *    (admin-help-<tag>) from a hidden same-origin frame and hands its HTML to
 *    DuplicatorModalBox, as live hands it the AJAX answer: no fetch.
 *
 * 6. An answer the capture did not park (storage details, template JSON, user
 *    search, validator results) and every write, download, installer or remote
 *    call is a logged miss (SnapRuntime.miss) naming the endpoint — never drawn.
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // ── small helpers ────────────────────────────────────────────────────────
  function closestTo(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function is(el, sel) { try { return !!el && !!el.matches && el.matches(sel); } catch (_) { return false; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function show(nodes, on) { R.toggleTarget(nodes, on, { mode: 'display' }); }   // jQuery .show() / .hide()
  function noDisplay(nodes, on) { R.toggleTarget(nodes, on, { mode: 'class', cls: 'no-display' }); }
  function jq() { return window.jQuery || null; }
  // modal-box.js declares `class DuplicatorModalBox` at the top level of a
  // classic script: a global binding, not a window property.
  function modalBoxClass() {
    /* global DuplicatorModalBox */
    return typeof DuplicatorModalBox === 'function' ? DuplicatorModalBox : null;
  }
  // The Backups list's download menus (the detail page's header menu has its
  // own handlers, packages/details/detail.php:72-89).
  function listMenus() {
    return all('nav.dup-dnload-menu-items').filter(function (n) { return !closestTo(n, '.dupli-detail-dnload'); });
  }

  // The URL this snapshot was taken at, as the nav map keys it (the key whose
  // slug is this snapshot). Used where the plugin built a URL from its own
  // location (the help tag, the transfer / detail hops).
  function ownParams() {
    var m = R.navMap();
    var slug = R.currentSlug();
    if (!m || !m.k) return null;
    var best = null;
    Object.keys(m.k).forEach(function (k) {
      if (m.k[k] !== slug) return;
      if (best === null || k.length > best.length) best = k;   // the most specific alias
    });
    if (best === null) return null;
    var q = best.indexOf('?') >= 0 ? best.slice(best.indexOf('?') + 1) : '';
    var out = {};
    q.split('&').forEach(function (p) {
      if (!p) return;
      var i = p.indexOf('=');
      out[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? '' : decodeURIComponent(p.slice(i + 1));
    });
    return out;
  }

  // Hop to the screen a plugin URL names, or log the miss (a miss beats a wrong hop).
  function hop(href, note) {
    var hit = R.resolve(href);
    if (hit) { R.goto(hit.slug, hit.params && hit.params.length ? { params: hit.params } : null); return true; }
    R.miss(href, note);
    return false;
  }

  // ── the plugin's libraries (PLAN T12) ────────────────────────────────────
  var LIB = '../_shared/lib/';
  // wp-includes/script-loader.php:995-1007 — ThickBox's localized strings,
  // printed before thickbox.js on every page that enqueues it.
  window.thickboxL10n = window.thickboxL10n || {
    next: 'Next &gt;', prev: '&lt; Prev', image: 'Image', of: 'of', close: 'Close',
    noiframes: 'This feature requires inline frames. You have iframes disabled or your browser does not support them.',
    loadingAnimation: LIB + 'loadingAnimation.gif'
  };
  if (typeof window.tb_pathToImage !== 'string') window.tb_pathToImage = LIB + 'loadingAnimation.gif';

  function syncFx() { var $ = jq(); if ($ && $.fx) $.fx.off = R.motion === 'off'; }

  var libsReady = R.lib([
    LIB + 'jquery.min.js',
    LIB + 'jquery-migrate.min.js',
    LIB + 'plugin-vendor.min.js',
    LIB + 'modal-box.js',
    LIB + 'thickbox.js'
  ]).then(function (ok) {
    if (!ok) return false;
    syncFx();
    // Some tooltips carry HTML with the plugin's own icons by absolute URL
    // (the Backups list flags tooltip, template/admin_pages/packages/
    // row_parts/…): the capture rewrites DOM assets, not HTML inside an
    // attribute. Those icons are vendored in lib/plugin/ (MANIFEST.json);
    // point the URLs there before tippy builds the content.
    // The storage list's delete confirm builds its body the same way, from
    // each row's data-delete-view (storages/storage_list.php:246-249).
    all('[data-tooltip], [data-delete-view]').forEach(function (el) {
      ['data-tooltip', 'data-delete-view'].forEach(function (a) {
        var t = el.getAttribute(a);
        if (t && /\/wp-content\/plugins\/duplicator-pro\//.test(t)) {
          el.setAttribute(a, t.replace(/https?:\/\/[a-z0-9.-]+\/wp-content\/plugins\/duplicator-pro\//gi, LIB + 'plugin/'));
        }
      });
    });
    return true;
  });
  // The plugin's own ready steps run as registered entries on a one-shot
  // `dup:ready` on <body>, once core has booted and the libraries are in
  // (the WP Mail SMTP `wpms:ready` pattern, DESIGN WO-202F; core gains no
  // boot hook).
  libsReady.then(function (ok) {
    if (!ok) return;
    var fire = function () {
      setTimeout(function () {
        try { document.body.dispatchEvent(new CustomEvent('dup:ready', { bubbles: true })); }
        catch (err) { console.error('[snap] dup:ready', err); }
      }, 0);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fire);
    else fire();
  });
  function withLibs(fn) {
    libsReady.then(function (ok) {
      if (!ok) { console.info('[snap] duplicator libraries did not load — left as captured'); return; }
      syncFx();
      try { fn(jq()); } catch (err) { console.error('[snap]', err); }
    });
  }

  // ── inline on* attributes whose functions the capture stripped ───────────
  // See the header, point 2. Only plugin names are stubbed: DupliJs.* paths,
  // the per-dialog progress functions UiDialog prints (__dupli_dialog_N,
  // template/parts/dialogs/confirm_progress.php:21) and DuplicatorReadPrivateKey
  // (addons/ftpaddon/template/ftpaddon/configs/sftp.php:88). jQuery, tb_* and
  // DuplicatorTooltip are real, loaded above.
  var STUB_NAME = /^(DupliJs(\.[A-Za-z_$][\w$]*)+|__dupli_dialog_\d+|DuplicatorReadPrivateKey)$/;
  function noop() { return false; }
  function stubPath(path) {
    var parts = path.split('.');
    var o = window;
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null) o[parts[i]] = {};
      o = o[parts[i]];
      if (typeof o !== 'object' && typeof o !== 'function') return;
    }
    var last = parts[parts.length - 1];
    if (typeof o[last] !== 'function') o[last] = noop;
  }
  function inlineStubs(root) {
    all('[onclick], [onchange], [onsubmit], [onkeyup], [oninput]', root).forEach(function (el) {
      ['onclick', 'onchange', 'onsubmit', 'onkeyup', 'oninput'].forEach(function (a) {
        var code = el.getAttribute(a);
        if (!code) return;
        var re = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g;
        var m;
        while ((m = re.exec(code))) { if (STUB_NAME.test(m[1])) stubPath(m[1]); }
      });
    });
  }
  inlineStubs(document);

  // ── ThickBox dialogs, the way UiDialog shows them ────────────────────────
  // src/Views/UI/UiDialog.php:137-143 (showAlert; showConfirm is the same):
  //   tb_show(title, '#TB_inline?width=W&height=H&inlineId=ID');
  //   #TB_window gets `height: Hpx !important` and the classes
  //   'dup-tb-wrapper dup-styles' (TB_WINDOW_CLASS, :14); DuplicatorTooltip.reload().
  // Defaults: width 500, height 225 (:39-41). The dialog is found by the
  // message the plugin printed into it, never by its counter id.
  var TB_WINDOW_CLASS = 'dup-tb-wrapper dup-styles';
  function dialogByText(re) {
    var found = null;
    all('div[id^="dupli-dlg-"]').forEach(function (d) {
      if (found || !/^dupli-dlg-\d+$/.test(d.id)) return;
      var msg = one('#' + d.id + '_message', d) || d;
      if (re.test(msg.textContent.replace(/\s+/g, ' '))) found = d;
    });
    return found;
  }
  function tbShow(title, inlineId, width, height, extraCls) {
    withLibs(function ($) {
      if (typeof window.tb_show !== 'function' || !document.getElementById(inlineId)) return;
      window.tb_show(title, '#TB_inline?width=' + width + '&height=' + height + '&inlineId=' + encodeURIComponent(inlineId));
      var win = $('#TB_window');
      win.attr('style', (win.attr('style') || '') + 'height: ' + height + 'px !important');
      win.addClass(TB_WINDOW_CLASS);
      if (extraCls) win.addClass(extraCls);
      try { window.DuplicatorTooltip.reload(); } catch (_) {}
    });
  }
  function showDialog(re, title, width, height) {
    var d = dialogByText(re);
    if (!d) { R.miss('#TB_inline', 'dialog "' + title + '" not in this capture'); return; }
    tbShow(title, d.id, width || 500, height || 225);
  }
  // A confirm found by the jsCallback its OK button carries (UiDialog.php:231-236).
  function confirmByCallback(fn) {
    var b = one('div[id^="dupli-dlg-"] .dup-dialog-confirm[onclick*="' + fn + '"]');
    var d = closestTo(b, 'div[id^="dupli-dlg-"]');
    return d && /^dupli-dlg-\d+$/.test(d.id) ? d : null;
  }
  function showConfirm(fn, title, width, height) {
    var d = confirmByCallback(fn);
    if (!d) { R.miss('#TB_inline', 'confirm "' + title + '" not in this capture'); return null; }
    tbShow(title, d.id, width || 500, height || 225);
    return d;
  }
  // The arguments of the plugin call an inline on* attribute makes:
  //   onclick="DupliJs.Storage.Edit('3')" → ['3'].
  function callArgs(el, fn) {
    var host = closestTo(el, '[onclick*="' + fn + '("]');
    if (!host) return null;
    var m = new RegExp(fn.replace(/\./g, '\\.') + '\\(([^)]*)\\)').exec(host.getAttribute('onclick'));
    if (!m) return null;
    return m[1].split(',').map(function (a) { return a.trim().replace(/^['"]|['"]$/g, ''); });
  }

  // ── the help page (assets/js/dynamic-help.js, in the vendor bundle) ──────
  // src/Utils/Help/Help.php:246-285 getCurrentPageTag(), with the addons'
  // filters: templates / template_edit (addons/templateaddon/src/Controllers/
  // TemplateToolsController.php:359-370), recovery (addons/recoveryaddon/src/
  // Controllers/RecoveryToolsController.php:90-97), import
  // (addons/importaddon/src/Controllers/ImportPageController.php:203-210),
  // schedules / schedule_edit (addons/scheduleaddon/ScheduleAddon.php:729-740).
  function helpTag() {
    var p = ownParams() || {};
    var page = p.page || '';
    var inner = p.inner_page || '';
    var tab = p.tab || '';
    switch (page) {
      case 'duplicator':
        if (inner === 'new1') return 'backup_step_1';
        if (inner === 'new2') return 'backup_step_2';
        return 'backups';
      case 'duplicator-storage': return inner === 'edit' ? 'storage_edit' : 'storages';
      case 'duplicator-tools':
        if (tab === 'templates') return inner === 'edit' ? 'template_edit' : 'templates';
        if (tab === 'recovery' || (!tab && R.currentSlug() === 'admin-tools-recovery')) return 'recovery';
        return 'tools';
      case 'duplicator-settings': return 'settings';
      case 'duplicator-import': return 'import';
      case 'duplicator-schedules': return inner === 'edit' ? 'schedule_edit' : 'schedules';
      default: return '';
    }
  }
  // The captured help answer's HTML: the page body minus its scripts, read
  // once from a hidden same-origin frame and kept (DupliJs.Help.Data).
  var helpCache = {};
  function helpHtml(slug, done) {
    if (Object.prototype.hasOwnProperty.call(helpCache, slug)) { done(helpCache[slug]); return; }
    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    frame.onload = function () {
      var html = null;
      try {
        var body = frame.contentDocument && frame.contentDocument.body;
        if (body) {
          html = Array.prototype.filter.call(body.children, function (c) {
            return !/^(SCRIPT|STYLE|LINK|IFRAME)$/.test(c.tagName) && !c.classList.contains('dup-modal-wrapper');
          }).map(function (c) { return c.outerHTML; }).join('');
        }
      } catch (err) { console.error('[snap] help', err); }
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      helpCache[slug] = html;
      done(html);
    };
    frame.src = '../' + slug + '/index.html';
    document.body.appendChild(frame);
  }

  R.register([

    // ─ Tooltips ───────────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/javascript.php:309 @verified 2026-09-30 @product duplicator
    // Real plugin: DuplicatorTooltip.load() on ready (the vendor bundle's
    // assets/js/duplicator-tooltip.js) — tippy on every [data-tooltip] and
    // titled element in .duplicator-page .wrap, copy tooltips on
    // [data-dup-copy-value]. Some tooltips (the Backups list flags) and the
    // storage delete confirm (storages/storage_list.php:246-249) carry HTML
    // with the plugin's own icons by absolute URL, which the capture does not
    // rewrite inside an attribute; those icons are vendored in lib/plugin/
    // (MANIFEST.json) and the URLs point there first.
    {
      label: 'tooltips-load',
      event: 'dup:ready',
      once: true,
      match: function (el) { return el === document.body; },
      apply: function () {
        all('[data-tooltip], [data-delete-view]').forEach(function (el) {
          ['data-tooltip', 'data-delete-view'].forEach(function (a) {
            var t = el.getAttribute(a);
            if (t && /\/wp-content\/plugins\/duplicator-pro\//.test(t)) {
              el.setAttribute(a, t.replace(/https?:\/\/[a-z0-9.-]+\/wp-content\/plugins\/duplicator-pro\//gi, LIB + 'plugin/'));
            }
          });
        });
        if (window.DuplicatorTooltip) window.DuplicatorTooltip.load();
      }
    },

    // ─ Capabilities pickers ───────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/capabilitiesaddon/template/capabilitiesaddon/capabilities.php:165 @verified 2026-09-30 @product duplicator
    // Real plugin: each .dup-capabilities-selector-wrapper select is a
    // select2 (the vendor bundle's own build) — width resolve, placeholder
    // "Search roles or users", minimumInputLength 2, results over AJAX
    // duplicator_settings_cap_users_list. The capture froze select2's DOM:
    // it is taken out the way select2's destroy() does (the container span,
    // select2-hidden-accessible and the data-select2-id marks), then select2
    // runs again on the select. The AJAX answer is not parked, so a search
    // answers with no results and logs a miss.
    {
      label: 'capabilities-select2',
      event: 'dup:ready',
      once: true,
      match: function (el) { return el === document.body && !!one('.dup-capabilities-selector-wrapper select'); },
      apply: function () {
        var $ = jq();
        if (!$ || !$.fn || !$.fn.select2) return;
        all('.dup-capabilities-selector-wrapper select').forEach(function (sel) {
          var next = sel.nextElementSibling;
          if (next && next.classList.contains('select2-container')) next.parentNode.removeChild(next);
          sel.classList.remove('select2-hidden-accessible');
          ['data-select2-id', 'tabindex', 'aria-hidden'].forEach(function (a) { sel.removeAttribute(a); });
          all('option', sel).forEach(function (o) { o.removeAttribute('data-select2-id'); });
          $(sel).select2({
            width: 'resolve',
            ajax: {
              transport: function (params, success) {
                R.miss('admin-ajax.php?action=duplicator_settings_cap_users_list', 'user / role search is an AJAX answer the capture did not park');
                success({ results: [] });
                return { abort: function () {} };
              },
              processResults: function (data) { return data; }
            },
            placeholder: 'Search roles or users',
            minimumInputLength: 2
          });
        });
      }
    },

    // ─ Help modal ─────────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/admin-logo-header.php:22 @verified 2026-09-30 @product duplicator
    // Real plugin: .dup-global-help loads admin.php?page=duplicator-dynamic-help
    // &tag=<page tag> over GET (DupliJs.Help.Load, once per page — the answer
    // is cached in DupliJs.Help.Data) and shows the answer's HTML in a
    // full-screen DuplicatorModalBox, close colour #000
    // (assets/js/dynamic-help.js Display). That answer is captured as its own
    // snapshot per tag; its HTML is read from it (a same-origin frame, never a
    // fetch) and goes into the plugin's own modal box as htmlContent, so the
    // page's own styles and the bundle's help handlers (category toggle,
    // search) apply, as live. No capture for this tag = a miss.
    {
      label: 'help-modal-open',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-global-help'); },
      apply: function () {
        var href = 'admin.php?page=duplicator-dynamic-help&tag=' + helpTag();
        var hit = R.resolve(href);
        if (!hit) { R.miss(href, 'help page for this tag not captured'); return; }
        helpHtml(hit.slug, function (html) {
          withLibs(function () {
            var Box = modalBoxClass();
            if (!Box || html == null) return;
            new Box({ htmlContent: html, closeColor: '#000', fullscreen: true }).open();
          });
        });
      }
    },

    // ─ Collapsible box ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/duplicator/dup.ui.php:59 @verified 2026-09-30 @product duplicator
    // Real plugin (ToggleMetaBox, bound to every div.dup-box:not(.dupli-box-static)
    // div.dup-box-title at assets/js/javascript.php:290-307): the panel shows
    // (no-display removed) or hides, .dup-box-arrow's aria-expanded follows and
    // its caret becomes fa-caret-up / fa-caret-down. The open state is also
    // saved over AJAX (duplicator_view_state_update) — dropped (H7).
    {
      label: 'box-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'div.dup-box:not(.dupli-box-static) div.dup-box-title'); },
      apply: function (el) {
        var title = closestTo(el, 'div.dup-box-title');
        var box = title.parentNode;
        var panel = one('.dup-box-panel', box);
        if (!panel) return;
        var open = !visible(panel);
        var arrow = one('.dup-box-arrow', box);
        var caret = one('.dup-box-arrow i', box);
        if (open) { panel.classList.remove('no-display'); show(panel, true); }
        else show(panel, false);
        if (arrow) arrow.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (caret) caret.className = open ? 'fa fa-caret-up' : 'fa fa-caret-down';
      },
      state: function (el) {
        var panel = one('.dup-box-panel', closestTo(el, 'div.dup-box-title').parentNode);
        return { key: 'box.' + (panel && panel.id), value: visible(panel) };
      }
    },

    // ─ Password eye toggle ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/javascript.php:219 @verified 2026-09-30 @product duplicator
    // Real plugin (DupliJs.passwordToggle, run on ready at :310): the button in
    // .dup-password-toggle flips its input between password and text and swaps
    // fa-eye / fa-eye-slash.
    {
      label: 'password-eye-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-password-toggle button'); },
      apply: function (el) {
        var wrap = closestTo(el, '.dup-password-toggle');
        var input = one('input', wrap);
        var icon = one('button i', wrap);
        if (!input) return;
        var reveal = input.getAttribute('type') === 'password';
        input.setAttribute('type', reveal ? 'text' : 'password');
        if (icon) { icon.classList.toggle('fa-eye', !reveal); icon.classList.toggle('fa-eye-slash', reveal); }
      }
    },

    // ─ Pseudo checkbox ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/javascript.php:348 @verified 2026-09-30 @product duplicator
    // Real plugin: a .dup-pseudo-checkbox (not .disabled) toggles `checked` on
    // click, and a click on its <label> clicks it (:358-374).
    {
      label: 'pseudo-checkbox',
      event: 'click',
      match: function (el) {
        var box = closestTo(el, '.dup-pseudo-checkbox') || (closestTo(el, 'label') && one('.dup-pseudo-checkbox', closestTo(el, 'label')));
        return !!box && !box.classList.contains('disabled');
      },
      apply: function (el) {
        var box = closestTo(el, '.dup-pseudo-checkbox') || one('.dup-pseudo-checkbox', closestTo(el, 'label'));
        box.classList.toggle('checked');
      }
    },

    // ─ Confirm Yes never writes ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/src/Views/UI/UiDialog.php:243 @verified 2026-09-30 @product duplicator
    // Real plugin: a confirm's OK / Yes runs its jsCallback (the AJAX delete,
    // run, reset …) and the progress spinner, then the page reloads. The write
    // is the hazard half of every confirm row (interactions.md H1/H8), so the
    // callback is a no-op here; a Yes that has no tb_remove() of its own closes
    // the dialog the way its Cancel does (tb_remove, wp-includes/js/thickbox/
    // thickbox.js:292).
    {
      label: 'dialog-confirm-no-write',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '#TB_window .dup-dialog-confirm');
        var code = b ? b.getAttribute('onclick') || '' : '';
        // ResetSettingsRun is a client-side form reset: its own entry runs it.
        return !!b && !/tb_remove\s*\(/.test(code) && !/ResetSettingsRun/.test(code);
      },
      apply: function () { withLibs(function () { if (typeof window.tb_remove === 'function') window.tb_remove(); }); }
    },

    // ═══ Backups list (admin-backups) ══════════════════════════════════════

    // ─ Backup row details toggle ──────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:141 @verified 2026-09-30 @product duplicator
    // Real plugin: td.dup-cell-toggle-btn swaps its icon fa-plus ↔ fa-minus and
    // the next <tr> (the row's details) loses / gains no-display.
    {
      label: 'backup-row-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'td.dup-cell-toggle-btn'); },
      apply: function (el) {
        var td = closestTo(el, 'td.dup-cell-toggle-btn');
        var icon = one('i', td);
        var next = closestTo(td, 'tr').nextElementSibling;
        if (!icon) return;
        var open = icon.classList.contains('fa-plus');
        icon.classList.toggle('fa-plus', !open);
        icon.classList.toggle('fa-minus', open);
        if (next && next.tagName === 'TR') noDisplay(next, open);
      },
      state: function (el) {
        var i = one('i', closestTo(el, 'td.dup-cell-toggle-btn'));
        return { key: 'backup.row', value: !!i && i.classList.contains('fa-minus') };
      }
    },

    // ─ Backup rows expand all ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:118 @verified 2026-09-30 @product duplicator
    // Real plugin: th#dup-header-chkall flips its own icon, and every
    // tr.dup-row-complete's toggle icon and next <tr> follow it.
    {
      label: 'backup-rows-toggle-all',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'th#dup-header-chkall'); },
      apply: function (el) {
        var icon = one('i', closestTo(el, 'th#dup-header-chkall'));
        if (!icon) return;
        var open = icon.classList.contains('fa-plus');
        icon.classList.toggle('fa-plus', !open);
        icon.classList.toggle('fa-minus', open);
        all('tr.dup-row-complete').forEach(function (tr) {
          var i = one('.dup-cell-toggle-btn i', tr);
          if (i) { i.classList.toggle('fa-plus', !open); i.classList.toggle('fa-minus', open); }
          var next = tr.nextElementSibling;
          if (next && next.tagName === 'TR') noDisplay(next, open);
        });
      }
    },

    // ─ Download menu ──────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:154 @verified 2026-09-30 @product duplicator
    // Real plugin: button.dup-dnload-btn shows the nav.dup-dnload-menu-items
    // beside it (every other one gains no-display), or hides it when it is
    // open. Same code on the detail page (details/detail.php:72-91). The menu's
    // own items download the file (DupliJs.Pack.DownloadFile, a no-op here —
    // a real download) and close the menu with their inline jQuery.
    {
      label: 'download-menu-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'button.dup-dnload-btn') && !closestTo(el, '.dupli-detail-dnload'); },
      apply: function (el) {
        var btn = closestTo(el, 'button.dup-dnload-btn');
        var menu = one('nav.dup-dnload-menu-items', btn.parentNode);
        if (!menu) return;
        if (visible(menu)) { menu.classList.add('no-display'); return; }
        all('nav.dup-dnload-menu-items').forEach(function (n) { n.classList.add('no-display'); });
        noDisplay(menu, true);
      },
      state: function (el) {
        var m = one('nav.dup-dnload-menu-items', closestTo(el, 'button.dup-dnload-btn').parentNode);
        return { key: 'download.menu', value: visible(m) };
      }
    },

    // ─ Download menu outside click ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:166 @verified 2026-09-30 @product duplicator
    // Real plugin: any click whose target's class is not `dupli-menu-x` (the
    // menu's own buttons and spans, :173-178) hides every download menu. A
    // click on a link or submit control is left to the navigation (it leaves
    // the page either way), so this entry never swallows one.
    {
      label: 'download-menu-close',
      event: 'click',
      match: function (el) {
        if (closestTo(el, 'button.dup-dnload-btn, nav.dup-dnload-menu-items button')) return false;
        if (closestTo(el, 'a[href], input[type="submit"], button[type="submit"]')) return false;
        return listMenus().some(function (n) { return !n.classList.contains('no-display'); });
      },
      apply: function () {
        listMenus().forEach(function (n) { n.classList.add('no-display'); });
      }
    },

    // ─ Plugins dialog ─────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:102 @verified 2026-09-30 @product duplicator
    // Real plugin: tb_show('Plugins') of the row's hidden environment list
    // (#<data-dialog-id>), height min(500, max(220, 100 + 25 per plugin)),
    // width 650, #TB_window + TB_WINDOW_CLASS + dupli-environment-dialog.
    {
      label: 'backup-environment-dialog',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dupli-backup-environment-open'); },
      apply: function (el) {
        var id = closestTo(el, '.dupli-backup-environment-open').getAttribute('data-dialog-id');
        var list = id && document.getElementById(id);
        if (!list) return;
        var count = all('ul.dupli-list li', list).length;
        var h = Math.min(500, Math.max(220, 100 + (count * 25)));
        tbShow('Plugins', id, 650, h, 'dupli-environment-dialog');
      }
    },

    // ─ Select all backups ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:245 @verified 2026-09-30 @product duplicator
    // Real plugin (SetDeleteAll, the inline onclick of #dup-chk-all,
    // packages_table_head.php:35): every input[name=delete_confirm] takes the
    // header box's state.
    {
      label: 'backups-select-all',
      event: 'click',
      match: function (el) { return is(el, 'input#dup-chk-all'); },
      apply: function (el) {
        all('input[name=delete_confirm]').forEach(function (c) { c.checked = !!el.checked; });
      },
      state: function (el) { return { key: 'backups.selectAll', value: !!el.checked }; }
    },

    // ─ Backups bulk apply ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:190 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmDelete, onclick of #dup-pack-bulk-apply): no action
    // picked → alert "Bulk Action Required" (alert1, :46-49); no row checked →
    // "Selection Required" (alert2, :53-57); else the "Delete Backups?" confirm
    // (confirm1, :75-87, height 280). The alert texts are the plugin's own and
    // sit swapped in its templates (parts/dialogs/contents/bulk-action-*.php):
    // live shows them that way too.
    {
      label: 'backups-bulk-apply',
      event: 'click',
      match: function (el) { return is(el, '#dup-pack-bulk-apply[onclick*="DupliJs.Pack.ConfirmDelete"]'); },
      apply: function () {
        var sel = document.getElementById('dup-pack-bulk-actions');
        if (!sel || sel.value !== 'delete') {
          showDialog(/Please select at least one Backup to delete!/, 'Bulk Action Required');
          return;
        }
        if (!all('input[name=delete_confirm]:checked').length) {
          showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Selection Required');
          return;
        }
        showDialog(/Are you sure you want to delete the selected Backup\(s\)\?/, 'Delete Backups?', 500, 280);
      }
    },

    // ─ Backup row delete ──────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:208 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmDeleteRow, onclick of the row's Delete,
    // row_parts/details_package.php:79): the same "Delete Backups?" confirm.
    {
      label: 'backup-row-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'tr.dup-row-details .dupli-delete-backup'); },
      apply: function () {
        showDialog(/Are you sure you want to delete the selected Backup\(s\)\?/, 'Delete Backups?', 500, 280);
      }
    },

    // ─ Backup row transfer ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:262 @verified 2026-09-30 @product duplicator
    // Real plugin (OpenPackTransfer(id)): window.location to the transfer URL
    // (PackagesPageController::getPackageTransferUrl, inner_page=transfer)
    // + '&id=' + id.
    {
      label: 'backup-row-transfer',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'button.dup-transfer:not(.disabled)'); },
      apply: function (el) {
        var m = /OpenPackTransfer\((\d+)\)/.exec(closestTo(el, 'button.dup-transfer').getAttribute('onclick') || '');
        if (m) hop('admin.php?page=duplicator&inner_page=transfer&id=' + m[1]);
      }
    },

    // ─ Backup row storages ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:267 @verified 2026-09-30 @product duplicator
    // Real plugin (ShowRemote(id)): shows the "Storage Locations" alert
    // (750 × 475, box dup-packs-remote-store-dlg, :36-42), then fills
    // #TB_window .dupli-dlg-alert-txt from the AJAX answer
    // duplicator_get_storage_details: each storage's infoHTML inside
    // .dup-dlg-store-remote plus the "[Backup Build Log]" link, or "Got an
    // error or a warning: <message>" when !success (:276-290). The capture
    // parks those answers by backup id on <body data-snap-storage-details>;
    // plugin asset URLs in them point at lib/plugin/ (the tooltip rule). No
    // parked answer for the id (the building list) = a logged miss.
    {
      label: 'backup-row-storages',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dupli-row-storages-btn'); },
      apply: function (el) {
        var args = callArgs(el, 'DupliJs.Pack.ShowRemote');
        var all_ = null;
        try { all_ = JSON.parse(document.body.dataset.snapStorageDetails || 'null'); } catch (_) {}
        var ans = args && all_ ? all_[args[0]] : null;
        if (!ans) { R.miss('admin-ajax.php?action=duplicator_get_storage_details', 'storage list is an AJAX answer the capture did not park'); return; }
        var fix = function (s) { return String(s || '').replace(/https?:\/\/[a-z0-9.-]+\/wp-content\/plugins\/duplicator-pro\//gi, LIB + 'plugin/'); };
        var html;
        if (!ans.success) html = 'Got an error or a warning: ' + (ans.message || '');
        else {
          html = '<div class="dup-dlg-store-remote">';
          Object.keys(ans.storage_providers || {}).forEach(function (k) { html += fix(ans.storage_providers[k].infoHTML); });
          html += '</div>';
          var a = document.createElement('a');
          a.href = ans.logURL || ''; a.className = 'dup-dlg-store-log-link'; a.target = '_blank'; a.textContent = '[Backup Build Log]';
          html += '<small>' + a.outerHTML + '</small>';
        }
        var txt = one('.dupli-dlg-alert-txt.dup-packs-remote-store-dlg');
        var dlg = txt && closestTo(txt.parentElement, 'div[id^="dupli-dlg-"]');
        if (!dlg || !/^dupli-dlg-\d+$/.test(dlg.id)) { R.miss('#TB_inline', 'Storage Locations dialog not in this capture'); return; }
        tbShow('Storage Locations', dlg.id, 750, 475);
        withLibs(function () {
          var box = one('#TB_window .dupli-dlg-alert-txt');
          if (box) box.innerHTML = html;
        });
      }
    },

    // ─ Backup restore ─────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/packages_scripts.php:302 @verified 2026-09-30 @product duplicator
    // Real plugin: AJAX duplicator_backup_redirect prepares the installer and
    // opens it in a modal (interactions.md H6: never). Logged miss.
    {
      label: 'backup-restore-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-restore-backup'); },
      apply: function () {
        R.miss('admin-ajax.php?action=duplicator_backup_redirect', 'restore prepares the live installer — never in a snapshot');
      }
    },

    // ═══ New backup, step 1: Setup (admin-backups-new-setup) ════════════════

    // ─ Installer Basic cPanel tabs ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/javascript.php:261 @verified 2026-09-30 @product duplicator
    // Real plugin (the DupliJs tabs of every div[data-dupli-tabs='true'],
    // _clickEvt): every label <li> loses `tabs` and goes normal weight, its
    // button aria-selected=false; the clicked one gains `tabs`, bold,
    // aria-selected=true; every panel hides, the one at the same index shows.
    {
      label: 'dupli-tabs-switch',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'div[data-dupli-tabs="true"] > ul > li'); },
      apply: function (el) {
        var li = closestTo(el, 'div[data-dupli-tabs="true"] > ul > li');
        var ul = li.parentNode;
        var root = ul.parentNode;
        var lis = Array.prototype.filter.call(ul.children, function (c) { return c.tagName === 'LI'; });
        var panes = Array.prototype.filter.call(root.children, function (c) { return c.tagName === 'DIV'; });
        var index = lis.indexOf(li);
        lis.forEach(function (x) {
          x.classList.remove('tabs'); x.style.fontWeight = 'normal';
          var b = one('button', x); if (b) b.setAttribute('aria-selected', 'false');
        });
        li.classList.add('tabs'); li.style.fontWeight = 'bold';
        var btn = one('button', li); if (btn) btn.setAttribute('aria-selected', 'true');
        show(panes, false);
        if (panes[index]) show(panes[index], true);
      },
      state: function (el) { return { key: 'tabs', value: (closestTo(el, 'li').id || '') }; }
    },

    // ─ Installer use current DB values ────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/section_installer.php:268 @verified 2026-09-30 @product duplicator
    // Real plugin (ApplyDataCurrent(id), onclick of "[use current]"): every
    // input under #<id> that has data-current takes it as its value.
    {
      label: 'installer-use-current',
      event: 'click',
      match: function (el) { var a = closestTo(el, 'a[onclick*="ApplyDataCurrent"]'); return !!a; },
      apply: function (el) {
        var m = /ApplyDataCurrent\('([^']+)'\)/.exec(closestTo(el, 'a[onclick*="ApplyDataCurrent"]').getAttribute('onclick'));
        if (!m) return;
        all('#' + m[1] + ' input').forEach(function (i) {
          if (i.hasAttribute('data-current')) i.value = i.getAttribute('data-current');
        });
      }
    },

    // ─ Installer password mode ────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/section_security.php:151 @verified 2026-09-30 @product duplicator
    // Real plugin (EnableInstallerPassword, onclick of each secure-on radio):
    // the lock icon swaps icon, colour and tooltip for the picked mode
    // (2 archive encryption: fa-lock success; 1 installer password: fa-lock
    // warning; 0 none: fa-lock-open warning); none makes #secure-pass readonly
    // and not required and disables #secure-btn, the others make it editable,
    // required and focused.
    {
      label: 'installer-password-mode',
      event: 'click',
      match: function (el) { return is(el, '.secure-on-input-wrapper input[name="secure-on"]'); },
      apply: function () { enableInstallerPassword(true); },
      state: function (el) { return { key: 'secure.on', value: el.value }; }
    },

    // ─ Storage count badge ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/setup/section_storages.php:47 @verified 2026-09-30 @product duplicator
    // Real plugin (UpdateStorageCount on each _storage_ids[] change): the
    // badge reads "(n)" checked, red bold at 0, #444 normal otherwise.
    {
      label: 'setup-storage-count',
      event: 'change',
      match: function (el) { return is(el, '#dup-pack-storage-panel input[name="_storage_ids[]"]'); },
      apply: function () {
        var n = all('#dup-pack-storage-panel input[name="_storage_ids[]"]:checked').length;
        var badge = document.getElementById('dupli-storage-title-count');
        if (!badge) return;
        badge.innerHTML = '(' + n + ')';
        badge.style.color = n === 0 ? 'red' : '#444';
        badge.style.fontWeight = n === 0 ? 'bold' : 'normal';
      }
    },

    // ─ Name format dynamic tag ────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/setup/name-format-controls.php:58 @verified 2026-09-30 @product duplicator
    // Real plugin: picking a tag in .dup-format-name-tags appends it to
    // #package-name-format and puts the picker back on "Dynamic Tags".
    {
      label: 'name-format-tag',
      event: 'change',
      match: function (el) { return is(el, 'select.dup-format-name-tags'); },
      apply: function (el) {
        if (el.value === '') return;
        var input = document.getElementById('package-name-format');
        if (input) input.value = input.value + el.value;
        el.value = '';
      },
      state: function () { var i = document.getElementById('package-name-format'); return { key: 'name.format', value: i && i.value }; }
    },

    // ─ File filters on ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/package_components.php:197 @verified 2026-09-30 @product duplicator
    // Real plugin (ToggleFileFilters on #files-filter-on change, :402): on
    // shows the filter icon and .files-filter-section .filters and makes both
    // textareas editable; off hides them and makes them readonly.
    {
      label: 'file-filters-toggle',
      event: 'change',
      match: function (el) { return is(el, '#files-filter-on'); },
      apply: function () { toggleFileFilters(); },
      state: function (el) { return { key: 'filter.on', value: !!el.checked }; }
    },

    // ─ Filter preset links ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/package_components.php:356 @verified 2026-09-30 @product duplicator
    // Real plugin: a[data-filter-path] appends its path to #filter-paths
    // (";\n" between), a[data-filter-exts] its list to #filter-exts (";"
    // between); the two "(clear)" links empty them. Nothing while readonly.
    {
      label: 'filter-preset-links',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'a[data-filter-path], a[data-filter-exts], #clear-path-filters, #clear-extension-filters'); },
      apply: function (el) {
        var a = closestTo(el, 'a[data-filter-path], a[data-filter-exts], #clear-path-filters, #clear-extension-filters');
        var paths = a.hasAttribute('data-filter-path') || a.id === 'clear-path-filters';
        var box = document.getElementById(paths ? 'filter-paths' : 'filter-exts');
        if (!box || box.hasAttribute('readonly')) return;
        if (a.id === 'clear-path-filters' || a.id === 'clear-extension-filters') { box.value = ''; return; }
        var add = a.getAttribute(paths ? 'data-filter-path' : 'data-filter-exts');
        box.value = box.value.length > 0 ? box.value + (paths ? ';\n' : ';') + add : add;
      }
    },

    // ─ Components shortcut ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/package_components.php:265 @verified 2026-09-30 @product duplicator
    // Real plugin (ToggleComponentsSelect on .dup-components-shortcut-radio
    // change, :408): All checks every component except the two "active only"
    // ones, DB only / Media only check that one component, and all three
    // disable the custom labels; Custom enables them. Then every component
    // checkbox fires change (the DB-only / media-only icons and sections,
    // the active-only boxes).
    {
      label: 'components-shortcut',
      event: 'change',
      match: function (el) { return is(el, '.dup-components-shortcut-radio'); },
      apply: function () { toggleComponentsSelect(); },
      state: function (el) { return { key: 'components', value: el.value }; }
    },

    // ─ Component checkbox ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/parts/packages/filters/package_components.php:412 @verified 2026-09-30 @product duplicator
    // Real plugin: each .dup-components-checkbox change re-runs ToggleDBOnly
    // and ToggleMediaOnly; the database one also ToggleDBExcluded (:404), the
    // plugins / themes ones their "active only" box (:417-423); and Parsley
    // validates the component group (:344-346).
    {
      label: 'components-checkbox',
      event: 'change',
      match: function (el) { return is(el, '.dup-components-checkbox'); },
      apply: function (el) { componentChanged(el); }
    },

    // ─ Brand picked ───────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/package_brand_selector.php:93 @verified 2026-09-30 @product duplicator
    // Real plugin (brandCheck on #brand select / change): #brand-preview's
    // href becomes the brand edit URL — action=edit&id=<id> for a brand,
    // action=default for the default one (id <= 0).
    {
      label: 'setup-brand-picked',
      event: 'change',
      match: function (el) { return is(el, 'select#brand'); },
      apply: function (el) {
        var link = document.getElementById('brand-preview');
        if (!link) return;
        var base = 'admin.php?page=duplicator-settings&tab=brand&inner_page=edit';
        var id = parseInt(el.value, 10);
        link.setAttribute('href', id > 0 ? base + '&action=edit&id=' + id : base + '&action=default');
      }
    },

    // ─ Edit template link ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/package_template_selector.php:203 @verified 2026-09-30 @product duplicator
    // Real plugin (EditTemplate): with [Unassigned] (the manual template, the
    // first option) or nothing picked, the templates list; else the edit page
    // + '&package_template_id=' + id — in a new window, opened here in place
    // (DESIGN WO-202G ruling 5).
    {
      label: 'setup-edit-template',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'button[onclick*="DupliJs.Pack.EditTemplate"]'); },
      apply: function () {
        var sel = document.getElementById('template_id');
        var manual = sel && sel.options.length ? sel.options[0].value : '';
        var id = sel ? sel.value : '';
        if (!id || parseInt(id, 10) <= 0 || id === manual) hop('admin.php?page=duplicator-tools&tab=templates');
        else hop('admin.php?page=duplicator-tools&tab=templates&inner_page=edit&package_template_id=' + id);
      }
    },

    // ─ Template picked ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/package_template_selector.php:217 @verified 2026-09-30 @product duplicator
    // Real plugin (onChange EnableTemplate, :217-229): shows
    // #dupli-template-specific-area, runs PopulateCurrentTemplate (:118-201)
    // — name format, notes, file / DB filters, components, cPanel, security
    // mode + password, DB fields and the excluded-tables pseudo boxes from the
    // template list the page printed inline (packageTemplates, :94). The
    // capture parks that list, as GetTemplateById() objects, on
    // <body data-snap-package-templates>. Then the installer tab follows
    // cpnl-enable, the password / file / DB / active-only toggles re-run, and
    // duplicator:templateChanged moves the brand picker to the template's
    // brand (brandaddon package_brand_selector.php:129-132). No parked list =
    // a logged miss.
    {
      label: 'setup-template-picked',
      event: 'change',
      match: function (el) { return is(el, 'select#template_id'); },
      apply: function (el) {
        var list = null;
        try { list = JSON.parse(document.body.dataset.snapPackageTemplates || 'null'); } catch (_) {}
        if (!Array.isArray(list)) { R.miss('#template_id=' + el.value, 'template JSON (packageTemplates) not parked in the capture'); return; }
        show(all('#dupli-template-specific-area'), true);
        populateTemplate(list, el.value);
        enableInstallerPassword(false);
        toggleFileFilters();
        toggleDBFilters();
        toggleActive('package_component_themes_active', 'package_component_themes');
        toggleActive('package_component_plugins_active', 'package_component_plugins');
        toggleDBExcluded();
        toggleNoPrefix('#db-prefix-filter', '.no-prefix-table', false);
        toggleNoPrefix('#db-prefix-sub-filter', '.no-subsite-exists', false);
      },
      state: function (el) { return { key: 'template', value: el.value }; }
    },

    // ─ Setup reset confirm ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/setup/setup_page.php:142 @verified 2026-09-30 @product duplicator
    // Real plugin (ResetSettings, onclick of Reset): the "Would you like to
    // continue" confirm (:119-124).
    {
      label: 'setup-reset-confirm',
      event: 'click',
      match: function (el) { return is(el, 'input[onclick*="DupliJs.Pack.ResetSettings()"]') && !el.disabled; },
      apply: function () { showDialog(/This will clear all of the current backup settings\./, 'Would you like to continue'); }
    },

    // ─ Setup reset run ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/setup/setup_page.php:146 @verified 2026-09-30 @product duplicator
    // Real plugin: the confirm's OK runs ResetSettingsRun — #dup-form-opts
    // reset() on the client (no write) — and its progress function shows the
    // "Please Wait..." line and disables both buttons
    // (parts/dialogs/confirm_progress.php:19-31); tb_remove() 800 ms later.
    {
      label: 'setup-reset-run',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#TB_window .dup-dialog-confirm[onclick*="ResetSettingsRun"]'); },
      apply: function (el) {
        var form = document.getElementById('dup-form-opts');
        if (form) form.reset();
        var id = (closestTo(el, '.dup-dialog-confirm').id || '').replace(/-confirm$/, '');
        show(document.getElementById(id + '-progress'), true);
        [id + '-confirm', id + '-cancel'].forEach(function (b) { var x = document.getElementById(b); if (x) x.setAttribute('disabled', 'true'); });
        R.wait(800, function () {
          withLibs(function () { if (typeof window.tb_remove === 'function') window.tb_remove(); });
          [id + '-confirm', id + '-cancel'].forEach(function (b) { var x = document.getElementById(b); if (x) x.removeAttribute('disabled'); });
        });
      }
    },

    // ─ Setup Next ─────────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/setup/setup_page.php:91 @verified 2026-09-30 @product duplicator
    // Real plugin: #button-next submits #dup-form-opts (POST update_template to
    // its action, the new2 URL), which saves the manual template (H2) and
    // lands on the scan step. Here the form's action resolves through the nav
    // map; nothing is posted. Parsley validates the form first, as live.
    {
      label: 'setup-next',
      event: 'submit',
      match: function (el) { return is(el, 'form#dup-form-opts'); },
      apply: function (el) { hop(el.getAttribute('action') || 'admin.php?page=duplicator&inner_page=new2'); }
    },

    // ═══ New backup, step 2: Scan (admin-backups-new-scan) ═════════════════

    // ─ Scan section toggle ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/scan/scripts.php:839 @verified 2026-09-30 @product duplicator
    // Real plugin (toggleScanItem, onclick of each div.scan-item .title): a
    // hidden div.info shows at once and the caret turns fa-caret-down; a shown
    // one hides over 250 ms and the caret turns fa-caret-right.
    {
      label: 'scan-section-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.toggleScanItem"]'); },
      apply: function (el) {
        var title = closestTo(el, '[onclick*="DupliJs.Pack.toggleScanItem"]');
        var item = closestTo(title, 'div.scan-item');
        if (!item) return;
        var info = Array.prototype.filter.call(item.children, function (c) { return c.tagName === 'DIV' && c.classList.contains('info'); });
        var caret = all('div.text i.fa', title);
        if (!info.length) return;
        if (!visible(info[0])) {
          caret.forEach(function (i) { i.classList.add('fa-caret-down'); i.classList.remove('fa-caret-right'); });
          R.show(info);
        } else {
          caret.forEach(function (i) { i.classList.add('fa-caret-right'); i.classList.remove('fa-caret-down'); });
          R.hide(info, 250);
        }
      }
    },

    // ─ Scan quick filter paths dialog ─────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/scan/scripts.php:107 @verified 2026-09-30 @product duplicator
    // Real plugin (showPathsDlg): the dirs / files textareas take the paths
    // checked in the quick-filter tree, or "No directories / files have been
    // selected!"; that block goes into the "Copy Quick Filter Paths" alert
    // (650 × 485, box .arc-paths-dlg, :18-24). The tree the capture froze has
    // no live jsTree behind it, so nothing can be checked: the empty texts.
    {
      label: 'scan-paths-dialog',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.showPathsDlg"]'); },
      apply: function () {
        var src = document.getElementById('dup-archive-paths');
        var box = one('.arc-paths-dlg');
        var dlg = box && closestTo(box, 'div[id^="dupli-dlg-"]');
        if (!src || !box || !dlg) return;
        var d = one('textarea.path-dirs', src);
        var f = one('textarea.path-files', src);
        if (d) d.textContent = 'No directories have been selected!';
        if (f) f.textContent = 'No files have been selected!';
        box.innerHTML = src.innerHTML;
        tbShow('Copy Quick Filter Paths', dlg.id, 650, 485);
      }
    },

    // ─ Scan copy paths ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/scan/scripts.php:146 @verified 2026-09-30 @product duplicator
    // Real plugin (copyText(btn, query)): selects the textarea and copies it;
    // on success the button turns white on green and reads "Copied to
    // Clipboard!", else the "Manual copy of selected text required" alert.
    {
      label: 'scan-copy-paths',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.copyText"]'); },
      apply: function (el) {
        var btn = closestTo(el, '[onclick*="DupliJs.Pack.copyText"]');
        var args = callArgs(btn, 'DupliJs.Pack.copyText');
        var area = args && one(args[1]);
        try {
          if (area) area.select();
          document.execCommand('copy');
          btn.style.color = '#fff';
          btn.style.backgroundColor = 'green';
          btn.textContent = 'Copied to Clipboard!';
        } catch (_) {
          showDialog(/Manual copy of selected text required on this browser\./, 'WARNING!');
        }
      }
    },

    // ─ Scan back to setup ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/scan/scripts.php:912 @verified 2026-09-30 @product duplicator
    // Real plugin: .dup-go-back-to-new1 goes to getPackageBuildS1Url() (the
    // new1 URL with a fresh nonce).
    {
      label: 'scan-back-to-setup',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-go-back-to-new1'); },
      apply: function () { hop('admin.php?page=duplicator&inner_page=new1'); }
    },

    // ─ Scan build and rescan never ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/scan/scripts.php:821 @verified 2026-09-30 @product duplicator
    // Real plugin: Create Backup submits create-from-temp and a real build
    // starts (H1); Rescan re-runs the scanner (writes scan files, H3); "Add
    // Filters & Rescan" saves filters. All three are logged misses.
    {
      label: 'scan-build-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-build-button, [onclick*="DupliJs.Pack.reRunScanner"], [onclick*="DupliJs.Pack.applyFilters"]'); },
      apply: function (el) {
        var b = closestTo(el, '#dup-build-button, [onclick*="DupliJs.Pack.reRunScanner"], [onclick*="DupliJs.Pack.applyFilters"]');
        if (b.id === 'dup-build-button') R.miss('admin.php?page=duplicator&action=create-from-temp', 'starts a real backup build — never in a snapshot');
        else R.miss('admin-ajax.php?action=duplicator_package_scan', 'rescans the site (writes scan files) — never in a snapshot');
      }
    },

    // ═══ Backup details (admin-backups-detail-*) ═══════════════════════════

    // ─ Detail show details ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/detail.php:62 @verified 2026-09-30 @product duplicator
    // Real plugin: a .dupli-toggle-btn toggles is-open on the first
    // .dup-link-data under its .dupli-kv-value, and aria-expanded follows.
    {
      label: 'detail-toggle-data',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-package-details-wrapper .dupli-toggle-btn'); },
      apply: function (el) {
        var btn = closestTo(el, '.dupli-toggle-btn');
        var kv = closestTo(btn, '.dupli-kv-value');
        var data = kv && one('.dup-link-data', kv);
        if (!data) return;
        var open = !data.classList.contains('is-open');
        data.classList.toggle('is-open', open);
        if (open) R.clearBaked(data);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      },
      state: function (el) { return { key: 'detail.data', value: closestTo(el, '.dupli-toggle-btn').getAttribute('aria-expanded') === 'true' }; }
    },

    // ─ Detail download menu ───────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/detail.php:72 @verified 2026-09-30 @product duplicator
    // Real plugin: the header Download button toggles no-display on its
    // sibling .dup-dnload-menu-items and sets aria-expanded; a click outside
    // .dupli-detail-dnload closes it (:83-89).
    {
      label: 'detail-download-menu',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dupli-detail-dnload .dup-dnload-btn'); },
      apply: function (el) {
        var btn = closestTo(el, '.dup-dnload-btn');
        var menu = one('.dup-dnload-menu-items', btn.parentNode);
        if (!menu) return;
        var open = menu.classList.contains('no-display');
        noDisplay(menu, open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    },

    // ─ Detail download menu outside click ─────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/detail.php:83 @verified 2026-09-30 @product duplicator
    // Real plugin: any click outside .dupli-detail-dnload closes the menu. A
    // link or submit click is left to the navigation (it leaves the page).
    {
      label: 'detail-download-menu-close',
      event: 'click',
      match: function (el) {
        if (closestTo(el, '.dupli-detail-dnload')) return false;
        if (closestTo(el, 'a[href], input[type="submit"], button[type="submit"]')) return false;
        return !!one('.dupli-detail-dnload .dup-dnload-menu-items:not(.no-display)');
      },
      apply: function () {
        all('.dupli-detail-dnload .dup-dnload-menu-items').forEach(function (n) { n.classList.add('no-display'); });
        all('.dupli-detail-dnload .dup-dnload-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      }
    },

    // ─ Detail delete confirm ──────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/detail.php:100 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmDeleteCurrent): the "Delete Backup?" confirm (height
    // 210, :19-31). Its Delete runs an AJAX delete (H8): a no-op here, and its
    // own tb_remove() closes it (closeOnConfirm).
    {
      label: 'detail-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.ConfirmDeleteCurrent"]'); },
      apply: function () { showConfirm('DupliJs.Pack.DeleteCurrent', 'Delete Backup?', 500, 210); }
    },

    // ═══ Backup transfer (admin-backups-transfer-*) ════════════════════════

    // ─ Transfer file overview ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/transfer.php:235 @verified 2026-09-30 @product duplicator
    // Real plugin (toggleOverview): div#step1-ovr .toggle() and the icon
    // swaps fa-chevron-left ↔ fa-chevron-down.
    {
      label: 'transfer-overview-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-trans-ovr'); },
      apply: function () {
        var ovr = one('div#step1-ovr');
        if (ovr) R.toggle(ovr);
        var i = one('#dup-trans-ovr i');
        if (!i) return;
        var left = i.classList.contains('fa-chevron-left');
        i.classList.toggle('fa-chevron-left', !left);
        i.classList.toggle('fa-chevron-down', left);
      }
    },

    // ─ Transfer start ─────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/packages/details/transfer.php:254 @verified 2026-09-30 @product duplicator
    // Real plugin (StartTransfer): with no storage checked the "Storage
    // Warning!" alert (:198-201); else AJAX duplicator_manual_transfer_storage
    // uploads the backup (H4: never) — a logged miss.
    {
      label: 'transfer-start',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-transfer-btn'); },
      apply: function () {
        if (!all('#location-storage-opts input[type=checkbox]:checked').length) {
          showDialog(/At least one storage location must be selected\./, 'Storage Warning!');
          return;
        }
        R.miss('admin-ajax.php?action=duplicator_manual_transfer_storage', 'uploads the backup to remote storage — never in a snapshot');
      }
    },

    // ═══ Import (admin-import) ═════════════════════════════════════════════

    // ─ Import tabs ────────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/importaddon/template/importaddon/import-scripts.php:292 @verified 2026-09-30 @product duplicator
    // Real plugin: a [data-tab-target] in #wpbody-content moves `active` to
    // itself, every .tab-content gains no-display, #<target> loses it.
    {
      label: 'import-tabs',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#wpbody-content [data-tab-target]'); },
      apply: function (el) {
        var tab = closestTo(el, '[data-tab-target]');
        var wrap = document.getElementById('wpbody-content');
        all('[data-tab-target]', wrap).forEach(function (t) { t.classList.remove('active'); });
        all('.tab-content', wrap).forEach(function (c) { c.classList.add('no-display'); });
        tab.classList.add('active');
        noDisplay(document.getElementById(tab.getAttribute('data-tab-target')), true);
      },
      state: function (el) { return { key: 'import.tab', value: closestTo(el, '[data-tab-target]').getAttribute('data-tab-target') }; }
    },

    // ─ Import instructions ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/importaddon/template/importaddon/import-scripts.php:89 @verified 2026-09-30 @product duplicator
    // Real plugin: #dupli-import-instructions-toggle toggles
    // #dupli-import-instructions-content over 300 ms.
    {
      label: 'import-instructions-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-import-instructions-toggle'); },
      apply: function () { R.toggle('#dupli-import-instructions-content', 300); }
    },

    // ─ Import upload never ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/importaddon/template/importaddon/step1/add-file-area.php:57 @verified 2026-09-30 @product duplicator
    // Real plugin: Select File opens the file picker and uploads in chunks
    // (duplicator_import_upload); Upload from a link downloads onto the server
    // (duplicator_import_remote_download). Both write (interactions.md §6):
    // logged misses.
    {
      label: 'import-upload-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-import-dd-btn, #dupli-import-remote-upload'); },
      apply: function (el) {
        var remote = !!closestTo(el, '#dupli-import-remote-upload');
        R.miss('admin-ajax.php?action=' + (remote ? 'duplicator_import_remote_download' : 'duplicator_import_upload'),
          remote ? 'downloads a remote archive onto the server — never in a snapshot' : 'uploads an archive — never in a snapshot');
      }
    },

    // ═══ Storage list (admin-storage) ══════════════════════════════════════

    // ─ Storage edit link ──────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:173 @verified 2026-09-30 @product duplicator
    // Real plugin (Storage.Edit(id), onclick of the name and "Edit"):
    // document.location to the edit URL (inner_page=edit) + '&storage_id=' + id.
    {
      label: 'storage-edit-link',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Storage.Edit("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Storage.Edit');
        if (a) hop('admin.php?page=duplicator-storage&inner_page=edit&storage_id=' + a[0]);
      }
    },

    // ─ Storage quick view ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:183 @verified 2026-09-30 @product duplicator
    // Real plugin (Storage.View(id), "Quick View" and the panel's Close):
    // $('#quick-view-' + id).toggle().
    {
      label: 'storage-quick-view',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Storage.View("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Storage.View');
        if (a) R.toggle(document.getElementById('quick-view-' + a[0]));
      }
    },

    // ─ Storage select all ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:199 @verified 2026-09-30 @product duplicator
    // Real plugin (SetAll(chkbox)): every .item-chk takes the box's state.
    // Schedules (SetDeleteAll, schedule_list.php) and templates
    // (SetDeleteAll, template_list.php:279) do the same with their own box.
    {
      label: 'list-select-all',
      event: 'click',
      match: function (el) {
        return is(el, 'input[onclick*="DupliJs.Storage.SetAll"], input[onclick*="DupliJs.Schedule.SetDeleteAll"], input[onclick*="DupliJs.Template.SetDeleteAll"]');
      },
      apply: function (el) { all('.item-chk').forEach(function (c) { c.checked = !!el.checked; }); }
    },

    // ─ Storage bulk apply ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:205 @verified 2026-09-30 @product duplicator
    // Real plugin (Storage.BulkAction): nothing checked → "Selection
    // Required"; action Delete (1) → the delete confirm; anything else →
    // "Bulk Action Required".
    {
      label: 'storage-bulk-apply',
      event: 'click',
      match: function (el) { return is(el, '[onclick*="DupliJs.Storage.BulkAction"]'); },
      apply: function () {
        var ids = all("input[name^='selected_id[]']:checked").map(function (c) { return c.value; });
        if (!ids.length) { showDialog(/Please select at least one storage to delete!/, 'Selection Required'); return; }
        var sel = document.getElementById('bulk_action');
        if (sel && sel.value === '1') { storageDeleteConfirm(ids); return; }
        showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Bulk Action Required');
      }
    },

    // ─ Storage row delete ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:226 @verified 2026-09-30 @product duplicator
    // Real plugin (deleteSingle(id)): #dup-selected-storage takes the id and
    // the delete confirm opens for that one storage.
    {
      label: 'storage-row-delete',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Storage.deleteSingle("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Storage.deleteSingle');
        if (!a) return;
        var hidden = document.getElementById('dup-selected-storage');
        if (hidden) hidden.value = a[0];
        storageDeleteConfirm([a[0]]);
      }
    },

    // ─ Storage copy never ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/storage_list.php:178 @verified 2026-09-30 @product duplicator
    // Real plugin: the list's Copy and an edit page's Copy From → Apply go to
    // the COPY action URL, which saves a copy / overwrites this storage
    // (parts/edit_toolbar.php:105-108): logged miss.
    {
      label: 'storage-copy-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Storage.CopyEdit("], [onclick*="DupliJs.Storage.Copy()"]'); },
      apply: function () { R.miss('admin.php?page=duplicator-storage&action=copy-storage', 'the copy action saves a storage — never in a snapshot'); }
    },

    // ═══ Storage new / edit (admin-storage-new*, admin-storage-edit-*) ═════

    // ─ Storage type selector toggle ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/parts/storage_type_select.php:123 @verified 2026-09-30 @product duplicator
    // Real plugin: .dup-storage-type-selector__toggle toggles is-open on
    // #dup-storage-type-selector (the card grid).
    {
      label: 'storage-type-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-storage-type-selector .dup-storage-type-selector__toggle'); },
      apply: function (el) {
        var box = closestTo(el, '#dup-storage-type-selector');
        box.classList.toggle('is-open');
      },
      state: function (el) { return { key: 'storage.selector', value: closestTo(el, '#dup-storage-type-selector').classList.contains('is-open') }; }
    },

    // ─ Storage type card ──────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/parts/storage_type_select.php:127 @verified 2026-09-30 @product duplicator
    // Real plugin: a disabled card (data-storage-disabled 1) does nothing.
    // Otherwise its radio is checked, select#change-mode takes its type, every
    // card loses is-selected and it gains it, its icon and name go into
    // .dup-storage-type-selector__current, the grid closes and ChangeMode()
    // shows #provider-<type> (below). In place, as live: every provider form
    // is already on the page.
    {
      label: 'storage-type-card',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-storage-type-selector .dup-storage-card'); },
      apply: function (el) {
        var card = closestTo(el, '.dup-storage-card');
        if (card.getAttribute('data-storage-disabled') === '1') return;
        var box = closestTo(card, '#dup-storage-type-selector');
        var type = card.getAttribute('data-storage-type');
        var radio = one('input[type="radio"]', card);
        if (radio) radio.checked = true;
        var sel = document.getElementById('change-mode');
        if (sel) sel.value = type;
        all('.dup-storage-card', box).forEach(function (c) { c.classList.remove('is-selected'); });
        card.classList.add('is-selected');
        var cur = one('.dup-storage-type-selector__current', box);
        if (cur) {
          cur.innerHTML = '';
          all('i, img', card).forEach(function (n) { cur.appendChild(n.cloneNode(true)); });
          var s = document.createElement('span');
          s.textContent = card.getAttribute('data-storage-name') || '';
          cur.appendChild(s);
        }
        box.classList.remove('is-open');
        storageChangeMode(400);
      },
      state: function (el) { return { key: 'storage.type', value: closestTo(el, '.dup-storage-card').getAttribute('data-storage-type') }; }
    },

    // ─ Storage type select ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/parts/storage_type_select.php:228 @verified 2026-09-30 @product duplicator
    // Real plugin: select#change-mode (hidden behind the card grid) runs
    // ChangeMode() on change (its inline onchange).
    {
      label: 'storage-type-select',
      event: 'change',
      match: function (el) { return is(el, 'select#change-mode[onchange*="DupliJs.Storage.ChangeMode"]'); },
      apply: function () { storageChangeMode(400); }
    },

    // ─ S3 region endpoint autofill ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/parts/storage_type_select.php:171 @verified 2026-09-30 @product duplicator
    // Real plugin (Autofill, bound by ChangeMode for the shown type):
    // Backblaze (9) and DreamObjects (13) fill an empty region from the
    // endpoint's 2nd host label, Vultr (12) and DigitalOcean (14) from the
    // 1st, on the endpoint's change; Wasabi (10) fills an empty endpoint with
    // s3.<region>.wasabisys.com on the region's change.
    {
      label: 's3-region-autofill',
      event: 'change',
      match: function (el) { return /^s3_(endpoint|region)_(9|10|12|13|14)$/.test(el.id || ''); },
      apply: function (el) {
        var m = /^s3_(endpoint|region)_(\d+)$/.exec(el.id);
        var type = m[2];
        if (String(currentStorageMode()) !== type) return;   // bound only for the shown type
        var region = document.getElementById('s3_region_' + type);
        var endpoint = document.getElementById('s3_endpoint_' + type);
        if (!region || !endpoint) return;
        if (type === '10') {
          if (m[1] !== 'region' || endpoint.value.length > 0) return;
          endpoint.value = region.value.length > 0 ? 's3.' + region.value + '.wasabisys.com' : '';
          return;
        }
        if (m[1] !== 'endpoint' || region.value.length > 0) return;
        var pos = (type === '9' || type === '13') ? 1 : 0;
        region.value = endpoint.value.length > 0 ? (endpoint.value.replace(/.*:\/\//g, '').split('.')[pos] || '') : '';
      }
    },

    // ─ Local filter protection ────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/configs/local.php:159 @verified 2026-09-30 @product duplicator
    // Real plugin (LocalFilterToggle, onchange of #_local_filter_protection):
    // checked hides #_local_filter_protection_message over 400 ms, unchecked
    // shows it over 400 ms.
    {
      label: 'local-filter-protection',
      event: 'change',
      match: function (el) { return is(el, '#_local_filter_protection'); },
      apply: function (el) {
        if (el.checked) R.hide('#_local_filter_protection_message', 400);
        else R.show('#_local_filter_protection_message', 400);
      }
    },

    // ─ Duplicator Cloud token field ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/dupcloudaddon/template/dupcloudaddon/connect/storage_auth.php:162 @verified 2026-09-30 @product duplicator
    // Real plugin (DupCloud.ShowTokenInput): #dupli-dupcloud-connect-btn-area
    // hides, #dupli-dupcloud-token-area shows. No call; the Finalize after it
    // is remote (never).
    {
      label: 'dupcloud-token-field',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Storage.DupCloud.ShowTokenInput"]'); },
      apply: function () {
        show(all('#dupli-dupcloud-connect-btn-area'), false);
        show(all('#dupli-dupcloud-token-area'), true);
      }
    },

    // ─ Storage remote calls never ─────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/storages/parts/test_button.php:27 @verified 2026-09-30 @product duplicator
    // Real plugin: Test Storage connects to the provider (duplicator_storage_
    // test), every OAuth Connect / Authorize / Cancel Authorization opens the
    // provider or revokes (dropbox.php:210-269, google_drive.php:228-234,
    // onedrive.php:228-252; the Dropbox and licence-connect buttons are bound by
    // jQuery, dropbox.php:273 and probase/dupcloud/connect_button.php:64), and
    // Save Provider saves (H4 / H2). Logged misses.
    {
      label: 'storage-remote-never',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '#button_file_test, #button_save_provider, [onclick*="DupliJs.Storage.Test("], [onclick*="OpenAuthPage"], [onclick*="GetAuthUrl"], [onclick*="CancelAuthorization"], #dupcloud-finalize-setup, #dupli-dropbox-connect-btn, #dupli-dupcloud-license-connect-btn');
      },
      apply: function (el) {
        var save = !!closestTo(el, '#button_save_provider');
        R.miss(save ? 'admin.php?page=duplicator-storage&action=save' : 'admin-ajax.php?action=duplicator_storage_test',
          save ? 'saves the storage — never in a snapshot' : 'calls the remote provider — never in a snapshot');
      }
    },

    // ═══ Schedules list (admin-schedules) ══════════════════════════════════

    // ─ Schedule edit link ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:543 @verified 2026-09-30 @product duplicator
    // Real plugin (Schedule.Edit(id), the name and "Edit"): document.location
    // to the edit URL (inner_page=edit) + '&schedule_id=' + id.
    {
      label: 'schedule-edit-link',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.Edit("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Schedule.Edit');
        if (a) hop('admin.php?page=duplicator-schedules&inner_page=edit&schedule_id=' + a[0]);
      }
    },

    // ─ Schedule quick view ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:383 @verified 2026-09-30 @product duplicator
    // Real plugin (QuickView(id)): $('#detail-' + id).toggle().
    {
      label: 'schedule-quick-view',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.QuickView("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Schedule.QuickView');
        if (a) R.toggle(document.getElementById('detail-' + a[0]));
      }
    },

    // ─ Schedule run now confirm ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:388 @verified 2026-09-30 @product duplicator
    // Real plugin (RunNow(id)): the "RUN SCHEDULE?" confirm, its OK carrying
    // data-id. The OK starts a backup (H1): a no-op, and its own tb_remove()
    // closes it.
    {
      label: 'schedule-run-now-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.RunNow("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Schedule.RunNow');
        var d = showConfirm('DupliJs.Schedule.Run(this)', 'RUN SCHEDULE?');
        var ok = d && document.getElementById(d.id + '-confirm');
        if (ok && a) ok.setAttribute('data-id', a[0]);
      }
    },

    // ─ Schedule delete confirm ────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:420 @verified 2026-09-30 @product duplicator
    // Real plugin (Schedule.Delete(id)): the "Delete Schedule?" single
    // confirm (confirm3), its OK carrying data-id.
    {
      label: 'schedule-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.Delete("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Schedule.Delete');
        var d = showConfirm('DupliJs.Schedule.DeleteThis(this)', 'Delete Schedule?');
        var ok = d && document.getElementById(d.id + '-confirm');
        if (ok && a) ok.setAttribute('data-id', a[0]);
      }
    },

    // ─ Schedule copy never ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:549 @verified 2026-09-30 @product duplicator
    // Real plugin: Copy goes to the copy URL, which saves a schedule
    // (SchedulePageController.php:172-195); so does an edit page's Copy From
    // Apply (parts/edit_toolbar.php:36-73). Logged miss.
    {
      label: 'schedule-copy-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.Copy("], #dup-schedule-copy-btn'); },
      apply: function () { R.miss('admin.php?page=duplicator-schedules&action=copy-schedule', 'the copy action saves a schedule — never in a snapshot'); }
    },

    // ─ Schedule bulk apply ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_list.php:506 @verified 2026-09-30 @product duplicator
    // Real plugin (Schedule.BulkAction): nothing checked → "Selection
    // Required"; no action → "Bulk Action Required"; Delete (1) / Activate
    // (2) / Deactivate (3) → their confirm.
    {
      label: 'schedule-bulk-apply',
      event: 'click',
      match: function (el) { return is(el, '[onclick*="DupliJs.Schedule.BulkAction"]'); },
      apply: function () {
        if (!all("input[name^='selected_id[]']:checked").length) {
          showDialog(/Please select at least one schedule to perform the action on!/, 'Selection Required');
          return;
        }
        var sel = document.getElementById('bulk_action');
        var v = sel ? sel.value : '-1';
        if (v === '-1') { showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Bulk Action Required'); return; }
        if (v === '1') showConfirm('DupliJs.Schedule.BulkDelete', 'Delete Schedule?');
        else if (v === '2') showConfirm('DupliJs.Schedule.BulkActivate', 'Activate Schedule?');
        else if (v === '3') showConfirm('DupliJs.Schedule.BulkDeactivate', 'Deactivate Schedule?');
        else showDialog(/Please select at least one schedule to perform the action on!/, 'Selection Required');
      }
    },

    // ═══ Schedule edit (admin-schedules-edit-*) ════════════════════════════

    // ─ Schedule repeats ───────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/parts/repeats_options.php:118 @verified 2026-09-30 @product duplicator
    // Real plugin (ChangeMode, onchange of select#change-mode): the four
    // repeat areas hide; with no weekday checked Monday is checked (so Parsley
    // skips weekly); then 0 Daily / 1 Weekly / 2 Monthly show their area and
    // the start time over 400 ms, 3 Hourly shows its area and hides the start
    // time over 400 ms.
    {
      label: 'schedule-repeats',
      event: 'change',
      match: function (el) { return is(el, 'select#change-mode[onchange*="DupliJs.Schedule.ChangeMode"]'); },
      apply: function (el) {
        var mode = el.value;
        R.hide('#repeat-hourly-area, #repeat-daily-area, #repeat-weekly-area, #repeat-monthly-area');
        if (!all('#repeat-weekly-area input:checked').length) {
          var mon = document.getElementById('repeat-weekly-mon');
          if (mon) mon.checked = true;
        }
        var area = { '0': '#repeat-daily-area', '1': '#repeat-weekly-area', '2': '#repeat-monthly-area', '3': '#repeat-hourly-area' }[mode];
        if (area) R.show(area, 400);
        if (mode === '3') R.hide('#start-time-label, #start-time-content', 400);
        else if (area) R.show('#start-time-label, #start-time-content', 400);
      },
      state: function (el) { return { key: 'schedule.repeat', value: el.value }; }
    },

    // ─ Schedule edit template link ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/schedule_template_selector.php:111 @verified 2026-09-30 @product duplicator
    // Real plugin (Schedule.EditTemplate): the template edit URL +
    // '&package_template_id=' + the selector's value, in a new window —
    // opened here in place (DESIGN WO-202G ruling 5).
    {
      label: 'schedule-edit-template',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Schedule.EditTemplate"]'); },
      apply: function () {
        var sel = document.getElementById('schedule-template-selector');
        hop('admin.php?page=duplicator-tools&tab=templates&inner_page=edit&package_template_id=' + (sel ? sel.value : ''));
      }
    },

    // ─ Schedule template picked ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/schedule_template_selector.php:133 @verified 2026-09-30 @product duplicator
    // Real plugin: #schedule-template-selector change copies its value into
    // #schedule-template-id and shows the edit button for a template (> 0),
    // else the add and sync buttons (ToggleTemplateEditBtn, :117-124).
    {
      label: 'schedule-template-picked',
      event: 'change',
      match: function (el) { return is(el, '#schedule-template-selector'); },
      apply: function (el) {
        var hidden = document.getElementById('schedule-template-id');
        if (hidden) hidden.value = el.value;
        show(all('#schedule-template-edit-btn, #schedule-template-add-btn, #schedule-template-sync-btn'), false);
        if (parseInt(el.value, 10) > 0) show(all('#schedule-template-edit-btn'), true);
        else show(all('#schedule-template-add-btn, #schedule-template-sync-btn'), true);
      }
    },

    // ─ Schedule save never ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/scheduleaddon/template/scheduleaddon/admin_pages/schedules/schedule_edit.php:101 @verified 2026-09-30 @product duplicator
    // Real plugin: Save Schedule posts the form and saves (never). Logged miss.
    {
      label: 'schedule-save-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-save-schedule'); },
      apply: function () { R.miss('admin.php?page=duplicator-schedules&action=save', 'saves the schedule — never in a snapshot'); }
    },

    // ═══ Templates list (admin-tools-templates*) ═══════════════════════════

    // ─ Template edit link ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/template_list.php:208 @verified 2026-09-30 @product duplicator
    // Real plugin (Template.Edit(id)): the edit URL + '&package_template_id=' + id.
    {
      label: 'template-edit-link',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Template.Edit("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Template.Edit');
        if (a) hop('admin.php?page=duplicator-tools&tab=templates&inner_page=edit&package_template_id=' + a[0]);
      }
    },

    // ─ Template bulk apply ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/template_list.php:250 @verified 2026-09-30 @product duplicator
    // Real plugin (Template.BulkAction): nothing checked → "Selection
    // Required"; action not delete → "Bulk Action Required"; else the "Delete
    // the selected templates?" confirm.
    {
      label: 'template-bulk-apply',
      event: 'click',
      match: function (el) { return is(el, '[onclick*="DupliJs.Template.BulkAction"]'); },
      apply: function () {
        if (!all("input[name^='selected_id[]']:checked").length) {
          showDialog(/Please select at least one template to delete!/, 'Selection Required');
          return;
        }
        var sel = document.getElementById('bulk_action');
        if (!sel || sel.value !== 'delete') { showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Bulk Action Required'); return; }
        showConfirm('DupliJs.Template.BulkDelete', 'Delete the selected templates?');
      }
    },

    // ═══ Recovery (admin-tools-recovery and the widget elsewhere) ══════════

    // ─ Recovery point writes never ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/recoveryaddon/template/recoveryaddon/admin_pages/tools/recovery/widget/recovery-widget-scripts.php:189 @verified 2026-09-30 @product duplicator
    // Real plugin: Set (duplicator_set_recovery — copies installer files) and
    // Reset (duplicator_reset_recovery) write; the launcher download is an
    // AJAX file (interactions.md §9). Logged misses.
    {
      label: 'recovery-writes-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dupli-recovery-widget-wrapper .recovery-set, .dupli-recovery-widget-wrapper .recovery-reset, .dupli-recovery-download-launcher:not(.disabled)'); },
      apply: function (el) {
        var set = !!closestTo(el, '.recovery-set');
        var reset = !!closestTo(el, '.recovery-reset');
        var action = set ? 'duplicator_set_recovery' : reset ? 'duplicator_reset_recovery' : 'duplicator_disaster_launcher_download';
        R.miss('admin-ajax.php?action=' + action, 'writes the recovery point — never in a snapshot');
      }
    },

    // ═══ Settings › General (admin-settings-general) ═══════════════════════

    // ─ License visibility preview ─────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/probase/template/licensing/main.php:52 @verified 2026-09-30 @product duplicator
    // Real plugin (VisibilityTemporary(n), onclick of each visibility radio,
    // licensing/visibility.php:55-75): 1 visible shows the dashboard, type and
    // key rows; 0 info only hides the key row; 2 invisible hides all three.
    // Only a preview: Save (ChangeKeyVisibility) submits and saves.
    {
      label: 'license-visibility-preview',
      event: 'click',
      match: function (el) { return is(el, 'input[name="license_key_visible"][onclick*="VisibilityTemporary"]'); },
      apply: function (el) {
        var v = parseInt(el.value, 10);
        show(all('#dup-tr-license-dashboard, #dup-tr-license-type'), v !== 2);
        show(all('#dup-tr-license-key-and-description'), v === 1);
      },
      state: function (el) { return { key: 'license.visibility', value: el.value }; }
    },

    // ─ License actions never ──────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/probase/template/licensing/main.php:34 @verified 2026-09-30 @product duplicator
    // Real plugin: Activate / Deactivate call duplicator.com and save, Clear
    // deletes the key, the visibility Save submits (interactions.md §10,
    // NEVER). Logged misses.
    {
      label: 'license-actions-never',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '[onclick*="DupliJs.Licensing.ChangeActivationStatus"], [onclick*="DupliJs.Licensing.ClearActivationStatus"], [onclick*="DupliJs.Licensing.ChangeKeyVisibility"]');
      },
      apply: function () { R.miss('admin.php?page=duplicator-settings&action=license', 'licence change calls duplicator.com / saves — never in a snapshot'); }
    },

    // ─ Settings reset confirm ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/general/general.php:77 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmResetAll): the "Reset Settings?" confirm (Yes / No,
    // :42-51). Yes goes to the reset action (saves): a no-op, and its own
    // tb_remove() closes the dialog.
    {
      label: 'settings-reset-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.ConfirmResetAll"]'); },
      apply: function () { showConfirm('DupliJs.Pack.ResetAll()', 'Reset Settings?'); }
    },

    // ─ Delete activity logs confirm ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/general/general.php:85 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmDeleteActivityLogs): the "Delete Activity Logs?"
    // confirm (:53-62). Yes deletes over AJAX (H8): a no-op, it closes.
    {
      label: 'activity-logs-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Settings.ConfirmDeleteActivityLogs"]'); },
      apply: function () { showConfirm('DupliJs.Settings.DeleteActivityLogs()', 'Delete Activity Logs?'); }
    },

    // ─ Trace log download never ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/general/general.php:70 @verified 2026-09-30 @product duplicator
    // Real plugin (DownloadTraceLog): location to admin-ajax
    // duplicator_get_trace_log, a file with server paths. Logged miss.
    {
      label: 'trace-log-download-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.DownloadTraceLog"]'); },
      apply: function () { R.miss('admin-ajax.php?action=duplicator_get_trace_log', 'downloads the trace log — never in a snapshot'); }
    },

    // ═══ Settings › Backups (admin-settings-package) ═══════════════════════

    // ─ Database engine sub options ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/backup_settings.php:46 @verified 2026-09-30 @product duplicator
    // Real plugin (SetDBEngineMode, onclick of each _package_dbmode radio):
    // both detail blocks hide; Mysqldump shows #dbengine-details-1, PHP and
    // PHP chunking #dbengine-details-2; a disabled Mysqldump with a custom
    // path field keeps #dbengine-details-1 shown.
    {
      label: 'db-engine-mode',
      event: 'click',
      match: function (el) { return is(el, 'input[onclick*="DupliJs.UI.SetDBEngineMode"]'); },
      apply: function () {
        show(all('#dbengine-details-1, #dbengine-details-2'), false);
        if (checked('package_mysqldump')) show(all('#dbengine-details-1'), true);
        else if (checked('package_phpdump') || checked('package_phpchunkingdump')) show(all('#dbengine-details-2'), true);
        var my = document.getElementById('package_mysqldump');
        if (my && my.disabled && document.getElementById('_package_mysqldump_path')) show(all('#dbengine-details-1'), true);
      },
      state: function (el) { return { key: 'db.engine', value: el.value }; }
    },

    // ─ Archive engine sub options ─────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/backup_settings.php:80 @verified 2026-09-30 @product duplicator
    // Real plugin (SetArchiveOptionStates, onclick of each archive_build_mode
    // radio): ziparchive_mode is enabled only for ZipArchive (2); the three
    // #engine-details-N hide and the picked one (1 shell zip, 2 ZipArchive,
    // 3 DupArchive) shows; then setZipArchiveMode.
    {
      label: 'archive-engine-mode',
      event: 'click',
      match: function (el) { return is(el, 'input[onclick*="DupliJs.UI.SetArchiveOptionStates"]'); },
      apply: function () {
        var zip = checked('archive_build_mode2');
        all("[name='ziparchive_mode']").forEach(function (s) { s.disabled = !zip; });
        show(all('#engine-details-1, #engine-details-2, #engine-details-3'), false);
        if (checked('archive_build_mode1')) show(all('#engine-details-1'), true);
        else if (zip) show(all('#engine-details-2'), true);
        else if (checked('archive_build_mode3')) show(all('#engine-details-3'), true);
        zipArchiveMode();
      },
      state: function (el) { return { key: 'archive.engine', value: el.value }; }
    },

    // ─ ZipArchive mode ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/backup_settings.php:70 @verified 2026-09-30 @product duplicator
    // Real plugin (setZipArchiveMode, onchange of #ziparchive_mode): mode 0
    // shows the multi-thread block, else the single-thread one.
    {
      label: 'ziparchive-mode',
      event: 'change',
      match: function (el) { return is(el, '#ziparchive_mode'); },
      apply: function () { zipArchiveMode(); }
    },

    // ─ Cleanup mode fields ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/backup_settings.php:164 @verified 2026-09-30 @product duplicator
    // Real plugin (cleanupModeRadioSwitched on cleanup_mode change): Off makes
    // the hours and e-mail fields readonly; Email Notice only the hours; Auto
    // Cleanup neither.
    {
      label: 'cleanup-mode-fields',
      event: 'change',
      match: function (el) { return is(el, 'input[type=radio][name=cleanup_mode]'); },
      apply: function () {
        var hours = document.getElementById('auto_cleanup_hours');
        var mail = document.getElementById('cleanup_email');
        function ro(e, on) { if (!e) return; if (on) e.setAttribute('readonly', 'readonly'); else e.removeAttribute('readonly'); }
        if (checked('cleanup_mode_Cleanup_Off')) { ro(hours, true); ro(mail, true); }
        else if (checked('cleanup_mode_Email_Notice')) { ro(hours, true); ro(mail, false); }
        else if (checked('cleanup_mode_Auto_Cleanup')) { ro(hours, false); ro(mail, false); }
      }
    },

    // ─ Basic auth override ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/advanced_settings.php:266 @verified 2026-09-30 @product duplicator
    // Real plugin: override_basic_auth auto shows #dup-basic-auth-auto-status
    // and hides #dup-basic-auth-login-wrapper; custom the reverse (no-display).
    {
      label: 'basic-auth-override',
      event: 'change',
      match: function (el) { return is(el, 'input[name="override_basic_auth"]'); },
      apply: function (el) {
        var auto = el.value === 'auto';
        noDisplay(all('#dup-basic-auth-auto-status'), auto);
        noDisplay(all('#dup-basic-auth-login-wrapper'), !auto);
      }
    },

    // ─ AJAX protocol custom URL ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/backup/advanced_settings.php:273 @verified 2026-09-30 @product duplicator
    // Real plugin: .ajax_protocol custom turns #override_ajax_url into a
    // shown text field; any other value makes it a hidden input again.
    {
      label: 'ajax-protocol-custom-url',
      event: 'change',
      match: function (el) { return is(el, '.ajax_protocol'); },
      apply: function (el) {
        var field = document.getElementById('override_ajax_url');
        if (!field) return;
        if (el.value === 'custom') { field.setAttribute('type', 'text'); show(field, true); }
        else field.setAttribute('type', 'hidden');
      }
    },

    // ═══ Settings › Import / Export (admin-settings-migrate) ═══════════════

    // ─ Settings export dialog ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/migrate_settings/export.php:77 @verified 2026-09-30 @product duplicator
    // Real plugin (ExportDialog): tb_show('Export Duplicator Pro Data?',
    // #modal-window-export, 610 × 250) + TB_WINDOW_CLASS. Its Run Export
    // downloads a file with storage credentials (never): the stub is a no-op
    // and its own 4 s tb_remove() closes the dialog.
    {
      label: 'settings-export-dialog',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.ExportDialog"]'); },
      apply: function () { tbShowPlain('Export Duplicator Pro Data?', 'modal-window-export', 610, 250); }
    },

    // ─ Settings import button state ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/migrate_settings/import.php:150 @verified 2026-09-30 @product duplicator
    // Real plugin (ChangeImportButtonState, on the file's change and each
    // option's click): Import Data is enabled only with a file picked and at
    // least one option checked. The Schedules option (the schedule addon,
    // scheduleaddon/ScheduleAddon.php:627-637) checks and locks Storage and
    // Templates while it is checked.
    {
      label: 'settings-import-state',
      event: 'click',
      match: function (el) { return is(el, 'input[name="import-opts[]"]'); },
      apply: function (el) {
        if (el.id === 'import-schedules') {
          var t = document.getElementById('import-templates');
          var s = document.getElementById('import-storages');
          if (el.checked) { if (t) { t.checked = true; t.disabled = true; } if (s) { s.checked = true; s.disabled = true; } }
          else { if (t) t.disabled = false; if (s) s.disabled = false; }
        }
        importButtonState();
      }
    },

    // ─ Settings import file picked ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/migrate_settings/import.php:161 @verified 2026-09-30 @product duplicator
    // Real plugin: #import-file change runs ChangeImportButtonState.
    {
      label: 'settings-import-file',
      event: 'change',
      match: function (el) { return is(el, '#import-file'); },
      apply: function () { importButtonState(); }
    },

    // ─ Settings import dialog ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/migrate_settings/import.php:130 @verified 2026-09-30 @product duplicator
    // Real plugin (ImportDialog): tb_show('Import Duplicator Pro Data?',
    // #modal-window-import, 610 × 300) + TB_WINDOW_CLASS. Its Run Import
    // submits the form and overwrites settings (never): the stub is a no-op,
    // and it closes the dialog here.
    {
      label: 'settings-import-dialog',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.ImportDialog"]') && !closestTo(el, '[disabled]'); },
      apply: function () { tbShowPlain('Import Duplicator Pro Data?', 'modal-window-import', 610, 300); }
    },

    // ─ Settings import run never ──────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/settings/migrate_settings/import.php:126 @verified 2026-09-30 @product duplicator
    // Real plugin (ImportProcess): submits #dup-tools-form-import — overwrites
    // settings. The dialog closes; nothing is sent.
    {
      label: 'settings-import-run-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#TB_window [onclick*="DupliJs.Tools.ImportProcess"]'); },
      apply: function () {
        R.miss('admin.php?page=duplicator-settings&tab=migrate&action=import', 'overwrites settings — never in a snapshot');
        withLibs(function () { if (typeof window.tb_remove === 'function') window.tb_remove(); });
      }
    },

    // ═══ Settings › Brand (admin-settings-brand*) ══════════════════════════

    // ─ Brand edit link ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_list.php:233 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.Edit(id)): the edit URL (inner_page=edit) +
    // '&action=default&id=0' for the default brand, else '&action=edit&id=N'.
    // The edit screen reads only `id` (src/Controllers/BrandSettingsController.php:71-89;
    // `action` names no page action there), so the hop resolves the URL without it.
    {
      label: 'brand-edit-link',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Settings.Brand.Edit("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Settings.Brand.Edit');
        if (a) hop('admin.php?page=duplicator-settings&tab=brand&inner_page=edit&id=' + a[0]);
      }
    },

    // ─ Brand quick view ───────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_list.php:241 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.View(id)): toggles #quick-view-<id> and #main-view-<id>.
    {
      label: 'brand-quick-view',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Settings.Brand.View("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Settings.Brand.View');
        if (!a) return;
        R.toggle(document.getElementById('quick-view-' + a[0]));
        R.toggle(document.getElementById('main-view-' + a[0]));
      }
    },

    // ─ Brand delete confirm ───────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_list.php:247 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.Delete(id)): the single "Delete Brand?" confirm, its
    // OK carrying data-id. OK deletes (H8): a no-op, the dialog closes.
    {
      label: 'brand-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Settings.Brand.Delete("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Settings.Brand.Delete');
        var d = showConfirm('DupliJs.Settings.Brand.DeleteThis(this)', 'Delete Brand?');
        var ok = d && document.getElementById(d.id + '-confirm');
        if (ok && a) ok.setAttribute('data-id', a[0]);
      }
    },

    // ─ Brand bulk apply ───────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_list.php:290 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.BulkAction): nothing checked → "Selection Required";
    // action not delete → "Bulk Action Required"; else the bulk "Delete
    // Brand?" confirm. SetAll (:318) is the list-select-all entry's twin.
    {
      label: 'brand-bulk-apply',
      event: 'click',
      match: function (el) { return is(el, '[onclick*="DupliJs.Settings.Brand.BulkAction"]'); },
      apply: function () {
        if (!all("input[name^='selected_id[]']:checked").length) {
          showDialog(/Please select at least one brand to delete!/, 'Selection Required');
          return;
        }
        var sel = document.getElementById('bulk_action');
        if (!sel || sel.value !== 'delete') { showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Bulk Action Required'); return; }
        showConfirm('DupliJs.Settings.Brand.BulkDelete', 'Delete Brand?');
      }
    },

    // ─ Brand select all ───────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_list.php:318 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.SetAll(chkbox)): every .item-chk takes its state.
    {
      label: 'brand-select-all',
      event: 'click',
      match: function (el) { return is(el, 'input[onclick*="DupliJs.Settings.Brand.SetAll"]'); },
      apply: function (el) { all('.item-chk').forEach(function (c) { c.checked = !!el.checked; }); }
    },

    // ─ Brand style guide ──────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_edit.php:123 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.ShowStyleGuide): the "Branding Guide" alert, 650 ×
    // 400, its body the branding-guide template (:98-103).
    {
      label: 'brand-style-guide',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Brand.ShowStyleGuide"]'); },
      apply: function () { showDialog(/Font-Awesome/, 'Branding Guide', 650, 400); }
    },

    // ─ Brand logo preview ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_edit.php:233 @verified 2026-09-30 @product duplicator
    // Real plugin (Settings.Automatization on #brand-logo input, non-default
    // brands only): after an 800 ms debounce the textarea's HTML goes into
    // #preview-logo. Its strip_tags (:168-180) passes regexes as strings, so
    // it removes nothing: the preview takes the value as typed. The server
    // image paths it collects into #brand-attachments are a save-time field.
    {
      label: 'brand-logo-preview',
      event: 'input',
      match: function (el) {
        // not bound for the default brand (id 0, brand_edit.php:227 `if (!$brand->isDefault())`)
        return is(el, '#dupli-package-brand-form #brand-logo') && (ownParams() || {}).id !== '0';
      },
      apply: function (el) {
        var token = ++logoTyping;
        R.wait(800, function () {
          if (token !== logoTyping) return;   // clearTimeout(Debounce)
          var prev = one('#dupli-package-brand-form #preview-logo');
          if (prev) prev.innerHTML = el.value;
        });
      }
    },

    // ─ Brand save never ───────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/brandaddon/template/brandaddon/brand/brand_edit.php:182 @verified 2026-09-30 @product duplicator
    // Real plugin (Brand.Save): Parsley validates, then the form submits and
    // saves the brand (never). Logged miss.
    {
      label: 'brand-save-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Settings.Brand.Save"]'); },
      apply: function () { R.miss('admin.php?page=duplicator-settings&tab=brand&action=save-brand', 'saves the brand — never in a snapshot'); }
    },

    // ═══ Settings › Capabilities (admin-settings-capabilities) ═════════════

    // ─ Capabilities reset confirm ─────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/capabilitiesaddon/template/capabilitiesaddon/capabilities.php:188 @verified 2026-09-30 @product duplicator
    // Real plugin: #dup-capabilities-reset opens the "reset the capabilities
    // to default?" confirm (:150-156). Its OK goes to the reset action
    // (saves): a no-op, the dialog closes.
    {
      label: 'capabilities-reset-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-capabilities-reset'); },
      apply: function () { showConfirm('DupliJs.Settings.CapabilitesReset()', 'Are you sure you want to reset the capabilities to default?'); }
    },

    // ═══ Tools › General (admin-tools-general) ═════════════════════════════

    // ─ Tools reset backups confirm ────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/general.php:325 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmResetPackages): the "Reset Backups ?" confirm (Yes /
    // No, :27-36). Yes resets over AJAX (H8): a no-op, its own tb_remove()
    // closes it.
    {
      label: 'tools-reset-backups-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Pack.ConfirmResetPackages"]'); },
      apply: function () { showConfirm('DupliJs.Pack.ResetPackages()', 'Reset Backups ?'); }
    },

    // ─ Tools clear build cache confirm ────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/general.php:258 @verified 2026-09-30 @product duplicator
    // Real plugin (ClearBuildCache): the "This process will remove all build
    // cache files." confirm (:251-256). OK goes to the remove-cache action
    // (deletes): a no-op, the dialog closes.
    {
      label: 'tools-clear-cache-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.ClearBuildCache()"]'); },
      apply: function () { showConfirm('DupliJs.Tools.ClearBuildCacheRun()', 'This process will remove all build cache files.'); }
    },

    // ─ Tools scan validator confirm ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/general_validator.php:110 @verified 2026-09-30 @product duplicator
    // Real plugin (ConfirmScanValidator): the "Run Validator" confirm
    // (:20-24). OK runs the validator over AJAX; its results are not parked,
    // so the OK closes the dialog and logs a miss.
    {
      label: 'tools-scan-validator-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.ConfirmScanValidator"]'); },
      apply: function () { showConfirm('DupliJs.Tools.runScanValidator()', 'Run Validator'); }
    },
    // ─ Tools scan validator run ──────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/general_validator.php:116 @verified 2026-09-30 @product duplicator
    // Real plugin (runScanValidator, the confirm's OK): AJAX
    // duplicator_tool_scan_validator; no parked answer — a logged miss.
    {
      label: 'tools-scan-validator-run',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#TB_window .dup-dialog-confirm[onclick*="DupliJs.Tools.runScanValidator"]'); },
      apply: function () { R.miss('admin-ajax.php?action=duplicator_tool_scan_validator', 'validator results are an AJAX answer the capture did not park'); }
    },

    // ─ Tools file actions never ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/general.php:245 @verified 2026-09-30 @product duplicator
    // Real plugin: Delete Installation Files goes to the clean-files action
    // (deletes), the diagnostic data button downloads logs and settings, and
    // Check Remote Backups contacts every storage (interactions.md §11,
    // NEVER). Logged misses.
    {
      label: 'tools-file-actions-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.removeInstallerFiles"], #download-diagnostic-data-btn, #check-remote-backups'); },
      apply: function (el) {
        var id = (closestTo(el, '[onclick*="DupliJs.Tools.removeInstallerFiles"], #download-diagnostic-data-btn, #check-remote-backups').id || 'remove-installer-files');
        R.miss('admin.php?page=duplicator-tools&tab=general&action=' + id, 'writes, downloads or calls remote storage — never in a snapshot');
      }
    },

    // ═══ Tools › Logs (admin-tools-logs) ═══════════════════════════════════

    // ─ Tools logs options panel ───────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/duplicator_logs.php:50 @verified 2026-09-30 @product duplicator
    // Real plugin (FullLog, bound to #dup-options at :110): a shown right
    // panel hides over 400 ms and the left one widens to 100 %; a hidden one
    // shows over 200 ms and the left one goes back to 75 %.
    {
      label: 'tools-logs-options-panel',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-options'); },
      apply: function () {
        var left = document.getElementById('dupli-log-pnl-left');
        var right = document.getElementById('dupli-log-pnl-right');
        if (!right) return;
        if (visible(right)) { R.hide(right, 400); if (left) left.style.width = '100%'; }
        else { R.show(right, 200); if (left) left.style.width = '75%'; }
      }
    },

    // ─ Tools logs refresh and clear ───────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/duplicator_logs.php:66 @verified 2026-09-30 @product duplicator
    // Real plugin: Refresh submits #dup-form-logs (a reload of this same
    // log); auto-refresh counts down on a 1 s setInterval and resubmits,
    // which the determinism rules bar; clear trace log deletes over AJAX.
    // Refresh is this page again (no hop); clear is a logged miss.
    {
      label: 'tools-logs-refresh-clear',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dup-refresh, [onclick*="DupliJs.UI.ClearTraceLog"]'); },
      apply: function (el) {
        if (closestTo(el, '#dup-refresh')) return;
        R.miss('admin-ajax.php?action=duplicator_delete_trace_log', 'deletes the trace log — never in a snapshot');
      }
    },

    // ═══ Templates (list delete, edit page) ════════════════════════════════

    // ─ Template delete confirm ────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/templateaddon/template/templateaddon/template_list.php:212 @verified 2026-09-30 @product duplicator
    // Real plugin (Template.Delete(id, scheduleCount)): the single "Are you
    // sure you want to delete this template?" confirm; with schedules using
    // it the message names their count; its OK carries data-id. OK submits
    // the delete (H8): a no-op, the dialog closes.
    {
      label: 'template-delete-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Template.Delete("]'); },
      apply: function (el) {
        var a = callArgs(el, 'DupliJs.Template.Delete');
        var d = showConfirm('DupliJs.Template.DeleteThis(this)', 'Are you sure you want to delete this template?');
        if (!d || !a) return;
        var n = parseInt(a[1], 10) || 0;
        if (n > 0) {
          var msg = document.getElementById(d.id + '_message');
          if (msg) msg.innerHTML = 'There currently are ' + n + ' schedule(s) using this template.  All schedules using this template will be reassigned to the "Default" template. ';
        }
        var ok = document.getElementById(d.id + '-confirm');
        if (ok) ok.setAttribute('data-id', a[0]);
      }
    },

    // ═══ Activity log (admin-activity-log*) ════════════════════════════════

    // ─ Activity log detail ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/activity_log/log_list.php:83 @verified 2026-09-30 @product duplicator
    // Real plugin: a .dup-log-view-btn (title or Details) fetches the log's
    // detail HTML over AJAX and shows it in a DuplicatorModalBox. The page
    // opened with open_log_id shows the same modal on load (:115-118), and
    // that page is captured for each log, so the click opens it: the answer
    // parked as its own screen (DESIGN §5 (a)). No capture for the id = a miss.
    {
      label: 'activity-log-detail',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-log-view-btn[data-log-id]'); },
      apply: function (el) {
        var id = closestTo(el, '.dup-log-view-btn').getAttribute('data-log-id');
        hop('admin.php?page=duplicator-activity-log&open_log_id=' + id, 'no capture of this log\'s detail');
      }
    },

    // ─ Modal box close ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/modal-box.js:124 @verified 2026-09-30 @product duplicator
    // Real plugin (DuplicatorModalBox.close, the close button's click, :92):
    // the .dup-modal-wrapper is removed and body overflow goes back to auto.
    // A capture taken with the modal open holds that wrapper as frozen DOM;
    // a box opened here is the library's own and closes itself.
    {
      label: 'modal-box-close',
      event: 'click',
      match: function (el) {
        var btn = closestTo(el, '.dup-modal-wrapper .dup-modal-close-button');
        return !!btn && !btn.hasAttribute('disabled') && !closestTo(btn, '.dup-modal-wrapper').__snapLive;
      },
      apply: function (el) {
        var wrap = closestTo(el, '.dup-modal-wrapper');
        if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
        document.body.style.overflow = 'auto';
      }
    },

    // ─ GET filter form ────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/activity_log/parts/toolbar.php:29 @verified 2026-09-30 @product duplicator
    // Real plugin: the activity-log filters are a plain method="get" form, so
    // Filter (and Enter in a field) loads the action URL with the form's
    // fields as its query — what the browser does with any GET form. The URL
    // resolves through the nav map (nav-rules.json knows which empty filters
    // are the plain list); an uncaptured filter is a logged miss.
    {
      label: 'get-form-submit',
      event: 'submit',
      match: function (el) { return is(el, 'form') && (el.getAttribute('method') || 'get').toLowerCase() === 'get' && !!closestTo(el, '#wpbody-content'); },
      apply: function (el, evt) {
        var base = el.getAttribute('action') || window.location.href;
        var fd;
        try { fd = new FormData(el, evt && evt.submitter ? evt.submitter : undefined); } catch (_) { fd = new FormData(el); }
        var q = new URLSearchParams();
        fd.forEach(function (v, k) { if (typeof v === 'string') q.append(k, v); });
        var path = base.split('#')[0].split('?')[0];
        hop(path + '?' + q.toString());
      }
    },

    // ═══ Staging (admin-staging) ═══════════════════════════════════════════

    // ─ Staging create modal ───────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/stagingaddon/assets/js/staging.js:72 @verified 2026-09-30 @product duplicator
    // Real plugin (openCreateModal, on #dupli-staging-create-new-btn and
    // .dupli-staging-open-modal-btn): a DuplicatorModalBox with the hidden
    // #dupli-staging-create-modal-content markup, close button in the
    // content, colour #666. Its Cancel closes it (:99-101).
    {
      label: 'staging-create-modal',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-staging-create-new-btn, .dupli-staging-open-modal-btn'); },
      apply: function () {
        var src = document.getElementById('dupli-staging-create-modal-content');
        if (!src) return;
        withLibs(function () {
          if (!modalBoxClass()) return;
          if (stagingBox) stagingBox.close();
          stagingBox = new (modalBoxClass())({
            htmlContent: src.innerHTML, closeInContent: true, closeColor: '#666',
            openCallback: function (content) { var w = closestTo(content, '.dup-modal-wrapper'); if (w) w.__snapLive = true; }
          });
          stagingBox.open();
        });
      }
    },
    // ─ Staging create cancel ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/stagingaddon/assets/js/staging.js:99 @verified 2026-09-30 @product duplicator
    // Real plugin: the modal's Cancel runs closeModal() (modalBox.close()).
    {
      label: 'staging-create-cancel',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dup-modal-wrapper #dupli-staging-cancel-btn'); },
      apply: function () { if (stagingBox) stagingBox.close(); }
    },

    // ─ Staging create never ───────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/stagingaddon/assets/js/staging.js:176 @verified 2026-09-30 @product duplicator
    // Real plugin (validateAndCreate on the modal form's submit): no backup
    // picked → an admin notice; else AJAX duplicator_staging_validate then
    // duplicator_staging_create installs a staging copy (H6: never). The
    // submit is a logged miss; the modal stays as it is.
    {
      label: 'staging-create-never',
      event: 'submit',
      match: function (el) { return is(el, '.dup-modal-wrapper #dupli-staging-create-form'); },
      apply: function () { R.miss('admin-ajax.php?action=duplicator_staging_create', 'installs a staging copy — never in a snapshot'); }
    },

    // ─ Staging bulk apply ─────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/addons/stagingaddon/template/stagingaddon/staging_page.php:220 @verified 2026-09-30 @product duplicator
    // Real plugin (Staging.ConfirmDelete): no Delete picked → "Bulk Action
    // Required"; nothing checked → "Selection Required"; else the "Delete
    // Staging Site(s)?" confirm (height 350) listing the checked sites and the
    // warning. Its OK deletes (H8): a no-op, the dialog closes.
    {
      label: 'staging-bulk-apply',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Staging.ConfirmDelete"]'); },
      apply: function () {
        var sel = document.getElementById('dupli-staging-bulk-actions');
        if (!sel || sel.value !== 'delete') { showDialog(/Please select an action from the "Bulk Actions" drop down menu!/, 'Bulk Action Required'); return; }
        var list = all('input[name=delete_confirm]:checked');
        if (!list.length) { showDialog(/Please select at least one staging site to delete!/, 'Selection Required'); return; }
        var d = confirmByCallback('DupliJs.Staging.Delete()');
        var msg = d && document.getElementById(d.id + '_message');
        if (!d || !msg) return;
        var html = list.length === 1 ? '<i>Are you sure you want to delete this staging site?</i>' : '<i>Are you sure you want to delete these staging sites?</i>';
        html += '<div class="dupli-staging-delete-items">';
        list.forEach(function (c) {
          var t = document.createElement('div'); t.textContent = c.getAttribute('data-staging-title') || '';
          html += '<div class="dupli-staging-delete-item"><i class="fas fa-clone"></i> <strong>' + t.innerHTML + '</strong></div>';
        });
        html += '</div><p class="dupli-staging-delete-warning"><strong>Warning:</strong> This will permanently delete all files and database tables for the selected staging site(s).</p>';
        msg.innerHTML = html;
        tbShow('Delete Staging Site(s)?', d.id, 500, 350);
      }
    },

    // ─ Plugin writes and downloads never ──────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/javascript.php:11 @verified 2026-09-30 @product duplicator
    // Real plugin: these inline calls download a file (DownloadFile creates a
    // download link and clicks it, javascript.php:11-22), stop a running build
    // (packages_scripts.php:253-259, details/transfer.php:297-300), or remove /
    // launch an import archive (importaddon import-scripts.php:135-175,
    // :276-303). All are hazard rows (interactions.md §2, §5, §6): each
    // function is a no-op here and the click is a logged miss naming it.
    {
      label: 'plugin-writes-never',
      event: 'click',
      match: function (el) { return !!neverCall(el); },
      apply: function (el) {
        var n = neverCall(el);
        R.miss(n.href, n.note);
      }
    },

    // ═══ Tools › PHP Logs (admin-tools-php-logs) ═══════════════════════════
    // (#dup-options is the same FullLog as Duplicator Logs, php_logs.php:312-327,
    // bound at :366: the tools-logs-options-panel entry above.)

    // ─ PHP log filter ─────────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/php_logs.php:246 @verified 2026-09-30 @product duplicator
    // Real plugin (errorFilter on #filter input / change): every #error-log
    // row whose second cell contains the picked text (case-insensitive) shows
    // as table-row, the others get display none.
    {
      label: 'php-log-filter',
      event: 'change',
      match: function (el) { return is(el, '#filter') && !!document.getElementById('error-log'); },
      apply: function (el) {
        var f = (el.value || '').toUpperCase();
        all('#error-log tr').forEach(function (tr) {
          var td = tr.getElementsByTagName('td')[1];
          if (td) tr.style.display = td.innerHTML.toUpperCase().indexOf(f) > -1 ? 'table-row' : 'none';
        });
      }
    },

    // ─ PHP log clear confirm ──────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/php_logs.php:290 @verified 2026-09-30 @product duplicator
    // Real plugin (ClearLog): the "Clear PHP Log?" confirm (:232-239). Its OK
    // submits the clear (H8): a no-op, the dialog closes.
    {
      label: 'php-log-clear-confirm',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[onclick*="DupliJs.Tools.ClearLog()"]'); },
      apply: function () { showConfirm('DupliJs.Tools.ClearLogSubmit()', 'Clear PHP Log?'); }
    },

    // ═══ Tools › AutoTune (admin-tools-auto-tune) ══════════════════════════

    // ─ AutoTune check details ─────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/dupli-autotune.js:66 @verified 2026-09-30 @product duplicator
    // Real plugin (showCheckDetails, each .dupli-autotune-chip): fills
    // #dupli-autotune-check-dialog from the chip's data-* (title,
    // description, status list, troubleshoot list, action link) and
    // showModal()s it. All of it is on the chip; nothing is fetched.
    {
      label: 'autotune-check-details',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.dupli-autotune-chip'); },
      apply: function (el) {
        var chip = closestTo(el, '.dupli-autotune-chip');
        var dialog = document.getElementById('dupli-autotune-check-dialog');
        if (!dialog || typeof dialog.showModal !== 'function') return;
        var d = chip.dataset;
        var t = one('.dupli-autotune-check-dialog-title', dialog); if (t) t.textContent = d.title || '';
        var ds = one('.dupli-autotune-check-dialog-description', dialog); if (ds) ds.textContent = d.description || '';
        var list = [];
        try { list = d.statusList ? JSON.parse(d.statusList) : []; } catch (_) {}
        var status = one('.dupli-autotune-check-dialog-status', dialog);
        if (status) {
          status.replaceChildren.apply(status, list.map(function (row) {
            var li = document.createElement('li');
            var icon = document.createElement('i');
            icon.className = row.available ? 'fa-solid fa-circle-check is-ready' : 'fa-solid fa-triangle-exclamation is-suggestion';
            icon.setAttribute('aria-hidden', 'true');
            var b = document.createElement('b'); b.textContent = row.label;
            var s = document.createElement('span'); s.textContent = row.stateLabel;
            li.append(icon, b, s);
            return li;
          }));
          status.hidden = list.length === 0;
        }
        var tips = [];
        try { tips = d.troubleshoot ? JSON.parse(d.troubleshoot) : []; } catch (_) {}
        var box = one('.dupli-autotune-check-dialog-troubleshoot', dialog);
        var ul = box && one('ul', box);
        if (ul) {
          ul.replaceChildren.apply(ul, tips.map(function (text) { var li = document.createElement('li'); li.textContent = text; return li; }));
          box.hidden = tips.length === 0;
        }
        var action = one('.dupli-autotune-check-dialog-action', dialog);
        var link = one('.dupli-autotune-check-dialog-link', dialog);
        if (action && link) {
          if (d.actionUrl) {
            link.href = d.actionUrl;
            link.textContent = d.actionLabel || '';
            if (d.external === '1') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
            else { link.removeAttribute('target'); link.removeAttribute('rel'); }
            action.hidden = false;
          } else action.hidden = true;
        }
        if (!dialog.open) dialog.showModal();
      }
    },

    // ─ AutoTune start dialog ──────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/dupli-autotune.js:131 @verified 2026-09-30 @product duplicator
    // Real plugin (handleAction, #dupli-autotune-action): while no session
    // runs, showModal() on #dupli-autotune-start-dialog (a running session's
    // Abort asks window.confirm, then aborts over AJAX — never). Its Start
    // (#dupli-autotune-confirm-start) closes the dialog and starts a series of
    // test backups that rewrite settings (H1): here it closes and logs a miss.
    {
      label: 'autotune-start-dialog',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-autotune-action'); },
      apply: function (el) {
        var label = (one('span', closestTo(el, '#dupli-autotune-action')) || {}).textContent || '';
        if (/abort/i.test(label)) { R.miss('admin-ajax.php?action=duplicator_autotune_abort', 'aborts a running AutoTune — never in a snapshot'); return; }
        var dlg = document.getElementById('dupli-autotune-start-dialog');
        if (dlg && typeof dlg.showModal === 'function' && !dlg.open) dlg.showModal();
      }
    },
    // ─ AutoTune start never ──────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/assets/js/dupli-autotune.js:155 @verified 2026-09-30 @product duplicator
    // Real plugin (start): closes the start dialog, then AJAX
    // duplicator_autotune_start (H1). Closes here; the start is a logged miss.
    {
      label: 'autotune-start-never',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#dupli-autotune-confirm-start'); },
      apply: function () {
        var dlg = document.getElementById('dupli-autotune-start-dialog');
        if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
        R.miss('admin-ajax.php?action=duplicator_autotune_start', 'runs test backups and rewrites settings — never in a snapshot');
      }
    },

    // ─ Dialog form close ──────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/auto_tune/start_dialog.php:16 @verified 2026-09-30 @product duplicator
    // Browser: a <form method="dialog"> inside a <dialog> closes it on submit
    // with the submitter's value as returnValue (the AutoTune dialogs' Close /
    // × / Cancel). Core swallows every unhandled submit (a captured form goes
    // nowhere), so this entry does the browser's close.
    {
      label: 'dialog-form-close',
      event: 'submit',
      match: function (el) { return is(el, 'dialog form[method="dialog"]'); },
      apply: function (el, evt) {
        var dlg = closestTo(el, 'dialog');
        if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close(evt && evt.submitter ? evt.submitter.value : undefined);
      }
    },

    // ─ Notice dismiss ─────────────────────────────────────────────────────
    // @since 2026-09-30 @source wp-admin/js/common.js:1110 @verified 2026-09-30 @product duplicator
    // WordPress core (makeNoticesDismissible): a .notice.is-dismissible's
    // × fades it to 0 over 100 ms, slides it up over 100 ms and removes it —
    // run with WordPress's own jQuery, loaded above. The plugin's delegated
    // handler then saves the dismissal over AJAX
    // (assets/js/global-admin-script.js:3-12, H7) — dropped.
    {
      label: 'notice-dismiss',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.notice.is-dismissible .notice-dismiss'); },
      apply: function (el) {
        var notice = closestTo(el, '.notice.is-dismissible');
        withLibs(function ($) {
          $(notice).fadeTo(100, 0, function () { $(notice).slideUp(100, function () { $(notice).remove(); }); });
        });
      }
    },

    // ─ In-page anchor jump ────────────────────────────────────────────────
    // @since 2026-09-30 @source duplicator-pro/template/admin_pages/tools/server_info.php:1 @verified 2026-09-30 @product duplicator
    // Browser: a link to #id on the same page scrolls that element into view
    // and moves focus there — WordPress's two skip links (#wpbody-content,
    // #wp-toolbar) on every screen and the phpinfo module index on Tools ›
    // Server Info. Core swallows every "#…" link (a captured link goes
    // nowhere), so this entry does the browser's jump. A link with its own
    // onclick, or whose target is not on the page, is left alone.
    {
      label: 'in-page-anchor',
      event: 'click',
      order: 'last',
      match: function (el) {
        var a = closestTo(el, 'a[href^="#"]');
        if (!a || a.hasAttribute('onclick')) return false;
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        return id.length > 0 && !!(document.getElementById(id) || document.getElementsByName(id)[0]);
      },
      apply: function (el) {
        var a = closestTo(el, 'a[href^="#"]');
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        var t = document.getElementById(id) || document.getElementsByName(id)[0];
        if (!t) return;
        t.scrollIntoView({ block: 'start' });
        if (typeof t.focus === 'function') { if (!t.hasAttribute('tabindex') && !/^(A|INPUT|BUTTON|SELECT|TEXTAREA)$/.test(t.tagName)) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      }
    },

    // ═══ Dashboard (admin-dashboard--widget) ═══════════════════════════════

    // ─ Dashboard widget panel toggle ──────────────────────────────────────
    // @since 2026-09-30 @source wp-admin/js/postbox.js:262 @verified 2026-09-30 @product duplicator
    // WordPress core, not the plugin (the widget is a core postbox): a click
    // on a .postbox .hndle or .handlediv toggles `closed` on the postbox and
    // the handle button's aria-expanded follows (handle_click). The open state
    // is saved over AJAX (closed-postboxes) — dropped.
    {
      label: 'postbox-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.postbox .hndle, .postbox .handlediv') && !!one('#duplicator_dashboard_widget'); },
      apply: function (el) {
        var p = closestTo(el, '.postbox');
        if (!p || p.id === 'dashboard_browser_nag') return;
        p.classList.toggle('closed');
        var open = !p.classList.contains('closed');
        all('button.handlediv', p).forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      }
    }

  ], { product: 'duplicator', file: 'interactivity.js' });

  var NEVER_CALLS = [
    { fn: 'DupliJs.Pack.DownloadFile', href: 'admin-ajax.php?action=duplicator_download_package_file', note: 'file download — never in a snapshot' },
    { fn: 'DupliJs.Pack.StopBuild', href: 'admin.php?page=duplicator&action=stop_package_build', note: 'stops a running build (form POST) — never in a snapshot' },
    { fn: 'DupliJs.Pack.Transfer.StopBuild', href: 'admin-ajax.php?action=duplicator_package_stop_build', note: 'stops a running transfer — never in a snapshot' },
    { fn: 'DupliJs.ImportManager.removePackage', href: 'admin-ajax.php?action=duplicator_import_package_delete', note: 'deletes an import archive — never in a snapshot' },
    { fn: 'DupliJs.ImportManager.confirmLaunchInstaller', href: 'admin.php?page=duplicator-import-installer', note: 'launches the installer — never in a snapshot' }
  ];
  function neverCall(el) {
    var host = closestTo(el, '[onclick]');
    var code = host ? host.getAttribute('onclick') : '';
    if (!code) return null;
    for (var i = 0; i < NEVER_CALLS.length; i++) {
      if (code.indexOf(NEVER_CALLS[i].fn + '(') >= 0) return NEVER_CALLS[i];
    }
    return null;
  }
  var logoTyping = 0;     // the brand logo preview's debounce (brand_edit.php:236-238)
  var stagingBox = null;  // DupliJs.Staging.modalBox (staging.js:43)

  // ── Settings helpers ─────────────────────────────────────────────────────
  // settings/backup/backup_settings.php:70-78
  function zipArchiveMode() {
    var sel = document.getElementById('ziparchive_mode');
    show(all('#dupli-ziparchive-mode-st, #dupli-ziparchive-mode-mt'), false);
    if (!sel) return;
    show(all(sel.value === '0' ? '#dupli-ziparchive-mode-mt' : '#dupli-ziparchive-mode-st'), true);
  }
  // settings/migrate_settings/import.php:150-160
  function importButtonState() {
    var file = document.getElementById('import-file');
    var any = all('input[name="import-opts[]"]').some(function (c) { return c.checked; });
    var btn = document.getElementById('import-button');
    if (btn) btn.disabled = !file || file.value === '' || !any;
  }
  // A ThickBox of inline markup with no UiDialog height stamp
  // (migrate_settings/export.php:77-86, import.php:127-136).
  function tbShowPlain(title, inlineId, width, height) {
    withLibs(function ($) {
      if (typeof window.tb_show !== 'function' || !document.getElementById(inlineId)) return;
      window.tb_show(title, '#TB_inline?width=' + width + '&height=' + height + '&inlineId=' + inlineId);
      $('#TB_window').addClass(TB_WINDOW_CLASS);
    });
  }

  // ── Storage: ChangeMode and the delete confirm body ─────────────────────
  // template/admin_pages/storages/parts/storage_type_select.php:228-264: the
  // mode is #dup-storage-mode-fixed's type on an edit page, else the select's.
  function currentStorageMode() {
    var fixed = document.getElementById('dup-storage-mode-fixed');
    if (fixed) return fixed.getAttribute('data-storage-type');
    var sel = document.getElementById('change-mode');
    return sel ? sel.value : null;
  }
  function storageChangeMode(animate) {
    var mode = currentStorageMode();
    if (mode == null) return;
    var copySel = document.getElementById('dup-copy-source-id-select');
    if (copySel) copySel.value = '-1';
    var copyOff = parseInt(mode, 10) === 0;
    all('#dup-copy-source-id-select, #dup-copy-storage-btn').forEach(function (c) { c.disabled = copyOff; });
    all('#dup-copy-source-id-select option').forEach(function (o) {
      var off = parseInt(o.getAttribute('data-stype'), 10) !== parseInt(mode, 10);
      o.disabled = off;
      o.style.display = off ? 'none' : '';
    });
    show(all('.provider'), false);
    var node = document.getElementById('provider-' + mode);
    if (node) R.show(node, animate);
    // BindParsley (:161-169): Parsley rebinds to the shown provider's inputs.
    withLibs(function ($) {
      var form = $('#dup-storage-form');
      if (!form.length || typeof form.parsley !== 'function') return;
      form.parsley().destroy();
      $('#dup-storage-form .provider input').attr('data-parsley-excluded', 'true');
      $(node).find('input').removeAttr('data-parsley-excluded');
      form.parsley();
    });
  }
  // storages/storage_list.php:230-252 (deleteConfirm): the confirm's message
  // becomes the plugin's question plus each row's data-delete-view.
  function storageDeleteConfirm(ids) {
    var d = confirmByCallback('DupliJs.Storage.deleteAjax');
    var msg = d && document.getElementById(d.id + '_message');
    if (!d || !msg) { R.miss('#TB_inline', 'storage delete confirm not in this capture'); return; }
    var n = ids.length;
    var html = n === 1 ? '<i>Are you sure you want to delete this storage item?</i>'
      : '<i>Are you sure you want to delete these ' + n + ' storage items?</i>';
    html += '<div class="store-items">';
    ids.forEach(function (id) {
      var row = document.getElementById('main-view-' + id);
      html += row ? row.getAttribute('data-delete-view') || '' : '';
    });
    html += '</div>';
    msg.innerHTML = html;
    tbShow('Delete Storage(s)?', d.id, 500, 525);
  }

  // ── Setup: the component helpers the entries above call ─────────────────
  // template/parts/packages/filters/package_components.php:197-334, one for one.
  function toggleFileFilters() {
    var on = !!(document.getElementById('files-filter-on') || {}).checked;
    noDisplay('#dup-archive-filter-file-icon', on);
    noDisplay('.files-filter-section .filters', on);
    all('#filter-exts, #filter-paths').forEach(function (t) { if (on) t.removeAttribute('readonly'); else t.setAttribute('readonly', 'readonly'); });
  }
  function checked(id) { var e = document.getElementById(id); return !!e && e.checked; }
  function toggleDBExcluded() { show(all('.filter-db-tab-content'), checked('package_component_db')); }
  function toggleDBOnly() {
    var boxes = all('.dup-package-components .component-section input[type=checkbox]');
    var n = boxes.filter(function (b) { return b.checked; }).length;
    if (n === 1 && checked('package_component_db')) {
      noDisplay('#dup-archive-filter-file-icon', false);
      noDisplay('#dup-archive-db-only-icon', true);
      show(all('.files-filter-section'), false);
      show(all('.db-only-message'), true);
    } else {
      if (checked('files-filter-on')) noDisplay('#dup-archive-filter-file-icon', true);
      noDisplay('#dup-archive-db-only-icon', false);
      show(all('.files-filter-section'), true);
      show(all('.db-only-message'), false);
    }
  }
  function toggleMediaOnly() {
    var boxes = all('.dup-package-components .component-section input[type=checkbox]');
    var n = boxes.filter(function (b) { return b.checked; }).length;
    noDisplay('#dup-archive-media-only-icon', n === 1 && checked('package_component_uploads'));
  }
  function toggleActive(inputId, parentId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    if (input.parentNode && input.parentNode.classList.contains('disabled')) { input.disabled = true; return; }
    if (!checked(parentId)) { input.disabled = true; input.checked = false; }
    else input.disabled = false;
  }
  function componentChanged(el) {
    toggleDBOnly();
    toggleMediaOnly();
    if (el && el.id === 'package_component_db') toggleDBExcluded();
    if (el && el.id === 'package_component_plugins') toggleActive('package_component_plugins_active', 'package_component_plugins');
    if (el && el.id === 'package_component_themes') toggleActive('package_component_themes_active', 'package_component_themes');
    withLibs(function ($) {
      var db = $('#package_component_db');
      if (db.length && typeof db.parsley === 'function') db.parsley().validate();
    });
  }
  function toggleComponentsSelect() {
    var picked = one('.dup-components-shortcut-radio:checked');
    var boxes = all('.dup-components-checkbox');
    var customLabels = all('.custom-components-select label');
    var v = picked ? picked.value : '';
    if (v === 'all' || v === 'database' || v === 'media') {
      boxes.forEach(function (b) { b.checked = false; });
      if (v === 'all') all('label:not(.secondary) .dup-components-checkbox').forEach(function (b) { b.checked = true; });
      if (v === 'database') { var d = document.getElementById('package_component_db'); if (d) d.checked = true; }
      if (v === 'media') { var u = document.getElementById('package_component_uploads'); if (u) u.checked = true; }
      customLabels.forEach(function (l) { l.classList.add('disabled'); });
    } else if (v === 'custom') {
      customLabels.forEach(function (l) { l.classList.remove('disabled'); });
    }
    // $('.dup-components-checkbox').trigger('change') — each handler once per box
    boxes.forEach(function (b) { componentChanged(b); });
  }
  // package_components.php:286-302 (SetComponentsSelect): the shortcut radio
  // that matches the checked components, then ToggleComponentsSelect.
  function setComponentsSelect() {
    var boxes = all('.dup-components-checkbox');
    var n = boxes.filter(function (b) { return b.checked; }).length;
    var activeOff = !checked('package_component_plugins_active') && !checked('package_component_themes_active');
    var id = 'dup-component-shortcut-action-custom';
    if (n === boxes.length - 2 && activeOff) id = 'dup-component-shortcut-action-all';
    else if (n === 1 && checked('package_component_db')) id = 'dup-component-shortcut-action-database';
    else if (n === 1 && checked('package_component_uploads')) id = 'dup-component-shortcut-action-media';
    var r = document.getElementById(id);
    if (r) r.checked = true;
    toggleComponentsSelect();
  }
  // parts/packages/filters/section_security.php:151-191 (EnableInstallerPassword):
  // the lock icon, its tooltip and the password field follow the checked mode.
  function enableInstallerPassword(focus) {
    var picked = one('.secure-on-input-wrapper input:checked');
    var mode = picked ? parseInt(picked.value, 10) : 0;
    var lock = document.getElementById('dupli-install-secure-lock-icon');
    var icon = lock && one('i', lock);
    var pass = document.getElementById('secure-pass');
    var btn = document.getElementById('secure-btn');
    var tip = mode === 2 ? 'Archive encryption enabled' : mode === 1 ? 'Installer password protection' : 'No backup protection';
    if (lock) {
      show(lock, true);
      if (icon) {
        ['fa-lock', 'fa-lock-open', 'primary-color', 'success-color', 'warning-color'].forEach(function (c) { icon.classList.remove(c); });
        if (mode === 2) { icon.classList.add('fa-lock'); icon.classList.add('success-color'); }
        else if (mode === 1) { icon.classList.add('fa-lock'); icon.classList.add('warning-color'); }
        else { icon.classList.add('fa-lock-open'); icon.classList.add('warning-color'); }
      }
      lock.setAttribute('data-tooltip', tip);
      withLibs(function () { if (lock._tippy) window.DuplicatorTooltip.updateElementContent(lock, tip); });
    }
    if (!pass) return;
    if (mode === 0) {
      pass.removeAttribute('required'); pass.setAttribute('readonly', 'readonly');
      if (btn) btn.disabled = true;
    } else {
      pass.removeAttribute('readonly'); pass.setAttribute('required', 'true');
      if (focus) { try { pass.focus(); } catch (_) {} }
      if (btn) btn.disabled = false;
    }
  }
  // parts/packages/filters/tables_list_filter.php:166-198 (ToggleDBFilters,
  // ToggleDBFiltersRedIcon).
  function toggleDBFilters() {
    var on = checked('dbfilter-on');
    noDisplay(all('.db-filter-section'), on);
    all('#dup-db-filter-items').forEach(function (f) { f.classList.toggle('disabled', !on); });
    show(all('#dup-db-filter-items-no-filters'), !on);
    noDisplay(all('#dup-archive-filter-db-icon'), on);
    var pf = document.getElementById('db-prefix-filter');
    var psf = document.getElementById('db-prefix-sub-filter');
    if (on) {
      if (pf && !pf.hasAttribute('data-force-checked')) pf.disabled = false;
      if (psf) psf.disabled = false;
    } else {
      if (pf) pf.disabled = true;
      if (psf) psf.disabled = true;
    }
  }
  // tables_list_filter.php:211-251 (ToggleNoPrefixTables /
  // ToggleNoSubsiteExistsTables): a checked prefix filter disables and checks
  // the matching table rows' pseudo boxes; unchecked re-enables them.
  function toggleNoPrefix(checkSel, rowSel, removeCheckOnEnable) {
    var node = one(checkSel);
    var display = !(node && node.checked);
    all('#dup-db-tables-exclude ' + rowSel).forEach(function (row) {
      var box = one('.dup-pseudo-checkbox', row);
      if (!box) return;
      if (display) { box.classList.remove('disabled'); if (removeCheckOnEnable) box.classList.remove('checked'); }
      else { box.classList.add('disabled'); box.classList.add('checked'); }
    });
  }
  // addons/templateaddon/template/templateaddon/package_template_selector.php:118-201
  // (PopulateCurrentTemplate), from the parked packageTemplates list.
  function populateTemplate(list, id) {
    var t = null;
    for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id)) { t = list[i]; break; } }
    function val(sel, v) { var e = one(sel); if (e) e.value = v == null ? '' : v; }
    function chk(sel, v) { var e = one(sel); if (e) e.checked = !!v; }
    if (t) {
      val('#package-name-format', t.package_name_format);
      val('#package-notes', t.notes);
      chk('#files-filter-on', t.archive_filter_on);
      chk('#filter-names', t.archive_filter_names);
      var dirs = String(t.archive_filter_dirs || '').split(';').join(';\n');
      var files = String(t.archive_filter_files || '').split(';').join(';\n');
      val('#filter-paths', dirs + (dirs.length > 0 && files.length > 0 ? ';\n' : '') + files);
      val('#filter-exts', t.archive_filter_exts);
      chk('#dbfilter-on', t.database_filter_on);
      var pf = document.getElementById('db-prefix-filter');
      if (pf && !pf.hasAttribute('data-force-checked')) pf.checked = !!t.databasePrefixFilter;
      chk('#db-prefix-sub-filter', t.databasePrefixSubFilter);
      all('.dup-components-checkbox').forEach(function (c) { c.checked = false; });
      (t.components || []).forEach(function (c) { var e = document.getElementById(c); if (e) e.checked = true; });
      toggleDBOnly();
      setComponentsSelect();
      chk('#cpnl-enable', t.installer_opts_cpnl_enable);
      val('#cpnl-host', t.installer_opts_cpnl_host);
      val('#cpnl-user', t.installer_opts_cpnl_user);
      all('.secure-on-input-wrapper input').forEach(function (r) { r.checked = false; });
      var sec = one('.secure-on-input-wrapper input[value="' + t.installer_opts_secure_on + '"]:enabled');
      if (sec) sec.checked = true;
      chk('#skipscan', t.installer_opts_skip_scan);
      val('#secure-pass', t.installerPassowrd);
      var dba = document.getElementById('cpnl-dbaction');
      if (dba) { dba.value = t.installer_opts_cpnl_db_action; dba.dispatchEvent(new Event('change', { bubbles: true })); }
      val('#cpnl-dbhost', t.installer_opts_cpnl_db_host);
      val('#cpnl-dbname', t.installer_opts_cpnl_db_name);
      val('#cpnl-dbuser', t.installer_opts_cpnl_db_user);
      if (t.database_filter_tables && t.database_filter_tables.length) {
        var tables = String(t.database_filter_tables).split(',');
        all('#dup-db-tables-exclude .dup-pseudo-checkbox').forEach(function (n) {
          n.classList.toggle('checked', tables.indexOf(n.getAttribute('data-value')) >= 0);
        });
      }
      val('#dbhost', t.installer_opts_db_host);
      val('#dbname', t.installer_opts_db_name);
      val('#dbuser', t.installer_opts_db_user);
      // duplicator:templateChanged → the brand picker (package_brand_selector.php:129-132)
      var brand = document.getElementById('brand');
      if (brand) {
        var b = t.extraData && t.extraData.brand_id ? Number(t.extraData.brand_id) : -1;
        if (one('option[value="' + b + '"]', brand)) { brand.value = String(b); brand.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }
    // Installer tab follows cpnl-enable (:200)
    var tab = document.getElementById(checked('cpnl-enable') ? 'dupli-cpnl-tab-lbl' : 'dupli-bsc-tab-lbl');
    if (tab) tab.click();
  }
}());
