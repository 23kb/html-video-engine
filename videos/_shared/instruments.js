// videos/_shared/instruments.js
//
// The payoff-instrument vocabulary, promoted from the shipped shorts by
// use-count (C-SPEC C5, motion-design round 2026-08-17). An instrument
// EXPLAINS a state; a highlight ring only points — when a beat explains a
// state, prefer a labelled instrument (chip, badge, roll) over a bare ring.
// The notifications short's → YOU chip proves this works in teaching beats,
// not just payoffs.
//
// Promoted implementations (verbatim mechanics, generalized surfaces):
//   valueRoll    — 3 independent shipped copies: coupon $60→$48 total roll
//                  (coupon short), GATE digit slot-roll
//                  (bot-gate short), rollSpamCount (spam short)
//   sheenSweep   — 7+ shipped copies (coupon extracted it as darkSweep;
//                  verbatim siblings in the other four shorts)
//   stateChip    — bot-gate short GATE/TIMER chips
//   routeChip    — notifications short makeChip + motion
//   scanline     — spam short red filter scan
//   raceLane     — bot-gate short lane + botRun scrub
//   browserShell — country-block short visitor frames
//
// Cross-cutting mechanics every export preserves (all shipped-and-measured):
//   · FIRE-TIME COORDINATES — routeChip resolves its anchor() at fire time,
//     never at beat start (the page keeps reflowing after a swap; captured
//     coords land "way off" — nvc QC2). All positioning takes STAGE coords;
//     for measurements made inside a device band, use bandToStage(y).
//   · visibility:hidden PARKING at parse (seek-trap #1 discipline).
//   · EXACT-VALUE SNAP — valueRoll's onComplete writes format(to) so float
//     drift can never leave "$47.99" on screen (coupon's guard).
//   · wpfi- class prefix + _shared home — video-guard's invented-ui-fragment
//     WARN scans authored video files for bare chip/card classes; library
//     instruments are exempt by construction, so promoting them REDUCES
//     guard noise for consumers.
//   · Determinism (INV-9): no Date.now, no Math.random, no repeat:-1, no
//     timers — slot-rolls are tween-chained. routeChip.fire() uses a
//     timeline .call() for its fire-time measurement: correct for the
//     real-time shorts render path; for a --seek-rendered film, pre-measure
//     and place plain tweens instead (documented per-export).
//
// Return conventions (match the shorts vocabulary, not tweenInto):
//   motion factories (valueRoll, sheenSweep, scanline) return a fresh
//   UNPAUSED gsap.timeline() the caller places (`tl.add(x, at)` re-schedules
//   it); mount factories (stateChip, routeChip, raceLane, browserShell)
//   return handle objects with verb methods that return timelines.
//
// QC: videos/_qc-instruments/index.html (?auto=1 runs the numeric probes).

/* eslint-env browser */
/* global gsap */

// Band-space → stage-space. IframeManager's elementToStageCoords are relative
// to ITS stage (the device band in shorts); overlays mounted on the full
// 1080×1920 stage need the band's y offset added. Three films hand-rolled
// `BAND_Y = 300` — the library owns it now (pass bandY when the layout differs).
export const BAND_Y = 300;
export function bandToStage(y, bandY = BAND_Y) { return y + bandY; }

const FONT = 'Bahnschrift, "DIN Alternate", system-ui, sans-serif';
const TONES = {
  orange: { bg: '#E27730', fg: '#fff' },
  dark:   { bg: '#14110e', fg: '#fff' },
  red:    { bg: '#d63638', fg: '#fff' },
  green:  { bg: '#46b450', fg: '#fff' },
  ink:    { bg: '#3b3631', fg: '#fff' },
};
const tone = (t) => TONES[t] || { bg: t || TONES.orange.bg, fg: '#fff' };

