/**
 * snapshots/_shared/survey-reporting.js
 *
 * Chart rehydration for WPForms Surveys & Polls reporting snapshots.
 *
 * WHY THIS EXISTS
 * ---------------
 * The survey graph is a Chart.js <canvas>. Canvas pixels are not serializable,
 * so capture.js rasterizes the canvas into a data:image/png and drops the
 * canvas — silently. The frozen snapshot then looks right in a still and is
 * dead in every other respect: no hover tooltips, no responsive width (a raster
 * only blurs when stretched), and nothing a film can animate as DOM.
 *
 * Umair, 2026-08-19: "why is the png file here, remove it delete it. Because if
 * you see an image file, you'll start making slides type animations using this."
 *
 * HOW IT WORKS
 * ------------
 * At capture time an eval step reads the LIVE Chart.js instance's own config off
 * the canvas (type / labels / datasets / scales) and parks it on
 * <body data-wpf-charts>. Nothing here is reconstructed by hand — the config is
 * the product's. This module swaps the dead <img> back for a real <canvas> and
 * re-inits Chart.js from that JSON.
 *
 * Capture step lives in capture/ranking-chart-plan.json. Library vendored at
 * snapshots/_shared/lib/chart.min.js (Chart.js v4.5.1, the version WPForms
 * ships at wpforms/assets/lib/chart.min.js).
 *
 * R11 NOTE: this restores the snapshot's own truth. Video beats must NOT hand
 * their motion to Chart.js animation — films animate on the master GSAP
 * timeline so --seek render parity holds (INV-9). `animation: false` below is
 * deliberate for that reason.
 *
 * Determinism: no Date.now(), no Math.random(), no fetch, no timers.
 */
