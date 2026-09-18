#!/usr/bin/env node
// validate-spec.mjs <motion-spec.json | cuts.json> [--sheets <dir>] [--windows <dir>] [--meta <meta.json>]
//
// Validates against references/spec-schema.json (a cuts.json is validated against the
// seams / pacing / ui_motion / text_motion parts of the same schema), then runs the evidence
// rules: every seam, landing, scene and text beat cites sheet + tile(s) or carries
// confidence "low"; times fall inside the film; hard cuts are 1 frame; seams are in time order;
// cited sheets exist and tile numbers fit the grid when --sheets / --windows are given (a w-<t>
// strip's cap is its own tile count from windows/index.json; 8 when the strip is not indexed);
// camera.lens_moves equals the travelled landings; cadence is landings / duration.
// Exit 1 on errors. Warnings do not fail. No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJson } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2), { sheets: 'string', windows: 'string', meta: 'string', quiet: 'boolean' });
const file = args._[0];
if (!file) { console.error('usage: validate-spec.mjs <motion-spec.json | cuts.json> [--sheets <dir>] [--windows <dir>] [--meta <meta.json>]'); process.exit(1); }
const doc = readJson(file);
const schema = readJson(path.join(here, '..', 'references', 'spec-schema.json'));

const isCuts = !('camera' in doc) && !('identity' in doc) && ('seams' in doc);
const errors = [], warnings = [];

// ---------------- schema validation (subset of draft-07) ----------------
const defs = schema.definitions || {};
function resolveRef(ref) {
  const m = ref.match(/^#\/definitions\/(.+)$/);
  if (!m || !defs[m[1]]) throw new Error('unresolvable $ref ' + ref);
  return defs[m[1]];
}
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}
function typeOk(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}
function validate(v, s, where) {
  if (!s) return;
  if (s.$ref) s = resolveRef(s.$ref);
  if ('const' in s && v !== s.const) return errors.push(`${where}: must equal ${JSON.stringify(s.const)}`);
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some(t => typeOk(v, t))) return errors.push(`${where}: expected ${types.join('|')}, got ${typeOf(v)}`);
  }
  if (s.enum && !s.enum.includes(v)) errors.push(`${where}: "${v}" is not one of ${s.enum.join(' | ')}`);
  if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern).test(v)) errors.push(`${where}: "${v}" does not match ${s.pattern}`);
  if (typeof v === 'number') {
    if (s.minimum !== undefined && v < s.minimum) errors.push(`${where}: ${v} < minimum ${s.minimum}`);
    if (s.maximum !== undefined && v > s.maximum) errors.push(`${where}: ${v} > maximum ${s.maximum}`);
  }
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) errors.push(`${where}: needs at least ${s.minItems} items`);
    if (s.maxItems !== undefined && v.length > s.maxItems) errors.push(`${where}: at most ${s.maxItems} items`);
    if (s.items) v.forEach((x, i) => validate(x, s.items, `${where}[${i}]`));
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const r of s.required || []) if (!(r in v)) errors.push(`${where}: missing required "${r}"`);
    const props = s.properties || {};
    for (const [k, val] of Object.entries(v)) {
      if (props[k]) validate(val, props[k], `${where}.${k}`);
      else if (s.additionalProperties === false) errors.push(`${where}: unknown property "${k}"`);
    }
  }
}

if (isCuts) {
  const sub = {
    type: 'object',
    required: ['version', 'source', 'seams', 'pacing', 'ui_motion', 'text_motion'],
    properties: {
      version: { const: 1 },
      source: { type: 'string' },
      seams: schema.properties.seams,
      pacing: schema.properties.pacing,
      ui_motion: schema.properties.ui_motion,
      text_motion: schema.properties.text_motion,
      camera_note: { type: 'string' },
      candidates: { type: 'array' },
      notes: { type: 'array' },
    },
  };
  validate(doc, sub, 'cuts');
} else {
  validate(doc, schema, 'spec');
}

