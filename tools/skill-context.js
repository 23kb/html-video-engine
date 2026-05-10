#!/usr/bin/env node
// Print the canonical skill context for a new session.
// Slim routing index — topic rules live in skills, not here.
// This file just tells you which path you're on, which skill to load,
// and where to find canonical references.
//
// Usage:
//   node tools/skill-context.js          # human-readable
//   node tools/skill-context.js --json   # machine-readable

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const MISSION =
  'Guided HTML video builder. Three paths: (1) Tutorial — real WPForms UI in iframe + manifest + chapters + narration. (2) Pure editorial — single self-contained HTML, no engine, clone from reference/html-templates/. (3) Mixed — editorial chrome composited over real product UI via surface: mixed. MP4 capture in-repo via tools/render.js.';

const START_RULE =
  'STEP 1: pick a path (see PATHS below). STEP 2: load the matching primary skill. STEP 3: for repo-wide context (boot order, protected core, validation, push-back), read CLAUDE.md. Topic rules live in skills.';

const PATHS = [
  {
    name: 'Tutorial',
    when: 'Real product UI, narration-driven, viewer learns a workflow',
    architecture: 'Engine + manifest.json + chapters/*.js + narration mp3s, surface: iframe (default)',
    primarySkill: 'wpforms-video',
    auditGate: 'wpforms-motion-audit on any postIntro/cinematic beat'
  },
  {
    name: 'Pure editorial / ad-style',
    when: 'No real product UI, motion-heavy, ad/announcement piece',
    architecture: 'Single self-contained HTML (videos/<slug>/index.html), vendored GSAP, NO runtime/player.js, clone from reference/html-templates/',
    primarySkill: 'wpforms-marketing',
    auditGate: 'wpforms-motion-audit (mandatory) + morph-chain storyboard section (docs/storyboard-format-morph-chain-2026-05-10.md)'
  },
  {
    name: 'Mixed',
    when: 'Editorial chrome composited over real product UI (e.g. klaviyo-addon-intro, wpforms-rest-api-overview-polished)',
    architecture: 'Engine + chapters with surface: mixed',
    primarySkill: 'wpforms-marketing + wpforms-transitions',
    auditGate: 'wpforms-motion-audit (mandatory)'
  },
];

const SKILLS = [
  { name: 'wpforms-video',       path: '.claude/skills/wpforms-video/SKILL.md',       use: 'Tutorial authoring, intake, storyboard gate, default authoring mode, legacy chapter shape, modes, production truth.' },
  { name: 'wpforms-postintro',   path: '.claude/skills/wpforms-postintro/SKILL.md',   use: 'PostIntro design + multi-animation rule + canonical references + snapshot handoff + morph-chain integration.' },
  { name: 'wpforms-gsap-rules',  path: '.claude/skills/wpforms-gsap-rules/SKILL.md',  use: 'GSAP L0 discipline + camera-decomposition + registered timelines + pausableRaf + Flip + effects library + designer principles (Emil/Krehel/Jhey).' },
  { name: 'wpforms-marketing',   path: '.claude/skills/wpforms-marketing/SKILL.md',   use: 'Editorial / ad-style surfaces (surface: editorial/mixed) + reference/html-templates/ clones + brand canonical + blocks + atmospheric kit + text-kit.' },
  { name: 'wpforms-transitions', path: '.claude/skills/wpforms-transitions/SKILL.md', use: 'Chapter breaks (glide/dolly/whip) + swap styles (flipBridge default) + camera poses + shared scene + scrubber/render.' },
  { name: 'wpforms-motion-audit', path: '.claude/skills/wpforms-motion-audit/SKILL.md', use: 'Score animations and camera moves S-F tier with hard-rule calibration. MUST run before any postIntro/cinematic/editorial handoff.' },
];

const AUTO_TRIGGER_EXTERNAL_SKILLS = [
  { name: 'design-motion-principles', source: 'kylezantos (installed at .agents/skills/)', use: 'Designer-grade audit by Emil Kowalski / Jakub Krehel / Jhey Tompkins principles. Complements wpforms-motion-audit (which scores; this critiques per designer philosophy).' },
];

const OPERATOR_MANUALS = [
  { path: 'CLAUDE.md', agent: 'Claude', use: 'Always loaded by Claude Code. Pick-your-path decision tree + boot order + protected core + validation + push-back triggers.' },
  { path: 'AGENTS.md', agent: 'Codex',  use: 'Always loaded by Codex. Full sync with CLAUDE.md. Verify with: node tools/check-claude-agents-sync.js' },
];

