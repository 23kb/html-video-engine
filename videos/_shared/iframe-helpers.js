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
    const pt = iframeManager.elementToStageCoords(el);
    const glideOpts = { duration: glideDuration };
    if (via) glideOpts.via = via;
    await cursor.glide(pt, glideOpts);
    if (click) {
      const clickOpts = { ripple };
      if (rippleColor) clickOpts.rippleColor = rippleColor;
      await cursor.click(clickOpts);
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
