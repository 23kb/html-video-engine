import { append, applyFixed, disposeBlock, mountStyle, nextBlockId } from './_utils.js';

// Persistent status pill for ad-style spines (Ref 3 / Claude×M365 pattern).
// Same DOM element survives label changes so the inner text can morph
// character-by-character via tweenInto rather than fade-swap.

export function mountStatusPill({
  label = 'Listening…',
  tone = 'orange',
  x = 96,
  y = 88,
  zIndex = 78,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-status-pill');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-status-pill', `tone-${tone}`, className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, zIndex });
  const dot = document.createElement('span');
  dot.className = 'blk-status-pill-dot';
  const text = document.createElement('span');
  text.className = 'blk-status-pill-text';
  text.textContent = label;
  el.appendChild(dot);
  el.appendChild(text);
  append(parent, el);
  const refs = { el, style };

  return {
    el,
    text,
    dispose() { disposeBlock(refs); },
    setLabel(next) { text.textContent = next; },
    setTone(nextTone) {
      el.classList.remove('tone-orange', 'tone-blue', 'tone-green');
      el.classList.add(`tone-${nextTone}`);
    },
    tweenInto(tl, { duration = 0.5, position = 0 } = {}) {
      return tl.from(el, { opacity: 0, x: -16, scale: 0.94, duration, ease: 'power3.out' }, position);
    },
    // Morph the text content character-by-character — old chars fade/lift out,
    // new chars rise in. Same DOM element so the pill chrome doesn't reflow.
    morphText(tl, nextLabel, { duration = 0.7, position = 0, gsap = window.gsap, flashTone = null } = {}) {
      if (!gsap) throw new Error('mountStatusPill.morphText requires window.gsap to be loaded');
      const oldText = text.textContent;
      const fragment = document.createDocumentFragment();
      const oldChars = [...oldText].map((ch) => spanChar(ch));
      const newChars = [...nextLabel].map((ch) => spanChar(ch));
      // Stack new chars absolutely over old; we tween both to swap.
      const stack = document.createElement('span');
      stack.className = 'blk-status-pill-stack';
      const oldWrap = document.createElement('span');
      oldWrap.className = 'blk-status-pill-old';
      oldChars.forEach((c) => oldWrap.appendChild(c));
      const newWrap = document.createElement('span');
      newWrap.className = 'blk-status-pill-new';
      newChars.forEach((c) => newWrap.appendChild(c));
      stack.appendChild(oldWrap);
      stack.appendChild(newWrap);
      fragment.appendChild(stack);
      text.textContent = '';
      text.appendChild(fragment);

      gsap.set(newChars, { yPercent: 90, opacity: 0, filter: 'blur(4px)' });
      tl.to(oldChars, {
        yPercent: -90, opacity: 0, filter: 'blur(4px)',
        duration: duration * 0.55, ease: 'power3.in', stagger: 0.012,
      }, position);
      tl.to(newChars, {
        yPercent: 0, opacity: 1, filter: 'blur(0px)',
        duration: duration * 0.55, ease: 'power3.out', stagger: 0.014,
      }, position + duration * 0.35);

      if (flashTone) {
        tl.add(() => el.classList.add(`flash-${flashTone}`), position + duration * 0.3);
        tl.add(() => el.classList.remove(`flash-${flashTone}`), position + duration * 0.85);
      }
      // After morph, collapse to plain text node so future morphs work cleanly.
      tl.add(() => { text.textContent = nextLabel; }, position + duration + 0.02);
      return tl;
    },
  };

  function spanChar(ch) {
    const s = document.createElement('span');
    s.className = 'blk-status-pill-char';
    s.textContent = ch === ' ' ? ' ' : ch;
    return s;
  }
}

function css(id) {
  return `
    #${id}.blk-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(31,42,58,.18);
      background: rgba(255,255,255,.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 42px rgba(15,23,42,.14), inset 0 1px 0 rgba(255,255,255,.74);
      color: #1f2a3a;
      font: 600 18px/1 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: .01em;
      white-space: nowrap;
      will-change: transform, opacity;
      transition: background-color .25s ease, border-color .25s ease, color .25s ease;
    }
    #${id} .blk-status-pill-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 4px rgba(226,119,48,.18);
      animation: ${id}-pulse 1.6s ease-in-out infinite;
    }
    #${id} .blk-status-pill-text {
      display: inline-block;
      position: relative;
      overflow: hidden;
      line-height: 1.3;
    }
    #${id} .blk-status-pill-stack {
      display: inline-grid;
      grid-template-columns: 1fr;
    }
    #${id} .blk-status-pill-old,
    #${id} .blk-status-pill-new {
      grid-row: 1;
      grid-column: 1;
      display: inline-flex;
      will-change: transform, opacity;
    }
    #${id} .blk-status-pill-char {
      display: inline-block;
      will-change: transform, opacity, filter;
    }
    #${id}.tone-orange { color: #a14400; background: rgba(255,247,237,.94); border-color: rgba(226,119,48,.32); }
    #${id}.tone-orange .blk-status-pill-dot { box-shadow: 0 0 0 4px rgba(226,119,48,.20); background: #E27730; }
    #${id}.tone-blue { color: #045a92; background: rgba(239,248,255,.94); border-color: rgba(5,106,171,.30); }
    #${id}.tone-blue .blk-status-pill-dot { box-shadow: 0 0 0 4px rgba(5,106,171,.20); background: #056AAB; }
    #${id}.tone-green { color: #1f6c2f; background: rgba(240,253,244,.94); border-color: rgba(70,180,80,.30); }
    #${id}.tone-green .blk-status-pill-dot { box-shadow: 0 0 0 4px rgba(70,180,80,.20); background: #2c9c46; }
    #${id}.flash-orange { background: #ffe9d6 !important; border-color: rgba(226,119,48,.55) !important; }
    #${id}.flash-green { background: #d6f6df !important; border-color: rgba(70,180,80,.55) !important; }
    @keyframes ${id}-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.18); opacity: .72; }
    }
  `;
}
