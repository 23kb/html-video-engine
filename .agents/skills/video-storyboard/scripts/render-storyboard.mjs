#!/usr/bin/env node
// render-storyboard.mjs <folder | scene-map.json> [--out file]
//
// Renders storyboard.md — the one document a human approves — from scene-map.json and
// screens-needed.json (if present). The JSON is the source of truth; this file is a view of it,
// so the map and the document cannot drift. Sections in the order references/storyboard-format.md
// fixes: status, angle, literal copy, scene map, screens and states, camera plan (header copied
// from the spec, landings re-timed to our scenes), seam ledger (with our carriers), OVERRIDE list,
// open questions.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, loadMap, resolveSpec, readJson, exists, timeline, copyById, isEditorial, cell, t2, fpsOf, triggerTable, rigTable, rigLandings, cameraHeader } from './lib.mjs';
const r3 = x => Math.round(x * 1000) / 1000;

const args = parseArgs(process.argv.slice(2), { out: 'string' });
if (!args._[0]) usage('usage: render-storyboard.mjs <folder | scene-map.json> [--out file]');
const { folder, map } = loadMap(args._[0]);
const { spec } = resolveSpec(map, folder);
const screensFile = path.join(folder, 'screens-needed.json');
const screens = exists(screensFile) ? readJson(screensFile) : null;
const tl = timeline(map);
const copies = copyById(map);
const cam = map.camera || {};
const rows = map.rows || [];
const fps = fpsOf(map);

const L = [];
const push = (...s) => L.push(...s);
const copyText = ids => (ids || []).map(id => copies.has(id) ? `${id} “${copies.get(id).text}”` : `${id} (missing)`).join(' · ');
const seamCell = s => s ? `${s.kind} · ${s.frames_24 ?? '?'} f${s.opens_film ? ' (opens the film)' : ''}${s.loop_join ? ' (loop join)' : ''}; out: ${s.outgoing || 'none'}; in: ${s.incoming || 'none'}` : 'none — the film ends here';
const ratioCell = tm => tm.dropped ? 'dropped' : `${t2(tm.in)}–${t2(tm.out)} (${tm.ratio == null ? '—' : tm.ratio === 1 ? '1' : tm.ratio})`;
const nonDropped = rows.map((r, i) => ({ r, i, tm: tl.times[i] })).filter(x => !x.tm.dropped);

