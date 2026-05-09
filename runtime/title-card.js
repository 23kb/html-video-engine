// Hyperframes-style intro / outro title card.
// Extracted from scenes/intro.html + scenes/outro.html — same GSAP timeline,
// parameterized by content. Caller mounts, awaits, card self-cleans.
//
// Usage:
//   await playTitleCard({
//     role: 'intro',
//     logo: { kind: 'video', src: '/assets/logo-animated.mp4' },
//     eyebrow: 'WPForms · Tutorial',
//     title: 'Form Notifications',
//     subtitleHTML: 'Send the right email to the <span class="tc-accent">right person</span> — every time your form is submitted.',
//     meta: { chapter: '01', label: 'Intro' },
//     hold: 3.5,
//   });

const CSS = `
.tc-root {
  position: fixed; inset: 0; z-index: 900;
  background: #fbf4e3;
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  color: #1e1410;
  overflow: hidden;
}
.tc-root .tc-bg-base {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 45%, #fcf6e7 0%, #f6edd4 70%, #eadfc0 100%);
}
.tc-root .tc-bg-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(110,70,15,0.12) 100%);
}
.tc-root canvas.tc-dust { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
.tc-root .tc-sweep {
  position: absolute; top: 0; bottom: 0; width: 60%;
  pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(255,210,150,0.5) 45%, rgba(255,210,150,0.5) 55%, transparent 100%);
  filter: blur(40px); mix-blend-mode: screen;
  transform: translateX(-120%); opacity: 0;
}
.tc-root .tc-wrap {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 0 8vw;
  will-change: transform, filter;
}
.tc-root .tc-logo {
  margin-bottom: 40px;
  display: flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 22px 60px rgba(226,119,48,0.32)) drop-shadow(0 4px 12px rgba(0,0,0,0.08));
  will-change: transform, opacity, filter;
}
.tc-root .tc-logo.video { width: 240px; height: 170px; }
.tc-root .tc-logo.image { width: 180px; height: 180px; margin-bottom: 38px; }
.tc-root .tc-logo video { width: 100%; height: 100%; object-fit: contain; }
.tc-root .tc-logo img   { width: 160px; height: auto; object-fit: contain; }

.tc-root .tc-eyebrow-row {
  display: flex; align-items: center; gap: 18px;
  margin-bottom: 26px;
}
.tc-root .tc-ebar { width: 40px; height: 1px; background: #c96320; transform-origin: left center; }
.tc-root .tc-ebar.right { transform-origin: right center; }
.tc-root .tc-eyebrow {
  font: 600 15px/1 'Inter', sans-serif;
  letter-spacing: 0.38em; text-transform: uppercase; color: #c96320;
  display: inline-block;
}

.tc-root .tc-title {
  font-family: 'Instrument Serif', 'Georgia', serif;
  font-weight: 400; line-height: 1.02; letter-spacing: -0.025em;
  color: #14110a; max-width: 1400px;
}
.tc-root.intro .tc-title { font-size: 156px; }
.tc-root.outro .tc-title { font-size: 168px; }
.tc-root .tc-title .w { display: inline-block; margin: 0 0.14em; position: relative; will-change: transform, opacity, filter, background-position; }
.tc-root .tc-title .w.italic { font-style: italic; color: #2a1f0a; }
.tc-root .tc-title .w.is-gradient {
  background: linear-gradient(90deg,
    #14110a 0%, #14110a 12%,
    #5a3215 22%, #E27730 38%, #f0a040 55%, #2a8a7c 72%,
    #14110a 88%, #14110a 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 300% 100%; background-position: 100% 0;
}

.tc-root .tc-subtitle {
  font: 400 26px/1.45 'Inter', sans-serif; color: #4c3a32;
  max-width: 820px; margin-top: 36px;
}
.tc-root.outro .tc-subtitle { font-size: 28px; max-width: 860px; margin-top: 40px; }
.tc-root .tc-subtitle .tc-accent { color: #c96320; font-weight: 500; }
.tc-root .tc-subtitle .tc-url { color: #c96320; font-weight: 500; border-bottom: 1px solid rgba(201,99,32,0.4); padding-bottom: 2px; }

.tc-root .tc-meta {
  position: absolute; bottom: 48px; left: 52px;
  font: 500 13px/1 'Inter', sans-serif;
  letter-spacing: 0.24em; text-transform: uppercase;
  color: rgba(30,20,16,0.55);
  display: flex; align-items: center; gap: 14px;
}
.tc-root .tc-meta .tick { width: 6px; height: 6px; border-radius: 50%; background: #E27730; }
.tc-root .tc-meta .sep { width: 24px; height: 1px; background: rgba(30,20,16,0.3); }

.tc-root .tc-signoff {
  position: absolute; bottom: 48px; right: 52px;
  font-family: 'Instrument Serif', serif; font-style: italic;
  font-size: 22px; color: rgba(30,20,16,0.55);
}
`;

