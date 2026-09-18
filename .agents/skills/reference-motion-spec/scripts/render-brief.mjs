#!/usr/bin/env node
// render-brief.mjs <motion-spec.json> --target <hyperframes|after-effects|remotion|generic|spec-md> [--fps 24] [--out <file | dir/>]
//
// --out names a file, or a directory (an existing folder, or a path ending in / or \): the
// default file name (brief-<target>.md / motion-spec.md) is then written inside it.
// Renders the SAME spec as build instructions for one target tool. Nothing is added that the
// spec does not contain: a brief is a view, not a second analysis. `spec-md` renders the
// human-readable motion-spec.md next to the JSON.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readJson } from './lib.mjs';

import { renderClaudeDesign } from './brief-claude-design.mjs';
const TARGETS = ['hyperframes', 'claude-design', 'after-effects', 'remotion', 'generic', 'spec-md'];
const args = parseArgs(process.argv.slice(2), { target: 'string', fps: 'number', out: 'string' });
const file = args._[0];
const target = args.target || 'generic';
if (!file || !TARGETS.includes(target)) { console.error(`usage: render-brief.mjs <motion-spec.json> --target <${TARGETS.join('|')}> [--fps N] [--out <file | dir/>]\n  --out: a file path, or a directory (existing folder, or a path ending in / or \\) that receives the default file name`); process.exit(1); }
const spec = readJson(file);
const fps = args.fps || 24;
const dir = path.dirname(path.resolve(file));
const defaultName = target === 'spec-md' ? 'motion-spec.md' : `brief-${target}.md`;
let outFile = path.join(dir, defaultName);
if (args.out) {
  const o = path.resolve(args.out);
  const isDir = /[\\/]$/.test(args.out) || (fs.existsSync(o) && fs.statSync(o).isDirectory());
  if (isDir) { fs.mkdirSync(o, { recursive: true }); outFile = path.join(o, defaultName); }
  else outFile = o;
}

const L = [];
const push = (...s) => L.push(...s);
const t3 = x => typeof x === 'number' ? x.toFixed(2) : String(x ?? '—');
const fr = frames24 => frames24 == null ? '—' : fps === 24 ? `${frames24} f` : `${Math.round(frames24 * fps / 24)} f @${fps}`;
const bez = e => e?.cubic_bezier ? `cubic-bezier(${e.cubic_bezier.join(', ')})` : '—';
// Stage-camera voice from a landing's ease: overshoot -> punch, hard decel -> snap, symmetric -> glide.
// Never invents an overshoot the strip did not show (rule 1: exact replica).
const voiceFromEase = (e, fallback = 'snap') => {
  const g = (e?.gsap || '').toLowerCase();
  if (!g) return fallback;
  if (/back|elastic/.test(g)) return 'punch';
  if (/inout|sine/.test(g)) return 'glide';
  if (/expo|power[2-4]\.out|circ\.out|custom/.test(g)) return 'snap';
  return fallback;
};
// Tile lists: consecutive tiles collapse to a range, the rest join with commas: [1..9,13,19] -> "1-9,13,19".
const tileRanges = tiles => {
  const t = [...new Set(tiles || [])].sort((a, b) => a - b), out = [];
  for (let i = 0; i < t.length;) { let j = i; while (j + 1 < t.length && t[j + 1] === t[j] + 1) j++; out.push(j > i ? `${t[i]}-${t[j]}` : `${t[i]}`); i = j + 1; }
  return out.join(',');
};
const ev = rows => (rows || []).map(e => (e.tiles || []).length ? `${e.sheet}:${tileRanges(e.tiles)}` : e.sheet).join('; ') || 'no citation (guess)';
const conf = r => r.confidence ? ` [${r.confidence}]` : '';
const cite = rows => (rows || []).length ? `// ref ${(rows || []).map(e => `${e.sheet}:${tileRanges(e.tiles)}`).join(' ')}` : '// ref: none — guess';
// A note inside a markdown table cell: no pipes, no line breaks.
const cell = x => x == null || x === '' ? '' : String(x).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const noteCell = x => cell(x) ? ` — ${cell(x)}` : '';

const meta = spec.meta || {}, cam = spec.camera || {}, seams = spec.seams || [], scenes = spec.structure?.scenes || [];
const landings = cam.landings || [];
const seamAt = t => seams.find(s => Math.abs(s.t - t) < 0.15);
const seamAfterScene = sc => seams.find(s => s.t >= sc.out - 0.15 && s.t <= sc.out + 0.15) || seams.find(s => s.from_scene === sc.id);
const landingsIn = sc => landings.filter(l => l.t >= sc.in - 0.03 && l.t < sc.out - 0.03);
const textIn = sc => (spec.text_motion || []).filter(t => t.t >= sc.in - 0.03 && t.t < sc.out);
const clicksIn = sc => (spec.ui_motion?.clicks || []).filter(c => c.t >= sc.in - 0.03 && c.t < sc.out);
const typingIn = sc => (spec.ui_motion?.typing_beats || []).filter(b => b.in < sc.out && b.out > sc.in);
const payoffsIn = sc => (spec.ui_motion?.payoffs || []).filter(p => p.t >= sc.in - 0.03 && p.t < sc.out);
// Fixed lens is decided from the landings, never from words in lens_note: lens_moves 0, or no landing travels.
const travelled = landings.filter(l => l.move_in !== 'cut' && l.move_in !== 'hold').length;
const lensMoves = Number.isInteger(cam.lens_moves) ? cam.lens_moves : travelled;
const fixedLens = cam.lens_moves === 0 || travelled === 0;
const lensLine = fixedLens ? 'Lens moves: 0 (fixed lens)' : `Lens moves: ${lensMoves} travelled landings`;
// The storyboard's "Ease voice:" line wants one of the stage-camera voices. A cuts-only film has
// none; a film with travelled landings gets the voice their eases map to (snap / glide / punch).
function easeVoiceLine() {
  const declared = cam.ease_voice ?? '—';
  const moved = landings.filter(l => l.move_in !== 'cut' && l.move_in !== 'hold');
  if (!moved.length) return `${declared} — every framing change is a cut; no travelled voice to declare`;
  const voices = [...new Set(moved.map(l => voiceFromEase(l.ease, 'snap')))];
  return `${voices.join(' / ')} on the ${moved.length} travelled landing(s) (from their eases); every other framing change is a cut${declared !== '—' && !voices.includes(declared) ? ` — spec declared "${declared}"` : ''}`;
}
const cadenceWords = cam.cadence_landings_per_s > 0 ? `~1 landing / ${(1 / cam.cadence_landings_per_s).toFixed(1)} s across ${landings.length} landings, cuts included` : `${landings.length} landings`;

