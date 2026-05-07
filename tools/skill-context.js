#!/usr/bin/env node
// Print the canonical skill context for a new session.
// Replaces "grep the repo to figure out where to start."
//
// Usage:
//   node tools/skill-context.js          # human-readable
//   node tools/skill-context.js --json   # machine-readable

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const REQUIRED_READS = [
  { path: 'docs/current-workflow.md', why: 'Entry point. Workflow, storyboard rules, do-not-touch.' },
  { path: 'docs/authoring-api.md', why: 'Public authoring contract. Legacy-first authoring, supported descriptor path, transitions, ctx helpers, validator behavior.' },
  { path: 'docs/postintro-patterns.md', why: 'How to design topic-specific postIntro concept beats without copying old cinematics.' },
  { path: 'docs/video-production-templates.md', why: 'Storyboard checklist, chapter checklist, snapshot checklist, token budget, smoke spec. Read only the section you need.' },
];

const AUTHORING_SKELETONS = [
  { path: 'docs/examples/legacy-manifest-skeleton.md', why: 'Default manifest copy target for new legacy-first video packages.' },
  { path: 'docs/examples/legacy-chapter-skeleton.md', why: 'Default legacy/effect-mode chapter shape for new videos.' },
  { path: 'docs/examples/legacy-postintro-effect-skeleton.md', why: 'Video-local postIntro concept beat with HTML/CSS/SVG editorial animation.' },
  { path: 'docs/examples/legacy-audio-cued-skeleton.md', why: 'Timestamp-locked narration choreography with waitAt(t).' },
  { path: 'docs/examples/choice-field-generate-choices-skeleton.md', why: 'Choice-field AI Generate Choices flow: button, modal, generated choices, apply result.' },
];

const CAPABILITY_KITS = [
  { path: 'videos/_shared/atmospheric.js', importPath: '../../_shared/atmospheric.js', why: 'Marketing-mode helpers: grain, sweep, parallax pair, scale push, dark backdrop.' },
  { path: 'videos/_shared/text-kit.js', importPath: '../../_shared/text-kit.js', why: 'Pixel-point-style text reveals with seven presets; compose with tweenInto(tl, opts).' },
  { path: 'videos/_shared/lottie-kit.js', importPath: '../../_shared/lottie-kit.js', why: 'Lottie editorial bumpers, stings, badges, and marker/frame-driven micro-animations.' },
  { path: 'videos/_shared/three-kit.js', importPath: '../../_shared/three-kit.js', why: 'Three.js scene helpers for editorial 3D layers, loaded separately from the universal kit.' },
  { path: 'videos/_shared/effects.js', importPath: '../../_shared/effects.js', why: 'Phase A: gsap.registerEffect() library — highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow. Import once; await effectsReady; call gsap.effects.<name>().' },
  { path: 'videos/_shared/kit.js', importPath: '../../_shared/kit.js', why: 'Phase B: registerTimeline(tl, { id }) opt-in for paused GSAP timelines owned by the runtime frame driver. Build with gsap.timeline({ paused: true }), finish all tweens before registering (duration is snapshotted), do not call tl.play(). Survives hidden-tab RAF throttling. See docs/frame-driver.md.' },
];

// Production-truth rules surfaced inline so a session sees them immediately.
// Keep terse; governance/history lives in the stage plans.
const STAGE_4_RULES = [
  'Real WPForms UI is product truth.',
  'Snapshots are base structural surfaces, not one snapshot per final visible state.',
  'DOM-derived states are allowed when grounded by `node tools/field-state.js --field <name>` or real captured DOM. Document base + what was staged.',
  'No fake product UI and no fake snapshot folders. Capture what is missing.',
  'Normal video work must not touch protected core (engine/, runtime/player.js, runtime/chapter-runner.js, runtime/scene-helpers.js, runtime/transitions.js, runtime/frame-driver.js, runtime/frame-adapter.js, scenes/shared.js, scenes/player.html, existing accepted videos/snapshots).',
  'New files under runtime/ — including unwired helper sketches — are approval-gated.',
  'If a video seems to need core edits, stop and ask whether the behavior is reusable. Prefer a video-local legacy/effect implementation first; propose reusable helpers only when repeated need proves it.',
];

