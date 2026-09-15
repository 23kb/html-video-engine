#!/usr/bin/env node
// C4 verification probe: proves the **/__preview-ws route-abort prevents
// preview.js's live-reload from reloading a page mid-capture.
// Runs BOTH conditions against a live preview.js on :4321:
//   control (no abort)  -> file touch MUST reload the page (loadCount 2)
//   guarded (with abort) -> file touch must NOT reload (loadCount stays 1)
// Foreground, explicit timeout (ccs 18 rule).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'c4-live-reload-fixture.html');
const URL = 'http://localhost:4321/videos/_sandbox-fixround/c4-live-reload-fixture.html';

async function runCondition(browser, { abort }) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  if (abort) await ctx.route('**/__preview-ws', r => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  const before = await page.evaluate(() => window.__loadCount);
  // Touch the watched file (videos/ is in preview.js's chokidar list).
  fs.appendFileSync(FIXTURE, '\n<!-- touch -->');
  // Watcher debounce 150ms + awaitWriteFinish 80ms + ws + reload; give it 3s.
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => window.__loadCount).catch(() => 'PAGE_GONE');
  await ctx.close();
  return { before, after };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const control = await runCondition(browser, { abort: false });
    console.log(`[c4-probe] control (no abort):  before=${control.before} after=${control.after} ` +
      (control.after > control.before ? 'RELOADED (detector works)' : 'NO RELOAD — detector broken, test invalid'));
    const guarded = await runCondition(browser, { abort: true });
    console.log(`[c4-probe] guarded (route abort): before=${guarded.before} after=${guarded.after} ` +
      (guarded.after === guarded.before ? 'NO RELOAD (fix works)' : 'RELOADED — FIX FAILED'));
    const pass = control.after > control.before && guarded.after === guarded.before;
    console.log(pass ? '[c4-probe] PASS' : '[c4-probe] FAIL');
    process.exit(pass ? 0 : 1);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('[c4-probe] fatal:', e.message); process.exit(2); });