// ── valueRoll — a number changes on real DOM (the product's true behavior,
//    puppeted in place). mode 'tween' interpolates through intermediate
//    values (the coupon $60→$48 roll); mode 'slot' rolls the element out/in
//    like a split-flap (the GATE 2→5 digit, the Spam (0)→(1) count).
//
// @param {Element} el — the REAL text node's element (iframe-doc or stage)
// @param {Object} opts { from, to, format = v => String(v), mode = 'tween',
//                        duration = 0.8, delay = 0, pulse = true,
//                        pulseOrigin = '100% 50%' }
// @returns {gsap.core.Timeline} — unpaused; caller places it
export function valueRoll(el, {
  from, to, format = (v) => String(v),
  mode = 'tween', duration = 0.8, delay = 0,
  pulse = true, pulseOrigin = '100% 50%',
} = {}) {
  const tl = gsap.timeline({ delay });
  if (!el) return tl;
  if (mode === 'slot') {
    // Split-flap: out up, swap, in from below (gateDigit/rollSpamCount shape).
    tl.set(el, { display: 'inline-block' }, 0);
    tl.to(el, { yPercent: -110, duration: 0.18, ease: 'power2.in' }, 0);
    tl.call(() => { el.textContent = format(to); }, null, 0.18);
    tl.fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.2, ease: 'power3.out' }, 0.18);
  } else {
    const roll = { v: from };
    tl.to(roll, {
      v: to, duration, ease: 'power2.out',
      onUpdate: () => { el.textContent = format(roll.v); },
      onComplete: () => { el.textContent = format(to); }, // exact-value snap
    }, 0);
  }
  if (pulse) {
    tl.fromTo(el, { scale: 1 }, {
      scale: mode === 'slot' ? 1.22 : 1.15, transformOrigin: pulseOrigin,
      duration: mode === 'slot' ? 0.22 : 0.3, yoyo: true, repeat: 1, ease: 'power2.out',
    }, mode === 'slot' ? 0.28 : 0);
  }
  return tl;
}

// ── sheenSweep — contrast-aware carrier: a diagonal sweep across a host.
//    tone 'dark' reads on white admin panels (where white sheens and 2px
//    jolts are invisible — the carrier rule's contrast axis); tone 'light'
//    for dark editorial grounds. The strip is created at play time and
//    removed on complete; host wants overflow:hidden.
//
// @param {Element} host — the surface to sweep (device band, card, shell)
// @param {Object} opts { at = 0, angle = -14, tone = 'dark', duration = 0.9,
//                        width = 220 }
// @returns {gsap.core.Timeline}
export function sheenSweep(host, { at = 0, angle = -14, tone: t = 'dark', duration = 0.9, width = 220 } = {}) {
  const tl = gsap.timeline();
  if (!host) return tl;
  const color = t === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(24,34,50,0.22)';
  tl.call(() => {
    const hostW = host.offsetWidth || 1080;
    const hostH = host.offsetHeight || 1200;
    const sweep = document.createElement('div');
    sweep.className = 'wpfi-sheen';
    sweep.style.cssText = `position:absolute;top:${-Math.round(hostH * 0.05)}px;left:0;width:${width}px;` +
      `height:${Math.round(hostH * 1.1)}px;` +
      `background:linear-gradient(100deg,transparent,${color},transparent);` +
      `transform:skewX(${angle}deg);z-index:46;pointer-events:none;`;
    host.appendChild(sweep);
    gsap.fromTo(sweep, { x: -(width + 60) }, {
      x: hostW + 100, duration, ease: 'power2.inOut', onComplete: () => sweep.remove(),
    });
  }, null, at);
  return tl;
}

