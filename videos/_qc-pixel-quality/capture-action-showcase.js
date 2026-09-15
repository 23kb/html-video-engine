// Capture the film at the action-showcase moment to verify the
// settle-mode trick made the spProviders iframe content sharp under the
// 2.30 camera zoom.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'showcase-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = process.argv[2] || 'http://localhost:4321/videos/<slug>/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!document.getElementById('scatteredCamera') && typeof window.gsap !== 'undefined', { timeout: 30000 });
  await page.evaluate(() => {
    const root = window.gsap.globalTimeline;
    let best = null;
    root.getChildren(true,true,true).forEach(t => { if (t.duration && t.duration() > 30 && (!best || t.duration() > best.duration())) best = t; });
    window.__tl = best; if (best) best.pause();
  });
  await page.waitForTimeout(1500);

  // Play forward to ~36s (during action showcase, ~1s after first dropdown
  // injection so the overlay is visible alongside the snapshot form fields).
  for (const t of [32, 35, 38, 41]) {
    await page.evaluate((t) => new Promise(resolve => {
      const tl = window.__tl; tl.pause();
      tl.tweenTo(t, { onComplete: () => { tl.pause(); resolve(); } });
    }), t);
    await page.waitForTimeout(3000);
    const state = await page.evaluate(() => {
      const ifr = document.getElementById('spProviders');
      const cs = getComputedStyle(ifr);
      let zoomVal = '', blockTop = -1, blockLeft = -1, blockH = -1, scrollTop = 0, cameraTransform = '';
      try {
        const doc = ifr.contentDocument;
        zoomVal = doc?.documentElement?.style?.zoom || '';
        const block = doc?.querySelector('.wpforms-builder-klaviyo-provider-connection');
        if (block) {
          const r = block.getBoundingClientRect();
          blockTop = r.top; blockLeft = r.left; blockH = r.height;
        }
        scrollTop = (doc.scrollingElement || doc.documentElement).scrollTop;
      } catch (_) {}
      const cam = document.getElementById('scatteredCamera');
      cameraTransform = getComputedStyle(cam).transform.slice(0, 60);
      return {
        innerZoom: zoomVal,
        block: { top: blockTop, left: blockLeft, h: blockH },
        scrollTop,
        ifrBox: { w: cs.width, h: cs.height, l: ifr.style.left, t: ifr.style.top },
        cameraTransform,
      };
    });
    console.log('t=' + t, JSON.stringify(state));
    await page.screenshot({ path: path.join(OUT_DIR, `t${t}.png`) });
  }

  await browser.close();
})();
