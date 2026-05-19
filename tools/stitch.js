#!/usr/bin/env node
// Stitch a hybrid video together — render each piece in its own tool, then
// ffmpeg-concat the resulting MP4s into one final file.
//
// Manifest format (videos/<slug>.video.json):
// {
//   "slug": "klaviyo-addon-tutorial",
//   "pieces": [
//     { "kind": "hf",   "path": "videos/klaviyo-addon-tutorial-intro" },
//     { "kind": "html", "path": "videos/klaviyo-addon-tutorial" },
//     { "kind": "hf",   "path": "videos/klaviyo-addon-tutorial-outro" }
//   ],
//   "output": "renders/klaviyo-addon-tutorial.mp4"
// }
//
// Per-piece output discovery (convention):
//   kind=html → videos/<slug>/render/<slug>.mp4  (per tools/render.js)
//   kind=hf   → <piece.path>/renders/<meta.id>.mp4  (per hyperframes render)
//   Both can be overridden with piece.output = "...path/to.mp4"
//
// Usage:
//   node tools/stitch.js <manifest-path>             # render each piece, then concat
//   node tools/stitch.js <manifest-path> --no-render # skip rendering, just concat existing MP4s
//   node tools/stitch.js <manifest-path> --dry-run   # print plan, do nothing
//   node tools/stitch.js <manifest-path> --keep-list # don't delete the ffmpeg concat list.txt

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');

function usage(code = 1) {
  console.error('Usage: node tools/stitch.js <manifest-path> [--no-render] [--dry-run] [--keep-list]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = { manifest: null, render: true, dryRun: false, keepList: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-render') args.render = false;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--keep-list') args.keepList = true;
    else if (a === '-h' || a === '--help') usage(0);
    else if (!args.manifest && !a.startsWith('--')) args.manifest = a;
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.manifest) usage();
  return args;
}

function readManifest(manifestPath) {
  const abs = path.resolve(manifestPath);
  if (!fs.existsSync(abs)) {
    console.error('manifest not found: ' + abs);
    process.exit(1);
  }
  let m;
  try { m = JSON.parse(fs.readFileSync(abs, 'utf8')); }
  catch (e) { console.error('invalid manifest JSON: ' + e.message); process.exit(1); }
  if (!m.pieces || !Array.isArray(m.pieces) || m.pieces.length === 0) {
    console.error('manifest must have a non-empty "pieces" array');
    process.exit(1);
  }
  if (!m.output) {
    console.error('manifest must declare "output"');
    process.exit(1);
  }
  for (const p of m.pieces) {
    if (!p.kind || !p.path) { console.error('every piece needs {kind, path}'); process.exit(1); }
    if (p.kind !== 'hf' && p.kind !== 'html') { console.error('piece.kind must be "hf" or "html", got: ' + p.kind); process.exit(1); }
  }
  return { manifestAbs: abs, manifest: m };
}

function pieceSlug(p) {
  return p.slug || path.basename(path.resolve(ROOT, p.path));
}

