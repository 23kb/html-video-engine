// videos/_shared/shorts-kit.js
//
// The 9:16 shorts motion vocabulary — the creative charter (ratified by Umair
// 2026-08-13, docs/shorts-qc-2026-08-13.md) shipped as working code, not
// prose. A short is an ad-style spot that teaches: full kinetic on real
// product UI, every hold carried by a consequence, hero type synced to the
// TTS, animated Sullie bookends. Standing rule: motion docs need code —
// this module IS the doc.
//
// Composes the existing libraries; it does not reinvent them:
//   camera   → IframeManager.cameraToElement / tweenCamera (decomposed here
//              into attack profiles — never a single-tween camera move)
//   cursor   → the Cursor class (passed in; never hand-mounted)
//   loops    → boundedRepeats (never repeat: -1)
//   slam sync→ captionWordStarts from narration.js — the SAME pacing model
//              the word captions use, so type moments land as the TTS says
//              the word
//   brand    → real assets only: /assets/wordmark.svg +
//              /assets/sullie-with-arms.svg (official Sullie)
//
// Every function here is deterministic (INV-9): no Date.now, no unseeded
// randomness, no infinite repeats, no fetch.
//
// Consumed by the 9:16 short skeleton — clone
// that, don't import this piecemeal into landscape work (landscape has its
// own vocabulary in motion-primitives/effects).
//
// ── The carrier law (A1 — full tables in docs/vertical-shorts.md) ──────────
// An area-visible event every ~2s during any hold, on 3 axes at once:
// amplitude ≥4px · area as fraction of FRAME · contrast on the top surface.
// Proven carriers: camera moves, band/card jitters ≥4px, full-frame washes,
// sheen sweeps, build cascades, slams/stamps. Cursors/fades/rings/typed
// text/sub-60px-per-s drift are NOT carriers.
//
// ── Authoring hazards (fix-round A5 — each measured in the shorts round) ───
// · motionFn exceptions are SWALLOWED by the beat wrapper's fire-and-forget
//   contract: a ReferenceError kills the beat silently with ZERO console
//   errors. Bisect with checkpoint console.logs; never trust the absence of
//   errors (ssn 15).
// · Over-budget beats self-trim: cap awaited layout waits, wrap glide-clicks
//   in withTimeout(2), cap trailing settles Math.min(2.0, …) — a beat that
//   runs long must not stretch the film (cc 6).
// · State-echo cleanups use querySelectorAll — a first-match query lies when
//   the class also appears in hidden decoration (cc 9).
// · Faux-overlay stacking (bac F): GSAP transforms on SIBLING rows create
//   stacking contexts that bury any overlay regardless of z-index — raise
//   the HOST ROW's z-index while the overlay is open, reset on close. (The
//   faux overlay itself stays video-local; this is the trap it sits in.)

/* eslint-env browser */
/* global gsap, CustomEase */

import { boundedRepeats, mulberry32 } from './motion-primitives.js';
import { captionWordStarts, wait } from './narration.js';
// Closed-loop scroll family (fix-round C2): shorts imports stay one-module.
// paneScrollTo — builder panes (hidden 0×0 twins resolved by walking UP);
// pageCenter — live frontend pages (late image decodes re-checked).
// Both: camera move FIRST, then the loop centers inside the clamp.
// reflowSubject/prepOnSwap (C-SPEC C2): re-layout as shot design — cap +
// center the subject, hide columns, unstick sticky cells, re-applied after
// every swap. Same one-module import convenience.
export { paneScrollTo, pageCenter, settleAndMeasure, reflowSubject, prepOnSwap } from './iframe-helpers.js';
// Pose-log sidecar (C-SPEC C4 runtime mode): the camera verbs below push
// their settled poses into window.__poses for composition-scan --play.
// Data only — no pixels, no timing; films render identically without it.
import { logCameraPose } from './iframe-helpers.js';

// ── Portrait camera contract (docs/vertical-shorts.md) ────────────────────
// 1.78 floor clears flyToElement's blended ×0.96 mid-flight dip over the hard
// 1200/720 = 1.667 no-bars geometry; 2.0 is the CSS pixel-doubling ceiling.
export const PORTRAIT_CAM = { minZoom: 1.78, maxZoom: 2.0 };

let _easesRegistered = false;
function ensureEases() {
  if (_easesRegistered || typeof gsap === 'undefined') return;
  _easesRegistered = true;
  if (typeof CustomEase !== 'undefined') {
    try {
      gsap.registerPlugin(CustomEase);
      // Punch land: fast arrival, ~3% overshoot, tight settle.
      CustomEase.create('shorts-punch-land', 'M0,0 C0.2,0 0.28,1.02 0.52,1.03 C0.72,1.035 0.86,1 1,1');
      // Whip land: violent launch already happened; this is the snap-stop.
      CustomEase.create('shorts-whip-land', 'M0,0 C0.1,0.6 0.3,1.01 0.55,1.015 C0.78,1.02 0.9,1 1,1');
    } catch (e) { /* already registered */ }
  }
}
const easeOr = (name, fallback) => (typeof CustomEase !== 'undefined' ? name : fallback);

// ── punchIn — camera punch between regions, with attack ───────────────────
//
// The charter's replacement for the uniform 0.8s drift: a two-phase
// decomposed move (anti-pattern #2 compliant) with a crouch and a fast
// land. Use it when the narration TURNS to a new region — the cut should
// feel like attention snapping, not a slide changing.
//
// Overshoot is only applied when zooming IN — punching out to a wider
// region with an overshooting ease would dip the zoom below the portrait
// floor mid-settle (bars flash).
//
// @param {{iframeManager}} ctx
// @param {string|Element} target — iframe-doc element to frame
// @param {Object} [opts] { fill=0.62, pad=24, duration=0.5, minZoom, maxZoom }
// @returns {Promise<pose|null>} — warn-and-null on failure (glideClick contract)
export async function punchIn({ iframeManager }, target, opts = {}) {
  const {
    fill = 0.62, pad = 24,
    minZoom = PORTRAIT_CAM.minZoom, maxZoom = PORTRAIT_CAM.maxZoom,
    duration = 0.5,
  } = opts;
  ensureEases();
  try {
    const cur = iframeManager.cameraState();
    const pose = iframeManager.cameraToElement(target, { fill, pad, minZoom, maxZoom });
    const zoomingIn = pose.zoom >= cur.zoom - 0.01;
    // Phase 1 — crouch: tiny zoom dip (never below the floor) + 18% of the
    // travel, reads as the camera loading the punch.
    await iframeManager.tweenCamera({
      zoom: Math.max(minZoom, cur.zoom * 0.988),
      tx: cur.tx + (pose.tx - cur.tx) * 0.18,
      ty: cur.ty + (pose.ty - cur.ty) * 0.18,
      duration: duration * 0.3,
      ease: 'power2.in',
    });
    // Phase 2 — drive: the rest of the travel on the punch ease.
    await iframeManager.tweenCamera({
      zoom: pose.zoom, tx: pose.tx, ty: pose.ty,
      duration: duration * 0.7,
      ease: zoomingIn ? easeOr('shorts-punch-land', 'back.out(1.1)') : 'power3.out',
    });
    logCameraPose(opts._verb || 'punchIn', opts.label || target, pose);
    return pose;
  } catch (e) {
    console.warn(`[flyToElement] punchIn failed for ${target}: ${e.message}`);
    return null;
  }
}

