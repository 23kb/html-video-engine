// videos/_shared/motion-primitives.js
//
// Executable motion primitives — the "copy code, not prose" answer to the
// repeated failure mode where Claude names a primitive (e.g. "cinematic flight")
// but invents a single-tween implementation that reads as a slide projector.
//
// Each function here is:
// - Standalone (only depends on GSAP + standard browser APIs)
// - JSDoc'd with rationale and a citation to the lessons-doc or winning-video
//   pattern it codifies
// - Determinism-safe (no Date.now, no unseeded Math.random, no fetch, no repeat:-1)
// - Copy-pasteable into a single-HTML editorial video or importable into a
//   chapter inside the engine
//
// Visual QC pages for each primitive live at videos/_qc-primitives/<name>.html.
// Approve each before relying on it in production work.
//
// Source references:
// - docs/winning-pattern-analysis-2026-05-10.md — identity-continuity rule
// - docs/polish-vocabulary-2026-05-11.md — rest-api polished-vs-unpolished deltas
// - .claude/skills/wpforms-motion-audit/SKILL.md — S-F tier criteria + hard rules
// - .claude/skills/wpforms-gsap-rules/SKILL.md — L0 + L1 GSAP discipline
// - videos/wpforms-ai-board/LESSONS.md — wpforms-ai-board build postmortem
// - reference/html-templates/* — canonical winners these primitives generalize

/* eslint-env browser */
/* global gsap */

// ─────────────────────────────────────────────────────────────────────────
// UTILITIES (small, used by larger primitives)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Compute a finite repeat count from cycle and visible durations. Replaces
 * `repeat: -1` for ambient/atmosphere loops — `repeat: -1` violates the
 * GSAP L0 rule and breaks `tools/render.js --seek` mode.
 *
 * Source: docs/polish-vocabulary-2026-05-11.md "duration-bounded-ambient"
 * (the polished rest-api kit went from repeat:-1 to this pattern at
 * videos/wpforms-rest-api-overview-polished/chapters/_kit.js:409).
 *
 * @param {number} cycleDuration — seconds per cycle
 * @param {number} visibleDuration — total seconds the loop is on-screen
 * @returns {number} GSAP `repeat:` value (so total plays = repeat + 1)
 */
export function boundedRepeats(cycleDuration, visibleDuration) {
  if (!(cycleDuration > 0) || !(visibleDuration > 0)) return 0;
  return Math.max(0, Math.ceil(visibleDuration / cycleDuration) - 1);
}

/**
 * Mulberry32 PRNG factory — seeded, deterministic, used wherever
 * Math.random() would have been. The seed makes every render byte-identical.
 *
 * Source: same as videos/_shared/kit.js mulberry32 (duplicated here so the
 * library has zero internal-kit dependencies; canonical is kit.js).
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// CAMERA PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Decomposed cinematic camera flight. The single biggest gap in failed
 * editorial videos (per docs/winning-pattern-analysis-2026-05-10.md): camera
 * moves get authored as a single tween between two fixed poses with one
 * stock ease, which reads as a slide projector swipe.
 *
 * This primitive enforces the L1 camera-decomposition contract from
 * .claude/skills/wpforms-gsap-rules/SKILL.md:
 *   anticipation (pre-nudge) → flight outbound (scale dip) → flight inbound
 *   (scale recovery) → land + hold → optional micro-zoom.
 *
 * Returns a paused gsap.timeline; caller registers and seeks via runtime.
 *
 * @param {HTMLElement} camera — the `.scene-camera` (transformed) element
 * @param {Object} opts
 * @param {{x:number,y:number,scale:number,rotation?:number}} opts.from — current pose
 * @param {{x:number,y:number,scale:number,rotation?:number}} opts.to — target pose
 * @param {number} [opts.anticipationDuration=0.15] — Phase 1 duration (s)
 * @param {number} [opts.flightDuration=0.9] — Phase 2+3 combined (s)
 * @param {number} [opts.landHold=0.45] — Phase 4 dwell (s) — minimum 0.40
 * @param {number} [opts.scaleDipFactor=0.95] — peak scale = min(from,to)*factor (lower = wider dip)
 * @param {number} [opts.rotationTilt=1.2] — degrees of mid-flight tilt; 0 to disable
 * @param {Object} [opts.microZoom] — optional Phase 5 micro-zoom
 * @param {{x:number,y:number,scale:number}} opts.microZoom.to
 * @param {number} [opts.microZoom.duration=0.6]
 * @returns {gsap.core.Timeline}
 */
