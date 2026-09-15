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
  'Guided single-HTML video builder (engine/manifest path retired 2026-08-22). Paths: (1) Tutorial — real WPForms UI in an iframe on the master timeline (clone docs/examples/single-html-tutorial-skeleton.html). (2) Pure editorial / ad — single self-contained HTML (clone docs/examples/single-html-ad-skeleton.html; style from videos/klaviyo-bridge-2 + reference/html-templates). (3) Mixed — editorial chrome composited over real product UI in ONE single-HTML film. (4) 9:16 short — clone reference/html-templates/vertical-short-skeleton.html. MP4 RENDER in-repo via tools/render-singlehtml-audio.js (never the same word as snapshot capture, which is capture/capture.js and runs FIRST).';

const START_RULE =
  'STEP 0: read docs/rulebook.md — every row is a defect that shipped and cost a rebuild. STEP 1: pick a path (see PATHS below). STEP 2: load the matching primary skill. STEP 3: for repo-wide context (boot order, protected core, validation, push-back), read CLAUDE.md. Topic rules live in skills.';

// The rulebook summarised from the file itself, never transcribed — a headline
// copied into this script would drift the first time a row moved, and a
// rulebook nobody loads is the WISH slot applied to itself.
const RULEBOOK_PATH = path.join(REPO_ROOT, 'docs', 'rulebook.md');

