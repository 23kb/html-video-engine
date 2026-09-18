/*
 * interactivity-kit.js -- re-add behaviour that a snapshot capture stripped.
 *
 * Classic browser script (not a module). A snapshot links it with
 *   <script src="interactivity-kit.js"></script>
 * and then registers its own transitions:
 *   SnapKit.register({ label, event, match, apply, source, verified })
 *
 * The kit ships with an EMPTY registry. It knows nothing about any product.
 * A snapshot with no registrations is display-only; that is a valid deliverable.
 *
 * Architecture:
 *   - One delegated listener per event type on document (click / change /
 *     input / mousedown / keydown). Registered transitions are matched against
 *     the event target (CSS selector via closest(), or a predicate walked up
 *     the ancestor chain) and apply(el, event) runs SYNCHRONOUSLY.
 *   - Native <select> popovers are OS-drawn and a synthetic cursor cannot open
 *     them on camera. SnapKit.enhanceSelects() opts a set of selects into an
 *     HTML overlay that IS in the DOM, so a fake cursor can hover and pick.
 *   - fadeSwap(el, mutateFn) decorates a layout snap with an opacity dip.
 *
 * Determinism rules (frame-stepped renders seek to a timestamp and read state;
 * anything async breaks that read):
 *   - no Date.now(), no performance.now() for logic
 *   - no Math.random()
 *   - no fetch() / XHR / dynamic import
 *   - no setTimeout / requestAnimationFrame / transitionend that GATES state.
 *     CSS transitions may decorate the path; the final DOM state is reached on
 *     the same call stack as the event that caused it.
 *
 * Provenance: every registration carries
 *   source:   "captured"    -- apply() written from a before/after DOM diff
 *             "source-code" -- apply() written from the product's own JS/CSS
 *             "synthetic"   -- invented behaviour; says so on purpose
 *   verified: "YYYY-MM-DD"  -- the day someone confirmed it matches the product
 *
 * Example registration (NOT active -- copy into the snapshot page, not here):
 *
 *   // Captured diff, "Advanced" toggle on a settings card:
 *   //   before: <section class="card">            <div class="adv" hidden>
 *   //   after:  <section class="card is-open">    <div class="adv">
 *   //   the toggle button also flipped aria-expanded="false" -> "true"
 *   SnapKit.register({
 *     label: 'settings-card/advanced-toggle',
 *     event: 'click',
 *     match: '.card > button.adv-toggle',
 *     apply: function (btn) {
 *       var card = btn.closest('.card');
 *       var open = !card.classList.contains('is-open');
 *       card.classList.toggle('is-open', open);
 *       btn.setAttribute('aria-expanded', open ? 'true' : 'false');
 *       card.querySelector('.adv').hidden = !open;
 *     },
 *     source: 'captured',
 *     verified: '2026-01-31'
 *   });
 */
