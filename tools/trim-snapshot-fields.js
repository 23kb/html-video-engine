#!/usr/bin/env node
// Post-capture trim — strips unwanted .wpforms-field elements from a static
// snapshot. Runs Playwright on the file:// URL of the captured HTML. Since
// the snapshot has no JS (scripts stripped during capture), DOM mutations
// stick reliably (unlike live-site evals which fight the builder's re-render).
//
// Usage:
//   node tools/trim-snapshot-fields.js <snapshot-slug> [<keep-ids>] [--label3=<txt>] [--label4=<txt>] [--form-name=<txt>]
//   node tools/trim-snapshot-fields.js builder-smart-edit-base 1,2,3,4 --label3=Subject --label4=Message --form-name="Contact Form"

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args.flags[m[1]] = m[2];
    else args.positional.push(a);
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const slug    = args.positional[0];
  const keepStr = args.positional[1] || '1,2,3,4';
  if (!slug) { console.error('usage: trim-snapshot-fields.js <slug> [keep-ids]'); process.exit(1); }
  const keep = keepStr.split(',').map(s => parseInt(s.trim(), 10));

  const snapshotPath = path.join(REPO_ROOT, 'snapshots', slug, 'index.html');
  if (!fs.existsSync(snapshotPath)) { console.error('not found:', snapshotPath); process.exit(1); }

  // Relabels apply ONLY when the flag is explicitly passed — a bare
  // field-trim (e.g. from tools/post-capture.js) must not rename anything.
  const label3   = args.flags.label3   || null;
  const label4   = args.flags.label4   || null;
  const formName = args.flags['form-name'] || null;

  console.log(`trimming ${slug} → keep [${keep.join(', ')}]` +
    (label3 ? ` · label3="${label3}"` : '') +
    (label4 ? ` · label4="${label4}"` : '') +
    (formName ? ` · form="${formName}"` : ''));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page    = await context.newPage();

  await page.goto('file://' + snapshotPath.replace(/\\/g, '/'), { waitUntil: 'load' });

  const stats = await page.evaluate(({ keep, label3, label4, formName }) => {
    const keepSet = new Set(keep);
    const before = document.querySelectorAll('.wpforms-field[data-field-id]').length;
    let removed = 0;
    document.querySelectorAll('.wpforms-field[data-field-id]').forEach((f) => {
      const id = parseInt(f.getAttribute('data-field-id'), 10);
      if (!keepSet.has(id)) { f.remove(); removed++; }
    });
    const after = document.querySelectorAll('.wpforms-field[data-field-id]').length;

    // Relabel field 3 (text) → label3, field 4 (textarea) → label4
    if (label3) {
      const f3 = document.querySelector('#wpforms-field-3 .label-title .text');
      if (f3) f3.textContent = label3;
    }
    if (label4) {
      const f4 = document.querySelector('#wpforms-field-4 .label-title .text');
      if (f4) f4.textContent = label4;
    }

    // Rename the form
    if (formName) {
      document.querySelectorAll('.wpforms-form-name, .wpforms-center-form-name').forEach((el) => {
        el.textContent = formName;
      });
    }

    return { before, removed, after };
  }, { keep, label3, label4, formName });

  const rewritten = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(snapshotPath, '<!doctype html>\n' + rewritten);

  await browser.close();
  console.log(`  ✓ before: ${stats.before} → removed: ${stats.removed} → after: ${stats.after}`);
})().catch(e => { console.error(e); process.exit(1); });
