#!/usr/bin/env node
// ingest.mjs — Path B: package a browser "Save page" / SingleFile HTML the human saved
// from an authenticated tab into <root>/<slug>/{index.html, meta.json}.
//
// Usage:
//   node scripts/ingest.mjs <file.html> <slug> --expect "<string unique to the page>"
//        [--no-expect] [--root <dir>] [--redact <regex>]... [--keep-iframes] [--source-url <url>]
//
// Why the asserts exist: a tool that can silently package the wrong file is the same
// bug class as a snapshot that lies. Browsers block repeated automatic downloads after
// the first, so "the newest .html in Downloads" is often a STALE save; the same bytes
// were once packaged three times as three different captures. So:
//   --expect is REQUIRED (or an explicit --no-expect) and must appear in the HTML;
//   a file whose sha256 was already ingested under a DIFFERENT slug is refused
//   (ledger: <root>/.ingest-hashes.json).
//
// Exit: 0 ok, 1 failure, 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs, usage, ensureDir, writeJson, nowIso, sha256, snapshotDir, redactSecrets,
  fetchBuffer, cssUrlRefs, rewriteCssUrls, dataUri, mimeFor, stripCspAndBase, ensureCharsetAndClose,
  stripCrossorigin, EMAIL_RE, GREETING_RE,
} from './lib.mjs';

const USAGE = 'Usage: node scripts/ingest.mjs <file.html> <slug> --expect "<string unique to the page>" [--no-expect] [--root <dir>] [--redact <regex>]... [--keep-iframes] [--source-url <url>]';
const TRACKER_HOSTS = /doubleclick|googletagmanager|facebook|hotjar|intercom|segment/i;

let args;
try {
  args = parseArgs(process.argv.slice(2), {
    expect: 'string', 'no-expect': 'boolean', root: 'string', redact: 'multi', 'keep-iframes': 'boolean', 'source-url': 'string',
  });
} catch (e) { usage(e.message + '\n' + USAGE, 2); }

const [file, slug] = args._;
if (!file || !slug) usage(USAGE, 2);
if (!args.expect && !args['no-expect']) {
  usage('--expect "<string>" is REQUIRED (or pass --no-expect explicitly).\n' +
    'Without it a stale download can be packaged as a new capture and nothing notices.\n' +
    'Pick a string unique to the page you saved (a heading, a record name).\n' + USAGE, 2);
}

function attr(tag, name) {
  const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(["\'])(.*?)\\1', 'i')) || tag.match(new RegExp('\\s' + name + '\\s*=\\s*([^\\s"\'>]+)', 'i'));
  return m ? (m[2] !== undefined ? m[2] : m[1]) : null;
}

// Hidden or tracker iframes are never part of the UI; they only add 404s and third-party calls.
function iframeIsJunk(tag) {
  const style = (attr(tag, 'style') || '').replace(/\s/g, '').toLowerCase();
  const w = attr(tag, 'width'), h = attr(tag, 'height'), src = attr(tag, 'src') || '';
  if (w === '0' || h === '0' || /^0(px)?$/.test(w || 'x') || /^0(px)?$/.test(h || 'x')) return 'zero-size';
  if (/display:none|width:0(px|;|$)|height:0(px|;|$)|visibility:hidden/.test(style)) return 'hidden';
  try { if (TRACKER_HOSTS.test(new URL(src, 'https://example.invalid').host)) return 'tracker'; } catch { /* keep */ }
  return null;
}

