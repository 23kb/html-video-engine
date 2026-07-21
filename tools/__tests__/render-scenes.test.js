#!/usr/bin/env node
// FIX-10 — scene-aware renderer (tools/render-scenes.js, promoted from
// capture/_tmp/export-sendgrid.mjs).
//
// The full re-export acceptance (SendGrid tutorial end-to-end, ffprobe
// duration/stream parity vs the hand-driver's output) records in REAL TIME
// (~4 min) — it ran once at fix time and is recorded in the plan annotation.
// This suite covers the cheap invariants:
//   1. --dry-run on the SendGrid video: 8 scenes discovered in order, kit
//      files excluded, narration + bgm + ffmpeg resolved, exit 0.
//   2. A non-scene video is rejected with the actionable message.
//   3. render-html.js usage advertises the new --path mode.
//
// Usage: node tools/__tests__/render-scenes.test.js

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function run(tool, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', tool), ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

section('Gate 1 — dry-run on the scene-per-file SendGrid video');
{
  const r = run('render-scenes.js', ['sendgrid-addon-tutorial', '--dry-run']);
  ok(r.code === 0, `exit 0 (got ${r.code})`);
  ok(/scenes \(8\): 01-intro, 02-postintro/.test(r.out), '8 scenes discovered in filename order');
  ok(!/_kit/.test(r.out), '_-prefixed kit files excluded from the scene list');
  ok(/narration dir: ✓/.test(r.out), 'narration dir resolved');
  ok(/ffmpeg: ✓/.test(r.out), 'ffmpeg on PATH');
}

section('Gate 2 — non-scene video rejected');
{
  const r = run('render-scenes.js', ['klaviyo-bridge-2', '--dry-run']);
  ok(r.code === 3, `exit 3 (got ${r.code})`);
  ok(/scenes\/ not found — this tool is for scene-per-file videos/.test(r.out), 'actionable message names the architecture');
}

section('Gate 3 — render-html.js --path mode advertised');
{
  const r = run('render-html.js', []);
  ok(/--path videos\/<slug>\/scenes\/<file>\.html/.test(r.out), 'usage shows --path scene-render form');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
