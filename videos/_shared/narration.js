// videos/_shared/narration.js
//
// Portable narration + BGM + ducking helpers for single-HTML tutorial videos.
// No engine/runtime imports; if a pause manager exposes audio registration on
// window, this module uses it, otherwise the calls are no-ops.

/* eslint-env browser */
/* global gsap */

const DEFAULT_BGM_DUCKED = 0.05;

let narrationBaseOverride = null;
let narrationVolume = 1;
let bgmFullVolume = 0.3;
let bgmDuckedVolume = DEFAULT_BGM_DUCKED;
let bgmAudio = null;
let bgmTween = null;
const activeNarration = new Set();

/**
 * Set the narration MP3 base path. Pass null to restore the default
 * `/videos/<slug>/narration/` behavior used by `playNarration(slug, key)`.
 *
 * @param {string|null} path
 */
export function setNarrationBase(path) {
  narrationBaseOverride = path ? normalizeBase(path) : null;
}

/**
 * Load an optional narration manifest from `/videos/<slug>/narration/`.
 * Returns null on 404 or malformed JSON so videos can remain file-list-only.
 *
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export function loadNarrationManifest(slug) {
  const url = `${defaultNarrationBase(slug)}manifest.json`;
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return resolve(null);
      try { resolve(JSON.parse(xhr.responseText)); }
      catch (_) { resolve(null); }
    };
    xhr.onerror = () => resolve(null);
    xhr.send();
  });
}

/**
 * Start looping background music and fade it to the target volume.
 *
 * @param {string} src
 * @param {Object} [opts]
 * @param {number} [opts.volume=0.3]
 * @param {number} [opts.fadeIn=800] — milliseconds
 * @returns {Promise<HTMLAudioElement>}
 */
export async function startBGM(src, opts = {}) {
  const { volume = 0.3, fadeIn = 800 } = opts;
  await stopBGM({ fadeOut: 0 });
  bgmFullVolume = clamp01(volume);
  bgmAudio = new Audio(src);
  bgmAudio.loop = true;
  bgmAudio.volume = 0;
  registerAudio(bgmAudio);
  try { await bgmAudio.play(); }
  catch (e) { console.warn('BGM playback blocked', e); }
  fadeAudio(bgmAudio, bgmFullVolume, fadeIn);
  return bgmAudio;
}

/**
 * Stop and unregister the active BGM track.
 *
 * @param {Object} [opts]
 * @param {number} [opts.fadeOut=600] — milliseconds
 * @returns {Promise<void>}
 */
export async function stopBGM(opts = {}) {
  const { fadeOut = 600 } = opts;
  if (!bgmAudio) return;
  const audio = bgmAudio;
  await fadeAudio(audio, 0, fadeOut);
  try { audio.pause(); } catch (_) {}
  unregisterAudio(audio);
  if (bgmAudio === audio) bgmAudio = null;
}

/**
 * Play one narration clip and duck BGM while it speaks.
 *
 * @param {string} slug — video slug, unless a narration base override is set
 * @param {string} key — mp3 basename without extension
 * @param {Object} [opts]
 * @param {boolean} [opts.keepDucked=false] — leave BGM ducked after this clip
 * @param {number} [opts.volume=1]
 * @returns {Promise<void>} resolves when the clip ends or errors
 */
export async function playNarration(slug, key, opts = {}) {
  if (typeof key === 'object' && key !== null) {
    opts = key;
    key = slug;
    slug = '';
  }
  const { keepDucked = false, volume = narrationVolume } = opts;
  const audio = new Audio(narrationUrl(slug, key));
  audio.volume = clamp01(volume);
  activeNarration.add(audio);
  registerAudio(audio);
  if (bgmAudio) fadeAudio(bgmAudio, bgmDuckedVolume, 180);
  const ended = new Promise(resolve => {
    const done = () => {
      activeNarration.delete(audio);
      unregisterAudio(audio);
      if (bgmAudio && !keepDucked && activeNarration.size === 0) {
        fadeAudio(bgmAudio, bgmFullVolume, 3500);
      }
      resolve();
    };
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('error', done, { once: true });
  });
  try { await audio.play(); }
  catch (e) { console.warn(`narration clip playback blocked: ${key}`, e); }
  return ended;
}

/**
 * Stop all narration/BGM audio and release references.
 */
export async function cleanupAudio() {
  for (const audio of [...activeNarration]) {
    try { audio.pause(); } catch (_) {}
    unregisterAudio(audio);
  }
  activeNarration.clear();
  await stopBGM({ fadeOut: 0 });
}

export function setNarrationVolume(volume = 1) {
  narrationVolume = clamp01(volume);
}

export function setBgmDuckVolume(volume = DEFAULT_BGM_DUCKED) {
  bgmDuckedVolume = clamp01(volume);
}

function narrationUrl(slug, key) {
  const base = narrationBaseOverride || defaultNarrationBase(slug);
  return `${base}${key}.mp3`;
}

function defaultNarrationBase(slug) {
  return `/videos/${slug}/narration/`;
}

function normalizeBase(path) {
  return path.endsWith('/') ? path : path + '/';
}

function fadeAudio(audio, target, ms) {
  if (!audio) return Promise.resolve();
  if (bgmTween) bgmTween.kill();
  const duration = Math.max(0, ms || 0) / 1000;
  if (!duration || typeof gsap === 'undefined') {
    audio.volume = clamp01(target);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    bgmTween = gsap.to(audio, {
      volume: clamp01(target),
      duration,
      ease: 'sine.inOut',
      onComplete: resolve,
    });
  });
}

function registerAudio(audio) {
  const pm = window.__pauseManager || window.__hfPauseManager;
  if (pm && typeof pm.registerAudio === 'function') pm.registerAudio(audio);
}

function unregisterAudio(audio) {
  const pm = window.__pauseManager || window.__hfPauseManager;
  if (pm && typeof pm.unregisterAudio === 'function') pm.unregisterAudio(audio);
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
