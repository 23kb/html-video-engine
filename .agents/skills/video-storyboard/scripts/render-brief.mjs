#!/usr/bin/env node
// render-brief.mjs <folder | scene-map.json> --target <hyperframes|after-effects|remotion|generic> [--fps 24] [--renderer <path to reference-motion-spec/scripts/render-brief.mjs>]
//
// Re-renders the reference-motion-spec brief with OUR content substituted per scene. It does not
// carry a copy of that renderer: it writes `spec-ours.json` (the spec with our scenes, our copy,
// our carriers and our timeline) next to the map, then imports the sibling skill's
// render-brief.mjs and lets it write brief-<target>.md into this folder. Nothing is added that
// the spec and the map do not contain.
//
// Substitution, per kept row: scene subject / hold carrier / note → ours (the reference's are kept
// in brackets), seam carrier → ours, text roles → our copy, every time re-mapped through the
// scene map's timeline (dropped scenes vanish with their seams, landings and beats; added scenes
// appear as OVERRIDE scenes with no evidence).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, usage, loadMap, resolveSpec, writeJson, timeline, copyById, isEditorial, findSkill1Script, skill1Missing, r3, fpsOf, triggersOf, triggerTable, rigTable, cameraHeader, cell } from './lib.mjs';

const TARGETS = ['hyperframes', 'claude-design', 'after-effects', 'remotion', 'generic'];
import { claudeDesignSections } from './claude-design.mjs';
const args = parseArgs(process.argv.slice(2), { target: 'string', fps: 'number', renderer: 'string', wpm: 'string' });
if (!args._[0]) usage(`usage: render-brief.mjs <folder | scene-map.json> --target <${TARGETS.join('|')}> [--fps N] [--renderer <path>]`);
const { folder, map } = loadMap(args._[0]);
const target = args.target || map.target?.tool || 'generic';
if (!TARGETS.includes(target)) usage(`--target must be one of ${TARGETS.join(' | ')} (spec-md is the reference's own rendering; run it from the spec)`);
const { file: specFile, spec } = resolveSpec(map, folder);
if (!spec) usage(`motion-spec.json not reachable at ${specFile || '(no spec.path)'} — the brief is rendered from the spec; fix map.spec.path`);
const renderer = findSkill1Script('render-brief.mjs', args.renderer);
if (!renderer) usage(skill1Missing('render-brief.mjs'));

const tl = timeline(map);
const copies = copyById(map);
const rows = map.rows || [];
const fps = args.fps || fpsOf(map);
const rowOf = id => rows.findIndex(r => r.ref_scene === id);
const keptRow = id => { const i = rowOf(id); return i >= 0 && !tl.times[i].dropped ? { r: rows[i], i, tm: tl.times[i] } : null; };
const ours = r => r.our || {};
const copyText = ids => (ids || []).map(id => copies.get(id)?.text).filter(Boolean).map(t => `“${t}”`).join(' · ');
const inRow = (t, r) => r.ref_in != null && t >= r.ref_in - 1e-6 && t < r.ref_out - 1e-6;
const rowAt = t => { const i = rows.findIndex(r => inRow(t, r)); return i >= 0 ? { r: rows[i], i, tm: tl.times[i] } : null; };
const remap = t => tl.remap(t);
const ourSubject = (r, refSubject) => isEditorial(r) ? `${ours(r).visible || refSubject} [ref: ${refSubject}]` : `${ours(r).visible || ours(r).screen} — \`${ours(r).screen}\` / ${ours(r).state || 'default'} [ref: ${refSubject}]`;

const out = JSON.parse(JSON.stringify(spec));
const specAbsDir = map.spec?.path ? path.dirname(path.isAbsolute(map.spec.path) ? map.spec.path : path.resolve(folder, map.spec.path)) : null;
const stage = map.target?.stage || { width: 1920, height: 1080 };
// width / height become the comp / composition size in every target's Mapping: OUR stage, not the reference's export.
out.meta = { ...out.meta, source: `${map.topic} — a replica of the reference clip`, duration: tl.total, width: stage.width, height: stage.height, aspect: `${stage.width}:${stage.height}`, audio: !!map.target?.track, evidence_dir: specAbsDir ? 'the spec folder recorded in video-pipeline.json — same machine only; the reference never travels with the build' : null, storyboard: { topic: map.topic, product: map.product ?? null, target_length: map.target?.length, ratio: map.target?.ratio, rendered_from: 'scene-map.json' } };
if (spec.meta?.loop && rows.filter(r => r.ref_repeats).every(r => r.our?.status === 'dropped')) out.meta.loop = `no — the reference's repeated cycle is dropped in this storyboard (reference: ${spec.meta.loop})`;

