/**
 * All in One SEO Pro snapshot transitions.
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
 *   // @since <date> @source all-in-one-seo-pack-pro/<path>:<line> @verified <date> @product aioseo
 *
 * `@source synthetic` is banned (anti-pattern #6 / INV-15). Plugin source:
 * all-in-one-seo-pack-pro 5.0.2 (the build on sullies-bakery). Behaviours:
 * products/aioseo/inventory/interactions.md. Parity cases: products/aioseo/
 * qc/parity.json.
 *
 * Phase 7, 2026-09-30. AIOSEO ships minified Vue 3 bundles only
 * (dist/Pro/assets/**). Every cite is `<bundle>:<line>` with the character
 * offset and the grepped string in the comment under it; no bundle was read
 * in full. The plugin renders with v-if almost everywhere, so a state change
 * either (a) takes captured nodes out and puts them back (the plugin's own
 * v-if, kept in memory with their place), (b) hands off to a captured
 * `--<state>` sibling, or (c) is a logged miss — never a drawn node the
 * capture did not hold (DESIGN amendment WO-202J). A control whose result
 * was not captured is reverted to its captured value, so the screen never
 * shows a state the plugin would not draw.
 *
 * Nothing here saves: every AIOSEO write goes over REST (Pinia store →
 * superagent), and a snapshot loads no plugin script. Buttons that save,
 * send or call out (interactions.md §H) log a miss that says so.
 */
