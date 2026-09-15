// UI snapshot helper — freezes a live WPForms admin page into a self-contained folder.
//
// Single-variant usage (legacy):
//   WP_URL=http://wpforms.local WP_USER=admin WP_PASS=pass \
//     node capture.js /wp-admin/admin.php?page=wpforms-overview notifications
//
//   Optional envs: WP_STEPS, WP_CLICK, WP_WAIT_FOR (see below).
//
// Multi-variant usage (Phase 6 Step 4):
//   WP_URL=... WP_USER=... WP_PASS=... node capture.js --variants plan.json
//
//   plan.json shape:
//     {
//       "targetPath": "/wp-admin/...",
//       "variants": [
//         { "slug": "foo-closed", "steps": [ ... ], "waitFor": "..." },
//         { "slug": "foo-open",   "steps": [ ... ] }
//       ]
//     }
//
//   A single login + initial navigation is reused across variants. Between
//   variants the page is reloaded from `targetPath` to reset state, then the
//   variant's `steps` run. `steps` follows the WP_STEPS schema:
//     { click: '<sel>', settle?: <ms> }
//     { eval:  '<js>',  settle?: <ms> }
//     { wait:  <ms> }
//
//   No asset dedup across variants — each variant writes its own full
//   assets/ folder (deferred scope).
//
// Output: ./snapshots/<slug>/index.html (+ assets/ subfolder) per variant.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Catalog generation runs in-process after each snapshot writes.
// Lazily required so a missing tools/ dir doesn't break legacy invocations.
let catalogTool = null;
function tryRequireCatalogTool() {
  if (catalogTool !== null) return catalogTool;
  try { catalogTool = require('../tools/generate-snapshot-catalog.js'); }
  catch (e) { catalogTool = false; }
  return catalogTool;
}

// ── Parse CLI ────────────────────────────────────────────────────────────
// Supports:
//   node capture.js <targetPath> <slug>           (legacy)
//   node capture.js --variants <jsonFile>         (multi-variant)
//   --site <name>: read url/creds from tools/sites.json (the canonical
//   registry site-eval/preflight already use) instead of a stale .env.
//   Env vars stay as per-field overrides on top of the site entry.
let variantsPlan = null;
let legacyTargetPath = null;
let legacySlug = null;
let siteName = null;

{
  const args = process.argv.slice(2);
  const sIdx = args.indexOf('--site');
  if (sIdx !== -1) {
    siteName = args[sIdx + 1];
    if (!siteName) { console.error('--site requires a site name from tools/sites.json'); process.exit(1); }
    args.splice(sIdx, 2);
  }
  const vIdx = args.indexOf('--variants');
  if (vIdx !== -1) {
    const planPath = args[vIdx + 1];
    if (!planPath) {
      console.error('--variants requires a JSON file path');
      process.exit(1);
    }
    const raw = fs.readFileSync(path.resolve(planPath), 'utf8');
    variantsPlan = JSON.parse(raw);
    if (!Array.isArray(variantsPlan.variants) || variantsPlan.variants.length === 0) {
      console.error('variants plan must have {variants:[{slug, targetPath?, steps?}, ...]} — top-level targetPath is optional if every variant supplies its own');
      process.exit(1);
    }
    for (const v of variantsPlan.variants) {
      if (!v.slug) { console.error('every variant needs a slug'); process.exit(1); }
      if (!variantsPlan.targetPath && !v.targetPath) {
        console.error(`variant "${v.slug}" needs a targetPath (no plan-level fallback set)`);
        process.exit(1);
      }
    }
  } else {
    legacyTargetPath = args[0];
    legacySlug       = args[1];
  }
}

// ── Resolve credentials: --site entry from tools/sites.json, env overrides ──
let siteEntry = null;
if (siteName) {
  const sitesPath = path.join(__dirname, '..', 'tools', 'sites.json');
  let registry;
  try { registry = JSON.parse(fs.readFileSync(sitesPath, 'utf8')); }
  catch (e) { console.error(`--site: cannot read tools/sites.json (${e.message})`); process.exit(1); }
  siteEntry = registry.sites && registry.sites[siteName];
  if (!siteEntry) {
    console.error(`--site: "${siteName}" not in tools/sites.json (have: ${Object.keys(registry.sites || {}).join(', ')})`);
    process.exit(1);
  }
  if ([siteEntry.url, siteEntry.adminUser, siteEntry.adminPass].some(v => !v || String(v).startsWith('TODO'))) {
    console.error(`--site: "${siteName}" entry has TODO/missing url or credentials — fill tools/sites.json first`);
    process.exit(1);
  }
}
const WP_URL  = process.env.WP_URL  || (siteEntry && siteEntry.url);
const WP_USER = process.env.WP_USER || (siteEntry && siteEntry.adminUser);
const WP_PASS = process.env.WP_PASS || (siteEntry && siteEntry.adminPass);

