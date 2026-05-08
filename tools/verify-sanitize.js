// Loads each admin snapshot through the snapshot-viewer with sanitize=1
// (same path the runtime uses), then reads the iframe DOM after the sanitize
// pass and checks for forbidden patterns. Reports a pass/fail table.
//
// Usage:
//   node tools/verify-sanitize.js
//   node tools/verify-sanitize.js admin-entries-list admin-payments
//
// Requires `playwright` (already a dep) and `serve.js` to be runnable.

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.SANITIZE_VERIFY_PORT) || 4399;

// Forbidden patterns + strict-demo slug list shared with the bake tool.
const { FORBIDDEN, FIXTURE_RE, STRICT_DEMO_SLUGS, ADMIN_SLUGS } = require('./_sanitize-forbidden.js');

// Required structural checks per admin slug.
const REQUIRED_STRUCT = [
  { label: '#adminmenu present',     test: doc => !!doc.querySelector('#adminmenu') },
  { label: '#wpadminbar absent',     test: doc => !doc.querySelector('#wpadminbar') },
];

function startServer() {
  const proc = spawn(process.execPath, ['serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    let buf = '';
    const onChunk = (b) => {
      buf += b.toString();
      if (buf.includes(`http://localhost:${PORT}`) || buf.includes('localhost:' + PORT)) {
        resolve(proc);
      }
    };
    proc.stdout.on('data', onChunk);
    proc.stderr.on('data', onChunk);
    proc.on('exit', (code) => reject(new Error(`serve.js exited early (${code}): ${buf}`)));
    setTimeout(() => resolve(proc), 1500); // serve.js prints once and just listens
  });
}

async function verifySlug(page, slug) {
  const url = `http://localhost:${PORT}/scenes/snapshot-viewer.html?snap=${slug}&sanitize=1`;
  const consoleWarnings = [];
  page.removeAllListeners('console');
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') consoleWarnings.push(m.text());
  });
  await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  // The viewer awaits the sanitize import inside the iframe `load` listener.
  // Give it ~750ms to finish the dynamic import + module run.
  await page.waitForTimeout(900);

  const result = await page.evaluate(() => {
    const frame = document.getElementById('frame');
    const idoc = frame?.contentDocument;
    if (!idoc) return { error: 'no iframe doc' };
    const text = (idoc.body?.innerText || '') + '\n' + (idoc.body?.innerHTML || '');
    return {
      text,
      hasAdminMenu:  !!idoc.querySelector('#adminmenu'),
      hasAdminBar:   !!idoc.querySelector('#wpadminbar'),
      hasWpToolbar:  !!idoc.querySelector('#wp-toolbar'),
      bodyAdminBar:  (idoc.body?.classList || []).contains('admin-bar'),
      htmlWpToolbar: (idoc.documentElement?.classList || []).contains('wp-toolbar'),
      sampleEmails:  (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).slice(0, 5),
    };
  });
  if (result.error) return { slug, pass: false, hits: [result.error] };

  const hits = [];
  for (const f of FORBIDDEN) {
    if (f.re.test(result.text)) hits.push(f.label);
  }
  if (STRICT_DEMO_SLUGS.has(slug)) {
    const m = result.text.match(FIXTURE_RE);
    if (m) hits.push(`lorem-style fixture token: "${m[0]}"`);
  }
  if (ADMIN_SLUGS.includes(slug)) {
    if (!result.hasAdminMenu)        hits.push('missing #adminmenu');
    if (result.hasAdminBar)          hits.push('still has #wpadminbar');
    if (result.hasWpToolbar)         hits.push('still has #wp-toolbar');
    if (result.bodyAdminBar)         hits.push('body still has .admin-bar');
    if (result.htmlWpToolbar)        hits.push('html still has .wp-toolbar');
  }
  if (slug === 'builder-fields') {
    const builder = await page.evaluate(() => {
      const frame = document.getElementById('frame');
      const idoc = frame?.contentDocument;
      const types = Array.from(idoc.querySelectorAll('.wpforms-field-wrap > .wpforms-field[data-field-type]'))
        .map(el => el.getAttribute('data-field-type'));
      const paymentSurfaces = idoc.querySelectorAll('#wpforms-paypal-commerce-buttons-wrapper, .wpforms-paypal-commerce-button').length;
      return { types, paymentSurfaces };
    });
    const expected = ['name', 'email', 'textarea'];
    if (builder.types.join(',') !== expected.join(',')) {
      hits.push(`builder field set ${JSON.stringify(builder.types)} != ${JSON.stringify(expected)}`);
    }
    if (builder.paymentSurfaces) hits.push('builder still has PayPal payment surfaces');
  }
  return { slug, pass: hits.length === 0, hits, sampleEmails: result.sampleEmails, warnings: consoleWarnings };
}

(async () => {
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ADMIN_SLUGS;
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  const results = [];
  for (const slug of slugs) {
    try {
      const r = await verifySlug(page, slug);
      results.push(r);
      const tag = r.pass ? 'PASS' : 'FAIL';
      const hit = r.hits?.length ? ` — ${r.hits.join('; ')}` : '';
      console.log(`${tag.padEnd(4)} ${slug.padEnd(34)}${hit}`);
    } catch (e) {
      results.push({ slug, pass: false, hits: ['runtime error: ' + e.message] });
      console.log(`FAIL ${slug.padEnd(34)} — ${e.message}`);
    }
  }

  await browser.close();
  server.kill();

  const failCount = results.filter(r => !r.pass).length;
  console.log('\n' + (failCount === 0
    ? `✓ ${results.length}/${results.length} slugs passed`
    : `✗ ${failCount} of ${results.length} slugs failed`));
  process.exit(failCount === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
