#!/usr/bin/env node
// Full-track dead-time scan of a rendered MP4 — the measured form of the
// idle-motion rule (D1) and the doctrine pause test.
//
// Decodes EVERY frame at low resolution, computes the mean absolute
// difference (MAD) between consecutive frames, and reports runs of
// no-change frames with a taxonomy:
//
//   comma        <= 0.45s   stillness-before-climax; correct if intentional
//   borderline   <= 1.00s   look at it; long for an ad-energy beat
//   PLANNING BUG >  1.00s   the film has stopped — fix the beat, not the hold
//
//   A PLANNING BUG verdict is WITHHELD when either second opinion disagrees:
//   full-res freezedetect not confirming the freeze, or a per-quadrant
//   re-measure finding a quadrant still changing. At a 270px diff width a
//   counter digit is sub-pixel and a 30px cursor is ~4px, so a film whose back
//   half is small-area motion scored 58.2% dead while moving almost
//   continuously (rf-weight 28). --fail-over ignores withheld runs too.
//
// Also catches flat/frozen render defects for free: a run in the middle of
// what should be a moving beat is a frozen-video or gating bug, and a
// single-frame spike-to-black shows up as two high-MAD frames around it.
//
// Frozen and jump-cut are OPPOSITE failures; this tool reports both:
//   - a freezedetect cross-check (second ffmpeg pass, FULL resolution) splits
//     every reported run into CONFIRMED-FROZEN (truly zero motion) vs
//     SUB-METER (motion exists that the 270px diff cannot see) — the split
//     that turned a 45-false-positive report into a readable one (ccs 27).
//   - a hard-cut check flags isolated single-frame diff spikes (as 13: a
//     jump-cut shipped while the seam check called the spike "motion").
//     Calibration (a long-form render, 2026-08-17): a real hard cut
//     measured YAVG 22.8 with neighbors at 0.05/0.69 — one isolated spike;
//     fast tweened motion (flipBridge-class) sustains YAVG 5-20 across many
//     CONSECUTIVE frames. So a CUT? marker needs BOTH: YAVG >= --cut-threshold
//     (default 10) AND both neighbors below a third of it.
//
// What the meter sees (carrier calibration — the shorts round's measured
// facts; full tables in docs/vertical-shorts.md, carrier-law section):
//   - the 270px diff measures what a phone eye measures. Amplitude must be
//     >= ~4px; area counts as a fraction of the FRAME, not the object;
//     contrast is required (white-on-white never registers).
//   - sub-60px/s drift is sub-meter. Typed 14px text never registers.
//     Cursors, alpha fades, thin ring strokes, smooth sprite bobs: NON-carriers.
//   A SUB-METER run therefore often means "motion exists but no viewer would
//   call it motion" — judge it against the carrier law, not the raw verdict.
//
// Usage:
//   node tools/dead-time.js <video.mp4> [--min-run 0.3] [--threshold 0.5]
//   node tools/dead-time.js <slug>                    # newest mp4 under videos/<slug>/
//   node tools/dead-time.js <video.mp4> --fail-over 1.0   # exit 1 on runs past the limit (opt-in)
//   node tools/dead-time.js <slug> --crop 1080:1200:0:300 # scan a region only (w:h:x:y)
//   node tools/dead-time.js <slug> --cut-threshold 10     # isolated-spike CUT? sensitivity
//   node tools/dead-time.js <slug> --no-freeze            # skip the full-res freezedetect pass
//   node tools/dead-time.js <slug> --no-regions           # skip static-region extraction
//
// --crop exists for the shorts path: word-by-word captions animate almost
// continuously, so a full-frame diff can no longer see an idle device band.
// Scanning the band region (1080:1200:0:300 for the standard portrait
// geometry) restores the measurement the check exists for. Run BOTH — full
// frame for render defects, cropped for UI idleness. All passes (diff,
// freezedetect, region extracts) honor the same --crop so band scans stay
// comparable.
//
// Report-only by default, like seam-gate.js — the numbers are evidence for
// Umair's eye, not a hard gate. Adopted 2026-08-08 (round-2 T1,
// docs/video-system-improvements-round2-2026-08-08.md). Freeze/cut/region
// passes added 2026-08-17 (fix-round C5). --fail-over semantics unchanged:
// it still triggers on dead runs only, never on CUT? markers.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage(code = 1) {
  console.error('Usage: node tools/dead-time.js <video.mp4 | slug> [--min-run s] [--threshold mad] [--scale px] [--fail-over s] [--crop w:h:x:y] [--cut-threshold mad] [--no-freeze] [--no-regions]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = { input: null, minRun: 0.3, threshold: 0.5, scale: 270, failOver: null, crop: null, cutThreshold: 10, freeze: true, regions: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min-run') args.minRun = Number(argv[++i]);
    else if (a === '--threshold') args.threshold = Number(argv[++i]);
    else if (a === '--scale') args.scale = Number(argv[++i]);
    else if (a === '--fail-over') args.failOver = Number(argv[++i]);
    else if (a === '--crop') args.crop = argv[++i];
    else if (a === '--cut-threshold') args.cutThreshold = Number(argv[++i]);
    else if (a === '--no-freeze') args.freeze = false;
    else if (a === '--no-regions') args.regions = false;
    else if (a === '-h' || a === '--help') usage(0);
    else if (!args.input && !a.startsWith('--')) args.input = a;
    else { console.error('unknown arg: ' + a); usage(); }
  }
  if (!args.input) usage();
  if (!Number.isFinite(args.minRun) || args.minRun <= 0) { console.error('--min-run must be > 0'); usage(); }
  if (!Number.isFinite(args.threshold) || args.threshold < 0) { console.error('--threshold must be >= 0'); usage(); }
  if (args.crop && !/^\d+:\d+:\d+:\d+$/.test(args.crop)) { console.error('--crop must be w:h:x:y (e.g. 1080:1200:0:300)'); usage(); }
  return args;
}

