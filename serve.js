// Minimal static server so iframe same-origin works.
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4321;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function safeFilePath(urlPath) {
  let filePath = path.join(ROOT, urlPath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT)) return null;
  return filePath;
}

function createRequestHandler(options = {}) {
  const injectPreview = typeof options.injectPreview === 'function'
    ? options.injectPreview
    : null;

  return (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = safeFilePath(urlPath);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found: ' + urlPath); }
    const ext = path.extname(filePath);
    let body = data;
    if (injectPreview && ext === '.html') {
      body = Buffer.from(injectPreview(data.toString('utf8'), { req, filePath, urlPath }), 'utf8');
    }
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(body);
  });
  };
}

function createServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

function listen(options = {}) {
  const port = Number(options.port || process.env.PORT) || PORT;
  const server = createServer(options);
  server.listen(port, () => {
    const label = options.preview
      ? `Preview server → http://localhost:${port}/scenes/player.html`
      : `→ http://localhost:${port}/scenes/notifications-combined.html`;
    console.log(label);
  });
  return server;
}

if (require.main === module) {
  listen();
}

module.exports = {
  ROOT,
  TYPES,
  createRequestHandler,
  createServer,
  listen,
};
