#!/usr/bin/env node
// Backfill missing font binaries that captured snapshots reference but
// never received. Stage 3 Slice 3a — see docs/stage-3-reusable-fixes-plan.md.
//
// Why this exists:
//   Captured snapshot HTML inlines all CSS into <style> blocks. CSS
//   `url(...)` refs in inline styles resolve against the **document URL**
//   (the snapshot's index.html), not against any external CSS file. So
//   a rule like `url(../webfonts/fa-brands-400.woff2)` inside an inline
//   <style> on `/snapshots/<slug>/index.html` resolves to
//   `/snapshots/webfonts/fa-brands-400.woff2` — top-level, shared.
//
//   Capture downloaded binary fonts into `snapshots/<slug>/assets/<hash>.<ext>`
//   but never rewrote the inline-CSS path nor put binaries at the
//   resolved top-level paths. Result: every smoke run reports webfont
//   404s, and icon glyphs render as tofu in playback.
//
// Scope (Slice 3a):
//   - Default: dry-run. Report what's missing, propose fills.
//   - --apply: fetch from $WP_URL using known WP plugin/wp-includes
//     candidate paths and write to top-level `snapshots/webfonts/` and
//     `snapshots/fonts/`.
//   - Does NOT modify existing `snapshots/<slug>/` folders.
//   - Per-snapshot fonts (e.g. `<slug>/fonts/tinymce-small.*`) are
//     reported but not written. That's a follow-up sub-slice.
//
// Usage:
//   node tools/backfill-snapshot-fonts.js              # dry-run (default)
//   node tools/backfill-snapshot-fonts.js --apply      # fetch + write
//   node tools/backfill-snapshot-fonts.js --json       # machine-readable
//   node tools/backfill-snapshot-fonts.js --apply --json

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SNAP = path.join(ROOT, 'snapshots');

