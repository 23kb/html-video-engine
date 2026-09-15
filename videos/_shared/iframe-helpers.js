// videos/_shared/iframe-helpers.js
//
// Iframe-content authoring helpers built on top of IframeManager + Cursor.
// These collapse patterns that recurred 4-10× in single-HTML video work and
// either (a) paper over content-hashed class-name volatility on SaaS captures
// (Klaviyo, Mailchimp, Stripe dashboards), or (b) absorb defensive scaffolding
// that authors otherwise re-write per call.
//
// Source: Klaviyo tutorial v11 retrospective 2026-05-12. Empirical recurrence
// data drove every promotion here.
//
// Library scope philosophy (`.claude/skills/wpforms-primitives/SKILL.md`):
//   Library = REFERENCE for hard-won + recurring patterns.
//   Inline DOM = NORMAL for one-off interactions.
//   These helpers earn library status by the recurrence-test (10× for
//   `glideClick`) and class-name-volatility-bonus criteria.

/**
 * Find a clickable element inside an iframe document by its visible text content.
 *
 * Walks all text nodes containing `text` (case-insensitive substring match),
 * then climbs to the nearest clickable ancestor (a, button, [role="button"],
 * [onclick], or any element matching `clickableSelector` if provided).
 *
 * Returns the FIRST clickable ancestor whose layout rect is non-empty (i.e.,
 * the element is visible). Skips hidden duplicates of the same text.
 *
 * Built for SaaS-captured dashboards where class names are content-hashed
 * (e.g., Klaviyo's `.sc-jTrPJq`) and unstable across re-captures. Text content
 * is stable; this function makes it queryable.
 *
 * @param {IframeManager} iframeManager
 * @param {string} text — substring to match (case-insensitive)
 * @param {Object} [opts]
 * @param {string} [opts.clickableSelector] — if provided, additional selector
 *   that the ancestor must match. Use to disambiguate when multiple clickable
 *   elements share the same visible text (e.g., a row link + a button).
 * @param {number} [opts.maxDepth=8] — how far up to walk from the text node
 * @returns {Element|null} the clickable ancestor, or null if no visible match
 *
 * @example
 *   const settingsLink = findInIframeByText(ifm, 'Settings');
 *   if (settingsLink) await cursor.click(...);
 */
export function findInIframeByText(iframeManager, text, opts = {}) {
  const { clickableSelector = null, maxDepth = 8 } = opts;
  const doc = iframeManager.doc();
  if (!doc) return null;
  const needle = String(text).toLowerCase().trim();
  if (!needle) return null;

  // Find all text nodes containing the needle (uses TreeWalker for speed)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  const candidates = [];
  let node;
  while ((node = walker.nextNode())) {
    const t = node.nodeValue && node.nodeValue.toLowerCase();
    if (t && t.includes(needle)) candidates.push(node);
  }

  // For each text-node match, walk up to find a clickable ancestor
  const isClickableTag = (el) =>
    el.tagName === 'A' ||
    el.tagName === 'BUTTON' ||
    el.getAttribute('role') === 'button' ||
    el.hasAttribute('onclick') ||
    (clickableSelector && el.matches && el.matches(clickableSelector));

  for (const textNode of candidates) {
    let el = textNode.parentElement;
    let depth = 0;
    while (el && depth < maxDepth) {
      if (isClickableTag(el)) {
        // Verify visible (non-empty layout rect)
        const r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          return el;
        }
        // Hidden duplicate — keep walking for another candidate
        break;
      }
      el = el.parentElement;
      depth++;
    }
  }
  return null;
}

