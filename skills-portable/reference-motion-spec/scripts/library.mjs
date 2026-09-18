#!/usr/bin/env node
// library.mjs <spec.json | folder> [more...] [--out catalog.json] [--examples examples-by-kind.md] [--query "word pop, fixed lens"]
//
// Indexes many motion-spec.json files into one catalog.json so a reference can be picked by
// need instead of by memory. Folders are scanned recursively for motion-spec.json. The library is
// a by-product: every <clip>-motion-spec/ folder produced for real work lands in one shared folder
// and this script re-indexes it. Two outputs:
//   catalog.json          one entry per spec: tags, seam kinds, camera verbs, text mechanisms, lens,
//                         host element, signature, and meta.use_when (what the clip is good for)
//   examples-by-kind.md   for every seam kind, text mechanism, camera verb and UI motion in the
//                         vocabulary: the clips + strips + tiles that show it ("blur push -> <clip>
//                         w-2.80 tiles 6-11"), so a builder opens a real example instead of a
//                         definition; vocabulary entries with no example yet are listed as such
// --query ranks the catalog by tag overlap (tags, use_when, signature, lens) and prints the top
// matches with their use_when (no file written unless --out).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJson, writeJson } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2), { out: 'string', examples: 'string', query: 'string' });
if (!args._.length) { console.error('usage: library.mjs <spec.json | folder> [...] [--out catalog.json] [--examples examples-by-kind.md] [--query "tags, words"]'); process.exit(1); }

const files = [];
for (const p of args._) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) { console.error('not found: ' + abs); continue; }
  if (fs.statSync(abs).isDirectory()) walk(abs, files); else files.push(abs);
}
function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(f, acc); }
    else if (e.name === 'motion-spec.json') acc.push(f);
  }
}

const entries = files.map(f => {
  const s = readJson(f);
  const seams = s.seams || [], landings = s.camera?.landings || [];
  const seamKinds = hist(seams.map(x => x.kind));
  const verbs = hist(landings.map(x => x.move_in));
  const textMech = hist((s.text_motion || []).map(x => x.mechanism));
  const lensMoves = Number.isInteger(s.camera?.lens_moves) ? s.camera.lens_moves : landings.filter(l => l.move_in !== 'cut' && l.move_in !== 'hold').length;
  const fixedLens = lensMoves === 0;
  const tags = uniq([
    fixedLens ? 'fixed lens' : 'moving lens',
    ...Object.keys(seamKinds),
    ...Object.keys(textMech).map(m => m + ' text'),
    s.ui_motion?.cursor_present ? 'cursor' : 'no cursor',
    (s.ui_motion?.typing_beats || []).length ? 'typing' : null,
    s.identity?.brand_role ? `brand as ${s.identity.brand_role}` : null,
    s.identity?.host_element && s.identity.host_element !== 'none' ? 'host element' : null,
    s.sound?.present === false ? 'silent' : null,
    s.meta?.presentation_chrome && !/^none/i.test(s.meta.presentation_chrome) ? 'presentation chrome' : null,
    ...(s.grammar?.motifs || []),
    ...(s.structure?.acts || []).filter(a => /repeat|cycle/i.test(a.note || a.name)).map(() => 'repeated cycle'),
  ]);
  return {
    id: path.basename(path.dirname(f)),
    spec: path.relative(process.cwd(), f).replace(/\\/g, '/'),
    duration: s.meta?.duration ?? null,
    aspect: s.meta?.aspect ?? null,
    fps: s.meta?.fps ?? null,
    lens: fixedLens ? 'fixed' : `${s.camera?.ease_voice ?? 'moving'} · ${lensMoves} lens move(s) · ${s.camera?.cadence_landings_per_s ?? '?'} landings/s`,
    lens_moves: lensMoves,
    scenes: (s.structure?.scenes || []).length,
    seams: seams.length,
    seam_kinds: seamKinds,
    camera_verbs: verbs,
    text_mechanisms: textMech,
    longest_hold: s.pacing?.longest_hold ?? null,
    cursor: Boolean(s.ui_motion?.cursor_present),
    host_element: s.identity?.host_element ?? null,
    signature: (s.structure?.acts || []).map(a => a.name).join(' → ') || null,
    use_when: s.meta?.use_when ?? null,
    tags,
  };
});

const catalog = { version: 1, count: entries.length, entries: entries.sort((a, b) => a.id.localeCompare(b.id)) };

