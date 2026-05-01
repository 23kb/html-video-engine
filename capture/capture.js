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

const WP_URL  = process.env.WP_URL;
const WP_USER = process.env.WP_USER;
const WP_PASS = process.env.WP_PASS;

// ── Parse CLI ────────────────────────────────────────────────────────────
// Supports:
//   node capture.js <targetPath> <slug>           (legacy)
//   node capture.js --variants <jsonFile>         (multi-variant)
let variantsPlan = null;
let legacyTargetPath = null;
let legacySlug = null;

{
  const args = process.argv.slice(2);
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

if (!WP_URL || !WP_USER || !WP_PASS || (!variantsPlan && (!legacyTargetPath || !legacySlug))) {
  console.error('Missing args. Examples:');
  console.error('  WP_URL=http://wpforms.local WP_USER=admin WP_PASS=pass \\');
  console.error('    node capture.js "/wp-admin/admin.php?page=wpforms-builder&form_id=1&view=settings&section=notifications" notifications');
  console.error('  …or multi-variant:');
  console.error('    node capture.js --variants ./plan.json');
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
    } else if (step.wait) {
      await page.waitForTimeout(step.wait);
    }
  }
}

async function captureVariant(page, variant) {
  const { slug, steps, waitFor } = variant;
  const targetPath = variant.targetPath || plan.targetPath;
  console.log(`\n── Variant: ${slug} ──`);

  const outDir    = path.join(__dirname, '..', 'snapshots', slug);
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

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

  // Rasterize <canvas> → <img> (canvas pixels aren't in outerHTML)
  await page.evaluate(() => {
    for (const c of document.querySelectorAll('canvas')) {
      try {
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
  });

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

  fs.writeFileSync(path.join(outDir, 'index.html'), '<!doctype html>\n' + rewritten);
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    sourceUrl: WP_URL + targetPath,
    capturedAt: new Date().toISOString(),
    assetCount: emittedCount,
    assetCountSkipped: skippedCount,
    variantSlug: slug,
  }, null, 2));

  console.log(`    ✓ wrote ${outDir} (${emittedCount} assets, ${skippedCount} unreferenced skipped)`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

  for (let i = 0; i < plan.variants.length; i++) {
    const variant = plan.variants[i];
    // Each variant may override targetPath. Falls back to plan.targetPath for
    // backward compatibility with single-page and original multi-variant plans.
    const target = variant.targetPath || plan.targetPath;
    console.log(`→ Navigating to ${target}`);
    await page.goto(WP_URL + target, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await captureVariant(page, variant);
  }

  await browser.close();
  console.log(`\n✓ Done. ${plan.variants.length} variant(s), ${assetBuffers.size} assets pooled.`);
  if (sanitizeReport.size) {
    const lines = [...sanitizeReport.entries()].map(([k, n]) => `  ${k}: ${n}`);
    console.log(`✓ Sanitized embedded secrets:\n${lines.join('\n')}`);
  } else {
    console.log('✓ Sanitizer: no embedded secrets found.');
  }
})().catch((e) => { console.error(e); process.exit(1); });
