// Phase E.5 motion controller.
// Owns global pause/resume and chapter-boundary seek signals.

import * as frameDriver from './frame-driver.js';

let paused = false;
let pauseStartedAt = 0;
let seekTarget = null;
let currentChapterIndex = 0;
let chapterCount = 0;
let chapterNames = [];

const audioElements = new Set();
const cssAnimationFreezers = new Set();
const wallClockWaiters = new Set();

function expose() {
  if (typeof window === 'undefined') return;
  window.__hfPaused = paused;
  window.__hfPauseManager = {
    pause,
    resume,
    isPaused,
    seekToChapter,
    state,
  };
  try {
    document.body.dataset.currentChapterIndex = String(currentChapterIndex);
    document.body.dataset.chapterCount = String(chapterCount);
  } catch (_) {}
}

export function isPaused() {
  return paused;
}

export function state() {
  return {
    paused,
    seekTarget,
    currentChapterIndex,
    chapterCount,
    chapterNames: [...chapterNames],
    audio: [...audioElements].map((el) => ({
      currentTime: el?.currentTime ?? 0,
      paused: !!el?.paused,
      ended: !!el?.ended,
    })),
    cssAnimationCount: cssAnimationFreezers.size,
    frameDriverSize: frameDriver.registry.size,
  };
}

export function setChapterState({ index = currentChapterIndex, count = chapterCount, names = chapterNames } = {}) {
  currentChapterIndex = Number.isFinite(index) ? index : currentChapterIndex;
  chapterCount = Number.isFinite(count) ? count : chapterCount;
  chapterNames = Array.isArray(names) ? [...names] : chapterNames;
  expose();
}

export async function pause() {
  if (paused) return;
  paused = true;
  pauseStartedAt = performance.now();
  frameDriver.stop();
  try { window.gsap?.globalTimeline?.pause?.(); } catch (_) {}
  freezeIframeAnimations();
  pauseAllAudio();
  expose();
}

export async function resume() {
  if (!paused) return;
  const pausedMs = Math.max(0, performance.now() - pauseStartedAt);
  paused = false;
  resumeAllAudio();
  thawIframeAnimations();
  try { window.gsap?.globalTimeline?.resume?.(); } catch (_) {}
  shiftFrameDriverClock(pausedMs);
  frameDriver.start();
  releaseWallClockWaiters();
  expose();
}

export function pausableSleep(ms = 0) {
  const target = Math.max(0, Number(ms) || 0);
  return new Promise((resolve) => {
    let remaining = target;
    let lastResume = paused ? null : performance.now();
    let timer = null;

    const finish = () => {
      if (timer) clearTimeout(timer);
      wallClockWaiters.delete(tick);
      resolve();
    };

    const tick = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (seekTarget != null) return finish();
      if (paused) {
        if (lastResume != null) {
          remaining -= performance.now() - lastResume;
          lastResume = null;
        }
        wallClockWaiters.add(tick);
        return;
      }
      if (lastResume == null) lastResume = performance.now();
      const elapsed = performance.now() - lastResume;
      if (elapsed >= remaining) return finish();
      timer = setTimeout(tick, Math.min(remaining - elapsed, 33));
    };

    tick();
  });
}

export function registerAudio(el) {
  if (!el) return;
  audioElements.add(el);
  expose();
}

export function unregisterAudio(el) {
  audioElements.delete(el);
}

export function seekToChapter(index) {
  const n = Math.max(0, Number(index) || 0);
  seekTarget = n;
  if (paused) resume();
  releaseWallClockWaiters();
  expose();
}

export function consumeSeekTarget() {
  const t = seekTarget;
  seekTarget = null;
  expose();
  return t;
}

function releaseWallClockWaiters() {
  const waiters = [...wallClockWaiters];
  wallClockWaiters.clear();
  for (const waiter of waiters) {
    try { waiter(); } catch (_) {}
  }
}

function pauseAllAudio() {
  for (const el of audioElements) {
    if (!el || el.ended || el.paused) continue;
    el.dataset.hfWasPlaying = 'true';
    try { el.pause(); } catch (_) {}
  }
}

function resumeAllAudio() {
  for (const el of audioElements) {
    if (!el || el.ended || el.dataset.hfWasPlaying !== 'true') continue;
    delete el.dataset.hfWasPlaying;
    try { el.play().catch(() => {}); } catch (_) {}
  }
}

function freezeIframeAnimations() {
  const docs = [document];
  const iframe = document.querySelector('iframe.ui');
  try {
    if (iframe?.contentDocument) docs.push(iframe.contentDocument);
  } catch (_) {}
  for (const doc of docs) {
    const animations = [];
    try { animations.push(...doc.getAnimations({ subtree: true })); } catch (_) {}
    for (const anim of animations) {
      try {
        if (anim.playState === 'running') {
          anim.pause();
          cssAnimationFreezers.add(anim);
        }
      } catch (_) {}
    }
  }
}

function thawIframeAnimations() {
  for (const anim of cssAnimationFreezers) {
    try { anim.play(); } catch (_) {}
  }
  cssAnimationFreezers.clear();
}

function shiftFrameDriverClock(pausedMs) {
  if (!pausedMs) return;
  for (const entry of frameDriver.registry.values()) {
    if (entry && Number.isFinite(entry.t0)) entry.t0 += pausedMs;
  }
}

expose();
