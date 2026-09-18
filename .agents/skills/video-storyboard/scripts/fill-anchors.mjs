#!/usr/bin/env node
// fill-anchors.mjs <folder> --snapshots <root> [--list]
//
// After the snapshots exist: turns the storyboard's prose anchors and press targets into page px
// and selectors, from each snapshot's measured `targets.json` (html-snapshot's targets.mjs).
//
//   --list   print, per snapshot folder, the words the storyboard uses that targets.json must
//            map to a selector (the anchor of every kept row on that screen × state, and every
//            trigger target). Write those keys into <snapshot>/targets.json with a selector each,
//            run `targets.mjs <slug>` there, then run this script without --list.
//   default  fill `our.anchor_px` + `our.anchor_selector`, every trigger's `selector` + `px`,
//            and `our.mount` (capture width, document height) from meta.json. Re-render the
//            storyboard and the brief afterwards; the validator warns on what is still unfilled.
//
// A snapshot folder is `<root>/<screen>--<state>` or `<root>/<screen>` (state "default"), the
// layout html-snapshot's states produce. Matching is by words, case-insensitive, trimmed.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, loadMap, isEditorial } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { snapshots: 'string', list: 'boolean' });
if (!args._[0] || !args.snapshots) usage('usage: fill-anchors.mjs <folder> --snapshots <root> [--list]');
const { folder, mapFile, map } = loadMap(args._[0]);
const root = path.resolve(args.snapshots);
const rows = map.rows || [];
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const stateOf = r => ((r.our?.state || '').trim() || 'default').replace(/\s.*$/, '');
const folderOf = r => {
  const screen = (r.our?.screen || '').trim(); const state = stateOf(r);
  const cands = state !== 'default' ? [`${screen}--${state}`, screen] : [screen];
  return cands.map(c => path.join(root, c)).find(p => fs.existsSync(path.join(p, 'index.html'))) || null;
};
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const perFolder = new Map();
for (const r of rows) {
  if (r.our?.status === 'dropped' || isEditorial(r) || !(r.our?.screen || '').trim()) continue;
  const f = folderOf(r);
  const key = f || `${r.our.screen} / ${stateOf(r)} (NO SNAPSHOT under ${root})`;
  if (!perFolder.has(key)) perFolder.set(key, { folder: f, rows: [], words: new Set() });
  const e = perFolder.get(key); e.rows.push(r);
  if ((r.our.anchor || '').trim()) e.words.add(r.our.anchor.trim());
  for (const a of (r.our.landing_anchors || [])) if ((a?.anchor || '').trim()) e.words.add(String(a.anchor).trim());
  for (const t of (r.our.triggers || [])) if (t?.target) e.words.add(String(t.target).trim());
}

if (args.list) {
  for (const [key, e] of perFolder) {
    console.log(`${e.folder ? path.relative(process.cwd(), e.folder) : key}  (${e.rows.map(r => r.ref_scene).join(', ')})`);
    const have = e.folder ? readJson(path.join(e.folder, 'targets.json')) || {} : {};
    for (const w of e.words) { const h = Object.keys(have).find(k => norm(k) === norm(w)); console.log(`  ${h ? (have[h]?.found ? 'ok  ' : (have[h]?.selector ? 'unmeasured' : 'todo')) : 'todo'} "${w}"`); }
  }
  console.log('\nWrite each "todo" into that folder\'s targets.json as { "<words>": "<css selector>" }, run html-snapshot\'s targets.mjs <slug> --root <root>, then run fill-anchors.mjs without --list.');
  process.exit(0);
}

let filled = 0, unfilled = 0, mounts = 0;
for (const [, e] of perFolder) {
  const targets = e.folder ? readJson(path.join(e.folder, 'targets.json')) || {} : {};
  const meta = e.folder ? readJson(path.join(e.folder, 'meta.json')) || {} : {};
  const lookup = w => { const k = Object.keys(targets).find(k => k !== '_meta' && norm(k) === norm(w)); return k && targets[k]?.found ? targets[k] : null; };
  for (const r of e.rows) {
    const o = r.our;
    if (e.folder && meta.viewport) { o.mount = { folder: path.relative(path.dirname(root), e.folder).replace(/\\/g, '/'), width: meta.viewport.width, height: meta.viewport.height, doc_height: meta.doc_height ?? null }; mounts++; }
    if ((o.anchor || '').trim()) {
      const m = lookup(o.anchor);
      if (m) { o.anchor_px = m.center; o.anchor_selector = m.text ? `${m.selector} (text: ${m.text})` : m.selector; o.anchor_box = m.box; filled++; if (m.tiny) console.log(`tiny     ${r.ref_scene}: anchor "${o.anchor}" measured ${m.box.w}×${m.box.h} — the selector points at a hidden input or a screen-reader element; re-point targets.json at the visible one`); }
      else { unfilled++; console.log(`unfilled ${r.ref_scene}: anchor "${o.anchor}" — ${e.folder ? 'not in ' + path.join(e.folder, 'targets.json') : 'no snapshot folder'}`); }
    }
    for (const a of (o.landing_anchors || [])) {
      if (!(a?.anchor || '').trim()) continue;
      const m = lookup(a.anchor);
      if (m) { a.anchor_px = m.center; a.anchor_selector = m.text ? `${m.selector} (text: ${m.text})` : m.selector; a.anchor_box = m.box; filled++; }
      else { unfilled++; console.log(`unfilled ${r.ref_scene}: landing ${a.t} anchor "${a.anchor}" — ${e.folder ? 'not in targets.json' : 'no snapshot folder'}`); }
    }
    for (const t of (o.triggers || [])) {
      if (!t?.target) continue;
      const m = lookup(t.target);
      if (m) { t.selector = m.text ? `${m.selector} (text: ${m.text})` : m.selector; t.px = m.center; filled++; if (m.tiny) console.log(`tiny     ${r.ref_scene}: trigger "${t.target}" measured ${m.box.w}×${m.box.h} — re-point targets.json at the visible element`); }
      else { unfilled++; console.log(`unfilled ${r.ref_scene}: trigger "${t.target}" — ${e.folder ? 'not in targets.json' : 'no snapshot folder'}`); }
    }
  }
}
fs.writeFileSync(mapFile, JSON.stringify(map, null, 2) + '\n');
console.log(`fill-anchors: ${filled} filled, ${unfilled} unfilled, ${mounts} row mount(s) recorded → ${path.basename(mapFile)}. Re-render: render-storyboard.mjs, render-brief.mjs.`);
if (unfilled) process.exitCode = 2;
