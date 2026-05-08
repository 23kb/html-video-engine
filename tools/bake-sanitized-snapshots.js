// Stage 3 Slice 3c — bake sanitized snapshots before publish.
//
// Materializes the sanitize layer onto disk. Reads each raw snapshot,
// runs it through the same sanitize path the runtime uses
// (scenes/snapshot-viewer.html?...&sanitize=1), captures the post-sanitize
// iframe DOM, runs the shared forbidden-pattern check, and writes a clean
// copy to snapshots-published/<slug>/.
//
// Usage:
//   node tools/bake-sanitized-snapshots.js <slug> [<slug2> ...]
//   node tools/bake-sanitized-snapshots.js --all-admin
//   node tools/bake-sanitized-snapshots.js --from-manifest videos/<slug>/manifest.json
//
// Flags:
//   --out <dir>          Output root. Default snapshots-published/.
//   --report <path>      Report path. Default <out>/_bake-report.json.
//   --dry-run            Print plan, write nothing.
//   --in-place           Dangerous. Overwrites snapshots/<slug>/index.html.
//                        Requires --i-am-sure-this-is-not-recapturable.
//   --no-assets          Skip the assets/ copy (use only when debugging).
//
// Never overwrites snapshots/<slug>/ unless both --in-place and the
// confirmation flag are present.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { checkText, ADMIN_SLUGS } = require('./_sanitize-forbidden.js');

const ROOT = path.join(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'snapshots');
const PORT = Number(process.env.BAKE_PORT) || 4397;

const META_FILES_TO_COPY = ['catalog.md', 'catalog-audit.json'];

function parseArgs(argv) {
  const args = { slugs: [], out: 'snapshots-published', report: null,
                 dryRun: false, inPlace: false, confirmedDestructive: false,
                 noAssets: false, fromManifest: null, allAdmin: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out')                                        args.out = argv[++i];
    else if (a === '--report')                                args.report = argv[++i];
    else if (a === '--dry-run')                               args.dryRun = true;
    else if (a === '--in-place')                              args.inPlace = true;
    else if (a === '--i-am-sure-this-is-not-recapturable')    args.confirmedDestructive = true;
    else if (a === '--no-assets')                             args.noAssets = true;
    else if (a === '--all-admin')                             args.allAdmin = true;
    else if (a === '--from-manifest')                         args.fromManifest = argv[++i];
    else if (a.startsWith('--')) {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    } else {
      args.slugs.push(a);
    }
  }
  return args;
}

function resolveSlugs(args) {
  if (args.allAdmin) return ADMIN_SLUGS.slice();
  if (args.fromManifest) {
    const m = JSON.parse(fs.readFileSync(path.resolve(args.fromManifest), 'utf8'));
    const out = new Set();
    if (m.primarySnapshot) out.add(m.primarySnapshot);
    for (const ch of m.chapters || []) {
      if (typeof ch === 'string') continue;
      if (ch.snapshot) out.add(ch.snapshot);
    }
    return [...out];
  }
  if (args.slugs.length) return args.slugs;
  console.error('No slugs provided. Use --all-admin, --from-manifest <file>, or pass slugs.');
  process.exit(2);
}

function manifestSlug(args) {
  if (!args.fromManifest) return null;
  try {
    const m = JSON.parse(fs.readFileSync(path.resolve(args.fromManifest), 'utf8'));
    return m.slug || path.basename(path.dirname(path.resolve(args.fromManifest)));
  } catch (_) {
    return null;
  }
}

function sanitizeOptionsFor(args, slug) {
  if (!args.fromManifest) return {};
  const m = JSON.parse(fs.readFileSync(path.resolve(args.fromManifest), 'utf8'));
  return m.sanitize?.[slug] || {};
}

function isDefaultSanitizeOptions(opts) {
  return !opts || !Array.isArray(opts.keepFields) || opts.keepFields.length === 0;
}

function outputSlugFor(slug, args, opts) {
  if (isDefaultSanitizeOptions(opts)) return slug;
  const vSlug = manifestSlug(args);
  return vSlug ? `${slug}--${vSlug}` : slug;
}

function startServer() {
  const proc = spawn(process.execPath, ['serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise(resolve => {
    let started = false;
    const onChunk = (b) => {
      if (started) return;
      if (b.toString().includes(`localhost:${PORT}`)) { started = true; resolve(proc); }
    };
    proc.stdout.on('data', onChunk);
    proc.stderr.on('data', onChunk);
    setTimeout(() => { if (!started) { started = true; resolve(proc); } }, 1500);
  });
}

function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile())  fs.copyFileSync(s, d);
  }
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(2) + ' MB';
}

function dirSize(p) {
  let total = 0;
  if (!fs.existsSync(p)) return 0;
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, entry.name);
    if (entry.isDirectory()) total += dirSize(f);
    else if (entry.isFile()) total += fs.statSync(f).size;
  }
  return total;
}

