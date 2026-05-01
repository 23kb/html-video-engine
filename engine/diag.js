// Diagnostics — central logger. Every primitive that touches geometry,
// selectors, or camera should emit a breadcrumb here so when a beat
// misbehaves we can read exactly what the system decided and why.
//
// Design: single tagged console.log stream, prefixed with a phase tag so
// filtering by `[focus]` / `[resolve]` / `[highlight]` / `[click]` works.
// Logs are cheap; silence them in prod by flipping DIAG.enabled = false.
//
// Also mirrors every log to an in-page ring buffer (last 200 entries) so
// the HUD / bug report can dump it without needing DevTools open.

const DIAG = {
  enabled: true,
  buffer: [],
  max: 200,
  subs: new Set(),
};

function notify() {
  for (const fn of DIAG.subs) { try { fn(DIAG.buffer); } catch {} }
}

export function subscribeDiag(fn) {
  DIAG.subs.add(fn);
  return () => DIAG.subs.delete(fn);
}

function stamp() {
  const d = new Date();
  return d.toTimeString().slice(0,8) + '.' + String(d.getMilliseconds()).padStart(3,'0');
}

export function diag(tag, msg, data) {
  if (!DIAG.enabled) return;
  const entry = { t: stamp(), tag, msg, data: data ?? null };
  DIAG.buffer.push(entry);
  if (DIAG.buffer.length > DIAG.max) DIAG.buffer.shift();
  // Group-friendly console output with data inline.
  if (data !== undefined) console.log(`%c[${tag}]%c ${msg}`, 'color:#E27730;font-weight:600', '', data);
  else                    console.log(`%c[${tag}]%c ${msg}`, 'color:#E27730;font-weight:600', '');
  notify();
}

export function diagError(tag, err, context) {
  const entry = { t: stamp(), tag, msg: 'ERROR: ' + (err?.message || String(err)), data: { context, stack: err?.stack } };
  DIAG.buffer.push(entry);
  if (DIAG.buffer.length > DIAG.max) DIAG.buffer.shift();
  console.error(`%c[${tag}]%c ${entry.msg}`, 'color:#ff5a5a;font-weight:700', '', { context, error: err });
  notify();
}

export function diagDump() {
  return DIAG.buffer.slice();
}

// ── Verb-scoped breadcrumbs ────────────────────────────────────────────────
// Phase 5 debug-loop contract: every verb logs start/end/error with its
// full step payload + chapter/snapshot context. errorReport consumes these
// via diagDump(). Tags are stable strings so console filtering works.
export function verbStart(ctx) {
  diag('verb:start', ctx.chapterSlug + ' :: ' + ctx.step.id + ' (' + ctx.step.do + ')', {
    chapter: ctx.chapterSlug,
    snapshot: ctx.snapshot,
    step: ctx.step,
  });
}
export function verbEnd(ctx, ms) {
  diag('verb:end', ctx.chapterSlug + ' :: ' + ctx.step.id + ' ok (' + ms + 'ms)', null);
}
export function verbErrorCrumb(ctx, err) {
  diagError('verb:error', err, {
    chapter: ctx.chapterSlug,
    snapshot: ctx.snapshot,
    step: ctx.step,
  });
}

// Snapshot of iframe state for context dumps.
export function iframeState() {
  const f = document.querySelector('iframe.ui');
  if (!f) return { mounted: false };
  const win = f.contentWindow;
  return {
    mounted: true,
    size: { w: f.offsetWidth, h: f.offsetHeight },
    scroll: { x: win?.scrollX ?? 0, y: win?.scrollY ?? 0 },
    ready: f.contentDocument?.readyState,
  };
}

// Install a global last-resort error catcher so any unhandled exception
// in beat code lands in the buffer (and console) with full context.
export function installGlobalErrorLogger() {
  window.addEventListener('error', e => {
    diagError('window.onerror', e.error || e.message, { src: e.filename, line: e.lineno });
  });
  window.addEventListener('unhandledrejection', e => {
    diagError('unhandledrejection', e.reason, {});
  });
}
