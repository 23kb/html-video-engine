// Boot-check a video — does it load, do the snapshot
// swaps happen, does the zoom-in fire?
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'test1-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = process.argv[2] || 'http://localhost:4321/videos/<slug>/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE-ERROR:', msg.text()); });
  await page.goto(URL, { waitUntil: 'load' });

  // Sample at a few timestamps as the IIFE plays.
  for (const wait of [1.0, 3.5, 6.5, 9.5]) {
    await page.waitForTimeout(wait * 1000);
    const t = Math.round(wait * 10) / 10;
    const state = await page.evaluate(() => {
      const ui = document.getElementById('ui');
      const cursor = document.getElementById('cursor');
      const caption = document.getElementById('caption');
      const cs = getComputedStyle(ui);
      const cursorCs = getComputedStyle(cursor);
      return {
        src: ui?.src?.split('/').slice(-2)[0] || '',
        transform: cs.transform.slice(0, 60),
        cursorOpacity: cursorCs.opacity,
        cursorTransform: cursorCs.transform.slice(0, 60),
        captionText: caption?.textContent?.slice(0, 60) || '',
        gsapLoaded: typeof window.gsap !== 'undefined',
      };
    });
    console.log(`+${t}s`, JSON.stringify(state));
    await page.screenshot({ path: path.join(OUT_DIR, `t${t}.png`) });
  }

  await browser.close();
})();