// ---------------- evidence + consistency rules ----------------
const duration = (args.meta ? readJson(args.meta).duration : null) ?? doc.meta?.duration ?? null;
const sheetIdRe = /^(c-\d{3}|f-\d{3}|w-\d+(\.\d+)?|frame-\d+(\.\d+)?|overview)$/;
const tileMax = { c: 30, f: 48, overview: 24 };
// windows/index.json -> Map(strip id -> tile count). Current shape: { default_tiles, cols, rows, pre,
// span, strips: [{ id, file, t, tiles, first_frame, last_frame }] }; older entries lack `tiles`
// (use last_frame - first_frame + 1); a legacy bare array of strips is also accepted.
let windowTiles = null;
const windowFiles = new Map();   // strip id -> file name from index.json (a packaged library ships scaled .jpg strips)
// The windows index sits next to the spec in the skill's own layout; find it there when --windows is not given.
if (!args.windows && args._[0]) { const w = path.join(path.dirname(path.resolve(args._[0])), 'windows'); if (fs.existsSync(path.join(w, 'index.json'))) args.windows = w; }
if (args.windows) {
  const idx = path.join(args.windows, 'index.json');
  if (fs.existsSync(idx)) {
    const raw = readJson(idx);
    const strips = Array.isArray(raw) ? raw : (raw.strips || []);
    windowTiles = new Map();
    for (const w of strips) {
      if (!w || !w.id) continue;
      const n = Number.isInteger(w.tiles) ? w.tiles
        : (Number.isInteger(w.first_frame) && Number.isInteger(w.last_frame)) ? w.last_frame - w.first_frame + 1 : null;
      if (n) windowTiles.set(w.id, n);
      if (typeof w.file === 'string') windowFiles.set(w.id, w.file);
    }
  }
}
const unindexedWarned = new Set();
function windowCap(sheet, where) {
  if (windowTiles && windowTiles.has(sheet)) return windowTiles.get(sheet);
  if (args.windows && !unindexedWarned.has(sheet)) {
    unindexedWarned.add(sheet);
    warnings.push(`${where}: ${sheet} is not indexed in ${path.join(args.windows, 'index.json')} - assuming 8 tiles for the cap`);
  }
  return 8;
}

function checkEvidence(row, where, { requireCite = true } = {}) {
  const ev = row.evidence || [];
  const conf = row.confidence;
  if (requireCite && !ev.length) {
    if (row.twin_of) warnings.push(`${where}: no evidence of its own - a twin of ${row.twin_of} (verify the twin strip once, then this is fine)`);
    else if (conf === 'low') warnings.push(`${where}: no evidence - recorded as a guess (confidence low)`);
    else errors.push(`${where}: no evidence and confidence is not "low" - cite sheet + tiles or mark it a guess`);
  }
  for (const e of ev) {
    if (!sheetIdRe.test(e.sheet)) { errors.push(`${where}: bad sheet id "${e.sheet}" (c-NNN | f-NNN | w-<t> | frame-<t> | overview)`); continue; }
    if (e.sheet.startsWith('frame-')) {
      // a full-resolution measurement frame: no tiles; check the file when the sheets folder is known
      if (args.sheets) { const f = path.join(args.sheets, '..', 'frames', e.sheet + '.png'); if (!fs.existsSync(f)) errors.push(`${where}: cited ${e.sheet}.png not found in ${path.join(args.sheets, '..', 'frames')}`); }
      continue;
    }
    const kind = e.sheet.startsWith('w-') ? 'w' : e.sheet === 'overview' ? 'overview' : e.sheet[0];
    const max = kind === 'w' ? windowCap(e.sheet, where) : tileMax[kind];
    for (const t of e.tiles || []) if (t < 1 || t > max) errors.push(`${where}: tile ${t} outside 1..${max} on ${e.sheet}`);
    if (args.sheets && kind !== 'w') {
      const f = path.join(args.sheets, e.sheet + '.png');
      if (!fs.existsSync(f)) errors.push(`${where}: cited sheet ${e.sheet}.png not found in ${args.sheets}`);
    }
    if (args.windows && kind === 'w') {
      const name = windowFiles.get(e.sheet) || e.sheet + '.png';
      const f = path.join(args.windows, name);
      if (!fs.existsSync(f)) errors.push(`${where}: cited window ${name} not found in ${args.windows}`);
    }
  }
}
function checkTime(t, where) {
  if (typeof t !== 'number') return;
  if (t < -0.001) errors.push(`${where}: t ${t} < 0`);
  if (duration != null && t > duration + 0.05) errors.push(`${where}: t ${t} beyond duration ${duration}`);
}

