// Validate that the engine-pattern fix at line 1843 actually makes the
// iframe sharp during the paste-key held state.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'card-fix-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = process.argv[2] || 'http://localhost:4321/videos/<slug>/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1140 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!document.getElementById('iframeCard') && typeof window.gsap !== 'undefined', { timeout: 30000 });
  await page.evaluate(() => {
    const s = document.getElementById('stage'); s.style.zoom = '1';
    const wrap = document.querySelector('.stage-wrap');
    if (wrap) { wrap.style.justifyContent = 'flex-start'; wrap.style.alignItems = 'flex-start'; wrap.style.height = '1080px'; wrap.style.overflow = 'visible'; }
  });
  await page.evaluate(() => {
    const root = window.gsap.globalTimeline;
    let best = null;
    root.getChildren(true,true,true).forEach(t => { if (t.duration && t.duration() > 30 && (!best || t.duration() > best.duration())) best = t; });
    window.__tl = best; if (best) best.pause();
  });

  for (const t of [17, 20, 22]) {
    await page.evaluate((t) => new Promise(resolve => {
      const tl = window.__tl; tl.pause();
      tl.tweenTo(t, { onComplete: () => { tl.pause(); resolve(); } });
    }), t);
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => {
      const card = document.getElementById('iframeCard');
      const ifr = document.getElementById('klaviyoFormFrame');
      const ifrCs = getComputedStyle(ifr);
      const cardRect = card.getBoundingClientRect();
      const ifrRect = ifr.getBoundingClientRect();
      let scrollTop = -1;
      try { scrollTop = (ifr.contentDocument.scrollingElement || ifr.contentDocument.documentElement).scrollTop; } catch (_) {}
      return {
        cardRect: { x: cardRect.x|0, y: cardRect.y|0, w: cardRect.width|0, h: cardRect.height|0 },
        iframeRect: { x: ifrRect.x|0, y: ifrRect.y|0, w: ifrRect.width|0, h: ifrRect.height|0 },
        scrollTop,
      };
    });
    console.log('t=' + t, JSON.stringify(state));
    await page.screenshot({ path: path.join(OUT_DIR, `fix_t${t}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }

  await browser.close();
})();