const FONT_LINK_ID = 'tc-fonts';
function ensureFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

const STYLE_ID = 'tc-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

let gsapReady = null;
function loadGsap() {
  if (window.gsap) return Promise.resolve(window.gsap);
  if (gsapReady) return gsapReady;
  gsapReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // Vendored core (matches videos/_shared/kit.js loader path).
    // Was: https://unpkg.com/gsap@3/dist/gsap.min.js — CDN dependency
    // removed in core-factors step 11.
    s.src = '/vendor/gsap/3.15.0/gsap.min.js';
    s.onload = () => resolve(window.gsap);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsapReady;
}

function startDust(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = innerWidth  * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width  = innerWidth  + 'px';
  canvas.style.height = innerHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const N = 70;
  const particles = Array.from({ length: N }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: 0.6 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 0.15,
    vy: -0.05 - Math.random() * 0.12,
    a: 0.15 + Math.random() * 0.45,
    hue: Math.random() < 0.5 ? '255, 180, 110' : '255, 210, 160',
  }));

  let stopped = false;
  function frame() {
    if (stopped) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random() * innerWidth; }
      if (p.x < -10) p.x = innerWidth + 10;
      if (p.x > innerWidth + 10) p.x = -10;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.hue},${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
  return () => { stopped = true; };
}

