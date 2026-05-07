import { append, applyFixed, disposeBlock, escapeHtml, mountStyle, nextBlockId } from './_utils.js';

export function mountMacWindow({
  title = '',
  subtitle = '',
  content = '',
  x = 160,
  y = 130,
  width = 760,
  height = 430,
  zIndex = 28,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-mac-window');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-mac-window', className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, width, height, zIndex });
  el.innerHTML = `
    <div class="blk-mac-bar">
      <span class="blk-dot red"></span><span class="blk-dot yellow"></span><span class="blk-dot green"></span>
      <div class="blk-title">
        <strong>${escapeHtml(title)}</strong>
        ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ''}
      </div>
    </div>
    <div class="blk-mac-body"></div>
  `;
  const body = el.querySelector('.blk-mac-body');
  if (content instanceof Node) body.appendChild(content);
  else body.innerHTML = content;
  append(parent, el);
  const refs = { el, style };
  return {
    el,
    body,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.7, position = 0 } = {}) {
      return tl.from(el, { opacity: 0, y: 24, scale: 0.985, duration, ease: 'power3.out' }, position);
    },
  };
}

function css(id) {
  return `
    #${id}.blk-mac-window {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(31,42,58,.24);
      border-radius: 8px;
      background: #f8fafc;
      box-shadow: 0 24px 70px rgba(15,23,42,.24), inset 0 1px 0 rgba(255,255,255,.9);
      color: #172033;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      will-change: transform, opacity;
    }
    #${id} .blk-mac-bar {
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      background: linear-gradient(#ffffff, #edf1f5);
      border-bottom: 1px solid rgba(31,42,58,.12);
      flex: 0 0 auto;
    }
    #${id} .blk-dot { width: 11px; height: 11px; border-radius: 50%; }
    #${id} .blk-dot.red { background: #ff5f56; }
    #${id} .blk-dot.yellow { background: #ffbd2e; }
    #${id} .blk-dot.green { background: #27c93f; }
    #${id} .blk-title { margin-left: 10px; display: flex; flex-direction: column; gap: 2px; }
    #${id} .blk-title strong { font-size: 13px; line-height: 1; }
    #${id} .blk-title span { font-size: 11px; color: #697386; }
    #${id} .blk-mac-body {
      flex: 1 1 auto;
      min-height: 0;
      padding: 22px;
      overflow: hidden;
      background: #fff;
    }
  `;
}