// ---- 1 status ----
const picked = map.angle?.picked;
push(`# Storyboard — ${map.topic}`, '');
push(`**Status:** ${map.status || 'DRAFT — awaiting approval'}${picked ? ` (angle #${picked} picked)` : ''}`);
push(`**Track:** reference replica · target ${t2(map.target?.length)} s (reference ${t2(map.spec?.duration)} s, ratio ${map.target?.ratio ?? '—'}) · tool: ${map.target?.tool || 'generic'} · product: ${map.product || 'none (neutral)'}${map.profile ? ` (profile: ${map.profile})` : ''}`);
push(`**Spine reference:** the reference clip · ${t2(map.spec?.duration)} s · ${map.spec?.width ?? '?'}×${map.spec?.height ?? '?'} · ${map.spec?.fps ?? '?'} fps source · ${map.spec?.scenes ?? rows.length} scenes · lens moves: ${cam.lens_moves ?? '—'}${map.spec?.loop ? ` · loop: ${map.spec.loop}` : ''}`);
if (map.spec?.use_when) push(`**Reference is good for:** ${map.spec.use_when}`);
if (map.spec?.presentation_chrome && !/^none/i.test(map.spec.presentation_chrome)) push(`**Presentation chrome in the reference:** ${map.spec.presentation_chrome}`);
push(`**Exact replica.** Every landing and seam below is the whole movement budget. Agent vs user in the reference: ${map.agent_vs_user || '—'}. Cursor: ${map.cursor || '—'}.`, '');

// ---- 2 angle ----
push('## Angle', '', map.angle?.text || '_(not written yet — fill scene-map.json → angle.text)_', '');
if ((map.angle?.options || []).length > 1) {
  push('Angles offered at the gate:', '');
  map.angle.options.forEach((o, i) => push(`${i + 1}. **${o.name || `Angle ${i + 1}`}**${i + 1 === picked ? ' (picked)' : ''} — ${o.summary || ''}`));
  push('');
}

// ---- 3 literal copy ----
push('## Literal copy', '');
if ((map.copy || []).length) {
  push('| id | where | scene | text |', '|---|---|---|---|');
  for (const c of map.copy) push(`| ${c.id} | ${cell(c.where)} | ${cell((c.scene || []).join?.(', ') ?? c.scene)} | ${cell(c.text)} |`);
} else push('_(no copy rows yet)_');
push('');

// ---- 4 scene map ----
push('## Scene map', '', `Spine: the reference clip. One row per reference scene, in the reference's order. "Our t" is derived from the row durations; the ratio is our duration ÷ the reference's. Status: kept = the reference's shot with our content; override / added = see the OVERRIDE list; dropped = not built.`, '');
push('| ref | ref t | ref composition | seam out (kind · frames) | our screen / state | what is visible | our copy | our motion | our t (ratio) | evidence | status |', '|---|---:|---|---|---|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  const tm = tl.times[i], o = r.our || {};
  const ref = r.ref_scene ? `${r.ref_scene}${r.ref_repeats ? ` (= ${r.ref_repeats})` : ''}` : 'added';
  const refT = r.ref_in != null ? `${t2(r.ref_in)}–${t2(r.ref_out)}` : '—';
  const comp = r.ref_scene ? `${r.ref_subject}; ${r.ref_composition}; fill ${r.ref_fill ?? '—'}; moves: ${r.ref_hold_carrier || '—'}` : (o.note || '');
  const screen = isEditorial(r) ? 'editorial' : `\`${o.screen}\` / ${o.state || 'default'}${o.surface ? ` [${o.surface}]` : ''}`;
  const status = o.status + (o.status === 'override' || o.status === 'added' ? ` — ${o.override_reason || 'reason missing'}` : '');
  push(`| ${ref} | ${refT} | ${cell(comp)} | ${cell(seamCell(r.seam_out))} | ${cell(screen)} | ${cell(o.visible)} | ${cell(copyText(o.copy))} | ${cell(o.motion)} | ${ratioCell(tm)} | ${cell(r.evidence)} | ${cell(status)} |`);
});
push('', `Sum of kept durations: ${t2(tl.total)} s against a target of ${t2(map.target?.length)} s.`, '');
push('### Triggers, results and overlaps', '', `Per scene: the press time and frame (at ${fps} fps) of every click-driven change, what must be in frame when the payoff lands, and what may not cover what.`, '');
push(...triggerTable(map, tl, fps), '');

// ---- 5 screens ----
push('## Screens and states needed', '');
if (screens) {
  push(`${screens.count?.screens ?? 0} screen(s), ${screens.count?.states ?? 0} state(s)${screens.profile ? ` · profile: ${screens.profile}` : ' · product-neutral'}. One row per screen × state; the capture column is the route for the snapshot step.`, '');
  if ((screens.screens || []).length) {
    push('| slug | surface | page | state | what must be visible | scenes | capture |', '|---|---|---|---|---|---|---|');
    for (const s of screens.screens) push(`| \`${s.slug}\` | ${cell(s.surface)} | ${cell(s.page)} | ${cell(s.state)} | ${cell(s.visible)} | ${(s.scenes || []).join(', ')} | ${cell([s.capture, s.login ? `login: ${s.login}` : '', s.strip ? `strip: ${s.strip}` : ''].filter(Boolean).join(' · '))} |`);
  } else push('_(no captures needed: every scene is editorial)_');
  push('', `Editorial scenes (no capture): ${(screens.editorial_scenes || []).join(', ') || 'none'}.`, '');
} else push('_(screens-needed.json not found — run `screens.mjs` on this folder)_', '');

// ---- 6 camera plan ----
push('## Camera plan', '', 'Header copied from the spec: the reference decided the cadence; this storyboard re-times its landings to our scenes and names our subject in each. The table is written for a tool with no camera object (a 3D null or rig as the stand-in): time in seconds and frames, the anchor as a page point, scale %, rotation, move and hold in frames, the ease to bake, the trigger.', '');
push(...cameraHeader(map, fps), '');
const ourLandings = rigLandings(map, tl, fps);
push(...rigTable(map, tl, fps), '');

// ---- 7 seam ledger ----
push('## Seam ledger', '', 'Copied from the spec (kind, frames, outgoing, incoming, ease, evidence) with OUR carrier — what of our composition stays continuous across the join. The reference\'s carrier is in brackets.', '');
push('| # | our t | ref t | kind | frames | outgoing | incoming | our carrier (ref carrier) | on hit | ease | evidence |', '|---|---:|---:|---|---:|---|---|---|---|---|---|');
const seamLines = [];
rows.forEach((r, i) => {
  const tm = tl.times[i];
  if (tm.dropped) return;
  if (r.seam_in) seamLines.push({ s: r.seam_in, ourT: tm.in, carrier: r.our?.carrier_in || r.our?.carrier || '', r });
  if (r.seam_out) {
    const nextKept = rows.slice(i + 1).find((x, j) => !tl.times[i + 1 + j].dropped);
    if (!nextKept) return; // the film ends on this row
    const skipped = rows.slice(i + 1, rows.indexOf(nextKept)).map(x => x.ref_scene).filter(Boolean);
    // The seam starts where the reference's seam starts (re-mapped), not where the row ends.
    const seamStart = r.seam_out.t != null ? tl.remap(r.seam_out.t) : null;
    seamLines.push({ s: r.seam_out, ourT: seamStart ?? r3(tm.out - ((r.seam_out.frames_24 || 0) / 24)), carrier: r.our?.carrier || '', r, skipped });
  }
});
for (const { s, ourT, carrier, skipped } of seamLines) {
  push(`| ${s.id ?? ''} | ${t2(ourT)} | ${t2(s.t)} | ${s.kind}${s.opens_film ? ' (opens the film)' : ''}${s.loop_join ? ' (loop join)' : ''}${skipped?.length ? ` — ref joins to ${skipped.join(', ')} (dropped); here it joins the next kept scene` : ''} | ${s.frames_24 ?? '?'} f | ${cell(s.outgoing || 'none')} | ${cell(s.incoming || 'none')} | ${cell(carrier ? `${carrier} (ref: ${s.carrier || 'none'})` : `— not set (ref: ${s.carrier || 'none'})`)} | ${s.on_onset ? 'yes' : 'no'}${s.settle_on_onset ? ' (settle)' : ''} | ${s.ease ?? '—'} | ${cell(s.evidence)} |`);
}
push('');

// ---- 8 overrides ----
// ---- 8b sound: the reference's bed and its beat points, re-timed; the build must know whether a track exists ----
push('## Sound', '');
if (spec?.sound?.present) {
  const s = spec.sound;
  push(`Reference: ${s.layers?.music || 'a music bed'}${s.layers?.sfx ? '; SFX: ' + s.layers.sfx : ''}${s.energy_arc ? '; energy: ' + s.energy_arc : ''}.`);
  const pts = Array.isArray(s.sync_points) ? s.sync_points : [];
  if (pts.length) { push('', `${pts.length} sync points where a visual lands on an audio onset, re-timed to our timeline (ref time in brackets):`, ''); for (const p of pts) { const t = tl.remap(p.t); push(`- ${t == null ? '—' : t2(t)} s (${t2(p.t)}) — ${p.visual || ''}${p.audio ? ' · ' + p.audio : ''}`); } }
  push('', map.target?.track ? `Track: ${map.target.track}` : 'No track given. Until one arrives the build is silent and keeps these times so cuts can sit on beats later.', '');
} else push('The reference has no music bed; sound is the build\'s call.', '');

push('## OVERRIDE list', '');
const ov = rows.map((r, i) => ({ r, i })).filter(x => ['override', 'added'].includes(x.r.our?.status));
if (ov.length) for (const { r, i } of ov) push(`- ${r.ref_scene || `added row ${i + 1}`} (${r.our.status}): ${r.our.override_reason || 'reason missing'}`);
else push('none — every row is the reference\'s shot with our content.');
push('');

// ---- 9 open questions ----
push('## Open questions', '');
if ((map.open_questions || []).length) for (const q of map.open_questions) push(`- ${q}`);
else push('none — nothing blocks the build.');
push('');
if (map.notes) push('## Notes', '', map.notes, '');
push('---', '', 'Rendered by render-storyboard.mjs from scene-map.json — edit the JSON and re-render; do not edit this file by hand.', '');

const outFile = path.resolve(args.out || path.join(folder, 'storyboard.md'));
fs.writeFileSync(outFile, L.join('\n') + '\n', 'utf8');
console.log(`wrote ${outFile} (${L.length} lines; ${nonDropped.length} scenes kept of ${rows.length}; ${ourLandings.length} landings; ${seamLines.length} seams${spec ? '' : '; spec not reachable — header from the map'})`);
