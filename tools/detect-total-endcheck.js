#!/usr/bin/env node
// Detects the TOTAL-constant end-check bug class in single-HTML videos:
// end bookkeeping (tl.pause() / window.__done) guarded by a comparison against
// a hand-summed TOTAL constant. When TOTAL drifts above the real
// tl.duration(), the guard becomes unreachable — the video never "ends" and
// tools/render-singlehtml-audio.js hangs waiting on __done. End bookkeeping
// must ride tl.eventCallback('onComplete', ...) instead. (FIX-3; the bug
// shipped in the form-analytics-ad clone as 37.0 vs a real 36.95.)
//
// Escape hatch: put `lint-allow: total-endcheck` on the comparison line or
// the line above it to mark a deliberate exception.
//
// Module: findTotalEndchecks(source) -> [{ line, kind, excerpt }]
//   kind 'done-under-total'  — __done assigned inside a TOTAL-comparison guard
//   kind 'pause-under-total' — timeline paused inside a TOTAL-comparison guard
// CLI: node tools/detect-total-endcheck.js <file...>   (exit 1 if any finding)

const COMPARE_RE = /[><]=?\s*TOTAL\b/;
const ALLOW_RE = /lint-allow:\s*total-endcheck/;
const DONE_RE = /__done\s*=/;
const PAUSE_RE = /\.pause\s*\(\s*\)/;

// The statement guarded by the TOTAL comparison on line i: if the line opens
// a brace, span lines until that brace closes (cap 20); else the line itself.
function guardBody(lines, i) {
  const first = lines[i];
  const braceAt = first.indexOf('{', first.search(COMPARE_RE));
  if (braceAt === -1) return first;
  let depth = 0;
  const out = [];
  for (let j = i; j < lines.length && j < i + 20; j++) {
    const text = j === i ? first.slice(braceAt) : lines[j];
    out.push(j === i ? first : lines[j]);
    for (const ch of text) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0 && out.length) return out.join('\n');
    }
  }
  return out.join('\n');
}

function findTotalEndchecks(source) {
  const lines = source.split(/\r?\n/);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (!COMPARE_RE.test(lines[i])) continue;
    if (ALLOW_RE.test(lines[i]) || (i > 0 && ALLOW_RE.test(lines[i - 1]))) continue;
    const body = guardBody(lines, i);
    if (DONE_RE.test(body)) {
      findings.push({ line: i + 1, kind: 'done-under-total', excerpt: lines[i].trim() });
    } else if (PAUSE_RE.test(body)) {
      findings.push({ line: i + 1, kind: 'pause-under-total', excerpt: lines[i].trim() });
    }
  }
  return findings;
}

// Pre-FIX-3 videos whose TOTAL end-check only drives their local scrubber /
// play-button chrome (no __done instrumentation, not clone targets). Frozen:
// do NOT add entries — new videos must use onComplete. Shared by
// no-total-endcheck.test.js and validate-singlehtml.js. The slugs live in the
// gitignored tools/local-films.local.json; without it the list is empty.
const LEGACY_ALLOWLIST = new Set(require('./lib/local-films.js').legacyEndcheckAllowlist || []);

module.exports = { findTotalEndchecks, LEGACY_ALLOWLIST };

if (require.main === module) {
  const fs = require('fs');
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node tools/detect-total-endcheck.js <file...>');
    process.exit(2);
  }
  let bad = 0;
  for (const f of files) {
    const findings = findTotalEndchecks(fs.readFileSync(f, 'utf8'));
    for (const x of findings) {
      console.log(`${f}:${x.line} ${x.kind} — ${x.excerpt}`);
      bad++;
    }
  }
  if (!bad) console.log('clean — no TOTAL end-checks found');
  process.exit(bad ? 1 : 0);
}
