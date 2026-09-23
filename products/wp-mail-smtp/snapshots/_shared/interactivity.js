/**
 * WP Mail SMTP snapshot transitions.
 *
 * Third of the three script tags tools/link-interactivity-script.js injects:
 *   ../../../_runtime/core.js  →  ../_shared/nav.js  →  this file.
 * core.js defines window.SnapRuntime during parse, so it is here by the time
 * this IIFE runs. Nothing in here may reference the WPForms runtime.
 *
 * Entries keep the proven shape { label, event, match(el), apply(el) } and each
 * block opens with a provenance banner that tools/field-state.js parses — the
 * banner line, then one @-line, exactly like this:
 *
 *   // ─ Mailer tile switch ─────────────────────────────────────────────────
 *   // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:85 @verified 2026-09-19 @product wp-mail-smtp
 *
 * @source must be one whitespace-free token and every entry needs @product.
 * `@source synthetic` is banned: no fragment of UI without a real cite
 * (anti-pattern #6 / INV-15).
 *
 * WO-202B. Every entry mirrors what the plugin's own JS does — the class or
 * style it changes, nothing invented — and every one is checked against the
 * live plugin by tools/behavior-parity.js (products/wp-mail-smtp/qc/parity.json).
 * Plugin source: wp-mail-smtp-pro 4.9.0. What is NOT wired, and why, is listed
 * in docs/plans/product-neutral/reports/WO-202B-report.md.
 *
 * Labels the ON / OFF toggles show are pure CSS (assets/css/smtp-admin.min.css,
 * markup src/Helpers/UI.php:47-66): no entry touches them. They work once a
 * snapshot is captured with the marked bake and un-baked (tools/unbake-display.js).
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // The plugin binds its settings handlers inside this form
  // (assets/js/smtp-admin.js:53, unchanged in 4.10.0); Settings → General and a connection's
  // new / edit page both render it (src/Admin/Pages/SettingsTab.php:56,
  // src/Pro/AdditionalConnections/Admin/SettingsTab.php:440).
  var FORM = '.wp-mail-smtp-connection-settings-form';

  function closestTo(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function is(el, sel) { try { return !!el && !!el.matches && el.matches(sel); } catch (_) { return false; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function show(nodes, on) { R.toggleTarget(nodes, on, { mode: 'display' }); }   // jQuery .show() / .hide()

  // What wp_mail_smtp.all_mailers_supports holds for this install: localized at
  // src/Admin/Area.php:634 from Providers\Loader::get_supports_all()
  // (src/Providers/Loader.php:257), each mailer's `supports` array in its own
  // Options.php. Read with get_supports_all() on the capture site, 2026-09-19;
  // read again on 4.10.0, 2026-09-20: the same.
  var ALL = { from_email: true, from_name: true, return_path: false, from_email_force: true, from_name_force: true };
  var WITH_RETURN_PATH = { from_email: true, from_name: true, return_path: true, from_email_force: true, from_name_force: true };
  var SUPPORTS = {
    mail: WITH_RETURN_PATH, sendlayer: ALL, smtpcom: ALL, sendinblue: ALL, amazonses: ALL, elasticemail: ALL,
    gmail: ALL, mailgun: WITH_RETURN_PATH, mailjet: ALL, mailersend: ALL, mandrill: ALL, outlook: ALL,
    postmark: ALL, resend: ALL, sendgrid: ALL, smtp2go: ALL, sparkpost: ALL, zoho: ALL, smtp: WITH_RETURN_PATH
  };

  R.register([

    // ─ Mailer tile image ───────────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:83 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: a click on a tile's picture clicks that tile's radio
    // (`.parents('.wp-mail-smtp-mailer').find('input').trigger('click')`), which
    // runs the switch below and the radio's change handler.
    {
      label: 'mailer-tile-image',
      event: 'click',
      match: function (el) { return !!closestTo(el, FORM + ' .wp-mail-smtp-mailer-image'); },
      apply: function (el) {
        var tile = closestTo(el, '.wp-mail-smtp-mailer');
        var input = tile && tile.querySelector('input');
        if (input) input.click();
      }
    },

    // ─ Mailer tile switch ──────────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:87 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (the radio's click, :87-109): every .wp-mail-smtp-mailer loses
    // `active`, the clicked one gains it; every .wp-mail-smtp-mailer-option gains
    // `hidden` and loses `active`; .wp-mail-smtp-mailer-option-<value> gains
    // `active` and loses `hidden`. A disabled `educate` radio opens an upgrade
    // modal instead — Pro has none, so it is left alone. On this http site the
    // Outlook and Amazon SES blocks are their SSL-warning blocks, exactly as live.
    {
      label: 'mailer-tile-switch',
      event: 'click',
      match: function (el) { return is(el, FORM + ' .wp-mail-smtp-mailer input') && !el.disabled; },
      apply: function (el) {
        var form = closestTo(el, FORM);
        R.selectOne(null, FORM + ' .wp-mail-smtp-mailer', closestTo(el, '.wp-mail-smtp-mailer'), 'active');
        var blocks = all('.wp-mail-smtp-mailer-option', form);
        R.toggleTarget(blocks, false, { mode: 'class', cls: 'hidden' });
        blocks.forEach(function (b) { b.classList.remove('active'); });
        var chosen = all('.wp-mail-smtp-mailer-option-' + el.value, form);
        chosen.forEach(function (b) { b.classList.add('active'); });
        R.toggleTarget(chosen, true, { mode: 'class', cls: 'hidden' });
      },
      state: function (el) { return { key: 'mailer', value: el.value }; }
    },

    // ─ Mailer supported settings ───────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1529 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (bound at :257 to the radio's change): .toggle() every
    // .js-wp-mail-smtp-setting-<key> row by the chosen mailer's supports; then
    // the From Email group (hidden while SendLayer Quick Connect owns it), the
    // Quick Connect From Email row (shown + enabled only for it) and the From
    // Name group. Today only Return Path differs: Default, Mailgun, Other SMTP.
    {
      label: 'mailer-supported-settings',
      event: 'change',
      match: function (el) { return is(el, FORM + ' .js-wp-mail-smtp-setting-mailer-radio-input'); },
      apply: function (el) {
        var form = closestTo(el, FORM);
        var s = SUPPORTS[el.value];
        if (!s) return;
        Object.keys(s).forEach(function (k) { show(all('.js-wp-mail-smtp-setting-' + k, form), s[k]); });
        var quick = document.getElementById('wp-mail-smtp-setting-row-sendlayer-quick-connect-from_email');
        var quickOn = el.value === 'sendlayer' && !!quick;
        show(all('.js-wp-mail-smtp-setting-from_email'), !quickOn && !!(s.from_email || s.from_email_force));
        if (quick) {
          show(quick, quickOn);
          all('input', quick).forEach(function (i) { i.disabled = !quickOn; });
        }
        show(all('.js-wp-mail-smtp-setting-from_name'), !!(s.from_name || s.from_name_force));
      }
    },

    // ─ SMTP authentication rows ────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1267 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: toggleClass('inactive') on the SMTP Username and Password
    // rows (`.inactive{display:none}`, smtp-admin.min.css). Written as "set by
    // the box's state": PHP renders `inactive` exactly when auth is off
    // (src/Providers/OptionsAbstract.php:346,360), so a flip and a set agree —
    // and a set stays idempotent.
    {
      label: 'smtp-auth-rows',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-smtp-auth'; },
      apply: function (el) {
        R.toggleTarget('#wp-mail-smtp-setting-row-smtp-user, #wp-mail-smtp-setting-row-smtp-pass', el.checked,
          { mode: 'class', cls: 'inactive' });
      },
      state: function (el) { return { key: 'smtp.auth', value: !!el.checked }; }
    },

    // ─ SMTP encryption sets the port ───────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1272 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: TLS → port 587 and the Auto TLS row gains `inactive`;
    // SSL → 465, None → 25, and the Auto TLS row loses `inactive`.
    {
      label: 'smtp-encryption-port',
      event: 'change',
      match: function (el) { return is(el, '#wp-mail-smtp-setting-row-smtp-encryption input'); },
      apply: function (el) {
        var port = document.querySelector(FORM + ' #wp-mail-smtp-setting-smtp-port');
        var tls = el.value === 'tls';
        if (port) port.value = tls ? '587' : el.value === 'ssl' ? '465' : '25';
        R.toggleTarget('#wp-mail-smtp-setting-row-smtp-autotls', !tls, { mode: 'class', cls: 'inactive' });
      },
      state: function (el) { return { key: 'smtp.encryption', value: el.value }; }
    },

    // ─ SendLayer Quick Connect after the key is removed ────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1177 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: removing the SendLayer API key .show()s the Quick Connect row.
    // Bound before the generic Remove handler below (:111 before :284), so it
    // registers first.
    {
      label: 'sendlayer-connect-after-clear',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '.wp-mail-smtp-btn[data-clear-field="wp-mail-smtp-setting-sendlayer-api_key"]');
      },
      apply: function () { show(document.getElementById('wp-mail-smtp-setting-row-sendlayer-connect'), true); }
    },

    // ─ Remove a saved secret ───────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:284 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: the named field loses `disabled`, gets its `name` back from
    // `data-name`, loses its `value` attribute and takes focus; the Remove
    // button removes itself. Markup: UI::hidden_password_field
    // (src/Helpers/UI.php:97-116).
    {
      label: 'secret-field-clear',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.wp-mail-smtp-btn[data-clear-field]'); },
      apply: function (el) {
        var btn = closestTo(el, '.wp-mail-smtp-btn[data-clear-field]');
        var field = document.getElementById(btn.getAttribute('data-clear-field'));
        if (field) {
          field.disabled = false;
          var name = field.getAttribute('data-name');
          if (name !== null) field.setAttribute('name', name);
          field.removeAttribute('value');
          try { field.focus(); } catch (_) { /* detached */ }
        }
        if (btn.parentNode) btn.parentNode.removeChild(btn);
      }
    },

    // ─ SendLayer: enter the API key by hand ────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1182 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: the link's own .wp-mail-smtp-setting-row is removed and
    // #wp-mail-smtp-setting-row-sendlayer-api_key is .show()n.
    {
      label: 'sendlayer-show-api-key',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#wp-mail-smtp-sendlayer-show-api-key'); },
      apply: function (el) {
        var row = closestTo(el, '.wp-mail-smtp-setting-row');
        if (row && row.parentNode) row.parentNode.removeChild(row);
        show(document.getElementById('wp-mail-smtp-setting-row-sendlayer-api_key'), true);
      }
    },

    // ─ Gmail one-click setup switch ────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-settings.js:950 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (bound at :942): on → the one-click group .show(), the
    // custom-app group .hide(); off → the other way round.
    {
      label: 'gmail-one-click-groups',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-gmail-one_click_setup_enabled'; },
      apply: function (el) {
        show(all('.wp-mail-smtp-mailer-option__group--gmail-one_click_setup'), el.checked);
        show(all('.wp-mail-smtp-mailer-option__group--gmail-custom'), !el.checked);
      },
      state: function (el) { return { key: 'gmail.oneClick', value: !!el.checked }; }
    },

    // ─ Outlook one-click setup switch ──────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-settings.js:989 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (bound at :981): the same swap between the Outlook one-click
    // and custom-app groups.
    {
      label: 'outlook-one-click-groups',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-outlook-one_click_setup_enabled'; },
      apply: function (el) {
        show(all('.wp-mail-smtp-mailer-option__group--outlook-one_click_setup'), el.checked);
        show(all('.wp-mail-smtp-mailer-option__group--outlook-custom'), !el.checked);
      },
      state: function (el) { return { key: 'outlook.oneClick', value: !!el.checked }; }
    },

    // ─ Email Log: Enable Log rows ──────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/src/Pro/Emails/Logs/Admin/SettingsTab.php:311 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (an inline <script>, :303-324): on → .show() Log Email
    // Content, Save Attachments, Open Email Tracking and Click Link Tracking;
    // off → .hide() the same four. Log Retention Period is never touched.
    {
      label: 'logs-enabled-rows',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-logs_enabled'; },
      apply: function (el) {
        show(all('#wp-mail-smtp-setting-row-logs_log_email_content, #wp-mail-smtp-setting-row-logs_save_attachments, '
          + '#wp-mail-smtp-setting-row-logs_open_email_tracking, #wp-mail-smtp-setting-row-logs_click_link_tracking'), el.checked);
      },
      state: function (el) { return { key: 'logs.enabled', value: !!el.checked }; }
    },

    // ─ Alerts: a channel's options ─────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-alerts.js:68 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :58): the channel row's
    // .wp-mail-smtp-setting-row-alert-options .show() / .hide(), and its
    // .wp-mail-smtp-setting-field inputs get `required` set / cleared. The Push
    // Notifications toggle is not this handler's: its click goes to the push
    // endpoint first (next-but-one entry).
    {
      label: 'alert-channel-options',
      event: 'change',
      match: function (el) {
        return is(el, '.wp-mail-smtp-tab-alerts .js-wp-mail-smtp-setting-alert-enabled')
          && el.id !== 'wp-mail-smtp-setting-alert-push_notifications-enabled';
      },
      apply: function (el) {
        var row = closestTo(el, '.wp-mail-smtp-setting-row-alert');
        var options = all('.wp-mail-smtp-setting-row-alert-options', row);
        show(options, el.checked);
        options.forEach(function (o) {
          all('.wp-mail-smtp-setting-field input', o).forEach(function (i) { i.required = !!el.checked; });
        });
      },
      state: function (el) { return { key: 'alerts.' + (el.id || '').replace(/^wp-mail-smtp-setting-alert-|-enabled$/g, ''), value: !!el.checked }; }
    },

    // ─ Alerts: Test Alerts button ──────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-alerts.js:176 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :59): #js-wp-mail-smtp-btn-test-alerts is disabled
    // while no channel is checked. Push's click never fires `change` live (it is
    // prevented), so it is not a trigger here either.
    {
      label: 'alert-test-button',
      event: 'change',
      match: function (el) {
        return is(el, '.wp-mail-smtp-tab-alerts .js-wp-mail-smtp-setting-alert-enabled')
          && el.id !== 'wp-mail-smtp-setting-alert-push_notifications-enabled';
      },
      apply: function () {
        var btn = document.getElementById('js-wp-mail-smtp-btn-test-alerts');
        if (btn) btn.disabled = all('.wp-mail-smtp-tab-alerts .js-wp-mail-smtp-setting-alert-enabled:checked').length === 0;
      }
    },

    // ─ Alerts: Push Notifications options ──────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-alerts-push-notifications.js:248 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :74): the click is held while the push endpoint
    // (settings.apiUrl — live it is admin-ajax.php?action=
    // wp_mail_smtp_admin_pro_push_notifications) enables / disables the site;
    // on success (:262-283) the row's options are .show()n / .hide()n. A
    // snapshot has no endpoint, so this is that success path's DOM change and
    // nothing else.
    {
      label: 'alert-push-options',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-alert-push_notifications-enabled'; },
      apply: function (el) {
        show(all('.wp-mail-smtp-setting-row-alert-options', closestTo(el, '.wp-mail-smtp-setting-row-alert')), el.checked);
      },
      state: function (el) { return { key: 'alerts.push_notifications', value: !!el.checked }; }
    },

    // ─ Misc: Do Not Send ───────────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-settings.js:1317 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin (bindActions at :1306): the div wrapping Log Blocked Emails
    // (`$('#wp-mail-smtp-setting-log_blocked_emails').closest('div')`) is
    // .show()n / .hide()n with the toggle.
    {
      label: 'misc-do-not-send',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-do_not_send'; },
      apply: function (el) {
        var box = document.getElementById('wp-mail-smtp-setting-log_blocked_emails');
        if (box) show(box.closest('div'), el.checked);
      },
      state: function (el) { return { key: 'misc.doNotSend', value: !!el.checked }; }
    },

    // ─ Misc: Email Rate Limiting ───────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/src/Pro/Admin/Pages/MiscTab.php:101 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (an inline <script>, :100-108): the periods row
    // #wp-mail-smtp-setting-row-rate_limit_periods .show() / .hide().
    {
      label: 'misc-rate-limit',
      event: 'change',
      match: function (el) { return el.id === 'wp-mail-smtp-setting-misc-rate_limit_enabled'; },
      apply: function (el) { show(document.getElementById('wp-mail-smtp-setting-row-rate_limit_periods'), el.checked); },
      state: function (el) { return { key: 'misc.rateLimit', value: !!el.checked }; }
    },

    // ─ Smart Routing: a fixed connection ───────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-smart-routing.js:66 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :53): a select that carried
    // `…route__connection--invalid` loses it and its route's
    // `…route__notice--invalid` .slideUp()s (:72 — jQuery's default 400 ms).
    {
      label: 'routing-connection-valid',
      event: 'change',
      match: function (el) {
        return is(el, '.wp-mail-smtp-tab-routing .wp-mail-smtp-smart-routing-route__connection')
          && el.classList.contains('wp-mail-smtp-smart-routing-route__connection--invalid');
      },
      apply: function (el) {
        el.classList.remove('wp-mail-smtp-smart-routing-route__connection--invalid');
        R.slideUp(all('.wp-mail-smtp-smart-routing-route__notice--invalid', closestTo(el, '.wp-mail-smtp-smart-routing-route')));
      }
    },

    // ─ Email Log: extra details box ────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-logs.js:145 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :114): open → `.inside` .slideDown('fast') (:154),
    // then the postbox loses `closed` and the arrow goes dashicons-arrow-down
    // → -up; close → .slideUp('fast') (:149), then the reverse. The class and
    // arrow change in the slide's complete callback, so at its end. The Close
    // button (:168) clicks the same header.
    {
      label: 'log-extra-details-toggle',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '.js-wp-mail-smtp-pro-logs-toggle-extra-details, .js-wp-mail-smtp-pro-logs-close-extra-details');
      },
      apply: function (el) {
        var box = closestTo(el, '.postbox');
        if (!box) return;
        var open = box.classList.contains('closed');
        var arrows = function () {
          box.classList.toggle('closed', !open);
          all('.handle-actions .dashicons', box).forEach(function (d) {
            d.classList.remove(open ? 'dashicons-arrow-down' : 'dashicons-arrow-up');
            d.classList.add(open ? 'dashicons-arrow-up' : 'dashicons-arrow-down');
          });
        };
        if (open) R.slideDown(all('.inside', box), 'fast', arrows);
        else R.slideUp(all('.inside', box), 'fast', arrows);
      }
    },

    // ─ View Email ──────────────────────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/src/Pro/Emails/Logs/Admin/SinglePage.php:502 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: `a.thickbox.email-preview` — the single log's button (here)
    // and the list's row action (src/Pro/Emails/Logs/Admin/Table.php:310) —
    // opens WP core ThickBox on `…mode=preview&TB_iframe=true&width=600&height`:
    // an iframe of the rendered email, captioned with the link's title, sized by
    // wp-includes/js/thickbox/thickbox.js:205-206 (width + 30, height + 40, else
    // 630 × 440; the bare `height` has no `=`, so tb_parseQuery skips it).
    // Here: R.modal on the CAPTURED preview snapshot of that email, found through
    // the nav map from the link's own href. Not captured → nothing opens, a miss
    // is logged. Never an invented preview. ThickBox shows the window at once
    // and, on close, fades it out 'fast' before removing it with the overlay
    // (tb_remove, wp-includes/js/thickbox/thickbox.js:295-298): fadeOut below.
    {
      label: 'email-preview-modal',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'a.thickbox.email-preview'); },
      apply: function (el) {
        var a = closestTo(el, 'a.thickbox.email-preview');
        var href = a.getAttribute('href') || '';
        var slug = R.resolveHref(href);
        if (!slug) { R.miss(href); return; }
        var q = {};
        (href.split('?')[1] || '').split('#')[0].split(/[;&]/).forEach(function (pair) {
          var kv = pair.split('=');
          if (kv.length === 2) q[kv[0]] = kv[1];
        });
        R.modal({
          title: a.getAttribute('title') || '',
          iframe: '../' + slug + '/index.html',
          width: (q.width * 1) + 30 || 630,
          height: (q.height * 1) + 40 || 440,
          fadeOut: 'fast'
        });
      },
      state: function (el) {
        var a = closestTo(el, 'a.thickbox.email-preview');
        return { key: 'emailPreview', value: a ? R.resolveHref(a.getAttribute('href') || '') : null };
      }
    },

    // ─ Tools → Email Test: sending ─────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:260 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: on submit the button is disabled, its span hidden and its
    // .wp-mail-smtp-loading shown; then the browser posts the form and the page
    // reloads with the result. The result page is not wired here (it needs a
    // captured result variant); core stops the post.
    {
      label: 'email-test-sending',
      event: 'submit',
      match: function (el) { return is(el, '.wp-mail-smtp-tab-tools-test #email-test-form'); },
      apply: function (el) {
        all('.wp-mail-smtp-btn', el).forEach(function (btn) {
          btn.disabled = true;
          show(all('span', btn), false);
          show(all('.wp-mail-smtp-loading', btn), true);
        });
      }
    },

    // ─ Tools → Email Test: debug output ────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:165 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: `#wp-mail-smtp-debug .error-log` .slideToggle() (:168 —
    // jQuery's default 400 ms), shown or hidden by where it starts.
    {
      label: 'email-test-error-log',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#wp-mail-smtp-debug .error-log-toggle'); },
      apply: function () { R.slideToggle(all('#wp-mail-smtp-debug .error-log')); }
    },

    // ─ Tools → Email Test: success banner dismiss ──────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:476 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: the banner .slideUp(200) (:482), then removes itself in the
    // slide's complete callback — no AJAX.
    {
      label: 'email-test-banner-dismiss',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.wpms-test-email-success-banner__dismiss'); },
      apply: function (el) {
        var banner = closestTo(el, '.wpms-test-email-success-banner');
        if (banner) R.slideUp(banner, 200, function () { if (this.parentNode) this.parentNode.removeChild(this); });
      }
    },

    // ─ Tools → Export: fields per format ───────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-tools-logs-export.js:351 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :93): EML → the common-fields and additional-info
    // sections .hide(); any other format → both .show().
    {
      label: 'export-type-fields',
      event: 'change',
      match: function (el) { return is(el, '#wp-mail-smtp-tools-export-email-logs-export-type input'); },
      apply: function (el) {
        show(all('#wp-mail-smtp-tools-export-email-logs-common-fields, #wp-mail-smtp-tools-export-email-logs-additional-info'),
          el.value !== 'eml');
      },
      state: function (el) { return { key: 'export.type', value: el.value }; }
    },

    // ─ Setup Wizard: the main button ───────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-19 @product wp-mail-smtp
    // The wizard is a minified Vue SPA in one line; its code is cited by
    // character offset (4.9.0; grepped, never read whole). Each step's main
    // button and the route it pushes (the helpers under this register block
    // mirror $wizard_steps, $next_step and $previous_step):
    //   Welcome "Let's Get Started" (offset 2613): $wizard_steps[0];
    //   Import "Import Data and Continue" (11255): the import (AJAX), then
    //     $next_step() — disabled until another plugin's data is chosen;
    //   Choose Mailer "Save and Continue" (27443, 27850): saves the mailer
    //     (AJAX), then configure_mailer_step_<the checked mailer> — disabled
    //     for none or the default mailer (13409);
    //   Configure Mailer "Save and Continue" (31765): the mailer's own
    //     required-field rule first — an empty one is a logged miss, since
    //     the plugin then shows its "Heads up!" alert (235897), not captured —
    //     then the save (AJAX) and $next_step();
    //   Plugin Features (42957): $next_step(1), skipping Configure Email
    //     Logs, when Detailed Email Logs is off, else $next_step();
    //   Configure Email Logs (230644) and Help Improve (54499): $next_step().
    // No save is made. A route with no capture is a logged miss: License and
    // Check Configuration (which sends a test email the moment it opens,
    // 67453) are not captured. The old version walked the route list of
    // inventory/screens.md §G, which sent Welcome to Import — a step this
    // site's wizard skips.
    // @verified 2026-09-20 (4.10.0): the Welcome branch is gone with the
    // route. wizard.min.js has zero 'welcome' left and '/' redirects to
    // $wizard_steps[0]; the snapshot that held it is retired.
    {
      label: 'wizard-next-step',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD_MAIN); },
      apply: function (el) {
        var btn = closestTo(el, WIZARD_MAIN);
        if (btn && !btn.disabled) wizardMain(wizardRoute());
      }
    }

  ], { product: 'wp-mail-smtp', file: 'interactivity.js' });

  // ═══ Charts (WO-202F) ═══════════════════════════════════════════════════
  // Email Reports and the dashboard widget draw Chart.js line charts. The
  // capture froze each canvas to an image and parked the plugin's own data on
  // <body> (capture-plans/p1-reports.json, p1-dashboard.json):
  //   data-wpms-chart              the default by-date data: Reports'
  //                                stats_by_date_chart_data (src/Pro/Emails/Logs/
  //                                Reports/Admin.php:188), the widget's
  //                                chart_data (src/Pro/Admin/DashboardWidget.php:203)
  //   data-wpms-totals             Reports' stats_totals (Admin.php:189)
  //   data-wpms-charts-by-subject  per report row, keyed by its data-subject:
  //                                the live chart's labels and datasets after
  //                                the plugin drew that row's AJAX answer, and
  //                                the answer's totals (Admin.php:463-481)
  // Every number drawn here comes from those attributes. The library is the
  // plugin's own build (Chart.js 4.4.9 as WPMailSMTPChart, its moment adapter,
  // WordPress's moment), vendored in _shared/lib/ with source headers.
  // behavior-parity.js checks only that the Reports chart is live (case
  // reports-chart-live): a live report click POSTs over AJAX, which its guard
  // refuses by design. tools/__tests__/snap-charts-202f.test.js checks every
  // click against the parked answers instead.
  var READY = 'wpms:ready';
  var CHART_LIB = ['../_shared/lib/moment.min.js', '../_shared/lib/chart.min.js',
    '../_shared/lib/chartjs-adapter-moment.min.js'];
  var REPORTS_CHART = { lib: CHART_LIB, global: 'WPMailSMTPChart', id: 'wp-mail-smtp-email-reports-chart' };
  var WIDGET_CHART = { lib: CHART_LIB, global: 'WPMailSMTPChart', id: 'wp-mail-smtp-dash-widget-chart' };

  R.register([

    // ─ Email Reports: the chart, live ──────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-email-reports.js:219 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: on document ready (:339-348) chart.init() (:219-232) makes
    // the chart on #wp-mail-smtp-email-reports-chart with the settings at
    // :145-212 and fills it from stats_by_date_chart_data (updateUI,
    // :241-305). Here: the same settings and the same data, parked on
    // body[data-wpms-chart], on a canvas that fills its holder at any width.
    {
      label: 'reports-chart-live',
      event: READY,
      match: function (el) { return el === document.body && !!reportsHolder() && el.hasAttribute('data-wpms-chart'); },
      apply: function () {
        allTitle();
        reportsDraw(function (s, sets) { reportsFillByDate(s, sets, parked('data-wpms-chart')); });
      }
    },

    // ─ Email Reports: a report's chart button ──────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-email-reports.js:421 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :368): toggleSingleStats runs
    // performToggleSingleStats (:443-485) for the button's row and
    // data-subject. An icon already dashicons-dismiss (the row is showing)
    // means resetStatsUI: back to all emails. Otherwise the table state
    // resets, the row gains wp-mail-smtp-active-row, the button
    // dismiss-single-stats, its icon dashicons-chart-line → dashicons-dismiss;
    // then the AJAX answer (action wp_mail_smtp_email_reports_get_single_stats,
    // Admin.php:463-481) sets the title to the subject plus a dismiss icon,
    // the totals and the chart (:466-484). Here the answer is the one parked
    // for that subject; the spinner's flash is left out (end states only).
    // No parked answer: nothing changes and a miss is logged.
    {
      label: 'reports-subject-chart',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.js-wp-mail-smtp-toggle-single-stats'); },
      apply: function (el) {
        var btn = closestTo(el, '.js-wp-mail-smtp-toggle-single-stats');
        var dismiss = all('.dashicons', btn).some(function (i) { return i.classList.contains('dashicons-dismiss'); });
        reportsToggle(closestTo(btn, 'tr'), btn.getAttribute('data-subject'), btn, dismiss);
      },
      state: reportsState
    },

    // ─ Email Reports: a report's subject ───────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-email-reports.js:396 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin (bound at :369): the link's default is prevented (core
    // swallows it); a row that is already showing does nothing (:403-405);
    // any other row runs the same toggle as its chart button, never a
    // dismiss (:407-412). The plugin binds the subject link and the chart
    // button, not the whole row, so neither does this file.
    {
      label: 'reports-subject-link',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.subject-toggle-single-stats'); },
      apply: function (el) {
        var a = closestTo(el, '.subject-toggle-single-stats');
        var row = closestTo(a, 'tr');
        if (row && row.classList.contains('wp-mail-smtp-active-row')) return;
        reportsToggle(row, a.getAttribute('data-subject'),
          row ? row.querySelector('.js-wp-mail-smtp-toggle-single-stats') : null, false);
      },
      state: reportsState
    },

    // ─ Email Reports: back to all emails ───────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-email-reports.js:363 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: a click on the title's dismiss icon
    // (.js-wp-mail-smtp-reset-stats, delegated on document) runs
    // resetStatsUI (:516-529): the title goes back to "All Emails" (or
    // "Search Results" on a search), the page's own totals and chart come
    // back, and the table state resets (:536-544).
    {
      label: 'reports-reset-stats',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.js-wp-mail-smtp-reset-stats'); },
      apply: function () { reportsReset(); },
      state: reportsState
    },

    // ─ Dashboard widget: the chart, live ───────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-dashboard-widget.js:201 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: on document ready (:675-684) chart.init() (:201-214) makes
    // the chart on #wp-mail-smtp-dash-widget-chart and updateUI (:245-269)
    // fills it from chart_data, then applies the colour scheme, graph style
    // and email type the widget's own controls hold. Here: the same steps on
    // the data parked on body[data-wpms-chart]. With no data the plugin draws
    // random dummy points (:360-391); this file never does: nothing is drawn
    // and a miss is logged.
    {
      label: 'dash-widget-chart-live',
      event: READY,
      match: function (el) { return el === document.body && !!widgetHost() && el.hasAttribute('data-wpms-chart'); },
      apply: function () { widgetDraw(); }
    }

  ], { product: 'wp-mail-smtp', file: 'interactivity.js' });

  // Both chart files draw on document ready ($(app.ready):
  // smtp-pro-email-reports.js:329-348, smtp-pro-dashboard-widget.js:666-684).
  // Core boots at the same moment and added its listeners first, so this
  // one-shot event reaches the two *-chart-live entries through the registry.
  function ready() {
    try { document.body.dispatchEvent(new CustomEvent(READY, { bubbles: true })); }
    catch (err) { console.error('[snap] ' + READY, err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else setTimeout(ready, 0);

  // A body[data-wpms-*] attribute, parsed once. null when absent or broken.
  var PARKED = {};
  function parked(name) {
    if (!Object.prototype.hasOwnProperty.call(PARKED, name)) {
      var raw = document.body ? document.body.getAttribute(name) : null;
      var value = null;
      if (raw) {
        try { value = JSON.parse(raw); } catch (err) { console.error('[snap] ' + name + ' is not JSON', err); }
      }
      PARKED[name] = value;
    }
    return PARKED[name];
  }

  // jQuery's $.each over by-date data: an object in key order, or an array.
  function eachDay(data, fn) {
    if (!data || typeof data !== 'object') return;
    if (Array.isArray(data)) { data.forEach(function (v) { fn(v); }); return; }
    Object.keys(data).forEach(function (k) { fn(data[k]); });
  }

  // The dataset names both screens localize (Reports/Admin.php:195-200,
  // DashboardWidget.php:208-211). The legend is off: they show in tooltips.
  var TEXTS = {
    confirmed: 'Confirmed sent emails', sent: 'Sent emails', unconfirmed: 'Unconfirmed sent emails',
    failed: 'Failed emails', opened: 'Opened emails', clicked: 'Clicked links'
  };

  // One line dataset, as both chart files write it
  // (smtp-pro-email-reports.js:38-121, smtp-pro-dashboard-widget.js:41-91).
  // Only Reports gives its datasets a `key`.
  function lineSet(text, color, key) {
    var set = {
      label: text, data: [], backgroundColor: 'rgba(0, 0, 0, 0)', borderColor: color, borderWidth: 2,
      pointRadius: 4, pointBorderWidth: 1, pointBackgroundColor: 'rgba(255, 255, 255, 1)'
    };
    if (key) set.key = key;
    return set;
  }

  // The Chart.js settings both files write, word for word
  // (smtp-pro-email-reports.js:145-212, smtp-pro-dashboard-widget.js:127-194).
  // Built after the library loads: the tick labels use moment.
  function chartSettings(datasets) {
    var moment = window.moment;
    return {
      type: 'line',
      data: { labels: [], datasets: datasets.slice() },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'timeseries',
            time: { tooltipFormat: 'MMM D' },
            ticks: {
              beginAtZero: true,
              source: 'labels',
              padding: 0,
              minRotation: 25,
              maxRotation: 25,
              callback: function (value, index, values) {
                var gap = Math.floor(values.length / 7);
                if (gap < 1) return moment(value).format('MMM D');
                if ((values.length - index - 1) % gap === 0) return moment(value).format('MMM D');
              }
            },
            offset: false,
            gridLines: { offsetGridLines: false }
          },
          y: {
            ticks: {
              beginAtZero: true,
              maxTicksLimit: 6,
              padding: 0,
              callback: function (value) {
                if (Math.floor(value) === value) return value;
              }
            }
          }
        },
        elements: { line: { tension: 0, fill: true } },
        animation: false,
        plugins: { legend: { display: false }, tooltip: { displayColors: false } }
      }
    };
  }

  // ─── Email Reports helpers ──────────────────────────────────────────────
  // Markup: src/Pro/Emails/Logs/Reports/Admin.php:288-335; rows: Table.php:116-122, :257-263.
  function reportsHolder() { return document.querySelector('.wp-mail-smtp-email-reports__chart-holder'); }
  function reportsTitle() { return document.querySelector('.wp-mail-smtp-email-reports__title'); }

  // The flags wp_mail_smtp_email_reports carries (Admin.php:202-204). The
  // page renders the matching stats items under the same three calls
  // (Admin.php:303, :318, :323), so the markup answers them.
  function reportsFlags() {
    return {
      noConfirm: !!document.querySelector('.wp-mail-smtp-email-reports__stats-item--sent'),
      open: !!document.querySelector('.wp-mail-smtp-email-reports__stats-item--open-count'),
      click: !!document.querySelector('.wp-mail-smtp-email-reports__stats-item--click-count')
    };
  }

  // The default dataset list (smtp-pro-email-reports.js:36-122).
  function reportsDatasets(f) {
    var sets = f.noConfirm
      ? [lineSet(TEXTS.sent, 'rgba(106, 160, 139, 1)', 'sent'), lineSet(TEXTS.failed, 'rgba(214, 54, 56, 1)', 'failed')]
      : [lineSet(TEXTS.confirmed, 'rgba(106, 160, 139, 1)', 'confirmed'),
        lineSet(TEXTS.unconfirmed, 'rgba(167, 170, 173, 1)', 'unconfirmed'),
        lineSet(TEXTS.failed, 'rgba(214, 54, 56, 1)', 'failed')];
    if (f.open) sets.push(lineSet(TEXTS.opened, 'rgba(220, 127, 60, 1)', 'openCount'));
    if (f.click) sets.push(lineSet(TEXTS.clicked, 'rgba(251, 170, 111, 1)', 'clickCount'));
    return sets;
  }

  // The plugin's updateChartData (smtp-pro-email-reports.js:255-305) on
  // by-date data: one moment label per day, one {x, y} point per series.
  function reportsFillByDate(settings, sets, data) {
    var moment = window.moment;
    var cols = { confirmed: [], unconfirmed: [], sent: [], failed: [], openCount: [], clickCount: [] };
    settings.data.labels = [];
    eachDay(data, function (value) {
      var date = moment(value.day);
      settings.data.labels.push(date);
      cols.confirmed.push({ x: date, y: value.delivered });
      cols.unconfirmed.push({ x: date, y: value.sent });
      cols.sent.push({ x: date, y: Number(value.sent) + Number(value.delivered) });
      cols.failed.push({ x: date, y: value.unsent });
      cols.openCount.push({ x: date, y: value.open_count });
      cols.clickCount.push({ x: date, y: value.click_count });
    });
    settings.data.datasets = sets.slice();
    for (var i = 0; i < settings.data.datasets.length; i++) {
      settings.data.datasets[i].data = cols[settings.data.datasets[i].key];
    }
  }

  // A parked answer is the chart's own state after updateChartData ran on
  // it: labels as days, each series' values by key. Same datasets, same
  // points.
  function reportsFillParked(settings, sets, answer) {
    var moment = window.moment;
    var dates = (answer.labels || []).map(function (day) { return moment(day); });
    settings.data.labels = dates;
    settings.data.datasets = sets.slice();
    settings.data.datasets.forEach(function (set) {
      var got = (answer.datasets || []).filter(function (p) { return p && p.key === set.key; })[0];
      if (!got) console.info('[snap] the parked chart has no ' + set.key + ' series — drawn empty');
      set.data = got ? got.data.map(function (y, i) { return { x: dates[i], y: y }; }) : [];
    });
  }

  // The plugin's `chart` object: its settings (:145) and datasets (:36), made
  // once the library is in, then redrawn in place like chart.updateUI (:241).
  var REPORTS = null;
  function reportsDraw(fill) {
    var host = reportsHolder();
    if (!host) return null;
    return R.chart(host, function () {
      if (!REPORTS) {
        var sets = reportsDatasets(reportsFlags());
        REPORTS = { sets: sets, settings: chartSettings(sets) };
      }
      fill(REPORTS.settings, REPORTS.sets);
      return REPORTS.settings;
    }, REPORTS_CHART);
  }

  // jQuery .text(v) on every match; undefined reads instead of writing.
  function setText(sel, v) {
    if (v === undefined) return;
    all(sel).forEach(function (n) { n.textContent = v; });
  }

  // The plugin's updateTotalsUI (smtp-pro-email-reports.js:553-580).
  function reportsTotals(totals) {
    if (!totals) return;
    var f = reportsFlags();
    var sent = Number(totals.sent) + Number(totals.delivered);
    setText('.wp-mail-smtp-email-reports__stats-item--total span', sent + Number(totals.unsent));
    setText('.wp-mail-smtp-email-reports__stats-item--unsent span', totals.unsent);
    if (f.noConfirm) {
      setText('.wp-mail-smtp-email-reports__stats-item--sent span', sent);
    } else {
      setText('.wp-mail-smtp-email-reports__stats-item--confirmed span', totals.delivered);
      setText('.wp-mail-smtp-email-reports__stats-item--unconfirmed span', totals.sent);
    }
    if (f.open) setText('.wp-mail-smtp-email-reports__stats-item--open-count span', totals.open_count);
    if (f.click) setText('.wp-mail-smtp-email-reports__stats-item--click-count span', totals.click_count);
  }

  // The title the page opened with, "All Emails" or "Search Results"
  // (Admin.php:290-296): what resetStatsUI writes back from texts.all_emails
  // or texts.search_results (:519-523). Read once, before a subject replaces it.
  var ALL_TITLE = null;
  function allTitle() {
    var t = reportsTitle();
    if (ALL_TITLE === null && t && !t.querySelector('.js-wp-mail-smtp-reset-stats')) ALL_TITLE = t.textContent.trim();
    return ALL_TITLE;
  }

  // The plugin's resetTableState (smtp-pro-email-reports.js:536-544).
  function reportsTableReset() {
    all('.wp-list-table').forEach(function (table) {
      all('.wp-mail-smtp-active-row', table).forEach(function (n) { n.classList.remove('wp-mail-smtp-active-row'); });
      all('.dashicons-dismiss', table).forEach(function (n) {
        n.classList.remove('dashicons-dismiss');
        n.classList.add('dashicons-chart-line');
      });
      all('.dismiss-single-stats', table).forEach(function (n) { n.classList.remove('dismiss-single-stats'); });
    });
  }

  // The plugin's performToggleSingleStats (smtp-pro-email-reports.js:443-485),
  // with the parked answer in place of the AJAX one. The subject is the
  // control's data-subject attribute (the plugin reads it with jQuery .data()).
  function reportsToggle(row, subject, btn, dismiss) {
    if (dismiss) { reportsReset(); return; }
    var answers = parked('data-wpms-charts-by-subject') || {};
    var answer = subject !== null && Object.prototype.hasOwnProperty.call(answers, subject) ? answers[subject] : null;
    if (!answer) {
      console.info('[snap] no parked chart for "' + subject + '" — nothing redrawn');
      return;
    }
    allTitle();
    reportsTableReset();
    if (row) row.classList.add('wp-mail-smtp-active-row');
    if (btn) {
      btn.classList.add('dismiss-single-stats');
      all('.dashicons', btn).forEach(function (i) {
        i.classList.remove('dashicons-chart-line');
        i.classList.add('dashicons-dismiss');
      });
    }
    var title = reportsTitle();
    if (title) {
      title.textContent = subject;
      var icon = document.createElement('i');
      icon.className = 'dashicons dashicons-dismiss js-wp-mail-smtp-reset-stats';
      title.appendChild(icon);
    }
    reportsTotals(answer.totals);
    reportsDraw(function (s, sets) { reportsFillParked(s, sets, answer); });
  }

  // The plugin's resetStatsUI (smtp-pro-email-reports.js:516-529).
  function reportsReset() {
    var title = reportsTitle();
    var text = allTitle();
    if (title && text !== null) title.textContent = text;
    reportsTotals(parked('data-wpms-totals'));
    reportsDraw(function (s, sets) { reportsFillByDate(s, sets, parked('data-wpms-chart')); });
    reportsTableReset();
  }

  // What a film is told after a Reports click: the subject showing, or null.
  function reportsState() {
    var btn = document.querySelector('.wp-list-table tr.wp-mail-smtp-active-row .js-wp-mail-smtp-toggle-single-stats');
    return { key: 'reports.subject', value: btn ? btn.getAttribute('data-subject') : null };
  }

  // ─── Dashboard widget helpers ───────────────────────────────────────────
  // Markup: src/Pro/Admin/DashboardWidget.php:401-432 (chart block, selects,
  // stats), :460-485 (email type), :492-534 (graph style, colour scheme).
  function widgetEl() { return document.getElementById('wp_mail_smtp_reports_widget_pro'); }
  function widgetHost() {
    var w = widgetEl();
    return w ? w.querySelector('.wp-mail-smtp-dash-widget-chart-block') : null;
  }
  // jQuery .val() of the checked settings radio, or undefined.
  function widgetChecked(name) {
    var w = widgetEl();
    var input = w ? w.querySelector('.wp-mail-smtp-dash-widget-settings-menu input[name=' + name + ']:checked') : null;
    return input ? input.value : undefined;
  }
  function widgetEmailType() {
    var select = document.getElementById('wp-mail-smtp-dash-widget-email-type');
    return select ? select.value : undefined;
  }
  // wp_mail_smtp_dashboard_widget.no_send_confirmations (DashboardWidget.php:213):
  // the email type select drops its 'sent' option under the same call (:470-472).
  function widgetNoConfirm() {
    return !document.querySelector('#wp-mail-smtp-dash-widget-email-type option[value="sent"]');
  }

  // The widget's dataset list (smtp-pro-dashboard-widget.js:39-92).
  function widgetDatasets(noConfirm) {
    return noConfirm
      ? [lineSet(TEXTS.sent, 'rgba(106, 160, 139, 1)'), lineSet(TEXTS.failed, 'rgba(214, 54, 56, 1)')]
      : [lineSet(TEXTS.confirmed, 'rgba(106, 160, 139, 1)'), lineSet(TEXTS.unconfirmed, 'rgba(167, 170, 173, 1)'),
        lineSet(TEXTS.failed, 'rgba(214, 54, 56, 1)')];
  }

  // updateSmtpColorScheme (:438-462) and updateWpColorScheme (:469-493):
  // they differ only in the first series' line and fill.
  function widgetScheme(ds, noConfirm, emailType, firstLine, firstFill) {
    var bg = ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'];
    if (emailType !== 'all') bg = [firstFill, 'rgba(167, 170, 173, 0.16)', 'rgba(214, 54, 56, 0.16)'];
    ds[0].borderColor = firstLine;
    if (noConfirm) {
      ds[1].borderColor = 'rgba(214, 54, 56, 1)';
    } else {
      ds[1].borderColor = 'rgba(167, 170, 173, 1)';
      ds[2].borderColor = 'rgba(214, 54, 56, 1)';
    }
    return bg;
  }

  // The plugin's updateUI (smtp-pro-dashboard-widget.js:245-269) with
  // updateData (:278-312), updateChartData (:319-331), updateColorScheme
  // (:400-431), updateStyle (:571-580) and updateDatasets (:502-564).
  var WIDGET = null;
  function widgetDraw() {
    var host = widgetHost();
    var data = parked('data-wpms-chart');
    if (!host) return null;
    if (!data || typeof data !== 'object' || !Object.keys(data).length) {
      console.info('[snap] no parked widget chart data — nothing drawn');
      return null;
    }
    return R.chart(host, function () {
      var moment = window.moment;
      var noConfirm = widgetNoConfirm();
      var emailType = widgetEmailType();
      var style = widgetChecked('style');
      if (!WIDGET) {
        var list = widgetDatasets(noConfirm);
        WIDGET = { sets: list, settings: chartSettings(list) };
      }
      var s = WIDGET.settings;

      // updateData + updateChartData.
      var cache = { confirmed: [], unconfirmed: [], sent: [], failed: [] };
      s.data.labels = [];
      eachDay(data, function (value) {
        var date = moment(value.day);
        s.data.labels.push(date);
        cache.confirmed.push({ x: date, y: value.delivered });
        cache.unconfirmed.push({ x: date, y: value.sent });
        cache.sent.push({ x: date, y: value.sent + value.delivered });
        cache.failed.push({ x: date, y: value.unsent });
      });
      s.data.datasets = WIDGET.sets.slice();
      var ds = s.data.datasets;
      if (noConfirm) {
        ds[0].data = cache.sent;
        ds[1].data = cache.failed;
      } else {
        ds[0].data = cache.confirmed;
        ds[1].data = cache.unconfirmed;
        ds[2].data = cache.failed;
      }

      // updateColorScheme.
      var scheme = widgetChecked('color');
      var colors = ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'];
      if (scheme === 'smtp') colors = widgetScheme(ds, noConfirm, emailType, 'rgba(106, 160, 139, 1)', 'rgba(106, 160, 139, 0.16)');
      else if (scheme === 'wp') colors = widgetScheme(ds, noConfirm, emailType, 'rgba(34, 113, 177, 1)', 'rgba(34, 113, 177, 0.16)');
      if (style === 'bar') {
        if (noConfirm) {
          colors[0] = ds[0].borderColor;
          colors[2] = ds[1].borderColor;
        } else {
          colors[0] = ds[0].borderColor;
          colors[1] = ds[1].borderColor;
          colors[2] = ds[2].borderColor;
        }
      }
      if (noConfirm) {
        ds[0].backgroundColor = colors[0];
        ds[1].backgroundColor = colors[2];
      } else {
        ds[0].backgroundColor = colors[0];
        ds[1].backgroundColor = colors[1];
        ds[2].backgroundColor = colors[2];
      }

      // updateStyle.
      s.type = style;
      if (style === 'line') s.options.scales.x.gridLines.offsetGridLines = false;
      else if (style === 'bar') s.options.scales.x.gridLines.offsetGridLines = true;

      // updateDatasets: updateLineDatasets (:516-542) / updateBarDatasets (:547-564).
      if (style === 'line') {
        if (emailType === 'delivered') {
          ds[1].data = [];
          if (!noConfirm) ds[2].data = [];
        } else if (emailType === 'sent') {
          if (noConfirm) ds[1].data = [];
          else { ds[0].data = []; ds[2].data = []; }
        } else if (emailType === 'unsent') {
          ds[0].data = [];
          if (!noConfirm) ds[1].data = [];
        }
      } else if (style === 'bar') {
        if (emailType === 'delivered') s.data.datasets = ds.slice(0, 1);
        else if (emailType === 'sent') s.data.datasets = noConfirm ? ds.slice(0, 1) : ds.slice(1, 2);
        else if (emailType === 'unsent') s.data.datasets = noConfirm ? ds.slice(1) : ds.slice(2);
      }
      return s;
    }, WIDGET_CHART);
  }

  // ═══ Setup Wizard (WO-202H) ═════════════════════════════════════════════
  // assets/vue/js/wizard.min.js (4.9.0) is one minified line: the offsets
  // below are character positions in it. Every step moves through two shared
  // helpers over one step list:
  //   $wizard_steps (offset 258807): import_step only when another SMTP
  //     plugin was detected (other_smtp_plugins, src/Admin/SetupWizard.php:234),
  //     then choose_mailer_step, configure_mailer_step, plugin_features_step,
  //     configure_email_logs_step on Pro (help_improve_step on Lite),
  //     license_step, check_configuration_step;
  //   $next_step(n) / $previous_step(n) (offset 233744): the step whose name
  //     the current route's name contains, then the one 1 + n after it, or
  //     1 + n before it (before the first one: welcome).
  // Route names map to hash paths by the router's own table (offset 230786).
  // This capture site runs Pro (is_pro, SetupWizard.php:230) and detects no
  // other SMTP plugin: every captured step counter reads "of 6" (the counter
  // is that findIndex + 1 of $wizard_steps.length, offset 9333) and Import's
  // five plugins are all disabled (offset 11255 disables each one missing
  // from other_smtp_plugins). The counter is read at click time, so a capture
  // made with a detected plugin ("of 7") gets import_step back.
  var WIZARD = '.wp-mail-smtp-setup-wizard ';
  var WIZARD_FOOTER = WIZARD + '.wp-mail-smtp-setup-wizard-step-footer ';
  var WIZARD_MAIN = WIZARD_FOOTER + 'button[name="next_step"], ' + WIZARD + '.wp-mail-smtp-welcome .wp-mail-smtp-button-main';
  var WIZARD_SKIP = WIZARD_FOOTER + 'button[name="skip_step"]';
  var WIZARD_LEAVE = WIZARD_FOOTER + 'button[name="send_test_email"], ' + WIZARD_FOOTER + 'button[name="finish_setup"], '
    + WIZARD_FOOTER + 'button[name="start_troubleshooting"]';
  // 4.10.0 removed the Welcome route: wizard.min.js has no 'welcome' left,
  // and '/' is now {path:"/", redirect:()=>({name: $wizard_steps[0]})}. So
  // '#/' is not a route of its own any more — it is an alias for the first
  // step, which on this site is choose_mailer. Nothing maps it here, so
  // wizardRoute() reads the plain wizard URL through the #/step/choose_mailer
  // key that also points at that snapshot.
  var WIZARD_PATHS = {
    import_step: '#/step/import', choose_mailer_step: '#/step/choose_mailer',
    configure_mailer_step: '#/step/configure_mailer', plugin_features_step: '#/step/plugin_features',
    configure_email_logs_step: '#/step/configure_email_logs', help_improve_step: '#/step/help_improve',
    license_step: '#/step/license', check_configuration_step: '#/step/check_configuration',
    check_configuration_step_success: '#/step/successful_configuration',
    check_configuration_step_failure: '#/step/failed_configuration'
  };
  // configure_mailer_step_<mailer>: the child path is the mailer's slug,
  // except Amazon SES, whose path is 'amazoneses' (offset 230786).
  var WIZARD_MAILERS = {
    smtp: 'smtp', sendlayer: 'sendlayer', smtpcom: 'smtpcom', sendinblue: 'sendinblue', mailersend: 'mailersend',
    mailgun: 'mailgun', mailjet: 'mailjet', mandrill: 'mandrill', sendgrid: 'sendgrid', smtp2go: 'smtp2go',
    sparkpost: 'sparkpost', postmark: 'postmark', amazonses: 'amazoneses', gmail: 'gmail', outlook: 'outlook',
    zoho: 'zoho', elasticemail: 'elasticemail', resend: 'resend'
  };
  // Where the success and failure steps send the browser: exit_url and
  // email_test_tab_url (SetupWizard.php:228-229; Area.php:1413).
  var WIZARD_EXIT = 'admin.php?page=wp-mail-smtp';
  var WIZARD_TEST_TAB = 'admin.php?page=wp-mail-smtp-tools&tab=test';
  // Each Configure Mailer child's areRequiredFieldsValid() (offset of each
  // rule): the fields that must not be empty, read from the inputs the step
  // rendered (#input-<field>; Zoho's domain is a select). `a?b`: only while
  // switch b is on; `a!b`: only while it is off. An input the step did not
  // render (a value a constant sets) is not checked.
  var WIZARD_REQUIRED = {
    smtp: ['host', 'port', 'user?auth', 'pass?auth', 'from_email'],                       // 92684
    sendlayer: ['api_key', 'from_email'],                                                 // 108602
    smtpcom: ['api_key', 'channel', 'from_email'],                                        // 115519
    sendinblue: ['api_key', 'from_email'],                                                // 121705
    mailersend: ['api_key', 'from_email'],                                                // 126513
    mailgun: ['api_key', 'domain', 'from_email'],                                         // 132300
    mailjet: ['api_key', 'from_email'],                                                   // 137424
    sendgrid: ['api_key', 'from_email'],                                                  // 142604
    smtp2go: ['api_key', 'from_email'],                                                   // 146943
    sparkpost: ['api_key', 'from_email'],                                                 // 152089
    postmark: ['server_api_token', 'from_email'],                                         // 157421
    amazonses: ['client_id', 'client_secret', 'region', 'from_email'],                    // 175497
    gmail: ['from_email', 'client_id!one_click_setup_enabled', 'client_secret!one_click_setup_enabled'],   // 195148
    outlook: ['from_email', 'client_id!one_click_setup_enabled', 'client_secret!one_click_setup_enabled'], // 206810
    zoho: ['domain', 'client_id', 'client_secret'],                                       // 212654
    elasticemail: ['api_key', 'from_email'],                                              // 217137
    mandrill: ['api_key', 'from_email'],                                                  // 221334
    resend: ['api_key', 'from_email']                                                     // 225608
  };
  // Buttons whose result the capture cannot hold: [selector, the request the
  // plugin makes, why]. Each logs a miss instead of doing nothing silently.
  var WIZARD_UNCAPTURED = [
    ['.wp-mail-smtp-sendlayer-card__btn, .wp-mail-smtp-button-quick-connect', 'admin-ajax.php?action=wp_mail_smtp_sendlayer_connect',
      'SendLayer Quick Connect asks for a connect URL, then leaves for SendLayer (offsets 19805, 21951, 109341)'],
    ['.wp-mail-smtp-one-click-sign-in-btn', 'admin-ajax.php?action=wp_mail_smtp_vue_get_oauth_url',
      'sign-in asks for the provider\'s OAuth URL, then leaves for it (offsets 182321, 242500)'],
    ['.wp-mail-smtp-plugin-item button', 'admin-ajax.php?action=wp_mail_smtp_vue_install_plugin',
      'Install installs the plugin over AJAX (offset 72021)'],
    ['button[name="send_feedback"]', '#/step/successful_configuration',
      'Send us Feedback opens a SweetAlert dialog (offset 75927) that is not captured']
  ];

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  // The route name this snapshot shows: its own key in the nav map.
  function wizardRoute() {
    var m = R.navMap();
    if (!m) return null;
    var slug = R.currentSlug();
    for (var k in m.k) {
      if (!own(m.k, k) || m.k[k] !== slug) continue;
      var hash = k.indexOf('#') === -1 ? '#/' : k.slice(k.indexOf('#'));
      for (var n in WIZARD_PATHS) if (own(WIZARD_PATHS, n) && WIZARD_PATHS[n] === hash) return n;
      for (var mailer in WIZARD_MAILERS) {
        if (own(WIZARD_MAILERS, mailer) && hash === '#/step/configure_mailer/' + WIZARD_MAILERS[mailer]) return 'configure_mailer_step_' + mailer;
      }
    }
    return null;
  }

  function wizardSteps() {
    var steps = ['choose_mailer_step', 'configure_mailer_step', 'plugin_features_step', 'configure_email_logs_step',
      'license_step', 'check_configuration_step'];
    var counter = document.querySelector(WIZARD + '.wp-mail-smtp-setup-wizard-step-count');
    var of = counter ? /(\d+)\D+(\d+)\s*$/.exec(counter.textContent.trim()) : null;
    if (of && +of[2] === steps.length + 1) steps.unshift('import_step');
    return steps;
  }
  function stepAt(steps, route) {
    for (var i = 0; i < steps.length; i++) if (route.indexOf(steps[i]) !== -1) return i;
    return -1;
  }
  function wizardNextName(route, skip) {
    var steps = wizardSteps();
    return steps[stepAt(steps, route) + 1 + (skip || 0)] || null;
  }
  // 4.10.0's $previous_step is `i<0 || this.$router.push(...)` — below the
  // first step it does nothing at all. 4.9.0 fell back to `let i="welcome"`.
  // null means "the plugin stays put", and the caller says so out loud.
  function wizardPreviousName(route, skip) {
    var steps = wizardSteps();
    var s = stepAt(steps, route) - 1 - (skip || 0);
    return s >= 0 ? steps[s] : null;
  }

  function wizardHasRoute(name) {
    if (!name) return false;
    if (own(WIZARD_PATHS, name)) return true;
    var m = /^configure_mailer_step_(.+)$/.exec(name);
    return !!m && own(WIZARD_MAILERS, m[1]);
  }
  function wizardPath(name) {
    if (own(WIZARD_PATHS, name)) return WIZARD_PATHS[name];
    var m = /^configure_mailer_step_(.+)$/.exec(name || '');
    return m ? '#/step/configure_mailer/' + (own(WIZARD_MAILERS, m[1]) ? WIZARD_MAILERS[m[1]] : m[1]) : null;
  }

  // The mailer the wizard's store holds ($_settings/mailer): on a Configure
  // Mailer route, that route's (Choose Mailer saved it, setMailer, offset
  // 27443); on the steps after it, the one the hop carried as ?mailer=. A
  // step opened on its own does not know it.
  function wizardMailer(route) {
    var c = /^configure_mailer_step_(.+)$/.exec(route || '');
    if (c) return c[1];
    return R.params().mailer || null;
  }

  // Why a step has no capture: License moves straight on when a licence
  // exists (created(), offset 66369), as it does on this site, to Check
  // Configuration, which sends a test email as it opens (offset 67453) and
  // then shows success or failure by the send's outcome.
  var WIZARD_UNCAPTURED_STEPS = {
    license_step: 'License moves straight on (a licence exists) to Check Configuration, which sends a test email as it opens, then shows success or failure: not captured',
    check_configuration_step: 'Check Configuration sends a test email as it opens, then shows success or failure: not captured'
  };

  // Push a route: its captured snapshot, carrying the store's mailer, or a
  // logged miss that says why.
  function wizardGo(name, mailer) {
    if (!name) return;
    var path = wizardPath(name);
    if (!wizardHasRoute(name)) {
      R.miss(path || '#/', 'the wizard has no route named ' + name + ' — live, the step area goes empty');
      return;
    }
    var slug = R.resolveHref(path);
    if (slug) R.goto(slug, mailer ? { params: { mailer: mailer } } : null);
    else R.miss(path, own(WIZARD_UNCAPTURED_STEPS, name) ? WIZARD_UNCAPTURED_STEPS[name] : 'the ' + name + ' step is not captured');
  }

  function wizardEmptyRequired(mailer) {
    var rules = own(WIZARD_REQUIRED, mailer) ? WIZARD_REQUIRED[mailer] : [];
    for (var i = 0; i < rules.length; i++) {
      var r = /^([a-z_]+)(?:([?!])([a-z_]+))?$/.exec(rules[i]);
      if (r[2]) {
        var sw = document.getElementById('input-' + r[3]);
        var on = !!sw && sw.checked;
        if (r[2] === '?' ? !on : on) continue;
      }
      var input = document.getElementById('input-' + r[1]) || document.querySelector(WIZARD + 'select[id$="-select-' + r[1] + '"]');
      if (!input) continue;
      var v = input.value == null ? '' : String(input.value);
      if (v === '' || (r[1] === 'port' && isNaN(v))) return r[1];
    }
    return null;
  }

  // The main button, per step (the offsets are in wizard-next-step's banner).
  function wizardMain(route) {
    if (!route) return;
    if (route === 'choose_mailer_step') {
      var picked = document.querySelector(WIZARD + '.wp-mail-smtp-setup-wizard-step-choose-mailer input[name="choose_mailer"]:checked');
      var chosen = picked ? picked.value : null;
      if (!chosen || chosen === 'mail') return;
      wizardGo(wizardNextName(route) + '_' + chosen, chosen);
      return;
    }
    var mailer = wizardMailer(route);
    if (/^configure_mailer_step_/.test(route)) {
      var empty = wizardEmptyRequired(mailer);
      if (empty) {
        R.miss(wizardPath(route), 'required field "' + empty + '" is empty: the plugin shows its "Heads up!" alert (not captured) and stays');
        return;
      }
    }
    if (route === 'plugin_features_step') {
      var log = document.getElementById('wp-mail-smtp-settings-long-checkbox-email_log');
      wizardGo(wizardNextName(route, log && !log.checked ? 1 : 0), mailer);
      return;
    }
    wizardGo(wizardNextName(route), mailer);
  }

  // Previous Step, per step.
  function wizardPrevious(route) {
    if (!route) return;
    var mailer = wizardMailer(route);
    if (route === 'plugin_features_step') {
      var steps = wizardSteps();
      var before = steps[stepAt(steps, route) - 1];
      if (!mailer) {
        // Opened on its own, the store holds the site's saved mailer: Default
        // (mail) here, which has no configure route — live, the step area
        // goes empty (checked live, read-only, WO-202H). Never a wrong step.
        R.miss(wizardPath(before), 'the step before is ' + before + '_<the mailer the wizard holds>; opened on its own, live pushes a route that does not exist and the step area goes empty');
        return;
      }
      wizardGo(before + '_' + mailer, mailer);
      return;
    }
    var prev = wizardPreviousName(route);
    if (!prev) {
      // Import and Help Improve are not in $wizard_steps on this site, so
      // findIndex gives -1 and $previous_step's `i<0` guard returns without
      // pushing anything. The live page stays exactly where it is.
      R.miss(wizardPath(route) || '#/', 'this step is not in $wizard_steps, so $previous_step\'s i<0 guard returns without pushing a route: live the page stays put (4.10.0 removed the Welcome fallback)');
      return;
    }
    wizardGo(prev, mailer);
  }

  function wizardLeave(btn) {
    var name = btn.getAttribute('name');
    var url = name === 'send_test_email' ? WIZARD_TEST_TAB
      : name === 'start_troubleshooting' ? WIZARD_TEST_TAB + '&auto-start=1' : WIZARD_EXIT;
    var hit = R.resolve(url);
    if (hit) { R.goto(hit.slug, hit.params.length ? { params: hit.params } : null); return; }
    R.miss(url, name === 'start_troubleshooting'
      ? 'with auto-start, Email Test sends a test email the moment it opens (src/Admin/Pages/TestTab.php:305-318): not captured' : null);
  }

  function wizardUncaptured(el) {
    for (var i = 0; i < WIZARD_UNCAPTURED.length; i++) {
      var b = closestTo(el, WIZARD + WIZARD_UNCAPTURED[i][0].split(', ').join(', ' + WIZARD));
      if (b) return { btn: b, href: WIZARD_UNCAPTURED[i][1], why: WIZARD_UNCAPTURED[i][2] };
    }
    return null;
  }

  // ═══ Tools › Export: the Custom Date Range picker (WO-202H, T12) ════════
  // The plugin runs its own flatpickr 4.6.9 build (assets/js/vendor/
  // flatpickr.min.js, enqueued by src/Pro/Emails/Logs/Export/Admin.php:50-56),
  // vendored in _shared/lib/ with a source header. Its stylesheet is already
  // in the capture: _shared/css/20f054b8b45c.css is byte-identical to
  // assets/css/vendor/flatpickr.min.css. The capture froze flatpickr's own
  // DOM — the field turned hidden with `flatpickr-input`, the alt input
  // flatpickr inserted after it, the calendar it appended to <body> — and
  // that copy has no handlers. So it is taken back out, the way flatpickr's
  // destroy() puts the field back, and the plugin's init runs again on the
  // field with the plugin's options. One option is added, `now`: "today" is
  // the day the capture's own calendar marked today (its .flatpickr-day.today,
  // labelled in flatpickr's ariaDateFormat 'F j, Y'), never the clock. A
  // calendar captured open is opened again. flatpickr makes no request and
  // nothing is saved.
  var FLATPICKR = ['../_shared/lib/flatpickr.min.js'];
  var EXPORT_DATE = 'wp-mail-smtp-tools-export-email-logs-date-flatpickr';
  function exportDateRange() {
    var input = document.getElementById(EXPORT_DATE);
    if (!input || input._flatpickr) return;
    var calendars = all('.flatpickr-calendar');
    var today = calendars.length === 1 ? calendars[0].querySelector('.flatpickr-day.today') : null;
    var label = today ? today.getAttribute('aria-label') : null;
    if (!label) {
      console.info('[snap] the Export date range has no captured "today" — the picker stays as captured');
      return;
    }
    var calendar = calendars[0];
    var open = calendar.classList.contains('open');
    R.lib(FLATPICKR, function () {
      var fp = window.flatpickr;
      if (typeof fp !== 'function' || input._flatpickr) return;
      var alt = input.nextElementSibling;
      if (alt && alt.localName === 'input' && alt.classList.contains('form-control')) alt.parentNode.removeChild(alt);
      if (calendar.parentNode) calendar.parentNode.removeChild(calendar);
      input.classList.remove('flatpickr-input');
      input.setAttribute('type', 'text');
      // initDateRange (smtp-pro-tools-logs-export.js:235-257): the user's
      // language (WP::get_language_code, src/WP.php:502 — the locale before
      // its "_", localized as lang_code at Export/Admin.php:90; the page's
      // lang attribute carries the same locale), flatpickr's own locale for
      // it when the build has one, and ' - ' between the two dates.
      var lang = (document.documentElement.getAttribute('lang') || 'en').split(/[-_]/)[0].toLowerCase();
      var locale = { rangeSeparator: ' - ' };
      if (own(fp, 'l10ns') && own(fp.l10ns, lang)) {
        locale = fp.l10ns[lang];
        locale.rangeSeparator = ' - ';
      }
      // $(field).flatpickr(options) is flatpickr(field, options): the build's
      // jQuery binding is jQuery.fn.flatpickr = function (e) { return k(this, e) }
      // and flatpickr(node, e) is k([node], e) (flatpickr.min.js offsets 49149, 49412).
      var picker = fp(input, {
        altInput: true,
        altFormat: 'M j, Y',
        dateFormat: 'Y-m-d',
        locale: locale,
        mode: 'range',
        now: fp.parseDate(label, 'F j, Y')
      });
      if (open && picker && typeof picker.open === 'function') picker.open();
    });
  }

  R.register([

    // ─ Setup Wizard: Skip this Step ────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: button[name=skip_step] runs the step's nextStep(), which is
    // $next_step() on Import (offset 11255), Help Improve (54499) and License
    // (62783) — the button's template at 6627 / 46058 / 58381. On this site
    // that is Choose Mailer from Import and from Help Improve (neither is in
    // $wizard_steps, so findIndex gives -1 and the next step is the first).
    // No request is made.
    {
      label: 'wizard-skip-step',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD_SKIP); },
      apply: function (el) {
        var btn = closestTo(el, WIZARD_SKIP);
        var route = wizardRoute();
        if (btn && !btn.disabled && route) wizardGo(wizardNextName(route), wizardMailer(route));
      }
    },

    // ─ Setup Wizard: Previous Step ─────────────────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // 4.10.0: $previous_step is now `i<0 || this.$router.push({name:
    // $wizard_steps[i]})` — below the first step it returns silently. 4.9.0
    // fell back to `let i="welcome"`, and that route no longer exists. A step
    // outside $wizard_steps (Import, Help Improve on this site) therefore
    // stays put, and says so as a declared miss rather than dying quietly.
    // Real plugin: the footer's "Previous Step" link (href="#", default
    // prevented) runs the step's previousStep(): $previous_step() on Import,
    // Choose Mailer, Configure Mailer (32134, which also clears blocked_step),
    // Configure Email Logs (230644) and Help Improve; on Plugin Features
    // (43117) it pushes configure_mailer_step_<the store's mailer>. A step
    // opened without that mailer logs a miss. No request is made.
    {
      label: 'wizard-previous-step',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, WIZARD_FOOTER + 'a');
        return !!a && !!a.querySelector('.text-with-arrow-left');
      },
      apply: function () { wizardPrevious(wizardRoute()); }
    },

    // ─ Setup Wizard: leave from the result steps ───────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: on the success step "Send a Test Email" (offset 73834)
    // opens email_test_tab_url and "Finish Setup" (76435) exit_url; on the
    // failure step "Start Troubleshooting" (78599) opens email_test_tab_url
    // with &auto-start=1 and "Finish Setup" exit_url — full page loads. The
    // URLs are the localized ones (src/Admin/SetupWizard.php:228-229); the nav
    // map finds their snapshots. Troubleshooting's page sends a test email as
    // it opens, so it is a logged miss.
    {
      label: 'wizard-leave',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD_LEAVE); },
      apply: function (el) { wizardLeave(closestTo(el, WIZARD_LEAVE)); }
    },

    // ─ Setup Wizard: buttons whose result is not captured ──────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: SendLayer Quick Connect and the Google / Microsoft sign-in
    // leave the site; Install installs a plugin; Send us Feedback opens a
    // dialog (WIZARD_UNCAPTURED above names each one's code). None of those
    // results is captured, so each click logs a miss with the reason, never a
    // screen. A disabled button (an installed plugin's) gets no click.
    {
      label: 'wizard-uncaptured-action',
      event: 'click',
      match: function (el) { return !!wizardUncaptured(el); },
      apply: function (el) {
        var u = wizardUncaptured(el);
        if (u && !u.btn.disabled) R.miss(u.href, u.why);
      }
    },

    // ─ Setup Wizard: dismiss a mailer notice ───────────────────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: the Amazon SES and Gmail notices render while
    // !notice_dismissed (template at offset 157989); the × (href="#", default
    // prevented) sets notice_dismissed (175912, 195501), so the notice is
    // removed. The sessionStorage flag it also sets is not kept here.
    {
      label: 'wizard-notice-dismiss',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD + '.wp-mail-smtp-notice__dismiss'); },
      apply: function (el) {
        var notice = closestTo(el, '.wp-mail-smtp-notice');
        if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
      }
    },

    // ─ Tools › Export: the Custom Date Range picker, live ──────────────────
    // @since 2026-09-19 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-tools-logs-export.js:235 @verified 2026-09-19 @product wp-mail-smtp
    // Real plugin: on document ready (:62, :70-77) initDateRange (:235-257)
    // makes the field a flatpickr range picker: altInput, altFormat 'M j, Y',
    // dateFormat 'Y-m-d', ' - ' between the dates. Here: the same build and
    // options on the same field (exportDateRange above), "today" fixed to the
    // capture's. Picking two dates fills the visible field ("Sep 1, 2026 -
    // Sep 15, 2026") and the posted one ("2026-09-01 - 2026-09-15") exactly
    // as live.
    {
      label: 'export-date-range-live',
      event: READY,
      match: function (el) { return el === document.body && !!document.getElementById(EXPORT_DATE); },
      apply: function () { exportDateRange(); }
    }

  ], { product: 'wp-mail-smtp', file: 'interactivity.js' });

  // ═══ Setup Wizard: the controls inside a step (WO-202J) ═════════════════
  // The wizard is a minified Vue app, so what each control does was OBSERVED
  // LIVE on WP Mail SMTP Pro 4.10.0 (2026-09-20), with every non-GET and
  // every admin-ajax / admin-post / wp-json / rest_route request aborted
  // before the click: each entry below mirrors the DOM change that
  // observation recorded, and names the route it was seen on. The component
  // each one belongs to is cited by its name and character offset in
  // assets/vue/js/wizard.min.js (4.10.0), grepped, never read whole.
  // Nothing is saved: Save and Continue stays the route-level entry's, and
  // the provider preflight 4.10.0 added runs only on that save.

  var WIZARD_STEP = WIZARD + '.wp-mail-smtp-setup-wizard-step ';

  R.register([

    // ─ Setup Wizard: a styled radio ────────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: every radio group in a step is SettingsInputRadiosWithIcons
    // (the mailer tiles, offset 32047) or SettingsInputRadio (Encryption,
    // Region, offset 104739). Both write the same two classes: labelClass
    // gives the checked option's label " wp-mail-smtp-styled-radio-label-checked"
    // (plus -disabled / -readonly), titleClass gives its span
    // "wp-mail-smtp-styled-radio wp-mail-smtp-styled-radio-checked".
    // Observed live 2026-09-20 on #/step/choose_mailer (tiles),
    // #/step/configure_mailer/smtp (Encryption) and …/mailgun (Region): a
    // click writes those two on the clicked option, clears them from the one
    // that had them, and moves the radios — nothing else, and a second click
    // changes nothing. What a step does on top of that (the SendLayer card,
    // the SMTP port and Auto TLS row) is in wizardRadioEffects.
    {
      label: 'wizard-styled-radio',
      event: 'click',
      match: function (el) {
        var lab = closestTo(el, WIZARD_STEP + 'label[for]');
        var input = lab && lab.querySelector('input[type="radio"]');
        return !!input && !input.disabled && !!wizOne('span.wp-mail-smtp-styled-radio', lab);
      },
      apply: function (el) {
        var lab = closestTo(el, WIZARD_STEP + 'label[for]');
        var input = lab.querySelector('input[type="radio"]');
        wizardRadioGroup(input);
        wizardRadioEffects(input);
      },
      state: function (el) {
        var lab = closestTo(el, WIZARD_STEP + 'label[for]');
        var input = lab && lab.querySelector('input[type="radio"]');
        return input ? { key: 'wizard.' + (input.name || 'radio'), value: input.value } : null;
      }
    },

    // ─ Setup Wizard: the SendLayer card ────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: SendlayerQuickConnectCard (offset 42227) — a click
    // anywhere on the card (its own `click: selectSendlayer`) picks SendLayer;
    // the card then carries wp-mail-smtp-sendlayer-card--selected, its styled
    // radio -checked, and `e.selected ? …` renders the actions block (the
    // Quick Connect button and "Takes about 2 mins"). Observed live,
    // #/step/choose_mailer, 2026-09-20: exactly that, and the list tile that
    // had the choice clears. The Quick Connect button inside it is a logged
    // miss (it leaves for SendLayer — the wizard-uncaptured-action entry).
    {
      label: 'wizard-sendlayer-card',
      event: 'click',
      match: function (el) {
        var card = closestTo(el, WIZARD_STEP + '.wp-mail-smtp-sendlayer-card');
        return !!card && !card.classList.contains('wp-mail-smtp-sendlayer-card--disabled')
          && !closestTo(el, '.wp-mail-smtp-sendlayer-card__btn');
      },
      apply: function () { wizardPickMailer('sendlayer'); },
      state: function () { return { key: 'wizard.mailer', value: 'sendlayer' }; }
    },

    // ─ Setup Wizard: a check row ───────────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: SettingsInputLongCheckbox (offset 58755) and
    // SettingsInputCheckbox (offset 73623). Each carries its own
    // <wrapper>-checked class while the box is on — settings-input-long-checkbox-checked
    // on the long row's label, settings-input-checkbox-checked on the small
    // one's div — and its span.checkbox carries checkbox-checked. Observed
    // live 2026-09-20 on #/step/plugin_features, #/step/configure_email_logs
    // and #/step/help_improve: a click flips exactly those two classes with
    // the box, and a disabled row does not move. On Plugin Features,
    // Detailed Email Logs also rules two rows (wizardFeatureRows).
    {
      label: 'wizard-checkbox',
      event: 'change',
      match: function (el) {
        return is(el, WIZARD_STEP + '.settings-input-long-checkbox input[type="checkbox"], '
          + WIZARD_STEP + '.settings-input-checkbox input[type="checkbox"]') && !el.disabled;
      },
      apply: function (el) { wizardCheckRow(el); },
      state: function (el) { return { key: 'wizard.feature.' + (el.name || ''), value: !!el.checked }; }
    },

    // ─ Setup Wizard: a switch that rules fields ────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: SettingsInputSwitch (offset 109949) is only a checkbox —
    // its ON / OFF look is the plugin's CSS on `input:checked + .toggle-switch`,
    // so most switches need nothing here (observed live 2026-09-20: Force
    // From Name / Email, Pro Plan Features and Auto TLS change the box and
    // nothing else). The ones a step watches hide or show fields with v-show,
    // an inline display (WIZARD_SWITCH_FIELDS): observed on
    // #/step/configure_mailer/smtp, Authentication off puts
    // style="display: none;" on the SMTP Username and SMTP Password blocks
    // and on again takes it off.
    {
      label: 'wizard-switch-fields',
      event: 'change',
      match: function (el) {
        return is(el, WIZARD_STEP + '.settings-input-switch input[type="checkbox"]')
          && Object.prototype.hasOwnProperty.call(WIZARD_SWITCH_FIELDS, el.id || '');
      },
      apply: function (el) {
        WIZARD_SWITCH_FIELDS[el.id].forEach(function (sel) {
          var node = wizOne(sel, closestTo(el, '.wp-mail-smtp-setup-wizard-step') || document);
          var block = node && closestTo(node, '.settings-input-text, .settings-input-switch, .settings-input-number, .settings-input-select');
          if (block) show(block, el.checked);
        });
      },
      state: function (el) { return { key: 'wizard.' + (el.name || ''), value: !!el.checked }; }
    },

    // ─ Setup Wizard: the One-Click Setup switch ────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: the Gmail and Outlook steps (offsets 211496 and 223804)
    // render two different halves by this switch. Observed live,
    // #/step/configure_mailer/gmail, 2026-09-20: turning it off renders the
    // custom-app fields (Client ID, Client Secret, the Authorized Redirect
    // URI with its Copy button) and the authorization block, and takes away
    // the connected-account block, the Remove OAuth Connection button and the
    // whole From Name / From Email group; turning it on is the reverse. A
    // capture holds one of the two halves, so the other one's markup is not
    // in the snapshot: this logs that miss and draws nothing. The switch's own
    // box still moves, as the plugin's does.
    {
      label: 'wizard-one-click-setup',
      event: 'change',
      match: function (el) { return is(el, WIZARD_STEP + '.settings-input-switch input[id="input-one_click_setup_enabled"]'); },
      apply: function (el) {
        R.miss('#input-one_click_setup_enabled', 'One-Click Setup ' + (el.checked ? 'on' : 'off')
          + ' renders the other half of this step (the custom-app fields and the authorization block, or the connected account and the From settings): that state is not captured');
      },
      state: function (el) { return { key: 'wizard.oneClickSetup', value: !!el.checked }; }
    },

    // ─ Setup Wizard: copy a field ──────────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: SettingsInputText's copyValue (offset 70753) selects the
    // input, runs document.execCommand('copy') and holds show_copied for
    // 1000 ms. Observed live, #/step/configure_mailer/zoho (the Redirect URI),
    // 2026-09-20: the button gains wp-mail-smtp-button-copied, its copy icon
    // loses `active` and its check icon gains it, and a second later all
    // three go back.
    {
      label: 'wizard-copy-field',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD_STEP + '.settings-input-text-with-copy button.wp-mail-smtp-button-small'); },
      apply: function (el) { wizardCopyField(closestTo(el, 'button.wp-mail-smtp-button-small')); }
    },

    // ─ Setup Wizard: an info tooltip ───────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/vue/js/wizard.min.js:1 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: SettingsInfoTooltip (offset 70540) is a v-tooltip span
    // with trigger "hover focus click" and autoHide false; the app registers
    // the library with its own template (offset 257346),
    // <div class="wp-mail-smtp-tooltip" role="tooltip"><div class="wp-mail-smtp-tooltip-arrow">
    // </div><div class="wp-mail-smtp-tooltip-inner"></div></div>. Observed
    // live, #/step/help_improve, 2026-09-20: the icon gains v-tooltip-open and
    // aria-describedby, and the tooltip is appended to <body> with the theme
    // class, x-placement="top", Popper's absolute placement and the arrow
    // centred on the icon. The one tooltip the captured wizard holds is the
    // Usage Tracking one; its text is the step's own text_usage_tracking_tooltip
    // (offset 74796), which is what the live tooltip showed. The id is a
    // counter here, where the plugin's is random. Of the library's three
    // triggers only the click is mirrored: a film drives clicks, and hover
    // and focus would each need their own entry for the same tooltip.
    {
      label: 'wizard-tooltip',
      event: 'click',
      match: function (el) { return !!closestTo(el, WIZARD_STEP + '.wp-mail-smtp-info'); },
      apply: function (el) { wizardTooltip(closestTo(el, '.wp-mail-smtp-info')); }
    },

    // ─ Setup Checklist: collapse or expand a block ─────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-setup-checklist.js:87 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: bound at :74, `$(document).on('click', app.headerSelector,
    // app.toggleBlock)`. toggleBlock takes the header's closest block
    // (blockSelector, :28) and does exactly two things (:87-98):
    //   const isCollapsed = $block.toggleClass('is-collapsed').hasClass('is-collapsed');
    //   $header.find(app.toggleSelector).attr('aria-expanded', isCollapsed ? 'false' : 'true');
    // No request and no save. The same handler serves the checklist's sections
    // and its promo cards, which is why both selectors are listed. A section
    // that is already complete is rendered collapsed by PHP, so the first
    // click on one opens it.
    //
    // The height is pure CSS (smtp-setup-checklist.min.css): the items track
    // goes `grid-template-rows: 1fr` → `0fr` and the inner goes
    // `visibility: visible` → `hidden`, each under a .2s transition. In a
    // captured page those two transitions never start — measured 2026-09-20 on
    // admin-setup-checklist: removing `is-collapsed` by hand, with no entry
    // involved, still computed `0px` / `hidden` a second later, and the same
    // section expanded to 721px the moment the transition was taken off. So
    // the class change is made with the transition suppressed for one frame
    // (checklistNoTransition), which is what SnapRuntime.motion = 'off' does
    // for the jQuery effects. The end DOM is the plugin's; only the easing is
    // lost, and it is lost in the capture, not here.
    {
      label: 'checklist-block-toggle',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '.wpms-setup-checklist-section__header, .wpms-setup-checklist-promo__header');
      },
      apply: function (el) {
        var header = closestTo(el, '.wpms-setup-checklist-section__header, .wpms-setup-checklist-promo__header');
        var block = header && closestTo(header, '.wpms-setup-checklist-section, .wpms-setup-checklist-promo');
        if (!block) return;
        var collapsed = checklistNoTransition(block, function () { return block.classList.toggle('is-collapsed'); });
        all('.wpms-setup-checklist-section__toggle, .wpms-setup-checklist-promo__toggle', header)
          .forEach(function (t) { t.setAttribute('aria-expanded', collapsed ? 'false' : 'true'); });
      },
      state: function (el) {
        var header = closestTo(el, '.wpms-setup-checklist-section__header, .wpms-setup-checklist-promo__header');
        var block = header && closestTo(header, '.wpms-setup-checklist-section, .wpms-setup-checklist-promo');
        return { key: 'checklist.collapsed', value: !!block && block.classList.contains('is-collapsed') };
      }
    },

    // ─ Setup Checklist: the buttons that write ─────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-setup-checklist.js:75 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin, all bound at :75-79 and all of them POST to admin-ajax and
    // then reload the page:
    //   .wpms-setup-checklist-dismiss           → confirmDismiss (:109), a
    //     jQuery-confirm dialog, then $.post (:144) — dismisses the checklist;
    //   [data-action="install-plugin"|"activate-plugin"], .js-wpms-plugin-install
    //                                           → installPlugin (:178),
    //     $.post (:196) then window.location.reload() (:209);
    //   [data-action="import-settings"]         → importSettings (:265),
    //     $.post (:278) then reload (:290);
    //   [data-action="usage-tracking-optin"]    → usageTrackingOptin (:302),
    //     $.post (:313) then reload (:324);
    //   [data-action="subscribe"]               → subscribeNewsletter (:336),
    //     $.post (:349) then reload (:361).
    // Every one of them installs, opts in, subscribes or saves, so none is
    // wired and none of their results is captured. Each click logs a declared
    // miss naming what the plugin would have done, the way Sugar Calendar's
    // Notify Attendees does — never a drawn result. Items that merely link to
    // another screen are plain <a href> and go through the nav map instead.
    {
      label: 'checklist-write-action',
      event: 'click',
      match: function (el) { return !!checklistWriteAction(el); },
      apply: function (el) {
        var hit = checklistWriteAction(el);
        if (hit && !hit.el.disabled) R.miss(hit.key, hit.why);
      }
    },

    // ─ Tools › Email Detective: every control sends ────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-email-detective.js:122 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin, bound at :122-128. The captured page is `data-phase="ready"`,
    // the state before anything runs, so only the start form is on screen; the
    // retry / resend / reset / cancel markup is in the page but hidden with the
    // later phases. Start submits #wpms-email-detective-start-form →
    // startTest (:318), which POSTs (:151) to run a deliverability test: that
    // SENDS a test email through the primary connection and asks an outside
    // service for a report. It is never wired, by the work order's hard stop.
    // The only handler that touches no network is onEmailInput (:306), which
    // clears an error message that a rest capture never shows — nothing to
    // mirror, so no entry for it.
    {
      label: 'detective-send-refused',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '#wpms-email-detective-start-form button, #wpms-email-detective-start-form input[type="submit"], '
          + '#wpms-email-detective-resend, #wpms-email-detective-retry, #wpms-email-detective-retry-send');
      },
      apply: function () {
        R.miss('admin.php?page=wp-mail-smtp-tools&tab=email-detective',
          'Email Detective sends a test email through the primary connection and asks an outside service for a deliverability report (smtp-email-detective.js:151): never run, and no result state is captured');
      }
    }

  ], { product: 'wp-mail-smtp', file: 'interactivity.js' });

  // ─── Setup Checklist helpers ────────────────────────────────────────────

  // Run `change` with the block's transitioned properties pinned, then give
  // them back. A captured page never starts the checklist's `.2s` transitions
  // on `grid-template-rows` and `visibility` (measured 2026-09-20), so without
  // this the class flips and the box stays exactly as it was. Deterministic:
  // no timer, no clock — one synchronous reflow between the two writes.
  // Promotion candidate for products/_runtime/core.js on a second use.
  var CHECKLIST_ANIMATED = '.wpms-setup-checklist-section__items, .wpms-setup-checklist-section__items-inner, '
    + '.wpms-setup-checklist-promo__items, .wpms-setup-checklist-promo__items-inner';
  function checklistNoTransition(block, change) {
    var nodes = all(CHECKLIST_ANIMATED, block);
    nodes.forEach(function (n) { n.style.transition = 'none'; });
    if (nodes.length) void nodes[0].offsetHeight;
    var out = change();
    if (nodes.length) void nodes[0].offsetHeight;
    nodes.forEach(function (n) { n.style.transition = ''; });
    return out;
  }

  // The checklist controls that write, in the order smtp-setup-checklist.js
  // binds them (:75-79): the selector, the key a miss is logged under, and
  // what the plugin would have done.
  var CHECKLIST_WRITES = [
    ['.wpms-setup-checklist-dismiss', 'wp_mail_smtp_setup_checklist_dismiss',
      'Dismiss opens the plugin\'s confirm dialog and then POSTs to hide the checklist for good (smtp-setup-checklist.js:109, :144): not wired, and the dismissed state is not captured'],
    ['.js-wpms-plugin-install, .wpms-setup-checklist-item__button[data-action="install-plugin"], .wpms-setup-checklist-item__button[data-action="activate-plugin"]',
      'wp_mail_smtp_setup_checklist_install_plugin',
      'this installs or activates a plugin and reloads the page (smtp-setup-checklist.js:178, :196, :209): never run on this site'],
    ['.wpms-setup-checklist-item__button[data-action="import-settings"]', 'wp_mail_smtp_setup_checklist_import_settings',
      'this imports another plugin\'s settings and reloads the page (smtp-setup-checklist.js:265, :278, :290): a save, so not wired'],
    ['.wpms-setup-checklist-item__button[data-action="usage-tracking-optin"]', 'wp_mail_smtp_setup_checklist_usage_tracking',
      'this opts the site into usage tracking and reloads the page (smtp-setup-checklist.js:302, :313, :324): a save, so not wired'],
    ['.wpms-setup-checklist-item__button[data-action="subscribe"]', 'wp_mail_smtp_setup_checklist_subscribe',
      'this subscribes the address to the newsletter and reloads the page (smtp-setup-checklist.js:336, :349, :361): an outside opt-in, so not wired']
  ];
  function checklistWriteAction(el) {
    for (var i = 0; i < CHECKLIST_WRITES.length; i++) {
      var hit = closestTo(el, CHECKLIST_WRITES[i][0]);
      if (hit) return { el: hit, key: CHECKLIST_WRITES[i][1], why: CHECKLIST_WRITES[i][2] };
    }
    return null;
  }

  // ─── Setup Wizard in-step helpers (WO-202J) ─────────────────────────────

  // The WO-202J block's own single-node lookup (the file's other helpers
  // return lists); never throws on a bad selector.
  function wizOne(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }

  // SettingsInputRadiosWithIcons.labelClass (offset 32047): the option's
  // label carries only the tokens its own state gives it, in this order.
  function wizardLabelClass(input, checked) {
    return (checked ? ' wp-mail-smtp-styled-radio-label-checked' : '')
      + (input.disabled ? ' wp-mail-smtp-styled-radio-label-disabled' : '')
      + (input.readOnly ? ' wp-mail-smtp-styled-radio-label-readonly' : '');
  }

  // One radio group: every label of the same input name in the step follows
  // the choice (observed live, 2026-09-20).
  function wizardRadioGroup(input) {
    var step = closestTo(input, '.wp-mail-smtp-setup-wizard-step') || document;
    all('label[for] input[type="radio"][name="' + (input.name || '') + '"]', step).forEach(function (other) {
      var lab = closestTo(other, 'label[for]');
      var on = other === input;
      if (lab) {
        lab.setAttribute('class', wizardLabelClass(other, on));
        var span = wizOne('span.wp-mail-smtp-styled-radio', lab);
        if (span) span.classList.toggle('wp-mail-smtp-styled-radio-checked', on);
      }
      other.checked = on;
    });
  }

  // What a step does with the choice, beyond the group's own classes.
  function wizardRadioEffects(input) {
    if (input.name === 'choose_mailer') { wizardPickMailer(input.value); return; }
    if (input.name !== 'encryption') return;
    // WizardStepConfigureMailerSmtp (offset 110808): the port follows the
    // encryption, and the Auto TLS switch is v-show'n only while it is not
    // TLS. Observed live, #/step/configure_mailer/smtp, 2026-09-20: SSL → 465,
    // TLS → 587 with the Auto TLS block style="display: none;", None → 25
    // with it back.
    var step = closestTo(input, '.wp-mail-smtp-setup-wizard-step') || document;
    var port = wizOne('#input-port', step);
    if (port) port.value = input.value === 'tls' ? '587' : input.value === 'ssl' ? '465' : '25';
    var autotls = wizOne('#input-autotls', step);
    var block = autotls && closestTo(autotls, '.settings-input-switch');
    if (block) show(block, input.value !== 'tls');
  }

  // The Choose Mailer step: the tile list and the SendLayer card both follow
  // the store's mailer, so one function sets both (observed live, 2026-09-20).
  function wizardPickMailer(value) {
    var step = wizOne(WIZARD + '.wp-mail-smtp-setup-wizard-step-choose-mailer') || wizOne(WIZARD + '.wp-mail-smtp-setup-wizard-step');
    if (!step) return;
    all('.wp-mail-smtp-input-radios-with-icons label[for]', step).forEach(function (lab) {
      var input = lab.querySelector('input[type="radio"]');
      if (!input) return;
      var on = input.value === value;
      lab.setAttribute('class', wizardLabelClass(input, on));
      var span = wizOne('span.wp-mail-smtp-styled-radio', lab);
      if (span) span.classList.toggle('wp-mail-smtp-styled-radio-checked', on);
      input.checked = on;
    });
    var card = wizOne('.wp-mail-smtp-sendlayer-card', step);
    if (!card) return;
    var picked = value === 'sendlayer';
    card.classList.toggle('wp-mail-smtp-sendlayer-card--selected', picked);
    var radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = picked;
    var mark = wizOne('span.wp-mail-smtp-styled-radio', card);
    if (mark) mark.classList.toggle('wp-mail-smtp-styled-radio-checked', picked);
    wizardCardActions(card, picked);
  }

  // The card's actions block is v-if'd on `selected` (offset 42227): it is
  // in the DOM only while SendLayer holds the choice. Taken out and put back
  // as the plugin renders it; a capture taken with another mailer chosen
  // never held it, so re-selecting SendLayer logs that miss instead.
  var WIZARD_CARD_ACTIONS = null;
  function wizardCardActions(card, on) {
    var actions = wizOne('.wp-mail-smtp-sendlayer-card__actions', card);
    if (!on) {
      if (!actions) return;
      WIZARD_CARD_ACTIONS = actions;
      card.removeChild(actions);
      return;
    }
    if (actions) return;
    if (!WIZARD_CARD_ACTIONS) {
      R.miss('#sendlayer-card-actions', 'the SendLayer card\'s Quick Connect block renders only while the card is selected (v-if, offset 42227); this capture was taken with another mailer chosen, so its markup is not in the snapshot');
      return;
    }
    card.appendChild(WIZARD_CARD_ACTIONS);
    WIZARD_CARD_ACTIONS = null;
  }

  // SettingsInputLongCheckbox (offset 58755) and SettingsInputCheckbox
  // (offset 73623): the wrapper's own -checked class and the span's, plus
  // the rows a step renders only while another box is on.
  function wizardCheckRow(input) {
    var wrap = closestTo(input, '.settings-input-long-checkbox, .settings-input-checkbox');
    if (!wrap) return;
    var base = wrap.classList.contains('settings-input-long-checkbox') ? 'settings-input-long-checkbox' : 'settings-input-checkbox';
    wrap.classList.toggle(base + '-checked', input.checked);
    var box = wizOne('span.checkbox', wrap);
    if (box) box.classList.toggle('checkbox-checked', input.checked);
    wizardFeatureRows(input);
  }

  // The switches a step watches, and the fields they rule (v-show, so an
  // inline display). Observed live 2026-09-20; a switch that is not here
  // changes nothing but its own box.
  var WIZARD_SWITCH_FIELDS = {
    // WizardStepConfigureMailerSmtp (offset 110808), #/step/configure_mailer/smtp.
    'input-auth': ['#input-user', '#input-pass']
  };

  // SettingsInputText.copyValue (offset 70753).
  function wizardCopyField(btn) {
    if (!btn || btn.__snapCopied) return;
    var wrap = closestTo(btn, '.settings-input-text');
    var input = wrap && wizOne('input', wrap);
    if (input) {
      try { input.select(); document.execCommand('copy'); } catch (_) { /* the browser refused the copy */ }
    }
    var icons = all('svg.icon', btn);
    btn.classList.add('wp-mail-smtp-button-copied');
    icons.forEach(function (i) { i.classList.toggle('active', i.classList.contains('copied')); });
    btn.__snapCopied = true;
    R.wait(1000, function () {
      btn.classList.remove('wp-mail-smtp-button-copied');
      icons.forEach(function (i) { i.classList.toggle('active', !i.classList.contains('copied')); });
      btn.__snapCopied = false;
    });
  }

  // The tooltips the captured wizard holds, by the step they sit in: the
  // text the live tooltip showed, which is the step's own localized string.
  var WIZARD_TOOLTIPS = {
    // #/step/help_improve — the Usage Tracking icon; text_usage_tracking_tooltip
    // (offset 74796), observed live 2026-09-20.
    'wp-mail-smtp-setup-wizard-step-help-improve': 'By allowing us to track usage data we can better help you because we know with which WordPress configurations, themes and plugins we should test.'
  };
  var WIZARD_TIP = { n: 0, open: null };

  // v-tooltip 2 with the app's template (offset 257346) and Popper's `top`
  // placement, as the live tooltip rendered it. A second click closes it,
  // the way the library toggles on a click trigger.
  function wizardTooltip(icon) {
    if (!icon) return;
    if (WIZARD_TIP.open && WIZARD_TIP.open.icon === icon) { wizardTooltipHide(); return; }
    if (WIZARD_TIP.open) wizardTooltipHide();
    var step = closestTo(icon, '.wp-mail-smtp-setup-wizard-step');
    var key = step && all('.wp-mail-smtp-setup-wizard-step', document).length
      ? (step.className.split(/\s+/).filter(function (c) { return Object.prototype.hasOwnProperty.call(WIZARD_TOOLTIPS, c); })[0] || null)
      : null;
    if (!key) {
      R.miss('#wizard-tooltip', 'this info icon\'s text was not seen live (its step holds no recorded tooltip)');
      return;
    }
    var id = 'tooltip_snap_' + (++WIZARD_TIP.n);
    var tip = document.createElement('div');
    tip.className = 'wp-mail-smtp-tooltip vue-tooltip-theme';
    tip.setAttribute('role', 'tooltip');
    tip.id = id;
    tip.setAttribute('aria-hidden', 'false');
    tip.setAttribute('x-placement', 'top');
    var arrow = document.createElement('div');
    arrow.className = 'wp-mail-smtp-tooltip-arrow';
    var inner = document.createElement('div');
    inner.className = 'wp-mail-smtp-tooltip-inner';
    inner.textContent = WIZARD_TOOLTIPS[key];
    tip.appendChild(arrow);
    tip.appendChild(inner);
    tip.setAttribute('style', 'position: absolute; will-change: transform; top: 0px; left: 0px;');
    document.body.appendChild(tip);
    // Popper, placement top: centred on the reference, kept inside the
    // viewport, the arrow following the reference's centre.
    var r = icon.getBoundingClientRect();
    var box = tip.getBoundingClientRect();
    var x = Math.round(Math.min(Math.max(r.left + r.width / 2 - box.width / 2, 0), Math.max(0, document.documentElement.clientWidth - box.width)));
    var y = Math.round(r.top - box.height);
    tip.setAttribute('style', 'position: absolute; will-change: transform; top: 0px; left: 0px; transform: translate3d('
      + (x + window.pageXOffset) + 'px, ' + (y + window.pageYOffset) + 'px, 0px);');
    arrow.setAttribute('style', 'left: ' + Math.round(Math.max(0, r.left + r.width / 2 - x - 5)) + 'px;');
    icon.classList.add('v-tooltip-open');
    icon.setAttribute('aria-describedby', id);
    WIZARD_TIP.open = { icon: icon, tip: tip };
  }

  function wizardTooltipHide() {
    var open = WIZARD_TIP.open;
    if (!open) return;
    WIZARD_TIP.open = null;
    open.icon.classList.remove('v-tooltip-open');
    open.icon.removeAttribute('aria-describedby');
    if (open.tip.parentNode) open.tip.parentNode.removeChild(open.tip);
  }

  // Plugin Features (offset 53240): on Pro the Complete Email Reports row
  // renders while `email_log || !is_pro` and the Weekly Email Summary row
  // while `is_pro && email_log`, so both go when Detailed Email Logs goes
  // off and come back with it (observed live, #/step/plugin_features,
  // 2026-09-20). A Lite capture renders both whatever the box does — there
  // the Detailed Email Logs row carries the Pro badge (show_pro: !is_pro),
  // which is how this tells the two apart.
  var WIZARD_FEATURE_ROWS = ['complete_email_report', 'summary_report_email'];
  var WIZARD_ROW_STASH = [];
  function wizardFeatureRows(input) {
    var list = closestTo(input, '.wp-mail-smtp-plugin-features-list');
    if (!list || input.name !== 'email_log') return;
    if (wizOne('.wp-mail-smtp-pro-badge', closestTo(input, '.settings-input-long-checkbox'))) return;   // Lite: both rows stay
    if (input.checked) {
      for (var i = WIZARD_ROW_STASH.length - 1; i >= 0; i--) {
        var s = WIZARD_ROW_STASH[i];
        if (s.list !== list) continue;
        s.list.insertBefore(s.node, s.next && s.next.parentNode === s.list ? s.next : null);
        WIZARD_ROW_STASH.splice(i, 1);
      }
      return;
    }
    WIZARD_FEATURE_ROWS.forEach(function (name) {
      var row = wizOne('label[for="wp-mail-smtp-settings-long-checkbox-' + name + '"]', list);
      if (!row) return;
      WIZARD_ROW_STASH.push({ list: list, node: row, next: row.nextElementSibling });
      list.removeChild(row);
    });
  }

  // ═══ The 4.10.0 Dashboard (WO-202K) ═════════════════════════════════════
  // The Dashboard page (src/Admin/Dashboard/Page.php:19, SLUG
  // 'wp-mail-smtp-dashboard') runs as ES modules the orchestrator imports at
  // runtime (assets/js/smtp-dashboard-page.js:197-207). A capture keeps no
  // plugin script, so on a snapshot NONE of those modules exist: both charts
  // are the frozen rasters capture leaves behind and the date-range control
  // does nothing. These entries put the page's own three module behaviours
  // back — the Emails Overview graph, the Email Sources donut, and the range
  // change — from the plugin's own configs and the payloads the capture
  // parked on <body>.
  //
  // The payload contract (capture-plans/p3-dashboard.json):
  //   data-wpms-dashboard-payloads        { "<Y-m-d - Y-m-d>": <a whole
  //                                         wp_mail_smtp_dashboard_get_stats
  //                                         answer: series, stat_cards_html,
  //                                         email_log_html, email_sources_html>,
  //                                         … } — base capture only
  //   data-wpms-dashboard-payload-ranges  the order they were fetched in, "|"-separated
  //   data-wpms-overview-series           the graph canvas's own data-series
  //   data-wpms-overview-series-meta      its data-series-meta
  //   data-wpms-sources-config            the donut widget's own data-config
  //   data-wpms-range                     the option value this capture sits on
  // The first two are read here; the rest are the fallback for a variant
  // capture, which parks its own range only. A canvas's attributes go with the
  // canvas when capture bakes it to an <img>, which is why the series is on
  // <body> — the widget roots keep theirs, so data-config is read from the
  // widget first, exactly as the plugin reads it.
  //
  // No request is made and none is mirrored: wp_mail_smtp_dashboard_get_stats
  // is answered from the parked payload, and pushDateUrlState
  // (assets/pro/js/smtp-pro-dashboard-updater.js:284-297) is deliberately NOT
  // mirrored — history.pushState is banned in film mode (DESIGN §9). Neither
  // is the spinner (setLoadingState, :270-275): end states only.

  var DASH_PAGE = 'wp-mail-smtp-dashboard';                                 // src/Admin/Dashboard/Page.php:19
  var DASH_ROOT = '#wpms-dashboard';                                        // smtp-dashboard-page.js:57
  var DASH_SELECT = '.wpms-dashboard-date-range__select';                   // smtp-pro-dashboard-date-range.js:38
  var DASH_INPUT = '.wpms-dashboard-date-range__input';                     // :39
  var DASH_HIDE = 'wp-mail-smtp-hide';                                      // smtp-dashboard-page.js:42
  var DASH_HOLDER = '.wpms-dashboard-widget__chart-holder';                 // templates/dashboard/widgets/emails-overview.php:47
  var DASH_GRAPH = '.wpms-dashboard-widget-emails-overview-chart';          // smtp-dashboard-widget-emails-overview.js:33
  var DASH_SOURCES = '.wpms-dashboard-email-sources';                       // smtp-dashboard-widget-email-sources.js:34
  var DASH_DONUT = '.wpms-dashboard-widget-email-sources-donut';            // :35
  var DASH_TOTAL = '.wpms-dashboard-widget-email-sources-chart-total';      // :36
  // The plugin's own Chart.js build. Only the library itself: the Dashboard
  // charts plot a category axis off server-formatted labels, so unlike Email
  // Reports they need no moment adapter (emails-overview.js:11-12).
  var DASH_CHART = { lib: ['../_shared/lib/chart.min.js'], global: 'WPMailSMTPChart' };
  // What a range change does by default. 'swap' patches this page the way the
  // plugin's own answer does — the three re-rendered widgets and the graph, on
  // one live surface, which is what a film wants (anti-pattern #5). 'goto'
  // opens that range's own snapshot instead, the way a fresh ?date= load does.
  // Whichever is first, the other is the fallback: a capture that parks no
  // payload (every --range-* variant) navigates on its own.
  var DASH_RANGE_MODE = 'swap';

  R.register([

    // ─ Dashboard: the Emails Overview graph, live ──────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-dashboard-widget-emails-overview.js:61 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: init() (:61-69) draws the canvas the widget rendered from
    // its own data-series, and draw() (:211-278) is the whole config — one
    // filled line per entry in data-series-meta, a category x axis thinned to
    // about seven labels by tickCallback (:172-183), grid and tick colours
    // read from the page's design tokens (:196-200), the legend off because
    // the widget head renders it server-side, and a tooltip whose title is the
    // row's own `tooltip` string (:272). Here: the same config on the same
    // holder, from the parked series and meta, through SnapCharts — which
    // forces animation off (charts.js, DESIGN §9), so hover gives the plugin's
    // own tooltip on a chart that renders identically on every run.
    {
      label: 'dashboard-overview-chart-live',
      event: READY,
      match: function (el) { return el === document.body && !!dashHolder(); },
      apply: function () { dashGraphDraw(dashRows()); }
    },

    // ─ Dashboard: the Email Sources donut, live ────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-dashboard-widget-email-sources.js:64 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: draw() (:64-104) reads the widget root's data-config
    // (readConfig, :115-127), builds a doughnut cut out to 50% — one segment
    // per source, coloured from the config's own palette by index, separated
    // by a 2px border in the container's grey while there is more than one —
    // and writes the centre total with Intl.NumberFormat (:103). The caption
    // under it is the template's (email-sources.php:99-101) and is left alone.
    // The config is read from the widget, as the plugin reads it; the parked
    // copy is the fallback for a capture whose widget lost it.
    {
      label: 'dashboard-sources-donut-live',
      event: READY,
      match: function (el) { return el === document.body && !!dashOne(DASH_SOURCES); },
      apply: function () { dashDonutDraw(); }
    },

    // ─ Dashboard: the date-range control ───────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-dashboard-date-range.js:74 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: onSelectChange (:74-88). 'custom' un-hides the range field,
    // creates flatpickr on it and focuses it — and fetches nothing until two
    // dates are picked. Any other value hides the field again and fetches that
    // preset's range. Here: the same two branches. Live this page DOES open a
    // real calendar (observed 2026-09-20: `flatpickr` is a function there and
    // one calendar opens, with no request) — but createFlatpickr (:135-153)
    // returns early while `flatpickr` is undefined, and a snapshot loads no
    // plugin script, so not creating a picker IS the plugin's own behaviour
    // here; the captured custom range is named in the console instead, for a
    // film to set on the field (the entry below). The preset's range string is
    // not computed — presetRange (:100-110) reads the clock, which DESIGN §9
    // bans — it is looked up in what this site actually captured.
    {
      label: 'dashboard-range-preset',
      event: 'change',
      match: function (el) { return is(el, DASH_SELECT); },
      apply: function (el) {
        var field = dashOne(DASH_INPUT);
        if (el.value === 'custom') {
          if (field) {
            field.classList.remove(DASH_HIDE);
            try { field.focus(); } catch (_) {}
          }
          dashCustomHint();
          return;
        }
        if (field) field.classList.add(DASH_HIDE);
        dashApplyRange(dashRangeFor(el.value), el.value);
      },
      state: function (el) { return { key: 'dashboard.range', value: el.value }; }
    },

    // ─ Dashboard: a custom range on the field ──────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/pro/js/smtp-pro-dashboard-date-range.js:147 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: flatpickr's onClose (:147-151) — two dates picked, the
    // field now holds "Y-m-d - Y-m-d", and fetchStats() runs on it. flatpickr
    // writes the value and fires `change`, so `change` on the field is that
    // moment. A hand-typed range reaches it the same way; a value that is not
    // a range is a logged miss, never a guess.
    {
      label: 'dashboard-range-custom',
      event: 'change',
      match: function (el) { return is(el, DASH_INPUT); },
      apply: function (el) {
        var range = String(el.value || '').trim();
        dashApplyRange(dashBounds(range) ? range : null, range || 'custom');
      },
      state: function (el) { return { key: 'dashboard.range', value: String(el.value || '').trim() }; }
    },

    // ─ Quick Links flyout ──────────────────────────────────────────────────
    // @since 2026-09-20 @source wp-mail-smtp-pro/assets/js/smtp-admin.js:1628 @verified 2026-09-20 @product wp-mail-smtp
    // Real plugin: initFlyoutMenu (:1614-1663) — a click on the head toggles
    // `opened` on #wp-mail-smtp-flyout, and nothing else; the CSS does the
    // rest. The out-of-the-way `out` class is a scroll handler's and is left
    // alone. Page chrome, not a Dashboard control: this is the one thing on
    // the Dashboard a viewer can work that writes nothing, and it is on every
    // WP Mail SMTP admin screen, so every captured screen gets it.
    {
      label: 'flyout-quick-links',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#wp-mail-smtp-flyout .wp-mail-smtp-flyout-head'); },
      apply: function (el) {
        var menu = closestTo(el, '#wp-mail-smtp-flyout');
        if (menu) menu.classList.toggle('opened');
      }
    }

  ], { product: 'wp-mail-smtp', file: 'interactivity.js' });

  // ─── Dashboard helpers ──────────────────────────────────────────────────
  // Everything below is scoped to the Dashboard page root the orchestrator
  // caches (smtp-dashboard-page.js:88-94): $page for the stat cards, $main for
  // the two widgets. One root here — the page has one of each.
  function dashRoot() { return document.querySelector(DASH_ROOT); }
  function dashOne(sel) {
    var root = dashRoot();
    return root ? root.querySelector(sel) : null;
  }
  function dashHolder() { return dashOne(DASH_HOLDER); }

  // A JSON attribute on an element, or null. The plugin's own readSeries /
  // readSeriesMeta / readConfig all normalize a broken payload rather than
  // throw (emails-overview.js:82-115, email-sources.js:115-127).
  function dashJson(el, name) {
    var raw = el && el.getAttribute ? el.getAttribute(name) : null;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (err) {
      console.error('[snap] ' + name + ' is not JSON', err);
      return null;
    }
  }

  // The graph's rows: the canvas's own data-series when it still has one (the
  // swap re-renders no canvas, but a capture that kept it would), else the
  // parked copy.
  function dashRows() {
    return dashJson(dashOne(DASH_GRAPH), 'data-series') || parked('data-wpms-overview-series');
  }
  function dashMeta() {
    return dashJson(dashOne(DASH_GRAPH), 'data-series-meta') || parked('data-wpms-overview-series-meta');
  }

  // fadeColor (emails-overview.js:127-134).
  function dashFade(hex) {
    var v = String(hex || '').replace('#', '');
    return 'rgba(' + parseInt(v.substring(0, 2), 16) + ', ' + parseInt(v.substring(2, 4), 16)
      + ', ' + parseInt(v.substring(4, 6), 16) + ', 0.12)';
  }

  // token (emails-overview.js:196-200): a design token's value, for the colours
  // Chart.js paints onto the canvas and CSS cannot reach.
  function dashToken(name, fallback) {
    var value = '';
    try { value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    catch (_) { value = ''; }
    return value || fallback;
  }

  // draw() (emails-overview.js:211-278), word for word, with buildDatasets
  // (:147-160) and tickCallback (:172-183).
  function dashGraphSettings(rows, meta) {
    var grid = dashToken('--wpms-color-surface-divider', '#dcdcde');
    var tick = dashToken('--wpms-text-secondary', '#50575e');
    var font = { size: 13 };
    var gap = Math.floor(rows.length / 7);                                  // maxTicks 7 (:54)
    return {
      type: 'line',
      data: {
        labels: rows.map(function (row) { return row.label; }),
        datasets: meta.map(function (series) {
          return {
            label: series.label,
            data: rows.map(function (row) { return row[series.id] == null ? 0 : row[series.id]; }),
            borderColor: series.color,
            backgroundColor: series.fill ? dashFade(series.color) : 'transparent',
            fill: !!series.fill,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: series.color
          };
        })
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: true, color: grid },
            ticks: {
              maxRotation: 25,
              minRotation: 25,
              autoSkip: false,
              color: tick,
              font: font,
              // Counted from the end, so the latest point keeps its label.
              callback: function (value, index) {
                if (gap < 1 || (rows.length - index - 1) % gap === 0) {
                  return rows[index] ? rows[index].label : '';
                }
                return '';
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: grid },
            ticks: { precision: 0, color: tick, font: font },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: true,
            position: 'nearest',
            callbacks: {
              title: function (items) {
                var row = rows[items[0].dataIndex];
                return (row && row.tooltip) || items[0].label;
              }
            }
          }
        }
      }
    };
  }

  // draw(canvas, rows) (emails-overview.js:211-278). The plugin destroys and
  // rebuilds; SnapCharts redraws the same canvas in place, which is the same
  // end state. A missing series or meta draws nothing and logs a miss — the
  // plugin returns on empty meta (:214-216).
  function dashGraphDraw(rows) {
    var host = dashHolder();
    var meta = dashMeta();
    if (!host) return null;
    if (!Array.isArray(rows) || !rows.length || !Array.isArray(meta) || !meta.length) {
      console.info('[snap] no parked Emails Overview series — nothing drawn');
      return null;
    }
    return R.chart(host, function () { return dashGraphSettings(rows, meta); }, DASH_CHART);
  }

  // charts.js knows two hosts: the canvas it made (data-snap-chart) and the
  // frozen <img data-from-canvas> capture left. A widget the swap re-rendered
  // carries the server's own empty <canvas>, which is neither, so it is
  // marked here. Promotion candidate for charts.js on a second use.
  function dashMarkLive(host, sel) {
    var c = host && host.querySelector ? host.querySelector(sel) : null;
    if (c && c.tagName === 'CANVAS' && !c.hasAttribute('data-snap-chart')) c.setAttribute('data-snap-chart', '');
  }

  // draw() (email-sources.js:64-104), with readConfig (:115-127) reading the
  // widget root first, as the plugin does, then the parked copy.
  function dashDonutDraw() {
    var root = dashOne(DASH_SOURCES);
    if (!root) return null;
    var cfg = dashJson(root, 'data-config') || parked('data-wpms-sources-config');
    if (!cfg || !Array.isArray(cfg.all) || !cfg.all.length || !Array.isArray(cfg.palette)) {
      console.info('[snap] no Email Sources config — nothing drawn');
      return null;
    }
    var host = root.querySelector('.wpms-dashboard-widget-email-sources-chart-canvas');
    if (!host) return null;
    dashMarkLive(host, DASH_DONUT);
    var chart = R.chart(host, function () {
      return {
        type: 'doughnut',
        data: {
          labels: cfg.all.map(function (s) { return s.name; }),
          datasets: [{
            data: cfg.all.map(function (s) { return s.total; }),
            backgroundColor: cfg.all.map(function (s, i) { return cfg.palette[i % cfg.palette.length]; }),
            borderColor: '#f6f6f6',
            borderWidth: cfg.all.length > 1 ? 2 : 0
          }]
        },
        options: {
          cutout: '50%',
          animation: false,
          maintainAspectRatio: false,
          responsive: true,
          plugins: { legend: { display: false } }
        }
      };
    }, DASH_CHART);
    all(DASH_TOTAL, root).forEach(function (n) {
      n.textContent = new Intl.NumberFormat().format(cfg.donutTotal);
    });
    return chart;
  }

  // ─── the range change ───────────────────────────────────────────────────
  // "Y-m-d - Y-m-d" → [from, to] (the shape Ajax::get_requested_date_range()
  // accepts, src/Pro/Admin/Dashboard/Ajax.php:72-94), else null.
  function dashBounds(range) {
    var m = /^(\d{4}-\d{2}-\d{2}) - (\d{4}-\d{2}-\d{2})$/.exec(String(range == null ? '' : range).trim());
    return m ? [m[1], m[2]] : null;
  }
  // Whole days from..to inclusive — the count presetRange() builds a range for
  // (smtp-pro-dashboard-date-range.js:100-110). Date.UTC is a pure conversion
  // of three numbers; it reads no clock (DESIGN §9).
  function dashDays(from, to) {
    function day(d) { var p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
    return Math.round((day(to) - day(from)) / 86400000) + 1;
  }

  // Every range string this site actually holds: the parked payload keys, plus
  // every Dashboard key in the nav map. Never a hard-coded slug or date.
  function dashKnownRanges() {
    var seen = {};
    var out = [];
    function add(r) { if (r && !own(seen, r)) { seen[r] = 1; out.push(r); } }
    var pay = parked('data-wpms-dashboard-payloads');
    if (pay && typeof pay === 'object') Object.keys(pay).forEach(add);
    var m = R.navMap();
    if (m) {
      for (var k in m.k) {
        if (!own(m.k, k)) continue;
        var q = k.indexOf('?');
        if (q === -1) continue;
        var params;
        try { params = new URLSearchParams(k.slice(q + 1)); } catch (_) { continue; }
        if (params.get('page') === DASH_PAGE) add(params.get('date'));
      }
    }
    return out;
  }

  // The range string the plugin would post for an option value, taken from
  // what this site captured. Every preset ends yesterday (presetRange(),
  // :100-110; Stats::get_preset_range(), src/Pro/Admin/Dashboard/Stats.php:364-370),
  // so the presets share the latest `to` and are told apart by their span;
  // the custom range is the one that does not end there. A tie, or nothing
  // matching, gives null and the caller logs a miss — a new preset the site
  // has no capture for cannot be guessed at.
  function dashRangeFor(value) {
    var rows = [];
    dashKnownRanges().forEach(function (range) {
      var b = dashBounds(range);
      if (b) rows.push({ range: range, to: b[1], days: dashDays(b[0], b[1]) });
    });
    if (!rows.length) return null;
    var latest = rows[0].to;
    rows.forEach(function (r) { if (r.to > latest) latest = r.to; });               // Y-m-d sorts as text
    var days = Number(value);
    var hits = rows.filter(value === 'custom'
      ? function (r) { return r.to !== latest; }
      : function (r) { return r.to === latest && r.days === days; });
    return hits.length === 1 ? hits[0].range : null;
  }

  // What the three range-scoped widgets do with an answer:
  // stat cards (smtp-dashboard-widget-stat-cards.js:38-48), Email Log
  // (…-email-log.js:51-61) and Email Sources (…-email-sources.js:137-151) each
  // replaceWith() their own re-rendered markup, the last one redrawing its
  // donut; the date-range module redraws the graph on the fresh series
  // (smtp-pro-dashboard-date-range.js:163-173). The three keys are the AJAX
  // answer's own (src/Pro/Admin/Dashboard/Ajax.php:143-150). A payload the
  // capture does not hold gives false, and the caller navigates instead.
  function dashSwap(range) {
    var pay = parked('data-wpms-dashboard-payloads');
    var data = pay && own(pay, range) ? pay[range] : null;
    if (!data) return false;
    dashReplace('[data-widget="stat_cards"]', data.stat_cards_html);
    dashReplace('[data-widget="email_log"]', data.email_log_html);
    if (dashReplace('[data-widget="email_sources"]', data.email_sources_html)) dashDonutDraw();
    dashGraphDraw(data.series);
    return true;
  }

  // jQuery .replaceWith(html) on the first match inside the page root.
  function dashReplace(sel, html) {
    var node = dashOne(sel);
    if (!node || !node.parentNode || typeof html !== 'string' || !html) return false;
    var box = document.createElement('div');
    box.innerHTML = html;
    var kids = Array.prototype.slice.call(box.childNodes);
    if (!kids.length) return false;
    var parent = node.parentNode;
    var next = node.nextSibling;
    parent.removeChild(node);
    kids.forEach(function (kid) { parent.insertBefore(kid, next); });
    return true;
  }

  // fetchStats(date) (smtp-pro-dashboard-updater.js:93-142) without the
  // request: the parked answer applied in place, or that range's own capture
  // opened through the nav map. DASH_RANGE_MODE picks which is tried first;
  // the other is the fallback, so a variant capture (no payload) navigates and
  // the base capture stays on one live surface.
  function dashApplyRange(range, value) {
    var href = 'admin.php?page=' + DASH_PAGE + (range ? '&date=' + range : '');
    if (!range) {
      R.miss(href, 'no captured date range for the "' + value + '" option — live the plugin POSTs wp_mail_smtp_dashboard_get_stats for it');
      return;
    }
    var order = DASH_RANGE_MODE === 'goto' ? ['goto', 'swap'] : ['swap', 'goto'];
    for (var i = 0; i < order.length; i++) {
      if (order[i] === 'swap' && dashSwap(range)) return;
      if (order[i] === 'goto') {
        // goto() no-ops on the slug already open, which is what picking the
        // range this capture already shows should do — not a miss.
        var slug = R.resolveHref(href);
        if (slug) { R.goto(slug); return; }
      }
    }
    R.miss(href, 'the ' + range + ' range has no parked payload and no captured snapshot of its own');
  }

  // Choosing Custom Date Range opens flatpickr live; here the plugin's own
  // guard (createFlatpickr, :135-153) returns early because no plugin script
  // loaded, so the field is revealed and the captured range is named for a
  // film to set on it — the console only, never a fragment of UI.
  function dashCustomHint() {
    var range = dashRangeFor('custom');
    console.info(range
      ? '[snap] custom range captured: "' + range + '" — set it on ' + DASH_INPUT + ' and fire change'
      : '[snap] no custom date range is captured');
  }
}());
