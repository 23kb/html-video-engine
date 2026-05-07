// Transition styles — chapter-break camera moves and snapshot-swap covers.
//
// A chapter-break runs when a chapter boundary is crossed on the SAME
// snapshot (no DOM change). It gives the viewer a micro-pause so the next
// beat lands with intent instead of feeling like one long take.
//
// A swap transition wraps engine.loadSnapshot so we can style the moment of
// DOM replacement — cream cover fade, whip blur, push slide, etc.
//
// Both layers read from manifest.defaults and per-descriptor overrides.
// Styles register by name; adding a new one is a one-liner (and a registry
// entry). No chapter should inline a transition in an effect().

import { sleep, cameraState, setCameraTransform } from '../engine/engine.js';
import { diag } from '../engine/diag.js';
import { playSwoosh, playSwipe } from './sfx.js';

// ── Chapter-break styles ───────────────────────────────────────────────────
// Each takes no args (it reads from the iframe element directly) and plays
// whatever motion suits it. Returns when the break animation is done.

function ifr() { return document.querySelector('iframe.ui'); }
function currentZoom() {
  try { return cameraState().zoom || 1; } catch (_) { return 1; }
}

async function dolly() {
  const el = ifr();
  if (!el) return;
  if (Math.abs(currentZoom() - 1) < 0.02) return;
  setCameraTransform({ zoom: 1, tx: 0, ty: 0, duration: 700 });
  await sleep(750);
  await sleep(200); // establishing-shot hold
}

