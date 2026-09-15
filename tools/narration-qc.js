#!/usr/bin/env node
// tools/narration-qc.js — per-clip narration QC gate (A9 + A12, shorts fix
// round 2026-08-13). Run after EVERY tts render, before any video render.
//
// Three measured checks per video:
//
//   1. Pace — words per second from narration/<key>.txt vs the mp3 duration.
//      Acceptable band 2.6–3.0 w/s; hard FLAG >= 3.3. Calibrated 2026-09-03
//      to Umair's designated reference narration (172–175 wpm sustained
//      across 7 reference files; evidence reference/New folder/_extraction/
//      _analysis/analysis-tts-script.md). U9 in
//      docs/track3-analysis-2026-09-03.md lets him revert to the old
//      2.3–2.8 / >3.0 band. Slur receipt stands: coupon-code b5 shipped at
//      3.98 w/s — 24 words in 6s.
//   2. Voice consistency — mean spectral centroid per clip (ffmpeg
//      aspectralstats, channel 1, plain mean over all frames — the same
//      methodology that measured stop-fast-bots b1 at 4480 Hz vs its
//      3604–3927 Hz siblings, audibly "a different person"). FLAG any clip
//      > 10% off the reference.
//
//      Reference (AP-9, 2026-09-02): the old anchor was the BATCH median,
//      which is membership-relative — add/drop/re-roll one clip and every
//      other clip re-judges (ee 2: an untouched clip flipped CLEAN→FLAG when
//      the outro dropped; wh 4n whack-a-mole; scs 5). Now: tts/generate.js
//      writes narration/.tts.json ({voice: sha1-8, model, stability}) and
//      tts/voice-reference.json maps `${voice}:${model}:${stability}` to a
//      running-mean centroid. When both exist, clips judge against that
//      STABLE per-voice number; otherwise the gate falls back to the batch
//      median and SAYS so. Commands:
//        --update-reference   fold a PASSING batch into the running mean
//        --reference <Hz>     judge against an explicit centroid
//   3. DUR drift — when videos/<slug>/index.html carries a pasted DUR table,
//      compare each entry against mp3 duration + the stamped settle
//      (measure-narration emits "(+0.4s settle)"). FLAG > 0.15s drift.
//      Same math as validate-singlehtml.js section 3b (A8).
//
// Usage:
//   node tools/narration-qc.js <slug> [--wps-max 3.3] [--centroid-tol 0.10]
//        [--drift 0.15] [--report-only] [--expressive]
//        [--update-reference] [--reference <Hz>]
//
// --expressive (QC round 2, Umair 2026-08-13): preset for ad-energy shorts
// reads (eleven_v3 Creative + audio tags). Expressive delivery legitimately
// varies the spectral centroid — the 10% cluster tolerance calibrated for
// tutorial narration punishes exactly the liveliness the shorts charter
// asks for (round 1 re-rolled outliers toward stability 1.0 and shipped
// monotone: "insanely bad… got even worse"). Widens centroid-tol to 0.20;
// wps-max is 3.3 for both registers since the 2026-09-03 calibration
// (the old 3.0-default / 3.2-expressive split is superseded). Explicit
// flags still override.
//
// Gate policy (fix-round C9 — eleven_v3 is now the default engine model):
//   shorts / ad-energy: ALWAYS run with --expressive.
//   tutorials (v3 Natural, stability 0.5): start at the STANDARD 0.10
//   tolerance. If expressive tutorials flag persistently, widen DELIBERATELY
//   (--centroid-tol, documented per video) — do not chase the gate by
//   raising synthesis stability; that is the deprecated playbook that
//   shipped the monotone (ssn 10, superseded by ssn 11).
//
// Exit: 0 clean · 1 flags raised (suppressed by --report-only) · 2 usage.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, wpsMax: 3.3, centroidTol: 0.10, drift: 0.15, reportOnly: false, updateReference: false, reference: null };
  const explicit = new Set();
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--wps-max') { out.wpsMax = Number(a[++i]); explicit.add('wpsMax'); }
    else if (a[i] === '--centroid-tol') { out.centroidTol = Number(a[++i]); explicit.add('centroidTol'); }
    else if (a[i] === '--drift') out.drift = Number(a[++i]);
    else if (a[i] === '--report-only') out.reportOnly = true;
    else if (a[i] === '--expressive') out.expressive = true;
    else if (a[i] === '--update-reference') out.updateReference = true;
    else if (a[i] === '--reference') out.reference = Number(a[++i]);
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  if (out.expressive) {
    if (!explicit.has('centroidTol')) out.centroidTol = 0.20;
    if (!explicit.has('wpsMax')) out.wpsMax = 3.3;
  }
  return out;
}

