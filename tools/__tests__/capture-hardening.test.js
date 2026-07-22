#!/usr/bin/env node
// FIX-5 — capture.js hardening: fail garbage, don't abort the batch, UTF-8.
//
// Integration test against a fake WP server (per the plan spec): a login
// page capture.js can drive, one healthy admin page (em-dash content), one
// wp_die lookalike, one bounced-to-login page. Runs the real CLI with a
// 3-variant plan into a WP_SNAPSHOT_ROOT sandbox and asserts:
//   · wp_die variant: FAILED, nothing written
//   · login-bounce variant: FAILED, nothing written
//   · good variant: still captured (batch not aborted), em-dash survives
//     byte-exact, <meta charset> present
//   · overall exit code non-zero with a ✓/✗ summary table
//
// Usage: node tools/__tests__/capture-hardening.test.js

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// NB: spawn (async), never spawnSync — the fake WP server lives in THIS
// process; a sync child-wait freezes the event loop and the child's
// page.goto times out against a server that can no longer respond.
function run(cmd, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { try { child.kill(); } catch (_) {} }, opts.timeout || 180000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ status: code, out }); });
  });
}

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4977;

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

const PAGES = {
  '/wp-login.php': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Log In</title></head>
    <body><form action="/wp-admin/" method="get">
      <input type="text" id="user_login"><input type="password" id="user_pass">
      <button type="submit" id="wp-submit">Log In</button>
    </form></body></html>`,
  '/wp-admin/': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard</title></head>
    <body><h1>Dashboard</h1></body></html>`,
  '/wp-admin/good.php': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Import Entries ‹ Sullie's Bakery</title></head>
    <body><div id="good-marker">Chunked import — no timeouts, even for thousands of entries.</div></body></html>`,
  '/wp-admin/bad.php': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WordPress › Error</title></head>
    <body><p>There has been a critical error on this website.</p></body></html>`,
  '/wp-admin/expired.php': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Log In ‹ Sullie's Bakery — WordPress</title></head>
    <body><p>Session expired.</p></body></html>`,
  // Property-bake gate: server-rendered defaults that the capture steps
  // override via DOM properties only (input.value = …, .checked = …). The
  // serialized snapshot must carry the JS-driven state, not these defaults.
  '/wp-admin/form.php': `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Task Settings ‹ Sullie's Bakery</title></head>
    <body>
      <input type="text" id="task-name" value="Default Task">
      <input type="radio" name="dest" id="dest-email" value="email" checked>
      <input type="radio" name="dest" id="dest-gdrive" value="gdrive">
      <select id="account"><option value="a1" selected>Account One</option><option value="a2">Account Two</option></select>
      <textarea id="notes">server default notes</textarea>
      <input type="password" id="secret" value="">
    </body></html>`,
};

const server = http.createServer((req, res) => {
  const clean = req.url.split('?')[0];
  const page = PAGES[clean];
  if (!page) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page);
});

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-hardening-'));
  const plan = {
    variants: [
      { slug: '_cap_bad', targetPath: '/wp-admin/bad.php', waitFor: '#never-there' },
      { slug: '_cap_expired', targetPath: '/wp-admin/expired.php' },
      { slug: '_cap_good', targetPath: '/wp-admin/good.php', waitFor: '#good-marker' },
      {
        slug: '_cap_baked',
        targetPath: '/wp-admin/form.php',
        steps: [{
          eval: `
            document.getElementById('task-name').value = 'Weekly Export';
            document.getElementById('dest-gdrive').checked = true;
            document.getElementById('account').value = 'a2';
            document.getElementById('account').dispatchEvent(new Event('change', { bubbles: true }));
            document.getElementById('notes').value = 'typed during capture';
            document.getElementById('secret').value = 'hunter2';
          `,
          settle: 100,
        }],
        waitFor: '#task-name',
      },
    ],
  };
  const planPath = path.join(sandbox, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan));

  section('Run capture.js against the fake WP server (3-variant plan)');
  const r = await run(process.execPath, [path.join(ROOT, 'capture', 'capture.js'), '--variants', planPath], {
    cwd: ROOT,
    timeout: 180000,
    env: {
      ...process.env,
      WP_URL: `http://localhost:${PORT}`,
      WP_USER: 'x',
      WP_PASS: 'x',
      WP_SNAPSHOT_ROOT: sandbox,
    },
  });
  const out = r.out;

  ok(r.status !== 0 && r.status !== null, `exit non-zero when any variant fails (exit ${r.status})`);
  ok(/✗ _cap_bad — .*error page detected/.test(out), 'wp_die variant marked FAILED with the error-page reason');
  ok(/✗ _cap_expired — .*error page detected/.test(out), 'bounced-to-login variant marked FAILED');
  ok(/✓ _cap_good/.test(out), 'good variant still captured (batch not aborted)');
  ok(/── Capture summary/.test(out), 'per-variant summary table printed');

  section('Filesystem effects');
  ok(!fs.existsSync(path.join(sandbox, '_cap_bad', 'index.html')), 'wp_die variant wrote no index.html');
  ok(!fs.existsSync(path.join(sandbox, '_cap_expired', 'index.html')), 'login-bounce variant wrote no index.html');
  const goodFile = path.join(sandbox, '_cap_good', 'index.html');
  ok(fs.existsSync(goodFile), 'good variant wrote its snapshot');
  if (fs.existsSync(goodFile)) {
    const html = fs.readFileSync(goodFile, 'utf8');
    ok(html.includes('—'), 'em-dash survives the write byte-exact (utf8)');
    ok(/<meta[^>]+charset/i.test(html), '<meta charset> present in written snapshot');
    ok(!html.includes('�'), 'no replacement characters (mojibake) in written snapshot');
  } else {
    checks += 3; failures += 3;
  }

  section('Property bake — JS-driven state survives serialization');
  const bakedFile = path.join(sandbox, '_cap_baked', 'index.html');
  ok(fs.existsSync(bakedFile), 'baked variant wrote its snapshot');
  if (fs.existsSync(bakedFile)) {
    const html = fs.readFileSync(bakedFile, 'utf8');
    ok(/id="task-name"[^>]*value="Weekly Export"/.test(html), 'typed input value baked into value attribute');
    ok(/id="dest-gdrive"[^>]*checked/.test(html), 'JS-checked radio serialized checked');
    ok(!/id="dest-email"[^>]*checked/.test(html), 'previously-checked radio lost its checked attribute');
    ok(/value="a2"[^>]*selected|selected[^>]*value="a2"/.test(html.replace(/\n/g, ' ')), 'picked option carries selected attribute');
    ok(!/value="a1"[^>]*selected/.test(html), 'default option no longer selected');
    ok(/typed during capture/.test(html), 'textarea value baked into textContent');
    ok(!/hunter2/.test(html), 'password input value NOT baked (secret hygiene)');
  } else {
    checks += 7; failures += 7;
  }

  fs.rmSync(sandbox, { recursive: true, force: true });
  server.close();

  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); server.close(); process.exit(1); });
