// Shared helpers for the video-storyboard scripts. Node 18+, no dependencies.
// Nothing here touches the network or the clock; every output is deterministic for the same input.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATUSES = ['kept', 'override', 'added', 'dropped'];

// ---------- args ----------

export function parseArgs(argv, spec = {}) {
  // spec: { flag: 'string' | 'number' | 'boolean' | 'list' }
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const kind = spec[key];
      if (!kind) throw new Error('unknown option --' + key);
      if (kind === 'boolean') { out[key] = true; continue; }
      const v = argv[++i];
      if (v === undefined) throw new Error('--' + key + ' needs a value');
      if (kind === 'number') out[key] = Number(v);
      else if (kind === 'list') out[key] = v.split(',').map(s => s.trim()).filter(Boolean);
      else out[key] = v;
    } else out._.push(a);
  }
  return out;
}

export function usage(text, code = 1) { console.error(text); process.exit(code); }

// ---------- files ----------

export function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
export function writeJson(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
export function exists(p) { try { fs.statSync(p); return true; } catch { return false; } }
export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

// `<folder>` or `<folder>/scene-map.json` -> { folder, mapFile, map }
export function loadMap(arg) {
  const abs = path.resolve(arg);
  const isFile = exists(abs) && fs.statSync(abs).isFile();
  const folder = isFile ? path.dirname(abs) : abs;
  const mapFile = isFile ? abs : path.join(folder, 'scene-map.json');
  if (!exists(mapFile)) throw new Error('no scene-map.json in ' + folder + ' (run scene-map.mjs first)');
  return { folder, mapFile, map: readJson(mapFile) };
}

// The spec the map was built from: map.spec.path, absolute or relative to the map folder.
export function resolveSpec(map, folder) {
  const p = map?.spec?.path;
  if (!p) return { file: null, spec: null };
  const file = path.isAbsolute(p) ? p : path.resolve(folder, p);
  if (!exists(file)) return { file, spec: null };
  try { return { file, spec: readJson(file) }; } catch { return { file, spec: null }; }
}

// ---------- the sibling skill (reference-motion-spec) ----------

// Finds a script of the reference-motion-spec skill without copying it: an explicit path, the
// environment, the sibling folder (skills live side by side in skills/ or .claude/skills/), the
// user-wide skills folder, the project's .claude/skills. Returns the absolute path or null.
export function findSkill1Script(scriptName, explicit) {
  const cands = [];
  if (explicit) cands.push(path.resolve(explicit));
  if (process.env.REFERENCE_MOTION_SPEC_DIR) cands.push(path.join(process.env.REFERENCE_MOTION_SPEC_DIR, 'scripts', scriptName));
  cands.push(path.join(SKILL_ROOT, '..', 'reference-motion-spec', 'scripts', scriptName));
  cands.push(path.join(process.cwd(), '.claude', 'skills', 'reference-motion-spec', 'scripts', scriptName));
  cands.push(path.join(os.homedir(), '.claude', 'skills', 'reference-motion-spec', 'scripts', scriptName));
  for (const c of cands) if (exists(c) && fs.statSync(c).isFile()) return path.resolve(c);
  return null;
}

export function skill1Missing(scriptName) {
  return `reference-motion-spec/scripts/${scriptName} not found. Install the reference-motion-spec skill next to this one (skills/reference-motion-spec or ~/.claude/skills/reference-motion-spec), or pass --renderer <path> / set REFERENCE_MOTION_SPEC_DIR. This skill imports that renderer; it does not carry a copy.`;
}

// ---------- profiles ----------

// profiles/<name>.md: prose for the model plus one ```json block of machine hints.
export function loadProfile(name) {
  if (!name) return null;
  const file = path.join(SKILL_ROOT, 'profiles', `${String(name).toLowerCase()}.md`);
  if (!exists(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/```json\s*\n([\s\S]*?)\n```/);
  let hints = null;
  if (m) { try { hints = JSON.parse(m[1]); } catch { hints = null; } }
  return { name: String(name).toLowerCase(), file, text, hints };
}

export function listProfiles() {
  const dir = path.join(SKILL_ROOT, 'profiles');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));
}

// ---------- text ----------

