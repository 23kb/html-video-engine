import { append, disposeBlock, mountStyle, nextBlockId } from './_utils.js';

export function mountArrow({
  from = { x: 100, y: 100 },
  to = { x: 320, y: 180 },
  bend = 0.25,
  stroke = '#e27730',
  width = 4,
  zIndex = 34,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-arrow');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.id = id;
  el.setAttribute('class', ['blk-arrow', className].filter(Boolean).join(' '));
  el.setAttribute('viewBox', '0 0 1920 1080');
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: String(zIndex),
    pointerEvents: 'none',
    overflow: 'visible',
  });
  const markerId = `${id}-head`;
  const d = curvePath(from, to, bend);
  el.innerHTML = `
    <defs>
      <marker id="${markerId}" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
        <path d="M2 2 L10 6 L2 10 Z" fill="${stroke}"></path>
      </marker>
    </defs>
    <path class="blk-arrow-path" d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" marker-end="url(#${markerId})"></path>
  `;
  append(parent, el);
  const path = el.querySelector('.blk-arrow-path');
  const refs = { el, style };
  return {
    el,
    path,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.65, position = 0 } = {}) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      return tl.to(path, { strokeDashoffset: 0, opacity: 1, duration, ease: 'power2.out' }, position);
    },
  };
}

function curvePath(from, to, bend) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const c1 = { x: from.x + dx * 0.45, y: from.y + dy * bend };
  const c2 = { x: from.x + dx * 0.65, y: to.y - dy * bend };
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

function css(id) {
  return `
    #${id} .blk-arrow-path {
      filter: drop-shadow(0 8px 12px rgba(15,23,42,.18));
      opacity: 1;
    }
  `;
}
