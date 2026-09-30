#!/usr/bin/env node
// WO-306 — the four discovery tools must answer the same four questions in a
// product pack as they do in the default pack, and must never name the wrong
// root when they do it.
//
//   which snapshots exist, what does each show   list-snapshots.js [--search]
//   which snapshots contain X                    snapshot-grep.js --all
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

function tool(name, argv) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', name), ...argv], {
    encoding: 'utf8',
    maxBuffer: 1e8,
    // VIDEO_PRODUCT is the only switch; no tool takes a product argument.
    env: { ...process.env, VIDEO_PRODUCT: KEY, WP_SNAPSHOT_ROOT: '', WPF_SNAPSHOTS_DIR: '' },
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

function build() {
  fs.rmSync(PACK, { recursive: true, force: true });
  fs.mkdirSync(SNAPS, { recursive: true });
  fs.writeFileSync(path.join(PACK, 'product.json'), JSON.stringify({ key: KEY, displayName: 'Search Test' }, null, 2));

  const snaps = [
    { slug: 'admin-orders-empty', category: 'admin/list', shows: 'Orders with nothing in them yet', topics: ['orders', 'empty-state'] },
    { slug: 'admin-orders-one', category: 'admin/list', shows: 'Orders with a single paid order', topics: ['orders', 'after-run'] },
    { slug: 'frontend-checkout', category: 'frontend/page', shows: 'The checkout page as a buyer sees it', topics: ['storefront'] },
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
  const other = [{ slug: 'admin-local-seo-hours', category: 'admin/page', shows: 'Opening hours grid', topics: ['local-seo'] }];
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
    ok(/# 3 snapshot\(s\)/.test(out), 'counts the pack, not the default pack');
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
