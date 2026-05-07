import { append, disposeBlock, mountStyle, nextBlockId } from './_utils.js';

export function mountRouteLine({
  points = [{ x: 160, y: 540 }, { x: 560, y: 360 }, { x: 980, y: 540 }],
  stroke = '#4ec9ff',
  width = 3,
  zIndex = 33,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-route-line');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.id = id;
  el.setAttribute('class', ['blk-route-line', className].filter(Boolean).join(' '));
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
  const d = smoothPath(points);
  el.innerHTML = `
    <path class="blk-route-glow" d="${d}" fill="none" stroke="${stroke}" stroke-width="${width + 7}" stroke-linecap="round" stroke-linejoin="round"></path>
    <path class="blk-route-path" d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"></path>
  `;
  append(parent, el);
  const paths = [...el.querySelectorAll('path')];
  const refs = { el, style };
  return {
    el,
    path: el.querySelector('.blk-route-path'),
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.8, position = 0 } = {}) {
      paths.forEach((path) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
      });
      return tl.to(paths, { strokeDashoffset: 0, duration, ease: 'power2.inOut', stagger: 0.03 }, position);
    },
  };
}

function smoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const midX = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + cur.y) / 2}`;
    d += ` T ${cur.x} ${cur.y}`;
  }
  return d;
}

function css(id) {
  return `
    #${id} .blk-route-glow {
      opacity: .16;
      filter: blur(6px);
    }
    #${id} .blk-route-path {
      filter: drop-shadow(0 6px 12px rgba(78,201,255,.20));
    }
  `;
}
