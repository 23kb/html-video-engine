#!/usr/bin/env node
/**
 * dedup-snapshot-css.js — extract identical URL-clean <style> blocks across
 * snapshots into shared CSS files, replace inline <style> with <link>.
 *
 * Conservative: only extracts blocks that have NO url() references AND appear
 * in ≥2 snapshots. URL-dirty blocks stay inline (resolving relative paths
 * after a file move is its own pass).
 *
 * Usage:
 *   node tools/dedup-snapshot-css.js --dry-run                  # report only
 *   node tools/dedup-snapshot-css.js --slug <slug> [--slug <s>] # transform listed slugs
 *   node tools/dedup-snapshot-css.js --all                      # transform every snapshot
 *
 * Hash index covers ALL snapshots regardless of which are transformed, so
 * partial runs still produce correctly-shared CSS files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const SHARED_DIR = path.join(SNAPSHOTS_DIR, '_shared', 'css');
const MIN_SHARING = 2; // extract only if hash appears in ≥ this many snapshots
const STYLE_RE = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
}

function hasUrlRef(css) {
  // matches url(assets/...) url("assets/...) url(../...) etc.
  return /url\(\s*["']?(?:assets\/|\.\.\/)/i.test(css);
}

function listSnapshots() {
  return fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SNAPSHOTS_DIR, n, 'index.html')))
    .sort();
}

function buildIndex(slugs) {
  // hash -> { bytes, body, slugs:Set, dirty:boolean }
  const idx = new Map();
  for (const slug of slugs) {
    const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    let m;
    STYLE_RE.lastIndex = 0;
    while ((m = STYLE_RE.exec(html))) {
      const body = m[2];
      const hash = md5(body);
      if (!idx.has(hash)) {
        idx.set(hash, {
          bytes: Buffer.byteLength(body, 'utf8'),
          body,
          slugs: new Set(),
          dirty: hasUrlRef(body),
        });
      }
      idx.get(hash).slugs.add(slug);
    }
  }
  return idx;
}

function transformOne(slug, idx, opts) {
  const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  let extractedCount = 0;
  let extractedBytes = 0;
  let leftInlineCount = 0;
  let writtenShared = new Set();

  const out = html.replace(STYLE_RE, (full, attrs, body) => {
    const hash = md5(body);
    const entry = idx.get(hash);
    if (!entry) return full;
    const shareable = !entry.dirty && entry.slugs.size >= MIN_SHARING;
    if (!shareable) {
      leftInlineCount++;
      return full;
    }
    extractedCount++;
    extractedBytes += entry.bytes;
    writtenShared.add(hash);
    const href = `../_shared/css/${hash}.css`;
    // Preserve any data-origin / id attributes for traceability
    const preservedAttrs = (attrs || '')
      .match(/\b(data-origin|id|class|media)="[^"]*"/g)
      || [];
    const attrStr = preservedAttrs.length ? ' ' + preservedAttrs.join(' ') : '';
    return `<link rel="stylesheet" href="${href}"${attrStr}>`;
  });

  if (!opts.dryRun) {
    fs.writeFileSync(file, out, 'utf8');
    // Write shared CSS files (only those used by this transform)
    if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });
    for (const hash of writtenShared) {
      const sharedFile = path.join(SHARED_DIR, `${hash}.css`);
      if (!fs.existsSync(sharedFile)) {
        fs.writeFileSync(sharedFile, idx.get(hash).body, 'utf8');
      }
    }
  }

  const beforeBytes = Buffer.byteLength(html, 'utf8');
  const afterBytes = Buffer.byteLength(out, 'utf8');

  return {
    slug,
    extractedCount,
    extractedBytes,
    leftInlineCount,
    beforeBytes,
    afterBytes,
    sharedFiles: writtenShared.size,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const all = argv.includes('--all');
  const targetSlugs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) targetSlugs.push(argv[++i]);
  }
  if (!all && targetSlugs.length === 0) {
    console.error('Usage: dedup-snapshot-css.js --slug <slug> [--slug <s>] | --all  [--dry-run]');
    process.exit(1);
  }

  const allSlugs = listSnapshots();
  const slugs = all ? allSlugs : targetSlugs;

  // Validate
  for (const s of slugs) {
    if (!allSlugs.includes(s)) {
      console.error(`Unknown snapshot: ${s}`);
      process.exit(1);
    }
  }

  console.log('Building hash index across all snapshots...');
  const idx = buildIndex(allSlugs);

  const shareable = [...idx.entries()].filter(
    ([, v]) => !v.dirty && v.slugs.size >= MIN_SHARING,
  );
  const shareableBytes = shareable.reduce((a, [, v]) => a + v.bytes, 0);
  console.log(
    `Index: ${idx.size} unique hashes, ${shareable.length} shareable (${(shareableBytes / 1024).toFixed(1)} KB of unique CSS to extract).`,
  );
  console.log('');

  const results = [];
  for (const slug of slugs) {
    const r = transformOne(slug, idx, { dryRun });
    results.push(r);
    const dKB = ((r.beforeBytes - r.afterBytes) / 1024).toFixed(1);
    console.log(
      `${slug}: ${(r.beforeBytes / 1024).toFixed(1)} KB → ${(r.afterBytes / 1024).toFixed(1)} KB (Δ ${dKB} KB, extracted ${r.extractedCount} block(s), left inline ${r.leftInlineCount})`,
    );
  }

  const beforeT = results.reduce((a, r) => a + r.beforeBytes, 0);
  const afterT = results.reduce((a, r) => a + r.afterBytes, 0);
  console.log('');
  console.log(
    `Totals: ${(beforeT / 1024).toFixed(1)} KB → ${(afterT / 1024).toFixed(1)} KB (saved ${((beforeT - afterT) / 1024).toFixed(1)} KB)`,
  );
  if (dryRun) console.log('(dry run — no files written)');
}

main();
