// brief-claude-design.mjs — the `claude-design` target of render-brief.mjs, in one place.
//
// Claude Design's composition engine (animations-v3): the OM_SCENES literal is the outline, CUES
// are the section starts, everything renders from the authored clock T, a hard cut is <Shot>,
// captions are one <Captions> keyed to T, the camera is a focus point (fx, fy, s) on a
// stage-wrapping transform, and the exporter serializes the stage — so no live iframe. Two
// authoring idioms exist in real projects (a paused GSAP timeline seeked to T, or pure
// Easing/animate functions of T); every recipe here is given in both. An older engine (Stage /
// Sprite / useSprite) gets a three-line fallback. Same data as the other targets; only the
// rendering changes.
//
// render-brief.mjs calls renderClaudeDesign(h) with its helpers and the spec's parts; this file
// pushes lines through h.push and returns nothing.

export const EASING_FAMILIES = { power1: 'Quad', power2: 'Cubic', power3: 'Quart', expo: 'Expo', sine: 'Sine', back: 'Back' };

// GSAP ease name -> the engine's Easing.* curve. Quint and circ are not exported: the nearest curve, marked ≈.
// Elastic exists only as easeOutElastic. A bare cubic-bezier with no GSAP name: the nearest curve, the bezier kept
// beside it for a GSAP-driven build.
export function easingName(gsap) {
  const g = String(gsap || '').trim(); if (!g || /^(none|linear)$/i.test(g)) return 'Easing.linear';
  const m = /^([a-z]+)(\d)?\.(in|out|inOut)(\(.*\))?$/i.exec(g); if (!m) return '≈ nearest Easing.* (see the cubic-bezier)';
  const dir = m[3] === 'in' ? 'In' : m[3] === 'out' ? 'Out' : 'InOut';
  const base = m[1].toLowerCase();
  if (base === 'elastic') return dir === 'Out' ? 'Easing.easeOutElastic' : '≈ Easing.easeOutElastic (only the out form exists)';
  if (base === 'power' && m[2] === '4') return `≈ Easing.ease${dir}Quart (Quint not exported)`;
  if (base === 'circ') return `≈ Easing.ease${dir}Quart (circ not exported)`;
  const fam = EASING_FAMILIES[base + (m[2] || '')];
  if (!fam) return '≈ nearest Easing.* (see the cubic-bezier)';
  return `Easing.ease${dir}${fam}`;
}

