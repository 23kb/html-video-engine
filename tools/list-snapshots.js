#!/usr/bin/env node
// List captured snapshots, optionally cross-referenced against a video package.
//
// Usage:
//   node tools/list-snapshots.js                # list all snapshots
//   node tools/list-snapshots.js --for <slug>   # show which snapshots a video uses,
//                                               # which exist, which are missing
//   node tools/list-snapshots.js --search <q>   # ranked search over slug, description,
//                                               # topics and category
//   node tools/list-snapshots.js --search <q> --all-packs
//                                               # the same search in every products/<key>/ pack
//   node tools/list-snapshots.js --search <q> --category <prefix>
//                                               # only screens whose category starts with it
//   node tools/list-snapshots.js --json         # machine-readable
//   node tools/list-snapshots.js --help
//
// The pack is VIDEO_PRODUCT (unset = the default pack); the first line names it.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const paths = require('./lib/paths');
const search = require('./lib/snapshot-search');

const USAGE = [
  'Usage:',
  '  node tools/list-snapshots.js                          # every snapshot in the pack',
  '  node tools/list-snapshots.js --search <query>         # ranked: slug, topics, description, category',
  '  node tools/list-snapshots.js --search <query> --all-packs   # every products/<key>/ pack, hits labelled',
  '  node tools/list-snapshots.js ... --category <prefix>   # only screens whose category starts with it (frontend/checkout)',
  '  node tools/list-snapshots.js --for <video-slug>       # snapshots a video uses, which are missing',
  '  node tools/list-snapshots.js ... --json               # machine-readable',
  '',
  'The pack is VIDEO_PRODUCT=<key> (products/<key>/snapshots/); unset = the default pack.',
  'Search words are split on spaces, hyphens, underscores and slashes, so',
  '"local seo" finds admin-local-seo-*; every word that matches raises the rank,',
  'a rare word counts more than one on every screen, and a base screen ranks',
  'above its own "--state" and per-record captures. With --all-packs filler',
  'words ("how to", "the", "your") are dropped, a product name in the query',
  'picks that pack, a family name ("athemes") picks every pack of the family',
  '(names and families: products/<key>/pack.json), and when the best hit ties',
  'across packs the output says so: add the product name to pick one.',
].join('\n');

function parseArgs(argv) {
  const args = { for: null, search: null, category: null, json: false, allPacks: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--for') args.for = argv[++i] || '';
    else if (a === '--search') args.search = argv[++i] || '';
    else if (a === '--category') args.category = argv[++i] || '';
    else if (a === '--json') args.json = true;
    else if (a === '--all-packs') args.allPacks = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      // An unknown flag used to fall through to a full default-pack listing, which
      // reads like an answer. Say what went wrong instead.
      console.error('unknown argument: ' + a + '\n\n' + USAGE);
      process.exit(2);
    }
  }
  if (args.for === '' || args.search === '' || args.category === '') {
    console.error((args.for === '' ? '--for' : args.search === '' ? '--search' : '--category') + ' needs a value\n\n' + USAGE);
    process.exit(2);
  }
  if (args.allPacks && !args.search) {
    console.error('--all-packs goes with --search <query>\n\n' + USAGE);
    process.exit(2);
  }
  return args;
}

const SNAP_DIR = paths.snapshotsRoot();
const INDEX_PATH = path.join(SNAP_DIR, 'index.json');

// "<key> — products/<key>/snapshots": which pack a listing came from.
function packLabel(root) {
  const rel = path.relative(REPO_ROOT, root).split(path.sep).join('/');
  const key = search.packOf(root);
  return key ? `${key} — ${rel}` : rel;
}

function loadIndex(indexPath = INDEX_PATH) {
  if (!fs.existsSync(indexPath)) return { count: 0, snapshots: [] };
  const raw = fs.readFileSync(indexPath, 'utf8');
  // Mojibake guard (rf 5): index.json descriptions were once written as UTF-8
  // and read back as cp1252, so every em-dash rendered "â€”" in the output of
  // the most-used discovery tool, on every call. Repaired 2026-08-20; this
  // catches a recurrence at the point of use instead of years later.
  if (/[ÂÃâãð][-ÿ–—‘’“”†-…™]/.test(raw)) {
    const rel = path.relative(REPO_ROOT, indexPath).split(path.sep).join('/');
    console.error(`⚠ ${rel} contains mis-encoded text (mojibake). Fix: node tools/fix-mojibake.js ${rel} --write`);
  }
  return JSON.parse(raw);
}