export function cinematicFlight(camera, opts) {
  const {
    from, to,
    anticipationDuration = 0.15,
    flightDuration = 0.9,
    landHold = 0.45,
    scaleDipFactor = 0.95,
    rotationTilt = 1.2,
    microZoom = null,
  } = opts;

  const tl = gsap.timeline({ paused: true });
  const fromRot = from.rotation || 0;
  const toRot = to.rotation || 0;
  const dipScale = Math.min(from.scale, to.scale) * scaleDipFactor;
  const midX = (from.x + to.x) * 0.5;
  const midY = (from.y + to.y) * 0.5;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const anticipDx = -dx * 0.10;
  const anticipDy = -dy * 0.10;

  // Phase 1: Anticipation — slight nudge AWAY from target
  tl.to(camera, {
    x: from.x + anticipDx, y: from.y + anticipDy,
    rotation: fromRot + (rotationTilt > 0 ? 0.2 : 0),
    duration: anticipationDuration,
    ease: 'power2.in',
  }, 0);

  // Phase 2: Flight outbound — scale dips down
  tl.to(camera, {
    x: midX, y: midY, scale: dipScale,
    rotation: fromRot + rotationTilt,
    duration: flightDuration * 0.5,
    ease: 'power2.out',
  });

  // Phase 3: Flight inbound — scale climbs back, lands
  tl.to(camera, {
    x: to.x, y: to.y, scale: to.scale,
    rotation: toRot,
    duration: flightDuration * 0.5,
    ease: 'power2.inOut',
  });

  // Phase 4: Hold (no tween — dwell)
  tl.to({}, { duration: landHold });

  // Phase 5 (optional): Micro-zoom to inner target
  if (microZoom && microZoom.to) {
    tl.to(camera, {
      x: microZoom.to.x, y: microZoom.to.y, scale: microZoom.to.scale,
      duration: microZoom.duration ?? 0.6,
      ease: 'power3.out',
    });
  }

  return tl;
}

/**
 * Tutorial-grade focus → station → overview camera arc. The polish-vocabulary
 * "focus-station-overview-with-short-anchor" pattern, distilled from the
 * polished rest-api video.
 *
 * Source: docs/polish-vocabulary-2026-05-11.md camera-moves table; original
 * pattern in videos/wpforms-rest-api-overview-polished/chapters/_kit.js
 * (focus/station/overview poses) + auth-and-list-forms.js exit cadence.
 *
 * Same SHAPE as cinematicFlight but for shared-scene tutorials: focus on a
 * target → optional station shot → overview pull-back → short 120ms anchor.
 *
 * @param {HTMLElement} camera
 * @param {Object} opts
 * @param {{x:number,y:number,scale:number}} opts.focusPose
 * @param {{x:number,y:number,scale:number}} [opts.stationPose]
 * @param {{x:number,y:number,scale:number}} opts.overviewPose
 * @param {number} [opts.focusDuration=0.9]
 * @param {number} [opts.holdAtFocus=0.5]
 * @param {number} [opts.stationDuration=0.9]
 * @param {number} [opts.overviewDuration=1.1]
 * @param {number} [opts.anchorHold=0.12] — short hold after overview (polish pattern)
 * @returns {gsap.core.Timeline}
 */
export function focusStationOverview(camera, opts) {
  const {
    focusPose, stationPose, overviewPose,
    focusDuration = 0.9,
    holdAtFocus = 0.5,
    stationDuration = 0.9,
    overviewDuration = 1.1,
    anchorHold = 0.12,
  } = opts;

  const tl = gsap.timeline({ paused: true });
  tl.to(camera, { ...focusPose, duration: focusDuration, ease: 'expo.inOut' });
  tl.to({}, { duration: holdAtFocus });
  if (stationPose) {
    tl.to(camera, { ...stationPose, duration: stationDuration, ease: 'expo.inOut' });
  }
  tl.to(camera, { ...overviewPose, duration: overviewDuration, ease: 'expo.inOut' });
  tl.to({}, { duration: anchorHold });
  return tl;
}