// ── punchToRegion — frame the UNION of several elements ───────────────────
//
// The stop-fast-bots opening bug in reverse: the taught thing is often a
// GROUP of rows (the Protection toggles), and no single captured element
// spans it. This computes the union rect of the given selectors, frames it
// via a temporary proxy element (so the pose math stays cameraToElement's,
// clamps included), and punches to it.
//
// Zero-opacity aid idiom (cc 12): for a composition wider than the visible
// slice, mount a TRANSPARENT element spanning the intended x-range, fly to
// it (or pass it here as one of the selectors), measure the drop point,
// remove it. The pose math stays cameraToElement's — no hand-derived coords.
//
// @param {{iframeManager}} ctx
// @param {Array<string|Element>} selectors — 2+ iframe-doc targets
// @param {Object} [opts] — punchIn opts (fill, pad, duration, …)
export async function punchToRegion(ctx, selectors, opts = {}) {
  // Acceptance S-1: a lone string iterated per-character and silently
  // no-opped. Wrap it; single-target callers should prefer punchIn.
  if (typeof selectors === 'string') selectors = [selectors];
  const ifm = ctx.iframeManager;
  const doc = ifm.doc();
  if (!doc) { console.warn('[flyToElement] punchToRegion: no iframe doc'); return null; }
  const win = doc.defaultView;
  // Settle-mode guard: after a deep-zoom landing the IframeManager re-lays
  // the doc out at zoom N, so getBoundingClientRect returns POST-zoom px.
  // cameraToElement will exit settle before measuring the proxy, which must
  // therefore be positioned in 1× coords — normalize by the settle scale
  // (docEl width / logical iframe width; 1 outside settle). Found by
  // probe-short on the pilot's b4 pull-back (phantom region, Δx -350px).
  const docW = doc.documentElement.getBoundingClientRect().width || ifm.iframeSize.width;
  const k = Math.max(0.1, docW / ifm.iframeSize.width);
  let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity, found = 0;
  for (const s of selectors) {
    let el = null;
    try { el = typeof s === 'string' ? ifm.query(s) : s; } catch (e) { el = null; }
    if (!el) { console.warn(`[flyToElement] punchToRegion: member not found: ${s}`); continue; }
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    L = Math.min(L, r.left); T = Math.min(T, r.top);
    R = Math.max(R, r.right); B = Math.max(B, r.bottom);
    found++;
  }
  if (!found) { console.warn('[flyToElement] punchToRegion: no members had layout'); return null; }
  const proxy = doc.createElement('div');
  proxy.style.cssText = `position:absolute;left:${(L + win.scrollX) / k}px;top:${(T + win.scrollY) / k}px;width:${(R - L) / k}px;height:${(B - T) / k}px;pointer-events:none;visibility:hidden;`;
  doc.body.appendChild(proxy);
  try {
    // Pose-log label: the proxy is anonymous — name the pose by its members.
    return await punchIn(ctx, proxy, {
      ...opts,
      _verb: 'punchToRegion',
      label: opts.label || selectors.map((s) => (typeof s === 'string' ? s : '<node>')).join(' + '),
    });
  } finally {
    proxy.remove();
  }
}

// ── whipPan — lateral region change at constant zoom ──────────────────────
//
// Portrait camera moves are pans (the zoom band is too narrow for arcs).
// A whip is launch + snap-stop: most of the travel happens in the middle
// third. Zoom is pinned to the current zoom (clamped to the band), so the
// floor can never be crossed mid-move.
export async function whipPan({ iframeManager }, target, opts = {}) {
  const { pad = 24, duration = 0.55, fill = 0.62 } = opts;
  ensureEases();
  try {
    const cur = iframeManager.cameraState();
    const z = Math.min(PORTRAIT_CAM.maxZoom, Math.max(PORTRAIT_CAM.minZoom, cur.zoom));
    const pose = iframeManager.cameraToElement(target, { fill, pad, minZoom: z, maxZoom: z });
    await iframeManager.tweenCamera({
      zoom: z,
      tx: cur.tx + (pose.tx - cur.tx) * 0.3,
      ty: cur.ty + (pose.ty - cur.ty) * 0.3,
      duration: duration * 0.32,
      ease: 'power2.in',
    });
    await iframeManager.tweenCamera({
      zoom: pose.zoom, tx: pose.tx, ty: pose.ty,
      duration: duration * 0.68,
      ease: easeOr('shorts-whip-land', 'power4.out'),
    });
    logCameraPose('whipPan', opts.label || target, pose);
    return pose;
  } catch (e) {
    console.warn(`[flyToElement] whipPan failed for ${target}: ${e.message}`);
    return null;
  }
}

