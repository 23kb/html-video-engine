#!/usr/bin/env node
// validate-storyboard.mjs <folder> [--tolerance 0.05]
//
// Checks a storyboard folder (scene-map.json, screens-needed.json, storyboard.md) before it is
// handed to a human or a build. Prints one line per finding and a summary
// "validate-storyboard: E errors, W warnings"; exits 1 on errors. Every rule is a defect that
// shipped once:
//   - every row cites a reference scene id that exists in the spec, or carries OVERRIDE with a reason
//   - every kept row says what is visible (a reader who has not seen the film can say what is on screen)
//   - the copy table covers every text beat in the map, and every cited copy id exists
//   - the camera plan header is present and equal to the spec's (the reference decided the cadence)
//   - every screen × state in the map exists in screens-needed.json
//   - the kept durations sum to the target length within the tolerance
//   - storyboard.md is rendered from the map (sections present, in order; header numbers, copy, rows match)

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, loadMap, resolveSpec, readJson, exists, timeline, copyById, isEditorial, STATUSES, t2, fpsOf, triggersOf } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { tolerance: 'number' });
if (!args._[0]) usage('usage: validate-storyboard.mjs <folder> [--tolerance 0.05]');
const tol = args.tolerance ?? 0.05;
let E = 0, W = 0;
const err = m => { E++; console.log('ERROR  ' + m); };
const warn = m => { W++; console.log('WARN   ' + m); };
const ok = m => console.log('ok     ' + m);
const notRun = m => { W++; console.log('NOT RUN ' + m); };

let folder, map;
try { ({ folder, map } = loadMap(args._[0])); } catch (e) { console.log('ERROR  ' + e.message); console.log('validate-storyboard: 1 errors, 0 warnings'); process.exit(1); }
const rows = map.rows || [];
// The gate's three angles are part of the record: names AND one-line summaries.
{ const opts = map.angle?.options || []; if (opts.length && opts.some(o => !o.summary || !String(o.summary).trim())) warn('angle.options: an offered angle has no summary - persist each angle offered at the gate as {name, summary} (one line) so the storyboard shows what was chosen against'); if (map.angle && !String(map.angle.text || '').trim()) warn('angle.text is empty - the picked angle, one paragraph'); }
// Every open question states the default the build takes until it is answered.
for (const [i, q] of (map.open_questions || []).entries()) if (!/default/i.test(String(q))) warn(`open_questions[${i}]: no default - end it with "— default: …" so the build can start without the answer`);
// Ours, not the reference's: every build asked for our palette, type and logo.
{ const io = map.identity_ours || {}; if (!(io.palette || []).length || !(io.type || []).length) warn('identity_ours: palette and type are empty - the brief\'s Identity is the reference\'s until these are filled (hex list, font families, logo asset)'); }
// A morph cannot cross documents: a seam whose carrier goes from real UI to editorial (or back) needs a clone / raster of the carrier.
{ const kept = rows.filter(r => r.our?.status !== 'dropped'); for (let i = 0; i < kept.length - 1; i++) { const a = kept[i], b = kept[i + 1]; const kind = String(a.seam_out?.kind || ''); if (/flip morph|match cut|melt/i.test(kind) && isEditorial(a) !== isEditorial(b) && !/clone|raster|image copy|screenshot|png|snapshot copy/i.test(String(a.our?.motion || '') + ' ' + String(a.our?.carrier || ''))) warn(`${a.ref_scene}: seam "${kind}" crosses surfaces (${isEditorial(a) ? 'editorial' : 'real UI'} -> ${isEditorial(b) ? 'editorial' : 'real UI'}) - a morph cannot cross documents; note the clone / raster of the carrier in our.motion`); } }
// Landings need numbers: a kept real-UI row whose anchor is prose only was never measured.
{ const un = rows.filter(r => r.our?.status !== 'dropped' && !isEditorial(r) && (r.our?.anchor || '').trim() && !Array.isArray(r.our?.anchor_px)); if (un.length) warn(`${un.length} row(s) have an anchor but no anchor_px (${un.map(r => r.ref_scene).join(', ')}) - after the snapshots exist run fill-anchors.mjs --snapshots <root>`); }
// A scene with more than one landing lands on more than one element: every landing after the first needs its own anchor.
{ const multi = rows.filter(r => r.our?.status !== 'dropped' && !isEditorial(r) && (r.landings || []).length > 1 && ((r.our?.landing_anchors || []).filter(a => (a?.anchor || '').trim()).length < (r.landings || []).length)); if (multi.length) warn(`${multi.length} row(s) have several landings but not an anchor per landing (${multi.map(r => r.ref_scene).join(', ')}) - fill our.landing_anchors[].anchor (a glide lands on a different element than the cut it left)`); }
if (map.version !== 1) err(`scene-map.json version ${map.version} (expected 1)`);
if (!rows.length) err('scene-map.json has no rows');

