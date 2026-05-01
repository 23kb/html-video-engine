// Mid-video section title — "Step 2 · Customize settings".
//
// A compact cousin of title-card.js. Pairs naturally with `breakStyle:
// 'soft-dolly'` so there's a moment at 1× zoom where the title has room.
// Not a full-bleed card — it sits as a centered card over the stage with
// a subtle cream wash, so the underlying snapshot still reads.
//
// Authoring:
//   { do: 'sectionTitle', eyebrow: 'Step 2', title: 'Customize settings',
//     holdMs: 1400, accent: '#E27730' }

const STYLE_ID = 'section-title-styles';
const CSS = `
.st-root {
  position: fixed; inset: 0; z-index: 820;
  display: flex; align-items: center; justify-content: center;
  background: rgba(253, 246, 236, 0.55);
  backdrop-filter: blur(6px) saturate(110%);
  -webkit-backdrop-filter: blur(6px) saturate(110%);
  opacity: 0;
  transition: opacity 360ms cubic-bezier(.4,0,.2,1);
  pointer-events: none;
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
}
.st-root.in  { opacity: 1; }
.st-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 34px 64px;
  transform: translateY(14px) scale(0.98);
  transition: transform 520ms cubic-bezier(.2,.9,.3,1.05);
  will-change: transform;
}
.st-root.in .st-card { transform: translateY(0) scale(1); }
.st-eyebrow-row {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 18px;
}
.st-ebar { width: 30px; height: 1px; background: var(--st-accent, #c96320); opacity: 0.75; }
.st-eyebrow {
  font: 600 13px/1 'Inter', sans-serif;
  letter-spacing: 0.36em; text-transform: uppercase;
  color: var(--st-accent, #c96320);
}
.st-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 64px; font-weight: 400; line-height: 1.05;
  letter-spacing: -0.02em; color: #14110a;
  text-align: center;
  max-width: 960px;
}
.st-title .w {
  display: inline-block; margin: 0 0.12em;
  opacity: 0; transform: translateY(10px);
  transition: opacity 460ms ease, transform 520ms cubic-bezier(.2,.9,.3,1.05);
}
.st-root.in .st-title .w { opacity: 1; transform: translateY(0); }
.st-underline {
  display: block; margin-top: 8px; overflow: visible;
  width: min(640px, 78vw); height: 28px;
}
.st-underline path {
  fill: none; stroke: var(--st-accent, #c96320);
  stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

// Ensure Inter + Instrument Serif are available. title-card.js usually loads
// these for intro/outro, but section-title can fire before a title card has.
const FONT_LINK_ID = 'tc-fonts';
function ensureFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

/**
 * Show a section title for `holdMs` ms, then fade out.
 *
 * @param {object} opts
 * @param {string} opts.eyebrow   - Kicker line (e.g. "Step 2")
 * @param {string} opts.title     - Main line (e.g. "Customize settings")
 * @param {number} [opts.holdMs=1400]
 * @param {number} [opts.fadeInMs=360]
 * @param {number} [opts.fadeOutMs=420]
 * @param {string} [opts.accent]  - Override the eyebrow accent color
 */
export async function showSectionTitle(opts = {}) {
  const {
    eyebrow = '',
    title   = '',
    holdMs  = 1400,
    fadeInMs  = 360,
    fadeOutMs = 420,
    accent,
    underline = false,
    underlineD,
    underlineWidth = 3,
    underlineDuration = 900,
  } = opts;

  ensureFonts();
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'st-root';
  if (accent) root.style.setProperty('--st-accent', accent);

  const words = title.trim().split(/\s+/).filter(Boolean);
  const wordsHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');

  root.innerHTML = `
    <div class="st-card">
      ${eyebrow ? `
        <div class="st-eyebrow-row">
          <div class="st-ebar"></div>
          <div class="st-eyebrow">${eyebrow}</div>
          <div class="st-ebar"></div>
        </div>` : ''}
      <div class="st-title">${wordsHTML}</div>
      ${underline ? `
        <svg class="st-underline" viewBox="0 0 640 28" preserveAspectRatio="xMidYMid meet">
          <path d="${underlineD || 'M 20 14 C 140 4, 340 24, 620 12'}" stroke-width="${underlineWidth}"></path>
        </svg>` : ''}
    </div>
  `;

  // Stagger word reveal in addition to the container fade — letters lock in
  // one after another for a calmer, typed-in feel.
  const wEls = root.querySelectorAll('.st-title .w');
  wEls.forEach((el, i) => {
    el.style.transitionDelay = (60 + i * 70) + 'ms';
  });

  root.style.setProperty('transition', `opacity ${fadeInMs}ms cubic-bezier(.4,0,.2,1)`);
  document.body.appendChild(root);

  // Prime the underline stroke with its full length as dash/offset so it
  // animates in on cue. Must happen after the node is in the DOM so
  // getTotalLength returns a real number.
  const underlinePath = underline ? root.querySelector('.st-underline path') : null;
  let underlineLen = 0;
  if (underlinePath) {
    underlineLen = underlinePath.getTotalLength() || 0;
    underlinePath.style.strokeDasharray  = String(underlineLen);
    underlinePath.style.strokeDashoffset = String(underlineLen);
  }

  // Kick the transition.
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  root.classList.add('in');

  // Fire the underline concurrently with the word stagger so it lands
  // *while* the title is reading in — not after the words have drifted past.
  if (underlinePath) {
    const wordStaggerMs = 60 + (wEls.length - 1) * 70 + 460;
    const drawAfter = Math.max(200, wordStaggerMs - underlineDuration + 200);
    setTimeout(() => {
      underlinePath.style.transition =
        `stroke-dashoffset ${underlineDuration}ms cubic-bezier(.4,0,.2,1)`;
      underlinePath.style.strokeDashoffset = '0';
    }, drawAfter);
  }

  await new Promise(r => setTimeout(r, fadeInMs + 80));
  await new Promise(r => setTimeout(r, holdMs));

  root.style.setProperty('transition', `opacity ${fadeOutMs}ms cubic-bezier(.4,0,.2,1)`);
  root.classList.remove('in');
  await new Promise(r => setTimeout(r, fadeOutMs + 20));
  root.remove();
}