// ── settle — the consequence hold (replaces `await wait(n)` ENTIRELY) ─────
//
// The D1 recipe, executable: while narration continues, something is always
// still resolving. Composes up to four bounded consequence channels and
// resolves after `seconds` via setTimeout (RAF-hardened; safe to await
// inside a beat's motionFn).
//
//   push    — slow camera push-in (zoom +delta, clamped to the band) plus a
//             small pan; the default channel, always on unless push:0.
//   ring    — pulse an existing highlight ring (pass the handle returned by
//             hi()/highlightElement); boundedRepeats, transform-only.
//   label   — one emphasis pulse on the highlight label node (pass handle).
//   cursorTo— the cursor is ALREADY traveling toward the next target: glides
//             85% of the way there over most of the hold. Reads as intent.
//
// @param {{iframeManager, cursor?}} ctx
// @param {Object} opts {
//   seconds,                     — hold length (required)
//   push = 0.05,                 — zoom delta; 0 disables the camera channel
//   pan = {x:-16, y:0},          — px drift composed with the push
//   ring = null,                 — highlight handle { element }
//   label = null,                — highlight handle { label }
//   cursorTo = null,             — iframe-doc selector/element to approach
// }
export async function settle({ iframeManager, cursor }, opts = {}) {
  const {
    seconds,
    push = 0.05,
    pan = { x: -16, y: 0 },
    ring = null,
    label = null,
    cursorTo = null,
  } = opts;
  if (!Number.isFinite(seconds) || seconds <= 0) return;

  // Camera channel — one slow tween across the whole hold.
  if (iframeManager && (push || pan.x || pan.y)) {
    const cur = iframeManager.cameraState();
    const z = Math.min(PORTRAIT_CAM.maxZoom, Math.max(PORTRAIT_CAM.minZoom, cur.zoom + push));
    // Drift, not a landing — settled:false so composition-scan --play never
    // counts a settle push as a new composition.
    logCameraPose('settle', 'drift', { zoom: z, tx: cur.tx + (pan.x || 0), ty: cur.ty + (pan.y || 0) }, false);
    iframeManager.tweenCamera({
      zoom: z,
      tx: cur.tx + (pan.x || 0),
      ty: cur.ty + (pan.y || 0),
      duration: Math.max(0.4, seconds * 0.94),
      ease: 'power1.inOut',
    }).catch(() => {});
  }

  // Ring channel — bounded pulse on the highlight ring element.
  const ringEl = ring && (ring.element || ring.el || ring);
  if (ringEl && ringEl.nodeType === 1 && typeof gsap !== 'undefined') {
    // Yoyo fill math: each play is a HALF cycle, so the repeat count comes
    // from boundedRepeats(cycle/2, window) — the full-cycle form under-fills
    // the hold by half (caught by dead-time on the pilot's outro).
    const cycle = 1.15;
    gsap.to(ringEl, {
      scale: 1.05,
      transformOrigin: '50% 50%',
      duration: cycle / 2,
      yoyo: true,
      repeat: Math.max(1, boundedRepeats(cycle / 2, seconds)),
      ease: 'sine.inOut', // consequence pulse on a callout ring, not ambient float
    });
  }

  // Label channel — a single emphasis pulse, front-loaded.
  const labelEl = label && (label.label || label);
  if (labelEl && labelEl.nodeType === 1 && typeof gsap !== 'undefined') {
    gsap.fromTo(labelEl, { scale: 1 }, {
      scale: 1.07, transformOrigin: '0% 100%', duration: 0.22,
      yoyo: true, repeat: 1, ease: 'power2.out', delay: 0.1,
    });
  }

  // Cursor channel — approach the NEXT target without arriving (85% lerp).
  if (cursorTo && cursor && iframeManager) {
    try {
      const el = typeof cursorTo === 'string' ? iframeManager.query(cursorTo) : cursorTo;
      if (el) {
        const to = iframeManager.elementToStageCoords(el);
        const from = cursor.pos();
        cursor.glide(
          { x: from.x + (to.x - from.x) * 0.85, y: from.y + (to.y - from.y) * 0.85 },
          { duration: Math.max(0.6, seconds * 0.7) }
        ).catch(() => {});
      }
    } catch (e) { /* approach is a garnish — never fail the hold */ }
  }

  await wait(seconds);
}

// ── spokenAt — when does the TTS say this word? ────────────────────────────
//
// Reuses captionWordStarts (the word-caption pacing model) so slams and
// staggers sync through the SAME mechanism as the captions. Matching is
// case-insensitive and punctuation-tolerant ("five." matches "five",
// "“406”" matches "406").
//
// ⚠ Ownership rule (sfb 16): physics chains sequence off ARRIVAL — one
// deterministic timeline where each step follows the previous step's landing.
// spokenAt is for STANDALONE accents only (a slam, a label pulse). Never give
// one element two owners (an arrival chain AND a spokenAt cue) — the two
// clocks drift and the second owner yanks the element mid-physics.
// The full sync-mechanism map (chunk / word-estimate / word-caption) lives in
// narration.js's header — check it before writing any new sync code.
//
// @param {string} text — the beat's full narration line
// @param {string} word — the keyword (or its first word if a phrase)
// @param {number} durS — the beat's measured DUR entry
// @param {Object} [opts] { occurrence = 1 }
// @returns {number} seconds from clip start (0 when the word isn't found)
export function spokenAt(text, word, durS, { occurrence = 1 } = {}) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const starts = captionWordStarts(words, durS);
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const needle = norm(String(word).trim().split(/\s+/)[0]);
  if (!needle) return 0;
  let seen = 0;
  for (let i = 0; i < words.length; i++) {
    if (norm(words[i]).includes(needle)) {
      seen++;
      if (seen >= occurrence) return starts[i];
    }
  }
  console.warn(`[shorts-kit] spokenAt: "${word}" not found in narration line — slam will fire at t=0`);
  return 0;
}

// ── beatAt / nowS — anchor lattice events to BEAT time, not code time ─────
//
// gsap.delayedCall(x) counts from where the CODE runs; after awaited
// nav/camera work those differ by seconds and every lattice event lands
// late — on top of the very runs it was meant to break (ssn 9). Promoted
// from a shipped short's video-local fix.
//
// Usage:  const t0 = nowS();
//         …awaited camera/nav work…
//         bandJolt(band, { at: beatAt(t0, 2.8) });   // fires 2.8s after t0
//
// Clock: film time via window.__T0 (the instrumentation contract every
// short sets in play()); falls back to page time before __T0 exists.
// performance-clock only — no wall-clock reads (INV-9).
export function nowS() {
  const t0 = (typeof window !== 'undefined' && window.__T0 != null) ? window.__T0 : 0;
  return (performance.now() - t0) / 1000;
}
export function beatAt(t0, x) {
  return Math.max(0.1, x - (nowS() - t0));
}