if (!WP_URL || !WP_USER || !WP_PASS || (!variantsPlan && (!legacyTargetPath || !legacySlug))) {
  console.error('Missing args. Examples:');
  console.error('  node capture.js --site sullies-bakery "/wp-admin/admin.php?page=wpforms-builder&form_id=1&view=settings&section=notifications" notifications');
  console.error('  WP_URL=http://wpforms.local WP_USER=admin WP_PASS=pass \\');
  console.error('    node capture.js "/wp-admin/..." <slug>');
  console.error('  …or multi-variant:');
  console.error('    node capture.js [--site <name>] --variants ./plan.json');
  process.exit(1);
}

// Normalize: both CLI forms collapse to a { targetPath, variants[] } plan.
const plan = variantsPlan ?? {
  targetPath: legacyTargetPath,
  variants: [{
    slug: legacySlug,
    steps: process.env.WP_STEPS
      ? JSON.parse(process.env.WP_STEPS)
      : (process.env.WP_CLICK
          ? process.env.WP_CLICK.split(',').map(s => ({ click: s.trim() })).filter(x => x.click)
          : []),
    waitFor: process.env.WP_WAIT_FOR || undefined,
  }],
};

// ── Output root ──────────────────────────────────────────────────────────
// WP_SNAPSHOT_ROOT overrides where snapshot dirs are written (tests sandbox
// into a temp dir). When overridden, the catalog auto-emit is skipped — it
// only understands the real snapshots/ tree.
const SNAP_ROOT = process.env.WP_SNAPSHOT_ROOT || path.join(__dirname, '..', 'snapshots');
const SNAP_ROOT_OVERRIDDEN = Boolean(process.env.WP_SNAPSHOT_ROOT);

// A wp_die / DB-error / bounced-to-login page must never become a
// "successful" snapshot (an FA capture shipped a 3 KB wp_die page with
// exit 0). Sniffed from <title> after steps + waitFor run.
function isErrorPage(title) {
  return /WordPress .*Error|Database Error|Log In/i.test(title || '');
}

// ── Shared asset pool ────────────────────────────────────────────────────
// `assetMap`: url → filename (hashed). Populated by the response listener
// across all variants (same page context → asset URLs hash identically).
// `assetBuffers`: filename → Buffer. Used to re-emit into each variant's
// assets/ dir (no cross-variant dedup, per Step 4 scope).
const assetMap     = new Map();
const assetBuffers = new Map();

// ── Secret sanitizer ─────────────────────────────────────────────────────
// Strip API keys / tokens that the live WP install legitimately embeds
// in the rendered DOM and asset files (e.g., Google Maps for Geolocation,
// Stripe test keys in payment settings). Runs on the rendered HTML and
// on text assets (HTML/JS/CSS/JSON/SVG/etc). Binary assets pass through.
const SECRET_PATTERNS = [
  { name: 'google-api',   re: /AIza[0-9A-Za-z_\-]{35}/g },
  { name: 'stripe-pk',    re: /pk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-sk',    re: /sk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-rk',    re: /rk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-whsec', re: /whsec_[A-Za-z0-9]{20,}/g },
  { name: 'aws-akia',     re: /AKIA[A-Z0-9]{16}/g },
  { name: 'github-token', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'slack-token',  re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
];

const sanitizeReport = new Map(); // pattern name → count
function sanitizeText(text) {
  let out = text;
  for (const { name, re } of SECRET_PATTERNS) {
    const matches = out.match(re);
    if (matches) {
      sanitizeReport.set(name, (sanitizeReport.get(name) || 0) + matches.length);
      out = out.replace(re, 'REDACTED_KEY');
    }
  }
  return out;
}

const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml']);
function sanitizeAssetIfText(filename, buf) {
  const ext = path.extname(filename).toLowerCase();
  if (!TEXT_EXTS.has(ext)) return buf;
  const text = buf.toString('utf8');
  const sanitized = sanitizeText(text);
  return sanitized === text ? buf : Buffer.from(sanitized, 'utf8');
}

function hashName(url, ext) {
  const h = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  return `${h}${ext}`;
}

function extFor(url, contentType = '') {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]+)$/i);
  if (m) return '.' + m[1].toLowerCase();
  if (contentType.includes('css'))        return '.css';
  if (contentType.includes('javascript')) return '.js';
  if (contentType.includes('svg'))        return '.svg';
  if (contentType.includes('png'))        return '.png';
  if (contentType.includes('jpeg'))       return '.jpg';
  if (contentType.includes('woff2'))      return '.woff2';
  if (contentType.includes('woff'))       return '.woff';
  return '.bin';
}

