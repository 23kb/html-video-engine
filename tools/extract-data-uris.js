#!/usr/bin/env node
/**
 * extract-data-uris.js — pull large base64 data: URIs out of snapshot HTML
 * (and shared CSS) into _shared/data-uris/<hash>.<ext>, replacing the URI
 * with a relative file URL.
 *
 * Only extracts base64-encoded URIs ≥ MIN_BYTES (default 2 KB). URL-encoded
 * URIs (typical for inline SVG) are left alone — they're small and decoding
 * adds risk.
 *
 * Usage:
 *   node tools/extract-data-uris.js --slug <slug> [--slug <s>] [--dry-run]
 *   node tools/extract-data-uris.js --all [--dry-run]
 *   node tools/extract-data-uris.js --min-bytes 1024 --all
 *
 * Targets: every <slug>/index.html and every snapshots/_shared/css/*.css.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const SHARED_DIR = path.join(SNAPSHOTS_DIR, '_shared');
const DATA_URIS_DIR = path.join(SHARED_DIR, 'data-uris');
const SHARED_CSS_DIR = path.join(SHARED_DIR, 'css');

const MIME_TO_EXT = {
  'application/font-woff2': 'woff2',
  'application/font-woff': 'woff',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'application/x-font-woff': 'woff',
  'application/font-ttf': 'ttf',
  'font/ttf': 'ttf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  // SVG is intentionally not in this list — usually small + often URL-encoded
};

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
}

function listSnapshots() {
  return fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SNAPSHOTS_DIR, n, 'index.html')))
    .sort();
}

/**
 * Process a file: return { content, extracted, extractedBytes, originalBytes,
 * writtenFiles }. `relPrefix` is the relative path from this file's location
 * to the data-uris dir.
 */
function processFile(filePath, relPrefix, minBytes, dryRun, registry) {
  const original = fs.readFileSync(filePath, 'utf8');
  const originalBytes = Buffer.byteLength(original, 'utf8');
  let extracted = 0;
  let extractedBytes = 0;
  const writtenFiles = new Set();

  // Match data: URIs that are BASE64-encoded and large enough.
  // Capture quote/paren context so we can put the path back without mangling.
  // Allowed terminators: " ' ) whitespace
  const re = /data:([a-zA-Z0-9+./-]+);base64,([A-Za-z0-9+/=]+)/g;

  const out = original.replace(re, (full, mime, b64) => {
    const byteLen = full.length;
    if (byteLen < minBytes) return full;
    const ext = MIME_TO_EXT[mime.toLowerCase()];
    if (!ext) return full; // unknown mime type — leave inline

    const hash = md5(full);
    const fileName = `${hash}.${ext}`;
    const dest = path.join(DATA_URIS_DIR, fileName);

    if (!registry.has(hash)) {
      registry.set(hash, { mime, ext, b64, written: false });
    }
    const entry = registry.get(hash);
    if (!dryRun && !entry.written) {
      if (!fs.existsSync(DATA_URIS_DIR)) fs.mkdirSync(DATA_URIS_DIR, { recursive: true });
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
      }
      entry.written = true;
    }
    writtenFiles.add(hash);
    extracted++;
    extractedBytes += byteLen;
    return `${relPrefix}/${fileName}`;
  });

  if (!dryRun && extracted > 0) {
    fs.writeFileSync(filePath, out, 'utf8');
  }

  const finalBytes = Buffer.byteLength(out, 'utf8');
  return { extracted, extractedBytes, originalBytes, finalBytes, uniqueWritten: writtenFiles.size };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const all = argv.includes('--all');
  const minBytesIdx = argv.indexOf('--min-bytes');
  const minBytes = minBytesIdx >= 0 ? parseInt(argv[minBytesIdx + 1], 10) : 2048;
  const slugs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) slugs.push(argv[++i]);
  }

  if (!all && slugs.length === 0) {
    console.error('Usage: extract-data-uris.js --slug <slug> [--slug <s>] | --all  [--dry-run] [--min-bytes N]');
    process.exit(1);
  }

  const targetSlugs = all ? listSnapshots() : slugs;
  const registry = new Map(); // hash -> {written:bool}
  const results = [];

  // 1. Snapshot HTML files
  for (const slug of targetSlugs) {
    const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
    if (!fs.existsSync(file)) continue;
    const r = processFile(file, '../_shared/data-uris', minBytes, dryRun, registry);
    results.push({ kind: 'html', label: slug, ...r });
  }

  // 2. Shared CSS files (only when --all, to avoid breaking sharing)
  if (all && fs.existsSync(SHARED_CSS_DIR)) {
    for (const f of fs.readdirSync(SHARED_CSS_DIR)) {
      if (!f.endsWith('.css')) continue;
      const r = processFile(path.join(SHARED_CSS_DIR, f), '../data-uris', minBytes, dryRun, registry);
      if (r.extracted > 0) results.push({ kind: 'css', label: `_shared/css/${f}`, ...r });
    }
  }

  // Report
  results
    .filter((r) => r.extracted > 0)
    .sort((a, b) => b.extractedBytes - a.extractedBytes)
    .forEach((r) => {
      const d = ((r.originalBytes - r.finalBytes) / 1024).toFixed(1);
      console.log(
        `[${r.kind}] ${r.label}: ${(r.originalBytes / 1024).toFixed(1)} KB → ${(r.finalBytes / 1024).toFixed(1)} KB (Δ ${d} KB, extracted ${r.extracted} URI(s))`,
      );
    });

  const beforeT = results.reduce((a, r) => a + r.originalBytes, 0);
  const afterT = results.reduce((a, r) => a + r.finalBytes, 0);
  const uniqueFiles = registry.size;
  const uniqueBytes = [...registry.values()].reduce(
    (a, e) => a + Buffer.from(e.b64, 'base64').length,
    0,
  );
  console.log('');
  console.log(
    `Totals: ${(beforeT / 1024 / 1024).toFixed(2)} MB → ${(afterT / 1024 / 1024).toFixed(2)} MB (saved ${((beforeT - afterT) / 1024 / 1024).toFixed(2)} MB)`,
  );
  console.log(
    `Unique data-uri files: ${uniqueFiles} (${(uniqueBytes / 1024 / 1024).toFixed(2)} MB on disk)`,
  );
  if (dryRun) console.log('(dry run — no files written)');
}

main();
