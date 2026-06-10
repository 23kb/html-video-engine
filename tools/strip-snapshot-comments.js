#!/usr/bin/env node
// strip-snapshot-comments.js — remove HTML comments from snapshot index.html
// files. Comments-only: same regex as trim-snapshot-bloat.js (IE conditional
// comments `<!--[if ...]-->` are preserved), but safe to run on EVERY
// snapshot — unlike trim-snapshot-bloat, which also deletes provider panels
// and is fields-view-only.
//
// Usage:
//   node tools/strip-snapshot-comments.js --all [--dry-run]
//   node tools/strip-snapshot-comments.js <slug> [<slug2> ...] [--dry-run]

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const COMMENT_RE = /<!--(?!\[if )[\s\S]*?-->/g;

function listSnapshots() {
  return fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SNAPSHOTS_DIR, n, 'index.html')))
    .sort();
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const all = argv.includes('--all');
  const slugs = all ? listSnapshots() : argv.filter((a) => !a.startsWith('--'));
  if (slugs.length === 0) {
    console.error('Usage: strip-snapshot-comments.js --all | <slug> [...] [--dry-run]');
    process.exit(1);
  }

  let totalBytes = 0;
  let totalCount = 0;
  for (const slug of slugs) {
    const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    let bytes = 0;
    let count = 0;
    const out = html.replace(COMMENT_RE, (m) => {
      bytes += m.length;
      count++;
      return '';
    });
    if (count > 0 && !dryRun) fs.writeFileSync(file, out, 'utf8');
    if (count > 0) console.log(`${slug}: ${count} comment(s), ${(bytes / 1024).toFixed(1)} KB`);
    totalBytes += bytes;
    totalCount += count;
  }
  console.log('');
  console.log(`Total: ${totalCount} comment(s), ${(totalBytes / 1024).toFixed(1)} KB across ${slugs.length} snapshot(s)`);
  if (dryRun) console.log('(dry run — no files written)');
}

main();
