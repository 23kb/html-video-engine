/**
 * products/_runtime/core.js — the product-blind snapshot runtime (WO-202A).
 *
 * Makes a captured product snapshot behave like the real plugin. It knows no
 * product: everything product-shaped arrives as a selector, a slug, or the
 * generated nav map. It never reads, edits or depends on the older runtime in
 * snapshots/_shared/interactivity.js.
 *
 * Load order — three classic script tags before </body>, written by
 * tools/link-interactivity-script.js:
 *
 *   <script src="../../../_runtime/core.js"></script>
 *   <script src="../_shared/nav.js"></script>
 *   <script src="../_shared/interactivity.js"></script>
 *
 * core defines window.SnapRuntime during parse; nav.js sets window.__snapNav;
 * the product file calls SnapRuntime.register([...]) synchronously. Core boots
 * after both, on DOMContentLoaded (or a setTimeout(0) when the document has
 * already parsed) — never inline.
 *
 * Classic script, IIFE, no modules, no build step: post-capture opens snapshots
 * over file:// (a module would be blocked by CORS), films load them into an
 * iframe by src, and capture strips every <script> so these tags are re-added
 * afterwards and must be self-sufficient.
 *
 * Determinism (INV-9, DESIGN §9): no Date.now, no new Date, no Math.random, no
 * fetch, no setInterval, no storage and no history calls. Timed flashes use a
 * one-shot setTimeout with a constant duration; animations are Web Animations
 * with fixed durations (WO-202H), and SnapRuntime.motion = 'off' ends them all
 * at once.
 */
