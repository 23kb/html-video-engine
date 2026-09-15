#!/usr/bin/env node
// render-singlehtml-audio.js — MP4 export WITH AUDIO for single-HTML videos.
//
// tools/render-html.js renders a single-HTML video to silent MP4. This adds the
// audio: it records the real run, reads the narration SCHEDULE the page emits,
// lays each narration clip at its cue time, and mixes a low, side-chain-DUCKED
// BGM under it. Promoted from the one-off capture/_tmp/export-eei.mjs (ISSUES
// #11) into a reusable tool.
//
// ── Instrumentation contract (the video's play() must provide) ───────────────
//   window.__T0    = performance.now() at the instant play() starts.
//   window.__sched = array of { key, t } — one per narration cue; `key` is the
//                    clip basename, `t` is seconds since __T0 (push as you say()).
//   window.__dur   = total play() duration in seconds.
//   window.__done  = true once play() finishes.
// Narration audio: videos/<slug>/narration/<key>.mp3 (missing keys are skipped
// with a warning). The render runs in REAL TIME (recording is wall-clock).
//
// Determinism note: the page itself must be deterministic (INV-9); this tool
// only records + muxes. Uncovered keys / missing BGM degrade gracefully.
//
// Audio mix (matches the EEI reference): narration clips adelay'd to cue, amix'd;
// BGM trimmed + lowered + side-chain-compressed under the narration (ducking);
// final narration+ducked-BGM mix through an alimiter against clipping.
//
// ── BGM level: derivation + the post-render check (fix-round C1, 2026-08-17) ──
// Default --bgm-volume 0.32, derived by MEASUREMENT of the approved mixes, not
// prose (ccs 25: never port a number between volume systems unmeasured — the
// old 0.055 came from an engine-side volume:0.03 scale and shipped the bed
// inaudible at −35 to −47 dB on every video that forgot to override).
//
// Approved-mix bed-only RMS (outro window, dur−4..dur−1) + speech window,
// measured 2026-08-17:
//   short A                   (r5, 0.17, bed 8)  bed −27.6 dB  speech −16.1 dB
//   short B                                      bed −31.6 dB  speech −18.6 dB
//   short C                                      bed −31.5 dB  speech −15.0 dB
//   short D                   (0.32, bed 5)      bed −18.3 dB  speech −16.2 dB
//   short E                   (0.32, bed 1)      bed −18.8 dB  speech −17.2 dB
//   long-form tutorial        (0.12, long-form)  bed −31.6 dB  speech −24.4 dB
// Beds: bgms/1 −11.70 LUFS · 2 −9.77 · 3 −18.16 · 4 −9.52 · 5 −11.78 ·
//       6 −13.27 · 7 −14.13 · 8 −13.95 (file-average; sections vary ±5 dB).
//
// RULED by Umair 2026-08-22 (README decision 6): the −27 band is the shorts
// standard. The bands had genuinely disagreed — sfb-era −27 vs the nvc/cc
// −18 to −19 on 0.32 — and the ruling moves the default to the quieter band:
//   shorts / ad-energy (DEFAULT): 0.17 — reproduces the approved
//     stop-fast-bots setting (0.17, bed 8 → bed-only −27.6 dB). Measured
//     bed-only RMS varies with TRACK SECTION and bed loudness (beds span
//     −9.5 to −18.2 LUFS): expect ≈ −23 to −28 dB in loud sections, lower in
//     quiet intros. Judge each window against its section, not one absolute
//     number — and measure every mix (rulebook: never ship the tool default
//     unmeasured).
//   the old −18/−19 band: pass `--bgm-volume 0.32` explicitly if a spot
//     truly needs the louder nvc/cc-era mix. No longer the default.
//   tutorial / long-form: pass `--bgm-volume 0.12` → bed-only ≈ −29 to −31 dB
//     (the approved custom-css level). NOT the default — override explicitly.
//
// Post-render check (STANDING — run it, don't assert; or pass --print-mix):
//   bed-only window:  ffmpeg -ss <dur-4> -t 3 -i out.mp4 -af astats=metadata=1 -f null -
//   speech window:    ffmpeg -ss <mid-speech t> -t 3 -i out.mp4 -af astats=…
//   read "RMS level dB"; targets: bed-only in the band above for your path,
//   speech ≈ −15 to −20 dB. Ducking check (sfb 34): sample the mix in 0.18s
//   steps across a clip boundary — both sides bed-only — to see the
//   compressor's release curve directly (reference: −37 dB under voice
//   recovering to −27 dB within ~200ms at ratio 8:1, release 350ms).
//
// ⚠ Whether the mix/ducking SOUNDS right is the user's call — this tool does not
//   and cannot judge audio quality. It guarantees streams + duration, not taste.
//
// Usage:
//   node tools/render-singlehtml-audio.js <slug>
//   node tools/render-singlehtml-audio.js <slug> --bgm bgms/2.mp3 --bgm-volume 0.05
//   node tools/render-singlehtml-audio.js <slug> --bgm none           # narration only
//   node tools/render-singlehtml-audio.js <slug> --out /tmp/test.mp4 --max-seconds 200
//   node tools/render-singlehtml-audio.js <slug> --resolution 1080x1920   # portrait short
//
// Resolution defaults to the page's own `.stage` box (tools/stage-size.js), so a
// portrait video renders portrait with no flag; --resolution overrides.
//
// ── Audio truth: the whole-second pad (AP-18, ruled 2026-08-28) ─────────────
// The audio track is laid on DUR = ceil(__dur + 0.25) seconds (apad whole_dur
// in the filtergraph), so the MP4 can outlast the film's last frame by up to
// ~1.25s. A "frozen tail" flagged INSIDE that pad — by dead-time.js, or by a
// video ≥ audio check — is the pad, not a defect (senw 6; fan: the 47.4s
// "freeze" was the pad). The real check is "no frozen tail under LIVE audio",
// satisfied by an outro that keeps moving through the pad. Only narration cues
// in __sched reach the MP4: in-page SFX_CUES / sfxCue() previews and a
// BGM_PREVIEW bed never do — sound design ships via sfx/plan.json +
// tools/sfx/mux.mjs (tools/sfx/CONTEXT.md).
//
// Exit: 0 ok · 1 failure · 2 not instrumented · 3 usage.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { resolveResolution } = require('./stage-size');

