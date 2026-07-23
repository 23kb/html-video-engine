#!/usr/bin/env node
// Deterministic SEEK-STEPPED renderer for single-HTML films — the default
// render path for the current architecture (master paused GSAP timeline +
// the __tl / __T0 / __done instrumentation contract).
//
// Why seek-stepping is the default (proven on lights-come-on, 2026-07-20):
//   - Realtime screencast drops frames under load (visible stutter at 4K)
//     and starts recording before the film boots (audio lands early unless
//     trimmed). Seek-stepping renders every frame exactly: pause window.__tl,
//     step tl.time(f/fps, false) — the same mechanism probe-singlehtml.js
//     asserts correctness against — screenshot each frame, assemble at a
//     locked fps. Smoothness and sync are guaranteed by construction.
//   - For quick low-stakes previews the realtime path still exists at
//     tools/render-html.js. The legacy #play/#scrub renderer moved to
//     tools/render-singlehtml-legacy.js.
//
// Hard-won gotchas baked in (see docs/tooling-todo-render-sfx-2026-07-20.md):
//   - Frames are written OUTSIDE the repo (os.tmpdir()): serve.js live-reload
//     watches videos/ and a mid-run reload wipes window.__tl.
//   - --scale 2 (native 4K) works by transform-scaling `#viewport` with the
//     wrap pinned to flex-start. Do NOT use body zoom — Chromium multiplies
//     vw units under zoom and off-centers the standard shell.
//   - The output is GEOMETRY-GATED (ffmpeg cropdetect over sampled frames):
//     Playwright records/screenshots at logical resolution, and two 4K takes
//     silently shipped 1080p content padded into a 4K canvas before this.
//   - If videos/<slug>/sfx/plan.json exists, audio is muxed via
//     tools/sfx/mux.mjs through a temp plan copy pointing at this render
//     (the real plan.json is never mutated). Cue times in the plan are
//     absolute film times, which match MP4 t=0 exactly because frame 0 IS
//     film t=0 here.
//
// Usage:
//   node tools/render-singlehtml.js <slug> [--scale 1] [--fps 30] [--crf 17]
//        [--grain <opacity>] [--duration <s>] [--out <path>] [--no-audio]
//
// Examples:
//   node tools/render-singlehtml.js lights-come-on                 # 1080p + audio
//   node tools/render-singlehtml.js lights-come-on --scale 2 --grain 0.015
//        --out videos/lights-come-on/render/lights-come-on-social-4k.mp4

const fs = require('fs');
const os = require('os');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function parseArgs(argv) {
  const args = { slug: null, scale: 1, fps: 30, crf: 17, grain: null,
    duration: null, out: null, audio: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--scale') args.scale = Number(argv[++i]);
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--crf') args.crf = Number(argv[++i]);
    else if (a === '--grain') args.grain = Number(argv[++i]);
    else if (a === '--duration') args.duration = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--no-audio') args.audio = false;
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
  }
  if (!args.slug) {
    console.error('Usage: node tools/render-singlehtml.js <slug> [--scale 1] [--fps 30] [--crf 17] [--grain <op>] [--duration <s>] [--out <path>] [--no-audio]');
    process.exit(1);
  }
  return args;
}

function probeServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/`, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(750, () => { req.destroy(); resolve(false); });
  });
}

function geometryGate(mp4, W, H, sampleTimes) {
  let maxW = 0, maxH = 0;
  for (const t of sampleTimes) {
    const probe = spawnSync('ffmpeg', [
      '-hide_banner', '-ss', String(t), '-i', mp4,
      '-vframes', '15', '-vf', 'cropdetect=limit=24:round=4',
      '-f', 'null', '-',
    ], { encoding: 'utf8' });
    for (const m of (probe.stderr || '').matchAll(/crop=(\d+):(\d+):/g)) {
      maxW = Math.max(maxW, Number(m[1]));
      maxH = Math.max(maxH, Number(m[2]));
    }
  }
  return { ok: maxW >= W * 0.9 && maxH >= H * 0.9, maxW, maxH };
}

/* Colour gate — the sibling of the geometry gate above.
   Symptom it guards (Umair, 2026-07-23): "whenever it gets rendered, the video
   becomes so white/white-ish/bright."
   Cause: frames are captured as JPEG, which is full-range YCbCr. ffmpeg keeps
   that range, silently promotes the requested `yuv420p` to `yuvj420p`, and
   emits color_range=pc with color_space=bt470bg and NO transfer/primaries.
   Players that assume limited-range BT.709 for H.264 — which is nearly all of
   them, and every social platform — then remap the midtones and the picture
   reads washed out. Fix is in the encode below: convert through RGB to
   BT.709 limited range and tag it. This gate fails the render if the tags
   ever regress. */
function colourGate(mp4) {
  const p = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=pix_fmt,color_range,color_space,color_primaries,color_transfer',
    '-of', 'default=noprint_wrappers=1:nokey=0', mp4,
  ], { encoding: 'utf8' });
  const got = Object.fromEntries((p.stdout || '').trim().split(/\r?\n/)
    .map((l) => l.split('=')));
  const want = { pix_fmt: 'yuv420p', color_range: 'tv', color_space: 'bt709',
                 color_primaries: 'bt709', color_transfer: 'bt709' };
  const bad = Object.entries(want).filter(([k, v]) => got[k] !== v)
    .map(([k, v]) => `${k}=${got[k] || 'unset'} (want ${v})`);
  return { ok: bad.length === 0, bad, got };
}

async function main() {
  const args = parseArgs(process.argv);
  const W = 1920 * args.scale, H = 1080 * args.scale;
  const out = args.out
    ? path.resolve(args.out)
    : path.join(REPO_ROOT, 'videos', args.slug, 'render',
        `${args.slug}${args.scale > 1 ? `-${H}p` : ''}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (!(await probeServer())) {
    console.error(`serve.js not running on port ${PORT}. Start it first: \`node serve.js\``);
    process.exit(2);
  }

  // frames OUTSIDE the repo — serve.js live-reload watches videos/ and a
  // mid-run reload wipes window.__tl
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `render-${args.slug}-`));

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  let frames = 0;
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const scale = args.scale;
    await page.addInitScript((s) => {
      document.addEventListener('DOMContentLoaded', () => {
        // hide the preview-audio "click for sound" pill from the recording
        const st = document.createElement('style');
        st.textContent = 'body > div[style*="z-index:120"] { display: none !important; }';
        document.head.appendChild(st);
        if (s > 1) {
          // scale the standard single-HTML shell to fill the big viewport.
          // NOT body zoom — this Chromium multiplies vw units under zoom
          // and off-centers the wrap. Top frame only (iframes lack the shell).
          const wrap = document.querySelector('.viewport-wrap');
          const v = document.getElementById('viewport');
          if (wrap && v) {
            wrap.style.justifyContent = 'flex-start';
            wrap.style.alignItems = 'flex-start';
            v.style.transform = `scale(${s})`;
            v.style.transformOrigin = '0 0';
          }
        }
      });
    }, scale);

    await page.goto(`${BASE}/videos/${encodeURIComponent(args.slug)}/index.html`,
      { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__tl, undefined,
      { polling: 100, timeout: 60000 });
    if (scale > 1) {
      const shellOk = await page.evaluate(() =>
        !!(document.querySelector('.viewport-wrap') && document.getElementById('viewport')));
      if (!shellOk) {
        console.error('[render] --scale needs the standard shell (.viewport-wrap + #viewport) — not found.');
        process.exit(3);
      }
    }
    const dur = args.duration || await page.evaluate((g) => {
      window.__tl.pause();
      if (g != null) {
        const gr = document.getElementById('grain');
        if (gr) gr.style.opacity = String(g);
      }
      return window.__tl.duration();
    }, args.grain);
    if (args.duration) await page.evaluate((g) => {
      window.__tl.pause();
      if (g != null) {
        const gr = document.getElementById('grain');
        if (gr) gr.style.opacity = String(g);
      }
    }, args.grain);

    frames = Math.round(dur * args.fps);
    console.log(`[render] ${args.slug} — ${frames} frames @ ${args.fps}fps, ${W}x${H}, crf ${args.crf}${args.grain != null ? `, grain ${args.grain}` : ''}`);
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => { window.__tl.time(t, false); }, f / args.fps);
      await page.screenshot({
        path: path.join(TMP, `f${String(f).padStart(5, '0')}.jpg`),
        type: 'jpeg', quality: 95,
      });
      if (f > 0 && f % 300 === 0) {
        const rate = f / ((Date.now() - t0) / 1000);
        const eta = (frames - f) / rate / 60;
        console.log(`[render] ${f}/${frames} (${rate.toFixed(1)} fps capture, ~${eta.toFixed(1)} min left)`);
      }
    }
    console.log(`[render] captured ${frames} frames in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  } finally {
    await browser.close();
  }

  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(args.fps), '-i', path.join(TMP, 'f%05d.jpg'),
    /* Colour-correct delivery encode (see colourGate above for the bug).
       Route through rgb24 first: the JPEG frames are full-range BT.601, and
       decoding to RGB removes every ambiguity about the input matrix before
       swscale converts to BT.709 limited range. Without this the output is
       yuvj420p/pc/bt470bg and reads washed out on any player that assumes
       limited-range H.264 (i.e. essentially all of them). */
    /* scale sets the matrix + range on the frame but leaves primaries and
       transfer unspecified, so the encoder writes VUI with them unset and the
       file is still under-tagged. setparams stamps all four. */
    '-vf', 'format=rgb24,scale=out_color_matrix=bt709:out_range=limited,' +
           'format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:' +
           'colorspace=bt709:range=tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-color_range', 'tv',
    '-movflags', '+faststart',
    out,
  ], { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  if (r.status !== 0) { console.error('[render] ffmpeg failed'); process.exit(1); }

  const durS = frames / args.fps;
  const gate = geometryGate(out, W, H, [durS * 0.35, durS * 0.55, durS * 0.75]);
  if (!gate.ok) {
    console.error(`[render] GEOMETRY CHECK FAILED: content ${gate.maxW}x${gate.maxH} of ${W}x${H} — padded/misplaced frame, do not ship`);
    process.exit(4);
  }
  console.log(`[render] geometry OK (${gate.maxW}x${gate.maxH} of ${W}x${H}) → ${path.relative(REPO_ROOT, out)}`);

  const col = colourGate(out);
  if (!col.ok) {
    console.error(`[render] COLOUR CHECK FAILED: ${col.bad.join(', ')} — the file will read washed out, do not ship`);
    process.exit(5);
  }
  console.log('[render] colour OK (yuv420p, bt709 primaries/transfer/matrix, tv range)');

  // ── audio: mux the film's sfx plan onto this render (temp plan copy —
  //    the real plan.json is never mutated) ──
  const planPath = path.join(REPO_ROOT, 'videos', args.slug, 'sfx', 'plan.json');
  if (args.audio && fs.existsSync(planPath)) {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const outRel = path.relative(REPO_ROOT, out).replace(/\\/g, '/');
    plan.mp4 = outRel;
    plan.out = outRel.replace(/\.mp4$/, '-with-audio.mp4');
    const tmpPlan = planPath.replace(/plan\.json$/, '.plan-render.json');
    fs.writeFileSync(tmpPlan, JSON.stringify(plan, null, 2));
    const m = spawnSync('node', [path.join(__dirname, 'sfx', 'mux.mjs'),
      '--video', args.slug, '--plan', tmpPlan], { stdio: 'inherit' });
    fs.unlinkSync(tmpPlan);
    if (m.status !== 0) { console.error('[render] mux failed'); process.exit(1); }
    console.log(`[render] OK → ${plan.out}`);
  } else {
    console.log(`[render] OK (video only${args.audio ? ', no sfx/plan.json' : ''}) → ${path.relative(REPO_ROOT, out)}`);
  }
}

main().catch(err => { console.error('[render] fatal:', err.message); process.exit(1); });
