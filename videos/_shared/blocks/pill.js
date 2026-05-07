import { append, applyFixed, disposeBlock, mountStyle, nextBlockId } from './_utils.js';

export function mountPill({
  label = 'Ready',
  tone = 'blue',
  x = 120,
  y = 120,
  zIndex = 36,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-pill');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-pill', `tone-${tone}`, className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, zIndex });
  el.textContent = label;
  append(parent, el);
  const refs = { el, style };
  return {
    el,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.42, position = 0 } = {}) {
      return tl.from(el, { opacity: 0, y: 12, scale: 0.92, duration, ease: 'back.out(1.8)' }, position);
    },
    setLabel(nextLabel) { el.textContent = nextLabel; },
  };
}

function css(id) {
  return `
    #${id}.blk-pill {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(31,42,58,.16);
      background: rgba(255,255,255,.86);
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 28px rgba(15,23,42,.14), inset 0 1px 0 rgba(255,255,255,.72);
      color: #172033;
      font: 700 13px/1 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: .02em;
      white-space: nowrap;
      will-change: transform, opacity;
    }
    #${id}.tone-orange { color: #a33d00; background: rgba(255,247,237,.92); border-color: rgba(226,119,48,.28); }
    #${id}.tone-green { color: #237a39; background: rgba(240,253,244,.92); border-color: rgba(70,180,80,.30); }
    #${id}.tone-dark { color: #f8fafc; background: rgba(15,23,42,.82); border-color: rgba(255,255,255,.14); }
    #${id}.tone-blue { color: #056aab; background: rgba(239,248,255,.92); border-color: rgba(5,106,171,.25); }
  `;
}
