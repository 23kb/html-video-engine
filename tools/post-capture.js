#!/usr/bin/env node
// post-capture.js — one-command lean-snapshot pipeline for NEW captures.
//
// Decision 2026-06-10: every new capture runs through this immediately so
// snapshots are born lean (existing snapshots were batch-optimized the same
// day; field-level trims are new-captures-only).
//
// Runs, per slug, in order:
//   1. trim-snapshot-fields.js      — only with --keep-fields; removes
//      canvas .wpforms-field elements not in the keep list (no relabeling)
//   2. trim-builder-markup.js       — builder-* slugs only; dead admin
//      chrome, off-canvas option panels, settings/provider panels
//   3. strip-snapshot-comments.js   — HTML comments (IE conditionals kept)
//   3b. neutralize-payment-iframes.js — blank third-party payment/hosted-field
//      iframe srcs (Stripe/PayPal/Braintree/hCaptcha) so the snapshot loads
//      clean: no 404s on mangled _shared/assets paths, no sandboxed-script
//      console errors (they're never drivable/needed in a video)
//   4. dedup-snapshot-css.js        — shared <style> blocks → linked
//      snapshots/_shared/css/<hash>.css
//   5. link-interactivity-script.js — inject snapshots/_shared/interactivity.js
//      BEFORE the outline runs, so the sidecar sees the real drivable
//      transitions instead of "interactivity.js is not linked" (idempotent)
//   6. generate-snapshot-catalog.js — regenerate catalog.md
//   7. generate-snapshot-outline.js — regenerate outline.md (the SIDECAR:
//      compact selector outline + interactivity manifest; headless Playwright)
//   8. index.json registration      — append the slug to snapshots/index.json
//      (sourcePath from meta.json; shows/topics from flags or TODO-describe
//      placeholders) so list-snapshots.js sees it with zero manual steps.
//      Idempotent: an already-registered slug is left alone unless the
//      describe flags are passed.
//
// After it finishes, re-validate videos that use the snapshot:
//   node tools/validate-video.js --all
//
// Usage:
//   node tools/post-capture.js <slug> [<slug2> ...] [--keep-fields 1,2,3]
//   node tools/post-capture.js <slug> --shows "..." --topics a,b [--category admin/page]
//   (--keep-fields applies to every listed slug; the describe flags require
//    a single slug)

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
const SNAPSHOTS_DIR = path.join(TOOLS, '..', 'snapshots');

function run(tool, args) {
  console.log(`\n── ${tool} ${args.join(' ')}`);
  execFileSync(process.execPath, [path.join(TOOLS, tool), ...args], {
    stdio: 'inherit',
  });
}

// ── index.json auto-registration ─────────────────────────────────────────
const INDEX_PATH = path.join(SNAPSHOTS_DIR, 'index.json');

function deriveCategory(slug) {
  if (slug.startsWith('admin-')) return 'admin/page';
  if (slug.startsWith('builder-')) return 'builder/panel';
  if (slug.startsWith('frontend-')) return 'frontend';
  return 'uncategorized';
}

function sourcePathFor(slug) {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, slug, 'meta.json'), 'utf8'));
    const u = new URL(meta.sourceUrl);
    return u.pathname + u.search;
  } catch (_) { return null; }
}

function registerInIndex(slug, { shows, topics, category }) {
  if (slug.startsWith('_')) {
    console.log(`   index.json: ${slug} not registered (_-prefixed = temp/infra convention)`);
    return;
  }
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const existing = idx.snapshots.find((s) => s.slug === slug);
  if (existing) {
    if (!shows && !topics && !category) {
      console.log(`   index.json: ${slug} already registered — left alone`);
      return;
    }
    if (shows) existing.shows = shows;
    if (topics) existing.topics = topics;
    if (category) existing.category = category;
    console.log(`   index.json: ${slug} updated from flags`);
  } else {
    const entry = {
      slug,
      category: category || deriveCategory(slug),
      shows: shows || `TODO-describe: ${slug.replace(/-/g, ' ')}`,
      topics: topics || slug.split('-').filter((w) => w.length > 2),
      sourcePath: sourcePathFor(slug) || 'TODO-describe: source path unknown (no meta.json)',
    };
    const at = idx.snapshots.findIndex((s) => s.slug > slug);
    idx.snapshots.splice(at === -1 ? idx.snapshots.length : at, 0, entry);
    console.log(`   index.json: ${slug} registered (${entry.shows.startsWith('TODO') ? 'TODO-describe placeholder — refine with --shows/--topics' : 'described'})`);
  }
  idx.count = idx.snapshots.length;
  idx.generatedAt = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 1) + '\n', 'utf8');
}

function main() {
  const argv = process.argv.slice(2);
  const slugs = [];
  let keepFields = null;
  let shows = null;
  let topics = null;
  let category = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keep-fields' && argv[i + 1]) keepFields = argv[++i];
    else if (argv[i] === '--shows' && argv[i + 1]) shows = argv[++i];
    else if (argv[i] === '--topics' && argv[i + 1]) topics = argv[++i].split(',').map((t) => t.trim()).filter(Boolean);
    else if (argv[i] === '--category' && argv[i + 1]) category = argv[++i];
    else slugs.push(argv[i]);
  }
  if ((shows || topics || category) && slugs.length > 1) {
    console.error('--shows/--topics/--category describe ONE snapshot — pass a single slug with them');
    process.exit(1);
  }
  if (slugs.length === 0) {
    console.error('Usage: post-capture.js <slug> [<slug2> ...] [--keep-fields 1,2,3]');
    process.exit(1);
  }
  for (const slug of slugs) {
    if (!fs.existsSync(path.join(SNAPSHOTS_DIR, slug, 'index.html'))) {
      console.error(`Unknown snapshot: ${slug}`);
      process.exit(1);
    }
  }

  for (const slug of slugs) {
    console.log(`\n═══ post-capture: ${slug} ═══`);
    if (keepFields) run('trim-snapshot-fields.js', [slug, keepFields]);
    if (slug.startsWith('builder-')) run('trim-builder-markup.js', ['--slug', slug]);
    run('strip-snapshot-comments.js', [slug]);
    run('neutralize-payment-iframes.js', ['--slug', slug]);
    run('dedup-snapshot-css.js', ['--slug', slug]);
    // Link BEFORE the outline runs — an unlinked snapshot's outline is born
    // saying "interactivity.js is not linked — no in-page transitions"
    // (top-ranked SendGrid dev-fix; re-hit on all 5 FA captures).
    run('link-interactivity-script.js', ['--slug', slug]);
    run('generate-snapshot-catalog.js', [slug]);
    run('generate-snapshot-outline.js', [slug]);
    registerInIndex(slug, { shows, topics, category });
  }

  console.log('\nDone. If any existing video uses these snapshots, run:');
  console.log('  node tools/validate-video.js --all');
}

main();
