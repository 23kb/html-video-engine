#!/usr/bin/env node
// tools/composition-scan.js — the composition/monotony metric (C-SPEC C4,
// motion-design round 2026-08-17; static mode shipped dev session 1).
//
// A **composition** is a settled framing of a subject — a (snapshot, subject
// region | editorial scene) tuple held between camera settlements. Camera
// moves are not compositions; five hops between two subjects is 2
// compositions, not 5. This metric counts where the camera RESTS, not how
// often it travels (A1 rule 4 — every move needs a cause — stays an
// authoring rule; this tool measures the result).
//
// REPORT-ONLY. Exit 0 always. Not wired into any gate — Umair's "boring"
// verdict stays his; this gives it a number.
//
// Targets (ruled 2026-08-22):
//   shorts (portrait stage): 6–8 distinct compositions, no hold > ~6s —
//     calibrated on the corpus (best-rated short ~8–9 passes; the failure
//     ~4–5 with one ~30s hold fails).
//   long-form (landscape):  12–18 compositions, no teaching hold > ~10s —
//     PROVISIONAL: adopted now by ruling, to be corrected after the next
//     two tutorials ship.
//
// MODES
//   static (default) — parse videos/<slug>/index.html: the beat manifest
//     (beat() keys, DUR, meta.target/fill/hook), ifm.load/swap slugs, camera
//     verb calls, bookend mounts. Reports planned compositions by clustering
//     beats into (snapshot, selector-family) pairs, plus the B6-1 mutation
//     audit (beats whose body performs no known DOM mutation).
//     Static caveats, by design:
//       · a cluster's "planned span" is NOT a runtime hold — beats inside
//         one cluster may re-frame within the family (row → input closeup).
//         The static long-hold heuristic flags a cluster only when it spans
//         ≥3 beats or ≥40% of the film's narrated time.
//       · films without a beat() manifest (vo()/chapter-driven long-form)
//         are not yet parseable — reported as unsupported, exit 0.
//   --play — runtime pose-log mode: plays the film headless in real time
//     (the probe-short pattern — no __tl, no seek), reads the pose-log
//     sidecar (window.__poses, pushed by the shorts-kit camera verbs +
//     flyToElement), __cuts (both shapes accepted: bare t or {t,from,to}),
//     and __beats. A new composition = a settled pose differing from the
//     previous composition's pose by Δzoom > 0.08 or |Δtx|/|Δty| > 15% of
//     the camera viewport, OR a snapshot cut, OR a distinct stage:-target
//     editorial beat. Bookends are source-derived (they predate __T0).
//     Holds = dwell between consecutive composition events; > target flagged.
//     Beats with no pose, no cut, and no stage target are listed as
//     UNATTRIBUTED — their dwell folds into the surrounding hold.
//
//   DECLARED cadence (any film whose storyboard.md "## Camera plan" states
//     `Cadence:` and `Max hold:`) — the band is derived from THOSE numbers,
//     not from a system table. Ruled 2026-09-04 after one ad's
//     v6 camera pass (25 landings in 41s) came back "making me dizzy … our UI
//     had to stay the same so too much motion made little sense": cadence is a
//     creative decision the storyboard makes per film (sparse and considered
//     when the UI stays put, dense for a montage), never a forced rate.
//     Tolerance: landings may run 0.6×–1.5× the declared spacing.
//   ad-style (landscape stage carrying `data-film-path="ad"`, or --band ad) —
//     NO fallback band. An ad with no declared cadence reports UNDECLARED —
//     a storyboard defect, not a film verdict. (The 2026-09-03 fixed rate band
//     ≥1/3s ≤1/1.2s ≤4s holds was withdrawn the next day — it produced the
//     dizzy cut.) Editorial films drive a stage camera (see the ad skeleton's
//     makeStageCamera) whose verbs push settled poses in STAGE px; the Δ
//     thresholds use the stage box for this kind.
//
//   label-driven single-HTML films (tl.addLabel + a stage camera, no beat()
//   manifest) ARE parseable in static mode: the camera verbs' literal `at:`
//   times are the planned landings (drift = unsettled, ignored), so the
//   planned framing count and the longest planned hold are known before any
//   browser runs. --play measures the same film live.
//
// qc-report: --play writes the `compositionScan` section automatically
// (measured); static mode writes it only with --report (planned).
//
// Usage:
//   node tools/composition-scan.js <slug> [--static] [--play] [--band ad|short|long] [--report] [--gate]

const fs = require('fs');
const path = require('path');
const { resolveResolution } = require('./stage-size');
const { writeSection } = require('./lib/qc-report');

