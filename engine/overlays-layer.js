// Overlay DOM layer — the ONLY place that draws highlights, instructions,
// ripples. Every renderer reads from runtime/overlays-config.js so changing
// one value there changes every video, every beat, every test.
//
// Public API:
//   installOverlayStyles()           — call once after loadSnapshot
//   showHighlight(sel, opts)         — ring around an element (fatter + glow)
//   hideHighlight()                  — clear rings
//   showInstruction(sel, text, opts) — arrow + labeled pill pointing at element
//   hideInstruction()                — clear arrow + label
//   ripple()                         — orange ripple at current cursor tip
//
// Intentionally no hardcoded visual values — everything flows from config.

import { highlight as engineHighlight, pointer as enginePointer, clearHighlights, sleep } from './engine.js';
import { OVERLAYS_CONFIG, cfgHighlight, cfgRipple, cfgInstruction } from '../runtime/overlays-config.js';
import { diag, diagError } from './diag.js';

const STYLE_ID = 'overlays-layer-css';

function cssFromConfig() {
  const h = cfgHighlight();
  const r = cfgRipple();
  const i = cfgInstruction();
  const dimPart = h.backdropDim ? `, 0 0 0 9999px ${h.backdropDim}` : '';
  const fadeMs = h.fadeMs ?? 700;
  const vignetteDrop = h.dropVignette
    ? `.hl {
         box-shadow: ${h.glow}${dimPart} !important;
         transition: opacity ${fadeMs}ms ease,
                     left 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                     top   0.55s cubic-bezier(0.22, 1, 0.36, 1),
                     width 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                     height 0.55s cubic-bezier(0.22, 1, 0.36, 1) !important;
       }`
    : '';
  return `
    /* Highlight ring — hairline + soft glow (clean-minimal aesthetic). */
    .hl {
      border: ${h.ringWidth}px solid ${h.color} !important;
      border-radius: ${h.radius}px !important;
      transition: box-shadow .22s ease, border-color .22s ease !important;
    }
    ${vignetteDrop}

    /* Cursor click ripple. */
    .cursor-ripple {
      position: absolute;
      width: ${r.size}px; height: ${r.size}px;
      border-radius: 50%;
      border: 1.5px solid ${r.borderColor};
      background: ${r.fillColor};
      pointer-events: none; z-index: 19;
      opacity: 0; transform: translate(-50%,-50%) scale(0.3);
    }
    .cursor-ripple.on { animation: cursorRipple ${r.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    @keyframes cursorRipple {
      0%   { opacity: 1;    transform: translate(-50%,-50%) scale(0.25); }
      60%  { opacity: 0.45; transform: translate(-50%,-50%) scale(1.6);  }
      100% { opacity: 0;    transform: translate(-50%,-50%) scale(2.4);  }
    }

    /* Instruction labels — glass card with orange accent bar. Applies to
       both .pointer-label (arrow pairings) and .label (highlight pairings),
       since both carry instruction text and should read identically.
       !important because engine's built-in styles set the base. */
    .pointer-label, .label {
      background: ${i.bg} !important;
      color: ${i.fg} !important;
      font: ${i.font} !important;
      padding: ${i.padY}px ${i.padX}px ${i.padY}px ${i.padX + 4}px !important;
      border-left: 3px solid ${i.accent} !important;
      border-radius: ${i.radius}px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06) !important;
      backdrop-filter: blur(8px) saturate(140%);
      -webkit-backdrop-filter: blur(8px) saturate(140%);
    }
    /* Engine's .label::before is a white triangle on orange — in the glass
       world it would look like a misaligned artifact. Hide it. */
    .label::before { display: none !important; }
    /* Engine's pointer triangle uses ::before/::after colors. Override
       to match the accent, and shrink to the configured arrow size. */
    .pointer { --ptr-size: ${i.arrowSize}px; }

    /* Per-char label write-on. The JS below wraps each character in
       .wo-char spans and toggles .wo-ready to release the stagger. */
    .pointer-label .wo-char, .label .wo-char {
      display: inline-block;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
      transition-delay: var(--wo-delay, 0ms);
    }
    .pointer-label.wo-ready .wo-char, .label.wo-ready .wo-char {
      opacity: 1;
      transform: translateY(0);
    }
  `;
}

