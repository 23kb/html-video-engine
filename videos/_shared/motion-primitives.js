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
 * Figjam-board / virtual-board camera flight. Distinct from `cinematicFlight`
 * (which dips scale during a single continuous flight) — this primitive is
 * explicitly 3-act so the viewer reads "zoom out, traverse, zoom in":
 *
 *   Phase 1: anticipation (small pre-nudge)
 *   Phase 2: ZOOM OUT only — camera pulls back from A (no translation), wide
 *            shot reveals both A and B (and the gap) at once
 *   Phase 3: TRANSLATE only — at wide scale, camera pans across the gap to B
 *   Phase 4: ZOOM IN only — camera pushes in on B (no translation)
 *   Phase 5: land + hold
 *
 * Use when: showing the viewer that two snapshots/scenes live in a shared
 * spatial canvas (the "zoom-out reveal" payoff). The scale dip in
 * `cinematicFlight` is subtler — for inter-snapshot work where the gap
 * matters, use this primitive.
 *
 * Source: docs/editorial-reference-motion-spec.md (Anthropic Claude design-
 * tools virtual-board pattern), tools/ref-frames/motion-spec.md Ref 2.
 *
 * @param {HTMLElement} camera — the camera-transformed wrapper
 * @param {Object} opts
 * @param {{x:number,y:number,scale:number}} opts.from — focused pose on A
 * @param {{x:number,y:number,scale:number}} opts.to — focused pose on B
 * @param {{x:number,y:number,scale:number}} opts.wide — wide pose showing
 *   both panels. Compute as: scale low enough that both A and B fit in the
 *   viewport. Translation typically centered between A and B.
 * @param {number} [opts.anticipationDuration=0.15]
 * @param {number} [opts.zoomOutDuration=0.85] — Phase 2 duration
 * @param {number} [opts.translateDuration=1.0] — Phase 3 duration
 * @param {number} [opts.zoomInDuration=0.85] — Phase 4 duration
 * @param {number} [opts.landHold=0.5]
 * @returns {gsap.core.Timeline}
 */
