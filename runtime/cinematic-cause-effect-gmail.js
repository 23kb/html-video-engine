// Cinematic post-intro archetype: cause → effect (Gmail-arrival).
//
// Spec: runtime/cinematic-specs.js → cause-effect-gmail.
// Schema: docs/cinematic-spec-contract.md.
//
// Story (mirrors the spec beat sheet):
//   1. Synthetic contact form appears (Mac-window chrome).
//   2. Cursor types Name, Email, Message — per-key SFX where allowed.
//   3. Cursor clicks Submit (click SFX, ripple).
//   4. Site dims, scales back, blurs faintly.
//   5. Gmail-like inbox reveals (centered).
//   6. Unread row visibly arrives at the top of the inbox (max-height +
//      opacity transition + soft orange pulse).
//   7. Cursor clicks the unread row.
//   8. Email-detail card morphs OUT of that row's exact rect into a
//      centered, larger card layered above the inbox.
//   9. Caption "Send the right email to the right person." reveals via
//      animate-text only AFTER the detail card has settled.
//
// Lifecycle contract: mount(opts) → { root, animPromise, dismiss }.
// Standalone-lab only — no player/compiler/manifest wiring.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { mountCaption } from './cinematic-kit/text.js';
import { initSfx, playType, playClick } from './sfx.js';

const STYLE_ID = 'cceg-styles';

