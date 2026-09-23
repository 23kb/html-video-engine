/**
 * products/_runtime/charts.js — the optional charts add-on (WO-202F, DESIGN §6).
 *
 * capture.js turns every <canvas> into a data-URI <img data-from-canvas>:
 * canvas pixels are not in outerHTML. A raster is dead. It keeps the width it
 * had at capture, so a wider screen shows it at part of its container, and it
 * can never redraw. This add-on puts a live <canvas> back where the image
 * was and draws the product's own Chart.js config on it.
 *
 * Load: core's SnapRuntime.chart() loads this file through core's generic
 * library loader, SnapRuntime.lib() (one classic <script> each, in order,
 * once per page), right after the product's own chart library, on the first
 * chart call only. A snapshot with no chart never loads it. Product-blind: the
 * library's global, its files and the config all come from the caller.
 *
 *   SnapCharts.render(host, config, { global, id }) -> chart | null
 *
 *   host    the element that holds the frozen image, or the image itself, or
 *           the live canvas an earlier call made (a selector string works too).
 *   config  the product's Chart.js config — or a function that returns it,
 *           called now that the library is loaded (a config that builds its
 *           labels with the library's date helper needs that).
 *   global  the constructor's name on window. Default 'Chart'.
 *   id      the canvas id the product gave it. The raster kept the class, not
 *           the id, so the caller restores it.
 *
 * The first call swaps the image for a <canvas> in the same container and
 * creates the chart. A later call on the same host redraws that chart: new
 * data and options, then update() — what a plugin does after an AJAX answer.
 * A config of another chart type rebuilds it on the same canvas.
 *
 * Determinism (DESIGN §9): `responsive: true` and `animation: false` are
 * forced. A film or a frame-stepped probe sees the same pixels on every run;
 * a film that wants the chart to move animates it on its own timeline. No
 * clock, no random, no network, no timers here.
 */
(function () {
  'use strict';

  // Loaded twice (a second chart call racing the first) must be a no-op.
  if (window.SnapCharts) return;

  var LIVE = 'data-snap-chart';
  var FROZEN = 'img[data-from-canvas]';

  function is(el, sel) {
    try { return !!el && !!el.matches && el.matches(sel); } catch (_) { return false; }
  }
  function inside(el, sel) {
    if (is(el, sel)) return el;
    try { return el.querySelector(sel); } catch (_) { return null; }
  }

  // The live canvas for host: the one an earlier call made, or a new one in
  // the frozen image's place. It takes the image's class, the id the caller
  // passes, and the image's captured height: a container that takes its
  // height from its content keeps it, and a fixed-height container still
  // wins, because Chart.js sizes the canvas to its container's content box.
  // The image is removed, never left beside the canvas.
  function canvasFor(host, id) {
    var live = inside(host, 'canvas[' + LIVE + ']');
    if (live) return live;
    var img = inside(host, FROZEN);
    if (!img || !img.parentNode) return null;
    var canvas = document.createElement('canvas');
    if (img.className) canvas.className = img.className;
    if (id) canvas.id = id;
    var h = parseFloat(img.style.height);
    if (h > 0) canvas.style.height = h + 'px';
    canvas.setAttribute(LIVE, '');
    img.parentNode.replaceChild(canvas, img);
    return canvas;
  }

  function render(host, config, opts) {
    var o = opts || {};
    var Lib = window[o.global || 'Chart'];
    var node = typeof host === 'string' ? document.querySelector(host) : host;
    if (!node || node.nodeType !== 1 || typeof Lib !== 'function') return null;
    var cfg = typeof config === 'function' ? config() : config;
    if (!cfg || typeof cfg !== 'object') return null;
    var canvas = canvasFor(node, o.id);
    if (!canvas) return null;

    cfg.options = cfg.options || {};
    cfg.options.responsive = true;
    cfg.options.animation = false;

    var current = typeof Lib.getChart === 'function' ? Lib.getChart(canvas) : null;
    if (current && current.config.type === cfg.type) {
      current.options = cfg.options;
      current.data = cfg.data;
      current.update();
      return current;
    }
    if (current) current.destroy();
    return new Lib(canvas, cfg);
  }

  window.SnapCharts = { render: render };
}());
