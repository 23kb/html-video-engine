// Soundlab — multitrack SFX editor for a video's sfx/plan.json.
// Video preview + clips on a timeline; mute/solo, drag-nudge, per-clip
// gain, prompt regeneration, and one-click export (runs mux.mjs).
//
// Usage: node tools/sfx/soundlab.mjs --video <slug> [--plan <file>] [--port 4545]
// UI:    http://localhost:4545/
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : dflt; };
const video = arg('--video');
const port = parseInt(arg('--port', '4545'), 10);
if (!video) { console.error('Usage: node tools/sfx/soundlab.mjs --video <slug> [--port 4545]'); process.exit(1); }

const sfxDir = path.resolve('videos', video, 'sfx');
const planPath = arg('--plan') ? path.resolve(arg('--plan')) : path.join(sfxDir, 'plan.json');
const readPlan = () => JSON.parse(fs.readFileSync(planPath, 'utf8'));

const MIME = { '.html': 'text/html', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json' };

function sendFile(req, res, file) {
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  const stat = fs.statSync(file);
  const type = MIME[path.extname(file)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

function runNode(script, args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script, ...args], { cwd: process.cwd() });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/' || p === '/index.html') {
      sendFile(req, res, path.join(__dirname, 'soundlab.html'));
    } else if (p === '/api/plan' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ plan: readPlan(), video, hasMusic: fs.existsSync(path.join(sfxDir, readPlan().music?.file || 'music.mp3')) }));
    } else if (p === '/api/plan' && req.method === 'POST') {
      const body = await readBody(req);
      JSON.parse(body); // validate
      fs.writeFileSync(planPath, body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    } else if (p === '/api/export' && req.method === 'POST') {
      const r = await runNode(path.join(__dirname, 'mux.mjs'), ['--video', video, '--plan', planPath]);
      res.writeHead(r.code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: r.code === 0, log: r.out }));
    } else if (p === '/api/generate' && req.method === 'POST') {
      const { sound, prompt, duration } = JSON.parse(await readBody(req));
      const plan = readPlan();
      if (!plan.sounds[sound]) { res.writeHead(400); res.end('{"ok":false,"log":"unknown sound"}'); return; }
      if (prompt) plan.sounds[sound].prompt = prompt;
      if (duration) plan.sounds[sound].duration = duration;
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
      const r = await runNode(path.join(__dirname, 'generate.mjs'), ['--video', video, '--plan', planPath, '--force', sound]);
      res.writeHead(r.code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: r.code === 0, log: r.out }));
    } else if (p === '/media/video') {
      sendFile(req, res, path.resolve(readPlan().mp4));
    } else if (p === '/media/music') {
      sendFile(req, res, path.join(sfxDir, readPlan().music?.file || 'music.mp3'));
    } else if (p.startsWith('/media/sound/')) {
      const name = decodeURIComponent(p.split('/').pop()).replace(/[^a-z0-9-]/gi, '');
      sendFile(req, res, path.join(sfxDir, 'sounds', `${name}.mp3`));
    } else {
      res.writeHead(404); res.end('not found');
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, log: String(e.message || e) }));
  }
});

server.listen(port, () => {
  console.log(`[soundlab] ${video} → http://localhost:${port}/`);
});