(function () {
  'use strict';

  var LIB = '../_shared/lib/chart.min.js';
  var CHART_HOST = '.wpforms-survey-graph-content-chart';

  function readConfigs() {
    var raw = document.body && document.body.getAttribute('data-wpf-charts');
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.err) console.warn('[survey-reporting] capture reported:', parsed.err);
      return parsed && parsed.charts && parsed.charts.length ? parsed.charts : null;
    } catch (e) {
      console.warn('[survey-reporting] config parse failed:', e.message);
      return null;
    }
  }

  // Swap the baked raster for a live canvas. Returns the canvas, or null when
  // there is nothing to rehydrate.
  function installCanvas(host) {
    if (!host) return null;
    var existing = host.querySelector('canvas');
    if (existing) return existing;
    var img = host.querySelector('img');

    // Measure the raster BEFORE removing it. The host derives its height from
    // its content, so swapping the img for a height:100% canvas collapses the
    // box (measured: 397px -> 264px). Pin the captured height instead, and let
    // width go fluid — that is what makes the graph fill its column, which a
    // 705px raster in a 653px host never could without blurring.
    // The baked raster is deleted from the markup outright (Umair 2026-08-19:
    // "remove it delete it" — an image file in the DOM invites slide-style
    // animation and hides the fact that a live region went dead). Its captured
    // height is preserved on the host as data-wpf-chart-h so layout is unchanged.
    var h = parseInt(host.getAttribute('data-wpf-chart-h'), 10) || 0;
    if (!h && img) {
      var box = img.getBoundingClientRect();
      h = Math.round(box.height) || img.naturalHeight || 0;
    }
    if (!h) h = Math.round(host.getBoundingClientRect().height) || 320;

    var canvas = document.createElement('canvas');
    canvas.className = 'wpforms-survey-graph-canvas';
    canvas.style.cssText = 'width:100%;height:' + h + 'px;display:block;';
    if (img) img.parentNode.replaceChild(canvas, img);
    else host.appendChild(canvas);
    return canvas;
  }

  function buildConfig(spec) {
    var scales = {};
    Object.keys(spec.scales || {}).forEach(function (k) {
      var s = spec.scales[k] || {};
      var out = {};
      if (s.reverse) out.reverse = true;
      if (s.min !== undefined && s.min !== null) out.min = s.min;
      if (s.max !== undefined && s.max !== null) out.max = s.max;
      if (s.ticks) out.ticks = { stepSize: s.ticks.stepSize, color: s.ticks.color };
      if (s.grid) out.grid = { display: s.grid.display, color: s.grid.color };
      scales[k] = out;
    });

    return {
      type: spec.type || 'line',
      data: { labels: spec.labels || [], datasets: (spec.datasets || []).map(function (d) {
        var ds = {};
        Object.keys(d).forEach(function (k) { if (d[k] !== undefined && d[k] !== null) ds[k] = d[k]; });
        return ds;
      }) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Deliberate (R11): the film owns motion on the GSAP timeline. A
        // self-animating chart would break --seek render parity.
        animation: false,
        scales: scales,
        plugins: {
          legend: { display: false },
          tooltip: {
            // Plugin parity: ranking tooltips show the raw average rank
            // (admin-survey-reporting-charts.js — callbacks.label => item.raw).
            callbacks: { label: function (item) { return item.raw; } },
          },
        },
        interaction: { mode: 'nearest', intersect: false },
      },
    };
  }

  function rehydrate() {
    var specs = readConfigs();
    if (!specs) return;
    var hosts = Array.prototype.slice.call(document.querySelectorAll(CHART_HOST));
    if (!hosts.length) return;

    specs.forEach(function (spec, i) {
      var host = hosts[i] || hosts[0];
      var canvas = installCanvas(host);
      if (!canvas || !window.Chart) return;
      try {
        new window.Chart(canvas, buildConfig(spec));
      } catch (e) {
        console.warn('[survey-reporting] chart init failed:', e.message);
      }
    });
  }

  // ─── Graph context menus: Export / Filters / settings cog ───────────────
  // Each button lives in a .wpforms-survey-graph-context-menu wrapper holding a
  // .wpforms-survey-graph-menu that capture froze with inline visibility:hidden.
  // The menu CONTENT is fully captured (290x376 / 290x99 / 290x392) — real
  // markup, just hidden. So this is a visibility toggle, not a rebuild.
  var MENU_WRAP = '.wpforms-survey-graph-context-menu';
  var MENU = '.wpforms-survey-graph-menu';

  var MENU_OPEN_CLASS = 'wpforms-survey-graph-menu-opened';

  // The plugin opens a menu with a CLASS, per its own CSS:
  //   .wpforms-survey-graph-context-menu .wpforms-survey-graph-menu
  //       { visibility: hidden; opacity: 0 }
  //   .wpforms-survey-graph-context-menu .wpforms-survey-graph-menu-opened
  //       { visibility: visible; opacity: 1; z-index: 10 }
  //
  // Capture froze `style="visibility: hidden"` INLINE on the menu and its
  // content. Inline declarations beat the class rule, so adding the class alone
  // does nothing — the frozen inline style has to be removed as well. An
  // earlier version of this function set inline visibility directly and never
  // touched opacity, so the menu stayed at opacity 0 and read as "not working".
  function setMenuOpen(wrap, open) {
    if (!wrap) return;
    var menu = wrap.querySelector(MENU);
    if (!menu) return;

    // …but the class alone is not sufficient in a FROZEN snapshot. Both rules
    // carry identical specificity (two classes each) and neither is !important,
    // so source order decides — and in the captured CSS the `hidden` rule lands
    // LAST, so it wins over `-opened` regardless of what we add. Only an inline
    // declaration beats it. Set both properties inline; setting `visibility`
    // without `opacity` (the first attempt here) leaves the menu at opacity 0 —
    // laid out, on screen, and completely invisible, which is exactly what
    // "cog and export not working" looked like.
    menu.classList.toggle(MENU_OPEN_CLASS, !!open);
    wrap.classList.toggle('wpforms-survey-graph-context-menu-open', !!open);

    // The captured CSS puts `transition: all 0.3s` on this menu, so opacity
    // ramps rather than snapping. Two reasons to suppress it here:
    //   1. Robustness — a transition only advances while the page is
    //      compositing. In a throttled/hidden tab it never progresses and the
    //      menu stays at opacity 0 forever: open in the DOM, invisible on
    //      screen. Same hazard class as INV-17's RAF deadlock.
    //   2. R11 — the film owns motion on the GSAP timeline; a stray CSS
    //      transition inside the snapshot competes with it and is not
    //      seek-deterministic.
    // State here is instantaneous and total. Motion is the film's job.
    menu.style.setProperty('transition', 'none', 'important');

    if (open) {
      menu.style.setProperty('visibility', 'visible', 'important');
      menu.style.setProperty('opacity', '1', 'important');
    } else {
      menu.style.removeProperty('visibility');
      menu.style.removeProperty('opacity');
    }

    unfreezeMenuSubtree(menu);
  }

  // Capture stamps the frozen `visibility: hidden` onto EVERY element inside a
  // hidden menu, not just its container — measured: 32 of 33 descendants
  // (labels, ul, li, radio inputs, footer buttons) each carry
  // style="visibility: hidden". So revealing only the container yields an
  // empty box: correct size, correct layout, nothing drawn inside. That is
  // exactly what "Export, Filters, cog open but are empty" looked like.
  //
  // These inline declarations are redundant once the container governs the
  // subtree, so strip them permanently on first open rather than toggling each
  // one. Idempotent via a data flag.
  // Clearing the inline value alone is NOT enough. The captured CSS puts
  // `transition: all` on this subtree, and a visibility transition only steps
  // while the page composites — in a throttled tab the computed value stays
  // pinned at `hidden` forever even with no inline style and no matching rule
  // (measured: li with inline "(none)", zero matching rules, computed hidden).
  // So kill the transition and assert the value, subtree-wide.
  //
  // The minicolor colour-picker popup is deliberately excluded: it is a popup
  // that is *supposed* to stay closed, and forcing it visible would show UI the
  // product only shows on demand.
  var KEEP_HIDDEN = '.wpforms-survey-minicolor, .wpforms-survey-minicolor-wrapper, .wpforms-survey-minicolor-input, .wpforms-survey-open-minicolor, .wpforms-survey-graph-menu-modal';

  function unfreezeMenuSubtree(menu) {
    if (!menu || menu.dataset.wpfUnfrozen) return;
    menu.dataset.wpfUnfrozen = '1';
    Array.prototype.forEach.call(menu.querySelectorAll('*'), function (n) {
      n.style.removeProperty('opacity');
      n.style.setProperty('transition', 'none', 'important');
      if (n.closest(KEEP_HIDDEN)) { n.style.removeProperty('visibility'); return; }
      n.style.setProperty('visibility', 'visible', 'important');
    });
  }

  function isMenuOpen(wrap) {
    var menu = wrap && wrap.querySelector(MENU);
    return !!(menu && menu.classList.contains(MENU_OPEN_CLASS));
  }

  function closeAllMenus(except) {
    Array.prototype.forEach.call(document.querySelectorAll(MENU_WRAP), function (w) {
      if (w !== except) setMenuOpen(w, false);
    });
  }

  function initMenus() {
    document.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;

      var btn = t.closest('.wpforms-survey-graph-button');
      if (btn) {
        var wrap = btn.closest(MENU_WRAP);
        if (wrap) {
          e.preventDefault();
          var wasOpen = isMenuOpen(wrap);
          closeAllMenus(wrap);
          setMenuOpen(wrap, !wasOpen);
          return;
        }
      }

      // Explicit close affordance, then click-outside.
      if (t.closest('.wpforms-survey-graph-menu-modal-close')) {
        closeAllMenus(null);
        return;
      }
      if (!t.closest(MENU)) closeAllMenus(null);
    });
  }

  // ─── Cross-snapshot nav: handled by interactivity.js, NOT here ──────────
  // "View Survey Results" routing lives in interactivity.js's
  // adminSnapshotSlugFor via <body data-wpf-nav-map>. An earlier version of
  // this file added its own click handler; that lost every time, because
  // interactivity.js swaps the document ASYNCHRONOUSLY (fetch-based spaSwap),
  // so preventDefault/stopPropagation on a competing listener changes nothing.
  // Two mechanisms racing for the same click is the bug, not the ordering —
  // one owner, declared per snapshot. See lessons entry 15.

  function boot() {
    if (!document.querySelector(CHART_HOST)) return;   // not a reporting snapshot
    initMenus();
    if (window.Chart) { rehydrate(); return; }
    var s = document.createElement('script');
    s.src = LIB;
    s.onload = rehydrate;
    s.onerror = function () { console.warn('[survey-reporting] could not load ' + LIB); };
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
