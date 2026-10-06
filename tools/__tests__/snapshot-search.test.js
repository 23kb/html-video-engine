#!/usr/bin/env node
// WO-306 — the four discovery tools must answer the same four questions in a
// product pack as they do in the default pack, and must never name the wrong
// root when they do it.
//
//   which snapshots exist, what does each show   list-snapshots.js [--search]
//   what selectors does a snapshot offer         inspect-snapshot.js --emit-selectors
//   is a selector still valid                    verify-selectors.js   (browser; not run here)
//
// Runs against a throwaway product pack, never a real one.
//
// Usage: node tools/__tests__/snapshot-search.test.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const KEY = `zz-search-test-${process.pid}`;
const PACK = path.join(ROOT, 'products', KEY);
const SNAPS = path.join(PACK, 'snapshots');
// A second throwaway pack: the cross-pack lookups need somewhere else to look.
const KEY2 = `zz-search-other-${process.pid}`;
const PACK2 = path.join(ROOT, 'products', KEY2);
const SNAPS2 = path.join(PACK2, 'snapshots');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function tool(name, argv, env = {}) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', name), ...argv], {
    encoding: 'utf8',
    maxBuffer: 1e8,
    // VIDEO_PRODUCT is the only switch; no tool takes a product argument.
    env: { ...process.env, VIDEO_PRODUCT: KEY, WP_SNAPSHOT_ROOT: '', WPF_SNAPSHOTS_DIR: '', ...env },
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}
const slugsOf = (out) => out.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(' ')[0]);