const REFERENCE_TEMPLATES = [
  { path: 'reference/html-templates/wpforms-ai-prompt-open.html', use: 'S-tier identity-continuity morph (Button → Input → Pill → Chat). Canonical clone target for editorial work.' },
  { path: 'reference/html-templates/editorial-reference-36s.html', use: '36s OpenAI Layo rebuild, A-tier, 13 beats with named atmospheres + transitions. Linear-scene editorial reference.' },
  { path: 'reference/html-templates/openai-replica-18s.html', use: 'First-try single-HTML proof. Built by mimicking a contact sheet. Validates the clone-and-customize pattern.' },
];

const BRAND_CANONICAL = [
  { path: 'reference/wpforms-brand/BRAND.md', use: 'Usage doc + anti-patterns + AI chat structure + real templates API reference.' },
  { path: 'reference/wpforms-brand/tokens.css', use: 'Drop-in CSS variables: --wpf-orange (#E27730 primary), --wpf-blue, --wpf-ai-purple (AI-feature-only).' },
  { path: 'reference/wpforms-brand/assets/', use: 'Real Sullie master, loading-avatar/spinner, AI 3-dot chat spinner. Use these; do NOT invent brand details.' },
];

const KEY_DOCS = [
  { path: 'docs/INDEX.md',                                              when: 'First — one-line-per-doc index. Use to find the right doc fast.' },
  { path: 'docs/authoring-api.md',                                       when: 'Public authoring contract reference. Manifest schema, chapter exports, descriptor mode, validator behavior.' },
  { path: 'docs/editorial-direction-audit-2026-05-10.md',                when: 'Master 7-phase plan after 3 failed editorial attempts. Read first if working on editorial-track.' },
  { path: 'docs/winning-pattern-analysis-2026-05-10.md',                 when: 'What 3 winning videos share vs 3 failed editorial videos. Identity-continuity authoring rule lives here.' },
  { path: 'docs/wpforms-source-inventory-2026-05-10.md',                 when: 'Real WPForms brand + motion + UI inventory from live plugin source.' },
  { path: 'docs/storyboard-format-morph-chain-2026-05-10.md',            when: 'Editorial storyboards MUST include the morph-chain section. Authoring contract.' },
  { path: 'docs/polish-vocabulary-2026-05-11.md',                        when: 'Per-chapter deltas between rest-api-overview and rest-api-overview-polished. Tutorial-polish primitive vocabulary.' },
];

const SHARED_KITS = [
  { path: 'videos/_shared/kit.js',         use: 'loadGsap, awaitTween, withGsapContext, registerTimeline (paused-timeline registration), registerCameraPose, pausableRaf, mulberry32. See wpforms-gsap-rules.' },
  { path: 'videos/_shared/effects.js',     use: 'gsap.registerEffect library: highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow. See wpforms-gsap-rules.' },
  { path: 'videos/_shared/atmospheric.js', use: 'Marketing-mode helpers: grain, sweep, parallax pair, scale push, dark backdrop. See wpforms-marketing.' },
  { path: 'videos/_shared/blocks/',        use: 'Editorial blocks: code-card, mac-window, phone-frame, pill, arrow, route-line, terminal. See wpforms-marketing.' },
  { path: 'videos/_shared/text-kit.js',    use: '24 Pixel-Point-style text-reveal presets. See wpforms-marketing.' },
  { path: 'videos/_shared/lottie-kit.js',  use: 'Lottie editorial bumpers, stings, badges.' },
  { path: 'videos/_shared/three-kit.js',   use: 'Three.js scene helpers (loaded separately from kit.js).' },
];

const TOOLS = [
  { cmd: 'node tools/skill-context.js',                                                          use: 'This file. Routing index.' },
  { cmd: 'node tools/check-claude-agents-sync.js [--fix]',                                       use: 'Verify CLAUDE.md and AGENTS.md are in sync. Run before any commit touching either file.' },
  { cmd: 'node tools/list-snapshots.js [--search <q>] [--for <slug>]',                           use: 'Snapshot inventory + cross-reference per video.' },
  { cmd: 'node tools/field-state.js --field <name> [--summary] | --list | --search <q>',        use: 'Query field-state inventory (132 KB doc) without full-reading.' },
  { cmd: 'node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]',         use: 'Catalog-grounded selectors from a real snapshot.' },
  { cmd: 'node tools/verify-selectors.js <snapshot> ...',                                        use: 'Selector existence check.' },
  { cmd: 'node tts/generate.js --video <slug>',                                                  use: 'Render narration mp3s.' },
  { cmd: 'node tools/validate-video.js <slug>',                                                  use: 'Static validator.' },
  { cmd: 'node tools/check-video-playback.js <slug> [--seconds <n>]',                            use: 'Non-visual smoke. Exit 0 = clean boot, 1 = boot fail, 2 = page errors.' },
  { cmd: 'node tools/render.js <slug> [--seek] [--fps 30]',                                      use: 'MP4 export. Default wall-clock; --seek only valid for surface: editorial.' },
  { cmd: 'node tools/preview.js [--video <slug>] [--port 4321]',                                 use: 'Live-reload preview server + scrubber UI.' },
  { cmd: 'node tools/lint-determinism.js [--all] [--video <slug>]',                              use: 'Determinism linter (Date.now/fetch errors, Math.random/setTimeout warnings).' },
  { cmd: 'npm run lint',                                                                          use: 'Composes validate-video.js --all + lint-determinism.js --all.' },
];

