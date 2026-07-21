#!/usr/bin/env node
// FIX-11 — tools/capture-saas.js (post-download half of the SaaS recipe).
//
// A fake CDN serves a cross-origin stylesheet (with a font + an icon url())
// exactly like SendGrid's tiara.css; a fixture "downloaded" HTML references
// it and carries a fake SendGrid API key. The tool must: inline the
// stylesheet, data-URI its assets, redact the key, keep UTF-8 intact, and
// write meta.json — all into a WP_SNAPSHOT_ROOT sandbox.
//
// NB: async spawn — the fake CDN lives in this process (see the FIX-5 note).
//
// Usage: node tools/__tests__/capture-saas.test.js

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4981;

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function run(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tools', 'capture-saas.js'), ...args], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { try { child.kill(); } catch (_) {} }, 60000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}

const CSS = `.tiara-btn { background: url(icons/star.svg) no-repeat; }
@font-face { font-family: Colfax; src: url(fonts/colfax.woff2) format('woff2'); }`;
const ASSETS = {
  '/tiara.css': { body: CSS, type: 'text/css' },
  '/icons/star.svg': { body: '<svg xmlns="http://www.w3.org/2000/svg"/>', type: 'image/svg+xml' },
  '/fonts/colfax.woff2': { body: Buffer.from([0x77, 0x4f, 0x46, 0x32]), type: 'font/woff2' },
};

const server = http.createServer((req, res) => {
  const a = ASSETS[req.url.split('?')[0]];
  if (!a) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': a.type });
  res.end(a.body);
});

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-saas-'));
  const download = path.join(sandbox, 'sendgrid-page.html');
  fs.writeFileSync(download, `<!doctype html>
<html><head><meta charset="utf-8"><title>API Keys | SendGrid</title>
<link rel="stylesheet" href="http://localhost:${PORT}/tiara.css">
</head><body>
<h1>API Keys — manage access</h1>
<input value="WPForms Key">
<code>SG.abcdefghijklmnopqrstuvwxyz012345</code>
</body></html>`, 'utf8');

  section('Run capture-saas.js on the fixture download');
  const r = await run(['_saas_test', '--from-download', download, '--no-post-capture'], { WP_SNAPSHOT_ROOT: sandbox });
  ok(r.code === 0, `exit 0 (got ${r.code})`);

  const outFile = path.join(sandbox, '_saas_test', 'index.html');
  ok(fs.existsSync(outFile), 'snapshot index.html written');
  const html = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  ok(!/<link\b[^>]*rel=["']stylesheet["'][^>]*https?:\/\//.test(html), 'no cross-origin stylesheet <link> remains');
  ok(new RegExp(`<style data-origin="http://localhost:${PORT}/tiara.css"`).test(html), 'stylesheet inlined as <style data-origin>');
  ok(/data:font\/woff2;base64,/.test(html), 'font inlined as a data URI');
  ok(/data:image\/svg\+xml;base64,/.test(html), 'icon inlined as a data URI');
  ok(!/SG\.abcdefghijklmnopqrstuvwxyz012345/.test(html) && /REDACTED_KEY/.test(html), 'SendGrid key redacted');
  ok(html.includes('—'), 'em-dash intact (utf8)');
  const meta = JSON.parse(fs.readFileSync(path.join(sandbox, '_saas_test', 'meta.json'), 'utf8'));
  ok(/capture-saas/.test(meta.capturedVia) && meta.redactions >= 1, `meta.json records the recipe + ${meta.redactions} redaction(s)`);

  section('Missing download is actionable');
  const r2 = await run(['_saas_test2', '--from-download', path.join(sandbox, 'nope.html')], { WP_SNAPSHOT_ROOT: sandbox });
  ok(r2.code === 1, `exit 1 (got ${r2.code})`);
  ok(/serializer snippet|capture-library\.md/.test(r2.out), 'error points at the serializer snippet doc');

  fs.rmSync(sandbox, { recursive: true, force: true });
  server.close();
  console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); server.close(); process.exit(1); });
