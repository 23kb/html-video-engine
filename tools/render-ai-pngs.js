import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const slugs = [
  'builder-setup',
  'wpforms-ai-builder-empty',
  'wpforms-ai-builder-feedback-generated',
];

const outDir = resolve('uploads-ai-pngs');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const slug of slugs) {
  const url = pathToFileURL(resolve(`snapshots/${slug}/index.html`)).href;
  console.log(`rendering ${slug}`);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  const out = resolve(outDir, `${slug}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  -> ${out}`);
}

await browser.close();
console.log('done');