// ── env ─────────────────────────────────────────────────────────────
function loadEnv() {
  const out = {};
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

// ── inline CSS extraction ───────────────────────────────────────────
function extractFontRefs(html) {
  const refs = [];
  // Find every <style ...>...</style> block.
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm;
  while ((sm = styleRe.exec(html)) !== null) {
    const css = sm[1];
    // url(...) — accept ", ', or no quotes.
    const urlRe = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/g;
    let um;
    while ((um = urlRe.exec(css)) !== null) {
      const raw = um[1] || um[2] || um[3];
      if (!raw) continue;
      // Drop fragment / query for matching purposes — we still need the
      // base path. Keep the original for context.
      const cleanPath = raw.split('?')[0].split('#')[0];
      if (!/\.(woff2|woff|ttf|eot|otf|svg)$/i.test(cleanPath)) continue;
      refs.push(cleanPath);
    }
  }
  return refs;
}

// Resolve a relative URL against a document path using URL semantics.
// Returns the absolute path component (no host).
function resolveAgainst(docAbsPath, rel) {
  // Treat docAbsPath as `http://x/<docAbsPath>`. URL resolution then
  // gives us the resolved path.
  const u = new URL(rel, 'http://x' + docAbsPath);
  return u.pathname;
}

// ── snapshot scan ───────────────────────────────────────────────────
function scanSnapshots() {
  const result = {
    snapshots: 0,
    refsTotal: 0,
    byPath: new Map(), // resolved path → { sources: Set<slug>, exists: bool }
  };
  if (!fs.existsSync(SNAP)) return result;
  for (const entry of fs.readdirSync(SNAP, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const idx = path.join(SNAP, slug, 'index.html');
    if (!fs.existsSync(idx)) continue;
    result.snapshots++;
    const html = fs.readFileSync(idx, 'utf8');
    const refs = extractFontRefs(html);
    result.refsTotal += refs.length;
    const docPath = `/snapshots/${slug}/index.html`;
    for (const rel of refs) {
      const resolved = resolveAgainst(docPath, rel);
      // Only care about paths under /snapshots/. Drop anything else
      // (CDN, gstatic, data: etc).
      if (!resolved.startsWith('/snapshots/')) continue;
      if (!result.byPath.has(resolved)) {
        result.byPath.set(resolved, { sources: new Set(), exists: null });
      }
      result.byPath.get(resolved).sources.add(slug);
    }
  }
  for (const [p, info] of result.byPath) {
    const onDisk = path.join(ROOT, p.replace(/^\//, '').replace(/\//g, path.sep));
    info.exists = fs.existsSync(onDisk);
  }
  return result;
}

// ── classify resolved path ──────────────────────────────────────────
// TOP-LEVEL = /snapshots/webfonts/<file>, /snapshots/fonts/<file>
// PER-SNAPSHOT = /snapshots/<slug>/<anything>/<file>
function classify(resolvedPath) {
  // Drop the /snapshots/ prefix.
  const tail = resolvedPath.replace(/^\/snapshots\//, '');
  const parts = tail.split('/');
  if (parts.length >= 2 && (parts[0] === 'webfonts' || parts[0] === 'fonts')) {
    return { kind: 'top-level', subdir: parts[0], file: parts.slice(1).join('/') };
  }
  return { kind: 'per-snapshot', subdir: null, file: tail };
}

// ── source-candidate ladder for top-level files ─────────────────────
// Tried in order against $WP_URL during --apply. First HTTP 200 wins.
function topLevelCandidates(subdir, file) {
  const out = [];
  if (subdir === 'webfonts') {
    // Font Awesome shipped by WPForms (Lite/Pro variants and several
    // historical paths). The *-fa-v4compat shim lives next to the rest.
    out.push(`/wp-content/plugins/wpforms-lite/assets/lib/fontawesome/webfonts/${file}`);
    out.push(`/wp-content/plugins/wpforms-lite/assets/lib/font-awesome/webfonts/${file}`);
    out.push(`/wp-content/plugins/wpforms/assets/lib/fontawesome/webfonts/${file}`);
    out.push(`/wp-content/plugins/wpforms/assets/lib/font-awesome/webfonts/${file}`);
    out.push(`/wp-content/plugins/wpforms-lite/lite/assets/css/builder/fontawesome/webfonts/${file}`);
    out.push(`/wp-includes/fonts/${file}`);
  } else if (subdir === 'fonts') {
    // Dashicons + WP-shipped fonts.
    out.push(`/wp-includes/fonts/${file}`);
    out.push(`/wp-includes/css/${file}`);
    out.push(`/wp-content/plugins/wpforms-lite/assets/fonts/${file}`);
    out.push(`/wp-content/plugins/wpforms/assets/fonts/${file}`);
  }
  return out;
}

// ── HTTP fetch ──────────────────────────────────────────────────────
function fetchBuffer(absUrl, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(absUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      headers,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // One-hop redirect follow.
        const next = new URL(res.headers.location, absUrl).toString();
        res.resume();
        return resolve(fetchBuffer(next, headers));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || '',
      }));
    });
    req.on('error', (err) => resolve({ status: 0, body: null, error: String(err.message || err) }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: null, error: 'timeout' }); });
    req.end();
  });
}