export function figjamFlight(camera, opts) {
  const {
    from, to, wide,
    anticipationDuration = 0.15,
    zoomOutDuration = 0.85,
    translateDuration = 1.0,
    zoomInDuration = 0.85,
    landHold = 0.5,
  } = opts;

  const tl = gsap.timeline({ paused: true });

  // Phase 1: anticipation — pre-nudge away from target direction
  const dx = to.x - from.x;
  tl.to(camera, {
    x: from.x + Math.sign(dx) * -8,
    duration: anticipationDuration,
    ease: 'power2.in',
  }, 0);

  // Phase 2: ZOOM OUT — scale to wide, translation stays at from's position
  // (camera pulls back, A stays roughly centered as content shrinks away)
  tl.to(camera, {
    x: from.x, y: from.y, scale: wide.scale, rotation: 0,
    duration: zoomOutDuration,
    ease: 'power3.out',
  });

  // Phase 3: TRANSLATE — at wide scale, pan to between A and B then to over B
  tl.to(camera, {
    x: wide.x, y: wide.y,
    duration: translateDuration * 0.5,
    ease: 'sine.inOut',
  });
  tl.to(camera, {
    x: to.x * (wide.scale / to.scale), y: to.y * (wide.scale / to.scale),
    duration: translateDuration * 0.5,
    ease: 'sine.inOut',
  });

  // Phase 4: ZOOM IN — scale up to to-pose's scale, settle on B
  tl.to(camera, {
    x: to.x, y: to.y, scale: to.scale, rotation: to.rotation || 0,
    duration: zoomInDuration,
    ease: 'power3.inOut',
  });

  // Phase 5: hold
  tl.to({}, { duration: landHold });

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

const DEFAULT_CURSOR_SVG = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 2 L21 12 L13 14 L11 22 Z" fill="#1c1f28" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>
`;

/**
 * Cursor class — mounts a real cursor element on a stage, exposes glide /
 * click / hover / drag with built-in anti-frenzy guards. Each video session
 * gets a consistent cursor without re-implementing mounting + glide + click
 * choreography.
 *
 * Source: anti-frenzy pattern from videos/wpforms-ai-board/LESSONS.md cursor
 * section. Click squash + ripple from videos/wpforms-ai-board/index.html.
 *
 * @example
 *   const cursor = new Cursor(stage, { initialX: 100, initialY: 100 });
 *   await cursor.glide({ x: 500, y: 300 });    // 0.95s power2.inOut
 *   await cursor.click();                       // squash + ripple
 *   await cursor.hover(buttonEl);               // glide to el's center
 *   await cursor.drag(fromPos, toPos);          // press → move → release
 *   cursor.remove();                            // cleanup
 */
export class Cursor {
  /**
   * @param {HTMLElement} stage — element to mount cursor in (position:relative)
   * @param {Object} [opts]
   * @param {string} [opts.svg=DEFAULT_CURSOR_SVG] — custom cursor inner HTML
   * @param {number} [opts.size=24] — cursor element size in px
   * @param {number} [opts.initialX=0] — initial stage-coord x
   * @param {number} [opts.initialY=0] — initial stage-coord y
   * @param {number} [opts.zIndex=100]
   */
  constructor(stage, opts = {}) {
    const {
      svg = DEFAULT_CURSOR_SVG,
      size = 24,
      initialX = 0,
      initialY = 0,
      zIndex = 100,
    } = opts;

    this.stage = stage;
    this.el = document.createElement('div');
    this.el.className = 'ml-cursor';
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '0', top: '0',
      width: size + 'px',
      height: size + 'px',
      pointerEvents: 'none',
      zIndex: String(zIndex),
      willChange: 'transform',
    });
    this.el.innerHTML = svg;
    if (this.el.firstElementChild) {
      this.el.firstElementChild.style.width = '100%';
      this.el.firstElementChild.style.height = '100%';
      this.el.firstElementChild.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
    }
    stage.appendChild(this.el);
    gsap.set(this.el, { x: initialX, y: initialY });
    this._pos = { x: initialX, y: initialY };
  }

  /**
   * Instant set position. No tween.
   */
  setPos(x, y) {
    this._clearHoverTarget();
    gsap.killTweensOf(this.el, 'x,y');
    gsap.set(this.el, { x, y });
    this._pos = { x, y };
  }

  /**
   * Glide to target stage-coord. Anti-frenzy: `gsap.to`, `power2.inOut`,
   * killTweensOf at start, default 0.95s (sub-0.85 reads as jump-cut per
   * LESSONS.md). If `via` is provided, splits the move into a two-leg arc
   * so cursor flights can bend around UI instead of cutting straight across.
   *
   * @param {{x:number,y:number}} to
   * @param {Object} [opts]
   * @param {number} [opts.duration=0.95]
   * @param {string} [opts.ease='power2.inOut']
   * @param {{x:number,y:number}} [opts.via] — optional waypoint for curved arcs
   * @returns {Promise<void>}
   */
  glide(to, opts = {}) {
    const { duration = 0.95, ease = 'power2.inOut', via = null } = opts;
    this._clearHoverTarget();
    gsap.killTweensOf(this.el, 'x,y,motionPath');
    this._pos = { x: to.x, y: to.y };
    return new Promise(resolve => {
      if (via) {
        gsap.timeline({ onComplete: resolve })
          .to(this.el, {
            x: via.x, y: via.y,
            duration: duration * 0.55,
            ease: opts.viaEase || 'power1.inOut',
          })
          .to(this.el, {
            x: to.x, y: to.y,
            duration: duration * 0.45,
            ease: opts.landEase || 'power2.out',
          });
        return;
      }
      gsap.to(this.el, { x: to.x, y: to.y, duration, ease, onComplete: resolve });
    });
  }

  /**
   * Click animation at current cursor position: squash → ripple → release.
   * Synchronous spawn of the ripple element; cursor squash + restore on
   * the same timeline.
   *
   * @param {Object} [opts]
   * @param {string} [opts.rippleColor='rgba(226,119,48,0.92)'] — WPForms orange
   * @param {number} [opts.rippleScale=2.4]
   * @param {number} [opts.rippleDuration=0.55]
   * @param {boolean} [opts.ripple=true] — set false to skip ripple
   * @returns {Promise<void>}
   */
  click(opts = {}) {
    const {
      rippleColor = 'rgba(226, 119, 48, 0.92)',
      rippleScale = 2.4,
      rippleDuration = 0.55,
      ripple = true,
    } = opts;

    if (ripple) {
      const r = document.createElement('div');
      r.className = 'ml-click-ripple';
      Object.assign(r.style, {
        position: 'absolute',
        left: this._pos.x + 'px',
        top: this._pos.y + 'px',
        width: '40px', height: '40px',
        marginLeft: '-20px', marginTop: '-20px',
        border: '2px solid ' + rippleColor,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: '99',
      });
      this.stage.appendChild(r);
      gsap.timeline()
        .to(r, { scale: rippleScale, opacity: 0, duration: rippleDuration, ease: 'power3.out' })
        .call(() => r.remove());
    }

    return new Promise(resolve => {
      gsap.timeline()
        .to(this.el, { scale: 0.78, duration: 0.10, ease: 'power2.in' })
        .to(this.el, { scale: 1.0, duration: 0.18, ease: 'back.out(2)', onComplete: resolve });
    });
  }

  /**
   * Hover-and-settle: glide to a stage-coord target, then a tiny seeded
   * jitter to imply human hand. **If `target` is passed**, applies a
   * visible hover effect on the target element (scale + glow) and removes
   * it on the next call to `glide`/`drag`/`click`/`remove`.
   *
   * @param {{x:number,y:number}} to
   * @param {Object} [opts]
   * @param {HTMLElement|null} [opts.target=null] — element to apply hover effect to
   * @param {number} [opts.hoverScale=1.05] — target scale during hover (1.0 = no scale)
   * @param {string} [opts.hoverGlow='0 0 0 4px rgba(226,119,48,0.35)'] — box-shadow on target
   * @param {number} [opts.duration=0.95]
   * @param {number} [opts.jitterAmplitude=1.5]
   * @param {number} [opts.settleDuration=0.6]
   * @param {number} [opts.seed=42]
   * @returns {Promise<void>}
   */
  async hover(to, opts = {}) {
    const {
      target = null,
      hoverScale = 1.05,
      hoverGlow = '0 0 0 4px rgba(226,119,48,0.35), 0 8px 24px rgba(226,119,48,0.25)',
      duration = 0.95,
      jitterAmplitude = 1.5,
      settleDuration = 0.6,
      seed = 42,
    } = opts;

    // Clear any prior hover effect on the previous target
    this._clearHoverTarget();

    await this.glide(to, { duration });

    // Apply hover effect on target as cursor settles
    if (target) {
      this._hoverTarget = target;
      // Save original styles to restore later
      this._hoverTargetOriginal = {
        transform: target.style.transform || '',
        transition: target.style.transition || '',
        boxShadow: target.style.boxShadow || '',
        willChange: target.style.willChange || '',
      };
      target.style.transition = 'transform 0.25s ease-out, box-shadow 0.25s ease-out';
      target.style.willChange = 'transform, box-shadow';
      target.style.transform = (this._hoverTargetOriginal.transform + ` scale(${hoverScale})`).trim();
      target.style.boxShadow = hoverGlow;
    }

    const rng = mulberry32(seed);
    const jx = (rng() - 0.5) * 2 * jitterAmplitude;
    const jy = (rng() - 0.5) * 2 * jitterAmplitude;
    return new Promise(resolve => {
      gsap.to(this.el, {
        x: to.x + jx, y: to.y + jy,
        duration: settleDuration,
        ease: 'sine.inOut',
        onComplete: () => {
          this._pos = { x: to.x + jx, y: to.y + jy };
          resolve();
        },
      });
    });
  }

  /**
   * Internal — remove any active hover effect on previous target.
   */
  _clearHoverTarget() {
    if (this._hoverTarget && this._hoverTargetOriginal) {
      const t = this._hoverTarget;
      const o = this._hoverTargetOriginal;
      t.style.transform = o.transform;
      t.style.boxShadow = o.boxShadow;
      // Leave transition active briefly so the un-hover animates, then restore
      setTimeout(() => {
        t.style.transition = o.transition;
        t.style.willChange = o.willChange;
      }, 280);
    }
    this._hoverTarget = null;
    this._hoverTargetOriginal = null;
  }

  /**
   * Drag pattern with optional ghost element. Choreography:
   *   glide to `from` → press squash → ghost element appears (clone of
   *   `ghostSource`) → cursor + ghost glide together to `to` → release +
   *   ghost fades.
   *
   * If `ghostSource` is not passed, the cursor moves alone (legacy behavior).
   * For a full visual drag, pass the DOM element to clone.
   *
   * @param {{x:number,y:number}} from
   * @param {{x:number,y:number}} to
   * @param {Object} [opts]
   * @param {HTMLElement|null} [opts.ghostSource=null] — element to clone as ghost
   * @param {number} [opts.ghostRotate=2.5] — degrees of tilt while carrying
   * @param {number} [opts.ghostScale=1.06] — scale of the ghost relative to source
   * @param {number} [opts.ghostMaxPx=320] — cap ghost width
   * @param {number} [opts.glideDuration=0.95]
   * @param {number} [opts.dragDuration=1.20]
   * @returns {Promise<void>}
   */
  async drag(from, to, opts = {}) {
    const {
      ghostSource = null,
      ghostRotate = 2.5,
      ghostScale = 1.06,
      ghostMaxPx = 320,
      glideDuration = 0.95,
      dragDuration = 1.20,
    } = opts;

    this._clearHoverTarget();
    await this.glide(from, { duration: glideDuration });

    // Press (squash without ripple — drag is a hold)
    await new Promise(resolve => {
      gsap.to(this.el, { scale: 0.85, duration: 0.10, ease: 'power2.in', onComplete: resolve });
    });

    // Spawn ghost element if requested
    let ghost = null;
    if (ghostSource) {
      const srcR = ghostSource.getBoundingClientRect();
      const stageR = this.stage.getBoundingClientRect();
      const stageScale = stageR.width / 1280;  // assumes 1280-wide stage
      const gw = Math.min(srcR.width / stageScale, ghostMaxPx);
      const gh = (srcR.height / stageScale) * (gw / (srcR.width / stageScale));

      const clone = ghostSource.cloneNode(true);
      // Strip ids to avoid duplicate-id warnings
      if (clone.id) clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

      ghost = document.createElement('div');
      ghost.className = 'ml-drag-ghost';
      Object.assign(ghost.style, {
        position: 'absolute',
        left: '0', top: '0',
        width: gw + 'px',
        height: gh + 'px',
        pointerEvents: 'none',
        zIndex: '98',  // below cursor (100), above content
        transform: `translate(${from.x - gw / 2}px, ${from.y - gh / 2}px) rotate(${ghostRotate}deg) scale(${ghostScale})`,
        transformOrigin: 'center',
        boxShadow: '0 18px 40px rgba(0,0,0,0.30), 0 6px 14px rgba(0,0,0,0.15)',
        borderRadius: '6px',
        overflow: 'hidden',
        background: '#fff',
        opacity: '0',
        transition: 'opacity 0.22s ease',
        willChange: 'transform, opacity',
      });
      ghost.appendChild(clone);
      // Force the clone to fill the ghost wrapper
      if (clone.style) {
        clone.style.margin = '0';
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.boxSizing = 'border-box';
      }
      this.stage.appendChild(ghost);
      // Fade in
      await new Promise(r => setTimeout(r, 30));
      ghost.style.opacity = '0.95';
      await new Promise(r => setTimeout(r, 220));
    }

    // Carry: cursor + ghost both glide to destination
    const carryPromises = [
      this.glide(to, { duration: dragDuration }),
    ];
    if (ghost) {
      const gw = parseFloat(ghost.style.width);
      const gh = parseFloat(ghost.style.height);
      carryPromises.push(new Promise(resolve => {
        gsap.to(ghost, {
          x: to.x - gw / 2,
          y: to.y - gh / 2,
          rotation: ghostRotate,
          scale: ghostScale,
          duration: dragDuration,
          ease: 'power2.inOut',
          onComplete: resolve,
        });
      }));
    }
    await Promise.all(carryPromises);

    // Release: ghost fades + drops, cursor un-squashes
    if (ghost) {
      gsap.to(ghost, { opacity: 0, scale: 0.96, rotation: 0, duration: 0.26, ease: 'power2.in',
        onComplete: () => ghost.remove() });
    }
    return new Promise(resolve => {
      gsap.to(this.el, { scale: 1.0, duration: 0.20, ease: 'back.out(2)', onComplete: resolve });
    });
  }

  /**
   * Get current stage-coord position (after any in-flight tweens settle,
   * this matches the cursor's actual transform).
   */
  pos() {
    return { ...this._pos };
  }

  /**
   * Remove cursor from DOM.
   */
  remove() {
    gsap.killTweensOf(this.el);
    this.el.remove();
  }
}

/**
 * Legacy standalone function — kept for backwards compatibility with
 * cursor-glide-straight QC page. New code should use `new Cursor(stage)`
 * and call `.glide(to, opts)` instead.
 *
 * @deprecated Use Cursor class
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
 * Radial click-ripple at a stage point. Spawns a temporary element,
 * expands + fades, removes itself. Standalone helper — for cursor-attached
 * click animation, use `Cursor.click()` instead (which does squash + ripple
 * at the cursor's current position).
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
// HIGHLIGHT / EMPHASIS PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

// Re-export the proven clone-and-lift helpers from runtime/pop-out.js. The
// runtime version is engine-coupled (assumes iframe.ui + engine layout); the
// version below generalizes it for arbitrary iframes living inside any
// transformed stage. Same visual recipe, same proven motion.
import {
  injectIframeFonts as _injectIframeFonts,
  inlineTreeStyles as _inlineTreeStyles,
  stripBuilderChrome as _stripBuilderChrome,
} from '/runtime/pop-out.js';

/**
 * Pop a UI block out of an iframe as a floating 2.5D card. Mirrors the
 * proven runtime/pop-out.js recipe — clones the target into the PARENT
 * document, inlines every computed-style property + materializes pseudo-
 * elements so it renders identically, then lifts it with a perspective +
 * rotateY/rotateX + scale transform and a multi-layer shadow stack.
 *
 * Why clone instead of transforming in-place:
 *   - Iframes get clipped by stage chrome (mac-frame, border-radius, etc.).
 *     A 3D transform on an in-iframe element is clipped flat by the
 *     iframe's bounding box.
 *   - WordPress admin uses obscene z-indexes (100M+) for context menus,
 *     dropdowns, fullscreen notices. Competing with that hierarchy from
 *     inside the iframe is fragile. Cloning to parent-doc dodges it.
 *   - The clone can cast a real shadow over the iframe's surrounding
 *     stage chrome — reads as "this card is floating above the page,"
 *     not "this card has an outline."
 *
 * NO dimmer. The lift + shadow + perspective is the emphasis; dimming
 * fights it. (Earlier dim-based versions were rejected during QC.)
 *
 * Returns a Promise that resolves when the full rise → hold → fall
 * sequence completes and the clone is removed.
 *
 * @param {HTMLIFrameElement} iframe — the iframe containing the target
 * @param {string} selector — iframe-doc selector for the target element
 * @param {Object} [opts]
 * @param {number} [opts.tilt=0] — Y-axis tilt in degrees at peak (0 = pure
 *   vertical lift, no rotation). tiltX auto-derives as `-tilt * 0.45`.
 * @param {number} [opts.tiltX] — explicit X-axis tilt; overrides auto.
 * @param {number} [opts.lift=1.10] — scale factor at peak
 * @param {number} [opts.perspective=700] — smaller = more dramatic 3D
 * @param {number} [opts.riseMs=420]
 * @param {number} [opts.holdMs=900]
 * @param {number} [opts.fallMs=340]
 * @param {boolean} [opts.hideOriginal=true] — hide in-iframe original while popped
 * @param {boolean} [opts.shadow=true] — multi-layer drop-shadow stack at peak
 * @param {boolean} [opts.border=true] — hairline 1px edge for crisp card look
 * @param {boolean} [opts.stripTextShadow=false] — kill text-shadow + filter on clone
 * @param {string|null} [opts.caption=null] — caption pill below the lifted card
 * @param {boolean} [opts.dim=true] — slight parent-doc overlay that dims
 *   everything except the popped clone (clone z-index sits above the dim)
 * @param {string} [opts.dimColor='rgba(0,0,0,0.20)'] — dim overlay color
 * @returns {Promise<void>}
 */
export async function popOut(iframe, selector, opts = {}) {
  const {
    tilt = 0,
    lift = 1.10,
    perspective = 700,
    riseMs = 420,
    holdMs = 900,
    fallMs = 340,
    hideOriginal = true,
    shadow = true,
    border = true,
    stripTextShadow = false,
    caption = null,
    dim = true,
    dimColor = 'rgba(0,0,0,0.20)',
  } = opts;
  const tiltX = opts.tiltX ?? -tilt * 0.45;

  const doc = iframe.contentDocument;
  if (!doc) throw new Error('popOut: iframe.contentDocument unavailable');
  const src = doc.querySelector(selector);
  if (!src) throw new Error('popOut: no element matches ' + selector);

  // Inject iframe @font-face rules into parent doc so cloned icons/glyphs
  // render with the right typeface (one-time, cached after first call).
  await _injectIframeFonts(doc);

  // Compute the source's visual position in parent-doc viewport coords.
  // The iframe lives inside a transformed stage AND has its own CSS scale,
  // so derive the total iframe-doc-px → outer-viewport-px ratio from the
  // bounding rect width vs offsetWidth. (Reading inline style misses
  // transforms set via class rules; reading the computed matrix needs
  // parsing — the rect/offset ratio captures every transform above the
  // iframe in one step.)
  const iframeRect = iframe.getBoundingClientRect();
  const srcRect = src.getBoundingClientRect();
  const totalScale = iframe.offsetWidth > 0 ? iframeRect.width / iframe.offsetWidth : 1;
  const stageX = iframeRect.left + srcRect.left * totalScale;
  const stageY = iframeRect.top  + srcRect.top  * totalScale;

  // Build clone in parent doc and inline every computed style + pseudo.
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  _inlineTreeStyles(src, clone);
  _stripBuilderChrome(clone);

  if (stripTextShadow) {
    clone.style.setProperty('text-shadow', 'none', 'important');
    clone.style.setProperty('filter', 'none', 'important');
    clone.querySelectorAll('*').forEach(n => {
      n.style.setProperty('text-shadow', 'none', 'important');
      n.style.setProperty('filter', 'none', 'important');
    });
  }

  // Lock clone box to the source's pre-scale dimensions; apply the iframe's
  // scale via transform so internal layout stays native.
  clone.style.setProperty('position', 'fixed', 'important');
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '2147483646';
  clone.style.left = stageX + 'px';
  clone.style.top  = stageY + 'px';
  clone.style.setProperty('width',  srcRect.width  + 'px', 'important');
  clone.style.setProperty('height', srcRect.height + 'px', 'important');
  clone.style.transformOrigin = '0 0';
  clone.style.backfaceVisibility = 'hidden';

  // Shadow stack (per runtime/pop-out.js recipe) + a giant ring shadow
  // when `dim` is on. The ring is `0 0 0 99999px rgba(0,0,0,alpha)` —
  // paints darkness everywhere outside the clone's bounding box, so the
  // surrounding context dims but the clone itself is naturally cut out.
  // Same trick engine.highlight() uses. No separate overlay element
  // required (an earlier overlay approach let the dim show through the
  // clone's transparent regions, e.g. inside a WPForms field wrapper).
  const dimAlpha = (() => {
    const m = /rgba?\([^)]*?,\s*([0-9.]+)\s*\)/.exec(dimColor);
    return m ? parseFloat(m[1]) : 0.20;
  })();
  const dimRing = dim ? `0 0 0 99999px rgba(0,0,0,${dimAlpha})` : null;
  const restBorder = border ? '0 0 0 1px rgba(16,14,10,0.06)' : null;
  const restShadow = restBorder || '0 0 0 rgba(0,0,0,0)';
  const peakShadow = [
    border ? '0 0 0 1px rgba(16,14,10,0.08)' : null,
    '0 60px 110px -22px rgba(14,10,6,0.42)',
    '0 28px 54px -16px rgba(14,10,6,0.30)',
    '0 10px 22px -10px rgba(14,10,6,0.18)',
    '0 2px 6px rgba(14,10,6,0.12)',
    dimRing,
  ].filter(Boolean).join(', ');

  clone.style.transform =
    `scale(${totalScale}) perspective(${perspective}px) rotateY(0deg) rotateX(0deg)`;
  clone.style.transition =
    `transform ${riseMs}ms cubic-bezier(.2,.9,.3,1.1), box-shadow ${riseMs}ms ease, filter ${riseMs}ms ease`;
  clone.style.boxShadow = restShadow;
  document.body.appendChild(clone);

  // Optional caption pill below the lifted card.
  let captionEl = null;
  if (caption) {
    captionEl = document.createElement('div');
    captionEl.textContent = caption;
    Object.assign(captionEl.style, {
      position: 'fixed',
      left: (stageX + srcRect.width * totalScale / 2) + 'px',
      top:  (stageY + srcRect.height * totalScale + 14) + 'px',
      transform: 'translate(-50%, -8px)',
      background: '#E27730',
      color: '#fff',
      padding: '8px 14px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: '0',
      boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
      zIndex: '2147483647',
      transition: `opacity 220ms ease, transform 220ms cubic-bezier(.2,.9,.3,1.1)`,
    });
    document.body.appendChild(captionEl);
  }

  // Hide the in-iframe original (visibility:hidden preserves layout).
  const prevVis = src.style.visibility;
  if (hideOriginal) src.style.visibility = 'hidden';

  // Rise + tilt.
  await new Promise(r => setTimeout(r, 20));
  const combined = totalScale * lift;
  clone.style.transform =
    `scale(${combined}) perspective(${perspective}px) rotateY(${tilt}deg) rotateX(${tiltX}deg)`;
  if (shadow) clone.style.boxShadow = peakShadow;
  if (captionEl) {
    captionEl.style.opacity = '1';
    captionEl.style.transform = 'translate(-50%, 0)';
  }
  await new Promise(r => setTimeout(r, riseMs + 20));

  // Hold.
  await new Promise(r => setTimeout(r, holdMs));

  // Fall back.
  clone.style.transition =
    `transform ${fallMs}ms cubic-bezier(.4,.1,.3,1), box-shadow ${fallMs}ms ease`;
  clone.style.transform =
    `scale(${totalScale}) perspective(${perspective}px) rotateY(0deg) rotateX(0deg)`;
  clone.style.boxShadow = restShadow;
  if (captionEl) {
    captionEl.style.opacity = '0';
    captionEl.style.transform = 'translate(-50%, -8px)';
  }
  await new Promise(r => setTimeout(r, fallMs + 20));

  // Cleanup.
  if (hideOriginal) src.style.visibility = prevVis;
  clone.remove();
  if (captionEl) captionEl.remove();
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
