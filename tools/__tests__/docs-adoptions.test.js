#!/usr/bin/env node
// Doc-only fixes whose acceptance is "grep finds it" (FIX-13, FIX-16b, FIX-20).
//
// Usage: node tools/__tests__/docs-adoptions.test.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.log('  ✗ ' + msg); failures++; }
}
function section(t) { console.log('\n' + t); }
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (_) { return ''; }
}

section('FIX-13 — async-approver clause');
{
  ok(/Async-approver clause/.test(read('.claude/skills/wpforms-postintro/SKILL.md')) &&
     /AUTO-APPROVED-BY-DIRECTIVE/.test(read('.claude/skills/wpforms-postintro/SKILL.md')),
    'wpforms-postintro skill carries the clause');
  ok(/Async-approver clause/.test(read('.claude/skills/wpforms-marketing/SKILL.md')) &&
     /AUTO-APPROVED-BY-DIRECTIVE/.test(read('.claude/skills/wpforms-marketing/SKILL.md')),
    'wpforms-marketing skill carries the clause');
  ok(/approver availability/.test(read('docs/codex-prompts/continuation-handoff-template.md')),
    'handoff template asks for site state + approver availability');
  // FIX-3 (fa-retest 2026-07-13): the wpforms-video copy landed — hard check.
  ok(/Async-approver clause/.test(read('.claude/skills/wpforms-video/SKILL.md')) &&
     /AUTO-APPROVED-BY-DIRECTIVE/.test(read('.claude/skills/wpforms-video/SKILL.md')),
    'wpforms-video skill carries the clause');
}

section('FIX-20 — SendGrid-retro micro-adoptions');
{
  const videoSkill = read('.claude/skills/wpforms-video/SKILL.md');
  ok(/promote-to-top standing rule/.test(videoSkill), 'wpforms-video: provider promote-to-top standing rule');
  ok(/wpforms_providers/.test(videoSkill), 'wpforms-video: internal-slug confirm via get_option(wpforms_providers)');
  ok(/fallback ladder[\s\S]{0,400}DOM-serialize[\s\S]{0,200}screenshot[\s\S]{0,200}editorial/.test(read('capture/capture-library.md')),
    'capture-library: blocked-route fallback ladder (DOM-serialize → screenshot → editorial)');
}

section('FIX-5 (fa-retest) — product-truth notes convention');
{
  ok(/docs\/product-truth\//.test(read('.claude/skills/wpforms-video/SKILL.md')),
    'wpforms-video intake checks docs/product-truth/');
  ok(/docs\/product-truth\//.test(read('.claude/skills/wpforms-marketing/SKILL.md')),
    'wpforms-marketing checks docs/product-truth/ before on-screen claims');
  const fa = read('docs/product-truth/form-analytics.md');
  ok(/Views/.test(fa) && /Interactions/.test(fa) && /Conversion Rate/.test(fa) && /Abandonments/.test(fa) && /Errors/.test(fa),
    'form-analytics note carries the five metric definitions');
  ok(/UNVERIFIED/.test(fa), 'UI-derived definitions are marked UNVERIFIED');
}

section('FIX-7 (fa-retest) — storyboard snapshot-state inventory');
{
  ok(/Snapshot-state inventory/.test(read('.claude/skills/wpforms-video/SKILL.md')),
    'wpforms-video storyboard shape requires the snapshot-state inventory');
}

section('FIX-8 (fa-retest) — design-motion-principles is manual-invoke, not "auto-triggers"');
{
  const files = [
    'CLAUDE.md',
    '.claude/skills/wpforms-marketing/SKILL.md',
    '.claude/skills/wpforms-postintro/SKILL.md',
    '.claude/skills/wpforms-gsap-rules/SKILL.md',
    'tools/skill-context.js',
  ];
  for (const f of files) {
    ok(!/auto-trigger/i.test(read(f)), `${f} no longer claims auto-triggering`);
  }
}

section('FIX-16 — primitive return contract (do I need .play()?)');
{
  const prim = read('.claude/skills/wpforms-primitives/SKILL.md');
  ok(/Return contract — "do I need `\.play\(\)`\?"/.test(prim), 'wpforms-primitives: return-contract callout present');
  ok(/`caretType`, `typeIntoIframeInput`, `clickRipple`/.test(prim), 'unpaused set enumerated');
  const lib = read('videos/_shared/motion-primitives.js');
  ok(/@returns \{gsap\.core\.Tween\} — UNPAUSED[\s\S]{0,200}export function caretType/.test(lib), 'caretType JSDoc carries the contract');
  ok(/@returns \{gsap\.core\.Timeline\} — PAUSED[\s\S]{0,200}export function statusPillMorph/.test(lib), 'statusPillMorph JSDoc carries the contract');
}

console.log(`\n${failures ? '✗ FAIL' : '✓ PASS'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
