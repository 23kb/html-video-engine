// Quick frame-capture for editorial scenes. Loads a URL, scrubs the master
// timeline (window.__tl) at intervals, screenshots each. Writes f_NN.jpg files.
// Then composites them into a contact sheet via ffmpeg.
//
// Usage:  node tools/ref-frames/capture-scene.js <slug> <url> <duration> [step=1]

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

(async () => {
  const slug = process.argv[2];
  const url = process.argv[3];
  const duration = parseFloat(process.argv[4] || '30');
  const step = parseFloat(process.argv[5] || '1');

  const outDir = path.join(__dirname, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for timeline to be built
  await page.waitForFunction(() => window.__tl && window.__tl.duration() > 5, { timeout: 60000 });
  // Pause auto-play
  await page.evaluate(() => { window.__tl.pause(); window.__tl.time(0); });
  await page.waitForTimeout(500);

  const frames = [];
  for (let t = 0; t <= duration; t += step) {
    await page.evaluate((tt) => {
      window.__tl.time(tt);
      // tick GSAP a few times for cross-iframe DOM updates to settle
      for (let i = 0; i < 3; i++) gsap.ticker.tick();
    }, t);
    await page.waitForTimeout(150);
    const fname = path.join(outDir, `f_${String(Math.round(t * 10)).padStart(4, '0')}.jpg`);
    await page.screenshot({ path: fname, type: 'jpeg', quality: 85, fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    frames.push(fname);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  await browser.close();

  // composite contact sheet
  const tile = duration <= 10 ? '5x2' : duration <= 16 ? '6x3' : duration <= 25 ? '6x5' : '6x6';
  const contactPath = path.join(outDir, 'contact.jpg');
  const r = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '1',
    '-pattern_type', 'glob',
    '-i', path.join(outDir, 'f_*.jpg').replace(/\\/g, '/'),
    '-vf', `scale=240:-1,tile=${tile}`,
    '-frames:v', '1',
    '-update', '1',
    contactPath,
  ], { stdio: 'inherit' });
  console.log(`\nWrote ${frames.length} frames + ${contactPath}`);
})();