const oneFrameKinds = new Set(['hard cut', 'match cut', 'reframe cut', 'pixel-matched hard cut']);
(doc.seams || []).forEach((s, i) => {
  const where = `seams[${i}] (t=${s.t}, ${s.kind})`;
  checkEvidence(s, where);
  checkTime(s.t, where);
  if (oneFrameKinds.has(s.kind) && s.frames_24 !== 1) warnings.push(`${where}: a ${s.kind} is 1 frame by definition; frames_24 is ${s.frames_24} - if the join really spans frames, name the transition instead`);
  if (!oneFrameKinds.has(s.kind) && s.kind !== 'other' && s.frames_24 === 1) warnings.push(`${where}: a 1-frame "${s.kind}" - the strip shows a cut; check the kind`);
  if (i > 0 && doc.seams[i - 1].t > s.t) errors.push(`${where}: seams are not in time order`);
  if (s.frames_24 && s.duration && Math.abs(s.frames_24 / 24 - s.duration) > 0.06) warnings.push(`${where}: frames_24 ${s.frames_24} and duration ${s.duration}s disagree (${(s.frames_24 / 24).toFixed(3)}s)`);
  if (s.carrier === undefined || s.carrier === '') errors.push(`${where}: carrier is empty - write what stays continuous, or "none"`);
  if (s.opens_film === true && s.t > 0.1) warnings.push(`${where}: opens_film is true but t is ${s.t} - the pre-roll rule is for a seam the film starts inside (t = 0)`);
  if (!isCuts && !s.opens_film && !s.from_scene) warnings.push(`${where}: no from_scene - if the film opens inside this transition set opens_film: true; otherwise name the outgoing scene`);
});