async function runSteps(page, steps) {
  for (const step of steps || []) {
    if (step.click) {
      console.log('    → click', step.click);
      await page.waitForSelector(step.click, { timeout: 8000 });
      await page.click(step.click);
      await page.waitForTimeout(step.settle ?? 800);
    } else if (step.eval) {
      console.log('    → eval');
      await page.evaluate(step.eval);
      await page.waitForTimeout(step.settle ?? 1500);
    } else if (step.setFile) {
      // Populate a file <input> (e.g. CSV upload UI state). `sel` + `path`.
      console.log('    → setFile', step.setFile.sel);
      await page.setInputFiles(step.setFile.sel, step.setFile.path);
      await page.waitForTimeout(step.settle ?? 1200);
    } else if (step.pickChoice) {
      // Robustly select an option in a Choices.js-enhanced <select>. Choices.js
      // ignores synthetic clicks, so this drives real Playwright mouse events:
      // open the control (retry — it can toggle shut), then click the item by
      // data-value. `sel` is the underlying <select> selector; `value` the option value.
      const { sel, value } = step.pickChoice;
      console.log('    → pickChoice', sel, '=', value);
      const container = page.locator('.choices', { has: page.locator(sel) });
      const item = container.locator(`.choices__list--dropdown .choices__item[data-value="${value}"]`).first();
      for (let i = 0; i < 6; i++) {
        await container.locator('.choices__inner').click();
        await page.waitForTimeout(350);
        if (await item.isVisible().catch(() => false)) break;
      }
      await item.scrollIntoViewIfNeeded().catch(() => {});
      await item.click({ force: true });
      await page.waitForTimeout(step.settle ?? 500);
    } else if (step.awaitSel) {
      // Wait for a selector/state (e.g. mapping block unhide, import-complete modal).
      // Supports a long timeout for chunked AJAX flows.
      const { sel, timeout, state } = step.awaitSel;
      console.log('    → awaitSel', sel);
      await page.waitForSelector(sel, { state: state || 'visible', timeout: timeout || 15000 })
        .catch(() => console.warn('    ⚠ awaitSel timeout', sel));
      await page.waitForTimeout(step.settle ?? 300);
    } else if (step.wait) {
      await page.waitForTimeout(step.wait);
    }
  }
}

