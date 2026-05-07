import { append, applyFixed, disposeBlock, mountStyle, nextBlockId } from './_utils.js';

export function mountPhoneFrame({
  content = '',
  x = 1320,
  y = 120,
  width = 300,
  height = 610,
  zIndex = 32,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-phone-frame');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-phone-frame', className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, width, height, zIndex });
  el.innerHTML = '<div class="blk-phone-notch"></div><div class="blk-phone-screen"></div>';
  const screen = el.querySelector('.blk-phone-screen');
  if (content instanceof Node) screen.appendChild(content);
  else screen.innerHTML = content;
  append(parent, el);
  const refs = { el, style };
  return {
    el,
    screen,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.65, position = 0 } = {}) {
      return tl.from(el, { opacity: 0, y: 28, rotate: 1.2, scale: 0.96, duration, ease: 'back.out(1.25)' }, position);
    },
  };
}

function css(id) {
  return `
    #${id}.blk-phone-frame {
      box-sizing: border-box;
      padding: 18px 13px;
      background: #111827;
      border: 1px solid rgba(255,255,255,.22);
      border-radius: 34px;
      box-shadow: 0 26px 70px rgba(3,7,18,.38), inset 0 0 0 2px rgba(255,255,255,.05);
      will-change: transform, opacity;
    }
    #${id} .blk-phone-notch {
      position: absolute;
      top: 10px;
      left: 50%;
      width: 88px;
      height: 22px;
      transform: translateX(-50%);
      background: #070b12;
      border-radius: 0 0 14px 14px;
      z-index: 2;
    }
    #${id} .blk-phone-screen {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 24px;
      background: #f8fafc;
      color: #172033;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
  `;
}
