import { append, applyFixed, disposeBlock, escapeHtml, mountStyle, nextBlockId, tokenHtml } from './_utils.js';

export function mountCodeCard({
  code = '',
  language = 'js',
  title = '',
  status = '',
  x = 120,
  y = 120,
  width = 640,
  zIndex = 30,
  parent = document.body,
  className = '',
} = {}) {
  const id = nextBlockId('blk-code-card');
  const style = mountStyle(`${id}-style`, css(id));
  const el = document.createElement('div');
  el.id = id;
  el.className = ['blk-code-card', className].filter(Boolean).join(' ');
  applyFixed(el, { x, y, width, zIndex });
  el.innerHTML = `
    <div class="blk-code-chrome">
      <span class="blk-dot red"></span><span class="blk-dot yellow"></span><span class="blk-dot green"></span>
      <span class="blk-code-title">${escapeHtml(title || language)}</span>
      ${status ? `<span class="blk-code-status">${escapeHtml(status)}</span>` : ''}
    </div>
    <pre><code>${tokenHtml(code, language)}</code></pre>
    <span class="blk-code-shimmer"></span>
  `;
  append(parent, el);
  const refs = { el, style };
  return {
    el,
    dispose() { disposeBlock(refs); },
    tweenInto(tl, { duration = 0.6, position = 0, yFrom = 20 } = {}) {
      tl.from(el, { opacity: 0, y: yFrom, filter: 'blur(8px)', duration, ease: 'power3.out' }, position);
      tl.from(el.querySelector('.blk-code-shimmer'), { scaleX: 0, opacity: 0, duration: duration * 0.8, ease: 'power2.out' }, position + duration * 0.25);
      return tl;
    },
  };
}

function css(id) {
  return `
    #${id}.blk-code-card {
      box-sizing: border-box;
      background: #0d1117;
      color: #d6deeb;
      border: 1px solid #2f3540;
      border-radius: 8px;
      box-shadow: 0 22px 62px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.05);
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 16px;
      line-height: 1.55;
      overflow: hidden;
      will-change: transform, opacity, filter;
    }
    #${id} .blk-code-chrome {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px;
      border-bottom: 1px solid #2f3540;
      color: #7d8590;
      font: 600 11px/1 Inter, system-ui, sans-serif;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    #${id} .blk-dot { width: 10px; height: 10px; border-radius: 50%; background: #3d4147; }
    #${id} .blk-dot.red { background: #ff5f56; }
    #${id} .blk-dot.yellow { background: #ffbd2e; }
    #${id} .blk-dot.green { background: #27c93f; }
    #${id} .blk-code-title { margin-left: 8px; }
    #${id} .blk-code-status {
      margin-left: auto;
      color: #46b450;
      background: rgba(70,180,80,.13);
      border-radius: 999px;
      padding: 4px 10px;
    }
    #${id} pre { margin: 0; padding: 18px 22px 20px; white-space: pre-wrap; }
    #${id} .blk-token-kw { color: #c586c0; }
    #${id} .blk-token-fn { color: #dcdcaa; }
    #${id} .blk-token-str { color: #ce9178; }
    #${id} .blk-token-num { color: #b5cea8; }
    #${id} .blk-token-prop { color: #9cdcfe; }
    #${id} .blk-code-shimmer {
      display: block;
      height: 1px;
      background: linear-gradient(90deg, transparent, #4ec9ff, transparent);
      transform-origin: left center;
    }
  `;
}