// scenes
out.structure = { ...(spec.structure || {}) };
out.structure.scenes = [];
rows.forEach((r, i) => {
  const tm = tl.times[i]; if (tm.dropped) return;
  const o = ours(r);
  if (!r.ref_scene) { out.structure.scenes.push({ id: `A${i + 1}`, in: tm.in, out: tm.out, subject: `OVERRIDE (added): ${o.visible}`, framing_fill: o.fill ?? 0, composition: o.composition || 'no reference composition', movement_class: [], hold_carrier: o.motion || '—', note: `Added scene — ${o.override_reason}`, evidence: [], confidence: 'low' }); return; }
  const sc = (spec.structure?.scenes || []).find(s => s.id === r.ref_scene) || {};
  const trig = triggersOf(r, tl, fps).map(x => x.text).join('; ');
  out.structure.scenes.push({
    ...sc, in: tm.in, out: tm.out,
    subject: ourSubject(r, sc.subject),
    hold_carrier: o.motion ? `${o.motion} [ref: ${sc.hold_carrier}]` : sc.hold_carrier,
    note: [o.copy?.length ? `Copy: ${copyText(o.copy)}` : '', trig ? `Triggers: ${trig}` : '', o.in_frame_at_result ? `In frame at the result: ${o.in_frame_at_result}` : '', (o.forbidden_overlaps || []).length ? `Forbidden overlaps: ${o.forbidden_overlaps.join('; ')}` : '', o.status === 'override' ? `OVERRIDE: ${o.override_reason}` : '', o.note || '', sc.note ? `Ref note: ${sc.note}` : '', tm.ratio != null && tm.ratio !== 1 ? `Time ratio ${tm.ratio} (ref ${r3(r.ref_out - r.ref_in)} s → ours ${tm.duration} s)` : ''].filter(Boolean).join(' — ') || undefined,
  });
});
out.structure.acts = (spec.structure?.acts || []).map(a => { const i = remap(a.in), o = remap(Math.max(a.in, a.out - 0.001)); return i == null || o == null ? null : { ...a, in: i, out: r3(o + 0.001) }; }).filter(Boolean);

// seams: keep a seam when the scene it leaves is kept and the film continues after it
out.seams = [];
for (const s of spec.seams || []) {
  if (s.opens_film) { const k = keptRow(s.to_scene) || (rows[0]?.ref_scene && keptRow(rows[0].ref_scene)); if (k && k.tm.in === 0) out.seams.push({ ...s, t: 0, t_end: s.t_end != null ? remap(s.t_end) ?? s.t_end : undefined, carrier: ours(k.r).carrier_in || ours(k.r).carrier ? `${ours(k.r).carrier_in || ours(k.r).carrier} [ref: ${s.carrier}]` : s.carrier }); continue; }
  const from = s.from_scene ? keptRow(s.from_scene) : rowAt(s.t - 0.01) && !rowAt(s.t - 0.01).tm.dropped ? rowAt(s.t - 0.01) : null;
  if (!from) continue;
  const later = rows.slice(from.i + 1).some((x, j) => !tl.times[from.i + 1 + j].dropped);
  if (!later) continue;
  const toDropped = s.to_scene && rowOf(s.to_scene) >= 0 && tl.times[rowOf(s.to_scene)].dropped;
  // A seam starts where the storyboard's seam starts (the row's seam_out.t, re-mapped) and the cut sits inside it at the next row's in.
  const dur = (s.frames_24 || 1) / 24;
  const start = from.r.seam_out?.t != null ? remap(from.r.seam_out.t) : null;
  const t = start != null ? r3(start) : r3(from.tm.out - dur);
  out.seams.push({ ...s, t, t_end: r3(t + dur), cue: r3(from.tm.out), carrier: ours(from.r).carrier ? `${ours(from.r).carrier} [ref: ${s.carrier}]` : s.carrier, note: [s.note, toDropped ? `ref joined to ${s.to_scene}, dropped here; the incoming composition is the next kept scene` : ''].filter(Boolean).join(' — ') || undefined });
}

