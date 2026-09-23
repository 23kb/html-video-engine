// claude-design.mjs — what the storyboard adds to a Claude Design brief, from OUR rows: the OM_SCENES
// literal (our names, durations, descs), the camera focus points (fx, fy, s) in stage px from the
// measured anchors and the mount placement, the <Captions> items and the TWEAK_DEFAULTS block from
// the copy table, and the voice-over skeleton in the shape those projects use (a timed line per
// section, a wpm note, lines ending 2–4 s early, the on-screen column beside it).
//
// render-brief.mjs calls claudeDesignSections({...}) and appends the returned lines.

const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/["\\“”]/g, '').trim();
const jsKey = id => String(id || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'c';
const isRealUi = c => /real ui|\brow\b|subject|label|button|switch|select|tab\b|heading|link|menu|status/i.test(String(c.where || ''));

export function claudeDesignSections({ map, rows, ours, isEditorial, cell, stage, wpm }) {
  const kept = rows.filter(r => r.our?.status !== 'dropped');
  const W = stage?.width || 1920, H = stage?.height || 1080;
  const rate = wpm === 'relaxed' ? 75 : (Number(wpm) || 140);
  const S = [];
  // ---- scene times (cumulative, the same arithmetic as the handoff) ----
  let t0 = 0; const times = new Map(); let lastS = 1;
  for (const r of kept) { const d = Number(ours(r).duration) || 0; times.set(r, { in: t0, out: t0 + d, dur: d }); t0 += d; }
  const nameOf = r => String(r.ref_scene || 'S').replace(/[^A-Za-z0-9]/g, '') || 'S';

  // ---- OM_SCENES, ours ----
  const cutWords = (s, n) => { s = clean(s); if (s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(' '), 40)).replace(/[,;:—-]\s*$/, ''); };
  const om = kept.map(r => { const o = ours(r); return { name: nameOf(r), dur: Number(times.get(r).dur.toFixed(3)), desc: cutWords(o.visible || o.motion || '', 140) }; });
  S.push('## OM_SCENES (ours — the one literal to paste)', '', '```html', `<script>window.OM_SCENES = '${JSON.stringify(om).replace(/'/g, "\\'")}';</script>`, `<script>window.OM_PLAYBACK = '{"mode":"times","count":1}';</script>`, '```', '');

  // ---- focus points ----
  S.push('## Camera focus points (from the storyboard — fx, fy, s in stage px)', '',
    `Stage ${W}×${H}. Mount placement assumed: each snapshot mounted at its capture width, scale 1, centred horizontally, top at 0 — so fx = (${W} − mount width) / 2 + anchor x, fy = anchor y. Place the mount elsewhere and add your own offset. s = the landing's zoom (a fill value means "measure the zoom that fills"). Translate and scale are separate tweens / animates, anticipate first, scale settling 10–15 % behind.`, '',
    '| t (s) | scene | fx | fy | s | move in | over (s) | anchor |', '|---:|---|---:|---:|---:|---|---:|---|');
  for (const r of kept) { const o = ours(r); const tm = times.get(r); const ls = Array.isArray(r.landings) ? r.landings : [];
    const px = Array.isArray(o.anchor_px) ? o.anchor_px : null; const mw = o.mount?.width || null;
    const fx = px && mw ? Math.round((W - mw) / 2 + px[0]) : (px ? px[0] : null); const fy = px ? px[1] : null;
    const rowsHere = ls.length ? ls : [{ t: r.ref_in, zoom: null, move_in: 'hold', duration: 0, _hold: true }];
    for (const l of rowsHere) { const t = tm.in + Math.max(0, (Number(l.t) || 0) - (Number(r.ref_in) || 0)) * (tm.dur / Math.max(1e-6, (Number(r.ref_span_duration ?? r.ref_duration) || tm.dur)));
      const la = (o.landing_anchors || []).find(a => Math.abs((Number(a.t) ?? -1) - (Number(l.t) || 0)) < 0.03 && (a.anchor || '').trim());
      const pxL = la && Array.isArray(la.anchor_px) ? la.anchor_px : px; const fxL = pxL && mw ? Math.round((W - mw) / 2 + pxL[0]) : (pxL ? pxL[0] : null); const fyL = pxL ? pxL[1] : null;
      const sVal = l.zoom != null ? l.zoom : (l.fill != null ? null : lastS); if (l.zoom != null) lastS = l.zoom;
      S.push(`| ${t.toFixed(2)} | ${nameOf(r)} | ${isEditorial(r) ? Math.round(W / 2) : (fxL ?? 'not measured')} | ${isEditorial(r) ? Math.round(H / 2) : (fyL ?? 'not measured')} | ${sVal != null ? sVal : (l.fill != null ? `fill ${l.fill} (measure the zoom that fills)` : lastS)} | ${l._hold ? 'hold (no landing: the camera keeps the previous point)' : (l.move_in || 'cut')} | ${l.duration ? Number(l.duration).toFixed(2) : '0'} | ${cell((la ? la.anchor : o.anchor) || (isEditorial(r) ? `stage centre; the element's own box from the editorial layout — ${o.visible}` : '') || '—')}${(la ? la.anchor_selector : o.anchor_selector) ? ` \`${la ? la.anchor_selector : o.anchor_selector}\`` : ''} |`); } }
  S.push('');

  // ---- captions items from the copy table ----
  const copy = Array.isArray(map.copy) ? map.copy : [];
  const sceneOf = id => kept.find(r => String(r.ref_scene) === String(id));
  const items = [];
  for (const c of copy) { if (isRealUi(c)) continue; const ids = Array.isArray(c.scene) ? c.scene : String(c.scene || '').split(/[,\s]+/).filter(Boolean); const first = ids.map(sceneOf).find(Boolean); const last = [...ids].reverse().map(sceneOf).find(Boolean); if (!first) continue; items.push({ id: c.id, at: Number(times.get(first).in.toFixed(2)), until: Number(times.get(last || first).out.toFixed(2)), text: clean(c.text) }); }
  // One caption at a time: items that share a span are split across it in table order (the roll words of one scene, for example).
  { const groups = new Map(); for (const it of items) { const k = `${it.at}-${it.until}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); } for (const g of groups.values()) { if (g.length < 2) continue; const a = g[0].at, b = g[0].until, step = (b - a) / g.length; g.forEach((it, i) => { it.at = Number((a + i * step).toFixed(2)); it.until = Number((a + (i + 1) * step).toFixed(2)); it.split = true; }); } }
  S.push('## Captions items (from the storyboard)', '', 'One `<Captions items={…} />` keyed to T, gated by the document\'s `captions` prop (`showCaptions`). Editorial copy only; text the mounted screen already shows is left out. Items that shared one span are split across it in order (marked); refine with the roll timing in the seam ledger. Edit the words as tweaks, not here.', '', '```jsx', '<Captions items={[', ...items.map(i => `  { at: ${i.at}, until: ${i.until}, text: ${JSON.stringify(i.text)} }, // ${i.id}${i.split ? ' (split evenly across a shared span)' : ''}`), ']} />', '```', '');

  // ---- tweaks ----
  const tweaks = { showCaptions: true, transitions: true, scheme: 'light' };
  for (const c of copy) if (!isRealUi(c)) tweaks[jsKey(c.id) + '_text'] = clean(c.text);
  S.push('## TWEAK_DEFAULTS (from the storyboard)', '', 'Copy, captions on/off, transitions on/off and scheme are tweaks the host edit mode writes back into the file — a revision is a tweak, not a prompt. One key per copy id, the storyboard\'s literal copy as the default; add `pace`, `variant` or a colour when the film needs them.', '', '```js', `window.TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/${JSON.stringify(tweaks, null, 2)}/*EDITMODE-END*/;`, '```', '');

  // ---- voice-over skeleton ----
  const byScene = new Map(); for (const c of copy) { const ids = Array.isArray(c.scene) ? c.scene : String(c.scene || '').split(/[,\s]+/).filter(Boolean); for (const id of ids) { if (!byScene.has(id)) byScene.set(id, []); byScene.get(id).push(c); } }
  S.push('## Voice-over shape (from the storyboard)', '', `One line per section, ${rate} wpm (${wpm === 'relaxed' ? 'a relaxed read' : 'pass --wpm relaxed for ~75'}); each line ends about a second before its section ends on a fast film (2–4 s on a slow one), so the budget below already subtracts a second. The on-screen column is the copy table's; the line says the step, never reads the UI aloud. Delivery note for the reader: even pace, no hard stops at section boundaries, the last line lands before the film settles. Voice-over and music are recorded and mixed outside Claude Design.`, '', '| time | section | on screen | VO (budget) |', '|---|---|---|---|');
  for (const r of kept) { const tm = times.get(r); const words = tm.dur < 2 ? 0 : Math.max(1, Math.round((tm.dur - 1) * rate / 60)); const on = (byScene.get(String(r.ref_scene)) || []).map(c => `${c.id} ${clean(c.text).slice(0, 40)}`).join(' · '); S.push(`| ${mmss(tm.in)} – ${mmss(tm.out)} | ${nameOf(r)} | ${cell(on || '—')} | ${words ? `~${words} words: "…"` : 'no line — under 2 s; fold into the next section'} |`); }
  S.push('');
  return S;
}
