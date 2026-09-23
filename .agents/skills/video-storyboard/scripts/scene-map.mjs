#!/usr/bin/env node
// scene-map.mjs <motion-spec.json> --topic "<topic>" [--slug s] [--length s] [--tool t] [--product p] [--out dir] [--force]
//
// Writes the scene-map.json SKELETON for a storyboard: one row per reference scene, in the
// reference's order, with the reference's time, composition, framing, seam out, in-beat motion,
// landings, text beats, UI beats and evidence copied in, and the our-content columns empty.
// --length seeds our durations at a uniform ratio (target ÷ reference); the map may
// redistribute them later. The camera header is copied from the spec unchanged.
//
// Output folder: --out, else ./<slug>-storyboard/ where slug = --slug or the topic's first words.
// Refuses to overwrite an existing scene-map.json unless --force (the filled map is hand work).

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, readJson, writeJson, exists, ensureDir, slugify, r3, ev, listProfiles } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { topic: 'string', slug: 'string', length: 'number', tool: 'string', product: 'string', fps: 'number', out: 'string', force: 'boolean', stage: 'string' });
const specFile = args._[0];
if (!specFile) usage('usage: scene-map.mjs <motion-spec.json> --topic "<topic>" [--slug s] [--length s] [--tool t] [--product p] [--fps 24] [--out dir] [--force]');
const specAbs = path.resolve(specFile);
if (!exists(specAbs)) usage('spec not found: ' + specAbs);
const spec = readJson(specAbs);
if (!spec.structure?.scenes?.length) usage('the spec has no structure.scenes — finish the motion spec first (reference-motion-spec)');

const topic = args.topic || path.basename(specAbs, '.json');
const slug = args.slug || slugify(topic);
const outDir = path.resolve(args.out || `${slug}-storyboard`);
const mapFile = path.join(outDir, 'scene-map.json');
if (exists(mapFile) && !args.force) usage(`scene-map.json already exists in ${outDir}; pass --force to overwrite it or --out <dir> for a new folder`);

const meta = spec.meta || {}, cam = spec.camera || {}, scenes = spec.structure.scenes, seams = spec.seams || [];
const landings = cam.landings || [], text = spec.text_motion || [], ui = spec.ui_motion || {};
const refDuration = Number(meta.duration) || scenes[scenes.length - 1].out;
const targetLength = args.length || r3(refDuration);
const ratio = targetLength / refDuration;

const inScene = (t, sc) => t >= sc.in - 0.03 && t < sc.out - 0.03;
const seamOutOf = sc => seams.find(s => s.from_scene === sc.id) || seams.find(s => !s.opens_film && Math.abs(s.t - sc.out) < 0.15);
const seamInOf = sc => seams.find(s => s.opens_film && s.to_scene === sc.id) || (sc === scenes[0] ? seams.find(s => s.opens_film) : null);
const side = o => {
  if (!o) return '';
  const parts = [o.treatment || 'none'];
  if (o.direction && o.direction !== 'none') parts.push(o.direction);
  if (o.from_scale) parts.push(`from ×${o.from_scale}`);
  let s = parts.join(' ');
  if (o.frames_24) s += ` (${o.frames_24} f)`;
  if (o.amount) s += ` — ${o.amount}`;
  if (o.note) s += ` [${o.note}]`;
  return s;
};
const seamRow = s => s ? ({
  id: s.id, t: s.t, t_end: s.t_end, kind: s.kind, frames_24: s.frames_24,
  to_scene: s.to_scene, from_scene: s.from_scene, carrier: s.carrier,
  outgoing: side(s.outgoing), incoming: side(s.incoming),
  ease: s.ease?.gsap ?? null, on_onset: Boolean(s.on_onset), settle_on_onset: Boolean(s.settle_on_onset),
  opens_film: Boolean(s.opens_film), loop_join: Boolean(s.loop_join), twin_of: s.twin_of ?? null,
  evidence: ev(s.evidence), confidence: s.confidence ?? null, note: s.note ?? '',
}) : null;

