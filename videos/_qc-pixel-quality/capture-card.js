// Capture klaviyo-bridge-2 at the paste-API-key zoom (iframeCard at scale 1.75)
// to confirm the blur the user reports.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'card-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = 'http://localhost:52823/videos/klaviyo-bridge-2/index.html';

// Timeline seek points to test:
//   17.0s — iframeCard zoomed to scale 1.75, paste-flow about to run
//   18.5s — mid-paste, cursor at field
//   20.0s — after typing nickname
//   22.0s — Connect to Klaviyo click area
const SEEK_POINTS = [
  ['card_t17_zoomed', 17.0],
  ['card_t20_typing', 20.0],
  ['card_t22_connect', 22.0],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1140 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!document.getElementById('iframeCard') && typeof window.gsap !== 'undefined', { timeout: 30000 });
  await page.evaluate(() => {
    const s = document.getElementById('stage');
    s.style.zoom = '1';
    const wrap = document.querySelector('.stage-wrap');
    if (wrap) { wrap.style.justifyContent = 'flex-start'; wrap.style.alignItems = 'flex-start'; wrap.style.height = '1080px'; wrap.style.overflow = 'visible'; }
  });
  // Find master timeline.
  await page.evaluate(() => {
    const root = window.gsap.globalTimeline;
    let best = null;
    root.getChildren(true, true, true).forEach(t => {
      if (t.duration && t.duration() > 30 && (!best || t.duration() > best.duration())) best = t;
    });
    window.__tl = best;
    if (best) best.pause();
  });

  // Play the timeline FORWARD via tweenTo to t=20 — seek-snap doesn't
  // reproduce Chrome's lazy-raster artifact because layer history matters.
  await page.evaluate(() => new Promise(resolve => {
    const tl = window.__tl;
    tl.pause();
    tl.tweenTo(20, { onComplete: () => { tl.pause(); resolve(); } });
  }));
  await page.waitForTimeout(2500);
  // Force iframe to scroll to Klaviyo row since tl.call doesn't replay.
  await page.evaluate(() => {
    const ifr = document.getElementById('klaviyoFormFrame');
    try {
      const doc = ifr.contentDocument;
      const target = doc?.querySelector('#wpforms-integration-klaviyo');
      const scroller = doc.scrollingElement || doc.documentElement || doc.body;
      if (target && scroller) scroller.scrollTop = Math.max(0, target.offsetTop + 60);
    } catch (_) {}
  });
  await page.waitForTimeout(800);

  const VARIANTS = [
    ['A_asis',                    () => {}],
    ['B_card_flat',               () => { document.getElementById('iframeCard').style.transformStyle = 'flat'; }],
    ['C_iframe_willchange',       () => { document.querySelector('#iframeCard iframe').style.willChange = 'transform'; }],
    ['D_card_no_willchange',      () => { document.getElementById('iframeCard').style.willChange = 'auto'; }],
    ['E_scene_no_perspective',    () => { document.getElementById('iframeScene').style.perspective = 'none'; }],
    ['F_iframe_zoom_inner',       () => {
      const ifr = document.querySelector('#iframeCard iframe');
      try { ifr.contentDocument.documentElement.style.zoom = '1.75'; } catch (_) {}
    }],
    ['G_iframe_own_transform',    () => {
      // Move scale from card to iframe; cancel on card.
      const card = document.getElementById('iframeCard');
      const ifr = card.querySelector('iframe');
      // Card was at scale 1.75 translate(225,116) — keep position, drop scale.
      // iframe takes scale 1.75 itself; transform-origin: 0 0.
      // Visual goal: keep iframe magnified so Klaviyo row stays visible.
      card.style.transform = 'translate(225px, 116px)';
      ifr.style.transformOrigin = '0 0';
      ifr.style.transform = 'scale(1.75)';
    }],
  ];

  for (const [label, apply] of VARIANTS) {
    // Reset variant-specific overrides.
    await page.evaluate(() => {
      const card = document.getElementById('iframeCard');
      const scene = document.getElementById('iframeScene');
      const ifr = card.querySelector('iframe');
      card.style.transformStyle = '';
      card.style.willChange = '';
      scene.style.perspective = '';
      ifr.style.willChange = '';
      ifr.style.transform = '';
      ifr.style.transformOrigin = '';
      try { ifr.contentDocument.documentElement.style.zoom = ''; } catch (_) {}
    });
    await page.evaluate(apply);
    await page.waitForTimeout(1500);
    const out = path.join(OUT_DIR, label + '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log('captured', label);
  }

  await browser.close();
  console.log('done');
})();