// ── stateChip — a labelled state pill (GATE 2s / TIMER 0.0s). Explains a
//    state and keeps explaining it as the state changes: .set() slot-rolls
//    the value span in place.
//
// @param {Element} host — stage-level mount (a card, the surround dock, …)
// @param {Object} opts { label, value = '', unit = '', tone = 'orange',
//                        x = 0, y = 0, zIndex = 8, fontSize = 48 }
// @returns {{ el, valueEl, set(v, opts), tweenIn(opts), dispose }}
export function stateChip(host, {
  label = '', value = '', unit = '', tone: t = 'orange',
  x = 0, y = 0, zIndex = 8, fontSize = 48,
} = {}) {
  const { bg, fg } = tone(t);
  const el = document.createElement('div');
  el.className = 'wpfi-state-chip';
  el.style.cssText = `position:absolute;left:0;top:0;padding:10px 24px;border-radius:14px;` +
    `background:${bg};color:${fg};font:700 ${fontSize}px/1.1 ${FONT};` +
    `z-index:${zIndex};overflow:hidden;white-space:nowrap;visibility:hidden;`;
  el.innerHTML = `${label ? label + '&nbsp;' : ''}<span class="wpfi-chip-value" style="display:inline-block">${value}</span>${unit}`;
  host.appendChild(el);
  const valueEl = el.querySelector('.wpfi-chip-value');
  gsap.set(el, { x, y, autoAlpha: 0 });
  return {
    el, valueEl,
    // Roll the value to v. mode 'slot' (default — the GATE 2→5 move) or
    // 'text' (instant swap, no motion).
    set(v, { mode = 'slot', format = (x2) => String(x2) } = {}) {
      if (mode === 'text') { valueEl.textContent = format(v); return gsap.timeline(); }
      return valueRoll(valueEl, { to: v, format, mode: 'slot', pulse: true, pulseOrigin: '50% 50%' });
    },
    tweenIn({ duration = 0.45, rise = 26 } = {}) {
      const tl = gsap.timeline();
      tl.set(el, { visibility: 'visible' }, 0);
      tl.fromTo(el, { autoAlpha: 0, y: y + rise }, { autoAlpha: 1, y, duration, ease: 'power3.out' }, 0);
      return tl;
    },
    dispose() { el.remove(); },
  };
}

// ── routeChip — a chip that names where something GOES (→ YOU fly-off) or
//    what something IS (→ THEM plant). The anchor is a FUNCTION resolved at
//    fire time — never a captured coordinate (nvc QC2: the page keeps
//    reflowing after a swap; beat-start coords go stale).
//
// fire(tl, { at }) schedules the measurement + motion via tl.call — correct
// for the real-time shorts render; a --seek film should pre-measure and
// place plain tweens.
//
// @param {Element} host — stage-level mount
// @param {Object} opts { text, tone = 'orange', anchor = () => ({x, y}),
//                        mode = 'fly-off', offset = {x: 0, y: -90},
//                        fly = {x: -160, y: -260, rotation: -10},
//                        holdS = 1.1, zIndex = 60, fontSize = 52 }
// @returns {{ el, fire(tl, opts), dispose }}
export function routeChip(host, {
  text = '', tone: t = 'orange', anchor = () => ({ x: 540, y: 600 }),
  mode = 'fly-off', offset = { x: 0, y: -90 },
  fly = { x: -160, y: -260, rotation: -10 }, holdS = 1.1,
  zIndex = 60, fontSize = 52,
} = {}) {
  const { bg, fg } = tone(t);
  const el = document.createElement('div');
  el.className = 'wpfi-route-chip';
  el.textContent = text;
  el.style.cssText = `position:absolute;left:0;top:0;padding:14px 30px;background:${bg};color:${fg};` +
    `font:800 ${fontSize}px/1 ${FONT};border-radius:14px;white-space:nowrap;` +
    `box-shadow:0 16px 44px rgba(0,0,0,0.35);z-index:${zIndex};pointer-events:none;visibility:hidden;`;
  host.appendChild(el);
  let fired = false;
  return {
    el,
    fire(tl, { at = 0 } = {}) {
      const target = tl || gsap.timeline();
      target.call(() => {
        if (fired) return; fired = true;
        let p;
        try { p = anchor(); } catch (e) { p = { x: 540, y: 600 }; }
        const x0 = p.x + (offset.x || 0), y0 = p.y + (offset.y || 0);
        gsap.set(el, { xPercent: -50, yPercent: -50, x: x0, y: y0, autoAlpha: 0, scale: 0.6, rotation: mode === 'fly-off' ? -4 : 3, visibility: 'visible' });
        gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'back.out(2.2)' });
        if (mode === 'fly-off') {
          gsap.to(el, {
            x: x0 + (fly.x || 0), y: y0 + (fly.y || 0), rotation: fly.rotation || -10,
            duration: 0.6, ease: 'power2.in', delay: holdS * 0.5, onComplete: () => el.remove(),
          });
        } else {
          gsap.to(el, { autoAlpha: 0, y: y0 + 30, duration: 0.3, ease: 'power2.in', delay: holdS, onComplete: () => el.remove() });
        }
      }, null, at);
      return target;
    },
    dispose() { el.remove(); },
  };
}

