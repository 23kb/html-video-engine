// Minimal static server so iframe same-origin works.
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { mapLegacySnapshotUrl } = require('./tools/lib/paths');

const PORT = Number(process.env.PORT) || 4321;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const MEDIA_EXTS = new Set(['.mp4', '.webm', '.mp3', '.wav', '.m4a']);

function safeFilePath(urlPath) {
  let filePath = path.join(ROOT, urlPath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT)) return null;
  return filePath;
}

function createRequestHandler(options = {}) {
  const userInjectPreview = typeof options.injectPreview === 'function'
    ? options.injectPreview
    : null;
  let previewClientScript = null;
  try { ({ previewClientScript } = require('./tools/preview-client.js')); } catch (_) {}
  // If no caller-supplied injector, default to the preview-client script so
  // the scrubber works against plain `serve.js` too. Preview mode supplies
  // its own injector. The reload-WS portion silently fails on serve.js
  // (no /__preview-ws endpoint) — that's expected; the BroadcastChannel
  // portion still works for the scrubber.
  const injectPreview = userInjectPreview || ((html) => {
    if (!previewClientScript) return html;
    const tag = previewClientScript();
    if (html.includes('</body>')) return html.replace('</body>', `${tag}\n</body>`);
    return html + tag;
  });

  return (req, res) => {
  const urlPath = mapLegacySnapshotUrl(decodeURIComponent(req.url.split('?')[0]));
  let filePath = safeFilePath(urlPath);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  // Media files honor HTTP Range so <video>/<audio> can seek and byte-range
  // readers (QC dashboard) can read headers without pulling the whole file.
  const mediaExt = path.extname(filePath);
  if (MEDIA_EXTS.has(mediaExt) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const size = fs.statSync(filePath).size;
    const type = TYPES[mediaExt] || 'application/octet-stream';
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] !== '' || m[2] !== '')) {
      let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
      let end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    return fs.createReadStream(filePath).pipe(res);
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
      ? `Preview server → http://localhost:${port}/tools/qc-dashboard/`
      : `→ server started`;
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