function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 ? parseFloat(r.stdout) || null : null;
}

// Mean spectral centroid (Hz), channel 1, plain mean over all analysis frames.
function meanCentroid(file) {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-i', file,
    '-af', 'aspectralstats=measure=centroid,ametadata=print:key=lavfi.aspectralstats.1.centroid:file=-',
    '-f', 'null', '-',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return null;
  let sum = 0, n = 0;
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/centroid=([\d.eE+-]+)/);
    if (m) { sum += Number(m[1]); n++; }
  }
  return n ? sum / n : null;
}

// Spoken-word count: strip SSML-ish tags (<break .../>) AND eleven_v3 audio
// tags ([excited], [whispers], …) — tags are performance directions, not
// spoken words; counting them skews the pace metric. Keep tokens carrying at
// least one letter or digit (a bare em-dash is not a word).
function wordCount(text) {
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[a-z ]{2,24}\]/gi, ' ')
    .split(/\s+/)
    .filter(t => /[\p{L}\p{N}]/u.test(t))
    .length;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('Usage: node tools/narration-qc.js <slug> [--wps-max 3.0] [--centroid-tol 0.10] [--drift 0.15] [--report-only]');
    process.exit(2);
  }
  const dir = path.join(ROOT, 'videos', args.slug, 'narration');
  if (!fs.existsSync(dir)) {
    console.error(`✗ videos/${args.slug}/narration not found`);
    process.exit(2);
  }
  const mp3s = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3')).sort();
  if (!mp3s.length) {
    console.error(`✗ no mp3s in videos/${args.slug}/narration`);
    process.exit(2);
  }

  // Optional DUR table + settle from the video's index.html (A8-shared math).
  const htmlPath = path.join(ROOT, 'videos', args.slug, 'index.html');
  let durTable = null, settle = 0.4;
  if (fs.existsSync(htmlPath)) {
    const src = fs.readFileSync(htmlPath, 'utf8');
    const durMatch = src.match(/const\s+DUR\s*=\s*\{([\s\S]*?)\};/);
    if (durMatch) {
      durTable = {};
      for (const m of durMatch[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*([\d.]+)/g)) durTable[m[1]] = Number(m[2]);
      const settleM = src.match(/\(\+([\d.]+)s settle\)/);
      if (settleM) settle = Number(settleM[1]);
    }
  }

  const rows = [];
  let flags = 0;
  const flag = (msg) => { flags++; return msg; };

  for (const f of mp3s) {
    const key = f.replace(/\.mp3$/i, '');
    const file = path.join(dir, f);
    const dur = probeDuration(file);
    const centroid = meanCentroid(file);
    if (dur == null || centroid == null) {
      console.error(`  ✗ ${key}: ffprobe/ffmpeg failed — cannot QC this clip`);
      flags++;
      continue;
    }
    const txtPath = path.join(dir, `${key}.txt`);
    const words = fs.existsSync(txtPath) ? wordCount(fs.readFileSync(txtPath, 'utf8')) : null;
    rows.push({ key, dur, centroid, words, wps: words != null ? words / dur : null });
  }
  if (!rows.length) process.exit(1);

  // ── centroid anchor: per-voice reference > explicit --reference > batch median ──
  const med = median(rows.map(r => r.centroid));
  const refPath = path.join(ROOT, 'tts', 'voice-reference.json');
  const sidecarPath = path.join(dir, '.tts.json');
  let reference = null;
  let referenceLabel = 'batch median (no per-voice centroid)';
  let refKey = null;
  let refDb = null;
  if (args.reference != null && Number.isFinite(args.reference)) {
    reference = args.reference;
    referenceLabel = `--reference ${Math.round(args.reference)} Hz (explicit)`;
  } else if (fs.existsSync(sidecarPath)) {
    try {
      const sc = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      refKey = `${sc.voice}:${sc.model}:${sc.stability}`;
      if (fs.existsSync(refPath)) {
        refDb = JSON.parse(fs.readFileSync(refPath, 'utf8'));
        const entry = refDb[refKey];
        if (entry && Number.isFinite(entry.centroidHz)) {
          reference = entry.centroidHz;
          referenceLabel = `per-voice ${Math.round(reference)} Hz (${refKey}, n=${entry.n})`;
        }
      }
    } catch (_) { /* unreadable sidecar/db — batch-median fallback below */ }
  }
  const anchor = reference != null ? reference : med;
  console.log(`narration QC — ${args.slug} (${rows.length} clips, centroid median ${med.toFixed(0)} Hz, settle +${settle}s)`);
  console.log(`  reference: ${referenceLabel}`);
  console.log('  key           dur      w/s        centroid     verdicts');

  for (const r of rows) {
    const verdicts = [];
    if (r.wps != null) {
      if (r.wps > args.wpsMax) verdicts.push(flag(`PACE ${r.wps.toFixed(2)} w/s > ${args.wpsMax} — slurred; rewrite or re-time the line`));
      else if (r.wps < 2.6 || r.wps > 3.0) verdicts.push(`pace ${r.wps.toFixed(2)} w/s outside 2.6–3.0 target (info)`);
    } else {
      verdicts.push(flag('no .txt — cannot measure pace'));
    }
    const dev = (r.centroid - anchor) / anchor;
    if (Math.abs(dev) > args.centroidTol) {
      verdicts.push(flag(`VOICE OUTLIER ${dev > 0 ? '+' : ''}${(dev * 100).toFixed(1)}% vs reference — audibly a different voice; re-synthesize this clip`));
    }
    if (durTable && durTable[r.key] != null) {
      const drift = durTable[r.key] - (r.dur + settle);
      if (Math.abs(drift) > args.drift) {
        verdicts.push(flag(`DUR DRIFT ${drift > 0 ? '+' : ''}${drift.toFixed(2)}s vs pasted ${durTable[r.key]} — re-run measure-narration and repaste`));
      }
    }
    console.log(`  ${r.key.padEnd(12)} ${r.dur.toFixed(2).padStart(6)}s ${r.wps != null ? r.wps.toFixed(2).padStart(6) : '   n/a'} w/s ${r.centroid.toFixed(0).padStart(8)} Hz    ${verdicts.length ? verdicts.join('; ') : 'ok'}`);
    r.verdicts = verdicts;
  }

  if (durTable) {
    const orphans = Object.keys(durTable).filter(k => !rows.some(r => r.key === k));
    if (orphans.length) console.log(`  ⚠ DUR entries with no mp3: ${orphans.join(', ')}`);
  }

  console.log(flags ? `✗ FAIL — ${flags} flag(s). Fix before any video render (A9/A12 gate).` : '✓ PASS — pace, voice cluster, and DUR all clean.');

  // --update-reference: fold a PASSING batch into the running per-voice mean.
  if (args.updateReference) {
    if (!refKey) {
      console.log('  ⚠ --update-reference: no narration/.tts.json (render TTS with the current tts/generate.js first)');
    } else if (flags) {
      console.log('  ⚠ --update-reference skipped: batch has flags — only PASSING batches fold into the reference');
    } else {
      const db = refDb || (fs.existsSync(refPath) ? JSON.parse(fs.readFileSync(refPath, 'utf8')) : {});
      const cur = db[refKey] || { centroidHz: 0, n: 0, sources: [], method: 'aspectralstats.centroid.ch1.mean' };
      const batchMean = rows.reduce((a, r) => a + r.centroid, 0) / rows.length;
      const n2 = cur.n + rows.length;
      db[refKey] = {
        ...cur,
        centroidHz: Math.round((((cur.centroidHz * cur.n) + batchMean * rows.length) / n2) * 10) / 10,
        n: n2,
        updatedAt: new Date().toISOString(),
        sources: [...new Set([...(cur.sources || []), args.slug])],
      };
      const tmp = refPath + '.tmp-' + process.pid;   // atomic (qc-report pattern)
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + '\n');
      fs.renameSync(tmp, refPath);
      console.log(`  reference updated: ${refKey} → ${db[refKey].centroidHz} Hz (n=${db[refKey].n})`);
    }
  }

  require('./lib/qc-report').writeSection(args.slug, 'narrationQc', {
    pass: flags === 0, flags, reference: referenceLabel,
    wpsMax: args.wpsMax, centroidTol: args.centroidTol, expressive: !!args.expressive,
    clips: rows.map(r => ({
      key: r.key,
      dur: Number(r.dur.toFixed(2)),
      wps: r.wps != null ? Number(r.wps.toFixed(2)) : null,
      centroid: Math.round(r.centroid),
      verdicts: r.verdicts || [],
    })),
  });
  process.exit(flags && !args.reportOnly ? 1 : 0);
}

main();
