/**
 * snapshots/_shared/dashboard.js
 *
 * Brings the frozen `snapshots/admin-dashboard/` capture back to life so the
 * film drives the real Dashboard instead of filming a picture of it.
 *
 * WHY THIS EXISTS
 * ---------------
 * capture.js does two things to this page:
 *   1. rasterizes every <canvas> into <img data-from-canvas> (capture.js ~line 458)
 *   2. strips every <script> unconditionally (capture.js ~line 614)
 * So the three Chart.js charts arrive dead, and every gear menu, tile and
 * date-range control arrives inert.
 *
 * Umair, 2026-08-19 (snapshots/_shared/survey-reporting.js): "why is the png
 * file here, remove it delete it. Because if you see an image file, you'll
 * start making slides type animations using this." The rasters are DELETED
 * here, not hidden.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It invents nothing. Every state it shows comes from one of two places:
 *   - `data-config` attributes the server already put in the DOM (attributes
 *     survive capture) — the entries series, the payments series + tiles, and
 *     the complete Top Locations country list with its palette.
 *   - `<body data-wpf-dashboard>` — states harvested at capture time by
 *     driving the plugin's own AJAX endpoints, recorded per
 *     `capture/plans/wpforms-dashboard-tour.json`. Post-save widget HTML is
 *     the server's own re-render, not hand-built table rows.
 * Chart options and re-render logic are ported from the plugin's own modules,
 * cited inline. See BRIEF.md section 2.
 *
 * WIRED INTO THE SNAPSHOT
 * -----------------------
 * This lives beside snapshots/_shared/survey-reporting.js and is loaded by the
 * snapshot itself via a hand-added <script> tag, the same way frontend.js is
 * wired. It started out video-local, which meant the snapshot only came alive
 * when a film injected it — so opening snapshots/admin-dashboard/index.html
 * directly gave a dead page with frozen charts stuck at their capture-time
 * pixel width. Umair hit exactly that on 2026-09-14. The snapshot must stand up
 * on its own, because that is how it gets reviewed.
 *
 * DETERMINISM (INV-9)
 * -------------------
 * This runs inside the film, so: no Date.now(), no unseeded Math.random(), no
 * fetch(), no repeat:-1. Chart.js is initialised with `animation: false` for the
 * same reason survey-reporting.js does it — the film owns motion on the master
 * GSAP timeline, and a self-animating chart breaks --seek render parity.
 *
 * USAGE
 * -----
 *   <script src="../_shared/dashboard.js"></script>
 * injected into the iframe document, then:
 *   await iframeWin.WPFormsDash.ready();
 *   iframeWin.WPFormsDash.openGear('entries');
 * Every method is synchronous and total — state changes never depend on a
 * transition or a rAF frame (rulebook rf 22: transitions may decorate the path,
 * never gate the outcome).
 */
