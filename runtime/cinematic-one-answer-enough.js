// Cinematic post-intro archetype: one-answer-enough.
//
// Short animated proof:
//   radio buttons restrict the user to one answer, then morph into checkboxes
//   so multiple answers stay selected. Use-case chips are a side note, not a
//   full scene. Text callouts use the repo's pixel-point/mask-reveal primitive.

import { resolveTheme } from './cinematic-kit/theme.js';
import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { mountAnimateText } from './animate-text.js';

const STYLE_ID = 'oae-styles';
const SUPPORT_OPTIONS = ['Billing issue', 'Technical support', 'Account access', 'Feature request'];
const SIDE_CHIPS = [
  { label: 'Services', items: ['Design', 'SEO'] },
  { label: 'Interests', items: ['WordPress', 'Email'] },
  { label: 'Topics', items: ['Marketing', 'Analytics'] },
];

const CSS = `
.oae-root {
  position: fixed; inset: 0; z-index: 600;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #1f2933; opacity: 0; overflow: hidden;
  transition: opacity 460ms ease;
}
.oae-root.on { opacity: 1; }
.oae-root.exit { opacity: 0; transition: opacity 380ms ease; }
.oae-stage {
  position: absolute; inset: 0; box-sizing: border-box;
  padding: clamp(58px, 7vh, 88px) clamp(80px, 9vw, 150px);
  display: grid; place-items: center;
}
.oae-form-wrap {
  position: relative; width: min(760px, 72vw);
  transform-origin: center center;
}
.oae-form {
  position: relative;
  background: rgba(255,255,255,0.97);
  border: 1px solid rgba(20,32,44,0.08);
  border-radius: 16px;
  box-shadow: 0 28px 76px rgba(25,37,54,0.14), 0 8px 22px rgba(25,37,54,0.08);
  padding: 34px 38px 38px; box-sizing: border-box;
}
.oae-form::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit;
  border: 1px solid rgba(255,255,255,0.8); pointer-events: none;
}
.oae-eyebrow {
  font-size: 12px; font-weight: 720; letter-spacing: 0.16em; text-transform: uppercase;
  color: #6b7683; margin-bottom: 8px;
}
.oae-title {
  font-size: clamp(32px, 3vw, 44px); line-height: 1.08; letter-spacing: 0;
  font-weight: 760; margin: 0 0 28px; color: #202a36;
}
.oae-question {
  font-size: 20px; line-height: 1.25; font-weight: 660; color: #2f3a47;
  margin-bottom: 18px;
}
.oae-options { display: grid; gap: 12px; position: relative; }
.oae-option {
  position: relative; display: flex; align-items: center; gap: 14px;
  min-height: 54px; padding: 13px 16px; box-sizing: border-box;
  border: 1px solid #d8dee6; border-radius: 10px; background: #fff;
  font-size: 18px; line-height: 1.2; color: #2f3a47;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.oae-option .mark {
  width: 22px; height: 22px; border: 2px solid #aab3bd; flex: 0 0 22px;
  display: grid; place-items: center; color: #fff; box-sizing: border-box;
  transition: border-radius 320ms cubic-bezier(0.22,1,0.36,1), background 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.oae-radio .mark { border-radius: 999px; }
.oae-checkbox .mark { border-radius: 6px; }
.oae-option.selected {
  border-color: var(--oae-accent); background: var(--oae-accent-soft);
  box-shadow: 0 9px 22px rgba(38, 84, 124, 0.10);
}
.oae-option.selected .mark {
  background: var(--oae-accent); border-color: var(--oae-accent);
  transform: scale(1.08);
}
.oae-radio .oae-option.selected .mark::after {
  content: ""; width: 9px; height: 9px; border-radius: 999px; background: #fff;
}
.oae-checkbox .oae-option.selected .mark::after {
  content: ""; width: 11px; height: 7px; border-left: 3px solid #fff; border-bottom: 3px solid #fff;
  transform: rotate(-45deg) translateY(-1px);
}
.oae-option.warn {
  border-color: rgba(226,119,48,0.70);
  background: rgba(226,119,48,0.08);
}
.oae-cue {
  position: absolute; right: 26px; bottom: 24px;
  padding: 9px 12px; border-radius: 999px; background: #fff;
  color: #bf5b1e; font-size: 13px; font-weight: 760;
  box-shadow: 0 10px 28px rgba(25,37,54,0.12); border: 1px solid rgba(226,119,48,0.22);
  opacity: 0; transform: translateY(8px);
}
.oae-cue::before { content: "Only one answer selected"; }
.oae-wave {
  position: absolute; inset: -18px; border-radius: 24px; pointer-events: none;
  border: 2px solid var(--oae-accent); opacity: 0; transform: scale(0.96);
}
.oae-side-chip {
  position: absolute; width: 176px; min-height: 86px; box-sizing: border-box;
  padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.94);
  border: 1px solid rgba(20,32,44,0.08);
  box-shadow: 0 18px 46px rgba(25,37,54,0.12), 0 6px 16px rgba(25,37,54,0.06);
  opacity: 0; transform: translateY(14px) scale(0.96);
}
.oae-side-chip[data-i="0"] { left: -214px; top: 58px; }
.oae-side-chip[data-i="1"] { right: -222px; top: 138px; }
.oae-side-chip[data-i="2"] { left: 84px; bottom: -116px; }
.oae-side-title { font-size: 14px; font-weight: 790; color: #263241; margin-bottom: 9px; }
.oae-side-item { font-size: 13px; color: #596675; margin-top: 6px; opacity: 0; transform: translateY(6px); }
.oae-side-item::before { content: "✓"; color: var(--oae-accent); font-weight: 900; margin-right: 7px; }
.oae-spark {
  position: fixed; width: 5px; height: 5px; z-index: 621; border-radius: 2px;
  background: var(--oae-accent); pointer-events: none;
  box-shadow: 0 0 14px rgba(5,106,171,0.32);
}
.oae-cursor {
  position: fixed; width: 28px; height: 28px; z-index: 620; left: 0; top: 0;
  pointer-events: none; opacity: 0; transform-origin: 6px 6px;
  filter: drop-shadow(0 5px 9px rgba(0,0,0,0.22));
}
.oae-cursor svg { width: 100%; height: 100%; display: block; }
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function softAccent(hex, alpha = 0.12) {
  const m = /^#?([a-f\d]{6})$/i.exec(hex || '');
  if (!m) return 'rgba(5,106,171,' + alpha + ')';
  const v = m[1];
  return `rgba(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)}, ${alpha})`;
}

function optionHTML(label) {
  return `<div class="oae-option" data-option="${escapeHTML(label)}"><span class="mark"></span><span>${escapeHTML(label)}</span></div>`;
}

function setRadioSelected(root, label) {
  for (const el of root.querySelectorAll('.oae-option')) {
    el.classList.toggle('selected', el.dataset.option === label);
  }
}

function setCheckboxSelected(root, labels) {
  const selected = new Set(labels);
  for (const el of root.querySelectorAll('.oae-option')) {
    el.classList.toggle('selected', selected.has(el.dataset.option));
  }
}

function rectCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * 0.28, y: r.top + r.height * 0.55 };
}

function markCenter(el) {
  const r = el.querySelector('.mark').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

async function moveCursor(gsap, cursor, target, duration = 0.62) {
  const p = rectCenter(target);
  await new Promise((resolve) => gsap.to(cursor, {
    x: p.x, y: p.y, opacity: 1, duration, ease: 'power3.out', onComplete: resolve,
  }));
}

async function clickCursor(gsap, cursor) {
  await new Promise((resolve) => {
    gsap.timeline({ onComplete: resolve })
      .to(cursor, { scale: 0.84, duration: 0.07, ease: 'power1.out' })
      .to(cursor, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
  });
}

function burst(gsap, root, x, y, count = 18) {
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'oae-spark';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    root.appendChild(s);
    sparks.push(s);
    const angle = (Math.PI * 2 * i) / count;
    const dist = 26 + Math.random() * 36;
    gsap.to(s, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      opacity: 0,
      scale: 0.2,
      duration: 0.58 + Math.random() * 0.24,
      ease: 'power3.out',
      onComplete: () => s.remove(),
    });
  }
}

function sideChipHTML(chip, i) {
  return `
    <div class="oae-side-chip" data-i="${i}">
      <div class="oae-side-title">${escapeHTML(chip.label)}</div>
      ${chip.items.map((item) => `<div class="oae-side-item">${escapeHTML(item)}</div>`).join('')}
    </div>
  `;
}

export async function mount(opts = {}) {
  ensureStyles();
  const gsap = await loadGsap();
  const theme = resolveTheme(opts.theme, 'cool-paper');
  const accent = opts.theme?.accent || '#056AAB';
  const totalDuration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 14;

  const root = document.createElement('div');
  root.className = 'oae-root';
  root.style.background = theme.background;
  root.style.setProperty('--oae-accent', accent);
  root.style.setProperty('--oae-accent-soft', softAccent(accent, 0.12));
  root.innerHTML = `
    <div class="oae-stage">
      <div class="oae-form-wrap">
        <section class="oae-form oae-radio">
          <div class="oae-wave"></div>
          <div class="oae-eyebrow">Support Request Form</div>
          <h1 class="oae-title">One answer is not always enough.</h1>
          <div class="oae-question">What do you need help with?</div>
          <div class="oae-options">${SUPPORT_OPTIONS.map(optionHTML).join('')}</div>
          <div class="oae-cue"></div>
        </section>
        ${SIDE_CHIPS.map(sideChipHTML).join('')}
      </div>
    </div>
    <div class="oae-cursor" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M5 3l20 18-10 1.5L10 31 5 3z" fill="#111827" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
  document.body.appendChild(root);
  await sleep(20);
  root.classList.add('on');

  const formWrap = root.querySelector('.oae-form-wrap');
  const form = root.querySelector('.oae-form');
  const title = root.querySelector('.oae-title');
  const cue = root.querySelector('.oae-cue');
  const wave = root.querySelector('.oae-wave');
  const cursor = root.querySelector('.oae-cursor');
  const sideChips = [...root.querySelectorAll('.oae-side-chip')];
  const option = (label) => [...root.querySelectorAll('.oae-option')]
    .find((el) => el.dataset.option === label);
  const textHandles = [];

  gsap.set(formWrap, { opacity: 0, y: 32, scale: 0.975 });
  gsap.set(cursor, { x: window.innerWidth * 0.47, y: window.innerHeight * 0.72, opacity: 0 });

  let aborted = false;
  async function showPixelText(text, position, role = 'caption') {
    const handle = mountAnimateText(text, {
      preset: 'mask-reveal-up',
      role,
      stagger: role === 'headline' ? 14 : 12,
      color: role === 'headline' ? '#17202A' : '#245f91',
      position,
    });
    textHandles.push(handle);
    await handle.show();
    return handle;
  }

  async function timeline() {
    await new Promise((resolve) => gsap.to(formWrap, {
      opacity: 1, y: 0, scale: 1, duration: 0.68, ease: 'power3.out', onComplete: resolve,
    }));
    await sleep(250);
    if (aborted) return;

    await moveCursor(gsap, cursor, option('Billing issue'), 0.58);
    await clickCursor(gsap, cursor);
    setRadioSelected(root, 'Billing issue');
    burst(gsap, root, markCenter(option('Billing issue')).x, markCenter(option('Billing issue')).y, 10);
    await sleep(360);
    if (aborted) return;

    await moveCursor(gsap, cursor, option('Technical support'), 0.54);
    await clickCursor(gsap, cursor);
    setRadioSelected(root, 'Technical support');
    option('Billing issue').classList.add('warn');
    await new Promise((resolve) => gsap.timeline({ onComplete: resolve })
      .to(cue, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0)
      .to(form, { x: -8, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 0)
      .to(option('Billing issue'), { x: -5, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 0)
    );
    option('Billing issue').classList.remove('warn');
    await sleep(250);
    if (aborted) return;

    title.textContent = 'Checkboxes let users select all that apply.';
    form.classList.remove('oae-radio');
    form.classList.add('oae-checkbox');
    setCheckboxSelected(root, []);
    await new Promise((resolve) => gsap.timeline({ onComplete: resolve })
      .to(cue, { opacity: 0, y: 8, duration: 0.18, ease: 'power2.in' }, 0)
      .to(wave, { opacity: 0.42, scale: 1.06, duration: 0.42, ease: 'power2.out' }, 0)
      .to(wave, { opacity: 0, scale: 1.12, duration: 0.34, ease: 'power2.in' }, 0.36)
      .fromTo(root.querySelectorAll('.oae-option .mark'), { scale: 0.72, rotate: -12 }, {
        scale: 1, rotate: 0, duration: 0.44, ease: 'back.out(2.3)', stagger: 0.035,
      }, 0.06)
    );
    if (aborted) return;

    const badge = await showPixelText('Checkboxes field · Select all that apply', {
      left: '50%', top: '13vh', transform: 'translateX(-50%)',
    }, 'caption');

    const selected = [];
    for (const label of ['Billing issue', 'Technical support', 'Account access']) {
      await moveCursor(gsap, cursor, option(label), 0.42);
      await clickCursor(gsap, cursor);
      selected.push(label);
      setCheckboxSelected(root, selected);
      const p = markCenter(option(label));
      burst(gsap, root, p.x, p.y, label === 'Account access' ? 24 : 18);
      gsap.fromTo(option(label), { scale: 1.015 }, { scale: 1, duration: 0.28, ease: 'power2.out' });
      await sleep(170);
      if (aborted) return;
    }

    await sleep(160);
    for (let i = 0; i < sideChips.length; i++) {
      gsap.to(sideChips[i], {
        opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', delay: i * 0.1,
      });
      gsap.to(sideChips[i].querySelectorAll('.oae-side-item'), {
        opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.08, delay: i * 0.1 + 0.18,
      });
    }
    await sleep(1050);
    if (aborted) return;

    await badge.exit({ ms: 180 });
    await showPixelText("Now let's build it in WPForms.", {
      left: '50%', bottom: '10vh', transform: 'translateX(-50%)',
    }, 'headline');
    await sleep(Math.max(900, totalDuration * 1000 - 10300));
  }

  const animPromise = timeline();

  let dismissed = false;
  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try { gsap.killTweensOf(root.querySelectorAll('*')); } catch (_) {}
    for (const handle of textHandles) {
      try { await handle.exit({ ms: 120 }); } catch (_) {}
    }
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(400);
    root.remove();
  }

  return { root, animPromise, dismiss };
}