// ── slamKeyword — hero type moment synced to the TTS ──────────────────────
//
// The key noun ("406", "Turnstile", "2 SECONDS") slams in as the voice says
// it, holds with a scale creep (never frozen), and exits with motion off
// the frame edge. Editorial chrome above the band — real UI stays the base
// of the frame underneath.
//
// Fire-and-forget from inside a beat's motionFn:
//   slamKeyword(stage, { word: '5 SECONDS', at: spokenAt(text, 'five', DUR.b3) });
//
// @param {HTMLElement} stage — the 1080×1920 stage element
// @param {Object} opts {
//   word,                — display text (UPPERCASE reads best)
//   at = 0,              — seconds from now (use spokenAt)
//   holdS = 1.1,         — on-screen time between enter and exit
//   x = 540, y = 900,    — stage coords of the slam center
//   size = 150,          — font px
//   rotate = -4,         — resting tilt (deg)
//   accent = '#E27730',  — chip color
//   exitDir = 1,         — +1 exits right, -1 exits left
// }
// @returns {{ el: HTMLElement, tl: gsap.core.Timeline }}
export function slamKeyword(stage, opts = {}) {
  const {
    word, at = 0, holdS = 1.1, x = 540, y = 900,
    size = 150, rotate = -4, accent = '#E27730', exitDir = 1,
  } = opts;
  const el = document.createElement('div');
  el.className = 'kw-slam';
  el.textContent = word;
  // OVERRIDE: shorts charter 2026-08-13 (Umair) — editorial composition pre-authorized
  Object.assign(el.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    padding: `${Math.round(size * 0.14)}px ${Math.round(size * 0.28)}px`,
    background: accent,
    color: '#fff',
    font: `800 ${size}px/1 Bahnschrift, "DIN Alternate", system-ui, sans-serif`,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    borderRadius: `${Math.round(size * 0.11)}px`,
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
    zIndex: 60,
    pointerEvents: 'none',
    visibility: 'hidden', // parked at parse (seek-trap #1)
  });
  stage.appendChild(el);

  // Center via GSAP percent transforms so the slam tweens compose (L0 6b).
  gsap.set(el, { xPercent: -50, yPercent: -50, x, y, rotation: rotate, autoAlpha: 0, scale: 1.65 });

  const tl = gsap.timeline({ delay: Math.max(0, at), onComplete: () => el.remove() });
  tl.to(el, { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'back.out(2.4)' }, 0)
    .to(el, { rotation: rotate * 0.6, duration: 0.18, ease: 'power2.out' }, 0.2)
    // hold-with-consequence: the chip keeps creeping, never freezes
    .to(el, { scale: 1.045, duration: Math.max(0.3, holdS), ease: 'power1.inOut' }, 0.4)
    // exit THROUGH the frame edge — velocity does the hiding, not a fade
    .to(el, {
      x: x + exitDir * 1500, rotation: rotate + exitDir * 7,
      duration: 0.34, ease: 'power3.in',
    }, 0.4 + Math.max(0.3, holdS));
  return { el, tl };
}

// ── stampDown — vertical impact type (the slam's sibling, not its twin) ────
//
// Distinct silhouette from slamKeyword: a rubber-stamp verdict that drops
// straight DOWN onto its anchor (scale 2.2 → 1, power4.in) with a bordered
// chip look, micro-overshoot on impact, then holds under the caller's
// control. Use when the word is a VERDICT anchored to a thing on screen
// ("5", "BOUNCED"); use slamKeyword when the word is a headline crossing
// the frame. One slam per short is plenty — vary the treatments (Umair QC
// 2026-08-13: same effect over and over reads cheap).
//
// @param {HTMLElement} host — stage or any positioned layer
// @param {Object} opts {
//   word, at = 0, x, y, size = 96, rotate = -8,
//   accent = '#E27730',       — border/text color (filled: false) or bg
//   filled = false,           — false = bordered stamp, true = solid chip
//   holdS = null,             — seconds before auto-fade; null = caller owns
// }
// @returns {{ el, tl }}
export function stampDown(host, opts = {}) {
  const {
    word, at = 0, x = 540, y = 900, size = 96, rotate = -8,
    accent = '#E27730', filled = false, holdS = null,
  } = opts;
  const el = document.createElement('div');
  el.className = 'kw-stamp';
  el.textContent = word;
  // OVERRIDE: shorts charter 2026-08-13 (Umair) — editorial composition pre-authorized
  Object.assign(el.style, {
    position: 'absolute', left: '0px', top: '0px',
    padding: `${Math.round(size * 0.12)}px ${Math.round(size * 0.22)}px`,
    background: filled ? accent : 'rgba(255,255,255,0.92)',
    color: filled ? '#fff' : accent,
    border: `${Math.max(4, Math.round(size * 0.07))}px solid ${accent}`,
    font: `800 ${size}px/1 Bahnschrift, "DIN Alternate", system-ui, sans-serif`,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    borderRadius: `${Math.round(size * 0.14)}px`,
    zIndex: 62,
    pointerEvents: 'none',
    visibility: 'hidden', // parked at parse (seek-trap #1)
  });
  host.appendChild(el);
  gsap.set(el, { xPercent: -50, yPercent: -50, x, y, rotation: rotate, autoAlpha: 0, scale: 2.2 });

  const tl = gsap.timeline({ delay: Math.max(0, at) });
  tl.to(el, { autoAlpha: 1, scale: 0.96, duration: 0.2, ease: 'power4.in' }, 0)
    .to(el, { scale: 1.04, duration: 0.09, ease: 'power2.out' }, 0.2)
    .to(el, { scale: 1, rotation: rotate * 0.75, duration: 0.14, ease: 'power2.inOut' }, 0.29);
  if (holdS != null) {
    tl.to(el, { autoAlpha: 0, y: y + 26, duration: 0.3, ease: 'power2.in', onComplete: () => el.remove() }, 0.43 + Math.max(0.2, holdS));
  }
  return { el, tl };
}

