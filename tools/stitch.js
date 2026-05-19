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
//   node tools/stitch.js <manifest-path>                   # render each piece, then concat with 0.3s xfade
//   node tools/stitch.js <manifest-path> --no-render       # skip rendering, just concat existing MP4s
//   node tools/stitch.js <manifest-path> --dry-run         # print plan, do nothing
//   node tools/stitch.js <manifest-path> --xfade <seconds> # crossfade duration between pieces (default 0.3)
//   node tools/stitch.js <manifest-path> --no-xfade        # hard cut between pieces (equivalent to --xfade 0)
//   node tools/stitch.js <manifest-path> --fps <n>         # output framerate (default 30)
//   node tools/stitch.js <manifest-path> --resolution WxH  # output resolution (default 1920x1080)
//
// The manifest can override CLI flags via top-level "xfade", "fps", "resolution" fields.
//
// Self-test (from repo root, assumes two existing MP4s exist):
//   node tools/stitch.js videos/klaviyo-addon-tutorial.video.json --no-render --dry-run
//   # then with --no-render to verify ffprobe + concat against the real outputs

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_XFADE = 0.3;
const DEFAULT_FPS = 30;
const DEFAULT_RESOLUTION = '1920x1080';

function usage(code = 1) {
  console.error('Usage: node tools/stitch.js <manifest-path> [--no-render] [--dry-run] [--xfade <s>] [--no-xfade] [--fps <n>] [--resolution WxH]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    manifest: null,
    render: true,
    dryRun: false,
    xfade: DEFAULT_XFADE,
    fps: DEFAULT_FPS,
    resolution: DEFAULT_RESOLUTION,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-render') args.render = false;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-xfade') args.xfade = 0;
    else if (a === '--xfade') args.xfade = Number(argv[++i]);
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--resolution') args.resolution = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (!args.manifest && !a.startsWith('--')) args.manifest = a;
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.manifest) usage();
  if (!Number.isFinite(args.xfade) || args.xfade < 0) { console.error('--xfade must be >= 0'); usage(); }
  if (!Number.isFinite(args.fps) || args.fps <= 0) { console.error('--fps must be > 0'); usage(); }
  return args;
}