if (!isCuts) {
  (doc.structure?.scenes || []).forEach((sc, i) => { checkEvidence(sc, `scenes[${i}] (${sc.id})`); checkTime(sc.in, `scenes[${i}].in`); checkTime(sc.out, `scenes[${i}].out`); if (sc.out <= sc.in) errors.push(`scenes[${i}]: out <= in`); });
  (doc.camera?.landings || []).forEach((l, i) => { checkEvidence(l, `landings[${i}] (t=${l.t})`); checkTime(l.t, `landings[${i}]`); if (l.move_in === 'cut' && l.duration !== 0) warnings.push(`landings[${i}]: a cut has duration 0`); });
  (doc.text_motion || []).forEach((tm, i) => { checkEvidence(tm, `text_motion[${i}] (t=${tm.t})`); checkTime(tm.t, `text_motion[${i}]`); });
  // eases[] must cover every ease name used
  const used = new Set();
  for (const s of doc.seams || []) if (s.ease?.gsap) used.add(s.ease.gsap);
  for (const l of doc.camera?.landings || []) if (l.ease?.gsap) used.add(l.ease.gsap);
  for (const t of doc.text_motion || []) if (t.ease?.gsap) used.add(t.ease.gsap);
  const declared = new Set((doc.eases || []).map(e => e.gsap));
  for (const u of used) if (!declared.has(u)) warnings.push(`eases[]: "${u}" is used but not listed - AE / Remotion mapping will miss it`);
  // An ease's GSAP name must be the curve its bezier draws (powerN = penner degree N+1).
  const PENNER = [[[0.11,0,0.5,0],"power1.in"],[[0.5,1,0.89,1],"power1.out"],[[0.45,0,0.55,1],"power1.inOut"],[[0.32,0,0.67,0],"power2.in"],[[0.33,1,0.68,1],"power2.out"],[[0.65,0,0.35,1],"power2.inOut"],[[0.5,0,0.75,0],"power3.in"],[[0.25,1,0.5,1],"power3.out"],[[0.76,0,0.24,1],"power3.inOut"],[[0.64,0,0.78,0],"power4.in"],[[0.22,1,0.36,1],"power4.out"],[[0.83,0,0.17,1],"power4.inOut"],[[0.7,0,0.84,0],"expo.in"],[[0.16,1,0.3,1],"expo.out"],[[0.87,0,0.13,1],"expo.inOut"],[[0.12,0,0.39,0],"sine.in"],[[0.61,1,0.88,1],"sine.out"],[[0.37,0,0.63,1],"sine.inOut"],[[0.55,0,1,0.45],"circ.in"],[[0,0.55,0.45,1],"circ.out"],[[0.85,0,0.15,1],"circ.inOut"],[[0.36,0,0.66,-0.56],"back.in"],[[0.34,1.56,0.64,1],"back.out"],[[0.68,-0.6,0.32,1.6],"back.inOut"],[[0,0,1,1],"none"]];
  const pennerName = bz => { if (!Array.isArray(bz) || bz.length !== 4) return null; for (const [b, n] of PENNER) if (b.every((v, i) => Math.abs(v - Number(bz[i])) < 0.03)) return n; return null; };
  (doc.eases || []).forEach((e, i) => { const exp = pennerName(e.cubic_bezier); const g = String(e.gsap || '').replace(/\(.*\)$/, ''); if (exp && g && !/^custom/i.test(g) && g !== exp) warnings.push(`eases[${i}] "${e.name || g}": gsap "${g}" but the bezier (${e.cubic_bezier.join(', ')}) is "${exp}" - GSAP powerN is penner degree N+1 (power1 = Quad); fix the name or the bezier`); });
  // A seam starts at t and runs frames_24; the cut (the next scene's in) sits inside it.
  { const scenes = doc.structure?.scenes || []; (doc.seams || []).forEach((s, i) => { if (s.t == null || !s.frames_24) return; const end = s.t + s.frames_24 / 24; if (s.t_end != null && Math.abs(s.t_end - end) > 0.06) warnings.push(`seams[${i}] t_end ${s.t_end} != t + frames_24/24 (${end.toFixed(3)}) - t is where the seam starts, t_end where it ends`); const to = scenes.find(x => x.id === s.to_scene); if (to && to.in != null && (to.in < s.t - 0.03 || to.in > end + 0.03)) warnings.push(`seams[${i}] runs ${s.t}-${end.toFixed(3)} but ${s.to_scene} starts at ${to.in} - the cut must sit inside the seam (set t to the seam's first differing frame, usually before the cut)`); }); }
  // "other" is a last resort: suggest the nearest kind from the mechanics the reader wrote.
  (doc.seams || []).forEach((s, i) => { if (!/^other$/i.test(String(s.kind || ''))) return; const og = String(s.outgoing?.treatment || ''), ic = String(s.incoming?.treatment || ''); const both = og + ' ' + ic; const guess = /scale-up|zoom/.test(both) && /blur/.test(both) ? 'blur push' : /slide/.test(og) && /slide/.test(ic) ? 'travel (or wipe when a full-stage element does the sliding)' : /slide|blur/.test(og) && /soft-then-sharp/.test(ic) ? 'travel with a soft-to-sharp resolve, or blur push' : /fade/.test(both) ? 'crossfade' : null; warnings.push(`seams[${i}] (t=${s.t}) kind "other" - ${guess ? 'the mechanics read as "' + guess + '"; name it' : 'name the nearest vocabulary kind or describe the mechanics fully in outgoing / incoming'} - a build has no recipe for "other"`); });
  // camera cadence vs pacing
  if (doc.camera && doc.pacing && Math.abs((doc.camera.cadence_landings_per_s ?? 0) - (doc.pacing.landing_cadence_per_s ?? 0)) > 0.05) warnings.push(`camera.cadence_landings_per_s (${doc.camera.cadence_landings_per_s}) and pacing.landing_cadence_per_s (${doc.pacing.landing_cadence_per_s}) disagree`);
  if (doc.camera) {
    // lens_moves = travelled landings (move_in other than cut / hold). A fixed lens is lens_moves 0, not cadence 0.
    const travelled = (doc.camera.landings || []).filter(l => l.move_in !== 'cut' && l.move_in !== 'hold').length;
    if (Number.isInteger(doc.camera.lens_moves) && doc.camera.lens_moves !== travelled) errors.push(`camera.lens_moves is ${doc.camera.lens_moves} but ${travelled} landing(s) have move_in other than cut / hold - the two must agree`);
  }
  if (doc.camera && duration) {
    const n = (doc.camera.landings || []).length;
    const expect = n / duration;
    if (Math.abs(expect - (doc.camera.cadence_landings_per_s ?? 0)) > 0.1) warnings.push(`camera.cadence_landings_per_s ${doc.camera.cadence_landings_per_s} vs ${n} landings / ${duration}s = ${expect.toFixed(2)} - cadence counts every landing, cuts included`);
    const maxHold = Math.max(0, ...(doc.camera.landings || []).map(l => l.hold || 0));
    if (doc.camera.max_hold && maxHold > doc.camera.max_hold + 0.05) warnings.push(`camera.max_hold ${doc.camera.max_hold} but a landing holds ${maxHold}`);
  }
  if (doc.meta?.black_tail > 0.5 && !(doc.do_not || []).some(x => /black/i.test(x))) warnings.push(`meta.black_tail is ${doc.meta.black_tail}s - add a do_not line so nobody rebuilds the tail`);
  if (doc.meta?.source && /[\\/]/.test(doc.meta.source)) errors.push('meta.source must be a file name, not a path');
  // Placeholders left by spec-from-cuts.mjs: a "TODO" string or an empty core section is not a spec yet.
  (function walk(v, p) {
    if (typeof v === 'string') { if (v.trim() === 'TODO') errors.push(`${p}: placeholder "TODO" not filled in`); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  })(doc, 'spec');
  for (const [p, arr] of [['identity.palette', doc.identity?.palette], ['structure.scenes', doc.structure?.scenes], ['camera.landings', doc.camera?.landings]]) {
    if (Array.isArray(arr) && arr.length === 0) errors.push(`${p}: empty - a spec needs at least one entry here`);
  }
  // The spec never quotes the reference. No on-screen copy in quotes, no brand / product / mascot
  // name anywhere except meta.reference_brand_terms. Everything downstream (storyboards, briefs,
  // the shared library) copies these strings verbatim, so a leak here is a leak everywhere.
  {
    const terms = Array.isArray(doc.meta?.reference_brand_terms) ? doc.meta.reference_brand_terms.map(s => String(s).trim()).filter(Boolean) : null;
    if (!terms) warnings.push('meta.reference_brand_terms missing - list every product / brand / mascot / slogan word visible in the reference (the only place they may appear)');
    const termRe = terms && terms.length ? new RegExp('(?<![\\w-])(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])', 'i') : null;
    const skip = new Set(['spec.meta', 'spec.evidence_rules']);
    (function walk(v, p) {
      if ([...skip].some(s => p === s || p.startsWith(s + '.') || p.startsWith(s + '['))) return;
      if (typeof v === 'string') {
        if (/["\u201c\u201d]/.test(v)) errors.push(`${p}: quotes on-screen copy - the spec never quotes the reference; describe the element by role ("one headline line, centred") and give words only as counts and timings`);
        else if (termRe && termRe.test(v)) errors.push(`${p}: names the reference's brand (${v.match(termRe)[1]}) - allowed only in meta.reference_brand_terms; say "the brand mark", "the product name", "the mascot"`);
        return;
      }
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
      if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
    })(doc, 'spec');
  }
  for (const [p, arr] of [['identity.type_roles', doc.identity?.type_roles], ['structure.acts', doc.structure?.acts], ['eases', doc.eases], ['do_not', doc.do_not]]) {
    if (Array.isArray(arr) && arr.length === 0) warnings.push(`${p}: empty - fill it or say why in a note`);
  }
}
(doc.ui_motion?.clicks || []).forEach((c, i) => { checkEvidence(c, `clicks[${i}] (t=${c.t})`, { requireCite: false }); checkTime(c.t, `clicks[${i}]`); });
(doc.ui_motion?.typing_beats || []).forEach((b, i) => { checkTime(b.in, `typing_beats[${i}].in`); checkTime(b.out, `typing_beats[${i}].out`); });

// ---------------- report ----------------
const label = isCuts ? 'cuts.json' : 'motion-spec.json';
if (!args.quiet) {
  for (const w of warnings) console.log('WARN  ' + w);
  for (const e of errors) console.log('ERROR ' + e);
}
const seams = (doc.seams || []).length;
const guesses = (doc.seams || []).filter(s => !(s.evidence || []).length).length;
console.log(`${label}: ${errors.length} error(s), ${warnings.length} warning(s); ${seams} seams (${guesses} without evidence)` + (isCuts ? '' : `, ${(doc.camera?.landings || []).length} landings, ${(doc.structure?.scenes || []).length} scenes`));
if (isCuts && Array.isArray(doc.candidates) && doc.candidates.length) console.log(`candidates: ${doc.candidates.length} (scratch list, not validated)`);
process.exit(errors.length ? 1 : 0);
