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

  // Slugs a state hop may land on: products/aioseo/snapshots/index.json when
  // this file was last written. A hop to a slug not listed is a logged miss,
  // never a 404 (hand-browsing) or a blank frame (in a film). Add a slug here
  // when its capture lands.
  var CAPTURED = [
    'admin-about-about-us', 'admin-about-getting-started', 'admin-adminbar', 'admin-adminbar-seo--editor',
    'admin-ai-insights-ai-content', 'admin-ai-insights-keyword-reports', 'admin-ai-insights-mcp', 'admin-dashboard',
    'admin-dashboard--site-score', 'admin-dashboard-widgets', 'admin-edit-pages', 'admin-edit-posts',
    'admin-edit-posts--inline-edit', 'admin-edit-posts--quickedit', 'admin-edit-tags-category',
    'admin-feature-manager', 'admin-global--help-panel', 'admin-global--newsroom-drawer',
    'admin-global--notifications-drawer', 'admin-link-assistant-domains-report', 'admin-link-assistant-links-report',
    'admin-link-assistant-links-report--expanded', 'admin-link-assistant-overview',
    'admin-link-assistant-post-report', 'admin-link-assistant-settings', 'admin-local-seo-locations',
    'admin-local-seo-locations--multiple', 'admin-local-seo-locations--single', 'admin-local-seo-maps',
    'admin-local-seo-opening-hours', 'admin-locations-list', 'admin-profile-aioseo', 'admin-redirects',
    'admin-redirects--add-advanced', 'admin-redirects-full-site-redirect', 'admin-redirects-http-headers',
    'admin-redirects-import-export', 'admin-redirects-logs', 'admin-redirects-logs--404', 'admin-redirects-settings',
    'admin-search-appearance-advanced', 'admin-search-appearance-archives', 'admin-search-appearance-author-seo',
    'admin-search-appearance-content-types', 'admin-search-appearance-content-types--post-advanced',
    'admin-search-appearance-content-types--post-schema', 'admin-search-appearance-global-settings',
    'admin-search-appearance-media', 'admin-search-appearance-taxonomies', 'admin-search-statistics-content-rankings',
    'admin-search-statistics-content-rankings--sample', 'admin-search-statistics-dashboard',
    'admin-search-statistics-dashboard--sample', 'admin-search-statistics-index-status',
    'admin-search-statistics-index-status--sample', 'admin-search-statistics-keyword-rank-tracker',
    'admin-search-statistics-keyword-rank-tracker--sample', 'admin-search-statistics-seo-statistics',
    'admin-search-statistics-seo-statistics--sample', 'admin-search-statistics-settings',
    'admin-seo-analysis-analyze-competitor-site', 'admin-seo-analysis-headline-analyzer',
    'admin-seo-analysis-seo-audit-checklist', 'admin-seo-analysis-seo-site-audit',
    'admin-seo-analysis-seo-site-audit--url-details', 'admin-seo-revisions', 'admin-settings-access-control',
    'admin-settings-advanced', 'admin-settings-breadcrumbs', 'admin-settings-content-optimization',
    'admin-settings-general', 'admin-settings-rss-content', 'admin-settings-seo-checklist',
    'admin-settings-webmaster-tools', 'admin-settings-webmaster-tools--google',
    'admin-settings-webmaster-tools--indexnow', 'admin-sitemaps-general-sitemap',
    'admin-sitemaps-general-sitemap--additional-pages', 'admin-sitemaps-html-sitemap', 'admin-sitemaps-llms-sitemap',
    'admin-sitemaps-news-sitemap', 'admin-sitemaps-rss-sitemap', 'admin-sitemaps-video-sitemap',
    'admin-social-networks-facebook', 'admin-social-networks-pinterest', 'admin-social-networks-social-profiles',
    'admin-social-networks-twitter', 'admin-term-edit', 'admin-tools-database-tools', 'admin-tools-import-export',
    'admin-tools-robots-editor', 'admin-tools-seo-alerts', 'admin-tools-snippets', 'admin-tools-system-status',
    'editor-classic-post', 'editor-location', 'editor-post', 'editor-post--score-green', 'editor-post--score-none',
    'editor-post--score-orange', 'editor-post-ai-generator-modal', 'editor-post-block-faq',
    'editor-post-document-panel', 'editor-post-headline-analyzer', 'editor-post-inserter-aioseo',
    'editor-post-link-format', 'editor-post-metabox-advanced', 'editor-post-metabox-aicontent',
    'editor-post-metabox-analysis', 'editor-post-metabox-general', 'editor-post-metabox-general-social',
    'editor-post-metabox-linkassistant', 'editor-post-metabox-redirects', 'editor-post-metabox-schema',
    'editor-post-metabox-schema--catalog', 'editor-post-metabox-seorevisions', 'editor-post-pane-advanced',
    'editor-post-pane-aicopilot', 'editor-post-pane-linkassistant', 'editor-post-pane-optimization',
    'editor-post-pane-redirects', 'editor-post-pane-schema', 'editor-post-pane-seorevisions',
    'editor-post-prepublish', 'editor-post-primary-term', 'editor-post-sidebar', 'editor-post-snippet-modal',
    'frontend-adminbar-seo', 'frontend-author-bio', 'frontend-breadcrumbs', 'frontend-html-sitemap',
    'frontend-local-business', 'frontend-seo-preview', 'frontend-sitemap-index', 'frontend-sitemap-page',
    'frontend-sitemap-post', 'wizard-additional-information', 'wizard-category', 'wizard-features', 'wizard-import',
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
    R.miss('state:' + (target || slug()), note || 'state not captured');
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
    R.miss(url, note || 'screen not captured yet');
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
      if (!path) { R.miss('tab:' + tabLabel(tab), 'no route for this tab on page ' + page); return; }
      // A route lands on a screen, never on a captured state of it (a detail
      // panel open, a modal): a nav key a state variant won is a miss here.
      var url = 'admin.php?page=' + page + '#' + path;
      var hit = R.resolve(url);
      if (hit && hit.slug.indexOf('--') !== -1) { R.miss(url, 'route screen not captured (only its state ' + hit.slug + ')'); return; }
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
    { from: ['admin-search-appearance-content-types', 'admin-search-appearance-content-types--post-schema',
      'admin-search-appearance-content-types--post-advanced'], scope: '#aioseo-card-postSA',
      tabs: { 'Title & Description': 'admin-search-appearance-content-types',
        'Schema Markup': 'admin-search-appearance-content-types--post-schema',
        'Advanced': 'admin-search-appearance-content-types--post-advanced' } },
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
      var hit = null;
      CARD_TABS.some(function (row) {
        if (!on(row.from) || !closestTo(tab, row.scope)) return false;
        for (var k in row.tabs) {
          if (Object.prototype.hasOwnProperty.call(row.tabs, k) && label.indexOf(k) === 0) { hit = row.tabs[k]; return true; }
        }
        return false;
      });
      if (hit) hop(hit, 'tab "' + label + '" not captured yet');
      else R.miss('tab:' + label, 'tab "' + label + '": its body is v-if and was not captured');
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
      if (!slide(box, opening)) { R.miss('card:' + text(one('.header-title', h)), 'card body was captured closed'); return; }
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
      if (!box || !box.classList.contains('content-analysis-section__body')) { R.miss('section:' + text(one('span', h)), 'section body not captured'); return; }
      var opening = box.getAttribute('aria-expanded') !== 'true';
      if (!slide(box, opening, 300)) { R.miss('section:' + text(one('span', h)), 'section body was captured closed'); return; }
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
      if (slug() !== 'admin-dashboard') { R.miss('state:' + target, title + ': drawer captured on the Dashboard only'); return; }
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
  control({ when: function (c) { return c.kind === 'checkbox' && /^Include All (Post Types|Taxonomies)/.test(c.label); },
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
      if (res === true) { if (c.kind === 'radio') paintRadio(el); return; }
      revert(c);
      if (res && res.hop) { hop(res.hop, res.hop + ' not captured yet'); return; }
      R.miss('control:' + (c.name || c.rowName || c.header || c.label), res);
    },
    state: function (el) {
      var c = ctlOf(el);
      return { key: c.name || c.rowName || c.header || c.label, value: c.kind === 'radio' ? c.value : !!el.checked };
    }
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
    label: 'title-separator-show-more',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-separators .show-more a'); },
    apply: function () { R.miss('state:separators-show-more', 'Show More: the extra separators and the custom field were not captured'); }
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
    [/^Reset Selected Settings to Default$/, 'opens the reset confirm (not captured); its Yes resets settings (H11)']
  ];
  R.register([{
    label: 'live-only-button',
    event: 'click',
    order: 'last',
    match: function (el) {
      var b = closestTo(el, 'button, .aioseo-button');
      if (!b || !closestTo(b, '.aioseo-app, .aioseo-main, #aioseo-settings, #aioseo-post-settings-sidebar-vue, .aioseo-details-column, .inline-edit-row')) return false;
      var t = text(b);
      return NEVER.some(function (n) { return n[0].test(t); });
    },
    apply: function (el) {
      var t = text(closestTo(el, 'button, .aioseo-button'));
      var note = 'live only';
      NEVER.some(function (n) { if (n[0].test(t)) { note = n[1]; return true; } return false; });
      R.miss('button:' + t, note);
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
      R.miss('tab:' + text(t), 'SEO Preview view "' + text(t) + '" was not captured');
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
      if (!previewRoot()) R.miss('state:' + slug() + '--seo-preview', 'SEO Preview was captured on frontend-seo-preview only');
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
      if (!next) { R.miss('state:wizard-next', 'next wizard step unknown'); return; }
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
      if (!target) { R.miss('state:webmaster-tools--' + name, name + ': its settings panel was not captured'); return; }
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
      if (h.first && all(h.sel)[0] !== ctl) { R.miss('state:' + h.to, 'only the first row was captured'); return; }
      if (h.row) {
        var tr = closestTo(ctl, 'tr');
        if (!tr || tr.id !== VEGBED_ROW) { R.miss('state:' + h.to, 'only the vegetable-bed row was captured'); return; }
      }
      hop(h.to, h.to + ' not captured yet');
    }
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
      R.miss('state:' + s + '--sidebar', 'the SEO sidebar was captured on the vegetable-bed post only');
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
      if (slug() !== 'editor-post-metabox-general') { R.miss('state:' + slug() + (social ? '--social-modal' : '--snippet-modal'), 'captured from the sidebar Appearance tab only'); return; }
      hop(social ? 'editor-post-metabox-general-social' : 'editor-post-snippet-modal');
    }
  }, {
    label: 'editor-modal-close',
    event: 'click',
    match: function (el) { return !!closestTo(el, '.aioseo-post-settings-modal .modal-header button.close'); },
    apply: function () { hop('editor-post-metabox-general'); }
  }], { product: 'aioseo', file: 'interactivity.js' });
}());