(function () {
  'use strict';

  var TAG = '[dashboard]';

  // ── lib paths ───────────────────────────────────────────────────────────
  // Resolved from this script's own URL so the module works under http:// (the
  // preview server) and file:// (the headless interaction proof) alike.
  var SELF_DIR = (function () {
    var cs = document.currentScript;
    if (cs && cs.src) return cs.src.replace(/[^/]+$/, '');
    if (window.__WPF_DASH_SELF_DIR) return window.__WPF_DASH_SELF_DIR;
    return '/snapshots/_shared/';
  })();
  // Chart.js is already vendored in the repo at the version WPForms ships
  // (4.5.1). Resolve it against the snapshot document, exactly as
  // snapshots/_shared/survey-reporting.js does.
  var CHART_SRC = new URL('../_shared/lib/chart.min.js', document.baseURI).href;
  var MOMENT_SRC = SELF_DIR + 'lib/moment.min.js';
  var ADAPTER_SRC = SELF_DIR + 'lib/chartjs-adapter-moment.min.js';

  // ── selectors (verified against the frozen snapshot, not assumed) ────────
  var S = {
    widget: '.wpforms-dashboard-widget',
    cog: '.wpforms-dashboard-widget-cog',
    popover: '.wpforms-dashboard-widget-settings',
    save: '.wpforms-dashboard-widget-settings-save',
    reset: '.wpforms-dashboard-widget-settings-reset',
    entriesRoot: '[data-widget="entries"]',
    entriesBody: '.wpforms-dashboard-widget-entries-body',
    entriesChart: '.wpforms-dashboard-widget-entries-chart',
    graphBtn: '.wpforms-dashboard-widget-entries-graph-btn',
    graphReset: '.wpforms-dashboard-widget-entries-graph-reset',
    paymentsRoot: '.wpforms-dashboard-widget-payments',
    paymentsGraph: '.wpforms-dashboard-widget-payments-graph',
    paymentsCanvas: '#wpforms-dashboard-payments-overview-canvas',
    paymentsTiles: '.wpforms-dashboard-widget-payments-tiles',
    paymentsTile: '.wpforms-dashboard-widget-payments-tiles button[data-stats]',
    paymentsTable: '.wpforms-dashboard-widget-payments-table',
    locationsWidget: '[data-widget="locations"]',
    locationsRoot: '.wpforms-dashboard-locations',
    locationsBody: '.wpforms-dashboard-widget-locations-table tbody',
    locationsDonut: '.wpforms-dashboard-widget-locations-donut',
    locationsTotal: '.wpforms-dashboard-widget-locations-chart-total',
    statCards: '#wpforms-dashboard-stat-cards',
    dateForm: '.wpforms-overview-top-bar-filter-form',
    datePopover: '.wpforms-datepicker-popover',
    dateButton: '#wpforms-datepicker-popover-button',
    raster: 'img[data-from-canvas]'
  };
  // SOURCE: assets/js/admin/dashboard/dashboard-page.min.js — classNames
  var C = { hide: 'wpforms-hide', hidden: 'wpforms-hidden', selected: 'is-selected', active: 'is-active',
            gearOpen: 'wpforms-dashboard-widget-settings-open',
            payRowHidden: 'wpforms-dash-widget-forms-list-hidden-el' };

  var HARVEST = null;
  var charts = { entries: null, payments: null, locations: null };
  var locState = null;          // parsed Top Locations config + live selection
  var payState = { report: '', cache: {} };
  var readyResolve = null;
  var readyPromise = new Promise(function (r) { readyResolve = r; });

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function widgetRoot(name) { return $(S.widget + '[data-widget="' + name + '"]'); }

  // ── harvest ─────────────────────────────────────────────────────────────
  // Fail loudly. A half-hydrated dashboard that limps on is the failure mode
  // that ships as "the chart just looks a bit off".
  function readHarvest() {
    var raw = document.body && document.body.getAttribute('data-wpf-dashboard');
    if (!raw) throw new Error(TAG + ' body[data-wpf-dashboard] is missing — re-run capture/plans/wpforms-dashboard-tour.json');
    var parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { throw new Error(TAG + ' harvest attribute did not parse: ' + e.message); }
    if (parsed.err) throw new Error(TAG + ' capture recorded a harvest error: ' + parsed.err);
    return parsed;
  }

  function readConfig(sel) {
    var el = $(sel);
    if (!el) return null;
    try { return JSON.parse(el.getAttribute('data-config') || 'null'); }
    catch (e) { console.error(TAG + ' invalid data-config on ' + sel, e); return null; }
  }

  // ── raster → live canvas ────────────────────────────────────────────────
  // Measure the raster before removing it: the host derives its height from its
  // content, so a height:100% canvas collapses the box. Pin the captured size,
  // then delete the raster outright.
  function installCanvas(host, attrs) {
    if (!host) return null;
    var existing = host.querySelector('canvas');
    if (existing) return existing;
    var img = host.querySelector(S.raster) || host.querySelector('img');
    var w = 0, h = 0, cls = '';
    if (img) {
      w = parseInt(img.style.width, 10) || Math.round(img.getBoundingClientRect().width) || 0;
      h = parseInt(img.style.height, 10) || Math.round(img.getBoundingClientRect().height) || 0;
      cls = img.className || '';
    }
    if (!h) h = Math.round(host.getBoundingClientRect().height) || 280;

    var canvas = document.createElement('canvas');
    // capture.js copies className onto the raster but NOT the id, so the id has
    // to be restored by hand or the payments module's own selector never
    // resolves.
    if (cls) canvas.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { canvas.setAttribute(k, attrs[k]); });
    canvas.style.cssText = 'display:block;width:' + (w ? w + 'px' : '100%') + ';height:' + h + 'px;';
    if (img) img.parentNode.replaceChild(canvas, img);
    else host.appendChild(canvas);
    return canvas;
  }

  function destroyChart(key) {
    if (charts[key]) { try { charts[key].destroy(); } catch (e) {} charts[key] = null; }
  }

  // ── chart-helpers port ──────────────────────────────────────────────────
  // SOURCE: assets/js/admin/dashboard/modules/chart-helpers.min.js
  // getPlaceholderDays() is deliberately NOT ported: it calls moment() and
  // Math.random(), and this snapshot has real data in every range.
  function getXAxisFormat(ticks) {
    if (!ticks.length) return 'MMM D';
    var a = window.moment(ticks[0].value != null ? ticks[0].value : ticks[0]);
    var b = window.moment(ticks[ticks.length - 1].value != null ? ticks[ticks.length - 1].value : ticks[ticks.length - 1]);
    return a.year() === b.year() ? 'MMM D' : 'MMM D YYYY';
  }
  function formatXTick(value, index, ticks) {
    var step = Math.floor(ticks.length / 7);
    if (step >= 1 && (ticks.length - index - 1) % step !== 0) return undefined;
    return window.moment(value).format(getXAxisFormat(ticks));
  }

  // ── Entries chart ───────────────────────────────────────────────────────
  // SOURCE: assets/js/admin/dashboard/modules/widget-entries.min.js
  var ENTRY_COLORS = { stroke: '#056aab', fill: '#e6f0f7', point: '#056aab', hoverStroke: '#055f9a' };

  function entriesRange() {
    var body = $(S.entriesBody);
    return { start: body ? body.getAttribute('data-range-start') || '' : '',
             end: body ? body.getAttribute('data-range-end') || '' : '' };
  }

  // SOURCE: widget-entries.min.js buildSeries() — sparse {date,count} list
  // densified across the selected range so gaps read as zero, not as absence.
  function buildSeries(points, range) {
    if (!Array.isArray(points) || !points.length) return [];
    var byDay = {};
    points.forEach(function (p) { byDay[p.date] = Number(p.count) || 0; });
    var keys = Object.keys(byDay).sort();
    var start = window.moment(range && range.start ? range.start : keys[0]);
    var end = window.moment(range && range.end ? range.end : keys[keys.length - 1]);
    if (!start.isValid() || !end.isValid()) return [];
    var out = [];
    for (var d = start.clone(); !d.isAfter(end); d.add(1, 'day')) {
      var k = d.format('YYYY-MM-DD');
      out.push({ x: k, y: byDay[k] || 0 });
    }
    return out;
  }

  function drawEntries(points) {
    var host = $(S.entriesChart);
    if (!host) return;                                  // Display Chart is off
    var canvas = installCanvas(host, { role: 'img', 'aria-label': 'Entries over time chart' });
    if (!canvas || !window.Chart) return;
    var series = buildSeries(points, entriesRange());
    var i18n = (HARVEST.meta.localized && HARVEST.meta.localized.i18n) || {};
    destroyChart('entries');
    charts.entries = new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: [{
        data: series,
        label: i18n.entries || 'Entries',
        borderColor: ENTRY_COLORS.stroke,
        backgroundColor: ENTRY_COLORS.fill,
        pointBackgroundColor: ENTRY_COLORS.point,
        hoverBorderColor: ENTRY_COLORS.hoverStroke,
        hoverBackgroundColor: ENTRY_COLORS.hoverStroke,
        borderWidth: 2, pointRadius: 3, pointBorderWidth: 1,
        cubicInterpolationMode: 'monotone', fill: true
      }] },
      options: {
        maintainAspectRatio: false, responsive: true, animation: false, clip: false,
        scales: {
          x: { type: 'time', reverse: false,
               time: { unit: 'day', tooltipFormat: (HARVEST.meta.localized || {}).dateFormat || 'MMMM D, YYYY' },
               ticks: { font: { size: 13 }, color: '#787c82', padding: 10,
                        minRotation: 25, maxRotation: 25, callback: formatXTick } },
          y: { beginAtZero: true, grace: '50%',
               ticks: { precision: 0, maxTicksLimit: 6, padding: 20, font: { size: 13 } } }
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true, displayColors: false } }
      }
    });
  }

  function entriesConfig() { return readConfig(S.entriesChart) || { graph: [], activeGraph: [] }; }
  function hasActiveScope() { return $$(S.graphBtn + '.' + C.active).length > 0; }

  function hydrateEntries() {
    var cfg = entriesConfig();
    drawEntries(hasActiveScope() ? cfg.activeGraph : cfg.graph);
  }

  // ── Payments chart ──────────────────────────────────────────────────────
  // SOURCE: assets/js/admin/dashboard/modules/payments-helpers.min.js
  var rightEdgePlugin = {
    id: 'wpformsPaymentsRightEdge',
    afterDraw: function (chart) {
      var ctx = chart.ctx, area = chart.chartArea;
      ctx.save(); ctx.beginPath(); ctx.lineWidth = 1;
      ctx.strokeStyle = window.Chart.defaults.borderColor;
      ctx.moveTo(area.right, area.top); ctx.lineTo(area.right, area.bottom);
      ctx.stroke(); ctx.restore();
    }
  };
  function processData(series) {
    var labels = [], data = [];
    if (series && Object.keys(series).length) {
      Object.keys(series).forEach(function (k) {
        var pt = series[k];
        var m = window.moment(pt.day);
        labels.push(m);
        data.push({ x: m, y: (pt && pt.count) || 0 });
      });
    }
    return { labels: labels, datasets: data };
  }
  function isSeriesEmpty(series) {
    if (!series || !Object.keys(series).length) return true;
    return Object.keys(series).every(function (k) { return Number((series[k] && series[k].count) || 0) === 0; });
  }
  function paymentColors(report) {
    var map = (HARVEST.meta.localized && HARVEST.meta.localized.paymentsColors) || {};
    return map[report] || map.default || { borderColor: '#e27730', backgroundColor: '#fcf1ea' };
  }
  function isAmountReport(report) {
    var tile = $('button[data-stats="' + report + '"]');
    return !!(tile && tile.classList.contains('is-amount'));
  }
  var amountFormatter = null;
  function getAmountFormatter() {
    if (!amountFormatter) {
      var cfg = readConfig(S.paymentsGraph) || {};
      var dec = (HARVEST.meta.localized || {}).paymentsDecimals;
      dec = (dec === null || dec === undefined) ? 2 : dec;
      amountFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency', currency: cfg.currency || 'USD', currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: dec, maximumFractionDigits: dec
      });
    }
    return amountFormatter;
  }
  function formatYTick(value, formatter) {
    if (formatter) return formatter.format(value);
    return Math.floor(value) === value ? value : undefined;
  }

  function drawPayments(report, series) {
    var host = $(S.paymentsGraph);
    if (!host) return;
    var canvas = installCanvas(host, { id: 'wpforms-dashboard-payments-overview-canvas',
                                       role: 'img', 'aria-label': 'Payments over time chart' });
    if (!canvas || !window.Chart) return;
    var empty = isSeriesEmpty(series);
    toggleClass($(S.paymentsRoot + ' .wpforms-overview-chart-notice'), C.hide, !empty);
    var processed = processData(series);
    var colors = paymentColors(report);
    var isAmt = isAmountReport(report);
    destroyChart('payments');
    charts.payments = new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: processed.labels, datasets: [{
        data: processed.datasets, borderWidth: 2, pointRadius: 4, pointBorderWidth: 1,
        pointBackgroundColor: '#ffffff', borderColor: colors.borderColor,
        backgroundColor: colors.backgroundColor, fill: true, tension: 0.4
      }] },
      options: {
        maintainAspectRatio: false, responsive: true, animation: false,
        layout: { padding: { top: 10, right: 20, bottom: 5 } },
        scales: {
          x: { type: 'timeseries', reverse: false,
               ticks: { padding: 10, font: { size: 13 }, minRotation: 25, maxRotation: 25, callback: formatXTick } },
          y: { beginAtZero: true,
               ticks: { maxTicksLimit: 6, padding: 20, font: { size: 13 },
                        callback: function (v) { return formatYTick(v, isAmt ? getAmountFormatter() : null); } } }
        },
        elements: { line: { tension: 0.4, fill: true } },
        plugins: { legend: { display: false }, tooltip: { displayColors: false } }
      },
      plugins: [rightEdgePlugin]
    });
  }

  function hydratePayments() {
    var cfg = readConfig(S.paymentsGraph);
    if (!cfg) return;
    var selectedTile = $(S.paymentsTile + '.' + C.selected);
    var report = (selectedTile && selectedTile.getAttribute('data-stats')) || cfg.graph_report || 'total_sales';
    payState.report = report;
    payState.cache = {};
    payState.cache[cfg.graph_report || report] = cfg.graph || [];
    var harvested = (HARVEST.states.P1 && HARVEST.states.P1.reports) || {};
    Object.keys(harvested).forEach(function (k) { if (!payState.cache[k]) payState.cache[k] = harvested[k]; });
    drawPayments(report, payState.cache[report] || []);
  }

  // ── Top Locations donut ─────────────────────────────────────────────────
  // SOURCE: assets/js/admin/dashboard/modules/widget-locations.min.js
  // The full country list, its palette and the donut total all ride in
  // data-config, so exclude/limit is recomputed here exactly as the product
  // does it — no AJAX, nothing fabricated.
  function locVisible() {
    var all = locState.all || [], excluded = locState.excluded || [],
        n = locState.number, palette = locState.palette || [];
    return all.filter(function (c) { return excluded.indexOf(c.code) === -1 && excluded.indexOf(c.name) === -1; })
              .slice(0, n)
              .map(function (c, i) { var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; });
                                     o.color = palette[i % palette.length]; return o; });
  }
  function fmtInt(v) { return new Intl.NumberFormat().format(Number(v) || 0); }
  function fmtShare(v) { return Math.round(Number(v) || 0) + '%'; }
  function renderLocTable(rows) {
    var body = $(S.locationsBody);
    if (!body) return;
    body.innerHTML = rows.map(function (r) {
      return '\n\t\t\t\t<tr>\n\t\t\t\t\t<td class="wpforms-dashboard-widget-locations-col-country">\n' +
             '\t\t\t\t\t\t<span class="wpforms-dashboard-widget-locations-dot" style="background-color: ' + r.color + ';"></span>' + esc(r.name) +
             '\n\t\t\t\t\t</td>\n\t\t\t\t\t<td class="wpforms-dashboard-widget-locations-col-share">' + fmtShare(r.share) + '</td>' +
             '\n\t\t\t\t\t<td class="wpforms-dashboard-widget-locations-col-visitors">' + fmtInt(r.visitors) + '</td>\n\t\t\t\t</tr>';
    }).join('');
  }
  function drawLocations(rows) {
    rows = rows || locVisible();
    var host = $(S.locationsRoot);
    var canvasHost = host && host.querySelector('.wpforms-dashboard-widget-locations-chart-canvas');
    var canvas = installCanvas(canvasHost || host, { role: 'img', 'aria-label': 'Top locations chart' });
    if (canvas && !canvas.classList.contains('wpforms-dashboard-widget-locations-donut')) {
      canvas.classList.add('wpforms-dashboard-widget-locations-donut');
    }
    var total = $(S.locationsTotal);
    if (total) total.textContent = fmtInt(locState.donutTotal);
    if (!canvas || !window.Chart) return;
    var data = { labels: rows.map(function (r) { return r.name; }),
                 datasets: [{ data: rows.map(function (r) { return r.visitors; }),
                              backgroundColor: rows.map(function (r) { return r.color; }),
                              borderColor: '#f6f6f6', borderWidth: rows.length > 1 ? 2 : 0 }] };
    if (charts.locations) { charts.locations.data = data; charts.locations.update(); return; }
    charts.locations = new window.Chart(canvas.getContext('2d'), {
      type: 'doughnut', data: data,
      options: { cutout: '50%', animation: false, maintainAspectRatio: false, responsive: true,
                 plugins: { legend: { display: false } } }
    });
  }
  function hydrateLocations() {
    var cfg = readConfig(S.locationsRoot);
    if (!cfg) return;
    locState = cfg;
    locState.excluded = Array.isArray(cfg.excluded) ? cfg.excluded.filter(Boolean) : [];
    drawLocations();
  }

  // ── thawing capture's frozen inline hiding ──────────────────────────────
  // capture.js inlines computed styles, and for anything hidden at capture time
  // that means a literal style="display: none" on the node. An inline
  // declaration beats the class rule underneath, so removing `wpforms-hide`
  // (or clearing the `hidden` attribute) leaves the element laid out at 0x0 —
  // present, class-correct, and completely invisible. That is the rf 20 / rf 22
  // family, and it was measured here on all four of:
  //   .wpforms-dashboard-widget-settings          (gear popovers)
  //   .wpforms-dashboard-widget-settings-reset    (reset arrows)
  //   .wpforms-dashboard-widget-entries-graph-reset (the red X)
  //   .wpforms-dash-widget-forms-list-hidden-el   (payment rows 6-10)
  //
  // Removing the inline declaration is safe and is NOT the same as forcing the
  // element visible: each one still has a real rule keeping it hidden
  // (`.wpforms-hidden{display:none!important}`, `.wpforms-hide{display:none}`,
  // `[hidden]`), so after thawing the product's own class/attribute toggles
  // govern — which is exactly what the film needs to drive.
  var THAW = [
    S.popover,
    S.reset,
    S.graphReset,
    S.datePopover,
    '.wpforms-dash-widget-forms-list-hidden-el',
    '.wpforms-overview-chart-notice'
  ].join(', ');
  function thaw(root) {
    $$(THAW, root || document).forEach(function (el) {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    });
  }

  // ── small DOM helpers ───────────────────────────────────────────────────
  function toggleClass(el, cls, on) { if (el) el.classList.toggle(cls, !!on); }
  function fire(el, type) {
    if (!el) return;
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  // ── gear popovers ───────────────────────────────────────────────────────
  // SOURCE: widget-settings.min.js onToggle()/closeAll() — the popover is
  // opened with a class AND the hidden property, and closed the same way.
  function closeAllGears(except) {
    $$(S.popover).forEach(function (p) {
      if (p === except) return;
      p.classList.remove(C.gearOpen);
      p.hidden = true;
    });
  }
  function openGear(name) {
    var root = widgetRoot(name);
    if (!root) throw new Error(TAG + ' no widget "' + name + '"');
    var pop = root.querySelector(S.popover);
    if (!pop) throw new Error(TAG + ' widget "' + name + '" has no settings popover');
    closeAllGears(pop);
    pop.classList.add(C.gearOpen);
    pop.hidden = false;
    applyFieldLocks(pop);
    return pop;
  }
  function closeGear(name) {
    var root = widgetRoot(name);
    var pop = root && root.querySelector(S.popover);
    if (pop) { pop.classList.remove(C.gearOpen); pop.hidden = true; }
  }
  function isGearOpen(name) {
    var root = widgetRoot(name);
    var pop = root && root.querySelector(S.popover);
    return !!(pop && pop.classList.contains(C.gearOpen) && !pop.hidden);
  }
  // SOURCE: widget-settings.min.js applyFieldLocks() — the entries "Number of
  // Forms" select is data-locked-by="forms" and greys out while any form is
  // ticked. Reproduced so the gear behaves on camera the way it does live.
  function applyFieldLocks(pop) {
    $$('.wpforms-dashboard-widget-settings-field[data-locked-by]', pop).forEach(function (sel) {
      var by = sel.getAttribute('data-locked-by');
      sel.disabled = $$('input[type="checkbox"][name="' + by + '[]"]:checked', pop).length > 0;
    });
  }

  /**
   * Set a native <select> inside a gear. The film must NOT try to open this
   * select — a native <select> cannot be opened by JS (anti-pattern #3); the
   * film pairs this with the faux-overlay pattern from `selectFromDropdown`
   * in videos/_shared/wpforms-interactions.js and calls this to commit.
   * `gearOptions()` hands the overlay the real option list.
   */
  function setGearSelect(name, field, value) {
    var root = widgetRoot(name);
    var sel = root && root.querySelector('select[name="' + field + '"]');
    if (!sel) throw new Error(TAG + ' no select "' + field + '" in widget "' + name + '"');
    sel.value = String(value);
    fire(sel, 'change');
    return sel.value;
  }
  function gearOptions(name, field) {
    var root = widgetRoot(name);
    var sel = root && root.querySelector('select[name="' + field + '"]');
    if (!sel) return [];
    return Array.prototype.map.call(sel.options, function (o) {
      return { value: o.value, label: (o.textContent || '').trim(), selected: o.selected };
    });
  }
  function tickGearBox(name, field, value, on) {
    var root = widgetRoot(name);
    var pop = root && root.querySelector(S.popover);
    if (!pop) throw new Error(TAG + ' no popover for "' + name + '"');
    var box = value == null
      ? pop.querySelector('input[type="checkbox"][name="' + field + '"]')
      : pop.querySelector('input[type="checkbox"][name="' + field + '[]"][value="' + value + '"]');
    if (!box) throw new Error(TAG + ' no checkbox ' + field + (value == null ? '' : '[' + value + ']') + ' in "' + name + '"');
    box.checked = on === undefined ? !box.checked : !!on;
    fire(box, 'change');
    applyFieldLocks(pop);
    return box.checked;
  }
  function showReset(name, on) {
    var root = widgetRoot(name);
    var btn = root && root.querySelector(S.reset);
    toggleClass(btn, C.hidden, !on);
  }

  // ── entries widget swap ─────────────────────────────────────────────────
  // The harvested HTML is the SERVER's own re-render of the widget for that
  // settings state (wpforms_dashboard_get_entries_widget_html). Replacing the
  // node and re-hydrating is what the product does; nothing is hand-built.
  function swapEntriesWidget(html) {
    if (!html) throw new Error(TAG + ' no harvested entries HTML for that state');
    var root = $(S.entriesRoot);
    if (!root) throw new Error(TAG + ' entries widget not in the DOM');
    destroyChart('entries');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var next = tmp.firstElementChild;
    root.parentNode.replaceChild(next, root);
    thaw(next);
    hydrateEntries();
    return next;
  }

  function saveEntriesGear(stateKey) {
    var st = HARVEST.states[stateKey];
    if (!st) throw new Error(TAG + ' unknown entries state "' + stateKey + '"');
    closeAllGears(null);
    swapEntriesWidget(st.entriesHtml);
    showReset('entries', stateKey !== 'E5');
    return st.settings;
  }
  function resetEntriesGear() { return saveEntriesGear('E5'); }

  /**
   * Render the entries widget for ANY reachable gear state.
   *
   * The gear offers eight Number-of-Forms values and a 10-of-53 form checklist,
   * so the combinations cannot be harvested one by one. v1 recorded four exact
   * combinations and the other six values silently did nothing on Save. Instead
   * capture harvests the server's own count=10 render once (E_TOP10: the widget
   * HTML plus every row keyed by form id, in the product's own order) and this
   * prunes that scaffold down. Pruning the server's markup is what the product
   * does; no row is hand-built here.
   *
   * A ticked form the server rendered no row for (it has no entries in the
   * range) contributes no row here either, which is the product's own outcome.
   */
  function setEntriesChartVisible(root, on) {
    var region = root && root.querySelector(S.entriesChart);
    if (on || !region) return;
    destroyChart('entries');
    region.parentNode.removeChild(region);
  }

  function applyEntriesGear(settings) {
    var top = HARVEST.states.E_TOP10;
    if (!top || !top.entriesHtml || !top.order) {
      throw new Error(TAG + ' E_TOP10 was not harvested — re-run capture/plans/wpforms-dashboard-tour.json');
    }
    var fields = (HARVEST.meta && HARVEST.meta.entriesFields) || {};
    var countName = fields.number || 'count';
    var chartName = fields.chart || '';
    var listName = String(fields.list || 'forms[]').replace(/\[\]$/, '');

    var picked = (settings[listName] || []).filter(Boolean).map(String);
    var order = top.order.map(String);
    var keep;
    if (picked.length) {
      // Ticking any form disables Number of Forms (the select is locked_by the
      // checklist), so the tick list wins and the count is ignored.
      keep = order.filter(function (id) { return picked.indexOf(id) !== -1; });
    } else {
      var n = parseInt(settings[countName], 10);
      keep = order.slice(0, n > 0 ? n : order.length);
    }

    var next = swapEntriesWidget(top.entriesHtml);
    var body = next.querySelector('.wpforms-dashboard-widget-entries-table tbody');
    if (body) {
      [].slice.call(body.querySelectorAll('tr')).forEach(function (tr) {
        var btn = tr.querySelector('[data-form-id]');
        var id = btn ? String(btn.getAttribute('data-form-id')) : null;
        if (!id || keep.indexOf(id) === -1) tr.parentNode.removeChild(tr);
      });
    }

    var chartOn = chartName ? String(settings[chartName]) !== '0' : true;
    setEntriesChartVisible(next, chartOn);

    // The scaffold is the server's count=10 render, so the popover it carries
    // reads 10 whatever was actually saved. Put the saved values back, or
    // reopening the gear contradicts the table it just produced.
    var pop2 = next.querySelector(S.popover);
    if (pop2) {
      var sel2 = pop2.querySelector('select[name="' + countName + '"]') ||
                 pop2.querySelector('select.wpforms-dashboard-widget-settings-field');
      if (sel2 && settings[countName] != null) sel2.value = String(settings[countName]);
      $$('input[type="checkbox"][name="' + listName + '[]"]', pop2).forEach(function (cb) {
        cb.checked = picked.indexOf(String(cb.value)) !== -1;
      });
      if (chartName) {
        var cbc = pop2.querySelector('input[type="checkbox"][name="' + chartName + '"]');
        if (cbc) cbc.checked = chartOn;
      }
      applyFieldLocks(pop2);
    }

    var defaults = (HARVEST.states.E5 && HARVEST.states.E5.settings) || {};
    var defaultChart = chartName ? String(defaults[chartName]) !== '0' : true;
    var isDefault = !picked.length &&
      String(settings[countName]) === String(defaults[countName]) &&
      chartOn === defaultChart;

    closeAllGears(null);
    showReset('entries', !isDefault);
    return { kept: keep, chart: chartOn };
  }

  /**
   * Which harvested state does the popover's CURRENT value set correspond to?
   * This is what lets a real click on Save drive the widget: the gear is read,
   * not the film's intent. An unharvested combination fails loudly and names
   * what capture actually recorded, rather than silently rendering the wrong
   * table.
   */
  var ENTRY_STATES = ['E2', 'E3', 'E4', 'E5'];
  function matchEntriesState(settings) {
    var norm = function (o) {
      var c = {};
      Object.keys(o).sort().forEach(function (k) {
        c[k] = Array.isArray(o[k]) ? o[k].filter(Boolean).slice().sort() : o[k];
      });
      return JSON.stringify(c);
    };
    // A locked field is a DISABLED field, and jQuery's serializeArray (which
    // the product uses) omits disabled fields — so ticking a form drops
    // `count` from the payload entirely and the server keeps its stored value.
    // Fill the gaps from the default state before comparing, or every
    // checklist save misses its harvested match.
    var fill = function (o) {
      var base = (HARVEST.states.E5 && HARVEST.states.E5.settings) || {};
      var full = {};
      Object.keys(base).forEach(function (k) { full[k] = base[k]; });
      Object.keys(o).forEach(function (k) { full[k] = o[k]; });
      return full;
    };
    var want = norm(fill(settings));
    for (var i = 0; i < ENTRY_STATES.length; i++) {
      var st = HARVEST.states[ENTRY_STATES[i]];
      if (st && st.settings && norm(fill(st.settings)) === want) return ENTRY_STATES[i];
    }
    return null;
  }

  // ── entries chart scope (row chart icon / red X) ────────────────────────
  // SOURCE: widget-entries.min.js setActive()/resetButtons()
  function resetGraphButtons() {
    $$(S.graphBtn).forEach(function (b) {
      b.classList.remove(C.active, C.hide);
      b.setAttribute('aria-pressed', 'false');
    });
    $$(S.graphReset).forEach(function (r) { r.classList.add(C.hide); });
  }
  function scopeChart(formId) {
    var btn = $(S.graphBtn + '[data-form-id="' + formId + '"]');
    if (!btn) throw new Error(TAG + ' no chart button for form ' + formId);
    var harvested = ((HARVEST.states.E1 && HARVEST.states.E1.forms) || [])
      .filter(function (f) { return String(f.formId) === String(formId); })[0];
    if (!harvested) throw new Error(TAG + ' form ' + formId + ' was not harvested — capture only recorded ' +
      ((HARVEST.states.E1 && HARVEST.states.E1.forms) || []).map(function (f) { return f.formId; }).join(', '));
    resetGraphButtons();
    btn.classList.add(C.active, C.hide);
    btn.setAttribute('aria-pressed', 'true');
    var cell = btn.closest('td');
    var x = cell && cell.querySelector(S.graphReset);
    if (x) x.classList.remove(C.hide);
    drawEntries(harvested.graph);
    return harvested;
  }
  function resetChartScope() {
    resetGraphButtons();
    drawEntries(entriesConfig().graph);
  }

  // ── payments tiles + gear ───────────────────────────────────────────────
  function selectPaymentTile(stats) {
    var tile = $(S.paymentsTile + '[data-stats="' + stats + '"]');
    if (!tile) throw new Error(TAG + ' no payments tile "' + stats + '"');
    $$(S.paymentsTile).forEach(function (t) { t.classList.remove(C.selected); });
    tile.classList.add(C.selected);
    payState.report = stats;
    var series = payState.cache[stats];
    if (!series) throw new Error(TAG + ' report "' + stats + '" was not harvested');
    drawPayments(stats, series);
    return stats;
  }
  // SOURCE: widget-payments.min.js onSettingsSaved()/applyRowVisibility() —
  // every payments gear effect is a client-side class toggle on markup that is
  // already in the DOM (the table always renders 10 rows and hides the tail).
  function savePaymentsGear() {
    var root = widgetRoot('payments');
    var pop = root.querySelector(S.popover);
    var settings = serializePopover(pop);
    closeAllGears(null);
    toggleClass($(S.paymentsGraph), C.hide, settings.display_graph === '0');
    toggleClass($(S.paymentsTiles), C.hide, settings.display_stat_cards === '0');
    var cards = Array.isArray(settings.cards) ? settings.cards : [];
    $$(S.paymentsTile).forEach(function (t) {
      t.classList.toggle(C.hide, cards.indexOf(t.getAttribute('data-stats')) === -1);
    });
    var n = parseInt(settings.number_of_payments, 10);
    if (n) {
      $$(S.paymentsTable + ' tbody tr').forEach(function (tr, i) {
        tr.classList.toggle(C.payRowHidden, i >= n);
      });
    }
    showReset('payments', !samePayload(settings, defaults.payments));
    return settings;
  }

  // ── locations gear ──────────────────────────────────────────────────────
  // SOURCE: widget-locations.min.js onSettingsSaved()/rerender()
  function saveLocationsGear() {
    var root = widgetRoot('locations');
    var pop = root.querySelector(S.popover);
    var settings = serializePopover(pop);
    closeAllGears(null);
    locState.number = parseInt(settings.number_of_countries, 10) || locState.number;
    locState.excluded = (Array.isArray(settings.excluded) ? settings.excluded : []).filter(Boolean);
    var rows = locVisible();
    renderLocTable(rows);
    drawLocations(rows);
    showReset('locations', !samePayload(settings, defaults.locations));
    return settings;
  }

  // SOURCE: widget-settings.min.js serialize() — jQuery serializeArray
  // semantics: document order, skip disabled, skip unchecked boxes, later name
  // wins (the `checkboxes` field type renders a hidden "0" before its "1").
  function serializePopover(pop) {
    var o = {};
    $$('input[name], select[name], textarea[name]', pop).forEach(function (el) {
      if (el.disabled) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var nm = el.name;
      if (nm.slice(-2) === '[]') { var k = nm.slice(0, -2); (o[k] = o[k] || []).push(el.value); }
      else o[nm] = el.value;
    });
    return o;
  }
  function samePayload(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  var defaults = { payments: null, locations: null };

  function resetGear(name) {
    if (name === 'entries') return resetEntriesGear();
    var root = widgetRoot(name);
    var pop = root.querySelector(S.popover);
    applyValues(pop, defaults[name] || {});
    if (name === 'payments') return savePaymentsGear();
    if (name === 'locations') return saveLocationsGear();
    throw new Error(TAG + ' no reset path for "' + name + '"');
  }
  // SOURCE: widget-settings.min.js applyValues()
  function applyValues(pop, values) {
    Object.keys(values || {}).forEach(function (name) {
      var v = values[name];
      var boxes = $$('input[type="checkbox"][name="' + name + '"], input[type="checkbox"][name="' + name + '[]"]', pop);
      if (boxes.length) {
        var list = Array.isArray(v) ? v : [v];
        boxes.forEach(function (b) { b.checked = list.indexOf(b.value) !== -1; });
      } else {
        var f = pop.querySelector('select[name="' + name + '"], input[name="' + name + '"]');
        if (f) f.value = v;
      }
    });
    applyFieldLocks(pop);
  }

  // ── date range ──────────────────────────────────────────────────────────
  // SOURCE: assets/pro/js/admin/dashboard/datepicker.min.js — the popover is
  // server-rendered and jQuery .toggle()'d; presets are radios; Apply submits
  // and calls updater.fetchStats(), i.e. AJAX + history.pushState, never a page
  // reload. The chrome (white card, shadow, position:absolute, width 416) lives
  // on .wpforms-datepicker-popover itself in admin.min.css, which capture
  // inlined — capture-gates' "stripped presentation" WARN points at the inner
  // -content div, which is position:static and transparent in the product too.
  function openDatePicker() {
    var pop = $(S.datePopover);
    if (!pop) throw new Error(TAG + ' no date popover in the DOM');
    pop.style.display = 'block';
    pop.setAttribute('aria-expanded', 'true');
    return pop;
  }
  function closeDatePicker() {
    var pop = $(S.datePopover);
    if (!pop) return;
    pop.style.display = 'none';
    pop.setAttribute('aria-expanded', 'false');
  }
  function datePresets() {
    return $$(S.dateForm + ' input[type="radio"]').map(function (r) {
      var label = r.closest('label');
      return { preset: r.dataset.preset || '', value: r.value, checked: !!r.checked, disabled: !!r.disabled,
               label: label ? (label.textContent || '').replace(/\s+/g, ' ').trim() : '' };
    });
  }
  // SOURCE: datepicker.min.js selectChoice() — the chosen label carries
  // .is-selected, which is what turns it orange.
  function pickRange(preset) {
    var radio = $(S.dateForm + ' input[type="radio"][data-preset="' + preset + '"]');
    if (!radio) throw new Error(TAG + ' no date preset "' + preset + '"');
    radio.checked = true;
    fire(radio, 'change');
    $$(S.dateForm + ' label').forEach(function (l) { l.classList.remove(C.selected); });
    var lab = radio.closest('label');
    if (lab) lab.classList.add(C.selected);
    return radio.value;
  }
  /**
   * Apply a harvested range: the whole page moves, exactly as the AJAX response
   * moves it — stat card values, entries widget HTML, locations widget HTML,
   * payments tiles + series, and the button label.
   * SOURCE: src/Pro/Admin/Dashboard/Ajax.php::get_stats() response shape.
   */
  function applyRange(preset) {
    closeDatePicker();
    // The range the page was captured at is not in the harvest — it IS the
    // frozen DOM. Snapshotting it at boot makes going back to it the same
    // operation as going to any other range.
    if (String(preset) === String(INITIAL.preset)) return restoreInitialRange();
    var st = (HARVEST.states.RANGES || {})[String(preset)];
    if (!st) throw new Error(TAG + ' range "' + preset + '" was not harvested — have ' +
      Object.keys(HARVEST.states.RANGES || {}).concat([String(INITIAL.preset) + ' (captured)']).join(', '));

    // stat cards — SOURCE: stat-cards.min.js update()/renderValue()
    Object.keys(st.stats || {}).forEach(function (key) {
      var host = $('[data-stat-card="' + key + '"] .wpforms-dashboard-stat-card-value');
      if (!host) return;
      var v = st.stats[key] || {};
      if (v.value_short) {
        host.innerHTML = '<span class="wpforms-dashboard-stat-card-value-full">' + esc(v.value) + '</span>' +
                         '<span class="wpforms-dashboard-stat-card-value-short" title="' + esc(v.value) + '">' + esc(v.value_short) + '</span>';
      } else {
        host.textContent = v.value == null ? '' : v.value;
      }
    });

    if (st.entriesHtml) swapEntriesWidget(st.entriesHtml);

    if (st.locationsHtml) {
      var lw = $(S.locationsWidget);
      if (lw) {
        destroyChart('locations');
        var tmp = document.createElement('div');
        tmp.innerHTML = st.locationsHtml;
        lw.parentNode.replaceChild(tmp.firstElementChild, lw);
        thaw($(S.locationsWidget));
        hydrateLocations();
      }
    }

    if (st.payments) {
      payState.cache = {};
      var rep = st.payments.graph_report || 'total_sales';
      payState.cache[rep] = st.payments.graph || [];
      payState.report = rep;
      $$(S.paymentsTile).forEach(function (t) { t.classList.toggle(C.selected, t.getAttribute('data-stats') === rep); });
      updatePaymentTiles(st.payments.tiles || {});
      drawPayments(rep, payState.cache[rep]);
    }

    var btn = $(S.dateButton);
    if (btn) btn.textContent = st.chosenFilter || st.label || btn.textContent;
    return st;
  }

  // SOURCE: widget-payments.min.js TILE_MAP + updateTilesFromCache()
  var TILE_MAP = { total_payments: 'total_payments', total_sales: 'total_sales', total_refunded: 'total_refunded',
                   total_subscription: 'new_subscriptions', total_renewal_subscription: 'renewals', total_coupons: 'coupons' };
  function splitTileValue(v) {
    if (v && typeof v === 'object') return { amount: String(v.amount || '0'), count: v.count == null ? null : v.count };
    var m = /^(.*?)(?:\(([\d,]+)\)|<span>\(?([\d,]+)\)?<\/span>)$/.exec(String(v));
    if (m) { var c = m[2] == null ? m[3] : m[2]; return { amount: m[1].trim(), count: parseInt(String(c).split(',').join(''), 10) }; }
    return { amount: String(v), count: null };
  }
  function countMarkup(c) {
    if (c === null) return '';
    return '<span class="wpforms-dashboard-widget-payments-tile-count">(' + new Intl.NumberFormat().format(c) + ')</span>';
  }
  function updatePaymentTiles(tiles) {
    $$(S.paymentsTile).forEach(function (tile) {
      var key = TILE_MAP[tile.getAttribute('data-stats')];
      if (!key || tiles[key] === undefined) return;
      var split = splitTileValue(tiles[key]);
      var valueEl = tile.querySelector('.statcard-value');
      if (valueEl) {
        var amount = tile.classList.contains('is-amount')
          ? getAmountFormatter().format(parseFloat(split.amount) || 0)
          : new Intl.NumberFormat().format(parseInt(String(split.amount).split(',').join(''), 10) || 0);
        valueEl.innerHTML = amount + countMarkup(split.count);
      }
      var delta = Number(tiles[key + '_delta']) || 0;
      var deltaEl = tile.querySelector('.statcard-delta');
      if (deltaEl) {
        deltaEl.textContent = Math.abs(delta);
        deltaEl.classList.remove('is-upward', 'is-downward');
        if (delta !== 0) deltaEl.classList.add(delta > 0 ? 'is-upward' : 'is-downward');
      }
    });
  }

  // ── the captured range, kept restorable ─────────────────────────────────
  var INITIAL = { preset: '', buttonText: '', entriesHtml: '', locationsHtml: '', statValues: {}, paymentsCfg: null };
  function captureInitialRange() {
    var checked = $(S.dateForm + ' input[type="radio"]:checked');
    INITIAL.preset = checked ? (checked.dataset.preset || '') : '';
    var btn = $(S.dateButton);
    INITIAL.buttonText = btn ? btn.textContent : '';
    var er = $(S.entriesRoot);
    INITIAL.entriesHtml = er ? er.outerHTML : '';
    var lw = $(S.locationsWidget);
    INITIAL.locationsHtml = lw ? lw.outerHTML : '';
    $$('[data-stat-card]').forEach(function (card) {
      var v = card.querySelector('.wpforms-dashboard-stat-card-value');
      if (v) INITIAL.statValues[card.getAttribute('data-stat-card')] = v.innerHTML;
    });
    INITIAL.paymentsCfg = readConfig(S.paymentsGraph);
    INITIAL.paymentsTilesHtml = (function () { var t = $(S.paymentsTiles); return t ? t.innerHTML : ''; })();
  }
  function restoreInitialRange() {
    Object.keys(INITIAL.statValues).forEach(function (k) {
      var v = $('[data-stat-card="' + k + '"] .wpforms-dashboard-stat-card-value');
      if (v) v.innerHTML = INITIAL.statValues[k];
    });
    if (INITIAL.entriesHtml) swapEntriesWidget(INITIAL.entriesHtml);
    if (INITIAL.locationsHtml) {
      var lw = $(S.locationsWidget);
      if (lw) {
        destroyChart('locations');
        var tmp = document.createElement('div');
        tmp.innerHTML = INITIAL.locationsHtml;
        lw.parentNode.replaceChild(tmp.firstElementChild, lw);
        thaw($(S.locationsWidget));
        hydrateLocations();
      }
    }
    var tiles = $(S.paymentsTiles);
    if (tiles && INITIAL.paymentsTilesHtml) { tiles.innerHTML = INITIAL.paymentsTilesHtml; thaw(tiles); }
    hydratePayments();
    var btn = $(S.dateButton);
    if (btn) btn.textContent = INITIAL.buttonText;
    return { preset: INITIAL.preset, restored: true };
  }

  // ── event bindings ──────────────────────────────────────────────────────
  // Mirrors the plugin's own delegated bindings (widget-settings.min.js
  // bindEvents(), widget-entries.min.js bindEvents(), widget-payments.min.js
  // bindEvents(), pro datepicker.min.js bindEvents()) so a REAL click on a REAL
  // node drives the DOM. The film's Cursor still has to dispatch a MouseEvent —
  // Cursor.click() is visual-only (rulebook fuf 1 / cpa 1).
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;

      var cog = t.closest(S.cog);
      if (cog) {
        e.preventDefault(); e.stopPropagation();
        var w = cog.closest(S.widget);
        var name = w && w.getAttribute('data-widget');
        if (name) { isGearOpen(name) ? closeGear(name) : openGear(name); }
        return;
      }

      var save = t.closest(S.save);
      if (save) {
        e.preventDefault();
        var sw = save.closest(S.widget).getAttribute('data-widget');
        if (sw === 'entries') {
          applyEntriesGear(serializePopover(save.closest(S.popover)));
        } else if (sw === 'payments') savePaymentsGear();
        else if (sw === 'locations') saveLocationsGear();
        return;
      }

      var reset = t.closest(S.reset);
      if (reset) {
        e.preventDefault();
        resetGear(reset.closest(S.widget).getAttribute('data-widget'));
        return;
      }

      var gb = t.closest(S.graphBtn);
      if (gb) { e.preventDefault(); scopeChart(gb.getAttribute('data-form-id')); return; }
      if (t.closest(S.graphReset)) { e.preventDefault(); resetChartScope(); return; }

      var tile = t.closest(S.paymentsTile);
      if (tile && !tile.classList.contains(C.selected)) { e.preventDefault(); selectPaymentTile(tile.getAttribute('data-stats')); return; }

      if (t.closest(S.dateButton)) {
        e.preventDefault(); e.stopPropagation();
        var dp = $(S.datePopover);
        if (dp && getComputedStyle(dp).display !== 'none') closeDatePicker(); else openDatePicker();
        return;
      }
      // Apply — SOURCE: datepicker.min.js handleDatepickerSubmit()
      var apply = t.closest(S.dateForm + ' button[type="submit"], ' + S.dateForm + ' input[type="submit"]');
      if (apply) {
        e.preventDefault();
        var checked = $(S.dateForm + ' input[type="radio"]:checked');
        if (checked) applyRange(checked.dataset.preset || '');
        return;
      }
      var presetLabel = t.closest(S.dateForm + ' label');
      if (presetLabel) {
        var radio = presetLabel.querySelector('input[type="radio"]');
        if (radio && !radio.disabled) { pickRange(radio.dataset.preset || ''); }
        return;
      }

      // click-outside closes both kinds of popover
      if (!t.closest(S.popover) && !t.closest(S.cog)) closeAllGears(null);
      if (!t.closest(S.datePopover) && !t.closest(S.dateButton)) closeDatePicker();
    }, true);

    // Keep the locked-field state honest as boxes are ticked.
    document.addEventListener('change', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      var pop = t && t.closest(S.popover);
      if (pop) applyFieldLocks(pop);
    }, true);
  }

  // ── boot ────────────────────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { res(src); };
      s.onerror = function () { rej(new Error(TAG + ' could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function hydrateAll() {
    hydrateEntries();
    hydratePayments();
    hydrateLocations();
    var leftovers = $$(S.raster).filter(function (i) { return i.offsetParent !== null; });
    if (leftovers.length) {
      console.error(TAG + ' ' + leftovers.length + ' visible img[data-from-canvas] survived hydration — a chart region is still a dead raster');
    }
  }

  function boot() {
    HARVEST = readHarvest();
    // Snapshot the shipped defaults so "Reset to Default Settings" has a real
    // target for the two widgets whose reset is client-side.
    ['payments', 'locations'].forEach(function (w) {
      var root = widgetRoot(w);
      var pop = root && root.querySelector(S.popover);
      if (pop) defaults[w] = serializePopover(pop);
    });
    thaw();
    captureInitialRange();
    bindEvents();

    var chain = window.moment ? Promise.resolve() : loadScript(MOMENT_SRC);
    chain
      .then(function () { return window.Chart ? null : loadScript(CHART_SRC); })
      .then(function () {
        // The Entries and Payments charts use time / timeseries scales, which
        // Chart.js cannot render without a date adapter. WPForms pairs
        // chart.min.js with chartjs-adapter-moment (Page.php ~line 252).
        var adapters = window.Chart && window.Chart._adapters && window.Chart._adapters._date;
        if (adapters && typeof adapters.parse === 'function' && adapters.override) return null;
        return loadScript(ADAPTER_SRC);
      })
      .then(function () {
        hydrateAll();
        readyResolve(api);
        document.documentElement.setAttribute('data-wpf-dash-hydrated', '1');
      })
      .catch(function (e) {
        console.error(TAG + ' boot failed:', e && e.message ? e.message : e);
        document.documentElement.setAttribute('data-wpf-dash-hydrated', 'error');
        readyResolve(api);
      });
  }

  var api = {
    ready: function () { return readyPromise; },
    harvest: function () { return HARVEST; },
    charts: charts,
    // gears
    openGear: openGear, closeGear: closeGear, closeAllGears: closeAllGears, isGearOpen: isGearOpen,
    setGearSelect: setGearSelect, gearOptions: gearOptions, tickGearBox: tickGearBox,
    saveEntriesGear: saveEntriesGear, applyEntriesGear: applyEntriesGear,
    savePaymentsGear: savePaymentsGear, saveLocationsGear: saveLocationsGear,
    resetGear: resetGear, showReset: showReset, serializePopover: serializePopover,
    // entries chart scope
    scopeChart: scopeChart, resetChartScope: resetChartScope,
    // payments
    selectPaymentTile: selectPaymentTile,
    // locations
    locationsVisible: function () { return locVisible(); },
    // date range
    openDatePicker: openDatePicker, closeDatePicker: closeDatePicker,
    datePresets: datePresets, pickRange: pickRange, applyRange: applyRange,
    matchEntriesState: matchEntriesState,
    initialRange: function () { return INITIAL.preset; },
    // diagnostics
    rehydrate: hydrateAll
  };
  window.WPFormsDash = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
