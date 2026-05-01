// Cinematic lifecycle archetype: brand-stage-three.
//
// Experiment A: a reusable 3D-dominant intro/outro stage for WPForms videos.
// Three.js owns the hero object, lighting, and camera motion; DOM owns the
// title/CTA for sharp typography. Lifecycle-only: no live WPForms UI.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { createThreeStage } from './cinematic-adapters/three-stage.js';

const STYLE_ID = 'cbst3-styles';

const CSS = `
.cbst3-root {
  position: fixed; inset: 0; z-index: 600;
  overflow: hidden;
  color: #444444;
  font-family: -apple-system, 'Segoe UI', Roboto, 'Inter', sans-serif;
  opacity: 0;
  transition: opacity 560ms ease;
}
.cbst3-root.on { opacity: 1; }
.cbst3-root.exit { opacity: 0; transition: opacity 460ms ease; }
.cbst3-canvas { position: absolute; inset: 0; }
.cbst3-aurora {
  position: absolute; inset: -12%;
  pointer-events: none;
  background:
    radial-gradient(34% 34% at 25% 32%, rgba(226,119,48,0.16), transparent 64%),
    radial-gradient(36% 34% at 72% 58%, rgba(3,153,237,0.15), transparent 66%),
    radial-gradient(46% 38% at 50% 100%, rgba(5,106,171,0.10), transparent 70%);
  filter: blur(4px);
  opacity: 0.72;
}
.cbst3-logo-lockup {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(390px, 36vw);
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 18px 32px rgba(20,22,28,0.13));
  will-change: transform, opacity;
}
.cbst3-logo-lockup img {
  width: min(320px, 32vw);
  max-height: 92px;
  display: block;
}
.cbst3-logo-fallback {
  font: 700 46px/1 -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #056AAB;
  letter-spacing: 0;
}
.cbst3-logo-fallback span { color: #E27730; }
.cbst3-copy {
  position: absolute;
  left: 50%;
  bottom: 10vh;
  width: min(780px, calc(100vw - 64px));
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
}
.cbst3-eyebrow {
  font: 700 12px/1 -apple-system, sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cbst3-accent, #E27730);
  margin-bottom: 12px;
  opacity: 0;
  transform: translateY(12px);
}
.cbst3-title {
  margin: 0;
  font: 650 clamp(31px, 4.2vw, 62px)/1.02 -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0;
  color: #333333;
  opacity: 0;
  transform: translateY(18px);
}
.cbst3-subtitle {
  margin: 14px auto 0;
  max-width: 620px;
  font: 450 clamp(15px, 1.4vw, 20px)/1.45 -apple-system, sans-serif;
  color: #666666;
  opacity: 0;
  transform: translateY(14px);
}
.cbst3-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(255,255,255,0.76);
  box-shadow: 0 14px 34px rgba(20,22,28,0.10), inset 0 0 0 1px rgba(255,255,255,0.72);
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  color: #444444;
  font: 650 14px/1 -apple-system, sans-serif;
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
.cbst3-cta::after {
  content: "";
  width: 8px; height: 8px;
  border-right: 2px solid var(--cbst3-accent, #E27730);
  border-top: 2px solid var(--cbst3-accent, #E27730);
  transform: rotate(45deg);
}
.cbst3-glint {
  position: absolute;
  left: 50%; top: 50%;
  width: min(520px, 50vw);
  height: min(520px, 50vw);
  transform: translate(-50%, -50%) rotate(-18deg) translateX(-120%);
  background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.74), transparent 70%);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
}
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function loadImageOkay(img) {
  return new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
}

async function mountLogo(root, src) {
  const host = root.querySelector('.cbst3-logo-lockup');
  if (!src) {
    host.innerHTML = '<div class="cbst3-logo-fallback">WP<span>Forms</span></div>';
    return host;
  }
  const img = document.createElement('img');
  img.alt = 'WPForms';
  const okPromise = loadImageOkay(img);
  img.src = src;
  const ok = await okPromise;
  if (ok) host.appendChild(img);
  else host.innerHTML = '<div class="cbst3-logo-fallback">WP<span>Forms</span></div>';
  return host;
}

function createPanelTexture(THREE, accent, role) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 720;
  const ctx = c.getContext('2d');

  const panel = ctx.createLinearGradient(0, 0, c.width, c.height);
  panel.addColorStop(0, 'rgba(255,255,255,0.94)');
  panel.addColorStop(0.46, 'rgba(255,255,255,0.64)');
  panel.addColorStop(1, 'rgba(238,244,250,0.80)');
  ctx.fillStyle = panel;
  const r = 72;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(c.width - r, 0);
  ctx.quadraticCurveTo(c.width, 0, c.width, r);
  ctx.lineTo(c.width, c.height - r);
  ctx.quadraticCurveTo(c.width, c.height, c.width - r, c.height);
  ctx.lineTo(r, c.height);
  ctx.quadraticCurveTo(0, c.height, 0, c.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.globalAlpha = role === 'outro' ? 0.96 : 0.82;
  ctx.fillRect(82, 96, 16, 528);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(5,106,171,0.12)';
  for (let i = 0; i < 6; i++) {
    const y = 110 + i * 82;
    const w = 620 - i * 38;
    ctx.fillRect(154, y, w, 24);
    ctx.fillRect(154, y + 40, w * 0.62, 14);
  }

  if (role === 'outro') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(678, 470);
    ctx.lineTo(752, 544);
    ctx.lineTo(900, 346);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildStageObject(stage, { accent, role }) {
  const { THREE, scene, camera } = stage;
  camera.position.set(0, 0.1, 5.7);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.62));

  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(-3.8, 4.2, 4.5);
  scene.add(key);

  const blue = new THREE.PointLight(0x0399ed, 1.6, 10);
  blue.position.set(3.1, 1.2, 3.2);
  scene.add(blue);

  const orange = new THREE.PointLight(0xe27730, 1.15, 8);
  orange.position.set(-2.8, -2.0, 2.4);
  scene.add(orange);

  const group = new THREE.Group();
  scene.add(group);

  const panelMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: createPanelTexture(THREE, accent, role),
    transparent: true,
    opacity: 0.72,
    roughness: 0.14,
    metalness: 0.015,
    transmission: 0.30,
    thickness: 0.58,
    clearcoat: 0.9,
    clearcoatRoughness: 0.16,
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.18, 2.22, 0.18, 12, 8, 2), panelMat);
  group.add(panel);

  const backMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7fbff,
    transparent: true,
    opacity: 0.20,
    roughness: 0.08,
    transmission: 0.46,
    thickness: 0.45,
    clearcoat: 1,
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.36, 2.38, 0.20), backMat);
  back.position.z = -0.07;
  group.add(back);

  const haloMat = new THREE.MeshBasicMaterial({
    color: role === 'outro' ? 0xe27730 : 0x0399ed,
    transparent: true,
    opacity: 0.060,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.2), haloMat);
  halo.position.z = -0.24;
  group.add(halo);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.24, 0.008, 8, 120), ringMat);
  ring.rotation.x = Math.PI / 2.18;
  ring.position.z = -0.18;
  group.add(ring);

  return { group, panel, back, halo, ring, lights: { key, blue, orange } };
}

export async function mount(opts = {}) {
  ensureStyles();
  const gsap = await loadGsap();

  const role = opts.role === 'outro' ? 'outro' : 'intro';
  const theme = resolveTheme(opts.theme, role === 'outro' ? 'warm-cream' : 'cool-paper');
  const accent = (opts.theme && opts.theme.accent) || opts.accent || '#E27730';
  const duration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 7;
  const title = opts.title || (role === 'outro' ? 'Build your next form with WPForms.' : 'Setting Up Email Notifications');
  const subtitle = opts.subtitle || (role === 'outro' ? 'Start faster. Look sharper. Convert better.' : 'Send the right message at the right time.');
  const eyebrow = opts.eyebrow || (role === 'outro' ? 'WPForms' : 'Tutorial');
  const cta = opts.cta || (role === 'outro' ? 'Build with WPForms' : '');
  const logo = opts.logo || '/assets/wordmark-white.svg';

  const root = document.createElement('div');
  root.className = 'cbst3-root';
  root.style.background = theme.background;
  root.style.setProperty('--cbst3-accent', accent);
  root.innerHTML = `
    <div class="cbst3-aurora"></div>
    <div class="cbst3-canvas"></div>
    <div class="cbst3-logo-lockup"></div>
    <div class="cbst3-glint"></div>
    <div class="cbst3-copy">
      <div class="cbst3-eyebrow">${escapeHTML(eyebrow)}</div>
      <h1 class="cbst3-title">${escapeHTML(title)}</h1>
      <p class="cbst3-subtitle">${escapeHTML(subtitle)}</p>
      ${cta ? `<div class="cbst3-cta">${escapeHTML(cta)}</div>` : ''}
    </div>
  `;
  document.body.appendChild(root);

  const canvasHost = root.querySelector('.cbst3-canvas');
  const logoEl = await mountLogo(root, logo);
  const glint = root.querySelector('.cbst3-glint');
  const eyebrowEl = root.querySelector('.cbst3-eyebrow');
  const titleEl = root.querySelector('.cbst3-title');
  const subtitleEl = root.querySelector('.cbst3-subtitle');
  const ctaEl = root.querySelector('.cbst3-cta');

  const stage = await createThreeStage(canvasHost, {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    camera: { fov: 33, z: 5.7 },
  });
  const object = buildStageObject(stage, { accent, role });

  let aborted = false;
  let dismissed = false;

  const introStart = role === 'intro'
    ? { rx: 0.42, ry: -0.92, rz: -0.16, z: -0.38, s: 0.54, y: -0.05 }
    : { rx: 0.18, ry: 0.38, rz: 0.04, z: -0.12, s: 0.88, y: 0.02 };
  const introEnd = role === 'intro'
    ? { rx: 0.10, ry: -0.17, rz: -0.02, z: 0.02, s: 1.0, y: -0.03 }
    : { rx: 0.12, ry: 0.13, rz: 0.01, z: 0.08, s: 1.03, y: -0.02 };

  gsap.set(object.group.rotation, { x: introStart.rx, y: introStart.ry, z: introStart.rz });
  gsap.set(object.group.position, { x: 0, y: introStart.y, z: introStart.z });
  gsap.set(object.group.scale, { x: introStart.s, y: introStart.s, z: introStart.s });
  gsap.set(logoEl, {
    opacity: 0,
    y: role === 'outro' ? -8 : 10,
    scale: role === 'outro' ? 0.96 : 0.92,
  });
  gsap.set([eyebrowEl, titleEl, subtitleEl, ctaEl].filter(Boolean), { opacity: 0 });
  gsap.set(glint, { opacity: 0, x: '-120%' });

  stage.start((_, elapsed) => {
    object.group.rotation.y += Math.sin(elapsed * 0.64) * 0.00065;
    object.group.rotation.x += Math.cos(elapsed * 0.55) * 0.00034;
    object.halo.material.opacity = 0.055 + Math.sin(elapsed * 1.1) * 0.012;
    object.ring.rotation.z += 0.0022;
  });

  await sleep(20);
  root.classList.add('on');

  async function timeline() {
    const tl = gsap.timeline();
    tl.to(object.group.scale, {
      x: introEnd.s, y: introEnd.s, z: introEnd.s,
      duration: role === 'outro' ? 1.25 : 1.75,
      ease: 'power3.out',
    }, 0.10);
    tl.to(object.group.rotation, {
      x: introEnd.rx, y: introEnd.ry, z: introEnd.rz,
      duration: role === 'outro' ? 1.45 : 1.95,
      ease: 'power3.out',
    }, 0.10);
    tl.to(object.group.position, {
      y: introEnd.y, z: introEnd.z,
      duration: 1.8,
      ease: 'power3.out',
    }, 0.10);
    tl.to(stage.camera.position, {
      z: role === 'outro' ? 4.95 : 4.75,
      duration: 2.05,
      ease: 'power3.out',
      onUpdate: () => stage.camera.lookAt(0, 0, 0),
    }, 0.16);
    tl.to(logoEl, {
      opacity: 1,
      y: role === 'outro' ? -96 : -70,
      scale: 1,
      duration: 0.92,
      ease: 'power3.out',
    }, role === 'outro' ? 0.58 : 0.92);
    tl.to(glint, {
      opacity: 0.82,
      x: '124%',
      duration: 1.2,
      ease: 'power2.inOut',
    }, 1.25);
    tl.to(glint, { opacity: 0, duration: 0.28, ease: 'power1.out' }, 2.28);
    tl.to(object.lights.blue, {
      intensity: role === 'outro' ? 1.2 : 2.35,
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
    }, 1.35);
    tl.to(eyebrowEl, {
      opacity: 1,
      y: 0,
      duration: 0.54,
      ease: 'power3.out',
    }, 2.05);
    tl.to(titleEl, {
      opacity: 1,
      y: 0,
      duration: 0.70,
      ease: 'power3.out',
    }, 2.18);
    tl.to(subtitleEl, {
      opacity: 1,
      y: 0,
      duration: 0.62,
      ease: 'power3.out',
    }, 2.36);
    if (ctaEl) {
      tl.to(ctaEl, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.62,
        ease: 'power3.out',
      }, 2.62);
    }
    tl.to(object.group.rotation, {
      y: introEnd.ry + (role === 'outro' ? 0.08 : 0.055),
      duration: 2.7,
      ease: 'sine.inOut',
    }, 3.05);
    await tl;
    if (aborted) return;
    await sleep(Math.max(900, duration * 1000 - 5200));
  }

  const animPromise = timeline();

  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try {
      gsap.killTweensOf(object.group.position);
      gsap.killTweensOf(object.group.rotation);
      gsap.killTweensOf(object.group.scale);
      gsap.killTweensOf(stage.camera.position);
      gsap.killTweensOf([logoEl, glint, eyebrowEl, titleEl, subtitleEl, ctaEl].filter(Boolean));
      gsap.killTweensOf([object.lights.blue, object.lights.orange, object.lights.key]);
    } catch (_) { /* tolerate */ }
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(480);
    try { stage.cleanup(); } catch (_) { /* tolerate */ }
    root.remove();
  }

  return { root, animPromise, dismiss };
}