// landings, text, ui, pacing, sound — re-timed; anything in a dropped scene vanishes
const retime = (list, key = 't') => (list || []).map(x => { const t = remap(x[key]); return t == null ? null : { ...x, [key]: t }; }).filter(Boolean);
out.camera = { ...(spec.camera || {}) };
// landings: re-timed; the subject comes from the scene the ORIGINAL time falls in
out.camera.landings = (spec.camera?.landings || []).map(l => { const t = remap(l.t); if (t == null) return null; const at = rowAt(l.t); const r = at?.r; return { ...l, t, subject: r ? ourSubject(r, l.subject) : l.subject }; }).filter(Boolean);
out.camera.landings.forEach((l, k, arr) => { const next = arr[k + 1]; l.hold = r3((next ? next.t : tl.total) - l.t - (l.duration || 0)); });
out.text_motion = (spec.text_motion || []).map(tm => { const t = remap(tm.t); if (t == null) return null; const at = rowAt(tm.t); const c = at ? copyText(ours(at.r).copy) : ''; return { ...tm, t, text_role: c ? `${tm.text_role} → ours: ${c}` : tm.text_role }; }).filter(Boolean);
const u = spec.ui_motion || {};
out.ui_motion = { ...u, clicks: retime(u.clicks), payoffs: retime(u.payoffs), dropdowns: retime(u.dropdowns), card_rises: retime(u.card_rises),
  typing_beats: (u.typing_beats || []).map(b => { const i = remap(b.in), o = remap(Math.max(b.in, b.out - 0.001)); if (i == null || o == null) return null; const at = rowAt(b.in); const c = at ? copyText(ours(at.r).copy) : ''; return { ...b, in: i, out: r3(o + 0.001), text_role: c ? `${b.text_role} → ours: ${c}` : b.text_role }; }).filter(Boolean) };
out.pacing = { ...(spec.pacing || {}), holds: retime(spec.pacing?.holds) };
if (spec.sound?.sync_points) out.sound = { ...spec.sound, sync_points: retime(spec.sound.sync_points) };
out.do_not = [...(spec.do_not || []), ...rows.filter(r => ['override', 'added'].includes(r.our?.status)).map(r => `STORYBOARD OVERRIDE ${r.ref_scene || 'added'}: ${r.our.override_reason}`)];
out.evidence_rules = (spec.evidence_rules || '') + ' Scene subjects, hold carriers, seam carriers and text roles carry OUR content with the reference\'s in brackets; times are re-mapped through the storyboard\'s scene map (see storyboard.md § Scene map for the ratio per scene).';

const oursFile = path.join(folder, 'spec-ours.json');
writeJson(oursFile, out);
console.log(`wrote ${oursFile} (${out.structure.scenes.length} scenes, ${out.seams.length} seams, ${out.camera.landings.length} landings, ${tl.total} s)`);

// Import the sibling renderer. It reads process.argv at module load, so set argv and import once per process.
process.argv = [process.argv[0], renderer, oursFile, '--target', target, '--out', folder + path.sep, ...(fps !== 24 ? ['--fps', String(fps)] : [])];
console.log(`rendering with ${renderer}`);
await import(pathToFileURL(renderer).href);