// ─────────────────────────────────────────────────────────────────────────
// CURSOR + INTERACTION PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Straight-line cursor glide with anti-frenzy guards. Per
 * videos/wpforms-ai-board/LESSONS.md cursor section: motion-path with single
 * via-point above target causes cursor to overshoot then return (reads as
 * "frenzy"). Default is straight-line `gsap.to` with power2.inOut and
 * `killTweensOf` to prevent stale tweens from fighting.
 *
 * @param {HTMLElement} cursor
 * @param {{x:number,y:number}} from — current (used only if cursor isn't placed)
 * @param {{x:number,y:number}} to
 * @param {Object} [opts]
 * @param {number} [opts.duration=0.95] — default 0.95–1.10s; sub-0.85 reads as jump-cut
 * @param {string} [opts.ease='power2.inOut']
 * @returns {gsap.core.Tween}
 */
export function cursorGlideStraight(cursor, from, to, opts = {}) {
  const { duration = 0.95, ease = 'power2.inOut' } = opts;
  gsap.killTweensOf(cursor, 'x,y,motionPath');
  if (cursor.style.transform === '' || cursor.style.transform === 'none') {
    gsap.set(cursor, { x: from.x, y: from.y });
  }
  return gsap.to(cursor, { x: to.x, y: to.y, duration, ease });
}

/**
 * Radial click-ripple at a stage point. Spawns a temporary `.click-ripple`
 * element, expands + fades, removes itself.
 *
 * Source: videos/wpforms-ai-board/index.html clickRipple pattern.
 *
 * @param {HTMLElement} stage — parent element to mount the ripple in
 * @param {number} x — stage-coord x (px)
 * @param {number} y — stage-coord y (px)
 * @param {Object} [opts]
 * @param {string} [opts.color='rgba(226,119,48,0.92)'] — WPForms orange default
 * @param {number} [opts.scale=2.4]
 * @param {number} [opts.duration=0.55]
 * @returns {gsap.core.Timeline}
 */
export function clickRipple(stage, x, y, opts = {}) {
  const {
    color = 'rgba(226, 119, 48, 0.92)',
    scale = 2.4,
    duration = 0.55,
  } = opts;
  const r = document.createElement('div');
  r.className = 'click-ripple';
  Object.assign(r.style, {
    position: 'absolute', left: x + 'px', top: y + 'px',
    width: '40px', height: '40px',
    marginLeft: '-20px', marginTop: '-20px',
    border: '2px solid ' + color,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 100,
  });
  stage.appendChild(r);
  return gsap.timeline()
    .to(r, { scale, opacity: 0, duration, ease: 'power3.out' })
    .call(() => r.remove());
}

// ─────────────────────────────────────────────────────────────────────────
// TEXT + TYPING PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Letter-by-letter caret-typing into a text element. Replaces the
 * opacity-stagger-on-char-spans approach that caused the
 * videos/wpforms-ai-board caret-floats-500px-right bug (invisible chars
 * still occupy layout space → caret position desyncs).
 *
 * Implementation: scalar gsap tween + onUpdate innerHTML mutation. A blinking
 * caret span is appended after the visible text.
 *
 * Source: docs/wpforms-ai-board-lessons (now in winning-pattern doc); fixed
 * pattern lives in reference/html-templates/wpforms-ai-prompt-open.html.
 *
 * @param {HTMLElement} el — target text element (innerHTML will be replaced)
 * @param {string} text
 * @param {Object} [opts]
 * @param {number} [opts.charDuration=0.045] — seconds per char; 0.03–0.05 = realistic
 * @param {string} [opts.caretHtml='<span class="ml-caret">|</span>']
 * @returns {gsap.core.Tween}
 */
export function caretType(el, text, opts = {}) {
  const { charDuration = 0.045, caretHtml = '<span class="ml-caret">|</span>' } = opts;
  const n = { val: 0 };
  let lastI = -1;
  return gsap.to(n, {
    val: text.length,
    duration: Math.max(0.01, text.length * charDuration),
    ease: 'none',
    onUpdate: () => {
      const i = Math.floor(n.val);
      if (i !== lastI) {
        el.innerHTML = text.slice(0, i) + caretHtml;
        lastI = i;
      }
    },
    onComplete: () => { el.innerHTML = text + caretHtml; },
  });
}

/**
 * Status-pill text morph — character-by-character text swap on a persistent
 * pill element. Used for "status spine" patterns where one pill carries
 * viewer attention across multiple state labels (e.g. ZlyVs reference
 * "Thinking… / Filling field… / Checking formatting…").
 *
 * Source: tools/ref-frames/motion-spec.md Ref 3 status-pill spine + Phase 5g
 * polish-vocabulary "narrate-and-move" pattern.
 *
 * @param {HTMLElement} pill
 * @param {string[]} texts — sequence of labels to morph through
 * @param {Object} [opts]
 * @param {number} [opts.holdEach=1.5]
 * @param {number} [opts.morphDuration=0.5]
 * @returns {gsap.core.Timeline}
 */
export function statusPillMorph(pill, texts, opts = {}) {
  const { holdEach = 1.5, morphDuration = 0.5 } = opts;
  const tl = gsap.timeline({ paused: true });
  if (texts.length === 0) return tl;
  pill.textContent = texts[0];
  tl.to({}, { duration: holdEach });
  for (let i = 1; i < texts.length; i++) {
    const from = texts[i - 1];
    const to = texts[i];
    const maxLen = Math.max(from.length, to.length);
    const n = { val: 0 };
    let lastI = -1;
    tl.to(n, {
      val: maxLen,
      duration: morphDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const i2 = Math.floor(n.val);
        if (i2 !== lastI) {
          // Mid-morph: characters swap from 'from' to 'to' left-to-right
          let out = '';
          for (let k = 0; k < maxLen; k++) {
            out += (k < i2 ? (to[k] || '') : (from[k] || ''));
          }
          pill.textContent = out;
          lastI = i2;
        }
      },
      onComplete: () => { pill.textContent = to; },
    });
    tl.to({}, { duration: holdEach });
  }
  return tl;
}

