// B1 logic probe: the two new capture.js page.evaluate passes (visibility
// bake + CSSOM materialization) exercised against a fixture page with a
// JS-hidden overlay and an insertRule-injected empty <style>.
const { chromium } = require('playwright');

const FIXTURE = `<!doctype html><html><head>
<style id="static">body { margin: 0; }</style>
<style id="cssom"></style>
</head><body>
<div id="overlay" class="picker">Picker overlay</div>
<div id="visible">Visible content</div>
<script>
  // JS-injected rule hiding the overlay — the ccs 1/ccs 2 combo: the hidden
  // state exists only in the CSSOM; a script-stripping serializer loses BOTH
  // the rule and the hiding.
  const s = document.getElementById('cssom').sheet;
  s.insertRule('#overlay { display: none; position: fixed; height: 30000px; }', 0);
</script>
</body></html>`;

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setContent(FIXTURE, { waitUntil: 'load' });

  // pass 1 — visibility bake (copied logic from capture.js)
  await p.evaluate(() => {
    for (const el of document.body.querySelectorAll('*')) {
      try {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' && el.style.display !== 'none') el.style.display = 'none';
        else if (cs.visibility === 'hidden' && el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      } catch {}
    }
  });
  // pass 2 — CSSOM materialization (copied logic from capture.js)
  const materialized = await p.evaluate(() => {
    let n = 0;
    for (const styleEl of document.querySelectorAll('style')) {
      try {
        const sheet = styleEl.sheet;
        if (sheet && sheet.cssRules.length && !styleEl.textContent.trim()) {
          styleEl.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          n++;
        }
      } catch {}
    }
    return n;
  });
  const R = await p.evaluate(() => ({
    overlayInline: document.getElementById('overlay').style.display,
    cssomText: document.getElementById('cssom').textContent.slice(0, 60),
    staticUntouched: document.getElementById('static').textContent.includes('margin'),
    visibleUntouched: document.getElementById('visible').style.display === '',
  }));
  await b.close();
  console.log(JSON.stringify({ materialized, ...R }, null, 2));
  const ok = materialized === 1 && R.overlayInline === 'none' && R.cssomText.includes('#overlay') && R.staticUntouched && R.visibleUntouched;
  console.log(ok ? 'B1-evals PASS' : 'B1-evals FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
