// Welcome teaser — browser window with contact form → cursor types all three
// fields → clicks Submit → site dims → Gmail panel slides in with new email
// pinging. Used to open videos with narrative context before the real UI appears.
//
// Extracted from the original notifications-combined.html. Self-mounts,
// caller controls when to dismiss so it can overlap with the next scene's
// cover/handoff.
//
// Usage:
//   const teaser = await mount();
//   const { animPromise } = teaser;
//   // ... kick off narration in parallel, await Promise.all([animPromise, ended])
//   await teaser.dismiss();

const CSS = `
.tsr-root {
  position: fixed; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  opacity: 0; transition: opacity .5s ease;
  overflow: hidden;
  background:
    radial-gradient(60% 50% at 22% 20%, rgba(255,196,140,0.55), transparent 60%),
    radial-gradient(55% 45% at 82% 78%, rgba(255,168,110,0.45), transparent 65%),
    linear-gradient(180deg, #fff7ec 0%, #ffeedc 100%);
}
.tsr-root.on   { opacity: 1; }
.tsr-root.exit { opacity: 0; }

.tsr-stage { position: relative; width: 100vw; height: 100vh;
             display: flex; align-items: center; justify-content: center; }

.tsr-site {
  width: min(1100px, 84vw); height: min(660px, 82vh);
  background: #fff; border-radius: 14px;
  box-shadow: 0 40px 100px rgba(0,0,0,0.18), 0 10px 30px rgba(0,0,0,0.08);
  overflow: hidden;
  display: flex; flex-direction: column;
  transform-origin: center 60%;
  transition: transform 1.3s cubic-bezier(0.65,0,0.35,1), opacity .8s ease;
}
.tsr-site.zoom-in { transform: scale(1.35) translateY(6%); }
.tsr-site.dim     { opacity: 0.18; filter: blur(4px); transform: scale(1.1) translateY(4%); }

.tsr-chrome { flex: 0 0 44px; background: #edeef0; display: flex; align-items: center;
              gap: 12px; padding: 0 16px; border-bottom: 1px solid #dfe0e3; }
.tsr-chrome .dots { display:flex; gap:8px; }
.tsr-chrome .dot { width:12px; height:12px; border-radius:50%; }
.tsr-chrome .dots .dot:nth-child(1){ background:#ff5f57; }
.tsr-chrome .dots .dot:nth-child(2){ background:#febc2e; }
.tsr-chrome .dots .dot:nth-child(3){ background:#28c840; }
.tsr-chrome .url {
  flex: 1; margin: 0 16px; padding: 6px 14px;
  background: #fff; border-radius: 6px;
  font: 500 12px/1 -apple-system, sans-serif; color: #555;
  display: flex; align-items: center; gap: 8px;
}
.tsr-chrome .url::before {
  content:''; width:10px; height:10px; border-radius:2px;
  background: #34a853; box-shadow: inset 0 0 0 2px #fff;
}

.tsr-page  { flex: 1; overflow: hidden; position: relative; background: #fff; }
.tsr-hero  { padding: 36px 56px 18px; border-bottom: 1px solid #f2f2f4; }
.tsr-hero .brand-row {
  display: flex; align-items:center; gap: 10px;
  font: 600 13px/1 -apple-system, sans-serif; color: #888;
  letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px;
}
.tsr-hero .brand-row::before {
  content:''; width:22px; height:22px; border-radius:6px;
  background: linear-gradient(135deg, #E27730, #ff9c5a);
}
.tsr-hero h1 { font: 600 34px/1.2 'Georgia', serif; color: #1e1410; margin: 0 0 8px; }
.tsr-hero p  { font: 400 16px/1.5 -apple-system, sans-serif; color: #6a6a6a; margin: 0; max-width: 640px; }

.tsr-form { padding: 28px 56px 36px; }
.tsr-form .tsr-form-title { font: 600 19px/1.2 -apple-system, sans-serif; color: #1e1410; margin-bottom: 18px; }
.tsr-field { display: block; margin-bottom: 14px; }
.tsr-label { display: block; font: 500 12px/1 -apple-system, sans-serif;
             color: #666; margin-bottom: 6px; letter-spacing: .06em; text-transform: uppercase; }
.tsr-input {
  min-height: 40px; padding: 10px 13px;
  background: #f7f7f8; border: 1.5px solid #e3e3e5; border-radius: 7px;
  font: 400 15px/1.4 -apple-system, sans-serif; color: #222;
  transition: border-color .22s ease, background .22s ease;
  white-space: pre-wrap; word-break: break-word;
}
.tsr-input.textarea { min-height: 72px; }
.tsr-input.typing  { border-color: #E27730; background: #fff;
                     box-shadow: 0 0 0 4px rgba(226,119,48,0.10); }
.tsr-input.tf-caret::after {
  content: '|'; color: #E27730; margin-left: 1px;
  animation: tsr-blink 0.75s steps(1) infinite;
}
@keyframes tsr-blink { 50% { opacity: 0; } }
.tsr-submit {
  margin-top: 8px;
  padding: 13px 28px; font: 600 15px/1 -apple-system, sans-serif;
  background: #E27730; color: #fff; border: 0; border-radius: 7px;
  letter-spacing: 0.02em; cursor: pointer;
  box-shadow: 0 6px 18px rgba(226,119,48,0.30);
  transition: transform .14s ease, background .18s ease, box-shadow .18s ease;
  position: relative; overflow: hidden;
}
.tsr-submit.pressed { transform: scale(0.94); background: #c96320;
                      box-shadow: 0 2px 6px rgba(226,119,48,0.30); }
.tsr-submit .ripple {
  position:absolute; border-radius:50%; transform: translate(-50%,-50%) scale(0);
  width: 200px; height:200px; background: rgba(255,255,255,0.5);
  pointer-events:none; opacity: 0;
}
.tsr-submit.pressed .ripple { animation: tsr-ripple .7s ease-out; }
@keyframes tsr-ripple {
  0%   { transform: translate(-50%,-50%) scale(0.2); opacity: .6; }
  100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0;   }
}

.tsr-cursor {
  position: absolute; width: 28px; height: 28px; z-index: 30;
  pointer-events: none; opacity: 0;
  transition: left .7s cubic-bezier(0.25,0.1,0.25,1),
              top  .7s cubic-bezier(0.25,0.1,0.25,1),
              opacity .25s ease, transform .12s ease;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
}
.tsr-cursor.on { opacity: 1; }
.tsr-cursor.click { transform: scale(0.82); }
.tsr-cursor.click::after {
  content:''; position:absolute; inset: -18px;
  border: 3px solid rgba(226,119,48,0.65); border-radius:50%;
  animation: tsr-ping .55s ease-out;
}
@keyframes tsr-ping {
  0%   { opacity:.9; transform:scale(0.2); }
  100% { opacity:0;  transform:scale(1.35); }
}

.tsr-gmail {
  position: absolute; inset: 0;
  display: flex; opacity: 0;
  transform: translateX(6%);
  transition: opacity .7s cubic-bezier(0.16,1,0.3,1), transform .9s cubic-bezier(0.16,1,0.3,1);
  pointer-events: none;
}
.tsr-root.show-gmail .tsr-gmail { opacity: 1; transform: none; }
.tsr-gmail-win {
  width: min(1200px, 90vw); height: min(720px, 88vh);
  margin: auto; background: #fff; border-radius: 14px;
  box-shadow: 0 40px 100px rgba(0,0,0,0.20), 0 10px 30px rgba(0,0,0,0.08);
  overflow: hidden; display: flex; flex-direction: column;
}
.tsr-gmail-head { flex: 0 0 56px; display:flex; align-items:center; gap:16px;
                  padding: 0 20px; border-bottom: 1px solid #eee; background: #fff; }
.tsr-gmail-head .logo {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #ea4335 0%, #fbbc04 33%, #34a853 66%, #4285f4 100%);
  clip-path: polygon(0 20%, 0 100%, 100% 100%, 100% 20%, 50% 60%);
  border-radius: 3px;
}
.tsr-gmail-head .title { font: 600 18px/1 -apple-system, sans-serif; color: #555; letter-spacing: 0.02em; }
.tsr-gmail-head .search {
  flex: 1; max-width: 480px; margin: 0 20px;
  background: #f1f3f4; border-radius: 8px;
  padding: 9px 14px; font: 400 13px/1 -apple-system, sans-serif; color: #777;
}
.tsr-gmail-body { flex: 1; display:flex; overflow:hidden; }
.tsr-gmail-side {
  flex: 0 0 200px; padding: 20px 10px;
  background: #f6f8fc;
  font: 500 14px/1 -apple-system, sans-serif; color: #444;
  border-right: 1px solid #eaecee;
}
.tsr-gmail-side .side-item {
  padding: 10px 16px; border-radius: 0 20px 20px 0; margin-bottom: 4px;
  display: flex; align-items: center; gap: 12px;
}
.tsr-gmail-side .side-item.active { background: #fce8e6; color: #c5221f; font-weight: 600; }
.tsr-gmail-side .side-item::before {
  content:''; width: 8px; height: 8px; border-radius:50%;
  background: currentColor; opacity: .6;
}
.tsr-gmail-list { flex: 1; overflow: auto; }
.tsr-gmail-row {
  display:flex; gap:14px; padding: 14px 20px;
  border-bottom: 1px solid #f1f3f4; align-items: center;
}
.tsr-gmail-row .from { flex: 0 0 140px;
  font: 500 14px/1.2 -apple-system, sans-serif; color: #202124;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsr-gmail-row .subj { flex: 1; font: 400 14px/1.2 -apple-system, sans-serif; color: #555;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsr-gmail-row .subj b { color: #202124; margin-right: 6px; }
.tsr-gmail-row .time { font: 500 12px/1 -apple-system, sans-serif; color: #999; }
.tsr-gmail-row.blurred .from,
.tsr-gmail-row.blurred .subj,
.tsr-gmail-row.blurred .time { filter: blur(5px); opacity: .7; }
.tsr-gmail-row.new {
  background: linear-gradient(to right, rgba(226,119,48,0.10), transparent 70%);
  position: relative;
  animation: tsr-gping 1s cubic-bezier(0.16,1,0.3,1) .6s both;
}
.tsr-gmail-row.new::before {
  content: ''; position:absolute; left:0; top:10px; bottom:10px;
  width: 4px; background: #E27730; border-radius: 0 2px 2px 0;
}
.tsr-gmail-row.new .from { color: #c96320; font-weight: 700; }
.tsr-gmail-row.new .subj b { color: #1e1410; }
@keyframes tsr-gping {
  0%   { box-shadow: 0 0 0 0 rgba(226,119,48,0.55); }
  60%  { box-shadow: 0 0 0 22px rgba(226,119,48,0); }
  100% { box-shadow: 0 0 0 0 rgba(226,119,48,0); }
}
.tsr-gmail-row.new .new-badge {
  margin-left: 10px; padding: 3px 9px;
  background: #E27730; color: #fff; border-radius: 10px;
  font: 700 11px/1 -apple-system, sans-serif; letter-spacing: 0.08em;
}
`;