async function bakeOne(page, slug, args) {
  const sanitizeOpts = sanitizeOptionsFor(args, slug);
  const rawDir = path.join(SNAPSHOTS_DIR, slug);
  const rawIndex = path.join(rawDir, 'index.html');
  if (!fs.existsSync(rawIndex)) {
    return { slug, result: 'missing', error: 'no raw snapshots/<slug>/index.html' };
  }
  const bytesIn = fs.statSync(rawIndex).size;

  // Pre-bake: count tokens in the RAW HTML so the report shows what was scrubbed.
  const rawHtml = fs.readFileSync(rawIndex, 'utf8');
  const rawCheck = checkText(rawHtml, slug);

  // Drive the runtime sanitize path through the snapshot viewer.
  const optParam = encodeURIComponent(JSON.stringify(sanitizeOpts || {}));
  await page.goto(`http://localhost:${PORT}/scenes/snapshot-viewer.html?snap=${slug}&sanitize=1&sanitizeOpts=${optParam}`,
                  { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(900);

  const bakedHtml = await page.evaluate(() => {
    const f = document.getElementById('frame');
    if (!f || !f.contentDocument) return null;
    return f.contentDocument.documentElement.outerHTML;
  });
  if (!bakedHtml) return { slug, result: 'error', error: 'iframe doc unavailable' };

  // Post-bake check — the same patterns the verifier uses.
  const finalHtml = '<!doctype html>\n' + bakedHtml;
  const postCheck = checkText(finalHtml, slug);
  if (postCheck.hits.length) {
    return { slug, result: 'blocked', blockedBy: postCheck.hits, bytesIn,
             tokensRemaining: postCheck.counts };
  }

  // tokensRemoved is the per-token delta from raw → baked.
  const tokensRemoved = {};
  for (const [label, raw] of Object.entries(rawCheck.counts)) {
    tokensRemoved[label] = raw - (postCheck.counts[label] || 0);
  }

  if (args.dryRun) {
    return { slug, result: 'ok', bytesIn, bytesOut: Buffer.byteLength(finalHtml, 'utf8'),
             tokensRemoved, dryRun: true };
  }

  // Write target.
  let outDir;
  if (args.inPlace) {
    if (!args.confirmedDestructive) {
      return { slug, result: 'blocked',
               blockedBy: ['--in-place requires --i-am-sure-this-is-not-recapturable'],
               bytesIn };
    }
    outDir = rawDir;
  } else {
    outDir = path.join(ROOT, args.out, outputSlugFor(slug, args, sanitizeOpts));
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), finalHtml);

  // Copy assets/
  if (!args.noAssets) {
    const srcAssets = path.join(rawDir, 'assets');
    const dstAssets = path.join(outDir, 'assets');
    if (fs.existsSync(srcAssets)) {
      // For in-place, assets are already where they need to be — skip copy.
      if (!args.inPlace) {
        if (fs.existsSync(dstAssets)) fs.rmSync(dstAssets, { recursive: true, force: true });
        copyDirSync(srcAssets, dstAssets);
      }
    }
  }

  // Copy catalog/audit verbatim.
  for (const f of META_FILES_TO_COPY) {
    const s = path.join(rawDir, f);
    if (fs.existsSync(s) && !args.inPlace) fs.copyFileSync(s, path.join(outDir, f));
  }

  // Augment meta.json.
  const rawMetaPath = path.join(rawDir, 'meta.json');
  let meta = {};
  if (fs.existsSync(rawMetaPath)) {
    try { meta = JSON.parse(fs.readFileSync(rawMetaPath, 'utf8')); } catch {}
  }
  const baked = {
    ...meta,
    sanitizeApplied: true,
    sanitizeOptions: sanitizeOpts,
    bakedAt: new Date().toISOString(),
    sourceSnapshot: slug,
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(baked, null, 2));

  return { slug, result: 'ok', bytesIn, bytesOut: Buffer.byteLength(finalHtml, 'utf8'),
           tokensRemoved };
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const slugs = resolveSlugs(args);

  if (args.inPlace && !args.confirmedDestructive) {
    console.error('--in-place requires --i-am-sure-this-is-not-recapturable. Aborting.');
    process.exit(2);
  }

  const outRoot = path.join(ROOT, args.out);
  const reportPath = args.report
    ? path.resolve(args.report)
    : path.join(outRoot, '_bake-report.json');

  console.log(`Baking ${slugs.length} slug(s) → ${args.inPlace ? 'IN-PLACE (' + SNAPSHOTS_DIR + ')' : outRoot}`);
  if (args.dryRun) console.log('(dry run — no files will be written)');

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  const results = [];
  for (const slug of slugs) {
    try {
      const r = await bakeOne(page, slug, args);
      results.push(r);
      const tag = r.result === 'ok' ? 'OK' : r.result.toUpperCase();
      const detail = r.result === 'blocked'
        ? ` — blocked by: ${r.blockedBy.join('; ')}`
        : (r.result === 'ok'
            ? ` (${fmtBytes(r.bytesIn)} → ${fmtBytes(r.bytesOut)})`
            : (r.error ? ` — ${r.error}` : ''));
      console.log(`${tag.padEnd(7)} ${slug.padEnd(34)}${detail}`);
    } catch (e) {
      results.push({ slug, result: 'error', error: e.message });
      console.log(`ERROR  ${slug.padEnd(34)} — ${e.message}`);
    }
  }

  await browser.close();
  server.kill();

  const okCount      = results.filter(r => r.result === 'ok').length;
  const blockedCount = results.filter(r => r.result === 'blocked').length;
  const errorCount   = results.filter(r => r.result !== 'ok' && r.result !== 'blocked').length;

  if (!args.dryRun) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      bakedAt: new Date().toISOString(),
      out: args.inPlace ? 'in-place' : args.out,
      slugs: results,
    }, null, 2));
    console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);
  }
  console.log(`\nDone. ok=${okCount} blocked=${blockedCount} error=${errorCount}`);
  process.exit(blockedCount + errorCount === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