function detectSourceUrl(html) {
  const single = html.match(/<!--\s*Page saved with SingleFile[\s\S]*?url:\s*(\S+)/i);
  if (single) return single[1];
  const canon = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  if (canon && attr(canon[0], 'href')) return attr(canon[0], 'href');
  const og = html.match(/<meta\b[^>]*property=["']og:url["'][^>]*>/i);
  if (og && attr(og[0], 'content')) return attr(og[0], 'content');
  const origin = html.match(/data-origin=["'](https?:\/\/[^/"']+)/i);
  if (origin) return origin[1];
  return 'browser-save';
}

async function inlineStylesheets(html, notes) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0])
    .filter(t => /\bstylesheet\b/i.test(attr(t, 'rel') || '') && /^https?:\/\//i.test(attr(t, 'href') || ''));
  let inlined = 0;
  for (const tag of links) {
    const href = attr(tag, 'href');
    let css;
    try { css = (await fetchBuffer(href)).buf.toString('utf8'); }
    catch (e) { console.warn(`WARN stylesheet fetch failed ${href.slice(0, 90)} -- ${e.message} (left as <link>; may render wrong offline)`); notes.push(`stylesheet left remote: ${href}`); continue; }
    // Fonts/icons the sheet points at go offline too; a failed one stays a remote url() with a WARN.
    const map = new Map();
    for (const { abs } of cssUrlRefs(css, href)) {
      if (map.has(abs)) continue;
      try { const { buf, contentType } = await fetchBuffer(abs); map.set(abs, dataUri(buf, contentType.split(';')[0] || mimeFor(abs))); }
      catch (e) { map.set(abs, null); console.warn(`WARN asset fetch failed ${abs.slice(0, 90)} -- ${e.message}`); }
    }
    css = rewriteCssUrls(css, href, abs => map.get(abs) || null);
    html = html.replace(tag, `<style data-origin="${href}">\n${css}\n</style>`);
    inlined++;
  }
  if (inlined) notes.push(`inlined ${inlined} external stylesheet(s)`);
  return html;
}

function personalDataReport(html) {
  const emails = [...new Set(html.match(EMAIL_RE) || [])].map(e => e.replace(/^(.)[^@]*/, '$1***'));
  const greetings = [...new Set(html.match(GREETING_RE) || [])];
  console.log(`personal-data pre-report: ${emails.length} email(s), ${greetings.length} greeting(s)`);
  for (const e of emails.slice(0, 10)) console.log('  email    ' + e);
  for (const g of greetings.slice(0, 10)) console.log('  greeting "' + g + '"');
  if (emails.length > 10 || greetings.length > 10) console.log('  (list truncated to 10 each)');
  return { emails: emails.length, greetings: greetings.length };
}

async function main() {
  const src = path.resolve(file);
  if (!fs.existsSync(src)) { console.error('FAIL file not found: ' + src); process.exit(1); }
  const outDir = snapshotDir(args.root, slug);
  const root = path.dirname(outDir);
  ensureDir(root);
  const raw = fs.readFileSync(src);
  let html = raw.toString('utf8');
  const notes = [];

  // Byte-identity refuse: same bytes under another slug = the browser served a stale file.
  const hash = sha256(raw);
  const ledgerPath = path.join(root, '.ingest-hashes.json');
  let ledger = {};
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch { /* first ingest */ }
  const dup = Object.keys(ledger).find(s => s !== slug && ledger[s] === hash);
  if (dup) {
    console.error(`FAIL ${path.basename(src)} is byte-identical to the file already ingested as "${dup}".`);
    console.error('  You are about to package the SAME page as a different capture. Save the page again in the');
    console.error('  browser and confirm a NEW file actually landed (browsers block repeat automatic downloads).');
    process.exit(1);
  }

  let r = stripCspAndBase(html); html = r.html; notes.push(...r.notes);
  // SingleFile writes <meta http-equiv=content-security-policy content="..."> with the attribute UNQUOTED;
  // the shared strip expects quotes, and a CSP that survives blocks every injected script (G7 catches it late).
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, () => {
    notes.push('stripped 1 CSP <meta> (unquoted attribute form)');
    return '<!-- CSP meta stripped: it blocks every injected script and the preview client -->';
  });
  r = ensureCharsetAndClose(html); html = r.html; notes.push(...r.notes);
  r = stripCrossorigin(html); html = r.html; if (r.count) notes.push(`removed ${r.count} crossorigin attribute(s)`);

  if (args.expect && !html.includes(args.expect)) {
    console.error(`FAIL --expect string not found: "${args.expect}"`);
    console.error(`  ${path.basename(src)} is not the page you think it is (a stale download packaged as a new capture).`);
    console.error('  Save the page again and point at the NEW file.');
    process.exit(1);
  }
  if (args.expect) console.log(`expect ok: "${args.expect}"`);

  // Scripts never run in a fossil; a saved page's scripts would also re-fetch from the live origin.
  let ld = 0, scripts = 0;
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi, tag => {
    scripts++;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(tag)) { ld++; return '<!-- ld+json script removed -->'; }
    return '';
  });
  const noscripts = (html.match(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi) || []).length;
  html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  notes.push(`removed ${scripts} script(s) (${ld} ld+json), ${noscripts} noscript(s)`);

  let removedIframes = 0, keptIframes = 0;
  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>|<iframe\b[^>]*\/>/gi, tag => {
    const why = args['keep-iframes'] ? iframeIsJunk(tag) : 'no --keep-iframes';
    if (!why) { keptIframes++; return tag; }
    removedIframes++;
    return `<!-- iframe removed (${why}): ${(attr(tag, 'src') || '').slice(0, 120)} -->`;
  });
  if (removedIframes || keptIframes) notes.push(`removed ${removedIframes} iframe(s), kept ${keptIframes}`);

  html = await inlineStylesheets(html, notes);

  const red = redactSecrets(html, args.redact || []);
  html = red.text;
  if (red.count) notes.push('redacted: ' + Object.entries(red.report).map(([k, v]) => `${k}x${v}`).join(', '));

  const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  const meta = {
    slug, path: 'B',
    source_url: args['source-url'] || detectSourceUrl(html),
    title,
    captured_at: nowIso(),
    redactions: red.count,
    download_file: path.basename(src),
    expect: args.expect || null,
    notes,
  };
  writeJson(path.join(outDir, 'meta.json'), meta);
  ledger[slug] = hash;
  writeJson(ledgerPath, ledger);

  for (const n of notes) console.log('  ' + n);
  const pd = personalDataReport(html);
  console.log(`ingested ${path.basename(src)} -> ${slug} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${red.count} redaction(s), ${pd.emails} email(s), ${pd.greetings} greeting(s)); next: node scripts/gates.mjs ${slug}${args.root ? ' --root ' + args.root : ''}`);
  console.log('wrote ' + path.join(outDir, 'index.html'));
}

main().catch(e => { console.error('FAIL ' + (e && e.message || e)); process.exit(1); });