// ---------------- shared blocks ----------------
function header(title, sections) {
  push(`# ${title}`, '',
    `Source: ${meta.source ?? '—'} · ${t3(meta.duration)} s = ${Math.round((meta.duration || 0) * fps)} frames at ${fps} fps · ${meta.width}×${meta.height} (${meta.aspect}) · ${meta.fps} fps source, read on a 24 fps grid · audio: ${meta.audio ? 'yes' : 'none (silent)'}${meta.black_tail ? ` · black tail ${meta.black_tail} s (do not rebuild it)` : ''}${meta.presentation_chrome ? ` · presentation chrome: ${meta.presentation_chrome}` : ''}`,
    '',
    `Sections rendered: ${sections}${(spec.do_not || []).length ? ', do-not' : ''}`,
    '',
    `> Times are approximate within 1/24 s. Frame counts are on the 24 fps grid${fps !== 24 ? `, converted to ${fps} fps where marked @${fps}` : ''}. No value below is a recovered keyframe or a source ease; eases are named from the strip's shape (see \`basis\`).`,
    '',
    meta.evidence_dir ? '**Evidence folder:** `' + meta.evidence_dir + '`' : '',
    '**Evidence ids** (in the evidence folder above, else beside this brief): `c-NNN` = 4 fps composition sheet in `sheets/` (tiles 1–30, 0.25 s each); `f-NNN` = 24 fps sheet in `sheets/` (tiles 1–48, 2 s per sheet); `w-<t>` = 24 fps strip in `windows/` around one seam (tile count per strip in `windows/index.json`); `frame-<t>` = full-resolution measurement frame in `frames/`; `overview` = 24 evenly spaced cells. Cites read `sheet:tiles` with ranges (`f-003:22-23`); `sheets/map.txt` resolves any cell to a frame and a time.',
    ...(isLoop(meta.loop) ? ['', `**Loop:** ${meta.loop.trim()}. The ledger lists every cycle. Decide up front how a target of another length uses it: keep both cycles verbatim, keep one, or reuse the shots with new content (an OVERRIDE) — the reference's beat count per cycle still governs.`] : []),
    '');
}
function isLoop(v) {
  // meta.loop is a free-text field; "no", "none", "not a loop" or an empty string mean the film does not loop.
  return typeof v === 'string' && v.trim().length > 0 && !/^(no\b|none\b|not\b|n\/a|false\b)/i.test(v.trim());
}
function rulesBlock() {
  push('## Rules that made replicas work', '',
    '1. **Build an exact replica.** Say those words in the build brief. Left alone, a builder adds re-aims, glides and settles the reference never had. Every landing and seam below is the whole movement budget.',
    '2. **Read the seam strips before writing any transition.** A 4 fps read turns every 1–7-frame dissolve into a hard cut and the film ships blinks. The seam kinds below came from 24 fps strips; keep their frame counts.',
    '3. **Camera, object and content motion are three different things.** A card growing is an object move; text typing inside a stable box is content; only a whole-composition reframe is camera. Build each with its own mechanism.',
    '4. **A payoff arrives after a beat.** Show the "before" for the `before_hold` given, then the change with its own motion.',
    '5. **Hold what the reference holds.** A hold is carried by the subject\'s own motion (typing, cursor, settle), not by a drift the reference does not have.',
    ...(fixedLens ? ['6. **The lens does not move in this reference.** Every framing change is a cut. Do not add pushes, glides or drifts.'] : []),
    '');
  if ((spec.do_not || []).length) { push('## Do not', '', ...spec.do_not.map(x => `- ${x}`), ''); }
}
function identityBlock() {
  const id = spec.identity || {};
  push('## Identity', '');
  if (id.palette?.length) push('Palette: ' + id.palette.map(p => `\`${p.hex}\` ${p.role}${p.note ? ` (${p.note})` : ''}`).join(' · '));
  if (id.type_roles?.length) push('Type: ' + id.type_roles.map(t => `${t.role} ${(t.size_frac * 100).toFixed(1)}% of frame height${t.weight ? ' ' + t.weight : ''}${t.style ? ' ' + t.style : ''}`).join(' · '));
  push(`Ground: ${id.ground ?? '—'}`, `Host element: ${id.host_element ?? '—'}`, `Brand colour role: ${id.brand_role ?? '—'}`, '');
}
function structureBlock() {
  const acts = spec.structure?.acts || [];
  if (acts.length) { push('## Structure', '', ...acts.map(a => `- **${a.name}** ${t3(a.in)}–${t3(a.out)} s${a.note ? ' — ' + a.note : ''}`), ''); }
}
function cameraSummary() {
  push('## Camera plan', '',
    `Cadence: ${cam.cadence_landings_per_s != null ? `${cam.cadence_landings_per_s} landings / s (${cadenceWords})` : '—'}`,
    lensLine,
    `Max hold: ${t3(cam.max_hold)} s`,
    `Ease voice: ${easeVoiceLine()}`,
    `Zoom range: ${(cam.zoom_range || []).join('–') || '—'}`,
    `Lens: ${cam.lens_note ?? '—'}`, '');
}
function landingTable(mapVerb) {
  push('| t | subject | fill / zoom | move in | duration | hold | class | carries the hold | evidence | note |', '|---:|---|---|---|---:|---:|---|---|---|---|');
  for (const l of landings) {
    const sc = scenes.find(s => l.t >= s.in - 0.03 && l.t < s.out);
    push(`| ${t3(l.t)} | ${l.subject} | ${l.fill != null ? `fill ${l.fill} (${l.fill_basis || 'height'})` : ''}${l.zoom != null ? ` zoom ${l.zoom}` : ''} | ${mapVerb ? mapVerb(l) : l.move_in}${l.ease ? ` · ${l.ease.gsap}` : ''} | ${t3(l.duration)} | ${t3(l.hold)} | ${l.movement_class} | ${sc?.hold_carrier ?? ''} | ${ev(l.evidence)}${conf(l)} | ${cell(l.note)} |`);
  }
  push('');
}
function seamTable(mapSeam) {
  push('| # | t | kind | frames | outgoing | incoming | carrier | on hit | ease | evidence | note |', '|---|---:|---|---:|---|---|---|---|---|---|---|');
  seams.forEach((s, i) => {
    const og = s.outgoing || {}, ic = s.incoming || {};
    const flags = [s.opens_film ? 'opens the film' : '', s.loop_join ? 'loop join' : '', s.settle_on_onset ? 'settle on onset' : ''].filter(Boolean).join(', ');
    push(`| ${s.id || i + 1} | ${t3(s.t)} | ${mapSeam ? mapSeam(s) : s.kind}${flags ? ` (${flags})` : ''} | ${fr(s.frames_24)} | ${og.treatment}${og.direction && og.direction !== 'none' ? ' ' + og.direction : ''}${og.amount ? ' — ' + cell(og.amount) : ''}${og.frames_24 ? ` (${fr(og.frames_24)})` : ''}${noteCell(og.note)} | ${ic.treatment}${ic.direction && ic.direction !== 'none' ? ' ' + ic.direction : ''}${ic.from_scale ? ` from ×${ic.from_scale}` : ''}${ic.frames_24 ? ` (${fr(ic.frames_24)})` : ''}${noteCell(ic.note)} | ${s.carrier} | ${s.on_onset ? 'yes' : 'no'}${s.onset_delta_ms != null ? ` (${s.onset_delta_ms} ms)` : ''} | ${s.ease?.gsap ?? '—'} ${bez(s.ease)} | ${ev(s.evidence)}${conf(s)} | ${cell(s.note)} |`);
  });
  push('');
}
function beatByBeat(opts = {}) {
  push('## Beat by beat', '');
  scenes.forEach((sc, i) => {
    const seam = seamAfterScene(sc);
    push(`### ${sc.id || 'S' + (i + 1)} · ${t3(sc.in)}–${t3(sc.out)} s · ${sc.subject}`, '');
    push(`- **On screen:** ${sc.subject}. ${sc.composition}. Fill ${sc.framing_fill}.`);
    push(`- **What moves (class):** ${(sc.movement_class || []).join(', ') || '—'}. Hold carried by: ${sc.hold_carrier}.`);
    if (sc.repeats) push(`- **Repeats:** ${sc.repeats}.`);
    if (sc.note) push(`- **Note:** ${sc.note}`);
    for (const l of landingsIn(sc)) push(`- **Landing ${t3(l.t)} s:** ${opts.mapVerb ? opts.mapVerb(l) : l.move_in}${l.duration ? ` over ${t3(l.duration)} s` : ''}${l.ease ? ` (${l.ease.gsap}, ${bez(l.ease)})` : ''} → ${l.subject}, ${l.fill != null ? `fill ${l.fill} ${l.fill_basis || 'height'}` : ''}${l.zoom != null ? ` zoom ${l.zoom}` : ''}; ${l.movement_class}. ${ev(l.evidence)}${l.note ? ` Note: ${l.note}` : ''}`);
    for (const tm of textIn(sc)) push(`- **Text ${t3(tm.t)} s:** ${tm.text_role} — ${tm.mechanism}${tm.per_word_timing?.length ? ` at ${tm.per_word_timing.map(t3).join(' / ')} s` : ''}${tm.duration ? `, ${t3(tm.duration)} s` : ''}${tm.ease ? ` (${tm.ease.gsap})` : ''}, hold ${t3(tm.hold)} s. ${ev(tm.evidence)}${tm.note ? ` Note: ${tm.note}` : ''}`);
    for (const b of typingIn(sc)) push(`- **Typing ${t3(b.in)}–${t3(b.out)} s:** ${b.text_role}; ${b.cadence}${b.surface_growth ? `; ${b.surface_growth}` : ''}. ${ev(b.evidence)}`);
    for (const c of clicksIn(sc)) push(`- **Click ${t3(c.t)} s:** ${c.target} → ${c.reaction}${c.pre_pause != null ? `; cursor rests ${t3(c.pre_pause)} s first` : ''}. ${ev(c.evidence)}`);
    for (const p of payoffsIn(sc)) push(`- **Payoff ${t3(p.t)} s:** ${p.what}; emphasis ${p.emphasis}; show the before for ${t3(p.before_hold)} s. ${ev(p.evidence)}`);
    if (seam) {
      const og = seam.outgoing || {}, ic = seam.incoming || {};
      push(`- **Out (${t3(seam.t)} s): ${opts.mapSeam ? opts.mapSeam(seam) : seam.kind}**, ${fr(seam.frames_24)}. Outgoing ${og.treatment}${og.direction && og.direction !== 'none' ? ' ' + og.direction : ''}${og.amount ? ' (' + og.amount + ')' : ''}${og.note ? ` [${og.note}]` : ''}; incoming ${ic.treatment}${ic.direction && ic.direction !== 'none' ? ' ' + ic.direction : ''}${ic.from_scale ? ` from ×${ic.from_scale}` : ''}${ic.note ? ` [${ic.note}]` : ''}. Carrier: ${seam.carrier}. ${seam.on_onset ? 'Lands on an audio hit.' : 'Not on a hit.'}${seam.settle_on_onset ? ' The incoming settles on an audio hit.' : ''} Ease ${seam.ease?.gsap ?? '—'} ${bez(seam.ease)}. ${ev(seam.evidence)}${seam.note ? ' ' + seam.note : ''}`);
    }
    if (opts.codeCite) push('', '  ```', `  ${cite(sc.evidence)}`, '  ```');
    push('');
  });
}
function easesTable(extraCol) {
  const eases = spec.eases || [];
  if (!eases.length) return;
  push('## Eases', '', `| name | GSAP | cubic-bezier | frames${fps !== 24 ? ` @${fps}` : ''} | used for |${extraCol ? ` ${extraCol.head} |` : ''}`, `|---|---|---|---:|---|${extraCol ? '---|' : ''}`);
  for (const e of eases) push(`| ${e.name} | \`${e.gsap}\` | (${e.cubic_bezier.join(', ')}) | ${fr(e.frames_24)} | ${e.used_for} |${extraCol ? ` ${extraCol.cell(e)} |` : ''}`);
  push('');
}
function soundBlock() {
  const s = spec.sound || {};
  push('## Sound', '');
  if (!s.present) { push('No audio in the reference.', ''); return; }
  const m = s.measured || {};
  push(`Measured on the mixed program: ${m.integrated_lufs ?? '—'} LUFS integrated, LRA ${m.lra_lu ?? '—'} LU, true peak ${m.true_peak_dbtp ?? '—'} dBTP. ${m.note ?? ''}`.trim());
  if (s.layers) push(`Layers: VO — ${s.layers.vo ?? '—'}; music — ${s.layers.music ?? '—'}; SFX — ${s.layers.sfx ?? '—'}.`);
  push(`Energy arc: ${s.energy_arc ?? '—'}. Ending: ${s.ending ?? '—'}.`);
  if (s.sync_points?.length) push('Sync points: ' + s.sync_points.map(p => `${t3(p.t)} s ${p.visual} ↔ ${p.audio}`).join('; '));
  if (s.silence?.length) push('Silence: ' + s.silence.map(x => `${t3(x.start)}–${t3(x.end)} s`).join(', '));
  push('');
}
function pacingBlock() {
  const p = spec.pacing || {};
  push('## Pacing', '', `- Landing cadence: ${p.landing_cadence_per_s ?? '—'} / s · longest hold ${t3(p.longest_hold)} s · cuts per 10 s: ${p.cuts_per_10s ?? '—'}`, `- Seams on audio onsets: ${p.seams_on_onsets ?? '—'}`, `- Typing cadence: ${p.typing_cadence ?? '—'} · stagger spacing: ${p.stagger_spacing ?? '—'}`);
  if (p.holds?.length) push('- Holds: ' + p.holds.map(h => `${t3(h.t)} s ×${t3(h.duration)} s (${h.carrier})`).join('; '));
  push('');
}
function uiBlock() {
  const u = spec.ui_motion || {};
  push('## UI motion', '', `- Cursor: ${u.cursor_present ? 'present' : 'absent'}${u.cursor_style ? ' — ' + u.cursor_style : ''}`, `- Agent vs user steps: ${u.agent_vs_user ?? '—'}`);
  if (u.dropdowns?.length) push('- Dropdowns: ' + u.dropdowns.map(d => `${t3(d.t)} s drop ${d.drop_distance_frac} of frame over ${t3(d.duration)} s`).join('; '));
  if (u.card_rises?.length) push('- Card rises: ' + u.card_rises.map(c => `${t3(c.t)} s rise ${c.rise_distance_frac} of frame${c.from_scale ? ` from ×${c.from_scale}` : ''}${c.soft_in ? ' soft' : ''} over ${t3(c.duration)} s`).join('; '));
  if (u.hover_states?.length) push('- Hover states: ' + u.hover_states.join('; '));
  push('');
}
function grammarBlock() {
  const g = spec.grammar || {};
  push('## Grammar', '', `- Entrances: ${(g.entrances || []).join('; ') || '—'}`, `- Exits: ${(g.exits || []).join('; ') || '—'}`, `- Reveal order: ${g.reveal_order ?? '—'}`, `- Motifs: ${(g.motifs || []).join('; ') || '—'}`, '');
}

