// Cinematic post-intro archetype: rough-thought-to-draft.
//
// A messy prompt gets corrected into a concise request, compresses into a
// chat chip, and Sullie replies with a ready WPForms-style draft. Used for
// the WPForms AI guided product video.

import { loadGsap } from './cinematic-kit/gsap-loader.js';
import { registerTimeline, pausableSleep } from '../videos/_shared/kit.js';

const STYLE_ID = 'rtd-styles';

const CSS = `
.rtd-root {
  position: fixed; inset: 0; z-index: 600;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #263241;
  background:
    radial-gradient(48% 42% at 18% 22%, rgba(5, 106, 171, 0.17), transparent 62%),
    radial-gradient(42% 34% at 84% 76%, rgba(226, 119, 48, 0.13), transparent 66%),
    linear-gradient(180deg, #fbfdff 0%, #eef4fb 100%);
  overflow: hidden;
  opacity: 0;
  transition: opacity 480ms ease;
}
.rtd-root.on { opacity: 1; }
.rtd-root.exit { opacity: 0; transition: opacity 380ms ease; }
.rtd-shell {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  padding: clamp(56px, 7vh, 86px) clamp(72px, 8vw, 132px);
  box-sizing: border-box;
}
.rtd-ambient {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(circle at 2px 2px, rgba(6,106,171,0.08) 0 1px, transparent 1.4px) 0 0 / 34px 34px;
  opacity: 0.48;
}
.rtd-top-sullie {
  position: absolute;
  right: clamp(42px, 5.5vw, 82px);
  top: clamp(34px, 5vh, 58px);
  width: clamp(58px, 5vw, 82px);
  height: clamp(58px, 5vw, 82px);
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(31,44,58,0.08);
  box-shadow: 0 18px 46px rgba(31,44,58,0.12), inset 0 1px 0 rgba(255,255,255,0.92);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
  pointer-events: none;
}
.rtd-top-sullie img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}
.rtd-workspace {
  position: relative;
  width: min(1180px, 86vw);
  min-height: min(680px, 72vh);
  display: grid;
  grid-template-columns: 0.92fr 1.18fr;
  gap: 30px;
  align-items: center;
}
.rtd-start-input {
  position: absolute;
  left: 50%; top: 50%;
  width: min(760px, 72vw);
  min-height: 188px;
  transform: translate(-50%, -50%);
  border-radius: 22px;
  background: rgba(255,255,255,0.98);
  border: 1px solid rgba(31,44,58,0.08);
  box-shadow: 0 30px 80px rgba(31,44,58,0.13), 0 8px 24px rgba(31,44,58,0.07);
  padding: 30px 34px;
  box-sizing: border-box;
  will-change: transform, width, min-height, border-radius, opacity;
}
.rtd-start-label {
  color: #8d96a3;
  font-size: 13px;
  font-weight: 760;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.rtd-type {
  min-height: 68px;
  color: #202a36;
  font-size: clamp(30px, 3.2vw, 46px);
  line-height: 1.14;
  font-weight: 740;
  letter-spacing: 0;
  white-space: pre-wrap;
}
.rtd-caret {
  display: inline-block;
  width: 3px;
  height: 0.92em;
  margin-left: 3px;
  background: #056AAB;
  transform: translateY(4px);
  animation: rtd-blink 0.82s steps(1) infinite;
}
@keyframes rtd-blink { 50% { opacity: 0; } }
.rtd-chip {
  position: relative;
  min-width: 260px;
  max-width: 360px;
  padding: 18px 22px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #0399ED 0%, #056AAB 100%);
  box-shadow: 0 18px 44px rgba(6,106,171,0.26);
  font-size: 18px;
  line-height: 1.25;
  font-weight: 760;
  opacity: 0;
  transform: scale(0.94);
  will-change: transform, opacity;
}
.rtd-chip-glow {
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  border: 1px solid rgba(3,153,237,0.38);
  opacity: 0;
  transform: scale(0.94);
  pointer-events: none;
}
.rtd-spark {
  position: absolute;
  width: 5px; height: 5px;
  border-radius: 2px;
  background: #056AAB;
  box-shadow: 0 0 16px rgba(5,106,171,0.48);
  opacity: 0;
}
.rtd-chat {
  position: relative;
  grid-column: 1;
  min-height: 430px;
  padding: 24px 26px 26px;
  border-radius: 28px;
  background: rgba(255,255,255,0.38);
  border: 1px solid rgba(255,255,255,0.72);
  box-shadow:
    0 28px 78px rgba(31,44,58,0.10),
    inset 0 0 0 1px rgba(31,44,58,0.035);
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  opacity: 0;
}
.rtd-sullie-row,
.rtd-user-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 18px 0;
}
.rtd-user-row {
  justify-content: flex-end;
  padding-right: 6px;
  margin-top: 0;
  margin-bottom: 24px;
}
.rtd-avatar {
  flex: 0 0 46px;
  width: 46px; height: 46px;
  border-radius: 50%;
  background: #fff;
  display: grid; place-items: center;
  box-shadow: 0 8px 20px rgba(31,44,58,0.10);
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}
.rtd-avatar img { width: 38px; height: 38px; object-fit: contain; }
.rtd-bubble {
  max-width: 330px;
  padding: 18px 20px;
  border-radius: 24px;
  background: rgba(255,255,255,0.98);
  color: #25313f;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 670;
  box-shadow: 0 18px 48px rgba(31,44,58,0.11), 0 5px 14px rgba(31,44,58,0.06);
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
.rtd-thinking {
  display: flex;
  gap: 7px;
  align-items: center;
  min-width: 86px;
  min-height: 48px;
}
.rtd-dot {
  width: 9px; height: 9px;
  border-radius: 999px;
  background: #056AAB;
  opacity: 0.38;
}
.rtd-form {
  grid-column: 2;
  position: relative;
  width: min(560px, 100%);
  justify-self: end;
  border-radius: 18px;
  background: rgba(255,255,255,0.98);
  border: 1px solid rgba(31,44,58,0.08);
  box-shadow: 0 32px 86px rgba(31,44,58,0.15), 0 8px 24px rgba(31,44,58,0.08);
  padding: 28px 30px 30px;
  box-sizing: border-box;
  opacity: 0;
  filter: blur(12px);
  transform: translateY(22px) scale(0.975);
}
.rtd-form-title {
  font-size: 26px;
  line-height: 1.16;
  font-weight: 820;
  color: #202a36;
  margin-bottom: 22px;
}
.rtd-field {
  border-top: 1px solid #e8edf3;
  padding: 15px 0 16px;
  opacity: 0;
  transform: translateY(12px);
}
.rtd-field:first-of-type { border-top: 0; padding-top: 0; }
.rtd-field label {
  display: block;
  margin-bottom: 8px;
  color: #394656;
  font-size: 15px;
  font-weight: 760;
}
.rtd-input {
  height: 42px;
  border-radius: 7px;
  border: 1px solid #d9e1ea;
  background: #fbfdff;
}
.rtd-stars {
  display: flex;
  gap: 7px;
  color: #f5b301;
  font-size: 25px;
  line-height: 1;
}
.rtd-textarea { height: 74px; }
.rtd-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #53606e;
  font-size: 14px;
  font-weight: 650;
}
.rtd-box {
  width: 18px; height: 18px;
  border: 2px solid #056AAB;
  border-radius: 5px;
  background: rgba(5,106,171,0.10);
}
.rtd-caption {
  position: absolute;
  left: 50%; bottom: 8vh;
  transform: translateX(-50%);
  padding: 10px 15px;
  border-radius: 999px;
  background: rgba(255,255,255,0.82);
  color: #4f5b69;
  font-size: 14px;
  font-weight: 760;
  box-shadow: 0 14px 36px rgba(31,44,58,0.10);
  opacity: 0;
}
`;

