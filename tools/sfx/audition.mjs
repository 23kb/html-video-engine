// Reference-copy step 5: the audition page — confirm reference cues by ear and
// pick candidates, level-matched, alone and over the reference's own bed.
//
// Usage: node tools/sfx/audition.mjs --ref <dir> [--port 4546]
// UI:    http://localhost:4546/
// Reads:  <dir>/reference-cues.json, <dir>/match-report.json (run match-cues first)
// Writes: <dir>/audition-decisions.json — per cue: isSfx, class, note, and
//         approve/reject per candidate. match-cues.mjs and gen-candidates.mjs
//         honour it on the next run.
//
// An approval here is a SHORTLIST, not the palette. A sound joins
// tools/sfx/palette/ only after Umair hears it placed on a real cut in a real
// film against a real bed (tools/sfx/CONTEXT.md, ratified palette rules).
import fs from 'fs';
import http from 'http';
import path from 'path';
import { args, HERE } from './lib-py.mjs';

const a = args();
if (!a.ref) {
  console.error('Usage: node tools/sfx/audition.mjs --ref <dir> [--port 4546]');
  process.exit(1);
}
const ROOT = process.cwd();
const ref = path.resolve(a.ref);
const port = Number(a.port || 4546);
const decP = path.join(ref, 'audition-decisions.json');
const ALLOWED = [ref, path.join(HERE, 'palette'), path.join(HERE, 'candidates'), path.join(HERE, 'explore')]
  .map((p) => path.resolve(p) + path.sep);
const TYPES = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.json': 'application/json', '.html': 'text/html; charset=utf-8' };

const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => resolve(b)); });

function send(res, file) {
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') return send(res, path.join(HERE, 'audition.html'));
    if (url.pathname === '/api/data') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        refId: path.basename(ref),
        cues: readJson(path.join(ref, 'reference-cues.json')),
        match: readJson(path.join(ref, 'match-report.json')),
        decisions: readJson(decP) || { cues: {} },
      }));
    }
    if (url.pathname === '/api/decisions' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body || typeof body.cues !== 'object') throw new Error('decisions must have a cues object');
      body.ref = path.relative(ROOT, ref).replace(/\\/g, '/');
      body.updated = new Date().toISOString();
      fs.writeFileSync(decP, JSON.stringify(body, null, 1));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{"ok":true}');
    }
    if (url.pathname === '/file') {
      const abs = path.resolve(ROOT, url.searchParams.get('p') || '');
      if (!ALLOWED.some((root) => abs.startsWith(root)) || !fs.existsSync(abs)) { res.writeHead(404); return res.end('not found'); }
      return send(res, abs);
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
});
server.listen(port, () => console.log(`[audition] http://localhost:${port}/  (ref ${path.relative(ROOT, ref)})`));