if (args.query) {
  const q = args.query.toLowerCase().split(/[,;]+/).map(x => x.trim()).filter(Boolean);
  const scored = entries.map(e => {
    const hay = [...e.tags, e.use_when || '', e.signature || '', e.lens].join(' | ').toLowerCase();
    const score = q.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
    return { e, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));
  if (!scored.length) console.log('no matches for: ' + q.join(', '));
  for (const { e, score } of scored.slice(0, 10)) {
    console.log(`${score}/${q.length}  ${e.id}  ${e.duration}s  ${e.lens}  [${e.tags.join(', ')}]`);
    if (e.use_when) console.log(`           use when: ${e.use_when}`);
  }
}

if (args.out || !args.query) {
  const out = path.resolve(args.out || 'catalog.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeJson(out, catalog);
  console.log(`wrote ${out} (${entries.length} specs)`);
  const exOut = path.resolve(args.examples || path.join(path.dirname(out), 'examples-by-kind.md'));
  fs.writeFileSync(exOut, examplesByKind(files), 'utf8');
  console.log(`wrote ${exOut}`);
}

// ---------------- examples-by-kind.md ----------------
// One section per vocabulary family. Each kind lists every clip that shows it with the strip / sheet
// and tiles the spec cites (the first w- strip when there is one, else the first citation), so the
// example is a picture, not a definition. Kinds with no example are listed so the gap is visible.
function examplesByKind(specFiles) {
  const seamKinds = [], textMechs = [];
  try {
    const schema = readJson(path.join(here, '..', 'references', 'spec-schema.json'));
    seamKinds.push(...(schema.definitions?.seam?.properties?.kind?.enum || []));
    textMechs.push(...(schema.properties?.text_motion?.items?.properties?.mechanism?.enum || []));
  } catch { /* schema missing: only the kinds seen in specs are listed */ }
  const verbs = ['cut', 'snap', 'glide', 'push', 'pull', 'whip', 'anticipate', 'drift', 'hold', 'track', 'punch', 'blur push'];
  const ui = ['click', 'typing', 'dropdown', 'card rise', 'payoff'];
  const fam = { seam: new Map(), text: new Map(), verb: new Map(), ui: new Map() };
  const add = (m, kind, ex) => { if (!kind) return; if (!m.has(kind)) m.set(kind, []); m.get(kind).push(ex); };
  const cite = ev => {
    const list = Array.isArray(ev) ? ev : [];
    const w = list.find(e => typeof e.sheet === 'string' && e.sheet.startsWith('w-')) || list[0];
    if (!w) return '(no citation)';
    const t = w.tiles || [];
    const contiguous = t.length > 2 && t[t.length - 1] - t[0] === t.length - 1;
    const range = t.length ? (contiguous ? `tiles ${t[0]}-${t[t.length - 1]}` : 'tiles ' + t.join(',')) : '';
    return `${w.sheet} ${range}`.trim();
  };
  for (const f of specFiles) {
    const s = readJson(f);
    const id = path.basename(path.dirname(f));
    for (const x of s.seams || []) add(fam.seam, x.kind, `${id} · t ${x.t} · ${x.frames_24 ?? '?'} f · ${cite(x.evidence)}${x.twin_of ? ' (twin)' : ''}`);
    for (const x of s.text_motion || []) add(fam.text, x.mechanism, `${id} · t ${x.t} · ${x.text_role || ''} · ${cite(x.evidence)}`);
    for (const x of s.camera?.landings || []) add(fam.verb, x.move_in, `${id} · t ${x.t} · ${x.subject || ''} · ${cite(x.evidence)}`);
    const u = s.ui_motion || {};
    for (const x of u.clicks || []) add(fam.ui, 'click', `${id} · t ${x.t} · ${x.target || ''} · ${x.reaction || ''} · ${cite(x.evidence)}`);
    for (const x of u.typing_beats || []) add(fam.ui, 'typing', `${id} · ${x.in}-${x.out} · ${x.cadence || ''} · ${cite(x.evidence)}`);
    for (const x of u.dropdowns || []) add(fam.ui, 'dropdown', `${id} · t ${x.t} · ${cite(x.evidence)}`);
    for (const x of u.card_rises || []) add(fam.ui, 'card rise', `${id} · t ${x.t} · ${cite(x.evidence)}`);
    for (const x of u.payoffs || []) add(fam.ui, 'payoff', `${id} · t ${x.t} · ${x.emphasis || ''} · ${x.what || ''} · ${cite(x.evidence)}`);
  }
  const L = ['# Examples by kind', '', `Generated by library.mjs from ${specFiles.length} spec(s). Each line: clip · time · frames · the strip and tiles the spec cites. Open the strip; that is the example.`, ''];
  const section = (title, m, known) => {
    L.push('## ' + title, '');
    for (const k of uniq([...known, ...m.keys()])) {
      const ex = m.get(k) || [];
      L.push(`### ${k}`);
      if (!ex.length) L.push('- no example yet');
      else for (const e of ex) L.push('- ' + e);
      L.push('');
    }
  };
  section('Seams', fam.seam, seamKinds.filter(k => k !== 'other'));
  section('Text reveals', fam.text, textMechs.filter(k => k !== 'other'));
  section('Camera verbs (move_in)', fam.verb, verbs);
  section('UI motion', fam.ui, ui);
  return L.join('\n') + '\n';
}

function hist(arr) { const h = {}; for (const k of arr) if (k) h[k] = (h[k] || 0) + 1; return Object.fromEntries(Object.entries(h).sort()); }
function uniq(a) { return [...new Set(a.filter(Boolean))]; }