// ---- spec ----
const { file: specFile, spec } = resolveSpec(map, folder);
const specScenes = new Set((spec?.structure?.scenes || []).map(s => s.id));
if (!spec) notRun(`spec cross-check: motion-spec.json not reachable at ${specFile || '(no spec.path)'} — reference scene ids and the camera header are checked against the map only`);

// ---- rows ----
const tl = timeline(map);
const fps = fpsOf(map);
const copies = copyById(map);
const cited = new Set();
let keptCount = 0;
rows.forEach((r, i) => {
  const id = r.ref_scene || `row ${i + 1}`;
  const o = r.our || {};
  if (!STATUSES.includes(o.status)) { err(`${id}: our.status "${o.status}" is not one of ${STATUSES.join(' / ')}`); return; }
  if ((o.status === 'override' || o.status === 'added') && !(o.override_reason || '').trim()) err(`${id}: status ${o.status} needs an override_reason (never dress an invention in a citation)`);
  if (o.status === 'added' && r.ref_scene) err(`${id}: an added row must not cite a reference scene (use override when it maps to one)`);
  if (o.status !== 'added' && !r.ref_scene) err(`row ${i + 1}: no ref_scene and status is not "added"`);
  if (r.ref_scene && spec && !specScenes.has(r.ref_scene)) err(`${id}: reference scene not in the spec (${[...specScenes].join(', ')})`);
  if (o.status === 'dropped') { if (!(o.note || o.override_reason || '').trim()) warn(`${id}: dropped without a note saying why`); return; }
  keptCount++;
  if (!(o.visible || '').trim()) err(`${id}: our.visible is empty — a reader must be able to say what is on screen`);
  if (!(o.screen || '').trim()) err(`${id}: our.screen is empty (use "editorial" for a scene with no captured screen)`);
  if (!isEditorial(r)) {
    if (!(o.state || '').trim()) warn(`${id}: our.state is empty for screen ${o.screen} — "default" is assumed; name the state`);
    if (!(o.surface || '').trim()) warn(`${id}: our.surface is empty for screen ${o.screen} — the capture route cannot be chosen`);
  }
  if ((r.ref_hold_carrier || '').trim() && !(o.motion || '').trim()) warn(`${id}: the reference scene is alive (${r.ref_hold_carrier.slice(0, 60)}…) and our.motion is empty — a still in a live scene reads as "not the reference"`);
  if (r.seam_out && rows.slice(i + 1).some((x, j) => !tl.times[i + 1 + j].dropped) && !(o.carrier || '').trim()) warn(`${id}: our.carrier is empty across the seam out (${r.seam_out.kind}) — say what of ours stays continuous`);
  // triggers, results, overlaps (a build asks for these after the fact)
  const trig = triggersOf(r, tl, fps);
  const presses = trig.filter(x => /press|click/i.test(x.action || 'press'));
  const refClicks = (r.ui?.clicks || []).length;
  const ownClicks = /\bclick|press/i.test(o.motion || '');
  if ((refClicks || ownClicks) && !presses.length) warn(`${id}: the scene has a click (${refClicks ? `${refClicks} in the reference` : 'in our.motion'}) and no press trigger — add our.triggers [{action:"press", ref_t | t, target}]`);
  for (const x of presses) if (x.t == null) warn(`${id}: trigger "${x.target || x.action}" has no press frame (set t, or ref_t inside the reference scene)`);
  if ((r.ui?.payoffs || []).length && !(o.in_frame_at_result || '').trim()) warn(`${id}: the reference has ${(r.ui?.payoffs || []).length} payoff(s) here and our.in_frame_at_result is empty — say what must be in frame when it lands (the cursor that caused it, the whole card, data that is not flat)`);
  if ((r.landings || []).length && !isEditorial(r) && !(o.anchor || '').trim()) warn(`${id}: a landing sits in this scene and our.anchor is empty — name the element to centre (a rig tool keys the anchor as a page point)`);
  for (const c of o.copy || []) { if (!copies.has(c)) err(`${id}: cites copy id ${c} which is not in the copy table`); cited.add(c); }
  if ((r.text_beats || []).length && !(o.copy || []).length && !(o.no_text_reason || '').trim()) err(`${id}: the reference has ${(r.text_beats || []).length} text beat(s) here and the row cites no copy (add copy ids, or our.no_text_reason)`);
  const dur = Number(o.duration);
  if (!(dur > 0)) err(`${id}: our.duration must be > 0 for a kept row`);
  if (o.in != null && Math.abs(Number(o.in) - tl.times[i].in) > 0.05) warn(`${id}: our.in ${o.in} disagrees with the derived start ${tl.times[i].in} (rows run back to back; "in" is derived)`);
});
if (keptCount) ok(`${keptCount} of ${rows.length} rows kept; ${rows.filter(r => r.our?.status === 'override').length} override, ${rows.filter(r => r.our?.status === 'added').length} added, ${rows.filter(r => r.our?.status === 'dropped').length} dropped`);

