// Viewport-geometry design session 2026-08-22 — candidate shooter.
// Screenshots the SAME live pages at candidate viewports so Umair can pick
// capture geometry by eye. Scratch only: no snapshot folders touched, no
// captures run. Site preflighted GO this session.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// Site + creds from tools/sites.json — the registry capture.js/site-eval.js use.
// (.env's WP_URL is stale — newsite.local, 502 — the rf 3c trap; do NOT read it.)
const reg = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'tools', 'sites.json'), 'utf8'));
const site = reg.sites[reg.default];
const BASE = site.url.replace(/\/$/, '');
const env = { WP_USER: site.adminUser, WP_PASS: site.adminPass };

const SIZES = [
  { w: 1380, h: 668,  tag: 'legacy'      }, // what most existing snapshots were shot at
  { w: 1280, h: 720,  tag: 'mount-native'}, // IframeManager doc viewport — zero reflow
  { w: 1440, h: 900,  tag: 'code-default'}, // capture.js default today (fix-round B1)
  { w: 1440, h: 1080, tag: 'portrait-full'}, // 1080-tall: fills 9:16 at the 1.78 floor (1080*1.78=1922)
  { w: 1920, h: 1080, tag: 'stage-native'}, // full-HD, matches the 1920x1080 stage 1:1
];

const ADMIN_PAGES = [
  { key: 'builder-fields',   url: `${BASE}/wp-admin/admin.php?page=wpforms-builder&view=fields&form_id=1725` },
  { key: 'builder-settings', url: `${BASE}/wp-admin/admin.php?page=wpforms-builder&view=settings&section=notifications&form_id=1725` },
  { key: 'settings-general', url: `${BASE}/wp-admin/admin.php?page=wpforms-settings` },
];
const FRONT_PAGES = [
  { key: 'frontend-contact', url: `${BASE}/contact/` },
];

const HIDE_CSS = `
  [class*="challenge"], [id*="challenge"], #wpforms-builder-intro-popup,
  .wpforms-admin-notice, .notice.is-dismissible { display: none !important; }
`;

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape').catch(() => {});
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
  await page.waitForTimeout(300);
}

async function measure(page) {
  return page.evaluate(() => ({
    innerW: window.innerWidth, innerH: window.innerHeight,
    docW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
  }));
}

const results = [];

const browser = await chromium.launch();

// ── admin shots (logged in) ──
const admin = await browser.newContext({ viewport: { width: 1380, height: 668 } });
{
  const p = await admin.newPage();
  await p.goto(`${BASE}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await p.fill('#user_login', env.WP_USER);
  await p.fill('#user_pass', env.WP_PASS);
  await Promise.all([p.waitForURL(/wp-admin/, { timeout: 20000 }), p.click('#wp-submit')]);
  await p.close();
}
for (const size of SIZES) {
  const page = await admin.newPage();
  await page.setViewportSize({ width: size.w, height: size.h });
  for (const t of ADMIN_PAGES) {
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const m = await measure(page);
    const file = `${t.key}-${size.w}x${size.h}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    results.push({ page: t.key, ...size, ...m, file });
    console.log(`shot ${file}  doc ${m.docW}x${m.docH}`);
  }
  await page.close();
}
// full-page reference at mount-native width (admin pages)
{
  const page = await admin.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const t of ADMIN_PAGES) {
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const m = await measure(page);
    const file = `${t.key}-fullpage-1280.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    results.push({ page: t.key, w: 1280, h: 'full', tag: 'full-page', ...m, file });
    console.log(`shot ${file}  doc ${m.docW}x${m.docH}`);
  }
  await page.close();
}
await admin.close();

// ── frontend shots (logged OUT — no admin bar) ──
const front = await browser.newContext({ viewport: { width: 1380, height: 668 } });
for (const size of SIZES) {
  const page = await front.newPage();
  await page.setViewportSize({ width: size.w, height: size.h });
  for (const t of FRONT_PAGES) {
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const m = await measure(page);
    const file = `${t.key}-${size.w}x${size.h}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    results.push({ page: t.key, ...size, ...m, file });
    console.log(`shot ${file}  doc ${m.docW}x${m.docH}`);
  }
  await page.close();
}
{
  const page = await front.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const t of FRONT_PAGES) {
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const m = await measure(page);
    const file = `${t.key}-fullpage-1280.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    results.push({ page: t.key, w: 1280, h: 'full', tag: 'full-page', ...m, file });
    console.log(`shot ${file}  doc ${m.docW}x${m.docH}`);
  }
  await page.close();
}
await front.close();

await browser.close();
fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(results, null, 2));
console.log(`done — ${results.length} shots -> ${OUT}`);
