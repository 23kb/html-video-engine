#!/usr/bin/env node
// FIX-15 — the docs/examples/ skeletons must be born validator-clean.
//
// Each skeleton is staged as a temp video dir (with narration .txt stubs for
// its DUR keys) and run through validateVideoDir — the same checks a real
// first-write faces. If a future library/validator change breaks the
// skeletons, this catches it before a session copies a stale one.
//
// Usage: node tools/__tests__/skeletons.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateVideoDir } = require('../validate-singlehtml.js');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }

function stageAndValidate(skeleton, narrationKeys) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skeleton-'));
  fs.copyFileSync(path.join(ROOT, 'docs', 'examples', skeleton), path.join(dir, 'index.html'));
  if (narrationKeys.length) {
    fs.mkdirSync(path.join(dir, 'narration'), { recursive: true });
    for (const k of narrationKeys) {
      fs.writeFileSync(path.join(dir, 'narration', `${k}.txt`), 'Placeholder narration.');
      fs.writeFileSync(path.join(dir, 'narration', `${k}.mp3`), Buffer.from([0xff, 0xfb]));
    }
  }
  const errors = [];
  const warnings = [];
  validateVideoDir(dir, { report: (level, msg) => (level === 'error' ? errors : warnings).push(msg) });
  fs.rmSync(dir, { recursive: true, force: true });
  return { errors, warnings };
}

section('Tutorial skeleton');
{
  // The placeholder snapshot ref is the ONE expected error (a real video
  // replaces CHANGE-ME-snapshot); everything else must be clean. postintro
  // is staged because postIntro is mandatory for rock tutorials (2026-07-22).
  const { errors } = stageAndValidate('single-html-tutorial-skeleton.html', ['intro', 'postintro', 'ch1-1', 'outro']);
  const unexpected = errors.filter((e) => !/CHANGE-ME-snapshot/.test(e));
  ok(unexpected.length === 0, `no unexpected validator errors (${unexpected.length})`);
  for (const e of unexpected) console.log(`        ${e}`);
  ok(errors.some((e) => /CHANGE-ME-snapshot/.test(e)), 'placeholder snapshot ref correctly flagged (author must replace it)');

  // FIX-1 (fa-retest 2026-07-13) — the skeleton must steer authors to the
  // decomposed camera + text-kit outro (both were v1 audit B-cappers twice).
  const src = fs.readFileSync(path.join(ROOT, 'docs', 'examples', 'single-html-tutorial-skeleton.html'), 'utf8');
  ok(/flyToElement/.test(src), 'example beat demonstrates flyToElement (decomposed camera)');
  ok(/mountTextReveal/.test(src), 'outro mounts its headline via text-kit');
  ok(!/gsap\.fromTo\('#signoff'/.test(src), 'no hand card-fade on the signoff');
  ok(!/await ifm\.tweenCamera\(/.test(src), 'no bare single-tween camera in the skeleton');
}

section('PostIntro skeleton');
{
  const { errors } = stageAndValidate('single-html-postintro-skeleton.html', []);
  ok(errors.length === 0, `zero validator errors (${errors.length})`);
  for (const e of errors) console.log(`        ${e}`);
  const src = fs.readFileSync(path.join(ROOT, 'docs', 'examples', 'single-html-postintro-skeleton.html'), 'utf8');
  ok(/CustomEase\.create\('logo-arrival'/.test(src) && /pi-flight/.test(src), 'named CustomEases pre-declared');
  ok(/statusPillMorph/.test(src) && /caretType/.test(src), 'canonical primitives pre-wired');
  ok(/id="chainHost"/.test(src), 'morph-chain host has a stable id');
}

section('Ad skeleton (FIX-2 fa-retest — playback/instrumentation contract baked)');
{
  const { errors } = stageAndValidate('single-html-ad-skeleton.html', []);
  ok(errors.length === 0, `zero validator errors (${errors.length})`);
  for (const e of errors) console.log(`        ${e}`);
  const src = fs.readFileSync(path.join(ROOT, 'docs', 'examples', 'single-html-ad-skeleton.html'), 'utf8');
  ok(/window\.__T0/.test(src) && /__sched/.test(src) && /window\.__done/.test(src), 'full __T0/__sched/__done instrumentation present');
  ok(/reviewScene/.test(src), '?scene= review wiring present');
  ok(/tl\.play\(\);\s*\n\s*playing = true;/.test(src), 'autoplay — tl.play() reachable without a click gate');
  ok(/eventCallback\('onComplete'/.test(src), 'end bookkeeping rides onComplete');
  ok(!/t >= TOTAL/.test(src), 'no TOTAL-constant end-check (FIX-3 class)');
  ok(!/repeat:\s*-1/.test(src), 'no infinite repeats');
  ok(/id="chainHost"/.test(src), 'morph-chain host has a stable id');
}

section('Skill wiring');
{
  ok(/single-html-tutorial-skeleton\.html/.test(fs.readFileSync(path.join(ROOT, '.claude/skills/wpforms-video/SKILL.md'), 'utf8')),
    'wpforms-video names the tutorial skeleton as first copy target');
  ok(/single-html-postintro-skeleton\.html/.test(fs.readFileSync(path.join(ROOT, '.claude/skills/wpforms-postintro/SKILL.md'), 'utf8')),
    'wpforms-postintro names the postintro skeleton as first copy target');
  ok(/single-html-ad-skeleton\.html/.test(fs.readFileSync(path.join(ROOT, '.claude/skills/wpforms-marketing/SKILL.md'), 'utf8')),
    'wpforms-marketing names the ad skeleton as first copy target (bridge-2 = vocabulary)');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