function build() {
  fs.rmSync(PACK, { recursive: true, force: true });
  fs.mkdirSync(SNAPS, { recursive: true });
  fs.writeFileSync(path.join(PACK, 'product.json'), JSON.stringify({ key: KEY, displayName: 'Search Test' }, null, 2));

  const snaps = [
    { slug: 'admin-orders-empty', category: 'admin/list', shows: 'Orders with nothing in them yet', topics: ['orders', 'empty-state'] },
    { slug: 'admin-orders-one', category: 'admin/list', shows: 'Orders with a single paid order', topics: ['orders', 'after-run'] },
    { slug: 'frontend-checkout', category: 'frontend/page', shows: 'The checkout page as a buyer sees it', topics: ['storefront'] },
    // A screen ABOUT the other pack (its name in the slug): the --all-packs
    // pack-hint check needs one that would win on the name's words alone.
    { slug: 'admin-other-pack-hours', category: 'admin/list', shows: 'Hours synced from the other pack', topics: ['sync'] },
  ];
  for (const s of snaps) {
    fs.mkdirSync(path.join(SNAPS, s.slug), { recursive: true });
    fs.writeFileSync(path.join(SNAPS, s.slug, 'index.html'),
      `<html><body><div id="wrap-${s.slug}"><button id="place-order">Place order</button></div></body></html>`);
    fs.writeFileSync(path.join(SNAPS, s.slug, 'meta.json'), JSON.stringify({ sourceUrl: `https://x.example.com/${s.slug}` }, null, 2));
  }
  fs.writeFileSync(path.join(SNAPS, 'index.json'), JSON.stringify({ count: snaps.length, snapshots: snaps }, null, 2));

  // A catalog so --emit-selectors has something to derive from.
  fs.writeFileSync(path.join(SNAPS, 'admin-orders-one', 'catalog.md'), [
    '# Catalog — admin-orders-one',
    '',
    '| anchor | selector | kind | text | count |',
    '|---|---|---|---|---|',
    '| <a id="id--place-order"></a>`id--place-order` | `#place-order` | button | Place order | 1 |',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(SNAPS, 'admin-orders-one', 'outline.md'),
    '## Actions\n\n- `#place-order` — button — "Place order"\n');

  // The pack's own transitions: one block hands off to a captured state.
  fs.mkdirSync(path.join(SNAPS, '_shared'), { recursive: true });
  fs.writeFileSync(path.join(SNAPS, '_shared', 'interactivity.js'), [
    '(function () {',
    '  var R = window.SnapRuntime;',
    '  // ─ Orders row open ─────────────────────────────────────────────',
    `  // @since 2026-10-01 @source fixture/orders.js:1 @verified 2026-10-01 @product ${KEY}`,
    "  R.register([{ label: 'orders-row-open', event: 'click', match: function () { return false; },",
    "    apply: function () { R.goto('admin-orders-one'); } }]);",
    '  // ─ Checkout pay button ─────────────────────────────────────────',
    `  // @since 2026-10-01 @source fixture/checkout.js:1 @verified 2026-10-01 @product ${KEY}`,
    "  R.register([{ label: 'pay-button', event: 'click', match: function () { return false; }, apply: function () {} }]);",
    '}());',
  ].join('\n'));

  fs.rmSync(PACK2, { recursive: true, force: true });
  fs.mkdirSync(SNAPS2, { recursive: true });
  fs.writeFileSync(path.join(PACK2, 'product.json'), JSON.stringify({ key: KEY2, displayName: 'Other Pack' }, null, 2));
  // The hours list, its own "--state" and per-record captures (same text, so
  // only the ranking rules tell them apart), a state of ANOTHER screen that
  // sorts before it alphabetically, and one screen whose rare word must beat
  // the word every other screen carries ("local").
  const hours = { category: 'admin/page', shows: 'Local opening hours grid', topics: ['local-seo'] };
  const other = [
    { slug: 'admin-local-seo-hours', ...hours },
    { slug: 'admin-hours-list', ...hours },
    { slug: 'admin-hours-list--editing', ...hours },
    { slug: 'admin-hours-list-12', ...hours },
    { slug: 'admin-grid--hours', ...hours },
    { slug: 'admin-import-listings', category: 'admin/page', shows: 'Import listings from a CSV file', topics: ['import'] },
  ];
  for (const s of other) {
    fs.mkdirSync(path.join(SNAPS2, s.slug), { recursive: true });
    fs.writeFileSync(path.join(SNAPS2, s.slug, 'index.html'), '<html><body><p>hours</p></body></html>');
    fs.writeFileSync(path.join(SNAPS2, s.slug, 'meta.json'), '{}');
  }
  fs.writeFileSync(path.join(SNAPS2, 'index.json'), JSON.stringify({ count: other.length, snapshots: other }, null, 2));
}

try {
  build();

  section('list-snapshots — what exists, and what each one shows');
  {
    const { code, out } = tool('list-snapshots.js', []);
    ok(code === 0 || code === undefined, 'runs against a product pack');
    ok(/# 4 snapshot\(s\)/.test(out), 'counts the pack, not the default pack');
    ok(/admin-orders-one — Orders with a single paid order/.test(out), 'prints the description beside the slug');
    ok(!/INDEX-ONLY/.test(out), 'every index entry has its folder');
  }

  section('list-snapshots --search — slug, description, topics and category');
  {
    ok(/2 snapshot\(s\) matching "orders-"/.test(tool('list-snapshots.js', ['--search', 'orders-']).out), 'matches on slug');
    ok(/1 snapshot\(s\) matching "buyer"/.test(tool('list-snapshots.js', ['--search', 'buyer']).out), 'matches on the description');
    // `empty-state` and `frontend/page` appear in NO slug and NO description,
    // so before WO-306 these two searches returned nothing.
    const t = tool('list-snapshots.js', ['--search', 'empty-state']);
    ok(/1 snapshot\(s\)/.test(t.out) && /admin-orders-empty/.test(t.out), 'matches on a topic');
    const c = tool('list-snapshots.js', ['--search', 'frontend/page']);
    ok(/1 snapshot\(s\)/.test(c.out) && /frontend-checkout/.test(c.out), 'matches on the category');
  }

  section('list-snapshots --search — tokenised and ranked (the motion-film score)');
  {
    // Spaces, hyphens, underscores and slashes are one separator.
    const t = tool('list-snapshots.js', ['--search', 'orders one']);
    const lines = t.out.split('\n').filter((l) => l && !l.startsWith('#'));
    ok(/# pack: .*products\/zz-search-test-/.test(t.out), 'names the pack it searched');
    ok(lines[0] && lines[0].startsWith('admin-orders-one'), `"orders one" ranks admin-orders-one first (${(lines[0] || '').split(' ')[0]})`);
    ok(lines.length === 2, 'both orders screens hit; the checkout does not');
    const u = tool('list-snapshots.js', ['--search', 'paid_order']).out.split('\n').filter((l) => l && !l.startsWith('#'));
    ok(u[0] && u[0].startsWith('admin-orders-one'), 'an underscore splits like a space ("paid_order" ranks the paid order first)');
    const plural = tool('list-snapshots.js', ['--search', 'order']);
    ok(/2 snapshot\(s\)/.test(plural.out), 'a singular finds the plural (stemmed)');
    const none = tool('list-snapshots.js', ['--search', 'zzzqqq']);
    ok(/# 0 snapshot\(s\)/.test(none.out), 'a word nothing holds finds nothing');
  }

  section('list-snapshots --search — a base screen outranks its own states; a rare word outranks a common one');
  {
    const env = { VIDEO_PRODUCT: KEY2 };
    // Equal text everywhere: admin-hours-list, admin-local-seo-hours and
    // admin-grid--hours score the same for "opening hours".
    const h = slugsOf(tool('list-snapshots.js', ['--search', 'opening hours'], env).out);
    ok(h[0] === 'admin-hours-list', `the base screen ranks first (${h.join(', ')})`);
    ok(h[2] === 'admin-grid--hours', 'at equal score a bare screen sorts before a state capture, whatever the alphabet says');
    ok(h.indexOf('admin-hours-list--editing') > h.indexOf('admin-grid--hours'), 'its own "--state" capture ranks under it (×0.9)');
    ok(h.indexOf('admin-hours-list-12') > h.indexOf('admin-hours-list--editing'), 'its per-record capture ranks lower still (×0.8)');
    // "local" is on five of six screens, "import" on one: the import screen
    // wins "local import" although admin-local-seo-hours carries "local" in
    // three fields — rare words weigh more (IDF). Before this rule the hours
    // screen won (7 points to 5.5).
    const r = slugsOf(tool('list-snapshots.js', ['--search', 'local import'], env).out);
    ok(r[0] === 'admin-import-listings', `the rare word decides: "local import" finds the import screen first (${r[0]})`);
    const lib = require(path.join(ROOT, 'tools', 'lib', 'snapshot-search.js'));
    ok(lib.baseOf('admin-hours-list--editing') === 'admin-hours-list' && lib.baseOf('admin-hours-list-12') === 'admin-hours-list'
      && lib.baseOf('admin-order-01') === 'admin-order' && lib.baseOf('admin-tickets--paid-sort-date') === 'admin-tickets' && lib.baseOf('admin-hours-list') === null,
    'baseOf() names the screen a capture is a state of');
  }

  section('list-snapshots --search --all-packs — a product name in the query picks its pack');
  {
    // KEY2 is "Other Pack" (product.json displayName). KEY's own screen is
    // ABOUT the other pack — its slug carries the name — and would win on the
    // name's words alone. With the name recognised, the hours grid of the
    // named pack comes first.
    // Only the two throwaway packs are judged: the real packs are searched too
    // and their scores are not comparable here.
    const all = JSON.parse(tool('list-snapshots.js', ['--search', 'other pack hours', '--all-packs', '--json']).out);
    const mine = all.snapshots.filter((s) => s.pack === KEY || s.pack === KEY2).map((s) => `${s.pack}/${s.slug}`);
    ok(all.hint && all.hint.pack === KEY2, `the query names the ${KEY2} pack (hint: ${JSON.stringify(all.hint)})`);
    ok(mine[0] === `${KEY2}/admin-hours-list` || mine[0] === `${KEY2}/admin-local-seo-hours`, `the named pack's hours screen ranks first (${mine[0]})`);
    ok(mine.indexOf(`${KEY}/admin-other-pack-hours`) > 1, 'the screen about the other pack still lists, below it');
    const none = JSON.parse(tool('list-snapshots.js', ['--search', 'hours', '--all-packs', '--json']).out);
    ok(none.hint === null, 'no product name, no hint');
    const lib = require(path.join(ROOT, 'tools', 'lib', 'snapshot-search.js'));
    const names = lib.packNames({ key: 'some-thing-pro', root: path.join(ROOT, 'products', 'zz-none', 'snapshots') });
    ok(JSON.stringify(names) === JSON.stringify([['some', 'thing']]), 'a pack with no pack.json answers to its key (minus an edition suffix)');
  }

  section('hubs, filler words, families, ties and --category (aThemes search pass, 2026-10-07)');
  {
    const lib = require(path.join(ROOT, 'tools', 'lib', 'snapshot-search.js'));
    // A hub names ten other screens of its pack in its topics; the same entry with those
    // screens absent is not a hub. Same IDF both ways, so only the hub rule differs.
    const names = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet'];
    const hub = { slug: 'admin-home', shows: 'Home with the module cards', topics: [...names, 'kilo'] };
    const mods = names.map((n) => ({ slug: `admin-module-${n}`, shows: `${n} settings`, topics: [n] }));
    const idf = [1];
    const asHub = lib.scoreAll([hub, ...mods], ['kilo'], idf)[0];
    const alone = lib.scoreAll([hub], ['kilo'], idf)[0];
    ok(Math.abs(asHub - alone * 0.7) < 1e-9, `a hub hit only in its topics scores 0.7 of the same screen that is no hub (${asHub.toFixed(2)} vs ${alone.toFixed(2)})`);
    const viaShows = lib.scoreAll([hub, ...mods], ['card'], idf)[0];
    const viaShowsAlone = lib.scoreAll([hub], ['card'], idf)[0];
    ok(viaShows === viaShowsAlone, 'a hub whose description carries the word keeps its full score');
    const nine = lib.scoreAll([{ ...hub, topics: names.slice(0, 9).concat('kilo') }, ...mods], ['kilo'], idf)[0];
    ok(nine === lib.scoreAll([{ ...hub, topics: names.slice(0, 9).concat('kilo') }], ['kilo'], idf)[0], 'nine borrowed topics is not a hub');

    ok(JSON.stringify(lib.queryToks('How to configure the copyright area')) === '["configure","copyright","area"]', 'queryToks drops filler words');
    ok(JSON.stringify(lib.queryToks('how to')) === '["how","to"]', 'a query of nothing but filler keeps it');
    const r = lib.rank([{ slug: 'x-how', shows: '', topics: [] }, { slug: 'y-other', shows: '', topics: [] }], 'how other');
    ok(r.length === 2, 'one-pack ranking keeps filler words (they can mark a doc heading pasted into the topics)');
    ok(lib.rank([{ slug: 'x-how', shows: '', topics: [] }, { slug: 'y-other', shows: '', topics: [] }], 'how other', { stop: true }).length === 1, 'stop: true drops them');

    // Two throwaway packs of one family, each holding the same screen.
    const famKeys = [`zz-fam-a-${process.pid}`, `zz-fam-b-${process.pid}`];
    try {
      for (const k of famKeys) {
        const dir = path.join(ROOT, 'products', k, 'snapshots');
        fs.mkdirSync(path.join(dir, 'admin-blog-archive'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'admin-blog-archive--style'), { recursive: true });
        fs.writeFileSync(path.join(ROOT, 'products', k, 'pack.json'), JSON.stringify({ key: k, name: k, family: 'Zzfamily' }));
        fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ snapshots: [
          { slug: 'admin-blog-archive', category: 'admin/customizer', shows: 'Blog archive zzquux panel', topics: ['zzquux'] },
          { slug: 'admin-blog-archive--style', category: 'admin/customizer', shows: 'Blog archive zzquux panel, Style tab', topics: ['zzquux'] },
        ] }));
      }
      const j = JSON.parse(tool('list-snapshots.js', ['--search', 'zzfamily zzquux', '--all-packs', '--json']).out);
      ok(j.hint && j.hint.family === 'Zzfamily' && famKeys.every((k) => j.hint.packs.includes(k)), `a family name names every pack of the family (${JSON.stringify(j.hint)})`);
      ok(j.tie && famKeys.every((k) => j.tie.includes(k)), 'the same screen in two packs is reported as a tie');
      const top = j.snapshots.slice(0, 4).map((s) => `${s.pack}/${s.slug}`);
      ok(top[0].endsWith('/admin-blog-archive') && top[1].endsWith('/admin-blog-archive') && top[0] !== top[1], `at equal score the packs take turns (${top.join(', ')})`);
      const txt = tool('list-snapshots.js', ['--search', 'zzquux', '--all-packs']).out;
      ok(/# the best hit ties across .*zz-fam-a-.*zz-fam-b-/.test(txt), 'the text output says the best hit ties and where');
    } finally {
      for (const k of famKeys) fs.rmSync(path.join(ROOT, 'products', k), { recursive: true, force: true });
    }

    const c = tool('list-snapshots.js', ['--search', 'orders', '--category', 'admin/list']);
    ok(/# 2 snapshot\(s\)/.test(c.out), '--category keeps the screens whose category starts with it');
    ok(/# 0 snapshot\(s\)/.test(tool('list-snapshots.js', ['--search', 'orders', '--category', 'frontend']).out), '--category drops the rest');
    ok(/# 1 snapshot\(s\)/.test(tool('list-snapshots.js', ['--category', 'frontend/page']).out), '--category works without --search');
    ok(tool('list-snapshots.js', ['--category']).code === 2, '--category without a value is a usage error');
  }

  section('list-snapshots — --help, bad flags, --all-packs');
  {
    const h = tool('list-snapshots.js', ['--help']);
    ok(h.code === 0 && /Usage:/.test(h.out) && /--all-packs/.test(h.out), '--help prints usage and exits 0');
    const bad = tool('list-snapshots.js', ['--serach', 'orders']);
    ok(bad.code === 2 && /unknown argument: --serach/.test(bad.err), 'an unknown flag exits 2 and says so (no silent full listing)');
    const lone = tool('list-snapshots.js', ['--all-packs']);
    ok(lone.code === 2, '--all-packs without --search is a usage error');
    const all = tool('list-snapshots.js', ['--search', 'local seo', '--all-packs']);
    ok(all.code === 0 && new RegExp(`\\[${KEY2}\\] admin-local-seo-hours`).test(all.out), 'every pack is searched and each hit names its pack');
    ok(/# packs: .*zz-search-test-/.test(all.out), 'the searched packs are listed');
    const j = JSON.parse(tool('list-snapshots.js', ['--search', 'orders', '--json']).out);
    ok(j.pack === KEY && j.count === 2, '--json carries the pack key');
  }

  section('inspect-snapshot — a slug from another pack says where it is');
  {
    const i = tool('inspect-snapshot.js', ['admin-local-seo-hours', '--emit-selectors']);
    ok(i.code === 1 && /snapshot not found/.test(i.err), 'inspect-snapshot still fails on a missing slug');
    ok(new RegExp(`products/${KEY2}/snapshots/admin-local-seo-hours/\\s+→ set VIDEO_PRODUCT=${KEY2}`).test(i.err), 'inspect-snapshot names the pack and the VIDEO_PRODUCT');
    // snapshot-grep's cross-pack hint is tested with snapshot-grep.js's own commit.
    const nowhere = tool('inspect-snapshot.js', ['admin-nowhere-at-all', '--emit-selectors']);
    ok(nowhere.code === 1 && !/VIDEO_PRODUCT=/.test(nowhere.err), 'no hint when no pack has it');
  }

  section('field-state --interactivity — label, block title or target slug');
  {
    const byLabel = tool('field-state.js', ['--interactivity', 'pay']);
    ok(/1 of 2 registered transition\(s\) in products\/zz-search-test-[^/]+\/snapshots\/_shared\/interactivity\.js/.test(byLabel.out), 'names the pack file it read');
    ok(/pay-button/.test(byLabel.out), 'matches a transition label');
    const byTarget = tool('field-state.js', ['--interactivity', 'orders-one']);
    ok(/orders-row-open .*\(targets: admin-orders-one\)/.test(byTarget.out), 'matches a target slug and says so');
    const byTitle = tool('field-state.js', ['--interactivity', 'checkout pay']);
    ok(/pay-button .*\(title: Checkout pay button\)/.test(byTitle.out), 'matches a block title, spaces as hyphens');
    ok(!/Universal field handlers/.test(byLabel.out), 'the default-pack field footnote stays out of another pack');
  }

  section('inspect-snapshot --emit-selectors — and it names the right root');
  {
    // `--all` = full catalog dump. The default starter subset is an
    // allowlist that this minimal fixture does not trip, which is the tool's
    // own documented behaviour and not what this test is about.
    const { code, out } = tool('inspect-snapshot.js', ['admin-orders-one', '--emit-selectors', '--all']);
    ok(code === 0, `exits 0 (${code})`);
    ok(out.includes('#place-order'), 'the catalog selector is emitted');
    ok(out.includes(`products/${KEY}/snapshots/admin-orders-one/catalog.md`),
      'the "Catalog authority" line names the PRODUCT root');
    ok(!/`snapshots\/admin-orders-one\/catalog\.md`/.test(out),
      'it no longer points a reader at the default pack');
  }

  section('No product name is hardcoded in any of the four tools');
  {
    for (const f of ['list-snapshots.js', 'snapshot-grep.js', 'inspect-snapshot.js', 'verify-selectors.js']) {
      const src = fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
      // The four packs that exist today. A tool may not name one.
      const named = ['wp-mail-smtp', 'sugar-calendar', 'wpvibe'].filter((k) => src.includes(k));
      ok(named.length === 0, `${f} names no product (${named.join(', ') || 'none'})`);
    }
  }
} finally {
  fs.rmSync(PACK, { recursive: true, force: true });
  fs.rmSync(PACK2, { recursive: true, force: true });
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
