#!/usr/bin/env node
/**
 * link-interactivity-script.js — idempotently inject
 *   <script src="../_shared/interactivity.js"></script>
 * before </body> in every targeted snapshot's index.html, plus
 *   <script src="../_shared/frontend.js"></script>
 * for frontend captures (a published form, no builder root, no admin chrome).
 *
 * Usage:
 *   node tools/link-interactivity-script.js --dry-run                # report only
 *   node tools/link-interactivity-script.js --pattern builder-field-options-*  # default
 *   node tools/link-interactivity-script.js --slug <slug> [--slug <s>]
 *   node tools/link-interactivity-script.js --all-builder            # all builder-* snapshots
 *
 * Idempotent: skips files that already reference interactivity.js.
 * Fails loudly if a target file has no </body> tag.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const SCRIPT_TAG = '<script src="../_shared/interactivity.js"></script>';
const NEEDLE = 'interactivity.js';
const FRONTEND_TAG = '<script src="../_shared/frontend.js"></script>';
const FRONTEND_NEEDLE = '_shared/frontend.js';

// A frontend capture needs frontend.js too. Nothing used to inject it — the
// docs claimed it was "auto-loaded" and it never was, so every frontend
// snapshot captured after frontend-published-form shipped silently inert:
// handlers registered, nothing running, markup looking perfect (rf 11).
//
// Discriminator, measured across frontend / builder / admin captures: an
// element whose class list carries the exact token `wpforms-form` (the
// rendered form), with no builder root and no WP admin chrome. Substring
// matching is not enough — builder canvases carry `wpforms-form-name` and
// admin lists carry `wpforms-form-search-box`.
function isFrontendCapture(html) {
  if (html.includes('id="wpforms-builder"')) return false;
  if (/id="(adminmenumain|wpcontent|wpwrap)"/.test(html)) return false;
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    if (m[1].split(/\s+/).includes('wpforms-form')) return true;
  }
  return false;
}

function parseArgs(argv) {
  const args = { dryRun: false, slugs: [], pattern: null, allBuilder: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--slug') args.slugs.push(argv[++i]);
    else if (a === '--pattern') args.pattern = argv[++i];
    else if (a === '--all-builder') args.allBuilder = true;
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!args.slugs.length && !args.pattern && !args.allBuilder) {
    args.pattern = 'builder-field-options-*';
  }
  return args;
}

function resolveSlugs(args) {
  if (args.slugs.length) return args.slugs;
  const all = fs.readdirSync(SNAPSHOTS_DIR).filter((n) => {
    if (n.startsWith('_')) return false;
    return fs.statSync(path.join(SNAPSHOTS_DIR, n)).isDirectory();
  });
  if (args.allBuilder) return all.filter((n) => n.startsWith('builder-'));
  const re = new RegExp('^' + args.pattern.replace(/\*/g, '.*') + '$');
  return all.filter((n) => re.test(n));
}

function processSlug(slug, dryRun) {
  const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
  if (!fs.existsSync(file)) return { slug, status: 'missing' };
  const html = fs.readFileSync(file, 'utf8');

  const tags = [];
  if (!html.includes(NEEDLE)) tags.push(SCRIPT_TAG);
  if (isFrontendCapture(html) && !html.includes(FRONTEND_NEEDLE)) tags.push(FRONTEND_TAG);
  if (!tags.length) return { slug, status: 'already-linked' };

  const idx = html.lastIndexOf('</body>');
  if (idx === -1) return { slug, status: 'no-body-close' };
  const what = tags.length === 2 ? 'both' : tags[0] === FRONTEND_TAG ? 'frontend.js' : 'interactivity.js';
  if (dryRun) return { slug, status: `would-inject:${what}` };
  const next = html.slice(0, idx) + tags.join('') + html.slice(idx);
  fs.writeFileSync(file, next, 'utf8');
  return { slug, status: `injected:${what}` };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slugs = resolveSlugs(args);
  if (!slugs.length) {
    console.error('No snapshots matched.');
    process.exit(1);
  }
  const counts = {};
  const results = slugs.map((s) => processSlug(s, args.dryRun));
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    const tag = args.dryRun ? '[dry-run]' : '';
    console.log(`${tag} ${r.status.padEnd(16)} ${r.slug}`);
  }
  console.log('');
  console.log('Summary:', counts);
  const fails = results.filter((r) => r.status === 'no-body-close' || r.status === 'missing');
  if (fails.length) process.exit(1);
}

main();