function rulebookSummary() {
  if (!fs.existsSync(RULEBOOK_PATH)) return null;
  const text = fs.readFileSync(RULEBOOK_PATH, 'utf8');
  const lines = text.split(/\r?\n/);

  const sections = [];
  let cur = null;
  let inHeadline = false;
  const headlines = [];

  for (const l of lines) {
    const num = l.match(/^## (\d+\.\s.+)$/);
    if (num) { cur = { title: num[1], rows: 0 }; sections.push(cur); inHeadline = false; continue; }
    if (/^## The (five|two) that/.test(l)) { cur = null; inHeadline = true; continue; }
    if (/^## /.test(l)) { cur = null; inHeadline = false; continue; }
    if (cur && /^\| /.test(l) && !/^\| IF \|/.test(l) && !/^\|---/.test(l)) cur.rows++;
    if (inHeadline) {
      const h = l.match(/^\d+\.\s+\*\*(.+?)\*\*/);
      if (h) headlines.push(h[1]);
    }
  }

  const slots = {};
  for (const m of text.matchAll(/\|\s+`(HOOK|VALIDATOR|LIB|PROBE|TEMPLATE|ARTIFACT|WISH)`/g)) {
    slots[m[1]] = (slots[m[1]] || 0) + 1;
  }
  const total = Object.values(slots).reduce((a, b) => a + b, 0);
  return { path: 'docs/rulebook.md', sections, headlines, slots, total };
}

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
    primarySkill: 'wpforms-marketing',
    auditGate: 'wpforms-motion-audit (mandatory)'
  },
];

const SKILLS = [
  { name: 'wpforms-video',       path: '.claude/skills/wpforms-video/SKILL.md',       use: 'Tutorial authoring, intake, storyboard gate, default authoring mode, legacy chapter shape, modes, production truth.' },
  { name: 'wpforms-postintro',   path: '.claude/skills/wpforms-postintro/SKILL.md',   use: 'PostIntro design + multi-animation rule + canonical references + snapshot handoff + morph-chain integration.' },
  { name: 'wpforms-gsap-rules',  path: '.claude/skills/wpforms-gsap-rules/SKILL.md',  use: 'GSAP L0 discipline + camera-decomposition + registered timelines + pausableRaf + Flip + effects library + designer principles (Emil/Krehel/Jhey).' },
  { name: 'wpforms-marketing',   path: '.claude/skills/wpforms-marketing/SKILL.md',   use: 'Editorial / ad-style surfaces (surface: editorial/mixed) + reference/html-templates/ clones + brand canonical + blocks + atmospheric kit + text-kit.' },
  
  { name: 'wpforms-primitives', path: '.claude/skills/wpforms-primitives/SKILL.md', use: 'Lookup index for videos/_shared/motion-primitives.js (cameras / Cursor / typing / field-reveal / brand-anchor / exit) and videos/_shared/wpforms-interactions.js (Wave 1 builder/admin + Wave 2 Batch A notifications/CL/smart-tags). Includes the library-as-reference philosophy + 3-test promotion rule. Reach here BEFORE writing GSAP cursor / camera / interaction code AND before adding any new library method.' },
  { name: 'wpforms-motion-audit', path: '.claude/skills/wpforms-motion-audit/SKILL.md', use: 'Score animations and camera moves S-F tier with hard-rule calibration. MUST run before any postIntro/cinematic/editorial handoff.' },
  { name: 'wpforms-video-polish', path: '.claude/skills/wpforms-video-polish/SKILL.md', use: 'Polish an existing already-shipped video without breaking it. Backup-first → Plan agent analysis → vet against determinism/protected-core/RED-flag rules → surgical edits in batches of 5–10 → static verification only (no visual QC) → motion-audit if cinematic beats touched. Includes 8 canonical polish patterns (repeated expo.out, settle-into-rest, unused CustomEase, one-shot-pulse-with-tail, display-serif letter-spacing, frozen-camera handoff, redundant interactive cycle, block-centred zoom gutter). NOT for new authoring (use wpforms-video / wpforms-marketing), NOT for debug.' },
  { name: 'video-qc', path: '.claude/skills/video-qc/SKILL.md', use: 'The cheap QC/review/iterate loop when the user reviews a built video and reports fixes scene-by-scene. Bakes the cost retro (edit only what was reported, ship-first-then-review, batch edits, reuse selectors, terse) + workflow contracts (read outline.md FIRST, state-change hierarchy drive>puppet>swap, preserve the literal verb G1, state the target back with evidence G2, surgical edits G3, no visual/audio QC). NOT first-time authoring, NOT proactive polish (wpforms-video-polish), NOT debug.' },
];

const LIBRARIES = [
  {
    path: 'videos/_shared/motion-primitives.js',
    use: 'Animation primitives: cinematicFlight, figjamFlight, focusStationOverview (cameras); Cursor class with glide/click/hover/drag (cursor); caretType, statusPillMorph, markerSweep (typing/text); popOut, fieldStaggerReveal (highlight/fields); mountSullieBug, cleanFastRejoin (tutorial polish); boundedRepeats, mulberry32, clickRipple (utilities). QC at videos/_qc-primitives/. Copy from here; do not reinvent.',
  },
  {
    path: 'videos/_shared/iframe-helpers.js',
    use: 'Authoring helpers built on IframeManager + Cursor. glideClick (the 10x-recurring scrollIntoView+glide+click defensive pattern), findInIframeByText (clickable-ancestor walk by visible text — for SaaS dashboards with content-hashed class names like Klaviyo .sc-jTrPJq), glideToText (convenience). Use for any captured non-WPForms surface where class names are unstable across re-captures.',
  },
  {
    path: 'videos/_shared/wpforms-interactions.js',
    use: 'Standard WPForms interactions. Wave 1 (builder/admin): navAddNewForm, selectTemplate, navWPFormsSidebarMenu, openFormInList, dragFieldToForm, openFieldOptions, navBuilderSidebar, openSettingsTab, plus sub-interactions setFieldLabel/setNameFormat/toggleEmailConfirmation. Wave 2 Batch A (notifications + CL): addNotification, insertSmartTag (+openSmartTagPicker/closeSmartTagPicker), selectFromDropdown (generic faux-native-select), addConditionalLogicRule, duplicateNotificationBlock, plus notification setters setNotificationSendTo/Subject/Message. Library scope: ~6 of 15 Wave 2 methods earned status by ≥3-doc threshold — prefer inline DOM for one-off clicks (philosophy in wpforms-primitives skill). IframeManager helper: iframe slot mount at native 1280×720, engine-pattern direct camera transform, identity at rest, pointer-events: none guard. Zoom > 2x softens on iframe content (CSS transform pixel-doubling limit). QC at videos/_qc-interactions/. Compose these for tutorial chapters.',
  },
];

const AUTO_TRIGGER_EXTERNAL_SKILLS = [
  { name: 'design-motion-principles', source: 'kylezantos (installed at .agents/skills/)', use: 'Designer-grade audit by Emil Kowalski / Jakub Krehel / Jhey Tompkins principles. Complements wpforms-motion-audit (which scores; this critiques per designer philosophy).' },
];

const OPERATOR_MANUALS = [
  { path: 'CLAUDE.md', agent: 'Claude', use: 'Always loaded by Claude Code. Pick-your-path decision tree + boot order + protected core + validation + push-back triggers.' },
];

const REFERENCE_TEMPLATES = [
  { path: 'videos/klaviyo-bridge-2/index.html', use: 'CORE REFERENCE for pure-editorial VOCABULARY (atmosphere beds, ease voices, SFX cue placement). Never the first write — it predates the playback/instrumentation contract; clone docs/examples/single-html-ad-skeleton.html and customize toward this.' },
  { path: 'reference/html-templates/wpforms-ai-prompt-open.html', use: 'S-tier identity-continuity morph (Button → Input → Pill → Chat). Secondary reference for single-element morph-chain editorial work.' },
  { path: 'reference/html-templates/editorial-reference-36s.html', use: '36s OpenAI Layo rebuild, A-tier, 13 beats with named atmospheres + transitions. Secondary reference for linear-scene editorial.' },
  { path: 'reference/html-templates/openai-replica-18s.html', use: 'First-try single-HTML proof. Built by mimicking a contact sheet. Secondary reference; validates the clone-and-customize pattern.' },
];

const BRAND_CANONICAL = [
  { path: 'reference/wpforms-brand/BRAND.md', use: 'Usage doc + anti-patterns + AI chat structure + real templates API reference.' },
  { path: 'reference/wpforms-brand/tokens.css', use: 'Drop-in CSS variables: --wpf-orange (#E27730 primary), --wpf-blue, --wpf-ai-purple (AI-feature-only).' },
  { path: 'reference/wpforms-brand/assets/', use: 'Real Sullie master, loading-avatar/spinner, AI 3-dot chat spinner. Use these; do NOT invent brand details.' },
];

const KEY_DOCS = [
  { path: 'docs/INDEX.md',                                              when: 'First — one-line-per-doc index. Use to find the right doc fast.' },
  { path: 'docs/video-architecture-invariants-2026-05-12.md',           when: 'CANONICAL hard-rules reference. 16 numbered invariants (INV-1 through INV-16) covering stage/iframe transforms, snapshot truth, library scope, brand, tutorial shape, selector scoping, skill-gate consumption, continuation-session re-audit, real-UI proof gate, clone-and-customize. Pure reference — file-read sufficient, no Skill tool invocation. Read inline.' },
  { path: 'docs/rulebook.md',                                            when: 'STEP 0. ~240 IF/THEN rows, every one a defect that shipped and cost a rebuild; each names its enforcement slot + receipt. Read before the first beat.' },
  { path: 'docs/storyboard-format-morph-chain-2026-05-10.md',            when: 'Editorial storyboards MUST include the morph-chain section (identity continuity — one element threads the story); all new films carry the Shot list. Authoring contract.' },
  { path: 'docs/lessons-index.md',                                       when: 'Index of every LESSONS-*.md file inside video folders + the standing capability asks (postIntro bar, SFX).' },
  { path: 'docs/engine-action-points-2026-08-28.md',                     when: 'Ranked tooling / skill / template action points mined from the lessons (AP-1..20); the S-effort items shipped 2026-08-28.' },
];

const SHARED_KITS = [
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
  { cmd: 'node tools/field-state.js --field <name> [--summary] | --list | --search <q>',        use: 'Query field-state inventory (132 KB doc) without full-reading.' },
  { cmd: 'node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]',         use: 'Catalog-grounded selectors from a real snapshot.' },
  { cmd: 'node tools/verify-selectors.js <snapshot> ...',                                        use: 'Selector existence check.' },
  { cmd: 'node tts/generate.js --video <slug>',                                                  use: 'Render narration mp3s.' },
  { cmd: 'node tools/validate-singlehtml.js <slug> [--report]',                                 use: 'Static validator for single-HTML films (imports, snapshots, narration parity, instrumentation, guard rules, payoff / at() / orphan-clip WARNs).' },
  { cmd: 'node tools/smoke-singlehtml.js <slug> [--seconds <n>] [--report]',                     use: 'Non-visual headless smoke; holds the headless lock.' },
  { cmd: 'node tools/render-html.js <slug> --duration <seconds> [--out path]',                   use: 'Single-HTML → silent MP4 (editorial review clips).' },
  { cmd: 'node tools/render-singlehtml-audio.js <slug> [--bgm <path>|none] [--out path]',         use: 'Single-HTML → MP4 WITH AUDIO. Records the real run, lays narration at __sched cue times, side-chain-ducks BGM. Needs __T0/__sched/__dur/__done instrumentation. Audio quality is the user\'s QC.' },
  { cmd: 'node tools/stitch.js videos/<slug>.video.json [--no-render] [--xfade <s>]',            use: 'Render + ffmpeg-concat HF intro + HTML body + HF outro per .video.json manifest. Locked tutorial delivery shape.' },
  { cmd: 'node tools/keyframes.js <video.mp4> [--frames 16 --cols 4]',                           use: 'Contact-sheet grid from an MP4 for visual QC handoff.' },
  { cmd: 'node tools/post-capture.js <slug> [--keep-fields 1,2,3]',                              use: 'MANDATORY after every new capture: field trim (opt-in) + builder markup trim + comment strip + CSS dedup + catalog regen.' },
  { cmd: 'node tools/preview.js [--video <slug>] [--port 4321]',                                 use: 'Live-reload preview server + scrubber UI.' },
  { cmd: 'node tools/lint-determinism.js [--all] [--video <slug>]',                              use: 'Determinism linter (Date.now/fetch errors, Math.random/setTimeout warnings).' },
  { cmd: 'npm run lint',                                                                          use: 'Composes validate-singlehtml.js --all + lint-determinism.js --all.' },
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
    libraries: LIBRARIES.map(l => ({ ...l, present: exists(l.path) })),
    tools: TOOLS,
    rulebook: rulebookSummary(),
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

  if (ctx.rulebook) {
    const rb = ctx.rulebook;
    out.push(`## STEP 0 — The rulebook (${rb.path}, ${rb.total} rows)`);
    out.push('');
    out.push('  Every row is a defect that shipped, was measured, and cost a rebuild.');
    out.push('  Read it before the first beat, not after the first rejection.');
    out.push('');
    if (rb.headlines.length) {
      out.push('  If you read nothing else:');
      for (const h of rb.headlines) out.push(`    · ${h}`);
      out.push('');
    }
    out.push('  Sections:');
    for (const s of rb.sections) out.push(`    ${s.title}  (${s.rows})`);
    out.push('');
    const order = ['HOOK', 'VALIDATOR', 'LIB', 'PROBE', 'TEMPLATE', 'ARTIFACT', 'WISH'];
    const slotLine = order.filter(k => rb.slots[k]).map(k => `${k} ${rb.slots[k]}`).join(' · ');
    out.push(`  Enforcement: ${slotLine}`);
    out.push('  WISH fires nothing — those rows only work if you remember them.');
    out.push('');
  }

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
  out.push('## Optional external skills (manual invoke — nothing fires these automatically)');
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
  out.push('## Libraries (use, do not reinvent) — scan these BEFORE writing motion / cursor / interaction code');
  for (const l of ctx.libraries) {
    out.push(`  ${l.present ? '✓' : '✗'} ${l.path}`);
    out.push(`      ${l.use}`);
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