export function slugify(s, max = 6) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, max).join('-') || 'storyboard';
}
// cubic-bezier -> GSAP name (GSAP powerN is the penner curve of degree N+1). The bezier is the exact form; a name that disagrees with it is corrected.
export const PENNER = [[[0.11,0,0.5,0],'power1.in'],[[0.5,1,0.89,1],'power1.out'],[[0.45,0,0.55,1],'power1.inOut'],[[0.32,0,0.67,0],'power2.in'],[[0.33,1,0.68,1],'power2.out'],[[0.65,0,0.35,1],'power2.inOut'],[[0.5,0,0.75,0],'power3.in'],[[0.25,1,0.5,1],'power3.out'],[[0.76,0,0.24,1],'power3.inOut'],[[0.64,0,0.78,0],'power4.in'],[[0.22,1,0.36,1],'power4.out'],[[0.83,0,0.17,1],'power4.inOut'],[[0.7,0,0.84,0],'expo.in'],[[0.16,1,0.3,1],'expo.out'],[[0.87,0,0.13,1],'expo.inOut'],[[0.12,0,0.39,0],'sine.in'],[[0.61,1,0.88,1],'sine.out'],[[0.37,0,0.63,1],'sine.inOut'],[[0.55,0,1,0.45],'circ.in'],[[0,0.55,0.45,1],'circ.out'],[[0.85,0,0.15,1],'circ.inOut'],[[0.36,0,0.66,-0.56],'back.in'],[[0.34,1.56,0.64,1],'back.out'],[[0.68,-0.6,0.32,1.6],'back.inOut'],[[0,0,1,1],'none']];
export const pennerName = bz => { if (!Array.isArray(bz) || bz.length !== 4) return null; for (const [b, n] of PENNER) if (b.every((v, i) => Math.abs(v - Number(bz[i])) < 0.03)) return n; return null; };
export const easeFromTable = (map, name) => { const spec = map?.__spec; const e = (spec?.eases || []).find(x => x.gsap === name); return e ? { ...e } : { gsap: name }; };
export const fixEase = e => { if (!e || typeof e !== 'object') return e; const exp = pennerName(e.cubic_bezier); const g = String(e.gsap || '').replace(/\(.*\)$/, ''); return exp && g && !/^custom/i.test(g) && g !== exp ? { ...e, gsap: exp, gsap_as_read: e.gsap } : e; };
export const r3 = n => Math.round(Number(n) * 1000) / 1000;
export const t2 = x => typeof x === 'number' ? x.toFixed(2) : String(x ?? '—');
// A markdown table cell: no pipes, no line breaks.
export const cell = x => x == null || x === '' ? '' : String(x).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

// Tile lists: consecutive tiles collapse to a range: [1,2,3,9] -> "1-3,9" (same style as the spec renderer).
export function tileRanges(tiles) {
  const t = [...new Set(tiles || [])].sort((a, b) => a - b), out = [];
  for (let i = 0; i < t.length;) { let j = i; while (j + 1 < t.length && t[j + 1] === t[j] + 1) j++; out.push(j > i ? `${t[i]}-${t[j]}` : `${t[i]}`); i = j + 1; }
  return out.join(',');
}
export const ev = rows => (rows || []).map(e => (e.tiles || []).length ? `${e.sheet}:${tileRanges(e.tiles)}` : e.sheet).join('; ') || '';

// ---------- our timeline ----------

// Our times are derived, not stored: rows run in order, dropped rows take no time, each kept
// row starts where the previous one ended. Returns per-row {in, out, duration, ratio} and a
// remap(t) that maps a reference time into our timeline (null when it falls in a dropped scene).
export function timeline(map) {
  const rows = map.rows || [];
  const times = [];
  let cursor = 0;
  for (const r of rows) {
    const dropped = r.our?.status === 'dropped';
    const dur = dropped ? 0 : Number(r.our?.duration ?? r.ref_duration ?? 0);
    const refDur = (r.ref_span_out ?? r.ref_out ?? 0) - (r.ref_in ?? 0);
    times.push({ in: r3(cursor), out: r3(cursor + dur), duration: r3(dur), ratio: refDur > 0 && !dropped ? r3(dur / refDur) : null, dropped });
    if (!dropped) cursor += dur;
  }
  const total = r3(cursor);
  const remap = (t) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], tm = times[i];
      const refOut = r.ref_span_out ?? r.ref_out;
      if (r.ref_in == null || refOut == null) continue;
      const last = i === rows.length - 1 || rows.slice(i + 1).every(x => x.ref_in == null);
      const inside = t >= r.ref_in - 1e-6 && (t < refOut - 1e-6 || (last && t <= refOut + 1e-6));
      if (!inside) continue;
      if (tm.dropped) return null;
      const refDur = refOut - r.ref_in;
      const f = refDur > 0 ? (t - r.ref_in) / refDur : 0;
      return r3(tm.in + f * tm.duration);
    }
    return null;
  };
  return { times, total, remap };
}