// Accept a direct mp4 path, or a video slug — newest mp4 under videos/<slug>/.
function resolveInput(input) {
  if (fs.existsSync(input) && fs.statSync(input).isFile()) return input;
  const dir = path.join(__dirname, '..', 'videos', input);
  if (!fs.existsSync(dir)) {
    console.error(`not a file and not a video slug: ${input}`);
    process.exit(1);
  }
  const mp4s = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.toLowerCase().endsWith('.mp4')) mp4s.push(p);
    }
  })(dir);
  if (!mp4s.length) {
    console.error(`no .mp4 found under ${dir}`);
    process.exit(1);
  }
  mp4s.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return mp4s[0];
}

function ffprobeMeta(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate,nb_frames:format=duration',
    '-of', 'json',
    file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffprobe failed: ' + (r.stderr || '').trim());
  const j = JSON.parse(r.stdout);
  const [num, den] = (j.streams[0].r_frame_rate || '30/1').split('/').map(Number);
  return { fps: num / (den || 1), duration: Number(j.format.duration) };
}

// Per-frame MAD vs previous frame: tblend difference → signalstats YAVG.
// One ffmpeg pass, no raw frames through Node.
function frameDiffs(file, scale, crop) {
  const cropStep = crop ? `crop=${crop},` : '';
  const vf = `${cropStep}scale=${scale}:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`;
  const r = spawnSync('ffmpeg', ['-i', file, '-vf', vf, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || '').slice(-400));
  // stdout lines come in pairs:
  //   frame:12   pts:6144  pts_time:0.512
  //   lavfi.signalstats.YAVG=0.013
  const frames = [];
  let t = null;
  for (const line of r.stdout.split('\n')) {
    const mT = line.match(/pts_time:([\d.]+)/);
    if (mT) { t = Number(mT[1]); continue; }
    const mY = line.match(/lavfi\.signalstats\.YAVG=([\d.eE+-]+)/);
    if (mY && t !== null) { frames.push({ t, mad: Number(mY[1]) }); t = null; }
  }
  return frames;
}

function classify(len) {
  if (len <= 0.45) return 'comma';
  if (len <= 1.0) return 'borderline';
  return 'PLANNING BUG';
}

