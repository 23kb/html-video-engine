// Capture the film at the actual zoomed-in moments to see if the
// "looks like 240p" complaint reproduces in headless render.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'bridge-shots');
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = process.argv[2] || 'http://localhost:4321/videos/<slug>/index.html';

// Camera poses we want to capture, with scFocus() args.
// Mirrors what the GSAP timeline lands on at peak-zoom moments.
const POSES = [
  // Beat 14 — zoom on "Add New Connection" button. Uses btnCanvasX, btnCanvasY
  // which we'll let JS compute; here we just match Panel 3 area at 1.55×.
  ['poseA_p3_at_1x',    4100, 1500, 1.0 ],
  ['poseB_p3_at_1.55x', 4100, 1500, 1.55],
  ['poseC_p3_at_2.3x',  4100, 1500, 2.30],
  ['poseD_p3_at_3.0x',  4100, 1500, 3.00],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1140 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  // Wait for GSAP + page setup to be ready.
  await page.waitForFunction(() => {
    return !!document.getElementById('scatteredCamera') &&
           typeof window.gsap !== 'undefined';
  }, { timeout: 30000 });
  // Disable the outer-stage zoom-fit so screenshot is at native 1×.
  await page.evaluate(() => {
    const s = document.getElementById('stage');
    s.style.zoom = '1';
    const wrap = document.querySelector('.stage-wrap');
    if (wrap) {
      wrap.style.justifyContent = 'flex-start';
      wrap.style.alignItems = 'flex-start';
      wrap.style.height = '1080px';
      wrap.style.overflow = 'visible';
    }
  });
  // Wait for iframes to be loaded.
  await page.waitForFunction(() => {
    const frames = [...document.querySelectorAll('.scattered-panel iframe')];
    return frames.length >= 3 && frames.every(f => {
      try { return !!(f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0); }
      catch (_) { return false; }
    });
  }, { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Find the master timeline in gsap's children. The bridge stores it as a
  // const inside a module scope, but it's still a child of gsap.globalTimeline.
  await page.evaluate(() => {
    const root = window.gsap.globalTimeline;
    // The master tl is the longest paused timeline.
    let best = null;
    root.getChildren(true, true, true).forEach(t => {
      if (t.duration && t.duration() > 30 && (!best || t.duration() > best.duration())) best = t;
    });
    window.__tl = best;
    if (best) best.pause();
  });
  // Show the panels and ensure scattered scene visible by setting needed opacities.
  // Easier: seek to Beat 13 reveal time so the timeline auto-shows panels.
  await page.evaluate(() => {
    if (window.__tl) {
      // Beat 13 reveal starts around t≈18-20s. Seek to 25s for held panels.
      window.__tl.seek(25);
      window.__tl.pause();
    }
  });
  await page.waitForTimeout(1500);

  // Variants we want to test for each pose:
  //   "asis"           — just set the transform (baseline blur)
  //   "reraster"       — set transform, then toggle iframe display to force
  //                       Chromium to drop and re-rasterize the layer at the
  //                       new effective output scale
  //   "zoom-camera"    — use CSS zoom on the camera instead of transform: scale
  const VARIANTS = ['asis', 'iframe-willchange', 'no-camera-willchange', 'no-panel-rotation', 'iframe-zoom-inner'];

  for (const [label, cx, cy, scale] of POSES) {
    for (const variant of VARIANTS) {
      await page.evaluate(([cx, cy, scale, variant]) => {
        const SC_W = 5200, SC_H = 2400;
        const SC_OX = SC_W / 2, SC_OY = SC_H / 2;
        const SC_CX = 960, SC_CY = 540;
        const cam = document.getElementById('scatteredCamera');
        window.gsap.killTweensOf(cam);

        // Reset everything before applying variant tweaks.
        cam.style.willChange = 'transform';
        document.querySelectorAll('.scattered-panel').forEach(p => {
          // Preserve original rotation in dataset on first run.
          if (!p.dataset.origTransform) p.dataset.origTransform = p.style.transform || getComputedStyle(p).transform;
          p.style.transform = p.dataset.origTransform;
        });
        document.querySelectorAll('.scattered-panel iframe').forEach(f => {
          f.style.willChange = '';
          // Reset iframe inner-zoom override.
          try {
            const doc = f.contentDocument;
            if (doc && doc.documentElement) doc.documentElement.style.zoom = '';
          } catch (_) {}
        });

        // Apply camera transform (always transform: scale here).
        cam.style.zoom = '';
        const x = SC_CX - SC_OX - scale * (cx - SC_OX);
        const y = SC_CY - SC_OY - scale * (cy - SC_OY);
        cam.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

        if (variant === 'iframe-willchange') {
          // Force each iframe to be its own promoted layer.
          document.querySelectorAll('.scattered-panel iframe').forEach(f => {
            f.style.willChange = 'transform';
          });
        }
        if (variant === 'no-camera-willchange') {
          cam.style.willChange = 'auto';
        }
        if (variant === 'no-panel-rotation') {
          document.querySelectorAll('.scattered-panel').forEach(p => {
            p.style.transform = 'none';
          });
        }
        if (variant === 'iframe-zoom-inner') {
          // Apply CSS zoom INSIDE each iframe doc — re-rasterizes at high density.
          document.querySelectorAll('.scattered-panel iframe').forEach(f => {
            try {
              const doc = f.contentDocument;
              if (doc && doc.documentElement) doc.documentElement.style.zoom = String(scale);
            } catch (_) {}
          });
        }
      }, [cx, cy, scale, variant]);
      // Longer wait for re-raster / zoom mode to settle in the compositor.
      await page.waitForTimeout(1200);
      const out = path.join(OUT_DIR, `${label}_${variant}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      console.log('captured', label, variant);
    }
  }

  await browser.close();
  console.log('done →', OUT_DIR);
})();