export function copyById(map) {
  const m = new Map();
  for (const c of map.copy || []) m.set(c.id, c);
  return m;
}

export function isEditorial(row) {
  const s = (row.our?.screen || '').toLowerCase(), sf = (row.our?.surface || '').toLowerCase();
  return s === 'editorial' || sf === 'editorial' || (!s && !sf);
}

// ---------- frames, triggers, the rig table ----------
// A build asks for these after the fact (a real build in a tool with no camera object did): the
// press frame of every click, what is in frame at every result, the forbidden overlaps, and a
// per-landing row a 3D null / rig can be keyed from. Both storyboard.md and brief-<tool>.md render
// them from here so the two never differ.

export const fpsOf = map => Number(map?.target?.fps) > 0 ? Number(map.target.fps) : 24;
export const frameAt = (t, fps) => t == null ? null : Math.round(t * fps);

// Per row: every trigger with our time (t set on the trigger, else the reference time re-mapped)
// and its frame at the target fps.
export function triggersOf(row, tl, fps) {
  return (row.our?.triggers || []).map(tr => {
    const t = tr.t != null ? Number(tr.t) : (tr.ref_t != null ? tl.remap(tr.ref_t) : null);
    return { ...tr, t, frame: frameAt(t, fps), text: t == null ? `${tr.action || 'press'} — press frame not set${tr.target ? ` (${tr.target})` : ''}` : `${tr.action || 'press'} @ ${t.toFixed(2)} s / f${frameAt(t, fps)} @${fps}${tr.target ? ` — ${tr.target}` : ''}${tr.ref_t != null ? ` (ref ${Number(tr.ref_t).toFixed(2)} s)` : ''}` };
  });
}

// The scene-map companion table: | scene | trigger | in frame at the result | forbidden overlaps |
export function triggerTable(map, tl, fps) {
  const L = ['| scene | trigger | in frame at the result | forbidden overlaps |', '|---|---|---|---|'];
  (map.rows || []).forEach((r, i) => {
    if (tl.times[i].dropped) return;
    const o = r.our || {};
    const trig = triggersOf(r, tl, fps).map(x => x.text).join('; ') || (r.ui?.clicks?.length ? 'MISSING — the reference clicks here' : 'none (no click; the scene starts on its cut)');
    L.push(`| ${r.ref_scene || `added ${i + 1}`} | ${cell(trig)} | ${cell(o.in_frame_at_result || (r.ui?.payoffs?.length ? 'MISSING — the reference has a payoff here' : '—'))} | ${cell((o.forbidden_overlaps || []).join('; ') || '—')} |`);
  });
  return L;
}