/**
 * Glide cursor to an element + scroll-into-view + click, with try/catch defense.
 *
 * Collapses the ~10× repeated pattern across Klaviyo v11:
 *   try {
 *     await ifm.smoothScrollIntoView(target, { duration: 0.5, block: 'center' });
 *     const pt = ifm.elementToStageCoords(target);
 *     await cursor.glide(pt, { duration: 0.6 });
 *     await cursor.click({ ripple: true });
 *   } catch (e) { console.warn('glideClick failed', e); }
 *
 * Catches the `elementToStageCoords` empty-rect throw (which fires when the
 * target is in the DOM but hidden — INV-12 selector-scoping signal) and the
 * `Cursor.glide` null-guard. Logs the failure rather than crashing the timeline.
 *
 * @param {Object} ctx
 * @param {IframeManager} ctx.iframeManager
 * @param {Cursor} ctx.cursor
 * @param {string|Element} target — selector (querySelector-scoped to iframe doc)
 *   or a resolved Element. Strings are passed to `iframeManager.query`.
 * @param {Object} [opts]
 * @param {boolean} [opts.click=true] — set false to glide-only (no click)
 * @param {boolean} [opts.scroll=true] — set false to skip scrollIntoView
 * @param {number}  [opts.scrollDuration=0.5]
 * @param {string}  [opts.scrollBlock='center']
 * @param {number}  [opts.glideDuration=0.6]
 * @param {Object}  [opts.via] — pass-through to cursor.glide({via})
 * @param {boolean} [opts.ripple=true]
 * @param {string}  [opts.rippleColor]
 * @param {boolean} [opts.silent=false] — suppress console.warn on failure
 * @param {boolean} [opts.recenter=true] — GRANTED BEHAVIOUR CHANGE
 *   (2026-09-02, AP-10): when the measured click point is off-frame, run the
 *   closed-loop centre (paneScrollTo for inner-scroller targets, pageCenter
 *   otherwise, duration 0.35), re-measure, and warn ONLY if still off-frame.
 *   The old warn-and-proceed already FAILED smoke under default strict-glide,
 *   so "proceed" was a red run, not a silent pass — recentering turns that
 *   failure into a landed click. Pass `recenter: false` for beats that
 *   deliberately click off-frame during a camera move (the warn string is
 *   unchanged either way, so probes/smoke keep their anchor).
 * @param {boolean} [opts.dispatch=false] — after the visual click, dispatch a
 *   REAL bubbling + cancelable MouseEvent('click') on the target inside the
 *   iframe document, so registered interactivity handlers
 *   (snapshots/_shared/interactivity.js) actually fire. `Cursor.click()` alone
 *   is VISUAL-ONLY (ripple + squash, no DOM event) — a beat that relied on a
 *   click handler silently no-opped twice (receipts fuf 1 / cpa 1). Default
 *   stays false: existing films behave identically.
 * @returns {Promise<Element|null>} the resolved element, or null on failure
 */
export async function glideClick({ iframeManager, cursor }, target, opts = {}) {
  const {
    click = true,
    scroll = true,
    scrollDuration = 0.5,
    scrollBlock = 'center',
    glideDuration = 0.6,
    via = null,
    ripple = true,
    rippleColor,
    silent = false,
    recenter = true,
    dispatch = false,
  } = opts;
  try {
    const el = typeof target === 'string'
      ? iframeManager.query(target)
      : target;
    if (!el) {
      if (!silent) console.warn(`[glideClick] target not found: ${target}`);
      return null;
    }
    if (scroll) {
      await iframeManager.smoothScrollIntoView(el, {
        duration: scrollDuration,
        block: scrollBlock,
      });
    }
    // Settle re-read (as 1, fix-round B2): deep-zoom landings re-rasterize
    // one rAF later (IframeManager settle mode) and the geometry swap can
    // shift content via scroll clamp — a click point read BEFORE the settled
    // frame missed by 107.5px; 0.3px after this wait (anti-spam QC probe
    // 2026-08-12; timing copied from that video-local fix).
    await iframeManager.wait(0.1);
    let pt = iframeManager.elementToStageCoords(el);
    // Off-frame handling (ccs 9 → AP-10): "selector resolved" ≠ "on screen".
    // Default `recenter` closes the loop (ee 4: warn-and-proceed shipped a
    // no-op click); the unchanged warn string below stays the probe anchor.
    const vp = iframeManager.viewport();
    if (pt.x < 0 || pt.y < 0 || pt.x > vp.w || pt.y > vp.h) {
      if (recenter) {
        try {
          if (_scrollerFor(el)) await paneScrollTo(iframeManager, el, { duration: 0.35 });
          else await pageCenter(iframeManager, el, { duration: 0.35 });
        } catch (_) { /* best-effort — the re-measure below decides */ }
        await iframeManager.wait(0.1);
        try { pt = iframeManager.elementToStageCoords(el); } catch (_) { /* keep the old point */ }
      }
      if (pt.x < 0 || pt.y < 0 || pt.x > vp.w || pt.y > vp.h) {
        console.warn(`[glideClick] target off-frame: (${Math.round(pt.x)},${Math.round(pt.y)}) outside 0,0–${vp.w},${vp.h} — proceeding`);
      }
    }
    const glideOpts = { duration: glideDuration };
    if (via) glideOpts.via = via;
    await cursor.glide(pt, glideOpts);
    if (click) {
      const clickOpts = { ripple };
      if (rippleColor) clickOpts.rippleColor = rippleColor;
      await cursor.click(clickOpts);
      if (dispatch) {
        // Real event for registered handlers: the typing/dropdown helpers
        // dispatch their own change events; clicks were the gap (fuf 1, cpa 1).
        // Same-origin iframe — use ITS window's MouseEvent so instanceof checks
        // inside the snapshot's handlers pass.
        const win = (el.ownerDocument && el.ownerDocument.defaultView) || window;
        const Ev = win.MouseEvent || MouseEvent;
        el.dispatchEvent(new Ev('click', { bubbles: true, cancelable: true, view: win }));
      }
    }
    return el;
  } catch (e) {
    if (!silent) console.warn(`[glideClick] failed for ${target}: ${e.message}`);
    return null;
  }
}