const KNOWN_VIDEO_EXCLUDE = new Set([
  'surveys-and-polls-v4-approved',
  'surveys-and-polls-v4-final',
  'surveys-and-polls-v4-final-bgm',
]);

function exists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function listVideos() {
  const dir = path.join(REPO_ROOT, 'videos');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .filter(d => !KNOWN_VIDEO_EXCLUDE.has(d.name))
    .map(d => d.name)
    .sort();
}

function buildContext() {
  return {
    mission: MISSION,
    startRule: START_RULE,
    paths: PATHS,
    skills: SKILLS.map(s => ({ ...s, present: exists(s.path) })),
    autoTriggerExternalSkills: AUTO_TRIGGER_EXTERNAL_SKILLS,
    operatorManuals: OPERATOR_MANUALS.map(m => ({ ...m, present: exists(m.path) })),
    referenceTemplates: REFERENCE_TEMPLATES.map(r => ({ ...r, present: exists(r.path) })),
    brandCanonical: BRAND_CANONICAL.map(b => ({ ...b, present: exists(b.path) })),
    keyDocs: KEY_DOCS.map(d => ({ ...d, present: exists(d.path) })),
    sharedKits: SHARED_KITS.map(k => ({ ...k, present: exists(k.path) })),
    tools: TOOLS,
    knownVideoPackages: listVideos(),
  };
}

function printHuman(ctx) {
  const out = [];
  out.push('# Skill Context');
  out.push('');
  out.push(ctx.mission);
  out.push('');
  out.push(ctx.startRule);
  out.push('');
  out.push('## STEP 1 — Pick your path');
  out.push('');
  for (const p of ctx.paths) {
    out.push(`  [${p.name}]`);
    out.push(`    When:          ${p.when}`);
    out.push(`    Architecture:  ${p.architecture}`);
    out.push(`    Primary skill: ${p.primarySkill}`);
    out.push(`    Audit gate:    ${p.auditGate}`);
    out.push('');
  }
  out.push('## STEP 2 — Load the matching skill');
  for (const s of ctx.skills) {
    out.push(`  ${s.present ? '✓' : '✗'} ${s.name} — ${s.path}`);
    out.push(`      ${s.use}`);
  }
  out.push('');
  out.push('## Auto-triggering external skills (read on relevant prompts)');
  for (const s of ctx.autoTriggerExternalSkills) {
    out.push(`  + ${s.name} (${s.source})`);
    out.push(`      ${s.use}`);
  }
  out.push('');
  out.push('## Operator manuals (always loaded for the matching agent)');
  for (const m of ctx.operatorManuals) {
    out.push(`  ${m.present ? '✓' : '✗'} ${m.path} (${m.agent}) — ${m.use}`);
  }
  out.push('');
  out.push('## Reference HTML templates (canonical clones for pure-editorial work)');
  for (const r of ctx.referenceTemplates) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path}`);
    out.push(`      ${r.use}`);
  }
  out.push('');
  out.push('## Brand canonical (use; do not invent brand details)');
  for (const b of ctx.brandCanonical) {
    out.push(`  ${b.present ? '✓' : '✗'} ${b.path}`);
    out.push(`      ${b.use}`);
  }
  out.push('');
  out.push('## Key docs');
  for (const d of ctx.keyDocs) {
    out.push(`  ${d.present ? '·' : '?'} ${d.path}`);
    out.push(`      ${d.when}`);
  }
  out.push('');
  out.push('## Shared kits (under videos/_shared/)');
  for (const k of ctx.sharedKits) {
    out.push(`  ${k.present ? '✓' : '✗'} ${k.path}`);
    out.push(`      ${k.use}`);
  }
  out.push('');
  out.push('## Tools');
  for (const t of ctx.tools) {
    out.push(`  $ ${t.cmd}`);
    out.push(`      ${t.use}`);
  }
  out.push('');
  out.push(`## Known video packages (${ctx.knownVideoPackages.length})`);
  for (const s of ctx.knownVideoPackages) out.push(`  ${s}`);
  return out.join('\n') + '\n';
}

function main() {
  const json = process.argv.includes('--json');
  const ctx = buildContext();
  if (json) process.stdout.write(JSON.stringify(ctx, null, 2) + '\n');
  else process.stdout.write(printHuman(ctx));
}

main();
