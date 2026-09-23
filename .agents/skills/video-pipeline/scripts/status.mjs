#!/usr/bin/env node
// status.mjs — read video-pipeline.json, verify what is on disk, print done / next / remaining.
//
//   node scripts/status.mjs [--state video-pipeline.json]
//   node scripts/status.mjs --init --topic "…" [--reference clip.mp4|library:ref-02] [--target hyperframes] [--force]
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (!a.startsWith('--')) continue; const k = a.slice(2); const v = argv[i + 1]; if (v !== undefined && !v.startsWith('--')) { args[k] = v; i++; } else args[k] = true; }
const statePath = path.resolve(args.state || 'video-pipeline.json');

if (args.init) {
  if (fs.existsSync(statePath) && !args.force) { console.error(`${statePath} exists; pass --force to overwrite`); process.exit(1); }
  const st = { topic: args.topic || '', reference: args.reference || '', target: args.target || 'generic', spec: '', storyboard: '', screens: [], steps: { '1': 'pending', '2': 'pending', '3': 'pending', '4': 'pending' }, updated: new Date().toISOString() };
  fs.writeFileSync(statePath, JSON.stringify(st, null, 2) + '\n');
  console.log('wrote ' + statePath);
  process.exit(0);
}

if (!fs.existsSync(statePath)) { console.log(`no ${path.basename(statePath)} here — nothing has started. Start with: "make a video like <clip> about <topic>" (or --init).`); process.exit(0); }
const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const base = path.dirname(statePath);
const exists = (p) => p && fs.existsSync(path.resolve(base, p));

const specOk = exists(st.spec);
const sbOk = exists(st.storyboard);
const screens = Array.isArray(st.screens) ? st.screens : [];
const captured = screens.filter(s => s.status === 'captured');
const pending = screens.filter(s => s.status !== 'captured');

console.log(`video-pipeline — ${st.topic || '(no topic)'}  ·  reference: ${st.reference || '—'}  ·  target: ${st.target || 'generic'}`);
console.log(`  1/4 motion spec   ${specOk ? 'done   → ' + st.spec : (st.spec ? 'MISSING on disk: ' + st.spec : 'pending')}`);
console.log(`  2/4 storyboard    ${sbOk ? 'done   → ' + st.storyboard : (st.steps?.['2'] === 'gate' ? 'waiting for your angle + copy' : (st.storyboard ? 'MISSING on disk: ' + st.storyboard : 'pending'))}`);
console.log(`  3/4 snapshots     ${screens.length ? `${captured.length}/${screens.length} captured${pending.length ? ' — pending: ' + pending.map(s => s.slug + (s.status === 'human-save' ? ' (needs your SingleFile save)' : '')).join(', ') : ''}` : 'pending (list comes from the storyboard)'}`);

// The measure pass (targets.json → targets.mjs → fill-anchors.mjs) belongs to step 3: a kept real-UI row with a prose-only anchor is unmeasured.
let unmeasured = 0; const gaps = []; let mapMtime = 0;
try {
  const mapFile = path.resolve(base, path.dirname(st.storyboard || ''), 'scene-map.json');
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')); mapMtime = fs.statSync(mapFile).mtimeMs;
  for (const r of (map.rows || [])) { const o = r.our || {}; if (o.status === 'dropped' || !o.screen || o.screen === 'editorial') continue; if ((o.anchor || '').trim() && !Array.isArray(o.anchor_px)) unmeasured++; for (const t of (o.triggers || [])) if (t && t.target && !t.selector) unmeasured++; }
  // The same material gaps handoff.mjs counts as incomplete: they are the pass's to fill, not the builder's.
  const io = map.identity_ours || {}; if (!((io.palette || []).length && (io.type || []).length)) gaps.push('identity_ours (our palette hex, type families, logo)');
  const noDefault = (map.open_questions || []).filter(q => !/default/i.test(String(q))).length; if (noDefault) gaps.push(`${noDefault} open question(s) without "— default: …"`);
  if (!map.target?.stage) gaps.push('target.stage (1920×1080 unless told)');
  { const rows = map.rows || []; const multiRows = rows.filter(r => r.our?.status !== 'dropped' && (r.our?.screen || '').trim() && r.our.screen !== 'editorial' && (r.landings || []).length > 1 && (r.our?.landing_anchors || []).filter(a => (a?.anchor || '').trim() && Array.isArray(a.anchor_px)).length < (r.landings || []).length); if (multiRows.length) gaps.push(`${multiRows.length} scene(s) with several landings but no anchor per landing (${multiRows.map(r => r.ref_scene).join(', ')}) — fill our.landing_anchors[] then the measure pass`); const roles = ['bed', 'emphasis', 'cursor', 'ink']; const noRole = roles.filter(k => !(io.roles && String(io.roles[k] || '').trim())); if ((io.palette || []).length && noRole.length) gaps.push(`identity_ours.roles: ${noRole.join(', ')}`); const ts = io.type_scale || {}; const noScale = ['hero', 'subline', 'cta'].filter(k => !(String(ts[k] || '').trim())); if ((io.palette || []).length && noScale.length) gaps.push(`identity_ours.type_scale: ${noScale.join(', ')} (% of stage height)`); }
} catch { /* no map yet */ }
const handoffOk = exists(st.handoff);
const handoffStale = handoffOk && mapMtime && fs.statSync(path.resolve(base, st.handoff)).mtimeMs < mapMtime;
console.log(`  4/4 handoff       ${handoffOk ? (gaps.length || handoffStale ? `written → ${st.handoff}, but ${handoffStale ? 'older than scene-map.json' : ''}${handoffStale && gaps.length ? ' and ' : ''}${gaps.length ? 'the material is incomplete' : ''}` : 'done   → ' + st.handoff) : (st.handoff ? 'MISSING on disk: ' + st.handoff : 'pending')}`);
let next;
if (!specOk) next = '1/4 motion spec' + (st.reference?.startsWith('library:') ? ' (library pick, no analysis)' : '');
else if (!sbOk) next = '2/4 storyboard' + (st.steps?.['2'] === 'gate' ? ' — pick an angle and the copy' : ' — stops once for your angle + copy');
else if (!screens.length || pending.length) next = `3/4 snapshots (${pending.length || '?'} pending)`;
else if (unmeasured) next = `3/4 measure pass — ${unmeasured} anchor(s) / press target(s) still prose: fill-anchors.mjs --list, targets.json per snapshot, targets.mjs, fill-anchors.mjs, re-render`;
else if (gaps.length) next = `4/4 fill, then node scripts/handoff.mjs — the material is incomplete: ${gaps.join('; ')} (fill scene-map.json, re-render the storyboard and the brief, then re-run the handoff; do not trust the existing ${st.handoff || 'video-handoff.md'})`;
else if (!handoffOk || handoffStale) next = `4/4 handoff — node scripts/handoff.mjs${handoffStale ? ' (the existing file is older than scene-map.json)' : ''}`;
if (next) console.log(`  next: ${next}`);
else console.log(`  next: nothing — the material is complete; give ${st.handoff} to the session or tool that builds the video.`);
console.log(`  updated ${st.updated || '—'}`);