/**
 * Glide cursor to an element matched by its VISIBLE TEXT inside the iframe,
 * then click. Convenience wrapper combining `findInIframeByText` + `glideClick`.
 *
 * For SaaS dashboards where text is the only stable selector. Reach for this
 * before reaching for class-name selectors on Klaviyo / Mailchimp / Stripe /
 * any captured non-WPForms admin.
 *
 * @param {Object} ctx — { iframeManager, cursor }
 * @param {string} text — visible text to match (case-insensitive)
 * @param {Object} [opts] — passed through to both findInIframeByText + glideClick
 *   Plus: opts.clickableSelector for findInIframeByText
 *
 * @example
 *   await glideToText({ iframeManager: ifm, cursor }, 'API keys', { ripple: true });
 *   await glideToText({ iframeManager: ifm, cursor }, 'Settings', {
 *     clickableSelector: '[role="menuitem"]',  // disambiguate
 *     click: true,
 *   });
 */
export async function glideToText({ iframeManager, cursor }, text, opts = {}) {
  const el = findInIframeByText(iframeManager, text, {
    clickableSelector: opts.clickableSelector,
    maxDepth: opts.maxDepth,
  });
  if (!el) {
    if (!opts.silent) console.warn(`[glideToText] no clickable ancestor found for text: "${text}"`);
    return null;
  }
  return glideClick({ iframeManager, cursor }, el, opts);
}

// ── Closed-loop measurement family (fix-round C2, 2026-08-17) ───────────────
// THE DOCTRINE (full text in wpforms-primitives skill): once any camera work
// has happened, never derive in-document coordinates from raw
// getBoundingClientRect — settle mode re-rasterizes at html.zoom=N and raw
// rects return post-zoom pixels while scroll metrics stay layout-px and
// camera ty has its own semantics. Measure through elementToStageCoords /
// cameraToElement (correct in every regime), or position within the anchor's
// own offset parent. Closed-loop beats open-loop: measure → correct →
// re-measure, ≤3–4 iterations. Camera move FIRST (it clamps), then the loop
// centers inside the clamp. Sightings: mp F, bac 7, ssn 9, as 1, ccs 7.

/**
 * Wait for an element's STAGE rect to stabilize, then return it.
 *
 * For late-loading pages where layout keeps moving AFTER `load` resolves
 * (ccs 7/A7: a table grew ~180px after load and every position derived
 * before the growth was wrong). Polls the element's stage rect through the
 * library's own projection (`elementToStageRect` — correct in transform AND
 * settle mode) until two consecutive reads agree within `epsilon` px.
 *
 * Positioning note (the ccs 7 under-scroll): for document-absolute positions
 * use rect + scrollTop, never offsetTop — offsetTop is offset-PARENT-relative
 * and silently under-measures on nested layouts.
 *
 * @param {IframeManager} iframeManager
 * @param {string|Element} target
 * @param {Object} [opts]
 * @param {number} [opts.epsilon=0.5] — max px delta counted as "stable"
 * @param {number} [opts.interval=90] — ms between reads
 * @param {number} [opts.timeout=2.5] — seconds before giving up (returns last read)
 * @param {boolean} [opts.silent=false]
 * @returns {Promise<{x,y,w,h,width,height}|null>} stable stage rect, or null
 */
export async function settleAndMeasure(iframeManager, target, opts = {}) {
  const { epsilon = 0.5, interval = 90, timeout = 2.5, silent = false } = opts;
  const el = typeof target === 'string' ? iframeManager.query(target) : target;
  if (!el) {
    if (!silent) console.warn(`[settleAndMeasure] target not found: ${target}`);
    return null;
  }
  const read = () => {
    try { return iframeManager.elementToStageRect(el); } catch (e) { return null; }
  };
  const t0 = performance.now();
  let prev = read();
  while (performance.now() - t0 < timeout * 1000) {
    await iframeManager.wait(interval / 1000);
    const cur = read();
    if (prev && cur) {
      const delta = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
        + Math.abs(cur.w - prev.w) + Math.abs(cur.h - prev.h);
      if (delta <= epsilon) return cur;
    }
    prev = cur;
  }
  if (!silent) console.warn('[settleAndMeasure] rect never stabilized within timeout — returning last read');
  return prev;
}

// Resolve the REAL scroll container by walking UP from the target. Never
// querySelector a pane class: inactive builder panels ship hidden 0×0 twins
// of the same class and first-match grabs one (bac 5).
function _scrollerFor(el) {
  const doc = el && el.ownerDocument;
  const win = doc && doc.defaultView;
  let n = el && el.parentElement;
  while (n && win && n !== doc.documentElement && n !== doc.body) {
    const cs = win.getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) return n;
    n = n.parentElement;
  }
  return null;
}

