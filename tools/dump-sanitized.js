// Diagnostic: dump small slices of post-sanitize iframe DOM for the four
// strict-demo admin slugs so before/after content can be eyeballed without
// opening the snapshot viewer.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 4398;

const SPECS = [
  { slug: 'admin-entries-list',  selector: 'tbody#the-list', take: 1, limit: 1500 },
  { slug: 'admin-entry-detail',  selector: '#wpforms-entry-fields .inside .wpforms-entries-fields-wrapper', take: 1, limit: 1500 },
  { slug: 'admin-payments',      selector: 'a[href*="payment_id="]', take: 3, limit: 200 },
  { slug: 'admin-payment-detail',selector: '#wpforms-payment-entry-fields .inside', take: 1, limit: 2500 },
];

function startServer() {
  const proc = spawn(process.execPath, ['serve.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise(resolve => setTimeout(() => resolve(proc), 800));
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  for (const spec of SPECS) {
    await page.goto(`http://localhost:${PORT}/scenes/snapshot-viewer.html?snap=${spec.slug}&sanitize=1`, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const out = await page.evaluate((spec) => {
      const idoc = document.getElementById('frame').contentDocument;
      const els = Array.from(idoc.querySelectorAll(spec.selector)).slice(0, spec.take);
      return els.map(el => (el.outerHTML || el.textContent || '').slice(0, spec.limit));
    }, spec);
    console.log(`\n=== ${spec.slug} ===`);
    for (const s of out) console.log(s.replace(/\s+/g,' '));
  }
  await browser.close();
  server.kill();
})().catch(e => { console.error(e); process.exit(1); });
