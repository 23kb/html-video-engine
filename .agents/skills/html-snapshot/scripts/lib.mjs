// Shared helpers for the html-snapshot scripts. Node 18+. The only dependency is
// playwright (loaded lazily so the pure-text scripts run without it).

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

// ---------- args ----------

export function parseArgs(argv, spec = {}) {
  // spec: { flag: 'string' | 'number' | 'boolean' | 'list' | 'multi' }  (multi = repeatable string)
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const kind = spec[key];
      if (!kind) throw new Error('unknown option --' + key);
      if (kind === 'boolean') { out[key] = true; continue; }
      const v = argv[++i];
      if (v === undefined) throw new Error('--' + key + ' needs a value');
      if (kind === 'number') out[key] = Number(v);
      else if (kind === 'list') out[key] = v.split(',').map(s => s.trim()).filter(Boolean);
      else if (kind === 'multi') (out[key] ||= []).push(v);
      else out[key] = v;
    } else out._.push(a);
  }
  return out;
}

export function usage(text, code = 1) { console.error(text); process.exit(code); }

// ---------- files ----------

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
export function writeJson(f, obj) { fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
export function nowIso() { return new Date().toISOString(); }
export function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
export function hashName(url, ext) { return crypto.createHash('md5').update(url).digest('hex').slice(0, 10) + ext; }

// Output root: --out or ./snapshots under the cwd. Snapshot folder = <root>/<slug>.
export function snapshotDir(root, slug) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug)) throw new Error(`slug "${slug}" — use letters, digits, dot, dash, underscore`);
  return path.join(path.resolve(root || 'snapshots'), slug);
}

// ---------- secrets ----------

export const SECRET_PATTERNS = [
  { name: 'google-api', re: /AIza[0-9A-Za-z_\-]{35}/g },
  { name: 'stripe-pk', re: /pk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-sk', re: /sk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-rk', re: /rk_(test|live)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe-whsec', re: /whsec_[A-Za-z0-9]{20,}/g },
  { name: 'aws-akia', re: /AKIA[A-Z0-9]{16}/g },
  { name: 'github-token', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'sendgrid-key', re: /SG\.[A-Za-z0-9_\-.]{20,}/g },
  { name: 'openai-key', re: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/g },
  { name: 'jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
];

export function redactSecrets(text, extra = []) {
  const report = {};
  let out = text;
  for (const { name, re } of SECRET_PATTERNS) {
    const n = (out.match(re) || []).length;
    if (n) { out = out.replace(re, 'REDACTED_KEY'); report[name] = n; }
  }
  extra.forEach((re, i) => {
    const r = re instanceof RegExp ? re : new RegExp(re, 'g');
    const n = (out.match(r) || []).length;
    if (n) { out = out.replace(r, 'REDACTED'); report['custom-' + (i + 1)] = n; }
  });
  return { text: out, report, count: Object.values(report).reduce((a, b) => a + b, 0) };
}

const TEXT_EXTS = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.map']);
export function isTextAsset(filename) { return TEXT_EXTS.has(path.extname(filename).toLowerCase()); }

// ---------- env placeholders in plans: "${ENV:WP_PASS}" ----------

export function resolveEnv(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{ENV:([A-Z0-9_]+)\}/g, (_, name) => {
    if (process.env[name] === undefined) throw new Error(`plan references \${ENV:${name}} but it is not set in the environment`);
    return process.env[name];
  });
}

// ---------- URLs / assets ----------

export function mimeFor(url) {
  const ext = url.split(/[?#]/)[0].split('.').pop().toLowerCase();
  return {
    woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
    css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', html: 'text/html', htm: 'text/html', txt: 'text/plain',
    mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
  }[ext] || 'application/octet-stream';
}

export function extFor(url, contentType = '') {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]{1,5})$/i);
  if (m) return '.' + m[1].toLowerCase();
  if (contentType.includes('css')) return '.css';
  if (contentType.includes('javascript')) return '.js';
  if (contentType.includes('svg')) return '.svg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('jpeg')) return '.jpg';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('woff2')) return '.woff2';
  if (contentType.includes('woff')) return '.woff';
  if (contentType.includes('ttf') || contentType.includes('truetype')) return '.ttf';
  return '.bin';
}

