#!/usr/bin/env node
// Headed Playwright capture for single-HTML videos (klaviyo-bridge-2 family).
// Records video-only at 1920×1080 (webm), then ffmpeg-converts to mp4 and
// mixes in the BGM with the same 2.5s fade-in / 0.15 volume used in-page.
//
// Usage: node tools/render-singlehtml.js <slug> --out <path.mp4> [--bgm bgms/6.mp3] [--duration 53]

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

function parseArgs() {
  const a = process.argv.slice(2);
  const args = { slug: null, out: null, bgm: null, duration: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--out') args.out = a[++i];
    else if (a[i] === '--bgm') args.bgm = a[++i];
    else if (a[i] === '--duration') args.duration = Number(a[++i]);
    else if (!args.slug && !a[i].startsWith('--')) args.slug = a[i];
  }
  if (!args.slug || !args.out) {
    console.error('Usage: node tools/render-singlehtml.js <slug> --out <path.mp4> [--bgm <mp3>] [--duration <sec>]');
    process.exit(1);
  }
  return args;
}

const args = parseArgs();
const REPO = path.resolve(__dirname, '..');
const PORT = 4321;
const URL = `http://localhost:${PORT}/videos/${args.slug}/index.html`;
const W = 1920, H = 1080;
const TMP_DIR = path.join(REPO, '.render-tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

(async () => {
  console.log(`[render] launching headed chromium @ ${W}x${H}`);
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${W},${H+120}`] });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: TMP_DIR, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  // Read TOTAL from the page so we know how long to wait
  const dur = args.duration || await page.evaluate(() => {
    // Try to locate TOTAL via the scrub max attribute
    const s = document.getElementById('scrub');
    return s ? parseFloat(s.max) : 60;
  });
  console.log(`[render] timeline duration = ${dur}s`);
  // Click Play
  await page.click('#play');
  // Wait for full duration + small tail
  await page.waitForTimeout((dur + 1.2) * 1000);
  // Close context to flush the video
  const videoPage = page.video();
  await ctx.close();
  await browser.close();
  const webmPath = await videoPage.path();
  console.log(`[render] captured: ${webmPath}`);

  // Convert webm → mp4, optionally muxing BGM
  const ffArgs = ['-y', '-i', webmPath];
  let filter;
  if (args.bgm) {
    const bgmAbs = path.isAbsolute(args.bgm) ? args.bgm : path.join(REPO, args.bgm);
    ffArgs.push('-i', bgmAbs);
    filter = `[1:a]afade=t=in:st=0:d=2.5,volume=0.15[a]`;
    ffArgs.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]');
  } else {
    ffArgs.push('-map', '0:v');
  }
  ffArgs.push(
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    args.out
  );
  console.log(`[render] ffmpeg: ${ffArgs.join(' ')}`);
  const r = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);

  // Cleanup intermediate webm
  try { fs.unlinkSync(webmPath); } catch (e) {}
  console.log(`[render] done -> ${args.out}`);
})().catch(e => { console.error(e); process.exit(1); });
