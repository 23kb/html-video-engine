// snapshot-search.js — ranked snapshot search and cross-pack lookup, shared by
// list-snapshots.js, inspect-snapshot.js, snapshot-grep.js and field-state.js.
//
// The ranking is the motion-film skill's (scripts/snapshots.mjs score()), so
// the repo tools and the skill agree on what "local seo" finds: text is split
// on anything that is not a letter or digit (space, hyphen, underscore, slash
// all count the same), each word is lightly stemmed, and a query word scores
// per field — slug 3, topics 2.5, shows 1.5, category 1 — full for an exact
// token, half for a prefix, 0.3 for a substring of 4+ letters. The sum is
// scaled by how many query words hit anything, so every word matching beats
// one word matching strongly. CommonJS, no dependencies.

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('./paths');

const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const toks = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem);
const WEIGHT = { slug: 3, topics: 2.5, shows: 1.5, category: 1 };

function topicsOf(e) {
  return Array.isArray(e.topics) ? e.topics : e.topics ? [e.topics] : [];
}

function score(e, words) {
  const f = { slug: toks(e.slug), topics: toks(topicsOf(e).join(' ')), shows: toks(e.shows), category: toks(e.category) };
  let sum = 0;
  let hit = 0;
  for (const w of words) {
    let got = 0;
    for (const [k, list] of Object.entries(f)) {
      let s = 0;
      for (const t of list) {
        if (t === w) { s = WEIGHT[k]; break; }
        if ((t.startsWith(w) || (w.startsWith(t) && t.length >= 4)) && s < WEIGHT[k] * 0.5) s = WEIGHT[k] * 0.5;
        else if (w.length >= 4 && t.includes(w) && s < WEIGHT[k] * 0.3) s = WEIGHT[k] * 0.3;
      }
      got += s;
    }
    sum += got;
    if (got) hit++;
  }
  return words.length ? sum * (0.4 + 0.6 * hit / words.length) : 0;
}

// The raw query as one lowercase substring, the tools' matching before the
// port: an entry it finds is never dropped (a pasted "frontend/page" or a
// slug fragment keeps finding what it found).
function substringHit(e, q) {
  const needle = String(q || '').toLowerCase();
  if (!needle) return false;
  return [e.slug, e.shows, e.category, ...topicsOf(e)].some((v) => String(v || '').toLowerCase().includes(needle));
}

// Index entries ranked for a query: highest score first, then slug order.
// Returns [{ entry, score }] for every entry with a score or a substring hit.
function rank(entries, query) {
  const words = toks(query);
  const out = [];
  for (const e of entries) {
    let s = Math.round(score(e, words) * 100) / 100;
    if (!s && substringHit(e, query)) s = 0.01;
    if (s > 0) out.push({ entry: e, score: s });
  }
  out.sort((a, b) => b.score - a.score || String(a.entry.slug).localeCompare(String(b.entry.slug)));
  return out;
}

// Every pack in the repo: products/<key>/snapshots/ with an index.json or at
// least one snapshot folder. [{ key, root }], sorted by key.
function packs() {
  const base = path.join(REPO_ROOT, 'products');
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const d of fs.readdirSync(base, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('_') || d.name.startsWith('.')) continue;
    const root = path.join(base, d.name, 'snapshots');
    if (fs.existsSync(path.join(root, 'index.json'))) out.push({ key: d.name, root });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function loadIndex(root) {
  const f = path.join(root, 'index.json');
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(j) ? j : j.snapshots || [];
}

// The pack a root belongs to (its products/<key>/ folder name), or null for a
// root outside products/ (a test fixture, the pre-move snapshots/ folder).
function packOf(root) {
  const rel = path.relative(path.join(REPO_ROOT, 'products'), path.resolve(root));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  return parts.length === 2 && parts[1] === 'snapshots' ? parts[0] : null;
}

// Other packs that hold a snapshot folder named `slug` (never `exceptRoot`).
function packsWithSlug(slug, exceptRoot) {
  const except = exceptRoot ? path.resolve(exceptRoot) : null;
  return packs().filter((p) => path.resolve(p.root) !== except && fs.existsSync(path.join(p.root, slug)));
}

// The stderr lines that tell a reader where a missing slug does live, and
// which VIDEO_PRODUCT reaches it. Empty when no other pack has it.
function missingSlugHint(slug, root) {
  if (!slug) return [];
  const hits = packsWithSlug(slug, root);
  if (!hits.length) return [];
  const here = packOf(root);
  const lines = [`  "${slug}" is not in ${here ? `the ${here} pack` : root}, but it is in:`];
  for (const p of hits) {
    const rel = path.relative(REPO_ROOT, p.root).split(path.sep).join('/');
    lines.push(`    ${rel}/${slug}/  → set VIDEO_PRODUCT=${p.key}`);
  }
  return lines;
}

module.exports = { stem, toks, score, rank, substringHit, packs, loadIndex, packOf, packsWithSlug, missingSlugHint, WEIGHT };
