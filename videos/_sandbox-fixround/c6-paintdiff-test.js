// C6 paint-diff test on a SCRATCH COPY (checker rule: never run mutating
// steps against a real snapshot). Creates snapshots/_gates-scratch, tests
// the match path (self-screenshot => diff ~0) and the mismatch path
// (foreign screenshot => WARN), checks --write-outline, then deletes it.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..', '..');
const SNAP = path.join(REPO, 'products', 'wpforms', 'snapshots');
const SCRATCH = path.join(SNAP, '_gates-scratch');

async function shot(url, viewport, out) {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport });
  await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: out });
  await b.close();
}

(async () => {
  // scratch copy
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  fs.mkdirSync(SCRATCH, { recursive: true });
  for (const f of ['index.html', 'meta.json', 'outline.md']) {
    fs.copyFileSync(path.join(SNAP, 'builder-settings-anti_spam', f), path.join(SCRATCH, f));
  }
  const file = 'file://' + path.join(SCRATCH, 'index.html').replace(/\\/g, '/');

  // 1) MATCH path: live-reference = screenshot of the frozen page itself
  await shot(file, { width: 1440, height: 900 }, path.join(SCRATCH, 'live-reference.png'));
  let out = execFileSync(process.execPath, [path.join(REPO, 'tools', 'capture-gates.js'), '_gates-scratch', '--write-outline'], { encoding: 'utf8' });
  const matchOk = /paint diff ok/.test(out);
  console.log('[match path]', matchOk ? 'PASS' : 'FAIL', (out.match(/paint (diff|sides)[^\n]*/g) || []).join(' | '));
  const outline = fs.readFileSync(path.join(SCRATCH, 'outline.md'), 'utf8');
  console.log('[write-outline]', outline.includes('capture-gates:start') ? 'marker section present' : 'MISSING');

  // 2) MISMATCH path: live-reference = a DIFFERENT page's screenshot
  const other = 'file://' + path.join(SNAP, 'frontend-contact-clean', 'index.html').replace(/\\/g, '/');
  await shot(other, { width: 1440, height: 900 }, path.join(SCRATCH, 'live-reference.png'));
  out = execFileSync(process.execPath, [path.join(REPO, 'tools', 'capture-gates.js'), '_gates-scratch'], { encoding: 'utf8' });
  const mismatchWarned = /WARN paint diff: mean abs diff/.test(out);
  console.log('[mismatch path]', mismatchWarned ? 'PASS (warned)' : 'FAIL', (out.match(/paint (diff|sides)[^\n]*/g) || []).join(' | '));

  // cleanup
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  console.log('[cleanup] scratch removed:', !fs.existsSync(SCRATCH));
  process.exit(matchOk && mismatchWarned ? 0 : 1);
})().catch(e => { console.error(e); try { fs.rmSync(SCRATCH, { recursive: true, force: true }); } catch (_) {} process.exit(2); });
