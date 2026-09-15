#!/usr/bin/env node
// C2 acceptance probe — runs the fixture and asserts numerically.
// Foreground, explicit timeout (ccs 18). Route-aborts __preview-ws (C4).
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 760 } });
  await ctx.route('**/__preview-ws', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  await page.goto('http://localhost:4321/videos/_sandbox-fixround/c2-fixture.html', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__results, { timeout: 30000 });
  const R = await page.evaluate(() => window.__results);
  await browser.close();
  console.log(JSON.stringify(R, null, 2));
  if (R.error) { console.log('[c2-probe] FAIL (error)'); process.exit(1); }
  const checks = [
    ['pane centering err < 35px', R.paneCenterErr < 35],
    ['target lives in an inner pane', R.paneUsed === true],
    ['smoothScrollIntoView moved the inner pane', R.innerScrollTopAfter > 0],
    ['settleAndMeasure returned a rect', !!R.settleRect],
    ['frontend target NOT in inner pane (window path)', R.windowTargetInPane === false],
    ['smoothScrollIntoView moved the window', R.frontendScrollRange === 0 || R.windowScrollYAfter > 0],
    ['pageCenter err < 35px or page too short to center', R.pageCenterErr < 35 || R.frontendScrollRange === 0],
  ];
  let pass = true;
  for (const [name, ok] of checks) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) pass = false; }
  console.log(pass ? '[c2-probe] PASS' : '[c2-probe] FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('[c2-probe] fatal:', e.message); process.exit(2); });
