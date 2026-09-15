// videos/_shared/scene-review.js
// Per-scene review URLs for single-HTML videos: ?scene=<id>.
//
// In-browser review affordance ONLY. It lets the reviewer view one scene in
// isolation instead of sitting through the whole timeline. The MP4 render runs
// the FULL timeline (tools/render-html.js never sets ?scene=), so this never
// changes the deliverable.
//
// Reference impl: videos/switch-to-wpforms-entry-importer/index.html
// (ISSUES.md #9 postintro-only, #10 per-chapter). This generalizes that inline
// pattern so every single-HTML video wires ?scene= identically.
//
// Wiring in play():
//   import { reviewScene } from '/videos/_shared/scene-review.js';
//   const review = reviewScene();
//
//   // 1) isolate an early scene and HOLD on its payoff (skip its exit):
//   if (review.is('postintro')) { await runPostIntro({ isolate: true }); return; }
//
//   // 2) skip the preroll (intro + postintro) when a chapter is requested:
//   if (!review.matches(/^ch\d+$/)) {
//     /* intro */        /* postintro */
//   }
//
//   // 3) run setup + chapters, stopping after the requested one:
//   showChapter(1, '…'); await beat('ch1', …);  if (review.stopAfter('ch1')) return;
//   showChapter(2, '…'); await beat('ch2', …);  if (review.stopAfter('ch2')) return;
//
// Review URL: http://localhost:<port>/videos/<slug>/index.html?scene=<id>
//
// `search` is injectable for testing; defaults to the live query string.
export function reviewScene(search) {
  if (search === undefined) {
    search = (typeof location !== 'undefined' && location.search) || '';
  }
  const scene = new URLSearchParams(search).get('scene') || null;
  return {
    scene,                                              // raw ?scene= value, or null
    isReview: scene !== null,                           // true when reviewing one scene
    is:        (id) => scene === id,                    // run this scene isolated, then return
    wants:     (id) => scene === null || scene === id,  // run this segment? (full play OR this scene)
    stopAfter: (id) => scene === id,                    // call after a scene's beats to stop here
    matches:   (re) => scene !== null && re.test(scene),// e.g. /^ch\d+$/ to skip the preroll
  };
}

// ?skip=a,b — the DELIVERABLE cut (fix-round B5; generalizes the
// custom-css-targeting inline pattern, ccs 26).
//
// Delivery shape since 2026-07-23: tools/stitch.js concats REAL-Kacie intro +
// HTML body + REAL-Kacie outro, so the HTML must not render its own bookends
// at delivery — rendering them too would double them up at stitch time.
// `?skip=intro,outro` IS the deliverable cut, passed through the renderer via
// `--query "skip=intro,outro"` (render-singlehtml-audio.js). Distinct from
// `?scene=` above, which is REVIEW-ONLY by contract and never touches the
// deliverable.
//
// Wiring in play():
//   import { deliverableCut } from '/videos/_shared/scene-review.js';
//   const cut = deliverableCut();
//   if (cut.skips('intro')) { gsap.set(introCard, { autoAlpha: 0 }); }
//   else { /* full intro beat */ }
//
// `search` is injectable for testing; defaults to the live query string.
export function deliverableCut(search) {
  if (search === undefined) {
    search = (typeof location !== 'undefined' && location.search) || '';
  }
  const cut = new Set(
    (new URLSearchParams(search).get('skip') || '')
      .split(',').map(s => s.trim()).filter(Boolean)
  );
  return {
    skips: (name) => cut.has(name),   // is this segment cut from the deliverable?
    active: cut.size > 0,             // any deliverable cut requested?
  };
}