(function () {
  'use strict';

  // Loaded twice (two link passes, a stray tag) must be a no-op. A plain
  // object set before this file loads is a harness's pre-boot choice
  // (window.SnapRuntime = { motion: 'off' }): it is adopted, not a second load.
  var PRE = window.SnapRuntime;
  if (PRE && PRE.version) return;

  // ─── registry ────────────────────────────────────────────────────────────
  // The live entry list. window.__snapTransitions is the SAME array object, so
  // a tool reading it after boot sees everything registered.
  var TRANSITIONS = [];
  try { window.__snapTransitions = TRANSITIONS; } catch (_) {}

  // Every link whose key resolves to no captured slug: { href, key }. The QC
  // page lists these as "links that go nowhere yet".
  try { window.__snapNavMisses = []; } catch (_) {}

  var booted = false;
  var LISTENING = {};
  var IS = {};

  // ─── navKey — VERBATIM SHARED with tools/build-snap-nav.js ────────────────
  // The generator and the runtime must agree on every byte, or a map built on
  // disk misses at run time. Do not edit one copy: tools/__tests__/snap-nav.test.js
  // compares the two blocks and fails when they differ.
  var NAV_DROP = ['_wpnonce', '_wp_http_referer', 'TB_iframe', 'TB_inline', 'width', 'height',
                  'return', 'redirect_to', 'settings-updated', 'updated', 'message'];

  // A hash route (#/… or #!/…) names a screen of a Vue / React admin app, so it
  // stays in the key; any other hash is an in-page anchor and is dropped. The
  // bare root route (#/ or #!/) is the page itself — the router lands there
  // when the URL has no hash — so it is dropped too.
  function navKey(href, base) {
    var root = base || (typeof document !== 'undefined' ? document.baseURI : '');
    var u;
    try { u = new URL(href, root); } catch (_) { return null; }
    var file = u.pathname.split('/').filter(Boolean).pop() || 'index.php';
    var qs = [];
    u.searchParams.forEach(function (v, k) { if (NAV_DROP.indexOf(k) === -1) qs.push([k, v]); });
    qs.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var route = /^#!?\/./.test(u.hash) ? u.hash : '';
    return file + (qs.length ? '?' + qs.map(function (p) { return p[0] + '=' + p[1]; }).join('&') : '') + route;
  }

  // Nav rules: the same screen under another URL. They come from the
  // product's nav-rules.json and ride in the generated map as `r`, so the
  // generator (captured keys) and the runtime (clicked keys) apply the same
  // rules. A rule names a page id (`page`: the file plus its `page` param)
  // and optional `when` params that must all match. Then, in this order, it
  // may keep only the `last` copy of a name that appears more than once
  // (PHP reads a repeated plain name that way: the later value overwrites
  // the earlier one), `normalise` params to plain integers ("09" reads as 9),
  // snap a date to the first day of its `week` screen, `drop` params (with
  // `carry: true` the dropped params travel on to the target snapshot), and
  // drop a param whose value its `defaults` declares the same screen as no
  // value ({ "status": "all" }, or a list of such values). A name that
  // appears more than once goes only when every copy holds a default.
  // Returns { key, carry: [[name, value], ...] }. Pure: no clock.
  function navApply(key, rules) {
    var res = { key: key, carry: [] };
    if (!key || !rules || !rules.length) return res;
    var hash = key.indexOf('#');
    var route = hash === -1 ? '' : key.slice(hash);
    var bare = hash === -1 ? key : key.slice(0, hash);
    var q = bare.indexOf('?');
    var file = q === -1 ? bare : bare.slice(0, q);
    var pairs = q === -1 ? [] : bare.slice(q + 1).split('&').map(function (p) {
      var i = p.indexOf('=');
      return i === -1 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)];
    });
    function at(name) {
      for (var i = 0; i < pairs.length; i++) if (pairs[i][0] === name) return i;
      return -1;
    }
    function get(name) { var i = at(name); return i === -1 ? null : pairs[i][1]; }
    function set(name, value) { var i = at(name); if (i === -1) pairs.push([name, value]); else pairs[i][1] = value; }
    var page = get('page');
    var pageId = file + (page === null ? '' : '?page=' + page);
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r] || {};
      if (rule.page !== pageId) continue;
      var hit = true;
      for (var w in rule.when || {}) {
        if (!Object.prototype.hasOwnProperty.call(rule.when, w)) continue;
        var want = rule.when[w];
        var have = get(w);
        if (Object.prototype.toString.call(want) === '[object Array]' ? want.indexOf(have) === -1 : have !== String(want)) {
          hit = false;
          break;
        }
      }
      if (!hit) continue;
      (rule.last || []).forEach(function (n) {
        var seen = false;
        for (var i = pairs.length - 1; i >= 0; i--) {
          if (pairs[i][0] !== n) continue;
          if (seen) pairs.splice(i, 1);
          seen = true;
        }
      });
      (rule.normalise || []).forEach(function (n) {
        var v = get(n);
        if (v !== null && /^[+-]?\d+$/.test(v)) set(n, String(parseInt(v, 10)));
      });
      if (rule.week) navWeek(rule.week, get, set);
      (rule.drop || []).forEach(function (n) {
        var i = at(n);
        if (i === -1) return;
        if (rule.carry) res.carry.push([pairs[i][0], pairs[i][1]]);
        pairs.splice(i, 1);
      });
      for (var dn in rule.defaults || {}) {
        if (!Object.prototype.hasOwnProperty.call(rule.defaults, dn)) continue;
        var same = [].concat(rule.defaults[dn]).map(String);
        var copies = [];
        for (var j = 0; j < pairs.length; j++) if (pairs[j][0] === dn) copies.push(j);
        if (!copies.length || copies.some(function (c) { return same.indexOf(pairs[c][1]) === -1; })) continue;
        for (var d = copies.length - 1; d >= 0; d--) pairs.splice(copies[d], 1);
      }
    }
    pairs.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    res.key = file + (pairs.length ? '?' + pairs.map(function (p) { return p[0] + '=' + p[1]; }).join('&') : '') + route;
    return res;
  }

  // A `week` rule: { y, m, d } name the date params, `start` is the weekday
  // the screen's 7-day grid begins on (0 = Sunday), and `anchor`, when set, is
  // the weekday the screen is labelled by: days after the grid's anchor day
  // carry the next label, so they are a second screen. The date is clamped
  // the way the plugin clamps it, then set to the first day of its screen.
  function navWeek(w, get, set) {
    var y = parseInt(get(w.y), 10);
    var m = parseInt(get(w.m), 10);
    var d = parseInt(get(w.d), 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return;
    m = Math.min(Math.max(m, 1), 12);
    y = Math.min(Math.max(y, 1970), 9999);
    var dim = navDays(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - navDays(y, m, 1);
    d = Math.min(Math.max(d, 1), dim);
    var days = navDays(y, m, d);
    var into = (((days % 7) + 11) % 7 - w.start + 7) % 7;   // 1970-01-01 was a Thursday
    var first = days - into;
    if (w.anchor != null) {
      var cut = (w.anchor - w.start + 7) % 7;
      if (into > cut) first += cut + 1;
    }
    var c = navCivil(first);
    set(w.y, String(c[0]));
    set(w.m, String(c[1]));
    set(w.d, String(c[2]));
  }

  // Days since 1970-01-01 for a Gregorian date, and back (the civil-date
  // algorithms of H. Hinnant): date arithmetic with integers only.
  function navDays(y, m, d) {
    y -= m <= 2 ? 1 : 0;
    var era = Math.floor(y / 400);
    var yoe = y - era * 400;
    var doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
  }
  function navCivil(z) {
    z += 719468;
    var era = Math.floor(z / 146097);
    var doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153);
    var m = mp + (mp < 10 ? 3 : -9);
    return [era * 400 + yoe + (m <= 2 ? 1 : 0), m, doy - Math.floor((153 * mp + 2) / 5) + 1];
  }
  // ─── end navKey ──────────────────────────────────────────────────────────

  // ─── small DOM helpers ───────────────────────────────────────────────────
  // Never throw on an absent or malformed selector: a snapshot captured before
  // a transition existed must still load clean.
  function query(sel, root) {
    try { return (root || document).querySelectorAll(sel); } catch (_) { return []; }
  }
  function one(sel, root) {
    try { return (root || document).querySelector(sel); } catch (_) { return null; }
  }
  function own(obj, key) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
  }

  // ─── navigation ──────────────────────────────────────────────────────────

  // The generated map: { p: product, k: key -> slug, v, r: nav rules }. The
  // lookup reads k and r; v (the params each page's captured keys carry) is
  // not read here since WO-202G.
  function navMap() {
    var m = window.__snapNav;
    if (!m || typeof m !== 'object' || !m.k || typeof m.k !== 'object') return null;
    return m;
  }

  function productOf() {
    var m = navMap();
    return (m && m.p) || null;
  }

  // The slug is the snapshot's own folder name: .../snapshots/<slug>/index.html.
  var SLUG = null;
  function currentSlug() {
    if (SLUG !== null) return SLUG;
    var parts = [];
    try { parts = window.location.pathname.split('/').filter(Boolean); } catch (_) { parts = []; }
    if (parts.length && /\.x?html?$/i.test(parts[parts.length - 1])) parts.pop();
    try { SLUG = parts.length ? decodeURIComponent(parts[parts.length - 1]) : ''; }
    catch (_) { SLUG = parts.length ? parts[parts.length - 1] : ''; }
    return SLUG;
  }

  // A link that is only a hash route (#/step/x) belongs to the page it sits on.
  var HASH_ROUTE = /^#!?\/./;

  // This snapshot's own link key, without its route: the base a hash-only link
  // resolves against. Any key the map gives this slug will do — they all name
  // the same page.
  function selfBase(m) {
    var slug = currentSlug();
    for (var k in m.k) {
      if (own(m.k, k) === slug) return k.split('#')[0];
    }
    return null;
  }

  // The key of a clicked href; a hash-only one is keyed on this page.
  function keyOf(href) {
    var h = String(href == null ? '' : href);
    if (h.charAt(0) === '#') {
      var m = navMap();
      var self = m && selfBase(m);
      if (!self) return null;
      h = self + h;
    }
    return navKey(h);
  }

  // key -> slug. A miss beats a wrong hop (WO-202G): the only params a click
  // may lose are the ones declared view-neutral — the global NAV_DROP list
  // (navKey drops it) and what the map's nav rules (`r`) declare: `drop`, and
  // a `defaults` value that is the same screen as no value. The rules also
  // key a link that shows the same screen under another URL onto its
  // sibling, and return the params they carry as `params` ([name, value]
  // pairs). Every other param, a hash route included, must match a captured
  // key exactly: a filter, sort, page or detail link whose screen is not
  // captured is a logged miss, never a hop to the unfiltered screen.
  function resolve(href) {
    var m = navMap();
    if (!m) return null;
    var raw = keyOf(href);
    if (!raw) return null;
    var applied = navApply(raw, m.r);
    var hit = own(m.k, applied.key);
    return hit ? { slug: hit, params: applied.carry } : null;
  }
  function resolveHref(href) {
    var r = resolve(href);
    return r ? r.slug : null;
  }

  // Carried params as a query string (goto) or an object (the film message).
  function paramPairs(params) {
    var out = [];
    if (!params) return out;
    if (Object.prototype.toString.call(params) === '[object Array]') {
      for (var i = 0; i < params.length; i++) if (params[i] && params[i][0]) out.push([String(params[i][0]), String(params[i][1])]);
      return out;
    }
    for (var k in params) if (own(params, k) !== null) out.push([k, String(params[k])]);
    return out;
  }
  function paramQuery(pairs) {
    return pairs.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
  }

  // The params this snapshot was opened with (?name=value after index.html):
  // what a link carried here. { name: value }.
  function openedWith() {
    var out = {};
    var s = '';
    try { s = window.location.search || ''; } catch (_) { s = ''; }
    if (s.charAt(0) === '?') s = s.slice(1);
    if (!s) return out;
    s.split('&').forEach(function (p) {
      if (!p) return;
      var i = p.indexOf('=');
      var k = i === -1 ? p : p.slice(0, i);
      var v = i === -1 ? '' : p.slice(i + 1);
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (_) { return; }
      if (k && !Object.prototype.hasOwnProperty.call(out, k)) out[k] = v;
    });
    return out;
  }

  // In a film: post to the parent, which owns the crossfade (IframeManager
  // already listens for snapshot:navigate). Hand-browsing: fade the content out
  // and go. The active tab is inert — goto() returns on its own slug.
  // opts.params: params a nav rule carried ([name, value] pairs or an object).
  // They ride on the target URL when hand-browsing and on the message in a
  // film; the target snapshot reads them back with SnapRuntime.params().
  var faded = null;
  function goto(slug, opts) {
    var pairs = paramPairs(opts && opts.params);
    if (!slug || (slug === currentSlug() && !pairs.length)) return;
    if (window.parent !== window) {
      var msg = { slug: slug };
      if (pairs.length) {
        msg.params = {};
        for (var i = 0; i < pairs.length; i++) msg.params[pairs[i][0]] = pairs[i][1];
      }
      emit('snapshot:navigate', msg);
      return;
    }
    var fade = motionOff() ? 0 : opts && opts.fade != null ? opts.fade : 120;
    var target = '../' + slug + '/index.html' + (pairs.length ? '?' + paramQuery(pairs) : '');
    var host = document.getElementById('wpbody-content') || document.body;
    if (!host || !(fade > 0)) {
      window.location.href = target;
      return;
    }
    host.style.transition = 'opacity ' + fade + 'ms ease-in';
    host.style.opacity = '0';
    faded = host;
    setTimeout(function () { window.location.href = target; }, fade - 10);
  }

  // The fade restore. Back / Forward brings a page out of the bfcache exactly
  // as goto() left it: faded to nothing. Put it back (a reveal like any other).
  function restoreFade() {
    if (!faded) return;
    faded.style.transition = '';
    faded.style.opacity = '';
    clearBaked(faded);
    faded = null;
  }

  // note: why the target is not captured, when an entry knows (a button whose
  // result is a dialog, an upload, a page the capture cannot take).
  var loggedMiss = {};
  function recordMiss(href, key, note) {
    var miss = { href: href, key: key };
    if (note) miss.note = String(note);
    try { window.__snapNavMisses.push(miss); } catch (_) {}
    var id = key || href;
    if (loggedMiss[id]) return;
    loggedMiss[id] = true;
    console.info('[snap] no snapshot for ' + id + ' — ' + (note || 'link swallowed'));
  }

  // Every captured link is dead: a relative admin.php URL 404s and an absolute
  // one would take the film off the stage. So swallow the click first, then
  // route it if the map knows a slug.
  function initNav() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;          // a transition already owns this click
      if (!(e.target instanceof Element)) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href || (href.charAt(0) === '#' && !HASH_ROUTE.test(href))) { e.preventDefault(); return; }
      var proto = '';
      try { proto = new URL(href, document.baseURI).protocol; } catch (_) { proto = ''; }
      if (proto !== 'http:' && proto !== 'https:' && proto !== 'file:') {
        e.preventDefault();                    // mailto:, tel:, javascript: — buttons in disguise
        return;
      }
      e.preventDefault();
      var hit = resolve(href);
      if (hit) { goto(hit.slug, hit.params.length ? { params: hit.params } : null); return; }
      recordMiss(href, keyOf(href));
    });
    // Every captured form is dead too, and some post to the live site's
    // absolute URL with a captured nonce. A submit no transition handled
    // (a handled one is already prevented) goes nowhere and is logged.
    document.addEventListener('submit', function (e) {
      if (e.defaultPrevented || !(e.target instanceof Element) || anyMatch('submit', e.target, e)) return;
      e.preventDefault();
      var form = e.target;
      var action = (form && form.getAttribute && form.getAttribute('action')) || '';
      recordMiss(action || window.location.href, action ? keyOf(action) : null);
    });
  }

  // ─── messages to the parent film ─────────────────────────────────────────
  function emit(name, detail) {
    if (!name || window.parent === window) return;
    var msg = { type: name };
    if (detail) {
      for (var k in detail) {
        if (Object.prototype.hasOwnProperty.call(detail, k)) msg[k] = detail[k];
      }
    }
    try { window.parent.postMessage(msg, '*'); } catch (_) {}
  }

  function broadcast(tr, target) {
    var s = null;
    if (typeof tr.state === 'function') {
      try { s = tr.state(target); } catch (_) { s = null; }
    }
    emit('snap:state', {
      product: productOf(),
      slug: currentSlug(),
      label: tr.label,
      key: s && s.key,
      value: s && s.value
    });
  }

  // ─── delegation ──────────────────────────────────────────────────────────
  // Registration order is stable; `order: 'last'` moves an entry to a second
  // pass (the resync shape) without renumbering anything.
  function ordered(eventName) {
    var first = [], last = [];
    for (var i = 0; i < TRANSITIONS.length; i++) {
      var tr = TRANSITIONS[i];
      if (tr.event !== eventName) continue;
      if (tr.order === 'last') last.push(tr); else first.push(tr);
    }
    return first.concat(last);
  }

  // match(el, event) and apply(el, event): the event is the second argument,
  // for the entries that need more than the target (the key of a keydown).
  function matches(tr, target, evt) {
    if (tr.once && tr.fired) return false;
    try { return !!tr.match(target, evt); } catch (_) { return false; }
  }

  function anyMatch(eventName, target, evt) {
    var list = ordered(eventName);
    for (var i = 0; i < list.length; i++) if (matches(list[i], target, evt)) return true;
    return false;
  }

  // One broken entry must never kill the page.
  function dispatch(eventName, target, evt) {
    if (!(target instanceof Element)) return;
    var list = ordered(eventName);
    for (var i = 0; i < list.length; i++) {
      var tr = list[i];
      if (!matches(tr, target, evt)) continue;   // re-checked at its turn: an
      try {                                      // earlier apply may have changed the DOM
        tr.apply(target, evt);
        if (tr.once) tr.fired = true;
        broadcast(tr, target);
      } catch (err) {
        console.error('[snap]', tr.label, err);
      }
    }
  }

  // click and submit swallow the browser default when an entry matched — both
  // would otherwise navigate to a dead URL. Only when one matched, or every
  // link in the snapshot loses its own handling. And for a click, only when
  // the default IS a navigation (a link, a submit button): a matched checkbox,
  // radio or label keeps its native toggle, so the `change` the plugin listens
  // for still fires.
  var SWALLOW = { click: true, submit: true };

  function navigates(target) {
    if (!target.closest) return false;
    if (target.closest('a[href]')) return true;
    var b = target.closest('button, input[type="submit"], input[type="image"]');
    if (!b) return false;
    if (b.tagName === 'INPUT') return true;
    return (b.getAttribute('type') || 'submit').toLowerCase() === 'submit' && !!b.form;
  }

  function ensureListener(name) {
    if (!name || LISTENING[name]) return;
    LISTENING[name] = true;
    document.addEventListener(name, function (e) {
      if (!(e.target instanceof Element)) return;
      if (SWALLOW[name]) {
        if (!anyMatch(name, e.target, e)) return;
        if (name !== 'click' || navigates(e.target)) e.preventDefault();
      }
      dispatch(name, e.target, e);
    });
  }

  // ─── registry API ────────────────────────────────────────────────────────
  function register(entries, meta) {
    if (!Array.isArray(entries)) {
      console.error('[snap] register() takes an array of entries', meta || '');
      return 0;
    }
    var added = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e || !e.label || typeof e.match !== 'function' || typeof e.apply !== 'function') {
        console.error('[snap] entry ' + i + ' needs label, match() and apply()', meta || '');
        continue;
      }
      if (!e.event) e.event = 'click';
      TRANSITIONS.push(e);
      added++;
      if (booted) ensureListener(e.event);
    }
    return added;
  }

  // ─── DOM helpers the entries call ────────────────────────────────────────

  // Fade out, mutate, fade back in — disguises the layout snap when visibility
  // flips. Constant duration, sync mutation: determinism-safe. With motion
  // off it mutates at once.
  function fadeSwap(el, mutate, ms) {
    var run = function () {
      try { if (typeof mutate === 'function') mutate(); }
      catch (err) { console.error('[snap] fadeSwap', err); }
    };
    var d = ms == null ? 180 : ms;
    if (!el || motionOff() || !(d > 0)) { run(); return; }
    el.style.transition = 'opacity ' + d + 'ms ease-out';
    el.style.opacity = '0';
    setTimeout(function () {
      run();
      el.style.transition = 'opacity ' + d + 'ms ease-in';
      el.style.opacity = '1';
      setTimeout(function () { el.style.transition = ''; }, d + 20);
    }, d);
  }

  // ─── reveal ──────────────────────────────────────────────────────────────
  // capture.js freezes every element hidden at capture time with an inline
  // display:none / visibility:hidden. On a product capture the stamp is
  // marked data-snap-baked, and tools/unbake-display.js has already deleted
  // every stamp the snapshot's own CSS explains. A marker still here means
  // "hidden by a script state the snapshot lost": the plugin's own reveal (a
  // class or display change) cannot beat an inline stamp, so every reveal in
  // core clears it, then drops the marker.
  var BAKED = 'data-snap-baked';
  function clearBaked(el) {
    var kind = el && el.getAttribute ? el.getAttribute(BAKED) : null;
    if (!kind) return;
    if (kind === 'visibility') {
      if (el.style.visibility === 'hidden') el.style.visibility = '';
    } else if (el.style.display === 'none') {
      el.style.display = '';
    }
    el.removeAttribute(BAKED);
  }

  // jQuery's .show() / .hide() — the mechanism behind most of the plugin rows
  // core mirrors (jQuery 3 showHide / getDefaultDisplay): hide remembers a
  // non-none inline display; show restores it, or clears the inline value and,
  // when a stylesheet still hides the element (WP core's `.hidden`), sets the
  // tag's default display.
  var DEFAULT_DISPLAY = {};
  function defaultDisplay(el) {
    var name = el.nodeName;
    if (DEFAULT_DISPLAY[name]) return DEFAULT_DISPLAY[name];
    var probe = document.body.appendChild(document.createElement(name));
    var d = getComputedStyle(probe).display;
    probe.parentNode.removeChild(probe);
    if (!d || d === 'none') d = 'block';
    DEFAULT_DISPLAY[name] = d;
    return d;
  }
  function showDisplay(el) {
    if (el.style.display === 'none') el.style.display = el._snapDisplay || '';
    if (el.style.display === '' && getComputedStyle(el).display === 'none') el.style.display = defaultDisplay(el);
  }
  function hideDisplay(el) {
    var d = el.style.display;
    if (d === 'none') return;
    el._snapDisplay = d;
    el.style.display = 'none';
  }

  // `on` means SHOWN. Class mode: `cls` is the hide-class the plugin uses
  // ('hidden', 'inactive', ...), so showing removes it. Display mode: jQuery
  // .show() / .hide(), above.
  function toggleTarget(sel, on, opts) {
    var o = opts || {};
    var display = o.mode === 'display';
    var cls = o.cls || 'hidden';
    var nodes = typeof sel === 'string' ? query(sel) : (sel && sel.nodeType === 1 ? [sel] : (sel || []));
    for (var i = 0; i < nodes.length; i++) {
      mutateOne(nodes[i], display, cls, !!on, o.fade);
    }
  }
  function mutateOne(el, display, cls, on, fade) {
    var mutate = function () {
      if (on) clearBaked(el);
      if (display) { if (on) showDisplay(el); else hideDisplay(el); }
      else if (on) el.classList.remove(cls);
      else el.classList.add(cls);
    };
    if (fade) fadeSwap(el, mutate, fade); else mutate();
  }

  // One selected at a time: tabs, accordion sections, tile pickers.
  function selectOne(groupSel, itemSel, el, cls) {
    if (!el) return;
    var c = cls || 'active';
    var group = groupSel ? one(groupSel) : document;
    if (!group) return;
    var items = query(itemSel, group);
    for (var i = 0; i < items.length; i++) items[i].classList.remove(c);
    el.classList.add(c);
    clearBaked(el);
  }

  // ─── motion: jQuery's effects (WO-202H) ──────────────────────────────────
  // The plugins animate their reveals with jQuery — WordPress core's jQuery
  // 3.7.1, wp-includes/js/jquery/jquery.js (cited below by line). These
  // helpers are those effects, property for property, so an entry passes the
  // plugin's own call:
  //
  //   slideDown / slideUp / slideToggle (nodes, [duration], [easing], [complete])
  //   fadeIn / fadeOut / fadeToggle     (nodes, [duration], [easing], [complete])
  //   show / hide / toggle              (nodes, [duration], [easing], [complete])
  //   stop(nodes, [clearQueue], [jumpToEnd])
  //
  // nodes: a selector, an element or a list. The optional arguments shift the
  // way jQuery.speed() shifts them (:7587-7629). duration: a number of ms,
  // 'fast' (200) or 'slow' (600); anything else is 400 (jQuery.fx.speeds,
  // :7820-7826). easing: 'swing' (the default, 0.5 − cos(p·π) / 2, :7139) or
  // 'linear' (:7136). complete runs once per element, `this` the element.
  //
  // What moves (genFx, :7179-7197; the shortcuts, :7755-7777): a slide is
  // height plus the top and bottom margin and padding; a fade is opacity;
  // show / hide / toggle with a duration is all of those plus width and the
  // left and right margin and padding. With no duration (or a boolean state)
  // show / hide / toggle are the instant .show() / .hide() / .toggle().
  // A show starts from 0 once the element is displayed the way .show()
  // displays it (showHide, :4567-4613); a hide ends at 0, then display:none.
  // A box animation holds overflow:hidden for its run (defaultPrefilter,
  // :7213-7383). An effect with nothing to do (a hide of a hidden element)
  // still takes its duration before complete runs, as jQuery's empty
  // animation does. The frames are a Web Animation that holds its last frame,
  // so no animated inline style is left behind: at the end the element keeps
  // only the display jQuery leaves.
  //
  // One queue per element, like jQuery's "fx" queue: an effect waits for the
  // one before it, and a toggle decides show or hide when it starts.
  //
  // SnapRuntime.motion = 'off' is jQuery.fx.off: every effect ends at once,
  // synchronously, and so do fadeSwap, goto's fade and wait(). The parity
  // tool compares visibility with motion off.
  var API = null;                                  // window.SnapRuntime, set below
  function motionOff() { return !!API && API.motion === 'off'; }

  var SPEEDS = { slow: 600, fast: 200, _default: 400 };
  // swing as a cubic-bezier: this fit stays within 0.02% of 0.5 − cos(p·π) / 2
  // over the whole run (the usual rounding, 0.37 / 0.63, is within 0.2%).
  var EASING = { swing: 'cubic-bezier(0.3643, 0, 0.6357, 1)', linear: 'linear' };
  var SLIDE = ['height', 'marginTop', 'paddingTop', 'marginBottom', 'paddingBottom'];
  var FADE = ['opacity'];
  var SIZE = ['height', 'marginTop', 'paddingTop', 'marginRight', 'paddingRight',
              'marginBottom', 'paddingBottom', 'marginLeft', 'paddingLeft', 'opacity', 'width'];

  function nodesOf(sel) {
    if (typeof sel === 'string') return Array.prototype.slice.call(query(sel));
    if (sel && sel.nodeType === 1) return [sel];
    return sel ? Array.prototype.filter.call(sel, function (n) { return !!n && n.nodeType === 1; }) : [];
  }

  // jQuery.speed(speed, easing, fn).
  function speed(duration, easing, complete) {
    var fn = typeof complete === 'function' ? complete
      : typeof easing === 'function' ? easing
      : typeof duration === 'function' ? duration : null;
    var name = typeof complete === 'function' || typeof easing === 'string' ? easing : null;
    var ms = typeof duration === 'number' ? duration
      : Object.prototype.hasOwnProperty.call(SPEEDS, duration) ? SPEEDS[duration] : SPEEDS._default;
    return { ms: motionOff() || !(ms > 0) ? 0 : ms, easing: EASING[name] || EASING.swing, complete: fn };
  }

  // jQuery's isHiddenWithinTree: the element's own display, inline first.
  function hiddenSelf(el) {
    var d = el.style.display;
    return d === 'none' || (d === '' && el.isConnected !== false && getComputedStyle(el).display === 'none');
  }

  function fxQueue(el) {
    if (!el.__snapFx) el.__snapFx = { queue: [], run: null };
    return el.__snapFx;
  }
  function dequeue(el) {
    var q = fxQueue(el);
    if (q.run || !q.queue.length) return;
    q.queue.shift()();
  }

  function frame(values) {
    var f = {};
    for (var p in values) {
      if (Object.prototype.hasOwnProperty.call(values, p)) f[p] = p === 'opacity' ? String(values[p]) : values[p] + 'px';
    }
    return f;
  }

  // One effect on one element, when its turn in the queue comes.
  function runFx(el, props, type, o) {
    var q = fxQueue(el);
    var style = el.style;
    var hidden = hiddenSelf(el);
    var mode = type === 'toggle' ? (hidden ? 'show' : 'hide') : type;
    var noop = mode === (hidden ? 'hide' : 'show');
    var box = !noop && (props.indexOf('height') !== -1 || props.indexOf('width') !== -1);
    var overflow = box ? [style.overflow, style.overflowX, style.overflowY] : null;
    var run = { anim: null, timer: null, over: false };
    q.run = run;

    // jumpToEnd: the end state and complete (the animation's done). Without
    // it (.stop()), the values stay where they were and complete never runs.
    run.end = function (jumpToEnd) {
      if (run.over) return;
      run.over = true;
      if (run.timer) clearTimeout(run.timer);
      if (jumpToEnd && !noop && mode === 'hide') hideDisplay(el);   // the last step of a hide
      if (run.anim) {
        if (!jumpToEnd) {
          var now = getComputedStyle(el);
          props.forEach(function (p) { style[p] = now[p]; });
        }
        try { run.anim.cancel(); } catch (_) { /* already gone */ }
      }
      if (overflow) {
        style.overflow = overflow[0];
        style.overflowX = overflow[1];
        style.overflowY = overflow[2];
      }
      q.run = null;
      if (jumpToEnd && o.complete) {
        try { o.complete.call(el); } catch (err) { console.error('[snap] fx complete', err); }
      }
      dequeue(el);
    };

    if (!noop) {
      if (box) style.overflow = 'hidden';
      if (mode === 'show') {
        clearBaked(el);
        showDisplay(el);
      }
      var cs = getComputedStyle(el);
      var from = {};
      var to = {};
      props.forEach(function (p) {
        var v = parseFloat(cs[p]);
        if (!isFinite(v)) v = 0;
        from[p] = mode === 'show' ? 0 : v;
        to[p] = mode === 'show' ? v : 0;
      });
      if (o.ms > 0 && typeof el.animate === 'function') {
        try {
          run.anim = el.animate([frame(from), frame(to)], { duration: o.ms, easing: o.easing, fill: 'forwards' });
        } catch (err) {
          run.anim = null;
        }
      }
    }
    if (!(o.ms > 0)) { run.end(true); return; }
    if (run.anim) run.anim.onfinish = function () { run.end(true); };
    // A one-shot backstop: a document that is not being rendered (a hidden
    // frame) may never deliver the animation's finish event.
    run.timer = setTimeout(function () { run.end(true); }, o.ms + (run.anim ? 100 : 0));
  }

  function animateNodes(nodes, props, type, duration, easing, complete) {
    var o = speed(duration, easing, complete);
    var list = nodesOf(nodes);
    list.forEach(function (el) {
      fxQueue(el).queue.push(function () { runFx(el, props, type, o); });
      dequeue(el);
    });
    return list;
  }
  function effect(props, type) {
    return function (nodes, duration, easing, complete) {
      return animateNodes(nodes, props, type, duration, easing, complete);
    };
  }
  var slideDown = effect(SLIDE, 'show');
  var slideUp = effect(SLIDE, 'hide');
  var slideToggle = effect(SLIDE, 'toggle');
  var fadeIn = effect(FADE, 'show');
  var fadeOut = effect(FADE, 'hide');
  var fadeToggle = effect(FADE, 'toggle');

  // .show() / .hide() / .toggle(): instant with no duration or a boolean
  // state, animated with one (jquery.js:4615-4635, :7755-7762). The instant
  // form does not wait for the queue, as in jQuery.
  function showHideFx(type) {
    return function (nodes, duration, easing, complete) {
      if (duration == null || typeof duration === 'boolean') {
        var list = nodesOf(nodes);
        list.forEach(function (el) {
          var on = type === 'show' || (type === 'toggle' && (typeof duration === 'boolean' ? duration : hiddenSelf(el)));
          if (on) { clearBaked(el); showDisplay(el); } else hideDisplay(el);
        });
        return list;
      }
      return animateNodes(nodes, SIZE, type, duration, easing, complete);
    };
  }

  // .stop([clearQueue], [jumpToEnd]) (jquery.js:7660-7711).
  function stop(nodes, clearQueue, jumpToEnd) {
    var list = nodesOf(nodes);
    list.forEach(function (el) {
      var q = el.__snapFx;
      if (!q) return;
      if (clearQueue) q.queue = [];
      if (q.run) q.run.end(!!jumpToEnd);
      else dequeue(el);
    });
    return list;
  }

  // A one-shot timer the motion switch collapses: fn after ms, or at once
  // with motion off. For a product file that mirrors a library's own CSS
  // transition timing (a popover's fade, a modal's backdrop).
  function wait(ms, fn) {
    if (typeof fn !== 'function') return;
    if (motionOff() || !(ms > 0)) { fn(); return; }
    setTimeout(fn, ms);
  }

  // ─── modal shell ─────────────────────────────────────────────────────────
  // Backdrop, title bar, close button, Escape, focus. The body is a sibling
  // snapshot in an iframe (opts.iframe, a URL) or a node (opts.body). The look
  // belongs to the product: pass opts.cls and style it there. The default is a
  // neutral twin of WordPress core's ThickBox (wp-includes/js/thickbox/
  // thickbox.css): 70% black backdrop, white panel with a soft shadow, a 29px
  // #fcfcfc title bar and a × close button.
  //
  //   modal({ title, iframe | body, width = 630, height = 440, cls, fadeOut, onClose })
  //     -> { el, close() }
  // width / height are the panel's outer size (ThickBox's TB_WIDTH / TB_HEIGHT).
  // fadeOut (a jQuery duration, e.g. 'fast'): closing fades the panel out
  // first, then removes panel and backdrop — ThickBox's tb_remove
  // (wp-includes/js/thickbox/thickbox.js:295-298). Without it, close is instant.
  // One at a time: opening a modal closes the one before.
  var MODAL_CSS = [
    '.snap-modal-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;background:#000;opacity:.7;z-index:100050}',
    '.snap-modal{position:fixed;top:50%;left:50%;z-index:100051;display:flex;flex-direction:column;box-sizing:border-box;'
      + 'background:#fff;box-shadow:0 3px 6px rgba(0,0,0,.3);text-align:left;outline:0}',
    '.snap-modal__title{position:relative;flex:0 0 auto;height:29px;background:#fcfcfc;border-bottom:1px solid #ddd}',
    '.snap-modal__heading{padding:0 39px 0 10px;font-size:13px;font-weight:600;line-height:29px;color:#1d2327;'
      + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.snap-modal__close{position:absolute;top:0;right:0;width:29px;height:29px;margin:0;padding:0;border:0;'
      + 'background:none;color:#666;font:normal 20px/29px sans-serif;text-align:center;cursor:pointer}',
    '.snap-modal__close:hover,.snap-modal__close:focus{color:#006799}',
    '.snap-modal__close:focus{outline:0;box-shadow:0 0 0 1px #5b9dd9,0 0 2px 1px rgba(30,140,190,.8)}',
    '.snap-modal__body{flex:1 1 auto;min-height:0;overflow:auto}',
    '.snap-modal__frame{display:block;width:100%;height:100%;border:0}'
  ].join('\n');

  var modalCss = false;
  var openModal = null;
  function modal(opts) {
    var o = opts || {};
    if (openModal) openModal.close();
    if (!modalCss) {
      var sheet = document.createElement('style');
      sheet.setAttribute('data-snap-modal', '');
      sheet.textContent = MODAL_CSS;
      (document.head || document.documentElement).appendChild(sheet);
      modalCss = true;
    }
    var w = o.width > 0 ? o.width : 630;
    var h = o.height > 0 ? o.height : 440;

    var back = document.createElement('div');
    back.className = 'snap-modal-backdrop';
    var panel = document.createElement('div');
    panel.className = 'snap-modal' + (o.cls ? ' ' + o.cls : '');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (o.title) panel.setAttribute('aria-label', o.title);
    panel.tabIndex = -1;
    panel.style.width = w + 'px';
    panel.style.height = h + 'px';
    panel.style.marginLeft = -Math.round(w / 2) + 'px';
    panel.style.marginTop = -Math.round(h / 2) + 'px';

    var bar = document.createElement('div');
    bar.className = 'snap-modal__title';
    var heading = document.createElement('div');
    heading.className = 'snap-modal__heading';
    heading.textContent = o.title || '';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'snap-modal__close';
    btn.setAttribute('aria-label', 'Close');
    btn.textContent = '×';
    bar.appendChild(heading);
    bar.appendChild(btn);

    var body = document.createElement('div');
    body.className = 'snap-modal__body';
    if (o.iframe) {
      var frame = document.createElement('iframe');
      frame.className = 'snap-modal__frame';
      if (o.title) frame.setAttribute('title', o.title);
      frame.src = o.iframe;
      body.appendChild(frame);
    } else if (o.body && o.body.nodeType) {
      body.appendChild(o.body);
    }
    panel.appendChild(bar);
    panel.appendChild(body);
    document.body.appendChild(back);
    document.body.appendChild(panel);

    var before = document.activeElement;
    var closed = false;
    var handle = null;
    function onKey(e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      e.preventDefault();
      close();
    }
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      var gone = function () {
        if (back.parentNode) back.parentNode.removeChild(back);
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        if (openModal === handle) openModal = null;
        if (before && typeof before.focus === 'function') { try { before.focus(); } catch (_) {} }
        if (typeof o.onClose === 'function') {
          try { o.onClose(); } catch (err) { console.error('[snap] modal onClose', err); }
        }
      };
      if (o.fadeOut != null && o.fadeOut !== false) fadeOut(panel, o.fadeOut, gone);
      else gone();
    }
    btn.addEventListener('click', function (e) { e.preventDefault(); close(); });
    back.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    try { btn.focus(); } catch (_) {}
    handle = { el: panel, close: close };
    openModal = handle;
    return handle;
  }

  // ─── libraries on demand (WO-202H, generalised from WO-202F) ─────────────
  // A widget the plugin draws on the client with a known library runs that
  // library's own build (DESIGN amendment T12), vendored in the product's
  // snapshots/_shared/lib/. A product entry asks for it:
  //
  //   lib(srcs, done) -> Promise of true (all loaded) | false (one failed)
  //
  // srcs: one path or a list, relative to the snapshot, in load order. Each
  // loads once per page, with a classic <script> element; calls queue in the
  // order they were made; done runs after the last file. A snapshot that never
  // asks loads nothing. A failure is logged and gives false.
  var scripts = {};
  var libQueue = null;
  function scriptKey(src) {
    try { return new URL(src, document.baseURI).href; } catch (_) { return String(src); }
  }
  function loadScript(src) {
    var key = scriptKey(src);
    if (!scripts[key]) {
      scripts[key] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('could not load ' + src)); };
        (document.head || document.documentElement).appendChild(s);
      });
    }
    return scripts[key];
  }
  function lib(srcs, done) {
    var files = [].concat(srcs || []);
    var job = (libQueue || Promise.resolve()).then(function () {
      return files.reduce(function (p, src) {
        return p.then(function () { return loadScript(src); });
      }, Promise.resolve());
    });
    libQueue = job.then(null, function () {});
    return job.then(function () {
      if (typeof done === 'function') {
        try { done(); } catch (err) { console.error('[snap] lib', err); }
      }
      return true;
    }, function (err) {
      console.error('[snap] lib', err);
      return false;
    });
  }

  // ─── charts (DESIGN §6, WO-202F) ─────────────────────────────────────────
  // A chart the capture froze to an <img data-from-canvas> comes back live:
  //
  //   chart(host, config, { lib, global, id }) -> Promise of the chart | null
  //
  // lib lists the product's vendored chart library files, relative to the
  // snapshot, in load order. lib() loads them, then the charts.js add-on
  // next to this file, on the first call only: a snapshot with no chart pays
  // nothing. charts.js does the rest (host, config, global and id are
  // explained there). Calls run one after another, in the order they were
  // made; a failure is logged and gives null.
  var CHARTS_JS = (function () {
    var src = (document.currentScript && document.currentScript.src) || '';
    var addon = src.replace(/\/core\.js(?:[?#].*)?$/, '/charts.js');
    return addon !== src ? addon : '../../../_runtime/charts.js';
  }());
  var chartQueue = null;
  function chart(host, config, opts) {
    var o = opts || {};
    var job = (chartQueue || Promise.resolve()).then(function () {
      return lib([].concat(o.lib || [], CHARTS_JS));
    }).then(function (loaded) {
      if (!loaded) throw new Error('a chart library did not load');
      return window.SnapCharts ? window.SnapCharts.render(host, config, o) : null;
    });
    chartQueue = job.then(null, function () {});
    return job.then(null, function (err) {
      console.error('[snap] chart', err);
      return null;
    });
  }

  // ─── boot ────────────────────────────────────────────────────────────────
  function boot() {
    if (booted) return;
    booted = true;
    // click first, so a matched transition preventDefaults before the nav
    // handler (added by initNav) sees the same event.
    ensureListener('click');
    for (var i = 0; i < TRANSITIONS.length; i++) ensureListener(TRANSITIONS[i].event);
    initNav();
    if (typeof window.addEventListener === 'function') window.addEventListener('pageshow', restoreFade);
    IS.inFilm = window.parent !== window;
    IS.handBrowse = window.parent === window;
    IS.slug = currentSlug();
    IS.product = productOf();
    announceParams();
  }

  // A snapshot opened with carried params announces them once, on <body>, as a
  // `snap:params` event — an entry with that event applies them the way the
  // plugin's server would have (a prefilled form, for instance).
  function announceParams() {
    var p = openedWith();
    var any = false;
    for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) { any = true; break; }
    if (!any || !document.body || typeof CustomEvent !== 'function') return;
    ensureListener('snap:params');
    try { document.body.dispatchEvent(new CustomEvent('snap:params', { bubbles: true, detail: p })); }
    catch (err) { console.error('[snap] snap:params', err); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);   // never inline — the product file has not parsed yet
  }

  API = window.SnapRuntime = {
    version: 1,

    // 'real' (jQuery's own durations) or 'off' (every effect ends at once).
    // Set it any time; a harness that must set it before load sets
    // window.SnapRuntime = { motion: 'off' } first, and core keeps that.
    motion: PRE && PRE.motion === 'off' ? 'off' : 'real',

    register: register,
    transitions: TRANSITIONS,

    goto: goto,
    navKey: navKey,
    navApply: navApply,
    navMap: navMap,
    resolve: resolve,
    resolveHref: resolveHref,
    currentSlug: currentSlug,
    params: openedWith,
    // An entry whose link target is not captured yet logs it like a nav miss;
    // note says why, when the entry knows.
    miss: function (href, note) { recordMiss(href, keyOf(href), note); },

    fadeSwap: fadeSwap,
    toggleTarget: toggleTarget,
    selectOne: selectOne,
    // A reveal core does not perform itself (a class the product adds, a
    // library's own open state) clears a marked bake stamp through this.
    clearBaked: clearBaked,
    modal: modal,

    // jQuery's effects (WO-202H), and a timer the motion switch collapses.
    slideDown: slideDown,
    slideUp: slideUp,
    slideToggle: slideToggle,
    fadeIn: fadeIn,
    fadeOut: fadeOut,
    fadeToggle: fadeToggle,
    show: showHideFx('show'),
    hide: showHideFx('hide'),
    toggle: showHideFx('toggle'),
    stop: stop,
    wait: wait,

    lib: lib,
    chart: chart,

    emit: emit,
    is: IS
  };
}());
