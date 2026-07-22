#!/usr/bin/env node
// P0-2 (tutorial-system-fixes 2026-07-22) — trim-builder-markup over-trim guard.
//
// The entry-automation build lost the Add New Connection button
// (.wpforms-builder-inner-provider-connection-add) to a silent trim. Gates:
//   1. A chrome removal (#wpforms-builder-help) whose chunk contains
//      load-bearing addon markup is SKIPPED loudly; the markup survives.
//   2. Clean chrome (#wpfooter) is still removed, with its root signature
//      printed (loud output).
//   3. An off-canvas field-option panel containing addon markup is kept
//      (guard); a clean off-canvas panel is still stripped, by id.
//   4. Fields-only whole-panel drops BYPASS the guard: #wpforms-panel-settings
//      is removed even when it contains addon markup (inactive panel = dead
//      weight by design).
//
// Synthetic snapshots written under snapshots/ (the tool hardcodes that
// root), removed in finally. zz- slugs are never index-registered.
//
// Usage: node tools/__tests__/trim-guard.test.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAP = path.join(ROOT, 'snapshots');
const GUARD_SLUG = 'builder-zzguard-test';
const FIELDS_SLUG = 'builder-fields-zzguard-test';

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function writeSnapshot(slug, body) {
  const dir = path.join(SNAP, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'),
    `<!doctype html>\n<html><head><meta charset="utf-8"><title>${slug}</title></head><body>${body}</body></html>`, 'utf8');
}

function trim(slug) {
  return execFileSync(process.execPath, [path.join(ROOT, 'tools', 'trim-builder-markup.js'), '--slug', slug], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000,
  });
}

const GUARD_BODY = `
<div id="wpforms-builder-help">
  <p>help chrome</p>
  <div class="wpforms-builder-entity-connection-add">Add New Connection</div>
</div>
<div id="wpfooter"><p>plain footer chrome</p></div>
<div class="wpforms-field one two" data-field-id="1" data-field-type="text">canvas field</div>
<div id="wpforms-field-option-1" class="wpforms-field-option"><p>active panel</p></div>
<div id="wpforms-field-option-2" class="wpforms-field-option"><p>clean off-canvas panel</p></div>
<div id="wpforms-field-option-3" class="wpforms-field-option">
  <div class="wpforms-entry-automation-task-type-options">addon markup inside an off-canvas panel</div>
</div>`;

const FIELDS_BODY = `
<div id="wpforms-panel-settings">
  <div class="wpforms-entry-automation-task-type-options">addon markup inside the INACTIVE settings panel</div>
</div>
<div class="wpforms-field" data-field-id="1" data-field-type="text">canvas field</div>
<div id="wpforms-field-option-1" class="wpforms-field-option"><p>active panel</p></div>`;

try {
  writeSnapshot(GUARD_SLUG, GUARD_BODY);
  writeSnapshot(FIELDS_SLUG, FIELDS_BODY);

  section('Gates 1-3 — guarded chrome + option-panel removals');
  const out1 = trim(GUARD_SLUG);
  const html1 = fs.readFileSync(path.join(SNAP, GUARD_SLUG, 'index.html'), 'utf8');
  ok(html1.includes('wpforms-builder-entity-connection-add'), 'load-bearing connection-add markup SURVIVES the help-panel removal');
  ok(html1.includes('id="wpforms-builder-help"'), 'the guarded #wpforms-builder-help removal was skipped entirely');
  ok(/wpforms-builder-help.*SKIPPED \(over-trim guard\)|SKIPPED \(over-trim guard\)/s.test(out1), 'guard skip is reported loudly');
  ok(!html1.includes('id="wpfooter"'), 'clean #wpfooter still removed');
  ok(/removed root: <div[^>]*id="wpfooter"/.test(out1), 'removed-root signature printed for #wpfooter (loud output)');
  ok(html1.includes('id="wpforms-field-option-1"'), 'canvas field panel kept');
  ok(!html1.includes('id="wpforms-field-option-2"'), 'clean off-canvas panel stripped');
  ok(html1.includes('wpforms-entry-automation-task-type-options'), 'off-canvas panel with addon markup KEPT (guard)');
  ok(/panel 3 SKIPPED \(load-bearing: wpforms-entry-automation\)/.test(out1), 'panel guard skip named in output');
  ok(/stripped \[2\]/.test(out1), 'stripped panel ids listed in output');

  section('Gate 4 — fields-only whole-panel drop bypasses the guard');
  const out2 = trim(FIELDS_SLUG);
  const html2 = fs.readFileSync(path.join(SNAP, FIELDS_SLUG, 'index.html'), 'utf8');
  ok(!html2.includes('id="wpforms-panel-settings"'), '#wpforms-panel-settings removed on a fields-only slug');
  ok(!html2.includes('wpforms-entry-automation-task-type-options'), 'addon markup inside the inactive panel removed with it (deliberate)');
  ok(/removed root: <div[^>]*id="wpforms-panel-settings"/.test(out2), 'panel removal signature printed');
} finally {
  fs.rmSync(path.join(SNAP, GUARD_SLUG), { recursive: true, force: true });
  fs.rmSync(path.join(SNAP, FIELDS_SLUG), { recursive: true, force: true });
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
