#!/usr/bin/env node
// serve.mjs -- serve a snapshots root over plain HTTP so a snapshot can be mounted in an iframe.
//
// Snapshots are opened through http://, never file://: file:// iframes are cross-origin to each
// other in Chromium, so contentDocument is null and nothing can be puppeted. The same server also
// exposes the skill's mount-test.html under /__skill/ so it shares the origin with the snapshot.
//
// Usage:
//   node scripts/serve.mjs [--root <snapshots root>] [--port 0] [--open]
//
//   --root   folder that holds <slug>/index.html (default ./snapshots)
//   --port   fixed port; 0 (default) lets the OS pick one
//   --open   launch the default browser on the mount-test page
//
// Prints the two URLs, then stays up until Ctrl+C.
//
// Error-hook injection: an HTML request carrying `?__hook=1` gets a small <script> prepended to
// its <head> as it is served. The mount test asks for that URL so errors thrown WHILE the snapshot
// parses (a registration that throws, a 404 font) reach its HUD -- a listener attached from the
// parent lands on the discarded about:blank window and a poll arms after the first inline script
// has already run. Requests without the marker are served byte-for-byte; nothing on disk changes.
//
// The same hook intercepts navigation: a fossil keeps its live hrefs, so a click on an <a> (or a
// submit) navigates the iframe to the live site, which then refuses to be framed (X-Frame-Options)
// and the parent loses contentDocument. Capture-phase listeners preventDefault() anchor clicks and
// form submits and report them to the HUD as "nav intercepted". A film must do the same: the
// interactivity kit or the film's own handler owns what a click means.

import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, usage, startStaticServer } from './lib.mjs';

const HELP = `usage: node scripts/serve.mjs [--root <snapshots root>] [--port 0] [--open]`;

// Runs first in the snapshot's own realm. Buffers into window.__mountErrors and forwards to the
// parent's __mountTestOnError when one exists (same origin, so the call is allowed).
const HOOK = '<script data-mount-hook>(function(){var w=window;if(w.__mountHook)return;w.__mountHook=true;var buf=w.__mountErrors=[];'
  + 'function push(m){buf.push(m);try{if(w.parent!==w&&typeof w.parent.__mountTestOnError==="function")w.parent.__mountTestOnError(m);}catch(e){}}'
  // capture-phase listener: resource load failures never reach onerror
  + 'w.addEventListener("error",function(e){var t=e.target;if(t&&t!==w&&t.tagName)push("resource failed: <"+t.tagName.toLowerCase()+"> "+(t.src||t.href||""));},true);'
  + 'w.onerror=function(msg,src,line){push(String(msg)+(src?" @ "+src+":"+line:""));};'
  + 'w.addEventListener("unhandledrejection",function(e){push("unhandled rejection: "+(e.reason&&e.reason.message||e.reason));});'
  + 'var ce=w.console&&w.console.error;if(ce){w.console.error=function(){push("console.error: "+Array.prototype.map.call(arguments,String).join(" "));return ce.apply(this,arguments);};}'
  // navigation guard: anchors and form submits never leave the fossil
  + 'var nav=w.__mountNav=[];function tell(m){nav.push(m);try{if(w.parent!==w&&typeof w.parent.__mountTestOnNav==="function")w.parent.__mountTestOnNav(m);}catch(e){}}'
  + 'w.addEventListener("click",function(e){var t=e.target;var a=t&&t.closest?t.closest("a[href]"):null;if(a){e.preventDefault();tell("anchor "+a.getAttribute("href"));}},true);'
  + 'w.addEventListener("submit",function(e){e.preventDefault();tell("form submit "+((e.target&&e.target.getAttribute("action"))||""));},true);'
  + '})();</script>';

let args;
try {
  args = parseArgs(process.argv.slice(2), { root: 'string', port: 'number', open: 'boolean', help: 'boolean' });
} catch (e) {
  usage(HELP + '\n' + e.message, 2);
}
if (args.help) usage(HELP, 0);
if (args._.length) usage(HELP + '\nunexpected positional argument: ' + args._[0], 2);

const root = path.resolve(args.root || 'snapshots');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error('root is not a directory: ' + root);
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const mountTest = path.join(here, '..', 'mount-test.html');
if (!fs.existsSync(mountTest)) {
  console.error('mount-test.html is missing next to scripts/: ' + mountTest);
  process.exit(1);
}

// The shared static server picks its own port and serves raw bytes. The front server owns the
// public port (fixed when --port is given) and performs the opt-in hook injection.
const inner = await startStaticServer(root, { extra: { '/__skill/mount-test.html': mountTest } });

function wantsHook(reqUrl) {
  const [p, qs = ''] = reqUrl.split('?');
  return /(^|&)__hook=1(&|$)/.test(qs) && (/\.html?$/i.test(p) || p.endsWith('/'));
}

function inject(buf) {
  // latin1 round-trip is byte-preserving for any charset; the hook itself is pure ASCII.
  const s = buf.toString('latin1');
  const m = s.match(/<head\b[^>]*>/i);
  const out = m ? s.slice(0, m.index + m[0].length) + HOOK + s.slice(m.index + m[0].length)
    : (s.match(/<html\b[^>]*>/i) ? s.replace(/<html\b[^>]*>/i, (t) => t + HOOK) : HOOK + s);
  return Buffer.from(out, 'latin1');
}

const front = http.createServer((req, res) => {
  const hook = wantsHook(req.url || '/');
  const up = http.request({ host: '127.0.0.1', port: inner.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
    const isHtml = /text\/html/i.test(r.headers['content-type'] || '');
    if (!hook || !isHtml || r.statusCode !== 200) {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
      return;
    }
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => {
      const body = inject(Buffer.concat(chunks));
      const headers = { ...r.headers, 'content-length': String(body.length) };
      res.writeHead(200, headers);
      res.end(body);
    });
  });
  up.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(up);
});
await new Promise((resolve, reject) => {
  front.once('error', reject);
  front.listen(args.port || 0, '127.0.0.1', resolve);
}).catch((e) => { console.error('cannot listen on port ' + (args.port || 0) + ': ' + e.message); process.exit(1); });

const baseUrl = 'http://127.0.0.1:' + front.address().port;
const rootUrl = baseUrl + '/';
const mountUrl = baseUrl + '/__skill/mount-test.html';
const slugs = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'index.html')))
  .map((d) => d.name);

console.log('serving ' + root);
console.log('root index : ' + rootUrl);
console.log('mount test : ' + mountUrl);
if (slugs.length) {
  console.log('example    : ' + mountUrl + '?snap=/' + slugs[0] + '/index.html&w=1440&h=900&zoom=1.8');
} else {
  console.log('no <slug>/index.html under the root yet');
}
console.log('serving ' + slugs.length + ' snapshot(s) on ' + baseUrl + ' -- Ctrl+C to stop');

if (args.open) {
  // Detached: the browser is a side effect, the server is what has to keep running.
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', mountUrl]]
    : process.platform === 'darwin' ? ['open', [mountUrl]]
    : ['xdg-open', [mountUrl]];
  spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).on('error', (e) => console.error('could not open browser: ' + e.message)).unref();
}

async function shutdown() {
  await new Promise((r) => front.close(r));
  await inner.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