/**
 * CLOSED-LOOP scroll of an inner PANE (builder settings pane, any
 * overflow-y container) until the target sits at `anchor` of the stage
 * viewport. Promoted from short-block-a-country (bac 5), where open-loop
 * scroll math lost against the settle-mode coordinate regimes three times
 * (measured Δy swung +436 → −706 → −436 across three hand-derivations).
 *
 * Resolves the real scroller by walking UP from the target (never by pane
 * class — hidden 0×0 twins, see `_scrollerFor`), then: measure the target's
 * stage position via `elementToStageCoords`, correct scrollTop by the
 * residual over zoom, iterate ≤3. Camera move FIRST, then this loop centers
 * inside the clamp.
 *
 * @param {IframeManager} iframeManager
 * @param {string|Element} target
 * @param {Object} [opts]
 * @param {number} [opts.duration=0.5] — first-pass tween seconds (corrections 0.25)
 * @param {number} [opts.anchor=0.5] — target center as fraction of stage height
 * @param {number} [opts.tolerance=30] — px error accepted as centered
 * @returns {Promise<Element|null>} the resolved element (null when not found)
 */
export async function paneScrollTo(iframeManager, target, opts = {}) {
  const { duration = 0.5, anchor = 0.5, tolerance = 30 } = opts;
  let el = null;
  try { el = typeof target === 'string' ? iframeManager.query(target) : target; } catch (_) { el = null; }
  const pane = el && _scrollerFor(el);
  if (!el || !pane) return el;
  const v = iframeManager.viewport();
  for (let i = 0; i < 3; i++) {
    let p = null;
    try { p = iframeManager.elementToStageCoords(el); } catch (e) { break; }
    const err = p.y - v.h * anchor;
    if (Math.abs(err) < tolerance) break;
    const zoom = Math.max(1, iframeManager.cameraState().zoom);
    const goal = Math.max(0, Math.min(pane.scrollHeight - pane.clientHeight, pane.scrollTop + err / zoom));
    if (Math.abs(goal - pane.scrollTop) < 2) break;
    // scrollTo({behavior:'instant'}) — NOT scrollTop assignment: snapshot CSS
    // ships scroll-behavior:smooth, which turns scrollTop writes into queued
    // smooth animations that swallow subsequent writes (measured: assignments
    // no-oped entirely in headless). The GSAP tween supplies the smoothness;
    // each tick must land instantly.
    if (typeof gsap === 'undefined') { pane.scrollTo({ top: goal, behavior: 'instant' }); continue; }
    const pos = { y: pane.scrollTop };
    await new Promise(res => gsap.to(pos, {
      y: goal, duration: i === 0 ? duration : 0.25, ease: 'power2.out',
      onUpdate: () => { pane.scrollTo({ top: pos.y, behavior: 'instant' }); },
      onComplete: res,
    }));
  }
  return el;
}

/**
 * CLOSED-LOOP window scroll for LIVE frontend pages until the target sits at
 * `anchor` of the stage viewport. Promoted from
 * short-notifications-vs-confirmations (nvc 4): one-shot scrolls lose on
 * live-layout pages — images decode late and reflow the page ~1300px AFTER
 * the scroll lands. Same convergence loop as `paneScrollTo` on
 * `window.scrollY`, ≤4 iterations, plus a post-settle RE-CHECK: after the
 * loop converges, wait out the reflow window and correct once more if a late
 * decode moved the content under the landed scroll.
 *
 * @param {IframeManager} iframeManager
 * @param {string|Element} target
 * @param {Object} [opts]
 * @param {number} [opts.duration=0.45] — first-pass tween seconds (corrections 0.18)
 * @param {number} [opts.anchor=0.5]
 * @param {number} [opts.tolerance=30]
 * @param {number} [opts.recheckDelay=0.25] — seconds to wait before the re-check
 * @returns {Promise<Element|null>}
 */