// ---- copy ----
const ids = new Set();
for (const c of map.copy || []) {
  if (!c.id || !(c.text || '').trim()) err(`copy row without id or text: ${JSON.stringify(c).slice(0, 80)}`);
  if (ids.has(c.id)) err(`duplicate copy id ${c.id}`);
  ids.add(c.id);
  if (!cited.has(c.id)) warn(`copy ${c.id} “${(c.text || '').slice(0, 40)}” is cited by no scene row`);
}
if ((map.copy || []).length) ok(`${map.copy.length} copy rows, ${cited.size} cited`);
else if (keptCount) warn('the copy table is empty');

// ---- time ----
const target = Number(map.target?.length);
if (!(target > 0)) err('target.length missing');
else {
  const diff = Math.abs(tl.total - target) / target;
  if (diff > tol) err(`kept durations sum to ${t2(tl.total)} s; target ${t2(target)} s (${(diff * 100).toFixed(1)} % off, tolerance ${tol * 100} %)`);
  else ok(`durations sum to ${t2(tl.total)} s against ${t2(target)} s`);
}

// ---- camera header ----
const cam = map.camera || {};
const CAM = ['cadence_landings_per_s', 'lens_moves', 'max_hold', 'ease_voice', 'zoom_range'];
for (const k of CAM) if (cam[k] == null) err(`camera.${k} missing from the map`);
if (spec?.camera) {
  const sc = spec.camera;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const k of CAM) {
    const specVal = k === 'lens_moves' && !Number.isInteger(sc.lens_moves) ? (sc.landings || []).filter(l => l.move_in !== 'cut' && l.move_in !== 'hold').length : sc[k];
    if (cam[k] != null && specVal != null && !same(cam[k], specVal)) err(`camera.${k} in the map (${JSON.stringify(cam[k])}) differs from the spec (${JSON.stringify(specVal)}) — the header is copied, never edited`);
  }
  ok('camera header equals the spec');
}

// ---- screens ----
const screensFile = path.join(folder, 'screens-needed.json');
const needs = new Map();
rows.forEach(r => { if (r.our?.status === 'dropped' || isEditorial(r)) return; const k = `${r.our.screen.trim()}::${(r.our.state || '').trim() || 'default'}`; if (!needs.has(k)) needs.set(k, []); needs.get(k).push(r.ref_scene); });
let screens = null;
if (!exists(screensFile)) { if (needs.size) err(`screens-needed.json missing and the map names ${needs.size} screen × state pair(s) — run screens.mjs`); else ok('no screens needed (all editorial)'); }
else {
  screens = readJson(screensFile);
  const have = new Set((screens.screens || []).map(s => `${s.slug}::${s.state || 'default'}`));
  for (const [k, sc] of needs) if (!have.has(k)) err(`screen × state ${k.replace('::', ' / ')} (scenes ${sc.join(', ')}) is not in screens-needed.json — re-run screens.mjs`);
  for (const k of have) if (!needs.has(k)) warn(`screens-needed.json lists ${k.replace('::', ' / ')} which no row needs any more (stale) — re-run screens.mjs`);
  if (needs.size && [...needs.keys()].every(k => have.has(k))) ok(`${needs.size} screen × state pair(s) all in screens-needed.json`);
  if (map.profile && screens.profile !== map.profile) warn(`screens-needed.json was built with profile ${screens.profile || 'none'}; the map says ${map.profile}`);
}