(function () {
  'use strict';

  var EVENTS = ['click', 'change', 'input', 'mousedown', 'keydown'];
  var SOURCES = ['captured', 'synthetic', 'source-code'];
  var transitions = [];
  var booted = false;

  // ---------- registry ----------

  function register(t) {
    if (!t || typeof t !== 'object') throw new Error('SnapKit.register: pass an object');
    if (!t.label) throw new Error('SnapKit.register: label is required');
    if (EVENTS.indexOf(t.event) < 0) throw new Error('SnapKit.register(' + t.label + '): event must be one of ' + EVENTS.join('|'));
    if (typeof t.match !== 'string' && typeof t.match !== 'function') throw new Error('SnapKit.register(' + t.label + '): match must be a CSS selector or function(el)');
    if (typeof t.apply !== 'function') throw new Error('SnapKit.register(' + t.label + '): apply must be a function(el, event)');
    // Provenance is mandatory so an invented behaviour can never pass as the product's.
    if (SOURCES.indexOf(t.source) < 0) throw new Error('SnapKit.register(' + t.label + '): source must be ' + SOURCES.join('|'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.verified || '')) throw new Error('SnapKit.register(' + t.label + '): verified must be YYYY-MM-DD');
    transitions.push(t);
    return t;
  }

  // Resolve the element a transition applies to, or null.
  function matchTarget(t, target) {
    if (!(target instanceof Element)) return null;
    if (typeof t.match === 'string') return target.closest(t.match);
    for (var el = target; el && el !== document; el = el.parentElement) {
      if (t.match(el)) return el;
    }
    return null;
  }

  function dispatch(e) {
    // Snapshot-frozen copy: a registration that registers another mid-loop must not shift the iteration.
    var list = transitions.slice();
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.event !== e.type) continue;
      var el = matchTarget(t, e.target);
      if (!el) continue;
      try {
        t.apply(el, e); // synchronous: the state is final when this returns
      } catch (err) {
        // One broken registration must not silence the rest of the page.
        (window.console && console.error) && console.error('SnapKit[' + t.label + ']', err);
      }
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    EVENTS.forEach(function (type) { document.addEventListener(type, dispatch, false); });
    // Capture phase so we run before any bubbling handler and before the native popover opens.
    document.addEventListener('mousedown', onMousedownCapture, true);
    document.addEventListener('keydown', onKeydownCapture, true);
  }

  // ---------- custom overlay for native <select> ----------

  var selectMatcher = null;   // selector string or predicate; null = feature off
  var activeOverlay = null;
  var activeSelect = null;
  var styleInjected = false;

  function enhanceSelects(selectorOrPredicate) {
    if (typeof selectorOrPredicate !== 'string' && typeof selectorOrPredicate !== 'function') {
      throw new Error('SnapKit.enhanceSelects: pass a CSS selector or function(select)');
    }
    selectMatcher = selectorOrPredicate;
    injectStyle();
  }

  function isEnhanced(el) {
    if (!selectMatcher || !(el instanceof HTMLSelectElement)) return false;
    return typeof selectMatcher === 'string' ? el.matches(selectMatcher) : !!selectMatcher(el);
  }

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var s = document.createElement('style');
    s.setAttribute('data-snapkit', 'dropdown');
    // Theme-neutral defaults; a snapshot overrides them by redefining the --snapkit-* variables.
    s.textContent = [
      '.snapkit-dropdown{position:fixed;z-index:2147483000;box-sizing:border-box;overflow-y:auto;max-height:300px;',
      'background:var(--snapkit-bg,#fff);color:var(--snapkit-fg,#222);border:1px solid var(--snapkit-border,#999);',
      'font:inherit;font-size:14px;line-height:1.4;opacity:0;transform:translateY(-6px);',
      'transition:opacity 180ms ease-out,transform 180ms ease-out}',
      '.snapkit-dropdown.is-open{opacity:1;transform:translateY(0)}',
      '.snapkit-dropdown-item{padding:4px 8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.snapkit-dropdown-item.is-hot{background:var(--snapkit-hi-bg,#2f6feb);color:var(--snapkit-hi-fg,#fff)}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function closeDropdown() {
    if (!activeOverlay) return;
    activeOverlay.remove();
    activeOverlay = null;
    activeSelect = null;
  }

  function openDropdown(select) {
    closeDropdown();
    var rect = select.getBoundingClientRect();
    var overlay = document.createElement('div');
    overlay.className = 'snapkit-dropdown';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.bottom + 'px';
    overlay.style.width = rect.width + 'px';

    var items = [];
    var hot = null; // hovered value; null = paint the current value

    function paint() {
      for (var i = 0; i < items.length; i++) {
        var v = items[i].getAttribute('data-value');
        items[i].classList.toggle('is-hot', hot === null ? v === select.value : v === hot);
      }
    }

    Array.prototype.forEach.call(select.options, function (opt) {
      var item = document.createElement('div');
      item.className = 'snapkit-dropdown-item';
      item.textContent = opt.textContent;
      item.setAttribute('data-value', opt.value);
      item.addEventListener('mouseenter', function () { hot = opt.value; paint(); });
      // mousedown, not click: the document-level outside-click handler also runs on mousedown,
      // and we must win that race so the pick lands before the overlay closes.
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closeDropdown();
      });
      items.push(item);
      overlay.appendChild(item);
    });
    overlay.addEventListener('mouseleave', function () { hot = null; paint(); });
    paint();

    document.body.appendChild(overlay);
    activeOverlay = overlay;
    activeSelect = select;
    // Force a style flush, then flip the class: the 180 ms fade runs as a CSS transition with
    // no requestAnimationFrame. The overlay is already in the DOM; the fade only decorates.
    void overlay.offsetHeight;
    overlay.classList.add('is-open');
    return overlay;
  }

  function onMousedownCapture(e) {
    var t = e.target;
    if (isEnhanced(t)) {
      e.preventDefault(); // stop the OS popover; ours takes its place
      openDropdown(t);
      return;
    }
    if (activeOverlay && !activeOverlay.contains(t)) closeDropdown();
  }

  function onKeydownCapture(e) {
    if (e.key === 'Escape' && activeOverlay) { closeDropdown(); return; }
    // The keys that open a native select would draw the OS popover; redirect them to the overlay.
    if (isEnhanced(e.target) && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      if (!activeOverlay) openDropdown(e.target);
    }
  }

  // ---------- fadeSwap ----------

  // Opacity dip around a SYNCHRONOUS mutation. The mutation runs first, on this call stack, so a
  // frame-stepped probe reading the DOM right after the event sees the final state; the fade-in
  // that follows is decoration only. (A version that mutated inside a setTimeout gated state on a
  // timer and read as "nothing happened" at the seek point.)
  function fadeSwap(el, mutateFn, duration) {
    duration = duration || 180;
    mutateFn();
    var prevTransition = el.style.transition;
    el.style.transition = 'none';
    el.style.opacity = '0';
    void el.offsetHeight; // flush so the next opacity write animates from 0
    el.style.transition = 'opacity ' + duration + 'ms ease-in';
    el.style.opacity = '1';
    el.addEventListener('transitionend', function restore() {
      el.removeEventListener('transitionend', restore);
      el.style.transition = prevTransition;
    });
  }

  // ---------- public surface ----------

  window.SnapKit = {
    version: '1.0.0',
    transitions: transitions,
    register: register,
    boot: boot,
    enhanceSelects: enhanceSelects,
    openDropdown: openDropdown,
    closeDropdown: closeDropdown,
    fadeSwap: fadeSwap,
    get activeSelect() { return activeSelect; },
  };

  // Delegated listeners bind to document, so booting at parse time is safe even before <body> exists.
  boot();
})();