const POSTINTRO_RULES = [
  'PostIntro is required by default for normal videos unless the user explicitly asks to skip it.',
  'PostIntro must be a topic-specific concept beat, not a second title card.',
  'Build the approved visual transformation. Use video-local editorial HTML objects, CSS states/keyframes, SVG paths/cursors, and GSAP-style timing when that surface is approved; descriptor verbs are acceptable only when they preserve the concept.',
  'Do not downgrade an approved concept to focusPull/sectionTitle/title-card on a loosely related UI surface while keeping the narration conceptual.',
  'Existing runtime cinematics may be referenced for code patterns only; reuse one only when the product semantics match.',
  'If no semantic match exists and the concept needs richer motion, build with an approved video-local HTML/CSS/SVG/GSAP surface or ask to promote a reusable runtime cinematic. The canonical postIntros prove this is possible.',
  'Expect visual QC on ambitious postIntros. Revise timing, framing, morphs, labels, and payoff states after the user reviews the playable URL.',
  'Do not copy old intro/outro blocks from accepted packages; use the legacy manifest skeleton and topic-specific intro/outro copy.',
  'Field videos start by adding/selecting the field from the builder sidebar unless the user says it is already present.',
  "Dropdown, Multiple Choice, and Checkboxes videos include the AI 'Generate Choices' button by default: button, modal, generated options, insertion/apply result.",
];

const OPERATOR_MANUALS = [
  { path: 'AGENTS.md', agent: 'Codex', why: 'Operator manual for Codex sessions. Do not also read CLAUDE.md unless comparing manuals.' },
  { path: 'CLAUDE.md', agent: 'Claude', why: 'Operator manual for Claude sessions. Do not also read AGENTS.md unless comparing manuals.' },
];

const ON_DEMAND = [
  { path: 'docs/wpforms-field-state-inventory.md', when: 'Canonical source only. Query it with `node tools/field-state.js`; do not full-read by default.' },
  { path: 'docs/wpforms-ai-state-inventory.md', when: 'Need exact WPForms AI UI state references.' },
  { path: 'docs/two-video-pattern-audit.md', when: 'Judging whether a pattern is proven across reference videos.' },
  { path: 'docs/gsap-rules.md', when: 'GSAP discipline (L0) - read before writing or reviewing chapter effect() GSAP code.' },
  { path: 'docs/checkboxes-rescue-handoff.md', when: 'Working on Checkboxes-specific video work.' },
  { path: 'docs/wpforms-ai-guided-handoff.md', when: 'Working on WPForms-AI-specific video work.' },
  { path: 'docs/chapter-module-contract.md', when: 'Authoring a chapter module from scratch and need the locked interface spec.' },
  { path: 'docs/stage-4-core-api-plan.md', when: 'Governance/history only. Use for refactor planning, not normal video authoring.' },
  { path: 'docs/gsap-flip-patterns.md', when: 'Authoring a beat or postIntro that morphs layout, reparents elements, pins editorial DOM to real UI, or clones real iframe UI for animation. Two validated sandboxes (flip-sandbox, flip-generate-card).' },
  { path: 'docs/frame-driver.md', when: 'Authoring an editorial-layer GSAP timeline that should survive hidden-tab RAF throttling, or migrating an existing cinematic to the registered-timeline path. Phase B opt-in.' },
  { path: 'docs/transitions.md', when: 'Using surface modes or flipBridge snapshot swaps.' },
  { path: 'docs/shared-scene.md', when: 'Keeping a Three.js/editorial scene alive across chapter boundaries.' },
  { path: 'docs/camera-poses.md', when: 'Registering or using named camera poses.' },
];

const REFERENCE_VIDEOS = [
  {
    slug: 'a-complete-guide-to-the-checkboxes-field',
    handoff: 'docs/checkboxes-rescue-handoff.md',
    postIntro: 'runtime/cinematic-one-answer-enough.js',
    note: 'Reference 1. Choice-field DOM helpers, multi-state field-options snapshot work. PostIntro is Checkboxes-specific.',
  },
  {
    slug: 'build-forms-faster-with-wpforms-ai',
    handoff: 'docs/wpforms-ai-guided-handoff.md',
    postIntro: 'runtime/cinematic-rough-thought-to-draft.js',
    note: 'Reference 2. Snapshot swaps across generated states, narrationSpeed, focusPull stage clip. PostIntro is WPForms-AI-specific.',
  },
];