const sleep = (ms) => pausableSleep(ms);
let registeredTimelineSeq = 0;

async function awaitRegisteredTimeline(tl, idPrefix) {
  const id = `${idPrefix}:${++registeredTimelineSeq}`;
  registerTimeline(tl, { id });
  await sleep((tl.duration() * 1000) + 50);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800,900&display=swap';
  document.head.appendChild(font);
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formField(label, kind = 'input') {
  if (kind === 'stars') {
    return `<div class="rtd-field"><label>${esc(label)}</label><div class="rtd-stars">*****</div></div>`;
  }
  if (kind === 'textarea') {
    return `<div class="rtd-field"><label>${esc(label)}</label><div class="rtd-input rtd-textarea"></div></div>`;
  }
  if (kind === 'checkbox') {
    return `<div class="rtd-field"><div class="rtd-checkbox"><span class="rtd-box"></span><span>${esc(label)}</span></div></div>`;
  }
  return `<div class="rtd-field"><label>${esc(label)}</label><div class="rtd-input"></div></div>`;
}

async function typeText(node, text, delay = 34) {
  for (const ch of text) {
    node.textContent += ch;
    await sleep(delay);
  }
}

async function eraseText(node, count, delay = 20) {
  for (let i = 0; i < count; i += 1) {
    node.textContent = node.textContent.slice(0, -1);
    await sleep(delay);
  }
}

export async function mount(opts = {}) {
  ensureStyles();
  const gsap = await loadGsap();

  const duration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 15.2;
  const finalPrompt = opts.prompt || 'online feedback survey';
  const root = document.createElement('div');
  root.className = 'rtd-root';
  root.innerHTML = `
    <div class="rtd-ambient"></div>
    ${opts.showSullieLogo ? '<div class="rtd-top-sullie"><img src="/assets/sullie.png" alt=""></div>' : ''}
    <div class="rtd-shell">
      <div class="rtd-workspace">
        <div class="rtd-start-input">
          <div class="rtd-start-label">WPForms AI prompt</div>
          <div class="rtd-type"><span class="rtd-live"></span><span class="rtd-caret"></span></div>
        </div>
        <div class="rtd-chat">
          <div class="rtd-user-row">
            <div class="rtd-chip"><span>${esc(finalPrompt)}</span><span class="rtd-chip-glow"></span></div>
          </div>
          <div class="rtd-sullie-row rtd-first">
            <div class="rtd-avatar"><img src="/assets/sullie.png" alt=""></div>
            <div class="rtd-bubble">Of course!</div>
          </div>
          <div class="rtd-sullie-row rtd-thinking-row">
            <div class="rtd-avatar"><img src="/assets/sullie.png" alt=""></div>
            <div class="rtd-bubble rtd-thinking"><span class="rtd-dot"></span><span class="rtd-dot"></span><span class="rtd-dot"></span></div>
          </div>
          <div class="rtd-sullie-row rtd-ready">
            <div class="rtd-avatar"><img src="/assets/sullie.png" alt=""></div>
            <div class="rtd-bubble">Here you go! Ready to use this form?</div>
          </div>
        </div>
        <section class="rtd-form">
          <div class="rtd-form-title">Online Feedback Survey</div>
          ${formField('Name')}
          ${formField('Email')}
          ${formField('Overall rating', 'stars')}
          ${formField('Course Feedback', 'textarea')}
          ${formField('Newsletter Opt-in', 'checkbox')}
        </section>
      </div>
    </div>
    <div class="rtd-caption">Rough idea in. Working draft out.</div>
  `;
  document.body.appendChild(root);
  await sleep(20);
  root.classList.add('on');

  const input = root.querySelector('.rtd-start-input');
  const live = root.querySelector('.rtd-live');
  const caret = root.querySelector('.rtd-caret');
  const chat = root.querySelector('.rtd-chat');
  const chip = root.querySelector('.rtd-chip');
  const chipGlow = root.querySelector('.rtd-chip-glow');
  const firstAvatar = root.querySelector('.rtd-first .rtd-avatar');
  const firstBubble = root.querySelector('.rtd-first .rtd-bubble');
  const thinkingRow = root.querySelector('.rtd-thinking-row');
  const thinkingAvatar = root.querySelector('.rtd-thinking-row .rtd-avatar');
  const thinkingBubble = root.querySelector('.rtd-thinking-row .rtd-bubble');
  const dots = root.querySelectorAll('.rtd-dot');
  const readyAvatar = root.querySelector('.rtd-ready .rtd-avatar');
  const readyBubble = root.querySelector('.rtd-ready .rtd-bubble');
  const form = root.querySelector('.rtd-form');
  const fields = root.querySelectorAll('.rtd-field');
  const caption = root.querySelector('.rtd-caption');
  const topSullie = root.querySelector('.rtd-top-sullie');

  const sparks = [];
  for (let i = 0; i < 10; i += 1) {
    const s = document.createElement('span');
    s.className = 'rtd-spark';
    chip.appendChild(s);
    sparks.push(s);
  }

  let dismissed = false;
  let aborted = false;

  async function animate() {
    const introTl = gsap.timeline({ paused: true });
    if (topSullie) {
      introTl.to(topSullie, { opacity: 1, y: 0, scale: 1, duration: 0.64, ease: 'back.out(1.45)' }, 0);
    }
    introTl.fromTo(input, { opacity: 0, y: 28, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.72, ease: 'power3.out' }, 0);
    await awaitRegisteredTimeline(introTl, 'rough-thought-to-draft:intro');
    if (aborted) return;

    await typeText(live, 'I want to build a form which should land', 32);
    await sleep(210);
    await eraseText(live, ' which should land'.length, 18);
    await sleep(130);
    await typeText(live, ' uhh....', 44);
    await sleep(260);
    await eraseText(live, live.textContent.length, 16);
    await sleep(140);
    await typeText(live, finalPrompt, 34);
    await sleep(360);
    if (aborted) return;

    caret.style.display = 'none';
    await awaitRegisteredTimeline(
      gsap.timeline({ paused: true })
        .to(input, { scale: 0.94, duration: 0.34, ease: 'power2.inOut' }, 0)
        .to(input, {
          x: -355,
          y: -24,
          width: 340,
          minHeight: 62,
          borderRadius: 999,
          padding: 0,
          duration: 0.72,
          ease: 'power3.inOut',
        }, 0.16)
        .to(input.querySelector('.rtd-start-label'), { opacity: 0, duration: 0.18 }, 0.1)
        .to(input.querySelector('.rtd-type'), { opacity: 0, scale: 0.86, duration: 0.34, ease: 'power2.in' }, 0.24)
        .to(chat, { opacity: 1, duration: 0.34 }, 0.42)
        .to(chip, { opacity: 1, scale: 1, duration: 0.54, ease: 'back.out(1.35)' }, 0.58)
        .to(input, { opacity: 0, duration: 0.24 }, 0.72),
      'rough-thought-to-draft:chip-morph'
    );
    if (aborted) return;

    const sparkTl = gsap.timeline({ paused: true });
    sparkTl.to(chipGlow, { opacity: 1, scale: 1.08, duration: 0.38, ease: 'power2.out' }, 0)
      .to(chipGlow, { opacity: 0, scale: 1.22, duration: 0.48, ease: 'power2.in' }, 0.36);
    sparks.forEach((s, i) => {
      const angle = (Math.PI * 2 * i) / sparks.length;
      sparkTl.fromTo(s, {
        left: '50%',
        top: '50%',
        x: -2,
        y: -2,
        opacity: 0.9,
        scale: 1,
      }, {
        x: Math.cos(angle) * (36 + (i % 3) * 8),
        y: Math.sin(angle) * (22 + (i % 4) * 6),
        opacity: 0,
        scale: 0.2,
        duration: 0.58,
        ease: 'power3.out',
      }, 0.05 + i * 0.015);
    });
    await awaitRegisteredTimeline(sparkTl, 'rough-thought-to-draft:sparks');
    if (aborted) return;

    await awaitRegisteredTimeline(
      gsap.timeline({ paused: true })
        .to(firstAvatar, { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' }, 0)
        .to(firstBubble, { opacity: 1, y: 0, scale: 1, duration: 0.48, ease: 'power3.out' }, 0.05),
      'rough-thought-to-draft:first-reply'
    );
    await sleep(470);
    await awaitRegisteredTimeline(
      gsap.timeline({ paused: true })
        .to(thinkingAvatar, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'power3.out' }, 0)
        .to(thinkingBubble, { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' }, 0.04),
      'rough-thought-to-draft:thinking-in'
    );
    registerTimeline(
      gsap.timeline({ paused: true })
        .to(dots, { opacity: 1, y: -4, duration: 0.32, ease: 'sine.inOut', stagger: 0.12, repeat: 2, yoyo: true }),
      { id: `rough-thought-to-draft:dots:${++registeredTimelineSeq}` }
    );
    await sleep(1000);
    if (aborted) return;

    await awaitRegisteredTimeline(
      gsap.timeline({ paused: true })
        .to(thinkingRow, { opacity: 0, y: -6, scale: 0.985, duration: 0.24, ease: 'power2.in' }, 0)
        .set(thinkingRow, { display: 'none' })
        .to(readyAvatar, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' }, 0.12)
        .to(readyBubble, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }, 0.16),
      'rough-thought-to-draft:ready-reply'
    );
    await sleep(120);
    await awaitRegisteredTimeline(
      gsap.timeline({ paused: true })
        .to(form, { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1, duration: 0.82, ease: 'power3.out' }, 0)
        .to(fields, { opacity: 1, y: 0, duration: 0.46, stagger: 0.09, ease: 'power2.out' }, 0.22)
        .to(caption, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.66),
      'rough-thought-to-draft:form-resolve'
    );

    await sleep(Math.max(900, duration * 1000 - 10000));
  }

  const animPromise = animate();

  async function dismiss() {
    if (dismissed) return;
    dismissed = true;
    aborted = true;
    try { gsap.killTweensOf(root.querySelectorAll('*')); } catch (_) {}
    root.classList.remove('on');
    root.classList.add('exit');
    await sleep(420);
    root.remove();
  }

  return { root, animPromise, dismiss };
}
