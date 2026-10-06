/*
 * standalone-guard.js — B9 gate (director 2026-10-05): a downloaded snapshot never leaves itself.
 * For captures that load no WPForms runtime (third-party pages: ChatGPT, Claude, Gmail, Google sign-in,
 * Klaviyo, SendGrid, Mercado Pago; a few WordPress frontend pages). Hand-browsed only: inside a film's
 * iframe (window.parent !== window) it does nothing, so films keep today's behaviour.
 * A same-window link that leaves the snapshot, or a form submit, does nothing and logs one line.
 * Links that open a new tab (target=_blank), in-page anchors and sibling-snapshot links are untouched.
 */
(function () {
  if (window.parent !== window) return;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank') return;
    var raw = a.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(raw)) return;
    var u;
    try { u = new URL(raw, window.location.href); } catch (_) { return; }
    if (u.origin === window.location.origin && /\/snapshots\//.test(u.pathname)) return;
    e.preventDefault();
    console.info('[snap] link to ' + u.host + u.pathname + ' — not part of a snapshot');
  }, true);
  window.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    console.info('[snap] form submit — not part of a snapshot');
  });
})();
