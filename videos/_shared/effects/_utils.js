let effectUid = 0;

export function nextEffectId(prefix) {
  effectUid += 1;
  return `${prefix}-${effectUid}`;
}

export function mountStyle(id, css, parent = document.head) {
  const existing = parent.querySelector(`#${id}`);
  if (existing) return existing;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  parent.appendChild(style);
  return style;
}

export function disposeEffect(refs) {
  if (!refs || refs.disposed) return;
  refs.disposed = true;
  refs.kill?.();
  refs.el?.remove();
  refs.style?.remove();
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolveColor(name) {
  switch (name) {
    case 'orange': return 'var(--wpf-orange, #E27730)';
    case 'blue':   return 'var(--wpf-blue, #2c6fd6)';
    case 'purple': return 'var(--wpf-ai-purple, #7a30e2)';
    case 'green':  return '#2c8a55';
    case 'amber':  return '#d59324';
    case 'teal':   return '#2a8a8e';
    case 'pink':   return '#c93874';
    default:       return name;
  }
}
