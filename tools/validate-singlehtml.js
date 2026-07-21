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
  ['wpforms-ai-board', 'accepted legacy — repeat:-1 atmosphere loops predate the validator'],
  ['test-3d-scattered-2', 'accepted legacy — single-tween camera predates the validator'],
  ['wpforms-ai-smart-edit-scene3', 'accepted legacy — single-tween camera predates the validator'],
  ['wpforms-smart-edit-55656', 'accepted legacy — single-tween camera predates the validator'],
  ['wpforms-smart-edit-56565', 'accepted legacy — single-tween camera predates the validator'],
]);

const ESCAPE_RE = /OVERRIDE:|lint-allow/;

function validate(slug, { report }) {
  return validateVideoDir(path.join(VIDEOS, slug), { report });
}

function validateVideoDir(dir, { report }) {
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

  // ── 3. narration parity ──────────────────────────────────────────────────
  const keys = new Set();
  const durMatch = src.match(/const\s+DUR\s*=\s*\{([\s\S]*?)\};/);
  if (durMatch) {
    for (const m of durMatch[1].matchAll(/['"]?([\w-]+)['"]?\s*:/g)) keys.add(m[1]);
  }
  for (const m of src.matchAll(/\b(?:say|beat)\(\s*['"]([\w-]+)['"]/g)) keys.add(m[1]);
  for (const m of src.matchAll(/\bvo\(\s*[\d.]+\s*,\s*['"]([\w-]+)['"]/g)) keys.add(m[1]);
  const narrDir = path.join(dir, 'narration');
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
  }
  process.exit(totalErrors ? 1 : 0);
}

module.exports = { validate, validateVideoDir, listSingleHtmlSlugs };

if (require.main === module) main();
