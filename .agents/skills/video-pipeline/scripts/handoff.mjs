#!/usr/bin/env node
// handoff.mjs — step 4/4: write video-handoff.md, the one file a build session reads first.
// It maps every deliverable of the pass (storyboard, brief, machine-readable map, snapshots,
// the open questions) with what each is and who reads it, and says whether the material is
// complete. The user hands that one file to the tool that builds the video.
//
//   node scripts/handoff.mjs [--state video-pipeline.json] [--out video-handoff.md] [--no-state]
//
// Paths in the file are relative to the folder that holds the state file; a folder outside it
// (a spec next to the clip) is written absolute. --no-state leaves video-pipeline.json untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (!a.startsWith('--')) continue; const k = a.slice(2); const v = argv[i + 1]; if (v !== undefined && !v.startsWith('--')) { args[k] = v; i++; } else args[k] = true; }
const statePath = path.resolve(args.state || 'video-pipeline.json');
if (!fs.existsSync(statePath)) { console.error(`no ${path.basename(statePath)} here — nothing to hand off. Run the pass first.`); process.exit(1); }
const base = path.dirname(statePath);
const outPath = path.resolve(base, args.out || 'video-handoff.md');
const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));

const abs = (p) => path.resolve(base, p);
const rel = (p) => { const r = path.relative(base, abs(p)).replace(/\\/g, '/'); return r.startsWith('..') ? abs(p).replace(/\\/g, '/') : r; };
const exists = (p) => !!p && fs.existsSync(abs(p));
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); } catch { return null; } };
const readText = (p) => { try { return fs.readFileSync(abs(p), 'utf8'); } catch { return ''; } };
const missing = [];
const need = (p, what) => { if (!exists(p)) missing.push(`${what}: ${p || '(not in the state file)'}`); return exists(p); };

