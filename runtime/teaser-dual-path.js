// Teaser — "dual path" entry screen for creating-first-form.
//
// Split layout:
//   LEFT  — AI prompt card types an idea (narrative chrome, not app UI).
//   RIGHT — REAL iframe of /snapshots/admin-templates/index.html, clipped
//           and held in perspective. Scrolls vertically to reveal the
//           template gallery. One card pulls into focus.
//   END   — hook line fades in, stage eases back, handoff.
//
// Hard rule: the right side MUST be the real snapshot iframe, never mocked.
// Left is synthetic because the AI prompt UI is narrative, not WPForms UI.
//
// Contract: `mount(opts) → { root, animPromise, dismiss }`. Visual phases
// gate on narration clip endings so audio/visual stay locked.

import { playNarration } from '../scenes/shared.js';

const STYLE_ID = 'teaser-dual-path-css';
const TEMPLATES_SRC = '/snapshots/admin-templates/index.html';

const CSS = `
.tdp-root { position: fixed; inset: 0; z-index: 600; overflow: hidden;
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            background: radial-gradient(60% 50% at 22% 20%, rgba(255,196,140,0.55), transparent 60%),
                        radial-gradient(55% 45% at 82% 78%, rgba(255,168,110,0.45), transparent 65%),
                        linear-gradient(180deg, #fff7ec 0%, #ffeedc 100%);
            transition: opacity .55s ease; }
.tdp-root.exit { opacity: 0; }

.tdp-stage { position: relative; width: 100vw; height: 100vh;
             transform-origin: center; }

.tdp-divider { position:absolute; left:50%; top:0; bottom:0; width:2px;
               background: linear-gradient(180deg, transparent, rgba(226,119,48,0.85) 18%, rgba(226,119,48,0.85) 82%, transparent);
               transform: translateX(-50%) scaleY(0); transform-origin: top center; }

.tdp-half { position:absolute; top:0; bottom:0; width:50%;
            display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 0 40px; }
.tdp-left  { left:0; }
.tdp-right { right:0; padding: 0 36px; }

.tdp-label { font: 600 13px/1 -apple-system,sans-serif; letter-spacing: 2px; text-transform: uppercase;
             color: #E27730; opacity: 0; margin-bottom: 22px; }

/* ---- Left: AI prompt card (narrative chrome — allowed) -------------- */
.tdp-prompt { width: min(460px, 92%); background:#fff; border-radius:14px;
              box-shadow: 0 24px 64px rgba(68,68,68,0.14), 0 6px 18px rgba(68,68,68,0.08);
              padding: 18px 22px 20px; opacity: 0; transform: translateY(12px); }
.tdp-prompt .brow { color:#E27730; font: 600 12px/1 -apple-system,sans-serif;
                    letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
.tdp-prompt .text { font: 500 18px/1.45 -apple-system,Georgia,serif; color:#222;
                    min-height: 56px; }
.tdp-prompt .caret { display:inline-block; width:2px; height:1.1em; background:#222;
                     vertical-align:-2px; margin-left:2px; animation: caretBlink .9s infinite; }
@keyframes caretBlink { 50% { opacity: 0; } }
.tdp-prompt .gen { display:flex; justify-content:flex-end; margin-top: 14px; }
.tdp-prompt .gen .btn { background:#E27730; color:#fff; padding:8px 14px; border-radius:6px;
                        font: 600 13px/1 -apple-system,sans-serif; opacity: .55; }
.tdp-prompt.pulse .gen .btn { animation: genPulse .9s ease-out 2; }
@keyframes genPulse { 0%{ transform:scale(1); opacity:.55; } 50%{ transform:scale(1.06); opacity:1; } 100%{ transform:scale(1); opacity:.55; } }

/* ---- Right: real snapshot iframe in a tilted frame ------------------ */
/* Iframe is rendered at 1600x1000 then scaled 0.55 → ~880x550 visible.
   Width is wide enough that WPForms renders the template grid in 3 columns.
   Frame aspect-ratio matches the scaled iframe so no blank area bleeds through. */
.tdp-frame { position: relative; width: min(880px, 96%);
             aspect-ratio: 880 / 550;
             max-height: 70vh;
             perspective: 1800px; opacity: 0; }
.tdp-frame-inner { position: absolute; inset: 0;
                   border-radius: 14px;
                   background: #fff;
                   box-shadow: 0 40px 90px rgba(68,68,68,0.22), 0 10px 28px rgba(68,68,68,0.12);
                   transform-origin: center center;
                   transform-style: preserve-3d;
                   overflow: hidden;
                   will-change: transform; }
.tdp-iframe { position: absolute; top: 0; left: 0;
              width: 1600px; height: 1000px;
              border: 0; background: #fff;
              transform-origin: top left;
              transform: scale(0.55);
              pointer-events: none; }
.tdp-frame-glare { position: absolute; inset: 0; pointer-events: none;
                   background: linear-gradient(115deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.18) 100%);
                   mix-blend-mode: overlay; }

/* ---- Finale title ---------------------------------------------------- */
.tdp-title { position:absolute; inset:0; display:flex; flex-direction:column;
             align-items:center; justify-content:center; opacity: 0; pointer-events:none; }
.tdp-title .brow { color:#E27730; font: 600 13px/1 -apple-system,sans-serif;
                   letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px; }
.tdp-title .big  { font: 700 58px/1.05 -apple-system,'Segoe UI',sans-serif; color:#222; text-align:center; }
.tdp-title .sub  { font: 500 18px/1.4 -apple-system,sans-serif; color:#666; margin-top: 10px; }
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

let gsapReady = null;
function loadGsap() {
  if (window.gsap) return Promise.resolve(window.gsap);
  if (gsapReady) return gsapReady;
  gsapReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/gsap@3/dist/gsap.min.js';
    s.onload = () => resolve(window.gsap);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsapReady;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Wait for iframe load, strip the WP admin bar, then wait one rAF so layout
// reflows before we read scrollHeight.
function iframeReady(iframe) {
  return new Promise(resolve => {
    const finish = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document || null;
      if (doc) {
        try {
          // Yank the admin bar entirely — CSS alone loses to WP's inline rules.
          doc.getElementById('wpadminbar')?.remove();
          doc.documentElement.classList.remove('wp-toolbar');
          doc.body?.classList.remove('admin-bar');
          const s = doc.createElement('style');
          s.textContent = `
            html, html.wp-toolbar { margin-top: 0 !important; padding-top: 0 !important; }
            body, body.admin-bar { margin-top: 0 !important; padding-top: 0 !important; }
            #wpadminbar { display: none !important; }
          `;
          doc.head.appendChild(s);
        } catch {}
      }
      requestAnimationFrame(() => resolve(doc));
    };
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') finish();
    else iframe.addEventListener('load', finish, { once: true });
  });
}

// ── mount ───────────────────────────────────────────────────────────────────
export async function mount() {
  ensureStyles();
  const gsap = await loadGsap();

  const ov = document.createElement('div');
  ov.className = 'tdp-root';
  ov.innerHTML = `
    <div class="tdp-stage">
      <div class="tdp-divider"></div>

      <div class="tdp-half tdp-left">
        <div class="tdp-label">Describe it</div>
        <div class="tdp-prompt">
          <div class="brow">WPForms AI</div>
          <div class="text"><span class="live"></span><span class="caret"></span></div>
          <div class="gen"><div class="btn">Generate</div></div>
        </div>
      </div>

      <div class="tdp-half tdp-right">
        <div class="tdp-label">Or pick a template</div>
        <div class="tdp-frame">
          <div class="tdp-frame-inner">
            <iframe class="tdp-iframe" src="${TEMPLATES_SRC}" loading="eager"></iframe>
            <div class="tdp-frame-glare"></div>
          </div>
        </div>
      </div>

      <div class="tdp-title">
        <div class="brow">Creating Your First Form</div>
        <div class="big">Two ways. One result.</div>
        <div class="sub">You're live in minutes.</div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  const stage     = ov.querySelector('.tdp-stage');
  const divider   = ov.querySelector('.tdp-divider');
  const leftLbl   = ov.querySelector('.tdp-left  .tdp-label');
  const rightLbl  = ov.querySelector('.tdp-right .tdp-label');
  const prompt    = ov.querySelector('.tdp-prompt');
  const live      = ov.querySelector('.tdp-prompt .live');
  const frame     = ov.querySelector('.tdp-frame');
  const frameInner= ov.querySelector('.tdp-frame-inner');
  const iframe    = ov.querySelector('.tdp-iframe');
  const titleBox  = ov.querySelector('.tdp-title');

  // Kick off iframe load early; we'll await it before animating scroll.
  const iframeReadyP = iframeReady(iframe);

  // Initial 3D pose of the frame.
  gsap.set(frameInner, { rotationY: -18, rotationX: 6, rotationZ: -1.5, scale: 0.96 });

  // ── Sullie's Bakery typed idea ──────────────────────────────────────────
  const IDEA = "Contact form for Sullie's Bakery";
  async function typeInto(target, str, { cps = 18, hesitateAt = null } = {}) {
    for (let i = 0; i < str.length; i++) {
      target.textContent += str[i];
      await sleep(1000 / cps + (Math.random() * 40));
      if (hesitateAt && i === hesitateAt) await sleep(420);
    }
  }

  // Scroll the iframe page. Uses contentWindow scrollTo for smoothness.
  function scrollIframeTo(doc, y) {
    try {
      const win = doc.defaultView || iframe.contentWindow;
      win.scrollTo({ top: y, behavior: 'auto' });
    } catch {}
  }
  function animateIframeScroll(doc, from, to, duration) {
    return new Promise(resolve => {
      const obj = { y: from };
      gsap.to(obj, {
        y: to, duration, ease: 'sine.inOut',
        onUpdate: () => scrollIframeTo(doc, obj.y),
        onComplete: resolve,
      });
    });
  }

  const animPromise = (async () => {
    // ── Phase 1: reveal (narration 1) ────────────────────────────────────
    const clip1 = await playNarration('cff-entry-1');
    gsap.to(divider, { scaleY: 1, duration: 0.65, ease: 'power2.out' });
    await sleep(240);
    gsap.to([leftLbl, rightLbl], { opacity: 1, duration: 0.5, stagger: 0.18 });
    gsap.to(prompt, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: 0.1 });
    gsap.to(frame,  { opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.25 });
    // Subtle entry tilt settle.
    gsap.to(frameInner, { rotationY: -14, rotationX: 4, scale: 1.0, duration: 1.1, ease: 'power3.out', delay: 0.3 });
    await clip1.ended;

    // ── Phase 2: typing (left) + scroll + tilt (right) — narration 2 ─────
    const clip2 = await playNarration('cff-entry-2');
    const doc = await iframeReadyP;

    // Left: type the idea.
    const typePromise = typeInto(live, IDEA, { cps: 18, hesitateAt: 14 });

    // Right: slow vertical scroll through the template list with a gentle
    // tilt sway. This is the "wow" — real cards moving past in perspective.
    const scrollEnd = doc ? Math.max(0, (doc.documentElement.scrollHeight || 1800) - 1000) : 1800;
    const scrollTarget = Math.min(scrollEnd, 2400);
    const scrollP = animateIframeScroll(doc, 0, scrollTarget, 3.0);

    // Tilt sway alongside scroll.
    gsap.to(frameInner, { rotationY: -8, rotationX: 2.5, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: 1 });

    await typePromise;
    prompt.classList.add('pulse');
    await sleep(900);
    prompt.classList.remove('pulse');

    await scrollP;
    await clip2.ended;

    // ── Phase 3: straighten + title pull (narration 3) ───────────────────
    const clip3 = await playNarration('cff-entry-3');
    gsap.to(frameInner, { rotationY: 0, rotationX: 0, rotationZ: 0, scale: 1.02, duration: 0.9, ease: 'power3.out' });
    gsap.to([prompt, frame, divider, leftLbl, rightLbl], {
      opacity: 0.2, duration: 0.6, ease: 'power2.out',
    });
    gsap.to(titleBox, { opacity: 1, duration: 0.6, delay: 0.2, ease: 'power2.out' });
    gsap.to(stage,    { scale: 0.97, duration: 1.4, ease: 'power2.inOut' });
    await clip3.ended;
    await sleep(220);
  })();

  async function dismiss() {
    ov.classList.add('exit');
    await sleep(560);
    ov.remove();
  }

  return { root: ov, animPromise, dismiss };
}
