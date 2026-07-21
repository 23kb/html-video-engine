#!/usr/bin/env node
// FIX-12 — outline visibility annotation.
//
// Hidden nodes (display:none / visibility:hidden / zero-rect) used to be
// listed as plausible beat targets — #wp-auth-check ("Session expired")
// shipped in two runs' fresh outlines. The generator now flags them
// _(hidden)_. This test regenerates one snapshot that really carries
// #wp-auth-check and asserts the flag lands only where it should.
//
// Usage: node tools/__tests__/outline-visibility.test.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SLUG = 'admin-addons-sendgrid';
const OUTLINE = path.join(ROOT, 'snapshots', SLUG, 'outline.md');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}

console.log(`Regenerating ${SLUG} outline (headless)…`);
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'generate-snapshot-outline.js'), SLUG], {
  cwd: ROOT, stdio: 'ignore', timeout: 120000,
});

const md = fs.readFileSync(OUTLINE, 'utf8');
const lines = md.split(/\r?\n/);
const bullet = (sel) => lines.find((l) => l.includes('`' + sel + '`'));

const authCheck = bullet('#wp-auth-check');
ok(Boolean(authCheck), '#wp-auth-check row present in the outline');
ok(authCheck && / _\(hidden\)_\s*$/.test(authCheck), '#wp-auth-check row flagged _(hidden)_');

const visible = bullet('.wpforms-addons-header');
ok(Boolean(visible), 'known-visible control (.wpforms-addons-header) present');
ok(visible && !/_\(hidden\)_/.test(visible), 'known-visible control NOT flagged');

const bullets = lines.filter((l) => /^- `/.test(l));
const flagged = bullets.filter((l) => /_\(hidden\)_/.test(l));
ok(flagged.length > 0 && flagged.length < bullets.length / 2,
  `flag is selective (${flagged.length}/${bullets.length} targets hidden)`);

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
