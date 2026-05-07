#!/usr/bin/env node

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { createRequestHandler, ROOT } = require('../serve.js');
const { previewClientScript } = require('./preview-client.js');
const { scrubberHtml } = require('./scrubber-html.js');

function parseArgs(argv) {
  const args = { port: 4321, open: true, video: '_phase-c-editorial-pilot' };
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

function main() {
  const args = parseArgs(process.argv);
  const staticHandler = createRequestHandler({ injectPreview });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${args.port}`);
    if (url.pathname === '/scrubber') {
      const video = url.searchParams.get('video') || args.video;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(scrubberHtml({ video, port: args.port }));
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

  const watched = ['videos', 'runtime', 'engine', 'scenes', 'videos/_shared', 'vendor/gsap'];
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
    const player = `http://localhost:${args.port}/scenes/player.html?video=${encodeURIComponent(args.video)}&preview=1`;
    const scrubber = `http://localhost:${args.port}/scrubber?video=${encodeURIComponent(args.video)}`;
    console.log('Phase E preview server');
    console.log(`  player:   ${player}`);
    console.log(`  scrubber: ${scrubber}`);
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