export const sectionName = (sc, i) => (String(sc.id || 'S' + (i + 1)).replace(/[^A-Za-z0-9]/g, '') || 'S' + (i + 1));
export const oneLine = s => String(s || '').replace(/\s*\[ref:[^\]]*\]/g, '').replace(/\s+/g, ' ').replace(/["\\“”]/g, '').trim().slice(0, 110);

// A seam as two recipes: the GSAP-on-T form and the animate() form. `cue` is the next section's name,
// `a` the seconds of the seam before the cue, `b` after; `ease` a GSAP name or null.
export function seamRecipes(kind, cue, a, b, ease) {
  const k = String(kind || '').toLowerCase();
  const e = ease ? `'${ease}'` : "'power2.inOut'"; const E = easingName(ease || 'power2.inOut');
  const at = `CUES.${cue} - ${a}`; const dur = (a + b).toFixed(3);
  if (/hard cut|reframe cut|match cut/.test(k)) return ['`<Shot from={CUES.Prev} to={CUES.' + cue + '}>` around the outgoing, the next Shot from the cue; no tween', 'same: `<Shot>` boundaries; visibility only'];
  if (/crossfade|blur-dissolve|soft-to-sharp|clear-then-resolve|melt/.test(k)) return [
    `\`tl.to(v.out, {o: 0, blur: B, duration: ${dur}, ease: ${e}}, ${at}); tl.fromTo(v.in, {o: 0, blur: B}, {o: 1, blur: 0, duration: ${dur}, ease: ${e}}, ${at})\``,
    `\`out = animate({from: 1, to: 0, start: ${at}, end: CUES.${cue} + ${b}, ease: ${E}})(T); in = 1 − out; blur = B × out\``];
  if (/blur push|push-through|whip|throw|slide|travel/.test(k)) return [
    `\`tl.to(v.cam, {fx, fy, s, duration: ${dur}, ease: ${e}}, ${at})\` with \`blur\` riding on the same tween; the incoming section is already rendered underneath`,
    `\`cam = {fx: animate({from, to, start: ${at}, end: CUES.${cue} + ${b}, ease: ${E}})(T), …}\`; blur from the same animate's progress`];
  if (/colour sweep|color sweep|wipe|mask reveal/.test(k)) return [
    `\`tl.set(v.bar, {x: -W}, ${at}); tl.to(v.bar, {x: +W, duration: ${dur}, ease: ${e}}, ${at})\` — a full-stage colour or mask element`,
    `\`barX = animate({from: -W, to: W, start: ${at}, end: CUES.${cue} + ${b}, ease: ${E}})(T)\``];
  if (/flip morph/.test(k)) return [
    `\`tl.to(v.card, {w: W2, h: H2, x: X2, y: Y2, duration: ${dur}, ease: ${e}}, ${at})\` — the SAME element, keyed across the cue, no remount`,
    `\`box = {w: animate({from: W1, to: W2, start: ${at}, end: CUES.${cue} + ${b}, ease: ${E}})(T), …}\` on the same element`];
  return [`a tween starting at ${at} over ${dur} s, in the ledger's terms`, `an animate({start: ${at}, end: CUES.${cue} + ${b}})(T) in the ledger's terms`];
}

export function renderClaudeDesign(h) {
  const { push, header, rulesBlock, identityBlock, structureBlock, cameraSummary, landingsIn, beatByBeat, seamTable, pacingBlock, uiBlock, grammarBlock, soundBlock, easesTable, t3, fr, bez, meta, scenes, seams, spec } = h;
  const eases = spec.eases || [];
  header(`Build brief — Claude Design (animations-v3: OM_SCENES sections, CUES, render from T) — ${meta.source ?? ''}`, 'rules, contract, OM_SCENES, motion helpers, identity, structure, camera plan, camera as focus points, seams as cues, beat by beat, seam ledger, pacing, UI motion, grammar, sound, eases');
  rulesBlock();
  push('## Contract (state once, follow everywhere)', '',
    '- Targets the **animations-v3** engine (`CompositionStage` / `OM_SCENES` / `CUES`). Older projects run the Stage engine (`<Stage width height duration>`, `<Sprite start end>`, `useSprite()` → `localTime` / `progress`, no OM_SCENES, no host-timeline write-back): there, one `<Sprite>` per scene with `start` / `end` from the OM_SCENES durations, choreography on `localTime`, and no CUES.',
    '- Claude Design reads an uploaded screencast at one frame per several seconds (≤ 1 fps): UI truth only, never motion. The seam ledger and the camera plan below are what it cannot see.',
    '- `window.OM_SCENES` is a JSON string literal in a plain inline `<script>` of the main document (not text/babel, not a sibling .jsx); pass it untouched to `<CompositionStage scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>`, which owns the exportable root. Never put the exportable attribute on any other element.',
    '- `useComposition()` gives `T` (authored seconds) and `CUES.<Name>` (each section\'s authored start). Key ALL choreography to `T`, never to wall-clock or requestAnimationFrame: the exporter seeks each frame synchronously and serializes the stage to svg/foreignObject, so anything painted from an effect, a rAF loop or a live iframe exports stale or empty.',
    '- Two authoring idioms, both real: **(1)** one paused GSAP timeline keyed to T — `gsap.timeline({paused: true})` drives plain value objects, the render reads them, `tl.seek(T)`; GSAP from the helmet — or **(2)** pure functions of T — `MOTION` over `Easing.*`, `interpolate(input, output, ease)`, `animate({from, to, start, end, ease})(T)`. Pick the idiom of the project you link as the style reference; every recipe below is given in both.',
    '- One element tree: every section\'s component renders all the time, keyed to CUES; nothing mounts or unmounts at a boundary. A hard cut is `<Shot from={CUES.A} to={CUES.B}>` (visibility only, children stay mounted). One `<Captions items={[{at, until, text}]} />`, one caption visible at a time, gated by the document\'s `captions` prop.',
    '- Exactly three motion helpers, named up front (next section); no easing or transform outside them. Do not substitute the house defaults (a white sweep bar, a 0.35 s scene fade, `power2.inOut` everywhere) for a seam or an ease the ledger names.',
    '- Real UI: a live iframe cannot sit in the exportable stage. Rebuild each screen from its snapshot\'s layer manifest — the measured boxes and real text ARE the geometry constants a build otherwise hand-types — traced over `page-full.png` at stage scale; invent no rows, no data.',
    '- Pacing is edited on the host timeline (trim / speed per section, written back into OM_SCENES — choreography retimes, never cuts off); copy, captions on/off, transitions on/off and scheme are tweaks (`TWEAK_DEFAULTS`); voice-over and music are added outside. This brief solves motion and timing only.', '');
  push('## OM_SCENES (the outline — write this literal first)', '', '```html', `<script>window.OM_SCENES = '${JSON.stringify(scenes.map((sc, i) => ({ name: sectionName(sc, i), dur: Number((sc.out - sc.in).toFixed(3)), desc: oneLine(sc.subject) })))}';</script>`, `<script>window.OM_PLAYBACK = '{"mode":"times","count":1}';</script>`, '```', '', `CUES (authored starts): ${scenes.map((sc, i) => `${sectionName(sc, i)} = ${t3(sc.in)}`).join(' · ')}. Total ${t3(meta.duration)} s. A loop (\`{"mode":"loop"}\`) shows its last frame before its first: settle the choreography by the total and open it at 0.`, '');
  const top = [...eases].sort((a, b) => String(b.used_for || '').length - String(a.used_for || '').length).slice(0, 3);
  push('## Motion helpers (exactly three)', '', '`MOTION = { enter, draw, pop }` — the only eases and transforms in the file (idiom 1: GSAP ease names; idiom 2: `Easing.*` curves; the cubic-bezier is the exact form). Map:', '');
  ['enter', 'draw', 'pop'].forEach((n, i) => { const e = top[i]; push(`- \`${n}\` → ${e ? `${e.name}: \`${easingName(e.gsap)}\` · GSAP \`${e.gsap}\` (${bez(e)}), ${fr(e.frames_24)} — ${e.used_for}` : 'pick from the eases table below'}`); });
  push('', 'Anything the three cannot express (a whip smear, a colour sweep) is a composed use of them, never a fourth helper.', '');
  identityBlock(); structureBlock(); cameraSummary();
  push('## Camera as focus points (fx, fy, s)', '',
    'The camera is one transform on the stage-wrapping div: `translate(W/2 − fx·s, H/2 − fy·s) scale(s)` for a 1920×1080 stage (W = 1920, H = 1080), driven by a focus-point triple — `camTo(px, py, s)`, `camStyle(fx, fy, s)` or `<Camera cx cy s>` are the same thing. Every landing below is one triple in stage px plus its timing; the storyboard\'s focus-point table carries the numbers (fx, fy from the measured anchor and the mount placement; s = zoom). A landing is NOT one tween: translate (fx, fy) and scale (s) are separate tweens / animates with their own eases, anticipate first (a short counter-move), and the scale settles 10–15 % behind the translate.', '',
    '| t (s) | subject | s (zoom) | move in | over (s) | ease | idiom 1 (GSAP on T) | idiom 2 (animate) |', '|---:|---|---:|---|---:|---|---|---|');
  scenes.forEach(sc => { for (const l of landingsIn(sc)) { const d = l.duration ? t3(l.duration) : '0'; const g = l.ease?.gsap || 'power2.inOut'; const cut = !l.duration || l.move_in === 'cut';
    push(`| ${t3(l.t)} | ${l.subject} | ${l.zoom != null ? l.zoom : (l.fill != null ? `fill ${l.fill}` : '—')} | ${l.move_in} | ${d} | ${l.ease?.gsap ? `\`${easingName(l.ease.gsap)}\` · \`${l.ease.gsap}\` (${bez(l.ease)})` : '—'} | ${cut ? '`tl.set(v.cam, {fx, fy, s}, t)` (a cut: a HOLD, no tween)' : `\`tl.to(v.cam, {fx, fy, duration: ${d}, ease: '${g}'}, t); tl.to(v.cam, {s, duration: ${d}, ease: '${g}'}, t + ${(l.duration * 0.12).toFixed(2)})\``} | ${cut ? '`cam = {fx, fy, s}` from t (step, no animate)' : `\`fx = animate({…, start: t, end: t + ${d}, ease: ${easingName(g)}})(T)\` (fy the same); \`s = animate({…, start: t + ${(l.duration * 0.12).toFixed(2)}, end: t + ${d}, ease: ${easingName(g)}})(T)\``} |`); } });
  push('');
  push('## Seams as cues', '', 'A hard cut is a `<Shot>` boundary. Every other seam is a tween that straddles the next section\'s cue: `start: CUES.Next − a`, `end: CUES.Next + b` (a = the part of the seam before the cue, b = after; seconds at 24 fps). Slowing either section on the host timeline stretches the straddle and never breaks it. B = the ledger\'s blur radius at 1080p; W = stage width.', '', '| seam t (s) | kind | frames | cue | a | b | idiom 1 (GSAP on T) | idiom 2 (animate) |', '|---:|---|---:|---|---:|---:|---|---|');
  seams.forEach(s => { const next = scenes.find(sc => sc.in >= s.t - 0.15); const cue = next ? sectionName(next, scenes.indexOf(next)) : 'Next'; const dur = (s.frames_24 || 1) / 24; const a = Number((next ? Math.max(0, Math.min(dur, next.in - s.t)) : dur).toFixed(3)); const b = Number((dur - a).toFixed(3)); const [g, f] = seamRecipes(s.kind, cue, a, b, s.ease?.gsap || null); push(`| ${t3(s.t)} | ${s.kind} | ${fr(s.frames_24)} | ${cue} | ${a} | ${b} | ${g} | ${f} |`); });
  push('');
  beatByBeat(); push('## Seam ledger', ''); seamTable(); pacingBlock(); uiBlock(); grammarBlock(); soundBlock(); easesTable({ head: 'Claude Design', cell: e => `\`${easingName(e.gsap)}\` · GSAP \`${e.gsap}\`` });
}
