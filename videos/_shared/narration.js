// videos/_shared/narration.js
//
// Portable narration + BGM + ducking helpers for single-HTML tutorial videos.
// No engine/runtime imports; if a pause manager exposes audio registration on
// window, this module uses it, otherwise the calls are no-ops.
//
// ── THE NARRATION-SYNC MAP (fix-round B8) — check BEFORE writing sync code ──
// Three mechanisms coexist; do not invent a fourth:
//   1. `captionWordStarts` / `showCaptionWords` (THIS file) — WORD-CAPTION
//      pacing: word start times spread across the measured DUR entry; the
//      shorts word-by-word captions run on it.
//   2. `spokenAt` (shorts-kit.js) — WORD-ESTIMATE inside a clip: reuses
//      captionWordStarts to answer "when does the TTS say this word", for
//      standalone accents (slams, label pulses). Physics chains sequence off
//      ARRIVAL, never off spokenAt — one element never has two owners (sfb 16).
//   3. anti-spam's video-local `beatC` / `window.__capChunks` — CHUNK-level
//      caption+cursor sync engine. Lives in exactly ONE video
//      (videos/anti-spam-5-layers/index.html). Promote it HERE when a SECOND
//      long-form needs chunk-level sync (as 12's promotion condition) — not
//      before.

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

// ── Hardened caption/beat helpers ─────────────────────────────────────────
//
// The master flow of a single-HTML video must NEVER await a raw GSAP tween:
// under an RAF-throttled context (hidden tab, in-app Browser pane) the ticker
// freezes and the await deadlocks the whole video. These helpers resolve all
// waits via setTimeout, fire motion fire-and-forget, and build the
// `__sched` instrumentation push (consumed by tools/render-singlehtml-audio.js)
// into say() so per-video copies can't drift.

/** setTimeout-backed sleep — safe to await anywhere. */
export const wait = s => new Promise(r => setTimeout(r, s * 1000));

/**
 * Await a primitive with a hard timeout so a stalled tween can't hang the
 * master flow. Rejections are swallowed; the race winner is discarded.
 *
 * @param {Promise|any} promise
 * @param {number} [seconds=2.5]
 * @returns {Promise<void>}
 */
export function withTimeout(promise, seconds = 2.5) {
  return Promise.race([Promise.resolve(promise).catch(() => {}), wait(seconds)]);
}

function defaultCaptionEl() {
  return document.getElementById('caption');
}

