#!/usr/bin/env node
// FIX-3 — the TOTAL-constant end-check pattern must stay dead.
//
// Bug class: end bookkeeping (tl.pause() / window.__done) guarded by a
// comparison against a hand-summed TOTAL constant. If TOTAL drifts above the
// real tl.duration() the guard is unreachable → __done never fires →
// render-singlehtml-audio.js hangs. The core editorial clone target carried
// it; an ad cloned from it shipped the bug live (TOTAL 37.0 vs real 36.95).
// End handling must use onComplete.
//
// Usage: node tools/__tests__/no-total-endcheck.test.js

const fs = require('fs');
const path = require('path');
const { findTotalEndchecks, LEGACY_ALLOWLIST } = require('../detect-total-endcheck.js');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

// Frozen legacy set lives with the detector (shared with validate-singlehtml.js).
const GRANDFATHERED = LEGACY_ALLOWLIST;

// ── Detector unit checks ─────────────────────────────────────────────────
section('Detector unit checks');
{
  const bad1 = `
tl.eventCallback('onUpdate', () => {
  const t = tl.time();
  if (t >= TOTAL) {
    window.__done = true;
  }
});`;
  const r1 = findTotalEndchecks(bad1);
  ok(r1.length === 1 && r1[0].kind === 'done-under-total', 'flags __done assigned under a TOTAL guard');

  const bad2 = `
if (t > TOTAL) {
  tl.pause();
  playing = false;
}`;
  const r2 = findTotalEndchecks(bad2);
  ok(r2.length === 1 && r2[0].kind === 'pause-under-total', 'flags tl.pause() under a TOTAL guard');

  const good1 = `
tl.eventCallback('onComplete', () => {
  playing = false;
  window.__done = true;
});`;
  ok(findTotalEndchecks(good1).length === 0, 'onComplete end bookkeeping is clean');

  const good2 = `else { if (tl.time() >= TOTAL) tl.time(0); tl.play(); playing = true; }`;
  ok(findTotalEndchecks(good2).length === 0, 'restart-at-end shape (time(0) + play) is not flagged');

  const allowed = `
// lint-allow: total-endcheck — deliberate exception for X
if (t > TOTAL) {
  tl.pause();
}`;
  ok(findTotalEndchecks(allowed).length === 0, 'lint-allow: total-endcheck escape is honored');
}

// ── Repo scan ────────────────────────────────────────────────────────────
section('Repo scan — videos/*/index.html');
const videosDir = path.join(ROOT, 'videos');
const slugs = fs.readdirSync(videosDir).filter((s) => {
  if (s.startsWith('_')) return false;
  try { return fs.statSync(path.join(videosDir, s, 'index.html')).isFile(); }
  catch (_) { return false; }
});

let offenders = [];
for (const slug of slugs) {
  const src = fs.readFileSync(path.join(videosDir, slug, 'index.html'), 'utf8');
  const findings = findTotalEndchecks(src);
  if (findings.length && !GRANDFATHERED.has(slug)) {
    offenders.push({ slug, findings });
  }
}
ok(offenders.length === 0, `no TOTAL end-checks outside the grandfathered set (${slugs.length} videos scanned)`);
for (const o of offenders) {
  for (const f of o.findings) console.log(`        ${o.slug}:${f.line} ${f.kind} — ${f.excerpt}`);
}

// ── Golden clone target (slug from tools/local-films.local.json; skipped without it) ──
const GOLDEN = require('../lib/local-films.js').endcheckGolden;
if (GOLDEN) {
  section(`${GOLDEN} golden — patched end handling`);
  const src = fs.readFileSync(path.join(videosDir, GOLDEN, 'index.html'), 'utf8');
  ok(findTotalEndchecks(src).length === 0, 'golden has zero TOTAL end-checks');
  ok(/eventCallback\(\s*['"]onComplete['"]/.test(src), 'golden ends via tl.eventCallback(onComplete)');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
