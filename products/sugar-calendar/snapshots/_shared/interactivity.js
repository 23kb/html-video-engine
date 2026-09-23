/**
 * Sugar Calendar snapshot transitions.
 *
 * Third of the three script tags tools/link-interactivity-script.js injects:
 *   ../../../_runtime/core.js  →  ../_shared/nav.js  →  this file.
 * core.js defines window.SnapRuntime during parse, so it is here by the time
 * this IIFE runs. Nothing in here may reference the WPForms runtime.
 *
 * Entries keep the proven shape { label, event, match(el, e), apply(el, e) } and
 * each block opens with a provenance banner that tools/field-state.js parses —
 * the banner line, then one @-line, exactly like this:
 *
 *   // ─ Event editor sections ──────────────────────────────────────────────
 *   // @since 2026-09-19 @source sugar-calendar/assets/js/admin-event-metabox.js:101 @verified 2026-09-19 @product sugar-calendar
 *
 * @source must be one whitespace-free token and every entry needs @product.
 * `@source synthetic` is banned: no fragment of UI without a real cite
 * (anti-pattern #6 / INV-15).
 *
 * WO-202SC. Every entry mirrors what the plugin's own JS does — the class,
 * style or attribute it changes, nothing invented — and is checked against the
 * live plugin by tools/behavior-parity.js (products/sugar-calendar/qc/parity.json).
 * Plugin source: sugar-calendar 3.14.0 (Pro), sc-rsvp, sc-event-ticketing 1.7.0,
 * the vendored tippy.js 6 / Choices.js 11.1.0, and WordPress core's color picker.
 * Navigation (tabs, view modes, prev / next, sibling screens) is not here: core
 * resolves every link through the generated nav map and the rules in
 * products/sugar-calendar/nav-rules.json. What is NOT wired, and why, is listed
 * in docs/plans/product-neutral/reports/WO-202SC-report.md.
 *
 * Toggle labels (ON / OFF, YES / NO) are pure CSS (src/Admin/UI.php
 * toggle_control): no entry touches them. They work once a snapshot is captured
 * with the marked bake and un-baked (tools/unbake-display.js).
 *
 * Dismiss entries listen to `mousedown`, the way tippy and this runtime both
 * need: core swallows a matched `click` on a link, and a click outside a
 * popover must still follow the link it landed on.
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // The Event Details metabox the editor handlers are bound in
  // (assets/js/admin-event-metabox.js:20, assets/pro/admin/js/event-edit.js:23).
  var BOX = '.sugar-calendar-event-details-metabox';

  function closestTo(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function is(el, sel) { try { return !!el && !!el.matches && el.matches(sel); } catch (_) { return false; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function show(nodes, on) { R.toggleTarget(nodes, on, { mode: 'display' }); }         // jQuery .show() / .hide() / .toggle(bool)
  function klass(nodes, cls, on) { R.toggleTarget(nodes, on, { mode: 'class', cls: cls }); }   // on = shown = cls removed
  function shown(el) { return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }

  // Animated reveals are core's jQuery effects (WO-202H): R.fadeToggle,
  // R.fadeIn, R.slideUp / R.slideDown, R.show / R.hide with a duration, each
  // with the plugin's own duration and jQuery's swing easing. A library that
  // animates with its own CSS transition (tippy, Bootstrap's modal) keeps it;
  // its timers go through R.wait, so SnapRuntime.motion = 'off' ends them at
  // once.

  // ─── Choices.js 11.1.0 (vendored as sugar-calendar/assets/lib/choices.min.js)
  // The markup is already in every capture: Choices built it before the page
  // froze. showDropdown / hideDropdown / containerOuter.open / close only flip
  // classes and aria attributes; this is exactly that. Selecting a choice is
  // not mirrored (a new item node would have to be rendered).
  function choicesOpen(c) {
    var dd = one('.choices__list--dropdown', c);
    if (!dd) return;
    dd.classList.add('is-active');
    dd.setAttribute('aria-expanded', 'true');
    R.clearBaked(dd);
    c.classList.add('is-open');
    c.setAttribute('aria-expanded', 'true');
    // containerOuter.shouldFlip, position 'auto': room above, and the window is
    // shorter than the dropdown's bottom.
    var r = dd.getBoundingClientRect();
    if (c.getBoundingClientRect().top - r.height >= 0 && !window.matchMedia('(min-height: ' + (r.bottom + 1) + 'px)').matches) {
      c.classList.add('is-flipped');
    }
    c.classList.add('is-focused');
    var input = one('input.choices__input--cloned', c);
    try { (input || c).focus(); } catch (_) { /* detached */ }
  }
  function choicesClose(c, keepFocus) {
    var dd = one('.choices__list--dropdown', c);
    if (dd) {
      dd.classList.remove('is-active');
      dd.setAttribute('aria-expanded', 'false');
    }
    c.classList.remove('is-open');
    c.setAttribute('aria-expanded', 'false');
    c.removeAttribute('aria-activedescendant');
    c.classList.remove('is-flipped');
    if (!keepFocus) c.classList.remove('is-focused');
    var input = one('input.choices__input--cloned', c);
    if (input && document.activeElement === input) { try { input.blur(); } catch (_) { /* detached */ } }
  }

  // ─── tippy.js 6 event popover (vendored sugar-calendar/assets/lib/tippy)
  // Markup, attributes and inline styles exactly as tippy renders them — the
  // open state is captured in admin-events--month-popover:
  // SOURCE: products/sugar-calendar/snapshots/admin-events--month-popover (div[data-tippy-root] > .tippy-box > .tippy-content + .tippy-arrow)
  // Content: the event's own <template id="sugar-calendar-tooltip-N"> printed
  // by src/Admin/Pages/Events.php:481-497. No template, no popover.
  var TIPPY = { open: null };
  var TIPPY_TRIGGER = '.sugar-calendar-event-entry-wrap--multi-hour, a.sugar-calendar-event-entry, .sugar-calendar-event-entry span';

  // The instance's reference span and its trigger (admin-events.js:215-222).
  function tippyParts(el) {
    var wrap = closestTo(el, '.sugar-calendar-event-entry-wrap--multi-hour');
    var span = null;
    if (wrap) span = one('.sugar-calendar-event-entry span', wrap);
    if (!span) {
      var a = closestTo(el, '.sugar-calendar-event-entry');
      span = a ? one('span', a) : null;
      if (!span && is(el, '.sugar-calendar-event-entry span')) span = el;
    }
    if (!span) return null;
    var trigger = closestTo(span, '.sugar-calendar-event-entry-wrap--multi-hour')
      || (span.parentElement && span.parentElement.localName === 'a' ? span.parentElement : span);
    return { span: span, trigger: trigger };
  }

  // Popper's placement as tippy 6 configures it: placement top, offset
  // [0, 12], flip (padding 5) to bottom when top does not fit the viewport,
  // preventOverflow (padding 5 left / right), arrow padding 3; absolute, with
  // `inset` anchored on the side Popper uses and a translate() transform.
  function tippyPlace(root, span) {
    var box = root.firstChild;
    var arrow = one('.tippy-arrow', root);
    var ref = span.getBoundingClientRect();
    var pop = box.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var topOverflow = 5 - (ref.top - 12 - pop.height);
    var bottomOverflow = (ref.bottom + 12 + pop.height) - (vh - 5);
    // Popper's flip: the first of [top, bottom] that fits; neither → top.
    var placement = topOverflow <= 0 ? 'top' : bottomOverflow <= 0 ? 'bottom' : 'top';
    var x = ref.left + ref.width / 2 - pop.width / 2;
    x = Math.min(Math.max(x, 5), vw - 5 - pop.width);
    var docX = Math.round(x + window.pageXOffset);
    var ax = ref.left + ref.width / 2 - x - 8;           // .tippy-arrow is 16px wide
    ax = Math.round(Math.min(Math.max(ax, 3), pop.width - 16 - 3));
    var icbH = document.documentElement.clientHeight;
    if (placement === 'top') {
      var bottomEdge = ref.top + window.pageYOffset - 12;
      root.style.inset = 'auto auto 0px 0px';
      root.style.transform = 'translate(' + docX + 'px, ' + Math.round(bottomEdge - icbH) + 'px)';
    } else {
      root.style.inset = '0px auto auto 0px';
      root.style.transform = 'translate(' + docX + 'px, ' + Math.round(ref.bottom + window.pageYOffset + 12) + 'px)';
    }
    box.setAttribute('data-placement', placement);
    if (arrow) arrow.setAttribute('style', 'position: absolute; left: 0px; transform: translate(' + ax + 'px, 0px);');
  }

  // A snapshot captured with a popover open (admin-events--month-popover)
  // already holds tippy's root; its trigger is the entry whose aria-expanded
  // tippy set to "true". Adopt it, so a press outside or a second click on
  // the trigger hides it the way tippy would.
  function tippyOpen() {
    if (TIPPY.open) return TIPPY.open;
    var root = one('body > [data-tippy-root]');
    if (!root || !root.firstChild) return null;
    var trigger = one('.sugar-calendar-event-entry-wrap--multi-hour[aria-expanded="true"], .sugar-calendar-event-entry[aria-expanded="true"]');
    var span = trigger ? one('.sugar-calendar-event-entry span', trigger) || one('span', trigger) : null;
    TIPPY.open = { root: root, trigger: trigger, span: span };
    return TIPPY.open;
  }

  function tippyHide() {
    var open = tippyOpen();
    if (!open) return;
    TIPPY.open = null;
    if (open.trigger) open.trigger.setAttribute('aria-expanded', 'false');
    var box = open.root.firstChild;
    box.setAttribute('data-state', 'hidden');
    var content = one('.tippy-content', box);
    if (content) content.setAttribute('data-state', 'hidden');
    box.style.transitionDuration = '250ms';
    if (content) content.style.transitionDuration = '250ms';
    var root = open.root;
    R.wait(250, function () { if (root.parentNode) root.parentNode.removeChild(root); });
  }

  function tippyShow(parts) {
    var id = parts.span.parentElement ? parts.span.parentElement.getAttribute('data-id') : null;
    var tpl = id ? document.getElementById('sugar-calendar-tooltip-' + id) : null;
    if (!tpl) return false;
    var n = all('.sugar-calendar-event-entry span').indexOf(parts.span) + 1;
    var root = document.createElement('div');
    root.setAttribute('data-tippy-root', '');
    root.id = 'tippy-' + n;
    root.setAttribute('style', 'z-index: 9999; visibility: visible; position: absolute; inset: auto auto 0px 0px; margin: 0px;');
    var box = document.createElement('div');
    box.className = 'tippy-box';
    box.setAttribute('data-state', 'hidden');
    box.setAttribute('tabindex', '-1');
    box.setAttribute('data-animation', 'fade');
    box.setAttribute('role', 'tooltip');
    box.setAttribute('data-placement', 'top');
    box.setAttribute('style', 'max-width: 350px; transition-duration: 300ms;');
    var content = document.createElement('div');
    content.className = 'tippy-content';
    content.setAttribute('data-state', 'hidden');
    content.setAttribute('style', 'transition-duration: 300ms;');
    content.innerHTML = tpl.innerHTML;
    var arrow = document.createElement('div');
    arrow.className = 'tippy-arrow';
    box.appendChild(content);
    box.appendChild(arrow);
    root.appendChild(box);
    document.body.appendChild(root);
    tippyPlace(root, parts.span);
    parts.trigger.setAttribute('aria-expanded', 'true');
    TIPPY.open = { root: root, trigger: parts.trigger, span: parts.span };
    var visible = function () {                    // hidden -> visible runs the fade
      if (TIPPY.open && TIPPY.open.root === root) {
        box.setAttribute('data-state', 'visible');
        content.setAttribute('data-state', 'visible');
      }
    };
    if (R.motion === 'off') visible(); else setTimeout(visible, 0);
    return true;
  }

  R.register([

    // ════ Admin — Event editor ═════════════════════════════════════════════

    // ─ Event editor sections ───────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-event-metabox.js:101 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :81): every .sugar-calendar-metabox__navigation__button
    // and every .sugar-calendar-metabox__section lose `selected`; the clicked
    // button and the section with the same data-id gain it. It also rewrites the
    // Help link's hash from localized data (help_url) — not captured, not done.
    {
      label: 'metabox-section-tabs',
      event: 'click',
      match: function (el) { return !!closestTo(el, BOX + ' .sugar-calendar-metabox__navigation__button'); },
      apply: function (el) {
        var btn = closestTo(el, BOX + ' .sugar-calendar-metabox__navigation__button');
        var id = btn.getAttribute('data-id');
        R.selectOne(BOX, '.sugar-calendar-metabox__navigation__button', btn, 'selected');
        var pane = one(BOX + ' .sugar-calendar-metabox__section[data-id="' + id + '"]');
        if (pane) R.selectOne(BOX, '.sugar-calendar-metabox__section', pane, 'selected');
        else all(BOX + ' .sugar-calendar-metabox__section').forEach(function (s) { s.classList.remove('selected'); });
      },
      state: function (el) {
        var btn = closestTo(el, BOX + ' .sugar-calendar-metabox__navigation__button');
        return { key: 'editor.section', value: btn ? btn.getAttribute('data-id') : null };
      }
    },

    // ─ All Day hides the times ─────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-event-metabox.js:779 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :82): checked → .hide() the time-zone row, every
    // .event-time-zone and every .event-time; unchecked → .show() them.
    {
      label: 'all-day-times',
      event: 'change',
      match: function (el) { return el.id === 'all_day' && !!closestTo(el, BOX); },
      apply: function (el) {
        show(all(BOX + ' .sugar-calendar-metabox__field-row--time-zone, ' + BOX + ' .event-time-zone, ' + BOX + ' .event-time'), !el.checked);
      },
      state: function (el) { return { key: 'event.allDay', value: !!el.checked }; }
    },

    // ─ Recurrence type → its rows ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/event-edit.js:559 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :537, onRecurrenceChange :544): setOn (:559) —
    // every field row with `type` .hide(), the `.repeat-<value>` rows .fadeIn()
    // (:568 — jQuery's default 400 ms, swing; a row already shown stays as it
    // is), "Sell per occurrence" .hide() for Never and .show() otherwise; setDisabled
    // (:591) — every `.type` checkbox disabled, the `.repeat-advanced` inputs
    // disabled for Never and enabled otherwise, the chosen type's checkboxes
    // enabled for weekly / monthly / yearly; setEndType (:636). The "in / on
    // the" and "every N" label texts come from localized strings — not done.
    {
      label: 'recurrence-rows',
      event: 'change',
      match: function (el) { return el.id === 'recurrence' && !!closestTo(el, BOX); },
      apply: function (el) {
        var val = el.value;
        var rows = all(BOX + ' .sugar-calendar-metabox__field-row');
        show(rows.filter(function (r) { return r.classList.contains('type'); }), false);
        R.fadeIn(rows.filter(function (r) { return r.classList.contains('repeat-' + val); }));
        var sell = document.getElementById('sugar-calendar-metabox__field-row--tickets_sell_per_occurrence');
        if (sell) show(sell, val !== '0');
        rows.filter(function (r) { return r.classList.contains('type'); }).forEach(function (r) {
          all('input[type=checkbox]', r).forEach(function (i) { i.disabled = true; });
        });
        var adv = [];
        rows.filter(function (r) { return r.classList.contains('repeat-advanced'); }).forEach(function (r) { adv = adv.concat(all('input', r)); });
        if (val === '0') {
          adv.forEach(function (i) { i.disabled = true; });
          return;
        }
        adv.forEach(function (i) { i.disabled = false; });
        if (val === 'monthly' || val === 'yearly' || val === 'weekly') {
          rows.filter(function (r) { return r.classList.contains('type') && r.classList.contains('repeat-' + val); }).forEach(function (r) {
            all('input[type=checkbox]', r).forEach(function (i) { i.disabled = false; });
          });
        }
        endType();
      },
      state: function (el) { return { key: 'event.recurrence', value: el.value }; }
    },

    // ─ Recurrence end type ─────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/event-edit.js:636 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :541 to the .end-repeat-type radios): every
    // non-radio input in the end-type blocks is disabled; the checked radio's
    // own block's inputs are enabled.
    {
      label: 'recurrence-end-type',
      event: 'click',
      match: function (el) { return is(el, BOX + ' .end-repeat-type input[type="radio"]'); },
      apply: function () { endType(); },
      state: function (el) { return { key: 'event.recurrenceEnd', value: el.value }; }
    },

    // ─ RSVP: unique per occurrence follows recurrence ──────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/event-edit.js:25 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :15 to #recurrence): not Never → the Unique per
    // Occurrence row and the separator right after it lose sugar-calendar-rsvp__hide;
    // Never → both gain it.
    {
      label: 'rsvp-unique-per-occurrence',
      event: 'change',
      match: function (el) { return el.id === 'recurrence'; },
      apply: function (el) {
        var rows = all('.sugar-calendar-metabox__field-row--rsvp_unique_per_occurrence');
        var nodes = rows.slice();
        rows.forEach(function (r) {
          var sep = r.nextElementSibling;
          if (is(sep, '.sugar-calendar-metabox__field-row__sep')) nodes.push(sep);
        });
        klass(nodes, 'sugar-calendar-rsvp__hide', el.value !== '0');
      }
    },

    // ─ Online platform → its rows ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-event-metabox.js:225 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (syncOnlineMeetingUI, bound at :85): the meeting card shows
    // only when its data-provider is the chosen one; the Custom Link block shows
    // for `custom` and its URL field is disabled otherwise; "Show to" shows for
    // either; an out-of-credits option marks the select --invalid and shows the
    // credits error; the Create button reads "Create <name> Meeting" and shows
    // for a creatable provider with no card, the description then reads "Click
    // on create link, to generate the <name> meeting for this event." (both
    // strings are the wp.i18n source strings of :282 / :287); otherwise the
    // button hides and the description returns to its rendered text.
    {
      label: 'online-provider-rows',
      event: 'change',
      match: function (el) { return el.id === 'online_provider' && !!closestTo(el, BOX); },
      apply: function (el) {
        var box = closestTo(el, BOX);
        var opt = el.options[el.selectedIndex] || null;
        var slug = el.value;
        var meeting = all('.sugar-calendar-metabox__online-meeting', box);
        var custom = all('.sugar-calendar-metabox__online-custom', box);
        var visibility = all('.sugar-calendar-metabox__field-row--online-visibility', box);
        var matches = meeting.length > 0 && !!slug && slug === String(meeting[0].getAttribute('data-provider'));
        var isCustom = slug === 'custom';
        show(meeting, matches);
        show(custom, isCustom);
        all('#custom_link_url', box).forEach(function (i) { i.disabled = !isCustom; });
        show(visibility, matches || isCustom);
        var outOfCredits = !!opt && opt.getAttribute('data-out-of-credits') === '1';
        el.classList.toggle('sugar-calendar-metabox__online-provider--invalid', outOfCredits);
        show(all('.sugar-calendar-metabox__online-credits-error', box), outOfCredits);
        var btn = one('.sugar-calendar-metabox__create-meeting', box);
        if (!btn) return;
        var desc = one('.sugar-calendar-metabox__online-description', box);
        if (desc && desc._snapDefault === undefined) desc._snapDefault = desc.textContent;
        var creatable = !!slug && !isCustom && !(opt && opt.disabled) && !outOfCredits;
        all('.sugar-calendar-metabox__create-meeting-error', box).forEach(function (e) { show(e, false); e.textContent = ''; });
        var name = opt ? opt.textContent.trim() : '';
        if (creatable && !matches) {
          btn.textContent = 'Create ' + name + ' Meeting';
          show(btn, true);
          if (desc) { desc.textContent = 'Click on create link, to generate the ' + name + ' meeting for this event.'; show(desc, true); }
        } else {
          show(btn, false);
          if (desc) {
            if (outOfCredits) show(desc, false);
            else { desc.textContent = desc._snapDefault; show(desc, true); }
          }
        }
      },
      state: function (el) { return { key: 'event.onlineProvider', value: el.value }; }
    },

    // ─ Venue: Add New / Cancel ─────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/venue.js:455 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :50 / :52): Add New → the venue row .hide('fast')
    // (:457), the edit form's fields cleared (clearEditForm) and shown
    // (displayEditForm :491: Show Map row .hide('fast') :492, edit rows
    // .show('fast') :493, the Online section a plain .hide(), Save disabled
    // while the title is empty); Cancel (:510) → the summary and Add New a
    // plain .show(), the venue and Show Map rows .show('fast') (:517-518), the
    // edit rows .hide('fast') (:519), the Online section .show() and
    // #online_provider re-synced. 'fast' is 200 ms of jQuery's animated
    // show / hide: width, height, opacity, margin and padding. Edit (:472)
    // fetches the venue over the REST API — not done.
    {
      label: 'venue-add-new-form',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#venue-add-new, #venue-edit-cancel'); },
      apply: function (el) {
        var cancel = !!closestTo(el, '#venue-edit-cancel');
        var editRows = all('.sugar-calendar-metabox__field-row--venue_edit');
        if (!cancel) {
          R.hide(all('.sugar-calendar-metabox__field-row--venue'), 'fast');
          editRows.forEach(function (r) {
            all('input[type="text"], input[type="url"], input[type="email"], input[type="tel"], input[type="number"], textarea', r).forEach(function (i) { i.value = ''; });
            all('input[type="checkbox"]', r).forEach(function (i) { i.checked = false; });
          });
          R.hide(all('.sugar-calendar-metabox__field-row--venue_show_map'), 'fast');
          R.show(editRows, 'fast');
          show(all('.sugar-calendar-metabox__online-section'), false);
          var title = document.getElementById('sugar-calendar-setting-sugarcalendar_venue_title');
          var save = document.getElementById('venue-edit-save');
          if (save) save.disabled = !(title && title.value.trim());
          return;
        }
        show(all('.sugar-calendar-metabox__field-row--venue .sugar-calendar-event-venue-summary'), true);
        show(all('#venue-add-new'), true);
        R.show(all('.sugar-calendar-metabox__field-row--venue'), 'fast');
        R.show(all('.sugar-calendar-metabox__field-row--venue_show_map'), 'fast');
        R.hide(editRows, 'fast');
        show(all('.sugar-calendar-metabox__online-section'), true);
        var provider = document.getElementById('online_provider');
        if (provider) provider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },

    // ─ Tickets or RSVP, never both ─────────────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/event-edit.js:44 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :16-17): turning one on unchecks and disables the
    // other and shows the other's notice (loses sugar-calendar-rsvp__hide);
    // turning it off enables the other and hides the notice.
    {
      label: 'tickets-rsvp-exclusive',
      event: 'change',
      match: function (el) { return el.id === 'enable_tickets' || el.id === 'rsvp_enable'; },
      apply: function (el) {
        var tickets = el.id === 'enable_tickets';
        var other = document.getElementById(tickets ? 'rsvp_enable' : 'enable_tickets');
        var notice = document.getElementById(tickets ? 'sugar-calendar-metabox__rsvp-enable-notice' : 'sugar-calendar-metabox__ticket-enable-notice');
        if (el.checked) {
          if (other) { other.checked = false; other.disabled = true; }
          if (notice) klass(notice, 'sugar-calendar-rsvp__hide', true);
        } else {
          if (other) other.disabled = false;
          if (notice) klass(notice, 'sugar-calendar-rsvp__hide', false);
        }
      },
      state: function (el) { return { key: el.id === 'enable_tickets' ? 'event.tickets' : 'event.rsvp', value: !!el.checked }; }
    },

    // ─ RSVP: capacity field ────────────────────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/event-edit.js:76 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :18): Limit Capacity on → the capacity child row
    // loses sugar-calendar-rsvp__hide; off → gains it.
    {
      label: 'rsvp-capacity-row',
      event: 'change',
      match: function (el) { return el.id === 'rsvp_enable_capacity'; },
      apply: function (el) {
        klass(document.getElementById('sugar-calendar-metabox__field-row__child-rsvp_enable_capacity'), 'sugar-calendar-rsvp__hide', el.checked);
      },
      state: function (el) { return { key: 'event.rsvpCapacity', value: !!el.checked }; }
    },

    // ─ Tickets: limit capacity ─────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/features/event-ticketing/admin.js:4 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (delegated on document): the Limit Capacity row toggles
    // …--ticket_limit_capacity-enabled / -disabled with its checkbox; the
    // plugin's CSS then shows or hides the Capacity field.
    {
      label: 'ticket-limit-capacity',
      event: 'change',
      match: function (el) { return is(el, '.sugar-calendar-metabox__field-row--ticket_limit_capacity input[type="checkbox"]'); },
      apply: function (el) {
        var row = closestTo(el, '.sugar-calendar-metabox__field-row--ticket_limit_capacity');
        if (!row) return;
        row.classList.toggle('sugar-calendar-metabox__field-row--ticket_limit_capacity-enabled', !!el.checked);
        row.classList.toggle('sugar-calendar-metabox__field-row--ticket_limit_capacity-disabled', !el.checked);
      },
      state: function (el) { return { key: 'event.ticketLimitCapacity', value: !!el.checked }; }
    },

    // ─ New event: the slot's date and hour ─────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/src/Admin/Events/Metaboxes/Event.php:613 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: a calendar slot opens post-new.php?…&sce_start_date=Y-m-d
    // [&sce_start_hour=G | &sce_all_day=1] (Month.php:233-244,
    // Base.php:5000-5023) and PHP pre-fills the form (Event.php:613-661):
    // validate_start_date_param (:1140-1162) takes the date at hour
    // sce_start_hour, or 7 when it is 0 or missing; sce_all_day checks All Day
    // and hides the time fields (style display:none, :704-706); otherwise the
    // hour prints as 'h' (12-hour clock: the AM/PM select is rendered, :774) or
    // 'H', the minute as '00', AM/PM as 'a'. Here the nav rule
    // (products/sugar-calendar/nav-rules.json) carries the sce_* params to
    // admin-event-new, and this entry applies them on load.
    {
      label: 'new-event-prefill',
      event: 'snap:params',
      match: function (el) { return el === document.body && !!document.getElementById('start_date') && !!R.params().sce_start_date; },
      apply: function () {
        var p = R.params();
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.sce_start_date || '');
        if (!m) return;                                   // DateTime() would throw: the form stays empty
        var y = +m[1], mo = +m[2], d = +m[3];
        if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
        var allDay = !!p.sce_all_day && p.sce_all_day !== '0';
        var hour = allDay ? 0 : Math.abs(parseInt(p.sce_start_hour, 10) || 0);
        if (!hour) hour = 7;
        // DateTime rolls an overflowing day into the next month, and
        // setTime(25, 0, 0) into the next day.
        var date = civilNormalise(y, mo, d + Math.floor(hour / 24));
        hour = hour % 24;
        set('start_date', date);
        if (allDay) {
          var box = document.getElementById('all_day');
          if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
          return;
        }
        var twelve = !!document.getElementById('start_time_am_pm');
        var h12 = hour % 12 === 0 ? 12 : hour % 12;
        set('start_time_hour', pad(twelve ? h12 : hour));
        set('start_time_minute', '00');
        if (twelve) set('start_time_am_pm', hour < 12 ? 'am' : 'pm');
      },
      state: function () { var p = R.params(); return { key: 'event.newFrom', value: p.sce_start_date || null }; }
    },

    // ════ Admin — Events screens ═══════════════════════════════════════════

    // ─ Events screen options (cog) ─────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-events.js:62 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :57): the cog toggles `open`, the menu
    // .fadeToggle(200) (:64 — swing).
    {
      label: 'events-screen-options',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-screen-options-toggle'); },
      apply: function () {
        var t = document.getElementById('sugar-calendar-screen-options-toggle');
        t.classList.toggle('open');
        R.fadeToggle(one('.sugar-calendar-screen-options-menu'), 200);
      }
    },

    // ─ Events: hide columns ────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-events.js:72 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :58, a click on a Columns checkbox): hideColumns
    // (:132) — every .column / th / td in .sugar-calendar-table loses `hidden`,
    // then each unchecked column's .column-<id> gains it (Title never hides);
    // hideEventSpans (:143) — an .event-span whose data-days are all hidden
    // gains `hidden`; updateGridColumnLayout (:163) rewrites
    // --grid-template-columns in #sugar-calendar-table-grid-column-layout. The
    // POST that saves the choice (:181) is not made.
    {
      label: 'events-columns',
      event: 'click',
      match: function (el) { return is(el, '.sugar-calendar-screen-options-menu [name="sugar-calendar[columns][]"]'); },
      apply: function () {
        var cols = all('.sugar-calendar-screen-options-menu [name="sugar-calendar[columns][]"]').map(function (i) {
          return { id: i.value, visible: i.value === 'title' ? true : i.checked };
        });
        var hiddenIds = cols.filter(function (c) { return !c.visible; }).map(function (c) { return c.id; });
        all('.sugar-calendar-table .column, .sugar-calendar-table th, .sugar-calendar-table td').forEach(function (n) { klass(n, 'hidden', true); });
        if (hiddenIds.length) {
          all(hiddenIds.map(function (id) { return '.sugar-calendar-table .column-' + id; }).join(',')).forEach(function (n) { n.classList.add('hidden'); });
        }
        all('.sugar-calendar-table-events .event-span').forEach(function (s) {
          klass(s, 'hidden', true);
          var days = (s.getAttribute('data-days') || '').split(',').filter(function (d) { return hiddenIds.indexOf(d) === -1; });
          if (!days.length) s.classList.add('hidden');
        });
        var style = document.getElementById('sugar-calendar-table-grid-column-layout');
        if (style && cols.length) {
          var template = cols.map(function (c) {
            var max = c.id === cols[0].id ? '120px' : '1fr';
            return '[' + c.id + '] ' + (c.visible ? 'minmax(0, ' + max + ')' : '0fr');
          }).join(' ');
          style.textContent = '\n\t\t\t\t.sugar-calendar-table-events {\n\t\t\t\t\t--grid-template-columns: ' + template + ';\n\t\t\t\t}\n\t\t\t';
        }
      }
    },

    // ─ Event popover ───────────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-events.js:208 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (initializeTooltips): an entry's link click is prevented
    // (:213); one tippy per `.sugar-calendar-event-entry span` (:224), trigger
    // click, interactive, appended to <body>, offset [0, 12], its trigger the
    // multi-hour card, else the title link (:220-222); content = the HTML of
    // #sugar-calendar-tooltip-<data-id> (:232-236). A click on the open one's
    // trigger hides it (hideOnClick). The trigger's aria-expanded follows.
    // No Escape: the plugin's tippy has no hideOnEsc plugin.
    {
      label: 'event-popover',
      event: 'click',
      match: function (el) { return !!closestTo(el, TIPPY_TRIGGER) && !closestTo(el, '[data-tippy-root]'); },
      apply: function (el) {
        var parts = tippyParts(el);
        if (!parts) return;
        var open = tippyOpen();
        if (open && open.span === parts.span) { tippyHide(); return; }
        if (open) tippyHide();
        tippyShow(parts);
      },
      state: function (el) {
        var parts = tippyParts(el);
        return { key: 'events.popover', value: parts && parts.span.parentElement ? parts.span.parentElement.getAttribute('data-id') : null };
      }
    },

    // ─ Event popover: press outside ────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/lib/tippy/tippy-bundle.umd.min.js:1 @verified 2026-09-19 @product sugar-calendar
    // tippy 6 hideOnClick (default true): a press anywhere outside the popover
    // and outside its own trigger hides it (onDocumentPress, on mousedown).
    {
      label: 'event-popover-dismiss',
      event: 'mousedown',
      match: function (el) {
        var open = tippyOpen();
        return !!open && !open.root.contains(el) && !(open.trigger && open.trigger.contains(el));
      },
      apply: function () { tippyHide(); }
    },

    // ─ Events: calendar filter ─────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-events.js:56 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: choosing a calendar in #sc_event_category submits its
    // parent form — a GET form, so the browser loads action?fields. Here that
    // URL goes through the nav map: a captured screen opens, anything else is
    // a logged miss.
    {
      label: 'events-calendar-filter',
      event: 'change',
      match: function (el) { return el.id === 'sc_event_category' && !!el.form; },
      apply: function (el) {
        var url = getFormUrl(el.form);
        if (!url) return;
        var hit = R.resolve(url);
        if (hit) R.goto(hit.slug, hit.params.length ? { params: hit.params } : null);
        else R.miss(url);
      },
      state: function (el) { return { key: 'events.calendar', value: el.value }; }
    },

    // ─ Events: the date pickers' Filter / View ─────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/src/Admin/Events/Tables/Base.php:4452 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: the month / year / day pickers and the calendar dropdown sit
    // in GET forms (extra_tablenav, :4452-4592, and the filter bar); their
    // submit is a plain page load of action?fields — no plugin JS. Here the same
    // URL goes through the nav map: a captured screen opens, anything else is a
    // logged miss (core swallows every other submit).
    {
      label: 'events-filter-submit',
      event: 'submit',
      match: function (el) {
        return el.localName === 'form' && (el.getAttribute('method') || 'get').toLowerCase() === 'get'
          && !!one('input[name="page"][value="sugar-calendar"]', el);
      },
      apply: function (el) {
        var url = getFormUrl(el);
        if (!url) return;
        var hit = R.resolve(url);
        if (hit) R.goto(hit.slug, hit.params.length ? { params: hit.params } : null);
        else R.miss(url);
      }
    },

    // ─ Choices dropdown: open / close ──────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/lib/choices.min.js:1 @verified 2026-09-19 @product sugar-calendar
    // Choices.js 11.1.0 _onClick (a document click): inside a closed dropdown
    // → showDropdown (the list gains is-active, the box is-open + is-focused,
    // aria-expanded true, is-flipped when it would run off the window) and the
    // search input takes focus; inside an open single-select, outside its list
    // and input → hideDropdown. The venue, speakers, calendars and tags pickers
    // of the editor (admin-event-metabox.js:568), the tags filter of the
    // Events screens (admin-events.js:986) and the Settings selects
    // (admin-settings.js:243).
    {
      label: 'choices-dropdown',
      event: 'click',
      match: function (el) {
        var c = closestTo(el, '.choices');
        return !!c && !c.classList.contains('is-disabled') && !!one('.choices__list--dropdown', c);
      },
      apply: function (el) {
        var c = closestTo(el, '.choices');
        var dd = one('.choices__list--dropdown', c);
        var input = one('input.choices__input--cloned', c);
        var single = c.getAttribute('data-type') === 'select-one';
        if (dd.classList.contains('is-active')) {
          if (single && el !== input && !dd.contains(el)) choicesClose(c, true);
          return;
        }
        all('.choices.is-open').forEach(function (o) { if (o !== c) choicesClose(o); });
        choicesOpen(c);
      },
      state: function (el) { var c = closestTo(el, '.choices'); return { key: 'choices.open', value: !!c && c.classList.contains('is-open') }; }
    },

    // ─ Choices dropdown: press outside ─────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/lib/choices.min.js:1 @verified 2026-09-19 @product sugar-calendar
    // Choices.js 11.1.0 _onClick, target outside the box: removeFocusState,
    // hideDropdown, unhighlightAll. Mirrored on press (see the header note).
    {
      label: 'choices-dismiss',
      event: 'mousedown',
      match: function (el) {
        return all('.choices.is-open, .choices.is-focused').some(function (c) { return !c.contains(el); });
      },
      apply: function (el) {
        all('.choices.is-open, .choices.is-focused').forEach(function (c) { if (!c.contains(el)) choicesClose(c); });
      }
    },

    // ════ Admin — Calendars, Tags, Venues, Speakers lists ══════════════════

    // ─ List screen options (cog) ───────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-column-control.js:25 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :21): the cog toggles `open`, the menu
    // .fadeToggle(200) (:27 — swing).
    {
      label: 'list-screen-options',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-table-screen-options-toggle'); },
      apply: function () {
        document.getElementById('sugar-calendar-table-screen-options-toggle').classList.toggle('open');
        R.fadeToggle(one('.sugar-calendar-table-screen-options-menu'), 200);
      }
    },

    // ─ List: hide columns ──────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-column-control.js:32 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (delegated at :22): unchecking a column checkbox adds
    // `hidden` to every .column-<value> of the .wp-list-table (checking
    // removes it) and moves every .colspanchange colspan by one. Saved only
    // by the menu's own "Save Options" submit.
    {
      label: 'list-columns',
      event: 'change',
      match: function (el) {
        return is(el, '.sugar-calendar-table-screen-options-menu input[name="sugar-calendar-table-active-columns[columns][]"], '
          + '.sugar-calendar-table-screen-options-menu input[name="sugar-calendar-calendars-visible-columns[]"]');
      },
      apply: function (el) {
        var column = el.value;
        if (!column) return;
        var hide = !el.checked;
        all('.wp-list-table .column-' + column).forEach(function (n) { klass(n, 'hidden', !hide); });
        all('.wp-list-table .colspanchange').forEach(function (n) {
          n.setAttribute('colspan', parseInt(n.getAttribute('colspan'), 10) + (hide ? -1 : 1));
        });
      },
      state: function (el) { return { key: 'list.column.' + el.value, value: !!el.checked }; }
    },

    // (The calendar colour picker is WordPress's own wpColorPicker since
    // WO-202I — the `color-picker-live` entry below. WO-202SC's class-flip
    // mirror of its open / close, `color-picker-toggle` and
    // `color-picker-dismiss`, is gone: the live widget binds both itself.)

    // ════ Admin — Settings ═════════════════════════════════════════════════

    // ─ Payments: Test Mode switches the Stripe connect link ────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-settings.js:284 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :267): the Connect with Stripe link's live_mode
    // param becomes 0 (Test Mode on) or 1, then the value is saved over AJAX
    // (:308) — the save is not made. The toggle's On / Off label is CSS.
    {
      label: 'payments-test-mode-link',
      event: 'change',
      match: function (el) { return el.id === 'sugar-calendar-setting-sandbox'; },
      apply: function (el) {
        var a = one('#sugar-calendar-setting-row-stripe-connect .sugar-calendar-stripe-connect');
        if (!a) return;
        var u;
        try { u = new URL(a.getAttribute('href')); } catch (_) { return; }
        var params = new URLSearchParams(u.search);
        params.set('live_mode', el.checked ? 0 : 1);
        a.setAttribute('href', u.origin + u.pathname + '?' + params.toString());
      },
      state: function (el) { return { key: 'payments.testMode', value: !!el.checked }; }
    },

    // ─ RSVP: spam prevention method ────────────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/settings-rsvp-tab.js:140 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :59): the preview is marked stale (updatePreview,
    // :86); every card loses `selected`, the clicked one gains it; the hidden
    // method input takes its data-method; every card body gains sc-rsvp__hide
    // and the method's own loses it; the description becomes the method's text
    // (sc_rsvp_admin_settings_rsvp_tab.spam_prevention_methods — the strings
    // of sc-rsvp/src/Admin/Settings/RsvpTab.php:504-531, rendered verbatim in
    // the captured admin-settings-rsvp, --recaptcha and --turnstile); the
    // shared settings hide for None; the preview row shows for Turnstile, and
    // for reCAPTCHA unless its method is v3.
    {
      label: 'rsvp-spam-method',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.sc-rsvp-method-card'); },
      apply: function (el) {
        var card = closestTo(el, '.sc-rsvp-method-card');
        var method = card.getAttribute('data-method');
        rsvpPreviewStale();
        all('.sc-rsvp-method-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        all('input[name="sugar-calendar[sc_rsvp_spam_protection_method]"]').forEach(function (i) { i.value = method; });
        klass(all('.sc-rsvp__admin__spam-protection-card-content'), 'sc-rsvp__hide', false);
        klass(document.getElementById('sc-rsvp__admin__spam-protection-card__' + method), 'sc-rsvp__hide', true);
        if (RSVP_METHODS[method]) all('.sc-rsvp-method-description').forEach(function (d) { d.innerHTML = RSVP_METHODS[method]; });
        klass(document.getElementById('sc-rsvp__admin__spam-protection__shared-settings'), 'sc-rsvp__hide', method !== 'none');
        var preview = document.getElementById('sc-rsvp__admin__recaptcha-preview-container');
        if (method === 'cfturnstile') klass(preview, 'sc-rsvp__hide', true);
        else if (method === 'grecaptcha') {
          var v = one('.grecaptcha_method-option[name="sugar-calendar[grecaptcha_method]"]:checked');
          klass(preview, 'sc-rsvp__hide', !(v && v.value === 'recaptcha_v3'));
        }
      },
      state: function (el) { var c = closestTo(el, '.sc-rsvp-method-card'); return { key: 'rsvp.spamMethod', value: c ? c.getAttribute('data-method') : null }; }
    },

    // ─ RSVP: reCAPTCHA method rows ─────────────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/settings-rsvp-tab.js:97 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :60): v2 checkbox or invisible → the preview row
    // and the Theme row show, Threshold hides; v3 → the reverse.
    {
      label: 'rsvp-recaptcha-method',
      event: 'change',
      match: function (el) { return is(el, '.grecaptcha_method-option'); },
      apply: function (el) {
        var v2 = el.value === 'checkbox_recaptcha_v2' || el.value === 'invisible_recaptcha_v2';
        klass(document.getElementById('sc-rsvp__admin__recaptcha-preview-container'), 'sc-rsvp__hide', v2);
        klass(document.getElementById('sc-rsvp-form-row-grecaptcha_theme'), 'sc-rsvp__hide', v2);
        klass(document.getElementById('sugar-calendar-setting-row-grecaptcha_threshold'), 'sc-rsvp__hide', !v2);
      },
      state: function (el) { return { key: 'rsvp.recaptchaMethod', value: el.value }; }
    },

    // ─ RSVP: any change marks the preview stale ────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/admin/settings-rsvp-tab.js:70 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :57, once per page): the first change to a
    // settings input hides the reCAPTCHA / Turnstile preview (updatePreview,
    // :86-90; its description target id is not in the page, so that half does
    // nothing there either).
    {
      label: 'rsvp-preview-stale',
      event: 'change',
      once: true,
      match: function (el) { return is(el, 'form.sugar-calendar-admin-content__settings-form input') && !!document.getElementById('sc-rsvp__admin__recaptcha-preview'); },
      apply: function () { rsvpPreviewStale(); }
    },

    // ════ Admin — every Sugar Calendar page ════════════════════════════════

    // ─ Help flyout ─────────────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-flyout-menu.js:64 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: a click on .sc-flyout-head toggles `opened` on
    // #sugar-calendar-flyout (the items then show, by CSS). The mascot image
    // swap (:66) points at image files the capture never saw — not done.
    {
      label: 'flyout-menu',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-flyout .sc-flyout-head'); },
      apply: function () { document.getElementById('sugar-calendar-flyout').classList.toggle('opened'); },
      state: function () { return { key: 'flyout.open', value: document.getElementById('sugar-calendar-flyout').classList.contains('opened') }; }
    },

    // ─ Help flyout: Escape ─────────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-flyout-menu.js:80 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: Escape on the document (:80-85) removes `opened`.
    {
      label: 'flyout-dismiss',
      event: 'keydown',
      match: function (el, e) {
        var f = document.getElementById('sugar-calendar-flyout');
        return !!f && f.classList.contains('opened') && !!e && (e.key === 'Escape' || e.keyCode === 27);
      },
      apply: function () { document.getElementById('sugar-calendar-flyout').classList.remove('opened'); }
    },

    // ─ Help flyout: press outside ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-flyout-menu.js:88 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: a click outside the flyout (:88-93) removes `opened`.
    // Mirrored on press (see the header note).
    {
      label: 'flyout-outside',
      event: 'mousedown',
      match: function (el) {
        var f = document.getElementById('sugar-calendar-flyout');
        return !!f && f.classList.contains('opened') && !f.contains(el);
      },
      apply: function () { document.getElementById('sugar-calendar-flyout').classList.remove('opened'); }
    },

    // ════ Frontend — Calendar block, Events List block ═════════════════════

    // ─ Block popovers: display, filters, month ─────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/sugar-calendar.js:333 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (the Calendar block, bound at :309-314; the Events List
    // block's twin is assets/js/frontend/blocks/common.js:780): the view
    // button opens the display popover, the settings button the filters
    // popover, the date the month picker. hideAllPopovers (:32-47) first; an
    // open popover's own button only closes it (the Calendar block — the
    // Events List block's toggle re-opens it, common.js:786-790). show (:356-400):
    // Floating UI places it bottom-start (filters: bottom-end), offset 10,
    // shift, flip; the button gains …__controls__settings__btn_active, the
    // popover .show(), <body> sugar-calendar-block__popovers__active.
    {
      label: 'block-popover-toggle',
      event: 'click',
      match: function (el) { var b = closestTo(el, BLOCK_BUTTONS); return !!b && !!blockOf(b); },
      apply: function (el) {
        var btn = closestTo(el, BLOCK_BUTTONS);
        var block = blockOf(btn);
        var key = blockKey(btn);
        var pop = one(BLOCK_POPOVERS[key], block);
        if (!pop) return;
        var open = shown(pop);
        var calendarBlock = block.classList.contains('sugar-calendar-block');
        blockHideAll(block);
        if (!open || !calendarBlock) blockShow(btn, pop, key);
      },
      state: function (el) { var b = closestTo(el, BLOCK_BUTTONS); return { key: 'block.popover', value: b ? blockKey(b) : null }; }
    },

    // ─ Block popovers: press outside ───────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/sugar-calendar.js:1686 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (a <body> click, :1662): while <body> carries
    // sugar-calendar-block__popovers__active, a click anywhere but a popover,
    // a popover button or an event cell hides every block popover on the page.
    // Mirrored on press (see the header note).
    {
      label: 'block-popover-dismiss',
      event: 'mousedown',
      match: function (el) {
        return document.body.classList.contains('sugar-calendar-block__popovers__active')
          && !closestTo(el, BLOCK_BUTTONS + ', .sugar-calendar-block__event-cell, .sugar-calendar-block__popover');
      },
      apply: function () { blockHideAll(document); }
    },

    // ─ Filters popover: accordion ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/sugar-calendar.js:456 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (initFilterUI, :410-489): a section is a child of the
    // container that holds a heading. A click on a closed section opens its
    // options and closes every other, data-sc-accordion-open following; on
    // the open section only a click on the heading itself closes it. Each
    // options list first finishes any slide it is in (.stop(true, true)),
    // then .slideDown(150) / .slideUp(150) (:474-484).
    {
      label: 'block-filter-accordion',
      event: 'click',
      match: function (el) { return !!filterSection(el); },
      apply: function (el) {
        var sec = filterSection(el);
        var open = sec.getAttribute('data-sc-accordion-open') === 'true';
        if (open && !el.classList.contains('sugar-calendar-block__popover__calendar_selector__container__heading')) return;
        filterSections(sec.parentElement).forEach(function (s) {
          var op = one('.sugar-calendar-block__popover__calendar_selector__container__options', s);
          var openIt = s === sec && !open;
          if (op) {
            R.stop(op, true, true);
            if (openIt) R.slideDown(op, 150); else R.slideUp(op, 150);
          }
          s.setAttribute('data-sc-accordion-open', openIt ? 'true' : 'false');
        });
      }
    },

    // ─ Filters popover: a section's applied dot ────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/sugar-calendar.js:533 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :492 to the sections' checkboxes): each heading's
    // .sc-filter-applied-indicator gets visibility visible when its section
    // has a checked box, hidden otherwise.
    {
      label: 'block-filter-indicators',
      event: 'change',
      match: function (el) { return is(el, 'input[type="checkbox"]') && !!filterSection(el); },
      apply: function (el) {
        var container = filterSection(el).parentElement;
        all('.sugar-calendar-block__popover__calendar_selector__container__heading', container).forEach(function (h) {
          var any = all('input[type="checkbox"]', h.parentElement).some(function (i) { return i.checked; });
          all('.sc-filter-applied-indicator', h).forEach(function (d) { d.style.visibility = any ? 'visible' : 'hidden'; });
        });
      }
    },

    // ─ Calendar block: another display mode ────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/sugar-calendar.js:786 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (onChangeDisplay): the current mode does nothing; another
    // mode swaps the view class, writes sc_display and re-renders the block
    // over AJAX. That result is a captured sibling (DESIGN §5 (a)): the block
    // page in that mode — slugs of the frontend capture plan.
    {
      label: 'block-display-mode',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.sugar-calendar-block__popover__display_selector__container__body__option'); },
      apply: function (el) {
        var opt = closestTo(el, '.sugar-calendar-block__popover__display_selector__container__body__option');
        var mode = opt.getAttribute('data-mode');
        var block = blockOf(opt);
        if (!mode || (block && block.classList.contains('sugar-calendar-block__' + mode + '-view'))) return;
        var slug = BLOCK_VIEWS[mode];
        if (slug) R.goto(slug);
      },
      state: function (el) {
        var opt = closestTo(el, '.sugar-calendar-block__popover__display_selector__container__body__option');
        return { key: 'block.display', value: opt ? opt.getAttribute('data-mode') : null };
      }
    },

    // ════ Frontend — single event: RSVP and tickets (Bootstrap 4 modals) ═══

    // ─ Bootstrap modal: open ───────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/features/event-ticketing/frontend/bootstrap.js:6 @verified 2026-09-19 @product sugar-calendar
    // Bootstrap 4.0.0's data API (the bundle the plugin ships): a click on
    // [data-toggle="modal"] shows its data-target — body.modal-open, a
    // .modal-backdrop (+ .fade) appended then .show, the modal display:block,
    // aria-hidden removed, scrollTop 0, then .show, focus. The RSVP
    // modal's show.bs.modal handler (sc-rsvp/assets/js/frontend/single-event.js:417)
    // reads data-going from the button: Going shows the additional attendees
    // and writes "Going" into the response line, Not going hides them and
    // writes "Not Going" (the strings of sc-rsvp/src/Frontend.php:114-115);
    // a returning attendee (data-rsvp-id on Submit) keeps the line as it is.
    {
      label: 'bootstrap-modal-open',
      event: 'click',
      match: function (el) { var t = closestTo(el, '[data-toggle="modal"]'); return !!t && !!modalTarget(t); },
      apply: function (el) {
        var t = closestTo(el, '[data-toggle="modal"]');
        var m = modalTarget(t);
        bsShow(m, function () { if (m.id === 'sc-rsvp-frontend-modal__response') rsvpModalShow(t); });
      },
      state: function (el) { var t = closestTo(el, '[data-toggle="modal"]'); return { key: 'modal.open', value: t ? t.getAttribute('data-target') || t.getAttribute('href') : null }; }
    },

    // ─ Bootstrap modal: close ──────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/features/event-ticketing/frontend/bootstrap.js:6 @verified 2026-09-19 @product sugar-calendar
    // Bootstrap 4.0.0: a [data-dismiss="modal"] inside the open modal, or a
    // click on the modal itself outside its dialog (the backdrop area), hides
    // it: .show goes, display:none, aria-hidden, the backdrop and
    // body.modal-open go. The RSVP modal's hide.bs.modal handler
    // (single-event.js:462) clears the response line.
    {
      label: 'bootstrap-modal-close',
      event: 'click',
      match: function (el) {
        var m = closestTo(el, '.modal.show');
        return !!m && (!!closestTo(el, '[data-dismiss="modal"]') || el === m);
      },
      apply: function (el) { bsHide(closestTo(el, '.modal.show')); }
    },

    // ─ RSVP form: add an attendee row ──────────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/frontend/single-event.js:225 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :185-187): a copy of the hidden row
    // #sc-rsvp-frontend-modal__response__add-attendees__orig (captured in the
    // modal) — id dropped, …__additional-attendees__row added, inputs emptied,
    // data-row-id = the next number — goes before the Add row (the Add button)
    // or after the row whose + was clicked, then loses sc-rsvp__hide. The
    // Add button's disabled state at the limit needs capacity_enabled, which
    // the plugin only localizes (Frontend.php:108) — not in the page, not done.
    {
      label: 'rsvp-add-attendee',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '#sc-rsvp-frontend-modal__response__add-attendees, .sc-rsvp-frontend-modal__response__additional-attendees__row .sc-rsvp-frontend-modal__response__additional-attendees__row__actions__add')
          && !!document.getElementById('sc-rsvp-frontend-modal__response__add-attendees__orig');
      },
      apply: function (el) {
        var orig = document.getElementById('sc-rsvp-frontend-modal__response__add-attendees__orig');
        var box = closestTo(orig, '.sc-rsvp-frontend-modal__response__form__body__content__additional-attendees');
        if (RSVP_ROWS.next === null) RSVP_ROWS.next = all('.sc-rsvp-frontend-modal__response__additional-attendees__row', box).length + 1;
        RSVP_ROWS.next++;
        var row = orig.cloneNode(true);
        row.classList.add('sc-rsvp-frontend-modal__response__additional-attendees__row');
        row.removeAttribute('id');
        all('input', row).forEach(function (i) { i.value = ''; });
        row.setAttribute('data-row-id', String(RSVP_ROWS.next));
        var addBtn = closestTo(el, '#sc-rsvp-frontend-modal__response__add-attendees');
        var btnRow = document.getElementById('sc-rsvp-frontend-modal__response__add-attendees-btn-row');
        if (addBtn && btnRow) btnRow.parentNode.insertBefore(row, btnRow);
        else {
          var after = closestTo(el, '.sc-rsvp__row');
          if (after && after.parentNode) after.parentNode.insertBefore(row, after.nextSibling);
        }
        klass(row, 'sc-rsvp__hide', true);
      }
    },

    // ─ RSVP form: remove an attendee row ───────────────────────────────────
    // @since 2026-09-19 @source sc-rsvp/assets/js/frontend/single-event.js:202 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (delegated at :185): the row the − sits in is removed.
    {
      label: 'rsvp-remove-attendee',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.sc-rsvp-frontend-modal__response__additional-attendees__row .sc-rsvp-frontend-modal__response__additional-attendees__row__actions__remove'); },
      apply: function (el) {
        var row = closestTo(el, '.sc-rsvp-frontend-modal__response__additional-attendees__row');
        if (row && row.parentNode) row.parentNode.removeChild(row);
      }
    },

    // ─ Bootstrap modal: Escape ─────────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/features/event-ticketing/frontend/bootstrap.js:6 @verified 2026-09-19 @product sugar-calendar
    // Bootstrap 4.0.0 (keyboard: true, the default): Escape hides the open modal.
    {
      label: 'bootstrap-modal-escape',
      event: 'keydown',
      match: function (el, e) { return !!e && (e.key === 'Escape' || e.keyCode === 27) && !!one('.modal.show'); },
      apply: function () { bsHide(one('.modal.show')); }
    }

  ], { product: 'sugar-calendar', file: 'interactivity.js' });

  // ═══ WO-202I — live widgets (PLAN T12) and the event editor's forms ════
  // A widget the plugin draws on the client with a known library runs that
  // library's own build — WordPress core's or the plugin's — vendored in
  // ../_shared/lib/ under a source header (version, md5), loaded with
  // R.lib() and initialised with the plugin's own options, cited per entry.
  // The copy the capture froze is taken out the way the library's own
  // destroy would, only once the library has loaded (a failed load leaves
  // the page as captured), then the plugin's init runs again on the
  // original element; a copy captured open is opened again. Nothing is
  // saved: AJAX callbacks are not run, only the client-side result is
  // mirrored. Load-time entries listen to READY, a one-shot event this file
  // dispatches on <body> after core has booted (the WP Mail SMTP file's
  // pattern, DESIGN amendment WO-202F).
  var READY = 'sc:ready';

  R.register([

    // ════ Admin — Calendars: WordPress's colour picker ═════════════════════

    // ─ Calendar colour: wpColorPicker, live ────────────────────────────────
    // @since 2026-09-19 @source wp-admin/js/color-picker.js:86 @verified 2026-09-19 @product sugar-calendar
    // WordPress core's wpColorPicker (Iris 1.1.1 under it) on #term-color, as
    // the plugin runs it: on the Calendars list's Add New form (edit-tags.php)
    // term-color.js calls $('#term-color').wpColorPicker() with no options
    // (sugar-calendar/assets/admin/js/term-color.js:5-6, enqueued by
    // includes/classes/terms/class-term-colors.php:108-112), so Iris's own
    // palette shows; on Add New / Edit Calendar admin-calendar.js calls it
    // with palettes: the plugin's eight colours (assets/js/admin-calendar.js:60-64;
    // the palette is src/Admin/Pages/CalendarAbstract.php:363-372). The
    // captured copy of _create (color-picker.js:109-161: the wrap, the
    // toggle button, the label, the Clear / Default button, the Iris picker)
    // goes and the input is put back where the wrap stood. Then the widget's
    // own handlers do the rest: the toggle opens and closes (:235-241,
    // :295-319), a click outside closes (:302), Clear / Default (:275-286),
    // a pick in Iris sets the field and the toggle's colour (:189-195). A
    // copy captured open (admin-calendar-new--color-open) is opened with the
    // widget's own open() (:295).
    {
      label: 'color-picker-live',
      event: READY,
      match: function (el) { return el === document.body && !!one('.wp-picker-container input.wp-color-picker'); },
      apply: function () { wpPickersLive(); }
    },

    // ════ Admin — Settings › Emails and Payments: the plugin's MiniColors ═══

    // ─ Colour scheme: MiniColors, live ─────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-color-scheme.js:47 @verified 2026-09-19 @product sugar-calendar
    // The plugin's jQuery MiniColors 2.3.6 (assets/lib/jquery-minicolors/,
    // registered at src/Admin/Area.php:1312-1318) on every
    // .sugar-calendar-color-scheme .sugar-calendar-color-picker, as
    // admin-color-scheme.js does on document ready (:47-65): each input
    // .minicolors({ defaultValue: its data-default-color || '' }), then
    // trackLegacyToggle (:22-45): the Use Legacy Template toggle dims the
    // control (…--disabled) and makes its children inert, on load and on
    // change. The captured copy goes through MiniColors' own destroy
    // (jquery.minicolors.min.js: the input leaves its wrapper, which is
    // removed with the swatch and the panel) before the init. Then the
    // library's own handlers open the panel on focus (fadeIn 100 ms), pick,
    // and close on a click outside (fadeOut 100 ms).
    {
      label: 'color-scheme-live',
      event: READY,
      match: function (el) { return el === document.body && !!one('.sugar-calendar-color-scheme .sugar-calendar-color-picker'); },
      apply: function () { miniColorsLive(); }
    },

    // ─ Emails: the template cards (Plain Text) ─────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/js/admin-settings-emails.js:395 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (delegated at :83-87): a change of the Email Template radio
    // moves …__option--selected to the card of the checked input
    // (onTemplateChange, :395-408), then applyTemplateVisibility (:415-426):
    // every …__modern-only row of the Email Styling block gets the `hidden`
    // property when Plain Text is chosen and loses it otherwise. No
    // animation, no request. The switch is client-side; the Plain Text
    // preview document is a server page (W2's capture).
    {
      label: 'email-template-cards',
      event: 'change',
      match: function (el) { return is(el, '.sugar-calendar-settings-email-styling .sugar-calendar-image-radio-group__input'); },
      apply: function (el) {
        var group = closestTo(el, '.sugar-calendar-image-radio-group');
        all('.sugar-calendar-image-radio-group__option', group).forEach(function (o) { o.classList.remove('sugar-calendar-image-radio-group__option--selected'); });
        var card = closestTo(el, '.sugar-calendar-image-radio-group__option');
        if (card) card.classList.add('sugar-calendar-image-radio-group__option--selected');
        var checked = one('.sugar-calendar-settings-email-styling .sugar-calendar-image-radio-group__input:checked');
        if (!checked) return;
        all('.sugar-calendar-settings-email-styling .sugar-calendar-settings-emails__modern-only').forEach(function (n) {
          n.hidden = checked.value === 'plain-text';
        });
      },
      state: function () {
        var checked = one('.sugar-calendar-settings-email-styling .sugar-calendar-image-radio-group__input:checked');
        return { key: 'emails.template', value: checked ? checked.value : null };
      }
    },

    // ════ Admin — Settings › Feeds: jQuery UI Sortable ═════════════════════

    // ─ Feeds: drag and drop, live ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/js/pro-admin-settings.js:48 @verified 2026-09-19 @product sugar-calendar
    // WordPress core's jQuery UI Sortable 1.14.2 on every ul[data-sortable]
    // (the Available Feeds list, src/Pro/Features/CalendarFeeds/Admin/Pages/SettingsFeedsTab.php:126-145),
    // with the plugin's own options (initFeedsSortables, :48-77): axis y,
    // items li, handle [data-handle], cursor grabbing, tolerance pointer,
    // containment parent, distance 2, opacity 0.7, scroll true; its stop
    // callback writes the rows' data-key order into the hidden
    // [data-feeds-order] input just before the list (:68-74). That input is
    // posted by the settings form's Save; there is no AJAX, so nothing is
    // dropped. The captured copy's ui-sortable / ui-sortable-handle classes
    // go first, as the widget's destroy() removes them.
    {
      label: 'feeds-sortable-live',
      event: READY,
      match: function (el) { return el === document.body && !!one('ul[data-sortable]'); },
      apply: function () { feedsLive(); }
    },

    // ════ Admin — Event editor ═════════════════════════════════════════════

    // ─ Registration Form editor: the plugin's React app, live ──────────────
    // @since 2026-09-19 @source sugar-calendar/src/Features/RegistrationForm/Admin/MetaboxSection.php:328 @verified 2026-09-19 @product sugar-calendar
    // The Registration Form section is the plugin's own React app
    // (assets/jsx/build/admin/registration-form.js), enqueued on the event
    // editor with react, react-dom, wp-dom-ready and wp-element and the
    // localized object sugar_calendar_registration_form (MetaboxSection.php:328-365).
    // On dom-ready it renders into #sc-registration-form-editor (createRoot,
    // the build's last lines) from the schema in the hidden
    // #sc_registration_form_schema input, and writes the schema back there
    // as it changes. Here: the same build and WordPress core's React 18.3.1,
    // given the object the capture parked on body[data-snap-l10n]; React's
    // first commit replaces the captured copy in the container. So the
    // Registration Form toggle, the field blocks, Add New Field and the
    // settings behave as the plugin's app does. A snapshot captured before
    // the l10n parking has no object to give it: nothing loads, a console
    // note says so, and the section stays as captured.
    {
      label: 'registration-form-live',
      event: READY,
      match: function (el) { return el === document.body && !!document.getElementById('sc-registration-form-editor'); },
      apply: function () { regformLive(); }
    },

    // ─ Speakers: Add New / Cancel ──────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/speaker.js:343 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (bound at :92, :119): Add New (displayCleanEditForm,
    // :343-363) — the edit form's text and email fields emptied
    // (clearInputFields, :327-335), the error notice hidden (showErrorNotice
    // (false), :499-508), the speaker picker row .hide('fast') (:353), the
    // edit rows .show('fast') (:356), the title field focused, Save disabled
    // while the title is empty (maybeEnableSaveButton, :396-399). Cancel
    // (hideEditForm, :371-388) — the picker row .show('fast'), the edit rows
    // .hide('fast'), the notice hidden, the fields emptied, Add New
    // focused. 'fast' is 200 ms of jQuery's animated show / hide (WO-202H).
    // Save (:407-491) posts sugar_calendar_quick_save_speaker over AJAX: with
    // a title it is not sent (a logged miss); with none it does nothing, as
    // in the plugin (:432-438).
    {
      label: 'speaker-add-new-form',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#speaker-add-new, #speaker-edit-cancel, #speaker-edit-save'); },
      apply: function (el) {
        if (closestTo(el, '#speaker-edit-save')) { speakerSave(); return; }
        speakerForm(!closestTo(el, '#speaker-edit-cancel'));
      },
      state: function () {
        var rows = all('.sugar-calendar-metabox__field-row--speaker_edit');
        return { key: 'event.speakerAddNew', value: rows.some(shown) };
      }
    },

    // ─ Speakers: the form's keys ───────────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/speaker.js:93 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: Enter or Space on Add New opens the form (:93-100); in
    // the form's inputs Enter triggers Save and Escape triggers Cancel
    // (:103-116); a key up in the title field re-checks Save (:123).
    {
      label: 'speaker-add-new-keys',
      event: 'keydown',
      match: function (el, e) {
        if (!e) return false;
        if (el.id === 'speaker-add-new') return e.keyCode === 13 || e.keyCode === 32;
        return is(el, '.sugar-calendar-metabox__field-row--speaker_edit input') && (e.keyCode === 13 || e.keyCode === 27);
      },
      apply: function (el, e) {
        e.preventDefault();
        if (el.id === 'speaker-add-new') { speakerForm(true); return; }
        if (e.keyCode === 13) speakerSave();
        else speakerForm(false);
      }
    },

    // ─ Speakers: Save follows the title ────────────────────────────────────
    // @since 2026-09-19 @source sugar-calendar/assets/pro/admin/js/speaker.js:123 @verified 2026-09-19 @product sugar-calendar
    // Real plugin: keyup on the title field → maybeEnableSaveButton
    // (:396-399), Save disabled while the title is empty.
    {
      label: 'speaker-title-save',
      event: 'keyup',
      match: function (el) { return el.id === 'sugar-calendar-setting-sugarcalendar_speaker_post_title'; },
      apply: function () { speakerSaveState(); }
    },

    // ─ Tickets: Add Another Ticket ─────────────────────────────────────────
    // @since 2026-09-19 @source sc-event-ticketing/sc-event-ticketing/assets/js/event-metabox.js:34 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (sc-event-ticketing 1.7.0): the button is disabled (:41),
    // sc_et_add_ticket is posted (:43-50) and the server answers with a new
    // ticket type's field rows (ajax_add_ticket, sc-event-ticketing/src/Admin/Area.php:437-475:
    // render_ticket_fields( $event, 'temp_' . time() . '_' . wp_rand( 1000, 9999 ), true ),
    // sugar-calendar/includes/common/Features/EventTicketing/includes/admin/meta-box.php:127-279);
    // they go before the button's row (:57), one hidden
    // sc_et_has_fresh_tickets=1 input is added to every form the first time
    // (:60-62), the new Name field takes focus (:65-69) and the button is
    // enabled again (:78-81). No animation. The rows here are that answer
    // as the capture received it (TICKET_ROWS below). A temporary ticket's
    // rows read no event data (Area.php:287-305, get_ticket_data_temporary),
    // so the answer is the same on every editor of this site; only the id
    // differs: time() is the capture's (T12) and the four digits count up
    // from the captured ones, so the ids are deterministic and unique.
    {
      label: 'ticket-add-another',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.button-sc-et-add-ticket'); },
      apply: function (el) { ticketAdd(closestTo(el, '.button-sc-et-add-ticket')); },
      state: function () { return { key: 'event.ticketTypes', value: ticketTypeIds().length }; }
    },

    // ─ Tickets: remove a ticket type ───────────────────────────────────────
    // @since 2026-09-19 @source sc-event-ticketing/sc-event-ticketing/assets/js/event-metabox.js:88 @verified 2026-09-19 @product sugar-calendar
    // Real plugin (delegated on document, :88): the general ticket (id 0 or
    // none) cannot be removed (:95-98); any other opens the plugin's
    // jquery-confirm 3.3.4 dialog with its defaults (setConfirmDefaults,
    // :6-14) and options (:101-158): no title, the remove_ticket_confirm
    // text, the exclamation-circle icon, theme
    // sc-event-ticketing-remove-ticket, a red Remove (Enter) and a Cancel
    // (Escape). Remove: a temporary ticket's rows .hide('slow') and are then
    // removed (:113-118); a saved ticket's rows .hide('slow') and
    // sc_et_remove_ticket is posted (:122-149) — not sent here (a logged
    // miss), the rows stay hidden. Strings: the parked
    // sc_et_admin_event_metabox.strings, else their source text
    // (sc-event-ticketing/src/Admin/Area.php:231-235; the site is en_US). The
    // icon is the plugin's file, vendored (the plugin builds its URL from
    // core_url, which points at the live site).
    {
      label: 'ticket-remove',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.sugar-calendar-metabox__field-row__remove'); },
      apply: function (el) {
        var id = closestTo(el, '.sugar-calendar-metabox__field-row__remove').getAttribute('ticket-type-id');
        if (!id || id === '0') return;
        ticketRemoveConfirm(id);
      }
    }

  ], { product: 'sugar-calendar', file: 'interactivity.js' });

  // ═══ WO-202J — Notify Attendees, Send Email, the preview buttons ═══════
  // Each result is a captured screen the real plugin reaches (DESIGN §5 (a)):
  // a click opens that sibling snapshot in place, or logs a miss that names
  // what is not captured. No result is drawn from invented markup.
  // (The Registration Form's Tickets / RSVP dependency needs no entry: the
  // plugin's own React app, live since WO-202I, is what does it — see the
  // WO-202J report.)

  R.register([

    // ════ Admin — Events: Notify Attendees ═════════════════════════════════

    // ─ Notify Attendees: open the sidebar ──────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/assets/jsx/build/admin/email-notifications.js:1 @verified 2026-09-20 @product sugar-calendar
    // Real plugin (the build is one line; offsets): the toolbar button's
    // jQuery handler (offset 632848) calls d([], type) (632537), which
    // opens the "notify-attendees-form" sidebar and loads its form with
    // email_notifications_get_form_data (AJAX). The sidebar is Framer
    // Motion: the overlay fades in (opacity 0 → 1) and the panel slides in
    // from the right (x 100% → 0), both 0.3 s easeInOut (SidebarStack,
    // 570345; Sidebar, 578936). Here: the sidebar as the capture holds it
    // open over the September month view, with that slide. From any other
    // Events view its screen is not captured: a logged miss.
    {
      label: 'notify-attendees-open',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-btn-notify-attendees'); },
      apply: function () { notifyOpen(); },
      state: function () { return { key: 'events.notifySidebar', value: true }; }
    },

    // ─ Notify Attendees: the sidebar slides in on arrival ──────────────────
    // @since 2026-09-20 @source sugar-calendar/assets/jsx/build/admin/email-notifications.js:1 @verified 2026-09-20 @product sugar-calendar
    // Arriving from the toolbar button (it carries sc_notify=open), the
    // captured sidebar enters the way Framer Motion enters it: overlay
    // opacity 0 → 1, panel translateX(100%) → none, 0.3 s easeInOut
    // (cubic-bezier(0.42, 0, 0.58, 1)), offsets 570345 and 578936.
    {
      label: 'notify-attendees-arrive',
      event: 'snap:params',
      match: function (el) { return el === document.body && R.params()[NOTIFY.param] === 'open' && !!notifyParts(); },
      apply: function () { notifyMotion(notifyParts(), true); }
    },

    // ─ Notify Attendees: close the sidebar ─────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/assets/jsx/build/admin/email-notifications.js:1 @verified 2026-09-20 @product sugar-calendar
    // Real plugin: the × (sidebarClose, CSS module 6521, offset 481925)
    // calls closeSidebar; AnimatePresence plays the exit — the panel slides
    // out to x 100%, the overlay fades to 0, 0.3 s easeInOut — then
    // removeClosedSidebar empties the stack, so the overlay and the panel
    // leave #sugar-calendar-lite-sidebar and only the toaster root stays
    // (exactly what the month view's capture holds there).
    {
      label: 'notify-attendees-close',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-lite-sidebar button.' + NOTIFY_CSS.close); },
      apply: function () { notifyClose(); },
      state: function () { return { key: 'events.notifySidebar', value: false }; }
    },

    // ─ Notify Attendees: an event's own link, the list's bulk action ───────
    // @since 2026-09-20 @source sugar-calendar/assets/jsx/build/admin/email-notifications.js:1 @verified 2026-09-20 @product sugar-calendar
    // Real plugin: a popover's (or the editor footer's) "Notify Attendees"
    // link (offset 633318) and the list view's Notify Attendees bulk action
    // (632900) open the sidebar with those events preselected; its recipients
    // and form come from email_notifications_get_form_data (AJAX). No such
    // sidebar is captured: a logged miss, never the empty form.
    {
      label: 'notify-attendees-preselected',
      event: 'click',
      match: function (el) {
        if (closestTo(el, '[data-sc-notify-event-attendees]')) return true;
        var bulk = document.getElementById('bulk-action-selector-top');
        return !!closestTo(el, '#sugar-calendar-events .sugar-calendar-tablenav #doaction') && !!bulk && bulk.value === 'notify_attendees';
      },
      apply: function (el) {
        var a = closestTo(el, '[data-sc-notify-event-attendees]');
        R.miss(a ? '#notify-attendees-event-' + a.getAttribute('data-sc-notify-event-attendees') : '#notify-attendees-bulk',
          'Notify Attendees with events preselected loads its form over AJAX (email_notifications_get_form_data): not captured');
      }
    },

    // ─ Notify Attendees: Preview ───────────────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/assets/jsx/build/admin/email-notifications.js:1 @verified 2026-09-20 @product sugar-calendar
    // Real plugin: the footer's Preview link (offset 630314) posts
    // email_notifications_store_preview_data, then opens the returned
    // preview_url in a new window. Not captured: a logged miss.
    {
      label: 'notify-attendees-preview',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#sugar-calendar-lite-sidebar a.' + NOTIFY_CSS.preview); },
      apply: function () {
        R.miss('#notify-attendees-preview', 'the preview is stored over AJAX (email_notifications_store_preview_data), then opened in a new window: not captured');
      }
    },

    // ════ Admin — Tickets: Send Email ══════════════════════════════════════

    // ─ Tickets: Send Email (row action) ───────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/includes/common/Features/EventTicketing/src/Admin/Pages/TicketsTab.php:270 @verified 2026-09-20 @product sugar-calendar
    // Real plugin: the row action is a plain link, action=email&ticket[]=N
    // with the list's bulk nonce (includes/admin/tickets-list-table.php:444-460).
    // process_bulk_action (TicketsTab.php:152-315, on admin_init) sends each
    // ticket's email (send_ticket_email, :270-280), then redirects to
    // admin.php?page=sc-event-ticketing&bulk_action_performed=email&
    // affected_count=<sent>&failed_count=<failed> (:301-312), where
    // display_performed_action_notice (:323-460) prints the green
    // `notice notice-success is-dismissible` "N ticket email(s) sent
    // successfully." Here: that success URL (every ticket sent), through
    // the nav map — the captured screen opens, or the miss names the URL.
    // Nothing is sent.
    {
      label: 'ticket-send-email',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.row-actions .email a[href]');
        return !!a && /[?&]action=email(&|$)/.test(a.getAttribute('href') || '');
      },
      apply: function (el) {
        var a = closestTo(el, '.row-actions .email a[href]');
        ticketEmailResult((a.getAttribute('href').match(/[?&]ticket(%5B|\[)/gi) || []).length || 1);
      },
      state: function () { return { key: 'tickets.sendEmail', value: 1 }; }
    },

    // ─ Tickets: Resend Email (bulk action) ─────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/includes/common/Features/EventTicketing/src/Admin/Pages/TicketsTab.php:152 @verified 2026-09-20 @product sugar-calendar
    // Real plugin: the list's bulk action "Resend Email" (value email)
    // submits action=email and the checked ticket[] from its GET form to the
    // same process_bulk_action, so the same redirect follows, affected_count
    // = the tickets sent. Here: that success URL through the nav map.
    {
      label: 'ticket-bulk-email',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '#doaction, #doaction2');
        if (!b || !b.form || !one('input[name="page"][value="sc-event-ticketing"]', b.form)) return false;
        var sel = one(b.id === 'doaction2' ? 'select[name="action2"]' : 'select[name="action"]', b.form);
        return !!sel && sel.value === 'email';
      },
      apply: function (el) {
        var b = closestTo(el, '#doaction, #doaction2');
        var n = all('input[name="ticket[]"]:checked', b.form).length;
        if (!n) {
          // No ticket chosen: process_bulk_action returns at once (:181-196) and
          // the list reloads unchanged — a GET the capture does not hold.
          R.miss('#tickets-bulk-email', 'Resend Email with no ticket selected reloads the list (TicketsTab.php:181-196): not captured');
          return;
        }
        ticketEmailResult(n);
      }
    },

    // ════ Admin — Settings: the preview buttons ════════════════════════════

    // ─ Payments: Payment Success Page / Ticket Details Page → Preview ──────
    // @since 2026-09-20 @source sugar-calendar/assets/js/features/event-ticketing/admin-page-shortcode.js:266 @verified 2026-09-20 @product sugar-calendar
    // Real plugin (trackPageActions, :258-285): a button in its is-preview
    // state opens previewUrl(id) in a new window (:278-281) — the chosen
    // page with sc_preview=1 and the colours and legacy switch on screen
    // (:149-169). A film cannot show a second window, so the captured
    // preview opens in place (the add-event-slot convention, DESIGN
    // amendment WO-202G ruling 5); the browser's Back returns. The capture
    // holds the preview of the saved page and colours only: when the page
    // select or a colour differs from the snapshot as captured, that preview
    // is not captured and the click is a logged miss. An is-embed button
    // (embed(), :180-210) posts sc_et_embed_page_shortcode: a logged miss.
    {
      label: 'payments-page-preview',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.sugar-calendar-setting-page-action'); },
      apply: function (el) { pagePreview(closestTo(el, '.sugar-calendar-setting-page-action')); },
      state: function (el) {
        var b = closestTo(el, '.sugar-calendar-setting-page-action');
        return { key: 'payments.preview', value: b ? pageKey(b) : null };
      }
    },

    // ─ Emails: Preview ─────────────────────────────────────────────────────
    // @since 2026-09-20 @source sugar-calendar/assets/js/admin-settings-emails.js:119 @verified 2026-09-20 @product sugar-calendar
    // Real plugin (onPreviewEmail, :119-143): the button goes busy, a blank
    // window opens, the settings form is posted to the preview creator
    // (buildPreviewPayload :289-318, submitPreview :328-337) and the window
    // is sent to the URL it returns (:347-361). Here: the captured preview
    // opens in place — the Modern template's, or Plain Text's when that card
    // is chosen (the only unsaved change captured). Any other unsaved change
    // (a colour, a header image, another email's editor) makes a preview
    // that is not captured: a logged miss.
    {
      label: 'emails-preview',
      event: 'click',
      match: function (el) { return !!closestTo(el, '[data-sc-email-preview]'); },
      apply: function (el) { emailPreview(closestTo(el, '[data-sc-email-preview]')); },
      state: function () {
        var t = one('input[name="sugar-calendar[email_styling_template]"]:checked');
        return { key: 'emails.preview', value: t ? t.value : null };
      }
    }

  ], { product: 'sugar-calendar', file: 'interactivity.js' });

  // The one-shot READY event (see the section note): on DOMContentLoaded,
  // or a setTimeout(0) when the document has parsed — after core's boot,
  // which was scheduled first.
  function ready() {
    try { document.body.dispatchEvent(new CustomEvent(READY, { bubbles: true })); }
    catch (err) { console.error('[snap] ' + READY, err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else setTimeout(ready, 0);

  // ─── WO-202I helpers: the libraries ────────────────────────────────────
  var LIB = '../_shared/lib/';

  // WordPress's 'jquery' handle: jquery-core + jquery-migrate
  // (wp-includes/script-loader.php:907-909). SnapRuntime.motion 'off' is
  // jQuery.fx.off (DESIGN amendment WO-202H), so the libraries' own jQuery
  // effects follow the switch as it stands when jQuery loads.
  var JQ = null;
  function jquery() {
    if (!JQ) {
      JQ = R.lib([LIB + 'jquery.min.js', LIB + 'jquery-migrate.min.js']).then(function (ok) {
        if (ok && window.jQuery) window.jQuery.fx.off = R.motion === 'off';
        return ok && !!window.jQuery;
      });
    }
    return JQ;
  }

  // 'jquery-ui-core' with the inline 'jQuery.uiBackCompat = true;' WordPress
  // prints before it (script-loader.php:918-919), then 'jquery-ui-mouse' (:945).
  var JQUI = null;
  function jqueryUi() {
    if (!JQUI) {
      JQUI = jquery().then(function (ok) {
        if (!ok) return false;
        window.jQuery.uiBackCompat = true;
        return R.lib([LIB + 'jquery-ui-core.min.js', LIB + 'jquery-ui-mouse.min.js']);
      });
    }
    return JQUI;
  }

  // base() first, then files, in order, each once per page.
  function libAfter(base, files) {
    return base().then(function (ok) { return ok ? R.lib(files) : false; });
  }

  // The plugin's localized objects, parked at capture on body[data-snap-l10n]
  // as { name: { handle, data } } (WO-304 Part B). null when not parked.
  var L10N;
  function l10n(name) {
    if (L10N === undefined) {
      L10N = null;
      var raw = document.body ? document.body.getAttribute('data-snap-l10n') : null;
      if (raw) {
        try { L10N = JSON.parse(raw); } catch (err) { console.error('[snap] data-snap-l10n is not JSON', err); }
      }
    }
    var o = L10N && Object.prototype.hasOwnProperty.call(L10N, name) ? L10N[name] : null;
    return o && o.data ? o.data : null;
  }

  // ─── WO-202I helpers: colour pickers ───────────────────────────────────

  // The palette admin-calendar.js passes (src/Admin/Pages/CalendarAbstract.php:363-372).
  var CALENDAR_PALETTE = ['#fe9e68', '#ff7368', '#df5b9a', '#8659c2', '#5685bd', '#4bb9a7', '#57d466', '#ffc469'];

  function wpPickersLive() {
    libAfter(jqueryUi, [LIB + 'jquery-ui-draggable.min.js', LIB + 'jquery-ui-slider.min.js', LIB + 'jquery.ui.touch-punch.js',
      LIB + 'iris.min.js', LIB + 'wp-hooks.min.js', LIB + 'wp-i18n.min.js', LIB + 'wp-color-picker.min.js']).then(function (ok) {
      var $ = window.jQuery;
      if (!ok || !$ || !$.fn.wpColorPicker) return;
      // term-color.js on the Calendars list (edit-tags.php); admin-calendar.js
      // on Add New / Edit Calendar.
      var listPage = document.body.classList.contains('edit-tags-php');
      all('.wp-picker-container input.wp-color-picker').forEach(function (input) {
        var wrap = closestTo(input, '.wp-picker-container');
        var btn = one('.wp-color-result', wrap);
        var open = !!btn && btn.classList.contains('wp-picker-open');
        wrap.parentNode.replaceChild(input, wrap);                 // _create taken out (:109-161)
        input.classList.remove('wp-color-picker');                  // added at :109
        var $input = $(input);
        if (listPage) $input.wpColorPicker();
        else $input.wpColorPicker({ palettes: CALENDAR_PALETTE });
        if (open) $input.wpColorPicker('open');
      });
    });
  }

  function miniColorsLive() {
    libAfter(jquery, [LIB + 'jquery.minicolors.min.js']).then(function (ok) {
      var $ = window.jQuery;
      if (!ok || !$ || typeof $.fn.minicolors !== 'function') return;
      var SCOPE = '.sugar-calendar-color-scheme';
      var $inputs = $(SCOPE + ' .sugar-calendar-color-picker');
      // The captured copy, through MiniColors' own destroy.
      $inputs.each(function () {
        if ($(this).parent().hasClass('minicolors')) $(this).minicolors('destroy');
      });
      // admin-color-scheme.js:49-64.
      $inputs.each(function () {
        var $input = $(this);
        $input.minicolors({ defaultValue: $input.data('default-color') || '' });
      });
      // trackLegacyToggle, admin-color-scheme.js:22-45.
      var $toggle = $('#sugar-calendar-setting-use_legacy_template');
      var $scheme = $(SCOPE);
      if (!$toggle.length || !$scheme.length) return;
      var sync = function () {
        var legacy = $toggle.is(':checked');
        $scheme.toggleClass(SCOPE.slice(1) + '--disabled', legacy);
        $scheme.children().prop('inert', legacy);
      };
      $toggle.on('change', sync);
      sync();
    });
  }

  // ─── WO-202I helpers: Feeds ────────────────────────────────────────────

  function feedsLive() {
    libAfter(jqueryUi, [LIB + 'jquery-ui-sortable.min.js']).then(function (ok) {
      var $ = window.jQuery;
      if (!ok || !$ || !$.fn.sortable) return;
      $('[data-sortable]').each(function (i, el) {
        var $this = $(el);
        // The captured copy's classes, as destroy() removes them.
        $this.removeClass('ui-sortable ui-sortable-disabled');
        $this.find('.ui-sortable-handle').removeClass('ui-sortable-handle');
        // pro-admin-settings.js:50-76.
        $this.sortable({
          axis: 'y',
          items: 'li',
          handle: '[data-handle]',
          cursor: 'grabbing',
          tolerance: 'pointer',
          containment: 'parent',
          distance: 2,
          opacity: 0.7,
          scroll: true,
          stop: function () {
            var keys = $.map($this.children('li'), function (li) { return $(li).data('key'); });
            $this.prev('[data-feeds-order]').val(keys);
          }
        });
      });
    });
  }

  // ─── WO-202I helpers: Registration Form ────────────────────────────────

  function regformLive() {
    var data = l10n('sugar_calendar_registration_form');
    if (!data) {
      console.info('[snap] registration form: sugar_calendar_registration_form was not parked at capture (body[data-snap-l10n]); the editor stays as captured');
      return;
    }
    R.lib([LIB + 'react.min.js', LIB + 'react-dom.min.js', LIB + 'wp-escape-html.min.js', LIB + 'wp-element.min.js', LIB + 'wp-dom-ready.min.js']).then(function (ok) {
      if (!ok) return false;
      window.sugar_calendar_registration_form = data;          // wp_localize_script's global
      return R.lib([LIB + 'registration-form.js']);
    });
  }

  // ─── WO-202I helpers: Speakers ─────────────────────────────────────────

  var SPEAKER_TITLE = 'sugar-calendar-setting-sugarcalendar_speaker_post_title';

  // displayCleanEditForm / hideEditForm (speaker.js:343-388).
  function speakerForm(open) {
    var pickerRow = all('.sugar-calendar-metabox__field-row.sugar-calendar-metabox__field-row--speaker');
    var editRows = all('.sugar-calendar-metabox__field-row--speaker_edit');
    if (!open) {
      R.show(pickerRow, 'fast');
      R.hide(editRows, 'fast');
    }
    // showErrorNotice( false ), :499-504.
    all('.sugar-calendar-metabox__field-row--speaker_edit .speaker_edit-notice--error').forEach(function (n) { n.classList.add('speaker_edit-notice--error--hidden'); });
    // clearInputFields, :327-335.
    var title = document.getElementById(SPEAKER_TITLE);
    if (title) title.value = '';
    all('.sugar-calendar-metabox__field-row--speaker_edit input[type="text"], .sugar-calendar-metabox__field-row--speaker_edit input[type="email"]').forEach(function (i) { i.value = ''; });
    if (open) {
      R.hide(pickerRow, 'fast');
      R.show(editRows, 'fast');
      if (title) { try { title.focus(); } catch (_) { /* detached */ } }
      speakerSaveState();
      return;
    }
    var add = document.getElementById('speaker-add-new');
    if (add) { try { add.focus(); } catch (_) { /* detached */ } }
  }

  // maybeEnableSaveButton, speaker.js:396-399.
  function speakerSaveState() {
    var title = document.getElementById(SPEAKER_TITLE);
    var save = document.getElementById('speaker-edit-save');
    if (save && title) save.disabled = title.value.length === 0;
  }

  // saveEditForm, speaker.js:407-438: no title, no request; a title would be
  // posted as sugar_calendar_quick_save_speaker (:441) — not sent.
  function speakerSave() {
    var title = document.getElementById(SPEAKER_TITLE);
    if (!title || !title.value) return;
    R.miss('#speaker-edit-save', 'saving a speaker posts sugar_calendar_quick_save_speaker over AJAX (speaker.js:441); not sent from a snapshot');
  }

  // ─── WO-202I helpers: Tickets ──────────────────────────────────────────

  // The rows ajax_add_ticket answered with, as the capture received them
  // (minus the capture's empty style attributes); {ID} is the temporary id.
  // SOURCE: products/sugar-calendar/snapshots/admin-event-edit-16-paint-and-sip--tickets-add-another (the [ticket-type-id="temp_1789831336_9946"] rows before the Add Another Ticket row)
  var TICKET_ROWS =
    "<div class=\"sugar-calendar-metabox__field-row sugar-calendar-metabox__field-row--ticket_name\" ticket-type-id=\"{ID}\">\n" +
    "\t\t\t<label for=\"ticket_name\">Name</label>\n" +
    "\n" +
    "\t\t\t<div class=\"sugar-calendar-metabox__field\">\n" +
    "\t\t\t\t<input type=\"text\" name=\"sugar_calendar_event_ticketing_new_tickets[{ID}][ticket_name]\" value=\"\">\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t\t\t\t\t\t<span class=\"sugar-calendar-metabox__field-row__remove\" ticket-type-id=\"{ID}\"></span>\n" +
    "\t\t\t\t\t</div>\n" +
    "\n" +
    "\t\t\n" +
    "\t\t<div class=\"sugar-calendar-metabox__field-row sugar-calendar-metabox__field-row--ticket_description\" ticket-type-id=\"{ID}\">\n" +
    "\t\t\t<label for=\"ticket_description\">Description</label>\n" +
    "\n" +
    "\t\t\t<div class=\"sugar-calendar-metabox__field\">\n" +
    "\t\t\t\t<input type=\"text\" name=\"sugar_calendar_event_ticketing_new_tickets[{ID}][ticket_description]\" value=\"\">\n" +
    "\t\t\t</div>\n" +
    "\t\t</div>\n" +
    "\t\t\n" +
    "\t\n" +
    "\t<div class=\"sugar-calendar-metabox__field-row sugar-calendar-metabox__field-row--ticket_price\" ticket-type-id=\"{ID}\">\n" +
    "\t\t<label for=\"ticket_price\">Price</label>\n" +
    "\t\t<div class=\"sugar-calendar-metabox__field\">\n" +
    "\t\t\t<input name=\"sugar_calendar_event_ticketing_new_tickets[{ID}][ticket_price]\" type=\"text\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"0.00\" pattern=\"^[0-9]{1,18}([,.][0-9]{1,9})?$\" data-lpignore=\"true\" value=\"0.00\" disabled=\"\">\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t\n" +
    "\t<div class=\"sugar-calendar-metabox__field-row sugar-calendar-metabox__field-row--ticket_limit_capacity sugar-calendar-metabox__field-row--ticket_limit_capacity-disabled\" ticket-type-id=\"{ID}\">\n" +
    "\t\t<label for=\"ticket_limit_capacity_{ID}\">Limit Capacity</label>\n" +
    "\t\t<div class=\"sugar-calendar-metabox__field\">\n" +
    "\t\t\t\n" +
    "        <span class=\"sugar-calendar-toggle-control\">\n" +
    "\t\t\t<input type=\"checkbox\" id=\"ticket_limit_capacity_{ID}\" name=\"sugar_calendar_event_ticketing_new_tickets[{ID}][ticket_limit_capacity]\" value=\"1\">\n" +
    "\t\t\t<label class=\"sugar-calendar-toggle-control-icon\" for=\"ticket_limit_capacity_{ID}\"></label>\n" +
    "            <label class=\"sugar-calendar-toggle-control-status sugar-calendar-toggle-control-status-on\" for=\"ticket_limit_capacity_{ID}\">ON</label>\n" +
    "            <label class=\"sugar-calendar-toggle-control-status sugar-calendar-toggle-control-status-off\" for=\"ticket_limit_capacity_{ID}\">OFF</label>\n" +
    "\t\t</span>\n" +
    "\n" +
    "\t\t\n" +
    "\t\t\n" +
    "\t\t\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t\n" +
    "\t<div class=\"sugar-calendar-metabox__field-row sugar-calendar-metabox__field-row--ticket_quantity sugar-calendar-metabox__field-row--ticket_quantity-general\" ticket-type-id=\"{ID}\">\n" +
    "\t\t<label for=\"ticket_quantity\">Capacity</label>\n" +
    "\t\t<div class=\"sugar-calendar-metabox__field\">\n" +
    "\t\t\t<input name=\"sugar_calendar_event_ticketing_new_tickets[{ID}][ticket_quantity]\" type=\"number\" inputmode=\"numeric\" autocomplete=\"off\" min=\"1\" step=\"1\" placeholder=\"0\" pattern=\"[0-9]\" data-lpignore=\"true\" value=\"100\">\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t\t<div class=\"sugar-calendar-metabox__field-row__sep sugar-calendar-metabox__field-row__sep\" ticket-type-id=\"{ID}\"></div>";
  // 'temp_' . time() . '_' . wp_rand( 1000, 9999 ) (Area.php:458): the
  // capture's time() and a count up from the captured four digits.
  var TICKET_TIME = 1789831336;
  var TICKET_SEQ = { next: 9946 };

  function ticketTypeIds() {
    var ids = [];
    all('.sugar-calendar-metabox__field-row--ticket_name[ticket-type-id]').forEach(function (r) {
      var id = r.getAttribute('ticket-type-id');
      if (ids.indexOf(id) === -1) ids.push(id);
    });
    return ids;
  }

  // The add-ticket click handler, event-metabox.js:34-83, answered locally.
  function ticketAdd(btn) {
    var row = btn ? closestTo(btn, '.sugar-calendar-metabox__field-row') : null;
    if (!row || !row.parentNode) return;
    btn.disabled = true;                                           // :41
    var id;
    do { id = 'temp_' + TICKET_TIME + '_' + (TICKET_SEQ.next++); } while (one('[ticket-type-id="' + id + '"]'));
    var tpl = document.createElement('template');
    tpl.innerHTML = TICKET_ROWS.split('{ID}').join(id);
    var nodes = Array.prototype.slice.call(tpl.content.childNodes);
    row.parentNode.insertBefore(tpl.content, row);                 // $buttonRow.before(), :57
    if (!one('input[name="sc_et_has_fresh_tickets"]')) {           // :60-62, every form
      all('form').forEach(function (f) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'sc_et_has_fresh_tickets';
        input.value = '1';
        f.appendChild(input);
      });
    }
    nodes.forEach(function (n) {                                   // :65-69
      if (n.nodeType === 1 && n.classList.contains('sugar-calendar-metabox__field-row--ticket_name')) {
        var input = one('input', n);
        if (input) { try { input.focus(); } catch (_) { /* detached */ } }
      }
    });
    btn.disabled = false;                                          // complete, :78-81
  }

  // The remove dialog, event-metabox.js:88-159.
  var TICKET_STRINGS = {                                           // sc-event-ticketing/src/Admin/Area.php:231-235
    remove_ticket_confirm: 'Are you sure you want to remove this ticket type?',
    cancel: 'Cancel',
    remove: 'Remove'
  };
  function ticketRemoveConfirm(id) {
    libAfter(jquery, [LIB + 'jquery-confirm.min.js']).then(function (ok) {
      var $ = window.jQuery;
      if (!ok || !$ || typeof $.confirm !== 'function') return;
      var parked = l10n('sc_et_admin_event_metabox');
      var strings = parked && parked.strings ? parked.strings : TICKET_STRINGS;
      // setConfirmDefaults, :6-14.
      window.jconfirm.defaults = {
        typeAnimated: false,
        draggable: false,
        animateFromElement: false,
        boxWidth: '400px',
        useBootstrap: false
      };
      $.confirm({
        title: false,
        content: strings.remove_ticket_confirm,
        icon: '"></i><img src="' + LIB + 'exclamation-circle.svg"><i class="',   // getIcon, :22-26
        theme: 'sc-event-ticketing-remove-ticket',
        buttons: {
          remove: {
            text: strings.remove,
            btnClass: 'sugar-calendar-btn sugar-calendar-btn-lg sugar-calendar-btn-red',
            keys: ['enter'],
            action: function () {
              var rows = all('[ticket-type-id="' + id + '"]');
              if (id.indexOf('temp_') === 0) {                         // :113-118
                R.hide(rows, 'slow', function () {
                  all('[ticket-type-id="' + id + '"]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
                });
                return;
              }
              R.hide(rows, 'slow');                                    // :122
              R.miss('.sugar-calendar-metabox__field-row__remove', 'removing a saved ticket type posts sc_et_remove_ticket (event-metabox.js:125-149); not sent from a snapshot');
            }
          },
          cancel: {
            text: strings.cancel,
            btnClass: 'sugar-calendar-btn sugar-calendar-btn-lg sugar-calendar-btn-secondary',
            keys: ['esc']
          }
        }
      });
    });
  }

  // ─── WO-202J helpers: Notify Attendees ─────────────────────────────────

  // The sidebar captured open over the September month view: W2's capture
  // (capture-plans/p3-states.json) clicks the toolbar button and waits for
  // the form. Its slug is the renamed one of the WO-202I B-1 fix; the old
  // admin-events--notify-open folder was pruned on 2026-09-20, so the state
  // arrives when W2 re-runs p3-states.
  // SOURCE: products/sugar-calendar/snapshots/admin-events--month-notify-open (#sugar-calendar-lite-sidebar: the overlay, the aside, the toaster root)
  var NOTIFY = {
    state: 'admin-events--month-notify-open',
    from: ['admin-events--month', 'admin-events--month-popover'],
    param: 'sc_notify'
  };
  // CSS-module class names of assets/jsx/build/admin/email-notifications.js:
  // sidebarOverlay (module 4481, offset 466197), sidebar and sidebarClose
  // (module 6521, offset 481925), previewLink (module 4819, offset 467269).
  var NOTIFY_CSS = {
    overlay: 'A3xDRg8zItsvgBBQru2y',
    panel: 'g0mPS8H63_6NQP10mFYp',
    close: 'tIgSG0EfflDFR9IXvBhe',
    preview: 'gJA2aSsuSPxCUhU2mos0'
  };
  // Framer Motion's transition on both (offsets 570345, 578936):
  // { duration: .3, ease: "easeInOut" } — easeInOut is cubic-bezier(0.42, 0, 0.58, 1).
  var NOTIFY_MOTION = { ms: 300, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' };
  var NOTIFY_STASH = null;          // a sidebar closed on this page, for opening it again

  function notifyParts() {
    var root = document.getElementById('sugar-calendar-lite-sidebar');
    var overlay = root ? one('.' + NOTIFY_CSS.overlay, root) : null;
    var panel = root ? one('aside.' + NOTIFY_CSS.panel, root) : null;
    return overlay && panel ? { root: root, overlay: overlay, panel: panel } : null;
  }

  // Enter (overlay opacity 0 → 1, panel translateX(100%) → none) or exit
  // (the reverse), then done. Web Animations with a fixed duration; with
  // motion off both end at once.
  function notifyMotion(p, entering, done) {
    var anims = [];
    if (R.motion !== 'off' && typeof p.panel.animate === 'function') {
      var o = { duration: NOTIFY_MOTION.ms, easing: NOTIFY_MOTION.easing, fill: 'both' };
      try {
        anims.push(p.overlay.animate(entering ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], o));
        anims.push(p.panel.animate(entering ? [{ transform: 'translateX(100%)' }, { transform: 'none' }]
          : [{ transform: 'none' }, { transform: 'translateX(100%)' }], o));
      } catch (_) { /* no Web Animations: the end state below */ }
    }
    R.wait(NOTIFY_MOTION.ms, function () {
      if (typeof done === 'function') done();
      anims.forEach(function (a) { try { a.cancel(); } catch (_) { /* gone */ } });
    });
  }

  // The toolbar button (d([], type), offset 632537).
  function notifyOpen() {
    var slug = R.currentSlug();
    if (slug === NOTIFY.state) {
      if (notifyParts() || !NOTIFY_STASH) return;          // open already: its overlay covers the button
      var root = document.getElementById('sugar-calendar-lite-sidebar');
      var p = NOTIFY_STASH;
      NOTIFY_STASH = null;
      root.insertBefore(p.overlay, root.firstChild);
      root.insertBefore(p.panel, p.overlay.nextSibling);
      p.panel.__snapClosing = false;
      notifyMotion({ overlay: p.overlay, panel: p.panel }, true);
      return;
    }
    if (NOTIFY.from.indexOf(slug) === -1) {
      R.miss('#sugar-calendar-btn-notify-attendees', 'the Notify Attendees sidebar is captured over the September month view only (' + NOTIFY.state + '); over ' + slug + ' it is not captured');
      return;
    }
    var q = {};
    q[NOTIFY.param] = 'open';
    R.goto(NOTIFY.state, { params: q });
  }

  // closeSidebar → exit → removeClosedSidebar (offsets 579865, 570345).
  function notifyClose() {
    var p = notifyParts();
    if (!p || p.panel.__snapClosing) return;
    p.panel.__snapClosing = true;
    notifyMotion(p, false, function () {
      if (p.overlay.parentNode) p.overlay.parentNode.removeChild(p.overlay);
      if (p.panel.parentNode) p.panel.parentNode.removeChild(p.panel);
      NOTIFY_STASH = { overlay: p.overlay, panel: p.panel };
    });
  }

  // ─── WO-202J helpers: Tickets → Send Email ─────────────────────────────

  // process_bulk_action's redirect, every email sent (TicketsTab.php:301-312).
  function ticketEmailResult(n) {
    var url = 'admin.php?page=sc-event-ticketing&bulk_action_performed=email&affected_count=' + n + '&failed_count=0';
    var hit = R.resolve(url);
    if (hit) { R.goto(hit.slug, hit.params.length ? { params: hit.params } : null); return; }
    R.miss(url, 'the Tickets list after Send Email, with its "' + n + ' ticket email' + (n === 1 ? '' : 's')
      + ' sent successfully." notice (TicketsTab.php:333-358), is not captured');
  }

  // ─── WO-202J helpers: the settings previews ────────────────────────────

  // The preview document each Payments row opens, as W2 captured it with
  // the saved page and colours (the eval stubs window.open, p3-states.json).
  var PAGE_PREVIEWS = {
    // SOURCE: products/sugar-calendar/snapshots/frontend-ticket-receipt--preview (meta.json finalUrl /ticket-receipt/?sc_preview=1&…)
    receipt_page: 'frontend-ticket-receipt--preview',
    // SOURCE: products/sugar-calendar/snapshots/frontend-ticket-details--preview (meta.json finalUrl /ticket-details/?sc_preview=1&…)
    ticket_page: 'frontend-ticket-details--preview'
  };
  // The Emails preview, by the template card chosen, for the one Preview
  // button the capture clicked (route "main", the ticket email). W2's plan
  // renamed both admin-settings-emails--preview[--plain-text] (the WO-202I
  // B-2 fix) and pruned the old folders; they land with p3-states.
  // SOURCE: products/sugar-calendar/snapshots/admin-settings-emails--preview (meta.json finalUrl admin.php?sc_action=sc_email_preview…)
  // SOURCE: products/sugar-calendar/snapshots/admin-settings-emails--preview--plain-text (the same, Plain Text chosen first)
  var EMAIL_PREVIEWS = { modern: 'admin-settings-emails--preview', 'plain-text': 'admin-settings-emails--preview--plain-text' };
  var EMAIL_PREVIEW_BUTTON = { route: 'main', email: 'sc_et_ticket_email' };
  var TEMPLATE_FIELD = 'sugar-calendar[email_styling_template]';

  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // settingKey + selectFor (admin-page-shortcode.js:36-55).
  function pageKey(btn) {
    var row = closestTo(btn, '.sugar-calendar-setting-row');
    var sel = row ? one('select', row) : null;
    return ((sel && sel.getAttribute('name')) || '').replace(/^sugar-calendar\[/, '').replace(/\]$/, '');
  }

  // Is this control's value still the one the capture froze (its default)?
  function asCaptured(el) {
    var t = (el.type || '').toLowerCase();
    if (t === 'checkbox' || t === 'radio') return el.checked === el.defaultChecked;
    if (el.localName === 'select') {
      if (el.multiple) return Array.prototype.every.call(el.options, function (o) { return o.selected === o.defaultSelected; });
      var first = 0;                                   // no selected attribute: the browser picks the first option
      Array.prototype.forEach.call(el.options, function (o, i) { if (o.defaultSelected) first = i; });
      return el.selectedIndex === first;
    }
    return String(el.value).toLowerCase() === String(el.defaultValue).toLowerCase();
  }

  // The names of a form's controls whose value is not the captured one.
  function formChanges(form, ignore) {
    var out = [];
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.name || f.disabled || ignore.indexOf(f.name) !== -1) return;
      var t = (f.type || '').toLowerCase();
      if (t === 'submit' || t === 'button' || t === 'image' || t === 'reset' || t === 'file') return;
      if (!asCaptured(f) && out.indexOf(f.name) === -1) out.push(f.name);
    });
    return out;
  }

  function pagePreview(btn) {
    var row = closestTo(btn, '.sugar-calendar-setting-row');
    var sel = row ? one('select', row) : null;
    var id = sel ? sel.value : '';
    var key = pageKey(btn);
    if (!id || !key) return;                                          // :274-276
    if (!btn.classList.contains('is-preview')) {
      R.miss('#page-embed-' + key, 'Embed adds the shortcode to the page over AJAX (sc_et_embed_page_shortcode, admin-page-shortcode.js:180-210): not sent from a snapshot');
      return;
    }
    // What previewUrl(id) carries (:149-169): the page, the colours, the legacy switch.
    var carried = [sel].concat(all('.sugar-calendar-color-scheme .sugar-calendar-color-picker'), all('#sugar-calendar-setting-use_legacy_template'));
    var changed = carried.filter(function (el) { return !asCaptured(el); }).map(function (el) { return el.name || el.id; });
    if (!hasOwn(PAGE_PREVIEWS, key) || changed.length) {
      R.miss('?page_id=' + id + '&sc_preview=1', 'the ' + key + ' preview ' + (changed.length ? 'with unsaved ' + changed.join(', ') : '') + ' is not captured');
      return;
    }
    R.goto(PAGE_PREVIEWS[key]);
  }

  function emailPreview(btn) {
    if (btn.getAttribute('aria-busy') === 'true') return;           // :124-126
    var route = btn.getAttribute('data-sc-email-preview');
    var email = btn.getAttribute('data-email-id');
    var form = closestTo(btn, 'form');
    var tpl = one('input[name="' + TEMPLATE_FIELD + '"]:checked', form || document);
    var changed = form ? formChanges(form, [TEMPLATE_FIELD]) : [];
    var slug = tpl && hasOwn(EMAIL_PREVIEWS, tpl.value) ? EMAIL_PREVIEWS[tpl.value] : null;
    if (route !== EMAIL_PREVIEW_BUTTON.route || email !== EMAIL_PREVIEW_BUTTON.email || !slug || changed.length) {
      R.miss('#email-preview-' + route + '-' + email, 'the preview of ' + email + (changed.length ? ' with unsaved ' + changed.slice(0, 3).join(', ') : '') + ' is not captured');
      return;
    }
    R.goto(slug);
  }

  // ─── frontend helpers ──────────────────────────────────────────────────

  var BLOCK_BUTTONS = '.sugar-calendar-block__controls__left__date, .sugar-calendar-block__controls__right__settings__btn, .sugar-calendar-block__controls__right__view__btn';
  var BLOCK_POPOVERS = {
    month_selector: '.sugar-calendar-block__popover__month_selector',
    calendar_selector: '.sugar-calendar-block__popover__calendar_selector',
    display_selector: '.sugar-calendar-block__popover__display_selector'
  };
  // additionalAttendeesIdCount, single-event.js:162 (rows at load + 1).
  var RSVP_ROWS = { next: null };

  // The block page in each display mode, as the frontend capture plan names it.
  var BLOCK_VIEWS = { month: 'frontend-calendar-block--month', week: 'frontend-calendar-block--week', day: 'frontend-calendar-block--day' };

  function blockOf(el) { return closestTo(el, '.sugar-calendar-block, .sugar-calendar-event-list-block'); }
  function blockKey(btn) {
    if (btn.classList.contains('sugar-calendar-block__controls__right__settings__btn')) return 'calendar_selector';
    if (btn.classList.contains('sugar-calendar-block__controls__right__view__btn')) return 'display_selector';
    return 'month_selector';
  }

  // hideAllPopovers, sugar-calendar.js:32-47 (scope = one block, or the page).
  function blockHideAll(scope) {
    all('.sugar-calendar-block__popover', scope).forEach(function (p) {
      p.classList.remove('sugar-calendar-block__controls__settings__btn_active');
      show(p, false);
    });
    all('.sugar-calendar-block__controls__settings__btn, .sugar-calendar-block__controls__left__date', scope).forEach(function (b) {
      b.classList.remove('sugar-calendar-block__controls__settings__btn_active');
    });
    document.body.classList.remove('sugar-calendar-block__popovers__active');
  }

  // show, sugar-calendar.js:356-400. Floating UI computePosition (strategy
  // absolute: left / top in the popover's offsetParent) with offset(10),
  // shift() and, on desktop, flip() (best fit of bottom and top).
  function blockShow(btn, pop, key) {
    btn.classList.add('sugar-calendar-block__controls__settings__btn_active');
    show(pop, true);
    document.body.classList.add('sugar-calendar-block__popovers__active');
    var end = key === 'calendar_selector';
    var ref = btn.getBoundingClientRect();
    var fl = pop.getBoundingClientRect();
    var op = pop.offsetParent || document.documentElement;
    var o = op.getBoundingClientRect();
    var ox = o.left + op.clientLeft - op.scrollLeft;
    var oy = o.top + op.clientTop - op.scrollTop;
    if (op === document.body && getComputedStyle(op).position === 'static') { ox = -window.pageXOffset; oy = -window.pageYOffset; }
    var vx = end ? ref.right - fl.width : ref.left;
    var vw = document.documentElement.clientWidth;
    vx = Math.min(Math.max(vx, 0), Math.max(0, vw - fl.width));
    var vh = document.documentElement.clientHeight;
    var below = ref.bottom + 10;
    var above = ref.top - 10 - fl.height;
    var vy = below;
    if (window.innerWidth >= 768 && below + fl.height > vh) {
      var overBelow = below + fl.height - vh;
      var overAbove = -above;
      if (overAbove < overBelow) vy = above;
    }
    pop.style.left = (vx - ox) + 'px';
    pop.style.top = (vy - oy) + 'px';
  }

  function filterSection(el) {
    var sec = closestTo(el, '.sugar-calendar-block__popover__calendar_selector__container > *');
    return sec && one('.sugar-calendar-block__popover__calendar_selector__container__heading', sec) ? sec : null;
  }
  function filterSections(container) {
    return Array.prototype.filter.call(container.children, function (c) {
      return !!one('.sugar-calendar-block__popover__calendar_selector__container__heading', c);
    });
  }

  function modalTarget(t) {
    var sel = t.getAttribute('data-target') || t.getAttribute('href') || '';
    if (sel.charAt(0) !== '#') return null;
    var m = document.getElementById(sel.slice(1));
    return m && m.classList.contains('modal') ? m : null;
  }

  // Bootstrap 4.0.0 Modal (features/event-ticketing/frontend/bootstrap.js:6,
  // minified; character offsets in the file). The backdrop is Bootstrap's own
  // node; the RSVP and ticket open states are captured with it:
  // SOURCE: products/sugar-calendar/snapshots/frontend-rsvp-modal (body > div.modal-backdrop.show — the RSVP modal has no .fade)
  // SOURCE: products/sugar-calendar/snapshots/frontend-ticket-checkout (div.modal.fade.show, display:block — its backdrop also gets .fade)
  // Timing (WO-202H audit). show (offset 22808; `onShow` = its show.bs.modal
  // event): body.modal-open, then _showBackdrop (26113) appends the backdrop
  // and adds .show; for a .fade modal Bootstrap waits for the backdrop's
  // transition — emulateTransitionEnd(150) (26691): the plugin's CSS gives
  // the backdrop none, so 150 ms — before _showElement (24541): display
  // block, reflow, .show (the dialog's own .3s slide is CSS), focus once the
  // slide ends (emulateTransitionEnd(300)). hide (23530): .show goes; for a
  // .fade modal _hideModal (25739) waits for the dialog's 300 ms slide
  // (24086), then display:none, then the backdrop loses .show and is removed
  // 150 ms later with body.modal-open. Without .fade (the RSVP modals) every
  // step is immediate. _isShown / _isTransitioning guard both ways; a modal
  // captured open counts as shown.
  function bsState(m) {
    if (!m._snapBs) m._snapBs = { shown: m.classList.contains('show'), busy: false };
    return m._snapBs;
  }
  function bsShow(m, onShow) {
    if (!m) return;
    var st = bsState(m);
    if (st.shown || st.busy) return;
    if (typeof onShow === 'function') onShow();
    var fade = m.classList.contains('fade');
    st.shown = true;
    st.busy = fade;
    document.body.classList.add('modal-open');
    var back = document.createElement('div');
    back.className = 'modal-backdrop' + (fade ? ' fade' : '');
    document.body.appendChild(back);
    if (fade) void back.offsetHeight;                     // Util.reflow
    back.classList.add('show');
    R.wait(fade ? 150 : 0, function () {
      m.style.display = 'block';
      R.clearBaked(m);
      m.removeAttribute('aria-hidden');
      m.scrollTop = 0;
      if (fade) void m.offsetHeight;                      // Util.reflow before .show
      m.classList.add('show');
      R.wait(fade ? 300 : 0, function () {
        st.busy = false;
        try { m.focus(); } catch (_) { /* detached */ }
      });
    });
  }
  function bsHide(m) {
    if (!m) return;
    var st = bsState(m);
    if (!st.shown || st.busy) return;
    if (m.id === 'sc-rsvp-frontend-modal__response') rsvpModalHide();
    var fade = m.classList.contains('fade');
    st.shown = false;
    st.busy = fade;
    m.classList.remove('show');
    R.wait(fade ? 300 : 0, function () {
      m.style.display = 'none';
      m.setAttribute('aria-hidden', 'true');
      st.busy = false;
      var backs = all('body > .modal-backdrop');
      backs.forEach(function (b) { b.classList.remove('show'); });
      R.wait(fade ? 150 : 0, function () {
        backs.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
        document.body.classList.remove('modal-open');
      });
    });
  }

  // showModalCb / hideModalCb, sc-rsvp/assets/js/frontend/single-event.js:417-475.
  function rsvpModalShow(btn) {
    var going = btn.getAttribute('data-going');
    if (going === null) return;
    var submit = document.getElementById('sc-rsvp-frontend-modal__response__submit');
    var returning = !!submit && (submit.getAttribute('data-rsvp-id') || '0') !== '0';
    var extra = all('.sc-rsvp-frontend-modal__response__form__body__content__additional-attendees');
    var msg = all('.sc-rsvp-frontend-modal__response__msg');
    klass(extra, 'sc-rsvp__hide', going === '1');
    if (returning) return;
    msg.forEach(function (x) {
      x.classList.add(going === '1' ? 'sc-rsvp-frontend-modal__response__msg-going' : 'sc-rsvp-frontend-modal__response__msg-not-going');
      var span = one('span', x);
      if (span) span.textContent = going === '1' ? 'Going' : 'Not Going';
    });
  }
  function rsvpModalHide() {
    var submit = document.getElementById('sc-rsvp-frontend-modal__response__submit');
    if (submit && (submit.getAttribute('data-rsvp-id') || '0') !== '0') return;
    all('.sc-rsvp-frontend-modal__response__msg').forEach(function (x) {
      x.classList.remove('sc-rsvp-frontend-modal__response__msg-going');
      x.classList.remove('sc-rsvp-frontend-modal__response__msg-not-going');
      var span = one('span', x);
      if (span) span.textContent = '';
    });
  }

  // ─── helpers the entries share ─────────────────────────────────────────

  // setEndType, assets/pro/admin/js/event-edit.js:636-651.
  function endType() {
    var blocks = all(BOX + ' .end-repeat-type');
    blocks.forEach(function (b) {
      all('input', b).forEach(function (i) { if (i.name !== 'recurrence_end_type') i.disabled = true; });
    });
    blocks.forEach(function (b) {
      var radio = all('input[name="recurrence_end_type"]', b).filter(function (i) { return i.checked && i.parentElement === b; })[0];
      if (!radio) return;
      all('input', b).forEach(function (i) { if (i.name !== 'recurrence_end_type') i.disabled = false; });
    });
  }

  // spam_prevention_methods, sc-rsvp/src/Admin/Settings/RsvpTab.php:504-531 —
  // the plugin localizes them at :72 and the card click writes them (:159-161).
  var RSVP_METHODS = {
    grecaptcha: '<p>reCAPTCHA is a free anti-spam service from Google which helps to protect your website from spam and abuse while letting real people pass through with ease.</p>',
    cfturnstile: '<p>Cloudflare Turnstile is a free, CAPTCHA-like service for preventing form spam while protecting data privacy. It offers a user-friendly experience by confirming visitors are real humans without requiring them to solve puzzles or math questions.</p>'
      + '<p>For more details on how Turnstile works, as well as a step by step setup guide, please check out our <a href="https://sugarcalendar.com/docs/?utm_source=WordPress&amp;utm_medium=plugin-settings-rsvp&amp;utm_campaign=plugin&amp;utm_locale=en_us&amp;utm_content=documentation" target="_blank">documentation</a>.</p>',
    none: '<p>No spam prevention will be applied to your RSVP forms. This option provides the simplest user experience but offers no protection against automated submissions.</p>'
  };

  // updatePreview, settings-rsvp-tab.js:86-90; the text is
  // captcha_preview_save_instruction, sc-rsvp/src/Admin/Settings/RsvpTab.php:71.
  function rsvpPreviewStale() {
    klass(document.getElementById('sc-rsvp__admin__recaptcha-preview'), 'sc-rsvp__hide', false);
    var desc = document.getElementById('sc-rsvp__admin__recaptcha-preview__description');
    if (desc) desc.textContent = 'Please save settings to generate a preview of your CAPTCHA here.';
  }

  // A GET form's URL, the way the browser builds it on submit.
  function getFormUrl(form) {
    if ((form.getAttribute('method') || 'get').toLowerCase() !== 'get') return null;
    var base = R.navMap() ? currentPageUrl() : null;
    var action = form.getAttribute('action');
    var u;
    try { u = new URL(action || base || '', base || undefined); } catch (_) { return null; }
    var q = [];
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.name || f.disabled) return;
      var t = (f.type || '').toLowerCase();
      if (t === 'submit' || t === 'button' || t === 'image' || t === 'reset' || t === 'file') return;
      if ((t === 'checkbox' || t === 'radio') && !f.checked) return;
      if (f.localName === 'select' && f.multiple) {
        Array.prototype.forEach.call(f.options, function (o) { if (o.selected) q.push([f.name, o.value]); });
        return;
      }
      q.push([f.name, f.value]);
    });
    return u.origin + u.pathname + '?' + q.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
  }

  // The live URL this snapshot shows: its own key in the nav map.
  function currentPageUrl() {
    var m = R.navMap();
    var slug = R.currentSlug();
    for (var k in m.k) {
      if (Object.prototype.hasOwnProperty.call(m.k, k) && m.k[k] === slug) return 'http://snapshot.invalid/wp-admin/' + k;
    }
    return 'http://snapshot.invalid/wp-admin/admin.php';
  }

  function set(id, value) { var e = document.getElementById(id); if (e) e.value = value; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // PHP DateTime('Y-m-d') rolls an overflowing day into the next month
  // (2026-02-30 → 2026-03-02). Integer civil-date arithmetic, no clock.
  function civilNormalise(y, m, d) {
    var dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    while (d > dim[m - 1]) { d -= dim[m - 1]; m += 1; if (m > 12) { m = 1; y += 1; dim[1] = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28; } }
    return y + '-' + pad(m) + '-' + pad(d);
  }
}());