// ── shakeNo / nodYes — the PHYSICAL verdict pair ──────────────────────────
//
// Umair QC 2026-08-13: "when the submissions bounce, you could have shown a
// nudge over the form — a nudge for declining or saying no, and the form
// window shaking left and right."
//
// The lesson behind these two: a verdict can be a STATE THAT APPEARS (a
// banner, a stamp) or BEHAVIOUR BY THE OBJECT ITSELF. Behaviour reads
// instantly, on mute, at phone size — and the kit had no vocabulary for it,
// so the first payoff cut reached for stamps and banners only. Reach for
// these whenever real UI accepts or refuses something.
//
// shakeNo — head-shake refusal: anticipation windup, then decaying
// left/right swings with a slight counter-rotation, with an optional red
// flash element. Tween the CLONE/inner node, not a wrapper GSAP already
// positions via x/y (the shake resolves to x:0 / rotation:0).
//
// MERGED 2026-08-13: two sessions authored this pair concurrently (duplicate
// exports broke the module). This is the union — the windup/decay mechanics
// + flash channel from one, the `at` delay / rotation channel / `px`/`dip`
// option aliases (already consumed by two shipped shorts)
// from the other. Both vocabularies work.
//
// @param {HTMLElement} el
// @param {Object} [opts] { amplitude|px = 18, rot = 1.4, cycles = 3,
//   duration = 0.58, at = 0, flashEl = null, flashAlpha = 1 }
// @returns {gsap.core.Timeline}
export function shakeNo(el, opts = {}) {
  const amplitude = opts.amplitude ?? opts.px ?? 18;
  const rot = opts.rot ?? 1.4;
  const cycles = opts.cycles ?? 3;
  const duration = opts.duration ?? 0.58;
  const at = opts.at ?? 0;
  const { flashEl = null, flashAlpha = 1 } = opts;
  const tl = gsap.timeline({ delay: Math.max(0, at) });
  if (!el) return tl;
  const swing = duration / (cycles * 2);
  // RELATIVE to wherever the element already sits. Writing absolute x/y here
  // silently TELEPORTS any positioned target to the origin — the bot (placed
  // at x/y on the stage) shot to the top of the frame on its first nod
  // (Umair QC r4). Targets that sit at 0 (a clone inside a wrap, the device
  // band) behave exactly as before.
  const baseX = Number(gsap.getProperty(el, 'x')) || 0;
  const baseR = Number(gsap.getProperty(el, 'rotation')) || 0;
  // anticipation: pull back before the refusal (the impact needs a windup)
  tl.to(el, { x: baseX - amplitude * 0.5, rotation: baseR - rot * 0.6, duration: 0.07, ease: 'power2.out' }, 0);
  for (let i = 0; i < cycles; i++) {
    const amp = amplitude * (1 - i / (cycles + 0.6));
    const r = rot * (1 - i / (cycles + 0.6));
    tl.to(el, { x: baseX + amp, rotation: baseR + r, duration: swing, ease: 'sine.inOut' });
    tl.to(el, { x: baseX - amp, rotation: baseR - r, duration: swing, ease: 'sine.inOut' });
  }
  tl.to(el, { x: baseX, rotation: baseR, duration: 0.14, ease: 'power2.out' });
  if (flashEl) {
    tl.fromTo(flashEl, { autoAlpha: 0 }, { autoAlpha: flashAlpha, duration: 0.1, ease: 'power2.out' }, 0)
      .to(flashEl, { autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0.22);
  }
  return tl;
}

// nodYes — acceptance: the object dips and settles, the way a page commits.
// Deliberately the SAME grammar on the other axis, so accept and refuse read
// as a matched pair. Accepts `depth` or the `dip` alias; `at` delays.
//
// @param {HTMLElement} el
// @param {Object} [opts] { depth|dip = 15, cycles = 2, duration = 0.5, at = 0 }
// @returns {gsap.core.Timeline}
export function nodYes(el, opts = {}) {
  const depth = opts.depth ?? opts.dip ?? 15;
  const cycles = opts.cycles ?? 2;
  const duration = opts.duration ?? 0.5;
  const at = opts.at ?? 0;
  const tl = gsap.timeline({ delay: Math.max(0, at) });
  if (!el) return tl;
  const beatS = duration / (cycles * 2);
  // RELATIVE — see the note in shakeNo. An absolute `y` here teleported the
  // stage-positioned bot to the top of the frame (Umair QC r4).
  const baseY = Number(gsap.getProperty(el, 'y')) || 0;
  tl.to(el, { y: baseY - depth * 0.35, duration: 0.08, ease: 'power2.out' }, 0);
  for (let i = 0; i < cycles; i++) {
    const d = depth * (1 - i / (cycles + 1));
    tl.to(el, { y: baseY + d, duration: beatS, ease: 'sine.inOut' });
    tl.to(el, { y: baseY - d * 0.4, duration: beatS, ease: 'sine.inOut' });
  }
  tl.to(el, { y: baseY, duration: 0.16, ease: 'power2.out' });
  return tl;
}

// ── staggerPopNamed — per-item pop as narration names each item ───────────
//
// The pick-a-captcha canonical case: three services, each pops the moment
// the TTS names it. Tweens the REAL iframe-doc elements directly (the
// live-DOM-as-motion-graphics USP) — transform-only, no layout thrash.
//
// @param {{iframeManager}} ctx
// @param {Array<{sel: string|Element, at: number}>} items — at in seconds
//   from now (use spokenAt per item)
// @param {Object} [opts] { peak = 1.05, rise = 6 }
export function staggerPopNamed({ iframeManager }, items, opts = {}) {
  const { peak = 1.05, rise = 6 } = opts;
  for (const item of items) {
    let el = null;
    try { el = typeof item.sel === 'string' ? iframeManager.query(item.sel) : item.sel; } catch (e) { /* warn below */ }
    if (!el) { console.warn(`[shorts-kit] staggerPopNamed: target not found: ${item.sel}`); continue; }
    gsap.timeline({ delay: Math.max(0, item.at) })
      .to(el, { scale: peak, y: -rise, transformOrigin: '50% 50%', duration: 0.2, ease: 'back.out(2.0)' })
      .to(el, { scale: 1, y: 0, duration: 0.3, ease: 'power2.inOut' });
  }
}

// ── liftComposite — editorial composition from REAL captured markup ────────
//
// Charter surface #2: mini-form pairs, bounce-off composites, payoff builds
// — assembled from cloned real elements, never invented product chrome.
// Clones the named iframe-doc elements with inlined computed styles (the
// popOut recipe, persistent variant) into an absolutely-positioned editorial
// layer above the band.
//
// Every piece carries its provenance: pass the SOURCE snapshot slug and the
// call site should carry a `// SOURCE: snapshots/<slug>/...` comment.
//
// @param {{iframeManager}} ctx
// @param {Object} opts {
//   pieces: [{ sel, x, y, scale = 1, w? }],  — stage coords per clone
//   z = 58,
// }
// @returns {{ el, pieces: HTMLElement[], enter(opts), dispose() }}
export function liftComposite({ iframeManager }, { pieces = [], z = 58 } = {}) {
  const host = document.createElement('div');
  host.className = 'shorts-composite';
  Object.assign(host.style, { position: 'absolute', inset: '0', zIndex: z, pointerEvents: 'none' });

  const doc = iframeManager.doc();
  const win = doc && doc.defaultView;
  const made = [];
  for (const p of pieces) {
    let src = null;
    try { src = typeof p.sel === 'string' ? iframeManager.query(p.sel) : p.sel; } catch (e) { /* warn below */ }
    if (!src || !win) { console.warn(`[shorts-kit] liftComposite: piece not found: ${p.sel}`); continue; }
    const clone = src.cloneNode(true);
    inlineComputedTree(src, clone, win);
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { position: 'absolute', left: '0px', top: '0px', visibility: 'hidden' });
    if (p.w) { wrap.style.width = p.w + 'px'; clone.style.maxWidth = '100%'; }
    wrap.appendChild(clone);
    host.appendChild(wrap);
    gsap.set(wrap, { xPercent: -50, yPercent: -50, x: p.x, y: p.y, scale: p.scale || 1, autoAlpha: 0 });
    made.push(wrap);
  }

  return {
    el: host,
    pieces: made,
    // Rise-in with stagger; exits are the caller's choreography.
    enter({ stagger = 0.14, rise = 26, duration = 0.5 } = {}) {
      const tl = gsap.timeline();
      tl.fromTo(made, { autoAlpha: 0, y: `+=${rise}` }, {
        autoAlpha: 1, y: `-=${rise}`, duration, ease: 'power3.out', stagger,
      });
      return tl;
    },
    dispose() { host.remove(); },
  };
}

