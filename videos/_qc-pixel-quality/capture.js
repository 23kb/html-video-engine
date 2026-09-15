// Headless screenshot capture for the QC page.
// Drives the page through combinations of (cameraMode, oversample, zoom)
// and saves a clipped screenshot of the stage area for each.
// Usage: node videos/_qc-pixel-quality/capture.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'shots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const URL = 'http://localhost:50483/videos/_qc-pixel-quality/index.html';

// Each combo: [label, cameraMode, oversample, zoom, focus]
const COMBOS = [
  // Baseline — what the bridge currently looks like at deep zoom.
  ['A_baseline-transform-1x-zoom2.3-P3',  'transform', 1.0,  2.3, 2],
  // Same camera mode, bigger oversample — current bridge fix attempt.
  ['B_transform-3x-zoom2.3-P3',           'transform', 3.0,  2.3, 2],
  // Zoom camera, no oversample — hypothesis to test.
  ['C_zoom-1x-zoom2.3-P3',                'zoom',      1.0,  2.3, 2],
  // Zoom camera + moderate oversample — combined.
  ['D_zoom-1.5x-zoom2.3-P3',              'zoom',      1.5,  2.3, 2],
  // Extreme zoom test on transform mode.
  ['E_transform-1x-zoom3-P3',             'transform', 1.0,  3.0, 2],
  // Same extreme on zoom mode.
  ['F_zoom-1x-zoom3-P3',                  'zoom',      1.0,  3.0, 2],
  // 1.55× — the other camera value used in the bridge.
  ['G_transform-1x-zoom1.55-P3',          'transform', 1.0,  1.55, 2],
  ['H_zoom-1x-zoom1.55-P3',               'zoom',      1.0,  1.55, 2],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1140 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.state !== 'undefined');
  // Force the outer stage to render at native 1× so we screenshot the
  // unscaled stage texture, then position it at top-left for clean clip.
  await page.evaluate(() => {
    const s = document.getElementById('stage');
    s.style.zoom = '1';
    const wrap = document.querySelector('.stage-wrap');
    wrap.style.justifyContent = 'flex-start';
    wrap.style.alignItems = 'flex-start';
    wrap.style.overflow = 'visible';
  });
  // Wait for all iframes to load their snapshot HTMLs.
  await page.waitForFunction(() => {
    const frames = [...document.querySelectorAll('iframe.real')];
    return frames.every(f => {
      try { return !!(f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0); }
      catch (_) { return false; }
    });
  }, { timeout: 30000 });
  await page.waitForTimeout(1500);

  for (const [label, cam, over, zoom, focus] of COMBOS) {
    const debugInfo = await page.evaluate(([cam, over, zoom, focus]) => {
      window.state.cameraMode = cam;
      window.state.oversample = over;
      window.state.zoom = zoom;
      window.state.focus = focus;
      window.applyOversample();
      window.applyCamera();
      window.updateHUD();
      const cam_el = document.getElementById('camera');
      const p3 = document.getElementById('p3');
      const r_cam = cam_el.getBoundingClientRect();
      const r_p3 = p3.getBoundingClientRect();
      return {
        cam_style: { zoom: cam_el.style.zoom, transform: cam_el.style.transform, left: cam_el.style.left, top: cam_el.style.top },
        cam_rect: { x: r_cam.left, y: r_cam.top, w: r_cam.width, h: r_cam.height },
        p3_rect: { x: r_p3.left, y: r_p3.top, w: r_p3.width, h: r_p3.height },
      };
    }, [cam, over, zoom, focus]);
    console.log(label, JSON.stringify(debugInfo));
    await page.waitForTimeout(300);
    const out = path.join(OUT_DIR, label + '.png');
    // Stage is 1920×1080 at top-left, below the 44px toolbar.
    await page.screenshot({ path: out, clip: { x: 0, y: 44, width: 1920, height: 1080 } });
    console.log('captured', label);
  }

  await browser.close();
  console.log('done →', OUT_DIR);
})();
