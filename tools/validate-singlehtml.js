#!/usr/bin/env node
// validate-singlehtml.js — static validator for single-HTML videos (FIX-1).
//
// The single-HTML pattern (videos/<slug>/index.html, no manifest, no engine)
// is the DEFAULT architecture for new tutorials and all editorial pieces, but
// tools/validate-video.js only understands manifest videos. This validator
// covers the gap with static checks (no browser):
//
//   1. Every `import ... from '<path>'` and `<script src>` resolves on disk.
//   2. Every ifm.load('X') / ifm.swap('X') / snapshots/X/ literal → the
//      snapshot exists on disk AND is registered in snapshots/index.json.
//   3. Narration parity: every DUR key / say('k') / beat('k') / vo(t,'k')
//      has narration/<k>.txt; warn when the .mp3 is missing or older.
//   4. Instrumentation contract (__T0 / __sched / __done / __dur — consumed
//      by tools/render-singlehtml-audio.js): all present = ok, none = warn
//      (not instrumented), partial = ERROR. HARD ERROR when end bookkeeping
//      is gated on a hand-summed TOTAL comparison (the FIX-3 bug class).
//   5. video-guard rules re-run file-wide (hand cursor, single-tween camera,
//      native <select>, repeat:-1) — same escapes as the hook
//      (`// OVERRIDE: <reason>` / `lint-allow: <rule-id>` on the line).
//   6. Hidden-tab-hazard heuristic (WARN): bare `await` on gsap.to(...) /
//      .glide( / .click( — see INV-17. Escape: `// lint-allow: raw-await`.
//   2b/3a/3c (WARNs added 2026-08-28, engine action points AP-2/3/14):
//      payoff — no frontend-* snapshot mounted and no `// PAYOFF:` /
//      `// PAYOFF-EXEMPT: <reason>` marker; orphaned clips / DUR keys nothing
//      schedules; zero-parameter beat() motionFns (the at() clock never
//      arrives; escape `// lint-allow: no-at`); clips re-synthesized after the
//      last index.html edit. A missing narration/ folder is a WARN, not a crash.
//
// Companion runtime smoke: tools/smoke-singlehtml.js.
//
// Usage:
//   node tools/validate-singlehtml.js <slug>
//   node tools/validate-singlehtml.js --all      (every manifest-less videos/*/index.html)
//
// Exit: 0 ok (warnings allowed) · 1 errors · 2 usage/not-found.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { findTotalEndchecks, LEGACY_ALLOWLIST } = require('./detect-total-endcheck.js');
const { RULES } = require('./hooks/video-guard.js');

const ROOT = path.resolve(__dirname, '..');
const VIDEOS = path.join(ROOT, 'videos');
const SNAP = path.join(ROOT, 'snapshots');

// Legacy single-HTML videos frozen before this validator existed (accepted,
// don't touch — surgical rule). Skipped in --all mode ONLY (still validatable
// one-off). Do NOT add entries: every new video must pass clean. The 4
// canaries are deliberately absent.
const ALL_MODE_SKIP = new Map([
  ...[...LEGACY_ALLOWLIST].map((s) => [s, 'TOTAL end-check in local scrubber chrome (pre-FIX-3 frozen list)']),
  // The other frozen entries are [slug, reason] pairs in tools/local-films.local.json.
  ...(require('./lib/local-films.js').validatorAllModeSkip || []),
]);

const ESCAPE_RE = /OVERRIDE:|lint-allow/;

function validate(slug, { report }) {
  return validateVideoDir(path.join(VIDEOS, slug), { report });
}