// Inline the full computed style tree src → clone (popOut's recipe, kept
// minimal: layout-critical + visual props; pseudo-elements skipped — a
// composite reads at card scale, not forensic scale).
// Positioning props are inlined ALONGSIDE the box props: a captured surface
// routinely relies on position:absolute/relative descendants (the WPForms
// phone field's intl-tel-input flag container is the canonical case). Dropping
// them collapses those elements into normal flow and later siblings ride up
// over them — the Submit-button-over-Phone-field collision Umair caught
// 2026-08-13.
const INLINE_PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'padding', 'border', 'border-radius', 'box-sizing', 'box-shadow',
  'background', 'background-color', 'background-image', 'color', 'font', 'font-family',
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
  'text-transform', 'text-decoration', 'white-space', 'vertical-align', 'opacity',
  'flex', 'flex-direction', 'flex-wrap', 'align-items', 'align-self', 'justify-content',
  'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'order',
  'overflow', 'visibility', 'appearance', 'outline', 'cursor', 'list-style',
];
function inlineComputedTree(src, clone, win, isRoot = true) {
  const cs = win.getComputedStyle(src);
  for (const prop of INLINE_PROPS) {
    try { clone.style.setProperty(prop, cs.getPropertyValue(prop)); } catch (e) { /* skip */ }
  }
  // Only the ROOT is neutralized — the composite's wrapper owns its placement.
  // Descendants KEEP their computed position (see the note above).
  if (isRoot) {
    clone.style.position = 'static';
    clone.style.top = clone.style.right = clone.style.bottom = clone.style.left = 'auto';
  }
  const srcKids = src.children, cloneKids = clone.children;
  for (let i = 0; i < srcKids.length && i < cloneKids.length; i++) {
    inlineComputedTree(srcKids[i], cloneKids[i], win, false);
  }
}

// ── Surround layer — kill the dead bands (C-SPEC C3, ruled 2026-08-22) ─────
//
// 37.5% of every portrait teaching frame was literal flat `#12161b` (the
// 0–300 / 1500–1920 zones). Ruling 9: brand ground becomes the new shorts
// default, with an OPT-IN per-beat instrument dock; the "cast presence"
// treatment is void (no recurring character), and the "context echo"
// treatment was evaluated and REJECTED (a live blurred echo needs a CSS
// filter over the iframe ancestry — banned; see shorts-bot.js:23-27).
//
// Geometry contract: the layers paint ONLY the 0–300 and 1500–1920 zones at
// z-index 2 — under the device band (z:5) and the title pill / caption
// (z:40). Band geometry untouched. MEASUREMENT HONESTY: the dead-time band
// scan (`--crop 1080:1200:0:300`) covers y 300–1500 only, so surround
// motion CANNOT satisfy the band carrier law — by construction, and that is
// correct: the band scan measures product motion, the full-frame scan the
// whole composition. Both keep running.
//
// The dock is a stage-x-aligned strip inside the top zone (y 150–290 —
// clear of the 0–140 player chrome; shares the strip with the title pill,
// so dock content lives RIGHT of the pill and left of x≈930, clear of the
// action rail). Mount instruments into it like any host:
//   const surround = mountSurround(stage);
//   const gate = stateChip(surround.dock, { label: 'GATE', value: '2', unit: 's', x: 700, y: 20 });
//   tl.add(gate.tweenIn(), at);
// An instrument explains; a ring only points — the dock is where a labelled
// state instrument lives while the band below shows the UI it describes.
//
// Grain is seeded (mulberry32) and drawn ONCE per layer — static texture,
// no RAF, no timers. (atmospheric.js mountGrain is position:fixed
// full-viewport on document.body — wrong geometry for band-scoped layers,
// hence the local canvas.)
//
// @param {HTMLElement} stage
// @param {Object} opts {
//   ground = 'warm-dark',   — 'warm-dark' | 'night' | css background string
//   grain = false,          — seeded static grain on both layers
//   grainOpacity = 0.05, seed = 7,
//   zIndex = 2,
//   zones = { top: [0, 300], bottom: [1500, 1920] },
// }
// @returns {{ top, bottom, dock, dispose }}
export function mountSurround(stage, {
  ground = 'warm-dark', grain = false, grainOpacity = 0.05, seed = 7,
  zIndex = 2, zones = { top: [0, 300], bottom: [1500, 1920] },
} = {}) {
  const GROUNDS = {
    // Warm-dark: a whisper of brand warmth at the frame edges, easing into
    // the stage tone toward the band — designed ground, not flat paint.
    'warm-dark': {
      top: 'linear-gradient(180deg, #1a1410, #14161b 88%)',
      bottom: 'linear-gradient(0deg, #1a1410, #14161b 88%)',
    },
    night: {
      top: 'linear-gradient(180deg, #0d1118, #12161b 88%)',
      bottom: 'linear-gradient(0deg, #0d1118, #12161b 88%)',
    },
  };
  const bg = GROUNDS[ground] || { top: ground, bottom: ground };
  const mkLayer = (which, [y0, y1]) => {
    const el = document.createElement('div');
    el.className = `wpfi-surround wpfi-surround-${which}`;
    el.style.cssText = `position:absolute;left:0;top:${y0}px;width:100%;height:${y1 - y0}px;` +
      `background:${bg[which]};z-index:${zIndex};pointer-events:none;overflow:hidden;`;
    if (grain) {
      const c = document.createElement('canvas');
      const w = 540, h = Math.ceil((y1 - y0) / 2); // half-res is plenty for grain
      c.width = w; c.height = h;
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const ctx2 = c.getContext('2d');
      const img = ctx2.createImageData(w, h);
      const rand = mulberry32(seed + (which === 'top' ? 0 : 1));
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.floor(rand() * 255);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
        img.data[i + 3] = Math.round(grainOpacity * 255);
      }
      ctx2.putImageData(img, 0, 0);
      el.appendChild(c);
    }
    stage.appendChild(el);
    return el;
  };
  const top = mkLayer('top', zones.top);
  const bottom = mkLayer('bottom', zones.bottom);
  // Opt-in dock (per-beat): a coordinate space, empty until an author
  // mounts an instrument into it. y is dock-relative (dock top = stage 150).
  const dock = document.createElement('div');
  dock.className = 'wpfi-dock';
  dock.style.cssText = 'position:absolute;left:0;top:150px;width:100%;height:140px;pointer-events:none;';
  top.appendChild(dock);
  return {
    top, bottom, dock,
    dispose() { top.remove(); bottom.remove(); },
  };
}

// ── Animated Sullie bookends (A5) — never a static slide ──────────────────
//
// Family look: a shipped film's intro-card (real wordmark <img>,
// eyebrow, power3.out rises) on a full-stage orange wash, portrait-sized.
// The standing Sullie-in-every-intro-and-outro rule applies to shorts as of
// the 2026-08-13 ruling (system root cause #6 reversed the old spec).