export async function pageCenter(iframeManager, target, opts = {}) {
  const { duration = 0.45, anchor = 0.5, tolerance = 30, recheckDelay = 0.25 } = opts;
  let el = null;
  try { el = typeof target === 'string' ? iframeManager.query(target) : target; } catch (_) { el = null; }
  if (!el) return null;
  const doc = el.ownerDocument;
  const win = doc && doc.defaultView;
  if (!win) return el;
  const v = iframeManager.viewport();
  const pass = async (maxIter, firstDur) => {
    for (let i = 0; i < maxIter; i++) {
      let p = null;
      try { p = iframeManager.elementToStageCoords(el); } catch (e) { break; }
      const err = p.y - v.h * anchor;
      if (Math.abs(err) < tolerance) break;
      const zoom = Math.max(1, iframeManager.cameraState().zoom);
      const goal = Math.max(0, win.scrollY + err / zoom);
      // behavior:'instant' beats page CSS scroll-behavior:smooth (see paneScrollTo).
      if (typeof gsap === 'undefined') { win.scrollTo({ top: goal, behavior: 'instant' }); continue; }
      const pos = { y: win.scrollY };
      await new Promise(res => gsap.to(pos, {
        y: goal, duration: i === 0 ? firstDur : 0.18, ease: 'power2.out',
        onUpdate: () => { win.scrollTo({ top: pos.y, behavior: 'instant' }); },
        onComplete: res,
      }));
      await iframeManager.wait(0.08);
    }
  };
  await pass(4, duration);
  // Post-settle re-check: late image decodes shift content under a landed
  // scroll (the nvc probe caught a submit button 734px below frame at open).
  await iframeManager.wait(recheckDelay);
  await pass(2, 0.18);
  return el;
}

// ── Framed-action family (AP-10, promoted 2026-09-02) ──────────────────────
// awaitLayout / inCameraView / flyCentered / gcFramed were inlined in 19
// films (+ both skeletons) before promotion — recurrence long past the
// rule-of-3. Doctrine order (ee 4 / geo 4, 3-for-3): camera FIRST (it
// clamps), then the closed loop centers inside the clamp. Films keep their
// local copies; skeletons and new films import these.

/**
 * Poll until the target exists AND has layout (post-swap sections lay out a
 * frame or two late). String targets prefer the instance that actually has
 * layout — markup can exist hidden in several panels (the films' iqVisible
 * shape). Returns the element or null on timeout.
 *
 * @param {IframeManager} iframeManager
 * @param {string|Element} target
 * @param {{timeout?:number}} [opts] — seconds, default 1.5
 * @returns {Promise<Element|null>}
 */
export async function awaitLayout(iframeManager, target, opts = {}) {
  const { timeout = 1.5 } = opts;
  const t0 = Date.now();
  for (;;) {
    let el = null;
    try { el = typeof target === 'string' ? iframeManager.query(target) : target; } catch (_) { el = null; }
    if (el && typeof target === 'string' && !(el.offsetWidth > 0 && el.offsetHeight > 0)) {
      try {
        const visible = iframeManager.queryAll(target).find(n => n.offsetWidth > 0 && n.offsetHeight > 0);
        if (visible) el = visible;
      } catch (_) { /* keep the first match */ }
    }
    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return el;
    if (Date.now() - t0 > timeout * 1000) return null;
    await iframeManager.wait(0.05);
  }
}

/**
 * Is the element's centre inside the current camera window (stage coords)?
 * NOTE: a CENTER-point test — a partially cropped wide element still reads
 * "in view" (entry-automation QC r5 C2d: force the fly for taught elements).
 *
 * @param {IframeManager} iframeManager
 * @param {Element} el
 * @param {number} [margin=20]
 * @returns {boolean}
 */
export function inCameraView(iframeManager, el, margin = 20) {
  try {
    const p = iframeManager.elementToStageCoords(el);
    const v = iframeManager.viewport();
    return p.x >= margin && p.x <= v.w - margin && p.y >= margin && p.y <= v.h - margin;
  } catch (_) {
    return false;
  }
}

/**
 * Fly-then-centre: the deep-below-fold pattern (ee 4 / geo 4 — fly first,
 * then closed-loop centre INSIDE the clamp; 3-for-3 across films, ~0.7s per
 * closed-loop call). awaitLayout → flyToElement → paneScrollTo/pageCenter
 * (scroller-resolved) under a 2.5s cap. Warn-and-null with the [glideClick]
 * prefix so strict-glide smoke sees an unresolved target.
 *
 * @param {{iframeManager: IframeManager}} ctx
 * @param {string|Element} target
 * @param {Object} [opts] — flyToElement opts, plus:
 * @param {number} [opts.anchor=0.5] — centring anchor for the closed loop
 * @param {number} [opts.centerDuration=0.5]
 * @param {number} [opts.timeout=1.5] — awaitLayout seconds
 * @returns {Promise<Element|null>}
 */
export async function flyCentered({ iframeManager }, target, opts = {}) {
  const { anchor = 0.5, centerDuration = 0.5, timeout = 1.5, ...flyOpts } = opts;
  const el = await awaitLayout(iframeManager, target, { timeout });
  if (!el) {
    console.warn(`[glideClick] flyCentered: target never laid out: ${typeof target === 'string' ? target : (target && target.tagName) || target}`);
    return null;
  }
  await flyToElement({ iframeManager }, el, flyOpts);
  try {
    const centering = _scrollerFor(el)
      ? paneScrollTo(iframeManager, el, { duration: centerDuration, anchor })
      : pageCenter(iframeManager, el, { duration: centerDuration, anchor });
    await Promise.race([centering, iframeManager.wait(2.5)]);
  } catch (_) { /* clamped centring is best-effort — the fly framed it */ }
  return el;
}

