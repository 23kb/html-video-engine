#!/usr/bin/env node
// capture-saas.js — post-download half of the sanctioned SaaS-capture recipe (FIX-11).
//
// Third-party AUTHENTICATED dashboards (SendGrid, Klaviyo, …) can't go through
// capture/capture.js (WP-login only), and every ad-hoc network channel out of
// an authenticated page correctly trips the exfil guard. The working recipe
// (SendGrid R3, 2026-07-03):
//
//   1. IN THE BROWSER (human/agent-in-browser BY DESIGN — that's the
//      guard-compliant shape): paste the serializer snippet from
//      capture/capture-library.md §9 into the authenticated tab. It clones the
//      DOM, freezes input state, redacts secrets in the CLONE, inlines
//      same-origin CSS, strips scripts, and triggers a normal browser
//      DOWNLOAD (lands in ~/Downloads — local disk, no off-page channel).
//   2. THIS TOOL: moves the download into snapshots/<slug>/, inlines the
//      remaining CROSS-ORIGIN stylesheets (CDN design systems like tiara.css
//      are CORS-unreadable in-page) + their fonts/images as data URIs,
//      re-runs the secret redaction, then runs post-capture.js.
//
// Usage:
//   node tools/capture-saas.js <slug> [--from-download <file>]   (default: newest .html in ~/Downloads)
//                              [--redact <regex>] [--no-post-capture]
//
// Exit: 0 ok · 1 failure · 3 usage.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SNAP_ROOT = process.env.WP_SNAPSHOT_ROOT || path.join(ROOT, 'snapshots');

// Same catalog as capture/capture.js's sanitizer (kept in sync by the FIX-11 test).
const SECRET_PATTERNS = [
  { name: 'google-api', re: /AIza[0-9A-Za-z_\-]{35}/g },
  { name: 'stripe-pk', re: /pk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-sk', re: /sk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-rk', re: /rk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-whsec', re: /whsec_[A-Za-z0-9]{20,}/g },
  { name: 'aws-akia', re: /AKIA[A-Z0-9]{16}/g },
  { name: 'github-token', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'sendgrid-key', re: /SG\.[A-Za-z0-9_\-.]{20,}/g },
];

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, from: null, redact: [], postCapture: true };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--from-download') out.from = a[++i];
    else if (a[i] === '--redact') out.redact.push(new RegExp(a[++i], 'g'));
    else if (a[i] === '--no-post-capture') out.postCapture = false;
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

function newestDownload() {
  const dir = path.join(os.homedir(), 'Downloads');
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? files[0].f : null;
}

async function fetchBuf(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function mimeFor(url) {
  const ext = url.split(/[?#]/)[0].split('.').pop().toLowerCase();
  return {
    woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', eot: 'application/vnd.ms-fontobject',
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  }[ext] || 'application/octet-stream';
}

// Inline url(...) refs inside fetched CSS as data URIs (fonts, icons).
async function inlineCssAssets(css, baseHref) {
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]))]
    .filter((u) => !u.startsWith('data:'));
  for (const u of urls) {
    let abs;
    try { abs = new URL(u, baseHref).toString(); } catch { continue; }
    try {
      const buf = await fetchBuf(abs);
      const dataUri = `data:${mimeFor(abs)};base64,${buf.toString('base64')}`;
      css = css.split(u).join(dataUri);
      console.log(`    inlined asset ${abs.slice(0, 90)} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.warn(`    ⚠ asset fetch failed ${abs.slice(0, 90)} — ${e.message}`);
    }
  }
  return css;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/capture-saas.js <slug> [--from-download <file>] [--redact <regex>] [--no-post-capture]');
    process.exit(3);
  }
  const src = args.from ? path.resolve(args.from) : newestDownload();
  if (!src || !fs.existsSync(src)) {
    console.error(`✗ downloaded HTML not found${args.from ? `: ${args.from}` : ' (no .html in ~/Downloads)'} — run the serializer snippet first (capture/capture-library.md §9)`);
    process.exit(1);
  }
  console.log(`[capture-saas] source: ${src}`);
  let html = fs.readFileSync(src, 'utf8');

  // Inline remaining cross-origin stylesheet <link>s (CORS-unreadable in-page).
  const links = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
    .map((m) => ({ tag: m[0], href: (m[0].match(/href=["']([^"']+)["']/) || [])[1] }))
    .filter((l) => l.href && /^https?:\/\//.test(l.href));
  for (const l of links) {
    try {
      let css = (await fetchBuf(l.href)).toString('utf8');
      css = await inlineCssAssets(css, l.href);
      html = html.replace(l.tag, `<style data-origin="${l.href}">\n${css}\n</style>`);
      console.log(`  ✓ inlined stylesheet ${l.href.slice(0, 90)}`);
    } catch (e) {
      console.warn(`  ⚠ stylesheet fetch failed ${l.href.slice(0, 90)} — ${e.message} (left as <link>; snapshot may render wrong offline)`);
    }
  }

  // Redaction pass (defense-in-depth — the in-page snippet already redacted).
  let redactions = 0;
  for (const { name, re } of SECRET_PATTERNS) {
    const n = (html.match(re) || []).length;
    if (n) { html = html.replace(re, 'REDACTED_KEY'); redactions += n; console.log(`  ✓ redacted ${n} × ${name}`); }
  }
  for (const re of args.redact) {
    const n = (html.match(re) || []).length;
    if (n) { html = html.replace(re, 'REDACTED_KEY'); redactions += n; console.log(`  ✓ redacted ${n} × --redact pattern`); }
  }

  if (!/<meta[^>]+charset/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + '<meta charset="utf-8">');

  const outDir = path.join(SNAP_ROOT, args.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    sourceUrl: (html.match(/data-origin=["'](https?:\/\/[^/"']+)/) || [, 'saas-download'])[1],
    capturedAt: new Date().toISOString(),
    capturedVia: 'capture-saas (SingleFile-download recipe)',
    downloadFile: path.basename(src),
    redactions,
    variantSlug: args.slug,
  }, null, 2));
  console.log(`  ✓ wrote ${path.relative(ROOT, outDir)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${redactions} redaction(s))`);

  if (args.postCapture && !process.env.WP_SNAPSHOT_ROOT) {
    console.log('[capture-saas] running post-capture…');
    execFileSync(process.execPath, [path.join(__dirname, 'post-capture.js'), args.slug], { stdio: 'inherit' });
  } else if (!args.postCapture) {
    console.log('[capture-saas] post-capture skipped (--no-post-capture)');
  } else {
    console.log('[capture-saas] post-capture skipped (WP_SNAPSHOT_ROOT override active)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
