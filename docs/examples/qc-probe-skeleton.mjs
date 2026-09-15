// Per-film QC probe — SKELETON. Clone to videos/<slug>/qc-probe.mjs on v1, BEFORE the
// first handoff, then replace the TODO blocks with this film's assertions.
//
//   cp docs/examples/qc-probe-skeleton.mjs videos/<slug>/qc-probe.mjs
//   PORT=4399 node videos/<slug>/qc-probe.mjs
//
// Why this exists (yjc 3, 2026-09-04): the shared battery (validator, smoke,
// composition-scan, dead-time, seam-gate) measures BROKEN-ness. It never measures
// "is the thing where I said it is, in the colour I said, moving the way I said".
// Five real defects in one film were found only by the assertions below, three of
// them documented traps that reading the rule did not prevent. Written after
// round 1 it cost a round. Every QC note that comes back gets translated into a
// mechanical assertion here FIRST ("not smooth" -> monotonic zoom; "clicks the
// wrong thing" -> pointer tip inside the subject's rect; "font looks off" ->
// computed font-family and color), then fixed. The assertion never regresses.
//
// Distilled from videos/wpforms-claude-you-just-chat/qc-probe.mjs (22 checks, tier S).
//
// Rules baked in:
//   - a PRIVATE port by default (PORT env, else 4399): preview.js live-reload on
//     :4321 kills every headless run the moment any session writes a file
//     (wvb 18, scfw 8, stte 7, cja 10)
//   - page.evaluate bodies never RETURN a GSAP object — block bodies + booleans
//     only, or Playwright hangs serialising the timeline (rfv 7, qrd 2, wvb 17)
//   - samples are taken in ASCENDING time order — tl.call cues fire forward-only,
//     so a backward seek reads the probe's path, not the film's (rfv 21)
//   - measure in STAGE px: rects are scaled by 1920 / stage.width so the numbers
//     match the film's coordinates whatever the browser viewport is
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ensureServer } = require('../../tools/generate-snapshot-outline.js');

const SLUG = 'TODO-slug';                 // videos/<SLUG>/index.html
const STAGE_W = 1920;                     // 1080 on a 9:16 short
const VIEWPORT = { width: 1920, height: 1080 }; // { width: 1080, height: 1920 } on a short
const PORT = Number(process.env.PORT || 4399);

