// videos/_shared/effects/xai-eases.js
//
// AE-provenance ease vocabulary from the xAI voice-agent launch teardown.
// Source: docs/xai-voice-motion-rnd-2026-09-02.md — "The ease language".
// Nearly no keyframe in that film uses default easing: everything is speed-0
// endpoints with wildly asymmetric influence. AE (speed 0) → CSS bezier
// conversion: P1 = (outInf/100, 0), P2 = (1 − inInf/100, 1).
//
// The full E1–E4 table lives here so authoring never re-derives it
// (E3/E4 need no registration — stock GSAP covers them):
//
//   E1 whip-settle    AE inf 0.01 → 100    cubic-bezier(0.0001,0,0,1)
//       → registered as "whipSettle" below. Instant launch, mile-long
//         decel — text slides, list rolls, chip swaps.
//   E2 held snap      AE inf 90 → 0.01     cubic-bezier(0.9,0,1,1)
//       → registered as "heldSnap" below. Holds, whips, dead stop —
//         card rises.
//   E3 soft standard  AE inf 33.33 both    cubic-bezier(0.33,0,0.67,1)
//       → stock `power2.inOut` (no registration) — exits, fades,
//         neutral moves.
//   E4 half-whip      AE inf 48.6 → 0.01   cubic-bezier(0.486,0,1,1)
//       → ≈ between `power3.in` and `expo.in` (no registration) —
//         secondary text nudges.
//
// Duration constants from the same film: primary moves 0.33–0.67s
// (10–20 frames); micro-staggers 30–40ms; beat length ≈ 2s.
//
// Vocabulary slot: ease voices — xAI whip family.
// NOT auto-registered: load vendor/gsap/3.15.0/CustomEase.min.js, then call
// registerXaiEases() once before building timelines that name these eases.

/* global gsap, CustomEase */

export function registerXaiEases() {
  const CE = (typeof CustomEase !== 'undefined' && CustomEase)
    || (typeof gsap !== 'undefined' && gsap.core && gsap.core.globals && gsap.core.globals().CustomEase)
    || null;
  if (!CE) {
    console.warn('[xai-eases] CustomEase not loaded — whipSettle/heldSnap NOT registered. Add <script src="/vendor/gsap/3.15.0/CustomEase.min.js"> before calling registerXaiEases().');
    return false;
  }
  // Idempotent — CustomEase.create overwrites a same-name registration.
  CE.create('whipSettle', 'M0,0 C0,0 0,1 1,1');  // E1 — AE inf 0.01→100
  CE.create('heldSnap', 'M0,0 C0.9,0 1,1 1,1');  // E2 — AE inf 90→0.01
  return true;
}