// Append what every target needs and the spec renderer does not carry: the rig camera table
// (for a tool with no camera object — a 3D null / rig stand-in keys straight from it; an HTML
// tool reads the same numbers), the press frame of every click, what is in frame at every
// result, and the forbidden overlaps. Same tables as storyboard.md, from the same map.
const briefFile = path.join(folder, `brief-${target}.md`);
if (fs.existsSync(briefFile)) {
  const mounts = new Map(); for (const r of rows) { const o = ours(r); if (o.mount?.folder && !mounts.has(o.mount.folder)) mounts.set(o.mount.folder, o.mount); }
  const io = map.identity_ours || {};
  const S = ['', '> The sections above describe the reference\'s motion in the reference\'s nouns (seam ledger outgoing / incoming, pacing, UI motion, sound sync): copy the motion, never the nouns. Ours are in the tables below and in the storyboard rows.', '',
    '## Stage and mount (from the storyboard)', '',
    `- Stage: ${stage.width}×${stage.height} at ${fps} fps. Every fill in this brief is a fraction of this stage; the reference's export size and its panel are not the frame.`,
    '- Base scale: zoom 1 (scale 100 %) = the mount at its capture width, one page px = one stage px; zoom 2 shows half the mount width across the stage. Anchor px are page px of the capture; the camera centres that point.',
    ...(mounts.size ? [...mounts.values()].map(m => `- Mount \`${m.folder}\`: captured ${m.width} px wide, document ${m.doc_height ?? '?'} px tall. Mount it at ${m.width} px wide and let the camera scale the mount; anchor px below are page px of that capture (from its targets.json).`) : ['- Mounts: not measured yet — run fill-anchors.mjs after the snapshots exist.']),
    ...(map.spec?.presentation_chrome ? [`- The reference sat in a frame of its own: ${String(map.spec.presentation_chrome).slice(0, 220)}`] : []), '',
    '## Identity — ours (from the storyboard)', '',
    ...((io.palette || []).length || (io.type || []).length ? [`- Palette: ${(io.palette || []).join(' · ') || '—'}`, `- Type: ${(io.type || []).join(' · ') || '—'} — an embeddable family (a woff2 you ship); a system stack renders differently per machine`, `- Logo: ${io.logo || '—'}`, `- Editorial roles (ours, not the reference's): ${['bed', 'emphasis', 'cursor', 'ink', 'trail'].map(k => `${k} = ${io.roles?.[k] || 'NOT DECIDED — the reference\'s above'}`).join(' · ')}`, ...(io.notes ? [`- ${io.notes}`] : [])] : ['- Not filled: the Identity section above is the reference\'s. Fill identity_ours in scene-map.json (palette hex, font families, logo asset, roles: bed / emphasis / cursor / ink / trail) and re-render.']), '',
    '## Our motion per scene (from the storyboard)', '',
    '| scene | screen / state | visible | motion | carrier out | anchor (page px · selector) |', '|---|---|---|---|---|---|',
    ...rows.filter(r => r.our?.status !== 'dropped').map(r => { const o = ours(r); const a = o.anchor ? `${o.anchor}${Array.isArray(o.anchor_px) ? ` · ${o.anchor_px.join(',')}` : ' · not measured'}${o.anchor_selector ? ` · \`${o.anchor_selector}\`` : ''}` : '—'; return `| ${r.ref_scene || '(added)'} | ${isEditorial(r) ? 'editorial' : `${o.screen} / ${o.state || 'default'}`} | ${cell(o.visible || '')} | ${cell(o.motion || '')} | ${cell(o.carrier || '')} | ${cell(a)} |`; }), '',
    '## Camera plan as a rig (from the storyboard)', '',
    'For a tool with no camera object: key a 3D null (anchor point = the page point to centre, position = frame centre, scale = zoom %, X/Y rotation for three-quarter views) from the rows below; every page layer is a child at its page position. Eases are GSAP name + cubic-bezier: bake them to per-frame keys. An HTML tool reads the same rows with its own camera verbs (see the landing table above).', '',
    ...cameraHeader(map, fps), '', ...rigTable(map, tl, fps), '',
    '## Triggers, results and overlaps (from the storyboard)', '',
    `Per scene: the press time and frame (at ${fps} fps) of every click-driven change — a demo click has a visible cursor at the depth of the object it presses, checked in the render; what must be in frame when the payoff lands; what may not cover what. A page-load cut between two layouts is a jerk: dissolve the content and slide the column that changes, the cursor riding its target.`, '',
    ...triggerTable(map, tl, fps), '',
    '## Literal copy (from the storyboard)', '',
    ...((map.copy || []).length ? ['| id | where | scene | text |', '|---|---|---|---|', ...map.copy.map(c => `| ${c.id} | ${cell(c.where)} | ${cell((c.scene || []).join?.(', ') ?? c.scene)} | ${cell(c.text)} |`)] : ['_(no copy rows)_']), ''];
  if (target === 'claude-design') S.push(...claudeDesignSections({ map, rows, ours, isEditorial, cell, stage, wpm: args.wpm }));
  fs.appendFileSync(briefFile, S.join('\n') + '\n', 'utf8');
  console.log(`appended the rig camera table, triggers / results / overlaps and the copy table to ${briefFile}`);
}
