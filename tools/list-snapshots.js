#!/usr/bin/env node
// List captured snapshots, optionally cross-referenced against a video package.
//
// Usage:
//   node tools/list-snapshots.js                # list all snapshots
//   node tools/list-snapshots.js --for <slug>   # show which snapshots a video uses,
//                                               # which exist, which are missing
//   node tools/list-snapshots.js --search <q>   # filter by slug substring
//   node tools/list-snapshots.js --json         # machine-readable

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SNAP_DIR = path.join(REPO_ROOT, 'snapshots');
const INDEX_PATH = path.join(SNAP_DIR, 'index.json');

function parseArgs(argv) {
  const args = { for: null, search: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--for') args.for = argv[++i];
    else if (a === '--search') args.search = argv[++i];
    else if (a === '--json') args.json = true;
  }
  return args;
}

function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) return { count: 0, snapshots: [] };
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function listOnDisk() {
  if (!fs.existsSync(SNAP_DIR)) return new Set();
  return new Set(
    fs.readdirSync(SNAP_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  );
}

function snapshotsReferencedByVideo(slug) {
  const refs = new Map(); // name -> sources[]
  const add = (name, where) => {
    if (!name) return;
    if (!refs.has(name)) refs.set(name, []);
    refs.get(name).push(where);
  };

  const videoDir = path.join(REPO_ROOT, 'videos', slug);
  if (!fs.existsSync(videoDir)) return null;

  const manifestPath = path.join(videoDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (m.primarySnapshot) add(m.primarySnapshot, 'manifest.primarySnapshot');
    } catch (_) {}
  }

  const chaptersDir = path.join(videoDir, 'chapters');
  if (fs.existsSync(chaptersDir)) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(p); continue; }
        if (!entry.name.endsWith('.js')) continue;
        const src = fs.readFileSync(p, 'utf8');
        const rel = path.relative(REPO_ROOT, p).replace(/\\/g, '/');
        // export const snapshot = '...'   |   snapshot: '...'   |   swapToSnapshot('...')
        // |   validator = { snapshot: '...' }
        const patterns = [
          /export\s+const\s+snapshot\s*=\s*['"]([\w-]+)['"]/g,
          /(?:^|[\s,{])snapshot\s*:\s*['"]([\w-]+)['"]/gm,
          /swapToSnapshot\(\s*['"]([\w-]+)['"]/g,
        ];
        for (const re of patterns) {
          let mm;
          while ((mm = re.exec(src)) !== null) add(mm[1], rel);
        }
      }
    };
    walk(chaptersDir);
  }
  return refs;
}

function main() {
  const args = parseArgs(process.argv);
  const index = loadIndex();
  const onDisk = listOnDisk();

  if (args.for) {
    const refs = snapshotsReferencedByVideo(args.for);
    if (!refs) {
      console.error(`unknown video slug: ${args.for}`);
      process.exit(2);
    }
    const rows = [...refs.entries()].map(([name, sources]) => ({
      name,
      exists: onDisk.has(name),
      sources: [...new Set(sources)],
      shows: (index.snapshots.find(s => s.slug === name) || {}).shows || null,
    })).sort((a, b) => a.name.localeCompare(b.name));

    if (args.json) {
      process.stdout.write(JSON.stringify({ slug: args.for, snapshots: rows }, null, 2) + '\n');
      return;
    }
    console.log(`# Snapshots referenced by ${args.for}`);
    console.log(`#   ${rows.length} unique, ${rows.filter(r => r.exists).length} exist, ${rows.filter(r => !r.exists).length} missing`);
    for (const r of rows) {
      const flag = r.exists ? 'OK     ' : 'MISSING';
      const shows = r.shows ? `  — ${r.shows}` : '';
      console.log(`${flag}  ${r.name}${shows}`);
      for (const s of r.sources) console.log(`           ↳ ${s}`);
    }
    process.exit(rows.some(r => !r.exists) ? 1 : 0);
  }

  // List mode
  let rows = index.snapshots.slice();
  if (args.search) {
    const q = args.search.toLowerCase();
    rows = rows.filter(s => s.slug.toLowerCase().includes(q) || (s.shows || '').toLowerCase().includes(q));
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ count: rows.length, snapshots: rows }, null, 2) + '\n');
    return;
  }

  console.log(`# ${rows.length} snapshot(s)${args.search ? ` matching "${args.search}"` : ''}`);
  for (const s of rows) {
    const onDiskFlag = onDisk.has(s.slug) ? '' : '  [INDEX-ONLY, no folder]';
    const shows = s.shows ? ` — ${s.shows}` : '';
    console.log(`${s.slug}${shows}${onDiskFlag}`);
  }

  // Disk-only (folders without index entries)
  const indexedSlugs = new Set(index.snapshots.map(s => s.slug));
  const orphanFolders = [...onDisk].filter(n => !indexedSlugs.has(n) && !n.startsWith('.'));
  if (orphanFolders.length && !args.search) {
    console.log('');
    console.log(`# ${orphanFolders.length} folder(s) on disk not in index.json:`);
    for (const n of orphanFolders) console.log(`  ${n}`);
  }
}

main();