const STYLE_ID = 'tsr-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function mount({
  url = 'sulliesbakery.com/contact',
  brand = "Sullie's Bakery",
  heading = "Got a question? We'd love to hear from you.",
  sub = "Send us a note and we'll get back to you within one business day.",
  fields = [
    { label: 'Name',    text: 'Sullie Eloso' },
    { label: 'Email',   text: 'sullie@wpforms.com' },
    { label: 'Message', text: 'Hi team — loving the site. Can we get in touch?', textarea: true },
  ],
  inboxLabel = 'sullie@wpforms.com',
  newFrom = 'WordPress',
  newSubj = '<b>New Entry: Contact Us Form</b>Name: Sullie Eloso · Email: sullie@wpforms.com · Message: Hi team…',
} = {}) {
  ensureStyles();

  const fieldsHTML = fields.map(f => `
    <label class="tsr-field">
      <span class="tsr-label">${f.label}</span>
      <div class="tsr-input${f.textarea ? ' textarea' : ''}" data-tf="${f.text}"></div>
    </label>
  `).join('');

  const ov = document.createElement('div');
  ov.className = 'tsr-root';
  ov.innerHTML = `
    <div class="tsr-stage">
      <div class="tsr-site">
        <div class="tsr-chrome">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <div class="url">${url}</div>
        </div>
        <div class="tsr-page">
          <div class="tsr-hero">
            <div class="brand-row">${brand}</div>
            <h1>${heading}</h1>
            <p>${sub}</p>
          </div>
          <div class="tsr-form">
            <div class="tsr-form-title">Contact form</div>
            ${fieldsHTML}
            <button class="tsr-submit">Submit<span class="ripple"></span></button>
          </div>
        </div>
      </div>

      <svg class="tsr-cursor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 3 L24 14 L14 16 L10 26 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>

      <div class="tsr-gmail">
        <div class="tsr-gmail-win">
          <div class="tsr-gmail-head">
            <div class="logo"></div>
            <div class="title">Inbox — ${inboxLabel}</div>
            <div class="search">Search mail</div>
          </div>
          <div class="tsr-gmail-body">
            <div class="tsr-gmail-side">
              <div class="side-item active">Inbox</div>
              <div class="side-item">Starred</div>
              <div class="side-item">Sent</div>
              <div class="side-item">Drafts</div>
              <div class="side-item">Spam</div>
            </div>
            <div class="tsr-gmail-list">
              <div class="tsr-gmail-row new">
                <div class="from">${newFrom}</div>
                <div class="subj">${newSubj}<span class="new-badge">NEW</span></div>
                <div class="time">just now</div>
              </div>
              <div class="tsr-gmail-row blurred"><div class="from">GitHub</div><div class="subj"><b>[sullies/site] PR #214 review requested</b>review requested on "Add pricing page"</div><div class="time">9:12</div></div>
              <div class="tsr-gmail-row blurred"><div class="from">Figma</div><div class="subj"><b>New comments on Landing v4</b>3 comments by Priya, Luis and Amir</div><div class="time">8:48</div></div>
              <div class="tsr-gmail-row blurred"><div class="from">Stripe</div><div class="subj"><b>Payout sent to your account</b>$1,284.00 should arrive by Friday</div><div class="time">8:01</div></div>
              <div class="tsr-gmail-row blurred"><div class="from">Linear</div><div class="subj"><b>3 issues due this week</b>BAKE-214 · BAKE-231 · BAKE-234</div><div class="time">Yesterday</div></div>
              <div class="tsr-gmail-row blurred"><div class="from">Notion</div><div class="subj"><b>Weekly digest</b>5 pages updated in Design Systems</div><div class="time">Yesterday</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);
  await sleep(40);
  ov.classList.add('on');

  const siteWin = ov.querySelector('.tsr-site');
  const cur     = ov.querySelector('.tsr-cursor');
  const inputs  = ov.querySelectorAll('.tsr-input');
  const submit  = ov.querySelector('.tsr-submit');

  const stageRect = () => ov.querySelector('.tsr-stage').getBoundingClientRect();
  function cursorTo(target) {
    const s = stageRect();
    let x, y;
    if (target instanceof Element) {
      const r = target.getBoundingClientRect();
      x = r.left - s.left + r.width * 0.55;
      y = r.top  - s.top  + r.height * 0.5;
    } else { x = target.x; y = target.y; }
    cur.style.left = `${x - 4}px`;
    cur.style.top  = `${y - 4}px`;
  }
  const cursorShow = v => cur.classList.toggle('on', v);
  function cursorClick() {
    cur.classList.add('click');
    setTimeout(() => cur.classList.remove('click'), 380);
  }

  // Timeline (~12.3s — targets a 'welcome' narration track)
  const animPromise = (async () => {
    const initial = { x: stageRect().width * 0.55, y: stageRect().height * 0.92 };
    cursorTo(initial);
    await sleep(700);
    cursorShow(true);
    await sleep(400);

    siteWin.classList.add('zoom-in');
    await sleep(1200);

    for (const inp of inputs) {
      const full = inp.dataset.tf;
      inp.classList.add('typing', 'tf-caret');
      for (let i = 1; i <= full.length; i++) {
        inp.textContent = full.slice(0, i);
        await sleep(22 + Math.random() * 12);
      }
      inp.classList.remove('tf-caret');
      await sleep(120);
      inp.classList.remove('typing');
    }

    cursorTo(submit);
    await sleep(650);
    cursorClick();
    submit.classList.add('pressed');
    await sleep(420);
    submit.classList.remove('pressed');

    siteWin.classList.add('dim');
    cursorShow(false);
    await sleep(250);
    ov.classList.add('show-gmail');
    await sleep(900);
  })();

  async function dismiss() {
    ov.classList.add('exit');
    await sleep(500);
    ov.remove();
  }

  return { root: ov, animPromise, dismiss };
}
