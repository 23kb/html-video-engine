#!/usr/bin/env node
// targets.mjs <slug> [--root dir]
//
// Measures the storyboard's targets in the frozen page. `<slug>/targets.json` maps the words the
// storyboard uses for an element to a CSS selector, written by whoever verified the selectors in
// the fossil (SKILL.md, order of work, step 7):
//
//   { "the Enable Log switch": "#wp-mail-smtp-setting-logs_enabled",
//     "the order #1042 row's subject link": { "selector": "#the-list .row-title", "text": "#1042" } }
//
// `text` picks, among the selector's matches, the first whose text contains it. The script opens
// index.html at the capture viewport width and the full document height, resolves every entry
// and writes it back as { selector, text?, box: {x, y, w, h}, center: [x, y], found } in page px.
// The storyboard's fill-anchors.mjs reads these into anchor_px and the press selectors; the
// handoff prints them. A build gets numbers, not prose.
//
// Why page px at the capture width: every tool mounts the snapshot at its capture width and
// scales the mount; a point measured here stays valid under any camera.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const args = { _: [] };
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v !== undefined && !v.startsWith('--')) { args[k] = v; i++; } else args[k] = true; } else args._.push(a); }
const slug = args._[0];
if (!slug) { console.error('usage: targets.mjs <slug> [--root dir]'); process.exit(1); }
const root = path.resolve(args.root || 'snapshots');
const dir = path.join(root, slug);
const file = path.join(dir, 'targets.json');
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`no snapshot at ${dir}`); process.exit(1); }
if (!fs.existsSync(file)) { console.error(`no ${file} — write it first: { "<words the storyboard uses>": "<css selector>" | { "selector": "...", "text": "..." } }`); process.exit(1); }
const targets = JSON.parse(fs.readFileSync(file, 'utf8'));
const meta = fs.existsSync(path.join(dir, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) : {};
const width = meta.viewport?.width || 1440;
const height = Math.max(meta.viewport?.height || 900, meta.doc_height || 0);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(pathToFileURL(path.join(dir, 'index.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(300);
const entries = Object.entries(targets).filter(([k]) => k !== '_meta').map(([key, v]) => ({ key, selector: typeof v === 'string' ? v : v?.selector, text: typeof v === 'object' && v ? v.text : undefined }));
const measured = await page.evaluate((entries) => entries.map(e => {
  try {
    let el = null;
    const all = e.selector ? [...document.querySelectorAll(e.selector)] : [];
    el = e.text ? all.find(n => (n.innerText || n.textContent || '').includes(e.text)) : all[0];
    if (!el) return { key: e.key, found: false, matches: all.length };
    const r = el.getBoundingClientRect();
    const x = r.left + window.scrollX, y = r.top + window.scrollY;
    const cs = getComputedStyle(el);
    return { key: e.key, found: true, matches: all.length, box: { x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height) }, center: [Math.round(x + r.width / 2), Math.round(y + r.height / 2)], visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0, tag: el.tagName.toLowerCase() };
  } catch (err) { return { key: e.key, found: false, error: String(err.message || err) }; }
}), entries);
await browser.close();

const out = {}; let missing = 0, tiny = 0;
for (const e of entries) {
  const m = measured.find(x => x.key === e.key) || { found: false };
  out[e.key] = { selector: e.selector || '', ...(e.text ? { text: e.text } : {}), found: !!m.found, ...(m.found ? { box: m.box, center: m.center, visible: m.visible, tag: m.tag, matches: m.matches } : { matches: m.matches ?? 0, ...(m.error ? { error: m.error } : {}) }) };
  if (m.found && (m.box.w < 8 || m.box.h < 8 || !m.visible)) { out[e.key].tiny = true; tiny++; }
  if (!m.found) missing++;
  console.log(`${m.found ? 'ok  ' : 'MISS'} ${e.key} -> ${e.selector || '(no selector)'}${e.text ? ` ~ "${e.text}"` : ''}${m.found ? ` · page px ${m.center.join(',')} · ${m.box.w}×${m.box.h}${m.visible ? '' : ' · HIDDEN'}${(m.box.w < 8 || m.box.h < 8 || !m.visible) ? ' · TINY OR HIDDEN — point at the visible element (a switch\'s track is the input\'s sibling; a page title may be screen-reader only)' : ''}` : m.error ? ` · ${m.error}` : ` · ${m.matches ?? 0} match(es)`}`);
}
out._meta = { viewport: { width, height }, doc_height: meta.doc_height ?? null, measured_at: new Date().toISOString(), space: 'page px at the capture width; y grows downward; center = box middle' };
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`targets: ${entries.length - missing}/${entries.length} measured${tiny ? `, ${tiny} tiny or hidden (fix the selector)` : ''} → ${file}`);
if (missing) process.exitCode = 2;