// ---- storyboard.md ----
const sbFile = path.join(folder, 'storyboard.md');
if (!exists(sbFile)) err('storyboard.md missing — run render-storyboard.mjs');
else {
  const sb = fs.readFileSync(sbFile, 'utf8');
  const SECTIONS = ['## Angle', '## Literal copy', '## Scene map', '### Triggers, results and overlaps', '## Screens and states needed', '## Camera plan', '## Seam ledger', '## OVERRIDE list', '## Open questions'];
  let last = -1, inOrder = true;
  for (const h of SECTIONS) { const at = sb.indexOf('\n' + h); if (at < 0) { err(`storyboard.md: section "${h}" missing`); inOrder = false; } else if (at < last) { err(`storyboard.md: section "${h}" out of order`); inOrder = false; } else last = at; }
  if (inOrder) ok('storyboard.md sections present and in order');
  if (!/^\*\*Status:\*\*\s*DRAFT/m.test(sb)) warn('storyboard.md status is not DRAFT — only a human may write anything else');
  const line = k => (sb.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1];
  const cadLine = line('Cadence'), lensLine = line('Lens moves'), holdLine = line('Max hold'), easeLine = line('Ease voice'), zoomLine = line('Zoom range');
  if (!cadLine || !lensLine || !holdLine || !easeLine || !zoomLine) err('storyboard.md camera plan: Cadence / Lens moves / Max hold / Ease voice / Zoom range lines must all be present');
  else {
    const num = s => Number((s.match(/-?\d+(\.\d+)?/) || [])[0]);
    if (cam.cadence_landings_per_s != null && Math.abs(num(cadLine) - cam.cadence_landings_per_s) > 0.006) err(`storyboard.md Cadence (${num(cadLine)}) ≠ map (${cam.cadence_landings_per_s})`);
    if (cam.lens_moves != null && num(lensLine) !== cam.lens_moves) err(`storyboard.md Lens moves (${num(lensLine)}) ≠ map (${cam.lens_moves})`);
    if (cam.max_hold != null && Math.abs(num(holdLine) - cam.max_hold) > 0.006) err(`storyboard.md Max hold (${num(holdLine)}) ≠ map (${cam.max_hold})`);
    if (cam.ease_voice != null && !easeLine.startsWith(String(cam.ease_voice))) err(`storyboard.md Ease voice ("${easeLine}") ≠ map ("${cam.ease_voice}")`);
    if (cam.zoom_range && zoomLine.replace(/\s/g, '') !== cam.zoom_range.join('–')) err(`storyboard.md Zoom range ("${zoomLine}") ≠ map (${cam.zoom_range.join('–')})`);
    if (E === 0) ok('storyboard.md camera header equals the map');
  }
  const section = (h, next) => { const a = sb.indexOf('\n' + h); if (a < 0) return ''; const b = next ? sb.indexOf('\n' + next, a + 1) : -1; return sb.slice(a, b > 0 ? b : undefined); };
  const copySec = section('## Literal copy', '## Scene map');
  let missingCopy = 0;
  for (const c of map.copy || []) if (!copySec.includes(c.text.replace(/\|/g, '\\|'))) { missingCopy++; err(`storyboard.md literal copy table lacks ${c.id} “${c.text.slice(0, 40)}”`); }
  if ((map.copy || []).length && !missingCopy) ok('every copy row is in storyboard.md');
  const mapSec = section('## Scene map', '## Screens and states needed');
  let missingRows = 0;
  rows.forEach((r, i) => { if (tl.times[i].dropped || !r.ref_scene) return; if (!new RegExp(`^\\| ${r.ref_scene.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm').test(mapSec)) { missingRows++; err(`storyboard.md scene map lacks a row for ${r.ref_scene}`); } });
  if (keptCount && !missingRows) ok('every kept row is in the storyboard.md scene map');
  try { if (fs.statSync(sbFile).mtimeMs + 500 < fs.statSync(path.join(folder, 'scene-map.json')).mtimeMs) warn('storyboard.md is older than scene-map.json — re-render'); } catch { /* ignore */ }
}

console.log(`validate-storyboard: ${E} errors, ${W} warnings`);
process.exit(E ? 1 : 0);
