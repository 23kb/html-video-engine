// Runtime-owned editorial text primitive + configurable theme system.
//
// Shared tutorial default (Modes A + B):
//   fonts.display = Satoshi         → headline / eyebrow (emphasis)
//   fonts.body    = General Sans    → caption  / callout (instructional)
//   presets       = top-down-letters / focus-blur-resolve / mask-reveal-up / spring-scale-in
//
// Mode C may opt into its own profile via configureEditorial({theme:'mode-c', ...})
// — same verbs, different art direction, theme layer only.
//
// Override order (merged L→R inside configureEditorial):
//   1. built-in runtime defaults (this file)
//   2. per-video manifest `editorial:` block (threaded by chapter-runner)
//   3. per-beat overrides on the step itself (step.preset / step.position /
//      step.role — handled in the verb, not here)
//
// Authors never touch verb code to re-theme. Fonts/presets/positions are
// fully data-driven past step 1.

const BUILTIN_THEMES = {
  'tutorial-default': {
    fonts:  { display: 'Satoshi', body: 'General Sans' },
    colors: { display: '#1a1a1a', body: '#333333' },
    fontImports: [
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&f[]=general-sans@400,500,600,700&display=swap',
    ],
  },
  'mode-c': {
    // Mode C divergence profile. Same verbs, different art direction.
    // Display family is Mode C's signature serif; body falls back to
    // General Sans so instructional text still reads cleanly.
    fonts:  { display: 'Instrument Serif', body: 'General Sans' },
    colors: { display: '#14161C', body: '#333333' },
    fontImports: [
      'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap',
      'https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap',
    ],
  },
};

// Runtime defaults — merged with whatever tutorial-default ships.
const DEFAULTS = {
  theme: 'tutorial-default',
  fonts:  { display: 'Satoshi', body: 'General Sans' },
  colors: { display: '#1a1a1a', body: '#333333' },
  presets: {
    animateText:  'top-down-letters',
    eyebrow:      'focus-blur-resolve',
    captionLine:  'mask-reveal-up',
    calloutLabel: 'spring-scale-in',
  },
  positions: {
    animateText:  { left: '50%', top: '18vh', transform: 'translateX(-50%)' },
    eyebrow:      { left: '50%', top: '8vh',  transform: 'translateX(-50%)' },
    captionLine:  { left: '50%', bottom: '10vh', transform: 'translateX(-50%)' },
    // calloutLabel is anchor-relative by contract — no fixed default position.
  },
  // Role → family bucket. Headline + eyebrow use display; caption + callout
  // use body. Authors can flip per beat with step.role.
  roleFamily: {
    headline: 'display',
    eyebrow:  'display',
    caption:  'body',
    callout:  'body',
  },
};

// Live config. Mutated by configureEditorial; read by getEditorialConfig.
let STATE = clone(DEFAULTS);

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mergeDeep(dst, src) {
  if (!src) return dst;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      dst[k] = mergeDeep(dst[k] && typeof dst[k] === 'object' ? dst[k] : {}, src[k]);
    } else {
      dst[k] = src[k];
    }
  }
  return dst;
}

const CSS = `
.wpf-et {
  position: fixed; z-index: 900; pointer-events: none;
  white-space: pre; display: inline-block;
  line-height: 1.2;
  text-shadow: 0 1px 0 rgba(255,255,255,0.85);
}
/* Role → family + color via CSS custom properties. Families AND colors are
   set at runtime by configureEditorial so swapping a theme doesn't require
   touching CSS. Display roles read --wpf-et-color-display; body roles read
   --wpf-et-color-body. */
.wpf-et.family-display { font-family: var(--wpf-et-display, 'Inter'), -apple-system, sans-serif;
                         color: var(--wpf-et-color-display, #1a1a1a); }
.wpf-et.family-body    { font-family: var(--wpf-et-body,    'Inter'), -apple-system, sans-serif;
                         color: var(--wpf-et-color-body,    #333333); }

.wpf-et.role-headline { font-weight: 600; font-size: 34px; letter-spacing: -0.01em; }
.wpf-et.role-eyebrow  { font-weight: 600; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; }
.wpf-et.role-caption  { font-weight: 500; font-size: 17px; }
.wpf-et.role-callout  {
  font-weight: 600; font-size: 13px;
  background: rgba(255,255,255,0.97);
  padding: 5px 9px; border-radius: 5px;
  box-shadow: 0 4px 12px rgba(20,22,28,0.16);
  text-shadow: none;
}

.wpf-et .mask { display:inline-block;overflow:hidden;vertical-align:baseline;
  padding:0.12em 0;margin:-0.12em 0;line-height:inherit; }
.wpf-et .ch { display:inline-block; will-change: transform; }

.wpf-et.p-mask-reveal-up .ch {
  transform: translate3d(0,110%,0);
  transition: transform 680ms cubic-bezier(0.22,1,0.36,1);
}
.wpf-et.p-mask-reveal-up.in .ch { transform: translate3d(0,0,0); }

.wpf-et.p-top-down-letters .ch {
  transform: translate3d(0,-110%,0);
  transition: transform 820ms cubic-bezier(0.22,1,0.36,1);
}
.wpf-et.p-top-down-letters.in .ch { transform: translate3d(0,0,0); }

.wpf-et.p-focus-blur-resolve {
  filter: blur(10px); opacity: 0;
  transition: filter 700ms ease-out, opacity 500ms ease-out;
}
.wpf-et.p-focus-blur-resolve.in { filter: blur(0); opacity: 1; }

.wpf-et.p-spring-scale-in {
  transform-origin: center center;
  transform: scale(0.72); opacity: 0;
  transition:
    transform 520ms cubic-bezier(0.34,1.56,0.64,1),
    opacity 220ms ease-out;
}
.wpf-et.p-spring-scale-in.in { transform: scale(1); opacity: 1; }

.wpf-et.out {
  opacity: 0; transform: translate3d(0,-8px,0);
  transition: opacity 260ms ease-in, transform 260ms ease-in;
  transition-delay: 0ms !important; filter: none;
}
`;