const rows = scenes.map((sc, i) => {
  const so = seamOutOf(sc), si = seamInOf(sc);
  // A landing that starts inside the seam window before a boundary is the INCOMING scene's: a macro that arrives
  // through a blur push, a whip that lands in the next composition. Its anchor is the destination, never the start.
  const prevSo = i > 0 ? seamOutOf(scenes[i - 1]) : null; const winIn = prevSo ? (prevSo.frames_24 || 0) / 24 : 0, winOut = so ? (so.frames_24 || 0) / 24 : 0, nextSc = scenes[i + 1];
  const landingBelongs = l => l.t >= sc.in - winIn - 0.03 && l.t < (nextSc ? nextSc.in - winOut : sc.out) - 0.03;
  const refDur = r3(sc.out - sc.in);
  // A row owns its seam out: its span runs to the next scene's in (or the end of the film), so
  // the rows tile the timeline and the seam starts at (span end − its frames), never at the end.
  const spanOut = scenes[i + 1] ? scenes[i + 1].in : refDuration;
  const spanDur = r3(spanOut - sc.in);
  return {
    ref_scene: sc.id,
    ref_in: sc.in, ref_out: sc.out, ref_duration: refDur, ref_span_out: spanOut, ref_span_duration: spanDur,
    ref_subject: sc.subject, ref_composition: sc.composition, ref_fill: sc.framing_fill,
    ref_movement_class: sc.movement_class || [], ref_hold_carrier: sc.hold_carrier,
    ref_repeats: sc.repeats ?? null, ref_note: sc.note ?? '', ref_confidence: sc.confidence ?? null,
    ...(si ? { seam_in: seamRow(si) } : {}),
    seam_out: seamRow(so),
    landings: landings.filter(landingBelongs).map(l => ({
      t: l.t, subject: l.subject, fill: l.fill ?? null, fill_basis: l.fill_basis ?? null, zoom: l.zoom ?? null,
      move_in: l.move_in, duration: l.duration ?? 0, hold: l.hold ?? null, movement_class: l.movement_class,
      ease: l.ease ? { gsap: l.ease.gsap ?? null, cubic_bezier: l.ease.cubic_bezier ?? null } : null, evidence: ev(l.evidence), note: l.note ?? '',
    })),
    text_beats: text.filter(tm => inScene(tm.t, sc)).map(tm => ({
      t: tm.t, text_role: tm.text_role, mechanism: tm.mechanism, duration: tm.duration ?? null, hold: tm.hold ?? null,
      per_word_timing: tm.per_word_timing ?? null, evidence: ev(tm.evidence), note: tm.note ?? '',
    })),
    ui: {
      clicks: (ui.clicks || []).filter(c => inScene(c.t, sc)).map(c => ({ t: c.t, target: c.target, reaction: c.reaction, pre_pause: c.pre_pause ?? null })),
      typing: (ui.typing_beats || []).filter(b => b.in < sc.out && b.out > sc.in).map(b => ({ in: b.in, out: b.out, text_role: b.text_role, cadence: b.cadence, surface_growth: b.surface_growth ?? null })),
      payoffs: (ui.payoffs || []).filter(p => inScene(p.t, sc)).map(p => ({ t: p.t, what: p.what, emphasis: p.emphasis, before_hold: p.before_hold ?? null })),
      dropdowns: (ui.dropdowns || []).filter(d => inScene(d.t, sc)).map(d => ({ t: d.t, drop_distance_frac: d.drop_distance_frac, duration: d.duration })),
      card_rises: (ui.card_rises || []).filter(c => inScene(c.t, sc)).map(c => ({ t: c.t, rise_distance_frac: c.rise_distance_frac, duration: c.duration })),
    },
    evidence: ev(sc.evidence),
    our: {
      screen: '', surface: '', page: '', state: '', visible: '',
      copy: [], motion: '', carrier: '',
      // triggers: one per reference click and typing start; `t` overrides the re-mapped ref_t
      triggers: [
        ...(ui.clicks || []).filter(c => inScene(c.t, sc)).map(c => ({ action: 'press', ref_t: c.t, target: c.target, t: null })),
        ...(ui.typing_beats || []).filter(b => inScene(b.in, sc)).map(b => ({ action: 'typing starts', ref_t: b.in, target: b.text_role, t: null })),
      ],
      in_frame_at_result: '', forbidden_overlaps: [],
      anchor: '', anchor_px: null, anchor_selector: '', mount: null, rotation_deg: 0,
      // One anchor per reference landing in this scene: a glide inside a scene lands on a different element than the cut it started from.
      landing_anchors: landings.filter(landingBelongs).map(l => ({ t: l.t, ref_subject: l.subject || '', anchor: '', anchor_px: null, anchor_selector: '' })),
      duration: r3(spanDur * ratio),
      status: 'kept', override_reason: '', note: '',
    },
  };
});
// The last row absorbs the rounding so the seeded durations sum to the target exactly.
const sum = rows.reduce((n, r) => n + r.our.duration, 0);
rows[rows.length - 1].our.duration = r3(rows[rows.length - 1].our.duration + (targetLength - sum));