// Wrap each character of a label in a span with a staggered delay, then
// flip .wo-ready on the label to trigger the CSS transition. Spaces get
// zero delay (word breaks read naturally). Skipped if the label node is
// missing — this is best-effort polish, not critical path.
export function animateLabelWriteOn(labelEl, { stepMs } = {}) {
  if (!labelEl || labelEl.__woDone) return;
  const i = cfgInstruction();
  const step = stepMs ?? i.writeOnStep ?? 22;
  const text = labelEl.textContent || '';
  if (!text) return;
  labelEl.textContent = '';
  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx];
    const s = document.createElement('span');
    s.className = 'wo-char';
    s.textContent = ch === ' ' ? '\u00a0' : ch;
    s.style.setProperty('--wo-delay', (idx * step) + 'ms');
    labelEl.appendChild(s);
  }
  labelEl.__woDone = true;
  // Force layout before flipping class so the stagger plays cleanly.
  void labelEl.offsetWidth;
  labelEl.classList.add('wo-ready');
}

export function installOverlayStyles() {
  let s = document.getElementById(STYLE_ID);
  if (!s) {
    s = document.createElement('style');
    s.id = STYLE_ID;
    document.head.appendChild(s);
  }
  s.textContent = cssFromConfig();
}

// ── Highlight ───────────────────────────────────────────────────────────────
export async function showHighlight(sel, opts = {}) {
  const h = cfgHighlight();
  const padX = opts.padX ?? h.padX;
  const padY = opts.padY ?? h.padY;
  const pad = Math.max(padX, padY);
  const sels = Array.isArray(sel) ? sel : [sel];
  const tag = sels.join(', ').slice(0, 80);
  diag('highlight', `ring on ${tag}`, { pad, label: opts.label || null, count: sels.length });
  try {
    await engineHighlight(sels, { label: opts.label || '', pad, fadeIn: opts.fadeIn ?? h.fadeIn });
  } catch (e) {
    diagError('highlight', e, { sel: sels });
    throw e;
  }
  // Write-on: find the label engine just mounted and stagger its chars.
  // Engine has already kicked off the parent fade; this layers the
  // per-char reveal on top. Best-effort — no-op if label element absent.
  if (opts.label) {
    const labels = document.querySelectorAll('.overlay .label');
    animateLabelWriteOn(labels[labels.length - 1]);
  }
}

export function hideHighlight() {
  clearHighlights();
}

// ── Instruction (arrow + label) ─────────────────────────────────────────────
export async function showInstruction(sel, text, opts = {}) {
  const i = cfgInstruction();
  const direction = opts.direction || i.defaultDirection;
  diag('instruction', `"${text}" → ${sel.slice(0,60)} (${direction})`);
  try {
    await enginePointer(sel, {
      direction,
      // The caller (clickOn) already renders the big highlight label; passing
      // text here would draw a second smaller pointer-label right next to it.
      // Keep the arrow only; highlight carries the text.
      label: '',
      size: opts.size ?? i.arrowSize,
      gap: opts.gap ?? i.gap,
      // Arrow uses the accent color (orange) — bg (white glass) is for the
      // label card, not the pointer triangle.
      color: opts.color ?? i.accent,
    });
  } catch (e) {
    diagError('instruction', e, { sel, text, direction });
    throw e;
  }
  if (opts.dwell ?? true) {
    await sleep(opts.dwellMs ?? i.dwellMs);
  }
}

export function hideInstruction() {
  clearHighlights(); // engine bundles pointer/label cleanup into clearHighlights
}

// ── Ripple ──────────────────────────────────────────────────────────────────
export async function ripple() {
  const cur = document.querySelector('.cursor');
  const overlay = document.querySelector('.overlay');
  if (!cur || !overlay) return;
  const el = document.createElement('div');
  el.className = 'cursor-ripple';
  const cx = parseFloat(cur.style.left || '0') + 4;
  const cy = parseFloat(cur.style.top  || '0') + 2;
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  overlay.appendChild(el);
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(() => el.remove(), cfgRipple().durationMs - 60);
}