function pieceOutputPath(p) {
  if (p.output) return path.resolve(ROOT, p.output);
  const slug = pieceSlug(p);
  if (p.kind === 'html') {
    return path.join(ROOT, p.path, 'render', `${slug}.mp4`);
  }
  // hf — HF writes `<id>_<timestamp>.mp4` (and sometimes also `<id>.mp4`)
  // into <piece>/renders/. Prefer the un-timestamped one if present,
  // otherwise the most recently modified timestamped file.
  const metaPath = path.join(ROOT, p.path, 'meta.json');
  let id = slug;
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.id) id = meta.id;
    } catch (_) {}
  }
  const rendersDir = path.join(ROOT, p.path, 'renders');
  const exact = path.join(rendersDir, `${id}.mp4`);
  if (fs.existsSync(exact)) return exact;
  if (fs.existsSync(rendersDir)) {
    const candidates = fs.readdirSync(rendersDir)
      .filter(f => f.endsWith('.mp4') && f.startsWith(id))
      .map(f => ({ f, mtime: fs.statSync(path.join(rendersDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (candidates.length) return path.join(rendersDir, candidates[0].f);
  }
  return exact; // signal expected path even if missing (caller verifies)
}

function renderPiece(p) {
  const cwd = path.resolve(ROOT, p.path);
  if (!fs.existsSync(cwd)) {
    console.error(`piece path does not exist: ${cwd}`);
    return false;
  }
  console.log(`[stitch] render (${p.kind}) ${p.path}`);
  let cmd, args, spawnCwd = cwd;
  if (p.kind === 'hf') {
    cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    args = ['--yes', 'hyperframes@0.6.16', 'render'];
  } else {
    // html — single-HTML video (no chapter engine, no manifest). Use
    // tools/render-html.js which opens the URL directly and captures
    // frames wall-clock. Manifest can override renderer + duration.
    cmd = process.execPath;
    const renderer = p.renderer || 'tools/render-html.js';
    args = [path.join(ROOT, renderer), pieceSlug(p)];
    if (p.duration) args.push('--duration', String(p.duration));
    spawnCwd = ROOT; // render-html.js needs to be run from repo root
  }
  const r = spawnSync(cmd, args, { cwd: spawnCwd, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[stitch] render failed for ${p.path} (exit ${r.status})`);
    return false;
  }
  return true;
}

function ffmpegConcat(inputs, output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // Write a concat-demuxer list. ffmpeg `concat` demuxer requires identical
  // codecs across all inputs (which our HF + render.js outputs should be —
  // both H.264 / yuv420p / mp4 — but if they ever drift we'll fall back to
  // re-encode mode automatically.)
  const listPath = path.join(os.tmpdir(), `stitch-list-${Date.now()}.txt`);
  const listContent = inputs.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n';
  fs.writeFileSync(listPath, listContent, 'utf8');
  console.log(`[stitch] ffmpeg concat → ${output}`);
  // Try copy first (fast, no re-encode)
  let r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c', 'copy', output,
  ], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.warn('[stitch] copy-concat failed, re-encoding…');
    // Build complex_filter concat (handles codec/timebase mismatch)
    const inArgs = [];
    for (const f of inputs) { inArgs.push('-i', f); }
    const n = inputs.length;
    const filter = inputs.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('') + `concat=n=${n}:v=1:a=1[outv][outa]`;
    r = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      ...inArgs,
      '-filter_complex', filter,
      '-map', '[outv]', '-map', '[outa]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      output,
    ], { stdio: 'inherit' });
  }
  return { ok: r.status === 0, listPath };
}

function main() {
  const args = parseArgs(process.argv);
  const { manifest, manifestAbs } = readManifest(args.manifest);
  console.log(`[stitch] manifest: ${manifestAbs}`);
  console.log(`[stitch] slug: ${manifest.slug || '(none)'}`);
  console.log(`[stitch] pieces:`);
  const expectedOutputs = [];
  for (const p of manifest.pieces) {
    const out = pieceOutputPath(p);
    expectedOutputs.push(out);
    const rel = path.relative(ROOT, out);
    console.log(`  - [${p.kind}] ${p.path} → ${rel}`);
  }
  const finalOut = path.resolve(ROOT, manifest.output);
  console.log(`[stitch] final → ${path.relative(ROOT, finalOut)}`);
  if (args.dryRun) { console.log('[stitch] dry-run; exiting.'); return; }

  // Render each piece (unless --no-render)
  if (args.render) {
    for (const p of manifest.pieces) {
      if (!renderPiece(p)) {
        console.error('[stitch] aborting (render failure).');
        process.exit(2);
      }
    }
  }

  // Verify each output exists before concat
  for (const out of expectedOutputs) {
    if (!fs.existsSync(out)) {
      console.error(`[stitch] missing render output: ${out}`);
      console.error('[stitch] run with rendering enabled, or check the piece.output override.');
      process.exit(3);
    }
  }

  const { ok, listPath } = ffmpegConcat(expectedOutputs, finalOut);
  if (!args.keepList) { try { fs.unlinkSync(listPath); } catch (_) {} }
  if (!ok) {
    console.error('[stitch] ffmpeg concat failed.');
    process.exit(4);
  }
  console.log(`[stitch] OK → ${path.relative(ROOT, finalOut)}`);
}

if (require.main === module) main();

module.exports = { readManifest, pieceOutputPath, pieceSlug, ffmpegConcat };