// ---------------- target-specific mappings ----------------
// Seam kinds with a SHARED recipe in the tool; every other kind is built video-local from the ledger's outgoing / incoming columns.
// ---------------- After Effects mapping ----------------
// Speed-0 keyframes: outgoing influence = x1 × 100, incoming influence = (1 − x2) × 100. Exact only when the
// bezier's y1 = 0 and y2 = 1; otherwise the pair is marked ≈ and the builder bakes the cubic-bezier to
// per-frame keys. The same formula produces the column in references/vocabulary.md § Eases.
const aeInfluence = e => {
  const b = e.cubic_bezier || [];
  if (b.length !== 4) return '—';
  const [x1, y1, x2, y2] = b;
  const ok = Math.abs(y1) < 0.05 && Math.abs(y2 - 1) < 0.05;
  return `${ok ? '' : '≈ '}out ${Math.round(x1 * 100)}% / in ${Math.round((1 - x2) * 100)}%${ok ? '' : ' (y not 0/1: approximate)'}`;
};
const aeEase = e => {
  if (!(e?.cubic_bezier?.length === 4)) return 'no ease recorded';
  const [x1, y1, x2, y2] = e.cubic_bezier, basis = e.basis ? ` · basis: ${e.basis}` : '';
  if (x1 === 0 && y1 === 0 && x2 === 1 && y2 === 1) return `linear cubic-bezier(0, 0, 1, 1) — no ease, both influences 0 % (linear keys)${basis}`;
  return `${e.gsap ?? '—'} → speed 0, ${aeInfluence(e)} · cubic-bezier(${e.cubic_bezier.join(', ')}) — bake to per-frame keys when exact${basis}`;
};
// The spec carries ONE ease per seam / landing: the settle. The exit phase of a blur / slide / fade takes the
// vocabulary default for that token (references/vocabulary.md § Eases) and is marked as such.
const AE_EXIT_DEFAULT = {
  blur: { gsap: 'power3.in', cubic_bezier: [0.32, 0, 0.67, 0] }, 'scale-down': { gsap: 'power3.in', cubic_bezier: [0.32, 0, 0.67, 0] },
  slide: { gsap: 'power2.in', cubic_bezier: [0.11, 0, 0.5, 0] }, 'scale-up': { gsap: 'power2.in', cubic_bezier: [0.11, 0, 0.5, 0] }, spin: { gsap: 'power2.in', cubic_bezier: [0.11, 0, 0.5, 0] },
  fade: { gsap: 'power1.inOut', cubic_bezier: [0.37, 0, 0.63, 1] }, dim: { gsap: 'power1.inOut', cubic_bezier: [0.37, 0, 0.63, 1] },
};
const AE_ONE_FRAME = new Set(['hard cut', 'match cut', 'reframe cut', 'pixel-matched hard cut']);
const AE_BLUR_DEFAULT_1080 = 20;                                   // vocabulary: blur-dissolve / melt / blur push peak ≈ 20 px at 1080p
const compH = meta.height || 1080, compW = meta.width || 1920;
const aeFrame = t => Math.round((t || 0) * fps);                   // absolute frame at --fps, 0-based (AE's default)
const aeN = frames24 => frames24 == null ? null : Math.max(0, Math.round(frames24 * fps / 24));
const aeSec = s => Math.round((s || 0) * fps);                     // seconds -> frames at --fps
const aeBlurPx = px1080 => Math.round((px1080 ?? AE_BLUR_DEFAULT_1080) * compH / 1080 * 10) / 10;
const r1 = x => Math.round(x * 10) / 10;
const sceneNo = id => { const m = /^S(\d+)$/.exec(id || ''); return m ? 'S' + m[1].padStart(2, '0') : (id || 'S??'); };
const aeShort = s => { const t = String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim(); if (t.length <= 44) return t; const cut = t.slice(0, 44), sp = cut.lastIndexOf(' '); return (sp > 20 ? cut.slice(0, sp) : cut) + '…'; };
const aeLayer = sc => sc ? `${sceneNo(sc.id)} ${aeShort(sc.subject)}` : null;
const sceneById = id => scenes.find(s => s.id === id);
const sceneAt = t => scenes.find(s => t >= s.in - 0.03 && t < s.out);
const aeSeamLayers = s => {
  const a = s.opens_film ? null : (sceneById(s.from_scene) || scenes.find(sc => Math.abs(sc.out - s.t) < 0.15));
  const b = sceneById(s.to_scene) || sceneAt(s.t + 0.05);
  return {
    out: s.opens_film ? 'none (the film opens inside this seam)' : (aeLayer(a) || `${s.from_scene || 'S??'} (from_scene not in structure.scenes)`),
    in: aeLayer(b) || `${s.to_scene || 'S??'} (to_scene not in structure.scenes)`,
    seam: `${a ? sceneNo(a.id) : (s.opens_film ? 'open' : 'S??')}>${b ? sceneNo(b.id) : 'S??'} seam`,
  };
};
const aeAnchor = l => { const b = l.box; return b && ['x', 'y', 'w', 'h'].every(k => typeof b[k] === 'number') ? `${r1(b.x + b.w / 2)}, ${r1(b.y + b.h / 2)} px (box ${b.w}×${b.h} at ${b.x},${b.y})` : `measure: ${aeShort(l.subject)}`; };
const aeScale = l => l.zoom != null ? `${Math.round(l.zoom * 100)} % (zoom × 100)` : l.fill != null ? `from fill: subject = ${Math.round(l.fill * 100)} % of frame ${l.fill_basis || 'height'} (zoom absent — scale the rig until the subject's box fills that)` : 'measure';
const aeRot = l => l.rotation_deg != null ? `${l.rotation_deg}°` : '0° (none recorded)';
const aeTrigger = l => {
  const tr = l.trigger;
  if (tr && tr.kind === 'none') return 'none';
  if (tr && tr.kind) {
    const tt = tr.t ?? (tr.frame_24 != null ? (tr.frame_24 - 1) / 24 : null);
    return `${tr.kind} @ f${tt != null ? aeFrame(tt) : '?'}${tt != null ? ` (${t3(tt)} s)` : ''}${tr.note ? ' — ' + cell(tr.note) : ''}`;
  }
  const hints = [];
  const click = (spec.ui_motion?.clicks || []).find(c => c.t <= l.t + 0.02 && c.t >= l.t - 0.5);
  if (click) hints.push(`click at f${aeFrame(click.t)} (${t3(click.t)} s) on ${aeShort(click.target)}, ${t3(l.t - click.t)} s earlier — confirm it as the press`);
  if (typeof l.onset_delta_ms === 'number' && Math.abs(l.onset_delta_ms) <= 60) hints.push(`audio onset Δ ${l.onset_delta_ms} ms — a beat`);
  return `none recorded${hints.length ? '; ' + hints.join('; ') : ''}`;
};
// One seam -> effect + radius, dim, overlap / cut, per-phase keyframe lists, per-phase eases, layer names.
function aeSeam(s) {
  const og = s.outgoing || {}, ic = s.incoming || {};
  const outToks = String(og.treatment || 'none').split('+'), inToks = String(ic.treatment || 'none').split('+');
  const blurs = outToks.includes('blur') || inToks.includes('soft-then-sharp');
  const R = aeBlurPx(s.blur_px_1080);
  const effect = blurs ? `Gaussian Blur ${R} px @${compH}p${s.blur_px_1080 == null ? ` [vocab default ${AE_BLUR_DEFAULT_1080} px @1080p × ${compH}/1080]` : ` (spec: ${s.blur_px_1080} px @1080p × ${compH}/1080)`}` : 'none (no side blurs)';
  const dims = outToks.includes('dim');
  const dimTo = s.dim_pct != null ? 100 - s.dim_pct : 15;
  const dim = s.dim_pct != null ? `${s.dim_pct} % (Opacity → ${dimTo} %)` : dims ? `dim, amount not in spec → Opacity → ~${dimTo} % [vocab default]` : 'none';
  const cut = AE_ONE_FRAME.has(s.kind);
  const nOut = aeN(og.frames_24 ?? (cut ? 0 : s.frames_24)) ?? 0, nIn = aeN(ic.frames_24 ?? (cut ? 0 : s.frames_24)) ?? 0;
  const f0 = aeFrame(s.t), fB = aeFrame(s.t_end ?? (s.t + (s.frames_24 || 1) / 24));
  const overlap = Number.isInteger(s.overlap_frames)
    ? (s.overlap_frames === 0 ? 'cut — overlap 0 f (spec)' : `overlap ${aeN(s.overlap_frames)} f (spec)`)
    : cut ? `cut — overlap 0 f (derived: ${s.kind})`
      : `overlap ${aeN(s.frames_24)} f (derived from frames_24${s.kind === 'clear-then-resolve' ? '; clear-then-resolve: the sides do not overlap — exit, gap, resolve inside these frames' : ''})`;
  const dir = d => d && d !== 'none' ? ` ${d}` : '';
  const outParts = outToks.map(tk => { switch (tk) {
    case 'blur': return `Gaussian Blur 0 → ${R} px`;
    case 'dim': return `Opacity 100 → ${dimTo} %`;
    case 'fade': return 'Opacity 100 → 0 %';
    case 'slide': return `Position →${dir(og.direction)}${og.amount ? ` (${cell(og.amount)})` : ''}`;
    case 'scale-down': case 'scale-up': return `Scale 100 → ${og.amount ? cell(og.amount) : (tk === 'scale-down' ? '~80 %' : '>100 %')}`;
    case 'spin': return `Rotation${og.amount ? ' ' + cell(og.amount) : ''}`;
    case 'covered': return 'untouched, covered by the incoming mass';
    case 'none': return null; default: return tk; } }).filter(Boolean);
  const inParts = inToks.map(tk => { switch (tk) {
    case 'soft-then-sharp': return `Gaussian Blur ${R} → 0 px`;
    case 'fade-in': return 'Opacity 0 → 100 %';
    case 'settle-from-large': case 'settle-from-small': return `Scale ${Math.round((ic.from_scale ?? (tk === 'settle-from-large' ? 1.2 : 0.9)) * 100)} → 100 %${dir(ic.direction) ? ` from${dir(ic.direction)}` : ''}`;
    case 'slide-in': case 'already-moving': return `Position from${dir(ic.direction) || ' offset'} → rest`;
    case 'reveal-behind': return 'already in place behind the mass / cover';
    case 'pop': return 'one-frame appear (HOLD key)';
    case 'spin-in': return 'Rotation → 0';
    case 'none': return null; default: return tk; } }).filter(Boolean);
  const layers = aeSeamLayers(s);
  const fIn = Math.max(f0, fB - nIn);
  const keys = cut
    ? `HOLD keys at f${f0}: \`${layers.out}\` Opacity 100 → 0, \`${layers.in}\` Opacity 0 → 100 (hold interpolation, no ramp)`
      + (outParts.length ? `; before the cut on \`${layers.out}\`: ${outParts.join(' + ')} over ${nOut} f (f${f0 - nOut}–f${f0})` : '')
      + (inParts.length ? `; after the cut on \`${layers.in}\`: ${inParts.join(' + ')} over ${nIn} f (f${f0}–f${f0 + nIn})` : '')
    : `\`${layers.out}\`: ${outParts.length ? outParts.join(' + ') : 'no keyframes'}${outParts.length ? ` over ${nOut} f from f${f0}` : ''}; \`${layers.in}\`: ${inParts.length ? inParts.join(' + ') : 'no keyframes'}${inParts.length ? ` over ${nIn} f, f${fIn}–f${fB} (settled)` : ''}`;
  const exitTok = outToks.find(k => AE_EXIT_DEFAULT[k]);
  const exitEase = !outParts.length ? 'exit: none' : exitTok ? `exit: ${aeEase(AE_EXIT_DEFAULT[exitTok])} [vocab default for ${exitTok}; the spec records only the settle ease]` : 'exit: linear (a cover / sweep travels at constant speed)';
  const settleEase = `settle: ${aeEase(s.ease)}`;
  return { effect, dim, overlap, keys, ease: `${exitEase}; ${settleEase}`, layers, blurs, dims, cut, f0, fB };
}

