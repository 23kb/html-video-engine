import { append, applyFixed, disposeBlock, escapeHtml, mountStyle, nextBlockId } from './_utils.js';

export function mountTerminal({
  lines = [],
  prompt = '$',
  title = 'terminal',
  x = 120,
  y = 120,
  width = 620,
  zIndex = 31,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-terminal');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-terminal', className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, width, zIndex });
  el.innerHTML = `
    <div class="blk-terminal-bar"><span>${escapeHtml(title)}</span></div>
    <div class="blk-terminal-lines">
      ${lines.map((line) => `<div><span class="prompt">${escapeHtml(prompt)}</span> ${escapeHtml(line)}</div>`).join('')}
    </div>
  `;
  append(parent, el);
  const refs = { el, style };
  return {
    el,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.5, position = 0, lineStagger = 0.06 } = {}) {
      tl.from(el, { opacity: 0, y: 18, duration, ease: 'power3.out' }, position);
      tl.from([...el.querySelectorAll('.blk-terminal-lines div')], { opacity: 0, x: -10, duration: 0.24, stagger: lineStagger, ease: 'power2.out' }, position + duration * 0.35);
      return tl;
    },
  };
}

function css(id) {
  return `
    #${id}.blk-terminal {
      overflow: hidden;
      border-radius: 8px;
      background: #070b12;
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 22px 62px rgba(3,7,18,.42);
      color: #d6deeb;
      font: 500 15px/1.55 "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      will-change: transform, opacity;
    }
    #${id} .blk-terminal-bar {
      padding: 10px 14px;
      background: #111827;
      border-bottom: 1px solid rgba(255,255,255,.08);
      color: #94a3b8;
      font: 700 11px/1 Inter, system-ui, sans-serif;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    #${id} .blk-terminal-lines { padding: 16px 18px 18px; }
    #${id} .prompt { color: #46b450; }
  `;
}
