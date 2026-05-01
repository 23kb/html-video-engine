#!/usr/bin/env node
// Prune unreferenced files from snapshots/<slug>/assets/.
//
// Strategy: a file is KEPT iff its basename appears anywhere in index.html
// (handles src=, href=, url(...), inline JSON config, srcset, etc.) OR in any
// kept CSS file (transitive url() refs for fonts/images).
//
// Usage:
//   node tools/prune-snapshot-assets.js               # dry-run, all snapshots
//   node tools/prune-snapshot-assets.js --apply       # actually delete
//   node tools/prune-snapshot-assets.js --verify      # check every assets/ ref in index.html resolves
//   node tools/prune-snapshot-assets.js <slug> [...]  # limit to slugs
//
// Reports per-snapshot and totals. Never touches index.html or non-assets files.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'snapshots');

function parseArgs(argv) {
  const args = { apply: false, verify: false, slugs: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--verify') args.verify = true;
    else if (!a.startsWith('--')) args.slugs.push(a);
  }
  return args;
}

function verifySnapshot(slug) {
  const snapDir = path.join(SNAP_DIR, slug);
  const indexPath = path.join(snapDir, 'index.html');
  const assetsDir = path.join(snapDir, 'assets');
  if (!fs.existsSync(indexPath) || !fs.existsSync(assetsDir)) return null;
  const html = fs.readFileSync(indexPath, 'utf8');
  // Extract any token that looks like assets/<basename>
  const refs = new Set();
  for (const m of html.matchAll(/assets\/([A-Za-z0-9._-]+\.[A-Za-z0-9]+)/g)) {
    refs.add(m[1]);
  }
  const missing = [];
  for (const r of refs) {
    if (!fs.existsSync(path.join(assetsDir, r))) missing.push(r);
  }
  return { slug, refs: refs.size, missing };
}

function listSnapshots(filter) {
  const all = fs.readdirSync(SNAP_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  if (filter.length === 0) return all;
  return all.filter(s => filter.includes(s));
}

function collectReferencedBasenames(text, knownBasenames) {
  const referenced = new Set();
  for (const name of knownBasenames) {
    if (text.includes(name)) referenced.add(name);
  }
  return referenced;
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function processSnapshot(slug, apply) {
  const snapDir = path.join(SNAP_DIR, slug);
  const indexPath = path.join(snapDir, 'index.html');
  const assetsDir = path.join(snapDir, 'assets');
  if (!fs.existsSync(indexPath) || !fs.existsSync(assetsDir)) {
    return { slug, skipped: true, reason: 'no index.html or assets/' };
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const allFiles = fs.readdirSync(assetsDir);
  const knownBasenames = new Set(allFiles);

  // Pass 1: basenames referenced from index.html
  const referenced = collectReferencedBasenames(html, knownBasenames);

  // Pass 2: walk kept CSS files for transitive url() refs (basenames only)
  const cssFiles = [...referenced].filter(n => n.endsWith('.css'));
  for (const css of cssFiles) {
    const cssText = fs.readFileSync(path.join(assetsDir, css), 'utf8');
    for (const name of knownBasenames) {
      if (!referenced.has(name) && cssText.includes(name)) referenced.add(name);
    }
  }

  // Compute prune list with sizes
  let keepBytes = 0;
  let pruneBytes = 0;
  const byExtKept = {};
  const byExtPruned = {};
  const pruneList = [];
  for (const f of allFiles) {
    const fp = path.join(assetsDir, f);
    const st = fs.statSync(fp);
    if (!st.isFile()) continue;
    const ext = (f.match(/\.([^.]+)$/) || [])[1] || '?';
    if (referenced.has(f)) {
      keepBytes += st.size;
      byExtKept[ext] = (byExtKept[ext] || 0) + 1;
    } else {
      pruneBytes += st.size;
      byExtPruned[ext] = (byExtPruned[ext] || 0) + 1;
      pruneList.push(fp);
    }
  }

  if (apply) {
    for (const fp of pruneList) fs.unlinkSync(fp);
  }

  return {
    slug,
    totalFiles: allFiles.length,
    keptCount: allFiles.length - pruneList.length,
    prunedCount: pruneList.length,
    keepBytes,
    pruneBytes,
    byExtKept,
    byExtPruned,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const slugs = listSnapshots(args.slugs);

  if (args.verify) {
    let totalRefs = 0, totalMissing = 0, badSnaps = 0;
    for (const slug of slugs) {
      const r = verifySnapshot(slug);
      if (!r) continue;
      totalRefs += r.refs;
      totalMissing += r.missing.length;
      if (r.missing.length) {
        badSnaps++;
        console.log(`BROKEN  ${slug}  ${r.missing.length} unresolved ref(s):`);
        for (const m of r.missing.slice(0, 5)) console.log(`          ${m}`);
        if (r.missing.length > 5) console.log(`          ...and ${r.missing.length - 5} more`);
      }
    }
    console.log('');
    console.log(`Verified ${slugs.length} snapshots: ${totalRefs} total refs, ${totalMissing} unresolved across ${badSnaps} snapshot(s)`);
    process.exit(totalMissing === 0 ? 0 : 2);
  }

  console.log(`${args.apply ? 'APPLY' : 'DRY-RUN'}: ${slugs.length} snapshot(s)`);
  console.log('');

  let totalKept = 0, totalPruned = 0, totalKeptBytes = 0, totalPrunedBytes = 0;
  const totalByExt = {};
  const oddballs = [];
  for (const slug of slugs) {
    const r = processSnapshot(slug, args.apply);
    if (r.skipped) {
      console.log(`SKIP   ${slug.padEnd(48)} ${r.reason}`);
      continue;
    }
    totalKept += r.keptCount;
    totalPruned += r.prunedCount;
    totalKeptBytes += r.keepBytes;
    totalPrunedBytes += r.pruneBytes;
    for (const [e, c] of Object.entries(r.byExtPruned)) {
      totalByExt[e] = (totalByExt[e] || 0) + c;
    }
    // Flag snapshots that DO reference JS or CSS — these are "oddballs"
    const keptJs = r.byExtKept.js || 0;
    const keptCss = r.byExtKept.css || 0;
    if (keptJs > 0 || keptCss > 0) {
      oddballs.push({ slug, keptJs, keptCss });
    }
    const ratio = (r.prunedCount / r.totalFiles * 100).toFixed(0);
    console.log(`${slug.padEnd(48)} prune ${String(r.prunedCount).padStart(5)}/${String(r.totalFiles).padEnd(5)} (${ratio}%) ${fmtBytes(r.pruneBytes).padStart(9)} freed`);
  }

  console.log('');
  console.log(`Total kept:   ${totalKept} files (${fmtBytes(totalKeptBytes)})`);
  console.log(`Total pruned: ${totalPruned} files (${fmtBytes(totalPrunedBytes)})`);
  console.log(`Pruned by ext:`, totalByExt);
  if (oddballs.length) {
    console.log('');
    console.log(`Snapshots that reference JS/CSS (kept):`);
    for (const o of oddballs) console.log(`  ${o.slug}  js=${o.keptJs} css=${o.keptCss}`);
  } else {
    console.log('');
    console.log('No snapshot referenced any JS or CSS file from index.html.');
  }
}

main();
