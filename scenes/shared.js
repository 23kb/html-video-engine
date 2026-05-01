// Shared helpers for per-chapter scene pages.
// Provides: mesh bg, start gate, BGM+ducking, narration, watermark,
// covers, and an audio-timecoded beat runner so animations stay in sync with TTS.

import {
  loadSnapshot as _loadSnapshot, runScene, cursor, sleep, type,
  zoomTo, highlight, clearHighlights, pointer as ptrOverlay, spotlight,
} from '../engine/engine.js';

const LOGO_MARK = '/assets/wpforms-logo.png';
const BGM_URL   = '/bgms/1.mp3';

// Per-video narration base. Player sets this before playing any narration.
// Falls back to /narration/ so legacy scenes keep working.
let narrationBase = '/narration/';
let narrationSpeed = 1;
let narrationVolume = 1;
export function setNarrationBase(base) {
  narrationBase = base.endsWith('/') ? base : base + '/';
}
export function setNarrationSpeed(speed = 1) {
  narrationSpeed = Math.max(0.75, Math.min(1.5, Number(speed) || 1));
}
export function setNarrationVolume(vol = 1) {
  narrationVolume = Math.max(0, Math.min(1, Number(vol) || 0));
}

// BGM_FULL is the unducked target. It's mutable so a manifest can override
// the default via `bgm: { volume: 0.30 }` — narration-unducking will then
// fade back to the manifest's target, not the hardcoded default.
let BGM_FULL = 0.42;
const BGM_DUCKED = 0.05;
let bgmEl = null;
let bgmFadeToken = 0;

function fadeVolume(el, target, ms = 400) {
  if (!el) return Promise.resolve();
  const token = ++bgmFadeToken;
  const start = el.volume, t0 = performance.now();
  return new Promise(resolve => {
    (function step(t){
      if (token !== bgmFadeToken) return resolve(); // cancelled by newer fade/set
      const k = Math.min(1, (t - t0) / ms);
      const next = start + (target - start) * k;
      el.volume = Math.max(0, Math.min(1, next));
      if (k < 1) requestAnimationFrame(step); else resolve();
    })(t0);
  });
}

function setBgmVolume(v) {
  bgmFadeToken++; // cancel any in-flight fade
  if (bgmEl) bgmEl.volume = Math.max(0, Math.min(1, v));
}

export async function stopBGM(ms = 1200) {
  if (!bgmEl) return;
  await fadeVolume(bgmEl, 0, ms);
  try { bgmEl.pause(); } catch {}
}

export async function startBGM(opts = {}) {
  // opts: { src?, volume?, startDelayMs?, seekMs? }  — manifest-driven overrides.
  //   startDelayMs — delay before track begins playing (silence at intro).
  //   seekMs       — where to start in the track (skip dead intro in music).
  const url = opts.src || BGM_URL;
  if (typeof opts.volume === 'number') BGM_FULL = Math.max(0, Math.min(1, opts.volume));
  bgmEl = new Audio(url);
  bgmEl.loop = true;
  bgmEl.volume = 0;
  if (typeof opts.seekMs === 'number' && opts.seekMs > 0) {
    try { bgmEl.currentTime = opts.seekMs / 1000; } catch {}
  }
  const begin = async () => {
    try { await bgmEl.play(); fadeVolume(bgmEl, BGM_FULL, 1200); }
    catch (e) { console.warn('BGM autoplay blocked', e); }
  };
  if (typeof opts.startDelayMs === 'number' && opts.startDelayMs > 0) {
    setTimeout(begin, opts.startDelayMs);
  } else {
    await begin();
  }
}

export async function playNarration(slug, { keepDucked = false } = {}) {
  const audio = new Audio(`${narrationBase}${slug}.mp3`);
  audio.volume = narrationVolume;
  audio.playbackRate = narrationSpeed;
  setBgmVolume(BGM_DUCKED);
  const ended = new Promise(resolve => {
    const done = () => {
      if (bgmEl && !keepDucked) fadeVolume(bgmEl, BGM_FULL, 3500);
      resolve();
    };
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('error', done, { once: true });
  });
  try { await audio.play(); }
  catch (e) { console.warn(`narration/${slug}.mp3 autoplay blocked`, e); }
  return { audio, ended };
}

export function restoreBGM() {
  if (bgmEl) fadeVolume(bgmEl, BGM_FULL, 1600);
}

export function mountMeshBg() {
  const m = document.createElement('div');
  m.className = 'mesh-bg';
  m.innerHTML = '<div class="grain"></div>';
  document.body.appendChild(m);
  return m;
}

export function mountWatermark() {
  if (document.getElementById('wpf-watermark')) return;
  const el = document.createElement('div');
  el.id = 'wpf-watermark';
  el.className = 'wpf-watermark';
  el.innerHTML = `<img src="${LOGO_MARK}" alt="WPForms">`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
}

export async function waitForStart(label = '▶ Start') {
  const g = document.createElement('div');
  g.className = 'start-gate';
  g.innerHTML = `<button class="start-btn">${label}</button>`;
  document.body.appendChild(g);
  await new Promise(resolve => g.addEventListener('click', resolve, { once: true }));
  g.classList.add('exit');
  setTimeout(() => g.remove(), 500);
}

