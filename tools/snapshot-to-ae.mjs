#!/usr/bin/env node
// snapshot-to-ae — flatten a real WPForms snapshot into self-contained,
// absolutely-positioned, inline-styled HTML that ae_build_scene_from_html can walk.
//
// The snapshot's appearance lives in ~1.1 MB of head CSS that can't be transported
// inline. So we let a real browser apply that CSS, then read the COMPUTED result
// per node and re-emit it as flat absolute markup. Browser does the styling; we
// only carry the outcome.
//
//   node snapshot-to-ae.mjs <snapshot-slug> --scope "<css selector>" [--out file.html]
//                           [--w 1920] [--h 1080] [--pad 40]

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/PC/Desktop/Video Project - HTML only';
const args = process.argv.slice(2);
const slug = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const SCOPE = opt('scope', 'form.wpforms-form, .wpforms-container, body');
const OUT = opt('out', path.join(process.cwd(), `${slug}-ae.html`));
const COMP_W = +opt('w', 1920), COMP_H = +opt('h', 1080), PAD = +opt('pad', 40);

if (!slug) { console.error('usage: snapshot-to-ae.mjs <slug> [--scope sel]'); process.exit(1); }
const src = path.join(ROOT, 'snapshots', slug, 'index.html');
if (!fs.existsSync(src)) { console.error('no such snapshot:', src); process.exit(1); }

// builder chrome + editor affordances that must never reach a film
const DROP_CLASS = /wpforms-field-move-|wpforms-field-duplicate|wpforms-field-delete|wpforms-field-helper|wpforms-context-menu|wpforms-field-multi-field-menu|ui-sortable-handle-only|screen-reader|hidden_text|empty_text/;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(600);
try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

const result = await page.evaluate(({ SCOPE, DROP_SRC, PAD }) => {
  const DROP = new RegExp(DROP_SRC);
  let root = null;
  for (const sel of SCOPE.split(',').map(s => s.trim())) { root = document.querySelector(sel); if (root) break; }
  if (!root) return { error: 'scope not found' };

  const rootRect = root.getBoundingClientRect();
  const nodes = [];
  const seenText = new WeakSet();

  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2 && r.width < 4000 && r.height < 4000;
  };
  const opaque = c => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\s*\)/.test(c);

  const walk = el => {
    if (el.nodeType !== 1) return;
    const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || '');
    if (typeof cls === 'string' && DROP.test(cls)) return;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') return;
    if (!visible(el)) return;

    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left - rootRect.left) + PAD;
    const y = Math.round(r.top - rootRect.top) + PAD;
    const w = Math.round(r.width), h = Math.round(r.height);

    // own text = direct text-node children only (so we don't duplicate up the tree)
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();

    const hasPaint = opaque(cs.backgroundColor) || (parseFloat(cs.borderTopWidth) > 0 && opaque(cs.borderTopColor));
    if (hasPaint) {
      nodes.push({
        kind: 'box', x, y, w, h,
        bg: opaque(cs.backgroundColor) ? cs.backgroundColor : 'transparent',
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        bw: parseFloat(cs.borderTopWidth) || 0,
        bc: cs.borderTopColor,
        shadow: cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : '',
        cls: (typeof cls === 'string' ? cls : '').split(' ')[0] || el.tagName.toLowerCase()
      });
    }
    if (own && !seenText.has(el)) {
      seenText.add(el);
      nodes.push({
        kind: 'text', x, y, w: Math.max(w, 10), h,
        text: own,
        color: cs.color,
        fs: Math.round(parseFloat(cs.fontSize)),
        fw: cs.fontWeight,
        ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0,
        lh: Math.round(parseFloat(cs.lineHeight)) || Math.round(parseFloat(cs.fontSize) * 1.3),
        align: cs.textAlign,
        cls: (typeof cls === 'string' ? cls : '').split(' ')[0] || 'txt'
      });
    }
    for (const c of el.children) walk(c);
  };
  walk(root);
  return { nodes, w: Math.round(rootRect.width), h: Math.round(rootRect.height) };
}, { SCOPE, DROP_SRC: DROP_CLASS.source, PAD });

await browser.close();
if (result.error) { console.error(result.error); process.exit(1); }

const { nodes, w: srcW, h: srcH } = result;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// hint-bearing wrapper class so the walker auto-precomps the card
const parts = [`<div class="feature-card" style="position:absolute;left:0px;top:0px;width:${srcW + PAD * 2}px;height:${srcH + PAD * 2}px">`];
for (const n of nodes) {
  if (n.kind === 'box') {
    const sh = n.shadow ? `;box-shadow:${n.shadow}` : '';
    const bd = n.bw ? `;border:${n.bw}px solid ${n.bc}` : '';
    parts.push(`<div class="${n.cls}" style="position:absolute;left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;background:${n.bg};border-radius:${n.radius}px${bd}${sh}"></div>`);
  } else {
    parts.push(`<div class="${n.cls}" style="position:absolute;left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;font-size:${n.fs}px;font-weight:${n.fw};letter-spacing:${n.ls}px;line-height:${n.lh}px;color:${n.color};text-align:${n.align};white-space:nowrap">${esc(n.text)}</div>`);
  }
}
parts.push('</div>');

const html = `<body style="margin:0;width:${COMP_W}px;height:${COMP_H}px;background:#F9F9F9">${parts.join('')}</body>`;
fs.writeFileSync(OUT, html, 'utf8');

const boxes = nodes.filter(n => n.kind === 'box').length;
const texts = nodes.filter(n => n.kind === 'text').length;
console.log(`source card: ${srcW}x${srcH}`);
console.log(`nodes: ${nodes.length}  (boxes ${boxes} / text ${texts})`);
console.log(`bytes: ${html.length.toLocaleString()}`);
console.log(`out: ${OUT}`);