/**
 * Framed glide+click — the per-film gcFramed, promoted (19 inlined copies).
 * awaitLayout → fly-if-outside-the-frame (flyCentered; `flyOpts` FORCES the
 * fly — the sfb 6 taught-element rule: inCameraView is a centre test and
 * silently degrades "framed" to "visible") → closed-loop centre otherwise →
 * glideClick with `scroll: false` (the double-scroll pattern cost ~0.7s per
 * action and pushed beats past their DUR windows).
 *
 * @param {{iframeManager: IframeManager, cursor: Object}} ctx
 * @param {string|Element} target
 * @param {Object} [opts] — glideClick opts, plus:
 * @param {Object} [opts.flyOpts] — pass (even `{}`) to force the fly; merged
 *   over the landscape defaults `{ fill: 0.42, maxZoom: 1.55, duration: 0.8 }`
 * @param {Function} [opts.flyFn] — override the camera verb (portrait shorts
 *   pass their punch/pan wrapper; default is flyCentered)
 * @param {number} [opts.timeout=1.5]
 * @returns {Promise<Element|null>}
 */
export async function gcFramed({ iframeManager, cursor }, target, opts = {}) {
  const { flyOpts, flyFn, timeout = 1.5, ...gcOpts } = opts;
  const el = await awaitLayout(iframeManager, target, { timeout });
  if (!el) {
    console.warn(`[glideClick] gcFramed: target never laid out: ${typeof target === 'string' ? target : (target && target.tagName) || target}`);
    return null;
  }
  if (flyOpts || !inCameraView(iframeManager, el)) {
    if (flyFn) await flyFn(el, flyOpts || {});
    else await flyCentered({ iframeManager }, el, { fill: 0.42, maxZoom: 1.55, duration: 0.8, ...(flyOpts || {}) });
  } else {
    try {
      const centering = _scrollerFor(el)
        ? paneScrollTo(iframeManager, el, { duration: 0.5 })
        : pageCenter(iframeManager, el, { duration: 0.5 });
      await Promise.race([centering, iframeManager.wait(2.5)]);
    } catch (_) { /* already framed — centring is a nicety */ }
  }
  return glideClick({ iframeManager, cursor }, el, { scroll: false, ...gcOpts });
}

let _camLandRegistered = false;

/**
 * Decomposed tutorial camera flight to an iframe element — the audit-clean
 * replacement for a bare single-tween `cameraToElement` + `tweenCamera` pair.
 *
 * A single-tween translate+scale between fixed poses reads as a slide
 * projector and caps a motion audit at tier B/C (wpforms-motion-audit HARD
 * RULE 2/3). This helper BLENDS the move into a single tween carrying a
 * two-curve arc (FIX-1 fa-retest 2026-07-13; re-shaped 2026-09-02, AP-4 —
 * the old version ran the dip and the land as two sequentially awaited
 * tweens with zero blend, so the first 42% read as a flat lateral pan;
 * Umair flagged it twice: "first it goes to right and then zooms", geo 8 /
 * wh 5; mercado-pago hand-bypassed the helper for the same reason):
 *
 *   tx/ty — travel the FULL duration on the named CustomEase 'ifm-cam-land'
 *           (registered on first use; power3.out fallback when the
 *           CustomEase plugin isn't loaded).
 *   zoom  — rides `zoomKeyframes` inside the SAME tween: dips to
 *           min(current, target)×0.96 (clamped ≥ 1) over the first 42%
 *           (power2.in), lands over the back 58% on the land ease. From
 *           rest (zoom 1) the dip clamps to 1 and the translate blends
 *           straight into the rising zoom; between poses it reads as the
 *           wide-out → re-zoom arc — pan and zoom always overlapped.
 *
 * The beat's narration hold supplies the land-and-hold third phase.
 *
 * Iframe zoom stays ≤ 2.0 by default — the documented CSS pixel-doubling
 * sharpness limit for iframe content (see wpforms-primitives skill).
 *
 * @param {Object} ctx
 * @param {IframeManager} ctx.iframeManager
 * @param {string|Element} target — passed to `cameraToElement`
 * @param {Object} [opts]
 * @param {number} [opts.fill=0.32]
 * @param {number} [opts.pad=24]
 * @param {number} [opts.maxZoom=2.0]
 * @param {number} [opts.minZoom] — pass-through when set
 * @param {number} [opts.duration=0.9] — total across both phases
 * @param {boolean} [opts.decompose=true] — true (the default) = the blended
 *   dip-inside-one-tween arc above (semantics re-shaped 2026-09-02: it used
 *   to mean two sequential tweens — the pan-then-zoom artifact). false skips
 *   the dip entirely and settles directly on the land ease (mp G: on tall
 *   pages where the move is mostly vertical, any dip arc reads as a sideways
 *   drift). Total duration is identical either way — no DUR/beat shifts.
 * @param {boolean} [opts.silent=false]
 * @returns {Promise<Object|null>} the landed pose, or null on failure
 *   (same warn-and-null defensive contract as `glideClick`)
 */