(function () {
  'use strict';

  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }

  // ─── helpers ─────────────────────────────────────────────────────────────
  function closestTo(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; }
  }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  function text(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function slug() { return R.currentSlug(); }
  function baseOf(s) { return String(s || '').split('--')[0]; }
  function on(list) { return list.indexOf(slug()) !== -1; }

  // A logged miss, every time. Core logs a miss once per link key, and keys
  // collide for look-alike ids (two rows' Delete, two dropdowns), so a second
  // click would go silent; a film author or a QC probe must hear every one.
  function miss(href, note) {
    R.miss(href, note);
    try { console.info('[snap] no snapshot for ' + href + ' — ' + (note || 'not captured')); } catch (_) {}
  }

  // Slugs a state hop may land on: products/aioseo/snapshots/index.json when
  // this file was last written. A hop to a slug not listed is a logged miss,
  // never a 404 (hand-browsing) or a blank frame (in a film). Add a slug here
  // when its capture lands.
  var CAPTURED = [
    'admin-about-getting-started', 'admin-adminbar', 'admin-adminbar-seo--editor', 'admin-ai-insights-ai-content',
    'admin-ai-insights-keyword-reports', 'admin-ai-insights-mcp', 'admin-dashboard', 'admin-dashboard--site-score',
    'admin-dashboard-widgets', 'admin-edit-pages', 'admin-edit-posts', 'admin-edit-posts--inline-edit',
    'admin-edit-posts--quickedit', 'admin-edit-tags-category', 'admin-feature-manager', 'admin-global--help-panel',
    'admin-global--newsroom-drawer', 'admin-global--notifications-drawer', 'admin-link-assistant-domains-report',
    'admin-link-assistant-domains-report--host-seedsavers-org',
    'admin-link-assistant-domains-report--host-xerces-org', 'admin-link-assistant-domains-report--hostname',
    'admin-link-assistant-links-report', 'admin-link-assistant-links-report--expanded',
    'admin-link-assistant-links-report--linking-opportunities', 'admin-link-assistant-links-report--orphaned-posts',
    'admin-link-assistant-links-report--page-2', 'admin-link-assistant-links-report--post-bulb-planting-guide',
    'admin-link-assistant-links-report--post-raised-beds-vs-in-ground',
    'admin-link-assistant-links-report--post-watering-schedules',
    'admin-link-assistant-links-report--post-when-to-prune-hydrangeas', 'admin-link-assistant-links-report--search',
    'admin-link-assistant-overview', 'admin-link-assistant-overview--outbound', 'admin-link-assistant-post-report',
    'admin-link-assistant-settings', 'admin-local-seo-import', 'admin-local-seo-locations',
    'admin-local-seo-locations--multiple', 'admin-local-seo-locations--single', 'admin-local-seo-maps',
    'admin-local-seo-opening-hours', 'admin-locations-list', 'admin-profile-aioseo', 'admin-profile-aioseo--add-item',
    'admin-redirects', 'admin-redirects--add-advanced', 'admin-redirects--custom-rules',
    'admin-redirects--extra-source', 'admin-redirects--group-404', 'admin-redirects--group-manual',
    'admin-redirects--group-modified', 'admin-redirects--row-edit', 'admin-redirects--sort-enabled-asc',
    'admin-redirects--sort-enabled-desc', 'admin-redirects--sort-group-asc', 'admin-redirects--sort-group-desc',
    'admin-redirects--sort-hits-asc', 'admin-redirects--sort-hits-desc', 'admin-redirects--sort-source-url-asc',
    'admin-redirects--sort-source-url-desc', 'admin-redirects--sort-target-url-asc',
    'admin-redirects--sort-target-url-desc', 'admin-redirects--sort-type-asc', 'admin-redirects--sort-type-desc',
    'admin-redirects--view-disabled', 'admin-redirects--view-enabled', 'admin-redirects-full-site-redirect',
    'admin-redirects-full-site-redirect--add-alias', 'admin-redirects-http-headers',
    'admin-redirects-http-headers--add-header', 'admin-redirects-http-headers--cors-presets',
    'admin-redirects-http-headers--security-presets', 'admin-redirects-import-export', 'admin-redirects-logs',
    'admin-redirects-logs--404', 'admin-redirects-logs--404-add-redirect', 'admin-redirects-logs--404-info',
    'admin-redirects-logs--404-sort-hits-asc', 'admin-redirects-logs--404-sort-hits-desc',
    'admin-redirects-logs--404-sort-last-accessed-asc', 'admin-redirects-logs--404-sort-last-accessed-desc',
    'admin-redirects-logs--404-sort-url-asc', 'admin-redirects-logs--404-sort-url-desc', 'admin-redirects-logs--info',
    'admin-redirects-logs--sort-hits-asc', 'admin-redirects-logs--sort-hits-desc',
    'admin-redirects-logs--sort-last-accessed-asc', 'admin-redirects-logs--sort-last-accessed-desc',
    'admin-redirects-logs--sort-url-asc', 'admin-redirects-logs--sort-url-desc', 'admin-redirects-settings',
    'admin-redirects-settings--web-server', 'admin-search-appearance-advanced', 'admin-search-appearance-archives',
    'admin-search-appearance-author-seo', 'admin-search-appearance-author-seo--add-item',
    'admin-search-appearance-content-types', 'admin-search-appearance-content-types--location-advanced',
    'admin-search-appearance-content-types--location-custom-fields',
    'admin-search-appearance-content-types--location-schema', 'admin-search-appearance-content-types--page-advanced',
    'admin-search-appearance-content-types--page-custom-fields', 'admin-search-appearance-content-types--page-schema',
    'admin-search-appearance-content-types--post-advanced',
    'admin-search-appearance-content-types--post-advanced-robots',
    'admin-search-appearance-content-types--post-custom-fields', 'admin-search-appearance-content-types--post-schema',
    'admin-search-appearance-global-settings', 'admin-search-appearance-global-settings--media-modal',
    'admin-search-appearance-global-settings--more-separators', 'admin-search-appearance-media',
    'admin-search-appearance-taxonomies', 'admin-search-statistics-content-rankings',
    'admin-search-statistics-content-rankings--sample', 'admin-search-statistics-dashboard',
    'admin-search-statistics-dashboard--sample', 'admin-search-statistics-index-status',
    'admin-search-statistics-index-status--sample', 'admin-search-statistics-keyword-rank-tracker',
    'admin-search-statistics-keyword-rank-tracker--sample', 'admin-search-statistics-seo-statistics',
    'admin-search-statistics-seo-statistics--sample', 'admin-search-statistics-settings',
    'admin-seo-analysis-analyze-competitor-site', 'admin-seo-analysis-headline-analyzer',
    'admin-seo-analysis-seo-audit-checklist', 'admin-seo-analysis-seo-site-audit',
    'admin-seo-analysis-seo-site-audit--url-details', 'admin-seo-revisions', 'admin-settings-access-control',
    'admin-settings-access-control--editor-custom', 'admin-settings-advanced',
    'admin-settings-advanced--email-reports', 'admin-settings-advanced--email-reports-add-email',
    'admin-settings-advanced--post-type-columns', 'admin-settings-advanced--taxonomy-columns',
    'admin-settings-breadcrumbs', 'admin-settings-breadcrumbs--link-current-item',
    'admin-settings-breadcrumbs--more-separators', 'admin-settings-breadcrumbs--no-current-item',
    'admin-settings-breadcrumbs--no-homepage-link', 'admin-settings-breadcrumbs--posts-custom-template',
    'admin-settings-breadcrumbs--tpl-advanced', 'admin-settings-breadcrumbs--tpl-archives',
    'admin-settings-breadcrumbs--tpl-taxonomies', 'admin-settings-content-optimization',
    'admin-settings-content-optimization--truseo-post-types', 'admin-settings-content-optimization--wa-post-types',
    'admin-settings-general', 'admin-settings-rss-content', 'admin-settings-seo-checklist',
    'admin-settings-seo-checklist--completed', 'admin-settings-seo-checklist--explanation',
    'admin-settings-seo-checklist--explanation-2', 'admin-settings-seo-checklist--explanation-3',
    'admin-settings-seo-checklist--explanation-4', 'admin-settings-seo-checklist--explanation-5',
    'admin-settings-seo-checklist--explanation-6', 'admin-settings-seo-checklist--explanation-7',
    'admin-settings-seo-checklist--explanation-8', 'admin-settings-seo-checklist--explanation-9',
    'admin-settings-seo-checklist--sort-priority', 'admin-settings-seo-checklist--sort-priority-asc',
    'admin-settings-seo-checklist--sort-time', 'admin-settings-seo-checklist--sort-time-asc',
    'admin-settings-webmaster-tools', 'admin-settings-webmaster-tools--google',
    'admin-settings-webmaster-tools--indexnow', 'admin-sitemaps-general-sitemap',
    'admin-sitemaps-general-sitemap--additional-pages', 'admin-sitemaps-general-sitemap--page-edit',
    'admin-sitemaps-html-sitemap', 'admin-sitemaps-llms-sitemap', 'admin-sitemaps-news-sitemap',
    'admin-sitemaps-rss-sitemap', 'admin-sitemaps-video-sitemap', 'admin-social-networks-facebook',
    'admin-social-networks-pinterest', 'admin-social-networks-social-profiles', 'admin-social-networks-twitter',
    'admin-term-edit', 'admin-tools-database-tools', 'admin-tools-import-export', 'admin-tools-robots-editor',
    'admin-tools-robots-editor--add-rule', 'admin-tools-seo-alerts', 'admin-tools-seo-alerts--add-email',
    'admin-tools-snippets', 'admin-tools-system-status', 'editor-classic-post', 'editor-location',
    'editor-location-eastside-garden-center', 'editor-location-hillcrest-design-studio',
    'editor-page-about-rosas-garden-co', 'editor-page-garden-design-services', 'editor-page-site-map',
    'editor-page-visit-our-nurseries', 'editor-post', 'editor-post--score-green', 'editor-post--score-none',
    'editor-post--score-orange', 'editor-post-ai-generator-modal', 'editor-post-block-faq',
    'editor-post-document-panel', 'editor-post-headline-analyzer', 'editor-post-inserter-aioseo',
    'editor-post-link-format', 'editor-post-metabox-advanced', 'editor-post-metabox-aicontent',
    'editor-post-metabox-analysis', 'editor-post-metabox-general', 'editor-post-metabox-general-social',
    'editor-post-metabox-linkassistant', 'editor-post-metabox-redirects', 'editor-post-metabox-schema',
    'editor-post-metabox-schema--catalog', 'editor-post-metabox-seorevisions', 'editor-post-p-bulb-planting-guide',
    'editor-post-p-container-herbs-for-beginners', 'editor-post-p-free-composting-workshop',
    'editor-post-p-garden-tools-cold-weather', 'editor-post-p-holiday-hours',
    'editor-post-p-native-plants-for-pollinators', 'editor-post-p-planning-seed-orders',
    'editor-post-p-raised-beds-vs-in-ground', 'editor-post-p-second-nursery-east-side',
    'editor-post-p-shade-loving-perennials', 'editor-post-p-watering-schedules',
    'editor-post-p-when-to-prune-hydrangeas', 'editor-post-pane-advanced', 'editor-post-pane-aicopilot',
    'editor-post-pane-linkassistant', 'editor-post-pane-optimization', 'editor-post-pane-redirects',
    'editor-post-pane-schema', 'editor-post-pane-seorevisions', 'editor-post-prepublish', 'editor-post-primary-term',
    'editor-post-sidebar', 'editor-post-snippet-modal', 'frontend-adminbar-seo', 'frontend-author-bio',
    'frontend-breadcrumbs', 'frontend-bulb-planting-guide', 'frontend-composting-101',
    'frontend-container-herbs-for-beginners', 'frontend-free-composting-workshop', 'frontend-fruit-trees-small-yards',
    'frontend-garden-tools-cold-weather', 'frontend-holiday-hours', 'frontend-html-sitemap',
    'frontend-local-business', 'frontend-location-eastside-garden-center',
    'frontend-location-hillcrest-design-studio', 'frontend-location-riverside-nursery',
    'frontend-native-plants-for-pollinators', 'frontend-nursery-plant-care-faq',
    'frontend-page-garden-design-services', 'frontend-raised-beds-vs-in-ground', 'frontend-second-nursery-east-side',
    'frontend-seo-preview', 'frontend-shade-loving-perennials', 'frontend-sitemap-index', 'frontend-sitemap-page',
    'frontend-sitemap-post', 'frontend-watering-schedules', 'frontend-when-to-prune-hydrangeas',
    'wizard-additional-information', 'wizard-category', 'wizard-features', 'wizard-import',
    'wizard-search-appearance', 'wizard-search-console', 'wizard-success', 'wizard-welcome'
  ];
  function captured(s) { return CAPTURED.indexOf(s) !== -1; }

  // A state the plugin shows after this control: the captured sibling, or a
  // logged miss that names the state.
  function hop(target, note) {
    if (target && captured(target)) {
      if (target !== slug()) R.goto(target);
      return true;
    }
    miss('state:' + (target || slug()), note || 'state not captured');
    return false;
  }

  // A route the plugin pushes (hash history) or a page it loads: the nav map's
  // captured screen, or a logged miss that names the URL.
  function hopUrl(url, note) {
    var hit = R.resolve(url);
    if (hit) {
      if (hit.slug !== slug()) R.goto(hit.slug, hit.params && hit.params.length ? { params: hit.params } : null);
      return true;
    }
    miss(url, note || 'screen not captured yet');
    return false;
  }

  // The WP admin page this snapshot is (admin.php?page=<id>), read from the
  // current menu item, so a state variant the nav map does not list still knows it.
  function pageId() {
    var a = one('#adminmenu a.current') || one('#adminmenu li.current > a');
    var m = /[?&]page=([^&#]+)/.exec(a ? a.getAttribute('href') || '' : '');
    return m ? m[1] : null;
  }

  // The plugin's v-if, both ways: take captured nodes out (a comment keeps
  // each one's place) and put them back. Keyed, so a second take-out is a no-op.
  var STASH = {};
  function takeOut(key, nodes) {
    if (STASH[key]) return;
    var kept = [];
    (nodes || []).forEach(function (n) {
      if (!n || !n.parentNode) return;
      var mark = document.createComment('snap:' + key);
      n.parentNode.insertBefore(mark, n);
      n.parentNode.removeChild(n);
      kept.push({ node: n, mark: mark });
    });
    STASH[key] = kept;
  }
  function putBack(key) {
    var kept = STASH[key];
    if (!kept) return;
    kept.forEach(function (k) {
      if (!k.mark.parentNode) return;
      k.mark.parentNode.insertBefore(k.node, k.mark);
      k.mark.parentNode.removeChild(k.mark);
    });
    delete STASH[key];
  }
  function vif(key, nodes, shown) { if (shown) putBack(key); else takeOut(key, nodes); }

  // The settings rows of a card that follow `row`, in order.
  function rowsAfter(row) {
    var out = [];
    for (var n = row && row.nextElementSibling; n; n = n.nextElementSibling) out.push(n);
    return out;
  }
  // The settings row whose name reads `name`, inside root.
  function rowNamed(name, root) {
    var hit = null;
    all('.aioseo-settings-row', root).some(function (r) {
      var n = one(':scope > .aioseo-col .settings-name .name', r) || one('.settings-name .name', r);
      if (n && text(n).indexOf(name) === 0) { hit = r; return true; }
      return false;
    });
    return hit;
  }
  function cardOf(el) { return closestTo(el, '.aioseo-card'); }
  function cardTitled(title) {
    var hit = null;
    all('.aioseo-card').some(function (c) {
      var t = one(':scope > .header .header-title', c);
      if (t && text(t).indexOf(title) === 0) { hit = c; return true; }
      return false;
    });
    return hit;
  }

  // ─── the card slide ──────────────────────────────────────────────────────
  // Card.c303b391.js renders every card body inside TransitionSlide
  // (Slide.ece0f7c8.js), duration 500 ms: opening sets height 0 → scrollHeight
  // with transition-property all, then clears the style; closing runs
  // scrollHeight → 0, then leaves { height: 0, overflow: hidden } and drops the
  // slot (hidden = true removes it). aria-expanded / aria-hidden follow `active`.
  var SLIDE_MS = 500;
  function slide(box, open, ms) {
    var dur = ms > 0 ? ms : SLIDE_MS;
    if (!box) return false;
    var seq = (box._snapSeq = (box._snapSeq || 0) + 1);
    var off = R.motion === 'off';
    var s = box.style;
    if (open) {
      if (!box.children.length && !box._snapKids) return false;       // body never captured
      if (box._snapKids) { box.appendChild(box._snapKids); box._snapKids = null; }
      box.removeAttribute('aria-hidden');
      box.setAttribute('aria-expanded', 'true');
      if (off) { s.height = ''; s.overflow = ''; s.transitionProperty = ''; s.transitionDuration = ''; return true; }
      s.transitionProperty = ''; s.transitionDuration = '';
      s.height = '0px'; s.overflow = 'hidden';
      void box.offsetHeight;
      s.transitionProperty = 'all'; s.transitionDuration = dur + 'ms';
      s.height = box.scrollHeight + 'px';
      R.wait(dur, function () {
        if (box._snapSeq !== seq) return;
        s.height = ''; s.overflow = ''; s.transitionProperty = ''; s.transitionDuration = '';
      });
      return true;
    }
    box.setAttribute('aria-hidden', 'true');
    box.removeAttribute('aria-expanded');
    var finish = function () {
      if (box._snapSeq !== seq) return;
      s.transitionProperty = ''; s.transitionDuration = '';
      s.height = '0'; s.overflow = 'hidden';
      if (box.children.length) {
        var frag = document.createDocumentFragment();
        while (box.firstChild) frag.appendChild(box.firstChild);
        box._snapKids = frag;
      }
    };
    if (off) { finish(); return true; }
    s.height = box.scrollHeight + 'px'; s.overflow = 'hidden';
    void box.offsetHeight;
    s.transitionProperty = 'all'; s.transitionDuration = dur + 'ms';
    s.height = '0px';
    R.wait(dur, finish);
    return true;
  }
  function cardBody(card) {
    var h = card && one(':scope > .header', card);
    var b = h ? h.nextElementSibling : null;
    return b && (b.hasAttribute('aria-expanded') || b.hasAttribute('aria-hidden')) ? b : null;
  }
  function cardOpen(card) { var b = cardBody(card); return !!b && b.getAttribute('aria-expanded') === 'true'; }

  // ─── main tabs (route links) ─────────────────────────────────────────────
  // Label → route, per admin page, from each page bundle's router table
  // (dist/Pro/assets/<page>.<hash>.js, line 2, `{path:"/…",name:…,meta:{name:…}}`).
  var ROUTES = {
    'aioseo-settings': { 'License': '/general-settings', 'SEO Checklist': '/seo-checklist', 'Webmaster Tools': '/webmaster-tools',
      'Breadcrumbs': '/breadcrumbs', 'RSS Content': '/rss-content', 'Content Optimization': '/content-optimization',
      'Access Control': '/access-control', 'Advanced': '/advanced' },                                   // settings.11c9c2de.js:2 @3354-4423
    'aioseo-search-appearance': { 'Global Settings': '/global-settings', 'Content Types': '/content-types',
      'Taxonomies': '/taxonomies', 'Image SEO': '/media', 'Author SEO': '/author-seo', 'Archives': '/archives',
      'Advanced': '/advanced' },                                                                         // search-appearance.74040c12.js:2 @3538-4349
    'aioseo-social-networks': { 'Social Profiles': '/social-profiles', 'Facebook': '/facebook', 'X (Twitter)': '/twitter',
      'Pinterest': '/pinterest' },                                                                       // social-networks.4357e88c.js:2 @2423-2817
    'aioseo-sitemaps': { 'General Sitemap': '/general-sitemap', 'RSS Sitemap': '/rss-sitemap', 'Video Sitemap': '/video-sitemap',
      'News Sitemap': '/news-sitemap', 'HTML Sitemap': '/html-sitemap', 'LLMs.txt': '/llms-sitemap' }, // sitemaps.b43fcb86.js:2 @3291-3954
    'aioseo-redirects': { 'Redirects': '/redirects', 'Full Site Redirect': '/full-site-redirect', 'HTTP Headers': '/http-headers',
      'Logs': '/logs', 'Import / Export': '/import-export', 'Settings': '/settings' },                  // redirects.8de22666.js:2 @1227-1940
    'aioseo-local-seo': { 'Locations': '/locations', 'Opening Hours': '/opening-hours', 'Maps': '/maps', 'Import': '/import' }, // local-seo.05f88b4e.js:2 @2296-2656
    'aioseo-link-assistant': { 'Overview': '/overview', 'Links Report': '/links-report', 'Domains Report': '/domains-report',
      'Settings': '/settings' },                                                                         // link-assistant.95914eda.js:2 @1917-2540
    'aioseo-seo-analysis': { 'Homepage Audit': '/seo-audit-checklist', 'Site Audit': '/seo-site-audit',
      'Analyze Competitor Site': '/analyze-competitor-site', 'Headline Analyzer': '/headline-analyzer' }, // seo-analysis.e53ce5bc.js:2 @6513, @8091
    'aioseo-search-statistics': { 'Dashboard': '/dashboard', 'SEO Statistics': '/seo-statistics',
      'Keyword Rank Tracker': '/keyword-rank-tracker', 'Content Rankings': '/content-rankings', 'Index Status': '/index-status',
      'Settings': '/settings' },                                                                         // search-statistics.7d651461.js:2 @4223-5048
    'aioseo-tools': { 'Robots.txt Editor': '/robots-editor', '.htaccess Editor': '/htaccess-editor', 'Import/Export': '/import-export',
      'Database Tools': '/database-tools', 'SEO Alerts': '/seo-alerts', 'System Status': '/system-status',
      'Code Snippets': '/snippets' },                                                                    // tools.267b7ea5.js:2 @2805-3596
    'aioseo-ai-insights': { 'Keyword Reports': '/keyword-reports', 'Brand Tracker': '/brand-tracker', 'AI Content': '/ai-content',
      'MCP': '/mcp' },                                                                                   // ai-insights.58a30368.js:2 @1790-2286
    'aioseo-about': { 'About Us': '/about-us', 'Getting Started': '/getting-started', 'Lite vs. Pro': '/lite-vs-pro' } // about.823ad170.js:2 @1578-1825
  };
  function tabLabel(tab) { var l = one('.tab-label', tab); return text(l || tab); }
  // The tab each card-tab strip showed at capture, recorded before the first swap.
  var TAB0 = {};
  function recordTab0() {
    if (TAB0.done) return;
    cardStrips().forEach(function (st, s) { TAB0[s] = all('.var-tab', st).findIndex(function (t) { return t.classList.contains('var-tab--active'); }); });
    TAB0.done = true;
  }
  // Every card-tab strip in document order (the parking key s of tabs-<s>-<n>).
  function cardStrips() { return all('.aioseo-tabs').filter(function (t) { return !isMainStripEl(t); }); }
  function isMainStripEl(strip) {
    var box = strip && strip.parentElement;
    return !!box && box.classList.contains('aioseo-container') && !!box.parentElement && box.parentElement.classList.contains('aioseo-main');
  }
  // The page's own tab row is the one directly under .aioseo-main's container
  // (Main views render <core-main-tabs> first); every other strip is a card's.
  function isMainStrip(tab) {
    var strip = closestTo(tab, '.aioseo-tabs');
    var box = strip && strip.parentElement;
    return !!box && !strip.classList.contains('internal') && box.classList.contains('aioseo-container') && !!box.parentElement && box.parentElement.classList.contains('aioseo-main');
  }

  // ─ Main tab route change ─────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Tabs.f7dce75e.js:1 @verified 2026-09-30 @product aioseo
  // Tabs.f7dce75e.js:1 @2232 maybeChangeTab(s): with no `active` prop (the page
  // tab strip) `this.$router.push(tab.url)` — a hash route on the same admin
  // page. The route resolves through the nav map to its captured screen; the
  // active tab is inert (same route). A tab whose screen is not captured is a
  // logged miss. Card tabs (`internal`, with `active`) are the next entry.
  R.register([{
    label: 'main-tab-route',
    event: 'click',
    match: function (el) {
      var tab = closestTo(el, '.aioseo-tabs .var-tab');
      return !!tab && isMainStrip(tab);
    },
    apply: function (el) {
      var tab = closestTo(el, '.aioseo-tabs .var-tab');
      if (tab.classList.contains('var-tab--active')) return;
      var page = pageId();
      var path = page && ROUTES[page] ? ROUTES[page][tabLabel(tab)] : null;
      if (!path) { miss('tab:' + tabLabel(tab), 'no route for this tab on page ' + page); return; }
      // A route lands on a screen, never on a captured state of it (a detail
      // panel open, a modal): a nav key a state variant won is a miss here.
      var url = 'admin.php?page=' + page + '#' + path;
      var hit = R.resolve(url);
      if (hit && hit.slug.indexOf('--') !== -1) { miss(url, 'route screen not captured (only its state ' + hit.slug + ')'); return; }
      // Search Statistics keeps shouldShowSampleReports in its store across
      // routes (app-core.2e1fbbab.js "showSampleReports"): from a sample
      // screen the next route opens in sample mode too, where it has one (the
      // Settings route has no sample state and opens as it is).
      if (hit && /--sample$/.test(slug()) && captured(hit.slug + '--sample')) { hop(hit.slug + '--sample'); return; }
      hopUrl(url);
    },
    state: function (el) { return { key: 'route', value: tabLabel(closestTo(el, '.aioseo-tabs .var-tab')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Card tab switch ───────────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Tabs.f7dce75e.js:1 @verified 2026-09-30 @product aioseo
  // Tabs.f7dce75e.js:1 @2232: with `active` set the strip only emits
  // `changed`; the parent swaps the tab body with v-if, so only the captured
  // tab's body exists. A tab whose body is a captured sibling hands off to it;
  // any other tab is a logged miss. Tables below name the capture plan step
  // that took each sibling (products/aioseo/capture-plans/p2-*.json).
  var CARD_TABS = [
    // p2-search-appearance.json: `#aioseo-card-postSA .aioseo-tabs .var-tab:has-text(…)` on Content Types.
    // Each card keeps its own tab (ContentTypes.c4ede02c.js:1 "Schema Markup"), so a card's
    // tabs hand off only among the captures where every OTHER card still shows Title & Description.
    { from: ['admin-search-appearance-content-types', 'admin-search-appearance-content-types--post-schema',
      'admin-search-appearance-content-types--post-advanced', 'admin-search-appearance-content-types--post-custom-fields',
      'admin-search-appearance-content-types--post-advanced-robots'], scope: '#aioseo-card-postSA',
      tabs: { 'Title & Description': 'admin-search-appearance-content-types',
        'Schema Markup': 'admin-search-appearance-content-types--post-schema',
        'Custom Fields': 'admin-search-appearance-content-types--post-custom-fields',
        'Advanced': 'admin-search-appearance-content-types--post-advanced' } },
    { from: ['admin-search-appearance-content-types', 'admin-search-appearance-content-types--page-schema',
      'admin-search-appearance-content-types--page-custom-fields', 'admin-search-appearance-content-types--page-advanced'],
      scope: '#aioseo-card-pageSA',
      tabs: { 'Title & Description': 'admin-search-appearance-content-types',
        'Schema Markup': 'admin-search-appearance-content-types--page-schema',
        'Custom Fields': 'admin-search-appearance-content-types--page-custom-fields',
        'Advanced': 'admin-search-appearance-content-types--page-advanced' } },
    { from: ['admin-search-appearance-content-types', 'admin-search-appearance-content-types--location-schema',
      'admin-search-appearance-content-types--location-custom-fields', 'admin-search-appearance-content-types--location-advanced'],
      scope: '#aioseo-card-aioseo-locationSA',
      tabs: { 'Title & Description': 'admin-search-appearance-content-types',
        'Schema Markup': 'admin-search-appearance-content-types--location-schema',
        'Custom Fields': 'admin-search-appearance-content-types--location-custom-fields',
        'Advanced': 'admin-search-appearance-content-types--location-advanced' } },
    // Link Assistant › Overview › Linking Opportunities card: Overview.1b2dc525.js:1
    // @7044 activeTab inbound / outbound (the rows come from linkingOpportunities[activeTab]).
    { from: ['admin-link-assistant-overview', 'admin-link-assistant-overview--outbound'], scope: '.aioseo-card',
      tabs: { 'Inbound Suggestions': 'admin-link-assistant-overview', 'Outbound Suggestions': 'admin-link-assistant-overview--outbound' } },
    // Settings › Breadcrumbs › Breadcrumb Templates: Breadcrumbs.b8e65f03.js:1 @43069
    // renders only the active tab's component (`component :is="tab"`).
    { from: ['admin-settings-breadcrumbs', 'admin-settings-breadcrumbs--tpl-taxonomies', 'admin-settings-breadcrumbs--tpl-archives',
      'admin-settings-breadcrumbs--tpl-advanced'], scope: '.aioseo-card',
      tabs: { 'Content Types': 'admin-settings-breadcrumbs', 'Taxonomies': 'admin-settings-breadcrumbs--tpl-taxonomies',
        'Archives': 'admin-settings-breadcrumbs--tpl-archives', 'Advanced': 'admin-settings-breadcrumbs--tpl-advanced' } },
    // p1-seo-analysis.json / p2-seo-analysis.json: All Checks is `?tab=error`, All URLs the bare route.
    { from: ['admin-seo-analysis-seo-site-audit--url-details'], scope: '.aioseo-seo-site-audit, .aioseo-app',
      tabs: { 'All Checks': 'admin-seo-analysis-seo-site-audit' } },
    // The snippet modal's Search / Social tabs (App.16d3e000.js:4, the post settings modal).
    { from: ['editor-post-snippet-modal'], scope: '.aioseo-post-settings-modal',
      tabs: { 'Social Appearance': 'editor-post-metabox-general-social' } },
    { from: ['editor-post-metabox-general-social'], scope: '.aioseo-post-settings-modal',
      tabs: { 'Search Appearance': 'editor-post-snippet-modal' } },
    // The block editor's bottom meta-box pane (#aioseo-settings): App.16d3e000.js:4
    // changeTabSettings swaps the pane body (v-if). Each tab was captured on the
    // same post as editor-post (2466); Appearance is editor-post itself. The
    // Facebook / X sub-tabs inside Appearance are another strip and stay misses.
    { from: ['editor-post', 'editor-post-pane-optimization', 'editor-post-pane-schema', 'editor-post-pane-aicopilot',
      'editor-post-pane-linkassistant', 'editor-post-pane-redirects', 'editor-post-pane-seorevisions', 'editor-post-pane-advanced'],
      scope: '#aioseo-settings',
      tabs: { 'Appearance': 'editor-post', 'Optimization': 'editor-post-pane-optimization', 'Schema': 'editor-post-pane-schema',
        'AI Copilot': 'editor-post-pane-aicopilot', 'Link Assistant': 'editor-post-pane-linkassistant',
        'Redirects': 'editor-post-pane-redirects', 'SEO Revisions': 'editor-post-pane-seorevisions',
        'Advanced': 'editor-post-pane-advanced' } },
    // p2-redirects.json: `.aioseo-redirects-all-logs .var-tab:has-text("404 Hits")`.
    { from: ['admin-redirects-logs', 'admin-redirects-logs--404'], scope: '.aioseo-redirects-all-logs',
      tabs: { 'Redirect Hits': 'admin-redirects-logs', '404 Hits': 'admin-redirects-logs--404' } }
  ];
  R.register([{
    label: 'card-tab-switch',
    event: 'click',
    match: function (el) {
      var tab = closestTo(el, '.aioseo-tabs .var-tab');
      return !!tab && !isMainStrip(tab);
    },
    apply: function (el) {
      var tab = closestTo(el, '.aioseo-tabs .var-tab');
      if (tab.classList.contains('var-tab--active')) return;
      var label = tabLabel(tab);
      // The capture parked every tab body of this strip (template
      // tabs-<s>-<n>, the strip's parent as the plugin rendered it with tab n
      // active): swap it in place, one live surface, like the plugin's v-if.
      var strip = closestTo(tab, '.aioseo-tabs');
      var s = cardStrips().indexOf(strip);
      var n = all('.var-tab', strip).indexOf(tab);
      var parked = s >= 0 ? one('template[data-snap-fragment="tabs-' + s + '-' + n + '"]') : null;
      var frag = document.createElement('div');
      if (parked) frag.innerHTML = parked.innerHTML;
      // A strip whose parent holds only the strip (the post settings modal's
      // header) parked no tab body: hand off to the captured sibling instead.
      var rest = frag.cloneNode(true);
      all('.aioseo-tabs', rest).forEach(function (t) { t.remove(); });
      if (parked && (rest.children.length || rest.textContent.trim())) {
        recordTab0();
        // data-snap-scope="settings-row-parent": the strip's own parent holds
        // only the strip, so the capture parked the settings row's parent.
        var row = parked.getAttribute('data-snap-scope') === 'settings-row-parent' ? closestTo(strip, '.aioseo-settings-row') : null;
        var host = row && row.parentElement ? row.parentElement : strip.parentElement;
        while (host.firstChild) host.removeChild(host.firstChild);
        while (frag.firstChild) host.appendChild(frag.firstChild);
        TAGS = null;
        return;
      }
      var hit = null;
      CARD_TABS.some(function (row) {
        if (!on(row.from) || !closestTo(tab, row.scope)) return false;
        for (var k in row.tabs) {
          if (Object.prototype.hasOwnProperty.call(row.tabs, k) && label.indexOf(k) === 0) { hit = row.tabs[k]; return true; }
        }
        return false;
      });
      if (hit) hop(hit, 'tab "' + label + '" not captured yet');
      else miss('tab:' + label, 'tab "' + label + '": its body is v-if and was not captured');
    },
    state: function (el) { return { key: 'tab', value: tabLabel(closestTo(el, '.aioseo-tabs .var-tab')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Card collapse ─────────────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Card.c303b391.js:1 @verified 2026-09-30 @product aioseo
  // Card.c303b391.js:1 @1076 toggleCard(): the header (class `toggles`) flips
  // settingsStore.toggledCards[slug] — the live plugin also saves it
  // (POST settings/toggle-card, H10), dropped here. The caret gets `rotated`
  // when closed; the body slides (Slide.ece0f7c8.js, 500 ms). The header title
  // stops the click (`onClick … ["stop"]` on .header-title), so the title text
  // does not toggle; neither do the controls a header carries. A body the
  // capture holds closed was never rendered: opening it is a logged miss.
  R.register([{
    label: 'card-collapse',
    event: 'click',
    match: function (el) {
      var h = closestTo(el, '.aioseo-card > .header.toggles');
      if (!h || closestTo(el, '.header-title')) return false;
      var ctl = closestTo(el, 'input, label, button, a, .multiselect, .aioseo-tooltip');
      return !(ctl && h.contains(ctl));
    },
    apply: function (el) {
      var h = closestTo(el, '.aioseo-card > .header.toggles');
      var card = h.parentNode;
      var box = cardBody(card);
      if (!box) return;
      var opening = box.getAttribute('aria-expanded') !== 'true';
      // A body the capture held closed was parked open (cardbody-<c>, c = the
      // card's index among every .aioseo-card).
      if (opening && !box.children.length && !box._snapKids) {
        var tp = one('template[data-snap-fragment="cardbody-' + all('.aioseo-card').indexOf(card) + '"]');
        if (tp) box.appendChild(tp.content.cloneNode(true));
      }
      if (!slide(box, opening)) { miss('card:' + text(one('.header-title', h)), 'card body was captured closed and not parked'); return; }
      var caret = one(':scope > svg.aioseo-caret', h);
      if (caret) caret.classList.toggle('rotated', !opening);
    },
    state: function (el) {
      var h = closestTo(el, '.aioseo-card > .header.toggles');
      return { key: 'card:' + text(one('.header-title', h)), value: cardOpen(h && h.parentNode) };
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Optimization section collapse ─────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Analysis.f8f9b955.js:1 @verified 2026-09-30 @product aioseo
  // Analysis.f8f9b955.js:1 @54167-57222: each `button.content-analysis-section__header`
  // calls I(key), flipping that section open / closed; the caret gets
  // `rotated` when closed and the body is a TransitionSlide with duration 300
  // (`content-analysis-section__body`). The help icon stops the click.
  R.register([{
    label: 'analysis-section-collapse',
    event: 'click',
    match: function (el) { return !!closestTo(el, 'button.content-analysis-section__header') && !closestTo(el, '.content-analysis-section__help'); },
    apply: function (el) {
      var h = closestTo(el, 'button.content-analysis-section__header');
      var box = h.nextElementSibling;
      if (!box || !box.classList.contains('content-analysis-section__body')) { miss('section:' + text(one('span', h)), 'section body not captured'); return; }
      var opening = box.getAttribute('aria-expanded') !== 'true';
      if (!slide(box, opening, 300)) { miss('section:' + text(one('span', h)), 'section body was captured closed'); return; }
      var caret = one('.content-analysis-section__caret', h);
      if (caret) caret.classList.toggle('rotated', !opening);
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Help Center panel ─────────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Index.ec9ba64a.js:1 @verified 2026-09-30 @product aioseo
  // Header.b70f0820.js:1 (Q) and Index.ec9ba64a.js:1 @4586 toggleModal():
  // `#aioseo-help-modal.classList.toggle("visible")` and
  // `body.classList.toggle("modal-open")` — pure DOM, and the panel with every
  // category is in the capture. toggleSection (@4336): the category header
  // toggles `opened` on `e.target.parentNode.parentNode`; toggleDocs: "View
  // all" toggles `opened` on its previous sibling and hides itself.
  function toggleHelp() {
    var m = document.getElementById('aioseo-help-modal');
    if (!m) return;
    m.classList.toggle('visible');
    document.body.classList.toggle('modal-open');
  }
  R.register([{
    label: 'help-center-toggle',
    event: 'click',
    match: function (el) {
      return !!closestTo(el, '.aioseo-header .header-actions span.round[title="Open Help Center"], #aioseo-help-close');
    },
    apply: function () { toggleHelp(); },
    state: function () { var m = document.getElementById('aioseo-help-modal'); return { key: 'help', value: !!m && m.classList.contains('visible') }; }
  }, {
    label: 'help-center-section',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-help-categories li.aioseo-help-category > header'); },
    apply: function (el) {
      var t = el.parentNode && el.parentNode.parentNode;
      if (t && t.classList) t.classList.toggle('opened');
    }
  }, {
    label: 'help-center-view-all',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-help-categories .aioseo-help-docs-viewall'); },
    apply: function (el) {
      var b = closestTo(el, '.aioseo-help-docs-viewall');
      var prev = b.previousSibling;
      while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
      if (prev) prev.classList.toggle('opened');
      b.style.display = 'none';
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Notification Center and Newsroom drawers ──────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Header.b70f0820.js:1 @verified 2026-09-30 @product aioseo
  // Header.b70f0820.js:1: the bell calls notificationsStore.toggleNotifications
  // and the newspaper sets the drawer's `show`; both drawers render their
  // content with v-if, so neither is in a closed capture. They were captured
  // open on the Dashboard (p2-global.json, p3-global.json): from there the
  // buttons hand off; on any other screen they are a logged miss.
  var DRAWERS = { 'Open Notification Center': 'admin-global--notifications-drawer', 'Open Newsroom': 'admin-global--newsroom-drawer' };
  R.register([{
    label: 'header-drawer-open',
    event: 'click',
    match: function (el) {
      var b = closestTo(el, '.aioseo-header .header-actions span.round[title]');
      return !!b && Object.prototype.hasOwnProperty.call(DRAWERS, b.getAttribute('title'));
    },
    apply: function (el) {
      var title = closestTo(el, '.aioseo-header .header-actions span.round[title]').getAttribute('title');
      var target = DRAWERS[title];
      if (slug() === target) { hop('admin-dashboard'); return; }
      if (slug() !== 'admin-dashboard') { miss('state:' + target, title + ': drawer captured on the Dashboard only'); return; }
      hop(target, title + ': drawer not captured yet');
    }
  }, {
    // Index.ec9ba64a.js:1 @25112 the header's close (svg-close) and @26197 the
    // overlay both call toggleNotifications: the drawer closes on the Dashboard.
    label: 'notifications-drawer-close',
    event: 'click',
    match: function (el) {
      return slug() === 'admin-global--notifications-drawer'
        && !!closestTo(el, '.aioseo-notifications > .overlay, .aioseo-notifications .notification-header > div:last-child');
    },
    apply: function () { hop('admin-dashboard'); }
  }, {
    // Header.b70f0820.js:1 @4183 `button.newsroom-close` and @5117 the
    // `.newsroom-overlay` both emit close: the drawer closes on the Dashboard.
    label: 'newsroom-drawer-close',
    event: 'click',
    match: function (el) {
      return slug() === 'admin-global--newsroom-drawer' && !!closestTo(el, '.aioseo-newsroom-drawer .newsroom-close, .aioseo-newsroom-drawer .newsroom-overlay');
    },
    apply: function () { hop('admin-dashboard'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─── settings controls ───────────────────────────────────────────────────
  // Toggle.e33d56f2.js / Checkbox.c081f104.js: a native checkbox that emits
  // update:modelValue on `input`. RadioToggle.78d25582.js: native radios; the
  // selected option's <label> carries the option's activeClass (default
  // "default"; the Off / No option of most toggles passes "dark"). The browser
  // flips the input; the entry mirrors what the store change renders, or
  // reverts the input and logs a miss when that render was never captured.
  function ctlOf(input) {
    var kind = closestTo(input, '.aioseo-radio-toggle') ? 'radio'
      : closestTo(input, 'label.aioseo-toggle') ? 'toggle'
        : closestTo(input, 'label.aioseo-checkbox') ? 'checkbox' : null;
    if (!kind) return null;
    var row = closestTo(input, '.aioseo-settings-row');
    var nm = row ? one('.settings-name .name', row) : null;
    var head = closestTo(input, '.aioseo-card > .header');
    return {
      kind: kind, input: input,
      name: kind === 'radio' ? input.name : '',
      row: row, rowName: nm ? text(nm) : '',
      header: head ? text(one('.header-title', head)) : '',
      label: text(closestTo(input, 'label')) || text(one('.feature-card-header', closestTo(input, '.aioseo-feature-card'))),
      value: kind === 'radio' ? radioIndex(input) : !!input.checked
    };
  }
  function radioIndex(input) {
    var g = closestTo(input, '.aioseo-radio-toggle');
    return g ? all('input[type="radio"]', g).indexOf(input) : -1;
  }
  // The option index whose activeClass is "dark", per radio name, read off
  // every `name:…,options:[…]` in dist/Pro/assets/js (e.g. TitleDescription.a12834d0.js:1
  // @6509, GeneralSitemap.8f3f1fa5.js:1 @10770, Advanced.01b8c41c.js:1 @18094 for
  // autoUpdates, General.37ae09e5.js:1 @9715, Locations.3e63a444.js:1 @15033,
  // OpeningHours.5ec64c9d.js:1 @7180). Every other option is "default".
  var DARK = { autoUpdates: 2 };
  ('adminBarMenu announcements global globalComments staticBlogPage authors postComments search attachments paginated atom rdf ' +
    'emojisAndSymbols commonPatterns redirectPrettyUrls autogenerateDescriptions useContentForAutogeneratedDescriptions ' +
    'noPaginationForCanonical useKeywords useCategoriesForMetaKeywords useTagsForMetaKeywords dynamicallyGenerateKeywords ' +
    'runShortcodes optimizeUtmParameters sitemapIndexes showPaged homepageLink showBlogHome authorBioInjection showFacebookAuthor ' +
    'generateArticleTags useKeywordsInTags useCategoriesInTags usePostTagsInTags dynamic excludeImages enableSchemaMarkup ' +
    'publicationDate compactArchives autogenerate stripPunctuation casing autogenerateWithAi redirectAttachmentUrls ' +
    'underConstruction removeCategoryBase showTwitterAuthor additionalData useOgData preventCrawling includeCustomFields ' +
    'previewGeneralIsMobile enhancedSearch enhancedSearchExcerpt openingHours multipleLocations').split(' ').forEach(function (n) { DARK[n] = 0; });
  function radioClass(name, idx) {
    var d = Object.prototype.hasOwnProperty.call(DARK, name) ? DARK[name] : /ShowInSearch$/.test(name) ? 0 : -1;
    return idx === d ? 'dark' : 'default';
  }
  function paintRadio(input) {
    var g = closestTo(input, '.aioseo-radio-toggle');
    if (!g) return;
    all('input[type="radio"]', g).forEach(function (r, i) {
      var lab = g.querySelector('label[for="' + r.id + '"]');
      if (!lab) return;
      lab.classList.remove('default', 'dark');
      if (r === input) lab.classList.add(radioClass(input.name, i));
    });
  }
  // The radio the captured label marks as selected (its class, not :checked).
  function paintedRadio(g) {
    var hit = null;
    all('input[type="radio"]', g).some(function (r) {
      var lab = g.querySelector('label[for="' + r.id + '"]');
      if (lab && (lab.classList.contains('default') || lab.classList.contains('dark'))) { hit = r; return true; }
      return false;
    });
    return hit;
  }
  function revert(ctl) {
    if (ctl.kind === 'radio') {
      var prev = paintedRadio(closestTo(ctl.input, '.aioseo-radio-toggle'));
      if (prev) prev.checked = true;
    } else {
      ctl.input.checked = !ctl.input.checked;
    }
  }

  // The captured value is the input's own default (the checked attribute the
  // capture froze). Returning to it needs no DOM the capture lacks; leaving it
  // toward a state that renders new nodes is a miss.
  function back(c) { return !!c.input.defaultChecked === !!c.input.checked; }
  // v-if with that guard: showing nodes that were never taken out means the
  // capture holds the other state, so the nodes to show do not exist.
  function vifc(c, key, nodes, shown, note) {
    if (shown && !STASH[key]) return back(c) || note;
    vif(key, nodes, shown);
    return true;
  }

  // Parked other values (capture Step I, 2026-10-01): for a card c, control k
  // (its index among the card's toggle / checkbox / radio inputs) and value v
  // ('on' / 'off', or the radio option's index), <template
  // data-snap-fragment="ctl-<c>-<k>-<v>"> holds the card's innerHTML as the
  // plugin rendered it with that value. One swapped control per card: a
  // second change inside a swapped card is a combination nobody captured.
  var CTL_INPUTS = 'label.aioseo-toggle input, label.aioseo-checkbox input, .aioseo-radio-toggle input';
  function parkedControl(c) {
    var card = closestTo(c.input, '.aioseo-card');
    if (!card) return false;
    var ci = all('.aioseo-card').indexOf(card);
    // A radio group is keyed by its first input (k), its option by v.
    var grp = c.kind === 'radio' ? closestTo(c.input, '.aioseo-radio-toggle') : null;
    var k = all(CTL_INPUTS, card).indexOf((grp && one('input[type="radio"]', grp)) || c.input);
    var v = c.kind === 'radio' ? String(c.value) : (c.input.checked ? 'on' : 'off');
    if (card._snapOrig != null) {
      if (card._snapCtl === k && card._snapV0 === v) {
        card.innerHTML = card._snapOrig;
        card._snapOrig = null; card._snapCtl = null;
        TAGS = null;
        return true;
      }
      return false;
    }
    // A card showing a non-captured card tab (swapped in by card-tab-switch)
    // has its own parked controls, keyed ctl-<c>-<k>-<v>@<s>-<n>.
    var q = '';
    cardStrips().forEach(function (st, s) {
      if (!card.contains(st)) return;
      var n = all('.var-tab', st).findIndex(function (t) { return t.classList.contains('var-tab--active'); });
      if (TAB0[s] != null && TAB0[s] !== n) q = '@' + s + '-' + n;
    });
    var tp = one('template[data-snap-fragment="ctl-' + ci + '-' + k + '-' + v + q + '"]');
    if (!tp) return false;
    card._snapOrig = card.innerHTML;
    card._snapCtl = k;
    // the captured value of this control, to know a click back to it
    card._snapV0 = c.kind === 'radio' ? String(all('input[type="radio"]', closestTo(c.input, '.aioseo-radio-toggle')).findIndex(function (r) { return r.defaultChecked; })) : (c.input.defaultChecked ? 'on' : 'off');
    card.innerHTML = tp.innerHTML;
    TAGS = null;
    return true;
  }
  // One row per control. `when` picks the control; `run(ctl)` renders the new
  // value and returns true, or returns a string (the miss note) when the
  // result was never captured. Every row cites the render that decides it.
  var CONTROLS = [];
  function control(row) { CONTROLS.push(row); }

  // Plain radios: no v-if hangs on them, so the label class is the whole render.
  // GeneralSitemap.8f3f1fa5.js (date / author archive sitemaps), Facebook.6e9a2f6d.js:1 @13537 (showFacebookAuthor),
  // Locations.3e63a444.js (enhancedSearchExcerpt).
  control({ when: function (c) { return c.kind === 'radio' && /^(dateArchiveSitemap|authorSitemap|showFacebookAuthor|enhancedSearchExcerpt)$/.test(c.name); },
    run: function () { return true; } });

  // SERP Preview desktop / mobile (term and post metabox): General.37ae09e5.js:1
  // @9715 binds it to currentPost.generalMobilePrev and passes the device to
  // GoogleSearchPreview.12357065.js:1 @4588, whose only use of it here is the
  // root class `aioseo-google-search-preview--<device>`.
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'previewGeneralIsMobile'; },
    run: function (c) {
      var p = one('.aioseo-google-search-preview', c.row);
      if (!p) return 'SERP preview not found in its row';
      var dev = c.value === 1 ? 'mobile' : 'desktop';
      p.classList.remove('aioseo-google-search-preview--desktop', 'aioseo-google-search-preview--mobile');
      p.classList.add('aioseo-google-search-preview--' + dev);
      return true;
    } });

  // Search Appearance › Knowledge Graph: Person renders the Choose a Person
  // rows and drops the Organization rows (GlobalSettings.9dac789f.js:2 @19461-25024).
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'siteRepresents'; },
    run: function (c) { return back(c) || 'Person: the Choose a Person rows were not captured'; } });
  // Number of Employees "Use a range" off renders the single number field (@23577).
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Number of Employees') === 0; },
    run: function (c) { return back(c) || 'Number of Employees: the single-number field was not captured'; } });

  // Content Types › Show in Search Results: No swaps the description for a
  // blue alert and drops Meta Description (TitleDescription.a12834d0.js:1 @6509-9300).
  control({ when: function (c) { return c.kind === 'radio' && /ShowInSearch$/.test(c.name); },
    run: function (c) { return back(c) || 'Show in Search Results: the other state (noindex alert or Meta Description row) was not captured'; } });

  // Social › Facebook › Enable Open Graph Markup: every row after it and the
  // Home Page / Advanced cards are v-if on general.enable (Facebook.6e9a2f6d.js:1 @850-10662).
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Enable Open Graph Markup') === 0; },
    run: function (c) {
      var card = cardOf(c.row);
      var nodes = rowsAfter(c.row).concat([cardTitled('Home Page Settings'), cardTitled('Advanced Settings')]).filter(Boolean);
      return vifc(c, 'fb-og', nodes, c.value, 'Open Graph on: the settings rows were not captured');
    } });
  // Social › Facebook › Advanced Settings header toggle: `toggles` binds to
  // advanced.enable; on opens a body the capture never rendered (@10662).
  control({ when: function (c) { return c.kind === 'toggle' && c.header.indexOf('Advanced Settings') === 0; },
    run: function (c) { return back(c) || 'Advanced Settings: the card body was not captured'; } });
  // Social Profiles › "Use the same username": renders one username field
  // instead of the per-network list (SocialProfiles.61de4654.js:1).
  control({ when: function (c) { return c.kind === 'checkbox' && c.label.indexOf('Use the same username') === 0; },
    run: function (c) { return back(c) || 'Same username: the username field was not captured'; } });

  // Sitemaps › Enable Sitemap: the GSC notice, the inline notice after the
  // toggle, the Preview row, Sitemap Settings and Advanced Settings are v-if
  // on general.enable; Additional Pages is too, but only as its own card
  // (GeneralSitemap.8f3f1fa5.js:1 @8920-14807, AdditionalPages.e5617a61.js:1 @16098).
  // The RSS Sitemap is the same shape on rss.enable (RssSitemap.c7d9aa46.js:1
  // @4099-5203: notice, inline notice, Preview row, Sitemap Settings card).
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Enable Sitemap') === 0 && !!closestTo(c.input, '.aioseo-general-sitemap, .aioseo-rss-sitemap'); },
    run: function (c) {
      var content = closestTo(c.input, '.aioseo-settings-content');
      var after = [];
      for (var n = closestTo(c.input, 'label.aioseo-toggle').nextElementSibling; n; n = n.nextElementSibling) after.push(n);
      var root = closestTo(c.input, '.aioseo-general-sitemap, .aioseo-rss-sitemap');
      var nodes = [one(':scope > .google-search-console-alerts', root)].concat(after, rowsAfter(c.row),
        all(':scope > .aioseo-card', root).filter(function (k) { return k !== cardOf(c.row); }));
      return !!content && vifc(c, 'sitemap-enable', nodes.filter(Boolean), c.value, 'Enable Sitemap on: the sitemap settings were not captured');
    } });
  // Sitemaps › Enable Sitemap Indexes: Links Per Sitemap (and its >1000
  // notice) are v-if on general.indexes (@11148, @11591).
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'sitemapIndexes'; },
    run: function (c) { return vifc(c, 'sitemap-indexes', [rowNamed('Links Per Sitemap', cardOf(c.row))], c.value === 1, 'Links Per Sitemap was not captured'); } });
  // Sitemaps › Include All Post Types / Taxonomies off renders the checklist (@12155).
  control({ when: function (c) { return c.kind === 'checkbox' && /^Include All (Post Types|Taxonomies)/.test(c.label) && baseOf(slug()).indexOf('admin-sitemaps-') === 0; },
    run: function (c) { return back(c) || c.label + ': the other state was not captured'; } });
  // Sitemaps › Additional Pages header toggle: the card's `toggles` binds to
  // additionalPages.enable (AdditionalPages.e5617a61.js:1 @16144): off drops
  // the `toggles` class and the caret and closes the body; on reopens it
  // (Card.c303b391.js:1 @933, the watch that opens a card when toggles turns on).
  control({ when: function (c) { return c.kind === 'toggle' && c.header.indexOf('Additional Pages') === 0; },
    run: function (c) {
      var card = cardOf(c.input);
      var head = one(':scope > .header', card);
      var box = cardBody(card);
      if (!head || !box) return 'Additional Pages: card not found';
      if (!c.value) {
        head.classList.remove('toggles');
        takeOut('addl-caret', [one(':scope > svg.aioseo-caret', head)]);
        slide(box, false);
      } else {
        head.classList.add('toggles');
        putBack('addl-caret');
        var caret = one(':scope > svg.aioseo-caret', head);
        if (caret) caret.classList.remove('rotated');
        if (!slide(box, true)) return 'Additional Pages: card body was captured closed';
      }
      return true;
    } });
  // Sitemaps › Advanced Settings header toggle: the body was never rendered.
  control({ when: function (c) { return c.kind === 'toggle' && c.header.indexOf('Advanced Settings') === 0 && on(['admin-sitemaps-general-sitemap']); },
    run: function (c) { return back(c) || 'Advanced Settings: the card body was not captured'; } });

  // Local SEO › Locations: Multiple Locations = No renders the single business
  // info card (Locations.3e63a444.js:1 @21240: `multiple ? '' : W`, `multiple ? F : ''`).
  // Both states are captures: Yes is admin-local-seo-locations, No is
  // admin-local-seo-locations--single, so the radio hands off between them.
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'multipleLocations'; },
    run: function (c) {
      if (back(c)) return true;
      if (slug() === 'admin-local-seo-locations' && c.value === 0) return { hop: 'admin-local-seo-locations--single' };
      if (slug() === 'admin-local-seo-locations--single' && c.value === 1) return { hop: 'admin-local-seo-locations' };
      return 'Multiple Locations: the other state was not captured on this screen';
    } });
  // Enhanced Search off drops the Excerpt row (@15033: the row after it, the
  // same `location-enhanced-search` class, named Enhanced Search - Excerpt).
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'enhancedSearch'; },
    run: function (c) { return vifc(c, 'enhanced-search', [rowNamed('Enhanced Search - Excerpt', cardOf(c.row))], c.value === 1, 'the Excerpt row was not captured'); } });
  // Use custom slug / category slug renders the slug input (@12372, @13639).
  control({ when: function (c) { return c.kind === 'checkbox' && /^Use custom (category )?slug/.test(c.label); },
    run: function (c) { return back(c) || c.label + ': the slug field was not captured'; } });

  // Local SEO › Opening Hours (OpeningHours.5ec64c9d.js:1 @7180-10400).
  // Show Opening Hours = No: every row after it is v-if on show.
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'openingHours'; },
    run: function (c) { return vifc(c, 'opening-hours', rowsAfter(c.row), c.value === 1, 'the opening hours rows were not captured'); } });
  // Settings › Open 24/7 (alwaysOpen): drops the 24-hour-format toggle and the
  // Hours row. Use 24-hour format re-renders every time select from another
  // option list — not captured.
  control({ when: function (c) { return c.kind === 'toggle' && c.row && c.row.classList.contains('info-settings-row'); },
    run: function (c) {
      var boxes = all('.aioseo-settings-content > div > div, .aioseo-settings-content > div', c.row).filter(function (d) { return d.querySelector('label.aioseo-toggle'); });
      var first = one('label.aioseo-toggle', c.row);
      if (closestTo(c.input, 'label.aioseo-toggle') !== first) return 'Use 24-hour format: the 24-hour option lists were not captured';
      var second = all('label.aioseo-toggle', c.row)[1];
      return vifc(c, 'always-open', [second, one('.aioseo-settings-row.info-hours-row')].filter(Boolean), !c.value, 'Open 24/7 off: the Hours row was not captured');
    } });
  // Hours › Open 24h / Closed per day: both disable the day's two time
  // selects (`disabled: open24h || closed`); Closed also disables Open 24h.
  // BaseSelect disabled = `multiselect--disabled` + a disabled input; BaseCheckbox
  // disabled = label class `disabled` + a disabled input (Checkbox.c081f104.js).
  function setSelectDisabled(ms, off) {
    ms.classList.toggle('multiselect--disabled', off);
    var i = one('input.multiselect__input', ms);
    if (i) { if (off) i.setAttribute('disabled', ''); else i.removeAttribute('disabled'); }
  }
  function setCheckboxDisabled(lab, off) {
    lab.classList.toggle('disabled', off);
    var i = one('input', lab);
    if (i) { i.disabled = off; if (off) i.setAttribute('disabled', ''); else i.removeAttribute('disabled'); }
  }
  control({ when: function (c) { return c.kind === 'checkbox' && !!closestTo(c.input, '.info-hours-row .aioseo-col-alwaysopen'); },
    run: function (c) {
      var day = closestTo(c.input, '.aioseo-col-flex');
      var boxes = all('.aioseo-col-alwaysopen label.aioseo-checkbox', day);
      var open24 = boxes[0], closed = boxes[1];
      var isClosed = !!(closed && one('input', closed).checked);
      var is24 = !!(open24 && one('input', open24).checked);
      all('.aioseo-col-hours .multiselect', day).forEach(function (ms) { setSelectDisabled(ms, is24 || isClosed); });
      if (open24) setCheckboxDisabled(open24, isClosed);
      return true;
    } });

  // Social › X (Twitter): Show X Author, Additional Data and Use Data from
  // Facebook Tab have no v-if on this page (Twitter.48706611.js:1 @10198-11681).
  control({ when: function (c) { return c.kind === 'radio' && /^(showTwitterAuthor|additionalData|useOgData)$/.test(c.name); },
    run: function () { return true; } });
  // Enable X Card: every row after it and the Home Page card are v-if on
  // general.enable (@6174-11799), as on the Facebook tab.
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Enable X Card') === 0; },
    run: function (c) {
      return vifc(c, 'x-card', rowsAfter(c.row).concat([cardTitled('Home Page Settings')]).filter(Boolean), c.value, 'X Card on: the settings rows were not captured');
    } });
  // Tools › SEO Alerts: Enable SEO Alerts off drops the alert rows and the
  // Delivery card (SeoAlerts.87b3fcbf.js:1 @4798, @5122).
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Enable SEO Alerts') === 0; },
    run: function (c) {
      return vifc(c, 'seo-alerts', rowsAfter(c.row).concat([cardTitled('SEO Alerts Delivery') || cardTitled('Delivery')]).filter(Boolean), c.value, 'SEO Alerts on: the alert rows were not captured');
    } });
  // Tools › Robots.txt: turning the custom rules off re-merges the preview
  // from the default rules (RobotsEditor.4e1d6e0d.js:2 @8278) — a text the
  // capture never held.
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Enable Custom Robots.txt') === 0; },
    run: function (c) { return back(c) || 'Custom Robots.txt: the default-rules preview was not captured'; } });

  // Tools › Database Tools › Select Settings (DatabaseTools.8b609d2c.js:1
  // @3700-4700): the reset targets are plain ticks; "All AIOSEO Settings" on
  // renders every other target as a checked, disabled checkbox (key 1) and off
  // brings back each one's own value. The Reset button is `disabled: canReset`,
  // i.e. disabled while no option is ticked (@2093).
  control({ when: function (c) { return c.kind === 'checkbox' && on(['admin-tools-database-tools']) && c.rowName.indexOf('Select Settings') === 0; },
    run: function (c) {
      var boxes = all('label.aioseo-checkbox', c.row);
      var allBox = boxes[0];
      if (closestTo(c.input, 'label.aioseo-checkbox') === allBox) {
        boxes.slice(1).forEach(function (lab) {
          var i = one('input', lab);
          if (c.value) { lab._snapOwn = i.checked; i.checked = true; }
          else if (lab._snapOwn != null) { i.checked = lab._snapOwn; lab._snapOwn = null; }
          setCheckboxDisabled(lab, c.value);
        });
      }
      var anyOn = (one('input', allBox) || {}).checked || boxes.slice(1).some(function (lab) { return lab._snapOwn != null ? lab._snapOwn : one('input', lab).checked; });
      var reset = all('button.aioseo-button').filter(function (b) { return /^Reset Selected Settings/.test(text(b)); })[0];
      if (reset) { if (anyOn) reset.removeAttribute('disabled'); else reset.setAttribute('disabled', ''); }
      return true;
    } });

  // A control whose other value renders nodes the base never held, captured as
  // its own state: base ↔ state, both ways (QC round 1, 2026-10-01). Any other
  // screen the control sits on is a miss.
  function pairHop(c, base, state, note) {
    if (back(c)) return true;
    if (slug() === base) return { hop: state };
    if (slug() === state) return { hop: base };
    return note || 'the other state was not captured on this screen';
  }
  var BC = 'admin-settings-breadcrumbs';
  function rowToggle(c, rowName, nth) {
    return c.kind === 'toggle' && c.rowName.indexOf(rowName) === 0 && all('label.aioseo-toggle', c.row).indexOf(closestTo(c.input, 'label.aioseo-toggle')) === (nth || 0);
  }

  // Settings › Breadcrumbs (Breadcrumbs.b8e65f03.js:1). Current Item: "Show
  // current item" drops the Link-current-item toggle and the previews' last
  // crumb (@58494, @4303); "Link current item" relinks it (@5206); Homepage
  // Link drops the Home Page Label row and "Home" (@43720, @52188). The
  // per-type "use default template" toggles swap in the template editor.
  control({ when: function (c) { return rowToggle(c, 'Current Item', 0) && baseOf(slug()) === BC; },
    run: function (c) { return pairHop(c, BC, BC + '--no-current-item'); } });
  control({ when: function (c) { return rowToggle(c, 'Current Item', 1) && baseOf(slug()) === BC; },
    run: function (c) { return pairHop(c, BC, BC + '--link-current-item'); } });
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'homepageLink'; },
    run: function (c) { return pairHop(c, BC, BC + '--no-homepage-link'); } });
  control({ when: function (c) { return c.kind === 'toggle' && baseOf(slug()) === BC && /^(Posts|Pages|Attachments|Locations)$/.test(c.rowName); },
    run: function (c) {
      if (c.rowName === 'Posts') return pairHop(c, BC, BC + '--posts-custom-template');
      return back(c) || c.rowName + ': the custom template editor was not captured (Posts only)';
    } });

  // Settings › Content Optimization (WritingAssistant.5974908e.js:1). TruSEO
  // off drops Post Types, Taxonomies, Highlighter, Highlight style and Spell
  // Checker (@7027-9756; Headline Analyzer is not guarded, @10060); Highlighter
  // off drops Highlight style (@8987). "Include all taxonomies" on drops the
  // per-taxonomy list (@8251); the list is captured, so both ways run in place.
  // "Include all post types" off renders a list the capture lacks (@7380, @12455).
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName === 'TruSEO' && on(['admin-settings-content-optimization']); },
    run: function (c) {
      var card = cardOf(c.row);
      var rows = ['Post Types', 'Taxonomies', 'Highlighter', 'Highlight style', 'Spell Checker'].map(function (n) { return rowNamed(n, card); });
      return vifc(c, 'truseo', rows.filter(Boolean), c.value, 'TruSEO on: the TruSEO rows were not captured');
    } });
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName === 'Highlighter'; },
    run: function (c) { return vifc(c, 'highlighter', [rowNamed('Highlight style', cardOf(c.row))], c.value, 'Highlight style was not captured'); } });
  control({ when: function (c) { return c.kind === 'toggle' && /^(Spell Checker|Headline Analyzer)$/.test(c.rowName); },
    run: function () { return true; } });
  control({ when: function (c) { return c.kind === 'checkbox' && on(['admin-settings-content-optimization']) && /^Include all taxonomies/.test(c.label); },
    run: function (c) { return vifc(c, 'truseo-taxonomies', [one('.aioseo-post-type-options-toggle', c.row)], !c.value, 'the taxonomy list was not captured'); } });
  control({ when: function (c) { return c.kind === 'checkbox' && on(['admin-settings-content-optimization']) && !!closestTo(c.input, '.aioseo-post-type-options-toggle'); },
    run: function () { return true; } });
  control({ when: function (c) { return c.kind === 'checkbox' && /^Include all post types/.test(c.label) && baseOf(slug()) === 'admin-settings-content-optimization'; },
    run: function (c) {
      var wa = cardOf(c.row) && /Writing Assistant/.test(text(one(':scope > .header .header-title', cardOf(c.row))));
      var s = 'admin-settings-content-optimization';
      return pairHop(c, s, s + (wa ? '--wa-post-types' : '--truseo-post-types'));
    } });

  // Settings › Access Control (AccessControl.ebf06a4b.js:1 @6433): a role's
  // "Use Default Settings" off replaces its description with the granular
  // capability toggles. Captured for Editor.
  control({ when: function (c) { return c.kind === 'toggle' && baseOf(slug()) === 'admin-settings-access-control' && !!c.row; },
    run: function (c) {
      var s = 'admin-settings-access-control';
      if (c.rowName.indexOf('Editor') === 0) return pairHop(c, s, s + '--editor-custom');
      return back(c) || c.rowName + ': the granular capabilities were not captured (Editor only)';
    } });

  // Settings › Advanced (Advanced.01b8c41c.js:1). Admin Bar Menu,
  // Announcements, Uninstall and the dashboard-widget ticks carry no v-if.
  // Automatic Updates swaps one description span per value (@18327-18551,
  // the strings at @10052-10300). Email Reports on renders the recipients
  // table (@5472); the Include All toggles render their lists (@14431, @15346).
  control({ when: function (c) { return c.kind === 'radio' && /^(adminBarMenu|announcements)$/.test(c.name); },
    run: function () { return true; } });
  var AUTO_UPDATES = [
    'You are getting the latest features, bugfixes, and security updates as they are released.',
    'You are getting bugfixes and security updates, but not major features.',
    'You will need to manually update everything.'
  ];
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'autoUpdates'; },
    run: function (c) {
      var span = one('.aioseo-description > span', closestTo(c.input, '.aioseo-settings-content'));
      if (!span || !AUTO_UPDATES[c.value]) return 'Automatic Updates: description not found';
      span.textContent = AUTO_UPDATES[c.value];
      return true;
    } });
  control({ when: function (c) { return baseOf(slug()) === 'admin-settings-advanced' && ((c.kind === 'toggle' && c.rowName.indexOf('Uninstall') === 0) || (c.kind === 'checkbox' && c.rowName.indexOf('Dashboard Widgets') === 0)); },
    run: function () { return true; } });
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Email Reports') === 0 && baseOf(slug()) === 'admin-settings-advanced'; },
    run: function (c) { return pairHop(c, 'admin-settings-advanced', 'admin-settings-advanced--email-reports'); } });
  control({ when: function (c) { return c.kind === 'checkbox' && baseOf(slug()) === 'admin-settings-advanced' && /^(Post Type|Taxonomy) Columns/.test(c.rowName); },
    run: function (c) {
      var s = 'admin-settings-advanced';
      return pairHop(c, s, s + (c.rowName.indexOf('Post Type') === 0 ? '--post-type-columns' : '--taxonomy-columns'));
    } });

  // Search Appearance › Content Types › Posts › Advanced: Robots Meta
  // Settings "Use Default Settings" off renders the robots checkboxes.
  control({ when: function (c) { return c.kind === 'toggle' && c.rowName.indexOf('Robots Meta') === 0 && !!closestTo(c.input, '#aioseo-card-postSA'); },
    run: function (c) {
      var s = 'admin-search-appearance-content-types--post-advanced';
      return pairHop(c, s, s + '-robots');
    } });

  // Image SEO "Autogenerate Alt Text with AI" (autogenerateWithAi) is a capture
  // hazard (H13): never clicked, so its other value was never parked.
  control({ when: function (c) { return c.kind === 'radio' && c.name === 'autogenerateWithAi'; },
    run: function (c) { return back(c) || 'Autogenerate Alt Text with AI: a capture hazard (H13), never clicked, so its other state was not captured'; } });

  // Actions that save, install or call out are NEVER mirrored (interactions.md §H).
  // Feature Manager addon toggles: plugins/install · plugins/deactivate (H12).
  control({ when: function (c) { return c.kind === 'toggle' && !!closestTo(c.input, '.aioseo-feature-card'); },
    run: function () { return 'addon toggle installs / deactivates plugins on the live site (H12); not mirrored'; } });
  // Redirects row Enable toggle: POST redirects/{id} (H10/H11).
  control({ when: function (c) { return c.kind === 'toggle' && !!closestTo(c.input, '.aioseo-redirects, .aioseo-wp-table'); },
    run: function () { return 'redirect enable toggle saves on the live site; not mirrored'; } });

  // ─ Settings control change ───────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/RadioToggle.78d25582.js:1 @verified 2026-09-30 @product aioseo
  // RadioToggle.78d25582.js:1 (label class `a.activeClass||"default"` on the
  // selected option), Toggle.e33d56f2.js:1 and Checkbox.c081f104.js:1 (native
  // checkbox, onInput → update:modelValue). Each CONTROLS row cites the v-if
  // its value decides. A control with no row keeps its captured value and
  // logs a miss: its dependents were not audited, and a miss beats a wrong state.
  R.register([{
    label: 'settings-control-change',
    event: 'change',
    match: function (el) { return !!el && el.tagName === 'INPUT' && !!ctlOf(el); },
    apply: function (el) {
      var c = ctlOf(el);
      var row = null;
      CONTROLS.some(function (r) { if (r.when(c)) { row = r; return true; } return false; });
      var res = row ? row.run(c) : 'control not mirrored: its dependents were not audited';
      if (res === true) {
        if (c.kind === 'radio') { paintRadio(el); console.info('[snap] set: ' + (c.rowName || c.name) + ' = ' + text(closestTo(el, 'div').querySelector('label'))); }
        return;
      }
      // The capture may have parked this control's other value: the card as
      // the plugin re-rendered it (ctl-<card>-<control>-<value>). Swap it in;
      // going back to the captured value restores the captured card.
      if ((typeof res === 'string' || (res && res.hop && !captured(res.hop))) && parkedControl(c)) {
        if (c.kind === 'radio') console.info('[snap] set: ' + (c.rowName || c.name) + ' = ' + text(closestTo(el, 'div').querySelector('label')) + ' (parked card)');
        return;
      }
      revert(c);
      if (res && res.hop) { hop(res.hop, res.hop + ' not captured yet'); return; }
      miss('control:' + (c.name || c.rowName || c.header || c.label), res);
    },
    state: function (el) {
      var c = ctlOf(el);
      return { key: c.name || c.rowName || c.header || c.label, value: c.kind === 'radio' ? c.value : !!el.checked };
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─── smart tags (HtmlTagsEditor.e2af2cf8.js + Editor.0c8da691.js) ───────
  // Tag data, in order of trust: the capture's parked "View all tags" menus
  // (<template data-snap-fragment="tags-menu-<i>">, each li carries the quill-
  // mention data the plugin built: id, name, description, value (pill HTML),
  // valueText (the resolved value), menuHtml); the parked tag store
  // (<body data-snap-aioseo-tags>: window.aioseo.tags + the store's liveTags);
  // and the pills already in the page. Nothing is resolved here: a value is
  // read, never computed, and a tag with no read value is a logged miss.
  var TAGS = null;
  function tagRegistry() {
    if (TAGS) return TAGS;
    TAGS = { byId: {}, byName: {} };
    var put = function (t) {
      if (!t || !t.id) return;
      var cur = TAGS.byId[t.id] || {};
      for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k) && t[k] != null && t[k] !== '' && cur[k] == null) cur[k] = t[k];
      TAGS.byId[t.id] = cur;
      if (cur.name) TAGS.byName[cur.name] = cur;
    };
    all('.mention[data-id]').forEach(function (m) {
      put({ id: m.dataset.id, name: m.dataset.name, description: m.dataset.description, valueHtml: m.dataset.value,
        valueText: m.dataset.valueText, menuHtml: m.dataset.menuHtml });
    });
    all('template[data-snap-fragment^="tags-menu-"]').forEach(function (tp) {
      all('li[data-id]', tp.content).forEach(function (li) {
        put({ id: li.dataset.id, name: li.dataset.name, description: li.dataset.description, valueHtml: li.dataset.value,
          valueText: li.dataset.valueText, menuHtml: li.dataset.menuHtml });
      });
    });
    var parked = null;
    try { parked = JSON.parse(document.body.getAttribute('data-snap-aioseo-tags') || 'null'); } catch (_) { parked = null; }
    if (parked && parked.tags) {
      parked.tags.forEach(function (t) {
        var live = parked.liveTags && parked.liveTags[t.id];
        put({ id: t.id, name: t.name, description: t.description, valueText: live != null && live !== '' ? String(live) : t.value });
      });
    }
    return TAGS;
  }
  // Editor.0c8da691.js:1 @4228 (the mention blot's create): the pill is a
  // span.mention carrying the item's data attributes, holding the
  // denotation char and the item's value HTML. The value HTML is the
  // plugin's tag markup (`aioseo-tag` › `tag-name` + `tag-toggle`); a tag
  // known only from the store reuses a captured pill's markup with its name.
  function pillHtmlFor(t) {
    if (t.valueHtml) return t.valueHtml;
    var any = one('.mention[data-value]');
    if (!any) return null;
    var box = document.createElement('div');
    box.innerHTML = any.dataset.value;
    var n = one('.tag-name', box);
    if (!n) return null;
    n.textContent = t.name;
    return box.innerHTML;
  }
  function makePill(t) {
    var html = pillHtmlFor(t);
    if (!html) return null;
    var m = document.createElement('span');
    m.className = 'mention';
    m.setAttribute('data-denotation-char', '#');
    m.setAttribute('data-id', t.id);
    m.setAttribute('data-name', t.name || t.id);
    m.setAttribute('data-description', t.description || '');
    m.setAttribute('data-value', html);
    m.setAttribute('data-value-text', t.valueText == null ? '' : t.valueText);
    m.setAttribute('data-menu-html', t.menuHtml || '');
    m.setAttribute('data-custom-value', '');
    m.innerHTML = '﻿<span contenteditable="false"><span class="ql-mention-denotation-char">#</span>' + html + '</span>﻿';
    return m;
  }
  // Editor.0c8da691.js:1 @28279 insertTag(id): "#<id>" goes in at the cursor
  // with a space before it unless the text there already ends in one; the
  // mention module turns it into the pill and adds a space after
  // (spaceAfterInsert, @5306). A snapshot has no cursor, so it goes at the
  // end of the field, which is where a click on a chip leaves a fresh field.
  function insertPill(editor, t) {
    var q = one('.ql-editor', editor);
    if (!q) return false;
    var p = q.lastElementChild && q.lastElementChild.tagName === 'P' ? q.lastElementChild : null;
    if (!p) { p = document.createElement('p'); q.appendChild(p); }
    var br = one(':scope > br', p);
    if (br && p.childNodes.length === 1) p.removeChild(br);
    var pill = makePill(t);
    if (!pill) return false;
    var before = (p.textContent || '').replace(/﻿/g, '');
    if (before && !/\s$/.test(before)) p.appendChild(document.createTextNode(' '));
    p.appendChild(pill);
    p.appendChild(document.createTextNode(' '));
    q.classList.remove('ql-blank');
    return true;
  }
  // The field as the plugin parses it (app-core.2e1fbbab.js:5 @269221
  // parseTags: every #tag becomes its value), read from the editor DOM.
  function parsedField(editor) {
    var q = one('.ql-editor', editor);
    if (!q) return '';
    var out = [];
    all(':scope > p', q).forEach(function (p) {
      var s = '';
      (function walk(n) {
        for (var c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 3) s += c.nodeValue;
          else if (c.nodeType === 1 && c.classList.contains('mention')) {
            var t = tagRegistry().byId[c.dataset.id] || {};
            s += c.dataset.valueText != null && c.dataset.valueText !== '' ? c.dataset.valueText : (t.valueText || '');
          } else if (c.nodeType === 1) walk(c);
        }
      })(p);
      out.push(s);
    });
    return out.join(' ').replace(/﻿/g, '').replace(/\s+/g, ' ').trim();
  }
  // GoogleSearchPreview.12357065.js:1: the title shows 70 characters then
  // " ..." (@4588), the description 160 then " ..." with every focus-keyphrase
  // word bolded (@2124). The keyphrase words are read off the captured bolds.
  function refreshPreview(editor) {
    var row = closestTo(editor, '.aioseo-settings-row');
    var name = row ? text(one('.settings-name .name', row)) : '';
    if (/facebook|twitter|\bx\b|social/i.test(name)) return;
    var scope = editor;
    while (scope && scope !== document.body && !one('.aioseo-google-search-preview', scope)) scope = scope.parentElement;
    if (!scope || scope === document.body) return;
    var val = parsedField(editor);
    var isDesc = /description/i.test(name);
    var target = one(isDesc ? '.aioseo-google-search-preview__description' : '.aioseo-google-search-preview__title', scope);
    if (target) {
      if (isDesc) {
        var words = all('strong', target).map(function (s) { return text(s).toLowerCase(); }).filter(function (w, i, a) { return w && a.indexOf(w) === i; });
        var d = val.length > 160 ? val.substring(0, 160).trim() + ' ...' : val;
        var esc = d.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        words.forEach(function (w) {
          var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
          esc = esc.replace(re, '<strong>$&</strong>');
        });
        target.innerHTML = esc;
        target.style.display = d ? '' : 'none';
      } else {
        target.textContent = val.length > 70 ? val.substring(0, 70).trim() + ' ...' : val;
      }
    }
    // The counter under the field (HtmlTagsEditor onCounter → titleCount /
    // descriptionCount, printed by maxRecommendedCount).
    var box = closestTo(editor, '.aioseo-settings-content');
    var count = box ? one('.max-recommended-count', box) : null;
    if (count) {
      var strong = all('strong', count);
      if (strong.length >= 2) strong[0].textContent = String(val.length);
      else if (strong.length === 1 && /^\s*out of/.test(count.textContent)) count.insertBefore(Object.assign(document.createElement('strong'), { textContent: String(val.length) }), count.firstChild);
    }
  }

  // ─ Smart tag chips ───────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/HtmlTagsEditor.e2af2cf8.js:1 @verified 2026-10-01 @product aioseo
  // HtmlTagsEditor.e2af2cf8.js:1 @26430: each `.aioseo-add-template-tag` chip
  // (the field's default tags, @25543) calls insertTag(tag.id) → the editor's
  // insertTag (Editor.0c8da691.js:1 @28279), and the field's preview re-parses.
  // Typing in a field (the editor is contenteditable in the capture too)
  // re-parses the same way.
  R.register([{
    label: 'smart-tag-chip',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-html-tags-editor .add-tags .aioseo-add-template-tag'); },
    apply: function (el) {
      var chip = closestTo(el, '.aioseo-add-template-tag');
      var editor = closestTo(chip, '.aioseo-html-tags-editor');
      var name = text(chip);
      var t = tagRegistry().byName[name];
      if (!t || t.valueText == null) { miss('tag:' + name, 'smart tag "' + name + '": its value was not parked in this capture'); return; }
      if (insertPill(editor, t)) refreshPreview(editor);
    },
    state: function (el) { return { key: 'smart-tag', value: text(closestTo(el, '.aioseo-add-template-tag')) }; }
  }, {
    label: 'smart-tag-field-input',
    event: 'input',
    match: function (el) { return !!closestTo(el, '.aioseo-html-tags-editor .ql-editor'); },
    apply: function (el) { refreshPreview(closestTo(el, '.aioseo-html-tags-editor')); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Smart tag menu ────────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Editor.0c8da691.js:1 @verified 2026-10-01 @product aioseo
  // HtmlTagsEditor.e2af2cf8.js:1 @26965 "View all tags" → insertTag() with no
  // id: the quill-mention list opens (Editor.0c8da691.js:1 showMentionList
  // @11573). Its items are the capture's own, parked per link (tags-menu-<i>,
  // i = the link's index among every .aioseo-view-all-tags); a pick inserts
  // that item (selectItem → insertItem, @14040) and closes the list; the
  // search field filters it; Escape or a click outside closes it.
  function closeTagMenus(except) {
    all('.ql-mention-list-container[data-snap-open]').forEach(function (c) {
      if (c === except) return;
      c.style.display = 'none';
      c.removeAttribute('data-snap-open');
      if (c._snapPill) { pillCaret(c._snapPill, false); c._snapPill = null; }
    });
  }
  function pillCaret(pill, on) {
    var svg = one('.aioseo-tag .tag-toggle svg', pill);
    if (svg) svg.classList.toggle('rotated', on);
  }
  // The editor's parked list: its View-all-tags link's menu, or (an editor
  // with no such link) pill-menu-<e>, e = its index among every editor.
  function fillTagMenu(editor) {
    var link = one('a.aioseo-view-all-tags', editor);
    var key = link ? 'tags-menu-' + all('.aioseo-view-all-tags').indexOf(link) : 'pill-menu-' + all('.aioseo-html-tags-editor').indexOf(editor);
    var tp = one('template[data-snap-fragment="' + key + '"]');
    var box = one('.ql-mention-list-container', editor);
    if (!tp || !box) return null;
    var parked = tp.content.firstElementChild;
    if (!box.hasAttribute('data-snap-filled') && parked) {
      box.innerHTML = parked.innerHTML;
      box.setAttribute('data-snap-filled', '');
    }
    return box;
  }
  R.register([{
    label: 'smart-tag-menu-open',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-html-tags-editor a.aioseo-view-all-tags'); },
    apply: function (el) {
      var link = closestTo(el, 'a.aioseo-view-all-tags');
      var editor = closestTo(link, '.aioseo-html-tags-editor');
      var box = fillTagMenu(editor);
      if (!box) { miss('tags-menu:' + all('.aioseo-view-all-tags').indexOf(link), 'View all tags: the tag list was not parked in this capture'); return; }
      closeTagMenus();
      box.style.display = '';
      box.setAttribute('data-snap-open', '');
    }
  }, {
    // A pill's clickHandler (Editor.0c8da691.js:1 @3923): with the list open
    // it closes it; else it rotates the pill's caret, sets currentBlot and
    // mentionCharPos to the pill, and opens the same source("") list, so a
    // pick replaces this pill.
    label: 'smart-tag-pill-switch',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-html-tags-editor .ql-editor .mention'); },
    apply: function (el) {
      var pill = closestTo(el, '.mention');
      var editor = closestTo(pill, '.aioseo-html-tags-editor');
      var open = one('.ql-mention-list-container[data-snap-open]', editor);
      if (open) { closeTagMenus(); return; }
      var box = fillTagMenu(editor);
      if (!box) { miss('tag-switch', 'the tag-switch list was not parked for this field'); return; }
      closeTagMenus();
      box.style.display = '';
      box.setAttribute('data-snap-open', '');
      box._snapPill = pill;
      pillCaret(pill, true);
    },
    state: function (el) { return { key: 'tag-switch', value: (closestTo(el, '.mention') || {}).dataset ? closestTo(el, '.mention').dataset.id : '' }; }
  }, {
    label: 'smart-tag-menu-pick',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.ql-mention-list-container[data-snap-open] li.ql-mention-list-item'); },
    apply: function (el) {
      var li = closestTo(el, 'li.ql-mention-list-item');
      var editor = closestTo(li, '.aioseo-html-tags-editor');
      var t = { id: li.dataset.id, name: li.dataset.name, description: li.dataset.description, valueHtml: li.dataset.value,
        valueText: li.dataset.valueText, menuHtml: li.dataset.menuHtml };
      if (/^custom_field|^tax_name/.test(t.id || '')) { miss('tag:' + t.id, t.name + ': asks for a field name first (the custom field input), not mirrored'); return; }
      var box = closestTo(li, '.ql-mention-list-container');
      var old = box._snapPill;
      closeTagMenus();
      if (old && old.parentNode) {
        var pill = makePill(t);
        if (pill) { old.parentNode.replaceChild(pill, old); refreshPreview(editor); }
        return;
      }
      if (insertPill(editor, t)) refreshPreview(editor);
    }
  }, {
    label: 'smart-tag-menu-search',
    event: 'input',
    match: function (el) { return !!closestTo(el, '.ql-mention-list-container[data-snap-open] .aioseo-tag-search input'); },
    apply: function (el) {
      var q = String(el.value || '').toLowerCase();
      all('li.ql-mention-list-item', closestTo(el, '.ql-mention-list-container')).forEach(function (li) {
        var hit = !q || ((li.dataset.name || '') + ' ' + (li.dataset.description || '')).toLowerCase().indexOf(q) !== -1;
        li.style.display = hit ? '' : 'none';
      });
    }
  }, {
    label: 'smart-tag-menu-close',
    event: 'click',
    order: 'last',
    match: function (el) { return !!one('.ql-mention-list-container[data-snap-open]') && !closestTo(el, '.ql-mention-list-container, a.aioseo-view-all-tags, .ql-editor .mention, a[href], button'); },
    apply: function () { closeTagMenus(); }
  }, {
    label: 'smart-tag-menu-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && !!one('.ql-mention-list-container[data-snap-open]'); },
    apply: function () { closeTagMenus(); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Emoji picker ──────────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/HtmlTagsEditor.e2af2cf8.js:1 @verified 2026-10-01 @product aioseo
  // HtmlTagsEditor.e2af2cf8.js:1 @22543: the 😀 button toggles the
  // <em-emoji-picker> (emoji-mart, an open shadow root) under it;
  // onEmojiSelect closes it and insertSelectedEmoji (@25788) puts o.native at
  // the cursor (insertToCursor); Escape or a click outside closes it
  // (documentClick / escapeListener). The capture parked the open picker's
  // shadow content once per screen (emoji-0, round 3); every button on the
  // screen reuses it. Its search needs emoji-mart's data: a miss.
  function emojiBox(btn) {
    var wrap = btn.nextElementSibling;
    return wrap ? one('.aioseo-emoji-picker', wrap) : null;
  }
  function closeEmoji(except) {
    all('.aioseo-emoji-picker[data-snap-open]').forEach(function (b) {
      if (b === except) return;
      b.style.display = 'none';
      b.removeAttribute('data-snap-open');
    });
  }
  function emojiInsert(box, ch) {
    var editor = closestTo(box, '.aioseo-html-tags-editor');
    var q = editor ? one('.ql-editor', editor) : null;
    closeEmoji();
    if (!q) return;
    var p = q.lastElementChild && q.lastElementChild.tagName === 'P' ? q.lastElementChild : null;
    if (!p) { p = document.createElement('p'); q.appendChild(p); }
    var br = one(':scope > br', p);
    if (br && p.childNodes.length === 1) p.removeChild(br);
    p.appendChild(document.createTextNode(ch));
    q.classList.remove('ql-blank');
    refreshPreview(editor);
  }
  R.register([{
    label: 'emoji-picker-toggle',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-html-tags-editor .aioseo-show-emoji-button'); },
    apply: function (el) {
      var btn = closestTo(el, '.aioseo-show-emoji-button');
      var box = emojiBox(btn);
      var tp = one('template[data-snap-fragment="emoji-0"]');
      var host = box ? one('em-emoji-picker', box) : null;
      if (!box || !host) { miss('emoji-picker', 'the emoji picker container is not in this capture'); return; }
      if (box.hasAttribute('data-snap-open')) { closeEmoji(); return; }
      if (!host.shadowRoot) {
        if (!tp) { miss('emoji-picker', 'the emoji picker was not parked on this screen'); return; }
        var root = host.attachShadow({ mode: 'open' });
        root.innerHTML = tp.innerHTML;
        root.addEventListener('click', function (evt) {
          var b = evt.target.closest ? evt.target.closest('button') : null;
          if (!b) return;
          evt.stopPropagation();
          var nav = b.closest('#nav');
          if (nav) {
            // nav buttons scroll their category into view (emoji-mart Navigation)
            var i = Array.prototype.indexOf.call(nav.querySelectorAll('button'), b);
            var cat = Array.prototype.filter.call(root.querySelectorAll('[id]'), function (x) { return !/^(root|nav|preview)$/.test(x.id); })[i];
            if (cat) cat.scrollIntoView({ block: 'start' });
            return;
          }
          var native = b.getAttribute('aria-label') || '';
          var span = b.querySelector('.emoji-mart-emoji span, span span');
          var ch = span ? span.textContent : native;
          if (ch && !/\w{3,}/.test(ch)) emojiInsert(box, ch);
          else console.info('[snap] no-op: "' + (native || b.title || '') + '" is a picker control');
        });
        root.addEventListener('input', function () { console.info('[snap] no snapshot for emoji-search — emoji search needs emoji-mart\'s data; not captured'); });
      }
      closeEmoji(box);
      box.style.display = '';
      box.setAttribute('data-snap-open', '');
    },
    state: function () { return { key: 'emoji-picker', value: 'open' }; }
  }, {
    label: 'emoji-picker-close',
    event: 'click',
    order: 'last',
    match: function (el) { return !!one('.aioseo-emoji-picker[data-snap-open]') && !closestTo(el, '.aioseo-show-emoji-button, em-emoji-picker'); },
    apply: function () { closeEmoji(); }
  }, {
    label: 'emoji-picker-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && !!one('.aioseo-emoji-picker[data-snap-open]'); },
    apply: function () { closeEmoji(); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Date picker ───────────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/DatePicker.41b8fbe5.js:1 @verified 2026-10-01 @product aioseo
  // DatePicker.41b8fbe5.js:1 @2620: the BaseDatePicker (`.aioseo-datepicker-picker` over an element-plus
  // el-date-picker) opens the element-plus panel teleported to <body>; a day
  // click sets the value and closes it; Escape or a click outside closes it.
  // Parked open per picker (datepicker-<j>, j = the picker's index among every
  // `.aioseo-datepicker-picker`, round 3), so the month shown is the captured
  // one: the month / year arrows and the header's year view are misses. A
  // date-and-time picker (has-time) stays open after a day; Now / OK close it.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function closeDatePickers() {
    all('.el-picker__popper[data-snap-open]').forEach(function (p) { p.remove(); });
  }
  R.register([{
    label: 'date-picker-open',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-datepicker-picker') && !closestTo(el, '.aioseo-datepicker-picker .clear'); },
    apply: function (el, evt) {
      if (evt) evt.__snapHandled = true;
      var pick = closestTo(el, '.aioseo-datepicker-picker');
      var j = all('.aioseo-datepicker-picker').indexOf(pick);
      var open = one('.el-picker__popper[data-snap-open]');
      if (open && open._snapPicker === pick) { closeDatePickers(); return; }
      closeDatePickers();
      var tp = one('template[data-snap-fragment="datepicker-' + j + '"]');
      if (!tp) { miss('date-picker', 'the date picker popup was not parked for this field'); return; }
      var pop = tp.content.firstElementChild.cloneNode(true);
      var r = pick.getBoundingClientRect();
      pop.style.inset = '';
      pop.style.position = 'absolute';
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      pop.style.left = (r.left + window.scrollX) + 'px';
      pop.setAttribute('data-snap-open', '');
      pop._snapPicker = pick;
      document.body.appendChild(pop);
    }
  }, {
    label: 'date-picker-day',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.el-picker__popper[data-snap-open] .el-date-table td'); },
    apply: function (el) {
      var td = closestTo(el, 'td');
      var pop = closestTo(td, '.el-picker__popper');
      if (td.classList.contains('disabled')) { console.info('[snap] no-op: a disabled day (after today), as in the plugin'); return; }
      if (!td.classList.contains('available')) { miss('date-picker-month', 'a day of the next or previous month: that month was not captured'); return; }
      var head = all('.el-date-picker__header-label', pop).map(text).join(' ');
      var y = (head.match(/\d{4}/) || [])[0];
      var m = MONTHS.filter(function (n) { return head.indexOf(n) !== -1; })[0];
      var d = parseInt(text(one('.el-date-table-cell__text', td) || td), 10);
      var pick = pop._snapPicker;
      all('td.current', pop).forEach(function (c) { c.classList.remove('current'); });
      td.classList.add('current');
      if (pick && y && m && d) {
        var mm = ('0' + (MONTHS.indexOf(m) + 1)).slice(-2), dd = ('0' + d).slice(-2);
        var inp = one('input.el-input__inner', pick.parentElement);
        if (inp) inp.value = /\d{2}:\d{2}:\d{2}/.test(inp.value) ? y + '-' + mm + '-' + dd + ' ' + inp.value.split(' ')[1] : y + '-' + mm + '-' + dd;
        var lab = one('.label span', pick);
        if (lab) lab.textContent = m + ' ' + d + ', ' + y;
        // with time (has-time): the panel's own date field follows, OK closes
        var own = one('.el-date-picker__time-header .el-date-picker__editor-wrap input', pop);
        if (own) own.value = y + '-' + mm + '-' + dd;
      }
      if (!one('.el-date-picker.has-time', pop)) closeDatePickers();
    }
  }, {
    // has-time footer: Now picks today (the captured today cell) and closes; OK closes.
    label: 'date-picker-footer',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.el-picker__popper[data-snap-open] .el-picker-panel__footer button'); },
    apply: function (el) {
      var pop = closestTo(el, '.el-picker__popper');
      if (/^Now$/.test(text(closestTo(el, 'button')))) {
        var today = one('td.today', pop);
        if (today) today.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        closeDatePickers();
        return;
      }
      closeDatePickers();
    }
  }, {
    label: 'date-picker-nav',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.el-picker__popper[data-snap-open] .el-date-picker__header button, .el-picker__popper[data-snap-open] .el-date-picker__header-label'); },
    apply: function () { miss('date-picker-month', 'another month or the year view: only the captured month was parked'); }
  }, {
    label: 'date-picker-close',
    event: 'click',
    order: 'last',
    match: function (el) { return !!one('.el-picker__popper[data-snap-open]') && !closestTo(el, '.el-picker__popper, .aioseo-datepicker-picker'); },
    apply: function () { closeDatePickers(); }
  }, {
    label: 'date-picker-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && !!one('.el-picker__popper[data-snap-open]'); },
    apply: function () { closeDatePickers(); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Phone country list ────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/vendor-phone.a91a4be4.js:1 @verified 2026-10-01 @product aioseo
  // vendor-phone.a91a4be4.js:1 @144920, vue-tel-input: the flag button (`.vti__dropdown`) toggles
  // `ul.vti__dropdown-list` inside it (class `open` on the dropdown); a
  // country sets the flag in `.vti__selection` and closes it; the search box
  // filters by name or dial code; Escape or a click outside closes it. Parked
  // open per input (phone-<j>, j = index among every `.vti__dropdown`).
  function closePhone() {
    all('.vti__dropdown.open[data-snap-open]').forEach(function (d) {
      d.classList.remove('open');
      d.removeAttribute('data-snap-open');
      var ul = one(':scope > ul.vti__dropdown-list', d);
      if (ul) ul.remove();
    });
  }
  R.register([{
    label: 'phone-country-open',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.vti__dropdown') && !closestTo(el, 'ul.vti__dropdown-list'); },
    apply: function (el, evt) {
      if (evt) evt.__snapHandled = true;
      var dd = closestTo(el, '.vti__dropdown');
      if (dd.hasAttribute('data-snap-open')) { closePhone(); return; }
      closePhone();
      var tp = one('template[data-snap-fragment="phone-' + all('.vti__dropdown').indexOf(dd) + '"]');
      if (!tp) { miss('phone-country', 'the phone country list was not parked for this field'); return; }
      dd.appendChild(tp.content.firstElementChild.cloneNode(true));
      dd.classList.add('open');
      dd.setAttribute('data-snap-open', '');
    }
  }, {
    label: 'phone-country-pick',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.vti__dropdown[data-snap-open] li.vti__dropdown-item'); },
    apply: function (el) {
      var li = closestTo(el, 'li.vti__dropdown-item');
      var dd = closestTo(li, '.vti__dropdown');
      var code = (one('.vti__flag', li).className.match(/vti__flag\s+(\w+)/) || [])[1];
      var flag = one('.vti__selection .vti__flag', dd);
      if (flag && code) flag.className = 'vti__flag ' + code;
      closePhone();
    }
  }, {
    label: 'phone-country-search',
    event: 'input',
    match: function (el) { return !!closestTo(el, '.vti__dropdown[data-snap-open] .vti__search_box'); },
    apply: function (el) {
      var q = String(el.value || '').toLowerCase().replace(/^\+/, '');
      all('li.vti__dropdown-item', closestTo(el, 'ul')).forEach(function (li) {
        li.style.display = !q || text(li).toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      });
    }
  }, {
    label: 'phone-country-close',
    event: 'click',
    order: 'last',
    match: function (el) { return !!one('.vti__dropdown[data-snap-open]') && !closestTo(el, '.vti__dropdown'); },
    apply: function () { closePhone(); }
  }, {
    label: 'phone-country-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && !!one('.vti__dropdown[data-snap-open]'); },
    apply: function () { closePhone(); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Dropdown open and pick ────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Select.9ecb0593.js:1 @verified 2026-10-01 @product aioseo
  // Select.9ecb0593.js:1 is vue-multiselect: a click activates it
  // (`multiselect--active`, aria-expanded) and renders
  // `.multiselect__content-wrapper` with one `.multiselect__option` per option
  // (the selected one `--selected`); a pick sets the value, whose label shows
  // in `.multiselect__single`, and closes it; a click outside or Escape closes
  // it. The options list is the capture's own, parked open per dropdown
  // (<template data-snap-fragment="ms-<i>">, i = the dropdown's index among
  // every .multiselect). A pick that changes other fields is in DROPDOWN_PICKS.
  function openMs() { return one('.multiselect.multiselect--active'); }
  function closeMs(except) {
    all('.multiselect.multiselect--active').forEach(function (m) {
      if (m === except) return;
      m.classList.remove('multiselect--active', 'multiselect--above');
      m.setAttribute('aria-expanded', 'false');
      var w = one(':scope > .multiselect__content-wrapper[data-snap-parked]', m);
      if (w) w.parentNode.removeChild(w);
    });
  }
  // Pick → other fields. `run(ms, label)` returns true (mirrored), a string
  // (miss note: the pick is undone) or { hop } (a captured state).
  var DROPDOWN_PICKS = [];
  // Redirects › Add New Redirect › Redirect Type: 410 Content Deleted and 451
  // Unavailable for Legal Reasons drop the Target URL field
  // (Index.0ac4cdc8.js:1 "Redirect Type"); the capture parked the card with
  // 410 picked (pick-redirect-type-410). Any other type keeps the form.
  DROPDOWN_PICKS.push({
    when: function (m) { return !!closestTo(m, '.aioseo-add-redirection') && /^\d{3}\b/.test(text(one('.multiselect__single', m))); },
    run: function (m, label) {
      var card = closestTo(m, '.aioseo-card') || closestTo(m, '.aioseo-add-redirection');
      var gone = /^(410|451)\b/.test(label);
      if (gone) {
        var tp = one('template[data-snap-fragment="pick-redirect-type-410"]');
        if (!tp || !/^410\b/.test(label)) return label + ': the form without Target URL was not captured';
        if (card._snapOrig == null) card._snapOrig = card.innerHTML;
        card.innerHTML = tp.innerHTML;
        return 'swapped';
      }
      if (card._snapOrig != null) { card.innerHTML = card._snapOrig; card._snapOrig = null; }
      return true;
    }
  });
  R.register([{
    label: 'dropdown-open',
    event: 'click',
    match: function (el) { var m = closestTo(el, '.multiselect'); return !!m && !closestTo(el, '.multiselect__content-wrapper'); },
    apply: function (el) {
      var m = closestTo(el, '.multiselect');
      if (m.classList.contains('multiselect--disabled')) { console.info('[snap] no-op: disabled dropdown'); return; }
      if (m.classList.contains('multiselect--active')) { closeMs(); return; }
      var i = all('.multiselect').indexOf(m);
      var tp = one('template[data-snap-fragment="ms-' + i + '"]');
      if (!tp || !tp.content.firstElementChild) { miss('dropdown:' + i, 'dropdown "' + text(one('.multiselect__single, .multiselect__placeholder', m)) + '": its options were not parked in this capture'); return; }
      closeMs(m);
      var w = tp.content.firstElementChild.cloneNode(true);
      w.classList.remove('multiselect-enter-active', 'multiselect-enter-to', 'multiselect-leave-active', 'multiselect-leave-to');
      w.setAttribute('data-snap-parked', '');
      var cur = text(one('.multiselect__single', m));
      all('.multiselect__option', w).forEach(function (o) {
        var sel = text(o) === cur;
        o.classList.toggle('multiselect__option--selected', sel);
        o.classList.toggle('multiselect__option--highlight', sel);
        var li = closestTo(o, 'li');
        if (li) li.setAttribute('aria-selected', sel ? 'true' : 'false');
      });
      m.appendChild(w);
      m.classList.add('multiselect--active');
      m.setAttribute('aria-expanded', 'true');
    }
  }, {
    label: 'dropdown-pick',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.multiselect__content-wrapper[data-snap-parked] .multiselect__option'); },
    apply: function (el) {
      var o = closestTo(el, '.multiselect__option');
      var m = closestTo(o, '.multiselect');
      var label = text(o);
      var rule = null;
      DROPDOWN_PICKS.some(function (r) { if (r.when(m)) { rule = r; return true; } return false; });
      var res = rule ? rule.run(m, label) : true;
      closeMs();
      if (res && res.hop) { hop(res.hop, res.hop + ' not captured yet'); return; }
      if (res === 'swapped') return;   // the parked render already shows the pick
      if (res !== true) { miss('dropdown-pick:' + label, res); return; }
      var single = one('.multiselect__single', m);
      if (single) single.textContent = label;
    },
    state: function (el) { return { key: 'dropdown', value: text(closestTo(el, '.multiselect__option')) }; }
  }, {
    label: 'dropdown-close',
    event: 'click',
    order: 'last',
    match: function (el) { return !!openMs() && !closestTo(el, '.multiselect, a[href]'); },
    apply: function () { closeMs(); }
  }, {
    label: 'dropdown-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && !!openMs(); },
    apply: function () { closeMs(); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Analysis result rows ──────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/iphone-frame.d6b8db90.js:1 @verified 2026-10-01 @product aioseo
  // iphone-frame.d6b8db90.js:1 @1253 SeoSiteAnalysisResult (and
  // SeoSiteAudit.9d8f61d8.js:1 @7751 SiteAuditIssueRow): `.result-toggle`
  // emits toggleActive; the list keeps one row active, whose toggle gets
  // `active` and whose TransitionSlide opens `.result-body` (500 ms). The
  // bodies are the capture's own, parked per row (result-<key>-<i>, key = the
  // card-tab strip and tab it sits under, or `page`).
  function resultKey(row) {
    var strips = cardStrips();
    for (var s = strips.length - 1; s >= 0; s--) {
      var host = strips[s].parentElement;
      if (host && host.contains(row)) {
        var n = all('.var-tab', strips[s]).findIndex(function (t) { return t.classList.contains('var-tab--active'); });
        return { key: s + '-' + n, scope: host };
      }
    }
    return { key: 'page', scope: document };
  }
  var RESULT_ROW = '.aioseo-seo-site-analysis-result, .aioseo-seo-site-analysis-issues-item';
  R.register([{
    label: 'analysis-result-toggle',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.result-toggle') && !!closestTo(el, RESULT_ROW); },
    apply: function (el) {
      var row = closestTo(el, RESULT_ROW);
      var head = one(':scope > .result-header, :scope > .aioseo-seo-site-analysis-issues-item__header', row);
      var box = head ? head.nextElementSibling : null;
      var k = resultKey(row);
      var i = all(RESULT_ROW, k.scope).indexOf(row);
      var toggle = one('.result-toggle', head);
      var opening = !toggle.classList.contains('active');
      if (opening && box && !box.children.length && !box._snapKids) {
        var tp = one('template[data-snap-fragment="result-' + k.key + '-' + i + '"]');
        if (!tp) { miss('result:' + k.key + '-' + i, 'result details for "' + text(one('.result-content, .aioseo-seo-site-analysis-issues-item__content', row)) + '" were not parked in this capture'); return; }
        box.appendChild(tp.content.cloneNode(true));
      }
      // One active row: close the others in the same list.
      all(RESULT_ROW, k.scope).forEach(function (other) {
        if (other === row) return;
        var t = one('.result-toggle.active', other);
        if (!t) return;
        t.classList.remove('active');
        var h = one(':scope > .result-header, :scope > .aioseo-seo-site-analysis-issues-item__header', other);
        if (h && h.nextElementSibling) slide(h.nextElementSibling, false);
      });
      toggle.classList.toggle('active', opening);
      if (box) slide(box, opening);
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Content Optimization sub-tabs ─────────────────────────────────────────
  // @since 2026-10-02 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Analysis.f8f9b955.js:1 @verified 2026-10-02 @product aioseo
  // Analysis.f8f9b955.js:1 @69946: the Content Optimization card's tab row
  // (button.aioseo-content-analysis-tab: Keywords, Basics, Spelling,
  // Readability, Headline) renders one panel under .content-analysis-panels
  // with v-if, so only the captured tab's panel exists. The capture parked the
  // others (catab-<c>-<n>, c = the strip's index among every
  // .aioseo-content-analysis-tabs, n = the tab); a click swaps it in and moves
  // `active`, Keywords puts the captured panel back.
  R.register([{
    label: 'content-analysis-tab',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-content-analysis-tabs button.aioseo-content-analysis-tab'); },
    apply: function (el) {
      var tab = closestTo(el, 'button.aioseo-content-analysis-tab');
      var strip = closestTo(tab, '.aioseo-content-analysis-tabs');
      var tabs = all('button.aioseo-content-analysis-tab', strip);
      var n = tabs.indexOf(tab);
      var label = text(one('.aioseo-content-analysis-tab__label', tab) || tab);
      if (tab.classList.contains('active')) { console.info('[snap] no-op: "' + label + '" is already selected'); return; }
      var panels = strip.nextElementSibling;
      if (!panels || !panels.classList.contains('content-analysis-panels')) { miss('content-analysis:' + label, 'the panels box was not found'); return; }
      if (strip._snapOrig == null) {
        strip._snapOrig = panels.innerHTML;
        strip._snapTab0 = tabs.findIndex(function (t) { return t.classList.contains('active'); });
      }
      var html = null;
      if (n === strip._snapTab0) html = strip._snapOrig;
      else {
        // Inside a swapped-in card tab (e.g. the editor pane's Optimization
        // tab) the park carries that state: catab-<c>-<n>@<s>-<t>.
        var key = 'catab-' + all('.aioseo-content-analysis-tabs').indexOf(strip) + '-' + n, q = '';
        cardStrips().forEach(function (st, s) {
          if (!st.parentElement || !st.parentElement.contains(strip)) return;
          var t = all('.var-tab', st).findIndex(function (x) { return x.classList.contains('var-tab--active'); });
          if (TAB0[s] != null && TAB0[s] !== t) q = '@' + s + '-' + t;
        });
        var tp = (q && one('template[data-snap-fragment="' + key + q + '"]')) || one('template[data-snap-fragment="' + key + '"]');
        if (tp) html = tp.innerHTML;
      }
      if (html == null) { miss('content-analysis:' + label, 'the "' + label + '" panel was not parked in this capture'); return; }
      panels.innerHTML = html;
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
    },
    state: function (el) { return { key: 'content-analysis-tab', value: text(closestTo(el, 'button.aioseo-content-analysis-tab')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Display block / shortcode / widget / PHP ──────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Index.0cc8c47a.js:1 @verified 2026-10-01 @product aioseo
  // Index.0cc8c47a.js:1 @8544-8974 (the "Display … Info" rows, Local SEO,
  // HTML sitemap, Author SEO): a BaseBoxToggle of options (`currentItem`) over
  // one TransitionSlide per option, active only for the current one — so only
  // its content is in a capture. The others are parked by the capture
  // (<template data-snap-fragment="slide-<g>-<n>">, g = the slider's index
  // among every .aioseo-ui-element-slider, n = the option). A change slides the
  // old one shut and the new one open (Slide.ece0f7c8.js, 500 ms).
  R.register([{
    label: 'display-slider-change',
    event: 'change',
    match: function (el) { return !!el && el.tagName === 'INPUT' && el.name === 'ui-element-slider' && !!closestTo(el, '.aioseo-ui-element-slider'); },
    apply: function (el) {
      var root = closestTo(el, '.aioseo-ui-element-slider');
      var g = all('.aioseo-ui-element-slider').indexOf(root);
      var radios = all('input[name="ui-element-slider"]', root);
      var n = radios.indexOf(el);
      var slides = all('.ui-element-slider-content > div', root);
      var next = slides[n];
      var cur = slides.filter(function (s) { return s.getAttribute('aria-expanded') === 'true'; })[0];
      if (!next || next === cur) return;
      if (!next.children.length && !next._snapKids) {
        var tp = one('template[data-snap-fragment="slide-' + g + '-' + n + '"]');
        if (!tp) {
          var prev = cur ? radios[slides.indexOf(cur)] : null;
          if (prev) prev.checked = true;
          miss('slide:' + g + '-' + n, '"' + text(closestTo(el, 'div').querySelector('label') || el) + '" instructions were not parked in this capture');
          return;
        }
        next.appendChild(tp.content.cloneNode(true));
      }
      if (cur) slide(cur, false);
      slide(next, true);
    },
    state: function (el) { return { key: 'display-slider', value: text((closestTo(el, 'div') || el).querySelector('label')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Title separator ───────────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/SettingsSeparator.64a56937.js:1 @verified 2026-09-30 @product aioseo
  // SettingsSeparator.64a56937.js:1: setSeparator(e) emits update:separator;
  // the clicked `.separator` becomes `active`. When the saved separator was
  // one of the "more" separators (captured: "-"), a leading column shows it
  // (`hiddenSeparator`, key 0) and the Show More column is xs 3; picking a
  // listed one drops that column and the Show More column becomes xs 4.
  // The previews read it back: GlobalSettings.9dac789f.js:2 @13234 titles the
  // Title Separator preview `#site_title <separator> #tagline`, and the Home
  // Page preview parses its #separator_sa tag.
  // Show More (@1100): renders the extra separators and a custom field, and
  // saves toggledRadio — not captured, a logged miss.
  R.register([{
    label: 'title-separator-pick',
    event: 'click',
    match: function (el) {
      var s = closestTo(el, '.aioseo-separators .separator');
      return !!s && !s.classList.contains('active');
    },
    apply: function (el) {
      var pick = closestTo(el, '.aioseo-separators .separator');
      var grid = closestTo(pick, '.aioseo-separators');
      var oldSep = text(one('.separator.active', grid));
      var cols = all(':scope > .aioseo-col', grid);
      // The hidden-separator column is first and its separator has no sibling
      // in the listed set: the plugin renders it only while it is the saved one.
      var lead = cols[0] && one('.separator.active', cols[0]) && cols.length > 9 ? cols[0] : null;
      all('.separator', grid).forEach(function (s) { s.classList.toggle('active', s === pick); });
      if (lead && lead !== closestTo(pick, '.aioseo-col')) {
        takeOut('separator-lead', [lead]);
        var more = one(':scope > .aioseo-col .show-more', grid);
        var mc = more && closestTo(more, '.aioseo-col');
        if (mc) { mc.classList.remove('col-xs-3'); mc.classList.add('col-xs-4'); }
      }
      var newSep = text(pick);
      if (!oldSep || oldSep === newSep) return;
      var esc = oldSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('(^|\\s)' + esc + '(?=\\s|$)', 'g');
      all('.aioseo-google-search-preview__title').forEach(function (t) {
        t.textContent = t.textContent.replace(re, function (m, pre) { return pre + newSep; });
      });
    },
    state: function (el) { return { key: 'separator', value: text(closestTo(el, '.aioseo-separators .separator')) }; }
  }, {
    // Show More / Show Less (@1100: showMoreSeparators, v-if on the extra
    // separators, the custom field and the Show Less link; the live plugin
    // also saves toggledRadio, dropped here). Captured open on Global
    // Settings as --more-separators (QC round 1) and on Breadcrumbs (round 3).
    label: 'title-separator-show-more',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-separators .show-more'); },
    apply: function (el) {
      var less = /Show Less/.test(text(closestTo(el, '.show-more')));
      var base = slug().replace(/--more-separators$/, '');
      if (!less && slug() === base && captured(base + '--more-separators')) { hop(base + '--more-separators'); return; }
      if (less && slug() !== base) { hop(base); return; }
      miss('state:separators-show-more', 'Show More / Less: not captured on this screen (Global Settings and Breadcrumbs only)');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Feature Manager search ────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/FeatureManager.30aeb9b6.js:1 @verified 2026-09-30 @product aioseo
  // FeatureManager.30aeb9b6.js:1 @5896 getAddons: `addons.filter(a => !search
  // || a.name.toLowerCase().includes(search.toLowerCase()))`, rendered with
  // v-for (@10078), so a card that does not match is not in the page. The
  // card's name is its header text (the `title` slot, `feature.name`).
  R.register([{
    label: 'feature-manager-search',
    event: 'input',
    match: function (el) { return !!closestTo(el, '.aioseo-feature-manager-header .search input'); },
    apply: function (el) {
      var q = String(el.value || '').toLowerCase();
      // Put every card back first (in place), then take out the ones that miss.
      Object.keys(STASH).forEach(function (k) { if (k.indexOf('feature:') === 0) putBack(k); });
      all('.aioseo-feature-manager-addons .aioseo-feature-card').forEach(function (card, i) {
        var name = text(one('.feature-card-header', card)).toLowerCase();
        if (q && name.indexOf(q) === -1) takeOut('feature:' + name, [closestTo(card, '.aioseo-col') || card]);
      });
    },
    state: function (el) { return { key: 'feature-search', value: el.value }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Explore Sample Reports ────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/ConnectCta.1553fcd9.js:1 @verified 2026-09-30 @product aioseo
  // ConnectCta.1553fcd9.js:1 @1038 onCtaSecondButtonClick: showSampleReports —
  // a store flag (no REST): the blur and the CTA go and the sample-data alert
  // shows. Captured as `<screen>--sample` (p1/p2-search-statistics.json).
  R.register([{
    label: 'search-statistics-sample',
    event: 'click',
    match: function (el) {
      var b = closestTo(el, 'button.aioseo-button, .aioseo-button');
      return !!b && text(b).indexOf('Explore Sample Reports') === 0 && baseOf(slug()).indexOf('admin-search-statistics-') === 0;
    },
    apply: function () { hop(baseOf(slug()) + '--sample', 'sample reports for this screen not captured yet'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Captured row, sort, pager and editor states (QC round 3) ──────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/WpTable.13b58250.js:1 @verified 2026-10-01 @product aioseo
  // Each control below re-renders its table or card in a way a capture took
  // as its own state (plan p5, round 3); the click hands off to it.
  //   Add-row buttons push one empty row into the card's list (Index.0ac4cdc8.js:1
  //     full-site / HTTP headers, AuthorSeo, RobotsEditor, SeoAlerts, Advanced
  //     email reports, the profile's Author SEO, the Optimization pane), and the
  //     Redirects form's "add extra source URLs" / "Add Custom Rules" links.
  //   Sortable headers and the pager re-query the rows (WpTable.13b58250.js:1;
  //     processSort / processPagination). One click on a column sorts it the
  //     other way from the direction its header class names.
  //   A row's Edit (and the Redirects / Additional Pages URL link) opens that
  //     row's inline editor (Index.0ac4cdc8.js:1, AdditionalPages.e5617a61.js:1
  //     @17407 editRow); the first row was captured.
  // A state the capture did not take keeps the existing logged miss.
  var ADD_ROW = {
    'admin-redirects-full-site-redirect': { 'Add Aliased Domain': '--add-alias' },
    'admin-redirects-http-headers': { 'Add Header': '--add-header', 'Add Security Presets': '--security-presets', 'Add CORS Presets': '--cors-presets' },
    'admin-search-appearance-author-seo': { 'Add Item': '--add-item' },
    'admin-tools-robots-editor': { 'Add Rule': '--add-rule' },
    'admin-tools-seo-alerts': { 'Add Email Address': '--add-email' },
    'admin-settings-advanced--email-reports': { 'Add Email Address': '-add-email' },
    'admin-profile-aioseo': { 'Add Item': '--add-item' },
    'editor-post-pane-optimization': { 'Add Keyword': '--add-keyword' },
    'admin-redirects': { 'add extra source URLs.': '--extra-source', 'Add Custom Rules': '--custom-rules' }
  };
  var ROW_EDIT = { 'admin-redirects': '--row-edit', 'admin-sitemaps-general-sitemap': '--page-edit' };
  function sortBase(s) { return s.replace(/(--|-)sort-[a-z0-9-]+$/, ''); }
  function colKey(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function firstRow(el) {
    var tr = closestTo(el, 'tr');
    var tb = tr && tr.parentElement;
    return !!tb && all(':scope > tr', tb).filter(function (r) { return !r.classList.contains('hidden') && !/expand|inner/.test(r.className); })[0] === tr;
  }
  function r3Target(el) {
    var s = slug();
    var b = closestTo(el, 'button, .aioseo-button, a');
    var t = b ? text(b) : '';
    if (b && ADD_ROW[s] && ADD_ROW[s][t]) return s + ADD_ROW[s][t];
    // ImageUploader.4ed9611d.js:1 openUploadModal → wp.media (the library modal);
    // its close (or the backdrop) returns to the screen.
    if (b && /^Upload or Select Image$/.test(t) && captured(s + '--media-modal')) return s + '--media-modal';
    if (/--media-modal$/.test(s) && closestTo(el, '.media-modal-close, .media-modal-backdrop')) return s.replace(/--media-modal$/, '');
    var th = closestTo(el, 'th.sortable a, th.sorted a');
    if (th && closestTo(el, '.aioseo-wp-table, .aioseo-table, .aioseo-app')) {
      var cell = closestTo(th, 'th');
      var dir = cell.classList.contains('asc') ? 'desc' : 'asc';
      var base = sortBase(s), col = colKey(text(th));
      var c = [base + '--sort-' + col + '-' + dir, base + '-sort-' + col + '-' + dir];
      if (dir === 'desc') c.push(base + '--sort-' + col);   // the round-2 checklist names
      return c.filter(function (x) { return x !== s && captured(x); })[0] || null;
    }
    var pg = closestTo(el, '.tablenav-pages a, .tablenav-pages button');
    if (pg) {
      var fwd = /next|last/.test(pg.className) || /^[›»]$/.test(text(pg));
      var p2 = s.replace(/--page-2$/, '') + '--page-2';
      if (fwd && s !== p2 && captured(p2)) return p2;
      if (!fwd && s === p2) return s.replace(/--page-2$/, '');
      return null;
    }
    // Logs › "Additional Info" (Main.53c80ac1.js:1 @55025 showInfo(row)): the
    // row's info modal, captured for the first row of each log; the trash
    // icon beside it (maybeDeleteLog) deletes on the live site.
    var info = closestTo(el, 'td.actions svg.log-info, td.actions svg.remove-log, td.actions svg.remove-404');
    if (info && /^admin-redirects-logs(--404)?$/.test(s)) {
      if (!info.classList.contains('log-info')) return 'LIVE:Delete log: deletes the log entry on the live site (saves); not mirrored';
      var to = s + (s === 'admin-redirects-logs' ? '--info' : '-info');
      if (!firstRow(info)) return 'MISS:the Additional Info modal was captured for the first row only';
      return captured(to) ? to : 'MISS:the Additional Info modal was not captured yet';
    }
    if (/^admin-redirects-logs(--info|--404-info)$/.test(s) && closestTo(el, '.aioseo-redirects-logs-modal .modal-header button.close, .aioseo-redirects-logs-modal .modal-mask')) return s.replace(/-?-info$/, '');
    // Redirects views (subsubsub) and the group filter + Filter re-query the
    // rows (WpTable.13b58250.js:1 processFilterTable / processAdditionalFilters).
    if (/^admin-redirects(--view-(enabled|disabled)|--group-(manual|modified|404))?$/.test(s)) {
      var view = closestTo(el, 'ul.subsubsub a');
      if (view) {
        var vt = text(view).replace(/\s*\(\d+\)\s*$/, '');
        var vto = vt === 'All' ? 'admin-redirects' : 'admin-redirects--view-' + vt.toLowerCase();
        return vto !== s && captured(vto) ? vto : null;
      }
      if (b && t === 'Filter') {
        var sel = one('select[name="group"]');
        var g = sel ? sel.options[sel.selectedIndex].text : 'All Groups';
        var gto = { 'All Groups': 'admin-redirects', 'Manual Redirects': 'admin-redirects--group-manual', 'Modified Posts': 'admin-redirects--group-modified', '404 Redirects': 'admin-redirects--group-404' }[g];
        if (gto === s) return 'LOG:the list already shows "' + g + '"';
        return gto && captured(gto) ? gto : null;
      }
    }
    // A 404 row's "Add Redirect" opens the add form for that URL (no save until
    // its own Add Redirect); captured for the first row.
    var add404 = closestTo(el, 'tbody tr a.add-redirect');
    if (add404 && s === 'admin-redirects-logs--404') return firstRow(add404) && captured(s + '-add-redirect') ? s + '-add-redirect' : 'MISS:the add form was captured for the first 404 row only';
    var edit = closestTo(el, '.row-actions a, a.edit-link, .manage-column.url a.post-title[href="#"]');
    if (edit && ROW_EDIT[s] && (closestTo(el, 'a.edit-link, a.post-title') || /^Edit$/.test(text(edit))) && firstRow(edit) && captured(s + ROW_EDIT[s])) return s + ROW_EDIT[s];
    return null;
  }
  R.register([{
    // Escape closes the logs info modal (the BaseModal keydown) back to its log.
    label: 'logs-info-modal-escape',
    event: 'keydown',
    match: function (el, evt) { return !!evt && evt.key === 'Escape' && /^admin-redirects-logs(--info|--404-info)$/.test(slug()); },
    apply: function () { hop(slug().replace(/-?-info$/, '')); }
  }, {
    label: 'round3-captured-state',
    event: 'click',
    match: function (el) { return !!r3Target(el); },
    apply: function (el, evt) {
      var to = r3Target(el);
      if (evt) evt.__snapHandled = true;
      if (to.indexOf('MISS:') === 0) { miss('state:' + slug() + ':first-row', to.slice(5)); return; }
      if (to.indexOf('LIVE:') === 0) { miss('button:' + to.slice(5).split(':')[0], to.slice(5)); return; }
      if (to.indexOf('LOG:') === 0) { console.info('[snap] no-op: ' + to.slice(4)); return; }
      hop(to);
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Buttons that save or call out ─────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/app-core.2e1fbbab.js:5 @verified 2026-09-30 @product aioseo
  // app-core.2e1fbbab.js:5 (REST "options", "redirects", "plugins/install",
  // "notifications/dismiss", "analyze", "search-statistics/url/auth"): these
  // write to the site, install plugins, send mail or call aioseo.com / Google
  // (interactions.md §H). The snapshot does nothing and says why, so a film
  // author sees the click was heard.
  var NEVER = [
    [/^Save Changes$/, 'Save Changes: POST aioseo/v1/options saves every option'],
    [/^(Activate|Deactivate) All Features$/, 'installs / deactivates every addon (H12)'],
    [/^Add Redirect$/, 'Add Redirect: POST redirects saves'],
    [/^Connect to Google Search Console/, 'Connect: persists a trust token, then OAuth (H15)'],
    [/^Refresh Results$/, 'Refresh Results: POST analyze → analyze.aioseo.com (H1)'],
    [/^(Deactivate|Activate)$/, 'licence activate / deactivate → licensing.aioseo.com'],
    [/^Enable Email Reports$/, 'turns Email Reports on (saves)'],
    [/^Dismiss( All)?$/, 'POST notifications/dismiss saves'],
    [/^(Fix|Ignore)$/, 'Site Audit Fix opens the editor; Ignore saves'],
    [/^Add Focus Keyword$/, 'POST seo-analysis/objects/{id}/keywords saves'],
    [/^Import from CSV$/, 'opens the file picker modal (not captured)'],
    [/^Add Page$/, 'adds an Additional Pages row (not captured)'],
    [/^Upload or Select Image$/, 'opens the WordPress media modal (not captured)'],
    [/^Save$/, 'inline SEO Save: POST posts-list/update-details-column saves'],
    [/^Update$/, 'Quick Edit Update saves the post and its robots fields'],
    [/^Reset Selected Settings to Default$/, 'opens the reset confirm (not captured); its Yes resets settings (H11)'],
    // QC round 2: every other button or action link that writes, sends or calls out.
    [/^(Delete|Delete All Links|Delete Permanently|Trash|Remove|Delete Selected)$/, 'deletes on the live site (saves); not mirrored'],
    [/^Apply$/, 'bulk action runs on the live site (saves); not mirrored'],
    [/^(Clear|Clear 404 Logs|Clear Redirect Logs|Clear Logs)$/, 'clears logs on the live site (saves); not mirrored'],
    [/^Analyze$/, 'Analyze: POST analyze (analyze.aioseo.com) or analyze-headline, which saves; live only'],
    [/^(Create a Free Account|Connect to an Existing Account|Connect|Reconnect|Disconnect)$/, 'connects an outside account (OAuth / login); live only'],
    [/^(Export|Export Settings|Export Content|Export Redirects|Download|Download System Info File)$/, 'builds a download on the live site; live only'],
    [/^(Import|Import Settings|Import Redirects|Restore|Create Backup)$/, 'imports or restores on the live site (saves); live only'],
    [/^(Send Test Email|Send Test Message|Submit)$/, 'sends mail or a message from the live site; live only'],
    [/^(Generate|Regenerate API Key|Install|Install Free Plugin|Activate Plugin|Upgrade to Pro)/, 'installs, generates or calls out on the live site; live only'],
    [/^Test$/, 'Test: a loopback request to the live site; live only'],
    // Rows the capture never held.
    [/^(Add Security Presets|Add CORS Presets|Add Header|Add Aliased Domain|Add Item|Add Rule|Add Email Address|Add Location|Add Keyword|Add Keywords)$/, 'adds a row the capture never held; not captured'],
    [/^Filter$/, 'Filter: the filtered list was not captured']
  ];
  R.register([{
    label: 'live-only-button',
    event: 'click',
    order: 'last',
    match: function (el, evt) {
      if (evt && evt.__snapHandled) return false;
      var b = closestTo(el, 'button, .aioseo-button, input[type="submit"], a[href="#"], a.submitdelete, a.delete, a.delete-all-links');
      if (!b || !closestTo(b, '[class*="aioseo"], [id*="aioseo"], .inline-edit-row')) return false;
      var t = text(b) || String(b.value || '');
      return NEVER.some(function (n) { return n[0].test(t); });
    },
    apply: function (el) {
      var b = closestTo(el, 'button, .aioseo-button, input[type="submit"], a[href="#"], a.submitdelete, a.delete, a.delete-all-links');
      var t = text(b) || String(b.value || '');
      var note = 'live only';
      NEVER.some(function (n) { if (n[0].test(t)) { note = n[1]; return true; } return false; });
      miss('button:' + t, note);
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─── frontend SEO Preview (seo-preview.d466478e.js) ──────────────────────
  // The modal lives in an open shadow root (`.aioseo-seo-preview-shadow-wrapper`,
  // teleported to its #aioseo-modal-portal, @19301). A click inside it reaches
  // the document retargeted to the host, so these entries read the real
  // target from the event's composed path.
  function inner(el, evt) {
    try { var p = evt && evt.composedPath ? evt.composedPath() : null; if (p && p[0] && p[0].nodeType === 1) return p[0]; } catch (_) {}
    return el;
  }
  function previewRoot() {
    var h = one('.aioseo-seo-preview-shadow-wrapper');
    return h && h.shadowRoot ? h.shadowRoot : null;
  }

  // ─ SEO Preview device toggle ─────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/seo-preview.d466478e.js:1 @verified 2026-09-30 @product aioseo
  // seo-preview.d466478e.js:1 @22745: the two `a.btn-device` (href "#",
  // click.prevent) set `device`; it drives `btn-device--active`, the wrapper
  // class `tab<Tab>--<device>` (@22009), the wireframe's
  // `google-serp-wireframe-wrapper--<device>` (@8639), its snippet
  // placeholders — three on desktop, one on mobile (@9575) — and the preview's
  // `aioseo-google-search-preview--<device>` (GoogleSearchPreview.12357065.js:1 @4588).
  R.register([{
    label: 'seo-preview-device',
    event: 'click',
    match: function (el, evt) { return !!closestTo(inner(el, evt), '.device-toggle a.btn-device'); },
    apply: function (el, evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      var btn = closestTo(inner(el, evt), '.device-toggle a.btn-device');
      var root = previewRoot();
      if (!root) return;
      var btns = all('.device-toggle a.btn-device', root);
      var dev = btns.indexOf(btn) === 1 ? 'mobile' : 'desktop';
      btns.forEach(function (b, i) { b.classList.toggle('btn-device--active', (i === 1) === (dev === 'mobile')); });
      var swap = function (node, prefix) {
        if (!node) return;
        node.classList.remove(prefix + 'desktop', prefix + 'mobile');
        node.classList.add(prefix + dev);
      };
      var cw = one('.component-wrapper', root);
      var tab = cw && /\b(tab[A-Za-z]+)--(desktop|mobile)\b/.exec(cw.className);
      if (tab) swap(cw, tab[1] + '--');
      swap(one('.google-serp-wireframe-wrapper', root), 'google-serp-wireframe-wrapper--');
      swap(one('.aioseo-google-search-preview', root), 'aioseo-google-search-preview--');
      var snip = all('.google-serp-snippet-placeholder', root).filter(function (p) { return !closestTo(p.parentNode, '.google-serp-snippet-placeholder'); });
      vif('preview-snippets', snip.slice(1), dev === 'desktop');
    },
    state: function (el, evt) { var b = closestTo(inner(el, evt), 'a.btn-device'); return { key: 'preview-device', value: b && b.classList.contains('btn-device--active') }; }
  }, {
    // @22009: the view tabs (Google / Facebook / X / SEO Inspector) render one
    // component at a time; only the Google view was captured.
    label: 'seo-preview-view-tab',
    event: 'click',
    match: function (el, evt) { var t = closestTo(inner(el, evt), '.aioseo-tabs .var-tab'); return !!t && !!previewRoot() && previewRoot().contains(t); },
    apply: function (el, evt) {
      var t = closestTo(inner(el, evt), '.aioseo-tabs .var-tab');
      if (t.classList.contains('var-tab--active')) return;
      miss('tab:' + text(t), 'SEO Preview view "' + text(t) + '" was not captured');
    }
  }, {
    // @21587: the modal's close sets display = null and CoreModal renders
    // nothing; the admin bar's "SEO Preview" item opens it again.
    label: 'seo-preview-close',
    event: 'click',
    match: function (el, evt) { var root = previewRoot(); var t = inner(el, evt); return !!root && root.contains(t) && !!closestTo(t, '.modal-header button.close'); },
    apply: function () { var root = previewRoot(); vif('seo-preview-modal', [one('.aioseo-seo-preview-standalone', root)], false); }
  }, {
    label: 'seo-preview-open',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#wp-admin-bar-aioseo-seo-preview > a'); },
    apply: function () {
      if (STASH['seo-preview-modal']) { putBack('seo-preview-modal'); return; }
      if (!previewRoot()) miss('state:' + slug() + '--seo-preview', 'SEO Preview was captured on frontend-seo-preview only');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Setup Wizard next step ────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/app-core.2e1fbbab.js:5 @verified 2026-09-30 @product aioseo
  // app-core.2e1fbbab.js:5 @241932 SetupWizardStore.getNextLink: the stage
  // after currentStage in `stages`, else "success"; each step's Save and
  // Continue (e.g. AdditionalInformation.4af252ef.js:1 @3926) runs
  // saveWizard(stage) — POST wizard, H14, dropped here — then
  // `$router.push(getNextLink)`. Skip this Step pushes the same link. The
  // stages this site keeps are read off the captures' own Go Back links
  // (#/welcome ← category ← additional-information ← features ←
  // search-appearance ← search-console): import, smart-recommendations and
  // license-key are pruned here.
  var WIZARD = ['welcome', 'category', 'additional-information', 'features', 'search-appearance', 'search-console', 'success'];
  R.register([{
    label: 'wizard-next-step',
    event: 'click',
    match: function (el) {
      var b = closestTo(el, 'button.aioseo-button');
      return !!b && slug().indexOf('wizard-') === 0 && /^(Save and Continue|Skip this Step)/.test(text(b));
    },
    apply: function () {
      var i = WIZARD.indexOf(slug().replace(/^wizard-/, '').split('--')[0]);
      var next = i === -1 ? null : WIZARD[i + 1];
      if (!next) { miss('state:wizard-next', 'next wizard step unknown'); return; }
      hopUrl('index.php?page=aioseo-setup-wizard#/' + next, 'wizard step ' + next + ' not captured yet');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Webmaster Tools card ──────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/WebmasterTools.e5481c58.js:1 @verified 2026-09-30 @product aioseo
  // WebmasterTools.e5481c58.js:1 @49474 toggleActiveTool(l): the clicked tool
  // becomes activeTool, or null when it already was; its settings panel
  // renders in a TransitionSlide under that row (v-if). Google and IndexNow
  // were captured open (p2-settings.json, `.tool-toggle > div:has-text(…)`).
  var TOOLS = { 'Google Search Console': 'admin-settings-webmaster-tools--google', 'IndexNow': 'admin-settings-webmaster-tools--indexnow' };
  R.register([{
    label: 'webmaster-tool-toggle',
    event: 'click',
    match: function (el) { return baseOf(slug()) === 'admin-settings-webmaster-tools' && !!closestTo(el, '.webmaster-tools-toggles .tool-toggle > div'); },
    apply: function (el) {
      var name = text(closestTo(el, '.tool-toggle > div'));
      var open = slug() !== 'admin-settings-webmaster-tools' ? slug() : null;
      var target = TOOLS[name] || null;
      if (target && target === open) { hop('admin-settings-webmaster-tools'); return; }
      if (!target) { miss('state:webmaster-tools--' + name, name + ': its settings panel was not captured'); return; }
      hop(target);
    },
    state: function (el) { return { key: 'webmaster-tool', value: text(closestTo(el, '.tool-toggle > div')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─── hand-offs to captured states ────────────────────────────────────────
  // ─ State hand-offs ───────────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/LinksReport.04442f90.js:1 @verified 2026-09-30 @product aioseo
  // Controls whose result is a captured sibling, each taken by a capture
  // step with the same selector (products/aioseo/capture-plans/p2-*.json):
  //   Links Report row ▸ (`button.toggle-row-button`, first row) → the row's
  //     inner report (LinksReport.04442f90.js; REST links-report-inner/{id}, a read);
  //   Redirects source-URL gear (`.aioseo-redirect-source-url .aioseo-gear`) →
  //     Ignore Slash / Ignore Case / Regex (Index.0ac4cdc8.js:1 "Add Custom Rules");
  //   Posts list pencil on the vegetable-bed row → the inline SEO title editor
  //     (posts-table.4283abaa.js @5947).
  // (The Setup Wizard's "Let's Get Started" is a plain #/category link: the nav map owns it.)
  // Any other row or item is a logged miss.
  var HANDOFFS = [
    { from: ['admin-link-assistant-links-report'], sel: '.aioseo-link-assistant-links-report button.toggle-row-button', first: true,
      to: 'admin-link-assistant-links-report--expanded' },
    { from: ['admin-link-assistant-links-report--expanded'], sel: '.aioseo-link-assistant-links-report button.toggle-row-button', first: true,
      to: 'admin-link-assistant-links-report' },
    { from: ['editor-post-metabox-analysis'], sel: '#aioseo-post-settings-sidebar-vue button.aioseo-open-headline-analyzer, #aioseo-post-settings-sidebar-vue .aioseo-button.gray',
      text: /^Open Headline Analyzer/, to: 'editor-post-headline-analyzer' },
    { from: ['admin-redirects'], sel: '.aioseo-add-redirection .aioseo-redirect-source-url .aioseo-gear', to: 'admin-redirects--add-advanced' },
    { from: ['admin-redirects--add-advanced'], sel: '.aioseo-add-redirection .aioseo-redirect-source-url .aioseo-gear', to: 'admin-redirects' },
    { from: ['admin-edit-posts'], sel: '.aioseo-details-column .aioseo-details-column__field svg.aioseo-pencil', row: 'vegbed',
      to: 'admin-edit-posts--inline-edit' },
    // posts-table.4283abaa.js @4001: the inline editor's Cancel emits `cancel`
    // and the field shows its value again; Save POSTs posts-list/update-details-column (NEVER).
    { from: ['admin-edit-posts--inline-edit'], sel: '.aioseo-details-column .aioseo-button.gray', to: 'admin-edit-posts' },
    // WordPress core's Quick Edit (wp-admin/js/inline-edit-post.js:126 opens it,
    // :78 its Cancel reverts): captured open on the first row with AIOSEO's
    // robots fields (p2-lists.json, `#the-list tr .editinline`).
    { from: ['admin-edit-posts'], sel: '#the-list tr .editinline', first: true, to: 'admin-edit-posts--quickedit' },
    { from: ['admin-edit-posts--quickedit'], sel: '.inline-edit-row .cancel', to: 'admin-edit-posts' }
  ];
  // SEO Checklist (SeoChecklist.3d1e8616.js:1): "View Explanation" opens the
  // row's info panel in the table (@33845, w(B)); the Incomplete / Completed
  // links filter the table (`filter-completed`, the subsubsub list).
  HANDOFFS.push(
    { from: ['admin-settings-seo-checklist'], sel: 'ul.subsubsub li.completed a', to: 'admin-settings-seo-checklist--completed' },
    { from: ['admin-settings-seo-checklist--completed'], sel: 'ul.subsubsub li.incomplete a', to: 'admin-settings-seo-checklist' });
  // View / Hide Explanation per row (@33845): row n's panel is captured as
  // --explanation (n = 1) and --explanation-<n> (round 3). n is the link's
  // place among the card's "… Explanation" links, the same in every state.
  var SCX = 'admin-settings-seo-checklist';
  R.register([{
    label: 'checklist-explanation',
    event: 'click',
    match: function (el) {
      var a = closestTo(el, '.aioseo-card a.secondary-link');
      return !!a && /Explanation$/.test(text(a)) && (slug() === SCX || /^admin-settings-seo-checklist--explanation(-\d+)?$/.test(slug()));
    },
    apply: function (el) {
      var a = closestTo(el, '.aioseo-card a.secondary-link');
      if (/^Hide/.test(text(a))) { hop(SCX); return; }
      var n = all('.aioseo-card a.secondary-link').filter(function (x) { return /Explanation$/.test(text(x)); }).indexOf(a) + 1;
      var to = SCX + '--explanation' + (n > 1 ? '-' + n : '');
      if (captured(to)) hop(to);
      else miss('state:' + to, 'row ' + n + "'s explanation was not captured");
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // The vegetable-bed post: products/aioseo/seed (post.vegbed), 2466 in this capture.
  var VEGBED_ROW = 'post-2466';
  R.register([{
    label: 'state-handoff',
    event: 'click',
    match: function (el) {
      return HANDOFFS.some(function (h) { return on(h.from) && !!closestTo(el, h.sel); });
    },
    apply: function (el) {
      var h = null;
      HANDOFFS.some(function (x) { if (on(x.from) && closestTo(el, x.sel)) { h = x; return true; } return false; });
      var ctl = closestTo(el, h.sel);
      if (h.text && !h.text.test(text(ctl))) return;
      if (h.first && all(h.firstSel || h.sel)[0] !== ctl) { miss('state:' + h.to, 'only the first row was captured'); return; }
      if (h.row) {
        var tr = closestTo(ctl, 'tr');
        if (!tr || tr.id !== VEGBED_ROW) { miss('state:' + h.to, 'only the vegetable-bed row was captured'); return; }
      }
      hop(h.to, h.to + ' not captured yet');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ SEO Checklist action links ────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/SeoChecklist.3d1e8616.js:1 @verified 2026-10-01 @product aioseo
  // SeoChecklist.3d1e8616.js:1 @33064: an action with a url is a plain
  // `a.action-link` to that admin screen (a page load); one with a callback is
  // href "#" and runs it (Mark Complete saves: a live-only miss). The urls add
  // `aioseo-scroll` / `aioseo-highlight` (a scroll-and-flash on arrival, read
  // client-side) and a few pick a sub-state: `activetool=googleSearchConsole`
  // opens the Google card, `activetab=logs-404` the 404 tab. Those map to the
  // captured screen; the scroll flash itself is not reproduced.
  var CHECKLIST_STATE = [
    [/[?&]activetool=googleSearchConsole\b/, 'admin-settings-webmaster-tools--google'],
    [/[?&]activetab=logs-404\b/, 'admin-redirects-logs--404'],
    [/[?&]page=aioseo-setup-wizard\b/, 'wizard-welcome'],
    // Fix Posts → the Links Report's Orphaned Posts view (the orphaned-posts query)
    [/#\/links-report\?orphaned-posts=1\b/, 'admin-link-assistant-links-report--orphaned-posts']
  ];
  R.register([{
    label: 'seo-checklist-action-link',
    event: 'click',
    match: function (el) { var a = closestTo(el, '.aioseo-card a.action-link[href], .aioseo-card a.dismiss-link'); return !!a && baseOf(slug()) === 'admin-settings-seo-checklist'; },
    apply: function (el) {
      var link = closestTo(el, 'a.action-link, a.dismiss-link');
      var href = link.getAttribute('href');
      // A callback action (href "#"): Mark Complete / Dismiss save over REST.
      if (href === '#') { miss('button:' + text(link), text(link) + ': POST seo-checklist/* saves; not mirrored'); return; }
      for (var i = 0; i < CHECKLIST_STATE.length; i++) {
        if (CHECKLIST_STATE[i][0].test(href)) { hop(CHECKLIST_STATE[i][1]); return; }
      }
      var u = null;
      try { u = new URL(href, document.baseURI); } catch (_) { u = null; }
      if (!u) { miss(href, 'checklist action url unreadable'); return; }
      u.searchParams.delete('aioseo-scroll');
      u.searchParams.delete('aioseo-highlight');
      hopUrl(u.pathname.split('/').pop() + u.search + u.hash, 'checklist action target not captured');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Highlight style picker ────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/WritingAssistant.5974908e.js:1 @verified 2026-10-01 @product aioseo
  // WritingAssistant.5974908e.js:1 @9126: each style button sets
  // highlighterStyle; the chosen one carries `highlight-style-options__option--active`.
  R.register([{
    label: 'highlight-style-pick',
    event: 'click',
    match: function (el) { return !!closestTo(el, 'button.highlight-style-options__option'); },
    apply: function (el) {
      var b = closestTo(el, 'button.highlight-style-options__option');
      console.info('[snap] set: highlight style = ' + text(b));
      all('button.highlight-style-options__option', b.parentElement).forEach(function (x) {
        x.classList.toggle('highlight-style-options__option--active', x === b);
      });
    },
    state: function (el) { return { key: 'highlight-style', value: text(closestTo(el, 'button.highlight-style-options__option')) }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Link Assistant report links ───────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/LinksReport.04442f90.js:1 @verified 2026-10-01 @product aioseo
  // LinksReport.04442f90.js:1 @8729: the report reads its route query on
  // mount — fullReport → processFilterTable("all") (the default report),
  // linkingOpportunities → "linking-opportunities", orphaned-posts →
  // "orphaned-posts", postTitle → a search. The Overview cards link there
  // (Overview.1b2dc525.js "See a Full Links Report", "See All Linking
  // Opportunities"), and the report's own filter links run the same filters.
  // DomainsReport.f59506e1.js does the same with fullReport / hostname.
  var LA = 'admin-link-assistant-links-report';
  var LA_QUERY = [
    [/#\/links-report\?fullReport=1\b/, LA],
    [/#\/links-report\?linkingOpportunities=1\b/, LA + '--linking-opportunities'],
    [/#\/links-report\?orphaned-posts=1\b/, LA + '--orphaned-posts'],
    [/#\/domains-report\?fullReport=1\b/, 'admin-link-assistant-domains-report']
  ];
  var LA_FILTERS = { 'All': LA, 'Linking Opportunities': LA + '--linking-opportunities', 'Orphaned Posts': LA + '--orphaned-posts' };
  // postTitle / hostname reports captured per post and per domain (round 1 + 3b).
  var LA_FILTERED = {
    postTitle: [['Container Herbs for Beginners', LA + '--search'],
      ['When to Prune Hydrangeas', LA + '--post-when-to-prune-hydrangeas'],
      ['Raised Beds vs In-Ground Gardens', LA + '--post-raised-beds-vs-in-ground'],
      ['Our Bulb Planting Guide', LA + '--post-bulb-planting-guide'],
      ['Watering Schedules for Hot', LA + '--post-watering-schedules']],
    hostname: [['extension.oregonstate.edu', 'admin-link-assistant-domains-report--hostname'],
      ['xerces.org', 'admin-link-assistant-domains-report--host-xerces-org'],
      ['seedsavers.org', 'admin-link-assistant-domains-report--host-seedsavers-org']]
  };
  R.register([{
    label: 'link-assistant-report-link',
    event: 'click',
    match: function (el) {
      var a = closestTo(el, 'a[href]');
      return !!a && baseOf(slug()).indexOf('admin-link-assistant-') === 0 && /#\/(links|domains)-report\?/.test(a.getAttribute('href'));
    },
    apply: function (el) {
      var href = closestTo(el, 'a[href]').getAttribute('href');
      for (var i = 0; i < LA_QUERY.length; i++) if (LA_QUERY[i][0].test(href)) { hop(LA_QUERY[i][1], LA_QUERY[i][1] + ' not captured yet'); return; }
      var m = /[?&](postTitle|hostname)=([^&]+)/.exec(href);
      var val = m ? decodeURIComponent(m[2].replace(/\+/g, ' ')) : '';
      var to = m ? LA_FILTERED[m[1]].filter(function (r) { return val.indexOf(r[0]) === 0; }).map(function (r) { return r[1]; })[0] : null;
      if (to && captured(to)) { hop(to); return; }
      miss(href, m ? 'report filtered to "' + decodeURIComponent(m[2].replace(/\+/g, ' ')) + '" was not captured' : 'report view not captured');
    }
  }, {
    label: 'link-assistant-report-filter',
    event: 'click',
    match: function (el) {
      var a = closestTo(el, '.aioseo-link-assistant-links-report ul.subsubsub a, .aioseo-link-assistant-links-report .subsubsub a');
      return !!a && baseOf(slug()) === LA;
    },
    apply: function (el) {
      var name = text(closestTo(el, 'a')).replace(/\s*\(\d+\)\s*$/, '');
      var to = LA_FILTERS[name];
      if (!to) { miss('filter:' + name, 'links report filter "' + name + '" not captured'); return; }
      hop(to, to + ' not captured yet');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Smaller controls (QC round 2) ─────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Editor.0c8da691.js:1 @verified 2026-10-01 @product aioseo
  // Each row: what the plugin does, cited, and what the snapshot does.
  //   a card header with no collapse (Card.c303b391.js:1: toggleCard runs but
  //     the body only follows `toggles`) and a breadcrumb preview's sample
  //     link (Breadcrumbs.b8e65f03.js:1 @5206, href "Permalink") — nothing
  //     happens in the plugin either, logged as a no-op;
  //   Links Report post titles (LinksReport.04442f90.js: router push to
  //     #/post-report?postId=…) — the post report was captured for one post;
  //   Redirects row source links (inline edit), "add extra source URLs" and
  //     "Add Custom Rules" (Index.0ac4cdc8.js:1) render forms the capture
  //     lacks — misses;
  //   "Open Sitemap" / "Open HTML Sitemap" (GeneralSitemap.8f3f1fa5.js,
  //     HtmlSitemap.63e72a70.js) open the frontend in a new tab — the
  //     captured frontend page when there is one.
  var POST_REPORT_TITLE = 'How to Plan a Vegetable Bed That Feeds You All Year';
  R.register([{
    label: 'small-controls',
    event: 'click',
    order: 'last',
    match: function (el, evt) {
      if (evt && evt.__snapHandled) return false;
      return !!closestTo(el, ' .aioseo-card > .header:not(.toggles), a[href="Permalink"], .aioseo-preview-box .aioseo-breadcrumb, .aioseo-link-assistant-links-report .post-title a[href="#"], a.edit-link, a.add-source-url, a.custom-rules-toggle__link, .manage-column.url a.post-title[href="#"], .file-upload > button.aioseo-button')
        || /^Open (HTML )?Sitemap$|^Open llms\.txt$/.test(text(closestTo(el, 'button, .aioseo-button')));
    },
    apply: function (el) {
      // Breadcrumbs.6b6bce84.css: `.aioseo-preview-box a{…pointer-events:none}`
      if (closestTo(el, 'a[href="Permalink"], .aioseo-preview-box .aioseo-breadcrumb')) { console.info('[snap] no-op: a breadcrumb preview sample link (pointer-events: none in the plugin)'); return; }
      // AdditionalPages.e5617a61.js:1 @17407: the URL calls editRow(index), the inline row editor.
      if (closestTo(el, '.manage-column.url a.post-title[href="#"]')) { miss('additional-page-edit', 'the Additional Pages inline row editor was not captured'); return; }
      // ImportExport.1b902840.js:1 @22760: triggerFileUpload clicks the hidden file input.
      if (closestTo(el, '.file-upload > button.aioseo-button')) { console.info('[snap] live only: "' + text(closestTo(el, 'button')) + '" opens the system file picker'); return; }
      if (closestTo(el, '.aioseo-card > .header:not(.toggles)')) { console.info('[snap] no-op: this card has no collapse'); return; }
      var t = closestTo(el, '.aioseo-link-assistant-links-report .post-title a[href="#"]');
      if (t) {
        if (text(t) === POST_REPORT_TITLE) hop('admin-link-assistant-post-report');
        else miss('post-report:' + text(t), 'the post report was captured for "' + POST_REPORT_TITLE + '" only');
        return;
      }
      if (closestTo(el, 'a.edit-link')) { miss('redirect-edit', 'the inline redirect editor was not captured'); return; }
      if (closestTo(el, 'a.add-source-url')) { miss('redirect-extra-source', 'the extra source URL rows were not captured'); return; }
      if (closestTo(el, 'a.custom-rules-toggle__link')) { miss('redirect-custom-rules', 'the custom rules builder was not captured'); return; }
      var label = text(closestTo(el, 'button, .aioseo-button'));
      var to = /HTML/.test(label) ? 'frontend-html-sitemap' : /llms/.test(label) ? null : 'frontend-sitemap-index';
      if (to) hop(to, label + ': the frontend page was not captured');
      else miss('llms-txt', 'Open llms.txt: the llms.txt file was not captured');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Table views, sorting and row actions ──────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/WpTable.13b58250.js:1 @verified 2026-10-01 @product aioseo
  // WpTable.13b58250.js:1 / Table.62f39cd4.js:1: the view links (subsubsub),
  // the sortable column headers and pagination re-query the rows over REST
  // (redirects/{filter}, link-assistant/links-report/{filter}); a row's Edit
  // opens its inline editor (Index.0ac4cdc8.js:1), "Check Redirect" runs a
  // loopback test (REST redirects/{id}/test). Views with a captured sibling
  // are wired above (Link Assistant, SEO Checklist); the rest are misses that
  // say which view, and the test is live-only.
  R.register([{
    label: 'table-view-sort-row',
    event: 'click',
    order: 'last',
    match: function (el, evt) {
      if (evt && evt.__snapHandled) return false;
      if (!closestTo(el, '.aioseo-wp-table, .aioseo-table, .aioseo-redirects, .aioseo-app')) return false;
      // views wired to captured siblings elsewhere in this file (the SEO
      // Checklist's sort headers still re-query: SeoChecklist.3d1e8616.js:1
      // @24419 processSort → fetchChecks)
      if (closestTo(el, '.aioseo-link-assistant-links-report ul.subsubsub') || (baseOf(slug()) === 'admin-settings-seo-checklist' && !/--sort-/.test(slug()) && !closestTo(el, 'th'))) return false;
      return !!closestTo(el, 'ul.subsubsub a, th.sortable a, th.sorted a, .tablenav-pages a, .tablenav-pages button, .row-actions a[href="#"]');
    },
    apply: function (el) {
      var a = closestTo(el, 'a, button');
      var t = text(a);
      if (closestTo(el, '.row-actions .test')) { miss('button:' + t, 'Check Redirect: a loopback request on the live site; live only'); return; }
      if (closestTo(el, '.row-actions')) {
        if (/^(Delete|Trash|Remove)/.test(t)) return;          // live-only-button logs these
        miss('row:' + t, 'row "' + t + '": its inline editor or panel was not captured');
        return;
      }
      if (closestTo(el, 'th')) {
        // SEO Checklist (p3-qc3): each sort captured once (one click, desc) on the Incomplete view.
        var SC = 'admin-settings-seo-checklist';
        var to = /^Priority/.test(t) ? SC + '--sort-priority' : /^Time Estimate/.test(t) ? SC + '--sort-time' : null;
        if (to && slug() !== to && (slug() === SC || /--sort-/.test(slug())) && captured(to)) { hop(to); return; }
        miss('sort:' + t, 'the table sorted by "' + t + '"' + (to && slug() === to ? ' the other way' : '') + ' was not captured');
        return;
      }
      if (closestTo(el, '.tablenav-pages')) { miss('page:' + t, 'the next page of rows was not captured'); return; }
      if (closestTo(el, 'ul.subsubsub li .name.active, ul.subsubsub a.current')) { console.info('[snap] no-op: "' + t + '" is the view shown'); return; }
      miss('view:' + t, 'the "' + t.replace(/\s*\(\d+\)$/, '') + '" view of this table was not captured');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Native and widget controls ────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/WpTable.13b58250.js:1 @verified 2026-10-01 @product aioseo
  //   a native <select> (WP list-table bulk actions and filters, the items-per-page
  //     select of WpTable.13b58250.js, which also saves settings/items-per-page;
  //     the Reviewed By SelectControl's label) opens in the browser as it does
  //     live; a choice only takes effect with Apply / Filter, which are
  //     live-only or not captured — logged;
  //   BaseRadio (label.aioseo-radio, e.g. Import/Export's JSON / CSV,
  //     ImportExport.1b902840.js:1 @12219) is a native radio with no dependents:
  //     the browser flips it, logged;
  //   the element-plus date pickers (the input, or the `.aioseo-datepicker-picker`
  //     label laid over it) and the phone-number country list
  //     (vue-tel-input `vti__dropdown`) render their popups on demand — misses;
  //   a same-site link whose screen was never captured — a miss that says so
  //     every time (core logs one per URL key).
  R.register([{
    label: 'native-controls',
    event: 'click',
    order: 'last',
    match: function (el, evt) {
      if (evt && evt.__snapHandled) return false;
      var lab = closestTo(el, 'label[for]');
      if (lab && !closestTo(lab, '[class*="aioseo"]')) lab = null;
      return !!closestTo(el, '[class*="aioseo"] select, .tablenav select, input.el-input__inner, .vti__dropdown, .aioseo-datepicker-picker')
        || !!(lab && lab.control && lab.control.tagName === 'SELECT');
    },
    apply: function (el) {
      if (closestTo(el, 'select, label[for]')) {
        var perPage = closestTo(el, '.aioseo-wp-items-per-page');
        console.info('[snap] no-op: native select, opens in the browser' + (perPage ? '; a new page size re-queries and saves the per-user setting live' : '; the choice applies with Apply / Filter'));
        return;
      }
      if (closestTo(el, '.vti__dropdown')) { miss('phone-country', 'the phone country list renders on demand; not captured'); return; }
      miss('date-picker', 'the date picker popup renders on demand; not captured');
    }
  }, {
    label: 'native-radio',
    event: 'change',
    match: function (el) { return !!el && el.tagName === 'INPUT' && el.type === 'radio' && !!closestTo(el, 'label.aioseo-radio'); },
    apply: function (el) { console.info('[snap] set: ' + text(closestTo(el, 'label.aioseo-radio')) + ' (a native radio, no fields depend on it)'); }
  }, {
    label: 'unresolved-link',
    event: 'click',
    order: 'last',
    match: function (el, evt) {
      if (evt && evt.__snapHandled) return false;
      var a = closestTo(el, 'a[href]');
      if (!a || !closestTo(a, '[class*="aioseo"], [id*="aioseo"], #the-list')) return false;
      if (a.matches('a.legend-label[href*="seo-site-audit?tab="]') && one('.aioseo-tabs.internal')) return false;   // site-audit-legend-link
      var h = a.getAttribute('href') || '';
      if (!h || h.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(h)) return false;
      var u = null;
      try { u = new URL(h, document.baseURI); } catch (_) { return false; }
      if (u.host !== location.host && u.host !== siteHost()) return false;   // external-link logs those
      return !R.resolve(h);
    },
    apply: function (el) {
      var h = closestTo(el, 'a[href]').getAttribute('href');
      miss(h.replace(/^https?:\/\/[^/]+/, ''), 'this screen was not captured');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ External links ────────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/app-core.2e1fbbab.js:5 @verified 2026-10-01 @product aioseo
  // Docs, support, social and upgrade links (links.utmUrl / getDocLink in
  // app-core.2e1fbbab.js:5) point at aioseo.com and friends, opening in a new
  // tab on the live site. A snapshot never leaves the product: the click is
  // swallowed like every link and says what it would have opened.
  function siteHost() {
    var a = one('a[href*="/wp-admin/"]');
    try { return a ? new URL(a.getAttribute('href'), document.baseURI).host : null; } catch (_) { return null; }
  }
  R.register([{
    label: 'external-link',
    event: 'click',
    order: 'last',
    match: function (el) {
      var a = closestTo(el, 'a[href]');
      if (!a) return false;
      var u = null;
      try { u = new URL(a.getAttribute('href'), document.baseURI); } catch (_) { return false; }
      return /^https?:$/.test(u.protocol) && u.host !== location.host && u.host !== siteHost();
    },
    apply: function (el) {
      var a = closestTo(el, 'a[href]');
      var u = new URL(a.getAttribute('href'), document.baseURI);
      miss(u.origin + u.pathname, 'external link: opens ' + u.host + ' outside the product (live site, new tab)');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Redirect Method ───────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Main.53c80ac1.js:1 @verified 2026-10-01 @product aioseo
  // Main.53c80ac1.js:1 @132175: a box toggle (name "breadcrumbsType") on
  // redirectsStore.options.main.method; "server" swaps the PHP description for
  // the Apache / NGINX one and its Export button (v-if on the method). The
  // Web Server state is its own capture when there is one; else a miss.
  var RS = 'admin-redirects-settings';
  R.register([{
    label: 'redirect-method-change',
    event: 'change',
    match: function (el) { return !!el && el.tagName === 'INPUT' && el.type === 'radio' && el.name === 'breadcrumbsType' && baseOf(slug()) === RS; },
    apply: function (el) {
      if (el.defaultChecked) return;
      var to = slug() === RS ? RS + '--web-server' : RS;
      if (captured(to)) { hop(to); return; }
      all('input[name="breadcrumbsType"]').forEach(function (r) { r.checked = r.defaultChecked; });
      miss('control:redirectMethod', 'Redirect Method "' + text(closestTo(el, 'div').querySelector('label')) + '": its server description and export button were not captured');
    },
    state: function (el) { return { key: 'redirectMethod', value: el.value }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Image uploader remove ─────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/ImageUploader.4ed9611d.js:1 @verified 2026-10-01 @product aioseo
  // ImageUploader.4ed9611d.js:1 @5289: the trash button calls setImgSrc(null).
  // With no modelValue the input is empty, the trash button (v-if) and the
  // `--has-image` class go, and BaseImg (Img.82be028e.js:1, canShow false with
  // no src) renders no preview. Unsaved until Save Changes. The Locations
  // business-info "Remove" (Locations.3e63a444.js:1 @23597) has no onClick.
  R.register([{
    label: 'image-uploader-remove',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.remove-image'); },
    apply: function (el) {
      var up = closestTo(el, '.aioseo-image-uploader');
      if (!up) { console.info('[snap] no-op: this Remove button has no handler in the plugin'); return; }
      var inp = one('.aioseo-input input', up);
      if (inp) inp.value = '';
      up.classList.remove('aioseo-image-uploader--has-image');
      var img = one(':scope > img.image-preview', up);
      if (img) img.remove();
      closestTo(el, '.remove-image').remove();
    },
    state: function () { return { key: 'image', value: '' }; }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Site audit legend links ───────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/DonutChartWithLegend.01a4dce7.js:1 @verified 2026-10-01 @product aioseo
  // DonutChartWithLegend.01a4dce7.js:1 @2112: a legend label with a link
  // (#/seo-site-audit?tab=error|warning|passed) selects that section; on the
  // Site Audit screen that is the Issues / Warnings / Good tab of
  // SeoSiteAudit.9d8f61d8.js:1 @10451 (siteAudit.activeTab). The click goes
  // to the tab itself, so card-tab-switch renders it.
  var AUDIT_TAB = { error: 'Issues', warning: 'Warnings', passed: 'Good' };
  R.register([{
    label: 'site-audit-legend-link',
    event: 'click',
    match: function (el) {
      var a = closestTo(el, 'a.legend-label[href*="seo-site-audit?tab="]');
      return !!a && !!one('.aioseo-tabs.internal');
    },
    apply: function (el) {
      var a = closestTo(el, 'a.legend-label');
      var key = (a.getAttribute('href').match(/[?&]tab=([a-z-]+)/) || [])[1];
      var want = AUDIT_TAB[key];
      var tab = want ? all('.aioseo-tabs.internal .var-tab').filter(function (t) { return tabLabel(t).indexOf(want) === 0; })[0] : null;
      if (!tab) { miss('audit-tab:' + key, 'no "' + want + '" tab on this screen'); return; }
      if (tab.classList.contains('var-tab--active')) { console.info('[snap] no-op: "' + tabLabel(tab) + '" is already selected'); return; }
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Search Statistics connect overlay ─────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/Main.0026a430.js:1 @verified 2026-10-01 @product aioseo
  // Main.0026a430.js:1 @18120: with Search Console not connected the report
  // renders under <core-blur> with <connect-cta> laid over it, so a click on
  // the blurred report lands on the overlay and does nothing live either. The
  // overlay's own buttons are handled elsewhere (Connect is live only).
  R.register([{
    label: 'search-statistics-connect-overlay',
    event: 'click',
    order: 'last',
    match: function (el) { return !!closestTo(el, '.connect-cta') && !closestTo(el, 'a, button, .aioseo-button'); },
    apply: function () { console.info('[snap] no-op: the report is blurred behind the Connect CTA (Search Console not connected)'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Plain text labels ─────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/GlobalSettings.9dac789f.js:2 @verified 2026-10-01 @product aioseo
  // GlobalSettings.9dac789f.js:2 @23510: `a("label",null,…useRange)` — a label
  // with no `for` and no control inside (Use Range, From, To), or one whose
  // `for` names no element (the classic editor's Reviewer label). Clicking it
  // does nothing in the plugin either; logged so the click was heard.
  R.register([{
    label: 'plain-label',
    event: 'click',
    order: 'last',
    match: function (el) {
      var lab = closestTo(el, 'label');
      return !!lab && !!closestTo(lab, '[class*="aioseo"]') && !lab.control && !one('input, select, textarea', lab);
    },
    apply: function (el) { console.info('[snap] no-op: "' + text(closestTo(el, 'label')) + '" is a text label with no control'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Already selected ──────────────────────────────────────────────────────
  // @since 2026-10-01 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/RadioToggle.78d25582.js:1 @verified 2026-10-01 @product aioseo
  // The active tab (Tabs.f7dce75e.js:1 @2232, same route / same `active`)
  // and a radio option that is already the value (RadioToggle.78d25582.js:1:
  // no `input` event fires) do nothing in the plugin either. Logged, so a
  // film author knows the click was heard.
  R.register([{
    label: 'already-selected',
    event: 'click',
    order: 'last',
    match: function (el) {
      var tab = closestTo(el, '.aioseo-tabs .var-tab.var-tab--active');
      if (tab) return true;
      var box = closestTo(el, '.aioseo-ui-element-slider label[for]');
      if (box) { var bi = document.getElementById(box.getAttribute('for')); if (bi && bi.checked) return true; }
      // A box toggle (Redirects › Redirect Method) and a BaseRadio
      // (label.aioseo-radio, Import/Export JSON / CSV) whose radio is the value.
      var lf = closestTo(el, '[class*="aioseo"] label[for]');
      if (lf && !closestTo(lf, '.aioseo-radio-toggle')) { var li = document.getElementById(lf.getAttribute('for')); if (li && li.type === 'radio' && li.checked) return true; }
      var lr = el.tagName === 'INPUT' ? null : closestTo(el, 'label.aioseo-radio');
      var ri = lr ? one('input[type="radio"]', lr) : null;
      if (ri && ri.checked) return true;
      // The label's click comes before the browser checks its radio, so
      // `checked` here is the value before this click.
      var lab = closestTo(el, '.aioseo-radio-toggle label[for]');
      var inp = lab ? document.getElementById(lab.getAttribute('for')) : null;
      return !!inp && inp.checked && (lab.classList.contains('default') || lab.classList.contains('dark'));
    },
    apply: function (el) { console.info('[snap] no-op: "' + text(closestTo(el, '.var-tab, label, input')) + '" is already selected'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─── block editor (post-settings, App.16d3e000.js) ───────────────────────
  // ─ Editor SEO sidebar button ─────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/post-settings.5bf8e178.js:1 @verified 2026-09-30 @product aioseo
  // post-settings.5bf8e178.js:1 @8138: `#aioseo-post-settings-sidebar-button`
  // is the icon of the PluginSidebar "aioseo-post-settings-sidebar" (@8316); the
  // block editor's pinned-item button opens or closes that sidebar. Captured
  // open on the vegetable-bed post (editor-post-sidebar, p1-editor.json); the
  // green / orange score captures are other posts or another state, so their
  // button is a logged miss.
  var EDITOR_OPEN = ['editor-post-sidebar', 'editor-post-metabox-general', 'editor-post-metabox-analysis',
    'editor-post-snippet-modal', 'editor-post-metabox-general-social', 'editor-post-metabox-schema',
    'editor-post-metabox-aicontent', 'editor-post-metabox-advanced', 'editor-post-metabox-linkassistant',
    'editor-post-metabox-redirects', 'editor-post-metabox-seorevisions', 'editor-post-headline-analyzer',
    'editor-post-ai-generator-modal'];
  // Side panel → the sidebar tab it opens (App.16d3e000.js:4 @71605, fe(F.slug)).
  var SIDEPANEL = { 'Appearance': 'editor-post-metabox-general', 'Optimization': 'editor-post-metabox-analysis',
    'Schema': 'editor-post-metabox-schema', 'AI Copilot': 'editor-post-metabox-aicontent',
    'Link Assistant': 'editor-post-metabox-linkassistant', 'Redirects': 'editor-post-metabox-redirects',
    'SEO Revisions': 'editor-post-metabox-seorevisions', 'Advanced': 'editor-post-metabox-advanced' };
  R.register([{
    label: 'editor-seo-sidebar',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-post-settings-sidebar-button') || !!(closestTo(el, 'button') && one('#aioseo-post-settings-sidebar-button', closestTo(el, 'button'))); },
    apply: function () {
      var s = slug();
      if (s === 'editor-post') { hop('editor-post-sidebar'); return; }
      if (on(EDITOR_OPEN)) { hop('editor-post', 'closing the sidebar'); return; }
      miss('state:' + s + '--sidebar', 'the SEO sidebar was captured on the vegetable-bed post only');
    }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Editor sidebar panels ─────────────────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/App.16d3e000.js:4 @verified 2026-09-30 @product aioseo
  // App.16d3e000.js:4 @71605: each `a.aioseo-sidepanel-button` (href "#",
  // click.prevent) calls fe(slug) and the sidebar renders that tab instead of
  // the side panel; @72367 the title bar's close (`svg.aioseo-close`) calls
  // fe(null), back to the panel. Each tab was captured on the same post.
  R.register([{
    label: 'editor-sidepanel-open',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-post-settings-sidebar-vue a.aioseo-sidepanel-button'); },
    apply: function (el) {
      var name = text(one('.name', closestTo(el, 'a.aioseo-sidepanel-button'))).replace(/\s*NEW!$/, '');
      hop(SIDEPANEL[name] || null, 'sidebar tab "' + name + '" not captured yet');
    }
  }, {
    label: 'editor-sidepanel-back',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-post-settings-sidebar-vue .aioseo-tab-title svg.aioseo-close'); },
    apply: function () { hop('editor-post-sidebar'); }
  }], { product: 'aioseo', file: 'interactivity.js' });

  // ─ Editor snippet and social modals ──────────────────────────────────────
  // @since 2026-09-30 @source all-in-one-seo-pack-pro/dist/Pro/assets/js/App.16d3e000.js:4 @verified 2026-09-30 @product aioseo
  // App.16d3e000.js:4 @57480: Appearance's "Edit Snippet" opens the Preview
  // Snippet Editor modal and "Preview & Edit" the social one (teleported to
  // #aioseo-modal-portal, Modal.4dfbd289.js). Captured from the sidebar's
  // Appearance tab (p1-editor.json, p2-editor.json); the modal's close button
  // returns to it.
  R.register([{
    label: 'editor-snippet-modal',
    event: 'click',
    match: function (el) { return !!closestTo(el, '#aioseo-post-settings-sidebar-vue button.edit-snippet, #aioseo-post-settings-sidebar-vue button.open-social-modal'); },
    apply: function (el) {
      var social = !!closestTo(el, 'button.open-social-modal');
      if (slug() !== 'editor-post-metabox-general') { miss('state:' + slug() + (social ? '--social-modal' : '--snippet-modal'), 'captured from the sidebar Appearance tab only'); return; }
      hop(social ? 'editor-post-metabox-general-social' : 'editor-post-snippet-modal');
    }
  }, {
    label: 'editor-modal-close',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-post-settings-modal .modal-header button.close'); },
    apply: function () { hop('editor-post-metabox-general'); }
  }], { product: 'aioseo', file: 'interactivity.js' });
}());
