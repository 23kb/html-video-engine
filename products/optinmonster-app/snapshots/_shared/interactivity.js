/**
 * OptinMonster web app snapshot transitions.
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
 *   // @since 2026-09-27 @source account-dashboard/src/components/UI/AnalyticsFilters.vue:1 @verified 2026-09-27 @product optinmonster-app
 *
 * @source is a real <app folder>/<path>:<line> in the app source on the capture Mac (campaign-builder, campaign-dashboard, account-dashboard, themes/omappv4)
 * `@source synthetic` is banned. Every entry mirrors what the
 * app's own code does and has a case in products/optinmonster-app/qc/parity.json.
 * Core already owns show/hide, tabs, accordion, faux select, custom dropdown,
 * modal shell, copy-flash, toggles and fadeSwap (products/_runtime/DESIGN.md §0.7);
 * this file registers selectors for those and adds only what core cannot know.
 *
 * Phase 7, 2026-09-27. The app is four SPAs (React builder, Vue 2 campaigns
 * page, Vue 3 dashboard + analytics, jQuery template library). Almost every
 * state change re-renders from data the frozen page does not hold, so most
 * entries hand off to the captured `--<state>` sibling (DESIGN §5 option a).
 * Three behaviours are pure DOM in the app and run in place here: the
 * template library's name step, its filter-group collapse and the Advanced
 * Filters type checkboxes. A click whose state was not captured is logged
 * with R.miss(), never answered with a hop to the wrong screen.
 *
 * Plain links already work through core's nav map: the campaigns sidebar
 * (sites, folders, Archives, Trash), the builder header tabs on the three
 * base builder snapshots, "Edit" and "Analytics" links. They have navigate
 * cases in parity.json but no entry here.
 *
 * Class names used: stable app classes only (Header*, Footer__*,
 * ViewSelector__*, SettingsTabs, RuleStepSelector__*, ModalV2__*, Vue and
 * jQuery view classes, data-test hooks). Styled-components hashes (sc-*) are
 * never matched; where a control has no stable class its own label text,
 * rendered from the cited source, identifies it.
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // QC round 1 (Windows, 2026-09-27): the campaigns page's vue-js-modal boxes
  // carry px top/left from the 1440×900 capture viewport and sit off-centre
  // at any other width. Centre them horizontally from CSS (same rule as the
  // plugin pack); the captured top stays.
  (function () {
    var s = document.createElement('style');
    s.setAttribute('data-snap', 'modal-centre');
    s.textContent = '.v--modal-overlay .v--modal-box{left:50%!important;transform:translateX(-50%)}';
    (document.head || document.documentElement).appendChild(s);
  }());

  // ─── helpers ─────────────────────────────────────────────────────────────
  function closestTo(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function text(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function slug() { return R.currentSlug(); }
  // The screen a state variant belongs to: `app-campaigns--modal-embed` → `app-campaigns`.
  function baseOf(s) { return String(s || '').split('--')[0]; }
  function on(list) { return list.indexOf(slug()) !== -1; }
  function hop(target) { if (target && target !== slug()) R.goto(target); }
  // A click on a real control (the app's own handler owns it), not on bare page.
  function onControl(el) { return !!closestTo(el, 'a, button, input, select, textarea, label, [role="button"], [role="option"]'); }

  // ─── surfaces ────────────────────────────────────────────────────────────
  var BD = 'app-builder-design';
  // Design-tab snapshots of campaign tjrnkuhbdzfebjblahxo (p1-builder.json)
  // that differ from the base in one thing only, so a view or device change
  // from them lands on a captured screen. `--mobile-only` is another campaign.
  var BD_PLAIN = [BD, BD + '--view-optin', BD + '--hover'];
  var BD_ALL = [BD, BD + '--view-optin', BD + '--view-success', BD + '--hover', BD + '--block-selected',
    BD + '--element-button', BD + '--row-selected', BD + '--settings', BD + '--settings-advanced',
    BD + '--tablet', BD + '--mobile', BD + '--view-menu', BD + '--modal-import-view', BD + '--modal-campaign-details',
    // QC round 1 block states on the unchanged canvas (p3-blocks.json); states with a dropped block
    // are left out, so a jump from them never silently drops that block.
    BD + '--block-text-inline', BD + '--block-text-hover', BD + '--block-yesno-gear', BD + '--block-yesno-hover',
    BD + '--block-fields', BD + '--block-fields-gear', BD + '--block-fields-hover', BD + '--blocks-home'];
  // QC round 1 block families (Windows, 2026-09-27). Canvas element type →
  // the capture with that block selected. Each p3-blocks family is its own
  // canvas (Image / Button / Countdown / Fields carry a dropped block); Text
  // and Yes/No sit on the base canvas. A block click hops within its own
  // family only, so a jump never drops a block the canvas shows.
  var BLOCK_STATES = { Text: BD + '--block-selected', YesNo: BD + '--element-button', YesButton: BD + '--element-button',
    Image: BD + '--block-image', Button: BD + '--block-button', Countdown: BD + '--block-countdown', Fields: BD + '--block-fields' };
  function q(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function slugFamily(s) {
    var m = /--(?:block|dropped)-(image|button|countdown|fields)/.exec(s || '');
    return m ? m[1] : 'base';
  }
  function elementType(ele) {
    var w = ele && q('[class*="Element--wrapper"]', ele);
    var m = w && /sibley-([A-Za-z]+)Element--wrapper/.exec(w.className);
    return m ? m[1] : '';
  }
  function blockTarget(el) {
    if (!closestTo(el, '.Campaign__canvas')) return null;
    var ele = closestTo(el, '.om-element');
    if (!ele) return null;
    var type = elementType(ele);
    var target = BLOCK_STATES[type];
    if (!target) return null;
    // QC round 2 (Windows): any block on any builder canvas opens its capture
    // (a block the other family's canvas lacks disappears; Umair's call:
    // a link beats a dead click). The first text block is the captured one.
    if (type === 'Text' && slugFamily(slug()) === 'base' && !(ele.classList.contains('sibley-ele-1') && closestTo(ele, '.sibley-row-1'))) return null;
    return target;
  }
  // The hover toolbar's Edit on a --block-<type>-hover capture → that block's
  // settings capture (Text has no gear view: its Edit opens the inline editor).
  function gearTarget() {
    var m = /^(app-builder-design--block-(image|button|countdown|fields|yesno|text))(-hover|-gear)?$/.exec(slug());
    if (!m) return null;
    return m[2] === 'text' ? BD + '--block-text-inline' : m[1] + '-gear';
  }
  function onBlockState() { return /^app-builder-design--(block-|element-button|dropped-)/.test(slug()); }
  // QC round 2: the block type a builder slug's panel belongs to, and its base capture.
  function blockTypeOf(s) {
    if (/--element-button|--block-yesno/.test(s)) return 'yesno';
    var m = /--block-(button|countdown|fields|image|text)/.exec(s);
    return m ? m[1] : null;
  }
  function blockBaseSlug(bt) {
    return bt === 'yesno' ? BD + '--element-button' : bt === 'text' ? BD + '--block-selected' : BD + '--block-' + bt;
  }
  // A react-select's label → the suffix of its "-open" capture (p4-panels.json).
  var SELECT_SLUGS = { 'button click action': 'button-action', 'button size': 'button-size', 'go to view': 'go-to-view',
    'countdown type': 'countdown-type', 'countdown end action': 'end-action', 'end time': 'end-time', 'timezone': 'timezone',
    'input field size': 'input-field-size' };
  function selectLabel(control) {
    var wrap = closestTo(control, '[class*="SelectInput"]') || control.parentElement;
    var lab = wrap && (wrap.querySelector('span, label') || null);
    return lab ? text(lab).toLowerCase().replace(/[^a-z ]/g, '').trim() : '';
  }

  var DR = 'app-builder-display-rules';
  var DR_ALL = [DR, DR + '--conditions', DR + '--actions', DR + '--summary', DR + '--rule-selector'];
  var CP = 'app-campaigns';
  var NC = 'app-new-campaign';
  var DA = 'app-dashboard';
  var CA = 'app-campaign-analytics';

  // The theme header's two dropdowns (themes/omappv4/assets/js/view/Header.js:42-52):
  // the link that opens each, and the dropdown it opens.
  var HEADER_DROPDOWNS = [
    ['.inline-user-dropdown-link .nav-link', '.user-actions-dropdown'],
    ['.inline-user-leads-link .nav-link', '.lead-actions-dropdown']
  ];
  function headerPair(el) {
    for (var i = 0; i < HEADER_DROPDOWNS.length; i++) {
      if (closestTo(el, HEADER_DROPDOWNS[i][0])) return HEADER_DROPDOWNS[i];
    }
    return null;
  }
  // Dropdown.closeDropdown (Dropdown.js:102-121), for one link + dropdown pair.
  function headerClose(pair) {
    all(pair[0]).forEach(function (l) { l.classList.remove('dropdown-component--active'); });
    all(pair[1]).forEach(function (d) {
      d.classList.remove('dropdown-component--expanded', 'child-active');
      all('.dropdown-child.active', d).forEach(function (c) { c.classList.remove('active'); });
    });
  }

  R.register([

    // ═══ Theme header (campaigns, dashboard, template library, account) ═══

    // ─ Header user and Leads dropdowns ─────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/component/Dropdown.js:54 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: onDropdownClick → update(): open adds
    // `dropdown-component--active` to the link and
    // `dropdown-component--expanded` to the dropdown (openDropdown, :128-140),
    // after clearing every other active link; a second click closes it
    // (closeDropdown, :102-121); then closeLikeDropdowns drops `--expanded`
    // from every other dropdown (:66-81).
    {
      label: 'header-dropdown-toggle',
      event: 'click',
      match: function (el) { return !!headerPair(el); },
      apply: function (el) {
        var pair = headerPair(el);
        var drop = document.querySelector(pair[1]);
        if (!drop) return;
        if (drop.classList.contains('dropdown-component--expanded')) {
          headerClose(pair);
        } else {
          all('.dropdown-component--active').forEach(function (l) { l.classList.remove('dropdown-component--active'); });
          all('.dropdown-child.active').forEach(function (c) { c.classList.remove('active'); });
          all(pair[0]).forEach(function (l) { l.classList.add('dropdown-component--active'); });
          R.clearBaked(drop);
          drop.classList.add('dropdown-component--expanded');
        }
        all('.dropdown-component--expanded').forEach(function (d) {
          if (d !== drop) d.classList.remove('dropdown-component--expanded', 'child-active');
        });
      },
      state: function (el) {
        var pair = headerPair(el);
        var drop = pair && document.querySelector(pair[1]);
        return { key: 'header.dropdown', value: drop && drop.classList.contains('dropdown-component--expanded') ? pair[1] : null };
      }
    },

    // ─ Header dropdown closes on a click elsewhere ─────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/component/Dropdown.js:149 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: dropdownGlobalClose, bound on document while a
    // dropdown is open (:139), closes it on any click outside the dropdown
    // (:152-157). It changes classes only, so it runs after every other entry
    // and races none of them. A click on a link or submit button is left to
    // its own handling: a matched entry would swallow the link's navigation
    // in core, and the page it opens has no open dropdown anyway.
    {
      label: 'header-dropdown-outside',
      event: 'click',
      order: 'last',
      match: function (el) {
        if (headerPair(el) || closestTo(el, 'a[href], button[type="submit"], input[type="submit"]')) return false;
        return HEADER_DROPDOWNS.some(function (p) {
          var d = document.querySelector(p[1]);
          return !!d && d.classList.contains('dropdown-component--expanded') && !d.contains(el);
        });
      },
      apply: function (el) {
        HEADER_DROPDOWNS.forEach(function (p) {
          var d = document.querySelector(p[1]);
          if (d && d.classList.contains('dropdown-component--expanded') && !d.contains(el)) headerClose(p);
        });
      }
    },

    // ═══ Builder ═══════════════════════════════════════════════════════════

    // ─ Builder header tabs ─────────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Header/HeaderNavLink.js:73 @verified 2026-09-27 @product optinmonster-app
    // Real app: a react-router NavLink to `/` (Design) or `/<path>/` under the
    // HashRouter the builder mounts on /campaigns/<id>/edit/ (App.js:56-62);
    // onClick also runs changeBuilderTab. No request. Core's nav map resolves
    // these hash links only on the base builder snapshots (a `--<state>`
    // variant has no key of its own), so the link is resolved against the
    // builder's own `edit/` route from every builder snapshot. The tab that
    // is already active (`.active`, NavLink) stays inert.
    {
      label: 'builder-header-tab',
      event: 'click',
      match: function (el) {
        return /^app-builder-/.test(slug()) && !!closestTo(el, '.Header__nav a[class*="HeaderNavLink--"][href^="#/"]');
      },
      apply: function (el) {
        var a = closestTo(el, '.Header__nav a[href^="#/"]');
        if (a.classList.contains('active')) return;
        var href = a.getAttribute('href');
        // QC round 2 (Windows, 2026-09-27): the tabs are a fixed set; name
        // their captures directly, the nav map only as a fallback, so a
        // block or modal state whose key the map lacks still switches tabs.
        var TABS = { '#/': BD, '#/rulesets/': DR, '#/publish/': 'app-builder-publish', '#/analytics/': 'app-builder-analytics' };
        var target = TABS[href] || R.resolveHref('edit/' + href);
        if (target) hop(target);
        else R.miss(href, 'no builder tab captured for ' + href);
      },
      state: function (el) {
        var a = closestTo(el, '.Header__nav a[href^="#/"]');
        return { key: 'builder.tab', value: a ? a.getAttribute('href') : null };
      }
    },

    // ─ Builder footer view selector ────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/ViewSelector.js:271 @verified 2026-09-27 @product optinmonster-app
    // Real app: handleChangeView reads the button's `value` (yesno / optin /
    // success) and dispatches changeCampaignView; the canvas re-renders that
    // view. Captured: Yes/No (the campaign opens on it, so it is the base),
    // Optin (`--view-optin`, p2-app.json) and Success (`--view-success`). The ⋯ toggle inside
    // the button is the view menu (next entry), not a view change.
    {
      label: 'builder-view-select',
      event: 'click',
      match: function (el) {
        return /^app-builder-design/.test(slug()) && !!closestTo(el, '.ViewSelector__Container .ViewSelector__Item')
          && !closestTo(el, '[class*="Dropdown-toggle__"]');
      },
      apply: function (el) {
        var view = closestTo(el, '.ViewSelector__Item').value;
        var current = { [BD + '--view-success']: 'success', [BD + '--view-optin']: 'optin', [BD + '--block-fields']: 'optin', [BD + '--block-fields-gear']: 'optin', [BD + '--block-fields-hover']: 'optin' }[slug()] || 'yesno';
        if (view === current) return;
        var target = { yesno: BD, optin: BD + '--view-optin', success: BD + '--view-success' }[view];
        if (!target) { R.miss('#view-' + view, 'the ' + view + ' view is not captured'); return; }
        // QC round 2 (Windows): from any builder state the view switches to
        // its capture (the panel or device it drops is the lesser evil).
        hop(target);
      },
      state: function (el) { return { key: 'builder.view', value: closestTo(el, '.ViewSelector__Item').value }; }
    },

    // ─ Builder footer view menu ────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/View.js:291 @verified 2026-09-27 @product optinmonster-app
    // Real app: `.Dropdown-toggle__<viewId>` toggles a Tippy menu (Duplicate /
    // Delete / Rename / Move, appended to body). Captured for the Yes/No view
    // (`--view-menu`, p2-app.json). A second click closes it (the toggle is a
    // flip of isDropdownOpen).
    {
      label: 'builder-view-menu-toggle',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '[class*="Dropdown-toggle__"]'); },
      apply: function (el) {
        var t = closestTo(el, '[class*="Dropdown-toggle__"]');
        if (slug() === BD + '--view-menu') { hop(BD); return; }
        if (t.classList.contains('Dropdown-toggle__yesno')) hop(BD + '--view-menu');
        else R.miss('#' + t.className.match(/Dropdown-toggle__\w+/)[0], 'only the Yes/No view menu is captured');
      }
    },

    // ─ Builder view menu closes on an outside click ────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/View.js:286 @verified 2026-09-27 @product optinmonster-app
    // Real app: Tippy's onClickOutside sets isDropdownOpen false. Only a click
    // on bare page counts here, so a control's own entry is not raced.
    {
      label: 'builder-view-menu-outside',
      event: 'click',
      match: function (el) {
        return slug() === BD + '--view-menu' && !closestTo(el, '[data-tippy-root]') && !onControl(el);
      },
      apply: function () { hop(BD); }
    },

    // ─ Builder device switcher ─────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Header/DeviceSwitcher.js:237 @verified 2026-09-27 @product optinmonster-app
    // Real app: updatePreviewMode(device) → `.PreviewContainer.PreviewMode-<mode>`
    // and aria-pressed on the button (DeviceSwitcher.js:232-236). Captured:
    // desktop (base), `--tablet`, `--mobile`. The pressed button is inert.
    {
      label: 'builder-device-switch',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.HeaderDeviceSwitcher button[aria-label]'); },
      apply: function (el) {
        var b = closestTo(el, '.HeaderDeviceSwitcher button[aria-label]');
        if (b.getAttribute('aria-pressed') === 'true') return;
        var target = { 'Desktop view': BD, 'Tablet view': BD + '--tablet', 'Mobile view': BD + '--mobile' }[b.getAttribute('aria-label')];
        if (!target) { R.miss('#device', 'unknown device button'); return; }
        // QC round 2 (Windows): from any builder state; the device captures
        // show the base canvas.
        hop(target);
      },
      state: function (el) { return { key: 'builder.device', value: closestTo(el, 'button').getAttribute('aria-label') }; }
    },

    // ─ Builder Settings button ─────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Layout/FooterContent.js:89 @verified 2026-09-27 @product optinmonster-app
    // Real app: handleSettingsClick → goToSettings (FooterContent.js:67-69);
    // the sidebar swaps to the Settings panel. Captured as `--settings`.
    {
      label: 'builder-settings-open',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.Footer__settingsBtn'); },
      apply: function () {
        if (slug() === BD + '--settings' || slug() === BD + '--settings-advanced') return;
        hop(BD + '--settings');
      }
    },

    // ─ Builder Settings tabs ───────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Layout/SettingsTabs.js:73 @verified 2026-09-27 @product optinmonster-app
    // Real app: the first tab calls onTabClick('content'), the second
    // onTabClick('advanced') (:73-83); the panel re-renders its accordions.
    // Captured for the Settings panel: Basic (`--settings`) and Advanced
    // (`--settings-advanced`). On a block's panel the Advanced tab is not
    // captured.
    {
      label: 'builder-settings-tab',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.SettingsTabs > button'); },
      apply: function (el) {
        var b = closestTo(el, '.SettingsTabs > button');
        var i = all('.SettingsTabs > button').indexOf(b);
        if (slug() === BD + '--settings' || slug() === BD + '--settings-advanced') {
          hop(i === 0 ? BD + '--settings' : BD + '--settings-advanced');
          return;
        }
        // QC round 2 captures: each block panel's Advanced tab.
        var bt = blockTypeOf(slug());
        if (!bt) { if (i !== 0) R.miss('#settings-tab-advanced', 'the Advanced tab of this panel is not captured'); return; }
        hop(i === 0 ? blockBaseSlug(bt) : BD + '--block-' + bt + '-advanced');
      },
      state: function (el) { return { key: 'builder.settingsTab', value: text(closestTo(el, 'button')) }; }
    },

    // ─ Builder block selection ─────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Elements/Components/Element.js:675 @verified 2026-09-27 @product optinmonster-app
    // Real app: `.Element__content` onClick → handleEditElement (:418-446) →
    // openElementSettingsPanel; the element gets `Element--beingEdited` and
    // the sidebar shows its panel. Captured for the first text block
    // (`.sibley-row-1 .sibley-ele-1`, `--block-selected`). Other blocks are
    // not captured (`--element-button` shows the row's panel, see notes).
    {
      label: 'builder-block-select',
      event: 'click',
      match: function (el) { return on(BD_ALL) && !!closestTo(el, '.Campaign__canvas .Element__content'); },
      apply: function (el) {
        var ele = closestTo(el, '.om-element');
        var first = ele && ele.classList.contains('sibley-ele-1') && !!closestTo(ele, '.sibley-row-1');
        if (!first) { R.miss('#element', 'no captured selection for this block'); return; }
        if (slug() === BD + '--block-selected') return;
        if (!on(BD_PLAIN.concat(BD + '--row-selected', BD + '--element-button', BD + '--settings', BD + '--settings-advanced'))) {
          R.miss('#element', 'block selection from ' + slug() + ' keeps a state the capture does not show');
          return;
        }
        hop(BD + '--block-selected');
      }
    },

    // ─ Builder blocks: QC round 1 wiring (Windows, 2026-09-27) ─────────────
    // @since 2026-09-27 @source campaign-builder/src/Elements/Components/Element.js:418 @verified 2026-09-27 @product optinmonster-app
    // Real app: a click on a block runs handleEditElement (:418-446), which
    // opens that block's settings panel and marks it Element--beingEdited.
    // The p3-blocks captures hold that state per block type; the click hops
    // to the one for the block, inside the block's own canvas family.
    {
      label: 'builder-block-open',
      event: 'click',
      match: function (el) { return !!blockTarget(el); },
      apply: function (el) { hop(blockTarget(el)); },
      state: function (el) { return { key: 'builder.block', value: elementType(closestTo(el, '.om-element')) }; }
    },

    // @since 2026-09-27 @source campaign-builder/src/Elements/Components/Element.js:418 @verified pending-mac @product optinmonster-app
    // The block's hover toolbar as captured on --block-<type>-hover
    // (Element__action--edit / --duplicate / --remove). Edit opens the
    // block's settings: the -gear capture. Duplicate and Delete are pure DOM
    // here (the real app updates its store and re-renders the same result).
    // Mac: cite the toolbar component and its duplicate / remove handlers.
    {
      label: 'builder-block-action-edit',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.Element__action--edit') && !!gearTarget(); },
      apply: function () { hop(gearTarget()); }
    },
    {
      label: 'builder-block-action-duplicate',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.Element__action--duplicate') && !!closestTo(el, '.om-element'); },
      apply: function (el) {
        var ele = closestTo(el, '.om-element');
        var copy = ele.cloneNode(true);
        copy.classList.remove('Element--beingEdited');
        ele.parentNode.insertBefore(copy, ele.nextSibling);
      }
    },
    {
      label: 'builder-block-action-remove',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.Element__action--remove') && !!closestTo(el, '.om-element'); },
      apply: function (el) {
        var ele = closestTo(el, '.om-element');
        if (ele.parentNode) ele.parentNode.removeChild(ele);
      }
    },

    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Layout/Header.js:1 @verified pending-mac @product optinmonster-app
    // The home button in a block panel's header (the house glyph, next to
    // "Editing: <block>") returns the sidebar to the Blocks list, which is
    // the --blocks-home capture. Mac: cite the header component's home handler.
    {
      label: 'builder-panel-home',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, 'button');
        return !!b && onBlockState() && !!q('svg path[d^="M222.27 481.26"]', b);
      },
      apply: function () { hop(BD + '--blocks-home'); }
    },

    // ─ QC round 2 header + rulesets links (Windows, 2026-09-27) ────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Header/HeaderNav.js:1 @verified pending-mac @product optinmonster-app
    // Close Campaign (×) and the logo's "Exit to Campaign Dashboard" leave the
    // builder for the campaigns list: the app-campaigns capture.
    {
      label: 'builder-exit',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, 'button[title="Close Campaign"], a[title="Exit to Campaign Dashboard"], [title="Exit to Campaign Dashboard"]');
        return /^app-builder-/.test(slug()) && !!b;
      },
      apply: function () { hop('app-campaigns'); }
    },
    // @since 2026-09-27 @source campaign-builder/src/Rulesets/Components/RulesetList.js:1 @verified pending-mac @product optinmonster-app
    // "Add a New Ruleset" creates a ruleset and opens its conditions with the
    // rule selector: the --rule-selector capture.
    {
      label: 'rules-add-ruleset',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, 'button');
        return on(DR_ALL) && !!b && /^Add a New Ruleset$/i.test(text(b));
      },
      apply: function () { hop(DR + '--new-ruleset'); }   // QC round 2 capture
    },
    // QC round 2 (Windows, 2026-09-27): the new Display Rules and builder captures.
    {
      label: 'rules-manage',
      event: 'click',
      match: function (el) { var b = closestTo(el, 'button'); return on(DR_ALL) && !!b && /^Manage$/.test(text(b)); },
      apply: function () { hop(DR + '--manage'); }
    },
    {
      label: 'builder-select-open',
      event: 'click',
      match: function (el) { return /^app-builder-/.test(slug()) && !!closestTo(el, '.Select__control') && !closestTo(el, '.Select__menu'); },
      apply: function (el) {
        var c = closestTo(el, '.Select__control');
        var label = selectLabel(c);
        var target = null;
        if (/^app-builder-display-rules/.test(slug())) {
          target = /monstereffects|animate/.test(label) ? DR + '--actions-effects-open' : /converted|cookie/.test(label) ? DR + '--actions-cookie-open' : null;
        } else {
          var bt = blockTypeOf(slug()), sfx = SELECT_SLUGS[label];
          if (bt && sfx) target = BD + '--block-' + bt + '-' + sfx + '-open';
        }
        if (target) hop(target);
        else R.miss('#select-' + (label || 'unlabelled').replace(/\s+/g, '-'), 'this select is not captured open');
      },
      state: function (el) { return { key: 'builder.select', value: selectLabel(closestTo(el, '.Select__control')) }; }
    },
    {
      label: 'builder-select-option',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.Select__menu .Select__option'); },
      apply: function (el) {
        var opt = closestTo(el, '.Select__option');
        var sel = closestTo(opt, '.Select');
        var value = sel && sel.querySelector('.Select__single-value');
        if (value) value.textContent = text(opt);
        var menu = closestTo(opt, '.Select__menu');
        if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
      },
      state: function (el) { return { key: 'builder.selectValue', value: text(closestTo(el, '.Select__option')) }; }
    },
    {
      label: 'analytics-make-primary',
      event: 'click',
      match: function (el) { return /^app-campaign-analytics/.test(slug()) && !!closestTo(el, '[data-test="make-primary"]'); },
      apply: function () { hop(CA + '--make-primary'); }
    },
    {
      label: 'dashboard-sites-open',
      event: 'click',
      match: function (el) { return baseOf(slug()) === DA && !!closestTo(el, '.multiselect.om-dashboard-analytics-filters'); },
      apply: function () { hop(slug() === DA + '--sites-open' ? DA : DA + '--sites-open'); }
    },
    {
      label: 'dashboard-offer-feedback',
      event: 'click',
      match: function (el) { var b = closestTo(el, 'button, a'); return baseOf(slug()) === DA && !!b && /Offer Feedback/i.test(text(b)); },
      apply: function () { hop('app-support'); }
    },
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Header/HeaderNavButton.js:1 @verified pending-mac @product optinmonster-app
    // Save is a write; the real button reads "Saved" for a moment and comes
    // back. Done in place so the click is never dead.
    {
      label: 'builder-save',
      event: 'click',
      match: function (el) { return /^app-builder-/.test(slug()) && !!closestTo(el, 'button[title^="Save Campaign"]'); },
      apply: function (el) {
        var b = closestTo(el, 'button');
        var was = b.textContent;
        b.textContent = 'Saved';
        R.wait(1200, function () { b.textContent = was; });
      }
    },

    // ─ QC round 2 in-place controls (Windows, 2026-09-27) ──────────────────
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Components/SettingsAccordion.js:1 @verified pending-mac @product optinmonster-app
    // Sidebar accordions (Standard / Smart / Saved Blocks, each block's
    // option groups) open and close in place. Block Visibility too.
    {
      label: 'builder-accordion-toggle',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.SettingsAccordion > button, .BlockVisibility > button'); },
      apply: function (el) {
        var b = closestTo(el, '.SettingsAccordion > button, .BlockVisibility > button');
        var body = b.parentElement.querySelector('.SettingsAccordion__content') || b.nextElementSibling
          || (b.parentElement.classList.contains('BlockVisibility') ? b.parentElement.nextElementSibling : null);
        if (!body) return;
        var open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
      }
    },
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Components/OptionButton.js:1 @verified pending-mac @product optinmonster-app
    // Option button groups (Solid / Gradient, alignment, sizes): the clicked
    // option takes OptionButton--active from its siblings.
    {
      label: 'builder-option-button',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.OptionButton'); },
      apply: function (el) {
        var b = closestTo(el, '.OptionButton');
        all('.OptionButton', b.parentElement).forEach(function (x) { x.classList.toggle('OptionButton--active', x === b); });
      }
    },
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Components/NumberInput.js:1 @verified pending-mac @product optinmonster-app
    // Number steppers change the field's value by one.
    {
      label: 'builder-number-step',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.NumberInput__step-up, .NumberInput__step-down'); },
      apply: function (el) {
        var b = closestTo(el, '.NumberInput__step-up, .NumberInput__step-down');
        var wrap = b.parentElement, input = null;
        while (wrap && !(input = wrap.querySelector('input'))) wrap = wrap.parentElement;
        if (!input) return;
        var v = parseFloat(input.value) || 0;
        input.value = String(v + (b.classList.contains('NumberInput__step-up') ? 1 : -1));
      }
    },
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Components/SettingsDropdown.js:1 @verified pending-mac @product optinmonster-app
    // The small settings dropdown toggle shows its active state; its menu is
    // rendered on open by React and is not captured.
    {
      label: 'builder-settings-dropdown',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.SettingsDropdown__toggle'); },
      apply: function (el) {
        var b = closestTo(el, '.SettingsDropdown__toggle');
        b.classList.toggle('SettingsDropdown__toggle--active');
        if (b.classList.contains('SettingsDropdown__toggle--active')) R.miss('#settings-dropdown', 'the dropdown menu is not captured');
      }
    },
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Blocks/BlockTile.js:1 @verified pending-mac @product optinmonster-app
    // Block tiles are dragged onto the canvas in the real app. A click opens
    // the captured after-drop state where one exists (Image, Button,
    // Countdown); a film drags with the cursor and then jumps to the same
    // capture.
    {
      label: 'builder-block-tile',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.SettingsAccordion__content li[draggable="true"]'); },
      apply: function (el) {
        var li = closestTo(el, 'li[draggable="true"]');
        var name = text(li);
        var dropped = { Image: BD + '--dropped-image', Button: BD + '--dropped-button', Countdown: BD + '--dropped-countdown' }[name];
        if (dropped) hop(dropped);
        else R.miss('#block-tile-' + name.toLowerCase().replace(/\s+/g, '-'), 'no after-drop capture for the ' + name + ' block');
      },
      state: function (el) { return { key: 'builder.dropBlock', value: text(closestTo(el, 'li')) }; }
    },
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/Footer.js:1 @verified pending-mac @product optinmonster-app
    // Undo / redo, the footer scroll arrows, Add View and Support have no
    // captured result; the click is logged instead of dying.
    {
      label: 'builder-footer-misc',
      event: 'click',
      match: function (el) { return /^app-builder-/.test(slug()) && !!closestTo(el, '[class*="Footer__undoRedo"], [class*="scroll-footer-"], [class*="add-campaign-view"], button[title="Support"]'); },
      apply: function (el) {
        var b = closestTo(el, 'button') || el;
        var m = (b.className || '').match(/[A-Za-z_-]*(undoRedo|scroll-footer|add-campaign)[A-Za-z_-]*/);
        R.miss('#' + (b.getAttribute('title') || (m ? m[0] : 'footer-button')), 'no captured result');
      }
    },
    // @since 2026-09-27 @source campaign-builder/src/Elements/Components/CloseButton.js:1 @verified pending-mac @product optinmonster-app
    // The campaign's own close button on the canvas closes nothing in the
    // builder; a click selects nothing either. Logged, never dead.
    {
      label: 'builder-canvas-close',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.Campaign__canvas .sibley-CloseButton'); },
      apply: function () { R.miss('#campaign-close', 'the campaign close button is display only in the builder'); }
    },
    // @since 2026-09-27 @source account-dashboard/src/components/Charts/Legend.js:1 @verified pending-mac @product optinmonster-app
    // A chart legend item toggles its series (ApexCharts: the legend item
    // gets apexcharts-inactive-legend and the series group hides).
    {
      label: 'analytics-legend-toggle',
      event: 'click',
      match: function (el) { return !!closestTo(el, '.apexcharts-legend-series'); },
      apply: function (el) {
        var item = closestTo(el, '.apexcharts-legend-series');
        var rel = item.getAttribute('rel');
        var off = item.classList.toggle('apexcharts-inactive-legend');
        var chart = closestTo(item, '.apexcharts-canvas') || closestTo(item, '[class*="apexcharts"]') || document;
        all('.apexcharts-series[rel="' + rel + '"]', chart.parentElement || document).forEach(function (g) { g.style.visibility = off ? 'hidden' : ''; });
      }
    },
    // @source campaign-dashboard/src/components/Sidebar/SidebarItem.vue:1 @since 2026-09-27 @verified pending-mac @product optinmonster-app
    // Any site or folder in the campaigns sidebar opens the captured site /
    // folder page, renamed to the one clicked (params: name / was).
    {
      label: 'campaigns-sidebar-site-folder',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.campaign-sidebar a[href^="/campaigns/site/"], .campaign-sidebar a[href^="/campaigns/folder/"]');
        return !!a && !R.resolveHref(a.getAttribute('href'));
      },
      apply: function (el) {
        var a = closestTo(el, 'a[href]');
        var kind = /\/campaigns\/site\//.test(a.getAttribute('href')) ? 'site' : 'folder';
        var captured = all('.campaign-sidebar a[href^="/campaigns/' + kind + '/"]').filter(function (x) { return !!R.resolveHref(x.getAttribute('href')); })[0];
        var name = text(a.querySelector('.name') || a), was = captured ? text(captured.querySelector('.name') || captured) : '';
        R.goto(CP + '-' + kind, name && was && name !== was ? { params: { name: name, was: was } } : null);
      }
    },
    // Folder link inside a campaign row's details ("Folder: Seasonal").
    {
      label: 'campaigns-row-folder',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, 'a[href="#"]');
        return baseOf(slug()) === CP && !!a && /^Folder:/.test(text(closestTo(a, 'p')));
      },
      apply: function (el) {
        var a = closestTo(el, 'a');
        var captured = all('.campaign-sidebar a[href^="/campaigns/folder/"]').filter(function (x) { return !!R.resolveHref(x.getAttribute('href')); })[0];
        var was = captured ? text(captured.querySelector('.name') || captured) : '';
        R.goto(CP + '-folder', text(a) && was && text(a) !== was ? { params: { name: text(a), was: was } } : null);
      }
    },
    // Campaign ID: the copy link flashes "Copied!" (the real app copies to the clipboard).
    {
      label: 'campaigns-copy-id',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, 'a[href="#"]');
        return baseOf(slug()) === CP && !!a && /^[a-z0-9]{20}$/.test(text(a));
      },
      apply: function (el) {
        var a = closestTo(el, 'a');
        var was = a.textContent;
        a.textContent = 'Copied!';
        R.wait(1000, function () { a.textContent = was; });
      }
    },
    // Sidebar section chevrons collapse and expand the section in place.
    {
      label: 'campaigns-sidebar-section-toggle',
      event: 'click',
      match: function (el) { var a = closestTo(el, '.sidebar-section-title a[href="#"]'); return baseOf(slug()) === CP && !!a; },
      apply: function (el) {
        var title = closestTo(el, '.sidebar-section-title');
        var body = title && title.nextElementSibling;
        if (!body) return;
        var open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        var icon = title.querySelector('a[href="#"] svg');
        if (icon) icon.style.transform = open ? 'rotate(180deg)' : '';
      }
    },
    // Row icons that link to the app's own host (edit pencil, analytics):
    // the campaign pages captured for one campaign open for any campaign.
    {
      label: 'campaigns-row-app-link',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, 'a[href]');
        var h = a ? a.getAttribute('href') || '' : '';
        return baseOf(slug()) === CP && /\/campaigns\/[a-z0-9]+\/(edit|analytics)/.test(h) && !R.resolveHref(h);
      },
      apply: function (el) {
        var h = closestTo(el, 'a[href]').getAttribute('href');
        hop(/\/analytics/.test(h) ? CA : BD);
      }
    },
    // A page capture opened for another site / folder: `was` → `name` in the app root.
    {
      label: 'page-rename-for-params',
      event: 'snap:params',
      match: function (el, evt) { return !!(evt && evt.detail && evt.detail.name && evt.detail.was); },
      apply: function (el, evt) {
        var was = evt.detail.was, name = evt.detail.name;
        var root = q('#app') || document.body;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue.indexOf(was) !== -1) node.nodeValue = node.nodeValue.split(was).join(name);
        }
        if (document.title.indexOf(was) !== -1) document.title = document.title.split(was).join(name);
      }
    },
    // @source themes/omappv4/assets/js/view/Templates.js:1 @since 2026-09-27 @verified pending-mac @product optinmonster-app
    // Template library: the favourite heart toggles in place; the device
    // filter menu opens in place; Clear Filters returns to the full grid.
    {
      label: 'new-campaign-favorite-toggle',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.om-favorite-toggle'); },
      apply: function (el) {
        var b = closestTo(el, '.om-favorite-toggle');
        var on = b.classList.toggle('is-favorited');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('title', on ? 'Unfavorite this template' : 'Favorite this template');
        b.setAttribute('aria-label', b.getAttribute('title'));
      }
    },
    {
      label: 'new-campaign-submenu-toggle',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.has-sub-menu') && !closestTo(el, '.sub-menu-item'); },
      apply: function (el) {
        var wrap = closestTo(el, '.has-sub-menu');
        var menu = wrap.querySelector('.sub-menu');
        if (!menu) return;
        var open = wrap.classList.toggle('open');
        menu.style.display = open ? 'block' : '';
      }
    },
    {
      label: 'new-campaign-clear-filters',
      event: 'click',
      match: function (el) { var b = closestTo(el, 'button'); return baseOf(slug()) === NC && !!b && /Clear Filters/i.test(text(b)); },
      apply: function () { hop(NC); }
    },

    // ─ Builder Import View button ──────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Sidebar/Layout/FooterContent.js:95 @verified 2026-09-27 @product optinmonster-app
    // Real app: openImportLayoutModal → the Import View ModalV2 (tabs Current
    // Campaign / All Campaigns / All Templates, ImportLayoutModal.js:38-51).
    // Captured as `--modal-import-view` on its first tab.
    {
      label: 'builder-import-view-open',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.Footer__importLayoutBtn'); },
      apply: function () { hop(BD + '--modal-import-view'); }
    },

    // ─ Builder Campaign Details button ─────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/Footer.js:116 @verified 2026-09-27 @product optinmonster-app
    // Real app: openCampaignDetailsModal → the Campaign Details ModalV2.
    // Captured as `--modal-campaign-details`.
    {
      label: 'builder-campaign-details-open',
      event: 'click',
      match: function (el) { return /^app-builder-design/.test(slug()) && !!closestTo(el, '.edit-campaign-details'); },
      apply: function () { hop(BD + '--modal-campaign-details'); }
    },

    // ─ Builder modal close ─────────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/ModalV2/index.js:117 @verified 2026-09-27 @product optinmonster-app
    // Real app: the header × calls onRequestClose (:117); react-modal also
    // calls it on an overlay click (shouldCloseOnOverlayClick, default true,
    // :91 / :112). The Campaign Details Cancel button closes the same way.
    // Closing lands on the design screen the modal opened over.
    {
      label: 'builder-modal-close',
      event: 'click',
      match: function (el) {
        if (!on([BD + '--modal-import-view', BD + '--modal-campaign-details'])) return false;
        if (closestTo(el, '.ModalV2__Content--header-close')) return true;
        if (el.classList && el.classList.contains('ModalV2__Overlay')) return true;
        var b = closestTo(el, '.ModalV2__Content button');
        return !!b && text(b) === 'Cancel';
      },
      apply: function () { hop(BD); }
    },

    // ─ Builder modal closes on Escape ──────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/ModalV2/index.js:105 @verified 2026-09-27 @product optinmonster-app
    // Real app: react-modal's shouldCloseOnEsc (default true) calls the
    // onRequestClose passed at :105.
    {
      label: 'builder-modal-escape',
      event: 'keydown',
      match: function (el, e) { return !!e && e.key === 'Escape' && on([BD + '--modal-import-view', BD + '--modal-campaign-details']); },
      apply: function () { hop(BD); }
    },

    // ─ Display Rules step selector ─────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Core/Components/Footer/RuleStepSelector.js:30 @verified 2026-09-27 @product optinmonster-app
    // Real app: handleChangeStep reads the button's `value` (conditions /
    // actions / summary) and calls changeCurrentStep. The tab opens on the
    // Summary step for a campaign with rules (the base capture). Captured:
    // `--conditions`, `--actions`, `--summary`.
    {
      label: 'rules-step-select',
      event: 'click',
      match: function (el) { return on(DR_ALL) && !!closestTo(el, '[class*="RuleStepSelector__"][value]'); },
      apply: function (el) {
        var step = closestTo(el, '[class*="RuleStepSelector__"][value]').value;
        var current = slug() === DR ? 'summary' : slug() === DR + '--rule-selector' ? 'conditions' : slug().replace(DR + '--', '');
        if (step === current && slug() !== DR + '--rule-selector') return;
        hop(DR + '--' + step);
      },
      state: function (el) { return { key: 'rules.step', value: closestTo(el, '[value]').value }; }
    },

    // ─ Display Rules "Go To" next-step button ──────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Rulesets/Base/NextStepButton.js:56 @verified 2026-09-27 @product optinmonster-app
    // Real app: "Done? Go To <Next step>" calls goToNextStep. The label is the
    // next step's name (:58), which is how the button is found here.
    {
      label: 'rules-next-step',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.ContentArea--rulesets button');
        return on(DR_ALL) && !!b && /Go To (Conditions|Actions|Summary)/.test(text(b));
      },
      apply: function (el) {
        var step = text(closestTo(el, 'button')).match(/Go To (\w+)/)[1].toLowerCase();
        hop(DR + '--' + step);
      }
    },

    // ─ Display Rules summary Edit button ───────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Rulesets/Layout/RulesetSummary.js:74 @verified 2026-09-27 @product optinmonster-app
    // Real app: the Summary's "Edit" button loads the Conditions step
    // (handleClickLoadConditionsHandler).
    {
      label: 'rules-summary-edit',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.ContentArea--rulesets button');
        return on([DR, DR + '--summary']) && !!b && text(b) === 'Edit';
      },
      apply: function () { hop(DR + '--conditions'); }
    },

    // ─ Display Rules rule-type selector ────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Rulesets/Layout/RulesetRuleSingle.js:66 @verified 2026-09-27 @product optinmonster-app
    // Real app: the FauxSelectInput `rule-type` opens the rule selector on
    // focus (toggleRuleSelector, RulesetRule.js:200-202); a click focuses it.
    // Captured for the first rule (`--rule-selector`). A second click on the
    // same control closes it again (the same toggle).
    {
      label: 'rules-rule-type-open',
      event: 'click',
      match: function (el) {
        return on([DR + '--conditions', DR + '--rule-selector']) && !!closestTo(el, '.Select__control')
          && !!closestTo(el, '.Select__control').querySelector('input[name="rule-type"]');
      },
      apply: function (el) {
        var control = closestTo(el, '.Select__control');
        var first = all('input[name="rule-type"]')[0];
        if (!first || !control.contains(first)) { R.miss('#rule-type', 'only the first rule\'s selector is captured'); return; }
        hop(slug() === DR + '--rule-selector' ? DR + '--conditions' : DR + '--rule-selector');
      }
    },

    // ─ Display Rules rule selector closes ──────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Rulesets/Layout/RuleSelector.js:254 @verified 2026-09-27 @product optinmonster-app
    // Real app: Escape closes the selector (closeRuleSelectorEscape, bound on
    // body at :144), unless focus is in the search box, where it clears the
    // search first (:256-257).
    {
      label: 'rules-rule-selector-escape',
      event: 'keydown',
      match: function (el, e) {
        return !!e && e.key === 'Escape' && slug() === DR + '--rule-selector' && !closestTo(el, 'input[name="rulesSearch"]');
      },
      apply: function () { hop(DR + '--conditions'); }
    },

    // ─ Publish platform tiles ──────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-builder/src/Publish/Components/Platform/PlatformOption.js:93 @verified 2026-09-27 @product optinmonster-app
    // Real app: the tile's onClick → setSelectedPlatform(platform); the tile's
    // icon box gets `selected` (:82) and PlatformContent renders that
    // platform's instructions. The tiles have no stable class: each is the
    // button whose label is one of PlatformOptions.js:24-60. Captured on the
    // published campaign: Any Site (`--published`) and WordPress
    // (`--platform-wordpress`). The draft campaign (base) has only Any Site.
    {
      label: 'publish-platform-tile',
      event: 'click',
      match: function (el) {
        if (!/^app-builder-publish/.test(slug())) return false;
        var b = closestTo(el, 'button');
        var label = b && b.lastElementChild ? text(b.lastElementChild) : '';
        return !!b && !!b.querySelector('svg') && ['Any Site', 'WordPress', 'Shopify', 'WooCommerce', 'Share Link', 'Click to Load'].indexOf(label) !== -1
          && b.children.length === 2;
      },
      apply: function (el) {
        var b = closestTo(el, 'button');
        if (b.firstElementChild && b.firstElementChild.classList.contains('selected')) return;
        var label = text(b.lastElementChild);
        var published = ['app-builder-publish--published', 'app-builder-publish--platform-wordpress'];
        var target = on(published) ? { 'Any Site': published[0], WordPress: published[1] }[label]
          : { 'Any Site': 'app-builder-publish', WordPress: 'app-builder-publish--draft-platform-wordpress' }[label] || null;   // QC round 2: the draft's WordPress tile
        if (target) hop(target);
        else R.miss('#platform-' + label, 'the ' + label + ' instructions are not captured for this campaign');
      },
      state: function (el) { var b = closestTo(el, 'button'); return { key: 'publish.platform', value: b ? text(b.lastElementChild) : null }; }
    },

    // ═══ Campaigns page ════════════════════════════════════════════════════

    // ─ Create New Campaign button ──────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/components/core/CreateCampaignButton.vue:58 @verified 2026-09-27 @product optinmonster-app
    // Real app: the link's click is prevented and $modal.show('create-new-campaign')
    // opens the Create New modal (:58-61). Captured on /campaigns/ as
    // `--modal-create-new`.
    {
      label: 'campaigns-create-new-open',
      event: 'click',
      match: function (el) { return baseOf(slug()) === CP && !!closestTo(el, '.create-new-button'); },
      apply: function () {
        if (slug() === CP || slug() === CP + '--bulk' || slug() === CP + '--search') hop(CP + '--modal-create-new');
        else R.miss('#create-new-campaign', 'the Create New modal is captured over the plain campaigns list');
      }
    },

    // ─ Create New modal: Canvas option and Back ────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/components/common/modals/CreateNew.vue:38 @verified 2026-09-27 @product optinmonster-app
    // Real app: the Canvas card sets selectingCanvasTemplate (setCanvasMode,
    // :268-270) and the type grid replaces the three cards; Back (:84) undoes
    // it. Captured: `--modal-create-new-canvas`. Playbooks and Templates are
    // plain links (core nav).
    {
      label: 'campaigns-create-new-canvas',
      event: 'click',
      match: function (el) {
        var a = closestTo(el, '.omapi-create-new-modal .omapi-modal__option, .omapi-create-new-modal .back-button');
        return !!a && (a.classList.contains('back-button') || a.getAttribute('href') === '#');
      },
      apply: function (el) {
        var back = !!closestTo(el, '.back-button');
        hop(back ? CP + '--modal-create-new' : CP + '--modal-create-new-canvas');
      }
    },

    // ─ Campaigns page modal close ──────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/modal/Header.vue:6 @verified 2026-09-27 @product optinmonster-app
    // Real app: every campaigns-page modal is vue-js-modal through core-modal
    // (packages/npm/om-js-lib/src/vue/campaigns/components/core/Modal.vue:7,
    // clickToClose default true): the header × emits close (Header.vue:6), a
    // click on the backdrop closes, and each modal's Cancel / Close button
    // hides it (Embed.vue:26). The page returns to the screen the modal
    // opened over. Confirm buttons are never wired.
    {
      label: 'campaigns-modal-close',
      event: 'click',
      match: function (el) {
        if (!/^app-campaigns--modal-/.test(slug())) return false;
        if (closestTo(el, '.v--modal-overlay .header .close button')) return true;
        if (el.classList && el.classList.contains('v--modal-background-click')) return true;
        var b = closestTo(el, '.v--modal-overlay .buttons button');
        return !!b && /^(Cancel|Close)$/.test(text(b));
      },
      apply: function () { hop(baseOf(slug())); }
    },

    // ─ Campaign detail toolbar modals ──────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/Campaign.vue:47 @verified 2026-09-27 @product optinmonster-app
    // Real app: each toolbar button opens `<cid>-<kind>-modal` with
    // $modal.show — Embed (:47), Split (:64), Duplicate (:76), Add to Site
    // (:95), Add to Folder (:114), Archive (:129), Trash (:148). The buttons
    // have no own class; each carries its tooltip text in the popper beside it
    // (core-tooltip). Captured for the active campaign on /campaigns/: Embed,
    // Duplicate, Add to Folder.
    {
      label: 'campaigns-toolbar-modal',
      event: 'click',
      match: function (el) { return baseOf(slug()) === CP && !!closestTo(el, '.toolbar button.toolbar-item'); },
      apply: function (el) {
        var b = closestTo(el, '.toolbar button.toolbar-item');
        var tip = b.parentElement ? text(b.parentElement.querySelector('.popper')) : '';
        var kind = { 'Get Embed Code': 'embed', 'Create Duplicate': 'duplicate', 'Add to Folder': 'folder' }[tip];
        if (!kind) { R.miss('#' + tip, 'the "' + tip + '" modal is not captured'); return; }
        // QC round 2: the second row's Split and Embed modals are their own captures.
        var rows = all('.drawer-campaign');
        var active = rows.findIndex(function (r) { return r.classList.contains('active') || !!r.querySelector('input[type="checkbox"]:checked'); });
        var row2 = active === 1 && (kind === 'embed' || kind === 'duplicate' ? kind === 'embed' : false);
        hop(CP + '--modal-' + kind + (row2 ? '-row2' : ''));
      },
      state: function (el) {
        var b = closestTo(el, '.toolbar button.toolbar-item');
        return { key: 'campaigns.toolbar', value: b && b.parentElement ? text(b.parentElement.querySelector('.popper')) : null };
      }
    },

    // ─ Sidebar Add new site / Create new folder ────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/components/core/SidebarItems.vue:33 @verified 2026-09-27 @product optinmonster-app
    // Real app: $modal.show('create-' + type + '-modal') for the section's
    // type (site / folder), the link text is its createItemName. Captured:
    // `--modal-add-site`, `--modal-add-folder`.
    {
      label: 'campaigns-sidebar-create',
      event: 'click',
      match: function (el) { return baseOf(slug()) === CP && !!closestTo(el, '.sidebar-create-item a'); },
      apply: function (el) {
        var t = text(closestTo(el, 'a'));
        var kind = /site/i.test(t) ? 'site' : /folder/i.test(t) ? 'folder' : null;
        if (kind) hop(CP + '--modal-add-' + kind);   // QC round 2 (Windows): from any campaigns-page state
        else R.miss('#create-item', 'not captured');
      }
    },

    // ─ Advanced Filters button ─────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/Drawer.vue:197 @verified 2026-09-27 @product optinmonster-app
    // Real app: toggleFilterPanel flips filters.panelOpen; the panel
    // (AdvancedFilters.vue, v-if="panelOpen") mounts under the toolbar.
    // Captured: `--filters-panel`. The panel opened over active filters is not.
    {
      label: 'campaigns-filters-toggle',
      event: 'click',
      match: function (el) { return baseOf(slug()) === CP && !!closestTo(el, '.toolbar-btn.-advanced-filters'); },
      apply: function () {
        if (slug() === CP + '--filters-panel') hop(CP);
        else hop(CP + '--filters-panel');   // QC round 2 (Windows): from any campaigns-page state
      }
    },

    // ─ Advanced Filters Cancel ─────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/AdvancedFilters.vue:252 @verified 2026-09-27 @product optinmonster-app
    // Real app: cancel() (:718) drops the draft and closes the panel.
    {
      label: 'campaigns-filters-cancel',
      event: 'click',
      match: function (el) { return slug() === CP + '--filters-panel' && !!closestTo(el, '.filter-actions__cancel'); },
      apply: function () { hop(CP); }
    },

    // ─ Advanced Filters campaign-type checkboxes ───────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/AdvancedFilters.vue:584 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: every box's click is prevented and the draft
    // changes — "All Types" empties draft.campaignTypes (toggleAllTypes,
    // :584-586), a type box adds or removes its type (toggleType, :587-591).
    // A label is `is-checked` and its box checked when its type is in the
    // draft; "All Types" when the draft is empty (:15-33). Apply is enabled
    // while the draft differs from the applied filters (:246, isDirty); on
    // this capture the applied filters are "All Types". The label click
    // reaches the box as its own click, so only the box is matched.
    {
      label: 'campaigns-filter-type',
      event: 'click',
      match: function (el) { return slug() === CP + '--filters-panel' && !!closestTo(el, '.advanced-filters .filter-checkboxes .filter-checkbox input'); },
      apply: function (el) {
        var labels = all('.advanced-filters .filter-checkboxes .filter-checkbox');
        var clicked = closestTo(el, '.filter-checkbox');
        var allTypes = labels[0];
        var picked = labels.slice(1).filter(function (l) { return l.classList.contains('is-checked'); });
        if (clicked === allTypes) picked = [];
        else if (picked.indexOf(clicked) === -1) picked.push(clicked);
        else picked.splice(picked.indexOf(clicked), 1);
        // The browser toggled the clicked box before this ran; live, the
        // @click.prevent reverts that toggle after Vue has patched every box
        // to the draft, so the clicked box keeps its pre-click state and the
        // rest follow the draft (seen on the live app, parity 2026-09-27).
        var before = !el.checked;
        labels.forEach(function (l) {
          var checked = l === allTypes ? picked.length === 0 : picked.indexOf(l) !== -1;
          l.classList.toggle('is-checked', checked);
          var box = l.querySelector('input');
          if (box) box.checked = box === el ? before : checked;
        });
        var apply = document.querySelector('.filter-actions__apply');
        if (apply) apply.disabled = picked.length === 0;
      },
      state: function () {
        return { key: 'campaigns.filterTypes', value: all('.advanced-filters .filter-checkbox.is-checked').map(text).join(',') };
      }
    },

    // ─ Advanced Filters Apply ──────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/AdvancedFilters.vue:698 @verified 2026-09-27 @product optinmonster-app
    // Real app: apply() → applyFilters → PUT /v2/campaign-dashboard/settings,
    // then GET the filtered list (store/actions.js:1197-1227). The result is
    // captured for one draft: Popup only (`--filters-active`,
    // p1-dashboard-campaigns.json). Any other draft is a miss. No parity case:
    // the live click writes.
    {
      label: 'campaigns-filters-apply',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, '.filter-actions__apply');
        return slug() === CP + '--filters-panel' && !!b && !b.disabled;
      },
      apply: function () {
        var picked = all('.advanced-filters .filter-checkboxes .filter-checkbox.is-checked').map(text);
        if (picked.length === 1 && picked[0] === 'Popup') hop(CP + '--filters-active');
        else R.miss('#apply-filters', 'no captured result for the types ' + picked.join(', '));
      }
    },

    // ─ Campaign row checkbox (bulk edit) ───────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/DrawerCampaign.vue:191 @verified 2026-09-27 @product optinmonster-app
    // Real app: changeCheckbox adds the campaign to (or removes it from) the
    // bulk list (:191-197); with one or more selected the Bulk Edit bar
    // replaces the toolbar (BulkActions.vue). Captured with the first row
    // selected (`--bulk`); unticking it there returns to the list.
    {
      label: 'campaigns-bulk-select',
      event: 'change',
      match: function (el) { return on([CP, CP + '--bulk']) && !!closestTo(el, '.drawer-campaign .campaign-select-wrapper') && el.type === 'checkbox'; },
      apply: function (el) {
        var row = closestTo(el, '.drawer-campaign');
        var first = all('.drawer-campaign')[0];
        if (row !== first) { R.miss('#' + el.id, 'only the first row\'s bulk selection is captured'); return; }
        hop(el.checked ? CP + '--bulk' : CP);
      },
      state: function (el) { return { key: 'campaigns.bulk', value: el.checked ? el.value : null }; }
    },

    // ─ Campaign search ─────────────────────────────────────────────────────
    // @since 2026-09-27 @source campaign-dashboard/src/campaigns/components/core/Drawer.vue:109 @verified 2026-09-27 @product optinmonster-app
    // Real app: the term is debounced 800 ms (:109-111), then
    // sendSearchTerm GETs the filtered list (:146-163). The result is
    // captured for the term "Pantry" (`--search`, the term the capture typed,
    // p1-dashboard-campaigns.json). Other terms are a miss.
    {
      label: 'campaigns-search',
      event: 'input',
      match: function (el) { return slug() === CP && !!closestTo(el, '.toolbar .search input'); },
      apply: function (el) {
        var term = (el.value || '').trim();
        if (term.length < 3) return;
        R.wait(800, function () {
          if ((el.value || '').trim() !== term) return;
          if (term.toLowerCase() === 'pantry') hop(CP + '--search');
          else R.miss('#search-' + term, 'no captured result for "' + term + '"');
        });
      }
    },

    // ═══ Template library (/campaigns/new/) ════════════════════════════════

    // ─ Template library campaign type ──────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:319 @verified 2026-09-27 @product optinmonster-app
    // Real app: onSelectType sets the type, resets the favorites filter and
    // re-renders the grid from the prefetched templates (:319-345). Captured
    // for every type: Popup is the base, the rest `--type-<type>` (the
    // `campaign-types__type--<type>` class). Filters other than favorites
    // carry over live, so a type change from a filtered grid is a miss.
    {
      label: 'new-campaign-type',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.campaign-types__type'); },
      apply: function (el) {
        var t = closestTo(el, '.campaign-types__type');
        if (t.classList.contains('campaign-types__type--selected')) return;
        var m = t.className.match(/campaign-types__type--(?!selected)(\w+)/);
        var type = m ? m[1] : '';
        if (slug() !== NC && !/--type-|--favorites$/.test(slug())) {
          R.miss('#type-' + type, 'the ' + type + ' grid under the filters of ' + slug() + ' is not captured');
          return;
        }
        hop(type === 'popup' ? NC : NC + '--type-' + type);
      },
      state: function (el) { return { key: 'templates.type', value: closestTo(el, '.campaign-types__type').getAttribute('data-campaign-prettytype') }; }
    },

    // ─ Template library filter checkboxes ──────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:847 @verified 2026-09-27 @product optinmonster-app
    // Real app: onFilterTemplates toggles the item's `active` class and
    // re-renders the grid (:847-935); a required filter (device) cannot be
    // unset. The grid cards carry no filter data, so the result is a capture:
    // Goals › Grow My Email List (`--filter-goals`) and Device › Mobile
    // (`--device-mobile`; the device menu opens on CSS :hover / :focus-within).
    {
      label: 'new-campaign-filter',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.filter-item'); },
      apply: function (el) {
        var f = closestTo(el, '.filter-item');
        var key = f.getAttribute('data-filter-slug') + ':' + f.getAttribute('data-filter-item-id');
        var active = f.classList.contains('active');
        if (active && closestTo(f, '.required-filter')) return;
        var route = {};
        route[NC + '|goals:1'] = NC + '--filter-goals';
        route[NC + '--filter-goals|goals:1'] = NC;
        route[NC + '|device:mobile'] = NC + '--device-mobile';
        route[NC + '--device-mobile|device:desktop'] = NC;
        var target = route[slug() + '|' + key];
        // QC round 2 (Windows): a filter with no grid of its own lands on the
        // nearest captured grid (device → mobile / all, goals → goals grid,
        // anything else → the full grid).
        if (!target) {
          var slugKey = f.getAttribute('data-filter-slug'), item = f.getAttribute('data-filter-item-id');
          target = slugKey === 'device' ? (item === 'mobile' ? NC + '--device-mobile' : NC)
            : slugKey === 'goals' ? NC + '--filter-goals' : NC;
        }
        hop(target);
      },
      state: function (el) { var f = closestTo(el, '.filter-item'); return { key: 'templates.filter', value: f.getAttribute('data-filter-slug') + ':' + f.getAttribute('data-filter-item-id') }; }
    },

    // ─ Template library My Favorites ───────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:1665 @verified 2026-09-27 @product optinmonster-app
    // Real app: onToggleFavoritesFilter flips the filter, `active` +
    // aria-pressed on the button, the heart icon, and re-renders the grid
    // (:1665-1677). Captured for Popup (`--favorites`). The heart on a card
    // (`.om-favorite-toggle`) writes and is never wired.
    {
      label: 'new-campaign-favorites',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.filter-favorites'); },
      apply: function () {
        if (slug() === NC + '--favorites') hop(NC);
        else hop(NC + '--favorites');   // QC round 2 (Windows): the Popup favorites grid, from any template-library state
      }
    },

    // ─ Template library search ─────────────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:163 @verified 2026-09-27 @product optinmonster-app
    // Real app: keyup / search, debounced 400 ms, runs the Fuse search and
    // re-renders the grid (:163-168, :684-697). Captured for "coupon"
    // (`--search`, p1-new-campaign.json).
    {
      label: 'new-campaign-search',
      event: 'keyup',
      match: function (el) { return slug() === NC && !!closestTo(el, '.campaign-filters-search input'); },
      apply: function (el) {
        var term = (el.value || '').trim();
        R.wait(400, function () {
          if ((el.value || '').trim() !== term || term.length < 2) return;
          if (term.toLowerCase() === 'coupon') hop(NC + '--search');
          else R.miss('#template-search-' + term, 'no captured result for "' + term + '"');
        });
      }
    },

    // ─ Template library Use Template ───────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:521 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: onSelectTemplate (:521-535) removes the icon's old
    // <img>, appends a clone of the card's own image, then afterSelectTemplate
    // (:540-551) writes the type into `.campaign-name__type`, adds
    // `new-campaign__step-three--visible` and focuses #campaign-name after
    // 300 ms. The step-three markup is in every template-library capture.
    {
      label: 'new-campaign-use-template',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.select-template'); },
      apply: function (el) {
        var btn = closestTo(el, '.select-template');
        all('.campaign-name__template-icon img').forEach(function (i) { i.parentNode.removeChild(i); });
        var card = closestTo(btn, '.campaign-template__image');
        var img = card ? card.querySelector(':scope > img') : null;
        var icon = document.querySelector('.campaign-name__template-icon');
        if (img && icon) icon.appendChild(img.cloneNode(true));
        all('.campaign-name__type').forEach(function (s) { s.textContent = btn.getAttribute('data-template-type') || ''; });
        var step = document.querySelector('.new-campaign__step-three');
        if (!step) return;
        R.clearBaked(step);
        step.classList.add('new-campaign__step-three--visible');
        R.wait(300, function () {
          var name = document.getElementById('campaign-name');
          if (name) { try { name.focus(); name.select(); } catch (_) { /* detached */ } }
        });
      },
      state: function (el) { return { key: 'templates.selected', value: closestTo(el, '.select-template').getAttribute('data-template') }; }
    },

    // ─ Template library name step close ────────────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:559 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: onCloseStepThree removes
    // `new-campaign__step-three--visible` and empties #campaign-name
    // (:559-580).
    {
      label: 'new-campaign-name-close',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.new-campaign__step-three .close'); },
      apply: function () { closeStepThree(); }
    },

    // ─ Template library name step closes on Escape ─────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:1484 @verified 2026-09-27 @product optinmonster-app
    // Real app: maybeCloseModals on document keyup: Escape runs
    // onCloseStepThree (:1484-1488).
    {
      label: 'new-campaign-name-escape',
      event: 'keyup',
      match: function (el, e) { return !!e && e.key === 'Escape' && baseOf(slug()) === NC && !!document.querySelector('.new-campaign__step-three--visible'); },
      apply: function () { closeStepThree(); }
    },

    // ─ Template library filter group collapse ──────────────────────────────
    // @since 2026-09-27 @source themes/omappv4/assets/js/view/campaign/CampaignNew.js:938 @verified 2026-09-27 @product optinmonster-app
    // Real app, in place: toggleFilterExpanded slideToggle()s the group's
    // `.filter-content` (jQuery's default 400 ms) and toggles `collapsed` on
    // the title (:938-947).
    {
      label: 'new-campaign-filter-group',
      event: 'click',
      match: function (el) { return baseOf(slug()) === NC && !!closestTo(el, '.category-filters-title'); },
      apply: function (el) {
        var title = closestTo(el, '.category-filters-title');
        var group = title.parentElement && title.parentElement.classList.contains('category-filters-list') ? title.parentElement : null;
        if (!group) return;
        R.slideToggle(all('.filter-content', group));
        title.classList.toggle('collapsed');
      }
    },

    // ═══ Dashboard (/account/dashboard/) ═══════════════════════════════════

    // ─ Dashboard analytics tabs ────────────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/UI/TabbedContent.vue:7 @verified 2026-09-27 @product optinmonster-app
    // Real app: setActiveTab(slug); the first open of a tab fetches its v3
    // data (components/sections/Analytics.vue:106-139). Conversions opens
    // first (the base); `--tab-top-campaigns` and `--tab-top-pages` are
    // captured.
    {
      label: 'dashboard-tab',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, 'nav ul li.list-none > button');
        return baseOf(slug()) === DA && !!b && ['Conversions', 'Top Campaigns', 'Top Pages'].indexOf(text(b)) !== -1;
      },
      apply: function (el) {
        var t = text(closestTo(el, 'button'));
        var target = { Conversions: DA, 'Top Campaigns': DA + '--tab-top-campaigns', 'Top Pages': DA + '--tab-top-pages' }[t];
        if (slug() === DA + '--tab-conversions' && t === 'Conversions') return;
        if (!on([DA, DA + '--tab-conversions', DA + '--tab-top-campaigns', DA + '--tab-top-pages'])) {
          R.miss('#tab-' + t, 'tab change from ' + slug() + ' is not captured');
          return;
        }
        hop(target);
      },
      state: function (el) { return { key: 'dashboard.tab', value: text(closestTo(el, 'button')) }; }
    },

    // ─ Dashboard date range picker ─────────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/UI/DateRangePicker.vue:20 @verified 2026-09-27 @product optinmonster-app
    // Real app: a click on the range inputs opens @vuepic/vue-datepicker's
    // menu (8 presets, two months); a second click closes it. Captured open
    // as `--datepicker-open`. Picking a range refetches: not captured.
    {
      label: 'dashboard-datepicker-toggle',
      event: 'click',
      match: function (el) { return on([DA, DA + '--datepicker-open']) && !!closestTo(el, '.om-dashboard--datepicker .dp__input_wrap'); },
      apply: function () { hop(slug() === DA ? DA + '--datepicker-open' : DA); }
    },

    // ─ Dashboard date range picker closes ──────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/UI/DateRangePicker.vue:21 @verified 2026-09-27 @product optinmonster-app
    // Real app: vue-datepicker closes on Escape and on a click outside its
    // menu (@closed). Only a click on bare page counts here.
    {
      label: 'dashboard-datepicker-close',
      event: 'click',
      match: function (el) {
        return slug() === DA + '--datepicker-open' && !closestTo(el, '.dp__menu, .om-dashboard--datepicker') && !onControl(el);
      },
      apply: function () { hop(DA); }
    },
    {
      label: 'dashboard-datepicker-escape',
      event: 'keydown',
      match: function (el, e) { return !!e && e.key === 'Escape' && slug() === DA + '--datepicker-open'; },
      apply: function () { hop(DA); }
    },

    // ─ Dashboard Create New Campaign ───────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/UI/CreateCampaignButton.vue:2 @verified 2026-09-27 @product optinmonster-app
    // Real app: the button sets showCampaignNewModal; CampaignNewModal opens.
    // Captured as `--modal-create-new`. The button has no own class; its
    // label is the slot text at :2.
    {
      label: 'dashboard-create-new-open',
      event: 'click',
      match: function (el) {
        var b = closestTo(el, 'button');
        return baseOf(slug()) === DA && !!b && text(b) === 'Create New Campaign' && !closestTo(b, '.om-dash-modal-backdrop');
      },
      apply: function () {
        if (slug() === DA || slug() === DA + '--tab-conversions') hop(DA + '--modal-create-new');
        else R.miss('#create-new-campaign', 'the modal is captured over the Conversions tab');
      }
    },

    // ─ Dashboard Create New modal close ────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/modals/CampaignNewModal.vue:13 @verified 2026-09-27 @product optinmonster-app
    // Real app: the header × (:13) and a click on the backdrop
    // (components/base/BaseModal.vue:3, the content stops propagation at :4)
    // emit close-modal. The Canvas card's options are not captured on the
    // dashboard.
    {
      label: 'dashboard-modal-close',
      event: 'click',
      match: function (el) {
        if (slug() !== DA + '--modal-create-new') return false;
        if (closestTo(el, '.om-dash-modal-header button')) return true;
        return !!el.classList && el.classList.contains('om-dash-modal-backdrop');
      },
      apply: function () { hop(DA); }
    },

    // ═══ Campaign analytics (/campaigns/<id>/analytics/) ═══════════════════

    // ─ Campaign analytics section tabs ─────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/CampaignAnalytics/CampaignSection.vue:95 @verified 2026-09-27 @product optinmonster-app
    // Real app: setTab('conversions' | 'top-pages' | 'revenue') per campaign
    // section, then that tab's fetch (:328-349). Captured: Top Pages of the
    // first section (`--tab-top-pages`); Conversions is the base. The split
    // variant's section is not captured.
    {
      label: 'analytics-section-tab',
      event: 'click',
      match: function (el) { return on([CA, CA + '--tab-top-pages']) && !!closestTo(el, '[data-test^="tab-"]'); },
      apply: function (el) {
        var tab = closestTo(el, '[data-test^="tab-"]');
        var which = tab.getAttribute('data-test');
        var firstSection = all('[data-test="analytics-section"]')[0];
        if (!firstSection || !firstSection.contains(tab)) { R.miss('#' + which, 'only the first campaign section\'s tabs are captured'); return; }
        var target = { 'tab-conversions': CA, 'tab-top-pages': CA + '--tab-top-pages' }[which];
        if (target) hop(target);
        else R.miss('#' + which, 'the ' + which + ' tab is not captured');
      },
      state: function (el) { return { key: 'analytics.tab', value: closestTo(el, '[data-test]').getAttribute('data-test') }; }
    },

    // ─ Campaign analytics Export panel ─────────────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/CampaignAnalytics/SubBar.vue:55 @verified 2026-09-27 @product optinmonster-app
    // Real app: the button emits export; the page mounts ExportPanel, which
    // fetches its options and an estimate (pages/CampaignAnalytics.vue:209-230).
    // Captured as `--export`.
    {
      label: 'analytics-export-open',
      event: 'click',
      match: function (el) { return on([CA, CA + '--tab-top-pages']) && !!closestTo(el, '[data-test="analytics-export-btn"]'); },
      apply: function () {
        if (slug() === CA) hop(CA + '--export');
        else R.miss('#export', 'the export panel is captured over the Conversions tab');
      }
    },

    // ─ Campaign analytics Export panel close ───────────────────────────────
    // @since 2026-09-27 @source account-dashboard/src/components/CampaignAnalytics/ExportPanel.vue:8 @verified 2026-09-27 @product optinmonster-app
    // Real app: the backdrop (:8), the × (`export-panel-close`, :23-24) and
    // Cancel (`export-cancel`, :456-458) emit close. Export itself posts and
    // is never wired.
    {
      label: 'analytics-export-close',
      event: 'click',
      match: function (el) {
        if (slug() !== CA + '--export') return false;
        if (closestTo(el, '[data-test="export-panel-close"], [data-test="export-cancel"]')) return true;
        var root = closestTo(el, '.export-panel-root');
        return !!root && el.parentElement === root && el.classList.contains('absolute');
      },
      apply: function () { hop(CA); }
    }

  ], { product: 'optinmonster-app', file: 'interactivity.js' });

  function closeStepThree() {
    all('.new-campaign__step-three').forEach(function (s) { s.classList.remove('new-campaign__step-three--visible'); });
    var name = document.getElementById('campaign-name');
    if (name) name.value = '';
  }
}());