function listOnDisk(root = SNAP_DIR) {
  if (!fs.existsSync(root)) return new Set();
  return new Set(
    fs.readdirSync(root, { withFileTypes: true })
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

// --category <prefix>: only the screens whose category starts with it
// ("frontend/checkout", "admin/module"). No prefix keeps every screen.
function byCategory(entries, prefix) {
  if (!prefix) return entries;
  const p = prefix.toLowerCase();
  return entries.filter((e) => String(e.category || '').toLowerCase().startsWith(p));
}

// --all-packs: the same ranked search in every pack, one list, each hit
// labelled with its pack, ranked across packs by score. Word rarity (IDF) is
// taken over every pack at once, so the scores compare across packs. A product
// name in the query ("WP Mail SMTP dashboard") names the pack: its hits come
// first and the name's words leave the query, so another pack's screens ABOUT
// that product do not win on the name alone. The names come from each pack's
// pack.json / product.json (lib/snapshot-search.js packNames).
function searchAllPacks(args) {
  const hits = [];
  const searched = [];
  const packs = search.packs().map((p) => ({ ...p, entries: byCategory(loadIndex(path.join(p.root, 'index.json')).snapshots || [], args.category) }));
  const hint = search.packHint(args.search, packs);
  const query = hint && hint.rest.length ? hint.rest : args.search;
  const idf = search.idfFor(packs.flatMap((p) => p.entries), Array.isArray(query) ? query : search.queryToks(query));
  for (const p of packs) {
    const onDisk = listOnDisk(p.root);
    searched.push(p.key);
    search.rank(p.entries, query, { idf, stop: true }).forEach((r, i) => {
      hits.push({ pack: p.key, score: r.score, onDisk: onDisk.has(r.entry.slug), ...r.entry, _at: i });
    });
  }
  const hinted = hint ? (hint.key ? [hint.key] : hint.keys) : [];
  const named = (h) => (hinted.includes(h.pack) ? 0 : 1);
  // At equal score the packs take turns, each in its own order (bare screens
  // first): look-alike packs (two themes with the same Customizer panel)
  // both show in the top hits instead of one pack filling them by name.
  hits.sort((a, b) => named(a) - named(b) || b.score - a.score || a._at - b._at || a.pack.localeCompare(b.pack));
  for (const h of hits) delete h._at;
  // The best hit is tied when another pack scores the same for it.
  const tie = hits.length ? [...new Set(hits.filter((h) => named(h) === named(hits[0]) && h.score === hits[0].score).map((h) => h.pack))] : [];
  const tied = tie.length > 1 ? tie : null;
  const hintJson = !hint ? null : hint.key ? { pack: hint.key, name: hint.name.join(' ') } : { family: hint.family, packs: hint.keys };
  if (args.json) {
    process.stdout.write(JSON.stringify({ packs: searched, query: args.search, hint: hintJson, tie: tied, count: hits.length, snapshots: hits }, null, 2) + '\n');
    return;
  }
  console.log(`# packs: ${searched.join(', ')}`);
  if (hint && hint.key) console.log(`# "${hint.name.join(' ')}" names the ${hint.key} pack: its hits come first, the other words are the search`);
  if (hint && !hint.key) console.log(`# "${hint.family}" names a family of packs (${hint.keys.join(', ')}): their hits come first, the other words are the search`);
  if (tied) console.log(`# the best hit ties across ${tied.join(', ')}: the same screen exists in each; add the product name to pick one`);
  console.log(`# ${hits.length} snapshot(s) matching "${args.search}" across ${searched.length} pack(s)`);
  for (const h of hits) {
    const shows = h.shows ? ` — ${h.shows}` : '';
    console.log(`[${h.pack}] ${h.slug}${shows}${h.onDisk ? '' : '  [INDEX-ONLY, no folder]'}`);
  }
  if (hits.length) console.log('\nOpen one with VIDEO_PRODUCT=<pack> (unset = the default pack).');
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(USAGE); return; }
  if (args.allPacks) { searchAllPacks(args); return; }
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
  let rows = byCategory(index.snapshots.slice(), args.category);
  if (args.search) {
    // slug + description + topics + category: a person searching "stripe" or
    // "recurring" is asking what a screen SHOWS, and the topics list is where
    // the capture recorded that (WO-306). Ranked and tokenised (lib/snapshot-
    // search.js): "local seo" finds admin-local-seo-*, best match first. The
    // plain substring the tool used before still counts, so nothing it found
    // is lost.
    rows = search.rank(rows, args.search).map((r) => r.entry);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      pack: search.packOf(SNAP_DIR) || paths.activeProduct(),
      root: path.relative(REPO_ROOT, SNAP_DIR).split(path.sep).join('/'),
      count: rows.length,
      snapshots: rows,
    }, null, 2) + '\n');
    return;
  }

  console.log(`# pack: ${packLabel(SNAP_DIR)}`);
  console.log(`# ${rows.length} snapshot(s)${args.search ? ` matching "${args.search}"` : ''}`);
  for (const s of rows) {
    const onDiskFlag = onDisk.has(s.slug) ? '' : '  [INDEX-ONLY, no folder]';
    const shows = s.shows ? ` — ${s.shows}` : '';
    console.log(`${s.slug}${shows}${onDiskFlag}`);
  }

  // Disk-only (folders without index entries). Only count dirs that look
  // like real snapshots — i.e. ship a meta.json. Shared asset dirs (fonts,
  // images, webfonts, docs-klaviyo) sit alongside snapshots but aren't
  // snapshots themselves and would otherwise be reported as orphans on every
  // run.
  const indexedSlugs = new Set(index.snapshots.map(s => s.slug));
  const orphanFolders = [...onDisk]
    .filter(n => !indexedSlugs.has(n) && !n.startsWith('.') && !n.startsWith('_'))
    .filter(n => fs.existsSync(path.join(SNAP_DIR, n, 'meta.json')));
  if (orphanFolders.length && !args.search) {
    console.log('');
    console.log(`# ${orphanFolders.length} folder(s) on disk not in index.json:`);
    for (const n of orphanFolders) console.log(`  ${n}`);
  }
}

main();
