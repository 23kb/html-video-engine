const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const file = path.resolve(__dirname, '..', '..', 'snapshots', 'frontend-contact-clean', 'index.html');
  await p.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'domcontentloaded' });
  const r = await p.evaluate(() => {
    const out = [];
    for (const f of document.querySelectorAll('.iti__flag')) {
      const code = [...f.classList].find(c => /^iti__[a-z]{2}$/.test(c));
      const inSel = !!f.closest('.iti__selected-flag, .iti__flag-container');
      out.push({ code: code ? code.slice(5) : null, classes: String(f.className).slice(0, 50), inSel, parent: String(f.parentElement.className).slice(0, 60) });
    }
    return { count: out.length, sample: out.slice(0, 6) };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