function ensureStyles() {
  if (document.getElementById('wpf-et-style')) return;
  const s = document.createElement('style');
  s.id = 'wpf-et-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function loadFontImports(urls) {
  for (const url of urls || []) {
    const id = 'wpf-et-font-' + btoa(url).replace(/[^a-z0-9]/gi, '').slice(0, 20);
    if (document.getElementById(id)) continue;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = url;
    document.head.appendChild(l);
  }
}

function applyThemeToRoot() {
  const r = document.documentElement.style;
  r.setProperty('--wpf-et-display', '"' + STATE.fonts.display + '"');
  r.setProperty('--wpf-et-body',    '"' + STATE.fonts.body    + '"');
  r.setProperty('--wpf-et-color-display', STATE.colors.display);
  r.setProperty('--wpf-et-color-body',    STATE.colors.body);
}

/**
 * Merge a config layer into the live editorial state. Intended call sites:
 *   • runtime boot: configureEditorial(BUILTIN_THEMES['tutorial-default'])
 *     — already handled automatically when mountAnimateText first runs.
 *   • chapter-runner: configureEditorial(manifest.editorial) before play.
 * Accepts { theme, fonts, fontImports, presets, positions, roleFamily }.
 * If `theme` names a built-in, that theme's fonts+imports seed first, then
 * the rest of the passed config overrides on top.
 */
export function configureEditorial(cfg = {}) {
  ensureStyles();
  // Theme preset seed.
  if (cfg.theme && BUILTIN_THEMES[cfg.theme]) {
    mergeDeep(STATE, BUILTIN_THEMES[cfg.theme]);
    STATE.theme = cfg.theme;
  }
  // Explicit overrides.
  mergeDeep(STATE, cfg);
  loadFontImports(STATE.fontImports);
  applyThemeToRoot();
  document.body.classList.toggle('editorial-theme-mode-c', STATE.theme === 'mode-c');
}

/** Read the resolved config for a given verb. Used by the verb implementations. */
export function getEditorialConfig(verbName) {
  return {
    theme: STATE.theme,
    preset:   STATE.presets[verbName]   || null,
    position: STATE.positions[verbName] || null,
    roleFamily: STATE.roleFamily,
    fonts:  STATE.fonts,
    colors: STATE.colors,
  };
}

// Auto-boot with tutorial-default the first time mountAnimateText runs so
// callers that never touch configureEditorial still get Satoshi/General Sans.
let booted = false;
function ensureBooted() {
  if (booted) return;
  booted = true;
  configureEditorial({ theme: 'tutorial-default' });
}

const PER_CHAR_PRESETS = new Set(['mask-reveal-up', 'top-down-letters']);

/**
 * Mount an editorial line. Returns { el, show, exit }. `preset` / `role` /
 * `position` all resolve against the live config — pass overrides explicitly
 * to break free of the theme.
 */
export function mountAnimateText(text, {
  preset = 'mask-reveal-up',
  role = 'headline',
  position = null,
  stagger = 28,
  color = null,
} = {}) {
  ensureBooted();

  const family = STATE.roleFamily[role] || 'display';
  const wrap = document.createElement('div');
  wrap.className = 'wpf-et role-' + role + ' family-' + family + ' p-' + preset;
  if (color) wrap.style.color = color;
  if (position) {
    if (position.left   != null) wrap.style.left   = position.left;
    if (position.right  != null) wrap.style.right  = position.right;
    if (position.top    != null) wrap.style.top    = position.top;
    if (position.bottom != null) wrap.style.bottom = position.bottom;
    if (position.transform) wrap.style.transform = position.transform;
  }

  let settleMs;
  if (PER_CHAR_PRESETS.has(preset)) {
    const chars = [...text];
    chars.forEach((c, i) => {
      const mask = document.createElement('span');
      mask.className = 'mask';
      const span = document.createElement('span');
      span.className = 'ch';
      span.innerHTML = c === ' ' ? '&nbsp;' : c;
      span.style.transitionDelay = (i * stagger) + 'ms';
      mask.appendChild(span);
      wrap.appendChild(mask);
    });
    settleMs = chars.length * stagger + 820;
  } else {
    wrap.textContent = text;
    settleMs = preset === 'focus-blur-resolve' ? 720 : 540;
  }

  document.body.appendChild(wrap);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function show() {
    await sleep(40);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
    await sleep(settleMs);
    return wrap;
  }
  async function exit({ ms = 260 } = {}) {
    wrap.classList.remove('in');
    wrap.classList.add('out');
    await sleep(ms);
    wrap.remove();
  }
  return { el: wrap, show, exit };
}

/** Legacy shim kept so older call sites don't break. Prefer configureEditorial. */
export function setEditorialTheme(theme) { configureEditorial({ theme }); }