const SULLIE_SRC = '/assets/sullie-with-arms.svg'; // official Sullie, with arms
const WORDMARK_SRC = '/assets/wordmark.svg';

// mountShortIntro — ~1.6–2.0s sting: orange wash, Sullie pops (back.out),
// wordmark + hook rise, then the whole card exits UPWARD with velocity,
// revealing the band underneath (exits-cause-entrances).
//
// SUB-1s STING MODE (ruled 2026-08-22 — shorts opening is sting → per-video
// postIntro → first product UI): pass { seconds: 0.9, exitFloor: 0.4 } and
// drop `sub`. The default exitFloor of 1.2 preserves every existing caller
// byte-identically; only an explicit lower floor allows a sub-1s exit. When
// the exit starts before the hold window (exitAt < 1.2) the Sullie hold-bobs
// are skipped — the card is already launching, and they would otherwise hold
// the timeline (and the el.remove()) open past the sting.
//
// play() fires the timeline and resolves via setTimeout after `seconds` —
// safe to await at the top of the master flow (INV-17).
//
// @param {HTMLElement} stage
// @param {Object} opts { hook, sub = '', seconds = 1.9, exitFloor = 1.2 }
// @returns {{ el, play(): Promise<void> }}
export function mountShortIntro(stage, { hook = '', sub = '', seconds = 1.9, exitFloor = 1.2 } = {}) {
  const el = document.createElement('div');
  el.className = 'shorts-intro-sting';
  // OVERRIDE: shorts charter 2026-08-13 (Umair) — editorial composition pre-authorized
  el.innerHTML = `
    <img class="sis-sullie" src="${SULLIE_SRC}" alt="Sullie, the WPForms mascot">
    <img class="sis-wordmark" src="${WORDMARK_SRC}" alt="WPForms">
    <div class="sis-hook"></div>
    ${sub ? '<div class="sis-sub"></div>' : ''}
  `;
  Object.assign(el.style, {
    position: 'absolute', inset: '0', zIndex: 80,
    background: 'linear-gradient(168deg, #E8834229 , transparent 40%), linear-gradient(12deg, #B85C1F, #E27730 58%, #ED8A47)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '34px', textAlign: 'center', visibility: 'hidden',
  });
  const sullie = el.querySelector('.sis-sullie');
  const wordmark = el.querySelector('.sis-wordmark');
  const hookEl = el.querySelector('.sis-hook');
  const subEl = el.querySelector('.sis-sub');
  Object.assign(sullie.style, { width: '300px', height: 'auto' });
  // Real wordmark asset, recolored to white for the orange wash (filter on an
  // editorial layer — never over a real-UI iframe).
  Object.assign(wordmark.style, { height: '64px', width: 'auto', filter: 'brightness(0) invert(1)' });
  hookEl.textContent = hook;
  Object.assign(hookEl.style, {
    font: '700 74px/1.14 Bahnschrift, "DIN Alternate", system-ui, sans-serif',
    color: '#fff', maxWidth: '880px', letterSpacing: '-0.01em',
    textShadow: '0 4px 24px rgba(0,0,0,0.18)',
  });
  if (subEl) {
    subEl.textContent = sub;
    Object.assign(subEl.style, { font: '500 38px/1.3 Bahnschrift, system-ui, sans-serif', color: 'rgba(255,255,255,0.88)', maxWidth: '820px' });
  }
  stage.appendChild(el);

  gsap.set(el, { autoAlpha: 1, y: 0, visibility: 'hidden' });
  gsap.set(sullie, { scale: 0.3, autoAlpha: 0, rotation: -8, transformOrigin: '50% 60%' });
  gsap.set(wordmark, { y: 30, autoAlpha: 0 });
  gsap.set(hookEl, { y: 44, autoAlpha: 0 });
  if (subEl) gsap.set(subEl, { y: 30, autoAlpha: 0 });

  return {
    el,
    play() {
      const exitAt = Math.max(exitFloor, seconds - 0.42);
      const tl = gsap.timeline({ onComplete: () => el.remove() });
      tl.set(el, { visibility: 'visible' }, 0)
        .to(sullie, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.7)' }, 0.05)
        .to(wordmark, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, 0.3)
        .to(hookEl, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 0.42);
      if (subEl) tl.to(subEl, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, 0.55);
      // Sullie never sits still while the card holds. (Skipped in sub-1s
      // sting mode — exitAt < 1.2 means the card launches before the hold;
      // the bobs would extend the timeline, deferring el.remove() past 1s.)
      if (exitAt >= 1.2) {
        tl.to(sullie, { y: -16, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.7);
        tl.to(sullie, { rotation: 2, transformOrigin: '50% 80%', duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.75);
      }
      // Exit WITH motion: the whole sting launches up past the frame edge,
      // handing velocity to the band reveal underneath.
      tl.to(el, { y: -1980, duration: 0.42, ease: 'power3.in' }, exitAt);
      return wait(seconds);
    },
  };
}

// mountShortOutro — ~2.5–3.0s end card: Sullie + real wordmark +
// "WPForms.com" CTA with an underline sweep and a bounded Sullie bob so the
// final frames never freeze. No exit — the video ends on it.
//
// @param {HTMLElement} stage
// @param {Object} opts { cta = 'Full guide on WPForms.com', url = 'WPForms.com', seconds = 2.8 }
// @returns {{ el, play(): Promise<void> }}
export function mountShortOutro(stage, { cta = 'Full guide on WPForms.com', url = 'WPForms.com', seconds = 2.8 } = {}) {
  const el = document.createElement('div');
  el.className = 'shorts-outro-card';
  // OVERRIDE: shorts charter 2026-08-13 (Umair) — editorial composition pre-authorized
  el.innerHTML = `
    <img class="soc-sullie" src="${SULLIE_SRC}" alt="Sullie, the WPForms mascot">
    <img class="soc-wordmark" src="${WORDMARK_SRC}" alt="WPForms">
    <div class="soc-cta"></div>
    <div class="soc-url"><span class="soc-url-text"></span><span class="soc-underline"></span></div>
  `;
  Object.assign(el.style, {
    position: 'absolute', inset: '0', zIndex: 80,
    background: 'radial-gradient(120% 70% at 50% 30%, #fff 0%, #faf4ee 58%, #f3e7db 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '30px', textAlign: 'center', visibility: 'hidden',
  });
  const sullie = el.querySelector('.soc-sullie');
  const wordmark = el.querySelector('.soc-wordmark');
  const ctaEl = el.querySelector('.soc-cta');
  const urlEl = el.querySelector('.soc-url');
  const urlText = el.querySelector('.soc-url-text');
  const underline = el.querySelector('.soc-underline');
  Object.assign(sullie.style, { width: '260px', height: 'auto' });
  Object.assign(wordmark.style, { height: '58px', width: 'auto' });
  ctaEl.textContent = cta;
  Object.assign(ctaEl.style, { font: '500 42px/1.3 Bahnschrift, system-ui, sans-serif', color: '#55504a', maxWidth: '860px' });
  Object.assign(urlEl.style, { position: 'relative', font: '700 52px/1.1 Bahnschrift, system-ui, sans-serif', color: '#E27730', paddingBottom: '10px' });
  urlText.textContent = url;
  Object.assign(underline.style, {
    position: 'absolute', left: '0', right: '0', bottom: '0', height: '5px',
    borderRadius: '3px', background: 'currentColor', transformOrigin: 'left center',
  });
  stage.appendChild(el);

  gsap.set(el, { autoAlpha: 1, visibility: 'hidden' });
  gsap.set(sullie, { scale: 0.4, autoAlpha: 0, transformOrigin: '50% 60%' });
  gsap.set([wordmark, ctaEl, urlEl], { y: 30, autoAlpha: 0 });
  gsap.set(underline, { scaleX: 0 });

  return {
    el,
    play() {
      const tl = gsap.timeline();
      tl.set(el, { visibility: 'visible' }, 0)
        .to(sullie, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.05)
        .to(wordmark, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 0.28)
        .to(ctaEl, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 0.42)
        .to(urlEl, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, 0.56)
        .to(underline, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, 0.85);
      // Bounded bob + sway + underline breathing — the end card never
      // freezes (A5), and the life has to be meter-visible on the text
      // surfaces, not just a smooth sprite drift.
      //
      // Windows run ~1.5s PAST `seconds` on purpose (QC2 2026-08-14): the
      // renderer pads the tail to the audio track, and play() resolving
      // doesn't stop the timeline — so the loops keep the padded final
      // stretch alive instead of freezing on the last frame (a 3.0s dead
      // tail measured on block-a-country). Bob amplitude 28: a 22px sprite
      // bob sat under the dead-time meter's threshold.
      const bobCycle = 1.2;
      const bobWindow = Math.max(0.9, seconds + 0.7);
      const halves = Math.max(1, boundedRepeats(bobCycle / 2, bobWindow));
      tl.to(sullie, {
        y: -28, duration: bobCycle / 2, yoyo: true,
        repeat: halves,
        ease: 'sine.inOut',
      }, 0.8);
      tl.to(sullie, {
        rotation: 2.4, transformOrigin: '50% 80%', duration: bobCycle / 2, yoyo: true,
        repeat: halves,
        ease: 'sine.inOut',
      }, 0.95);
      // CTA underline draw/undraw loop — the broadcast end-card device.
      // A full-width sweep is the one end-card motion that stays visible at
      // phone scale (and to the dead-time meter) without cluttering the card.
      tl.to(underline, {
        scaleX: 0, transformOrigin: 'right center', duration: 0.55, yoyo: true,
        repeat: Math.max(1, boundedRepeats(0.55, Math.max(0.9, seconds + 0.5))),
        ease: 'power2.inOut',
      }, 1.5);
      return wait(seconds);
    },
  };
}

// ── Physical form-behavior vocabulary (QC round 1, Umair 2026-08-13) ───────
//
// "when the submissions bounce, you could have shown a nudge over the form
//  (nudge for declining or saying no and form window shaking left and right)"
//
// The pilot built verdicts as STATES APPEARING (banner in, stamp down); the
// missing idea was the surface BEHAVING. Missing vocabulary is missing ideas
// — so the behaviors are first-class functions now. All transform-only,
// bounded, deterministic; target any element (stage editorial piece, the
// device band, or an iframe-doc node).

// shakeNo / nodYes live earlier in this module (merged 2026-08-13 — two
// sessions authored the pair concurrently; the union implementation sits
// with the verdict-pair doc block above staggerPopNamed).

// bandJolt — the proven dead-time area carrier (pilot LESSONS #8/#17): a
// 2–6px whole-surface jitter. Fades, thin rings, and small sprites are
// sub-meter; a band-scale jolt is not. Promoted from the pilot's inline
// pattern so holds can be carried without hand-rolling the tween.
//
// @param {Element} target — a BAND-SCALE surface (device band, payoff card)
// @param {Object} [opts] { px = 3, repeats = 3, at = 0, axis = 'x' }
// @returns {gsap.core.Tween}
export function bandJolt(target, { px = 3, repeats = 3, at = 0, axis = 'x' } = {}) {
  return gsap.fromTo(target, { [axis]: 0 }, {
    [axis]: px, duration: 0.06, yoyo: true, repeat: Math.max(1, repeats),
    ease: 'sine.inOut', clearProps: axis, delay: Math.max(0, at),
  });
}

// dropCatch — gravity fall arrested by an elastic catch: the safety-net
// physics. The element drops `fall` px with accelerating ease and is CAUGHT
// (elastic settle) rather than landing rigid. Pair with a nodYes on the
// catcher.
//
// @param {Element} target
// @param {Object} [opts] { fall = 320, duration = 0.9, at = 0, catchScale = 0.985 }
// @returns {gsap.core.Timeline}
export function dropCatch(target, { fall = 320, duration = 0.9, at = 0, catchScale = 0.985 } = {}) {
  const tl = gsap.timeline({ delay: Math.max(0, at) });
  tl.to(target, { y: `+=${fall}`, duration: duration * 0.42, ease: 'power2.in' })
    .to(target, { scale: catchScale, duration: 0.09, ease: 'power2.out' }, '<85%')
    .to(target, { y: `-=${Math.round(fall * 0.06)}`, scale: 1, duration: duration * 0.5,
      ease: 'elastic.out(1.1, 0.42)' });
  return tl;
}

// ── sfxCue — per-beat SFX slot (charter sound wiring) ──────────────────────
//
// Plays /assets/sfx/<name>.mp3 fire-and-forget for the HTML preview AND
// records { name, t } on window.__sfx so a post-render mux plan can lift the
// real cue times (tools/sfx pipeline). Silent no-op when the file is
// missing — sound never blocks the visual timeline.
//
// Available library today: click, hover, pop-drop, pop-ui, swipe, swoosh,
// swoosh-entry, type (assets/sfx/). Onset-probe new files before relying on
// them: node tools/sfx/onset.mjs assets/sfx
export function sfxCue(name, { volume = 0.5, base = '/assets/sfx/' } = {}) {
  if (window.__T0 != null) {
    (window.__sfx || (window.__sfx = [])).push({ name, t: (performance.now() - window.__T0) / 1000 });
  }
  try {
    const a = new Audio(`${base}${name}.mp3`);
    a.volume = volume;
    a.play().catch(() => {});
  } catch (e) { /* preview-only channel */ }
}
