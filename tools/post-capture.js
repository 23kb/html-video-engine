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
//   4. dedup-snapshot-css.js        — shared <style> blocks → linked
//      snapshots/_shared/css/<hash>.css
//   5. generate-snapshot-catalog.js — regenerate catalog.md
//
// After it finishes, re-validate videos that use the snapshot:
//   node tools/validate-video.js --all
//
// Usage:
//   node tools/post-capture.js <slug> [<slug2> ...] [--keep-fields 1,2,3]
//   (--keep-fields applies to every listed slug)

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

function main() {
  const argv = process.argv.slice(2);
  const slugs = [];
  let keepFields = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keep-fields' && argv[i + 1]) keepFields = argv[++i];
    else slugs.push(argv[i]);
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
    run('dedup-snapshot-css.js', ['--slug', slug]);
    run('generate-snapshot-catalog.js', [slug]);
  }

  console.log('\nDone. If any existing video uses these snapshots, run:');
  console.log('  node tools/validate-video.js --all');
}

main();