/**
 * Marker-sweep highlight on a text element. Slides a filled rectangle behind
 * key text from left to right, with the text color flipping to white inside
 * the sweep. Used for emphasizing key phrases (per ZlyVs Ref 3 "Replit
 * Slides" marker-sweep).
 *
 * Source: tools/ref-frames/motion-spec.md Ref 4 marker-sweep section.
 *
 * Requires the target element to be positioned (relative or absolute). The
 * primitive injects an absolutely-positioned overlay inside it.
 *
 * @param {HTMLElement} textEl — wraps the text; will receive an overlay child
 * @param {Object} [opts]
 * @param {string} [opts.color='#E27730'] — WPForms orange default
 * @param {number} [opts.duration=0.3]
 * @returns {gsap.core.Timeline}
 */
export function markerSweep(textEl, opts = {}) {
  const { color = '#E27730', duration = 0.3 } = opts;
  const originalColor = getComputedStyle(textEl).color;
  // Ensure parent is positioned
  if (getComputedStyle(textEl).position === 'static') {
    textEl.style.position = 'relative';
  }
  const sweep = document.createElement('div');
  Object.assign(sweep.style, {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '100%',
    background: color,
    transformOrigin: 'left center',
    transform: 'scaleX(0)',
    pointerEvents: 'none',
    zIndex: -1,
  });
  // Wrap text in a relative-positioned span above sweep
  const orig = textEl.innerHTML;
  textEl.innerHTML = '';
  textEl.appendChild(sweep);
  const text = document.createElement('span');
  text.style.position = 'relative';
  text.style.zIndex = '1';
  text.innerHTML = orig;
  textEl.appendChild(text);

  return gsap.timeline({ paused: true })
    .to(sweep, { scaleX: 1, duration, ease: 'power2.inOut' }, 0)
    .to(text, { color: '#ffffff', duration: duration * 0.4, ease: 'none' }, duration * 0.3);
}

// ─────────────────────────────────────────────────────────────────────────
// FIELD / FORM PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Per-field stagger reveal — used when form fields appear during AI
 * generation or after a template applies. Each field rises + un-blurs +
 * fades in with a slight stagger.
 *
 * Source: videos/wpforms-ai-board/LESSONS.md Round 3 field-stagger fix +
 * docs/polish-vocabulary-2026-05-11.md "field-rise" custom-ease note.
 *
 * @param {NodeListOf<HTMLElement>|HTMLElement[]} fields
 * @param {Object} [opts]
 * @param {number} [opts.duration=0.55]
 * @param {number} [opts.stagger=0.10]
 * @param {number} [opts.rise=24] — px to rise from
 * @param {number} [opts.blurFrom=8] — px blur start
 * @returns {gsap.core.Timeline}
 */
export function fieldStaggerReveal(fields, opts = {}) {
  const {
    duration = 0.55,
    stagger = 0.10,
    rise = 24,
    blurFrom = 8,
  } = opts;
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(fields,
    { opacity: 0, y: rise, filter: `blur(${blurFrom}px)` },
    { opacity: 1, y: 0, filter: 'blur(0px)',
      duration, stagger, ease: 'power2.out' }
  );
  return tl;
}

