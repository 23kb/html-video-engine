#!/usr/bin/env node

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { createRequestHandler, ROOT } = require('../serve.js');

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

function previewClientScript() {
  return `
<script>
(() => {
  if (window.__phaseEPreviewClient) return;
  window.__phaseEPreviewClient = true;
  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(wsProto + '//' + location.host + '/__preview-ws');
  const channel = new BroadcastChannel('hf-preview');
  const startedAt = performance.now();

  function timelines() {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    if (!registry || typeof registry.entries !== 'function') return [];
    return Array.from(registry.entries()).map(([id, entry]) => ({
      id,
      duration: Number(entry && entry.adapter && entry.adapter.duration) || 0,
    }));
  }

  function state() {
    return {
      type: 'state',
      href: location.href,
      sceneBooted: document.body && document.body.dataset.sceneBooted === 'true',
      sceneDone: document.body && document.body.dataset.sceneDone === 'true',
      surface: (document.body && document.body.dataset.surface) || '',
      wallClock: (performance.now() - startedAt) / 1000,
      timelines: timelines(),
    };
  }

  function seekTimeline(id, time) {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    const entry = registry && registry.get && registry.get(id);
    if (entry && entry.adapter && typeof entry.adapter.seek === 'function') {
      entry.adapter.seek(Number(time) || 0);
    }
  }

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'reload') {
        console.info('[preview] reload', msg.path || '');
        location.reload();
      }
    } catch (_) {}
  });

  channel.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.type === 'query') channel.postMessage(state());
    if (msg.type === 'seek') {
      seekTimeline(msg.id, msg.time);
      channel.postMessage(state());
    }
  });

  setInterval(() => channel.postMessage(state()), 500);
})();
</script>`;
}

function injectPreview(html) {
  const script = previewClientScript();
  if (html.includes('__phaseEPreviewClient')) return html;
  if (html.includes('</body>')) return html.replace('</body>', `${script}\n</body>`);
  return `${html}\n${script}`;
}

function scrubberHtml({ video, port }) {
  const playerUrl = `/scenes/player.html?video=${encodeURIComponent(video)}&preview=1`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phase E Scrubber - ${video}</title>
  <style>
    :root { color-scheme: dark; --bg:#10151c; --panel:#161d26; --ink:#eef5ff; --muted:#8fa0b4; --accent:#f28b3c; --line:#283444; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 Inter, ui-sans-serif, system-ui, sans-serif; }
    .shell { display: grid; grid-template-rows: minmax(0, 1fr) 196px; height: 100vh; }
    iframe { width: 100%; height: 100%; border: 0; background: #071018; }
    .panel { border-top: 1px solid var(--line); background: var(--panel); padding: 14px 18px; display: grid; gap: 12px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .label { color: var(--muted); }
    .url { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
    .track { position: relative; min-height: 84px; border: 1px solid var(--line); border-radius: 8px; background: #0e131a; overflow: hidden; }
    .clock { position: absolute; top: 0; bottom: 0; width: 2px; background: #4fc3ff; left: 0; opacity: .9; }
    .timeline { position: relative; height: 34px; margin: 12px; border-radius: 6px; background: #202b38; cursor: pointer; overflow: hidden; }
    .timeline span { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 10px; color: #fff; pointer-events: none; }
    .timeline::before { content: ""; position: absolute; inset: 0; width: var(--p, 0%); background: linear-gradient(90deg, #f28b3c, #79d8ff); }
    .empty { padding: 22px; color: var(--muted); }
    .small { color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <div class="shell">
    <iframe src="${playerUrl}" title="Preview player"></iframe>
    <section class="panel">
      <div class="top">
        <div><strong>${video}</strong> <span class="label" id="state">waiting for player</span></div>
        <div class="url">http://localhost:${port}${playerUrl}</div>
      </div>
      <div class="track" id="track"><div class="clock" id="clock"></div><div class="empty">Registered timelines will appear here.</div></div>
      <div class="small">Wall-clock regions are read-only. Registered timelines can be clicked to seek that adapter in the player.</div>
    </section>
  </div>
  <script>
    const channel = new BroadcastChannel('hf-preview');
    const track = document.getElementById('track');
    const clock = document.getElementById('clock');
    const stateLabel = document.getElementById('state');
    let latest = null;

    function render(state) {
      latest = state;
      stateLabel.textContent = state.sceneDone ? 'done' : state.sceneBooted ? 'booted' : 'booting';
      const max = Math.max(10, state.wallClock || 0, ...state.timelines.map(t => t.duration || 0));
      clock.style.left = Math.min(100, ((state.wallClock || 0) / max) * 100) + '%';
      track.querySelectorAll('.timeline,.empty').forEach(el => el.remove());
      if (!state.timelines.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No registered timelines are active yet.';
        track.appendChild(empty);
        return;
      }
      state.timelines.forEach(t => {
        const row = document.createElement('div');
        row.className = 'timeline';
        row.style.width = Math.max(8, ((t.duration || 0) / max) * 100) + '%';
        row.innerHTML = '<span>' + t.id + ' · ' + (t.duration || 0).toFixed(2) + 's</span>';
        row.addEventListener('click', (event) => {
          const rect = row.getBoundingClientRect();
          const pct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          channel.postMessage({ type: 'seek', id: t.id, time: pct * (t.duration || 0) });
        });
        track.appendChild(row);
      });
    }

    channel.addEventListener('message', event => {
      if ((event.data || {}).type === 'state') render(event.data);
    });
    setInterval(() => channel.postMessage({ type: 'query' }), 500);
  </script>
</body>
</html>`;
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