export async function playTitleCard(opts) {
  if (opts.variant === 'sullie-system') {
    return playSullieSystemTitleCard(opts);
  }

  if (opts.variant === 'editorial-v4') {
    return playEditorialV4Outro(opts);
  }

  const {
    role = 'intro',
    logo = { kind: 'image', src: '/assets/wpforms-logo.png' },
    eyebrow = '',
    title = '',
    subtitleHTML = '',
    meta = null,          // { chapter: '01', label: 'Intro' }
    signoff = null,       // string for outro corner mark
    hold = 3.5,
  } = opts;

  ensureFonts();
  ensureStyles();
  const gsap = await loadGsap();

  // Build DOM
  const root = document.createElement('div');
  root.className = `tc-root ${role}`;
  const words = title.trim().split(/\s+/);
  const wordsHTML = words.map((w, i) =>
    `<span class="w${i === words.length - 1 ? ' italic' : ''}">${w}</span>`
  ).join(' ');
  const logoHTML = logo.kind === 'video'
    ? `<video src="${logo.src}" autoplay muted playsinline></video>`
    : `<img src="${logo.src}" alt="">`;

  root.innerHTML = `
    <div class="tc-bg-base"></div>
    <canvas class="tc-dust"></canvas>
    <div class="tc-sweep"></div>
    <div class="tc-bg-vignette"></div>
    <div class="tc-wrap">
      <div class="tc-logo ${logo.kind}">${logoHTML}</div>
      <div class="tc-eyebrow-row">
        <div class="tc-ebar"></div>
        <div class="tc-eyebrow">${eyebrow}</div>
        <div class="tc-ebar right"></div>
      </div>
      <div class="tc-title">${wordsHTML}</div>
      <div class="tc-subtitle">${subtitleHTML}</div>
    </div>
    ${meta ? `
    <div class="tc-meta">
      <span class="tick"></span><span>Chapter ${meta.chapter}</span>
      <span class="sep"></span><span>${meta.label}</span>
    </div>` : ''}
    ${signoff ? `<div class="tc-signoff">${signoff}</div>` : ''}
  `;
  document.body.appendChild(root);

  // Query
  const wrap     = root.querySelector('.tc-wrap');
  const logoEl   = root.querySelector('.tc-logo');
  const ebarL    = root.querySelectorAll('.tc-ebar')[0];
  const ebarR    = root.querySelectorAll('.tc-ebar')[1];
  const eyebrowEl= root.querySelector('.tc-eyebrow');
  const subtitle = root.querySelector('.tc-subtitle');
  const metaEl   = root.querySelector('.tc-meta');
  const signoffEl= root.querySelector('.tc-signoff');
  const sweep    = root.querySelector('.tc-sweep');
  const dust     = root.querySelector('.tc-dust');
  const wordEls  = root.querySelectorAll('.tc-title .w');

  // Initial states
  gsap.set(wrap, { filter: 'blur(22px)' });
  gsap.set(logoEl, { opacity: 0, scale: 0.68, y: 24, rotation: role === 'outro' ? -4 : 0 });
  gsap.set([ebarL, ebarR], { scaleX: 0 });
  gsap.set(eyebrowEl, { opacity: 0, y: 8, letterSpacing: '0.5em' });

  const slideDist = words.map((_, i) =>
    role === 'outro' ? Math.max(50, 380 - i * 120) : Math.max(60, 400 - i * 140)
  );
  wordEls.forEach((el, i) => gsap.set(el, { x: slideDist[i], y: 20, opacity: 0, filter: 'blur(14px)' }));

  gsap.set(subtitle, { opacity: 0, y: 18, filter: 'blur(8px)' });
  if (metaEl)    gsap.set(metaEl,    { opacity: 0, y: 6 });
  if (signoffEl) gsap.set(signoffEl, { opacity: 0, x: 20 });

  // Ambient dust
  const stopDust = startDust(dust);
  gsap.to(dust, { opacity: 1, duration: 1.4, ease: 'power2.out' });

  // Timeline
  const tl = gsap.timeline();
  tl.to(wrap, { filter: 'blur(0px)', duration: 0.85, ease: 'power2.out' }, 0);
  tl.fromTo(sweep,
    { x: '-120vw', opacity: 0 },
    { x: '120vw', opacity: 1, duration: 1.6, ease: 'power2.inOut',
      onComplete: () => gsap.to(sweep, { opacity: 0, duration: 0.3 }) },
    0.1);
  tl.to(logoEl, {
    opacity: 1, scale: 1, y: 0, rotation: 0,
    duration: role === 'outro' ? 1.15 : 1.1, ease: 'back.out(1.8)'
  }, 0.35);
  tl.to([ebarL, ebarR], { scaleX: 1, duration: 0.7, ease: 'expo.out' }, 0.75);
  tl.to(eyebrowEl, { opacity: 1, y: 0, letterSpacing: '0.38em', duration: 0.8, ease: 'expo.out' }, 0.82);

  const wordStep = role === 'outro' ? 0.16 : 0.14;
  const wordDur  = role === 'outro' ? 0.9  : 0.85;
  const wordOnsets = words.map((_, i) => 1.05 + i * wordStep);
  wordEls.forEach((el, i) => {
    tl.to(el, { x: 0, y: 0, opacity: 1, filter: 'blur(0px)', duration: wordDur, ease: 'expo.out' }, wordOnsets[i]);
  });

  const lastLand = wordOnsets[wordOnsets.length - 1] + (role === 'outro' ? 0.4 : 0.35);

  tl.add(() => { wordEls.forEach(w => w.classList.add('is-gradient')); }, lastLand + 0.05);
  tl.to(wordEls, {
    backgroundPosition: '0% 0',
    duration: role === 'outro' ? 1.0 : 0.9, ease: 'power2.out',
    stagger: role === 'outro' ? 0.06 : 0.05
  }, lastLand + 0.1);

  tl.to(wrap, { scale: 1.015, duration: 0.12, ease: 'power2.out' }, lastLand + 0.12);
  tl.to(wrap, { scale: 1,     duration: 0.32, ease: 'power2.inOut' }, lastLand + 0.24);

  tl.to(subtitle, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, lastLand + 0.35);
  if (metaEl)    tl.to(metaEl,    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, lastLand + 0.55);
  if (signoffEl) tl.to(signoffEl, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, lastLand + 0.7);

  tl.to(eyebrowEl, {
    letterSpacing: '0.42em', duration: 0.9,
    ease: 'sine.inOut', yoyo: true, repeat: 1
  }, lastLand + 0.7);

  tl.addLabel('holdEnd', `+=${hold}`);

  // Push-blur exit
  tl.to(wordEls, {
    y: -36, x: -20, scale: 1.06, opacity: 0, filter: 'blur(16px)',
    duration: 0.6, ease: 'power2.in', stagger: 0.05
  }, 'holdEnd');
  const secondary = [eyebrowEl, ebarL, ebarR, subtitle];
  if (metaEl)    secondary.push(metaEl);
  if (signoffEl) secondary.push(signoffEl);
  tl.to(secondary, { y: -18, opacity: 0, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in' }, 'holdEnd');
  tl.to(logoEl, { scale: 1.18, opacity: 0, filter: 'blur(8px)', duration: 0.65, ease: 'power2.in' }, 'holdEnd+=0.05');
  tl.to(wrap, { filter: 'blur(18px)', duration: 0.55, ease: 'power2.in' }, 'holdEnd+=0.05');
  tl.to(dust, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 'holdEnd');

  // Fade the whole root out at the very end so nothing peeks
  tl.to(root, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 'holdEnd+=0.5');

  await tl.then();
  stopDust();
  root.remove();
}

async function playSullieSystemTitleCard(opts) {
  const { mount } = await import('./cinematic-sullie-title-three.js');
  const title = opts.title || '';
  const subtitle = opts.subtitle || opts.subtitleHTML || '';
  const logoSrc =
    opts.wordmark ||
    (opts.logo && opts.logo.kind === 'image' ? opts.logo.src : null) ||
    '/assets/wpforms-logo.png';
  const handle = await mount({
    role: opts.role || 'intro',
    duration: opts.duration || opts.hold || 7.4,
    title,
    subtitle,
    subtitleVariants: opts.subtitleVariants || null,
    kicker: opts.eyebrow || (opts.role === 'outro' ? 'WPForms' : 'Tutorial'),
    cta: opts.cta || (opts.role === 'outro' ? 'Build with WPForms' : ''),
    pill: opts.pill || (opts.role === 'outro' ? 'Make the next one faster.' : 'Let’s make it simple.'),
    logo: logoSrc,
    sullie: opts.sullie || '/assets/sullie.lottie',
    sullieFallback: opts.sullieFallback || '/assets/sullie.png',
    theme: {
      background: opts.role === 'outro' ? 'warm-cream' : 'cool-paper',
      accent: '#E27730',
      ...(opts.theme || {}),
    },
  });
  await handle.animPromise;
  await handle.dismiss();
}

// ────────────────────────────────────────────────────────────────────────────
// Editorial v4 outro — modern, minimal, announcement-grade.
//
// Cool paper palette (matches v4 body). Pure centered stack. No dust, no
// sweep, no gradient type, no italic flourish. Every text line uses the
// same pixel-point mask slide-up as the v4 editorial lines — one consistent
// motion grammar across the whole video.
//
//   ┌──────────────────────────────────────────────────────────┐
//   │ ▪ wpforms                                                │
//   │                                                          │
//   │                                                          │
//   │                  AVAILABLE NOW                           │
//   │                                                          │
//   │         Surveys & Polls. Refreshed.                      │
//   │                                                          │
//   │                 wpforms.com/docs                         │
//   │                                                          │
//   │ ─────────────────────────────────────────────────  [sullie]
//   └──────────────────────────────────────────────────────────┘
// ────────────────────────────────────────────────────────────────────────────
const EDITORIAL_CSS = `
.ev4-root {
  position: fixed; inset: 0; z-index: 900;
  overflow: hidden;
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  color: #14161C;
  background:
    radial-gradient(ellipse at 85% 8%, rgba(255,255,255,0.55) 0%, transparent 55%),
    linear-gradient(180deg, #F8FAFC 0%, #E7EEF7 100%);
}
.ev4-root .ev4-horizon {
  position: absolute; left: 0; right: 0; top: 66%;
  height: 1px; background: rgba(226,119,48,0.10);
  transform-origin: left center;
}
.ev4-root .ev4-wordmark {
  position: absolute; top: 44px; left: 52px;
  display: flex; align-items: center;
  opacity: 0;
}
.ev4-root .ev4-wordmark img { height: 20px; width: auto; opacity: 0.55; display: block; }

.ev4-root .ev4-stack {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 0 8vw;
}

.ev4-root .ev4-eyebrow {
  font: 600 12px/1 'Inter', sans-serif;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #6B7380;
  margin-bottom: 44px;
  display: inline-block; position: relative;
}
.ev4-root .ev4-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 96px;
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: #14161C;
  max-width: 1200px;
  margin: 0;
  position: relative;
}
.ev4-root .ev4-url {
  font: 500 15px/1 'Inter', sans-serif;
  letter-spacing: 0.01em;
  color: #4A5260;
  margin-top: 36px;
  display: inline-block;
}

.ev4-root .ev4-sullie {
  position: absolute; right: 56px; bottom: 44px;
  height: 110px; width: auto;
  opacity: 0;
  transform: translateY(24px);
  filter: drop-shadow(0 12px 24px rgba(20,22,28,0.08));
}

/* Mask slide-up — identical grammar to v4 editorial text. */
.ev4-root .ev4-line { display: inline-block; }
.ev4-root .ev4-mask {
  display: inline-block;
  overflow: hidden;
  vertical-align: baseline;
  padding: 0.14em 0;
  margin: -0.14em 0;
  line-height: 1.04;
}
.ev4-root .ev4-ch {
  display: inline-block;
  transform: translate3d(0, 110%, 0);
  transition: transform 960ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
.ev4-root .ev4-line.in .ev4-ch { transform: translate3d(0, 0, 0); }
.ev4-root .ev4-line.out .ev4-ch {
  transform: translate3d(0, -110%, 0);
  transition: transform 520ms cubic-bezier(0.64, 0, 0.78, 0);
  transition-delay: 0ms !important;
}

/* Title shine — single quiet sweep, no mix-blend theatrics. */
.ev4-root .ev4-shine {
  position: absolute; top: -6%; bottom: -6%;
  left: -40%; width: 32%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.8) 50%,
    transparent 100%);
  filter: blur(12px);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
}
.ev4-root .ev4-shine.run {
  opacity: 1;
  left: 112%;
  transition: left 1200ms cubic-bezier(.3,.05,.3,1), opacity 300ms ease;
}
`;

function ensureEditorialStyles() {
  if (document.getElementById('ev4-styles')) return;
  const s = document.createElement('style');
  s.id = 'ev4-styles';
  s.textContent = EDITORIAL_CSS;
  document.head.appendChild(s);
}

function buildMaskedLine(text, stagger, startDelay = 0) {
  const line = document.createElement('span');
  line.className = 'ev4-line';
  const chars = [...text];
  chars.forEach((c, i) => {
    const mask = document.createElement('span');
    mask.className = 'ev4-mask';
    const ch = document.createElement('span');
    ch.className = 'ev4-ch';
    ch.innerHTML = c === ' ' ? '&nbsp;' : c;
    ch.style.transitionDelay = (startDelay + i * stagger) + 'ms';
    mask.appendChild(ch);
    line.appendChild(mask);
  });
  return { line, totalMs: startDelay + chars.length * stagger + 960 };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function playEditorialV4Outro(opts) {
  // `||` fallback (not destructure default) so that explicit nulls from
  // the call site still resolve to the defaults.
  const eyebrow  = opts.eyebrow  || 'AVAILABLE NOW';
  const title    = opts.title    || 'Surveys & Polls. Refreshed.';
  const url      = opts.url      || 'wpforms.com/docs';
  const wordmark = opts.wordmark || '/assets/wpforms-logo.png';
  const sullie   = opts.sullie   || '/assets/sullie.png';
  const hold     = opts.hold ?? 3.8;

  ensureFonts();
  ensureEditorialStyles();

  const root = document.createElement('div');
  root.className = 'ev4-root';

  const horizon = document.createElement('div');
  horizon.className = 'ev4-horizon';
  root.appendChild(horizon);

  const wm = document.createElement('div');
  wm.className = 'ev4-wordmark';
  wm.innerHTML = `<img src="${wordmark}" alt="WPForms">`;
  root.appendChild(wm);

  const stack = document.createElement('div');
  stack.className = 'ev4-stack';

  const eyebrowWrap = document.createElement('div');
  eyebrowWrap.className = 'ev4-eyebrow';
  const eyebrowBuilt = buildMaskedLine(eyebrow.toUpperCase(), 22);
  eyebrowWrap.appendChild(eyebrowBuilt.line);

  const titleEl = document.createElement('h1');
  titleEl.className = 'ev4-title';
  const titleBuilt = buildMaskedLine(title, 32);
  titleEl.appendChild(titleBuilt.line);
  const shine = document.createElement('span');
  shine.className = 'ev4-shine';
  titleEl.appendChild(shine);

  const urlWrap = document.createElement('div');
  urlWrap.className = 'ev4-url';
  const urlBuilt = buildMaskedLine(url, 20);
  urlWrap.appendChild(urlBuilt.line);

  stack.appendChild(eyebrowWrap);
  stack.appendChild(titleEl);
  stack.appendChild(urlWrap);
  root.appendChild(stack);

  const sullieEl = document.createElement('img');
  sullieEl.className = 'ev4-sullie';
  sullieEl.src = sullie;
  sullieEl.alt = '';
  root.appendChild(sullieEl);

  document.body.appendChild(root);

  // Wordmark fades in first (chrome-before-content).
  await sleep(120);
  wm.style.transition = 'opacity 700ms ease';
  wm.style.opacity = '1';

  // Eyebrow reveals.
  await sleep(220);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    eyebrowBuilt.line.classList.add('in');
  }));

  // Title reveals, slightly offset.
  await sleep(380);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    titleBuilt.line.classList.add('in');
  }));

  // Wait for title to mostly settle, then fire shine + URL + sullie.
  await sleep(Math.max(0, titleBuilt.totalMs - 200));

  // Quiet title shine sweep.
  shine.classList.add('run');

  // URL reveals.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    urlBuilt.line.classList.add('in');
  }));

  // Sullie enters as a signature after the type has landed.
  await sleep(240);
  sullieEl.style.transition = 'opacity 820ms ease, transform 900ms cubic-bezier(0.22, 1, 0.36, 1)';
  sullieEl.style.opacity = '0.92';
  sullieEl.style.transform = 'translateY(0)';

  // Hold.
  await sleep(hold * 1000);

  // Exit: every line slides up and out in the same grammar.
  eyebrowBuilt.line.classList.remove('in');
  eyebrowBuilt.line.classList.add('out');
  titleBuilt.line.classList.remove('in');
  titleBuilt.line.classList.add('out');
  urlBuilt.line.classList.remove('in');
  urlBuilt.line.classList.add('out');
  sullieEl.style.transition = 'opacity 520ms ease, transform 520ms cubic-bezier(0.64, 0, 0.78, 0)';
  sullieEl.style.opacity = '0';
  sullieEl.style.transform = 'translateY(18px)';
  wm.style.opacity = '0';

  await sleep(640);
  root.style.transition = 'opacity 500ms ease';
  root.style.opacity = '0';
  await sleep(520);
  root.remove();
}