/** Show the caption text with the standard rise-in (fire-and-forget). */
export function showCaption(text, { captionEl = defaultCaptionEl() } = {}) {
  if (!captionEl) return;
  killCaptionWordsTl();
  captionEl.textContent = text;
  if (typeof gsap === 'undefined') { captionEl.style.opacity = '1'; return; }
  gsap.killTweensOf(captionEl);
  gsap.fromTo(captionEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
}

// ── Word-by-word captions (shorts) ────────────────────────────────────────
//
// The shorts path shows captions word by word, paced across the narration
// clip, instead of dropping the whole line at once. Hidden words keep their
// layout slot (autoAlpha), so line breaks are stable — text never reflows
// while words appear. Opt-in via `captionMode: 'words'` on say()/beat();
// classic block captions stay the default for long-form videos.

let captionWordsTl = null;

function killCaptionWordsTl() {
  if (captionWordsTl) { captionWordsTl.kill(); captionWordsTl = null; }
}

/**
 * Compute per-word reveal start times (seconds from clip start) spread
 * across the clip, weighted by word length; punctuation stretches the gap
 * to the following word. Deterministic — no randomness.
 *
 * Exported (shorts fix round 2026-08-13): the keyword-slam vocabulary in
 * shorts-kit.js syncs hero type moments to the TTS naming them by reusing
 * THIS pacing model — one sync mechanism, shared with the word captions,
 * never reinvented.
 *
 * @param {string[]} words
 * @param {number} durS — measured clip duration
 * @returns {number[]}
 */
export function captionWordStarts(words, durS) {
  const lead = 0.12;
  const tail = Math.min(0.6, durS * 0.12);
  const window_ = Math.max(0.6, durS - lead - tail);
  const weights = words.map(w => w.length + 2 + (/[.,;:!?…—–]$/.test(w) ? 5 : 0));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  return weights.map(w => {
    const start = lead + window_ * (cum / total);
    cum += w;
    return start;
  });
}

/**
 * Show a caption revealing word by word across the narration clip.
 * Fire-and-forget — never awaited by the master flow (RAF-hardening
 * contract: a throttled tab freezes the reveal, never the video).
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {HTMLElement} [opts.captionEl]
 * @param {number} [opts.durS=4] — measured clip duration (DUR table)
 * @param {number[]} [opts.times] — exact per-word start times (seconds from
 *   clip start, e.g. from TTS alignment data); overrides the computed pacing
 *   when its length matches the word count
 */
export function showCaptionWords(text, { captionEl = defaultCaptionEl(), durS = 4, times = null } = {}) {
  if (!captionEl) return;
  killCaptionWordsTl();
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (typeof gsap === 'undefined' || !words.length) {
    captionEl.textContent = text;
    captionEl.style.opacity = '1';
    return;
  }
  gsap.killTweensOf(captionEl);
  captionEl.textContent = '';
  const spans = words.map((w, i) => {
    if (i) captionEl.appendChild(document.createTextNode(' '));
    const s = document.createElement('span');
    s.textContent = w;
    s.style.display = 'inline-block';   // transforms don't apply to inline elements
    captionEl.appendChild(s);
    return s;
  });
  const starts = (Array.isArray(times) && times.length === words.length)
    ? times.map(t => Math.max(0, Number(t) || 0))
    : captionWordStarts(words, durS);
  // Park initial state at parse (seek-trap #1), then one timeline with a
  // function-based stagger — each word rises into its reserved slot.
  gsap.set(captionEl, { autoAlpha: 1, y: 0 });
  gsap.set(spans, { autoAlpha: 0, y: 12, scale: 0.94 });
  captionWordsTl = gsap.timeline();
  captionWordsTl.to(spans, {
    autoAlpha: 1, y: 0, scale: 1,
    duration: 0.22, ease: 'back.out(1.6)',
    stagger: i => starts[i],
  }, 0);
}

/**
 * Fade the caption out. Fires the tween but resolves via setTimeout — an
 * RAF-throttled tab must never deadlock the master flow.
 *
 * @param {HTMLElement} [captionEl]
 * @returns {Promise<void>}
 */
export function hideCaption(captionEl = defaultCaptionEl()) {
  killCaptionWordsTl();
  if (captionEl) {
    if (typeof gsap === 'undefined') captionEl.style.opacity = '0';
    else gsap.to(captionEl, { opacity: 0, duration: 0.3, ease: 'power2.in' });
  }
  return wait(0.32);
}

/**
 * Fire one narration cue: push the `__sched` record (when `__T0` is set),
 * show the caption, start the clip non-blocking.
 *
 * @param {string} slug — video slug (narration base)
 * @param {string} key — clip basename
 * @param {string} text — caption copy
 * @param {Object} [opts]
 * @param {HTMLElement} [opts.captionEl]
 * @param {string} [opts.captionMode] — 'words' reveals the caption word by
 *   word across the clip (shorts); default is the classic block rise-in
 * @param {Object} [opts.durTable] — clip durations, required for word pacing
 * @param {boolean} [opts.clearAfter=false] — hide the caption when the clip
 *   ends (durTable[key], default 4s), the way beat() does.
 *
 * ⚠ LIFECYCLE ASYMMETRY: say() paints the caption and NEVER clears it by
 *   default — beat() does (it awaits the clip, then hideCaption()). A say()'d
 *   caption rides into everything that follows until something hides it
 *   (receipt cpa 12: an intro caption rode through the whole postIntro). Pass
 *   `clearAfter: true`, or call hideCaption() yourself at the right beat.
 */
export function say(slug, key, text, { captionEl = defaultCaptionEl(), captionMode, durTable, clearAfter = false } = {}) {
  const beatT0 = performance.now();
  if (window.__T0 != null) (window.__sched || (window.__sched = [])).push({ key, t: (performance.now() - window.__T0) / 1000 });
  if (captionMode === 'words') {
    showCaptionWords(text, { captionEl, durS: (durTable && durTable[key]) || 4 });
  } else {
    showCaption(text, { captionEl });
  }
  playNarration(slug, key).catch(() => {});
  // Opt-in clear at clip end (setTimeout-resolved — never awaited by the
  // master flow, so an RAF-throttled tab cannot deadlock on it).
  if (clearAfter) wait((durTable && durTable[key]) || 4).then(() => hideCaption(captionEl));
}

/**
 * A narration beat: caption + audio, optional concurrent motion, holds for
 * the clip length, then clears the caption (unlike say(), which leaves its
 * caption up — see the lifecycle note there). Motion runs fire-and-forget —
 * a slow or stalled primitive can never extend or deadlock the beat.
 *
 * Instrumentation: when the motion settles, `window.__beatStats[key]` records
 * `{ motionS, durS, overrun }` — a motionFn outliving its clip is the
 * "trailing camReset fires during the NEXT beat's scroll" QC class, invisible
 * without this. Consumed by tools/smoke-singlehtml.js (warns on overrun
 * > 0.5s). Recording is fire-and-forget and never affects beat timing.
 *
 * @param {string} slug
 * @param {string} key
 * @param {string} text
 * @param {Function} [motionFn]
 * @param {Object} [opts]
 * @param {Object} [opts.durTable] — clip durations in seconds, keyed by cue
 * @param {HTMLElement} [opts.captionEl]
 * @param {string} [opts.captionMode] — 'words' for word-by-word captions
 * @returns {Promise<void>}
 */
export async function beat(slug, key, text, motionFn, { durTable, captionEl = defaultCaptionEl(), captionMode } = {}) {
  // Clip clock. MUST live here: at() below closes over it, and say()'s own
  // local of the same name is NOT in scope from this function — reading it
  // threw a ReferenceError that motionFn's .catch() swallowed, so every
  // `async (at) =>` motionFn silently aborted on its first at() call
  // (found 2026-09-04 wiring the first film to the cpa 11 rule; no shipped
  // film had used `at` yet, so nothing regressed — it had simply never run).
  const beatT0 = performance.now();
  say(slug, key, text, { captionEl, captionMode, durTable });
  const durS = (durTable && durTable[key]) || 4;
  // Spoken-sync clock (pipeline default, acceptance T-1): motionFn receives
  // at(word, { occurrence, lead }) — seconds to WAIT from now until the TTS
  // speaks that word. Reuses the captionWordStarts model (sync map #1).
  let at = null;
  if (text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const starts = captionWordStarts(words, durS);
    const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    at = (word, { occurrence = 1, lead = 0 } = {}) => {
      const needle = norm(String(word).trim().split(/\s+/)[0]);
      let t = 0, seen = 0;
      for (let i = 0; i < words.length; i++) {
        if (needle && norm(words[i]).includes(needle)) { seen++; if (seen >= occurrence) { t = starts[i]; break; } }
      }
      const elapsed = (performance.now() - beatT0) / 1000;
      return Math.max(t - lead - elapsed, 0);
    };
  }
  if (motionFn) {
    const t0 = performance.now();
    Promise.resolve().then(() => motionFn(at)).catch(() => {}).then(() => {
      const motionS = (performance.now() - t0) / 1000;
      (window.__beatStats || (window.__beatStats = {}))[key] = {
        motionS: +motionS.toFixed(2), durS, overrun: +(motionS - durS).toFixed(2),
      };
    });
  }
  await wait(durS);
  await hideCaption(captionEl);
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
