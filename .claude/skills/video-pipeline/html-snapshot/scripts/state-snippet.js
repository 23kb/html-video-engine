// state-snippet.js — serialize ONE interactive UI state (open menu, popover, dialog)
// as a portable fragment: outerHTML + a scoped stylesheet built from computed styles.
//
// Human path: paste this whole file into the DevTools console of the tab that shows
// the state (an authenticated third-party session is never automated), then run
//   __snapState('#menu', { name: 'menu-open', note: 'after clicking Export' })
// The JSON lands on the clipboard (or in the console when the clipboard is blocked).
// Save it as <snapshot>/states/<name>.json. states.mjs runs this same file headless.
//
// Why computed styles: a page save often lacks the CSS of a portal/popover (injected
// by JS, adopted stylesheets, or a CSS-in-JS runtime), so the fragment renders naked.
// Diffing each element against a fresh default element of the same tag (appended
// off-screen in the SAME document, so UA defaults cancel out) emits only what the
// page actually changed, as [data-st="n"] rules. Gotchas the header of states.mjs lists.
(function () {
  'use strict';
  // Logical aliases (border-block-*, margin-inline-*) duplicate the physical longhands Chrome also lists.
  var NOISE = /^(transform-origin|perspective-origin|(min-|max-)?(inline|block)-size|d)$|^(border|margin|padding|inset|scroll-margin|scroll-padding)-(block|inline)/;
  var REMOTE_ATTRS = ['src', 'srcset', 'poster', 'xlink:href', 'href'];

  function round(n) { return Math.round(n * 100) / 100; }

  function detectTheme() {
    var cls = (document.documentElement.className + ' ' + document.body.className).toLowerCase();
    var attr = (document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme') || '').toLowerCase();
    if (/\bdark\b/.test(cls) || /dark/.test(attr)) return 'dark';
    if (/\blight\b/.test(cls) || /light/.test(attr)) return 'light';
    var scheme = getComputedStyle(document.documentElement).colorScheme || '';
    if (/dark/.test(scheme) && !/light/.test(scheme)) return 'dark';
    if (/light/.test(scheme) && !/dark/.test(scheme)) return 'light';
    return 'unknown';
  }

  // Every longhand the engine reports, so var() and shorthands are already resolved.
  function snapshotStyle(cs) {
    var out = {};
    for (var i = 0; i < cs.length; i++) {
      var p = cs[i];
      if (p.indexOf('--') === 0 || NOISE.test(p)) continue;
      out[p] = cs.getPropertyValue(p);
    }
    return out;
  }

  function defaultStyleFor(tag, host) {
    var el = document.createElementNS(tag.indexOf(':') < 0 && /^[a-z]+$/i.test(tag) ? 'http://www.w3.org/1999/xhtml' : 'http://www.w3.org/2000/svg', tag.toLowerCase());
    host.appendChild(el);
    var snap = snapshotStyle(getComputedStyle(el));
    el.remove();
    return snap;
  }

  function diff(live, def) {
    var decl = [];
    for (var p in live) if (live[p] !== def[p] && live[p] !== '') decl.push(p + ':' + live[p]);
    return decl.join(';');
  }

  // Input state lives on DOM properties; outerHTML serializes attributes only.
  function bakeFormState(liveEls, cloneEls) {
    for (var i = 0; i < liveEls.length; i++) {
      var el = liveEls[i], c = cloneEls[i];
      if (!c) continue;
      if (el.tagName === 'INPUT') {
        if (el.type === 'checkbox' || el.type === 'radio') { el.checked ? c.setAttribute('checked', '') : c.removeAttribute('checked'); }
        else if (el.type !== 'password' && el.type !== 'file') c.setAttribute('value', el.value);
      } else if (el.tagName === 'TEXTAREA') c.textContent = el.value;
      else if (el.tagName === 'SELECT') for (var j = 0; j < el.options.length; j++) { if (c.options[j]) el.options[j].selected ? c.options[j].setAttribute('selected', '') : c.options[j].removeAttribute('selected'); }
    }
  }

  // http(s):// and root-relative refs are dead once the fragment leaves its origin;
  // keep them on data-stripped-* so the film can localize or drop them deliberately.
  function stripRemoteRefs(root) {
    var n = 0, all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    all.forEach(function (el) {
      REMOTE_ATTRS.forEach(function (a) {
        if (a === 'href' && el.tagName !== 'A' && el.tagName.toLowerCase() !== 'use') return;
        var v = el.getAttribute(a);
        if (v && /^(https?:\/\/|\/)/i.test(v.trim())) {
          el.setAttribute('data-stripped-' + a.replace(':', '-'), v);
          el.removeAttribute(a);
          n++;
        }
      });
    });
    return n;
  }

  window.__snapState = function (selector, opts) {
    opts = opts || {};
    var target = document.querySelector(selector);
    if (!target) throw new Error('__snapState: no element matches ' + selector);
    var rect = target.getBoundingClientRect();
    var els = [target].concat(Array.prototype.slice.call(target.querySelectorAll('*')));
    var host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(host);
    var defaults = {}, rules = [];
    els.forEach(function (el, i) {
      el.setAttribute('data-st', String(i));
      var def = defaults[el.tagName] || (defaults[el.tagName] = defaultStyleFor(el.tagName, host));
      var decl = diff(snapshotStyle(getComputedStyle(el)), def);
      if (decl) rules.push('[data-st="' + i + '"]{' + decl + '}');
      ['::before', '::after'].forEach(function (pseudo) {
        var ps = getComputedStyle(el, pseudo), content = ps.content;
        if (!content || content === 'none' || content === 'normal') return;
        rules.push('[data-st="' + i + '"]' + pseudo + '{' + diff(snapshotStyle(ps), def) + '}');
      });
    });
    host.remove();
    var clone = target.cloneNode(true);
    bakeFormState(target.querySelectorAll('input,textarea,select'), clone.querySelectorAll('input,textarea,select'));
    els.forEach(function (el) { el.removeAttribute('data-st'); });   // leave the live page as found
    var stripped = opts.stripRemote === false ? 0 : stripRemoteRefs(clone);
    var obj = {
      state: opts.name || 'state',
      url: location.href,
      theme: detectTheme(),
      capturedAt: new Date().toISOString(),
      note: opts.note || '',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      rect: { x: round(rect.left), y: round(rect.top), w: round(rect.width), h: round(rect.height) },
      html: clone.outerHTML,
      css: rules.join('\n'),
      stripped_assets: stripped,
      target_selector: selector,
    };
    var json = JSON.stringify(obj, null, 2);
    var fallback = function () { console.log('Clipboard unavailable. Copy the JSON below into states/' + obj.state + '.json:\n' + json); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(function () { console.log('__snapState: JSON copied to clipboard (' + json.length + ' chars, ' + rules.length + ' css rules).'); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
    return obj;
  };

  console.log('__snapState ready. Usage: __snapState("<css selector>", { name: "<state-name>", note: "...", stripRemote: true })');
})();
