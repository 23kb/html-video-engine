// tools/lib/text-overlap.js — shared text-overlap / duplicate-text check
// (C6 / AP-13, 2026-09-02). The class shipped three times after the lesson
// was written (qri 12, cad 13, scs 8): two visible text layers over the same
// pixels, or the same copy painted twice (sting + title pill). The proven
// per-film shape is a shipped film's qc-probe.mjs (rect
// intersection > 4px on visible text boxes) — promoted here so every probe
// shares one implementation. WARN semantics everywhere: findings inform,
// nothing fails a film on them yet.
//
// Two halves:
//   collectTextBoxesSource — page-side collector, injected once per page:
//     window.__wpfCollectTextBoxes(rootSel?, { minOpacity = 0.35 }) → boxes[]
//     A box is an element with its OWN non-empty text (direct text nodes),
//     visible (display/visibility/effective opacity ≥ minOpacity), rect ≥
//     2px each way. Elements under [data-text-layer="ignore"] are skipped
//     (deliberate layered typography opts out at the markup level).
//   judgeText(boxes, { w, h, slop = 4 }) — Node-side verdicts:
//     offFrame   — box leaves the frame by > 1px on any edge
//     overlaps   — pairwise intersection > slop px in BOTH axes; pairs where
//                  one box CONTAINS the other are skipped (inline nesting is
//                  legitimate flow, not a collision)
//     duplicates — same normalised text (≥ 10 chars) visible in two boxes
//                  (the scs 8 sting/pill duplicate)

const collectTextBoxesSource = `
window.__wpfCollectTextBoxes = function (rootSel, opts) {
  opts = opts || {};
  var minOpacity = opts.minOpacity != null ? opts.minOpacity : 0.35;
  var root = rootSel ? document.querySelector(rootSel) : document.body;
  if (!root) return [];
  var out = [];
  var els = root.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.closest && el.closest('[data-text-layer="ignore"]')) continue;
    var own = '';
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) own += c.nodeValue;
    }
    own = own.replace(/\\s+/g, ' ').trim();
    if (!own) continue;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    var op = 1, n = el;
    while (n && n !== document.documentElement) {
      op *= parseFloat(getComputedStyle(n).opacity || '1');
      if (op < minOpacity) break;
      n = n.parentElement;
    }
    if (op < minOpacity) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    var id = el.id ? '#' + el.id
      : (el.className && String(el.className).trim()
        ? '.' + String(el.className).trim().split(/\\s+/)[0]
        : el.tagName.toLowerCase());
    out.push({ id: id, text: own.slice(0, 80), x: r.x, y: r.y, w: r.width, h: r.height });
  }
  return out;
};
void 0;
`;

function contains(a, b) {
  return a.x <= b.x + 0.5 && a.y <= b.y + 0.5 &&
    a.x + a.w >= b.x + b.w - 0.5 && a.y + a.h >= b.y + b.h - 0.5;
}

function judgeText(boxes, { w, h, slop = 4 } = {}) {
  const offFrame = [];
  const overlaps = [];
  const duplicates = [];
  for (const b of boxes) {
    if (b.x < -1 || b.y < -1 || b.x + b.w > w + 1 || b.y + b.h > h + 1) {
      offFrame.push({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (contains(a, b) || contains(b, a)) continue; // inline nesting, not a collision
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > slop && oy > slop) {
        overlaps.push({ a: a.id, b: b.id, ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }
  const norm = (t) => String(t).toLowerCase().replace(/\s+/g, ' ').trim();
  const byText = new Map();
  for (const b of boxes) {
    const t = norm(b.text);
    if (t.length < 10) continue;
    if (!byText.has(t)) byText.set(t, []);
    byText.get(t).push(b.id);
  }
  for (const [text, ids] of byText) {
    if (new Set(ids).size >= 2) duplicates.push({ text: text.slice(0, 60), ids: [...new Set(ids)] });
  }
  return { offFrame, overlaps, duplicates };
}

module.exports = { collectTextBoxesSource, judgeText };