async function tryCandidates(wpUrl, candidates) {
  const tried = [];
  for (const candidate of candidates) {
    const url = wpUrl.replace(/\/$/, '') + candidate;
    const r = await fetchBuffer(url);
    tried.push({ url, status: r.status });
    if (r.status === 200 && r.body && r.body.length > 0) {
      return { ok: true, url, status: r.status, body: r.body, tried };
    }
  }
  return { ok: false, tried };
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const asJson = argv.includes('--json');
  const env = loadEnv();
  const wpUrl = process.env.WP_URL || env.WP_URL || null;

  const scan = scanSnapshots();

  const buckets = { topLevel: [], perSnapshot: [], present: [] };
  for (const [resolvedPath, info] of scan.byPath) {
    const cls = classify(resolvedPath);
    const row = {
      path: resolvedPath,
      onDisk: path.relative(ROOT, path.join(ROOT, resolvedPath.replace(/^\//, ''))).replace(/\\/g, '/'),
      kind: cls.kind,
      subdir: cls.subdir,
      file: cls.file,
      exists: info.exists,
      sources: [...info.sources].sort(),
    };
    if (info.exists) buckets.present.push(row);
    else if (cls.kind === 'top-level') buckets.topLevel.push(row);
    else buckets.perSnapshot.push(row);
  }
  buckets.topLevel.sort((a, b) => a.path.localeCompare(b.path));
  buckets.perSnapshot.sort((a, b) => a.path.localeCompare(b.path));

  if (asJson && !apply) {
    process.stdout.write(JSON.stringify({
      mode: 'dry-run',
      snapshotsScanned: scan.snapshots,
      refsTotal: scan.refsTotal,
      uniquePaths: scan.byPath.size,
      missingTopLevel: buckets.topLevel,
      missingPerSnapshot: buckets.perSnapshot,
      present: buckets.present.map(p => p.path),
    }, null, 2) + '\n');
    return;
  }

  if (!apply) {
    console.log('# backfill-snapshot-fonts — dry-run');
    console.log('');
    console.log(`snapshots scanned        : ${scan.snapshots}`);
    console.log(`unique font url() refs   : ${scan.byPath.size}`);
    console.log(`already on disk          : ${buckets.present.length}`);
    console.log(`missing (top-level)      : ${buckets.topLevel.length}   ← Slice 3a scope`);
    console.log(`missing (per-snapshot)   : ${buckets.perSnapshot.length}   ← deferred`);
    console.log('');
    if (buckets.topLevel.length) {
      console.log('## Missing TOP-LEVEL files (proposed write targets)');
      console.log('');
      for (const r of buckets.topLevel) {
        const cands = topLevelCandidates(r.subdir, r.file);
        console.log(`  ${r.onDisk}`);
        console.log(`     referenced by: ${r.sources.length} snapshot(s) — ${r.sources.slice(0, 4).join(', ')}${r.sources.length > 4 ? `, +${r.sources.length - 4} more` : ''}`);
        console.log(`     candidate sources (tried in order during --apply):`);
        for (const c of cands) console.log(`       ${c}`);
        console.log('');
      }
    }
    if (buckets.perSnapshot.length) {
      console.log('## Missing PER-SNAPSHOT files (deferred — Slice 3a does not write these)');
      console.log('');
      const grouped = new Map();
      for (const r of buckets.perSnapshot) {
        const k = r.file.split('/').slice(-1)[0]; // filename only
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k).push(r);
      }
      for (const [name, rows] of grouped) {
        const total = rows.reduce((acc, r) => acc + r.sources.length, 0);
        console.log(`  ${name} — referenced ${rows.length} distinct path(s), ${total} snapshot ref(s)`);
        for (const r of rows.slice(0, 3)) {
          console.log(`     ${r.onDisk}  (sources: ${r.sources.slice(0, 3).join(', ')}${r.sources.length > 3 ? '…' : ''})`);
        }
      }
      console.log('');
    }
    console.log('Run with --apply to fetch missing top-level files from $WP_URL.');
    if (!wpUrl) console.log('NOTE: WP_URL is not set. Apply mode requires WP_URL in .env or environment.');
    return;
  }

  // ── apply ────────────────────────────────────────────────────────
  if (!wpUrl) {
    console.error('error: WP_URL is not set. Add it to .env or export it.');
    process.exit(3);
  }
  console.log(`# backfill-snapshot-fonts — apply  (WP_URL=${wpUrl})`);
  console.log('');
  const writeReport = [];
  for (const r of buckets.topLevel) {
    const cands = topLevelCandidates(r.subdir, r.file);
    const fetched = await tryCandidates(wpUrl, cands);
    const target = path.join(ROOT, r.onDisk);
    if (fetched.ok) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, fetched.body);
      writeReport.push({ path: r.onDisk, status: 'written', bytes: fetched.body.length, source: fetched.url });
      console.log(`OK    ${r.onDisk}  (${fetched.body.length} B  ←  ${fetched.url})`);
    } else {
      writeReport.push({ path: r.onDisk, status: 'failed', tried: fetched.tried });
      console.log(`FAIL  ${r.onDisk}`);
      for (const t of fetched.tried) console.log(`        ${t.status || 'err'}  ${t.url}`);
    }
  }
  console.log('');
  const written = writeReport.filter(r => r.status === 'written').length;
  const failed = writeReport.filter(r => r.status === 'failed').length;
  console.log(`summary: ${written} written, ${failed} failed, ${buckets.perSnapshot.length} per-snapshot deferred`);
  if (asJson) {
    process.stdout.write('\n' + JSON.stringify({
      mode: 'apply',
      wpUrl,
      written,
      failed,
      details: writeReport,
      perSnapshotDeferred: buckets.perSnapshot.length,
    }, null, 2) + '\n');
  }
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error('error:', err && err.message || err);
  process.exit(3);
});