export function mountCover({ cream = false, z = 650 } = {}) {
  const c = document.createElement('div');
  c.className = 'fade-cover' + (cream ? ' cream' : '');
  c.style.zIndex = z;
  document.body.appendChild(c);
  requestAnimationFrame(() => c.classList.add('on'));
  return c;
}
export async function dropCover(c, ms = 500) {
  c.classList.remove('on');
  await sleep(ms);
  c.remove();
}

// Audio-timecoded beat runner.
// Beats chain smoothly: one continuous camera, no zoom-out between beats.
// Each beat starts when audio.currentTime reaches `beat.at`.
export async function runBeatsAtTimes(audio, beats, { tailPad = 0.05, endPad = 0.1 } = {}) {
  if (!audio.duration || isNaN(audio.duration)) {
    await new Promise(r => audio.addEventListener('loadedmetadata', r, { once: true }));
  }
  const total = audio.duration;
  const doc = () => document.querySelector('iframe.ui').contentDocument;

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const nextAt = (i + 1 < beats.length) ? beats[i+1].at : (total - endPad);

    await waitForAudioAt(audio, beat.at);
    await clearHighlights({ fadeOut: 180 });

    const cam = beat.camera || {};
    if (cam.focus) {
      await zoomTo(Array.isArray(cam.focus) ? cam.focus : [cam.focus], {
        level:          cam.level ?? 2.2,
        pad:            cam.pad   ?? 14,
        smooth:         true,
        noScroll:       cam.noScroll ?? false,
        scrollBehavior: 'smooth',
      });
    }

    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
    const clearSpot = async () => { if (spotHandle) { await spotHandle(); spotHandle = null; } };

    for (const o of (beat.overlays || [])) {
      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
      else if (o.highlights) await highlight(o.highlights, { label: o.label, pad: o.pad ?? 10 });
      else if (o.highlight)  await highlight([o.highlight], { label: o.label, pad: o.pad ?? 10 });
    }

    if (beat.labelDwell) await sleep(beat.labelDwell * 1000);

    if (beat.effect) {
      if (!beat.keepLabels) await clearHighlights();
      await beat.effect({ doc: doc(), cursor, type, sleep, clearSpot, zoomTo });
    }

    // Hold until next beat should start
    await waitForAudioAt(audio, nextAt - tailPad);
    await clearSpot();
  }
}

function waitForAudioAt(audio, target) {
  return new Promise(resolve => {
    if (audio.currentTime >= target) return resolve();
    const tick = () => {
      if (audio.currentTime >= target || audio.ended) {
        audio.removeEventListener('timeupdate', tick);
        resolve();
      }
    };
    audio.addEventListener('timeupdate', tick);
    // Fallback tick in case timeupdate is sluggish
    const id = setInterval(() => {
      if (audio.currentTime >= target || audio.ended) { clearInterval(id); tick(); }
    }, 80);
  });
}

export async function loadSnapshot(slug) {
  await _loadSnapshot(slug);
  // loadSnapshot wipes body — remount mesh background
  mountMeshBg();
}

// Sequential beat runner — each beat plays its own narration clip, so animation
// auto-syncs to the voice. Beat ends when narration ends (plus any post hold).
export async function runBeatsSequential(beats, { postHold = 0.15 } = {}) {
  const doc = () => document.querySelector('iframe.ui').contentDocument;

  for (let bi = 0; bi < beats.length; bi++) {
    const beat = beats[bi];
    const isLast = bi === beats.length - 1;
    await clearHighlights({ fadeOut: 180 });

    // Keep BGM ducked across the sequence so it doesn't rise between beats.
    const narr = beat.narration ? await playNarration(beat.narration, { keepDucked: !isLast }) : null;

    const cam = beat.camera || {};
    if (cam.focus) {
      await zoomTo(Array.isArray(cam.focus) ? cam.focus : [cam.focus], {
        level:          cam.level ?? 2.2,
        pad:            cam.pad   ?? 14,
        smooth:         true,
        noScroll:       cam.noScroll ?? false,
        scrollBehavior: 'smooth',
      });
    }

    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
    const clearSpot = async () => { if (spotHandle) { await spotHandle(); spotHandle = null; } };
    const clearLabels = () => clearHighlights({ fadeOut: 200 });

    for (const o of (beat.overlays || [])) {
      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
      else if (o.highlights) await highlight(o.highlights, { label: o.label, pad: o.pad ?? 10 });
      else if (o.highlight)  await highlight([o.highlight], { label: o.label, pad: o.pad ?? 10 });
    }

    if (beat.labelDwell) await sleep(beat.labelDwell * 1000);

    if (beat.effect) {
      if (!beat.keepLabels) await clearHighlights();
      await beat.effect({ doc: doc(), cursor, type, sleep, clearSpot, clearLabels, zoomTo });
    }

    // Wait for the narration clip to finish before moving to next beat
    if (narr) await narr.ended;
    if (postHold) await sleep(postHold * 1000);

    await clearSpot();
  }
}

export { cursor, sleep };
