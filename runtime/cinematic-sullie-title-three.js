// Cinematic lifecycle archetype: sullie-title-three.
//
// Three.js is used as a subtle dimensional light stage. Actual brand/Sullie
// assets stay in DOM/Lottie for crispness and recognizability.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { createThreeStage } from './cinematic-adapters/three-stage.js';
import { mountLottie } from './cinematic-adapters/lottie.js';

const STYLE_ID = 'cst3-styles';
const FONT_ID = 'cst3-fonts';

const CSS = `
.cst3-root {
  position: fixed; inset: 0; z-index: 600;
  overflow: hidden;
  font-family: 'Satoshi', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #343434;
  opacity: 0;
  transition: opacity 520ms ease;
}
.cst3-root.on { opacity: 1; }
.cst3-root.exit { opacity: 0; transition: opacity 420ms ease; }
.cst3-canvas { position: absolute; inset: 0; opacity: 0.32; }
.cst3-soft {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(circle at 2px 2px, rgba(193, 158, 105, 0.18) 0 2px, transparent 2.3px) 0 0 / 38px 38px,
    radial-gradient(42% 34% at 78% 34%, rgba(226,119,48,0.08), transparent 70%),
    radial-gradient(46% 38% at 22% 66%, rgba(3,153,237,0.08), transparent 72%),
    linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%);
}
.cst3-wave {
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  width: 100%;
  height: 36vh;
  pointer-events: none;
  opacity: 0.92;
}
.cst3-wave path { fill: #f0e6d5; }
.cst3-wordmark {
  position: absolute; left: 52px; top: 42px;
  width: min(230px, 22vw);
  display: grid; place-items: center;
  opacity: 0;
  filter: drop-shadow(0 10px 22px rgba(20,22,28,0.08));
}
.cst3-wordmark img { width: 100%; height: auto; display: block; }
.cst3-stage {
  position: absolute; inset: 0;
  display: grid;
  place-items: center;
  padding: 8vh 8vw;
}
.cst3-copy {
  position: relative;
  width: min(980px, 72vw);
  margin-right: min(210px, 12vw);
  transform: translateY(14px);
}
.cst3-kicker {
  color: var(--cst3-accent, #E27730);
  font: 750 12px/1 -apple-system, sans-serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 18px;
  opacity: 0;
  transform: translateY(14px);
}
.cst3-title {
  margin: 0;
  max-width: 980px;
  color: #2d2d2d;
  font: 850 clamp(46px, 6.5vw, 98px)/0.98 'Satoshi', -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0;
}
.cst3-title .word {
  display: inline-block;
  margin-right: 0.24em;
  opacity: 0;
  filter: blur(12px);
  transform: translate3d(0, 10px, 0) scale(0.985);
  will-change: opacity, filter, transform;
}
.cst3-subtitle-rotator {
  width: min(620px, 58vw);
  margin: 22px 0 0;
  min-height: 34px;
  position: relative;
  perspective: 900px;
}
.cst3-subtitle-item {
  position: absolute;
  left: 0; top: 0;
  width: 100%;
  color: #686868;
  font: 520 clamp(16px, 1.55vw, 22px)/1.42 'Satoshi', -apple-system, sans-serif;
  opacity: 0;
  filter: blur(10px);
  transform: translate3d(0, 18px, -64px) scale(0.94);
  transform-origin: left center;
  will-change: opacity, filter, transform;
}
.cst3-cta {
  display: inline-flex; align-items: center; gap: 10px;
  margin-top: 26px; padding: 13px 19px;
  border-radius: 999px;
  background: rgba(255,255,255,0.78);
  box-shadow: 0 18px 40px rgba(20,22,28,0.10), inset 0 0 0 1px rgba(255,255,255,0.72);
  color: #444;
  font: 750 14px/1 'Satoshi', -apple-system, sans-serif;
  opacity: 0;
  transform: translateY(14px) scale(0.98);
  backdrop-filter: blur(16px) saturate(145%);
  -webkit-backdrop-filter: blur(16px) saturate(145%);
}
.cst3-cta::after {
  content: "";
  width: 8px; height: 8px;
  border-top: 2px solid var(--cst3-accent, #E27730);
  border-right: 2px solid var(--cst3-accent, #E27730);
  transform: rotate(45deg);
}
.cst3-sullie {
  position: absolute;
  right: clamp(50px, 9vw, 150px);
  bottom: clamp(72px, 12vh, 150px);
  width: clamp(116px, 12vw, 178px);
  aspect-ratio: 1 / 1;
  opacity: 0;
  transform: translateY(22px) scale(0.92);
  filter: drop-shadow(0 22px 34px rgba(20,22,28,0.13));
  pointer-events: none;
}
.cst3-sullie img, .cst3-sullie canvas, .cst3-sullie svg {
  width: 100%; height: 100%; display: block; object-fit: contain;
}
.cst3-pill {
  position: absolute;
  right: clamp(52px, 8.4vw, 148px);
  bottom: clamp(52px, 9vh, 116px);
  min-width: 190px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,0.72);
  box-shadow: 0 16px 36px rgba(20,22,28,0.10), inset 0 0 0 1px rgba(255,255,255,0.72);
  font: 700 13px/1 'Satoshi', -apple-system, sans-serif;
  color: #555;
  opacity: 0;
  transform: translateY(12px);
  text-align: center;
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
}
.cst3-floaters {
  position: absolute; inset: 0;
  pointer-events: none;
}
.cst3-floater {
  position: absolute;
  width: var(--size, 54px);
  height: var(--size, 54px);
  display: grid; place-items: center;
  border-radius: 16px;
  background: var(--bg, #E27730);
  box-shadow: 0 18px 42px rgba(20,22,28,0.10), inset 0 0 0 1px rgba(255,255,255,0.34);
  opacity: 0;
  transform: translateY(18px) scale(0.86);
  will-change: transform, opacity;
}
.cst3-floater img {
  width: 46%;
  height: 46%;
  display: block;
  object-fit: contain;
}
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureStyles() {
  if (!document.getElementById(FONT_ID)) {
    const link = document.createElement('link');
    link.id = FONT_ID;
    link.rel = 'stylesheet';
    link.href = 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800,900&display=swap';
    document.head.appendChild(link);
  }
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function titleWords(title) {
  return String(title).trim().split(/\s+/).map((word) =>
    `<span class="word">${esc(word)}</span>`
  ).join('');
}

function buildThree(stage, role) {
  const { THREE, scene, camera } = stage;
  camera.position.set(0, 0, 5.4);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const group = new THREE.Group();
  scene.add(group);

  const mat = new THREE.MeshBasicMaterial({
    color: role === 'outro' ? 0xe27730 : 0x0399ed,
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.4), mat);
  glow.position.set(0.4, -0.1, -0.65);
  glow.rotation.set(0.03, -0.12, -0.04);
  group.add(glow);

  return { group, glow };
}

async function mountSullie(host, src, fallback) {
  try {
    return await mountLottie({ container: host, src, loop: true, autoplay: true });
  } catch (e) {
    const img = document.createElement('img');
    img.src = fallback;
    img.alt = '';
    host.appendChild(img);
    return { destroy() { host.replaceChildren(); } };
  }
}

export async function mount(opts = {}) {
  ensureStyles();

  const role = opts.role === 'outro' ? 'outro' : 'intro';
  const theme = resolveTheme(opts.theme, role === 'outro' ? 'warm-cream' : 'cool-paper');
  const accent = (opts.theme && opts.theme.accent) || '#E27730';
  const duration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 7;
  const title = opts.title || (role === 'outro' ? 'Ready to build your next form?' : 'Setting Up Email Notifications');
  const subtitle = opts.subtitle || (role === 'outro' ? 'Create smarter forms with WPForms.' : 'Send the right message at the right time.');
  const kicker = opts.kicker || (role === 'outro' ? 'WPForms' : 'Tutorial');
  const cta = opts.cta || (role === 'outro' ? 'Build with WPForms' : '');
  const pill = opts.pill || (role === 'outro' ? 'See you in the next build.' : 'Let’s make it simple.');
  const logo = opts.logo || '/assets/wpforms-logo.png';
  const sullie = opts.sullie || '/assets/sullie.lottie';
  const sullieFallback = opts.sullieFallback || '/assets/sullie.png';
  const subtitleVariants = (opts.subtitleVariants && opts.subtitleVariants.length)
    ? opts.subtitleVariants
    : [
        subtitle,
        'Automate every form response.',
        'Keep every lead moving forward.',
      ];
  const icons = opts.icons || [
    '/assets/wpforms-icon-1.svg',
    '/assets/wpforms-icon-2.svg',
    '/assets/wpforms-icon-3.svg',
    '/assets/wpforms-icon-4.svg',
    '/assets/wpforms-icon-5.svg',
    '/assets/wpforms-icon-6.svg',
  ];

  const floaters = icons.map((src, i) => {
    const pos = [
      ['15%', '20%', '#E27730', '50px'],
      ['78%', '18%', '#056AAB', '54px'],
      ['63%', '30%', '#0399ED', '46px'],
      ['28%', '72%', '#444444', '48px'],
      ['88%', '50%', '#E27730', '52px'],
      ['42%', '16%', '#056AAB', '44px'],
    ][i % 6];
    return `<div class="cst3-floater" style="left:${pos[0]};top:${pos[1]};--bg:${pos[2]};--size:${pos[3]}"><img src="${esc(src)}" alt=""></div>`;
  }).join('');

  const root = document.createElement('div');
  root.className = 'cst3-root';
  root.style.background = '#ffffff';
  root.style.setProperty('--cst3-accent', accent);
  root.innerHTML = `
    <div class="cst3-canvas"></div>
    <div class="cst3-soft"></div>
    <svg class="cst3-wave" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 190C160 128 324 98 492 134C660 170 770 242 964 238C1158 234 1224 132 1440 108V360H0Z"></path>
    </svg>
    <div class="cst3-floaters">${floaters}</div>
    <div class="cst3-wordmark"><img src="${esc(logo)}" alt="WPForms"></div>
    <div class="cst3-stage">
      <div class="cst3-copy">
        <div class="cst3-kicker">${esc(kicker)}</div>
        <h1 class="cst3-title">${titleWords(title)}</h1>
        <div class="cst3-subtitle-rotator">
          ${subtitleVariants.map((text) => `<div class="cst3-subtitle-item">${esc(text)}</div>`).join('')}
        </div>
        ${cta ? `<div class="cst3-cta">${esc(cta)}</div>` : ''}
      </div>
    </div>
    <div class="cst3-sullie"></div>
    <div class="cst3-pill">${esc(pill)}</div>
  `;
  document.body.appendChild(root);
  await sleep(20);
  root.classList.add('on');

  const gsap = await loadGsap();

  if (opts.theme?.backgroundCss) {
    const soft = root.querySelector('.cst3-soft');
    if (soft) soft.style.background = opts.theme.backgroundCss;
    const wavePath = root.querySelector('.cst3-wave path');
    if (wavePath && opts.theme.waveFill) wavePath.style.fill = opts.theme.waveFill;
  }

  const canvasHost = root.querySelector('.cst3-canvas');
  const stage = await createThreeStage(canvasHost, {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    camera: { fov: 34, z: 5.4 },
  });
  const three = buildThree(stage, role);
  const sullieHost = root.querySelector('.cst3-sullie');
  const sullieHandle = await mountSullie(sullieHost, sullie, sullieFallback);

  const wordmark = root.querySelector('.cst3-wordmark');
  const kickerEl = root.querySelector('.cst3-kicker');
  const titleWordsEls = [...root.querySelectorAll('.cst3-title .word')];
  const subtitleItems = [...root.querySelectorAll('.cst3-subtitle-item')];
  const ctaEl = root.querySelector('.cst3-cta');
  const pillEl = root.querySelector('.cst3-pill');
  const floaterEls = [...root.querySelectorAll('.cst3-floater')];

  let dismissed = false;
  let aborted = false;

  stage.start((_, elapsed) => {
    three.group.rotation.z = Math.sin(elapsed * 0.28) * 0.018;
    three.glow.material.opacity = 0.03 + Math.sin(elapsed * 0.8) * 0.008;
  });

  gsap.set(three.group.position, { z: -0.35, y: 0.1 });
  gsap.set(three.group.scale, { x: 0.82, y: 0.82, z: 0.82 });
  gsap.set(wordmark, { opacity: 0, y: -10, scale: 0.96 });
  gsap.set(sullieHost, { opacity: 0, y: 28, scale: 0.9, rotate: -4 });
  gsap.set(pillEl, { opacity: 0, y: 12 });
  gsap.set(floaterEls, { opacity: 0, y: 18, scale: 0.86 });

  async function timeline() {
    const tl = gsap.timeline();
    tl.to(three.group.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power3.out' }, 0.1);
    tl.to(three.group.position, { z: 0, y: 0, duration: 1.4, ease: 'power3.out' }, 0.1);
    tl.to(wordmark, { opacity: 1, y: 0, scale: 1, duration: 0.76, ease: 'power3.out' }, 0.28);
    tl.to(floaterEls, {
      opacity: 0.9,
      y: 0,
      scale: 1,
      duration: 0.8,
      stagger: 0.08,
      ease: 'back.out(1.45)',
    }, 0.42);
    tl.add(() => {
      floaterEls.forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 ? -10 : 10,
          x: i % 3 === 0 ? 8 : -6,
          duration: 2.8 + i * 0.18,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.04,
        });
      });
    }, 1.1);
    tl.to(kickerEl, { opacity: 1, y: 0, duration: 0.58, ease: 'power3.out' }, 0.78);
    // Pixel Point mapping: per-word-crossfade.
    tl.to(titleWordsEls, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.64,
      stagger: 0.085,
      ease: 'power3.out',
    }, 0.96);
    // Pixel Point mapping: shared-axis-z. Three variants cycle in place.
    let subtitleAt = 1.62;
    subtitleItems.forEach((el, i) => {
      tl.to(el, {
        opacity: 1,
        y: 0,
        z: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.52,
        ease: 'power3.out',
      }, subtitleAt);
      if (i < subtitleItems.length - 1) {
        tl.to(el, {
          opacity: 0,
          y: -16,
          z: 52,
          scale: 1.035,
          filter: 'blur(10px)',
          duration: 0.38,
          ease: 'power2.in',
        }, subtitleAt + 1.08);
        subtitleAt += 1.42;
      }
    });
    if (ctaEl) {
      tl.to(ctaEl, { opacity: 1, y: 0, scale: 1, duration: 0.64, ease: 'power3.out' }, 1.66);
    }
    tl.to(sullieHost, { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.9, ease: 'back.out(1.45)' }, 1.58);
    tl.to(pillEl, { opacity: 1, y: 0, duration: 0.62, ease: 'power3.out' }, 2.02);
    tl.to(sullieHost, { y: -8, duration: 1.8, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 2.54);
    await tl;
    if (aborted) return;
    await sleep(Math.max(900, duration * 1000 - 5000));
  }

  const animPromise = timeline();

  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try {
      gsap.killTweensOf([three.group.position, three.group.scale, wordmark, kickerEl, ctaEl, sullieHost, pillEl, ...titleWordsEls, ...subtitleItems, ...floaterEls]);
    } catch (_) {}
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(440);
    try { sullieHandle.destroy(); } catch (_) {}
    try { stage.cleanup(); } catch (_) {}
    root.remove();
  }

  return { root, animPromise, dismiss };
}
