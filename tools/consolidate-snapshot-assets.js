#!/usr/bin/env node
/**
 * consolidate-snapshot-assets.js — deduplicate snapshots/<slug>/assets/
 * across all snapshots into snapshots/_shared/assets/<contenthash>.<ext>.
 *
 * Rewrites every reference to `assets/<file>` inside index.html (both CSS
 * url() and HTML attributes — src, href, srcset) to point to the new
 * shared location.
 *
 * After this runs, the URL-dirty <style> blocks that referenced
 * `url(assets/...)` become URL-portable, so re-running dedup-snapshot-css.js
 * will extract more of them.
 *
 * Usage:
 *   node tools/consolidate-snapshot-assets.js --dry-run
 *   node tools/consolidate-snapshot-assets.js --slug <slug> [--slug <s>]
 *   node tools/consolidate-snapshot-assets.js --all
 *   node tools/consolidate-snapshot-assets.js --all --purge   # also delete original assets/ dirs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const SHARED_ASSETS_DIR = path.join(SNAPSHOTS_DIR, '_shared', 'assets');

function md5File(filePath) {
  const data = fs.readFileSync(filePath);
  return { hash: crypto.createHash('md5').update(data).digest('hex').slice(0, 12), data };
}

function listSnapshots() {
  return fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SNAPSHOTS_DIR, n, 'index.html')))
    .sort();
}

function buildMap(slugs, dryRun) {
  // For each slug: filename -> { newRelPath, hash }
  const slugMap = new Map();
  const writtenHashes = new Set();
  let totalBytesOriginal = 0;
  let uniqueBytes = 0;

  if (!dryRun && !fs.existsSync(SHARED_ASSETS_DIR)) {
    fs.mkdirSync(SHARED_ASSETS_DIR, { recursive: true });
  }

  for (const slug of slugs) {
    const assetsDir = path.join(SNAPSHOTS_DIR, slug, 'assets');
    if (!fs.existsSync(assetsDir)) continue;
    const map = new Map();
    for (const f of fs.readdirSync(assetsDir)) {
      const src = path.join(assetsDir, f);
      const stat = fs.statSync(src);
      if (!stat.isFile()) continue;
      const ext = path.extname(f).slice(1) || 'bin';
      const { hash, data } = md5File(src);
      totalBytesOriginal += data.length;
      const sharedName = `${hash}.${ext}`;
      const dest = path.join(SHARED_ASSETS_DIR, sharedName);
      if (!writtenHashes.has(hash)) {
        if (!dryRun && !fs.existsSync(dest)) {
          fs.writeFileSync(dest, data);
        }
        writtenHashes.add(hash);
        uniqueBytes += data.length;
      }
      map.set(f, { sharedName, hash });
    }
    slugMap.set(slug, map);
  }

  return { slugMap, totalBytesOriginal, uniqueBytes, uniqueFiles: writtenHashes.size };
}

function rewriteHtml(slug, slugMap, dryRun) {
  const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
  if (!fs.existsSync(file)) return null;
  const map = slugMap.get(slug);
  if (!map || map.size === 0) return null;

  const original = fs.readFileSync(file, 'utf8');
  const beforeBytes = Buffer.byteLength(original, 'utf8');
  let rewrites = 0;

  // Build a regex that matches any of the asset filenames preceded by `assets/`.
  // We anchor on `assets/<filename>` to avoid accidental matches.
  // Filenames in the captures are content-hashed (e.g. `039dc55aa7.png`), so
  // they're unambiguous.
  const names = [...map.keys()].sort((a, b) => b.length - a.length); // longest first
  if (names.length === 0) return null;
  const re = new RegExp(
    'assets\\/(' + names.map((n) => n.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
    'g',
  );

  const out = original.replace(re, (_full, name) => {
    const entry = map.get(name);
    if (!entry) return _full;
    rewrites++;
    return `../_shared/assets/${entry.sharedName}`;
  });

  if (!dryRun && rewrites > 0) {
    fs.writeFileSync(file, out, 'utf8');
  }
  return { slug, rewrites, beforeBytes, afterBytes: Buffer.byteLength(out, 'utf8') };
}

function purgeAssets(slugs, dryRun) {
  let purged = 0;
  let bytesFreed = 0;
  for (const slug of slugs) {
    const assetsDir = path.join(SNAPSHOTS_DIR, slug, 'assets');
    if (!fs.existsSync(assetsDir)) continue;
    // compute total bytes
    for (const f of fs.readdirSync(assetsDir)) {
      const p = path.join(assetsDir, f);
      try {
        bytesFreed += fs.statSync(p).size;
      } catch (_) {
        // ignore
      }
    }
    if (!dryRun) fs.rmSync(assetsDir, { recursive: true, force: true });
    purged++;
  }
  return { purged, bytesFreed };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const all = argv.includes('--all');
  const purge = argv.includes('--purge');
  const slugs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) slugs.push(argv[++i]);
  }

  if (!all && slugs.length === 0) {
    console.error('Usage: consolidate-snapshot-assets.js --slug <slug> [--slug <s>] | --all  [--dry-run] [--purge]');
    process.exit(1);
  }

  const targetSlugs = all ? listSnapshots() : slugs;

  console.log('Hashing assets across all targeted snapshots...');
  const { slugMap, totalBytesOriginal, uniqueBytes, uniqueFiles } = buildMap(targetSlugs, dryRun);
  console.log(
    `  Total asset bytes in originals: ${(totalBytesOriginal / 1024 / 1024).toFixed(1)} MB`,
  );
  console.log(`  Unique files after dedup: ${uniqueFiles} (${(uniqueBytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(
    `  Dedup savings: ${((totalBytesOriginal - uniqueBytes) / 1024 / 1024).toFixed(1)} MB (will live in _shared/assets/)`,
  );
  console.log('');

  let totalRewrites = 0;
  for (const slug of targetSlugs) {
    const r = rewriteHtml(slug, slugMap, dryRun);
    if (!r) continue;
    totalRewrites += r.rewrites;
    if (r.rewrites > 0) {
      console.log(`${slug}: ${r.rewrites} reference(s) rewritten in index.html`);
    }
  }
  console.log('');
  console.log(`Total references rewritten: ${totalRewrites}`);

  if (purge) {
    console.log('');
    console.log('Purging original snapshots/<slug>/assets/ directories...');
    const p = purgeAssets(targetSlugs, dryRun);
    console.log(`  Purged ${p.purged} dirs, freed ${(p.bytesFreed / 1024 / 1024).toFixed(1)} MB`);
  } else {
    console.log('');
    console.log('(Original assets/ dirs left intact. Pass --purge to delete after verification.)');
  }

  if (dryRun) console.log('(dry run — no files written)');
}

main();