const POSTINTRO_EXAMPLES = [
  {
    path: 'docs/postintro-patterns.md',
    note: 'Start here for proven postIntro principles, HOW to build with HTML/CSS/SVG/GSAP, and the canonical references below.',
  },
];

const POSTINTRO_REFERENCES = [
  {
    route: '/scenes/player.html?video=build-forms-faster-with-wpforms-ai',
    code: 'runtime/cinematic-rough-thought-to-draft.js',
    pattern: 'WPForms AI rough-thought-to-draft: editorial HTML prompt/chat/form, CSS stage states, GSAP timeline from messy prompt to generated draft.',
  },
  {
    route: '/scenes/player.html?video=a-complete-guide-to-the-checkboxes-field',
    code: 'runtime/cinematic-one-answer-enough.js',
    pattern: 'Checkboxes one-answer-enough: HTML form rows, CSS radio-to-checkbox morph, GSAP cursor and burst choreography.',
  },
  {
    route: '/scenes/notifications-combined.html',
    code: 'scenes/notifications-combined.html (welcome teaser block only: mountWelcomeTeaser, .teaser*, .site-window, .tf-*, .gmail-*)',
    pattern: 'Notifications form-to-inbox: HTML browser/form/inbox, SVG cursor, CSS transitions/keyframes, timed outcome-before-controls payoff.',
  },
];

const ON_DEMAND_REFERENCE_PATTERNS = [
  'Legacy-first docs/templates are the default learning source for new videos.',
  'Do not read accepted video packages during startup.',
  'Use accepted video packages only after you can name the exact implementation pattern you need.',
  'Examples of valid implementation patterns: timestamp-locked narration actions, waitAt(t), mid-effect choreography, choice-field DOM helper behavior, multi-state field-options snapshot work, snapshot swaps across generated states, narrationSpeed, focusPull stage clipping.',
  'Descriptor mode is secondary; use it only when it preserves the approved beat without weakening postIntro or effects.',
  'Treat reference packages as evidence/debug material, not startup reading and not design source material.',
];

const REFERENCE_VIDEO_SLUGS = new Set(REFERENCE_VIDEOS.map(r => r.slug));

const DO_NOT_TOUCH = [
  'engine/* (entire dir)',
  'runtime/player.js',
  'runtime/chapter-runner.js',
  'runtime/scene-helpers.js',
  'runtime/transitions.js',
  'runtime/frame-driver.js',
  'runtime/frame-adapter.js',
  'runtime/shared-scene.js',
  'runtime/camera-poses.js',
  'scenes/shared.js',
  'scenes/player.html',
  'existing accepted video packages and reference baselines',
  'snapshots/** during normal video work (capture new ones; snapshot refactors require an explicit stage task)',
  'Both reference video packages, except scoped fixes the user asks for',
  'New files under runtime/ — even unwired helper sketches — are approval-gated.',
];

const PER_VIDEO_EDITS = [
  'videos/<slug>/manifest.json',
  'videos/<slug>/chapters/*.js and chapters/_selectors.js',
  'videos/<slug>/narration/*.txt + rendered *.mp3',
  'videos/<slug>/storyboard.md (optional)',
  'docs/<slug>-handoff.md only if the user asks for a persistent handoff doc',
  'New snapshots/<name>/ folders (capture only — never fabricate)',
  'A new runtime/cinematic-<name>.js ONLY when promoting a postIntro archetype, and flag it explicitly',
];

const EXISTING_CODE_SURFACES = [
  'Use legacy/effect-mode chapters by default for new videos. Helpers flow through ctx; chapter files import local selectors only.',
  'Descriptor chapters via runtime/chapter-api.js (`defineChapter`) remain supported for simple closed-vocabulary beats only.',
  'Use runtime/prep-ops.js through documented prep/after ops in descriptor chapters; do not import it directly in video chapters.',
  'Use runtime/verbs.js through documented descriptor verbs only when descriptor mode is appropriate; do not read runtime internals for normal authoring.',
  'Use snapshot catalogs plus inspect-snapshot / verify-selectors for selectors.',
  'Use docs/postintro-patterns.md for postIntro examples. Use accepted reference packages only on demand after naming the exact implementation pattern needed.',
];

