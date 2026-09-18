#!/usr/bin/env node
// pick-reference.mjs <library-folder> --need "<what the film has to do>" [--top 3] [--library <path to reference-motion-spec/scripts/library.mjs>]
//
// Ranks the motion specs in a library folder for a need and prints the top matches with one
// reason each (the need's words that matched the spec's tags / use_when / signature) and the
// spec's use_when line. Wraps the reference-motion-spec skill's library.mjs --query (which writes
// catalog.json and examples-by-kind.md into the library folder and prints its own ranking);
// this script adds the per-match reason and the storyboard command to run next.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, usage, readJson, exists, findSkill1Script, skill1Missing } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { need: 'string', top: 'number', library: 'string' });
const lib = args._[0];
if (!lib || !args.need) usage('usage: pick-reference.mjs <library-folder> --need "<need>" [--top 3] [--library <path>]');
const libAbs = path.resolve(lib);
if (!exists(libAbs)) usage('library folder not found: ' + libAbs);
const libraryScript = findSkill1Script('library.mjs', args.library);
if (!libraryScript) usage(skill1Missing('library.mjs'));

const catalogFile = path.join(libAbs, 'catalog.json');
// cwd = the library folder: library.mjs writes each entry's `spec` path relative to its cwd, and the
// paths below resolve against the library folder.
const r = spawnSync(process.execPath, [libraryScript, '.', '--query', args.need, '--out', catalogFile], { encoding: 'utf8', windowsHide: true, cwd: libAbs });
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(r.status || 1); }
if (!exists(catalogFile)) usage('library.mjs did not write ' + catalogFile);
const catalog = readJson(catalogFile);
if (!catalog.entries?.length) usage('the library has no motion-spec.json under ' + libAbs + ' — the library is what real analyses leave behind');

const words = args.need.toLowerCase().split(/[,;]+/).map(x => x.trim()).filter(Boolean);
const scored = catalog.entries.map(e => {
  const hay = [...(e.tags || []), e.use_when || '', e.signature || '', e.lens || ''].join(' | ').toLowerCase();
  const matched = words.filter(w => hay.includes(w));
  return { e, matched, score: matched.length };
}).filter(x => x.score > 0).sort((a, b) => b.score - a.score || (a.e.duration ?? 0) - (b.e.duration ?? 0) || a.e.id.localeCompare(b.e.id));

const top = args.top || 3;
if (!scored.length) { console.log(`no spec in ${libAbs} matches "${args.need}" (${catalog.entries.length} specs indexed). Try fewer, plainer words: the tags are seam kinds, text mechanisms, "fixed lens" / "moving lens", "cursor", "typing", "host element", motifs.`); process.exit(0); }
console.log(`${catalog.entries.length} specs indexed in ${libAbs}; top ${Math.min(top, scored.length)} for "${args.need}":`, '');
scored.slice(0, top).forEach(({ e, matched, score }, i) => {
  console.log(`${i + 1}. ${e.id}  —  ${e.duration ?? '?'} s · ${e.scenes ?? '?'} scenes · ${e.seams ?? '?'} seams · ${e.lens}`);
  console.log(`   because: matched ${score}/${words.length} — ${matched.join(', ')}`);
  if (e.use_when) console.log(`   use when: ${e.use_when}`);
  console.log(`   spec: ${path.resolve(libAbs, e.spec)}`);
  console.log('');
});
console.log(`next: node scripts/scene-map.mjs "${path.resolve(libAbs, scored[0].e.spec)}" --topic "<topic>"   (or say which number)`);
