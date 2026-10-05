/* products/athemes-addons/snapshots/_shared/interactivity.js — aThemes Addons (Elementor) + aThemes Blocks
 * snapshot runtime. Loads after products/_runtime/core.js. Every entry cites the source it mirrors
 * (roots: lite/ = athemes-addons-for-elementor-lite/, pro/ = athemes-addons-for-elementor/,
 * blocks/ = athemes-blocks/, elementor/ = elementor/, wp/ = WordPress core).
 * Outcomes: a control either changes the page, opens a captured sibling snapshot, or logs
 * "[snap] live only: …" (it saves, sends or leaves the site) / "[snap] not captured: …".
 */
(function () {
  'use strict';
  var R = window.SnapRuntime;
  if (!R) { console.error('[snap] core.js did not load'); return; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var up = function (el, s) { return el && el.closest ? el.closest(s) : null; };
  var stop = function (evt) { if (evt) { evt.preventDefault(); evt.stopPropagation(); evt.__snapHandled = true; } };
  var say = function (msg) { console.info('[snap] ' + msg); };
  var live = function (what) { say('live only: ' + what + ' (saves, sends or leaves the site — not replayed in a snapshot)'); };
  var notCaptured = function (what) { say('not captured: ' + what); };
  var slug = R.currentSlug ? R.currentSlug() : '';
  var isElementor = !!document.getElementById('elementor-editor-wrapper') || /^editor-(el|tb)-|^editor-elementor/.test(slug);
  var isBlockEditor = !!document.querySelector('.block-editor, .edit-post-layout, .editor-editor-interface');
  var WORLD = 'northlinestudio.com';

  // Captured sibling? A sync HEAD on ../<slug>/index.html, cached (snapshots are static files).
  var known = {};
  function has(s) {
    if (s in known) return known[s];
    var ok = false;
    try { var x = new XMLHttpRequest(); x.open('HEAD', '../' + s + '/index.html', false); x.send(null); ok = x.status >= 200 && x.status < 300; } catch (e) { ok = false; }
    return (known[s] = ok);
  }
  // Every captured slug of the pack (../index.json), read once.
  var sib = null;
  function siblings() {
    if (sib) return sib;
    sib = [];
    try { var x = new XMLHttpRequest(); x.open('GET', '../index.json', false); x.send(null); var j = JSON.parse(x.responseText); var list = Array.isArray(j) ? j : (j.snapshots || Object.values(j)); sib = list.map(function (e) { return e && e.slug; }).filter(Boolean); } catch (e) { sib = []; }
    sib.forEach(function (s) { known[s] = true; });
    return sib;
  }
  var sydKnown = {};
  function hasIn(pack, s) {
    var k = pack + '/' + s; if (k in sydKnown) return sydKnown[k];
    var ok = false;
    try { var x = new XMLHttpRequest(); x.open('HEAD', '../../../' + pack + '/snapshots/' + s + '/index.html', false); x.send(null); ok = x.status >= 200 && x.status < 300; } catch (e) { ok = false; }
    return (sydKnown[k] = ok);
  }
  function hop(s, what) { if (has(s)) R.goto(s); else notCaptured((what || s) + ' (snapshot ' + s + ')'); }

  // Frontend path → the slug of the demo page that holds it (p1-frontend plan: frontend-<page slug>).
  function frontSlugFor(href) {
    var a = document.createElement('a'); a.href = href;
    var path = a.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
    if (!path) return null;
    return 'frontend-' + path.split('/').pop();
  }

  R.register([
    // ─ Links (every screen) ─────────────────────────────────────────────────────
    // Core swallows relative admin links; these are the ones it leaves: frontend pages of the demo
    // world, external sites, mail and phone links.
    // @since 2026-10-03 @source wp/ (plain anchors) @verified 2026-10-03 @product athemes-addons
    {
      label: 'link-world-page',
      event: 'click',
      match: function (el) {
        var a = up(el, 'a[href]'); if (!a || up(a, '#adminmenuwrap, #wpadminbar')) return false;
        var h = a.getAttribute('href') || '';
        return h.indexOf('//' + WORLD) !== -1 && h.indexOf('/wp-admin/') === -1 && h.indexOf('/wp-content/') === -1;
      },
      apply: function (el, evt) {
        stop(evt); var a = up(el, 'a[href]');
        if (a.getAttribute('href').indexOf('/wp-content/') !== -1) { live('opens the file ' + a.getAttribute('href').split('/').pop()); return; }
        var s = frontSlugFor(a.href) || 'frontend-home';
        var path = a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '');
        if (s === slug) { say('current page'); return; }
        if (has(s)) { R.goto(s); return; }
        // Northline pages outside the demo pages are the sydney pack's frontend snapshots.
        var alias = { 'frontend-the-portfolio': 'frontend-work', 'frontend-journal': 'frontend-blog' };
        var syd = [s, alias[s]].filter(Boolean).filter(function (x) { return hasIn('sydney', x); })[0];
        if (syd) { R.goto(syd, { pack: 'sydney' }); return; }
        notCaptured('frontend page ' + path + ' (not in this pack or the sydney pack)');
      }
    },
    {
      label: 'link-external',
      event: 'click',
      match: function (el) {
        var a = up(el, 'a[href]'); if (!a) return false;
        var h = a.getAttribute('href') || '';
        return /^(mailto|tel):/.test(h) || (/^https?:\/\//.test(h) && h.indexOf(WORLD) === -1 && h.indexOf(location.host) === -1);
      },
      apply: function (el, evt) { stop(evt); live('external link ' + (up(el, 'a[href]').getAttribute('href') || '').slice(0, 80)); }
    },

    // ─ Frontend widgets ────────────────────────────────────────────────────────
    // @since 2026-10-03 @source pro/assets/js/modules/advanced-tabs/advanced-tabs.js:10-27 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-tabs',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-tabs .athemes-tab-title'); },
      apply: function (el, evt) {
        stop(evt);
        var t = up(el, '.athemes-tab-title'), tabs = up(t, '.athemes-addons-tabs');
        if (t.classList.contains('active-tab')) { say('current tab'); return; }
        $$('.athemes-tab-title', tabs).forEach(function (x) { var on = x === t || (x.getAttribute('aria-controls') === t.getAttribute('aria-controls')); x.classList.toggle('active-tab', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
        $$('.athemes-tab-content', tabs).forEach(function (c) { var on = c.id === t.getAttribute('aria-controls'); if (on) { c.removeAttribute('hidden'); R.clearBaked(c); } else c.setAttribute('hidden', 'hidden'); c.classList.toggle('active-tab', on); });
      }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/content-switcher/content-switcher.js:10-31 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-content-switcher',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-content-switcher .switcher-item, .athemes-addons-content-switcher .aafe-switcher'); },
      apply: function (el, evt) {
        var w = up(el, '.athemes-addons-content-switcher'), cb = $('.aafe-switcher input[type=checkbox]', w);
        var item = up(el, '.switcher-item');
        var second = item ? item.getAttribute('data-target') === 'second' : !(cb && cb.checked) ;
        if (!item && up(el, 'input')) second = cb.checked; else stop(evt);
        $$('.aafe-switcher-content-item', w).forEach(function (c, i) { c.classList.toggle('active', i === (second ? 1 : 0)); });
        $$('.switcher-item', w).forEach(function (c, i) { c.classList.toggle('active', i === (second ? 1 : 0)); });
        if (cb) cb.checked = second;
      }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/content-reveal/content-reveal.js:13-27 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-content-reveal',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-content-reveal .aafe-button'); },
      apply: function (el, evt) {
        stop(evt);
        var w = up(el, '.athemes-addons-content-reveal'), b = $('.aafe-button', w), c = $('.content-inner', w);
        var open = w.getAttribute('data-content-state') !== 'expanded';
        w.setAttribute('data-content-state', open ? 'expanded' : 'hidden');
        var t = $('.button-text', b); if (t) t.textContent = b.getAttribute(open ? 'data-collapse-text' : 'data-expand-text');
        c.style.height = open ? c.scrollHeight + 'px' : (w.getAttribute('data-max-height') || 150) + 'px';
      }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/modal/modal.js:9-36 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-modal-open',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-modal-trigger-wrapper .aafe-button, .athemes-addons-modal-trigger-wrapper a'); },
      apply: function (el, evt) {
        stop(evt);
        var m = $('.athemes-addons-modal', up(el, '.elementor-widget-container'));
        if (m) { m.setAttribute('aria-hidden', 'false'); m.style.display = 'block'; m.style.visibility = 'visible'; R.clearBaked(m); }
      }
    },
    {
      label: 'aafe-modal-close',
      event: 'click',
      match: function (el) { var m = up(el, '.athemes-addons-modal'); return !!m && (!!up(el, '.athemes-addons-modal-close') || !up(el, '.athemes-addons-modal-content')); },
      apply: function (el, evt) { stop(evt); var m = up(el, '.athemes-addons-modal'); m.setAttribute('aria-hidden', 'true'); m.style.display = 'none'; }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/offcanvas/offcanvas.js:12-58 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-offcanvas',
      event: 'click',
      match: function (el) {
        return !!up(el, '.offcanvas-close, .athemes-addons-offcanvas-overlay') || $$('.athemes-addons-offcanvas-content[data-trigger]').some(function (o) { try { return !!up(el, o.getAttribute('data-trigger')); } catch (e) { return false; } });
      },
      apply: function (el, evt) {
        stop(evt);
        var close = !!up(el, '.offcanvas-close, .athemes-addons-offcanvas-overlay');
        $$('.athemes-addons-offcanvas-content[data-trigger]').forEach(function (o) {
          var on = close ? false : !o.classList.contains('offcanvas-active');
          o.classList.toggle('offcanvas-active', on);
          var ov = o.parentNode && $('.athemes-addons-offcanvas-overlay', o.parentNode); if (ov) ov.classList.toggle('offcanvas-active', on);
          if (on) R.clearBaked(o);
        });
      }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/coupon-code/coupon-code.js:10-30 @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-coupon',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-coupon-code .coupon-button'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, '.coupon-button'), w = up(b, '.athemes-addons-coupon-code'), code = $('.coupon-code', w);
        if (code) code.classList.toggle('active');
        var t = b.getAttribute('data-snap-text') || b.textContent; b.setAttribute('data-snap-text', t);
        b.textContent = b.getAttribute('data-after-click-text') || 'Copied';
        setTimeout(function () { b.textContent = b.getAttribute('data-snap-text'); }, 2000);
      }
    },
    // @since 2026-10-03 @source pro/assets/js/modules/click-to-call/click-to-call.js:12-21 (+ whatsapp-chat, telegram-chat: same live-chat markup) @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-live-chat',
      event: 'click',
      match: function (el) { return !!up(el, '.live-chat-button-toggle, .live-chat-close') && !!up(el, '.athemes-addons-click-to-call, .athemes-addons-whatsapp-chat, .athemes-addons-telegram-chat'); },
      apply: function (el, evt) {
        stop(evt);
        var c = up(el, '.athemes-addons-click-to-call, .athemes-addons-whatsapp-chat, .athemes-addons-telegram-chat');
        c.classList.toggle('live-chat-open', !up(el, '.live-chat-close') && !c.classList.contains('live-chat-open'));
      }
    },
    {
      label: 'aafe-live-chat-start',
      event: 'click',
      match: function (el) { return !!up(el, '.live-chat-button-wrapper a, .live-chat-button-wrapper button, .live-chat-start'); },
      apply: function (el, evt) { stop(evt); live('start a call / chat with the studio'); }
    },
    // @since 2026-10-03 @source lite/assets/js/modules/gallery/gallery.js (Isotope filter on data-filter) @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-gallery-filter',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-gallery .gallery-filter a, .athemes-addons-gallery [data-filter], .athemes-addons-video-gallery [data-filter], .gallery-filters a'); },
      apply: function (el, evt) {
        stop(evt);
        var a = up(el, 'a, [data-filter]'), g = up(a, '.elementor-widget-container') || document;
        var f = a.getAttribute('data-filter') || '*';
        $$('a, [data-filter]', a.parentNode.parentNode).forEach(function (x) { if (x.hasAttribute('data-filter') || x.tagName === 'A') x.classList.toggle('active', x === a); });
        $$('.gallery-item, .portfolio-item, [class*="-item"][class*="filter-"]', g).forEach(function (it) {
          var on = f === '*' || it.matches(f) ;
          it.style.display = on ? '' : 'none';
        });
      }
    },
    // Swiper sliders / carousels (slider, advanced-carousel, logo-carousel, testimonials, team-carousel,
    // posts-carousel, video-carousel): bullets and arrows move the parked swiper. anim-final parks slide 1.
    // @since 2026-10-03 @source lite/assets/js/modules/slider/slider.js (Swiper 8 navigation + pagination) @verified 2026-10-03 @product athemes-addons
    {
      label: 'swiper-nav',
      event: 'click',
      match: function (el) { return !!up(el, '.swiper-pagination-bullet, .swiper-button-next, .swiper-button-prev'); },
      apply: function (el, evt) {
        stop(evt);
        var host = up(el, '.elementor-widget-container') || document.body;
        var sw = $('.swiper-container, .swiper', host); if (!sw) return;
        var wrap = $('.swiper-wrapper', sw); var slides = $$('.swiper-slide:not(.swiper-slide-duplicate)', wrap);
        if (!slides.length) return;
        var cur = Number(sw.getAttribute('data-snap-index') || 0);
        var bullets = $$('.swiper-pagination-bullet', host);
        var perView = Math.max(1, Math.round(sw.clientWidth / (slides[0].getBoundingClientRect().width || sw.clientWidth)));
        var max = Math.max(0, slides.length - perView);
        var next = cur;
        if (up(el, '.swiper-pagination-bullet')) next = bullets.indexOf(up(el, '.swiper-pagination-bullet')) * (bullets.length > 1 ? Math.max(1, Math.ceil(max / (bullets.length - 1))) : 1);
        else if (up(el, '.swiper-button-next')) next = cur >= max ? 0 : cur + 1;
        else next = cur <= 0 ? max : cur - 1;
        next = Math.max(0, Math.min(max, next));
        sw.setAttribute('data-snap-index', next);
        var fade = sw.classList.contains('swiper-fade');
        if (fade) slides.forEach(function (s, i) { s.style.transition = 'opacity .3s'; s.style.opacity = i === next ? '1' : '0'; s.style.zIndex = i === next ? '2' : '1'; s.classList.toggle('swiper-slide-active', i === next); });
        else { var x = slides[next].offsetLeft - slides[0].offsetLeft; wrap.style.transitionDuration = '300ms'; wrap.style.transform = 'translate3d(' + (-x) + 'px,0,0)'; slides.forEach(function (s, i) { s.classList.toggle('swiper-slide-active', i === next); }); }
        bullets.forEach(function (b, i) { b.classList.toggle('swiper-pagination-bullet-active', i === Math.min(bullets.length - 1, Math.round(next / Math.max(1, Math.ceil(max / Math.max(1, bullets.length - 1)))))); });
        $$('.swiper-button-prev', host).forEach(function (b) { b.classList.toggle('swiper-button-disabled', next === 0 && !fade); });
        $$('.swiper-button-next', host).forEach(function (b) { b.classList.toggle('swiper-button-disabled', next === max && !fade); });
        say('slide ' + (next + 1) + ' of ' + slides.length);
      }
    },
    // Table of contents: jump to the heading, mark the link (lite/assets/js/modules/table-of-contents/table-of-contents.js).
    // @since 2026-10-03 @source lite/assets/js/modules/table-of-contents/table-of-contents.js @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-toc',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href^="#"]'); return !!a && !!up(a, '.athemes-addons-table-of-contents, .elementor-widget-athemes-addons-table-of-contents'); },
      apply: function (el, evt) {
        stop(evt); var a = up(el, 'a[href^="#"]'); var id = a.getAttribute('href').slice(1);
        var t = document.getElementById(id); if (t) t.scrollIntoView({ block: 'start' });
        $$('a', up(a, '.elementor-widget-container')).forEach(function (x) { x.classList.toggle('toc-active', x === a); });
        say('jumped to "' + (a.textContent || '').trim().slice(0, 40) + '"');
      }
    },
    // Buttons whose href is "#" on a demo page (modal/offcanvas triggers handled above): nothing to open.
    {
      label: 'hash-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href="#"]'); return !!a && !up(a, '#adminmenuwrap'); },
      apply: function (el, evt) { stop(evt); say('no target: this demo button has no link'); }
    },

    // ─ Elementor editor chrome ─────────────────────────────────────────────────
    // Panel tabs: Content / Style / Advanced → the sibling capture of the same widget.
    // @since 2026-10-03 @source elementor/assets/js/editor.js ($e.route('panel/editor/<tab>')) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-panel-tab',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-panel-navigation-tab'); },
      apply: function (el, evt) {
        stop(evt);
        var t = up(el, '.elementor-panel-navigation-tab'), tab = (t.className.match(/elementor-tab-control-(\w+)/) || [])[1];
        var base = slug.replace(/(-style--.*|-advanced(--.*)?|--.*)$/, '');
        if (t.classList.contains('elementor-active')) { say('current tab'); return; }
        if (tab === 'content') return hop(base, 'Content tab');
        var pre = base + (tab === 'style' ? '-style--' : '-advanced');
        var cands = siblings().filter(function (s) { return s.indexOf(pre) === 0; });
        if (cands.length) return R.goto(cands[0]);
        notCaptured(tab + ' tab of this widget (P2 captures the Style tab where a doc names it)');
      }
    },
    // Section headings → the sibling capture with that section open, else not captured.
    // @since 2026-10-03 @source elementor/assets/js/editor.js (activateSection) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-panel-section',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-control-type-section .elementor-panel-heading'); },
      apply: function (el, evt) {
        stop(evt);
        var sec = up(el, '.elementor-control-type-section');
        var name = ((sec.className.match(/elementor-control-(section_[\w-]+|[\w-]+_section|[\w-]+)\s/) || [])[1] || '').replace(/^section_/, '').replace(/_/g, '-');
        if (sec.classList.contains('elementor-open')) { sec.classList.remove('elementor-open'); $$('.elementor-control', sec.parentNode).forEach(function () {}); say('section collapsed'); return; }
        var base = slug.replace(/(-style--.*|-advanced(--.*)?|--.*)$/, '');
        var tab = /-style--/.test(slug) ? '-style--' : '--';
        var s = base + tab + name;
        if (s === slug) { say('section "' + (el.textContent || '').trim() + '" is the open one'); return; }
        hop(s, 'section "' + (el.textContent || '').trim() + '"');
      }
    },
    // Repeater rows: open/close the row, duplicate, remove, add (client-side edits of the list).
    // @since 2026-10-03 @source elementor/assets/js/editor.js (Repeater control: toggle / duplicate / remove / add) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-repeater',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-repeater-row-item-title, .elementor-repeater-tool-duplicate, .elementor-repeater-tool-remove, .elementor-repeater-add'); },
      apply: function (el, evt) {
        stop(evt);
        var row = up(el, '.elementor-repeater-fields'), list = up(el, '.elementor-control-type-repeater');
        if (up(el, '.elementor-repeater-tool-remove')) { row.remove(); return; }
        if (up(el, '.elementor-repeater-tool-duplicate')) { row.parentNode.insertBefore(row.cloneNode(true), row.nextSibling); return; }
        if (up(el, '.elementor-repeater-add')) {
          var rows = $$('.elementor-repeater-fields', list); var last = rows[rows.length - 1]; if (!last) return;
          var n = last.cloneNode(true); var tt = $('.elementor-repeater-row-item-title', n); if (tt) tt.textContent = 'Item #' + (rows.length + 1);
          last.parentNode.appendChild(n); return;
        }
        var open = !row.classList.contains('editable');
        $$('.elementor-repeater-fields', list).forEach(function (r) { r.classList.remove('editable'); });
        row.classList.toggle('editable', open); row.classList.toggle('snap-row-expanded', open);
        if (open && !$('.elementor-repeater-row-controls .elementor-control', row)) notCaptured('the fields of this row (Elementor renders them on open)');
      }
    },
    // Colour controls: Elementor builds its Pickr popover on first click. Load Elementor's own Pickr
    // (elementor/assets/lib/pickr, vendored to _shared/lib/pickr) and open it on the control's colour.
    // @since 2026-10-03 @source elementor/assets/lib/pickr/pickr.min.js (ColorPicker on .pcr-button, theme monolith) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-color-picker',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.pcr-button'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, '.pcr-button');
        if (b.__snapPickr) { if (b.__snapPickr.isOpen()) b.__snapPickr.hide(); else b.__snapPickr.show(); return; }
        if (!document.getElementById('snap-pickr-css')) { var l = document.createElement('link'); l.id = 'snap-pickr-css'; l.rel = 'stylesheet'; l.href = '../_shared/lib/pickr/monolith.min.css'; document.head.appendChild(l); }
        var color = (b.style.getPropertyValue('--pcr-color') || '').trim() || '#16302A';
        R.lib(['../_shared/lib/pickr/pickr.min.js']).then(function () {
          if (!window.Pickr) return notCaptured('the colour picker library');
          var p = window.Pickr.create({ el: b, useAsButton: true, theme: 'monolith', default: color, defaultRepresentation: 'HEXA', position: 'left-start',
            components: { preview: true, opacity: true, hue: true, interaction: { hex: true, rgba: true, hsla: true, input: true, clear: true } } });
          p.on('change', function (c) { b.style.setProperty('--pcr-color', c.toRGBA().toString(0)); });
          b.__snapPickr = p; p.show(); say('colour picker open');
        });
      }
    },
    // select2 MULTIPLE (Elementor SELECT2 controls with multiple: social networks, post types…): the merchant
    // block leaves multi-selects alone, so: the box opens a dropdown of the unselected options, a pick adds a
    // chip, a chip's × removes it, the clear × removes all. Built from the captured <select>'s own options.
    // @since 2026-10-03 @source elementor/assets/lib/e-select2 (select2 4.0.6 multiple selection) @verified 2026-10-03 @product athemes-addons
    {
      label: 's2m-remove',
      event: 'click',
      match: function (el) { return !!up(el, '.select2-selection--multiple .select2-selection__choice__remove, .select2-selection--multiple .select2-selection__clear'); },
      apply: function (el, evt) {
        stop(evt);
        var box = up(el, '.select2-container'), sel = box && box.previousElementSibling; if (!sel || sel.tagName !== 'SELECT') return;
        if (up(el, '.select2-selection__clear')) { [].forEach.call(sel.options, function (o) { o.selected = false; o.removeAttribute('selected'); }); $$('.select2-selection__choice:not(.select2-selection__e-plus-button)', box).forEach(function (c) { c.remove(); }); return; }
        var chip = up(el, '.select2-selection__choice'), t = (chip.getAttribute('title') || '').trim();
        [].forEach.call(sel.options, function (o) { if (o.text.trim() === t) { o.selected = false; o.removeAttribute('selected'); } });
        chip.remove(); sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    {
      label: 's2m-open',
      event: 'click',
      match: function (el) { return !!up(el, '.select2-selection--multiple') && !up(el, '.select2-selection__choice__remove, .select2-selection__clear'); },
      apply: function (el, evt) {
        stop(evt);
        var box = up(el, '.select2-container'), sel = box.previousElementSibling; if (!sel || sel.tagName !== 'SELECT') return;
        var old = document.querySelector('.snap-s2m-drop'); if (old) { old.remove(); if (old.__box === box) return; }
        var r = box.getBoundingClientRect(), drop = document.createElement('span');
        drop.className = 'select2-container select2-container--default select2-container--open snap-s2m-drop'; drop.__box = box;
        drop.style.cssText = 'position:absolute;left:' + (r.left + window.scrollX) + 'px;top:' + (r.bottom + window.scrollY) + 'px;z-index:100000';
        var html = '<span class="select2-dropdown select2-dropdown--below" style="width:' + r.width + 'px"><span class="select2-results"><ul class="select2-results__options" role="listbox">';
        var n = 0; [].forEach.call(sel.options, function (o) { if (o.selected) return; n++; html += '<li class="select2-results__option" role="option" data-snap-value="' + o.value + '">' + o.text + '</li>'; });
        if (!n) html += '<li class="select2-results__option select2-results__message">No results found</li>';
        drop.innerHTML = html + '</ul></span></span>'; document.body.appendChild(drop); box.classList.add('select2-container--open');
      }
    },
    {
      label: 's2m-pick',
      event: 'click',
      match: function (el) { return !!up(el, '.snap-s2m-drop .select2-results__option[data-snap-value]'); },
      apply: function (el, evt) {
        stop(evt);
        var li = up(el, '.select2-results__option'), drop = up(li, '.snap-s2m-drop'), box = drop.__box, sel = box.previousElementSibling, v = li.getAttribute('data-snap-value');
        [].forEach.call(sel.options, function (o) { if (o.value === v) { o.selected = true; o.setAttribute('selected', 'selected'); } });
        var chip = document.createElement('li'); chip.className = 'select2-selection__choice'; chip.title = li.textContent; chip.innerHTML = '<span class="select2-selection__choice__remove" role="presentation">×</span>' + li.textContent;
        var ul = $('.select2-selection__rendered', box), before = $('.select2-selection__e-plus-button, .select2-search--inline', ul); ul.insertBefore(chip, before);
        drop.remove(); box.classList.remove('select2-container--open'); sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    {
      label: 's2m-outside',
      event: 'click',
      order: 'last',
      match: function (el) { return !!document.querySelector('.snap-s2m-drop') && !up(el, '.snap-s2m-drop, .select2-selection--multiple'); },
      apply: function () { var d = document.querySelector('.snap-s2m-drop'); if (d) { if (d.__box) d.__box.classList.remove('select2-container--open'); d.remove(); } }
    },
    // Widget panel (Add Element): a widget is dragged onto the page (live); a category heading folds its list.
    // @since 2026-10-03 @source elementor/assets/js/editor.js (panel elements: categories collapse, drag to add) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-panel-widget',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '#elementor-panel-elements .elementor-element, #elementor-panel-elements-wrapper .elementor-element'); },
      apply: function (el, evt) { stop(evt); live('drag "' + (up(el, '.elementor-element').textContent || '').trim() + '" onto the page to add it'); }
    },
    {
      label: 'el-panel-category',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-panel-category-title, .elementor-panel-heading.elementor-panel-category-title, .elementor-panel-category .elementor-panel-heading'); },
      apply: function (el, evt) {
        stop(evt); var c = up(el, '.elementor-panel-category'); if (!c) return;
        var open = !c.classList.contains('elementor-active'); c.classList.toggle('elementor-active', open);
        var items = $('.elementor-panel-category-items', c); if (items) items.style.display = open ? '' : 'none';
      }
    },
    {
      label: 'el-panel-promo',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-panel-custom-widgets__cta, .elementor-panel-category a, .MuiDialog-root button, .MuiDialog-root a, [class*=promotion] a, [class*=promotion] button'); },
      apply: function (el, evt) { stop(evt); live((el.textContent || 'upgrade').trim() + ' (elementor.com)'); }
    },
    // Dynamic tags list: an open list closes on any click outside it (elementor/core/dynamic-tags, tags-list view).
    // @since 2026-10-03 @source elementor/assets/js/editor.js (dynamic tags list: outside click closes) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-tags-list-close',
      event: 'click',
      match: function (el) { var l = $('.elementor-tags-list'); return isElementor && !!l && l.offsetParent !== null && !up(el, '.elementor-tags-list'); },
      apply: function (el, evt) { stop(evt); var l = $('.elementor-tags-list'); l.style.display = 'none'; say('dynamic tags list closed'); }
    },
    {
      label: 'el-tags-list-item',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-tags-list__item'); },
      apply: function (el, evt) { stop(evt); live('insert the dynamic tag "' + (el.textContent || '').trim() + '"'); }
    },
    {
      label: 'el-notice-dismiss',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-control-notice-dismiss'); },
      apply: function (el, evt) { stop(evt); var n = up(el, '.elementor-control-notice, .elementor-control'); if (n) n.style.display = 'none'; say('notice hidden (live: also remembered for this user)'); }
    },
    {
      label: 'el-button-control',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-control-type-button button'); },
      apply: function (el, evt) { stop(evt); live((el.textContent || 'panel action').trim() + ' (runs on the server)'); }
    },
    {
      label: 'el-link-dimensions',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-link-dimensions'); },
      apply: function (el, evt) { stop(evt); var b = up(el, '.elementor-link-dimensions'); var on = !b.classList.contains('unlinked'); b.classList.toggle('unlinked', on); b.classList.toggle('snap-linked-active', !on); say('values ' + (on ? 'unlinked' : 'linked')); }
    },
    {
      label: 'el-url-options',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-control-url-more'); },
      apply: function (el, evt) {
        stop(evt); var c = up(el, '.elementor-control'), o = c && $('.elementor-control-url-more-options', c);
        if (o) { var open = o.style.display !== 'block'; o.style.display = open ? 'block' : 'none'; up(el, '.elementor-control-url-more').classList.toggle('snap-options-active', open); R.clearBaked(o); }
        else notCaptured('the link options of this field');
      }
    },
    {
      label: 'el-preview-apply',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-update-preview-button'); },
      apply: function (el, evt) { stop(evt); say('preview refreshed (the preview here is the captured page)'); }
    },
    // Choose controls (icon radio groups) and responsive switchers inside the panel.
    // @since 2026-10-03 @source elementor/assets/js/editor.js (ControlChooseItemView, responsive switchers) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-choose',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-choices-label'); },
      apply: function (el, evt) {
        stop(evt);
        var l = up(el, '.elementor-choices-label'), id = l.getAttribute('for'), inp = id && document.getElementById(id);
        var grp = up(l, '.elementor-choices');
        if (inp) { var was = inp.checked; $$('input', grp).forEach(function (i) { i.checked = false; }); inp.checked = !was; }
        $$('.elementor-choices-label', grp).forEach(function (x) { x.classList.toggle('snap-selected', x === l && (!inp || inp.checked)); });
      }
    },
    {
      label: 'el-responsive-switcher',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-responsive-switcher'); },
      apply: function (el, evt) { stop(evt); var c = up(el, '.elementor-control'); if (c) c.classList.toggle('elementor-responsive-switchers-open'); }
    },
    {
      label: 'el-control-label',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '.elementor-control label, label.elementor-control-title') && !up(el, '.elementor-choices-label, .elementor-switch, .elementor-control-dynamic-switcher'); },
      apply: function (el, evt) {
        stop(evt);
        var c = up(el, '.elementor-control'), f = c && $('input:not([type=hidden]), select, textarea, .elementor-control-media-area', c);
        if (f && f.focus) f.focus();
        if (c) { c.classList.add('snap-active-control'); setTimeout(function () { c.classList.remove('snap-active-control'); }, 1500); }
      }
    },
    // Top bar (Elementor 4 app bar, MUI): device modes change the preview; the rest go to captures or are live-only.
    // @since 2026-10-03 @source elementor/modules/editor-app-bar (Elementor 4.0 top bar) @verified 2026-10-03 @product athemes-addons
    {
      label: 'el-device',
      event: 'click',
      match: function (el) { var b = up(el, 'button[role=tab], .MuiTab-root'); return isElementor && !!b && /Desktop|Tablet|Mobile/.test(b.getAttribute('aria-label') || b.textContent || b.title || ''); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, 'button[role=tab], .MuiTab-root'), lab = b.getAttribute('aria-label') || b.textContent || '';
        var mode = /Tablet/.test(lab) ? 'tablet' : /Mobile/.test(lab) ? 'mobile' : 'desktop';
        $$('.MuiTab-root', b.parentNode).forEach(function (x) { var on = x === b; x.classList.toggle('Mui-selected', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
        document.body.classList.remove('elementor-device-desktop', 'elementor-device-tablet', 'elementor-device-mobile');
        document.body.classList.add('elementor-device-' + mode);
        var f = document.getElementById('elementor-preview-iframe'), w = $('#elementor-preview-responsive-wrapper');
        var width = mode === 'tablet' ? '768px' : mode === 'mobile' ? '360px' : '';
        if (w) { w.style.width = width; w.style.margin = width ? '0 auto' : ''; } else if (f) f.style.width = width;
      }
    },
    {
      label: 'el-topbar',
      event: 'click',
      match: function (el) { return isElementor && !!up(el, '#elementor-editor-wrapper-v2 button, .MuiAppBar-root button, #elementor-panel-header button, #elementor-panel-header-menu-button, #elementor-panel-header-add-button, .e-ai-button, .elementor-control-dynamic-switcher, .elementor-control-media__content, .elementor-control-media-area'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, 'button, .elementor-control-dynamic-switcher, .elementor-control-media__content, .elementor-control-media-area'), lab = ((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '') + ' ' + (b.title || '')).trim();
        if (/Add Element|Widgets|elements/i.test(lab) || b.id === 'elementor-panel-header-add-button') return hop('editor-elementor-panel', 'the widget panel');
        if (/Structure|Navigator/i.test(lab)) { var n = document.getElementById('elementor-navigator'); if (n) { n.style.display = n.style.display === 'none' ? '' : 'none'; b.classList.toggle('Mui-selected'); say('structure panel ' + (n.style.display === 'none' ? 'closed' : 'open')); } else notCaptured('the structure panel'); return; }
        if (/Preview/i.test(lab)) { var f = $('#elementor-preview-iframe'); var src = f && f.getAttribute('src'); if (src) { var m = src.match(/\.\.\/([^/]+)\//); if (m) return hop(m[1], 'the page preview'); } return notCaptured('page preview'); }
        if (/Dynamic Tags/i.test(lab) || up(el, '.elementor-control-dynamic-switcher')) return hop('editor-el-dynamic-tags', 'the dynamic tags list');
        if (/Publish|Save|Update/i.test(lab)) return live('publish / save the page');
        if (/Angie|AI|Generate/i.test(lab) || up(el, '.e-ai-button')) return live('Elementor AI');
        if (/What.s New|Finder|Help/i.test(lab)) return live(lab.split(' ')[0] + ' (loads from elementor.com)');
        if (up(el, '.elementor-control-media__content, .elementor-control-media-area')) return live('the WordPress media library');
        notCaptured((lab || 'this menu') + ' in the Elementor top bar');
      }
    },

    // ─ Block editor chrome (aThemes Blocks) ────────────────────────────────────
    // aThemes General / Style / Advanced tabs → sibling captures.
    // @since 2026-10-03 @source blocks/assets/js/src/block-editor/components/tabs-navigation (persistent-tabs-store) @verified 2026-10-03 @product athemes-addons
    {
      label: 'blk-tabs',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.atblocks-tabs-navigation__item'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, '.atblocks-tabs-navigation__item'), tab = (b.textContent || '').trim().toLowerCase();
        if (b.classList.contains('is-active')) { say('current tab'); return; }
        var base = slug.replace(/(-style--.*|-advanced(--.*)?|-general--.*|--.*)$/, '');
        var pre = tab === 'general' ? base : base + (tab === 'style' ? '-style--' : '-advanced');
        if (tab === 'general') return hop(base, 'General tab');
        var cands = siblings().filter(function (s) { return s.indexOf(pre) === 0; });
        if (cands.length) return R.goto(cands[0]);
        if (has(pre.replace(/--$/, ''))) return R.goto(pre.replace(/--$/, ''));
        notCaptured(tab + ' tab of this block');
      }
    },
    // Sidebar panel bodies collapse / expand (core PanelBody).
    // @since 2026-10-03 @source wp/ components PanelBody @verified 2026-10-03 @product athemes-addons
    {
      label: 'blk-panel-body',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.components-panel__body-toggle'); },
      apply: function (el, evt) {
        stop(evt); var p = up(el, '.components-panel__body');
        var set = function (body, on) { body.classList.toggle('is-opened', on); var t = $('.components-panel__body-toggle', body); if (t) t.setAttribute('aria-expanded', on ? 'true' : 'false'); $$(':scope > *:not(.components-panel__body-title)', body).forEach(function (c) { c.style.display = on ? '' : 'none'; }); };
        // aThemes Blocks inspector: an exclusive accordion (blocks/…/persistent-tabs-store lastPanelOpened):
        // opening one closes its siblings; clicking the open one keeps it open. Core panels toggle independently.
        if ($('.atblocks-tabs-navigation__item') && up(p, '.block-editor-block-inspector')) {
          if (p.classList.contains('is-opened')) { say('panel already open'); return; }
          $$('.components-panel__body', p.parentNode).forEach(function (b) { if (b !== p && b.parentNode === p.parentNode) set(b, false); });
          set(p, true); return;
        }
        set(p, !p.classList.contains('is-opened'));
      }
    },
    {
      label: 'blk-sidebar-toggle',
      event: 'click',
      match: function (el) { var b = up(el, 'button'); return isBlockEditor && !!b && /^(Settings|Close Settings)$/.test(b.getAttribute('aria-label') || ''); },
      apply: function (el, evt) {
        stop(evt);
        var s = $('.interface-interface-skeleton__sidebar, .interface-complementary-area');
        if (s) { var hide = s.style.display !== 'none'; s.style.display = hide ? 'none' : ''; $$('button[aria-label="Settings"]').forEach(function (b) { b.classList.toggle('is-pressed', !hide); }); }
      }
    },
    {
      label: 'blk-format',
      event: 'click',
      match: function (el) { var b = up(el, '.block-editor-block-toolbar button'); return isBlockEditor && !!b && /^(Bold|Italic)$/.test(b.getAttribute('aria-label') || ''); },
      apply: function (el, evt) { stop(evt); var b = up(el, 'button'); b.classList.toggle('is-pressed'); }
    },
    {
      label: 'blk-meta-boxes',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.edit-post-meta-boxes-main__presenter button, .edit-post-meta-boxes-main button'); },
      apply: function (el, evt) { stop(evt); var m = up(el, '.edit-post-meta-boxes-main'); if (m) m.classList.toggle('is-open'); var l = $('.edit-post-meta-boxes-main__liner', m); if (l) l.style.display = l.style.display === 'none' ? '' : 'none'; }
    },
    {
      label: 'blk-chrome',
      event: 'click',
      match: function (el) { return isBlockEditor && !!up(el, '.editor-header button, .edit-post-header button, .block-editor-block-toolbar button, .interface-complementary-area button, .block-editor-block-breadcrumb button, .edit-post-meta-boxes-main button'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, 'button'), lab = ((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')).trim();
        if (/Inserter|Add block|Toggle block inserter/i.test(lab)) return hop('editor-blocks-inserter', 'the block inserter');
        if (/Save|Publish|Update|Undo|Redo|Move|Drag|Reset/i.test(lab)) return live(lab.split(' ').slice(0, 2).join(' ').toLowerCase() + ' in the block editor');
        if (/Edit with Elementor/i.test(lab)) return live('switch this page to Elementor');
        notCaptured((lab || 'this control') + ' in the block editor');
      }
    },

    // Native selects open the browser's own list in a snapshot too.
    {
      label: 'native-select',
      event: 'click',
      match: function (el) { return el && el.tagName === 'SELECT'; },
      apply: function (el) { say('native list: ' + (el.options.length) + ' options'); }
    },
    {
      label: 'self-link',
      event: 'click',
      match: function (el) { var a = up(el, 'a[href]'); if (!a) return false; var h = a.getAttribute('href') || ''; if (h.indexOf('#') === 0 || /^https?:/.test(h)) return false; return a.classList.contains('active') || a.getAttribute('aria-current') === 'page' || (R.resolveHref && R.resolveHref(h) === slug); },
      apply: function (el, evt) { stop(evt); say('current screen'); }
    },
    // ─ TinyMCE (Elementor WYSIWYG controls, classic fields): the sydney pack's entries, copied
    //   (products/sydney/snapshots/_shared/interactivity.js:310-330, video-project-html-b7, 2026-10-03).
    // @since 2026-10-03 @source wp-includes/js/tinymce (formatting runs on the live editor iframe) @verified 2026-10-03 @product athemes-addons
    {
      label: 'tinymce-buttons',
      event: 'click',
      match: function (el) { return !!up(el, '.mce-toolbar .mce-btn, .wp-media-buttons .insert-media, .mce-listbox, .mce-path-item'); },
      apply: function (el, evt) { if (evt) evt.preventDefault(); var b = up(el, '.mce-btn, .insert-media, .mce-listbox, .mce-path-item'); live((b.getAttribute('aria-label') || b.textContent || 'editor button').trim() + (up(el, '.insert-media') ? ': opens the media library' : ': formats text in the live editor')); }
    },
    {
      label: 'tinymce-switch',
      event: 'click',
      match: function (el) { return !!up(el, '.wp-switch-editor.switch-html, .wp-switch-editor.switch-tmce'); },
      apply: function (el, evt) {
        if (evt) evt.preventDefault();
        var w = up(el, '.wp-editor-wrap'); if (!w) return; var html = !!up(el, '.switch-html');
        w.classList.toggle('html-active', html); w.classList.toggle('tmce-active', !html);
        var ta = w.querySelector('textarea.wp-editor-area'), ed = w.querySelector('.mce-tinymce, .mce-container.mce-panel');
        if (ta) { ta.style.display = html ? 'block' : 'none'; ta.removeAttribute('aria-hidden'); R.clearBaked(ta); } if (ed) ed.style.display = html ? 'none' : '';
        console.log('[snap] set: editor mode = ' + (html ? 'code' : 'visual'));
      }
    },
    // ─ WordPress admin chrome (list tables, screen meta, notices) ─────────────
    {
      label: 'wp-pagination',
      event: 'click',
      match: function (el) { return !!up(el, '.tablenav-pages a, .tablenav-pages .button'); },
      apply: function (el, evt) { stop(evt); notCaptured('another page of this list (all seeded rows fit on page 1)'); }
    },
    // @since 2026-10-03 @source wp/wp-admin/js/common.js (screen-meta toggles), inline-edit-post.js (Quick Edit) @verified 2026-10-03 @product athemes-addons
    {
      label: 'wp-screen-meta',
      event: 'click',
      match: function (el) { return !!up(el, '#show-settings-link, #contextual-help-link'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, '#show-settings-link, #contextual-help-link'), wrap = $(b.id === 'show-settings-link' ? '#screen-options-wrap' : '#contextual-help-wrap');
        if (!wrap) return; var open = wrap.style.display !== 'block' || wrap.classList.contains('hidden');
        $$('#screen-options-wrap, #contextual-help-wrap').forEach(function (w) { w.style.display = 'none'; w.classList.add('hidden'); });
        if (open) { wrap.style.display = 'block'; wrap.classList.remove('hidden'); R.clearBaked(wrap); }
        b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.classList.toggle('screen-meta-active', open);
      }
    },
    {
      label: 'wp-row-actions',
      event: 'click',
      match: function (el) { return !!up(el, '.row-actions a, a.row-title, button.editinline, .row-actions button'); },
      apply: function (el, evt) {
        stop(evt);
        var a = up(el, 'a[href]');
        if (up(el, 'button.editinline')) return notCaptured('Quick Edit (WordPress opens it inline from the row data)');
        var h = a && a.getAttribute('href') || '';
        if (/trash|delete|duplicate|action=aafe/i.test(h + (a && a.className))) return live((a.textContent || 'row action').trim() + ' (changes the page list)');
        var s = R.resolveHref && R.resolveHref(h);
        if (s) return R.goto(s);
        notCaptured('the editor of "' + ((up(el, 'tr') || {}).querySelector ? (up(el, 'tr').querySelector('.row-title') || {}).textContent || '' : '').trim() + '" (' + (a ? a.textContent.trim() : '') + ')');
      }
    },
    {
      label: 'wp-form-buttons',
      event: 'click',
      match: function (el) { var b = up(el, 'button, input[type=submit]'); return !!b && !!up(b, '#wpbody-content') && /^(Save|Save Changes|Save Settings|Deactivate|Activate|Update|Apply)/i.test((b.textContent || b.value || '').trim()); },
      apply: function (el, evt) { stop(evt); var b = up(el, 'button, input[type=submit]'); live((b.textContent || b.value || 'save').trim() + ' (writes the settings)'); }
    },
    {
      label: 'wp-setting-label',
      event: 'click',
      match: function (el) { var l = up(el, 'label'); return !!l && !!up(l, '#wpbody-content, .atb-dashboard') && !up(l, '.athemes-addons-modules-filter, .athemes-addons-dashboard-tab-page'); },
      apply: function (el) {
        var l = up(el, 'label'), f = l.control || $('input, select, textarea', l.parentNode);
        if (f && f.focus) f.focus();
        var row = up(l, 'tr, .atb-dashboard__setting, div') || l; row.classList.add('snap-active-setting'); setTimeout(function () { row.classList.remove('snap-active-setting'); }, 1500);
      }
    },
    // Block editor notices and the inserter.
    // @since 2026-10-03 @source wp/ block-editor (Notice dismiss, Inserter menu) @verified 2026-10-03 @product athemes-addons
    {
      label: 'blk-notice',
      event: 'click',
      match: function (el) { return !!up(el, '.components-notice__dismiss, .components-notice__action'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.components-notice__action')) return live((el.textContent || 'notice action').trim());
        var n = up(el, '.components-notice'); if (n) n.remove();
      }
    },
    {
      label: 'blk-inserter',
      event: 'click',
      match: function (el) { return isBlockEditor && (!!up(el, '.block-editor-inserter__menu, .block-editor-tabbed-sidebar, .editor-inserter-sidebar') || (!!up(el, '.editor-document-tools__inserter-toggle.is-pressed') && !!$('.editor-inserter-sidebar'))); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.block-editor-tabbed-sidebar__close-button') || up(el, '.editor-document-tools__inserter-toggle')) { var p = up(el, '.editor-inserter-sidebar, .block-editor-tabbed-sidebar') || $('.editor-inserter-sidebar'); if (p) p.style.display = 'none'; var t = $('.editor-document-tools__inserter-toggle'); if (t) t.classList.remove('is-pressed'); return; }
        var tab = up(el, '.block-editor-tabbed-sidebar__tab');
        if (tab) { if (tab.getAttribute('aria-selected') === 'true') return say('current tab'); return notCaptured((tab.textContent || '').trim() + ' tab of the inserter'); }
        var item = up(el, '.block-editor-block-types-list__item');
        if (item) return live('insert the ' + (item.textContent || 'block').trim() + ' block');
        notCaptured('this inserter control');
      }
    },
    // ─ Theme Builder: display conditions modal, header type ───────────────────
    // @since 2026-10-03 @source lite/assets/js/admin/admin.js (display-conditions modal: toggle, backdrop click closes, add / remove rows, select2:select shows the id picker when the option has data-ajax; header type select posts athemes_addons_header_type) @verified 2026-10-03 @product athemes-addons
    {
      label: 'tb-cond-backdrop',
      event: 'click',
      match: function (el) { return !!el && el.classList && el.classList.contains('athemes-addons-display-conditions-modal'); },
      apply: function (el, evt) { stop(evt); $$('.athemes-addons-display-conditions-modal').forEach(function (m) { m.classList.remove('open'); }); }
    },
    {
      label: 'tb-cond-toggle',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-display-conditions-modal-toggle'); },
      apply: function (el, evt) {
        stop(evt);
        var c = up(el, '.athemes-addons-display-conditions-control'), m = c && $('.athemes-addons-display-conditions-modal', c);
        if (m) { m.classList.toggle('open'); R.clearBaked(m); } else notCaptured('the conditions of this template (one template\'s modal is captured: admin-addons-theme-builder--conditions)');
      }
    },
    {
      label: 'tb-cond-add',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-display-conditions-modal-add'); },
      apply: function (el, evt) {
        stop(evt);
        var b = up(el, '.athemes-addons-display-conditions-modal-add'), m = up(b, '.athemes-addons-display-conditions-modal');
        var list = $('.athemes-addons-display-conditions-modal-content-list', m), tpl = $('.athemes-addons-display-conditions-modal-content-list-item.hidden', m) || $('.athemes-addons-display-conditions-modal-content-list-item', m);
        if (!list || !tpl) return;
        var row = tpl.cloneNode(true); row.classList.remove('hidden');
        var g = b.getAttribute('data-condition-group');
        if (g) $$('.athemes-addons-display-conditions-select2-condition', row).forEach(function (x) { if (x.getAttribute('data-condition-group') !== g) x.remove(); });
        list.appendChild(row);
      }
    },
    {
      label: 'tb-cond-remove',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-display-conditions-modal-remove'); },
      apply: function (el, evt) { stop(evt); var r = up(el, '.athemes-addons-display-conditions-modal-content-list-item'); if (r) r.remove(); }
    },
    {
      label: 'tb-cond-condition',
      event: 'change',
      match: function (el) { return el && el.tagName === 'SELECT' && el.name === 'condition' && !!up(el, '.athemes-addons-display-conditions-modal'); },
      apply: function (el) {
        var row = up(el, '.athemes-addons-display-conditions-modal-content-list-item'), idw = row && $('.athemes-addons-display-conditions-select2-id', row);
        var o = el.options[el.selectedIndex]; var ajax = o && (o.getAttribute('data-ajax') === 'true' || o.getAttribute('data-ajax') === '1');
        if (idw) idw.classList.toggle('hidden', !ajax);
      }
    },
    {
      label: 'tb-cond-save',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-display-conditions-modal-save'); },
      apply: function (el, evt) { stop(evt); live('save the display conditions (posts athemes_addons_update_template_conditions)'); }
    },
    {
      label: 'tb-header-type',
      event: 'change',
      match: function (el) { return !!up(el, '.aafe-header-type-select'); },
      apply: function (el) {
        var lab = el.parentNode && el.parentNode.querySelector('.saved-label'); if (lab) { lab.style.opacity = '1'; setTimeout(function () { lab.style.opacity = '0'; }, 2000); }
        live('header type "' + el.value + '" (posts athemes_addons_header_type)');
      }
    },
    {
      label: 'tb-template-actions',
      event: 'click',
      match: function (el) { return !!up(el, '.aafe-edit-template, .aafe-create-template, .aafe-delete-template, .aafe-upgrade'); },
      apply: function (el, evt) {
        stop(evt);
        if (up(el, '.aafe-edit-template')) { var t = up(el, '.athemes-addons-tb-element'), txt = (t && t.textContent || '').toLowerCase(); var to = /footer/.test(txt) ? 'editor-tb-copyright' : /single|post/.test(txt) ? 'editor-tb-post-title' : /archive/.test(txt) ? 'editor-tb-archive-title' : 'editor-tb-site-logo'; return hop(to, 'this template in the Elementor editor'); }
        live(up(el, '.aafe-create-template') ? 'create a template (writes a new template)' : up(el, '.aafe-delete-template') ? 'delete the template' : 'upgrade link');
      }
    },
    // ─ Dashboards ──────────────────────────────────────────────────────────────
    // aThemes Addons: news bell, widget filters (category, status, Free/Pro), toggles.
    // @since 2026-10-03 @source lite/assets/js/admin/admin.js:36-120 (notifications sidebar, module filters) @verified 2026-10-03 @product athemes-addons
    {
      label: 'aafe-news',
      event: 'click',
      match: function (el) { return !!up(el, '.athemes-addons-notifications, .athemes-addons-notifications-sidebar-close'); },
      apply: function (el, evt) { stop(evt); var s = $('.athemes-addons-notifications-sidebar'); if (s) { R.clearBaked(s); s.classList.toggle('opened', !up(el, '.athemes-addons-notifications-sidebar-close') && !s.classList.contains('opened')); } }
    },
    // Module switches (widgets / extensions): the switch flips here; live it POSTs
    // athemes_addons_module_activate / _deactivate and saves athemes-addons-modules.
    // @since 2026-10-05 @source lite/assets/js/admin/admin.js:10-25 (module toggle → wp.ajax.post) @verified 2026-10-05 @product athemes-addons
    {
      label: 'aafe-module-toggle',
      event: 'change',
      match: function (el) { return !!el && el.type === 'checkbox' && !!up(el, '.athemes-addons-toggle-switch[data-module]'); },
      apply: function (el) {
        var w = up(el, '.athemes-addons-toggle-switch'), m = w.getAttribute('data-module');
        w.classList.toggle('athemes-addons-module-page-button-action-deactivate', el.checked);
        w.classList.toggle('athemes-addons-module-page-button-action-activate', !el.checked);
        var lab = $('.saved-label', w); if (lab) { lab.style.opacity = '1'; setTimeout(function () { lab.style.opacity = '0'; }, 2000); }
        live((el.checked ? 'activate' : 'deactivate') + ' the "' + m + '" module (saves athemes-addons-modules)');
      }
    },
    {
      label: 'aafe-module-filter',
      event: 'change',
      match: function (el) { return !!up(el, '.athemes-addons-modules-filter') || (el.type === 'radio' && !!up(el, '.athemes-addons-dashboard-tab-page')); },
      apply: function () {
        var page = $('.athemes-addons-dashboard-tab-page.active') || document;
        var status = ($('input[type=radio][name*=status]:checked', page) || $$('input[type=radio]', page)[0] || {}).value || 'all';
        var radios = $$('input[type=radio]', page); var groups = {}; radios.forEach(function (r) { (groups[r.name] = groups[r.name] || []).push(r); });
        var names = Object.keys(groups); var st = 'all', tier = 'all';
        names.forEach(function (n) { var c = groups[n].filter(function (r) { return r.checked; })[0]; if (!c) return; if (/active|inactive/.test(groups[n].map(function (r) { return r.value; }).join())) st = c.value; else tier = c.value; });
        var cat = ($('select.athemes-addons-modules-filter-button-category', page) || {}).value || 'all';
        $$('.athemes-addons-modules-list-item', page).forEach(function (it) {
          var on = it.querySelector('input[type=checkbox]') ? it.querySelector('input[type=checkbox]').checked : true;
          var pro = !!it.querySelector('.athemes-addons-pro-badge, .pro-badge, [class*=pro]');
          var ok = (st === 'all' || (st === 'active') === on) && (tier === 'all' || (tier === 'pro') === pro);
          it.style.display = ok ? '' : 'none';
        });
        if (cat && cat !== 'all') { var h = document.getElementById(cat) || $('[data-category="' + cat + '"]', page); if (h) h.scrollIntoView({ block: 'start' }); }
      }
    },
    {
      label: 'aafe-filter-label',
      event: 'click',
      match: function (el) { var l = up(el, 'label'); if (!l || !up(l, '.athemes-addons-dashboard-tab-page, .athemes-addons-modules-filter')) return false; var r = l.control || $('input[type=radio]', l); return !!r && r.type === 'radio'; },
      apply: function (el, evt) {
        var l = up(el, 'label'), r = l.control || $('input[type=radio]', l); if (evt) evt.preventDefault();
        if (r.checked) { say('filter already "' + (l.textContent || '').trim() + '"'); return; }
        r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); say('filter: ' + (l.textContent || '').trim());
      }
    },
    // aThemes Blocks dashboard: product cards install / activate other plugins → live only.
    // @since 2026-10-03 @source blocks/includes/Admin/PluginDashboard (products card actions) @verified 2026-10-03 @product athemes-addons
    {
      label: 'atb-product-action',
      event: 'click',
      match: function (el) { return !!up(el, '.atb-dashboard__products-card-action'); },
      apply: function (el, evt) { stop(evt); live('install / activate ' + ((up(el, '.atb-dashboard__products-card') || {}).textContent || 'plugin').trim().split('\n')[0].slice(0, 40)); }
    }
  ], { product: 'athemes-addons', file: 'interactivity.js' });
  // ── select2 / selectWoo: the merchant pack's generic runtime, copied verbatim (one implementation;
  // source products/merchant/snapshots/_shared/interactivity.js:262-327, video-project-html-58, 2026-10-03).
  function closest(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (_) { return null; } }
  function all(sel, root) { try { return [].slice.call((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function one(sel, root) { try { return (root || document).querySelector(sel); } catch (_) { return null; } }
  var s2 = null;
  function s2Close() { if (!s2) return; s2.drop.remove(); s2.box.classList.remove('select2-container--open'); var sel = one('.select2-selection', s2.box); if (sel) sel.setAttribute('aria-expanded', 'false'); s2 = null; }
  function s2Fill(ul, select, q) {
    ul.innerHTML = ''; var n = 0, ql = (q || '').toLowerCase();
    [].forEach.call(select.options, function (o) {
      if (o.value === '' && !o.text.trim()) return;
      if (ql && o.text.toLowerCase().indexOf(ql) === -1) return;
      var li = document.createElement('li'); li.className = 'select2-results__option select2-results__option--selectable' + (o.selected ? ' select2-results__option--selected select2-results__option--highlighted' : '');
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', o.selected ? 'true' : 'false'); li.setAttribute('data-snap-value', o.value); li.textContent = o.text; ul.appendChild(li); n++;
    });
    if (!n) { var e = document.createElement('li'); e.className = 'select2-results__option select2-results__message'; e.textContent = 'No matches found'; ul.appendChild(e); }
  }
  function s2Open(box) {
    s2Close();
    var select = box.previousElementSibling; if (!select || select.tagName !== 'SELECT') select = one('select', box.parentElement);
    if (!select || select.multiple) return;
    var r = box.getBoundingClientRect();
    var drop = document.createElement('span'); drop.className = 'select2-container select2-container--default select2-container--open';
    drop.style.cssText = 'position:absolute;left:' + (r.left + window.scrollX) + 'px;top:' + (r.bottom + window.scrollY) + 'px;z-index:100000';
    drop.innerHTML = '<span class="select2-dropdown select2-dropdown--below" dir="ltr" style="width:' + r.width + 'px"><span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="0" autocomplete="off" role="searchbox"></span><span class="select2-results"><ul class="select2-results__options" role="listbox"></ul></span></span>';
    document.body.appendChild(drop);
    var ul = one('ul', drop); s2Fill(ul, select, '');
    box.classList.add('select2-container--open'); var sel = one('.select2-selection', box); if (sel) sel.setAttribute('aria-expanded', 'true');
    s2 = { box: box, drop: drop, select: select };
    var hi = one('.select2-results__option--selected', ul); if (hi) ul.scrollTop = hi.offsetTop - 60;
    var inp = one('.select2-search__field', drop); try { inp.focus(); } catch (_) {}
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') s2Close(); });

  R.register([
    {
      label: 'select2-open',
      event: 'click',
      match: function (el) { var b = closest(el, '.select2-container'); return !!(b && !closest(el, '.select2-dropdown') && closest(el, '.select2-selection--single')); },
      apply: function (el) { var b = closest(el, '.select2-container'); if (s2 && s2.box === b) s2Close(); else s2Open(b); }
    },
    {
      label: 'select2-search',
      event: 'input',
      match: function (el) { return !!(s2 && closest(el, '.select2-search__field')); },
      apply: function (el) { s2Fill(one('ul', s2.drop), s2.select, el.value); }
    },
    {
      label: 'select2-pick',
      event: 'click',
      match: function (el) { return !!(s2 && closest(el, '.select2-results__option--selectable')); },
      apply: function (el) {
        var li = closest(el, '.select2-results__option--selectable'); var v = li.getAttribute('data-snap-value'); var sel = s2.select;
        [].forEach.call(sel.options, function (o) { o.selected = o.value === v; o.toggleAttribute('selected', o.value === v); });
        var rend = one('.select2-selection__rendered', s2.box); if (rend) { rend.textContent = li.textContent; rend.setAttribute('title', li.textContent); }
        s2Close(); sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    {
      label: 'select2-outside-close',
      event: 'click',
      order: 'last',
      match: function (el) { return !!(s2 && !closest(el, '.select2-container')); },
      apply: function () { s2Close(); }
    }
  ], { product: 'athemes-addons', file: 'interactivity.js (select2, from merchant)' });

  // ── aThemes Charts (pro/assets/js/modules/charts/scripts.js:4-60): capture bakes the <canvas> to an
  // image; put the plugin's own Chart.js config back on a live canvas from the widget's data-settings.
  // @since 2026-10-03 @source pro/assets/js/modules/charts/scripts.js @verified 2026-10-03 @product athemes-addons
  function aafeCharts() {
    $$('.athemes-addons-charts[data-settings]').forEach(function (w) {
      var st; try { st = JSON.parse(w.getAttribute('data-settings')); } catch (e) { return; }
      var o = st.options || {}, lg = o.legend || {}, tt = o.tooltips || {}, sc = o.scales || {};
      var host = w.querySelector('img[data-from-canvas], canvas'); if (!host || !R.chart) return;
      R.chart(host, { type: st.type, data: { labels: st.data.labels, datasets: st.data.datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { beginAtZero: true, display: (sc.xAxis || {}).display !== false }, y: { beginAtZero: true, display: (sc.yAxis || {}).display !== false } },
        plugins: { legend: { display: lg.display !== false, position: lg.position || 'top', align: lg.align || 'center', labels: { boxHeight: 5, padding: 10, font: { size: ((lg.labels || {}).font || {}).size || 12 } } },
          tooltip: { enabled: tt.enable !== false, backgroundColor: tt.backgroundColor, padding: tt.padding } }
      } }, { lib: ['../_shared/lib/chart.min.js'], global: 'Chart' });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aafeCharts); else setTimeout(aafeCharts, 0);
  // PDF Viewer (pro/…/pdf-viewer): the capture parks the iframe as data-snap-src → the vendored pdf.js
  // viewer (_shared/lib/pdfjs, the plugin's own copy) on the PDF in _shared/media. Load it now.
  // @since 2026-10-03 @source pro/assets/js/vendor/pdfjs/viewer.html @verified 2026-10-03 @product athemes-addons
  function aafeLocalFrames() { $$('iframe[data-snap-src]').forEach(function (f) { if (f.getAttribute('src') === 'about:blank') f.setAttribute('src', f.getAttribute('data-snap-src')); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aafeLocalFrames); else setTimeout(aafeLocalFrames, 0);

})();