function validateVideoDir(dir, { report }) {
  const slug = path.basename(dir);
  const file = path.join(dir, 'index.html');
  if (!fs.existsSync(file)) {
    report('error', `${path.relative(ROOT, file)} not found`);
    return;
  }
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);

  // ── 1. imports + script src resolve ─────────────────────────────────────
  const refs = [];
  for (const m of src.matchAll(/^\s*import\s+[^'"]*['"]([^'"]+)['"]/gm)) refs.push(m[1]);
  for (const m of src.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) refs.push(m[1]);
  for (const ref of refs) {
    if (/^https?:\/\//.test(ref)) { report('warning', `external URL in import/src (offline render will miss it): ${ref}`); continue; }
    const clean = ref.split(/[?#]/)[0];
    const abs = clean.startsWith('/') ? path.join(ROOT, clean) : path.join(dir, clean);
    if (!fs.existsSync(abs)) report('error', `unresolvable import/src: ${ref}`);
  }

  // ── 2. snapshot references exist + registered ───────────────────────────
  let indexSlugs = null;
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(SNAP, 'index.json'), 'utf8'));
    indexSlugs = new Set((idx.snapshots || []).map((s) => s.slug));
  } catch (_) { report('warning', 'snapshots/index.json unreadable — registration check skipped'); }
  const snapRefs = new Set();
  for (const m of src.matchAll(/ifm\.(?:load|swap)\(\s*['"]([^'"]+)['"]/g)) snapRefs.add(m[1]);
  for (const m of src.matchAll(/['"(]\/?snapshots\/([^/'"]+)\//g)) snapRefs.add(m[1]);
  for (const ref of snapRefs) {
    if (ref === '_shared') continue;
    if (!fs.existsSync(path.join(SNAP, ref, 'index.html'))) {
      report('error', `snapshot reference does not exist on disk: snapshots/${ref}/`);
    } else if (indexSlugs && !indexSlugs.has(ref)) {
      report('error', `snapshot "${ref}" not registered in snapshots/index.json (run post-capture / add it)`);
    }
  }

  // ── 2b. payoff surface (AP-2; rulebook §1 "You storyboard a how-to") ──────
  // The LAST beat is the payoff on a real frontend surface. Six films, three
  // paths, both agents shipped without one (geo 6, ee, saa, lf 8; cad 11 /
  // cpa 16). WARN when no frontend-* snapshot is mounted AND the film carries
  // neither `// PAYOFF: <surface>` nor `// PAYOFF-EXEMPT: <reason>` (the
  // declared outside-product outcome — webhooks-class, wh 7).
  const mountsFrontend = [...snapRefs].some((s) => /^frontend-/.test(s));
  const payoffMarker = /\/\/\s*PAYOFF(?:-EXEMPT)?:/.test(src);
  if (!mountsFrontend && !payoffMarker) {
    report('warning', 'payoff: no frontend-* snapshot is mounted and no `// PAYOFF: <surface>` / `// PAYOFF-EXEMPT: <reason>` marker exists — the last beat shows the outcome on a real frontend surface, or the storyboard declares why not (rulebook §1; geo 6, cad 11)');
  }

  // ── 3. narration parity ──────────────────────────────────────────────────
  const keys = new Set();
  const durMatch = src.match(/const\s+DUR\s*=\s*\{([\s\S]*?)\};/);
  if (durMatch) {
    for (const m of durMatch[1].matchAll(/['"]?([\w-]+)['"]?\s*:/g)) keys.add(m[1]);
  }
  for (const m of src.matchAll(/\b(?:say|beat)\(\s*['"]([\w-]+)['"]/g)) keys.add(m[1]);
  for (const m of src.matchAll(/\bvo\(\s*[\d.]+\s*,\s*['"]([\w-]+)['"]/g)) keys.add(m[1]);
  const narrDir = path.join(dir, 'narration');
  if (keys.size && !fs.existsSync(narrDir)) {
    report('warning', `no narration/ folder yet (${keys.size} key(s) scheduled) — write narration/<key>.txt per key, then: node tts/generate.js --video ${slug}`);
  }
  for (const key of keys) {
    const txt = path.join(narrDir, `${key}.txt`);
    const mp3 = path.join(narrDir, `${key}.mp3`);
    if (!fs.existsSync(txt)) {
      report('error', `narration key "${key}" has no narration/${key}.txt`);
    } else if (!fs.existsSync(mp3)) {
      report('warning', `narration/${key}.mp3 missing (render narration: node tts/generate.js --video ${slug})`);
    } else if (fs.statSync(mp3).mtimeMs < fs.statSync(txt).mtimeMs) {
      report('warning', `narration/${key}.mp3 older than its .txt — re-render narration`);
    }
  }

  // ── 3a. orphaned clips / DUR keys (AP-14; receipt cpa 8) ─────────────────
  // The render log's clips=N/N denominator is the film's OWN schedule, so a
  // clip that exists on disk (and in DUR) but is never say()/beat()/vo()'d is
  // a silent hole nothing else reports. WARN, never error. Kacie's
  // intro/outro reading scripts are .txt only — they never appear here.
  const scheduled = new Set();
  for (const m of src.matchAll(/\b(?:say|beat|narrSay|narrBeat)\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?['"]([\w-]+)['"]/g)) scheduled.add(m[1]);
  for (const m of src.matchAll(/\bvo\(\s*[\d.]+\s*,\s*['"]([\w-]+)['"]/g)) scheduled.add(m[1]);
  if (scheduled.size) {
    const durKeys = durMatch ? [...durMatch[1].matchAll(/['"]?([\w-]+)['"]?\s*:/g)].map((m) => m[1]) : [];
    for (const k of durKeys) {
      if (!scheduled.has(k)) report('warning', `orphaned DUR key "${k}" — no say()/beat()/vo() schedules it (silent hole; cpa 8)`);
    }
    if (fs.existsSync(narrDir)) {
      for (const f of fs.readdirSync(narrDir)) {
        if (!/\.mp3$/i.test(f)) continue;
        const k = f.replace(/\.mp3$/i, '');
        if (!scheduled.has(k)) report('warning', `orphaned clip narration/${f} — no say()/beat()/vo() schedules "${k}" (silent hole; cpa 8)`);
      }
    }
  }

  // ── 3c. spoken-sync: zero-parameter beat() motionFns (AP-3; wh 4 bounds it) ─
  // beat() hands an at(word) clock as the motionFn's FIRST argument. A
  // motionFn declared `async () =>` never receives it, so every click and
  // camera move fires at t=0 of the clip while the voice names it seconds
  // later (58 beats across 6 films, zero using at(); cpa 11 MUST FIX, sxf ×2).
  // WARN, not ERROR: hand-tuned leading waits are legal, but voice-coupled.
  // Heuristic: `beat(` and `() =>` on the same line. Escape: // lint-allow: no-at
  const zeroArg = [];
  lines.forEach((line, i) => {
    if (ESCAPE_RE.test(line)) return;
    const code = line.split('//')[0];
    if (/\bbeat\(/.test(code) && /(?:async\s*)?\(\s*\)\s*=>/.test(code)) zeroArg.push(i + 1);
  });
  if (zeroArg.length) {
    report('warning', `spoken-sync: ${zeroArg.length} beat() motionFn(s) declare zero parameters (lines ${zeroArg.slice(0, 8).join(', ')}${zeroArg.length > 8 ? ', …' : ''}) — the at(word) clock never arrives and motion fires at t=0 of the clip; take "async (at) => { await wait(at('word')); … }" (rulebook §8). Leading waits are legal but voice-coupled. Escape: // lint-allow: no-at`);
  }
  // Re-synthesis drift: any mp3 newer than index.html means the DUR paste and
  // every hand-tuned leading wait were tuned against an older voice.
  if (fs.existsSync(narrDir)) {
    const htmlMtimeAll = fs.statSync(file).mtimeMs;
    const newer = fs.readdirSync(narrDir).filter((f) => /\.mp3$/i.test(f) && fs.statSync(path.join(narrDir, f)).mtimeMs > htmlMtimeAll);
    if (newer.length) {
      report('warning', `narration re-synthesized since last code tune: ${newer.length} clip(s) newer than index.html (${newer.slice(0, 4).join(', ')}${newer.length > 4 ? ', …' : ''}) — re-run tools/measure-narration.js, re-paste DUR, re-check any hand-tuned leading waits`);
    }
  }

  // ── 3b. DUR drift vs the actual mp3s (A8, shorts fix round 2026-08-13) ───
  // The DUR table is voice-coupled and hand-pasted; clips re-rendered after
  // the paste silently desync every beat (stop-fast-bots QC). ffprobe each
  // mp3 and compare against the pasted entry. The pasted value includes the
  // measure-narration settle (default +0.4s, stamped in its emitted comment)
  // — parse it from the file so a correctly-pasted table reads as 0 drift.
  if (durMatch) {
    const durTable = {};
    for (const m of durMatch[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*([\d.]+)/g)) durTable[m[1]] = Number(m[2]);
    const settleM = src.match(/\(\+([\d.]+)s settle\)/);
    const settle = settleM ? Number(settleM[1]) : 0.4;
    const DRIFT_LIMIT = 0.15;
    let ffprobeDead = false;
    const htmlMtime = fs.statSync(file).mtimeMs;
    for (const [key, pasted] of Object.entries(durTable)) {
      const mp3 = path.join(narrDir, `${key}.mp3`);
      if (!fs.existsSync(mp3) || ffprobeDead) continue;
      const r = spawnSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' });
      const measured = r.status === 0 ? parseFloat(r.stdout) : NaN;
      if (!Number.isFinite(measured)) {
        if (r.error || r.status !== 0) { report('warning', 'ffprobe unavailable or failed — DUR drift check skipped'); ffprobeDead = true; }
        continue;
      }
      const drift = pasted - (measured + settle);
      if (Math.abs(drift) > DRIFT_LIMIT) {
        report('error', `DUR drift: ${key} pasted ${pasted}s vs measured ${measured.toFixed(2)}s+${settle}s settle = ${(measured + settle).toFixed(2)}s (drift ${drift > 0 ? '+' : ''}${drift.toFixed(2)}s > ${DRIFT_LIMIT}s) — re-run tools/measure-narration.js and repaste`);
      }
      if (fs.statSync(mp3).mtimeMs > htmlMtime) {
        report('warning', `narration/${key}.mp3 is newer than index.html — the DUR paste predates this render; re-measure to confirm`);
      }
    }
  }

  // ── 4. instrumentation contract ──────────────────────────────────────────
  const importsSharedBeats = /import\s+[^'"]*\b(?:say|beat)\b[^'"]*['"]\/videos\/_shared\/narration\.js['"]/.test(src)
    || /import\s+\{[^}]*\b(?:say|beat)\b[^}]*\}\s*from\s*['"]\/videos\/_shared\/narration\.js['"]/.test(src);
  const has = {
    __T0: /__T0\s*=/.test(src),
    __sched: /__sched\b/.test(src) || importsSharedBeats,
    __done: /__done\s*=/.test(src),
    __dur: /__dur\s*=/.test(src),
  };
  const present = Object.values(has).filter(Boolean).length;
  if (present === 0) {
    report('warning', 'not instrumented (__T0/__sched/__done/__dur) — tools/render-singlehtml-audio.js will exit 2 on this video');
  } else if (present < 4) {
    const missing = Object.keys(has).filter((k) => !has[k]);
    report('error', `instrumentation contract incomplete — missing ${missing.join(', ')} (render-singlehtml-audio.js hangs or mis-times without them)`);
  }
  for (const f of findTotalEndchecks(src)) {
    report('error', `TOTAL end-check at line ${f.line} (${f.kind}) — end bookkeeping gated on a hand-summed TOTAL is unreachable when TOTAL drifts; use tl.eventCallback('onComplete', ...) [${f.excerpt}]`);
  }

  // ── 5. video-guard rules, file-wide ──────────────────────────────────────
  // Severity split: repeat:-1 and single-tween-camera are unambiguous →
  // errors. The cursor / native-<select> rules false-positive on accepted
  // videos (snapshot-copied markup, `gsap.to(cursor.el)` fades, comments) —
  // the write-time hook stays the hard gate for new code; here they warn.
  const GUARD_ERROR_IDS = new Set(['infinite-repeat', 'single-tween-camera']);
  lines.forEach((line, i) => {
    if (ESCAPE_RE.test(line)) return;
    const code = line.split('//')[0]; // rules never match URLs, so this only sheds comments
    for (const rule of RULES) {
      if (rule.re.test(code)) {
        report(GUARD_ERROR_IDS.has(rule.id) ? 'error' : 'warning',
          `[video-guard:${rule.id}] line ${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
  });

  // ── 6. hidden-tab hazard heuristic (INV-17) ──────────────────────────────
  lines.forEach((line, i) => {
    if (/lint-allow:\s*raw-await/.test(line) || (i > 0 && /lint-allow:\s*raw-await/.test(lines[i - 1]))) return;
    if (/\bawait\s+(?:gsap\.(?:to|from|fromTo|timeline)\s*\(|[A-Za-z_$][\w$.]*\.(?:glide|click)\s*\()/.test(line)) {
      report('warning', `line ${i + 1}: bare await on a tween-backed primitive — deadlocks under RAF throttle if reached in the master flow (INV-17). Wrap in withTimeout(...) or move inside a beat motionFn. Escape: // lint-allow: raw-await`);
    }
  });

  // ── 7. seek-parity hazards (WARN) ────────────────────────────────────────
  // A `--seek` render jumps to a timestamp and screenshots. Two constructs
  // cannot survive that: `ifm.swap()` is a Promise, so the station a frame
  // needs may not be mounted when the frame is taken; a `tl.call()` that
  // mutates DOM fires once, forward-only, so a backward seek leaves the DOM in
  // the later state (rf-weight 5, rf-election 6/15, rf-video 2).
  //
  // WARN, not error: tutorials render wall-clock via render-singlehtml-audio,
  // where both are fine. It matters when a film is seek-rendered or probed by
  // seeking — which is how every stills sheet and qc-probe reads a film.
  // The seek-safe shape is: preload every station, and derive discrete state
  // from tl.time() in an onUpdate so it re-derives in both directions.
  const seekHazards = [];
  lines.forEach((line, i) => {
    if (ESCAPE_RE.test(line)) return;
    const code = line.split('//')[0];
    if (/\.swap\s*\(/.test(code) && /\bifm|IframeManager|\bstation/i.test(code)) {
      seekHazards.push(`line ${i + 1}: ifm.swap() — the station may not be mounted at an arbitrary seek`);
    }
    if (/\btl\.call\s*\(/.test(code)) {
      seekHazards.push(`line ${i + 1}: tl.call() — fires forward-only; if it mutates DOM the state does not revert on a backward seek`);
    }
  });
  if (seekHazards.length) {
    report('warning', `seek parity: ${seekHazards.length} construct(s) that a --seek render or a seeking probe cannot reproduce. Preload stations instead of swapping, and derive state from tl.time() in onUpdate. Escape: // lint-allow: seek-parity`);
    for (const h of seekHazards.slice(0, 6)) report('warning', `  ${h}`);
    if (seekHazards.length > 6) report('warning', `  … ${seekHazards.length - 6} more`);
  }

  // ── 8. storyboard artifacts (C1 shot list + P5 PostIntro story) ──────────
  // Both WARN this season (ruled 2026-08-22): the shot-list parity check
  // flips to ERROR after two films have shipped with shot lists; the
  // data-postintro check stays report-only — the hard gate is the human
  // Story Proof approval. Zero errors added to --all on the frozen legacy
  // list, by construction.
  const sbFile = path.join(dir, 'storyboard.md');
  const sb = fs.existsSync(sbFile) ? fs.readFileSync(sbFile, 'utf8') : null;
  const hasShotList = sb != null && /^##\s+Shot list\s*$/mi.test(sb);

  // Beat keys for parity = the film's beat()/vo() calls (C-SPEC C1: exactly
  // the narration-parity scanner's shapes, minus bare DUR entries).
  const shotKeys = new Set();
  for (const m of src.matchAll(/\bbeat\(\s*['"]([\w-]+)['"]/g)) shotKeys.add(m[1]);
  for (const m of src.matchAll(/\bvo\(\s*[\d.]+\s*,\s*['"]([\w-]+)['"]/g)) shotKeys.add(m[1]);

  if (shotKeys.size && !hasShotList) {
    // Grandfather clause: one line total, never per-beat noise. Films
    // storyboarded after 2026-08-22 must carry the section.
    report('warning', `storyboard.md ${sb == null ? 'missing' : 'has no "## Shot list" section'} — required for films storyboarded after 2026-08-22 (grandfathered before; format: docs/storyboard-format-morph-chain-2026-05-10.md)`);
  } else if (shotKeys.size && hasShotList) {
    // Parse the shot-list table: rows between the section heading and the
    // next "## " heading; first column = beat key; the transformation
    // column is located by the header row so column order can evolve.
    const section = sb.split(/^##\s+Shot list\s*$/mi)[1].split(/^##\s+/m)[0];
    const rows = section.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
    let transIdx = -1;
    let beatIdx = -1; // located by header text (acceptance T-5) - a reordered
    // table (leading # column) used to silently fail parity.
    const listed = new Map(); // beat key -> transformation cell
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim());
      if (/^[-\s:|]+$/.test(row)) continue; // separator row
      if (transIdx === -1) {
        transIdx = cells.findIndex((c) => /transformation/i.test(c));
        const bi = cells.findIndex((c) => /^beat$/i.test(c));
        beatIdx = bi > 0 ? bi : 1;
        continue; // header row
      }
      const bk = cells[beatIdx] || cells[1];
      if (bk) listed.set(bk, transIdx > 0 ? (cells[transIdx] || '') : null);
    }
    for (const key of shotKeys) {
      if (!listed.has(key)) report('warning', `shot-list parity: beat "${key}" has no row in storyboard.md "## Shot list" (WARN this season; ERROR after two shipped films — ruled 2026-08-22)`);
    }
    for (const [key, trans] of listed) {
      if (trans === '') report('warning', `shot-list parity: row "${key}" has an empty transformation cell — name the DOM mutation or an explicit "—" for a declared orientation/payoff-dwell beat (mp 0)`);
    }
  }

  // A film that marks a postIntro scene root (data-postintro — the cheap
  // authoring convention from the Story Proof flow) must carry the approved
  // phase table in storyboard.md under "## PostIntro story".
  if (/data-postintro/.test(src) && !(sb != null && /^##\s+PostIntro story\s*$/mi.test(sb))) {
    report('warning', `index.html carries a data-postintro marker but storyboard.md ${sb == null ? 'is missing' : 'has no "## PostIntro story" section'} — copy the approved Story Proof phase table there (wpforms-postintro)`);
  }
}

function listSingleHtmlSlugs() {
  return fs.readdirSync(VIDEOS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name)
    .filter((s) => fs.existsSync(path.join(VIDEOS, s, 'index.html')) && !fs.existsSync(path.join(VIDEOS, s, 'manifest.json')))
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  // Opt-in qc-report.json emit (QC dashboard). Default behavior unchanged.
  const emitReport = args.includes('--report');
  const slugs = all ? listSingleHtmlSlugs().filter((s) => {
    if (ALL_MODE_SKIP.has(s)) { console.log(`- ${s}: skipped (${ALL_MODE_SKIP.get(s)})`); return false; }
    return true;
  }) : args.filter((a) => !a.startsWith('--'));

  if (!slugs.length) {
    console.error('Usage: node tools/validate-singlehtml.js <slug> | --all');
    process.exit(2);
  }

  let totalErrors = 0;
  for (const slug of slugs) {
    const errors = [];
    const warnings = [];
    validate(slug, { report: (level, msg) => (level === 'error' ? errors : warnings).push(msg) });
    const mark = errors.length ? '✗' : '✓';
    console.log(`${mark} ${slug}: ${errors.length} error(s), ${warnings.length} warning(s)`);
    for (const e of errors) console.log(`    ERROR ${e}`);
    for (const w of warnings) console.log(`    warn  ${w}`);
    totalErrors += errors.length;
    if (emitReport) {
      require('./lib/qc-report').writeSection(slug, 'validator', {
        pass: errors.length === 0, errors: errors.length, warnings: warnings.length,
        errorList: errors, warnList: warnings,
      });
    }
  }
  process.exit(totalErrors ? 1 : 0);
}

module.exports = { validate, validateVideoDir, listSingleHtmlSlugs };

if (require.main === module) main();
