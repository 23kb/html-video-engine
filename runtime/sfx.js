// UI sound design — file-based (real MP3s under /assets/sfx/).
//
// Channels:
//   click     — main mouse-click (on every cursor.click)
//   clickAlt  — alt bubbly click (use via playClickAlt() if a beat wants variety)
//   type      — per-keystroke tick during typeInto
//   hover     — pre-click "magnetic" affordance tick
//   swoosh    — every chapter break + snapshot swap
//   swooshEntry — special one-off: intro→first-chapter handoff only
//   swipe     — for the 'push' snapshot-swap
//   popUi     — highlight appear / card surface tick
//   popDrop   — drag-drop landing
//
// Why Web Audio instead of <audio> tags:
//   <audio>.play() has 50-200ms latency on each call, disallows true overlap,
//   and needs .cloneNode() hacks for rapid fire. Decoding once into an
//   AudioBuffer and spawning BufferSource nodes gives us zero-latency playback
//   and clean overlap for back-to-back clicks.
//
// Autoplay gate: AudioContext needs a user gesture before resume(). initSfx()
// is called from every start-gate handler. Before that, play*() silently
// no-ops so nothing throws in headless preview / autoplay-blocked contexts.

import { diag } from '../engine/diag.js';
import { OVERLAYS_CONFIG } from './overlays-config.js';

let ctx = null;
let enabled = false;
let master = null;

// Preloaded AudioBuffers, keyed by channel name.
const buffers = {};

// File manifest — channel name → URL. Adjusting a mapping is a one-liner.
const FILES = {
  click:       '/assets/sfx/click.mp3',
  clickAlt:    '/assets/sfx/click-alt.mp3',
  type:        '/assets/sfx/type.mp3',
  hover:       '/assets/sfx/hover.mp3',
  swoosh:      '/assets/sfx/swoosh.mp3',
  swooshEntry: '/assets/sfx/swoosh-entry.mp3',
  swipe:       '/assets/sfx/swipe.mp3',
  popUi:       '/assets/sfx/pop-ui.mp3',
  popDrop:     '/assets/sfx/pop-drop.mp3',
};

async function loadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sfx: fetch ${url} → ${res.status}`);
  const ab = await res.arrayBuffer();
  return await ctx.decodeAudioData(ab);
}

async function preload() {
  const entries = Object.entries(FILES);
  const results = await Promise.allSettled(entries.map(async ([k, url]) => {
    buffers[k] = await loadBuffer(url);
  }));
  const failed = results
    .map((r, i) => r.status === 'rejected' ? entries[i][0] : null)
    .filter(Boolean);
  if (failed.length) diag('sfx', 'some channels failed to load', { failed });
  else diag('sfx', 'all channels loaded', { count: entries.length });
}

export function initSfx() {
  if (ctx) return; // idempotent
  const cfg = OVERLAYS_CONFIG.sfx || {};
  if (cfg.enabled === false) { diag('sfx', 'disabled by config'); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = cfg.masterVolume ?? 0.9;
    master.connect(ctx.destination);
    if (ctx.state === 'suspended') ctx.resume();
    enabled = true;
    diag('sfx', 'initialised', { state: ctx.state, master: master.gain.value });
    // Kick off preload in the background — play*() calls that arrive before
    // a buffer is ready will no-op silently.
    preload();
  } catch (e) {
    diag('sfx', 'init failed', { err: String(e) });
  }
}

export function setSfxEnabled(on) {
  enabled = !!on && ctx !== null;
}

function live() { return enabled && OVERLAYS_CONFIG.sfx?.enabled !== false; }

function applyMaster() {
  const cfg = OVERLAYS_CONFIG.sfx || {};
  if (master) master.gain.setValueAtTime(cfg.masterVolume ?? 0.9, ctx.currentTime);
}

// Core playback: grab preloaded buffer, route through a per-channel gain,
// fire immediately. Multiple in-flight shots overlap cleanly.
//
// If the buffer isn't loaded yet (first click right after init, before the
// preload settles), poll briefly up to ~400ms — files are tiny, decode is
// usually <80ms, so this covers the race without blocking real runs.
function play(channel, { volume = 1, rate = 1 } = {}) {
  if (!live()) return;
  const buf = buffers[channel];
  if (!buf) {
    let tries = 0;
    const iv = setInterval(() => {
      if (!live() || tries++ > 20) { clearInterval(iv); return; }
      if (buffers[channel]) { clearInterval(iv); play(channel, { volume, rate }); }
    }, 20);
    return;
  }
  applyMaster();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(g); g.connect(master);
  src.start();
}

// ── Public channel functions ──────────────────────────────────────────
// Each reads its per-channel volume from config so motion-lab can tune live.

export function playClick() {
  const cfg = OVERLAYS_CONFIG.sfx?.click || {};
  play('click', { volume: cfg.volume ?? 0.9 });
}

export function playClickAlt() {
  const cfg = OVERLAYS_CONFIG.sfx?.clickAlt || {};
  play('clickAlt', { volume: cfg.volume ?? 0.8 });
}

export function playType() {
  const cfg = OVERLAYS_CONFIG.sfx?.type || {};
  // Randomise rate slightly so 10 keystrokes don't sound identical.
  const rate = 0.92 + Math.random() * 0.16;
  play('type', { volume: cfg.volume ?? 0.55, rate });
}

export function playHover() {
  const cfg = OVERLAYS_CONFIG.sfx?.hover || {};
  play('hover', { volume: cfg.volume ?? 0.6 });
}

export function playSwoosh() {
  const cfg = OVERLAYS_CONFIG.sfx?.swoosh || {};
  play('swoosh', { volume: cfg.volume ?? 0.7 });
}

// Special one-shot for intro → first-chapter handoff. Only called from the
// player once, not on every transition.
export function playSwooshEntry() {
  const cfg = OVERLAYS_CONFIG.sfx?.swooshEntry || {};
  play('swooshEntry', { volume: cfg.volume ?? 0.8 });
}

export function playSwipe() {
  const cfg = OVERLAYS_CONFIG.sfx?.swipe || {};
  play('swipe', { volume: cfg.volume ?? 0.7 });
}

export function playPop() {
  // "Drop/landing" default — used by drag.js.
  const cfg = OVERLAYS_CONFIG.sfx?.pop || {};
  play('popDrop', { volume: cfg.volume ?? 0.9 });
}

export function playPopUi() {
  const cfg = OVERLAYS_CONFIG.sfx?.popUi || {};
  play('popUi', { volume: cfg.volume ?? 0.7 });
}