async function captureVariant(page, variant) {
  const { slug, steps, waitFor } = variant;
  const targetPath = variant.targetPath || plan.targetPath;
  console.log(`\n── Variant: ${slug} ──`);

  const outDir    = path.join(SNAP_ROOT, slug);
  const assetsDir = path.join(outDir, 'assets');

  await runSteps(page, steps);

  if (waitFor) {
    console.log('    → waitFor', waitFor);
    try {
      await page.waitForSelector(waitFor, { timeout: 10000 });
      await page.waitForTimeout(500);
    } catch {
      console.warn('    ⚠ waitFor selector not found — continuing anyway');
    }
  }

  // Garbage gate: never serialize an error/login page. Throwing here marks
  // the variant FAILED in the batch summary; nothing is written.
  const pageTitle = await page.title().catch(() => '');
  if (isErrorPage(pageTitle)) {
    throw new Error(`error page detected (title: "${pageTitle}") — nothing written`);
  }

  // (live-reference.png is saved further down, AFTER the chrome strip — see
  // the "paint-diff reference" block below for why.)

  // Visibility bake (ccs 1, fix-round B1): hidden overlays whose hidden state
  // lives in JS/stylesheet rules can resurrect EXPANDED when serialization
  // strips scripts — the WPCode picker serialized inline-expanded and produced
  // a 32,766px page. Bake computed hidden state into inline styles so the
  // frozen markup can't disagree with the live paint. Lossless for pages
  // that don't need it (only writes where the computed state isn't already
  // inline).
  //
  // `visibility` INHERITS, and that is what made this bake a trap. Stamping it
  // on every descendant of a hidden container froze the Export menu at 32 of 33
  // descendants individually hidden, so revealing the container later produced
  // a correctly sized, correctly laid out, entirely EMPTY box — three debugging
  // rounds across rf 16 / 17 / 20, roughly half that session. Only the element
  // that actually TURNS hidden needs the stamp; the subtree follows it, exactly
  // as it did live. `display: none` needs no such guard — computed display is
  // not inherited, so descendants of a display:none node already report their
  // own value and were never stamped.
  const bakeStats = await page.evaluate(() => {
    let stamped = 0, inheritedSkipped = 0;
    for (const el of document.body.querySelectorAll('*')) {
      try {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' && el.style.display !== 'none') { el.style.display = 'none'; stamped++; }
        else if (cs.visibility === 'hidden' && el.style.visibility !== 'hidden') {
          const parent = el.parentElement;
          if (parent && getComputedStyle(parent).visibility === 'hidden') { inheritedSkipped++; continue; }
          el.style.visibility = 'hidden';
          stamped++;
        }
      } catch {}
    }
    return { stamped, inheritedSkipped };
  });
  if (bakeStats.inheritedSkipped) {
    console.log(`    · visibility bake: ${bakeStats.stamped} stamped, ${bakeStats.inheritedSkipped} skipped as inherited (they follow their hidden container — rf 17)`);
  }

  // CSSOM materialization (ccs 2, fix-round B1): JS-injected rules
  // (insertRule into an empty <style>, adoptedStyleSheets) exist ONLY in the
  // CSSOM — no static asset localizer sees them, which is why WPCode
  // recaptures stayed visually wrong while element positions probed fine.
  // Write each such sheet's cssRules back into serializable <style> text.
  // Cross-origin sheets that throw on cssRules access are skipped (the SaaS
  // path's ingest handles those).
  const cssomReport = await page.evaluate(() => {
    let materialized = 0;
    for (const styleEl of document.querySelectorAll('style')) {
      try {
        const sheet = styleEl.sheet;
        if (sheet && sheet.cssRules.length && !styleEl.textContent.trim()) {
          styleEl.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          materialized++;
        }
      } catch {}
    }
    try {
      for (const sheet of (document.adoptedStyleSheets || [])) {
        const s = document.createElement('style');
        s.setAttribute('data-adopted-sheet', '1');
        s.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
        document.head.appendChild(s);
        materialized++;
      }
    } catch {}
    return materialized;
  });
  if (cssomReport) console.log(`    ✓ materialized ${cssomReport} CSSOM-injected style sheet(s)`);

  // Bake property-level state into serializable attributes. JS-driven state
  // set during steps (input.value = …, radio.click(), select.value + change)
  // lives on DOM properties only; outerHTML serializes attributes, so without
  // this pass every typed value / checked radio / picked option reverts to
  // the server-rendered default in the snapshot.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('input')) {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else if (type !== 'file' && type !== 'password') {
        el.setAttribute('value', el.value);
      }
    }
    for (const sel of document.querySelectorAll('select')) {
      for (const opt of sel.options) {
        if (opt.selected) opt.setAttribute('selected', 'selected');
        else opt.removeAttribute('selected');
      }
    }
    for (const ta of document.querySelectorAll('textarea')) {
      ta.textContent = ta.value;
    }
  });

  fs.mkdirSync(assetsDir, { recursive: true });

  // Inline stylesheets (so url() refs resolve against local assets)
  const inlineStyles = await page.evaluate(async () => {
    const sheets = [];
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      try {
        const r = await fetch(link.href);
        sheets.push({ href: link.href, css: await r.text() });
      } catch {}
    }
    return sheets;
  });

  const rewriteCss = (css, baseHref) => css.replace(/url\(([^)]+)\)/g, (m, raw) => {
    let u = raw.trim().replace(/^["']|["']$/g, '');
    if (u.startsWith('data:')) return m;
    try { u = new URL(u, baseHref).toString(); } catch { return m; }
    const local = assetMap.get(u);
    return local ? `url(${local})` : m;
  });

  // ── Asset localizer (tutorial-system-fixes #6) ──────────────────────────
  // The response listener only pools what the LIVE page happened to fetch.
  // url() refs the page never exercised (lazy icons, alternate font weights,
  // root-relative /wpforms/assets/... paths from new plugin CSS) survive as
  // dangling refs → snapshot 404s. Fetch every same-host url() ref that isn't
  // pooled yet and pool it, so the rewrite passes below can localize it.
  const sourceOrigin = new URL(WP_URL).origin;
  const localizerReport = { fetched: 0, failed: 0 };
  async function ensureAsset(absUrl) {
    if (assetMap.has(absUrl)) return assetMap.get(absUrl);
    try {
      const res = await page.request.get(absUrl, { timeout: 10000 });
      if (!res.ok()) { localizerReport.failed++; return null; }
      const buf = await res.body();
      const ct = res.headers()['content-type'] || '';
      const filename = hashName(absUrl, extFor(absUrl, ct));
      assetMap.set(absUrl, 'assets/' + filename);
      assetBuffers.set(filename, buf);
      localizerReport.fetched++;
      return assetMap.get(absUrl);
    } catch { localizerReport.failed++; return null; }
  }
  function cssRefs(css, baseHref) {
    const refs = [];
    for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
      const u = m[1].trim().replace(/^["']|["']$/g, '');
      if (u.startsWith('data:') || u.startsWith('#')) continue;
      try {
        const abs = new URL(u, baseHref);
        if (abs.origin === sourceOrigin) refs.push(abs.toString());
      } catch {}
    }
    return refs;
  }
  // Pass 1: refs inside the stylesheets being inlined.
  for (const { href, css } of inlineStyles) {
    for (const abs of cssRefs(css, href)) await ensureAsset(abs);
  }

  // Rasterize <canvas> → <img> (canvas pixels aren't in outerHTML).
  //
  // This is the right fallback and it used to be completely silent, which is
  // the problem: the still looks perfect and the region is dead. A baked raster
  // cannot be hovered, resized or animated as DOM, so it quietly turns a
  // live-DOM film into a slideshow and the author cannot tell from the markup
  // that anything died (rf 10). Every rasterization is now reported, and
  // capture-gates WARNs on the result so it reaches outline.md.
  const rasterized = await page.evaluate(() => {
    const hits = [];
    for (const c of document.querySelectorAll('canvas')) {
      try {
        const r0 = c.getBoundingClientRect();
        hits.push({ w: Math.round(r0.width), h: Math.round(r0.height), cls: (c.className || '').slice(0, 60) });
        const dataUrl = c.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.setAttribute('data-from-canvas', '1');
        const rect = c.getBoundingClientRect();
        img.style.width  = rect.width  + 'px';
        img.style.height = rect.height + 'px';
        img.style.display = 'block';
        if (c.className) img.className = c.className;
        c.parentNode.replaceChild(img, c);
      } catch {}
    }
    return hits;
  });
  if (rasterized.length) {
    console.warn(`    ⚠ ${rasterized.length} <canvas> rasterized to PNG — DEAD in the snapshot (no hover, no resize, not animatable as DOM):`);
    for (const h of rasterized) console.warn(`        ${h.w}×${h.h}${h.cls ? `  .${h.cls.split(/\s+/).join('.')}` : ''}`);
    console.warn('      If a beat needs this region live, rehydrate it (see snapshots/_shared/survey-reporting.js) instead of filming the raster.');
  }

  // Strip WP notices (always). Sidebar and top admin bar are independent.
  //
  // Plugin admin pages (slug starts with `admin-`) want the WP sidebar
  // (#adminmenu*) but NOT the top admin toolbar (#wpadminbar / #wp-toolbar).
  // Non-admin slugs (builder fullscreen, frontend) drop both.
  //
  // Variant overrides (highest precedence):
  //   keepSidebar:     true | false   — also accepts legacy `keepChrome` alias
  //   keepTopAdminBar: true | false
  const isAdmin = slug.startsWith('admin-');
  const keepSidebar     = variant.keepSidebar     ?? variant.keepChrome ?? isAdmin;
  const keepTopAdminBar = variant.keepTopAdminBar ?? false;
  await page.evaluate(({ keepSidebar, keepTopAdminBar }) => {
    for (const sel of [
      '.wpforms-review-notice',
      '.wpforms-admin-notice',
      '.notice.is-dismissible:not(.wpforms-preserve)',
    ]) {
      document.querySelectorAll(sel).forEach(n => n.remove());
    }
    if (!keepSidebar) {
      for (const sel of ['#adminmenumain', '#adminmenuback', '#adminmenuwrap', '#adminmenu', '#wpfooter']) {
        document.querySelectorAll(sel).forEach(n => n.remove());
      }
    }
    if (!keepTopAdminBar) {
      for (const sel of ['#wpadminbar', '#wp-toolbar']) {
        document.querySelectorAll(sel).forEach(n => n.remove());
      }
      document.body.classList.remove('admin-bar');
      // WordPress reserves the top band via `html.wp-toolbar { padding-top:32px }`
      // and a `@media screen { html { margin-top:32px !important } }` rule.
      // Removing #wpadminbar alone leaves a blank stripe. Drop the trigger
      // class on <html> and inject a counter-style block that wins via
      // !important against any surviving WP rule.
      document.documentElement.classList.remove('wp-toolbar');
      document.documentElement.style.marginTop = '0';
      document.documentElement.style.paddingTop = '0';
      document.body.style.marginTop = '0';
      document.body.style.paddingTop = '0';
      const reset = document.createElement('style');
      reset.setAttribute('data-snapshot-no-admin-bar', '1');
      reset.textContent = [
        'html { margin-top: 0 !important; padding-top: 0 !important; }',
        'html.wp-toolbar { padding-top: 0 !important; }',
        'body { margin-top: 0 !important; padding-top: 0 !important; }',
        '@media screen { html { margin-top: 0 !important; } }',
      ].join('\n');
      document.head.appendChild(reset);
    }
  }, { keepSidebar, keepTopAdminBar });

  // Paint-diff reference (C6 gate support). Save the live page's paint so the
  // post-capture gate (tools/capture-gates.js) can prove the frozen snapshot
  // still paints the same — ccs 12: structural checks pass on visually
  // destroyed pages; only a paint comparison catches them.
  //
  // Taken AFTER the chrome strip on purpose. It used to be taken before, so
  // the gate compared a page that HAD the WP sidebar and admin bar against a
  // snapshot we had deliberately removed them from, and then charged us for
  // our own edit. Measured on sp-results-ranking-full: 31.0 mean abs diff
  // full-frame vs 7.2 with those two bands excluded — the whole WARN was the
  // chrome (rf 9). Everything between the page load and here is paint-neutral
  // by design (the visibility bake writes already-computed values; CSSOM
  // materialization re-states rules that were already applied), so this is
  // still the live paint of the thing we actually intend to freeze.
  try {
    fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, 'live-reference.png') });
    console.log('    ✓ live-reference.png saved (paint-diff gate reference, post-chrome-strip)');
  } catch (e) {
    console.warn('    [warn] live-reference screenshot failed:', e.message);
  }

  // Inline stylesheet links and rewrite asset URLs in attributes — done in
  // DOM space so HTML entity encoding (`&` vs `&amp;`) doesn't break matching.
  // The previous regex-against-outerHTML approach silently dropped any link
  // whose href contained query separators (e.g. wp-admin/load-styles.php?ver=
  // ...&load=dashicons,admin-bar,common,...), because the captured HTML
  // serialized those `&` as `&amp;`. See docs/i-011-repair-plan.md.
  {
    const sheetsByHref = {};
    for (const { href, css } of inlineStyles) {
      sheetsByHref[href] = rewriteCss(css, href);
    }
    await page.evaluate(({ sheets, assets }) => {
      for (const link of Array.from(document.querySelectorAll('link[rel="stylesheet"]'))) {
        const href = link.href;
        const css = sheets[href];
        if (typeof css !== 'string') continue;
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-origin', href);
        const media = link.getAttribute('media');
        if (media && media !== 'all') styleEl.setAttribute('media', media);
        // textContent on a <style> serializes verbatim through outerHTML
        // (HTML5 raw-text element) — no </style> escape needed.
        styleEl.textContent = css;
        link.replaceWith(styleEl);
      }
      const attrNames = ['href', 'src', 'data-src', 'poster', 'data-origin'];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        for (const a of attrNames) {
          if (!el.hasAttribute(a)) continue;
          const v = el.getAttribute(a);
          if (!v) continue;
          let abs = v;
          try { abs = new URL(v, document.baseURI).toString(); } catch {}
          const local = assets[abs] || assets[v];
          if (local) el.setAttribute(a, local);
        }
      }
    }, { sheets: sheetsByHref, assets: Object.fromEntries(assetMap) });
  }

  let rewritten = await page.evaluate(() => document.documentElement.outerHTML);

  // Backstop: rewrite any remaining absolute asset URLs that the DOM-level
  // pass didn't reach (inline `style="background:url(...)"`, srcset entries,
  // strings inside text content, etc.). Match both the raw `&` form and the
  // HTML-entity-encoded `&amp;` form so query-stringed URLs are handled.
  for (const [url, local] of assetMap) {
    const variants = url.includes('&')
      ? [url, url.replace(/&/g, '&amp;')]
      : [url];
    for (const variant of variants) {
      const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rewritten = rewritten.replace(new RegExp(esc, 'g'), () => local);
    }
  }

  rewritten = rewritten.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<!-- script stripped -->');

  const sourceHost = new URL(WP_URL).host;
  const hostEsc = sourceHost.replace(/\./g, '\\.');
  // Strip remaining same-host <link> tags (favicons, dns-prefetch placeholders,
  // RSS feeds, etc.) that the DOM inliner didn't own. Skip `rel="stylesheet"`
  // explicitly — the inliner already replaced every fetchable stylesheet with
  // a <style data-origin> block; any stylesheet link still here failed to
  // fetch and is genuinely broken, but we let the inliner own that decision.
  rewritten = rewritten.replace(
    new RegExp(`<link\\b(?![^>]*rel=["']stylesheet["'])[^>]+href=["']https?://${hostEsc}/[^"']*["'][^>]*>`, 'gi'),
    '<!-- broken link stripped -->'
  );
  rewritten = rewritten.replace(
    new RegExp(`src:url\\(['"]?https?://${hostEsc}/[^'")]+['"]?\\)\\s*format\\(['"]woff2['"]\\)`, 'gi'),
    `src:local('sans-serif')`
  );
  rewritten = rewritten.replace(
    new RegExp(`url\\(['"]?https?://${hostEsc}/[^'")]+['"]?\\)`, 'gi'),
    'none'
  );

  const baseFontStyle = `<style data-snapshot-base-font>html,body,button,input,select,textarea{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;}</style>`;
  if (/<head[^>]*>/i.test(rewritten)) {
    rewritten = rewritten.replace(/<head[^>]*>/i, m => m + baseFontStyle);
  } else {
    rewritten = baseFontStyle + rewritten;
  }

  // Emit only assets the rewritten HTML actually references. The response
  // listener pools every JS/CSS/image/font the live page fetched (including
  // lazy webpack chunks, prefetches, and XHR responses), but the post-render
  // serialized DOM only points at a fraction of that. Writing everything
  // produces ~80% orphan files per snapshot — see
  // tools/prune-snapshot-assets.js for the post-hoc cleanup that proves it.
  // Text assets get sanitized for embedded API keys; binaries pass through.
  const referencedAssets = new Set();
  for (const m of rewritten.matchAll(/assets\/([A-Za-z0-9._-]+\.[A-Za-z0-9]+)/g)) {
    referencedAssets.add(m[1]);
  }

  // Localizer pass 2: referenced CSS *files* keep their own url() refs
  // (../webfonts/fa-*.woff2, root-relative plugin images) that resolve
  // OUTSIDE the snapshot folder once served. Resolve each against the CSS
  // file's source URL, pool the target, rewrite the ref to the pooled
  // sibling filename (both live in assets/), and force-emit the new files.
  {
    const filenameToUrl = new Map();
    for (const [url, local] of assetMap) filenameToUrl.set(local.replace(/^assets\//, ''), url);
    for (const filename of [...referencedAssets].filter((f) => f.endsWith('.css'))) {
      const buf = assetBuffers.get(filename);
      const srcUrl = filenameToUrl.get(filename);
      if (!buf || !srcUrl) continue;
      let css = buf.toString('utf8');
      let changed = false;
      for (const abs of cssRefs(css, srcUrl)) {
        const local = await ensureAsset(abs);
        if (!local) continue;
        const sib = local.replace(/^assets\//, '');
        referencedAssets.add(sib);
        css = css.replace(/url\(([^)]+)\)/g, (m, raw) => {
          const u = raw.trim().replace(/^["']|["']$/g, '');
          if (u.startsWith('data:')) return m;
          try { return new URL(u, srcUrl).toString() === abs ? `url(${sib})` : m; } catch { return m; }
        });
        changed = true;
      }
      if (changed) assetBuffers.set(filename, Buffer.from(css, 'utf8'));
    }
  }
  if (localizerReport.fetched || localizerReport.failed) {
    console.log(`    localizer: ${localizerReport.fetched} out-of-snapshot asset(s) fetched + pooled${localizerReport.failed ? `, ${localizerReport.failed} unreachable (left as-is)` : ''}`);
  }

  let emittedCount = 0;
  let skippedCount = 0;
  for (const [filename, buf] of assetBuffers) {
    if (!referencedAssets.has(filename)) { skippedCount++; continue; }
    fs.writeFileSync(path.join(assetsDir, filename), sanitizeAssetIfText(filename, buf));
    emittedCount++;
  }

  // Sanitize the rendered HTML before writing — this catches keys that
  // live in input value="..." attributes (Stripe test keys in payment
  // settings, etc.) which never round-trip through assetBuffers.
  rewritten = sanitizeText(rewritten);

  // Charset guard: the snapshot must declare UTF-8 or em-dashes and friends
  // render as mojibake when served without content-type charset headers.
  if (!/<meta[^>]+charset/i.test(rewritten)) {
    rewritten = rewritten.replace(/<head[^>]*>/i, m => m + '<meta charset="utf-8">');
  }
  const mojibake = (rewritten.match(/�/g) || []).length;
  if (mojibake) {
    console.warn(`    ⚠ ${mojibake} replacement character(s) (�) in serialized HTML — source encoding was already broken`);
  }

  fs.writeFileSync(path.join(outDir, 'index.html'), '<!doctype html>\n' + rewritten, 'utf8');
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    sourceUrl: WP_URL + targetPath,
    capturedAt: new Date().toISOString(),
    assetCount: emittedCount,
    assetCountSkipped: skippedCount,
    variantSlug: slug,
    // Recorded so post-capture.js can re-verify the anchor still resolves
    // after the trim pipeline (over-trim detection).
    waitFor: waitFor || null,
    // Recorded so capture-gates.js screenshots the frozen page at the SAME
    // viewport as live-reference.png (paint-diff comparability).
    viewport: page.viewportSize() || null,
  }, null, 2));

  console.log(`    ✓ wrote ${outDir} (${emittedCount} assets, ${skippedCount} unreferenced skipped)`);

  // Auto-generate the per-snapshot selector catalog. Non-fatal — capture
  // continues even if catalog emission throws (e.g. tools/ folder missing
  // in a stripped-down environment). The catalog runs on the raw captured
  // HTML; if a later post-process step (trim-builder-markup, dedup-css,
  // consolidate-assets) modifies the HTML, re-run
  // `node tools/generate-snapshot-catalog.js <slug>` to refresh.
  const tool = SNAP_ROOT_OVERRIDDEN ? null : tryRequireCatalogTool();
  if (SNAP_ROOT_OVERRIDDEN) {
    console.log('    (catalog emit skipped — WP_SNAPSHOT_ROOT override active)');
  }
  if (tool) {
    try {
      tool.emitFor(slug);
      tool.refreshGlobalIndex();
    } catch (e) {
      console.warn(`    [warn] catalog emit failed for ${slug}: ${e.message}`);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const VIEWPORT_W = parseInt(process.env.WP_VIEWPORT_W || '1440', 10);
  const VIEWPORT_H = parseInt(process.env.WP_VIEWPORT_H || '900', 10);
  const context = await browser.newContext({ viewport: { width: VIEWPORT_W, height: VIEWPORT_H } });
  const page    = await context.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    const ct  = res.headers()['content-type'] || '';
    if (!/\.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)(\?|$)/i.test(url) &&
        !/css|javascript|image|font/.test(ct)) return;
    if (assetMap.has(url)) return;
    try {
      const buf = await res.body();
      const filename = hashName(url, extFor(url, ct));
      assetMap.set(url, 'assets/' + filename);
      assetBuffers.set(filename, buf);
    } catch {}
  });

  console.log('→ Logging in…');
  await page.goto(WP_URL + '/wp-login.php', { waitUntil: 'networkidle' });
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass',  WP_PASS);
  await Promise.all([
    page.click('#wp-submit'),
    page.waitForURL(/wp-admin/, { timeout: 15000 }),
  ]);

  // One failing variant must not abort the batch (a mid-batch abort costs a
  // full re-login + re-run). Attempt every variant, table the results, exit
  // non-zero if any failed.
  const results = [];
  for (let i = 0; i < plan.variants.length; i++) {
    const variant = plan.variants[i];
    // Each variant may override targetPath. Falls back to plan.targetPath for
    // backward compatibility with single-page and original multi-variant plans.
    const target = variant.targetPath || plan.targetPath;
    try {
      console.log(`→ Navigating to ${target}`);
      await page.goto(WP_URL + target, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await captureVariant(page, variant);
      results.push({ slug: variant.slug, ok: true });
    } catch (e) {
      results.push({ slug: variant.slug, ok: false, err: (e.message || String(e)).split('\n')[0] });
      console.error(`    ✗ ${variant.slug} FAILED: ${results[results.length - 1].err}`);
    }
  }

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\n── Capture summary (${results.length} variant(s), ${assetBuffers.size} assets pooled) ──`);
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.slug}${r.ok ? '' : ' — ' + r.err}`);
  }
  if (sanitizeReport.size) {
    const lines = [...sanitizeReport.entries()].map(([k, n]) => `  ${k}: ${n}`);
    console.log(`✓ Secret scan — redacted:\n${lines.join('\n')}`);
  } else {
    console.log('✓ Secret scan: no embedded secrets found. (Secrets only — NOT a visual check.)');
  }
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
