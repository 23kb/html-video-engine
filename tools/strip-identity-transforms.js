#!/usr/bin/env node
// tools/strip-identity-transforms.js — remove IDENTITY transforms a capture
// froze into a snapshot (C5 / AP-12, 2026-09-02).
//
// Why: a captured identity transform (`transform: matrix(1, 0, 0, 1, 0, 0)`,
// `translate(0px, 0px)`, `scale(1)`, …) changes NOTHING visually but creates
// a stacking context — and sibling stacking contexts paint over dropdowns and
// popovers a beat later reveals (ee 6: `.wpforms-setting-row` identity
// transforms buried a z-100 export dropdown; as5 5 / qrd 6 are the same trap).
// The rulebook fix was a hand-written `transform: none !important` per
// incident; this strips the class at capture time instead.
//
// What it does:
//   1. TEXT pass — inside inline `style="…"` attributes only, every
//      `transform:` declaration whose value is PURELY identity (all
//      space-separated functions identity: matrix(1,0,0,1,0,0),
//      translate/X/Y/Z/3d of 0, scale/X/Y of 1, rotate(0), skew(0)) is
//      rewritten to `transform: none`. A real translate/scale is NEVER
//      touched; `none` is left alone (idempotent).
//   2. HEADLESS report — loads the stripped snapshot and counts elements
//      whose COMPUTED transform is still the identity matrix (those come
//      from captured stylesheet rules, which this tool deliberately does not
//      rewrite). They are reported with sample selectors so a session can add
//      a targeted `transform: none` in the snapshot head if one ever traps an
//      overlay (capture-gates G5b warns on that shape too).
//
// Wired into tools/post-capture.js (after dedup-snapshot-css) for NEW
// captures. Existing snapshots are NOT batch-re-run (protected fossils —
// run one-off per slug only when a build actually hits the trap).
//
// Usage:
//   node tools/strip-identity-transforms.js --slug <slug> [--dry-run] [--no-verify] [--port 4321]
//
// Exit: 0 ok · 1 failure · 2 usage.

const fs = require('fs');
const path = require('path');

const { snapshotDir, snapshotUrlPath } = require('./lib/paths');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, dryRun: false, verify: true, port: Number(process.env.PORT) || 4321 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--slug') out.slug = a[++i];
    else if (a[i] === '--dry-run') out.dryRun = true;
    else if (a[i] === '--no-verify') out.verify = false;
    else if (a[i] === '--port') out.port = Number(a[++i]);
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

// Is a single transform FUNCTION textually identity?
const IDENT_FN_RE = new RegExp(
  '^(?:' +
  'matrix\\(\\s*1\\s*,\\s*0\\s*,\\s*0\\s*,\\s*1\\s*,\\s*0(?:px)?\\s*,\\s*0(?:px)?\\s*\\)' +
  '|matrix3d\\(\\s*1\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*1\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*1\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*1\\s*\\)' +
  '|translate\\(\\s*0(?:px|%)?\\s*(?:,\\s*0(?:px|%)?\\s*)?\\)' +
  '|translate[XYZ]\\(\\s*0(?:px|%)?\\s*\\)' +
  '|translate3d\\(\\s*0(?:px|%)?\\s*,\\s*0(?:px|%)?\\s*,\\s*0(?:px)?\\s*\\)' +
  '|scale\\(\\s*1\\s*(?:,\\s*1\\s*)?\\)' +
  '|scale[XYZ]\\(\\s*1\\s*\\)' +
  '|rotate[XYZ]?\\(\\s*0(?:deg|rad|turn)?\\s*\\)' +
  '|skew[XY]?\\(\\s*0(?:deg)?\\s*(?:,\\s*0(?:deg)?\\s*)?\\)' +
  ')$', 'i'
);

// Split a transform value into function tokens (parens-aware, space-separated).
function transformFns(value) {
  const fns = value.match(/[a-zA-Z0-9]+\([^)]*\)/g);
  return fns || [];
}

function isIdentityValue(value) {
  const v = value.trim();
  if (!v || /^none$/i.test(v)) return false; // none: nothing to strip
  const fns = transformFns(v);
  if (!fns.length) return false;
  // Every function identity AND nothing outside the functions but whitespace.
  const residue = fns.reduce((s, f) => s.replace(f, ''), v).trim();
  if (residue) return false;
  return fns.every((f) => IDENT_FN_RE.test(f.trim()));
}

// Rewrite identity `transform:` declarations inside inline style attributes.
function stripInline(html) {
  let count = 0;
  const out = html.replace(/style\s*=\s*("([^"]*)"|'([^']*)')/gi, (whole, quoted, dq, sq) => {
    const q = quoted[0];
    const css = dq != null ? dq : sq;
    if (!/transform/i.test(css)) return whole;
    const replaced = css.replace(/(^|;)(\s*)(-webkit-transform|transform)(\s*:\s*)([^;]+)/gi,
      (m, pre, sp, prop, colon, value) => {
        if (!isIdentityValue(value)) return m;
        count++;
        return `${pre}${sp}${prop}${colon}none`;
      });
    if (replaced === css) return whole;
    return `style=${q}${replaced}${q}`;
  });
  return { out, count };
}

async function verifyRemaining(slug, port) {
  const { chromium } = require('playwright');
  const { ensureServer } = require('./generate-snapshot-outline.js');
  const server = await ensureServer(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(`http://localhost:${port}${snapshotUrlPath(slug)}`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(400);
    return await page.evaluate(() => {
      const left = [];
      for (const el of document.querySelectorAll('*')) {
        if (getComputedStyle(el).transform === 'matrix(1, 0, 0, 1, 0, 0)') {
          const id = el.id ? '#' + el.id
            : el.className && String(el.className).trim() ? '.' + String(el.className).trim().split(/\s+/)[0]
            : el.tagName.toLowerCase();
          left.push(id);
        }
      }
      const counts = {};
      for (const id of left) counts[id] = (counts[id] || 0) + 1;
      return { total: left.length, sample: Object.entries(counts).slice(0, 6).map(([k, n]) => `${k}×${n}`) };
    });
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/strip-identity-transforms.js --slug <slug> [--dry-run] [--no-verify]');
    process.exit(2);
  }
  const file = path.join(snapshotDir(args.slug), 'index.html');
  if (!fs.existsSync(file)) {
    console.error(`✗ not found: snapshots/${args.slug}/index.html`);
    process.exit(1);
  }
  const html = fs.readFileSync(file, 'utf8');
  const { out, count } = stripInline(html);
  if (count && !args.dryRun) fs.writeFileSync(file, out);
  console.log(`[strip-identity] ${args.slug}: ${count} inline identity transform(s) ${args.dryRun ? 'found (dry-run)' : count ? 'stripped → transform: none' : 'found — nothing to do'}`);

  if (args.verify) {
    try {
      const left = await verifyRemaining(args.slug, args.port);
      if (left.total) {
        console.log(`[strip-identity] ${left.total} element(s) still compute the identity matrix (stylesheet-driven; inline pass can't reach them): ${left.sample.join(', ')}`);
        console.log('[strip-identity] if one of these ever traps an overlay (G5b warns), add a targeted `transform: none` in the snapshot head.');
      } else {
        console.log('[strip-identity] no computed identity transforms remain');
      }
    } catch (e) {
      console.log(`[strip-identity] headless verify skipped: ${e.message}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
