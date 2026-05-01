// Static check: read each baked snapshot's index.html directly off disk
// (NO runtime sanitize) and confirm no forbidden tokens remain. Also confirms
// sidebar (#adminmenu) is present and the top admin bar is absent.
const fs = require('fs');
const path = require('path');
const { checkText, ADMIN_SLUGS } = require('./_sanitize-forbidden.js');

const ROOT = path.join(__dirname, '..');
const PUB  = path.join(ROOT, 'snapshots-published');

function dirSize(p) {
  let total = 0;
  if (!fs.existsSync(p)) return 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    total += e.isDirectory() ? dirSize(f) : (e.isFile() ? fs.statSync(f).size : 0);
  }
  return total;
}
const fmt = b => b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(2)+' MB';

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ADMIN_SLUGS;
let fails = 0;
for (const slug of slugs) {
  const file = path.join(PUB, slug, 'index.html');
  if (!fs.existsSync(file)) {
    console.log(`FAIL ${slug.padEnd(34)} — missing ${path.relative(ROOT, file)}`);
    fails++; continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const { hits } = checkText(html, slug);
  const hasSidebar = /id="adminmenu"/.test(html);
  const hasTopBar  = /id="wpadminbar"|id="wp-toolbar"/.test(html);
  const hasBodyAB  = /<body[^>]*class="[^"]*\badmin-bar\b/.test(html);
  if (!hasSidebar) hits.push('missing #adminmenu');
  if (hasTopBar)   hits.push('still has top admin bar');
  if (hasBodyAB)   hits.push('body still has .admin-bar');
  if (hits.length) {
    fails++;
    console.log(`FAIL ${slug.padEnd(34)} — ${hits.join('; ')}`);
  } else {
    console.log(`PASS ${slug.padEnd(34)}`);
  }
}
console.log(`\n${fails === 0 ? '✓' : '✗'} ${slugs.length - fails}/${slugs.length} baked slugs clean (no runtime sanitize)`);
console.log(`Output folder: ${path.relative(ROOT, PUB)} = ${fmt(dirSize(PUB))}`);
process.exit(fails ? 1 : 0);