// Second pass, FULL resolution: ffmpeg freezedetect finds truly-frozen
// intervals the 270px diff can only guess at. n=0.001 (-60dB) is strict but
// correct for screen-capture renders (no sensor noise); d=0.4 is the floor —
// runs shorter than that can never be freeze-confirmed and are marked so.
const FREEZE_MIN = 0.4;
function freezeIntervals(file, crop) {
  const cropStep = crop ? `crop=${crop},` : '';
  const r = spawnSync('ffmpeg', ['-i', file, '-vf', `${cropStep}freezedetect=n=0.001:d=${FREEZE_MIN}`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg freezedetect failed: ' + (r.stderr || '').slice(-400));
  const intervals = [];
  let start = null;
  for (const line of (r.stderr || '').split('\n')) {
    let m = line.match(/freeze_start:\s*([\d.]+)/);
    if (m) { start = Number(m[1]); continue; }
    m = line.match(/freeze_end:\s*([\d.]+)/);
    if (m && start !== null) { intervals.push({ start, end: Number(m[1]) }); start = null; }
  }
  // A freeze still open at EOF has a start but no end.
  if (start !== null) intervals.push({ start, end: Infinity });
  return intervals;
}

// Hard-cut spikes: YAVG >= cutThreshold with BOTH neighbors below a third of
// it. Isolation is the discriminator — see the calibration note in the header.
function cutSpikes(diffs, cutThreshold) {
  const spikes = [];
  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i].mad < cutThreshold) continue;
    const prev = i > 0 ? diffs[i - 1].mad : 0;
    const next = i < diffs.length - 1 ? diffs[i + 1].mad : 0;
    if (prev < cutThreshold / 3 && next < cutThreshold / 3) {
      spikes.push({ t: diffs[i].t, mad: diffs[i].mad });
    }
  }
  return spikes;
}

