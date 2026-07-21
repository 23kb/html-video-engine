#!/usr/bin/env node
// FIX-8 — TTS health check in tts/generate.js.
//
// Gates:
//   1. VOICEBOX_URL at a dead port + --no-launch: exits non-zero in <5s with
//      the actionable start command (was: 17 × bare "✗ fetch failed").
//      (--no-launch per the plan: never auto-launch the real app from tests.)
//   2. Skip-if-down: with the real Voicebox up, a video whose mp3 is newer
//      than its txt renders nothing (skip path) and exits 0 — proves the
//      health gate doesn't block healthy runs. Uses a temp videos/_tts_test.
//
// Usage: node tools/__tests__/tts-healthcheck.test.js

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP_VIDEO = path.join(ROOT, 'videos', '_tts_test');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function runGen(args, env) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tts', 'generate.js'), ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000, env: { ...process.env, ...env },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), secs: (Date.now() - t0) / 1000 };
}

function voiceboxUp() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:17493/', (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  // temp video with one narration pair, mp3 newer than txt (skip path)
  fs.mkdirSync(path.join(TMP_VIDEO, 'narration'), { recursive: true });
  fs.writeFileSync(path.join(TMP_VIDEO, 'narration', 'probe.txt'), 'Health check probe.');
  fs.writeFileSync(path.join(TMP_VIDEO, 'narration', 'probe.mp3'), Buffer.from([0xff, 0xfb, 0x90, 0x00]));

  try {
    section('Gate 1 — dead port fails fast with the start command');
    {
      const r = runGen(['--video', '_tts_test', '--no-launch'], { VOICEBOX_URL: 'http://127.0.0.1:59999' });
      ok(r.code !== 0, `exit non-zero (got ${r.code})`);
      ok(r.secs < 5, `fails in <5s (${r.secs.toFixed(1)}s)`);
      ok(/shell:AppsFolder\\+sh\.voicebox\.app/.test(r.out), 'message contains the Start-Process command');
      ok(!/fetch failed/.test(r.out), 'no bare per-clip "fetch failed" spam');
    }

    section('Gate 2 — healthy run passes the gate (skips if Voicebox is down)');
    if (await voiceboxUp()) {
      const r = runGen(['--video', '_tts_test'], {});
      ok(r.code === 0, `exit 0 (got ${r.code})`);
      ok(/1 skipped|skipped/.test(r.out), 'up-to-date mp3 skipped, nothing rendered');
    } else {
      console.log('  - SKIP: Voicebox not running on :17493');
    }
  } finally {
    fs.rmSync(TMP_VIDEO, { recursive: true, force: true });
  }

  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