// ---- storyboard folder ----
const sbFile = st.storyboard || '';
const sbDir = sbFile ? path.dirname(sbFile) : '';
need(sbFile, 'storyboard');
const inSb = (name) => sbDir ? path.join(sbDir, name).replace(/\\/g, '/') : '';
const briefs = sbDir && exists(sbDir) ? fs.readdirSync(abs(sbDir)).filter(f => /^brief-.*\.md$/.test(f)) : [];
const tool = st.target || 'generic';
const brief = briefs.find(f => f === `brief-${tool}.md`) || briefs[0] || '';
if (!brief) missing.push(`build brief for ${tool}: ${inSb('brief-' + tool + '.md')}`);
const map = readJson(inSb('scene-map.json'));
const screensNeeded = readJson(inSb('screens-needed.json'));
const storyboard = readText(sbFile);
const section = (title) => { const m = storyboard.match(new RegExp(`^## ${title}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm')); return m ? m[1].trim() : ''; };
const openQuestions = section('Open questions');
const angle = section('Angle').split(/\n\s*\n/)[0].trim();
const ours = readJson(inSb('spec-ours.json'));
// Length is the film's (spec-ours is our spec); fps is the storyboard's target, never the reference's source rate.
const lengthS = ours?.meta?.duration ?? map?.length_s ?? null;
const fps = (storyboard.match(/Target fps:\s*(\d+)/) || [])[1] ?? map?.fps ?? null;
const rows = Array.isArray(map?.rows) ? map.rows : [];
const kept = rows.filter(r => r.our?.status !== 'dropped').length;

// ---- snapshots ----
const screens = Array.isArray(st.screens) ? st.screens : [];
const gateSummary = (g) => {
  const gs = g?.gates || g; if (!gs || typeof gs !== 'object') return { text: 'no gates.json', warn: [] };
  const entries = Object.entries(gs).filter(([k]) => /^G\d+$/.test(k));
  const status = (v) => v?.status || v?.result || (v?.warn ? 'WARN' : '?');
  const pass = entries.filter(([, v]) => status(v) === 'PASS').length;
  const warn = entries.filter(([, v]) => status(v) === 'WARN').map(([k, v]) => `${k}: ${(v.findings || [])[0] || 'WARN'}`);
  const fail = entries.filter(([, v]) => !['PASS', 'WARN'].includes(status(v))).map(([k, v]) => `${k} ${status(v)}`);
  return { text: `${pass} PASS${warn.length ? ` · ${warn.length} WARN (${warn.map(w => w.split(':')[0]).join(', ')})` : ''}${fail.length ? ` · ${fail.join(', ')}` : ''}`, warn };
};
const screenRows = screens.map(s => {
  const folder = s.snapshot || '';
  const ok = need(folder ? path.join(folder, 'index.html') : '', `snapshot ${s.slug}`);
  const [slug, state] = String(s.slug || '').split('/');
  const needEntry = (screensNeeded?.screens || []).find(x => x.slug === slug && (x.state || 'default') === (state || 'default').replace(/\s.*$/, ''));
  const meta = ok ? readJson(path.join(folder, 'meta.json')) : null;
  const gates = ok ? gateSummary(readJson(path.join(folder, 'gates.json'))) : { text: 'not captured', warn: [] };
  // Presses come from the map rows (the source), grouped by this screen × state.
  const st0 = (state || 'default').replace(/\s.*$/, '');
  const triggers = rows.filter(r => r.our?.status !== 'dropped' && (r.our?.screen || '').trim() === slug && ((r.our?.state || '').trim() || 'default') === st0)
    .flatMap(r => (Array.isArray(r.our?.triggers) ? r.our.triggers : []).filter(t => t && t.target).map(t => ({ scene: r.ref_scene || '(added)', action: t.action || 'press', target: String(t.target).trim(), t: Number.isFinite(t.t) ? t.t : null, selector: t.selector || null, px: Array.isArray(t.px) ? t.px : null })));
  const targets = ok ? (readJson(path.join(folder, 'targets.json')) || {}) : {};
  return { s, folder, ok, slug, state: state || 'default', scenes: needEntry?.scenes || [], triggers, targets, meta, gates };
});

// ---- spec (reference read) ----
const specFile = st.spec || '';
const specDir = specFile ? path.dirname(specFile) : '';
const specMd = specDir ? path.join(specDir, 'motion-spec.md') : '';

// ---- write ----
const L = [];
const today = new Date().toISOString().slice(0, 10);
L.push(`# Video handoff — ${st.topic || '(no topic)'}`);
L.push('');
L.push(`Written ${today} by \`video-pipeline\` (step 4/4). This is the map of the material for one video. Give this file to the session or tool that builds the video and say one of:`);
L.push('');
L.push('- "Build the video from `' + path.basename(outPath) + '`."');
L.push('- "Read `' + path.basename(outPath) + '`. Is the material enough to produce the video? List what is missing before you build anything."');
L.push('');
L.push(`Target tool: **${tool}**${brief ? ` — build brief: \`${rel(inSb(brief))}\`` : ' — no brief rendered'}${lengthS ? ` · length ${lengthS} s` : ''}${fps ? ` at ${fps} fps` : ''}${kept ? ` · ${kept} scenes` : ''}${map?.target?.stage ? ` · stage ${map.target.stage.width}×${map.target.stage.height}` : ''}.`);
if (briefs.length > 1) L.push(`Briefs for other tools in the same folder: ${briefs.filter(x => x !== brief).map(x => '`' + x + '`').join(', ')}.`);
if (ours?.meta?.presentation_chrome) L.push(`Reference frame: ${String(ours.meta.presentation_chrome).slice(0, 300)}`);
if (angle) { L.push(''); L.push('Angle:'); L.push(''); L.push(angle.split('\n').map(l => '> ' + l).join('\n')); }
L.push('');
L.push('## Read in this order');
L.push('');
L.push(`1. \`${rel(sbFile)}\` — the film: angle, literal copy, scene map, triggers and results, camera plan, seam ledger, open questions.`);
if (brief) L.push(`2. \`${rel(inSb(brief))}\` — how to build it in ${tool}: per scene, what to mount, animate and cut, in that tool's terms.`);
L.push(`${brief ? 3 : 2}. The snapshots below — the real UI, one folder per screen × state. Mount \`index.html\` as it is; change state through the DOM (\`checked\`, classes, text), the CSS reacts. Never edit a snapshot.`);
L.push('');
// Scene times from the kept rows' durations, in order; the source of each scene.
L.push('## Scenes');
L.push('');
L.push('Anchor px is the element\'s centre; a landing on an edge of an element ("the left end of …") takes the edge from `anchor_box` (x, y, w, h) in scene-map.json.');
  L.push('');
  L.push('| Scene | Our time (s) | Source | Mount | Anchor (page px) |');
L.push('|---|---|---|---|---|');
{ let t = 0; for (const r of rows) { if (r.our?.status === 'dropped') continue; const d = Number(r.our?.duration) || 0; const a = t, b = t + d; t = b;
  const scr = (r.our?.screen || '').trim(); const stt = ((r.our?.state || '').trim() || 'default');
  const sr = scr && scr !== 'editorial' ? screenRows.find(x => x.slug === scr && x.state.replace(/\s.*$/, '') === stt) : null;
  const src = !scr || scr === 'editorial' || r.our?.surface === 'editorial' ? 'editorial' : (sr ? `\`${rel(sr.folder)}\`` : `${scr} / ${stt} (no snapshot)`);
  const mount = sr?.meta?.viewport ? `${sr.meta.viewport.width} wide · doc ${sr.meta.doc_height ?? '?'} tall` : '—';
  const las = (r.our?.landing_anchors || []).filter(x => (x?.anchor || '').trim());
  const anc = las.length ? las.map(x => `${Number(x.t).toFixed(2)}: ${Array.isArray(x.anchor_px) ? x.anchor_px.join(',') : 'not measured'}`).join(' → ') : (r.our?.anchor ? (Array.isArray(r.our.anchor_px) ? `${r.our.anchor_px.join(',')}${r.our.anchor_selector ? ` \`${r.our.anchor_selector}\`` : ''}` : 'not measured') : '—');
  L.push(`| ${r.ref_scene || '(added)'} | ${a.toFixed(2)}–${b.toFixed(2)} | ${src} | ${mount} | ${anc} |`); } }
L.push('');
L.push('## Files');
L.push('');
L.push('| File | What it is | Who reads it |');
L.push('|---|---|---|');
L.push(`| \`${rel(sbFile)}\` | the storyboard (human-readable film) | build session, reviewer |`);
for (const bf of briefs) L.push(`| \`${rel(inSb(bf))}\` | the build brief for ${bf.replace(/^brief-|\.md$/g, '')}${bf === brief ? ' (the target)' : ''} | build session in that tool |`);
if (map) L.push(`| \`${rel(inSb('scene-map.json'))}\` | the storyboard as data: rows, seams, landings, triggers, copy | build session (timings, selectors), tools that read JSON |`);
if (exists(inSb('spec-ours.json'))) L.push(`| \`${rel(inSb('spec-ours.json'))}\` | the film's own motion spec (our scenes, our timings) | build session, a motion QC pass |`);
if (screensNeeded) L.push(`| \`${rel(inSb('screens-needed.json'))}\` | screens × states × presses the film needs | the snapshot step (done) |`);
if (exists(inSb('decisions.md'))) L.push(`| \`${rel(inSb('decisions.md'))}\` | defaults the storyboard took and why, site facts that changed it | reviewer |`);
for (const r of screenRows) { L.push(`| \`${rel(r.folder)}/\` | snapshot — ${r.slug} · ${r.state}${r.scenes.length ? ` · scenes ${r.scenes.join(', ')}` : ''} | build session (\`index.html\` + \`assets/\`); \`gates.json\`, \`meta.json\`, \`live-reference.png\` for QC${exists(path.join(r.folder, 'targets.json')) ? '; \`targets.json\` = measured selectors and page px' : ''}${exists(path.join(r.folder, 'page-full.png')) ? '; \`page-full.png\` = the whole document' : ''} |`); if (exists(path.join(r.folder, 'manifest', 'layers.json'))) L.push(`| \`${rel(r.folder)}/manifest/\` | layer manifest: \`layers.json\` (boxes, fonts, colours in page px), \`raster/\`, the full page at 2× | tools that are not HTML (After Effects, Figma) |`); }
L.push(`| \`${rel(statePath)}\` | pipeline state (what is done) | \`video-pipeline\` |`);
if (specMd) L.push(`| the spec folder recorded in \`${rel(statePath)}\` (same machine only) | the reference read: motion only, no copy, no brand; the reference itself never travels with the build | not needed to build; open it only for a motion question the storyboard leaves unanswered |`);
L.push('');
L.push('## Screens (real UI)');
L.push('');
if (screenRows.length) {
  L.push('| Folder | State | Scenes | Captured | Mount | Gates |');
  L.push('|---|---|---|---|---|---|');
  for (const r of screenRows) L.push(`| \`${rel(r.folder)}\` | ${r.state} | ${r.scenes.join(', ') || '—'} | ${r.ok ? (r.meta?.captured_at || '').slice(0, 10) || 'yes' : '**MISSING**'} | ${r.meta?.viewport ? `${r.meta.viewport.width}×${r.meta.viewport.height} viewport · doc ${r.meta.doc_height ?? '?'} tall` : '—'} | ${r.gates.text} |`);
  const warns = screenRows.flatMap(r => r.gates.warn.map(w => `- \`${rel(r.folder)}\` — ${w}`));
  if (warns.length) { L.push(''); L.push('Gate warnings to read before building (a WARN is a fact about the capture, not a failure):'); L.push(''); L.push(...warns); }
} else L.push('No screens in the state file: an editorial-only film, or step 3 has not run.');
const selOf = (r, t) => { if (t.selector) return { selector: t.selector, center: t.px }; const k = Object.keys(r.targets || {}).find(k => k !== '_meta' && k.trim().toLowerCase() === t.target.toLowerCase()); const v = k ? r.targets[k] : null; if (!v) return null; return typeof v === 'string' ? { selector: v } : (v.found === false ? null : v); };
const presses = screenRows.flatMap(r => r.triggers.map(t => `- ${t.scene}: ${t.action} — ${t.target}${t.t != null ? ` · ${t.t.toFixed(2)} s${fps ? ` · f${Math.round(t.t * Number(fps))}` : ''}` : ''}${selOf(r, t) ? ` · \`${selOf(r, t).selector}\`${selOf(r, t).center ? ` · page px ${selOf(r, t).center.join(',')}` : ''}` : ' · selector not measured'} (\`${rel(r.folder)}\`)`));
if (presses.length) { L.push(''); L.push('Presses the film performs on the snapshots (the build session drives them through the DOM, never by navigating; a target it cannot find is reported, not invented):'); L.push(''); L.push(...presses); }
L.push('');
L.push('## Open questions');
L.push('');
if (openQuestions) { L.push('From the storyboard. The build session asks these first, or takes the storyboard\'s stated default and says so; it never resolves one silently.'); L.push(''); L.push(openQuestions); }
else L.push('None recorded in the storyboard.');
L.push('');
L.push('## Rules for the build session');
L.push('');
L.push('- The literal copy table in the storyboard is the copy. Nothing on screen that is not in it or in a snapshot.');
L.push('- The camera plan and seam ledger are the motion contract: cadence, eases, frame counts. Keep them; do not smooth them into defaults. A seam\'s time is where it starts; the cut sits inside it at the next scene\'s start; its frames run from there. Zoom 1 = the mount at its capture width.');
L.push('- Snapshots are fossils: mount, do not edit. A press changes DOM state in place; the CSS reacts. Anchors still point at the live site, so the player intercepts navigation.');
L.push('- The reference clip is not part of this handoff and is never quoted or named in the video.');
L.push('- When something is missing, say what and stop at that scene; do not invent UI.');
L.push('- Serve the snapshots over http for the mount (html-snapshot\'s `serve.mjs`); `file://` is for a look. A switch flips by setting `checked`; the page CSS moves the track and the labels.');
L.push('- Frames are at the target fps above; a press lands on its frame with the cursor on the element it presses.');
L.push('');
// Per-tool constraints, from references/tool-notes.md next to this script: the target tool first, then the rest.
{
  const notesFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'references', 'tool-notes.md');
  const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
  const sections = [...notes.matchAll(/^## ([a-z0-9-]+) — ([^\n]+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map(m => ({ key: m[1], name: m[2].trim(), body: m[3].trim() }));
  if (sections.length) {
    const order = [...sections.filter(s => s.key === tool), ...sections.filter(s => s.key !== tool)];
    L.push('## If you build in …');
    L.push('');
    L.push('Read the section for your tool and skip the others. Each line is a constraint the tool imposes on this material and what to do instead.');
    L.push('');
    for (const s of order) { L.push(`### ${s.name}${s.key === tool ? ' (the target)' : ''}`); L.push(''); L.push(s.body); L.push(''); }
  }
}
L.push('## Done means');
L.push('');
L.push(`- The render is${lengthS ? ` ${lengthS} s` : ' the storyboard\'s length'}${fps ? ` at ${fps} fps` : ''}, with the ${kept || ''} scenes at the times in the Scenes table.`);
L.push('- Every seam has the kind, frame count and ease of the storyboard\'s seam ledger; no move the camera plan does not list.');
L.push('- Every press lands on its frame, cursor on the element; every switch, row and payoff shows the result the storyboard names.');
L.push('- Every on-screen line matches the copy table word for word; no reference copy, no invented UI.');
L.push('- Snapshots are unedited; a re-capture goes through the snapshot skill and its gates.');
L.push('');
L.push('## Status');
L.push('');
// Material gaps every build tool asked about count as incomplete too: they are the pass's to fill, not the builder's.
{
  const io = map?.identity_ours || {};
  if (map && !((io.palette || []).length && (io.type || []).length)) missing.push('identity_ours in scene-map.json (our palette hex, type families, logo) — the brief\'s Identity is the reference\'s until it is filled');
  const noDefault = (map?.open_questions || []).filter(q => !/default/i.test(String(q))).length;
  if (noDefault) missing.push(`${noDefault} open question(s) without "— default: …" — the build cannot start on them`);
  if (map && !map.target?.stage) missing.push('target.stage in scene-map.json (the delivery frame; 1920×1080 unless told)');
  const prose = rows.filter(r => r.our?.status !== 'dropped' && (r.our?.screen || '').trim() && r.our.screen !== 'editorial' && (r.our?.anchor || '').trim() && !Array.isArray(r.our?.anchor_px)).length;
  if (prose) missing.push(`${prose} landing anchor(s) still prose — run the measure pass (fill-anchors.mjs)`);
  const multiRows = rows.filter(r => r.our?.status !== 'dropped' && (r.our?.screen || '').trim() && r.our.screen !== 'editorial' && (r.landings || []).length > 1 && (r.our?.landing_anchors || []).filter(a => (a?.anchor || '').trim() && Array.isArray(a.anchor_px)).length < (r.landings || []).length);
  if (multiRows.length) missing.push(`${multiRows.length} scene(s) with several camera landings but not a measured anchor per landing (${multiRows.map(r => r.ref_scene).join(', ')}) — fill our.landing_anchors[] and re-run the measure pass`);
  const roles = ['bed', 'emphasis', 'cursor', 'ink']; const io2 = map?.identity_ours || {}; const noRole = roles.filter(k => !(io2.roles && String(io2.roles[k] || '').trim()));
  if (map && (io.palette || []).length && noRole.length) missing.push(`identity_ours.roles missing ${noRole.join(', ')} — the editorial colours ours uses (a decision, not the reference's)`);
}
const steps = st.steps || {};
const complete = missing.length === 0 && ['1', '2', '3'].every(k => steps[k] === 'done');
L.push(`- steps: 1 ${steps['1'] || '—'} · 2 ${steps['2'] || '—'} · 3 ${steps['3'] || '—'} · 4 handoff written ${today}`);
L.push(`- screens: ${screenRows.filter(r => r.ok).length}/${screenRows.length} captured`);
L.push(missing.length ? `- **incomplete** — to do before the build: ${missing.join('; ')}` : `- **complete** — every file above exists on disk; anchors measured; identity, stage and defaults filled`);
L.push('');
fs.writeFileSync(outPath, L.join('\n') + '\n');

if (!args['no-state']) {
  st.handoff = rel(outPath); st.steps = { ...(st.steps || {}), '4': complete ? 'done' : 'incomplete' }; st.updated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(st, null, 2) + '\n');
}
console.log(`${complete ? 'done  4/4  handoff' : 'INCOMPLETE 4/4 handoff'} — ${screenRows.length} screen(s), ${brief ? 'brief ' + brief : 'no brief'}, ${openQuestions ? openQuestions.split('\n').filter(l => l.trim().startsWith('-')).length + ' open question(s)' : 'no open questions'} → ${rel(outPath)}`);
if (missing.length) { for (const m of missing) console.log('  missing: ' + m); process.exitCode = 2; }
