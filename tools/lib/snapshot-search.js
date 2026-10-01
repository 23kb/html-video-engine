// snapshot-search.js — ranked snapshot search and cross-pack lookup, shared by
// list-snapshots.js, inspect-snapshot.js, snapshot-grep.js and field-state.js.
//
// The ranking is the motion-film skill's (scripts/snapshots.mjs) and the
// product-snapshots skill's, so the repo tools and the skills agree on what
// "local seo" finds: text is split on anything that is not a letter or digit
// (space, hyphen, underscore, slash all count the same), each word is lightly
// stemmed, and a query word scores per field — slug 3, topics 2.5, shows 1.5,
// category 1 — full for an exact token, half for a prefix, 0.3 for a substring
// of 4+ letters. Each word is then weighted by how rare it is in the pack
// (IDF: "event" is on every calendar screen, "import" on two, so "import
// events" finds the import tool), the sum is scaled by how many query words
// hit anything, and a state or record capture ("--open", "-list-100",
// "-order-01", "-edit-03-…", "-sort-", "-filtered-by") ranks under its own
// base screen. At equal score a bare screen sorts before a state capture.
// CommonJS, no dependencies.

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

// A "--state" capture ranks at 0.9 of its base, a per-record / sorted /
// filtered capture at 0.8 — only when the base screen is a hit for the same
// query, so a state that stands alone keeps its full score.
const isVariant = (slug) => /--/.test(slug);
const isRecord = (slug) => /-sort-|-filtered-by|-(list|order|edit)-\d+/.test(slug);
const depth = (slug) => (isVariant(slug) ? 1 : 0) + (isRecord(slug) ? 1 : 0);

// The screen a capture is a state of: "x--open" → "x"; "x-list-100",
// "x-order-01", "x-edit-03-name" → "x-list" / "x-order" / "x-edit";
// "x-sort-date", "x-filtered-by-y" → "x". null for a base screen.
function baseOf(slug) {
  const i = slug.lastIndexOf('--');
  if (i > 0) return slug.slice(0, i);
  const m = /-(sort-|filtered-by)|-(list|order|edit)-\d+/.exec(slug);
  if (!m || m.index === 0) return null;
  return m[2] ? slug.slice(0, m.index + 1 + m[2].length) : slug.slice(0, m.index);
}

// What one query word is worth in one entry: per field, full weight for an
// exact token, half for a prefix, 0.3 for a substring of 4+ letters.
function wordHit(f, w) {
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
  return got;
}

function fieldsOf(e) {
  return { slug: toks(e.slug), topics: toks(topicsOf(e).join(' ')), shows: toks(e.shows), category: toks(e.category) };
}

// How rare each query word is in a corpus: log(1 + N / (1 + df)), df = the
// entries the word hits at all. One pack's index normally; every pack's at
// once for --all-packs, so scores stay comparable across packs.
function idfFor(entries, words) {
  const df = words.map(() => 0);
  for (const e of entries) {
    const f = fieldsOf(e);
    words.forEach((w, i) => { if (wordHit(f, w)) df[i]++; });
  }
  return df.map((d) => Math.log(1 + entries.length / (1 + d)));
}

// Scores for every entry of a pack at once (the IDF needs the whole pack).
// `words` are tokens from toks(). Returns one number per entry.
function scoreAll(entries, words, idf = idfFor(entries, words)) {
  const hits = entries.map((e) => { const f = fieldsOf(e); return words.map((w) => wordHit(f, w)); });
  const raw = entries.map((e, j) => {
    if (!words.length) return 0;
    let sum = 0;
    let hit = 0;
    hits[j].forEach((g, i) => { sum += g * idf[i]; if (g) hit++; });
    return sum * (0.4 + 0.6 * hit / words.length);
  });
  const bySlug = new Map(entries.map((e, j) => [String(e.slug), raw[j]]));
  return raw.map((s, j) => {
    const slug = String(entries[j].slug);
    const w = (isVariant(slug) ? 0.9 : 1) * (isRecord(slug) ? 0.8 : 1);
    if (w === 1) return s;
    let b = baseOf(slug);
    while (b && !bySlug.has(b)) b = baseOf(b);
    return b && bySlug.get(b) > 0 ? s * w : s;
  });
}

// The raw query as one lowercase substring, the tools' matching before the
// port: an entry it finds is never dropped (a pasted "frontend/page" or a
// slug fragment keeps finding what it found).
function substringHit(e, q) {
  const needle = String(q || '').toLowerCase();
  if (!needle) return false;
  return [e.slug, e.shows, e.category, ...topicsOf(e)].some((v) => String(v || '').toLowerCase().includes(needle));
}

// Index entries ranked for a query (a string, or tokens from toks()): highest
// score first, a bare screen before a state capture at equal score, then slug
// order. Returns [{ entry, score }] for every entry with a score or a
// substring hit. `idf` (from idfFor over a wider corpus) replaces the pack's own.
function rank(entries, query, { idf } = {}) {
  const words = Array.isArray(query) ? query : toks(query);
  const scores = scoreAll(entries, words, idf);
  const out = [];
  entries.forEach((e, i) => {
    let s = Math.round(scores[i] * 100) / 100;
    if (!s && !Array.isArray(query) && substringHit(e, query)) s = 0.01;
    if (s > 0) out.push({ entry: e, score: s });
  });
  out.sort((a, b) => b.score - a.score || depth(String(a.entry.slug)) - depth(String(b.entry.slug))
    || String(a.entry.slug).localeCompare(String(b.entry.slug)));
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

function readJson(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; }
}

// The names a pack answers to, as token lists: its key ("wp-mail-smtp" →
// wp mail smtp), the display name from products/<key>/pack.json `name` or
// product.json `displayName` minus an edition suffix ("Duplicator Pro" →
// duplicator), and every pack.json / product.json `aliases` entry. Data, not
// code: no product name is spelled in the tools.
function packNames(p) {
  const dir = path.dirname(p.root);
  const pack = readJson(path.join(dir, 'pack.json')) || {};
  const prod = readJson(path.join(dir, 'product.json')) || {};
  const names = [p.key, pack.name || prod.displayName || '', ...(pack.aliases || []), ...(prod.aliases || [])];
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const t = toks(n);
    if (t.length > 1 && /^(pro|lite)$/.test(t[t.length - 1])) t.pop();
    const k = t.join(' ');
    if (t.length && !seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

// The pack a query names, if any: the longest pack name that appears in the
// query as a run of words ("WP Mail SMTP dashboard" → wp-mail-smtp; the
// product's own name beats a shorter one it contains). Returns
// { key, name, rest } where rest is the query's other words, or null.
function packHint(query, packList = packs()) {
  const q = toks(query);
  let best = null;
  for (const p of packList) {
    for (const name of packNames(p)) {
      for (let i = 0; i + name.length <= q.length; i++) {
        if (name.every((t, k) => q[i + k] === t) && (!best || name.length > best.name.length)) {
          best = { key: p.key, name, rest: [...q.slice(0, i), ...q.slice(i + name.length)] };
        }
      }
    }
  }
  return best;
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

module.exports = { stem, toks, idfFor, scoreAll, rank, baseOf, substringHit, packs, loadIndex, packNames, packHint, packOf, packsWithSlug, missingSlugHint, WEIGHT };