const REPO = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};

// Ducking + level constants (from the EEI reference; tunable via flags).
const DUCK = { threshold: 0.025, ratio: 8, attack: 15, release: 350 };
const LIMIT = 0.95;

function parseArgs(argv) {
  const a = argv.slice(2);
  // bgmVolume default 0.17: the −27 dB shorts band, ruled by Umair 2026-08-22
  // (reproduces the approved stop-fast-bots mix) — see the derivation block in
  // the header. Long-form passes --bgm-volume 0.12 explicitly.
  const out = { slug: null, bgm: undefined, bgmVolume: 0.17, outPath: null, maxSeconds: 200, query: null, resolution: null, printMix: false, hd: true };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === '--resolution') out.resolution = a[++i];
    // HD is the DEFAULT (Umair ruling 2026-09-03): the Playwright screencast source is
    // soft at 1×, so we capture at deviceScaleFactor 2 with a 2× recording canvas and
    // downscale in ffmpeg (lanczos) at crf 16/slow. --no-hd restores the old fast path
    // (1× capture, default encode) for debugging or constrained machines.
    else if (x === '--hd') out.hd = true;
    else if (x === '--no-hd') out.hd = false;
    else if (x === '--bgm') out.bgm = a[++i];
    else if (x === '--bgm-volume') out.bgmVolume = Number(a[++i]);
    else if (x === '--print-mix') out.printMix = true;
    else if (x === '--out') out.outPath = a[++i];
    else if (x === '--max-seconds') out.maxSeconds = Number(a[++i]);
    // --query <str>: extra URL query for the page (e.g. "skip=postintro" to
    // render a cut without the postIntro). ?scene= is a REVIEW affordance and
    // still must not be used here — this is for deliverable variants.
    else if (x === '--query') out.query = String(a[++i]).replace(/^\?/, '');
    else if (!x.startsWith('--') && !out.slug) out.slug = x;
  }
  return out;
}