export async function flyToElement({ iframeManager }, target, opts = {}) {
  const {
    fill = 0.32,
    pad = 24,
    maxZoom = 2.0,
    minZoom,
    duration = 0.9,
    decompose = true,
    silent = false,
  } = opts;
  try {
    const cur = iframeManager.cameraState();
    const poseOpts = { fill, pad, maxZoom };
    if (minZoom != null) poseOpts.minZoom = minZoom;
    const pose = iframeManager.cameraToElement(target, poseOpts);

    // No-op-zoom warn (mp E, fix-round B3): fill-based framing on a WIDE
    // element computes a zoom ≈ the current zoom and the "camera move"
    // visibly does nothing ("Where the fuck is zoom" — 1000px row → zoom
    // 1.22 vs current 1.2). Stable '[camera]' prefix for console filters.
    if (Math.abs(pose.zoom - cur.zoom) < cur.zoom * 0.1) {
      console.warn(`[camera] flyToElement: target zoom ${pose.zoom.toFixed(2)} is within 10% of current ${cur.zoom.toFixed(2)} — the move will read as no zoom. Frame a SUB-REGION at explicit zoom instead.`);
    }

    let landEase = 'power3.out';
    if (typeof CustomEase !== 'undefined' && typeof gsap !== 'undefined') {
      if (!_camLandRegistered) {
        try {
          gsap.registerPlugin(CustomEase);
          CustomEase.create('ifm-cam-land', 'M0,0 C0.22,0 0.24,0.62 0.52,0.86 C0.74,1.02 0.88,1 1,1');
        } catch (e) { /* already registered or plugin refused — fallback below */ }
        _camLandRegistered = true;
      }
      landEase = 'ifm-cam-land';
    }

    if (decompose) {
      // ONE blended call (AP-4, granted behaviour change 2026-09-02): tx/ty
      // span the whole move on the land ease while the zoom dips and lands
      // via keyframes inside the same tween. Same dip depth, same 42/58
      // split, same eases, same total duration as the old two-call arc —
      // minus the un-blended seam between the calls.
      const dipZoom = Math.max(1, Math.min(cur.zoom, pose.zoom) * 0.96);
      await iframeManager.tweenCamera({
        zoom: pose.zoom,
        tx: pose.tx,
        ty: pose.ty,
        duration,
        ease: landEase,
        zoomKeyframes: [
          { zoom: dipZoom, duration: duration * 0.42, ease: 'power2.in' },
          { zoom: pose.zoom, duration: duration * 0.58, ease: landEase },
        ],
      });
    } else {
      // decompose:false (mp G) — single settle on the land ease, no dip.
      await iframeManager.tweenCamera({
        zoom: pose.zoom,
        tx: pose.tx,
        ty: pose.ty,
        duration,
        ease: landEase,
      });
    }
    logCameraPose('flyToElement', opts.label || target, pose);
    return pose;
  } catch (e) {
    if (!silent) console.warn(`[flyToElement] failed for ${target}: ${e.message}`);
    return null;
  }
}

// ── Pose-log sidecar (C-SPEC C4 runtime mode, dev session 2) ────────────────
//
// Camera verbs push their SETTLED pose into window.__poses so
// tools/composition-scan.js --play can count compositions and measure holds
// on a real-time play-through — no __tl, no seek. The log is DATA: it writes
// to an array, touches no pixels, changes no timing; a film renders
// identically with or without it. Never throws (a telemetry failure must
// not break a film).
//
// Record: { t, verb, target, zoom, tx, ty, settled }
//   t      — seconds since window.__T0 (0 when no film clock exists yet)
//   settled — true for landing verbs; false for drift (settle's slow push)
export function logCameraPose(verb, target, pose, settled = true) {
  try {
    if (typeof window === 'undefined' || !pose) return;
    let name = target;
    if (target && typeof target !== 'string') {
      name = target.id ? `#${target.id}` : `<${(target.tagName || 'node').toLowerCase()}>`;
    }
    (window.__poses || (window.__poses = [])).push({
      t: typeof window.__T0 === 'number' ? (performance.now() - window.__T0) / 1000 : 0,
      verb, target: String(name),
      zoom: pose.zoom, tx: pose.tx, ty: pose.ty, settled,
    });
  } catch (e) { /* telemetry only — never break the film */ }
}