const CSS = `
.cceg-root {
  position: fixed; inset: 0; z-index: 600;
  font-family: -apple-system, 'Segoe UI', Roboto, 'Inter', sans-serif;
  color: #444444;
  opacity: 0; transition: opacity .45s ease;
  overflow: hidden;
}
.cceg-root.on   { opacity: 1; }
.cceg-root.exit { opacity: 0; transition: opacity .5s ease; }

.cceg-stage {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}

/* ── Site (synthetic contact form) ────────────────────────────────────── */
.cceg-site {
  position: relative;
  width: min(720px, 60vw);
  height: min(520px, 70vh);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: var(--cceg-card-shadow, 0 30px 60px rgba(20,22,28,0.12));
  overflow: hidden;
  display: flex; flex-direction: column;
  will-change: transform, opacity, filter;
  z-index: 10;
}
.cceg-chrome {
  flex: 0 0 36px; background: #f1f2f4;
  display: flex; align-items: center; gap: 10px; padding: 0 14px;
  border-bottom: 1px solid #e3e4e7;
}
.cceg-chrome .dots { display: flex; gap: 6px; }
.cceg-chrome .dot  { width: 10px; height: 10px; border-radius: 50%; }
.cceg-chrome .dots .dot:nth-child(1) { background: #ff5f57; }
.cceg-chrome .dots .dot:nth-child(2) { background: #febc2e; }
.cceg-chrome .dots .dot:nth-child(3) { background: #28c840; }
.cceg-chrome .url {
  flex: 1; max-width: 320px; margin: 0 auto;
  background: #ffffff; border-radius: 6px;
  font: 500 11px/1 -apple-system, sans-serif; color: #777777;
  padding: 5px 12px; text-align: center;
  letter-spacing: 0.01em;
}
.cceg-page  { flex: 1; padding: 26px 36px; display: flex; flex-direction: column; }
.cceg-brand {
  font: 600 11px/1 -apple-system, sans-serif;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: #777777; margin-bottom: 12px;
}
.cceg-h1  { font: 500 24px/1.25 'Georgia', 'Instrument Serif', serif; color: #444444; margin: 0 0 6px; }
.cceg-sub { font: 400 13px/1.5 -apple-system, sans-serif; color: #777777; margin: 0 0 18px; max-width: 480px; }

.cceg-form  { display: flex; flex-direction: column; gap: 11px; flex: 1; }
.cceg-field { display: flex; flex-direction: column; gap: 5px; }
.cceg-label {
  font: 500 10px/1 -apple-system, sans-serif;
  color: #777777; letter-spacing: 0.08em; text-transform: uppercase;
}
.cceg-input {
  background: #f7f8f9;
  border: 1px solid #e3e4e7;
  border-radius: 7px;
  padding: 8px 12px;
  font: 400 13px/1.4 -apple-system, sans-serif;
  color: #444444;
  min-height: 16px;
  white-space: pre-wrap; word-break: break-word;
  transition: border-color .22s ease, background .22s ease, box-shadow .22s ease;
}
.cceg-input.textarea  { min-height: 48px; }
.cceg-input.cceg-typing {
  border-color: var(--cceg-accent, #E27730);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(226,119,48,0.10);
}
.cceg-input.cceg-caret::after {
  content: '|'; color: var(--cceg-accent, #E27730);
  margin-left: 1px; animation: cceg-blink .75s steps(1) infinite;
}
@keyframes cceg-blink { 50% { opacity: 0; } }

.cceg-submit-row { display: flex; justify-content: flex-start; margin-top: 4px; }
.cceg-submit {
  position: relative;
  font: 600 13px/1 -apple-system, sans-serif;
  color: #ffffff;
  background: var(--cceg-accent, #E27730);
  border: 0; border-radius: 7px;
  padding: 10px 22px;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 14px rgba(226, 119, 48, 0.22);
  overflow: hidden;
  cursor: default;
  will-change: transform;
}
.cceg-submit .ripple {
  position: absolute; left: 50%; top: 50%;
  width: 220px; height: 220px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none; opacity: 0;
}
.cceg-submit.pressed .ripple {
  animation: cceg-ripple .65s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes cceg-ripple {
  0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.7);  opacity: 0;    }
}

/* ── Cursor ───────────────────────────────────────────────────────────── */
.cceg-cursor {
  position: absolute; left: 0; top: 0;
  width: 26px; height: 26px;
  pointer-events: none; opacity: 0; z-index: 80;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.32));
  will-change: transform, opacity;
}

/* ── Inbox (Gmail-like) ───────────────────────────────────────────────── */
.cceg-inbox {
  position: absolute; left: 50%; top: 50%;
  width: min(900px, 72vw);
  height: min(560px, 74vh);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: var(--cceg-card-shadow, 0 30px 60px rgba(20,22,28,0.14));
  overflow: hidden;
  /* Centering via GSAP xPercent/yPercent so its scale tween stays composed
     with the translate(-50%,-50%); a CSS-only transform would be clobbered. */
  display: flex; flex-direction: column;
  opacity: 0;
  z-index: 30;
  will-change: transform, opacity;
}
.cceg-inbox-head {
  flex: 0 0 56px; background: #ffffff;
  display: flex; align-items: center; gap: 14px; padding: 0 18px;
  border-bottom: 1px solid #e3e4e7;
}
.cceg-inbox-head .logo {
  width: 28px; height: 28px;
  background:
    conic-gradient(from 30deg,
      #4285f4 0deg, #34a853 90deg,
      #fbbc04 180deg, #ea4335 270deg, #4285f4 360deg);
  border-radius: 5px;
  position: relative;
  flex: 0 0 28px;
}
.cceg-inbox-head .logo::after {
  content: ''; position: absolute; inset: 6px;
  background: #ffffff; border-radius: 2px;
}
.cceg-inbox-head .title {
  font: 500 16px/1 -apple-system, sans-serif;
  color: #555555; letter-spacing: 0.01em;
}
.cceg-inbox-head .search {
  flex: 1; max-width: 480px;
  background: #f1f3f4; border-radius: 8px;
  padding: 8px 14px;
  font: 400 12px/1 -apple-system, sans-serif; color: #888888;
}
.cceg-inbox-body { flex: 1; display: flex; overflow: hidden; }
.cceg-inbox-side {
  flex: 0 0 180px; padding: 18px 8px;
  background: #f8fafc; border-right: 1px solid #e8eaee;
  font: 500 13px/1 -apple-system, sans-serif; color: #555555;
}
.cceg-inbox-side .item {
  padding: 8px 14px; border-radius: 0 16px 16px 0;
  margin-bottom: 2px;
  display: flex; align-items: center; gap: 10px;
}
.cceg-inbox-side .item.active {
  background: #fce8e6; color: #c5221f; font-weight: 600;
}
.cceg-inbox-side .item::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%;
  background: currentColor; opacity: 0.55;
}
.cceg-inbox-list { flex: 1; overflow: hidden; }

.cceg-row {
  display: flex; gap: 14px; padding: 13px 20px;
  border-bottom: 1px solid #f1f3f4;
  align-items: center;
  position: relative;
  background: #ffffff;
}
.cceg-row .from {
  flex: 0 0 150px;
  font: 500 13px/1.2 -apple-system, sans-serif; color: #555555;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cceg-row .subj {
  flex: 1;
  font: 400 13px/1.2 -apple-system, sans-serif; color: #777777;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cceg-row .subj b { color: #444444; margin-right: 6px; font-weight: 600; }
.cceg-row .time {
  font: 500 11px/1 -apple-system, sans-serif; color: #999999;
  flex: 0 0 auto;
}
.cceg-row.read .from,
.cceg-row.read .subj,
.cceg-row.read .time { filter: blur(3.5px); opacity: 0.65; }

/* Unread row arrives via max-height + opacity (no layout jump). */
.cceg-row.unread {
  background: linear-gradient(to right, rgba(226,119,48,0.12), transparent 70%);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-bottom-width: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height 700ms cubic-bezier(0.22, 1, 0.36, 1),
    padding-top 700ms cubic-bezier(0.22, 1, 0.36, 1),
    padding-bottom 700ms cubic-bezier(0.22, 1, 0.36, 1),
    border-bottom-width 700ms ease,
    opacity 520ms ease 220ms,
    background 220ms ease;
}
.cceg-row.unread.arrived {
  max-height: 92px;
  padding-top: 13px;
  padding-bottom: 13px;
  border-bottom-width: 1px;
  opacity: 1;
}
.cceg-row.unread::before {
  content: ''; position: absolute; left: 0; top: 9px; bottom: 9px;
  width: 3px; background: var(--cceg-accent, #E27730); border-radius: 0 2px 2px 0;
  opacity: 0; transition: opacity 360ms ease 200ms;
}
.cceg-row.unread.arrived::before { opacity: 1; }
.cceg-row.unread .from { color: var(--cceg-accent, #E27730); font-weight: 700; }
.cceg-row.unread .subj b { color: #1e1410; }
.cceg-row.unread.arrived {
  animation: cceg-pulse 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s 1 forwards;
}
@keyframes cceg-pulse {
  0%   { box-shadow: inset 0 0 0 0 rgba(226, 119, 48, 0.0),  0 0 0 0  rgba(226, 119, 48, 0.55); }
  60%  { box-shadow: inset 0 0 0 0 rgba(226, 119, 48, 0.0),  0 0 0 16px rgba(226, 119, 48, 0); }
  100% { box-shadow: inset 0 0 0 0 rgba(226, 119, 48, 0.0),  0 0 0 0  rgba(226, 119, 48, 0); }
}
.cceg-row.unread.clicked {
  background: linear-gradient(to right, rgba(226,119,48,0.22), rgba(226,119,48,0.04) 70%);
}

/* ── Detail card (opens FROM the unread row) ──────────────────────────── */
.cceg-detail {
  position: absolute; left: 0; top: 0;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  z-index: 60;
  opacity: 0;
  box-shadow: 0 30px 60px rgba(20, 22, 28, 0.18), 0 8px 20px rgba(20, 22, 28, 0.06);
  will-change: transform, opacity, top, left, width, height;
}
.cceg-detail .stripe { height: 3px; background: var(--cceg-accent, #E27730); }
.cceg-detail .body   { padding: 22px 26px 24px; height: calc(100% - 3px); box-sizing: border-box; overflow: hidden; }
.cceg-detail .meta {
  font: 600 10px/1 -apple-system, sans-serif;
  color: var(--cceg-accent, #E27730);
  letter-spacing: 0.16em; text-transform: uppercase;
  margin: 0 0 10px;
}
.cceg-detail .title {
  font: 500 19px/1.3 'Georgia', 'Instrument Serif', serif;
  color: #444444; margin: 0 0 14px;
}
.cceg-detail .row {
  display: flex; gap: 10px;
  font: 400 12px/1.5 -apple-system, sans-serif;
  color: #777777;
}
.cceg-detail .row + .row { margin-top: 4px; }
.cceg-detail .row .key { font-weight: 600; color: #444444; min-width: 56px; }
.cceg-detail .row .val { color: #444444; }
.cceg-detail .preview {
  margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f3f4;
  font: 400 13px/1.5 -apple-system, sans-serif; color: #555555;
  font-style: italic;
}
.cceg-detail .body-content {
  opacity: 0; transition: opacity 420ms ease 260ms;
}
.cceg-detail.open .body-content { opacity: 1; }
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
 * Mount the cause-effect Gmail cinematic.
 *
 * @param {object} opts
 * @param {object} [opts.theme]
 * @param {string} [opts.theme.background] — preset id or omitted → 'warm-cream'
 * @param {string} [opts.theme.accent]     — single accent color (default '#E27730')
 * @param {number|null} [opts.duration]    — total seconds; null → narration-driven (~12s default)
 * @param {string} [opts.formName]
 * @param {string} [opts.recipient]
 * @param {string} [opts.subject]
 * @param {string} [opts.label]
 * @param {object} [opts.site]             — { url, brand, fields[{label,value}] }
 * @param {object} [opts.inbox]            — { account, unread:{from,subject,time} }
 * @returns {Promise<{root: HTMLElement, animPromise: Promise<void>, dismiss: () => Promise<void>}>}
 */
export async function mount(opts = {}) {
  ensureStyles();
  // initSfx is gesture-gated. Lab buttons trigger it via the click handler;
  // autoplay-on-load arrives without a gesture, in which case the SFX layer
  // silently no-ops (per runtime/sfx.js contract).
  try { initSfx(); } catch (_) { /* tolerate */ }

  const gsap = await loadGsap();

  const theme = resolveTheme(opts.theme, 'warm-cream');
  const accent = (opts.theme && opts.theme.accent) || '#E27730';
  const explicitDuration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : null;

  const formName  = opts.formName  || 'Contact Us';
  const recipient = opts.recipient || 'site-admin@example.com';
  const subject   = opts.subject   || 'New Entry: Contact Us';
  const label     = opts.label     || 'Send the right email to the right person.';

  const siteCfg  = opts.site  || {};
  const inboxCfg = opts.inbox || {};
  const fields = (siteCfg.fields && siteCfg.fields.length) ? siteCfg.fields : [
    { label: 'Name',    value: 'Sullie Eloso' },
    { label: 'Email',   value: 'sullie@example.com' },
    { label: 'Message', value: 'Hi team — quick question.' },
  ];
  const brand = siteCfg.brand || formName;
  const urlSlug = (siteCfg.url || (formName + '.com/contact'))
    .replace(/^https?:\/\//, '')
    .replace(/[‘’“”]/g, '')
    .toLowerCase();
  const inboxAccount = inboxCfg.account || recipient;
  const messageField = fields.find((f) => /message/i.test(f.label));
  const previewText = (messageField && messageField.value) || (fields[fields.length - 1] && fields[fields.length - 1].value) || '';
  const unread = inboxCfg.unread || {
    from:    'WordPress',
    subject: subject + ' — ' + (fields[0] ? fields[0].value : ''),
    time:    'just now',
  };

  const readRows = [
    { from: 'GitHub', subj: '<b>[sullies/site] PR #214 ready for review</b> requested by Priya', time: '9:12'  },
    { from: 'Figma',  subj: '<b>New comments on Landing v4</b> 3 comments by Luis and Amir',     time: '8:48'  },
    { from: 'Stripe', subj: '<b>Payout sent to your account</b> $1,284.00 should arrive Friday', time: '8:01'  },
    { from: 'Linear', subj: '<b>3 issues due this week</b> BAKE-214, BAKE-231, BAKE-234',         time: 'Yesterday' },
    { from: 'Notion', subj: '<b>Weekly digest</b> 5 pages updated in Design Systems',              time: 'Yesterday' },
  ];

  const root = document.createElement('div');
  root.className = 'cceg-root';
  root.style.background = theme.background;
  root.style.setProperty('--cceg-card-shadow', theme.cardShadow);
  root.style.setProperty('--cceg-accent', accent);

  const fieldsHTML = fields.map((f, i) => `
    <label class="cceg-field">
      <span class="cceg-label">${escapeHTML(f.label)}</span>
      <div class="cceg-input${i === fields.length - 1 ? ' textarea' : ''}" data-field="${i}"></div>
    </label>
  `).join('');

  root.innerHTML = `
    <div class="cceg-stage">
      <div class="cceg-site">
        <div class="cceg-chrome">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <div class="url">${escapeHTML(urlSlug)}</div>
        </div>
        <div class="cceg-page">
          <div class="cceg-brand">${escapeHTML(brand)}</div>
          <h1 class="cceg-h1">Get in touch</h1>
          <p class="cceg-sub">Drop us a note and we'll be back in touch the same day.</p>
          <div class="cceg-form">
            ${fieldsHTML}
            <div class="cceg-submit-row">
              <button class="cceg-submit" type="button">Submit<span class="ripple"></span></button>
            </div>
          </div>
        </div>
      </div>

      <div class="cceg-inbox" role="presentation">
        <div class="cceg-inbox-head">
          <div class="logo"></div>
          <div class="title">Inbox — ${escapeHTML(inboxAccount)}</div>
          <div class="search">Search mail</div>
        </div>
        <div class="cceg-inbox-body">
          <div class="cceg-inbox-side">
            <div class="item active">Inbox</div>
            <div class="item">Starred</div>
            <div class="item">Sent</div>
            <div class="item">Drafts</div>
            <div class="item">Spam</div>
          </div>
          <div class="cceg-inbox-list">
            <div class="cceg-row unread" data-role="unread">
              <div class="from">${escapeHTML(unread.from)}</div>
              <div class="subj"><b>${escapeHTML(unread.subject)}</b></div>
              <div class="time">${escapeHTML(unread.time)}</div>
            </div>
            ${readRows.map((r) => `
              <div class="cceg-row read">
                <div class="from">${escapeHTML(r.from)}</div>
                <div class="subj">${r.subj}</div>
                <div class="time">${escapeHTML(r.time)}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="cceg-detail" data-role="detail">
        <div class="stripe"></div>
        <div class="body body-content">
          <div class="meta">New entry</div>
          <h2 class="title">${escapeHTML(subject)}</h2>
          <div class="row"><span class="key">From</span><span class="val">${escapeHTML(unread.from)}</span></div>
          <div class="row"><span class="key">To</span><span class="val">${escapeHTML(inboxAccount)}</span></div>
          <div class="row"><span class="key">Subject</span><span class="val">${escapeHTML(subject)}</span></div>
          <div class="preview">${escapeHTML(previewText)}</div>
        </div>
      </div>

      <svg class="cceg-cursor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 3 L24 14 L14 16 L10 26 Z" fill="#1e1410" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  document.body.appendChild(root);

  // Trigger CSS opacity fade-in. Without this, .cceg-root stays at opacity 0
  // (the default in the stylesheet) and the entire overlay is invisible even
  // though GSAP is animating the inner site/inbox/etc.
  await sleep(20);
  root.classList.add('on');

  // Lookups
  const stage     = root.querySelector('.cceg-stage');
  const site      = root.querySelector('.cceg-site');
  const submit    = root.querySelector('.cceg-submit');
  const cursor    = root.querySelector('.cceg-cursor');
  const inputs    = [...root.querySelectorAll('.cceg-input')];
  const inbox     = root.querySelector('.cceg-inbox');
  const unreadRow = root.querySelector('.cceg-row.unread');
  const detail    = root.querySelector('.cceg-detail');

  // Initial transform/opacity states. The inbox uses xPercent/yPercent for
  // centering so GSAP's scale tween composes with its translate.
  gsap.set(site,   { opacity: 0, y: 14, scale: 0.985 });
  gsap.set(cursor, { opacity: 0, x: 0, y: 0 });
  gsap.set(inbox,  { opacity: 0, scale: 0.96, xPercent: -50, yPercent: -50, transformOrigin: '50% 50%' });
  gsap.set(detail, { opacity: 0 });

  // Helpers ──────────────────────────────────────────────────────────────
  let aborted = false;
  let captionHandle = null;
  const stageRect = () => stage.getBoundingClientRect();

  const cursorTo = (target, dx = 12, dy = 6) => {
    const r = target.getBoundingClientRect();
    const s = stageRect();
    return { x: r.left - s.left + dx, y: r.top - s.top + r.height / 2 + dy };
  };
  const glide = (target, { duration = 0.85, ease = 'power3.out', dx, dy } = {}) =>
    new Promise((resolve) => {
      const dest = cursorTo(target, dx, dy);
      gsap.to(cursor, { x: dest.x, y: dest.y, duration, ease, onComplete: resolve });
    });

  async function typeInto(el, text, perCharMs = 38) {
    el.classList.add('cceg-typing', 'cceg-caret');
    el.textContent = '';
    for (let i = 1; i <= text.length; i++) {
      if (aborted) return;
      el.textContent = text.slice(0, i);
      try { playType(); } catch (_) { /* tolerate */ }
      await sleep(perCharMs + (Math.random() * 14 - 7));
    }
    if (aborted) return;
    el.classList.remove('cceg-caret');
    await sleep(180);
    if (!aborted) el.classList.remove('cceg-typing');
  }

  // The full timeline as a regular async function so we can interleave GSAP
  // tweens with sleeps and abort cleanly on dismiss.
  async function timeline() {
    // Phase 1 — site fade-in
    gsap.to(site, { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' });
    await sleep(880);
    if (aborted) return;

    // Park cursor below the form, then fade in
    const sR = site.getBoundingClientRect();
    const oR = stageRect();
    gsap.set(cursor, {
      x: sR.left - oR.left + sR.width  * 0.42,
      y: sR.top  - oR.top  + sR.height * 1.04,
    });
    gsap.to(cursor, { opacity: 1, duration: 0.4, ease: 'power2.out' });

    // Phase 2 — type each field
    for (let i = 0; i < inputs.length; i++) {
      if (aborted) return;
      await glide(inputs[i], { duration: 0.7 + i * 0.05, ease: 'power3.out', dx: 16, dy: 4 });
      if (aborted) return;
      const f = fields[i];
      if (!f) continue;
      const text = (f.value || '');
      const perChar = i === inputs.length - 1 ? 30 : 38;
      await typeInto(inputs[i], text, perChar);
      await sleep(120);
    }
    if (aborted) return;

    // Phase 3 — cursor glides to Submit, click + ripple, brief press
    await glide(submit, { duration: 1.05, ease: 'power3.out', dx: 18, dy: 8 });
    if (aborted) return;
    submit.classList.add('pressed');
    setTimeout(() => submit.classList.remove('pressed'), 700);
    try { playClick(); } catch (_) { /* tolerate */ }
    gsap.to(submit, { scale: 0.97, duration: 0.12, ease: 'power2.out' });
    gsap.to(submit, { scale: 1,    duration: 0.32, ease: 'power3.out', delay: 0.12 });
    await sleep(180);
    if (aborted) return;

    // Cursor leaves the stage briefly while the inbox arrives.
    gsap.to(cursor, { opacity: 0, duration: 0.4, ease: 'power2.out' });

    // Phase 4 — site dims and pulls back, inbox reveals
    gsap.to(site, {
      opacity: 0.18, scale: 0.92, filter: 'blur(2.4px)',
      duration: 0.75, ease: 'power2.out',
    });
    gsap.to(inbox, { opacity: 1, scale: 1, duration: 0.95, ease: 'power3.out', delay: 0.2 });
    await sleep(950);
    if (aborted) return;

    // Phase 5 — unread row arrives at top of list (CSS-driven)
    unreadRow.classList.add('arrived');
    await sleep(900);
    if (aborted) return;

    // Phase 6 — cursor returns and clicks the unread row
    gsap.to(cursor, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    await glide(unreadRow, { duration: 0.95, ease: 'power3.out', dx: 30, dy: 0 });
    if (aborted) return;
    try { playClick(); } catch (_) { /* tolerate */ }
    unreadRow.classList.add('clicked');
    await sleep(200);
    if (aborted) return;
    gsap.to(cursor, { opacity: 0, duration: 0.35, ease: 'power2.out' });

    // Phase 7 — detail card morphs FROM the unread row's exact rect
    const rR  = unreadRow.getBoundingClientRect();
    const sR2 = stageRect();
    const initialLeft   = rR.left - sR2.left;
    const initialTop    = rR.top  - sR2.top;
    const initialWidth  = rR.width;
    const initialHeight = rR.height;

    const inR = inbox.getBoundingClientRect();
    const finalWidth  = Math.min(560, inR.width  - 80);
    const finalHeight = 320;
    const finalLeft   = inR.left - sR2.left + (inR.width  - finalWidth)  / 2;
    const finalTop    = inR.top  - sR2.top  + Math.max(48, (inR.height - finalHeight) / 2 - 40);

    // Hide row content beneath the detail (preserves layout, avoids ghost).
    unreadRow.style.visibility = 'hidden';

    gsap.set(detail, {
      left: initialLeft, top: initialTop,
      width: initialWidth, height: initialHeight,
      opacity: 1,
    });
    gsap.to(detail, {
      left: finalLeft, top: finalTop,
      width: finalWidth, height: finalHeight,
      duration: 0.85, ease: 'power3.inOut',
    });
    await sleep(220);
    if (aborted) return;
    detail.classList.add('open'); // body content fades in
    await sleep(720);
    if (aborted) return;

    // Phase 8 — caption (only after detail has settled). Custom position
    // overrides the kit's 12vh default so the caption sits clear of the
    // expanded email-detail card.
    captionHandle = mountCaption(label, {
      color: '#444444',
      position: { left: '50%', bottom: '8vh', transform: 'translateX(-50%)' },
    });
    captionHandle.show();

    // Hold tail. If duration explicitly set, pad to it; else hold ~1.6s.
    if (explicitDuration) {
      const elapsed = 11.0; // approximate timeline length above (s)
      const pad = Math.max(0, explicitDuration - elapsed);
      await sleep(pad * 1000);
    } else {
      await sleep(1600);
    }
  }

  const animPromise = timeline();

  let dismissed = false;
  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try {
      gsap.killTweensOf([site, cursor, inbox, unreadRow, detail, submit]);
    } catch (_) { /* tolerate */ }
    if (captionHandle) {
      try { await captionHandle.exit({ ms: 240 }); } catch (_) { /* gone */ }
      captionHandle = null;
    }
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(520);
    root.remove();
  }

  return { root, animPromise, dismiss };
}
