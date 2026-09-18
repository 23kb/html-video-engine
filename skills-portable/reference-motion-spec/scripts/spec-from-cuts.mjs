#!/usr/bin/env node
// spec-from-cuts.mjs <out-dir> [--force] [--merge]
//
// Builds <out-dir>/motion-spec.json from the measured files already in <out-dir>:
//   meta.json  (probe.mjs)   -> meta
//   audio.json (audio.mjs)   -> sound.present / sound.measured / sound.silence / sound.energy_arc
//   cuts.json  (the reader)  -> seams / pacing / ui_motion / text_motion, verbatim; camera_note -> camera.lens_note
// Every section the reader still has to write gets an explicit placeholder ("TODO", [] or 0)
// that validate-spec.mjs flags, so nothing is silently left blank.
//
// Refuses to overwrite an existing motion-spec.json unless --force.
// --merge keeps every hand-written section of the existing motion-spec.json and replaces ONLY
// seams / pacing / ui_motion / text_motion from cuts.json (the promote step after a cuts.json edit).
// Deterministic: same inputs -> byte-identical output.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJson, writeJson } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2), { force: 'boolean', merge: 'boolean' });
const outDir = args._[0] ? path.resolve(args._[0]) : null;
if (!outDir) { console.error('usage: spec-from-cuts.mjs <out-dir> [--force] [--merge]'); process.exit(1); }

const metaFile = path.join(outDir, 'meta.json');
const audioFile = path.join(outDir, 'audio.json');
const cutsFile = path.join(outDir, 'cuts.json');
const specFile = path.join(outDir, 'motion-spec.json');
for (const f of [metaFile, cutsFile]) if (!fs.existsSync(f)) { console.error('missing ' + f); process.exit(1); }

const meta = readJson(metaFile);
const cuts = readJson(cutsFile);
const audio = fs.existsSync(audioFile) ? readJson(audioFile) : null;
const schema = readJson(path.join(here, '..', 'references', 'spec-schema.json'));
const EVIDENCE_RULES = schema.properties.evidence_rules.default;
const TIME_PRECISION = schema.properties.meta.properties.time_precision.default;
const MEASURED_NOTE = schema.properties.sound.properties.measured.properties.note.default;

const exists = fs.existsSync(specFile);
if (exists && !args.force && !args.merge) {
  console.error(`refusing to overwrite ${specFile}\n  --force  rebuild it from meta.json + audio.json + cuts.json (hand-written sections are lost)\n  --merge  keep the hand-written sections, replace only seams / pacing / ui_motion / text_motion`);
  process.exit(1);
}
if (args.merge && !exists) { console.error(`--merge needs an existing ${specFile}`); process.exit(1); }

const rows = []; // [section, status]

// ---------------- seams / pacing / ui_motion / text_motion: verbatim from cuts.json ----------------
function fromCuts(key, fallback) {
  if (key in cuts) return cuts[key];
  rows.push([key, `MISSING in cuts.json -> placeholder`]);
  return fallback;
}
const seams = fromCuts('seams', []);
const pacing = fromCuts('pacing', { landing_cadence_per_s: 0, holds: [], longest_hold: 0, cuts_per_10s: 0, seams_on_onsets: 'TODO', typing_cadence: 'TODO', stagger_spacing: 'TODO' });
const uiMotion = fromCuts('ui_motion', { cursor_present: false, clicks: [], typing_beats: [], payoffs: [], agent_vs_user: 'TODO' });
const textMotion = fromCuts('text_motion', []);