// ── Re-layout as an authoring move (C-SPEC C2, dev session 2) ──────────────
//
// The three shipped inline re-layouts, promoted: notifications' 560px form
// reflow (slimFrontend), coupon-code's order-summary cap (prepBuilder), and
// spam-safety-net's column-hide + width-cap + sticky-unstick. All were
// damage control after a probe failed width physics; this makes re-layout
// shot design instead.
//
// Boundaries (the doctrine, stated once):
//   · Edits the RUNTIME iframe DOM only — snapshot files are protected.
//   · Inline element.style writes only (a CSS-injection variant would need
//     !important/ID-scope + computed-style probes — fix-round B6 item 8).
//   · Call BEFORE the beat's camera move — the pose math reads the reflowed
//     rect. Re-apply after every swap (a swap replaces the document);
//     prepOnSwap makes forgetting impossible.
//   · A1's zone rule stands above it: a real surface that is the beat's
//     subject gets full width or gets cropped — reflowSubject makes the
//     subject FIT the slice, never shrinks it to sit beside chrome.
//
// Degrade-don't-throw: a missing selector is reported in `missing`, never
// thrown (the DOM shape is the contract; absence is a report line).
//
// @param {IframeManager|Document} ifmOrDoc
// @param {Object} opts {
//   targets,               — selector | selector[] to cap + center
//   maxWidth = 560,        — px; null = don't cap
//   center = true,         — auto side margins
//   hideColumns = [],      — selectors display:none'd (list-table columns)
//   hideRows = [],         — selectors display:none'd (fixture rows)
//   unstick = true,        — position:sticky → static inside capped targets
// }
// @returns {{ applied: string[], missing: string[] }}
export function reflowSubject(ifmOrDoc, {
  targets = [], maxWidth = 560, center = true,
  hideColumns = [], hideRows = [], unstick = true,
} = {}) {
  const applied = [], missing = [];
  let doc = ifmOrDoc;
  try { if (ifmOrDoc && typeof ifmOrDoc.doc === 'function') doc = ifmOrDoc.doc(); } catch (e) { doc = null; }
  if (!doc || typeof doc.querySelector !== 'function') {
    console.warn('[reflowSubject] no iframe document — nothing applied');
    return { applied, missing: [].concat(targets, hideColumns, hideRows).map(String) };
  }
  for (const sel of [].concat(targets)) {
    const el = typeof sel === 'string' ? doc.querySelector(sel) : sel;
    if (!el) { missing.push(String(sel)); continue; }
    if (maxWidth != null) el.style.maxWidth = `${maxWidth}px`;
    if (center) { el.style.marginLeft = 'auto'; el.style.marginRight = 'auto'; }
    if (unstick) {
      // The spam-safety-net trap: sticky cells pin to the FULL-WIDTH scroll
      // container's edge no matter how narrow the table gets (probe r2
      // measured Δx +1059 AFTER the width cap). Un-stick into the flow.
      const win = doc.defaultView;
      if (win) {
        el.querySelectorAll('*').forEach((n) => {
          try { if (win.getComputedStyle(n).position === 'sticky') n.style.position = 'static'; } catch (e) {}
        });
      }
    }
    applied.push(String(sel));
  }
  for (const sel of [].concat(hideColumns, hideRows)) {
    const nodes = doc.querySelectorAll(sel);
    if (!nodes.length) { missing.push(String(sel)); continue; }
    nodes.forEach((n) => { n.style.display = 'none'; });
    applied.push(String(sel));
  }
  if (missing.length) console.warn(`[reflowSubject] missing selectors (degrade, not throw): ${missing.join(', ')}`);
  return { applied, missing };
}

// Run prepFn(doc) now AND after every subsequent load/swap on this
// IframeManager INSTANCE — the re-application idiom notifications /
// coupon-code / spam-safety-net each discovered independently (a swap
// replaces the document, silently reverting every inline reflow).
//
// Instance wrapper by design (fix-round C2 recommendation): monkey-patches
// THIS ifm's load/swap, never the prototype and never the shared
// constructor — zero shared-file blast radius. dispose() restores the
// originals.
//
// @param {IframeManager} ifm
// @param {(doc: Document) => void} prepFn — idempotent; runs on every doc
// @returns {{ dispose(): void }}
export function prepOnSwap(ifm, prepFn) {
  const run = () => { try { prepFn(ifm.doc()); } catch (e) { console.warn(`[prepOnSwap] prepFn failed: ${e.message}`); } };
  run();
  const origLoad = ifm.load.bind(ifm);
  const origSwap = ifm.swap.bind(ifm);
  ifm.load = async (...args) => { const r = await origLoad(...args); run(); return r; };
  ifm.swap = async (...args) => { const r = await origSwap(...args); run(); return r; };
  return {
    dispose() { ifm.load = origLoad; ifm.swap = origSwap; },
  };
}