// The camera plan as a rig table: one row per landing in our timeline.
export function rigLandings(map, tl, fps) {
  const rows = map.rows || [];
  const out = [];
  rows.forEach((r, i) => {
    const tm = tl.times[i]; if (tm.dropped) return;
    for (const l of r.landings || []) { const t = tl.remap(l.t); if (t != null) out.push({ l, r, t, tm }); }
  });
  out.forEach((x, k) => {
    const next = out[k + 1];
    x.hold = r3((next ? next.t : tl.total) - x.t - (x.l.duration || 0));
    x.frame = frameAt(x.t, fps);
    x.moveFrames = Math.round((x.l.duration || 0) * fps);
    x.holdFrames = Math.round(x.hold * fps);
    const o = x.r.our || {};
    x.subject = isEditorial(x.r) ? (o.visible || x.l.subject) : `${o.visible || o.screen} (\`${o.screen}\` / ${o.state || 'default'})`;
    // A landing's own anchor when the row names one; the row anchor otherwise.
    const la = (o.landing_anchors || []).find(a => Math.abs((Number(a.t) ?? -1) - x.l.t) < 0.03 && (a.anchor || '').trim());
    const A = la ? la : { anchor: o.anchor, anchor_px: o.anchor_px, anchor_box: o.anchor_box };
    x.anchor = A.anchor ? `${A.anchor}${Array.isArray(A.anchor_px) ? ` (page px ${A.anchor_px.join(',')})` : ''}` : (isEditorial(x.r) ? `frame centre of: ${o.visible || x.l.subject}` : `— not set (centre the element the scene is about)`);
    // The spec's fill is the reference's framing; our zoom comes from it and the measured box: zoom = fill × stage / box.
    const stg = map.target?.stage || { width: 1920, height: 1080 }; const box = (A && A.anchor_box) || o.anchor_box || null;
    const derived = (x.l.fill != null && box && box.w && box.h) ? r3(x.l.fill * ((x.l.fill_basis || 'height') === 'width' ? stg.width / box.w : stg.height / box.h)) : null;
    x.zoomDerived = derived;
    x.scalePct = x.l.zoom != null ? `${Math.round(x.l.zoom * 100)}${derived != null && Math.abs(derived - x.l.zoom) > 0.05 ? ` (fill ${x.l.fill} of the measured ${box.w}×${box.h} box gives ${Math.round(derived * 100)} — the spec's zoom is the reference's)` : ''}` : (derived != null ? `${Math.round(derived * 100)} (from fill ${x.l.fill} of the measured ${box.w}×${box.h} box)` : (x.l.fill != null ? `fill ${x.l.fill} (${x.l.fill_basis || 'height'}) — zoom not measured` : '—'));
    x.rotation = o.rotation_deg != null ? o.rotation_deg : 0;
    const e = x.l.ease && typeof x.l.ease === 'object' ? fixEase(x.l.ease) : (x.l.ease ? fixEase(easeFromTable(map, x.l.ease)) : null);
    x.ease = x.l.move_in === 'cut' || x.l.move_in === 'hold' ? 'hold keyframe (cut)' : e ? `${e.gsap || '—'}${e.cubic_bezier ? ` cubic-bezier(${e.cubic_bezier.join(', ')})` : ''} — bake to per-frame keys` : 'ease not read on the strip — bake linear, flag it';
    const trig = triggersOf(x.r, tl, fps).filter(tr => tr.t != null && tr.t <= x.t + 0.5);
    x.trigger = trig.length ? trig[trig.length - 1].text : (k === 0 ? 'the film opens on it' : `the cut at ${x.t.toFixed(2)} s`);
  });
  return out;
}

export function rigTable(map, tl, fps) {
  const L = [`| our t (s) | frame @${fps} | ref t | our subject | anchor (page point) | scale % | rot ° | move in | move (f) | hold (s) | hold (f) | ease | trigger | class | carries the hold | evidence |`, '|---:|---:|---:|---|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|'];
  for (const x of rigLandings(map, tl, fps)) {
    L.push(`| ${x.t.toFixed(2)} | ${x.frame} | ${t2(x.l.t)} | ${cell(x.subject)} | ${cell(x.anchor)} | ${x.scalePct} | ${x.rotation} | ${x.l.move_in} | ${x.moveFrames} | ${x.hold.toFixed(2)} | ${x.holdFrames} | ${cell(x.ease)} | ${cell(x.trigger)} | ${x.l.movement_class || ''} | ${cell(x.r.our?.motion || x.r.ref_hold_carrier)} | ${cell(x.l.evidence)} |`);
  }
  return L;
}

export function cameraHeader(map, fps) {
  const cam = map.camera || {};
  const cadenceWords = cam.cadence_landings_per_s > 0 ? `~1 landing / ${(1 / cam.cadence_landings_per_s).toFixed(1)} s across ${cam.landings ?? '?'} landings, cuts included` : `${cam.landings ?? '?'} landings`;
  return [
    `Cadence: ${cam.cadence_landings_per_s ?? '—'} landings / s (${cadenceWords}) — copied from the spec`,
    `Lens moves: ${cam.lens_moves ?? '—'}${cam.lens_moves === 0 ? ' (fixed lens)' : ''}`,
    `Max hold: ${t2(cam.max_hold)} s`,
    `Ease voice: ${cam.ease_voice ?? '—'}`,
    `Zoom range: ${(cam.zoom_range || []).join('–') || '—'}`,
    `Lens: ${cam.lens_note || '—'}`,
    `Target fps: ${fps} (frames below are at this rate)`,
  ];
}