// ─────────────────────────────────────────────────────────────────────────
// TUTORIAL-POLISH PRIMITIVES (from polish-vocabulary doc)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mount the persistent Sullie bug (brand anchor) in the parent body. Per
 * polish-vocabulary "persistent-brand-anchor" — the polished rest-api video
 * mounts Sullie once and keeps her across all 6 chapters. The unpolished
 * version doesn't, which makes the editorial canvas feel anonymous.
 *
 * Source: videos/wpforms-rest-api-overview-polished/chapters/_kit.js:277
 * `mountSullieBug` (this is a refactor of that, with options).
 *
 * Returns the bug element (idempotent — re-mount returns existing).
 *
 * @param {Object} [opts]
 * @param {string} [opts.src] — Sullie image path; default uses
 *   `/reference/wpforms-brand/assets/sullie-master.svg`. Adjust per video.
 * @param {string} [opts.id='zlyvs-sullie-bug'] — DOM id
 * @param {{bottom?:string,right?:string,top?:string,left?:string,size?:number}} [opts.position]
 * @returns {HTMLElement}
 */
export function mountSullieBug(opts = {}) {
  const {
    src = '/reference/wpforms-brand/assets/sullie-master.svg',
    id = 'zlyvs-sullie-bug',
    position = {},
  } = opts;
  let bug = document.getElementById(id);
  if (bug) return bug;
  bug = document.createElement('div');
  bug.id = id;
  Object.assign(bug.style, {
    position: 'fixed',
    bottom: position.bottom ?? '24px',
    right: position.right ?? '24px',
    top: position.top ?? 'auto',
    left: position.left ?? 'auto',
    width: (position.size ?? 64) + 'px',
    height: (position.size ?? 64) + 'px',
    pointerEvents: 'none',
    zIndex: 9000,
  });
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'WPForms Sullie';
  img.draggable = false;
  Object.assign(img.style, { width: '100%', height: '100%' });
  bug.appendChild(img);
  document.body.appendChild(bug);
  // Subtle float-y bob (bounded, not infinite)
  gsap.to(bug, {
    y: -6,
    duration: 2.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: boundedRepeats(5.0, 60), // ~60s default visibility
  });
  return bug;
}

/**
 * Clean fast rejoin — the polished-rest-api exit pattern. Per
 * polish-vocabulary "clean-fast-rejoin": short 500ms breathe → scale 1.02 +
 * sine.in 0.35s exit (no blur, no power2.in smear) → reveal shared anchor →
 * 120ms overview hold → 180ms layer fade. The unpolished version used
 * scale 1.05 + blur(8px) + power2.in 0.6s for 1300ms — heavy smear that
 * makes returns feel like a transition effect.
 *
 * Source: docs/polish-vocabulary-2026-05-11.md "clean-fast-rejoin" pattern.
 *
 * @param {HTMLElement} target — the card/element exiting
 * @param {Object} [opts]
 * @param {number} [opts.breatheDuration=0.5] — pre-exit hold
 * @param {number} [opts.exitDuration=0.35]
 * @param {number} [opts.exitScale=1.02]
 * @param {Function} [opts.onSharedAnchor] — callback that reveals the shared
 *   scene/overview (e.g. revealSharedHex). Receives no args. Optional.
 * @param {Function} [opts.onPanToOverview] — async callback to pan camera.
 *   Optional.
 * @param {HTMLElement} [opts.layer] — local layer to fade after overview
 * @returns {Promise<void>}
 */
export async function cleanFastRejoin(target, opts = {}) {
  const {
    breatheDuration = 0.5,
    exitDuration = 0.35,
    exitScale = 1.02,
    onSharedAnchor = null,
    onPanToOverview = null,
    layer = null,
  } = opts;

  await wait(breatheDuration);
  await new Promise(resolve => {
    gsap.to(target, {
      opacity: 0, scale: exitScale,
      duration: exitDuration,
      ease: 'sine.in',
      onComplete: resolve,
    });
  });
  if (onSharedAnchor) onSharedAnchor();
  if (onPanToOverview) await onPanToOverview();
  await wait(0.12);
  if (layer) {
    await new Promise(resolve => {
      gsap.to(layer, { opacity: 0, duration: 0.4, ease: 'sine.in', onComplete: resolve });
    });
  }
  await wait(0.18);
}

// Internal helper for await-able waits without Date.now
function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