function parseResolution(s) {
  const m = /^(\d+)x(\d+)$/i.exec(String(s).trim());
  if (!m) throw new Error('invalid resolution: ' + s);
  return { width: Number(m[1]), height: Number(m[2]) };
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

function ffprobeJSON(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_streams', '-show_format',
    '-of', 'json',
    file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr || ''}`);
  return JSON.parse(r.stdout || '{}');
}

function probePieces(inputs) {
  return inputs.map(file => {
    const info = ffprobeJSON(file);
    const vStream = (info.streams || []).find(s => s.codec_type === 'video');
    const aStream = (info.streams || []).find(s => s.codec_type === 'audio');
    const duration = Number(info.format && info.format.duration) || Number(vStream && vStream.duration) || 0;
    return { file, duration, hasVideo: !!vStream, hasAudio: !!aStream };
  });
}

function ffmpegConcat(inputs, output, opts = {}) {
  const { xfade = DEFAULT_XFADE, fps = DEFAULT_FPS, resolution = DEFAULT_RESOLUTION } = opts;
  const { width, height } = parseResolution(resolution);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  // Probe each piece for duration + audio presence so we can build the xfade
  // chain (xfade offsets are absolute timestamps on the accumulated stream).
  const pieces = probePieces(inputs);
  const n = pieces.length;
  if (n === 0) return { ok: false };

  console.log(`[stitch] pieces (probed):`);
  for (const p of pieces) {
    console.log(`  - ${path.relative(ROOT, p.file)}  dur=${p.duration.toFixed(2)}s  audio=${p.hasAudio}`);
  }
  console.log(`[stitch] ffmpeg → ${output} (xfade=${xfade}s, fps=${fps}, ${width}x${height})`);

  // Single-piece case: just re-encode to matched params (no concat needed).
  if (n === 1) {
    const r = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', pieces[0].file,
      '-vf', `scale=${width}:${height}:flags=lanczos,fps=${fps},format=yuv420p`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      ...(pieces[0].hasAudio ? ['-c:a', 'aac', '-b:a', '192k'] : []),
      output,
    ], { stdio: 'inherit' });
    return { ok: r.status === 0 };
  }

  // Validate xfade fits within each adjacent pair (xfade can't exceed the
  // shorter of the two; clamp instead of fail so we don't surprise a render).
  const minNeighbour = Math.min(...pieces.map(p => p.duration));
  const effectiveXfade = Math.min(xfade, Math.max(0, minNeighbour - 0.05));
  if (xfade > 0 && effectiveXfade < xfade) {
    console.warn(`[stitch] xfade clamped from ${xfade}s to ${effectiveXfade.toFixed(2)}s (shortest piece is ${minNeighbour.toFixed(2)}s)`);
  }

  const allHaveAudio = pieces.every(p => p.hasAudio);
  if (!allHaveAudio && pieces.some(p => p.hasAudio)) {
    console.warn('[stitch] mixed audio presence across pieces — audio will be dropped to avoid sync drift.');
  }

  const inArgs = [];
  for (const p of pieces) inArgs.push('-i', p.file);

  // Per-input video pre-filter: normalize scale/fps/format so xfade can chain.
  const vPrep = pieces.map((_, i) => `[${i}:v:0]scale=${width}:${height}:flags=lanczos,fps=${fps},format=yuv420p,setpts=PTS-STARTPTS[v${i}p]`).join(';');

  let filter;
  let outV, outA;

  if (effectiveXfade > 0) {
    // Build the xfade chain. Each xfade reduces the running total by `xfade`s.
    // offset for xfade k is: sum(pieces[0..k].duration) - (k+1) * xfade
    let runningOffset = pieces[0].duration - effectiveXfade;
    const chain = [];
    let prevV = 'v0p';
    for (let k = 1; k < n; k++) {
      const outLabel = (k === n - 1) ? 'vout' : `vx${k}`;
      chain.push(`[${prevV}][v${k}p]xfade=transition=fade:duration=${effectiveXfade}:offset=${runningOffset.toFixed(3)}[${outLabel}]`);
      prevV = outLabel;
      runningOffset += pieces[k].duration - effectiveXfade;
    }
    filter = vPrep + ';' + chain.join(';');
    outV = '[vout]';

    if (allHaveAudio) {
      // acrossfade chain mirrors xfade.
      const aChain = [];
      let prevA = '0:a:0';
      for (let k = 1; k < n; k++) {
        const outLabel = (k === n - 1) ? 'aout' : `ax${k}`;
        aChain.push(`[${prevA}][${k}:a:0]acrossfade=d=${effectiveXfade}[${outLabel}]`);
        prevA = outLabel;
      }
      filter = filter + ';' + aChain.join(';');
      outA = '[aout]';
    }
  } else {
    // Hard-cut: concat filter (still re-encodes — drops `-c copy`).
    const concatInputs = pieces.map((_, i) => allHaveAudio ? `[v${i}p][${i}:a:0]` : `[v${i}p]`).join('');
    filter = vPrep + ';' + concatInputs + `concat=n=${n}:v=1:a=${allHaveAudio ? 1 : 0}` + (allHaveAudio ? '[vout][aout]' : '[vout]');
    outV = '[vout]';
    if (allHaveAudio) outA = '[aout]';
  }

  const ffmpegArgs = [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inArgs,
    '-filter_complex', filter,
    '-map', outV,
    ...(outA ? ['-map', outA] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    ...(outA ? ['-c:a', 'aac', '-b:a', '192k'] : []),
    output,
  ];

  const r = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
  return { ok: r.status === 0 };
}

function main() {
  const args = parseArgs(process.argv);
  const { manifest, manifestAbs } = readManifest(args.manifest);
  console.log(`[stitch] manifest: ${manifestAbs}`);
  console.log(`[stitch] slug: ${manifest.slug || '(none)'}`);

  // Manifest fields override CLI flags only when CLI used defaults (i.e. the
  // user didn't pass --xfade/--fps/--resolution on the command line). The
  // simpler "manifest always wins" rule is fine for now; revisit if a user
  // ever needs to override a manifest from the CLI.
  const xfade = (typeof manifest.xfade === 'number') ? manifest.xfade : args.xfade;
  const fps = (typeof manifest.fps === 'number') ? manifest.fps : args.fps;
  const resolution = manifest.resolution || args.resolution;

  console.log(`[stitch] pieces:`);
  const expectedOutputs = [];
  for (const p of manifest.pieces) {
    const out = pieceOutputPath(p);
    expectedOutputs.push(out);
    const rel = path.relative(ROOT, out);
    console.log(`  - [${p.kind}] ${p.path} → ${rel}`);
  }
  const finalOut = path.resolve(ROOT, manifest.output);
  console.log(`[stitch] final → ${path.relative(ROOT, finalOut)} (xfade=${xfade}s, fps=${fps}, ${resolution})`);
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

  const { ok } = ffmpegConcat(expectedOutputs, finalOut, { xfade, fps, resolution });
  if (!ok) {
    console.error('[stitch] ffmpeg concat failed.');
    process.exit(4);
  }
  console.log(`[stitch] OK → ${path.relative(ROOT, finalOut)}`);
}

if (require.main === module) main();

module.exports = { readManifest, pieceOutputPath, pieceSlug, ffmpegConcat };