// Build the ffmpeg filtergraph from the clip schedule + BGM presence.
// Returns { fc, outLabel } — outLabel null means "no audio track".
function buildFilter(clips, DUR, hasBgm, bgmIdx, bgmVolume) {
  const clipCount = clips.length;
  if (clipCount === 0 && !hasBgm) return { fc: null, outLabel: null };
  let fc = '';
  let narr = null;
  if (clipCount >= 1) {
    // delay each narration clip to its cue time, pad to full duration (adelay
    // is the reliable in-filtergraph delay; matches the EEI reference)
    for (let i = 0; i < clipCount; i++) {
      const ms = Math.round(clips[i].t * 1000);
      fc += `[${i + 1}:a]adelay=${ms}|${ms},apad=whole_dur=${DUR}[a${i}];`;
    }
    if (clipCount === 1) {
      narr = 'a0';
    } else {
      for (let i = 0; i < clipCount; i++) fc += `[a${i}]`;
      fc += `amix=inputs=${clipCount}:normalize=0:duration=longest[narr];`;
      narr = 'narr';
    }
  }
  const d = `threshold=${DUCK.threshold}:ratio=${DUCK.ratio}:attack=${DUCK.attack}:release=${DUCK.release}`;
  if (clipCount >= 1 && hasBgm) {
    fc += `[${narr}]asplit=2[narrA][narrSC];`;
    fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume}[bglow];`;
    fc += `[bglow][narrSC]sidechaincompress=${d}[bgduck];`;
    fc += `[narrA][bgduck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  if (clipCount >= 1) { // narration only
    fc += `[${narr}]alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  // BGM only
  fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume},alimiter=limit=${LIMIT}[aout]`;
  return { fc, outLabel: 'aout' };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/render-singlehtml-audio.js <slug> [--bgm <path>|none] [--bgm-volume N] [--out <path>] [--max-seconds N] [--resolution WxH] [--print-mix]');
    process.exit(3);
  }
  const indexPath = path.join(REPO, 'videos', args.slug, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`No single-HTML video at videos/${args.slug}/index.html`);
    process.exit(1);
  }

  // Resolve BGM: default bgms/1.mp3 if present; --bgm none disables; --bgm <p> overrides.
  let bgm = null;
  if (args.bgm === 'none') bgm = null;
  else if (args.bgm) bgm = path.isAbsolute(args.bgm) ? args.bgm : path.join(REPO, args.bgm);
  else { const def = path.join(REPO, 'bgms', '1.mp3'); if (fs.existsSync(def)) bgm = def; }
  if (bgm && !fs.existsSync(bgm)) { console.error(`BGM not found: ${bgm}`); process.exit(1); }

  const outPath = args.outPath
    ? (path.isAbsolute(args.outPath) ? args.outPath : path.join(REPO, args.outPath))
    : path.join(REPO, 'videos', args.slug, 'render', `${args.slug}.mp4`);

  // ── static server ──
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    let fp = path.join(REPO, p);
    try { if (fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html'); } catch (_) {}
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end('404 ' + p); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, r));
  const PORT = server.address().port;
  const url = `http://localhost:${PORT}/videos/${args.slug}/index.html`
    + (args.query ? `?${args.query}` : '');
  console.log(`[audio-export] ${args.slug} — serving on ${PORT}`);

  const tmpDir = path.join(REPO, 'tools', `.rec-${process.pid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Resolution follows the page's own .stage box unless --resolution overrides,
  // so a portrait short records portrait without anyone remembering a flag.
  const res = resolveResolution({
    resolutionArg: args.resolution,
    htmlPath: path.join(REPO, 'videos', args.slug, 'index.html'),
  });
  console.log(`[audio-export] resolution ${res.width}x${res.height} (${res.source})`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: res.width, height: res.height }, deviceScaleFactor: args.hd ? 2 : 1, reducedMotion: 'no-preference',
    // HD: capture at 2× device pixels but record at TARGET size — the recorder's
    // downscale from the 2× raster is the supersample. (Measured 2026-09-03: a 2×
    // recording canvas spreads the screencast's VP8 bitrate over 4× pixels and comes
    // out SOFTER — 4.3MB vs 7.4MB on the same film. Don't enlarge the canvas.)
    recordVideo: { dir: tmpDir, size: { width: res.width, height: res.height } },
  });
  // The screencast attaches to the PAGE, so the recording's time origin is when newPage() resolves —
  // not context creation. Measuring from before newPage() over-trimmed every film by the page
  // boot (~0.45s measured 2026-09-04: the Sullie sting never reached the MP4).
  const page = await ctx.newPage();
  const recStart = Date.now();

  let info, webm, O;
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction('window.__T0 != null', { timeout: 15000 });
    } catch (_) {
      await ctx.close(); await browser.close(); server.close();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      console.error(`[audio-export] ${args.slug} is not instrumented (window.__T0 never set).`);
      console.error('  play() must set __T0 / push {key,t} to __sched / set __dur / set __done. See this file\'s header.');
      process.exit(2);
    }
    const t0Wall = await page.evaluate(() => performance.timeOrigin + window.__T0);
    // The screencast's first frame lands a measured, stable ~0.17s after newPage() resolves
    // (videos/_qc-sync-marker: a burned-in clock page rendered 3× HD+SD read t=0.16–0.18 at video
    // t=0 with O≈0). Trimming the webm by the raw (__T0 − recStart) therefore over-cut every film
    // by ~0.17s (the Sullie sting never reached the MP4; SFX/narration cues landed that much late).
    // Re-measure with: node tools/render-singlehtml-audio.js _qc-sync-marker --bgm none --out /tmp/x.mp4
    const SCREENCAST_START_LATENCY = 0.17;
    O = Math.max(0, (t0Wall - recStart) / 1000 - SCREENCAST_START_LATENCY); // load-in seconds between the first recorded frame and play()

    console.log('[audio-export] running in real time…');
    info = null;
    const start = Date.now();
    while (Date.now() - start < args.maxSeconds * 1000) {
      info = await page.evaluate(() => window.__done ? { sched: window.__sched || [], dur: window.__dur } : null);
      if (info) break;
      await page.waitForTimeout(500);
    }
    if (!info) info = await page.evaluate(() => ({ sched: window.__sched || [], dur: (performance.now() - window.__T0) / 1000 }));
    webm = await page.video().path();
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }

  const DUR = Math.ceil((info.dur || 0) + 0.25); // whole-second pad — see header "Audio truth"
  const narrDir = path.join(REPO, 'videos', args.slug, 'narration');
  const all = (info.sched || []).filter(s => s && s.key);
  const clips = all
    .map(s => ({ key: s.key, t: s.t, file: path.join(narrDir, `${s.key}.mp3`) }))
    .filter(c => fs.existsSync(c.file));
  const missing = all.filter(s => !fs.existsSync(path.join(narrDir, `${s.key}.mp3`))).map(s => s.key);
  console.log(`[audio-export] load-in O=${O.toFixed(2)}s  dur=${DUR}s  clips=${clips.length}/${all.length}  bgm=${bgm ? path.relative(REPO, bgm) : 'none'}`);
  if (missing.length) console.log(`[audio-export] WARN missing narration mp3s (skipped): ${missing.join(', ')}`);

  // ── ffmpeg inputs ──
  // [0]=video (trimmed by load-in O), [1..N]=narration clips (delayed in-filter
  // via adelay), [N+1]=bgm.
  const inputs = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', O.toFixed(3), '-i', webm];
  clips.forEach(c => inputs.push('-i', c.file));
  if (bgm) inputs.push('-i', bgm);
  const bgmIdx = clips.length + 1;

  const { fc, outLabel } = buildFilter(clips, DUR, !!bgm, bgmIdx, args.bgmVolume);

  const ff = [...inputs];
  if (fc) ff.push('-filter_complex', fc, '-map', '0:v', '-map', `[${outLabel}]`);
  else ff.push('-map', '0:v', '-an');
  ff.push(
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30',
    ...(args.hd ? ['-crf', '16', '-preset', 'slow'] : []),
    ...(outLabel ? ['-c:a', 'aac', '-b:a', '192k'] : []),
    '-movflags', '+faststart', '-t', String(DUR), outPath
  );

  console.log('[audio-export] muxing…');
  const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  if (r.status !== 0) { console.error('[audio-export] ffmpeg FAILED'); process.exit(1); }

  const sz = (fs.statSync(outPath).size / 1e6).toFixed(1);
  console.log(`[audio-export] DONE → ${path.relative(REPO, outPath)}  (${sz} MB, ${DUR}s${outLabel ? ', +audio' : ', video-only'})`);
  console.log('[audio-export] ⚠ audio mix/ducking quality is the user\'s call — not verified by this tool.');

  // --print-mix: the standing post-render astats check, automated (C1).
  // Tail window (usually outro = bed-only) + a mid window (usually speech).
  if (args.printMix && outLabel) {
    const win = (ss) => {
      const r2 = spawnSync('ffmpeg', ['-ss', String(ss), '-t', '3', '-i', outPath, '-af', 'astats=metadata=1', '-f', 'null', '-'], { encoding: 'utf8' });
      const m = (r2.stderr || '').match(/RMS level dB:\s*([-\d.]+)/);
      return m ? Number(m[1]) : null;
    };
    const tail = win(Math.max(0, DUR - 4));
    const mid = win(Math.max(0, DUR * 0.35));
    console.log(`[audio-export] mix check: tail(bed-only?) ${tail == null ? 'n/a' : tail.toFixed(1) + ' dB'} · mid(speech?) ${mid == null ? 'n/a' : mid.toFixed(1) + ' dB'}`);
    console.log('[audio-export]   targets: bed-only −23..−28 dB section-dependent (shorts/ad default 0.17, ruled 2026-08-22) or −29..−31 dB (long-form 0.12); speech −15..−20 dB. Below −35 dB = inaudible. See header for the full procedure.');
  }
}

main().catch(e => { console.error('[audio-export]', e && e.message || e); process.exit(1); });