async function softDolly() {
  const el = ifr();
  if (!el) return;
  if (Math.abs(currentZoom() - 1) < 0.02) return;
  setCameraTransform({ zoom: 1, tx: 0, ty: 0, duration: 420, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
  await sleep(440);
  // No establishing hold — next focusOn begins immediately.
}

async function whip() {
  // Stay in zoom. A flicker of blur + tiny rotation sells the cut so the
  // next focusOn feels like a new angle, not a continuation.
  const el = ifr();
  if (!el) return;
  const prevFilter = el.style.filter;
  const prevTransition = el.style.transition;
  el.style.transition = 'filter 180ms ease, transform 180ms ease';
  el.style.filter = 'blur(6px) brightness(1.08)';
  await sleep(180);
  el.style.filter = prevFilter || '';
  el.style.transition = prevTransition || '';
  await sleep(100);
}

// Stay in zoom; let the smooth-pan focusOn do the work. Use when you trust
// sameChapter continuity but want a chapter-break stamp in the HUD without
// any camera punctuation.
async function hold() {
  await sleep(240);
}

// Glide — zero break, zero pause. The NEXT chapter's focusOn fires as if
// the previous chapter never ended, so the camera smoothly pans from the
// current framing to the new target. Use this when two chapters live on
// the same screen (e.g. inside the form builder) and you want the cut to
// feel like a single continuous shot. No sound (not even the swoosh),
// no sleep — the engine's smooth-pan IS the transition.
async function glide() {
  // Intentionally empty. Preserving current zoom/translate is what sells
  // the continuity; runChapterBreak suppresses the swoosh for this style.
}

const CHAPTER_BREAKS = { dolly, 'soft-dolly': softDolly, whip, hold, glide };

export async function runChapterBreak(style = 'dolly') {
  const fn = CHAPTER_BREAKS[style] || CHAPTER_BREAKS.dolly;
  diag('transition', 'chapter-break: ' + style);
  // No swoosh for `hold` / `glide` — both are meant to be silent (glide is
  // "scene flows straight into next"; the next focusOn is the transition).
  if (style !== 'hold' && style !== 'glide') playSwoosh();
  await fn();
}

// ── Snapshot-swap styles ───────────────────────────────────────────────────
// A swap style is a wrapper around the actual DOM-replacement work. It takes
// an async `doSwap()` callback (engine.loadSnapshot + stage chrome re-mount +
// prep) and decides how the bracketing cover/animation plays.
//
// Every style MUST end with the incoming snapshot fully visible and the stage
// chrome re-mounted — callers (scene-helpers.swapSnapshot) expect that.

// Why a new iframe is built on swap: engine.loadSnapshot does
// `document.body.innerHTML = ...` which replaces the whole stage. During
// that wipe + iframe-load wait, the viewer MUST see something. A big
// opaque cream panel for 1–2s reads as "the page reloaded." We reduce
// that by (a) fading the outgoing iframe out instead of slamming a cover
// over it, (b) keeping the cover layer only as a flash-guard (invisible
// to the viewer unless there's actually a flash), (c) crossfading the
// incoming iframe in from 0 once it's rendered. The viewer sees: screen
// fades through cream → new view resolves in. No reload-flash.

// Helper: mount a full-screen cover at z:999. Default: instant opacity 1,
// since the cover is a flash guard, not a visual effect — we don't want the
// viewer watching a cream panel FADE IN across the old content.
function mountCover({ bg, opacity = 1, fadeInMs = 0 } = {}) {
  const c = document.createElement('div');
  c.className = 'swap-cover';
  c.style.cssText =
    'position:fixed;inset:0;z-index:999;' +
    'background:' + (bg || 'var(--cover-color, #FAF6EF)') + ';' +
    'opacity:0;pointer-events:none;transition:opacity ' + fadeInMs + 'ms ease-out;';
  document.body.appendChild(c);
  void c.offsetWidth;
  c.style.opacity = String(opacity);
  return c;
}

async function dropCover(c, { fadeMs = 280, hold = 300 } = {}) {
  if (!c) return;
  c.style.transition = 'opacity ' + fadeMs + 'ms ease-out';
  c.style.opacity = '0';
  await sleep(hold);
  c.remove();
}

// Fade the CURRENT iframe to 0 before doSwap body-wipes it. Gives a soft
// "dissolve out" of the outgoing view instead of a flash-cut. Returns
// after the fade completes.
async function fadeOutIframe(ms = 240) {
  const el = ifr();
  if (!el) return;
  el.style.transition = 'opacity ' + ms + 'ms ease-out';
  el.style.opacity = '0';
  await sleep(ms + 20);
}

// After doSwap, the new iframe element exists but starts at default
// opacity. Force 0 then transition to 1 so it "resolves in" over the
// cover fade-out. Must run AFTER the cover is mounted (so the 0-opacity
// iframe is covered during the flip).
function primeIframeFadeIn() {
  const el = ifr();
  if (!el) return () => {};
  el.style.transition = 'none';
  el.style.opacity = '0';
  void el.offsetWidth;
  return (ms = 320) => {
    el.style.transition = 'opacity ' + ms + 'ms ease-out';
    el.style.opacity = '1';
  };
}

// Plain cream crossfade — baseline. Outgoing iframe fades out while a
// flash-guard cover is up; incoming iframe fades in as cover fades out.
async function swapCover(doSwap) {
  await fadeOutIframe(240);
  const cover = mountCover();               // flash-guard; invisible "slam" since old iframe is already at 0
  await doSwap();
  const fadeIn = primeIframeFadeIn();
  await sleep(60);
  fadeIn(320);
  await dropCover(cover, { fadeMs: 320, hold: 340 });
}

// Faster version — same choreography, trimmed timings.
async function swapFast(doSwap) {
  await fadeOutIframe(160);
  const cover = mountCover();
  await doSwap();
  const fadeIn = primeIframeFadeIn();
  await sleep(30);
  fadeIn(220);
  await dropCover(cover, { fadeMs: 220, hold: 240 });
}

// Whip — light blur + dim on outgoing, swap under cover, incoming un-blurs
// in. Blur kept LIGHT (2px) so it reads as a cinematic cut, not a glitch.
async function swapWhip(doSwap) {
  const el = ifr();
  if (el) {
    el.style.transition = 'filter 180ms ease, opacity 180ms ease';
    el.style.filter = 'blur(2px)';
    el.style.opacity = '0';
  }
  await sleep(200);
  const cover = mountCover();
  await doSwap();
  const post2 = ifr();
  if (post2) {
    post2.style.transition = 'none';
    post2.style.filter = 'blur(2px)';
    post2.style.opacity = '0';
    void post2.offsetWidth;
    post2.style.transition = 'filter 280ms ease, opacity 280ms ease';
    post2.style.filter = 'none';
    post2.style.opacity = '1';
  }
  await sleep(60);
  await dropCover(cover, { fadeMs: 260, hold: 280 });
}

// Push — cover slides off to reveal the new view. Used when a motion cue
// is desired instead of a fade.
async function swapPush(doSwap) {
  await fadeOutIframe(180);
  const cover = mountCover();
  await doSwap();
  primeIframeFadeIn()(280);                 // reveal incoming as the cover slides off
  await sleep(40);
  cover.style.transition = 'transform 480ms cubic-bezier(0.65, 0, 0.35, 1), opacity 480ms ease';
  cover.style.transform = 'translateX(-100%)';
  cover.style.opacity = '0.92';
  await sleep(520);
  cover.remove();
}

// Morph — the "premium, single-shot" swap. Captures the outgoing iframe's
// transform (zoom + translate) and re-applies it to the incoming iframe so
// the viewer's framing survives the DOM swap. Combined with `glide` on
// chapter-breaks, this means the camera never pulls back, never flashes,
// never resets — the new content materializes inside the same shot and
// the next focusOn pans from there.
async function swapMorph(doSwap) {
  const oldEl = ifr();
  const savedTransform = oldEl ? (oldEl.style.transform || '') : '';
  const savedOrigin    = oldEl ? (oldEl.style.transformOrigin || '') : '';

  await fadeOutIframe(180);
  const cover = mountCover();
  await doSwap();

  // Re-apply the captured camera to the freshly-loaded iframe so the new
  // content boots into the same framing. Any subsequent focusOn pans
  // smoothly from here — no jump, no reset.
  const newEl = ifr();
  if (newEl && savedTransform) {
    newEl.style.transition = 'none';
    newEl.style.transformOrigin = savedOrigin || 'center top';
    newEl.style.transform = savedTransform;
    void newEl.offsetWidth;
  }

  const fadeIn = primeIframeFadeIn();
  await sleep(30);
  fadeIn(260);
  await dropCover(cover, { fadeMs: 260, hold: 280 });
}

async function swapFlipBridge(doSwap) {
  await doSwap();
}

const SWAPS = { cover: swapCover, fast: swapFast, whip: swapWhip, push: swapPush, morph: swapMorph, flipBridge: swapFlipBridge };

export async function runSwapTransition(style, doSwap) {
  const fn = SWAPS[style] || SWAPS.cover;
  diag('transition', 'swap: ' + style);
  // 'push' gets its own swipe sound; every other style rides the default swoosh.
  if (style === 'push') playSwipe();
  else                  playSwoosh();
  await fn(doSwap);
}

export const transitionStyles = {
  chapterBreak: Object.keys(CHAPTER_BREAKS),
  swap: Object.keys(SWAPS),
};