// One gray frame at working res as a raw buffer (h derives from length/w).
function grabGray(file, t, scale, crop) {
  const cropStep = crop ? `crop=${crop},` : '';
  const r = spawnSync('ffmpeg', ['-ss', t.toFixed(3), '-i', file, '-frames:v', '1',
    '-vf', `${cropStep}scale=${scale}:-2,format=gray`, '-f', 'rawvideo', '-'],
    { maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout || !r.stdout.length) return null;
  return r.stdout;
}

// Coarse per-quadrant MAD between a run's first and last frame — names WHICH
// part of the frame parked (mp 4). Quadrant-level on purpose: the author
// needs "the device band sat still", not per-element attribution.
function staticRegionReport(file, run, scale, crop) {
  const eps = Math.min(0.05, run.len / 4);
  const a = grabGray(file, run.start + eps, scale, crop);
  const b = grabGray(file, run.start + run.len - eps, scale, crop);
  if (!a || !b || a.length !== b.length) return null;
  const w = scale;
  const h = Math.floor(a.length / w);
  if (h < 2) return null;
  const halfW = w >> 1, halfH = h >> 1;
  const quads = [
    { name: 'upper-left', x0: 0, y0: 0, x1: halfW, y1: halfH },
    { name: 'upper-right', x0: halfW, y0: 0, x1: w, y1: halfH },
    { name: 'lower-left', x0: 0, y0: halfH, x1: halfW, y1: h },
    { name: 'lower-right', x0: halfW, y0: halfH, x1: w, y1: h },
  ];
  for (const q of quads) {
    let sum = 0, n = 0;
    for (let y = q.y0; y < q.y1; y++) {
      const row = y * w;
      for (let x = q.x0; x < q.x1; x++) { sum += Math.abs(a[row + x] - b[row + x]); n++; }
    }
    q.mad = n ? sum / n : 0;
  }
  const staticQ = quads.filter(q => q.mad < 0.5);
  const movingQ = quads.filter(q => q.mad >= 0.5);
  if (staticQ.length === 4) return 'entire frame static';
  if (!staticQ.length) return 'no static quadrant (motion everywhere below the diff floor)';
  return `static ≈ ${staticQ.map(q => q.name).join(', ')}; residual motion in ${movingQ.map(q => `${q.name} (MAD ${q.mad.toFixed(2)})`).join(', ')}`;
}

// The same quadrant pass, as a number: the largest per-quadrant MAD across a
// run. This is the cheap form of "auto-crop to the region with the most
// residual motion and re-measure" (rf-weight 28) — if one quadrant is clearly
// changing, the frame did not stop, whatever the full-frame meter says at
// 270px. Returns 0 when it cannot measure, so it never manufactures motion.
function peakQuadrantMad(file, run, scale, crop) {
  const report = staticRegionReport(file, run, scale, crop);
  if (!report || typeof report !== 'string') return 0;
  const mads = [...report.matchAll(/MAD ([0-9.]+)/g)].map(m => parseFloat(m[1]));
  if (report === 'no static quadrant (motion everywhere below the diff floor)') return Infinity;
  return mads.length ? Math.max(...mads) : 0;
}

function main() {
  const args = parseArgs(process.argv);
  // Timing-sensitive: runs alone (rf-video 25). --force overrides.
  require('./headless-lock').acquire('dead-time', { force: process.argv.includes('--force') });
  const file = resolveInput(args.input);
  const { fps, duration } = ffprobeMeta(file);
  console.log(`dead-time scan: ${path.relative(process.cwd(), file)}`);
  console.log(`  ${duration.toFixed(2)}s @ ${fps.toFixed(2)}fps, diff at ${args.scale}px, threshold MAD < ${args.threshold}, min run ${args.minRun}s${args.crop ? `, crop ${args.crop}` : ''}\n`);

  const frames = frameDiffs(file, args.scale, args.crop);
  if (frames.length < 2) { console.error('too few frames decoded'); process.exit(1); }

  // tblend's first output frame diffs frame 0 against itself — drop it.
  const diffs = frames.slice(1);

  const runs = [];
  let start = null, count = 0;
  for (const f of diffs) {
    if (f.mad < args.threshold) {
      if (start === null) { start = f.t; count = 0; }
      count++;
    } else if (start !== null) {
      const len = f.t - start;
      if (len >= args.minRun) runs.push({ start, len, count });
      start = null;
    }
  }
  if (start !== null) {
    const len = diffs[diffs.length - 1].t - start + 1 / fps;
    if (len >= args.minRun) runs.push({ start, len, count });
  }

  const dead = runs.reduce((s, r) => s + r.len, 0);

  // Full-res freezedetect, computed BEFORE the verdict so the verdict can use
  // it. This meter diffs at 270px wide: a counter digit is sub-pixel there, a
  // 62px headline is ~2px, a 30px cursor is about four. A film whose back half
  // is deliberately small-area motion scored 58.2% dead with 8 "PLANNING BUG"
  // runs while moving almost continuously (rf-weight 28). Announcing a
  // planning bug for a run that full-res freezedetect does NOT call frozen is
  // the tool overstating its own resolution.
  const freezes = (args.freeze && runs.length) ? freezeIntervals(file, args.crop) : [];
  const statusOf = (r) => {
    if (!args.freeze || !runs.length) return null;
    if (r.len < FREEZE_MIN) return 'TOO-SHORT';
    return freezes.some(f => f.start < r.start + r.len && f.end > r.start) ? 'CONFIRMED-FROZEN' : 'SUB-METER';
  };

  const withheldRuns = new Set();

  if (!runs.length) {
    console.log(`no dead runs >= ${args.minRun}s. Nothing in this film sits still that long.`);
  } else {
    console.log('  t-start   length   frames  verdict');
    for (const r of runs) {
      console.log(
        `  ${r.start.toFixed(2).padStart(7)}s  ${r.len.toFixed(2).padStart(5)}s  ${String(r.count).padStart(6)}  ${classify(r.len)}`
      );
    }
    const bugs = runs.filter(r => classify(r.len) === 'PLANNING BUG');
    console.log(`\n  total dead time ${dead.toFixed(2)}s of ${duration.toFixed(2)}s (${(100 * dead / duration).toFixed(1)}%), longest run ${Math.max(...runs.map(r => r.len)).toFixed(2)}s`);
    if (bugs.length) {
      // A run is only a planning bug if BOTH meters agree the frame stopped:
      // full-res freezedetect, and a per-quadrant re-measure. Either one
      // disagreeing means this tool is out of its depth at 270px, not that the
      // film stopped (rf-weight 28 — 58.2% "dead" on a film that moves almost
      // continuously, because its back half is small-area motion).
      const withheld = bugs.filter(r =>
        statusOf(r) === 'SUB-METER' || peakQuadrantMad(file, r, args.scale, args.crop) >= 2);
      for (const r of withheld) withheldRuns.add(r);
      const confirmedBugs = bugs.filter(r => !withheld.includes(r));
      const subMeterBugs = withheld.length;
      if (confirmedBugs.length) {
        console.log(`  ${confirmedBugs.length} run(s) past the 1.0s pause test — the film stops there. Fix the beat, not the hold.`);
      }
      if (subMeterBugs) {
        const byFreeze = withheld.filter(r => statusOf(r) === 'SUB-METER').length;
        const byQuad = subMeterBugs - byFreeze;
        const why = [
          byFreeze ? `${byFreeze} not confirmed by full-res freezedetect` : '',
          byQuad ? `${byQuad} with a quadrant still changing on re-measure` : '',
        ].filter(Boolean).join(', ');
        console.log(`  ${subMeterBugs} further run(s) past 1.0s WITHHELD (${why}) — at 270px this meter is out of its depth, not the film.`);
        console.log('    Confirm before acting: re-run with --crop w:h:x:y over the region that should be moving. A cheap second opinion is to extract that crop at successive timestamps and compare PNG file sizes — rising size = new content arriving.');
      }
    }
    console.log('  Commas (<=0.45s) are correct when intentional — stillness-before-climax. Judge against the beat\'s pacing mode (D1): explainer-paced beats may hold; ad-energy spots should not.');
  }

  // --- freeze cross-check: CONFIRMED-FROZEN vs SUB-METER (fix-round C5) ---
  if (args.freeze && runs.length) {
    let confirmed = 0, subMeter = 0, tooShort = 0;
    const lines = [];
    for (const r of runs) {
      const status = statusOf(r);
      if (status === 'TOO-SHORT') {
        tooShort++;
        lines.push(`    ${r.start.toFixed(2).padStart(7)}s  ${r.len.toFixed(2).padStart(5)}s  TOO-SHORT (below freezedetect ${FREEZE_MIN}s floor)`);
        continue;
      }
      if (status === 'CONFIRMED-FROZEN') { confirmed++; lines.push(`    ${r.start.toFixed(2).padStart(7)}s  ${r.len.toFixed(2).padStart(5)}s  CONFIRMED-FROZEN`); }
      else { subMeter++; lines.push(`    ${r.start.toFixed(2).padStart(7)}s  ${r.len.toFixed(2).padStart(5)}s  SUB-METER`); }
    }
    console.log(`\n  freeze cross-check (full-res freezedetect): ${confirmed} CONFIRMED-FROZEN, ${subMeter} SUB-METER${tooShort ? `, ${tooShort} too short to confirm` : ''}`);
    for (const l of lines) console.log(l);
    if (subMeter) console.log('    SUB-METER = motion exists below the 270px diff floor (amplitude <4px, low contrast, or sub-60px/s drift). Judge against the carrier law, not the raw verdict.');
  }

  // --- hard-cut check: isolated single-frame spikes (fix-round C5) ---
  const spikes = cutSpikes(diffs, args.cutThreshold);
  if (spikes.length) {
    console.log(`\n  hard-cut check: ${spikes.length} isolated spike(s) at YAVG >= ${args.cutThreshold} (report-only — a cut at a chapter boundary may be a defect, as 13)`);
    for (const s of spikes) console.log(`    ${s.t.toFixed(2).padStart(7)}s  YAVG ${s.mad.toFixed(1)}  CUT?`);
  } else {
    console.log(`\n  hard-cut check: no isolated spikes at YAVG >= ${args.cutThreshold}.`);
  }

  // --- dominant static region for the longest runs (fix-round C5) ---
  if (args.regions && runs.length) {
    const top = [...runs].sort((a, b) => b.len - a.len).slice(0, 3);
    console.log('\n  static regions (longest runs):');
    for (const r of top) {
      const report = staticRegionReport(file, r, args.scale, args.crop);
      console.log(`    ${r.start.toFixed(2).padStart(7)}s  ${r.len.toFixed(2).padStart(5)}s  ${report || 'region extract failed'}`);
    }
  }

  // qc-report emit — section keyed by crop so full-frame and band scans coexist.
  const { writeSection, slugFromPath } = require('./lib/qc-report');
  const reportSlug = slugFromPath(file);
  if (reportSlug) {
    const longest = runs.length ? Math.max(...runs.map(r => r.len)) : 0;
    writeSection(reportSlug, args.crop ? 'deadTimeCrop' : 'deadTime', {
      file: path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'),
      duration: Number(duration.toFixed(2)),
      fps: Number(fps.toFixed(2)),
      minRun: args.minRun,
      crop: args.crop || null,
      totalDead: Number(dead.toFixed(2)),
      totalPct: duration ? Number((100 * dead / duration).toFixed(1)) : 0,
      longest: Number(longest.toFixed(2)),
      runs: runs.map(r => ({
        start: Number(r.start.toFixed(2)),
        len: Number(r.len.toFixed(2)),
        verdict: classify(r.len),
        withheld: withheldRuns.has(r),
      })),
      cutSpikes: spikes.map(s => ({ t: Number(s.t.toFixed(2)), yavg: Number(s.mad.toFixed(1)) })),
    });
  }

  // --fail-over ignores WITHHELD runs, or the gate would contradict the verdict
  // printed just above it (rf-weight 28).
  if (args.failOver !== null && runs.some(r => r.len > args.failOver && !withheldRuns.has(r))) process.exit(1);
}

main();