// ── declared cadence (storyboard.md "## Camera plan" header) ────────────────
// Reads `Cadence:` (seconds per landing — "1 landing / 5s", "every 4–6s",
// "~5s" all parse; a range takes its midpoint) and `Max hold:` (seconds).
// Returns null when the storyboard has no camera plan or no Cadence line.
function parseDeclaredCadence(slug) {
  const sbPath = path.join(ROOT, 'videos', slug, 'storyboard.md');
  if (!fs.existsSync(sbPath)) return null;
  const sb = fs.readFileSync(sbPath, 'utf8');
  const parts = sb.split(/^##\s+Camera plan[^\n]*$/mi);
  if (parts.length < 2) return null;
  const section = parts[1].split(/^##\s+/m)[0];
  const secs = (line) => {
    if (!line) return null;
    const nums = [...line.matchAll(/(\d+(?:\.\d+)?)\s*s\b/g)].map((m) => Number(m[1]));
    if (!nums.length) return null;
    return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  };
  const cadLine = /^\s*\**\s*Cadence\**\s*:\s*([^\n]*)/mi.exec(section);
  const holdLine = /^\s*\**\s*Max hold\**\s*:\s*([^\n]*)/mi.exec(section);
  const voiceLine = /^\s*\**\s*Ease voice\**\s*:\s*([^\n]*)/mi.exec(section);
  const spacing = secs(cadLine && cadLine[1]);
  if (!spacing) return null;
  // Max hold takes the FIRST number only ("9s (end card 6s)" → 9); a Cadence range takes its midpoint.
  const holdFirst = holdLine && /(\d+(?:\.\d+)?)\s*s\b/.exec(holdLine[1]);
  return { spacing, maxHold: holdFirst ? Number(holdFirst[1]) : null, voice: voiceLine ? voiceLine[1].trim() : null, raw: cadLine[1].trim() };
}

// ── bands ───────────────────────────────────────────────────────────────────
// A declared cadence (storyboard) beats every table. Fixed bands remain only
// as fallbacks where an earlier ruling set them (shorts 2026-08-22; long-form
// provisional). Ads have no fallback: undeclared = storyboard defect.
function bandFor(kind, res, dur, declared) {
  const stageLabel = `${res.height > res.width ? 'portrait' : 'landscape'} ${res.width}x${res.height}`;
  if (declared) {
    const d = Number.isFinite(dur) && dur > 0 ? dur : 30;
    const hold = declared.maxHold ?? declared.spacing * 2;
    return { kind, res, declared, rate: true,
      min: Math.max(1, Math.floor(d / (declared.spacing * 1.5))), max: Math.ceil(d / (declared.spacing * 0.6)),
      hold, tailHold: Math.max(hold, 6),
      label: `${stageLabel} (${kind}) — cadence DECLARED by storyboard.md Camera plan: ${declared.raw}${declared.maxHold ? `, max hold ${declared.maxHold}s` : ` (max hold defaulted to 2× spacing = ${hold}s)`}${declared.voice ? `, ease voice ${declared.voice}` : ''}` };
  }
  if (kind === 'short') return { kind, res, min: 6, max: 8, hold: 6, label: `${stageLabel} (short — FALLBACK band ruled 2026-08-22; a Camera plan Cadence: line overrides it)` };
  if (kind === 'ad') return { kind, res, undeclared: true, min: 0, max: Infinity, hold: Infinity, tailHold: Infinity,
    label: `${stageLabel} (ad-style — NO cadence declared: storyboard.md "## Camera plan" must state Cadence: and Max hold:; the storyboard sets the band, ruled 2026-09-04)` };
  return { kind: 'long', res, min: 12, max: 18, hold: 10, label: `${stageLabel} (long-form — PROVISIONAL targets, ruled 2026-08-22: correct after the next two tutorials ship)` };
}
function detectBandKind(argv, src, portrait) {
  const flag = argv.find((a) => a.startsWith('--band='));
  const flagIdx = argv.indexOf('--band');
  const explicit = flag ? flag.slice(7) : flagIdx >= 0 ? argv[flagIdx + 1] : null;
  if (explicit && ['ad', 'short', 'long'].includes(explicit)) return explicit;
  if (portrait) return 'short';
  if (/data-film-path\s*=\s*["']ad["']/.test(src)) return 'ad';
  return 'long';
}

// ── camera-plan parser (label-driven films) ─────────────────────────────────
// cam.<verb>(<rect>, { at: <literal>, label: '<name>' … }) — the verb names are
// the stage-camera contract (ad skeleton); drift is a consequence hold, not a
// landing. Returns [] when the film has no stage camera.
const PLAN_VERBS = /\bcam\.(punch|macro|whip|pullBack|move|drift|cut)\(/g;
function parseCameraPlan(masked) {
  const plan = [];
  for (const m of masked.matchAll(PLAN_VERBS)) {
    const openIdx = m.index + m[0].length - 1;
    const call = scanCall(masked, openIdx);
    if (!call) continue;
    const opts = call.args.join(',');
    if (/\.\.\.\w+/.test(opts) && !/\bat:\s*[\d.]+/.test(opts)) continue; // a verb delegating to another (the camera's own body)
    const at = /\bat:\s*([\d.]+)/.exec(opts);
    if (!at) { plan.push({ verb: m[1], t: null, label: '(non-literal at:)' }); continue; }
    const label = m[1] === 'cut'
      ? /^\s*(?:'([^']*)'|"([^"]*)")/.exec(call.args[0] || '')   // cut('<scene>', { at })
      : /\blabel:\s*(?:'([^']*)'|"([^"]*)")/.exec(opts);
    const fill = /\bfill:\s*([\d.]+)/.exec(opts);
    const zoom = /\bzoom:\s*([\d.]+)/.exec(opts);
    plan.push({ verb: m[1], t: Number(at[1]), label: label ? (label[1] ?? label[2]) : '(unlabeled)',
      fill: fill ? Number(fill[1]) : null, zoom: zoom ? Number(zoom[1]) : null, settled: m[1] !== 'drift' });
  }
  return plan;
}
function filmDuration(masked) {
  const total = /const\s+TOTAL\s*=\s*([\d.]+)/.exec(masked);
  if (total) return Number(total[1]);
  let last = 0;
  for (const m of masked.matchAll(/tl\.addLabel\(\s*['"][\w-]+['"]\s*,\s*([\d.]+)/g)) last = Math.max(last, Number(m[1]));
  return last || null;
}
function reportPlanned(slug, band, plan, dur, argv) {
  const landings = plan.filter((p) => p.settled && p.t != null).sort((a, b) => a.t - b.t);
  const unparsed = plan.filter((p) => p.t == null);
  console.log(`camera plan (planned, static): ${landings.length} landing(s) + 1 opening frame, ${plan.length - landings.length - unparsed.length} drift(s)${unparsed.length ? `, ${unparsed.length} call(s) with a non-literal at: (not countable)` : ''}`);
  const events = [{ t: 0, verb: 'open', label: 'opening frame' }, ...landings];
  let longest = 0, longestAt = 0;
  for (let i = 0; i < events.length; i++) {
    const end = i + 1 < events.length ? events[i + 1].t : (dur ?? events[i].t);
    const hold = Math.max(0, end - events[i].t);
    // The film's LAST framing is the read-the-URL end card; the references hold
    // theirs 3–5s. It is judged against tailHold, not the in-film hold cap.
    const cap = i === events.length - 1 ? (band.tailHold ?? band.hold) : band.hold;
    const over = hold > cap;
    if (over && hold > longest) { longest = hold; longestAt = events[i].t; }
    else if (!over && longest === 0 && i === events.length - 1) { /* keep 0 → computed below */ }
    const e = events[i];
    const detail = e.zoom != null ? `zoom ${e.zoom}` : e.fill != null ? `fill ${e.fill}` : '';
    console.log(`  ${e.t.toFixed(2).padStart(6)}s  ${(e.verb + ':' + e.label).padEnd(44)} hold ${hold.toFixed(2)}s${over ? '  ⚠ > ' + cap + 's' : ''}  ${detail}`);
  }
  if (longest === 0) { // no hold over its cap — report the longest in-film hold for the record
    for (let i = 0; i < events.length - 1; i++) { const h = events[i + 1].t - events[i].t; if (h > longest) { longest = h; longestAt = events[i].t; } }
  }
  const n = events.length;
  if (band.undeclared) {
    console.log(`\nverdict (planned): ${n} framings · longest planned hold ${longest.toFixed(2)}s at ${longestAt.toFixed(1)}s → UNDECLARED`);
    console.log('  storyboard.md "## Camera plan" declares no Cadence: — the storyboard sets the cadence per film (ruled 2026-09-04); no film verdict without it.');
    if (argv.includes('--report')) writeSection(slug, 'compositionScan', { mode: 'static', pass: false, undeclared: true, compositions: n, longest: +longest.toFixed(2), longestAt: +longestAt.toFixed(2), band: { kind: band.kind }, duration: dur });
    if (argv.includes('--gate')) { console.log('gate: FAIL (undeclared cadence)'); process.exitCode = 1; }
    return;
  }
  const countVerdict = n < band.min ? 'below the declared cadence' : n > band.max ? 'above the declared cadence' : 'on cadence';
  const pass = n >= band.min && n <= band.max && longest <= band.hold;
  console.log(`\nverdict (planned): ${n} framings (${countVerdict}, band ${band.min}–${band.max}${dur ? ` for ${dur.toFixed(1)}s` : ''}) · longest planned hold ${longest.toFixed(2)}s at ${longestAt.toFixed(1)}s (≤${band.hold}s) → ${pass ? 'PASS' : 'FAIL'}`);
  console.log('note: planned = the literal at: times; true holds and Δ-pose merging need --play.');
  if (argv.includes('--report')) {
    writeSection(slug, 'compositionScan', { mode: 'static', pass, compositions: n, longest: +longest.toFixed(2), longestAt: +longestAt.toFixed(2), band: { kind: band.kind, min: band.min, max: band.max, hold: band.hold, declared: band.declared ? band.declared.raw : null }, duration: dur });
    console.log('qc-report: compositionScan (planned) written');
  }
  if (argv.includes('--gate')) { console.log('gate: ' + (pass ? 'PASS' : 'FAIL')); if (!pass) process.exitCode = 1; }
}

const ROOT = path.resolve(__dirname, '..');

// ── comment masking (length-preserving) ─────────────────────────────────────
// Blanks // and /* */ comment interiors with spaces so index-based regex work
// never matches comment text, while string literals (targets!) survive.
// String-aware: '//' inside a quoted string (URLs) is not a comment.
function maskComments(src) {
  const out = src.split('');
  let state = 'code'; // code | sq | dq | tpl | line | block
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; out[i] = ' '; }
      else if (c === '/' && n === '*') { state = 'block'; out[i] = ' '; }
      else if (c === "'") state = 'sq';
      else if (c === '"') state = 'dq';
      else if (c === '`') state = 'tpl';
    } else if (state === 'line') {
      if (c === '\n') state = 'code'; else out[i] = ' ';
    } else if (state === 'block') {
      if (c === '*' && n === '/') { out[i] = ' '; out[i + 1] = ' '; i++; state = 'code'; }
      else if (c !== '\n') out[i] = ' ';
    } else if (state === 'sq') {
      if (c === '\\') i++;
      else if (c === "'" || c === '\n') state = 'code';
    } else if (state === 'dq') {
      if (c === '\\') i++;
      else if (c === '"' || c === '\n') state = 'code';
    } else if (state === 'tpl') {
      if (c === '\\') i++;
      else if (c === '`') state = 'code';
    }
  }
  return out.join('');
}

// ── call scanning ───────────────────────────────────────────────────────────
// From the index of an opening '(', return { end, args } where args are the
// top-level comma-split argument substrings. String-aware; src should already
// be comment-masked.
function scanCall(src, openIdx) {
  let depth = 0, state = 'code';
  const args = [];
  let argStart = openIdx + 1;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (state === 'sq') { if (c === '\\') i++; else if (c === "'") state = 'code'; continue; }
    if (state === 'dq') { if (c === '\\') i++; else if (c === '"') state = 'code'; continue; }
    if (state === 'tpl') { if (c === '\\') i++; else if (c === '`') state = 'code'; continue; }
    if (c === "'") { state = 'sq'; continue; }
    if (c === '"') { state = 'dq'; continue; }
    if (c === '`') { state = 'tpl'; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0 && c === ')') {
        args.push(src.slice(argStart, i));
        return { end: i, args };
      }
    } else if (c === ',' && depth === 1) {
      args.push(src.slice(argStart, i));
      argStart = i + 1;
    }
  }
  return null; // unbalanced — caller reports and skips
}

// ── small parsers ───────────────────────────────────────────────────────────
// Match the '}' closing the '{' at openIdx (string-aware; masked input).
function matchBrace(src, openIdx) {
  let depth = 0, state = 'code';
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (state === 'sq') { if (c === '\\') i++; else if (c === "'") state = 'code'; continue; }
    if (state === 'dq') { if (c === '\\') i++; else if (c === '"') state = 'code'; continue; }
    if (state === 'tpl') { if (c === '\\') i++; else if (c === '`') state = 'code'; continue; }
    if (c === "'") { state = 'sq'; continue; }
    if (c === '"') { state = 'dq'; continue; }
    if (c === '`') { state = 'tpl'; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function parseObjectTable(masked, name) {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*\\{`).exec(masked);
  if (!m) return {};
  const openIdx = m.index + m[0].length - 1;
  const closeIdx = matchBrace(masked, openIdx);
  if (closeIdx < 0) return {};
  const body = masked.slice(openIdx + 1, closeIdx);
  const table = {};
  for (const mm of body.matchAll(/['"]?([\w-]+)['"]?\s*:\s*(?:'([^']*)'|"([^"]*)"|([\d.]+))/g)) {
    table[mm[1]] = mm[2] ?? mm[3] ?? (mm[4] !== undefined ? Number(mm[4]) : undefined);
  }
  return table;
}

function metaField(metaText, field) {
  if (!metaText) return null;
  const m = new RegExp(`${field}:\\s*(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\\w$.]*)|([\\d.]+))`).exec(metaText);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? (m[4] !== undefined ? Number(m[4]) : null);
}

function resolveTarget(raw, SEL) {
  if (raw == null) return null;
  if (typeof raw === 'number') return null;
  const selRef = /^SEL\.(\w+)$/.exec(raw.trim());
  if (selRef) return SEL[selRef[1]] || null;
  if (/^['"]/.test(raw.trim())) return raw.trim().slice(1, -1);
  // already unquoted literal (metaField strips quotes) or an identifier
  if (/[.#\s:[]/.test(raw) || /wpforms/.test(raw)) return raw;
  return null; // bare identifier we can't resolve statically
}

const CAMERA_VERBS = /\b(punchIn|punchToRegion|whipPan|flyToElement|fly|gcFramed)\(\s*(?:ctx\s*,\s*)?([^,)]+)/g;

function bodyCameraTargets(body, SEL) {
  const targets = [];
  for (const m of body.matchAll(CAMERA_VERBS)) {
    let arg = m[2].trim();
    // `wrap || SEL.actionWrap` → take the resolvable half
    const selInExpr = /SEL\.(\w+)/.exec(arg);
    if (selInExpr) { const v = SEL[selInExpr[1]]; if (v) { targets.push(v); continue; } }
    const lit = /^['"]([^'"]+)['"]$/.exec(arg);
    if (lit) targets.push(lit[1]);
  }
  return targets;
}

// B6-1 mutation audit — mechanical verb grep (C-SPEC C4 static mode), plus
// one level of propagation through locally-defined helper functions.
const MUTATION_VERBS = [
  /\bifm\.swap\(/, /\.swap\(/, /typeIntoIframeInput/, /\.style\./, /style\.setProperty/,
  /\.classList\./, /\.textContent\s*=/, /\.innerHTML\s*=/, /\.checked\s*=/, /\.value\s*=/,
  /\bsetAttribute\(/, /\bappendChild\(/, /\binsertBefore\(/, /\.remove\(\)/, /\bdispatchEvent\(/,
  /\binteractions\.\w+\(/,
];
function hasMutationVerb(text) { return MUTATION_VERBS.some((r) => r.test(text)); }

function mutatingHelperNames(masked) {
  const names = new Set();
  const defs = [
    ...masked.matchAll(/function\s+(\w+)\s*\(/g),
    ...masked.matchAll(/const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g),
  ];
  for (const d of defs) {
    const braceIdx = masked.indexOf('{', d.index + d[0].length - 1);
    if (braceIdx < 0) continue;
    const call = scanCall('(' + masked.slice(braceIdx), 0);
    const body = call ? call.args.join(',') : '';
    if (hasMutationVerb(body)) names.add(d[1]);
  }
  return names;
}

function familyOf(sel) {
  const m = /wpforms-panel-field-([A-Za-z0-9_]+)-([A-Za-z0-9_]+)/.exec(sel);
  if (m) return `${m[1]}-${m[2]}`;
  return sel.trim();
}

// ── runtime mode (--play) ───────────────────────────────────────────────────
async function runPlay(slug, band, masked, force) {
  // Lazy deps: static mode must never need a browser.
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const { ensureServer } = require('./generate-snapshot-outline.js');
  // Live play-through = timing-sensitive: single-runner lock, like smoke /
  // dead-time / seam-gate (rf-video 25 — timings under contention are not
  // evidence). --force overrides, timings then suspect.
  const { acquire } = require('./headless-lock');
  const release = acquire('composition-scan --play', { force });
  const port = 4395;
  const server = await ensureServer(port);
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  let data;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://localhost:${port}/videos/${slug}/index.html`, { waitUntil: 'load' });
    // Films set __T0 at play start and __dur (measured) only at the END —
    // wait for the start marker, then for __done (probe-short's contract).
    await page.waitForFunction(() => window.__T0 != null, null, { timeout: 20000 });
    console.log('playing live (__T0 set) …');
    await page.waitForFunction(() => window.__done === true, null, { timeout: 150000 });
    data = await page.evaluate(() => ({
      poses: window.__poses || [], cuts: window.__cuts || [],
      beats: window.__beats || [], dur: window.__dur,
    }));
  } finally {
    await browser.close();
    if (server) { try { server.kill(); } catch (_) {} }
    release();
  }

  const { poses, beats, dur } = data;
  // A declared cadence resolves its counts from the MEASURED duration.
  if (band.rate) band = bandFor(band.kind, band.res, dur, band.declared);
  // __cuts normalization: bare number → {t}. Two normalized kinds:
  //   {t, from, to}  — snapshot swap: resets the pose chain (new doc).
  //   {t, scene}     — editorial re-composition (the additive convention:
  //                    a scene that rebuilds its content in place pushes
  //                    window.__cuts.push({ t: now(), scene: '<name>' }) so
  //                    the meter can see what the camera never moved for).
  const cuts = data.cuts.map((c) => (typeof c === 'number' ? { t: c } : c)).filter((c) => c && Number.isFinite(c.t));

  // Camera viewport for the Δ thresholds (the ifm viewport, not the stage):
  // shorts mount 1080×1200; landscape tutorials ~1280×720. Editorial ads drive
  // a STAGE camera whose poses are stage px — the stage box is the viewport.
  const vw = band.kind === 'short' ? 1080 : band.kind === 'ad' ? band.res.width : 1280;
  const vh = band.kind === 'short' ? 1200 : band.kind === 'ad' ? band.res.height : 720;

  const events = [];
  // Bookends predate __T0 / outlive __done — source-derived (static).
  const stingM = /mountShortIntro\(/.exec(masked);
  if (stingM) {
    const call = scanCall(masked, stingM.index + stingM[0].length - 1);
    const sec = call ? /seconds:\s*([\d.]+)/.exec(call.args.join(',')) : null;
    events.push({ t: 0, key: 'bookend:sting', detail: `${sec ? sec[1] : '?'}s (source-derived)` });
  }
  // Settled poses → composition events on threshold breaks; cuts reset the chain.
  let compPose = null;
  const settledPoses = poses.filter((p) => p.settled !== false).sort((a, b) => a.t - b.t);
  let cutIdx = 0;
  const sortedCuts = [...cuts].sort((a, b) => a.t - b.t);
  for (const p of settledPoses) {
    while (cutIdx < sortedCuts.length && sortedCuts[cutIdx].t <= p.t) {
      compPose = null; // a swap replaced the document — next pose is a new framing
      cutIdx++;
    }
    const isNew = !compPose
      || Math.abs(p.zoom - compPose.zoom) > 0.08
      || Math.abs(p.tx - compPose.tx) > 0.15 * vw
      || Math.abs(p.ty - compPose.ty) > 0.15 * vh;
    if (isNew) {
      events.push({ t: p.t, key: `${p.verb}:${p.target}`, detail: `zoom ${p.zoom.toFixed(2)} tx ${p.tx.toFixed(0)} ty ${p.ty.toFixed(0)}` });
      compPose = p;
    }
  }
  // Editorial beats: distinct stage:-targets; consecutive repeats merge.
  let lastStage = null;
  for (const b of [...beats].sort((a, b2) => a.t - b2.t)) {
    if (b.target && String(b.target).startsWith('stage:')) {
      if (b.target !== lastStage) events.push({ t: b.t, key: String(b.target), detail: `editorial (beat ${b.key})` });
      lastStage = b.target;
    }
  }
  // Editorial scene cuts ({t, scene}) — in-place re-compositions.
  for (const c of cuts) {
    if (c.scene) events.push({ t: c.t, key: `scene:${c.scene}`, detail: 'editorial scene cut' });
  }
  const outroM = /mountShortOutro\(/.exec(masked);
  if (outroM) {
    const call = scanCall(masked, outroM.index + outroM[0].length - 1);
    const sec = call ? /seconds:\s*([\d.]+)/.exec(call.args.join(',')) : null;
    const oSec = sec ? Number(sec[1]) : 2.8;
    events.push({ t: Math.max(0, dur - oSec), key: 'bookend:outro', detail: `${oSec}s (source-derived)` });
  }
  events.sort((a, b) => a.t - b.t);

  console.log(`\ncompositions (runtime, measured): ${events.length}`);
  const holds = [];
  // The last framing runs to the film's END: the planned TOTAL when the source
  // declares one (a headless play-through overruns by its own lag, which is
  // not a hold), else the measured __dur. Judged against tailHold when the
  // band has one (the read-the-URL end card).
  const plannedEnd = filmDuration(masked);
  const filmEnd = Number.isFinite(plannedEnd) && plannedEnd > 0 ? Math.min(dur, plannedEnd) : dur;
  for (let i = 0; i < events.length; i++) {
    const last = i + 1 >= events.length;
    const end = last ? filmEnd : events[i + 1].t;
    const hold = Math.max(0, end - events[i].t);
    const cap = last ? (band.tailHold ?? band.hold) : band.hold;
    // A flagged hold whose window contains editorial/unattributed beats may
    // be re-composing in place, invisibly — unless the film pushes
    // {t, scene} cuts. Say so instead of letting the number mislead.
    const windowBeats = beats.filter((b) => b.t >= events[i].t - 0.2 && b.t < end && b.key !== 'open'
      && (!b.target || String(b.target).startsWith('stage:')));
    const caveat = hold > band.hold && windowBeats.length
      ? `  [window holds editorial/untargeted beat(s) ${windowBeats.map((b) => b.key).join(',')} — in-scene re-composition needs {t, scene} cuts to be seen]`
      : '';
    holds.push({ ...events[i], hold, cap });
    console.log(`  ${events[i].t.toFixed(1).padStart(5)}s  ${events[i].key.padEnd(52)} hold ${hold.toFixed(1)}s${hold > cap ? '  ⚠ > ' + cap + 's' : ''}  (${events[i].detail})${caveat}`);
  }
  const unattributed = beats.filter((b) => !b.target && b.key !== 'open');
  if (unattributed.length) {
    console.log(`  unattributed beats (no pose, no cut, no stage target — dwell folds into the surrounding hold): ${unattributed.map((b) => b.key).join(', ')}`);
  }
  const longest = holds.reduce((m, h) => Math.max(m, h.hold), 0);
  const overCap = holds.filter((h) => h.hold > h.cap);
  const n = events.length;
  if (band.undeclared) {
    console.log(`\nverdict (runtime): ${n} compositions · longest hold ${longest.toFixed(1)}s → UNDECLARED (storyboard.md "## Camera plan" states no Cadence: — the storyboard sets the cadence, ruled 2026-09-04)`);
    writeSection(slug, 'compositionScan', { mode: 'play', pass: false, undeclared: true, compositions: n, longest: +longest.toFixed(2), band: { kind: band.kind }, duration: +dur.toFixed(2),
      events: holds.map((h) => ({ t: +h.t.toFixed(2), key: h.key, hold: +h.hold.toFixed(2) })) });
    console.log('qc-report: compositionScan (measured, undeclared) written');
    if (process.argv.includes('--gate')) { console.log('gate: FAIL (undeclared cadence)'); process.exitCode = 1; }
    return;
  }
  const countVerdict = n < band.min ? 'below the declared cadence' : n > band.max ? 'above the declared cadence' : 'on cadence';
  const holdVerdict = overCap.length
    ? `${overCap.length} hold(s) over cap (longest ${longest.toFixed(1)}s; in-film cap ${band.hold}s${band.tailHold ? ', tail ' + band.tailHold + 's' : ''})`
    : `longest hold ${longest.toFixed(1)}s, none over cap (${band.hold}s${band.tailHold ? ', tail ' + band.tailHold + 's' : ''})`;
  const pass = n >= band.min && n <= band.max && overCap.length === 0;
  console.log(`\nverdict (runtime): ${n} compositions (${countVerdict}, band ${band.min}–${band.max}${band.rate ? ` for ${dur.toFixed(1)}s` : ''}) · ${holdVerdict} → ${pass ? 'PASS' : 'FAIL'}`);
  const longestEv = holds.reduce((m, h) => (h.hold > (m ? m.hold : -1) ? h : m), null);
  writeSection(slug, 'compositionScan', { mode: 'play', pass, compositions: n, longest: +longest.toFixed(2),
    longestAt: longestEv ? +longestEv.t.toFixed(2) : 0, band: { kind: band.kind, min: band.min, max: band.max, hold: band.hold, declared: band.declared ? band.declared.raw : null }, duration: +dur.toFixed(2),
    events: holds.map((h) => ({ t: +h.t.toFixed(2), key: h.key, hold: +h.hold.toFixed(2) })) });
  console.log('qc-report: compositionScan (measured) written');
    // Acceptance E-8 / C5: --gate turns the verdict into an exit code so a
  // deadbeat editorial v1 fails BEFORE render (dead-time only sees MP4s).
  if (process.argv.includes('--gate')) {
    console.log('gate: ' + (pass ? 'PASS' : 'FAIL') + (pass ? '' : '  (compositions or holds outside the landscape band)'));
    if (!pass) { process.exitCode = 1; return; }
  } else {
    console.log('report-only - pass --gate to fail on the verdict.');
  }
  process.exit(0);
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const slug = argv.find((a) => !a.startsWith('--'));
  if (!slug) { console.log('usage: node tools/composition-scan.js <slug> [--static] [--play]'); process.exit(0); }
  const htmlPath = path.join(ROOT, 'videos', slug, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`[composition-scan] no such video: videos/${slug}/index.html`); process.exit(0); }
  const src = fs.readFileSync(htmlPath, 'utf8');
  const masked = maskComments(src);

  const res = resolveResolution({ htmlPath });
  const portrait = res.height > res.width;
  const bandKind = detectBandKind(argv, src, portrait);
  const plannedDur = filmDuration(masked);
  const declared = parseDeclaredCadence(slug);
  const band = bandFor(bandKind, res, plannedDur, declared);

  if (argv.includes('--play')) {
    console.log(`composition-scan — ${slug} (runtime mode, live play-through)`);
    console.log(`stage: ${band.label}`);
    console.log(`target band: ${band.min}–${band.max} compositions, holds ≤${band.hold}s\n`);
    runPlay(slug, band, masked, argv.includes('--force')).catch((e) => {
      console.log(`[composition-scan] --play failed: ${e.message}`);
      process.exit(0); // report-only, exit 0 always
    });
    return;
  }

  const DUR = parseObjectTable(masked, 'DUR');
  const SEL = parseObjectTable(masked, 'SEL');

  // beats
  const beats = [];
  for (const m of masked.matchAll(/\bbeat\(\s*['"]([\w-]+)['"]/g)) {
    const openIdx = m.index + m[0].indexOf('(');
    const call = scanCall(masked, openIdx);
    if (!call) { console.log(`  [warn] unbalanced beat() call at index ${m.index} — skipped`); continue; }
    const [, , fnText, metaText] = call.args;
    beats.push({
      key: m[1], start: m.index, end: call.end,
      body: fnText || '', meta: metaText || '',
      dur: typeof DUR[m[1]] === 'number' ? DUR[m[1]] : null,
      target: metaField(metaText, 'target'),
      fill: metaField(metaText, 'fill'),
      hook: metaField(metaText, 'hook'),
    });
  }

  console.log(`composition-scan — ${slug} (static mode)`);
  console.log(`stage: ${band.label}`);
  console.log(`target band: ${band.min}–${band.max} compositions, holds ≤${band.hold}s (true holds are runtime-mode territory)\n`);

  if (!beats.length) {
    const plan = parseCameraPlan(masked);
    if (plan.length) { reportPlanned(slug, band, plan, plannedDur, argv); return; }
    if (/tl\.addLabel\(/.test(masked)) {
      console.log('label-driven film with NO stage camera calls (cam.punch/macro/whip/pullBack/move) — every frame is the opening frame.');
      console.log(`verdict (planned): 1 framing${band.undeclared ? '' : ` vs band ${band.min}–${band.max}`} → FAIL (a parked stage; see docs/ad-camera-gap-analysis-2026-09-03.md)`);
      if (argv.includes('--report')) writeSection(slug, 'compositionScan', { mode: 'static', pass: false, compositions: 1, longest: plannedDur, longestAt: 0, band: { kind: band.kind, min: band.min, max: band.max, hold: band.hold }, duration: plannedDur });
      if (argv.includes('--gate')) process.exitCode = 1;
      return;
    }
    console.log('no beat() manifest found — this film shape (vo()/chapter-driven) is not yet supported by static mode.');
    console.log('Long-form parser calibration lands after the next two tutorials ship (ruled 2026-08-22).');
    process.exit(0);
  }

  // snapshot per beat = last ifm.load/swap at or before the beat's end
  const snapEvents = [];
  for (const m of masked.matchAll(/ifm\.(?:load|swap)\(\s*['"]([^'"]+)['"]/g)) {
    snapEvents.push({ idx: m.index, slug: m[1] });
  }
  for (const b of beats) {
    let snap = null;
    for (const e of snapEvents) { if (e.idx <= b.end) snap = e.slug; else break; }
    b.snapshot = snap || '(none)';
  }

  // clustering
  const mutHelpers = mutatingHelperNames(masked);
  const clusters = new Map();
  const addTo = (key, kind, b, label) => {
    if (!clusters.has(key)) clusters.set(key, { key, kind, label: label || key, beats: [] });
    clusters.get(key).beats.push(b);
    b.cluster = key;
  };
  for (const b of beats) {
    const resolved = resolveTarget(b.target, SEL);
    if (b.target == null) {
      addTo(`untargeted:${b.key}`, 'untargeted', b);
    } else if (String(resolved || b.target).startsWith('stage:')) {
      addTo(String(resolved || b.target), 'editorial', b);
    } else if (resolved && /wpforms/.test(resolved)) {
      addTo(`${b.snapshot}|${familyOf(resolved)}`, 'product', b);
    } else {
      const camTargets = bodyCameraTargets(b.body, SEL).filter((t) => /wpforms/.test(t));
      if (camTargets.length) addTo(`${b.snapshot}|${familyOf(camTargets[0])}`, 'product', b, undefined);
      else addTo(`target:${b.target}`, 'unresolved', b);
    }
    // mutation audit
    const direct = hasMutationVerb(b.body);
    const viaHelper = [...mutHelpers].some((n) => new RegExp(`\\b${n}\\(`).test(b.body));
    b.mutation = direct ? 'mutates' : viaHelper ? 'mutates (via helper)' : 'none';
  }

  // bookends
  const compositions = [];
  const stingM = /mountShortIntro\(/.exec(masked);
  if (stingM) {
    const call = scanCall(masked, stingM.index + stingM[0].length - 1);
    const sec = call ? /seconds:\s*([\d.]+)/.exec(call.args.join(',')) : null;
    compositions.push({ key: 'bookend:sting', kind: 'bookend', beats: [], span: sec ? Number(sec[1]) : null });
  }
  for (const c of clusters.values()) {
    c.span = c.beats.reduce((s, b) => s + (b.dur || 0), 0);
    compositions.push(c);
  }
  const outroM = /mountShortOutro\(/.exec(masked);
  if (outroM) {
    const call = scanCall(masked, outroM.index + outroM[0].length - 1);
    const sec = call ? /seconds:\s*([\d.]+)/.exec(call.args.join(',')) : null;
    compositions.push({ key: 'bookend:outro', kind: 'bookend', beats: [], span: sec ? Number(sec[1]) : 2.8 });
  }

  // report
  console.log('beats:');
  for (const b of beats) {
    const tgt = b.target == null ? '(no target)' : String(b.target);
    console.log(`  ${b.key.padEnd(6)} ${String(b.dur ?? '?').padEnd(5)} ${b.snapshot.padEnd(28)} ${tgt.padEnd(44)} → ${b.cluster}`);
  }

  const totalNarrated = beats.reduce((s, b) => s + (b.dur || 0), 0);
  console.log(`\ncompositions (planned, static): ${compositions.length}`);
  const flags = [];
  for (const c of compositions) {
    const members = c.beats.length ? ` — beats: ${c.beats.map((b) => b.key).join(', ')}` : '';
    const span = c.span != null ? ` (planned span ${c.span.toFixed(1)}s)` : '';
    console.log(`  · ${c.key}${members}${span}`);
    if (c.kind === 'product' && (c.beats.length >= 3 || (totalNarrated && c.span >= 0.4 * totalNarrated))) {
      flags.push(`dominant cluster: "${c.key}" spans ${c.beats.length}/${beats.length} narrated beats, ` +
        `${c.span.toFixed(1)}s of ${totalNarrated.toFixed(1)}s narrated — likely a >${band.hold}s hold; confirm in runtime mode`);
    }
  }

  const n = compositions.length;
  const targeted = beats.filter((b) => b.target != null).length;
  let verdict = n < band.min ? `FAIL — below band (too few planned framings: monotony)`
    : n > band.max ? `FAIL — above band (framing churn — check moves have causes)`
    : 'PASS — within band';
  if (targeted < beats.length / 2) {
    verdict = `UNCALIBRATED — only ${targeted}/${beats.length} beats carry target meta (film predates the ` +
      `narration↔surface contract); untargeted beats count as singletons, so the static number is unreliable here. ` +
      `Long-form calibration is deferred until the next two tutorials ship (ruled 2026-08-22).`;
  }
  console.log(`\nverdict: ${n} compositions vs band ${band.min}–${band.max} → ${verdict}`);
  for (const f of flags) console.log(`  ⚠ ${f}`);

  const cameraOnly = beats.filter((b) => b.mutation === 'none' && clusters.get(b.cluster)?.kind === 'product');
  const editorialBeats = beats.filter((b) => clusters.get(b.cluster)?.kind !== 'product');
  console.log(`\nmutation audit (B6-1 — mechanical verb grep, report-only):`);
  console.log(`  camera-only product beats (no DOM mutation named): ${cameraOnly.length ? cameraOnly.map((b) => b.key).join(', ') : 'none'}`);
  if (cameraOnly.length) console.log('    ("—" is legal only for declared orientation/payoff-dwell beats — verify against the shot list)');
  if (editorialBeats.length) console.log(`  editorial/untargeted beats (audit n/a): ${editorialBeats.map((b) => b.key).join(', ')}`);
  const sbPath = path.join(ROOT, 'videos', slug, 'storyboard.md');
  const sb = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf8') : null;
  const hasShotList = sb != null && /^##\s+Shot list\s*$/mi.test(sb);
  console.log(`\nshot-list: ${hasShotList
    ? 'present — validate-singlehtml enforces beat↔row parity (WARN this season)'
    : (sb == null ? 'no storyboard.md' : 'no "## Shot list" section') + ' — grandfathered unless storyboarded after 2026-08-22 (validate-singlehtml WARNs)'}`);
  console.log('note: static mode counts PLANNED framings; in-cluster re-framing and true holds need --play.');
  process.exit(0);
}

main();
