// Boot-check test-3d-scattered-2 — verify panels render, 3D flip-in
// fires, camera fly-ins land, and the deep-zoom variants apply.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'test2-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = 'http://localhost:60488/videos/test-3d-scattered-2/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE-ERROR:', msg.text().slice(0, 120)); });
  await page.goto(URL, { waitUntil: 'load' });

  // Sample ABSOLUTE timestamps as the IIFE plays. waitForTimeout is
  // additive between iterations, so we compute the delta each time.
  const T_START = Date.now();
  for (const target of [1.5, 4.0, 7.0, 9.5, 13.0, 16.5]) {
    const elapsedMs = Date.now() - T_START;
    const wait_ms = Math.max(0, target * 1000 - elapsedMs);
    if (wait_ms > 0) await page.waitForTimeout(wait_ms);
    const t = target;
    const state = await page.evaluate(() => {
      const camera = document.getElementById('camera');
      const p3 = document.getElementById('p3');
      const ifr3 = document.getElementById('ifr3');
      const camR = camera.getBoundingClientRect();
      const p3R = p3.getBoundingClientRect();
      const ifr3R = ifr3.getBoundingClientRect();
      return {
        cameraT: getComputedStyle(camera).transform.slice(0, 60),
        cameraOpacity: getComputedStyle(camera).opacity,
        p3Opacity: getComputedStyle(p3).opacity,
        ifr3T: getComputedStyle(ifr3).transform.slice(0, 60),
        camR: { x: camR.x|0, y: camR.y|0, w: camR.width|0, h: camR.height|0 },
        p3R: { x: p3R.x|0, y: p3R.y|0, w: p3R.width|0, h: p3R.height|0 },
        ifr3R: { x: ifr3R.x|0, y: ifr3R.y|0, w: ifr3R.width|0, h: ifr3R.height|0 },
        caption: document.getElementById('captionText')?.textContent?.slice(0, 40) || '',
      };
    });
    console.log(`+${t}s`, JSON.stringify(state));
    await page.screenshot({ path: path.join(OUT_DIR, `t${t}.png`) });
  }

  await browser.close();
})();
