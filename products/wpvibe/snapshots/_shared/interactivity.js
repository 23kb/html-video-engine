/**
 * WPVibe snapshot transitions.
 *
 * Runs after products/_runtime/core.js, which owns delegation, navigation,
 * tabs, accordions, toggles, fadeSwap and the rest of the product-blind
 * behaviour. This file holds only what names a WPVibe control.
 *
 * Entry shape: { label, event, match(el, evt), apply(el, evt) } —
 * products/_runtime/DESIGN.md §0.3, dispatch at core.js:459-486.
 *
 * Source of truth for every behaviour below: vibe-ai 1.17.3,
 * assets/js/admin.js and includes/class-wpvibe-admin.php.
 */
(function () {
  'use strict';
  if (!window.SnapRuntime || typeof window.SnapRuntime.register !== 'function') return;

  var R = window.SnapRuntime;

  // ─── layout repair: WooCommerce's fixed header over its own tab bar ──────
  // Measured live against bakery.example.com on 2026-09-20: on the real
  // page the settings tab bar sits at y=101, just clear of the fixed
  // .woocommerce-layout__header (bottom 92). In the capture it sits at y=69,
  // because the chrome strip removes the notice area above it, so the header
  // covers the tabs: elementFromPoint returns the header's H1 and no tab can
  // be clicked. Give the content back exactly the offset it lost. Capture
  // plans for a future run carry the same step, so this is only for the
  // snapshots already taken.
  function refitWooHeader() {
    var hdr = document.querySelector('.woocommerce-layout__header');
    var main = document.getElementById('wpbody-content');
    if (!hdr || !main) return;
    var need = hdr.getBoundingClientRect().bottom;
    var top = main.getBoundingClientRect().top;
    if (top >= need) return;
    var pad = parseFloat(window.getComputedStyle(main).paddingTop) || 0;
    main.style.paddingTop = (pad + (need - top)) + 'px';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refitWooHeader);
  } else {
    refitWooHeader();
  }

  // admin.js:3-11 — flash(): the label swaps, .is-copied goes on, and both
  // revert after 1500 ms. #wpvibe-copy-report says "Report copied.", every
  // other copy button says "Copied!".
  var FLASH_MS = 1500;

  function flash(btn) {
    if (btn.dataset.snapCopying === '1') return;
    var original = btn.textContent;
    btn.dataset.snapCopying = '1';
    btn.textContent = btn.id === 'wpvibe-copy-report' ? 'Report copied.' : 'Copied!';
    btn.classList.add('is-copied');
    window.setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('is-copied');
      delete btn.dataset.snapCopying;
    }, FLASH_MS);
  }

  R.register([
    {
      // admin.js:25-38 — one delegated click handler on [data-wpvibe-copy].
      // The clipboard write itself is not reproduced: a snapshot must not
      // touch the viewer's clipboard, and the visible half is the flash.
      label: 'wpvibe: copy button flashes Copied',
      event: 'click',
      match: function (el) {
        return !!(el.closest && el.closest('[data-wpvibe-copy]'));
      },
      apply: function (el) {
        flash(el.closest('[data-wpvibe-copy]'));
      }
    },

    {
      // class-wpvibe-admin.php:279 — step 2's button. Live, it posts to
      // WPVibe's preflight endpoint and fills #wpvibe-check-results. The
      // result state is its own capture, so the click hands over to that
      // sibling snapshot (DESIGN.md §8). On the snapshot that already shows
      // results there is nothing to do.
      label: 'wpvibe: Check site connectivity opens the result state',
      event: 'click',
      match: function (el) {
        var btn = el.closest && el.closest('#wpvibe-run-check');
        if (!btn || btn.disabled) return false;
        var results = document.querySelector('#wpvibe-check-results');
        return !results || !results.children.length;
      },
      apply: function () {
        if (R.currentSlug && R.currentSlug() === 'admin-wpvibe-page-check-done') return;
        R.goto('admin-wpvibe-page-check-done');
      }
    },

    {
      // The report actions (#wpvibe-copy-report, #wpvibe-download-report) only
      // exist once the check has run. Download would pull a file into the
      // viewer's browser, so it flashes like the copy button instead.
      label: 'wpvibe: Download report flashes instead of downloading',
      event: 'click',
      match: function (el) {
        return !!(el.closest && el.closest('#wpvibe-download-report'));
      },
      apply: function (el) {
        var btn = el.closest('#wpvibe-download-report');
        if (btn.dataset.snapCopying === '1') return;
        var original = btn.textContent;
        btn.dataset.snapCopying = '1';
        btn.textContent = 'Report downloaded.';
        btn.classList.add('is-copied');
        window.setTimeout(function () {
          btn.textContent = original;
          btn.classList.remove('is-copied');
          delete btn.dataset.snapCopying;
        }, FLASH_MS);
      }
    },

    {
      // class-wpvibe-admin.php:379,414 — the two "watch" buttons poll the
      // connection state and turn their step green. The connected page is its
      // own capture, so both hand over to it.
      label: 'wpvibe: watch buttons open the connected state',
      event: 'click',
      match: function (el) {
        return !!(el.closest && el.closest('#wpvibe-watch-auth, #wpvibe-watch-ai'));
      },
      apply: function () {
        if (R.currentSlug && R.currentSlug() === 'admin-wpvibe-page-connected') return;
        R.goto('admin-wpvibe-page-connected');
      }
    }
  ], { product: 'wpvibe' });
})();
