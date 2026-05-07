let blockUid = 0;

export function nextBlockId(prefix) {
  blockUid += 1;
  return `${prefix}-${blockUid}`;
}

export function mountStyle(id, css, parent = document.head) {
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  parent.appendChild(style);
  return style;
}

export function append(parent, el) {
  (parent || document.body).appendChild(el);
  return el;
}

export function disposeBlock(refs) {
  if (!refs || refs.disposed) return;
  refs.disposed = true;
  refs.kill?.();
  refs.el?.remove();
  refs.style?.remove();
}

export function applyFixed(el, { zIndex = 30, x = 120, y = 120, width, height } = {}) {
  Object.assign(el.style, {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: String(zIndex),
    pointerEvents: 'none',
  });
  if (width != null) el.style.width = typeof width === 'number' ? `${width}px` : width;
  if (height != null) el.style.height = typeof height === 'number' ? `${height}px` : height;
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function tokenHtml(source = '', language = 'js') {
  let html = escapeHtml(source);
  if (language === 'json') {
    return html
      .replace(/(&quot;[^&]+?&quot;)(\s*:)/g, '<span class="blk-token-prop">$1</span>$2')
      .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="blk-token-str">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="blk-token-kw">$1</span>')
      .replace(/:\s*(-?\d+(\.\d+)?)/g, ': <span class="blk-token-num">$1</span>');
  }
  return html
    .replace(/\b(const|let|var|return|async|await|function|export|import|from)\b/g, '<span class="blk-token-kw">$1</span>')
    .replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="blk-token-str">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="blk-token-num">$1</span>')
    .replace(/\b([a-zA-Z_$][\w$]*)(?=\()/g, '<span class="blk-token-fn">$1</span>');
}
