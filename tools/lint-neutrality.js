#!/usr/bin/env node
// lint-neutrality.js — keep the engine product-neutral, one file at a time.
//
// Counts "wpforms", "Sullie" and "#E27730" (case-insensitive) in every tracked
// text file, plus one when the file's PATH carries "wpforms" or "sullie", and
// compares each file with tools/neutrality-baseline.json (a ratchet):
//   · a file above its baseline count            → FAIL
//   · a file with hits that is not in the baseline → FAIL
//   · a file below its baseline                    → OK, printed as a hint to
//     tighten the baseline with --update
//
// Exempt (WPForms by definition): products/wpforms/**, every pack's
// snapshots/**, the dev-advocacy-video skill (the WPForms Rock 4 workflow),
// and this lint + its test (they must name the terms they hunt).
// Everything else that still names WPForms is in the baseline, so the number
// can only go down. Rename programme, Phase 4 (2026-09-23).
//
// Usage:
//   node tools/lint-neutrality.js                 # check against the baseline
//   node tools/lint-neutrality.js --update        # rewrite the baseline to today's counts
//   node tools/lint-neutrality.js --baseline <f>  # check against another baseline file
//   node tools/lint-neutrality.js --top 20        # list the files with the most hits

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE = path.join(__dirname, 'neutrality-baseline.json');
const TERMS = /wpforms|sullie|#e27730/gi;
const PATH_TERMS = /wpforms|sullie/i;
const EXEMPT = [
  /^products\/wpforms\//,
  /^products\/[^/]+\/snapshots\//,
  /^\.(claude|agents)\/skills\/dev-advocacy-video\//,
  /^tools\/neutrality-baseline\.json$/,
  // The lint and its test must name the terms they hunt.
  /^tools\/lint-neutrality\.js$/,
  /^tools\/__tests__\/lint-neutrality\.test\.js$/,
];
const BINARY = /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|m4a|wav|webm|woff2?|ttf|otf|eot|pdf|zip|phar|aep|lottie|glb)$/i;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function currentCounts() {
  const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    .split(/\r?\n/).filter(Boolean);
  const counts = {};
  for (const f of files) {
    if (EXEMPT.some((re) => re.test(f)) || BINARY.test(f)) continue;
    let text;
    try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; } // deleted in the working tree
    const n = (text.match(TERMS) || []).length + (PATH_TERMS.test(f) ? 1 : 0);
    if (n) counts[f] = n;
  }
  return counts;
}

function main() {
  const baselinePath = arg('--baseline') ? path.resolve(arg('--baseline')) : DEFAULT_BASELINE;
  const now = currentCounts();
  const total = Object.values(now).reduce((a, b) => a + b, 0);

  if (process.argv.includes('--update')) {
    // A file with uncommitted edits (maybe another session's) gets the higher
    // of its committed and working-tree counts, so the baseline never fails a
    // commit that simply lands what HEAD already had.
    const dirty = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    for (const f of dirty) {
      if (EXEMPT.some((re) => re.test(f)) || BINARY.test(f)) continue;
      let head = '';
      try { head = execFileSync('git', ['show', `HEAD:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (_) { continue; }
      const n = (head.match(TERMS) || []).length + (PATH_TERMS.test(f) ? 1 : 0);
      if (n > (now[f] || 0)) now[f] = n;
    }
    const sorted = Object.fromEntries(Object.keys(now).sort().map((k) => [k, now[k]]));
    fs.writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
    const sum = Object.values(sorted).reduce((a, b) => a + b, 0);
    console.log(`lint-neutrality: baseline written — ${Object.keys(sorted).length} files, ${sum} hits`);
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    console.error(`lint-neutrality: no baseline at ${path.relative(ROOT, baselinePath)} — run with --update once`);
    process.exit(2);
  }
  const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const worse = []; const better = [];
  for (const [f, n] of Object.entries(now)) {
    const b = base[f] || 0;
    if (n > b) worse.push(`${f}: ${b} → ${n}`);
    else if (n < b) better.push(`${f}: ${b} → ${n}`);
  }
  for (const f of Object.keys(base)) if (!(f in now)) better.push(`${f}: ${base[f]} → 0`);

  const top = Number(arg('--top') || 0);
  if (top) {
    console.log(`top ${top}:`);
    Object.entries(now).sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  ${f}`));
  }
  if (better.length) {
    console.log(`lint-neutrality: ${better.length} file(s) below the baseline — tighten it with --update:`);
    better.forEach((l) => console.log('  ↓ ' + l));
  }
  if (worse.length) {
    console.log(`✗ lint-neutrality: ${worse.length} file(s) name WPForms / Sullie / #E27730 more than the baseline allows.`);
    console.log('  Product-specific code and copy belong in products/<key>/ (brand.json, pack.json, film/, tools/).');
    worse.forEach((l) => console.log('  ✗ ' + l));
    process.exit(1);
  }
  console.log(`✓ lint-neutrality: ${Object.keys(now).length} files, ${total} hits, none above the baseline`);
}

main();