const map = {
  version: 1,
  topic, slug,
  product: args.product ?? null,
  profile: args.product && listProfiles().includes(String(args.product).toLowerCase()) ? String(args.product).toLowerCase() : null,
  spec: {
    // The map, the storyboard and the brief leave the machine with the build; the clip's file name
    // does not. `path` is the machine pointer the re-render needs; `source` is a neutral label.
    path: specAbs, source: 'the reference clip', duration: refDuration,
    width: meta.width ?? null, height: meta.height ?? null, fps: meta.fps ?? null, aspect: meta.aspect ?? null,
    scenes: scenes.length, seams: seams.length, loop: meta.loop ?? null, use_when: meta.use_when ?? null,
    presentation_chrome: meta.presentation_chrome ?? null, host_element: spec.identity?.host_element ?? null,
  },
  // Our delivery frame. Every fill / zoom in the brief is a fraction of THIS stage, never of the reference's export.
  target: { length: targetLength, tool: args.tool || 'generic', ratio: r3(ratio), fps: args.fps || 24, stage: (() => { const m = /^(\d+)x(\d+)$/i.exec(String(args.stage || '')); return m ? { width: +m[1], height: +m[2] } : { width: 1920, height: 1080 }; })() },
  // Ours, not the reference's: palette hex, type families, the logo asset. Filled at the gate from the product's own site (the snapshot CSS is the truth).
  identity_ours: { palette: [], type: [], logo: '', notes: '' },
  status: 'DRAFT — awaiting approval',
  angle: { options: [], picked: null, text: '' },
  copy: [],
  camera: {
    cadence_landings_per_s: cam.cadence_landings_per_s ?? null,
    lens_moves: Number.isInteger(cam.lens_moves) ? cam.lens_moves : landings.filter(l => l.move_in !== 'cut' && l.move_in !== 'hold').length,
    max_hold: cam.max_hold ?? null,
    ease_voice: cam.ease_voice ?? null,
    zoom_range: cam.zoom_range ?? null,
    lens_note: cam.lens_note ?? '',
    landings: landings.length,
  },
  agent_vs_user: ui.agent_vs_user ?? null,
  cursor: ui.cursor_present ? (ui.cursor_style || 'present') : 'absent',
  do_not: (spec.do_not || []).length,
  rows,
  open_questions: [],
  notes: '',
};

ensureDir(outDir);
writeJson(mapFile, map);

const kinds = {};
for (const s of seams) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
console.log(`wrote ${mapFile}`);
console.log(`  ${scenes.length} reference scenes · ${seams.length} seams (${Object.entries(kinds).map(([k, n]) => `${k} ×${n}`).join(', ')}) · lens moves ${map.camera.lens_moves} · ${landings.length} landings`);
console.log(`  reference ${r3(refDuration)} s → target ${targetLength} s (ratio ${r3(ratio)})${meta.loop ? ` · loop: ${meta.loop}` : ''}`);
console.log(`  agent vs user: ${map.agent_vs_user || '—'}`);
const clicks = (ui.clicks || []).length, fps = args.fps || 24;
if (clicks) console.log(`  ${clicks} reference click(s) seeded as triggers: ${(ui.clicks || []).map(c => `${c.t.toFixed(2)} s / f${Math.round(c.t * fps)} @${fps}`).join(', ')} — our press frames derive from the row ratio unless the row sets t`);
console.log('  next: fill every row\'s "our" block (screen, surface, page, state, visible, copy ids, motion, carrier, triggers, in_frame_at_result, forbidden_overlaps, anchor, status), the copy table and the angle; then screens.mjs, render-storyboard.mjs, validate-storyboard.mjs');
