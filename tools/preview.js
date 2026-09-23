#!/usr/bin/env node

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { createRequestHandler, ROOT } = require('../serve.js');
const { previewClientScript } = require('./preview-client.js');

function parseArgs(argv) {
  const args = { port: 4321, open: true, video: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--no-open') args.open = false;
    else if (a === '--video') args.video = argv[++i];
  }
  return args;
}

function injectPreview(html) {
  const script = previewClientScript();
  if (html.includes('__phaseE5PreviewClient')) return html;
  if (html.includes('</body>')) return html.replace('</body>', `${script}\n</body>`);
  return `${html}\n${script}`;
}

function openUrl(url) {
  const args = process.platform === 'win32'
    ? ['/c', 'start', '""', url]
    : process.platform === 'darwin'
      ? [url]
      : ['xdg-open', url];
  const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true });
  child.unref();
}

// Scan videos/ for QC-dashboard candidates: any non-underscore slug that has
// a rendered mp4 (newest one wins) or a qc-report.json. Cheap enough to run
// per-request; no caching so a fresh render/report shows on reload.
function qcIndex() {
  const fs = require('fs');
  const videosDir = path.join(ROOT, 'videos');
  const out = [];
  for (const entry of fs.readdirSync(videosDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const slug = entry.name;
    const dir = path.join(videosDir, slug);
    const mp4s = [];
    const scan = (d, depth) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && depth < 2 && !e.name.startsWith('.')) scan(path.join(d, e.name), depth + 1);
        else if (e.isFile() && e.name.toLowerCase().endsWith('.mp4')) {
          const p = path.join(d, e.name);
          mp4s.push({ p, mtime: fs.statSync(p).mtimeMs });
        }
      }
    };
    try { scan(dir, 0); } catch (_) { continue; }
    const reportFile = path.join(dir, 'qc-report.json');
    const hasReport = fs.existsSync(reportFile);
    if (!mp4s.length && !hasReport) continue;
    mp4s.sort((a, b) => b.mtime - a.mtime);
    let report = null;
    if (hasReport) {
      try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch (_) {}
    }
    out.push({
      slug,
      mp4: mp4s.length ? '/' + path.relative(ROOT, mp4s[0].p).replace(/\\/g, '/') : null,
      mp4Mtime: mp4s.length ? new Date(mp4s[0].mtime).toISOString() : null,
      report: report ? '/videos/' + slug + '/qc-report.json' : null,
      sections: report ? Object.keys(report.sections || {}) : [],
      updated: report ? report.updated || null : null,
    });
  }
  out.sort((a, b) => String(b.updated || b.mp4Mtime || '').localeCompare(String(a.updated || a.mp4Mtime || '')));
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const staticHandler = createRequestHandler({ injectPreview });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${args.port}`);
    // Never let a browser cache a served build: the "reviewer saw an old
    // build" class (ee 7, mfe 6) survives as BROWSER cache ghosting even when
    // the server reads fresh bytes. setHeader() values merge into every
    // writeHead() downstream (static files, mp4 range replies, 404s, __qc),
    // so this one place covers every response.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    // Preview-client probes HEAD /__preview-ws to decide whether to open the
    // live-reload WebSocket. Without this short-circuit the probe falls
    // through to the static handler, returns 404, and no WS is ever opened.
    if (url.pathname === '/__preview-ws') {
      res.writeHead(426, { 'Upgrade': 'websocket', 'Connection': 'Upgrade' });
      res.end();
      return;
    }
    // QC dashboard index: every video with a render mp4 or a qc-report.json.
    if (url.pathname === '/__qc/videos.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(qcIndex(), null, 2));
      return;
    }
    staticHandler(req, res);
  });

  const wss = new WebSocket.Server({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/__preview-ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });

  const watched = ['videos', 'scenes', 'videos/_shared', 'vendor/gsap'];
  const watcher = chokidar.watch(watched, {
    cwd: ROOT,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 },
  });

  let debounce = null;
  watcher.on('all', (event, changedPath) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const msg = JSON.stringify({ type: 'reload', event, path: changedPath, at: Date.now() });
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
      }
      console.log(`[preview] reload ${event} ${changedPath}`);
    }, 150);
  });

  server.listen(args.port, () => {
    const player = args.video
      ? `http://localhost:${args.port}/videos/${encodeURIComponent(args.video)}/index.html`
      : `http://localhost:${args.port}/tools/qc-dashboard/`;
    console.log('Preview server (live reload)');
    console.log(`  player:   ${player}`);
    console.log(`  watches:  ${watched.join(', ')}`);
    if (args.open) openUrl(player);
  });

  const close = () => {
    watcher.close().catch(() => {});
    wss.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

main();
