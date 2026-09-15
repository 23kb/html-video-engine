// Capture klaviyo-bridge-2 at multiple beats to verify:
//  - Iframe size bump (1280×720 → 1440×900) renders correctly
//  - Page-fill backdrop reaches viewport edges (no black corners)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'full-bridge-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = 'http://localhost:53502/videos/klaviyo-bridge-2/index.html';

const BEATS = [
  ['t02_intro_lockup',  2.0],
  ['t05_iframe_reveal', 5.0],
  ['t10_klaviyo_page',  10.0],
  ['t13_docs_view',     13.0],
  ['t17_paste_zoom',    17.0],
  ['t22_connected',     22.0],
  ['t28_scattered',     28.0],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Use a non-1920×1080 viewport so any black corners are obvious.
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!document.getElementById('stage') && typeof window.gsap !== 'undefined', { timeout: 30000 });
  await page.evaluate(() => {
    const root = window.gsap.globalTimeline;
    let best = null;
    root.getChildren(true, true, true).forEach(t => {
      if (t.duration && t.duration() > 30 && (!best || t.duration() > best.duration())) best = t;
    });
    window.__tl = best;
    if (best) best.pause();
  });
  await page.waitForTimeout(1500);

  for (const [label, t] of BEATS) {
    await page.evaluate((t) => new Promise(resolve => {
      const tl = window.__tl;
      tl.pause();
      tl.tweenTo(t, { onComplete: () => { tl.pause(); resolve(); } });
    }), t);
    await page.waitForTimeout(2000);
    const out = path.join(OUT_DIR, label + '.png');
    await page.screenshot({ path: out });
    console.log('captured', label);
  }

  await browser.close();
})();