// ---------------- render ----------------
switch (target) {
  case 'spec-md': {
    header(`Motion spec — ${meta.source ?? ''}`, 'identity, structure, camera plan, landings, seam ledger, pacing, UI motion, text motion, grammar, sound, eases, evidence rules');
    identityBlock(); structureBlock(); cameraSummary(); landingTable(); push('## Seam ledger', ''); seamTable(); pacingBlock(); uiBlock();
    if ((spec.text_motion || []).length) { push('## Text motion', '', '| t | role | mechanism | timing | hold | evidence | note |', '|---:|---|---|---|---:|---|---|'); for (const tm of spec.text_motion) push(`| ${t3(tm.t)} | ${tm.text_role} | ${tm.mechanism} | ${tm.per_word_timing?.length ? tm.per_word_timing.map(t3).join(' / ') : (tm.duration ? t3(tm.duration) + ' s' : '—')} | ${t3(tm.hold)} | ${ev(tm.evidence)}${conf(tm)} | ${cell(tm.note)} |`); push(''); }
    grammarBlock(); soundBlock(); easesTable(); if ((spec.do_not || []).length) push('## Do not', '', ...spec.do_not.map(x => `- ${x}`), '');
    push('## Evidence rules', '', spec.evidence_rules || '', '');
    break;
  }
  case 'generic': {
    header(`Build brief (any tool) — ${meta.source ?? ''}`, 'rules, identity, structure, camera plan, landings, beat by beat, seam ledger, pacing, UI motion, grammar, sound, eases');
    rulesBlock(); identityBlock(); structureBlock(); cameraSummary(); landingTable();
    beatByBeat(); push('## Seam ledger', ''); seamTable(); pacingBlock(); uiBlock(); grammarBlock(); soundBlock(); easesTable({ head: 'CSS', cell: e => `\`cubic-bezier(${e.cubic_bezier.join(', ')})\`` });
    break;
  }
  case 'claude-design': {
    renderClaudeDesign({ push, header, rulesBlock, identityBlock, structureBlock, cameraSummary, landingsIn, beatByBeat, seamTable, pacingBlock, uiBlock, grammarBlock, soundBlock, easesTable, t3, fr, bez, meta, scenes, seams, spec });
    break;
  }
  case 'hyperframes': {
    header(`Build brief — HyperFrames (GSAP timeline, data-start / data-duration clips) — ${meta.source ?? ''}`, 'rules, mapping, identity, structure, camera plan, landings, clips, beat by beat, seam ledger, pacing, UI motion, grammar, sound, eases');
    rulesBlock();
    push('## Mapping', '', '- One clip per scene: `data-start` = scene `in`, `data-duration` = `out − in`. A seam spans `[t, t + frames/24]` and the cut (the next scene\'s `in`) sits inside it: the outgoing clip runs to the seam\'s end, the incoming starts at the seam\'s `t`. Both clips are live across the whole seam.',
      '- Base scale: zoom 1 = a real-UI mount at its capture width (one page px = one stage px); fills are fractions of the stage.',
      '- Camera landings: a transform tween on the scene wrapper with the GSAP ease named; `cut` = no tween, next clip.', '- Eases by GSAP name (the cubic-bezier is the fallback for CustomEase).', '');
    identityBlock(); structureBlock(); cameraSummary(); landingTable();
    push('## Clips', '', '| clip | data-start | data-duration | subject | seam out | overlap |', '|---|---:|---:|---|---|---:|');
    scenes.forEach((sc, i) => { const s = seamAfterScene(sc); push(`| ${sc.id || 'S' + (i + 1)} | ${t3(sc.in)} | ${t3(sc.out - sc.in)} | ${sc.subject} | ${s ? s.kind : '—'} | ${s ? t3((s.frames_24 || 1) / 24) + ' s' : '—'} |`); });
    push('');
    beatByBeat(); push('## Seam ledger', ''); seamTable();
    // HyperFrames' rules (no exit animations, no jump cuts) are written for authored elements; an exact replica breaks them on purpose. List each case so the build records the exception instead of softening the ledger.
    { const ex = []; seams.forEach(s => { const og = String(s.outgoing?.treatment || 'none').toLowerCase(); if (og && og !== 'none') ex.push(`- seam ${s.id ?? ''} at ${t3(s.t)} s (${s.kind}): outgoing ${og} — an exit motion; keep it, record the exception`); if (/reframe cut|hard cut|match cut/i.test(String(s.kind)) && (s.frames_24 || 0) <= 2) ex.push(`- seam ${s.id ?? ''} at ${t3(s.t)} s (${s.kind}, ${fr(s.frames_24)}): a jump cut by the skill's definition; keep it, record the exception`); });
      push('## Exceptions to record (HyperFrames rules)', '', ...(ex.length ? ex : ['- none: no seam has an outgoing motion and no cut is under 3 frames']), '', 'Entrance tweens are for elements you author; nodes inside a mounted real-UI page keep the storyboard\'s motion for that scene (a write-on or a fade there is the film\'s, not the skill\'s default).', ''); }
    pacingBlock(); uiBlock(); grammarBlock(); soundBlock(); easesTable({ head: 'GSAP', cell: e => `\`${e.gsap}\`` });
    break;
  }
  case 'after-effects': {
    header(`Build brief — After Effects — ${meta.source ?? ''}`, 'rules, mapping, rig, gotchas, identity, structure, camera plan, landings (rig keys), seams as keyframes, beat by beat, pacing, UI motion, grammar, sound, eases, measure before build');
    rulesBlock();
    push('## Mapping', '',
      `- Comp: ${compW}×${compH} @ ${fps} fps, ${t3(meta.duration)} s = ${aeSec(meta.duration)} frames. Frame numbers below are **0-based at ${fps} fps** (AE's default); the sheets' badge numbers are 1-based at 24 fps (badge = round(t × 24) + 1)${fps !== 24 ? `; frame counts are converted from the 24 fps read (× ${fps}/24, rounded)` : ''}.`,
      `- Coordinates: source-frame px (${compW}×${compH}). Build the page precomps in the same px space. A comp at another height scales positions, boxes and blur radii by comp height ÷ ${compH}.`,
      '- Camera: no AE camera — the `PAGE rig` null (see Rig). Every landing is one set of rig keys (Anchor Point + Scale, + X / Y Rotation when the rotation column is not 0): a `cut` is a HOLD key; a travelled move is a speed-0 key pair with the influence values in the row.',
      '- Eases: speed 0 + influence (out = x1 × 100, in = (1 − x2) × 100), exact when the bezier\'s y1 = 0 and y2 = 1; otherwise marked ≈ and the cubic-bezier is baked to per-frame keys. The spec records one ease per row (the settle); an exit phase gets the vocabulary default for its token and says so.',
      `- Seams: per row — the effect that carries the blur (Gaussian Blur, radius at ${compH}p), the dim as an Opacity target, overlap vs cut, the keyframe list per phase, the layer names. A cut is a pair of HOLD keyframes on Opacity at the cut frame; nothing ramps.`,
      '- Layers: `S03 <subject>` for a scene precomp, `S03>S04 seam` for a seam\'s helper layer (adjustment / matte / colour mass), `PAGE rig` for the null, `CURSOR` parented to its target.', '');
    push('## Rig — the camera stand-in', '',
      `- No AE camera. One 3D null, \`PAGE rig\`, is the lens: Anchor Point = the page point to centre (source px — the anchor column below), Position = frame centre (${compW / 2}, ${compH / 2}), Scale = the landing's scale %, X / Y Rotation for three-quarter views (the rotation column).`,
      '- Every page precomp is a 3D child of `PAGE rig`, placed at its page position in the same px space; the rig\'s keys move them all together (movement class camera).',
      '- A card that lifts is a child z move toward the lens with a keyed Drop Shadow (object); a change inside a stable surface is content inside the precomp — never a rig key.',
      '- Cursor: a `CURSOR` layer parented to the object it clicks, at that object\'s depth; per-frame Position keys when it steers; verify the press in the render, not in the key table.',
      '- A page-load cut between two layouts reads as a jerk: dissolve the content and slide the column that changes, with the cursor riding its target.', '');
    push('## Gotchas (AE through a script or bridge)', '',
      '- Temporal ease on a shape layer\'s Rect Size crashes through script: drive it with Slider Controls + expressions instead.',
      '- A steering cursor gets per-frame Position keys, not two keys and an ease.',
      '- Effects on continuously rasterized / collapsed layers apply AFTER the transform: a blur radius is in px at the raster\'s resolution, not the comp\'s — state which when you set it.',
      '- Never remove every time-remap key on a layer.',
      '- Never read an expression or `valueAtTime` back through a scripting bridge.',
      '- After a hard error, read the project state before re-running: the edits before the error stayed.', '');
    identityBlock(); structureBlock(); cameraSummary();
    push('## Landings — rig keys', '',
      `| t (s) | frame @${fps} | scene layer | subject | anchor (source px) | scale | rotation | move | hold | ease | trigger | class | evidence | note |`,
      '|---:|---:|---|---|---|---|---|---|---:|---|---|---|---|---|');
    for (const l of landings) {
      const sc = sceneAt(l.t);
      const isCut = l.move_in === 'cut' || l.move_in === 'hold';
      const move = isCut ? `${l.move_in} → HOLD key (0 f)` : `${l.move_in} ${aeSec(l.duration)} f (f${aeFrame(l.t)}–f${aeFrame(l.t) + aeSec(l.duration)})`;
      const ease = isCut ? 'hold keyframe (no ease)' : (l.ease ? aeEase(l.ease) : 'no ease recorded — easy ease, mark it a guess');
      push(`| ${t3(l.t)} | ${aeFrame(l.t)} | \`${aeLayer(sc) || 'S?? (no scene at this t)'}\` | ${cell(l.subject)} | ${aeAnchor(l)} | ${aeScale(l)} | ${aeRot(l)} | ${move} | ${aeSec(l.hold)} f | ${ease} | ${aeTrigger(l)} | ${l.movement_class} | ${ev(l.evidence)}${conf(l)} | ${cell(l.note)} |`);
    }
    push('');
    push('## Seams as keyframes', '',
      `| # | t (s) | frame @${fps} | kind | layers (out → in) | seam layer | effect + radius | dim | overlap / cut | keyframes per phase | ease per phase | evidence | note |`,
      '|---|---:|---:|---|---|---|---|---|---|---|---|---|---|');
    seams.forEach((s, i) => {
      const a = aeSeam(s);
      const flags = [s.opens_film ? 'opens the film' : '', s.loop_join ? 'loop join' : ''].filter(Boolean).join(', ');
      push(`| ${s.id || i + 1} | ${t3(s.t)} | ${a.f0}${a.cut ? '' : `–${a.fB}`} | ${s.kind}${flags ? ` (${flags})` : ''} | \`${a.layers.out}\` → \`${a.layers.in}\` | \`${a.layers.seam}\` | ${a.effect} | ${a.dim} | ${a.overlap} | ${a.keys} | ${a.ease} | ${ev(s.evidence)}${conf(s)} | ${cell(s.note)} |`);
    });
    push('');
    beatByBeat(); pacingBlock(); uiBlock(); grammarBlock(); soundBlock(); easesTable({ head: 'AE influence (speed 0)', cell: aeInfluence });
    // What the spec did not carry: the builder measures these before the first key.
    const missL = landings.map(l => { const m = []; if (!l.box) m.push('box → anchor'); if (l.zoom == null) m.push('zoom → scale (fill only)'); if (l.rotation_deg == null) m.push('rotation'); if (!l.trigger) m.push('trigger'); return m.length ? `- f${aeFrame(l.t)} (${t3(l.t)} s) ${aeShort(l.subject)}: ${m.join(', ')}` : null; }).filter(Boolean);
    const missS = seams.map(s => { const a = aeSeam(s); const m = []; if (a.blurs && s.blur_px_1080 == null) m.push('blur_px_1080 (radius)'); if (a.dims && s.dim_pct == null) m.push('dim_pct'); if (!a.cut && !Number.isInteger(s.overlap_frames)) m.push('overlap_frames'); return m.length ? `- seam ${s.id} f${a.f0} (${t3(s.t)} s, ${s.kind}): ${m.join(', ')}` : null; }).filter(Boolean);
    push('## Measure before build', '', `Optional spec fields this reference did not record; the rows above say \`measure\` or \`[vocab default]\` where a value was needed. ${missL.length} of ${landings.length} landings and ${missS.length} of ${seams.length} seams are affected.`, '');
    if (missL.length) push('Landings:', '', ...missL, '');
    if (missS.length) push('Seams:', '', ...missS, '');
    if (!missL.length && !missS.length) push('Nothing — every landing has box / zoom / rotation / trigger and every seam its overlap, blur and dim.', '');
    break;
  }
  case 'remotion': {
    header(`Build brief — Remotion — ${meta.source ?? ''}`, 'rules, mapping, identity, structure, camera plan, landings, sequences, beat by beat, seam ledger, pacing, UI motion, grammar, sound, eases');
    rulesBlock();
    push('## Mapping', '', `- \`<Composition fps={${fps}} durationInFrames={${Math.round((meta.duration || 0) * fps)}} width={${meta.width}} height={${meta.height}}>\`; one \`<Sequence from={in·fps} durationInFrames={(out−in)·fps}>\` per scene.`,
      '- Camera landings: `interpolate(frame, [start, end], [from, to], { easing: Easing.bezier(...) , extrapolateRight: "clamp" })` on a wrapper transform; `cut` = a new Sequence.',
      '- Seams: overlap the Sequences by `frames`; drive blur / opacity / translate / scale with `interpolate` using the treatments in the ledger.', '');
    identityBlock(); structureBlock(); cameraSummary(); landingTable(l => `${l.move_in}${l.ease ? ` · Easing.bezier(${l.ease.cubic_bezier.join(', ')})` : ''}`);
    push('## Sequences', '', '| scene | from (frames) | durationInFrames | subject | seam out | overlap frames |', '|---|---:|---:|---|---|---:|');
    scenes.forEach((sc, i) => { const s = seamAfterScene(sc); push(`| ${sc.id || 'S' + (i + 1)} | ${Math.round(sc.in * fps)} | ${Math.round((sc.out - sc.in) * fps)} | ${sc.subject} | ${s ? s.kind : '—'} | ${s ? Math.round((s.frames_24 || 1) * fps / 24) : '—'} |`); });
    push('');
    beatByBeat(); push('## Seam ledger', ''); seamTable(); pacingBlock(); uiBlock(); grammarBlock(); soundBlock(); easesTable({ head: 'Remotion', cell: e => `\`Easing.bezier(${e.cubic_bezier.join(', ')})\`` });
    break;
  }
}

fs.writeFileSync(outFile, L.join('\n') + '\n', 'utf8');
console.log(`wrote ${outFile} (${target}, ${L.length} lines)`);