await ensureServer(PORT);

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEWPORT });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.route('**/__preview-ws**', (r) => r.abort());
await page.goto(`http://localhost:${PORT}/videos/${SLUG}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__tl, null, { polling: 100, timeout: 25000 });
await page.evaluate(() => { window.__tl.pause(); });

// ── harness ─────────────────────────────────────────────────────────────────
let _lastT = -1;
/** Seek the master to t (seconds) and run `body` (a JS source string) in the page. */
const at = (t, body) => page.evaluate(([tt, src]) => {
  window.__tl.time(tt);
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}, [t, body]).then((r) => {
  if (t < _lastT) console.warn(`  (probe warning: sampled ${t}s after ${_lastT}s — out of order)`);
  _lastT = Math.max(_lastT, t);
  return r;
});

let fail = 0;
const check = (name, ok, detail) => {
  if (!ok) fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// Stage-space helpers, injected into every body that needs them.
const HELPERS = `
  const stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect();
  const k = ${STAGE_W} / sr.width;
  const toStage = (r) => ({ x: (r.left - sr.left) * k, y: (r.top - sr.top) * k, w: r.width * k, h: r.height * k });
  const rectOf = (sel) => toStage(document.querySelector(sel).getBoundingClientRect());
  const scaleOf = (sel) => {
    const m = getComputedStyle(document.querySelector(sel)).transform.match(/matrix\\(([^,]+)/);
    return m ? +(+m[1]).toFixed(4) : 1;
  };
`;

// ── reusable assertions ─────────────────────────────────────────────────────

/** 1. The pointer TIP is inside the thing it clicks (yjc 5 — it hit the model chip). */
async function tipInside(label, t, cursorSel, subjectSel, tip = { fx: 0.125, fy: 0.083 }) {
  const q = await at(t, `${HELPERS}
    const c = rectOf('${cursorSel}');
    const tip = { x: c.x + c.w * ${tip.fx}, y: c.y + c.h * ${tip.fy} };
    const s = rectOf('${subjectSel}');
    return { tip: { x: Math.round(tip.x), y: Math.round(tip.y) },
             s: { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h) },
             inside: tip.x >= s.x && tip.x <= s.x + s.w && tip.y >= s.y && tip.y <= s.y + s.h };`);
  check(`${label}: pointer tip inside ${subjectSel}`, q.inside,
    `tip ${q.tip.x},${q.tip.y} vs ${q.s.x},${q.s.y} ${q.s.w}x${q.s.h}`);
}

/** 2. A camera move is MONOTONIC — no mid-move reversal (yjc 2: "not smooth" in numbers). */
async function monotonic(label, lensSel, from, to, step = 0.04) {
  const zs = [];
  for (let t = from; t <= to + 1e-9; t += step) zs.push(await at(+t.toFixed(3), `${HELPERS} return scaleOf('${lensSel}');`));
  let up = 0, down = 0;
  for (let i = 1; i < zs.length; i++) {
    const d = zs[i] - zs[i - 1];
    if (d > 0.004) up++; else if (d < -0.004) down++;
  }
  check(`${label}: moves one way only`, up === 0 || down === 0,
    `${zs.length} samples, ${up} up / ${down} down, ${zs[0]} -> ${zs[zs.length - 1]}`);
}

/** 3. The frame is DEAD STILL across a window (a composer that creeps under swapping text reads as instability). */
async function stillAcross(label, lensSel, from, to, step = 0.15, tol = 0.005) {
  const zs = [];
  for (let t = from; t <= to + 1e-9; t += step) zs.push(await at(+t.toFixed(3), `${HELPERS} return scaleOf('${lensSel}');`));
  const spread = Math.max(...zs) - Math.min(...zs);
  check(`${label}: frame still`, spread < tol, `zoom spread ${spread.toFixed(4)} over ${zs.length} samples`);
}

/** 4. Computed colour / size / family — the outro that rendered system-ui dark-grey on purple (yjc 8). */
async function computed(label, t, sel, expect) {
  const q = await at(t, `
    const cs = getComputedStyle(document.querySelector('${sel}'));
    return { color: cs.color, size: cs.fontSize, family: cs.fontFamily.split(',')[0].replace(/"/g, ''), opacity: cs.opacity, visibility: cs.visibility };`);
  const ok = Object.entries(expect).every(([k, v]) => (v instanceof RegExp ? v.test(q[k]) : q[k] === v));
  check(`${label}: ${sel} computed`, ok, JSON.stringify(q));
}

/** 5. Park-state visibility — autoAlpha park + opacity-only reveal ships a BLACK scene (yjc defect 2, ela 5a). */
async function visible(label, t, sel, want = true) {
  const q = await at(t, `
    let el = document.querySelector('${sel}'); const chain = [];
    while (el && el !== document.body) { const cs = getComputedStyle(el); chain.push([el.id || el.className, cs.opacity, cs.visibility, cs.display]); el = el.parentElement; }
    const bad = chain.find(([, o, v, d]) => Number(o) < 0.05 || v === 'hidden' || d === 'none');
    return { visible: !bad, bad };`);
  check(`${label}: ${sel} ${want ? 'visible' : 'hidden'}`, q.visible === want, q.bad ? `blocked by ${JSON.stringify(q.bad)}` : 'ancestor chain clear');
}

/** 6. Every <img> asset actually decoded — a broken SVG still reports opacity 1 (itf 3). */
async function imagesDecoded(label, t, scopeSel = 'body') {
  const q = await at(t, `
    return [...document.querySelector('${scopeSel}').querySelectorAll('img')]
      .filter((i) => getComputedStyle(i).display !== 'none')
      .map((i) => [i.getAttribute('src')?.slice(-40), i.naturalWidth]).filter(([, w]) => !(w > 0));`);
  check(`${label}: all visible <img> decoded`, q.length === 0, q.length ? JSON.stringify(q) : '');
}

/** 7. An element sits inside the frame at t (the reply that rendered at x −445, wvb; the star at x −27, scaf 3). */
async function inFrame(label, t, sel, margin = 0) {
  const q = await at(t, `${HELPERS}
    const r = rectOf('${sel}');
    const H = ${VIEWPORT.height} * (${STAGE_W} / ${VIEWPORT.width});
    return { r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) },
             ok: r.x >= ${margin} && r.y >= ${margin} && r.x + r.w <= ${STAGE_W} - ${margin} && r.y + r.h <= H - ${margin} };`);
  check(`${label}: ${sel} inside the frame`, q.ok, JSON.stringify(q.r));
}

// ── this film's assertions (ascending t) ────────────────────────────────────
// TODO: one block per beat the storyboard promises. Examples:
//
// await visible('s1 open', 0.6, '#s1');
// await visible('s2 parked', 0.6, '#s2', false);
// await tipInside('click 1', 9.08, '#lens .ml-cursor', '#mark');
// await monotonic('dive @9.08', '#lens', 9.08, 9.48);
// await stillAcross('composer across swaps', '#lens', 14.95, 17.50);
// await computed('outro tagline', 29.40, '#endHost .cta', { color: 'rgb(255, 246, 236)', family: /Inter/ });
// await imagesDecoded('end card', 29.40, '#endHost');
// await inFrame('reply 2', 24.10, '#reply2');

if (errs.length) { console.log('  page errors:', errs.join(' | ')); fail++; }
console.log(fail ? `\n${fail} check(s) FAILED` : '\nall checks PASS');
await browser.close();
process.exit(fail ? 1 : 0);
