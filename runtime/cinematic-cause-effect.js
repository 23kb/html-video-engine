// Cinematic post-intro archetype: cause → effect.
//
// Standalone module. Mounts a full-screen overlay at z-index 600,
// runs a calm Apple-product-style timeline (synthetic contact form
// → cursor → Submit → form dims → email card slides in from the
// right with a thin orange accent stripe), then yields control via
// the same lifecycle contract as runtime/teaser-*.js:
//
//   const { root, animPromise, dismiss } = await mount(opts);
//   await animPromise;
//   await dismiss();
//
// Visual direction lives in docs/todo-4-cinematic-moments.md
// §"Visual direction — Slice 1 only". WPForms brand-color guardrails:
// accent #E27730, type #444444 / #777777, no neon, no heavy shadows.
//
// This module does NOT touch the player, chapter-runner, manifest,
// or compiler. It is intentionally reviewable in isolation through
// scenes/cinematic-lab.html.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { mountCaption } from './cinematic-kit/text.js';

const STYLE_ID = 'cce-styles';

const CSS = `
.cce-root {
  position: fixed; inset: 0; z-index: 600;
  font-family: -apple-system, 'Segoe UI', Roboto, 'Inter', sans-serif;
  color: #444444;
  opacity: 0; transition: opacity .45s ease;
  overflow: hidden;
}
.cce-root.on   { opacity: 1; }
.cce-root.exit { opacity: 0; transition: opacity .5s ease; }

.cce-stage {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}

/* Mac-style site frame ------------------------------------------------ */
.cce-site {
  position: relative;
  width: min(820px, 64vw);
  height: min(540px, 70vh);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: var(--cce-card-shadow, 0 30px 60px rgba(20,22,28,0.12));
  overflow: hidden;
  display: flex; flex-direction: column;
  will-change: transform, opacity, filter;
}

.cce-chrome {
  flex: 0 0 38px; background: #f1f2f4;
  display: flex; align-items: center; gap: 10px; padding: 0 14px;
  border-bottom: 1px solid #e3e4e7;
}
.cce-chrome .dots { display: flex; gap: 7px; }
.cce-chrome .dot  { width: 11px; height: 11px; border-radius: 50%; }
.cce-chrome .dots .dot:nth-child(1) { background: #ff5f57; }
.cce-chrome .dots .dot:nth-child(2) { background: #febc2e; }
.cce-chrome .dots .dot:nth-child(3) { background: #28c840; }
.cce-chrome .url {
  flex: 1; max-width: 320px; margin: 0 auto;
  background: #ffffff; border-radius: 6px;
  font: 500 11px/1 -apple-system, sans-serif; color: #777777;
  padding: 5px 12px; text-align: center;
  letter-spacing: 0.01em;
}

.cce-page  { flex: 1; padding: 30px 44px; display: flex; flex-direction: column; }
.cce-brand {
  font: 600 11px/1 -apple-system, sans-serif;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: #777777; margin-bottom: 14px;
}
.cce-h1 {
  font: 500 26px/1.25 'Georgia', 'Instrument Serif', serif;
  color: #444444; margin: 0 0 6px;
}
.cce-sub {
  font: 400 14px/1.5 -apple-system, sans-serif;
  color: #777777; margin: 0 0 22px; max-width: 480px;
}

.cce-form  { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.cce-field { display: flex; flex-direction: column; gap: 5px; }
.cce-label {
  font: 500 10px/1 -apple-system, sans-serif;
  color: #777777; letter-spacing: 0.08em; text-transform: uppercase;
}
.cce-input {
  background: #f7f8f9;
  border: 1px solid #e3e4e7;
  border-radius: 7px;
  padding: 9px 12px;
  font: 400 13px/1.4 -apple-system, sans-serif;
  color: #444444;
  min-height: 16px;
}
.cce-input.textarea { min-height: 46px; }

.cce-submit-row { display: flex; justify-content: flex-start; margin-top: 6px; }
.cce-submit {
  position: relative;
  font: 600 13px/1 -apple-system, sans-serif;
  color: #ffffff;
  background: var(--cce-accent, #E27730);
  border: 0; border-radius: 7px;
  padding: 11px 22px;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 14px rgba(226, 119, 48, 0.22);
  overflow: hidden;
  cursor: default;
  will-change: transform;
}
.cce-submit .ripple {
  position: absolute; left: 50%; top: 50%;
  width: 220px; height: 220px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none; opacity: 0;
}
.cce-submit.pressed .ripple {
  animation: cce-ripple .65s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes cce-ripple {
  0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.7);  opacity: 0;    }
}

/* Cursor -------------------------------------------------------------- */
.cce-cursor {
  position: absolute; left: 0; top: 0;
  width: 26px; height: 26px;
  pointer-events: none; opacity: 0; z-index: 30;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.32));
  will-change: transform, opacity;
}

/* Email card ---------------------------------------------------------- */
.cce-email {
  position: absolute; left: 0; top: 0;
  width: min(420px, 38vw);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 30px 60px rgba(20,22,28,0.18), 0 8px 20px rgba(20,22,28,0.06);
  overflow: hidden;
  opacity: 0;
  will-change: transform, opacity;
}
.cce-email .stripe { height: 3px; background: var(--cce-accent, #E27730); }
.cce-email .body   { padding: 20px 22px 22px; }
.cce-email .meta {
  font: 600 10px/1 -apple-system, sans-serif;
  color: var(--cce-accent, #E27730);
  letter-spacing: 0.16em; text-transform: uppercase;
  margin: 0 0 10px;
}
.cce-email .title {
  font: 500 18px/1.3 'Georgia', 'Instrument Serif', serif;
  color: #444444; margin: 0 0 14px;
}
.cce-email .row {
  display: flex; gap: 10px;
  font: 400 12px/1.5 -apple-system, sans-serif;
  color: #777777;
}
.cce-email .row + .row     { margin-top: 4px; }
.cce-email .row .key       { font-weight: 600; color: #444444; min-width: 56px; }
.cce-email .row .val       { color: #444444; }
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Mount the cause-effect cinematic.
 *
 * @param {object} opts
 * @param {object} [opts.theme]
 * @param {string} [opts.theme.background] — 'warm-cream' (default) | 'cool-paper' | 'neutral-fog'
 * @param {string} [opts.theme.accent]     — single accent color, default '#E27730'
 * @param {number} [opts.duration]         — total timeline seconds, default ~7
 * @param {string} [opts.formName]
 * @param {string} [opts.recipient]
 * @param {string} [opts.subject]
 * @param {string} [opts.label]
 * @returns {Promise<{root: HTMLElement, animPromise: Promise<void>, dismiss: () => Promise<void>}>}
 */
export async function mount(opts = {}) {
  ensureStyles();
  const gsap = await loadGsap();

  const theme = resolveTheme(opts.theme, 'warm-cream');
  const accent = (opts.theme && opts.theme.accent) || '#E27730';
  const totalDuration = typeof opts.duration === 'number' ? opts.duration : 7;

  const formName  = opts.formName  || 'Contact Us';
  const recipient = opts.recipient || 'site-admin@example.com';
  const subject   = opts.subject   || 'New Entry: Contact Us';
  const label     = opts.label     || 'Send the right email to the right person.';

  const root = document.createElement('div');
  root.className = 'cce-root';
  root.style.background = theme.background;
  root.style.setProperty('--cce-card-shadow', theme.cardShadow);
  root.style.setProperty('--cce-accent', accent);

  const urlSlug = (formName || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '');
  root.innerHTML = `
    <div class="cce-stage">
      <div class="cce-site">
        <div class="cce-chrome">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <div class="url">${escapeHTML(urlSlug || 'site')}.com/contact</div>
        </div>
        <div class="cce-page">
          <div class="cce-brand">${escapeHTML(formName)}</div>
          <h1 class="cce-h1">Get in touch</h1>
          <p class="cce-sub">Drop us a note and we'll be back in touch the same day.</p>
          <div class="cce-form">
            <div class="cce-field">
              <span class="cce-label">Name</span>
              <div class="cce-input">Sullie Eloso</div>
            </div>
            <div class="cce-field">
              <span class="cce-label">Email</span>
              <div class="cce-input">sullie@example.com</div>
            </div>
            <div class="cce-field">
              <span class="cce-label">Message</span>
              <div class="cce-input textarea">Hi team — quick question about your hours this week.</div>
            </div>
            <div class="cce-submit-row">
              <button class="cce-submit" type="button">Submit<span class="ripple"></span></button>
            </div>
          </div>
        </div>
      </div>

      <svg class="cce-cursor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 3 L24 14 L14 16 L10 26 Z" fill="#1e1410" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>

      <div class="cce-email" role="presentation">
        <div class="stripe"></div>
        <div class="body">
          <div class="meta">New entry</div>
          <h2 class="title">${escapeHTML(subject)}</h2>
          <div class="row"><span class="key">From</span><span class="val">${escapeHTML(formName)}</span></div>
          <div class="row"><span class="key">To</span><span class="val">${escapeHTML(recipient)}</span></div>
          <div class="row"><span class="key">Subject</span><span class="val">${escapeHTML(subject)}</span></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Fade overlay in
  await sleep(20);
  root.classList.add('on');

  const stage  = root.querySelector('.cce-stage');
  const site   = root.querySelector('.cce-site');
  const cursor = root.querySelector('.cce-cursor');
  const submit = root.querySelector('.cce-submit');
  const email  = root.querySelector('.cce-email');

  // Initial transform states
  gsap.set(site,   { opacity: 0, y: 14, scale: 0.985 });
  gsap.set(cursor, { opacity: 0, x: 0, y: 0 });
  gsap.set(email,  { opacity: 0, x: 0, y: 0 });

  // Layout helpers — resolved at runtime, after the site has settled.
  const stageOrigin = () => {
    const r = stage.getBoundingClientRect();
    return { left: r.left, top: r.top };
  };
  const placeEmailNextToSite = () => {
    const sR = site.getBoundingClientRect();
    const eR = email.getBoundingClientRect();
    const o  = stageOrigin();
    const top  = sR.top  - o.top  + (sR.height - eR.height) / 2;
    const left = sR.right - o.left - 80; // overlap the right edge of the form
    email.style.top  = top  + 'px';
    email.style.left = left + 'px';
  };
  const cursorAt = (target, dx = 14, dy = 8) => {
    const tR = target.getBoundingClientRect();
    const o  = stageOrigin();
    return { x: tR.left - o.left + dx, y: tR.top - o.top + tR.height / 2 + dy };
  };

  let cursorEnd = { x: 0, y: 0 };
  let captionHandle = null;

  const tl = gsap.timeline();

  // 1) Site fades up — calm, deliberate.
  tl.to(site, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.2);

  // 2) After site has settled, lay out the email card and seed cursor start position.
  tl.add(() => {
    placeEmailNextToSite();
    // Email sits offstage to the right (40vw) until its slide-in.
    gsap.set(email, { x: window.innerWidth * 0.4, opacity: 0 });
    // Cursor enters from below the form, near the message field.
    const sR = site.getBoundingClientRect();
    const o  = stageOrigin();
    gsap.set(cursor, {
      x: sR.left  - o.left + sR.width  * 0.32,
      y: sR.top   - o.top  + sR.height * 1.02,
    });
    cursorEnd = cursorAt(submit);
  }, 1.15);

  // 3) Cursor fades in.
  tl.to(cursor, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 1.45);

  // 4) Cursor glides to Submit — long ease-out (Apple-feeling).
  tl.to(cursor, {
    x: () => cursorEnd.x,
    y: () => cursorEnd.y,
    duration: 1.4,
    ease: 'power3.out',
  }, 1.7);

  // 5) Click ripple + tiny press on Submit.
  tl.add(() => {
    submit.classList.add('pressed');
    setTimeout(() => submit.classList.remove('pressed'), 700);
  }, 3.15);
  tl.to(submit, { scale: 0.97, duration: 0.12, ease: 'power2.out' }, 3.15);
  tl.to(submit, { scale: 1.0,  duration: 0.32, ease: 'power3.out' }, 3.27);

  // 6) Cursor fades back out — it has done its job.
  tl.to(cursor, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 3.55);

  // 7) Form dims to ~18% with faint blur.
  tl.to(site, { opacity: 0.18, filter: 'blur(2.2px)', duration: 0.65, ease: 'power2.out' }, 3.65);

  // 8) Email card slides in from the right with a long ease-out.
  tl.to(email, {
    opacity: 1,
    x: 0,
    duration: 1.05,
    ease: 'power3.out',
  }, 3.95);

  // 9) Caption label appears below the card via the kit caption helper.
  tl.add(() => {
    captionHandle = mountCaption(label, { color: '#444444' });
    // Fire-and-forget: animate-text resolves on its own settle clock.
    captionHandle.show();
  }, 5.2);

  // 10) Hold to roughly opts.duration.
  const tlEnd = Math.max(totalDuration - 0.05, 5.5);
  tl.to({}, { duration: 0.001 }, tlEnd);

  const animPromise = tl.then();

  let dismissed = false;
  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    try { tl.kill(); } catch (_) { /* tl already finished */ }
    if (captionHandle) {
      try { await captionHandle.exit({ ms: 240 }); } catch (_) { /* already gone */ }
      captionHandle = null;
    }
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(520);
    root.remove();
  }

  return { root, animPromise, dismiss };
}