const TOOLS = [
  { cmd: 'node tools/skill-context.js', use: 'This file. Canonical context dump.' },
  { cmd: 'node tools/list-snapshots.js [--for <slug>] [--search <q>] [--json]', use: 'Inventory snapshots. With --for, cross-references which snapshots a video uses and which are missing.' },
  { cmd: 'node tools/field-state.js --list | --field <name> [--section <name>] [--summary] | --search <q>', use: 'Query the large field-state inventory without full-reading it. Use before opening docs/wpforms-field-state-inventory.md.' },
  { cmd: 'node tools/inspect-snapshot.js <snapshot-slug> --emit-selectors [--filter <substr>]', use: 'Generate catalog-grounded starter selectors from a real snapshot. Use before hand-writing selectors.' },
  { cmd: 'node tools/inspect-snapshot.js <snapshot-slug>', use: 'Write a Playwright inspection JSON to tools/inspect-out/<snapshot-slug>.json when catalog selectors are not enough.' },
  { cmd: 'node tools/verify-selectors.js <snapshot-slug> [selector...]', use: 'Check that selected CSS selectors exist in a snapshot before relying on them in chapters.' },
  { cmd: 'node tools/check-video-playback.js <slug> [--chapter <id>] [--seconds <n>]', use: 'Standard non-visual smoke. Returns JSON. Exit 0 = scene done clean, 1 = boot fail, 2 = console/page errors.' },
  { cmd: 'node tools/validate-video.js <slug>', use: 'Static validator for a video package.' },
  { cmd: 'node tts/generate.js --video <slug>', use: 'Render narration mp3s for a video. Run this yourself; do not ask the user.' },
  { cmd: 'node serve.js', use: 'Local static server on http://localhost:4321 (auto-started by check-video-playback.js if not running).' },
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
    mission: 'Guided HTML video builder. Stage exact WPForms UI inside a Mac-framed iframe, layer narration + cinematic moments, hand off playable HTML review URLs for visual QC. MP4 capture is external, but review URLs are still the agent handoff.',
    startRule: 'When the user asks to make a video, begin with intake + snapshot inventory + storyboard. The user should not have to restate protected-core, product-truth, or postIntro rules.',
    requiredReads: REQUIRED_READS.map(r => ({ ...r, present: exists(r.path) })),
    authoringSkeletons: AUTHORING_SKELETONS.map(r => ({ ...r, present: exists(r.path) })),
    capabilityKits: CAPABILITY_KITS.map(r => ({ ...r, present: exists(r.path) })),
    operatorManuals: OPERATOR_MANUALS.map(r => ({ ...r, present: exists(r.path) })),
    onDemandDocs: ON_DEMAND.map(r => ({ ...r, present: exists(r.path) })),
    referenceVideos: REFERENCE_VIDEOS.map(r => ({ ...r, present: exists(`videos/${r.slug}`) })),
    postIntroExamples: POSTINTRO_EXAMPLES.map(r => ({ ...r, present: exists(r.path) })),
    postIntroReferences: POSTINTRO_REFERENCES.map(r => ({ ...r, present: exists(r.code.split(' ')[0]) })),
    onDemandReferencePatterns: ON_DEMAND_REFERENCE_PATTERNS,
    perVideoEdits: PER_VIDEO_EDITS,
    doNotTouch: DO_NOT_TOUCH,
    existingCodeSurfaces: EXISTING_CODE_SURFACES,
    stage4Rules: STAGE_4_RULES,
    postIntroRules: POSTINTRO_RULES,
    tools: TOOLS,
    workflow: [
      'Intake — topic, slug, source links, constraints.',
      'Inventory — list snapshots; identify what exists vs missing. Use list-snapshots.js.',
      'Source research — read supplied docs only; do not crawl the repo.',
      'Storyboard + narration proposal — use the storyboard template. STOP for explicit approval.',
      'Capture missing states — only after approval, or ask the user.',
      'Build first draft in validated slices — after storyboard approval, build toward a full first draft in legacy/effect-mode by default unless the storyboard names a descriptor-safe reason.',
      'TTS — render narration via tts/generate.js into videos/<slug>/narration/.',
      'Validate — validate-video.js + check-video-playback.js.',
      'Review — provide playable HTML URLs: full player URL plus useful chapter-only URLs. User owns visual QC; revise scoped findings after review.',
      'Revise scoped — narrow fixes only.',
      'Final summary — concise notes only; write a handoff doc only if requested.',
    ],
    tokenFloor: [
      "Don't grep the whole repo. Read named files.",
      "Don't run visual QC unless asked.",
      'Build toward the approved first draft; stop early only for real gates.',
      "Don't build fake snapshots to skip a capture step.",
      "Don't reread historical plan docs to reorient.",
      "Use scripts to find relevant snapshots — do not assume a snapshot is missing from one negative result. If list-snapshots.js --search returns nothing, try field-state.js --search, broaden the term, or inspect-snapshot.js a related capture before falling back to ASK USER / NEEDS CAPTURE. You have to try the scripts to know what's actually available.",
      'Use legacy-first skeletons before old packages or descriptor examples.',
    ],
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
  out.push('## Required reads');
  for (const r of ctx.requiredReads) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path}`);
    out.push(`      ${r.why}`);
  }
  out.push('');
  out.push('## Default authoring skeletons (legacy-first; copy before old packages)');
  for (const r of ctx.authoringSkeletons) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path}`);
    out.push(`      ${r.why}`);
  }
  out.push('');
  out.push('## Shared capability kits (opt-in imports)');
  for (const r of ctx.capabilityKits) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path}`);
    out.push(`      import: ${r.importPath}`);
    out.push(`      ${r.why}`);
  }
  out.push('');
  out.push('## Operator manual (pick one)');
  for (const r of ctx.operatorManuals) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path} — ${r.agent}`);
    out.push(`      ${r.why}`);
  }
  out.push('');
  out.push('## On-demand docs (do not load by default)');
  for (const r of ctx.onDemandDocs) {
    out.push(`  ${r.present ? '·' : '?'} ${r.path}`);
    out.push(`      when: ${r.when}`);
  }
  out.push('');
  out.push('## PostIntro examples');
  for (const r of ctx.postIntroExamples) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.path}`);
    out.push(`      ${r.note}`);
  }
  out.push('');
  out.push('## Canonical postIntro references (read only relevant code)');
  for (const r of ctx.postIntroReferences) {
    out.push(`  ${r.present ? '✓' : '✗'} ${r.route}`);
    out.push(`      code: ${r.code}`);
    out.push(`      pattern: ${r.pattern}`);
  }
  out.push('');
  out.push('## On-demand reference packages (debug only)');
  for (const r of ctx.onDemandReferencePatterns) out.push(`  - ${r}`);
  out.push('');
  out.push('## Workflow (numbered)');
  ctx.workflow.forEach((step, i) => out.push(`  ${i + 1}. ${step}`));
  out.push('');
  out.push('## Per-video edits allowed');
  for (const p of ctx.perVideoEdits) out.push(`  - ${p}`);
  out.push('');
  out.push('## Do not touch');
  for (const p of ctx.doNotTouch) out.push(`  - ${p}`);
  out.push('');
  out.push('## Existing code surfaces');
  for (const r of ctx.existingCodeSurfaces) out.push(`  - ${r}`);
  out.push('');
  out.push('## Production-truth rules');
  for (const r of ctx.stage4Rules) out.push(`  - ${r}`);
  out.push('');
  out.push('## PostIntro / field-video rules');
  for (const r of ctx.postIntroRules) out.push(`  - ${r}`);
  out.push('');
  out.push('## Tools');
  for (const t of ctx.tools) {
    out.push(`  $ ${t.cmd}`);
    out.push(`      ${t.use}`);
  }
  out.push('');
  out.push('## Token floor');
  for (const r of ctx.tokenFloor) out.push(`  - ${r}`);
  out.push('');
  out.push(`## Known video packages (${ctx.knownVideoPackages.length})`);
  for (const s of ctx.knownVideoPackages) {
    const label = REFERENCE_VIDEO_SLUGS.has(s)
      ? ' — reference/debug only; do not read at startup'
      : '';
    out.push(`  ${s}${label}`);
  }
  return out.join('\n') + '\n';
}

function main() {
  const json = process.argv.includes('--json');
  const ctx = buildContext();
  if (json) process.stdout.write(JSON.stringify(ctx, null, 2) + '\n');
  else process.stdout.write(printHuman(ctx));
}

main();