// ── scanline — a reading/judging pass over a surface (the spam filter's
//    red scan). Strip is created at play, removed on complete.
//
// @param {Element} host — the surface being read (shell, card)
// @param {Object} opts { color = '#d63638', height = 7, duration = 1.0,
//                        at = 0, glow = true }
// @returns {gsap.core.Timeline}
export function scanline(host, { color = '#d63638', height = 7, duration = 1.0, at = 0, glow = true } = {}) {
  const tl = gsap.timeline();
  if (!host) return tl;
  tl.call(() => {
    const travel = (host.offsetHeight || 900) + 40;
    const scan = document.createElement('div');
    scan.className = 'wpfi-scanline';
    scan.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${height}px;` +
      `background:linear-gradient(90deg,transparent,${color},transparent);` +
      (glow ? `box-shadow:0 0 26px 6px ${color}59;` : '') +
      'z-index:5;pointer-events:none;';
    host.appendChild(scan);
    gsap.fromTo(scan, { y: 0 }, { y: travel, duration, ease: 'power1.inOut', onComplete: () => scan.remove() });
  }, null, at);
  return tl;
}

// ── raceLane — a time axis with tick marks and a runner dot (the bot-vs-gate
//    race). Parameterized axis (the shipped one hard-coded 0–6s). scrub()
//    drives dot + fill + an optional onTick readout together, ease:none —
//    the timer chip and the dot can never disagree.
//
// @param {Element} host
// @param {Object} opts { axis = [0, 6], marks = [{t, label}], width = 940,
//                        x = 0, y = 0, zIndex = 8 }
// @returns {{ el, parts, scrub(opts), reset(), tickFlare(t), tweenIn(opts), dispose }}
export function raceLane(host, {
  axis = [0, 6], marks = [], width = 940, x = 0, y = 0, zIndex = 8,
} = {}) {
  const [a0, a1] = axis;
  const frac = (t) => Math.max(0, Math.min(1, (t - a0) / (a1 - a0 || 1)));
  const el = document.createElement('div');
  el.className = 'wpfi-race-lane';
  el.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:12px;border-radius:6px;` +
    `background:#eee3d8;z-index:${zIndex};visibility:hidden;`;
  const fill = document.createElement('div');
  fill.className = 'wpfi-lane-fill';
  fill.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:100%;border-radius:6px;background:#E27730;transform-origin:left center;';
  el.appendChild(fill);
  gsap.set(fill, { scaleX: 0 });
  const ticks = {};
  for (const { t, label } of marks) {
    const tick = document.createElement('div');
    tick.className = 'wpfi-lane-tick';
    tick.style.cssText = `position:absolute;left:${frac(t) * 100}%;top:-18px;width:5px;height:48px;background:#3b3631;border-radius:3px;`;
    if (label) {
      const lb = document.createElement('div');
      lb.textContent = label;
      lb.style.cssText = `position:absolute;top:-56px;left:50%;transform:translateX(-50%);font:700 34px ${FONT};color:#3b3631;`;
      tick.appendChild(lb);
    }
    el.appendChild(tick);
    ticks[t] = tick;
  }
  const dot = document.createElement('div');
  dot.className = 'wpfi-lane-dot';
  dot.style.cssText = 'position:absolute;left:0;top:-12px;width:36px;height:36px;border-radius:50%;background:#3b3631;border:5px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,0.3);z-index:9;';
  el.appendChild(dot);
  gsap.set(dot, { x: -18, autoAlpha: 0 });
  host.appendChild(el);
  gsap.set(el, { x, y });

  return {
    el,
    parts: { fill, dot, ticks },
    // One run along the axis to `to` seconds. onTick(v) fires per frame with
    // the interpolated axis value (feed a stateChip's textContent).
    scrub({ to, duration = 2.2, onTick = null, ease = 'none' } = {}) {
      const tl = gsap.timeline();
      const endX = frac(to) * width - 18;
      tl.set(dot, { autoAlpha: 1, x: -18 }, 0);
      if (onTick) {
        const v = { v: a0 };
        tl.to(v, { v: to, duration, ease, onUpdate: () => onTick(v.v) }, 0);
      }
      tl.to(dot, { x: endX, duration, ease }, 0);
      tl.to(fill, { scaleX: frac(to), duration, ease }, 0);
      return tl;
    },
    reset() {
      gsap.set(dot, { x: -18 });
      gsap.set(fill, { scaleX: 0 });
      return gsap.fromTo(dot, { scale: 1 }, { scale: 1.4, duration: 0.16, yoyo: true, repeat: 1 });
    },
    tickFlare(t) {
      const tick = ticks[t];
      if (!tick) return gsap.timeline();
      return gsap.fromTo(tick, { scale: 1 }, { scale: 1.6, transformOrigin: '50% 100%', duration: 0.24, yoyo: true, repeat: 1, ease: 'power2.out' });
    },
    tweenIn({ duration = 0.45, rise = 26 } = {}) {
      const tl = gsap.timeline();
      tl.set(el, { visibility: 'visible' }, 0);
      tl.fromTo(el, { autoAlpha: 0, y: y + rise }, { autoAlpha: 1, y, duration, ease: 'power3.out' }, 0);
      return tl;
    },
    dispose() { el.remove(); },
  };
}

// ── browserShell — a browser frame with traffic lights + a location pill,
//    for "a visitor sees this" framings. Content goes into .body (the area
//    under the 66px bar).
//
// @param {Element} host
// @param {Object} opts { pill = '', width = 900, height = 920, x = 90,
//                        y = 400, z = 56 }
// @returns {{ el, body, pillEl, tweenIn(opts), dispose }}
export function browserShell(host, { pill = '', width = 900, height = 920, x = 90, y = 400, z = 56 } = {}) {
  const el = document.createElement('div');
  el.className = 'wpfi-browser-shell';
  el.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${height}px;background:#fff;` +
    `border-radius:22px;box-shadow:0 34px 90px rgba(10,14,20,0.5);overflow:hidden;z-index:${z};visibility:hidden;`;
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:66px;background:#eceff3;border-bottom:1px solid #d9dde3;display:flex;align-items:center;gap:10px;padding:0 22px;z-index:3;';
  bar.innerHTML =
    '<span style="width:14px;height:14px;border-radius:50%;background:#ff5f57"></span>' +
    '<span style="width:14px;height:14px;border-radius:50%;background:#febc2e"></span>' +
    '<span style="width:14px;height:14px;border-radius:50%;background:#28c840"></span>' +
    `<span class="wpfi-shell-pill" style="margin-left:14px;padding:8px 20px;border-radius:999px;background:#fff;font:600 26px ${FONT};color:#3b4452;">${pill}</span>`;
  el.appendChild(bar);
  const body = document.createElement('div');
  body.className = 'wpfi-shell-body';
  body.style.cssText = 'position:absolute;left:0;top:66px;right:0;bottom:0;';
  el.appendChild(body);
  host.appendChild(el);
  gsap.set(el, { x, y, autoAlpha: 0 });
  return {
    el, body, pillEl: bar.querySelector('.wpfi-shell-pill'),
    tweenIn({ duration = 0.5, rise = 30 } = {}) {
      const tl = gsap.timeline();
      tl.set(el, { visibility: 'visible' }, 0);
      tl.fromTo(el, { autoAlpha: 0, y: y + rise }, { autoAlpha: 1, y, duration, ease: 'power3.out' }, 0);
      return tl;
    },
    dispose() { el.remove(); },
  };
}
