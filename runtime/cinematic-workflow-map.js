// Cinematic post-intro archetype: workflow-map.
//
// Spec: runtime/cinematic-specs.js → workflow-map-default.
// Contract: docs/cinematic-spec-contract.md.
//
// Three glass chips ("Form Submitted" → "Notification Fires" → "Email Lands")
// reveal in sequence with a calm spring-out. Connector lines draw between
// them via runtime/line-draw.js — viewBox matches the viewport so chip rects
// translate 1:1 to SVG coordinates. Final caption appears below.
//
// Apple-product cadence: long ease-outs, no tutorial-snappy easings, lots of
// negative space. Uses cool-paper as the default theme so the moment reads
// as "system-level" rather than "transactional."
//
// Lifecycle contract: mount(opts) → { root, animPromise, dismiss }.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap }     from './cinematic-kit/gsap-loader.js';
import { mountCaption } from './cinematic-kit/text.js';
import { lineDraw }     from './line-draw.js';

const STYLE_ID = 'cwm-styles';

// Inline SVG icon set. Plain stroke icons keep the visual language quiet —
// no filled glyphs, no color coding beyond the accent currentColor.
const ICONS = {
  form: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2"/>
      <path d="M9 8h6M9 12h6M9 16h4"/>
    </svg>`,
  gear: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>
    </svg>`,
  envelope: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2"/>
      <polyline points="3 7 12 13 21 7"/>
    </svg>`,
};

const CSS = `
.cwm-root {
  position: fixed; inset: 0; z-index: 600;
  font-family: -apple-system, 'Segoe UI', Roboto, 'Inter', sans-serif;
  color: #444444;
  opacity: 0; transition: opacity .55s ease;
  overflow: hidden;
}
.cwm-root.on   { opacity: 1; }
.cwm-root.exit { opacity: 0; transition: opacity .5s ease; }

.cwm-stage {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}

/* Connector layer sits behind the chips so chips render on top of lines. */
.cwm-arrows {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 5;
}
.cwm-arrows svg { display: block; }

.cwm-chips {
  position: relative;
  display: flex; align-items: stretch;
  gap: clamp(40px, 6vw, 88px);
  z-index: 10;
}

.cwm-chip {
  position: relative;
  width: clamp(150px, 17vw, 210px);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 14px;
  padding: 18px 18px 16px;
  box-shadow: var(--cwm-card-shadow, 0 18px 36px rgba(20,22,28,0.10));
  border: 1px solid rgba(20, 22, 28, 0.05);
  display: flex; flex-direction: column; gap: 10px;
  text-align: left;
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  will-change: transform, opacity;
}
.cwm-chip .icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: var(--cwm-accent-soft, rgba(5, 106, 171, 0.10));
  display: flex; align-items: center; justify-content: center;
  color: var(--cwm-accent, #056AAB);
}
.cwm-chip .icon svg { width: 18px; height: 18px; display: block; }
.cwm-chip .step {
  font: 600 10px/1 -apple-system, sans-serif;
  color: var(--cwm-accent, #056AAB);
  letter-spacing: 0.16em; text-transform: uppercase;
}
.cwm-chip .label {
  font: 500 14px/1.32 -apple-system, sans-serif;
  color: #444444;
  letter-spacing: -0.005em;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Convert '#RRGGBB' → 'rgba(r,g,b,a)' for the soft icon-tray background.
function softAccent(hex, alpha = 0.12) {
  const m = /^#?([a-f\d]{6})$/i.exec(hex || '');
  if (!m) return 'rgba(5, 106, 171, ' + alpha + ')';
  const v = m[1];
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Mount the workflow-map cinematic.
 *
 * @param {object} opts
 * @param {object} [opts.theme]
 * @param {string} [opts.theme.background] — 'cool-paper' (default) | 'warm-cream' | 'neutral-fog'
 * @param {string} [opts.theme.accent]     — single accent color (default '#056AAB')
 * @param {number} [opts.duration]         — total seconds, default ~7
 * @param {Array<{id?:string, icon?:string, label:string}>} [opts.chips]
 *   — chip data; default is the spec's three Notifications chips.
 * @returns {Promise<{root: HTMLElement, animPromise: Promise<void>, dismiss: () => Promise<void>}>}
 */
export async function mount(opts = {}) {
  ensureStyles();
  const gsap = await loadGsap();

  const theme  = resolveTheme(opts.theme, 'cool-paper');
  const accent = (opts.theme && opts.theme.accent) || '#056AAB';
  const totalDuration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 7;

  const chips = (opts.chips && opts.chips.length) ? opts.chips : [
    { id: 'chip-1', icon: 'form',     label: 'Form Submitted'    },
    { id: 'chip-2', icon: 'gear',     label: 'Notification Fires' },
    { id: 'chip-3', icon: 'envelope', label: 'Email Lands'        },
  ];

  const root = document.createElement('div');
  root.className = 'cwm-root';
  root.style.background = theme.background;
  root.style.setProperty('--cwm-card-shadow', theme.cardShadow);
  root.style.setProperty('--cwm-accent', accent);
  root.style.setProperty('--cwm-accent-soft', softAccent(accent, 0.12));

  const chipsHTML = chips.map((c, i) => {
    const iconKey = (c.icon && ICONS[c.icon]) ? c.icon : 'form';
    return `
      <div class="cwm-chip" data-chip="${i}">
        <div class="icon">${ICONS[iconKey]}</div>
        <div class="step">Step ${i + 1}</div>
        <div class="label">${escapeHTML(c.label)}</div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="cwm-stage">
      <div class="cwm-arrows" data-role="arrows"></div>
      <div class="cwm-chips">
        ${chipsHTML}
      </div>
    </div>
  `;
  document.body.appendChild(root);
  await sleep(20);
  root.classList.add('on');

  const stage       = root.querySelector('.cwm-stage');
  const arrowsLayer = root.querySelector('.cwm-arrows');
  const chipEls     = [...root.querySelectorAll('.cwm-chip')];

  // Initial chip states. Spring-in via cubic-bezier(0.34, 1.56, 0.64, 1).
  for (const el of chipEls) {
    gsap.set(el, { opacity: 0, scale: 0.86, y: 8 });
  }

  let aborted = false;
  let captionHandle = null;
  const arrowHandles = [];

  function tweenP(target, vars) {
    return new Promise((resolve) => gsap.to(target, { ...vars, onComplete: resolve }));
  }

  async function springInChip(idx) {
    if (aborted || !chipEls[idx]) return;
    await tweenP(chipEls[idx], {
      opacity: 1, scale: 1, y: 0,
      duration: 0.7,
      ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
  }

  async function drawArrow(fromIdx, toIdx) {
    if (aborted) return null;
    const a  = chipEls[fromIdx].getBoundingClientRect();
    const b  = chipEls[toIdx].getBoundingClientRect();
    const sR = stage.getBoundingClientRect();
    // 8px gap on each side keeps the line off the chip edge.
    const x1 = a.right - sR.left + 8;
    const y1 = a.top   - sR.top  + a.height / 2;
    const x2 = b.left  - sR.left - 8;
    const y2 = b.top   - sR.top  + b.height / 2;
    const d = `M ${x1} ${y1} L ${x2} ${y2}`;
    const handle = await lineDraw({
      d,
      stroke: accent,
      width: 2.4,
      duration: 700,
      holdMs: 0,
      parent: arrowsLayer,
      vw: window.innerWidth,
      vh: window.innerHeight,
      linecap: 'round',
    });
    arrowHandles.push(handle);
    try { await handle.done; } catch (_) { /* tolerate */ }
    return handle;
  }

  async function timeline() {
    // Phase 1 — backdrop already fading via CSS; let it settle quietly.
    await sleep(420);
    if (aborted) return;

    // Phase 2 — chip 1 spring-in
    await springInChip(0);
    if (aborted) return;
    await sleep(260);
    if (aborted) return;

    // Phase 3 — line 1 → 2
    await drawArrow(0, 1);
    if (aborted) return;
    await sleep(140);
    if (aborted) return;

    // Phase 4 — chip 2 spring-in
    await springInChip(1);
    if (aborted) return;
    await sleep(260);
    if (aborted) return;

    // Phase 5 — line 2 → 3
    await drawArrow(1, 2);
    if (aborted) return;
    await sleep(140);
    if (aborted) return;

    // Phase 6 — chip 3 spring-in
    await springInChip(2);
    if (aborted) return;
    await sleep(440);
    if (aborted) return;

    // Phase 7 — caption
    captionHandle = mountCaption('A submission becomes the right email.', {
      color: '#444444',
    });
    captionHandle.show();

    // Hold the moment until the requested duration is satisfied.
    // Approximate elapsed: 420 + 700 + 260 + 700 + 140 + 700 + 260 + 700 + 140 + 700 + 440 ≈ 5160ms.
    const elapsedMs = 5160;
    const tail = Math.max(900, totalDuration * 1000 - elapsedMs);
    await sleep(tail);
  }

  const animPromise = timeline();

  let dismissed = false;
  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try { gsap.killTweensOf(chipEls); } catch (_) { /* tolerate */ }
    if (captionHandle) {
      try { await captionHandle.exit({ ms: 240 }); } catch (_) { /* gone */ }
      captionHandle = null;
    }
    for (const h of arrowHandles) {
      try { h.dismiss(); } catch (_) { /* tolerate */ }
    }
    arrowHandles.length = 0;
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(520);
    root.remove();
  }

  return { root, animPromise, dismiss };
}