export async function fetchBuffer(url, { timeout = 20000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { buf: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || '' };
}

// Every url(...) reference in a CSS text, resolved against baseHref. Skips data: and #fragment refs.
export function cssUrlRefs(css, baseHref) {
  const refs = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const u = m[2].trim();
    if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('blob:')) continue;
    try { refs.push({ raw: u, abs: new URL(u, baseHref).toString() }); } catch { /* ignore */ }
  }
  return refs;
}

// Rewrite url(...) refs with a resolver(absUrl) -> replacement string | null.
export function rewriteCssUrls(css, baseHref, resolver) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, raw) => {
    const u = raw.trim();
    if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('blob:')) return m;
    let abs;
    try { abs = new URL(u, baseHref).toString(); } catch { return m; }
    const r = resolver(abs, u);
    return r ? `url(${r})` : m;
  });
}

export function dataUri(buf, mime) { return `data:${mime};base64,${buf.toString('base64')}`; }

// ---------- playwright ----------

export async function loadPlaywright() {
  try {
    const pw = await import('playwright');
    return pw;
  } catch (e) {
    throw new Error('playwright is not installed. In the skill folder run: npm install   (then: npx playwright install chromium)\n' + e.message);
  }
}

// ---------- static server (gates, mount test) ----------

export function startStaticServer(rootDir, { extra = {} } = {}) {
  // extra: { '/__skill/mount-test.html': '<absolute file path>' }
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); res.end(); return; }
    let fp = extra[p] ? extra[p] : path.join(root, p);
    if (!extra[p] && !fp.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.stat(fp, (e, st) => {
      if (!e && st.isDirectory()) fp = path.join(fp, 'index.html');
      fs.readFile(fp, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': mimeFor(fp), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        res.end(buf);
      });
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ port: server.address().port, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) })));
}

// ---------- page checks ----------

export function isErrorTitle(title) {
  return /\b(404|403|500)\b|not found|error establishing|database error|log ?in\b|sign ?in\b|access denied|forbidden/i.test(title || '');
}

export function stripCspAndBase(html) {
  const notes = [];
  // SingleFile writes the attribute unquoted (http-equiv=content-security-policy); match both forms.
  const csp = html.match(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi);
  if (csp) { for (const t of csp) html = html.replace(t, '<!-- CSP meta stripped: it blocks every injected script and the preview client -->'); notes.push(`stripped ${csp.length} CSP <meta>`); }
  const base = html.match(/<base\b[^>]*>/gi);
  if (base) { for (const t of base) html = html.replace(t, '<!-- base stripped -->'); notes.push(`stripped ${base.length} <base>`); }
  return { html, notes };
}

export function ensureCharsetAndClose(html) {
  const notes = [];
  if (!/<meta[^>]+charset/i.test(html)) { html = html.replace(/<head[^>]*>/i, m => m + '<meta charset="utf-8">'); notes.push('added <meta charset>'); }
  if (!/<\/body>\s*<\/html>\s*$/i.test(html)) {
    if (!/<\/body>/i.test(html)) html += '\n</body>';
    if (!/<\/html>\s*$/i.test(html)) html += '\n</html>';
    notes.push('appended missing </body></html>');
  }
  return { html, notes };
}

export function stripCrossorigin(html) {
  const n = (html.match(/\scrossorigin(=["'][^"']*["'])?/gi) || []).length;
  return { html: html.replace(/\scrossorigin(=["'][^"']*["'])?/gi, ''), count: n };
}

// Personal-data heuristics shared by gates G8 and the ingest report.
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
export const GREETING_RE = /\b(Welcome( back)?|Hi|Hello|Hey|Good (morning|afternoon|evening))[,!]?\s+([A-Z][a-z]+(\s[A-Z][a-z]+)?)\b/g;
