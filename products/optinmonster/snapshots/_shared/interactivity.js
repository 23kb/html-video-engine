/**
 * OptinMonster (WordPress plugin) snapshot transitions.
 *
 * Third of the three script tags tools/link-interactivity-script.js injects:
 *   ../../../_runtime/core.js  →  ../_shared/nav.js  →  this file.
 * core.js defines window.SnapRuntime during parse, so it is here by the time
 * this IIFE runs.
 *
 * Entries keep the shape { label, event, match(el), apply(el) } and each block
 * opens with a provenance banner that tools/field-state.js parses:
 *
 *   // ─ Quick Stats date dropdown ──────────────────────────────────────────
 *   // @since 2026-09-27 @source optinmonster/vue/src/components/core/DropdownSelect.vue:3 @verified 2026-09-27 @product optinmonster
 *
 * @source is a real optinmonster/<path>:<line> in the plugin on the capture Mac
 * (v2.17.1, un-minified vue/src). `@source synthetic` is banned. Every entry
 * mirrors what the plugin's own Vue code does and has a case in
 * products/optinmonster/qc/parity.json.
 *
 * The plugin is one Vue 2.7 SPA. Two rules follow from that (DESIGN WO-202J):
 *  - v-show is a display toggle (core toggleTarget, mode 'display');
 *  - v-if renders a node only in some states. A node this snapshot holds is
 *    taken out and put back; a node it never held is its captured
 *    `--<state>` sibling, reached with SnapRuntime.goto(), or a logged miss.
 * Every modal is vue-js-modal 1.3.34 (vue/node_modules/vue-js-modal): the
 * overlay is v-if, so a modal opens by going to its captured sibling and
 * closes in place.
 *
 * What is NOT wired, and why: products/optinmonster/qc/interactivity-notes.md.
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // ─── helpers ─────────────────────────────────────────────────────────────
  function closestTo(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function is(el, sel) { try { return !!el && !!el.matches && el.matches(sel); } catch (_) { return false; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function text(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function slug() { return R.currentSlug(); }
  function baseOf(s) { return String(s || '').split('--')[0]; }
  function shown(el) { return !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none'; }
  // A link that goes somewhere real (not "#"): core's navigation owns it.
  function realLink(el) {
    var a = closestTo(el, 'a[href]');
    return !!a && (a.getAttribute('href') || '').charAt(0) !== '#';
  }
  // ─── QC round 1 additions (Windows, 2026-09-27) ───────────────────────────
  // vue-js-modal writes the box position in px when it opens (top/left from the
  // 1440×900 capture viewport: vue-js-modal/src/Modal.vue). Any other viewport
  // shows the box off-centre. Centre it horizontally from CSS; the captured
  // top stays (the library's own vertical placement).
  (function () {
    var s = document.createElement('style');
    s.setAttribute('data-snap', 'modal-centre');
    s.textContent = '.v--modal-overlay .v--modal-box{left:50%!important;transform:translateX(-50%)}';
    (document.head || document.documentElement).appendChild(s);
  }());

  // The web app pack. The plugin's admin pages link into the app (Edit,
  // Analytics, Set Schedule, Start Building); those links resolve to the
  // app pack's captures through R.goto(slug, { pack }).
  var APP_PACK = 'optinmonster-app';
  // The campaign whose row modals were captured (MODAL_SNAPSHOTS keys).
  var CAPTURED_CAMPAIGN = 'og58etphgug990yklomy';

  // An app link → the app pack slug that shows it. The plugin wraps every
  // app URL as app host + ?redirect_to=<double-encoded app URL>.
  function appTarget(href) {
    var u;
    try { u = new URL(href, document.baseURI); } catch (_) { return null; }
    if (!/(^|\.)app\.optinmonster\.test$/.test(u.hostname)) return null;
    var inner = u;
    var r = u.searchParams.get('redirect_to');
    if (r) {
      try { inner = new URL(decodeURIComponent(r)); }
      catch (_) { try { inner = new URL(r); } catch (__) { inner = u; } }
    }
    var path = inner.pathname.replace(/\/+$/, '');
    var hash = inner.hash || '';
    if (/^\/campaigns\/[^\/]+\/analytics/.test(path)) return 'app-campaign-analytics';
    if (/^\/campaigns\/[^\/]+\/edit/.test(path)) {
      if (/^#\/publish/.test(hash)) return 'app-builder-publish';
      if (/^#\/(rulesets|display-rules)/.test(hash)) return 'app-builder-display-rules';
      if (/^#\/analytics/.test(hash)) return 'app-builder-analytics';
      return 'app-builder-design';
    }
    if (/^\/campaigns\/new/.test(path) || /^\/templates/.test(path)) return 'app-new-campaign';
    if (/^\/campaigns/.test(path)) return 'app-campaigns';
    if (/^\/account/.test(path)) return 'app-account';
    if (/^\/leads/.test(path)) return 'app-leads';
    if (/^\/sites/.test(path)) return 'app-sites';
    if (path === '' || /^\/dashboard/.test(path)) return 'app-dashboard';
    return null;
  }

  // Campaigns list filters (campaigns/components/Filters.vue): the demo rows
  // carry a type each; the type filter hides the rest in place. The date
  // filter cannot change the demo rows (they have no dates), so Apply only
  // records the choice.
  var TYPE_LABELS = { popup: 'Popup', floating: 'Floating Bar', fullscreen: 'Fullscreen',
    inline: 'Inline', slide: 'Slide-in', gamified: 'Gamified' };
  function campaignRows() { return all('.omapi-campaigns-table tbody tr'); }
  function rowType(tr) {
    var names = Object.keys(TYPE_LABELS).map(function (k) { return TYPE_LABELS[k]; });
    var hit = all('a.no-link-style[title]', tr).map(function (a) { return a.getAttribute('title'); })
      .filter(function (t) { return names.indexOf(t) !== -1; })[0];
    return hit || '';
  }
  function filterButtons(wrap) {
    return all('.omapi-campaign-table__filters-date button, .omapi-campaign-table__filters-columns button', wrap);
  }
  function setCampaignCount(n) {
    var total = one('.omapi-pagination__total');
    if (total) total.textContent = n + (n === 1 ? ' Item' : ' Items');
  }
  function applyCampaignFilters() {
    var wrap = one('.omapi-campaign-table__filters');
    if (!wrap) return;
    var typeSel = one('.omapi-campaign-table__filters-columns select', wrap);
    var want = typeSel && TYPE_LABELS[typeSel.value] ? TYPE_LABELS[typeSel.value] : '';
    var n = 0;
    campaignRows().forEach(function (tr) {
      var show = !want || rowType(tr) === want;
      tr.style.display = show ? '' : 'none';
      if (show) n++;
    });
    setCampaignCount(n);
    filterButtons(wrap).forEach(function (b) { b.disabled = true; });
    var clear = one(':scope > button', wrap);
    if (clear) clear.style.display = '';
  }
  function clearCampaignFilters() {
    var wrap = one('.omapi-campaign-table__filters');
    if (!wrap) return;
    all('select', wrap).forEach(function (s) { s.value = ''; });
    var n = 0;
    campaignRows().forEach(function (tr) { tr.style.display = ''; n++; });
    setCampaignCount(n);
    filterButtons(wrap).forEach(function (b) { b.disabled = true; });
    var clear = one(':scope > button', wrap);
    if (clear) clear.style.display = 'none';
  }

  // A row modal captured over one campaign, opened for another: the overlay's
  // text and field values name the row that was clicked (carried as params).
  function retargetModal(name, id) {
    var overlay = one('.v--modal-overlay[data-modal]');
    if (!overlay || !name) return;
    var modal = overlay.getAttribute('data-modal') || '';
    var origId = modal.split('-')[0];
    var cb = one('input[type="checkbox"][id^="select-"][value="' + origId + '"]');
    var link = cb && one('.main-campaign-link', closestTo(cb, 'tr'));
    var orig = text(link);
    if (!orig || orig === name) return;
    var walker = document.createTreeWalker(overlay, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf(orig) !== -1) node.nodeValue = node.nodeValue.split(orig).join(name);
    }
    all('input, textarea', overlay).forEach(function (f) {
      if (f.value && f.value.indexOf(orig) !== -1) f.value = f.value.split(orig).join(name);
    });
    if (id) overlay.setAttribute('data-modal', modal.replace(origId, id));
  }

  // The admin URL a Vue router push lands on, resolved through the nav map
  // (DESIGN WO-202J: a result that rides the plugin's own URL). `fallback`
  // names the captured snapshot for a screen whose URL key the map lost
  // (two captures with one key); `note` says why a miss is a miss.
  function goUrl(url, fallback, note) {
    var hit = R.resolveHref(url);
    if (hit) { R.goto(hit); return; }
    if (fallback) { R.goto(fallback); return; }
    R.miss(url, note);
  }

  // vue-js-modal re-centres the box whenever its content changes
  // (vue-js-modal/src/Modal.vue:270-290, position(); :638-641, the
  // MutationObserver's updateRenderedHeight): top = pivotY (0.5) × the room
  // left in the viewport, never below 0.
  function recentre(box) {
    if (!box) return;
    var h = box.getBoundingClientRect().height;
    var maxTop = Math.max(window.innerHeight - h, 0);
    box.style.top = parseInt(Math.min(Math.max(0.5 * maxTop, 0), maxTop), 10) + 'px';
  }

  // core-save-button (vue/src/components/core/SaveButton.vue:4-6): colour
  // 'outline' while disabled, its own colour ('green') once enabled.
  function saveButtons(root, on) {
    all('button.loading-button[type="submit"]', root).forEach(function (b) {
      b.disabled = !on;
      if (on) b.removeAttribute('disabled'); else b.setAttribute('disabled', 'disabled');
      b.classList.toggle('omapi-button__outline', !on);
      b.classList.toggle('omapi-button__green', !!on);
    });
  }

  // ─── dropdowns: DropdownSelect + DropdownButton ──────────────────────────
  // Both render <nav class="omapi-dropdown"> with a toggle button and a v-show
  // container. The first open computes the container's style once
  // (DropdownButton.vue:90-117, DropdownSelect.vue:91-118): width = the
  // `width` prop or the nav's parent's width, left:0 or right:0 by `align`.
  // The props per use, from the plugin's templates:
  var DROPDOWN_PROPS = [
    { sel: '.campaign-table-status-indicators', width: 112, align: 'left' },     // campaigns/components/StatusSelect.vue:7
    { sel: '.campaign-table-additional-actions', width: 167, align: 'right' },   // campaigns/components/Row.vue:140
    { sel: '.omapi-monsterleads__filters-date .omapi-dropdown__select', width: 158, align: 'right' }, // monsterleads/components/contacts/Filters.vue:30
    { sel: '.omapi-dropdown__select', width: null, align: 'right' }              // components/common/DateSelect.vue:10
  ];
  function dropdownOpen(nav) {
    var box = one(':scope > .omapi-dropdown__container', nav);
    return !!box && shown(box);
  }
  function dropdownSet(nav, open) {
    var box = one(':scope > .omapi-dropdown__container', nav);
    if (!box) return;
    if (open && !box.style.width) {
      var p = DROPDOWN_PROPS.filter(function (d) { return is(nav, d.sel); })[0] || { width: null, align: 'left' };
      var w = p.width || (nav.parentElement ? nav.parentElement.offsetWidth : 0);
      box.style.width = w + 'px';
      if (p.align === 'right') box.style.right = '0px'; else box.style.left = '0px';
    }
    R.toggleTarget(box, open, { mode: 'display' });
  }

  // Row → the campaign id its checkbox carries (campaigns/components/Row.vue:5-13).
  function rowCampaignId(el) {
    var tr = closestTo(el, 'tr');
    var cb = tr && one('input[type="checkbox"][id^="select-"]', tr);
    return cb ? cb.value : null;
  }
  // Row → the lead id (monsterleads/components/contacts/Row.vue:5-12).
  function rowLeadId(el) {
    var tr = closestTo(el, 'tr');
    var cb = tr && one('input[type="checkbox"][id^="select-"]', tr);
    return cb ? cb.id.replace(/^select-/, '') : null;
  }

  // ─── modals ──────────────────────────────────────────────────────────────
  // $modal.show(name) → the captured sibling that holds that open modal. The
  // names are the overlays' data-modal values in those captures; a name with a
  // campaign or lead id belongs to the row the capture clicked, so any other
  // row's modal is a logged miss, never another row's contents.
  var MODAL_SNAPSHOTS = {
    'create-campaign-by-type': 'admin-campaigns--create-modal',
    'og58etphgug990yklomy-preview-modal': 'admin-campaigns--preview-modal',
    'og58etphgug990yklomy-duplicate-modal': 'admin-campaigns--duplicate-modal',
    'og58etphgug990yklomy-split-modal': 'admin-campaigns--split-modal',
    'og58etphgug990yklomy-trash-modal': 'admin-campaigns--trash-modal',
    'og58etphgug990yklomy-monster-link-modal': 'admin-campaigns--monsterlink-modal',
    'demo1000-show-lead-modal': 'admin-monsterleads-contacts--lead-modal',
    'lead-export-modal': 'admin-monsterleads-contacts--export-options',
    'email-upsell': 'admin-monsterleads-contacts--email-upsell',
    'admin-templates:create-campaign-modal': 'admin-templates--create-campaign-modal',
    'admin-playbooks:create-campaign-modal': 'admin-playbooks--create-campaign-modal'
  };
  // The list a modal sibling was captured over: the screen its opener sits on.
  var MODAL_FROM = {
    'admin-campaigns': ['admin-campaigns', 'admin-campaigns--row-actions', 'admin-campaigns--more-actions',
      'admin-campaigns--status-dropdown', 'admin-campaigns--ab-expanded', 'admin-campaigns--on-fire-tooltip',
      'admin-campaigns--bulk-selected'],
    'admin-monsterleads-contacts': ['admin-monsterleads-contacts'],
    'admin-templates': ['admin-templates', 'admin-templates--card-hover'],
    'admin-playbooks': ['admin-playbooks']
  };
  // Overlays closed on this page, kept to be put back (v-if out, v-if in).
  var KEPT = {};
  // params (QC round 1): the clicked row's { campaign, campaignId }, carried to
  // the modal capture so it names that row (retargetModal on snap:params).
  function modalShow(name, scope, params) {
    var kept = KEPT[name];
    if (kept && kept.parent) {
      kept.parent.insertBefore(kept.node, kept.next && kept.next.parentNode === kept.parent ? kept.next : null);
      delete KEPT[name];
      return;
    }
    if (one('.v--modal-overlay[data-modal="' + name + '"]')) return;   // already open
    // A row modal was captured for one campaign; every row's opens that capture.
    var generic = /-show-lead-modal$/.test(name) ? 'demo1000-show-lead-modal' : name.replace(/^[a-z0-9]{16,}-/, CAPTURED_CAMPAIGN + '-');
    var target = MODAL_SNAPSHOTS[name] || MODAL_SNAPSHOTS[scope + ':' + name] || MODAL_SNAPSHOTS[generic];
    var from = MODAL_FROM[baseOf(target)] || [];
    // Any sibling of the opener's screen may open it (a modal capture, a
    // dropdown capture): the page under the overlay is the same screen.
    if (target && (from.indexOf(slug()) !== -1 || baseOf(slug()) === baseOf(target))) {
      R.goto(target, params ? { params: params } : null);
      return;
    }
    R.miss('#modal-' + name, target
      ? 'modal "' + name + '" was captured over ' + baseOf(target) + ', not over ' + slug()
      : 'modal "' + name + '" was not captured');
  }
  // $modal.hide(name): the overlay leaves the DOM (vue-js-modal/src/Modal.vue:2-4,
  // v-if="visibility.overlay").
  function modalHide(overlay) {
    if (!overlay || !overlay.parentNode) return;
    var name = overlay.getAttribute('data-modal') || '';
    KEPT[name] = { node: overlay, parent: overlay.parentNode, next: overlay.nextSibling };
    overlay.parentNode.removeChild(overlay);
  }

  // Subscribers, Settings and About tab sets (vue/src/store/modules/tabs.js:5-31)
  // and the Templates / Playbooks page tabs (vue/src/components/mixins/creation.js:4-19).
  var TAB_SETS = {
    'admin-settings': { page: 'settings', first: 'general',
      tabs: { 'General': 'general', 'Site Settings': 'site', 'Billing': 'billing', 'Sub-Accounts': 'subaccounts', 'Miscellaneous': 'misc' } },
    'admin-about': { page: 'about', first: 'about-us',
      tabs: { 'About Us': 'about-us', 'Getting Started': 'getting-started', 'Lite vs. Pro': 'lite-pro' } },
    'admin-monsterleads': { page: 'monsterleads', first: 'overview',
      tabs: { 'Overview': 'overview', 'Contacts': 'contacts', 'Segments': 'segments' } }
  };
  function tabSet() {
    var s = slug();
    for (var k in TAB_SETS) if (Object.prototype.hasOwnProperty.call(TAB_SETS, k) && s.indexOf(k + '-') === 0) return TAB_SETS[k];
    return null;
  }

  // Template types, in the order the type cards render (templates/store/state.js:1-31).
  var TEMPLATE_TYPES = { 'Popup': 'popup', 'Floating Bar': 'floating', 'Fullscreen': 'fullscreen',
    'Inline': 'inline', 'Slide-in': 'slide', 'Gamified': 'gamified' };

  // Quick Stats date options → the capture of that range (dashboard: StatsWidget.vue:46-64;
  // Subscribers overview: monsterleads/components/overview/StatsWidget.vue:104-118).
  var DATE_SNAPSHOTS = {
    'admin-dashboard': { '7-days': 'admin-dashboard--stats-7-days', '30-days': 'admin-dashboard',
      custom: 'admin-dashboard--stats-custom-range' },
    'admin-monsterleads-overview': { '7-days': 'admin-monsterleads-overview--7-days',
      '30-days': 'admin-monsterleads-overview', custom: 'admin-monsterleads-overview--custom-range' }
  };
  // DateSelect's option labels → the filter each emits (components/common/DateSelect.vue:11-44).
  var DATE_FILTERS = { 'All Time': '', 'Last 7 Days': '7-days', 'Last 30 Days': '30-days', 'Custom Date Range': 'custom' };

  // Personalization category links, in page order → their captures
  // (pages/Personalization.vue:6-20; the capture plan clicked nth-of-type 2..7).
  var PERSONALIZATION = ['admin-personalization', 'admin-personalization--behavior', 'admin-personalization--timing',
    'admin-personalization--triggers', 'admin-personalization--retargeting', 'admin-personalization--ecommerce',
    'admin-personalization--all'];

  R.register([

    // ─ Dropdown toggle ─────────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/core/DropdownButton.vue:175 @verified 2026-09-27 @product optinmonster
    // Real plugin: the toggle button's @click.prevent="toggle" flips `hidden`
    // (DropdownButton.vue:9, :175-186; DropdownSelect.vue:10, :151-163), and
    // the container is v-show="!hidden" (:15). Quick Stats and Subscribers
    // date selects, the campaign row status dropdown and More Actions.
    {
      label: 'dropdown-toggle',
      event: 'click',
      match: function (el) {
        var t = closestTo(el, '.omapi-dropdown__toggle');
        return !!t && is(t.parentElement, 'nav.omapi-dropdown');
      },
      apply: function (el) {
        var nav = closestTo(el, '.omapi-dropdown__toggle').parentElement;
        dropdownSet(nav, !dropdownOpen(nav));
      },
      state: function (el) {
        var nav = closestTo(el, '.omapi-dropdown__toggle').parentElement;
        return { key: 'dropdown', value: dropdownOpen(nav) };
      }
    },

    // ─ Dropdown closes on a click elsewhere ────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/core/DropdownSelect.vue:171 @verified 2026-09-27 @product optinmonster
    // Real plugin: every dropdown listens on window (DropdownSelect.vue:137,
    // DropdownButton.vue:161) and closes when the click is outside its nav;
    // a DropdownSelect also closes when the click is on one of its options
    // (DropdownSelect.vue:171-184). DropdownButton skips the close while its
    // `open` prop just opened it (preventClose, DropdownButton.vue:130-137,
    // :204). A click on a real link is left to navigation.
    {
      label: 'dropdown-window-close',
      event: 'click',
      order: 'last',
      match: function (el, evt) {
        if (realLink(el)) return false;
        return all('nav.omapi-dropdown').some(function (nav) { return closes(nav, el, evt); });
      },
      apply: function (el, evt) {
        all('nav.omapi-dropdown').forEach(function (nav) { if (closes(nav, el, evt)) dropdownSet(nav, false); });
      }
    },

    // ─ Change Status row action ────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/Row.vue:50 @verified 2026-09-27 @product optinmonster
    // Real plugin: "Change Status" sets statusOpened, which the row's status
    // dropdown watches as `open` → toggle(false) with preventClose for 200 ms
    // (DropdownButton.vue:125-138), so the same click does not close it.
    {
      label: 'row-change-status',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.row-actions a');
        return !!a && /^Change Status/.test(a.getAttribute('title') || '');
      },
      apply: function (el, evt) {
        var nav = one('.campaign-table-status-indicators', closestTo(el, 'tr'));
        if (!nav) return;
        nav.__snapOpenedBy = evt;
        dropdownSet(nav, true);
      }
    },

    // ─ Campaign status items ───────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/StatusSelect.vue:126 @verified 2026-09-27 @product optinmonster
    // Real plugin: Draft / Pending / Publish POST to the app and WordPress,
    // then refetch the list (StatusSelect.vue:126-194, interactions.md §12
    // C1). The refetched row shows the new status in the toggle. QC round 1
    // (Windows, 2026-09-27): the write is answered in place — the toggle's
    // label and colour class change and the dropdown closes, the way the
    // refetched row would read. Colour classes per statusColorClass()
    // (StatusSelect.vue:80-90): Pending omapi-c-orange, Published
    // omapi-c-green, Draft omapi-c-red; labels per :110-114. Confirmed by
    // the Mac against the source, 2026-09-27.
    {
      label: 'campaign-status-item',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.campaign-table-status-indicators .omapi-dropdown__container a');
        return !!a && (a.getAttribute('href') || '') === '#';
      },
      apply: function (el) {
        var a = closestTo(el, 'a');
        var nav = closestTo(el, 'nav.omapi-dropdown');
        var map = { 'Draft': ['Draft', 'omapi-c-red'], 'Pending': ['Pending', 'omapi-c-orange'], 'Publish': ['Published', 'omapi-c-green'] };
        var next = map[text(a)];
        if (!nav || !next) return;
        var label = one('.omapi-dropdown__toggle > span', nav);
        if (label) { label.textContent = next[0]; label.className = next[1]; }
        all('.omapi-dropdown__container a', nav).forEach(function (x) { x.className = x === a ? 'current' : (x.getAttribute('href') === '#' ? '' : x.className); });
        dropdownSet(nav, false);
      },
      state: function (el) { return { key: 'campaign.status', value: text(closestTo(el, 'a')) }; }
    },

    // ─ App links (cross-pack) ──────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/utils/urls.js:173 @verified 2026-09-27 @product optinmonster
    // QC round 1 (Windows, 2026-09-27). Every Edit / Analytics / Set Schedule
    // link and the row name go to the web app, wrapped as
    // app host + ?redirect_to=<app URL>: builderLink() (urls.js:173), used by
    // campaigns/mixins/campaign.js:61-63 (Edit Design, name, type) and :72
    // (Set / Edit Schedule, screen '#/publish/#schedule'). Those screens are
    // the app pack's captures, so the click opens that pack's snapshot.
    {
      label: 'app-link',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, 'a[href]');
        return !!a && !!appTarget(a.getAttribute('href') || '');
      },
      apply: function (el) {
        var a = closestTo(el, 'a[href]');
        R.goto(appTarget(a.getAttribute('href') || ''), { pack: APP_PACK });
      },
      state: function (el) {
        var a = closestTo(el, 'a[href]');
        return { key: 'app', value: appTarget(a.getAttribute('href') || '') };
      }
    },

    // ─ Start Building (create-campaign modal) ──────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/modal/CreateCampaign.vue:10 @verified 2026-09-27 @product optinmonster
    // QC round 1 (Windows, 2026-09-27). The form's @submit.prevent="doCreate"
    // (CreateCampaign.vue:10, button :23) runs campaigns/createCampaign
    // (:63-76: POST app v2 campaigns) and sets window.location.href to the
    // builder. A snapshot never runs the write; the click opens the app
    // pack's builder capture.
    {
      label: 'create-campaign-start-building',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.v--modal-overlay form button[type="submit"]');
        return !!b && text(b) === 'Start Building';
      },
      apply: function () { R.goto('app-builder-design', { pack: APP_PACK }); }
    },

    // ─ Campaigns list filters ──────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/Table/DropdownFilters.vue:50 @verified pending-mac @product optinmonster
    // QC round 1 (Windows, 2026-09-27). Picking a date range or a type enables
    // its Apply / Filter button; Filter hides the rows of other types and
    // updates the item count; Clear puts everything back. The date filter
    // has nothing to hide (demo rows carry no dates). The cite is the newer
    // build's handleFilter / clickReset (DropdownFilters.vue:50-51); the
    // captured 2.17.1 build renders the older native-select filter bar, whose
    // source the Mac has not located. Behaviour matches the newer one.
    {
      label: 'campaigns-filter-change',
      event: 'change',
      match: function (el) { return is(el, '.omapi-campaign-table__filters select'); },
      apply: function (el) {
        var b = one('button', el.parentElement);
        if (b) b.disabled = false;
      }
    },
    {
      label: 'campaigns-filter-apply',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.omapi-campaign-table__filters-date button, .omapi-campaign-table__filters-columns button');
        return !!b && !b.disabled;
      },
      apply: function () { applyCampaignFilters(); },
      state: function () {
        var s = one('.omapi-campaign-table__filters-columns select');
        return { key: 'campaigns.type', value: s ? s.value : '' };
      }
    },
    {
      label: 'campaigns-filter-clear',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.omapi-campaign-table__filters > button');
        return !!b && text(b) === 'Clear';
      },
      apply: function () { clearCampaignFilters(); }
    },

    // ─ Output Settings link, any row ───────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/Row.vue:1 @verified pending-mac @product optinmonster
    // QC round 2 (Windows, 2026-09-27). Each row's "Output Settings" links
    // admin.php?page=optin-monster-campaigns&campaignId=<id>; the page was
    // captured for one campaign (admin-campaigns-output). Every row opens that
    // capture, renamed to the clicked row (params: campaign / was).
    {
      label: 'output-settings-link',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, 'a[href]');
        var h = a ? a.getAttribute('href') || '' : '';
        return /page=optin-monster-campaigns/.test(h) && /campaignId=/.test(h) && !R.resolveHref(h);
      },
      apply: function (el) {
        var tr = closestTo(el, 'tr');
        var name = tr ? text(one('.main-campaign-link', tr)) : '';
        var capId = 'tjrnkuhbdzfebjblahxo';
        var cb = one('input[type="checkbox"][id^="select-"][value="' + capId + '"]');
        var was = cb ? text(one('.main-campaign-link', closestTo(cb, 'tr'))) : '';
        R.goto('admin-campaigns-output', name && was && name !== was ? { params: { campaign: name, was: was } } : null);
      }
    },
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/pages/Campaign.vue:1 @verified pending-mac @product optinmonster
    // A page capture opened for another campaign: `was` → `campaign` in every
    // text node and field value of the app root.
    {
      label: 'campaign-page-for-row',
      event: 'snap:params',
      match: function (el, evt) { return !!(evt && evt.detail && evt.detail.campaign && evt.detail.was); },
      apply: function (el, evt) {
        var was = evt.detail.was, name = evt.detail.campaign;
        var root = one('#om-app') || document.body;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue.indexOf(was) !== -1) node.nodeValue = node.nodeValue.split(was).join(name);
        }
        all('input, textarea', root).forEach(function (f) {
          if (f.value && f.value.indexOf(was) !== -1) f.value = f.value.split(was).join(name);
        });
        if (document.title.indexOf(was) !== -1) document.title = document.title.split(was).join(name);
      }
    },

    // ─ QC round 2 plugin links (Windows, 2026-09-27) ───────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/templates/components/Filters.vue:1 @verified pending-mac @product optinmonster
    // Templates: the device buttons switch the grid (Mobile Optimized is the
    // --mobile capture); Clear Filters on Templates / Playbooks returns to the
    // full grid.
    {
      label: 'templates-device',
      event: 'click',
      match: function (el) { return /^admin-templates/.test(slug()) && !!closestTo(el, 'button.campaign-type-device'); },
      apply: function (el) {
        var b = closestTo(el, 'button');
        goUrl('', /Mobile/i.test(text(b)) ? 'admin-templates--mobile' : 'admin-templates');
      }
    },
    {
      label: 'creation-clear-filters',
      event: 'click',
      match: function (el) { var b = closestTo(el, 'button'); return /^admin-(templates|playbooks)/.test(slug()) && !!b && /Clear Filters/i.test(text(b)); },
      apply: function () { goUrl('', /^admin-playbooks/.test(slug()) ? 'admin-playbooks' : 'admin-templates'); }
    },
    // @since 2026-09-27 @source optinmonster/vue/src/components/common/Search.vue:1 @verified pending-mac @product optinmonster
    // Search submits open the captured search result of that page.
    {
      label: 'page-search-submit',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'form.omapi-search button[type="submit"], .omapi-search button[type="submit"]'); },
      apply: function () {
        var s = slug();
        var target = /^admin-campaigns/.test(s) ? 'admin-campaigns--search-results'
          : /^admin-monsterleads-contacts/.test(s) ? 'admin-monsterleads-contacts--search'
          : /^admin-templates/.test(s) ? 'admin-templates--search'
          : /^admin-playbooks/.test(s) ? 'admin-playbooks--search' : null;
        if (target) R.goto(target); else R.miss('#search', 'no search capture for ' + s);
      }
    },
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/components/contacts/Row.vue:1 @verified pending-mac @product optinmonster
    // Contacts rows: Email is a mailto (logged), Delete removes the row in
    // place (the real plugin deletes after a confirm and refetches).
    {
      label: 'contacts-row-action',
      event: 'click',
      match: function (el) { var a = closestTo(el, '.omapi-monsterleads .row-actions a, .omapi-monsterleads td a'); return !!a && /^(Email|Delete)$/.test(text(a)); },
      apply: function (el) {
        var a = closestTo(el, 'a');
        if (text(a) === 'Delete') { var tr = closestTo(a, 'tr'); if (tr) tr.parentNode.removeChild(tr); return; }
        R.miss('#email-lead', 'opens the mail client');
      }
    },
    // Subscribers overview: the count links open the Contacts list.
    {
      label: 'overview-count-link',
      event: 'click',
      match: function (el) { var a = closestTo(el, 'a.omapi-button__link'); return /^admin-monsterleads-overview/.test(slug()) && !!a && /^\d+$/.test(text(a)); },
      apply: function () { R.goto('admin-monsterleads-contacts'); }
    },
    // Pagination on a one-page list, Export (a write), the date picker's
    // own controls: logged, never dead.
    {
      label: 'plugin-logged-controls',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.omapi-pagination__button, .omapi-app-exit, .el-picker-panel__icon-btn, .el-picker-panel__shortcut, .el-date-table td'); },
      apply: function (el) {
        var b = closestTo(el, '.omapi-pagination__button, .omapi-app-exit, .el-picker-panel__icon-btn, .el-picker-panel__shortcut, .el-date-table td');
        R.miss('#' + (b.className.split(/\s+/)[0] || 'control'), b.classList.contains('omapi-pagination__button') ? 'the demo list has one page'
          : b.classList.contains('omapi-app-exit') ? 'starts the export (a write)' : 'the date picker is frozen at its captured month');
      }
    },
    // Bulk actions: Archive / Trash + Apply removes the checked rows in place
    // (the real plugin posts the action and refetches the list).
    {
      label: 'campaigns-bulk-apply',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.omapi-campaign-table__status button, .omapi-campaign-table__mods button.omapi-button__secondary');
        return /^admin-campaigns/.test(slug()) && !!b && /^Apply$/.test(text(b)) && !closestTo(el, '.omapi-campaign-table__filters');
      },
      apply: function (el) {
        var b = closestTo(el, 'button');
        var sel = one('select', b.parentElement) || one('.omapi-campaign-table__status select');
        var action = sel ? sel.value : '';
        if (!action) { R.miss('#bulk-apply', 'pick a bulk action first'); return; }
        var checked = all('.omapi-campaigns-table tbody input[type="checkbox"]:checked');
        if (!checked.length) { R.miss('#bulk-apply', 'no campaign is checked'); return; }
        checked.forEach(function (cb) { var tr = closestTo(cb, 'tr'); if (tr) tr.parentNode.removeChild(tr); });
        var n = all('.omapi-campaigns-table tbody tr').length;
        var total = one('.omapi-pagination__total');
        if (total) total.textContent = n + (n === 1 ? ' Item' : ' Items');
        if (sel) sel.value = '';
      }
    },
    // Settings: Save Changes reads "Saved" for a moment (the real button posts the form).
    {
      label: 'settings-save',
      event: 'click',
      match: function (el) { var b = closestTo(el, 'button'); return /^admin-(settings|campaigns-output)/.test(slug()) && !!b && /Save Changes/i.test(text(b)); },
      apply: function (el) {
        var b = closestTo(el, 'button');
        var was = b.textContent;
        b.textContent = 'Saved';
        R.wait(1200, function () { b.textContent = was; });
      }
    },
    // @since 2026-09-27 @source optinmonster-js-library/src/campaign/close.js:1 @verified pending-mac @product optinmonster
    // Front-end campaign: the close button and "No thanks" close the
    // campaign (hidden in place); "Yes" would show the optin view, which
    // is not captured.
    {
      label: 'frontend-campaign-close',
      event: 'click',
      match: function (el) { return /^frontend-/.test(slug()) && !!closestTo(el, '[class*="CloseButton"], [class*="StyledIconButtonElement"], .wc-block-components-button'); },
      apply: function (el) {
        var b = closestTo(el, 'button');
        // QC round 2 captures: Yes → the Optin view, the optin submit → the Success view.
        var fam = /^frontend-popup/.test(slug()) ? 'frontend-popup' : /^frontend-inline-shortcode/.test(slug()) ? 'frontend-inline-shortcode' : null;
        if (/Yes/i.test(text(b)) && b.id && /YesButton/.test(b.id)) { if (fam) R.goto(fam + '--optin'); else R.miss('#yes', 'no optin view captured'); return; }
        if (/submit/i.test(b.getAttribute('name') || '') || /FieldsElementButton/.test(b.id || '')) { if (fam) R.goto(fam + '--success'); else R.miss('#submit', 'no success view captured'); return; }
        var box = closestTo(b, '[id^="om-"]') || closestTo(b, '[class*="Campaign__container"], [class*="Campaign__i"]') || closestTo(b, '.sibley-c-wrapper');
        if (box) box.style.display = 'none';
      }
    },
    // WordPress Screen Options / Help tabs toggle their panels.
    {
      label: 'wp-screen-meta-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'button.show-settings'); },
      apply: function (el) {
        var b = closestTo(el, 'button.show-settings');
        var panel = document.getElementById(b.id === 'contextual-help-link' ? 'contextual-help-wrap' : 'screen-options-wrap');
        if (!panel) return;
        var open = panel.style.display !== 'none' && panel.style.display !== '';
        panel.style.display = open ? 'none' : 'block';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
      }
    },

    // ─ Row modal opened for another row ────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/mixins/campaign.js:335 @verified 2026-09-27 @product optinmonster
    // QC round 1 (Windows, 2026-09-27). A modal capture opened with carried
    // { campaign, campaignId } params renames itself to that row: the real
    // modal is shown per row as this.id + '-' + type + '-modal'
    // (campaign.js:335-336; openers Row.vue:102, :124, :135, :150, :335, :345).
    {
      label: 'campaign-modal-for-row',
      event: 'snap:params',
      match: function (el, evt) { return !!(evt && evt.detail && evt.detail.campaign); },
      apply: function (el, evt) { retargetModal(evt.detail.campaign, evt.detail.campaignId); }
    },

    // ─ Campaign row and page modals ────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/mixins/campaign.js:335 @verified 2026-09-27 @product optinmonster
    // Real plugin: showModal(type) → $modal.show(id + '-<type>-modal')
    // (campaign.js:335-337) from the row's Preview, Duplicate and Trash
    // buttons (Row.vue:102, :124, :135), "Create Test" (Row.vue:68, :333-337),
    // More → Shareable Link and Archive (Row.vue:150, :157, :343-347); "Add
    // New" shows 'create-campaign-by-type' (pages/Campaigns.vue:4).
    {
      label: 'campaign-modal-open',
      event: 'click',
      match: function (el) { return !!campaignModalName(el); },
      apply: function (el) {
        var tr = closestTo(el, 'tr');
        var link = tr && one('.main-campaign-link', tr);
        modalShow(campaignModalName(el), null, link ? { campaign: text(link), campaignId: rowCampaignId(el) } : null);
      },
      state: function (el) { return { key: 'modal', value: campaignModalName(el) }; }
    },

    // ─ Subscribers modals ──────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/mixins/lead.js:72 @verified 2026-09-27 @product optinmonster
    // Real plugin: View Lead → $modal.show(lead.id + '-show-lead-modal')
    // (lead.js:72-74; Row.vue:18, :36); Export → 'lead-export-modal' and
    // Send a Bulk Email → 'email-upsell' (contacts/Actions.vue:11-14, :49-51).
    {
      label: 'subscribers-modal-open',
      event: 'click',
      match: function (el) { return !!leadModalName(el); },
      apply: function (el) { modalShow(leadModalName(el)); }
    },

    // ─ Use Template / Use Playbook ─────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/templates/components/TemplateCard.vue:81 @verified 2026-09-27 @product optinmonster
    // Real plugin: Use Template sets the active template and shows
    // 'create-campaign-modal' (TemplateCard.vue:5-7, :81-91); Use Playbook the
    // same (pages/Playbooks.vue:132-149). On this Growth account every
    // template and playbook is allowed, so neither the no-access nor the
    // upgrade modal applies. No request is made until Start Building.
    {
      label: 'create-campaign-modal-open',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '.omapi-template-preview__actions__use')
          || !!closestTo(el, '.playbooks-table__container .playbook .button.primary');
      },
      apply: function (el) {
        modalShow('create-campaign-modal', closestTo(el, '.omapi-template-preview__actions__use') ? 'admin-templates' : 'admin-playbooks');
      }
    },

    // ─ Modal close button, Cancel, Close ───────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/node_modules/optinmonster-js-library/src/vue/components/modals/Header.vue:5 @verified 2026-09-27 @product optinmonster
    // Real plugin: the header × runs $modal.hide(name) (Header.vue:4-8;
    // CreateByType.vue:6); Cancel buttons too (Duplicate.vue:93, Split.vue,
    // Trash.vue, Archive.vue:31); MonsterLink's Close submits a form whose
    // @submit.prevent hides it (MonsterLink.vue:9). The overlay leaves the DOM.
    {
      label: 'modal-close',
      event: 'click',
      match: function (el) {
        if (closestTo(el, '.v--modal-overlay .v--modal-box header .close button')) return true;
        var b = closestTo(el, '.v--modal-overlay .v--modal-box button');
        return !!b && /^(Cancel|Close)$/.test(text(b));
      },
      apply: function (el) { modalHide(closestTo(el, '.v--modal-overlay')); }
    },

    // ─ Modal closes on the background ──────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/node_modules/vue-js-modal/src/Modal.vue:12 @verified 2026-09-27 @product optinmonster
    // Real plugin: @mousedown.self on .v--modal-background-click closes when
    // clickToClose (Modal.vue:11-13; true for every modal at rest,
    // optinmonster-js-library/src/vue/components/core/Modal.vue:42-47).
    {
      label: 'modal-background-close',
      event: 'mousedown',
      match: function (el) { return is(el, '.v--modal-overlay > .v--modal-background-click'); },
      apply: function (el) { modalHide(closestTo(el, '.v--modal-overlay')); }
    },

    // ─ Modal closes on Escape ──────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/node_modules/vue-js-modal/src/Modal.vue:239 @verified 2026-09-27 @product optinmonster
    // Real plugin: a window keyup listener closes the modal on Escape while
    // clickToClose (Modal.vue:238-240).
    {
      label: 'modal-escape-close',
      event: 'keyup',
      match: function (el, evt) {
        return !!evt && (evt.key === 'Escape' || evt.keyCode === 27) && !!one('.v--modal-overlay');
      },
      apply: function () { all('.v--modal-overlay').forEach(modalHide); }
    },

    // ─ Export modal: pick All or Current View ──────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/components/modal/Export.vue:21 @verified 2026-09-27 @product optinmonster
    // Real plugin: each .export-button sets selectedOption; the chosen one
    // carries `selected` (Export.vue:21-45, :204-206).
    {
      label: 'export-option-select',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.omapi-leadexport__wrapper .export-button'); },
      apply: function (el) {
        var b = closestTo(el, '.export-button');
        R.selectOne('.omapi-leadexport__wrapper', '.export-button', b, 'selected');
      },
      state: function (el) { return { key: 'export.option', value: text(closestTo(el, '.export-button')) }; }
    },

    // ─ Export modal: Next ──────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/components/modal/Export.vue:49 @verified 2026-09-27 @product optinmonster
    // Real plugin: Next → goTo('dataOptions'): the `active` class moves to the
    // data-options slide (Export.vue:11, :49, :55, :214-216); vue-js-modal
    // re-centres the taller box. With "Export All" the plugin also reads the
    // total from the app (Export.vue:171-179); only the confirmation step
    // shows it, and that step is never reached here.
    {
      label: 'export-next',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.omapi-leadexport__wrapper .export-options-slide__action button');
        return !!b && text(b) === 'Next';
      },
      apply: function (el) {
        var wrap = closestTo(el, '.omapi-leadexport__wrapper');
        var slides = all('.export-options-slide', wrap);
        if (slides.length < 2) return;
        slides.forEach(function (s, i) { s.classList.toggle('active', i === 1); });
        recentre(one('.v--modal-box', wrap));
      }
    },

    // ─ Export modal: Export ────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/components/modal/Export.vue:75 @verified 2026-09-27 @product optinmonster
    // Real plugin: runExport downloads a CSV of the leads, or for a large set
    // asks the app to email a link (Export.vue:322-337; §12 C13). Never run.
    {
      label: 'export-run',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.omapi-leadexport__wrapper .export-options-slide__action button');
        return !!b && text(b) === 'Export';
      },
      apply: function () { R.miss('#lead-export', 'downloads the leads as a CSV (a real export); not captured'); }
    },

    // ─ Quick Stats date options ────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/dashboard/components/StatsWidget.vue:46 @verified 2026-09-27 @product optinmonster
    // Real plugin: an option emits quickSelect (DateSelect.vue:11-44); a preset
    // refetches the three numbers from the app (StatsWidget.vue:46-64;
    // Subscribers: overview/StatsWidget.vue:104-118); "Custom Date Range"
    // mounts the date picker open (DateSelect.vue:3-10). Each range is its own
    // capture, so the option opens it. The dropdown closes as the option is
    // an option (dropdown-window-close).
    {
      label: 'stats-date-option',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.omapi-dropdown__select .omapi-dropdown__container li > a');
        return !!a && Object.prototype.hasOwnProperty.call(DATE_FILTERS, text(a));
      },
      apply: function (el) {
        var filter = DATE_FILTERS[text(closestTo(el, 'a'))];
        var fam = DATE_SNAPSHOTS[baseOf(slug())];
        if (fam && !closestTo(el, '.omapi-monsterleads__filters-date') && fam[filter]) { R.goto(fam[filter]); return; }
        R.miss('#date-' + (filter || 'all-time'), 'this date range is not captured for ' + slug());
      },
      state: function (el) { return { key: 'date.filter', value: DATE_FILTERS[text(closestTo(el, 'a'))] }; }
    },

    // ─ Card minimise / open ────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/common/Card.vue:191 @verified 2026-09-27 @product optinmonster
    // Real plugin: a minimizable card's title click sets status 'min' ↔
    // 'open' (Card.vue:8, :191-194): the card gains omapi-card__<status>, the
    // icon becomes "Minimize" (omapi-card-icon__min-open) or "Open"
    // (…__min-closed) (:11-12), and content and footer are v-show="isOpen"
    // (:15, :26). Output Settings (Advanced, WooCommerce) and the Dashboard.
    {
      label: 'card-minimize',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.omapi-card.omapi-can-minimize > .omapi-card-title'); },
      apply: function (el) {
        var card = closestTo(el, '.omapi-card.omapi-can-minimize');
        var content = one(':scope > .omapi-card-content', card);
        var open = !(content && shown(content));
        card.classList.remove('omapi-card__open', 'omapi-card__min');
        card.classList.add(open ? 'omapi-card__open' : 'omapi-card__min');
        var icon = one(':scope > .omapi-card-title > .omapi-card-icon', card);
        if (icon) {
          icon.classList.toggle('omapi-card-icon__min-open', open);
          icon.classList.toggle('omapi-card-icon__min-closed', !open);
          icon.textContent = open ? 'Minimize' : 'Open';
        }
        R.toggleTarget(all(':scope > .omapi-card-content, :scope > .omapi-card-footer', card), open, { mode: 'display' });
      },
      state: function (el) {
        var c = one(':scope > .omapi-card-content', closestTo(el, '.omapi-card'));
        return { key: 'card.open', value: !!(c && shown(c)) };
      }
    },

    // ─ Publish Status steps ────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/pages/Campaign.vue:311 @verified 2026-09-27 @product optinmonster
    // Real plugin: a step button emits updateStatus (StatusSetting.vue:3-28);
    // onChangeStatus sets newStatus and the embed flag (Campaign.vue:311-341);
    // statusText picks the blue button (Campaign.vue:161-173); once anything
    // changed the third button reads "Publish" (StatusSetting.vue:52-57) and
    // every Save on the page is enabled (Campaign.vue:201-210, :22-66).
    // Nothing is sent until Save.
    {
      label: 'publish-status-step',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, '.omapi-campaign-settings__publishstatus-buttons > button.omapi-button__steps:not(.omapi-button__save)');
      },
      apply: function (el) {
        var wrap = closestTo(el, '.omapi-campaign-settings__publishstatus-buttons');
        var steps = all(':scope > button.omapi-button__steps:not(.omapi-button__save)', wrap);
        var st = statusState(wrap, steps);
        var i = steps.indexOf(closestTo(el, 'button'));
        if (i === 1) st.enabled = st.status !== 'active';   // 'Pending': toggleEmbed('active' !== newStatus)
        if (i === 2) { st.status = 'active'; st.enabled = true; }
        if (i === 0) { st.status = 'paused'; st.enabled = false; }
        st.changed = st.changed || st.status !== st.orig.status || st.enabled !== st.orig.enabled;
        var label = st.status !== 'active' ? (st.enabled ? 'Pending' : 'Draft') : (st.enabled ? 'Published' : 'Pending');
        steps.forEach(function (b, k) { b.classList.toggle('omapi-button__blue', ['Draft', 'Pending', 'Published'][k] === label); });
        if (steps[2]) steps[2].textContent = ' ' + (st.changed ? 'Publish' : (label === 'Published' ? 'Published' : 'Publish')) + ' ';
        if (st.changed) saveButtons(closestTo(wrap, 'form') || document, true);
      },
      state: function (el) {
        var wrap = closestTo(el, '.omapi-campaign-settings__publishstatus-buttons');
        var b = wrap && one('.omapi-button__blue', wrap);
        return { key: 'publish.status', value: text(b) };
      }
    },

    // ─ Inline output: Manual / Automatic ───────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/InlineSettings.vue:28 @verified 2026-09-27 @product optinmonster
    // Real plugin: the radio sets _omapi_automatic (InlineSettings.vue:11-31);
    // the Automatic block and the shortcode box are v-if on it (:31-33, :89),
    // and the page's Save buttons enable (Campaign.vue:185-199). Each state is
    // its own capture; going back to Manual carries "changed" so the Saves
    // stay enabled (entry output-changed-carry).
    {
      label: 'inline-output-mode',
      event: 'change',
      match: function (el) { return is(el, 'input[type="radio"][name="settingAutomatic"]'); },
      apply: function (el) {
        var s = slug();
        if (baseOf(s) !== 'admin-campaigns-output-inline') { R.miss('#settingAutomatic-' + el.value, 'no capture of this campaign in the other mode'); return; }
        if (el.value === '1' && s !== 'admin-campaigns-output-inline--auto') R.goto('admin-campaigns-output-inline--auto');
        else if (el.value === '0' && s !== 'admin-campaigns-output-inline') R.goto('admin-campaigns-output-inline', { params: { omChanged: '1' } });
      },
      state: function (el) { return { key: 'inline.automatic', value: el.value === '1' }; }
    },

    // ─ Unsaved changes ride along ──────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/pages/Campaign.vue:201 @verified 2026-09-27 @product optinmonster
    // Real plugin: once a setting changed, `changed` stays true and every Save
    // is enabled (Campaign.vue:185-210, SaveButton.vue:4). A hop between two
    // captures of the same form carries it as omChanged=1.
    {
      label: 'output-changed-carry',
      event: 'snap:params',
      match: function (el, evt) { return !!evt && !!evt.detail && evt.detail.omChanged === '1'; },
      apply: function () {
        var form = one('.omapi-campaign-settings form');
        if (form) saveButtons(form, true);
      }
    },

    // ─ Template type cards ─────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/templates/components/TypeCard.vue:35 @verified 2026-09-27 @product optinmonster
    // Real plugin: a type card dispatches goToFilteredView → router push to
    // route template-type, `templates&type=<type>` (TypeCard.vue:2, :35-37;
    // templates/store/actions.js:127-131; router/routes.js:132-141). Popup is
    // the store's default type (templates/store/state.js:42), so its screen is
    // the Templates page itself. The selected card is inert (the same route).
    {
      label: 'template-type-card',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.campaign-type-selector > .omapi-card'); },
      apply: function (el) {
        var card = closestTo(el, '.campaign-type-selector > .omapi-card');
        if (card.classList.contains('selected')) return;
        var type = TEMPLATE_TYPES[text(one('h5', card))];
        if (!type) { R.miss('#template-type', 'unknown template type ' + text(one('h5', card))); return; }
        var url = 'admin.php?page=optin-monster-templates&type=' + type;
        goUrl(url, type === 'popup' ? R.resolveHref('admin.php?page=optin-monster-templates') : null);
      },
      state: function (el) { return { key: 'template.type', value: TEMPLATE_TYPES[text(one('h5', closestTo(el, '.omapi-card')))] || null }; }
    },

    // ─ Template filter groups ──────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/templates/components/FilterOption.vue:73 @verified 2026-09-27 @product optinmonster
    // Real plugin: the group title toggles `visible` (FilterOption.vue:3,
    // :73-75); the button carries `active` while visible and the options list
    // is v-if="visible" (:4). The list leaves the DOM and comes back.
    {
      label: 'template-filter-group',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.campaign-type-filter__option > .title-button'); },
      apply: function (el) {
        var btn = closestTo(el, '.title-button');
        var group = btn.parentElement;
        var list = one(':scope > .options-list', group);
        if (list) {
          group.__snapList = list;
          group.removeChild(list);
          btn.classList.remove('active');
        } else if (group.__snapList) {
          group.appendChild(group.__snapList);
          btn.classList.add('active');
        } else {
          R.miss('#template-filter-' + text(btn), 'this group was captured closed; its options are not in the snapshot');
        }
      },
      state: function (el) { return { key: 'template.filter.' + text(closestTo(el, '.title-button')), value: !!one(':scope > .options-list', closestTo(el, '.campaign-type-filter__option')) }; }
    },

    // ─ Templates / Playbooks page tabs ─────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/common/PageTabnav.vue:37 @verified 2026-09-27 @product optinmonster
    // Real plugin: a tab pushes its route (PageTabnav.vue:8, :37-43), from
    // creation.js:4-19: Templates → `templates`, Playbooks → `playbooks`.
    {
      label: 'creation-tabnav',
      event: 'click',
      match: function (el) {
        var item = closestTo(el, '.omapi-tabnav__item');
        return !!item && /^admin-(templates|playbooks)/.test(slug()) && /^(Templates|Playbooks)$/.test(text(item));
      },
      apply: function (el) {
        var item = closestTo(el, '.omapi-tabnav__item');
        if (item.classList.contains('omapi-tabnav__item-active')) return;
        goUrl('admin.php?page=optin-monster-' + text(item).toLowerCase());
      }
    },

    // ─ Settings, Subscribers and About tabs ────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/store/modules/tabs.js:74 @verified 2026-09-27 @product optinmonster
    // Real plugin: Tabnav emits go (components/common/Tabnav.vue:8); goTab
    // pushes `page=optin-monster-<page>&selectedTab=<tab>`, the first tab
    // being the page itself, and bails on the current tab (tabs.js:74-101).
    // Billing and Sub-Accounts open the app in a new window instead
    // (pages/Settings.vue:29-58). Subscribers' Contacts and Segments share one
    // URL key in the map, so their captures are named.
    {
      label: 'page-tabnav',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.omapi-tabnav__item') && !!tabSet(); },
      apply: function (el) {
        var item = closestTo(el, '.omapi-tabnav__item');
        if (item.classList.contains('omapi-tabnav__item-active')) return;
        var set = tabSet();
        var tab = set.tabs[text(item)];
        if (!tab) { R.miss('#tab-' + text(item), 'unknown tab'); return; }
        if (set.page === 'settings' && (tab === 'billing' || tab === 'subaccounts')) {
          // QC round 2 (Windows, 2026-09-27): the app's account page is the
          // app pack's capture; the new window is the same surface in a film.
          R.goto('app-account', { pack: APP_PACK });
          return;
        }
        var url = 'admin.php?page=optin-monster-' + set.page + (tab === set.first ? '' : '&selectedTab=' + tab);
        goUrl(url, set.page === 'monsterleads' ? 'admin-monsterleads-' + tab : null);
      },
      state: function (el) { return { key: 'tab', value: text(closestTo(el, '.omapi-tabnav__item')) }; }
    },

    // ─ Playbooks Category Filter ───────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/node_modules/optinmonster-js-library/src/vue/playbooks/components/Filters.vue:68 @verified 2026-09-27 @product optinmonster
    // Real plugin: toggleCategories flips showCategories (Filters.vue:19-29,
    // :68-70); the options panel renders its groups only while active
    // (filter/Options.vue). The closed page holds an empty panel, so each
    // state is its own capture.
    {
      label: 'playbooks-category-filter',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.playbooks-filter__filter-category'); },
      apply: function (el) {
        var on = closestTo(el, '.playbooks-filter__filter-category').classList.contains('active');
        var s = slug();
        if (!on && s === 'admin-playbooks') R.goto('admin-playbooks--categories-open');
        else if (on && s === 'admin-playbooks--categories-open') R.goto('admin-playbooks');
        else R.miss('#playbooks-categories', 'no capture of ' + s + ' with the panel ' + (on ? 'closed' : 'open'));
      }
    },

    // ─ Playbooks Featured / Latest ─────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/node_modules/optinmonster-js-library/src/vue/playbooks/components/Filters.vue:60 @verified 2026-09-27 @product optinmonster
    // Real plugin: setSort commits the sort; Featured also keeps only the
    // Featured playbooks (Filters.vue:5-18, :60-62). The selected one is inert;
    // the other view is not captured, so it is a logged miss.
    {
      label: 'playbooks-sort',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.playbooks-filter__filter-featured, .playbooks-filter__filter-latest'); },
      apply: function (el) {
        var f = closestTo(el, '.playbooks-filter__filter');
        if (f.classList.contains('selected')) return;
        R.miss('#playbooks-sort-' + text(f).toLowerCase(), 'the ' + text(f) + ' playbooks view is not captured');
      }
    },

    // ─ Contacts campaign filter ────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/monsterleads/components/contacts/Filters.vue:101 @verified 2026-09-27 @product optinmonster
    // Real plugin: the heading and its arrow toggle viewSelect (Filters.vue:4-8,
    // :100-102); the campaign select loses `hidden` and is focused, which opens
    // vue-multiselect (:16, :83-91). The open select is its own capture.
    {
      label: 'contacts-campaign-filter',
      event: 'click',
      match: function (el) {
        return !!closestTo(el, 'h2.omapi-monsterleads__filters-campaign-label, .omapi-monsterleads__filters-campaign-label-arrow');
      },
      apply: function () {
        var s = slug();
        if (s === 'admin-monsterleads-contacts') R.goto('admin-monsterleads-contacts--campaign-filter-open');
        else if (s === 'admin-monsterleads-contacts--campaign-filter-open') R.goto('admin-monsterleads-contacts');
        else R.miss('#contacts-campaign-filter', 'no capture of the campaign filter open over ' + s);
      }
    },

    // ─ A/B tests reveal ────────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/campaigns/components/Table.vue:252 @verified 2026-09-27 @product optinmonster
    // Real plugin: "N Test(s)" and the A/B button emit toggleAbTests
    // (Row.vue:64-73); the table adds or removes the campaign in
    // abTestsToggled (Table.vue:252-259): its child rows lose / gain `hidden`
    // (Row.vue:274-283), the A/B button is v-if="splitsOpen" and the tooltip
    // text flips (:70, :256-258). The open state is its own capture.
    {
      label: 'ab-tests-toggle',
      event: 'click',
      match: function (el) {
        if (closestTo(el, '.campaign-table-ab .split-button')) return true;
        var b = closestTo(el, '.campaign-table-ab button.omapi-button__link');
        return !!b && /^\d+ Tests?$/.test(text(b));
      },
      apply: function (el) {
        var id = rowCampaignId(el);
        var s = slug();
        var expanded = one('tr.child-of-' + id + ':not(.hidden)');
        if (!expanded && s === 'admin-campaigns' && one('tr.child-of-' + id)) R.goto('admin-campaigns--ab-expanded');
        else if (expanded && s === 'admin-campaigns--ab-expanded') R.goto('admin-campaigns');
        else R.miss('#ab-tests-' + id, 'no capture of these A/B tests ' + (expanded ? 'closed' : 'open'));
      }
    },

    // ─ Settings toggles (On / Off, Yes / No) ───────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/common/ToggleInput.vue:61 @verified 2026-09-27 @product optinmonster
    // Real plugin: the two spans emit true / false with the click's default
    // prevented (ToggleInput.vue:6-11, :61-74); the checkbox is `checked`
    // when the value is OFF (:3-4, :51-54). Global cookie rows show "Days:"
    // by `visibility` while ON (settings/components/SiteCookies.vue:21-26,
    // :54-59) and Site.vue's toggleBackup zeroes or restores the days
    // (settings/components/Site.vue:208-213). Misc enables its Saves while any
    // value differs from the loaded one (settings/components/Misc.vue:204-206).
    {
      label: 'toggle-input-switch',
      event: 'click',
      match: function (el) { return !!closestTo(el, 'label.omapi-toggle > .omapi-toggle__button'); },
      apply: function (el, evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        var span = closestTo(el, '.omapi-toggle__button');
        var toggle = span.parentElement;
        var input = one(':scope > input[type="checkbox"]', toggle);
        if (!input || input.disabled) return;
        var on = all(':scope > .omapi-toggle__button', toggle).indexOf(span) === 0;
        input.checked = !on;
        var days = closestTo(toggle, '.omapi-card-setting-section-cookies') && toggle.nextElementSibling;
        if (days && is(days, '.omapi-horizontal-label')) {
          days.style.visibility = on ? 'visible' : 'hidden';
          var n = one('input[type="number"]', days);
          if (n) {
            if (!on) { days.__snapBackup = n.value; n.value = '0'; }
            else if (days.__snapBackup != null) n.value = days.__snapBackup;
          }
        }
        var misc = closestTo(toggle, 'form');
        if (misc && baseOf(slug()) === 'admin-settings-misc') {
          var changed = all('input[type="checkbox"], input[type="radio"]', misc).some(function (i) { return i.checked !== i.defaultChecked; });
          saveButtons(misc, changed);
        }
      },
      state: function (el) {
        var t = closestTo(el, 'label.omapi-toggle');
        var i = t && one('input', t);
        return { key: 'toggle.' + ((i && i.id) || 'input'), value: i ? !i.checked : null };
      }
    },

    // ─ Google Analytics default ────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/settings/components/SiteAnalytics.vue:23 @verified 2026-09-27 @product optinmonster
    // Real plugin: the checkbox is v-model showGoogleAnalytics (:22-23); the
    // account and property selects are v-if on it (:29). The ticked state is
    // its own capture.
    {
      label: 'ga-default-analytics',
      event: 'change',
      match: function (el) { return is(el, '#om-google-analytics input[type="checkbox"]'); },
      apply: function (el) {
        var s = slug();
        if (el.checked && s === 'admin-settings-site') R.goto('admin-settings-site--ga-open');
        else if (!el.checked && s === 'admin-settings-site--ga-open') R.goto('admin-settings-site');
        else R.miss('#google-analytics', 'no capture of ' + s + ' with Google Analytics ' + (el.checked ? 'on' : 'off'));
      },
      state: function (el) { return { key: 'settings.ga', value: !!el.checked }; }
    },

    // ─ Personalization categories ──────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/pages/Personalization.vue:117 @verified 2026-09-27 @product optinmonster
    // Real plugin: a category link sets the filter and clears the search
    // (Personalization.vue:6-20, :117-120); "All" clears the filter (:15-19).
    // The rule list is rendered per filter, so each category is its capture.
    {
      label: 'personalization-filter',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.omapi-personalization__nav > a.omapi-personalization__filter'); },
      apply: function (el) {
        var a = closestTo(el, 'a.omapi-personalization__filter');
        if (a.classList.contains('omapi-personalization__filter-active')) return;
        var i = all('.omapi-personalization__nav > a.omapi-personalization__filter').indexOf(a);
        if (PERSONALIZATION[i]) R.goto(PERSONALIZATION[i]);
        else R.miss('#personalization-' + i, 'category not captured');
      },
      state: function (el) { return { key: 'personalization.filter', value: text(closestTo(el, 'a')) }; }
    },

    // ─ Quick Links flyout ──────────────────────────────────────────────────
    // @since 2026-09-27 @source optinmonster/vue/src/components/common/QuickLinks.vue:82 @verified 2026-09-27 @product optinmonster
    // Real plugin: the head's @click.prevent flips menu.active (:35, :82-84):
    // #om-flyout gains / loses `opened` (:2) and Archie swaps between
    // active-archie.svg and inactive-archie.svg (:76-79). Both images are in
    // _shared/assets under their md5 prefix, byte-identical to the plugin's
    // vue/src/assets/images files (md5 f226317a…, 210fa629…).
    {
      label: 'quick-links-flyout',
      event: 'click',
      match: function (el) { return !!closestTo(el, '#om-flyout > .om-flyout-head'); },
      apply: function (el) {
        var fly = closestTo(el, '#om-flyout');
        var open = !fly.classList.contains('opened');
        fly.classList.toggle('opened', open);
        var img = one(':scope > .om-flyout-head > img', fly);
        if (img) img.setAttribute('src', '../_shared/assets/' + (open ? 'f226317a9521.svg' : '210fa629f5b8.svg'));
      },
      state: function (el) { return { key: 'quicklinks.open', value: closestTo(el, '#om-flyout').classList.contains('opened') }; }
    }

  ], { product: 'optinmonster', file: 'interactivity.js' });

  // A dropdown closes on this click (DropdownSelect.vue:171-184,
  // DropdownButton.vue:203-214): it is open, and the click is outside its nav
  // — or, for a DropdownSelect, the click's parent is one of its options.
  function closes(nav, el, evt) {
    if (!dropdownOpen(nav)) return false;
    if (evt && nav.__snapOpenedBy === evt) return false;
    if (!nav.contains(el)) return true;
    if (!nav.classList.contains('omapi-dropdown__select')) return false;
    var ul = one(':scope > .omapi-dropdown__container > ul', nav);
    return !!ul && !!el.parentNode && el.parentNode.parentNode === ul;
  }

  // Campaigns list: which modal does this control show?
  function campaignModalName(el) {
    if (closestTo(el, '.omapi-add-new')) return 'create-campaign-by-type';
    if (!closestTo(el, '.omapi-campaigns-table')) return null;
    var id = rowCampaignId(el);
    if (!id) return null;
    if (closestTo(el, '.action-campaign-screenshots button')) return id + '-preview-modal';
    if (closestTo(el, '.action-campaign-duplicate button')) return id + '-duplicate-modal';
    if (closestTo(el, '.action-trash-campaign button:not([disabled])')) return id + '-trash-modal';
    var ab = closestTo(el, '.campaign-table-ab button.omapi-button__link');
    if (ab && text(ab) === 'Create Test') return id + '-split-modal';
    var more = closestTo(el, '.campaign-table-additional-actions .omapi-dropdown__container a');
    if (more && text(more) === 'Shareable Link') return id + '-monster-link-modal';
    if (more && text(more) === 'Archive') return id + '-archive-modal';
    return null;
  }

  // Subscribers → Contacts: which modal does this control show?
  function leadModalName(el) {
    if (!closestTo(el, '.omapi-monsterleads')) return null;
    if (closestTo(el, '.omapi-monsterleads__actions .omapi-app-exit')) return 'lead-export-modal';
    var b = closestTo(el, '.omapi-monsterleads__actions button.omapi-button__link');
    if (b && text(b) === 'Send a Bulk Email') return 'email-upsell';
    if (closestTo(el, '.action-monsterleads-view button, .row-actions .view a')) {
      var id = rowLeadId(el);
      return id ? id + '-show-lead-modal' : null;
    }
    return null;
  }

  // Publish Status: the page's own state, read once from the capture —
  // campaignStatus + settingEnabled, as statusText reads them back
  // (Campaign.vue:161-173). A captured "Pending" is taken as active with the
  // embed off.
  function statusState(wrap, steps) {
    if (wrap.__snapStatus) return wrap.__snapStatus;
    var blue = steps.map(function (b) { return b.classList.contains('omapi-button__blue'); });
    var orig = blue[2] ? { status: 'active', enabled: true } : blue[0] ? { status: 'paused', enabled: false } : { status: 'active', enabled: false };
    wrap.__snapStatus = { status: orig.status, enabled: orig.enabled, orig: orig, changed: false };
    return wrap.__snapStatus;
  }
}());