let spec;
if (args.merge) {
  spec = readJson(specFile);
  spec.seams = seams;
  spec.pacing = pacing;
  spec.ui_motion = uiMotion;
  spec.text_motion = textMotion;
  rows.push(['seams', `replaced from cuts.json (${seams.length} rows)`]);
  rows.push(['pacing', 'replaced from cuts.json']);
  rows.push(['ui_motion', `replaced from cuts.json (${(uiMotion.clicks || []).length} clicks, ${(uiMotion.typing_beats || []).length} typing beats, ${(uiMotion.payoffs || []).length} payoffs)`]);
  rows.push(['text_motion', `replaced from cuts.json (${textMotion.length} rows)`]);
  for (const k of ['meta', 'identity', 'structure', 'camera', 'grammar', 'sound', 'eases', 'do_not', 'evidence_rules']) rows.push([k, 'kept from existing motion-spec.json']);
} else {
  // ---------------- meta ----------------
  const m = {
    source: path.basename(String(meta.source || '')),
    duration: meta.duration,
    fps: meta.fps,
    sample_fps: 24,
    width: meta.width,
    height: meta.height,
    aspect: meta.aspect,
    audio: Boolean(meta.audio),
    black_head: meta.black_head ?? 0,
    black_tail: meta.black_tail ?? 0,
    time_precision: meta.time_precision || TIME_PRECISION,
  };
  const carried = [];
  for (const k of ['loop', 'presentation_chrome', 'use_when']) {
    const v = cuts[k] ?? meta[k];
    if (typeof v === 'string' && v) { m[k] = v; carried.push(k + (k in cuts ? ' (cuts.json)' : ' (meta.json)')); }
  }
  rows.push(['meta', 'copied from meta.json' + (carried.length ? '; carried ' + carried.join(', ') : '')]);

  // ---------------- sound ----------------
  const present = Boolean(audio ? audio.present : meta.audio);
  const sound = {
    present,
    measured: {
      integrated_lufs: present && audio ? audio.integrated_lufs ?? null : null,
      lra_lu: present && audio ? audio.lra_lu ?? null : null,
      true_peak_dbtp: present && audio ? audio.true_peak_dbtp ?? null : null,
      note: present ? MEASURED_NOTE : 'No audio stream.',
    },
    layers: { vo: 'TODO', music: 'TODO', sfx: 'TODO' },
    energy_arc: present && audio && audio.energy_arc ? audio.energy_arc : (present ? 'TODO' : 'no audio'),
    sync_points: [],
    silence: present && audio ? (audio.silence || []).map(s => ({ start: s.start, end: s.end })) : [],
    // audio.mjs measures the program end; the reader confirms it against the picture (sting, fade, hard stop)
    ending: present && audio && audio.ending ? `${audio.ending} (measured; confirm against the picture)` : 'TODO',
  };
  if (!audio) rows.push(['sound', present ? 'audio.json MISSING (run audio.mjs); measured left null; TODO layers, ending' : 'no audio (meta.json); TODO layers, ending']);
  else if (!present) rows.push(['sound', 'present:false from audio.json; TODO layers, ending']);
  else rows.push(['sound', `measured from audio.json (I=${sound.measured.integrated_lufs} LUFS, LRA=${sound.measured.lra_lu} LU, peak=${sound.measured.true_peak_dbtp} dBTP, ${sound.silence.length} silences, energy_arc); TODO layers, sync_points, ending`]);

  // ---------------- camera ----------------
  const lensNote = typeof cuts.camera_note === 'string' && cuts.camera_note ? cuts.camera_note : 'TODO';
  const camera = {
    cadence_landings_per_s: 0,
    lens_moves: 0,
    max_hold: 0,
    ease_voice: 'TODO',
    zoom_range: [1, 1],
    landings: [],
    lens_note: lensNote,
  };
  rows.push(['camera', 'TODO (cadence, lens_moves, max_hold, ease_voice, zoom_range, landings)' + (lensNote !== 'TODO' ? '; lens_note copied from cuts.json camera_note' : '; lens_note TODO')]);

  rows.push(['identity', 'TODO (palette, type_roles, ground, host_element, brand_role)']);
  rows.push(['structure', 'TODO (acts, scenes)']);
  rows.push(['seams', `copied from cuts.json (${seams.length} rows)`]);
  rows.push(['pacing', 'copied from cuts.json']);
  rows.push(['ui_motion', `copied from cuts.json (${(uiMotion.clicks || []).length} clicks, ${(uiMotion.typing_beats || []).length} typing beats, ${(uiMotion.payoffs || []).length} payoffs)`]);
  rows.push(['text_motion', `copied from cuts.json (${textMotion.length} rows)`]);
  rows.push(['grammar', 'TODO (entrances, exits, reveal_order, motifs)']);
  rows.push(['eases', 'TODO']);
  rows.push(['do_not', 'TODO']);
  rows.push(['evidence_rules', 'schema default']);

  spec = {
    version: 1,
    meta: m,
    // brand_role is an enum with no honest placeholder: left out so the validator reports it missing
    identity: { palette: [], type_roles: [], ground: 'TODO', host_element: 'TODO' },
    structure: { acts: [], scenes: [] },
    camera,
    seams,
    pacing,
    ui_motion: uiMotion,
    text_motion: textMotion,
    grammar: { entrances: [], exits: [], reveal_order: 'TODO', motifs: [] },
    sound,
    eases: [],
    do_not: [],
    evidence_rules: EVIDENCE_RULES,
  };
}

writeJson(specFile, spec);

// ---------------- report ----------------
const order = ['meta', 'identity', 'structure', 'camera', 'seams', 'pacing', 'ui_motion', 'text_motion', 'grammar', 'sound', 'eases', 'do_not', 'evidence_rules'];
rows.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
const w = Math.max(...rows.map(r => r[0].length));
console.log(`${args.merge ? 'merged' : 'built'} ${specFile}`);
console.log('section'.padEnd(w) + '  status');
for (const [k, v] of rows) console.log(k.padEnd(w) + '  ' + v);
const todo = rows.filter(r => /TODO/.test(r[1])).map(r => r[0]);
console.log(todo.length ? `TODO sections: ${todo.join(', ')} -> fill them, then validate-spec.mjs ${path.basename(specFile)}` : 'no TODO sections');
