// Selector verifier — runs a list of CSS selectors against a snapshot and
// reports which resolve. Prevents the "agent assumed a selector" failure mode.
//
// Usage:
//   node tools/verify-selectors.js <snapshot-slug> [--port 4321] [selector...]
//
// Or pipe selectors in one-per-line:
//   cat selectors.txt | node tools/verify-selectors.js <slug>
//
// Dev server must be running at http://localhost:<port>.

const { chromium } = require('playwright');

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--') && !a.startsWith('-'));
const port = (args.find(a => a.startsWith('--port=')) || '').split('=')[1]
           || (args.includes('--port') ? args[args.indexOf('--port') + 1] : '4321');

if (!slug) {
  console.error('Usage: node tools/verify-selectors.js <snapshot-slug> [--port N] [selector...]');
  process.exit(1);
}

// Selectors: either from CLI tail args OR stdin lines.
const cliSelectors = args.filter((a, i) => {
  if (a === slug) return false;
  if (a.startsWith('--')) return false;
  if (i > 0 && args[i-1] === '--port') return false;
  return true;
});

async function readStdin() {
  if (process.stdin.isTTY) return [];
  return new Promise(resolve => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { buf += c; });
    process.stdin.on('end',  () => resolve(
      buf.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))
    ));
  });
}

(async () => {
  const stdinSelectors = await readStdin();
  const selectors = [...cliSelectors, ...stdinSelectors];

  if (!selectors.length) {
    console.error('no selectors provided (pass as args or pipe one-per-line)');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Load snapshot directly — no iframe wrapper; we just want to query its DOM.
  const url = `http://localhost:${port}/snapshots/${slug}/index.html`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (e) {
    console.error('Could not load ' + url + ' — is the dev server running on port ' + port + '?');
    console.error(e.message);
    await browser.close();
    process.exit(2);
  }

  const results = await page.evaluate((sels) => {
    return sels.map(sel => {
      try {
        const n = document.querySelector(sel);
        if (!n) return { sel, ok: false, reason: 'no match' };
        const r = n.getBoundingClientRect();
        return {
          sel, ok: true,
          tag: n.tagName.toLowerCase(),
          rect: { w: Math.round(r.width), h: Math.round(r.height) },
          zero: r.width === 0 || r.height === 0,
        };
      } catch (e) {
        return { sel, ok: false, reason: 'invalid: ' + e.message };
      }
    });
  }, selectors);

  let pass = 0, fail = 0, zero = 0;
  for (const r of results) {
    if (!r.ok) {
      fail++;
      console.log('✗ ' + r.sel + '  —  ' + r.reason);
    } else if (r.zero) {
      zero++;
      console.log('⚠ ' + r.sel + '  —  matches <' + r.tag + '> but zero size');
    } else {
      pass++;
      console.log('✓ ' + r.sel + '  —  <' + r.tag + '> ' + r.rect.w + '×' + r.rect.h);
    }
  }
  console.log('\n' + pass + ' ok, ' + zero + ' zero-size, ' + fail + ' missing');

  await browser.close();
  process.exit(fail ? 3 : 0);
})();
