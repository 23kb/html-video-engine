#!/usr/bin/env node
// Print the canonical skill context for a new session.
// Phase G: slimmed to a routing index. Topic rules live in skills now;
// this file just tells you which skill to load and where to find docs.
//
// Usage:
//   node tools/skill-context.js          # human-readable
//   node tools/skill-context.js --json   # machine-readable

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const MISSION =
  'Guided HTML video builder. Two equally-important modes: (1) tutorial videos with real WPForms UI in an iframe, (2) ad-style release videos as full-bleed editorial compositions. MP4 capture is in-repo via tools/render.js.';

const START_RULE =
  'Read CLAUDE.md (operator manual, always loaded) + the skill matching the task. Topic rules live in skills, not in this file or CLAUDE.md.';

const SKILLS = [
  { name: 'wpforms-video',       path: '.claude/skills/wpforms-video/SKILL.md',       use: 'Tutorial authoring, intake, storyboard gate, default authoring mode, legacy chapter shape, modes, production truth.' },
  { name: 'wpforms-postintro',   path: '.claude/skills/wpforms-postintro/SKILL.md',   use: 'PostIntro design + multi-animation rule + canonical references + snapshot handoff.' },
  { name: 'wpforms-gsap-rules',  path: '.claude/skills/wpforms-gsap-rules/SKILL.md',  use: 'GSAP L0 discipline + registered timelines (paused + driver-owned) + pausableRaf + Flip + effects library + determinism.' },
  { name: 'wpforms-marketing',   path: '.claude/skills/wpforms-marketing/SKILL.md',   use: 'Editorial / ad-style surfaces (surface: editorial / mixed) + blocks library + atmospheric kit + text-kit + hero composition.' },
  { name: 'wpforms-transitions', path: '.claude/skills/wpforms-transitions/SKILL.md', use: 'Chapter breaks (glide/dolly/whip) + swap styles (flipBridge default) + camera poses + shared scene + scrubber/render.' },
];

const OPERATOR_MANUALS = [
  { path: 'CLAUDE.md', agent: 'Claude', use: 'Always loaded. Boot order, protected core, validation, push-back triggers, where-topic-rules-live map.' },
  { path: 'AGENTS.md', agent: 'Codex',  use: 'Always loaded for Codex. Same role as CLAUDE.md but Codex-flavored.' },
];

const KEY_DOCS = [
  { path: 'docs/INDEX.md',                                        when: 'First — one-line-per-doc index. Use to find the right doc fast.' },
  { path: 'docs/authoring-api.md',                                when: 'Public authoring contract reference. Manifest schema, chapter exports, descriptor mode, validator behavior.' },
  { path: 'REFACTOR-DONE.md',                                     when: 'Refactor closure summary. Where everything ended up.' },
  { path: 'REFACTOR-BRIEF.md',                                    when: 'Locked architectural decisions (§3) + protected-core list (§4).' },
  { path: 'REFACTOR-PROGRESS.md',                                 when: 'Per-phase log + known gaps (§2.1) + architectural debt (§2.2).' },
];

const SHARED_KITS = [
  { path: 'videos/_shared/kit.js',         use: 'loadGsap, awaitTween, withGsapContext, registerTimeline (Phase B), registerCameraPose (Phase C), pausableRaf (Phase E.5), mulberry32. See wpforms-gsap-rules.' },
  { path: 'videos/_shared/effects.js',     use: 'gsap.registerEffect library: highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow. See wpforms-gsap-rules.' },
  { path: 'videos/_shared/atmospheric.js', use: 'Marketing-mode helpers: grain, sweep, parallax pair, scale push, dark backdrop. See wpforms-marketing.' },
  { path: 'videos/_shared/blocks/',        use: 'Editorial blocks: code-card, mac-window, phone-frame, pill, arrow, route-line, terminal. See wpforms-marketing.' },
  { path: 'videos/_shared/text-kit.js',    use: '24 Pixel-Point-style text-reveal presets. See wpforms-marketing.' },
  { path: 'videos/_shared/lottie-kit.js',  use: 'Lottie editorial bumpers, stings, badges.' },
  { path: 'videos/_shared/three-kit.js',   use: 'Three.js scene helpers (loaded separately from kit.js).' },
];

const TOOLS = [
  { cmd: 'node tools/skill-context.js',                                                          use: 'This file. Routing index.' },
  { cmd: 'node tools/list-snapshots.js [--search <q>] [--for <slug>]',                           use: 'Snapshot inventory + cross-reference per video.' },
  { cmd: 'node tools/field-state.js --field <name> [--summary] | --list | --search <q>',        use: 'Query field-state inventory without full-reading the 132 KB doc.' },
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
    skills: SKILLS.map(s => ({ ...s, present: exists(s.path) })),
    operatorManuals: OPERATOR_MANUALS.map(m => ({ ...m, present: exists(m.path) })),
    keyDocs: KEY_DOCS.map(d => ({ ...d, present: exists(d.path) })),
    sharedKits: SHARED_KITS.map(k => ({ ...k, present: exists(k.path) })),
    tools: TOOLS,
    knownVideoPackages: listVideos(),
    refactorStatus: 'COMPLETE — A → B → C → D → E.5 → F → G merged. See REFACTOR-DONE.md.',
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
  out.push(`Refactor status: ${ctx.refactorStatus}`);
  out.push('');
  out.push('## Skills (load the one matching your task)');
  for (const s of ctx.skills) {
    out.push(`  ${s.present ? '✓' : '✗'} ${s.name} — ${s.path}`);
    out.push(`      ${s.use}`);
  }
  out.push('');
  out.push('## Operator manuals (always loaded for the matching agent)');
  for (const m of ctx.operatorManuals) {
    out.push(`  ${m.present ? '✓' : '✗'} ${m.path} (${m.agent}) — ${m.use}`);
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
